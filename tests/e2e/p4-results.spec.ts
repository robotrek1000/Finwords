import { expect, test, type Locator, type Page } from '@playwright/test';
import type { CellId } from '../../src/app/types';

const LEVEL_ONE_TARGETS = [
  {
    word: 'ЧЕК',
    definition: 'Документ, который подтверждает оплату товара или услуги.',
    path: ['3:3', '3:2', '2:2'],
  },
  {
    word: 'ЛОТ',
    definition: 'Стандартное количество актива или товара, выставленное на одну сделку.',
    path: ['1:2', '1:3', '2:3'],
  },
  {
    word: 'АКТ',
    definition: 'Документ, который фиксирует выполненную работу, передачу или установленный факт.',
    path: ['3:1', '2:1', '1:1'],
  },
] as const satisfies readonly {
  word: string;
  definition: string;
  path: readonly CellId[];
}[];

const MODAL_VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
] as const;

async function selectPath(page: Page, path: readonly CellId[]): Promise<void> {
  const centers = [];
  for (const cellId of path) {
    const box = await page.locator(`[data-cell-id="${cellId}"]`).boundingBox();
    if (!box) throw new Error(`Cell ${cellId} is not visible`);
    centers.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }
  await page.mouse.move(centers[0].x, centers[0].y);
  await page.mouse.down();
  for (const center of centers.slice(1)) {
    await page.mouse.move(center.x, center.y, { steps: 3 });
  }
  await page.mouse.up();
}

async function expectCenteredDialog(page: Page, dialog: Locator): Promise<void> {
  for (const viewport of MODAL_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expect(dialog).toBeVisible();
    const gaps = await dialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: window.innerHeight - rect.bottom,
        left: rect.left,
        right: window.innerWidth - rect.right,
        scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
        clientHeight: document.documentElement.clientHeight,
      };
    });
    expect(Math.abs(gaps.top - gaps.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(gaps.left - gaps.right)).toBeLessThanOrEqual(1);
    expect(gaps.top).toBeGreaterThanOrEqual(0);
    expect(gaps.left).toBeGreaterThanOrEqual(0);
    expect(gaps.scrollHeight).toBeLessThanOrEqual(gaps.clientHeight + 1);
  }
}

async function enterLevelOne(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('finwords:e2e-seeded')) return;
    sessionStorage.setItem('finwords:e2e-seeded', 'true');
    window.__FINWORDS_E2E__ = { seed: 'first-run-completed' };
  });
  await page.goto('/');
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
}

async function completeLevelOne(page: Page): Promise<void> {
  await enterLevelOne(page);
  for (const [index, target] of LEVEL_ONE_TARGETS.entries()) {
    await selectPath(page, target.path);
    if (index < LEVEL_ONE_TARGETS.length - 1) {
      await expect(page.getByLabel(
        `Осталось слов: ${LEVEL_ONE_TARGETS.length - index - 1} из ${LEVEL_ONE_TARGETS.length}`,
      )).toBeVisible();
    }
  }
  await expect(page.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
}

function resultsRegion(page: Page): Locator {
  return page.getByLabel(/^Результаты (уровня 1|текущего уровня)$/);
}

async function expectRegularResults(page: Page): Promise<void> {
  const results = resultsRegion(page);
  await expect(results).toBeVisible();
  await expect(results.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
  await expect(results.getByText('+3 знаний', { exact: true })).toBeVisible();
  await expect(results.getByText('3 из 3', { exact: true })).toBeVisible();
  await expect(results.getByText('Уровней 1 из 9', { exact: true })).toBeVisible();
  await expect(results.getByRole('button', { name: 'Следующий уровень' })).toBeVisible();
  await expect(results.getByRole('button', { name: 'Показать поле' })).toBeVisible();
  await expect(results.getByRole('button', { name: /Мини-курс|Продукт/ })).toHaveCount(0);
}

test('P4 regular Results, centered definition, Field Review, reload and next-level boundary', async ({ page }) => {
  test.setTimeout(45_000);
  await completeLevelOne(page);
  await expectRegularResults(page);

  const rootMetrics = await page.evaluate(() => ({
    scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(rootMetrics.scrollWidth).toBeLessThanOrEqual(rootMetrics.clientWidth);

  await resultsRegion(page).getByRole('button', { name: 'Показать поле' }).click();
  const review = page.getByLabel('Просмотр поля уровня 1');
  await expect(review).toBeVisible();
  await expect(page.getByRole('button', { name: /Использовать подсказку/ })).toHaveCount(0);

  const target = LEVEL_ONE_TARGETS[0];
  await page.locator(`[data-cell-id="${target.path[1]}"]`).click();
  const definition = page.getByRole('dialog', { name: target.word });
  await expect(definition.getByText(target.definition, { exact: true })).toBeVisible();
  await expectCenteredDialog(page, definition);
  await page.setViewportSize({ width: 390, height: 844 });
  await definition.getByRole('button', { name: 'Понятно', exact: true }).click();
  await expect(review).toBeVisible();
  await review.getByRole('button', { name: 'Скрыть поле', exact: true }).click();
  await expectRegularResults(page);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectRegularResults(page);
  await expect(page.getByLabel('Главный экран', { exact: true })).toBeHidden();
  await expect(page.getByRole('dialog', { name: /награду/i })).toHaveCount(0);

  await resultsRegion(page).getByRole('button', { name: 'Следующий уровень' }).click();
  await expect(page.getByLabel('Игровой экран уровня 2')).toBeVisible();
  await expect(resultsRegion(page)).toHaveCount(0);
});
