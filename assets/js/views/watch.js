import { FAMILY, SETS, metalName, dialName, braceletName, bezelName } from '../vocab.js';
import { esc, money, pct, fmtDate, signedMoney, toast, $, $$ } from '../util.js';
import { watchById, refByKey, currency, deleteWatch, allRefs, ownedRefSet } from '../store.js';
import { dialSlot, hydrate, fin, title, nick, famName, timeline, legendTimeline } from './common.js';

export function render(root, { params }) {
  const w = watchById(decodeURIComponent(params[0]));
  if (!w) {
    root.innerHTML = `<section class="wrap section empty"><h2 class="display-sm">Watch not found</h2><a class="btn" href="#/">Back to the collection</a></section>`;
    return;
  }
  const cur = currency(), f = fin(w), ref = refByKey(w.ref), n = nick(w);
  const photos = w.photos || [];
  const rows = [
    ['Reference', w.ref ? `<a href="#/ref/${encodeURIComponent(w.ref)}">${esc(w.ref)}</a>` : '—'],
    ['Family', esc(famName(w.family))],
    ['Production year', esc(w.year || '—')],
    ['Case', `${w.size ? `${esc(w.size)} mm · ` : ''}${esc(metalName(w.metal))}`],
    ['Bezel', esc(bezelName(w.bezel || 'smooth'))],
    ['Dial', esc(dialName(w.dial))],
    ['Bracelet', esc(braceletName(w.bracelet))],
    ['Calibre', esc(w.caliber || ref?.caliber || '—')],
    ['Set', esc(SETS[w.set] || '—')],
    ['Condition', esc(w.condition || '—')],
    ['Last service', esc(fmtDate(w.lastService))],
    ['Acquired', `${esc(fmtDate(w.purchaseDate, { year: 'numeric', month: 'long', day: 'numeric' }))}${w.purchasedFrom ? ` · ${esc(w.purchasedFrom)}` : ''}`],
  ];
  const siblings = allRefs().filter(r => r.family === w.family);

  root.innerHTML = `
<section class="wrap section watch-page">
  <a class="back" href="#/">← Collection</a>
  <div class="watch-layout">
    <div class="gallery">
      <div class="gallery-main" id="gallery-main">${photos[0] ? `<img src="${esc(photos[0])}" alt="${esc(title(w))}">` : dialSlot(w, 'big')}</div>
      ${photos.length ? `<div class="thumbs">
        ${photos.map((p, i) => `<button class="thumb${i === 0 ? ' active' : ''}" data-photo="${i}" aria-label="Photo ${i + 1}"><img src="${esc(p)}" alt=""></button>`).join('')}
        <button class="thumb" data-photo="render" aria-label="Rendered portrait">${dialSlot(w)}</button>
      </div>` : ''}
    </div>
    <div class="watch-info">
      <p class="eyebrow">${esc(famName(w.family))}${w.sample ? ' · <span class="badge sample inline">Sample</span>' : ''}</p>
      <h1 class="display">${esc(title(w))}</h1>
      ${n ? `<p class="nick">“${esc(n)}”</p>` : ''}
      <p class="ref big-ref">${w.ref ? `Ref. ${esc(w.ref)}` : ''}${w.year ? ` · ${esc(w.year)}` : ''}</p>

      ${f.val !== null || f.cost !== null ? `<div class="value-panel">
        <div class="vp-main"><span class="vp-label">Estimated value</span><span class="vp-value">${money(f.val, cur)}</span>
          ${w.valuationDate ? `<span class="muted small">as of ${esc(fmtDate(w.valuationDate, { year: 'numeric', month: 'short', day: 'numeric' }))}</span>` : ''}</div>
        <dl class="vp-grid">
          <div><dt>Purchase price</dt><dd>${money(f.cost, cur)}</dd></div>
          <div><dt>Change</dt><dd class="${f.gain > 0 ? 'pos' : f.gain < 0 ? 'neg' : ''}">${signedMoney(f.gain, cur)} <small>${pct(f.ret)}</small></dd></div>
          <div><dt>Annualised</dt><dd>${f.cagr === null ? '—' : pct(f.cagr) + ' / yr'}</dd></div>
          <div><dt>Held</dt><dd>${f.yrs === null ? '—' : f.yrs < 1 ? `${Math.round(f.yrs * 12)} mo` : `${f.yrs.toFixed(1)} yrs`}</dd></div>
        </dl>
      </div>` : ''}

      <dl class="spec-list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${w.notes ? `<div class="notes"><h3 class="label">Notes</h3><p>${esc(w.notes).replace(/\n/g, '<br>')}</p></div>` : ''}
      <div class="row-gap">
        <a class="btn" href="#/edit/${encodeURIComponent(w.id)}">Edit</a>
        ${ref ? `<a class="btn btn-ghost" href="#/ref/${encodeURIComponent(ref.ref)}">Reference details</a>` : ''}
        <button class="btn btn-ghost btn-danger" id="del">Delete</button>
      </div>
    </div>
  </div>
</section>
${siblings.length ? `<section class="wrap section">
  <div class="section-head"><div><h2 class="display-sm">The ${esc(FAMILY[w.family]?.name || '')} lineage</h2>
  <p class="muted">Where this reference sits in the family’s production history.</p></div>${legendTimeline()}</div>
  ${timeline(siblings, { owned: ownedRefSet(), highlight: w.ref, from: Math.min(...siblings.map(r => r.from || 2000)) - 3, grouped: false })}
</section>` : ''}`;

  hydrate(root);
  const main = $('#gallery-main', root);
  $$('[data-photo]', root).forEach(b => b.addEventListener('click', () => {
    $$('.thumb', root).forEach(t => t.classList.toggle('active', t === b));
    const i = b.dataset.photo;
    main.innerHTML = i === 'render' ? dialSlot(w, 'big') : `<img src="${esc(photos[+i])}" alt="${esc(title(w))}">`;
    hydrate(main);
  }));
  $('#del', root).addEventListener('click', async () => {
    if (!confirm(`Delete ${title(w)}${w.ref ? ` (${w.ref})` : ''} from the collection?`)) return;
    await deleteWatch(w.id);
    toast('Watch removed');
    location.hash = '#/';
  });
}
