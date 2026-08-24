import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CellRef,
  ClaimRewardRequest,
  ClaimRewardResponse,
  ClientStateResponse,
  FoundTarget,
  HintState,
  HintUseResponse,
  LevelPlayResponse,
  LevelResultsResponse,
  RewardOption,
  RewardSummary,
  RouteSubmissionResponse,
  ValidationProblem,
} from '../shared/demoTypes';
import {
  ClaimRewardResponseRewardTypeEnum,
  ClaimRewardResponseStateEnum,
  LevelResultsResponseCompletionKindEnum,
  LevelResultsResponseStatusEnum,
  NextAction,
  RewardOptionOptionTypeEnum,
  RewardSummaryRewardTypeEnum,
  RewardSummaryStatusEnum,
  RewardSummaryStatusEnum1,
  RouteSubmissionResponseResultEnum3,
  RouteSubmissionResponseOutcomeCodeEnum,
  SelectedOptionSelectedOptionTypeEnum,
  ValidationErrorItemTypeEnum,
  ValidationProblemTypeEnum,
} from '../shared/demoTypes';
import { LEVELS } from '../content/levels';
import { server } from './server';
import { p1Handlers, resetP1FakeDb } from './p1Handlers';
import { createP1Api } from '../app/p1/p1Api';
import type { P1Api } from '../app/p1/p1Api';

async function acknowledgeLevelResults(levelId: string, etag: string, key: string = crypto.randomUUID()) {
  return fetch(`http://localhost/demo-api/levels/${levelId}/results/acknowledge`, {
    method: 'POST',
    headers: {
      'if-match': etag,
      'idempotency-key': key,
    },
  });
}

function chapterClaimBody(decorationId: string): ClaimRewardRequest {
  return {
    rewardType: 'decoration',
    selectedOptionId: decorationId,
  };
}

function expectLevelResults(response: LevelResultsResponse, kind: LevelResultsResponseCompletionKindEnum) {
  expect(response.status).toBe(LevelResultsResponseStatusEnum.Completed);
  expect(response.completionKind).toBe(kind);
  expect(response.summary.targets.foundCount).toBe(response.summary.targets.totalCount);
  expect(response.chapter.chapterId).toMatch(/^[0-9a-f-]{36}$/);
}

function expectAvailableRewardOptions(reward: RewardSummary) {
  expect(reward.status).toBe(RewardSummaryStatusEnum.Available);
  expect(reward.options).toEqual(expect.any(Array));
  if (!reward.options || reward.options.length === 0) {
    throw new Error('Available reward must expose normalized options');
  }

  reward.options.forEach((option: RewardOption) => {
    expect(option.optionType).toMatch(/^(hint|decoration)$/);
    expect(option.title.trim()).not.toBe('');
    if (option.optionType === RewardOptionOptionTypeEnum.Hint) {
      expect(option.amount).toEqual(expect.any(Number));
    } else {
      expect(option.optionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      expect(option.decorationType).toBeDefined();
    }
  });
}

/* Keep a generated response assertion helper rather than a parallel P4 schema. */
function expectClaimedReward(response: Awaited<ReturnType<P1Api['claimReward']>>) {
  expect(response.state).toBe(ClaimRewardResponseStateEnum.Claimed);
  expect(response.rewardType).toBe(ClaimRewardResponseRewardTypeEnum.ChapterGolden);
  expect(response.nextAction).toBe(NextAction.StartLevel);
}


/**
 * Уровень 1 (контракт прототипа src/content/levels.ts, Level 1):
 * 7 целей + 8 бонусов. Координаты ниже — уже API 0-based (row/col),
 * как их принимает submit-route. Обратный маршрут цели также валиден.
 */

interface Level1TargetCase {
  id: string;
  word: string;
  /** Маршрут, который отправляет тест (прямой или exact reverse). */
  route: CellRef[];
  /** Канонический 0-based путь цели (ожидается в ответе как cells). */
  canonicalCells: CellRef[];
}

function cells(pairs: Array<[number, number]>): CellRef[] {
  return pairs.map(([row, col]) => ({ row, col }));
}

const TARGET_FUND: Level1TargetCase = {
  id: 'fund',
  word: 'ФОНД',
  route: cells([[1, 4], [0, 4], [0, 5], [1, 5]]),
  canonicalCells: cells([[1, 4], [0, 4], [0, 5], [1, 5]]),
};

const TARGET_CAPITAL: Level1TargetCase = {
  id: 'capital',
  word: 'КАПИТАЛ',
  route: cells([[2, 5], [3, 5], [4, 5], [5, 5], [5, 4], [4, 4], [3, 4]]),
  canonicalCells: cells([[2, 5], [3, 5], [4, 5], [5, 5], [5, 4], [4, 4], [3, 4]]),
};

const TARGET_STOCK: Level1TargetCase = {
  id: 'stock',
  word: 'АКЦИЯ',
  route: cells([[2, 4], [2, 3], [1, 3], [0, 3], [0, 2]]),
  canonicalCells: cells([[2, 4], [2, 3], [1, 3], [0, 3], [0, 2]]),
};

const COURSE_OFFER = {
  courseId: '6f8fad5b-d9cb-469f-a165-80867728951e',
  locale: 'ru-RU',
  badgeLabel: 'Мини-курс',
  title: 'АКЦИЯ',
};

const TARGET_RISK: Level1TargetCase = {
  id: 'risk',
  word: 'РИСК',
  route: cells([[0, 1], [0, 0], [1, 0], [1, 1]]),
  canonicalCells: cells([[0, 1], [0, 0], [1, 0], [1, 1]]),
};

const TARGET_MARKET: Level1TargetCase = {
  id: 'market',
  word: 'РЫНОК',
  route: cells([[1, 2], [2, 2], [2, 1], [2, 0], [3, 0]]),
  canonicalCells: cells([[1, 2], [2, 2], [2, 1], [2, 0], [3, 0]]),
};

const TARGET_INDEX: Level1TargetCase = {
  id: 'index',
  word: 'ИНДЕКС',
  route: cells([[4, 0], [5, 0], [5, 1], [5, 2], [5, 3], [4, 3]]),
  canonicalCells: cells([[4, 0], [5, 0], [5, 1], [5, 2], [5, 3], [4, 3]]),
};

const TARGET_INCOME: Level1TargetCase = {
  id: 'income',
  word: 'ДОХОД',
  route: cells([[3, 3], [3, 2], [3, 1], [4, 1], [4, 2]]),
  canonicalCells: cells([[3, 3], [3, 2], [3, 1], [4, 1], [4, 2]]),
};

// Exact reverse КАПИТАЛ: контракт принимает прямое и обратное направления.
const TARGET_CAPITAL_REVERSED: Level1TargetCase = {
  id: 'capital-reversed',
  word: 'КАПИТАЛ',
  route: [...TARGET_CAPITAL.canonicalCells].reverse(),
  canonicalCells: TARGET_CAPITAL.canonicalCells,
};

const ALL_TARGETS: Level1TargetCase[] = [
  TARGET_FUND,
  TARGET_CAPITAL,
  TARGET_STOCK,
  TARGET_RISK,
  TARGET_MARKET,
  TARGET_INDEX,
  TARGET_INCOME,
];

// ЛАПА: единственный каноничный bonus-маршрут уровня 1 (уровень 1, доска прототипа).
const LAPA_ROUTE: CellRef[] = cells([[3, 4], [4, 4], [4, 5], [3, 5]]);
const TIP_ROUTE: CellRef[] = cells([[5, 4], [5, 5], [4, 5]]);
const SON_ROUTE: CellRef[] = cells([[1, 0], [2, 0], [2, 1]]);
const FON_ROUTE: CellRef[] = cells([[1, 4], [0, 4], [0, 5]]);
const HOD_ROUTE: CellRef[] = cells([[3, 1], [3, 2], [3, 3]]);
const NONCANONICAL_INCOME_ROUTE: CellRef[] = cells([
  [3, 3],
  [3, 2],
  [3, 1],
  [4, 1],
  [5, 1],
]);

// Authoritative income-цель из LEVELS[1]: 1-based путь конвертируем в 0-based API-координаты.
const LEVEL_1_INCOME = LEVELS[1].targets.find((target) => target.id === 'income')!;
const INCOME_WORD = LEVEL_1_INCOME.word;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function startLevel1(): Promise<{
  api: P1Api;
  level: LevelPlayResponse;
}> {
  const api = createP1Api();
  const state = await api.loadState();
  const level = await api.enterLevel(state);
  return { api, level };
}

function expectFoundTarget(
  response: RouteSubmissionResponse,
  target: Level1TargetCase,
  foundSequence = 1,
): asserts response is RouteSubmissionResponse {
  expect(response.result).toBe(RouteSubmissionResponseResultEnum3.Found);
  expect(response.isTarget).toBe(true);
  expect(response.word).toBe(target.word);
  expect(response.newFoundTargets).toHaveLength(1);
  const found = response.newFoundTargets[0] as FoundTarget;
  expect(found.targetId).toMatch(UUID_V4);
  expect(found).toMatchObject({
    word: target.word,
    cells: target.canonicalCells,
  });
  expect(found.foundSequence).toBe(foundSequence);
}

function expectRuntimeHintState(value: unknown): HintState {
  if (typeof value !== 'object' || value === null) {
    throw new Error('use-hint must expose a persisted hint state');
  }
  const state = value as Partial<HintState>;
  expect(state.targetId).toMatch(UUID_V4);
  expect(state.revealedCells).toEqual(expect.any(Array));
  expect(Object.keys(state).sort()).toEqual(['revealedCells', 'targetId']);
  return state as HintState;
}

function hintStateFromResponse(response: HintUseResponse): HintState {
  return expectRuntimeHintState(response.hintTarget);
}

function expectCollectingRegularReward(reward: RewardSummary, current: number, threshold = 4) {
  expect(reward.rewardType).toBe(RewardSummaryRewardTypeEnum.Regular);
  expect(reward.status).toBe(RewardSummaryStatusEnum1.Collecting);
  expect(reward.progress).toEqual({ current, threshold });
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  server.resetHandlers(...p1Handlers);
  resetP1FakeDb();
});
afterEach(() => {
  server.resetHandlers(...p1Handlers);
});
afterAll(() => server.close());

