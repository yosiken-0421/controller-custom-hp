# SHELLCRAFT（仮）— コントローラーのシェルカスタム工房【架空デモ】

PS5対応（DualSense対応）コントローラーの外装カスタムショップを想定した**架空のデモサイト**です。実際の販売・決済・送信は行いません。

- 見る：`index.html` をブラウザで開くだけで動きます（ビルド不要）
- テスト：`npm install` → `npx playwright install` → `npm test`
- 宣伝動画の再生成：`npm run build:promo`
- 公開用一式：`npm run build`（`dist/` に出力）
- ローカルサーバー：`npm run serve`（http://127.0.0.1:4173/）

## 構成
```
index.html            ページ本体
css/style.css         デザイン
js/preview.js         プレビュー描画モジュール（SVG。写真への差し替え口）
js/customizer.js      カスタマイザーのUI（色・仕上げ・画像・ドラッグ）
js/store.js           カートの状態と localStorage（失敗しても動く）
js/cart.js            カートドロワー
js/checkout.js        購入画面（デモ）・お問い合わせフォーム
js/main.js            起動処理（機能ごとに例外を分離）
assets/               宣伝動画・ポスター・OGP画像・favicon
tools/promo/          宣伝動画を描くページ
tools/build-promo.js  Playwright で撮影 → ffmpeg で MP4/WebM
tools/build-dist.js   dist/ を作る
tools/serve.js        確認用の静的サーバー
tests/                Playwright テスト
docs/                 調査・仮決め・テスト結果・手順書
```

PlayStation、PS5、DualSenseは株式会社ソニー・インタラクティブエンタテインメントの登録商標または商標です。本サイトは同社とは無関係の架空デモサイトです。
