// 宣伝動画の生成：tools/promo/ を Playwright で 30fps 撮影 → ffmpeg で MP4(H.264) / WebM(VP9) / ポスター / OGP画像
// 使い方: npm run build:promo
const { chromium } = require('@playwright/test');
const ffmpeg = require('ffmpeg-static');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const FPS = 30;

function run(args) {
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
}

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'promo-'));
  const url = pathToFileURL(path.join(ROOT, 'tools/promo/index.html')).href;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(url);
    const duration = await page.evaluate(() => window.PROMO_DURATION);
    const frames = Math.round(duration * FPS);
    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => window.renderFrame(t), i / FPS);
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`) });
    }
    console.log(`captured ${frames} frames`);

    const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await og.goto(url + '?og');
    await og.screenshot({ path: path.join(ASSETS, 'og.png') });
  } finally {
    await browser.close();
  }

  const input = ['-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png')];
  run([...input, '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '24',
    '-movflags', '+faststart', '-an', path.join(ASSETS, 'promo.mp4')]);
  run([...input, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuv420p', '-b:v', '0', '-crf', '38', '-row-mt', '1', '-an',
    path.join(ASSETS, 'promo.webm')]);
  run(['-i', path.join(tmp, 'f0000.png'), '-q:v', '3', path.join(ASSETS, 'promo-poster.jpg')]);

  fs.rmSync(tmp, { recursive: true, force: true });
  for (const f of ['promo.mp4', 'promo.webm', 'promo-poster.jpg', 'og.png']) {
    console.log(f, (fs.statSync(path.join(ASSETS, f)).size / 1024).toFixed(0) + ' KB');
  }
})().catch((e) => { console.error(e); process.exit(1); });
