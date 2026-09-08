import { expect, test, type Page } from '@playwright/test';
import type { CellId } from '../../src/app/types';

declare global { interface Window { __RELEASE_ROUTE__?: () => void } }

// Keep the notice visible while geometry is measured; expiration has separate unit coverage.
test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.includes('compact HUD')) return;
  await page.addInitScript(() => {
    const timeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) =>
      timeout(handler, delay === 3200 ? 60_000 : delay, ...args)) as typeof window.setTimeout;
  });
});

const LEVEL_ONE_TARGETS = [
  { word: 'ЧЕК', path: ['3:3', '3:2', '2:2'] },
  { word: 'ЛОТ', path: ['1:2', '1:3', '2:3'] },
  { word: 'АКТ', path: ['3:1', '2:1', '1:1'] },
] as const satisfies readonly { word: string; path: readonly CellId[] }[];
const FUND_PATH = LEVEL_ONE_TARGETS[0].path;

interface BoardMetrics {
  top: number;
  height: number;
}

interface ElementMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function finishTransient(page: Page) {
  await page.evaluate(() => window.advanceTime?.(1600));
  await page.waitForTimeout(20);
}

async function enterLevelOne(page: Page, url = '/') {
  await page.addInitScript(() => {
    window.__FINWORDS_E2E__ = { seed: 'first-run-completed' };
  });
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

async function readBoardMetrics(page: Page): Promise<BoardMetrics> {
  return page.getByLabel('Игровое поле').evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { top: bounds.top, height: bounds.height };
  });
}

function expectStableBoard(current: BoardMetrics, initial: BoardMetrics) {
  expect(Math.abs(current.top - initial.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(current.height - initial.height)).toBeLessThanOrEqual(1);
}

async function readElementMetrics(
  locator: ReturnType<Page['locator']>,
): Promise<ElementMetrics> {
  return locator.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  });
}

function expectStableElement(current: ElementMetrics, initial: ElementMetrics) {
  expect(Math.abs(current.x - initial.x)).toBeLessThanOrEqual(0.1);
  expect(Math.abs(current.y - initial.y)).toBeLessThanOrEqual(0.1);
  expect(Math.abs(current.width - initial.width)).toBeLessThanOrEqual(0.1);
  expect(Math.abs(current.height - initial.height)).toBeLessThanOrEqual(0.1);
}

function expectNoIntersection(first: ElementMetrics, second: ElementMetrics) {
  const horizontalOverlap = Math.min(first.x + first.width, second.x + second.width)
    - Math.max(first.x, second.x);
  const verticalOverlap = Math.min(first.y + first.height, second.y + second.height)
    - Math.max(first.y, second.y);
  expect(horizontalOverlap > 0 && verticalOverlap > 0).toBe(false);
}

