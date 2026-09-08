import { expect, test, type Page } from '@playwright/test';
import type { CellId } from '../../src/app/types';

const CHAPTER_BOUNDARIES = new Set([9, 17, 24, 31, 38, 44, 50]);
type CampaignTestLevel = {
  grid: string[][];
  targets: Array<{ path: CellId[] }>;
};
type CampaignTestChapter = {
  title: string;
  levelStart: number;
  levelEnd: number;
};

async function loadCampaignFixtures(page: Page): Promise<{
  chapters: CampaignTestChapter[];
  levels: Record<number, CampaignTestLevel>;
}> {
  return page.evaluate(async () => {
    const modulePath = '/src/content/campaign.ts';
    const campaign = await import(modulePath) as {
      CAMPAIGN_CHAPTERS: CampaignTestChapter[];
      CAMPAIGN_LEVELS: Record<number, CampaignTestLevel>;
    };
    return {
      chapters: campaign.CAMPAIGN_CHAPTERS,
      levels: campaign.CAMPAIGN_LEVELS,
    };
  });
}
const TUTORIAL_PATHS = [
  ['1:1', '1:2', '1:3'],
  ['2:1', '2:2', '3:2'],
  ['1:3', '1:2', '1:1'],
  ['2:1', '2:2', '3:2'],
  ['1:1', '1:2', '1:3'],
] as const satisfies readonly (readonly CellId[])[];

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
    await page.mouse.move(center.x, center.y, { steps: 2 });
  }
  await page.mouse.up();
}

async function completeMandatoryTutorial(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Обучение' })).toBeVisible();
  for (const path of TUTORIAL_PATHS) {
    await selectPath(page, path);
    const next = page.getByRole('button', { name: 'Далее', exact: true });
    await expect(next).toBeEnabled();
    await next.click();
  }
  await page.locator('[data-cell-id="2:1"]').click();
  await page.getByRole('dialog', { name: 'ПАР' })
    .getByRole('button', { name: 'Понятно', exact: true })
    .click();
  await page.getByRole('button', { name: 'Далее', exact: true }).click();
}

async function expectNoDocumentScroll(page: Page): Promise<void> {
  expect(await page.evaluate(() => ({
    horizontal: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    vertical: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
  }))).toEqual({ horizontal: false, vertical: false });
}

async function expectCampaignCompleteLayout(
  page: Page,
  viewport: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  const summary = page.getByLabel('Итоги кампании');
  await expect(summary).toBeVisible();
  await expect(summary.getByRole('button', { name: 'На главную', exact: true })).toBeInViewport();
  const geometry = await summary.getByRole('heading', { name: 'Вы прошли 50 уровней!' }).evaluate((heading) => {
    const screen = heading.closest('section');
    const card = heading.parentElement?.parentElement;
    const button = screen?.querySelector('button');
    if (!screen || !card || !button) throw new Error('Campaign Complete geometry is unavailable');
    const screenRect = screen.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      screen: { left: screenRect.left, top: screenRect.top, right: screenRect.right, bottom: screenRect.bottom },
      card: { left: cardRect.left, top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom },
      button: { left: buttonRect.left, top: buttonRect.top, right: buttonRect.right, bottom: buttonRect.bottom },
    };
  });
  expect(geometry.card.left).toBeGreaterThanOrEqual(geometry.screen.left - 1);
  expect(geometry.card.right).toBeLessThanOrEqual(geometry.screen.right + 1);
  expect(geometry.card.top).toBeGreaterThanOrEqual(geometry.screen.top - 1);
  expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.screen.bottom + 1);
  expect(geometry.button.left).toBeGreaterThanOrEqual(geometry.screen.left - 1);
  expect(geometry.button.right).toBeLessThanOrEqual(geometry.screen.right + 1);
  await expectNoDocumentScroll(page);
}

