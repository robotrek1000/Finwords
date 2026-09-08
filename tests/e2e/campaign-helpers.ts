import { expect, type Page } from '@playwright/test';
import type { CellId } from '../../src/app/types';
const TUTORIAL_PATHS = [
  ['1:1', '1:2', '1:3'],
  ['2:1', '2:2', '3:2'],
  ['1:3', '1:2', '1:1'],
  ['2:1', '2:2', '3:2'],
  ['1:1', '1:2', '1:3'],
] as const satisfies readonly (readonly CellId[])[];

export async function selectPath(page: Page, path: readonly CellId[]): Promise<void> {
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

export async function completeMandatoryTutorial(page: Page): Promise<void> {
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
