import type { LevelConfig, LevelId, MentorCue } from '../app/types';
import artAssets from './mock-generated/campaign/catalogs/art-assets.json';
import mentorCues from './mock-generated/campaign/catalogs/mentor-cues.json';
import offers from './mock-generated/campaign/catalogs/offers.json';
import chapters from './mock-generated/campaign/chapters.json';
import level01 from './mock-generated/campaign/levels/level-01.json';
import level02 from './mock-generated/campaign/levels/level-02.json';
import level03 from './mock-generated/campaign/levels/level-03.json';
import level04 from './mock-generated/campaign/levels/level-04.json';
import level05 from './mock-generated/campaign/levels/level-05.json';
import level06 from './mock-generated/campaign/levels/level-06.json';
import level07 from './mock-generated/campaign/levels/level-07.json';
import level08 from './mock-generated/campaign/levels/level-08.json';
import level09 from './mock-generated/campaign/levels/level-09.json';
import level10 from './mock-generated/campaign/levels/level-10.json';
import level11 from './mock-generated/campaign/levels/level-11.json';
import level12 from './mock-generated/campaign/levels/level-12.json';
import level13 from './mock-generated/campaign/levels/level-13.json';
import level14 from './mock-generated/campaign/levels/level-14.json';
import level15 from './mock-generated/campaign/levels/level-15.json';
import level16 from './mock-generated/campaign/levels/level-16.json';
import level17 from './mock-generated/campaign/levels/level-17.json';
import level18 from './mock-generated/campaign/levels/level-18.json';
import level19 from './mock-generated/campaign/levels/level-19.json';
import level20 from './mock-generated/campaign/levels/level-20.json';
import level21 from './mock-generated/campaign/levels/level-21.json';
import level22 from './mock-generated/campaign/levels/level-22.json';
import level23 from './mock-generated/campaign/levels/level-23.json';
import level24 from './mock-generated/campaign/levels/level-24.json';
import level25 from './mock-generated/campaign/levels/level-25.json';
import level26 from './mock-generated/campaign/levels/level-26.json';
import level27 from './mock-generated/campaign/levels/level-27.json';
import level28 from './mock-generated/campaign/levels/level-28.json';
import level29 from './mock-generated/campaign/levels/level-29.json';
import level30 from './mock-generated/campaign/levels/level-30.json';
import level31 from './mock-generated/campaign/levels/level-31.json';
import level32 from './mock-generated/campaign/levels/level-32.json';
import level33 from './mock-generated/campaign/levels/level-33.json';
import level34 from './mock-generated/campaign/levels/level-34.json';
import level35 from './mock-generated/campaign/levels/level-35.json';
import level36 from './mock-generated/campaign/levels/level-36.json';
import level37 from './mock-generated/campaign/levels/level-37.json';
import level38 from './mock-generated/campaign/levels/level-38.json';
import level39 from './mock-generated/campaign/levels/level-39.json';
import level40 from './mock-generated/campaign/levels/level-40.json';
import level41 from './mock-generated/campaign/levels/level-41.json';
import level42 from './mock-generated/campaign/levels/level-42.json';
import level43 from './mock-generated/campaign/levels/level-43.json';
import level44 from './mock-generated/campaign/levels/level-44.json';
import level45 from './mock-generated/campaign/levels/level-45.json';
import level46 from './mock-generated/campaign/levels/level-46.json';
import level47 from './mock-generated/campaign/levels/level-47.json';
import level48 from './mock-generated/campaign/levels/level-48.json';
import level49 from './mock-generated/campaign/levels/level-49.json';
import level50 from './mock-generated/campaign/levels/level-50.json';
import { toLegacyLevelConfig } from './generatedAdapter';

const TARGET_COLORS = [
  '#86d3f4',
  '#b8e8a2',
  '#f8d775',
  '#cfb7f6',
  '#f5a6c8',
  '#8ee0cf',
  '#ffb47a',
];
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
const CAMPAIGN_LEVEL_NUMBERS = Array.from({ length: 50 }, (_unused, index) => index + 1);