test('uninterrupted honest L1→L50 campaign reaches campaign_complete without a completion seed', async ({ page }) => {
  test.setTimeout(12 * 60_000);
  const browserErrors = captureBrowserErrors(page);
  const completionRequests: Array<string | null> = [];
  page.on('request', (request) => {
    if (
      request.method() === 'POST'
      && request.url().endsWith('/api/v1/campaigns/current/completion-shown')
    ) completionRequests.push(request.postData());
  });

  await page.goto('/');
  const campaign = await loadCampaignFixtures(page);
  await page.getByRole('button', { name: 'Уровень 1', exact: true }).click();
  await completeMandatoryTutorial(page);
  await expect(page.getByLabel('История главы')).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();

  for (let levelNumber = 1; levelNumber <= 50; levelNumber += 1) {
    const levelScreen = page.getByLabel(`Игровой экран уровня ${levelNumber}`);
    await expect(levelScreen).toBeVisible();
    const targets = campaign.levels[levelNumber].targets;
    for (const [index, target] of targets.entries()) {
      const path = index % 2 === 0 ? target.path : [...target.path].reverse();
      await selectPath(page, path);
      if (index < targets.length - 1) {
        await expect(page.getByLabel(`Осталось слов: ${targets.length - index - 1} из ${targets.length}`))
          .toBeVisible();
      }
    }

    const results = page.getByLabel(`Результаты уровня ${levelNumber}`);
    await expect(results).toBeVisible();
    if (!CHAPTER_BOUNDARIES.has(levelNumber)) {
      await results.getByRole('button', { name: 'Следующий уровень', exact: true }).click();
      continue;
    }

    await results.getByRole('button', { name: 'Забрать награду', exact: true }).click();
    const golden = page.getByRole('dialog', { name: 'Выберите награду' });
    await expect(golden).toBeVisible();
    await golden.getByRole('radio', { name: 'Три подсказки', exact: true }).check();
    await golden.getByRole('button', { name: 'Забрать награду', exact: true }).click();

    const feedback = page.getByRole('dialog', { name: 'Оставить отзыв' });
    await expect(feedback).toBeVisible();
    await feedback.getByRole('button', { name: 'Закрыть отзыв', exact: true }).click();

    if (levelNumber < 50) {
      const nextChapter = campaign.chapters.find((chapter) => chapter.levelStart === levelNumber + 1);
      expect(nextChapter).toBeDefined();
      await expect(page.getByLabel('История главы')).toBeVisible();
      await expect(page.getByRole('heading', { name: nextChapter?.title })).toBeVisible();
      await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
    }
  }

  const summary = page.getByLabel('Итоги кампании');
  await expect(summary).toBeVisible();
  await expect(summary.getByRole('heading', { name: 'Вы прошли 50 уровней!' })).toBeVisible();
  await expect(summary.getByText('Новые главы и финансовые открытия уже на подходе.')).toBeVisible();
  await expect(summary.getByText('50/50', { exact: true })).toBeVisible();
  await expect(summary.getByText('7/7', { exact: true })).toBeVisible();
  await expect(summary.getByText('266', { exact: true })).toBeVisible();
  await expect(summary.getByText('0', { exact: true })).toBeVisible();
  await expect(summary.getByText('2 из 17', { exact: true })).toBeVisible();
  await expect(summary.getByRole('img', { name: 'Аналитик' })).toBeVisible();
  await expect(summary.getByText('Финворды', { exact: true })).toBeVisible();
  await expect(summary.getByText('Кампания завершена', { exact: true })).toBeVisible();
  const state = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? '{}') as {
    phase?: string;
    knowledge?: number;
  });
  expect(state.phase).toBe('campaign-complete');
  expect(state.knowledge).toBe(266);
  await expect.poll(async () => page.evaluate(async () => {
    const response = await fetch('/api/v1/clients/me/state');
    const body = await response.json() as {
      clientState: { clientView: { campaignProgress: { isCompletionShown: boolean } } };
    };
    return body.clientState.clientView.campaignProgress.isCompletionShown;
  })).toBe(true);
  const authoritative = await page.evaluate(async () => {
    const response = await fetch('/api/v1/clients/me/state');
    return response.json() as Promise<{
      clientState: {
        levels: Array<{ status: string }>;
        chapters: Array<{ status: string }>;
        clientView: { campaignProgress: { isCompleted: boolean; isCompletionShown: boolean } };
      };
    }>;
  });
  expect(authoritative.clientState.levels.filter((level) => level.status === 'completed')).toHaveLength(50);
  expect(authoritative.clientState.chapters.filter((chapter) => chapter.status === 'completed')).toHaveLength(7);
  expect(authoritative.clientState.clientView.campaignProgress).toEqual({
    isCompleted: true,
    isCompletionShown: true,
  });
  expect(completionRequests).toEqual([null]);

  await summary.getByRole('button', { name: 'На главную', exact: true }).click();
  const home = page.getByLabel('Главный экран');
  await expect(home.getByRole('button', { name: 'Итоги игры', exact: true })).toBeVisible();
  await home.getByRole('button', { name: 'Итоги игры', exact: true }).click();
  await expect(page.getByLabel('Итоги кампании')).toBeVisible();
  expect(completionRequests).toEqual([null]);
  await expectNoDocumentScroll(page);
  expect(browserErrors).toEqual([]);
});

