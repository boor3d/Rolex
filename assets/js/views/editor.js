import { CONDITIONS, SETS, DIALS, metalName, dialName, braceletName, bezelName } from '../vocab.js';
import { renderWatch } from '../dial.js';
import { esc, num, uid, toast, resizeImage, $, $$, debounce } from '../util.js';
import { watchById, refByKey, allRefs, saveWatch, saveReference, watches, currency, normRef } from '../store.js';
import { famName } from './common.js';
import { field, text, number, date, select, familyPairs, metalPairs, dialPairs, braceletPairs, bezelPairs, readForm } from './fields.js';

const NUMERIC = ['year', 'size', 'purchasePrice', 'estimatedValue'];

function searchRefs(q) {
  q = q.trim().toLowerCase();
  if (!q) return [];
  const nq = normRef(q).toLowerCase();
  return allRefs()
    .map(r => {
      const ref = normRef(r.ref).toLowerCase();
      const hay = [r.model, r.nick, famName(r.family), r.caliber, metalName(r.metal)].join(' ').toLowerCase();
      const score = ref === nq ? 0 : ref.startsWith(nq) ? 1 : ref.includes(nq) ? 2 : q.split(/\s+/).every(t => hay.includes(t) || ref.includes(t)) ? 3 : 9;
      return [score, r];
    })
    .filter(([s]) => s < 9)
    .sort((a, b) => a[0] - b[0] || (b[1].from || 0) - (a[1].from || 0))
    .slice(0, 8)
    .map(([, r]) => r);
}

