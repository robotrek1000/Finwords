import type { LevelConfig, LevelId, MentorCue } from '../app/types';
import artAssets from './mock-generated/chapter-01/catalogs/art-assets.json';
import mentorCues from './mock-generated/chapter-01/catalogs/mentor-cues.json';
import offers from './mock-generated/chapter-01/catalogs/offers.json';
import level01 from './mock-generated/chapter-01/levels/level-01.json';
import level02 from './mock-generated/chapter-01/levels/level-02.json';
import level03 from './mock-generated/chapter-01/levels/level-03.json';
import level04 from './mock-generated/chapter-01/levels/level-04.json';
import level05 from './mock-generated/chapter-01/levels/level-05.json';
import level06 from './mock-generated/chapter-01/levels/level-06.json';
import level07 from './mock-generated/chapter-01/levels/level-07.json';
import level08 from './mock-generated/chapter-01/levels/level-08.json';
import level09 from './mock-generated/chapter-01/levels/level-09.json';
import { toLegacyLevelConfig } from './generatedAdapter';

const TARGET_COLORS = ['#86d3f4', '#b8e8a2', '#f8d775', '#cfb7f6'];
const REAL_GAME_CUE_IDS = new Set([
  'mentor-course',
  'mentor-definition-reminder',
  'mentor-first-hint',
  'mentor-first-target',
  'mentor-level-1-start',
  'mentor-one-left',
  'mentor-product',
  'mentor-three-errors',
  'mentor-two-left',
]);

const CHAPTER1_LEVEL_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type Chapter1RawLevel = Parameters<typeof toLegacyLevelConfig>[0] & { id: string };

const GENERATED_LEVELS = [
  level01,
  level02,
  level03,
  level04,
  level05,
  level06,
  level07,
  level08,
  level09,
] as unknown as Chapter1RawLevel[];
const GENERATED_OFFERS = offers as unknown as Parameters<typeof toLegacyLevelConfig>[1];
const GAME_MENTOR_CUES: MentorCue[] = mentorCues
  .filter((cue) => REAL_GAME_CUE_IDS.has(cue.cueId))
  .map((cue) => ({ id: cue.cueId, message: cue.message }));

export const CHAPTER1_APPEARANCE_ASSETS = artAssets;

function chapter1LevelId(number: number): string {
  return `level-${String(number).padStart(2, '0')}`;
}

function isChapter1LevelNumber(number: number): boolean {
  return Number.isInteger(number) && number >= 1 && number <= 9;
}

/**
 * Pure fail-closed builder for the Chapter 1 runtime mapping.
 *
 * Enforces the explicit bijection `level-01→1 … level-09→9`:
 *   - every raw level must carry an id that agrees with its number;
 *   - raw ids and numbers must be unique (no silent duplicate overwrite);
 *   - numbers must stay inside the 1–9 closure (unexpected number → throw);
 *   - after processing, every expected level among 1–9 must be present.
 *
 * On any violation it throws a deterministic, descriptive `Error` that names
 * the offending or missing token.
 */
export function buildChapter1LevelMap(
  rawLevels: ReadonlyArray<Chapter1RawLevel>,
): Readonly<Record<LevelId, LevelConfig>> {
  const seenIds = new Set<string>();
  const seenNumbers = new Set<number>();

  for (const level of rawLevels) {
    if (!isChapter1LevelNumber(level.number)) {
      throw new Error(
        `Chapter 1 runtime mapping error: unexpected level number ${level.number} (id "${level.id}") outside the 1–9 closure.`,
      );
    }

    const expectedId = chapter1LevelId(level.number);
    if (level.id !== expectedId) {
      throw new Error(
        `Chapter 1 runtime mapping error: level "${level.id}" does not match its number ${level.number} (expected "${expectedId}").`,
      );
    }

    if (seenIds.has(level.id)) {
      throw new Error(`Chapter 1 runtime mapping error: duplicate level id "${level.id}".`);
    }
    if (seenNumbers.has(level.number)) {
      throw new Error(`Chapter 1 runtime mapping error: duplicate level number ${level.number} ("${level.id}").`);
    }

    seenIds.add(level.id);
    seenNumbers.add(level.number);
  }

  const byNumber = new Map(rawLevels.map((level) => [level.number, level]));
  const map: Record<LevelId, LevelConfig> = {} as Record<LevelId, LevelConfig>;

  for (const number of CHAPTER1_LEVEL_NUMBERS) {
    const level = byNumber.get(number);
    if (!level) {
      throw new Error(
        `Chapter 1 runtime mapping error: missing level number ${number} ("${chapter1LevelId(number)}").`,
      );
    }

    map[number] = toLegacyLevelConfig(level, GENERATED_OFFERS, {
      colors: TARGET_COLORS,
      bonusWords: [],
      mentorCues: GAME_MENTOR_CUES.filter(
        (cue) => cue.id !== 'mentor-level-1-start' || number === 1,
      ),
    });
  }

  return map as Readonly<Record<LevelId, LevelConfig>>;
}

export const CHAPTER1_LEVELS = buildChapter1LevelMap(GENERATED_LEVELS);

export function isChapter1LevelId(value: number): value is LevelId {
  return Number.isInteger(value) && value >= 1 && value <= 9;
}

export function getChapter1Level(levelId: number): LevelConfig {
  if (!isChapter1LevelId(levelId)) {
    throw new Error(`Chapter 1 runtime only supports levels 1–9, received ${levelId}.`);
  }

  const level = CHAPTER1_LEVELS[levelId];
  if (!level) {
    throw new Error(
      `Chapter 1 runtime mapping error: level ${levelId} is missing from the validated bundle.`,
    );
  }

  return level;
}

// Keep the existing feature boundary names while the scoped Chapter 1 bundle
// becomes the single active runtime source.
export const LEVELS = CHAPTER1_LEVELS;
export const getLevel = getChapter1Level;

export function getTarget(levelId: LevelId, targetId: string) {
  return getChapter1Level(levelId).targets.find((target) => target.id === targetId);
}