import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createHttpApiAdapter } from './httpApiAdapter';

interface CapturedRequest {
  method: string;
  url: string;
  authorization: string | null;
  ifMatch: string | null;
  idempotencyKey: string | null;
}

let captured: CapturedRequest | null = null;

const server = setupServer(
  http.get('/api/v1/clients/me/state', ({ request }) => {
    captured = {
      method: request.method,
      url: request.url,
      authorization: request.headers.get('authorization'),
      ifMatch: request.headers.get('if-match'),
      idempotencyKey: request.headers.get('idempotency-key'),
    };
    return HttpResponse.json(
      { clientView: {}, settings: {}, selectedIds: {}, balance: {}, progress: {}, rewards: {} },
      { headers: { ETag: '"state-etag"' } },
    );
  }),
  http.post('/api/v1/levels/:levelId/routes', ({ request }) => {
    captured = {
      method: request.method,
      url: request.url,
      authorization: request.headers.get('authorization'),
      ifMatch: request.headers.get('if-match'),
      idempotencyKey: request.headers.get('idempotency-key'),
    };
    return HttpResponse.json(
      {
        result: 'found',
        levelCompleted: false,
        newFoundTargets: [],
        newBonusWords: [],
        nextAction: 'none',
      },
      {
        headers: {
          ETag: '"routes-etag"',
          'Idempotency-Key-Status': 'processed',
        },
      },
    );
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('httpApiAdapter network pipeline', () => {
  it('performs a read with Bearer auth and captures the response ETag', async () => {
    const adapter = createHttpApiAdapter({
      baseUrl: 'http://localhost',
      apiToken: 'test-token',
    });

    const response = await adapter.get('/api/v1/clients/me/state');

    expect(captured?.method).toBe('GET');
    expect(captured?.url).toContain('/api/v1/clients/me/state');
    expect(captured?.authorization).toBe('Bearer test-token');
    expect(response.status).toBe(200);
    expect(response.etag).toBe('"state-etag"');
  });

  it('performs a mutation with If-Match and Idempotency-Key and captures ETag + IKS', async () => {
    const adapter = createHttpApiAdapter({
      baseUrl: 'http://localhost',
      apiToken: 'test-token',
    });

    const response = await adapter.post('/api/v1/levels/level-1/routes', {
      body: { route: [{ row: 0, col: 0 }, { row: 0, col: 1 }] },
      headers: {
        'If-Match': '"state-etag"',
        'Idempotency-Key': 'e4f8ad5b-d9cb-469f-a165-808677289501',
      },
    });

    expect(captured?.method).toBe('POST');
    expect(captured?.url).toContain('/api/v1/levels/level-1/routes');
    expect(captured?.authorization).toBe('Bearer test-token');
    expect(captured?.ifMatch).toBe('"state-etag"');
    expect(captured?.idempotencyKey).toBe('e4f8ad5b-d9cb-469f-a165-808677289501');
    expect(response.status).toBe(200);
    expect(response.etag).toBe('"routes-etag"');
    expect(response.idempotencyKeyStatus).toBe('processed');
  });
});