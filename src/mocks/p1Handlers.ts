import { http, HttpResponse } from 'msw';
import type { JsonBodyType } from 'msw';
import type {
  Appearance,
  AppearanceCatalogResponse,
  AcknowledgeLevelResultsResponse,
  CellRef,
  ClaimRewardResponse,
  ClientStateResponse,
  CourseOffer,
  FoundTarget,
  HintUseResponse,
  LevelPlayResponse,
  LevelResultsResponse,
  RewardSummary,
  RouteSubmissionRequest,
  SelectAppearanceResponse,
  SettingsResponse,
  SubmitFeedbackResponse,
  UpdateSettingsRequest,
} from '../shared/demoTypes';
import {
  AppearanceRarityEnum,
  AppearanceTypeEnum,
  CellViewStateEnum,
  ChapterProgressStatusEnum,
  ClaimResultTypeEnum,
  ClaimRewardResponseStateEnum,
  AcknowledgeLevelResultsResponseResultsStateEnum,
  ClaimRewardResponseRewardTypeEnum,
  LevelPlayResponseStatusEnum,
  LevelResultsResponseCompletionKindEnum,
  LevelResultsResponseStatusEnum,
  LevelResultsResponseStatusEnum1,
  LevelResultsResponseResultsStateEnum,
  LevelProgressSummaryStatusEnum,
  NextAction,
  RewardSummaryStatusEnum,
  RewardSummaryStatusEnum1,
  RewardSummaryRewardTypeEnum,
  RewardOptionDecorationTypeEnum,
  RewardOptionOptionTypeEnum,
  SelectedOptionSelectedOptionTypeEnum,
  RouteSubmissionResponseResultEnum3,
  SelectAppearanceResponseTypeEnum,
  SubmitFeedbackResponseStatusEnum,
} from '../shared/demoTypes';
import { operationRegistry, toMswPath } from '../infra/api/operationRegistry';
import { LEVELS } from '../content/levels';
import { assetUrl } from '../shared/assetUrl';
import {
  createMockPersistence,
  type MockPersistence,
  type MockPersistenceRuntimeOptions,
} from './mockPersistence';

const CHARACTER_IDS = Array.from(
  { length: 8 },
  (_, index) => `1f8fad5b-d9cb-469f-a165-8086772895${10 + index}`,
);
const BACKGROUND_IDS = Array.from(
  { length: 6 },
  (_, index) => `2f8fad5b-d9cb-469f-a165-8086772895${20 + index}`,
);
const REWARD_ID = '3f8fad5b-d9cb-469f-a165-808677289530';
const CHAPTER_GOLDEN_REWARD_ID = 'af8fad5b-d9cb-469f-a165-8086772895aa';
const LEVEL_ID = '4f8fad5b-d9cb-469f-a165-808677289500';
const LEVEL_VERSION_ID = '5f8fad5b-d9cb-469f-a165-808677289513';
const LEVEL_GRID = LEVELS[1].grid;
const LEVEL1_COURSE_OFFER_TARGET_WORD = 'АКЦИЯ';
const LEVEL1_COURSE_OFFER: CourseOffer = {
  courseId: '6f8fad5b-d9cb-469f-a165-80867728951e',
  locale: 'ru-RU',
  badgeLabel: 'Мини-курс',
  title: 'АКЦИЯ',
};
const PERSISTED_STATE_KEY = 'finwords:p1-mock-backend:v1';
const PERSISTED_STATE_VERSION = 6;
const REGULAR_REWARD_THRESHOLDS = [4, 6, 8, 10] as const;

interface Level1Target {
  slug: string;
  targetId: string;
  word: string;
  definition: string;
  cells: CellRef[];
}

const LEVEL1_TARGET_API_IDS: Record<string, string> = {
  fund: '7f8fad5b-d9cb-469f-a165-808677289501',
  capital: '7f8fad5b-d9cb-469f-a165-808677289502',
  stock: '7f8fad5b-d9cb-469f-a165-808677289503',
  risk: '7f8fad5b-d9cb-469f-a165-808677289504',
  market: '7f8fad5b-d9cb-469f-a165-808677289505',
  index: '7f8fad5b-d9cb-469f-a165-808677289506',
  income: '7f8fad5b-d9cb-469f-a165-808677289507',
};

function cellIdToCellRef(cellId: string): CellRef {
  const [row, col] = cellId.split(':');
  return { row: Number(row) - 1, col: Number(col) - 1 };
}

const LEVEL1_TARGETS: Level1Target[] = LEVELS[1].targets.map((target) => ({
  slug: target.id,
  targetId: LEVEL1_TARGET_API_IDS[target.id]!,
  word: target.word,
  definition: target.definition,
  cells: target.path.map(cellIdToCellRef),
}));

const LEVEL1_BONUS_WORDS = LEVELS[1].bonusWords;

const chapterTitles = [
  'Финансовая подушка',
  'Финансовая подушка',
  'Морская торговля',
  'История капитала',
  'Мир бизнеса',
  'Акции и компании',
  'Финансовая свобода',
];
const chapterSizes = [9, 8, 7, 7, 7, 6, 6];
const characterTitles = [
  'Классический аналитик',
  'Риск-менеджер',
  'Штурман',
  'Исследователь',
  'Инвестор',
  'Авантюрист',
  'Капитан',
  'Адмирал',
];
const characterAssets = [
  'character-analyst.png',
  'character-risk-manager.png',
  'character-navigator.png',
  'character-researcher.png',
  'character-investor.png',
  'character-adventurer.png',
  'character-captain.png',
  'character-admiral.png',
];
const backgroundTitles = [
  'По умолчанию',
  'Каюта',
  'Порт',
  'Открытое море',
  'Деловая гавань',
  'Мостик',
];
const backgroundAssets = [
  'pattern-default.svg',
  'pattern-cabin.svg',
  'pattern-port.svg',
  'pattern-open-sea.svg',
  'pattern-business-harbor.svg',
  'pattern-bridge.svg',
];

function apiPath(apiId: string): string {
  const operation = operationRegistry.find((candidate) => candidate.apiId === apiId);
  if (!operation) throw new Error(`Missing operation ${apiId}`);
  return toMswPath(operation.templatePath);
}

function makeAppearances(): Appearance[] {
  const characters: Appearance[] = CHARACTER_IDS.map((appearanceId, index) => ({
    appearanceId,
    type: AppearanceTypeEnum.Character,
    rarity: index === 0 ? AppearanceRarityEnum.Base : AppearanceRarityEnum.Regular,
    title: characterTitles[index],
    description: 'Персонаж коллекции Финвордов',
    imageUrl: assetUrl(`assets/p1/${characterAssets[index]}`),
    isOwned: index < 2,
    isSelected: index === 0,
    ...(index < 2 ? { unlockedAt: '2026-08-20T08:00:00.000Z' } : {}),
  }));
  const backgrounds: Appearance[] = BACKGROUND_IDS.map((appearanceId, index) => ({
    appearanceId,
    type: AppearanceTypeEnum.Background,
    rarity: index === 0 ? AppearanceRarityEnum.Base : AppearanceRarityEnum.Regular,
    title: backgroundTitles[index],
    description: 'Фон коллекции Финвордов',
    imageUrl: assetUrl(`assets/p1/${backgroundAssets[index]}`),
    isOwned: index === 0,
    isSelected: index === 0,
    ...(index === 0 ? { unlockedAt: '2026-08-20T08:00:00.000Z' } : {}),
  }));
  return [...characters, ...backgrounds];
}

interface P1FakeDbOptions {
  pendingReward?: boolean;
  chapterCompletion?: boolean;
  hintBalance?: number;
  regularRewardCycle?: number;
  regularRewardProgress?: number;
  gameUnavailable?: boolean;
  clientNotFound?: boolean;
}

function regularRewardId(cycle: number): string {
  return cycle === 0
    ? REWARD_ID
    : `3f8fad5b-d9cb-469f-a165-8086772895${String(30 + cycle).padStart(2, '0')}`;
}

function regularRewardThreshold(cycle: number): number {
  return REGULAR_REWARD_THRESHOLDS[Math.min(cycle, REGULAR_REWARD_THRESHOLDS.length - 1)];
}

function makeCollectingRegularReward(cycle: number, current = 0): RewardSummary {
  return {
    rewardId: regularRewardId(cycle),
    rewardType: RewardSummaryRewardTypeEnum.Regular,
    status: RewardSummaryStatusEnum1.Collecting,
    progress: { current, threshold: regularRewardThreshold(cycle) },
  };
}

function makeAvailableRegularReward(cycle: number, current: number): RewardSummary {
  return {
    rewardId: regularRewardId(cycle),
    rewardType: RewardSummaryRewardTypeEnum.Regular,
    status: RewardSummaryStatusEnum.Available,
    availableAt: '2026-08-21T12:02:00.000Z',
    hintOptionAmount: 1,
    decorationOptionId: CHARACTER_IDS[2],
    progress: { current, threshold: regularRewardThreshold(cycle) },
    options: [
      {
        optionType: RewardOptionOptionTypeEnum.Hint,
        amount: 1,
        title: 'Подсказка',
      },
      {
        optionType: RewardOptionOptionTypeEnum.Decoration,
        optionId: CHARACTER_IDS[2],
        title: characterTitles[2],
        decorationType: RewardOptionDecorationTypeEnum.Character,
      },
    ],
  };
}

