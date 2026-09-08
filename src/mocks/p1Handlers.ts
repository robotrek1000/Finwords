import { http, HttpResponse } from 'msw';
import type { JsonBodyType } from 'msw';
import type {
  Appearance,
  AppearanceCatalogResponse,
  AcknowledgeLevelResultsResponse,
  CellRef,
  ClaimRewardResponse,
  ClientStateResponse,
  ConfirmCampaignCompleteShownResponse,
  ConfirmNarrativeShownResponse,
  CourseOffer,
  DismissFeedbackResponse,
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
} from '../infra/api/generated/data-contracts';
import {
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
} from '../infra/api/generated/data-contracts';
import { operationRegistry } from '../infra/api/operationRegistry';
import { CAMPAIGN_CHAPTERS, LEVELS } from '../content/campaign';
import {
  type AppearanceAssetId,
  MOCK_APPEARANCE_IDENTITIES,
  createMockAppearanceCatalog,
  nextUnlockAppearance,
} from './appearanceCatalog';
import { toMswPath } from './handlerFactory';
import {
  createMockPersistence,
  type MockPersistence,
  type MockPersistenceRuntimeOptions,
} from './mockPersistence';

const CHARACTER_IDS = MOCK_APPEARANCE_IDENTITIES
  .filter((item) => item.type === AppearanceTypeEnum.Character)
  .map((item) => item.appearanceId);
const BACKGROUND_IDS = MOCK_APPEARANCE_IDENTITIES
  .filter((item) => item.type === AppearanceTypeEnum.Background)
  .map((item) => item.appearanceId);
const REWARD_ID = '3f8fad5b-d9cb-469f-a165-808677289530';
const CHAPTER_GOLDEN_REWARD_ID = 'af8fad5b-d9cb-469f-a165-8086772895aa';
const CHAPTER_GOLDEN_REWARD_IDS = [
  CHAPTER_GOLDEN_REWARD_ID,
  'af8fad5b-d9cb-469f-a165-8086772895ab',
  'af8fad5b-d9cb-469f-a165-8086772895ac',
  'af8fad5b-d9cb-469f-a165-8086772895ad',
  'af8fad5b-d9cb-469f-a165-8086772895ae',
  'af8fad5b-d9cb-469f-a165-8086772895af',
  'af8fad5b-d9cb-469f-a165-8086772895b0',
];
const LEVEL_IDS = Array.from(
  { length: 50 },
  (_, index) => `4f8fad5b-d9cb-469f-a165-${String(808677289500 + index)}`,
);
const LEVEL_VERSION_IDS = Array.from(
  { length: 50 },
  (_, index) => `5f8fad5b-d9cb-469f-a165-${String(808677289510 + index)}`,
);
const LEVEL1_COURSE_OFFER: CourseOffer = {
  courseId: '6f8fad5b-d9cb-469f-a165-80867728951e',
  locale: 'ru-RU',
  badgeLabel: 'Мини-курс',
  title: 'АКЦИЯ',
};
const PERSISTED_STATE_KEY = 'finwords:p1-mock-backend:v1';
const PERSISTED_STATE_VERSION = 8;
const REGULAR_REWARD_THRESHOLDS = [4, 6, 8, 10] as const;

interface CampaignTarget {
  slug: string;
  targetId: string;
  word: string;
  definition: string;
  cells: CellRef[];
}

function cellIdToCellRef(cellId: string): CellRef {
  const [row, col] = cellId.split(':');
  return { row: Number(row) - 1, col: Number(col) - 1 };
}

const CAMPAIGN_TARGETS = Object.fromEntries(
  Object.values(LEVELS).map((level) => [
    level.id,
    level.targets.map((target, index): CampaignTarget => ({
      slug: target.id,
      targetId: `7f8fad5b-d9cb-469f-a165-${String(808677280000 + level.id * 100 + index)}`,
      word: target.word,
      definition: target.definition,
      cells: target.path.map(cellIdToCellRef),
    })),
  ]),
) as Record<number, CampaignTarget[]>;

function apiPath(apiId: string): string {
  const operation = operationRegistry.find((candidate) => candidate.apiId === apiId);
  if (!operation) throw new Error(`Missing operation ${apiId}`);
  return toMswPath(operation.templatePath);
}

function makeAppearances(): Appearance[] {
  return createMockAppearanceCatalog();
}

interface P1FakeDbOptions {
  pendingReward?: boolean;
  chapterCompletion?: boolean;
  campaignBoundaryLevel?: 9 | 17 | 24 | 31 | 38 | 44 | 50;
  hintBalance?: number;
  regularRewardCycle?: number;
  regularRewardProgress?: number;
  gameUnavailable?: boolean;
  clientNotFound?: boolean;
  feedbackPreviouslyDismissed?: boolean;
  firstRunCompleted?: boolean;
  ownedAppearanceAssetIds?: readonly AppearanceAssetId[];
  failAppearanceSelectionOnce?: boolean;
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
  const decoration = nextUnlockAppearance(appearances, 'regular');
  return {
    rewardId: regularRewardId(cycle),
    rewardType: RewardSummaryRewardTypeEnum.Regular,
    status: RewardSummaryStatusEnum.Available,
    availableAt: '2026-08-21T12:02:00.000Z',
    hintOptionAmount: 1,
    ...(decoration ? { decorationOptionId: decoration.appearanceId } : {}),
    progress: { current, threshold: regularRewardThreshold(cycle) },
    options: [
      {
        optionType: RewardOptionOptionTypeEnum.Hint,
        amount: 1,
        title: 'Подсказка',
      },
      ...(decoration ? [{
        optionType: RewardOptionOptionTypeEnum.Decoration,
        optionId: decoration.appearanceId,
        title: decoration.title,
        imageUrl: decoration.imageUrl,
        decorationType: decoration.type === AppearanceTypeEnum.Character
          ? RewardOptionDecorationTypeEnum.Character
          : RewardOptionDecorationTypeEnum.Background,
      }] : []),
    ],
  };
}

