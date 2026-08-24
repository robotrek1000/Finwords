import type { CellRef } from '../../shared/demoTypes';

export const ROUTE_MIN_LENGTH = 2;
export const ROUTE_MAX_LENGTH = 36;

/**
 * Maps a client-side 1-based `CellId` (`"row:col"`) to the wire 0-based
 * `CellRef` (`{ row, col }`), preserving order/reverse. Validates the route
 * structurally only: length bounds (2..36), well-formed ids, board bounds,
 * uniqueness, and orthogonal adjacency. Has no game verdict.
 */
export function cellIdsToRoute(
  path: readonly string[],
  size: number,
): CellRef[] {
  if (path.length < ROUTE_MIN_LENGTH) {
    throw new Error('ROUTE_TOO_SHORT');
  }
  if (path.length > ROUTE_MAX_LENGTH) {
    throw new Error('ROUTE_TOO_LONG');
  }

  const cells: CellRef[] = [];
  const seen = new Set<string>();

  for (const cellId of path) {
    const match = /^(\d+):(\d+)$/.exec(cellId);
    if (!match) {
      throw new Error('MALFORMED_CELL');
    }
    const row = Number(match[1]);
    const col = Number(match[2]);
    if (row < 1 || row > size || col < 1 || col > size) {
      throw new Error('OUT_OF_BOARD');
    }

    const cell: CellRef = { row: row - 1, col: col - 1 };
    const key = `${cell.row}:${cell.col}`;
    if (seen.has(key)) {
      throw new Error('DUPLICATE_CELL');
    }
    seen.add(key);
    cells.push(cell);
  }

  for (let index = 1; index < cells.length; index += 1) {
    const previous = cells[index - 1];
    const current = cells[index];
    const distance =
      Math.abs(previous.row - current.row) + Math.abs(previous.col - current.col);
    if (distance !== 1) {
      throw new Error('NON_ORTHOGONAL');
    }
  }

  return cells;
}