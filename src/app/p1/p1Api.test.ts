import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import type {
  AcknowledgeLevelResultsResponse,
  CellRef,
  ClaimRewardRequest,
  ClaimRewardResponse,
  ClientStateResponse,
  CourseOffer,
  FoundTarget,
  HintState,
  HintUseResponse,
  LevelPlayResponse,
  LevelResultsResponse,
  PendingResults,
  RewardOption,
  RouteSubmissionResponse,
} from '../../infra/api/generated/data-contracts';
import {
  CellViewStateEnum,
  ClaimRewardResponseRewardTypeEnum,
  ClaimRewardResponseStateEnum,
  LevelProgressSummaryStatusEnum,
  LevelPlayResponseStatusEnum,
  LevelResultsResponseCompletionKindEnum,
  AcknowledgeLevelResultsResponseResultsStateEnum,
  LevelResultsResponseResultsStateEnum,
  LevelResultsResponseStatusEnum,
  LevelResultsResponseStatusEnum1,
  NextAction,
  RewardOptionDecorationTypeEnum,
  RewardOptionOptionTypeEnum,
  RewardSummaryStatusEnum,
  RewardSummaryStatusEnum1,
  RouteSubmissionResponseOutcomeCodeEnum,
  RouteSubmissionResponseResultEnum3,
  SelectedOptionSelectedOptionTypeEnum,
} from '../../infra/api/generated/data-contracts';
import { operationRegistry } from '../../infra/api/operationRegistry';
import { server } from '../../mocks/server';
import { resetP1FakeDb } from '../../mocks/p1Handlers';
import { createP1Api, type P1Api } from './p1Api';

const LEVEL_ID = '4f8fad5b-d9cb-469f-a165-808677289500';
const CHAPTER_ID = '5f8fad5b-d9cb-469f-a165-808677289540';
const REWARD_ID = '3f8fad5b-d9cb-469f-a165-808677289530';
const TARGET_STOCK_ID = '7f8fad5b-d9cb-469f-a165-808677289501';
const TARGET_FUND_ID = '8f8fad5b-d9cb-469f-a165-808677289502';

const COURSE_OFFER: CourseOffer = {
  courseId: '6f8fad5b-d9cb-469f-a165-80867728951e',
  locale: 'ru-RU',
  badgeLabel: 'Мини-курс',
  title: 'АКЦИЯ',
};

const NORMALIZED_REWARD_OPTIONS: RewardOption[] = [
  {
    optionType: RewardOptionOptionTypeEnum.Hint,
    amount: 1,
    title: 'Подсказка',
  },
  {
    optionType: RewardOptionOptionTypeEnum.Decoration,
    optionId: '1f8fad5b-d9cb-469f-a165-808677289512',
    title: 'Штурман',
    decorationType: RewardOptionDecorationTypeEnum.Character,
  },
];

const API008_FOUND_TARGET_WITH_OFFER = {
  targetId: TARGET_STOCK_ID,
  word: 'АКЦИЯ',
  definition: 'Ценная бумага, которая подтверждает долю владения компанией.',
  cells: [{ row: 0, col: 0 }],
  foundAt: '2026-08-21T12:02:00.000Z',
  foundSequence: 1,
  courseOffer: COURSE_OFFER,
} satisfies FoundTarget & { courseOffer: CourseOffer };

const API008_FOUND_TARGET_WITHOUT_OFFER = {
  targetId: TARGET_FUND_ID,
  word: 'ФОНД',
  definition: 'Способ объединить деньги многих инвесторов и вложить их в набор активов.',
  cells: [{ row: 0, col: 1 }],
  foundAt: '2026-08-21T12:02:00.000Z',
  foundSequence: 2,
} satisfies FoundTarget;

function hasCourseOffer(
  target: FoundTarget,
): target is FoundTarget & { courseOffer: CourseOffer } {
  if (!('courseOffer' in target) || typeof target.courseOffer !== 'object' || target.courseOffer === null) {
    return false;
  }
  return 'courseId' in target.courseOffer &&
    'locale' in target.courseOffer &&
    'badgeLabel' in target.courseOffer &&
    'title' in target.courseOffer;
}

function p4Api(): P1Api {
  return createP1Api();
}

function stateWithPendingResults(
  state: ClientStateResponse,
  rewardId: string = REWARD_ID,
): ClientStateResponse {
  return {
    ...state,
    clientState: {
      ...state.clientState,
      pendingResults: { levelId: LEVEL_ID, rewardId } satisfies PendingResults,
    },
  };
}

type PendingRewardPointer = { rewardId: string };
type ClientStateWithPendingReward = ClientStateResponse & {
  clientState: ClientStateResponse['clientState'] & {
    pendingReward?: PendingRewardPointer;
  };
};

function stateWithPendingReward(
  state: ClientStateResponse,
  options: { pendingRewardId?: string; availableRewardId?: string },
): ClientStateWithPendingReward {
  return {
    ...state,
    clientState: {
      ...state.clientState,
      pendingResults: undefined,
      ...(options.pendingRewardId
        ? { pendingReward: { rewardId: options.pendingRewardId } }
        : {}),
      rewards: state.clientState.rewards.map((reward) => {
        if (reward.rewardId === options.availableRewardId) {
          return {
            ...reward,
            status: RewardSummaryStatusEnum.Available,
            options: NORMALIZED_REWARD_OPTIONS,
          };
        }
        return { ...reward, status: RewardSummaryStatusEnum1.Collecting };
      }),
    },
  };
}

function levelResults(overrides: Partial<LevelResultsResponse> = {}): LevelResultsResponse {
  return {
    levelId: LEVEL_ID,
    status: LevelResultsResponseStatusEnum.Completed,
    resultsState: LevelResultsResponseResultsStateEnum.PendingAcknowledgement,
    completionKind: LevelResultsResponseCompletionKindEnum.Level,
    board: levelPlay().board,
    foundTargets: [],
    bonusWords: [],
    completedAt: '2026-08-21T12:02:00.000Z',
    summary: {
      earnedKnowledgePoints: 7,
      knowledgePointsTotal: 16,
      targets: { foundCount: 7, totalCount: 7 },
      bonuses: { foundCount: 1 },
    },
    chapter: {
      chapterId: '5f8fad5b-d9cb-469f-a165-808677289540',
      number: 1,
      title: 'Первый капитал',
      completedLevels: 1,
      totalLevels: 9,
      status: LevelResultsResponseStatusEnum1.InProgress,
    },
    nextAction: NextAction.StartLevel,
    ...overrides,
  };
}

function claimResponse(overrides: Partial<ClaimRewardResponse> = {}): ClaimRewardResponse {
  return {
    rewardId: REWARD_ID,
    rewardType: ClaimRewardResponseRewardTypeEnum.Regular,
    state: ClaimRewardResponseStateEnum.Claimed,
    selectedOption: { selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Hint },
    claimResult: { balance: { knowledgePoints: 16, hintBalance: 6 } },
    nextAction: NextAction.StartLevel,
    ...overrides,
  };
}