function makeClientState(options: P1FakeDbOptions = {}): ClientStateResponse {
  const regularCycle = options.regularRewardCycle ?? 0;
  const regularProgress = options.regularRewardProgress ?? 0;
  const activeLevelNumber = options.campaignBoundaryLevel ?? (options.chapterCompletion ? 9 : 1);
  const completedKnowledge = Array.from(
    { length: activeLevelNumber - 1 },
    (_unused, index) => LEVELS[index + 1].targets.length,
  ).reduce((total, count) => total + count, 0);
  const levels = Array.from({ length: 50 }, (_, index) => ({
    levelId: LEVEL_IDS[index],
    status:
      index + 1 < activeLevelNumber
        ? LevelProgressSummaryStatusEnum.Completed
        : index + 1 === activeLevelNumber
          ? LevelProgressSummaryStatusEnum.Available
          : LevelProgressSummaryStatusEnum.Locked,
    ...(index + 1 < activeLevelNumber
      ? { completedAt: '2026-08-21T11:00:00.000Z' }
      : {}),
  }));
  return {
    clientState: {
      clientView: {
        balance: { knowledgePoints: completedKnowledge, hintBalance: options.hintBalance ?? 5 },
        settings: {
          musicEnabled: true,
          soundEnabled: true,
          tutorialCompleted:
            options.firstRunCompleted === true || activeLevelNumber > 1,
        },
        selectedCharacterId: CHARACTER_IDS[0],
        selectedBackgroundId: BACKGROUND_IDS[0],
        campaignProgress: { isCompleted: false, isCompletionShown: false },
      },
      chapters: CAMPAIGN_CHAPTERS.map((chapter, index) => {
        const totalLevels = chapter.levelEnd - chapter.levelStart + 1;
        const isCompleted = chapter.levelEnd < activeLevelNumber;
        const isActive = activeLevelNumber >= chapter.levelStart && activeLevelNumber <= chapter.levelEnd;
        const completedLevels = isCompleted
          ? totalLevels
          : isActive
            ? activeLevelNumber - chapter.levelStart
            : 0;
        const isNarrativeShown = isCompleted || (
          isActive && (options.firstRunCompleted === true || activeLevelNumber > 1)
        );
        return {
          chapterId: `5f8fad5b-d9cb-469f-a165-80867728954${index}`,
          number: chapter.number,
          title: chapter.title,
          imageUrl: `${import.meta.env.BASE_URL}assets/p1/chapter-${String(index + 1).padStart(2, '0')}.png`,
          status: isCompleted
            ? ChapterProgressStatusEnum.Completed
            : isActive
              ? ChapterProgressStatusEnum.InProgress
              : ChapterProgressStatusEnum.Locked,
          completedLevels,
          totalLevels,
          isNarrativeShown,
          ...(!isNarrativeShown && isActive ? { narrativeText: chapter.narrative } : {}),
        };
      }),
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
let appearances = makeAppearances();
let state = makeClientState();
let levelPlay: LevelPlayResponse | null = null;
let resultsSnapshot: LevelResultsResponse | null = null;
let resultsAcknowledgedAt: string | null = null;
let chapterCompletionScenario = false;
let gameUnavailableScenario = false;
let clientNotFoundScenario = false;
let claimedRewardIds = new Set<string>();
let regularRewardCycle = 0;
let feedbackSubmittedGlobally = false;
let feedbackEligibleChapterId: string | null = null;
let feedbackPromptDismissals = new Map<string, string>();
let failAppearanceSelectionOnce = false;
let persistenceRestoreError: string | null = null;

type ReplayApiId = 'API-001' | 'API-003' | 'API-004' | 'API-006' | 'API-007' | 'API-010' | 'API-013' | 'API-014' | 'API-015' | 'API-017';

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
  feedbackSubmittedGlobally: boolean;
  feedbackEligibleChapterId: string | null;
  feedbackPromptDismissals: Array<[string, string]>;
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
  const runtimeConfig = typeof window === 'undefined'
    ? undefined
    : window.__FINWORDS_RUNTIME_CONFIG__;
  const runtimeApiMode = runtimeConfig && 'apiMode' in runtimeConfig &&
    typeof runtimeConfig.apiMode === 'string'
    ? runtimeConfig.apiMode
    : 'mock';
  return createMockPersistence({
    storage: getBrowserStorage(),
    storageKey: PERSISTED_STATE_KEY,
    isDev: overrides.isDev ?? import.meta.env.DEV,
    apiMode: overrides.apiMode ?? runtimeApiMode,
    search: overrides.search ?? (typeof window === 'undefined' ? '' : window.location.search),
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
    feedbackSubmittedGlobally,
    feedbackEligibleChapterId,
    feedbackPromptDismissals: [...feedbackPromptDismissals.entries()],
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

function isDismissFeedbackResponse(value: unknown): value is DismissFeedbackResponse {
  return isRecord(value) && isUuid(value.chapterId) &&
    typeof value.feedbackPromptShownAt === 'string' && typeof value.nextAction === 'string';
}

function isAcknowledgeLevelResultsResponse(value: unknown): value is AcknowledgeLevelResultsResponse {
  return isRecord(value) && isUuid(value.levelId) && typeof value.resultsAcknowledgedAt === 'string' &&
    value.resultsState === AcknowledgeLevelResultsResponseResultsStateEnum.Acknowledged &&
    typeof value.nextAction === 'string' &&
    (value.pendingReward === undefined ||
      (isRecord(value.pendingReward) && isUuid(value.pendingReward.rewardId)));
}

function isConfirmCampaignCompleteShownResponse(
  value: unknown,
): value is ConfirmCampaignCompleteShownResponse {
  return isRecord(value) && value.isCompletionShown === true && value.nextAction === NextAction.None;
}

function replayApiId(key: string): ReplayApiId | undefined {
  const separator = key.indexOf(':');
  if (separator <= 0 || separator === key.length - 1) return undefined;
  const apiId = key.slice(0, separator) as ReplayApiId;
  return ['API-001', 'API-003', 'API-004', 'API-006', 'API-007', 'API-010', 'API-013', 'API-014', 'API-015', 'API-017'].includes(apiId)
    ? apiId
    : undefined;
}

function isReplayDescriptor(apiId: ReplayApiId, descriptor: string, body: unknown): boolean {
  switch (apiId) {
    case 'API-001':
      return descriptor === 'bootstrap:no-body' && isClientState(body);
    case 'API-003':
      return descriptor.startsWith('narrative:') && isUuid(descriptor.slice('narrative:'.length)) &&
        isRecord(body) && body.chapterId === descriptor.slice('narrative:'.length) &&
        body.isNarrativeShown === true && typeof body.nextAction === 'string';
    case 'API-004':
      return isUuid(descriptor.slice('start:'.length)) && descriptor.startsWith('start:') &&
        isLevelPlay(body);
    case 'API-006': {
      const match = /^route:([^:]+):(?:\d+:\d+)(?:\|\d+:\d+)*$/.exec(descriptor);
      return match !== null && isUuid(match[1]) && isRouteSubmissionResponse(body);
    }
    case 'API-007':
      return descriptor.startsWith('hint:') && isUuid(descriptor.slice('hint:'.length)) &&
        isHintUseResponse(body);
    case 'API-010':
      return /^settings:music=(?:true|false|-):sound=(?:true|false|-)$/.test(descriptor) &&
        descriptor !== 'settings:music=-:sound=-' &&
        isRecord(body) &&
        typeof body.musicEnabled === 'boolean' &&
        typeof body.soundEnabled === 'boolean' &&
        typeof body.tutorialCompleted === 'boolean' &&
        Object.keys(body).every((field) =>
          ['musicEnabled', 'soundEnabled', 'tutorialCompleted'].includes(field));
    case 'API-013':
      return isNormalizedFeedbackDescriptor(descriptor) && isSubmitFeedbackResponse(body);
    case 'API-014':
      return descriptor.startsWith('dismiss-feedback:') && descriptor.endsWith(':no-body') &&
        isUuid(descriptor.slice('dismiss-feedback:'.length, -':no-body'.length)) &&
        isDismissFeedbackResponse(body);
    case 'API-015':
      return descriptor === 'campaign-completion:no-body' &&
        isConfirmCampaignCompleteShownResponse(body);
    case 'API-017':
      return descriptor.startsWith('acknowledge:') && descriptor.endsWith(':no-body') &&
        isUuid(descriptor.slice('acknowledge:'.length, -':no-body'.length)) &&
        isAcknowledgeLevelResultsResponse(body);
  }
}

function isNormalizedFeedbackDescriptor(descriptor: string): boolean {
  if (!descriptor.startsWith('feedback:')) return false;
  try {
    const body = JSON.parse(descriptor.slice('feedback:'.length)) as unknown;
    if (!isRecord(body) || (body.source !== 'settings' && body.source !== 'chapter_completion') ||
      typeof body.rating !== 'number' ||
      !Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5 ||
      (body.comment !== undefined && typeof body.comment !== 'string')) {
      return false;
    }
    const fields = Object.keys(body);
    if (fields.some((field) => !['source', 'chapterId', 'rating', 'comment'].includes(field))) {
      return false;
    }
    if (body.source === 'chapter_completion' && !isUuid(body.chapterId)) return false;
    if (body.source === 'settings' && body.chapterId !== undefined) return false;
    const normalized = {
      source: body.source,
      ...(body.source === 'chapter_completion' ? { chapterId: body.chapterId } : {}),
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
    const matchingTargets = Object.values(CAMPAIGN_TARGETS)
      .flat()
      .filter((candidate) => candidate.word === target.word);
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

function inferLegacyHintTarget(revealedCells: unknown, levelNumber?: number): CampaignTarget | undefined {
  if (!Array.isArray(revealedCells) || revealedCells.length === 0 || !revealedCells.every(isCellRef)) {
    return undefined;
  }
  const cells = revealedCells as CellRef[];
  const migrationTargets = levelNumber && CAMPAIGN_TARGETS[levelNumber]
    ? CAMPAIGN_TARGETS[levelNumber]
    : Object.values(CAMPAIGN_TARGETS).flat();
  const prefixMatches = migrationTargets.filter((target) =>
    target.cells.length >= cells.length && cells.every((cell, index) => isSameCell(cell, target.cells[index])),
  );
  if (prefixMatches.length === 1) return prefixMatches[0];
  if (prefixMatches.length > 1) return undefined;

  const subsetMatches = migrationTargets.filter((target) =>
    cells.every((cell) => target.cells.some((targetCell) => isSameCell(cell, targetCell))),
  );
  return subsetMatches.length === 1 ? subsetMatches[0] : undefined;
}

function migrateLegacyHintState(value: unknown, levelNumber?: number): unknown {
  if (!isRecord(value)) return value;
  const target = inferLegacyHintTarget(value.revealedCells, levelNumber);
  return target ? { targetId: target.targetId, revealedCells: value.revealedCells } : undefined;
}

function migrateCampaignState(value: unknown): unknown {
  if (!isRecord(value) || !isRecord(value.clientState)) return value;
  const fresh = makeClientState().clientState;
  const existingLevels = Array.isArray(value.clientState.levels)
    ? value.clientState.levels
    : [];
  const levels = fresh.levels.map((base, index) => {
    const existing = isRecord(existingLevels[index]) ? existingLevels[index] : undefined;
    return existing ? { ...base, ...existing, levelId: base.levelId } : base;
  });
  if (
    levels[0]?.status === LevelProgressSummaryStatusEnum.Completed
    && levels[1]?.status === LevelProgressSummaryStatusEnum.Locked
  ) {
    levels[1] = { ...levels[1], status: LevelProgressSummaryStatusEnum.Available };
  }

  const existingChapters = Array.isArray(value.clientState.chapters)
    ? value.clientState.chapters
    : [];
  const chapters = fresh.chapters.map((base, index) => {
    const existing = isRecord(existingChapters[index]) ? existingChapters[index] : undefined;
    return existing ? {
      ...base,
      ...existing,
      number: base.number,
      title: base.title,
      totalLevels: base.totalLevels,
      narrativeText: base.narrativeText,
    } : base;
  });
  return {
    ...value,
    clientState: {
      ...fresh,
      ...value.clientState,
      chapters,
      levels,
    },
  };
}

function migratePersistedFakeDb(value: unknown): unknown {
  if (!isRecord(value) || ![4, 5, 6, 7].includes(Number(value.schemaVersion))) return value;

  const levelPlayValue = value.schemaVersion === 4 && isRecord(value.levelPlay)
    ? {
        ...value.levelPlay,
        foundTargets: migrateFoundTargets(value.levelPlay.foundTargets),
        hintState: migrateLegacyHintState(
          value.levelPlay.hintState,
          typeof value.levelPlay.levelNumber === 'number' ? value.levelPlay.levelNumber : undefined,
        ),
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
          !replay.key.startsWith('API-006:') ||
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
    state: migrateCampaignState(stateValue),
    levelPlay: levelPlayValue,
    resultsSnapshot: resultsSnapshotValue,
    regularRewardCycle: value.schemaVersion === 4 ? 0 : value.regularRewardCycle,
    p2Replays,
    gameUnavailableScenario: value.schemaVersion === 5 ? false : value.gameUnavailableScenario,
    clientNotFoundScenario: value.schemaVersion === 5 ? false : value.clientNotFoundScenario,
    feedbackSubmittedGlobally: false,
    feedbackEligibleChapterId: null,
    feedbackPromptDismissals: [],
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
    typeof value.feedbackSubmittedGlobally === 'boolean' &&
    (value.feedbackEligibleChapterId === null || isUuid(value.feedbackEligibleChapterId)) &&
    Array.isArray(value.feedbackPromptDismissals) && value.feedbackPromptDismissals.every(
      (entry) => Array.isArray(entry) && entry.length === 2 && isUuid(entry[0]) && typeof entry[1] === 'string',
    ) &&
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
      persistenceRestoreError = 'Persisted mock state is incompatible with campaign schema 8.';
      return;
    }

    persistenceRestoreError = null;

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
    feedbackSubmittedGlobally = persisted.feedbackSubmittedGlobally;
    feedbackEligibleChapterId = persisted.feedbackEligibleChapterId;
    feedbackPromptDismissals = new Map(persisted.feedbackPromptDismissals);
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
  } catch (error) {
    persistenceRestoreError = error instanceof Error
      ? error.message
      : 'Persisted mock state migration failed.';
  }
}

restoreFakeDb();

function makeLevelPlay(levelNumber: number): LevelPlayResponse {
  const level = LEVELS[levelNumber as keyof typeof LEVELS];
  const targets = CAMPAIGN_TARGETS[levelNumber];
  if (!level || !targets) throw new Error(`Missing campaign level ${levelNumber}`);
  return {
    levelId: LEVEL_IDS[levelNumber - 1],
    levelVersionId: LEVEL_VERSION_IDS[levelNumber - 1],
    levelNumber,
    microtheme: level.title,
    status: LevelPlayResponseStatusEnum.InProgress,
    board: {
      size: level.grid.length,
      cells: level.grid.flatMap((row, rowIndex) =>
        row.map((letter, colIndex) => ({
          row: rowIndex,
          col: colIndex,
          letter,
          state: CellViewStateEnum.Letter,
          belongsToFoundWord: false,
        })),
      ).reverse(),
    },
    targetsRemaining: targets.length,
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

// Stores a non-mutating API-006 outcome (invalid/repeated) for idempotent
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

function parseSettingsRequest(rawBody: string):
  | { settings: UpdateSettingsRequest; descriptor: string }
  | { error: Response } {
  if (new TextEncoder().encode(rawBody).byteLength > 32 * 1024) {
    return {
      error: validationProblem('TOO_LARGE_PAYLOAD', 'body', 'Тело запроса превышает 32 KiB'),
    };
  }
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
  if ('tutorialCompleted' in body) {
    return {
      error: validationProblem(
        'READ_ONLY_FIELD',
        'body.tutorialCompleted',
        'tutorialCompleted управляется сервером',
      ),
    };
  }
  const allowedFields = new Set(['musicEnabled', 'soundEnabled']);
  const unknownField = Object.keys(body).find((field) => !allowedFields.has(field));
  if (unknownField) {
    return {
      error: validationProblem('UNKNOWN_FIELD', `body.${unknownField}`, 'Поле не поддерживается'),
    };
  }
  if (!('musicEnabled' in body) && !('soundEnabled' in body)) {
    return {
      error: validationProblem(
        'REQUIRED_FIELD',
        'body',
        'Требуется хотя бы одно из полей musicEnabled или soundEnabled',
      ),
    };
  }
  if ('musicEnabled' in body && typeof body.musicEnabled !== 'boolean') {
    return {
      error: validationProblem('INVALID_FORMAT', 'body.musicEnabled', 'Ожидается boolean'),
    };
  }
  if ('soundEnabled' in body && typeof body.soundEnabled !== 'boolean') {
    return {
      error: validationProblem('INVALID_FORMAT', 'body.soundEnabled', 'Ожидается boolean'),
    };
  }
  const settings: UpdateSettingsRequest = {
    ...('musicEnabled' in body ? { musicEnabled: body.musicEnabled as boolean } : {}),
    ...('soundEnabled' in body ? { soundEnabled: body.soundEnabled as boolean } : {}),
  };
  return {
    settings,
    descriptor: `settings:music=${settings.musicEnabled ?? '-'}:sound=${settings.soundEnabled ?? '-'}`,
  };
}

type ValidFeedback = {
  source: 'settings' | 'chapter_completion';
  chapterId?: string;
  rating: number;
  comment?: string;
};

function parseFeedback(rawBody: string):
  | { feedback: ValidFeedback; descriptor: string }
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
  if (body.source !== 'settings' && body.source !== 'chapter_completion') {
    return { error: validationProblem('INVALID_VALUE', 'body.source', 'Недопустимое значение source') };
  }
  if (body.source === 'settings' && 'chapterId' in body) {
    return { error: validationProblem('FORBIDDEN_FIELD', 'body.chapterId', 'chapterId запрещён для source=settings') };
  }
  if (body.source === 'chapter_completion' && !('chapterId' in body)) {
    return { error: validationProblem('REQUIRED_FIELD', 'body.chapterId', 'chapterId обязателен для source=chapter_completion') };
  }
  if (body.source === 'chapter_completion' && !isUuid(body.chapterId)) {
    return { error: validationProblem('INVALID_FORMAT', 'body.chapterId', 'Некорректный chapterId') };
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
  const feedback: ValidFeedback = {
    source: body.source,
    ...(body.source === 'chapter_completion' ? { chapterId: String(body.chapterId) } : {}),
    rating,
    ...(typeof body.comment === 'string' ? { comment: body.comment } : {}),
  };
  return { feedback, descriptor: `feedback:${JSON.stringify(feedback)}` };
}

function availabilityError(): Response | null {
  if (persistenceRestoreError) {
    return HttpResponse.json({
      type: 'PERSISTENCE_MIGRATION_FAILED',
      payload: { reason: persistenceRestoreError },
    }, { status: 500 });
  }
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

function nextActionAfterChapter(chapterId: string): NextAction {
  const chapter = state.clientState.chapters.find((item) => item.chapterId === chapterId);
  return chapter?.number === 7 && state.clientState.clientView.campaignProgress.isCompleted
    ? NextAction.CampaignComplete
    : NextAction.NextChapter;
}

function activeLevelNumber(): number | undefined {
  return levelPlay?.levelNumber;
}

function activeLevelTargets(): CampaignTarget[] {
  const levelNumber = activeLevelNumber();
  return levelNumber ? CAMPAIGN_TARGETS[levelNumber] ?? [] : [];
}

function routeWord(route: CellRef[]): string {
  const levelNumber = activeLevelNumber();
  const grid = levelNumber ? LEVELS[levelNumber as keyof typeof LEVELS]?.grid : undefined;
  return route.map((cell) => grid?.[cell.row]?.[cell.col] ?? '').join('');
}

function normalizeSelectedBoardWord(word: string): string {
  return word.normalize('NFC').trim().toLocaleUpperCase('ru-RU');
}

function routeSignature(route: CellRef[]): string {
  return route.map((cell) => `${cell.row}:${cell.col}`).join('|');
}

function makeFoundTarget(target: CampaignTarget, foundSequence: number): FoundTarget {
  return {
    targetId: target.targetId,
    foundSequence,
    word: target.word,
    definition: target.definition,
    cells: target.cells,
    foundAt: '2026-08-21T12:02:00.000Z',
  };
}

function activeHintTarget(): CampaignTarget | undefined {
  if (!levelPlay) return undefined;
  const targets = activeLevelTargets();
  const activeTargetId = levelPlay.hintState?.targetId;
  const activeTarget = targets.find((target) => target.targetId === activeTargetId);
  if (activeTarget && !levelPlay.foundTargets.some((found) => found.targetId === activeTarget.targetId)) {
    return activeTarget;
  }
  return targets.find(
    (target) => !levelPlay?.foundTargets.some((found) => found.targetId === target.targetId),
  );
}

function makeChapterGoldenReward(chapterNumber = 1, threshold = 9): RewardSummary {
  const decoration = nextUnlockAppearance(appearances, 'special');
  const rewardId = CHAPTER_GOLDEN_REWARD_IDS[chapterNumber - 1];
  if (!rewardId) throw new Error(`Missing golden reward id for chapter ${chapterNumber}`);
  return {
    rewardId,
    rewardType: RewardSummaryRewardTypeEnum.ChapterGolden,
    status: RewardSummaryStatusEnum.Available,
    availableAt: '2026-08-21T12:02:00.000Z',
    hintOptionAmount: 3,
    ...(decoration ? { decorationOptionId: decoration.appearanceId } : {}),
    progress: { current: threshold, threshold },
    options: [
      {
        optionType: RewardOptionOptionTypeEnum.Hint,
        amount: 3,
        title: 'Три подсказки',
        imageUrl: `${import.meta.env.BASE_URL}assets/p1/reward-hints.png`,
      },
      ...(decoration ? [{
        optionType: RewardOptionOptionTypeEnum.Decoration,
        optionId: decoration.appearanceId,
        title: decoration.title,
        imageUrl: decoration.imageUrl,
        decorationType: decoration.type === AppearanceTypeEnum.Character
          ? RewardOptionDecorationTypeEnum.Character
          : RewardOptionDecorationTypeEnum.Background,
      }] : []),
    ],
  };
}

function finalizeLevelCompletion(
  balance: { knowledgePoints: number; hintBalance: number },
  completedAt: string,
): void {
  if (!levelPlay) throw new Error('Cannot finalize a missing level');

  const levelNumber = levelPlay.levelNumber;
  const chapterIndex = CAMPAIGN_CHAPTERS.findIndex((chapter) => (
    levelNumber >= chapter.levelStart && levelNumber <= chapter.levelEnd
  ));
  const chapterDefinition = CAMPAIGN_CHAPTERS[chapterIndex];
  const currentChapter = state.clientState.chapters[chapterIndex];
  if (!chapterDefinition || !currentChapter) {
    throw new Error(`Missing campaign chapter for level ${levelNumber}`);
  }
  const targets = activeLevelTargets();
  const completesChapter = chapterCompletionScenario || levelNumber === chapterDefinition.levelEnd;
  const completionKind = completesChapter
    ? LevelResultsResponseCompletionKindEnum.Chapter
    : LevelResultsResponseCompletionKindEnum.Level;
  const chapterStatus = completesChapter
    ? LevelResultsResponseStatusEnum1.Completed
    : LevelResultsResponseStatusEnum1.InProgress;
  const alreadyCompleted = state.clientState.levels
    .slice(chapterDefinition.levelStart - 1, chapterDefinition.levelEnd)
    .filter((level) => level.status === LevelProgressSummaryStatusEnum.Completed)
    .length;
  const completedLevels = Math.min(currentChapter.totalLevels, alreadyCompleted + 1);
  const reward = completesChapter
    ? makeChapterGoldenReward(currentChapter.number, currentChapter.totalLevels)
    : undefined;
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
      levelNumber === 6 && target.word === 'КУРС'
        ? { ...target, courseOffer: LEVEL1_COURSE_OFFER }
        : target,
    ),
    bonusWords: levelPlay.bonusWords,
    completedAt,
    summary: {
      earnedKnowledgePoints: targets.length,
      knowledgePointsTotal: balance.knowledgePoints,
      targets: {
        foundCount: levelPlay.foundTargets.length,
        totalCount: targets.length,
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
      clientView: {
        ...state.clientState.clientView,
        balance,
        campaignProgress: {
          ...state.clientState.clientView.campaignProgress,
          isCompleted: levelNumber === 50,
        },
      },
      inProgressLevel: undefined,
      chapters: state.clientState.chapters.map((chapter, index) =>
        index === chapterIndex
          ? {
              ...chapter,
              completedLevels,
              status: completesChapter
                ? ChapterProgressStatusEnum.Completed
                : ChapterProgressStatusEnum.InProgress,
            }
          : index === chapterIndex + 1 && completesChapter
            ? { ...chapter, status: ChapterProgressStatusEnum.Available }
            : chapter,
      ),
      levels: state.clientState.levels.map((level) =>
        level.levelId === levelPlay?.levelId
          ? { ...level, status: LevelProgressSummaryStatusEnum.Completed, completedAt }
          : !completesChapter && level.levelId === LEVEL_IDS[levelNumber]
            ? { ...level, status: LevelProgressSummaryStatusEnum.Available }
          : level,
      ),
      rewards: reward ? [...state.clientState.rewards, reward] : state.clientState.rewards,
      pendingResults: reward
        ? { levelId: levelPlay.levelId, rewardId: reward.rewardId }
        : { levelId: levelPlay.levelId },
      nextAction,
    },
  };
}

export function resetP1FakeDb(options: P1FakeDbOptions = {}) {
  clearPersistedFakeDb();
  persistenceRestoreError = null;
  version = 1;
  const regularCycle = options.regularRewardCycle ?? 0;
  const regularProgress = options.regularRewardProgress ?? 0;
  appearances = options.ownedAppearanceAssetIds
    ? createMockAppearanceCatalog(options.ownedAppearanceAssetIds)
    : makeAppearances();
  state = makeClientState({
    ...options,
    regularRewardCycle: regularCycle,
    regularRewardProgress: regularProgress,
  });
  levelPlay = null;
  resultsSnapshot = null;
  resultsAcknowledgedAt = null;
  chapterCompletionScenario = options.chapterCompletion === true;
  gameUnavailableScenario = options.gameUnavailable === true;
  clientNotFoundScenario = options.clientNotFound === true;
  claimedRewardIds = new Set();
  regularRewardCycle = regularCycle;
  feedbackSubmittedGlobally = false;
  feedbackEligibleChapterId = null;
  feedbackPromptDismissals = options.feedbackPreviouslyDismissed
    ? new Map([[state.clientState.chapters[1].chapterId, '2026-08-28T12:00:00.000Z']])
    : new Map();
  failAppearanceSelectionOnce = options.failAppearanceSelectionOnce === true;
  p2Replays = new Map();
  rewardReplays = new Map();
  persistFakeDb();
}

export const p1Handlers = [
  http.post(apiPath('API-001'), ({ request }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const replay = p2Replay('API-001', request, 'bootstrap:no-body');
    if (replay.response) return replay.response;
    const error = protocolError(request, false);
    return error ?? p2IdempotentResponse('API-001', replay.key, 'bootstrap:no-body', state);
  }),
  http.get(apiPath('API-002'), () => {
    const unavailable = availabilityError();
    return unavailable ?? response(state);
  }),
  http.post(apiPath('API-003'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const chapterId = String(params.chapterId);
    const descriptor = `narrative:${chapterId}`;
    const replay = p2Replay('API-003', request, descriptor);
    if (replay.response) return replay.response;
    const error = protocolError(request, true);
    if (error) return error;
    const chapter = state.clientState.chapters.find((candidate) => candidate.chapterId === chapterId);
    if (!chapter) {
      return HttpResponse.json({ type: 'CHAPTER_NOT_FOUND' }, { status: 404 });
    }
    const body: ConfirmNarrativeShownResponse = {
      chapterId,
      isNarrativeShown: true,
      nextAction: state.clientState.inProgressLevel ? NextAction.Play : NextAction.StartLevel,
    };
    if (chapter.isNarrativeShown) {
      return p2IdempotentResponse('API-003', replay.key, descriptor, body);
    }
    if (chapter.status === ChapterProgressStatusEnum.Locked) {
      return HttpResponse.json({ type: 'CHAPTER_LOCKED' }, { status: 409 });
    }
    state = {
      ...state,
      clientState: {
        ...state.clientState,
        chapters: state.clientState.chapters.map((candidate) =>
          candidate.chapterId === chapterId
            ? { ...candidate, isNarrativeShown: true, narrativeText: undefined }
            : candidate,
        ),
        nextAction: body.nextAction,
      },
    };
    return p2Response('API-003', replay.key, descriptor, body);
  }),
  http.post(apiPath('API-004'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const levelId = String(params.levelId);
    const descriptor = `start:${levelId}`;
    const replay = p2Replay('API-004', request, descriptor);
    if (replay.response) return replay.response;
    const error = protocolError(request, true);
    if (error) return error;
    const candidate = state.clientState.levels.find(
      (level) => level.levelId === levelId,
    );
    if (!candidate || candidate.status !== LevelProgressSummaryStatusEnum.Available) {
      return HttpResponse.json({ type: 'LEVEL_LOCKED' }, { status: 409 });
    }
    const levelIndex = LEVEL_IDS.indexOf(levelId);
    if (levelIndex < 0) {
      return HttpResponse.json({ type: 'LEVEL_LOCKED' }, { status: 409 });
    }
    const levelNumber = levelIndex + 1;
    levelPlay = makeLevelPlay(levelNumber);
    state = {
      ...state,
      clientState: {
        ...state.clientState,
        clientView: {
          ...state.clientState.clientView,
          settings: {
            ...state.clientState.clientView.settings,
            tutorialCompleted:
              state.clientState.clientView.settings.tutorialCompleted || levelNumber === 1,
          },
        },
        inProgressLevel: {
          levelId,
          levelVersionId: LEVEL_VERSION_IDS[levelIndex],
          startedAt: levelPlay.startedAt,
        },
        levels: state.clientState.levels.map((level) =>
          level.levelId === levelId
            ? { ...level, status: LevelProgressSummaryStatusEnum.InProgress }
            : level,
        ),
        nextAction: NextAction.Play,
      },
    };
    return p2Response('API-004', replay.key, descriptor, levelPlay);
  }),
  http.get(apiPath('API-005'), ({ params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    if (!levelPlay || String(params.levelId) !== levelPlay.levelId) {
      return HttpResponse.json({ type: 'LEVEL_NOT_IN_PROGRESS' }, { status: 409 });
    }
    return response(levelPlay);
  }),
  http.post(apiPath('API-007'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const levelId = String(params.levelId);
    const descriptor = `hint:${levelId}`;
    const replay = p2Replay('API-007', request, descriptor);
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

    const targetsRemaining = activeLevelTargets().length - foundTargets.length;
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
    return p2Response('API-007', replay.key, descriptor, body);
  }),
  http.post(apiPath('API-006'), async ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const levelId = String(params.levelId);
    const rawBody = (await request.json()) as RouteSubmissionRequest;
    const route = rawBody.route ?? [];
    const word = normalizeSelectedBoardWord(routeWord(route));
    const signature = routeSignature(route);
    const descriptor = `route:${levelId}:${signature}`;

    const replay = p2Replay('API-006', request, descriptor);
    if (replay.response) return replay.response;

    const error = protocolError(request, true);
    if (error) return error;
    if (state.clientState.pendingReward) {
      return HttpResponse.json({ type: 'REWARD_PENDING_CLAIM' }, { status: 409 });
    }

    if (state.clientState.pendingResults || !levelPlay || levelPlay.levelId !== levelId) {
      return HttpResponse.json({ type: 'LEVEL_NOT_IN_PROGRESS' }, { status: 409 });
    }

    const targets = activeLevelTargets();
    const matchedTarget = targets.find(
      (target) =>
        signature === routeSignature(target.cells) ||
        signature === routeSignature([...target.cells].reverse()),
    );

    if (matchedTarget) {
      const targetAlreadyFound = levelPlay.foundTargets.some(
        (target) => target.targetId === matchedTarget.targetId,
      );
      if (targetAlreadyFound) {
        return p2IdempotentResponse('API-006', replay.key, descriptor, {
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
      const targetsRemaining = targets.length - foundTargets.length;
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
      return p2Response('API-006', replay.key, descriptor, {
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

    const configuredTarget = targets.find(
      (target) => normalizeSelectedBoardWord(target.word) === word,
    );
    if (configuredTarget) {
      return p2IdempotentResponse('API-006', replay.key, descriptor, {
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
      return p2IdempotentResponse('API-006', replay.key, descriptor, {
        result: RouteSubmissionResponseResultEnum3.Repeated,
        levelCompleted: false,
        newFoundTargets: [],
        newBonusWords: [],
        nextAction: NextAction.Play,
      });
    }

    const activeBonusWords = levelPlay
      ? LEVELS[levelPlay.levelNumber as keyof typeof LEVELS].bonusWords
      : [];
    if (activeBonusWords.includes(word)) {
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
      return p2Response('API-006', replay.key, descriptor, {
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

    return p2IdempotentResponse('API-006', replay.key, descriptor, {
      result: RouteSubmissionResponseResultEnum3.Invalid,
      levelCompleted: false,
      newFoundTargets: [],
      newBonusWords: [],
      nextAction: NextAction.Play,
    });
  }),
  http.patch(apiPath('API-010'), async ({ request }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const parsed = parseSettingsRequest(await request.text());
    if ('error' in parsed) return parsed.error;
    const replay = p2Replay('API-010', request, parsed.descriptor);
    if (replay.response) return replay.response;
    const error = protocolError(request, true);
    if (error) return error;
    const settings: SettingsResponse = {
      ...state.clientState.clientView.settings,
      ...parsed.settings,
    };
    state = {
      ...state,
      clientState: {
        ...state.clientState,
        clientView: { ...state.clientState.clientView, settings },
      },
    };
    return p2Response('API-010', replay.key, parsed.descriptor, settings);
  }),
  http.get(apiPath('API-011'), () => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const body: AppearanceCatalogResponse = {
      items: appearances,
      selectedCharacterId: state.clientState.clientView.selectedCharacterId,
      selectedBackgroundId: state.clientState.clientView.selectedBackgroundId,
    };
    return response(body);
  }),
  http.post(apiPath('API-012'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const error = protocolError(request, true);
    if (error) return error;
    if (failAppearanceSelectionOnce) {
      failAppearanceSelectionOnce = false;
      return HttpResponse.json({ type: 'INTERNAL_ERROR' }, { status: 500 });
    }
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
  http.post(apiPath('API-013'), async ({ request }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const rawBody = await request.text();
    const parsed = parseFeedback(rawBody);
    if ('error' in parsed) return parsed.error;
    const replay = p2Replay('API-013', request, parsed.descriptor);
    if (replay.response) return replay.response;
    const error = protocolError(request, true);
    if (error) return error;
    if (
      parsed.feedback.source === 'chapter_completion' &&
      feedbackEligibleChapterId !== parsed.feedback.chapterId
    ) {
      return HttpResponse.json({ type: 'FEEDBACK_NOT_ELIGIBLE' }, { status: 409 });
    }
    feedbackSubmittedGlobally = true;
    feedbackEligibleChapterId = null;
    const nextAction = parsed.feedback.source === 'chapter_completion'
      ? nextActionAfterChapter(parsed.feedback.chapterId ?? '')
      : NextAction.None;
    if (parsed.feedback.source === 'chapter_completion') {
      state = {
        ...state,
        clientState: { ...state.clientState, nextAction },
      };
    }
    const result: SubmitFeedbackResponse = {
      feedbackId: '6f8fad5b-d9cb-469f-a165-808677289550',
      status: SubmitFeedbackResponseStatusEnum.Submitted,
      nextAction,
    };
    return p2Response('API-013', replay.key, parsed.descriptor, result);
  }),
  http.post(apiPath('API-014'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const chapterId = String(params.chapterId);
    if (!isUuid(chapterId)) {
      return validationProblem('INVALID_FORMAT', 'path.chapterId', 'Некорректный chapterId');
    }
    const descriptor = `dismiss-feedback:${chapterId}:no-body`;
    const replay = p2Replay('API-014', request, descriptor);
    if (replay.response) return replay.response;
    const error = protocolError(request, true);
    if (error) return error;
    if (!state.clientState.chapters.some((chapter) => chapter.chapterId === chapterId)) {
      return HttpResponse.json({ type: 'CHAPTER_NOT_FOUND' }, { status: 404 });
    }
    const previousDismissal = feedbackPromptDismissals.get(chapterId);
    const feedbackPromptShownAt = previousDismissal ?? '2026-09-03T12:00:00.000Z';
    const nextAction = nextActionAfterChapter(chapterId);
    const result: DismissFeedbackResponse = {
      chapterId,
      feedbackPromptShownAt,
      nextAction,
    };
    if (previousDismissal) {
      return p2IdempotentResponse('API-014', replay.key, descriptor, result);
    }
    feedbackPromptDismissals.set(chapterId, feedbackPromptShownAt);
    feedbackEligibleChapterId = null;
    state = {
      ...state,
      clientState: { ...state.clientState, nextAction },
    };
    return p2Response('API-014', replay.key, descriptor, result);
  }),
  http.post(apiPath('API-015'), ({ request }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const descriptor = 'campaign-completion:no-body';
    const replay = p2Replay('API-015', request, descriptor);
    if (replay.response) return replay.response;
    const error = protocolError(request, true);
    if (error) return error;
    const progress = state.clientState.clientView.campaignProgress;
    if (!progress.isCompleted) {
      return HttpResponse.json({ type: 'CAMPAIGN_NOT_COMPLETED' }, { status: 409 });
    }
    const result: ConfirmCampaignCompleteShownResponse = {
      isCompletionShown: true,
      nextAction: NextAction.None,
    };
    if (progress.isCompletionShown) {
      return p2IdempotentResponse('API-015', replay.key, descriptor, result);
    }
    state = {
      ...state,
      clientState: {
        ...state.clientState,
        clientView: {
          ...state.clientState.clientView,
          campaignProgress: { ...progress, isCompletionShown: true },
        },
        nextAction: NextAction.None,
      },
    };
    return p2Response('API-015', replay.key, descriptor, result);
  }),
  http.get(apiPath('API-008'), ({ params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    if (!resultsSnapshot || resultsSnapshot.levelId !== String(params.levelId)) {
      return HttpResponse.json({ type: 'LEVEL_NOT_COMPLETED' }, { status: 409 });
    }
    return response(resultsSnapshot);
  }),
  http.post(apiPath('API-017'), ({ request, params }) => {
    const unavailable = availabilityError();
    if (unavailable) return unavailable;
    const levelId = String(params.levelId);
    const descriptor = `acknowledge:${levelId}:no-body`;
    const replay = p2Replay('API-017', request, descriptor);
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
    return p2Response('API-017', replay.key, descriptor, body);
  }),
  http.post(apiPath('API-009'), async ({ request, params }) => {
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
    const completedChapter = !isRegularReward
      ? state.clientState.chapters.find(
          (chapter) => chapter.chapterId === resultsSnapshot?.chapter.chapterId,
        )
      : undefined;
    if (isRegularReward) regularRewardCycle += 1;
    const nextAction = isRegularReward
      ? NextAction.Play
      : feedbackSubmittedGlobally
        ? nextActionAfterChapter(completedChapter?.chapterId ?? '')
        : NextAction.OpenFeedback;
    if (!isRegularReward) {
      feedbackEligibleChapterId = nextAction === NextAction.OpenFeedback
        ? completedChapter?.chapterId ?? null
        : null;
    }
    const nextChapterDefinition = completedChapter
      ? CAMPAIGN_CHAPTERS[completedChapter.number]
      : undefined;
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
        levels: state.clientState.levels.map((level) => (
          nextChapterDefinition
          && level.levelId === LEVEL_IDS[nextChapterDefinition.levelStart - 1]
            ? { ...level, status: LevelProgressSummaryStatusEnum.Available }
            : level
        )),
        pendingReward:
          state.clientState.pendingReward?.rewardId === reward.rewardId
            ? undefined
            : state.clientState.pendingReward,
        nextAction,
      },
    };
    claimedRewardIds.add(reward.rewardId);
    if (!isRegularReward) {
      levelPlay = null;
      resultsSnapshot = null;
      resultsAcknowledgedAt = null;
    }
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
