import { describe, expect, it } from 'vitest';
import {
  lightenColor,
  resolveTargetPresentation,
} from './targetPresentation';

describe('resolveTargetPresentation', () => {
  it('maps all seven Level1 words to their canonical folded-corner orientation', () => {
    const expected: Record<string, string> = {
      ФОНД: 'bottom-right',
      КАПИТАЛ: 'top-left',
      АКЦИЯ: 'bottom-right',
      РИСК: 'bottom-right',
      РЫНОК: 'top-left',
      ИНДЕКС: 'top-left',
      ДОХОД: 'bottom-right',
    };
    for (const [word, corner] of Object.entries(expected)) {
      expect(resolveTargetPresentation(1, word).corner).toBe(corner);
    }
  });

  it('maps each word to its Level1 target color', () => {
    const expected: Record<string, string> = {
      ФОНД: '#52C7B8',
      КАПИТАЛ: '#F6C945',
      АКЦИЯ: '#8B7CF6',
      РИСК: '#FF8A72',
      РЫНОК: '#55A6F7',
      ИНДЕКС: '#EF83BA',
      ДОХОД: '#75C96B',
    };
    for (const [word, color] of Object.entries(expected)) {
      expect(resolveTargetPresentation(1, word).color).toBe(color);
    }
  });

  it('is level-aware: resolves a word only within the supplied level', () => {
    const level1 = resolveTargetPresentation(1, 'ФОНД');
    expect(level1.corner).toBe('bottom-right');
    expect(level1.color).toBe('#52C7B8');

    // ФОНД не существует на уровне 2 — деградируем, а не бросаем.
    const level2 = resolveTargetPresentation(2, 'ФОНД');
    expect(level2.linked).toBe(false);
    expect(level2.offer).toBeUndefined();
  });

  it('exposes the canonical first CellRef/CellId for the marker anchor', () => {
    const presentation = resolveTargetPresentation(1, 'ФОНД');
    expect(presentation.firstCell).toEqual({ row: 1, col: 4 });
    expect(presentation.firstCellId).toBe('2:5');
  });

  it('flags only АКЦИЯ as course-linked with the mini-course offer', () => {
    const linked = ['ФОНД', 'КАПИТАЛ', 'АКЦИЯ', 'РИСК', 'РЫНОК', 'ИНДЕКС', 'ДОХОД']
      .map((word) => resolveTargetPresentation(1, word))
      .filter((presentation) => presentation.linked);
    expect(linked).toHaveLength(1);
    expect(linked[0].word).toBe('АКЦИЯ');
    expect(linked[0].offer?.type).toBe('course');
    expect(linked[0].offer?.badgeLabel).toBe('Мини-курс');
  });

  it('degrades an unknown word to a non-linked presentation without marker metadata', () => {
    const presentation = resolveTargetPresentation(1, 'НЕИЗВЕСТНО');
    expect(presentation.linked).toBe(false);
    expect(presentation.offer).toBeUndefined();
  });

  it('exposes manual autoShow=false so the course never auto-opens', () => {
    expect(resolveTargetPresentation(1, 'АКЦИЯ').offer?.autoShow).toBe(false);
  });
});

describe('lightenColor', () => {
  it('lightens a known color by 25%', () => {
    // #000000 + (255 - 0) * 0.25 = 63.75 -> 0x40
    expect(lightenColor('#000000', 0.25)).toBe('#404040');
  });

  it('keeps white white', () => {
    expect(lightenColor('#ffffff', 0.25)).toBe('#ffffff');
  });

  it('keeps black black', () => {
    expect(lightenColor('#000000', 0)).toBe('#000000');
  });

  it('lightens a mid-tone color by 25%', () => {
    // #52C7B8 -> r=0x52=82, g=0xC7=199, b=0xB8=184
    // r: 82 + (255-82)*0.25 = 82 + 43.25 = 125.25 -> 125 = 0x7D
    // g: 199 + (255-199)*0.25 = 199 + 14 = 213 = 0xD5
    // b: 184 + (255-184)*0.25 = 184 + 17.75 = 201.75 -> 202 = 0xCA
    expect(lightenColor('#52C7B8', 0.25)).toBe('#7dd5ca');
  });
});
