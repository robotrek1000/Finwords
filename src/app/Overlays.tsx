import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { SessionState, TargetWord } from './types';
import { Button } from '../shared/ui/Button';
import { IconButton } from '../shared/ui/IconButton';
import { Icon } from '../shared/ui/icons';
import { LinearProgress } from '../shared/ui/Progress';
import { envelopeThreshold } from './session';
import styles from './Overlays.module.css';

const ASSETS = {
  analyst: `${import.meta.env.BASE_URL}assets/character-analyst.png`,
  regularEnvelope: `${import.meta.env.BASE_URL}assets/envelope-regular.png`,
  goldenEnvelope: `${import.meta.env.BASE_URL}assets/envelope-golden.png`,
  cushion: `${import.meta.env.BASE_URL}assets/chapter-financial-cushion.png`,
};

type OfferCloseMethod = 'close_icon' | 'continue_game';

interface OverlaysProps {
  state: SessionState;
  selectedTarget?: TargetWord;
  onClose: () => void;
  onCloseOffer: (method: OfferCloseMethod) => void;
  onOfferCta: (target: TargetWord) => void;
  onExitConfirmed: () => void;
  onOpenFeedback: () => void;
  onToggleSetting: (setting: keyof SessionState['settings']) => void;
  onClaimRegular: (reward: 'hint' | 'character') => void;
  onClaimGolden: (reward: 'hints' | 'theme') => void;
}

function ModalFrame({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <motion.div
        className={styles.scrim}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <div className={styles.modalPositioner}>
        <motion.div
          className={`${styles.modal} ${className}`}
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </div>
    </>
  );
}

function SheetFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <motion.div
        className={styles.scrim}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className={styles.sheet}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      >
        <div className={styles.sheetHandle} />
        {children}
      </motion.div>
    </>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className={styles.sheetHeader}>
      <span aria-hidden="true" />
      <h2>{title}</h2>
      <IconButton
        icon="close"
        label="Закрыть"
        variant="ghost"
        depth="flat"
        className={styles.lightClose}
        onClick={onClose}
      />
    </header>
  );
}

