// 全テスト共通：コンソールエラー・ページエラーを集めて、テスト終了時に 0 件であることを確認する。
// Google Fonts はテストを外部ネットワークに依存させないため空のCSSで応答する（代替フォントで表示される）。
const base = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const test = base.test.extend({
  errors: [async ({ page }, use) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    await use(errors);
    base.expect(errors, 'コンソールエラー / ページエラーが 0 件であること').toEqual([]);
  }, { auto: true }],
});

async function shot(page, testInfo, name, opts = {}) {
  const dir = path.join(__dirname, '..', 'test-results', 'screens');
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${testInfo.project.name}--${name}.png`), ...opts });
}

// ブラウザ内の canvas でテスト画像を作る（外部の画像は使わない）
async function makeImage(page, w, h, type = 'image/png', color) {
  const b64 = await page.evaluate(async ({ w, h, type, color }) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    if (color) { x.fillStyle = color; x.fillRect(0, 0, w, h); }
    else {
      const g = x.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#00c2ff'); g.addColorStop(1, '#ff00aa');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w / 4, h / 4);
    }
    const blob = await new Promise((r) => c.toBlob(r, type, 0.9));
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, { w, h, type, color });
  return Buffer.from(b64, 'base64');
}

// JPEG に EXIF の Orientation タグを差し込む（APP0 の直後に APP1 を挿入）
function withExifOrientation(jpeg, orientation) {
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // "MM", 42, IFD0 offset = 8
    0x00, 0x01, // エントリー数 1
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation (SHORT)
    0x00, 0x00, 0x00, 0x00, // 次のIFDなし
  ]);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const len = payload.length + 2;
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, len >> 8, len & 255]), payload]);
  let pos = 2;
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0) pos = 4 + jpeg.readUInt16BE(4);
  return Buffer.concat([jpeg.subarray(0, pos), app1, jpeg.subarray(pos)]);
}

async function gotoHome(page) {
  await page.goto('./');
  await page.waitForSelector('#preview svg');
}

module.exports = { test, expect: base.expect, shot, makeImage, withExifOrientation, gotoHome };
