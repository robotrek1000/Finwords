/**
 * Mutation protocol coordinator (D11).
 *
 * Sole owner of idempotent intent identity: `intentId` / `key` /
 * `requestGeneration` / `bodyHash`. There is a single active intent at a time:
 * a new intent issues new UUIDs and deactivates the previous active intent;
 * retry / timeout / conflict of the same intent reuse the same `key` while
 * monotonically incrementing `requestGeneration`; success or terminal conflict
 * clears the intent; a changed body or a new intent gets a new key. The stale
 * guard is by local `requestGeneration` + active intent identity — never by
 * ETag. This module does not store ETags.
 */

export interface MutationIntent {
  intentId: string;
  key: string;
  requestGeneration: number;
  bodyHash: string;
}

export interface MutationCoordinator {
  begin(body: unknown): MutationIntent;
  beginOrRetry(body: unknown): MutationIntent;
  keyForRetry(intentId: string): string | undefined;
  resolve(intentId: string): void;
  isStale(intentId: string, requestGeneration: number): boolean;
}

/**
 * Canonical JSON serialization (recursively sorted object keys) for stable
 * hashing, following JSON wire semantics: object properties with an `undefined`
 * value are omitted, and `undefined` array elements serialize as `null`.
 */
function canonicalize(value: unknown): string {
  if (value === undefined) return 'null';
  if (value === null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const object = value as Record<string, unknown>;
  const keys = Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`)
    .join(',')}}`;
}

/** FNV-1a 32-bit hash of a string, returned as lowercase hex. */
function hashString(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function generateUuidV4(): string {
  return crypto.randomUUID();
}

export function createMutationCoordinator(): MutationCoordinator {
  let activeIntent: MutationIntent | null = null;

  function createIntent(body: unknown): MutationIntent {
    return {
      intentId: generateUuidV4(),
      key: generateUuidV4(),
      requestGeneration: 0,
      bodyHash: hashString(canonicalize(body)),
    };
  }

  return {
    begin(body: unknown): MutationIntent {
      const intent = createIntent(body);
      // A new intent deactivates the previous active intent (D11).
      activeIntent = intent;
      return { ...intent };
    },

    beginOrRetry(body: unknown): MutationIntent {
      const bodyHash = hashString(canonicalize(body));
      if (activeIntent?.bodyHash === bodyHash) {
        activeIntent.requestGeneration += 1;
        return { ...activeIntent };
      }
      const intent = createIntent(body);
      activeIntent = intent;
      return { ...intent };
    },

    keyForRetry(intentId: string): string | undefined {
      if (!activeIntent || activeIntent.intentId !== intentId) {
        return undefined;
      }
      activeIntent.requestGeneration += 1;
      return activeIntent.key;
    },

    resolve(intentId: string): void {
      if (activeIntent?.intentId === intentId) {
        activeIntent = null;
      }
    },

    isStale(intentId: string, requestGeneration: number): boolean {
      if (!activeIntent || activeIntent.intentId !== intentId) {
        return true;
      }
      return requestGeneration !== activeIntent.requestGeneration;
    },
  };
}
