// 公開用一式を dist/ にコピーする（ビルド処理はなく、ファイルを集めるだけ）
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ENTRIES = ['index.html', 'css', 'js', 'assets', '.nojekyll'];

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST);
for (const e of ENTRIES) {
  const src = path.join(ROOT, e);
  if (!fs.existsSync(src)) { console.error('missing: ' + e); process.exit(1); }
  fs.cpSync(src, path.join(DIST, e), { recursive: true });
}
console.log('dist/ updated');
