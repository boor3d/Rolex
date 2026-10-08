import { CURRENCIES } from '../vocab.js';
import { esc, toast, download, $ } from '../util.js';
import { state, user, profile, saveProfile, exportData, importData, deleteReference, deleteAllData, legacyLocal, clearLegacy, signOut } from '../store.js';
import { field, text, select, readForm } from './fields.js';

export function render(root) {
  const p = profile(), u = user();
  const custom = state.data.customReferences;
  const photoCount = state.data.watches.reduce((n, w) => n + (w.photos?.length || 0), 0);

  root.innerHTML = `
<section class="page-head"><div class="wrap">
  <p class="eyebrow">Settings</p>
  <h1 class="display">Profile &amp; data</h1>
</div></section>

<section class="wrap section settings">
  <div id="legacy" class="panel span-all" hidden></div>

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
    <div class="panel-head"><h2 class="display-sm">Account</h2></div>
    <p>Signed in as <strong>${esc(u?.email || '')}</strong>.</p>
    <p class="hint">Your watches, prices and photos are stored in your account and visible only to you.</p>
    <div class="row-gap"><a class="btn btn-ghost" href="#/account">Password</a><a class="btn btn-ghost" href="#/status">System check</a><button class="btn btn-ghost" id="signout">Sign out</button></div>
  </div>

  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Backup &amp; export</h2></div>
    <p class="hint">A portable JSON copy of your collection, photos included. Keep one somewhere safe.</p>
    <div class="export-opts">
      <label class="check"><input type="checkbox" id="x-fin" checked> Prices &amp; values</label>
      <label class="check"><input type="checkbox" id="x-photos" checked> Photos <span class="muted small">(${photoCount})</span></label>
      <label class="check"><input type="checkbox" id="x-notes" checked> Notes</label>
    </div>
    <div class="row-gap">
      <button class="btn" id="export">Download backup</button>
      <label class="btn btn-ghost">Import a JSON file<input type="file" id="import" accept="application/json,.json" hidden></label>
    </div>
    <p class="hint" id="import-status"></p>
  </div>

  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Custom references</h2><p class="muted">${custom.length ? `${custom.length} reference${custom.length > 1 ? 's' : ''} you’ve added to the catalog.` : 'References you add to the catalog appear here.'}</p></div>
    ${custom.length ? `<ul class="plain-list">${custom.map(r => `<li><a href="#/ref/${encodeURIComponent(r.ref)}"><strong>${esc(r.ref)}</strong> ${esc(r.model || '')}</a>
      <span class="row-gap"><a class="link" href="#/ref-edit/${encodeURIComponent(r.ref)}">Edit</a><button class="link danger" data-delref="${esc(r.ref)}">Delete</button></span></li>`).join('')}</ul>` : ''}
    <a class="btn btn-small btn-ghost" href="#/ref-new">+ Add a reference</a>
  </div>

  <div class="panel danger-zone">
    <div class="panel-head"><h2 class="display-sm">Delete data</h2></div>
    <p class="hint">Permanently removes every watch, photo, valuation and custom reference in your account. Download a backup first.</p>
    <button class="btn btn-ghost btn-danger" id="wipe">Delete all my watches</button>
  </div>
</section>`;

  const status = $('#import-status', root);
  const runImport = async (obj, label) => {
    status.textContent = `Importing ${label}…`;
    try {
      const n = await importData(obj, (i, total) => { status.textContent = `Importing ${i} of ${total}…`; });
      toast(`Imported ${n} watch${n === 1 ? '' : 'es'}`);
      return true;
    } catch (err) {
      status.textContent = `Import failed: ${err.message}`;
      return false;
    }
  };

  $('#pf', root).addEventListener('submit', async e => {
    e.preventDefault();
    try { await saveProfile(readForm(e.target)); toast('Profile saved'); } catch (err) { toast(err.message); }
  });
  $('#signout', root).addEventListener('click', async () => { await signOut(); location.hash = '#/'; });
  $('#export', root).addEventListener('click', async e => {
    e.target.disabled = true;
    e.target.textContent = 'Preparing…';
    try {
      const json = await exportData({ financials: $('#x-fin', root).checked, photos: $('#x-photos', root).checked, notes: $('#x-notes', root).checked });
      download(`collection-backup-${new Date().toISOString().slice(0, 10)}.json`, json);
    } catch (err) { toast(err.message); }
    e.target.disabled = false;
    e.target.textContent = 'Download backup';
  });
  $('#import', root).addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try { await runImport(JSON.parse(await file.text()), file.name); } catch (err) { status.textContent = `Import failed: ${err.message}`; }
  });
  root.querySelectorAll('[data-delref]').forEach(b => b.addEventListener('click', async () => {
    if (confirm(`Delete custom reference ${b.dataset.delref}?`)) await deleteReference(b.dataset.delref);
  }));
  $('#wipe', root).addEventListener('click', async () => {
    const n = state.data.watches.length;
    if (!n) { toast('Nothing to delete'); return; }
    if (prompt(`This deletes all ${n} watches and their photos permanently. Type DELETE to confirm.`) !== 'DELETE') return;
    try { await deleteAllData(); toast('All watches deleted'); } catch (err) { toast(err.message); }
  });

  // Offer to bring over anything saved by the earlier browser-only version of the site.
  legacyLocal().then(legacy => {
    if (!legacy) return;
    const box = $('#legacy', root);
    if (!box) return;
    const n = legacy.watches.filter(w => !w.sample).length;
    box.hidden = false;
    box.innerHTML = `<div class="panel-head"><h2 class="display-sm">Watches saved in this browser</h2></div>
      <p>We found <strong>${n} watch${n === 1 ? '' : 'es'}</strong> saved here by the earlier version of the site. Import them into your account?</p>
      <div class="row-gap"><button class="btn" id="legacy-go">Import ${n} watch${n === 1 ? '' : 'es'}</button><button class="btn btn-ghost" id="legacy-skip">Dismiss</button></div>`;
    $('#legacy-go', box).addEventListener('click', async () => { if (await runImport(legacy, 'browser data')) await clearLegacy(); });
    $('#legacy-skip', box).addEventListener('click', async () => {
      if (confirm('Discard the watches saved in this browser? They will be lost.')) { await clearLegacy(); box.hidden = true; }
    });
  });
}
