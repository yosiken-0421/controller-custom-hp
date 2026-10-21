/*
 * カートの状態管理。localStorage は保存できない環境（プライベートモード・アプリ内ブラウザ・容量超過）
 * があるので、読み書きはすべて try/catch。保存に失敗しても画面上のカート（メモリ上の配列）は動き続ける。
 * アップロードした元画像は保存しない（サムネイルと構成情報だけ）。
 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};
  var KEY = 'shellcraft.cart.v1';

  var items = [];
  var canPersist = true;
  var listeners = [];

  function getStorage() {
    try { return global.localStorage || null; } catch (e) { return null; }
  }

  function load() {
    try {
      var s = getStorage();
      if (!s) { canPersist = false; return; }
      var raw = s.getItem(KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (Array.isArray(data)) {
        items = data.filter(function (it) { return it && typeof it.id === 'string' && it.qty > 0; });
      }
    } catch (e) {
      canPersist = false;
    }
  }

  function save() {
    try {
      var s = getStorage();
      if (!s) throw new Error('no storage');
      s.setItem(KEY, JSON.stringify(items));
      canPersist = true;
    } catch (e) {
      canPersist = false;
    }
  }

  function emit() {
    listeners.forEach(function (fn) {
      try { fn(items.slice()); } catch (e) { if (global.console) console.warn(e); }
    });
  }

  function commit() { save(); emit(); }

  function uid() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  SC.Cart = {
    init: function () { load(); },
    items: function () { return items.slice(); },
    count: function () { return items.reduce(function (n, it) { return n + it.qty; }, 0); },
    canPersist: function () { return canPersist; },
    onChange: function (fn) { listeners.push(fn); },
    add: function (config, thumb) {
      items.push({ id: uid(), config: config, thumb: thumb || '', qty: 1 });
      commit();
    },
    setQty: function (id, qty) {
      items.forEach(function (it) { if (it.id === id) it.qty = Math.max(1, Math.min(99, qty)); });
      commit();
    },
    remove: function (id) {
      items = items.filter(function (it) { return it.id !== id; });
      commit();
    },
    clear: function () { items = []; commit(); }
  };
})(window);