function makeClientState(options: P1FakeDbOptions = {}): ClientStateResponse {
  const regularCycle = options.regularRewardCycle ?? 0;
  const regularProgress = options.regularRewardProgress ?? 0;
  const levels = Array.from({ length: 50 }, (_, index) => ({
    levelId:
      index === 0
        ? LEVEL_ID
        : `4f8fad5b-d9cb-469f-a165-80867728${String(9500 + index)}`,
    status:
      index === 0
        ? LevelProgressSummaryStatusEnum.Available
        : LevelProgressSummaryStatusEnum.Locked,
  }));
  return {
    clientState: {
      clientView: {
        balance: { knowledgePoints: 0, hintBalance: options.hintBalance ?? 5 },
        settings: {
          musicEnabled: true,
          soundEnabled: true,
          tutorialCompleted: true,
        },
        selectedCharacterId: CHARACTER_IDS[0],
        selectedBackgroundId: BACKGROUND_IDS[0],
        campaignProgress: { isCompleted: false, isCompletionShown: false },
      },
      chapters: chapterTitles.map((title, index) => ({
        chapterId: `5f8fad5b-d9cb-469f-a165-80867728954${index}`,
        number: index + 1,
        title,
        imageUrl: assetUrl(`assets/p1/chapter-${String(index + 1).padStart(2, '0')}.png`),
        status:
          index === 0
            ? ChapterProgressStatusEnum.InProgress
            : ChapterProgressStatusEnum.Locked,
        completedLevels: index === 0 && options.chapterCompletion ? 8 : 0,
        totalLevels: chapterSizes[index],
        isNarrativeShown: true,
      })),
      levels,
      rewards: [
        options.pendingReward
          ? makeAvailableRegularReward(regularCycle, regularRewardThreshold(regularCycle))
          : makeCollectingRegularReward(regularCycle, regularProgress),
      ],
      ...(options.pendingReward ? { pendingReward: { rewardId: regularRewardId(regularCycle) } } : {}),
      nextAction: options.pendingReward ? NextAction.ClaimReward : NextAction.StartLevel,
    },
  };
}

let version = 1;
let state = makeClientState();
let appearances = makeAppearances();
let levelPlay: LevelPlayResponse | null = null;
let resultsSnapshot: LevelResultsResponse | null = null;
let resultsAcknowledgedAt: string | null = null;
let chapterCompletionScenario = false;
let gameUnavailableScenario = false;
let clientNotFoundScenario = false;
let claimedRewardIds = new Set<string>();
let regularRewardCycle = 0;

type ReplayApiId = 'bootstrap' | 'start-level' | 'submit-route' | 'use-hint' | 'submit-feedback' | 'acknowledge-results';

let p2Replays = new Map<
  string,
  { descriptor: string; body: JsonBodyType; etag: string }
>();

let rewardReplays = new Map<
  string,
  { descriptor: string; body: string; response: ClaimRewardResponse; etag: string }
>();

interface PersistedP2Replay {
  key: string;
  descriptor: string;
  body: JsonBodyType;
  etag: string;
}

interface PersistedRewardReplay {
  key: string;
  descriptor: string;
  body: string;
  response: ClaimRewardResponse;
  etag: string;
}