async function selectPathByKeyboard(
  page: Page,
  path: readonly CellId[],
  startKey: 'Enter' | 'Space' = 'Space',
) {
  const firstCell = cell(page, path[0]);
  await firstCell.focus();
  await expect(firstCell).toBeFocused();
  await page.keyboard.press(startKey);
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
  for (const [index, target] of LEVEL_ONE_TARGETS.entries()) {
    await selectPathByKeyboard(page, target.path, 'Enter');
    if (index < LEVEL_ONE_TARGETS.length - 1) {
      await expect(
        page.getByLabel(
          `Осталось слов: ${LEVEL_ONE_TARGETS.length - index - 1} из ${LEVEL_ONE_TARGETS.length}`,
        ),
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
  await expect(page.getByLabel('Осталось слов: 2 из 3')).toBeVisible();
  for (const cellId of FUND_PATH) {
    await expect(cell(page, cellId)).toHaveAccessibleName(/Найденное слово ЧЕК/);
  }
});

test('P5: HUD keeps the board and hint control stable through selection, submit, notice, and hint', async ({
  page,
  browserName,
}) => {
  await page.addInitScript(() => {
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    const urls = new WeakMap<XMLHttpRequest, string>();

    Object.defineProperty(XMLHttpRequest.prototype, 'open', {
      configurable: true,
      value: function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async = true,
        username?: string | null,
        password?: string | null,
      ) {
        urls.set(this, String(url));
        Reflect.apply(open, this, [method, url, async, username, password]);
      },
    });
    Object.defineProperty(XMLHttpRequest.prototype, 'send', {
      configurable: true,
      value: function (this: XMLHttpRequest, body: Document | XMLHttpRequestBodyInit | null) {
        const url = urls.get(this) ?? '';
        if (!url.includes('/routes')) {
          Reflect.apply(send, this, [body]);
          return;
        }
        window.__RELEASE_ROUTE__ = () => Reflect.apply(send, this, [body]);
      },
    });
  });

  const viewports = browserName === 'chromium'
      ? [
          { width: 320, height: 568 },
          { width: 360, height: 640 },
          { width: 390, height: 568 },
          { width: 390, height: 844 },
          { width: 430, height: 932 },
      ]
    : [{ width: 390, height: 844 }];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await enterLevelOne(page, '/?mockPersistence=off');
    const board = page.getByLabel('Игровое поле');
    const hintButton = page.getByRole('button', { name: 'Использовать подсказку', exact: true });
    const originalButton = await hintButton.elementHandle();
    const originalIcon = await hintButton.locator('img').elementHandle();
    const initialHintOpacity = await hintButton.evaluate(
      (element) => getComputedStyle(element).opacity,
    );
    const initialBoard = await readBoardMetrics(page);
    const initialBoardBounds = await readElementMetrics(board);
    const initialFirstCell = await readElementMetrics(cell(page, FUND_PATH[0]));
    const initialSecondCell = await readElementMetrics(cell(page, FUND_PATH[1]));
    const lowerHud = [
      hintButton,
      page.getByRole('button', { name: 'Бонусные слова: 0', exact: true }),
      page.getByLabel('Осталось слов: 3 из 3'),
    ];

    await expect(page.getByText('Подсказка ведёт по буквам одного слова по порядку.')).toBeVisible();
    await expect(board).toBeVisible();
    for (const element of lowerHud) {
      expectNoIntersection(initialBoardBounds, await readElementMetrics(element));
    }

    const firstCell = cell(page, FUND_PATH[0]);
    await firstCell.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press(direction(FUND_PATH[0], FUND_PATH[1]));
    await expect(firstCell).toHaveAttribute('aria-pressed', 'true');
    await expect(cell(page, FUND_PATH[1])).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('ЧЕ', { exact: true })).toBeVisible();
    expectStableBoard(await readBoardMetrics(page), initialBoard);
    expectStableElement(await readElementMetrics(cell(page, FUND_PATH[0])), initialFirstCell);
    expectStableElement(await readElementMetrics(cell(page, FUND_PATH[1])), initialSecondCell);

    for (const [index, nextCellId] of FUND_PATH.slice(2).entries()) {
      await page.keyboard.press(direction(FUND_PATH[index + 1], nextCellId));
    }
    await page.keyboard.press('Enter');
    await expect(board).toHaveAttribute('aria-disabled', 'true');
    expectStableBoard(await readBoardMetrics(page), initialBoard);
    for (const cellId of FUND_PATH) {
      await expect(cell(page, cellId)).toHaveAttribute('aria-pressed', 'true');
    }

    const lockedButton = await hintButton.elementHandle();
    const lockedIcon = await hintButton.locator('img').elementHandle();
    expect(
      await page.evaluate(
        ([before, after]) => before === after && before?.isConnected,
        [originalButton, lockedButton],
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        ([before, after]) => before === after && before?.isConnected,
        [originalIcon, lockedIcon],
      ),
    ).toBe(true);
    await expect(hintButton.locator('img')).toHaveCount(1);
    expect(await hintButton.evaluate((element) => getComputedStyle(element).opacity))
      .toBe(initialHintOpacity);
    await expect(page.getByLabel('Подсказок: 5')).toBeVisible();

    await page.evaluate(() => window.__RELEASE_ROUTE__?.());
    await expect(page.getByText('+1 знание', { exact: true })).toBeVisible();
    expectStableBoard(await readBoardMetrics(page), initialBoard);

    await hintButton.click();
    await expect(page.getByLabel('Подсказок: 4')).toBeVisible();
    await expect(page.getByText('Первая буква слова открыта', { exact: true })).toBeVisible();
    expectStableBoard(await readBoardMetrics(page), initialBoard);
    await expectInsideViewport(page, board);
  }
});

