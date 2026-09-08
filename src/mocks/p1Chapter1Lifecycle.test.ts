import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CHAPTER1_LEVELS } from '../content/chapter1';
import { createP1Api } from '../app/p1/p1Api';
import { NextAction, RouteSubmissionResponseResultEnum3 } from '../infra/api/generated/data-contracts';
import { p1Handlers, resetP1FakeDb } from './p1Handlers';
import { server } from './server';

describe('scoped Chapter 1 gameplay lifecycle', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  beforeEach(() => {
    server.resetHandlers(...p1Handlers);
    resetP1FakeDb();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('plays levels 1–9 from the scoped bundle and resolves every source-backed offer', async () => {
    const api = createP1Api();
    const expectedOffers = new Map([
      [2, ['ИИС', 'mock://product/offer-02']],
      [4, ['ФОНД', 'mock://product/offer-04']],
      [6, ['КУРС', 'mock://course/offer-06']],
      [8, ['ЛОНГ', 'mock://product/offer-08']],
    ]);

    for (let levelNumber = 1; levelNumber <= 9; levelNumber += 1) {
      const state = await api.loadState();
      const level = await api.enterLevel(state);
      const config = CHAPTER1_LEVELS[levelNumber];
      expect(level.levelNumber).toBe(levelNumber);
      expect(level.board.size).toBe(config.grid.length);
      expect(level.targetsRemaining).toBe(config.targets.length);

      const offered = config.targets.filter((target) => target.offer);
      const expectedOffer = expectedOffers.get(levelNumber);
      if (expectedOffer) {
        expect(offered).toHaveLength(1);
        expect([offered[0].word, offered[0].offer?.destination]).toEqual(expectedOffer);
      } else {
        expect(offered).toHaveLength(0);
      }

      for (const [index, target] of config.targets.entries()) {
        const cells = target.path.map((cellId) => {
          const [row, col] = cellId.split(':').map(Number);
          return { row: row - 1, col: col - 1 };
        });
        const route = index % 2 === 0 ? cells : [...cells].reverse();
        const result = await api.submitRoute(level.levelId, route);
        expect(result.result).toBe(RouteSubmissionResponseResultEnum3.Found);
        expect(result.isTarget).toBe(true);
        expect(result.word).toBe(target.word);

        if (index === 0) {
          const repeated = await api.submitRoute(level.levelId, route);
          expect(repeated.result).toBe(RouteSubmissionResponseResultEnum3.Repeated);
        }
      }

      const results = await api.getLevelResults(level.levelId);
      expect(results.summary.targets).toEqual({
        foundCount: config.targets.length,
        totalCount: config.targets.length,
      });
      expect(results.completionKind).toBe(levelNumber === 9 ? 'chapter' : 'level');
      const acknowledgement = await api.acknowledgeLevelResults(level.levelId);
      expect(acknowledgement.nextAction).toBe(
        levelNumber === 9 ? NextAction.ClaimReward : NextAction.StartLevel,
      );
    }
  });

  it('keeps a non-target route invalid because Chapter 1 has no campaign bonus allowlist', async () => {
    const api = createP1Api();
    const state = await api.loadState();
    const level = await api.enterLevel(state);
    const result = await api.submitRoute(level.levelId, [{ row: 0, col: 0 }, { row: 1, col: 0 }]);

    expect(result.result).toBe(RouteSubmissionResponseResultEnum3.Invalid);
    expect(result.newBonusWords).toEqual([]);
    expect(result.levelCompleted).toBe(false);
  });
});
