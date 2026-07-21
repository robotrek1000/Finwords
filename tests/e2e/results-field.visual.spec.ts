import { expect, test } from '@playwright/test';

const cases = [
  {
    name: 'level-1-regular',
    url: '/?screen=results-field&level=1',
    viewport: { width: 390, height: 716 },
    reviewLabel: 'Просмотр поля уровня 1',
  },
  {
    name: 'level-2-regular',
    url: '/?screen=results-field&level=2',
    viewport: { width: 390, height: 716 },
    reviewLabel: 'Просмотр поля уровня 2',
  },
  {
    name: 'level-1-iphone-browser',
    url: '/?screen=results-field&level=1',
    viewport: { width: 393, height: 663 },
    reviewLabel: 'Просмотр поля уровня 1',
  },
  {
    name: 'level-1-condensed',
    url: '/?screen=results-field&level=1',
    viewport: { width: 320, height: 568 },
    reviewLabel: 'Просмотр поля уровня 1',
  },
  {
    name: 'word-definition',
    url: '/?screen=results-field&level=1&overlay=word-definition',
    viewport: { width: 390, height: 716 },
    reviewLabel: 'Просмотр поля уровня 1',
    dialogTitle: 'ФОНД',
  },
  {
    name: 'course',
    url: '/?screen=results-field&level=1&overlay=course',
    viewport: { width: 390, height: 716 },
    reviewLabel: 'Просмотр поля уровня 1',
    dialogTitle: 'АКЦИЯ',
  },
  {
    name: 'product',
    url: '/?screen=results-field&level=2&overlay=product',
    viewport: { width: 390, height: 716 },
    reviewLabel: 'Просмотр поля уровня 2',
    dialogTitle: 'ИИС',
  },
] as const;

test('captures completed field review states without clipping', async ({ page }, testInfo) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      runtimeErrors.push(message.text());
    }
  });

  for (const visualCase of cases) {
    await page.setViewportSize(visualCase.viewport);
    await page.goto(visualCase.url);
    await expect(page.getByLabel(visualCase.reviewLabel)).toBeVisible();

    if ('dialogTitle' in visualCase) {
      await expect(page.getByRole('heading', { name: visualCase.dialogTitle })).toBeVisible();
    } else {
      await expect(page.getByTestId('results-field-primary')).toBeVisible();
      await expect(page.getByTestId('results-field-hide')).toBeVisible();
    }
    await page.waitForTimeout(250);

    const viewportHeight = await page.evaluate(
      () => window.visualViewport?.height ?? window.innerHeight,
    );
    const documentMetrics = await page.evaluate(() => ({
      clientHeight: document.documentElement.clientHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    expect(documentMetrics.scrollHeight).toBe(documentMetrics.clientHeight);

    for (const locator of [
      page.getByLabel(visualCase.reviewLabel),
      page.locator('[data-cell-id="1:1"]'),
    ]) {
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewportHeight + 1);
    }

    if (!('dialogTitle' in visualCase)) {
      for (const locator of [
        page.getByTestId('results-field-primary'),
        page.getByTestId('results-field-hide'),
      ]) {
        const box = await locator.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y + box!.height).toBeLessThanOrEqual(viewportHeight + 1);
      }
    }

    await page.screenshot({
      path: `output/field-review-qa/${testInfo.project.name}-${visualCase.name}.png`,
    });
  }

  expect(runtimeErrors).toEqual([]);
});