for (const boundaryLevel of CHAPTER_BOUNDARIES) {
  test(`campaign boundary Level ${boundaryLevel} follows Results → Golden → Feedback`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    await page.addInitScript((levelNumber) => {
      window.__FINWORDS_E2E__ = {
        seed: 'campaign-boundary',
        campaignBoundaryLevel: levelNumber as 9 | 17 | 24 | 31 | 38 | 44 | 50,
      };
    }, boundaryLevel);
    const browserErrors = captureBrowserErrors(page);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByLabel('Главный экран')).toBeVisible();
    const campaign = await loadCampaignFixtures(page);
    const before = await page.evaluate(async () => {
      const response = await fetch('/api/v1/clients/me/state');
      return response.json() as Promise<{
        clientState: {
          levels: Array<{ status: string }>;
          pendingResults?: unknown;
          pendingReward?: unknown;
          clientView: { campaignProgress: { isCompleted: boolean } };
        };
      }>;
    });
    expect(before.clientState.levels.slice(0, boundaryLevel - 1).every((level) => level.status === 'completed'))
      .toBe(true);
    expect(before.clientState.levels[boundaryLevel - 1].status).toBe('available');
    expect(before.clientState.pendingResults).toBeUndefined();
    expect(before.clientState.pendingReward).toBeUndefined();
    expect(before.clientState.clientView.campaignProgress.isCompleted).toBe(false);

    await page.getByRole('button', { name: `Уровень ${boundaryLevel}`, exact: true }).click();
    await expect(page.getByLabel(`Игровой экран уровня ${boundaryLevel}`)).toBeVisible();
    const targets = campaign.levels[boundaryLevel].targets;
    for (const [index, target] of targets.entries()) {
      await selectPath(page, index % 2 === 0 ? target.path : [...target.path].reverse());
      if (index < targets.length - 1) {
        await expect(page.getByLabel(`Осталось слов: ${targets.length - index - 1} из ${targets.length}`))
          .toBeVisible();
      }
    }

    const results = page.getByLabel(`Результаты уровня ${boundaryLevel}`);
    await expect(results.getByRole('heading', { name: 'Глава завершена!' })).toBeVisible();
    await results.getByRole('button', { name: 'Забрать награду', exact: true }).click();
    const golden = page.getByRole('dialog', { name: 'Выберите награду' });
    await golden.getByRole('radio', { name: 'Три подсказки', exact: true }).check();
    await golden.getByRole('button', { name: 'Забрать награду', exact: true }).click();
    const feedback = page.getByRole('dialog', { name: 'Оставить отзыв' });
    await expect(feedback).toBeVisible();
    await feedback.getByRole('button', { name: 'Закрыть отзыв', exact: true }).click();

    if (boundaryLevel < 50) {
      const nextChapter = campaign.chapters.find((chapter) => chapter.levelStart === boundaryLevel + 1);
      await expect(page.getByLabel('История главы')).toBeVisible();
      await expect(page.getByRole('heading', { name: nextChapter?.title })).toBeVisible();
    } else {
      const summary = page.getByLabel('Итоги кампании');
      await expect(summary.getByRole('heading', { name: 'Вы прошли 50 уровней!' })).toBeVisible();
      await expect(summary.getByRole('heading', { name: 'Вы прошли 50 уровней!' })).toBeFocused();
      await expect(summary.getByText('50/50', { exact: true })).toBeVisible();
      await expect(summary.getByText('7/7', { exact: true })).toBeVisible();
      await expect.poll(async () => page.evaluate(async () => {
        const response = await fetch('/api/v1/clients/me/state');
        const body = await response.json() as {
          clientState: { clientView: { campaignProgress: { isCompletionShown: boolean } } };
        };
        return body.clientState.clientView.campaignProgress.isCompletionShown;
      })).toBe(true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect(await summary.evaluate((screen) => Array.from(screen.querySelectorAll('*')).every((element) => {
        const style = getComputedStyle(element);
        return style.animationName === 'none' || style.animationDuration === '0s';
      }))).toBe(true);
      for (const viewport of [
        { width: 320, height: 568 },
        { width: 360, height: 640 },
        { width: 390, height: 844 },
        { width: 430, height: 932 },
        { width: 1440, height: 900 },
      ]) await expectCampaignCompleteLayout(page, viewport);
      const renderState = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? '{}') as {
        phase?: string;
        knowledge?: number;
        completedLevels?: string[];
        nextAction?: string;
      });
      expect(renderState).toMatchObject({
        phase: 'campaign-complete',
        knowledge: 266,
        nextAction: 'none',
      });
      expect(renderState.completedLevels).toHaveLength(50);
      if (testInfo.project.name === 'chromium-mobile') {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({
          path: testInfo.outputPath('campaign-complete-390x844.png'),
          fullPage: false,
        });
      }
    }
    await expectNoDocumentScroll(page);
    expect(browserErrors).toEqual([]);
  });
}
