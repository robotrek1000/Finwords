import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CellId, LevelId } from '../../app/types';
import type {
  AppearanceCatalogResponse,
  BoardView,
  BonusWord,
  CellRef,
  ClaimRewardRequest,
  ClientStateResponse,
  FoundTarget,
  LevelPlayResponse,
  LevelResultsResponse,
  RewardOption,
  RewardSummary,
  RouteSubmissionResponse,
  SettingsResponse,
  SubmitFeedbackRequest,
  UpdateSettingsRequest,
} from '../../infra/api/generated/data-contracts';
import {
  AppearanceTypeEnum,
  CellViewStateEnum,
  NextAction,
  RouteSubmissionResponseResultEnum3,
  RouteSubmissionResponseOutcomeCodeEnum,
  RewardOptionOptionTypeEnum,
  RewardSummaryRewardTypeEnum,
} from '../../infra/api/generated/data-contracts';
import { BackgroundSurface } from '../../shared/ui/BackgroundSurface';
import { Button } from '../../shared/ui/Button';
import { IconButton } from '../../shared/ui/IconButton';
import { Icon } from '../../shared/ui/icons';
import {
  LoadingProgress,
  type LoadingProgressState,
} from '../../shared/ui/LoadingProgress';
import { defaultP1Api, type P1Api } from './p1Api';
import { GameScreen, type BonusProgress, type GameNotice } from './GameScreen';
import { FieldReviewScreen, ResultsScreen } from './P1Results';
import { cellIdsToRoute } from '../../features/game/routeBuilder';
import { BoardViewGameBoard, type RouteAccentState } from '../../features/game/BoardViewGameBoard';
import {
  resolveGameFoundTargetPresentation,
  resolveFoundTargetPresentation,
  resolveLocalCourseOffer,
} from '../../features/game/targetPresentation';
import styles from './P1App.module.css';
import { isBcsDeepLink, normalizeBcsDeepLink, openDeepLink } from './deepLink';
import { useFinwordsAudio } from './useFinwordsAudio';
import { useModalFocusBoundary } from './useModalFocusBoundary';

type Phase =
  | 'loading'
  | 'error'
  | 'home'
  | 'tutorial'
  | 'narrative'
  | 'appearance'
  | 'game'
  | 'results'
  | 'field-review'
  | 'next-chapter-unavailable'
  | 'campaign-complete';
type Modal =
  | 'none'
  | 'settings'
  | 'feedback'
  | 'reward'
  | 'exit'
  | 'word-definition'
  | 'course-error'
  | 'bonus-words';
type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';
type TargetOpenSource = 'game' | 'results_card' | 'results_field';

interface TargetModalContext {
  target: FoundTarget;
  source: TargetOpenSource;
  destination?: string;
  offerTitle?: string;
}

type FeedbackContext =
  | { source: 'settings' }
  | { source: 'chapter_completion'; chapterId: string };

export interface P1AppProps {
  api?: P1Api;
  game?: ReactNode;
  minimumLoadingMs?: number;
  timeoutMs?: number;
}

const wait = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

const GAME_NOTICE_DURATION_MS = 3_200;

function mergeByWord<T extends { word: string }>(existing: T[], added: T[]): T[] {
  const seen = new Set(existing.map((item) => item.word));
  return [...existing, ...added.filter((item) => !seen.has(item.word))];
}

function availablePendingReward(state: ClientStateResponse | null): RewardSummary | undefined {
  const rewardId = state?.clientState.pendingReward?.rewardId;
  if (!rewardId) return undefined;
  return state.clientState.rewards.find(
    (reward) => reward.rewardId === rewardId && reward.status === 'available',
  );
}

function regularRewardProgress(state: ClientStateResponse | null): BonusProgress | undefined {
  const rewards = state?.clientState.rewards ?? [];
  const pendingReward = availablePendingReward(state);
  const regularReward = pendingReward?.rewardType === RewardSummaryRewardTypeEnum.Regular
    ? pendingReward
    : rewards.find(
        (reward) =>
          reward.rewardType === RewardSummaryRewardTypeEnum.Regular &&
          reward.status === 'collecting',
      );
  return regularReward?.progress;
}

function isLocalLevelId(value: number): value is LevelId {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

function problemType(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'type' in error
    ? String(error.type)
    : undefined;
}

function clampProgress(completedLevels: number, totalLevels: number): number {
  return Math.min(Math.max(completedLevels, 0), totalLevels);
}

function localCourseOfferContext(
  offer: ReturnType<typeof resolveLocalCourseOffer>,
): Pick<TargetModalContext, 'destination' | 'offerTitle'> {
  if (!offer) return {};
  const destination = normalizeBcsDeepLink(offer.destination);
  const [descriptionTitle] = offer.description.split(' — ', 1);
  return {
    ...(destination ? { destination } : {}),
    offerTitle: descriptionTitle || offer.title,
  };
}

const TUTORIAL_BOARD: BoardView = {
  size: 3,
  cells: [
    ['Н', 'О', 'С'],
    ['П', 'А', 'Л'],
    ['Ы', 'Р', 'Х'],
  ].flatMap((row, rowIndex) => row.map((letter, colIndex) => ({
    row: rowIndex,
    col: colIndex,
    letter,
    state: CellViewStateEnum.Letter,
    belongsToFoundWord: false,
  }))),
};

const TUTORIAL_STEPS = [
  {
    word: 'НОС',
    path: ['1:1', '1:2', '1:3'] as CellId[],
    text: 'Начните с первой буквы и проведите по соседним клеткам.',
  },
  {
    word: 'ПАР',
    path: ['2:1', '2:2', '3:2'] as CellId[],
    text: 'Слово может поворачивать, но диагональные переходы не используются.',
  },
  {
    word: 'СОН',
    path: ['1:3', '1:2', '1:1'] as CellId[],
    text: 'Целевое слово можно собрать в прямом или точном обратном порядке.',
  },
  {
    word: 'ПАР',
    path: ['2:1', '2:2', '3:2'] as CellId[],
    text: 'Дополнительные слова (не загаданные на уровне) заполняют белый конверт с наградами.',
  },
  {
    word: 'НОС',
    path: ['1:1', '1:2', '1:3'] as CellId[],
    text: 'Найденные слова остаются на поле и больше не участвуют в маршрутах.',
  },
  {
    word: 'ПАР',
    path: ['2:1', '2:2', '3:2'] as CellId[],
    text: 'Нажмите на найденное слово, чтобы открыть его определение.',
  },
] as const;

function tutorialTarget(word: 'НОС' | 'ПАР', sequence: number): FoundTarget {
  const path = word === 'НОС' ? TUTORIAL_STEPS[0].path : TUTORIAL_STEPS[1].path;
  return {
    targetId: `7f8fad5b-d9cb-469f-a165-80867728959${sequence}`,
    word,
    definition: word === 'ПАР'
      ? 'Вода в газообразном состоянии.'
      : 'Учебное слово для знакомства с игровым полем.',
    cells: path.map((cellId) => {
      const [row, col] = cellId.split(':').map(Number);
      return { row: row - 1, col: col - 1 };
    }),
    foundAt: '2026-08-06T10:00:00.000Z',
    foundSequence: sequence,
  };
}

function LoadingScreen({ state }: { state: LoadingProgressState }) {
  return (
    <section className={styles.systemScreen} aria-label="Загрузка игры">
      <BackgroundSurface />
      <h1 className={styles.loadingLogo}>ФИНВОРДЫ</h1>
      <div className={styles.loadingArt}>
        <img src={`${import.meta.env.BASE_URL}assets/p1/loading-scene.png`} alt="" />
      </div>
      <LoadingProgress state={state} className={styles.loadingProgress} />
    </section>
  );
}

function ErrorScreen({ onRefresh }: { onRefresh: () => void }) {
  return (
    <section className={styles.errorScreen} aria-label="Ошибка загрузки">
      <BackgroundSurface backgroundId="background-error" />
      <header className={styles.appHeader}>
        <span />
        <strong>Финворды</strong>
        <span />
      </header>
      <div className={styles.errorBody}>
        <img src={`${import.meta.env.BASE_URL}assets/p1/error-worker.png`} alt="" />
        <div>
          <h1>Что-то пошло не так</h1>
          <p>Не удалось загрузить данные игры. Проверьте соединение и попробуйте ещё раз.</p>
        </div>
      </div>
      <div className={styles.errorActions}>
        <Button onClick={onRefresh}>Обновить</Button>
        <Button variant="secondary" onClick={() => window.history.back()}>
          Выйти
        </Button>
      </div>
    </section>
  );
}

interface HomeProps {
  state: ClientStateResponse;
  entryStatus: AsyncStatus;
  isInert: boolean;
  pendingReward?: RewardSummary;
  onSettings: () => void;
  onAppearance: () => void;
  onPrimary: () => void;
  onClaimReward: () => void;
  onClose: () => void;
}

function Home({
  state,
  entryStatus,
  isInert,
  pendingReward,
  onSettings,
  onAppearance,
  onPrimary,
  onClaimReward,
  onClose,
}: HomeProps) {
  const client = state.clientState;
  const currentChapter =
    client.chapters.find(
      (chapter) => chapter.status === 'in_progress' || chapter.status === 'available',
  ) ?? client.chapters[0];
  const envelopeThreshold = Math.max(currentChapter?.totalLevels ?? 0, 0);
  const envelopeCurrent = clampProgress(
    currentChapter?.completedLevels ?? 0,
    envelopeThreshold,
  );
  const hasEnvelopeProgress = envelopeThreshold > 0;
  const availableLevelIndex = client.levels.findIndex((level) => level.status === 'available');
  const defaultLevelNumber = availableLevelIndex >= 0
    ? availableLevelIndex + 1
    : Math.min(envelopeCurrent + 1, envelopeThreshold || 1);
  const primaryLabel = client.clientView.campaignProgress.isCompleted
    && client.clientView.campaignProgress.isCompletionShown
    ? 'Итоги игры'
    : client.inProgressLevel
      ? 'Продолжить'
      : `Уровень ${defaultLevelNumber}`;
  const railRef = useRef<HTMLDivElement | null>(null);
  const currentChapterRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const rail = railRef.current;
    const chapter = currentChapterRef.current;
    if (!rail || !chapter) return;
    let frame = 0;
    const centerCurrentChapter = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        rail.scrollLeft = Math.max(
          0,
          chapter.offsetLeft - (rail.clientWidth - chapter.clientWidth) / 2,
        );
      });
    };
    centerCurrentChapter();
    window.addEventListener('resize', centerCurrentChapter);
    return () => {
      window.removeEventListener('resize', centerCurrentChapter);
      window.cancelAnimationFrame(frame);
    };
  }, [currentChapter?.chapterId]);

  return (
    <section className={styles.homeScreen} aria-label="Главный экран" inert={isInert}>
      <BackgroundSurface backgroundId="background-default" />
      <header className={styles.homeHeader}>
        <IconButton icon="close" label="Закрыть игру" onClick={onClose} />
        <h1>Финворды</h1>
        <IconButton icon="settings" label="Настройки" onClick={onSettings} />
      </header>

      <IconButton
        className={styles.appearanceShortcut}
        icon="palette"
        label="Облики"
        onClick={onAppearance}
      />

      <div
        className={styles.knowledgeBadge}
        aria-label={`Знания: ${client.clientView.balance.knowledgePoints}`}
      >
        <img src={`${import.meta.env.BASE_URL}assets/p1/knowledge-badge.png`} alt="" />
        <strong>{client.clientView.balance.knowledgePoints}</strong>
      </div>

      <div className={styles.chapterViewport} aria-label="Главы">
        <div className={styles.chapterRail} ref={railRef}>
          {client.chapters.map((chapter, index) => {
            const current = chapter.chapterId === currentChapter?.chapterId;
            const completed = chapter.status === 'completed';
            const totalLevels = Math.max(chapter.totalLevels, 0);
            const completedLevels = clampProgress(chapter.completedLevels, totalLevels);
            return (
              <article
                className={[
                  styles.chapterCard,
                  current ? styles.currentChapter : '',
                  completed ? styles.completedChapter : '',
                ].filter(Boolean).join(' ')}
                key={chapter.chapterId}
                ref={current ? currentChapterRef : undefined}
                aria-current={current ? 'step' : undefined}
              >
                <span className={styles.chapterArt}>
                  {current ? <img className={styles.chapterRing} src={`${import.meta.env.BASE_URL}assets/p1/chapter-ring.svg`} alt="" /> : null}
                  <img
                    className={styles.chapterImage}
                    src={`${import.meta.env.BASE_URL}assets/p1/chapter-${String(index + 1).padStart(2, '0')}.png`}
                    alt=""
                  />
                  {current ? (
                    <strong className={styles.chapterProgress}>
                       {completedLevels}/{totalLevels}
                    </strong>
                  ) : null}
                </span>
                <h2>{chapter.title}</h2>
                {!current ? <small>{completedLevels}/{totalLevels}</small> : null}
                {completed ? <span className={styles.chapterComplete} aria-hidden="true">✓</span> : null}
              </article>
            );
          })}
        </div>
      </div>

      <article className={styles.envelopeCard}>
        <img src={`${import.meta.env.BASE_URL}assets/envelope-golden.webp`} alt="Золотой конверт" />
        <div>
          <strong>Золотой конверт</strong>
          {hasEnvelopeProgress ? (
            <>
              <span
                className={styles.envelopeTrack}
                role="progressbar"
                aria-label="Прогресс золотого конверта"
                aria-valuemin={0}
                aria-valuemax={envelopeThreshold}
                aria-valuenow={envelopeCurrent}
              >
                <i style={{ width: `${envelopeThreshold > 0 ? (envelopeCurrent / envelopeThreshold) * 100 : 0}%` }} />
              </span>
              <small>{envelopeCurrent}/{envelopeThreshold}</small>
            </>
          ) : null}
        </div>
      </article>

      <div className={styles.homePrimary}>
        {entryStatus === 'error' ? (
          <p className={styles.homeEntryError}>Не удалось открыть уровень</p>
        ) : null}
        <Button disabled={entryStatus === 'loading'} onClick={onPrimary}>
          {entryStatus === 'loading' ? 'Загружаем уровень…' : primaryLabel}
        </Button>
        {pendingReward ? (
          <Button variant="secondary" onClick={onClaimReward}>
            Забрать награду
          </Button>
        ) : null}
      </div>
    </section>
  );
}