interface PersistedP1FakeDb {
  schemaVersion: number;
  version: number;
  state: ClientStateResponse;
  appearances: Appearance[];
  levelPlay: LevelPlayResponse | null;
  resultsSnapshot: LevelResultsResponse | null;
  resultsAcknowledgedAt: string | null;
  chapterCompletionScenario: boolean;
  gameUnavailableScenario: boolean;
  clientNotFoundScenario: boolean;
  claimedRewardIds: string[];
  regularRewardCycle: number;
  p2Replays: PersistedP2Replay[];
  rewardReplays: PersistedRewardReplay[];
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createP1MockPersistence(
  overrides: Partial<MockPersistenceRuntimeOptions> = {},
): MockPersistence {
  return createMockPersistence({
    storage: getBrowserStorage(),
    storageKey: PERSISTED_STATE_KEY,
    mode: overrides.mode ?? (import.meta.env.MODE === 'test' ? 'test' : 'browser'),
  });
}

let mockPersistence = createP1MockPersistence();

export function configureP1MockPersistence(
  options: MockPersistenceRuntimeOptions,
): void {
  mockPersistence = createP1MockPersistence(options);
  if (mockPersistence.isDisabled) resetP1FakeDb();
}

function persistFakeDb(): void {
  const persisted: PersistedP1FakeDb = {
    schemaVersion: PERSISTED_STATE_VERSION,
    version,
    state,
    appearances,
    levelPlay,
    resultsSnapshot,
    resultsAcknowledgedAt,
    chapterCompletionScenario,
    gameUnavailableScenario,
    clientNotFoundScenario,
    claimedRewardIds: [...claimedRewardIds],
    regularRewardCycle,
    p2Replays: [...p2Replays.entries()].map(([key, replay]) => ({ key, ...replay })),
    rewardReplays: [...rewardReplays.entries()].map(([key, replay]) => ({ key, ...replay })),
  };

  mockPersistence.save(persisted);
}

function clearPersistedFakeDb(): void {
  mockPersistence.clear();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isCellRef(value: unknown): boolean {
  return isRecord(value) && isNonNegativeInteger(value.row) && value.row <= 5 &&
    isNonNegativeInteger(value.col) && value.col <= 5;
}

function isBoard(value: unknown): boolean {
  return isRecord(value) && isNonNegativeInteger(value.size) && value.size >= 3 && value.size <= 6 &&
    Array.isArray(value.cells) && value.cells.length === value.size ** 2 && value.cells.every((cell) =>
      isRecord(cell) && isCellRef(cell) && typeof cell.letter === 'string' &&
      typeof cell.state === 'string' && typeof cell.belongsToFoundWord === 'boolean',
    );
}

function isFoundTarget(value: unknown): boolean {
  return isRecord(value) && isUuid(value.targetId) &&
    isNonNegativeInteger(value.foundSequence) && value.foundSequence > 0 &&
    typeof value.word === 'string' && typeof value.definition === 'string' &&
    typeof value.foundAt === 'string' && Array.isArray(value.cells) && value.cells.every(isCellRef) &&
    (value.courseOffer === undefined || isCourseOffer(value.courseOffer));
}

function isHintState(value: unknown): boolean {
  return isRecord(value) && isUuid(value.targetId) &&
    Array.isArray(value.revealedCells) && value.revealedCells.length > 0 &&
    value.revealedCells.every(isCellRef);
}

function isBonusWord(value: unknown): boolean {
  return isRecord(value) && typeof value.word === 'string' && typeof value.foundAt === 'string';
}

function isRewardSummary(value: unknown): boolean {
  if (!isRecord(value) || !isUuid(value.rewardId) ||
    (value.status !== RewardSummaryStatusEnum1.Collecting &&
      value.status !== RewardSummaryStatusEnum.Available &&
      value.status !== RewardSummaryStatusEnum1.Claimed) ||
    (value.rewardType !== RewardSummaryRewardTypeEnum.Regular &&
      value.rewardType !== RewardSummaryRewardTypeEnum.ChapterGolden)) {
    return false;
  }
  if (value.status !== RewardSummaryStatusEnum.Available) return true;
  return Array.isArray(value.options) && value.options.length > 0 && value.options.every((option) => {
    if (!isRecord(option) || typeof option.title !== 'string' || option.title.trim().length === 0) {
      return false;
    }
    if (option.optionType === RewardOptionOptionTypeEnum.Hint) {
      return isNonNegativeInteger(option.amount) && option.optionId === undefined &&
        option.decorationType === undefined;
    }
    return option.optionType === RewardOptionOptionTypeEnum.Decoration && isUuid(option.optionId) &&
      (option.decorationType === RewardOptionDecorationTypeEnum.Character ||
        option.decorationType === RewardOptionDecorationTypeEnum.Background) && option.amount === undefined;
  });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);
}

function isCourseOffer(value: unknown): boolean {
  return isRecord(value) && isUuid(value.courseId) && typeof value.locale === 'string' &&
    value.locale.length >= 2 && value.locale.length <= 35 && typeof value.badgeLabel === 'string' &&
    value.badgeLabel.length >= 1 && value.badgeLabel.length <= 40 && typeof value.title === 'string' &&
    value.title.length >= 1 && value.title.length <= 160;
}

function isClientState(value: unknown): value is ClientStateResponse {
  if (!isRecord(value) || !isRecord(value.clientState)) return false;
  const { clientState } = value;
  if (!isRecord(clientState.clientView) || !isRecord(clientState.clientView.balance) ||
    !isRecord(clientState.clientView.settings) || !isRecord(clientState.clientView.campaignProgress)) {
    return false;
  }
  const { balance, settings, campaignProgress } = clientState.clientView;
  if (!isNonNegativeInteger(balance.knowledgePoints) || !isNonNegativeInteger(balance.hintBalance) ||
    typeof settings.musicEnabled !== 'boolean' || typeof settings.soundEnabled !== 'boolean' ||
    typeof settings.tutorialCompleted !== 'boolean' ||
    typeof campaignProgress.isCompleted !== 'boolean' ||
    typeof campaignProgress.isCompletionShown !== 'boolean' ||
    typeof clientState.clientView.selectedCharacterId !== 'string' ||
    typeof clientState.clientView.selectedBackgroundId !== 'string' ||
    typeof clientState.nextAction !== 'string' ||
    !Array.isArray(clientState.chapters) || !Array.isArray(clientState.levels) ||
    !Array.isArray(clientState.rewards)) {
    return false;
  }
  if (clientState.pendingResults !== undefined &&
    (!isRecord(clientState.pendingResults) || !isUuid(clientState.pendingResults.levelId) ||
      (clientState.pendingResults.rewardId !== undefined &&
        !isUuid(clientState.pendingResults.rewardId)))) {
    return false;
  }
  if (clientState.pendingReward !== undefined &&
    (!isRecord(clientState.pendingReward) || !isUuid(clientState.pendingReward.rewardId))) {
    return false;
  }
  const pendingRewardId = isRecord(clientState.pendingReward) &&
    typeof clientState.pendingReward.rewardId === 'string'
    ? clientState.pendingReward.rewardId
    : undefined;
  if (clientState.pendingResults !== undefined && clientState.pendingReward !== undefined) return false;
  if (pendingRewardId !== undefined &&
    clientState.rewards.filter((reward) =>
      isRewardSummary(reward) && reward.rewardId === pendingRewardId &&
      reward.status === RewardSummaryStatusEnum.Available,
    ).length !== 1) {
    return false;
  }
  return clientState.chapters.every((chapter) =>
    isRecord(chapter) && typeof chapter.chapterId === 'string' &&
    isNonNegativeInteger(chapter.completedLevels) && isNonNegativeInteger(chapter.totalLevels) &&
    typeof chapter.status === 'string' && typeof chapter.title === 'string' &&
    typeof chapter.imageUrl === 'string' && typeof chapter.number === 'number' &&
    typeof chapter.isNarrativeShown === 'boolean',
  ) && clientState.levels.every((level) =>
    isRecord(level) && isUuid(level.levelId) && typeof level.status === 'string',
  ) && clientState.rewards.every(isRewardSummary) &&
    (clientState.inProgressLevel === undefined ||
      (isRecord(clientState.inProgressLevel) && isUuid(clientState.inProgressLevel.levelId) &&
        isUuid(clientState.inProgressLevel.levelVersionId) &&
        typeof clientState.inProgressLevel.startedAt === 'string'));
}

function isLevelPlay(value: unknown): value is LevelPlayResponse {
  return isRecord(value) && typeof value.levelId === 'string' &&
    typeof value.levelVersionId === 'string' && isBoard(value.board) &&
    isNonNegativeInteger(value.targetsRemaining) && Array.isArray(value.foundTargets) &&
    value.foundTargets.every(isFoundTarget) &&
    value.foundTargets.every((target, index, targets) =>
      index === 0 || target.foundSequence > targets[index - 1].foundSequence,
    ) && Array.isArray(value.bonusWords) &&
    value.bonusWords.every(isBonusWord) && typeof value.status === 'string' &&
    typeof value.nextAction === 'string' && typeof value.startedAt === 'string' &&
    isNonNegativeInteger(value.levelNumber) &&
    (value.hintState === undefined || isHintState(value.hintState));
}

function isResultsSnapshot(value: unknown): value is LevelResultsResponse {
  return isRecord(value) && isUuid(value.levelId) &&
    value.status === LevelResultsResponseStatusEnum.Completed &&
    (value.resultsState === LevelResultsResponseResultsStateEnum.PendingAcknowledgement ||
      value.resultsState === LevelResultsResponseResultsStateEnum.Acknowledged) &&
    (value.completionKind === LevelResultsResponseCompletionKindEnum.Level ||
      value.completionKind === LevelResultsResponseCompletionKindEnum.Chapter) &&
    isBoard(value.board) && Array.isArray(value.foundTargets) && value.foundTargets.every(isFoundTarget) &&
    value.foundTargets.every((target, index, targets) =>
      index === 0 || target.foundSequence > targets[index - 1].foundSequence,
    ) && Array.isArray(value.bonusWords) && value.bonusWords.every(isBonusWord) &&
    typeof value.completedAt === 'string' && isRecord(value.summary) &&
    isNonNegativeInteger(value.summary.earnedKnowledgePoints) &&
    isNonNegativeInteger(value.summary.knowledgePointsTotal) && isRecord(value.summary.targets) &&
    isNonNegativeInteger(value.summary.targets.foundCount) &&
    isNonNegativeInteger(value.summary.targets.totalCount) && isRecord(value.summary.bonuses) &&
    isNonNegativeInteger(value.summary.bonuses.foundCount) && isRecord(value.chapter) &&
    typeof value.chapter.chapterId === 'string' && isNonNegativeInteger(value.chapter.number) &&
    typeof value.chapter.title === 'string' && isNonNegativeInteger(value.chapter.completedLevels) &&
    isNonNegativeInteger(value.chapter.totalLevels) && typeof value.chapter.status === 'string' &&
    typeof value.nextAction === 'string' && (value.reward === undefined || isRewardSummary(value.reward));
}

function isRouteSubmissionResponse(value: unknown): boolean {
  return isRecord(value) &&
    (value.result === RouteSubmissionResponseResultEnum3.Found ||
      value.result === RouteSubmissionResponseResultEnum3.Invalid ||
      value.result === RouteSubmissionResponseResultEnum3.Repeated) &&
    typeof value.levelCompleted === 'boolean' && Array.isArray(value.newFoundTargets) &&
    value.newFoundTargets.every(isFoundTarget) && Array.isArray(value.newBonusWords) &&
    value.newBonusWords.every(isBonusWord) && typeof value.nextAction === 'string';
}

function isHintUseResponse(value: unknown): boolean {
  return isRecord(value) && isNonNegativeInteger(value.hintBalance) &&
    isNonNegativeInteger(value.knowledgePoints) && Array.isArray(value.revealedCells) &&
    value.revealedCells.every(isCellRef) && isHintState(value.hintTarget) &&
    Array.isArray(value.foundTargets) && value.foundTargets.every(isFoundTarget) &&
    isNonNegativeInteger(value.targetsRemaining) && typeof value.levelCompleted === 'boolean' &&
    typeof value.nextAction === 'string' &&
    (value.completedTarget === undefined || isFoundTarget(value.completedTarget));
}

function isSubmitFeedbackResponse(value: unknown): value is SubmitFeedbackResponse {
  return isRecord(value) && isUuid(value.feedbackId) &&
    value.status === SubmitFeedbackResponseStatusEnum.Submitted && typeof value.nextAction === 'string';
}

function isAcknowledgeLevelResultsResponse(value: unknown): value is AcknowledgeLevelResultsResponse {
  return isRecord(value) && isUuid(value.levelId) && typeof value.resultsAcknowledgedAt === 'string' &&
    value.resultsState === AcknowledgeLevelResultsResponseResultsStateEnum.Acknowledged &&
    typeof value.nextAction === 'string' &&
    (value.pendingReward === undefined ||
      (isRecord(value.pendingReward) && isUuid(value.pendingReward.rewardId)));
}

function replayApiId(key: string): ReplayApiId | undefined {
  const separator = key.indexOf(':');
  if (separator <= 0 || separator === key.length - 1) return undefined;
  const apiId = key.slice(0, separator) as ReplayApiId;
  return ['bootstrap', 'start-level', 'submit-route', 'use-hint', 'submit-feedback', 'acknowledge-results'].includes(apiId)
    ? apiId
    : undefined;
}

function isReplayDescriptor(apiId: ReplayApiId, descriptor: string, body: unknown): boolean {
  switch (apiId) {
    case 'bootstrap':
      return descriptor === 'bootstrap:no-body' && isClientState(body);
    case 'start-level':
      return isUuid(descriptor.slice('start:'.length)) && descriptor.startsWith('start:') &&
        isLevelPlay(body);
    case 'submit-route': {
      const match = /^route:([^:]+):(?:\d+:\d+)(?:\|\d+:\d+)*$/.exec(descriptor);
      return match !== null && isUuid(match[1]) && isRouteSubmissionResponse(body);
    }
    case 'use-hint':
      return descriptor.startsWith('hint:') && isUuid(descriptor.slice('hint:'.length)) &&
        isHintUseResponse(body);
    case 'submit-feedback':
      return isNormalizedSettingsFeedbackDescriptor(descriptor) && isSubmitFeedbackResponse(body);
    case 'acknowledge-results':
      return descriptor.startsWith('acknowledge:') && descriptor.endsWith(':no-body') &&
        isUuid(descriptor.slice('acknowledge:'.length, -':no-body'.length)) &&
        isAcknowledgeLevelResultsResponse(body);
  }
}

function isNormalizedSettingsFeedbackDescriptor(descriptor: string): boolean {
  if (!descriptor.startsWith('feedback:')) return false;
  try {
    const body = JSON.parse(descriptor.slice('feedback:'.length)) as unknown;
    if (!isRecord(body) || body.source !== 'settings' || typeof body.rating !== 'number' ||
      !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 ||
      (body.comment !== undefined && typeof body.comment !== 'string')) {
      return false;
    }
    const fields = Object.keys(body);
    if (fields.some((field) => field !== 'source' && field !== 'rating' && field !== 'comment')) {
      return false;
    }
    const normalized = {
      source: 'settings',
      rating: body.rating,
      ...(typeof body.comment === 'string' ? { comment: body.comment } : {}),
    };
    return descriptor === `feedback:${JSON.stringify(normalized)}`;
  } catch {
    return false;
  }
}

function isP2Replay(value: unknown): value is PersistedP2Replay {
  if (!isRecord(value) || typeof value.key !== 'string' || typeof value.descriptor !== 'string' ||
    typeof value.etag !== 'string' || !/^"[^"]*"$/.test(value.etag) || !('body' in value)) {
    return false;
  }
  const apiId = replayApiId(value.key);
  return apiId !== undefined && isReplayDescriptor(apiId, value.descriptor, value.body);
}

