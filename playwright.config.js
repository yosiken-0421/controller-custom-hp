// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const CHROME_ONLY = /video-chrome\.spec\.js/;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173/',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node tools/serve.js dist 4173',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: CHROME_ONLY },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] }, testIgnore: CHROME_ONLY },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'] }, testIgnore: CHROME_ONLY },
    // モバイルのエミュレーション（hasTouch / isMobile はデバイス定義に含まれる）
    { name: 'mobile-iphone15', use: { ...devices['iPhone 15'] }, testIgnore: CHROME_ONLY },
    { name: 'mobile-pixel7', use: { ...devices['Pixel 7'] }, testIgnore: CHROME_ONLY },
    // H.264 の再生確認だけはインストール済みの Google Chrome で行う（同梱 Chromium は H.264 非搭載の可能性があるため）
    { name: 'chrome-h264', use: { ...devices['Desktop Chrome'], channel: 'chrome' }, testMatch: CHROME_ONLY },
  ],
});