describe('P1 mock Level 1 контракт (RED regression, start-level/005/006)', () => {
  it('state pendingReward points to an available reward with normalized options', async () => {
    resetP1FakeDb({ pendingReward: true });
    const api = createP1Api();
    const state = await api.loadState();

    expect('pendingReward' in state.clientState).toBe(true);
    if (!('pendingReward' in state.clientState)) {
      throw new Error('state pendingReward is required for an available reward');
    }
    const pendingReward = state.clientState.pendingReward;
    expect(pendingReward).toBeDefined();
    if (!pendingReward) throw new Error('state pendingReward must include rewardId');
    state.clientState.rewards
      .filter((candidate) => candidate.status === RewardSummaryStatusEnum.Available)
      .forEach(expectAvailableRewardOptions);
    const reward = state.clientState.rewards.find(
      (candidate) => candidate.rewardId === pendingReward.rewardId,
    );
    expect(reward).toBeDefined();
    if (!reward) throw new Error('state pendingReward must resolve to a reward');
    expectAvailableRewardOptions(reward);
  });

  it('старт уровня 1 возвращает 7 оставшихся целей, без найденных целей и без бонусов', async () => {
    const { level } = await startLevel1();

    expect(level.targetsRemaining).toBe(7);
    expect(level.foundTargets).toEqual([]);
    expect(level.bonusWords).toEqual([]);
  });

  it.each(ALL_TARGETS)(
    'submit-route: маршрут цели $id ($word) распознаётся как found с каноническими cells',
    async (target) => {
      const { api, level } = await startLevel1();

      const response = await api.submitRoute(level.levelId, target.route);

      expectFoundTarget(response, target);
      expect(response.levelCompleted).toBe(false);
    },
  );

  it('submit-route: exact reverse маршрут цели также распознаётся как found', async () => {
    const { api, level } = await startLevel1();

    const response = await api.submitRoute(
      level.levelId,
      TARGET_CAPITAL_REVERSED.route,
    );

    expectFoundTarget(response, TARGET_CAPITAL_REVERSED);
    expect(response.levelCompleted).toBe(false);
  });

  it('после первой найденной цели ДОХОД остаётся 6 целей и уровень не завершён', async () => {
    const { api, level } = await startLevel1();

    const response = await api.submitRoute(level.levelId, TARGET_INCOME.route);

    expect(response.result).toBe(RouteSubmissionResponseResultEnum3.Found);
    expect(response.isTarget).toBe(true);
    expect(response.word).toBe(TARGET_INCOME.word);
    expect(response.targetsRemaining).toBe(6);
    expect(response.levelCompleted).toBe(false);
    expect(response.nextAction).toBe('play');
  });

  it('семь уникальных целей завершают уровень только на седьмой, остаток убывает 6..0 и без дублей', async () => {
    const { api, level } = await startLevel1();
    const seen = new Set<string>();

    for (let index = 0; index < ALL_TARGETS.length; index += 1) {
      const target = ALL_TARGETS[index];

      const response = await api.submitRoute(level.levelId, target.route);

      expect(response.result).toBe(RouteSubmissionResponseResultEnum3.Found);
      expect(response.isTarget).toBe(true);
      expect(response.word).toBe(target.word);
      expect(response.targetsRemaining).toBe(6 - index);
      expect(response.newFoundTargets).toHaveLength(1);
      const word = response.newFoundTargets[0]?.word;
      expect(word).toBe(target.word);
      const found = response.newFoundTargets[0] as FoundTarget;
      expect(found.targetId).toMatch(UUID_V4);
      expect(found).toMatchObject({
        word: target.word,
        cells: target.canonicalCells,
      });
      expect(found.foundSequence).toBe(index + 1);
      expect(seen.has(word ?? '')).toBe(false);
      seen.add(word ?? '');
      if (index < ALL_TARGETS.length - 1) {
        expect(response.levelCompleted).toBe(false);
      } else {
        expect(response.levelCompleted).toBe(true);
      }
    }
  });

  it('ЛАПА: первый сабмит находит бонус, повторный с новым ключом — repeated, стартовый список бонусов пуст', async () => {
    const { api, level } = await startLevel1();

    expect(level.bonusWords).toEqual([]);

    const first = await api.submitRoute(level.levelId, LAPA_ROUTE);

    expect(first.result).toBe(RouteSubmissionResponseResultEnum3.Found);
    expect(first.isTarget).toBe(false);
    expect(first.word).toBe('ЛАПА');
    expect(first.newBonusWords).toHaveLength(1);
    expect(first.newBonusWords[0].word).toBe('ЛАПА');
    expect(first.levelCompleted).toBe(false);

    // Повторный сабмит того же маршрута с новым идемпотент-ключом (новый вызов)
    // не начисляет слово повторно.
    const second = await api.submitRoute(level.levelId, LAPA_ROUTE);

    expect(second.result).toBe(RouteSubmissionResponseResultEnum3.Repeated);
    expect(second.newBonusWords).toHaveLength(0);
    expect(second.newFoundTargets).toEqual([]);
    expect(second.levelCompleted).toBe(false);
  });

  it('сервер ведёт regular reward по порогу 4, открывает указатель и блокирует игровые мутации до claim', async () => {
    const { api, level } = await startLevel1();
    const bonusRoutes = [
      { route: LAPA_ROUTE, word: 'ЛАПА' },
      { route: TIP_ROUTE, word: 'ТИП' },
      { route: SON_ROUTE, word: 'СОН' },
    ];

    const initialState = await api.loadState();
    const initialReward = initialState.clientState.rewards[0];
    expect(initialReward).toBeDefined();
    if (!initialReward) throw new Error('Expected collecting regular reward');
    expectCollectingRegularReward(initialReward, 0);

    for (const [index, bonus] of bonusRoutes.entries()) {
      const response = await api.submitRoute(level.levelId, bonus.route);
      expect(response.result).toBe(RouteSubmissionResponseResultEnum3.Found);
      expect(response.word).toBe(bonus.word);
      expect(response.newBonusWords.map((item: { word: string }) => item.word)).toEqual([bonus.word]);
      expect(response.rewardProgress).toBe(index + 1);

      const state = await api.loadState();
      const reward = state.clientState.rewards[0];
      expect(reward).toBeDefined();
      if (!reward) throw new Error('Expected collecting regular reward');
      expectCollectingRegularReward(reward, index + 1);
    }

    const stateResponse = await fetch('http://localhost/demo-api/state');
    const key = 'p3-regular-threshold-concurrent-key';
    const headers = {
      'content-type': 'application/json',
      'idempotency-key': key,
      'if-match': stateResponse.headers.get('etag') ?? '',
    };
    const request = () => fetch(`http://localhost/demo-api/levels/${level.levelId}/routes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ route: FON_ROUTE }),
    });
    const [first, concurrent] = await Promise.all([request(), request()]);
    expect(first.status).toBe(200);
    expect(concurrent.status).toBe(200);
    expect(concurrent.headers.get('idempotency-key-status')).toBe('replayed');
    const firstBody = await first.json() as RouteSubmissionResponse;
    const concurrentBody = await concurrent.json() as RouteSubmissionResponse;
    expect(concurrentBody).toEqual(firstBody);
    expect(firstBody.result).toBe(RouteSubmissionResponseResultEnum3.Found);
    expect(firstBody.rewardOpened).toBeDefined();
    if (!firstBody.rewardOpened) throw new Error('Fourth bonus must open regular reward');
    expect(firstBody.rewardOpened.rewardType).toBe(RewardSummaryRewardTypeEnum.Regular);
    expect(firstBody.rewardOpened.status).toBe(RewardSummaryStatusEnum.Available);
    expect(firstBody.rewardOpened.progress).toEqual({ current: 4, threshold: 4 });
    expectAvailableRewardOptions(firstBody.rewardOpened);

    const pendingState = await api.loadState();
    expect(pendingState.clientState.pendingReward).toEqual({
      rewardId: firstBody.rewardOpened.rewardId,
    });
    expect(pendingState.clientState.nextAction).toBe(NextAction.ClaimReward);
    expect(pendingState.clientState.rewards).toHaveLength(1);
    expect(pendingState.clientState.rewards[0]).toEqual(firstBody.rewardOpened);

    const pendingEtag = (await fetch('http://localhost/demo-api/state')).headers.get('etag') ?? '';
    const blockedRoute = await fetch(`http://localhost/demo-api/levels/${level.levelId}/routes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': 'p3-route-blocked-by-reward',
        'if-match': pendingEtag,
      },
      body: JSON.stringify({ route: HOD_ROUTE }),
    });
    const blockedHint = await fetch(`http://localhost/demo-api/levels/${level.levelId}/hints`, {
      method: 'POST',
      headers: {
        'idempotency-key': 'p3-hint-blocked-by-reward',
        'if-match': pendingEtag,
      },
    });
    expect(blockedRoute.status).toBe(409);
    expect(blockedHint.status).toBe(409);
    await expect(blockedRoute.json()).resolves.toMatchObject({ type: 'REWARD_PENDING_CLAIM' });
    await expect(blockedHint.json()).resolves.toMatchObject({ type: 'REWARD_PENDING_CLAIM' });

    const claim = await api.claimReward(firstBody.rewardOpened.rewardId, { rewardType: 'hint' });
    expect(claim.rewardType).toBe(ClaimRewardResponseRewardTypeEnum.Regular);
    expect(claim.nextAction).toBe(NextAction.Play);
    const afterClaim = await api.loadState();
    expect(afterClaim.clientState.pendingReward).toBeUndefined();
    expect(afterClaim.clientState.nextAction).toBe(NextAction.Play);
    expect(afterClaim.clientState.rewards).toHaveLength(1);
    expectCollectingRegularReward(afterClaim.clientState.rewards[0], 0, 6);

    const nextCycle = await api.submitRoute(level.levelId, HOD_ROUTE);
    expect(nextCycle.result).toBe(RouteSubmissionResponseResultEnum3.Found);
    expect(nextCycle.word).toBe('ХОД');
    expect(nextCycle.rewardProgress).toBe(1);
    const nextCycleState = await api.loadState();
    expectCollectingRegularReward(nextCycleState.clientState.rewards[0], 1, 6);
  });

  it('submit-route отклоняет известное ДОХОД по неканоническому маршруту без mutation и с outcomeCode', async () => {
    const { api, level } = await startLevel1();
    const before = await fetch('http://localhost/demo-api/state');
    const beforeBody = await before.json() as ClientStateResponse;
    const beforeEtag = before.headers.get('etag');

    const response = await api.submitRoute(level.levelId, NONCANONICAL_INCOME_ROUTE);

    expect(response.result).toBe(RouteSubmissionResponseResultEnum3.Invalid);
    expect(response.outcomeCode).toBe(RouteSubmissionResponseOutcomeCodeEnum.TARGET_NONCANONICAL_PATH);
    expect(response.newFoundTargets).toEqual([]);
    expect(response.newBonusWords).toEqual([]);

    const after = await fetch('http://localhost/demo-api/state');
    const afterBody = await after.json() as ClientStateResponse;
    expect(after.headers.get('etag')).toBe(beforeEtag);
    expect(afterBody.clientState).toEqual(beforeBody.clientState);

    const replayKey = 'p3-noncanonical-replay-key';
    const replayHeaders = {
      'content-type': 'application/json',
      'idempotency-key': replayKey,
      'if-match': after.headers.get('etag') ?? '',
    };
    const firstReplay = await fetch(`http://localhost/demo-api/levels/${level.levelId}/routes`, {
      method: 'POST',
      headers: replayHeaders,
      body: JSON.stringify({ route: NONCANONICAL_INCOME_ROUTE }),
    });
    const secondReplay = await fetch(`http://localhost/demo-api/levels/${level.levelId}/routes`, {
      method: 'POST',
      headers: replayHeaders,
      body: JSON.stringify({ route: NONCANONICAL_INCOME_ROUTE }),
    });
    expect(firstReplay.status).toBe(200);
    expect(secondReplay.status).toBe(200);
    expect(secondReplay.headers.get('idempotency-key-status')).toBe('replayed');
    await expect(secondReplay.json()).resolves.toEqual(await firstReplay.clone().json());
  });

  it('submit-route и use-hint возвращают 409 REWARD_PENDING_CLAIM до игрового действия', async () => {
    resetP1FakeDb({ pendingReward: true });
    const stateResponse = await fetch('http://localhost/demo-api/state');
    const etag = stateResponse.headers.get('etag') ?? '';

    const routeResponse = await fetch('http://localhost/demo-api/levels/4f8fad5b-d9cb-469f-a165-808677289500/routes', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': 'p3-direct-route-reward-gate',
        'if-match': etag,
      },
      body: JSON.stringify({ route: HOD_ROUTE }),
    });
    const hintResponse = await fetch('http://localhost/demo-api/levels/4f8fad5b-d9cb-469f-a165-808677289500/hints', {
      method: 'POST',
      headers: {
        'idempotency-key': 'p3-direct-hint-reward-gate',
        'if-match': etag,
      },
    });

    expect(routeResponse.status).toBe(409);
    expect(hintResponse.status).toBe(409);
    await expect(routeResponse.json()).resolves.toMatchObject({ type: 'REWARD_PENDING_CLAIM' });
    await expect(hintResponse.json()).resolves.toMatchObject({ type: 'REWARD_PENDING_CLAIM' });
  });

  it('claim-reward claim regular reward очищает exact pointer и создаёт новый collecting cycle', async () => {
    resetP1FakeDb({ pendingReward: true });
    const api = createP1Api();
    const state = await api.loadState();
    const reward = state.clientState.rewards[0];
    expect(reward).toBeDefined();
    if (!reward) throw new Error('Expected available regular reward');

    const claim = await api.claimReward(reward.rewardId, { rewardType: 'hint' });

    expect(claim.rewardId).toBe(reward.rewardId);
    expect(claim.rewardType).toBe(ClaimRewardResponseRewardTypeEnum.Regular);
    expect(claim.nextAction).toBe(NextAction.Play);
    const afterClaim = await api.loadState();
    expect(afterClaim.clientState.pendingReward).toBeUndefined();
    expect(afterClaim.clientState.nextAction).toBe(NextAction.Play);
    expect(afterClaim.clientState.rewards).toHaveLength(1);
    expectCollectingRegularReward(afterClaim.clientState.rewards[0], 0, 6);
  });

  it('P4: реальный handler сохраняет rewardless pendingResults и отдаёт level Results без награды', async () => {
    const { api, level } = await startLevel1();

    for (const target of ALL_TARGETS) {
      await api.submitRoute(level.levelId, target.route);
    }

    const state = await api.loadState();
    expect(state.clientState.pendingResults).toEqual({ levelId: level.levelId });
    expect('pendingReward' in state.clientState).toBe(false);
    expect(state.clientState.rewards.every((reward) => reward.status !== 'available')).toBe(true);

    const results = await api.getLevelResults(level.levelId);
    expectLevelResults(results, LevelResultsResponseCompletionKindEnum.Level);
    expect(results.nextAction).toBe(NextAction.StartLevel);
    expect(results.reward).toBeUndefined();

    const refreshed = await api.loadState();
    expect(refreshed.clientState.pendingResults).toEqual({ levelId: level.levelId });
    expect('pendingReward' in refreshed.clientState).toBe(false);
  });

  it('P4: completed level-results Results include courseOffer only for linked АКЦИЯ and keep target order', async () => {
    const { api, level } = await startLevel1();

    for (const target of ALL_TARGETS) {
      await api.submitRoute(level.levelId, target.route);
    }

    const results = await api.getLevelResults(level.levelId);
    expect(results.foundTargets.map((target) => target.word)).toEqual(
      ALL_TARGETS.map((target) => target.word),
    );

    const linkedTarget = results.foundTargets.find((target) => target.word === 'АКЦИЯ');
    const unlinkedTarget = results.foundTargets.find((target) => target.word === 'ФОНД');
    expect(linkedTarget).toBeDefined();
    expect(unlinkedTarget).toBeDefined();
    expect(linkedTarget && 'courseOffer' in linkedTarget).toBe(true);
    if (!linkedTarget || !('courseOffer' in linkedTarget)) {
      throw new Error('level-results linked target must contain courseOffer');
    }
    expect(linkedTarget.courseOffer).toEqual(COURSE_OFFER);
    expect(unlinkedTarget && 'courseOffer' in unlinkedTarget).toBe(false);
  });

  it('P4: acknowledge-results rewardless acknowledgement leaves neither pending pointer in the real handler', async () => {
    const { api, level } = await startLevel1();

    for (const target of ALL_TARGETS) {
      await api.submitRoute(level.levelId, target.route);
    }
    await api.getLevelResults(level.levelId);

    const stateResponse = await fetch('http://localhost/demo-api/state');
    const acknowledgeResponse = await acknowledgeLevelResults(
      level.levelId,
      stateResponse.headers.get('etag') ?? '',
      'p4-rewardless-acknowledge-key',
    );
    expect(acknowledgeResponse.status).toBe(200);
    const acknowledgeBody = await acknowledgeResponse.json();
    expect(acknowledgeBody).toMatchObject({
      levelId: level.levelId,
      resultsState: 'acknowledged',
      nextAction: NextAction.StartLevel,
    });
    const replayResponse = await acknowledgeLevelResults(
      level.levelId,
      stateResponse.headers.get('etag') ?? '',
      'p4-rewardless-acknowledge-key',
    );
    expect(replayResponse.status).toBe(200);
    expect(replayResponse.headers.get('idempotency-key-status')).toBe('replayed');
    expect(replayResponse.headers.get('etag')).toBe(acknowledgeResponse.headers.get('etag'));
    await expect(replayResponse.json()).resolves.toEqual(acknowledgeBody);
    const newKeyResponse = await acknowledgeLevelResults(
      level.levelId,
      acknowledgeResponse.headers.get('etag') ?? '',
      'p4-rewardless-acknowledge-new-key',
    );
    expect(newKeyResponse.status).toBe(409);
    await expect(newKeyResponse.json()).resolves.toMatchObject({
      type: 'RESULTS_ALREADY_ACKNOWLEDGED',
    });
    const afterAcknowledge = await api.loadState();
    expect(afterAcknowledge.clientState.pendingResults).toBeUndefined();
    expect('pendingReward' in afterAcknowledge.clientState).toBe(false);
  });
});

