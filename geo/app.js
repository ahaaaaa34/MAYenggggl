import { BOOK, PAGES } from './data.js';

// ════════════════════════════════════════════
// STORAGE
// ════════════════════════════════════════════
const LS_KEY = 'geo-work-v1';
const store = (() => {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s && s.pages) return s;
  } catch {}
  return { pages: {} };
})();

let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 200);
}
function flush() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(LS_KEY, JSON.stringify(store)); } catch {}
}
window.addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

function pageState(id) {
  const s = (store.pages[id] ??= {});
  s.vals ??= {}; s.res ??= {}; s.ovr ??= {}; s.qs ??= {};
  return s;
}

// ════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════
const $app = document.getElementById('app');

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}

// 表記ゆれを吸収して比較する（全角半角・ひらがなカタカナ・記号・大文字小文字）
function norm(s) {
  return String(s ?? '').normalize('NFKC').toUpperCase()
    .replace(/[\s・、，,。．.「」『』()（）［］[\]〈〉<>＝=~〜]/g, '')
    .replace(/[‐‑‒–—―－ｰ−-]/g, 'ー')
    .replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

function isCorrect(b, v) {
  const n = norm(v);
  if (!n) return false;
  const cands = [b.a, ...(b.alt || [])].map(norm);
  const tries = [n];
  const suf = norm(b.s);
  if (suf && n.length > suf.length && n.endsWith(suf)) tries.push(n.slice(0, -suf.length));
  return tries.some(t => cands.includes(t));
}

const fullAns = b => b.a + (b.s || '');

const CIRC = { 1: '①', 2: '②', 3: '③', 4: '④', 5: '⑤', 6: '⑥' };

let toastTimer = 0;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ─── 本文の記法パーサ ───
const TOKEN = /\[\[([^\]]+)\]\]|\(\(([^)|]+)(?:\|([^)]*))?\)\)|\{([^|}]+)\|([^}]+)\}|__([^_]+)__/g;

function tokens(line) {
  const out = [];
  let last = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    if (m.index > last) out.push({ t: 'text', v: line.slice(last, m.index) });
    if (m[1] != null) out.push({ t: 'blank', k: m[1] });
    else if (m[2] != null) out.push({ t: 'ref', k: m[2], s: m[3] });
    else if (m[4] != null) out.push({ t: 'ruby', b: m[4], r: m[5] });
    else out.push({ t: 'u', v: m[6] });
    last = TOKEN.lastIndex;
  }
  if (last < line.length) out.push({ t: 'text', v: line.slice(last) });
  return out;
}

function lineEl(line, fill) {
  const ind = line.match(/^　*/)[0].length;
  const p = h('p', { class: 'ln' });
  if (ind) p.style.paddingLeft = ind + 'em';
  for (const tk of tokens(line.slice(ind))) {
    if (tk.t === 'text') p.append(tk.v);
    else if (tk.t === 'ruby') p.append(h('ruby', null, tk.b, h('rt', null, tk.r)));
    else if (tk.t === 'u') p.append(h('u', { class: 'ul' }, tk.v));
    else if (!fill) p.append(tk.k);
    else if (tk.t === 'blank') p.append(fill.renderBlank(tk.k));
    else p.append(fill.renderRef(tk.k, tk.s));
  }
  return p;
}

function fitInput(inp) {
  let w = 0;
  for (const ch of inp.value) w += /[\x20-\x7e｡-ﾟ]/.test(ch) ? 0.6 : 1;
  inp.style.width = Math.max(4.5, w + 1.4) + 'em';
}

function focusNext(inp) {
  const all = [...document.querySelectorAll('.bk-in')];
  const next = all[all.indexOf(inp) + 1];
  if (next) {
    next.focus();
    next.scrollIntoView({ block: 'center', behavior: 'smooth' });
  } else {
    inp.blur();
  }
}

