# 調査メモ（RESEARCH）

調査日：2026-10-21。WebSearch / WebFetch で取得した内容のみを記載。取得できなかった・一次情報が無かった項目は「未確認」と明記する。
参考サイトについては**構成と導線だけ**を分析し、デザイン・文言・画像は一切流用していない。

---

## 1. コントローラーカスタム／カスタマイザー系サイトの構成分析（6サイト）

| # | サイト | 確認できた構成・導線 | 出典 |
|---|---|---|---|
| 1 | The Controller People（英国の工房型ショップ） | トップ直下にカスタマイザーへのヒーロー導線「Build Your Own」。ナビはプラットフォーム別＋Help（FAQ・返品・規約・問い合わせ）。ヘッダーにカート合計。ビルダーは**パーツ別の折りたたみセクション**（Front Shell / Back Shell / Trim / Touchpad / Buttons / D-Pad / Analogues / Bumpers / Triggers 等）、各パーツは「Plain Colours」「Chrome Colours」など**仕上げ別グループ**のサムネイルから選択。上部に表・裏の大きなプレビュー、下部に Build Summary・数量・Add to basket。「Ask an expert」問い合わせフォームあり | https://thecontrollerpeople.com/ , https://thecontrollerpeople.com/ps5-controller-builder/ |
| 2 | SCUF Gaming | メガメニューに独立した「Customize」グループ（プラットフォーム別ビルダー）。ビルダーは「色を選ぶ → デザインを選ぶ」の2段階として説明。トップは製品タイル → カスタマイズ導線 → 特長グリッド → フッター | https://scufgaming.com/ |
| 3 | eXtremeRate（交換シェル販売） | オンラインのカスタマイザーは確認できず。完成キットを色バリエーション付き商品ページで販売。Support 配下にインストールガイド・保証・返品・配送。日本向けストア切替あり | https://extremerate.com/ |
| 4 | Evil Controllers | メインナビ先頭が「Create」（クリエイター）。プラットフォーム別のクリエイター入口。サポートに注文追跡・マニュアル。クリエイター内部の手順はトップからは確認できず（**未確認**、クリエイターURLは404） | https://www.evilcontrollers.com/ |
| 5 | Mega Modz | ヒーローカルーセルにプラットフォーム別「Build your own」導線。クリエイターでは本体・ボタン・十字キー・スティック・バンパー・トリガー・グリップの色／質感／素材を選べると説明。内部UIは**未確認**（URL 404） | https://www.megamodz.com/ |
| 6 | Xbox Design Lab（メーカー公式カスタマイザー） | カスタム可能部位：本体・背面ケース・十字キー・バンパー・トリガー・スティック・ABXY・View/Menu。色・パターン・メタリック仕上げ、刻印（16文字）。デザイン → カート → 決済の流れ。コミュニティギャラリーから既存デザインを起点にできる | https://news.xbox.com/en-us/2018/11/16/xbox-design-lab-console/ , https://xboxdesignlab.xbox.com/en-us/ |

補足検索：https://digitaltrends.com/?p=3080218 （SCUFビルダーの色・柄数の紹介記事。二次情報）、https://thecontrollerpeople.com/custom-ps5-controller-diy-vs-professional-service/

### 共通項 → このサイトへの反映方針
- **カスタマイザーへの導線をファーストビューに置く**（1,2,5共通）→ ヒーロー内に「今すぐカスタム」、カスタマイザーをヒーロー直下に配置。
- **パーツ単位で編集対象を切り替える**（1,5,6）→ パーツタブ（前面シェル／グリップ／中央パッド／フェイスボタン／十字キー／スティック）。
- **仕上げ（マット・グロス・メタリック/クローム）を色と別軸で選ぶ**（1,6）→ 仕上げ切替を色と独立させる。
- **構成サマリー＋数量＋カート投入をカスタマイザー下部に置く**（1）→ 等幅フォントのスペック表示＋「この内容でカートに入れる」。
- **FAQ・返品・保証・配送はサポート系にまとめる**（1,3,4）→ FAQアコーディオン・料金/納期セクション。
- 刻印・パドル等の機能改造は今回の範囲外（外装カスタム主力のため）。

---

## 2. スマホ対応の一次情報

### 2-1. 動画の自動再生
- **iOS（WebKit公式）**：`<video muted>` と音声トラックの無い動画はユーザー操作なしで autoplay 可。iPhoneでは `playsinline` があるとインライン再生、無いと全画面が必要。`autoplay` 動画は画面内に見えている時だけ再生され、見えなくなると一時停止。
  出典：https://webkit.org/blog/6784/new-video-policies-for-ios/
- **Chrome（公式）**：「Muted autoplay is always allowed.」
  出典：https://developer.chrome.com/blog/autoplay
- 低電力モード時の挙動：WebKit記事に記載なし → **未確認**（実機確認項目へ）。
- **反映**：`autoplay muted loop playsinline` を付与し、音声トラック無しで書き出す。`play()` の Promise 拒否時はポスター＋再生ボタンを表示。

### 2-2. iOS Safari の入力欄フォーカス時の拡大
- 「フォントサイズ16px未満の入力欄でズームする」という情報は複数の開発者記事で一致するが、**Apple/WebKit の公式文書は見つからず未確認**。
  参考（二次情報）：https://weblog.west-wind.com/posts/2023/Apr/17/Preventing-iOS-Textbox-Auto-Zooming-and-ViewPort-Sizing , https://css-tricks.com/?p=339455
- **反映**：input/select/textarea を `font-size: 16px` 以上に固定。`maximum-scale=1` 等のズーム禁止はアクセシビリティを損なうため使わない。