describe('P1 mock Level 1 hint contract (RED regression, use-hint)', () => {
  it('первая подсказка выбирает первую нерешённую цель и сохраняет targetId/hintTarget', async () => {
    const { api, level } = await startLevel1();

    const response = await api.useHint(level.levelId);
    const hintState = hintStateFromResponse(response);

    expect(hintState.targetId).toMatch(UUID_V4);
    expect(hintState.revealedCells).toEqual(TARGET_FUND.canonicalCells.slice(0, 1));
    expect(response.hintTarget).toEqual({
      targetId: hintState.targetId,
      revealedCells: TARGET_FUND.canonicalCells.slice(0, 1),
    });
    expect(response.completedTarget).toBeUndefined();
    expect(response.revealedCells).toEqual(TARGET_FUND.canonicalCells.slice(0, 1));
    expect(response.foundTargets).toEqual([]);
    expect(response.levelCompleted).toBe(false);

    const resumed = await api.enterLevel(await api.loadState());
    expectRuntimeHintState(resumed.hintState);
    expect(resumed.hintState).toMatchObject({ targetId: hintState.targetId });
  });

  it('после ручного нахождения ДОХОД следующая подсказка не выбирает ДОХОД', async () => {
    const { api, level } = await startLevel1();

    const found = await api.submitRoute(level.levelId, TARGET_INCOME.route);
    expectFoundTarget(found, TARGET_INCOME);

    const response = await api.useHint(level.levelId);
    const hintState = hintStateFromResponse(response);

    expect(hintState.targetId).toMatch(UUID_V4);
    expect(hintState.targetId).not.toBe(TARGET_INCOME.id);
    expect(response.hintTarget.targetId).toBe(hintState.targetId);
    expect(response.hintTarget.revealedCells).toEqual(TARGET_FUND.canonicalCells.slice(0, 1));
    expect(response.foundTargets.map((target) => target.word)).toEqual([INCOME_WORD]);
  });

  it('ручное нахождение активной hinted-цели очищает trail, следующая подсказка идёт к следующей цели', async () => {
    const { api, level } = await startLevel1();

    const firstHint = await api.useHint(level.levelId);
    const firstHintTargetId = hintStateFromResponse(firstHint).targetId;
    expect(firstHintTargetId).toMatch(UUID_V4);

    const found = await api.submitRoute(level.levelId, TARGET_FUND.route);
    expectFoundTarget(found, TARGET_FUND);

    const resumedAfterFind = await api.enterLevel(await api.loadState());
    expect(resumedAfterFind.hintState).toBeUndefined();

    const secondHint = await api.useHint(level.levelId);
    const secondHintState = hintStateFromResponse(secondHint);
    expect(secondHintState.targetId).toMatch(UUID_V4);
    expect(secondHintState.targetId).not.toBe(firstHintTargetId);
    expect(secondHint.revealedCells).toEqual(TARGET_CAPITAL.canonicalCells.slice(0, 1));
  });

  it('финальная клетка подсказки завершает выбранную цель и добавляет только completedTarget с раскрытым словом', async () => {
    const { api, level } = await startLevel1();

    const hints: HintUseResponse[] = [];
    for (let index = 0; index < TARGET_FUND.canonicalCells.length; index += 1) {
      hints.push(await api.useHint(level.levelId));
    }
    const finalHint = hints[hints.length - 1];
    const completedTarget = finalHint.completedTarget;

    expect(finalHint.revealedCells).toEqual(TARGET_FUND.canonicalCells);
    expect(finalHint.hintTarget.targetId).toMatch(UUID_V4);
    expect(finalHint.hintTarget.revealedCells).toEqual(TARGET_FUND.canonicalCells);
    expect(completedTarget).toBeDefined();
    if (!completedTarget) throw new Error('Final hint must expose completedTarget');
    expect(completedTarget.targetId).toMatch(UUID_V4);
    expect(completedTarget.word).toBe(TARGET_FUND.word);
    expect(completedTarget.foundSequence).toBe(1);
    expect(finalHint.foundTargets).toEqual([completedTarget]);

    const resumed = await api.enterLevel(await api.loadState());
    expect(resumed.hintState).toBeUndefined();
  });

  it('use-hint replay не списывает подсказку повторно и не дублирует persisted trail', async () => {
    const { api, level } = await startLevel1();
    const stateResponse = await fetch('http://localhost/demo-api/state');
    const key = 'p3-hint-replay-key';
    const headers = {
      'idempotency-key': key,
      'if-match': stateResponse.headers.get('etag') ?? '',
    };

    const first = await fetch(`http://localhost/demo-api/levels/${level.levelId}/hints`, {
      method: 'POST',
      headers,
    });
    const replay = await fetch(`http://localhost/demo-api/levels/${level.levelId}/hints`, {
      method: 'POST',
      headers,
    });

    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(replay.headers.get('idempotency-key-status')).toBe('replayed');
    await expect(replay.json()).resolves.toEqual(await first.clone().json());

    const state = await api.loadState();
    expect(state.clientState.clientView.balance.hintBalance).toBe(4);
    const resumed = await api.enterLevel(state);
    expect(resumed.hintState?.revealedCells).toHaveLength(1);
  });
});

