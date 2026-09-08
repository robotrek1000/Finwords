import { expect, test, type Page } from '@playwright/test';

type AudioProbeEvent = {
  action: 'create' | 'play' | 'pause';
  src: string;
  loop: boolean;
  currentTime: number;
};

function captureBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    const text = message.text();
    const expectedProtectedConfigHmrNoise = page.url().startsWith('https://macbook-pro-m4.local:4173') && (
      text.includes("WebSocket connection to 'wss://macbook-pro-m4.local:4173/")
      || text.includes('[vite] failed to connect to websocket')
    );
    if (message.type() === 'error' && !expectedProtectedConfigHmrNoise) {
      errors.push(`console: ${text}`);
    }
  });
  return errors;
}

async function installAudioProbe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__FINWORDS_E2E__ = { seed: 'first-run-completed' };
    const events: AudioProbeEvent[] = [];
    Object.defineProperty(window, '__FINWORDS_AUDIO_E2E_PROBE__', {
      configurable: true,
      value: events,
    });
    class ProbeAudio {
      currentTime = 0;
      loop = false;
      preload = '';

      constructor(readonly src: string) {
        events.push({ action: 'create', src, loop: this.loop, currentTime: this.currentTime });
      }

      play() {
        events.push({ action: 'play', src: this.src, loop: this.loop, currentTime: this.currentTime });
        return Promise.resolve();
      }

      pause() {
        events.push({ action: 'pause', src: this.src, loop: this.loop, currentTime: this.currentTime });
      }
    }
    Object.defineProperty(window, 'Audio', { configurable: true, value: ProbeAudio });
  });
}

async function audioEvents(page: Page): Promise<AudioProbeEvent[]> {
  return page.evaluate(() => (
    window as typeof window & { __FINWORDS_AUDIO_E2E_PROBE__: AudioProbeEvent[] }
  ).__FINWORDS_AUDIO_E2E_PROBE__);
}

test('audio waits for a gesture, inherits overlays, persists separate toggles and routes Home → Game', async ({ page }) => {
  const browserErrors = captureBrowserErrors(page);
  const settingsBodies: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/clients/me/settings') {
      settingsBodies.push(request.postData() ?? '');
    }
  });
  await installAudioProbe(page);

  await page.goto('/');
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  expect((await audioEvents(page)).filter((event) => event.action === 'play')).toHaveLength(0);

  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('dialog', { name: 'Настройки' })).toBeVisible();
  await expect.poll(async () => (await audioEvents(page)).filter(
    (event) => event.action === 'play' && /Happy10\.(ogg|mp3)$/.test(event.src),
  ).length).toBe(1);
  expect((await audioEvents(page)).filter(
    (event) => event.action === 'play' && /select_00[12]\.(ogg|mp3)$/.test(event.src),
  )).toHaveLength(1);

  const music = page.getByRole('switch', { name: 'Музыка' });
  const sound = page.getByRole('switch', { name: 'Звук' });
  await music.click();
  await expect(music).not.toBeChecked();
  await expect.poll(async () => (await audioEvents(page)).filter(
    (event) => event.action === 'pause' && /Happy10\.(ogg|mp3)$/.test(event.src),
  ).length).toBe(1);
  await music.click();
  await expect(music).toBeChecked();
  await expect.poll(async () => (await audioEvents(page)).filter(
    (event) => event.action === 'play' && /Happy10\.(ogg|mp3)$/.test(event.src),
  ).length).toBe(2);

  await sound.click();
  await expect(sound).not.toBeChecked();
  const sfxCount = (await audioEvents(page)).filter(
    (event) => event.action === 'play' && /select_00[12]\.(ogg|mp3)$/.test(event.src),
  ).length;
  await page.getByRole('button', { name: 'Закрыть настройки' }).click();
  await page.getByRole('button', { name: 'Уровень 1' }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await expect.poll(async () => (await audioEvents(page)).filter(
    (event) => event.action === 'play' && /UpbeatCalm3\.(ogg|mp3)$/.test(event.src),
  ).length).toBe(1);
  expect((await audioEvents(page)).filter(
    (event) => event.action === 'play' && /select_00[12]\.(ogg|mp3)$/.test(event.src),
  )).toHaveLength(sfxCount);

  expect(settingsBodies.map((body) => JSON.parse(body))).toEqual([
    { musicEnabled: false },
    { musicEnabled: true },
    { soundEnabled: false },
  ]);
  const authoritativeSettings = await page.evaluate(async () => {
    const response = await fetch('/api/v1/clients/me/state');
    const state = await response.json() as {
      clientState: { clientView: { settings: { musicEnabled: boolean; soundEnabled: boolean } } };
    };
    return state.clientState.clientView.settings;
  });
  expect(authoritativeSettings).toMatchObject({ musicEnabled: true, soundEnabled: false });
  expect(browserErrors).toEqual([]);
});

test('all approved OGG assets are served with audio content and nonzero bodies', async ({ request }) => {
  for (const filename of ['select_001.ogg', 'select_002.ogg', 'Happy10.ogg', 'UpbeatCalm3.ogg']) {
    const response = await request.get(`/audio/finwords/${filename}`);
    expect(response.status(), filename).toBe(200);
    expect(response.headers()['content-type'], filename).toMatch(/(?:audio|application)\/ogg/i);
    expect((await response.body()).byteLength, filename).toBeGreaterThan(0);
  }
});