// ════════════════════════════════════════════
// 穴埋めコントローラ（一問一答ページ・記述の空欄で共通）
// ════════════════════════════════════════════
function createFill({ blanks, st, ns = '', mode = 'input', onChange }) {
  const key = k => ns + k;
  const keys = Object.keys(blanks);
  const groups = new Map();
  const refs = [];
  const opened = new Set();

  function renderBlank(k) {
    const b = blanks[k];
    if (!b) return `[[${k}]]`;
    const label = b.label ?? k;

    if (mode === 'sheet') {
      const btn = h('button', { class: 'bk sheet', type: 'button', 'aria-label': `空欄${label}` },
        h('span', { class: 'bk-n' }, label),
        h('span', { class: 'bk-mask' }, b.a),
        b.s ? h('span', { class: 'bk-s' }, b.s) : null);
      btn.addEventListener('click', () => setOpen(k, !opened.has(k)));
      groups.set(k, { g: btn, bk: btn });
      return btn;
    }

    const inp = h('input', {
      class: 'bk-in', type: 'text', enterkeyhint: 'next', autocomplete: 'off',
      autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': `空欄${label}`,
    });
    inp.value = st.vals[key(k)] ?? '';
    fitInput(inp);
    const bk = h('span', { class: 'bk' },
      h('span', { class: 'bk-n' }, label), inp,
      b.s ? h('span', { class: 'bk-s' }, b.s) : null,
      h('span', { class: 'bk-mark' }));
    const alts = (b.alt || []).slice(0, 3);
    const ovr = h('button', { class: 'bk-ovr', type: 'button' }, '○にする');
    const fix = h('span', { class: 'bk-fix' },
      h('span', null, '正解 ', h('b', null, fullAns(b))),
      alts.length ? h('small', null, `別解: ${alts.join('・')}`) : null,
      ovr);
    const g = h('span', { class: 'bk-g' }, bk, fix, h('span', { class: 'bk-ans' }, fullAns(b)));

    inp.addEventListener('input', () => {
      st.vals[key(k)] = inp.value;
      fitInput(inp);
      if (st.res[key(k)] !== undefined) {
        delete st.res[key(k)];
        delete st.ovr[key(k)];
        paint(k);
        onChange?.();
      }
      save();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        focusNext(inp);
      }
    });
    ovr.addEventListener('click', () => {
      st.ovr[key(k)] = true;
      st.res[key(k)] = true;
      paint(k);
      save();
      onChange?.();
    });

    groups.set(k, { g, bk, inp });
    return g;
  }

  function renderRef(k, s) {
    const b = blanks[k];
    const suf = s ?? b?.s ?? '';
    const el = h('span', { class: 'ref' },
      h('span', { class: 'ref-q' }, `(${b?.label ?? k}${suf})`),
      h('span', { class: 'ref-a' }, (b?.a ?? '') + suf));
    refs.push({ el, k });
    return el;
  }

  function refreshRefs() {
    for (const r of refs) {
      const known = mode === 'sheet' ? opened.has(r.k) : st.res[key(r.k)] === true;
      r.el.classList.toggle('known', known);
    }
  }

  function paint(k) {
    const x = groups.get(k);
    if (x && mode !== 'sheet') {
      const r = st.res[key(k)];
      for (const el of [x.g, x.bk]) {
        el.classList.toggle('ok', r === true);
        el.classList.toggle('ng', r === false);
      }
    }
    refreshRefs();
  }

  function paintAll() { keys.forEach(paint); }

  function setOpen(k, on) {
    if (on) opened.add(k); else opened.delete(k);
    groups.get(k)?.g.classList.toggle('open', on);
    refreshRefs();
    onChange?.();
  }

  function score() {
    const got = keys.filter(k => st.res[key(k)] === true).length;
    const any = keys.some(k => st.res[key(k)] !== undefined);
    return any ? { got, total: keys.length } : null;
  }

  return {
    keys, renderBlank, renderRef, paintAll, score,
    openedCount: () => opened.size,
    openAll(on) { keys.forEach(k => setOpen(k, on)); },
    check() {
      let got = 0;
      for (const k of keys) {
        const ok = !!st.ovr[key(k)] || isCorrect(blanks[k], st.vals[key(k)]);
        st.res[key(k)] = ok;
        if (ok) got++;
      }
      paintAll();
      save();
      return { got, total: keys.length };
    },
    reset() {
      for (const k of keys) {
        delete st.vals[key(k)]; delete st.res[key(k)]; delete st.ovr[key(k)];
        const x = groups.get(k);
        if (x?.inp) { x.inp.value = ''; fitInput(x.inp); }
      }
      paintAll();
      save();
    },
    retryWrong() {
      let first = null;
      for (const k of keys) {
        if (st.res[key(k)] !== false) continue;
        delete st.vals[key(k)]; delete st.res[key(k)];
        const x = groups.get(k);
        if (x?.inp) { x.inp.value = ''; fitInput(x.inp); first ??= x.inp; }
      }
      paintAll();
      save();
      return first;
    },
  };
}

// ════════════════════════════════════════════
// 共通パーツ
// ════════════════════════════════════════════
function pageHeader(page) {
  const score = h('div', { class: 'ph-score' });
  const el = h('header', { class: 'ph' },
    h('button', { class: 'ph-back', 'aria-label': 'もどる', onclick: () => { location.hash = '#/'; } }, '‹'),
    h('div', { class: 'ph-mid' },
      h('div', { class: 'ph-title' }, h('span', { class: 'pg' }, `p.${page.page}`), page.title),
      h('div', { class: 'ph-sub' }, `${page.tb}　${page.type === 'fill' ? '一問一答' : '演習問題'}`)),
    score);
  return {
    el,
    setScore(sc) {
      if (!sc) {
        score.textContent = '未採点';
        score.className = 'ph-score';
      } else {
        score.textContent = `${sc.got} / ${sc.total}`;
        score.className = 'ph-score' + (sc.got === sc.total ? ' good' : '');
      }
    },
  };
}

function figure(src, alt) {
  const f = h('figure', { class: 'fig' },
    h('img', { src, alt, loading: 'lazy' }),
    h('span', { class: 'fig-zoom' }, '🔍 タップで拡大'));
  f.addEventListener('click', () => openZoom(src, alt));
  return f;
}

function openZoom(src, alt) {
  const w = Math.min(1400, Math.max(640, Math.round(window.innerWidth * 1.8)));
  const img = h('img', { src, alt, style: `width:${w}px` });
  const ov = h('div', { class: 'zoom' }, img);
  const close = h('button', { class: 'zoom-close', 'aria-label': '閉じる' }, '×');
  const done = () => { ov.remove(); close.remove(); document.body.style.overflow = ''; };
  close.addEventListener('click', done);
  ov.addEventListener('click', e => { if (e.target === ov) done(); });
  document.body.style.overflow = 'hidden';
  document.body.append(ov, close);
}