function isRewardReplay(value: unknown): value is PersistedRewardReplay {
  if (!isRecord(value) || typeof value.key !== 'string' || value.key.length === 0 ||
    typeof value.descriptor !== 'string' || typeof value.body !== 'string' ||
    typeof value.etag !== 'string' || !/^"[^"]*"$/.test(value.etag) ||
    !isRecord(value.response) || !isUuid(value.response.rewardId) ||
    (value.response.rewardType !== ClaimRewardResponseRewardTypeEnum.Regular &&
      value.response.rewardType !== ClaimRewardResponseRewardTypeEnum.ChapterGolden) ||
    value.response.state !== ClaimRewardResponseStateEnum.Claimed ||
    !isRecord(value.response.selectedOption) ||
    (value.response.selectedOption.selectedOptionType !== SelectedOptionSelectedOptionTypeEnum.Hint &&
      value.response.selectedOption.selectedOptionType !== SelectedOptionSelectedOptionTypeEnum.Decoration) ||
    (value.response.selectedOption.selectedOptionType === SelectedOptionSelectedOptionTypeEnum.Hint &&
      value.response.selectedOption.selectedOptionId !== undefined) ||
    (value.response.selectedOption.selectedOptionType === SelectedOptionSelectedOptionTypeEnum.Decoration &&
      !isUuid(value.response.selectedOption.selectedOptionId)) ||
    !isRecord(value.response.claimResult) || !isRecord(value.response.claimResult.balance) ||
    !isNonNegativeInteger(value.response.claimResult.balance.knowledgePoints) ||
    !isNonNegativeInteger(value.response.claimResult.balance.hintBalance) ||
    (value.response.nextAction !== NextAction.StartLevel &&
      value.response.nextAction !== NextAction.Play)) {
    return false;
  }
  if (value.response.claimResult.decoration !== undefined &&
    (!isRecord(value.response.claimResult.decoration) ||
      !isUuid(value.response.claimResult.decoration.appearanceId) ||
      (value.response.claimResult.decoration.type !== ClaimResultTypeEnum.Character &&
        value.response.claimResult.decoration.type !== ClaimResultTypeEnum.Background))) {
    return false;
  }
  return value.descriptor === `claim:${value.response.rewardId}:${value.body}`;
}

function migrateFoundTargets(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((target, index) => {
    if (!isRecord(target)) return target;
    const matchingTargets = LEVEL1_TARGETS.filter((candidate) => candidate.word === target.word);
    const configuredTarget = matchingTargets.length === 1 ? matchingTargets[0] : undefined;
    return {
      ...target,
      ...(configuredTarget ? { targetId: configuredTarget.targetId } : {}),
      foundSequence: index + 1,
    };
  });
}

function isSameCell(left: CellRef, right: CellRef): boolean {
  return left.row === right.row && left.col === right.col;
}

function inferLegacyHintTarget(revealedCells: unknown): Level1Target | undefined {
  if (!Array.isArray(revealedCells) || revealedCells.length === 0 || !revealedCells.every(isCellRef)) {
    return undefined;
  }
  const cells = revealedCells as CellRef[];
  const prefixMatches = LEVEL1_TARGETS.filter((target) =>
    target.cells.length >= cells.length && cells.every((cell, index) => isSameCell(cell, target.cells[index])),
  );
  if (prefixMatches.length === 1) return prefixMatches[0];
  if (prefixMatches.length > 1) return undefined;

  const subsetMatches = LEVEL1_TARGETS.filter((target) =>
    cells.every((cell) => target.cells.some((targetCell) => isSameCell(cell, targetCell))),
  );
  return subsetMatches.length === 1 ? subsetMatches[0] : undefined;
}

function migrateLegacyHintState(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const target = inferLegacyHintTarget(value.revealedCells);
  return target ? { targetId: target.targetId, revealedCells: value.revealedCells } : undefined;
}

function migratePersistedFakeDb(value: unknown): unknown {
  if (!isRecord(value) || (value.schemaVersion !== 4 && value.schemaVersion !== 5)) return value;

  const levelPlayValue = value.schemaVersion === 4 && isRecord(value.levelPlay)
    ? {
        ...value.levelPlay,
        foundTargets: migrateFoundTargets(value.levelPlay.foundTargets),
        hintState: migrateLegacyHintState(value.levelPlay.hintState),
      }
    : value.levelPlay;
  const resultsSnapshotValue = value.schemaVersion === 4 && isRecord(value.resultsSnapshot)
    ? {
        ...value.resultsSnapshot,
        foundTargets: migrateFoundTargets(value.resultsSnapshot.foundTargets),
      }
    : value.resultsSnapshot;
  const stateValue = value.schemaVersion === 4 && isRecord(value.state) && isRecord(value.state.clientState)
    ? {
        ...value.state,
        clientState: {
          ...value.state.clientState,
          rewards: Array.isArray(value.state.clientState.rewards)
            ? value.state.clientState.rewards.map((reward) => {
                if (!isRecord(reward) || reward.rewardType !== RewardSummaryRewardTypeEnum.Regular) {
                  return reward;
                }
                const current = reward.status === RewardSummaryStatusEnum.Available
                  ? regularRewardThreshold(0)
                  : 0;
                return { ...reward, progress: { current, threshold: regularRewardThreshold(0) } };
              })
            : value.state.clientState.rewards,
        },
      }
    : value.state;
  const clientState = isRecord(stateValue) && isRecord(stateValue.clientState)
    ? stateValue.clientState
    : undefined;
  const replayLevelId = isRecord(clientState?.inProgressLevel) &&
    isUuid(clientState.inProgressLevel.levelId)
    ? clientState.inProgressLevel.levelId
    : isRecord(clientState?.pendingResults) && isUuid(clientState.pendingResults.levelId)
      ? clientState.pendingResults.levelId
      : undefined;
  const p2Replays = Array.isArray(value.p2Replays)
    ? value.p2Replays.map((replay) => {
        if (!isRecord(replay) || typeof replay.key !== 'string' ||
          !replay.key.startsWith('submit-route:') ||
          typeof replay.descriptor !== 'string' || !replayLevelId ||
          !replay.descriptor.startsWith('route:') ||
          replay.descriptor.startsWith(`route:${replayLevelId}:`)) {
          return replay;
        }
        return { ...replay, descriptor: `route:${replayLevelId}:${replay.descriptor.slice('route:'.length)}` };
      })
    : value.p2Replays;

  return {
    ...value,
    schemaVersion: PERSISTED_STATE_VERSION,
    state: stateValue,
    levelPlay: levelPlayValue,
    resultsSnapshot: resultsSnapshotValue,
    regularRewardCycle: value.schemaVersion === 4 ? 0 : value.regularRewardCycle,
    p2Replays,
    gameUnavailableScenario: value.schemaVersion === 5 ? false : value.gameUnavailableScenario,
    clientNotFoundScenario: value.schemaVersion === 5 ? false : value.clientNotFoundScenario,
  };
}

function isPersistedP1FakeDb(value: unknown): value is PersistedP1FakeDb {
  if (!isRecord(value)) return false;
  return value.schemaVersion === PERSISTED_STATE_VERSION &&
    isNonNegativeInteger(value.version) && value.version > 0 && isClientState(value.state) &&
    Array.isArray(value.appearances) && value.appearances.every((appearance) =>
      isRecord(appearance) && typeof appearance.appearanceId === 'string' &&
      typeof appearance.type === 'string' && typeof appearance.isOwned === 'boolean' &&
      typeof appearance.isSelected === 'boolean',
    ) &&
    (value.levelPlay === null || isLevelPlay(value.levelPlay)) &&
    (value.resultsSnapshot === null || isResultsSnapshot(value.resultsSnapshot)) &&
    (value.resultsAcknowledgedAt === null || typeof value.resultsAcknowledgedAt === 'string') &&
    (value.resultsSnapshot === null
      ? value.resultsAcknowledgedAt === null
      : value.resultsSnapshot.resultsState === LevelResultsResponseResultsStateEnum.Acknowledged
        ? typeof value.resultsAcknowledgedAt === 'string'
        : value.resultsAcknowledgedAt === null) &&
    typeof value.chapterCompletionScenario === 'boolean' &&
    typeof value.gameUnavailableScenario === 'boolean' &&
    typeof value.clientNotFoundScenario === 'boolean' &&
    Array.isArray(value.claimedRewardIds) && value.claimedRewardIds.every(isUuid) &&
    isNonNegativeInteger(value.regularRewardCycle) &&
    Array.isArray(value.p2Replays) && value.p2Replays.every(isP2Replay) &&
    Array.isArray(value.rewardReplays) && value.rewardReplays.every(isRewardReplay) &&
    hasConsistentPersistedPointers(value as unknown as PersistedP1FakeDb);
}

function hasConsistentPersistedPointers(value: PersistedP1FakeDb): boolean {
  const clientState = value.state.clientState;
  const pendingResults = clientState.pendingResults;
  const pendingReward = clientState.pendingReward;

  if (clientState.inProgressLevel &&
    (!value.levelPlay || value.levelPlay.levelId !== clientState.inProgressLevel.levelId ||
      value.levelPlay.levelVersionId !== clientState.inProgressLevel.levelVersionId)) {
    return false;
  }
  if (!clientState.inProgressLevel && value.levelPlay && !value.resultsSnapshot) return false;

  if (pendingResults) {
    if (!value.resultsSnapshot ||
      value.resultsSnapshot.resultsState !== LevelResultsResponseResultsStateEnum.PendingAcknowledgement ||
      value.resultsSnapshot.levelId !== pendingResults.levelId || pendingReward !== undefined) {
      return false;
    }
    return pendingResults.rewardId === value.resultsSnapshot.reward?.rewardId;
  }

  if (value.resultsSnapshot?.resultsState === LevelResultsResponseResultsStateEnum.PendingAcknowledgement) {
    return false;
  }
  if (value.resultsSnapshot && value.levelPlay && value.resultsSnapshot.levelId !== value.levelPlay.levelId) {
    return false;
  }
  if (value.resultsSnapshot?.resultsState === LevelResultsResponseResultsStateEnum.Acknowledged) {
    return pendingReward?.rewardId === value.resultsSnapshot.reward?.rewardId;
  }
  return pendingReward === undefined;
}

