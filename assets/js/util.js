export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const num = v => (v === '' || v === null || v === undefined || isNaN(+v) ? null : +v);
export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);

const fmtCache = new Map();
export function money(v, currency = 'USD', compact = false) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const key = currency + compact;
  if (!fmtCache.has(key)) {
    fmtCache.set(key, new Intl.NumberFormat(undefined, {
      style: 'currency', currency, maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? 'compact' : 'standard',
    }));
  }
  return fmtCache.get(key).format(v);
}
export const pct = (v, digits = 1) => (v === null || !isFinite(v) ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v * 100).toFixed(digits)}%`);
export const signedMoney = (v, c) => (v === null ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : ''}${money(Math.abs(v), c)}`);

export function yearsSince(dateStr, to = new Date()) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.max(0, (to - d) / (365.25 * 864e5));
}
export function cagr(cost, value, years) {
  if (!cost || !value || !years || years < 0.25) return null;
  return (value / cost) ** (1 / years) - 1;
}
export function fmtDate(s, opts = { year: 'numeric', month: 'short' }) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString(undefined, opts);
}
export const years = (from, to) => (from ? `${from}–${to ?? 'present'}` : '—');

export function debounce(fn, ms = 150) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2600);
}

export function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Downscale an uploaded image to a JPEG data URL so collections stay portable. */
export function resizeImage(file, max = 1400, quality = 0.84) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * k), height: Math.round(img.height * k) });
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

// Shared hover/focus tooltip for any element with data-tip.
export function initTooltips() {
  const tip = $('#tip');
  const show = (el, x, y) => {
    tip.innerHTML = el.dataset.tip;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    const left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2));
    const top = y - r.height - 14 < 8 ? y + 18 : y - r.height - 14;
    tip.style.transform = `translate(${left}px, ${top}px)`;
  };
  document.addEventListener('pointermove', e => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    show(el, e.clientX, e.clientY);
  });
  document.addEventListener('focusin', e => {
    const el = e.target.closest?.('[data-tip]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    show(el, r.left + r.width / 2, r.top);
  });
  document.addEventListener('focusout', () => { tip.hidden = true; });
  window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
}
