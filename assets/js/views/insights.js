import { FAMILIES, FAMILY, METALS, DIALS, BRACELETS, metalName, metalSwatch, dialName, braceletName, bezelGroup } from '../vocab.js';
import { esc, money, pct } from '../util.js';
import { watches, allRefs, ownedRefSet, normRef, currency } from '../store.js';
import { fin, totals, title, nick, famName, meter, refCard, hydrate, sampleBanner } from './common.js';

const countBy = (arr, key) => arr.reduce((m, x) => (m[key(x)] = (m[key(x)] || 0) + 1, m), {});

function tile(label, value, sub = '') {
  return `<div class="tile"><span class="tile-label">${label}</span><span class="tile-value">${value}</span>${sub ? `<span class="tile-sub">${sub}</span>` : ''}</div>`;
}

// Horizontal bar list — one series, value labels at the bar tip.
function bars(rows, { max, fmt = v => v, empty = 'Not yet' } = {}) {
  const m = max ?? Math.max(1, ...rows.map(r => r.value));
  return `<ul class="hbars">${rows.map(r => `<li class="${r.value ? '' : 'is-zero'}">
    <span class="hb-label">${r.swatch ? `<i class="sw" style="background:${r.swatch}"></i>` : ''}${esc(r.label)}</span>
    <span class="hb-track" data-tip="${esc(r.tip || `${r.label}: ${fmt(r.value)}`)}" tabindex="0"><i class="hb-bar" style="width:${(r.value / m) * 100}%"></i></span>
    <span class="hb-val">${r.value ? fmt(r.value) : `<span class="muted">${empty}</span>`}</span>
  </li>`).join('')}</ul>`;
}

