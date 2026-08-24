import { describe, expect, it } from 'vitest';
import type {
  BoardView,
  FoundTarget,
} from '../../shared/demoTypes';
import { CellViewStateEnum } from '../../shared/demoTypes';
import {
  boardCellMap,
  cellRefToCellId,
  foundCellMap,
  wordFromBoardPath,
} from './boardViewMapper';

const board: BoardView = {
  size: 3,
  cells: [
    { row: 2, col: 2, letter: 'Д', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
    { row: 0, col: 1, letter: 'О', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
    { row: 1, col: 2, letter: 'О', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
    { row: 0, col: 0, letter: 'Д', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
    { row: 2, col: 1, letter: 'И', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
    { row: 1, col: 1, letter: 'А', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
    { row: 0, col: 2, letter: 'Х', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
    { row: 2, col: 0, letter: 'Р', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
    { row: 1, col: 0, letter: 'Т', state: CellViewStateEnum.Letter, belongsToFoundWord: false },
  ],
};

const foundTarget: FoundTarget = {
  targetId: 'target-income',
  word: 'ДОХОД',
  definition: 'Деньги, полученные за определённый период.',
  foundAt: '2026-08-21T12:00:00.000Z',
  foundSequence: 1,
  cells: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 2 },
    { row: 2, col: 2 },
  ],
};

describe('BoardView display mapper', () => {
  it('maps wire 0-based coordinates to the legacy 1-based CellId only for display', () => {
    expect(cellRefToCellId({ row: 0, col: 0 })).toBe('1:1');
    expect(cellRefToCellId({ row: 2, col: 1 })).toBe('3:2');
  });

  it('indexes shuffled board cells by their row and column', () => {
    const cells = boardCellMap(board);

    expect(cells.get('1:1')?.letter).toBe('Д');
    expect(cells.get('2:3')?.letter).toBe('О');
    expect(cells.get('3:3')?.letter).toBe('Д');
  });

  it('builds the current word from server cells instead of local level content', () => {
    expect(
      wordFromBoardPath(board, ['1:1', '1:2', '1:3', '2:3', '3:3']),
    ).toBe('ДОХОД');
  });

  it('locks cells only from FoundTarget.cells', () => {
    const locked = foundCellMap([foundTarget]);

    expect(locked.get('1:1')).toBe(foundTarget);
    expect(locked.get('2:3')).toBe(foundTarget);
    expect(locked.has('2:2')).toBe(false);
  });
});
