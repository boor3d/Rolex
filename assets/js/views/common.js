import { renderWatch } from '../dial.js';
import { FAMILY, FAMILIES, DIALS, metalName, metalSwatch, dialName, braceletName } from '../vocab.js';
import { esc, money, pct, num, yearsSince, cagr, $$ } from '../util.js';
import { currency, refByKey, hasSamples, normRef, refPhotos } from '../store.js';

/* ---------- lazily rendered watch portraits ---------- */
const pending = new Map();
let slotSeq = 0, io;
export const resetSlots = () => pending.clear();
export function dialSlot(src, cls = '') {
  const key = 's' + (++slotSeq);
  pending.set(key, src);
  return `<div class="dial-slot ${cls}" data-dial="${key}"></div>`;
}
export function hydrate(root) {
  io ||= new IntersectionObserver(entries => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target, src = pending.get(el.dataset.dial);
      if (src) { el.innerHTML = renderWatch(src); pending.delete(el.dataset.dial); }
      io.unobserve(el);
    }
  }, { rootMargin: '400px' });
  $$('[data-dial]', root).forEach(el => (el.childElementCount ? null : io.observe(el)));
  fillInBackground();
}
// Visible portraits render first via the observer; the rest fill in during idle time.
let filling = false;
function fillInBackground() {
  if (filling) return;
  filling = true;
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 16));
  const step = () => {
    let done = 0;
    for (const el of document.querySelectorAll('[data-dial]:empty')) {
      const src = pending.get(el.dataset.dial);
      if (!src) continue;
      el.innerHTML = renderWatch(src);
      pending.delete(el.dataset.dial);
      io.unobserve(el);
      if (++done >= 8) break;
    }
    if (done) idle(step); else filling = false;
  };
  setTimeout(() => idle(step), 250);
}
/* ---------- photos ---------- */
export const creditText = p => `Photo: ${p.author} · ${p.license} · Wikimedia Commons`;
export function creditLine(p) {
  const lic = p.licenseUrl ? `<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener">${esc(p.license)}</a>` : esc(p.license);
  return `Photo: <a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.author)}</a>, ${lic}, via Wikimedia Commons`;
}
function photoSlot(src, alt, cls, credit = '') {
  return `<div class="photo-slot ${cls}"${credit ? ` data-tip="${esc(credit)}"` : ''}><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"></div>`;
}
/** Owner's photo → licensed reference photo → generated illustration. */
export function watchVisual(w, cls = '') {
  if (w.photos?.[0]) return photoSlot(w.photos[0], title(w), cls);
  const rp = w.ref && refPhotos(w.ref)[0];
  if (rp) return photoSlot(rp.src, `${title(w)} (reference photo)`, `${cls} is-ref`, creditText(rp));
  return dialSlot(w, cls);
}

/* ---------- naming ---------- */
export const famName = k => FAMILY[k]?.name || k || 'Other';
export function title(w) {
  return w.model || refByKey(w.ref)?.model || famName(w.family);
}
export const nick = w => w.nickname ?? w.nick ?? '';
export const swatch = bg => `<i class="sw" style="background:${bg}"></i>`;
export const dialSwatch = k => swatch(DIALS[k]?.hex || '#888');
export function specChips(w) {
  return `<span class="chip">${swatch(metalSwatch(w.metal))}${esc(metalName(w.metal))}</span>
<span class="chip">${dialSwatch(w.dial)}${esc(dialName(w.dial))}</span>
<span class="chip">${esc(braceletName(w.bracelet))}</span>`;
}

/* ---------- money ---------- */
export function fin(w) {
  const cost = num(w.purchasePrice), val = num(w.estimatedValue);
  const gain = cost !== null && val !== null ? val - cost : null;
  const yrs = yearsSince(w.purchaseDate);
  return { cost, val, gain, ret: gain !== null && cost ? gain / cost : null, cagr: cagr(cost, val, yrs), yrs };
}
export function totals(ws) {
  let cost = 0, val = 0, both = 0, any = false;
  for (const w of ws) {
    const f = fin(w);
    if (f.val !== null) { val += f.val; any = true; }
    if (f.cost !== null && f.val !== null) { cost += f.cost; both += f.val; }
  }
  return { val: any ? val : null, cost: cost || null, gain: cost ? both - cost : null, ret: cost ? (both - cost) / cost : null };
}
export function delta(ret, gain) {
  if (ret === null || ret === undefined) return '';
  const cls = ret > 0.001 ? 'up' : ret < -0.001 ? 'down' : 'flat';
  const arrow = cls === 'up' ? '▲' : cls === 'down' ? '▼' : '■';
  return `<span class="delta ${cls}"><span aria-hidden="true">${arrow}</span> ${pct(ret)}${gain !== undefined && gain !== null ? ` <span class="delta-abs">${money(Math.abs(gain), currency(), true)}</span>` : ''}</span>`;
}