export function render(root) {
  const ws = watches(), cur = currency();
  const refs = allRefs(), owned = ownedRefSet();
  if (!ws.length) {
    root.innerHTML = `<section class="wrap section empty"><h2 class="display-sm">Insights need a collection</h2><p>Add a few watches and this page will map your coverage across families, metals, dials and eras.</p><a class="btn" href="#/add">Add a watch</a></section>`;
    return;
  }
  const fams = new Set(ws.map(w => w.family));
  const metalCounts = countBy(ws, w => w.metal);
  const braceletCounts = countBy(ws, w => w.bracelet);
  const dialCounts = countBy(ws, w => w.dial);
  const bezelCounts = countBy(ws, w => bezelGroup(w.bezel || 'smooth'));
  const yearsOwned = ws.map(w => +w.year).filter(Boolean);
  const decades = new Set(yearsOwned.map(y => Math.floor(y / 10) * 10));
  const t = totals(ws);
  const refsOwned = refs.filter(r => owned.has(normRef(r.ref))).length;
  const sizes = ws.map(w => +w.size).filter(Boolean);

  // Family coverage rows
  const famRows = FAMILIES.map(f => {
    const all = refs.filter(r => r.family === f.key);
    const have = all.filter(r => owned.has(normRef(r.ref)));
    const pieces = ws.filter(w => w.family === f.key);
    return { f, all, have, pieces };
  });

  // Value rows
  const valued = ws.map(w => ({ w, ...fin(w) })).filter(x => x.val !== null || x.cost !== null)
    .sort((a, b) => (b.val ?? b.cost) - (a.val ?? a.cost));
  const vmax = Math.max(1, ...valued.flatMap(x => [x.val || 0, x.cost || 0]));
  const famValue = Object.entries(ws.reduce((m, w) => { const v = fin(w).val; if (v !== null) m[w.family] = (m[w.family] || 0) + v; return m; }, {}))
    .sort((a, b) => b[1] - a[1]);

  // Production-year strip (stack same-year dots)
  const from = Math.min(1925, ...yearsOwned) , to = 2027;
  const stack = {};
  const dots = ws.filter(w => +w.year).sort((a, b) => a.year - b.year).map(w => {
    const k = +w.year; stack[k] = (stack[k] || 0) + 1;
    return { w, x: ((k - from) / (to - from)) * 100, level: stack[k] - 1 };
  });
  const maxLevel = Math.max(0, ...dots.map(d => d.level));

  // Suggestions: one current reference from each family not yet represented.
  const suggestions = FAMILIES.filter(f => !fams.has(f.key)).map(f => {
    const rs = refs.filter(r => r.family === f.key);
    return rs.find(r => !r.to && r.metal === 'steel') || rs.find(r => !r.to) || rs[rs.length - 1];
  }).filter(Boolean).slice(0, 8);

  const allDialKeys = [...new Set(refs.flatMap(r => r.dials || []))].filter(k => DIALS[k]);

  root.innerHTML = `
${sampleBanner()}
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Insights</p>
    <h1 class="display">Coverage &amp; character</h1>
    <p class="lede">How broad the collection is across the Rolex catalogue: families, materials, dial colours and decades.</p>
  </div>
</section>

<section class="wrap section">
  <div class="tiles">
    ${tile('Families', `${fams.size}<small> / ${FAMILIES.length}</small>`, `${Math.round(fams.size / FAMILIES.length * 100)}% of families`)}
    ${tile('Catalog references', `${refsOwned}<small> / ${refs.length}</small>`, 'distinct references owned')}
    ${tile('Metals', `${Object.keys(metalCounts).length}<small> / ${Object.keys(METALS).length}</small>`, 'case materials')}
    ${tile('Dial colours', `${Object.keys(dialCounts).length}`, `of ${allDialKeys.length} in the catalog`)}
    ${tile('Decades', `${decades.size}`, yearsOwned.length ? `${Math.min(...yearsOwned)}–${Math.max(...yearsOwned)}` : '')}
    ${t.val !== null ? tile('Estimated value', money(t.val, cur, true), t.ret !== null ? `${pct(t.ret)} vs. cost` : '') : ''}
  </div>
</section>

<section class="wrap section">
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Family coverage</h2><p class="muted">References owned out of every reference in the catalog, per family.</p></div>
    <ul class="coverage">${famRows.map(({ f, all, have, pieces }) => `<li class="${pieces.length ? 'has' : ''}">
      <a class="cv-name" href="#/catalog?family=${f.key}">${esc(f.name)}</a>
      <span class="cv-meter" data-tip="${esc(`<strong>${f.name}</strong><br>${have.length} of ${all.length} references${have.length ? '<br>' + have.map(r => r.ref).join(', ') : ''}`)}" tabindex="0">${meter(have.length, all.length, f.name)}</span>
      <span class="cv-count">${have.length}<span class="muted">/${all.length}</span></span>
      <span class="cv-pieces muted small">${pieces.length ? `${pieces.length} piece${pieces.length > 1 ? 's' : ''}` : ''}</span>
    </li>`).join('')}</ul>
  </div>
</section>

<section class="wrap section two-col">
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Metals</h2><p class="muted">Pieces by case material.</p></div>
    ${bars(Object.keys(METALS).map(k => ({ label: metalName(k), value: metalCounts[k] || 0, swatch: metalSwatch(k) })).sort((a, b) => b.value - a.value), { fmt: v => `${v} piece${v > 1 ? 's' : ''}` })}
  </div>
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Bracelets</h2><p class="muted">Pieces by bracelet or strap.</p></div>
    ${bars(Object.keys(BRACELETS).map(k => ({ label: braceletName(k), value: braceletCounts[k] || 0 })).sort((a, b) => b.value - a.value), { fmt: v => `${v} piece${v > 1 ? 's' : ''}` })}
    <div class="panel-head sub"><h3 class="label">Bezels</h3></div>
    ${bars(['Smooth', 'Fluted', 'Engine-turned', 'Diver’s', '24-hour GMT', 'Fixed 24-hour', 'Tachymeter', 'Bidirectional', 'Regatta', 'Turn-O-Graph'].map(k => ({ label: k, value: bezelCounts[k] || 0 })).sort((a, b) => b.value - a.value), { fmt: v => `${v}` })}
  </div>
</section>

<section class="wrap section">
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Dial palette</h2><p class="muted">Every dial colour in the catalog. Filled swatches are in the collection.</p></div>
    <ul class="palette">${allDialKeys.sort((a, b) => (dialCounts[b] || 0) - (dialCounts[a] || 0)).map(k => `<li class="${dialCounts[k] ? 'has' : ''}" data-tip="${esc(`${dialName(k)}${dialCounts[k] ? ` — ${dialCounts[k]} piece${dialCounts[k] > 1 ? 's' : ''}` : ' — not yet'}`)}" tabindex="0">
      <i style="background:${DIALS[k].hex}"></i><span>${esc(dialName(k))}</span>${dialCounts[k] ? `<b>${dialCounts[k]}</b>` : ''}</li>`).join('')}</ul>
  </div>
</section>

<section class="wrap section">
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Eras</h2><p class="muted">Each dot is a watch, placed at its production year.</p></div>
    <div class="era-strip" style="--levels:${maxLevel + 1}">
      ${[1930, 1950, 1970, 1990, 2010].filter(y => y > from).map(y => `<span class="era-tick" style="left:${((y - from) / (to - from)) * 100}%">${y}</span>`).join('')}
      ${dots.map(d => `<a class="era-dot" href="#/watch/${encodeURIComponent(d.w.id)}" style="left:${d.x}%;bottom:${d.level * 16 + 22}px" data-tip="${esc(`<strong>${d.w.year}</strong> · ${title(d.w)}${nick(d.w) ? ` “${nick(d.w)}”` : ''}<br>${d.w.ref || ''}`)}" aria-label="${esc(`${d.w.year} ${title(d.w)}`)}"></a>`).join('')}
    </div>
    <div class="era-buckets">${[...decades].sort().map(d => `<span class="chip">${d}s · ${yearsOwned.filter(y => Math.floor(y / 10) * 10 === d).length}</span>`).join('')}</div>
  </div>
</section>

${valued.length ? `<section class="wrap section two-col wide-left">
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Cost vs. today’s estimate</h2>
      <div class="legend"><span><i class="lg-dot cost"></i>Purchase price</span><span><i class="lg-dot value"></i>Estimated value</span></div></div>
    <ul class="dumbbells">${valued.map(x => {
      const a = ((x.cost ?? x.val) / vmax) * 100, b = ((x.val ?? x.cost) / vmax) * 100;
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const tip = `<strong>${esc(title(x.w))}</strong> ${esc(x.w.ref || '')}<br>Cost ${money(x.cost, cur)} → ${money(x.val, cur)}${x.ret !== null ? ` (${pct(x.ret)})` : ''}`;
      return `<li><a class="db-label" href="#/watch/${encodeURIComponent(x.w.id)}">${esc(title(x.w))}<span class="muted small"> ${esc(x.w.ref || '')}</span></a>
        <span class="db-track" data-tip="${esc(tip)}" tabindex="0">
          <i class="db-line ${x.val >= x.cost ? 'up' : 'down'}" style="left:${lo}%;width:${hi - lo}%"></i>
          ${x.cost !== null ? `<i class="db-dot cost" style="left:${a}%"></i>` : ''}
          ${x.val !== null ? `<i class="db-dot value" style="left:${b}%"></i>` : ''}
        </span>
        <span class="db-val">${money(x.val ?? x.cost, cur, true)}</span></li>`;
    }).join('')}</ul>
  </div>
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Value by family</h2><p class="muted">Sum of estimates.</p></div>
    ${bars(famValue.map(([k, v]) => ({ label: famName(k), value: v })), { fmt: v => money(v, cur, true) })}
    ${sizes.length ? `<div class="panel-head sub"><h3 class="label">Case sizes</h3></div>${bars(Object.entries(countBy(sizes, s => s)).sort((a, b) => a[0] - b[0]).map(([s, c]) => ({ label: `${s} mm`, value: c })), { fmt: v => `${v}` })}` : ''}
  </div>
</section>` : ''}

${suggestions.length ? `<section class="wrap section">
  <div class="section-head"><div><h2 class="display-sm">Gaps worth filling</h2><p class="muted">A current reference from each family not yet in the collection.</p></div><a class="btn btn-small btn-ghost" href="#/catalog">Full catalog</a></div>
  <div class="grid ref-grid">${suggestions.map(r => refCard(r, false)).join('')}</div>
</section>` : ''}`;
  hydrate(root);
}
