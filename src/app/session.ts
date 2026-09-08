import { getTarget, LEVELS } from '../content/campaign';
import type {
  LevelId,
  LevelProgress,
  MentorCue,
  Overlay,
  SessionState,
  View,
} from './types';

export const BONUS_ENVELOPE_THRESHOLDS = [4, 6, 8, 10] as const;

export type SessionAction =
  | { type: 'NAVIGATE'; view: View }
  | { type: 'OPEN_RESULTS_FIELD' }
  | { type: 'CLOSE_RESULTS_FIELD' }
  | { type: 'START_LEVEL'; levelId: LevelId; showNarrative?: boolean }
  | { type: 'BEGIN_GAME' }
  | { type: 'FIND_TARGET'; targetId: string }
  | { type: 'FIND_BONUS'; word: string }
  | { type: 'REGISTER_INVALID' }
  | { type: 'RESET_INVALID_STREAK' }
  | { type: 'USE_HINT'; targetId: string; revealedCount: number }
  | { type: 'OPEN_WORD'; targetId: string; overlay: Overlay }
  | { type: 'SET_OVERLAY'; overlay: Overlay; selectedWordId?: string }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'SET_TOAST'; toast: SessionState['toast'] }
  | { type: 'CLEAR_TOAST' }
  | { type: 'QUEUE_MENTOR'; cue: MentorCue }
  | { type: 'DISMISS_MENTOR' }
  | { type: 'COMPLETE_LEVEL'; levelId: LevelId }
  | { type: 'CLAIM_REGULAR_REWARD'; reward: 'hint' | 'character' }
  | { type: 'CLAIM_GOLDEN_REWARD'; reward: 'hints' | 'theme' }
  | { type: 'TOGGLE_SETTING'; setting: keyof SessionState['settings'] }
  | { type: 'SET_APPEARANCE_TAB'; tab: SessionState['appearance']['tab'] }
  | { type: 'SET_THEME'; theme: SessionState['appearance']['selectedTheme'] };

function createLevelProgress(): LevelProgress {
  return {
    foundTargetIds: [],
    foundBonusWords: [],
    hintsRevealed: {},
    invalidStreak: 0,
  };
}

const overlayValues: Overlay[] = [
  'none',
  'exit',
  'settings',
  'feedback',
  'word-definition',
  'course',
  'product',
  'bonus-words',
  'regular-reward',
  'golden-reward',
];

const viewValues: View[] = [
  'home',
  'narrative',
  'game',
  'results',
  'results-field',
  'appearance',
];

