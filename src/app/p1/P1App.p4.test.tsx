import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AcknowledgeLevelResultsResponseResultsStateEnum,
  CellViewStateEnum,
  ChapterProgressStatusEnum,
  ClaimResultTypeEnum,
  ClaimRewardResponseRewardTypeEnum,
  ClaimRewardResponseStateEnum,
  LevelProgressSummaryStatusEnum,
  LevelResultsResponseCompletionKindEnum,
  LevelResultsResponseResultsStateEnum,
  LevelResultsResponseStatusEnum,
  LevelResultsResponseStatusEnum1,
  LevelPlayResponseStatusEnum,
  NextAction,
  RewardOptionDecorationTypeEnum,
  RewardOptionOptionTypeEnum,
  RewardSummaryRewardTypeEnum,
  RewardSummaryStatusEnum,
  RewardSummaryStatusEnum1,
  RouteSubmissionResponseResultEnum3,
  SelectedOptionSelectedOptionTypeEnum,
  AppearanceRarityEnum,
  AppearanceTypeEnum,
  SelectAppearanceResponseTypeEnum,
  SubmitFeedbackResponseStatusEnum,
} from '../../shared/demoTypes';
import type {
  AcknowledgeLevelResultsResponse,
  AppearanceCatalogResponse,
  ClaimRewardResponse,
  ClaimRewardRequest,
  ClientStateResponse,
  FoundTarget,
  LevelPlayResponse,
  LevelResultsResponse,
  PendingReward,
  RewardSummary,
  RouteSubmissionResponse,
  SettingsResponse,
} from '../../shared/demoTypes';
import type { P1Api as P1ApiContract } from './p1Api';
import { P1App } from './P1App';

const LEVEL_ID = 'c3f8ad5b-d9cb-469f-a165-808677289500';
const LEVEL_VERSION_ID = 'c3f8ad5b-d9cb-469f-a165-808677289501';
const SECOND_LEVEL_ID = 'c3f8ad5b-d9cb-469f-a165-808677289502';
const REWARD_ID = '8f8fad5b-d9cb-469f-a165-808677289520';
const DECORATION_ID = '7f8fad5b-d9cb-469f-a165-80867728951f';
const CHARACTER_ID = '6f8fad5b-d9cb-469f-a165-80867728951e';
const BACKGROUND_ID = '9f8fad5b-d9cb-469f-a165-808677289517';
const OTHER_REWARD_ID = '8f8fad5b-d9cb-469f-a165-808677289521';
const MISSING_REWARD_ID = '8f8fad5b-d9cb-469f-a165-808677289522';
const STOCK_TARGET_ID = '8f8fad5b-d9cb-469f-a165-808677289523';
const LEVEL_TWO_TARGET_ID = '8f8fad5b-d9cb-469f-a165-808677289524';

const stockTarget: FoundTarget = {
  targetId: STOCK_TARGET_ID,
  word: 'АКЦИЯ',
  definition: 'Ценная бумага, которая подтверждает долю владения компанией.',
  foundAt: '2026-08-21T12:01:00.000Z',
  foundSequence: 1,
  courseOffer: {
    courseId: '8f8fad5b-d9cb-469f-a165-808677289599',
    locale: 'ru-RU',
    badgeLabel: 'Мини-курс',
    title: 'Основы личных финансов',
  },
  cells: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 2, col: 2 },
  ],
};

const normalRewardlessResults: LevelResultsResponse = {
  levelId: LEVEL_ID,
  status: LevelResultsResponseStatusEnum.Completed,
  resultsState: LevelResultsResponseResultsStateEnum.PendingAcknowledgement,
  completionKind: LevelResultsResponseCompletionKindEnum.Level,
  board: makeBoard(true),
  foundTargets: [stockTarget],
  bonusWords: [
    { word: 'ЛАПА', foundAt: '2026-08-21T12:00:00.000Z' },
    { word: 'ХОД', foundAt: '2026-08-21T12:00:01.000Z' },
  ],
  completedAt: '2026-08-21T12:02:00.000Z',
  summary: {
    earnedKnowledgePoints: 7,
    knowledgePointsTotal: 7,
    targets: { foundCount: 7, totalCount: 7 },
    bonuses: { foundCount: 2 },
  },
  chapter: {
    chapterId: 'd2f8ad5b-d9cb-469f-a165-808677289540',
    number: 1,
    title: 'Первый капитал',
    completedLevels: 1,
    totalLevels: 9,
    status: LevelResultsResponseStatusEnum1.InProgress,
  },
  nextAction: NextAction.StartLevel,
};

const customTotalRewardlessResults: LevelResultsResponse = {
  ...normalRewardlessResults,
  summary: {
    ...normalRewardlessResults.summary,
    knowledgePointsTotal: 16,
  },
};

const chapterReward = {
  rewardId: REWARD_ID,
  rewardType: RewardSummaryRewardTypeEnum.ChapterGolden,
  status: RewardSummaryStatusEnum.Available,
  options: [
    {
      optionType: RewardOptionOptionTypeEnum.Hint,
      amount: 3,
      title: '3 подсказки',
    },
    {
      optionType: RewardOptionOptionTypeEnum.Decoration,
      optionId: DECORATION_ID,
      decorationType: RewardOptionDecorationTypeEnum.Character,
      title: 'Золотой аналитик',
    },
  ],
};

