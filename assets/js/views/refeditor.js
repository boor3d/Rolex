import { DIALS, BRACELETS } from '../vocab.js';
import { renderWatch } from '../dial.js';
import { esc, num, toast, $ } from '../util.js';
import { refByKey, saveReference } from '../store.js';
import { field, text, number, select, familyPairs, metalPairs, bezelPairs, readForm } from './fields.js';

export function render(root, { params, query }) {
  const existing = params[0] ? refByKey(decodeURIComponent(params[0])) : null;
  if (existing && !existing.custom) {
    root.innerHTML = `<section class="wrap section empty"><h2 class="display-sm">Built-in references can’t be edited here</h2>
    <p>Edit <code>data/catalog.json</code> in the repository to correct a built-in reference, or add a custom one with a different number.</p><a class="btn" href="#/catalog">Back to catalog</a></section>`;
    return;
  }
  const r = existing || { ref: query.get('ref') || '', family: '', metal: 'steel', bezel: 'smooth', dials: ['black'], bracelets: ['oyster'] };

  root.innerHTML = `
<section class="wrap section">
  <a class="back" href="#/catalog">← Catalog</a>
  <h1 class="display">${existing ? `Edit ${esc(r.ref)}` : 'Add a reference'}</h1>
  <p class="lede muted">Missing a reference or a rare variant? Add it here and it joins the catalog, the timeline and your coverage stats. It’s saved with your collection when you export.</p>
  <form id="rf" class="editor" autocomplete="off">
    <div class="editor-main">
      <fieldset><legend>Reference</legend><div class="fields">
        ${field('Reference number', text('ref', r.ref, `required ${existing ? 'readonly' : ''} placeholder="e.g. 5513"`))}
        ${field('Family', select('family', familyPairs(), r.family, 'Choose…'))}
        ${field('Model', text('model', r.model, 'required placeholder="e.g. Submariner"'))}
        ${field('Nickname', text('nick', r.nick))}
        ${field('Production from', number('from', r.from, 'min="1900" max="2100"'))}
        ${field('Production to', number('to', r.to, 'min="1900" max="2100"'), 'Leave blank if still in production.')}
        ${field('Case size (mm)', number('size', r.size))}
        ${field('Calibre', text('caliber', r.caliber))}
      </div></fieldset>
      <fieldset><legend>Configuration</legend><div class="fields">
        ${field('Metal', select('metal', metalPairs(), r.metal, null))}
        ${field('Bezel', select('bezel', bezelPairs(r.bezel), r.bezel, null))}
      </div>
      <p class="field-label">Dial options <span class="muted small">(first checked is the default)</span></p>
      <div class="check-grid">${Object.entries(DIALS).map(([k, d]) => `<label class="check"><input type="checkbox" name="dials" data-multi="1" value="${k}" ${r.dials?.includes(k) ? 'checked' : ''}><i class="sw" style="background:${d.hex}"></i>${esc(d.name)}</label>`).join('')}</div>
      <p class="field-label">Bracelet options</p>
      <div class="check-grid">${Object.entries(BRACELETS).map(([k, l]) => `<label class="check"><input type="checkbox" name="bracelets" data-multi="1" value="${k}" ${r.bracelets?.includes(k) ? 'checked' : ''}>${esc(l)}</label>`).join('')}</div>
      </fieldset>
      <fieldset><legend>Notes</legend>${field('Collector’s note', `<textarea name="note" rows="3">${esc(r.note || '')}</textarea>`)}</fieldset>
      <div class="row-gap form-actions"><button class="btn" type="submit">Save reference</button><a class="btn btn-ghost" href="#/catalog">Cancel</a></div>
    </div>
    <aside class="editor-preview"><div class="preview-card"><div id="preview" class="dial-slot big"></div></div></aside>
  </form>
</section>`;

  const form = $('#rf', root);
  const current = () => {
    const o = readForm(form);
    for (const k of ['from', 'to', 'size']) o[k] = num(o[k]);
    o.dials ||= []; o.bracelets ||= [];
    return o;
  };
  const preview = () => { $('#preview', root).innerHTML = renderWatch(current()); };
  form.addEventListener('input', preview);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const o = current();
    if (!o.family) { toast('Choose a family'); return; }
    if (!existing && refByKey(o.ref)) { toast(`${o.ref} is already in the catalog`); return; }
    for (const k of Object.keys(o)) if (o[k] === '' || o[k] === null) delete o[k];
    o.to ??= null;
    if (!o.dials.length) o.dials = ['black'];
    if (!o.bracelets.length) o.bracelets = ['oyster'];
    await saveReference(o);
    toast('Reference saved');
    location.hash = `#/ref/${encodeURIComponent(o.ref)}`;
  });
  preview();
}