// 共通テスト改題の図（市場からの距離と収益）
function thunenFigure() {
  const X0 = 52, Y0 = 132, XI = 153.5, XA = 192, XB = 297;
  const ink = '#1f2330';
  const rows = [
    [['A', X0, XA], ['B', XA, XB]],
    [['A', X0, XI], ['B', XI, XB]],
    [['B', X0, XA], ['A', XA, XB]],
    [['B', X0, XI], ['A', XI, XB]],
  ];
  const ylab = [...'農地面積当たり収益'].map((c, i) => `<text x="26" y="${34 + i * 11.5}" text-anchor="middle">${c}</text>`).join('');
  const guides = [X0, XI, XA, XB].map(x => `<line x1="${x}" y1="${Y0}" x2="${x}" y2="250" stroke="${ink}" stroke-width="0.7" stroke-dasharray="1.5 2.5" opacity="0.55"/>`).join('');
  const bars = rows.map((segs, r) => {
    const y = 172 + r * 24;
    const lab = `<text x="30" y="${y + 4}" text-anchor="middle" font-size="12">${CIRC[r + 1]}</text>`;
    return lab + segs.map(([crop, a, b]) => {
      const dash = crop === 'B' ? ' stroke-dasharray="4 3"' : '';
      return `<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" stroke="${ink}" stroke-width="1.8"${dash}/>` +
        `<line x1="${a}" y1="${y - 4}" x2="${a}" y2="${y + 4}" stroke="${ink}" stroke-width="1.2"/>` +
        `<line x1="${b}" y1="${y - 4}" x2="${b}" y2="${y + 4}" stroke="${ink}" stroke-width="1.2"/>` +
        `<text x="${(a + b) / 2}" y="${y - 5}" text-anchor="middle" font-size="10">作物${crop}</text>`;
    }).join('');
  }).join('');
  const svg = `
<svg viewBox="0 0 330 262" xmlns="http://www.w3.org/2000/svg" font-family="'Hiragino Kaku Gothic ProN','Hiragino Sans','Noto Sans JP',sans-serif" font-size="11" fill="${ink}" role="img" aria-label="市場からの距離と農地面積当たり収益のグラフ">
  <defs><marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${ink}"/></marker></defs>
  ${ylab}
  <line x1="${X0}" y1="${Y0}" x2="${X0}" y2="16" stroke="${ink}" stroke-width="1.4" marker-end="url(#ar)"/>
  <line x1="${X0}" y1="${Y0}" x2="320" y2="${Y0}" stroke="${ink}" stroke-width="1.4" marker-end="url(#ar)"/>
  <circle cx="${X0}" cy="${Y0}" r="3" fill="${ink}"/>
  <line x1="${X0}" y1="34" x2="${XA}" y2="${Y0}" stroke="${ink}" stroke-width="1.8"/>
  <line x1="${X0}" y1="86" x2="${XB}" y2="${Y0}" stroke="${ink}" stroke-width="1.8" stroke-dasharray="4 3"/>
  <text x="112" y="56">作物A</text>
  <text x="222" y="104">作物B</text>
  <text x="${X0}" y="149" text-anchor="middle">市場</text>
  <text x="320" y="149" text-anchor="end">市場からの距離</text>
  ${guides}
  ${bars}
</svg>`;
  const f = h('figure', { class: 'fig svg' });
  f.innerHTML = svg;
  return f;
}

// 帯グラフ（割合）
const BAR_COLORS = ['#38bdf8', '#2dd4bf', '#818cf8', '#fbbf24', '#f472b6', '#a3e635'];
function barsFigure(bars, unit) {
  return h('div', { class: 'bars' }, bars.map(b => {
    const rest = Math.max(0, 100 - b.segs.reduce((n, [, v]) => n + v, 0));
    return h('div', { class: 'bars-item' },
      h('div', { class: 'bars-lab' }, h('b', null, b.label), h('small', null, b.sub)),
      h('div', { class: 'sbar' },
        b.segs.map(([name, v], i) => h('span', { style: `width:${v}%;background:${BAR_COLORS[i % BAR_COLORS.length]}`, title: `${name} ${v.toFixed(1)}${unit}` }, v >= 5 ? v.toFixed(1) : '')),
        h('span', { class: 'rest', style: `width:${rest}%` }, 'その他')),
      h('div', { class: 'bars-leg' }, b.segs.map(([name, v], i) =>
        h('span', null, h('i', { style: `background:${BAR_COLORS[i % BAR_COLORS.length]}` }), `${name} ${v.toFixed(1)}`))));
  }), h('div', { class: 'tbl-note' }, `数値は${unit}`));
}

// 表
function tableFigure(t) {
  return h('div', null,
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'dtable' },
      h('thead', null, h('tr', null, t.head.map(c => h('th', null, c)))),
      h('tbody', null, t.rows.map(r => h('tr', null, r.map((c, i) => i === 0 ? h('th', null, c) : h('td', null, c))))))),
    (t.notes || []).map(n => h('div', { class: 'tbl-note' }, n)));
}

