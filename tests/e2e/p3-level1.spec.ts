import { expect, test, type Page } from '@playwright/test';
import { LEVELS } from '../../src/content/levels';
import type { CellId } from '../../src/app/types';

async function selectPath(page: Page, path: readonly CellId[]) {
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
    const selectedPrefix = path.slice(0, index + 2);
    for (const cellId of selectedPrefix) {
      await expect(page.locator(`[data-cell-id="${cellId}"]`)).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    }
  }
  await page.mouse.up();
}

async function finishTransient(page: Page) {
  await page.evaluate(() => window.advanceTime?.(1600));
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

const FUND_PATH = ['2:5', '1:5', '1:6', '2:6'] as const satisfies readonly CellId[];
const CAPITAL_PATH = [
  '3:6',
  '4:6',
  '5:6',
  '6:6',
  '6:5',
  '5:5',
  '4:5',
] as const satisfies readonly CellId[];

const FUND_TARGET = LEVELS[1].targets.find((target) => target.id === 'fund')!;
const STOCK_TARGET = LEVELS[1].targets.find((target) => target.id === 'stock')!;

const BONUS_PATHS = [
  ['4:5', '5:5', '5:6', '4:6'], // ЛАПА
  ['6:5', '6:6', '5:6'], // ТИП
  ['2:1', '3:1', '3:2'], // СОН
  ['3:2', '3:1', '2:1'], // НОС
] as const satisfies readonly (readonly CellId[])[];

function foundRibbon(page: Page) {
  return page
    .getByLabel('Игровое поле')
    .locator('svg > g')
    .filter({ has: page.locator('rect[fill]') });
}

async function waitForOwnAnimations(locator: ReturnType<Page['locator']>) {
  await locator.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

test('Level 1 keeps all seven targets playable after target routes and the fifth hint', async ({
  page,
}) => {
  await enterLevelOne(page);
  const board = page.getByLabel('Игровое поле');
  await expect(page.getByLabel('Осталось слов: 7 из 7')).toBeVisible();

  await page.getByRole('button', { name: 'Бонусные слова: 0', exact: true }).click();
  const bonusDialog = page.getByRole('dialog', { name: 'Бонусные слова' });
  await expect(bonusDialog).toBeVisible();
  await expect(bonusDialog.getByText('Пока бонусных слов нет', { exact: true })).toBeVisible();
  await expect(bonusDialog.getByText('ЛАПА', { exact: true })).toHaveCount(0);
  await bonusDialog.getByRole('button', { name: 'Закрыть', exact: true }).click();
  await expect(bonusDialog).toHaveCount(0);

  const initialKnowledge = await readKnowledge(page);
  await selectPath(page, FUND_PATH);
  await expect(page.getByText('+1 знание', { exact: true })).toBeVisible();
  await expect(page.getByLabel(`Знания: ${initialKnowledge + 1}`)).toBeVisible();
  await expect(page.getByText('Это слово не загадано', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: 'Ф, строка 2, столбец 5. Найденное слово ФОНД. Открыть информацию',
      exact: true,
    }),
  ).toBeEnabled();
  await expect(board).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();

  await selectPath(page, CAPITAL_PATH);
  await expect(page.getByText('Это слово не загадано', { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: 'К, строка 3, столбец 6. Найденное слово КАПИТАЛ. Открыть информацию',
      exact: true,
    }),
  ).toBeEnabled();
  await expect(page.getByText('+1 знание', { exact: true })).toBeVisible();
  await expect(page.getByLabel(`Знания: ${initialKnowledge + 2}`)).toBeVisible();
  await expect(board).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByLabel('Осталось слов: 5 из 7')).toBeVisible();

  const useHint = page.getByRole('button', { name: 'Использовать подсказку', exact: true });
  for (const remainingHints of [4, 3, 2, 1, 0]) {
    await useHint.click();
    await expect(page.getByLabel(`Подсказок: ${remainingHints}`)).toBeVisible();
  }

  await expect(page.getByText('АКЦИЯ · +1 знание', { exact: true })).toBeVisible();
  await expect(page.getByText('Уровень завершён', { exact: true })).toHaveCount(0);
  await expect(board).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByLabel('Осталось слов: 4 из 7')).toBeVisible();
});

