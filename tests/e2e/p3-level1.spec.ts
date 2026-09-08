import { expect, test, type Locator, type Page } from '@playwright/test';
import type { CellId } from '../../src/app/types';

const LEVEL_ONE_TARGETS = [
  {
    id: 'target-01-01',
    word: 'ЧЕК',
    definition: 'Документ, который подтверждает оплату товара или услуги.',
    path: ['3:3', '3:2', '2:2'],
  },
  {
    id: 'target-01-02',
    word: 'ЛОТ',
    definition: 'Стандартное количество актива или товара, выставленное на одну сделку.',
    path: ['1:2', '1:3', '2:3'],
  },
  {
    id: 'target-01-03',
    word: 'АКТ',
    definition: 'Документ, который фиксирует выполненную работу, передачу или установленный факт.',
    path: ['3:1', '2:1', '1:1'],
  },
] as const satisfies readonly {
  id: string;
  word: string;
  definition: string;
  path: readonly CellId[];
}[];

async function selectPath(page: Page, path: readonly CellId[]): Promise<void> {
  const centers = [];
  for (const cellId of path) {
    const box = await page.locator(`[data-cell-id="${cellId}"]`).boundingBox();
    if (!box) throw new Error(`Cell ${cellId} is not visible`);
    centers.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }
  await page.mouse.move(centers[0].x, centers[0].y);
  await page.mouse.down();
  for (const [index, center] of centers.slice(1).entries()) {
    await page.mouse.move(center.x, center.y, { steps: 3 });
    for (const cellId of path.slice(0, index + 2)) {
      await expect(page.locator(`[data-cell-id="${cellId}"]`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }
  }
  await page.mouse.up();
}

async function enterLevelOne(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.__FINWORDS_E2E__ = { seed: 'first-run-completed' };
  });
  await page.goto('/');
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await expect(page.getByLabel('Игровое поле')).toBeVisible();
}

async function readKnowledge(page: Page): Promise<number> {
  const label = await page.getByLabel(/^Знания: \d+$/).getAttribute('aria-label');
  const value = label?.match(/^Знания: (\d+)$/)?.[1];
  if (!value) throw new Error(`Unexpected knowledge label: ${label}`);
  return Number(value);
}

function foundRibbon(page: Page): Locator {
  return page
    .getByLabel('Игровое поле')
    .locator('svg > g')
    .filter({ has: page.locator('rect[fill]') });
}

async function waitForOwnAnimations(locator: Locator): Promise<void> {
  await locator.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

test('Level 1 keeps all three governed targets playable and hints point to the remaining target', async ({ page }) => {
  await enterLevelOne(page);
  const board = page.getByLabel('Игровое поле');
  await expect(page.getByLabel('Осталось слов: 3 из 3')).toBeVisible();

  await page.getByRole('button', { name: 'Бонусные слова: 0', exact: true }).click();
  const bonusDialog = page.getByRole('dialog', { name: 'Бонусные слова' });
  await expect(bonusDialog.getByText('Пока бонусных слов нет', { exact: true })).toBeVisible();
  await bonusDialog.getByRole('button', { name: 'Закрыть', exact: true }).click();

  const initialKnowledge = await readKnowledge(page);
  await selectPath(page, LEVEL_ONE_TARGETS[0].path);
  await expect(page.getByLabel(`Знания: ${initialKnowledge + 1}`)).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 2 из 3')).toBeVisible();
  await expect(board).not.toHaveAttribute('aria-disabled', 'true');

  await selectPath(page, LEVEL_ONE_TARGETS[1].path);
  await expect(page.getByLabel(`Знания: ${initialKnowledge + 2}`)).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 1 из 3')).toBeVisible();
  await expect(board).not.toHaveAttribute('aria-disabled', 'true');

  await page.getByRole('button', { name: 'Использовать подсказку', exact: true }).click();
  await expect(page.getByLabel('Подсказок: 4')).toBeVisible();
  await expect(page.getByText('Первая буква слова открыта', { exact: true })).toBeVisible();
  await expect(page.locator(`[data-cell-id="${LEVEL_ONE_TARGETS[2].path[0]}"]`)).toHaveClass(/hintCurrent/);
  await expect(page.getByLabel('Осталось слов: 1 из 3')).toBeVisible();
});

test('real campaign non-target selection stays invalid and never advances bonus reward state', async ({ page }) => {
  await enterLevelOne(page);
  await selectPath(page, ['1:1', '1:2']);
  await expect(page.getByText('Это слово не загадано', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Знания: 0')).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 3 из 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Бонусные слова: 0', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Выберите награду' })).toHaveCount(0);
});

test.describe('Level 1 canonical target pointer routes', () => {
  for (const target of LEVEL_ONE_TARGETS) {
    test(`${target.word} is accepted exactly once and locks its cells from new routes`, async ({ page }) => {
      await enterLevelOne(page);
      await selectPath(page, target.path);
      await expect(page.getByText('+1 знание', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Знания: 1')).toBeVisible();
      await expect(page.getByLabel('Осталось слов: 2 из 3')).toBeVisible();
      for (const cellId of target.path) {
        await expect(page.locator(`[data-cell-id="${cellId}"]`)).toHaveAccessibleName(
          new RegExp(`Найденное слово ${target.word}`),
        );
        await expect(page.locator(`[data-cell-id="${cellId}"]`)).toBeEnabled();
      }
    });
  }
});

test('exact reverse target route is accepted', async ({ page }) => {
  await enterLevelOne(page);
  const target = LEVEL_ONE_TARGETS[1];
  await selectPath(page, [...target.path].reverse());
  await expect(page.getByText('+1 знание', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Знания: 1')).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 2 из 3')).toBeVisible();
});

test('tap on a found target cell opens its centered definition', async ({ page }) => {
  await enterLevelOne(page);
  const target = LEVEL_ONE_TARGETS[0];
  await selectPath(page, target.path);
  await page.locator(`[data-cell-id="${target.path[1]}"]`).click();

  const definition = page.getByRole('dialog', { name: target.word });
  await expect(definition).toBeVisible();
  await expect(definition.getByText(target.definition, { exact: true })).toBeVisible();
  const bounds = await definition.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(Math.abs(bounds!.x - (viewport!.width - bounds!.width) / 2)).toBeLessThanOrEqual(1);
  await definition.getByRole('button', { name: 'Понятно', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
});

test('ordinary governed target renders a stable ribbon without linked-offer pulse', async ({ page }) => {
  await enterLevelOne(page);
  await selectPath(page, LEVEL_ONE_TARGETS[0].path);
  const ribbon = foundRibbon(page);
  await expect(ribbon).toHaveCount(1);
  await expect(page.getByLabel('Игровое поле').locator('[data-found-marker="true"]')).toHaveCount(0);
  await expect(ribbon).not.toHaveAttribute('data-pulse-iterations');
  await expect(ribbon).not.toHaveAttribute('data-pulse-duration-ms');
  expect(await ribbon.evaluate((group) => group.getAnimations().length)).toBe(0);
});

test('found target pulse is not replayed after exiting and resuming Level 1', async ({ page }) => {
  await enterLevelOne(page);
  const target = LEVEL_ONE_TARGETS[0];
  await selectPath(page, target.path);
  await waitForOwnAnimations(foundRibbon(page));

  await page.getByRole('button', { name: 'Выйти из уровня', exact: true }).click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByLabel('Осталось слов: 2 из 3')).toBeVisible();
  expect(
    await foundRibbon(page).evaluate(
      (element) => element.getAnimations().filter((animation) =>
        ['pending', 'running'].includes(animation.playState),
      ).length,
    ),
  ).toBe(0);
});
