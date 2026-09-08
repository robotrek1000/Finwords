import type { LevelConfig, LevelId, MentorCue, WordOffer } from '../app/types';

/**
 * Adapter boundary between the deterministic content pipeline and the legacy
 * runtime types.
 *
 * Contract:
 * - Accepts ONLY pipeline-validated input. The caller is responsible for
 *   running the content pipeline (registry normalization, grid validation and
 *   generation) before calling this adapter. This adapter performs no
 *   re-validation and trusts the input shape produced by the pipeline.
 * - `GeneratedLevel.targets` are sorted deterministically by `order`; the
 *   legacy `color` is assigned by sorted position (options.colors[index]).
 * - `autoShowPriority` is intentionally NOT mapped. The Content Registry has
 *   no `autoShowPriority` field and all scoped Chapter 1 offers are non-auto.
 * - Registry destinations remain `TBD`; this mock-only adapter exposes an
 *   isolated `mock://{type}/{offerId}` prototype deep link instead of making a
 *   production destination claim.
 */

interface GeneratedCoordinate {
  row: number;
  col: number;
}

interface GeneratedTarget {
  targetId: string;
  order: number;
  word: string;
  definition: string;
  offerId?: string;
  canonicalPath: GeneratedCoordinate[];
}

interface GeneratedLevel {
  number: number;
  microtheme: string;
  grid: string[][];
  targets: GeneratedTarget[];
}

interface GeneratedOffer {
  offerId: string;
  type: 'course' | 'product';
  badge: string;
  title: string;
  description: string;
  cta: string;
  destination: string;
  campaignId: string;
  autoShow: boolean;
}

interface AdapterOptions {
  colors: string[];
  bonusWords: string[];
  mentorCues: MentorCue[];
}

function toLegacyLevelId(number: number): LevelId {
  if (!Number.isInteger(number) || number < 1 || number > 50) {
    throw new Error(`Campaign runtime only supports levels 1–50, received ${number}.`);
  }
  return number;
}

function toLegacyOffer(target: GeneratedTarget, offer: GeneratedOffer): WordOffer {
  return {
    id: offer.offerId,
    type: offer.type,
    title: offer.title,
    definition: target.definition,
    badgeLabel: offer.badge,
    description: offer.description,
    ctaLabel: offer.cta,
    destination: `mock://${offer.type}/${offer.offerId}`,
    autoShow: offer.autoShow,
    campaignId: offer.campaignId,
  };
}

export function toLegacyLevelConfig(
  level: GeneratedLevel,
  offers: GeneratedOffer[],
  options: AdapterOptions,
): LevelConfig {
  const offersById = new Map(offers.map((offer) => [offer.offerId, offer]));
  const targets = [...level.targets]
    .sort((left, right) => left.order - right.order)
    .map((target, index) => {
      const color = options.colors[index];
      if (!color) throw new Error(`Missing legacy color for target ${target.targetId}.`);
      const offer = target.offerId ? offersById.get(target.offerId) : undefined;
      if (target.offerId && !offer) throw new Error(`Missing offer ${target.offerId}.`);
      return {
        id: target.targetId,
        word: target.word,
        path: target.canonicalPath.map(({ row, col }) => `${row + 1}:${col + 1}` as const),
        definition: target.definition,
        ...(offer ? { offer: toLegacyOffer(target, offer) } : {}),
        color,
      };
    });

  return {
    id: toLegacyLevelId(level.number),
    title: level.microtheme,
    grid: level.grid.map((row) => [...row]),
    targets,
    bonusWords: [...options.bonusWords],
    mentorCues: options.mentorCues.map((cue) => ({ ...cue })),
  };
}
