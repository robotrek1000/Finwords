import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppearanceRarityEnum,
  AppearanceTypeEnum,
  CellViewStateEnum,
  ChapterProgressStatusEnum,
  ClaimRewardResponseStateEnum,
  ClaimRewardResponseRewardTypeEnum,
  LevelProgressSummaryStatusEnum,
  LevelPlayResponseStatusEnum,
  LevelResultsResponseCompletionKindEnum,
  LevelResultsResponseResultsStateEnum,
  LevelResultsResponseStatusEnum,
  LevelResultsResponseStatusEnum1,
  NextAction,
  RewardSummaryStatusEnum,
  RewardSummaryStatusEnum1,
  RewardSummaryRewardTypeEnum,
  RewardOptionDecorationTypeEnum,
  RewardOptionOptionTypeEnum,
  RouteSubmissionResponseOutcomeCodeEnum,
  RouteSubmissionResponseResultEnum3,
  SelectAppearanceResponseTypeEnum,
  SelectedOptionSelectedOptionTypeEnum,
  SubmitFeedbackResponseStatusEnum,
} from '../../infra/api/generated/data-contracts';
import type {
  AppearanceCatalogResponse,
  CellRef,
  ClaimRewardResponse,
  ClientStateResponse,
  FoundTarget,
  HintUseResponse,
  LevelPlayResponse,
  LevelResultsResponse,
  RouteSubmissionResponse,
  RewardSummary,
  SettingsResponse,
  SubmitFeedbackResponse,
} from '../../infra/api/generated/data-contracts';
import type { P1Api } from './p1Api';
import { GameScreen } from './GameScreen';
import { openDeepLink } from './deepLink';
import { P1App } from './P1App';
import { createMockAppearanceCatalog } from '../../mocks/appearanceCatalog';

vi.mock('./deepLink', async () => ({
  ...(await vi.importActual<typeof import('./deepLink')>('./deepLink')),
  openDeepLink: vi.fn(),
}));

const CHARACTER_ID = '6f8fad5b-d9cb-469f-a165-80867728951e';
const LOCKED_CHARACTER_ID = '7f8fad5b-d9cb-469f-a165-80867728951f';
const OWNED_CHARACTER_ID = '7f8fad5b-d9cb-469f-a165-808677289522';
const BACKGROUND_ID = '9f8fad5b-d9cb-469f-a165-808677289517';
const REWARD_ID = '8f8fad5b-d9cb-469f-a165-808677289520';
const NEXT_REWARD_ID = '8f8fad5b-d9cb-469f-a165-808677289527';
const DO_TARGET_ID = '8f8fad5b-d9cb-469f-a165-808677289523';
const AKCIYA_TARGET_ID = '8f8fad5b-d9cb-469f-a165-808677289524';
const DOHOD_TARGET_ID = '8f8fad5b-d9cb-469f-a165-808677289525';
const NEXT_TARGET_ID = '8f8fad5b-d9cb-469f-a165-808677289526';

function makeCollectingRegularReward(current = 0, threshold = 6): RewardSummary {
  return {
    rewardId: REWARD_ID,
    rewardType: RewardSummaryRewardTypeEnum.Regular,
    status: RewardSummaryStatusEnum1.Collecting,
    progress: { current, threshold },
  };
}

