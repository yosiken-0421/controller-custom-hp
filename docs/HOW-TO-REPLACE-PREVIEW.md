# プレビュー写真の差し替え手順

カスタマイザーのプレビューは**写真モード**で描いています（`js/preview-photo.js`）。
写真の上に、パーツごとのマスク（切り抜き）で色を「乗算」で重ねるので、写真の陰影や質感を残したまま色が変わります。

写真データ（`js/photo-data.js`）が読み込めないときは、SVGイラスト（`js/preview.js`）に自動で切り替わります。

## 仕組み
| ファイル | 役割 |
|---|---|
| `assets/photo-src/controller-original.png` | 元の写真（1536×1024） |
| `tools/photo-parts.js` | パーツの範囲（写真上の座標）。白と黒の境目は明るさで自動判定し、背景との境目とタッチパッド・スティックだけ座標で指定 |
| `tools/build-photo.js` | 上の2つから、パーツごとのマスクと「陰影だけの画像」を作り、`js/photo-data.js` に書き出す |
| `js/photo-data.js` | 自動生成（直接編集しない）。file:// でも動くよう、画像はデータURLで埋め込み |
| `js/preview-photo.js` | 写真モードの描画 |

パーツは `front-shell`（前面シェル）、`back-shell`（背面・グリップ）、`trim`（中央・帯）、`touchpad`、`face-buttons`、`dpad`、`sticks` の7つです。

## 写真を差し替える手順
1. 新しい写真を用意します。使えるのは、自分で撮影したもの、または商用利用が許可されているもの（素材サイトのライセンスや、AI生成サービスの利用規約で確認）です。メーカーの公式写真やネットで拾った画像は使えません。写真に**ロゴやボタン記号（△○×□）が写っている場合は、消してから**使います。
2. `assets/photo-src/controller-original.png` を差し替えます。サイズが 1536×1024 以外のときは、`tools/photo-parts.js` の座標もそのサイズに合わせます。
3. `tools/photo-parts.js` の座標を、新しい写真に合わせて描き直します。
4. `npm run build:photo` を実行します。`test-results/photo-debug.png` にパーツごとの色分け画像が出るので、はみ出しや抜けがないかを確認し、必要なら手順3に戻ります。
5. `npm run build:promo` で宣伝動画とOGP画像を作り直します。
6. `npm test` を実行します。写真の構図が大きく変わった場合は、`tests/image.spec.js` の「はみ出さない」テストの確認点（写真上の座標）も直します。

## 描画モジュールのメソッド（イラスト・写真で共通）
| メソッド | 役割 |
|---|---|
| `setColor(part, hex)` / `setFinish(part, 'matte'｜'gloss'｜'metal')` | 色・仕上げ |
| `setImage(part, {src, w, h})` / `setImageTransform(part, {x, y, scale, rotate})` / `clearImage(part)` | 画像の貼り付けと位置調整（前面シェルとタッチパッド） |
| `getState()` / `toThumbnail(maxSide)` | 構成の取得、カート用サムネイル |
