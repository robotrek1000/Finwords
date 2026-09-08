import { describe, expect, it } from 'vitest';
import {
  buildCampaignLevelMap,
  CAMPAIGN_CHAPTERS,
  CAMPAIGN_LEVELS,
  getCampaignLevel,
  getTarget,
} from './campaign';

describe('Stage 5 full campaign runtime mapping', () => {
  it('maps exactly 50 levels and seven chapters from the campaign bundle', () => {
    expect(Object.keys(CAMPAIGN_LEVELS).map(Number)).toEqual(
      Array.from({ length: 50 }, (_unused, index) => index + 1),
    );
    expect(CAMPAIGN_CHAPTERS.map(({ chapterId, number }) => [chapterId, number])).toEqual(
      Array.from({ length: 7 }, (_unused, index) => (
        [`chapter-${String(index + 1).padStart(2, '0')}`, index + 1]
      )),
    );
    expect(getCampaignLevel(31).targets.some(({ word }) => word === 'КОДЕКС')).toBe(true);
    expect(getCampaignLevel(37).targets.some(({ word }) => word === 'СОПЕРНИК')).toBe(true);
    expect(getCampaignLevel(46).targets.some(({ word }) => word === 'СОСТАВ')).toBe(true);
  });

  it('fails closed for missing and duplicate raw levels', () => {
    const rawLevels = Array.from({ length: 50 }, (_unused, index) => ({
      id: `level-${String(index + 1).padStart(2, '0')}`,
      number: index + 1,
      microtheme: `Level ${index + 1}`,
      grid: [['А']],
      targets: [],
    }));

    expect(() => buildCampaignLevelMap(rawLevels.slice(1), [])).toThrow(/missing level number 1/);
    expect(() => buildCampaignLevelMap([...rawLevels, rawLevels[0]], []))
      .toThrow(/duplicate level id/);
    expect(() => buildCampaignLevelMap([
      { ...rawLevels[0], id: 'level-02' },
      ...rawLevels.slice(1),
    ], [])).toThrow(/does not match its number/);
    expect(() => buildCampaignLevelMap([
      ...rawLevels,
      { ...rawLevels[0], id: 'level-51', number: 51 },
    ], [])).toThrow(/outside the 1–50 closure/);
  });

  it('fails closed for an unknown targetId inside a valid level', () => {
    const levelId = 1;
    const targetId = 'no-such-target';

    expect(() => getTarget(levelId, targetId)).toThrow(
      new RegExp(`${levelId}.*${targetId}`),
    );
  });
});
