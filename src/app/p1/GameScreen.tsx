import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import type { CellId, LevelId } from '../../app/types';
import type {
  Balance,
  FoundTarget,
  LevelPlayResponse,
} from '../../infra/api/generated/data-contracts';
import { BackgroundSurface } from '../../shared/ui/BackgroundSurface';
import { IconButton } from '../../shared/ui/IconButton';
import {
  BoardViewGameBoard,
  type RouteAccentState,
} from '../../features/game/BoardViewGameBoard';
import styles from './GameScreen.module.css';

export interface GameNotice {
  text: string;
  tone: 'info' | 'success' | 'error';
}

interface GameScreenProps {
  balance: Balance;
  bonusProgress?: BonusProgress;
  hintPending: boolean;
  inputDisabled: boolean;
  level: LevelPlayResponse;
  notice?: GameNotice;
  rewardOpened: boolean;
  submitLoading?: boolean;
  retainSelection?: boolean;
  routeState?: RouteAccentState;
  onBack: () => void;
  onDismissNotice: () => void;
  onHint: () => void;
  onOpenBonusWords: () => void;
  onOpenTarget: (target: FoundTarget) => void;
  onSelectionEnd: (path: CellId[]) => void;
}

export interface BonusProgress {
  current: number;
  threshold: number;
}

const MENTOR_TIP_DURATION_MS = 3_200;
// Keep this boundary aligned with the separated status/selection layout in CSS.
const TALL_HUD_QUERY = '(min-height: 720px)';

