// Procedural watch renderer. Draws a top-down watch head (case, bezel, dial, hands, bracelet)
// from a spec — no photography required, so every catalog reference gets a faithful-ish portrait.
import { FAMILY, METALS, DIALS, BEZEL_COLORS, parseBezel, metalBase, metalAccent } from './vocab.js';

const CX = 100, CY = 125;
const LUME = '#f4f0e2';
const HAND_COLORS = { red: '#c8202f', green: '#1f8a4c', orange: '#f07b1d', blue: '#2a5bd7' };
let seq = 0;

const n = v => Math.round(v * 100) / 100;
const pt = (r, deg) => {
  const a = (deg - 90) * Math.PI / 180;
  return [n(CX + r * Math.cos(a)), n(CY + r * Math.sin(a))];
};
function rgb(h) {
  h = h.replace('#', '');
  const i = parseInt(h.length === 3 ? h.replace(/./g, c => c + c) : h, 16);
  return [(i >> 16) & 255, (i >> 8) & 255, i & 255];
}
export function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export function luminance(h) {
  const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function rng(seed) {
  let s = 0;
  for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Normalise anything watch-like (a catalog reference or a collection entry) into a render spec. */
export function specFrom(src = {}) {
  const fam = FAMILY[src.family] || {};
  let date = src.date;
  if (date === undefined || date === null) date = fam.date === 'name' ? /date/i.test(src.model || '') : !!fam.date;
  const bezel = src.bezel || 'smooth';
  return {
    family: src.family,
    label: (src.model || fam.name || '').toUpperCase(),
    metal: METALS[src.metal] ? src.metal : 'steel',
    bezel,
    dial: DIALS[src.dial] ? src.dial : (DIALS[src.dials?.[0]] ? src.dials[0] : 'black'),
    bracelet: src.bracelet || src.bracelets?.[0] || 'oyster',
    date,
    day: src.day ?? !!fam.day,
    idx: fam.idx || 'baton',
    hands: fam.hands || 'baton',
    gmt: !!fam.gmt || bezel.startsWith('gmt'),
    gh: src.gh || (src.family === 'explorer-ii' ? 'orange' : 'red'),
    lefty: !!src.lefty,
    guards: src.guards ?? !!fam.guards,
    pushers: !!fam.pushers,
  };
}

function lin(id, t, x2 = 1, y2 = 1) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">
<stop offset="0" stop-color="${t[0]}"/><stop offset=".38" stop-color="${t[1]}"/><stop offset=".62" stop-color="${t[2]}"/><stop offset="1" stop-color="${t[1]}"/></linearGradient>`;
}

function ticksPath(count, r1, r2, skip = () => false) {
  let d = '';
  for (let i = 0; i < count; i++) {
    if (skip(i)) continue;
    const a = i * 360 / count, [x1, y1] = pt(r1, a), [x2, y2] = pt(r2, a);
    d += `M${x1} ${y1}L${x2} ${y2}`;
  }
  return d;
}
function ringText(txt, r, deg, size, fill, weight = 600) {
  const [x, y] = pt(r, deg);
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="middle" dominant-baseline="central" transform="rotate(${n(deg)} ${x} ${y})">${txt}</text>`;
}
function arc(r, a1, a2) {
  const [x1, y1] = pt(r, a1), [x2, y2] = pt(r, a2);
  return `M${x1} ${y1}A${r} ${r} 0 ${((a2 - a1 + 360) % 360) > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}
function triangle(rOut, rIn, half, fill, stroke = 'none') {
  const [a, b] = pt(rOut, -half), [c, d] = pt(rOut, half), [e, f] = pt(rIn, 0);
  return `<path d="M${a} ${b}L${c} ${d}L${e} ${f}Z" fill="${fill}" stroke="${stroke}" stroke-width=".6"/>`;
}

/* ---------- bracelet ---------- */
function bracelet(s, id) {
  const base = `url(#${id}b)`, acc = `url(#${id}a)`;
  const gap = 'rgba(0,0,0,.38)';
  const zones = [[0, 54], [196, 250]];
  const rowsIn = (step, off = 0) => {
    const ys = [];
    for (const [a, b] of zones) for (let y = a - step + (off % step); y < b; y += step) ys.push(y);
    return ys;
  };
  const hlines = (x, w, step, off = 0) =>
    rowsIn(step, off).map(y => `M${x} ${n(y)}h${w}`).join('');
  const col = (x, w, fill) => `<rect x="${x}" y="0" width="${w}" height="250" fill="${fill}"/>`;
  const linkRects = (x, w, step, fill, rx) =>
    rowsIn(step).map(y => `<rect x="${n(x + .4)}" y="${n(y + .5)}" width="${n(w - .8)}" height="${n(step - 1)}" rx="${rx}" fill="${fill}"/>`).join('');
  let body = '';
  switch (s.bracelet) {
    case 'jubilee': {
      body = col(72, 13, base) + col(85, 6, acc) + col(91, 18, acc) + col(109, 6, acc) + col(115, 13, base)
        + `<path d="${hlines(72, 13, 10)}${hlines(115, 13, 10)}${hlines(85, 6, 6, 3)}${hlines(109, 6, 6, 3)}${hlines(91, 18, 6)}M85 0v250M91 0v250M109 0v250M115 0v250" stroke="${gap}" stroke-width=".8"/>`;
      break;
    }
    case 'flat-jubilee': {
      body = col(72, 56, base) + [72, 83.2, 94.4, 105.6, 116.8].map((x, i) => linkRects(x, 11.2, 7, i % 2 ? acc : base, 1.2)).join('');
      break;
    }
    case 'president': {
      body = `<rect x="72" y="0" width="56" height="250" fill="rgba(0,0,0,.35)"/>` + [72, 90.7, 109.3].map(x => linkRects(x, 18.7, 8, acc, 3.6)).join('');
      break;
    }
    case 'pearlmaster': {
      body = `<rect x="72" y="0" width="56" height="250" fill="rgba(0,0,0,.35)"/>` + [72, 83.2, 94.4, 105.6, 116.8].map(x => linkRects(x, 11.2, 6, acc, 2.6)).join('');
      break;
    }
    case 'oysterflex': {
      body = `<rect x="72" y="0" width="56" height="250" fill="#1b1c1e"/>
<path d="M86 0v250M114 0v250" stroke="#2e3034" stroke-width="3"/><path d="M73 0v250M127 0v250" stroke="#2a2b2e" stroke-width="1.5"/>`;
      break;
    }
    case 'leather': {
      const warm = ['yellow-gold', 'everose', 'rose-gold'].includes(metalAccent(s.metal));
      const c = warm ? '#5a3620' : '#1d1c1b';
      body = `<rect x="72" y="0" width="56" height="250" fill="${c}"/><rect x="72" y="0" width="56" height="250" fill="url(#${id}lt)"/>
<path d="M75.5 0v250M124.5 0v250" stroke="${warm ? '#d9bf98' : '#6b6a66'}" stroke-width=".6" stroke-dasharray="2.2 1.6" opacity=".7"/>`;
      break;
    }
    default: { // oyster + riveted oyster
      body = col(72, 17, base) + col(89, 22, acc) + col(111, 17, base)
        + `<path d="${hlines(72, 56, 13)}M89 0v250M111 0v250" stroke="${gap}" stroke-width=".8"/>`;
      if (s.bracelet === 'rivet') body += rowsIn(13).map(y => `<circle cx="74.5" cy="${n(y + 6.5)}" r=".9" fill="${gap}"/><circle cx="125.5" cy="${n(y + 6.5)}" r=".9" fill="${gap}"/>`).join('');
    }
  }
  return `<g clip-path="url(#${id}br)">${body}<rect x="72" y="0" width="56" height="250" fill="url(#${id}sh)"/></g>`;
}

/* ---------- bezel ---------- */
function bezel(s, id, accTone) {
  const { type, colors } = parseBezel(s.bezel);
  const metallic = c => !c || BEZEL_COLORS[c]?.[1] === null;
  const fillOf = c => (metallic(c) ? `url(#${id}a)` : BEZEL_COLORS[c]?.[1] || '#17191b');
  const warm = ['yellow-gold', 'everose'].includes(metalAccent(s.metal));
  const ink = warm ? accTone[0] : '#ecebe7';
  const darkInk = '#2a2b2e';
  const ring = (fill, extra = '') => `<circle cx="${CX}" cy="${CY}" r="58" fill="none" stroke="${fill}" stroke-width="12" ${extra}/>`;
  const edges = `<circle cx="${CX}" cy="${CY}" r="64" fill="none" stroke="rgba(0,0,0,.28)" stroke-width=".6"/><circle cx="${CX}" cy="${CY}" r="52.2" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".7"/>`;
  let out = '';
  switch (type) {
    case 'fluted': {
      const C = 2 * Math.PI * 58, d = n(C / 120);
      out = ring(`url(#${id}a)`) + ring('rgba(0,0,0,.30)', `stroke-dasharray="${d} ${d}"`)
        + ring('rgba(255,255,255,.55)', `stroke-width="12" stroke-dasharray=".9 ${n(d * 2 - .9)}" stroke-dashoffset="${n(d * .2)}"`)
        + `<circle cx="${CX}" cy="${CY}" r="63.2" fill="none" stroke="url(#${id}a)" stroke-width="1.6"/>`;
      break;
    }
    case 'engine': {
      out = ring(`url(#${id}a)`) + ring('rgba(0,0,0,.18)', `stroke-dasharray=".7 1.6"`);
      break;
    }
    case 'dive': case 'ym': case 'turn': case 'regatta': {
      const c = colors[0];
      const metalRing = metallic(c);
      const fg = metalRing ? darkInk : (type === 'regatta' ? '#f2f2ee' : ink);
      out = ring(fillOf(c));
      if (metalRing && type !== 'turn') out += ring('rgba(0,0,0,.06)');
      if (type === 'regatta') {
        for (let k = 1; k <= 9; k++) out += ringText(String(10 - k), 58, k * 36, 6.4, fg);
        out += `<path d="${ticksPath(60, 63.2, 61.2, i => i % 6 === 0)}" stroke="${fg}" stroke-width=".5"/>`;
      } else {
        out += `<path d="${ticksPath(60, 63.4, 61.3, i => i % 5 === 0 || (type === 'dive' && i > 15))}" stroke="${fg}" stroke-width=".55"/>`;
        out += `<path d="${ticksPath(12, 63.4, 55.5, i => i % 2 === 0)}" stroke="${fg}" stroke-width="1.7"/>`;
        for (const m of [10, 20, 30, 40, 50]) out += ringText(m, 58, m * 6, 7.6, fg, type === 'ym' ? 700 : 600);
      }
      out += triangle(63.6, 53.6, 5.2, fg) + (type === 'dive' ? `<circle cx="${CX}" cy="${CY - 60}" r="1.7" fill="${LUME}" stroke="${fg}" stroke-width=".5"/>` : '');
      break;
    }
    case 'gmt': case 'e2': {
      const steel = type === 'e2';
      if (steel) out = ring(`url(#${id}a)`);
      else {
        const [top, bot = top] = colors;
        out = `<path d="${arc(58, 270, 90)}" fill="none" stroke="${fillOf(top)}" stroke-width="12"/><path d="${arc(58, 90, 270)}" fill="none" stroke="${fillOf(bot)}" stroke-width="12"/>`;
      }
      const fg = steel ? darkInk : ink;
      for (let h = 2; h <= 22; h += 2) out += ringText(h, 58, h * 15, 6.8, fg);
      out += `<path d="${ticksPath(24, 62.8, 55.8, i => i % 2 === 0)}" stroke="${fg}" stroke-width="1.6"/>`;
      out += triangle(63.6, 53.6, 5.2, fg);
      break;
    }
    case 'tachy': {
      const c = colors[0];
      out = ring(fillOf(c));
      const fg = metallic(c) ? darkInk : ink;
      const scale = [400, 300, 250, 200, 150, 125, 100, 90, 80, 70, 60];
      let d = '';
      for (const v of scale) {
        const a = 21600 / v;
        const [x1, y1] = pt(63.6, a), [x2, y2] = pt(61, a);
        d += `M${x1} ${y1}L${x2} ${y2}`;
        out += ringText(v, 57.2, a === 360 ? 0 : a - 4.5, 4.6, fg, 500);
      }
      out += `<path d="${d}" stroke="${fg}" stroke-width=".6"/>`;
      out += ringText('TACHYMETRE', 57.2, 26, 3.4, fg, 500);
      break;
    }
    default: // smooth / domed
      out = ring(`url(#${id}a)`) + `<circle cx="${CX}" cy="${CY}" r="58" fill="none" stroke="url(#${id}hl)" stroke-width="12"/>`;
  }
  return out + edges;
}

/* ---------- dial ---------- */
function dialFace(s, id, dial, print) {
  let out = `<circle cx="${CX}" cy="${CY}" r="52" fill="url(#${id}d)"/>`;
  if (dial.sunray) {
    let a = '', b = '';
    for (let i = 0; i < 120; i++) {
      const [x1, y1] = pt(3, i * 3), [x2, y2] = pt(52, i * 3);
      if (i % 2) a += `M${x1} ${y1}L${x2} ${y2}`; else b += `M${x1} ${y1}L${x2} ${y2}`;
    }
    out += `<path d="${a}" stroke="#fff" stroke-opacity=".07" stroke-width="1.1"/><path d="${b}" stroke="#000" stroke-opacity=".07" stroke-width="1.1"/>`;
  }
  const r = rng(s.dial + s.family);
  if (dial.pattern === 'meteorite') {
    let d = '';
    for (let i = 0; i < 70; i++) {
      const ang = [20, 80, 140][i % 3] * Math.PI / 180, len = 6 + r() * 26;
      const x = CX - 50 + r() * 100, y = CY - 50 + r() * 100;
      d += `M${n(x)} ${n(y)}l${n(Math.cos(ang) * len)} ${n(Math.sin(ang) * len)}`;
    }
    out += `<g clip-path="url(#${id}c)"><path d="${d}" stroke="#4d4f53" stroke-opacity=".35" stroke-width=".7"/></g>`;
  } else if (dial.pattern === 'mop') {
    out += `<circle cx="${CX}" cy="${CY}" r="52" fill="url(#${id}mop)" opacity=".75"/>`;
  } else if (dial.pattern === 'stone') {
    let d = '', e = '';
    for (let i = 0; i < 16; i++) {
      const y = CY - 54 + i * 7 + r() * 3;
      const p = `M${CX - 56} ${n(y)}C${CX - 25} ${n(y - 8 + r() * 16)} ${CX + 20} ${n(y - 8 + r() * 16)} ${CX + 56} ${n(y + r() * 6)}`;
      if (i % 3 === 0) e += p; else d += p;
    }
    out += `<g clip-path="url(#${id}c)"><path d="${d}" fill="none" stroke="#c9963f" stroke-opacity=".55" stroke-width="2.2"/><path d="${e}" fill="none" stroke="#2b1a10" stroke-opacity=".6" stroke-width="2.6"/></g>`;
  }
  if (dial.track) out += `<circle cx="${CX}" cy="${CY}" r="49.6" fill="none" stroke="${dial.track}" stroke-width="3.4"/>`;
  const tickInk = dial.track ? '#ecebe6' : print;
  out += `<path d="${ticksPath(60, 51, 49.2, i => i % 5 === 0)}" stroke="${tickInk}" stroke-opacity=".75" stroke-width=".42"/>`;
  out += `<path d="${ticksPath(12, 51, 48.2)}" stroke="${tickInk}" stroke-opacity=".85" stroke-width=".8"/>`;
  return out;
}

function indices(s, id, dial, print) {
  const idx = `url(#${id}i)`;
  const dateAt = s.date ? (s.lefty ? 270 : 90) : null;
  let out = '';
  const baton = (deg, r1 = 47, r2 = 37, w = 2.8) => {
    const [x, y] = pt((r1 + r2) / 2, deg);
    return `<rect x="${n(x - w / 2)}" y="${n(y - (r1 - r2) / 2)}" width="${w}" height="${r1 - r2}" rx=".5" fill="${idx}" stroke="rgba(0,0,0,.35)" stroke-width=".3" transform="rotate(${deg} ${x} ${y})"/>`;
  };
  switch (s.idx) {
    case 'dive': {
      for (let h = 1; h <= 12; h++) {
        const deg = h * 30;
        if (deg === dateAt) continue;
        if (h === 12) out += triangle(47, 35.5, 7.5, LUME, '#bfc2c6').replace('stroke-width=".6"', 'stroke-width="1"');
        else if (h % 3 === 0) {
          const [x, y] = pt(40.5, deg);
          out += `<rect x="${n(x - 2.5)}" y="${n(y - 6.5)}" width="5" height="13" rx=".6" fill="${LUME}" stroke="${idx}" stroke-width="1" transform="rotate(${deg} ${x} ${y})"/>`;
        } else {
          const [x, y] = pt(42.5, deg);
          out += `<circle cx="${x}" cy="${y}" r="3.9" fill="${LUME}" stroke="${idx}" stroke-width="1"/>`;
        }
      }
      break;
    }
    case 'explorer': case 'airking': {
      for (let h = 1; h <= 12; h++) {
        const deg = h * 30;
        if (deg === dateAt) continue;
        if (h === 12) out += triangle(47, 37, 6.5, LUME, '#c4c6ca').replace('stroke-width=".6"', 'stroke-width="1"');
        else if (h % 3 === 0) {
          const [x, y] = pt(39.5, deg);
          out += `<text x="${x}" y="${y}" font-size="13" font-weight="600" fill="${LUME}" stroke="${idx}" stroke-width=".7" text-anchor="middle" dominant-baseline="central">${h}</text>`;
        } else out += baton(deg, 47, 39, 2.6);
      }
      if (s.idx === 'airking') {
        for (let m = 5; m < 60; m += 5) if (m % 15) out += ringText(String(m).padStart(2, '0'), 45.5, m * 6, 3.4, print, 500);
      }
      break;
    }
    case 'daytona': {
      for (let h = 1; h <= 12; h++) {
        if (h % 3 === 0 && h !== 12) continue;
        out += h === 12 ? baton(-3, 48, 41, 2.2) + baton(3, 48, 41, 2.2) : baton(h * 30, 48, 41, 2.4);
      }
      const subs = dial.subs || (luminance(dial.hex) < .35 ? mix(dial.hex, '#000', .35) : mix(dial.hex, '#000', .1));
      const subInk = luminance(subs) < .35 ? '#e8e8e4' : '#1c1d1f';
      for (const [deg, hand] of [[90, 210], [180, 120], [270, 30]]) {
        const [x, y] = pt(22, deg);
        let d = '';
        for (let i = 0; i < 12; i++) {
          const a = (i * 30 - 90) * Math.PI / 180;
          d += `M${n(x + Math.cos(a) * 10.4)} ${n(y + Math.sin(a) * 10.4)}L${n(x + Math.cos(a) * 8.6)} ${n(y + Math.sin(a) * 8.6)}`;
        }
        const ha = (hand - 90) * Math.PI / 180;
        out += `<circle cx="${x}" cy="${y}" r="11.2" fill="${subs}" stroke="${idx}" stroke-width=".9"/>
<circle cx="${x}" cy="${y}" r="11.2" fill="url(#${id}sub)"/>
<path d="${d}" stroke="${subInk}" stroke-width=".5"/>
<path d="M${x} ${y}L${n(x + Math.cos(ha) * 9)} ${n(y + Math.sin(ha) * 9)}" stroke="${idx}" stroke-width="1.1" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="1.2" fill="${idx}"/>`;
      }
      break;
    }
    default: { // baton, daydate, sky, roman
      const roman = dial.roman;
      const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      for (let h = 1; h <= 12; h++) {
        const deg = h * 30;
        if (deg === dateAt) continue;
        if (h === 12 && s.idx === 'daydate') continue;
        if (roman) {
          const [x, y] = pt(40.5, deg);
          out += `<text x="${x}" y="${y}" font-size="7.6" font-family="Georgia, serif" fill="${roman}" text-anchor="middle" dominant-baseline="central" transform="rotate(${deg} ${x} ${y})">${R[h % 12]}</text>`;
        } else out += h === 12 ? baton(-3.2, 47, 37, 2.4) + baton(3.2, 47, 37, 2.4) : baton(deg);
      }
      if (s.idx === 'sky') {
        for (let h = 1; h <= 12; h++) {
          const [x, y] = pt(49.4, h * 30);
          out += `<rect x="${n(x - 1.6)}" y="${n(y - 1.1)}" width="3.2" height="2.2" fill="${h === 10 ? '#c8202f' : '#fbfaf6'}" transform="rotate(${h * 30} ${x} ${y})"/>`;
        }
        out += `<circle cx="${CX}" cy="${CY + 21}" r="12.5" fill="none" stroke="${print}" stroke-opacity=".55" stroke-width=".6"/>
<circle cx="${CX}" cy="${CY + 21}" r="9.5" fill="none" stroke="${print}" stroke-opacity=".25" stroke-width="5" stroke-dasharray=".4 2.07"/>
<path d="M${CX - 1.6} ${CY + 7.6}L${CX + 1.6} ${CY + 7.6}L${CX} ${CY + 10.4}Z" fill="#c8202f"/>`;
      }
    }
  }
  if (s.idx === 'daydate' || s.day) {
    out += `<rect x="${CX - 16}" y="${CY - 43}" width="32" height="9.6" rx="1.4" fill="#fbfaf6" stroke="${idx}" stroke-width=".8"/>
<text x="${CX}" y="${CY - 38}" font-size="5.6" font-weight="700" letter-spacing=".3" fill="#1b1c1e" text-anchor="middle" dominant-baseline="central">MONDAY</text>`;
  }
  if (dateAt !== null && s.idx !== 'daytona') {
    const x = dateAt === 90 ? CX + 32.5 : CX - 45.5;
    out += `<rect x="${x}" y="${CY - 5.6}" width="13" height="11.2" rx=".6" fill="#fbfaf6" stroke="${idx}" stroke-width=".7"/>
<text x="${x + 6.5}" y="${CY + .3}" font-size="9" font-weight="700" fill="#1b1c1e" text-anchor="middle" dominant-baseline="central">28</text>
<rect x="${x - 2.4}" y="${CY - 8}" width="17.8" height="16" rx="2.6" fill="url(#${id}cy)" stroke="#fff" stroke-opacity=".5" stroke-width=".45"/>`;
  }
  const textY = s.idx === 'daytona' ? CY - 29 : s.idx === 'sky' ? CY - 18 : CY + 20;
  const label = s.idx === 'daytona' ? 'COSMOGRAPH' : s.label;
  if (label) {
    const size = label.length > 20 ? 2.9 : 3.5;
    out += `<text x="${CX}" y="${textY}" font-size="${size}" font-weight="600" letter-spacing=".55" fill="${print}" fill-opacity=".9" text-anchor="middle" dominant-baseline="central">${label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
  }
  return out;
}

/* ---------- hands (fixed at the classic 10:08:37) ---------- */
function hands(s, id) {
  const idx = `url(#${id}i)`;
  const H = (10 + 8 / 60) * 30, M = 8 * 6 + 37 / 10, S = 37 * 6, G = (16 + 8 / 60) * 15;
  const rot = (a, body) => `<g transform="rotate(${n(a)} ${CX} ${CY})">${body}</g>`;
  const at = d => d.replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, x, y) => `${n(CX + +x)} ${n(CY + +y)}`);
  let out = '';
  if (s.gmt) {
    const c = HAND_COLORS[s.gh] || HAND_COLORS.red;
    out += rot(G, `<path d="${at('M0 4 L0 -39')}" stroke="${c}" stroke-width=".9"/><path d="${at('M-3.6 -37.5 L0 -46.5 L3.6 -37.5 Z')}" fill="${c}" stroke="${idx}" stroke-width=".5"/>`);
  }
  if (s.hands === 'mercedes') {
    out += rot(H, `<path d="${at('M-1.6 6 L-1.6 -13.5 L1.6 -13.5 L1.6 6 Z')}" fill="${idx}"/>
<circle cx="${CX}" cy="${CY - 19}" r="5.2" fill="${LUME}" stroke="${idx}" stroke-width="1.25"/>
<path d="${at('M0 -19 L0 -24.2 M0 -19 L-4.5 -16.4 M0 -19 L4.5 -16.4')}" stroke="${idx}" stroke-width="1"/>
<path d="${at('M-2.7 -23.4 L0 -30 L2.7 -23.4 Z')}" fill="${LUME}" stroke="${idx}" stroke-width=".8"/>`);
    out += rot(M, `<path d="${at('M-1.3 7 L-2.1 -32 L0 -43.5 L2.1 -32 L1.3 7 Z')}" fill="${idx}"/><path d="${at('M-0.9 -8 L-1.35 -31 L0 -38.5 L1.35 -31 L0.9 -8 Z')}" fill="${LUME}"/>`);
  } else {
    out += rot(H, `<path d="${at('M-1.9 6 L-1.9 -26 L0 -29.5 L1.9 -26 L1.9 6 Z')}" fill="${idx}" stroke="rgba(0,0,0,.3)" stroke-width=".25"/><path d="${at('M-0.7 -7 L-0.7 -25 L0.7 -25 L0.7 -7 Z')}" fill="${LUME}" opacity=".9"/>`);
    out += rot(M, `<path d="${at('M-1.6 7 L-1.6 -40 L0 -44 L1.6 -40 L1.6 7 Z')}" fill="${idx}" stroke="rgba(0,0,0,.3)" stroke-width=".25"/><path d="${at('M-0.6 -8 L-0.6 -39 L0.6 -39 L0.6 -8 Z')}" fill="${LUME}" opacity=".9"/>`);
  }
  if (s.family === 'milgauss') {
    out += rot(S, `<path d="${at('M0 11 L0 -18 L-2.6 -22 L2.6 -28 L0 -32 L0 -46')}" fill="none" stroke="${HAND_COLORS.orange}" stroke-width="1" stroke-linejoin="round"/>`);
  } else if (s.hands === 'mercedes') {
    out += rot(S, `<path d="${at('M0 12 L0 -46')}" stroke="${idx}" stroke-width=".8"/><circle cx="${CX}" cy="${CY - 33}" r="2.5" fill="${LUME}" stroke="${idx}" stroke-width=".7"/><circle cx="${CX}" cy="${CY + 10}" r="1.7" fill="${idx}"/>`);
  } else {
    out += rot(S, `<path d="${at('M0 13 L0 -47')}" stroke="${idx}" stroke-width=".6"/>`);
  }
  return out + `<circle cx="${CX}" cy="${CY}" r="2.5" fill="${idx}"/><circle cx="${CX}" cy="${CY}" r=".9" fill="rgba(0,0,0,.45)"/>`;
}

/* ---------- case furniture ---------- */
function crownAndCase(s, id) {
  const base = `url(#${id}b)`, acc = `url(#${id}a)`;
  const side = s.lefty ? 270 : 90;
  const r = (a, body) => `<g transform="rotate(${a} ${CX} ${CY})">${body}</g>`;
  let out = '';
  if (s.guards) out += r(side, `<path d="M${CX - 13} ${CY - 61} Q${CX - 10} ${CY - 73} ${CX - 5} ${CY - 73} L${CX + 5} ${CY - 73} Q${CX + 10} ${CY - 73} ${CX + 13} ${CY - 61} Z" fill="${base}"/>`);
  out += r(side, `<rect x="${CX - 3.5}" y="${CY - 71}" width="7" height="6" fill="${base}"/><rect x="${CX - 7.5}" y="${CY - 77}" width="15" height="8" rx="1.6" fill="${acc}" stroke="rgba(0,0,0,.3)" stroke-width=".4"/>
<path d="M${CX - 5} ${CY - 76.4}v6.8M${CX - 2.5} ${CY - 76.4}v6.8M${CX} ${CY - 76.4}v6.8M${CX + 2.5} ${CY - 76.4}v6.8M${CX + 5} ${CY - 76.4}v6.8" stroke="rgba(0,0,0,.25)" stroke-width=".5"/>`);
  if (s.pushers) for (const a of [side - 30, side + 30]) out += r(a, `<rect x="${CX - 2.4}" y="${CY - 71}" width="4.8" height="5" fill="${base}"/><rect x="${CX - 4.6}" y="${CY - 76}" width="9.2" height="6" rx="1.4" fill="${acc}" stroke="rgba(0,0,0,.3)" stroke-width=".4"/>`);
  out += `<path d="M70 50Q70 47 73 47H127Q130 47 130 50L132 82H68ZM68 168H132L130 200Q130 203 127 203H73Q70 203 70 200Z" fill="${base}" stroke="rgba(0,0,0,.25)" stroke-width=".5"/><path d="M72 52.5H128M72 197.5H128" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>
<circle cx="${CX}" cy="${CY}" r="67" fill="${base}" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>`;
  return out;
}

export function renderWatch(src, { title = '' } = {}) {
  const s = src.idx ? src : specFrom(src);
  const id = 'w' + (++seq).toString(36);
  const baseTone = METALS[metalBase(s.metal)].tone;
  const accTone = METALS[metalAccent(s.metal)].tone;
  const accentKey = metalAccent(s.metal);
  const idxTone = METALS[['yellow-gold', 'everose', 'rose-gold'].includes(accentKey) ? accentKey : 'white-gold'].tone;
  const dial = DIALS[s.dial] || DIALS.black;
  const dark = luminance(dial.hex) < 0.32;
  const print = dial.print || (dark ? '#efefea' : '#1b1c1e');
  const dialGrad = dial.fade
    ? `<linearGradient id="${id}d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(dial.hex, '#fff', .08)}"/><stop offset=".55" stop-color="${mix(dial.hex, dial.fade, .45)}"/><stop offset="1" stop-color="${dial.fade}"/></linearGradient>`
    : `<radialGradient id="${id}d" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="${mix(dial.hex, '#fff', dark ? .1 : .3)}"/><stop offset=".65" stop-color="${dial.hex}"/><stop offset="1" stop-color="${mix(dial.hex, '#000', .28)}"/></radialGradient>`;
  const label = title || s.label;
  return `<svg class="watch-svg" viewBox="0 0 200 250" role="img" aria-label="${label.replace(/"/g, '')}" font-family="Inter, system-ui, sans-serif">
<defs>
${lin(id + 'b', baseTone)}${lin(id + 'a', accTone)}${lin(id + 'i', idxTone, 0.4, 1)}${dialGrad}
<linearGradient id="${id}sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".18" stop-color="#000" stop-opacity="0"/><stop offset=".82" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
<linearGradient id="${id}lt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".5" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="${id}hl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient>
<linearGradient id="${id}mop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7d9e4"/><stop offset=".35" stop-color="#e3f3ef"/><stop offset=".65" stop-color="#ebe3f8"/><stop offset="1" stop-color="#f6eedc"/></linearGradient>
<radialGradient id="${id}sub" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></radialGradient>
<radialGradient id="${id}cy" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity=".04"/></radialGradient>
<radialGradient id="${id}gl" cx=".3" cy=".2" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<clipPath id="${id}c"><circle cx="${CX}" cy="${CY}" r="52"/></clipPath>
<clipPath id="${id}br"><path d="M75 0H125L128 54H72ZM72 196H128L125 250H75Z"/></clipPath>
</defs>
${bracelet(s, id)}
${crownAndCase(s, id)}
${bezel(s, id, accTone)}
${dialFace(s, id, dial, print)}
${indices(s, id, dial, print)}
${hands(s, id)}
<g clip-path="url(#${id}c)"><circle cx="${CX}" cy="${CY}" r="52" fill="url(#${id}gl)"/></g>
</svg>`;
}