test('P5: compact HUD gives selected letters priority over notices at the layout boundary', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 360, height: 719 },
    { width: 360, height: 720 },
    { width: 390, height: 568 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await enterLevelOne(page, '/?mockPersistence=off');
    const game = page.getByLabel('Игровой экран уровня 1');
    await game.locator('img').evaluateAll((images) => Promise.all(
      images.map((image) => (image as HTMLImageElement).decode()),
    ));
    const board = page.getByLabel('Игровое поле');
    const preview = game.locator('[aria-live="polite"]');
    const notice = page.getByText('Первая буква слова открыта', { exact: true });
    await page.getByRole('button', { name: 'Использовать подсказку', exact: true }).click();
    await expect(notice).toBeVisible();
    const initialBoard = await readElementMetrics(board);
    const first = await readElementMetrics(cell(page, FUND_PATH[0]));
    const second = await readElementMetrics(cell(page, FUND_PATH[1]));
    await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
    await page.mouse.down();
    await expect(preview).toHaveText('Ч');
    await expect(preview).toBeVisible();
    if (viewport.height < 720) await expect(notice).toHaveCount(0);
    else await expect(notice).toBeVisible();

    await page.mouse.move(second.x + second.width / 2, second.y + second.height / 2);
    await expect(preview).toHaveText('ЧЕ');
    expectStableElement(await readElementMetrics(board), initialBoard);
    expectStableElement(await readElementMetrics(cell(page, FUND_PATH[0])), first);
    expectNoIntersection(await readElementMetrics(preview), initialBoard);
    if (viewport.height >= 720) {
      expectNoIntersection(await readElementMetrics(notice), await readElementMetrics(preview));
    }
    await expectNoDocumentScroll(page);
    await page.screenshot({ path: testInfo.outputPath(`hud-${viewport.width}x${viewport.height}.png`) });

    await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
    await expect(preview).toHaveText('Ч');
    await page.mouse.up();
    await expect(preview).toHaveText('');
    if (viewport.height < 720) await expect(notice).toHaveCount(0);
    expectStableElement(await readElementMetrics(board), initialBoard);
    await expect(page.getByLabel('Подсказок: 4')).toBeVisible();
    await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('P5: compact HUD dismisses a notice when resized during a gesture', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 360, height: 844 });
  await enterLevelOne(page, '/?mockPersistence=off');
  const preview = page.getByLabel('Игровой экран уровня 1').locator('[aria-live="polite"]');
  const notice = page.getByText('Первая буква слова открыта', { exact: true });
  await page.getByRole('button', { name: 'Использовать подсказку', exact: true }).click();
  await expect(notice).toBeVisible();
  const first = await readElementMetrics(cell(page, FUND_PATH[0]));
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  await expect(preview).toHaveText('Ч');
  await expect(notice).toBeVisible();

  await page.setViewportSize({ width: 360, height: 719 });
  await expect(notice).toHaveCount(0);
  await expect(preview).toBeVisible();
  await expect(preview).toHaveText('Ч');
  await expectNoDocumentScroll(page);
  await page.screenshot({ path: testInfo.outputPath('hud-resize-active.png') });
  await page.setViewportSize({ width: 360, height: 720 });
  await expect(notice).toHaveCount(0);
  await page.mouse.up();
  await expect(preview).toHaveText('');
  await expect(notice).toHaveCount(0);
  await expectNoDocumentScroll(page);
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

test('P5: mockPersistence=off очищает прогресс после reload', async ({ page }) => {
  const url = '/?mockPersistence=off';
  await enterLevelOne(page, url);
  await expect(page.getByLabel('Знания: 0')).toBeVisible();

  await selectPathByKeyboard(page, FUND_PATH);
  await expect(page.getByLabel('Знания: 1')).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 2 из 3')).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await expect(page.getByLabel('Знания: 0')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Уровень 1', exact: true })).toBeVisible();
});

