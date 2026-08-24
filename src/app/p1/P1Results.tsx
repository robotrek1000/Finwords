import type { RefObject } from 'react';
import {
  RewardSummaryRewardTypeEnum,
  type FoundTarget,
  type LevelResultsResponse,
} from '../../shared/demoTypes';
import { BoardViewGameBoard } from '../../features/game/BoardViewGameBoard';
import { BackgroundSurface } from '../../shared/ui/BackgroundSurface';
import { assetUrl } from '../../shared/assetUrl';
import { Button } from '../../shared/ui/Button';
import { IconButton } from '../../shared/ui/IconButton';
import styles from './P1App.module.css';

type ResultsStatus = 'loading' | 'error' | 'success';

interface ResultsScreenProps {
  levelLabel: string;
  results: LevelResultsResponse | null;
  showLoader: boolean;
  status: ResultsStatus;
  onBack: () => void;
  onPrimary: () => void;
  onRetry: () => void;
  onShowField: () => void;
  onOpenTarget: (target: FoundTarget) => void;
  onClaimReward?: () => void;
  rewardSelectionOpen?: boolean;
  actionPending?: boolean;
  actionError?: boolean;
  onRetryAction?: () => void;
  rewardPrimaryRef?: RefObject<HTMLButtonElement | null>;
}

export function ResultsScreen({
  levelLabel,
  results,
  showLoader,
  status,
  onBack,
  onPrimary,
  onRetry,
  onShowField,
  onOpenTarget,
  onClaimReward,
  rewardSelectionOpen = false,
  actionPending = false,
  actionError = false,
  onRetryAction,
  rewardPrimaryRef,
}: ResultsScreenProps) {
  if (status === 'error') {
    return (
      <section className={styles.resultsScreen} aria-label={`Результаты ${levelLabel}`}>
        <BackgroundSurface backgroundId="background-error" />
        <header className={styles.resultsHeader}>
          <IconButton icon="back" label="На главный экран" variant="ghost" onClick={onBack} />
          <span />
          <span />
        </header>
        <div className={styles.resultsError}>
          <h1>Что-то пошло не так</h1>
          <p>Не удалось загрузить результаты уровня. Попробуйте ещё раз.</p>
          <Button onClick={onRetry}>Повторить</Button>
        </div>
      </section>
    );
  }

  if (!results) {
    return (
      <section className={styles.resultsScreen} aria-label={`Результаты ${levelLabel}`}>
        <BackgroundSurface />
        <div className={styles.resultsLoader} role="status" aria-label="Загрузка результатов">
          {showLoader ? <><span aria-hidden="true" /><strong>Загружаем результаты</strong></> : null}
        </div>
      </section>
    );
  }

  const courseTarget = results.foundTargets.find((target) => target.courseOffer);
  const goldenReward =
    results.completionKind === 'chapter'
    && results.reward?.rewardType === RewardSummaryRewardTypeEnum.ChapterGolden
      ? results.reward
      : undefined;
  const completedLevels = results.chapter.completedLevels;
  const totalLevels = results.chapter.totalLevels;
  const chapterProgressLabel = `Уровней ${completedLevels} из ${totalLevels}`;
  const remainingLevels = Math.max(totalLevels - completedLevels, 0);
  const progressPercent = totalLevels > 0 ? (completedLevels / totalLevels) * 100 : 0;

  return (
    <section
      className={styles.resultsScreen}
      aria-label={`Результаты ${levelLabel}`}
      inert={rewardSelectionOpen || undefined}
    >
        <BackgroundSurface />
        <header className={styles.resultsHeader}>
        <IconButton
          icon="back"
          label="На главный экран"
          variant="ghost"
          disabled={actionPending}
          onClick={onBack}
        />
        <h1>{goldenReward ? 'Глава завершена!' : 'Уровень пройден!'}</h1>
        <span />
        </header>
        <main className={styles.resultsContent}>
          <article className={styles.resultsKnowledgeCard}>
            <div className={styles.resultsKnowledgeGroup}>
              <img src={assetUrl('assets/p1/knowledge-badge.png')} alt="" />
              <div className={styles.resultsKnowledgeCopy}>
                <strong>+{results.summary.earnedKnowledgePoints} знаний</strong>
                <span>Всего</span>
                <b aria-label={`Всего знаний: ${results.summary.knowledgePointsTotal}`}>
                  {results.summary.knowledgePointsTotal}
                </b>
              </div>
            </div>
          </article>
        <dl className={styles.resultsStats}>
          <div>
            <dt>Целевые слова</dt>
            <dd>
              {results.summary.targets.foundCount} из {results.summary.targets.totalCount}
            </dd>
          </div>
          <div><dt>Бонусные слова</dt><dd>{results.summary.bonuses.foundCount}</dd></div>
        </dl>
        <article
          className={goldenReward
            ? `${styles.resultsEnvelopeCard} ${styles.resultsEnvelopeCardGolden}`
            : styles.resultsEnvelopeCard}
          >
            <img
              src={assetUrl('assets/envelope-golden.webp')}
              alt={goldenReward ? 'Золотой конверт' : 'Конверт'}
            />
          <div>
            <h2>{results.chapter.title}</h2>
            <span
              className={styles.resultsEnvelopeProgress}
              role="progressbar"
              aria-label={chapterProgressLabel}
              aria-valuemin={0}
              aria-valuemax={totalLevels}
              aria-valuenow={completedLevels}
            >
              <i style={{ width: `${progressPercent}%` }} />
            </span>
            <span className={styles.resultsEnvelopeProgressLabel}>{chapterProgressLabel}</span>
            <strong>
              {goldenReward
                ? 'Золотой конверт готов'
                : `До конверта: ${remainingLevels} ${remainingLevels === 1 ? 'уровень' : 'уровней'}`}
            </strong>
          </div>
          {goldenReward ? (
            <span
              className={styles.srOnly}
              role="progressbar"
              aria-label="Прогресс золотого конверта"
              aria-valuemin={0}
              aria-valuemax={totalLevels}
              aria-valuenow={completedLevels}
            />
          ) : null}
        </article>
        {courseTarget ? (
          <button
            type="button"
            className={styles.resultsCourseCard}
            disabled={actionPending}
            onClick={() => onOpenTarget(courseTarget)}
          >
            <span>{courseTarget.courseOffer?.badgeLabel}</span>
            <strong>{courseTarget.courseOffer?.title}</strong>
          </button>
        ) : null}
      </main>
      <footer className={styles.resultsActions}>
        {goldenReward && onClaimReward && !rewardSelectionOpen ? (
          <Button ref={rewardPrimaryRef} disabled={actionPending} onClick={onClaimReward}>Забрать награду</Button>
        ) : !goldenReward ? <Button disabled={actionPending} onClick={onPrimary}>Следующий уровень</Button> : null}
        <Button variant="secondary" disabled={actionPending} onClick={onShowField}>Показать поле</Button>
        {actionPending ? <p role="status">Подтверждаем результаты…</p> : null}
        {actionError && onRetryAction ? (
          <>
            <p className={styles.resultsActionError} role="alert">
              Не удалось подтвердить результаты. Попробуйте ещё раз.
            </p>
            <Button onClick={onRetryAction}>Повторить</Button>
          </>
        ) : null}
      </footer>
    </section>
  );
}

