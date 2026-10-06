/*
 * FGO風キャラ紹介メーカー
 * すべての処理はブラウザ内で完結します（画像をサーバーへ送信しません）。
 */
(() => {
  'use strict';

  const CFG = window.FGO_MAKER_CONFIG || {};
  const SIZE = 1024;
  const WATERMARK = 'FGO風キャラ紹介メーカー';

  const canvas = document.getElementById('stage');
  const ctx = canvas.getContext('2d');

  /* ------------------------------------------------------------------
   * フォント（すべて Google Fonts / SIL Open Font License）
   * ------------------------------------------------------------------ */
  const FONTS = [
    { family: 'Zen Old Mincho', label: 'Zen Old Mincho（明朝）', weights: [400, 500, 600, 700, 900] },
    { family: 'Shippori Mincho B1', label: 'しっぽり明朝 B1', weights: [400, 500, 600, 700, 800] },
    { family: 'Noto Serif JP', label: 'Noto Serif JP（明朝）', weights: [400, 500, 600, 700, 800, 900] },
    { family: 'Kaisei Tokumin', label: '解星 特ミン（太明朝）', weights: [400, 500, 700, 800] },
    { family: 'Zen Antique', label: 'Zen Antique（アンティーク明朝）', weights: [400] },
    { family: 'Hina Mincho', label: 'ひな明朝', weights: [400] },
    { family: 'Yuji Syuku', label: '佑字 肅（筆文字）', weights: [400] },
    { family: 'Dela Gothic One', label: 'デラゴシック（極太）', weights: [400] },
    { family: 'Reggae One', label: 'Reggae One（ポップ）', weights: [400] },
    { family: 'RocknRoll One', label: 'RocknRoll One（丸ゴ）', weights: [400] },
    { family: 'Zen Kaku Gothic New', label: 'Zen角ゴシック New', weights: [400, 500, 700, 900] },
    { family: 'Noto Sans JP', label: 'Noto Sans JP（ゴシック）', weights: [400, 500, 700, 900] }
  ];
  const FALLBACK_FONT = '"Hiragino Mincho ProN", "Yu Mincho", serif';

  /* ------------------------------------------------------------------
   * レアリティ
   * ------------------------------------------------------------------ */
  const RARITY_STARS = { C: 1, UC: 2, R: 3, SR: 4, SSR: 5 };
  const RARITY_PRESETS = {
    C:   { labelTop: '#d9a47a', labelBottom: '#7a3f1c', borderTop: '#fff3e6', borderBottom: '#b87a45', outer: '#3e2210', starFill: '#f1cfae', starStroke: '#a8683c', glow: '#e7b489' },
    UC:  { labelTop: '#e6b58a', labelBottom: '#8d4d24', borderTop: '#ffffff', borderBottom: '#c98f5a', outer: '#3e2210', starFill: '#f6dcc2', starStroke: '#b3743f', glow: '#eec29a' },
    R:   { labelTop: '#6f93d8', labelBottom: '#1d3574', borderTop: '#ffffff', borderBottom: '#a7b1bf', outer: '#262b33', starFill: '#eef2f8', starStroke: '#8e98a6', glow: '#c9d3e0' },
    SR:  { labelTop: '#f0434a', labelBottom: '#a10e1a', borderTop: '#fff7dc', borderBottom: '#d3a13b', outer: '#4a2a0c', starFill: '#f5dc7e', starStroke: '#c99a2e', glow: '#f3d27a' },
    SSR: { labelTop: '#f0434a', labelBottom: '#a10e1a', borderTop: '#fff7dc', borderBottom: '#d3a13b', outer: '#4a2a0c', starFill: '#f5dc7e', starStroke: '#c99a2e', glow: '#f3d27a' }
  };

  /* ------------------------------------------------------------------
   * 要素の定義（描画順 = 下から）
   * ------------------------------------------------------------------ */
  const EL = {
    magic:     { type: 'image',  label: '魔法陣',               sizeKey: 'scale' },
    char:      { type: 'image',  label: 'キャラ画像',           sizeKey: 'scale' },
    classHead: { type: 'text',   label: '見出し「クラス」',     sizeKey: 'size', heading: true },
    classIcon: { type: 'image',  label: 'クラスアイコン',       sizeKey: 'size' },
    className: { type: 'text',   label: 'クラス名',             sizeKey: 'size' },
    profHead:  { type: 'text',   label: '見出し「プロフィール」', sizeKey: 'size', heading: true },
    profBody:  { type: 'text',   label: 'プロフィール本文',     sizeKey: 'size', multiline: true },
    catch:     { type: 'text',   label: 'キャッチコピー',       sizeKey: 'size', multiline: true },
    name:      { type: 'text',   label: 'キャラ名',             sizeKey: 'size', multiline: true },
    rarity:    { type: 'rarity', label: 'レアリティ',           sizeKey: 'size' }
  };
  const DRAW_ORDER = ['magic', 'char', 'classHead', 'classIcon', 'className', 'profHead', 'profBody', 'catch', 'name', 'rarity'];
  // キャンバス上で掴める要素（手前から順に判定）。魔法陣は背景なので掴めない（選択中なら空き部分のドラッグで動かせる）
  const HIT_ORDER = ['rarity', 'name', 'catch', 'profBody', 'profHead', 'className', 'classIcon', 'classHead', 'char'];
  const SIZE_LIMITS = { size: [6, 320], scale: [0.05, 8] };

  // 文字要素の共通初期値
  const textBase = (o) => Object.assign({
    visible: true, text: '',
    x: 0, y: 0, align: 'left', rotation: 0, skew: 0,
    font: 'Zen Old Mincho', weight: 700, size: 24,
    letterSpacing: 0, lineHeight: 1.4, lineShift: 0, wrap: 0,
    fillMode: 'solid', color: '#000000', color2: '#000000',
    s1Width: 0, s1Color: '#ffffff', s2Width: 0, s2Color: '#000000',
    shadowColor: '#000000', shadowOpacity: 0, shadowBlur: 0, shadowX: 0, shadowY: 0,
    lineVisible: false, lineLength: 200, lineOffset: 6, lineWidth: 2, lineColor: '#c9a045'
  }, o);

  const headingStyle = {
    font: 'Zen Old Mincho', weight: 900, size: 28, skew: 14, letterSpacing: -4,
    fillMode: 'gradient', color: '#fffaf0', color2: '#c8a043',
    s1Width: 2.5, s1Color: '#2b1a0e',
    shadowColor: '#e2b85a', shadowOpacity: 0.85, shadowBlur: 10,
    lineVisible: true, lineOffset: 6, lineWidth: 2, lineColor: '#c9a045'
  };
  const bigTextStyle = {
    font: 'Shippori Mincho B1', weight: 800, skew: 14, fillMode: 'gradient',
    s1Width: 5, s1Color: '#ffffff', s2Width: 3, s2Color: '#c9a04a',
    shadowColor: '#3a2008', shadowOpacity: 0.45, shadowBlur: 6, shadowX: 2, shadowY: 3
  };

  const DEFAULTS = {
    bg: { color: '#ffffff' },
    magic: { visible: true, mode: 'alpha', color: '#b3a58a', opacity: 0.32, x: 470, y: 540, scale: 1.0, rotation: 0 },
    char: { x: 745, y: 520, scale: 1.0, rotation: 0, flip: false, multiply: false },
    classHead: textBase(Object.assign({}, headingStyle, { text: 'クラス', x: 26, y: 34, lineLength: 175 })),
    classIcon: { visible: true, x: 214, y: 70, size: 88, rotation: 0 },
    className: textBase({
      text: 'セイバー', x: 52, y: 86, size: 22, font: 'Noto Serif JP', weight: 900, color: '#111111', letterSpacing: -0.5,
      s1Width: 2, s1Color: '#ffffff'
    }),
    profHead: textBase(Object.assign({}, headingStyle, { text: 'プロフィール', x: 26, y: 146, lineLength: 228 })),
    profBody: textBase({
      text: '多くのギリシア神話にその名を刻む英雄。\n彼の残した物語はギリシア中で語り継がれた。\n悲劇や喜劇への登場も多く、\nそのキャラクター性は詩人によって描き方が変わる。',
      x: 60, y: 203, size: 23, font: 'Noto Serif JP', weight: 800, color: '#111111', lineHeight: 1.6, letterSpacing: -0.5, wrap: 540,
      s1Width: 3.5, s1Color: '#ffffff'
    }),
    catch: textBase(Object.assign({}, bigTextStyle, {
      text: '全ギリシアで活躍した\n語られぬ剣の担い手', x: 190, y: 690, size: 54, rotation: -6, lineHeight: 0.98, lineShift: 170, letterSpacing: -3,
      color: '#e8303a', color2: '#850a14'
    })),
    name: textBase(Object.assign({}, bigTextStyle, {
      text: 'アンドラス・アントロポス', x: 946, y: 738, size: 58, align: 'right', rotation: -7, letterSpacing: -2,
      color: '#4a7ad8', color2: '#0f2466'
    })),
    rarity: Object.assign({
      level: 'SSR', showLabel: true, showStars: true,
      x: 972, y: 800, size: 44, align: 'right', rotation: -7, skew: 12,
      font: 'Shippori Mincho B1', weight: 800, letterSpacing: -2,
      starScale: 0.74, starGap: -1, starY: -4, starRise: 0
    }, RARITY_PRESETS.SSR)
  };

  // 初期化しても残す値（文章・表示設定・選択中のアイコンなど）
  const KEEP_ON_RESET = ['text', 'visible', 'level', 'showLabel', 'showStars'];

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const state = clone(DEFAULTS);
  let selected = null;

  /* ------------------------------------------------------------------
   * 画像素材
   * ------------------------------------------------------------------ */
  const assets = {
    char: null,          // キャラ画像（縮小済み canvas）
    charName: '',
    magicDefault: null,  // { c: 元画像のcanvas, mode: 自動判定した色の付け方, id }
    magicCustom: null,   // 同上（ユーザーが読み込んだ魔法陣）
    magicCustomName: '',
    iconUpload: null,    // クラスアイコン（ユーザーがアップロードした正方形canvas）
    iconUploadName: ''
  };
  let magicSeq = 0;

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('load failed: ' + src));
      img.src = src;
    });
  }

  function fileToImage(file) {
    const url = URL.createObjectURL(file);
    return loadImage(url).finally(() => setTimeout(() => URL.revokeObjectURL(url), 1000));
  }

  // 大きすぎる画像は描画負荷を下げるため縮小して canvas 化
  function toCanvas(img, max) {
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    const k = Math.min(1, max / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * k));
    c.height = Math.max(1, Math.round(h0 * k));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  // 正方形に中央トリミング
  function toSquareCanvas(img, max) {
    const w0 = img.naturalWidth || img.width, h0 = img.naturalHeight || img.height;
    const s = Math.min(w0, h0);
    const out = Math.min(max, s);
    const c = document.createElement('canvas');
    c.width = c.height = out;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, (w0 - s) / 2, (h0 - s) / 2, s, s, 0, 0, out, out);
    return c;
  }

  // 魔法陣画像の「色の付け方」を自動判定する
  //  bright   … 透過PNGで、明るい線が塗りの上に乗っている画像（青白く光る魔法陣など）
  //  alpha    … 線だけが残った透過PNG／白地に黒線の画像
  function detectMagicMode(c) {
    const p = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let total = 0, transparent = 0, solid = 0, lumSum = 0;
    for (let i = 0; i < p.length; i += 16) {
      total++;
      if (p[i + 3] < 250) transparent++;
      if (p[i + 3] > 128) { solid++; lumSum += 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; }
    }
    if (!total || transparent / total < 0.02 || !solid) return 'alpha';
    const filled = solid / total >= 0.15;
    return filled && lumSum / solid >= 110 ? 'bright' : 'alpha';
  }

  function makeMagicSource(canvas, forcedMode) {
    return { c: canvas, mode: forcedMode || detectMagicMode(canvas), id: ++magicSeq };
  }

  // 元画像 → 「黒＋アルファ」のマスク（線の強さ＝アルファ）
  function buildMagicMask(raw, mode) {
    const c = document.createElement('canvas');
    c.width = raw.width; c.height = raw.height;
    const g = c.getContext('2d');
    g.drawImage(raw, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height);
    const p = d.data;
    let hasAlpha = false;
    for (let i = 3; i < p.length; i += 4 * 7) { if (p[i] < 250) { hasAlpha = true; break; } }
    for (let i = 0; i < p.length; i += 4) {
      let a;
      if (mode === 'bright') {
        // 線は「白さ（RGBの最小値）」が高い。塗りや光のにじみは低いので分離できる
        const m = Math.min(p[i], p[i + 1], p[i + 2]);
        const t = Math.min(1, Math.max(0, (m - 130) / 95));
        a = p[i + 3] * t * t * (3 - 2 * t);
      } else if (hasAlpha) {
        a = p[i + 3];
      } else {
        a = 255 - (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]);
      }
      p[i] = p[i + 1] = p[i + 2] = 0;
      p[i + 3] = a;
    }
    g.putImageData(d, 0, 0);
    return c;
  }

  // 素材が無い場合の簡易魔法陣（ツール内で生成）
  function generateMagicCircle() {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const g = c.getContext('2d');
    let seed = 20240531;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    g.translate(512, 512);
    g.strokeStyle = g.fillStyle = '#000';
    g.lineCap = 'round';
    const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
    ring(500, 6); ring(486, 2); ring(420, 2); ring(408, 5);
    ring(300, 4); ring(290, 1.5); ring(170, 3); ring(160, 1.5); ring(60, 3);
    // 文字帯（それっぽい記号）
    const glyphs = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
    const band = (r, count, size) => {
      g.font = `${size}px serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        g.save(); g.rotate(a); g.translate(0, -r);
        const ch = glyphs[Math.floor(rnd() * glyphs.length)];
        // ルーン文字が無い環境でも崩れないよう、線で描いた記号にする
        g.lineWidth = 2.2;
        g.beginPath();
        const h = size * 0.42, w = size * 0.22;
        const kind = ch.charCodeAt(0) % 5;
        g.moveTo(0, -h); g.lineTo(0, h);
        if (kind === 0) { g.moveTo(0, -h * 0.4); g.lineTo(w, -h); }
        if (kind === 1) { g.moveTo(-w, -h * 0.2); g.lineTo(w, h * 0.3); }
        if (kind === 2) { g.moveTo(0, -h * 0.5); g.lineTo(w, 0); g.lineTo(0, h * 0.5); }
        if (kind === 3) { g.moveTo(-w, -h); g.lineTo(w, h); g.moveTo(w, -h); g.lineTo(-w, h); }
        if (kind === 4) { g.moveTo(-w, -h * 0.6); g.lineTo(w, -h * 0.6); }
        g.stroke();
        g.restore();
      }
    };
    band(453, 64, 44);
    band(355, 46, 40);
    band(230, 30, 36);
    // 六芒星と二重の四角
    const poly = (r, n, rot, w) => {
      g.lineWidth = w; g.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = rot + (i / n) * Math.PI * 2;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.stroke();
    };
    poly(408, 3, -Math.PI / 2, 3); poly(408, 3, Math.PI / 2, 3);
    poly(290, 4, 0, 2.5); poly(290, 4, Math.PI / 4, 2.5);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      g.save(); g.translate(Math.cos(a) * 408, Math.sin(a) * 408);
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3; g.stroke();
      g.beginPath(); g.arc(0, 0, 20, 0, Math.PI * 2); g.lineWidth = 1.5; g.stroke();
      g.restore();
    }
    // 放射線
    g.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.beginPath(); g.moveTo(Math.cos(a) * 60, Math.sin(a) * 60); g.lineTo(Math.cos(a) * 160, Math.sin(a) * 160); g.stroke();
    }
    // 白で塗った部分を透明に戻す（マスク化）
    const d = g.getImageData(0, 0, 1024, 1024);
    const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const lum = (p[i] + p[i + 1] + p[i + 2]) / 3;
      const a = p[i + 3] * (1 - lum / 255);
      p[i] = p[i + 1] = p[i + 2] = 0; p[i + 3] = a;
    }
    g.putImageData(d, 0, 0);
    return c;
  }

  const magicCache = { maskKey: '', mask: null, tintKey: '', tint: null };
  const activeMagic = () => assets.magicCustom || assets.magicDefault;

  // 描画に使う魔法陣canvas（モードに応じて、元の色 / 単色に塗ったもの）
  function getMagicCanvas() {
    const src = activeMagic();
    if (!src) return null;
    const mode = state.magic.mode;
    if (mode === 'original') return src.c;
    const maskKey = src.id + '|' + mode;
    if (magicCache.maskKey !== maskKey) {
      magicCache.mask = buildMagicMask(src.c, mode);
      magicCache.maskKey = maskKey;
      magicCache.tintKey = '';
    }
    const tintKey = maskKey + '|' + state.magic.color;
    if (magicCache.tintKey !== tintKey) {
      const m = magicCache.mask;
      const c = magicCache.tint && magicCache.tint.width === m.width && magicCache.tint.height === m.height
        ? magicCache.tint : document.createElement('canvas');
      c.width = m.width; c.height = m.height;
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
      g.drawImage(m, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = state.magic.color;
      g.fillRect(0, 0, c.width, c.height);
      g.globalCompositeOperation = 'source-over';
      magicCache.tint = c;
      magicCache.tintKey = tintKey;
    }
    return magicCache.tint;
  }

  function currentIcon() {
    return assets.iconUpload;
  }

  /* ------------------------------------------------------------------
   * フォント読み込み待ち
   * ------------------------------------------------------------------ */
  const fontKnown = new Set();
  const fontPending = new Set();
  function fontString(el, size) {
    return `${el.weight} ${size || el.size}px "${el.font}", ${FALLBACK_FONT}`;
  }
  function ensureFont(font, text) {
    if (!document.fonts || !text) return;
    const key = font + '\u0000' + text;
    if (fontKnown.has(key) || fontPending.has(key)) return;
    let ok = false;
    try { ok = document.fonts.check(font, text); } catch (e) { ok = true; }
    if (ok) { fontKnown.add(key); return; }
    fontPending.add(key);
    document.fonts.load(font, text).then(() => {
      fontPending.delete(key); fontKnown.add(key); requestRender();
    }, () => { fontPending.delete(key); fontKnown.add(key); });
  }
  function allFontRequests() {
    const reqs = [];
    for (const id of ['classHead', 'className', 'profHead', 'profBody', 'catch', 'name']) {
      const el = state[id];
      if (el.visible && el.text) reqs.push([fontString(el), el.text]);
    }
    if (state.rarity.level !== 'none') reqs.push([fontString(state.rarity), state.rarity.level]);
    reqs.push(['500 16px "Zen Kaku Gothic New"', WATERMARK]);
    return reqs;
  }
  function waitFonts(timeout = 8000) {
    if (!document.fonts) return Promise.resolve();
    const all = Promise.all(allFontRequests().map(([f, t]) => document.fonts.load(f, t).catch(() => null)));
    return Promise.race([all, new Promise((r) => setTimeout(r, timeout))]);
  }
  if (document.fonts) {
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => requestRender());
  }

  /* ------------------------------------------------------------------
   * 描画ヘルパー
   * ------------------------------------------------------------------ */
  const rad = (d) => (d * Math.PI) / 180;

  function hexToRgba(hex, a) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  // 行頭に来てはいけない文字（ぶら下げ処理）
  const NO_LINE_START = new Set('、。，．,.）)」』】〕〉》］]｝}ゝゞーぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶ！？!?…‥：；・');

  function measureChars(g, chars, spacing) {
    const ws = chars.map((c) => g.measureText(c).width);
    const w = ws.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
    return { ws, w };
  }

  function wrapLine(g, line, maxW, spacing) {
    const chars = [...line];
    if (!chars.length) return [''];
    const out = [];
    let cur = [];
    let curW = 0;
    for (const ch of chars) {
      const cw = g.measureText(ch).width;
      const add = (cur.length ? spacing : 0) + cw;
      if (cur.length && curW + add > maxW && !NO_LINE_START.has(ch)) {
        out.push(cur.join(''));
        cur = [ch]; curW = cw;
      } else {
        cur.push(ch); curW += add;
      }
    }
    out.push(cur.join(''));
    return out;
  }

  function layoutText(g, el) {
    g.font = fontString(el);
    const raw = String(el.text || '').replace(/\r/g, '').split('\n');
    const lines = [];
    for (const r of raw) {
      if (el.wrap > 0) lines.push(...wrapLine(g, r, el.wrap, el.letterSpacing));
      else lines.push(r);
    }
    return lines.map((s) => {
      const chars = [...s];
      const m = el.letterSpacing ? measureChars(g, chars, el.letterSpacing) : { ws: null, w: g.measureText(s).width };
      return { s, chars, ws: m.ws, w: m.w };
    });
  }

  function drawLineText(g, L, x, spacing, mode) {
    if (!spacing) {
      mode === 'fill' ? g.fillText(L.s, x, 0) : g.strokeText(L.s, x, 0);
      return;
    }
    let cx = x;
    for (let i = 0; i < L.chars.length; i++) {
      mode === 'fill' ? g.fillText(L.chars[i], cx, 0) : g.strokeText(L.chars[i], cx, 0);
      cx += L.ws[i] + spacing;
    }
  }

  // 影・光彩を要素全体にまとめて掛けるための作業用レイヤー
  const layer = document.createElement('canvas');
  layer.width = layer.height = SIZE;
  const lctx = layer.getContext('2d');

  function beginLayer() {
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, SIZE, SIZE);
    lctx.shadowColor = 'transparent';
    lctx.globalAlpha = 1;
    lctx.globalCompositeOperation = 'source-over';
    return lctx;
  }
  function endLayer(g, shadow) {
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (shadow && shadow.opacity > 0 && (shadow.blur > 0 || shadow.x || shadow.y)) {
      g.shadowColor = hexToRgba(shadow.color, shadow.opacity);
      g.shadowBlur = shadow.blur;
      g.shadowOffsetX = shadow.x;
      g.shadowOffsetY = shadow.y;
    }
    g.drawImage(layer, 0, 0);
    g.restore();
  }

  function gradientOrColor(g, top, bottom, h, mode) {
    if (mode !== 'gradient') return top;
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    return gr;
  }

  /* ------------------------------------------------------------------
   * 各要素の描画
   * regions に当たり判定用の情報を積む
   * ------------------------------------------------------------------ */
  function drawText(g, id, regions) {
    const el = state[id];
    if (!el.visible || !String(el.text || '').trim()) return;
    ensureFont(fontString(el), el.text);

    const L = beginLayer();
    const lines = layoutText(L, el);
    const lh = el.size * el.lineHeight;
    const skewC = -Math.tan(rad(el.skew));

    L.translate(el.x, el.y);
    L.rotate(rad(el.rotation));
    const m = L.getTransform();

    L.font = fontString(el);
    L.textBaseline = 'middle';
    L.textAlign = 'left';
    L.lineJoin = 'round';
    L.miterLimit = 2;

    let minX = Infinity, maxX = -Infinity;
    const placed = lines.map((ln, i) => {
      let x = el.align === 'right' ? -ln.w : el.align === 'center' ? -ln.w / 2 : 0;
      x += i * el.lineShift;
      const cy = i * lh + el.size / 2;
      if (ln.s.length) { minX = Math.min(minX, x); maxX = Math.max(maxX, x + ln.w); }
      return { ln, x, cy };
    });
    if (!isFinite(minX)) { minX = 0; maxX = 0; }

    const passes = [];
    if (el.s2Width > 0) passes.push({ mode: 'stroke', width: (el.s1Width + el.s2Width) * 2, color: el.s2Color });
    if (el.s1Width > 0) passes.push({ mode: 'stroke', width: el.s1Width * 2, color: el.s1Color });
    passes.push({ mode: 'fill' });

    for (const p of passes) {
      for (const { ln, x, cy } of placed) {
        if (!ln.s.length) continue;
        L.save();
        L.translate(0, cy);
        L.transform(1, 0, skewC, 1, 0, 0);
        if (p.mode === 'stroke') {
          L.lineWidth = p.width;
          L.strokeStyle = p.color;
        } else {
          L.fillStyle = gradientOrColor(L, el.color, el.color2, el.size, el.fillMode);
        }
        drawLineText(L, ln, x, el.letterSpacing, p.mode);
        L.restore();
      }
    }

    // 見出しの金色ライン
    const blockH = (lines.length - 1) * lh + el.size;
    if (EL[id].heading && el.lineVisible && el.lineLength > 0) {
      const ly = blockH + el.lineOffset;
      const x1 = el.align === 'right' ? maxX : minX;
      const x2 = el.align === 'right' ? maxX - el.lineLength : minX + el.lineLength;
      const gr = L.createLinearGradient(x1, 0, x2, 0);
      gr.addColorStop(0, hexToRgba(el.lineColor, 0.9));
      gr.addColorStop(0.08, hexToRgba(el.lineColor, 1));
      gr.addColorStop(0.55, '#f6e3a4');
      gr.addColorStop(0.9, hexToRgba(el.lineColor, 1));
      gr.addColorStop(1, hexToRgba(el.lineColor, 0));
      L.strokeStyle = gr;
      L.lineWidth = el.lineWidth;
      L.lineCap = 'butt';
      L.beginPath();
      L.moveTo(x1, ly); L.lineTo(x2, ly);
      L.stroke();
    }

    endLayer(g, { color: el.shadowColor, opacity: el.shadowOpacity, blur: el.shadowBlur, x: el.shadowX, y: el.shadowY });

    const pad = el.s1Width + el.s2Width + 4;
    const slant = Math.abs(Math.tan(rad(el.skew))) * el.size / 2;
    let bx1 = minX - pad - slant, bx2 = maxX + pad + slant;
    let by2 = blockH + pad;
    if (EL[id].heading && el.lineVisible && el.lineLength > 0) {
      by2 = Math.max(by2, blockH + el.lineOffset + el.lineWidth + 2);
      if (el.align === 'right') bx1 = Math.min(bx1, maxX - el.lineLength);
      else bx2 = Math.max(bx2, minX + el.lineLength);
    }
    regions[id] = { m, x: bx1, y: -pad, w: bx2 - bx1, h: by2 + pad, contentW: maxX - minX };
  }

  function starPath(g, cx, cy, R, r) {
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r : R;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath();
  }

  function drawRarity(g, regions) {
    const el = state.rarity;
    if (el.level === 'none' || (!el.showLabel && !el.showStars)) return;
    const label = el.level;
    const count = RARITY_STARS[el.level] || 0;
    ensureFont(fontString(el), label);

    const L = beginLayer();
    L.font = fontString(el);
    L.textBaseline = 'middle';
    L.lineJoin = 'round';
    const chars = [...label];
    const lm = measureChars(L, chars, el.letterSpacing);
    const labelW = el.showLabel ? lm.w : 0;
    const d = el.size * el.starScale;
    const pitch = d * 0.95 + el.starGap;
    const starsW = el.showStars && count ? d + (count - 1) * pitch : 0;
    const gap = labelW && starsW ? el.size * 0.1 : 0;
    const total = labelW + gap + starsW;
    const x0 = el.align === 'right' ? -total : el.align === 'center' ? -total / 2 : 0;

    L.translate(el.x, el.y);
    L.rotate(rad(el.rotation));
    const m = L.getTransform();
    const cy = el.size / 2;
    const border = Math.max(1, el.size * 0.07);
    const outer = Math.max(1, el.size * 0.045);

    if (labelW) {
      L.save();
      L.translate(0, cy);
      L.transform(1, 0, -Math.tan(rad(el.skew)), 1, 0, 0);
      const line = { s: label, chars, ws: lm.ws };
      L.lineWidth = (border + outer) * 2; L.strokeStyle = el.outer;
      drawLineText(L, line, x0, el.letterSpacing || 0.0001, 'stroke');
      L.lineWidth = border * 2; L.strokeStyle = gradientOrColor(L, el.borderTop, el.borderBottom, el.size, 'gradient');
      drawLineText(L, line, x0, el.letterSpacing || 0.0001, 'stroke');
      L.fillStyle = gradientOrColor(L, el.labelTop, el.labelBottom, el.size, 'gradient');
      drawLineText(L, line, x0, el.letterSpacing || 0.0001, 'fill');
      L.restore();
    }

    if (starsW) {
      const R = d / 2, r = R * 0.48;
      const sy = cy + el.starY;
      const sx0 = x0 + labelW + gap + R;
      const sw = Math.max(1, d * 0.07);
      L.lineJoin = 'round';
      for (let pass = 0; pass < 3; pass++) {
        for (let i = 0; i < count; i++) {
          const sx = sx0 + i * pitch;
          starPath(L, sx, sy - i * el.starRise, R, r);
          if (pass === 0) { L.lineWidth = sw * 2 + outer * 2; L.strokeStyle = el.outer; L.stroke(); }
          if (pass === 1) { L.lineWidth = sw * 2; L.strokeStyle = el.starStroke; L.stroke(); }
          if (pass === 2) {
            const gy = sy - i * el.starRise;
            const gr = L.createLinearGradient(0, gy - R, 0, gy + R);
            gr.addColorStop(0, '#fffef6');
            gr.addColorStop(0.4, '#fffbea');
            gr.addColorStop(1, el.starFill);
            L.fillStyle = gr; L.fill();
          }
        }
      }
    }

    endLayer(g, { color: el.glow, opacity: 0.9, blur: el.size * 0.2, x: 0, y: 0 });

    const pad = border + outer + 4;
    const rise = Math.max(0, (count - 1) * el.starRise);
    const top = Math.min(-pad, el.starY + el.size / 2 - d / 2 - rise - pad);
    const bottom = Math.max(el.size + pad, el.starY + el.size / 2 + d / 2 + Math.max(0, -(count - 1) * el.starRise) + pad);
    regions.rarity = { m, x: x0 - pad, y: top, w: total + pad * 2, h: bottom - top, contentW: total };
  }

  function drawImageEl(g, id, img, w, h, regions, opts = {}) {
    const el = state[id];
    g.save();
    g.translate(el.x, el.y);
    g.rotate(rad(el.rotation));
    const m = g.getTransform();
    if (img) {
      if (opts.flip) g.scale(-1, 1);
      if (opts.alpha != null) g.globalAlpha = opts.alpha;
      if (opts.composite) g.globalCompositeOperation = opts.composite;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, -w / 2, -h / 2, w, h);
    } else if (opts.placeholder) {
      opts.placeholder(g, w, h);
    }
    g.restore();
    regions[id] = { m, x: -w / 2, y: -h / 2, w, h };
  }

  function charSize() {
    const img = assets.char;
    if (!img) return [620, 980];
    const base = Math.min(1000 / img.height, 900 / img.width);
    const k = base * state.char.scale;
    return [img.width * k, img.height * k];
  }

  /* ------------------------------------------------------------------
   * シーン全体
   * ------------------------------------------------------------------ */
  let regions = {};

  function drawScene(g, preview) {
    const reg = {};
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = state.bg.color;
    g.fillRect(0, 0, SIZE, SIZE);

    // 魔法陣
    if (state.magic.visible) {
      const tinted = getMagicCanvas();
      if (tinted) {
        const k = (1000 / Math.max(tinted.width, tinted.height)) * state.magic.scale;
        drawImageEl(g, 'magic', tinted, tinted.width * k, tinted.height * k, reg, { alpha: state.magic.opacity });
      }
    }

    // キャラ
    const [cw, ch] = charSize();
    drawImageEl(g, 'char', assets.char, cw, ch, reg, {
      flip: state.char.flip,
      composite: state.char.multiply ? 'multiply' : null,
      placeholder: preview ? (pg, w, h) => {
        pg.save();
        pg.setLineDash([14, 10]);
        pg.lineWidth = 3;
        pg.strokeStyle = 'rgba(120, 100, 70, .55)';
        pg.fillStyle = 'rgba(200, 180, 140, .10)';
        pg.beginPath();
        pg.rect(-w / 2 + 20, -h / 2 + 20, w - 40, h - 40);
        pg.fill(); pg.stroke();
        pg.setLineDash([]);
        pg.fillStyle = 'rgba(90, 70, 45, .8)';
        pg.font = `700 34px "Zen Kaku Gothic New", sans-serif`;
        pg.textAlign = 'center';
        pg.textBaseline = 'middle';
        pg.fillText('キャラ画像を', 0, -26);
        pg.fillText('アップロード', 0, 22);
        pg.font = `500 22px "Zen Kaku Gothic New", sans-serif`;
        pg.fillText('（ドロップでもOK）', 0, 70);
        pg.restore();
      } : null
    });

    drawText(g, 'classHead', reg);

    if (state.classIcon.visible) {
      const icon = currentIcon();
      const s = state.classIcon.size;
      drawImageEl(g, 'classIcon', icon, s, s, reg, {
        placeholder: preview ? (pg, w, h) => {
          pg.save();
          pg.rotate(Math.PI / 4);
          pg.setLineDash([6, 5]);
          pg.lineWidth = 2;
          pg.strokeStyle = 'rgba(120, 100, 70, .7)';
          const q = w * 0.62;
          pg.strokeRect(-q / 2, -q / 2, q, q);
          pg.restore();
          pg.fillStyle = 'rgba(90, 70, 45, .8)';
          pg.font = `700 ${Math.round(w * 0.16)}px "Zen Kaku Gothic New", sans-serif`;
          pg.textAlign = 'center';
          pg.textBaseline = 'middle';
          pg.fillText('アイコン', 0, 0);
        } : null
      });
    }

    drawText(g, 'className', reg);
    drawText(g, 'profHead', reg);
    drawText(g, 'profBody', reg);
    drawText(g, 'catch', reg);
    drawText(g, 'name', reg);
    drawRarity(g, reg);

    // 透かし（常に表示・編集不可）
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.font = '500 15px "Zen Kaku Gothic New", sans-serif';
    ensureFont('500 15px "Zen Kaku Gothic New"', WATERMARK);
    g.textAlign = 'right';
    g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(80, 70, 60, 0.28)';
    g.fillText(WATERMARK, SIZE - 12, SIZE - 10);
    g.restore();

    if (preview) {
      regions = reg;
      drawSelection(g);
    }
  }

  function drawSelection(g) {
    if (!selected || !regions[selected]) return;
    const r = regions[selected];
    g.save();
    g.setTransform(r.m);
    const k = SIZE / Math.max(1, canvas.getBoundingClientRect().width || SIZE);
    g.lineWidth = 1.5 * k;
    g.setLineDash([6 * k, 4 * k]);
    g.strokeStyle = 'rgba(255,255,255,.95)';
    g.strokeRect(r.x, r.y, r.w, r.h);
    g.lineDashOffset = 5 * k;
    g.strokeStyle = 'rgba(160, 30, 40, .95)';
    g.strokeRect(r.x, r.y, r.w, r.h);
    // 基準点（揃えの起点）
    g.setLineDash([]);
    g.fillStyle = 'rgba(160, 30, 40, .95)';
    g.strokeStyle = '#fff';
    g.lineWidth = 1.5 * k;
    g.beginPath();
    g.arc(0, 0, 4.5 * k, 0, Math.PI * 2);
    g.fill(); g.stroke();
    g.restore();
  }

  let renderQueued = false;
  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      drawScene(ctx, true);
    });
  }

  /* ------------------------------------------------------------------
   * 状態の読み書き
   * ------------------------------------------------------------------ */
  const getPath = (path) => path.reduce((o, k) => o[k], state);
  const setPath = (path, v) => { path.slice(0, -1).reduce((o, k) => o[k], state)[path[path.length - 1]] = v; };

  function resetElement(id) {
    const keep = {};
    for (const k of KEEP_ON_RESET) if (k in state[id]) keep[k] = state[id][k];
    state[id] = Object.assign(clone(DEFAULTS[id]), keep);
    if (id === 'rarity' && RARITY_PRESETS[state.rarity.level]) Object.assign(state.rarity, RARITY_PRESETS[state.rarity.level]);
    if (id === 'magic') state.magic.mode = activeMagic() ? activeMagic().mode : 'alpha';
  }

  // 揃えを変えても見た目の位置が変わらないように基準点を移動する
  function setAlign(id, align) {
    const el = state[id];
    const old = el.align;
    if (old === align) return;
    const r = regions[id];
    const w = r ? r.contentW || 0 : 0;
    const pos = { left: 0, center: 0.5, right: 1 };
    const dx = (pos[align] - pos[old]) * w;
    const a = rad(el.rotation);
    el.x = Math.round((el.x + dx * Math.cos(a)) * 10) / 10;
    el.y = Math.round((el.y + dx * Math.sin(a)) * 10) / 10;
    el.align = align;
  }

  /* ------------------------------------------------------------------
   * UI 生成
   * ------------------------------------------------------------------ */
  const binds = [];
  const blocks = {};
  let uid = 0;

  function h(tag, attrs, ...children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else if (k === 'text') e.textContent = v;
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }

  function changed() { requestRender(); }

  function rangeField(label, path, min, max, step, unit) {
    const id = 'f' + (++uid);
    const range = h('input', { type: 'range', min, max, step, id });
    const num = h('input', { type: 'number', min, max, step, 'aria-label': label });
    const apply = (v, from) => {
      v = parseFloat(v);
      if (!isFinite(v)) return;
      setPath(path, v);
      if (from !== range) range.value = v;
      if (from !== num) num.value = v;
      changed();
    };
    range.addEventListener('input', () => apply(range.value, range));
    num.addEventListener('input', () => apply(num.value, num));
    binds.push(() => {
      const v = getPath(path);
      if (document.activeElement !== num) num.value = Math.round(v * 100) / 100;
      if (document.activeElement !== range) range.value = v;
    });
    return h('div', { class: 'row' },
      h('label', { for: id, text: label }),
      h('div', { class: 'range-line' }, range, num, h('span', { class: 'unit', text: unit || '' })));
  }

  function textField(label, path, opts = {}) {
    const id = 'f' + (++uid);
    const input = opts.multiline
      ? h('textarea', { id, rows: opts.rows || 3, spellcheck: 'false' })
      : h('input', { type: 'text', id, spellcheck: 'false' });
    input.addEventListener('input', () => { setPath(path, input.value); changed(); if (opts.onInput) opts.onInput(); });
    binds.push(() => { if (document.activeElement !== input) input.value = getPath(path); });
    return h('div', { class: 'row' }, h('label', { for: id, text: label }), input,
      opts.note ? h('div', { class: 'note', text: opts.note }) : null);
  }

  function colorField(label, path) {
    const id = 'f' + (++uid);
    const input = h('input', { type: 'color', id });
    input.addEventListener('input', () => { setPath(path, input.value); changed(); });
    binds.push(() => { input.value = getPath(path); });
    return h('div', { class: 'row inline' }, h('label', { for: id, text: label }), input);
  }

  function checkField(label, path, onChange) {
    const id = 'f' + (++uid);
    const input = h('input', { type: 'checkbox', id });
    input.addEventListener('change', () => { setPath(path, input.checked); changed(); if (onChange) onChange(); });
    binds.push(() => { input.checked = !!getPath(path); });
    return h('div', { class: 'row check' }, input, h('label', { for: id, text: label }));
  }

  function selectField(label, path, options, onChange) {
    const id = 'f' + (++uid);
    const sel = h('select', { id });
    const fill = (opts) => {
      sel.innerHTML = '';
      for (const [v, t] of opts) sel.appendChild(h('option', { value: v, text: t }));
    };
    fill(typeof options === 'function' ? options() : options);
    sel.addEventListener('change', () => {
      const v = sel.value;
      const num = typeof getPath(path) === 'number' ? parseFloat(v) : v;
      if (onChange) onChange(num); else setPath(path, num);
      changed(); syncUI();
    });
    binds.push(() => {
      if (typeof options === 'function') fill(options());
      sel.value = String(getPath(path));
    });
    return h('div', { class: 'row' }, h('label', { for: id, text: label }), sel);
  }

  function alignField(id) {
    const opts = [['left', '左揃え'], ['center', '中央'], ['right', '右揃え']];
    const btns = opts.map(([v, t]) => h('button', {
      type: 'button', 'aria-pressed': 'false', text: t,
      onclick: () => { setAlign(id, v); changed(); syncUI(); }
    }));
    binds.push(() => btns.forEach((b, i) => b.setAttribute('aria-pressed', String(state[id].align === opts[i][0]))));
    return h('div', { class: 'row' }, h('span', { class: 'label', text: '揃え（基準点の位置）' }), h('div', { class: 'seg', role: 'group' }, btns));
  }

  function fontField(id) {
    const fontSel = selectField('フォント', [id, 'font'], FONTS.map((f) => [f.family, f.label]), (v) => {
      state[id].font = v;
      const f = FONTS.find((x) => x.family === v);
      if (f && !f.weights.includes(state[id].weight)) {
        state[id].weight = f.weights.reduce((a, b) => (Math.abs(b - state[id].weight) < Math.abs(a - state[id].weight) ? b : a));
      }
    });
    const weightSel = selectField('太さ', [id, 'weight'], () => {
      const f = FONTS.find((x) => x.family === state[id].font) || FONTS[0];
      return f.weights.map((w) => [String(w), { 400: '標準 (400)', 500: 'ミディアム (500)', 600: 'セミボールド (600)', 700: 'ボールド (700)', 800: 'エクストラボールド (800)', 900: 'ブラック (900)' }[w] || String(w)]);
    });
    return h('div', { class: 'grid2' }, fontSel, weightSel);
  }

  function fileButton(label, accept, onFile) {
    const input = h('input', { type: 'file', accept });
    input.addEventListener('change', () => {
      const f = input.files && input.files[0];
      if (f) onFile(f);
      input.value = '';
    });
    const btn = h('button', { type: 'button', class: 'btn', text: label, onclick: () => input.click() });
    return [btn, input];
  }

  function adv(title, children, open) {
    return h('details', { class: 'adv', open: !!open }, h('summary', { text: title }), h('div', { class: 'adv-body' }, children));
  }

  function textStyleControls(id) {
    const def = EL[id];
    const p = (k) => [id, k];
    return [
      adv('詳細設定：位置・サイズ', [
        alignField(id),
        h('div', { class: 'grid2' },
          rangeField('X', p('x'), -300, 1324, 1),
          rangeField('Y', p('y'), -300, 1324, 1)),
        rangeField('文字サイズ', p('size'), 8, 200, 1, 'px'),
        h('div', { class: 'grid2' },
          rangeField('回転', p('rotation'), -180, 180, 0.5, '°'),
          rangeField('斜体（傾き）', p('skew'), -30, 30, 0.5, '°')),
        rangeField('字間', p('letterSpacing'), -20, 40, 0.5, 'px'),
        def.multiline ? rangeField('行間', p('lineHeight'), 0.5, 3, 0.02, '倍') : null,
        def.multiline ? rangeField('2行目以降の横ずらし（1行ごと）', p('lineShift'), -400, 400, 1, 'px') : null,
        def.multiline ? rangeField('自動折り返し幅（0で折り返さない）', p('wrap'), 0, 1024, 1, 'px') : null
      ]),
      adv('詳細設定：フォント・色・縁取り', [
        fontField(id),
        selectField('塗り', p('fillMode'), [['solid', '単色'], ['gradient', 'グラデーション（上→下）']]),
        h('div', { class: 'grid2' }, colorField('色1（上）', p('color')), colorField('色2（下）', p('color2'))),
        h('div', { class: 'grid2' }, rangeField('内側の縁 太さ', p('s1Width'), 0, 20, 0.5), colorField('内側の縁 色', p('s1Color'))),
        h('div', { class: 'grid2' }, rangeField('外側の縁 太さ', p('s2Width'), 0, 20, 0.5), colorField('外側の縁 色', p('s2Color'))),
        h('div', { class: 'grid2' }, colorField('影・光彩の色', p('shadowColor')), rangeField('濃さ', p('shadowOpacity'), 0, 1, 0.05)),
        rangeField('ぼかし', p('shadowBlur'), 0, 40, 1, 'px'),
        h('div', { class: 'grid2' }, rangeField('影のずれ X', p('shadowX'), -20, 20, 1), rangeField('影のずれ Y', p('shadowY'), -20, 20, 1))
      ]),
      def.heading ? adv('詳細設定：金色ライン', [
        checkField('ラインを表示', p('lineVisible')),
        rangeField('長さ', p('lineLength'), 0, 1024, 1, 'px'),
        h('div', { class: 'grid2' },
          rangeField('文字との間隔', p('lineOffset'), -40, 80, 1),
          rangeField('太さ', p('lineWidth'), 0.5, 10, 0.5)),
        colorField('色', p('lineColor'))
      ]) : null,
      h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn small', text: 'この要素の位置・装飾を初期化', onclick: () => { resetElement(id); changed(); syncUI(); } }))
    ];
  }

  function block(id, legend, children) {
    const fs = h('fieldset', { class: 'el-block', 'data-el': id }, h('legend', { text: legend }), children);
    fs.addEventListener('focusin', () => selectEl(id, { fromUI: true }));
    fs.addEventListener('pointerdown', () => selectEl(id, { fromUI: true }));
    blocks[id] = fs;
    return fs;
  }

  function section(title, children, open) {
    return h('details', { class: 'section', open: !!open }, h('summary', { text: title }), h('div', { class: 'section-body' }, children));
  }

  /* ---- 個別パネル ---- */
  const status = {};  // 表示を差し替えるための要素

  function buildPanels() {
    const panels = document.getElementById('panels');

    // キャラ画像
    const [charBtn, charInput] = fileButton('画像を選ぶ', 'image/*', loadCharFile);
    status.charName = h('span', { class: 'file-name', text: '未選択' });
    panels.appendChild(section('キャラ画像', [
      block('char', 'キャラ画像', [
        h('div', { class: 'btn-row' }, charBtn, charInput,
          h('button', { type: 'button', class: 'btn small ghost', text: '画像を外す', onclick: () => { assets.char = null; assets.charName = ''; updateStatus(); changed(); } })),
        status.charName,
        h('div', { class: 'note', text: '背景が透過されたPNGがおすすめです。白背景の画像は下の「乗算」をオンにすると馴染みやすくなります。プレビューへのドラッグ＆ドロップでも読み込めます。' }),
        h('div', { class: 'grid2' },
          rangeField('X（中心）', ['char', 'x'], -500, 1524, 1),
          rangeField('Y（中心）', ['char', 'y'], -500, 1524, 1)),
        rangeField('拡大率', ['char', 'scale'], 0.05, 5, 0.01, '倍'),
        rangeField('回転', ['char', 'rotation'], -180, 180, 0.5, '°'),
        checkField('左右反転', ['char', 'flip']),
        checkField('乗算で合成（白背景の画像を馴染ませる）', ['char', 'multiply']),
        h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn small', text: '位置と大きさを初期化', onclick: () => { resetElement('char'); changed(); syncUI(); } }))
      ])
    ], true));

    // クラス
    const [iconBtn, iconInput] = fileButton('アイコン画像を選ぶ', 'image/*', loadIconFile);
        status.iconName = h('span', { class: 'file-name' });
    panels.appendChild(section('クラス', [
      block('classHead', '見出し', [
        checkField('見出しを表示', ['classHead', 'visible']),
        textField('見出しの文字', ['classHead', 'text']),
        ...textStyleControls('classHead')
      ]),
      block('className', 'クラス名', [
        checkField('クラス名を表示', ['className', 'visible']),
        textField('クラス名（自由入力）', ['className', 'text']),
        ...textStyleControls('className')
      ]),
      block('classIcon', 'クラスアイコン', [
        checkField('アイコンを表示', ['classIcon', 'visible']),
        h('div', { class: 'btn-row' }, iconBtn, iconInput,
          h('button', { type: 'button', class: 'btn small ghost', text: 'アイコンを外す', onclick: () => { assets.iconUpload = null; assets.iconUploadName = ''; updateStatus(); changed(); } })),
        status.iconName,
        h('div', { class: 'note', text: 'クラスアイコンはご自身で用意した画像をアップロードしてください（正方形の透過PNG・168×168px 程度を推奨。正方形でない場合は中央を切り抜きます）。画像は端末内でのみ処理されます。' }),
        adv('詳細設定：位置・サイズ', [
          h('div', { class: 'grid2' },
            rangeField('X（中心）', ['classIcon', 'x'], -100, 1124, 1),
            rangeField('Y（中心）', ['classIcon', 'y'], -100, 1124, 1)),
          rangeField('大きさ', ['classIcon', 'size'], 16, 400, 1, 'px'),
          rangeField('回転', ['classIcon', 'rotation'], -180, 180, 0.5, '°'),
          h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn small', text: '位置と大きさを初期化', onclick: () => { resetElement('classIcon'); changed(); syncUI(); } }))
        ])
      ])
    ], true));

    // プロフィール
    panels.appendChild(section('プロフィール', [
      block('profHead', '見出し', [
        checkField('見出しを表示', ['profHead', 'visible']),
        textField('見出しの文字', ['profHead', 'text']),
        ...textStyleControls('profHead')
      ]),
      block('profBody', '本文', [
        checkField('本文を表示', ['profBody', 'visible']),
        textField('プロフィール本文', ['profBody', 'text'], { multiline: true, rows: 6 }),
        ...textStyleControls('profBody')
      ])
    ], true));

    // キャッチコピー・名前
    panels.appendChild(section('キャッチコピー・名前', [
      block('catch', 'キャッチコピー（赤）', [
        checkField('キャッチコピーを表示', ['catch', 'visible']),
        textField('キャッチコピー（改行で複数行）', ['catch', 'text'], { multiline: true, rows: 2 }),
        ...textStyleControls('catch')
      ]),
      block('name', 'キャラ名（青）', [
        checkField('キャラ名を表示', ['name', 'visible']),
        textField('キャラ名', ['name', 'text'], { multiline: true, rows: 1 }),
        ...textStyleControls('name')
      ])
    ], true));

    // レアリティ
    const r = (k) => ['rarity', k];
    panels.appendChild(section('レアリティ', [
      block('rarity', 'レアリティ', [
        selectField('レアリティ', r('level'), [['none', '表示しない'], ['C', 'C（★1）'], ['UC', 'UC（★2）'], ['R', 'R（★3）'], ['SR', 'SR（★4）'], ['SSR', 'SSR（★5）']], (v) => {
          state.rarity.level = v;
          if (RARITY_PRESETS[v]) Object.assign(state.rarity, RARITY_PRESETS[v]);
        }),
        h('div', { class: 'grid2' }, checkField('文字を表示', r('showLabel')), checkField('星を表示', r('showStars'))),
        adv('詳細設定：位置・サイズ', [
          alignField('rarity'),
          h('div', { class: 'grid2' },
            rangeField('X', r('x'), -300, 1324, 1),
            rangeField('Y', r('y'), -300, 1324, 1)),
          rangeField('文字サイズ', r('size'), 10, 200, 1, 'px'),
          h('div', { class: 'grid2' },
            rangeField('回転', r('rotation'), -180, 180, 0.5, '°'),
            rangeField('斜体（傾き）', r('skew'), -30, 30, 0.5, '°')),
          rangeField('字間', r('letterSpacing'), -20, 40, 0.5, 'px'),
          h('div', { class: 'grid2' },
            rangeField('星の大きさ', r('starScale'), 0.2, 2, 0.01, '倍'),
            rangeField('星の間隔', r('starGap'), -30, 60, 1, 'px')),
          h('div', { class: 'grid2' },
            rangeField('星の上下位置', r('starY'), -100, 100, 1, 'px'),
            rangeField('星ごとの上がり幅', r('starRise'), -20, 20, 0.5, 'px'))
        ]),
        adv('詳細設定：フォント・色', [
          fontField('rarity'),
          h('div', { class: 'grid2' }, colorField('文字色（上）', r('labelTop')), colorField('文字色（下）', r('labelBottom'))),
          h('div', { class: 'grid2' }, colorField('縁（上）', r('borderTop')), colorField('縁（下）', r('borderBottom'))),
          h('div', { class: 'grid2' }, colorField('外側の縁', r('outer')), colorField('光彩', r('glow'))),
          h('div', { class: 'grid2' }, colorField('星の色', r('starFill')), colorField('星の縁', r('starStroke'))),
          h('div', { class: 'note', text: 'レアリティを選び直すと、色はそのレアリティの標準色に戻ります。' })
        ]),
        h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn small', text: 'この要素の位置・装飾を初期化', onclick: () => { resetElement('rarity'); changed(); syncUI(); } }))
      ])
    ], true));

    // 背景・魔法陣
    const [magicBtn, magicInput] = fileButton('別の魔法陣画像を使う', 'image/*', loadMagicFile);
    status.magicName = h('span', { class: 'file-name' });
    panels.appendChild(section('背景・魔法陣', [
      block('magic', '背景・魔法陣', [
        colorField('背景色', ['bg', 'color']),
        checkField('魔法陣を表示', ['magic', 'visible']),
        selectField('色の付け方', ['magic', 'mode'], [
          ['bright', '単色に塗る（明るい線だけを抽出）'],
          ['alpha', '単色に塗る（透明度・濃淡をそのまま線にする）'],
          ['original', '元画像の色のまま']
        ]),
        h('div', { class: 'note', text: '画像を読み込むと自動で選びます。線が白っぽく光る魔法陣は「明るい線を抽出」、黒線など線だけの画像は「透明度・濃淡」がおすすめです。' }),
        h('div', { class: 'grid2' },
          colorField('魔法陣の色', ['magic', 'color']),
          rangeField('濃さ', ['magic', 'opacity'], 0, 1, 0.01)),
        rangeField('大きさ', ['magic', 'scale'], 0.1, 3, 0.01, '倍'),
        rangeField('回転', ['magic', 'rotation'], -180, 180, 0.5, '°'),
        h('div', { class: 'grid2' },
          rangeField('X（中心）', ['magic', 'x'], -300, 1324, 1),
          rangeField('Y（中心）', ['magic', 'y'], -300, 1324, 1)),
        h('div', { class: 'note', text: 'この項目を選択している間は、プレビューの何もない所をドラッグして魔法陣を動かせます。' }),
        h('div', { class: 'btn-row' }, magicBtn, magicInput,
          h('button', { type: 'button', class: 'btn small ghost', text: '標準の魔法陣に戻す', onclick: () => { assets.magicCustom = null; assets.magicCustomName = ''; if (assets.magicDefault) state.magic.mode = assets.magicDefault.mode; updateStatus(); changed(); } }),
          h('button', { type: 'button', class: 'btn small', text: '位置・色を初期化', onclick: () => { resetElement('magic'); state.bg = clone(DEFAULTS.bg); changed(); syncUI(); } })),
        status.magicName
      ])
    ], false));
  }

  function updateStatus() {
    if (status.charName) status.charName.textContent = assets.char ? `読み込み済み：${assets.charName}` : '未選択';
    if (status.iconName) status.iconName.textContent = assets.iconUpload ? `アップロード済み：${assets.iconUploadName}` : '';
    if (status.magicName) status.magicName.textContent = assets.magicCustom ? `使用中：${assets.magicCustomName}` : '';
    syncUI();
  }

  function syncUI() { for (const b of binds) b(); }

  /* ------------------------------------------------------------------
   * ファイル読み込み
   * ------------------------------------------------------------------ */
  async function loadCharFile(file) {
    if (!file || !/^image\//.test(file.type || 'image/')) return;
    try {
      const img = await fileToImage(file);
      assets.char = toCanvas(img, 2048);
      assets.charName = file.name || '画像';
      Object.assign(state.char, { x: DEFAULTS.char.x, y: DEFAULTS.char.y, scale: 1, rotation: 0 });
      selectEl('char');
      updateStatus();
      changed();
    } catch (e) {
      alert('画像を読み込めませんでした。PNG / JPEG / WebP などの画像を選んでください。');
    }
  }

  async function loadIconFile(file) {
    try {
      const img = await fileToImage(file);
      assets.iconUpload = toSquareCanvas(img, 512);
      assets.iconUploadName = file.name || '画像';
      state.classIcon.visible = true;
      selectEl('classIcon');
      updateStatus();
      changed();
    } catch (e) {
      alert('画像を読み込めませんでした。');
    }
  }

  async function loadMagicFile(file) {
    try {
      const img = await fileToImage(file);
      assets.magicCustom = makeMagicSource(toCanvas(img, 1400));
      assets.magicCustomName = file.name || '画像';
      state.magic.mode = assets.magicCustom.mode;
      state.magic.visible = true;
      updateStatus();
      changed();
    } catch (e) {
      alert('画像を読み込めませんでした。');
    }
  }

  function loadBundledAssets() {
    // まず自動生成の簡易魔法陣を入れておき、assets/magic-circle.png があれば差し替える
    assets.magicDefault = makeMagicSource(generateMagicCircle(), 'alpha');
    if (CFG.magicCircle) {
      loadImage(CFG.magicCircle).then((img) => {
        const src = makeMagicSource(toCanvas(img, 1400), CFG.magicCircleMode);
        assets.magicDefault = src;
        if (!assets.magicCustom) state.magic.mode = src.mode;
        updateStatus(); changed();
      }, () => { /* 素材が無ければ自動生成の魔法陣のまま */ });
    }
  }

  /* ------------------------------------------------------------------
   * 選択とキャンバス操作
   * ------------------------------------------------------------------ */
  const selLabel = document.getElementById('selLabel');
  const deselectBtn = document.getElementById('deselectBtn');

  function selectEl(id, opts = {}) {
    if (selected === id) return;
    selected = id;
    for (const [k, b] of Object.entries(blocks)) b.classList.toggle('active', k === id);
    if (id) {
      selLabel.innerHTML = '';
      selLabel.append('選択中：', h('b', { text: EL[id].label }));
    } else {
      selLabel.textContent = '要素をタップすると選択できます';
    }
    deselectBtn.hidden = !id;
    canvas.classList.toggle('can-drag', !!id);
    if (id && !opts.fromUI && blocks[id]) {
      const sec = blocks[id].closest('details.section');
      if (sec && !sec.open) sec.open = true;
    }
    requestRender();
  }

  function revealBlock(id) {
    const b = blocks[id];
    if (!b) return;
    const sec = b.closest('details.section');
    if (sec) sec.open = true;
    const r = b.getBoundingClientRect();
    const pane = document.querySelector('.preview-pane');
    const topLimit = window.matchMedia('(max-width: 860px)').matches ? pane.getBoundingClientRect().bottom : 0;
    if (r.top < topLimit || r.top > window.innerHeight - 60) {
      window.scrollBy({ top: r.top - topLimit - 12, behavior: 'smooth' });
    }
  }

  function toStage(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) * SIZE) / rect.width, y: ((e.clientY - rect.top) * SIZE) / rect.height };
  }

  function hitTest(pt) {
    for (const id of HIT_ORDER) {
      const r = regions[id];
      if (!r) continue;
      const q = r.m.inverse().transformPoint(new DOMPoint(pt.x, pt.y));
      const slop = 6;
      if (q.x >= r.x - slop && q.x <= r.x + r.w + slop && q.y >= r.y - slop && q.y <= r.y + r.h + slop) return id;
    }
    return null;
  }

  const pointers = new Map();
  let gesture = null;
  let selectionChangedByPointer = false;

  function clampSize(id, v) {
    const [lo, hi] = SIZE_LIMITS[EL[id].sizeKey];
    return Math.min(hi, Math.max(lo, v));
  }

  function startGesture() {
    const id = selected;
    if (!id) { gesture = null; return; }
    const el = state[id];
    const pts = [...pointers.values()];
    if (pts.length === 1) {
      gesture = { id, kind: 'drag', start: pts[0], x0: el.x, y0: el.y };
    } else if (pts.length >= 2) {
      const [a, b] = pts;
      gesture = {
        id, kind: 'pinch',
        mid0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        dist0: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        ang0: Math.atan2(b.y - a.y, b.x - a.x),
        x0: el.x, y0: el.y, size0: el[EL[id].sizeKey], rot0: el.rotation
      };
    }
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0 && e.pointerType === 'mouse') return;
    canvas.focus({ preventScroll: true });
    const pt = toStage(e);
    pointers.set(e.pointerId, pt);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    if (pointers.size === 1) {
      const hit = hitTest(pt);
      const prev = selected;
      if (hit) selectEl(hit);
      else if (selected !== 'magic' && selected !== 'char') selectEl(null);
      selectionChangedByPointer = selected !== prev;
    }
    startGesture();
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, toStage(e));
    if (!gesture) return;
    const el = state[gesture.id];
    const pts = [...pointers.values()];
    if (gesture.kind === 'drag' && pts.length === 1) {
      el.x = Math.round(gesture.x0 + pts[0].x - gesture.start.x);
      el.y = Math.round(gesture.y0 + pts[0].y - gesture.start.y);
    } else if (gesture.kind === 'pinch' && pts.length >= 2) {
      const [a, b] = pts;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const key = EL[gesture.id].sizeKey;
      const v = clampSize(gesture.id, gesture.size0 * (dist / gesture.dist0));
      el[key] = key === 'scale' ? Math.round(v * 1000) / 1000 : Math.round(v * 10) / 10;
      let rot = gesture.rot0 + ((ang - gesture.ang0) * 180) / Math.PI;
      rot = ((rot + 540) % 360) - 180;
      el.rotation = Math.round(rot * 10) / 10;
      el.x = Math.round(gesture.x0 + mid.x - gesture.mid0.x);
      el.y = Math.round(gesture.y0 + mid.y - gesture.mid0.y);
    }
    requestRender();
    scheduleSync();
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 0) {
      gesture = null;
      if (selectionChangedByPointer && selected) revealBlock(selected);
      selectionChangedByPointer = false;
      syncUI();
    } else {
      startGesture();
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener('wheel', (e) => {
    if (!selected) return;
    e.preventDefault();
    const el = state[selected];
    const delta = e.deltaY || e.deltaX;
    if (e.shiftKey || e.altKey) {
      let rot = el.rotation + (delta > 0 ? 1 : -1);
      rot = ((rot + 540) % 360) - 180;
      el.rotation = rot;
    } else {
      const key = EL[selected].sizeKey;
      const v = clampSize(selected, el[key] * Math.exp(-delta * 0.0015));
      el[key] = key === 'scale' ? Math.round(v * 1000) / 1000 : Math.round(v * 10) / 10;
    }
    requestRender();
    scheduleSync();
  }, { passive: false });

  canvas.addEventListener('keydown', (e) => {
    if (!selected) return;
    const step = e.shiftKey ? 10 : 1;
    const el = state[selected];
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      el.x += moves[e.key][0];
      el.y += moves[e.key][1];
      e.preventDefault();
      requestRender(); scheduleSync();
    } else if (e.key === 'Escape') {
      selectEl(null);
    }
  });

  let syncQueued = false;
  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    setTimeout(() => { syncQueued = false; syncUI(); }, 60);
  }

  deselectBtn.addEventListener('click', () => selectEl(null));

  // ドラッグ＆ドロップでキャラ画像
  const wrap = document.getElementById('canvasWrap');
  ['dragenter', 'dragover'].forEach((t) => wrap.addEventListener(t, (e) => {
    if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); wrap.classList.add('dragover'); }
  }));
  ['dragleave', 'drop'].forEach((t) => wrap.addEventListener(t, () => wrap.classList.remove('dragover')));
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadCharFile(f);
  });

  // 表示サイズが変わったら選択枠の線幅を合わせる
  window.addEventListener('resize', requestRender);

  /* ------------------------------------------------------------------
   * 書き出し
   * ------------------------------------------------------------------ */
  const exportBtn = document.getElementById('exportBtn');
  const modal = document.getElementById('exportModal');
  const exportImg = document.getElementById('exportImg');
  const downloadLink = document.getElementById('downloadLink');
  let lastUrl = null;

  function safeFileName(s, ext) {
    const base = String(s || '').replace(/\s+/g, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').slice(0, 40);
    return (base || 'character') + '_紹介.' + ext;
  }

  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    const label = exportBtn.textContent;
    exportBtn.textContent = '作成中…';
    try {
      await waitFonts();
      const out = document.createElement('canvas');
      out.width = out.height = SIZE;
      drawScene(out.getContext('2d'), false);
      const format = document.getElementById('exportFormat')?.value || 'png';
      const mime = format === 'webp' ? 'image/webp' : 'image/png';
      const blob = await new Promise((res) => out.toBlob(res, mime, format === 'webp' ? 0.8 : undefined));
      if (!blob) throw new Error('toBlob failed');
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = URL.createObjectURL(blob);
      exportImg.src = lastUrl;
      downloadLink.href = lastUrl;
      downloadLink.download = safeFileName(state.name.text.split('\n')[0], format === 'webp' ? 'webp' : 'png');
      modal.hidden = false;
      downloadLink.focus();
    } catch (err) {
      console.error(err);
      alert('画像の書き出しに失敗しました。ページを「ローカルファイルとして直接開いている」場合は、GitHub Pages などのWebサーバー経由で開いてください。');
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = label;
      requestRender();
    }
  });

  const closeModal = () => { modal.hidden = true; exportBtn.focus(); };
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  document.getElementById('resetLayoutBtn').addEventListener('click', () => {
    if (!confirm('すべての要素の位置・大きさ・フォント・色を初期状態に戻します。\n（入力した文章と読み込んだ画像はそのまま残ります）')) return;
    for (const id of Object.keys(EL)) resetElement(id);
    state.bg = clone(DEFAULTS.bg);
    changed(); syncUI();
  });

  /* ------------------------------------------------------------------
   * 起動
   * ------------------------------------------------------------------ */
  buildPanels();
  loadBundledAssets();
  updateStatus();
  requestRender();

  // デバッグ・動作確認用（コンソールから state を参照できる）
  window.__fgoMaker = { state, assets, render: () => drawScene(ctx, true), selectEl };
})();
