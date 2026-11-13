import { useState, useCallback, useRef } from 'react';
import { readSSE } from '../lib/sse';
import { useStoredState } from './useStoredState';
import type { GeneratedComponent, Provider } from '../types';

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  promptHistory: string[];
  isLoading: boolean;
  error: string | null;
  pendingComponent: GeneratedComponent | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useStoredState<GeneratedComponent[]>('component-studio.components', [], (value) => {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
      if (!item || typeof item.id !== 'string' || typeof item.prompt !== 'string' || typeof item.code !== 'string' || typeof item.createdAt !== 'string') return [];
      const createdAt = new Date(item.createdAt);
      return Number.isNaN(createdAt.getTime()) ? [] : [{ id: item.id, prompt: item.prompt, code: item.code, createdAt }];
    });
  });
  const [promptHistory, setPromptHistory] = useStoredState<string[]>('component-studio.prompt-history', [], (value) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingComponent, setPendingComponent] = useState<GeneratedComponent | null>(null);
  const generating = useRef(false);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    if (generating.current) return;
    generating.current = true;
    const draft: GeneratedComponent = { id: crypto.randomUUID(), prompt, code: '', createdAt: new Date() };
    setPendingComponent(draft);
    setPromptHistory((previous) => [prompt, ...previous.filter((item) => item !== prompt)]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider, stream: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate component');
      }
      if (!res.body) throw new Error('응답 스트림이 없습니다.');
      let complete = false;
      for await (const data of readSSE(res.body)) {
        const event = JSON.parse(data);
        if (event.type === 'error') throw new Error(event.error);
        if (event.type === 'reset') setPendingComponent({ ...draft });
        if (event.type === 'delta') setPendingComponent((previous) => previous ? { ...previous, code: previous.code + event.text } : previous);
        if (event.type === 'done' && typeof event.code === 'string' && event.code.trim()) {
          setComponents((previous) => [{ ...draft, code: event.code }, ...previous]);
          complete = true;
          break;
        }
      }
      if (!complete) throw new Error('코드 응답이 중단되었습니다. 다시 시도해주세요.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      generating.current = false;
      setPendingComponent(null);
      setIsLoading(false);
    }
  }, [setPromptHistory, setComponents]);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, [setComponents]);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  return { components, promptHistory, isLoading, error, pendingComponent, generate, removeComponent, clearAll };
}
