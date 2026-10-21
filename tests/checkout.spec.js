const { test, expect, gotoHome, shot } = require('./fixtures');

async function toCheckout(page) {
  await gotoHome(page);
  await page.click('#cz-add');
  await expect(page.locator('#cart-count')).toHaveText('1');
  await page.click('#cart-open');
  await page.click('#to-checkout');
  await expect(page.locator('#checkout')).toBeVisible();
}

test.describe('購入画面（デモ）', () => {
  test('デモ表示があり、カード番号などの入力欄が存在しない', async ({ page }) => {
    await toCheckout(page);
    await expect(page.locator('.demo-banner')).toContainText('デモのため実際の注文・請求は発生しません');
    await expect(page.locator('#checkout input[autocomplete^="cc-"]')).toHaveCount(0);
    const names = await page.$$eval('#checkout input', (els) => els.map((e) => (e.name + ' ' + e.id + ' ' + (e.autocomplete || '')).toLowerCase()));
    for (const n of names) expect(n).not.toMatch(/card|cc-|cvc|cvv|expir|security/);
    await expect(page.locator('input[name="pay"]')).toHaveCount(1);
    // 入力欄は 16px 以上（iOS の自動拡大対策）
    const sizes = await page.$$eval('#checkout input[type=text], #checkout input[type=tel], #checkout input[type=email]', (els) => els.map((e) => parseFloat(getComputedStyle(e).fontSize)));
    for (const s of sizes) expect(s).toBeGreaterThanOrEqual(16);
    await expect(page.locator('#co-zip')).toHaveAttribute('inputmode', 'numeric');
    await expect(page.locator('#co-tel')).toHaveAttribute('autocomplete', 'tel');
  });

  test('必須項目が空・形式が違うと確定できず、欄の近くに日本語のエラーが出る', async ({ page }) => {
    await toCheckout(page);
    await page.click('#co-submit');
    await expect(page.locator('#co-done')).toBeHidden();
    for (const id of ['co-name', 'co-zip', 'co-addr', 'co-tel', 'co-email']) {
      await expect(page.locator(`#${id}-err`)).toBeVisible();
      await expect(page.locator(`#${id}`)).toHaveAttribute('aria-invalid', 'true');
    }
    await expect(page.locator('#co-name')).toBeFocused();

    await page.fill('#co-name', '山田 太郎');
    await page.fill('#co-zip', '12345');
    await page.fill('#co-addr', '東京都千代田区（デモ）');
    await page.fill('#co-tel', '12-34');
    await page.fill('#co-email', 'abc@');
    await page.click('#co-submit');
    await expect(page.locator('#co-zip-err')).toContainText('7桁');
    await expect(page.locator('#co-tel-err')).toContainText('電話番号');
    await expect(page.locator('#co-email-err')).toContainText('メールアドレス');
    await expect(page.locator('#co-name-err')).toBeHidden();
    await expect(page.locator('#co-done')).toBeHidden();
  });

  test('正しく入力すると完了画面になり、カートが空になる。外部への送信は発生しない', async ({ page }, testInfo) => {
    await toCheckout(page);
    const requests = [];
    page.on('request', (r) => { if (!/^(data|blob):/.test(r.url())) requests.push(r.method() + ' ' + r.url()); });
    await page.fill('#co-name', '山田 太郎');
    await page.fill('#co-zip', '１００-０００１'); // 全角・ハイフンも受け付ける
    await page.fill('#co-addr', '東京都千代田区（デモ）');
    await page.fill('#co-tel', '090-1234-5678');
    await page.fill('#co-email', 'demo@example.com');
    await page.check('input[name="ship"][value="express"]');
    await shot(page, testInfo, '06-checkout', { fullPage: true });
    await page.click('#co-submit');
    await expect(page.locator('#co-done')).toBeVisible();
    await expect(page.locator('#co-order-no')).toHaveText(/^DEMO-[0-9A-Z]{6,}$/);
    await expect(page.locator('#cart-count')).toHaveText('0');
    await shot(page, testInfo, '07-done');
    await page.waitForTimeout(500);
    expect(requests, 'ネットワークへのリクエストが発生していない').toEqual([]);
    const saved = await page.evaluate(() => { try { return localStorage.getItem('shellcraft.cart.v1'); } catch (e) { return 'n/a'; } });
    expect(saved).toBe('[]');
    // 個人情報は保存されていない
    const all = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
    expect(all).not.toContain('山田');
  });

  test('お問い合わせフォームは送信せず、デモである旨を表示する', async ({ page }) => {
    await gotoHome(page);
    const requests = [];
    page.on('request', (r) => { if (!/^(data|blob):/.test(r.url())) requests.push(r.url()); });
    await page.click('#contact-form button[type=submit]');
    await expect(page.locator('#ct-name-err')).toBeVisible();
    await page.fill('#ct-name', 'テスト');
    await page.fill('#ct-email', 'demo@example.com');
    await page.fill('#ct-msg', '質問です');
    await page.click('#contact-form button[type=submit]');
    await expect(page.locator('#contact-status')).toContainText('送信されません');
    expect(requests).toEqual([]);
  });
});
