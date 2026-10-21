const { test, expect, gotoHome, shot, makeImage } = require('./fixtures');

const count = (page) => page.locator('#cart-count');

test.describe('カート', () => {
  test('追加・数量変更・削除ができ、再読み込み後も残る', async ({ page }, testInfo) => {
    await gotoHome(page);
    await page.click('.swatch[data-color="#FF6B2C"]');
    await page.setInputFiles('#image-input', { name: 'a.png', mimeType: 'image/png', buffer: await makeImage(page, 600, 400) });
    await expect(page.locator('#preview image.art')).toHaveCount(1);
    await page.click('#cz-add');
    await expect(count(page)).toHaveText('1');
    await page.click('.part-tab[data-part="back-shell"]');
    await page.click('.swatch[data-color="#3E7C4F"]');
    await page.click('#cz-add');
    await expect(count(page)).toHaveText('2');

    await page.click('#cart-open');
    const items = page.locator('.cart-item');
    await expect(items).toHaveCount(2);
    // サムネイルは長辺 300px の JPEG（取得できない環境では SVG）
    const src = await items.first().locator('.cart-thumb img').getAttribute('src');
    expect(src).toMatch(/^data:image\/(jpeg|svg\+xml)/);
    if (src.startsWith('data:image/jpeg')) {
      const w = await items.first().locator('.cart-thumb img').evaluate((im) => im.naturalWidth);
      expect(w).toBe(300);
    }
    testInfo.annotations.push({ type: 'thumbnail', description: src.slice(0, 22) });
    await expect(items.first().locator('.cart-spec')).toContainText('#FF6B2C');
    await expect(items.first().locator('.cart-spec')).toContainText('+IMG');
    await shot(page, testInfo, '05-cart');

    await items.first().locator('.qty-inc').click();
    await items.first().locator('.qty-inc').click();
    await expect(items.first().locator('.qty-val')).toHaveText('3');
    await expect(count(page)).toHaveText('4');
    await items.first().locator('.qty-dec').click();
    await expect(items.first().locator('.qty-val')).toHaveText('2');
    await items.nth(1).locator('.remove').click();
    await expect(items).toHaveCount(1);
    await expect(count(page)).toHaveText('2');

    await page.reload();
    await page.waitForSelector('#preview svg');
    await expect(count(page)).toHaveText('2');
    await page.click('#cart-open');
    await expect(page.locator('.cart-item')).toHaveCount(1);
    await expect(page.locator('#storage-note')).toBeHidden();
    // 元画像（大きな dataURL）は保存されていない
    const saved = await page.evaluate(() => localStorage.getItem('shellcraft.cart.v1'));
    expect(saved.length).toBeLessThan(200_000);
    expect(saved).not.toContain('data:image/png');
  });

  test('localStorage が使えない環境でもカートが動作し、控えめに通知する', async ({ page }) => {
    await page.addInitScript(() => {
      const deny = () => { throw new DOMException('denied', 'SecurityError'); };
      try { Storage.prototype.getItem = deny; Storage.prototype.setItem = deny; } catch (e) {}
      try { Object.defineProperty(window, 'localStorage', { configurable: true, get: deny }); } catch (e) {}
    });
    await gotoHome(page);
    await page.click('#cz-add');
    await expect(count(page)).toHaveText('1');
    await page.click('#cart-open');
    await expect(page.locator('#storage-note')).toBeVisible();
    await page.locator('.cart-item .qty-inc').click();
    await expect(count(page)).toHaveText('2');
    await page.locator('.cart-item .remove').click();
    await expect(page.locator('#cart-empty')).toBeVisible();
    // カスタマイザーも引き続き動く
    await page.click('#cart-close');
    await page.click('.swatch[data-color="#6FB7C9"]');
    expect((await page.locator('#preview [data-part="front-shell"] .base').getAttribute('fill')).toLowerCase()).toBe('#6fb7c9');
  });

  test('カートはキーボードで開閉でき、Esc で閉じるとフォーカスが戻る', async ({ page }) => {
    await gotoHome(page);
    await page.locator('#cart-open').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#cart-drawer')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#cart-drawer')).toBeHidden();
    await expect(page.locator('#cart-open')).toBeFocused();
  });
});