function restoreFakeDb(): void {
  try {
    const rawState = mockPersistence.restore();
    if (!rawState) return;
    const persisted = migratePersistedFakeDb(rawState);
    if (!isPersistedP1FakeDb(persisted)) {
      clearPersistedFakeDb();
      return;
    }

    version = persisted.version;
    state = persisted.state;
    appearances = persisted.appearances;
    levelPlay = persisted.levelPlay;
    resultsSnapshot = persisted.resultsSnapshot;
    resultsAcknowledgedAt = persisted.resultsAcknowledgedAt;
    chapterCompletionScenario = persisted.chapterCompletionScenario;
    gameUnavailableScenario = persisted.gameUnavailableScenario;
    clientNotFoundScenario = persisted.clientNotFoundScenario;
    claimedRewardIds = new Set(persisted.claimedRewardIds);
    regularRewardCycle = persisted.regularRewardCycle;
    p2Replays = new Map(
      persisted.p2Replays.map(({ key, descriptor, body, etag }) => [
        key,
        { descriptor, body, etag },
      ]),
    );
    rewardReplays = new Map(
      persisted.rewardReplays.map(({ key, descriptor, body, response, etag }) => [
        key,
        { descriptor, body, response, etag },
      ]),
    );
  } catch {
    clearPersistedFakeDb();
  }
}

restoreFakeDb();

function makeLevelPlay(): LevelPlayResponse {
  return {
    levelId: LEVEL_ID,
    levelVersionId: LEVEL_VERSION_ID,
    levelNumber: 1,
    microtheme: 'Личные финансы',
    status: LevelPlayResponseStatusEnum.InProgress,
    board: {
      size: 6,
      cells: LEVEL_GRID.flatMap((row, rowIndex) =>
        row.map((letter, colIndex) => ({
          row: rowIndex,
          col: colIndex,
          letter,
          state: CellViewStateEnum.Letter,
          belongsToFoundWord: false,
        })),
      ).reverse(),
    },
    targetsRemaining: LEVEL1_TARGETS.length,
    foundTargets: [],
    bonusWords: [],
    startedAt: '2026-08-21T12:00:00.000Z',
    nextAction: NextAction.Play,
  };
}

function etag(): string {
  return `"p1-${version}"`;
}

function response<T>(body: T, mutation = false) {
  if (mutation) {
    version += 1;
    persistFakeDb();
  }
  return HttpResponse.json(body as JsonBodyType, {
    headers: {
      ETag: etag(),
      ...(mutation ? { 'Idempotency-Key-Status': 'processed' } : {}),
    },
  });
}

function protocolError(request: Request, ifMatch: boolean) {
  if (!request.headers.get('idempotency-key')) {
    return HttpResponse.json({ type: 'IDEMPOTENCY_KEY_REQUIRED' }, { status: 400 });
  }
  if (ifMatch && request.headers.get('if-match') !== etag()) {
    return HttpResponse.json(
      { type: 'STATE_VERSION_CONFLICT', payload: { currentEtag: etag() } },
      { status: 409, headers: { ETag: etag() } },
    );
  }
  return null;
}

function p2Replay(
  apiId: ReplayApiId,
  request: Request,
  descriptor: string,
) {
  const key = request.headers.get('idempotency-key');
  if (!key) {
    return {
      key: '',
      response: HttpResponse.json({ type: 'IDEMPOTENCY_KEY_REQUIRED' }, { status: 400 }),
    };
  }
  const replay = p2Replays.get(`${apiId}:${key}`);
  if (!replay) return { key, response: null };
  if (replay.descriptor !== descriptor) {
    return {
      key,
      response: HttpResponse.json(
        { type: 'IDEMPOTENCY_KEY_REUSED' },
        { status: 409, headers: { ETag: replay.etag } },
      ),
    };
  }
  return {
    key,
    response: HttpResponse.json(replay.body as JsonBodyType, {
      headers: {
        ETag: replay.etag,
        'Idempotency-Key-Status': 'replayed',
      },
    }),
  };
}

function p2Response(
  apiId: ReplayApiId,
  key: string,
  descriptor: string,
  body: JsonBodyType,
) {
  version += 1;
  const responseEtag = etag();
  p2Replays.set(`${apiId}:${key}`, { descriptor, body, etag: responseEtag });
  persistFakeDb();
  return HttpResponse.json(body as JsonBodyType, {
    headers: {
      ETag: responseEtag,
      'Idempotency-Key-Status': 'processed',
    },
  });
}

// Stores a non-mutating submit-route outcome (invalid/repeated) for idempotent
// replay without bumping the ETag/revision or changing game state.
function p2IdempotentResponse(
  apiId: ReplayApiId,
  key: string,
  descriptor: string,
  body: JsonBodyType,
) {
  const responseEtag = etag();
  p2Replays.set(`${apiId}:${key}`, { descriptor, body, etag: responseEtag });
  persistFakeDb();
  return HttpResponse.json(body as JsonBodyType, {
    headers: {
      ETag: responseEtag,
      'Idempotency-Key-Status': 'processed',
    },
  });
}

function validationProblem(type: string, field: string, text: string) {
  return HttpResponse.json(
    { type: 'VALIDATION_ERROR', errors: [{ type, field, text }] },
    { status: 400 },
  );
}

type ValidSettingsFeedback = {
  source: 'settings';
  rating: number;
  comment?: string;
};

function parseSettingsFeedback(rawBody: string):
  | { feedback: ValidSettingsFeedback; descriptor: string }
  | { error: Response } {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { error: validationProblem('INVALID_FORMAT', 'body', 'Тело запроса должно быть корректным JSON') };
  }
  if (!isRecord(body)) {
    return { error: validationProblem('INVALID_FORMAT', 'body', 'Тело запроса должно быть JSON-объектом') };
  }
  const allowedFields = new Set(['source', 'rating', 'comment', 'chapterId']);
  const unknownField = Object.keys(body).find((field) => !allowedFields.has(field));
  if (unknownField) {
    return { error: validationProblem('UNKNOWN_FIELD', `body.${unknownField}`, 'Поле не поддерживается') };
  }
  if (body.source === undefined || body.rating === undefined) {
    return { error: validationProblem('REQUIRED_FIELD', 'body', 'Поля source и rating обязательны') };
  }
  if (body.source !== 'settings') {
    return { error: validationProblem('INVALID_VALUE', 'body.source', 'Недопустимое значение source') };
  }
  if ('chapterId' in body) {
    return { error: validationProblem('FORBIDDEN_FIELD', 'body.chapterId', 'chapterId запрещён для source=settings') };
  }
  const rating = body.rating;
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: validationProblem('OUT_OF_RANGE', 'body.rating', 'rating должен быть целым числом от 1 до 5') };
  }
  if (body.comment !== undefined && typeof body.comment !== 'string') {
    return { error: validationProblem('INVALID_FORMAT', 'body.comment', 'comment должен быть строкой') };
  }
  if (typeof body.comment === 'string' && body.comment.length > 500) {
    return { error: validationProblem('TOO_LONG', 'body.comment', 'comment не должен превышать 500 символов') };
  }
  const feedback: ValidSettingsFeedback = {
    source: 'settings',
    rating,
    ...(typeof body.comment === 'string' ? { comment: body.comment } : {}),
  };
  return { feedback, descriptor: `feedback:${JSON.stringify(feedback)}` };
}

function availabilityError(): Response | null {
  const persisted = mockPersistence.restore();
  const gameUnavailable = gameUnavailableScenario ||
    (isRecord(persisted) && persisted.gameUnavailableScenario === true);
  const clientNotFound = clientNotFoundScenario ||
    (isRecord(persisted) && persisted.clientNotFoundScenario === true);
  if (gameUnavailable) {
    return HttpResponse.json({ type: 'GAME_UNAVAILABLE' }, { status: 403 });
  }
  if (clientNotFound) {
    return HttpResponse.json({ type: 'CLIENT_NOT_FOUND' }, { status: 404 });
  }
  return null;
}

type ValidClaimRequest =
  | { rewardType: 'hint' }
  | { rewardType: 'decoration'; selectedOptionId: string };

function parseClaimRequest(rawBody: string):
  | { claim: ValidClaimRequest }
  | { error: Response } {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return {
      error: validationProblem('INVALID_FORMAT', 'body', 'Тело запроса должно быть корректным JSON'),
    };
  }
  if (!isRecord(body)) {
    return {
      error: validationProblem('INVALID_FORMAT', 'body', 'Тело запроса должно быть JSON-объектом'),
    };
  }

  const allowedFields = new Set(['rewardType', 'selectedOptionId']);
  const unknownField = Object.keys(body).find((field) => !allowedFields.has(field));
  if (unknownField) {
    return {
      error: validationProblem('UNKNOWN_FIELD', `body.${unknownField}`, 'Поле не поддерживается'),
    };
  }
  if (!('rewardType' in body)) {
    return {
      error: validationProblem('REQUIRED_FIELD', 'body.rewardType', 'Поле rewardType обязательно'),
    };
  }
  if (body.rewardType !== 'hint' && body.rewardType !== 'decoration') {
    return {
      error: validationProblem('INVALID_VALUE', 'body.rewardType', 'Недопустимое значение rewardType'),
    };
  }
  if (body.rewardType === 'hint') {
    if ('selectedOptionId' in body) {
      return {
        error: validationProblem(
          'FORBIDDEN_FIELD',
          'body.selectedOptionId',
          'Поле selectedOptionId запрещено для rewardType=hint',
        ),
      };
    }
    return { claim: { rewardType: 'hint' } };
  }
  if (!('selectedOptionId' in body)) {
    return {
      error: validationProblem(
        'REQUIRED_FIELD',
        'body.selectedOptionId',
        'Поле selectedOptionId обязательно для rewardType=decoration',
      ),
    };
  }
  if (typeof body.selectedOptionId !== 'string') {
    return {
      error: validationProblem('INVALID_FORMAT', 'body.selectedOptionId', 'Некорректный selectedOptionId'),
    };
  }
  if (body.selectedOptionId.trim().length === 0) {
    return {
      error: validationProblem(
        'REQUIRED_FIELD',
        'body.selectedOptionId',
        'Поле selectedOptionId обязательно для rewardType=decoration',
      ),
    };
  }
  if (!isUuid(body.selectedOptionId)) {
    return {
      error: validationProblem('INVALID_FORMAT', 'body.selectedOptionId', 'Некорректный selectedOptionId'),
    };
  }
  return { claim: { rewardType: 'decoration', selectedOptionId: body.selectedOptionId } };
}

