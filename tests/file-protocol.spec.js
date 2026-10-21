// index.html を file:// で直接開いても主要機能が動くこと
const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect, makeImage } = require('./fixtures');

const FILE_URL = pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;

test('file:// で開いてもカスタマイザー・画像・カート・購入画面が動く', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith('mobile'), 'file:// はデスクトップで確認');
  await page.goto(FILE_URL);
  await page.waitForSelector('#preview svg');
  await page.click('.swatch[data-color="#F2C14E"]');
  expect((await page.locator('#preview [data-part="front-shell"] .base').getAttribute('fill')).toLowerCase()).toBe('#f2c14e');
  await page.setInputFiles('#image-input', { name: 'a.png', mimeType: 'image/png', buffer: await makeImage(page, 400, 300) });
  await expect(page.locator('#preview image.art')).toHaveCount(1);
  await page.click('#cz-add');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await page.click('#cart-open');
  await expect(page.locator('.cart-item')).toHaveCount(1);
  await page.click('#to-checkout');
  await expect(page.locator('#checkout')).toBeVisible();
  // CSS が読み込まれている
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(27, 28, 30)');
});
