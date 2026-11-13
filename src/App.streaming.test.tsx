import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => { vi.unstubAllGlobals(); });

it('shows live code while generating and switches to preview only after done', async () => {
  const saved = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value) });
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => url === '/api/config' ? Response.json({ envKeys: { google: true, anthropic: false } }) : new Response(new ReadableStream<Uint8Array>({ start(c) { stream = c; } }), { headers: { 'Content-Type': 'text/event-stream' } })));
  const { container } = render(<App />);
  await waitFor(() => expect(screen.getByText('서버 API 키가 연결되어 있어요.')).toBeInTheDocument());
  fireEvent.change(screen.getByRole('textbox', { name: /만들고 싶은/ }), { target: { value: 'button' } });
  fireEvent.click(screen.getByRole('button', { name: /컴포넌트 생성/ }));
  await waitFor(() => expect(screen.getByRole('button', { name: '코드' })).toHaveClass('tab--active'));
  await act(async () => { stream.enqueue(new TextEncoder().encode('data: {"type":"delta","text":"const Button = () => <button>Ready</button>;"}\n\n')); });
  expect(container.querySelector('pre')).toHaveTextContent('const Button');
  expect(localStorage.getItem('component-studio.components')).toBe('[]');
  await act(async () => { stream.enqueue(new TextEncoder().encode('data: {"type":"done","code":"render(<button>Ready</button>);"}\n\n')); stream.close(); });
  await waitFor(() => expect(screen.getByRole('button', { name: '미리보기' })).toHaveClass('tab--active'));
  expect(screen.getByRole('button', { name: 'Ready' })).toBeInTheDocument();
});
