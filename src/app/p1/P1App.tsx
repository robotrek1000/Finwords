import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CellId, LevelId } from '../../app/types';
import type {
  AppearanceCatalogResponse,
  BonusWord,
  CellRef,
  ClaimRewardRequest,
  ClientStateResponse,
  FoundTarget,
  LevelPlayResponse,
  LevelResultsResponse,
  RewardOption,
  NextAction,
  RewardSummary,
  RouteSubmissionResponse,
  SettingsResponse,
  SubmitFeedbackRequest,
  UpdateSettingsRequest,
} from '../../shared/demoTypes';
import {
  RouteSubmissionResponseResultEnum3,
  RouteSubmissionResponseOutcomeCodeEnum,
  RewardOptionOptionTypeEnum,
  RewardSummaryRewardTypeEnum,
} from '../../shared/demoTypes';
import { BackgroundSurface } from '../../shared/ui/BackgroundSurface';
import { assetUrl } from '../../shared/assetUrl';
import type { BackgroundId } from '../../shared/ui/PatternTile';
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
import { type RouteAccentState } from '../../features/game/BoardViewGameBoard';
import { resolveTargetPresentation } from '../../features/game/targetPresentation';
import styles from './P1App.module.css';
import { useModalFocusBoundary } from './useModalFocusBoundary';

type Phase = 'loading' | 'error' | 'home' | 'appearance' | 'game' | 'results' | 'field-review';
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

export interface P1AppProps {
  api?: P1Api;
  game?: ReactNode;
  minimumLoadingMs?: number;
  timeoutMs?: number;
}

const wait = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

const appearanceBackgrounds: BackgroundId[] = [
  'background-default',
  'background-cabin',
  'background-port',
  'background-open-sea',
  'background-business-harbor',
  'background-bridge',
  'background-golden-bay',
  'background-night-ocean',
  'background-freedom-horizon',
];

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

