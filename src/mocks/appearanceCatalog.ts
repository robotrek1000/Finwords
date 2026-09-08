import type { Appearance } from '../infra/api/generated/data-contracts';
import {
  AppearanceRarityEnum,
  AppearanceTypeEnum,
} from '../infra/api/generated/data-contracts';

export type AppearanceAssetId =
  | 'character-analyst'
  | 'character-risk-manager'
  | 'character-navigator'
  | 'character-researcher'
  | 'character-investor'
  | 'character-adventurer'
  | 'character-captain'
  | 'character-admiral'
  | 'background-default'
  | 'background-cabin'
  | 'background-port'
  | 'background-open-sea'
  | 'background-business-harbor'
  | 'background-bridge'
  | 'background-golden-bay'
  | 'background-night-ocean'
  | 'background-freedom-horizon';

export interface MockAppearanceIdentity {
  assetId: AppearanceAssetId;
  appearanceId: string;
  adapterKey: `mock-appearance:${AppearanceAssetId}`;
  source: 'registry' | 'figma-overlay' | 'fixture-only-background-uuid';
  type: AppearanceTypeEnum;
  rarity: AppearanceRarityEnum;
  title: string;
  assetFile: string;
}

function identity(
  value: Omit<MockAppearanceIdentity, 'adapterKey'>,
): MockAppearanceIdentity {
  return { ...value, adapterKey: `mock-appearance:${value.assetId}` };
}

const CHARACTER_IDENTITIES: MockAppearanceIdentity[] = [
  identity({ assetId: 'character-analyst', appearanceId: '1f8fad5b-d9cb-469f-a165-808677289510', source: 'registry', type: AppearanceTypeEnum.Character, rarity: AppearanceRarityEnum.Base, title: 'Аналитик', assetFile: 'character-analyst.png' }),
  identity({ assetId: 'character-risk-manager', appearanceId: '1f8fad5b-d9cb-469f-a165-808677289511', source: 'figma-overlay', type: AppearanceTypeEnum.Character, rarity: AppearanceRarityEnum.Regular, title: 'Риск-менеджер', assetFile: 'character-risk-manager.png' }),
  identity({ assetId: 'character-navigator', appearanceId: '1f8fad5b-d9cb-469f-a165-808677289512', source: 'registry', type: AppearanceTypeEnum.Character, rarity: AppearanceRarityEnum.Regular, title: 'Штурман', assetFile: 'character-navigator.png' }),
  identity({ assetId: 'character-researcher', appearanceId: '1f8fad5b-d9cb-469f-a165-808677289513', source: 'registry', type: AppearanceTypeEnum.Character, rarity: AppearanceRarityEnum.Regular, title: 'Исследователь', assetFile: 'character-researcher.png' }),
  identity({ assetId: 'character-investor', appearanceId: '1f8fad5b-d9cb-469f-a165-808677289514', source: 'figma-overlay', type: AppearanceTypeEnum.Character, rarity: AppearanceRarityEnum.Regular, title: 'Инвестор', assetFile: 'character-investor.png' }),
  identity({ assetId: 'character-adventurer', appearanceId: '1f8fad5b-d9cb-469f-a165-808677289515', source: 'figma-overlay', type: AppearanceTypeEnum.Character, rarity: AppearanceRarityEnum.Regular, title: 'Авантюрист', assetFile: 'character-adventurer.png' }),
  identity({ assetId: 'character-captain', appearanceId: '1f8fad5b-d9cb-469f-a165-808677289516', source: 'registry', type: AppearanceTypeEnum.Character, rarity: AppearanceRarityEnum.Special, title: 'Капитан', assetFile: 'character-captain.png' }),
  identity({ assetId: 'character-admiral', appearanceId: '1f8fad5b-d9cb-469f-a165-808677289517', source: 'registry', type: AppearanceTypeEnum.Character, rarity: AppearanceRarityEnum.Special, title: 'Адмирал', assetFile: 'character-admiral.png' }),
];

