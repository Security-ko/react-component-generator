import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useStoredState } from './useStoredState';

beforeEach(() => { const values = new Map<string, string>(); vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }); });
it('restores state after remount and persists updates', () => {
  const first = renderHook(() => useStoredState('test', '', (value) => typeof value === 'string' ? value : ''));
  act(() => first.result.current[1]('saved'));
  first.unmount();
  const second = renderHook(() => useStoredState('test', '', (value) => typeof value === 'string' ? value : ''));
  expect(second.result.current[0]).toBe('saved');
});


it('falls back on corrupt JSON and continues when storage writes fail', () => {
  localStorage.setItem('test', '{broken');
  vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  const hook = renderHook(() => useStoredState('test', 'default', String));
  expect(hook.result.current[0]).toBe('default');
  act(() => hook.result.current[1]('usable'));
  expect(hook.result.current[0]).toBe('usable');
});
