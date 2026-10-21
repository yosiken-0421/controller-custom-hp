const { test, expect, gotoHome } = require('./fixtures');

const fillOf = (page, part) => page.locator(`#preview [data-part="${part}"] .base`).getAttribute('fill');

test.describe('カスタマイザー：色・仕上げ', () => {
  test('色見本で選択中パーツの fill が変わり、パーツを切り替えると別パーツに反映される', async ({ page }) => {
    await gotoHome(page);
    const backBefore = await fillOf(page, 'back-shell');

    await page.click('.swatch[data-color="#FF6B2C"]');
    expect((await fillOf(page, 'front-shell')).toLowerCase()).toBe('#ff6b2c');
    // 実際に描画される色（computed style）も確認。0.25秒のトランジション後に到達する
    await expect.poll(() => page.$eval('#preview [data-part="front-shell"] .base', (el) => getComputedStyle(el).fill), { timeout: 2000 })
      .toBe('rgb(255, 107, 44)');
    expect(await fillOf(page, 'back-shell')).toBe(backBefore);

    await page.click('.part-tab[data-part="back-shell"]');
    await expect(page.locator('.part-tab[data-part="back-shell"]')).toHaveAttribute('aria-pressed', 'true');
    await page.click('.swatch[data-color="#2F5D8A"]');
    expect((await fillOf(page, 'back-shell')).toLowerCase()).toBe('#2f5d8a');
    expect((await fillOf(page, 'front-shell')).toLowerCase()).toBe('#ff6b2c');

    await expect(page.locator('#spec .spec-row[data-part="back-shell"] dd')).toContainText('#2F5D8A');
  });

  test('自由な色指定（input type=color）が反映される', async ({ page }) => {
    await gotoHome(page);
    await page.click('.part-tab[data-part="touchpad"]');
    await page.locator('#color-input').fill('#12ab34');
    expect((await fillOf(page, 'touchpad')).toLowerCase()).toBe('#12ab34');
    await expect(page.locator('#color-code')).toHaveText('#12AB34');
  });

  test('仕上げ（マット／グロス／メタリック）が切り替わる', async ({ page }) => {
    await gotoHome(page);
    for (const f of ['gloss', 'metal', 'matte']) {
      await page.click(`.seg-btn[data-finish="${f}"]`);
      await expect(page.locator('#preview [data-part="front-shell"] .finish')).toHaveAttribute('data-finish', f);
    }
    await expect(page.locator('#spec .spec-row[data-part="front-shell"] dd')).toContainText('MATTE');
  });

  test('ランダム配色とリセット', async ({ page }) => {
    await gotoHome(page);
    const before = await page.evaluate(() => JSON.stringify(SC.CustomizerView.getState().parts));
    let changed = false;
    for (let i = 0; i < 5 && !changed; i++) {
      await page.click('#cz-random');
      changed = before !== await page.evaluate(() => JSON.stringify(SC.CustomizerView.getState().parts));
    }
    expect(changed).toBe(true);
    await page.click('#cz-reset');
    expect(await page.evaluate(() => JSON.stringify(SC.CustomizerView.getState().parts))).toBe(before);
  });

  test('キーボードだけで色を変えられる', async ({ page, browserName }) => {
    await gotoHome(page);
    await page.locator('.part-tab[data-part="sticks"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.part-tab[data-part="sticks"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('.swatch[data-color="#3E7C4F"]').focus();
    await page.keyboard.press('Space');
    expect((await fillOf(page, 'sticks')).toLowerCase()).toBe('#3e7c4f');
  });
});