const BACKGROUND_IDENTITIES: MockAppearanceIdentity[] = [
  identity({ assetId: 'background-default', appearanceId: '2f8fad5b-d9cb-469f-a165-808677289520', source: 'registry', type: AppearanceTypeEnum.Background, rarity: AppearanceRarityEnum.Base, title: 'Базовый', assetFile: 'pattern-default.svg' }),
  identity({ assetId: 'background-cabin', appearanceId: '2f8fad5b-d9cb-469f-a165-808677289521', source: 'registry', type: AppearanceTypeEnum.Background, rarity: AppearanceRarityEnum.Regular, title: 'Каюта', assetFile: 'pattern-cabin.svg' }),
  identity({ assetId: 'background-port', appearanceId: '2f8fad5b-d9cb-469f-a165-808677289522', source: 'registry', type: AppearanceTypeEnum.Background, rarity: AppearanceRarityEnum.Regular, title: 'Порт', assetFile: 'pattern-port.svg' }),
  identity({ assetId: 'background-open-sea', appearanceId: '2f8fad5b-d9cb-469f-a165-808677289523', source: 'registry', type: AppearanceTypeEnum.Background, rarity: AppearanceRarityEnum.Regular, title: 'Открытое море', assetFile: 'pattern-open-sea.svg' }),
  identity({ assetId: 'background-business-harbor', appearanceId: '2f8fad5b-d9cb-469f-a165-808677289524', source: 'registry', type: AppearanceTypeEnum.Background, rarity: AppearanceRarityEnum.Regular, title: 'Деловая гавань', assetFile: 'pattern-business-harbor.svg' }),
  identity({ assetId: 'background-bridge', appearanceId: '2f8fad5b-d9cb-469f-a165-808677289525', source: 'registry', type: AppearanceTypeEnum.Background, rarity: AppearanceRarityEnum.Special, title: 'Мостик', assetFile: 'pattern-bridge.svg' }),
  // These three valid UUIDs are isolated mock-fixture identities. Registry owns
  // the assetIds, but the current API fixture has no canonical wire UUIDs yet.
  identity({ assetId: 'background-golden-bay', appearanceId: '2f8fad5b-d9cb-469f-a165-808677289526', source: 'fixture-only-background-uuid', type: AppearanceTypeEnum.Background, rarity: AppearanceRarityEnum.Special, title: 'Золотая бухта', assetFile: 'pattern-golden-bay.svg' }),
  identity({ assetId: 'background-night-ocean', appearanceId: '2f8fad5b-d9cb-469f-a165-808677289527', source: 'fixture-only-background-uuid', type: AppearanceTypeEnum.Background, rarity: AppearanceRarityEnum.Special, title: 'Ночной океан', assetFile: 'pattern-night-ocean.svg' }),
  identity({ assetId: 'background-freedom-horizon', appearanceId: '2f8fad5b-d9cb-469f-a165-808677289528', source: 'fixture-only-background-uuid', type: AppearanceTypeEnum.Background, rarity: AppearanceRarityEnum.Special, title: 'Горизонт свободы', assetFile: 'pattern-freedom-horizon.svg' }),
];

export const MOCK_APPEARANCE_IDENTITIES = [
  ...CHARACTER_IDENTITIES,
  ...BACKGROUND_IDENTITIES,
] as readonly MockAppearanceIdentity[];

export const FIGMA_OVERLAY_IDENTITIES = MOCK_APPEARANCE_IDENTITIES.filter(
  (item) => item.source === 'figma-overlay',
);

export const REGISTRY_APPEARANCE_IDENTITIES = MOCK_APPEARANCE_IDENTITIES.filter(
  (item) => item.source !== 'figma-overlay',
);

export const FIXTURE_ONLY_BACKGROUND_IDS = BACKGROUND_IDENTITIES
  .filter((item) => item.source === 'fixture-only-background-uuid')
  .map((item) => item.appearanceId);

export const REGULAR_UNLOCK_ASSET_IDS: readonly AppearanceAssetId[] = [
  'character-risk-manager',
  'character-navigator',
  'character-researcher',
  'character-investor',
  'character-adventurer',
  'background-cabin',
  'background-port',
  'background-open-sea',
  'background-business-harbor',
];

export const SPECIAL_UNLOCK_ASSET_IDS: readonly AppearanceAssetId[] = [
  'character-captain',
  'character-admiral',
  'background-bridge',
  'background-golden-bay',
  'background-night-ocean',
  'background-freedom-horizon',
];

const identityByWireId = new Map(
  MOCK_APPEARANCE_IDENTITIES.map((item) => [item.appearanceId, item]),
);
const identityByAssetId = new Map(
  MOCK_APPEARANCE_IDENTITIES.map((item) => [item.assetId, item]),
);

export function appearanceIdentityByWireId(
  appearanceId: string,
): MockAppearanceIdentity | undefined {
  return identityByWireId.get(appearanceId);
}

export function appearanceIdentityByAssetId(
  assetId: AppearanceAssetId,
): MockAppearanceIdentity | undefined {
  return identityByAssetId.get(assetId);
}

export function createMockAppearanceCatalog(
  ownedAssetIds: readonly AppearanceAssetId[] = ['character-analyst', 'background-default'],
): Appearance[] {
  const owned = new Set(ownedAssetIds);
  return MOCK_APPEARANCE_IDENTITIES.map((item) => ({
    appearanceId: item.appearanceId,
    type: item.type,
    rarity: item.rarity,
    title: item.title,
    description: item.source === 'figma-overlay'
      ? 'Mock-only персонаж коллекции Финвордов'
      : 'Облик коллекции Финвордов',
    imageUrl: `${import.meta.env.BASE_URL}assets/p1/${item.assetFile}`,
    isOwned: owned.has(item.assetId),
    isSelected: item.assetId === 'character-analyst' || item.assetId === 'background-default',
    ...(owned.has(item.assetId) ? { unlockedAt: '2026-08-20T08:00:00.000Z' } : {}),
  }));
}

export function nextUnlockAppearance(
  catalog: readonly Appearance[],
  pool: 'regular' | 'special',
): Appearance | undefined {
  const byAssetId = new Map(
    catalog.map((item) => [appearanceIdentityByWireId(item.appearanceId)?.assetId, item]),
  );
  const order = pool === 'regular' ? REGULAR_UNLOCK_ASSET_IDS : SPECIAL_UNLOCK_ASSET_IDS;
  return order.map((assetId) => byAssetId.get(assetId)).find((item) => item && !item.isOwned);
}
