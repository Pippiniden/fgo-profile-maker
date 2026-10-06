/*
 * FGO風ステータス画面メーカー
 * 画面は HTML/CSS で組み、PNG 書き出しは html-to-image で行います。
 * すべての処理はブラウザ内で完結します（画像をサーバーへ送信しません）。
 */
(() => {
  'use strict';

  const W = 1280, H = 720;
  const CARD_RECT = { x: 8, y: 6, w: 424, h: 708 };
  const STORE_KEY = 'fgoStatusMaker.v3';

  const stage = document.getElementById('statusStage');
  const wrap = document.getElementById('stageWrap');
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------
   * フォント（すべて Google Fonts / SIL Open Font License・Apache License）
   * 種類ごとにまとめて、選択欄でもグループ表示する
   * ------------------------------------------------------------------ */
  const FONT_GROUPS = [
    { group: 'ゴシック', fonts: [
      { family: 'Zen Kaku Gothic New', label: 'Zen角ゴシック New', weights: [400, 500, 700, 900] },
      { family: 'Noto Sans JP', label: 'Noto Sans JP', weights: [400, 500, 700, 900] },
      { family: 'M PLUS 1p', label: 'M PLUS 1p', weights: [500, 700, 800, 900] },
      { family: 'Sawarabi Gothic', label: 'さわらびゴシック', weights: [400] },
      { family: 'Dela Gothic One', label: 'デラゴシック（極太）', weights: [400] }
    ] },
    { group: '丸ゴシック', fonts: [
      { family: 'Zen Maru Gothic', label: 'Zen丸ゴシック', weights: [500, 700, 900] },
      { family: 'Kiwi Maru', label: 'キウイ丸', weights: [300, 400, 500] },
      { family: 'Kosugi Maru', label: '小杉丸ゴシック', weights: [400] },
      { family: 'RocknRoll One', label: 'RocknRoll One', weights: [400] }
    ] },
    { group: '明朝', fonts: [
      { family: 'Zen Old Mincho', label: 'Zen Old Mincho', weights: [400, 500, 600, 700, 900] },
      { family: 'Shippori Mincho B1', label: 'しっぽり明朝 B1', weights: [400, 500, 600, 700, 800] },
      { family: 'Noto Serif JP', label: 'Noto Serif JP', weights: [400, 500, 600, 700, 800, 900] },
      { family: 'Kaisei Tokumin', label: '解星 特ミン（太明朝）', weights: [400, 500, 700, 800] },
      { family: 'Sawarabi Mincho', label: 'さわらび明朝', weights: [400] },
      { family: 'Hina Mincho', label: 'ひな明朝', weights: [400] },
      { family: 'Zen Antique', label: 'Zen Antique（アンティーク明朝）', weights: [400] }
    ] },
    { group: '筆文字・デザイン', fonts: [
      { family: 'Yuji Syuku', label: '佑字 肅（筆文字）', weights: [400] },
      { family: 'Reggae One', label: 'Reggae One（ポップ）', weights: [400] }
    ] },
    { group: '英字・セリフ（日本語は標準フォント）', fonts: [
      { family: 'Cormorant Garamond', label: 'Cormorant Garamond', weights: [500, 600, 700] },
      { family: 'Cinzel', label: 'Cinzel（碑文風・大文字）', weights: [500, 600, 700, 800, 900] },
      { family: 'Marcellus', label: 'Marcellus', weights: [400] },
      { family: 'Lora', label: 'Lora', weights: [400, 500, 600, 700] },
      { family: 'Playfair Display', label: 'Playfair Display', weights: [400, 500, 600, 700, 800, 900] },
      { family: 'Libre Baskerville', label: 'Libre Baskerville', weights: [400, 700] }
    ] },
    { group: '英字・サンセリフ（日本語は標準フォント）', fonts: [
      { family: 'Roboto', label: 'Roboto', weights: [400, 500, 700, 900] },
      { family: 'Oswald', label: 'Oswald（縦長）', weights: [400, 500, 600, 700] }
    ] },
    { group: '英字・筆記体（日本語は標準フォント）', fonts: [
      { family: 'Allura', label: 'Allura', weights: [400] }
    ] }
  ];
  const FONTS = FONT_GROUPS.flatMap((g) => g.fonts);
  const FALLBACK_FONT = '"Hiragino Sans", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", sans-serif';
  const findFont = (fam) => FONTS.find((f) => f.family === fam) || FONTS[0];
  const nearestWeight = (f, w) => f.weights.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a));
  const WEIGHT_LABELS = { 300: '細め (300)', 400: '標準 (400)', 500: 'ミディアム (500)', 600: 'セミボールド (600)', 700: 'ボールド (700)', 800: 'エクストラボールド (800)', 900: 'ブラック (900)' };

  // フォントを指定する部位
  const FONT_PARTS = [
    ['name', '名前'],
    ['sub', 'クラス名（名前の下）'],
    ['heading', '見出し「プロフィール」'],
    ['tab', '枠の見出し'],
    ['detail', 'キャラクター詳細の本文'],
    ['param', 'パラメーターの項目名'],
    ['rank', 'ランク'],
    ['classEn', 'カードのクラス名（英字）'],
    ['classRuby', 'カードのクラス名の読み']
  ];
  const partLabel = (p) => (FONT_PARTS.find((x) => x[0] === p) || [p, p])[1];

  /* ------------------------------------------------------------------
   * 枠の色
   * ------------------------------------------------------------------ */
  const PALETTES = {
    gold:   { hi: '#fffbe6', light: '#fff1b0', mid: '#e0b24a', dark: '#7d4f0e', edge: '#3a2405' },
    silver: { hi: '#ffffff', light: '#f2f5f8', mid: '#b9c2cc', dark: '#58616c', edge: '#22282f' },
    bronze: { hi: '#fff1e2', light: '#f3c9a0', mid: '#c4824c', dark: '#5e3416', edge: '#2e1607' }
  };

  function hexToRgb(hex) {
    let h = String(hex || '#000').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(hex, toHex, t) {
    const a = hexToRgb(hex), b = hexToRgb(toHex);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  function paletteFrom(metal) {
    return { hi: mix(metal, '#ffffff', 0.85), light: mix(metal, '#ffffff', 0.6), mid: metal, dark: mix(metal, '#000000', 0.5), edge: mix(metal, '#000000', 0.78) };
  }

  /* ------------------------------------------------------------------
   * ランク
   * ------------------------------------------------------------------ */
  const RANKS = [
    ['EX', 'EX'], ['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E'], ['-', '－'], ['?', '？']
  ];
  const RANK_FILL = { EX: 5, A: 5, B: 4, C: 3, D: 2, E: 1, '-': 0, '?': 0 };
  const MODS = [['', 'なし'], ['+', '+'], ['++', '++'], ['+++', '+++'], ['-', '-']];

  /* ------------------------------------------------------------------
   * 初期値（サンプルはオリジナルキャラクター）
   * ------------------------------------------------------------------ */
  const ZK = 'Zen Kaku Gothic New';
  const DEFAULTS = {
    name: { text: 'アステリア', size: 58 },
    sub: { text: 'キャスター', size: 22 },
    heading: { text: 'プロフィール', size: 48 },
    fonts: {
      name: { font: ZK, weight: 900 },
      sub: { font: ZK, weight: 900 },
      heading: { font: ZK, weight: 900 },
      tab: { font: ZK, weight: 700 },
      detail: { font: ZK, weight: 700 },
      param: { font: ZK, weight: 700 },
      rank: { font: ZK, weight: 700 },
      classEn: { font: 'Cormorant Garamond', weight: 700 },
      classRuby: { font: ZK, weight: 700 }
    },
    detail: {
      tab: 'キャラクター詳細',
      text: '星の巡りを読み解く、辺境の天文魔術師。\n幼い頃に見た流星の行方を追い続け、\nやがて「星の書」と呼ばれる魔導書を手にした。\n穏やかで人当たりは良いが、\n夜空の話になると止まらなくなる一面も。\nその瞳には、まだ誰も知らない星図が映っている。',
      size: 26,
      lineHeight: 34
    },
    params: {
      tab: 'パラメーター',
      items: [
        { label: '筋力', rank: 'D', mod: '' },
        { label: '耐久', rank: 'C', mod: '' },
        { label: '敏捷', rank: 'B', mod: '' },
        { label: '魔力', rank: 'A', mod: '+' },
        { label: '幸運', rank: 'A', mod: '' },
        { label: '宝具', rank: 'EX', mod: '' }
      ]
    },
    card: {
      stars: 5,
      frame: 'auto',
      metal: '#e0b24a',
      band: '#173677',
      useCustomFrame: true,
      pedestal: false,
      classEn: 'Caster',
      classSize: 54,
      classSpacing: 0,
      classX: 0,
      classY: 0,
      classRuby: 'キャスター',
      rubySize: 15,
      rubySpacing: 0,
      rubyX: 0,
      rubyY: 0,
      iconX: 0,
      iconY: 0,
      iconScale: 1,
      artTop: '#f2f2f2',
      artBottom: '#b9bcc0'
    },
    frameImg: { scale: 1, sx: 1, sy: 1, x: 0, y: 0, hue: 0, saturate: 100, brightness: 100, contrast: 100, opacity: 1 },
    art: { x: 0, y: 0, scale: 1 },
    bg: {
      top: '#3a7cc0',
      mid: '#1c4f93',
      bottom: '#0e2457',
      magic: true,
      magicOpacity: 0.14,
      panelAlpha: 0.93
    },
    exportScale: 1
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));

  // 保存データを初期値に重ねる（項目が増減しても壊れないように）
  function merge(base, saved) {
    if (Array.isArray(base)) {
      if (!Array.isArray(saved)) return base;
      return base.map((b, i) => (i < saved.length ? merge(b, saved[i]) : b));
    }
    if (base && typeof base === 'object') {
      const out = {};
      for (const k of Object.keys(base)) out[k] = saved && k in saved ? merge(base[k], saved[k]) : base[k];
      return out;
    }
    return saved === undefined || saved === null || typeof saved !== typeof base ? base : saved;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return merge(clone(DEFAULTS), JSON.parse(raw));
    } catch (e) { /* 保存領域が使えない環境では初期値のまま */ }
    return clone(DEFAULTS);
  }
  let saveTimer = 0;
  function saveState() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* noop */ }
    }, 300);
  }

  const state = loadState();

  const assets = {
    art: null,      // { url, w, h, name }
    icon: null,     // { url, name }
    frame: null     // { url, w, h, name }
  };

  /* ------------------------------------------------------------------
   * フォント読み込み（プレビュー用）
   * 読み込みが終わったら文字幅が変わるので再描画する
   * ------------------------------------------------------------------ */
  const fontKnown = new Set();
  function fontCss(part, size = 40) {
    const f = state.fonts[part];
    return `${f.weight} ${size}px "${f.font}"`;
  }
  function ensureFont(part, text) {
    if (!document.fonts || !text) return;
    const key = fontCss(part) + '\u0000' + text;
    if (fontKnown.has(key)) return;
    fontKnown.add(key);
    document.fonts.load(fontCss(part), text).then(() => requestRender(), () => {});
  }
  function applyFont(el, part) {
    const f = state.fonts[part];
    el.style.fontFamily = `"${f.font}", ${FALLBACK_FONT}`;
    el.style.fontWeight = f.weight;
  }

  /* ------------------------------------------------------------------
   * 描画（DOM に反映）
   * ------------------------------------------------------------------ */
  function currentPalette() {
    let f = state.card.frame;
    if (f === 'custom') return paletteFrom(state.card.metal);
    if (f === 'auto') {
      const s = state.card.stars;
      f = s >= 4 || s === 0 ? 'gold' : s === 3 ? 'silver' : 'bronze';
    }
    return PALETTES[f] || PALETTES.gold;
  }
  const usingCustomFrame = () => !!(assets.frame && state.card.useCustomFrame);

  // はみ出す1行テキストは横方向に縮めて収める
  function fitWidth(el, maxW, origin) {
    el.style.transform = '';
    const w = el.offsetWidth;
    if (w > maxW) {
      el.style.transformOrigin = origin;
      el.style.transform = `scaleX(${(maxW / w).toFixed(4)})`;
    }
  }

  function setText(id, part, text) {
    const el = $(id);
    el.textContent = text;
    applyFont(el, part);
    ensureFont(part, text);
    return el;
  }

  function renderParams() {
    const grid = $('paramGrid');
    grid.innerHTML = '';
    for (const it of state.params.items) {
      const fill = RANK_FILL[it.rank] ?? 0;
      const bar = h('div', { class: 'st-bar' + (it.rank === 'EX' ? ' ex' : '') + (fill >= 1 ? ' l-on' : '') + (fill >= 5 ? ' r-on' : '') },
        h('div', { class: 'st-bar-segs' },
          [0, 1, 2, 3, 4].map((i) => h('div', { class: 'st-seg' + (i < fill ? ' on' : '') }))));
      const rankText = it.rank === '-' ? '－' : it.rank === '?' ? '？' : it.rank;
      const rank = h('div', { class: 'st-param-rank' }, rankText, it.mod ? h('small', { text: it.mod }) : null);
      const label = h('div', { class: 'st-param-label', text: it.label });
      applyFont(label, 'param');
      applyFont(rank, 'rank');
      ensureFont('param', it.label);
      ensureFont('rank', rankText + it.mod);
      grid.appendChild(h('div', { class: 'st-param' }, label, bar, rank));
    }
  }

  function artBox() {
    const art = $('art');
    return { w: art.offsetWidth || 406, h: art.offsetHeight || 584 };
  }

  function renderArt() {
    const img = $('artImg');
    const a = assets.art;
    $('artEmpty').hidden = !!a;
    img.hidden = !a;
    if (!a) return;
    const box = artBox();
    const base = Math.max(box.w / a.w, box.h / a.h);
    const w = a.w * base * state.art.scale;
    const hh = a.h * base * state.art.scale;
    const left = (box.w - w) / 2 + state.art.x;
    const top = (box.h - hh) / 2 + state.art.y;
    img.style.width = w + 'px';
    img.style.height = hh + 'px';
    img.style.transform = `translate(${left}px, ${top}px)`;
  }

  function renderFrameImg(custom) {
    const img = $('frameImg');
    img.hidden = !custom;
    if (!custom) return;
    if (img.getAttribute('src') !== assets.frame.url) img.src = assets.frame.url;
    const f = state.frameImg;
    const w = CARD_RECT.w * f.scale * f.sx;
    const hh = CARD_RECT.h * f.scale * f.sy;
    img.style.width = w + 'px';
    img.style.height = hh + 'px';
    img.style.transform = `translate(${(CARD_RECT.w - w) / 2 + f.x}px, ${(CARD_RECT.h - hh) / 2 + f.y}px)`;
    img.style.filter = `hue-rotate(${f.hue}deg) saturate(${f.saturate}%) brightness(${f.brightness}%) contrast(${f.contrast}%)`;
    img.style.opacity = f.opacity;
  }

  function render() {
    const s = state;
    const st = stage.style;

    st.setProperty('--bg-top', s.bg.top);
    st.setProperty('--bg-mid', s.bg.mid);
    st.setProperty('--bg-bottom', s.bg.bottom);
    st.setProperty('--art-top', s.card.artTop);
    st.setProperty('--art-bottom', s.card.artBottom);
    st.setProperty('--panel-alpha', s.bg.panelAlpha);
    const pal = currentPalette();
    for (const k of ['hi', 'light', 'mid', 'dark', 'edge']) st.setProperty('--frame-' + k, pal[k]);
    st.setProperty('--navy-light', mix(s.card.band, '#ffffff', 0.16));
    st.setProperty('--navy', s.card.band);
    st.setProperty('--navy-dark', mix(s.card.band, '#000000', 0.48));

    // 名前・クラス名・見出し
    const name = setText('nameText', 'name', s.name.text);
    name.parentElement.style.fontSize = s.name.size + 'px';
    const sub = setText('subText', 'sub', s.sub.text);
    sub.parentElement.style.fontSize = s.sub.size + 'px';
    const head = setText('headText', 'heading', s.heading.text);
    head.style.fontSize = s.heading.size + 'px';
    fitWidth(name, 800, '100% 50%');
    fitWidth(sub, 800, '100% 50%');

    // パネル
    setText('detailTab', 'tab', s.detail.tab);
    setText('paramTab', 'tab', s.params.tab);
    const dt = setText('detailText', 'detail', s.detail.text);
    dt.style.fontSize = s.detail.size + 'px';
    dt.style.lineHeight = s.detail.lineHeight + 'px';
    renderParams();

    // カード
    const card = $('card');
    const custom = usingCustomFrame();
    card.classList.toggle('custom', custom);
    card.classList.toggle('no-pedestal', !s.card.pedestal);
    renderFrameImg(custom);

    const stars = $('stars');
    stars.innerHTML = '';
    for (let i = 0; i < s.card.stars; i++) stars.appendChild(h('div', { class: 'st-star' }));

    const c = s.card;
    const en = setText('classEn', 'classEn', c.classEn);
    const enBox = en.parentElement;
    enBox.style.fontSize = c.classSize + 'px';
    enBox.style.letterSpacing = c.classSpacing + 'em';
    enBox.style.bottom = (108 - c.classY) + 'px';
    enBox.style.transform = `translateX(${c.classX}px)`;
    fitWidth(en, 396, '50% 100%');
    const ruby = setText('classRuby', 'classRuby', c.classRuby);
    const rubyBox = ruby.parentElement;
    rubyBox.style.fontSize = c.rubySize + 'px';
    rubyBox.style.letterSpacing = c.rubySpacing + 'em';
    rubyBox.style.bottom = (86 - c.rubyY) + 'px';
    rubyBox.style.transform = `translateX(${c.rubyX}px)`;
    fitWidth(ruby, 396, '50% 100%');

    const icon = $('icon');
    icon.style.transform = `translate(${c.iconX}px, ${c.iconY}px) scale(${c.iconScale})`;
    const iconImg = $('iconImg');
    iconImg.hidden = !assets.icon;
    if (assets.icon && iconImg.getAttribute('src') !== assets.icon.url) iconImg.src = assets.icon.url;
    icon.classList.toggle('has-img', !!assets.icon);

    renderArt();

    const magic = $('bgMagic');
    magic.hidden = !s.bg.magic;
    magic.style.opacity = s.bg.magicOpacity;

    checkOverflow();
  }

  let renderQueued = false;
  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; render(); });
  }
  function changed() { requestRender(); saveState(); }

  // 本文が枠からはみ出していないか
  const warnEls = [];
  function checkOverflow() {
    const box = $('detailText').parentElement;
    const over = $('detailText').scrollHeight > box.clientHeight - 20 + 2;
    for (const w of warnEls) w.hidden = !over;
  }

  // 表示サイズに合わせて縮小
  let viewScale = 1;
  function fitStage() {
    viewScale = wrap.clientWidth / W;
    stage.style.transform = `scale(${viewScale})`;
  }
  new ResizeObserver(fitStage).observe(wrap);

  /* ------------------------------------------------------------------
   * 編集パネル（既存ツールと同じ部品・クラス名を使用）
   * ------------------------------------------------------------------ */
  const binds = [];
  let uid = 0;
  const getPath = (path) => path.reduce((o, k) => o[k], state);
  const setPath = (path, v) => { path.slice(0, -1).reduce((o, k) => o[k], state)[path[path.length - 1]] = v; };
  function syncUI() { for (const b of binds) b(); }

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
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }

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
    input.addEventListener('input', () => { setPath(path, input.value); changed(); });
    binds.push(() => { if (document.activeElement !== input) input.value = getPath(path); });
    return h('div', { class: 'row' }, h('label', { for: id, text: label }), input,
      opts.note ? h('div', { class: 'note', text: opts.note }) : null,
      opts.warn || null);
  }

  function colorField(label, path) {
    const id = 'f' + (++uid);
    const input = h('input', { type: 'color', id });
    input.addEventListener('input', () => { setPath(path, input.value); changed(); });
    binds.push(() => { input.value = getPath(path); });
    return h('div', { class: 'row inline' }, h('label', { for: id, text: label }), input);
  }

  function checkField(label, path) {
    const id = 'f' + (++uid);
    const input = h('input', { type: 'checkbox', id });
    input.addEventListener('change', () => { setPath(path, input.checked); changed(); syncUI(); });
    binds.push(() => { input.checked = !!getPath(path); });
    return h('div', { class: 'row check' }, input, h('label', { for: id, text: label }));
  }

  function selectField(label, path, options, opts = {}) {
    const id = 'f' + (++uid);
    const sel = h('select', { id, 'aria-label': label });
    const fill = (list) => {
      sel.innerHTML = '';
      for (const [v, t] of list) sel.appendChild(h('option', { value: String(v), text: t }));
    };
    fill(typeof options === 'function' ? options() : options);
    sel.addEventListener('change', () => {
      const cur = getPath(path);
      const v = typeof cur === 'number' ? parseFloat(sel.value) : sel.value;
      if (opts.onChange) opts.onChange(v); else setPath(path, v);
      changed(); syncUI();
    });
    binds.push(() => {
      if (typeof options === 'function') fill(options());
      sel.value = String(getPath(path));
    });
    return h('div', { class: 'row' }, h('label', { for: id, text: label }), sel);
  }

  // 種類ごとにまとめたフォントの選択欄
  function fontSelectEl(attrs, placeholder) {
    return h('select', attrs,
      placeholder ? h('option', { value: '', text: placeholder }) : null,
      FONT_GROUPS.map((g) => h('optgroup', { label: g.group },
        g.fonts.map((f) => h('option', { value: f.family, text: f.label })))));
  }

  // フォント＋太さ（太さは選んだフォントにあるものだけ）
  function fontField(part, label) {
    const id = 'f' + (++uid);
    const sel = fontSelectEl({ id });
    sel.addEventListener('change', () => {
      const f = findFont(sel.value);
      state.fonts[part].font = f.family;
      state.fonts[part].weight = nearestWeight(f, state.fonts[part].weight);
      changed(); syncUI();
    });
    binds.push(() => { sel.value = state.fonts[part].font; });
    const weightSel = selectField('太さ', ['fonts', part, 'weight'],
      () => findFont(state.fonts[part].font).weights.map((w) => [w, WEIGHT_LABELS[w] || String(w)]));
    return h('div', { class: 'grid2' },
      h('div', { class: 'row' }, h('label', { for: id, text: label ? `${label}のフォント` : 'フォント' }), sel),
      weightSel);
  }

  function fileButton(label, onFile) {
    const input = h('input', { type: 'file', accept: 'image/*' });
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

  function block(legend, children) {
    return h('fieldset', { class: 'el-block' }, h('legend', { text: legend }), children);
  }

  function section(title, children, open) {
    return h('details', { class: 'section', open: !!open },
      h('summary', { text: title }), h('div', { class: 'section-body' }, children));
  }

  function resetButton(label, keys) {
    return h('div', { class: 'btn-row' }, h('button', {
      type: 'button', class: 'btn small', text: label,
      onclick: () => {
        for (const path of keys) {
          const def = path.reduce((o, k) => o[k], DEFAULTS);
          setPath(path, clone(def));
        }
        changed(); syncUI();
      }
    }));
  }

  const status = {};

  function buildPanels() {
    const panels = $('panels');

    /* ---- 名前・見出し ---- */
    panels.appendChild(section('名前・見出し', [
      block('キャラ名とクラス名', [
        textField('名前（右上の大きな文字）', ['name', 'text']),
        textField('クラス名（名前の下）', ['sub', 'text'], { note: '空欄にすると表示されません。' }),
        adv('詳細設定：フォント・文字サイズ', [
          fontField('name', '名前'),
          rangeField('名前の文字サイズ', ['name', 'size'], 28, 90, 1, 'px'),
          fontField('sub', 'クラス名'),
          rangeField('クラス名の文字サイズ', ['sub', 'size'], 12, 40, 1, 'px')
        ])
      ]),
      block('見出し', [
        textField('見出しの文字', ['heading', 'text']),
        adv('詳細設定：フォント・文字サイズ', [
          fontField('heading'),
          rangeField('文字サイズ', ['heading', 'size'], 24, 72, 1, 'px')
        ])
      ])
    ], true));

    /* ---- キャラクターカード ---- */
    const [artBtn, artInput] = fileButton('画像を選ぶ', loadArtFile);
    status.artName = h('span', { class: 'file-name' });
    const [iconBtn, iconInput] = fileButton('アイコン画像を選ぶ', loadIconFile);
    status.iconName = h('span', { class: 'file-name' });
    status.iconClear = h('button', {
      type: 'button', class: 'btn small ghost', text: '外す',
      onclick: () => { if (assets.icon) URL.revokeObjectURL(assets.icon.url); assets.icon = null; updateStatus(); requestRender(); }
    });
    const [frameBtn, frameInput] = fileButton('枠画像を選ぶ', loadFrameFile);
    status.frameName = h('span', { class: 'file-name' });
    status.frameClear = h('button', {
      type: 'button', class: 'btn small ghost', text: '外す',
      onclick: () => { if (assets.frame) URL.revokeObjectURL(assets.frame.url); assets.frame = null; updateStatus(); requestRender(); }
    });
    status.frameOpts = h('div', { class: 'adv-body' }, [
      checkField('自作の枠画像を使う（外すとCSSの枠に戻ります）', ['card', 'useCustomFrame']),
      checkField('アイコンの台座（菱形の枠）も表示する', ['card', 'pedestal']),
      rangeField('拡大率', ['frameImg', 'scale'], 0.5, 2, 0.01, '倍'),
      h('div', { class: 'grid2' },
        rangeField('横の比率', ['frameImg', 'sx'], 0.5, 2, 0.01, '倍'),
        rangeField('縦の比率', ['frameImg', 'sy'], 0.5, 2, 0.01, '倍')),
      h('div', { class: 'grid2' },
        rangeField('左右の位置', ['frameImg', 'x'], -200, 200, 1, 'px'),
        rangeField('上下の位置', ['frameImg', 'y'], -200, 200, 1, 'px')),
      rangeField('色相（色味を回す）', ['frameImg', 'hue'], -180, 180, 1, '°'),
      h('div', { class: 'grid2' },
        rangeField('彩度', ['frameImg', 'saturate'], 0, 300, 1, '%'),
        rangeField('明るさ', ['frameImg', 'brightness'], 20, 200, 1, '%')),
      h('div', { class: 'grid2' },
        rangeField('コントラスト', ['frameImg', 'contrast'], 20, 200, 1, '%'),
        rangeField('不透明度', ['frameImg', 'opacity'], 0, 1, 0.01, '')),
      resetButton('枠画像の調整を戻す', [['frameImg']])
    ]);
    const frameTemplateBtn = h('button', { type: 'button', class: 'btn small', text: '今のCSS枠を下絵用に保存', onclick: exportFrameTemplate });

    panels.appendChild(section('キャラクターカード', [
      block('キャラ画像', [
        h('div', { class: 'btn-row' }, artBtn, artInput, status.artName),
        h('div', { class: 'note', text: '縦長の全身イラストがおすすめです。プレビューのカード上でドラッグして位置を調整できます。' }),
        rangeField('拡大率', ['art', 'scale'], 0.3, 4, 0.01, '倍'),
        h('div', { class: 'grid2' },
          rangeField('左右の位置', ['art', 'x'], -600, 600, 1, 'px'),
          rangeField('上下の位置', ['art', 'y'], -800, 800, 1, 'px')),
        resetButton('位置と拡大率を戻す', [['art']]),
        adv('詳細設定：画像の後ろの背景色', [
          colorField('上側の色', ['card', 'artTop']),
          colorField('下側の色', ['card', 'artBottom'])
        ])
      ]),
      block('カードの枠（CSSで自動生成）', [
        h('div', { class: 'grid2' },
          selectField('星の数', ['card', 'stars'], [[5, '★5'], [4, '★4'], [3, '★3'], [2, '★2'], [1, '★1'], [0, 'なし']]),
          selectField('枠の色', ['card', 'frame'], [['auto', '星の数に合わせる'], ['gold', '金'], ['silver', '銀'], ['bronze', '銅'], ['custom', '好きな色']])),
        h('div', { class: 'grid2' },
          colorField('金属の色（好きな色のとき）', ['card', 'metal']),
          colorField('帯の色', ['card', 'band'])),
        h('div', { class: 'btn-row' }, frameTemplateBtn),
        h('div', { class: 'note', text: '今のCSS枠を、イラスト部分が透明なPNG（848×1416）で保存します。自作枠の下絵にどうぞ。' })
      ]),
      block('カードの枠（自作の画像）', [
        h('div', { class: 'btn-row' }, frameBtn, frameInput, status.frameClear, status.frameName),
        h('div', { class: 'note', text: 'カード（424×708、高画質なら848×1416）に合わせて、キャラ画像の上に重ねます。イラストを見せたい部分は透明にした PNG を使ってください。星・クラス名・アイコンは枠画像の上に表示されます。' }),
        status.frameOpts
      ]),
      block('クラス表記（カード下部）', [
        textField('クラス名（英字）', ['card', 'classEn']),
        textField('クラス名の読み', ['card', 'classRuby']),
        h('div', { class: 'row' }, h('span', { class: 'label', text: 'クラスアイコン' }),
          h('div', { class: 'btn-row' }, iconBtn, iconInput, status.iconClear, status.iconName),
          h('div', { class: 'note', text: '同梱していません。ご自身で用意した画像（透過PNG推奨）を使ってください。' })),
        adv('詳細設定：クラス名（英字）', [
          fontField('classEn'),
          rangeField('文字サイズ', ['card', 'classSize'], 20, 90, 1, 'px'),
          rangeField('文字の間隔', ['card', 'classSpacing'], -0.1, 0.5, 0.01, 'em'),
          h('div', { class: 'grid2' },
            rangeField('左右の位置', ['card', 'classX'], -200, 200, 1, 'px'),
            rangeField('上下の位置', ['card', 'classY'], -300, 120, 1, 'px')),
          resetButton('位置とサイズを戻す', [['card', 'classSize'], ['card', 'classSpacing'], ['card', 'classX'], ['card', 'classY']])
        ]),
        adv('詳細設定：クラス名の読み', [
          fontField('classRuby'),
          rangeField('文字サイズ', ['card', 'rubySize'], 8, 40, 1, 'px'),
          rangeField('文字の間隔', ['card', 'rubySpacing'], -0.1, 0.5, 0.01, 'em'),
          h('div', { class: 'grid2' },
            rangeField('左右の位置', ['card', 'rubyX'], -200, 200, 1, 'px'),
            rangeField('上下の位置', ['card', 'rubyY'], -300, 120, 1, 'px')),
          resetButton('位置とサイズを戻す', [['card', 'rubySize'], ['card', 'rubySpacing'], ['card', 'rubyX'], ['card', 'rubyY']])
        ]),
        adv('詳細設定：クラスアイコン', [
          rangeField('大きさ', ['card', 'iconScale'], 0.4, 2, 0.01, '倍'),
          h('div', { class: 'grid2' },
            rangeField('左右の位置', ['card', 'iconX'], -200, 200, 1, 'px'),
            rangeField('上下の位置', ['card', 'iconY'], -300, 60, 1, 'px')),
          resetButton('位置と大きさを戻す', [['card', 'iconScale'], ['card', 'iconX'], ['card', 'iconY']])
        ])
      ])
    ], true));

    /* ---- キャラクター詳細 ---- */
    const warn = h('div', { class: 'warn', text: '文章が枠からはみ出しています。行数を減らすか、文字サイズを小さくしてください。' });
    warn.hidden = true;
    warnEls.push(warn);
    panels.appendChild(section('キャラクター詳細', [
      block('本文', [
        textField('枠の見出し', ['detail', 'tab']),
        textField('本文', ['detail', 'text'], { multiline: true, rows: 7, note: '改行はそのまま反映されます。初期設定で6行まで入ります。', warn }),
        adv('詳細設定：フォント・文字サイズ・行間', [
          fontField('detail', '本文'),
          rangeField('文字サイズ', ['detail', 'size'], 16, 40, 1, 'px'),
          rangeField('行の間隔', ['detail', 'lineHeight'], 20, 60, 1, 'px'),
          fontField('tab', '枠の見出し（2か所共通）')
        ])
      ])
    ], true));

    /* ---- パラメーター ---- */
    const rows = state.params.items.map((_, i) => h('div', { class: 'param-row' },
      textField(`項目 ${i + 1}`, ['params', 'items', i, 'label']),
      selectField('ランク', ['params', 'items', i, 'rank'], RANKS),
      selectField('補正', ['params', 'items', i, 'mod'], MODS)));
    panels.appendChild(section('パラメーター', [
      block('ステータス', [
        textField('枠の見出し', ['params', 'tab']),
        h('div', { class: 'note', text: '左上から「左→右」の順に並びます。ゲージはランクに合わせて自動で伸びます（EXは金色）。' }),
        rows,
        adv('詳細設定：フォント', [
          fontField('param', '項目名'),
          fontField('rank', 'ランク')
        ])
      ])
    ], true));

    /* ---- フォント一括変更 ---- */
    const bulkSel = fontSelectEl({ 'aria-label': '一括変更するフォント' }, '選んでください');
    const bulkChecks = FONT_PARTS.map(([part, label]) => {
      const id = 'f' + (++uid);
      const input = h('input', { type: 'checkbox', id, value: part });
      input.checked = part !== 'classEn';
      return { part, input, el: h('div', { class: 'row check' }, input, h('label', { for: id, text: label })) };
    });
    const bulkMsg = h('div', { class: 'note', 'aria-live': 'polite' });
    const applyBtn = h('button', {
      type: 'button', class: 'btn primary', text: '適用',
      onclick: () => {
        if (!bulkSel.value) { bulkMsg.textContent = '先にフォントを選んでください。'; return; }
        const f = findFont(bulkSel.value);
        const targets = bulkChecks.filter((c) => c.input.checked).map((c) => c.part);
        for (const part of targets) {
          state.fonts[part].font = f.family;
          state.fonts[part].weight = nearestWeight(f, DEFAULTS.fonts[part].weight);
        }
        bulkMsg.textContent = targets.length
          ? `「${f.label}」を ${targets.map(partLabel).join('・')} に適用しました。`
          : '適用する場所にチェックを入れてください。';
        changed(); syncUI();
      }
    });
    panels.appendChild(section('フォントの一括変更', [
      h('div', { class: 'note', text: '選んだフォントを、チェックした場所にまとめて適用します。個別のフォントは各項目の「詳細設定」で変更できます。' }),
      block('一括変更', [
        h('div', { class: 'row' }, bulkSel),
        h('div', { class: 'grid2' }, bulkChecks.map((c) => c.el)),
        h('div', { class: 'btn-row' }, applyBtn),
        bulkMsg
      ])
    ], false));

    /* ---- 背景・書き出し ---- */
    panels.appendChild(section('背景・書き出し', [
      block('背景', [
        colorField('上側の色', ['bg', 'top']),
        colorField('中央の色', ['bg', 'mid']),
        colorField('下側の色', ['bg', 'bottom']),
        checkField('魔法陣をうっすら表示する', ['bg', 'magic']),
        rangeField('魔法陣の濃さ', ['bg', 'magicOpacity'], 0, 0.6, 0.01, ''),
        rangeField('枠の背景の濃さ', ['bg', 'panelAlpha'], 0.4, 1, 0.01, '')
      ]),
      block('書き出し', [
        selectField('出力サイズ', ['exportScale'], [[1, '1280×720（標準）'], [2, '2560×1440（高解像度）']])
      ])
    ], false));
  }

  function updateStatus() {
    status.artName.textContent = assets.art ? `読み込み済み：${assets.art.name}` : '未選択';
    status.iconName.textContent = assets.icon ? `使用中：${assets.icon.name}` : '';
    status.iconClear.hidden = !assets.icon;
    status.frameName.textContent = assets.frame ? `読み込み済み：${assets.frame.name}` : '未選択（CSSの枠を使用中）';
    status.frameClear.hidden = !assets.frame;
    status.frameOpts.hidden = !assets.frame;
    syncUI();
  }

  /* ------------------------------------------------------------------
   * 画像の読み込み
   * ------------------------------------------------------------------ */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('load failed'));
      img.src = src;
    });
  }

  // 大きすぎる画像は縮小してから使う（書き出しの負荷を下げるため）
  async function fileToUrl(file, max) {
    const src = URL.createObjectURL(file);
    const img = await loadImage(src);
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
    const k = Math.min(1, max / Math.max(w0, h0));
    if (k >= 1) return { url: src, w: w0, h: h0 };
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * k);
    c.height = Math.round(h0 * k);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(src);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    return { url: URL.createObjectURL(blob), w: c.width, h: c.height };
  }

  const isImage = (file) => file && /^image\//.test(file.type || 'image/');

  async function loadArtFile(file) {
    if (!isImage(file)) return;
    try {
      const r = await fileToUrl(file, 2400);
      if (assets.art) URL.revokeObjectURL(assets.art.url);
      assets.art = { ...r, name: file.name || '画像' };
      $('artImg').src = r.url;
      state.art = clone(DEFAULTS.art);
      updateStatus();
      changed();
    } catch (e) {
      alert('画像を読み込めませんでした。PNG / JPEG / WebP などの画像を選んでください。');
    }
  }

  async function loadIconFile(file) {
    if (!isImage(file)) return;
    try {
      const r = await fileToUrl(file, 512);
      if (assets.icon) URL.revokeObjectURL(assets.icon.url);
      assets.icon = { url: r.url, name: file.name || '画像' };
      updateStatus();
      changed();
    } catch (e) {
      alert('画像を読み込めませんでした。');
    }
  }

  async function loadFrameFile(file) {
    if (!isImage(file)) return;
    try {
      const r = await fileToUrl(file, 1800);
      if (assets.frame) URL.revokeObjectURL(assets.frame.url);
      assets.frame = { ...r, name: file.name || '画像' };
      state.card.useCustomFrame = true;
      updateStatus();
      changed();
    } catch (e) {
      alert('画像を読み込めませんでした。');
    }
  }

  /* ------------------------------------------------------------------
   * カード上の画像操作（ドラッグ・ホイール・ピンチ）
   * ------------------------------------------------------------------ */
  const art = $('art');
  const pointers = new Map();
  let gesture = null;

  // 指定した点（カード画像エリア内の座標）を中心に拡大縮小する
  function zoomAt(px, py, newScale) {
    const a = assets.art;
    if (!a) return;
    const box = artBox();
    newScale = Math.min(4, Math.max(0.3, newScale));
    const base = Math.max(box.w / a.w, box.h / a.h);
    const w = a.w * base * state.art.scale, hh = a.h * base * state.art.scale;
    const L = (box.w - w) / 2 + state.art.x, T = (box.h - hh) / 2 + state.art.y;
    const u = (px - L) / w, v = (py - T) / hh;
    const w2 = a.w * base * newScale, h2 = a.h * base * newScale;
    state.art.scale = Math.round(newScale * 1000) / 1000;
    state.art.x = Math.round(px - u * w2 - (box.w - w2) / 2);
    state.art.y = Math.round(py - v * h2 - (box.h - h2) / 2);
  }

  function localPoint(e) {
    const r = art.getBoundingClientRect();
    return { x: (e.clientX - r.left) / viewScale, y: (e.clientY - r.top) / viewScale };
  }

  function startGesture() {
    const pts = [...pointers.values()];
    if (pts.length === 1) {
      gesture = { type: 'drag', sx: pts[0].x, sy: pts[0].y, ox: state.art.x, oy: state.art.y };
    } else if (pts.length >= 2) {
      const [p, q] = pts;
      gesture = { type: 'pinch', d: Math.hypot(p.x - q.x, p.y - q.y) || 1, scale: state.art.scale, ox: state.art.x, oy: state.art.y, mx: (p.x + q.x) / 2, my: (p.y + q.y) / 2 };
    }
  }

  art.addEventListener('pointerdown', (e) => {
    if (!assets.art) return;
    art.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    art.classList.add('dragging');
    startGesture();
  });
  art.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId) || !gesture) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.values()];
    if (gesture.type === 'drag' && pts.length === 1) {
      state.art.x = Math.round(gesture.ox + (pts[0].x - gesture.sx) / viewScale);
      state.art.y = Math.round(gesture.oy + (pts[0].y - gesture.sy) / viewScale);
    } else if (gesture.type === 'pinch' && pts.length >= 2) {
      const [p, q] = pts;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      // 開始時の状態から計算し直す（誤差が溜まらないように）
      state.art.scale = gesture.scale; state.art.x = gesture.ox; state.art.y = gesture.oy;
      const r = art.getBoundingClientRect();
      zoomAt((gesture.mx - r.left) / viewScale, (gesture.my - r.top) / viewScale, gesture.scale * d / gesture.d);
      state.art.x += Math.round((mx - gesture.mx) / viewScale);
      state.art.y += Math.round((my - gesture.my) / viewScale);
    }
    renderArt();
    scheduleSync();
  });
  const endPointer = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size) startGesture();
    else { gesture = null; art.classList.remove('dragging'); changed(); syncUI(); }
  };
  art.addEventListener('pointerup', endPointer);
  art.addEventListener('pointercancel', endPointer);

  art.addEventListener('wheel', (e) => {
    if (!assets.art) return;
    e.preventDefault();
    const p = localPoint(e);
    zoomAt(p.x, p.y, state.art.scale * Math.exp(-e.deltaY * 0.0015));
    renderArt();
    scheduleSync();
    saveState();
  }, { passive: false });

  let syncQueued = false;
  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = true;
    setTimeout(() => { syncQueued = false; syncUI(); }, 60);
  }

  // ドラッグ＆ドロップでキャラ画像
  ['dragenter', 'dragover'].forEach((t) => wrap.addEventListener(t, (e) => {
    if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { e.preventDefault(); wrap.classList.add('dragover'); }
  }));
  ['dragleave', 'drop'].forEach((t) => wrap.addEventListener(t, () => wrap.classList.remove('dragover')));
  wrap.addEventListener('drop', (e) => {
    e.preventDefault();
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadArtFile(f);
  });

  /* ------------------------------------------------------------------
   * 書き出し用のフォント埋め込み
   * 画像化するときはページのフォントが使えないため、Google Fonts から
   * フォントを取り寄せて埋め込む。
   *   1. 使っている文字だけを含む軽いフォント（text= 指定）を取得
   *   2. だめなら通常のフォントを取得し、使っている文字の範囲だけ埋め込む
   * ------------------------------------------------------------------ */
  function blobToDataUrl(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }

  function familyParam(family, weights) {
    const name = family.replace(/ /g, '+');
    return weights.length === 1 && weights[0] === 400 ? name : `${name}:wght@${weights.join(';')}`;
  }

  async function fetchText(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.text();
  }

  async function inlineFontUrls(css) {
    const urls = [...new Set([...css.matchAll(/url\((["']?)(https:[^)"']+)\1\)/g)].map((m) => m[2]))];
    const data = await Promise.all(urls.map(async (u) => {
      const r = await fetch(u);
      if (!r.ok) throw new Error('font file ' + r.status);
      return blobToDataUrl(await r.blob());
    }));
    urls.forEach((u, i) => { css = css.split(u).join(data[i]); });
    return css;
  }

  // unicode-range に使っている文字が1つでも含まれる @font-face だけ残す
  function filterByUnicodeRange(css, codes) {
    const blocks = css.split('@font-face').slice(1).map((b) => '@font-face' + b.slice(0, b.indexOf('}') + 1));
    return blocks.filter((b) => {
      const m = b.match(/unicode-range:\s*([^;]+);/);
      if (!m) return true;
      const ranges = m[1].split(',').map((r) => {
        const [a, z] = r.trim().replace(/^U\+/i, '').split('-');
        if (a.includes('?')) return [parseInt(a.replace(/\?/g, '0'), 16), parseInt(a.replace(/\?/g, 'F'), 16)];
        return [parseInt(a, 16), parseInt(z || a, 16)];
      });
      return codes.some((c) => ranges.some(([lo, hi]) => c >= lo && c <= hi));
    }).join('\n');
  }

  function usedFonts() {
    const want = new Map();
    for (const [part] of FONT_PARTS) {
      const f = state.fonts[part];
      if (!want.has(f.font)) want.set(f.font, new Set());
      want.get(f.font).add(f.weight);
    }
    return [...want].map(([family, ws]) => [family, [...ws].sort((a, b) => a - b)]);
  }

  async function buildFontCss() {
    const chars = [...new Set([...(stage.textContent + '0123456789+-－？')])].filter((c) => c.trim());
    const text = chars.join('');
    const codes = chars.map((c) => c.codePointAt(0));
    const parts = await Promise.all(usedFonts().map(async ([family, weights]) => {
      const base = `https://fonts.googleapis.com/css2?family=${familyParam(family, weights)}`;
      try {
        return await inlineFontUrls(await fetchText(`${base}&text=${encodeURIComponent(text)}`));
      } catch (e) {
        console.warn('文字を絞ったフォントの取得に失敗、通常のフォントで再試行します', family, e);
        return inlineFontUrls(filterByUnicodeRange(await fetchText(`${base}&display=swap`), codes));
      }
    }));
    return parts.join('\n');
  }

  /* ------------------------------------------------------------------
   * 書き出し
   * ------------------------------------------------------------------ */
  const exportBtn = $('exportBtn');
  const modal = $('exportModal');
  const exportImg = $('exportImg');
  const exportNote = $('exportNote');
  const downloadLink = $('downloadLink');
  let lastUrl = null;

  function safeFileName(s, suffix) {
    const base = String(s || '').replace(/\s+/g, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').slice(0, 40);
    return (base || 'character') + suffix;
  }

  async function snapshot(node, opts) {
    if (!window.htmlToImage) {
      throw Object.assign(new Error('no lib'), { userMessage: '書き出し用のライブラリを読み込めませんでした。ネットワーク接続を確認して、ページを再読み込みしてください。' });
    }
    render();
    if (document.fonts) await document.fonts.ready;
    let fontsOk = true;
    try {
      opts.fontEmbedCSS = await buildFontCss();
    } catch (e) {
      console.warn('フォントの埋め込みに失敗したため、端末のフォントで書き出します', e);
      opts.skipFonts = true;
      fontsOk = false;
    }
    const blob = await window.htmlToImage.toBlob(node, opts);
    if (!blob) throw new Error('toBlob failed');
    return { blob, fontsOk };
  }

  function showResult(blob, fileName, fontsOk) {
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = URL.createObjectURL(blob);
    exportImg.src = lastUrl;
    downloadLink.href = lastUrl;
    downloadLink.download = fileName;
    exportNote.hidden = fontsOk;
    modal.hidden = false;
    downloadLink.focus();
  }

  async function runExport(btn, fn) {
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = '作成中…';
    try {
      await fn();
    } catch (err) {
      console.error(err);
      alert(err.userMessage || '画像の書き出しに失敗しました。ページを「ローカルファイルとして直接開いている」場合は、GitHub Pages などのWebサーバー経由で開いてください。');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  exportBtn.addEventListener('click', () => runExport(exportBtn, async () => {
    const { blob, fontsOk } = await snapshot(stage, {
      width: W,
      height: H,
      pixelRatio: state.exportScale,
      style: { transform: 'none', left: '0', top: '0' },
      filter: (node) => !(node.classList && (node.classList.contains('st-art-empty') || node.hidden))
    });
    showResult(blob, safeFileName(state.name.text, '_ステータス.png'), fontsOk);
  }));

  // 今のCSS枠を、イラスト部分を透明にした PNG で保存（自作枠の下絵用）
  // 画面全体を枠だけ残して書き出し、カードの範囲を切り出す
  async function exportFrameTemplate(e) {
    const btn = e.currentTarget;
    const card = $('card');
    await runExport(btn, async () => {
      const prev = state.card.useCustomFrame;
      state.card.useCustomFrame = false;
      render();
      card.classList.add('template');
      try {
        const hideCls = ['st-bg', 'st-glow-line', 'st-title', 'st-heading', 'st-panel', 'st-art',
          'st-class-en', 'st-class-ruby', 'st-icon-img', 'st-stars', 'st-frame-img'];
        const k = 2;
        const { blob, fontsOk } = await snapshot(stage, {
          width: W,
          height: H,
          pixelRatio: k,
          style: { transform: 'none', left: '0', top: '0', background: 'transparent' },
          filter: (node) => !(node.hidden || (node.classList && hideCls.some((c) => node.classList.contains(c))))
        });
        const img = await loadImage(URL.createObjectURL(blob));
        const c = document.createElement('canvas');
        c.width = CARD_RECT.w * k;
        c.height = CARD_RECT.h * k;
        c.getContext('2d').drawImage(img, CARD_RECT.x * k, CARD_RECT.y * k, c.width, c.height, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        const out = await new Promise((r) => c.toBlob(r, 'image/png'));
        showResult(out, 'card-frame_848x1416.png', fontsOk);
      } finally {
        card.classList.remove('template');
        state.card.useCustomFrame = prev;
        render();
      }
    });
  }

  const closeModal = () => { modal.hidden = true; exportBtn.focus(); };
  $('closeModalBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  $('resetBtn').addEventListener('click', () => {
    if (!confirm('入力した文章・設定をすべて初期状態に戻します。\n（読み込んだ画像はそのまま残ります）')) return;
    const fresh = clone(DEFAULTS);
    for (const k of Object.keys(fresh)) state[k] = fresh[k];
    changed(); syncUI();
  });

  /* ------------------------------------------------------------------
   * 起動
   * ------------------------------------------------------------------ */
  buildPanels();
  updateStatus();
  fitStage();
  render();
  if (document.fonts) {
    document.fonts.ready.then(render);
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', () => requestRender());
  }

  // 動作確認用（コンソールから参照できる）
  window.__fgoStatus = { state, assets, render, loadArtFile, loadIconFile, loadFrameFile };
})();
