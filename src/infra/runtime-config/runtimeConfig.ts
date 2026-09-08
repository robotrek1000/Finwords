export type ApiMode = 'mock' | 'http';

export interface RuntimeConfig {
  apiBaseUrl: string;
  apiMode: ApiMode;
  flags: Record<string, unknown>;
}

/**
 * Read-side runtime config surface injected by the platform into `window`.
 *
 * The wire contract host (`servers[0].url`) is never used here (Q-001): the
 * base URL always comes from the injected config or a safe local default.
 * This surface is non-secret by contract — no tokens, keys or credentials.
 */
interface InjectedRuntimeConfig {
  apiBaseUrl?: unknown;
  apiMode?: unknown;
  flags?: unknown;
}

declare global {
  interface Window {
    __FINWORDS_RUNTIME_CONFIG__?: InjectedRuntimeConfig;
  }
}

const DEFAULT_API_BASE_URL = '';
const DEFAULT_API_MODE: ApiMode = 'mock';

function isApiMode(value: unknown): value is ApiMode {
  return value === 'mock' || value === 'http';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function loadRuntimeConfig(): RuntimeConfig {
  // The published game runs entirely in this browser.
  if (import.meta.env.PROD) return { apiBaseUrl: '', apiMode: 'mock', flags: {} };
  const injected =
    typeof window !== 'undefined' ? window.__FINWORDS_RUNTIME_CONFIG__ : undefined;

  const apiMode = isApiMode(injected?.apiMode) ? injected.apiMode : DEFAULT_API_MODE;

  const apiBaseUrl =
    typeof injected?.apiBaseUrl === 'string' && injected.apiBaseUrl.trim().length > 0
      ? injected.apiBaseUrl
      : DEFAULT_API_BASE_URL;

  const flags = isRecord(injected?.flags) ? injected.flags : {};

  return { apiBaseUrl, apiMode, flags };
}
