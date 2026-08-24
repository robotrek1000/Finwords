export const LEGACY_MOCK_STORAGE_KEY = 'finwords:p1-mock-backend:v1';

export type MockPersistenceMode = 'browser' | 'test';

export interface MockPersistenceOptions {
  storage: Storage | null | undefined;
  storageKey: string;
  mode: MockPersistenceMode;
}

export interface MockPersistence {
  readonly isDisabled: boolean;
  restore(): unknown | null;
  save(value: unknown): void;
  clear(): void;
}

export type MockPersistenceRuntimeOptions = Pick<MockPersistenceOptions, 'mode'>;

export function clearLegacyMockState(storage: Storage | null | undefined): void {
  try {
    storage?.removeItem(LEGACY_MOCK_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in private browsing or restricted web views.
  }
}

export function createMockPersistence(options: MockPersistenceOptions): MockPersistence {
  const disabled = options.mode !== 'test';

  function clear(): void {
    try {
      options.storage?.removeItem(options.storageKey);
    } catch {
      // Standalone gameplay never depends on browser storage.
    }
  }

  if (disabled) clear();

  return {
    isDisabled: disabled,
    restore() {
      if (disabled) return null;
      try {
        const raw = options.storage?.getItem(options.storageKey);
        return raw ? JSON.parse(raw) as unknown : null;
      } catch {
        clear();
        return null;
      }
    },
    save(value) {
      if (disabled) return;
      try {
        options.storage?.setItem(options.storageKey, JSON.stringify(value));
      } catch {
        // Test-only persistence remains optional.
      }
    },
    clear,
  };
}