function subscribeToHudLayout(onChange: () => void) {
  const query = window.matchMedia?.(TALL_HUD_QUERY);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

function isCompactHud() {
  return window.matchMedia ? !window.matchMedia(TALL_HUD_QUERY).matches : false;
}

function GameBanner({ notice }: { notice: GameNotice }) {
  const icon = notice.tone === 'success' ? '✓' : notice.tone === 'error' ? '×' : 'i';

  return (
    <div className={styles.notice} data-tone={notice.tone} role="status">
      <span className={styles.noticeIcon} aria-hidden="true">{icon}</span>
      <strong>{notice.text}</strong>
    </div>
  );
}

function SubmitLoader() {
  return (
    <div className={styles.notice} data-tone="loading" role="status" aria-label="Отправляем слово">
      <span className={styles.noticeSpinner} aria-hidden="true" />
      <strong>Отправляем слово</strong>
    </div>
  );
}

function MentorTip() {
  return (
    <div className={styles.mentorTip} role="status">
      <img src={`${import.meta.env.BASE_URL}assets/character-analyst.webp`} alt="" />
      <p>Подсказка ведёт по буквам одного слова по порядку.</p>
    </div>
  );
}

function KnowledgeBadge({ value }: { value: number }) {
  return (
    <div className={styles.knowledge} aria-label={`Знания: ${value}`}>
      <img src={`${import.meta.env.BASE_URL}assets/p1/knowledge-badge.png`} alt="" />
      <strong>{value}</strong>
    </div>
  );
}

function MentorHintButton({
  balance,
  disabled,
  pending,
  onClick,
  onPreviewChange,
}: {
  balance: number;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
  onPreviewChange: (visible: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={styles.hintButton}
      aria-label={pending ? 'Открываем подсказку' : 'Использовать подсказку'}
      disabled={disabled}
      data-hint-pending={pending || undefined}
      data-input-locked={(disabled && !pending) || undefined}
      onPointerEnter={() => onPreviewChange(true)}
      onPointerLeave={() => onPreviewChange(false)}
      onFocus={() => onPreviewChange(true)}
      onBlur={() => onPreviewChange(false)}
      onClick={onClick}
    >
      <img src={`${import.meta.env.BASE_URL}assets/character-analyst.webp`} alt="" />
      <strong aria-label={`Подсказок: ${balance}`}>{balance}</strong>
    </button>
  );
}

function BonusEnvelopeButton({
  progress,
  onClick,
}: {
  progress?: BonusProgress;
  onClick: () => void;
}) {
  const hasProgress = Boolean(progress && progress.threshold > 0);
  const current = hasProgress && progress
    ? Math.min(Math.max(progress.current, 0), progress.threshold)
    : undefined;
  const threshold = hasProgress ? progress?.threshold : undefined;
  const ringStyle = {
    '--bonus-progress': `${threshold && current !== undefined && threshold > 0 ? current / threshold : 0}turn`,
  } as CSSProperties;

  return (
    <button
      type="button"
      className={styles.bonusButton}
      aria-label={current === undefined ? 'Бонусные слова' : `Бонусные слова: ${current}`}
      onClick={onClick}
    >
      {current !== undefined && threshold !== undefined ? (
        <>
          <span
            className={styles.bonusRing}
            role="progressbar"
            aria-label="Прогресс бонусного конверта"
            aria-valuemin={0}
            aria-valuemax={threshold}
            aria-valuenow={current}
            style={ringStyle}
          >
            <img src={`${import.meta.env.BASE_URL}assets/p1/home-envelope.png`} alt="" />
          </span>
          <strong>{current}/{threshold}</strong>
        </>
      ) : (
        <img src={`${import.meta.env.BASE_URL}assets/p1/home-envelope.png`} alt="" />
      )}
    </button>
  );
}

function TargetStatus({ remaining, total }: { remaining: number; total: number }) {
  return (
    <div className={styles.targetStatus} aria-label={`Осталось слов: ${remaining} из ${total}`}>
      <span>Осталось</span>
      <strong>{remaining}/{total}</strong>
      <span>слов</span>
    </div>
  );
}

export function GameScreen({
  balance,
  bonusProgress,
  hintPending,
  inputDisabled,
  level,
  notice,
  rewardOpened,
  submitLoading = false,
  retainSelection = false,
  routeState,
  onBack,
  onDismissNotice,
  onHint,
  onOpenBonusWords,
  onOpenTarget,
  onSelectionEnd,
}: GameScreenProps) {
  const [currentWord, setCurrentWord] = useState('');
  const [selectionActive, setSelectionActive] = useState(false);
  const compactHud = useSyncExternalStore(subscribeToHudLayout, isCompactHud, () => false);
  const [mentorTipVisible, setMentorTipVisible] = useState(true);
  const mentorTipTimerRef = useRef<number | null>(null);
  const mentorTipGenerationRef = useRef(0);
  const hintDisabled = hintPending || inputDisabled;
  const targetTotal = level.targetsRemaining + level.foundTargets.length;
  // A retained submit/outcome route is not an active gesture and must not hide its result.
  const selectionOwnsStatus = compactHud && selectionActive && !inputDisabled;
  const visibleNotice = selectionOwnsStatus ? undefined : notice;
  const isMentorTipVisible = mentorTipVisible && !visibleNotice && !currentWord && !submitLoading;
  const statusKind = visibleNotice
    ? 'banner'
    : submitLoading
      ? 'banner'
      : isMentorTipVisible
        ? 'mentor'
        : 'none';

  useEffect(() => {
    // Covers a late notice or a transition into the compact layout mid-gesture.
    if (selectionOwnsStatus && notice) onDismissNotice();
  }, [notice, onDismissNotice, selectionOwnsStatus]);

  const clearMentorTipTimer = useCallback(() => {
    if (mentorTipTimerRef.current === null) return;
    window.clearTimeout(mentorTipTimerRef.current);
    mentorTipTimerRef.current = null;
  }, []);

  const showMentorTip = useCallback(() => {
    clearMentorTipTimer();
    const generation = mentorTipGenerationRef.current + 1;
    mentorTipGenerationRef.current = generation;
    setMentorTipVisible(true);
    mentorTipTimerRef.current = window.setTimeout(() => {
      if (mentorTipGenerationRef.current !== generation) return;
      mentorTipTimerRef.current = null;
      setMentorTipVisible(false);
    }, MENTOR_TIP_DURATION_MS);
  }, [clearMentorTipTimer]);

  const hideMentorTip = useCallback(() => {
    mentorTipGenerationRef.current += 1;
    clearMentorTipTimer();
    setMentorTipVisible(false);
  }, [clearMentorTipTimer]);

  useEffect(() => {
    const startTimer = window.setTimeout(showMentorTip, 0);
    return () => {
      window.clearTimeout(startTimer);
      mentorTipGenerationRef.current += 1;
      clearMentorTipTimer();
    };
  }, [clearMentorTipTimer, showMentorTip]);

  function handleSelectionChange(word: string) {
    setCurrentWord(word);
    setSelectionActive(Boolean(word));
    if (word) {
      hideMentorTip();
      if (compactHud && notice) onDismissNotice();
    }
  }

  function handleSelectionEnd(path: CellId[]) {
    setSelectionActive(false);
    onSelectionEnd(path);
  }

  function handleHint() {
    hideMentorTip();
    onHint();
  }

  function handleMentorPreviewChange(visible: boolean) {
    if (visible) showMentorTip();
    else hideMentorTip();
  }

  return (
    <section
      className={styles.screen}
      data-status-kind={statusKind}
      data-reward-opened={rewardOpened || undefined}
      aria-label={`Игровой экран уровня ${level.levelNumber}`}
    >
      <BackgroundSurface backgroundId="background-default" />

      <header className={styles.header}>
        <IconButton
          icon="back"
          label="Выйти из уровня"
          variant="ghost"
          onClick={onBack}
        />
        <div className={styles.levelTitle}>
          <strong>Уровень {level.levelNumber}</strong>
          <span>{level.microtheme}</span>
        </div>
        <KnowledgeBadge value={balance.knowledgePoints} />
      </header>

      <div className={styles.statusSlot}>
        {visibleNotice ? <GameBanner notice={visibleNotice} /> : submitLoading ? <SubmitLoader /> : null}
        {isMentorTipVisible ? <MentorTip /> : null}
      </div>

      <div className={styles.selectionLabel} aria-live="polite">
        <strong>{currentWord}</strong>
      </div>

      <div className={styles.boardSlot}>
        <BoardViewGameBoard
          board={level.board}
          foundTargets={level.foundTargets}
          levelId={level.levelNumber as LevelId}
          revealedCells={level.hintState?.revealedCells}
          inputDisabled={inputDisabled}
          retainSelection={retainSelection}
          routeState={routeState}
          onOpenTarget={onOpenTarget}
          onSelectionChange={handleSelectionChange}
          onSelectionEnd={handleSelectionEnd}
        />
      </div>

      <div className={styles.gameHud}>
        <MentorHintButton
          balance={balance.hintBalance}
          disabled={hintDisabled}
          pending={hintPending}
          onClick={handleHint}
          onPreviewChange={handleMentorPreviewChange}
        />
        <BonusEnvelopeButton
          progress={bonusProgress}
          onClick={onOpenBonusWords}
        />
        <TargetStatus remaining={level.targetsRemaining} total={targetTotal} />
      </div>

      {rewardOpened ? <span className={styles.srOnly}>Награда открыта</span> : null}
    </section>
  );
}
