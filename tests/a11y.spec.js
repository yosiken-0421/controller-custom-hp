const { test, expect, gotoHome, makeImage } = require('./fixtures');
const AxeBuilder = require('@axe-core/playwright').default;

async function seriousViolations(page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
}

// 画面に見えている操作可能な要素のうち 44x44px 未満のもの
async function smallTargets(page) {
  return page.evaluate(() => {
    const sel = 'a[href], button, summary, select, textarea, input:not([type=hidden]):not([type=radio]):not(.visually-hidden), label.choice';
    return Array.from(document.querySelectorAll(sel)).filter((el) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false; // 非表示
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') return false;
      if (el.classList.contains('skip')) return false; // フォーカス時のみ画面内に出るリンク
      return r.width < 43.5 || r.height < 43.5;
    }).map((el) => `${el.tagName.toLowerCase()}#${el.id}.${el.className} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
  });
}

test.describe('アクセシビリティ', () => {
  test('axe：トップページに重大な違反がない', async ({ page }) => {
    await gotoHome(page);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('axe：画像貼り付け後・カート表示・購入画面で重大な違反がない', async ({ page }) => {
    await gotoHome(page);
    await page.setInputFiles('#image-input', { name: 'a.png', mimeType: 'image/png', buffer: await makeImage(page, 500, 300) });
    await expect(page.locator('#img-adjust')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.click('#cz-add');
    await expect(page.locator('#cart-count')).toHaveText('1');
    await page.click('#cart-open');
    await expect(page.locator('#cart-drawer')).toBeVisible();
    await page.waitForTimeout(300);
    expect(await seriousViolations(page)).toEqual([]);
    await page.click('#to-checkout');
    await page.click('#co-submit'); // エラー表示状態も確認
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('タップできる要素が 44×44px 以上', async ({ page }) => {
    await gotoHome(page);
    await page.setInputFiles('#image-input', { name: 'a.png', mimeType: 'image/png', buffer: await makeImage(page, 500, 300) });
    await expect(page.locator('#img-adjust')).toBeVisible();
    expect(await smallTargets(page)).toEqual([]);
    if (await page.locator('#menu-toggle').isVisible()) {
      await page.click('#menu-toggle');
      expect(await smallTargets(page)).toEqual([]);
      await page.click('#menu-toggle');
    }
    await page.click('#cz-add');
    await page.click('#cart-open');
    await expect(page.locator('.cart-item')).toHaveCount(1);
    expect(await smallTargets(page)).toEqual([]);
    await page.click('#to-checkout');
    expect(await smallTargets(page)).toEqual([]);
  });
});
