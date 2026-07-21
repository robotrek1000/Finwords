import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { getLevel } from '../content/levels';
import { GameBoard } from '../features/game/GameBoard';
import type { SelectionResult } from '../features/game/gameEngine';
import type {
  CellId,
  LevelConfig,
  LevelId,
  MentorCue,
  SessionState,
  TargetWord,
} from './types';
import { Button } from '../shared/ui/Button';
import { IconButton } from '../shared/ui/IconButton';
import { Icon } from '../shared/ui/icons';
import { CircularProgress, LinearProgress } from '../shared/ui/Progress';
import styles from './Screens.module.css';

const ASSETS = {
  certificate: `${import.meta.env.BASE_URL}assets/certificate.png`,
  cushion: `${import.meta.env.BASE_URL}assets/chapter-financial-cushion.png`,
  home: `${import.meta.env.BASE_URL}assets/chapter-home-family.png`,
  goldenEnvelope: `${import.meta.env.BASE_URL}assets/envelope-golden.png`,
  regularEnvelope: `${import.meta.env.BASE_URL}assets/envelope-regular.png`,
  analyst: `${import.meta.env.BASE_URL}assets/character-analyst.png`,
};

interface KnowledgeBadgeProps {
  value: number;
  size?: 'compact' | 'feature';
  className?: string;
}

function KnowledgeBadge({
  value,
  size = 'compact',
  className = '',
}: KnowledgeBadgeProps) {
  return (
    <div
      className={`${styles.knowledgeBadge} ${
        size === 'feature' ? styles.knowledgeFeature : styles.knowledgeCompact
      } ${className}`}
      aria-label={`Знания: ${value}`}
    >
      <img src={ASSETS.certificate} alt="" />
      <span>{value}</span>
    </div>
  );
}

interface HomeScreenProps {
  state: SessionState;
  onStartLevel: (levelId: LevelId) => void;
  onOpenSettings: () => void;
  onOpenAppearance: () => void;
  onOpenExit: () => void;
  onOpenGoldenReward: () => void;
}

export function HomeScreen({
  state,
  onStartLevel,
  onOpenSettings,
  onOpenAppearance,
  onOpenExit,
  onOpenGoldenReward,
}: HomeScreenProps) {
  const completed = state.completedLevelIds.length;
  const nextLevel: LevelId = completed >= 1 ? 2 : 1;
  const allComplete = completed >= 2;

  return (
    <section className={styles.screen} aria-label="Главный экран">
      <header className={`${styles.header} ${styles.homeHeader}`}>
        <IconButton icon="close" label="Закрыть игру" onClick={onOpenExit} />
        <h1 className={styles.headerTitle}>Финворды</h1>
        <span aria-hidden="true" />
      </header>

      <div className={styles.homeActions}>
        <IconButton icon="settings" label="Настройки" onClick={onOpenSettings} />
        <IconButton icon="palette" label="Облики" onClick={onOpenAppearance} />
      </div>

      <KnowledgeBadge
        value={state.knowledge}
        size="feature"
        className={styles.homeKnowledge}
      />

      <div className={styles.chapterRail}>
        <article className={styles.chapterCard}>
          <div className={styles.chapterVisual}>
            <CircularProgress
              current={completed}
              max={2}
              color="#3B5BDB"
              size={152}
              strokeWidth={12}
              showValue={false}
            />
            <img src={ASSETS.cushion} alt="" />
          </div>
          <strong className={styles.chapterValue}>{completed}/2</strong>
          <span className={styles.chapterLabel}>Финансовая подушка</span>
        </article>
        <article className={styles.nextChapter} aria-label="Следующая глава">
          <img src={ASSETS.home} alt="" />
          <strong>Дом и семья</strong>
          <small>2–10</small>
        </article>
      </div>

      <button
        type="button"
        className={styles.goldenCard}
        onClick={onOpenGoldenReward}
        disabled={completed < 2 || state.goldenRewardClaimed}
      >
        <img src={ASSETS.goldenEnvelope} alt="" />
        <span className={styles.progressCopy}>
          <strong>
            {state.goldenRewardClaimed ? 'Награда получена' : 'Золотой конверт'}
          </strong>
          <LinearProgress current={completed} max={2} color="#F6C945" />
          <small>{completed}/2</small>
        </span>
      </button>

      <div className={styles.homeCta}>
        <Button
          data-testid="home-primary"
          disabled={allComplete}
          onClick={() => onStartLevel(nextLevel)}
        >
          {allComplete ? 'Уровни пройдены' : `Уровень ${nextLevel}`}
        </Button>
      </div>
    </section>
  );
}

interface NarrativeScreenProps {
  onClose: () => void;
  onContinue: () => void;
}

