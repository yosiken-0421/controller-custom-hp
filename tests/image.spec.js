const { test, expect, makeImage, withExifOrientation, gotoHome, shot } = require('./fixtures');

async function upload(page, name, mimeType, buffer) {
  await page.setInputFiles('#image-input', { name, mimeType, buffer });
}

const art = (page, part = 'front-shell') => page.locator(`#preview [data-part="${part}"] image.art`);
const imgState = (page, part = 'front-shell') => page.evaluate((p) => SC.CustomizerView.getState().images[p] || null, part);

// SVG座標 → 画面座標
async function toClient(page, pts) {
  return page.evaluate((pts) => {
    const svg = document.querySelector('#preview svg');
    const m = svg.getScreenCTM();
    return pts.map(([x, y]) => { const p = svg.createSVGPoint(); p.x = x; p.y = y; const q = p.matrixTransform(m); return [q.x, q.y]; });
  }, pts);
}

// 画面のスクリーンショットから指定位置の色を読む（CSSピクセル基準）
async function pixels(page, points) {
  const png = (await page.screenshot({ scale: 'css' })).toString('base64');
  return page.evaluate(async ({ png, points }) => {
    const im = new Image();
    im.src = 'data:image/png;base64,' + png;
    await im.decode();
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    return points.map(([px, py]) => Array.from(x.getImageData(Math.round(px), Math.round(py), 1, 1).data.slice(0, 3)));
  }, { png, points });
}
const diff = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

// タッチでのドラッグ。Chromium は CDP で実際のタッチ入力を送る。それ以外は PointerEvent(pointerType=touch) を合成する。
async function touchDrag(page, browserName, from, to) {
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
    for (let i = 1; i <= 6; i++) {
      const x = from[0] + (to[0] - from[0]) * i / 6, y = from[1] + (to[1] - from[1]) * i / 6;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return 'cdp-touch';
  }
  await page.evaluate(({ from, to }) => {
    const el = document.getElementById('preview');
    const fire = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
    fire('pointerdown', from[0], from[1]);
    for (let i = 1; i <= 6; i++) fire('pointermove', from[0] + (to[0] - from[0]) * i / 6, from[1] + (to[1] - from[1]) * i / 6);
    fire('pointerup', to[0], to[1]);
  }, { from, to });
  return 'synthetic-pointer';
}