interface TutorialScreenProps {
  mode: 'first-run' | 'replay';
  onComplete: () => void;
  onExit: () => void;
}

function TutorialScreen({ mode, onComplete, onExit }: TutorialScreenProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [stepComplete, setStepComplete] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [definitionOpen, setDefinitionOpen] = useState(false);
  const definitionRef = useRef<HTMLElement | null>(null);
  const step = TUTORIAL_STEPS[stepIndex];
  const isDefinitionStep = stepIndex === 5;
  const foundTargets = isDefinitionStep
    ? [tutorialTarget('ПАР', 1)]
    : stepIndex === 4 && stepComplete
      ? [tutorialTarget('НОС', 1)]
      : [];

  useModalFocusBoundary({
    active: definitionOpen,
    dialogRef: definitionRef,
    onEscape: () => setDefinitionOpen(false),
  });

  function finishRoute(path: CellId[]) {
    if (isDefinitionStep) return;
    setStepComplete(
      path.length === step.path.length
      && path.every((cellId, index) => cellId === step.path[index]),
    );
  }

  function advance() {
    if (!stepComplete) return;
    if (stepIndex === TUTORIAL_STEPS.length - 1) {
      onComplete();
      return;
    }
    setStepIndex((current) => current + 1);
    setStepComplete(false);
    setSelectedWord('');
  }

  const statusLabel = stepIndex === 3 && stepComplete
    ? 'ПАР · КОНВЕРТ 1/4'
    : stepIndex === 4 && stepComplete
      ? 'НОС · НАЙДЕНО'
      : selectedWord || step.word;

  return (
    <section className={styles.tutorialScreen} aria-label="Обучение">
      <BackgroundSurface backgroundId="background-default" />
      <header className={styles.tutorialHeader}>
        {mode === 'replay' ? (
          <IconButton icon="close" label="Закрыть обучение" onClick={onExit} />
        ) : <span />}
        <h1>Обучение</h1>
        <span />
      </header>
      <article className={styles.tutorialMentor}>
        <img src={`${import.meta.env.BASE_URL}assets/character-analyst.webp`} alt="" />
        <p>{step.text}</p>
      </article>
      <p className={styles.tutorialWord} aria-live="polite">{statusLabel}</p>
      <div className={styles.tutorialBoard}>
        <BoardViewGameBoard
          board={TUTORIAL_BOARD}
          foundTargets={foundTargets}
          retainSelection={stepComplete && stepIndex < 4}
          inputDisabled={stepComplete && stepIndex < 4}
          onOpenTarget={(target) => {
            if (isDefinitionStep && target.word === 'ПАР') setDefinitionOpen(true);
          }}
          onSelectionChange={(word) => setSelectedWord(word)}
          onSelectionEnd={finishRoute}
        />
      </div>
      <footer className={styles.tutorialFooter}>
        <p>{stepIndex === 3
          ? 'Шаг 4 из 6 · учебный прогресс'
          : `Шаг ${stepIndex + 1} из 6`}</p>
        <span className={styles.tutorialProgress} aria-hidden="true">
          <i style={{ width: `${((stepIndex + 1) / TUTORIAL_STEPS.length) * 100}%` }} />
        </span>
        <div className={styles.tutorialActions}>
          <Button disabled={!stepComplete} onClick={advance}>Далее</Button>
          {mode === 'replay' ? (
            <Button variant="secondary" onClick={onExit}>Пропустить обучение</Button>
          ) : null}
        </div>
      </footer>

      {definitionOpen ? (
        <div className={`${styles.scrim} ${styles.gameInfoScrim}`}>
          <section
            ref={definitionRef}
            className={styles.tutorialDefinition}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-definition-title"
            tabIndex={-1}
          >
            <h2 id="tutorial-definition-title">ПАР</h2>
            <p>Вода в газообразном состоянии.</p>
            <Button
              onClick={() => {
                setDefinitionOpen(false);
                setStepComplete(true);
              }}
            >
              Понятно
            </Button>
          </section>
        </div>
      ) : null}
    </section>
  );
}

interface NarrativeScreenProps {
  chapterTitle: string;
  narrativeText: string;
  status: AsyncStatus | 'locked';
  onContinue: () => void;
  onRetry: () => void;
}