test('четыре уникальных бонусных слова показывают 4/4 и открывают один выбор награды через 500 мс', async ({
  page,
}) => {
  await enterLevelOne(page);

  for (const [index, path] of BONUS_PATHS.entries()) {
    await selectPath(page, path);
    await expect(page.getByText(/ · бонусное слово$/, { exact: false })).toBeVisible();

    if (index < BONUS_PATHS.length - 1) {
      await finishTransient(page);
    }
  }

  const bonusEnvelope = page.getByRole('button', { name: 'Бонусные слова: 4', exact: true });
  await expect(bonusEnvelope).toBeVisible();
  await expect(
    bonusEnvelope.getByRole('progressbar', { name: 'Прогресс бонусного конверта' }),
  ).toHaveAttribute('aria-valuenow', '4');
  await expect(bonusEnvelope).toContainText('4/4');

  await bonusEnvelope.click();
  const bonusDialog = page.getByRole('dialog', { name: 'Бонусные слова' });
  await expect(bonusDialog).toBeVisible();
  await expect(
    bonusDialog.getByRole('progressbar', { name: 'Прогресс бонусных слов' }),
  ).toHaveAttribute('aria-valuenow', '4');
  await expect(bonusDialog.getByText('4/4', { exact: true })).toBeVisible();
  await expect(bonusDialog.getByText('Конверт готов — заберите награду', { exact: true })).toBeVisible();
  await bonusDialog.getByRole('button', { name: 'Закрыть', exact: true }).click();

  const rewardDialog = page.getByRole('dialog', { name: 'Выберите награду' });
  await expect(rewardDialog).toBeVisible({ timeout: 1_500 });
  await expect(rewardDialog).toHaveCount(1);
  await rewardDialog.getByRole('radio', { name: '1 подсказка', exact: true }).check();
  await rewardDialog.getByRole('button', { name: 'Забрать', exact: true }).click();

  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await expect(rewardDialog).toHaveCount(0);
  await expect(page.getByLabel('Подсказок: 6')).toBeVisible();
});

test('после найденного ДОХОД подсказка очищает его и указывает следующий нерешённый target', async ({
  page,
}) => {
  await enterLevelOne(page);
  const incomeTarget = LEVELS[1].targets.find((target) => target.id === 'income')!;
  await selectPath(page, incomeTarget.path);
  await expect(page.getByText('+1 знание', { exact: true })).toBeVisible();
  await finishTransient(page);

  await page.getByRole('button', { name: 'Использовать подсказку', exact: true }).click();
  await expect(page.getByLabel('Подсказок: 4')).toBeVisible();

  for (const cellId of incomeTarget.path) {
    await expect(page.locator(`[data-cell-id="${cellId}"]`)).not.toHaveClass(/hint/);
  }
  await expect(page.locator(`[data-cell-id="${FUND_TARGET.path[0]}"]`)).toHaveClass(/hintCurrent/);
});

test('неканоничный маршрут ДОХОД показывает подсказку собрать слово по-другому без изменения прогресса', async ({
  page,
}) => {
  await enterLevelOne(page);
  const initialKnowledge = await readKnowledge(page);
  const alternateIncomePath = ['4:4', '4:3', '4:2', '5:2', '6:2'] as const satisfies readonly CellId[];

  await selectPath(page, alternateIncomePath);
  await expect(page.getByText('Собери слово по-другому', { exact: true })).toBeVisible();
  await expect(page.getByLabel(`Знания: ${initialKnowledge}`)).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 7 из 7')).toBeVisible();
  await expect(page.locator('[data-cell-id="4:4"]')).not.toHaveAttribute(
    'aria-label',
    /Найденное слово ДОХОД/,
  );
});

test.describe('Level 1 canonical target pointer routes', () => {
  for (const target of LEVELS[1].targets) {
    test(`${target.word} is accepted exactly once in a fresh session`, async ({ page }) => {
      await enterLevelOne(page);
      const board = page.getByLabel('Игровое поле');
      const initialKnowledge = await readKnowledge(page);
      await expect(page.getByLabel('Осталось слов: 7 из 7')).toBeVisible();

      await test.step(`pointer construction: ${target.path.join(' -> ')}`, async () => {
        await selectPath(page, target.path);
      });

      await test.step('API result is a newly found target', async () => {
        await expect(page.getByText('Это слово не загадано', { exact: true })).toHaveCount(0);
        await expect(
          page.getByText('Это бонусное слово уже найдено', { exact: true }),
        ).toHaveCount(0);
        await expect(page.getByText('+1 знание', { exact: true })).toBeVisible();
        await expect(page.getByLabel(`Знания: ${initialKnowledge + 1}`)).toBeVisible();
        await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();
      });

      await test.step('all route cells are locked to the found target', async () => {
        for (const cellId of target.path) {
          await expect(page.locator(`[data-cell-id="${cellId}"]`)).toHaveAccessibleName(
            new RegExp(`Найденное слово ${target.word}`),
          );
        }
      });

      if (target.id === 'stock') {
        await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0);
      }

      await test.step('the level remains playable before the seventh target', async () => {
        await expect(page.getByText('Уровень завершён', { exact: true })).toHaveCount(0);
        await expect(board).not.toHaveAttribute('aria-disabled', 'true');
        await expect(page.locator(`[data-cell-id="${target.path[0]}"]`)).toBeEnabled();
        await finishTransient(page);
        await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();
        await expect(page.getByLabel(`Знания: ${initialKnowledge + 1}`)).toBeVisible();
      });

    });
  }
});

