import type { CellId } from '../../app/types';
import type {
  BoardView,
  CellRef,
  CellView,
  FoundTarget,
} from '../../shared/demoTypes';

export function cellRefToCellId(cell: CellRef): CellId {
  return `${cell.row + 1}:${cell.col + 1}` as CellId;
}

export function boardCellMap(board: BoardView): Map<CellId, CellView> {
  if (!Number.isInteger(board.size) || board.size < 3 || board.size > 6) {
    throw new Error(`INVALID_BOARD_SIZE:${board.size}`);
  }
  if (board.cells.length !== board.size * board.size) {
    throw new Error(
      `INVALID_BOARD_CELL_COUNT:${board.cells.length}/${board.size * board.size}`,
    );
  }

  const cells = new Map<CellId, CellView>();
  for (const cell of board.cells) {
    if (
      !Number.isInteger(cell.row) ||
      !Number.isInteger(cell.col) ||
      cell.row < 0 ||
      cell.col < 0 ||
      cell.row >= board.size ||
      cell.col >= board.size
    ) {
      throw new Error(`INVALID_BOARD_CELL:${cell.row}:${cell.col}`);
    }
    const cellId = cellRefToCellId(cell);
    if (cells.has(cellId)) {
      throw new Error(`DUPLICATE_BOARD_CELL:${cell.row}:${cell.col}`);
    }
    cells.set(cellId, cell);
  }
  return cells;
}

export function wordFromBoardPath(board: BoardView, path: readonly CellId[]): string {
  const cells = boardCellMap(board);
  return path.map((cellId) => cells.get(cellId)?.letter ?? '').join('');
}

export function foundCellMap(
  foundTargets: readonly FoundTarget[],
): Map<CellId, FoundTarget> {
  const cells = new Map<CellId, FoundTarget>();
  for (const target of foundTargets) {
    for (const cell of target.cells) {
      const cellId = cellRefToCellId(cell);
      const currentTarget = cells.get(cellId);
      if (
        !currentTarget
        || target.foundSequence > currentTarget.foundSequence
        // Equal sequences are unexpected; targetId gives an order independent of API array order.
        || (
          target.foundSequence === currentTarget.foundSequence
          && target.targetId > currentTarget.targetId
        )
      ) {
        cells.set(cellId, target);
      }
    }
  }
  return cells;
}
