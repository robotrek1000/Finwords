import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { CellId, LevelId, Overlay, TargetWord } from './types';
import type { SelectionResult } from '../features/game/gameEngine';
import { getLevel } from '../content/levels';
import {
  createInitialSession,
  envelopeThreshold,
  isLevelComplete,
  selectedTarget,
  sessionReducer,
} from './session';
import { track } from './analytics';
import {
  AppearanceScreen,
  GameScreen,
  HomeScreen,
  NarrativeScreen,
  ResultsScreen,
} from './Screens';
import { Overlays } from './Overlays';
import styles from './App.module.css';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const FIRST_HINT_CUE = {
  id: 'first-hint',
  message: 'Подсказка ведёт по буквам одного слова по порядку.',
};

const INVALID_CUE = {
  id: 'three-invalid',
  message: 'Начните с другой буквы. Диагонали не работают.',
};

export function App() {
  const [state, dispatch] = useReducer(
    sessionReducer,
    window.location.search,
    createInitialSession,
  );
  const stateRef = useRef(state);
  const toastId = useRef(0);
  const level = getLevel(state.currentLevelId);
  const progress = state.levelProgress[state.currentLevelId];
  const targetForOverlay = selectedTarget(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const queueMentor = useCallback((cue: { id: string; message: string }) => {
    dispatch({ type: 'QUEUE_MENTOR', cue });
  }, []);

  const setToast = useCallback(
    (
      message: string,
      kind: 'success' | 'info' | 'error',
      nextOverlay?: Overlay,
      selectedWordId?: string,
    ) => {
      if (selectedWordId) {
        dispatch({ type: 'SET_OVERLAY', overlay: 'none', selectedWordId });
      }
      toastId.current += 1;
      dispatch({
        type: 'SET_TOAST',
        toast: { id: toastId.current, message, kind, nextOverlay },
      });
    },
    [],
  );

  const finishToast = useCallback(() => {
    const activeToast = stateRef.current.toast;
    if (!activeToast) {
      return;
    }
    const targetId = stateRef.current.selectedWordId;
    dispatch({ type: 'CLEAR_TOAST' });
    if (activeToast.nextOverlay) {
      dispatch({
        type: 'SET_OVERLAY',
        overlay: activeToast.nextOverlay,
        selectedWordId: targetId,
      });
      if (
        (activeToast.nextOverlay === 'course' || activeToast.nextOverlay === 'product') &&
        targetId
      ) {
        const target = getLevel(stateRef.current.currentLevelId).targets.find(
          (candidate) => candidate.id === targetId,
        );
        if (target?.offer) {
          track('word_offer_shown', {
            offerType: target.offer.type,
            offerId: target.offer.id,
            wordId: target.id,
            levelId: stateRef.current.currentLevelId,
            chapterId: 'financial-cushion',
            campaignId: target.offer.campaignId,
            openSource: 'auto',
            destination: target.offer.destination,
          });
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!state.toast) {
      return;
    }
    const timer = window.setTimeout(finishToast, 1500);
    return () => window.clearTimeout(timer);
  }, [finishToast, state.toast]);

  useEffect(() => {
    if (!state.currentMentor || state.toast || state.overlay !== 'none') {
      return;
    }
    const timer = window.setTimeout(() => dispatch({ type: 'DISMISS_MENTOR' }), 3200);
    return () => window.clearTimeout(timer);
  }, [state.currentMentor, state.overlay, state.toast]);

  useEffect(() => {
    function advanceTransient(event: Event) {
      const detail = (event as CustomEvent<number>).detail;
      if (detail >= 1000) {
        finishToast();
      }
      if (detail >= 3200 && stateRef.current.currentMentor) {
        dispatch({ type: 'DISMISS_MENTOR' });
      }
    }
    window.addEventListener('finwords:advance-time', advanceTransient);
    return () => window.removeEventListener('finwords:advance-time', advanceTransient);
  }, [finishToast]);

  useEffect(() => {
    if (
      state.view === 'game' &&
      state.overlay === 'none' &&
      !state.toast &&
      isLevelComplete(state) &&
      !state.completedLevelIds.includes(state.currentLevelId)
    ) {
      track('level_completed', {
        levelId: state.currentLevelId,
        chapterId: 'financial-cushion',
        targetWords: level.targets.length,
        bonusWords: progress.foundBonusWords.length,
      });
      dispatch({ type: 'COMPLETE_LEVEL', levelId: state.currentLevelId });
    }
  }, [
    level.targets.length,
    progress.foundBonusWords.length,
    state,
    state.completedLevelIds,
    state.currentLevelId,
    state.overlay,
    state.toast,
    state.view,
  ]);

  useEffect(() => {
    track('screen_view', {
      screen: state.view,
      overlay: state.overlay,
      levelId: state.currentLevelId,
    });
  }, [state.currentLevelId, state.overlay, state.view]);

  useEffect(() => {
    function handleFullscreen(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'f' || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void document.documentElement.requestFullscreen();
      }
    }
    window.addEventListener('keydown', handleFullscreen);
    return () => window.removeEventListener('keydown', handleFullscreen);
  }, []);

  useEffect(() => {
    window.advanceTime = (ms: number) => {
      window.dispatchEvent(new CustomEvent('finwords:advance-time', { detail: ms }));
    };
    window.render_game_to_text = () => {
      const current = stateRef.current;
      const currentLevel = getLevel(current.currentLevelId);
      const currentProgress = current.levelProgress[current.currentLevelId];
      return JSON.stringify({
        coordinateSystem:
          'Grid cells use 1-based row:column coordinates; origin is top-left, rows increase downward, columns increase rightward.',
        view: current.view,
        overlay: current.overlay,
        levelId: current.currentLevelId,
        grid: current.view === 'game' ? currentLevel.grid : undefined,
        foundTargets: currentProgress.foundTargetIds,
        foundBonusWords: currentProgress.foundBonusWords,
        activeHintWordId: currentProgress.activeHintWordId ?? null,
        hintLettersRevealed: currentProgress.activeHintWordId
          ? currentProgress.hintsRevealed[currentProgress.activeHintWordId] ?? 0
          : 0,
        knowledge: current.knowledge,
        hints: current.hints,
        envelope: {
          current: current.bonusEnvelopeProgress,
          max: envelopeThreshold(current.bonusEnvelopeIndex),
        },
        completedLevels: current.completedLevelIds,
        goldenRewardClaimed: current.goldenRewardClaimed,
        mentor: current.currentMentor?.message ?? null,
        toast: current.toast?.message ?? null,
      });
    };
    return () => {
      delete window.advanceTime;
      delete window.render_game_to_text;
    };
  }, []);

  function startLevel(levelId: LevelId) {
    const shouldShowNarrative =
      levelId === 1 &&
      state.levelProgress[1].foundTargetIds.length === 0 &&
      !state.completedLevelIds.includes(1);
    track('level_started', { levelId, chapterId: 'financial-cushion' });
    dispatch({ type: 'START_LEVEL', levelId, showNarrative: shouldShowNarrative });
    if (!shouldShowNarrative) {
      const startCue = getLevel(levelId).mentorCues[0];
      if (startCue) {
        queueMentor(startCue);
      }
    }
  }

  function beginNarrativeLevel() {
    dispatch({ type: 'BEGIN_GAME' });
    const cue = getLevel(1).mentorCues.find((candidate) => candidate.id === 'level-1-start');
    if (cue) {
      queueMentor(cue);
    }
  }

  function openTarget(target: TargetWord) {
    const overlay: Overlay = target.offer?.type ?? 'word-definition';
    dispatch({ type: 'OPEN_WORD', targetId: target.id, overlay });
    track('word_definition_opened', {
      wordId: target.id,
      levelId: state.currentLevelId,
      source: 'word_tap',
    });
    if (target.offer) {
      track('word_offer_shown', {
        offerType: target.offer.type,
        offerId: target.offer.id,
        wordId: target.id,
        levelId: state.currentLevelId,
        chapterId: 'financial-cushion',
        campaignId: target.offer.campaignId,
        openSource: 'word_tap',
        destination: target.offer.destination,
      });
    }
  }

  function handleSelection(result: SelectionResult, path: CellId[]) {
    if (result.type === 'none') {
      return;
    }

    if (result.type === 'target' && result.target) {
      if (progress.foundTargetIds.includes(result.target.id)) {
        openTarget(result.target);
        return;
      }
      const foundBefore = progress.foundTargetIds.length;
      const remainingAfter = level.targets.length - foundBefore - 1;
      dispatch({ type: 'FIND_TARGET', targetId: result.target.id });
      track('target_word_found', {
        levelId: level.id,
        wordId: result.target.id,
        word: result.target.word,
        path,
      });
      setToast(
        `${result.target.word} · +1 знание`,
        'success',
        result.target.offer?.autoShow ? result.target.offer.type : undefined,
        result.target.id,
      );

      if (foundBefore === 0) {
        const cue = level.mentorCues.find((candidate) => candidate.id === 'first-target');
        if (cue) {
          queueMentor(cue);
        }
      }
      if (remainingAfter === 2) {
        const cue = level.mentorCues.find((candidate) => candidate.id === 'two-left');
        if (cue) {
          queueMentor(cue);
        }
      }
      if (remainingAfter === 1) {
        const cue = level.mentorCues.find((candidate) => candidate.id === 'one-left');
        if (cue) {
          queueMentor(cue);
        }
      }
      return;
    }

    if (result.type === 'bonus') {
      if (progress.foundBonusWords.includes(result.word)) {
        track('bonus_word_repeated', {
          levelId: level.id,
          word: result.word,
          path,
        });
        setToast('Это бонусное слово уже найдено', 'info');
        return;
      }
      const threshold = envelopeThreshold(state.bonusEnvelopeIndex);
      const willFill = state.bonusEnvelopeProgress + 1 >= threshold;
      dispatch({ type: 'FIND_BONUS', word: result.word });
      track('bonus_word_found', {
        levelId: level.id,
        word: result.word,
        path,
      });
      setToast(
        `${result.word} · бонусное слово`,
        'success',
        willFill ? 'regular-reward' : undefined,
      );
      return;
    }

    if (result.type === 'target-wrong-path' && result.target) {
      if (progress.foundTargetIds.includes(result.target.id)) {
        setToast('Это слово уже найдено', 'info');
        return;
      }
      dispatch({ type: 'REGISTER_INVALID' });
      track('invalid_word_submitted', {
        levelId: level.id,
        word: result.word,
        path,
        reason: 'noncanonical_target_path',
        targetId: result.target.id,
      });
      setToast('Попробуйте собрать слово по-другому', 'info');
      if (progress.invalidStreak + 1 >= 3) {
        queueMentor(INVALID_CUE);
        dispatch({ type: 'RESET_INVALID_STREAK' });
      }
      return;
    }

    dispatch({ type: 'REGISTER_INVALID' });
    track('invalid_word_submitted', {
      levelId: level.id,
      word: result.word,
      path,
      reason: 'unknown_word',
    });
    setToast('Это слово не загадано', 'error');
    if (progress.invalidStreak + 1 >= 3) {
      queueMentor(INVALID_CUE);
      dispatch({ type: 'RESET_INVALID_STREAK' });
    }
  }

  function useHint() {
    const unresolved = level.targets.filter(
      (target) => !progress.foundTargetIds.includes(target.id),
    );
    if (!unresolved.length || state.hints <= 0) {
      return;
    }

    const active = unresolved.find((target) => target.id === progress.activeHintWordId);
    const activeCount = active ? progress.hintsRevealed[active.id] ?? 0 : 0;
    const candidates =
      active && activeCount < active.path.length
        ? [active]
        : unresolved.filter((target) => target.id !== active?.id);
    const target =
      candidates[Math.floor(Math.random() * candidates.length)] ?? unresolved[0];
    const revealedCount = Math.min(
      (progress.hintsRevealed[target.id] ?? 0) + 1,
      target.path.length,
    );

    dispatch({ type: 'USE_HINT', targetId: target.id, revealedCount });
    queueMentor(FIRST_HINT_CUE);
    track('hint_used', {
      levelId: level.id,
      wordId: target.id,
      revealedCount,
      hintsRemaining: state.hints - 1,
    });
  }

  function closeOffer(method: 'close_icon' | 'continue_game') {
    const target = targetForOverlay;
    if (target?.offer) {
      track('word_offer_closed', {
        offerType: target.offer.type,
        offerId: target.offer.id,
        wordId: target.id,
        levelId: state.currentLevelId,
        chapterId: 'financial-cushion',
        campaignId: target.offer.campaignId,
        closeMethod: method,
        destination: target.offer.destination,
      });
    }
    dispatch({ type: 'CLOSE_OVERLAY' });
  }

  function clickOfferCta(target: TargetWord) {
    if (!target.offer) {
      return;
    }
    track('word_offer_cta_clicked', {
      offerType: target.offer.type,
      offerId: target.offer.id,
      wordId: target.id,
      levelId: state.currentLevelId,
      chapterId: 'financial-cushion',
      campaignId: target.offer.campaignId,
      destination: target.offer.destination,
    });
  }

  function renderScreen() {
    switch (state.view) {
      case 'home':
        return (
          <HomeScreen
            state={state}
            onStartLevel={startLevel}
            onOpenSettings={() => dispatch({ type: 'SET_OVERLAY', overlay: 'settings' })}
            onOpenAppearance={() => dispatch({ type: 'NAVIGATE', view: 'appearance' })}
            onOpenExit={() => dispatch({ type: 'SET_OVERLAY', overlay: 'exit' })}
            onOpenGoldenReward={() =>
              dispatch({ type: 'SET_OVERLAY', overlay: 'golden-reward' })
            }
          />
        );
      case 'narrative':
        return (
          <NarrativeScreen
            onClose={() => dispatch({ type: 'NAVIGATE', view: 'home' })}
            onContinue={beginNarrativeLevel}
          />
        );
      case 'game':
        return (
          <GameScreen
            state={state}
            level={level}
            mentor={state.currentMentor}
            onBack={() => dispatch({ type: 'SET_OVERLAY', overlay: 'exit' })}
            onSubmit={handleSelection}
            onOpenTarget={openTarget}
            onUseHint={useHint}
            onOpenBonusWords={() =>
              dispatch({ type: 'SET_OVERLAY', overlay: 'bonus-words' })
            }
          />
        );
      case 'results':
        return (
          <ResultsScreen
            state={state}
            onBack={() => dispatch({ type: 'NAVIGATE', view: 'home' })}
            onPrimary={() => {
              if (state.resultsLevelId === 1) {
                startLevel(2);
              } else {
                dispatch({ type: 'SET_OVERLAY', overlay: 'golden-reward' });
              }
            }}
            onShowField={() =>
              dispatch({
                type: 'START_LEVEL',
                levelId: state.resultsLevelId,
                showNarrative: false,
              })
            }
          />
        );
      case 'appearance':
        return (
          <AppearanceScreen
            state={state}
            onBack={() => dispatch({ type: 'NAVIGATE', view: 'home' })}
            onTabChange={(tab) => dispatch({ type: 'SET_APPEARANCE_TAB', tab })}
            onThemeChange={(theme) => dispatch({ type: 'SET_THEME', theme })}
          />
        );
    }
  }

  const textState = useMemo(
    () => ({
      view: state.view,
      level: state.currentLevelId,
      overlay: state.overlay,
    }),
    [state.currentLevelId, state.overlay, state.view],
  );

  return (
    <div className={styles.stage} data-game-state={JSON.stringify(textState)}>
      <div className={styles.device}>
        <div className={styles.hostBand} aria-hidden="true" />
        <main className={styles.webview}>
          {renderScreen()}
          <Overlays
            key={state.overlay}
            state={state}
            selectedTarget={targetForOverlay}
            onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
            onCloseOffer={closeOffer}
            onOfferCta={clickOfferCta}
            onExitConfirmed={() => {
              track('exit_confirmed', { levelId: state.currentLevelId });
              dispatch({ type: 'NAVIGATE', view: 'home' });
            }}
            onOpenFeedback={() => dispatch({ type: 'SET_OVERLAY', overlay: 'feedback' })}
            onToggleSetting={(setting) => dispatch({ type: 'TOGGLE_SETTING', setting })}
            onClaimRegular={(reward) => {
              track('reward_selected', { rewardType: 'regular', reward });
              dispatch({ type: 'CLAIM_REGULAR_REWARD', reward });
            }}
            onClaimGolden={(reward) => {
              track('reward_selected', { rewardType: 'golden', reward });
              dispatch({ type: 'CLAIM_GOLDEN_REWARD', reward });
            }}
          />
        </main>
        <div className={styles.hostBand} aria-hidden="true" />
      </div>
    </div>
  );
}