test('тап по внутренней клетке найденного target открывает definition без marker DOM', async ({ page }) => {
  await enterLevelOne(page);
  await selectPath(page, FUND_TARGET.path);
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();
  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0);
  await expect(page.getByLabel('Игровое поле').locator('[data-found-marker="true"]')).toHaveCount(0);

  await page.locator(`[data-cell-id="${FUND_TARGET.path[1]}"]`).click();

  const definition = page.getByRole('dialog', { name: FUND_TARGET.word });
  await expect(definition).toBeVisible();
  await expect(definition.getByRole('heading', { name: FUND_TARGET.word })).toBeVisible();
  await expect(definition.getByText(FUND_TARGET.definition, { exact: true })).toBeVisible();
  await expect(definition.getByRole('button', { name: 'Понятно', exact: true })).toBeVisible();
});

test('АКЦИЯ found path pulses four times without marker DOM', async ({
  page,
}) => {
  await enterLevelOne(page);
  await selectPath(page, STOCK_TARGET.path);
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();
  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0);

  const ribbon = foundRibbon(page);
  await expect(ribbon).toHaveCount(1);
  await expect(page.getByLabel('Игровое поле').locator('[data-found-marker="true"]')).toHaveCount(0);
  const pulse = await ribbon.evaluate((group) => {
    const animation = group.getAnimations()[0];
    const timing = animation?.effect?.getComputedTiming();
    return {
      animationName: getComputedStyle(group).animationName,
      iterations: Number(timing?.iterations),
      activeDurationMs: Number(timing?.activeDuration),
    };
  });
  expect.soft(pulse.iterations).toBe(4);
  expect.soft(pulse.activeDurationMs).toBeGreaterThanOrEqual(3_000);
  expect.soft(pulse.activeDurationMs).toBeLessThanOrEqual(3_400);
  expect.soft(pulse.animationName).not.toBe('none');
});

test('АКЦИЯ pulse is not replayed after exiting and resuming Level 1', async ({ page }) => {
  await enterLevelOne(page);
  await selectPath(page, STOCK_TARGET.path);
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();

  const initialRibbon = foundRibbon(page);
  await expect(initialRibbon).toHaveCount(1);
  await waitForOwnAnimations(initialRibbon);

  await page.getByRole('button', { name: 'Выйти из уровня', exact: true }).click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();

  const resumedRibbon = foundRibbon(page);
  await expect(resumedRibbon).toHaveCount(1);
  await expect(page.getByLabel('Игровое поле').locator('[data-found-marker="true"]')).toHaveCount(0);
  for (const cellId of STOCK_TARGET.path) {
    await expect(page.locator(`[data-cell-id="${cellId}"]`)).toHaveAccessibleName(
      new RegExp(`Найденное слово ${STOCK_TARGET.word}`),
    );
  }
  expect(
    await resumedRibbon.evaluate(
      (element) =>
        element.getAnimations().filter((animation) =>
          ['pending', 'running'].includes(animation.playState),
        ).length,
    ),
  ).toBe(0);
});

test('АКЦИЯ cell tap opens Course Error and returning preserves progress', async ({ page }) => {
  await enterLevelOne(page);
  const initialKnowledge = await readKnowledge(page);
  await selectPath(page, STOCK_TARGET.path);
  await expect(page.getByLabel(`Знания: ${initialKnowledge + 1}`)).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();
  await expect(page.locator('[role="dialog"]:visible')).toHaveCount(0);

  await page.locator(`[data-cell-id="${STOCK_TARGET.path[0]}"]`).click();

  const courseError = page.getByRole('dialog', { name: STOCK_TARGET.word });
  await expect(courseError).toBeVisible();
  await expect(courseError.getByText(STOCK_TARGET.offer!.badgeLabel, { exact: true })).toBeVisible();
  await expect(courseError.getByText('Курс «Как работают акции»', { exact: true })).toBeVisible();
  await expect(
    courseError.getByText('Не удалось открыть страницу. Попробуйте ещё раз.', { exact: true }),
  ).toBeVisible();
  await expect(courseError.getByText('Прогресс уровня сохранён', { exact: true })).toBeVisible();
  await expect(courseError.getByRole('button', { name: 'Повторить', exact: true })).toBeVisible();
  await expect(
    courseError.getByRole('button', { name: 'Вернуться к полю', exact: true }),
  ).toBeVisible();

  await courseError.getByRole('button', { name: 'Вернуться к полю', exact: true }).click();
  await expect(courseError).toHaveCount(0);
  await expect(page.getByLabel(`Знания: ${initialKnowledge + 1}`)).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();
});
