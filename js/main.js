/*
 * 起動処理。機能ごとに try/catch で分離し、一部で例外が起きても他の機能は動き続けるようにする。
 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};

  function $(id) { return document.getElementById(id); }

  function safe(name, fn) {
    try { fn(); } catch (e) {
      if (global.console) console.warn('[' + name + '] 初期化に失敗しました', e);
    }
  }

  function initMenu() {
    var btn = $('menu-toggle'), nav = $('site-nav');
    function set(open) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      document.body.classList.toggle('nav-open', open);
    }
    btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        set(false);
        // 購入画面を開いている時にナビを押したら通常表示に戻す
        if (!$('checkout').hidden) { $('checkout').hidden = true; $('main').hidden = false; }
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { set(false); btn.focus(); }
    });
  }

  function initVideo() {
    var v = $('promo'), btn = $('promo-toggle'), reel = $('reel');
    var reduce = false;
    try { reduce = global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    function ui() {
      var paused = v.paused;
      reel.classList.toggle('is-paused', paused);
      btn.setAttribute('aria-label', paused ? '動画を再生' : '動画を一時停止');
      btn.querySelector('.reel-toggle-text').textContent = paused ? '再生' : '一時停止';
    }
    function tryPlay() {
      var p;
      try { p = v.play(); } catch (e) { ui(); return; }
      if (p && p.catch) p.catch(function () { ui(); });
    }
    v.addEventListener('play', ui);
    v.addEventListener('pause', ui);
    btn.addEventListener('click', function () { if (v.paused) tryPlay(); else v.pause(); });
    var sources = v.querySelectorAll('source');
    if (sources.length) {
      sources[sources.length - 1].addEventListener('error', function () {
        reel.classList.add('no-video'); btn.hidden = true;
      });
    }
    if (reduce) { v.autoplay = false; v.pause(); }
    else if (v.paused) tryPlay();
    ui();
  }

  function flashCart() {
    var b = $('cart-open');
    b.classList.remove('flash');
    void b.offsetWidth;
    b.classList.add('flash');
  }

  SC.UI = { flashCart: flashCart };

  function boot() {
    safe('cart-store', function () { SC.Cart.init(); });
    safe('menu', initMenu);
    safe('video', initVideo);
    safe('cart', function () { SC.CartUI.init(); });
    safe('checkout', function () { SC.Checkout.init(); });
    safe('customizer', function () { SC.Customizer.init(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
