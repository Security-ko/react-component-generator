import { useEffect, useState } from 'react';
export function useStoredState<T>(key: string, initial: T, decode: (value: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? initial : decode(JSON.parse(saved));
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage may be unavailable or full. */ }
  }, [key, value]);
  return [value, setValue] as const;
}
