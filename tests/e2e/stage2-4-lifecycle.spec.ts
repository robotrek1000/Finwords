import { expect, test, type Page } from '@playwright/test';
import type { CellId } from '../../src/app/types';

const TUTORIAL_PATHS = [
  ['1:1', '1:2', '1:3'],
  ['2:1', '2:2', '3:2'],
  ['1:3', '1:2', '1:1'],
  ['2:1', '2:2', '3:2'],
  ['1:1', '1:2', '1:3'],
] as const satisfies readonly (readonly CellId[])[];

const LEVEL_ONE_TARGET_PATHS = [
  ['3:3', '3:2', '2:2'],
  ['1:2', '1:3', '2:3'],
  ['3:1', '2:1', '1:1'],
] as const satisfies readonly (readonly CellId[])[];

// Approved Chapter 1 source facts: L9 ПЛЮС / НОЛЬ / ИТОГ / ДОЛЯ.
// Keep this E2E independent from Node's JSON-module loader; the adapter itself
// is covered by chapter1.test.ts and the scoped content check.
const LEVEL_NINE_TARGET_PATHS = [
  ['1:1', '2:1', '3:1', '4:1'],
  ['4:4', '3:4', '2:4', '1:4'],
  ['1:3', '2:3', '3:3', '4:3'],
  ['4:2', '3:2', '2:2', '1:2'],
] as const satisfies readonly (readonly CellId[])[];

interface TextGameState {
  phase: string;
  modal: string;
  knowledge: number;
  hints: number;
  completedLevels: string[];
  nextAction: string | null;
  selectedCharacterId: string | null;
  selectedBackgroundId: string | null;
}

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

function captureApiCalls(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/v1/')) {
      calls.push(`${request.method()} ${url.pathname}`);
    }
  });
  return calls;
}

async function readGameState(page: Page): Promise<TextGameState> {
  return page.evaluate(() => {
    const serialized = window.render_game_to_text?.();
    if (!serialized) throw new Error('render_game_to_text is unavailable');
    return JSON.parse(serialized) as TextGameState;
  });
}

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

async function completeMandatoryTutorial(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Обучение' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Закрыть обучение' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Пропустить обучение' })).toHaveCount(0);

  for (const [index, path] of TUTORIAL_PATHS.entries()) {
    await expect(page.getByText(`Шаг ${index + 1} из 6`, { exact: index !== 3 })).toBeVisible();
    await selectPath(page, path);
    if (index === 3) {
      await expect(page.getByText('ПАР · КОНВЕРТ 1/4', { exact: true })).toBeVisible();
    }
    if (index === 4) {
      await expect(page.getByText('НОС · НАЙДЕНО', { exact: true })).toBeVisible();
    }
    const next = page.getByRole('button', { name: 'Далее', exact: true });
    await expect(next).toBeEnabled();
    await next.click();
  }

  await expect(page.getByText('Шаг 6 из 6', { exact: true })).toBeVisible();
  await page.locator('[data-cell-id="2:1"]').click();
  const definition = page.getByRole('dialog', { name: 'ПАР' });
  await expect(definition).toBeVisible();
  await expect(definition.getByText('Вода в газообразном состоянии.', { exact: true })).toBeVisible();
  await definition.getByRole('button', { name: 'Понятно', exact: true }).click();
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
}

async function expectNoDocumentScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    vertical: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
  }));
  expect(overflow).toEqual({ horizontal: false, vertical: false });
}

