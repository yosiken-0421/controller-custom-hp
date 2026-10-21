const { test, expect, shot, gotoHome } = require('./fixtures');

const WIDTHS = [320, 360, 390, 430, 768, 1024, 1280, 1920];

async function noHScroll(page) {
  return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
}

test.describe('レイアウト', () => {
  test('各画面幅で横スクロールが発生しない', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.startsWith('desktop'), '画面幅の一覧はデスクトップ3エンジンで確認（モバイルは次のテスト）');
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await gotoHome(page);
      const r = await noHScroll(page);
      expect(r.sw, `幅 ${width}px`).toBeLessThanOrEqual(r.iw);
      // メニューを開いた状態・カートを開いた状態でも確認
      if (await page.locator('#menu-toggle').isVisible()) {
        await page.click('#menu-toggle');
        expect((await noHScroll(page)).sw, `幅 ${width}px メニュー表示`).toBeLessThanOrEqual(r.iw);
        await page.click('#menu-toggle');
      }
      await page.click('#cart-open');
      expect((await noHScroll(page)).sw, `幅 ${width}px カート表示`).toBeLessThanOrEqual(r.iw);
      await page.keyboard.press('Escape');
      if (width === 320 || width === 1280 || width === 1920) await shot(page, testInfo, `w${width}-full`, { fullPage: true });
    }
  });

  test('モバイル端末のエミュレーションで横スクロールが無く、主要画面のスクリーンショットを保存', async ({ page }, testInfo) => {
    await gotoHome(page);
    const r = await noHScroll(page);
    expect(r.sw).toBeLessThanOrEqual(r.iw);
    await shot(page, testInfo, '01-hero');
    await shot(page, testInfo, '00-full', { fullPage: true });
    await page.locator('#customizer').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.getElementById('customizer').scrollIntoView());
    await shot(page, testInfo, '02-customizer');
    if (await page.locator('#menu-toggle').isVisible()) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.click('#menu-toggle');
      await expect(page.locator('#site-nav')).toBeVisible();
      await shot(page, testInfo, '03-menu');
      await page.click('#site-nav a[href="#faq"]');
      await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test('FAQ はアコーディオンで開閉できる', async ({ page }) => {
    await gotoHome(page);
    const d = page.locator('#faq details').first();
    await expect(d).not.toHaveAttribute('open', '');
    await d.locator('summary').click();
    await expect(d).toHaveAttribute('open', '');
    await expect(d.locator('.faq-a')).toBeVisible();
  });

  test('OGP・商標表記・viewport が入っている', async ({ page }) => {
    await gotoHome(page);
    for (const p of ['og:title', 'og:description', 'og:image']) {
      await expect(page.locator(`meta[property="${p}"]`)).toHaveAttribute('content', /.+/);
    }
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /width=device-width/);
    await expect(page.locator('.site-footer')).toContainText('PlayStation、PS5、DualSenseは株式会社ソニー・インタラクティブエンタテインメントの登録商標または商標です。本サイトは同社とは無関係の架空デモサイトです。');
    // 相対パスのみ（サブパス配信のため / 始まりの参照が無いこと）
    const abs = await page.evaluate(() => Array.from(document.querySelectorAll('[src],[href],[poster]'))
      .map((e) => e.getAttribute('src') || e.getAttribute('href') || e.getAttribute('poster'))
      .filter((v) => v && v.startsWith('/') && !v.startsWith('//')));
    expect(abs).toEqual([]);
  });
});
