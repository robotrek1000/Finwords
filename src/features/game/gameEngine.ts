import type { CellId, LevelConfig, TargetWord } from '../../app/types';

export type SelectionResultType =
  | 'target'
  | 'target-wrong-path'
  | 'bonus'
  | 'invalid'
  | 'none';

export interface SelectionResult {
  type: SelectionResultType;
  word: string;
  target?: TargetWord;
}

export function cellToCoordinates(cellId: CellId): [number, number] {
  const [row, column] = cellId.split(':').map(Number);
  return [row, column];
}

export function areOrthogonallyAdjacent(a: CellId, b: CellId): boolean {
  const [aRow, aColumn] = cellToCoordinates(a);
  const [bRow, bColumn] = cellToCoordinates(b);
  return Math.abs(aRow - bRow) + Math.abs(aColumn - bColumn) === 1;
}

export function extendSelection(
  selection: CellId[],
  nextCell: CellId,
  lockedCells: ReadonlySet<CellId>,
): CellId[] {
  if (lockedCells.has(nextCell)) {
    return selection;
  }

  if (selection.length === 0) {
    return [nextCell];
  }

  const previous = selection.at(-2);
  if (previous === nextCell) {
    return selection.slice(0, -1);
  }

  const last = selection.at(-1);
  if (!last || !areOrthogonallyAdjacent(last, nextCell) || selection.includes(nextCell)) {
    return selection;
  }

  return [...selection, nextCell];
}

export function wordFromPath(level: LevelConfig, path: CellId[]): string {
  return path
    .map((cellId) => {
      const [row, column] = cellToCoordinates(cellId);
      return level.grid[row - 1]?.[column - 1] ?? '';
    })
    .join('');
}

export function pathsEqual(a: CellId[], b: CellId[]): boolean {
  return a.length === b.length && a.every((cell, index) => cell === b[index]);
}

export function evaluateSelection(level: LevelConfig, path: CellId[]): SelectionResult {
  if (path.length < 2) {
    return { type: 'none', word: wordFromPath(level, path) };
  }

  const word = wordFromPath(level, path);
  const target = level.targets.find((candidate) => pathsEqual(candidate.path, path));
  if (target) {
    return { type: 'target', word, target };
  }

  const targetWithSameWord = level.targets.find((candidate) => candidate.word === word);
  if (targetWithSameWord) {
    return { type: 'target-wrong-path', word, target: targetWithSameWord };
  }

  if (level.bonusWords.includes(word)) {
    return { type: 'bonus', word };
  }

  return { type: 'invalid', word };
}

export function lockedCellMap(
  level: LevelConfig,
  foundTargetIds: readonly string[],
): Map<CellId, TargetWord> {
  const map = new Map<CellId, TargetWord>();
  for (const target of level.targets) {
    if (!foundTargetIds.includes(target.id)) {
      continue;
    }
    for (const cellId of target.path) {
      map.set(cellId, target);
    }
  }
  return map;
}
