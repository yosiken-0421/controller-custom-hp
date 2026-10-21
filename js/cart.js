/*
 * カートドロワーの表示。状態は SC.Cart（store.js）。
 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  var FIN = { matte: 'MATTE', gloss: 'GLOSS', metal: 'METALLIC' };
  var CODES = { 'front-shell': 'FRONT', 'back-shell': 'GRIP', 'touchpad': 'PAD', 'face-buttons': 'BTN', 'dpad': 'DPAD', 'sticks': 'STICK' };

  function summary(config) {
    var parts = (config && config.parts) || {};
    return Object.keys(CODES).filter(function (k) { return parts[k]; }).map(function (k) {
      var p = parts[k];
      return CODES[k] + ' ' + String(p.color).toUpperCase() + ' ' + (FIN[p.finish] || '') + (config.images && config.images[k] ? ' +IMG' : '');
    });
  }

  function isSafeThumb(src) {
    return typeof src === 'string' && /^data:image\/(jpeg|png|svg\+xml)[;,]/.test(src);
  }

  var lastFocus = null;

  function open() {
    var d = $('cart-drawer');
    lastFocus = document.activeElement;
    $('cart-backdrop').hidden = false;
    d.hidden = false;
    document.body.classList.add('drawer-open');
    requestAnimationFrame(function () { d.classList.add('is-open'); });
    d.focus();
  }

  function close() {
    var d = $('cart-drawer');
    d.classList.remove('is-open');
    d.hidden = true;
    $('cart-backdrop').hidden = true;
    document.body.classList.remove('drawer-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function render(items) {
    var list = $('cart-items');
    var n = SC.Cart.count();
    $('cart-count').textContent = n;
    $('cart-count').dataset.count = n;
    $('cart-empty').hidden = items.length > 0;
    $('to-checkout').disabled = items.length === 0;
    $('cart-subtotal').textContent = items.length ? '小計：¥0,000（デモ）× ' + n + '点' : '';
    $('storage-note').hidden = SC.Cart.canPersist();

    list.innerHTML = items.map(function (it, i) {
      var lines = summary(it.config);
      var thumb = isSafeThumb(it.thumb)
        ? '<img src="' + esc(it.thumb) + '" alt="カスタム内容のプレビュー" width="120" height="84">'
        : '<span class="thumb-ph" aria-hidden="true"></span>';
      return '<li class="cart-item" data-id="' + esc(it.id) + '">' +
        '<div class="cart-thumb">' + thumb + '</div>' +
        '<div class="cart-body">' +
          '<p class="cart-name">カスタムシェル #' + (i + 1) + '</p>' +
          '<p class="mono cart-spec">' + lines.map(esc).join('<br>') + '</p>' +
          '<p class="mono cart-price">¥0,000（デモ）</p>' +
          '<div class="qty" role="group" aria-label="数量">' +
            '<button type="button" class="icon-btn qty-dec" aria-label="数量を減らす"' + (it.qty <= 1 ? ' disabled' : '') + '>−</button>' +
            '<span class="mono qty-val" aria-live="polite">' + it.qty + '</span>' +
            '<button type="button" class="icon-btn qty-inc" aria-label="数量を増やす">＋</button>' +
            '<button type="button" class="btn-text remove" aria-label="カスタムシェル #' + (i + 1) + ' を削除">削除</button>' +
          '</div>' +
        '</div></li>';
    }).join('');
  }

  function init() {
    SC.Cart.onChange(render);
    render(SC.Cart.items());

    $('cart-open').addEventListener('click', open);
    $('cart-close').addEventListener('click', close);
    $('cart-backdrop').addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('cart-drawer').hidden) close();
    });
    // フォーカスをドロワー内に閉じ込める
    $('cart-drawer').addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = Array.prototype.filter.call(this.querySelectorAll('button:not([disabled]), a[href]'), function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === this)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    $('cart-items').addEventListener('click', function (e) {
      var li = e.target.closest('.cart-item'); if (!li) return;
      var id = li.dataset.id;
      var it = SC.Cart.items().filter(function (x) { return x.id === id; })[0];
      if (!it) return;
      if (e.target.closest('.qty-inc')) SC.Cart.setQty(id, it.qty + 1);
      else if (e.target.closest('.qty-dec')) SC.Cart.setQty(id, it.qty - 1);
      else if (e.target.closest('.remove')) {
        SC.Cart.remove(id);
        $('cart-close').focus();
        return;
      } else return;
      // 再描画後も同じボタンにフォーカスを戻す
      var sel = e.target.closest('.qty-inc') ? '.qty-inc' : '.qty-dec';
      var again = document.querySelector('.cart-item[data-id="' + id + '"] ' + sel);
      if (again && !again.disabled) again.focus();
      else if (again) { var inc = again.parentNode.querySelector('.qty-inc'); if (inc) inc.focus(); }
    });

    $('to-checkout').addEventListener('click', function () {
      close();
      if (SC.Checkout) SC.Checkout.open();
    });
  }

  SC.CartUI = { init: init, open: open, close: close, summary: summary, isSafeThumb: isSafeThumb };
})(window);
