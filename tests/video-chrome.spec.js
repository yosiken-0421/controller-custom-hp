// インストール済みの Google Chrome（channel: 'chrome'）で MP4(H.264) が実際に再生されることを確認する
const { test, expect, gotoHome } = require('./fixtures');

test('Google Chrome で H.264 の MP4 が自動再生される', async ({ page }, testInfo) => {
  await gotoHome(page);
  const v = page.locator('#promo');
  expect(await v.evaluate((el) => el.canPlayType('video/mp4; codecs="avc1.640028"'))).not.toBe('');
  await expect.poll(() => v.evaluate((el) => el.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.5);
  const st = await v.evaluate((el) => ({ src: el.currentSrc, paused: el.paused, w: el.videoWidth, h: el.videoHeight }));
  testInfo.annotations.push({ type: 'playback', description: JSON.stringify(st) });
  expect(st.src).toMatch(/promo\.mp4$/);
  expect(st.paused).toBe(false);
  expect([st.w, st.h]).toEqual([1280, 720]);
});