// 記述問題の共通パーツ
function createEssay({ key, st, label, model, keys, onSelf }) {
  const selfKey = key + ':self';
  const ta = h('textarea', { rows: 4, placeholder: 'ここに書いてみよう' });
  ta.value = st.vals[key] ?? '';
  ta.addEventListener('input', () => { st.vals[key] = ta.value; save(); });
  const keysEl = h('div', { class: 'keys' });
  const bO = h('button', { type: 'button', class: 'o' }, '○ 書けた');
  const bX = h('button', { type: 'button', class: 'x' }, '× まだ');
  const setSelf = v => { st.vals[selfKey] = v; paintSelf(); save(); onSelf?.(); };
  bO.addEventListener('click', () => setSelf('o'));
  bX.addEventListener('click', () => setSelf('x'));
  function paintSelf() {
    bO.classList.toggle('on', st.vals[selfKey] === 'o');
    bX.classList.toggle('on', st.vals[selfKey] === 'x');
  }
  paintSelf();
  const el = h('div', { class: 'essay' },
    label ? h('div', { class: 'essay-label' }, label) : null,
    ta,
    h('div', { class: 'essay-ans' },
      h('div', { class: 'model' }, h('b', null, '解答例'), model),
      h('div', { class: 'keys-cap' }, 'ポイント（自分の文に入っていれば ✓）'),
      keysEl,
      h('div', { class: 'self' }, h('span', null, '自己採点'), bO, bX)));
  return {
    el,
    check() {
      const t = norm(ta.value);
      keysEl.replaceChildren(...keys.map(k =>
        h('div', { class: k.any.some(w => t.includes(norm(w))) ? 'hit' : '' }, k.label)));
      paintSelf();
      return st.vals[selfKey] === 'o' ? 1 : 0;
    },
    reset() {
      delete st.vals[key]; delete st.vals[selfKey];
      ta.value = '';
      paintSelf();
    },
  };
}

