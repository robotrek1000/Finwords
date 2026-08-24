import { expect, test, type Locator, type Page } from '@playwright/test';
import type { CellId } from '../../src/app/types';
import { LEVELS } from '../../src/content/levels';

const LEVEL_ONE = LEVELS[1];
const FUND_TARGET = LEVEL_ONE.targets.find((target) => target.id === 'fund')!;
const STOCK_TARGET = LEVEL_ONE.targets.find((target) => target.id === 'stock')!;

async function waitForRouteReady(page: Page) {
  const board = page.getByLabel('Игровое поле');
  await expect(board).not.toHaveAttribute('aria-disabled', 'true');
  await expect.poll(() => board.getAttribute('data-route-state')).toBeNull();
  await expect(board.locator('[aria-pressed="true"]')).toHaveCount(0);
}

async function selectPath(page: Page, path: readonly CellId[]) {
  await waitForRouteReady(page);
  const centers = [];
  for (const cellId of path) {
    const box = await page.locator(`[data-cell-id="${cellId}"]`).boundingBox();
    if (!box) {
      throw new Error(`Cell ${cellId} is not visible`);
    }
    centers.push({
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    });
  }

  await page.mouse.move(centers[0].x, centers[0].y);
  await page.mouse.down();
  await expect(page.locator(`[data-cell-id="${path[0]}"]`)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
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

async function finishTransient(page: Page) {
  await waitForRouteReady(page);
}

async function enterLevelOne(page: Page) {
  await page.goto('/');
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  const enterLevel = page
    .getByRole('button', { name: 'Уровень 1', exact: true })
    .or(page.getByRole('button', { name: 'Продолжить', exact: true }));
  await expect(enterLevel).toBeVisible();
  await enterLevel.click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await expect(page.getByLabel('Игровое поле')).toBeVisible();
}

async function readKnowledge(page: Page) {
  const label = await page.getByLabel(/^Знания: \d+$/).getAttribute('aria-label');
  const value = label?.match(/^Знания: (\d+)$/)?.[1];
  if (!value) {
    throw new Error(`Knowledge label has an unexpected value: ${label}`);
  }
  return Number(value);
}

async function completeLevelOne(page: Page) {
  await enterLevelOne(page);
  const board = page.getByLabel('Игровое поле');
  const initialKnowledge = await readKnowledge(page);

  for (const [index, target] of LEVEL_ONE.targets.entries()) {
    await test.step(`authoritative target success and hold: ${target.word}`, async () => {
      await selectPath(page, target.path);
      await expect(page.getByText('Это слово не загадано', { exact: true })).toHaveCount(0);
      await expect(
        page.getByText('Это бонусное слово уже найдено', { exact: true }),
      ).toHaveCount(0);

      const isLastTarget = index === LEVEL_ONE.targets.length - 1;
      if (isLastTarget) {
        const resultsHeading = page.getByRole('heading', { name: 'Уровень пройден!' });
        await expect
          .poll(async () =>
            (await resultsHeading.isVisible())
            || (await page.getByLabel(`Знания: ${initialKnowledge + index + 1}`).isVisible()),
          )
          .toBe(true);
        await expect(
          resultsHeading,
          'Seventh authoritative target success must replace the completed Game with Results',
        ).toBeVisible();
        await expect(board).toHaveCount(0);
        return;
      }

      await expect(page.getByText('+1 знание', { exact: true })).toBeVisible();
      await expect(page.getByLabel(`Знания: ${initialKnowledge + index + 1}`)).toBeVisible();
      await expect(
        page.getByLabel(`Осталось слов: ${LEVEL_ONE.targets.length - index - 1} из 7`),
      ).toBeVisible();
      await finishTransient(page);
      await expect(board).not.toHaveAttribute('aria-disabled', 'true');
    });
  }
}

function resultsRegion(page: Page) {
  return page.getByLabel('Результаты уровня 1');
}

async function expectRegularResults(page: Page) {
  const results = resultsRegion(page);
  await expect(results).toBeVisible();
  await expect(results.getByRole('heading', { name: 'Уровень пройден!' })).toHaveCount(1);
  await expect(results.getByText('+7 знаний', { exact: true })).toHaveCount(1);
  await expect(results.getByText('7', { exact: true })).toHaveCount(1);
  await expect(results.getByText('7 из 7', { exact: true })).toHaveCount(1);
  await expect(results.getByText('7/7', { exact: true })).toHaveCount(0);
  await expect(results.getByText('0', { exact: true })).toHaveCount(1);
  await expect(results.getByText('Финансовая подушка', { exact: true })).toBeVisible();
  await expect(results.getByText('Уровней 1 из 9', { exact: true })).toBeVisible();
  await expect(results.getByRole('button', { name: 'Следующий уровень' })).toBeVisible();
  await expect(results.getByRole('button', { name: 'Показать поле' })).toBeVisible();
}

async function closeDialog(dialog: Locator, actionName: string | RegExp) {
  const close = dialog.getByRole('button', {
    name: actionName,
    exact: typeof actionName === 'string',
  });
  await expect(close).toBeVisible();
  await close.click();
  await expect(dialog).toHaveCount(0);
}

async function expectReviewDoesNotAcceptRoute(page: Page) {
  const board = page.getByLabel('Игровое поле');
  const path = FUND_TARGET.path.slice(0, 2);
  const boxes = await Promise.all(
    path.map((cellId) => page.locator(`[data-cell-id="${cellId}"]`).boundingBox()),
  );
  if (boxes.some((box) => !box)) {
    throw new Error('Field Review route probe cells are not visible');
  }

  await page.mouse.move(
    boxes[0]!.x + boxes[0]!.width / 2,
    boxes[0]!.y + boxes[0]!.height / 2,
  );
  await page.mouse.down();
  try {
    await page.mouse.move(
      boxes[1]!.x + boxes[1]!.width / 2,
      boxes[1]!.y + boxes[1]!.height / 2,
      { steps: 3 },
    );
    await expect(board.locator('[aria-pressed="true"]')).toHaveCount(0);
  } finally {
    await page.mouse.move(0, 0);
    await page.mouse.up();
  }
  await expect(board.locator('[aria-pressed="true"]')).toHaveCount(0);
}

test('P4 regular Results supports course, Field Review, next-level and reload reset', async ({
  page,
}) => {
  test.setTimeout(45_000);

  await completeLevelOne(page);

  await test.step('server Results snapshot and mobile width', async () => {
    await expectRegularResults(page);
    await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0);

    const metrics = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  });

  await test.step('АКЦИЯ mini-course is manual and returns from Course Error', async () => {
    const results = resultsRegion(page);
    const courseCard = results.getByRole('button', {
      name: /Мини-курс.*АКЦИЯ|АКЦИЯ.*Мини-курс/,
    });
    await expect(courseCard).toBeVisible();
    await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0);
    await courseCard.click();

    const courseError = page.getByRole('dialog', { name: STOCK_TARGET.word });
    await expect(courseError).toBeVisible();
    await expect(courseError.getByText(STOCK_TARGET.definition, { exact: true })).toBeVisible();
    await expect(courseError.getByText('Мини-курс', { exact: true })).toBeVisible();
    await expect(courseError.getByRole('button', { name: 'Повторить', exact: true })).toHaveCount(0);
    await closeDialog(courseError, 'Понятно');
    await expectRegularResults(page);
  });

  await test.step('Field Review is read-only and exposes definitions and course offer', async () => {
    await resultsRegion(page).getByRole('button', { name: 'Показать поле' }).click();
    const review = page.getByLabel('Просмотр поля уровня 1');
    const board = page.getByLabel('Игровое поле');
    await expect(review).toBeVisible();
    await expect(board).toBeVisible();
    await expect(page.getByRole('button', { name: /Использовать подсказку/ })).toHaveCount(0);
     await expect(board.locator('[data-found-marker="true"]')).toHaveCount(0);
    await expectReviewDoesNotAcceptRoute(page);

     await page.locator(`[data-cell-id="${FUND_TARGET.path[1]}"]`).click();
    const definition = page.getByRole('dialog', { name: FUND_TARGET.word });
    await expect(definition.getByText(FUND_TARGET.definition, { exact: true })).toBeVisible();
    await closeDialog(definition, 'Понятно');

    await page.locator(`[data-cell-id="${STOCK_TARGET.path[0]}"]`).click();
    const courseOffer = page.getByRole('dialog', { name: STOCK_TARGET.word });
    await expect(courseOffer.getByText(STOCK_TARGET.definition, { exact: true })).toBeVisible();
    await expect(courseOffer.getByText('Мини-курс', { exact: true })).toBeVisible();
    await closeDialog(courseOffer, 'Понятно');

    await page.getByRole('button', { name: 'Скрыть поле' }).click();
    await expectRegularResults(page);
  });

  await test.step('primary action reaches the P4 Home/start-level boundary', async () => {
    await resultsRegion(page).getByRole('button', { name: 'Следующий уровень' }).click();
    const boundary = page
      .getByLabel('Главный экран')
      .or(page.getByLabel('Игровой экран уровня 2'));
    await expect(boundary).toBeVisible();
    await expect(resultsRegion(page)).toHaveCount(0);
  });

  await test.step('reload resets completed progress to a clean Home', async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Главный экран')).toBeVisible();
    await expect(page.getByLabel('Знания: 0')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Уровень 1', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Продолжить', exact: true })).toHaveCount(0);
    await expect(resultsRegion(page)).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: /награду/i })).toHaveCount(0);
  });
});
