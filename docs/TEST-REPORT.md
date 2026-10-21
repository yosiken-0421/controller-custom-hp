# 自動テスト結果

実行日：2026-10-21／環境：Windows 11、Node.js 24.21.0、@playwright/test 1.64.1、@axe-core/playwright 4.14.0
コマンド：`npm test`（`dist/` を作り直してから `playwright test` を実行）

## 結果
**151 件中 142 件成功・0 件失敗・9 件スキップ**

スキップ（対象外のため意図的に除外）
- 画面幅 320〜1920px の一覧テスト：モバイルの2プロジェクトでは除外（デスクトップ3エンジンで実施）
- file:// テスト：モバイルの2プロジェクトでは除外
- マウスドラッグ：モバイルの2プロジェクトでは除外／タッチドラッグ：デスクトップの3プロジェクトでは除外

## プロジェクト（ブラウザ・端末）
| 名前 | 内容 |
|---|---|
| desktop-chromium / desktop-firefox / desktop-webkit | Playwright 同梱ブラウザ（1280×720） |
| mobile-iphone15 | `devices['iPhone 15']`（WebKit、isMobile・hasTouch 有効） |
| mobile-pixel7 | `devices['Pixel 7']`（Chromium、isMobile・hasTouch 有効） |
| chrome-h264 | インストール済み Google Chrome（`channel: 'chrome'`）。H.264 再生確認のみ |

## テストファイルと内容
| ファイル | 確認していること |
|---|---|
| tests/layout.spec.js | 320/360/390/430/768/1024/1280/1920px で横スクロールなし（メニュー・カート表示中も含む）、OGP・viewport・商標表記、`/` 始まりの参照がないこと、FAQ アコーディオン |
| tests/customizer.spec.js | 色見本で `fill` 属性と computed style が変わる、別パーツは変わらない、自由色指定、仕上げ切替、ランダム／リセット、キーボード操作 |
| tests/image.spec.js | 横長PNG・縦長JPEG・巨大PNG（5000×3000 → 長辺2048pxに縮小）、EXIF Orientation=6 で縦横が入れ替わる、clipPath の外側の画素が変化しない（スクリーンショットの画素比較）、マウスドラッグ／タッチドラッグ、スライダー、矢印キー、「画像を外す」、不正ファイル・テキスト・偽HEIC・20MB超のエラー表示 |
| tests/cart.spec.js | 追加・数量変更・削除、再読み込み後も残る、サムネイルが幅300pxのJPEG、元画像を保存しない、localStorage を使えなくしてもカートが動き「保存できません」を表示、Esc で閉じてフォーカスが戻る |
| tests/checkout.spec.js | カード番号などの入力欄がない、16px以上、必須・形式エラー、正しい入力で完了画面・カートが空になる、**完了までネットワークリクエストが 0 件**、個人情報を保存しない、問い合わせフォームも送信しない |
| tests/video.spec.js | muted / playsinline / loop / poster、各ファイルが 200、再生が進む、再生・一時停止ボタン、`prefers-reduced-motion: reduce` では自動再生しない |
| tests/video-chrome.spec.js | Google Chrome で promo.mp4（1280×720）が再生される |
| tests/a11y.spec.js | axe（WCAG 2.0/2.1 A・AA）で critical / serious が 0 件（トップ、画像貼り付け後、カート表示、購入画面のエラー表示）、操作できる要素が 44×44px 以上 |
| tests/file-protocol.spec.js | `dist/index.html` を file:// で開いても、色変更・画像貼り付け・カート・購入画面が動く |
| tests/fixtures.js（全テスト共通） | **すべてのテストで、コンソールエラーとページエラーが 0 件**であることを確認 |

## 公開版の確認（2026-10-21）
公開URL：https://yosiken-0421.github.io/controller-custom-hp/
`node tools/check-live.js` で Chromium と WebKit から開いた結果：
- 読み込みに失敗したファイル 0 件（404 なし）、コンソールエラー・ページエラー 0 件
- promo.mp4 の再生が進むことを確認
- og:image（`https://yosiken-0421.github.io/controller-custom-hp/assets/og.png`）が 200・image/png で取得できる
- 2回目の push の内容が公開版に反映されることを確認（`tools/check-live.js` が公開URLから取得できるようになった）

## 動画コーデックの実測（この Windows 環境）
| プロジェクト | `canPlayType` H.264 / VP9 | 実際に再生されたファイル |
|---|---|---|
| desktop-chromium | probably / probably | promo.mp4（再生が進むことを確認） |
| desktop-firefox | probably / probably | promo.mp4 |
| desktop-webkit | probably / probably | promo.mp4 |
| mobile-iphone15（WebKit） | probably / probably | promo.mp4 |
| mobile-pixel7（Chromium） | probably / probably | promo.mp4 |
| chrome-h264（Google Chrome） | — | promo.mp4（1280×720） |

Playwright 公式は「Chromium は Chrome/Edge のコーデックを全部は持たない」としているが、この環境では同梱ブラウザでも H.264 が再生された（Windows の OS デコーダーを使っている可能性があるが**未確認**）。他の OS（特に Linux の CI）では結果が変わる可能性がある。

## エミュレーションの限界（自動テストで確認できていないこと）
- **iPhone のタッチドラッグは合成した PointerEvent で確認した**（Playwright の WebKit には実タッチのドラッグ操作が無いため）。Android（Chromium）は CDP の実タッチ入力で確認済み。ピンチは自動テストしていない。
- 実際の iOS Safari / Android Chrome / LINE内ブラウザでの自動再生、低電力モード、HEIC写真の選択、キーボード表示時の画面の動き、セーフエリア、カラーピッカーの見た目。Playwright の WebKit（Windows版）は `<input type="color">` がテキスト欄として表示されるが、実際の Safari では異なる。
- LINE のリンクプレビュー。
→ `docs/DEVICE-CHECK.md` で実機確認をお願いします。

## スクリーンショット
`npm test` を実行すると `test-results/screens/` に保存されます（PC 3エンジン × 320/1280/1920px の全体、モバイル2機種のヒーロー・カスタマイザー・メニュー・画像貼り付け・カート・購入画面・完了画面）。目視で確認し、見つけた崩れは修正済みです（PCで見出しの「へ。」だけが改行される、動画の一時停止ボタンが動画内の文字に重なる、固定ヘッダーの後ろが透ける）。
