import { FAMILIES, FAMILY, METALS, BRACELETS, metalName, dialName, braceletName } from '../vocab.js';
import { esc, money, $, debounce } from '../util.js';
import { watches, profile, currency, isDemo } from '../store.js';
import { dialSlot, watchVisual, hydrate, watchCard, totals, fin, title, nick, famName, delta, sampleBanner } from './common.js';

const ui = { q: '', family: '', metal: '', bracelet: '', sort: 'value', view: 'grid' };

const SORTS = {
  value: ['Estimated value', (a, b) => (fin(b).val ?? -1) - (fin(a).val ?? -1)],
  gain: ['Appreciation', (a, b) => (fin(b).ret ?? -9) - (fin(a).ret ?? -9)],
  year: ['Production year', (a, b) => (a.year || 9999) - (b.year || 9999)],
  acquired: ['Recently acquired', (a, b) => String(b.purchaseDate || '').localeCompare(String(a.purchaseDate || ''))],
  family: ['Family', (a, b) => FAMILIES.findIndex(f => f.key === a.family) - FAMILIES.findIndex(f => f.key === b.family) || (a.year || 0) - (b.year || 0)],
};

function filtered() {
  const q = ui.q.trim().toLowerCase();
  return watches()
    .filter(w => !ui.family || w.family === ui.family)
    .filter(w => !ui.metal || w.metal === ui.metal)
    .filter(w => !ui.bracelet || w.bracelet === ui.bracelet)
    .filter(w => !q || [w.ref, w.model, nick(w), famName(w.family), w.year, dialName(w.dial), metalName(w.metal), w.notes].join(' ').toLowerCase().includes(q))
    .sort(SORTS[ui.sort][1]);
}

