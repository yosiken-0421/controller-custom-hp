// 写真モード用データの生成：パーツごとのマスク画像と「陰影だけの画像」を作り、js/photo-data.js に書き出す。
// 使い方: npm run build:photo   （確認用の色分け画像を test-results/photo-debug.png に保存）
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const DEF = require('./photo-parts');

const ROOT = path.resolve(__dirname, '..');
// 先に確定したパーツが優先（同じ画素は2つのパーツに属さない）
const ORDER = ['touchpad', 'sticks', 'dpad', 'face-buttons', 'front-shell', 'back-shell', 'trim'];

(async () => {
  const photo = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, DEF.SOURCE)).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = await page.evaluate(async ({ photo, def, order }) => {
    const im = new Image(); im.src = photo; await im.decode();
    const W = im.width, H = im.height, N = W * H;
    const src = document.createElement('canvas'); src.width = W; src.height = H;
    const sx = src.getContext('2d'); sx.drawImage(im, 0, 0);
    const px = sx.getImageData(0, 0, W, H).data;
    const L = new Float32Array(N);
    for (let i = 0; i < N; i++) L[i] = 0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2];

    // 角を丸めた閉じたパス（Catmull-Rom → ベジェ）
    function smoothPath(ctx, pts) {
      const n = pts.length;
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 0; i < n; i++) {
        const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6,
          p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
      }
      ctx.closePath();
    }
    function coverage(spec) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); x.fillStyle = '#fff';
      (spec.shapes || []).forEach((s) => { x.beginPath(); smoothPath(x, s); x.fill(); });
      (spec.ellipses || []).forEach(([cx, cy, rx, ry]) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); });
      const d = x.getImageData(0, 0, W, H).data, a = new Float32Array(N);
      for (let i = 0; i < N; i++) a[i] = d[i * 4 + 3] / 255;
      return a;
    }
    const T = def.THRESHOLD, SOFT = 18;
    const tone = (t, l) => {
      if (t === 'all') return 1;
      const k = Math.min(1, Math.max(0, (l - (T - SOFT)) / (2 * SOFT))); // 明るさのなめらかな判定
      return t === 'light' ? k : 1 - k;
    };

    const taken = new Float32Array(N);
    const masks = {};
    for (const id of order) {
      const spec = def.parts[id];
      const cov = coverage(spec);
      const m = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const v = cov[i] * tone(spec.tone, L[i]) * (1 - taken[i]);
        m[i] = v; taken[i] = Math.min(1, taken[i] + v);
      }
      masks[id] = m;
    }

    // 陰影マップ：明るいパーツは写真の明るさそのまま、暗いパーツは平均 0.8 付近に持ち上げて凹凸を強調
    const shade = new Float32Array(N);
    for (let i = 0; i < N; i++) shade[i] = L[i];
    for (const id of order) {
      const m = masks[id];
      let sum = 0, cnt = 0;
      for (let i = 0; i < N; i++) if (m[i] > 0.5) { sum += L[i]; cnt++; }
      const mean = cnt ? sum / cnt : 0;
      if (mean > 110) continue;
      for (let i = 0; i < N; i++) {
        if (!m[i]) continue;
        const s = Math.min(255, Math.max(0, 204 + (L[i] - mean) * 2.2));
        shade[i] = shade[i] * (1 - m[i]) + s * m[i];
      }
    }

    function toCanvas(fill, w, h) {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'); const d = x.createImageData(W, H);
      for (let i = 0; i < N; i++) { const [r, g, b] = fill(i); d.data[i * 4] = r; d.data[i * 4 + 1] = g; d.data[i * 4 + 2] = b; d.data[i * 4 + 3] = 255; }
      x.putImageData(d, 0, 0);
      if (!w) return c;
      const o = document.createElement('canvas'); o.width = w; o.height = h;
      const ox = o.getContext('2d'); ox.imageSmoothingQuality = 'high'; ox.drawImage(c, 0, 0, w, h);
      return o;
    }

    const result = { w: W, h: H, masks: {}, bbox: {} };
    result.shading = toCanvas((i) => { const v = shade[i]; return [v, v, v]; }).toDataURL('image/jpeg', 0.86);
    for (const id of order) {
      const m = masks[id];
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (m[y * W + x] > 0.5) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      result.bbox[id] = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
      result.masks[id] = toCanvas((i) => { const v = Math.round(m[i] * 255); return [v, v, v]; }, W / 2, H / 2).toDataURL('image/png');
    }

    // 確認用：パーツごとに色分けした画像
    const COLORS = { 'front-shell': [255, 90, 40], 'back-shell': [60, 200, 90], touchpad: [60, 140, 255], sticks: [255, 220, 40], dpad: [220, 60, 220], 'face-buttons': [40, 220, 220], trim: [150, 90, 255] };
    result.debug = toCanvas((i) => {
      let r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      for (const id of order) { const a = masks[id][i] * 0.6; if (a) { const c = COLORS[id]; r = r * (1 - a) + c[0] * a; g = g * (1 - a) + c[1] * a; b = b * (1 - a) + c[2] * a; } }
      return [r, g, b];
    }).toDataURL('image/png');
    return result;
  }, { photo, def: DEF, order: ORDER });
  await browser.close();

  fs.mkdirSync(path.join(ROOT, 'test-results'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'test-results/photo-debug.png'), Buffer.from(out.debug.split(',')[1], 'base64'));
  delete out.debug;
  const js = '/* 自動生成ファイル（tools/build-photo.js）。直接編集しない。 */\n' +
    'window.SC = window.SC || {};\nwindow.SC.PHOTO_DATA = ' + JSON.stringify(out) + ';\n';
  fs.writeFileSync(path.join(ROOT, 'js/photo-data.js'), js);
  console.log('js/photo-data.js', (js.length / 1024).toFixed(0) + ' KB');
  console.log(JSON.stringify(out.bbox));
})().catch((e) => { console.error(e); process.exit(1); });