export function render(root, { params, query }) {
  const editing = params[0] ? watchById(decodeURIComponent(params[0])) : null;
  if (params[0] && !editing) { root.innerHTML = `<section class="wrap section empty"><h2 class="display-sm">Watch not found</h2></section>`; return; }
  const w = editing ? structuredClone(editing) : { id: uid(), photos: [], bezel: 'smooth', metal: 'steel', dial: 'black', bracelet: 'oyster' };
  let photos = [...(w.photos || [])];

  // Pre-fill from ?ref= when arriving from the catalog.
  const pre = !editing && query.get('ref') ? refByKey(query.get('ref')) : null;
  if (pre) Object.assign(w, fromRef(pre), { dial: query.get('dial') || pre.dials?.[0], bracelet: query.get('bracelet') || pre.bracelets?.[0] });

  root.innerHTML = `
<section class="wrap section">
  <a class="back" href="${editing ? `#/watch/${encodeURIComponent(w.id)}` : '#/'}">← ${editing ? 'Back to watch' : 'Collection'}</a>
  <h1 class="display">${editing ? 'Edit watch' : 'Add a watch'}</h1>
  <form id="wf" class="editor" autocomplete="off">
    <div class="editor-main">
      <div class="lookup">
        ${field('Start from the catalog', `<input id="ref-search" type="search" placeholder="Reference, model or nickname — e.g. 126610LN, Daytona, Pepsi" aria-controls="ta">`, 'Choosing a reference fills in the specs. You can change any field afterwards.')}
        <div class="ta" id="ta" role="listbox"></div>
      </div>

      <fieldset><legend>Identity</legend><div class="fields">
        ${field('Reference', text('ref', w.ref, 'placeholder="e.g. 126610LN" required'))}
        ${field('Family', select('family', familyPairs(), w.family, 'Choose…'))}
        ${field('Model', text('model', w.model, 'placeholder="e.g. Submariner Date"'))}
        ${field('Nickname', text('nickname', w.nickname, 'placeholder="e.g. Hulk"'))}
        ${field('Production year', number('year', w.year, 'min="1900" max="2100" step="1"'), '', '')}
        ${field('Case size (mm)', number('size', w.size, 'min="20" max="60" step="1"'))}
        ${field('Calibre', text('caliber', w.caliber))}
      </div></fieldset>

      <fieldset><legend>Configuration</legend><div class="fields">
        ${field('Metal', select('metal', metalPairs(), w.metal, null))}
        ${field('Bezel', select('bezel', bezelPairs(w.bezel), w.bezel, null))}
        ${field('Dial', select('dial', dialPairs(), w.dial, null), '<span id="dial-opts" class="swatches small"></span>')}
        ${field('Bracelet', select('bracelet', braceletPairs(), w.bracelet, null))}
      </div></fieldset>

      <fieldset><legend>Acquisition &amp; value <span class="muted small">(${esc(currency())})</span></legend><div class="fields">
        ${field('Purchase date', date('purchaseDate', w.purchaseDate))}
        ${field('Purchase price', number('purchasePrice', w.purchasePrice, 'min="0" step="1"'))}
        ${field('Purchased from', text('purchasedFrom', w.purchasedFrom, 'placeholder="AD, dealer, auction…"'))}
        ${field('Estimated value', number('estimatedValue', w.estimatedValue, 'min="0" step="1"'), 'Today’s market estimate — update it whenever you check prices.')}
        ${field('Valuation date', date('valuationDate', w.valuationDate || new Date().toISOString().slice(0, 10)))}
      </div></fieldset>

      <fieldset><legend>Provenance</legend><div class="fields">
        ${field('Set', select('set', Object.entries(SETS), w.set, '—'))}
        ${field('Condition', select('condition', CONDITIONS.map(c => [c, c]), w.condition, '—'))}
        ${field('Last service', date('lastService', w.lastService))}
        ${field('Notes', `<textarea name="notes" rows="4" placeholder="Story, provenance, service history…">${esc(w.notes || '')}</textarea>`, '', 'span-2')}
        <label class="check span-2"><input type="checkbox" name="featured" ${w.featured ? 'checked' : ''}> Feature this watch on the home page</label>
      </div></fieldset>

      <fieldset><legend>Photos</legend>
        <label class="dropzone" id="drop">
          <input type="file" id="files" accept="image/*" multiple hidden>
          <span><strong>Drop photos here</strong> or click to choose. The first photo becomes the cover; images are resized to 1400 px.</span>
        </label>
        <div class="photo-list" id="photo-list"></div>
      </fieldset>

      <label class="check" id="addref-wrap" hidden><input type="checkbox" name="addRef" checked> Also add <strong id="addref-name"></strong> to my reference catalog</label>

      <div class="row-gap form-actions">
        <button class="btn" type="submit">${editing ? 'Save changes' : 'Add to collection'}</button>
        <a class="btn btn-ghost" href="${editing ? `#/watch/${encodeURIComponent(w.id)}` : '#/'}">Cancel</a>
      </div>
    </div>
    <aside class="editor-preview">
      <div class="preview-card">
        <div id="preview" class="dial-slot big"></div>
        <div id="preview-meta" class="preview-meta"></div>
      </div>
    </aside>
  </form>
</section>`;

  const form = $('#wf', root);
  const set = (name, v) => { const el = form.elements[name]; if (el && v !== undefined && v !== null) el.value = v; };

  function current() {
    const o = readForm(form);
    for (const k of NUMERIC) o[k] = num(o[k]);
    return o;
  }
  function preview() {
    const o = current();
    const ref = refByKey(o.ref);
    $('#preview', root).innerHTML = renderWatch({ ...ref, ...o, model: o.model || ref?.model, lefty: ref?.lefty, gh: ref?.gh, guards: ref?.guards, day: ref?.day });
    $('#preview-meta', root).innerHTML = `<p class="eyebrow">${esc(famName(o.family) || '')}</p>
      <p class="preview-title">${esc(o.model || 'Untitled')}${o.nickname ? ` “${esc(o.nickname)}”` : ''}</p>
      <p class="muted small">${esc(o.ref || '')}${o.year ? ` · ${o.year}` : ''}${o.size ? ` · ${o.size} mm` : ''}</p>
      <p class="muted small">${esc(metalName(o.metal))} · ${esc(bezelName(o.bezel))}<br>${esc(dialName(o.dial))} dial · ${esc(braceletName(o.bracelet))}</p>`;
    const unknown = o.ref && !ref;
    $('#addref-wrap', root).hidden = !unknown;
    $('#addref-name', root).textContent = o.ref;
    const dials = ref?.dials || [];
    $('#dial-opts', root).innerHTML = dials.length > 1 ? dials.map(d => `<button type="button" class="swatch-btn" data-pick="${d}" aria-pressed="${d === o.dial}" data-tip="${esc(dialName(d))}" aria-label="${esc(dialName(d))}"><i style="background:${DIALS[d]?.hex}"></i></button>`).join('') : '';
  }
  function applyRef(r) {
    const f = fromRef(r);
    for (const [k, v] of Object.entries(f)) set(k, v);
    set('dial', r.dials?.[0]);
    set('bracelet', r.bracelets?.[0]);
    if (!form.elements.year.value) form.elements.year.placeholder = `${r.from || ''}–${r.to ?? 'now'}`;
    preview();
  }
  function drawPhotos() {
    $('#photo-list', root).innerHTML = photos.map((p, i) => `<figure class="photo-item">
      <img src="${esc(p)}" alt="">
      <figcaption>${i === 0 ? '<span class="badge owned">Cover</span>' : `<button type="button" class="link" data-cover="${i}">Make cover</button>`}
      <button type="button" class="link danger" data-remove="${i}">Remove</button></figcaption></figure>`).join('');
  }
  async function addFiles(files) {
    for (const f of [...files].filter(f => f.type.startsWith('image/'))) {
      try { photos.push(await resizeImage(f)); } catch (e) { toast(e.message); }
    }
    drawPhotos();
  }

  // Typeahead
  const ta = $('#ta', root), input = $('#ref-search', root);
  input.addEventListener('input', debounce(() => {
    const rs = searchRefs(input.value);
    ta.innerHTML = rs.map((r, i) => `<button type="button" role="option" data-i="${i}">
      <span class="ta-ref">${esc(r.ref)}</span><span class="ta-model">${esc(r.model)}${r.nick ? ` “${esc(r.nick)}”` : ''}</span>
      <span class="ta-meta">${r.from || ''}–${r.to ?? 'now'} · ${esc(metalName(r.metal))}</span></button>`).join('')
      || (input.value.trim() ? `<p class="ta-empty">No match — fill the fields below and it can be added to your catalog.</p>` : '');
    ta.classList.toggle('open', !!input.value.trim());
    $$('button', ta).forEach(b => b.addEventListener('click', () => {
      applyRef(rs[+b.dataset.i]);
      input.value = '';
      ta.classList.remove('open');
      ta.innerHTML = '';
    }));
  }, 80));
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('button', ta)?.click(); }
    if (e.key === 'Escape') ta.classList.remove('open');
  });

  form.addEventListener('input', e => { if (e.target !== input) preview(); });
  form.addEventListener('change', e => {
    if (e.target.name === 'ref') { const r = refByKey(e.target.value); if (r && !form.elements.model.value) applyRef(r); }
  });
  root.addEventListener('click', e => {
    const pick = e.target.closest('[data-pick]');
    if (pick && form.contains(pick)) { set('dial', pick.dataset.pick); preview(); }
    const cover = e.target.closest('[data-cover]');
    if (cover) { const [p] = photos.splice(+cover.dataset.cover, 1); photos.unshift(p); drawPhotos(); }
    const rm = e.target.closest('[data-remove]');
    if (rm) { photos.splice(+rm.dataset.remove, 1); drawPhotos(); }
  });
  const drop = $('#drop', root);
  $('#files', root).addEventListener('change', e => addFiles(e.target.files));
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const o = current();
    if (!o.ref && !o.model) { toast('Add at least a reference or a model name'); return; }
    const { addRef, ...fields } = o;
    for (const k of Object.keys(fields)) if (fields[k] === '' || fields[k] === null) delete fields[k];
    const out = { ...Object.fromEntries(Object.entries(w).filter(([k]) => !(k in o))), ...fields, photos, id: w.id };
    delete out.sample;
    if (!fields.featured) delete out.featured;
    else watches().forEach(x => { if (x.id !== w.id) delete x.featured; });
    if (addRef && o.ref && !refByKey(o.ref)) {
      await saveReference({
        ref: o.ref, family: o.family || 'oyster-perpetual', model: o.model || o.ref, nick: o.nickname || undefined,
        from: o.year || null, to: null, size: o.size, metal: o.metal, bezel: o.bezel,
        dials: [o.dial], bracelets: [o.bracelet], caliber: o.caliber || undefined,
      });
    }
    await saveWatch(out);
    toast(editing ? 'Saved' : 'Added to the collection');
    location.hash = `#/watch/${encodeURIComponent(out.id)}`;
  });

  drawPhotos();
  preview();
  if (!editing && !pre) input.focus();
}

function fromRef(r) {
  return {
    ref: r.ref, family: r.family, model: r.model, nickname: r.nick?.split(' / ')[0] || '',
    size: r.size, metal: r.metal, bezel: r.bezel || 'smooth', caliber: r.caliber || '',
  };
}
