/**
 * fakeDb — server-shaped default fixtures for the 12 in-scope operations.
 *
 * Bodies follow the generated DTOs from `contracts/openapi.yaml` (no invented
 * fields); enum values use the wire string values. This is the P0 foundation:
 * stateful behavior is intentionally out of scope, but every operation has a
 * default fixture so a missing one can fail fast at request time.
 */
import type { FixtureMap } from './handlerFactory';

function makeBoard(size: number, state: 'letter' | 'found') {
  const cells: Array<{
    row: number;
    col: number;
    letter: string;
    state: 'letter' | 'found';
    belongsToFoundWord: boolean;
  }> = [];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      cells.push({ row, col, letter: 'А', state, belongsToFoundWord: state === 'found' });
    }
  }
  return { size, cells };
}

const clientState = {
  clientState: {
    clientView: {
      balance: { knowledgePoints: 0, hintBalance: 5 },
      settings: { musicEnabled: true, soundEnabled: true, tutorialCompleted: false },
      selectedCharacterId: '6f8fad5b-d9cb-469f-a165-80867728951e',
      selectedBackgroundId: '9f8fad5b-d9cb-469f-a165-808677289517',
      campaignProgress: { isCompleted: false, isCompletionShown: false },
    },
    chapters: [],
    levels: [],
    rewards: [],
    nextAction: 'none',
  },
};

const levelPlay = {
  levelId: '4f8fad5b-d9cb-469f-a165-808677289512',
  levelVersionId: '5f8fad5b-d9cb-469f-a165-808677289513',
  levelNumber: 1,
  microtheme: 'Личные финансы',
  status: 'in_progress',
  board: makeBoard(3, 'letter'),
  targetsRemaining: 3,
  foundTargets: [],
  bonusWords: [],
  startedAt: '2026-08-06T10:15:00.000Z',
  nextAction: 'play',
};

export const defaultFixtures: FixtureMap = {
  'API-001': { body: clientState, etag: '"bootstrap-etag"', iks: 'processed' },
  'API-002': { body: clientState, etag: '"state-etag"' },
  'API-003': {
    body: {
      chapterId: '5f8fad5b-d9cb-469f-a165-808677289540',
      isNarrativeShown: true,
      nextAction: 'start_level',
    },
    etag: '"narrative-etag"',
    iks: 'processed',
  },
  'API-004': { body: levelPlay, etag: '"level-etag"', iks: 'processed' },
  'API-005': { body: levelPlay, etag: '"level-etag"' },
  'API-006': {
    body: {
      result: 'found',
      word: 'КОТ',
      isTarget: true,
      targetsRemaining: 2,
      levelCompleted: false,
      newFoundTargets: [],
      newBonusWords: [],
      knowledgePoints: 1,
      hintBalance: 5,
      nextAction: 'play',
    },
    etag: '"routes-etag"',
    iks: 'processed',
  },
  'API-007': {
    body: {
      hintBalance: 4,
      knowledgePoints: 1,
      revealedCells: [{ row: 0, col: 0 }],
      foundTargets: [],
      targetsRemaining: 2,
      levelCompleted: false,
      nextAction: 'play',
    },
    etag: '"hints-etag"',
    iks: 'processed',
  },
  'API-008': {
    body: {
      levelId: '4f8fad5b-d9cb-469f-a165-808677289512',
      status: 'completed',
      board: makeBoard(3, 'found'),
      foundTargets: [],
      bonusWords: [],
    },
    etag: '"results-etag"',
  },
  'API-009': {
    body: {
      rewardId: '6f8fad5b-d9cb-469f-a165-808677289514',
      state: 'claimed',
      claimResult: {
        balance: { knowledgePoints: 1, hintBalance: 6 },
      },
      nextAction: 'play',
    },
    etag: '"claim-etag"',
    iks: 'processed',
  },
  'API-010': {
    body: {
      musicEnabled: false,
      soundEnabled: true,
      tutorialCompleted: false,
    },
    etag: '"settings-etag"',
    iks: 'processed',
  },
  'API-011': {
    body: {
      items: [],
      selectedCharacterId: '6f8fad5b-d9cb-469f-a165-80867728951e',
      selectedBackgroundId: '9f8fad5b-d9cb-469f-a165-808677289517',
    },
    etag: '"appearances-etag"',
  },
  'API-012': {
    body: {
      appearanceId: '6f8fad5b-d9cb-469f-a165-80867728951e',
      type: 'character',
      selectedCharacterId: '6f8fad5b-d9cb-469f-a165-80867728951e',
      selectedBackgroundId: '9f8fad5b-d9cb-469f-a165-808677289517',
    },
    etag: '"select-etag"',
    iks: 'processed',
  },
  'API-013': {
    body: {
      feedbackId: '7f8fad5b-d9cb-469f-a165-808677289515',
      status: 'submitted',
      nextAction: 'none',
    },
    etag: '"feedback-etag"',
    iks: 'processed',
  },
};
