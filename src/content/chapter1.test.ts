import { describe, expect, it, vi } from 'vitest';
import type { LevelConfig } from '../app/types';
import * as chapter1Runtime from './chapter1';
import { CHAPTER1_LEVELS, getChapter1Level } from './chapter1';
import { toLegacyLevelConfig } from './generatedAdapter';
import mentorCueCatalog from './mock-generated/chapter-01/catalogs/mentor-cues.json';

const EXPECTED_WORDS = [
  ['ЧЕК', 'ЛОТ', 'АКТ'],
  ['ИИС', 'ПИФ', 'ПАЙ'],
  ['ИНН', 'БИК', 'НДС'],
  ['БАНК', 'ФОНД', 'РИСК', 'ДОЛГ'],
  ['ПЛАН', 'ЦЕЛЬ', 'СРОК', 'УЧЁТ'],
  ['РОСТ', 'СПАД', 'КУРС', 'ЦЕНА'],
  ['ЕВРО', 'ЮАНЬ', 'ДРАМ', 'ЛИРА'],
  ['ЛОНГ', 'ШОРТ', 'РЕПО', 'ТОРГ'],
  ['ПЛЮС', 'НОЛЬ', 'ИТОГ', 'ДОЛЯ'],
];

describe('scoped Chapter 1 runtime adapter', () => {
  it('provides all and only real Registry levels 1–9 without invented bonus words', () => {
    expect(Object.keys(CHAPTER1_LEVELS)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    for (const [index, words] of EXPECTED_WORDS.entries()) {
      const level = getChapter1Level(index + 1);
      expect(level.targets.map((target) => target.word)).toEqual(words);
      expect(level.bonusWords).toEqual([]);
    }
  });

  it('maps the four Registry offers to mock-only deep links without auto-show', () => {
    const offers = Object.values(CHAPTER1_LEVELS)
      .flatMap((level) => level.targets)
      .flatMap((target) => target.offer ? [target.offer] : []);

    expect(offers.map((offer) => [offer.id, offer.type, offer.destination, offer.autoShow])).toEqual([
      ['offer-02', 'product', 'mock://product/offer-02', false],
      ['offer-04', 'product', 'mock://product/offer-04', false],
      ['offer-06', 'course', 'mock://course/offer-06', false],
      ['offer-08', 'product', 'mock://product/offer-08', false],
    ]);
  });

  it('keeps all Registry mentor triggers and maps gameplay cues without invented level references', () => {
    expect(mentorCueCatalog.map(({ cueId, trigger, frequency }) => [cueId, trigger, frequency])).toEqual([
      ['mentor-course', 'offer_target_found', 'once_per_offer'],
      ['mentor-definition-reminder', 'ordinary_target_found', 'once_per_level_1_to_5'],
      ['mentor-first-hint', 'hint_used', 'once_per_campaign'],
      ['mentor-first-target', 'target_found', 'once_per_campaign'],
      ['mentor-level-1-start', 'level_start', 'once_per_level_1'],
      ['mentor-one-left', 'remaining_targets', 'once_per_level'],
      ['mentor-product', 'offer_target_found', 'once_per_offer'],
      ['mentor-three-errors', 'invalid_streak', 'once_per_level'],
      ['mentor-tutorial-bonus', 'tutorial', 'once_per_tutorial'],
      ['mentor-tutorial-definition', 'tutorial', 'once_per_tutorial'],
      ['mentor-tutorial-lock', 'tutorial', 'once_per_tutorial'],
      ['mentor-tutorial-reverse', 'tutorial', 'once_per_tutorial'],
      ['mentor-tutorial-start', 'tutorial', 'once_per_tutorial'],
      ['mentor-tutorial-turn', 'tutorial', 'once_per_tutorial'],
      ['mentor-two-left', 'remaining_targets', 'once_per_level'],
    ]);

    const catalogById = new Map(mentorCueCatalog.map((cue) => [cue.cueId, cue]));
    const runtimeCueIds = new Set(
      Object.values(CHAPTER1_LEVELS).flatMap((level) =>
        level.mentorCues.map((cue) => {
          expect(catalogById.get(cue.id)?.message).toBe(cue.message);
          expect(catalogById.get(cue.id)?.trigger).not.toBe('tutorial');
          return cue.id;
        }),
      ),
    );

    expect([...runtimeCueIds].sort()).toEqual([
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
    expect(getChapter1Level(1).mentorCues.some((cue) => cue.id === 'mentor-level-1-start')).toBe(true);
    for (let levelNumber = 2; levelNumber <= 9; levelNumber += 1) {
      expect(getChapter1Level(levelNumber).mentorCues.some((cue) => cue.id === 'mentor-level-1-start')).toBe(false);
    }
  });

  it('accepts campaign level IDs through 50 and rejects values outside the campaign', () => {
    const generated = {
      number: 3,
      microtheme: 'Тест',
      grid: [['А', 'Б', 'В'], ['Г', 'Д', 'Е'], ['Ж', 'З', 'И']],
      targets: [{
        targetId: 'target-03-01',
        order: 1,
        word: 'АБВ',
        definition: 'Тест',
        canonicalPath: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }],
      }],
    };
    const options = { colors: ['#86d3f4'], bonusWords: [], mentorCues: [] };

    expect(toLegacyLevelConfig(generated, [], options).id).toBe(3);
    expect(toLegacyLevelConfig({ ...generated, number: 10 }, [], options).id).toBe(10);
    expect(toLegacyLevelConfig({ ...generated, number: 50 }, [], options).id).toBe(50);
    expect(() => toLegacyLevelConfig({ ...generated, number: 51 }, [], options))
      .toThrow('Campaign runtime only supports levels 1–50, received 51.');
  });
});

// ---------------------------------------------------------------------------
// RED regression contracts (CB-06): fail-closed Chapter1 runtime mapping.
// Production change to land in `src/content/chapter1.ts` (tests unchanged):
//   - export pure builder `buildChapter1LevelMap(rawLevels): Readonly<Record<LevelId, LevelConfig>>`
//     which validates the explicit bijection `level-01→1 … level-09→9` and throws a
//     deterministic descriptive Error on: id/number mismatch, duplicate level.number/mapping,
//     missing level among 1–9, unexpected id/number outside the closure.
//   - `getChapter1Level` must throw a controlled Error when the requested mapped value is
//     absent instead of returning `undefined` under the `LevelConfig` type.
// ---------------------------------------------------------------------------

interface FixtureTarget {
  targetId: string;
  order: number;
  word: string;
  definition: string;
  canonicalPath: Array<{ row: number; col: number }>;
}

interface FixtureRawLevel {
  id: string;
  number: number;
  microtheme: string;
  grid: string[][];
  targets: FixtureTarget[];
}

const LEVEL_CLOSURE_IDS = [
  'level-01',
  'level-02',
  'level-03',
  'level-04',
  'level-05',
  'level-06',
  'level-07',
  'level-08',
  'level-09',
] as const;

function makeRawLevel(id: string, number: number): FixtureRawLevel {
  return {
    id,
    number,
    microtheme: `Микротема ${number}`,
    grid: [['А', 'Б', 'В'], ['Г', 'Д', 'Е'], ['Ж', 'З', 'И']],
    targets: [
      {
        targetId: `target-${id}`,
        order: 1,
        word: 'АБВ',
        definition: 'Тестовая дефиниция',
        canonicalPath: [
          { row: 0, col: 0 },
          { row: 0, col: 1 },
          { row: 0, col: 2 },
        ],
      },
    ],
  };
}

function allValidChapter1Levels(): FixtureRawLevel[] {
  return LEVEL_CLOSURE_IDS.map((id, index) => makeRawLevel(id, index + 1));
}

type BuildChapter1LevelMap = (rawLevels: FixtureRawLevel[]) => Readonly<Record<number, LevelConfig>>;

function requireBuildChapter1LevelMap(): BuildChapter1LevelMap {
  const candidate = (chapter1Runtime as unknown as { buildChapter1LevelMap?: unknown })
    .buildChapter1LevelMap;
  expect(candidate, 'buildChapter1LevelMap отсутствует в src/content/chapter1.ts (RED-контракт)').toBeTypeOf(
    'function',
  );
  return candidate as BuildChapter1LevelMap;
}

describe('buildChapter1LevelMap (RED-контракт CB-06: fail-closed runtime mapping)', () => {
  it('экспортирует чистый fail-closed builder для raw generated levels', () => {
    const candidate = (chapter1Runtime as unknown as { buildChapter1LevelMap?: unknown })
      .buildChapter1LevelMap;
    expect(candidate, 'buildChapter1LevelMap отсутствует в src/content/chapter1.ts (RED-контракт)').toBeTypeOf(
      'function',
    );
  });

  it('строит явную биекцию level-01→1 … level-09→9', () => {
    const build = requireBuildChapter1LevelMap();

    const map = build(allValidChapter1Levels());

    expect(Object.keys(map).sort((left, right) => Number(left) - Number(right))).toEqual([
      '1', '2', '3', '4', '5', '6', '7', '8', '9',
    ]);
    for (const [index] of LEVEL_CLOSURE_IDS.entries()) {
      const mapped = map[index + 1];
      expect(mapped.id).toBe(index + 1);
      expect(mapped.title).toBe(`Микротема ${index + 1}`);
    }
  });

  it('отвергает рассинхрон id и number (level-02 с number 1 и наоборот)', () => {
    const build = requireBuildChapter1LevelMap();
    const levels = allValidChapter1Levels();
    levels[0] = { ...levels[0], id: 'level-02' };
    levels[1] = { ...levels[1], id: 'level-01' };

    expect(() => build(levels)).toThrow(/level-0[12]/);
  });

  it('не перезаписывает молча дубликат level.number / mapping', () => {
    const build = requireBuildChapter1LevelMap();
    const levels = allValidChapter1Levels();

    expect(() => build([...levels, makeRawLevel('level-04', 4)])).toThrow(/level-04/);
    expect(() => build([...levels, makeRawLevel('level-44', 4)])).toThrow();
  });

  it('fail fast при отсутствии одного из уровней 1–9 (level-05)', () => {
    const build = requireBuildChapter1LevelMap();
    const levels = allValidChapter1Levels().filter((level) => level.id !== 'level-05');

    expect(() => build(levels)).toThrow(/level-05/);
  });

  it('fail fast при unexpected id/number вне closure (level-10 / level-00)', () => {
    const build = requireBuildChapter1LevelMap();

    expect(() => build([...allValidChapter1Levels(), makeRawLevel('level-10', 10)])).toThrow();
    expect(() => build([makeRawLevel('level-00', 0), ...allValidChapter1Levels()])).toThrow();
  });
});

describe('getChapter1Level (RED-контракт: никогда не возвращает undefined под типом LevelConfig)', () => {
  it('не инициализирует corrupted module: import отклоняется, типизированный undefined недоступен', async () => {
    // Симулируем повреждённый bundle: level-09.json дублирует level-08 (number 8).
    // Fail-closed-валидатор падает на duplicate level id ещё на этапе module init,
    // поэтому динамический import должен отклониться controlled descriptive error,
    // а не отдать карту, в которой уровень 9 доступен как undefined под типом LevelConfig.
    vi.resetModules();
    vi.doMock('./mock-generated/chapter-01/levels/level-09.json', () => ({
      default: makeRawLevel('level-08', 8),
    }));

    await expect(import('./chapter1')).rejects.toThrow(/duplicate level id "level-08"/);
  });
});
