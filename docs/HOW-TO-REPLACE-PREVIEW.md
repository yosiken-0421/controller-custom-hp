# プレビューを実物写真に差し替える手順

今は `js/preview.js` の **SVGレンダラー**（オリジナル形状のゲームパッド）で描いています。
描画処理はこのファイルにまとまっていて、UI（`js/customizer.js`）は次のメソッドしか使いません。

| メソッド | 役割 |
|---|---|
| `setColor(part, hex)` | パーツの色を変える |
| `setFinish(part, 'matte'｜'gloss'｜'metal')` | 仕上げを変える |
| `setImage(part, {src, w, h})` / `setImageTransform(part, {x, y, scale, rotate})` / `clearImage(part)` | 画像の貼り付けと位置調整 |
| `getState()` | 現在の構成を返す |
| `toThumbnail(maxSide)` | カート用サムネイル（dataURL）を返す |
| `element` / `svgPointScale()` | ドラッグ量の換算に使う |

パーツIDは `front-shell` `back-shell` `touchpad` `face-buttons` `dpad` `sticks` です。

## 写真モードに切り替える場合（今回は未実装）
1. 自分で撮影した写真を用意します（正面・同じ画角・背景透過PNG推奨）。
   - `assets/controller-photo.png`：コントローラー全体の写真（陰影が分かるよう、明るいグレー系の個体が扱いやすい）
   - `assets/masks/front-shell.png` など：パーツごとのマスク画像（写真と同じサイズで、そのパーツの部分だけ白、それ以外は透明）
2. `js/preview-photo.js` を作り、上の表と同じメソッドを持つ `SC.PreviewPhoto.create(container)` を実装します。
   - 色：パーツごとに `<div>` を重ね、`background-color` に色を設定し、CSS の `mask-image: url(assets/masks/<part>.png)` で切り抜きます。写真の上に `mix-blend-mode: multiply` で重ねると、陰影を残したまま色が乗ります。
   - 仕上げ：マスクと同じ形のハイライト用 PNG を重ねるか、グラデーションの不透明度を変えます。
   - 画像：マスクで切り抜いた `<div>` の中に `<img>` を置き、`transform` で位置・拡大・回転を反映します。
   - サムネイル：canvas に写真 → パーツ色（`globalCompositeOperation` でマスク）→ 画像の順に描画して `toDataURL('image/jpeg')`。
3. `js/customizer.js` の `P.create(host, ...)` を `SC.PreviewPhoto.create(host, ...)` に変えます。`index.html` で `preview-photo.js` を `customizer.js` より前に読み込みます。
4. `npm test` を実行します。色のテストは SVG の `fill` を見ているので、写真モード用に「パーツ要素の `background-color`」を確認する形へ書き換えてください。

注意：メーカーの公式写真や他社の画像は使わず、ショップが自分で撮影した写真だけを使ってください。