const pendingRegularReward: RewardSummary = {
  rewardId: REWARD_ID,
  rewardType: RewardSummaryRewardTypeEnum.Regular,
  status: RewardSummaryStatusEnum.Available,
  progress: { current: 4, threshold: 4 },
  hintOptionAmount: 3,
  options: [{
    optionType: RewardOptionOptionTypeEnum.Hint,
    amount: 3,
    title: '3 подсказки',
  }],
};

const decoyRegularReward: RewardSummary = {
  ...pendingRegularReward,
  rewardId: OTHER_REWARD_ID,
  hintOptionAmount: 1,
  options: [{
    optionType: RewardOptionOptionTypeEnum.Hint,
    amount: 1,
    title: '1 подсказка',
  }],
};

const chapterResults: LevelResultsResponse = {
  ...normalRewardlessResults,
  completionKind: LevelResultsResponseCompletionKindEnum.Chapter,
  foundTargets: [],
  bonusWords: [],
  chapter: {
    chapterId: 'd2f8ad5b-d9cb-469f-a165-808677289540',
    number: 1,
    title: 'Первый капитал',
    completedLevels: 9,
    totalLevels: 9,
    status: LevelResultsResponseStatusEnum1.Completed,
  },
  summary: {
    earnedKnowledgePoints: 63,
    knowledgePointsTotal: 63,
    targets: { foundCount: 9, totalCount: 9 },
    bonuses: { foundCount: 0 },
  },
  reward: chapterReward,
  nextAction: NextAction.ClaimReward,
};

const levelTwoTarget: FoundTarget = {
  targetId: LEVEL_TWO_TARGET_ID,
  word: 'ИИС',
  definition: 'Индивидуальный инвестиционный счёт.',
  foundAt: '2026-08-21T12:03:00.000Z',
  foundSequence: 1,
  courseOffer: {
    courseId: '8f8fad5b-d9cb-469f-a165-808677289598',
    locale: 'ru-RU',
    badgeLabel: 'Учебный материал',
    title: 'ИИС',
  },
  cells: [
    { row: 2, col: 2 },
    { row: 1, col: 2 },
    { row: 1, col: 1 },
  ],
};

const levelTwoResults: LevelResultsResponse = {
  ...normalRewardlessResults,
  levelId: SECOND_LEVEL_ID,
  foundTargets: [levelTwoTarget],
  bonusWords: [],
  summary: {
    earnedKnowledgePoints: 8,
    knowledgePointsTotal: 24,
    targets: { foundCount: 1, totalCount: 6 },
    bonuses: { foundCount: 0 },
  },
  chapter: {
    ...normalRewardlessResults.chapter,
    completedLevels: 2,
  },
};

function makeBoard(found: boolean) {
  const letters = ['А', 'К', 'Ц', 'И', 'Я', 'Р', 'И', 'С', 'К'];
  return {
    size: 3,
    cells: letters.map((letter, index) => ({
      row: Math.floor(index / 3),
      col: index % 3,
      letter,
      state: found ? CellViewStateEnum.Found : CellViewStateEnum.Letter,
      belongsToFoundWord: found,
    })),
  };
}

function makeState(nextAction: NextAction = NextAction.None): ClientStateResponse {
  return {
    clientState: {
      clientView: {
        balance: { knowledgePoints: 0, hintBalance: 5 },
        settings: { musicEnabled: true, soundEnabled: true, tutorialCompleted: true },
        selectedCharacterId: CHARACTER_ID,
        selectedBackgroundId: BACKGROUND_ID,
        campaignProgress: { isCompleted: false, isCompletionShown: false },
      },
      chapters: Array.from({ length: 7 }, (_, index) => ({
        chapterId: `d2f8ad5b-d9cb-469f-a165-80867728954${index}`,
        number: index + 1,
        title: index === 0 ? 'Первый капитал' : `Глава ${index + 1}`,
        imageUrl: `/assets/chapter-${index + 1}.webp`,
        status: index === 0 ? ChapterProgressStatusEnum.InProgress : ChapterProgressStatusEnum.Locked,
        completedLevels: 0,
        totalLevels: index === 0 ? 9 : 7,
        isNarrativeShown: true,
      })),
      levels: Array.from({ length: 50 }, (_, index) => ({
        levelId: `c3f8ad5b-d9cb-469f-a165-8086772895${String(index).padStart(2, '0')}`,
        status: index === 0
          ? LevelProgressSummaryStatusEnum.Available
          : LevelProgressSummaryStatusEnum.Locked,
      })),
      rewards: [{
        rewardId: REWARD_ID,
        rewardType: RewardSummaryRewardTypeEnum.Regular,
        status: RewardSummaryStatusEnum1.Collecting,
        progress: { current: 0, threshold: 6 },
      }],
      nextAction,
    },
  };
}

function makePendingState(
  results: 'normal' | 'chapter' = 'normal',
  levelId = LEVEL_ID,
): ClientStateResponse {
  const state = makeState(results === 'chapter' ? NextAction.ClaimReward : NextAction.StartLevel);
  state.clientState.pendingResults = { levelId, ...(results === 'chapter' ? { rewardId: REWARD_ID } : {}) };
  if (results === 'chapter') {
    state.clientState.chapters[0] = {
      ...state.clientState.chapters[0],
      completedLevels: 9,
      status: ChapterProgressStatusEnum.Completed,
    };
    state.clientState.rewards = [
      ...state.clientState.rewards,
      chapterReward,
    ];
  }
  return state;
}

