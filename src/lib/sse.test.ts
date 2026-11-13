import { expect, it } from 'vitest';
import { readSSE } from './sse';

it('decodes fragmented UTF-8 and CRLF events before the stream closes', async () => {
  const bytes = new TextEncoder().encode('event: delta\r\ndata: {"text":"한글"}\r\n\r\ndata: {"done":true}\n\n');
  const stream = new ReadableStream<Uint8Array>({ start(c) { for (const byte of bytes) c.enqueue(new Uint8Array([byte])); c.close(); } });
  const events = [];
  for await (const data of readSSE(stream)) events.push(JSON.parse(data));
  expect(events).toEqual([{ text: '한글' }, { done: true }]);
});