// ════════════════════════════════════════════
// 演習問題の種類ごとの部品
// ════════════════════════════════════════════
const KINDS = {
  // 空欄に書き込む
  blanks(q, st) {
    const fill = createFill({ blanks: q.blanks, st, ns: q.id + ':' });
    const line = l => {
      const p = lineEl(l, fill);
      if (l.startsWith('【')) p.classList.add('head');
      return p;
    };
    const el = h('div', { class: 'lines' },
      (q.lines || []).map(line),
      (q.groups || []).map(g => h('div', { class: 'grp' }, g.map(line))));
    fill.paintAll();
    return { el, check: () => fill.check(), reset: () => fill.reset() };
  },

  // 小麦カレンダーを塗る
  calendar(q, st, ctx) {
    const paintKey = q.id + ':cal';
    const painted = (st.vals[paintKey] ??= {});
    const months = Array.from({ length: q.count }, (_, i) => {
      const t = q.start.m - 1 + i;
      return { y: q.start.y + Math.floor(t / 12), m: (t % 12) + 1 };
    });
    const yb = i => (i > 0 && months[i].m === 1 ? ' yb' : '');

    const grid = h('div', { class: 'cal' });
    grid.append(h('div', { class: 'c-lab', style: 'border-top:none' }));
    for (let i = 0; i < months.length;) {
      let j = i;
      while (j < months.length && months[j].y === months[i].y) j++;
      grid.append(h('div', { class: 'c-yr', style: `grid-column: span ${j - i}` }, `${months[i].y}年`));
      i = j;
    }
    grid.append(h('div', { class: 'c-lab' }, h('span'), h('em', null, '月')));
    months.forEach((mo, i) => grid.append(h('div', { class: 'c-mo' + yb(i) }, mo.m)));

    const rowEls = {};
    const resList = h('div', { class: 'cal-res' });
    const pct = x => `${(x / months.length) * 100}%`;
    let country = '';
    q.rows.forEach((r, ri) => {
      const gr = `grid-row:${ri + 3}`;
      country = r.country || country;
      const full = country + (r.crop ? ' ' + r.crop : '');
      const mk = h('span', { class: 'mk' });
      const name = r.country
        ? h('span', { class: 'nm' }, r.country, r.crop ? h('em', null, ' ' + r.crop) : null)
        : h('span', { class: 'nm sub' }, h('em', null, r.crop));
      grid.append(h('div', { class: 'c-lab', style: `${gr};grid-column:1` }, name, mk));

      if (r.sample) {
        const s = h('div', { class: 'c-sample', style: gr });
        for (let i = 1; i < months.length; i++) {
          s.append(h('span', { class: 'tick' + yb(i), style: `left:${pct(i)}` }));
        }
        s.append(h('div', { class: 'blk', style: `left:${pct(r.sample.from)};width:${pct(r.sample.to - r.sample.from)}` }, '収穫'));
        grid.append(s);
        return;
      }

      const on = new Set(painted[r.id] || []);
      const cells = months.map((mo, i) => {
        const c = h('div', {
          class: 'c-cell' + yb(i) + (on.has(i) ? ' on' : ''),
          style: `${gr};grid-column:${i + 2}`,
          role: 'button', 'aria-label': `${full} ${mo.y}年${mo.m}月`,
        });
        c.addEventListener('click', () => {
          const set = new Set(painted[r.id] || []);
          if (set.has(i)) set.delete(i); else set.add(i);
          painted[r.id] = [...set].sort((a, b) => a - b);
          c.classList.toggle('on', set.has(i));
          save();
          ctx.rescore();
        });
        grid.append(c);
        return c;
      });
      // 解答（半月単位）の重ね表示
      grid.append(h('div', { class: 'c-key', style: gr },
        r.blocks.map(([a, b]) => h('i', { style: `left:${pct(a)};width:${pct(Math.min(b, months.length) - a)}` }))));
      const resEl = h('div');
      resList.append(resEl);
      rowEls[r.id] = { cells, mk, resEl, full };
    });

    const modelBtn = h('button', { class: 'btn small', type: 'button' }, '解答を重ねる');
    modelBtn.addEventListener('click', () => {
      const on = grid.classList.toggle('mdl-on');
      modelBtn.textContent = on ? '解答を隠す' : '解答を重ねる';
    });

    const essay = createEssay({ key: q.id + ':essay', st, onSelf: ctx.rescore, ...q.essay });
    const el = h('div', null,
      h('div', { class: 'cal-note' }, '収穫する月のマスをタップして青く塗ろう（もう一度タップで消える）。表は横にスクロールできます。'),
      h('div', { class: 'cal-scroll' }, grid),
      h('div', { class: 'cal-tools' },
        h('span', { class: 'cal-legend' }, h('i'), '＝自分が塗った所'),
        h('span', { class: 'cal-legend' }, h('i', { class: 'key' }), '＝解答'),
        h('span', { style: 'flex:1' }), modelBtn),
      q.note ? h('div', { class: 'cal-note' }, q.note) : null,
      resList,
      essay.el);

    return {
      el,
      check() {
        let got = 0, total = 1;
        for (const r of q.rows) {
          if (r.sample) continue;
          total++;
          const on = new Set(painted[r.id] || []);
          const ok = new Set(r.ok);
          const correct = [...on].every(i => ok.has(i)) && r.core.every(i => on.has(i));
          if (correct) got++;
          const x = rowEls[r.id];
          x.cells.forEach((c, i) => c.classList.toggle('bad', on.has(i) && !ok.has(i)));
          x.mk.textContent = correct ? '✓' : '✗';
          x.mk.style.color = correct ? 'var(--ok)' : 'var(--ng)';
          x.resEl.replaceChildren(
            h('span', { class: 'nm' }, x.full),
            h('span', null, r.hint),
            h('span', { class: correct ? 'ok' : 'ng' }, correct ? '✓' : '✗'));
        }
        grid.classList.add('checked', 'mdl-on');
        modelBtn.textContent = '解答を隠す';
        got += essay.check();
        return { got, total };
      },
      reset() {
        for (const r of q.rows) {
          if (r.sample) continue;
          delete painted[r.id];
          const x = rowEls[r.id];
          x.cells.forEach(c => c.classList.remove('on', 'bad'));
          x.mk.textContent = '';
        }
        grid.classList.remove('checked', 'mdl-on');
        modelBtn.textContent = '解答を重ねる';
        essay.reset();
      },
    };
  },

  // 高／低 を選ぶ表
  hilo(q, st, ctx) {
    const cells = [];
    const el = h('div', { class: 'hl' }, q.rows.map(r => h('div', { class: 'hl-row' },
      h('div', { class: 'hl-name' }, r.name.replace('\n', '・')),
      h('div', { class: 'hl-feat' }, r.feat),
      h('div', { class: 'hl-cells' }, q.cols.map((col, ci) => {
        const key = `${q.id}:${r.id}:${ci}`;
        const btns = ['高', '低'].map(v => h('button', { type: 'button', class: v === r.ans[ci] ? 'ans' : '' }, v));
        const cell = h('div', { class: 'hl-cell' }, h('span', null, col), h('div', { class: 'hl-seg' }, btns), h('span', { class: 'mk' }));
        const paintSel = () => btns.forEach(b => b.classList.toggle('on', b.textContent === st.vals[key]));
        btns.forEach(b => b.addEventListener('click', () => {
          if (st.vals[key] === b.textContent) delete st.vals[key]; else st.vals[key] = b.textContent;
          paintSel();
          save();
          ctx.rescore();
        }));
        paintSel();
        cells.push({ key, cell, ans: r.ans[ci], paintSel });
        return cell;
      })))));
    return {
      el,
      check() {
        let got = 0;
        for (const c of cells) {
          const ok = st.vals[c.key] === c.ans;
          c.cell.classList.toggle('ok', ok);
          c.cell.classList.toggle('ng', !ok);
          if (ok) got++;
        }
        return { got, total: cells.length };
      },
      reset() {
        for (const c of cells) {
          delete st.vals[c.key];
          c.cell.classList.remove('ok', 'ng');
          c.paintSel();
        }
      },
    };
  },

  // 語群から選んで空欄に入れる
  wordbank(q, st, ctx) {
    const keys = Object.keys(q.blanks);
    const kv = k => `${q.id}:${k}`;
    const slots = {};
    let sel = null;
    const firstEmpty = (after = null) => {
      const order = after == null ? keys : [...keys.slice(keys.indexOf(after) + 1), ...keys];
      return order.find(k => !st.vals[kv(k)]) ?? null;
    };

    const text = h('p', { class: 'wb-text' });
    for (const tk of tokens(q.text)) {
      if (tk.t === 'blank') {
        const k = tk.k;
        const sv = h('span', { class: 'sv' });
        const el = h('span', { class: 'slot', role: 'button', tabindex: '0' },
          h('span', { class: 'sn' }, CIRC[k] ?? k), sv, h('span', { class: 'sfix' }, '→ ' + q.blanks[k]));
        el.addEventListener('click', () => {
          if (sel === k && st.vals[kv(k)]) {
            delete st.vals[kv(k)];
            save();
            ctx.rescore();
          }
          sel = k;
          paint();
        });
        slots[k] = { el, sv };
        text.append(el);
      } else if (tk.t === 'text') {
        text.append(tk.v);
      }
    }

    const chips = q.words.map(w => {
      const c = h('button', { class: 'chip', type: 'button' }, w);
      c.addEventListener('click', () => {
        const k = sel ?? firstEmpty();
        if (k == null) { toast('入れかえたい空欄をタップしてね'); return; }
        st.vals[kv(k)] = w;
        sel = firstEmpty(k);
        paint();
        save();
        ctx.rescore();
      });
      return c;
    });

    function paint() {
      const used = new Set(keys.map(k => st.vals[kv(k)]).filter(Boolean));
      for (const k of keys) {
        slots[k].sv.textContent = st.vals[kv(k)] ?? '';
        slots[k].el.classList.toggle('sel', sel === k);
      }
      chips.forEach(c => c.classList.toggle('used', used.has(c.textContent)));
    }
    sel = firstEmpty();
    paint();

    const el = h('div', null,
      text,
      h('div', { class: 'wb-cap' }, '【語群】空欄をタップして選び，下の語をタップ（入れた空欄をもう一度タップで消す）'),
      h('div', { class: 'chips' }, chips));
    return {
      el,
      check() {
        let got = 0;
        for (const k of keys) {
          const ok = st.vals[kv(k)] === q.blanks[k];
          slots[k].el.classList.toggle('ok', ok);
          slots[k].el.classList.toggle('ng', !ok);
          if (ok) got++;
        }
        return { got, total: keys.length };
      },
      reset() {
        for (const k of keys) {
          delete st.vals[kv(k)];
          slots[k].el.classList.remove('ok', 'ng');
        }
        sel = firstEmpty();
        paint();
      },
    };
  },

  // 選択肢から一つ選ぶ
  choice(q, st, ctx) {
    const key = q.id + ':c';
    const btns = q.options.map((o, i) => {
      const b = h('button', { type: 'button', class: i === q.answer ? 'ans' : '' }, o);
      b.addEventListener('click', () => {
        st.vals[key] = i;
        paint();
        save();
        ctx.rescore();
      });
      return b;
    });
    const paint = () => btns.forEach((b, i) => b.classList.toggle('on', st.vals[key] === i));
    paint();
    const [pre, post] = (q.text || '').split('（ ア ）');
    const el = h('div', null,
      q.conditions ? h('div', { class: 'conds' }, h('b', null, '【条件】'), h('ul', null, q.conditions.map(c => h('li', null, c)))) : null,
      q.text ? h('p', { class: 'ch-text' }, pre, post != null ? [h('span', { class: 'slot', style: 'min-width:3em;cursor:default' }, 'ア'), post] : null) : null,
      h('div', { class: q.long ? 'ch-list' : 'ch-opts' }, btns));
    return {
      el,
      check: () => ({ got: st.vals[key] === q.answer ? 1 : 0, total: 1 }),
      reset() { delete st.vals[key]; paint(); },
    };
  },

  // 記号・国名などをボタンで選ぶ（理由を書く欄つきも可）
  pick(q, st, ctx) {
    const items = q.items.map(it => {
      const key = `${q.id}:${it.id}`;
      const btns = (it.options || q.options).map(o => h('button', { type: 'button', class: o === it.ans ? 'ans' : '' }, o));
      const row = h('div', { class: 'pk-row' },
        h('span', { class: 'pk-label' }, it.label, h('span', { class: 'mk' })), h('div', { class: 'pk-seg' }, btns));
      const paintSel = () => btns.forEach(b => b.classList.toggle('on', b.textContent === st.vals[key]));
      btns.forEach(b => b.addEventListener('click', () => {
        if (st.vals[key] === b.textContent) delete st.vals[key]; else st.vals[key] = b.textContent;
        paintSel();
        save();
        ctx.rescore();
      }));
      paintSel();
      let reason = null;
      if (it.reason) {
        const rk = key + ':r';
        const inp = h('input', { class: 'pk-reason', type: 'text', placeholder: '選んだ理由', autocomplete: 'off' });
        inp.value = st.vals[rk] ?? '';
        inp.addEventListener('input', () => { st.vals[rk] = inp.value; save(); });
        reason = [inp, h('div', { class: 'pk-model' }, h('b', null, '理由の解答例'), it.reason)];
      }
      const el = h('div', { class: 'pk-item' }, row, reason);
      return { key, ans: it.ans, el, row, paintSel, reason };
    });
    const el = h('div', { class: 'pk' },
      q.lines ? h('div', { class: 'lines stmts' }, q.lines.map(l => lineEl(l, null))) : null,
      q.optionNote ? h('div', { class: 'pk-note' }, q.optionNote) : null,
      items.map(x => x.el));
    return {
      el,
      check() {
        let got = 0;
        for (const x of items) {
          const ok = st.vals[x.key] === x.ans;
          x.row.classList.toggle('ok', ok);
          x.row.classList.toggle('ng', !ok);
          if (ok) got++;
        }
        return { got, total: items.length };
      },
      reset() {
        for (const x of items) {
          delete st.vals[x.key];
          delete st.vals[x.key + ':r'];
          x.row.classList.remove('ok', 'ng');
          x.paintSel();
          if (x.reason) x.reason[0].value = '';
        }
      },
    };
  },

  // 記述
  essay(q, st, ctx) {
    const e = createEssay({ key: q.id + ':essay', st, model: q.model, keys: q.keys, onSelf: ctx.rescore });
    return { el: e.el, check: () => ({ got: e.check(), total: 1 }), reset: () => e.reset() };
  },
};