function makePendingRewardState(pendingRewardId?: string): ClientStateResponse {
  const state = makeState(NextAction.ClaimReward);
  state.clientState.pendingReward = pendingRewardId ? { rewardId: pendingRewardId } : undefined;
  state.clientState.rewards = [pendingRegularReward, decoyRegularReward];
  return state;
}

function makePendingGoldenState(): ClientStateResponse {
  const state = makeState(NextAction.ClaimReward);
  state.clientState.pendingReward = { rewardId: REWARD_ID };
  state.clientState.rewards = [chapterReward];
  return state;
}

function makeLevelPlay(levelId = LEVEL_ID, levelNumber = 1): LevelPlayResponse {
  return {
    levelId,
    levelVersionId: LEVEL_VERSION_ID,
    levelNumber,
    microtheme: 'Личные финансы',
    status: LevelPlayResponseStatusEnum.InProgress,
    board: makeBoard(false),
    targetsRemaining: 1,
    foundTargets: [],
    bonusWords: [],
    startedAt: '2026-08-21T12:00:00.000Z',
    nextAction: NextAction.Play,
  };
}

function makeCompletedSubmission(): RouteSubmissionResponse {
  return {
    result: RouteSubmissionResponseResultEnum3.Found,
    isTarget: true,
    word: stockTarget.word,
    knowledgePoints: 14,
    targetsRemaining: 0,
    newFoundTargets: [stockTarget],
    newBonusWords: [],
    levelCompleted: true,
    nextAction: NextAction.ClaimReward,
  };
}

function makeApi(initialState = makeState()): P1ApiContract {
  const catalog: AppearanceCatalogResponse = {
    selectedCharacterId: CHARACTER_ID,
    selectedBackgroundId: BACKGROUND_ID,
    items: [{
      appearanceId: DECORATION_ID,
      type: AppearanceTypeEnum.Character,
      rarity: AppearanceRarityEnum.Regular,
      title: 'Золотой аналитик',
      imageUrl: '/assets/golden.png',
      isOwned: false,
      isSelected: false,
    }],
  };

  return {
    loadState: vi.fn().mockResolvedValue(initialState),
    updateSettings: vi.fn(async (body) => ({
      musicEnabled: body.musicEnabled ?? true,
      soundEnabled: body.soundEnabled ?? true,
      tutorialCompleted: true,
    } satisfies SettingsResponse)),
    getAppearances: vi.fn().mockResolvedValue(catalog),
    selectAppearance: vi.fn().mockResolvedValue({
      appearanceId: CHARACTER_ID,
      type: SelectAppearanceResponseTypeEnum.Character,
      selectedCharacterId: CHARACTER_ID,
      selectedBackgroundId: BACKGROUND_ID,
    }),
    submitFeedback: vi.fn().mockResolvedValue({
      feedbackId: 'af8fad5b-d9cb-469f-a165-808677289521',
      status: SubmitFeedbackResponseStatusEnum.Submitted,
      nextAction: NextAction.None,
    }),
    getLevelResults: vi.fn().mockResolvedValue(normalRewardlessResults),
    acknowledgeLevelResults: vi.fn().mockResolvedValue(makeAcknowledgeResponse()),
    claimReward: vi.fn().mockResolvedValue(makeClaimResponse({
      selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Hint,
    })),
    enterLevel: vi.fn().mockResolvedValue(makeLevelPlay()),
    useHint: vi.fn(),
    submitRoute: vi.fn(),
  };
}

function makeAcknowledgeResponse(
  levelId = LEVEL_ID,
  pendingReward?: PendingReward,
  nextAction: NextAction = NextAction.StartLevel,
): AcknowledgeLevelResultsResponse {
  return {
    levelId,
    nextAction,
    resultsAcknowledgedAt: '2026-08-21T12:02:30.000Z',
    resultsState: AcknowledgeLevelResultsResponseResultsStateEnum.Acknowledged,
    ...(pendingReward ? { pendingReward } : {}),
  };
}

function makeClaimRequest(option: ClaimRewardResponse['selectedOption']): ClaimRewardRequest {
  return option.selectedOptionType === SelectedOptionSelectedOptionTypeEnum.Hint
    ? { rewardType: 'hint' }
    : { rewardType: 'decoration', selectedOptionId: option.selectedOptionId! };
}

function makeClaimResponse(option: ClaimRewardResponse['selectedOption']): ClaimRewardResponse {
  return {
    rewardId: REWARD_ID,
    rewardType: ClaimRewardResponseRewardTypeEnum.ChapterGolden,
    state: ClaimRewardResponseStateEnum.Claimed,
    selectedOption: option,
    claimResult: {
      balance: { knowledgePoints: 63, hintBalance: 8 },
      decoration: { appearanceId: DECORATION_ID, type: ClaimResultTypeEnum.Character },
    },
    nextAction: NextAction.StartLevel,
  };
}

async function renderStartedGame(api: P1ApiContract) {
  const user = userEvent.setup();
  render(<P1App api={api} minimumLoadingMs={0} />);
  await screen.findByLabelText('Главный экран');
  await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
  await screen.findByLabelText('Игровой экран уровня 1');
}

