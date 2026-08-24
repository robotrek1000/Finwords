import { expect, test, type Page } from '@playwright/test';
import { LEVELS } from '../../src/content/levels';
import type { CellId } from '../../src/app/types';

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
  for (const center of centers.slice(1)) {
    await page.mouse.move(center.x, center.y, { steps: 3 });
  }
  await page.mouse.up();
}

async function finishTransient(page: Page) {
  await waitForRouteReady(page);
}

async function readGameState(page: Page) {
  return page.evaluate(() => {
    const value = window.render_game_to_text?.();
    return value ? JSON.parse(value) : null;
  });
}

async function expectInsideVisualViewport(page: Page, selector: string) {
  const bounds = await page.locator(selector).boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = await page.evaluate(() => ({
    width: window.visualViewport?.width ?? window.innerWidth,
    height: window.visualViewport?.height ?? window.innerHeight,
  }));
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectNoDocumentScroll(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(metrics.scrollWidth).toBe(metrics.clientWidth);
  expect(metrics.scrollHeight).toBe(metrics.clientHeight);
}

// Skipped legacy prototype flow; current P1/P3 stops before P4/P5, and current
// Level 1 coverage is provided by p3-level1.spec.ts.
test.skip('complete MVP flow across both levels', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Финворды' })).toBeVisible();
  await expect(page.getByLabel('Знания: 0')).toBeVisible();
  await expect(page.getByTestId('home-primary')).toHaveText('Уровень 1');

  await page.getByTestId('home-primary').click();
  await expect(page.getByRole('heading', { name: 'Финансовая подушка' })).toBeVisible();
  await page.getByTestId('narrative-continue').click();
  await expect(page.getByRole('heading', { name: 'Уровень 1' })).toBeVisible();
  await expect(page.getByLabel('Использовать подсказку. Осталось: 5')).toBeVisible();

  const bonusPaths: CellId[][] = [
    ['4:5', '5:5', '5:6', '4:6'],
    ['6:5', '6:6', '5:6'],
    ['2:1', '3:1', '3:2'],
    ['3:2', '3:1', '2:1'],
  ];

  await selectPath(page, bonusPaths[0]);
  await expect(page.getByText('ЛАПА · бонусное слово')).toBeVisible();
  await finishTransient(page);
  await selectPath(page, bonusPaths[0]);
  await expect(page.getByText('Это бонусное слово уже найдено')).toBeVisible();
  expect((await readGameState(page)).envelope).toEqual({ current: 1, max: 4 });
  await finishTransient(page);

  for (const path of bonusPaths.slice(1)) {
    await selectPath(page, path);
    await finishTransient(page);
  }

  await expect(page.getByRole('heading', { name: 'Выберите награду' })).toBeVisible();
  await page.getByRole('button', { name: /Подсказка/ }).click();
  await page.getByRole('button', { name: 'Забрать' }).click();
  expect((await readGameState(page)).hints).toBe(6);
  expect((await readGameState(page)).envelope).toEqual({ current: 0, max: 6 });

  for (const target of LEVELS[1].targets) {
    await selectPath(page, target.path);
    await expect(page.getByText(new RegExp(`^${target.word} · \\+1 знание$`))).toBeVisible();
    await finishTransient(page);

    if (target.id === 'stock') {
      await expect(page.getByRole('heading', { name: 'АКЦИЯ' })).toBeVisible();
      await page.getByRole('button', { name: 'Открыть курс' }).click();
      await expect(page.getByRole('heading', { name: 'АКЦИЯ' })).toBeVisible();
      await page.getByRole('button', { name: 'Продолжить игру' }).click();
    }
  }

  await expect(page.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'На главный экран' })).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'output/visual-qa/results-level-1-complete.png' });

  await page.getByRole('button', { name: 'Показать поле' }).click();
  await expect(page.getByLabel('Просмотр поля уровня 1')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Уровень пройден!' })).toBeHidden();
  await page.locator('[data-cell-id="2:5"]').click();
  await expect(page.getByRole('heading', { name: 'ФОНД' })).toBeVisible();
  await page.getByRole('button', { name: 'Понятно' }).click();
  await expect(page.getByLabel('Просмотр поля уровня 1')).toBeVisible();

  await page.locator('[data-cell-id="1:3"]').click();
  await expect(page.getByRole('heading', { name: 'АКЦИЯ' })).toBeVisible();
  await page.getByRole('button', { name: 'Открыть курс' }).click();
  await expect(page.getByRole('heading', { name: 'АКЦИЯ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Вернуться к полю' })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel('Просмотр поля уровня 1')).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();

  await page.getByRole('button', { name: 'Показать поле' }).click();
  await page.getByRole('button', { name: 'Скрыть поле' }).click();
  await expect(page.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();

  await page.getByRole('button', { name: 'Показать поле' }).click();
  await page.getByTestId('results-field-primary').click();
  await expect(page.getByRole('heading', { name: 'Уровень 2' })).toBeVisible();
  await page.waitForTimeout(220);

  for (const target of LEVELS[2].targets) {
    await selectPath(page, target.path);
    await expect(page.getByText(new RegExp(`^${target.word} · \\+1 знание$`))).toBeVisible();
    await finishTransient(page);

    if (target.id === 'iis') {
      await expect(page.getByRole('heading', { name: 'ИИС' })).toBeVisible();
      await page.getByRole('button', { name: 'Подробнее об ИИС' }).click();
      await expect(page.getByRole('heading', { name: 'ИИС' })).toBeVisible();
      await page.getByRole('button', { name: 'Продолжить игру' }).click();
    }
  }

  await expect(page.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'output/visual-qa/results-level-2-complete.png' });

  await page.getByRole('button', { name: 'Показать поле' }).click();
  await expect(page.getByLabel('Просмотр поля уровня 2')).toBeVisible();
  await page.locator('[data-cell-id="3:3"]').click();
  await expect(page.getByRole('heading', { name: 'ИИС' })).toBeVisible();
  await page.getByRole('button', { name: 'Подробнее об ИИС' }).click();
  await expect(page.getByRole('heading', { name: 'ИИС' })).toBeVisible();
  await page.getByRole('button', { name: 'Вернуться к полю' }).click();
  await expect(page.getByLabel('Просмотр поля уровня 2')).toBeVisible();
  await page.getByRole('button', { name: 'Скрыть поле' }).click();
  await expect(page.getByRole('heading', { name: 'Уровень пройден!' })).toBeVisible();

  await page.getByRole('button', { name: 'Показать поле' }).click();
  await page.getByTestId('results-field-primary').click();
  await expect(page.getByRole('heading', { name: 'Выберите награду' })).toBeVisible();
  await page.getByRole('button', { name: /Подсказки/ }).click();
  await page.getByRole('button', { name: 'Забрать' }).click();

  const finalState = await readGameState(page);
  expect(finalState.completedLevels).toEqual([1, 2]);
  expect(finalState.goldenRewardClaimed).toBe(true);
  expect(finalState.hints).toBe(9);

  const reviewEvents = await page.evaluate(() => window.__FINWORDS_ANALYTICS__ ?? []);
  expect(
    reviewEvents.some(
      (event) =>
        event.name === 'word_definition_opened' &&
        event.payload.source === 'results_field',
    ),
  ).toBe(true);
  expect(
    reviewEvents.some(
      (event) =>
        event.name === 'word_offer_shown' &&
        event.payload.openSource === 'results_field',
    ),
  ).toBe(true);
  expect(
    reviewEvents.some(
      (event) =>
        event.name === 'word_offer_closed' &&
        event.payload.closeMethod === 'return_to_field',
    ),
  ).toBe(true);
  expect(
    reviewEvents.some(
      (event) =>
        event.name === 'results_field_closed' &&
        event.payload.closeMethod === 'primary_action',
    ),
  ).toBe(true);
});