export function NarrativeScreen({ onClose, onContinue }: NarrativeScreenProps) {
  return (
    <section className={styles.screen} aria-label="Начало главы">
      <div className={styles.narrativeIntro}>
        <h1>Новая глава</h1>
        <p>Глава 1</p>
      </div>
      <motion.div
        className={styles.narrativeContent}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <header className={styles.narrativeModalHeader}>
          <span aria-hidden="true" />
          <h2 className={styles.narrativeTitle}>Финансовая подушка</h2>
          <IconButton
            icon="close"
            label="Вернуться на главный экран"
            variant="ghost"
            depth="flat"
            className={styles.narrativeClose}
            onClick={onClose}
          />
        </header>
        <div className={styles.narrativePanel}>
          <img
            className={styles.narrativeCharacter}
            src={ASSETS.analyst}
            alt="Наставник"
          />
          <p className={styles.narrativeSpeech}>
            Начните с основ: найдите слова о капитале, риске, рынке и доходе.
          </p>
        </div>
        <Button data-testid="narrative-continue" onClick={onContinue}>
          Продолжить
        </Button>
      </motion.div>
    </section>
  );
}

interface GameScreenProps {
  state: SessionState;
  level: LevelConfig;
  mentor?: MentorCue;
  onBack: () => void;
  onSubmit: (result: SelectionResult, path: CellId[]) => void;
  onOpenTarget: (target: TargetWord) => void;
  onUseHint: () => void;
  onOpenBonusWords: () => void;
}

