import { beforeEach, describe, expect, it } from 'vitest';
import { createMockPersistence } from './mockPersistence';

const STORAGE_KEY = 'finwords:p1-mock-backend:v1';

describe('P5 mock persistence mode', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it.each([
    ['DEV mock with mockPersistence=off', true, 'mock', '?mockPersistence=off', true],
    ['DEV real API with mockPersistence=off', true, 'http', '?mockPersistence=off', false],
    ['production mock with mockPersistence=off', false, 'mock', '?mockPersistence=off', true],
    ['production mock resets by default', false, 'mock', '', true],
    ['normal mock URL', true, 'mock', '', false],
  ] as const)('%s applies persistence boundary without affecting real API', (
    _, isDev, apiMode, search, disabled,
  ) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ persisted: true }));
    const persistence = createMockPersistence({
      storage: window.localStorage,
      storageKey: STORAGE_KEY,
      isDev,
      apiMode,
      search,
    });

    if (disabled) {
      expect(persistence.restore()).toBeNull();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
      persistence.save({ persisted: false });
      expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
      return;
    }

    expect(persistence.restore()).toEqual({ persisted: true });
    persistence.save({ persisted: false });
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({ persisted: false });
  });
});