function numberParam(params: URLSearchParams, key: string, fallback: number): number {
  const rawValue = params.get(key);
  if (rawValue === null || rawValue.trim() === '') {
    return fallback;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function createInitialSession(search = ''): SessionState {
  const params = new URLSearchParams(search);
  const requestedLevel = Number(params.get('level'));
  const currentLevelId: LevelId = requestedLevel === 2 ? 2 : 1;
  const requestedView = params.get('screen') as View | null;
  const view = requestedView && viewValues.includes(requestedView) ? requestedView : 'home';
  const requestedOverlay = params.get('overlay') as Overlay | null;
  const overlay =
    requestedOverlay && overlayValues.includes(requestedOverlay) ? requestedOverlay : 'none';

  let selectedWordId: string | undefined;
  if (overlay === 'course') {
    selectedWordId = LEVELS[currentLevelId].targets.find(
      (target) => target.offer?.type === 'course',
    )?.id;
  } else if (overlay === 'product') {
    selectedWordId = LEVELS[currentLevelId].targets.find(
      (target) => target.offer?.type === 'product',
    )?.id;
  } else if (overlay === 'word-definition') {
    selectedWordId = LEVELS[currentLevelId].targets[0]?.id;
  }

  const levelProgress: Record<LevelId, LevelProgress> = {
    1: createLevelProgress(),
    2: createLevelProgress(),
  };
  const completedLevelIds: LevelId[] = [];
  if (view === 'results-field') {
    levelProgress[currentLevelId].foundTargetIds = LEVELS[currentLevelId].targets.map(
      (target) => target.id,
    );
    const reviewCompletedLevelIds: LevelId[] = currentLevelId === 1 ? [1] : [1, 2];
    completedLevelIds.push(...reviewCompletedLevelIds);
  }

  return {
    view,
    overlay,
    selectedWordId,
    currentLevelId,
    resultsLevelId: currentLevelId,
    completedLevelIds,
    levelProgress,
    knowledge: numberParam(params, 'knowledge', 0),
    hints: numberParam(params, 'hints', 5),
    bonusEnvelopeIndex: 0,
    bonusEnvelopeProgress: numberParam(params, 'envelope', 0),
    goldenRewardClaimed: false,
    mentorQueue: [],
    shownMentorCueIds: [],
    settings: {
      music: true,
      sound: true,
    },
    appearance: {
      tab: 'characters',
      selectedCharacter: 'analyst',
      selectedTheme: 'default',
    },
  };
}

function updateCurrentProgress(
  state: SessionState,
  updater: (progress: LevelProgress) => LevelProgress,
): SessionState {
  return {
    ...state,
    levelProgress: {
      ...state.levelProgress,
      [state.currentLevelId]: updater(state.levelProgress[state.currentLevelId]),
    },
  };
}

export function envelopeThreshold(index: number): number {
  return BONUS_ENVELOPE_THRESHOLDS[Math.min(index, BONUS_ENVELOPE_THRESHOLDS.length - 1)];
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, view: action.view, overlay: 'none', toast: undefined };
    case 'OPEN_RESULTS_FIELD':
      return {
        ...state,
        view: 'results-field',
        overlay: 'none',
        toast: undefined,
        selectedWordId: undefined,
      };
    case 'CLOSE_RESULTS_FIELD':
      return {
        ...state,
        view: 'results',
        overlay: 'none',
        toast: undefined,
        selectedWordId: undefined,
      };
    case 'START_LEVEL':
      return {
        ...state,
        currentLevelId: action.levelId,
        view: action.showNarrative ? 'narrative' : 'game',
        overlay: 'none',
        toast: undefined,
      };
    case 'BEGIN_GAME':
      return { ...state, view: 'game', overlay: 'none' };
    case 'FIND_TARGET': {
      const progress = state.levelProgress[state.currentLevelId];
      if (progress.foundTargetIds.includes(action.targetId)) {
        return state;
      }
      return updateCurrentProgress(
        { ...state, knowledge: state.knowledge + 1 },
        (current) => ({
          ...current,
          foundTargetIds: [...current.foundTargetIds, action.targetId],
          invalidStreak: 0,
          activeHintWordId:
            current.activeHintWordId === action.targetId ? undefined : current.activeHintWordId,
        }),
      );
    }
    case 'FIND_BONUS': {
      const progress = state.levelProgress[state.currentLevelId];
      if (progress.foundBonusWords.includes(action.word)) {
        return state;
      }
      return updateCurrentProgress(
        {
          ...state,
          knowledge: state.knowledge + 1,
          bonusEnvelopeProgress: state.bonusEnvelopeProgress + 1,
        },
        (current) => ({
          ...current,
          foundBonusWords: [...current.foundBonusWords, action.word],
          invalidStreak: 0,
        }),
      );
    }
    case 'REGISTER_INVALID':
      return updateCurrentProgress(state, (current) => ({
        ...current,
        invalidStreak: current.invalidStreak + 1,
      }));
    case 'RESET_INVALID_STREAK':
      return updateCurrentProgress(state, (current) => ({
        ...current,
        invalidStreak: 0,
      }));
    case 'USE_HINT':
      if (state.hints <= 0) {
        return state;
      }
      return updateCurrentProgress(
        { ...state, hints: state.hints - 1 },
        (current) => ({
          ...current,
          activeHintWordId: action.targetId,
          hintsRevealed: {
            ...current.hintsRevealed,
            [action.targetId]: action.revealedCount,
          },
        }),
      );
    case 'OPEN_WORD':
      return {
        ...state,
        overlay: action.overlay,
        selectedWordId: action.targetId,
      };
    case 'SET_OVERLAY':
      return {
        ...state,
        overlay: action.overlay,
        selectedWordId: action.selectedWordId ?? state.selectedWordId,
      };
    case 'CLOSE_OVERLAY':
      return { ...state, overlay: 'none', selectedWordId: undefined };
    case 'SET_TOAST':
      return { ...state, toast: action.toast };
    case 'CLEAR_TOAST':
      return { ...state, toast: undefined };
    case 'QUEUE_MENTOR': {
      if (
        state.shownMentorCueIds.includes(action.cue.id) ||
        state.mentorQueue.some((cue) => cue.id === action.cue.id) ||
        state.currentMentor?.id === action.cue.id
      ) {
        return state;
      }
      if (!state.currentMentor) {
        return {
          ...state,
          currentMentor: action.cue,
          shownMentorCueIds: [...state.shownMentorCueIds, action.cue.id],
        };
      }
      return {
        ...state,
        mentorQueue: [...state.mentorQueue, action.cue],
        shownMentorCueIds: [...state.shownMentorCueIds, action.cue.id],
      };
    }
    case 'DISMISS_MENTOR': {
      const [next, ...rest] = state.mentorQueue;
      return { ...state, currentMentor: next, mentorQueue: rest };
    }
    case 'COMPLETE_LEVEL': {
      const completedLevelIds = state.completedLevelIds.includes(action.levelId)
        ? state.completedLevelIds
        : [...state.completedLevelIds, action.levelId].sort() as LevelId[];
      return {
        ...state,
        completedLevelIds,
        resultsLevelId: action.levelId,
        view: 'results',
        overlay: 'none',
        toast: undefined,
      };
    }
    case 'CLAIM_REGULAR_REWARD':
      return {
        ...state,
        hints: state.hints + (action.reward === 'hint' ? 1 : 0),
        bonusEnvelopeProgress: 0,
        bonusEnvelopeIndex: state.bonusEnvelopeIndex + 1,
        overlay: 'none',
      };
    case 'CLAIM_GOLDEN_REWARD':
      return {
        ...state,
        hints: state.hints + (action.reward === 'hints' ? 3 : 0),
        goldenRewardClaimed: true,
        overlay: 'none',
        view: 'home',
        appearance:
          action.reward === 'theme'
            ? { ...state.appearance, selectedTheme: 'capital' }
            : state.appearance,
      };
    case 'TOGGLE_SETTING':
      return {
        ...state,
        settings: {
          ...state.settings,
          [action.setting]: !state.settings[action.setting],
        },
      };
    case 'SET_APPEARANCE_TAB':
      return {
        ...state,
        appearance: { ...state.appearance, tab: action.tab },
      };
    case 'SET_THEME':
      return {
        ...state,
        appearance: { ...state.appearance, selectedTheme: action.theme },
      };
    default:
      return state;
  }
}

export function selectedTarget(state: SessionState) {
  const levelId = state.view === 'results-field' ? state.resultsLevelId : state.currentLevelId;
  return state.selectedWordId
    ? getTarget(levelId, state.selectedWordId)
    : undefined;
}

export function isLevelComplete(state: SessionState, levelId = state.currentLevelId): boolean {
  return (
    state.levelProgress[levelId].foundTargetIds.length === LEVELS[levelId].targets.length
  );
}
