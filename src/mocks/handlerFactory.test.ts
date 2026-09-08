import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { operationRegistry } from '../infra/api/operationRegistry';
import { createHandlers } from './handlerFactory';

// Server-shaped fixtures (wire не изобретается — форма из contracts/openapi.yaml).
const fixtures = {
  'API-002': {
    body: {
      clientState: {
        clientView: {
          balance: { knowledgePoints: 0, hintBalance: 5 },
          settings: { musicEnabled: true, soundEnabled: true, tutorialCompleted: false },
          selectedCharacterId: '6f8fad5b-d9cb-469f-a165-80867728951e',
          selectedBackgroundId: '9f8fad5b-d9cb-469f-a165-808677289517',
          campaignProgress: { isCompleted: false, isCompletionShown: false },
        },
        chapters: [],
        levels: [],
        rewards: [],
        nextAction: 'none',
      },
    },
    etag: '"state-etag"',
  },
  'API-006': {
    body: {
      result: 'found',
      isTarget: true,
      levelCompleted: false,
      newFoundTargets: [],
      newBonusWords: [],
      nextAction: 'play',
    },
    etag: '"routes-etag"',
    iks: 'processed',
  },
};

const server = setupServer(...createHandlers(operationRegistry, fixtures));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('handlerFactory — typed MSW scaffold из registry metadata + server-shaped fixtures', () => {
  it('строит handler для чтения из registry и возвращает fixture с ETag', async () => {
    const res = await fetch('http://localhost/api/v1/clients/me/state');

    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe('"state-etag"');
    const body = await res.json();
    expect(body.clientState.nextAction).toBe('none');
  });

  it('строит handler для мутации с ETag и Idempotency-Key-Status', async () => {
    const res = await fetch('http://localhost/api/v1/levels/level-1/routes', {
      method: 'POST',
      body: JSON.stringify({ route: [{ row: 0, col: 0 }, { row: 0, col: 1 }] }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('etag')).toBe('"routes-etag"');
    expect(res.headers.get('idempotency-key-status')).toBe('processed');
    const body = await res.json();
    expect(body.result).toBe('found');
  });

  it('строго падает на необработанный запрос (strict unhandled)', async () => {
    await expect(fetch('http://localhost/api/v1/unknown')).rejects.toThrow();
  });
});