test('first run completes Tutorial → Narrative → Level 1 and replay has no side effects', async ({ page }) => {
  test.setTimeout(60_000);
  const browserErrors = captureBrowserErrors(page);
  const apiCalls = captureApiCalls(page);

  await page.goto('/');
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();

  await completeMandatoryTutorial(page);
  await expect(page.getByLabel('История главы')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Азбука денег' })).toBeVisible();
  await expect(page.getByText(
    'Начните с простых финансовых понятий и постепенно соберите свою базу знаний.',
    { exact: true },
  )).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();

  expect(apiCalls.some((call) => call.includes('/chapters/') && call.endsWith('/narrative-shown'))).toBe(true);
  expect(apiCalls.some((call) => call.includes('/levels/') && call.endsWith('/start'))).toBe(true);

  await page.getByRole('button', { name: 'Выйти из уровня', exact: true }).click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  const beforeReplay = await readGameState(page);
  const mutationCount = apiCalls.filter((call) => call.startsWith('POST ')).length;

  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await page.getByRole('button', { name: 'Пройти обучение', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Пропустить обучение', exact: true })).toBeVisible();
  await selectPath(page, TUTORIAL_PATHS[0]);
  await page.getByRole('button', { name: 'Пропустить обучение', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Настройки' })).toBeVisible();

  const afterReplay = await readGameState(page);
  expect(afterReplay.knowledge).toBe(beforeReplay.knowledge);
  expect(afterReplay.hints).toBe(beforeReplay.hints);
  expect(afterReplay.completedLevels).toEqual(beforeReplay.completedLevels);
  expect(afterReplay.nextAction).toBe(beforeReplay.nextAction);
  expect(apiCalls.filter((call) => call.startsWith('POST '))).toHaveLength(mutationCount);
  await expectNoDocumentScroll(page);
  expect(browserErrors).toEqual([]);
});

test('fresh Level 1 completion resyncs API-002 once and enters Level 2 without reload', async ({ page }) => {
  test.setTimeout(60_000);
  const browserErrors = captureBrowserErrors(page);
  const apiCalls = captureApiCalls(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();
  await completeMandatoryTutorial(page);
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();

  for (const [index, path] of LEVEL_ONE_TARGET_PATHS.entries()) {
    await selectPath(page, path);
    if (index < LEVEL_ONE_TARGET_PATHS.length - 1) {
      await expect(page.getByLabel(
        `Осталось слов: ${LEVEL_ONE_TARGET_PATHS.length - index - 1} из ${LEVEL_ONE_TARGET_PATHS.length}`,
      )).toBeVisible();
    }
  }
  const results = page.getByLabel('Результаты уровня 1');
  await expect(results).toBeVisible();

  const beforeAcknowledge = apiCalls.length;
  await results.getByRole('button', { name: 'Следующий уровень', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 2')).toBeVisible();

  const transitionCalls = apiCalls.slice(beforeAcknowledge);
  const acknowledgeIndex = transitionCalls.findIndex((call) => call.includes('/results/acknowledge'));
  const stateReadIndexes = transitionCalls
    .map((call, index) => ({ call, index }))
    .filter(({ call, index }) => index > acknowledgeIndex && call === 'GET /api/v1/clients/me/state')
    .map(({ index }) => index);
  const levelTwoStartIndex = transitionCalls.findIndex(
    (call, index) => index > acknowledgeIndex && call.includes('/levels/') && call.endsWith('/start'),
  );
  expect(acknowledgeIndex).toBeGreaterThanOrEqual(0);
  expect(stateReadIndexes).toHaveLength(1);
  expect(stateReadIndexes[0]).toBeLessThan(levelTwoStartIndex);
  await expectNoDocumentScroll(page);
  expect(browserErrors).toEqual([]);
});

test('appearance keeps locked inert, preserves selection on failure, then confirms success', async ({ page }) => {
  test.setTimeout(30_000);
  await page.addInitScript(() => {
    window.__FINWORDS_E2E__ = {
      seed: 'appearance-regular-owned',
      failAppearanceSelectionOnce: true,
    };
  });
  const browserErrors = captureBrowserErrors(page);
  const apiCalls = captureApiCalls(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'Облики', exact: true }).click();
  await expect(page.getByLabel('Получено обликов: 3 из 17')).toHaveText('3/17');

  const analyst = page.getByRole('button', { name: 'Аналитик', exact: true });
  const riskManager = page.getByRole('button', { name: 'Риск-менеджер', exact: true });
  const lockedNavigator = page.getByRole('button', { name: 'Штурман', exact: true });
  await expect(analyst).toHaveAttribute('aria-pressed', 'true');
  await expect(riskManager).toBeEnabled();
  await expect(lockedNavigator).toBeDisabled();

  await lockedNavigator.dispatchEvent('click');
  expect(apiCalls.filter((call) => call.includes('/appearances/') && call.endsWith('/select'))).toHaveLength(0);

  await riskManager.click();
  await expect(page.getByRole('alert')).toHaveText('Не удалось выбрать облик. Попробуйте ещё раз.');
  await expect(analyst).toHaveAttribute('aria-pressed', 'true');
  await expect(riskManager).toHaveAttribute('aria-pressed', 'false');

  await riskManager.click();
  await expect(riskManager).toHaveAttribute('aria-pressed', 'true');
  await expect(analyst).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(apiCalls.filter((call) => call.includes('/appearances/') && call.endsWith('/select'))).toHaveLength(2);
  await expectNoDocumentScroll(page);
  expect(browserErrors).toEqual([
    'console: Failed to load resource: the server responded with a status of 500 (Internal Server Error)',
  ]);
});

test('real Level 9 completion routes Results → API-017 → Golden → API-009 → API-013', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    window.__FINWORDS_E2E__ = { seed: 'chapter1-level9' };
  });
  const browserErrors = captureBrowserErrors(page);
  const apiCalls = captureApiCalls(page);

  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Уровень 9', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Уровень 9', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 9')).toBeVisible();

  for (const [index, path] of LEVEL_NINE_TARGET_PATHS.entries()) {
    await selectPath(page, path);
    if (index < LEVEL_NINE_TARGET_PATHS.length - 1) {
      await expect(page.getByLabel(
        `Осталось слов: ${LEVEL_NINE_TARGET_PATHS.length - index - 1} из ${LEVEL_NINE_TARGET_PATHS.length}`,
      )).toBeVisible();
    }
  }

  const results = page.getByLabel('Результаты уровня 9');
  await expect(results).toBeVisible();
  await expect(results.getByRole('heading', { name: 'Глава завершена!' })).toBeVisible();
  await expect(results.getByRole('progressbar', { name: 'Уровней 9 из 9' })).toHaveAttribute('aria-valuenow', '9');
  await results.getByRole('button', { name: 'Забрать награду', exact: true }).click();

  const golden = page.getByRole('dialog', { name: 'Выберите награду' });
  await expect(golden).toBeVisible();
  await golden.getByRole('radio', { name: 'Три подсказки', exact: true }).check();
  await golden.getByRole('button', { name: 'Забрать награду', exact: true }).click();

  const feedback = page.getByRole('dialog', { name: 'Оставить отзыв' });
  await expect(feedback).toBeVisible();
  await feedback.getByRole('radio', { name: '5', exact: true }).check();
  await feedback.getByLabel('Комментарий').fill('Проверка завершения первой главы');
  await feedback.getByRole('button', { name: 'Отправить', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Обратная связь' })).toContainText('Спасибо за отзыв!');
  await expect(page.getByLabel('История главы')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByRole('heading', { name: 'Финансовая подушка' })).toBeVisible();

  expect(apiCalls.some((call) => call.includes('/results/acknowledge'))).toBe(true);
  expect(apiCalls.some((call) => call.includes('/rewards/') && call.endsWith('/claim'))).toBe(true);
  expect(apiCalls.some((call) => call === 'POST /api/v1/feedbacks')).toBe(true);
  const finalState = await readGameState(page);
  expect(finalState.phase).toBe('narrative');
  expect(finalState.modal).toBe('none');
  expect(finalState.hints).toBe(8);
  await expectNoDocumentScroll(page);
  expect(browserErrors).toEqual([]);
});

test('real Level 9 completion can dismiss chapter feedback through API-014', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    window.__FINWORDS_E2E__ = { seed: 'chapter1-level9' };
  });
  const browserErrors = captureBrowserErrors(page);
  const apiCalls = captureApiCalls(page);

  await page.goto('/');
  await page.getByRole('button', { name: 'Уровень 9', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 9')).toBeVisible();

  for (const path of LEVEL_NINE_TARGET_PATHS) {
    await selectPath(page, path);
  }

  const results = page.getByLabel('Результаты уровня 9');
  await expect(results.getByRole('heading', { name: 'Глава завершена!' })).toBeVisible();
  await results.getByRole('button', { name: 'Забрать награду', exact: true }).click();

  const golden = page.getByRole('dialog', { name: 'Выберите награду' });
  await golden.getByRole('radio', { name: 'Три подсказки', exact: true }).check();
  await golden.getByRole('button', { name: 'Забрать награду', exact: true }).click();

  const feedback = page.getByRole('dialog', { name: 'Оставить отзыв' });
  await expect(feedback).toBeVisible();
  await feedback.getByRole('button', { name: 'Закрыть отзыв', exact: true }).click();
  await expect(feedback).toHaveCount(0);
  await expect(page.getByLabel('История главы')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Финансовая подушка' })).toBeVisible();

  expect(apiCalls.some((call) => call.includes('/results/acknowledge'))).toBe(true);
  expect(apiCalls.some((call) => call.includes('/rewards/') && call.endsWith('/claim'))).toBe(true);
  expect(apiCalls.some((call) => call.includes('/feedback-prompt/dismiss'))).toBe(true);
  expect(apiCalls.some((call) => call === 'POST /api/v1/feedbacks')).toBe(false);
  const finalState = await readGameState(page);
  expect(finalState.phase).toBe('narrative');
  expect(finalState.modal).toBe('none');
  await expectNoDocumentScroll(page);
  expect(browserErrors).toEqual([]);
});
