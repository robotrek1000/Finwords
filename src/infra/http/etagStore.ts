/**
 * Single current client-state ETag store.
 *
 * The wire contract uses a strong opaque quoted token (`"<opaque>"`); weak ETags
 * (`W/...`) are not used. `set` validates the token shape and throws on a
 * non-conforming value instead of silently dropping it.
 */

const STRONG_ETAG_PATTERN = /^"[^"]*"$/;

export interface EtagStore {
  getCurrent(): string | null;
  set(etag: string): void;
  clear(): void;
}

export function createEtagStore(): EtagStore {
  let current: string | null = null;

  return {
    getCurrent() {
      return current;
    },
    set(etag: string) {
      if (!STRONG_ETAG_PATTERN.test(etag)) {
        throw new Error(
          `Invalid strong ETag: expected a quoted token ("<opaque>"), received ${JSON.stringify(etag)}`,
        );
      }
      current = etag;
    },
    clear() {
      current = null;
    },
  };
}