function acknowledgementNextAction(snapshot: LevelResultsResponse): NextAction {
  return snapshot.reward && state.clientState.rewards.some((reward) =>
    reward.rewardId === snapshot.reward?.rewardId && reward.status === RewardSummaryStatusEnum.Available,
  )
    ? NextAction.ClaimReward
    : NextAction.StartLevel;
}

function routeWord(route: CellRef[]): string {
  return route.map((cell) => LEVEL_GRID[cell.row]?.[cell.col] ?? '').join('');
}

function normalizeSelectedBoardWord(word: string): string {
  return word.normalize('NFC').trim().toLocaleUpperCase('ru-RU');
}

function routeSignature(route: CellRef[]): string {
  return route.map((cell) => `${cell.row}:${cell.col}`).join('|');
}

function makeFoundTarget(target: Level1Target, foundSequence: number): FoundTarget {
  return {
    targetId: target.targetId,
    foundSequence,
    word: target.word,
    definition: target.definition,
    cells: target.cells,
    foundAt: '2026-08-21T12:02:00.000Z',
  };
}

function activeHintTarget(): Level1Target | undefined {
  if (!levelPlay) return undefined;
  const activeTargetId = levelPlay.hintState?.targetId;
  const activeTarget = LEVEL1_TARGETS.find((target) => target.targetId === activeTargetId);
  if (activeTarget && !levelPlay.foundTargets.some((found) => found.targetId === activeTarget.targetId)) {
    return activeTarget;
  }
  return LEVEL1_TARGETS.find(
    (target) => !levelPlay?.foundTargets.some((found) => found.targetId === target.targetId),
  );
}

function makeChapterGoldenReward(): RewardSummary {
  return {
    rewardId: CHAPTER_GOLDEN_REWARD_ID,
    rewardType: RewardSummaryRewardTypeEnum.ChapterGolden,
    status: RewardSummaryStatusEnum.Available,
    availableAt: '2026-08-21T12:02:00.000Z',
    hintOptionAmount: 3,
    decorationOptionId: CHARACTER_IDS[2],
    progress: { current: 9, threshold: 9 },
    options: [
      {
        optionType: RewardOptionOptionTypeEnum.Hint,
        amount: 3,
        title: 'Три подсказки',
        imageUrl: assetUrl('assets/p1/reward-envelope.png'),
      },
      {
        optionType: RewardOptionOptionTypeEnum.Decoration,
        optionId: CHARACTER_IDS[2],
        title: characterTitles[2],
        imageUrl: assetUrl(`assets/p1/${characterAssets[2]}`),
        decorationType: RewardOptionDecorationTypeEnum.Character,
      },
    ],
  };
}

function finalizeLevelCompletion(
  balance: { knowledgePoints: number; hintBalance: number },
  completedAt: string,
): void {
  if (!levelPlay) throw new Error('Cannot finalize a missing level');

  const currentChapter = state.clientState.chapters[0];
  const completionKind = chapterCompletionScenario
    ? LevelResultsResponseCompletionKindEnum.Chapter
    : LevelResultsResponseCompletionKindEnum.Level;
  const chapterStatus = chapterCompletionScenario
    ? LevelResultsResponseStatusEnum1.Completed
    : LevelResultsResponseStatusEnum1.InProgress;
  const completedLevels = chapterCompletionScenario
    ? currentChapter.totalLevels
    : currentChapter.completedLevels + 1;
  const reward = chapterCompletionScenario ? makeChapterGoldenReward() : undefined;
  const nextAction = reward ? NextAction.ClaimReward : NextAction.StartLevel;

  levelPlay = { ...levelPlay, nextAction };
  resultsAcknowledgedAt = null;
  resultsSnapshot = {
    levelId: levelPlay.levelId,
    status: LevelResultsResponseStatusEnum.Completed,
    resultsState: LevelResultsResponseResultsStateEnum.PendingAcknowledgement,
    completionKind,
    board: {
      ...levelPlay.board,
      cells: levelPlay.board.cells.map((cell) => ({
        ...cell,
        state: CellViewStateEnum.Found,
        belongsToFoundWord: true,
      })),
    },
    foundTargets: levelPlay.foundTargets.map((target) =>
      target.word === LEVEL1_COURSE_OFFER_TARGET_WORD
        ? { ...target, courseOffer: LEVEL1_COURSE_OFFER }
        : target,
    ),
    bonusWords: levelPlay.bonusWords,
    completedAt,
    summary: {
      earnedKnowledgePoints: LEVEL1_TARGETS.length,
      knowledgePointsTotal: balance.knowledgePoints,
      targets: {
        foundCount: levelPlay.foundTargets.length,
        totalCount: LEVEL1_TARGETS.length,
      },
      bonuses: { foundCount: levelPlay.bonusWords.length },
    },
    chapter: {
      chapterId: currentChapter.chapterId,
      number: currentChapter.number,
      title: currentChapter.title,
      completedLevels,
      totalLevels: currentChapter.totalLevels,
      status: chapterStatus,
    },
    ...(reward ? { reward } : {}),
    nextAction,
  };
  state = {
    ...state,
    clientState: {
      ...state.clientState,
      clientView: { ...state.clientState.clientView, balance },
      inProgressLevel: undefined,
      chapters: state.clientState.chapters.map((chapter, index) =>
        index === 0
          ? {
              ...chapter,
              completedLevels,
              status: chapterCompletionScenario
                ? ChapterProgressStatusEnum.Completed
                : ChapterProgressStatusEnum.InProgress,
            }
          : chapter,
      ),
      levels: state.clientState.levels.map((level) =>
        level.levelId === LEVEL_ID
          ? { ...level, status: LevelProgressSummaryStatusEnum.Completed, completedAt }
          : level,
      ),
      rewards: reward ? [...state.clientState.rewards, reward] : state.clientState.rewards,
      pendingResults: reward
        ? { levelId: LEVEL_ID, rewardId: reward.rewardId }
        : { levelId: LEVEL_ID },
      nextAction,
    },
  };
}

export function resetP1FakeDb(options: P1FakeDbOptions = {}) {
  clearPersistedFakeDb();
  version = 1;
  const regularCycle = options.regularRewardCycle ?? 0;
  const regularProgress = options.regularRewardProgress ?? 0;
  state = makeClientState({
    ...options,
    regularRewardCycle: regularCycle,
    regularRewardProgress: regularProgress,
  });
  appearances = makeAppearances();
  levelPlay = null;
  resultsSnapshot = null;
  resultsAcknowledgedAt = null;
  chapterCompletionScenario = options.chapterCompletion === true;
  gameUnavailableScenario = options.gameUnavailable === true;
  clientNotFoundScenario = options.clientNotFound === true;
  claimedRewardIds = new Set();
  regularRewardCycle = regularCycle;
  p2Replays = new Map();
  rewardReplays = new Map();
  persistFakeDb();
}

