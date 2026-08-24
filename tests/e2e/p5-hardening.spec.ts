import { expect, test, type Page } from '@playwright/test';
import { LEVELS } from '../../src/content/levels';
import type { CellId } from '../../src/app/types';

const LEVEL_ONE = LEVELS[1];
const FUND_PATH = LEVEL_ONE.targets.find((target) => target.id === 'fund')!.path;

async function finishTransient(page: Page) {
  await page.evaluate(() => window.advanceTime?.(1600));
  await page.waitForTimeout(20);
}

async function enterLevelOne(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  const enterLevel = page
    .getByRole('button', { name: 'Уровень 1', exact: true })
    .or(page.getByRole('button', { name: 'Продолжить', exact: true }));
  await enterLevel.click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await expect(page.getByLabel('Игровое поле')).toBeVisible();
}

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
  throw new Error(`Cells ${from} and ${to} are not orthogonal neighbours`);
}

async function selectPathByKeyboard(
  page: Page,
  path: readonly CellId[],
  startKey: 'Enter' | 'Space' = 'Space',
) {
  const firstCell = cell(page, path[0]);
  await firstCell.focus();
  await expect(firstCell).toBeFocused();
  await firstCell.press(startKey);
  await expect(firstCell).toHaveAttribute('aria-pressed', 'true');

  for (const [index, nextCellId] of path.slice(1).entries()) {
    await page.keyboard.press(direction(path[index], nextCellId));
    await expect(cell(page, nextCellId)).toBeFocused();
    await expect(cell(page, nextCellId)).toHaveAttribute('aria-pressed', 'true');
  }

  await page.keyboard.press('Enter');
}

async function expectFocusInside(page: Page, dialog: ReturnType<Page['getByRole']>) {
  await expect
    .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
    .toBe(true);
}

async function expectNoDocumentScroll(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(metrics.scrollWidth).toBe(metrics.clientWidth);
  expect(metrics.scrollHeight).toBe(metrics.clientHeight);
}