test('opens and closes supporting MVP screens without losing progress', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Главный экран')).toBeVisible();

  await page.getByRole('button', { name: 'Облики' }).click();
  await expect(page.getByRole('heading', { name: 'Облики' })).toBeVisible();
  await page.getByRole('tab', { name: 'Фоны' }).click();
  await expect(page.getByRole('button', { name: 'По умолчанию' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Назад' }).click();

  await page.getByRole('button', { name: 'Настройки' }).click();
  await expect(page.getByRole('heading', { name: 'Настройки' })).toBeVisible();
  const music = page.getByRole('switch', { name: 'Музыка' });
  await music.click();
  await expect(music).not.toBeChecked();
  const sound = page.getByRole('switch', { name: 'Звук' });
  await sound.click();
  await expect(sound).not.toBeChecked();
  await page.getByRole('button', { name: 'Оценить игру' }).click();
  await expect(page.getByRole('dialog', { name: 'Оставить отзыв' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Отправить' })).toBeDisabled();
  await page.getByRole('radio', { name: '5', exact: true }).click();
  await page.getByLabel('Комментарий').fill('Понятный прототип');
  await page.getByRole('button', { name: 'Отправить' }).click();
  const feedbackSuccess = page.getByRole('dialog', { name: 'Обратная связь' });
  await expect(feedbackSuccess).toContainText('Спасибо за отзыв!');
  await expect(feedbackSuccess).toHaveCount(0);
  const settings = page.getByRole('dialog', { name: 'Настройки' });
  await expect(settings).toBeVisible();
  await settings.getByRole('button', { name: 'Закрыть настройки', exact: true }).click();
  await expect(settings).toHaveCount(0);

  await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await page.getByRole('button', { name: 'Использовать подсказку', exact: true }).click();
  await expect(page.getByLabel('Подсказок: 4')).toBeVisible();
  await page.getByRole('button', { name: 'Бонусные слова: 0', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Бонусные слова' })).toBeVisible();
  await expect(page.getByText('Пока бонусных слов нет')).toBeVisible();
  await expect(page.getByText('На этом уровне найдено 0 из 4')).toBeVisible();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).last().click();

  await selectPath(page, LEVELS[1].targets[3].path);
  await finishTransient(page);
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();

  await page.getByRole('button', { name: 'Выйти из уровня' }).click();
  await expect(page.getByRole('heading', { name: 'Выйти из игры?' })).toBeVisible();
  await page.getByRole('button', { name: 'Остаться' }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();

  await page.getByRole('button', { name: 'Выйти из уровня' }).click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Финворды' })).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByLabel('Игровой экран уровня 1')).toBeVisible();
  await expect(page.getByLabel('Осталось слов: 6 из 7')).toBeVisible();
});

test('prioritizes the filled bonus envelope and auto-opens its reward', async ({ page }) => {
  await page.goto('/?screen=game&level=1&envelope=3');
  const finalBonusPath: CellId[] = ['4:5', '5:5', '5:6', '4:6'];

  await selectPath(page, finalBonusPath);
  await expect(page.locator('[data-cell-id="1:1"]')).toBeDisabled({ timeout: 250 });
  expect((await readGameState(page)).foundBonusWords).toEqual(['ЛАПА']);

  await expect(page.getByRole('heading', { name: 'Выберите награду' })).toBeVisible({
    timeout: 900,
  });
  expect((await readGameState(page)).envelope).toEqual({ current: 4, max: 4 });
});

test('keeps the core UI inside all supported viewports', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 716 },
    { width: 393, height: 663 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/?screen=game&level=1');
    await expect(page.getByRole('heading', { name: 'Уровень 1' })).toBeVisible();

    const board = page.getByLabel('Игровое поле уровня 1');
    const box = await board.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);

    const firstCell = page.locator('[data-cell-id="1:1"]');
    const cellBox = await firstCell.boundingBox();
    expect(cellBox!.width).toBeGreaterThanOrEqual(48);
    expect(cellBox!.height).toBeGreaterThanOrEqual(48);

    for (const control of [
      page.getByRole('button', { name: /Использовать подсказку/ }),
      page.getByRole('button', { name: /Показать бонусные слова/ }),
    ]) {
      const controlBox = await control.boundingBox();
      expect(controlBox).not.toBeNull();
      expect(controlBox!.x).toBeGreaterThanOrEqual(0);
      expect(controlBox!.x + controlBox!.width).toBeLessThanOrEqual(viewport.width);
      expect(controlBox!.y).toBeGreaterThanOrEqual(0);
      expect(controlBox!.y + controlBox!.height).toBeLessThanOrEqual(viewport.height);
    }

    await expectNoDocumentScroll(page);

    await page.goto('/?screen=results-field&level=1');
    await expect(page.getByLabel('Просмотр поля уровня 1')).toBeVisible();
    await expectInsideVisualViewport(page, '[data-testid="results-field-primary"]');
    await expectInsideVisualViewport(page, '[data-testid="results-field-hide"]');
    const reviewBoard = page.getByLabel('Игровое поле уровня 1');
    const reviewBoardBox = await reviewBoard.boundingBox();
    expect(reviewBoardBox).not.toBeNull();
    expect(reviewBoardBox!.width).toBeGreaterThanOrEqual(308);
    await expectNoDocumentScroll(page);
  }
});

test('fits Home, Game, and Results above open iPhone browser panels', async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 663 });

  await page.goto('/');
  await expect(page.getByLabel('Главный экран')).toBeVisible();
  await expectInsideVisualViewport(page, 'button:has-text("Уровень 1")');
  await expectInsideVisualViewport(page, 'article:has-text("Бонусный конверт")');
  await expectNoDocumentScroll(page);

  await page.goto('/?screen=game&level=1');
  const envelope = page.getByRole('button', { name: /Показать бонусные слова/ });
  await expect(envelope).toBeVisible();
  await expectInsideVisualViewport(page, 'button[aria-label^="Показать бонусные слова"]');
  await expect(envelope.getByText('0/4')).toBeVisible();
  const envelopeAlignment = await envelope.evaluate((element) => {
    const ring = element.querySelector<HTMLElement>('[role="progressbar"]');
    const image = element.querySelector<HTMLImageElement>('img');
    const ringRect = ring?.getBoundingClientRect();
    const imageRect = image?.getBoundingClientRect();
    return ringRect && imageRect
      ? {
          x: Math.abs(
            ringRect.left + ringRect.width / 2 - (imageRect.left + imageRect.width / 2),
          ),
          y: Math.abs(
            ringRect.top + ringRect.height / 2 - (imageRect.top + imageRect.height / 2),
          ),
        }
      : null;
  });
  expect(envelopeAlignment).not.toBeNull();
  expect(envelopeAlignment!.x).toBeLessThanOrEqual(1);
  expect(envelopeAlignment!.y).toBeLessThanOrEqual(1);

  const hint = page.getByRole('button', { name: /Использовать подсказку/ });
  await hint.click();
  await hint.click();
  const stacking = await page.getByLabel('Игровое поле уровня 1').evaluate((board) => {
    const arrow = board.querySelector<SVGElement>('svg');
    const current = board.querySelector<HTMLElement>('button[class*="hintCurrent"]');
    return arrow && current
      ? {
          arrow: Number.parseInt(getComputedStyle(arrow).zIndex, 10),
          current: Number.parseInt(getComputedStyle(current).zIndex, 10),
        }
      : null;
  });
  expect(stacking).not.toBeNull();
  expect(stacking!.arrow).toBeGreaterThan(stacking!.current);
  await expectNoDocumentScroll(page);

  await page.goto('/?screen=results&level=1');
  await expectInsideVisualViewport(page, 'button:has-text("Уровень 2")');
  await expectInsideVisualViewport(page, 'button:has-text("Показать поле")');
  const resultsBack = page.getByRole('button', { name: 'На главный экран' });
  const backStyle = await resultsBack.evaluate((button) => {
    const style = getComputedStyle(button);
    return { background: style.backgroundColor, shadow: style.boxShadow };
  });
  expect(backStyle.background).toBe('rgba(0, 0, 0, 0)');
  expect(backStyle.shadow).toBe('none');
  await expectNoDocumentScroll(page);
});

test('reports a noncanonical target route without awarding the word', async ({ page }) => {
  await page.goto('/?screen=game&level=1');
  const alternateIncomePath: CellId[] = ['4:4', '4:3', '4:2', '5:2', '6:2'];

  await selectPath(page, alternateIncomePath);
  await expect(page.getByText('Попробуйте собрать слово по-другому')).toBeVisible();

  const gameState = await readGameState(page);
  expect(gameState.knowledge).toBe(0);
  expect(gameState.foundTargets).toEqual([]);

  const event = await page.evaluate(() =>
    window.__FINWORDS_ANALYTICS__
      ?.filter((candidate) => candidate.name === 'invalid_word_submitted')
      .at(-1),
  );
  expect(event?.payload).toMatchObject({
    reason: 'noncanonical_target_path',
    targetId: 'income',
    word: 'ДОХОД',
  });
});

test('centers offer and reward modals in the WebView', async ({ page }) => {
  const states = [
    {
      url: '/?screen=game&level=1&overlay=course',
      heading: 'АКЦИЯ',
    },
    {
      url: '/?screen=game&level=2&overlay=product',
      heading: 'ИИС',
    },
    {
      url: '/?screen=game&level=1&overlay=regular-reward',
      heading: 'Выберите награду',
    },
    {
      url: '/?screen=home&overlay=golden-reward',
      heading: 'Выберите награду',
    },
  ];

  await page.setViewportSize({ width: 390, height: 716 });
  for (const state of states) {
    await page.goto(state.url);
    await expect(page.getByRole('heading', { name: state.heading })).toBeVisible();
    await page.waitForTimeout(220);
    const gaps = await page.evaluate((heading) => {
      const title = [...document.querySelectorAll('h2')].find(
        (candidate) => candidate.textContent === heading,
      );
      const modal = title?.closest('div[class*="modal_"]');
      const rect = modal?.getBoundingClientRect();
      return rect
        ? {
            top: rect.top,
            bottom: window.innerHeight - rect.bottom,
            left: rect.left,
            right: window.innerWidth - rect.right,
          }
        : null;
    }, state.heading);

    expect(gaps).not.toBeNull();
    // iPhone WebKit keeps the modal inside its asymmetric safe-area insets.
    expect(Math.abs(gaps!.top - gaps!.bottom)).toBeLessThanOrEqual(32);
    expect(Math.abs(gaps!.left - gaps!.right)).toBeLessThanOrEqual(1);
    expect(gaps!.top).toBeGreaterThanOrEqual(16);
    expect(gaps!.left).toBeGreaterThanOrEqual(16);
  }
});
