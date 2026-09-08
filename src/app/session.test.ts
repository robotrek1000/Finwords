import { describe, expect, it } from 'vitest';
import {
  BONUS_ENVELOPE_THRESHOLDS,
  createInitialSession,
  envelopeThreshold,
  isLevelComplete,
  sessionReducer,
} from './session';
import { LEVELS } from '../content/chapter1';

describe('session state', () => {
  it('starts a fresh session with five hints and no progress', () => {
    const state = createInitialSession();
    expect(state.view).toBe('home');
    expect(state.currentLevelId).toBe(1);
    expect(state.knowledge).toBe(0);
    expect(state.hints).toBe(5);
    expect(state.completedLevelIds).toEqual([]);
    expect(state.levelProgress[1].foundTargetIds).toEqual([]);
  });

  it('supports dev-only query parameters without exposing invalid values', () => {
    const state = createInitialSession(
      '?screen=game&level=2&overlay=product&hints=8&knowledge=13&envelope=3',
    );
    expect(state).toMatchObject({
      view: 'game',
      currentLevelId: 2,
      overlay: 'product',
      selectedWordId: 'target-02-01',
      hints: 8,
      knowledge: 13,
      bonusEnvelopeProgress: 3,
    });

    const invalid = createInitialSession('?screen=unknown&hints=-1');
    expect(invalid.view).toBe('home');
    expect(invalid.hints).toBe(5);
  });

  it('awards a target only once and clears its active hint chain', () => {
    let state = createInitialSession();
    state = sessionReducer(state, {
      type: 'USE_HINT',
      targetId: 'stock',
      revealedCount: 1,
    });
    state = sessionReducer(state, { type: 'FIND_TARGET', targetId: 'stock' });
    const duplicate = sessionReducer(state, { type: 'FIND_TARGET', targetId: 'stock' });

    expect(state.knowledge).toBe(1);
    expect(state.hints).toBe(4);
    expect(state.levelProgress[1].activeHintWordId).toBeUndefined();
    expect(duplicate).toBe(state);
  });

  it('awards a bonus only once per level', () => {
    let state = createInitialSession();
    state = sessionReducer(state, { type: 'FIND_BONUS', word: 'ЛАПА' });
    const duplicate = sessionReducer(state, { type: 'FIND_BONUS', word: 'ЛАПА' });

    expect(state.knowledge).toBe(1);
    expect(state.bonusEnvelopeProgress).toBe(1);
    expect(state.levelProgress[1].foundBonusWords).toEqual(['ЛАПА']);
    expect(duplicate).toBe(state);
  });

  it('uses the 4, 6, 8, 10, 10 envelope thresholds', () => {
    expect(BONUS_ENVELOPE_THRESHOLDS).toEqual([4, 6, 8, 10]);
    expect([0, 1, 2, 3, 4, 12].map(envelopeThreshold)).toEqual([
      4, 6, 8, 10, 10, 10,
    ]);
  });

  it('resets regular envelope progress and applies the selected reward', () => {
    let state = createInitialSession('?envelope=4&hints=5');
    state = { ...state, overlay: 'regular-reward' };
    state = sessionReducer(state, { type: 'CLAIM_REGULAR_REWARD', reward: 'hint' });

    expect(state.hints).toBe(6);
    expect(state.bonusEnvelopeProgress).toBe(0);
    expect(state.bonusEnvelopeIndex).toBe(1);
    expect(state.overlay).toBe('none');
  });

  it('queues mentor messages once and advances the queue', () => {
    const first = { id: 'first', message: 'Первое сообщение' };
    const second = { id: 'second', message: 'Второе сообщение' };
    let state = createInitialSession();
    state = sessionReducer(state, { type: 'QUEUE_MENTOR', cue: first });
    state = sessionReducer(state, { type: 'QUEUE_MENTOR', cue: second });
    state = sessionReducer(state, { type: 'QUEUE_MENTOR', cue: first });

    expect(state.currentMentor).toEqual(first);
    expect(state.mentorQueue).toEqual([second]);

    state = sessionReducer(state, { type: 'DISMISS_MENTOR' });
    expect(state.currentMentor).toEqual(second);
    expect(state.mentorQueue).toEqual([]);
  });

  it('keeps unfinished progress when navigating home and starting again', () => {
    let state = createInitialSession();
    state = sessionReducer(state, {
      type: 'START_LEVEL',
      levelId: 1,
      showNarrative: false,
    });
    state = sessionReducer(state, { type: 'FIND_TARGET', targetId: 'risk' });
    state = sessionReducer(state, { type: 'NAVIGATE', view: 'home' });
    state = sessionReducer(state, {
      type: 'START_LEVEL',
      levelId: 1,
      showNarrative: false,
    });

    expect(state.levelProgress[1].foundTargetIds).toEqual(['risk']);
    expect(state.knowledge).toBe(1);
  });

  it('completes a level, unlocks results, and can defer the golden reward', () => {
    let state = createInitialSession();
    for (const targetId of LEVELS[1].targets.map((target) => target.id)) {
      state = sessionReducer(state, { type: 'FIND_TARGET', targetId });
    }
    expect(isLevelComplete(state, 1)).toBe(true);

    state = sessionReducer(state, { type: 'COMPLETE_LEVEL', levelId: 1 });
    expect(state).toMatchObject({
      view: 'results',
      resultsLevelId: 1,
      completedLevelIds: [1],
    });

    state = sessionReducer(state, { type: 'COMPLETE_LEVEL', levelId: 2 });
    state = sessionReducer(state, { type: 'NAVIGATE', view: 'home' });
    expect(state.completedLevelIds).toEqual([1, 2]);
    expect(state.goldenRewardClaimed).toBe(false);

    state = sessionReducer(state, { type: 'SET_OVERLAY', overlay: 'golden-reward' });
    state = sessionReducer(state, { type: 'CLAIM_GOLDEN_REWARD', reward: 'hints' });
    expect(state.hints).toBe(8);
    expect(state.goldenRewardClaimed).toBe(true);
    expect(state.view).toBe('home');
  });

  it('opens and closes Field Review without changing session progress', () => {
    let state = createInitialSession('?hints=8&knowledge=12&envelope=3');
    state = sessionReducer(state, { type: 'FIND_TARGET', targetId: 'risk' });
    state = sessionReducer(state, { type: 'COMPLETE_LEVEL', levelId: 1 });
    const beforeReview = state;

    state = sessionReducer(state, { type: 'OPEN_RESULTS_FIELD' });
    expect(state).toMatchObject({
      view: 'results-field',
      currentLevelId: beforeReview.currentLevelId,
      resultsLevelId: beforeReview.resultsLevelId,
      knowledge: beforeReview.knowledge,
      hints: beforeReview.hints,
      bonusEnvelopeProgress: beforeReview.bonusEnvelopeProgress,
      levelProgress: beforeReview.levelProgress,
    });

    state = sessionReducer(state, { type: 'CLOSE_RESULTS_FIELD' });
    expect(state.view).toBe('results');
    expect(state.levelProgress).toBe(beforeReview.levelProgress);
  });
});
