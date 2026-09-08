import { describe, expect, it } from 'vitest';
import { isBcsDeepLink, normalizeBcsDeepLink } from './deepLink';

describe('normalizeBcsDeepLink', () => {
  it.each([
    ['https://education.example/course', undefined],
    ['javascript:alert(1)', undefined],
    ['bcs:education/how-stocks-work', undefined],
    ['not a URL', undefined],
    ['bcs://EDUCATION/how-stocks-work?source=game', 'bcs://EDUCATION/how-stocks-work?source=game'],
  ])('принимает только нормализуемые bcs-ссылки: %s', (destination, expected) => {
    expect(normalizeBcsDeepLink(destination)).toBe(expected);
  });

  it('возвращает true только для валидной bcs-ссылки', () => {
    expect(isBcsDeepLink('bcs://education/how-stocks-work')).toBe(true);
    expect(isBcsDeepLink('https://education.example/course')).toBe(false);
  });
});