function qTotal(q) {
  switch (q.kind) {
    case 'blanks': return Object.keys(q.blanks).length;
    case 'calendar': return q.rows.filter(r => !r.sample).length + (q.essay ? 1 : 0);
    case 'hilo': return q.rows.length * q.cols.length;
    case 'wordbank': return Object.keys(q.blanks).length;
    case 'pick': return q.items.length;
    default: return 1;
  }
}

function pageTotal(p) {
  return p.type === 'fill'
    ? Object.keys(p.blanks).length
    : p.questions.reduce((n, q) => n + qTotal(q), 0);
}

function pageScore(p) {
  const st = store.pages[p.id];
  if (!st) return null;
  if (p.type === 'fill') return st.score ?? null;
  const done = p.questions.filter(q => st.qs?.[q.id]);
  if (!done.length) return null;
  return { got: done.reduce((n, q) => n + st.qs[q.id].got, 0), total: pageTotal(p) };
}

// ════════════════════════════════════════════
// 画面：ホーム
// ════════════════════════════════════════════
function renderHome() {
  document.title = BOOK.title;
  const cards = PAGES.map(p => {
    const sc = pageScore(p);
    const total = pageTotal(p);
    const pct = sc ? Math.round((sc.got / sc.total) * 100) : 0;
    return h('button', { class: 'pcard' + (p.type === 'quiz' ? ' quiz' : ''), type: 'button', onclick: () => { location.hash = '#/' + p.id; } },
      h('div', { class: 'pcard-num' }, h('small', null, 'p.'), h('b', null, p.page)),
      h('div', { class: 'pcard-body' },
        h('div', { class: 'pcard-title' }, p.title),
        h('div', { class: 'pcard-meta' }, p.type === 'fill' ? `一問一答 ${total}問` : `演習 ${[...new Set(p.questions.map(q => q.badge.replace(/問題|\s*\(\d\)$/g, '')))].join('・')}`),
        h('div', { class: 'pcard-prog' },
          h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` })),
          h('span', { class: 'pcard-score' + (sc ? '' : ' none') }, sc ? `${sc.got} / ${sc.total}` : '未挑戦'))),
      h('span', { class: 'pcard-arrow' }, '›'));
  });
  $app.replaceChildren(
    h('div', { class: 'home-hero' },
      h('div', { class: 'home-kicker' }, '地理探究'),
      h('h1', { class: 'home-title' }, BOOK.title),
      h('div', { class: 'home-chapter' }, BOOK.chapter)),
    h('div', { class: 'home-list' }, cards),
    h('div', { class: 'home-foot' }, h('a', { href: '../' }, '← 英単語フラッシュカードへ')));
}

// ════════════════════════════════════════════
// 画面：一問一答ページ
// ════════════════════════════════════════════
function renderFillPage(page) {
  const st = pageState(page.id);
  const mode = st.mode === 'sheet' ? 'sheet' : 'input';
  const header = pageHeader(page);
  let reveal = false;

  const fill = createFill({ blanks: page.blanks, st, mode, onChange: () => { updateScore(); updateBar(); } });

  const seg = h('div', { class: 'seg' },
    ['input', 'sheet'].map(m => h('button', {
      type: 'button', class: m === mode ? 'on' : '',
      onclick: () => { if (m !== mode) { st.mode = m; save(); renderFillPage(page); } },
    }, m === 'input' ? '✏️ 入力して解く' : '🟥 赤シートで確認')));
  const hint = h('p', { class: 'mode-hint' }, mode === 'input'
    ? '空欄に答えを入力して「答え合わせ」。Enterで次の空欄へ。別の言い方で合っているときは「○にする」で正解にできます。'
    : '赤いところをタップすると答えが見えます。もう一度タップで隠れます。');

  const body = h('div', { class: 'fill-body' });
  for (const sec of page.sections) {
    body.append(h('h2', { class: 'sec-title' }, sec.title));
    for (const row of sec.rows) {
      const lab = h('div', { class: 'row-label' });
      row.label.forEach((l, i) => {
        if (i) lab.append(h('i', null, '›'));
        lab.append(h('span', null, l));
      });
      body.append(h('div', { class: 'row' }, lab, row.lines.map(l => lineEl(l, fill))));
    }
  }
  fill.paintAll();

  const bb = h('div', { class: 'bb' });

  function updateScore() {
    const sc = fill.score();
    if (sc) st.score = sc; else delete st.score;
    header.setScore(st.score);
    save();
  }

  function updateBar() {
    if (mode === 'sheet') {
      const n = fill.openedCount();
      bb.replaceChildren(
        h('div', { class: 'bb-res' }, h('span', null, `めくった ${n} / ${fill.keys.length}`),
          h('div', { class: 'bar' }, h('i', { style: `width:${(n / fill.keys.length) * 100}%` }))),
        h('div', { class: 'bb-row' },
          h('button', { class: 'btn', type: 'button', onclick: () => fill.openAll(false) }, '全部かくす'),
          h('button', { class: 'btn primary', type: 'button', onclick: () => fill.openAll(true) }, '全部めくる')));
      return;
    }
    const sc = fill.score();
    const wrong = fill.keys.filter(k => st.res[k] === false).length;
    const res = sc
      ? h('div', { class: 'bb-res' },
          h('span', { style: `color:${sc.got === sc.total ? 'var(--ok)' : 'var(--text)'}` }, `正解 ${sc.got} / ${sc.total}`),
          h('div', { class: 'bar' }, h('i', { style: `width:${(sc.got / sc.total) * 100}%` })),
          wrong ? h('button', { class: 'btn small warn', type: 'button', onclick: retryWrong }, `✗ ${wrong}問やり直す`) : null)
      : null;
    bb.replaceChildren(
      res ?? '',
      h('div', { class: 'bb-row' },
        h('button', { class: 'btn', type: 'button', onclick: resetAll }, 'リセット'),
        h('button', { class: 'btn', type: 'button', onclick: toggleReveal }, reveal ? '答えを隠す' : '答えを見る'),
        h('button', { class: 'btn primary', type: 'button', onclick: doCheck }, '答え合わせ')));
  }

  function doCheck() {
    const r = fill.check();
    updateScore();
    updateBar();
    toast(r.got === r.total ? `全問正解！ ${r.got} / ${r.total}` : `${r.total}問中 ${r.got}問 正解`);
  }
  function retryWrong() {
    const first = fill.retryWrong();
    updateScore();
    updateBar();
    if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); first.focus({ preventScroll: true }); }
  }
  function resetAll() {
    if (!confirm('このページの入力をすべて消しますか？')) return;
    fill.reset();
    updateScore();
    updateBar();
  }
  function toggleReveal() {
    reveal = !reveal;
    body.classList.toggle('show-ans', reveal);
    updateBar();
  }

  header.setScore(st.score);
  updateBar();
  $app.replaceChildren(header.el, seg, hint, body, bb);
}

// ════════════════════════════════════════════
// 画面：演習ページ
// ════════════════════════════════════════════
function renderQuizPage(page) {
  const st = pageState(page.id);
  const header = pageHeader(page);
  const updateHeader = () => header.setScore(pageScore(page));

  const cards = page.questions.map(q => {
    const card = h('section', { class: 'q-card' });
    const state = h('span', { class: 'q-state' });
    const setState = r => {
      state.textContent = r ? `${r.got === r.total ? '✓' : ''} ${r.got} / ${r.total}` : '';
      state.className = 'q-state' + (r && r.got === r.total ? ' good' : '');
    };
    const ctx = { rescore: () => { if (card.classList.contains('checked')) doCheck(); } };
    const ctl = KINDS[q.kind](q, st, ctx);

    function doCheck() {
      const r = ctl.check();
      st.qs[q.id] = r;
      card.classList.add('checked');
      setState(r);
      updateHeader();
      save();
      return r;
    }

    card.append(...[
      h('div', { class: 'q-head' }, h('span', { class: `q-badge ${q.level}` }, q.badge), state),
      h('p', { class: 'q-prompt' }, q.prompt),
      q.source ? h('div', { class: 'q-src' }, q.source) : null,
      q.img ? figure(q.img, q.imgAlt) : null,
      q.figure === 'thunen' ? thunenFigure() : null,
      q.bars ? barsFigure(q.bars, q.barsUnit || '%') : null,
      q.table ? tableFigure(q.table) : null,
      h('div', { class: 'q-body' }, ctl.el),
      h('div', { class: 'q-foot' },
        h('button', { class: 'btn', type: 'button', onclick: () => {
          ctl.reset();
          delete st.qs[q.id];
          card.classList.remove('checked');
          setState(null);
          updateHeader();
          save();
        } }, 'やり直す'),
        h('button', { class: 'btn primary', type: 'button', onclick: () => {
          const r = doCheck();
          toast(r.got === r.total ? `正解！ ${r.got} / ${r.total}` : `${r.total}点中 ${r.got}点`);
        } }, '答え合わせ')),
      h('div', { class: 'q-explain' }, h('b', null, '解説'), q.explain),
    ].filter(Boolean));

    if (st.qs[q.id]) doCheck();
    return card;
  });

  updateHeader();
  $app.replaceChildren(header.el, ...cards);
}

// ════════════════════════════════════════════
// ROUTER
// ════════════════════════════════════════════
function route() {
  flush();
  const id = location.hash.replace(/^#\/?/, '');
  const page = PAGES.find(p => p.id === id);
  if (!page) renderHome();
  else {
    document.title = `p.${page.page} ${page.title}｜${BOOK.title}`;
    if (page.type === 'fill') renderFillPage(page); else renderQuizPage(page);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