function LoadingScreen({ state }: { state: LoadingProgressState }) {
  return (
    <section className={styles.systemScreen} aria-label="Загрузка игры">
      <BackgroundSurface />
      <h1 className={styles.loadingLogo}>ФИНВОРДЫ</h1>
      <div className={styles.loadingArt}>
        <img src={assetUrl('assets/p1/loading-scene.png')} alt="" />
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
        <img src={assetUrl('assets/p1/error-worker.png')} alt="" />
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
  const envelopeProgress = regularRewardProgress(state);
  const envelopeCurrent = envelopeProgress?.current;
  const envelopeThreshold = envelopeProgress?.threshold;
  const hasEnvelopeProgress = envelopeCurrent !== undefined
    && envelopeThreshold !== undefined
    && envelopeThreshold > 0;
  const defaultLevelNumber = Math.min(
    (currentChapter?.completedLevels ?? 0) + 1,
    currentChapter?.totalLevels ?? 1,
  );
  const primaryLabel = client.inProgressLevel
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
        <img src={assetUrl('assets/p1/knowledge-badge.png')} alt="" />
        <strong>{client.clientView.balance.knowledgePoints}</strong>
      </div>

      <div className={styles.chapterViewport} aria-label="Главы">
        <div className={styles.chapterRail} ref={railRef}>
          {client.chapters.map((chapter, index) => {
            const current = chapter.chapterId === currentChapter?.chapterId;
            const completed = chapter.status === 'completed';
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
                  {current ? <img className={styles.chapterRing} src={assetUrl('assets/p1/chapter-ring.svg')} alt="" /> : null}
                  <img
                    className={styles.chapterImage}
                    src={assetUrl(`assets/p1/chapter-${String(index + 1).padStart(2, '0')}.png`)}
                    alt=""
                  />
                  {current ? (
                    <strong className={styles.chapterProgress}>
                      {chapter.completedLevels}/{chapter.totalLevels}
                    </strong>
                  ) : null}
                </span>
                <h2>{chapter.title}</h2>
                {!current ? <small>{chapter.completedLevels}/{chapter.totalLevels}</small> : null}
                {completed ? <span className={styles.chapterComplete} aria-hidden="true">✓</span> : null}
              </article>
            );
          })}
        </div>
      </div>

      <article className={styles.envelopeCard}>
        <img src={assetUrl('assets/p1/home-envelope.png')} alt="" />
        <div>
          <strong>Бонусный конверт</strong>
          {hasEnvelopeProgress ? (
            <>
              <span className={styles.envelopeTrack}>
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

interface SettingsModalProps {
  settings: SettingsResponse;
  status: AsyncStatus;
  active: boolean;
  isInert: boolean;
  onClose: () => void;
  onChange: (body: UpdateSettingsRequest) => void;
  onFeedback: () => void;
}

function SettingsModal({
  settings,
  status,
  active,
  isInert,
  onClose,
  onChange,
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
        <Button variant="secondary" onClick={onFeedback}>Оценить игру</Button>
      </section>
    </div>
  );
}

interface FeedbackModalProps {
  status: AsyncStatus;
  onClose: () => void;
  onSubmit: (body: SubmitFeedbackRequest) => void;
}

function FeedbackModal({ status, onClose, onSubmit }: FeedbackModalProps) {
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
              source: 'settings',
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
        <span className={styles.sheetHandle} aria-hidden="true" />
        <header className={styles.sheetHeader}>
          <span />
          <h2 id="p1-word-definition-dialog-title">{target.word}</h2>
          <IconButton icon="close" label="Закрыть определение" depth="flat" onClick={onClose} />
        </header>
        <p>{target.definition}</p>
        {target.courseOffer ? (
          <article className={styles.courseOfferCard}>
            <span>{target.courseOffer.badgeLabel}</span>
            <strong>{target.courseOffer.title}</strong>
          </article>
        ) : null}
        <Button autoFocus onClick={onClose}>Понятно</Button>
      </section>
    </div>
  );
}

function CourseErrorModal({
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
        aria-labelledby="p1-course-error-dialog-title"
        tabIndex={-1}
      >
        <span className={styles.sheetHandle} aria-hidden="true" />
        <header className={styles.sheetHeader}>
          <span />
          <h2 id="p1-course-error-dialog-title">{target.word}</h2>
          <IconButton icon="close" label="Закрыть определение" depth="flat" onClick={onClose} />
        </header>
        <p>{target.definition}</p>
        <article className={styles.courseOfferCard}>
          <span>Мини-курс</span>
          <strong>Курс «Как работают акции»</strong>
        </article>
        <p>Не удалось открыть страницу. Попробуйте ещё раз.</p>
        <p>Прогресс уровня сохранён</p>
        <Button disabled>Повторить</Button>
        <Button autoFocus onClick={onClose}>Вернуться к полю</Button>
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
            <img src={assetUrl('assets/p1/home-envelope.png')} alt="" />
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
  return (
    <section className={styles.appearanceScreen} aria-label="Облики">
      <BackgroundSurface />
      <header className={styles.appearanceHeader}>
        <IconButton icon="back" label="Назад" variant="ghost" onClick={onBack} />
        <h1>Облики</h1>
        <span />
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
      {status === 'loading' ? <p className={styles.catalogState}>Загружаем облики…</p> : null}
      {status === 'error' ? (
        <div className={styles.catalogState}>
          <p>Не удалось загрузить облики</p>
          <Button onClick={onRetry}>Повторить</Button>
        </div>
      ) : null}
      {status === 'success' && items.length === 0 ? (
        <p className={styles.catalogState}>В этой категории пока нет обликов</p>
      ) : null}
      {status === 'success' && items.length > 0 ? (
        <div className={styles.appearanceGrid}>
          {items.map((appearance, index) => (
            <button
              type="button"
              key={appearance.appearanceId}
              aria-label={appearance.title}
              aria-pressed={appearance.isSelected}
              disabled={!appearance.isOwned}
              className={appearance.isSelected ? styles.appearanceSelected : ''}
              onClick={() => onSelect(appearance.appearanceId)}
            >
              <span className={styles.appearancePreview}>
                {appearance.type === 'background' ? (
                  <BackgroundSurface
                    backgroundId={appearanceBackgrounds[index] ?? 'background-default'}
                    className={styles.backgroundPreview}
                  />
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
  const [rewardStatus, setRewardStatus] = useState<AsyncStatus>('idle');
  const [catalogStatus, setCatalogStatus] = useState<AsyncStatus>('idle');
  const [catalog, setCatalog] = useState<AppearanceCatalogResponse | null>(null);
  const [entryStatus, setEntryStatus] = useState<AsyncStatus>('idle');
  const [hintStatus, setHintStatus] = useState<AsyncStatus>('idle');
  const [levelPlay, setLevelPlay] = useState<LevelPlayResponse | null>(null);
  const [gameNotice, setGameNotice] = useState<GameNotice | undefined>();
  const [gameCompleted, setGameCompleted] = useState(false);
  const [gameRewardOpened, setGameRewardOpened] = useState(false);
  const clientStateRef = useRef<ClientStateResponse | null>(null);
  const phaseRef = useRef<Phase>('loading');
  const modalRef = useRef<Modal>('none');
  const rewardOpenTimerRef = useRef<{ rewardId: string; timer: number } | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<FoundTarget | null>(null);
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
        rewardOpenTimerRef.current = null;
        if (
          phaseRef.current === 'game' &&
          pendingReward?.rewardId === rewardId &&
          pendingReward.rewardType === RewardSummaryRewardTypeEnum.Regular
        ) {
          if (modalRef.current !== 'none') {
            scheduleRewardOpen(rewardId);
            return;
          }
          setRewardStatus('idle');
          setModal('reward');
        }
      }, 500),
    };
  }

  const enterGame = useCallback(async (
    state: ClientStateResponse,
    signal?: AbortSignal,
  ) => {
    setEntryStatus('loading');
    setGameNotice(undefined);
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
  }, [api]);

  const routeNextAction = useCallback(async (
    nextAction: NextAction,
    state: ClientStateResponse,
    signal?: AbortSignal,
  ) => {
    if (nextAction === 'play') {
      await enterGame(state, signal);
      return;
    }
    setEntryStatus('idle');
    setPhase('home');
    setModal(
      nextAction === 'claim_reward' &&
      availablePendingReward(state)?.rewardType === RewardSummaryRewardTypeEnum.Regular
        ? 'reward'
        : 'none',
    );
  }, [enterGame]);

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
  }, [api, clearResultsTimers, invalidateAcknowledge, timeoutMs]);

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
    modalRef.current = modal;
  }, [clientState, modal, phase]);

  useEffect(() => {
    const startTimer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(startTimer);
      generationRef.current += 1;
      controllerRef.current?.abort();
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
      cancelScheduledRewardOpen();
      clearResultsTimers();
    },
    [clearResultsTimers],
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
  const resultsLevelLabel = !levelResults
    ? 'уровня'
    : levelResults.completionKind === 'chapter'
      ? 'уровня'
      : `уровня ${levelResults.chapter.completedLevels}`;
  const chapterGoldenReward =
    levelResults?.completionKind === 'chapter'
    && levelResults.reward?.rewardType === RewardSummaryRewardTypeEnum.ChapterGolden
    && levelResults.reward.status === 'available'
      ? levelResults.reward
      : undefined;

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
        await enterGame(nextState).catch(() => undefined);
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
      await api.submitFeedback(body);
      setFeedbackStatus('success');
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
    } catch {
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
      setClientState(nextState);
      setRewardStatus('success');
      setModal('none');
      setLevelResults(null);
      setResultsStatus('idle');
      await routeNextAction(response.nextAction, nextState);
    } catch {
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
    } catch {
      setRewardStatus('error');
    }
  }

  async function handleGameHint() {
    if (!levelPlay || hintStatus === 'loading' || gameCompleted) return;
    setHintStatus('loading');
    setGameNotice(undefined);
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
      setGameNotice(hintNotice);
      setHintStatus('success');
      if (response.levelCompleted) {
        void loadResults(levelPlay.levelId);
      }
    } catch (error) {
      const type =
        typeof error === 'object' && error !== null && 'type' in error
          ? error.type
          : undefined;
      setGameNotice({
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
      setGameNotice({
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
      setGameNotice({ tone: 'info', text: 'Это бонусное слово уже найдено' });
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
                      current: response.rewardProgress!,
                      threshold: regularReward.progress!.threshold,
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

    if (response.levelCompleted && levelPlay) {
      void loadResults(levelPlay.levelId);
    }

    if (isTarget) {
      setRouteHold(false);
      setRouteState(undefined);
      setGameNotice({ tone: 'success', text: '+1 знание' });
    } else {
      const word = response.newBonusWords?.[0]?.word ?? '';
      setGameNotice({ tone: 'success', text: `${word} · бонусное слово` });
      holdRouteOutcome(generation, 'bonus', 420);
      if (response.rewardOpened) scheduleRewardOpen(response.rewardOpened.rewardId);
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
    setGameNotice(undefined);
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
      setGameNotice({ tone: 'error', text: 'Не удалось отправить слово' });
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
        onHint={() => void handleGameHint()}
        onOpenBonusWords={() => setModal('bonus-words')}
        onOpenTarget={(target) => {
          setSelectedTarget(target);
          setModal(
            resolveTargetPresentation(levelPlay.levelNumber as LevelId, target.word).linked
              ? 'course-error'
              : 'word-definition',
          );
        }}
        onSelectionEnd={handleRouteSubmit}
      />
    ) : null
  );
  const hasPendingResults = Boolean(clientState?.clientState.pendingResults);
  const hasResultsSurface = resultsStatus !== 'idle' || levelResults !== null;
  const showResults = phase === 'results' || (phase === 'home' && (hasPendingResults || hasResultsSurface));
  const showHome = phase === 'home' && clientState && !hasPendingResults && !hasResultsSurface;
  const isModalOpen = modal !== 'none';

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
          onPrimary={() => void enterGame(clientState).catch(() => undefined)}
          onClaimReward={() => {
            setRewardStatus('idle');
            setModal('reward');
          }}
          onClose={() => setModal('exit')}
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
              setSelectedTarget(target);
              setModal('word-definition');
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
              setSelectedTarget(target);
              setModal('word-definition');
            }}
            onPrimary={() => void acknowledgeResults(chapterGoldenReward ? 'reward' : 'next')}
            primaryLabel={chapterGoldenReward ? 'Забрать награду' : 'Следующий уровень'}
            actionPending={ackStatus === 'loading'}
          />
        </div>
      ) : null}

      {(modal === 'settings' || modal === 'feedback') && settings ? (
        <SettingsModal
          settings={settings}
          status={settingsStatus}
          active={modal === 'settings'}
          isInert={modal === 'feedback'}
          onClose={() => setModal('none')}
          onChange={(body) => void updateSettings(body)}
          onFeedback={() => {
            setFeedbackStatus('idle');
            setModal('feedback');
          }}
        />
      ) : null}
      {modal === 'feedback' ? (
        <FeedbackModal
          status={feedbackStatus}
          onClose={() => setModal('settings')}
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
      {modal === 'word-definition' && selectedTarget ? (
        <WordDefinitionModal target={selectedTarget} onClose={() => setModal('none')} />
      ) : null}
      {modal === 'course-error' && selectedTarget ? (
        <CourseErrorModal target={selectedTarget} onClose={() => setModal('none')} />
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