function apiPath(apiId: string): string {
  const operation = operationRegistry.find((candidate) => candidate.apiId === apiId);
  if (!operation) throw new Error(`Missing operation ${apiId}`);
  return operation.templatePath.replace(/\{levelId\}/g, LEVEL_ID);
}

function apiPathFor(apiId: string, params: Record<string, string>): string {
  const operation = operationRegistry.find((candidate) => candidate.apiId === apiId);
  if (!operation) throw new Error(`Missing operation ${apiId}`);
  return operation.templatePath.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = params[key];
    if (!value) throw new Error(`Missing path parameter ${key}`);
    return encodeURIComponent(value);
  });
}

const API017_PATH = `/api/v1/levels/${LEVEL_ID}/results/acknowledge`;

function acknowledgeResponse(
  overrides: Partial<AcknowledgeLevelResultsResponse> = {},
): AcknowledgeLevelResultsResponse {
  return {
    levelId: LEVEL_ID,
    resultsAcknowledgedAt: '2026-08-21T12:03:00.000Z',
    resultsState: AcknowledgeLevelResultsResponseResultsStateEnum.Acknowledged,
    nextAction: NextAction.StartLevel,
    ...overrides,
  };
}

function levelPlay(overrides: Partial<LevelPlayResponse> = {}): LevelPlayResponse {
  return {
    levelId: LEVEL_ID,
    levelVersionId: '5f8fad5b-d9cb-469f-a165-808677289513',
    levelNumber: 1,
    microtheme: 'Личные финансы',
    status: LevelPlayResponseStatusEnum.InProgress,
    board: {
      size: 3,
      cells: Array.from({ length: 9 }, (_, index) => ({
        row: Math.floor(index / 3),
        col: index % 3,
        letter: 'А',
        state: CellViewStateEnum.Letter,
        belongsToFoundWord: false,
      })).reverse(),
    },
    targetsRemaining: 1,
    foundTargets: [],
    bonusWords: [],
    startedAt: '2026-08-21T12:00:00.000Z',
    nextAction: NextAction.Play,
    ...overrides,
  };
}

