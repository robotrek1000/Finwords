import { expect, test, type Page } from '@playwright/test';
import { CAMPAIGN_LEVELS } from './campaign-fixtures';
import { completeMandatoryTutorial, selectPath } from './campaign-helpers';

declare global { interface Window { __PAGES_AUDIO__: HTMLAudioElement[] } }

async function expectCleanDocument(page: Page) {
  await expect.poll(() => page.evaluate(() => [...document.images]
    .filter(image => !image.complete || image.naturalWidth === 0)
    .map(image => image.src))).toEqual([]);
  expect(await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    vertical: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
    overlays: document.querySelectorAll('vite-error-overlay').length,
  }))).toEqual({ horizontal: false, vertical: false, overlays: 0 });
}

test('production campaign starts, plays real audio and resets on reload', async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const externalRequests: string[] = [];
  page.on('request', req => {
    if (new URL(req.url()).origin !== 'http://127.0.0.1:4174') externalRequests.push(req.url());
  });
  await page.addInitScript(() => {
    localStorage.setItem('finwords:p1-mock-backend:v1', 'invalid legacy state');
    localStorage.setItem('unrelated-test-key', 'keep');
    const NativeAudio = window.Audio;
    window.__PAGES_AUDIO__ = [];
    window.Audio = function(src?: string) {
      const audio = new NativeAudio(src);
      window.__PAGES_AUDIO__.push(audio);
      return audio;
    } as unknown as typeof Audio;
  });
  await page.goto('./');
  await expect(page).toHaveURL(/\/Finwords\/$/);
  await expect(page).toHaveTitle(/Финворды|Finwords/i);
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await expectCleanDocument(page);
  expect(await page.evaluate(() => window.__PAGES_AUDIO__.length)).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('finwords:p1-mock-backend:v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('unrelated-test-key'))).toBe('keep');
  expect(await page.evaluate(() => window.__FINWORDS_E2E__)).toBeUndefined();
  const frame = await page.locator('[data-standalone-frame]').boundingBox();
  expect(frame?.width).toBe(testInfo.project.name === 'pages-chromium-desktop' ? 430 : 390);
  expect((await request.get('mockServiceWorker.js')).status()).toBe(200);
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).scope))
    .toBe('http://127.0.0.1:4174/Finwords/');

  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__PAGES_AUDIO__.some(a => a.loop && !a.paused && a.currentTime > 0))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.__PAGES_AUDIO__.some(a => !a.loop && a.currentTime > 0))).toBe(true);
  const music = page.getByRole('switch', { name: 'Музыка', exact: true });
  const sound = page.getByRole('switch', { name: 'Звук', exact: true });
  await expect(music).toBeChecked();
  await expect(sound).toBeChecked();
  await music.click();
  await expect.poll(() => page.evaluate(() => window.__PAGES_AUDIO__.filter(a => a.loop).every(a => a.paused))).toBe(true);
  await sound.click();
  await expect(sound).not.toBeChecked();
  await music.click();
  await expect.poll(() => page.evaluate(() => window.__PAGES_AUDIO__.some(a => a.loop && !a.paused))).toBe(true);
  await page.getByRole('button', { name: 'Закрыть настройки', exact: true }).click();
  await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();
  await completeMandatoryTutorial(page);
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__PAGES_AUDIO__.some(a => /UpbeatCalm3/.test(a.src) && !a.paused && a.currentTime > 0))).toBe(true);
  await selectPath(page, CAMPAIGN_LEVELS[1].targets[0].path);
  await expect(page.getByLabel('Знания: 1', { exact: true })).toBeVisible();
  await expectCleanDocument(page);
  const paths = await page.evaluate(() => performance.getEntriesByType('resource').map(e => new URL(e.name).pathname)
    .filter(p => /\.(js|css|otf|png|svg|webp|ogg|mp3)$/.test(p)));
  expect(paths.length).toBeGreaterThan(0);
  expect(paths.every(p => p.startsWith('/Finwords/'))).toBe(true);
  await page.reload();
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await expect(page.getByLabel('Знания: 0', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await expect(music).toBeChecked();
  await expect(sound).toBeChecked();
  await expectCleanDocument(page);
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});