function NarrativeScreen({
  chapterTitle,
  narrativeText,
  status,
  onContinue,
  onRetry,
}: NarrativeScreenProps) {
  return (
    <section className={styles.narrativeScreen} aria-label="История главы">
      <BackgroundSurface backgroundId="background-default" />
      <div className={styles.narrativeCard}>
        <span className={styles.narrativeEyebrow}>Новая глава</span>
        <img src={`${import.meta.env.BASE_URL}assets/character-analyst.webp`} alt="" />
        <h1>{chapterTitle}</h1>
        <p>{narrativeText}</p>
        {status === 'locked' ? (
          <p className={styles.narrativeError} role="alert">Глава пока недоступна</p>
        ) : status === 'error' ? (
          <p className={styles.narrativeError} role="alert">
            Не удалось подтвердить историю главы. Попробуйте ещё раз.
          </p>
        ) : null}
        {status === 'error' ? (
          <Button onClick={onRetry}>Повторить</Button>
        ) : status !== 'locked' ? (
          <Button disabled={status === 'loading'} onClick={onContinue}>
            {status === 'loading' ? 'Продолжаем…' : 'Продолжить'}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

interface SettingsModalProps {
  settings: SettingsResponse;
  status: AsyncStatus;
  active: boolean;
  isInert: boolean;
  onClose: () => void;
  onChange: (body: UpdateSettingsRequest) => void;
  onTutorial: () => void;
  onFeedback: () => void;
}

function SettingsModal({
  settings,
  status,
  active,
  isInert,
  onClose,
  onChange,
  onTutorial,
  onFeedback,
}: SettingsModalProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const pending = status === 'loading';
  useModalFocusBoundary({
    active,
    dialogRef,
    focusKey: status,
    onEscape: pending ? undefined : onClose,
  });

  return (
    <div className={`${styles.scrim} ${styles.settingsScrim}`}>
      <section
        ref={dialogRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="p1-settings-dialog-title"
        tabIndex={-1}
        inert={isInert}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <header className={styles.sheetHeader}>
          <span />
          <h2 id="p1-settings-dialog-title">Настройки</h2>
          <IconButton
            icon="close"
            label="Закрыть настройки"
            depth="flat"
            disabled={pending}
            onClick={onClose}
          />
        </header>
        <div className={styles.settingsList}>
          <label className={styles.settingRow}>
            <span className={styles.settingName}><Icon name="music" />Музыка</span>
            <span className={styles.switchControl}>
              <input
                type="checkbox"
                role="switch"
                aria-label="Музыка"
                checked={settings.musicEnabled}
                disabled={status === 'loading'}
                onChange={() => onChange({ musicEnabled: !settings.musicEnabled })}
              />
              <i aria-hidden="true" />
            </span>
          </label>
          <label className={styles.settingRow}>
            <span className={styles.settingName}><Icon name="sound" />Звук</span>
            <span className={styles.switchControl}>
              <input
                type="checkbox"
                role="switch"
                aria-label="Звук"
                checked={settings.soundEnabled}
                disabled={status === 'loading'}
                onChange={() => onChange({ soundEnabled: !settings.soundEnabled })}
              />
              <i aria-hidden="true" />
            </span>
          </label>
        </div>
        {status === 'loading' ? <p role="status">Сохраняем настройки…</p> : null}
        {status === 'success' ? <p role="status">Настройки сохранены</p> : null}
        {status === 'error' ? <p className={styles.inlineError} role="alert">Не удалось сохранить настройки</p> : null}
        <div className={styles.sheetSpacer} />
        <div className={styles.sheetActions}>
          <Button variant="secondary" onClick={onTutorial}>Пройти обучение</Button>
          <Button variant="secondary" onClick={onFeedback}>Оценить игру</Button>
        </div>
      </section>
    </div>
  );
}

interface FeedbackModalProps {
  status: AsyncStatus;
  context: FeedbackContext;
  onClose: () => void;
  onSubmit: (body: SubmitFeedbackRequest) => void;
}

function FeedbackModal({ status, context, onClose, onSubmit }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const dialogRef = useRef<HTMLElement | null>(null);
  const pending = status === 'loading';
  useModalFocusBoundary({
    active: true,
    dialogRef,
    focusKey: status,
    onEscape: pending || status === 'success' ? undefined : onClose,
  });

  useEffect(() => {
    if (status !== 'success') return;
    const timer = window.setTimeout(onClose, 1_800);
    return () => window.clearTimeout(timer);
  }, [onClose, status]);

  if (status === 'success') {
    return (
      <div className={`${styles.scrim} ${styles.feedbackSuccessScrim}`}>
        <section
          className={styles.feedbackSuccess}
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="p1-feedback-dialog-title"
          tabIndex={-1}
        >
          <span className={styles.sheetHandle} aria-hidden="true" />
          <header className={styles.sheetHeader}>
            <span />
            <h2 id="p1-feedback-dialog-title">Обратная связь</h2>
            <span />
          </header>
          <span className={styles.successMark}><Icon name="check" /></span>
          <p className={styles.feedbackSuccessMessage} role="status">Спасибо за отзыв!</p>
        </section>
      </div>
    );
  }

  return (
    <div className={`${styles.scrim} ${styles.feedbackScrim}`}>
      <section
        ref={dialogRef}
        className={styles.feedbackSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="p1-feedback-dialog-title"
        tabIndex={-1}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <header className={styles.sheetHeader}>
          <span />
          <h2 id="p1-feedback-dialog-title">Оставить отзыв</h2>
          <IconButton
            icon="close"
            label="Закрыть отзыв"
            depth="flat"
            disabled={pending}
            onClick={onClose}
          />
        </header>
        <p>Как вам игра?</p>
        <div className={styles.rating}>
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="rating"
                value={value}
                aria-label={String(value)}
                checked={rating === value}
                onChange={() => setRating(value)}
              />
              <span data-filled={rating >= value} aria-hidden="true" />
            </label>
          ))}
        </div>
        <label className={styles.commentField}>
          <span>Ваш отзыв</span>
          <textarea
            aria-label="Комментарий"
            maxLength={500}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Что можно улучшить?"
          />
          <small>Осталось {500 - comment.length}</small>
        </label>
        {status === 'loading' ? <p role="status">Отправляем отзыв…</p> : null}
        {status === 'error' ? <p className={styles.inlineError} role="alert">Не удалось отправить отзыв</p> : null}
        <Button
          disabled={rating === 0 || status === 'loading'}
          onClick={() =>
            onSubmit({
              source: context.source,
              ...(context.source === 'chapter_completion' ? { chapterId: context.chapterId } : {}),
              rating,
              ...(comment.trim() ? { comment: comment.trim() } : {}),
            } as SubmitFeedbackRequest)
          }
        >
          {status === 'loading' ? 'Отправляем…' : 'Отправить'}
        </Button>
      </section>
    </div>
  );
}

function LifecycleTerminal() {
  return (
    <section className={styles.lifecycleTerminal} aria-label="Статус кампании">
      <div className={styles.lifecycleTerminalCard}>
        <span className={styles.lifecycleTerminalIcon} aria-hidden="true">⚓</span>
        <h1>Следующая глава пока недоступна</h1>
        <p>Первая глава пройдена. Продолжение не входит в эту версию.</p>
      </div>
    </section>
  );
}

function CampaignCompleteScreen({
  state,
  catalog,
  onHome,
}: {
  state: ClientStateResponse;
  catalog: AppearanceCatalogResponse;
  onHome: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const client = state.clientState;
  const completedLevels = client.levels.filter((level) => level.status === 'completed').length;
  const completedChapters = client.chapters.filter((chapter) => chapter.status === 'completed').length;
  const ownedAppearances = catalog.items.filter((appearance) => appearance.isOwned).length;
  const selectedCharacter = catalog.items.find(
    (appearance) => appearance.appearanceId === catalog.selectedCharacterId,
  ) ?? catalog.items.find(
    (appearance) => appearance.type === AppearanceTypeEnum.Character && appearance.title === 'Аналитик',
  ) ?? catalog.items.find((appearance) => appearance.type === AppearanceTypeEnum.Character);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className={styles.campaignCompleteScreen} aria-label="Итоги кампании">
      <div className={styles.campaignCompleteCard}>
        <header className={styles.campaignCompleteHeader}>
          <h1 ref={headingRef} tabIndex={-1}>Вы прошли 50 уровней!</h1>
          <p>Новые главы и финансовые открытия уже на подходе.</p>
        </header>

        <div className={styles.campaignHero}>
          <span className={styles.campaignGlow} aria-hidden="true" />
          <span className={styles.campaignRay} data-ray="left" aria-hidden="true" />
          <span className={styles.campaignRay} data-ray="center" aria-hidden="true" />
          <span className={styles.campaignRay} data-ray="right" aria-hidden="true" />
          {selectedCharacter ? (
            <img
              className={styles.campaignCharacter}
              src={selectedCharacter.imageUrl}
              alt={selectedCharacter.title}
            />
          ) : null}
          <div className={styles.campaignCertificate}>
            <strong>Финворды</strong>
            <span>Кампания завершена</span>
            <b>{completedLevels}/{client.levels.length}</b>
            <small>
              <span className={styles.campaignChapterCount}>
                {completedChapters}/{client.chapters.length}
              </span> глав
            </small>
          </div>
        </div>

        <div className={styles.campaignStats} aria-label="Статистика кампании">
          <article>
            <img src={`${import.meta.env.BASE_URL}assets/p1/knowledge-badge.png`} alt="" />
            <span>Знания</span>
            <strong>{client.clientView.balance.knowledgePoints}</strong>
          </article>
          <article>
            <img src={`${import.meta.env.BASE_URL}assets/envelope-regular.webp`} alt="" />
            <span>Бонусные слова</span>
            <strong>0</strong>
          </article>
          <article>
            {selectedCharacter ? <img src={selectedCharacter.imageUrl} alt="" /> : null}
            <span>Облики</span>
            <strong>{ownedAppearances} из {catalog.items.length}</strong>
          </article>
        </div>

        <Button onClick={onHome}>На главную</Button>
      </div>
      <div className={styles.campaignConfetti} aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i /><i />
      </div>
    </section>
  );
}

function ExitConfirmModal({
  onClose,
  onExit,
}: {
  onClose: () => void;
  onExit?: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  useModalFocusBoundary({ active: true, dialogRef, onEscape: onClose });

  return (
    <div className={`${styles.scrim} ${styles.exitScrim}`}>
      <section
        className={styles.exitSheet}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="p1-exit-dialog-title"
        tabIndex={-1}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <header className={styles.sheetHeader}>
          <span />
          <h2 id="p1-exit-dialog-title">Выйти из игры?</h2>
          <IconButton icon="close" label="Закрыть" depth="flat" onClick={onClose} />
        </header>
        <p className={styles.exitBody}>
          Прогресс сохранится. Вернуться в игру можно в любой момент.
        </p>
        <Button variant="secondary" onClick={onExit}>Выйти</Button>
        <Button autoFocus onClick={onClose}>
          Остаться
        </Button>
      </section>
    </div>
  );
}

function WordDefinitionModal({
  target,
  onClose,
}: {
  target: FoundTarget;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  useModalFocusBoundary({ active: true, dialogRef, onEscape: onClose });

  return (
    <div className={`${styles.scrim} ${styles.gameInfoScrim}`}>
      <section
        className={styles.gameInfoSheet}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="p1-word-definition-dialog-title"
        tabIndex={-1}
      >
        <header className={styles.sheetHeader}>
          <span />
          <h2 id="p1-word-definition-dialog-title">{target.word}</h2>
          <IconButton icon="close" label="Закрыть определение" depth="flat" onClick={onClose} />
        </header>
        <div className={styles.wordDefinitionContent}>
          <p>{target.definition}</p>
        </div>
        <Button autoFocus onClick={onClose}>Понятно</Button>
      </section>
    </div>
  );
}

function CourseErrorModal({
  target,
  destination,
  offerTitle,
  onClose,
  onReturnToField,
}: {
  target: FoundTarget;
  destination?: string;
  offerTitle?: string;
  onClose: () => void;
  onReturnToField: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const canRetry = Boolean(destination && isBcsDeepLink(destination));
  useModalFocusBoundary({ active: true, dialogRef, onEscape: onClose });

  return (
    <div className={`${styles.scrim} ${styles.courseErrorScrim}`}>
      <section
        className={styles.courseErrorSheet}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="p1-course-error-dialog-title"
        tabIndex={-1}
      >
        <header className={styles.sheetHeader}>
          <span />
          <h2 id="p1-course-error-dialog-title">{target.word}</h2>
          <IconButton icon="close" label="Закрыть окно курса" depth="flat" onClick={onClose} />
        </header>
        <div className={styles.courseContentZone}>
          <p className={styles.courseDefinition}>{target.definition}</p>
          <span className={styles.coursePill}>
            <Icon name="book" />
            {target.courseOffer?.badgeLabel ?? 'Мини-курс'}
          </span>
          <p className={styles.courseTitle}>{offerTitle ?? target.courseOffer?.title}</p>
        </div>
        <p className={styles.courseErrorCard}>
          Не удалось открыть страницу. Попробуйте ещё раз.
        </p>
        <p className={styles.courseSavedCard}>Прогресс уровня сохранён</p>
        <div className={styles.courseActions}>
          <Button
            disabled={!canRetry}
            onClick={() => {
              if (destination && canRetry) openDeepLink(destination);
            }}
          >
            Повторить
          </Button>
          <Button variant="secondary" onClick={onReturnToField}>
            Вернуться к полю
          </Button>
        </div>
      </section>
    </div>
  );
}

function BonusWordsModal({
  words,
  progress,
  onClose,
}: {
  words: BonusWord[];
  progress?: BonusProgress;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement | null>(null);
  useModalFocusBoundary({ active: true, dialogRef, onEscape: onClose });
  const hasProgress = Boolean(progress && progress.threshold > 0);
  const foundCount = hasProgress && progress
    ? Math.min(Math.max(progress.current, 0), progress.threshold)
    : undefined;
  const footerText = hasProgress && progress && foundCount !== undefined
    ? foundCount === 0
      ? `На этом уровне найдено 0 из ${progress.threshold}`
      : progress.threshold - foundCount > 0
        ? `Ещё ${progress.threshold - foundCount} слов — и откроется конверт`
        : 'Конверт готов — заберите награду'
    : undefined;

  return (
    <div className={`${styles.scrim} ${styles.bonusWordsScrim}`}>
      <section
        className={styles.bonusWordsSheet}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="p1-bonus-words-dialog-title"
        tabIndex={-1}
      >
        <h2 id="p1-bonus-words-dialog-title">Бонусные слова</h2>
        <IconButton
          className={styles.bonusWordsIconClose}
          icon="close"
          label="Закрыть бонусные слова"
          depth="flat"
          onClick={onClose}
        />

        <div className={styles.bonusWordsViewport}>
          {words.length > 0 ? (
            <ol className={styles.bonusWordList}>
              {words.map((word, index) => (
                <li key={`${word.word}-${word.foundAt}`}>
                  <span>{index + 1}</span>
                  <strong>{word.word}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.bonusWordsEmpty}>Пока бонусных слов нет</p>
          )}
        </div>

        {hasProgress && progress && foundCount !== undefined ? (
          <article className={styles.bonusProgressCard}>
            <img src={`${import.meta.env.BASE_URL}assets/p1/home-envelope.png`} alt="" />
            <div>
              <strong>Бонусный конверт</strong>
              <span
                className={styles.bonusProgressTrack}
                role="progressbar"
                aria-label="Прогресс бонусных слов"
                aria-valuemin={0}
                aria-valuemax={progress.threshold}
                aria-valuenow={foundCount}
              >
                <i style={{ width: `${progress.threshold > 0 ? (foundCount / progress.threshold) * 100 : 0}%` }} />
              </span>
              <small>{foundCount}/{progress.threshold}</small>
            </div>
          </article>
        ) : null}

        {footerText ? <p className={styles.bonusWordsFooter}>{footerText}</p> : null}
        <Button className={styles.bonusWordsClose} variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      </section>
    </div>
  );
}

interface RewardModalProps {
  reward: RewardSummary;
  status: AsyncStatus;
  onClaim: (body: ClaimRewardRequest) => void;
}

function RewardModal({ reward, status, onClaim }: RewardModalProps) {
  const [selection, setSelection] = useState<RewardOption | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  useModalFocusBoundary({ active: true, dialogRef, focusKey: status });

  return (
    <div className={`${styles.scrim} ${styles.rewardScrim}`}>
      <section
        ref={dialogRef}
        className={styles.rewardSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="p1-reward-dialog-title"
        tabIndex={-1}
      >
        <h2 id="p1-reward-dialog-title">Выберите награду</h2>
        <div className={styles.rewardOptions}>
          {(reward.options ?? []).map((option) => {
            const isDecoration = option.optionType === RewardOptionOptionTypeEnum.Decoration;
            const isSelected = selection === option;
            return (
            <label
              key={`${option.optionType}-${option.optionId ?? option.title}`}
              className={isSelected ? styles.rewardSelected : ''}
            >
              <input
                type="radio"
                name="reward"
                aria-label={option.amount !== undefined
                  ? `${option.amount} ${option.amount === 1 ? 'подсказка' : 'подсказки'}`
                  : option.title}
                checked={isSelected}
                disabled={status === 'loading'}
                onChange={() => setSelection(option)}
              />
              <span className={styles.rewardArt}>
                {option.imageUrl ? (
                  <img src={option.imageUrl} alt="" />
                ) : (
                  <span className={styles.rewardIcon} aria-hidden="true">
                    {isDecoration ? '✦' : '💡'}
                  </span>
                )}
              </span>
              <strong>{option.title}</strong>
              <small>{option.amount !== undefined
                ? `+${option.amount} к балансу`
                : option.decorationType === 'background' ? 'Новый фон' : 'Новый персонаж'}</small>
            </label>
            );
          })}
        </div>
        {status === 'loading' ? <p role="status">Забираем награду</p> : null}
        {status === 'error' ? <p className={styles.inlineError} role="alert">Не удалось забрать награду</p> : null}
        <Button
          disabled={!selection || status === 'loading'}
          onClick={() => {
            if (!selection) return;
            onClaim({
              ...(selection.optionType === RewardOptionOptionTypeEnum.Hint
                ? { rewardType: 'hint' as const }
                : {
                    rewardType: 'decoration' as const,
                    selectedOptionId: selection.optionId!,
                  }),
            });
          }}
        >
          {status === 'loading' ? 'Забираем…' : 'Забрать'}
        </Button>
      </section>
    </div>
  );
}

interface GoldenRewardModalProps {
  options: RewardOption[];
  status: AsyncStatus;
  onClaim: (body: ClaimRewardRequest) => void;
  onShowField?: () => void;
  onClose: () => void;
}

function GoldenRewardModal({
  options,
  status,
  onClaim,
  onShowField,
  onClose,
}: GoldenRewardModalProps) {
  const [selection, setSelection] = useState<RewardOption | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const canClaim = selection
    && (selection.optionType === RewardOptionOptionTypeEnum.Hint || selection.optionId);

  useModalFocusBoundary({
    active: true,
    dialogRef,
    focusKey: status,
    onEscape: status === 'loading' ? undefined : onClose,
  });

  return (
    <div className={`${styles.scrim} ${styles.rewardScrim}`}>
      <section
        ref={dialogRef}
        className={styles.rewardSheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="p1-golden-reward-dialog-title"
        tabIndex={-1}
      >
        <h2 id="p1-golden-reward-dialog-title">Выберите награду</h2>
        <div className={styles.rewardOptions}>
          {options.map((option) => {
            const isDecoration = option.optionType === RewardOptionOptionTypeEnum.Decoration;
            const isSelected = selection === option;
            return (
              <label key={`${option.optionType}-${option.optionId ?? option.title}`} className={isSelected ? styles.rewardSelected : ''}>
                <input
                  type="radio"
                  name="golden-reward"
                  aria-label={option.title}
                  checked={isSelected}
                  disabled={status === 'loading'}
                  onChange={() => setSelection(option)}
                />
                <span className={styles.rewardArt}>
                  {option.imageUrl ? (
                    <img src={option.imageUrl} alt="" />
                  ) : (
                    <span className={styles.rewardIcon} aria-hidden="true">
                      {isDecoration ? '✦' : '💡'}
                    </span>
                  )}
                </span>
                <strong>{option.title}</strong>
                <small>
                  {option.amount !== undefined
                    ? `+${option.amount} к балансу`
                    : option.decorationType === 'background' ? 'Новый фон' : 'Новый персонаж'}
                </small>
              </label>
            );
          })}
        </div>
        {status === 'loading' ? <p role="status">Забираем награду</p> : null}
        {status === 'error' ? <p className={styles.inlineError} role="alert">Не удалось забрать награду</p> : null}
        <Button
          disabled={!canClaim || status === 'loading'}
          onClick={() => {
            if (!selection) return;
            onClaim({
              ...(selection.optionType === RewardOptionOptionTypeEnum.Hint
                ? { rewardType: 'hint' as const }
                : {
                    rewardType: 'decoration' as const,
                    selectedOptionId: selection.optionId!,
                  }),
            });
          }}
        >
          {status === 'loading' ? 'Забираем…' : 'Забрать награду'}
        </Button>
        {onShowField ? (
          <Button variant="secondary" disabled={status === 'loading'} onClick={onShowField}>
            Показать поле
          </Button>
        ) : null}
      </section>
    </div>
  );
}

interface AppearanceScreenProps {
  catalog: AppearanceCatalogResponse | null;
  status: AsyncStatus;
  onBack: () => void;
  onRetry: () => void;
  onSelect: (appearanceId: string) => void;
}

function AppearanceScreen({
  catalog,
  status,
  onBack,
  onRetry,
  onSelect,
}: AppearanceScreenProps) {
  const [tab, setTab] = useState<'character' | 'background'>('character');
  const items = catalog?.items.filter((appearance) => appearance.type === tab) ?? [];
  const ownedCount = catalog?.items.filter((appearance) => appearance.isOwned).length ?? 0;
  const totalCount = catalog?.items.length ?? 0;
  const hasCatalog = Boolean(catalog);
  return (
    <section className={styles.appearanceScreen} aria-label="Облики">
      <BackgroundSurface />
      <header className={styles.appearanceHeader}>
        <IconButton icon="back" label="Назад" variant="ghost" onClick={onBack} />
        <h1>Облики</h1>
        <span
          className={styles.appearanceCount}
          aria-label={`Получено обликов: ${ownedCount} из ${totalCount}`}
        >
          {ownedCount}/{totalCount}
        </span>
      </header>
      <div className={styles.appearanceTabs} role="tablist" aria-label="Тип облика">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'character'}
          onClick={() => setTab('character')}
        >
          Персонажи
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'background'}
          onClick={() => setTab('background')}
        >
          Фоны
        </button>
      </div>
      {status === 'loading' && !hasCatalog ? <p className={styles.catalogState}>Загружаем облики…</p> : null}
      {status === 'error' && !hasCatalog ? (
        <div className={styles.catalogState}>
          <p>Не удалось загрузить облики</p>
          <Button onClick={onRetry}>Повторить</Button>
        </div>
      ) : null}
      {status === 'error' && hasCatalog ? (
        <p className={styles.appearanceInlineError} role="alert">
          Не удалось выбрать облик. Попробуйте ещё раз.
        </p>
      ) : null}
      {hasCatalog && items.length === 0 ? (
        <p className={styles.catalogState}>В этой категории пока нет обликов</p>
      ) : null}
      {hasCatalog && items.length > 0 ? (
        <div className={styles.appearanceGrid} aria-busy={status === 'loading'}>
          {items.map((appearance) => (
            <button
              type="button"
              key={appearance.appearanceId}
              aria-label={appearance.title}
              aria-pressed={appearance.isSelected}
              disabled={!appearance.isOwned || status === 'loading'}
              className={appearance.isSelected ? styles.appearanceSelected : ''}
              onClick={() => onSelect(appearance.appearanceId)}
            >
              <span className={styles.appearancePreview}>
                {appearance.type === 'background' ? (
                  <img className={styles.backgroundPreviewImage} src={appearance.imageUrl} alt="" />
                ) : (
                  <img src={appearance.imageUrl} alt="" />
                )}
              </span>
              <strong>{appearance.title}</strong>
              <small>{appearance.isOwned ? (appearance.isSelected ? 'Выбрано' : 'Доступно') : 'Не получено'}</small>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function P1App({
  api = defaultP1Api,
  game,
  minimumLoadingMs = 250,
  timeoutMs = 8_000,
}: P1AppProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [modal, setModal] = useState<Modal>('none');
  const [loadingState, setLoadingState] = useState<LoadingProgressState>('Connecting');
  const [clientState, setClientState] = useState<ClientStateResponse | null>(null);
  const [settingsStatus, setSettingsStatus] = useState<AsyncStatus>('idle');
  const [feedbackStatus, setFeedbackStatus] = useState<AsyncStatus>('idle');
  const [feedbackContext, setFeedbackContext] = useState<FeedbackContext>({ source: 'settings' });
  const [feedbackNextAction, setFeedbackNextAction] = useState<NextAction | null>(null);
  const [rewardStatus, setRewardStatus] = useState<AsyncStatus>('idle');
  const [catalogStatus, setCatalogStatus] = useState<AsyncStatus>('idle');
  const [catalog, setCatalog] = useState<AppearanceCatalogResponse | null>(null);
  const catalogRef = useRef<AppearanceCatalogResponse | null>(null);
  const [campaignCompleteMode, setCampaignCompleteMode] = useState<'automatic' | 'replay' | null>(null);
  const campaignConfirmationStartedRef = useRef(false);
  const [entryStatus, setEntryStatus] = useState<AsyncStatus>('idle');
  const [tutorialMode, setTutorialMode] = useState<'first-run' | 'replay'>('first-run');
  const [narrativeStatus, setNarrativeStatus] = useState<AsyncStatus | 'locked'>('idle');
  const tutorialAcknowledgedRef = useRef(false);
  const narrativeControllerRef = useRef<AbortController | null>(null);
  const [hintStatus, setHintStatus] = useState<AsyncStatus>('idle');
  const [levelPlay, setLevelPlay] = useState<LevelPlayResponse | null>(null);
  const [gameNotice, setGameNotice] = useState<GameNotice | undefined>();
  const gameNoticeTimerRef = useRef<number | null>(null);
  const gameNoticeGenerationRef = useRef(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameRewardOpened, setGameRewardOpened] = useState(false);
  const clientStateRef = useRef<ClientStateResponse | null>(null);
  const phaseRef = useRef<Phase>('loading');
  const rewardOpenTimerRef = useRef<{ rewardId: string; timer: number } | null>(null);
  const [targetModalContext, setTargetModalContext] = useState<TargetModalContext | null>(null);
  const [levelResults, setLevelResults] = useState<LevelResultsResponse | null>(null);
  const [resultsStatus, setResultsStatus] = useState<AsyncStatus>('idle');
  const [resultsLoadingVisible, setResultsLoadingVisible] = useState(false);
  const [resultsLevelId, setResultsLevelId] = useState<string | null>(null);
  const gameBoundaryRef = useRef<HTMLDivElement | null>(null);
  const resultsBoundaryRef = useRef<HTMLDivElement | null>(null);
  const fieldReviewBoundaryRef = useRef<HTMLDivElement | null>(null);
  const [ackStatus, setAckStatus] = useState<AsyncStatus>('idle');
  const ackControllerRef = useRef<AbortController | null>(null);
  const ackGenerationRef = useRef(0);
  const ackIntentRef = useRef<'next' | 'home' | 'reward' | null>(null);
  const ackPendingRef = useRef(false);
  const ackTimeoutTimerRef = useRef<number | null>(null);
  const resultsAcknowledgedRef = useRef(false);
  const rewardPrimaryRef = useRef<HTMLButtonElement | null>(null);
  const rewardReturnFocusRef = useRef<HTMLElement | null>(null);
  const restoreRewardFocusRef = useRef(false);
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const resultsGenerationRef = useRef(0);
  const resultsControllerRef = useRef<AbortController | null>(null);
  const resultsDelayTimerRef = useRef<number | null>(null);
  const resultsTimeoutTimerRef = useRef<number | null>(null);
  const submitControllerRef = useRef<AbortController | null>(null);
  const [submitPending, setSubmitPending] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [routeState, setRouteState] = useState<RouteAccentState | undefined>();
  const [routeHold, setRouteHold] = useState(false);
  const submitDelayTimerRef = useRef<number | null>(null);
  const submitTimeoutTimerRef = useRef<number | null>(null);
  const submitHoldTimerRef = useRef<number | null>(null);
  const submitGenerationRef = useRef(0);

  const clearGameNoticeTimer = useCallback(() => {
    if (gameNoticeTimerRef.current === null) return;
    window.clearTimeout(gameNoticeTimerRef.current);
    gameNoticeTimerRef.current = null;
  }, []);

  const clearGameNotice = useCallback(() => {
    gameNoticeGenerationRef.current += 1;
    clearGameNoticeTimer();
    setGameNotice(undefined);
  }, [clearGameNoticeTimer]);

  const showGameNotice = useCallback((notice: GameNotice) => {
    clearGameNoticeTimer();
    const generation = gameNoticeGenerationRef.current + 1;
    gameNoticeGenerationRef.current = generation;
    setGameNotice(notice);
    gameNoticeTimerRef.current = window.setTimeout(() => {
      if (gameNoticeGenerationRef.current !== generation) return;
      gameNoticeTimerRef.current = null;
      setGameNotice(undefined);
    }, GAME_NOTICE_DURATION_MS);
  }, [clearGameNoticeTimer]);

  function cancelScheduledRewardOpen() {
    if (!rewardOpenTimerRef.current) return;
    window.clearTimeout(rewardOpenTimerRef.current.timer);
    rewardOpenTimerRef.current = null;
  }

  function scheduleRewardOpen(rewardId: string) {
    cancelScheduledRewardOpen();
    rewardOpenTimerRef.current = {
      rewardId,
      timer: window.setTimeout(() => {
        const pendingReward = availablePendingReward(clientStateRef.current);
        if (
          phaseRef.current === 'game' &&
          pendingReward?.rewardId === rewardId &&
          pendingReward.rewardType === RewardSummaryRewardTypeEnum.Regular
        ) {
          setRewardStatus('idle');
          setModal('reward');
        }
        rewardOpenTimerRef.current = null;
      }, 500),
    };
  }

  const enterGame = useCallback(async (
    state: ClientStateResponse,
    signal?: AbortSignal,
  ) => {
    setEntryStatus('loading');
    clearGameNotice();
    submitGenerationRef.current += 1;
    if (submitControllerRef.current) {
      submitControllerRef.current.abort();
      submitControllerRef.current = null;
    }
    setSubmitPending(false);
    setSubmitLoading(false);
    setRouteHold(false);
    setRouteState(undefined);
    if (submitHoldTimerRef.current !== null) {
      window.clearTimeout(submitHoldTimerRef.current);
      submitHoldTimerRef.current = null;
    }
    if (submitDelayTimerRef.current !== null) {
      window.clearTimeout(submitDelayTimerRef.current);
      submitDelayTimerRef.current = null;
    }
    if (submitTimeoutTimerRef.current !== null) {
      window.clearTimeout(submitTimeoutTimerRef.current);
      submitTimeoutTimerRef.current = null;
    }
    try {
      const response = await api.enterLevel(state, signal);
      setLevelPlay(response);
      setGameCompleted(false);
      setGameRewardOpened(false);
      setHintStatus('idle');
      setModal('none');
      setPhase('game');
      setEntryStatus('success');
    } catch (error) {
      setEntryStatus('error');
      throw error;
    }
  }, [api, clearGameNotice]);

  const openCampaignComplete = useCallback(async (
    state: ClientStateResponse,
    mode: 'automatic' | 'replay',
    signal?: AbortSignal,
  ) => {
    setEntryStatus('loading');
    const authoritativeState = mode === 'automatic'
      ? await api.resyncState(signal)
      : state;
    if (!authoritativeState.clientState.clientView.campaignProgress.isCompleted) {
      throw new Error('CAMPAIGN_NOT_COMPLETED');
    }
    const authoritativeCatalog = catalogRef.current ?? await api.getAppearances();
    if (signal?.aborted) return;
    catalogRef.current = authoritativeCatalog;
    setCatalog(authoritativeCatalog);
    clientStateRef.current = authoritativeState;
    setClientState(authoritativeState);
    if (mode === 'automatic') campaignConfirmationStartedRef.current = false;
    setCampaignCompleteMode(mode);
    setModal('none');
    setPhase('campaign-complete');
    setEntryStatus('success');
  }, [api]);

  const routeNextAction = useCallback(async (
    nextAction: NextAction,
    state: ClientStateResponse,
    signal?: AbortSignal,
    completedChapterId?: string,
  ) => {
    setEntryStatus('idle');
    clearGameNotice();
    switch (nextAction) {
      case NextAction.Play:
        await enterGame(state, signal);
        return;
      case NextAction.ClaimReward:
        setPhase('home');
        setRewardStatus('idle');
        setModal(availablePendingReward(state) ? 'reward' : 'none');
        return;
      case NextAction.OpenFeedback: {
        const chapter = (
          completedChapterId
            ? state.clientState.chapters.find((candidate) => candidate.chapterId === completedChapterId)
            : undefined
        ) ?? state.clientState.chapters
          .filter((candidate) => candidate.status === 'completed')
          .at(-1)
          ?? state.clientState.chapters[0];
        if (!chapter) {
          setPhase('next-chapter-unavailable');
          setModal('none');
          return;
        }
        setFeedbackContext({ source: 'chapter_completion', chapterId: chapter.chapterId });
        setFeedbackNextAction(null);
        setFeedbackStatus('idle');
        setPhase('home');
        setModal('feedback');
        return;
      }
      case NextAction.NextChapter: {
        const authoritativeState = await api.resyncState(signal);
        clientStateRef.current = authoritativeState;
        setClientState(authoritativeState);
        const chapter = authoritativeState.clientState.chapters.find(
          (candidate) => candidate.status === 'in_progress' || candidate.status === 'available',
        );
        setModal('none');
        if (!chapter) {
          setPhase('next-chapter-unavailable');
        } else if (!chapter.isNarrativeShown) {
          setNarrativeStatus('idle');
          setPhase('narrative');
        } else {
          await enterGame(authoritativeState, signal);
        }
        return;
      }
      case NextAction.CampaignComplete:
        await openCampaignComplete(state, 'automatic', signal);
        return;
      case NextAction.StartLevel:
      case NextAction.None:
        setPhase('home');
        setModal('none');
        return;
    }
  }, [api, clearGameNotice, enterGame, openCampaignComplete]);

  const beginLevelFlow = useCallback((state: ClientStateResponse) => {
    const chapter = state.clientState.chapters.find(
      (candidate) => candidate.status === 'in_progress' || candidate.status === 'available',
    ) ?? state.clientState.chapters[0];
    if (!chapter) {
      setEntryStatus('error');
      return;
    }
    if (
      !state.clientState.clientView.settings.tutorialCompleted
      && !tutorialAcknowledgedRef.current
    ) {
      setTutorialMode('first-run');
      setPhase('tutorial');
      return;
    }
    if (!chapter.isNarrativeShown) {
      setNarrativeStatus('idle');
      setPhase('narrative');
      return;
    }
    void enterGame(state).catch(() => undefined);
  }, [enterGame]);

  const confirmNarrativeAndEnter = useCallback(async () => {
    const state = clientStateRef.current;
    const chapter = state?.clientState.chapters.find(
      (candidate) => candidate.status === 'in_progress' || candidate.status === 'available',
    ) ?? state?.clientState.chapters[0];
    if (!state || !chapter || narrativeStatus === 'loading' || narrativeStatus === 'locked') return;

    narrativeControllerRef.current?.abort();
    const controller = new AbortController();
    narrativeControllerRef.current = controller;
    setNarrativeStatus('loading');
    try {
      const response = await api.confirmNarrativeShown(chapter.chapterId, state, controller.signal);
      if (controller.signal.aborted) return;
      const nextState: ClientStateResponse = {
        ...state,
        clientState: {
          ...state.clientState,
          chapters: state.clientState.chapters.map((candidate) =>
            candidate.chapterId === response.chapterId
              ? { ...candidate, isNarrativeShown: response.isNarrativeShown, narrativeText: undefined }
              : candidate,
          ),
          nextAction: response.nextAction,
        },
      };
      clientStateRef.current = nextState;
      setClientState(nextState);
      setNarrativeStatus('success');
      if (response.nextAction === 'start_level' || response.nextAction === 'play') {
        await enterGame(nextState, controller.signal);
      } else {
        await routeNextAction(response.nextAction, nextState, controller.signal);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const type = typeof error === 'object' && error !== null && 'type' in error
        ? String(error.type)
        : undefined;
      setNarrativeStatus(type === 'CHAPTER_LOCKED' ? 'locked' : 'error');
      setPhase('narrative');
    } finally {
      if (narrativeControllerRef.current === controller) narrativeControllerRef.current = null;
    }
  }, [api, enterGame, narrativeStatus, routeNextAction]);

  const clearResultsTimers = useCallback(() => {
    if (resultsDelayTimerRef.current !== null) {
      window.clearTimeout(resultsDelayTimerRef.current);
      resultsDelayTimerRef.current = null;
    }
    if (resultsTimeoutTimerRef.current !== null) {
      window.clearTimeout(resultsTimeoutTimerRef.current);
      resultsTimeoutTimerRef.current = null;
    }
  }, []);

  const invalidateAcknowledge = useCallback(() => {
    ackGenerationRef.current += 1;
    ackControllerRef.current?.abort();
    ackControllerRef.current = null;
    ackPendingRef.current = false;
    if (ackTimeoutTimerRef.current !== null) {
      window.clearTimeout(ackTimeoutTimerRef.current);
      ackTimeoutTimerRef.current = null;
    }
  }, []);

  const loadResults = useCallback(async (levelId: string) => {
    resultsGenerationRef.current += 1;
    const generation = resultsGenerationRef.current;
    resultsControllerRef.current?.abort();
    clearResultsTimers();
    const controller = new AbortController();
    resultsControllerRef.current = controller;
    setResultsLevelId(levelId);
    setLevelResults(null);
    setResultsStatus('loading');
    setResultsLoadingVisible(false);
    invalidateAcknowledge();
    ackIntentRef.current = null;
    resultsAcknowledgedRef.current = false;
    setAckStatus('idle');
    clearGameNotice();
    setPhase('results');
    resultsDelayTimerRef.current = window.setTimeout(() => {
      if (resultsGenerationRef.current === generation) setResultsLoadingVisible(true);
    }, 250);

    try {
      const timeout = new Promise<never>((_, reject) => {
        resultsTimeoutTimerRef.current = window.setTimeout(() => {
          controller.abort();
          reject(new Error('RESULTS_TIMEOUT'));
        }, timeoutMs);
      });
      const response = await Promise.race([
        api.getLevelResults(levelId, controller.signal),
        timeout,
      ]);
      if (generation !== resultsGenerationRef.current) return;
      setLevelResults(response);
      setResultsStatus('success');
    } catch {
      if (generation !== resultsGenerationRef.current) return;
      setResultsStatus('error');
    } finally {
      if (generation === resultsGenerationRef.current) {
        clearResultsTimers();
        resultsControllerRef.current = null;
      }
    }
  }, [api, clearGameNotice, clearResultsTimers, invalidateAcknowledge, timeoutMs]);

  const load = useCallback(async () => {
    generationRef.current += 1;
    const generation = generationRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPhase('loading');
    setModal('none');
    setLoadingState('Connecting');
    const startedAt = Date.now();
    const stageTimers = [
      window.setTimeout(() => setLoadingState('LoadingData'), 550),
      window.setTimeout(() => setLoadingState('Restoring'), 1_100),
      window.setTimeout(() => setLoadingState('Preparing'), 1_650),
    ];
    let timeoutId = 0;

    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new Error('BOOTSTRAP_TIMEOUT'));
        }, timeoutMs);
      });
      const nextState = await Promise.race([api.loadState(controller.signal), timeout]);
      await wait(Math.max(0, minimumLoadingMs - (Date.now() - startedAt)));
       if (generation !== generationRef.current) return;
       setLoadingState('Preparing');
       clientStateRef.current = nextState;
       setClientState(nextState);
      if (nextState.clientState.pendingResults) {
        await loadResults(nextState.clientState.pendingResults.levelId);
        return;
      }
      await routeNextAction(nextState.clientState.nextAction, nextState, controller.signal);
    } catch {
      await wait(Math.max(0, minimumLoadingMs - (Date.now() - startedAt)));
      if (generation !== generationRef.current) return;
      setPhase('error');
    } finally {
      stageTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(timeoutId);
    }
  }, [api, loadResults, minimumLoadingMs, routeNextAction, timeoutMs]);

  useEffect(() => {
    clientStateRef.current = clientState;
    phaseRef.current = phase;
  }, [clientState, phase]);

  useEffect(() => {
    if (
      phase !== 'campaign-complete'
      || campaignCompleteMode !== 'automatic'
      || campaignConfirmationStartedRef.current
    ) return;
    campaignConfirmationStartedRef.current = true;
    void api.confirmCampaignCompleteShown().then((response) => {
      const current = clientStateRef.current;
      if (!current) return;
      const confirmedState: ClientStateResponse = {
        ...current,
        clientState: {
          ...current.clientState,
          clientView: {
            ...current.clientState.clientView,
            campaignProgress: {
              ...current.clientState.clientView.campaignProgress,
              isCompletionShown: response.isCompletionShown,
            },
          },
          nextAction: response.nextAction,
        },
      };
      clientStateRef.current = confirmedState;
      setClientState(confirmedState);
    }).catch(() => undefined);
  }, [api, campaignCompleteMode, phase]);

  useEffect(() => {
    const startTimer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(startTimer);
      generationRef.current += 1;
      controllerRef.current?.abort();
      narrativeControllerRef.current?.abort();
      resultsGenerationRef.current += 1;
      resultsControllerRef.current?.abort();
      invalidateAcknowledge();
      cancelScheduledRewardOpen();
      clearResultsTimers();
    };
  }, [clearResultsTimers, invalidateAcknowledge, load]);

  useEffect(
    () => () => {
      if (submitDelayTimerRef.current !== null) {
        window.clearTimeout(submitDelayTimerRef.current);
      }
      if (submitTimeoutTimerRef.current !== null) {
        window.clearTimeout(submitTimeoutTimerRef.current);
      }
      if (submitHoldTimerRef.current !== null) {
        window.clearTimeout(submitHoldTimerRef.current);
      }
      if (submitControllerRef.current) {
        submitControllerRef.current.abort();
        submitControllerRef.current = null;
      }
      submitGenerationRef.current += 1;
      resultsGenerationRef.current += 1;
      resultsControllerRef.current?.abort();
      gameNoticeGenerationRef.current += 1;
      clearGameNoticeTimer();
      cancelScheduledRewardOpen();
      clearResultsTimers();
    },
    [clearGameNoticeTimer, clearResultsTimers],
  );

  useLayoutEffect(() => {
    if (modal !== 'none' || !restoreRewardFocusRef.current) return;
    restoreRewardFocusRef.current = false;
    const trigger = rewardPrimaryRef.current ?? rewardReturnFocusRef.current;
    rewardReturnFocusRef.current = null;
    trigger?.focus();
  }, [modal]);

  const openAppearance = useCallback(() => {
    setPhase('appearance');
    setCatalogStatus('loading');
    void api
      .getAppearances()
      .then((response) => {
        catalogRef.current = response;
        setCatalog(response);
        setCatalogStatus('success');
      })
      .catch(() => setCatalogStatus('error'));
  }, [api]);

  const settings = clientState?.clientState.clientView.settings;
  const knowledge = clientState?.clientState.clientView.balance;
  const reward = availablePendingReward(clientState);
  const bonusProgress = regularRewardProgress(clientState);
  const modalReward = reward?.rewardType === RewardSummaryRewardTypeEnum.Regular ? reward : undefined;
  const pendingGoldenReward = reward?.rewardType === RewardSummaryRewardTypeEnum.ChapterGolden
    ? reward
    : undefined;

  useEffect(() => {
    if (
      rewardOpenTimerRef.current &&
      (phase !== 'game' || reward?.rewardId !== rewardOpenTimerRef.current.rewardId)
    ) {
      cancelScheduledRewardOpen();
    }
  }, [phase, reward?.rewardId]);
  const resultsLevelNumber =
    levelResults && levelPlay?.levelId === levelResults.levelId
      ? levelPlay.levelNumber
      : undefined;
  const resultsLevelLabel =
    resultsLevelNumber !== undefined
      ? `уровня ${resultsLevelNumber}`
      : 'текущего уровня';
  const chapterGoldenReward =
    levelResults?.completionKind === 'chapter'
    && levelResults.reward?.rewardType === RewardSummaryRewardTypeEnum.ChapterGolden
    && levelResults.reward.status === 'available'
      ? levelResults.reward
      : undefined;

  const openFoundTarget = useCallback((
    target: FoundTarget,
    source: TargetOpenSource,
    levelNumber?: number,
  ) => {
    const presentation =
      source === 'game' && levelNumber !== undefined && isLocalLevelId(levelNumber)
        ? resolveGameFoundTargetPresentation(levelNumber, target)
        : resolveFoundTargetPresentation(target);
    const localOfferContext =
      levelNumber !== undefined && isLocalLevelId(levelNumber)
        ? localCourseOfferContext(resolveLocalCourseOffer(levelNumber, target))
        : {};
    const serverOfferContext = target.courseOffer
      ? {
          ...(localOfferContext.destination ? { destination: localOfferContext.destination } : {}),
          ...(!target.courseOffer.title && localOfferContext.offerTitle
            ? { offerTitle: localOfferContext.offerTitle }
            : {}),
        }
      : source === 'game'
        ? localOfferContext
        : {};
    setTargetModalContext({
      target,
      source,
      ...serverOfferContext,
    });
    setModal(presentation.linked ? 'course-error' : 'word-definition');
  }, []);

  function rememberRewardTrigger() {
    const activeElement = document.activeElement;
    rewardReturnFocusRef.current = activeElement instanceof HTMLElement
      ? activeElement
      : null;
  }

  function restoreRewardTriggerFocus() {
    restoreRewardFocusRef.current = true;
  }

  async function acknowledgeResults(intent: 'next' | 'home' | 'reward') {
    if (!levelResults || ackPendingRef.current) return;
    if (resultsAcknowledgedRef.current) {
      if (intent === 'reward') {
        setRewardStatus('idle');
        setModal('reward');
      } else if (intent === 'home') {
        setLevelResults(null);
        setResultsStatus('idle');
        setModal('none');
        setPhase('home');
      } else if (clientState) {
        const nextState = {
          ...clientState,
          clientState: {
            ...clientState.clientState,
            pendingResults: undefined,
          },
        };
        setLevelResults(null);
        setResultsStatus('idle');
        setModal('none');
        setPhase('home');
        void enterGame(nextState).catch(() => undefined);
      }
      return;
    }

    const generation = ackGenerationRef.current + 1;
    ackGenerationRef.current = generation;
    ackPendingRef.current = true;
    ackIntentRef.current = intent;
    const controller = new AbortController();
    ackControllerRef.current = controller;
    setAckStatus('loading');

    try {
      ackTimeoutTimerRef.current = window.setTimeout(() => {
        if (generation !== ackGenerationRef.current) return;
        controller.abort();
        ackGenerationRef.current += 1;
        ackPendingRef.current = false;
        ackControllerRef.current = null;
        ackTimeoutTimerRef.current = null;
        setAckStatus('error');
      }, timeoutMs);
      const response = await api.acknowledgeLevelResults(levelResults.levelId, controller.signal);
      if (generation !== ackGenerationRef.current) return;
      if (ackTimeoutTimerRef.current !== null) {
        window.clearTimeout(ackTimeoutTimerRef.current);
        ackTimeoutTimerRef.current = null;
      }

      const nextState = clientState
        ? {
            ...clientState,
            clientState: {
              ...clientState.clientState,
              pendingResults: undefined,
              pendingReward: response.pendingReward,
              nextAction: response.nextAction,
            },
          }
        : null;
      resultsAcknowledgedRef.current = true;
      setAckStatus('success');
      ackIntentRef.current = null;
      clientStateRef.current = nextState;
      setClientState(nextState);

      if (intent === 'reward') {
        setRewardStatus('idle');
        setModal('reward');
        return;
      }

      setLevelResults(null);
      setResultsStatus('idle');
      setModal('none');
      setPhase('home');

      if (!nextState || intent === 'home') return;
      if (response.nextAction === 'start_level' || response.nextAction === 'play') {
        const authoritativeState = await api.resyncState(controller.signal);
        if (generation !== ackGenerationRef.current) return;
        clientStateRef.current = authoritativeState;
        setClientState(authoritativeState);
        if (
          authoritativeState.clientState.nextAction === 'start_level'
          || authoritativeState.clientState.nextAction === 'play'
        ) {
          await enterGame(authoritativeState);
        } else {
          await routeNextAction(authoritativeState.clientState.nextAction, authoritativeState);
        }
      } else {
        await routeNextAction(response.nextAction, nextState);
      }
    } catch {
      if (generation !== ackGenerationRef.current) return;
      if (ackTimeoutTimerRef.current !== null) {
        window.clearTimeout(ackTimeoutTimerRef.current);
        ackTimeoutTimerRef.current = null;
      }
      setAckStatus('error');
      setPhase('results');
    } finally {
      if (generation === ackGenerationRef.current) {
        ackPendingRef.current = false;
        ackControllerRef.current = null;
      }
    }
  }

  async function updateSettings(body: UpdateSettingsRequest) {
    setSettingsStatus('loading');
    try {
      const response = await api.updateSettings(body);
      setClientState((current) =>
        current
          ? {
              ...current,
              clientState: {
                ...current.clientState,
                clientView: { ...current.clientState.clientView, settings: response },
              },
            }
          : current,
      );
      setSettingsStatus('success');
    } catch {
      setSettingsStatus('error');
    }
  }

  async function selectAppearance(appearanceId: string) {
    const item = catalog?.items.find((appearance) => appearance.appearanceId === appearanceId);
    if (!item?.isOwned) return;
    setCatalogStatus('loading');
    try {
      const response = await api.selectAppearance(appearanceId);
      setCatalog((current) =>
        current
          ? {
              ...current,
              selectedCharacterId: response.selectedCharacterId,
              selectedBackgroundId: response.selectedBackgroundId,
              items: current.items.map((appearance) => ({
                ...appearance,
                isSelected:
                  appearance.type === 'character'
                    ? appearance.appearanceId === response.selectedCharacterId
                    : appearance.appearanceId === response.selectedBackgroundId,
              })),
            }
          : current,
      );
      setClientState((current) =>
        current
          ? {
              ...current,
              clientState: {
                ...current.clientState,
                clientView: {
                  ...current.clientState.clientView,
                  selectedCharacterId: response.selectedCharacterId,
                  selectedBackgroundId: response.selectedBackgroundId,
                },
              },
            }
          : current,
      );
      setCatalogStatus('success');
    } catch {
      setCatalogStatus('error');
    }
  }

  async function submitFeedback(body: SubmitFeedbackRequest) {
    setFeedbackStatus('loading');
    try {
      const response = await api.submitFeedback(body);
      setFeedbackNextAction(response.nextAction);
      if (clientState) {
        const nextState = {
          ...clientState,
          clientState: { ...clientState.clientState, nextAction: response.nextAction },
        };
        clientStateRef.current = nextState;
        setClientState(nextState);
      }
      setFeedbackStatus('success');
    } catch (error) {
      if (feedbackContext.source === 'chapter_completion' && problemType(error) === 'FEEDBACK_NOT_ELIGIBLE') {
        setFeedbackStatus('idle');
        setModal('none');
        if (clientState) await routeNextAction(NextAction.NextChapter, clientState);
        return;
      }
      setFeedbackStatus('error');
    }
  }

  async function closeFeedback() {
    if (feedbackContext.source === 'settings') {
      setModal('settings');
      return;
    }
    if (feedbackStatus === 'success' && feedbackNextAction) {
      setModal('none');
      if (clientState) await routeNextAction(feedbackNextAction, clientState);
      return;
    }
    if (feedbackStatus === 'loading') return;
    setFeedbackStatus('loading');
    try {
      const response = await api.dismissFeedback(feedbackContext.chapterId);
      const nextState = clientState
        ? {
            ...clientState,
            clientState: { ...clientState.clientState, nextAction: response.nextAction },
          }
        : null;
      if (nextState) {
        clientStateRef.current = nextState;
        setClientState(nextState);
        setModal('none');
        await routeNextAction(response.nextAction, nextState);
      }
    } catch {
      setFeedbackStatus('error');
    }
  }

  async function reloadClientStateAfterRegularClaim(
    fallbackState: ClientStateResponse,
    claimedRewardId: string,
    nextAction: NextAction,
  ) {
    generationRef.current += 1;
    const generation = generationRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    let timeoutId = 0;

    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new Error('CLIENT_STATE_RELOAD_TIMEOUT'));
        }, timeoutMs);
      });
      const reloadedState = await Promise.race([api.loadState(controller.signal), timeout]);
      if (generation !== generationRef.current) return;
      if (
        !reloadedState?.clientState
        || availablePendingReward(reloadedState)?.rewardId === claimedRewardId
      ) {
        throw new Error('STALE_CLIENT_STATE');
      }

      clientStateRef.current = reloadedState;
      setClientState(reloadedState);
      await routeNextAction(nextAction, reloadedState, controller.signal);
    } catch {
      if (generation !== generationRef.current) return;
      await routeNextAction(fallbackState.clientState.nextAction, fallbackState);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function recoverResultsAcknowledgement(error: unknown): Promise<boolean> {
    if (problemType(error) !== 'RESULTS_ACKNOWLEDGEMENT_REQUIRED') return false;
    try {
      const authoritative = await api.loadState();
      clientStateRef.current = authoritative;
      setClientState(authoritative);
      setRewardStatus('idle');
      setModal('none');
      const levelId = authoritative.clientState.pendingResults?.levelId ?? levelResults?.levelId;
      if (!levelId) {
        setPhase('home');
        return true;
      }
      await loadResults(levelId);
      return true;
    } catch {
      return false;
    }
  }

  async function claimReward(body: ClaimRewardRequest) {
    const pendingReward = availablePendingReward(clientState);
    if (
      !pendingReward ||
      pendingReward.rewardType !== RewardSummaryRewardTypeEnum.Regular ||
      !clientState
    ) return;
    cancelScheduledRewardOpen();
    setRewardStatus('loading');
    try {
      const response = await api.claimReward(pendingReward.rewardId, body);
      const nextState: ClientStateResponse = {
        ...clientState,
        clientState: {
          ...clientState.clientState,
          clientView: {
            ...clientState.clientState.clientView,
            balance: response.claimResult.balance,
          },
          rewards: clientState.clientState.rewards.filter(
            (candidate) => candidate.rewardId !== response.rewardId,
          ),
          pendingReward: undefined,
          nextAction: response.nextAction,
        },
      };
      if (response.claimResult.decoration) {
        setCatalog((current) =>
          current
            ? {
                ...current,
                items: current.items.map((appearance) =>
                  appearance.appearanceId === response.claimResult.decoration?.appearanceId
                    ? { ...appearance, isOwned: true }
                    : appearance,
                ),
              }
            : current,
        );
      }
      clientStateRef.current = nextState;
      setClientState(nextState);
      setRewardStatus('success');
      await reloadClientStateAfterRegularClaim(nextState, pendingReward.rewardId, response.nextAction);
    } catch (error) {
      if (await recoverResultsAcknowledgement(error)) return;
      setRewardStatus('error');
    }
  }

  async function claimChapterGoldenReward(body: ClaimRewardRequest) {
    const chapterReward = levelResults?.reward;
    if (
      !clientState
      || !chapterReward
      || levelResults.completionKind !== 'chapter'
      || chapterReward.rewardType !== RewardSummaryRewardTypeEnum.ChapterGolden
      || rewardStatus === 'loading'
    ) return;

    setRewardStatus('loading');
    try {
      const response = await api.claimReward(chapterReward.rewardId, body);
      const nextState: ClientStateResponse = {
        ...clientState,
        clientState: {
          ...clientState.clientState,
          clientView: {
            ...clientState.clientState.clientView,
            balance: response.claimResult.balance,
          },
          pendingResults: undefined,
          rewards: clientState.clientState.rewards.filter(
            (candidate) => candidate.rewardId !== response.rewardId,
          ),
          nextAction: response.nextAction,
        },
      };
      clientStateRef.current = nextState;
      setClientState(nextState);
      setRewardStatus('success');
      setModal('none');
      setLevelResults(null);
      setResultsStatus('idle');
      await routeNextAction(
        response.nextAction,
        nextState,
        undefined,
        levelResults.chapter.chapterId,
      );
    } catch (error) {
      if (await recoverResultsAcknowledgement(error)) return;
      setRewardStatus('error');
    }
  }

  async function claimPendingGoldenReward(body: ClaimRewardRequest) {
    const pendingReward = availablePendingReward(clientState);
    if (
      !clientState ||
      !pendingReward ||
      pendingReward.rewardType !== RewardSummaryRewardTypeEnum.ChapterGolden ||
      rewardStatus === 'loading'
    ) return;

    setRewardStatus('loading');
    try {
      const response = await api.claimReward(pendingReward.rewardId, body);
      const nextState: ClientStateResponse = {
        ...clientState,
        clientState: {
          ...clientState.clientState,
          clientView: {
            ...clientState.clientState.clientView,
            balance: response.claimResult.balance,
          },
          rewards: clientState.clientState.rewards.filter(
            (candidate) => candidate.rewardId !== response.rewardId,
          ),
          pendingReward: undefined,
          nextAction: response.nextAction,
        },
      };
      if (response.claimResult.decoration) {
        setCatalog((current) =>
          current
            ? {
                ...current,
                items: current.items.map((appearance) =>
                  appearance.appearanceId === response.claimResult.decoration?.appearanceId
                    ? { ...appearance, isOwned: true }
                    : appearance,
                ),
              }
            : current,
        );
      }
      clientStateRef.current = nextState;
      setClientState(nextState);
      setRewardStatus('success');
      await routeNextAction(response.nextAction, nextState);
    } catch (error) {
      if (await recoverResultsAcknowledgement(error)) return;
      setRewardStatus('error');
    }
  }

  async function handleGameHint() {
    if (!levelPlay || hintStatus === 'loading' || gameCompleted) return;
    setHintStatus('loading');
    clearGameNotice();
    try {
      const response = await api.useHint(levelPlay.levelId);
      setLevelPlay((current) =>
        current && current.levelId === levelPlay.levelId
          ? {
              ...current,
              hintState: response.completedTarget
                ? undefined
                : {
                    targetId: response.hintTarget.targetId,
                    revealedCells: response.hintTarget.revealedCells,
                  },
              foundTargets: response.foundTargets,
              targetsRemaining: response.targetsRemaining,
              nextAction: response.nextAction,
            }
          : current,
      );
      setClientState((current) =>
        current
          ? {
              ...current,
              clientState: {
                ...current.clientState,
                clientView: {
                  ...current.clientState.clientView,
                  balance: {
                    hintBalance: response.hintBalance,
                    knowledgePoints: response.knowledgePoints,
                  },
                },
                rewards: response.rewardOpened
                  ? [
                      ...current.clientState.rewards.filter(
                        (rewardItem) => rewardItem.rewardId !== response.rewardOpened?.rewardId,
                      ),
                      response.rewardOpened,
                    ]
                  : current.clientState.rewards,
                nextAction: response.nextAction,
              },
            }
          : current,
      );
      setGameCompleted(response.levelCompleted);
      setGameRewardOpened(Boolean(response.rewardOpened));
      const hintNotice: GameNotice = response.levelCompleted
        ? { tone: 'success', text: 'Уровень завершён' }
        : response.completedTarget
          ? {
              tone: 'success',
              text: `${response.completedTarget.word} · +1 знание`,
            }
          : response.hintBalance === 1
            ? { tone: 'info', text: 'Осталась последняя подсказка' }
            : { tone: 'info', text: 'Первая буква слова открыта' };
      showGameNotice(hintNotice);
      setHintStatus('success');
      if (response.levelCompleted) {
        void loadResults(levelPlay.levelId);
      }
    } catch (error) {
      const type =
        typeof error === 'object' && error !== null && 'type' in error
          ? error.type
          : undefined;
      showGameNotice({
        tone: 'error',
        text: type === 'HINTS_EXHAUSTED'
          ? 'Подсказки закончились'
          : 'Не удалось использовать подсказку',
      });
      setHintStatus('error');
    }
  }

  function clearSubmitTimers() {
    if (submitDelayTimerRef.current !== null) {
      window.clearTimeout(submitDelayTimerRef.current);
      submitDelayTimerRef.current = null;
    }
    if (submitTimeoutTimerRef.current !== null) {
      window.clearTimeout(submitTimeoutTimerRef.current);
      submitTimeoutTimerRef.current = null;
    }
  }

  function holdRouteOutcome(
    generation: number,
    state: RouteAccentState,
    delayMs: number,
  ) {
    setRouteHold(true);
    setRouteState(state);
    submitHoldTimerRef.current = window.setTimeout(() => {
      if (submitGenerationRef.current === generation) {
        setRouteHold(false);
        setRouteState(undefined);
      }
    }, delayMs);
  }

  function applySubmitOutcome(
    response: RouteSubmissionResponse,
    generation: number,
  ) {
    const result = response.result;

    if (result === RouteSubmissionResponseResultEnum3.Invalid) {
      setSubmitLoading(false);
      setSubmitPending(false);
      showGameNotice({
        tone: 'error',
        text: response.outcomeCode === RouteSubmissionResponseOutcomeCodeEnum.TARGET_NONCANONICAL_PATH
          ? 'Собери слово по-другому'
          : 'Это слово не загадано',
      });
      holdRouteOutcome(generation, 'invalid', 250);
      return;
    }

    if (result === RouteSubmissionResponseResultEnum3.Repeated) {
      setSubmitLoading(false);
      setSubmitPending(false);
      showGameNotice({ tone: 'info', text: 'Это бонусное слово уже найдено' });
      holdRouteOutcome(generation, 'repeated', 420);
      return;
    }

    const isTarget = Boolean(response.isTarget);

    setLevelPlay((current) => {
      if (!current) return current;
      const foundTargets = mergeByWord(current.foundTargets, response.newFoundTargets ?? []);
      const clearsActiveHint = Boolean(
        current.hintState &&
        foundTargets.some((target) => target.targetId === current.hintState?.targetId),
      );
      return {
        ...current,
        ...(clearsActiveHint ? { hintState: undefined } : {}),
        foundTargets,
        bonusWords: mergeByWord(current.bonusWords, response.newBonusWords ?? []),
        ...(response.targetsRemaining !== undefined
          ? { targetsRemaining: response.targetsRemaining }
          : {}),
        nextAction: response.nextAction,
      };
    });

    setClientState((current) => {
      if (!current) return current;
      const regularReward = current.clientState.rewards.find(
        (reward) =>
          reward.rewardType === RewardSummaryRewardTypeEnum.Regular &&
          reward.status === 'collecting',
      );
      const rewards = response.rewardOpened
        ? [
            ...current.clientState.rewards.filter(
              (reward) => reward.rewardId !== response.rewardOpened?.rewardId,
            ),
            response.rewardOpened,
          ]
        : response.rewardProgress !== undefined && regularReward?.progress
          ? current.clientState.rewards.map((reward) =>
              reward.rewardId === regularReward.rewardId
                ? {
                    ...reward,
                    progress: {
                      ...reward.progress,
                      current: response.rewardProgress!,
                    },
                  }
                : reward,
            )
          : current.clientState.rewards;
      const nextState: ClientStateResponse = {
        ...current,
        clientState: {
          ...current.clientState,
          clientView: {
            ...current.clientState.clientView,
            ...(response.knowledgePoints !== undefined ||
            response.hintBalance !== undefined
              ? {
                  balance: {
                    hintBalance:
                      response.hintBalance ??
                      current.clientState.clientView.balance.hintBalance,
                    knowledgePoints:
                      response.knowledgePoints ??
                      current.clientState.clientView.balance.knowledgePoints,
                  },
                }
              : {}),
          },
          rewards,
          ...(response.rewardOpened
            ? { pendingReward: { rewardId: response.rewardOpened.rewardId } }
            : {}),
          nextAction: response.nextAction,
        },
      };
      clientStateRef.current = nextState;
      return nextState;
    });

    setGameCompleted(response.levelCompleted);
    setSubmitLoading(false);
    setSubmitPending(false);

    if (isTarget) {
      setRouteHold(false);
      setRouteState(undefined);
      showGameNotice({ tone: 'success', text: '+1 знание' });
    } else {
      const word = response.newBonusWords?.[0]?.word ?? '';
      showGameNotice({ tone: 'success', text: `${word} · бонусное слово` });
      holdRouteOutcome(generation, 'bonus', 420);
      if (response.rewardOpened) scheduleRewardOpen(response.rewardOpened.rewardId);
    }

    if (response.levelCompleted && levelPlay) {
      void loadResults(levelPlay.levelId);
    }
  }

  async function handleRouteSubmit(path: CellId[]) {
    if (!levelPlay || gameCompleted || submitPending) return;
    if (path.length < 2) return;

    let route: CellRef[];
    try {
      route = cellIdsToRoute(path, levelPlay.board.size);
    } catch {
      return;
    }

    const generation = submitGenerationRef.current + 1;
    submitGenerationRef.current = generation;
    const controller = new AbortController();
    submitControllerRef.current = controller;

    setSubmitPending(true);
    setSubmitLoading(false);
    clearGameNotice();
    setRouteHold(true);
    setRouteState('pending');
    if (submitHoldTimerRef.current !== null) {
      window.clearTimeout(submitHoldTimerRef.current);
      submitHoldTimerRef.current = null;
    }

    submitDelayTimerRef.current = window.setTimeout(() => {
      if (submitGenerationRef.current === generation) {
        setSubmitLoading(true);
      }
    }, 250);

    const timeoutPromise = new Promise<never>((_, reject) => {
      submitTimeoutTimerRef.current = window.setTimeout(() => {
        controller.abort();
        reject(new Error('SUBMIT_TIMEOUT'));
      }, timeoutMs);
    });

    try {
      const response = await Promise.race([
        api.submitRoute(levelPlay.levelId, route, controller.signal),
        timeoutPromise,
      ]);
      if (submitGenerationRef.current !== generation) return;
      clearSubmitTimers();
      submitControllerRef.current = null;
      applySubmitOutcome(response, generation);
    } catch {
      if (submitGenerationRef.current !== generation) return;
      clearSubmitTimers();
      submitControllerRef.current = null;
      setSubmitLoading(false);
      setSubmitPending(false);
      setRouteHold(false);
      setRouteState(undefined);
      showGameNotice({ tone: 'error', text: 'Не удалось отправить слово' });
    }
  }

  const gameSurface = game ?? (
    levelPlay && clientState ? (
      <GameScreen
        level={levelPlay}
        balance={clientState.clientState.clientView.balance}
        bonusProgress={bonusProgress}
        hintPending={hintStatus === 'loading'}
        inputDisabled={gameCompleted || submitPending}
        notice={gameNotice}
        rewardOpened={gameRewardOpened}
        submitLoading={submitLoading}
        retainSelection={routeHold}
        routeState={routeState}
        onBack={() => setModal('exit')}
        onDismissNotice={clearGameNotice}
        onHint={() => void handleGameHint()}
        onOpenBonusWords={() => setModal('bonus-words')}
        onOpenTarget={(target) => openFoundTarget(target, 'game', levelPlay.levelNumber)}
        onSelectionEnd={handleRouteSubmit}
      />
    ) : null
  );
  const hasPendingResults = Boolean(clientState?.clientState.pendingResults);
  const hasResultsSurface = resultsStatus !== 'idle' || levelResults !== null;
  const showResults = phase === 'results' || (phase === 'home' && (hasPendingResults || hasResultsSurface));
  const showHome = phase === 'home' && clientState && !hasPendingResults && !hasResultsSurface;
  const narrativeChapter = clientState?.clientState.chapters.find(
    (chapter) => chapter.status === 'in_progress' || chapter.status === 'available',
  ) ?? clientState?.clientState.chapters[0];
  const isModalOpen = modal !== 'none';

  useFinwordsAudio(phase, settings ?? null);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const advanceTime = (ms: number) => {
      window.dispatchEvent(new CustomEvent('finwords:advance-time', { detail: ms }));
    };
    const renderGameToText = () => JSON.stringify({
      coordinateSystem:
        'Grid cells use 1-based row:column coordinates; origin is top-left, rows increase downward, columns increase rightward.',
      phase,
      modal,
      levelId: levelPlay?.levelId ?? resultsLevelId,
      levelNumber: levelPlay?.levelNumber ?? null,
      grid: phase === 'game'
        ? levelPlay?.board
        : phase === 'field-review'
          ? levelResults?.board
          : undefined,
      foundTargets: (levelPlay?.foundTargets ?? levelResults?.foundTargets ?? []).map((target) => ({
        targetId: target.targetId,
        word: target.word,
        cells: target.cells,
      })),
      bonusWords: (levelPlay?.bonusWords ?? levelResults?.bonusWords ?? []).map((word) => word.word),
      knowledge: clientState?.clientState.clientView.balance.knowledgePoints ?? 0,
      hints: clientState?.clientState.clientView.balance.hintBalance ?? 0,
      completedLevels: clientState?.clientState.levels
        .filter((level) => level.status === 'completed')
        .map((level) => level.levelId) ?? [],
      nextAction: clientState?.clientState.nextAction ?? null,
      selectedCharacterId: clientState?.clientState.clientView.selectedCharacterId ?? null,
      selectedBackgroundId: clientState?.clientState.clientView.selectedBackgroundId ?? null,
      notice: gameNotice?.text ?? null,
    });

    window.advanceTime = advanceTime;
    window.render_game_to_text = renderGameToText;
    return () => {
      if (window.advanceTime === advanceTime) delete window.advanceTime;
      if (window.render_game_to_text === renderGameToText) delete window.render_game_to_text;
    };
  }, [clientState, gameNotice, levelPlay, levelResults, modal, phase, resultsLevelId]);

  useLayoutEffect(() => {
    [gameBoundaryRef, resultsBoundaryRef, fieldReviewBoundaryRef].forEach((boundaryRef) => {
      boundaryRef.current?.firstElementChild?.toggleAttribute('inert', isModalOpen);
    });
  }, [isModalOpen, phase, showResults]);

  return (
    <div className={styles.root} data-phase={phase}>
      {phase === 'loading' ? <LoadingScreen state={loadingState} /> : null}
      {phase === 'error' ? <ErrorScreen onRefresh={() => void load()} /> : null}
      {showHome ? (
        <Home
          state={clientState}
          entryStatus={entryStatus}
          isInert={isModalOpen}
          pendingReward={reward}
          onSettings={() => {
            setSettingsStatus('idle');
            setModal('settings');
          }}
          onAppearance={openAppearance}
          onPrimary={() => {
            if (
              clientState.clientState.clientView.campaignProgress.isCompleted
              && clientState.clientState.clientView.campaignProgress.isCompletionShown
            ) {
              void openCampaignComplete(clientState, 'replay').catch(() => setEntryStatus('error'));
              return;
            }
            beginLevelFlow(clientState);
          }}
          onClaimReward={() => {
            setRewardStatus('idle');
            setModal('reward');
          }}
          onClose={() => setModal('exit')}
        />
      ) : null}
      {phase === 'tutorial' ? (
        <TutorialScreen
          mode={tutorialMode}
          onComplete={() => {
            if (tutorialMode === 'replay') {
              setPhase('home');
              setModal('settings');
              return;
            }
            tutorialAcknowledgedRef.current = true;
            setNarrativeStatus('idle');
            setPhase('narrative');
          }}
          onExit={() => {
            setPhase('home');
            setModal('settings');
          }}
        />
      ) : null}
      {phase === 'narrative' && narrativeChapter ? (
        <NarrativeScreen
          chapterTitle={narrativeChapter.title}
          narrativeText={narrativeChapter.narrativeText ?? ''}
          status={narrativeStatus}
          onContinue={() => void confirmNarrativeAndEnter()}
          onRetry={() => void confirmNarrativeAndEnter()}
        />
      ) : null}
      {phase === 'appearance' ? (
        <AppearanceScreen
          catalog={catalog}
          status={catalogStatus}
          onBack={() => setPhase('home')}
          onRetry={openAppearance}
          onSelect={(appearanceId) => void selectAppearance(appearanceId)}
        />
      ) : null}
      {phase === 'next-chapter-unavailable' ? <LifecycleTerminal /> : null}
      {phase === 'campaign-complete' && clientState && catalog ? (
        <CampaignCompleteScreen
          state={clientState}
          catalog={catalog}
          onHome={() => {
            setCampaignCompleteMode(null);
            setPhase('home');
          }}
        />
      ) : null}
      {phase === 'game' ? <div ref={gameBoundaryRef}>{gameSurface}</div> : null}
      {showResults ? (
        <div ref={resultsBoundaryRef}>
          <ResultsScreen
            levelLabel={resultsLevelLabel}
            results={levelResults}
            showLoader={resultsLoadingVisible}
            status={resultsStatus === 'error' ? 'error' : resultsStatus === 'success' ? 'success' : 'loading'}
            onBack={() => {
              if (levelResults) void acknowledgeResults('home');
              else setPhase('home');
            }}
            onPrimary={() => void acknowledgeResults('next')}
            onRetry={() => {
              if (resultsLevelId) void loadResults(resultsLevelId);
            }}
            onShowField={() => {
              if (modal === 'reward') return;
              setModal('none');
              setPhase('field-review');
            }}
            onOpenTarget={(target) => {
              openFoundTarget(target, 'results_card', resultsLevelNumber);
            }}
            onClaimReward={
              chapterGoldenReward
                ? () => {
                    rememberRewardTrigger();
                    void acknowledgeResults('reward');
                  }
                : undefined
            }
            rewardSelectionOpen={modal === 'reward' && Boolean(chapterGoldenReward)}
            rewardPrimaryRef={chapterGoldenReward ? rewardPrimaryRef : undefined}
            actionPending={ackStatus === 'loading'}
            actionError={ackStatus === 'error'}
            onRetryAction={() => {
              const intent = ackIntentRef.current;
              if (intent) void acknowledgeResults(intent);
            }}
          />
        </div>
      ) : null}
      {phase === 'field-review' && levelResults ? (
        <div ref={fieldReviewBoundaryRef}>
          <FieldReviewScreen
            levelLabel={resultsLevelLabel}
            results={levelResults}
            onHide={() => setPhase('results')}
            onOpenTarget={(target) => {
              openFoundTarget(target, 'results_field', resultsLevelNumber);
            }}
            onPrimary={() => void acknowledgeResults(chapterGoldenReward ? 'reward' : 'next')}
            primaryLabel={chapterGoldenReward ? 'Забрать награду' : 'Следующий уровень'}
            actionPending={ackStatus === 'loading'}
          />
        </div>
      ) : null}

      {(modal === 'settings' || (modal === 'feedback' && feedbackContext.source === 'settings')) && settings ? (
        <SettingsModal
          settings={settings}
          status={settingsStatus}
          active={modal === 'settings'}
          isInert={modal === 'feedback'}
          onClose={() => setModal('none')}
          onChange={(body) => void updateSettings(body)}
          onTutorial={() => {
            setTutorialMode('replay');
            setModal('none');
            setPhase('tutorial');
          }}
          onFeedback={() => {
            setFeedbackContext({ source: 'settings' });
            setFeedbackNextAction(null);
            setFeedbackStatus('idle');
            setModal('feedback');
          }}
        />
      ) : null}
      {modal === 'feedback' ? (
        <FeedbackModal
          status={feedbackStatus}
          context={feedbackContext}
          onClose={() => void closeFeedback()}
          onSubmit={(body) => void submitFeedback(body)}
        />
      ) : null}
      {modal === 'reward' && chapterGoldenReward ? (
        <GoldenRewardModal
          options={chapterGoldenReward.options ?? []}
          status={rewardStatus}
          onClaim={(body) => void claimChapterGoldenReward(body)}
          onShowField={() => {
            setModal('none');
            setPhase('field-review');
          }}
          onClose={() => {
            setModal('none');
            restoreRewardTriggerFocus();
          }}
        />
      ) : modal === 'reward' && pendingGoldenReward ? (
        <GoldenRewardModal
          options={pendingGoldenReward.options ?? []}
          status={rewardStatus}
          onClaim={(body) => void claimPendingGoldenReward(body)}
          onClose={() => setModal('none')}
        />
      ) : modal === 'reward' && modalReward ? (
        <RewardModal reward={modalReward} status={rewardStatus} onClaim={(body) => void claimReward(body)} />
      ) : null}
      {modal === 'exit' ? (
        <ExitConfirmModal
          onClose={() => setModal('none')}
          onExit={
            phase === 'game'
              ? () => {
                  setModal('none');
                  submitGenerationRef.current += 1;
                  if (submitControllerRef.current) {
                    submitControllerRef.current.abort();
                    submitControllerRef.current = null;
                  }
                  if (submitHoldTimerRef.current !== null) {
                    window.clearTimeout(submitHoldTimerRef.current);
                    submitHoldTimerRef.current = null;
                  }
                  if (submitDelayTimerRef.current !== null) {
                    window.clearTimeout(submitDelayTimerRef.current);
                    submitDelayTimerRef.current = null;
                  }
                  if (submitTimeoutTimerRef.current !== null) {
                    window.clearTimeout(submitTimeoutTimerRef.current);
                    submitTimeoutTimerRef.current = null;
                  }
                  setSubmitPending(false);
                  setSubmitLoading(false);
                  setRouteHold(false);
                  setRouteState(undefined);
                  clearGameNotice();
                  if (levelPlay) {
                    setClientState((current) =>
                      current
                        ? {
                            ...current,
                            clientState: {
                              ...current.clientState,
                              inProgressLevel: {
                                levelId: levelPlay.levelId,
                                levelVersionId: levelPlay.levelVersionId,
                                startedAt: levelPlay.startedAt,
                              },
                            },
                          }
                        : current,
                    );
                  }
                  setPhase('home');
                }
              : undefined
          }
        />
      ) : null}
      {modal === 'word-definition' && targetModalContext ? (
        <WordDefinitionModal target={targetModalContext.target} onClose={() => setModal('none')} />
      ) : null}
      {modal === 'course-error' && targetModalContext ? (
        <CourseErrorModal
          target={targetModalContext.target}
          destination={targetModalContext.destination}
          offerTitle={targetModalContext.offerTitle}
          onClose={() => setModal('none')}
          onReturnToField={() => {
            setModal('none');
            if (targetModalContext.source === 'results_card') setPhase('field-review');
          }}
        />
      ) : null}
      {modal === 'bonus-words' && levelPlay ? (
        <BonusWordsModal
          words={levelPlay.bonusWords}
          progress={bonusProgress}
          onClose={() => setModal('none')}
        />
      ) : null}

      {knowledge && phase !== 'home' && phase !== 'game' ? (
        <span
          className={styles.srOnly}
          aria-label={`Знания: ${knowledge.knowledgePoints}`}
        >
          {knowledge.knowledgePoints}
        </span>
      ) : null}
    </div>
  );
}