interface FieldReviewScreenProps {
  levelLabel: string;
  results: LevelResultsResponse;
  onHide: () => void;
  onOpenTarget: (target: FoundTarget) => void;
  onPrimary: () => void;
  primaryLabel: string;
  actionPending?: boolean;
}

export function FieldReviewScreen({
  levelLabel,
  results,
  onHide,
  onOpenTarget,
  onPrimary,
  primaryLabel,
  actionPending = false,
}: FieldReviewScreenProps) {
  return (
    <section className={styles.fieldReviewScreen} aria-label={`Просмотр поля ${levelLabel}`}>
      <BackgroundSurface />
      <header className={styles.resultsHeader}>
        <span />
        <strong>Поле уровня</strong>
        <span />
      </header>
      <div className={styles.fieldReviewBoard}>
        <BoardViewGameBoard
          board={results.board}
          foundTargets={results.foundTargets}
          onOpenTarget={actionPending ? () => undefined : onOpenTarget}
          onSelectionChange={() => undefined}
          onSelectionEnd={() => undefined}
        />
      </div>
      <div className={styles.fieldReviewActions}>
        <Button disabled={actionPending} onClick={onPrimary}>{primaryLabel}</Button>
        <Button variant="secondary" disabled={actionPending} onClick={onHide}>Скрыть поле</Button>
        {actionPending ? <p role="status">Подтверждаем результаты…</p> : null}
      </div>
    </section>
  );
}
