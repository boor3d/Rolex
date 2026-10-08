import { esc } from '../util.js';
import { allRefPhotos, refByKey } from '../store.js';

export function render(root) {
  const entries = Object.entries(allRefPhotos());
  const n = entries.reduce((s, [, ps]) => s + ps.length, 0);
  root.innerHTML = `
<section class="page-head"><div class="wrap">
  <p class="eyebrow">Credits</p>
  <h1 class="display">Photography</h1>
  <p class="lede">${n} reference photographs are used under free licences from <a href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> and <a href="https://www.flickr.com/creativecommons/" target="_blank" rel="noopener">Flickr</a> (found via <a href="https://openverse.org" target="_blank" rel="noopener">Openverse</a>). Thank you to every photographer below. Where no photo exists, the site shows an illustration generated from the reference’s specification.</p>
</div></section>
<section class="wrap section">
  <ul class="credits">${entries.map(([ref, ps]) => ps.map(p => `<li>
    <a href="#/ref/${encodeURIComponent(ref)}"><img src="${esc(p.src)}" alt="" loading="lazy"></a>
    <div><p><a href="#/ref/${encodeURIComponent(ref)}"><strong>${esc(ref)}</strong> ${esc(refByKey(ref)?.model || '')}</a></p>
    <p class="small">${esc(p.author)} · ${p.licenseUrl ? `<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener">${esc(p.license)}</a>` : esc(p.license)}</p>
    <p class="small"><a href="${esc(p.source)}" target="_blank" rel="noopener">Source on ${esc(p.via || 'Wikimedia Commons')}</a></p></div>
  </li>`).join('')).join('')}</ul>
  <p class="fine-print">Photos are shown unmodified apart from resizing. Rolex trademarks visible in photographs belong to Rolex SA; their appearance does not imply endorsement.</p>
</section>`;
}
