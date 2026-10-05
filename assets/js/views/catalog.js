import { FAMILIES, FAMILY, METALS, metalName } from '../vocab.js';
import { esc, $, $$, debounce } from '../util.js';
import { allRefs, ownedRefSet, normRef, state } from '../store.js';
import { refCard, hydrate, timeline, legendTimeline, meter } from './common.js';

const ui = { q: '', family: '', metal: '', era: '', status: '', view: 'grid' };
const ERAS = [
  ['pre1960', 'Before 1960', r => (r.from || 0) < 1960],
  ['1960s-80s', '1960–1989', r => (r.from || 0) >= 1960 && r.from < 1990],
  ['1990s-00s', '1990–2009', r => r.from >= 1990 && r.from < 2010],
  ['2010s', '2010–2019', r => r.from >= 2010 && r.from < 2020],
  ['2020s', '2020 onward', r => r.from >= 2020],
];
const STATUS = [
  ['current', 'In production', r => !r.to],
  ['discontinued', 'Discontinued', r => !!r.to],
  ['owned', 'In my collection', (r, o) => o.has(normRef(r.ref))],
  ['missing', 'Not yet owned', (r, o) => !o.has(normRef(r.ref))],
  ['custom', 'My custom references', r => r.custom],
];

function matches(r, owned) {
  const q = ui.q.trim().toLowerCase();
  if (ui.family && r.family !== ui.family) return false;
  if (ui.metal && r.metal !== ui.metal) return false;
  if (ui.era && !ERAS.find(e => e[0] === ui.era)[2](r)) return false;
  if (ui.status && !STATUS.find(s => s[0] === ui.status)[2](r, owned)) return false;
  if (q && ![r.ref, r.model, r.nick, r.caliber, FAMILY[r.family]?.name, r.from, metalName(r.metal)].join(' ').toLowerCase().includes(q)) return false;
  return true;
}

function body(root) {
  const owned = ownedRefSet();
  const refs = allRefs();
  const list = refs.filter(r => matches(r, owned));
  $('#cat-count', root).textContent = `${list.length} of ${refs.length} references`;
  const el = $('#cat-body', root);
  if (!list.length) { el.innerHTML = `<div class="empty"><p>No references match. <a href="#/ref-new">Add one to the catalog</a>.</p></div>`; return; }
  if (ui.view === 'timeline') {
    el.innerHTML = `<div class="tl-head">${legendTimeline()}</div>${timeline(list, { owned })}`;
    return;
  }
  const groups = [...FAMILIES, { key: '__other', name: 'Other' }]
    .map(f => [f, list.filter(r => (f.key === '__other' ? !FAMILY[r.family] : r.family === f.key))])
    .filter(([, rs]) => rs.length);
  el.innerHTML = groups.map(([f, rs]) => {
    const all = refs.filter(r => r.family === f.key);
    const have = all.filter(r => owned.has(normRef(r.ref))).length;
    return `<section class="family-block" id="fam-${f.key}">
      <header class="family-head">
        <div><h2 class="display-sm">${esc(f.name)}</h2>${f.since ? `<p class="eyebrow">Since ${f.since}</p>` : ''}${f.blurb ? `<p class="muted family-blurb">${esc(f.blurb)}</p>` : ''}</div>
        ${all.length ? `<div class="family-coverage"><span class="label">Coverage</span>${meter(have, all.length, `${f.name} coverage`)}<span class="small">${have} of ${all.length}</span></div>` : ''}
      </header>
      <div class="grid ref-grid">${[...rs].sort((a, b) => (a.from || 0) - (b.from || 0)).map(r => refCard(r, owned.has(normRef(r.ref)))).join('')}</div>
    </section>`;
  }).join('');
  hydrate(el);
}

export function render(root, { query }) {
  if (query.get('family')) ui.family = query.get('family');
  const refs = allRefs();
  const famCounts = Object.fromEntries(FAMILIES.map(f => [f.key, refs.filter(r => r.family === f.key).length]));
  const metals = [...new Set(refs.map(r => r.metal))].filter(k => METALS[k]);
  const sel = (id, label, items, cur, all) => `<select id="${id}" aria-label="${label}"><option value="">${all}</option>${items.map(([v, l]) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

  root.innerHTML = `
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Reference catalog</p>
    <h1 class="display">Every Oyster, in order</h1>
    <p class="lede">${refs.length} references across ${FAMILIES.length} families, from the 1930s Bubbleback to this year’s releases. Pick one to see its production run, dials and bracelets, or add it to your collection.</p>
  </div>
</section>
<section class="wrap section">
  <div class="family-nav" role="tablist" aria-label="Families">
    <button role="tab" data-fam="" aria-selected="${!ui.family}">All</button>
    ${FAMILIES.filter(f => famCounts[f.key]).map(f => `<button role="tab" data-fam="${f.key}" aria-selected="${ui.family === f.key}">${esc(f.name)} <span>${famCounts[f.key]}</span></button>`).join('')}
  </div>
  <div class="toolbar">
    <input type="search" id="cq" placeholder="Search ref, model, nickname, calibre…" value="${esc(ui.q)}" aria-label="Search catalog">
    ${sel('c-metal', 'Metal', metals.map(k => [k, metalName(k)]), ui.metal, 'All metals')}
    ${sel('c-era', 'Era', ERAS.map(([k, l]) => [k, l]), ui.era, 'All eras')}
    ${sel('c-status', 'Status', STATUS.map(([k, l]) => [k, l]), ui.status, 'All references')}
    <div class="seg" role="group" aria-label="View">
      <button data-view="grid" aria-pressed="${ui.view === 'grid'}">Grid</button>
      <button data-view="timeline" aria-pressed="${ui.view === 'timeline'}">Timeline</button>
    </div>
  </div>
  <div class="section-head slim"><p class="muted" id="cat-count"></p><a class="btn btn-small btn-ghost" href="#/ref-new">+ Add a reference</a></div>
  <div id="cat-body"></div>
  <p class="fine-print">${esc(state.catalogMeta.note || '')}</p>
</section>`;

  body(root);
  $('#cq', root).addEventListener('input', debounce(e => { ui.q = e.target.value; body(root); }, 120));
  for (const [id, key] of [['#c-metal', 'metal'], ['#c-era', 'era'], ['#c-status', 'status']]) {
    $(id, root).addEventListener('change', e => { ui[key] = e.target.value; body(root); });
  }
  $$('[data-fam]', root).forEach(b => b.addEventListener('click', () => {
    ui.family = b.dataset.fam;
    $$('[data-fam]', root).forEach(x => x.setAttribute('aria-selected', x === b));
    body(root);
  }));
  $$('[data-view]', root).forEach(b => b.addEventListener('click', () => {
    ui.view = b.dataset.view;
    $$('[data-view]', root).forEach(x => x.setAttribute('aria-pressed', x === b));
    body(root);
  }));
}
