// 公開URLを実際に開き、読み込みに失敗したファイル（404など）やエラーが無いかを確認する
// 使い方: node tools/check-live.js [URL]
const { chromium, webkit } = require('@playwright/test');

const URL = process.argv[2] || 'https://yosiken-0421.github.io/controller-custom-hp/';

(async () => {
  let failed = false;
  for (const type of [chromium, webkit]) {
    const browser = await type.launch();
    const page = await browser.newPage();
    const bad = [], errors = [], loaded = [];
    page.on('response', (r) => { (r.status() >= 400 ? bad : loaded).push(r.status() + ' ' + r.url()); });
    page.on('requestfailed', (r) => bad.push('FAILED ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const v = await page.$eval('#promo', (el) => ({ src: el.currentSrc, t: el.currentTime }));
    const og = await page.$eval('meta[property="og:image"]', (m) => m.content);
    const ogRes = await page.request.get(og);
    console.log(`[${type.name()}] 読み込み ${loaded.length} 件 / 失敗 ${bad.length} 件 / エラー ${errors.length} 件`);
    console.log(`  動画: ${v.src} (再生位置 ${v.t.toFixed(2)}秒)`);
    console.log(`  og:image: ${og} -> ${ogRes.status()} ${ogRes.headers()['content-type']}`);
    bad.forEach((b) => console.log('  NG ' + b));
    errors.forEach((e) => console.log('  ERR ' + e));
    if (bad.length || errors.length || ogRes.status() !== 200) failed = true;
    await browser.close();
  }
  process.exit(failed ? 1 : 0);
})();