/* ---------- cards ---------- */
export function watchCard(w) {
  const f = fin(w), n = nick(w);
  return `<a class="card watch-card" href="#/watch/${encodeURIComponent(w.id)}">
  <div class="card-visual">${watchVisual(w)}${w.sample ? '<span class="badge sample">Sample</span>' : ''}</div>
  <div class="card-body">
    <p class="eyebrow">${esc(famName(w.family))}${w.year ? ` · ${esc(w.year)}` : ''}</p>
    <h3 class="card-title">${esc(title(w))}${n ? ` <em>“${esc(n)}”</em>` : ''}</h3>
    <p class="ref">${w.ref ? `Ref. ${esc(w.ref)}` : 'Reference unknown'}${w.size ? ` · ${esc(w.size)} mm` : ''}</p>
    <div class="chips">${specChips(w)}</div>
    ${f.val !== null ? `<div class="card-foot"><span class="value">${money(f.val, currency())}</span>${delta(f.ret)}</div>` : ''}
  </div>
</a>`;
}

export function refCard(r, owned) {
  const rp = refPhotos(r.ref)[0];
  return `<a class="card ref-card${owned ? ' is-owned' : ''}" href="#/ref/${encodeURIComponent(r.ref)}">
  <div class="card-visual">${rp ? photoSlot(rp.src, `${r.ref} ${r.model}`, 'is-ref', creditText(rp)) : dialSlot(r)}${owned ? '<span class="badge owned">In collection</span>' : ''}${r.custom ? '<span class="badge custom">Custom</span>' : ''}</div>
  <div class="card-body">
    <p class="ref-num">${esc(r.ref)}</p>
    <h3 class="card-title">${esc(r.model)}${r.nick ? ` <em>“${esc(r.nick)}”</em>` : ''}</h3>
    <p class="meta">${r.from ? `${r.from}–${r.to ?? 'now'}` : ''}${r.size ? ` · ${r.size} mm` : ''} · ${esc(metalName(r.metal))}</p>
  </div>
</a>`;
}

/* ---------- production timeline ---------- */
export function timeline(refs, { owned = new Set(), highlight = null, from = 1925, to = 2027, grouped = true } = {}) {
  const span = to - from;
  const x = y => ((Math.max(from, Math.min(to, y)) - from) / span) * 100;
  const decades = [];
  for (let d = Math.ceil(from / 10) * 10; d <= to; d += 10) decades.push(d);
  const groups = grouped
    ? FAMILIES.map(f => [f, refs.filter(r => r.family === f.key)]).filter(([, rs]) => rs.length)
    : [[null, refs]];
  const extra = grouped ? refs.filter(r => !FAMILY[r.family]) : [];
  if (extra.length) groups.push([{ name: 'Other' }, extra]);
  const nowYear = new Date().getFullYear();
  const grid = `<div class="tl-grid" aria-hidden="true">${decades.map(d => `<i style="left:${x(d)}%"></i>`).join('')}</div>`;
  const axis = `<div class="tl-row tl-axis"><span class="tl-label"></span><div class="tl-track">${decades.map(d => `<span style="left:${x(d)}%">${d % 20 === 0 || decades.length < 8 ? d : ''}</span>`).join('')}</div></div>`;
  return `<div class="timeline">${axis}${groups.map(([f, rs]) => `
  <div class="tl-group">
    ${f ? `<p class="tl-family">${esc(f.name)}</p>` : ''}
    <div class="tl-rows">${grid}
    ${[...rs].sort((a, b) => (a.from || 0) - (b.from || 0)).map(r => {
      const end = r.to ?? nowYear + 1;
      const isOwned = owned.has(normRef(r.ref));
      const isHi = highlight && normRef(highlight) === normRef(r.ref);
      const tip = `<strong>${esc(r.ref)}</strong> ${esc(r.model)}${r.nick ? ` “${esc(r.nick)}”` : ''}<br>${r.from || '?'}–${r.to ?? 'present'}${isOwned ? '<br>✓ In your collection' : ''}`;
      return `<div class="tl-row${isHi ? ' is-hi' : ''}">
        <a class="tl-label" href="#/ref/${encodeURIComponent(r.ref)}">${esc(r.ref)}</a>
        <div class="tl-track"><a class="tl-bar${isOwned ? ' owned' : ''}${r.to ? '' : ' current'}" href="#/ref/${encodeURIComponent(r.ref)}" style="left:${x(r.from || from)}%;width:${Math.max(0.8, x(end) - x(r.from || from))}%" data-tip="${esc(tip)}" aria-label="${esc(`${r.ref} ${r.model}, ${r.from}–${r.to ?? 'present'}${isOwned ? ', in collection' : ''}`)}"></a></div>
      </div>`;
    }).join('')}</div>
  </div>`).join('')}</div>`;
}

export function legendTimeline() {
  return `<div class="legend"><span><i class="lg-bar"></i>Production run</span><span><i class="lg-bar current"></i>In production</span><span><i class="lg-bar owned"></i>In your collection</span></div>`;
}

export function sampleBanner() {
  if (!hasSamples()) return '';
  return `<div class="banner wrap"><p><strong>This is a demo collection.</strong> Create a free account to catalogue your own watches, photos and valuations.</p>
  <div class="banner-actions"><a class="btn btn-small" href="#/account?mode=signup">Create account</a><a class="btn btn-small btn-ghost" href="#/account">Sign in</a></div></div>`;
}

export function meter(owned, total, label = '') {
  const p = total ? owned / total : 0;
  return `<span class="meter" role="meter" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${owned}" aria-label="${esc(label)}"><i style="width:${p * 100}%"></i></span>`;
}
