/*
 * プレビュー描画モジュール（SVGレンダラー）
 * -------------------------------------------------
 * このファイルは「どう描くか」だけを担当する。UI（ボタン・スライダー）は customizer.js。
 * 写真ベースに切り替えるときは、同じメソッドを持つ PhotoRenderer を作って
 * SC.Preview.create の代わりに使う（docs/HOW-TO-REPLACE-PREVIEW.md 参照）。
 *
 * レンダラーが持つメソッド:
 *   setColor(part, hex) / setFinish(part, finish)
 *   setImage(part, {src, w, h}) / setImageTransform(part, {x, y, scale, rotate}) / clearImage(part)
 *   getState() / toThumbnail(maxSide) -> Promise<dataURL>
 *   element（DOM要素）/ svgPointScale()（画面px→描画座標の倍率）
 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};
  var NS = 'http://www.w3.org/2000/svg';
  var VIEW_W = 600, VIEW_H = 420;

  // PS5対応コントローラーの部品構成（上部の大きなタッチパッド、下側に並ぶ2本のスティック、
  // 長いグリップ、前面シェル＝上面と左右の羽根／背面シェル＝グリップと中央下の本体）に合わせた
  // このプロジェクト独自の線画。特定製品の輪郭のトレースではない。
  var GEOMETRY = {
    'back-shell':
      '<path d="M120 70C160 52 230 50 300 50S440 52 480 70C530 92 560 150 580 230C598 300 600 360 572 385C548 405 512 398 496 372C476 338 458 300 430 290C400 282 200 282 170 290C142 300 124 338 104 372C88 398 52 405 28 385C0 360 2 300 20 230C40 150 70 92 120 70Z"/>',
    'front-shell':
      '<path d="M126 80C165 63 232 61 300 61S435 63 474 80C518 100 545 152 563 226C578 290 582 340 562 362C546 378 522 372 510 352C492 322 470 290 440 270C420 250 410 200 386 188H214C190 200 180 250 160 270C130 290 108 322 90 352C78 372 54 378 38 362C18 340 22 290 37 226C55 152 82 100 126 80Z"/>',
    'touchpad':
      '<path d="M214 74H386Q398 74 398 86V176Q398 188 386 188H214Q202 188 202 176V86Q202 74 214 74Z"/>',
    'dpad':
      '<rect x="113" y="120" width="24" height="30" rx="5"/><rect x="113" y="170" width="24" height="30" rx="5"/>' +
      '<rect x="81" y="148" width="30" height="24" rx="5"/><rect x="139" y="148" width="30" height="24" rx="5"/>',
    'face-buttons':
      '<circle cx="475" cy="128" r="14"/><circle cx="507" cy="160" r="14"/>' +
      '<circle cx="475" cy="192" r="14"/><circle cx="443" cy="160" r="14"/>',
    'sticks':
      '<circle cx="228" cy="244" r="25"/><circle cx="372" cy="244" r="25"/>'
  };

  // 画像を貼れるパーツと、その外接矩形（画像の初期配置に使う）
  var IMAGE_PARTS = {
    'front-shell': { x: 22, y: 61, w: 560, h: 317 },
    'touchpad': { x: 202, y: 74, w: 196, h: 114 }
  };

  // 描画順（後ろ→前）
  var ORDER = ['back-shell', 'front-shell', 'touchpad', 'dpad', 'face-buttons', 'sticks'];

  var PARTS = [
    { id: 'front-shell', label: '前面シェル', code: 'SHELL / FRONT' },
    { id: 'back-shell', label: '背面・グリップ', code: 'SHELL / BACK' },
    { id: 'touchpad', label: '中央パッド', code: 'PAD / CENTER' },
    { id: 'face-buttons', label: 'ボタン', code: 'BTN / FACE' },
    { id: 'dpad', label: '十字キー', code: 'BTN / DPAD' },
    { id: 'sticks', label: 'スティック', code: 'STICK / CAP' }
  ];

  var FINISHES = [
    { id: 'matte', label: 'マット', code: 'MATTE' },
    { id: 'gloss', label: 'グロス', code: 'GLOSS' },
    { id: 'metal', label: 'メタリック', code: 'METALLIC' }
  ];

  var DEFAULTS = {
    'front-shell': { color: '#e8e4da', finish: 'matte' },
    'back-shell': { color: '#1f2023', finish: 'matte' },
    'touchpad': { color: '#e8e4da', finish: 'matte' },
    'face-buttons': { color: '#2a2c30', finish: 'gloss' },
    'dpad': { color: '#2a2c30', finish: 'gloss' },
    'sticks': { color: '#202225', finish: 'matte' }
  };

  function finishDefs(p) {
    // 重いフィルターは使わず、半透明グラデーションの重ね合わせだけで質感を出す
    return '' +
      '<linearGradient id="' + p + 'fin-matte" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".07"/>' +
        '<stop offset="1" stop-color="#000" stop-opacity=".2"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + p + 'fin-gloss" x1="0" y1="0" x2=".25" y2="1">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".6"/>' +
        '<stop offset=".32" stop-color="#fff" stop-opacity=".16"/>' +
        '<stop offset=".34" stop-color="#fff" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="#000" stop-opacity=".24"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + p + 'fin-metal" x1="0" y1="0" x2="1" y2=".45">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".42"/>' +
        '<stop offset=".16" stop-color="#000" stop-opacity=".2"/>' +
        '<stop offset=".34" stop-color="#fff" stop-opacity=".5"/>' +
        '<stop offset=".5" stop-color="#000" stop-opacity=".26"/>' +
        '<stop offset=".7" stop-color="#fff" stop-opacity=".34"/>' +
        '<stop offset=".86" stop-color="#000" stop-opacity=".14"/>' +
        '<stop offset="1" stop-color="#fff" stop-opacity=".4"/>' +
      '</linearGradient>';
  }

  function svgMarkup(p) {
    var defs = finishDefs(p);
    var body = '';
    ORDER.forEach(function (part) {
      defs += '<g id="' + p + 'geo-' + part + '">' + GEOMETRY[part] + '</g>';
      if (IMAGE_PARTS[part]) {
        defs += '<clipPath id="' + p + 'clip-' + part + '">' + GEOMETRY[part] + '</clipPath>';
      }
      var d = DEFAULTS[part];
      body += '<g class="part" data-part="' + part + '">';
      if (part === 'sticks') {
        // スティックの土台（くぼみ）は固定色
        body += '<circle cx="228" cy="244" r="33" fill="#000" fill-opacity=".45"/><circle cx="372" cy="244" r="33" fill="#000" fill-opacity=".45"/>';
      }
      body += '<use class="base" href="#' + p + 'geo-' + part + '" fill="' + d.color + '" stroke="#000" stroke-opacity=".35" stroke-width="1.5"/>';
      if (IMAGE_PARTS[part]) {
        body += '<g class="art-clip" clip-path="url(#' + p + 'clip-' + part + ')"></g>';
      }
      body += '<use class="finish" href="#' + p + 'geo-' + part + '" fill="url(#' + p + 'fin-' + d.finish + ')" data-finish="' + d.finish + '" pointer-events="none"/>';
      if (part === 'sticks') {
        body += '<circle cx="228" cy="244" r="15" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2" pointer-events="none"/>' +
                '<circle cx="372" cy="244" r="15" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2" pointer-events="none"/>';
      }
      body += '</g>';
      if (part === 'touchpad') {
        // 固定の小ボタンとスリット（色変更の対象外）
        body += '<g class="fixed" fill="#16171a" pointer-events="none">' +
          '<rect x="182" y="82" width="10" height="24" rx="5"/><rect x="408" y="82" width="10" height="24" rx="5"/>' +
          '<circle cx="300" cy="216" r="10" fill="#3a3c41"/><rect x="288" y="238" width="24" height="5" rx="2.5" fill="#3a3c41"/>' +
          '</g>';
      }
    });
    return '<svg xmlns="' + NS + '" viewBox="0 0 ' + VIEW_W + ' ' + VIEW_H + '" class="pad-svg" role="img" aria-label="コントローラーのプレビュー">' +
      '<defs>' + defs + '</defs>' +
      '<ellipse cx="300" cy="404" rx="270" ry="10" fill="#000" fill-opacity=".35"/>' +
      body + '</svg>';
  }

  var counter = 0;

  function create(container, opts) {
    opts = opts || {};
    var prefix = (opts.idPrefix || 'pv') + (++counter) + '-';
    container.innerHTML = svgMarkup(prefix);
    var svg = container.querySelector('svg');
    var state = { parts: {}, images: {} };
    ORDER.forEach(function (id) { state.parts[id] = { color: DEFAULTS[id].color, finish: DEFAULTS[id].finish }; });

    function partEl(part) { return svg.querySelector('[data-part="' + part + '"]'); }

    function setColor(part, hex) {
      if (!state.parts[part]) return;
      state.parts[part].color = hex;
      partEl(part).querySelector('.base').setAttribute('fill', hex);
    }

    function setFinish(part, finish) {
      if (!state.parts[part]) return;
      state.parts[part].finish = finish;
      var f = partEl(part).querySelector('.finish');
      f.setAttribute('fill', 'url(#' + prefix + 'fin-' + finish + ')');
      f.setAttribute('data-finish', finish);
    }

    function applyTransform(part) {
      var img = state.images[part];
      if (!img) return;
      var el = partEl(part).querySelector('image');
      var box = IMAGE_PARTS[part];
      var cx = box.x + box.w / 2 + img.x, cy = box.y + box.h / 2 + img.y;
      el.setAttribute('transform',
        'translate(' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ') rotate(' + img.rotate + ') scale(' + img.scale + ') translate(' + (-img.dw / 2).toFixed(2) + ' ' + (-img.dh / 2).toFixed(2) + ')');
    }

    function setImage(part, data) {
      var box = IMAGE_PARTS[part];
      if (!box) return;
      // 初期状態はパーツを覆う大きさ（cover）
      var cover = Math.max(box.w / data.w, box.h / data.h);
      state.images[part] = { src: data.src, w: data.w, h: data.h, dw: data.w * cover, dh: data.h * cover, x: 0, y: 0, scale: 1, rotate: 0 };
      var holder = partEl(part).querySelector('.art-clip');
      holder.innerHTML = '';
      var el = document.createElementNS(NS, 'image');
      el.setAttribute('class', 'art');
      el.setAttribute('href', data.src);
      el.setAttribute('width', state.images[part].dw.toFixed(2));
      el.setAttribute('height', state.images[part].dh.toFixed(2));
      el.setAttribute('preserveAspectRatio', 'none');
      el.setAttribute('data-w', data.w);
      el.setAttribute('data-h', data.h);
      holder.appendChild(el);
      applyTransform(part);
    }

    function setImageTransform(part, t) {
      var img = state.images[part];
      if (!img) return;
      ['x', 'y', 'scale', 'rotate'].forEach(function (k) { if (typeof t[k] === 'number' && isFinite(t[k])) img[k] = t[k]; });
      applyTransform(part);
    }

    function clearImage(part) {
      delete state.images[part];
      var holder = partEl(part) && partEl(part).querySelector('.art-clip');
      if (holder) holder.innerHTML = '';
    }

    function getState() {
      var out = { parts: {}, images: {} };
      ORDER.forEach(function (id) { out.parts[id] = { color: state.parts[id].color, finish: state.parts[id].finish }; });
      Object.keys(state.images).forEach(function (k) {
        var i = state.images[k];
        out.images[k] = { x: i.x, y: i.y, scale: i.scale, rotate: i.rotate, w: i.w, h: i.h };
      });
      return out;
    }

    function svgPointScale() {
      var r = svg.getBoundingClientRect();
      return r.width ? VIEW_W / r.width : 1;
    }

    // プレビューを長辺 maxSide px の JPEG にする。失敗した環境では画像なしのSVGを返す。
    function toThumbnail(maxSide) {
      maxSide = maxSide || 300;
      var w = maxSide, h = Math.round(maxSide * VIEW_H / VIEW_W);
      var clone = svg.cloneNode(true);
      clone.setAttribute('width', VIEW_W);
      clone.setAttribute('height', VIEW_H);
      var markup = new XMLSerializer().serializeToString(clone);
      function fallback() {
        var c2 = svg.cloneNode(true);
        Array.prototype.forEach.call(c2.querySelectorAll('image'), function (n) { n.parentNode.removeChild(n); });
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c2));
      }
      return new Promise(function (resolve) {
        var url;
        try {
          url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
        } catch (e) { resolve(fallback()); return; }
        var im = new Image();
        im.onload = function () {
          try {
            var c = document.createElement('canvas');
            c.width = w; c.height = h;
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#26282b';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(im, 0, 0, w, h);
            resolve(c.toDataURL('image/jpeg', 0.82));
          } catch (e) {
            resolve(fallback());
          } finally { URL.revokeObjectURL(url); }
        };
        im.onerror = function () { URL.revokeObjectURL(url); resolve(fallback()); };
        im.src = url;
      });
    }

    return {
      element: svg,
      setColor: setColor,
      setFinish: setFinish,
      setImage: setImage,
      setImageTransform: setImageTransform,
      clearImage: clearImage,
      getState: getState,
      svgPointScale: svgPointScale,
      toThumbnail: toThumbnail
    };
  }

  SC.Preview = {
    create: create,
    PARTS: PARTS,
    FINISHES: FINISHES,
    DEFAULTS: DEFAULTS,
    IMAGE_PARTS: IMAGE_PARTS
  };
})(window);