export function Overlays({
  state,
  selectedTarget,
  onClose,
  onCloseOffer,
  onOfferCta,
  onExitConfirmed,
  onOpenFeedback,
  onToggleSetting,
  onClaimRegular,
  onClaimGolden,
}: OverlaysProps) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [regularReward, setRegularReward] = useState<'hint' | 'character'>();
  const [goldenReward, setGoldenReward] = useState<'hints' | 'theme'>();

  const levelProgress = state.levelProgress[state.currentLevelId];
  const threshold = envelopeThreshold(state.bonusEnvelopeIndex);
  const hasBonusWords = levelProgress.foundBonusWords.length > 0;

  return (
    <div className={styles.layer} aria-live="polite">
      <AnimatePresence>
        {state.toast && state.view !== 'game' ? (
          <motion.div
            key={state.toast.id}
            className={`${styles.toast} ${styles[state.toast.kind] ?? ''}`}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {state.toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {state.overlay === 'word-definition' && selectedTarget ? (
          <ModalFrame key="word-definition">
            <header className={styles.modalHeader}>
              <span aria-hidden="true" />
              <h2>{selectedTarget.word}</h2>
              <IconButton
                icon="close"
                label="Закрыть"
                variant="ghost"
                depth="flat"
                className={styles.lightClose}
                onClick={onClose}
              />
            </header>
            <div className={styles.modalBody}>
              <p className={styles.definition}>{selectedTarget.definition}</p>
            </div>
            <div className={styles.actions}>
              <Button onClick={onClose}>Понятно</Button>
            </div>
          </ModalFrame>
        ) : null}

        {(state.overlay === 'course' || state.overlay === 'product') &&
        selectedTarget?.offer ? (
          <ModalFrame key={state.overlay} className={styles.offerModal}>
            <header className={styles.modalHeader}>
              <span aria-hidden="true" />
              <h2>{selectedTarget.offer.title}</h2>
              <IconButton
                icon="close"
                label="Закрыть"
                variant="ghost"
                depth="flat"
                className={styles.lightClose}
                onClick={() => onCloseOffer('close_icon')}
              />
            </header>
            <div className={`${styles.modalBody} ${styles.offerBody}`}>
              <p className={styles.definition}>{selectedTarget.offer.definition}</p>
              <span
                className={`${styles.badge} ${
                  selectedTarget.offer.type === 'product' ? styles.product : ''
                }`}
              >
                <Icon name={selectedTarget.offer.type === 'course' ? 'book' : 'product'} />
                {selectedTarget.offer.badgeLabel}
              </span>
              <p className={styles.offerDescription}>{selectedTarget.offer.description}</p>
            </div>
            <div className={styles.actions}>
              <Button onClick={() => onOfferCta(selectedTarget)}>
                {selectedTarget.offer.ctaLabel}
              </Button>
              <Button
                variant="secondary"
                onClick={() => onCloseOffer('continue_game')}
              >
                Продолжить игру
              </Button>
            </div>
          </ModalFrame>
        ) : null}

        {state.overlay === 'bonus-words' ? (
          <ModalFrame
            key="bonus-words"
            className={`${styles.bonusModal} ${
              hasBonusWords ? '' : styles.bonusModalEmpty
            }`}
          >
            <header className={styles.modalHeader}>
              <span aria-hidden="true" />
              <h2>Бонусные слова</h2>
              <IconButton
                icon="close"
                label="Закрыть"
                variant="ghost"
                depth="flat"
                className={styles.lightClose}
                onClick={onClose}
              />
            </header>
            <ol
              className={`${styles.bonusList} ${
                hasBonusWords ? '' : styles.bonusListEmpty
              }`}
            >
              {hasBonusWords ? (
                levelProgress.foundBonusWords.map((word, index) => (
                  <li key={word} className={styles.bonusItem}>
                    <span className={styles.bonusIndex}>{index + 1}</span>
                    {word}
                  </li>
                ))
              ) : (
                <li className={styles.emptyBonusMessage}>Пока бонусных слов нет</li>
              )}
            </ol>
            <div className={styles.envelopePanel}>
              <img src={ASSETS.regularEnvelope} alt="" />
              <div>
                <strong>Бонусный конверт</strong>
                <LinearProgress
                  current={state.bonusEnvelopeProgress}
                  max={threshold}
                  color="#38BDF8"
                />
                <small>
                  {state.bonusEnvelopeProgress}/{threshold}
                </small>
              </div>
            </div>
            {!hasBonusWords ? (
              <p className={styles.bonusFoundCount}>
                На этом уровне найдено 0 из {threshold}
              </p>
            ) : null}
            <div className={styles.actions}>
              <Button variant="secondary" onClick={onClose}>
                Закрыть
              </Button>
            </div>
          </ModalFrame>
        ) : null}

        {state.overlay === 'exit' ? (
          <SheetFrame key="exit">
            <SheetHeader title="Выйти из игры?" onClose={onClose} />
            <p className={styles.sheetCopy}>
              Прогресс сохранится. Вернуться в игру можно в любой момент.
            </p>
            <div className={styles.sheetActions}>
              <Button variant="secondary" onClick={onExitConfirmed}>
                Выйти
              </Button>
              <Button onClick={onClose}>Остаться</Button>
            </div>
          </SheetFrame>
        ) : null}

        {state.overlay === 'settings' ? (
          <SheetFrame key="settings">
            <SheetHeader title="Настройки" onClose={onClose} />
            <div className={styles.toggleList}>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>
                  <Icon name="music" />
                  Музыка
                </span>
                <button
                  type="button"
                  className={`${styles.switch} ${state.settings.music ? styles.on : ''}`}
                  aria-pressed={state.settings.music}
                  aria-label="Музыка"
                  onClick={() => onToggleSetting('music')}
                />
              </div>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>
                  <Icon name="sound" />
                  Звук
                </span>
                <button
                  type="button"
                  className={`${styles.switch} ${state.settings.sound ? styles.on : ''}`}
                  aria-pressed={state.settings.sound}
                  aria-label="Звук"
                  onClick={() => onToggleSetting('sound')}
                />
              </div>
            </div>
            <Button variant="secondary" onClick={onOpenFeedback}>
              Оценить игру
            </Button>
          </SheetFrame>
        ) : null}

        {state.overlay === 'feedback' ? (
          <SheetFrame key="feedback">
            <SheetHeader title="Обратная связь" onClose={onClose} />
            <h3 className={styles.feedbackQuestion}>Как вам игра?</h3>
            <div className={styles.rating} aria-label="Оценка">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.star} ${value <= rating ? styles.active : ''}`}
                  aria-label={`${value} из 5`}
                  onClick={() => setRating(value)}
                >
                  <Icon name="star" />
                </button>
              ))}
            </div>
            <label className={styles.feedbackLabel} htmlFor="feedback-text">
              Ваш отзыв
            </label>
            <textarea
              id="feedback-text"
              className={styles.textarea}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="Что можно улучшить?"
              maxLength={500}
            />
            <p className={styles.feedbackCounter}>
              {feedback.length ? `${feedback.length}/500` : 'До 500 символов'}
            </p>
            <div className={styles.actions}>
              <Button disabled={rating === 0} onClick={onClose}>
                Отправить
              </Button>
            </div>
          </SheetFrame>
        ) : null}

        {state.overlay === 'regular-reward' ? (
          <ModalFrame key="regular-reward" className={styles.rewardModal}>
            <h2 className={styles.rewardTitle}>Выберите награду</h2>
            <div className={styles.rewardGrid}>
              <button
                type="button"
                className={`${styles.rewardCard} ${
                  regularReward === 'hint' ? styles.selected : ''
                }`}
                onClick={() => setRegularReward('hint')}
              >
                <img src={ASSETS.regularEnvelope} alt="" />
                <h3>Подсказка</h3>
                <p>+1 к балансу</p>
              </button>
              <button
                type="button"
                className={`${styles.rewardCard} ${
                  regularReward === 'character' ? styles.selected : ''
                }`}
                onClick={() => setRegularReward('character')}
              >
                <img src={ASSETS.analyst} alt="" />
                <h3>Аналитик</h3>
                <p>Новый облик</p>
              </button>
            </div>
            <div className={styles.rewardAction}>
              <Button
                disabled={!regularReward}
                onClick={() => regularReward && onClaimRegular(regularReward)}
              >
                Забрать
              </Button>
            </div>
          </ModalFrame>
        ) : null}

        {state.overlay === 'golden-reward' ? (
          <ModalFrame key="golden-reward" className={styles.rewardModal}>
            <h2 className={styles.rewardTitle}>Золотая награда</h2>
            <div className={styles.rewardGrid}>
              <button
                type="button"
                className={`${styles.rewardCard} ${
                  goldenReward === 'hints' ? styles.selected : ''
                }`}
                onClick={() => setGoldenReward('hints')}
              >
                <img src={ASSETS.goldenEnvelope} alt="" />
                <h3>Подсказки</h3>
                <p>+3 к балансу</p>
              </button>
              <button
                type="button"
                className={`${styles.rewardCard} ${
                  goldenReward === 'theme' ? styles.selected : ''
                }`}
                onClick={() => setGoldenReward('theme')}
              >
                <img src={ASSETS.cushion} alt="" />
                <h3>Капитал</h3>
                <p>Новая тема</p>
              </button>
            </div>
            <div className={styles.rewardAction}>
              <Button
                disabled={!goldenReward}
                onClick={() => goldenReward && onClaimGolden(goldenReward)}
              >
                Забрать
              </Button>
            </div>
          </ModalFrame>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
