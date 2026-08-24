import { setupWorker } from 'msw/browser';
import { assetUrl } from '../shared/assetUrl';
import { handlers } from './handlers';
import { configureP1MockPersistence } from './p1Handlers';
import { clearLegacyMockState } from './mockPersistence';

let workerStartPromise: Promise<void> | null = null;

export async function startMockBrowser(): Promise<void> {
  clearLegacyMockState(window.localStorage);
  configureP1MockPersistence({ mode: 'browser' });

  if (!workerStartPromise) {
    const worker = setupWorker(...handlers);
    workerStartPromise = worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: {
        url: assetUrl('mockServiceWorker.js'),
        options: { scope: import.meta.env.BASE_URL },
      },
    }).then(() => undefined);
  }

  await workerStartPromise;
}
