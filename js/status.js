/*
 * FGO風ステータス画面メーカー
 * 画面は HTML/CSS で組み、PNG 書き出しは html-to-image で行います。
 * すべての処理はブラウザ内で完結します（画像をサーバーへ送信しません）。
 */
(() => {
  'use strict';

  const W = 1280, H = 720;
  const STORE_KEY = 'fgoStatusMaker.v1';

  const stage = document.getElementById('statusStage');
  const wrap = document.getElementById('stageWrap');
  const $ = (id) => document.getElementById(id);

  /* ------------------------------------------------------------------
   * フォント（すべて Google Fonts / SIL Open Font License）
   * heavy … 名前・見出し用の太さ / bold … 本文・項目名用の太さ
   * ------------------------------------------------------------------ */
  const JP_FONTS = [
    { family: 'Zen Kaku Gothic New', label: 'Zen角ゴシック New', heavy: 900, bold: 700 },
    { family: 'Noto Sans JP', label: 'Noto Sans JP（ゴシック）', heavy: 900, bold: 700 },
    { family: 'M PLUS 1p', label: 'M PLUS 1p（ゴシック）', heavy: 900, bold: 700 },
    { family: 'Zen Maru Gothic', label: 'Zen丸ゴシック', heavy: 900, bold: 700 },
    { family: 'Shippori Mincho B1', label: 'しっぽり明朝 B1', heavy: 800, bold: 700 },
    { family: 'Zen Old Mincho', label: 'Zen Old Mincho（明朝）', heavy: 900, bold: 700 },
    { family: 'Dela Gothic One', label: 'デラゴシック（極太）', heavy: 400, bold: 400 }
  ];
  const CLASS_FONTS = [
    { family: 'Cormorant Garamond', label: 'Cormorant Garamond（セリフ）', heavy: 700, bold: 700 },
    { family: 'Cinzel', label: 'Cinzel（碑文風・大文字）', heavy: 700, bold: 700 },
    { family: 'Marcellus', label: 'Marcellus（細めのセリフ）', heavy: 400, bold: 400 },
    ...JP_FONTS
  ];
  const findFont = (list, fam) => list.find((f) => f.family === fam) || list[0];

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
  const DEFAULTS = {
    name: { text: 'ミラ・アステリア', size: 60 },
    sub: { text: 'キャスター', size: 19 },
    heading: { text: 'プロフィール', size: 48 },
    nameFont: 'Zen Kaku Gothic New',
    bodyFont: 'Zen Kaku Gothic New',
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
      classEn: 'Caster',
      classRuby: 'キャスター',
      classFont: 'Cormorant Garamond',
      classSize: 54,
      artTop: '#f2f2f2',
      artBottom: '#b9bcc0'
    },
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
    icon: null      // { url, name }
  };

  /* ------------------------------------------------------------------
   * 描画（DOM に反映）
   * ------------------------------------------------------------------ */
  const ART_W = 424 - 14;              // カード内側の幅
  const ART_H = 708 - 14 - 30 - 106;   // 上帯と下帯を除いた高さ

  function frameClass() {
    const f = state.card.frame;
    if (f !== 'auto') return f;
    const s = state.card.stars;
    return s >= 4 ? 'gold' : s === 3 ? 'silver' : s >= 1 ? 'bronze' : 'gold';
  }

  // はみ出す1行テキストは横方向に縮めて収める
  function fitWidth(el, maxW, origin) {
    el.style.transform = '';
    const w = el.scrollWidth;
    if (w > maxW) {
      el.style.transformOrigin = origin;
      el.style.transform = `scaleX(${(maxW / w).toFixed(4)})`;
    }
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
      grid.appendChild(h('div', { class: 'st-param' }, h('div', { class: 'st-param-label', text: it.label }), bar, rank));
    }
  }

  function renderArt() {
    const img = $('artImg');
    const a = assets.art;
    $('artEmpty').hidden = !!a;
    img.hidden = !a;
    if (!a) return;
    const base = Math.max(ART_W / a.w, ART_H / a.h);
    const w = a.w * base * state.art.scale;
    const hh = a.h * base * state.art.scale;
    const left = (ART_W - w) / 2 + state.art.x;
    const top = (ART_H - hh) / 2 + state.art.y;
    img.style.width = w + 'px';
    img.style.height = hh + 'px';
    img.style.transform = `translate(${left}px, ${top}px)`;
  }

  function render() {
    const s = state;
    const st = stage.style;
    const nf = findFont(JP_FONTS, s.nameFont);
    const bf = findFont(JP_FONTS, s.bodyFont);
    const cf = findFont(CLASS_FONTS, s.card.classFont);

    st.setProperty('--name-font', `"${nf.family}"`);
    st.setProperty('--body-font', `"${bf.family}"`);
    st.setProperty('--class-font', `"${cf.family}"`);
    st.setProperty('--bg-top', s.bg.top);
    st.setProperty('--bg-mid', s.bg.mid);
    st.setProperty('--bg-bottom', s.bg.bottom);
    st.setProperty('--art-top', s.card.artTop);
    st.setProperty('--art-bottom', s.card.artBottom);
    st.setProperty('--panel-alpha', s.bg.panelAlpha);
    stage.classList.remove('frame-gold', 'frame-silver', 'frame-bronze');
    stage.classList.add('frame-' + frameClass());

    // 名前・見出し
    const name = $('nameText'), sub = $('subText'), head = $('headText');
    name.textContent = s.name.text;
    name.style.fontSize = s.name.size + 'px';
    name.style.fontWeight = nf.heavy;
    sub.textContent = s.sub.text;
    sub.style.fontSize = s.sub.size + 'px';
    sub.style.fontWeight = nf.bold;
    sub.style.top = Math.round(2 + s.name.size * 1.13) + 'px';
    head.textContent = s.heading.text;
    head.style.fontSize = s.heading.size + 'px';
    head.style.fontWeight = nf.heavy;
    fitWidth(name, 820, '100% 50%');
    fitWidth(sub, 820, '100% 50%');

    // パネル
    $('detailTab').textContent = s.detail.tab;
    $('paramTab').textContent = s.params.tab;
    for (const t of [$('detailTab'), $('paramTab')]) t.style.fontWeight = bf.bold;
    const dt = $('detailText');
    dt.textContent = s.detail.text;
    dt.style.fontSize = s.detail.size + 'px';
    dt.style.lineHeight = s.detail.lineHeight + 'px';
    dt.style.fontWeight = bf.bold;
    renderParams();
    stage.querySelectorAll('.st-param-label').forEach((e) => { e.style.fontWeight = bf.bold; });
    stage.querySelectorAll('.st-param-rank').forEach((e) => { e.style.fontWeight = nf.bold; });

    // カード
    const stars = $('stars');
    stars.innerHTML = '';
    for (let i = 0; i < s.card.stars; i++) stars.appendChild(h('div', { class: 'st-star' }));
    stars.parentElement.classList.toggle('empty', s.card.stars === 0);
    const en = $('classEn');
    en.textContent = s.card.classEn;
    en.style.fontSize = s.card.classSize + 'px';
    en.style.fontWeight = cf.heavy;
    fitWidth(en, 396, '50% 100%');
    $('classRuby').textContent = s.card.classRuby;
    $('classRuby').style.fontWeight = bf.bold;

    const iconImg = $('iconImg');
    iconImg.hidden = !assets.icon;
    if (assets.icon) iconImg.src = assets.icon.url;
    iconImg.parentElement.classList.toggle('has-img', !!assets.icon);

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
    input.addEventListener('change', () => { setPath(path, input.checked); changed(); });
    binds.push(() => { input.checked = !!getPath(path); });
    return h('div', { class: 'row check' }, input, h('label', { for: id, text: label }));
  }

  function selectField(label, path, options, opts = {}) {
    const id = 'f' + (++uid);
    const sel = h('select', { id, 'aria-label': label });
    for (const [v, t] of options) sel.appendChild(h('option', { value: String(v), text: t }));
    sel.addEventListener('change', () => {
      const cur = getPath(path);
      setPath(path, typeof cur === 'number' ? parseFloat(sel.value) : sel.value);
      changed();
    });
    binds.push(() => { sel.value = String(getPath(path)); });
    return h('div', { class: 'row' }, opts.hideLabel ? null : h('label', { for: id, text: label }), sel);
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

  const status = {};

  function buildPanels() {
    const panels = $('panels');
    const fontOpts = JP_FONTS.map((f) => [f.family, f.label]);

    // 名前・見出し
    panels.appendChild(section('名前・見出し', [
      block('キャラ名', [
        textField('名前（右上の大きな文字）', ['name', 'text']),
        textField('名前の下の小さな文字', ['sub', 'text'], { note: 'クラス名や肩書きなど。空欄にすると表示されません。' }),
        adv('詳細設定：文字サイズ', [
          rangeField('名前の文字サイズ', ['name', 'size'], 28, 90, 1, 'px'),
          rangeField('小さな文字のサイズ', ['sub', 'size'], 12, 36, 1, 'px')
        ])
      ]),
      block('見出し', [
        textField('見出しの文字', ['heading', 'text']),
        adv('詳細設定：文字サイズ', [rangeField('文字サイズ', ['heading', 'size'], 24, 72, 1, 'px')])
      ]),
      block('フォント', [
        selectField('名前・見出し・ランクのフォント', ['nameFont'], fontOpts),
        selectField('本文・項目名のフォント', ['bodyFont'], fontOpts)
      ])
    ], true));

    // カード
    const [artBtn, artInput] = fileButton('画像を選ぶ', loadArtFile);
    status.artName = h('span', { class: 'file-name' });
    const [iconBtn, iconInput] = fileButton('アイコン画像を選ぶ', loadIconFile);
    status.iconName = h('span', { class: 'file-name' });
    const iconClear = h('button', {
      type: 'button', class: 'btn small ghost', text: '外す',
      onclick: () => { if (assets.icon) URL.revokeObjectURL(assets.icon.url); assets.icon = null; updateStatus(); requestRender(); }
    });
    status.iconClear = iconClear;

    panels.appendChild(section('キャラクターカード', [
      block('キャラ画像', [
        h('div', { class: 'btn-row' }, artBtn, artInput, status.artName),
        h('div', { class: 'note', text: '縦長の全身イラストがおすすめです。プレビューのカード上でドラッグして位置を調整できます。' }),
        rangeField('拡大率', ['art', 'scale'], 0.3, 4, 0.01, '倍'),
        h('div', { class: 'grid2' },
          rangeField('左右の位置', ['art', 'x'], -600, 600, 1, 'px'),
          rangeField('上下の位置', ['art', 'y'], -800, 800, 1, 'px')),
        h('div', { class: 'btn-row' }, h('button', {
          type: 'button', class: 'btn small', text: '位置と拡大率を戻す',
          onclick: () => { state.art = clone(DEFAULTS.art); changed(); syncUI(); }
        })),
        adv('詳細設定：画像の後ろの背景色', [
          colorField('上側の色', ['card', 'artTop']),
          colorField('下側の色', ['card', 'artBottom'])
        ])
      ]),
      block('レアリティと枠', [
        h('div', { class: 'grid2' },
          selectField('星の数', ['card', 'stars'], [[5, '★5'], [4, '★4'], [3, '★3'], [2, '★2'], [1, '★1'], [0, 'なし']]),
          selectField('枠の色', ['card', 'frame'], [['auto', '星の数に合わせる'], ['gold', '金'], ['silver', '銀'], ['bronze', '銅']]))
      ]),
      block('クラス表記（カード下部）', [
        textField('クラス名（英字）', ['card', 'classEn']),
        textField('クラス名の読み', ['card', 'classRuby']),
        h('div', { class: 'row' }, h('span', { class: 'label', text: 'クラスアイコン' }),
          h('div', { class: 'btn-row' }, iconBtn, iconInput, iconClear, status.iconName),
          h('div', { class: 'note', text: '同梱していません。ご自身で用意した画像（透過PNG推奨）を使ってください。' })),
        adv('詳細設定：フォント・サイズ', [
          selectField('英字のフォント', ['card', 'classFont'], CLASS_FONTS.map((f) => [f.family, f.label])),
          rangeField('英字の文字サイズ', ['card', 'classSize'], 24, 80, 1, 'px')
        ])
      ])
    ], true));

    // キャラクター詳細
    const warn = h('div', { class: 'warn', text: '文章が枠からはみ出しています。行数を減らすか、文字サイズを小さくしてください。' });
    warn.hidden = true;
    warnEls.push(warn);
    panels.appendChild(section('キャラクター詳細', [
      block('本文', [
        textField('枠の見出し', ['detail', 'tab']),
        textField('本文', ['detail', 'text'], { multiline: true, rows: 7, note: '改行はそのまま反映されます。初期設定で6行まで入ります。', warn }),
        adv('詳細設定：文字サイズ・行間', [
          rangeField('文字サイズ', ['detail', 'size'], 16, 40, 1, 'px'),
          rangeField('行の間隔', ['detail', 'lineHeight'], 20, 60, 1, 'px')
        ])
      ])
    ], true));

    // パラメーター
    const rows = state.params.items.map((_, i) => h('div', { class: 'param-row' },
      textField(`項目 ${i + 1}`, ['params', 'items', i, 'label']),
      selectField('ランク', ['params', 'items', i, 'rank'], RANKS),
      selectField('補正', ['params', 'items', i, 'mod'], MODS)));
    panels.appendChild(section('パラメーター', [
      block('ステータス', [
        textField('枠の見出し', ['params', 'tab']),
        h('div', { class: 'note', text: '左上から「左→右」の順に並びます。ゲージはランクに合わせて自動で伸びます（EXは金色）。' }),
        rows
      ])
    ], true));

    // 背景・書き出し
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

  async function loadArtFile(file) {
    if (!file || !/^image\//.test(file.type || 'image/')) return;
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
    newScale = Math.min(4, Math.max(0.3, newScale));
    const base = Math.max(ART_W / a.w, ART_H / a.h);
    const w = a.w * base * state.art.scale, hh = a.h * base * state.art.scale;
    const L = (ART_W - w) / 2 + state.art.x, T = (ART_H - hh) / 2 + state.art.y;
    const u = (px - L) / w, v = (py - T) / hh;
    const w2 = a.w * base * newScale, h2 = a.h * base * newScale;
    state.art.scale = Math.round(newScale * 1000) / 1000;
    state.art.x = Math.round(px - u * w2 - (ART_W - w2) / 2);
    state.art.y = Math.round(py - v * h2 - (ART_H - h2) / 2);
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
   * 書き出し
   * 使っている文字だけを含むフォントを Google Fonts から取り寄せて埋め込む
   * ------------------------------------------------------------------ */
  function blobToDataUrl(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }

  async function buildFontCss() {
    const text = [...new Set([...(stage.textContent + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-－？')])]
      .filter((c) => c.trim()).join('');
    const nf = findFont(JP_FONTS, state.nameFont);
    const bf = findFont(JP_FONTS, state.bodyFont);
    const cf = findFont(CLASS_FONTS, state.card.classFont);
    const want = new Map();
    const add = (f, w) => { if (!want.has(f.family)) want.set(f.family, new Set()); want.get(f.family).add(w); };
    add(nf, nf.heavy); add(nf, nf.bold); add(bf, bf.bold); add(cf, cf.heavy);

    const parts = await Promise.all([...want].map(async ([family, ws]) => {
      const weights = [...ws].sort((a, b) => a - b);
      const fam = family.replace(/ /g, '+') + (weights.length === 1 && weights[0] === 400 ? '' : ':wght@' + weights.join(';'));
      const url = `https://fonts.googleapis.com/css2?family=${fam}&text=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('font css ' + res.status);
      let css = await res.text();
      const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))];
      for (const u of urls) {
        const r = await fetch(u);
        if (!r.ok) throw new Error('font file ' + r.status);
        css = css.split(u).join(await blobToDataUrl(await r.blob()));
      }
      return css;
    }));
    return parts.join('\n');
  }

  const exportBtn = $('exportBtn');
  const modal = $('exportModal');
  const exportImg = $('exportImg');
  const downloadLink = $('downloadLink');
  let lastUrl = null;

  function safeFileName(s) {
    const base = String(s || '').replace(/\s+/g, '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').slice(0, 40);
    return (base || 'character') + '_ステータス.png';
  }

  exportBtn.addEventListener('click', async () => {
    if (!window.htmlToImage) {
      alert('書き出し用のライブラリを読み込めませんでした。ネットワーク接続を確認して、ページを再読み込みしてください。');
      return;
    }
    exportBtn.disabled = true;
    const label = exportBtn.textContent;
    exportBtn.textContent = '作成中…';
    try {
      render();
      if (document.fonts) await document.fonts.ready;
      const opts = {
        width: W,
        height: H,
        pixelRatio: state.exportScale,
        style: { transform: 'none', left: '0', top: '0' },
        filter: (node) => !(node.classList && (node.classList.contains('st-art-empty') || node.hidden))
      };
      try {
        opts.fontEmbedCSS = await buildFontCss();
      } catch (e) {
        console.warn('フォントの埋め込みに失敗したため、端末のフォントで書き出します', e);
        opts.skipFonts = true;
      }
      const blob = await window.htmlToImage.toBlob(stage, opts);
      if (!blob) throw new Error('toBlob failed');
      if (lastUrl) URL.revokeObjectURL(lastUrl);
      lastUrl = URL.createObjectURL(blob);
      exportImg.src = lastUrl;
      downloadLink.href = lastUrl;
      downloadLink.download = safeFileName(state.name.text);
      modal.hidden = false;
      downloadLink.focus();
    } catch (err) {
      console.error(err);
      alert('画像の書き出しに失敗しました。ページを「ローカルファイルとして直接開いている」場合は、GitHub Pages などのWebサーバー経由で開いてください。');
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = label;
    }
  });

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
  window.__fgoStatus = { state, assets, render, loadArtFile, loadIconFile };
})();
