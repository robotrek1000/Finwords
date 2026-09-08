export interface MockPersistenceOptions {
  storage: Storage | null | undefined;
  storageKey: string;
  isDev: boolean;
  apiMode: string;
  search: string;
}

export interface MockPersistence {
  readonly isDisabled: boolean;
  restore(): unknown | null;
  save(value: unknown): void;
  clear(): void;
}

export type MockPersistenceRuntimeOptions = Pick<
  MockPersistenceOptions,
  'isDev' | 'apiMode' | 'search'
>;

function isDisabled({ isDev, apiMode, search }: MockPersistenceOptions): boolean {
  return apiMode === 'mock' && (!isDev ||
    new URLSearchParams(search).get('mockPersistence') === 'off');
}

export function createMockPersistence(options: MockPersistenceOptions): MockPersistence {
  const disabled = isDisabled(options);

  function clear(): void {
    try {
      options.storage?.removeItem(options.storageKey);
    } catch {
      // Browser storage is optional for mock-only state.
    }
  }

  if (disabled) clear();

  return {
    isDisabled: disabled,
    restore() {
      if (disabled) return null;
      const raw = options.storage?.getItem(options.storageKey);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as unknown;
      } catch (error) {
        throw new Error('Persisted mock state contains invalid JSON.', { cause: error });
      }
    },
    save(value) {
      if (disabled) return;
      try {
        options.storage?.setItem(options.storageKey, JSON.stringify(value));
      } catch {
        // Browser storage is optional for mock-only state.
      }
    },
    clear,
  };
}
