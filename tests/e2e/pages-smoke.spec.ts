import { expect, test, type Page } from '@playwright/test';
import { LEVELS } from '../../src/content/levels';
import type { CellId } from '../../src/app/types';

const FUND_PATH = LEVELS[1].targets.find(({ id }) => id === 'fund')!.path;

function cell(page: Page, cellId: CellId) {
  return page.locator(`[data-cell-id="${cellId}"]`);
}

function direction(from: CellId, to: CellId) {
  const [fromRow, fromCol] = from.split(':').map(Number);
  const [toRow, toCol] = to.split(':').map(Number);
  if (toRow === fromRow - 1) return 'ArrowUp';
  if (toRow === fromRow + 1) return 'ArrowDown';
  if (toCol === fromCol - 1) return 'ArrowLeft';
  if (toCol === fromCol + 1) return 'ArrowRight';
  throw new Error(`Cells ${from} and ${to} are not neighbours`);
}

async function selectFund(page: Page) {
  await cell(page, FUND_PATH[0]).focus();
  await page.keyboard.press('Enter');
  for (const [index, next] of FUND_PATH.slice(1).entries()) {
    await page.keyboard.press(direction(FUND_PATH[index], next));
  }
  await page.keyboard.press('Enter');
}

async function expectCleanDocument(page: Page) {
  const result = await page.evaluate(() => ({
    viewport: {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    },
    document: {
      width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    },
    brokenImages: [...document.images]
      .filter((image) => !image.complete || image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
    overlayCount: document.querySelectorAll(
      'vite-error-overlay, .vite-error-overlay, [data-nextjs-dialog], [data-error-overlay]',
    ).length,
  }));
  expect(result.document).toEqual(result.viewport);
  expect(result.brokenImages).toEqual([]);
  expect(result.overlayCount).toBe(0);
}

test('production Pages build loads assets and resets all game progress on reload', async ({
  page,
  request,
}, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4174' && response.status() >= 400) {
      failedResponses.push(`${response.status()} ${url.pathname}`);
    }
  });

  await page.goto('./', { waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/Finwords\/$/);
  await page.waitForTimeout(250);
  expect(pageErrors, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
  expect(failedResponses, `failed responses: ${failedResponses.join(' | ')}`).toEqual([]);
  expect(consoleErrors, `console errors: ${consoleErrors.join(' | ')}`).toEqual([]);
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await expect(page.getByLabel('Знания: 0')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Уровень 1', exact: true })).toBeVisible();

  const frame = page.locator('[data-standalone-frame]');
  const frameBounds = await frame.boundingBox();
  expect(frameBounds).not.toBeNull();
  if (testInfo.project.name === 'pages-chromium-desktop') {
    expect(frameBounds!.width).toBe(430);
    expect(Math.abs(frameBounds!.x - (1440 - 430) / 2)).toBeLessThanOrEqual(1);
  } else {
    expect(frameBounds!.x).toBe(0);
    expect(frameBounds!.width).toBe(390);
  }

  const workerResponse = await request.get('http://127.0.0.1:4174/Finwords/mockServiceWorker.js');
  expect(workerResponse.status()).toBe(200);
  expect(workerResponse.headers()['content-type']).toMatch(/javascript/);
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).scope))
    .toBe('http://127.0.0.1:4174/Finwords/');

  const resourcePaths = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .map((entry) => new URL(entry.name).pathname)
      .filter((path) => /\.(?:js|css|otf|png|svg|webp)$/.test(path)),
  );
  expect(resourcePaths.length).toBeGreaterThan(0);
  expect(resourcePaths.every((path) => path.startsWith('/Finwords/'))).toBe(true);
  await expectCleanDocument(page);

  await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await selectFund(page);
  await expect(page.getByLabel('Знания: 1')).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();

  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await expect(page.getByLabel('Знания: 0')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Уровень 1', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Продолжить', exact: true })).toHaveCount(0);
  await expectCleanDocument(page);

  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});
