import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader'],
});
const viewport = {
  width: Number(process.argv[3] ?? 390),
  height: Number(process.argv[4] ?? 844),
};
const page = await browser.newPage({ viewport });
const errors = [];
const failedResources = [];

page.on('console', (message) => {
  if (message.type() === 'error') {
    errors.push({ type: 'console', text: message.text() });
  }
});
page.on('pageerror', (error) => {
  errors.push({ type: 'pageerror', text: String(error) });
});
page.on('requestfailed', (request) => {
  failedResources.push({
    url: request.url(),
    error: request.failure()?.errorText ?? 'request failed',
  });
});
page.on('response', (response) => {
  if (response.status() >= 400) {
    failedResources.push({
      url: response.url(),
      error: `HTTP ${response.status()}`,
    });
  }
});

await page.goto(process.argv[2] ?? 'http://127.0.0.1:5173', {
  waitUntil: 'networkidle',
});

const result = await page.evaluate(() => {
  function inspect(selector) {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      selector,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      background: style.backgroundColor,
      color: style.color,
      overflow: style.overflow,
      children: element.children.length,
      text: element.textContent?.trim().slice(0, 160),
    };
  }

  return {
    body: inspect('body'),
    root: inspect('#root'),
    stage: inspect('[data-game-state]'),
    device: inspect('[data-game-state] > div'),
    webview: inspect('main'),
    screen: inspect('main > section'),
    heading: inspect('h1'),
    errors: [],
    failedResources: [],
    fontLoaded: document.fonts.check('16px Fregat'),
    imageStates: [...document.images].map((image) => ({
      src: image.currentSrc || image.src,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    })),
  };
});

result.errors = errors;
result.failedResources = failedResources;
console.log(JSON.stringify(result));
await page.screenshot({
  path: `output/inspect-${viewport.width}x${viewport.height}.png`,
});
await browser.close();
