import { readFileSync } from 'node:fs';
import type { CellId } from '../../src/app/types';

const directory = new URL('../../src/content/mock-generated/campaign/', import.meta.url);
const readJson = (path: string): unknown => JSON.parse(readFileSync(new URL(path, directory), 'utf8'));
export const CAMPAIGN_CHAPTERS = readJson('chapters.json') as Array<{ title: string; levelStart: number; levelEnd: number }>;
export const CAMPAIGN_LEVELS = Object.fromEntries(Array.from({ length: 50 }, (_, index) => {
  const number = index + 1;
  const level = readJson(`levels/level-${String(number).padStart(2, '0')}.json`) as {
    targets: Array<{ order: number; canonicalPath: Array<{ row: number; col: number }> }>;
  };
  return [number, { targets: [...level.targets].sort((a, b) => a.order - b.order).map(target => ({
    path: target.canonicalPath.map(cell => `${cell.row + 1}:${cell.col + 1}` as CellId),
  })) }];
})) as Record<number, { targets: Array<{ path: CellId[] }> }>;
