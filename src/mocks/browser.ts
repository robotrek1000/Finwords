/**
 * Browser-side MSW worker. Started only when `runtimeConfig.apiMode === 'mock'`;
 * in `http` mode this is a no-op so the worker never starts.
 */
import { setupWorker } from 'msw/browser';
import { loadRuntimeConfig } from '../infra/runtime-config/runtimeConfig';
import { handlers } from './handlers';
import { configureP1MockPersistence, resetP1FakeDb } from './p1Handlers';

let workerStartPromise: Promise<void> | null = null;

export async function startMockBrowser(): Promise<void> {
  const config = loadRuntimeConfig();
  if (config.apiMode !== 'mock') {
    return;
  }

  configureP1MockPersistence({
    isDev: import.meta.env.DEV,
    apiMode: config.apiMode,
    search: window.location.search,
  });

  const e2e = import.meta.env.DEV ? window.__FINWORDS_E2E__ : undefined;
  if (e2e?.seed === 'first-run-completed') {
    resetP1FakeDb({ firstRunCompleted: true });
  } else if (e2e?.seed === 'chapter1-level9') {
    resetP1FakeDb({ chapterCompletion: true });
  } else if (e2e?.seed === 'campaign-boundary' && e2e.campaignBoundaryLevel) {
    resetP1FakeDb({ campaignBoundaryLevel: e2e.campaignBoundaryLevel });
  } else if (e2e?.seed === 'appearance-regular-owned') {
    resetP1FakeDb({
      ownedAppearanceAssetIds: [
        'character-analyst',
        'character-risk-manager',
        'background-default',
      ],
      failAppearanceSelectionOnce: e2e.failAppearanceSelectionOnce,
    });
  }

  if (!workerStartPromise) {
    const worker = setupWorker(...handlers);
    workerStartPromise = worker
      .start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
          options: { scope: import.meta.env.BASE_URL },
        },
      })
      .then(() => undefined);
  }

  await workerStartPromise;
}
