const { test, expect, gotoHome } = require('./fixtures');

test.describe('宣伝動画', () => {
  test('muted / playsinline / poster があり、ポスターと動画ファイルが読み込める', async ({ page, request }, testInfo) => {
    await gotoHome(page);
    const v = page.locator('#promo');
    await expect(v).toHaveAttribute('muted', '');
    await expect(v).toHaveAttribute('playsinline', '');
    await expect(v).toHaveAttribute('loop', '');
    await expect(v).toHaveAttribute('poster', 'assets/promo-poster.jpg');
    expect(await v.evaluate((el) => el.muted)).toBe(true);
    for (const f of ['assets/promo-poster.jpg', 'assets/promo.mp4', 'assets/promo.webm', 'assets/og.png']) {
      expect((await request.get(f)).status(), f).toBe(200);
    }
    // このブラウザの対応状況を記録（同梱ブラウザの H.264 対応は環境によって異なる）
    const support = await v.evaluate((el) => ({
      h264: el.canPlayType('video/mp4; codecs="avc1.640028"'),
      vp9: el.canPlayType('video/webm; codecs="vp9"'),
    }));
    testInfo.annotations.push({ type: 'canPlayType', description: JSON.stringify(support) });

    // 再生できる形式があれば再生が進む。無ければポスターと再生ボタンが見えている（壊れて見えない）
    await page.waitForTimeout(1500);
    const st = await v.evaluate((el) => ({ paused: el.paused, t: el.currentTime, src: el.currentSrc, err: el.error && el.error.code }));
    testInfo.annotations.push({ type: 'playback', description: JSON.stringify(st) });
    if (support.h264 || support.vp9) {
      if (st.paused) {
        // 自動再生がブロックされた場合のフォールバック表示
        await expect(page.locator('#reel')).toHaveClass(/is-paused/);
        await expect(page.locator('#promo-toggle')).toBeVisible();
      } else {
        expect(st.t).toBeGreaterThan(0.2);
      }
    } else {
      await expect(page.locator('#reel')).toHaveClass(/no-video|is-paused/);
    }
  });

  test('再生／一時停止ボタンで操作できる', async ({ page }) => {
    await gotoHome(page);
    const v = page.locator('#promo');
    const canPlay = await v.evaluate((el) => !!(el.canPlayType('video/mp4; codecs="avc1.640028"') || el.canPlayType('video/webm; codecs="vp9"')));
    test.skip(!canPlay, 'このブラウザでは再生できる形式がない');
    await page.waitForTimeout(800);
    if (!(await v.evaluate((el) => el.paused))) {
      await page.click('#promo-toggle');
      await expect.poll(() => v.evaluate((el) => el.paused)).toBe(true);
      await expect(page.locator('#promo-toggle')).toHaveAttribute('aria-label', '動画を再生');
    }
    await page.click('#promo-toggle');
    await expect.poll(() => v.evaluate((el) => !el.paused)).toBe(true);
    await expect(page.locator('#promo-toggle')).toHaveAttribute('aria-label', '動画を一時停止');
  });
});

test.describe('動きを減らす設定', () => {
  test.use({ reducedMotion: 'reduce' });
  test('prefers-reduced-motion: reduce のとき自動再生せず、ポスターと再生ボタンを表示する', async ({ page }) => {
    await gotoHome(page);
    await page.waitForTimeout(1500);
    const st = await page.locator('#promo').evaluate((el) => ({ paused: el.paused, t: el.currentTime, autoplay: el.autoplay }));
    expect(st.paused).toBe(true);
    expect(st.t).toBe(0);
    expect(st.autoplay).toBe(false);
    await expect(page.locator('#reel')).toHaveClass(/is-paused/);
    await expect(page.locator('#promo-toggle')).toBeVisible();
    await expect(page.locator('#promo-toggle')).toHaveAttribute('aria-label', '動画を再生');
  });
});