function releaseRoute() {
  const board = screen.getByLabelText('Игровое поле');
  const first = screen.getByLabelText('А, строка 1, столбец 1');
  const second = screen.getByLabelText('К, строка 1, столбец 2');
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: vi.fn(() => second),
  });
  fireEvent.pointerDown(first, { pointerId: 17 });
  fireEvent.pointerMove(board, { pointerId: 17, clientX: 1, clientY: 1 });
  fireEvent.pointerUp(board, { pointerId: 17 });
}

async function renderPendingResults(
  api: P1ApiContract,
  state: ClientStateResponse = makePendingState(),
) {
  render(<P1App api={api} minimumLoadingMs={0} />);
  await screen.findByRole('heading', { name: 'Уровень пройден!' });
  return state;
}

function expectChapterProgress(results: HTMLElement, completed: number, total: number) {
  const label = `Уровней ${completed} из ${total}`;
  expect(within(results).getByText(label, { exact: true })).toBeVisible();
  const progress = within(results).getByRole('progressbar', { name: label });
  expect(progress).toHaveAttribute('aria-valuenow', String(completed));
  expect(progress).toHaveAttribute('aria-valuemax', String(total));
}

afterEach(() => {
  vi.useRealTimers();
});

describe('P4 Results state machine', () => {
  it('после завершения через submit-route один раз загружает level-results и выходит из disabled game state', async () => {
    const api = makeApi();
    vi.mocked(api.submitRoute).mockResolvedValue(makeCompletedSubmission());
    vi.mocked(api.getLevelResults).mockResolvedValue(normalRewardlessResults);

    await renderStartedGame(api);
    releaseRoute();

    await waitFor(() => expect(api.getLevelResults).toHaveBeenCalledTimes(1));
    expect(api.getLevelResults).toHaveBeenCalledWith(LEVEL_ID, expect.any(AbortSignal));
    expect(await screen.findByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
    expect(screen.queryByLabelText('Игровое поле')).not.toBeInTheDocument();
  });

  it('показывает skeleton level-results после 250 мс, abort по timeout, игнорирует late response и retry не повторяет submit-route', async () => {
    vi.useFakeTimers();
    const api = makeApi(makePendingState());
    let resolveFirst: (results: LevelResultsResponse) => void = () => undefined;
    vi.mocked(api.getLevelResults)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(normalRewardlessResults);

    render(<P1App api={api} minimumLoadingMs={0} timeoutMs={8_000} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(api.getLevelResults).toHaveBeenCalledTimes(1);

    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(screen.getByRole('status', { name: 'Загрузка результатов' })).toBeVisible();

    const signal = vi.mocked(api.getLevelResults).mock.calls[0]?.[1];
    await act(async () => { await vi.advanceTimersByTimeAsync(8_000); });
    expect(signal).toHaveProperty('aborted', true);
    expect(screen.getByRole('heading', { name: 'Что-то пошло не так' })).toBeVisible();

    await act(async () => { resolveFirst(normalRewardlessResults); await Promise.resolve(); });
    expect(screen.getByRole('heading', { name: 'Что-то пошло не так' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /Повторить|Обновить/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(api.getLevelResults).toHaveBeenCalledTimes(2);
    expect(api.submitRoute).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
  });

  it('acknowledge-results показывает pending status, блокирует Results actions, timeout даёт alert, а retry сохраняет intent', async () => {
    const api = makeApi(makePendingState());
    let resolveLate: (results: AcknowledgeLevelResultsResponse) => void = () => undefined;
    vi.mocked(api.getLevelResults).mockResolvedValue(normalRewardlessResults);
    vi.mocked(api.acknowledgeLevelResults)
      .mockReturnValueOnce(new Promise((resolve) => { resolveLate = resolve; }))
      .mockResolvedValueOnce(makeAcknowledgeResponse());

    render(<P1App api={api} minimumLoadingMs={0} timeoutMs={8_000} />);
    await screen.findByRole('heading', { name: 'Уровень пройден!' });
    vi.useFakeTimers();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Следующий уровень' }));
      await Promise.resolve();
    });
    expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toBeVisible();
    expect(screen.getByRole('button', { name: 'На главный экран' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Следующий уровень' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Показать поле' })).toBeDisabled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/подтвердить результаты/i);
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeEnabled();

    await act(async () => {
      resolveLate(makeAcknowledgeResponse());
      await Promise.resolve();
    });
    expect(screen.getByRole('alert')).toBeVisible();
    expect(screen.getByLabelText('Результаты уровня 1')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(2);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(api.enterLevel).toHaveBeenCalledTimes(1);
    expect(api.submitRoute).not.toHaveBeenCalled();
  });

  it('рендерит обычные Results только по snapshot level-results и primary ведёт на границу start-level', async () => {
    const api = makeApi(makePendingState());
    vi.mocked(api.getLevelResults).mockResolvedValue(normalRewardlessResults);
    const user = userEvent.setup();

    await renderPendingResults(api);

    const results = screen.getByLabelText('Результаты уровня 1');
    expect(within(results).queryByRole('heading', { name: 'Результаты' })).not.toBeInTheDocument();
    expect(within(results).getByRole('heading', { name: /^Уровень пройден!$/ })).toBeVisible();
    const envelope = within(results).getByRole('img', { name: /^конверт$/i });
    expect(envelope).toBeVisible();
    expect(envelope).toHaveAttribute('src', '/assets/envelope-golden.webp');
    expect(within(results).getByText(/До конверта:\s*\d+\s+уров/)).toBeVisible();
    expectChapterProgress(results, 1, 9);
    expect(within(results).getByText('+7 знаний')).toBeVisible();
    expect(within(results).getByText('Всего')).toBeVisible();
    expect(within(results).getByText('7', { exact: true })).toBeVisible();
    expect(within(results).getByText('Целевые слова')).toBeVisible();
    expect(within(results).getByText('7 из 7', { exact: true })).toBeVisible();
    expect(within(results).queryByText('7/7', { exact: true })).not.toBeInTheDocument();
    expect(within(results).getByText('Бонусные слова')).toBeVisible();
    expect(within(results).getByText('2', { exact: true })).toBeVisible();
    expect(within(results).getByText('Первый капитал')).toBeVisible();
    expect(within(results).queryByText('1/9', { exact: true })).not.toBeInTheDocument();
    expect(within(results).queryByText('В процессе', { exact: true })).not.toBeInTheDocument();
    expect(within(results).queryByText('Завершена', { exact: true })).not.toBeInTheDocument();
    expect(within(results).getByRole('button', { name: 'Следующий уровень' })).toBeVisible();
    expect(within(results).getByRole('button', { name: 'Показать поле' })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: /награду/i })).not.toBeInTheDocument();

    await user.click(within(results).getByRole('button', { name: 'Следующий уровень' }));
    expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(1);
    expect(api.acknowledgeLevelResults).toHaveBeenCalledWith(LEVEL_ID, expect.any(AbortSignal));
    await waitFor(() => expect(api.enterLevel).toHaveBeenCalledTimes(1));
    expect(api.claimReward).not.toHaveBeenCalled();
  });

  it('показывает mini-course для server foundTarget АКЦИЯ только по ручному тапу и возвращает в Results', async () => {
    const api = makeApi(makePendingState());
    vi.mocked(api.getLevelResults).mockResolvedValue(normalRewardlessResults);
    const user = userEvent.setup();

    await renderPendingResults(api);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const courseCard = screen.getByRole('button', { name: /Мини-курс.*Основы личных финансов/ });
    expect(courseCard).toBeVisible();
    expect(within(courseCard).getByText('Основы личных финансов')).toBeVisible();
    expect(within(courseCard).queryByText('АКЦИЯ', { exact: true })).not.toBeInTheDocument();
    await user.click(courseCard);

    const dialog = screen.getByRole('dialog', { name: 'АКЦИЯ' });
    expect(dialog).toHaveTextContent(stockTarget.definition);
    expect(within(dialog).getByText('Мини-курс')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: /Вернуться|закрыть/i }));
    expect(screen.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
  });

  it('открывает read-only Field Review со snapshot level-results без hint/route submit и сохраняет Results после скрытия поля', async () => {
    const api = makeApi(makePendingState());
    vi.mocked(api.getLevelResults).mockResolvedValue(customTotalRewardlessResults);
    const user = userEvent.setup();

    await renderPendingResults(api);
    await user.click(screen.getByRole('button', { name: 'Показать поле' }));

    expect(screen.getByLabelText('Просмотр поля уровня 1')).toBeVisible();
    expect(screen.getByLabelText('Игровое поле')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Использовать подсказку/ })).not.toBeInTheDocument();
    expect(api.submitRoute).not.toHaveBeenCalled();
    expect(api.acknowledgeLevelResults).not.toHaveBeenCalled();

    const foundCell = screen.getByRole('button', {
      name: 'К, строка 1, столбец 2. Найденное слово АКЦИЯ. Открыть информацию',
    });
    await user.click(foundCell);
    const dialog = screen.getByRole('dialog', { name: 'АКЦИЯ' });
    expect(dialog).toHaveTextContent(stockTarget.definition);
    expect(within(dialog).getByText('Мини-курс')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: /Вернуться|закрыть/i }));

    await user.click(screen.getByRole('button', { name: 'Скрыть поле' }));
    expect(screen.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
    expect(screen.getByText('16', { exact: true })).toBeVisible();
    expect(api.submitRoute).not.toHaveBeenCalled();
    expect(api.acknowledgeLevelResults).not.toHaveBeenCalled();
  });

  it('при bootstrap и refresh с pendingResults сначала загружает level-results и не дублирует reward UI', async () => {
    const api = makeApi(makePendingState());
    vi.mocked(api.getLevelResults).mockResolvedValue(normalRewardlessResults);

    const firstMount = render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByRole('heading', { name: 'Уровень пройден!' });
    expect(api.getLevelResults).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Главный экран')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /награду/i })).not.toBeInTheDocument();

    firstMount.unmount();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByRole('heading', { name: 'Уровень пройден!' });

    expect(api.loadState).toHaveBeenCalledTimes(2);
    expect(api.getLevelResults).toHaveBeenCalledTimes(2);
    expect(api.claimReward).not.toHaveBeenCalled();
    expect(screen.getAllByRole('heading', { name: 'Уровень пройден!' })).toHaveLength(1);
  });

  it.each([
    ['missing pendingReward', undefined],
    ['mismatched pendingReward', MISSING_REWARD_ID],
  ] as const)('bootstrap %s оставляет Home без claim affordance', async (_, pendingRewardId) => {
    const api = makeApi(makePendingRewardState(pendingRewardId));

    render(<P1App api={api} minimumLoadingMs={0} />);

    const home = await screen.findByLabelText('Главный экран');
    expect(screen.queryByRole('dialog', { name: /награду/i })).not.toBeInTheDocument();
    const claimButton = within(home).queryByRole('button', { name: 'Забрать награду' });

    expect(claimButton).not.toBeInTheDocument();
  });

  it('bootstrap pending regular reward auto-opens exact-id награду при порядке [pending, another available]', async () => {
    const api = makeApi(makePendingRewardState(REWARD_ID));

    render(<P1App api={api} minimumLoadingMs={0} />);

    const dialog = await screen.findByRole('dialog', { name: 'Выберите награду' });
    expect(within(dialog).getByRole('radio', { name: '3 подсказки' })).toBeVisible();
    expect(within(dialog).queryByRole('radio', { name: '1 подсказка' })).not.toBeInTheDocument();
  });

  it('bootstrap pending Golden reward оставляет Home affordance и не открывает regular modal автоматически', async () => {
    const api = makeApi(makePendingGoldenState());
    const user = userEvent.setup();

    render(<P1App api={api} minimumLoadingMs={0} />);

    const home = await screen.findByLabelText('Главный экран');
    const claimButton = within(home).getByRole('button', { name: 'Забрать награду' });
    expect(claimButton).toBeVisible();
    expect(screen.queryByLabelText('Результаты уровня')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument();

    await user.click(claimButton);

    const dialog = await screen.findByRole('dialog', { name: 'Выберите награду' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('radio', { name: '3 подсказки' })).toBeVisible();
    expect(within(dialog).getByRole('radio', { name: 'Золотой аналитик' })).toBeVisible();
    expect(within(dialog).queryByRole('button', { name: /^Забрать$/ })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('radio', { name: 'Золотой аналитик' }));
    await user.click(within(dialog).getByRole('button', { name: 'Забрать награду' }));

    expect(api.claimReward).toHaveBeenCalledWith(REWARD_ID, {
      rewardType: 'decoration',
      selectedOptionId: DECORATION_ID,
    });
    await waitFor(() => expect(screen.getByLabelText('Главный экран')).toBeVisible());
    expect(screen.queryByLabelText(/^Результаты/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Результаты' })).not.toBeInTheDocument();
  });

  it.each([
    ['подсказки', { selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Hint }],
    ['декорации', {
      selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Decoration,
      selectedOptionId: DECORATION_ID,
    }],
  ] as const)('для chapter Results отправляет server option payload %s, блокирует double claim и применяет ответ claim-reward', async (_, option) => {
    const api = makeApi(makePendingState('chapter'));
    vi.mocked(api.getLevelResults).mockResolvedValue(chapterResults);
    let resolveClaim: (response: ClaimRewardResponse) => void = () => undefined;
    vi.mocked(api.claimReward).mockReturnValue(new Promise((resolve) => { resolveClaim = resolve; }));
    const user = userEvent.setup();

    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByRole('heading', { name: 'Глава завершена!' });
    expect(screen.getByText('9 из 9', { exact: true })).toBeVisible();
    expect(screen.queryByText('9/9', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('В процессе', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText('Завершена', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('Золотой конверт готов')).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument();
    const results = screen.getByLabelText('Результаты уровня');
    const primary = within(results).getByRole('button', { name: 'Забрать награду' });
    await user.click(primary);
    expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(1);
    expect(api.claimReward).not.toHaveBeenCalled();
    await screen.findByRole('dialog', { name: 'Выберите награду' });

    if (option.selectedOptionType === SelectedOptionSelectedOptionTypeEnum.Hint) {
      await user.click(screen.getByRole('radio', { name: '3 подсказки' }));
    } else {
      await user.click(screen.getByRole('radio', { name: 'Золотой аналитик' }));
    }
    const claimButton = screen.getByRole('button', { name: 'Забрать награду' });
    await user.click(claimButton);
    expect(claimButton).toBeDisabled();
    await user.click(claimButton);
    expect(api.claimReward).toHaveBeenCalledTimes(1);
    expect(api.claimReward).toHaveBeenCalledWith(REWARD_ID, makeClaimRequest(option));

    await act(async () => resolveClaim(makeClaimResponse(option)));
    await waitFor(() => expect(screen.getByLabelText('Главный экран')).toBeVisible());
    expect(screen.getByLabelText('Знания: 63')).toBeVisible();
    expect(screen.queryByRole('dialog', { name: /награду/i })).not.toBeInTheDocument();
  });

  it('ошибка claim не разрушает chapter Results, повторный claim восстанавливает результат', async () => {
    const api = makeApi(makePendingState('chapter'));
    vi.mocked(api.getLevelResults).mockResolvedValue(chapterResults);
    vi.mocked(api.claimReward)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(makeClaimResponse({
        selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Hint,
      }));
    const user = userEvent.setup();

    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByRole('heading', { name: 'Глава завершена!' });
    await user.click(within(screen.getByLabelText('Результаты уровня')).getByRole('button', { name: 'Забрать награду' }));
    await screen.findByRole('dialog', { name: 'Выберите награду' });
    await user.click(screen.getByRole('radio', { name: '3 подсказки' }));
    await user.click(screen.getByRole('button', { name: 'Забрать награду' }));

    expect(await screen.findByText('Не удалось забрать награду')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Глава завершена!' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Забрать награду' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: 'Забрать награду' }));
    await waitFor(() => expect(screen.getByLabelText('Главный экран')).toBeVisible());
    expect(api.claimReward).toHaveBeenCalledTimes(2);
  });

  it('экспортирует P4-поверхности как доступные headings, buttons, status и modal', async () => {
    const api = makeApi(makePendingState('chapter'));
    vi.mocked(api.getLevelResults).mockResolvedValue(chapterResults);

    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByRole('heading', { name: 'Глава завершена!' });
    const results = screen.getByLabelText('Результаты уровня');
    expect(within(results).queryByRole('heading', { name: 'Результаты' })).not.toBeInTheDocument();
    expect(within(results).getByRole('heading', { name: /^Глава завершена!$/ })).toBeVisible();
    const envelope = within(results).getByRole('img', { name: /^Золотой конверт$/i });
    expect(envelope).toBeVisible();
    expect(envelope).toHaveAttribute('src', '/assets/envelope-golden.webp');
    expect(within(results).getByText('Золотой конверт готов', { exact: true })).toBeVisible();
    expectChapterProgress(results, 9, 9);
    expect(within(results).getByText('+63 знаний')).toBeVisible();
    expect(within(results).getByText('Всего')).toBeVisible();
    expect(within(results).getByText('Целевые слова')).toBeVisible();
    expect(within(results).getByText('Бонусные слова')).toBeVisible();
    expect(within(results).getByText('9 из 9', { exact: true })).toBeVisible();
    expect(within(results).queryByText('9/9', { exact: true })).not.toBeInTheDocument();
    expect(within(results).queryByText('В процессе', { exact: true })).not.toBeInTheDocument();
    expect(within(results).queryByText('Завершена', { exact: true })).not.toBeInTheDocument();
    expect(within(results).getByText('0', { exact: true })).toBeVisible();
    expect(within(results).queryByRole('button', { name: /Мини-курс|Рекомендуем|Учебный материал/ }))
      .not.toBeInTheDocument();
    expect(within(results).getByRole('progressbar', { name: 'Прогресс золотого конверта' }))
      .toHaveAttribute('aria-valuenow', '9');
    expect(within(results).getByRole('button', { name: 'Забрать награду' })).toBeVisible();
    await userEvent.setup().click(within(results).getByRole('button', { name: 'Забрать награду' }));
    const dialog = await screen.findByRole('dialog', { name: 'Выберите награду' });
    expect(within(results).getByRole('button', { name: 'Показать поле' })).toBeVisible();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getAllByRole('radio')).toHaveLength(2);
  });

  it('для rewardless primary подтверждает Results до перехода, а после ошибки оставляет Results и даёт retry', async () => {
    const api = makeApi(makePendingState());
    vi.mocked(api.getLevelResults).mockResolvedValue(normalRewardlessResults);
    vi.mocked(api.acknowledgeLevelResults)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(makeAcknowledgeResponse());
    const user = userEvent.setup();

    await renderPendingResults(api);
    await user.click(screen.getByRole('button', { name: 'Следующий уровень' }));

    await waitFor(() => expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(1));
    expect(api.enterLevel).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Результаты уровня 1')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(/.+/);
    expect(screen.getByText('+7 знаний')).toBeVisible();
    expect(screen.getByText('Целевые слова')).toBeVisible();
    expect(screen.getByText('7 из 7')).toBeVisible();
    expect(screen.queryByText('7/7', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(api.enterLevel).toHaveBeenCalledTimes(1));
  });

  it('для rewardless Header Back подтверждает Results и открывает Home только после успеха', async () => {
    const api = makeApi(makePendingState());
    vi.mocked(api.getLevelResults).mockResolvedValue(normalRewardlessResults);
    vi.mocked(api.acknowledgeLevelResults)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(makeAcknowledgeResponse());
    const user = userEvent.setup();

    await renderPendingResults(api);
    await user.click(screen.getByRole('button', { name: 'На главный экран' }));

    expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Результаты уровня 1')).toBeVisible();
    expect(screen.queryByLabelText('Главный экран')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Повторить' }));
    await waitFor(() => expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByLabelText('Главный экран')).toBeVisible());
    expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(2);
    expect(api.claimReward).not.toHaveBeenCalled();
  });

  it('Field Review не подтверждает Results при открытии/закрытии, но его primary подтверждает один раз', async () => {
    const api = makeApi(makePendingState());
    vi.mocked(api.getLevelResults).mockResolvedValue(normalRewardlessResults);
    let resolveAcknowledge: (response: AcknowledgeLevelResultsResponse) => void = () => undefined;
    vi.mocked(api.acknowledgeLevelResults).mockReturnValue(
      new Promise((resolve) => { resolveAcknowledge = resolve; }),
    );
    const user = userEvent.setup();

    await renderPendingResults(api);
    await user.click(screen.getByRole('button', { name: 'Показать поле' }));
    expect(screen.getByLabelText('Просмотр поля уровня 1')).toBeVisible();
    expect(api.acknowledgeLevelResults).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Скрыть поле' }));
    expect(screen.getByLabelText('Результаты уровня 1')).toBeVisible();
    expect(api.acknowledgeLevelResults).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Показать поле' }));
    const fieldReview = screen.getByLabelText('Просмотр поля уровня 1');
    await user.click(within(fieldReview).getByRole('button', { name: 'Следующий уровень' }));
    expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(1);
    expect(api.enterLevel).not.toHaveBeenCalled();

    await act(async () => resolveAcknowledge(makeAcknowledgeResponse()));
    await waitFor(() => expect(api.enterLevel).toHaveBeenCalledTimes(1));
  });

  it('Field Review открывает любую найденную клетку и не рендерит folded-corner marker', async () => {
    const state = makePendingState('normal', SECOND_LEVEL_ID);
    const api = makeApi(state);
    vi.mocked(api.getLevelResults).mockResolvedValue(levelTwoResults);
    const user = userEvent.setup();

    render(<P1App api={api} minimumLoadingMs={0} />);
    const results = await screen.findByLabelText('Результаты уровня 2');
    expect(api.getLevelResults).toHaveBeenCalledWith(SECOND_LEVEL_ID, expect.any(AbortSignal));
    expect(screen.queryByLabelText('Результаты уровня 1')).not.toBeInTheDocument();
    expect(within(results).getByRole('button', { name: /Учебный материал.*ИИС|ИИС.*Учебный материал/ })).toBeVisible();

    await user.click(within(results).getByRole('button', { name: 'Показать поле' }));
    const fieldReview = await screen.findByLabelText('Просмотр поля уровня 2');
    expect(fieldReview.querySelector('[data-found-marker]')).not.toBeInTheDocument();
    const nonFirstTargetCell = within(fieldReview).getByRole('button', {
      name: 'Р, строка 2, столбец 3. Найденное слово ИИС. Открыть информацию',
    });
    expect(nonFirstTargetCell).toHaveAttribute('data-cell-id', '2:3');
    await user.click(nonFirstTargetCell);
    expect(screen.getByRole('dialog', { name: 'ИИС' })).toHaveTextContent('Учебный материал');
  });

  it('Golden primary сначала подтверждает Results, затем открывает выбор; claim-reward недоступен до acknowledge-results', async () => {
    const api = makeApi(makePendingState('chapter'));
    vi.mocked(api.getLevelResults).mockResolvedValue(chapterResults);
    let resolveAcknowledge: (response: AcknowledgeLevelResultsResponse) => void = () => undefined;
    vi.mocked(api.acknowledgeLevelResults).mockReturnValue(
      new Promise((resolve) => { resolveAcknowledge = resolve; }),
    );
    const user = userEvent.setup();

    render(<P1App api={api} minimumLoadingMs={0} />);
    const results = await screen.findByLabelText('Результаты уровня');
    expect(screen.queryByLabelText('Результаты уровня 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument();
    await user.click(within(results).getByRole('button', { name: 'Забрать награду' }));
    expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(1);
    expect(api.claimReward).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument();

    await act(async () => resolveAcknowledge(
      makeAcknowledgeResponse(LEVEL_ID, { rewardId: REWARD_ID }, NextAction.ClaimReward),
    ));
    const dialog = await screen.findByRole('dialog', { name: 'Выберите награду' });
    expect(within(dialog).getByRole('radio', { name: '3 подсказки' })).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'На главный экран' }));
    const home = await screen.findByLabelText('Главный экран');
    expect(screen.queryByRole('heading', { name: 'Глава завершена!' })).not.toBeInTheDocument();
    expect(within(home).getByRole('button', { name: 'Забрать награду' })).toBeVisible();
    expect(api.claimReward).not.toHaveBeenCalled();
  });

  it('Golden Header Back подтверждает Results и возвращает Home без claim-reward', async () => {
    const api = makeApi(makePendingState('chapter'));
    vi.mocked(api.getLevelResults).mockResolvedValue(chapterResults);
    vi.mocked(api.acknowledgeLevelResults).mockResolvedValue(makeAcknowledgeResponse());
    const user = userEvent.setup();

    render(<P1App api={api} minimumLoadingMs={0} />);
    const results = await screen.findByLabelText('Результаты уровня');
    await user.click(within(results).getByRole('button', { name: 'На главный экран' }));
    await waitFor(() => expect(screen.getByLabelText('Главный экран')).toBeVisible());
    expect(api.acknowledgeLevelResults).toHaveBeenCalledTimes(1);
    expect(api.claimReward).not.toHaveBeenCalled();
  });

  it('Golden modal фокусирует dialog, удерживает Tab внутри, блокирует underlying Results и возвращает фокус при Escape', async () => {
    const api = makeApi(makePendingState('chapter'));
    vi.mocked(api.getLevelResults).mockResolvedValue(chapterResults);
    vi.mocked(api.acknowledgeLevelResults).mockResolvedValue(makeAcknowledgeResponse());
    const user = userEvent.setup();

    render(<P1App api={api} minimumLoadingMs={0} />);
    const results = await screen.findByLabelText('Результаты уровня');
    const primary = within(results).getByRole('button', { name: 'Забрать награду' });
    await user.click(primary);
    const dialog = await screen.findByRole('dialog', { name: 'Выберите награду' });

    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(results).toHaveAttribute('inert');
    for (let index = 0; index < 6; index += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
    expect(screen.queryByLabelText('Просмотр поля уровня 1')).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.queryByLabelText('Просмотр поля уровня 1')).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument());
    const currentResults = screen.getByLabelText('Результаты уровня');
    const currentPrimary = within(currentResults).getByRole('button', { name: 'Забрать награду' });
    expect(document.activeElement).toBe(currentPrimary);
  });
});
