import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createHttpApiAdapter } from './httpApiAdapter';

let captured: Request | null = null;

const server = setupServer(
  http.get('http://localhost/demo-api/state', ({ request }) => {
    captured = request;
    return HttpResponse.json({ ready: true }, { headers: { ETag: '"state-etag"' } });
  }),
  http.post('http://localhost/demo-api/levels/:levelId/routes', ({ request }) => {
    captured = request;
    return HttpResponse.json(
      { result: 'found' },
      { headers: { ETag: '"route-etag"', 'Idempotency-Key-Status': 'processed' } },
    );
  }),
  http.get('http://localhost/demo-api/error', () =>
    HttpResponse.json({ type: 'DEMO_FAILURE', payload: { retryable: true } }, { status: 500 })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('standalone fetch adapter', () => {
  it('reads a demo route and captures ETag without authorization', async () => {
    const adapter = createHttpApiAdapter({ baseUrl: 'http://localhost' });
    const response = await adapter.get<{ ready: boolean }>('/demo-api/state');
    expect(captured?.headers.get('authorization')).toBeNull();
    expect(response.data.ready).toBe(true);
    expect(response.etag).toBe('"state-etag"');
  });

  it('forwards concurrency headers and JSON bodies', async () => {
    const adapter = createHttpApiAdapter({ baseUrl: 'http://localhost' });
    const response = await adapter.post('/demo-api/levels/level-1/routes', {
      body: { route: [{ row: 0, col: 0 }] },
      headers: { 'If-Match': '"state-etag"', 'Idempotency-Key': 'demo-key' },
    });
    expect(captured?.headers.get('if-match')).toBe('"state-etag"');
    expect(captured?.headers.get('idempotency-key')).toBe('demo-key');
    expect(response.idempotencyKeyStatus).toBe('processed');
  });

  it('normalizes local backend errors by root type', async () => {
    const adapter = createHttpApiAdapter({ baseUrl: 'http://localhost' });
    await expect(adapter.get('/demo-api/error')).rejects.toMatchObject({
      type: 'DEMO_FAILURE',
      payload: { retryable: true },
    });
  });
});
