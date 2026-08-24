import type { CellId, LevelId, WordOffer } from '../../app/types';
import type { CellRef, CourseOffer, FoundTarget } from '../../shared/demoTypes';
import { LEVELS } from '../../content/levels';
import { cellToCoordinates } from './gameEngine';

export type FoldedCorner = 'top-left' | 'bottom-right';

export interface TargetPresentation {
  word: string;
  corner?: FoldedCorner;
  color?: string;
  firstCell?: CellRef;
  firstCellId?: CellId;
  linked: boolean;
  offer?: WordOffer | CourseOffer;
}

interface LegacyTargetPresentation extends Omit<TargetPresentation, 'offer'> {
  offer?: WordOffer;
}

function foldedCorner(path: CellId[]): FoldedCorner {
  const [from, to] = path;
  const [fromRow, fromCol] = cellToCoordinates(from);
  const [toRow, toCol] = cellToCoordinates(to);
  return toRow > fromRow || toCol > fromCol ? 'top-left' : 'bottom-right';
}

/** Legacy gameplay presentation. Results must use resolveFoundTargetPresentation. */
export function resolveTargetPresentation(
  levelId: LevelId = 1,
  word: string,
): LegacyTargetPresentation {
  const target = LEVELS[levelId].targets.find((candidate) => candidate.word === word);
  if (!target) return { word, linked: false };
  const firstCellId = target.path[0];
  const [row, col] = cellToCoordinates(firstCellId);
  return {
    word,
    corner: foldedCorner(target.path),
    color: target.color,
    firstCell: { row: row - 1, col: col - 1 },
    firstCellId,
    linked: target.offer?.type === 'course',
    offer: target.offer,
  };
}

export function resolveFoundTargetPresentation(target: FoundTarget): TargetPresentation {
  const [from, to] = target.cells;
  const corner = from && to
    ? (to.row > from.row || to.col > from.col ? 'top-left' : 'bottom-right')
    : undefined;
  const firstCell = target.cells[0];
  return {
    word: target.word,
    corner,
    firstCell,
    firstCellId: firstCell ? `${firstCell.row + 1}:${firstCell.col + 1}` : undefined,
    linked: Boolean(target.courseOffer),
    offer: target.courseOffer,
  };
}

export function lightenColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 0xff;
  const green = (value >> 8) & 0xff;
  const blue = value & 0xff;
  const lighten = (channel: number) =>
    Math.round(channel + (255 - channel) * amount);
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0');
  return `#${toHex(lighten(red))}${toHex(lighten(green))}${toHex(lighten(blue))}`;
}