export function GameScreen({
  state,
  level,
  mentor,
  onBack,
  onSubmit,
  onOpenTarget,
  onUseHint,
  onOpenBonusWords,
}: GameScreenProps) {
  const [selectionWord, setSelectionWord] = useState('');
  const progress = state.levelProgress[level.id];
  const activeHintTarget = progress.activeHintWordId
    ? level.targets.find((target) => target.id === progress.activeHintWordId)
    : undefined;
  const hintRevealedCount = activeHintTarget
    ? progress.hintsRevealed[activeHintTarget.id] ?? 0
    : 0;
  const threshold = [4, 6, 8, 10][Math.min(state.bonusEnvelopeIndex, 3)];

  return (
    <section className={styles.screen} aria-label={`Уровень ${level.id}`}>
      <div className={styles.game}>
        <header className={`${styles.header} ${styles.gameHeader}`}>
          <IconButton icon="back" label="Выйти из уровня" variant="ghost" onClick={onBack} />
          <h1 className={styles.headerTitle}>Уровень {level.id}</h1>
          <KnowledgeBadge value={state.knowledge} size="compact" />
        </header>

        <div className={styles.statusSlot} aria-live="polite">
          <AnimatePresence mode="wait">
            {selectionWord ? (
              <motion.div
                key="selection"
                className={styles.selectionStatus}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                {selectionWord}
              </motion.div>
            ) : state.toast ? (
              <motion.div
                key={`toast-${state.toast.id}`}
                className={`${styles.gameBanner} ${styles[state.toast.kind]}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <span className={styles.gameBannerIcon}>
                  <Icon name={state.toast.kind === 'success' ? 'check' : 'alert'} />
                </span>
                <p>{state.toast.message}</p>
              </motion.div>
            ) : mentor ? (
              <motion.aside
                key={mentor.id}
                className={styles.mentorTip}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <img src={ASSETS.analyst} alt="" />
                <p>{mentor.message}</p>
              </motion.aside>
            ) : (
              <span key="neutral" aria-hidden="true" />
            )}
          </AnimatePresence>
        </div>

        <div className={styles.gameBoardSlot}>
          <GameBoard
            level={level}
            foundTargetIds={progress.foundTargetIds}
            hintTarget={activeHintTarget}
            hintRevealedCount={hintRevealedCount}
            onSubmit={onSubmit}
            onOpenTarget={onOpenTarget}
            onSelectionChange={(word) => setSelectionWord(word)}
          />
        </div>

        <div className={styles.gameControls}>
          <button
            type="button"
            className={styles.hintButton}
            onClick={onUseHint}
            disabled={state.hints <= 0 || progress.foundTargetIds.length === level.targets.length}
            aria-label={`Использовать подсказку. Осталось: ${state.hints}`}
          >
            <img src={ASSETS.analyst} alt="" />
            <span className={styles.hintCount}>{state.hints}</span>
          </button>

          <button
            type="button"
            className={styles.envelopeProgress}
            onClick={onOpenBonusWords}
            aria-label={`Показать бонусные слова. Найдено: ${progress.foundBonusWords.length}. Прогресс конверта: ${state.bonusEnvelopeProgress} из ${threshold}`}
          >
            <CircularProgress
              current={state.bonusEnvelopeProgress}
              max={threshold}
              color="#38BDF8"
              size="var(--envelope-ring-size)"
              strokeWidth={12}
              showValue={false}
            />
            <img src={ASSETS.regularEnvelope} alt="" />
            <strong className={styles.envelopeValue}>
              {state.bonusEnvelopeProgress}/{threshold}
            </strong>
          </button>
        </div>
      </div>
    </section>
  );
}

interface ResultsScreenProps {
  state: SessionState;
  onBack: () => void;
  onPrimary: () => void;
  onShowField: () => void;
}

export function ResultsScreen({
  state,
  onBack,
  onPrimary,
  onShowField,
}: ResultsScreenProps) {
  const levelId = state.resultsLevelId;
  const level = getLevel(levelId);
  const progress = state.levelProgress[levelId];
  const completed = state.completedLevelIds.length;

  return (
    <section
      className={`${styles.screen} ${styles.resultsScreen}`}
      aria-label={`Результаты уровня ${levelId}`}
    >
      <div className={styles.resultsContent}>
        <div className={styles.resultsHeading}>
          <IconButton
            icon="back"
            label="На главный экран"
            variant="ghost"
            onClick={onBack}
          />
          <h1>Уровень пройден!</h1>
        </div>
        <KnowledgeBadge
          value={level.targets.length}
          size="feature"
          className={styles.resultsKnowledge}
        />
        <div className={styles.resultsSummary}>
          <div className={styles.summaryRow}>
            <span>Целевые слова</span>
            <strong>
              {progress.foundTargetIds.length} из {level.targets.length}
            </strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Бонусные слова</span>
            <strong>{progress.foundBonusWords.length}</strong>
          </div>
          <p className={styles.resultsPercent}>Лучше, чем у 72% игроков</p>
        </div>
        <div className={styles.chapterResult}>
          <CircularProgress
            current={completed}
            max={2}
            color="#3B5BDB"
            size="var(--results-ring-size)"
            strokeWidth={12}
          />
          <div>
            <h2>Финансовая подушка</h2>
            <p>Прогресс главы · {completed} из 2</p>
          </div>
        </div>
        <div className={`${styles.goldenCard} ${styles.resultsGolden}`}>
          <img src={ASSETS.goldenEnvelope} alt="" />
          <span className={styles.progressCopy}>
            <strong>Золотой конверт</strong>
            <LinearProgress current={completed} max={2} color="#F6C945" />
            <small>{completed}/2</small>
          </span>
        </div>
        <div className={styles.resultsActions}>
          <Button onClick={onPrimary}>
            {levelId === 1 ? 'Уровень 2' : 'Завершить главу'}
          </Button>
          <Button variant="secondary" onClick={onShowField}>
            Показать поле
          </Button>
        </div>
      </div>
    </section>
  );
}

interface AppearanceScreenProps {
  state: SessionState;
  onBack: () => void;
  onTabChange: (tab: 'characters' | 'themes') => void;
  onThemeChange: (theme: 'default' | 'capital') => void;
}

export function AppearanceScreen({
  state,
  onBack,
  onTabChange,
  onThemeChange,
}: AppearanceScreenProps) {
  const tab = state.appearance.tab;
  return (
    <section className={styles.screen} aria-label="Облики">
      <header className={styles.header}>
        <IconButton icon="back" label="Назад" variant="ghost" onClick={onBack} />
        <h1 className={styles.headerTitle}>Облики</h1>
        <span aria-hidden="true" />
      </header>
      <div className={styles.appearanceContent}>
        <div className={styles.appearanceTabs}>
          <Button
            size="medium"
            compactText
            variant={tab === 'characters' ? 'primary' : 'secondary'}
            onClick={() => onTabChange('characters')}
          >
            Персонажи
          </Button>
          <Button
            size="medium"
            compactText
            variant={tab === 'themes' ? 'primary' : 'secondary'}
            onClick={() => onTabChange('themes')}
          >
            Темы
          </Button>
        </div>
        <div className={styles.appearanceGrid}>
          {tab === 'characters' ? (
            <>
              <article className={`${styles.appearanceCard} ${styles.selected}`}>
                <img src={ASSETS.analyst} alt="Аналитик" />
                <h2>Аналитик</h2>
                <p>Выбран</p>
              </article>
              <article className={styles.appearanceCard}>
                <img src={ASSETS.analyst} alt="" style={{ filter: 'grayscale(1)' }} />
                <h2>Новый облик</h2>
                <p>Найдите в наградах</p>
              </article>
            </>
          ) : (
            <>
              <button
                type="button"
                className={`${styles.appearanceCard} ${
                  state.appearance.selectedTheme === 'default' ? styles.selected : ''
                }`}
                onClick={() => onThemeChange('default')}
              >
                <img src={ASSETS.cushion} alt="" />
                <h2>Базовая</h2>
                <p>Светлое поле</p>
              </button>
              <button
                type="button"
                className={`${styles.appearanceCard} ${
                  state.appearance.selectedTheme === 'capital' ? styles.selected : ''
                }`}
                onClick={() => onThemeChange('capital')}
              >
                <img src={ASSETS.goldenEnvelope} alt="" />
                <h2>Капитал</h2>
                <p>Золотая тема</p>
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
