export type LevelId = 1 | 2;
export type CellId = `${number}:${number}`;

export type WordOfferType = 'course' | 'product';

export interface WordOffer {
  id: string;
  type: WordOfferType;
  title: string;
  definition: string;
  badgeLabel: string;
  description: string;
  ctaLabel: string;
  destination: string;
  autoShow: boolean;
  autoShowPriority?: number;
  campaignId?: string;
}

export interface TargetWord {
  id: string;
  word: string;
  path: CellId[];
  definition: string;
  offer?: WordOffer;
  color: string;
}

export interface MentorCue {
  id: string;
  message: string;
}

export interface LevelConfig {
  id: LevelId;
  title: string;
  grid: string[][];
  targets: TargetWord[];
  bonusWords: string[];
  mentorCues: MentorCue[];
}

export interface LevelProgress {
  foundTargetIds: string[];
  foundBonusWords: string[];
  hintsRevealed: Record<string, number>;
  activeHintWordId?: string;
  invalidStreak: number;
}

export type View =
  | 'home'
  | 'narrative'
  | 'game'
  | 'results'
  | 'results-field'
  | 'appearance';

export type Overlay =
  | 'none'
  | 'exit'
  | 'settings'
  | 'feedback'
  | 'word-definition'
  | 'course'
  | 'product'
  | 'bonus-words'
  | 'regular-reward'
  | 'golden-reward';

export interface ToastState {
  id: number;
  message: string;
  kind: 'success' | 'info' | 'error';
  nextOverlay?: Overlay;
}

export interface SessionState {
  view: View;
  overlay: Overlay;
  selectedWordId?: string;
  currentLevelId: LevelId;
  resultsLevelId: LevelId;
  completedLevelIds: LevelId[];
  levelProgress: Record<LevelId, LevelProgress>;
  knowledge: number;
  hints: number;
  bonusEnvelopeIndex: number;
  bonusEnvelopeProgress: number;
  goldenRewardClaimed: boolean;
  toast?: ToastState;
  currentMentor?: MentorCue;
  mentorQueue: MentorCue[];
  shownMentorCueIds: string[];
  settings: {
    music: boolean;
    sound: boolean;
  };
  appearance: {
    tab: 'characters' | 'themes';
    selectedCharacter: 'analyst';
    selectedTheme: 'default' | 'capital';
  };
}
