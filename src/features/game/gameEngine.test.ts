import { describe, expect, it } from 'vitest';
import { getLevel } from '../../content/levels';
import {
  areOrthogonallyAdjacent,
  evaluateSelection,
  extendSelection,
  lockedCellMap,
  pathsEqual,
  wordFromPath,
} from './gameEngine';

describe('gameEngine', () => {
  const level = getLevel(1);

  it('accepts only orthogonally adjacent cells', () => {
    expect(areOrthogonallyAdjacent('1:1', '1:2')).toBe(true);
    expect(areOrthogonallyAdjacent('1:1', '2:1')).toBe(true);
    expect(areOrthogonallyAdjacent('1:1', '2:2')).toBe(false);
    expect(areOrthogonallyAdjacent('1:1', '1:3')).toBe(false);
  });

  it('supports backtracking to the previous cell', () => {
    const path = ['1:1', '1:2', '2:2'] as const;
    expect(extendSelection([...path], '1:2', new Set())).toEqual(['1:1', '1:2']);
  });

  it('rejects diagonal moves, cell reuse, and locked cells', () => {
    expect(extendSelection(['1:1'], '2:2', new Set())).toEqual(['1:1']);
    expect(extendSelection(['1:1', '1:2', '2:2'], '1:1', new Set())).toEqual([
      '1:1',
      '1:2',
      '2:2',
    ]);
    expect(extendSelection([], '1:1', new Set(['1:1']))).toEqual([]);
  });

  it('recognizes the exact forward target path', () => {
    const stock = level.targets.find((target) => target.id === 'stock');
    expect(stock).toBeDefined();
    expect(evaluateSelection(level, stock!.path)).toMatchObject({
      type: 'target',
      word: 'АКЦИЯ',
      target: stock,
    });
  });

  it('does not accept a target word in reverse', () => {
    const stock = level.targets.find((target) => target.id === 'stock')!;
    expect(evaluateSelection(level, [...stock.path].reverse())).toEqual({
      type: 'invalid',
      word: 'ЯИЦКА',
    });
  });

  it('recognizes bonus words but ignores a single-cell tap', () => {
    const bonusPath = ['4:5', '5:5', '5:6', '4:6'] as const;
    expect(wordFromPath(level, [...bonusPath])).toBe('ЛАПА');
    expect(evaluateSelection(level, [...bonusPath])).toEqual({
      type: 'bonus',
      word: 'ЛАПА',
    });
    expect(evaluateSelection(level, ['1:1'])).toEqual({
      type: 'none',
      word: 'И',
    });
  });

  it('compares paths by direction and maps all cells of found targets', () => {
    expect(pathsEqual(['1:1', '1:2'], ['1:1', '1:2'])).toBe(true);
    expect(pathsEqual(['1:1', '1:2'], ['1:2', '1:1'])).toBe(false);

    const risk = level.targets.find((target) => target.id === 'risk')!;
    const map = lockedCellMap(level, ['risk']);
    expect([...map.keys()]).toEqual(risk.path);
    expect(map.get(risk.path[0])).toBe(risk);
  });
});
