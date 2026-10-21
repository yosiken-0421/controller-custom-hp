# 公開版の更新手順（GitHub Pages）

公開URL（予定）：https://yosiken-0421.github.io/controller-custom-hp/

GitHub Pages は **main ブランチのルート（/）** から配信する設定にしています。リポジトリのルートに `index.html` `css/` `js/` `assets/` を置き、`dist/` は使いません（中身はルートと同じです）。そのため、push した内容がそのまま公開されます。

## ふだんの更新
```bash
cd controller-custom-hp
npm test                      # 全テストが通ることを確認
git add -A
git commit -m "変更内容"
git push
```
push してから 1〜数分で公開版に反映されます。リポジトリの「Actions」タブにある「pages build and deployment」の完了で確認できます。

反映後、公開URLで読み込みエラー（404など）が無いかを確認します。
```bash
node tools/check-live.js   # Chromium と WebKit で公開URLを開き、失敗したファイル・エラー・og:image を表示
```

## 宣伝動画を作り直す
```bash
npm run build:promo   # assets/promo.mp4 / promo.webm / promo-poster.jpg / og.png を再生成
```
アニメーションの内容は `tools/promo/index.html` を編集してください。

## LINE のリンクプレビューが古いままのとき
LINE はプレビューをキャッシュすることがあります（公式の更新方法は未確認）。`og:image` の URL に `?v=2` のようなクエリを付けて変えると、新しい画像として読み込まれることがあります。