function asInProgress(state: ClientStateResponse): ClientStateResponse {
  return {
    ...state,
    clientState: {
      ...state.clientState,
      inProgressLevel: {
        levelId: LEVEL_ID,
        levelVersionId: '5f8fad5b-d9cb-469f-a165-808677289513',
        startedAt: '2026-08-21T12:00:00.000Z',
      },
      levels: state.clientState.levels.map((level, index) => ({
        ...level,
        levelId: index === 0 ? LEVEL_ID : level.levelId,
        status:
          index === 0
            ? LevelProgressSummaryStatusEnum.InProgress
            : level.status,
      })),
      nextAction: NextAction.Play,
    },
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
beforeEach(() => {
  resetP1FakeDb();
  window.__FINWORDS_RUNTIME_CONFIG__ = {
    apiMode: 'mock',
    apiBaseUrl: 'http://localhost',
  };
});
afterEach(() => {
  server.resetHandlers();
  delete window.__FINWORDS_RUNTIME_CONFIG__;
});
afterAll(() => server.close());

describe('P1 API integration over HttpApiAdapter + MSW', () => {
  it('loads a valid initialized state through bootstrap and state', async () => {
    const state = await createP1Api().loadState();

    expect(state.clientState.chapters).toHaveLength(7);
    expect(state.clientState.levels).toHaveLength(50);
    expect(state.clientState.clientView.settings.tutorialCompleted).toBe(false);
  });

  it('re-reads authoritative state through API-002 without repeating bootstrap', async () => {
    let bootstrapCalls = 0;
    let stateCalls = 0;
    server.use(
      http.post(apiPath('API-001'), () => {
        bootstrapCalls += 1;
      }),
      http.get(apiPath('API-002'), () => {
        stateCalls += 1;
      }),
    );
    const api = createP1Api() as ReturnType<typeof createP1Api> & {
      resyncState(signal?: AbortSignal): Promise<ClientStateResponse>;
    };

    const state = await api.resyncState();

    expect(state.clientState.levels).toHaveLength(50);
    expect(bootstrapCalls).toBe(0);
    expect(stateCalls).toBe(1);
  });

  it('persists Settings and Appearance mutations using the current ETag', async () => {
    const api = createP1Api();
    await api.loadState();

    const settings = await api.updateSettings({ musicEnabled: false });
    expect(settings).toMatchObject({ musicEnabled: false, soundEnabled: true });

    const catalog = await api.getAppearances();
    const owned = catalog.items.find(
      (appearance) => appearance.type === 'character' && appearance.isOwned,
    );
    expect(owned).toBeDefined();
    const selected = await api.selectAppearance(owned!.appearanceId);
    expect(selected.selectedCharacterId).toBe(owned!.appearanceId);
  });

  it('re-reads API-002 once after API-010 conflict and retries the same absolute intent with the same key', async () => {
    const api = createP1Api();
    const initial = await api.loadState();
    const patchKeys: string[] = [];
    const patchBodies: unknown[] = [];
    let patchCalls = 0;
    let stateCalls = 0;
    server.use(
      http.patch(apiPath('API-010'), async ({ request }) => {
        patchCalls += 1;
        patchKeys.push(request.headers.get('idempotency-key') ?? '');
        patchBodies.push(await request.json());
        if (patchCalls === 1) {
          return HttpResponse.json(
            { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"settings-2"' } },
            { status: 409, headers: { ETag: '"settings-2"' } },
          );
        }
        return HttpResponse.json(
          { musicEnabled: false, soundEnabled: true, tutorialCompleted: true },
          {
            headers: {
              ETag: '"settings-3"',
              'Idempotency-Key-Status': 'processed',
            },
          },
        );
      }),
      http.get(apiPath('API-002'), () => {
        stateCalls += 1;
        return HttpResponse.json(initial, { headers: { ETag: '"settings-2"' } });
      }),
    );

    await expect(api.updateSettings({ musicEnabled: false })).resolves.toMatchObject({
      musicEnabled: false,
      soundEnabled: true,
    });

    expect(stateCalls).toBe(1);
    expect(patchCalls).toBe(2);
    expect(new Set(patchKeys).size).toBe(1);
    expect(patchKeys[0]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(patchBodies).toEqual([
      { musicEnabled: false },
      { musicEnabled: false },
    ]);
  });

  it('does not repeat API-010 when the authoritative conflict reread already satisfies the intent', async () => {
    const api = createP1Api();
    const initial = await api.loadState();
    const alreadyApplied = {
      ...initial,
      clientState: {
        ...initial.clientState,
        clientView: {
          ...initial.clientState.clientView,
          settings: {
            ...initial.clientState.clientView.settings,
            soundEnabled: false,
          },
        },
      },
    };
    let patchCalls = 0;
    let stateCalls = 0;
    server.use(
      http.patch(apiPath('API-010'), () => {
        patchCalls += 1;
        return HttpResponse.json(
          { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"settings-2"' } },
          { status: 409, headers: { ETag: '"settings-2"' } },
        );
      }),
      http.get(apiPath('API-002'), () => {
        stateCalls += 1;
        return HttpResponse.json(alreadyApplied, { headers: { ETag: '"settings-2"' } });
      }),
    );

    await expect(api.updateSettings({ soundEnabled: false })).resolves.toEqual(
      alreadyApplied.clientState.clientView.settings,
    );
    expect(stateCalls).toBe(1);
    expect(patchCalls).toBe(1);
  });

  it('uses the canonical bodyless API-015 path and retries once with the same key after authoritative conflict', async () => {
    const api = createP1Api();
    const initial = await api.loadState();
    const completed = {
      ...initial,
      clientState: {
        ...initial.clientState,
        clientView: {
          ...initial.clientState.clientView,
          campaignProgress: { isCompleted: true, isCompletionShown: false },
        },
        nextAction: NextAction.CampaignComplete,
      },
    };
    const keys: string[] = [];
    const bodies: Array<string | null> = [];
    let postCalls = 0;
    let stateCalls = 0;
    server.use(
      http.post('/api/v1/campaigns/current/completion-shown', async ({ request }) => {
        postCalls += 1;
        keys.push(request.headers.get('idempotency-key') ?? '');
        bodies.push(request.body === null ? null : await request.text());
        if (postCalls === 1) {
          return HttpResponse.json(
            { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"campaign-2"' } },
            { status: 409, headers: { ETag: '"campaign-2"' } },
          );
        }
        return HttpResponse.json(
          { isCompletionShown: true, nextAction: NextAction.None },
          {
            headers: {
              ETag: '"campaign-3"',
              'Idempotency-Key-Status': 'processed',
            },
          },
        );
      }),
      http.get(apiPath('API-002'), () => {
        stateCalls += 1;
        return HttpResponse.json(completed, { headers: { ETag: '"campaign-2"' } });
      }),
    );

    await expect(api.confirmCampaignCompleteShown()).resolves.toEqual({
      isCompletionShown: true,
      nextAction: NextAction.None,
    });
    expect(stateCalls).toBe(1);
    expect(postCalls).toBe(2);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(bodies).toEqual([null, null]);
  });

  it('does not repeat API-015 when conflict reread says completion was already shown', async () => {
    const api = createP1Api();
    const initial = await api.loadState();
    const shown = {
      ...initial,
      clientState: {
        ...initial.clientState,
        clientView: {
          ...initial.clientState.clientView,
          campaignProgress: { isCompleted: true, isCompletionShown: true },
        },
        nextAction: NextAction.None,
      },
    };
    let postCalls = 0;
    let stateCalls = 0;
    server.use(
      http.post('/api/v1/campaigns/current/completion-shown', () => {
        postCalls += 1;
        return HttpResponse.json(
          { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"campaign-2"' } },
          { status: 409, headers: { ETag: '"campaign-2"' } },
        );
      }),
      http.get(apiPath('API-002'), () => {
        stateCalls += 1;
        return HttpResponse.json(shown, { headers: { ETag: '"campaign-2"' } });
      }),
    );

    await expect(api.confirmCampaignCompleteShown()).resolves.toEqual({
      isCompletionShown: true,
      nextAction: NextAction.None,
    });
    expect(stateCalls).toBe(1);
    expect(postCalls).toBe(1);
  });

  it('submits Settings feedback without a chapter id', async () => {
    const api = createP1Api();
    await api.loadState();

    const response = await api.submitFeedback({
      source: 'settings',
      rating: 5,
      comment: 'Отлично',
    });
    expect(response.status).toBe('submitted');
  });

  it('starts the only available server level and returns LevelPlayResponse', async () => {
    const api = createP1Api();
    const state = await api.loadState();

    const response = await api.enterLevel(state);

    expect(response.levelNumber).toBe(1);
    expect(response.board.size).toBe(3);
  });

  it('resumes inProgressLevel by UUID without calling API-004', async () => {
    const api = createP1Api();
    const state = asInProgress(await api.loadState());
    let startCalls = 0;
    let resumeCalls = 0;
    server.use(
      http.post(apiPath('API-004'), () => {
        startCalls += 1;
        return HttpResponse.json(levelPlay(), { headers: { ETag: '"unexpected"' } });
      }),
      http.get(apiPath('API-005'), () => {
        resumeCalls += 1;
        return HttpResponse.json(levelPlay(), { headers: { ETag: '"resume"' } });
      }),
    );

    await api.enterLevel(state);

    expect(startCalls).toBe(0);
    expect(resumeCalls).toBe(1);
  });

  it('stops explicitly when there is no single available level candidate', async () => {
    const api = createP1Api();
    const state = await api.loadState();
    const noneAvailable: ClientStateResponse = {
      ...state,
      clientState: {
        ...state.clientState,
        levels: state.clientState.levels.map((level) => ({
          ...level,
          status: LevelProgressSummaryStatusEnum.Locked,
        })),
      },
    };
    const multipleAvailable: ClientStateResponse = {
      ...state,
      clientState: {
        ...state.clientState,
        levels: state.clientState.levels.map((level, index) => ({
          ...level,
          status:
            index < 2
              ? LevelProgressSummaryStatusEnum.Available
              : LevelProgressSummaryStatusEnum.Locked,
        })),
      },
    };

    await expect(api.enterLevel(noneAvailable)).rejects.toThrow('NO_AVAILABLE_LEVEL');
    await expect(api.enterLevel(multipleAvailable)).rejects.toThrow(
      'AMBIGUOUS_AVAILABLE_LEVEL',
    );
  });

  it('re-reads state and retries API-004 with the same idempotency key after a version conflict', async () => {
    const api = createP1Api();
    const startKeys: string[] = [];
    const ifMatches: string[] = [];
    let stateReads = 0;
    let startCalls = 0;
    const initialState = await api.loadState();
    server.use(
      http.get(apiPath('API-002'), () => {
        stateReads += 1;
        return HttpResponse.json(initialState, { headers: { ETag: '"fresh-state"' } });
      }),
      http.post(apiPath('API-004'), ({ request }) => {
        startCalls += 1;
        startKeys.push(request.headers.get('idempotency-key') ?? '');
        ifMatches.push(request.headers.get('if-match') ?? '');
        if (startCalls === 1) {
          return HttpResponse.json(
            { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"fresh-state"' } },
            { status: 409 },
          );
        }
        return HttpResponse.json(levelPlay(), {
          headers: {
            ETag: '"started"',
            'Idempotency-Key-Status': 'replayed',
          },
        });
      }),
    );

    await api.enterLevel(initialState);

    expect(stateReads).toBe(1);
    expect(startKeys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(startKeys[1]).toBe(startKeys[0]);
    expect(ifMatches).toEqual(['"p1-1"', '"fresh-state"']);
  });

  it('re-reads the active level and retries API-007 with the same key after a conflict', async () => {
    const api = createP1Api();
    const state = asInProgress(await api.loadState());
    const hintKeys: string[] = [];
    let hintCalls = 0;
    let resumeCalls = 0;
    server.use(
      http.post(apiPath('API-007'), ({ request }) => {
        hintCalls += 1;
        hintKeys.push(request.headers.get('idempotency-key') ?? '');
        if (hintCalls === 1) {
          return HttpResponse.json(
            { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"level-fresh"' } },
            { status: 409 },
          );
        }
        return HttpResponse.json(
          {
            hintBalance: 4,
            knowledgePoints: 0,
            revealedCells: [{ row: 0, col: 0 }],
            foundTargets: [],
            targetsRemaining: 1,
            levelCompleted: false,
            nextAction: NextAction.Play,
          },
          {
            headers: {
              ETag: '"hint-success"',
              'Idempotency-Key-Status': 'replayed',
            },
          },
        );
      }),
      http.get(apiPath('API-005'), () => {
        resumeCalls += 1;
        return HttpResponse.json(levelPlay(), { headers: { ETag: '"level-fresh"' } });
      }),
    );

    const response = await api.useHint(state.clientState.inProgressLevel!.levelId);

    expect(response.revealedCells).toEqual([{ row: 0, col: 0 }]);
    expect(resumeCalls).toBe(1);
    expect(hintKeys[1]).toBe(hintKeys[0]);
  });

  it('передаёт новые поля API-007 без потери hint state в transport boundary', async () => {
    const api = createP1Api();
    await api.loadState();
    const payload: HintUseResponse = {
      hintBalance: 4,
      knowledgePoints: 0,
      revealedCells: [{ row: 1, col: 4 }],
      foundTargets: [],
      targetsRemaining: 7,
      levelCompleted: false,
      nextAction: NextAction.Play,
      hintTarget: {
        targetId: TARGET_FUND_ID,
        revealedCells: [{ row: 1, col: 4 }],
      },
    };
    server.use(
      http.post(apiPath('API-007'), () =>
        HttpResponse.json(payload, { headers: { ETag: '"hint-p3"' } }),
      ),
    );

    const response = await api.useHint(LEVEL_ID);

    expect(response.hintTarget).toEqual({
      targetId: TARGET_FUND_ID,
      revealedCells: [{ row: 1, col: 4 }],
    } satisfies HintState);
  });

  it('does not call route submission, results, or reward claim during the P2 game entry and hint flow', async () => {
    const forbiddenCalls: string[] = [];
    server.use(
      http.post('/api/v1/levels/:levelId/routes', () => {
        forbiddenCalls.push('API-006');
        return HttpResponse.json({ type: 'UNEXPECTED_CALL' }, { status: 500 });
      }),
      http.get('/api/v1/levels/:levelId/results', () => {
        forbiddenCalls.push('API-008');
        return HttpResponse.json({ type: 'UNEXPECTED_CALL' }, { status: 500 });
      }),
      http.post('/api/v1/rewards/:rewardId/claim', () => {
        forbiddenCalls.push('API-009');
        return HttpResponse.json({ type: 'UNEXPECTED_CALL' }, { status: 500 });
      }),
    );
    const api = createP1Api();
    const state = await api.loadState();

    const activeLevel = await api.enterLevel(state);
    await api.useHint(activeLevel.levelId);

    expect(forbiddenCalls).toEqual([]);
  });
});

describe('P4 API-008/API-009 results and reward contract', () => {
  it('reads API-008 without mutation headers, returns the body, and feeds its ETag to API-009', async () => {
    const api = createP1Api();
    const result = levelResults({ nextAction: NextAction.ClaimReward });
    let claimBody: unknown;
    let claimKey = '';
    let claimIfMatch = '';
    server.use(
      http.get(apiPath('API-008'), ({ request }) => {
        expect(request.headers.get('if-match')).toBeNull();
        expect(request.headers.get('idempotency-key')).toBeNull();
        return HttpResponse.json(result, { headers: { ETag: '"results-v4"' } });
      }),
      http.post(apiPathFor('API-009', { rewardId: REWARD_ID }), async ({ request }) => {
        claimBody = await request.json();
        claimKey = request.headers.get('idempotency-key') ?? '';
        claimIfMatch = request.headers.get('if-match') ?? '';
        return HttpResponse.json(claimResponse(), {
          headers: {
            ETag: '"claim-v4"',
            'Idempotency-Key-Status': 'replayed',
          },
        });
      }),
    );

    await expect(api.getLevelResults(LEVEL_ID)).resolves.toEqual(result);

    const body: ClaimRewardRequest = {
      rewardType: 'hint',
    };
    await expect(api.claimReward(REWARD_ID, body, new AbortController().signal)).resolves.toEqual(
      claimResponse(),
    );
    expect(claimBody).toEqual(body);
    expect(claimKey).toMatch(/^[0-9a-f-]{36}$/);
    expect(claimIfMatch).toBe('"results-v4"');
  });

  it('preserves optional courseOffer on API-008 targets and omits it for unlinked targets', async () => {
    const api = createP1Api();
    const result = levelResults({
      foundTargets: [API008_FOUND_TARGET_WITH_OFFER, API008_FOUND_TARGET_WITHOUT_OFFER],
    });
    server.use(
      http.get(apiPath('API-008'), () =>
        HttpResponse.json(result, { headers: { ETag: '"results-v4"' } }),
      ),
    );

    const response = await api.getLevelResults(LEVEL_ID);
    const linkedTarget = response.foundTargets[0];
    const unlinkedTarget = response.foundTargets[1];

    expect(linkedTarget && hasCourseOffer(linkedTarget)).toBe(true);
    if (!linkedTarget || !hasCourseOffer(linkedTarget)) {
      throw new Error('API-008 linked target must contain courseOffer');
    }
    expect(linkedTarget.courseOffer).toEqual(COURSE_OFFER);
    expect(linkedTarget.courseOffer.courseId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(linkedTarget.courseOffer.locale).toBe('ru-RU');
    expect(unlinkedTarget && hasCourseOffer(unlinkedTarget)).toBe(false);
  });

  it('forwards API-008 abort while the request is in flight', async () => {
    const api = createP1Api();
    const controller = new AbortController();
    let resolveStarted!: () => void;
    let releaseHandler!: () => void;
    let handlerFinished = false;
    let resolveFinished!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });

    server.use(
      http.get(apiPath('API-008'), async ({ request }) => {
        resolveStarted();
        await new Promise<void>((resolve) => {
          releaseHandler = resolve;
          request.signal.addEventListener('abort', () => resolve(), { once: true });
        });
        handlerFinished = true;
        resolveFinished();
        return HttpResponse.json(levelResults(), { headers: { ETag: '"aborted"' } });
      }),
    );

    try {
      const request = api.getLevelResults(LEVEL_ID, controller.signal);
      await started;
      controller.abort();

      await expect(request).rejects.toBeDefined();
      // Axios cancellation rejects the client promise before MSW finishes its
      // pending resolver; the handler must still be in-flight at that point.
      expect(handlerFinished).toBe(false);
      releaseHandler();
      await finished;
      expect(handlerFinished).toBe(true);
    } finally {
      releaseHandler?.();
    }
  });

  it('retries API-009 after STATE_VERSION_CONFLICT only for an exact available pendingReward, reusing the same key', async () => {
    const api = createP1Api();
    const initial = await api.loadState();
    const pending = stateWithPendingReward(initial, {
      pendingRewardId: REWARD_ID,
      availableRewardId: REWARD_ID,
    });
    const keys: string[] = [];
    const ifMatches: string[] = [];
    let claimCalls = 0;
    let stateReads = 0;
    server.use(
      http.get(apiPath('API-002'), () => {
        stateReads += 1;
        return HttpResponse.json(pending, { headers: { ETag: '"refresh-v4"' } });
      }),
      http.get(apiPath('API-008'), () =>
        HttpResponse.json(levelResults({ nextAction: NextAction.ClaimReward }), {
          headers: { ETag: '"results-v4"' },
        }),
      ),
      http.post(apiPathFor('API-009', { rewardId: REWARD_ID }), ({ request }) => {
        claimCalls += 1;
        keys.push(request.headers.get('idempotency-key') ?? '');
        ifMatches.push(request.headers.get('if-match') ?? '');
        if (claimCalls === 1) {
          return HttpResponse.json(
            { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"refresh-v4"' } },
            { status: 409 },
          );
        }
        return HttpResponse.json(claimResponse(), {
          headers: { ETag: '"claim-v4"', 'Idempotency-Key-Status': 'processed' },
        });
      }),
    );

    await api.loadState();
    await api.getLevelResults(LEVEL_ID);
    const refreshesBeforeClaim = stateReads;
    await expect(
      api.claimReward(REWARD_ID, {
        rewardType: 'hint',
      }),
    ).resolves.toMatchObject({ rewardId: REWARD_ID, nextAction: NextAction.StartLevel });

    expect(stateReads).toBe(refreshesBeforeClaim + 1);
    expect(claimCalls).toBe(2);
    expect(keys[1]).toBe(keys[0]);
    expect(ifMatches).toEqual(['"results-v4"', '"refresh-v4"']);
  });

  it.each([
    ['missing pendingReward', (state: ClientStateResponse) => stateWithPendingReward(state, {
      availableRewardId: REWARD_ID,
    })],
    ['mismatched pendingReward', (state: ClientStateResponse) => stateWithPendingReward(state, {
      pendingRewardId: '8f8fad5b-d9cb-469f-a165-808677289599',
      availableRewardId: REWARD_ID,
    })],
    ['unavailable exact reward', (state: ClientStateResponse) => stateWithPendingReward(state, {
      pendingRewardId: REWARD_ID,
    })],
    ['legacy pendingResults', (state: ClientStateResponse) => stateWithPendingResults(state)],
  ])('does not retry API-009 for %s', async (_, makeRefreshedState) => {
    const api = createP1Api();
    const initial = await api.loadState();
    const refreshed = makeRefreshedState(initial);
    let claimCalls = 0;
    let refreshCalls = 0;
    server.use(
      http.get(apiPath('API-002'), () => {
        refreshCalls += 1;
        return HttpResponse.json(refreshed, { headers: { ETag: '"other-reward"' } });
      }),
      http.get(apiPath('API-008'), () =>
        HttpResponse.json(levelResults({ nextAction: NextAction.ClaimReward }), {
          headers: { ETag: '"results-v4"' },
        }),
      ),
      http.post(apiPathFor('API-009', { rewardId: REWARD_ID }), () => {
        claimCalls += 1;
        return HttpResponse.json(
          { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"other-reward"' } },
          { status: 409 },
        );
      }),
    );

    await api.loadState();
    await api.getLevelResults(LEVEL_ID);
    const refreshesBeforeClaim = refreshCalls;
    await expect(
      api.claimReward(REWARD_ID, {
        rewardType: 'hint',
      }),
    ).rejects.toMatchObject({ type: 'STATE_VERSION_CONFLICT' });
    expect(claimCalls).toBe(1);
    // One refresh validates that the pending reward changed; no retry request follows it.
    expect(refreshCalls).toBe(refreshesBeforeClaim + 1);
  });
});

describe('P4 API-017 results acknowledgement contract', () => {
  it('posts API-017 without a body, sends If-Match and a stable key, stores the new ETag, and passes replay through', async () => {
    const api = p4Api();
    const keys: string[] = [];
    const bodies: string[] = [];
    const ifMatches: string[] = [];
    server.use(
      http.get(apiPath('API-008'), () =>
        HttpResponse.json(levelResults(), { headers: { ETag: '"results-v4"' }}),
      ),
      http.post(API017_PATH, async ({ request }) => {
        keys.push(request.headers.get('idempotency-key') ?? '');
        ifMatches.push(request.headers.get('if-match') ?? '');
        bodies.push(await request.text());
        return HttpResponse.json(acknowledgeResponse(), {
          headers: { ETag: '"ack-v4"', 'Idempotency-Key-Status': 'replayed' },
        });
      }),
    );

    await api.getLevelResults(LEVEL_ID);
    await expect(api.acknowledgeLevelResults(LEVEL_ID)).resolves.toEqual(
      acknowledgeResponse(),
    );

    expect(bodies).toEqual(['']);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ifMatches).toEqual(['"results-v4"']);
  });

  it('refreshes API-002 once and retries API-017 with the same key only for the same pending level', async () => {
    const api = p4Api();
    const initial = await api.loadState();
    const pending = {
      ...initial,
      clientState: {
        ...initial.clientState,
        pendingResults: { levelId: LEVEL_ID } satisfies PendingResults,
      },
    };
    const keys: string[] = [];
    const ifMatches: string[] = [];
    let acknowledgeCalls = 0;
    let stateReads = 0;
    server.use(
      http.get(apiPath('API-002'), () => {
        stateReads += 1;
        return HttpResponse.json(pending, { headers: { ETag: '"fresh-results"' } });
      }),
      http.get(apiPath('API-008'), () =>
        HttpResponse.json(levelResults(), { headers: { ETag: '"results-v4"' }}),
      ),
      http.post(API017_PATH, ({ request }) => {
        acknowledgeCalls += 1;
        keys.push(request.headers.get('idempotency-key') ?? '');
        ifMatches.push(request.headers.get('if-match') ?? '');
        if (acknowledgeCalls === 1) {
          return HttpResponse.json(
            { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"fresh-results"' } },
            { status: 409 },
          );
        }
        return HttpResponse.json(acknowledgeResponse(), {
          headers: { ETag: '"ack-v4"', 'Idempotency-Key-Status': 'replayed' },
        });
      }),
    );

    await api.loadState();
    await api.getLevelResults(LEVEL_ID);
    const refreshesBeforeAcknowledge = stateReads;
    await expect(api.acknowledgeLevelResults(LEVEL_ID)).resolves.toMatchObject({
      resultsState: 'acknowledged',
    });

    expect(stateReads).toBe(refreshesBeforeAcknowledge + 1);
    expect(acknowledgeCalls).toBe(2);
    expect(keys[1]).toBe(keys[0]);
    expect(ifMatches).toEqual(['"results-v4"', '"fresh-results"']);
  });

  it('does not retry terminal API-017 conflicts', async () => {
    const api = p4Api();
    await api.loadState();
    let acknowledgeCalls = 0;
    server.use(
      http.post(API017_PATH, () => {
        acknowledgeCalls += 1;
        return HttpResponse.json(
          { type: 'RESULTS_ALREADY_ACKNOWLEDGED' },
          { status: 409 },
        );
      }),
    );

    await expect(api.acknowledgeLevelResults(LEVEL_ID)).rejects.toMatchObject({
      type: 'RESULTS_ALREADY_ACKNOWLEDGED',
    });
    expect(acknowledgeCalls).toBe(1);
  });

  it('forwards API-017 abort while acknowledgement is in flight', async () => {
    const api = p4Api();
    await api.loadState();
    const controller = new AbortController();
    let releaseHandler!: () => void;
    let handlerFinished = false;
    server.use(
      http.post(API017_PATH, async () => {
        await new Promise<void>((resolve) => {
          releaseHandler = resolve;
        });
        handlerFinished = true;
        return HttpResponse.json(acknowledgeResponse());
      }),
    );

    try {
      const request = api.acknowledgeLevelResults(LEVEL_ID, controller.signal);
      controller.abort();
      await expect(request).rejects.toBeDefined();
      expect(handlerFinished).toBe(false);
      releaseHandler();
    } finally {
      releaseHandler?.();
    }
  });
});

describe('P1 API submitRoute contract', () => {
  const route: CellRef[] = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
  ];

  it('submits a route via API-006 with If-Match and a stable Idempotency-Key', async () => {
    const api = createP1Api();
    await api.loadState();
    const bodies: unknown[] = [];
    const keys: string[] = [];
    const ifMatches: string[] = [];
    server.use(
      http.post(apiPath('API-006'), async ({ request }) => {
        bodies.push(await request.json());
        keys.push(request.headers.get('idempotency-key') ?? '');
        ifMatches.push(request.headers.get('if-match') ?? '');
        return HttpResponse.json(
          { found: true, word: 'ДОМ', targetsRemaining: 0 },
          { headers: { ETag: '"route-ok"', 'Idempotency-Key-Status': 'created' } },
        );
      }),
    );

    const response = await api.submitRoute(LEVEL_ID, route);

    expect(bodies).toEqual([{ route }]);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ifMatches).toEqual(['"p1-1"']);
    expect(response).toMatchObject({ found: true, word: 'ДОМ' });
  });

  it('передаёт API-006 invalid outcomeCode с единственным nextAction=play', async () => {
    const api = createP1Api();
    await api.loadState();
    const payload: RouteSubmissionResponse = {
      result: RouteSubmissionResponseResultEnum3.Invalid,
      levelCompleted: false,
      newFoundTargets: [],
      newBonusWords: [],
      nextAction: NextAction.Play,
      outcomeCode: RouteSubmissionResponseOutcomeCodeEnum.TARGET_NONCANONICAL_PATH,
    };
    server.use(
      http.post(apiPath('API-006'), () =>
        HttpResponse.json(payload, { headers: { ETag: '"route-p3"' } }),
      ),
    );

    const response = await api.submitRoute(LEVEL_ID, route);

    expect(response.outcomeCode).toBe(RouteSubmissionResponseOutcomeCodeEnum.TARGET_NONCANONICAL_PATH);
    expect(response.nextAction).toBe(NextAction.Play);
    expect(response.rewardOpened).toBeUndefined();
  });

  it('передаёт API-006 found bonus с rewardOpened и nextAction=claim_reward', async () => {
    const api = createP1Api();
    await api.loadState();
    const payload: RouteSubmissionResponse = {
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: false,
      word: 'ЛАПА',
      targetsRemaining: 7,
      levelCompleted: false,
      newFoundTargets: [],
      newBonusWords: [{ word: 'ЛАПА', foundAt: '2026-08-21T12:02:00.000Z' }],
      knowledgePoints: 13,
      hintBalance: 5,
      nextAction: NextAction.ClaimReward,
      rewardOpened: {
        rewardId: REWARD_ID,
        rewardType: 'regular',
        status: 'available',
        progress: { current: 4, threshold: 4 },
        options: NORMALIZED_REWARD_OPTIONS,
      },
    };
    server.use(
      http.post(apiPath('API-006'), () =>
        HttpResponse.json(payload, { headers: { ETag: '"route-reward-opened"' } }),
      ),
    );

    const response = await api.submitRoute(LEVEL_ID, route);

    expect(response.result).toBe(RouteSubmissionResponseResultEnum3.Found);
    expect(response.isTarget).toBe(false);
    expect(response.rewardOpened).toEqual(payload.rewardOpened);
    expect(response.nextAction).toBe(NextAction.ClaimReward);
  });

  it.each(['API-006', 'API-007'])(
    'не ретраит %s при REWARD_PENDING_CLAIM и сохраняет исходный 409 conflict',
    async (apiId) => {
      const api = createP1Api();
      await api.loadState();
      let mutationCalls = 0;
      let resumeCalls = 0;
      server.use(
        http.post(apiPath(apiId), () => {
          mutationCalls += 1;
          return HttpResponse.json({ type: 'REWARD_PENDING_CLAIM' }, { status: 409 });
        }),
        http.get(apiPath('API-005'), () => {
          resumeCalls += 1;
          return HttpResponse.json(levelPlay());
        }),
      );

      const request = apiId === 'API-006'
        ? api.submitRoute(LEVEL_ID, route)
        : api.useHint(LEVEL_ID);
      await expect(request).rejects.toMatchObject({ type: 'REWARD_PENDING_CLAIM' });
      expect(mutationCalls).toBe(1);
      expect(resumeCalls).toBe(0);
    },
  );

  it('passes through a replayed response without re-mutating at the caller layer', async () => {
    const api = createP1Api();
    await api.loadState();
    let routeCalls = 0;
    server.use(
      http.post(apiPath('API-006'), () => {
        routeCalls += 1;
        return HttpResponse.json(
          { found: true, word: 'ДОМ', targetsRemaining: 0 },
          { headers: { ETag: '"route-ok"', 'Idempotency-Key-Status': 'replayed' } },
        );
      }),
    );

    const response = await api.submitRoute(LEVEL_ID, route);

    expect(routeCalls).toBe(1);
    expect(response).toMatchObject({ found: true, word: 'ДОМ' });
  });

  it('re-reads the level and retries API-006 with the same key after a version conflict', async () => {
    const api = createP1Api();
    await api.loadState();
    const routeKeys: string[] = [];
    let routeCalls = 0;
    let resumeCalls = 0;
    server.use(
      http.post(apiPath('API-006'), async ({ request }) => {
        routeCalls += 1;
        routeKeys.push(request.headers.get('idempotency-key') ?? '');
        if (routeCalls === 1) {
          return HttpResponse.json(
            { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"level-fresh"' } },
            { status: 409 },
          );
        }
        return HttpResponse.json(
          { found: true, word: 'ДОМ', targetsRemaining: 0 },
          { headers: { ETag: '"route-ok"', 'Idempotency-Key-Status': 'created' } },
        );
      }),
      http.get(apiPath('API-005'), () => {
        resumeCalls += 1;
        return HttpResponse.json(levelPlay(), { headers: { ETag: '"level-fresh"' } });
      }),
    );

    const response = await api.submitRoute(LEVEL_ID, route);

    expect(resumeCalls).toBe(1);
    expect(routeKeys[1]).toBe(routeKeys[0]);
    expect(response).toMatchObject({ found: true });
  });

  it('does not retry API-006 when the level is no longer in progress', async () => {
    const api = createP1Api();
    await api.loadState();
    let routeCalls = 0;
    server.use(
      http.post(apiPath('API-006'), () => {
        routeCalls += 1;
        return HttpResponse.json(
          { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"level-fresh"' } },
          { status: 409 },
        );
      }),
      http.get(apiPath('API-005'), () =>
        HttpResponse.json(levelPlay({ targetsRemaining: 0 }), {
          headers: { ETag: '"level-fresh"' },
        }),
      ),
    );

    await expect(api.submitRoute(LEVEL_ID, route)).rejects.toMatchObject({
      type: 'LEVEL_NOT_IN_PROGRESS',
    });
    expect(routeCalls).toBe(1);
  });

  it('does not auto-retry IDEMPOTENCY_KEY_REUSED', async () => {
    const api = createP1Api();
    await api.loadState();
    let routeCalls = 0;
    let resumeCalls = 0;
    server.use(
      http.post(apiPath('API-006'), () => {
        routeCalls += 1;
        return HttpResponse.json(
          { type: 'IDEMPOTENCY_KEY_REUSED', payload: {} },
          { status: 409 },
        );
      }),
      http.get(apiPath('API-005'), () => {
        resumeCalls += 1;
        return HttpResponse.json(levelPlay());
      }),
    );

    await expect(api.submitRoute(LEVEL_ID, route)).rejects.toMatchObject({
      type: 'IDEMPOTENCY_KEY_REUSED',
    });
    expect(routeCalls).toBe(1);
    expect(resumeCalls).toBe(0);
  });

  it('does not auto-retry a terminal business conflict', async () => {
    const api = createP1Api();
    await api.loadState();
    let routeCalls = 0;
    server.use(
      http.post(apiPath('API-006'), () => {
        routeCalls += 1;
        return HttpResponse.json(
          { type: 'ROUTE_NOT_APPLICABLE', payload: {} },
          { status: 409 },
        );
      }),
    );

    await expect(api.submitRoute(LEVEL_ID, route)).rejects.toMatchObject({
      type: 'ROUTE_NOT_APPLICABLE',
    });
    expect(routeCalls).toBe(1);
  });

  it('forwards an abort signal to the route submission request', async () => {
    const api = createP1Api();
    await api.loadState();
    const controller = new AbortController();
    server.use(
      http.post(apiPath('API-006'), () =>
        HttpResponse.json(
          { found: true, word: 'ДОМ', targetsRemaining: 0 },
          { headers: { ETag: '"route-ok"' } },
        ),
      ),
    );

    await expect(
      api.submitRoute(LEVEL_ID, route, controller.signal),
    ).resolves.toMatchObject({ found: true });
  });
});

describe('P5 API-013 и mutation generation contract', () => {
  const feedback = {
    source: 'settings' as const,
    rating: 5,
    comment: 'Понятный и полезный уровень',
  };

  const feedbackResponse = {
    feedbackId: '6f8fad5b-d9cb-469f-a165-808677289550',
    status: 'submitted',
    nextAction: NextAction.None,
  };

  it('повторяет API-013 после неоднозначного transport failure с тем же ключом, а изменённая форма получает новый intent', async () => {
    const api = createP1Api();
    await api.loadState();
    const keys: string[] = [];
    let calls = 0;

    server.use(
      http.post(apiPath('API-013'), ({ request }) => {
        calls += 1;
        keys.push(request.headers.get('idempotency-key') ?? '');
        if (calls === 1) return HttpResponse.error();
        return HttpResponse.json(feedbackResponse, {
          headers: { ETag: `"feedback-${calls}"` },
        });
      }),
    );

    await expect(api.submitFeedback(feedback)).rejects.toBeDefined();
    await expect(api.submitFeedback(feedback)).resolves.toEqual(feedbackResponse);
    await expect(api.submitFeedback({ ...feedback, comment: 'Изменённая оценка' }))
      .resolves.toEqual(feedbackResponse);

    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(keys[2]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('не даёт устаревшему ответу superseded intent перезаписать ETag нового ответа', async () => {
    const api = createP1Api();
    await api.loadState();
    const keys: string[] = [];
    const ifMatches: string[] = [];
    let calls = 0;
    let releaseFirst!: () => void;
    let resolveFirstStarted!: () => void;
    const firstStarted = new Promise<void>((resolve) => {
      resolveFirstStarted = resolve;
    });
    const firstReleased = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    server.use(
      http.post(apiPath('API-013'), async ({ request }) => {
        calls += 1;
        keys.push(request.headers.get('idempotency-key') ?? '');
        ifMatches.push(request.headers.get('if-match') ?? '');
        if (calls === 1) {
          resolveFirstStarted();
          await firstReleased;
          return HttpResponse.json(feedbackResponse, {
            headers: { ETag: '"stale-generation"' },
          });
        }
        return HttpResponse.json(feedbackResponse, {
          headers: { ETag: calls === 2 ? '"newer-generation"' : '"final"' },
        });
      }),
    );

    const first = api.submitFeedback(feedback);
    await firstStarted;
    await expect(api.submitFeedback({ ...feedback, comment: 'Новая форма' }))
      .resolves.toEqual(feedbackResponse);

    releaseFirst();
    await expect(first).rejects.toBeDefined();

    await api.submitFeedback({ ...feedback, comment: 'Проверка актуального ETag' });

    expect(keys[1]).not.toBe(keys[0]);
    expect(ifMatches[2]).toBe('"newer-generation"');
  });
});

describe('P5 API-017 timeout idempotency contract', () => {
  it('сохраняет API-017 ключ после aborted transport attempt для повторного вызова', async () => {
    const api = createP1Api();
    await api.loadState();
    const controller = new AbortController();
    const keys: string[] = [];
    let calls = 0;
    let resolveStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });

    server.use(
      http.post(API017_PATH, async ({ request }) => {
        calls += 1;
        keys.push(request.headers.get('idempotency-key') ?? '');
        if (calls === 1) {
          resolveStarted();
          await new Promise<void>((resolve) => {
            request.signal.addEventListener('abort', () => resolve(), { once: true });
          });
        }
        return HttpResponse.json(acknowledgeResponse(), {
          headers: { ETag: `"ack-timeout-${calls}"` },
        });
      }),
    );

    const first = api.acknowledgeLevelResults(LEVEL_ID, controller.signal);
    await started;
    controller.abort();
    await expect(first).rejects.toBeDefined();
    await expect(api.acknowledgeLevelResults(LEVEL_ID)).resolves.toEqual(acknowledgeResponse());

    expect(keys[1]).toBe(keys[0]);
  });
});

describe('Stage 2 API-003 narrative confirmation', () => {
  type NarrativeApi = P1Api & {
    confirmNarrativeShown(
      chapterId: string,
      state: ClientStateResponse,
    ): Promise<{ chapterId: string; isNarrativeShown: boolean; nextAction: NextAction }>;
  };

  it('sends the write-once mutation with Idempotency-Key and If-Match', async () => {
    const api = createP1Api() as NarrativeApi;
    const initial = await api.loadState();
    const headers: Array<[string | null, string | null]> = [];
    server.use(
      http.post(apiPathFor('API-003', { chapterId: CHAPTER_ID }), ({ request }) => {
        headers.push([
          request.headers.get('idempotency-key'),
          request.headers.get('if-match'),
        ]);
        return HttpResponse.json({
          chapterId: CHAPTER_ID,
          isNarrativeShown: true,
          nextAction: NextAction.StartLevel,
        }, { headers: { ETag: '"narrative-2"' } });
      }),
    );

    await expect(api.confirmNarrativeShown(CHAPTER_ID, initial)).resolves.toMatchObject({
      chapterId: CHAPTER_ID,
      isNarrativeShown: true,
      nextAction: NextAction.StartLevel,
    });
    expect(headers).toHaveLength(1);
    expect(headers[0][0]).toBeTruthy();
    expect(headers[0][1]).toBe('"p1-1"');
  });

  it('re-reads state on STATE_VERSION_CONFLICT and treats an authoritative shown flag as success', async () => {
    const api = createP1Api() as NarrativeApi;
    const initial = await api.loadState();
    let posts = 0;
    server.use(
      http.post(apiPathFor('API-003', { chapterId: CHAPTER_ID }), () => {
        posts += 1;
        return HttpResponse.json(
          { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"narrative-current"' } },
          { status: 409, headers: { ETag: '"narrative-current"' } },
        );
      }),
      http.get(apiPath('API-002'), () => HttpResponse.json({
        ...initial,
        clientState: {
          ...initial.clientState,
          chapters: initial.clientState.chapters.map((chapter) =>
            chapter.chapterId === CHAPTER_ID
              ? { ...chapter, isNarrativeShown: true, narrativeText: undefined }
              : chapter,
          ),
          nextAction: NextAction.StartLevel,
        },
      }, { headers: { ETag: '"narrative-current"' } })),
    );

    await expect(api.confirmNarrativeShown(CHAPTER_ID, initial)).resolves.toEqual({
      chapterId: CHAPTER_ID,
      isNarrativeShown: true,
      nextAction: NextAction.StartLevel,
    });
    expect(posts).toBe(1);
  });

  it('surfaces CHAPTER_LOCKED by ProblemDetails.type without retrying', async () => {
    const api = createP1Api() as NarrativeApi;
    const initial = await api.loadState();
    let posts = 0;
    server.use(
      http.post(apiPathFor('API-003', { chapterId: CHAPTER_ID }), () => {
        posts += 1;
        return HttpResponse.json({ type: 'CHAPTER_LOCKED' }, { status: 409 });
      }),
    );

    await expect(api.confirmNarrativeShown(CHAPTER_ID, initial))
      .rejects.toMatchObject({ type: 'CHAPTER_LOCKED' });
    expect(posts).toBe(1);
  });
});

describe('Stage 4 API-013/API-014 feedback lifecycle', () => {
  it('registers API-014 as a conditional idempotent mutation', () => {
    expect(operationRegistry).toContainEqual(expect.objectContaining({
      apiId: 'API-014',
      operationId: 'dismissFeedback',
      method: 'POST',
      templatePath: '/api/v1/chapters/{chapterId}/feedback-prompt/dismiss',
      mutation: true,
      ifMatch: true,
    }));
  });

  it('preserves chapterId for chapter_completion and omits it for settings feedback', async () => {
    const api = createP1Api();
    await api.loadState();
    const bodies: unknown[] = [];
    server.use(
      http.post('/api/v1/feedbacks', async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json({
          feedbackId: '6f8fad5b-d9cb-469f-a165-808677289550',
          status: 'submitted',
          nextAction: NextAction.NextChapter,
        }, { headers: { ETag: `"feedback-${bodies.length}"` } });
      }),
    );

    await api.submitFeedback({
      source: 'chapter_completion',
      chapterId: CHAPTER_ID,
      rating: 5,
      comment: ' Полезно ',
    });
    await api.submitFeedback({
      source: 'settings',
      rating: 4,
      chapterId: CHAPTER_ID,
    });

    expect(bodies).toEqual([
      { source: 'chapter_completion', chapterId: CHAPTER_ID, rating: 5, comment: 'Полезно' },
      { source: 'settings', rating: 4 },
    ]);
  });

  it('dismisses automatic feedback with no body and mutation headers', async () => {
    const api = createP1Api() as P1Api & {
      dismissFeedback(chapterId: string): Promise<{
        chapterId: string;
        feedbackPromptShownAt: string;
        nextAction: NextAction;
      }>;
    };
    await api.loadState();
    const calls: Array<{ body: string; idempotencyKey: string | null; ifMatch: string | null }> = [];
    server.use(
      http.post(`/api/v1/chapters/${CHAPTER_ID}/feedback-prompt/dismiss`, async ({ request }) => {
        calls.push({
          body: await request.text(),
          idempotencyKey: request.headers.get('idempotency-key'),
          ifMatch: request.headers.get('if-match'),
        });
        return HttpResponse.json({
          chapterId: CHAPTER_ID,
          feedbackPromptShownAt: '2026-09-03T12:00:00.000Z',
          nextAction: NextAction.NextChapter,
        }, { headers: { ETag: '"feedback-dismissed"' } });
      }),
    );

    await expect(api.dismissFeedback(CHAPTER_ID)).resolves.toMatchObject({
      chapterId: CHAPTER_ID,
      nextAction: NextAction.NextChapter,
    });
    expect(calls).toEqual([{
      body: '',
      idempotencyKey: expect.stringMatching(/^[0-9a-f-]{36}$/),
      ifMatch: '"p1-1"',
    }]);
  });

  it('re-reads API-002 once and retries API-014 with the same key after STATE_VERSION_CONFLICT', async () => {
    const api = createP1Api();
    const initial = await api.loadState();
    const keys: string[] = [];
    const ifMatches: string[] = [];
    let stateReads = 0;
    let dismissCalls = 0;
    server.use(
      http.get(apiPathFor('API-002', {}), () => {
        stateReads += 1;
        return HttpResponse.json(initial, { headers: { ETag: '"feedback-fresh"' } });
      }),
      http.post(`/api/v1/chapters/${CHAPTER_ID}/feedback-prompt/dismiss`, ({ request }) => {
        dismissCalls += 1;
        keys.push(request.headers.get('idempotency-key') ?? '');
        ifMatches.push(request.headers.get('if-match') ?? '');
        if (dismissCalls === 1) {
          return HttpResponse.json(
            { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: '"feedback-fresh"' } },
            { status: 409 },
          );
        }
        return HttpResponse.json({
          chapterId: CHAPTER_ID,
          feedbackPromptShownAt: '2026-09-03T12:00:00.000Z',
          nextAction: NextAction.NextChapter,
        }, {
          headers: {
            ETag: '"feedback-dismissed"',
            'Idempotency-Key-Status': 'replayed',
          },
        });
      }),
    );

    await expect(api.dismissFeedback(CHAPTER_ID)).resolves.toMatchObject({
      chapterId: CHAPTER_ID,
      nextAction: NextAction.NextChapter,
    });
    expect(stateReads).toBe(1);
    expect(dismissCalls).toBe(2);
    expect(keys[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(ifMatches).toEqual(['"p1-1"', '"feedback-fresh"']);
  });
});
