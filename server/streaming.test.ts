import { expect, it, vi } from 'vitest';

it('streams Anthropic text before completion and sends normalized final code', async () => {
  let handler!: (req: Request) => Promise<Response>;
  vi.stubGlobal('Bun', { serve: (options: { fetch: typeof handler }) => { handler = options.fetch; return { port: 3002 }; } });
  const encoder = new TextEncoder();
  let upstream!: ReadableStreamDefaultController<Uint8Array>;
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream<Uint8Array>({ start(c) { upstream = c; } }))));
  try {
    await import('./index');
    const response = await handler(new Request('http://localhost/api/generate', { method: 'POST', body: JSON.stringify({ prompt: 'button', provider: 'anthropic', apiKey: 'synthetic', stream: true }) }));
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const reader = response.body!.getReader();
    upstream.enqueue(encoder.encode('data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"const Button = () => <button />;"}}\n\n'));
    let output = '';
    while (!output.includes('Button')) output += new TextDecoder().decode((await reader.read()).value);
    expect(output).toContain('delta');
    upstream.enqueue(encoder.encode('data: {"type":"message_stop"}\n\n'));
    upstream.close();
    while (true) { const part = await reader.read(); if (part.done) break; output += new TextDecoder().decode(part.value); }
    expect(output).toContain('done');
    expect(output).toContain('render(<Button />)');
  } finally { vi.unstubAllGlobals(); }
});

it('resets partial Google output on fallback and streams the next model', async () => {
  vi.resetModules();
  let handler!: (req: Request) => Promise<Response>;
  vi.stubGlobal('Bun', { serve: (options: { fetch: typeof handler }) => { handler = options.fetch; return { port: 3002 }; } });
  const mock = vi.fn().mockResolvedValueOnce(new Response('data: {"candidates":[{"content":{"parts":[{"text":"broken"}]}}]}\n\ndata: {"candidates":[{"finishReason":"MAX_TOKENS"}]}\n\n')).mockResolvedValueOnce(new Response('data: {"candidates":[{"content":{"parts":[{"text":"const Good = () => <div />;"}]},"finishReason":"STOP"}]}\n\n'));
  vi.stubGlobal('fetch', mock);
  try {
    await import('./index');
    const response = await handler(new Request('http://localhost/api/generate', { method: 'POST', body: JSON.stringify({ prompt: 'button', provider: 'google', apiKey: 'synthetic', stream: true }) }));
    const output = await response.text();
    expect(output).toContain('"type":"reset"');
    expect(output).toContain('"type":"delta","text":"const Good');
    expect(output).toContain('render(<Good />)');
    expect(mock).toHaveBeenCalledTimes(2);
    expect(mock.mock.calls[0][0]).toContain(':streamGenerateContent?alt=sse');
  } finally { vi.unstubAllGlobals(); }
});
