import { describe, expect, it } from 'vitest';
import type { CellId } from '../../app/types';
import type { CellRef } from '../../infra/api/generated/data-contracts';
import { cellIdsToRoute } from './routeBuilder';

describe('cellIdsToRoute', () => {
  it('maps 1-based CellIds to 0-based CellRefs preserving order', () => {
    const path: CellId[] = ['1:1', '1:2', '1:3'];
    const expected: CellRef[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];

    expect(cellIdsToRoute(path, 3)).toEqual(expected);
  });

  it('preserves the exact reverse of a path', () => {
    const path: CellId[] = ['3:3', '2:3', '1:3'];
    const expected: CellRef[] = [
      { row: 2, col: 2 },
      { row: 1, col: 2 },
      { row: 0, col: 2 },
    ];

    expect(cellIdsToRoute(path, 3)).toEqual(expected);
  });

  it('accepts the minimum length of 2 and the maximum length of 36', () => {
    const minPath: CellId[] = ['1:1', '1:2'];
    const maxPath: CellId[] = Array.from({ length: 36 }, (_, index) => {
      const row = Math.floor(index / 6) + 1;
      const offset = index % 6;
      const col = row % 2 === 1 ? offset + 1 : 6 - offset;
      return `${row}:${col}` as CellId;
    });

    expect(cellIdsToRoute(minPath, 6)).toHaveLength(2);
    expect(cellIdsToRoute(maxPath, 6)).toHaveLength(36);
  });

  it('rejects a path shorter than 2 cells', () => {
    expect(() => cellIdsToRoute(['1:1'], 3)).toThrow(/ROUTE_TOO_SHORT/);
  });

  it('rejects a path longer than 36 cells', () => {
    const path: CellId[] = Array.from({ length: 37 }, (_, i) => {
      const row = Math.floor(i / 6) + 1;
      const col = (i % 6) + 1;
      return `${row}:${col}` as CellId;
    });

    expect(() => cellIdsToRoute(path, 6)).toThrow(/ROUTE_TOO_LONG/);
  });

  it('rejects a malformed CellId', () => {
    expect(() => cellIdsToRoute(['1:1', 'abc'], 3)).toThrow(/MALFORMED_CELL/);
    expect(() => cellIdsToRoute(['1:1', '1:2:3'] as CellId[], 3)).toThrow(
      /MALFORMED_CELL/,
    );
  });

  it('rejects a CellId outside the board bounds', () => {
    expect(() => cellIdsToRoute(['1:1', '4:1'], 3)).toThrow(/OUT_OF_BOARD/);
    expect(() => cellIdsToRoute(['1:1', '0:1'], 3)).toThrow(/OUT_OF_BOARD/);
  });

  it('rejects a duplicate CellId in the path', () => {
    expect(() => cellIdsToRoute(['1:1', '1:1'], 3)).toThrow(/DUPLICATE_CELL/);
  });

  it('rejects a non-orthogonal step between adjacent cells', () => {
    expect(() => cellIdsToRoute(['1:1', '2:2'], 3)).toThrow(/NON_ORTHOGONAL/);
    expect(() => cellIdsToRoute(['1:1', '1:3'], 3)).toThrow(/NON_ORTHOGONAL/);
  });
});
