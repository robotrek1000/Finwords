import { describe, expect, it } from 'vitest';
import {
  FIGMA_OVERLAY_IDENTITIES,
  FIXTURE_ONLY_BACKGROUND_IDS,
  MOCK_APPEARANCE_IDENTITIES,
  REGISTRY_APPEARANCE_IDENTITIES,
  REGULAR_UNLOCK_ASSET_IDS,
  SPECIAL_UNLOCK_ASSET_IDS,
  appearanceIdentityByWireId,
  createMockAppearanceCatalog,
  nextUnlockAppearance,
} from './appearanceCatalog';

const CHARACTER_LABELS = [
  'Аналитик',
  'Риск-менеджер',
  'Штурман',
  'Исследователь',
  'Инвестор',
  'Авантюрист',
  'Капитан',
  'Адмирал',
];

const BACKGROUND_LABELS = [
  'Базовый',
  'Каюта',
  'Порт',
  'Открытое море',
  'Деловая гавань',
  'Мостик',
  'Золотая бухта',
  'Ночной океан',
  'Горизонт свободы',
];

describe('mock appearance identity adapter', () => {
  it('keeps the API-backed Registry catalog at 14 and adds exactly three Figma-only characters', () => {
    expect(REGISTRY_APPEARANCE_IDENTITIES).toHaveLength(14);
    expect(FIGMA_OVERLAY_IDENTITIES.map((item) => item.assetId)).toEqual([
      'character-risk-manager',
      'character-investor',
      'character-adventurer',
    ]);
    expect(MOCK_APPEARANCE_IDENTITIES).toHaveLength(17);
    expect(new Set(MOCK_APPEARANCE_IDENTITIES.map((item) => item.appearanceId)).size).toBe(17);
    expect(new Set(MOCK_APPEARANCE_IDENTITIES.map((item) => item.adapterKey)).size).toBe(17);
  });

  it('uses exact Figma labels, source assets and only the permitted three fixture background UUIDs', () => {
    const catalog = createMockAppearanceCatalog();
    expect(catalog.filter((item) => item.type === 'character').map((item) => item.title))
      .toEqual(CHARACTER_LABELS);
    expect(catalog.filter((item) => item.type === 'background').map((item) => item.title))
      .toEqual(BACKGROUND_LABELS);
    expect(FIXTURE_ONLY_BACKGROUND_IDS).toHaveLength(3);
    for (const id of FIXTURE_ONLY_BACKGROUND_IDS) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(appearanceIdentityByWireId(id)?.source).toBe('fixture-only-background-uuid');
    }
    expect(MOCK_APPEARANCE_IDENTITIES.some((item) => String(item.assetId) === 'background-error')).toBe(false);
    expect(catalog.every((item) => item.imageUrl.startsWith('/assets/p1/'))).toBe(true);
  });

  it('starts with exactly 2/17 owned and selected analyst/default identities', () => {
    const catalog = createMockAppearanceCatalog();
    expect(catalog.filter((item) => item.isOwned).map((item) =>
      appearanceIdentityByWireId(item.appearanceId)?.assetId,
    )).toEqual(['character-analyst', 'background-default']);
    expect(catalog.filter((item) => item.isSelected).map((item) =>
      appearanceIdentityByWireId(item.appearanceId)?.assetId,
    )).toEqual(['character-analyst', 'background-default']);
  });

  it('unlocks regular and special cosmetics in exact order, skipping owned and exhausting to no cosmetic', () => {
    expect(REGULAR_UNLOCK_ASSET_IDS).toEqual([
      'character-risk-manager',
      'character-navigator',
      'character-researcher',
      'character-investor',
      'character-adventurer',
      'background-cabin',
      'background-port',
      'background-open-sea',
      'background-business-harbor',
    ]);
    expect(SPECIAL_UNLOCK_ASSET_IDS).toEqual([
      'character-captain',
      'character-admiral',
      'background-bridge',
      'background-golden-bay',
      'background-night-ocean',
      'background-freedom-horizon',
    ]);

    const catalog = createMockAppearanceCatalog();
    const firstRegular = nextUnlockAppearance(catalog, 'regular');
    expect(firstRegular && appearanceIdentityByWireId(firstRegular.appearanceId)?.assetId)
      .toBe('character-risk-manager');
    const skipFirst = catalog.map((item) =>
      item.appearanceId === firstRegular?.appearanceId ? { ...item, isOwned: true } : item,
    );
    expect(appearanceIdentityByWireId(nextUnlockAppearance(skipFirst, 'regular')?.appearanceId ?? '')?.assetId)
      .toBe('character-navigator');
    const allOwned = catalog.map((item) => ({ ...item, isOwned: true }));
    expect(nextUnlockAppearance(allOwned, 'regular')).toBeUndefined();
    expect(nextUnlockAppearance(allOwned, 'special')).toBeUndefined();
  });
});