### 2-3. ビューポート単位とセーフエリア
- `dvh` はブラウザUIの伸縮に追従する動的ビューポート。`vh` は `lvh` 相当。`dvh` はスクロール中にリサイズが起きうる。
  出典：https://developer.mozilla.org/en-US/docs/Web/CSS/length
- `dvh` 個別のブラウザ対応状況は取得ページで表が切れており**未確認** → `height: 100vh; height: 100dvh;` の二段指定で代替値を確保。
- セーフエリア：`env(safe-area-inset-*)`。`viewport-fit` 既定は `auto`、全画面に描くには `cover`。`env()` 非対応ブラウザではその宣言が無視されるので代替指定が必要。
  出典：https://webkit.org/blog/7929/designing-websites-for-iphone-x/ , https://developer.mozilla.org/en-US/docs/Web/CSS/env
- **反映**：`viewport-fit=cover`、固定ヘッダー・ドロワー・フッターに `env(safe-area-inset-*)` の padding を追加（直前に通常値を書く）。

### 2-4. Pointer Events とタッチ
- `touch-action: none` はブラウザのパン・ズーム処理を無効にする。既定ではブラウザがジェスチャーを処理し始めると `pointercancel` が届く。ジェスチャー開始後の `touch-action` 変更は効かない。広範囲に指定すると拡大操作を妨げる。
  出典：https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- `setPointerCapture()` で以後のポインターイベントを捕捉要素へ送る（`pointerup` で解放）。
  出典：https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture
- **反映**：`touch-action: none` は**画像貼り付け中のプレビュー領域のみ**。それ以外のページは通常スクロール。ドラッグは `setPointerCapture` ＋ `pointercancel` 対応。ピンチは2ポインターの距離比で実装。

### 2-5. 画像の読み込み（HEIC・EXIFの向き）
- HEIC/HEIF を表示できるのは **Safari 17 以降（macOS・iOS）のみ**。Chrome/Firefox/Edge/Android系は非対応。
  出典：https://caniuse.com/heif , https://developer.apple.com/videos/play/wwdc2023/10122
- iOS のファイル選択で HEIC が JPEG に自動変換されるかどうかは公式情報が見つからず**未確認**（実機確認項目へ）。
- `accept="image/*"` は「任意の画像」のヒントで検証ではない。モバイルではカメラ撮影も選べることが多い。
  出典：https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file
- EXIFの向き：CSS `image-orientation` の初期値は `from-image`（EXIFに従って回転）。`createImageBitmap()` の `imageOrientation` 既定値も `from-image`。
  出典：https://developer.mozilla.org/en-US/docs/Web/CSS/image-orientation , https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
- `<img>` を `drawImage` した場合にEXIFが適用されるかはMDNの該当ページに記載がなく**未確認**。
- **反映**：`createImageBitmap(file, {imageOrientation:'from-image'})` で読み込み → canvasで長辺2048pxへ縮小。非対応環境は `<img>` 経由にフォールバック。デコード失敗時は日本語メッセージ。EXIF回転の効果は自動テスト（EXIF Orientation=6 のJPEGを生成して縦横が入れ替わるか）で実際に確認する。

### 2-6. LINE のリンクプレビュー（OGP）
- LINE公式FAQ：URLプレビューに使うOGPタグは `og:title` `og:description` `og:image` の**3つのみ**。og:title が無ければ `<title>`、og:description が無ければ description メタか本文を使う。
  出典：https://developers.line.biz/en/faq/tags/line-app/ , https://developers.line.biz/en/faq/tags/line-official-account/
- 画像サイズ・キャッシュ更新：公式情報は**未確認**。第三者情報では 1200×630 推奨、キャッシュ対策に `?v=2` などのクエリ付与。
  参考（二次情報）：https://israynotarray.com/en/misc/2026/05/14/force-refresh-social-og-cache-with-v-1-query-string/ , https://toolsbase.dev/en/image/ogp-image-generator
- **反映**：3タグを静的HTMLに記述（JSで差し込まない）。og:image は 1200×630 のPNG、公開後に絶対URLへ更新。

### 2-7. Playwright のデバイスエミュレーションとコーデック
- `devices['iPhone 13']` などを `use` に展開して使う。viewport を上書きする場合は展開後に書く。`isMobile` は meta viewport の考慮とタッチイベント有効化、`hasTouch` はタッチイベント対応（既定 false）、`reducedMotion` で `prefers-reduced-motion` をエミュレート。
  出典：https://playwright.dev/docs/emulation , https://playwright.dev/docs/api/class-browser#browser-new-context
- **コーデック**：「Chromium does not have all the codecs that Google Chrome or Microsoft Edge are bundling」。メディアコーデックは Linux/macOS/Windows で大きく異なる。Safari に近い確認は Mac 上の WebKit 推奨。H.264 の名指しの記載は無い。
  出典：https://playwright.dev/docs/browsers
- 参考（二次情報）：オープンソース版 Chromium は特許ライセンスの関係で H.264 を含まないことが多い。https://v3.remotion.dev/docs/media-playback-error , https://github.com/chromiumembedded/cef/issues/3559
- **反映**：同梱 Chromium での H.264 再生は前提にしない。テストでは `HTMLMediaElement.canPlayType()` の実測値を記録し、再生確認はインストール済み Google Chrome（`channel: 'chrome'`）で行う。結果は `docs/TEST-REPORT.md` に記録。
  WebM（VP9）版も併記し、H.264 非対応ブラウザでも再生できるようにする。
- **実測結果（2026-10-21、Windows 11、Playwright 1.64.1）**：同梱の Chromium・Firefox・WebKit すべてで `canPlayType('video/mp4; codecs="avc1.640028"')` が `probably` を返し、promo.mp4 が実際に再生された。Google Chrome（channel: 'chrome'）でも再生を確認した。詳細は `docs/TEST-REPORT.md`。他の OS での結果は未確認。