export const p1Handlers = [
  http.post(apiPath('bootstrap'), ({ request }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const replay = p2Replay('bootstrap', request, 'bootstrap:no-body');
    if (replay.response) return replay.response;
    const error = protocolError(request, false);
    return error ?? p2IdempotentResponse('bootstrap', replay.key, 'bootstrap:no-body', state);
  }),
  http.get(apiPath('state'), () => {
    const unavailable = availabilityError();
    return unavailable ?? response(state);
  }),
  http.post(apiPath('start-level'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const levelId = String(params.levelId);
    const descriptor = `start:${levelId}`;
    const replay = p2Replay('start-level', request, descriptor);
    if (replay.response) return replay.response;
    const error = protocolError(request, true);
    if (error) return error;
    const candidate = state.clientState.levels.find(
      (level) => level.levelId === levelId,
    );
    if (!candidate || candidate.status !== LevelProgressSummaryStatusEnum.Available) {
      return HttpResponse.json({ type: 'LEVEL_LOCKED' }, { status: 409 });
    }
    levelPlay = makeLevelPlay();
    state = {
      ...state,
      clientState: {
        ...state.clientState,
        inProgressLevel: {
          levelId: LEVEL_ID,
          levelVersionId: LEVEL_VERSION_ID,
          startedAt: levelPlay.startedAt,
        },
        levels: state.clientState.levels.map((level) =>
          level.levelId === LEVEL_ID
            ? { ...level, status: LevelProgressSummaryStatusEnum.InProgress }
            : level,
        ),
        nextAction: NextAction.Play,
      },
    };
    return p2Response('start-level', replay.key, descriptor, levelPlay);
  }),
  http.get(apiPath('resume-level'), ({ params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    if (!levelPlay || String(params.levelId) !== levelPlay.levelId) {
      return HttpResponse.json({ type: 'LEVEL_NOT_IN_PROGRESS' }, { status: 409 });
    }
    return response(levelPlay);
  }),
  http.post(apiPath('use-hint'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const levelId = String(params.levelId);
    const descriptor = `hint:${levelId}`;
    const replay = p2Replay('use-hint', request, descriptor);
    if (replay.response) return replay.response;
    const error = protocolError(request, true);
    if (error) return error;
    if (state.clientState.pendingReward) {
      return HttpResponse.json({ type: 'REWARD_PENDING_CLAIM' }, { status: 409 });
    }
    if (state.clientState.pendingResults || !levelPlay || levelPlay.levelId !== levelId) {
      return HttpResponse.json({ type: 'LEVEL_NOT_IN_PROGRESS' }, { status: 409 });
    }
    const balance = state.clientState.clientView.balance;
    if (balance.hintBalance <= 0) {
      return HttpResponse.json({ type: 'HINTS_EXHAUSTED' }, { status: 409 });
    }

    const target = activeHintTarget();
    if (!target) {
      return HttpResponse.json({ type: 'LEVEL_NOT_IN_PROGRESS' }, { status: 409 });
    }
    const revealedCount = levelPlay.hintState?.targetId === target.targetId
      ? levelPlay.hintState.revealedCells.length
      : 0;
    const revealedCells = target.cells.slice(0, revealedCount + 1);
    const targetCompleted = revealedCells.length === target.cells.length;

    let foundTargets = levelPlay.foundTargets;
    let knowledgeGain = 0;
    let completedTarget: FoundTarget | undefined;

    if (targetCompleted) {
      completedTarget = makeFoundTarget(target, levelPlay.foundTargets.length + 1);
      foundTargets = [...levelPlay.foundTargets, completedTarget];
      knowledgeGain = 1;
    }

    const targetsRemaining = LEVEL1_TARGETS.length - foundTargets.length;
    const levelCompleted = targetsRemaining === 0;
    const nextBalance = {
      hintBalance: balance.hintBalance - 1,
      knowledgePoints: balance.knowledgePoints + knowledgeGain,
    };
    levelPlay = {
      ...levelPlay,
      hintState: targetCompleted ? undefined : { targetId: target.targetId, revealedCells },
      foundTargets,
      targetsRemaining,
      nextAction: levelCompleted ? NextAction.StartLevel : NextAction.Play,
    };
    if (levelCompleted) {
      finalizeLevelCompletion(nextBalance, '2026-08-21T12:01:00.000Z');
    } else {
      state = {
        ...state,
        clientState: {
          ...state.clientState,
          clientView: { ...state.clientState.clientView, balance: nextBalance },
        },
      };
    }
    const body: HintUseResponse = {
      hintBalance: nextBalance.hintBalance,
      knowledgePoints: nextBalance.knowledgePoints,
      revealedCells,
      hintTarget: { targetId: target.targetId, revealedCells },
      ...(completedTarget ? { completedTarget } : {}),
      foundTargets,
      targetsRemaining,
      levelCompleted,
      nextAction: levelCompleted ? levelPlay.nextAction : NextAction.Play,
    };
    return p2Response('use-hint', replay.key, descriptor, body);
  }),
  http.post(apiPath('submit-route'), async ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const levelId = String(params.levelId);
    const rawBody = (await request.json()) as RouteSubmissionRequest;
    const route = rawBody.route ?? [];
    const word = normalizeSelectedBoardWord(routeWord(route));
    const signature = routeSignature(route);
    const descriptor = `route:${levelId}:${signature}`;

    const replay = p2Replay('submit-route', request, descriptor);
    if (replay.response) return replay.response;

    const error = protocolError(request, true);
    if (error) return error;
    if (state.clientState.pendingReward) {
      return HttpResponse.json({ type: 'REWARD_PENDING_CLAIM' }, { status: 409 });
    }

    if (state.clientState.pendingResults || !levelPlay || levelPlay.levelId !== levelId) {
      return HttpResponse.json({ type: 'LEVEL_NOT_IN_PROGRESS' }, { status: 409 });
    }

    const matchedTarget = LEVEL1_TARGETS.find(
      (target) =>
        signature === routeSignature(target.cells) ||
        signature === routeSignature([...target.cells].reverse()),
    );

    if (matchedTarget) {
      const targetAlreadyFound = levelPlay.foundTargets.some(
        (target) => target.targetId === matchedTarget.targetId,
      );
      if (targetAlreadyFound) {
        return p2IdempotentResponse('submit-route', replay.key, descriptor, {
          result: RouteSubmissionResponseResultEnum3.Repeated,
          levelCompleted: false,
          newFoundTargets: [],
          newBonusWords: [],
          nextAction: NextAction.Play,
        });
      }
      const balance = state.clientState.clientView.balance;
      const nextBalance = {
        hintBalance: balance.hintBalance,
        knowledgePoints: balance.knowledgePoints + 1,
      };
      const foundTarget = makeFoundTarget(matchedTarget, levelPlay.foundTargets.length + 1);
      const foundTargets = [...levelPlay.foundTargets, foundTarget];
      const targetsRemaining = LEVEL1_TARGETS.length - foundTargets.length;
      const levelCompleted = targetsRemaining === 0;
      levelPlay = {
        ...levelPlay,
        hintState:
          levelPlay.hintState?.targetId === matchedTarget.targetId ? undefined : levelPlay.hintState,
        foundTargets,
        targetsRemaining,
        nextAction: levelCompleted ? NextAction.StartLevel : NextAction.Play,
      };
      if (levelCompleted) {
        finalizeLevelCompletion(nextBalance, '2026-08-21T12:02:00.000Z');
      } else {
        state = {
          ...state,
          clientState: {
            ...state.clientState,
            clientView: { ...state.clientState.clientView, balance: nextBalance },
          },
        };
      }
      return p2Response('submit-route', replay.key, descriptor, {
        result: RouteSubmissionResponseResultEnum3.Found,
        isTarget: true,
        word: matchedTarget.word,
        targetsRemaining,
        levelCompleted,
        newFoundTargets: [foundTarget],
        newBonusWords: [],
        knowledgePoints: nextBalance.knowledgePoints,
        hintBalance: nextBalance.hintBalance,
        nextAction: levelCompleted ? levelPlay.nextAction : NextAction.Play,
      });
    }

    const configuredTarget = LEVEL1_TARGETS.find(
      (target) => normalizeSelectedBoardWord(target.word) === word,
    );
    if (configuredTarget) {
      return p2IdempotentResponse('submit-route', replay.key, descriptor, {
        result: RouteSubmissionResponseResultEnum3.Invalid,
        outcomeCode: 'TARGET_NONCANONICAL_PATH',
        levelCompleted: false,
        newFoundTargets: [],
        newBonusWords: [],
        nextAction: NextAction.Play,
      });
    }

    const alreadyFoundBonus = levelPlay.bonusWords.some((bonus) => bonus.word === word);
    if (alreadyFoundBonus) {
      return p2IdempotentResponse('submit-route', replay.key, descriptor, {
        result: RouteSubmissionResponseResultEnum3.Repeated,
        levelCompleted: false,
        newFoundTargets: [],
        newBonusWords: [],
        nextAction: NextAction.Play,
      });
    }

    if (LEVEL1_BONUS_WORDS.includes(word)) {
      const balance = state.clientState.clientView.balance;
      const nextBalance = {
        hintBalance: balance.hintBalance,
        knowledgePoints: balance.knowledgePoints + 1,
      };
      const bonusWord = {
        word,
        foundAt: '2026-08-21T12:02:00.000Z',
      };
      const collectingReward = state.clientState.rewards.find(
        (reward) => reward.rewardType === RewardSummaryRewardTypeEnum.Regular,
      );
      if (!collectingReward || collectingReward.status !== RewardSummaryStatusEnum1.Collecting) {
        throw new Error('Missing collecting regular reward');
      }
      const current = (collectingReward.progress?.current ?? 0) + 1;
      const threshold = collectingReward.progress?.threshold ?? regularRewardThreshold(regularRewardCycle);
      const rewardOpened = current >= threshold
        ? makeAvailableRegularReward(regularRewardCycle, current)
        : undefined;
      levelPlay = {
        ...levelPlay,
        bonusWords: [...levelPlay.bonusWords, bonusWord],
        nextAction: rewardOpened ? NextAction.ClaimReward : NextAction.Play,
      };
      state = {
        ...state,
        clientState: {
          ...state.clientState,
          clientView: {
            ...state.clientState.clientView,
            balance: nextBalance,
          },
          rewards: state.clientState.rewards.map((reward) =>
            reward.rewardId === collectingReward.rewardId
              ? rewardOpened ?? makeCollectingRegularReward(regularRewardCycle, current)
              : reward,
          ),
          pendingReward: rewardOpened ? { rewardId: rewardOpened.rewardId } : undefined,
          nextAction: rewardOpened ? NextAction.ClaimReward : NextAction.Play,
        },
      };
      return p2Response('submit-route', replay.key, descriptor, {
        result: RouteSubmissionResponseResultEnum3.Found,
        isTarget: false,
        word,
        targetsRemaining: levelPlay.targetsRemaining,
        levelCompleted: false,
        newFoundTargets: [],
        newBonusWords: [bonusWord],
        knowledgePoints: nextBalance.knowledgePoints,
        hintBalance: nextBalance.hintBalance,
        rewardProgress: current,
        ...(rewardOpened ? { rewardOpened } : {}),
        nextAction: rewardOpened ? NextAction.ClaimReward : NextAction.Play,
      });
    }

    return p2IdempotentResponse('submit-route', replay.key, descriptor, {
      result: RouteSubmissionResponseResultEnum3.Invalid,
      levelCompleted: false,
      newFoundTargets: [],
      newBonusWords: [],
      nextAction: NextAction.Play,
    });
  }),
  http.patch(apiPath('update-settings'), async ({ request }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const error = protocolError(request, true);
    if (error) return error;
    const body = (await request.json()) as UpdateSettingsRequest;
    const settings: SettingsResponse = {
      ...state.clientState.clientView.settings,
      ...body,
    };
    state = {
      ...state,
      clientState: {
        ...state.clientState,
        clientView: { ...state.clientState.clientView, settings },
      },
    };
    return response(settings, true);
  }),
  http.get(apiPath('appearances'), () => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const body: AppearanceCatalogResponse = {
      items: appearances,
      selectedCharacterId: state.clientState.clientView.selectedCharacterId,
      selectedBackgroundId: state.clientState.clientView.selectedBackgroundId,
    };
    return response(body);
  }),
  http.post(apiPath('select-appearance'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const error = protocolError(request, true);
    if (error) return error;
    const appearanceId = String(params.appearanceId);
    const selected = appearances.find((appearance) => appearance.appearanceId === appearanceId);
    if (!selected?.isOwned) {
      return HttpResponse.json({ type: 'APPEARANCE_NOT_OWNED' }, { status: 409 });
    }
    appearances = appearances.map((appearance) => ({
      ...appearance,
      isSelected:
        appearance.type === selected.type
          ? appearance.appearanceId === selected.appearanceId
          : appearance.isSelected,
    }));
    const selectedCharacterId =
      selected.type === AppearanceTypeEnum.Character
        ? selected.appearanceId
        : state.clientState.clientView.selectedCharacterId;
    const selectedBackgroundId =
      selected.type === AppearanceTypeEnum.Background
        ? selected.appearanceId
        : state.clientState.clientView.selectedBackgroundId;
    state = {
      ...state,
      clientState: {
        ...state.clientState,
        clientView: {
          ...state.clientState.clientView,
          selectedCharacterId,
          selectedBackgroundId,
        },
      },
    };
    const body: SelectAppearanceResponse = {
      appearanceId,
      type:
        selected.type === AppearanceTypeEnum.Character
          ? SelectAppearanceResponseTypeEnum.Character
          : SelectAppearanceResponseTypeEnum.Background,
      selectedCharacterId,
      selectedBackgroundId,
    };
    return response(body, true);
  }),
  http.post(apiPath('submit-feedback'), async ({ request }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const rawBody = await request.text();
    const parsed = parseSettingsFeedback(rawBody);
    if ('error' in parsed) return parsed.error;
    const replay = p2Replay('submit-feedback', request, parsed.descriptor);
    if (replay.response) return replay.response;
    const error = protocolError(request, true);
    if (error) return error;
    const result: SubmitFeedbackResponse = {
      feedbackId: '6f8fad5b-d9cb-469f-a165-808677289550',
      status: SubmitFeedbackResponseStatusEnum.Submitted,
      nextAction: NextAction.None,
    };
    return p2Response('submit-feedback', replay.key, parsed.descriptor, result);
  }),
  http.get(apiPath('level-results'), ({ params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    if (!resultsSnapshot || resultsSnapshot.levelId !== String(params.levelId)) {
      return HttpResponse.json({ type: 'LEVEL_NOT_COMPLETED' }, { status: 409 });
    }
    return response(resultsSnapshot);
  }),
  http.post(apiPath('acknowledge-results'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const levelId = String(params.levelId);
    const descriptor = `acknowledge:${levelId}:no-body`;
    const replay = p2Replay('acknowledge-results', request, descriptor);
    if (replay.response) return replay.response;

    const error = protocolError(request, true);
    if (error) return error;
    if (!resultsSnapshot || resultsSnapshot.levelId !== levelId) {
      return HttpResponse.json({ type: 'LEVEL_NOT_COMPLETED' }, { status: 409 });
    }

    const nextAction = acknowledgementNextAction(resultsSnapshot);
    if (resultsSnapshot.resultsState === LevelResultsResponseResultsStateEnum.Acknowledged) {
      return HttpResponse.json({ type: 'RESULTS_ALREADY_ACKNOWLEDGED' }, { status: 409 });
    }

    resultsAcknowledgedAt = '2026-08-21T12:03:00.000Z';
    const pendingReward = nextAction === NextAction.ClaimReward && resultsSnapshot.reward
      ? { rewardId: resultsSnapshot.reward.rewardId }
      : undefined;
    resultsSnapshot = {
      ...resultsSnapshot,
      resultsState: LevelResultsResponseResultsStateEnum.Acknowledged,
    };
    state = {
      ...state,
      clientState: {
        ...state.clientState,
        pendingResults:
          state.clientState.pendingResults?.levelId === levelId
            ? undefined
            : state.clientState.pendingResults,
        pendingReward,
        nextAction,
      },
    };
    const body: AcknowledgeLevelResultsResponse = {
      levelId,
      resultsAcknowledgedAt,
      resultsState: AcknowledgeLevelResultsResponseResultsStateEnum.Acknowledged,
      nextAction,
      ...(pendingReward ? { pendingReward } : {}),
    };
    return p2Response('acknowledge-results', replay.key, descriptor, body);
  }),
  http.post(apiPath('claim-reward'), async ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const key = request.headers.get('idempotency-key');
    if (!key) {
      return HttpResponse.json({ type: 'IDEMPOTENCY_KEY_REQUIRED' }, { status: 400 });
    }
    const rawBody = await request.text();
    const rewardId = String(params.rewardId);
    if (!isUuid(rewardId)) {
      return validationProblem('INVALID_FORMAT', 'path.rewardId', 'Некорректный rewardId');
    }
    if (rawBody.trim().length === 0) {
      return validationProblem('REQUIRED_FIELD', 'body.rewardType', 'Поле rewardType обязательно');
    }
    const parsedRequest = parseClaimRequest(rawBody);
    if ('error' in parsedRequest) return parsedRequest.error;
    const descriptor = `claim:${rewardId}:${rawBody}`;
    const replay = rewardReplays.get(key);
    if (replay) {
      return replay.descriptor === descriptor
        ? HttpResponse.json(replay.response as JsonBodyType, {
            headers: {
              ETag: replay.etag,
              'Idempotency-Key-Status': 'replayed',
            },
          })
        : HttpResponse.json({ type: 'IDEMPOTENCY_KEY_REUSED' }, { status: 409 });
    }
    const error = protocolError(request, true);
    if (error) return error;
    const body = parsedRequest.claim;
    const hintSelected = body.rewardType === 'hint';
    const reward = state.clientState.rewards.find(
      (candidate) => candidate.rewardId === rewardId,
    );
    if (!reward) {
      return HttpResponse.json(
        { type: claimedRewardIds.has(rewardId) ? 'REWARD_ALREADY_CLAIMED' : 'REWARD_NOT_FOUND' },
        { status: claimedRewardIds.has(rewardId) ? 409 : 404 },
      );
    }
    if (reward.status !== RewardSummaryStatusEnum.Available) {
      return HttpResponse.json({ type: 'REWARD_NOT_AVAILABLE' }, { status: 409 });
    }
    if (resultsSnapshot?.reward?.rewardId === reward.rewardId &&
      resultsSnapshot.resultsState !== LevelResultsResponseResultsStateEnum.Acknowledged) {
      return HttpResponse.json({ type: 'RESULTS_ACKNOWLEDGEMENT_REQUIRED' }, { status: 409 });
    }
    if (state.clientState.pendingReward?.rewardId !== reward.rewardId) {
      return HttpResponse.json({ type: 'REWARD_NOT_AVAILABLE' }, { status: 409 });
    }
    const selectedOption = reward.options?.find((option) =>
      option.optionType === (
        hintSelected
          ? RewardOptionOptionTypeEnum.Hint
          : RewardOptionOptionTypeEnum.Decoration
      ) &&
      (hintSelected || option.optionId === body.selectedOptionId),
    );
    if (!selectedOption) {
      return HttpResponse.json({ type: 'REWARD_OPTION_UNAVAILABLE' }, { status: 409 });
    }
    const decoration = !hintSelected
      ? appearances.find(
          (appearance) => appearance.appearanceId === body.selectedOptionId,
        )
      : undefined;
    if (!hintSelected && !decoration) {
      return HttpResponse.json({ type: 'REWARD_OPTION_UNAVAILABLE' }, { status: 409 });
    }
    const balance = {
      ...state.clientState.clientView.balance,
      hintBalance:
          state.clientState.clientView.balance.hintBalance +
        (hintSelected ? selectedOption?.amount ?? 0 : 0),
    };
    if (decoration) {
      appearances = appearances.map((appearance) =>
        appearance.appearanceId === decoration.appearanceId
          ? { ...appearance, isOwned: true, unlockedAt: '2026-08-20T10:01:00.000Z' }
          : appearance,
      );
    }
    const isRegularReward = reward.rewardType === RewardSummaryRewardTypeEnum.Regular;
    if (isRegularReward) regularRewardCycle += 1;
    const nextAction = isRegularReward ? NextAction.Play : NextAction.StartLevel;
    state = {
      ...state,
      clientState: {
        ...state.clientState,
        clientView: { ...state.clientState.clientView, balance },
        rewards: state.clientState.rewards.flatMap((candidate) =>
          candidate.rewardId !== reward.rewardId
            ? [candidate]
            : isRegularReward
              ? [makeCollectingRegularReward(regularRewardCycle)]
              : [],
        ),
        pendingReward:
          state.clientState.pendingReward?.rewardId === reward.rewardId
            ? undefined
            : state.clientState.pendingReward,
        nextAction,
      },
    };
    claimedRewardIds.add(reward.rewardId);
    const result: ClaimRewardResponse = {
      rewardId: reward.rewardId,
      rewardType:
        reward.rewardType === RewardSummaryRewardTypeEnum.ChapterGolden
          ? ClaimRewardResponseRewardTypeEnum.ChapterGolden
          : ClaimRewardResponseRewardTypeEnum.Regular,
      state: ClaimRewardResponseStateEnum.Claimed,
      selectedOption: {
        selectedOptionType: hintSelected
          ? SelectedOptionSelectedOptionTypeEnum.Hint
          : SelectedOptionSelectedOptionTypeEnum.Decoration,
        ...(!hintSelected ? { selectedOptionId: body.selectedOptionId } : {}),
      },
      claimResult: {
        balance,
        ...(decoration
          ? {
              decoration: {
                appearanceId: decoration.appearanceId,
                type:
                  decoration.type === AppearanceTypeEnum.Character
                    ? ClaimResultTypeEnum.Character
                    : ClaimResultTypeEnum.Background,
              },
            }
          : {}),
      },
      nextAction,
    };
    version += 1;
    const responseEtag = etag();
    rewardReplays.set(key, { descriptor, body: rawBody, response: result, etag: responseEtag });
    persistFakeDb();
    return HttpResponse.json(result as JsonBodyType, {
      headers: {
        ETag: responseEtag,
        'Idempotency-Key-Status': 'processed',
      },
    });
  }),
];