test('P5: reduced motion отключает loading/results spinner и switch transition', async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;
    const urls = new WeakMap<XMLHttpRequest, string>();

    Object.defineProperty(XMLHttpRequest.prototype, 'open', {
      configurable: true,
      value: function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async = true,
        username?: string | null,
        password?: string | null,
      ) {
        urls.set(this, String(url));
        Reflect.apply(open, this, [method, url, async, username, password]);
      },
    });
    Object.defineProperty(XMLHttpRequest.prototype, 'send', {
      configurable: true,
      value: function (this: XMLHttpRequest, body: Document | XMLHttpRequestBodyInit | null) {
        const url = urls.get(this) ?? '';
        const delay = url.includes('/bootstrap') ? 500 : url.includes('/results') ? 700 : 0;
        if (delay === 0) {
          Reflect.apply(send, this, [body]);
          return;
        }
        window.setTimeout(() => Reflect.apply(send, this, [body]), delay);
      },
    });
  });
  await page.addInitScript(() => {
    window.__FINWORDS_E2E__ = { seed: 'first-run-completed' };
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
  await page.addInitScript(() => {
    window.__FINWORDS_E2E__ = { seed: 'first-run-completed' };
  });
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

test('P5: Settings и Tutorial сохраняют мобильные зазоры, видимость и контраст', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 568 });
  await page.goto('/');
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Настройки' });
  await expect(settings).toBeVisible();

  const tutorialButton = settings.getByRole('button', { name: 'Пройти обучение', exact: true });
  const feedbackButton = settings.getByRole('button', { name: 'Оценить игру', exact: true });
  await expect(tutorialButton).toBeVisible();
  await expect(feedbackButton).toBeVisible();
  await expectInsideViewport(page, tutorialButton);
  await expectInsideViewport(page, feedbackButton);

  const tutorialButtonBounds = await readElementMetrics(tutorialButton);
  const feedbackButtonBounds = await readElementMetrics(feedbackButton);
  expect(
    feedbackButtonBounds.y - (tutorialButtonBounds.y + tutorialButtonBounds.height),
  ).toBeGreaterThanOrEqual(8);
  expectNoIntersection(tutorialButtonBounds, feedbackButtonBounds);

  await tutorialButton.click();

  const tutorial = page.getByLabel('Обучение', { exact: true });
  await expect(tutorial).toBeVisible();
  const nextButton = tutorial.getByRole('button', { name: 'Далее', exact: true });
  const skipButton = tutorial.getByRole('button', { name: 'Пропустить обучение', exact: true });
  const board = tutorial.getByLabel('Игровое поле');
  const footer = tutorial.locator('footer');
  await expect(board).toBeVisible();
  await expect(footer).toBeVisible();
  await expect(nextButton).toBeVisible();
  await expect(skipButton).toBeVisible();
  await expectInsideViewport(page, nextButton);
  await expectInsideViewport(page, skipButton);

  const nextButtonBounds = await readElementMetrics(nextButton);
  const skipButtonBounds = await readElementMetrics(skipButton);
  expect(
    skipButtonBounds.y - (nextButtonBounds.y + nextButtonBounds.height),
  ).toBeGreaterThanOrEqual(8);
  expectNoIntersection(nextButtonBounds, skipButtonBounds);
  expectNoIntersection(
    await readElementMetrics(board),
    await readElementMetrics(footer),
  );

  const contrast = await skipButton.evaluate((element) => {
    type Rgba = [number, number, number, number];
    type Rgb = [number, number, number];

    const parseColor = (color: string): Rgba => {
      const match = color.match(
        /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/,
      );
      if (!match) throw new Error(`Cannot parse color: ${color}`);
      return [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
        match[4] === undefined ? 1 : Number(match[4]),
      ];
    };
    const composite = ([r, g, b, alpha]: Rgba, background: Rgb): Rgb => [
      r * alpha + background[0] * (1 - alpha),
      g * alpha + background[1] * (1 - alpha),
      b * alpha + background[2] * (1 - alpha),
    ];
    const channelLuminance = (channel: number): number => {
      const s = channel / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const luminance = ([r, g, b]: Rgb): number =>
      0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
    const contrastRatio = (first: Rgb, second: Rgb): number => {
      const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    };

    const ancestors: Element[] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      ancestors.push(node);
    }
    const background = ancestors.reverse().reduce<Rgb>((resolved, node) => {
      const color = window.getComputedStyle(node).backgroundColor;
      return color === 'transparent' ? resolved : composite(parseColor(color), resolved);
    }, [255, 255, 255]);
    const foreground = composite(parseColor(window.getComputedStyle(element).color), background);

    return contrastRatio(foreground, background);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});
