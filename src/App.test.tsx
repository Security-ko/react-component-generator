import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import App from './App';
vi.mock('./components/ComponentCard', () => ({ ComponentCard: () => null }));
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ envKeys: { google: false, anthropic: false } }) }));
});
it('restores selected provider and its entered API key after remount', () => {
  const first = render(<App />);
  fireEvent.change(screen.getByLabelText('AI 모델 제공자'), { target: { value: 'anthropic' } });
  fireEvent.change(screen.getByLabelText('API 키'), { target: { value: 'my-key' } });
  first.unmount();
  render(<App />);
  expect(screen.getByLabelText('AI 모델 제공자')).toHaveValue('anthropic');
  expect(screen.getByLabelText('API 키')).toHaveValue('my-key');
});
it('clears the entered key when switching providers', () => {
  render(<App />);
  fireEvent.change(screen.getByLabelText('API 키'), { target: { value: 'google-key' } });
  fireEvent.change(screen.getByLabelText('AI 모델 제공자'), { target: { value: 'anthropic' } });
  expect(screen.getByLabelText('API 키')).toHaveValue('');
});
