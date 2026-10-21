/*
 * カスタマイザーのUI。描画は SC.Preview（preview.js）に任せる。
 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};

  var SWATCHES = [
    { hex: '#E8E4DA', name: '生成り' },
    { hex: '#1A1A1A', name: '炭' },
    { hex: '#2B2D31', name: 'グラファイト' },
    { hex: '#8A8F94', name: '鉄灰' },
    { hex: '#FF6B2C', name: 'シグナルオレンジ' },
    { hex: '#C8283C', name: '朱赤' },
    { hex: '#F2C14E', name: 'からし' },
    { hex: '#3E7C4F', name: '苔緑' },
    { hex: '#2F5D8A', name: '藍' },
    { hex: '#6FB7C9', name: '浅葱' },
    { hex: '#7A4E9E', name: '菫' },
    { hex: '#F4A6B8', name: '桜' }
  ];

  var MAX_BYTES = 20 * 1024 * 1024;
  var MAX_SIDE = 2048;

  var MESSAGES = {
    tooLarge: 'ファイルが大きすぎます（20MBまで）。サイズの小さい画像を選ぶか、JPEG／PNGに書き出してから選び直してください。',
    notImage: '画像ファイルではないようです。JPEG または PNG の画像を選んでください。',
    heic: 'この形式（HEIC／HEIF）はお使いのブラウザで表示できません。JPEG または PNG の画像を選び直してください。',
    decode: '画像を読み込めませんでした。ファイルが壊れているか、このブラウザが対応していない形式です。JPEG または PNG で選び直してください。'
  };

  function $(id) { return document.getElementById(id); }

  function isHeic(file) {
    return /image\/hei[cf]/i.test(file.type || '') || /\.hei[cf]$/i.test(file.name || '');
  }

  function looksLikeImage(file) {
    if (file.type) return /^image\//i.test(file.type);
    return /\.(jpe?g|png|gif|webp|avif|bmp|hei[cf])$/i.test(file.name || '');
  }

  // EXIF の向きは createImageBitmap の imageOrientation:'from-image'（既定値）で反映する。
  // createImageBitmap が使えない・失敗した場合は <img> で読み込む。
  function decode(file) {
    function viaImg() {
      return new Promise(function (resolve, reject) {
        var url = URL.createObjectURL(file);
        var im = new Image();
        im.onload = function () { resolve({ source: im, w: im.naturalWidth, h: im.naturalHeight, done: function () { URL.revokeObjectURL(url); } }); };
        im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
        im.src = url;
      });
    }
    if (typeof global.createImageBitmap === 'function') {
      return global.createImageBitmap(file, { imageOrientation: 'from-image' }).then(function (bmp) {
        return { source: bmp, w: bmp.width, h: bmp.height, done: function () { if (bmp.close) bmp.close(); } };
      }, viaImg);
    }
    return viaImg();
  }

  function loadImageFile(file) {
    if (!file) return Promise.reject(new Error('none'));
    if (file.size > MAX_BYTES) return Promise.reject({ code: 'tooLarge' });
    if (!looksLikeImage(file)) return Promise.reject({ code: 'notImage' });
    return decode(file).then(function (d) {
      if (!d.w || !d.h) { d.done(); throw { code: 'decode' }; }
      // スマホのメモリ不足対策：長辺 2048px 以下に縮小してから使う
      var k = Math.min(1, MAX_SIDE / Math.max(d.w, d.h));
      var w = Math.max(1, Math.round(d.w * k)), h = Math.max(1, Math.round(d.h * k));
      var c = document.createElement('canvas');
      c.width = w; c.height = h;
      var ctx = c.getContext('2d');
      ctx.drawImage(d.source, 0, 0, w, h);
      d.done();
      var png = /png|gif|webp/i.test(file.type || '');
      var src = png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.9);
      c.width = c.height = 0;
      return { src: src, w: w, h: h };
    }, function () {
      throw { code: isHeic(file) ? 'heic' : 'decode' };
    });
  }

  function init() {
    var host = $('preview');
    var P = SC.Preview;
    var view = P.create(host, { idPrefix: 'main' });
    var current = 'front-shell';

    var tabs = $('part-tabs'), sw = $('swatches'), fin = $('finishes');
    var colorInput = $('color-input'), colorCode = $('color-code');
    var imgInput = $('image-input'), imgErr = $('image-error');
    var imgTools = $('image-tools'), imgUnsupported = $('image-unsupported'), imgAdjust = $('img-adjust');
    var scaleIn = $('img-scale'), rotIn = $('img-rotate');
    var status = $('cz-status');

    // --- 部品の生成 ---
    P.PARTS.forEach(function (p) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'part-tab';
      b.dataset.part = p.id;
      b.innerHTML = '<span class="mono">' + p.code + '</span><span>' + p.label + '</span>';
      tabs.appendChild(b);
    });
    SWATCHES.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.dataset.color = s.hex;
      b.style.setProperty('--sw', s.hex);
      b.setAttribute('aria-label', s.name + ' ' + s.hex);
      b.title = s.name + ' ' + s.hex;
      sw.appendChild(b);
    });
    P.FINISHES.forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn';
      b.dataset.finish = f.id;
      b.textContent = f.label;
      fin.appendChild(b);
    });

    // --- 表示の同期 ---
    function sync() {
      var st = view.getState();
      var part = st.parts[current];
      Array.prototype.forEach.call(tabs.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.part === current)); });
      Array.prototype.forEach.call(sw.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.color.toLowerCase() === part.color.toLowerCase())); });
      Array.prototype.forEach.call(fin.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.finish === part.finish)); });
      colorInput.value = part.color.toLowerCase();
      colorCode.textContent = part.color.toUpperCase();

      var canImage = !!P.IMAGE_PARTS[current];
      imgUnsupported.hidden = canImage;
      imgTools.hidden = !canImage;
      var img = st.images[current];
      imgAdjust.hidden = !img;
      if (img) {
        scaleIn.value = Math.round(img.scale * 100);
        rotIn.value = Math.round(img.rotate);
        $('scale-out').textContent = scaleIn.value + '%';
        $('rotate-out').textContent = rotIn.value + '°';
      }
      host.classList.toggle('is-editing', !!img);
      if (img) {
        host.tabIndex = 0;
        host.setAttribute('aria-label', '画像の位置調整：ドラッグまたは矢印キーで移動');
      } else {
        host.removeAttribute('tabindex');
        host.removeAttribute('aria-label');
      }
      renderSpec(st);
    }

    function renderSpec(st) {
      var dl = $('spec');
      var html = '';
      P.PARTS.forEach(function (p) {
        var s = st.parts[p.id];
        var f = P.FINISHES.filter(function (x) { return x.id === s.finish; })[0];
        var line = f.code + ' / ' + s.color.toUpperCase();
        if (P.IMAGE_PARTS[p.id]) line += ' / IMG: ' + (st.images[p.id] ? 'ON' : 'NONE');
        html += '<div class="spec-row" data-part="' + p.id + '"><dt>' + p.code + '</dt><dd>— ' + line + '</dd></div>';
      });
      dl.innerHTML = html;
    }

    function setColor(hex) { view.setColor(current, hex); sync(); }

    tabs.addEventListener('click', function (e) {
      var b = e.target.closest('.part-tab'); if (!b) return;
      current = b.dataset.part; clearError(); sync();
    });
    sw.addEventListener('click', function (e) {
      var b = e.target.closest('.swatch'); if (!b) return;
      setColor(b.dataset.color);
    });
    colorInput.addEventListener('input', function () { setColor(colorInput.value); });
    fin.addEventListener('click', function (e) {
      var b = e.target.closest('.seg-btn'); if (!b) return;
      view.setFinish(current, b.dataset.finish); sync();
    });

    // --- 画像 ---
    function showError(code) {
      imgErr.textContent = MESSAGES[code] || MESSAGES.decode;
      imgErr.hidden = false;
    }
    function clearError() { imgErr.hidden = true; imgErr.textContent = ''; }

    var loading = false;
    function handleFile(file) {
      if (!file || loading) return;
      if (!P.IMAGE_PARTS[current]) current = 'front-shell';
      var target = current;
      clearError();
      loading = true;
      status.textContent = '画像を読み込み中…';
      loadImageFile(file).then(function (data) {
        view.setImage(target, data);
        status.textContent = '画像を貼り付けました。';
        sync();
      }).catch(function (err) {
        status.textContent = '';
        showError(err && err.code);
        sync();
      }).then(function () {
        loading = false;
        imgInput.value = '';
      });
    }

    imgInput.addEventListener('change', function () { handleFile(imgInput.files && imgInput.files[0]); });

    Array.prototype.forEach.call(document.querySelectorAll('[data-dropzone]'), function (z) {
      z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('is-over'); });
      z.addEventListener('dragleave', function () { z.classList.remove('is-over'); });
      z.addEventListener('drop', function (e) {
        e.preventDefault(); z.classList.remove('is-over');
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        handleFile(f);
      });
    });

    scaleIn.addEventListener('input', function () {
      view.setImageTransform(current, { scale: scaleIn.value / 100 }); sync();
    });
    rotIn.addEventListener('input', function () {
      view.setImageTransform(current, { rotate: Number(rotIn.value) }); sync();
    });
    $('img-remove').addEventListener('click', function () {
      view.clearImage(current); status.textContent = '画像を外しました。'; sync();
      imgInput.focus();
    });

    // ドラッグ（マウス・タッチ・ペン）とピンチ。Pointer Events で統一して扱う。
    var pointers = {};
    var gesture = null;
    function img() { return view.getState().images[current]; }
    function count() { return Object.keys(pointers).length; }
    function dist() {
      var ps = Object.keys(pointers).map(function (k) { return pointers[k]; });
      return Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) || 1;
    }
    function startGesture() {
      var i = img(); if (!i) { gesture = null; return; }
      var ps = Object.keys(pointers).map(function (k) { return pointers[k]; });
      gesture = { x: i.x, y: i.y, scale: i.scale, px: ps[0].x, py: ps[0].y, d: count() > 1 ? dist() : 0 };
    }
    host.addEventListener('pointerdown', function (e) {
      if (!img()) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { host.setPointerCapture(e.pointerId); } catch (err) { /* 合成イベント等 */ }
      startGesture();
      e.preventDefault();
    });
    host.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId] || !gesture) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var k = view.svgPointScale();
      if (count() > 1 && gesture.d) {
        var s = Math.max(0.3, Math.min(3, gesture.scale * dist() / gesture.d));
        view.setImageTransform(current, { scale: s });
      } else {
        var p = pointers[e.pointerId];
        view.setImageTransform(current, { x: gesture.x + (p.x - gesture.px) * k, y: gesture.y + (p.y - gesture.py) * k });
      }
      sync();
    });
    function end(e) {
      if (!pointers[e.pointerId]) return;
      delete pointers[e.pointerId];
      try { host.releasePointerCapture(e.pointerId); } catch (err) {}
      if (count()) startGesture(); else gesture = null;
    }
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('keydown', function (e) {
      var i = img(); if (!i) return;
      var step = e.shiftKey ? 20 : 5, d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (!d) return;
      e.preventDefault();
      view.setImageTransform(current, { x: i.x + d[0], y: i.y + d[1] }); sync();
    });

    // --- リセット・ランダム・カート ---
    $('cz-reset').addEventListener('click', function () {
      P.PARTS.forEach(function (p) {
        view.setColor(p.id, P.DEFAULTS[p.id].color);
        view.setFinish(p.id, P.DEFAULTS[p.id].finish);
        view.clearImage(p.id);
      });
      clearError();
      status.textContent = '初期状態に戻しました。';
      sync();
    });
    $('cz-random').addEventListener('click', function () {
      P.PARTS.forEach(function (p) {
        view.setColor(p.id, SWATCHES[Math.floor(Math.random() * SWATCHES.length)].hex);
        view.setFinish(p.id, P.FINISHES[Math.floor(Math.random() * P.FINISHES.length)].id);
      });
      status.textContent = 'ランダムな配色にしました。';
      sync();
    });
    var adding = false;
    $('cz-add').addEventListener('click', function () {
      if (adding) return;
      adding = true;
      var st = view.getState();
      var config = { parts: st.parts, images: {} };
      Object.keys(st.images).forEach(function (k) { config.images[k] = true; });
      view.toThumbnail(300).then(function (thumb) {
        SC.Cart.add(config, thumb);
        status.textContent = 'カートに追加しました。';
        if (SC.UI && SC.UI.flashCart) SC.UI.flashCart();
      }).catch(function () {
        SC.Cart.add(config, '');
        status.textContent = 'カートに追加しました（サムネイルなし）。';
      }).then(function () { adding = false; });
    });

    sync();
    SC.CustomizerView = view;
  }

  SC.Customizer = { init: init, loadImageFile: loadImageFile, SWATCHES: SWATCHES };
})(window);
