import { FAMILY, DIALS, metalName, dialName, braceletName, bezelName } from '../vocab.js';
import { renderWatch } from '../dial.js';
import { esc, $, $$, toast } from '../util.js';
import { refByKey, watches, allRefs, ownedRefSet, normRef, deleteReference } from '../store.js';
import { hydrate, timeline, legendTimeline, watchCard, famName } from './common.js';

export function render(root, { params }) {
  const r = refByKey(decodeURIComponent(params[0]));
  if (!r) {
    root.innerHTML = `<section class="wrap section empty"><h2 class="display-sm">Reference not in the catalog</h2>
    <p>You can add it yourself — it will be saved with your collection.</p><a class="btn" href="#/ref-new?ref=${encodeURIComponent(params[0])}">Add reference</a></section>`;
    return;
  }
  const sel = { dial: r.dials?.[0], bracelet: r.bracelets?.[0] };
  const mine = watches().filter(w => normRef(w.ref) === normRef(r.ref));
  const siblings = allRefs().filter(x => x.family === r.family);
  const fam = FAMILY[r.family];
  const status = r.to ? `Discontinued ${r.to}` : 'In production';

  root.innerHTML = `
<section class="wrap section ref-page">
  <a class="back" href="#/catalog">← Catalog</a>
  <div class="watch-layout">
    <div class="gallery">
      <div class="gallery-main" id="ref-visual"></div>
      ${(r.dials?.length || 0) > 1 ? `<div class="picker"><span class="label">Dial</span><div class="swatches">${r.dials.map(d => `<button class="swatch-btn" data-pick="${d}" aria-pressed="${d === sel.dial}" data-tip="${esc(dialName(d))}" aria-label="${esc(dialName(d))}"><i style="background:${DIALS[d]?.hex || '#888'}"></i></button>`).join('')}</div></div>` : ''}
      ${(r.bracelets?.length || 0) > 1 ? `<div class="picker"><span class="label">Bracelet</span><div class="seg">${r.bracelets.map(b => `<button data-bracelet="${b}" aria-pressed="${b === sel.bracelet}">${esc(braceletName(b))}</button>`).join('')}</div></div>` : ''}
    </div>
    <div class="watch-info">
      <p class="eyebrow">${esc(famName(r.family))}${r.custom ? ' · <span class="badge custom inline">Custom</span>' : ''}</p>
      <h1 class="display">${esc(r.model)}</h1>
      ${r.nick ? `<p class="nick">“${esc(r.nick)}”</p>` : ''}
      <p class="ref big-ref">Ref. ${esc(r.ref)}</p>
      <p><span class="status ${r.to ? 'off' : 'on'}">${status}</span> <span class="muted">${r.from || '?'}–${r.to ?? 'present'}</span></p>
      <dl class="spec-list">
        <div><dt>Case</dt><dd>${r.size ? `${r.size} mm · ` : ''}${esc(metalName(r.metal))}</dd></div>
        <div><dt>Bezel</dt><dd>${esc(bezelName(r.bezel || 'smooth'))}</dd></div>
        <div><dt>Calibre</dt><dd>${esc(r.caliber || '—')}</dd></div>
        <div><dt>Dials</dt><dd>${(r.dials || []).map(d => `<span class="chip"><i class="sw" style="background:${DIALS[d]?.hex || '#888'}"></i>${esc(dialName(d))}</span>`).join(' ') || '—'}</dd></div>
        <div><dt>Bracelets</dt><dd>${(r.bracelets || []).map(braceletName).map(esc).join(', ') || '—'}</dd></div>
      </dl>
      ${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
      <div class="row-gap">
        <a class="btn" id="add-btn" href="#">Add to my collection</a>
        ${r.custom ? `<a class="btn btn-ghost" href="#/ref-edit/${encodeURIComponent(r.ref)}">Edit reference</a><button class="btn btn-ghost btn-danger" id="del-ref">Delete reference</button>` : ''}
      </div>
      ${mine.length ? `<div class="owned-list"><h3 class="label">In your collection</h3><div class="grid watch-grid compact">${mine.map(watchCard).join('')}</div></div>` : ''}
    </div>
  </div>
</section>
<section class="wrap section">
  <div class="section-head"><div><h2 class="display-sm">${esc(fam?.name || 'Family')} lineage</h2>${fam?.blurb ? `<p class="muted">${esc(fam.blurb)}</p>` : ''}</div>${legendTimeline()}</div>
  ${timeline(siblings, { owned: ownedRefSet(), highlight: r.ref, from: Math.min(...siblings.map(x => x.from || 2000)) - 3, grouped: false })}
</section>`;

  const draw = () => {
    $('#ref-visual', root).innerHTML = `<div class="dial-slot big">${renderWatch({ ...r, dial: sel.dial, bracelet: sel.bracelet })}</div>`;
    $('#add-btn', root).href = `#/add?ref=${encodeURIComponent(r.ref)}${sel.dial ? `&dial=${sel.dial}` : ''}${sel.bracelet ? `&bracelet=${sel.bracelet}` : ''}`;
  };
  draw();
  hydrate(root);
  $$('[data-pick]', root).forEach(b => b.addEventListener('click', () => {
    sel.dial = b.dataset.pick;
    $$('.swatch-btn', root).forEach(x => x.setAttribute('aria-pressed', x === b));
    draw();
  }));
  $$('[data-bracelet]', root).forEach(b => b.addEventListener('click', () => {
    sel.bracelet = b.dataset.bracelet;
    $$('[data-bracelet]', root).forEach(x => x.setAttribute('aria-pressed', x === b));
    draw();
  }));
  $('#del-ref', root)?.addEventListener('click', async () => {
    if (!confirm(`Delete custom reference ${r.ref}? Watches using it are kept.`)) return;
    await deleteReference(r.ref);
    toast('Reference removed');
    location.hash = '#/catalog';
  });
}