describe('P4 mock chapter Results/reward contract', () => {
  it('real chapter completion exposes chapter_golden and requires acknowledgement before claim', async () => {
    resetP1FakeDb({ chapterCompletion: true });
    const { api, level } = await startLevel1();

    for (const target of ALL_TARGETS) {
      await api.submitRoute(level.levelId, target.route);
    }

    const state = await api.loadState();
    const reward = state.clientState.rewards.find((candidate) => candidate.status === 'available');
    expect(state.clientState.pendingResults).toEqual({
      levelId: level.levelId,
      rewardId: reward?.rewardId,
    });
    expect(reward?.rewardType).toBe(RewardSummaryRewardTypeEnum.ChapterGolden);
    if (!reward) throw new Error('Chapter completion must expose an available reward');
    state.clientState.rewards
      .filter((candidate) => candidate.status === RewardSummaryStatusEnum.Available)
      .forEach(expectAvailableRewardOptions);
    expectAvailableRewardOptions(reward);
    const rewardOptions = reward.options;
    expect(reward?.options).toEqual(expect.arrayContaining([
      expect.objectContaining({ optionType: RewardOptionOptionTypeEnum.Hint, amount: 3 }),
      expect.objectContaining({ optionType: RewardOptionOptionTypeEnum.Decoration, optionId: expect.any(String) }),
    ]));

    const results = await api.getLevelResults(level.levelId);
    expectLevelResults(results, LevelResultsResponseCompletionKindEnum.Chapter);
    expect(results.reward?.rewardType).toBe(RewardSummaryRewardTypeEnum.ChapterGolden);
    expect(results.nextAction).toBe(NextAction.ClaimReward);
    expect(results.reward?.options).toEqual(rewardOptions);
    if (!results.reward) throw new Error('level-results must preserve the available reward');
    expectAvailableRewardOptions(results.reward);

    const decorationId = results.reward?.options?.find(
      (option) => option.optionType === RewardOptionOptionTypeEnum.Decoration,
    )?.optionId;
    await expect(api.claimReward(reward!.rewardId, chapterClaimBody(decorationId!))).rejects.toMatchObject({
      type: 'RESULTS_ACKNOWLEDGEMENT_REQUIRED',
    });
  });

  it('сохраняет partial regular progress 3 при Golden priority и после Golden claim', async () => {
    resetP1FakeDb({ chapterCompletion: true });
    const { api, level } = await startLevel1();

    for (const bonus of [LAPA_ROUTE, TIP_ROUTE, SON_ROUTE]) {
      await api.submitRoute(level.levelId, bonus);
    }
    const beforeGolden = await api.loadState();
    const collectingBeforeGolden = beforeGolden.clientState.rewards.find(
      (reward) => reward.rewardType === RewardSummaryRewardTypeEnum.Regular,
    );
    expect(collectingBeforeGolden).toBeDefined();
    if (!collectingBeforeGolden) throw new Error('Expected partial collecting regular reward');
    expectCollectingRegularReward(collectingBeforeGolden, 3);

    for (const target of ALL_TARGETS) {
      await api.submitRoute(level.levelId, target.route);
    }
    const goldenState = await api.loadState();
    const availableRewards = goldenState.clientState.rewards.filter(
      (reward) => reward.status === RewardSummaryStatusEnum.Available,
    );
    expect(availableRewards).toHaveLength(1);
    expect(availableRewards[0].rewardType).toBe(RewardSummaryRewardTypeEnum.ChapterGolden);
    expect(goldenState.clientState.pendingResults).toEqual({
      levelId: level.levelId,
      rewardId: availableRewards[0].rewardId,
    });
    expect('pendingReward' in goldenState.clientState).toBe(false);
    const regularDuringGolden = goldenState.clientState.rewards.find(
      (reward) => reward.rewardType === RewardSummaryRewardTypeEnum.Regular,
    );
    expect(regularDuringGolden).toBeDefined();
    if (!regularDuringGolden) throw new Error('Golden must not replace collecting regular reward');
    expectCollectingRegularReward(regularDuringGolden, 3);

    const results = await api.getLevelResults(level.levelId);
    expect(results.reward).toBeDefined();
    if (!results.reward) throw new Error('Expected Golden reward in level results');
    const goldenRewardId = results.reward.rewardId;
    await expect(api.acknowledgeLevelResults(level.levelId)).resolves.toMatchObject({
      levelId: level.levelId,
      resultsState: 'acknowledged',
      nextAction: NextAction.ClaimReward,
      pendingReward: { rewardId: goldenRewardId },
    });
    const afterAcknowledge = await api.loadState();
    expect(afterAcknowledge.clientState.pendingResults).toBeUndefined();
    expect(afterAcknowledge.clientState.pendingReward).toEqual({
      rewardId: goldenRewardId,
    });
    const decorationId = results.reward?.options?.find(
      (option) => option.optionType === RewardOptionOptionTypeEnum.Decoration,
    )?.optionId;
    expect(decorationId).toBeDefined();
    if (!decorationId) throw new Error('Expected Golden decoration option');
    await expect(api.claimReward(results.reward.rewardId, chapterClaimBody(decorationId)))
      .resolves.toMatchObject({ rewardType: ClaimRewardResponseRewardTypeEnum.ChapterGolden });

    const afterGoldenClaim = await api.loadState();
    expect(afterGoldenClaim.clientState.pendingReward).toBeUndefined();
    const resumedRegular = afterGoldenClaim.clientState.rewards.find(
      (reward) => reward.rewardType === RewardSummaryRewardTypeEnum.Regular,
    );
    expect(resumedRegular).toBeDefined();
    if (!resumedRegular) throw new Error('Expected regular cycle after Golden claim');
    expectCollectingRegularReward(resumedRegular, 3);
  });

  it('after acknowledge-results acknowledgement, transfers the golden pointer and keeps reward state unchanged for claim-reward', async () => {
    resetP1FakeDb({ chapterCompletion: true });
    const { api, level } = await startLevel1();

    for (const target of ALL_TARGETS) {
      await api.submitRoute(level.levelId, target.route);
    }
    const results = await api.getLevelResults(level.levelId);
    const reward = results.reward!;
    const decorationOption = reward.options?.find(
      (option) => option.optionType === RewardOptionOptionTypeEnum.Decoration,
    );
    expect(decorationOption).toBeDefined();
    if (!decorationOption || !decorationOption.optionId) {
      throw new Error('Chapter golden reward must expose a decoration optionId');
    }
    const decorationId = decorationOption.optionId;
    const beforeAcknowledge = await api.loadState();
    const rewardsBeforeAcknowledge = beforeAcknowledge.clientState.rewards;

    const stateResponse = await fetch('http://localhost/demo-api/state');
    const acknowledgeResponse = await acknowledgeLevelResults(
      level.levelId,
      stateResponse.headers.get('etag') ?? '',
    );
    expect(acknowledgeResponse.status).toBe(200);
    const acknowledgeBody = await acknowledgeResponse.json();
    expect(acknowledgeBody).toMatchObject({
      levelId: level.levelId,
      resultsState: 'acknowledged',
      nextAction: NextAction.ClaimReward,
      pendingReward: { rewardId: reward.rewardId },
    });
    const afterAcknowledge = await api.loadState();
    expect(afterAcknowledge.clientState.pendingResults).toBeUndefined();
    expect('pendingReward' in afterAcknowledge.clientState).toBe(true);
    if (!('pendingReward' in afterAcknowledge.clientState)) {
      throw new Error('Golden acknowledgement must expose pendingReward');
    }
    expect(afterAcknowledge.clientState.pendingReward).toEqual({ rewardId: reward.rewardId });
    expect(afterAcknowledge.clientState.rewards).toEqual(rewardsBeforeAcknowledge);
    const acknowledgedReward = afterAcknowledge.clientState.rewards.find(
      (candidate) => candidate.rewardId === reward.rewardId,
    );
    expect(acknowledgedReward).toBeDefined();
    if (!acknowledgedReward) throw new Error('acknowledge-results must preserve the available reward');
    expectAvailableRewardOptions(acknowledgedReward);
    expect(afterAcknowledge.clientState.rewards).toEqual(
      expect.arrayContaining([expect.objectContaining({
        rewardId: reward.rewardId,
        status: RewardSummaryStatusEnum.Available,
      })]),
    );

    const claim = await api.claimReward(reward.rewardId, chapterClaimBody(decorationId));
    expectClaimedReward(claim);
    const afterClaim = await api.loadState();
    expect(afterClaim.clientState.pendingResults).toBeUndefined();
    expect('pendingReward' in afterClaim.clientState).toBe(false);
  });

  it('recovers a real claim-reward claim after acknowledge-results from a stale ETag using pendingReward', async () => {
    resetP1FakeDb({ chapterCompletion: true });
    const { api, level } = await startLevel1();

    for (const target of ALL_TARGETS) {
      await api.submitRoute(level.levelId, target.route);
    }
    const results = await api.getLevelResults(level.levelId);
    const reward = results.reward!;
    const decorationId = reward.options?.find(
      (option) => option.optionType === RewardOptionOptionTypeEnum.Decoration,
    )?.optionId;
    expect(decorationId).toBeDefined();
    if (!decorationId) throw new Error('Chapter golden reward must expose a decoration optionId');

    await expect(api.acknowledgeLevelResults(level.levelId)).resolves.toMatchObject({
      levelId: level.levelId,
      resultsState: 'acknowledged',
    });

    // A second real client advances the server ETag without changing the pending reward.
    const concurrentApi = createP1Api();
    const concurrentState = await concurrentApi.loadState();
    await concurrentApi.selectAppearance(concurrentState.clientState.clientView.selectedCharacterId);

    const claim = await api.claimReward(reward.rewardId, chapterClaimBody(decorationId));
    expectClaimedReward(claim);
  });
});