function makeLevelPlay(): LevelPlayResponse {
  return {
    levelId: 'c3f8ad5b-d9cb-469f-a165-808677289500',
    levelVersionId: 'c3f8ad5b-d9cb-469f-a165-808677289501',
    levelNumber: 1,
    microtheme: 'Личные финансы',
    status: LevelPlayResponseStatusEnum.InProgress,
    board: {
      size: 3,
      cells: [
        { row: 2, col: 2, letter: 'Д', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
        { row: 0, col: 1, letter: 'О', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
        { row: 1, col: 2, letter: 'О', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
        { row: 0, col: 0, letter: 'Д', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
        { row: 2, col: 1, letter: 'И', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
        { row: 1, col: 1, letter: 'А', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
        { row: 0, col: 2, letter: 'Х', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
        { row: 2, col: 0, letter: 'Р', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
        { row: 1, col: 0, letter: 'Т', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
      ],
    },
    targetsRemaining: 1,
    foundTargets: [],
    bonusWords: [
      { word: 'ДАР', foundAt: '2026-08-21T12:00:00.000Z' },
    ],
    startedAt: '2026-08-21T12:00:00.000Z',
    nextAction: NextAction.Play,
  };
}

function makeState(
  nextAction: NextAction = NextAction.None,
  bonusProgressCurrent = 0,
  bonusProgressThreshold = 6,
  collectingRewardId = REWARD_ID,
): ClientStateResponse {
  return {
    clientState: {
      clientView: {
        balance: { knowledgePoints: 0, hintBalance: 5 },
        settings: {
          musicEnabled: true,
          soundEnabled: true,
          tutorialCompleted: true,
        },
        selectedCharacterId: CHARACTER_ID,
        selectedBackgroundId: BACKGROUND_ID,
        campaignProgress: { isCompleted: false, isCompletionShown: false },
      },
      chapters: Array.from({ length: 7 }, (_, index) => ({
        chapterId: `d2f8ad5b-d9cb-469f-a165-80867728954${index}`,
        number: index + 1,
        title: index === 0 ? 'Первый капитал' : `Глава ${index + 1}`,
        imageUrl: `/assets/chapter-${index + 1}.webp`,
        status:
          index === 0
            ? ChapterProgressStatusEnum.InProgress
            : ChapterProgressStatusEnum.Locked,
        completedLevels: 0,
        totalLevels: index === 6 ? 6 : index === 0 ? 9 : 7,
        isNarrativeShown: true,
      })),
      levels: Array.from({ length: 50 }, (_, index) => ({
        levelId: `c3f8ad5b-d9cb-469f-a165-8086772895${String(index).padStart(2, '0')}`,
        status:
          index === 0
            ? LevelProgressSummaryStatusEnum.Available
            : LevelProgressSummaryStatusEnum.Locked,
      })),
      rewards:
        nextAction === NextAction.ClaimReward
          ? [
              {
                rewardId: REWARD_ID,
                rewardType: RewardSummaryRewardTypeEnum.Regular,
                status: RewardSummaryStatusEnum.Available,
                availableAt: '2026-08-20T10:00:00.000Z',
                progress: { current: 4, threshold: 4 },
                hintOptionAmount: 1,
                decorationOptionId: LOCKED_CHARACTER_ID,
                options: [
                  {
                    optionType: RewardOptionOptionTypeEnum.Hint,
                    amount: 1,
                    title: 'Подсказка',
                  },
                  {
                    optionType: RewardOptionOptionTypeEnum.Decoration,
                    optionId: LOCKED_CHARACTER_ID,
                    title: 'Штурман',
                    decorationType: RewardOptionDecorationTypeEnum.Character,
                  },
                ],
              },
            ]
          : [{
              ...makeCollectingRegularReward(bonusProgressCurrent, bonusProgressThreshold),
              rewardId: collectingRewardId,
            }],
      ...(nextAction === NextAction.ClaimReward
        ? { pendingReward: { rewardId: REWARD_ID } }
        : {}),
      nextAction,
    },
  };
}

function makeNextChapterState(): ClientStateResponse {
  const state = makeState(NextAction.NextChapter);
  return {
    ...state,
    clientState: {
      ...state.clientState,
      chapters: state.clientState.chapters.map((chapter, index) => {
        if (index === 0) {
          return {
            ...chapter,
            status: ChapterProgressStatusEnum.Completed,
            completedLevels: chapter.totalLevels,
          };
        }
        if (index === 1) {
          return {
            ...chapter,
            title: 'Финансовая подушка',
            status: ChapterProgressStatusEnum.Available,
            isNarrativeShown: false,
            narrativeText: 'Разберитесь, из чего складывается финансовый резерв и как он помогает в неожиданных ситуациях.',
          };
        }
        return chapter;
      }),
      levels: state.clientState.levels.map((level, index) => ({
        ...level,
        status:
          index < 9
            ? LevelProgressSummaryStatusEnum.Completed
            : index === 9
              ? LevelProgressSummaryStatusEnum.Available
              : LevelProgressSummaryStatusEnum.Locked,
      })),
    },
  };
}

function makeCampaignCompleteState(isCompletionShown = false): ClientStateResponse {
  const state = makeState(isCompletionShown ? NextAction.None : NextAction.CampaignComplete);
  return {
    ...state,
    clientState: {
      ...state.clientState,
      clientView: {
        ...state.clientState.clientView,
        balance: { ...state.clientState.clientView.balance, knowledgePoints: 266 },
        campaignProgress: { isCompleted: true, isCompletionShown },
      },
      chapters: state.clientState.chapters.map((chapter) => ({
        ...chapter,
        status: ChapterProgressStatusEnum.Completed,
        completedLevels: chapter.totalLevels,
      })),
      levels: state.clientState.levels.map((level) => ({
        ...level,
        status: LevelProgressSummaryStatusEnum.Completed,
      })),
      nextAction: isCompletionShown ? NextAction.None : NextAction.CampaignComplete,
    },
  };
}

const catalog: AppearanceCatalogResponse = {
  selectedCharacterId: CHARACTER_ID,
  selectedBackgroundId: BACKGROUND_ID,
  items: [
    {
      appearanceId: CHARACTER_ID,
      type: AppearanceTypeEnum.Character,
      rarity: AppearanceRarityEnum.Base,
      title: 'Классический аналитик',
      imageUrl: '/assets/character-analyst.webp',
      isOwned: true,
      isSelected: true,
    },
    {
      appearanceId: OWNED_CHARACTER_ID,
      type: AppearanceTypeEnum.Character,
      rarity: AppearanceRarityEnum.Regular,
      title: 'Штурман',
      imageUrl: '/assets/character-analyst.webp',
      isOwned: true,
      isSelected: false,
    },
    {
      appearanceId: LOCKED_CHARACTER_ID,
      type: AppearanceTypeEnum.Character,
      rarity: AppearanceRarityEnum.Regular,
      title: 'Капитан',
      imageUrl: '/assets/character-analyst.webp',
      isOwned: false,
      isSelected: false,
    },
    {
      appearanceId: BACKGROUND_ID,
      type: AppearanceTypeEnum.Background,
      rarity: AppearanceRarityEnum.Base,
      title: 'Ночной океан',
      imageUrl: '/assets/chapter-financial-cushion.webp',
      isOwned: true,
      isSelected: true,
    },
  ],
};

function makeApi(initialState = makeState()): P1Api {
  return {
    loadState: vi.fn().mockResolvedValue(initialState),
    resyncState: vi.fn().mockResolvedValue(initialState),
    confirmNarrativeShown: vi.fn().mockResolvedValue({
      chapterId: initialState.clientState.chapters[0].chapterId,
      isNarrativeShown: true,
      nextAction: NextAction.StartLevel,
    }),
    updateSettings: vi.fn(async (body) => ({
      musicEnabled: body.musicEnabled ?? true,
      soundEnabled: body.soundEnabled ?? true,
      tutorialCompleted: true,
    } satisfies SettingsResponse)),
    getAppearances: vi.fn().mockResolvedValue(catalog),
    selectAppearance: vi.fn(async (appearanceId) => ({
      appearanceId,
      type: SelectAppearanceResponseTypeEnum.Character,
      selectedCharacterId: appearanceId,
      selectedBackgroundId: BACKGROUND_ID,
    })),
    submitFeedback: vi.fn().mockResolvedValue({
      feedbackId: 'af8fad5b-d9cb-469f-a165-808677289521',
      status: SubmitFeedbackResponseStatusEnum.Submitted,
      nextAction: NextAction.None,
    }),
    dismissFeedback: vi.fn().mockResolvedValue({
      chapterId: initialState.clientState.chapters[0].chapterId,
      feedbackPromptShownAt: '2026-09-03T12:00:00.000Z',
      nextAction: NextAction.NextChapter,
    }),
    confirmCampaignCompleteShown: vi.fn().mockResolvedValue({
      isCompletionShown: true,
      nextAction: NextAction.None,
    }),
    getLevelResults: vi.fn(),
    acknowledgeLevelResults: vi.fn().mockResolvedValue({
      levelId: 'c3f8ad5b-d9cb-469f-a165-808677289500',
      resultsAcknowledgedAt: '2026-08-21T12:03:00.000Z',
      resultsState: 'acknowledged',
      nextAction: NextAction.StartLevel,
    }),
    claimReward: vi.fn().mockResolvedValue({
      rewardId: REWARD_ID,
      rewardType: ClaimRewardResponseRewardTypeEnum.Regular,
      state: ClaimRewardResponseStateEnum.Claimed,
      selectedOption: { selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Hint },
      claimResult: { balance: { knowledgePoints: 99, hintBalance: 6 } },
      nextAction: NextAction.Play,
    } satisfies ClaimRewardResponse),
    enterLevel: vi.fn().mockResolvedValue(makeLevelPlay()),
      useHint: vi.fn().mockResolvedValue({
        hintBalance: 4,
        knowledgePoints: 7,
        revealedCells: [{ row: 0, col: 0 }],
        hintTarget: {
          targetId: DO_TARGET_ID,
          revealedCells: [{ row: 0, col: 0 }],
        },
        foundTargets: [],
      targetsRemaining: 1,
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies HintUseResponse),
    submitRoute: vi.fn().mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Invalid,
      levelCompleted: false,
      newBonusWords: [],
      newFoundTargets: [],
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse),
  };
}

function makeFirstRunState(): ClientStateResponse {
  const state = makeState(NextAction.StartLevel);
  return {
    ...state,
    clientState: {
      ...state.clientState,
      clientView: {
        ...state.clientState.clientView,
        settings: {
          ...state.clientState.clientView.settings,
          tutorialCompleted: false,
        },
      },
      chapters: state.clientState.chapters.map((chapter, index) =>
        index === 0
          ? {
              ...chapter,
              title: 'Азбука денег',
              isNarrativeShown: false,
              narrativeText: 'Начните с простых финансовых понятий и постепенно соберите свою базу знаний.',
            }
          : chapter,
      ),
    },
  };
}

async function submitTutorialRoute(
  startName: RegExp,
  arrows: string[],
) {
  const start = screen.getByRole('button', { name: startName });
  start.focus();
  fireEvent.keyDown(start, { key: 'Enter' });
  for (const key of arrows) {
    fireEvent.keyDown(document.activeElement as HTMLElement, { key });
  }
  fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Enter' });
}

async function finishMinimumLoading() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
}

const directRoute = [
  { label: 'Д, строка 1, столбец 1', ref: { row: 0, col: 0 } },
  { label: 'О, строка 1, столбец 2', ref: { row: 0, col: 1 } },
] satisfies Array<{ label: string; ref: CellRef }>;

const foundTarget: FoundTarget = {
  targetId: DO_TARGET_ID,
  word: 'ДО',
  definition: 'Деньги, полученные за определённый период.',
  foundAt: '2026-08-21T12:01:00.000Z',
  foundSequence: 1,
  cells: directRoute.map(({ ref }) => ref),
};

const stockTarget: FoundTarget = {
  targetId: AKCIYA_TARGET_ID,
  word: 'АКЦИЯ',
  definition: 'Ценная бумага, которая подтверждает долю владения компанией.',
  foundAt: '2026-08-21T12:01:00.000Z',
  foundSequence: 1,
  courseOffer: {
    courseId: '8f8fad5b-d9cb-469f-a165-808677289599',
    locale: 'ru-RU',
    badgeLabel: 'Мини-курс',
    title: 'Курс «Как работают акции»',
  },
  cells: directRoute.map(({ ref }) => ref),
};

function makeLevelResults(): LevelResultsResponse {
  const level = makeLevelPlay();
  return {
    levelId: level.levelId,
    status: LevelResultsResponseStatusEnum.Completed,
    resultsState: LevelResultsResponseResultsStateEnum.PendingAcknowledgement,
    completionKind: LevelResultsResponseCompletionKindEnum.Level,
    board: {
      ...level.board,
      cells: level.board.cells.map((cell) => ({
        ...cell,
        state: CellViewStateEnum.Found,
        belongsToFoundWord: true,
      })),
    },
    foundTargets: [foundTarget],
    bonusWords: [],
    completedAt: '2026-08-21T12:02:00.000Z',
    summary: {
      earnedKnowledgePoints: 1,
      knowledgePointsTotal: 8,
      targets: { foundCount: 1, totalCount: 1 },
      bonuses: { foundCount: 0 },
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
}

async function renderActiveGame(api: P1Api, options: { fakeTimers?: boolean } = {}) {
  if (options.fakeTimers) vi.useFakeTimers();
  const view = render(
    <P1App
      api={api}
      minimumLoadingMs={0}
    />,
  );
  if (options.fakeTimers) {
    await act(async () => {
      await vi.runAllTimersAsync();
    });
    screen.getByLabelText('Игровой экран уровня 1');
  } else {
    await screen.findByLabelText('Игровой экран уровня 1');
    // Flush mount effects before sending the first pointer gesture.
    await act(async () => { await Promise.resolve(); });
  }
  return view;
}

async function expectModalFocusContract(
  dialog: HTMLElement,
  user: ReturnType<typeof userEvent.setup>,
) {
  const focusable = [
    ...within(dialog).queryAllByRole('button'),
    ...within(dialog).queryAllByRole('switch'),
    ...within(dialog).queryAllByRole('radio'),
    ...within(dialog).queryAllByRole('textbox'),
  ].filter((element) => !element.hasAttribute('disabled'));

  expect(focusable.length).toBeGreaterThan(0);
  expect(dialog).toContainElement(document.activeElement as HTMLElement);

  focusable.at(-1)?.focus();
  await user.tab();
  expect(dialog).toContainElement(document.activeElement as HTMLElement);

  focusable[0]?.focus();
  await user.tab({ shift: true });
  expect(dialog).toContainElement(document.activeElement as HTMLElement);
}

function releaseRoute(route: Array<{ label: string; ref: CellRef }>) {
  const board = screen.getByLabelText('Игровое поле');
  const [first, ...rest] = route;
  let pointedElement: Element | null = null;
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: vi.fn(() => pointedElement),
  });

  fireEvent.pointerDown(screen.getByLabelText(first.label), { pointerId: 17 });
  rest.forEach(({ label }, index) => {
    pointedElement = screen.getByLabelText(label);
    fireEvent.pointerMove(board, {
      pointerId: 17,
      clientX: index + 1,
      clientY: index + 1,
    });
  });
  fireEvent.pointerUp(board, { pointerId: 17 });
}

function mockHudHeight(initialHeight: number) {
  let height = initialHeight;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', vi.fn((media: string) => ({
    media,
    get matches() {
      return media === '(min-height: 720px)' && height >= 720;
    },
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    addListener: (listener: () => void) => listeners.add(listener),
    removeListener: (listener: () => void) => listeners.delete(listener),
    dispatchEvent: () => true,
  })));
  return (nextHeight: number) => act(() => {
    height = nextHeight;
    listeners.forEach((listener) => listener());
  });
}

describe('P1 application shell', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.mocked(openDeepLink).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps Loading visible for at least 250 ms', async () => {
    vi.useFakeTimers();
    render(<P1App api={makeApi()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Подключаемся');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(screen.queryByLabelText('Главный экран')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByLabelText('Главный экран')).toBeVisible();
  });

  it('shows Error when loading exceeds 8 seconds', async () => {
    vi.useFakeTimers();
    const api = makeApi();
    vi.mocked(api.loadState).mockReturnValue(new Promise(() => undefined));
    render(<P1App api={api} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(screen.getByRole('heading', { name: 'Что-то пошло не так' })).toBeVisible();
  });

  it('Refresh repeats the complete bootstrap/state load', async () => {
    const api = makeApi();
    vi.mocked(api.loadState)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(makeState());
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByRole('heading', { name: 'Что-то пошло не так' });

    await user.click(screen.getByRole('button', { name: 'Обновить' }));
    await screen.findByLabelText('Главный экран');

    expect(api.loadState).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Главный экран')).toBeVisible();
  });

  it.each([
    [NextAction.None, 'Главный экран'],
    [NextAction.StartLevel, 'Главный экран'],
    [NextAction.Play, 'Игровой прототип'],
  ])('routes nextAction=%s to the expected surface', async (nextAction, label) => {
    vi.useFakeTimers();
    render(
      <P1App
        api={makeApi(makeState(nextAction))}
        game={<div aria-label="Игровой прототип" />}
      />,
    );
    await finishMinimumLoading();

    expect(screen.getByLabelText(label)).toBeVisible();
  });

  it('resumes bootstrap nextAction=play before mounting the Game surface', async () => {
    const state = makeState(NextAction.Play);
    state.clientState.inProgressLevel = {
      levelId: 'c3f8ad5b-d9cb-469f-a165-808677289500',
      levelVersionId: 'c3f8ad5b-d9cb-469f-a165-808677289501',
      startedAt: '2026-08-21T12:00:00.000Z',
    };
    const api = makeApi(state);
    let resolveLevel: (value: LevelPlayResponse) => void = () => undefined;
    vi.mocked(api.enterLevel).mockReturnValue(
      new Promise((resolve) => {
        resolveLevel = resolve;
      }),
    );
    render(
      <P1App
        api={api}
        game={<div aria-label="Игровой прототип" />}
        minimumLoadingMs={0}
      />,
    );

    await waitFor(() => expect(api.enterLevel).toHaveBeenCalledWith(state, expect.anything()));
    expect(screen.queryByLabelText('Игровой прототип')).not.toBeInTheDocument();

    await act(async () => resolveLevel(makeLevelPlay()));
    expect(await screen.findByLabelText('Игровой прототип')).toBeVisible();
  });

  it('enters the only available level from Home and does not switch phase early', async () => {
    const api = makeApi();
    let resolveLevel: (value: LevelPlayResponse) => void = () => undefined;
    vi.mocked(api.enterLevel).mockReturnValue(
      new Promise((resolve) => {
        resolveLevel = resolve;
      }),
    );
    const user = userEvent.setup();
    render(
      <P1App
        api={api}
        game={<div aria-label="Игровой прототип" />}
        minimumLoadingMs={0}
      />,
    );
    await screen.findByLabelText('Главный экран');

    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    expect(screen.getByLabelText('Главный экран')).toBeVisible();
    expect(screen.queryByLabelText('Игровой прототип')).not.toBeInTheDocument();

    await act(async () => resolveLevel(makeLevelPlay()));
    expect(await screen.findByLabelText('Игровой прототип')).toBeVisible();
  });

  it('shows a new game at chapter 1, level 1 with no progress before the first chapter', async () => {
    render(<P1App api={makeApi()} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');

    const firstChapter = screen.getByText('Первый капитал').closest('article');
    expect(firstChapter).toHaveAttribute('aria-current', 'step');
    expect(firstChapter).toHaveTextContent('0/9');
    expect(screen.getByRole('button', { name: 'Уровень 1' })).toBeVisible();
  });

  it('uses the next level number as the default Home primary label', async () => {
    const state = makeState();
    state.clientState.chapters[0].completedLevels = 2;
    state.clientState.levels[0].status = LevelProgressSummaryStatusEnum.Completed;
    state.clientState.levels[1].status = LevelProgressSummaryStatusEnum.Completed;
    state.clientState.levels[2].status = LevelProgressSummaryStatusEnum.Available;

    render(<P1App api={makeApi(state)} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');

    expect(screen.getByRole('button', { name: 'Уровень 3' })).toBeVisible();
  });

  it('sends only the changed Settings field in PATCH', async () => {
    const api = makeApi();
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');

    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('switch', { name: 'Музыка' }));

    expect(api.updateSettings).toHaveBeenCalledWith({ musicEnabled: false });
  });

  it('renders catalogue ownership and updates selection from the server response', async () => {
    const api = makeApi();
    vi.mocked(api.selectAppearance).mockResolvedValue({
      appearanceId: OWNED_CHARACTER_ID,
      type: SelectAppearanceResponseTypeEnum.Character,
      selectedCharacterId: OWNED_CHARACTER_ID,
      selectedBackgroundId: BACKGROUND_ID,
    });
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');

    await user.click(screen.getByRole('button', { name: 'Облики' }));
    expect(await screen.findByText('Доступно')).toBeVisible();
    expect(screen.getByText('Не получено')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Штурман' }));
    expect(api.selectAppearance).toHaveBeenCalledWith(OWNED_CHARACTER_ID);
    expect(screen.getByRole('button', { name: 'Штурман' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('never sends select for a non-owned appearance', async () => {
    const api = makeApi();
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Облики' }));

    const locked = await screen.findByRole('button', { name: 'Капитан' });
    expect(locked).toBeDisabled();
    await user.click(locked);
    expect(api.selectAppearance).not.toHaveBeenCalledWith(LOCKED_CHARACTER_ID);
  });

  it('submits feedback opened from Settings with source=settings and no chapterId', async () => {
    const api = makeApi();
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');

    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('button', { name: 'Оценить игру' }));
    await user.click(screen.getByRole('radio', { name: '5' }));
    await user.type(screen.getByLabelText('Комментарий'), 'Отличная игра');
    await user.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(api.submitFeedback).toHaveBeenCalledWith({
      source: 'settings',
      rating: 5,
      comment: 'Отличная игра',
    });
  });

  it('открывает regular RewardModal сразу при bootstrap и повторном reload без клика Home', async () => {
    const api = makeApi(makeState(NextAction.ClaimReward));
    const firstMount = render(<P1App api={api} minimumLoadingMs={0} />);

    await screen.findByLabelText('Главный экран');
    expect(screen.getByRole('dialog', { name: 'Выберите награду' })).toBeVisible();

    firstMount.unmount();
    render(<P1App api={api} minimumLoadingMs={0} />);

    await screen.findByLabelText('Главный экран');
    expect(screen.getByRole('dialog', { name: 'Выберите награду' })).toBeVisible();
  });

  it('proceeds toward game after a successful regular reward claim', async () => {
    const api = makeApi(makeState(NextAction.ClaimReward));
    const user = userEvent.setup();
    render(
      <P1App
        api={api}
        game={<div aria-label="Игровой прототип" />}
        minimumLoadingMs={0}
      />,
    );
    const home = await screen.findByLabelText('Главный экран');
    await user.click(within(home).getByRole('button', { name: 'Забрать награду' }));
    await screen.findByRole('dialog', { name: 'Выберите награду' });

    await user.click(screen.getByRole('radio', { name: /1 подсказка/i }));
    await user.click(screen.getByRole('button', { name: 'Забрать' }));

    await waitFor(() => expect(screen.getByLabelText('Игровой прототип')).toBeVisible());
    expect(api.claimReward).toHaveBeenCalledWith(REWARD_ID, {
      rewardType: 'hint',
    });
  });

  it('делает regular RewardModal модальным с фокусом и trap поверх Home', async () => {
    const api = makeApi(makeState(NextAction.ClaimReward));
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);

    const home = await screen.findByLabelText('Главный экран');
    await user.click(within(home).getByRole('button', { name: 'Забрать награду' }));

    const dialog = await screen.findByRole('dialog', { name: 'Выберите награду' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const options = within(dialog).getAllByRole('radio');
    expect(options).not.toHaveLength(0);
    expect(document.activeElement).toBe(options[0]);

    const firstOption = options[0];
    const lastOption = options[options.length - 1];
    lastOption.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(firstOption);

    firstOption.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastOption);

    expect(home).toHaveAttribute('inert');
  });

  it('changes balances and ownership only from server responses', async () => {
    const api = makeApi(makeState(NextAction.ClaimReward));
    let resolveClaim: (response: ClaimRewardResponse) => void = () => undefined;
    vi.mocked(api.claimReward).mockReturnValue(
      new Promise((resolve) => {
        resolveClaim = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    const home = await screen.findByLabelText('Главный экран');
    await user.click(within(home).getByRole('button', { name: 'Забрать награду' }));
    await screen.findByRole('dialog', { name: 'Выберите награду' });

    expect(screen.getByLabelText(/Знания:/)).toHaveTextContent('0');
    await user.click(screen.getByRole('radio', { name: /1 подсказка/i }));
    await user.click(screen.getByRole('button', { name: 'Забрать' }));
    expect(screen.getByLabelText(/Знания:/)).toHaveTextContent('0');

    await act(async () => {
      resolveClaim({
        rewardId: REWARD_ID,
        state: ClaimRewardResponseStateEnum.Claimed,
        claimResult: {
          balance: { knowledgePoints: 23, hintBalance: 8 },
          decoration: {
            appearanceId: LOCKED_CHARACTER_ID,
            type: 'character',
          },
        },
        nextAction: NextAction.None,
      } as ClaimRewardResponse);
    });

    expect(screen.getByLabelText(/Знания:/)).toHaveTextContent('23');
  });

  it('labels the Home action with the globally available level across chapter boundaries', async () => {
    const state = makeState();
    state.clientState.chapters[0] = {
      ...state.clientState.chapters[0],
      status: ChapterProgressStatusEnum.Completed,
      completedLevels: 9,
    };
    state.clientState.chapters[1] = {
      ...state.clientState.chapters[1],
      status: ChapterProgressStatusEnum.InProgress,
      completedLevels: 7,
      totalLevels: 8,
    };
    state.clientState.levels = state.clientState.levels.map((level, index) => ({
      ...level,
      status: index < 16
        ? LevelProgressSummaryStatusEnum.Completed
        : index === 16
          ? LevelProgressSummaryStatusEnum.Available
          : LevelProgressSummaryStatusEnum.Locked,
    }));

    render(<P1App api={makeApi(state)} minimumLoadingMs={0} />);

    const home = await screen.findByLabelText('Главный экран');
    expect(within(home).getByRole('button', { name: 'Уровень 17' })).toBeVisible();
    expect(within(home).queryByRole('button', { name: 'Уровень 8' }))
      .not.toBeInTheDocument();
  });

  it('после claim regular reward скрывает bonus cycle на Home, но показывает 1/6 в Game и sheet', async () => {
    const initialState = makeState(NextAction.ClaimReward);
    const refreshedState = makeState(NextAction.None, 1, 6, NEXT_REWARD_ID);
    const api = makeApi(initialState);
    vi.mocked(api.loadState)
      .mockResolvedValueOnce(initialState)
      .mockResolvedValueOnce(refreshedState);
    vi.mocked(api.claimReward).mockResolvedValue({
      rewardId: REWARD_ID,
      rewardType: ClaimRewardResponseRewardTypeEnum.Regular,
      state: ClaimRewardResponseStateEnum.Claimed,
      selectedOption: { selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Hint },
      claimResult: { balance: { knowledgePoints: 0, hintBalance: 6 } },
      nextAction: NextAction.None,
    } satisfies ClaimRewardResponse);
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);

    const home = await screen.findByLabelText('Главный экран');
    expect(within(home).getByLabelText('Знания: 0')).toBeVisible();
    await user.click(within(home).getByRole('button', { name: 'Забрать награду' }));
    await user.click(screen.getByRole('radio', { name: '1 подсказка' }));
    await user.click(screen.getByRole('button', { name: 'Забрать' }));

    await waitFor(() => expect(api.loadState).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Главный экран')).toBeVisible();
    expect(within(home).queryByText('1/6', { exact: true })).not.toBeInTheDocument();
    expect(within(home).getByText('Золотой конверт', { exact: true })).toBeVisible();
    expect(within(home).getByRole('progressbar', { name: 'Прогресс золотого конверта' }))
      .toHaveAttribute('aria-valuenow', '0');

    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');
    expect(screen.getByLabelText('Знания: 0')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Прогресс бонусного конверта' }))
      .toHaveAttribute('aria-valuemax', '6');
    expect(screen.getByText('1/6')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Бонусные слова: 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Бонусные слова' });
    expect(within(dialog).getByText('1/6')).toBeVisible();
    expect(within(dialog).queryByText('0/0')).not.toBeInTheDocument();
  });

  it('после успешного claim и ошибки API002 не переоткрывает reward и не рисует неизвестный progress как 0/0', async () => {
    const initialState = makeState(NextAction.ClaimReward);
    const api = makeApi(initialState);
    vi.mocked(api.loadState)
      .mockResolvedValueOnce(initialState)
      .mockRejectedValueOnce(new Error('API002 unavailable'));
    vi.mocked(api.claimReward).mockResolvedValue({
      rewardId: REWARD_ID,
      rewardType: ClaimRewardResponseRewardTypeEnum.Regular,
      state: ClaimRewardResponseStateEnum.Claimed,
      selectedOption: { selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Hint },
      claimResult: { balance: { knowledgePoints: 0, hintBalance: 6 } },
      nextAction: NextAction.None,
    } satisfies ClaimRewardResponse);
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);

    const home = await screen.findByLabelText('Главный экран');
    await user.click(within(home).getByRole('button', { name: 'Забрать награду' }));
    await user.click(screen.getByRole('radio', { name: '1 подсказка' }));
    await user.click(screen.getByRole('button', { name: 'Забрать' }));

    await waitFor(() => expect(api.loadState).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument();
    });
    expect(api.claimReward).toHaveBeenCalledTimes(1);
    expect(within(home).queryByRole('button', { name: 'Забрать награду' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    const game = await screen.findByLabelText('Игровой экран уровня 1');
    await user.click(within(game).getByRole('button', { name: /^Бонусные слова/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Бонусные слова' });

    const unknownProgressSurfaces = [
      within(home).queryByText('0/0'),
      within(home).queryByText(/0 из 0/),
      within(game).queryByText('0/0'),
      within(game).queryByText(/0 из 0/),
      within(dialog).queryByText('0/0'),
      within(dialog).queryByText(/0 из 0/),
      within(game).queryByRole('progressbar', { name: 'Прогресс бонусного конверта' }),
      within(dialog).queryByRole('progressbar', { name: 'Прогресс бонусных слов' }),
    ].filter(Boolean);

    expect(unknownProgressSurfaces).toHaveLength(0);
  });

  it('после пятого уникального bonus response показывает 1/6 и не сбрасывает progress в 0/0', async () => {
    const api = makeApi(makeState(NextAction.Play, 0, 6));
    const level = makeLevelPlay();
    level.bonusWords = [
      { word: 'ДАР', foundAt: '2026-08-21T12:00:00.000Z' },
      { word: 'ЛАПА', foundAt: '2026-08-21T12:00:01.000Z' },
      { word: 'ХОД', foundAt: '2026-08-21T12:00:02.000Z' },
      { word: 'ПАР', foundAt: '2026-08-21T12:00:03.000Z' },
    ];
    vi.mocked(api.enterLevel).mockResolvedValue(level);
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: false,
      knowledgePoints: 0,
      rewardProgress: 1,
      targetsRemaining: 1,
      newBonusWords: [{ word: 'РОТ', foundAt: '2026-08-21T12:01:00.000Z' }],
      newFoundTargets: [],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api);

    releaseRoute(directRoute);

    expect(await screen.findByText('РОТ · бонусное слово')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Бонусные слова: 1' })).toBeVisible();
    expect(screen.getByText('1/6')).toBeVisible();
    expect(screen.queryByText('0/0')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Бонусные слова: 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Бонусные слова' });
    expect(within(dialog).getByText('1/6')).toBeVisible();
    expect(within(dialog).queryByText('0/0')).not.toBeInTheDocument();
  });

  it('opens an exit confirmation bottom-sheet when Home close is pressed', async () => {
    const user = userEvent.setup();
    render(<P1App api={makeApi()} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');

    await user.click(screen.getByRole('button', { name: 'Закрыть игру' }));

    const dialog = screen.getByRole('dialog', { name: 'Выйти из игры?' });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveTextContent(
      'Прогресс сохранится. Вернуться в игру можно в любой момент.',
    );
    expect(screen.getByRole('button', { name: 'Выйти' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Остаться' })).toBeVisible();
  });

  it('Выйти keeps the dialog open and does not navigate or call mutations', async () => {
    const api = makeApi();
    const user = userEvent.setup();
    render(
      <P1App api={api} game={<div aria-label="Игровой прототип" />} minimumLoadingMs={0} />,
    );
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Закрыть игру' }));

    await user.click(screen.getByRole('button', { name: 'Выйти' }));

    expect(screen.getByRole('dialog', { name: 'Выйти из игры?' })).toBeVisible();
    expect(screen.queryByLabelText('Игровой прототип')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Главный экран')).toBeVisible();
    expect(api.updateSettings).not.toHaveBeenCalled();
    expect(api.claimReward).not.toHaveBeenCalled();
    expect(api.selectAppearance).not.toHaveBeenCalled();
    expect(api.submitFeedback).not.toHaveBeenCalled();
  });

  it('Остаться closes the exit dialog and keeps Home', async () => {
    const user = userEvent.setup();
    render(<P1App api={makeApi()} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Закрыть игру' }));
    await user.click(screen.getByRole('button', { name: 'Остаться' }));

    expect(screen.queryByRole('dialog', { name: 'Выйти из игры?' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Главный экран')).toBeVisible();
  });

  it('the exit dialog close control dismisses to Home like Остаться', async () => {
    const user = userEvent.setup();
    render(<P1App api={makeApi()} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Закрыть игру' }));

    const dialog = screen.getByRole('dialog', { name: 'Выйти из игры?' });
    await user.click(within(dialog).getByRole('button', { name: /закрыть/i }));

    expect(screen.queryByRole('dialog', { name: 'Выйти из игры?' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Главный экран')).toBeVisible();
  });

  it('Settings modal is a modal surface with focus trap, Escape close, inert Home, and focus restore', async () => {
    const user = userEvent.setup();
    render(<P1App api={makeApi()} minimumLoadingMs={0} />);
    const home = await screen.findByLabelText('Главный экран');
    const opener = within(home).getByRole('button', { name: 'Настройки' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Настройки' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(home).toHaveAttribute('inert');
    await expectModalFocusContract(dialog, user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Настройки' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('Feedback form is modal and returns focus to Settings after Escape', async () => {
    const user = userEvent.setup();
    render(<P1App api={makeApi()} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    const settings = screen.getByRole('dialog', { name: 'Настройки' });
    const opener = within(settings).getByRole('button', { name: 'Оценить игру' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Оставить отзыв' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(settings).toHaveAttribute('inert');
    await expectModalFocusContract(dialog, user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Оставить отзыв' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toBeVisible();
    expect(document.activeElement).toBe(opener);
  });

  it('Exit modal traps focus, makes Home inert, and restores the close opener', async () => {
    const user = userEvent.setup();
    render(<P1App api={makeApi()} minimumLoadingMs={0} />);
    const home = await screen.findByLabelText('Главный экран');
    const opener = within(home).getByRole('button', { name: 'Закрыть игру' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Выйти из игры?' });
    expect(home).toHaveAttribute('inert');
    await expectModalFocusContract(dialog, user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Выйти из игры?' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('definition modal traps focus, makes the game inert, and restores the found-cell opener', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newFoundTargets: [foundTarget],
      newBonusWords: [],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    const user = userEvent.setup();
    await renderActiveGame(api);
    releaseRoute(directRoute);
    const opener = await screen.findByRole('button', {
      name: 'О, строка 1, столбец 2. Найденное слово ДО. Открыть информацию',
    });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'ДО' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Игровой экран уровня 1')).toHaveAttribute('inert');
    await expectModalFocusContract(dialog, user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'ДО' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('Course Error modal traps focus, makes the game inert, and restores its found-cell opener', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newFoundTargets: [stockTarget],
      newBonusWords: [],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    const user = userEvent.setup();
    await renderActiveGame(api);
    releaseRoute(directRoute);
    const opener = await screen.findByRole('button', {
      name: 'Д, строка 1, столбец 1. Найденное слово АКЦИЯ. Открыть информацию',
    });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'АКЦИЯ' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Игровой экран уровня 1')).toHaveAttribute('inert');
    await expectModalFocusContract(dialog, user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'АКЦИЯ' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('Bonus Words modal traps focus, makes the game inert, and restores its opener after Escape', async () => {
    const user = userEvent.setup();
    render(<P1App api={makeApi(makeState(NextAction.None, 1, 4))} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');
    const opener = screen.getByRole('button', { name: 'Бонусные слова: 1' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Бонусные слова' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByLabelText('Игровой экран уровня 1')).toHaveAttribute('inert');
    await expectModalFocusContract(dialog, user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Бонусные слова' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener);
  });

  it('exits the level to Home when Выйти is confirmed in the game exit dialog', async () => {
    const user = userEvent.setup();
    const api = makeApi();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');

    await user.click(screen.getByRole('button', { name: 'Выйти из уровня' }));
    expect(screen.getByRole('dialog', { name: 'Выйти из игры?' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Выйти' }));

    expect(screen.queryByRole('dialog', { name: 'Выйти из игры?' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Главный экран')).toBeVisible();

    // After exiting a played level, Home must reflect the active level as resumable.
    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeVisible();

    // Resuming must go through API-005 (resume) with inProgressLevel, not a fresh API-004.
    await user.click(screen.getByRole('button', { name: 'Продолжить' }));
    await screen.findByLabelText('Игровой экран уровня 1');
    const lastEnterLevelState = vi.mocked(api.enterLevel).mock.calls.at(-1)?.[0];
    expect(lastEnterLevelState).toEqual(
      expect.objectContaining({
        clientState: expect.objectContaining({
          inProgressLevel: expect.objectContaining({
            levelId: makeLevelPlay().levelId,
          }),
        }),
      }),
    );
  });

  it('shows the golden envelope progress and hides the bonus envelope on Home for a new game', async () => {
    render(<P1App api={makeApi()} minimumLoadingMs={0} />);
    const home = await screen.findByLabelText('Главный экран');

    expect(within(home).getByRole('progressbar', { name: 'Прогресс золотого конверта' }))
      .toHaveAttribute('aria-valuenow', '0');
    expect(within(home).getAllByText('0/9').length).toBeGreaterThan(0);
    expect(within(home).queryByText('Бонусный конверт', { exact: true })).not.toBeInTheDocument();
  });

  it('uses Продолжить as the Home primary label when a level is in progress', async () => {
    const state = makeState();
    state.clientState.inProgressLevel = {
      levelId: 'c3f8ad5b-d9cb-469f-a165-808677289500',
      levelVersionId: 'c3f8ad5b-d9cb-469f-a165-808677289501',
      startedAt: '2026-08-20T10:00:00.000Z',
    };

    render(<P1App api={makeApi(state)} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');

    expect(screen.getByRole('button', { name: 'Продолжить' })).toBeVisible();
  });

  it('keeps feedback success as a bottom sheet titled Обратная связь over mounted Home', async () => {
    const api = makeApi();
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('button', { name: 'Оценить игру' }));
    await user.click(screen.getByRole('radio', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'Отправить' }));

    // Figma 40010714:199717: title stays "Обратная связь", success message "Спасибо за отзыв!",
    // no "Отзыв отправлен" copy, success stays a bottom sheet over mounted Home.
    expect(await screen.findByRole('dialog', { name: 'Обратная связь' })).toBeVisible();
    expect(screen.getByText('Спасибо за отзыв!')).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Отзыв отправлен' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Главный экран')).toBeVisible();
  });

  it('feedback success is non-dismissible and returns to Settings after the success state', async () => {
    vi.useFakeTimers();
    const api = makeApi();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    const home = screen.getByLabelText('Главный экран');
    fireEvent.click(within(home).getByRole('button', { name: 'Настройки' }));
    const settings = screen.getByRole('dialog', { name: 'Настройки' });
    fireEvent.click(within(settings).getByRole('button', { name: 'Оценить игру' }));
    fireEvent.click(screen.getByRole('radio', { name: '5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Отправить' }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    const success = screen.getByRole('dialog', { name: 'Обратная связь' });
    expect(success).toHaveAttribute('aria-modal', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Обратная связь' })).toBeVisible();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_800);
    });
    expect(screen.getByRole('dialog', { name: 'Настройки' })).toBeVisible();
  });

  it('announces Settings pending/success and exposes an alert plus retry after an error', async () => {
    const api = makeApi();
    let resolveRetry: (response: SettingsResponse) => void = () => undefined;
    vi.mocked(api.updateSettings)
      .mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(new Promise((resolve) => { resolveRetry = resolve; }));
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Настройки' }));

    await user.click(screen.getByRole('switch', { name: 'Музыка' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось сохранить настройки');
    const music = screen.getByRole('switch', { name: 'Музыка' });
    expect(music).toBeEnabled();

    await user.click(music);
    expect(screen.getByRole('status')).toBeVisible();
    await act(async () => resolveRetry({
      musicEnabled: false,
      soundEnabled: true,
      tutorialCompleted: true,
    }));
    expect(screen.getByRole('status')).toBeVisible();
    expect(api.updateSettings).toHaveBeenCalledTimes(2);
  });

  it('announces Feedback pending/success and keeps submit available after an alert', async () => {
    const api = makeApi();
    let resolveRetry: (response: SubmitFeedbackResponse) => void = () => undefined;
    vi.mocked(api.submitFeedback)
      .mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(new Promise((resolve) => { resolveRetry = resolve; }));
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('button', { name: 'Оценить игру' }));
    await user.click(screen.getByRole('radio', { name: '5' }));

    const submit = screen.getByRole('button', { name: 'Отправить' });
    await user.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось отправить отзыв');
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(screen.getByRole('status')).toBeVisible();
    await act(async () => resolveRetry({
      feedbackId: 'af8fad5b-d9cb-469f-a165-808677289521',
      status: SubmitFeedbackResponseStatusEnum.Submitted,
      nextAction: NextAction.None,
    }));
    expect(screen.getByRole('dialog', { name: 'Обратная связь' })).toBeVisible();
  });

  it('announces regular reward pending and exposes alert plus retry after a claim error', async () => {
    const api = makeApi(makeState(NextAction.ClaimReward));
    let resolveRetry: (response: ClaimRewardResponse) => void = () => undefined;
    vi.mocked(api.claimReward)
      .mockRejectedValueOnce(new Error('offline'))
      .mockReturnValueOnce(new Promise((resolve) => { resolveRetry = resolve; }));
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    const home = await screen.findByLabelText('Главный экран');
    await user.click(within(home).getByRole('button', { name: 'Забрать награду' }));
    await user.click(screen.getByRole('radio', { name: '1 подсказка' }));

    const claim = screen.getByRole('button', { name: 'Забрать' });
    await user.click(claim);
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось забрать награду');
    expect(claim).toBeEnabled();

    await user.click(claim);
    expect(screen.getByRole('status')).toBeVisible();
    await act(async () => resolveRetry({
      rewardId: REWARD_ID,
      rewardType: ClaimRewardResponseRewardTypeEnum.Regular,
      state: ClaimRewardResponseStateEnum.Claimed,
      selectedOption: { selectedOptionType: SelectedOptionSelectedOptionTypeEnum.Hint },
      claimResult: { balance: { knowledgePoints: 9, hintBalance: 6 } },
      nextAction: NextAction.None,
    }));
    expect(api.claimReward).toHaveBeenCalledTimes(2);
  });

  it('merges API-007 into LevelPlayResponse while preserving board and bonus words', async () => {
    const api = makeApi(makeState(NextAction.None, 1));
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');

    expect(screen.getByRole('button', { name: 'Бонусные слова: 1' })).toBeVisible();
    expect(screen.getByLabelText('Д, строка 1, столбец 1')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Использовать подсказку' }));

    expect(await screen.findByText('Первая буква слова открыта')).toBeVisible();
    expect(screen.getByLabelText('Д, строка 1, столбец 1').className).toContain(
      'hintCurrent',
    );
    expect(screen.getByRole('button', { name: 'Бонусные слова: 1' })).toBeVisible();
    expect(screen.getByLabelText('Знания: 7')).toBeVisible();
  });

  it('merges a newly found target via hint without completing the level and announces ДОХОД · +1 знание', async () => {
    const api = makeApi();
    vi.mocked(api.useHint).mockResolvedValue({
      hintBalance: 3,
      knowledgePoints: 8,
      revealedCells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ],
      hintTarget: {
        targetId: DOHOD_TARGET_ID,
        revealedCells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 2, col: 2 },
        ],
      },
      completedTarget: {
        targetId: DOHOD_TARGET_ID,
        word: 'ДОХОД',
        definition: 'Деньги, полученные за определённый период.',
        foundAt: '2026-08-21T12:01:00.000Z',
        foundSequence: 1,
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 2, col: 2 },
        ],
      },
      foundTargets: [
        {
          targetId: DOHOD_TARGET_ID,
          word: 'ДОХОД',
          definition: 'Деньги, полученные за определённый период.',
          foundAt: '2026-08-21T12:01:00.000Z',
          foundSequence: 1,
          cells: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 },
            { row: 1, col: 2 },
            { row: 2, col: 2 },
          ],
        },
      ],
      targetsRemaining: 6,
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies HintUseResponse);
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');
    await user.click(screen.getByRole('button', { name: 'Использовать подсказку' }));

    expect(await screen.findByText('ДОХОД · +1 знание')).toBeVisible();
    expect(screen.getByLabelText('Знания: 8')).toBeVisible();
    // income-клетки залокированы как найденное целевое слово.
    expect(screen.getByRole('button', {
      name: 'Д, строка 1, столбец 1. Найденное слово ДОХОД. Открыть информацию',
    })).toBeEnabled();
    // Доска остаётся доступной для следующего маршрута.
    expect(screen.getByLabelText('Игровое поле')).not.toHaveAttribute('aria-disabled');
    // Общие hint-сообщения не должны подменять целевой notice.
    expect(screen.queryByText('Уровень завершён')).not.toBeInTheDocument();
    expect(screen.queryByText('Первая буква слова открыта')).not.toBeInTheDocument();
    expect(screen.queryByText('Осталась последняя подсказка')).not.toBeInTheDocument();
  });

  it('переключает hint trail на следующую нерешённую цель и убирает trail после ручного нахождения активной', async () => {
    const api = makeApi(makeState(NextAction.Play, 1));
    vi.mocked(api.useHint)
      .mockResolvedValueOnce({
        hintBalance: 4,
        knowledgePoints: 7,
        revealedCells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ],
        hintTarget: {
          targetId: DO_TARGET_ID,
          revealedCells: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
        },
        foundTargets: [],
        targetsRemaining: 1,
        levelCompleted: false,
        nextAction: NextAction.Play,
      } satisfies HintUseResponse)
      .mockResolvedValueOnce({
        hintBalance: 3,
        knowledgePoints: 8,
        revealedCells: [
          { row: 1, col: 0 },
          { row: 1, col: 1 },
        ],
        hintTarget: {
          targetId: NEXT_TARGET_ID,
          revealedCells: [
            { row: 1, col: 0 },
            { row: 1, col: 1 },
          ],
        },
        foundTargets: [foundTarget],
        targetsRemaining: 0,
        levelCompleted: false,
        nextAction: NextAction.Play,
      } satisfies HintUseResponse);
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [foundTarget],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    const user = userEvent.setup();

    await renderActiveGame(api);
    await user.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    expect(await screen.findByText('Первая буква слова открыта')).toBeVisible();
    expect(screen.getByLabelText('О, строка 1, столбец 2').className).toContain('hintCurrent');

    releaseRoute(directRoute);
    expect(await screen.findByText('+1 знание')).toBeVisible();
    expect(screen.getByRole('button', {
      name: 'О, строка 1, столбец 2. Найденное слово ДО. Открыть информацию',
    }).className).not.toContain('hintCurrent');
    expect(screen.getByLabelText('Игровое поле').querySelector('[data-hint-connector]'))
      .not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    expect(await screen.findByText('Первая буква слова открыта')).toBeVisible();
    expect(screen.getByLabelText('Т, строка 2, столбец 1').className).not.toContain('hintCurrent');
    expect(screen.getByLabelText('А, строка 2, столбец 2').className).toContain('hintCurrent');
  });

  it('loads API-008 exactly once when a hint completes the level and transitions to Results', async () => {
    const api = makeApi();
    let resolveResults: (results: LevelResultsResponse) => void = () => undefined;
    vi.mocked(api.getLevelResults).mockReturnValue(
      new Promise((resolve) => {
        resolveResults = resolve;
      }),
    );
    vi.mocked(api.useHint).mockResolvedValue({
      hintBalance: 0,
      knowledgePoints: 8,
      revealedCells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 1, col: 2 },
        { row: 2, col: 2 },
      ],
      hintTarget: {
        targetId: DOHOD_TARGET_ID,
        revealedCells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 2, col: 2 },
        ],
      },
      completedTarget: {
        targetId: DOHOD_TARGET_ID,
        word: 'ДОХОД',
        definition: 'Деньги, полученные за определённый период.',
        foundAt: '2026-08-21T12:01:00.000Z',
        foundSequence: 1,
        cells: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
          { row: 1, col: 2 },
          { row: 2, col: 2 },
        ],
      },
      foundTargets: [
        {
          targetId: DOHOD_TARGET_ID,
          word: 'ДОХОД',
          definition: 'Деньги, полученные за определённый период.',
          foundAt: '2026-08-21T12:01:00.000Z',
          foundSequence: 1,
          cells: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
            { row: 0, col: 2 },
            { row: 1, col: 2 },
            { row: 2, col: 2 },
          ],
        },
      ],
      targetsRemaining: 0,
      levelCompleted: true,
      nextAction: NextAction.ClaimReward,
    });
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    expect(api.getLevelResults).not.toHaveBeenCalled();
    expect(api.claimReward).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');
    await user.click(screen.getByRole('button', { name: 'Использовать подсказку' }));

    await waitFor(() => expect(api.getLevelResults).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Результаты текущего уровня')).toBeVisible();
    expect(screen.queryByLabelText('Игровое поле')).not.toBeInTheDocument();
    expect(api.claimReward).not.toHaveBeenCalled();

    await act(async () => resolveResults(makeLevelResults()));
    expect(await screen.findByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
  });

  it('shows HINTS_EXHAUSTED by root problem type without changing the board', async () => {
    const api = makeApi();
    vi.mocked(api.useHint).mockRejectedValue({ type: 'HINTS_EXHAUSTED' });
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');
    await user.click(screen.getByRole('button', { name: 'Использовать подсказку' }));

    expect(await screen.findByText('Подсказки закончились')).toBeVisible();
    expect(screen.getByLabelText('Д, строка 1, столбец 1').className).not.toContain(
      'hintCurrent',
    );
  });

  it('renders the fixed Figma HUD and circular envelope progress', async () => {
    const user = userEvent.setup();
    render(<P1App api={makeApi(makeState(NextAction.None, 1, 4))} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');

    expect(screen.getByLabelText('Знания: 0')).toBeVisible();
    expect(screen.getByText('Подсказка ведёт по буквам одного слова по порядку.')).toBeVisible();
    expect(screen.getByLabelText('Осталось слов: 1 из 1')).toBeVisible();
    expect(screen.getByRole('progressbar', {
      name: 'Прогресс бонусного конверта',
    })).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('progressbar', {
      name: 'Прогресс бонусного конверта',
    })).toHaveAttribute('aria-valuemax', '4');
    expect(screen.getByText('1/4')).toBeVisible();
  });

  it('auto-dismisses the initial and every reopened mentor tip with a fresh timer', () => {
    vi.useFakeTimers();
    const view = render(
      <GameScreen
        level={makeLevelPlay()}
        balance={{ knowledgePoints: 0, hintBalance: 5 }}
        hintPending={false}
        inputDisabled={false}
        rewardOpened={false}
        onBack={vi.fn()}
        onDismissNotice={vi.fn()}
        onHint={vi.fn()}
        onOpenBonusWords={vi.fn()}
        onOpenTarget={vi.fn()}
        onSelectionEnd={vi.fn()}
      />,
    );
    const mentorText = 'Подсказка ведёт по буквам одного слова по порядку.';
    const hintButton = screen.getByRole('button', { name: 'Использовать подсказку' });

    expect(screen.getByText(mentorText)).toBeVisible();
    act(() => vi.advanceTimersByTime(3_199));
    expect(screen.getByText(mentorText)).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText(mentorText)).not.toBeInTheDocument();

    fireEvent.focus(hintButton);
    expect(screen.getByText(mentorText)).toBeVisible();
    act(() => vi.advanceTimersByTime(3_199));
    expect(screen.getByText(mentorText)).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText(mentorText)).not.toBeInTheDocument();

    fireEvent.pointerEnter(hintButton);
    expect(screen.getByText(mentorText)).toBeVisible();
    fireEvent.pointerLeave(hintButton);
    expect(screen.queryByText(mentorText)).not.toBeInTheDocument();

    fireEvent.focus(hintButton);
    expect(screen.getByText(mentorText)).toBeVisible();
    fireEvent.blur(hintButton);
    expect(screen.queryByText(mentorText)).not.toBeInTheDocument();

    fireEvent.pointerEnter(hintButton);
    expect(vi.getTimerCount()).toBe(1);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the hint button, icon, balance, and opacity stable during submit lock', async () => {
    const api = makeApi(makeState(NextAction.Play));
    let resolveSubmit: (response: RouteSubmissionResponse) => void = () => undefined;
    vi.mocked(api.submitRoute).mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );
    await renderActiveGame(api);

    const originalButton = screen.getByRole('button', { name: 'Использовать подсказку' });
    const originalIcon = originalButton.querySelector('img');
    const originalOpacity = getComputedStyle(originalButton).opacity;
    expect(originalIcon).not.toBeNull();
    expect(originalButton.querySelectorAll('img')).toHaveLength(1);
    expect(screen.getByLabelText('Подсказок: 5')).toBeVisible();

    releaseRoute(directRoute);

    const lockedButton = screen.getByRole('button', { name: 'Использовать подсказку' });
    expect(lockedButton).toBe(originalButton);
    expect(lockedButton.querySelector('img')).toBe(originalIcon);
    expect(lockedButton.querySelectorAll('img')).toHaveLength(1);
    expect(lockedButton).toHaveAttribute('data-input-locked', 'true');
    expect(lockedButton).not.toHaveAttribute('data-hint-pending');
    expect(getComputedStyle(lockedButton).opacity).toBe(originalOpacity);
    expect(screen.getByLabelText('Подсказок: 5')).toBeVisible();

    await act(async () => resolveSubmit({
      result: RouteSubmissionResponseResultEnum3.Invalid,
      levelCompleted: false,
      newBonusWords: [],
      newFoundTargets: [],
      nextAction: NextAction.Play,
    }));
  });

  it('auto-dismisses hint and route notices after 3200 ms', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [foundTarget],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api, { fakeTimers: true });

    fireEvent.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    await act(async () => Promise.resolve());
    expect(screen.getByText('Первая буква слова открыта')).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(3_199));
    expect(screen.getByText('Первая буква слова открыта')).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(screen.queryByText('Первая буква слова открыта')).not.toBeInTheDocument();

    releaseRoute(directRoute);
    await act(async () => Promise.resolve());
    expect(screen.getByText('+1 знание')).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(3_199));
    expect(screen.getByText('+1 знание')).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(screen.queryByText('+1 знание')).not.toBeInTheDocument();
  });

  it.each([
    ['invalid route', undefined, 'Это слово не загадано'],
    [
      'noncanonical route',
      RouteSubmissionResponseOutcomeCodeEnum.TARGET_NONCANONICAL_PATH,
      'Собери слово по-другому',
    ],
  ])('auto-dismisses the %s notice after 3200 ms', async (_, outcomeCode, message) => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Invalid,
      ...(outcomeCode ? { outcomeCode } : {}),
      levelCompleted: false,
      newBonusWords: [],
      newFoundTargets: [],
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api, { fakeTimers: true });

    releaseRoute(directRoute);
    await act(async () => Promise.resolve());
    expect(screen.getByText(message)).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(3_199));
    expect(screen.getByText(message)).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('does not let an older notice callback clear its replacement', async () => {
    const api = makeApi(makeState(NextAction.Play));
    await renderActiveGame(api, { fakeTimers: true });
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    releaseRoute(directRoute);
    await act(async () => Promise.resolve());
    expect(screen.getByText('Это слово не загадано')).toBeVisible();

    const noticeTimerCall = setTimeoutSpy.mock.calls.find((call) => call[1] === 3_200);
    expect(noticeTimerCall).toBeDefined();
    const oldCallback = noticeTimerCall?.[0];

    await act(async () => vi.advanceTimersByTimeAsync(1_600));
    fireEvent.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    await act(async () => Promise.resolve());
    expect(screen.getByText('Первая буква слова открыта')).toBeVisible();

    act(() => {
      if (typeof oldCallback === 'function') oldCallback();
    });
    expect(screen.getByText('Первая буква слова открыта')).toBeVisible();
  });

  it('clears a game notice on screen change before its timer can affect a new notice', async () => {
    const api = makeApi(makeState(NextAction.Play));
    await renderActiveGame(api, { fakeTimers: true });

    releaseRoute(directRoute);
    await act(async () => Promise.resolve());
    expect(screen.getByText('Это слово не загадано')).toBeVisible();

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    fireEvent.click(screen.getByRole('button', { name: 'Выйти из уровня' }));
    fireEvent.click(screen.getByRole('button', { name: 'Выйти' }));
    expect(screen.getByLabelText('Главный экран')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: /^(Уровень 1|Продолжить)$/ }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByLabelText('Игровой экран уровня 1')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    await act(async () => Promise.resolve());
    expect(screen.getByText('Первая буква слова открыта')).toBeVisible();

    await act(async () => vi.advanceTimersByTimeAsync(2_200));
    expect(screen.getByText('Первая буква слова открыта')).toBeVisible();
  });

  it('removes an active game notice timer on unmount', async () => {
    const api = makeApi(makeState(NextAction.Play));
    const view = await renderActiveGame(api, { fakeTimers: true });

    releaseRoute(directRoute);
    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByText('Это слово не загадано')).toBeVisible();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    ['hint', 'Первая буква слова открыта'],
    ['success', 'ДО · бонусное слово'],
    ['error', 'Это слово не загадано'],
  ])('compact HUD dismisses the %s notice on the first letter without restoring it', async (kind, message) => {
    mockHudHeight(640);
    const api = makeApi(makeState(NextAction.Play));
    if (kind === 'success') {
      vi.mocked(api.submitRoute).mockResolvedValue({
        result: RouteSubmissionResponseResultEnum3.Found,
        isTarget: false,
        newBonusWords: [{ word: 'ДО', foundAt: '2026-08-27T12:00:00Z' }],
        newFoundTargets: [],
        levelCompleted: false,
        nextAction: NextAction.Play,
      } satisfies RouteSubmissionResponse);
    }
    await renderActiveGame(api, { fakeTimers: true });
    if (kind === 'hint') {
      fireEvent.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    } else {
      releaseRoute(directRoute);
    }
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(screen.getByText(message)).toBeVisible();

    const board = screen.getByLabelText('Игровое поле');
    const first = screen.getByLabelText(directRoute[0].label);
    const second = screen.getByLabelText(directRoute[1].label);
    const preview = screen.getByLabelText('Игровой экран уровня 1').querySelector('[aria-live="polite"]');
    fireEvent.pointerDown(first, { pointerId: 17 });
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    expect(preview).toHaveTextContent(/^Д$/);
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(preview).toHaveTextContent(/^ДО$/);
    fireEvent.keyDown(second, { key: 'ArrowLeft' });
    expect(preview).toHaveTextContent(/^Д$/);
    fireEvent.pointerCancel(board, { pointerId: 17 });
    expect(preview).toHaveTextContent(/^$/);
    expect(screen.queryByText(message)).not.toBeInTheDocument();
    fireEvent.keyDown(first, { key: ' ' });
    expect(preview).toHaveTextContent(/^Д$/);
    fireEvent.keyDown(first, { key: 'Escape' });
    expect(screen.queryByText(message)).not.toBeInTheDocument();
  });

  it('compact HUD dismisses a late hint response during active selection', async () => {
    mockHudHeight(640);
    const api = makeApi(makeState(NextAction.Play));
    const hintResponse = await api.useHint(makeLevelPlay().levelId);
    let resolveHint: (response: HintUseResponse) => void = () => undefined;
    vi.mocked(api.useHint).mockReturnValue(new Promise((resolve) => { resolveHint = resolve; }));
    await renderActiveGame(api);
    fireEvent.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    fireEvent.pointerDown(screen.getByLabelText(directRoute[0].label), { pointerId: 17 });
    await act(async () => resolveHint(hintResponse));
    expect(screen.queryByText('Первая буква слова открыта')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Подсказок: 4')).toBeVisible();
    fireEvent.pointerCancel(screen.getByLabelText('Игровое поле'), { pointerId: 17 });
    expect(screen.queryByText('Первая буква слова открыта')).not.toBeInTheDocument();
  });

  it('compact HUD cancels the dismissed timer but preserves submit loading and the new outcome', async () => {
    mockHudHeight(640);
    const api = makeApi(makeState(NextAction.Play));
    let resolveSubmit: (response: RouteSubmissionResponse) => void = () => undefined;
    vi.mocked(api.submitRoute).mockReturnValue(new Promise((resolve) => { resolveSubmit = resolve; }));
    await renderActiveGame(api, { fakeTimers: true });
    fireEvent.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    await act(async () => Promise.resolve());
    const first = screen.getByLabelText(directRoute[0].label);
    fireEvent.pointerDown(first, { pointerId: 17 });
    expect(screen.queryByText('Первая буква слова открыта')).not.toBeInTheDocument();

    fireEvent.keyDown(first, { key: 'ArrowRight' });
    fireEvent.keyDown(first, { key: 'Enter' });
    await act(async () => vi.advanceTimersByTimeAsync(250));
    expect(screen.getByRole('status', { name: 'Отправляем слово' })).toBeVisible();
    expect(screen.getByLabelText('Игровое поле')).toHaveAttribute('aria-disabled', 'true');
    await act(async () => resolveSubmit({
      result: RouteSubmissionResponseResultEnum3.Invalid,
      levelCompleted: false,
      newBonusWords: [],
      newFoundTargets: [],
      nextAction: NextAction.Play,
    }));
    expect(screen.getByText('Это слово не загадано')).toBeVisible();
    expect(first).toHaveAttribute('aria-pressed', 'true');
    await act(async () => vi.advanceTimersByTimeAsync(3_199));
    expect(screen.getByText('Это слово не загадано')).toBeVisible();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(screen.queryByText('Это слово не загадано')).not.toBeInTheDocument();
  });

  it.each([640, 719, 720, 844])('compact HUD uses the existing height boundary at %i px', async (height) => {
    mockHudHeight(height);
    await renderActiveGame(makeApi(makeState(NextAction.Play)));
    fireEvent.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    await screen.findByText('Первая буква слова открыта');
    fireEvent.keyDown(screen.getByLabelText(directRoute[0].label), { key: ' ' });
    if (height < 720) {
      expect(screen.queryByText('Первая буква слова открыта')).not.toBeInTheDocument();
    } else {
      expect(screen.getByText('Первая буква слова открыта')).toBeVisible();
    }
  });

  it('compact HUD dismisses the banner on resize during selection without resurrecting it', async () => {
    const resize = mockHudHeight(844);
    const view = await renderActiveGame(makeApi(makeState(NextAction.Play)));
    fireEvent.click(screen.getByRole('button', { name: 'Использовать подсказку' }));
    await screen.findByText('Первая буква слова открыта');
    const first = screen.getByLabelText(directRoute[0].label);
    fireEvent.keyDown(first, { key: ' ' });
    expect(screen.getByText('Первая буква слова открыта')).toBeVisible();
    resize(719);
    expect(screen.queryByText('Первая буква слова открыта')).not.toBeInTheDocument();
    resize(720);
    fireEvent.keyDown(first, { key: 'Escape' });
    expect(screen.queryByText('Первая буква слова открыта')).not.toBeInTheDocument();
    view.unmount();
    resize(640);
  });

  it('opens the bonus-word sheet with the server threshold N/4', async () => {
    const user = userEvent.setup();
    render(<P1App api={makeApi(makeState(NextAction.None, 1, 4))} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');
    await user.click(screen.getByRole('button', { name: 'Бонусные слова: 1' }));

    const dialog = screen.getByRole('dialog', { name: 'Бонусные слова' });
    expect(dialog).toHaveTextContent('ДАР');
    expect(dialog).toHaveTextContent('1/4');
    expect(dialog).toHaveTextContent('Ещё 3 слов — и откроется конверт');
    expect(within(dialog).getByRole('progressbar', {
      name: 'Прогресс бонусных слов',
    })).toHaveAttribute('aria-valuenow', '1');
    expect(within(dialog).getByRole('button', { name: 'Закрыть' })).toBeVisible();
  });

  it('uses the exact last-hint banner when one hint remains', async () => {
    const api = makeApi();
    vi.mocked(api.useHint).mockResolvedValue({
      hintBalance: 1,
      knowledgePoints: 7,
      revealedCells: [{ row: 0, col: 0 }],
      hintTarget: {
        targetId: DO_TARGET_ID,
        revealedCells: [{ row: 0, col: 0 }],
      },
      foundTargets: [],
      targetsRemaining: 1,
      levelCompleted: false,
      nextAction: NextAction.Play,
    });
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');
    await user.click(screen.getByRole('button', { name: 'Использовать подсказку' }));

    expect(await screen.findByText('Осталась последняя подсказка')).toBeVisible();
    expect(screen.getByLabelText('Подсказок: 1')).toBeVisible();
  });

  it('keeps the zero-balance mentor control actionable for the no-hints response', async () => {
    const state = makeState();
    state.clientState.clientView.balance.hintBalance = 0;
    const api = makeApi(state);
    vi.mocked(api.useHint).mockRejectedValue({ type: 'HINTS_EXHAUSTED' });
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await screen.findByLabelText('Игровой экран уровня 1');

    const hintButton = screen.getByRole('button', { name: 'Использовать подсказку' });
    expect(hintButton).toBeEnabled();
    await user.click(hintButton);
    expect(await screen.findByText('Подсказки закончились')).toBeVisible();
  });

  it.each([
    ['direct', directRoute],
    ['exact reverse', [...directRoute].reverse()],
  ])('submits a released orthogonal route in %s order with 0-based cells', async (_, route) => {
    const api = makeApi(makeState(NextAction.Play));
    await renderActiveGame(api);

    releaseRoute(route);

    const submitSignal = vi.mocked(api.submitRoute).mock.calls[0]?.[2];
    expect(submitSignal).toBeInstanceOf(AbortSignal);
    expect(api.submitRoute).toHaveBeenCalledWith(
      makeLevelPlay().levelId,
      route.map(({ ref }) => ref),
      submitSignal,
    );
  });

  it('disables input, preserves the selected route, and delays the submit loader by 250 ms', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockReturnValue(new Promise(() => undefined));
    await renderActiveGame(api);
    vi.useFakeTimers();

    releaseRoute(directRoute);

    const board = screen.getByLabelText('Игровое поле');
    expect(board).toHaveAttribute('aria-disabled', 'true');
    directRoute.forEach(({ label }) => {
      const cell = screen.getByRole('button', { name: (name) => name.startsWith(label) });
      expect(cell).toBeDisabled();
      expect(cell).toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.queryByRole('status', { name: 'Отправляем слово' })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    directRoute.forEach(({ label }) =>
      expect(screen.getByRole('button', { name: (name) => name.startsWith(label) }))
        .toHaveAttribute('aria-pressed', 'true'),
    );
    expect(screen.queryByRole('status', { name: 'Отправляем слово' })).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.getByRole('status', { name: 'Отправляем слово' })).toBeVisible();
  });

  it('fetches API-008 once after a found target completes the level and leaves the blocked Game surface', async () => {
    const api = makeApi(makeState(NextAction.Play));
    let resolveResults: (results: LevelResultsResponse) => void = () => undefined;
    vi.mocked(api.getLevelResults).mockReturnValue(
      new Promise((resolve) => {
        resolveResults = resolve;
      }),
    );
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [foundTarget],
      levelCompleted: true,
      nextAction: NextAction.ClaimReward,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api);
    expect(api.getLevelResults).not.toHaveBeenCalled();
    expect(api.claimReward).not.toHaveBeenCalled();

    releaseRoute(directRoute);

    expect(api.submitRoute).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.getLevelResults).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Результаты текущего уровня')).toBeVisible();
    expect(screen.queryByLabelText('Игровое поле')).not.toBeInTheDocument();
    expect(api.submitRoute).toHaveBeenCalledTimes(1);
    expect(api.claimReward).not.toHaveBeenCalled();

    await act(async () => resolveResults(makeLevelResults()));
    expect(await screen.findByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
  });

  it('merges a found bonus word without locking its route cells', async () => {
    const api = makeApi(makeState(NextAction.Play, 1));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: false,
      knowledgePoints: 7,
      rewardProgress: 2,
      targetsRemaining: 1,
      newBonusWords: [
        { word: 'ХОД', foundAt: '2026-08-21T12:01:00.000Z' },
      ],
      newFoundTargets: [],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api);

    releaseRoute(directRoute);

    expect(await screen.findByText('ХОД · бонусное слово')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Бонусные слова: 2' })).toBeVisible();
    expect(screen.getByRole('button', {
      name: (name) => name.startsWith('Д, строка 1, столбец 1'),
    })).toBeEnabled();
    expect(screen.getByRole('button', {
      name: (name) => name.startsWith('О, строка 1, столбец 2'),
    })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Бонусные слова: 2' }));
    const dialog = screen.getByRole('dialog', { name: 'Бонусные слова' });
    expect(within(dialog).getByText('ДАР')).toBeVisible();
    expect(within(dialog).getByText('ХОД')).toBeVisible();
  });

  it('после четвёртого уникального бонуса сначала показывает слово, затем через 500 мс открывает выбор награды', async () => {
    const api = makeApi(makeState(NextAction.Play, 3));
    const level = makeLevelPlay();
    level.bonusWords = [
      { word: 'ДАР', foundAt: '2026-08-21T12:00:00.000Z' },
      { word: 'ЛАПА', foundAt: '2026-08-21T12:00:01.000Z' },
      { word: 'ХОД', foundAt: '2026-08-21T12:00:02.000Z' },
    ];
    const openedReward: RewardSummary = {
      rewardId: REWARD_ID,
      rewardType: RewardSummaryRewardTypeEnum.Regular,
      status: RewardSummaryStatusEnum.Available,
      progress: { current: 4, threshold: 4 },
      hintOptionAmount: 1,
      options: [{
        optionType: RewardOptionOptionTypeEnum.Hint,
        amount: 1,
        title: 'Подсказка',
      }],
    };
    vi.mocked(api.enterLevel).mockResolvedValue(level);
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: false,
      knowledgePoints: 7,
      rewardProgress: 4,
      rewardOpened: openedReward,
      targetsRemaining: 1,
      newBonusWords: [{ word: 'ПАР', foundAt: '2026-08-21T12:01:00.000Z' }],
      newFoundTargets: [],
      levelCompleted: false,
      nextAction: NextAction.ClaimReward,
    } satisfies RouteSubmissionResponse);

    await renderActiveGame(api);
    vi.useFakeTimers();
    releaseRoute(directRoute);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('ПАР · бонусное слово')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Бонусные слова: 4' })).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(499); });
    expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    const dialog = screen.getByRole('dialog', { name: 'Выберите награду' });
    expect(within(dialog).getByRole('radio', { name: '1 подсказка' })).toBeVisible();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    fireEvent.click(within(dialog).getByRole('radio', { name: '1 подсказка' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Забрать' }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByLabelText('Игровой экран уровня 1')).toBeVisible();
    expect(screen.queryByRole('dialog', { name: 'Выберите награду' })).not.toBeInTheDocument();
  });

  it('shows repeated-word info without changing balances or progress', async () => {
    const api = makeApi(makeState(NextAction.Play, 1));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Repeated,
      levelCompleted: false,
      newBonusWords: [],
      newFoundTargets: [],
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api);

    releaseRoute(directRoute);

    expect(await screen.findByText('Это бонусное слово уже найдено')).toBeVisible();
    expect(screen.getByLabelText('Знания: 0')).toBeVisible();
    expect(screen.getByLabelText('Осталось слов: 1 из 1')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Бонусные слова: 1' })).toBeVisible();
  });

  it('shows invalid-word error without progress mutation and releases the route', async () => {
    const api = makeApi(makeState(NextAction.Play, 1));
    await renderActiveGame(api);

    releaseRoute(directRoute);

    expect(await screen.findByText('Это слово не загадано')).toBeVisible();
    expect(screen.getByLabelText('Знания: 0')).toBeVisible();
    expect(screen.getByLabelText('Осталось слов: 1 из 1')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Бонусные слова: 1' })).toBeVisible();
    await waitFor(() =>
      directRoute.forEach(({ label }) =>
        expect(screen.getByLabelText(label)).toHaveAttribute('aria-pressed', 'false'),
      ),
    );
  });

  it('показывает специальный текст для invalid + TARGET_NONCANONICAL_PATH', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Invalid,
      outcomeCode: RouteSubmissionResponseOutcomeCodeEnum.TARGET_NONCANONICAL_PATH,
      newBonusWords: [],
      newFoundTargets: [],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api);

    releaseRoute(directRoute);

    expect(await screen.findByText('Собери слово по-другому')).toBeVisible();
    expect(screen.queryByText('Это слово не загадано')).not.toBeInTheDocument();
  });

  it('times out an unresolved submit after 8 seconds, unlocks input, and never resubmits', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockReturnValue(new Promise(() => undefined));
    await renderActiveGame(api);
    vi.useFakeTimers();

    releaseRoute(directRoute);
    expect(api.submitRoute).toHaveBeenCalledTimes(1);
    const submitSignal = vi.mocked(api.submitRoute).mock.calls[0]?.[2];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8_000);
    });

    expect(submitSignal).toBeInstanceOf(AbortSignal);
    expect(submitSignal?.aborted).toBe(true);
    expect(screen.getByRole('status')).toHaveAttribute('data-tone', 'error');
    expect(screen.getByLabelText('Игровое поле')).not.toHaveAttribute('aria-disabled');
    directRoute.forEach(({ label }) => expect(screen.getByLabelText(label)).toBeEnabled());
    expect(api.submitRoute).toHaveBeenCalledTimes(1);
  });

  it('оставляет доску доступной после found target без завершения уровня', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [foundTarget],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api);

    releaseRoute(directRoute);

    expect(await screen.findByText('+1 знание')).toBeVisible();
    expect(screen.getByLabelText('Знания: 8')).toBeVisible();
    expect(screen.getByRole('button', {
      name: 'Д, строка 1, столбец 1. Найденное слово ДО. Открыть информацию',
    })).toBeEnabled();
    expect(screen.getByLabelText('Игровое поле')).not.toHaveAttribute('aria-disabled');
  });

  it('opens the definition modal with Понятно when a regular found target is tapped', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [foundTarget],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    const user = userEvent.setup();
    await renderActiveGame(api);

    releaseRoute(directRoute);
    const foundCell = await screen.findByRole('button', {
      name: 'О, строка 1, столбец 2. Найденное слово ДО. Открыть информацию',
    });
    await user.click(foundCell);

    const dialog = screen.getByRole('dialog', { name: 'ДО' });
    expect(dialog).toHaveTextContent('Деньги, полученные за определённый период.');
    expect(within(dialog).getByRole('button', { name: 'Понятно' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: /закрыть/i })).toBeVisible();
  });

  it('does not auto-open a modal after a found target is merged', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [foundTarget],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api);

    releaseRoute(directRoute);

    await screen.findByRole('button', {
      name: 'О, строка 1, столбец 2. Найденное слово ДО. Открыть информацию',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not auto-open the course modal for a found АКЦИЯ until tapped', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [stockTarget],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    await renderActiveGame(api);

    releaseRoute(directRoute);

    await screen.findByRole('button', {
      name: 'Д, строка 1, столбец 1. Найденное слово АКЦИЯ. Открыть информацию',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the Course Error modal with exact content when found АКЦИЯ is tapped', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [stockTarget],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    const user = userEvent.setup();
    await renderActiveGame(api);

    releaseRoute(directRoute);
    const foundCell = await screen.findByRole('button', {
      name: 'Д, строка 1, столбец 1. Найденное слово АКЦИЯ. Открыть информацию',
    });
    await user.click(foundCell);

    const dialog = screen.getByRole('dialog', { name: 'АКЦИЯ' });
    expect(dialog).toHaveTextContent(
      'Ценная бумага, которая подтверждает долю владения компанией.',
    );
    expect(within(dialog).getByText('Мини-курс')).toBeVisible();
    expect(within(dialog).getByText('Курс «Как работают акции»')).toBeVisible();
    expect(
      within(dialog).getByText('Не удалось открыть страницу. Попробуйте ещё раз.'),
    ).toBeVisible();
    expect(within(dialog).getByText('Прогресс уровня сохранён')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Повторить' })).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: 'Вернуться к полю' }),
    ).toBeVisible();
  });

  it('keeps Course Error open and disables retry when the server offer has no local destination', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [stockTarget],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    const user = userEvent.setup();
    await renderActiveGame(api);

    releaseRoute(directRoute);
    const foundCell = await screen.findByRole('button', {
      name: 'Д, строка 1, столбец 1. Найденное слово АКЦИЯ. Открыть информацию',
    });
    await user.click(foundCell);

    const dialog = screen.getByRole('dialog', { name: 'АКЦИЯ' });
    expect(within(dialog).getByRole('button', { name: 'Повторить' })).toBeDisabled();

    expect(openDeepLink).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'АКЦИЯ' })).toBeVisible();
    expect(screen.getByLabelText('Знания: 8')).toBeVisible();
  });

  it('closes the Course Error modal with X without changing progress', async () => {
    const api = makeApi(makeState(NextAction.Play));
    vi.mocked(api.submitRoute).mockResolvedValue({
      result: RouteSubmissionResponseResultEnum3.Found,
      isTarget: true,
      knowledgePoints: 8,
      targetsRemaining: 0,
      newBonusWords: [],
      newFoundTargets: [stockTarget],
      levelCompleted: false,
      nextAction: NextAction.Play,
    } satisfies RouteSubmissionResponse);
    const user = userEvent.setup();
    await renderActiveGame(api);

    releaseRoute(directRoute);
    const foundCell = await screen.findByRole('button', {
      name: 'Д, строка 1, столбец 1. Найденное слово АКЦИЯ. Открыть информацию',
    });
    await user.click(foundCell);

    const dialog = screen.getByRole('dialog', { name: 'АКЦИЯ' });
    await user.click(within(dialog).getByRole('button', { name: 'Закрыть окно курса' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Знания: 8')).toBeVisible();
    expect(
      screen.getByRole('button', {
        name: 'Д, строка 1, столбец 1. Найденное слово АКЦИЯ. Открыть информацию',
      }),
    ).toBeVisible();
  });
});

describe('Stage 2 first-run tutorial and narrative', () => {
  async function completeMandatoryTutorial(user: ReturnType<typeof userEvent.setup>) {
    expect(screen.queryByRole('button', { name: /Закрыть обучение|Пропустить обучение/ })).toBeNull();
    expect(screen.getByText('Начните с первой буквы и проведите по соседним клеткам.')).toBeVisible();
    await submitTutorialRoute(/^Н, строка 1, столбец 1/, ['ArrowRight', 'ArrowRight']);
    await user.click(screen.getByRole('button', { name: 'Далее' }));

    expect(screen.getByText('Слово может поворачивать, но диагональные переходы не используются.')).toBeVisible();
    await submitTutorialRoute(/^П, строка 2, столбец 1/, ['ArrowRight', 'ArrowDown']);
    await user.click(screen.getByRole('button', { name: 'Далее' }));

    expect(screen.getByText('Целевое слово можно собрать в прямом или точном обратном порядке.')).toBeVisible();
    await submitTutorialRoute(/^С, строка 1, столбец 3/, ['ArrowLeft', 'ArrowLeft']);
    await user.click(screen.getByRole('button', { name: 'Далее' }));

    expect(screen.getByText(
      'Дополнительные слова (не загаданные на уровне) заполняют белый конверт с наградами.',
    )).toBeVisible();
    await submitTutorialRoute(/^П, строка 2, столбец 1/, ['ArrowRight', 'ArrowDown']);
    expect(screen.getByText('ПАР · КОНВЕРТ 1/4')).toBeVisible();
    expect(screen.getByText('Шаг 4 из 6 · учебный прогресс')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Далее' }));

    await submitTutorialRoute(/^Н, строка 1, столбец 1/, ['ArrowRight', 'ArrowRight']);
    expect(screen.getByText('НОС · НАЙДЕНО')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Далее' }));

    await user.click(screen.getAllByRole('button', {
      name: /^П, строка 2, столбец 1.*Найденное слово ПАР/,
    })[0]);
    const definition = screen.getByRole('dialog', { name: 'ПАР' });
    expect(within(definition).getByText('Вода в газообразном состоянии.')).toBeVisible();
    await user.click(within(definition).getByRole('button', { name: 'Понятно' }));
    await user.click(screen.getByRole('button', { name: 'Далее' }));
  }

  it('gates Level 1 behind six interactive steps, Narrative, API-003 and then API-004', async () => {
    const user = userEvent.setup();
    const state = makeFirstRunState();
    const api = makeApi(state);
    render(<P1App api={api} minimumLoadingMs={0} />);

    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    expect(await screen.findByLabelText('Обучение')).toBeVisible();
    await completeMandatoryTutorial(user);

    const narrative = await screen.findByLabelText('История главы');
    expect(within(narrative).getByText('Азбука денег')).toBeVisible();
    expect(within(narrative).getByText(
      'Начните с простых финансовых понятий и постепенно соберите свою базу знаний.',
    )).toBeVisible();
    expect(api.enterLevel).not.toHaveBeenCalled();

    await user.click(within(narrative).getByRole('button', { name: 'Продолжить' }));
    expect(api.confirmNarrativeShown).toHaveBeenCalledWith(
      state.clientState.chapters[0].chapterId,
      expect.objectContaining({ clientState: expect.any(Object) }),
      expect.anything(),
    );
    expect(await screen.findByLabelText('Игровой экран уровня 1')).toBeVisible();
    expect(api.enterLevel).toHaveBeenCalledTimes(1);
    expect(api.updateSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({ tutorialCompleted: expect.anything() }),
    );
  }, 15_000);

  it('repeats mandatory Tutorial after a fresh mount while server tutorialCompleted remains false', async () => {
    const user = userEvent.setup();
    const state = makeFirstRunState();
    const first = render(<P1App api={makeApi(state)} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    expect(await screen.findByLabelText('Обучение')).toBeVisible();
    first.unmount();

    render(<P1App api={makeApi(state)} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    expect(await screen.findByLabelText('Обучение')).toBeVisible();
  });

  it('allows Settings replay to close or skip without API, progress, or reward side effects', async () => {
    const user = userEvent.setup();
    const api = makeApi(makeState(NextAction.StartLevel));
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Настройки' }));
    await user.click(screen.getByRole('button', { name: 'Пройти обучение' }));

    expect(await screen.findByLabelText('Обучение')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Закрыть обучение' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Пропустить обучение' }));
    expect(await screen.findByRole('dialog', { name: 'Настройки' })).toBeVisible();
    expect(api.confirmNarrativeShown).not.toHaveBeenCalled();
    expect(api.enterLevel).not.toHaveBeenCalled();
    expect(api.claimReward).not.toHaveBeenCalled();
    expect(api.updateSettings).not.toHaveBeenCalled();
  });

  it('keeps a CHAPTER_LOCKED failure terminal on Narrative without an automatic retry loop', async () => {
    const user = userEvent.setup();
    const api = makeApi(makeFirstRunState());
    vi.mocked(api.confirmNarrativeShown).mockRejectedValue(Object.assign(
      new Error('CHAPTER_LOCKED'),
      { type: 'CHAPTER_LOCKED' },
    ));
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Уровень 1' }));
    await completeMandatoryTutorial(user);
    const narrative = await screen.findByLabelText('История главы');
    await user.click(within(narrative).getByRole('button', { name: 'Продолжить' }));

    expect(await within(narrative).findByRole('alert')).toHaveTextContent('Глава пока недоступна');
    expect(within(narrative).queryByRole('button', { name: 'Повторить' })).toBeNull();
    expect(api.confirmNarrativeShown).toHaveBeenCalledTimes(1);
    expect(api.enterLevel).not.toHaveBeenCalled();
  }, 15_000);
});

describe('Stage 4 deterministic NextAction and automatic feedback UI', () => {
  it('routes open_feedback to a chapter-completion form with the wire chapter UUID', async () => {
    const state = makeState(NextAction.OpenFeedback);
    const api = makeApi(state);
    vi.mocked(api.submitFeedback).mockResolvedValue({
      feedbackId: 'af8fad5b-d9cb-469f-a165-808677289521',
      status: SubmitFeedbackResponseStatusEnum.Submitted,
      nextAction: NextAction.NextChapter,
    });
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);

    await screen.findByRole('heading', { name: 'Оставить отзыв' });
    await user.click(screen.getByRole('radio', { name: '5' }));
    await user.click(screen.getByRole('button', { name: 'Отправить' }));

    expect(api.submitFeedback).toHaveBeenCalledWith({
      source: 'chapter_completion',
      chapterId: state.clientState.chapters[0].chapterId,
      rating: 5,
    });
  });

  it('dismisses automatic feedback through API-014 and opens the next chapter narrative', async () => {
    const state = makeState(NextAction.OpenFeedback);
    const api = makeApi(state);
    vi.mocked(api.resyncState).mockResolvedValue(makeNextChapterState());
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);

    await user.click(await screen.findByRole('button', { name: 'Закрыть отзыв' }));

    expect(api.dismissFeedback).toHaveBeenCalledWith(state.clientState.chapters[0].chapterId);
    expect(await screen.findByLabelText('История главы')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Финансовая подушка' })).toBeVisible();
    expect(api.resyncState).toHaveBeenCalledTimes(1);
  });

  it('routes next_chapter to the authoritative next chapter narrative', async () => {
    const state = makeNextChapterState();
    const api = makeApi(state);
    render(<P1App api={api} minimumLoadingMs={0} />);

    expect(await screen.findByLabelText('История главы')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Финансовая подушка' })).toBeVisible();
    expect(screen.queryByLabelText('Главный экран')).not.toBeInTheDocument();
    expect(api.resyncState).toHaveBeenCalledTimes(1);
  });

  it('renders authoritative Campaign Complete before API-015 and replays Итоги игры without mutation', async () => {
    const automaticState = makeCampaignCompleteState(false);
    const confirmedState = makeCampaignCompleteState(true);
    const api = makeApi(automaticState);
    vi.mocked(api.resyncState).mockResolvedValueOnce(automaticState);
    vi.mocked(api.confirmCampaignCompleteShown).mockImplementation(async () => {
      expect(screen.getByRole('heading', { name: 'Вы прошли 50 уровней!' })).toBeVisible();
      return { isCompletionShown: true, nextAction: NextAction.None };
    });
    const user = userEvent.setup();

    render(<P1App api={api} minimumLoadingMs={0} />);

    const summary = await screen.findByLabelText('Итоги кампании');
    expect(within(summary).getByText('Новые главы и финансовые открытия уже на подходе.')).toBeVisible();
    expect(within(summary).getByText('50/50', { exact: true })).toBeVisible();
    expect(within(summary).getByText('7/7', { exact: true })).toBeVisible();
    expect(within(summary).getByText('266', { exact: true })).toBeVisible();
    expect(within(summary).getByText('0', { exact: true })).toBeVisible();
    expect(within(summary).getByText('3 из 4', { exact: true })).toBeVisible();
    expect(within(summary).getByRole('img', { name: 'Классический аналитик' })).toBeVisible();
    expect(within(summary).getByText('Финворды', { exact: true })).toBeVisible();
    expect(within(summary).getByText('Кампания завершена', { exact: true })).toBeVisible();
    expect(api.getAppearances).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.confirmCampaignCompleteShown).toHaveBeenCalledTimes(1));

    await user.click(within(summary).getByRole('button', { name: 'На главную' }));
    const home = await screen.findByLabelText('Главный экран');
    expect(within(home).getByRole('button', { name: 'Итоги игры' })).toBeVisible();

    vi.mocked(api.loadState).mockResolvedValue(confirmedState);
    await user.click(within(home).getByRole('button', { name: 'Итоги игры' }));
    expect(await screen.findByLabelText('Итоги кампании')).toBeVisible();
    expect(api.confirmCampaignCompleteShown).toHaveBeenCalledTimes(1);
  });

  it('keeps Campaign Complete visible after API-015 failure without inventing a local shown flag', async () => {
    const automaticState = makeCampaignCompleteState(false);
    const api = makeApi(automaticState);
    vi.mocked(api.confirmCampaignCompleteShown).mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();

    render(<P1App api={api} minimumLoadingMs={0} />);

    const summary = await screen.findByLabelText('Итоги кампании');
    await waitFor(() => expect(api.confirmCampaignCompleteShown).toHaveBeenCalledTimes(1));
    await user.click(within(summary).getByRole('button', { name: 'На главную' }));

    const home = await screen.findByLabelText('Главный экран');
    expect(within(home).queryByRole('button', { name: 'Итоги игры' })).not.toBeInTheDocument();
  });

  it('rejects campaign_complete when authoritative campaign progress is incomplete', async () => {
    const inconsistent = makeCampaignCompleteState(false);
    inconsistent.clientState.clientView.campaignProgress.isCompleted = false;
    const api = makeApi(inconsistent);

    render(<P1App api={api} minimumLoadingMs={0} />);

    expect(await screen.findByLabelText('Ошибка загрузки')).toBeVisible();
    expect(screen.queryByLabelText('Итоги кампании')).not.toBeInTheDocument();
    expect(api.resyncState).toHaveBeenCalledTimes(1);
    expect(api.confirmCampaignCompleteShown).not.toHaveBeenCalled();
  });
});

describe('Stage 3 appearance catalog and confirmed selection', () => {
  it('shows all 17 cards with exact labels and an initial 2/17 ownership counter', async () => {
    const api = makeApi();
    const items = createMockAppearanceCatalog();
    vi.mocked(api.getAppearances).mockResolvedValue({
      items,
      selectedCharacterId: items.find((item) => item.title === 'Аналитик')!.appearanceId,
      selectedBackgroundId: items.find((item) => item.title === 'Базовый')!.appearanceId,
    });
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Облики' }));

    expect(await screen.findByLabelText('Получено обликов: 2 из 17')).toHaveTextContent('2/17');
    expect(screen.getAllByRole('button').filter((button) =>
      items.filter((item) => item.type === 'character').some((item) => item.title === button.getAttribute('aria-label')),
    )).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Аналитик' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Риск-менеджер' })).toBeDisabled();

    await user.click(screen.getByRole('tab', { name: 'Фоны' }));
    expect(screen.getAllByRole('button').filter((button) =>
      items.filter((item) => item.type === 'background').some((item) => item.title === button.getAttribute('aria-label')),
    )).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Базовый' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: /ошиб/i })).toBeNull();
  });

  it('submits owned selection immediately, confirms only after response, and preserves prior selection on failure', async () => {
    const api = makeApi();
    const items = createMockAppearanceCatalog([
      'character-analyst',
      'character-navigator',
      'background-default',
    ]);
    const analyst = items.find((item) => item.title === 'Аналитик')!;
    const navigator = items.find((item) => item.title === 'Штурман')!;
    vi.mocked(api.getAppearances).mockResolvedValue({
      items,
      selectedCharacterId: analyst.appearanceId,
      selectedBackgroundId: items.find((item) => item.title === 'Базовый')!.appearanceId,
    });
    vi.mocked(api.selectAppearance).mockRejectedValue(Object.assign(
      new Error('STATE_VERSION_CONFLICT'),
      { type: 'STATE_VERSION_CONFLICT' },
    ));
    const user = userEvent.setup();
    render(<P1App api={api} minimumLoadingMs={0} />);
    await screen.findByLabelText('Главный экран');
    await user.click(screen.getByRole('button', { name: 'Облики' }));
    await user.click(await screen.findByRole('button', { name: 'Штурман' }));

    expect(api.selectAppearance).toHaveBeenCalledWith(navigator.appearanceId);
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось выбрать облик');
    expect(screen.getByRole('button', { name: 'Аналитик' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Штурман' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('button', { name: /Применить/i })).toBeNull();
  });
});
