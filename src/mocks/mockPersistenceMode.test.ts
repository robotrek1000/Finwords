import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLegacyMockState,
  createMockPersistence,
  LEGACY_MOCK_STORAGE_KEY,
} from './mockPersistence';

describe('standalone mock persistence boundary', () => {
  beforeEach(() => window.localStorage.clear());

  it('clears and disables browser persistence', () => {
    window.localStorage.setItem(LEGACY_MOCK_STORAGE_KEY, JSON.stringify({ progress: true }));
    const persistence = createMockPersistence({
      storage: window.localStorage,
      storageKey: LEGACY_MOCK_STORAGE_KEY,
      mode: 'browser',
    });

    expect(persistence.isDisabled).toBe(true);
    expect(persistence.restore()).toBeNull();
    persistence.save({ progress: true });
    expect(window.localStorage.getItem(LEGACY_MOCK_STORAGE_KEY)).toBeNull();
  });

  it('keeps persistence only in explicit test mode for migration coverage', () => {
    const persistence = createMockPersistence({
      storage: window.localStorage,
      storageKey: LEGACY_MOCK_STORAGE_KEY,
      mode: 'test',
    });
    persistence.save({ schemaVersion: 1 });
    expect(persistence.restore()).toEqual({ schemaVersion: 1 });
  });

  it('safely removes the previous browser key at bootstrap', () => {
    window.localStorage.setItem(LEGACY_MOCK_STORAGE_KEY, 'old progress');
    clearLegacyMockState(window.localStorage);
    expect(window.localStorage.getItem(LEGACY_MOCK_STORAGE_KEY)).toBeNull();
  });
});
