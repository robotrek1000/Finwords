import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CellId, LevelId } from '../../app/types';
import type {
  Balance,
  FoundTarget,
  LevelPlayResponse,
} from '../../shared/demoTypes';
import { BackgroundSurface } from '../../shared/ui/BackgroundSurface';
import { assetUrl } from '../../shared/assetUrl';
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
      <img src={assetUrl('assets/character-analyst.webp')} alt="" />
      <p>Подсказка ведёт по буквам одного слова по порядку.</p>
    </div>
  );
}

function KnowledgeBadge({ value }: { value: number }) {
  return (
    <div className={styles.knowledge} aria-label={`Знания: ${value}`}>
      <img src={assetUrl('assets/p1/knowledge-badge.png')} alt="" />
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
      onPointerEnter={() => onPreviewChange(true)}
      onPointerLeave={() => onPreviewChange(false)}
      onFocus={() => onPreviewChange(true)}
      onBlur={() => onPreviewChange(false)}
      onClick={onClick}
    >
      <img src={assetUrl('assets/character-analyst.webp')} alt="" />
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
            <img src={assetUrl('assets/p1/home-envelope.png')} alt="" />
          </span>
          <strong>{current}/{threshold}</strong>
        </>
      ) : (
        <img src={assetUrl('assets/p1/home-envelope.png')} alt="" />
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
  onHint,
  onOpenBonusWords,
  onOpenTarget,
  onSelectionEnd,
}: GameScreenProps) {
  const [currentWord, setCurrentWord] = useState('');
  const [mentorTipVisible, setMentorTipVisible] = useState(true);
  const hintDisabled = hintPending || inputDisabled;
  const targetTotal = level.targetsRemaining + level.foundTargets.length;
  const showMentorTip = mentorTipVisible && !notice && !currentWord && !submitLoading;
  const statusKind = notice
    ? 'banner'
    : submitLoading
      ? 'banner'
      : showMentorTip
        ? 'mentor'
        : 'none';

  useEffect(() => {
    const timer = window.setTimeout(() => setMentorTipVisible(false), MENTOR_TIP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, []);

  function handleSelectionChange(word: string) {
    setCurrentWord(word);
    if (word) setMentorTipVisible(false);
  }

  function handleHint() {
    setMentorTipVisible(false);
    onHint();
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
        {notice ? <GameBanner notice={notice} /> : submitLoading ? <SubmitLoader /> : null}
        {showMentorTip ? <MentorTip /> : null}
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
          onSelectionEnd={onSelectionEnd}
        />
      </div>

      <div className={styles.gameHud}>
        <MentorHintButton
          balance={balance.hintBalance}
          disabled={hintDisabled}
          pending={hintPending}
          onClick={handleHint}
          onPreviewChange={setMentorTipVisible}
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