const opts = (pairs, cur, all) => `<option value="">${all}</option>` + pairs.map(([v, l]) => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('');

function table(ws) {
  const cur = currency();
  return `<div class="table-wrap"><table class="data-table">
  <thead><tr><th>Reference</th><th>Model</th><th>Year</th><th>Metal</th><th>Dial</th><th>Bracelet</th><th class="num">Cost</th><th class="num">Est. value</th><th class="num">Change</th></tr></thead>
  <tbody>${ws.map(w => {
    const f = fin(w);
    return `<tr><td><a href="#/watch/${encodeURIComponent(w.id)}">${esc(w.ref || '—')}</a></td><td>${esc(title(w))}${nick(w) ? ` <em class="muted">“${esc(nick(w))}”</em>` : ''}</td>
    <td>${esc(w.year || '—')}</td><td>${esc(metalName(w.metal))}</td><td>${esc(dialName(w.dial))}</td><td>${esc(braceletName(w.bracelet))}</td>
    <td class="num">${money(f.cost, cur)}</td><td class="num">${money(f.val, cur)}</td><td class="num">${delta(f.ret)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function results(root) {
  const ws = filtered();
  const el = $('#results', root);
  $('#result-count', root).textContent = `${ws.length} ${ws.length === 1 ? 'piece' : 'pieces'}`;
  if (!watches().length) {
    el.innerHTML = `<div class="empty"><h3 class="display-sm">An empty watch box</h3><p>Add your first watch — search a reference and the model, metal, bezel and calibre fill in automatically.</p>
    <div class="row-gap"><a class="btn" href="#/add">Add a watch</a><a class="btn btn-ghost" href="#/catalog">Browse the catalog</a><a class="btn btn-ghost" href="#/settings">Import a backup</a></div></div>`;
    return;
  }
  el.innerHTML = !ws.length
    ? `<div class="empty"><p>Nothing matches those filters.</p></div>`
    : ui.view === 'table' ? table(ws) : `<div class="grid watch-grid">${ws.map(watchCard).join('')}</div>`;
  hydrate(el);
}

export function render(root) {
  const ws = watches(), p = profile(), cur = currency();
  const t = totals(ws);
  const fams = [...new Set(ws.map(w => w.family))];
  const yearsList = ws.map(w => +w.year).filter(Boolean);
  const featured = ws.find(w => w.featured) || [...ws].sort(SORTS.value[1])[0];
  const present = (key, dict) => [...new Set(ws.map(w => w[key]).filter(Boolean))].map(k => [k, typeof dict === 'function' ? dict(k) : dict[k]?.name || dict[k] || k]);

  root.innerHTML = `
${sampleBanner()}
<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-copy">
      <p class="eyebrow on-dark">${p.owner ? `${esc(p.owner)} · ` : ''}${isDemo() ? 'Demo collection' : 'Private collection'}</p>
      <h1 class="display">${esc(p.name)}</h1>
      ${p.tagline ? `<p class="lede">${esc(p.tagline)}</p>` : ''}
      <dl class="hero-stats">
        <div><dt>Pieces</dt><dd>${ws.length}</dd></div>
        <div><dt>Families</dt><dd>${fams.length}<small> / ${FAMILIES.length}</small></dd></div>
        ${t.val !== null ? `<div><dt>Estimated value</dt><dd>${money(t.val, cur, true)}</dd></div>` : ''}
        ${t.ret !== null ? `<div><dt>Since purchase</dt><dd>${t.ret >= 0 ? '+' : '−'}${Math.abs(t.ret * 100).toFixed(0)}%</dd></div>` : ''}
        ${yearsList.length ? `<div><dt>Era span</dt><dd>${Math.min(...yearsList)}<small>–${Math.max(...yearsList)}</small></dd></div>` : ''}
      </dl>
      <div class="row-gap hero-actions">
        <a class="btn btn-gold" href="#/add">Add a watch</a>
        <a class="btn btn-ghost on-dark" href="#/insights">Coverage &amp; insights</a>
      </div>
    </div>
    ${featured ? `<a class="hero-watch" href="#/watch/${encodeURIComponent(featured.id)}">
      ${watchVisual(featured, 'hero-dial')}
      <span class="hero-caption"><span class="eyebrow on-dark">Featured</span>${esc(title(featured))}${nick(featured) ? ` “${esc(nick(featured))}”` : ''} · ${esc(featured.ref || '')}</span>
    </a>` : ''}
  </div>
</section>

<section class="wrap section">
  <div class="section-head">
    <div><h2 class="display-sm">The pieces</h2><p class="muted" id="result-count"></p></div>
    <div class="seg" role="group" aria-label="View">
      <button data-view="grid" aria-pressed="${ui.view === 'grid'}">Grid</button>
      <button data-view="table" aria-pressed="${ui.view === 'table'}">Table</button>
    </div>
  </div>
  <div class="toolbar">
    <input type="search" id="q" placeholder="Search reference, model, nickname, dial…" value="${esc(ui.q)}" aria-label="Search collection">
    <select id="f-family" aria-label="Family">${opts(fams.map(k => [k, famName(k)]), ui.family, 'All families')}</select>
    <select id="f-metal" aria-label="Metal">${opts(present('metal', METALS), ui.metal, 'All metals')}</select>
    <select id="f-bracelet" aria-label="Bracelet">${opts(present('bracelet', BRACELETS), ui.bracelet, 'All bracelets')}</select>
    <label class="sort">Sort <select id="f-sort">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}"${k === ui.sort ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
  </div>
  <div id="results"></div>
</section>`;

  hydrate(root);
  results(root);
  const bind = (sel, key) => $(sel, root).addEventListener('change', e => { ui[key] = e.target.value; results(root); });
  bind('#f-family', 'family'); bind('#f-metal', 'metal'); bind('#f-bracelet', 'bracelet'); bind('#f-sort', 'sort');
  $('#q', root).addEventListener('input', debounce(e => { ui.q = e.target.value; results(root); }, 120));
  root.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    ui.view = b.dataset.view;
    root.querySelectorAll('[data-view]').forEach(x => x.setAttribute('aria-pressed', x === b));
    results(root);
  }));
}