describe('P4 handler idempotency and validation protocol', () => {
  async function reloadP1HandlersFromStorage() {
    vi.resetModules();
    const restored = await import('./p1Handlers');
    server.resetHandlers(...restored.p1Handlers);
    return restored;
  }

  async function availableRewardContext() {
    resetP1FakeDb({ pendingReward: true });
    const stateResponse = await fetch('http://localhost/demo-api/state');
    const state = await stateResponse.json() as ClientStateResponse;
    return {
      rewardId: state.clientState.rewards[0].rewardId,
      etag: stateResponse.headers.get('etag') ?? '',
    };
  }

  async function expectValidation(response: Response): Promise<ValidationProblem> {
    expect(response.status).toBe(400);
    const problem = await response.json() as ValidationProblem;
    expect(problem.type).toBe(ValidationProblemTypeEnum.VALIDATION_ERROR);
    expect(problem.errors).toEqual(expect.any(Array));
    expect(problem.errors.length).toBeGreaterThan(0);
    expect(problem.errors[0]).toEqual(expect.objectContaining({
      type: expect.any(String),
      text: expect.any(String),
    }));
    return problem;
  }

  it('clears corrupted persisted fake DB state when handlers are restored', async () => {
    window.localStorage.setItem('finwords:p1-mock-backend:v1', 'not-json');

    vi.resetModules();
    await import('./p1Handlers');

    expect(window.localStorage.getItem('finwords:p1-mock-backend:v1')).toBeNull();
  });

  it.each(['found target', 'hint state'])(
    'clears persisted state with a non-UUID %s targetId',
    async (kind) => {
      const { api, level } = await startLevel1();
      if (kind === 'found target') {
        await api.submitRoute(level.levelId, TARGET_FUND.route);
      } else {
        await api.useHint(level.levelId);
      }

      const rawState = window.localStorage.getItem('finwords:p1-mock-backend:v1');
      expect(rawState).not.toBeNull();
      if (!rawState) throw new Error('Expected persisted fake DB state');
      const persisted = JSON.parse(rawState) as {
        levelPlay: {
          foundTargets: Array<Record<string, unknown>>;
          hintState?: Record<string, unknown>;
        } | null;
      };
      expect(persisted.levelPlay).not.toBeNull();
      if (!persisted.levelPlay) throw new Error('Expected persisted level state');
      if (kind === 'found target') {
        persisted.levelPlay.foundTargets[0].targetId = 'fund';
      } else if (persisted.levelPlay.hintState) {
        persisted.levelPlay.hintState.targetId = 'income';
      } else {
        throw new Error('Expected persisted hint state');
      }
      window.localStorage.setItem('finwords:p1-mock-backend:v1', JSON.stringify(persisted));

      await reloadP1HandlersFromStorage();

      expect(window.localStorage.getItem('finwords:p1-mock-backend:v1')).toBeNull();
    },
  );

  it('migrates a legacy hint trail to the actual target identified by revealed cells', async () => {
    const { api, level } = await startLevel1();
    const firstHint = await api.useHint(level.levelId);
    const expectedTargetId = firstHint.hintTarget.targetId;
    expect(firstHint.revealedCells).toEqual(TARGET_FUND.canonicalCells.slice(0, 1));

    const rawState = window.localStorage.getItem('finwords:p1-mock-backend:v1');
    expect(rawState).not.toBeNull();
    if (!rawState) throw new Error('Expected persisted fake DB state');
    const persisted = JSON.parse(rawState) as {
      schemaVersion: number;
      levelPlay: { hintState?: Record<string, unknown> } | null;
    };
    expect(persisted.levelPlay?.hintState).toBeDefined();
    if (!persisted.levelPlay?.hintState) throw new Error('Expected persisted hint state');
    persisted.schemaVersion = 4;
    persisted.levelPlay.hintState = {
      revealedCells: TARGET_FUND.canonicalCells.slice(0, 1),
    };
    window.localStorage.setItem('finwords:p1-mock-backend:v1', JSON.stringify(persisted));

    await reloadP1HandlersFromStorage();
    const restoredApi = createP1Api();
    const restoredState = await restoredApi.loadState();
    const resumed = await restoredApi.enterLevel(restoredState);

    expect(resumed.hintState).toBeDefined();
    if (!resumed.hintState) throw new Error('Expected migrated hint state');
    expect(resumed.hintState.targetId).toBe(expectedTargetId);
    expect(resumed.hintState.targetId).toMatch(UUID_V4);
    expect(resumed.hintState.revealedCells).toEqual(TARGET_FUND.canonicalCells.slice(0, 1));
  });

  it('clears persisted state with an invalid nested courseOffer when handlers are restored', async () => {
    const { api, level } = await startLevel1();
    for (const target of ALL_TARGETS) {
      await api.submitRoute(level.levelId, target.route);
    }
    await api.getLevelResults(level.levelId);

    const rawState = window.localStorage.getItem('finwords:p1-mock-backend:v1');
    expect(rawState).not.toBeNull();
    if (!rawState) throw new Error('Expected persisted fake DB state');
    const persisted = JSON.parse(rawState) as {
      resultsSnapshot: { foundTargets: Array<Record<string, unknown>> } | null;
    };
    expect(persisted.resultsSnapshot).not.toBeNull();
    if (!persisted.resultsSnapshot) throw new Error('Expected persisted results snapshot');
    persisted.resultsSnapshot.foundTargets[0].courseOffer = {
      courseId: 'not-a-uuid',
      locale: 42,
      badgeLabel: '',
      title: null,
    };
    window.localStorage.setItem('finwords:p1-mock-backend:v1', JSON.stringify(persisted));

    vi.resetModules();
    await import('./p1Handlers');

    expect(window.localStorage.getItem('finwords:p1-mock-backend:v1')).toBeNull();
  });

  it('clears persisted state with an incomplete claim-reward replay response when handlers are restored', async () => {
    const { rewardId, etag } = await availableRewardContext();
    const claimResponse = await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': 'p4-incomplete-replay-key',
        'if-match': etag,
      },
      body: JSON.stringify({ rewardType: 'hint' }),
    });
    expect(claimResponse.status).toBe(200);

    const rawState = window.localStorage.getItem('finwords:p1-mock-backend:v1');
    expect(rawState).not.toBeNull();
    if (!rawState) throw new Error('Expected persisted fake DB state');
    const persisted = JSON.parse(rawState) as {
      rewardReplays: Array<{ response: Record<string, unknown> }>;
    };
    expect(persisted.rewardReplays).toHaveLength(1);
    persisted.rewardReplays[0].response.claimResult = {};
    window.localStorage.setItem('finwords:p1-mock-backend:v1', JSON.stringify(persisted));

    vi.resetModules();
    await import('./p1Handlers');

    expect(window.localStorage.getItem('finwords:p1-mock-backend:v1')).toBeNull();
  });

  it('сохраняет regular claim-reward nextAction=play и replay response после reload handlers', async () => {
    const { rewardId, etag } = await availableRewardContext();
    const key = 'p3-regular-claim-persisted-replay';
    const body: ClaimRewardRequest = { rewardType: 'hint' };
    const first = await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': key,
        'if-match': etag,
      },
      body: JSON.stringify(body),
    });
    expect(first.status).toBe(200);
    expect(first.headers.get('idempotency-key-status')).toBe('processed');
    const firstBody = await first.json() as ClaimRewardResponse;
    expect(firstBody.nextAction).toBe(NextAction.Play);

    await reloadP1HandlersFromStorage();
    const restoredStateResponse = await fetch('http://localhost/demo-api/state');
    const restoredState = await restoredStateResponse.json() as ClientStateResponse;
    expect(restoredState.clientState.pendingReward).toBeUndefined();
    expect(restoredState.clientState.nextAction).toBe(NextAction.Play);
    expectCollectingRegularReward(restoredState.clientState.rewards[0], 0, 6);

    const replay = await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': key,
        'if-match': etag,
      },
      body: JSON.stringify(body),
    });
    expect(replay.status).toBe(200);
    expect(replay.headers.get('idempotency-key-status')).toBe('replayed');
    await expect(replay.json()).resolves.toEqual(firstBody);

    const stateAfterReplayResponse = await fetch('http://localhost/demo-api/state');
    const stateAfterReplay = await stateAfterReplayResponse.json() as ClientStateResponse;
    expect(stateAfterReplay.clientState).toEqual(restoredState.clientState);
    expect(stateAfterReplayResponse.headers.get('etag')).toBe(restoredStateResponse.headers.get('etag'));
  });

  it('does not bump the existing profile ETag on bootstrap replay', async () => {
    const key = crypto.randomUUID();
    const first = await fetch('http://localhost/demo-api/bootstrap', {
      method: 'POST',
      headers: { 'idempotency-key': key },
    });
    const second = await fetch('http://localhost/demo-api/bootstrap', {
      method: 'POST',
      headers: { 'idempotency-key': key },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.headers.get('etag')).toBe(second.headers.get('etag'));
    expect(second.headers.get('idempotency-key-status')).toBe('replayed');
  });

  it('includes rewardId and body in claim-reward idempotency identity', async () => {
    resetP1FakeDb({ pendingReward: true });
    const stateResponse = await fetch('http://localhost/demo-api/state');
    const state = await stateResponse.json() as ClientStateResponse;
    const rewardId = state.clientState.rewards[0].rewardId;
    const body: ClaimRewardRequest = {
      rewardType: 'hint',
    };
    const key = crypto.randomUUID();
    const headers = {
      'content-type': 'application/json',
      'idempotency-key': key,
      'if-match': stateResponse.headers.get('etag') ?? '',
    };
    const first = await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const differentReward = '8f8fad5b-d9cb-469f-a165-808677289599';
    const reused = await fetch(`http://localhost/demo-api/rewards/${differentReward}/claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    expect(first.status).toBe(200);
    expect(reused.status).toBe(409);
    await expect(reused.json()).resolves.toMatchObject({ type: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('returns a contract-valid ValidationProblem for malformed claim-reward JSON', async () => {
    const { rewardId, etag } = await availableRewardContext();
    await expectValidation(await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
        'if-match': etag,
      },
      body: '{',
    }));
  });

  it.each(['', '   '])(
    'returns REQUIRED_FIELD ValidationProblem for an empty claim-reward body (%j) before reward lookup',
    async (body) => {
      const { rewardId, etag } = await availableRewardContext();
      const problem = await expectValidation(await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': crypto.randomUUID(),
          'if-match': etag,
        },
        body,
      }));

      expect(problem.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: ValidationErrorItemTypeEnum.REQUIRED_FIELD,
          text: expect.any(String),
        }),
      ]));
    },
  );

  it('returns INVALID_FORMAT ValidationProblem for malformed claim-reward rewardId before state lookup', async () => {
    const stateResponse = await fetch('http://localhost/demo-api/state');
    const problem = await expectValidation(await fetch('http://localhost/demo-api/rewards/not-a-uuid/claim', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': 'p3-invalid-reward-id',
        'if-match': stateResponse.headers.get('etag') ?? '',
      },
      body: JSON.stringify({ rewardType: 'hint' }),
    }));

    expect(problem.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: ValidationErrorItemTypeEnum.INVALID_FORMAT,
        field: 'path.rewardId',
        text: expect.any(String),
      }),
    ]));
  });

  it.each([
    ['missing selectedOptionId', { rewardType: 'decoration' }],
    ['empty selectedOptionId', { rewardType: 'decoration', selectedOptionId: '' }],
  ])('returns REQUIRED_FIELD ValidationProblem for %s', async (_, body) => {
    const { rewardId, etag } = await availableRewardContext();
    const problem = await expectValidation(await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
        'if-match': etag,
      },
      body: JSON.stringify(body),
    }));

    expect(problem.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: ValidationErrorItemTypeEnum.REQUIRED_FIELD,
        field: 'body.selectedOptionId',
        text: expect.any(String),
      }),
    ]));
  });

  it.each([
    ['decoration without optionId', { option: { selectedOptionType: 'decoration' } }],
    ['hint with optionId', {
      option: {
        selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Hint,
        selectedOptionId: '1f8fad5b-d9cb-469f-a165-808677289512',
      },
    }],
    ['invalid option enum', { option: { selectedOptionType: 'invalid' } }],
  ])('returns a contract-valid ValidationProblem for %s', async (_, body) => {
    const { rewardId, etag } = await availableRewardContext();
    await expectValidation(await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
        'if-match': etag,
      },
      body: JSON.stringify(body),
    }));
  });

  it('rejects a legacy nested claim-reward request body', async () => {
    const { rewardId, etag } = await availableRewardContext();
    await expectValidation(await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
        'if-match': etag,
      },
      body: JSON.stringify({ option: { selectedOptionType: 'hint' } }),
    }));
  });

  it.each([
    ['hint', { rewardType: 'hint' }],
    ['decoration', {
      rewardType: 'decoration',
      selectedOptionId: '1f8fad5b-d9cb-469f-a165-808677289512',
    }],
  ])('accepts the current claim-reward %s oneOf request body', async (_, body) => {
    const { rewardId, etag } = await availableRewardContext();
    const response = await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
        'if-match': etag,
      },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      rewardId,
      state: ClaimRewardResponseStateEnum.Claimed,
    });
  });
});

describe('P5 handler replay, persistence and error hardening', () => {
  const PERSISTED_STATE_KEY = 'finwords:p1-mock-backend:v1';

  type PersistedReplay = {
    key: string;
    descriptor: string;
    body: unknown;
    etag: string;
  };

  type PersistedFixture = {
    state: {
      clientState: {
        pendingResults?: { levelId: string; rewardId?: string };
        pendingReward?: { rewardId: string };
        rewards: Array<Record<string, unknown>>;
      };
    };
    p2Replays: PersistedReplay[];
  };

  async function reloadHandlersFromStorage() {
    vi.resetModules();
    const restored = await import('./p1Handlers');
    server.resetHandlers(...restored.p1Handlers);
    return restored;
  }

  function readPersistedFixture(): PersistedFixture {
    const raw = window.localStorage.getItem(PERSISTED_STATE_KEY);
    expect(raw).not.toBeNull();
    if (!raw) throw new Error('Expected persisted fake DB state');
    return JSON.parse(raw) as PersistedFixture;
  }

  function writePersistedFixture(fixture: PersistedFixture): void {
    window.localStorage.setItem(PERSISTED_STATE_KEY, JSON.stringify(fixture));
  }

  async function postRouteWithCurrentEtag(
    levelId: string,
    route: CellRef[],
    key: string,
  ): Promise<Response> {
    const stateResponse = await fetch('http://localhost/demo-api/state');
    return fetch(`http://localhost/demo-api/levels/${levelId}/routes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': key,
        'if-match': stateResponse.headers.get('etag') ?? '',
      },
      body: JSON.stringify({ route }),
    });
  }

  async function postHint(levelId: string, key: string, etag: string): Promise<Response> {
    return fetch(`http://localhost/demo-api/levels/${levelId}/hints`, {
      method: 'POST',
      headers: {
        'idempotency-key': key,
        'if-match': etag,
      },
    });
  }

  async function completeLevelWithDirectRoutes(levelId: string): Promise<void> {
    for (const target of ALL_TARGETS) {
      const response = await postRouteWithCurrentEtag(levelId, target.route, crypto.randomUUID());
      expect(response.status).toBe(200);
    }
  }

  it('submit-route после completion: replay-first возвращает старый ответ, новый key получает LEVEL_NOT_IN_PROGRESS без mutation, а descriptor учитывает levelId', async () => {
    const { api, level } = await startLevel1();
    for (const target of ALL_TARGETS.slice(0, -1)) {
      await api.submitRoute(level.levelId, target.route);
    }

    const stateBeforeCompletion = await fetch('http://localhost/demo-api/state');
    const key = 'p5-api006-completion-replay';
    const final = await fetch(`http://localhost/demo-api/levels/${level.levelId}/routes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': key,
        'if-match': stateBeforeCompletion.headers.get('etag') ?? '',
      },
      body: JSON.stringify({ route: ALL_TARGETS.at(-1)!.route }),
    });
    expect(final.status).toBe(200);
    const finalBody = await final.clone().json();
    const completedState = await fetch('http://localhost/demo-api/state');
    const completedBody = await completedState.json() as ClientStateResponse;
    expect(completedBody.clientState.pendingResults).toEqual({ levelId: level.levelId });
    const completedEtag = completedState.headers.get('etag');

    const replay = await fetch(`http://localhost/demo-api/levels/${level.levelId}/routes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': key,
        'if-match': '"stale-before-replay"',
      },
      body: JSON.stringify({ route: ALL_TARGETS.at(-1)!.route }),
    });
    expect(replay.status).toBe(200);
    expect(replay.headers.get('idempotency-key-status')).toBe('replayed');
    await expect(replay.json()).resolves.toEqual(finalBody);
    expect(replay.headers.get('etag')).toBe(final.headers.get('etag'));

    const otherLevelId = completedBody.clientState.levels[1]?.levelId;
    expect(otherLevelId).toBeDefined();
    const reusedForOtherLevel = await fetch(`http://localhost/demo-api/levels/${otherLevelId}/routes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': key,
        'if-match': completedEtag ?? '',
      },
      body: JSON.stringify({ route: ALL_TARGETS.at(-1)!.route }),
    });
    expect(reusedForOtherLevel.status).toBe(409);
    await expect(reusedForOtherLevel.json()).resolves.toMatchObject({
      type: 'IDEMPOTENCY_KEY_REUSED',
    });

    const fresh = await fetch(`http://localhost/demo-api/levels/${level.levelId}/routes`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': 'p5-api006-completion-fresh',
        'if-match': completedEtag ?? '',
      },
      body: JSON.stringify({ route: ALL_TARGETS.at(-1)!.route }),
    });
    expect(fresh.status).toBe(409);
    await expect(fresh.json()).resolves.toMatchObject({ type: 'LEVEL_NOT_IN_PROGRESS' });

    const after = await fetch('http://localhost/demo-api/state');
    await expect(after.json()).resolves.toEqual(completedBody);
    expect(after.headers.get('etag')).toBe(completedEtag);
  });

  it('use-hint после completion/pendingResults: старый key replay-ится, новый key получает LEVEL_NOT_IN_PROGRESS без mutation', async () => {
    const { api, level } = await startLevel1();
    const initialState = await fetch('http://localhost/demo-api/state');
    const key = 'p5-api007-completion-replay';
    const firstHint = await postHint(
      level.levelId,
      key,
      initialState.headers.get('etag') ?? '',
    );
    expect(firstHint.status).toBe(200);
    const firstHintBody = await firstHint.clone().json();
    const firstHintEtag = firstHint.headers.get('etag');

    await completeLevelWithDirectRoutes(level.levelId);
    const completedState = await fetch('http://localhost/demo-api/state');
    const completedBody = await completedState.json() as ClientStateResponse;
    expect(completedBody.clientState.pendingResults).toEqual({ levelId: level.levelId });
    const completedEtag = completedState.headers.get('etag');

    const replay = await postHint(level.levelId, key, '"stale-before-replay"');
    expect(replay.status).toBe(200);
    expect(replay.headers.get('idempotency-key-status')).toBe('replayed');
    expect(replay.headers.get('etag')).toBe(firstHintEtag);
    await expect(replay.json()).resolves.toEqual(firstHintBody);

    const fresh = await postHint(
      level.levelId,
      'p5-api007-completion-fresh',
      completedEtag ?? '',
    );
    expect(fresh.status).toBe(409);
    await expect(fresh.json()).resolves.toMatchObject({ type: 'LEVEL_NOT_IN_PROGRESS' });

    const after = await fetch('http://localhost/demo-api/state');
    await expect(after.json()).resolves.toEqual(completedBody);
    expect(after.headers.get('etag')).toBe(completedEtag);
    void api;
  });

  it('submit-feedback Settings feedback: replay сохраняет response и ETag, changed body получает IDEMPOTENCY_KEY_REUSED', async () => {
    const stateResponse = await fetch('http://localhost/demo-api/state');
    const etag = stateResponse.headers.get('etag') ?? '';
    const key = 'p5-api013-settings-replay';
    const body = { source: 'settings', rating: 5, comment: 'Отлично' };
    const headers = {
      'content-type': 'application/json',
      'idempotency-key': key,
      'if-match': etag,
    };
    const first = await fetch('http://localhost/demo-api/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    expect(first.status).toBe(200);
    const firstBody = await first.clone().json();

    const replay = await fetch('http://localhost/demo-api/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    expect(replay.status).toBe(200);
    expect(replay.headers.get('idempotency-key-status')).toBe('replayed');
    expect(replay.headers.get('etag')).toBe(first.headers.get('etag'));
    await expect(replay.json()).resolves.toEqual(firstBody);

    const changed = await fetch('http://localhost/demo-api/feedback', {
      method: 'POST',
      headers: {
        ...headers,
        'if-match': first.headers.get('etag') ?? '',
      },
      body: JSON.stringify({ ...body, rating: 4 }),
    });
    expect(changed.status).toBe(409);
    await expect(changed.json()).resolves.toMatchObject({ type: 'IDEMPOTENCY_KEY_REUSED' });
    expect(changed.headers.get('etag')).toBe(first.headers.get('etag'));
  });

  it.each([
    ['missing fields', '{}', 'REQUIRED_FIELD'],
    ['invalid source', JSON.stringify({ source: 'other', rating: 5 }), 'INVALID_VALUE'],
    ['out of range rating', JSON.stringify({ source: 'settings', rating: 0 }), 'OUT_OF_RANGE'],
    ['too long comment', JSON.stringify({ source: 'settings', rating: 5, comment: 'x'.repeat(501) }), 'TOO_LONG'],
    [
      'forbidden chapterId for settings',
      JSON.stringify({ source: 'settings', rating: 5, chapterId: '5f8fad5b-d9cb-469f-a165-808677289540' }),
      'FORBIDDEN_FIELD',
    ],
  ])('submit-feedback возвращает ValidationProblem с errors[] для %s', async (_, body, errorType) => {
    const stateResponse = await fetch('http://localhost/demo-api/state');
    const response = await fetch('http://localhost/demo-api/feedback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
        'if-match': stateResponse.headers.get('etag') ?? '',
      },
      body,
    });
    expect(response.status).toBe(400);
    const problem = await response.json() as { type: string; errors?: Array<{ type: string }> };
    expect(problem.type).toBe('VALIDATION_ERROR');
    expect(problem.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: errorType }),
    ]));
  });

  it('submit-feedback возвращает ValidationProblem для malformed JSON', async () => {
    const stateResponse = await fetch('http://localhost/demo-api/state');
    const response = await fetch('http://localhost/demo-api/feedback', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': crypto.randomUUID(),
        'if-match': stateResponse.headers.get('etag') ?? '',
      },
      body: '{',
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      type: 'VALIDATION_ERROR',
      errors: expect.any(Array),
    });
  });

  it('claim-reward concurrent same-key claim is processed/replayed once, while a new key after claim is terminal', async () => {
    resetP1FakeDb({ pendingReward: true });
    const beforeResponse = await fetch('http://localhost/demo-api/state');
    const before = await beforeResponse.json() as ClientStateResponse;
    const rewardId = before.clientState.rewards[0].rewardId;
    const key = 'p5-api009-concurrent-claim';
    const headers = {
      'content-type': 'application/json',
      'idempotency-key': key,
      'if-match': beforeResponse.headers.get('etag') ?? '',
    };
    const request = () => fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rewardType: 'hint' }),
    });
    const [first, concurrent] = await Promise.all([request(), request()]);
    expect(first.status).toBe(200);
    expect(concurrent.status).toBe(200);
    expect([first.headers.get('idempotency-key-status'), concurrent.headers.get('idempotency-key-status')].sort())
      .toEqual(['processed', 'replayed']);
    await expect(concurrent.json()).resolves.toEqual(await first.clone().json());

    const afterResponse = await fetch('http://localhost/demo-api/state');
    const after = await afterResponse.json() as ClientStateResponse;
    expect(after.clientState.clientView.balance.hintBalance)
      .toBe(before.clientState.clientView.balance.hintBalance + 1);
    expect(after.clientState.pendingReward).toBeUndefined();
    expect(afterResponse.headers.get('etag')).toBe(first.headers.get('etag'));

    const newKey = await fetch(`http://localhost/demo-api/rewards/${rewardId}/claim`, {
      method: 'POST',
      headers: {
        ...headers,
        'idempotency-key': 'p5-api009-after-claimed',
        'if-match': afterResponse.headers.get('etag') ?? '',
      },
      body: JSON.stringify({ rewardType: 'hint' }),
    });
    expect(newKey.status).toBe(409);
    await expect(newKey.json()).resolves.toMatchObject({ type: 'REWARD_ALREADY_CLAIMED' });

    const finalResponse = await fetch('http://localhost/demo-api/state');
    await expect(finalResponse.json()).resolves.toEqual(after);
    expect(finalResponse.headers.get('etag')).toBe(afterResponse.headers.get('etag'));
  });

  type PendingPointerCorruptor = (fixture: PersistedFixture, levelId: string) => void;

  it.each([
    ['pendingResults.levelId', (fixture, levelId) => {
      void levelId;
      fixture.state.clientState.pendingResults = { levelId: 'not-a-uuid' };
    }],
    ['pendingResults.rewardId', (fixture, levelId) => {
      fixture.state.clientState.pendingResults = { levelId, rewardId: 'not-a-uuid' };
    }],
    ['pendingReward.rewardId', (_fixture, _levelId) => {
      void _levelId;
      _fixture.state.clientState.pendingReward = { rewardId: 'not-a-uuid' };
    }],
  ] as Array<[string, PendingPointerCorruptor]>)('сбрасывает persisted state с невалидным UUID в %s', async (name, corrupt) => {
    const { api, level } = await startLevel1();
    await api.submitRoute(level.levelId, ALL_TARGETS[0].route);
    const fixture = readPersistedFixture();
    corrupt(fixture, level.levelId);
    writePersistedFixture(fixture);
    await reloadHandlersFromStorage();
    expect(window.localStorage.getItem(PERSISTED_STATE_KEY), name).toBeNull();
  });

  async function createReplayFor(
    apiId: 'submit-route' | 'use-hint' | 'submit-feedback' | 'acknowledge-results',
  ): Promise<string> {
    if (apiId === 'submit-route') {
      const { level } = await startLevel1();
      const response = await postRouteWithCurrentEtag(level.levelId, TARGET_FUND.route, crypto.randomUUID());
      expect(response.status).toBe(200);
      return 'route:';
    }
    if (apiId === 'use-hint') {
      const { level } = await startLevel1();
      const stateResponse = await fetch('http://localhost/demo-api/state');
      const response = await postHint(
        level.levelId,
        crypto.randomUUID(),
        stateResponse.headers.get('etag') ?? '',
      );
      expect(response.status).toBe(200);
      return 'hint:';
    }
    if (apiId === 'submit-feedback') {
      const api = createP1Api();
      await api.loadState();
      await api.submitFeedback({ source: 'settings', rating: 5, comment: 'Persisted feedback' });
      return 'feedback:';
    }

    resetP1FakeDb({ chapterCompletion: true });
    const { api, level } = await startLevel1();
    for (const target of ALL_TARGETS) await api.submitRoute(level.levelId, target.route);
    await api.getLevelResults(level.levelId);
    const stateResponse = await fetch('http://localhost/demo-api/state');
    const response = await acknowledgeLevelResults(
      level.levelId,
      stateResponse.headers.get('etag') ?? '',
      crypto.randomUUID(),
    );
    expect(response.status).toBe(200);
    return 'acknowledge:';
  }

  it.each(['submit-route', 'use-hint', 'submit-feedback', 'acknowledge-results'] as const)(
    'сохраняет валидную %s replay-запись после reload handlers',
    async (apiId) => {
      const descriptorPrefix = await createReplayFor(apiId);
      const fixture = readPersistedFixture();
      expect(fixture.p2Replays.some((replay) => replay.descriptor.startsWith(descriptorPrefix))).toBe(true);
      await reloadHandlersFromStorage();
      expect(window.localStorage.getItem(PERSISTED_STATE_KEY)).not.toBeNull();
    },
  );

  it.each([
    ['submit-route', 'route:'],
    ['use-hint', 'hint:'],
    ['submit-feedback', 'feedback:'],
    ['acknowledge-results', 'acknowledge:'],
  ] as const)('сбрасывает state при невалидном body replay-записи %s', async (apiId, descriptorPrefix) => {
    if (apiId === 'submit-feedback') {
      await createP1Api().loadState();
      const fixture = readPersistedFixture();
      fixture.p2Replays.push({
        key: 'p5-api013-persisted-invalid-body',
        descriptor: 'feedback:settings:5',
        body: null,
        etag: '"p1-1"',
      });
      writePersistedFixture(fixture);
    } else {
      await createReplayFor(apiId);
      const fixture = readPersistedFixture();
      const replay = fixture.p2Replays.find((candidate) => candidate.descriptor.startsWith(descriptorPrefix));
      expect(replay).toBeDefined();
      if (!replay) throw new Error(`Missing ${apiId} replay`);
      replay.body = null;
      writePersistedFixture(fixture);
    }

    await reloadHandlersFromStorage();
    expect(window.localStorage.getItem(PERSISTED_STATE_KEY)).toBeNull();
  });

  it.each([
    ['submit-route', 'route:'],
    ['use-hint', 'hint:'],
    ['submit-feedback', 'feedback:'],
    ['acknowledge-results', 'acknowledge:'],
  ] as const)('сбрасывает state при невалидном descriptor replay-записи %s', async (apiId, descriptorPrefix) => {
    if (apiId === 'submit-feedback') {
      await createP1Api().loadState();
      const fixture = readPersistedFixture();
      fixture.p2Replays.push({
        key: 'p5-api013-persisted-invalid-descriptor',
        descriptor: 'not-a-replay-descriptor',
        body: { feedbackId: '6f8fad5b-d9cb-469f-a165-808677289550', status: 'submitted' },
        etag: '"p1-1"',
      });
      writePersistedFixture(fixture);
    } else {
      await createReplayFor(apiId);
      const fixture = readPersistedFixture();
      const replay = fixture.p2Replays.find((candidate) => candidate.descriptor.startsWith(descriptorPrefix));
      expect(replay).toBeDefined();
      if (!replay) throw new Error(`Missing ${apiId} replay`);
      replay.descriptor = 'not-a-replay-descriptor';
      writePersistedFixture(fixture);
    }

    await reloadHandlersFromStorage();
    expect(window.localStorage.getItem(PERSISTED_STATE_KEY)).toBeNull();
  });

  it('реальный handler возвращает HINTS_EXHAUSTED без изменения state/ETag', async () => {
    const { api, level } = await startLevel1();
    for (let index = 0; index < 5; index += 1) {
      await api.useHint(level.levelId);
    }
    const before = await fetch('http://localhost/demo-api/state');
    const beforeBody = await before.json() as ClientStateResponse;
    const response = await fetch(`http://localhost/demo-api/levels/${level.levelId}/hints`, {
      method: 'POST',
      headers: {
        'idempotency-key': 'p5-hints-exhausted',
        'if-match': before.headers.get('etag') ?? '',
      },
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ type: 'HINTS_EXHAUSTED' });
    const after = await fetch('http://localhost/demo-api/state');
    await expect(after.json()).resolves.toEqual(beforeBody);
    expect(after.headers.get('etag')).toBe(before.headers.get('etag'));
  });

  it('RED: bounded reset option GAME_UNAVAILABLE is required for a real handler-backed 403', async () => {
    resetP1FakeDb({ gameUnavailable: true });
    const response = await fetch('http://localhost/demo-api/state');
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ type: 'GAME_UNAVAILABLE' });
  });

  it('RED: bounded reset option CLIENT_NOT_FOUND is required for a real handler-backed 404', async () => {
    resetP1FakeDb({ clientNotFound: true });
    const response = await fetch('http://localhost/demo-api/state');
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ type: 'CLIENT_NOT_FOUND' });
  });
});