type CampaignRawLevel = Parameters<typeof toLegacyLevelConfig>[0] & { id: string };

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
  level10,
  level11,
  level12,
  level13,
  level14,
  level15,
  level16,
  level17,
  level18,
  level19,
  level20,
  level21,
  level22,
  level23,
  level24,
  level25,
  level26,
  level27,
  level28,
  level29,
  level30,
  level31,
  level32,
  level33,
  level34,
  level35,
  level36,
  level37,
  level38,
  level39,
  level40,
  level41,
  level42,
  level43,
  level44,
  level45,
  level46,
  level47,
  level48,
  level49,
  level50,
] as unknown as CampaignRawLevel[];
const GENERATED_OFFERS = offers as unknown as Parameters<typeof toLegacyLevelConfig>[1];
const GAME_MENTOR_CUES: MentorCue[] = mentorCues
  .filter((cue) => REAL_GAME_CUE_IDS.has(cue.cueId))
  .map((cue) => ({ id: cue.cueId, message: cue.message }));

export const CAMPAIGN_APPEARANCE_ASSETS = artAssets;
export const CAMPAIGN_CHAPTERS = chapters;

function campaignLevelId(number: number): string {
  return `level-${String(number).padStart(2, '0')}`;
}

export function isCampaignLevelId(value: number): value is LevelId {
  return Number.isInteger(value) && value >= 1 && value <= 50;
}

export function buildCampaignLevelMap(
  rawLevels: ReadonlyArray<CampaignRawLevel>,
  rawOffers = GENERATED_OFFERS,
): Readonly<Record<LevelId, LevelConfig>> {
  const seenIds = new Set<string>();
  const seenNumbers = new Set<number>();

  for (const level of rawLevels) {
    if (!isCampaignLevelId(level.number)) {
      throw new Error(
        `Campaign runtime mapping error: unexpected level number ${level.number} (id "${level.id}") outside the 1–50 closure.`,
      );
    }
    const expectedId = campaignLevelId(level.number);
    if (level.id !== expectedId) {
      throw new Error(
        `Campaign runtime mapping error: level "${level.id}" does not match its number ${level.number} (expected "${expectedId}").`,
      );
    }
    if (seenIds.has(level.id)) {
      throw new Error(`Campaign runtime mapping error: duplicate level id "${level.id}".`);
    }
    if (seenNumbers.has(level.number)) {
      throw new Error(`Campaign runtime mapping error: duplicate level number ${level.number} ("${level.id}").`);
    }
    seenIds.add(level.id);
    seenNumbers.add(level.number);
  }

  const byNumber = new Map(rawLevels.map((level) => [level.number, level]));
  const map: Record<LevelId, LevelConfig> = {};

  for (const number of CAMPAIGN_LEVEL_NUMBERS) {
    const level = byNumber.get(number);
    if (!level) {
      throw new Error(
        `Campaign runtime mapping error: missing level number ${number} ("${campaignLevelId(number)}").`,
      );
    }
    map[number] = toLegacyLevelConfig(level, rawOffers, {
      colors: TARGET_COLORS,
      bonusWords: [],
      mentorCues: GAME_MENTOR_CUES.filter(
        (cue) => cue.id !== 'mentor-level-1-start' || number === 1,
      ),
    });
  }

  return map;
}

export const CAMPAIGN_LEVELS = buildCampaignLevelMap(GENERATED_LEVELS);

export function getCampaignLevel(levelId: number): LevelConfig {
  if (!isCampaignLevelId(levelId)) {
    throw new Error(`Campaign runtime only supports levels 1–50, received ${levelId}.`);
  }
  const level = CAMPAIGN_LEVELS[levelId];
  if (!level) {
    throw new Error(
      `Campaign runtime mapping error: level ${levelId} is missing from the validated bundle.`,
    );
  }
  return level;
}

export const LEVELS = CAMPAIGN_LEVELS;
export const getLevel = getCampaignLevel;

export function getTarget(levelId: LevelId, targetId: string) {
  const target = getCampaignLevel(levelId).targets.find((target) => target.id === targetId);
  if (!target) {
    throw new Error(
      `Campaign runtime mapping error: level ${levelId} has no target "${targetId}".`,
    );
  }
  return target;
}
