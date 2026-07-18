import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:5173';
const outputDirectory = 'output/visual-qa';
const states = [
  ['home', '/'],
  ['narrative', '/?screen=narrative&level=1'],
  ['game', '/?screen=game&level=1'],
  ['course', '/?screen=game&level=1&overlay=course'],
  ['product', '/?screen=game&level=2&overlay=product'],
  ['results', '/?screen=results&level=1'],
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
});
const errors = [];

for (const [name, path] of states) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push({ state: name, type: 'console', text: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    errors.push({ state: name, type: 'pageerror', text: String(error) });
  });
  await page.goto(new URL(path, baseURL).toString(), { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${outputDirectory}/${name}.png` });
  await page.close();
}

console.log(JSON.stringify({ captures: states.map(([name]) => name), errors }));
await browser.close();
