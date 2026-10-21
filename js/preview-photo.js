/*
 * プレビュー描画モジュール（写真レンダラー）
 * -------------------------------------------------
 * SC.Preview（SVGイラスト）と同じメソッドを持つ。customizer.js は写真データ（js/photo-data.js）が
 * 読み込めていればこちらを使う。
 *
 * 描き方：陰影だけの写真（白いパーツは元の明るさ、黒いパーツは明るく持ち上げたもの）の上に、
 * パーツごとのマスクで切り抜いた色を「乗算」で重ねる。写真の陰影や質感を残したまま色が変わる。
 */
(function (global) {
  'use strict';
  var SC = global.SC = global.SC || {};
  var NS = 'http://www.w3.org/2000/svg';

  var PARTS = [
    { id: 'front-shell', label: '前面シェル', code: 'SHELL / FRONT' },
    { id: 'back-shell', label: '背面・グリップ', code: 'SHELL / BACK' },
    { id: 'trim', label: '中央・帯', code: 'TRIM / CENTER' },
    { id: 'touchpad', label: 'タッチパッド', code: 'PAD / TOUCH' },
    { id: 'face-buttons', label: 'ボタン', code: 'BTN / FACE' },
    { id: 'dpad', label: '十字キー', code: 'BTN / DPAD' },
    { id: 'sticks', label: 'スティック', code: 'STICK / CAP' }
  ];

  var FINISHES = [
    { id: 'matte', label: 'マット', code: 'MATTE' },
    { id: 'gloss', label: 'グロス', code: 'GLOSS' },
    { id: 'metal', label: 'メタリック', code: 'METALLIC' }
  ];

  // 初期値は元の写真に近い見た目になる色（陰影マップとの乗算で元の明るさに戻る）
  var DEFAULTS = {
    'front-shell': { color: '#f2f2f2', finish: 'matte' },
    'back-shell': { color: '#f2f2f2', finish: 'matte' },
    'trim': { color: '#353537', finish: 'matte' },
    'touchpad': { color: '#3d3e42', finish: 'matte' },
    'face-buttons': { color: '#353537', finish: 'gloss' },
    'dpad': { color: '#3d3d40', finish: 'gloss' },
    'sticks': { color: '#3d3e40', finish: 'matte' }
  };

  // 描画順（後ろ→前）。マスクは重ならないので順番は見た目に影響しない
  var ORDER = ['trim', 'back-shell', 'front-shell', 'touchpad', 'dpad', 'face-buttons', 'sticks'];
  var IMAGE_PART_IDS = ['front-shell', 'touchpad'];

  function data() { return SC.PHOTO_DATA; }

  function imageParts() {
    var out = {};
    IMAGE_PART_IDS.forEach(function (id) { out[id] = data().bbox[id]; });
    return out;
  }

  function finishDefs(p) {
    return '' +
      '<linearGradient id="' + p + 'fin-matte"><stop offset="0" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="' + p + 'fin-gloss" x1="0" y1="0" x2=".3" y2="1">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".5"/>' +
        '<stop offset=".3" stop-color="#fff" stop-opacity=".12"/>' +
        '<stop offset=".32" stop-color="#fff" stop-opacity="0"/>' +
        '<stop offset="1" stop-color="#fff" stop-opacity=".06"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + p + 'fin-metal" x1="0" y1="0" x2="1" y2=".5">' +
        '<stop offset="0" stop-color="#fff" stop-opacity=".38"/>' +
        '<stop offset=".18" stop-color="#000" stop-opacity=".22"/>' +
        '<stop offset=".36" stop-color="#fff" stop-opacity=".45"/>' +
        '<stop offset=".52" stop-color="#000" stop-opacity=".26"/>' +
        '<stop offset=".72" stop-color="#fff" stop-opacity=".32"/>' +
        '<stop offset=".88" stop-color="#000" stop-opacity=".14"/>' +
        '<stop offset="1" stop-color="#fff" stop-opacity=".36"/>' +
      '</linearGradient>';
  }

  function svgMarkup(p) {
    var D = data(), W = D.w, H = D.h;
    var defs = finishDefs(p), body = '';
    ORDER.forEach(function (part) {
      var b = D.bbox[part], d = DEFAULTS[part];
      var box = ' x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '"';
      var mask = ' mask="url(#' + p + 'mask-' + part + ')"';
      defs += '<mask id="' + p + 'mask-' + part + '" maskUnits="userSpaceOnUse" x="0" y="0" width="' + W + '" height="' + H + '">' +
        '<image href="' + D.masks[part] + '" width="' + W + '" height="' + H + '" preserveAspectRatio="none"/></mask>';
      body += '<g class="part" data-part="' + part + '">' +
        '<rect class="base"' + box + mask + ' fill="' + d.color + '" style="mix-blend-mode:multiply"/>';
      if (IMAGE_PART_IDS.indexOf(part) >= 0) body += '<g class="art-clip"' + mask + '></g>';
      body += '<rect class="finish"' + box + mask + ' fill="url(#' + p + 'fin-' + d.finish + ')" data-finish="' + d.finish + '" pointer-events="none"/>' +
        '</g>';
    });
    return '<svg xmlns="' + NS + '" viewBox="0 0 ' + W + ' ' + H + '" class="pad-svg photo-mode" role="img" aria-label="コントローラーのプレビュー（写真）">' +
      '<defs>' + defs + '</defs>' +
      '<image class="shade" href="' + D.shading + '" width="' + W + '" height="' + H + '"/>' +
      body + '</svg>';
  }

  var counter = 0;

  function create(container, opts) {
    opts = opts || {};
    var D = data();
    var prefix = (opts.idPrefix || 'ph') + (++counter) + '-';
    var IMAGE_PARTS = imageParts();
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
      var box = IMAGE_PARTS[part];
      var cx = box.x + box.w / 2 + img.x, cy = box.y + box.h / 2 + img.y;
      var t = 'translate(' + cx.toFixed(2) + ' ' + cy.toFixed(2) + ') rotate(' + img.rotate + ') scale(' + img.scale + ') translate(' + (-img.dw / 2).toFixed(2) + ' ' + (-img.dh / 2).toFixed(2) + ')';
      partEl(part).querySelector('image.art').setAttribute('transform', t);
    }

    function setImage(part, imgData) {
      var box = IMAGE_PARTS[part];
      if (!box) return;
      var cover = Math.max(box.w / imgData.w, box.h / imgData.h);
      state.images[part] = { src: imgData.src, w: imgData.w, h: imgData.h, dw: imgData.w * cover, dh: imgData.h * cover, x: 0, y: 0, scale: 1, rotate: 0 };
      var holder = partEl(part).querySelector('.art-clip');
      holder.innerHTML = '';
      var el = document.createElementNS(NS, 'image');
      el.setAttribute('class', 'art');
      el.setAttribute('href', imgData.src);
      el.setAttribute('width', state.images[part].dw.toFixed(2));
      el.setAttribute('height', state.images[part].dh.toFixed(2));
      el.setAttribute('preserveAspectRatio', 'none');
      el.setAttribute('data-w', imgData.w);
      el.setAttribute('data-h', imgData.h);
      holder.appendChild(el);
      // 貼った画像にも写真の陰影を乗算で乗せる
      var sh = document.createElementNS(NS, 'image');
      sh.setAttribute('href', D.shading);
      sh.setAttribute('width', D.w);
      sh.setAttribute('height', D.h);
      sh.setAttribute('style', 'mix-blend-mode:multiply');
      sh.setAttribute('pointer-events', 'none');
      holder.appendChild(sh);
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
      return r.width ? D.w / r.width : 1;
    }

    // 長辺 maxSide px の JPEG。canvas に描けない環境では、色だけを並べた小さなSVGを返す
    function toThumbnail(maxSide) {
      maxSide = maxSide || 300;
      var w = maxSide, h = Math.round(maxSide * D.h / D.w);
      function fallback() {
        var sw = '';
        ORDER.forEach(function (id, i) { sw += '<rect x="' + (i * 300 / ORDER.length) + '" y="0" width="' + (300 / ORDER.length + 1) + '" height="200" fill="' + state.parts[id].color + '"/>'; });
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="' + NS + '" viewBox="0 0 300 200">' + sw + '</svg>');
      }
      return new Promise(function (resolve) {
        var url;
        try {
          var clone = svg.cloneNode(true);
          clone.setAttribute('width', w);
          clone.setAttribute('height', h);
          url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
        } catch (e) { resolve(fallback()); return; }
        var im = new Image();
        im.onload = function () {
          try {
            var c = document.createElement('canvas');
            c.width = w; c.height = h;
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#bfbfbf';
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

  SC.PreviewPhoto = {
    available: function () { return !!(SC.PHOTO_DATA && SC.PHOTO_DATA.masks); },
    create: create,
    PARTS: PARTS,
    FINISHES: FINISHES,
    DEFAULTS: DEFAULTS,
    get IMAGE_PARTS() { return imageParts(); }
  };
})(window);