test.describe('カスタマイザー：画像の貼り付け', () => {
  test('横長・縦長の PNG/JPEG を貼れて、外すと元に戻る', async ({ page }) => {
    await gotoHome(page);
    await upload(page, 'wide.png', 'image/png', await makeImage(page, 1600, 600, 'image/png'));
    await expect(art(page)).toHaveCount(1);
    await expect(art(page)).toHaveAttribute('data-w', '1600');
    await expect(page.locator('#img-adjust')).toBeVisible();
    await expect(page.locator('#spec .spec-row[data-part="front-shell"] dd')).toContainText('IMG: ON');

    await upload(page, 'tall.jpg', 'image/jpeg', await makeImage(page, 600, 1400, 'image/jpeg'));
    await expect(art(page)).toHaveAttribute('data-h', '1400');

    // 中央パッドにも貼れる
    await page.click('.part-tab[data-part="touchpad"]');
    await upload(page, 'pad.png', 'image/png', await makeImage(page, 400, 400, 'image/png'));
    await expect(art(page, 'touchpad')).toHaveCount(1);

    // 画像非対応パーツでは画像ツールが隠れる
    await page.click('.part-tab[data-part="dpad"]');
    await expect(page.locator('#image-unsupported')).toBeVisible();
    await expect(page.locator('#image-tools')).toBeHidden();

    await page.click('.part-tab[data-part="front-shell"]');
    await page.click('#img-remove');
    await expect(art(page)).toHaveCount(0);
    expect(await imgState(page)).toBeNull();
    await expect(page.locator('#preview')).not.toHaveClass(/is-editing/);
    await expect(art(page, 'touchpad')).toHaveCount(1);
  });

  test('巨大な画像は長辺 2048px 以下に縮小される', async ({ page }) => {
    await gotoHome(page);
    await upload(page, 'huge.png', 'image/png', await makeImage(page, 5000, 3000, 'image/png'));
    await expect(art(page)).toHaveCount(1, { timeout: 30_000 });
    const w = Number(await art(page).getAttribute('data-w'));
    const h = Number(await art(page).getAttribute('data-h'));
    expect(Math.max(w, h)).toBe(2048);
    expect(Math.abs(w / h - 5000 / 3000)).toBeLessThan(0.01);
  });

  test('EXIF の向き（Orientation=6）が反映され、縦横が入れ替わる', async ({ page }) => {
    await gotoHome(page);
    const jpeg = withExifOrientation(await makeImage(page, 400, 200, 'image/jpeg'), 6);
    await upload(page, 'exif6.jpg', 'image/jpeg', jpeg);
    await expect(art(page)).toHaveCount(1);
    expect(await art(page).getAttribute('data-w')).toBe('200');
    expect(await art(page).getAttribute('data-h')).toBe('400');
  });

  test('画像はシェルの形で切り抜かれ、外側にはみ出さない', async ({ page }, testInfo) => {
    await gotoHome(page);
    await page.evaluate(() => document.getElementById('preview').scrollIntoView({ block: 'center', behavior: 'instant' }));
    // 写真モードの座標（1536×1024）。画像は前面シェル（両翼）の範囲を覆う大きさで、中心 (761,503)。
    // 外側：背景（上・グリップの間）と、中央の黒い本体（前面シェルではないので画像が乗ってはいけない）
    const outside = [[761, 60], [761, 760], [761, 470]];
    const inside = [[250, 500], [1250, 600]];
    const pts = await toClient(page, [...outside, ...inside]);
    const before = await pixels(page, pts);
    await upload(page, 'magenta.png', 'image/png', await makeImage(page, 1000, 1000, 'image/png', '#ff00ff'));
    await expect(art(page)).toHaveCount(1);
    await page.waitForTimeout(400);
    const after = await pixels(page, pts);
    await shot(page, testInfo, '04-image-clip');
    outside.forEach((p, i) => expect(diff(before[i], after[i]), `外側 ${p} は変化しない`).toBeLessThanOrEqual(6));
    inside.forEach((p, i) => expect(diff(before[outside.length + i], after[outside.length + i]), `内側 ${p} は画像に変わる`).toBeGreaterThan(60));
    // DOM上もパーツの形（写真モードはマスク、イラストは clipPath）の中にある
    const clip = await art(page).evaluate((el) => el.parentNode.getAttribute('mask') || el.parentNode.getAttribute('clip-path'));
    expect(clip).toMatch(/^url\(#.+(mask|clip)-front-shell\)$/);
  });

  test('マウスのドラッグで位置が変わり、スライダーで拡大・回転できる', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name.startsWith('mobile'), 'マウス操作はデスクトップで確認');
    await gotoHome(page);
    await upload(page, 'a.png', 'image/png', await makeImage(page, 800, 500, 'image/png'));
    await expect(art(page)).toHaveCount(1);
    await page.evaluate(() => document.getElementById('preview').scrollIntoView({ block: 'center', behavior: 'instant' }));
    const box = await page.locator('#preview').boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height * 0.6;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 60, cy + 20, { steps: 6 });
    await page.mouse.up();
    const s = await imgState(page);
    expect(s.x).toBeGreaterThan(20);
    expect(s.y).toBeGreaterThan(5);

    await page.locator('#img-scale').fill('150');
    await page.locator('#img-rotate').fill('30');
    const s2 = await imgState(page);
    expect(s2.scale).toBeCloseTo(1.5);
    expect(s2.rotate).toBe(30);
    await expect(art(page)).toHaveAttribute('transform', /rotate\(30\) scale\(1\.5\)/);

    // キーボード（矢印キー）でも動かせる
    await page.locator('#preview').focus();
    await page.keyboard.press('ArrowLeft');
    expect((await imgState(page)).x).toBeCloseTo(s2.x - 5);
  });

  test('タッチのドラッグで位置が変わり、その間ページはスクロールしない', async ({ page, browserName }, testInfo) => {
    test.skip(!testInfo.project.use.hasTouch, 'タッチ対応のモバイル端末エミュレーションで確認');
    await gotoHome(page);
    await upload(page, 'a.png', 'image/png', await makeImage(page, 800, 500, 'image/png'));
    await expect(art(page)).toHaveCount(1);
    await page.evaluate(() => document.getElementById('preview').scrollIntoView({ block: 'center', behavior: 'instant' }));
    await expect(page.locator('#preview')).toHaveCSS('touch-action', 'none');
    const box = await page.locator('#preview').boundingBox();
    const from = [box.x + box.width / 2, box.y + box.height * 0.6];
    const scrollBefore = await page.evaluate(() => window.scrollY);
    const method = await touchDrag(page, browserName, from, [from[0] + 50, from[1] - 40]);
    testInfo.annotations.push({ type: 'touch-method', description: method });
    const s = await imgState(page);
    expect(s.x).toBeGreaterThan(20);
    expect(s.y).toBeLessThan(-10);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  });

  test('不正なファイル・大きすぎるファイルで日本語のエラーが出て、画面は壊れない', async ({ page }) => {
    await gotoHome(page);
    await upload(page, 'fake.png', 'image/png', Buffer.from('this is not an image'));
    await expect(page.locator('#image-error')).toBeVisible();
    await expect(page.locator('#image-error')).toContainText('JPEG または PNG');
    await expect(art(page)).toHaveCount(0);

    await upload(page, 'note.txt', 'text/plain', Buffer.from('hello'));
    await expect(page.locator('#image-error')).toContainText('画像ファイルではない');

    await upload(page, 'photo.heic', 'image/heic', Buffer.from('not really heic'));
    await expect(page.locator('#image-error')).toContainText('HEIC');

    await upload(page, 'big.jpg', 'image/jpeg', Buffer.alloc(20 * 1024 * 1024 + 10, 1));
    await expect(page.locator('#image-error')).toContainText('20MB');

    // その後も普通に使える
    await page.click('.swatch[data-color="#C8283C"]');
    expect((await page.locator('#preview [data-part="front-shell"] .base').getAttribute('fill')).toLowerCase()).toBe('#c8283c');
    await upload(page, 'ok.png', 'image/png', await makeImage(page, 300, 200));
    await expect(art(page)).toHaveCount(1);
    await expect(page.locator('#image-error')).toBeHidden();
  });
});
