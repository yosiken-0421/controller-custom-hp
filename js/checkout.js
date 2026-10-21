/*
 * 購入画面（デモ）とお問い合わせフォーム。
 * 入力内容はページ内でのみ扱い、送信・保存は一切しない（fetch / XHR / form送信を使わない）。
 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};

  function $(id) { return document.getElementById(id); }

  // 全角数字・ハイフンを半角にそろえる
  function normalizeDigits(s) {
    return String(s || '').replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[－ー―‐−]/g, '-').trim();
  }

  var RULES = {
    required: function (v) { return v.trim() ? '' : '入力してください。'; },
    zip: function (v) {
      if (!v.trim()) return '入力してください。';
      return /^\d{3}-?\d{4}$/.test(normalizeDigits(v)) ? '' : '郵便番号は7桁の数字で入力してください（例：1000001）。';
    },
    tel: function (v) {
      if (!v.trim()) return '入力してください。';
      var d = normalizeDigits(v).replace(/-/g, '');
      return /^0\d{9,10}$/.test(d) ? '' : '電話番号は0から始まる10〜11桁の数字で入力してください。';
    },
    email: function (v) {
      if (!v.trim()) return '入力してください。';
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'メールアドレスの形式が正しくありません（例：name@example.com）。';
    }
  };

  // fields: [[inputId, ruleName], ...]。最初のエラー欄にフォーカスして false を返す。
  function validate(fields) {
    var firstBad = null;
    fields.forEach(function (f) {
      var input = $(f[0]), err = $(f[0] + '-err');
      var msg = RULES[f[1]](input.value);
      err.textContent = msg;
      err.hidden = !msg;
      if (msg) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', f[0] + '-err');
        if (!firstBad) firstBad = input;
      } else {
        input.removeAttribute('aria-invalid');
        input.removeAttribute('aria-describedby');
      }
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function orderNo() {
    var a = new Uint32Array(2);
    if (global.crypto && global.crypto.getRandomValues) global.crypto.getRandomValues(a);
    else { a[0] = Math.random() * 4294967295; a[1] = Math.random() * 4294967295; }
    return 'DEMO-' + (a[0].toString(36) + a[1].toString(36)).toUpperCase().slice(0, 10);
  }

  function renderItems() {
    var items = SC.Cart.items();
    $('co-items').innerHTML = items.map(function (it, i) {
      var thumb = SC.CartUI.isSafeThumb(it.thumb) ? '<img src="' + it.thumb + '" alt="" width="96" height="61">' : '';
      return '<li>' + thumb + '<div><p>カスタムシェル #' + (i + 1) + ' × <span class="mono">' + it.qty + '</span></p>' +
        '<p class="mono small">' + SC.CartUI.summary(it.config).join(' / ') + '</p></div></li>';
    }).join('');
    $('co-total').textContent = '合計：¥0,000（デモ）× ' + SC.Cart.count() + '点';
  }

  var CO_FIELDS = [['co-name', 'required'], ['co-zip', 'zip'], ['co-addr', 'required'], ['co-tel', 'tel'], ['co-email', 'email']];

  function open() {
    if (!SC.Cart.count()) return;
    renderItems();
    $('main').hidden = true;
    $('checkout').hidden = false;
    $('co-form-view').hidden = false;
    $('co-done').hidden = true;
    $('co-error').hidden = true;
    global.scrollTo(0, 0);
    $('co-title').setAttribute('tabindex', '-1');
    $('co-title').focus();
  }

  function closeView(hash) {
    $('checkout').hidden = true;
    $('main').hidden = false;
    var target = document.getElementById(hash || 'customizer');
    if (target && target.scrollIntoView) target.scrollIntoView();
  }

  function init() {
    $('co-back').addEventListener('click', function () { closeView('customizer'); });
    $('co-finish').addEventListener('click', function () { closeView('top'); });

    $('checkout-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('co-error');
      err.hidden = true;
      if (!SC.Cart.count()) {
        err.textContent = 'カートが空です。';
        err.hidden = false;
        return;
      }
      if (!validate(CO_FIELDS)) {
        err.textContent = '入力内容を確認してください。';
        err.hidden = false;
        return;
      }
      // デモ注文完了：送信はせず、画面を切り替えてカートを空にするだけ
      $('co-order-no').textContent = orderNo();
      SC.Cart.clear();
      this.reset();
      $('co-form-view').hidden = true;
      $('co-done').hidden = false;
      $('co-done').focus();
      global.scrollTo(0, 0);
    });

    $('contact-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var st = $('contact-status');
      if (!validate([['ct-name', 'required'], ['ct-email', 'email'], ['ct-msg', 'required']])) {
        st.textContent = '';
        return;
      }
      st.textContent = '入力内容に問題はありません。デモのため送信されません。';
    });
  }

  SC.Checkout = { init: init, open: open, validate: validate, RULES: RULES };
})(window);
