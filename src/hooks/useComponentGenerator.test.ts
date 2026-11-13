import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useComponentGenerator } from './useComponentGenerator';
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response('data: {"type":"done","code":"render(<div />)"}\n\n')));
});
it('restores generated components with Date values after remount', async () => {
  const first = renderHook(useComponentGenerator);
  await act(() => first.result.current.generate('card', undefined, 'google'));
  const id = first.result.current.components[0].id;
  first.unmount();
  const second = renderHook(useComponentGenerator);
  expect(second.result.current.components[0]).toMatchObject({ id, prompt: 'card' });
  expect(second.result.current.components[0].createdAt).toBeInstanceOf(Date);
});
it('keeps prompt history after failed generation and reload', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'));
  const first = renderHook(useComponentGenerator);
  await act(() => first.result.current.generate('retry me', undefined, 'google'));
  first.unmount();
  const second = renderHook(useComponentGenerator);
  expect(second.result.current.promptHistory).toEqual(['retry me']);
});
it('persists individual deletion and clearing the component list', async () => {
  const first = renderHook(useComponentGenerator);
  await act(() => first.result.current.generate('one', undefined, 'google'));
  await act(() => first.result.current.generate('two', undefined, 'google'));
  act(() => first.result.current.removeComponent(first.result.current.components[0].id));
  first.unmount();
  const second = renderHook(useComponentGenerator);
  expect(second.result.current.components.map((item) => item.prompt)).toEqual(['one']);
  act(() => second.result.current.clearAll());
  second.unmount();
  expect(renderHook(useComponentGenerator).result.current.components).toEqual([]);
});
it('ignores malformed saved components', () => {
  localStorage.setItem('component-studio.components', JSON.stringify([{ id: 'bad', prompt: 'bad', code: 'bad', createdAt: 'invalid' }, null]));
  expect(renderHook(useComponentGenerator).result.current.components).toEqual([]);
});

it.each([
  'data: {"type":"delta","text":"partial"}\n\n',
  'data: {"type":"error","error":"try again"}\n\n',
])('does not save incomplete or failed streams', async (body) => {
  vi.mocked(fetch).mockResolvedValue(new Response(body));
  const hook = renderHook(useComponentGenerator);
  await act(() => hook.result.current.generate('card', undefined, 'google'));
  expect(hook.result.current.components).toEqual([]);
  expect(hook.result.current.pendingComponent).toBeNull();
  expect(hook.result.current.isLoading).toBe(false);
  expect(hook.result.current.error).toBeTruthy();
});
