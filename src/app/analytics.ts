export interface AnalyticsEvent {
  name: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

declare global {
  interface Window {
    __FINWORDS_ANALYTICS__?: AnalyticsEvent[];
  }
}

export function track(name: string, payload: Record<string, unknown> = {}): void {
  const event: AnalyticsEvent = {
    name,
    timestamp: new Date().toISOString(),
    payload,
  };

  window.__FINWORDS_ANALYTICS__ ??= [];
  window.__FINWORDS_ANALYTICS__.push(event);

  if (import.meta.env.DEV) {
    console.info('[Finwords analytics]', event);
  }
}