async function expectInsideViewport(page: Page, locator: ReturnType<Page['getByRole']>) {
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = await page.evaluate(() => ({
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  }));
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function completeLevelOne(page: Page) {
  for (const [index, target] of LEVEL_ONE.targets.entries()) {
    await selectPathByKeyboard(page, target.path, 'Enter');
    if (index < LEVEL_ONE.targets.length - 1) {
      await expect(
        page.getByLabel(`Осталось слов: ${LEVEL_ONE.targets.length - index - 1} из 7`),
      ).toBeVisible();
      await finishTransient(page);
    }
  }
}

test('P5: клавиатурный маршрут принимает canonical target без pointer input', async ({ page }) => {
  await enterLevelOne(page);

  await selectPathByKeyboard(page, FUND_PATH);

  await expect(page.getByText('+1 знание', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Знания: 1')).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();
  for (const cellId of FUND_PATH) {
    await expect(cell(page, cellId)).toHaveAccessibleName(/Найденное слово ФОНД/);
  }
});

test('P5: Settings и вложенный Feedback удерживают фокус и возвращают его владельцу', async ({
  page,
  browserName,
}) => {
  await page.goto('/');
  await expect(page.getByLabel('Главный экран')).toBeVisible();

  const settingsOpener = page.getByRole('button', { name: 'Настройки', exact: true });
  await settingsOpener.click();
  let settings = page.getByRole('dialog', { name: 'Настройки' });
  await expect(settings).toBeVisible();
  await expectFocusInside(page, settings);
  // iPhone WebKit emulation sends Tab to body because it has no hardware keyboard;
  // Chromium covers the real focus-trap contract, while WebKit still covers Escape/restore.
  if (browserName !== 'webkit') {
    await page.keyboard.press('Tab');
    await expectFocusInside(page, settings);
  }
  await page.keyboard.press('Escape');
  await expect(settings).toHaveCount(0);
  if (browserName !== 'webkit') await expect(settingsOpener).toBeFocused();

  await settingsOpener.click();
  settings = page.getByRole('dialog', { name: 'Настройки' });
  const feedbackOpener = settings.getByRole('button', { name: 'Оценить игру', exact: true });
  await feedbackOpener.click();

  const feedback = page.getByRole('dialog', { name: 'Оставить отзыв' });
  await expect(feedback).toBeVisible();
  await expectFocusInside(page, feedback);
  if (browserName !== 'webkit') {
    await page.keyboard.press('Tab');
    await expectFocusInside(page, feedback);
  }
  await page.keyboard.press('Escape');
  await expect(feedback).toHaveCount(0);
  await expect(settings).toBeVisible();
  if (browserName !== 'webkit') {
    await expect(settings.getByRole('button', { name: 'Оценить игру', exact: true })).toBeFocused();
  }

  await settings.getByRole('button', { name: 'Оценить игру', exact: true }).click();
  const feedbackForm = page.getByRole('dialog', { name: 'Оставить отзыв' });
  await feedbackForm.getByRole('radio', { name: '5', exact: true }).check();
  await feedbackForm.getByLabel('Комментарий').fill('Проверка keyboard modal contract');
  await feedbackForm.getByRole('button', { name: 'Отправить', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Обратная связь' })).toBeVisible();
  await expect(page.getByText('Спасибо за отзыв!', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Настройки' })).toBeVisible({ timeout: 3_000 });
});

test('P5: reload всегда очищает прогресс', async ({ page }) => {
  await enterLevelOne(page);
  await expect(page.getByLabel('Знания: 0')).toBeVisible();

  await selectPathByKeyboard(page, FUND_PATH);
  await expect(page.getByLabel('Знания: 1')).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await expect(page.getByLabel('Знания: 0')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Уровень 1', exact: true })).toBeVisible();
});

test('P5: reduced motion отключает loading/results spinner и switch transition', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const url = String(args[0] instanceof Request ? args[0].url : args[0]);
      const delay = url.includes('/bootstrap') ? 500 : url.includes('/results') ? 700 : 0;
      if (delay > 0) await new Promise((resolve) => window.setTimeout(resolve, delay));
      return originalFetch(...args);
    };
  });

  await page.goto('/');
  const loading = page.locator('section[aria-label="Загрузка игры"]');
  await expect(loading).toBeVisible();
  expect(
    await loading.evaluate((root) =>
      [root, ...root.querySelectorAll<HTMLElement>('*')].filter(
        (element) => getComputedStyle(element).animationName !== 'none',
      ).length,
    ),
  ).toBe(0);

  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Настройки' });
  const switchDurations = await settings.getByRole('switch').evaluateAll((inputs) =>
    inputs.flatMap((input) => {
      const track = input.parentElement?.querySelector('i');
      if (!track) return [];
      return [
        getComputedStyle(track).transitionDuration,
        getComputedStyle(track, '::after').transitionDuration,
      ];
    }),
  );
  expect(
    switchDurations.every((duration) => Number.parseFloat(duration) <= 0.001),
  ).toBe(true);
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await completeLevelOne(page);

  const resultsLoader = page.getByLabel('Загрузка результатов');
  await expect(resultsLoader.locator('span')).toBeVisible({ timeout: 3_000 });
  expect(
    await resultsLoader.locator('span').evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
});

test('P5: Home, Game и Results не переполняют 320px/430px и показывают нижние действия', async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/?mockPersistence=off');
    await expect(page.getByLabel('Главный экран')).toBeVisible();
    await expectInsideViewport(page, page.getByRole('button', { name: 'Уровень 1', exact: true }));
    await expectNoDocumentScroll(page);

    await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();
    await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
    await expectInsideViewport(page, page.getByRole('button', { name: /Использовать подсказку/ }));
    await expectInsideViewport(page, page.getByRole('button', { name: /Бонусные слова:/ }));
    await expectNoDocumentScroll(page);

    await completeLevelOne(page);
    const results = page.getByLabel('Результаты уровня 1');
    await expect(results).toBeVisible();
    await expectInsideViewport(page, results.getByRole('button', { name: 'Следующий уровень' }));
    await expectInsideViewport(page, results.getByRole('button', { name: 'Показать поле' }));
    await expectNoDocumentScroll(page);
  }
});
