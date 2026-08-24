import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/pages-smoke.spec.ts',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174/Finwords/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'pages-chromium-mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
    {
      name: 'pages-webkit-iphone',
      use: { ...devices['iPhone 15'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'pages-chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'VITE_BASE_URL=/Finwords/ npm run preview -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/Finwords/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
