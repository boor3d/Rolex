import { CURRENCIES } from '../vocab.js';
import { esc, toast, download, $, fmtDate } from '../util.js';
import { state, profile, saveProfile, exportData, importData, resetToPublished, hasSamples, deleteReference } from '../store.js';
import { field, text, select, readForm } from './fields.js';

export function render(root) {
  const p = profile();
  const custom = state.data.customReferences;
  const photoCount = state.data.watches.reduce((n, w) => n + (w.photos?.length || 0), 0);

  root.innerHTML = `
<section class="page-head"><div class="wrap">
  <p class="eyebrow">Settings</p>
  <h1 class="display">Profile &amp; publishing</h1>
</div></section>

<section class="wrap section settings">
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Collection profile</h2></div>
    <form id="pf" class="fields">
      ${field('Collection name', text('name', p.name))}
      ${field('Owner', text('owner', p.owner, 'placeholder="Shown above the title (optional)"'))}
      ${field('Tagline', text('tagline', p.tagline), '', 'span-2')}
      ${field('Currency', select('currency', CURRENCIES.map(c => [c, c]), p.currency, null))}
      <div class="span-2"><button class="btn" type="submit">Save profile</button></div>
    </form>
  </div>

  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Publish to GitHub Pages</h2></div>
    <p class="status-line">${state.local
      ? `<span class="status off">Unpublished changes</span> Edits in this browser were last saved ${esc(fmtDate(state.data.updatedAt, { dateStyle: 'medium', timeStyle: 'short' }))}.`
      : '<span class="status on">In sync</span> You’re viewing the published <code>data/collection.json</code>.'}</p>
    <ol class="steps">
      <li>Download <code>collection.json</code> below.</li>
      <li>Replace <code>data/collection.json</code> in the repository with it (GitHub web editor → <em>Upload files</em>, or commit locally).</li>
      <li>GitHub Pages redeploys within a minute or two. Everyone now sees the update.</li>
    </ol>
    <div class="export-opts">
      <label class="check"><input type="checkbox" id="x-fin" checked> Include prices &amp; values</label>
      <label class="check"><input type="checkbox" id="x-photos" checked> Include photos <span class="muted small">(${photoCount})</span></label>
      <label class="check"><input type="checkbox" id="x-notes" checked> Include notes</label>
    </div>
    <p class="hint">GitHub Pages sites are public. Anything in the published file can be read by anyone with the link, so untick prices if you’d rather keep them private. Unticking only affects the download; your browser copy keeps everything.</p>
    <div class="row-gap">
      <button class="btn" id="export">Download collection.json</button>
      <button class="btn btn-ghost" id="backup">Download full backup</button>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Import &amp; reset</h2></div>
    <div class="row-gap">
      <label class="btn btn-ghost">Import a JSON file<input type="file" id="import" accept="application/json,.json" hidden></label>
      ${hasSamples() ? '<button class="btn btn-ghost" data-action="remove-samples">Remove sample watches</button>' : ''}
      ${state.local ? '<button class="btn btn-ghost btn-danger" id="reset">Discard local changes</button>' : ''}
    </div>
    <p class="hint">Importing replaces the collection in this browser. “Discard local changes” reverts to the published file.</p>
  </div>

  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Custom references</h2><p class="muted">${custom.length ? `${custom.length} reference${custom.length > 1 ? 's' : ''} you’ve added to the catalog.` : 'References you add to the catalog appear here.'}</p></div>
    ${custom.length ? `<ul class="plain-list">${custom.map(r => `<li><a href="#/ref/${encodeURIComponent(r.ref)}"><strong>${esc(r.ref)}</strong> ${esc(r.model || '')}</a>
      <span class="row-gap"><a class="link" href="#/ref-edit/${encodeURIComponent(r.ref)}">Edit</a><button class="link danger" data-delref="${esc(r.ref)}">Delete</button></span></li>`).join('')}</ul>` : ''}
    <a class="btn btn-small btn-ghost" href="#/ref-new">+ Add a reference</a>
  </div>
</section>`;

  $('#pf', root).addEventListener('submit', async e => {
    e.preventDefault();
    await saveProfile(readForm(e.target));
    toast('Profile saved');
  });
  const stamp = new Date().toISOString().slice(0, 10);
  $('#export', root).addEventListener('click', () => {
    download('collection.json', exportData({ financials: $('#x-fin', root).checked, photos: $('#x-photos', root).checked, notes: $('#x-notes', root).checked }));
  });
  $('#backup', root).addEventListener('click', () => download(`rolex-collection-backup-${stamp}.json`, exportData()));
  $('#import', root).addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importData(JSON.parse(await file.text()));
      toast('Collection imported');
    } catch (err) { toast(`Import failed: ${err.message}`); }
  });
  $('#reset', root)?.addEventListener('click', async () => {
    if (!confirm('Discard every change made in this browser and return to the published collection?')) return;
    await resetToPublished();
    toast('Reverted to the published collection');
  });
  root.querySelectorAll('[data-delref]').forEach(b => b.addEventListener('click', async () => {
    if (confirm(`Delete custom reference ${b.dataset.delref}?`)) await deleteReference(b.dataset.delref);
  }));
}