describe('P5 server-owned initial balance and regular reward thresholds', () => {
  it('bootstrap и state возвращают initial knowledge balance ровно 0', async () => {
    const bootstrap = await fetch('http://localhost/demo-api/bootstrap', {
      method: 'POST',
      headers: { 'idempotency-key': 'p5-initial-balance-bootstrap' },
    });
    const state = await fetch('http://localhost/demo-api/state');

    expect(bootstrap.status).toBe(200);
    expect(state.status).toBe(200);
    const bootstrapBody = await bootstrap.json() as ClientStateResponse;
    const stateBody = await state.json() as ClientStateResponse;
    expect(bootstrapBody.clientState.clientView.balance.knowledgePoints).toBe(0);
    expect(stateBody.clientState.clientView.balance.knowledgePoints).toBe(0);
  });

  it('regular threshold cycle 0 открывает reward на 4-м bonus, после claim цикл 1 начинается с 0/6 и 5-й bonus даёт 1/6', async () => {
    const { api, level } = await startLevel1();
    const initial = await api.loadState();
    expect(initial.clientState.rewards[0]?.progress).toEqual({ current: 0, threshold: 4 });

    for (const bonus of [
      { route: LAPA_ROUTE, word: 'ЛАПА' },
      { route: TIP_ROUTE, word: 'ТИП' },
      { route: SON_ROUTE, word: 'СОН' },
    ]) {
      const response = await api.submitRoute(level.levelId, bonus.route);
      expect(response.word).toBe(bonus.word);
    }

    const fourth = await api.submitRoute(level.levelId, FON_ROUTE);
    expect(fourth.word).toBe('ФОН');
    expect(fourth.rewardOpened?.progress).toEqual({ current: 4, threshold: 4 });
    if (!fourth.rewardOpened) throw new Error('Fourth bonus must open regular reward');

    await expect(api.claimReward(fourth.rewardOpened.rewardId, { rewardType: 'hint' }))
      .resolves.toMatchObject({ rewardId: fourth.rewardOpened.rewardId });
    const afterClaim = await api.loadState();
    expect(afterClaim.clientState.rewards[0]?.progress).toEqual({ current: 0, threshold: 6 });

    const fifth = await api.submitRoute(level.levelId, HOD_ROUTE);
    expect(fifth.word).toBe('ХОД');
    expect(fifth.rewardProgress).toBe(1);
    const afterFifth = await api.loadState();
    expect(afterFifth.clientState.rewards[0]?.progress).toEqual({ current: 1, threshold: 6 });
  });

  it.each([
    [2, 8],
    [3, 10],
    [4, 10],
  ])('RED: future cycle %s uses server-owned threshold %s without inventing Level1 bonus words', async (cycle, threshold) => {
    resetP1FakeDb({ regularRewardCycle: cycle, regularRewardProgress: 0 });
    const state = await createP1Api().loadState();
    expect(state.clientState.rewards[0]?.progress).toEqual({ current: 0, threshold });
  });

  it('normal Level1 completion from initial balance 0 returns Results earnedKnowledgePoints=7 and total=7', async () => {
    const { api, level } = await startLevel1();

    for (const target of ALL_TARGETS) {
      await api.submitRoute(level.levelId, target.route);
    }

    const results = await api.getLevelResults(level.levelId);
    expect(results.summary.earnedKnowledgePoints).toBe(7);
    expect(results.summary.knowledgePointsTotal).toBe(7);
    expect(results.summary.targets).toEqual({ foundCount: 7, totalCount: 7 });
  });
});
