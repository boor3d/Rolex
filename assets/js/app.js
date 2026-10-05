import { init, onChange, state, removeSamples, profile } from './store.js';
import { initTooltips, toast, $, $$ } from './util.js';
import { resetSlots } from './views/common.js';
import * as collection from './views/collection.js';
import * as watch from './views/watch.js';
import * as catalog from './views/catalog.js';
import * as ref from './views/ref.js';
import * as refeditor from './views/refeditor.js';
import * as insights from './views/insights.js';
import * as editor from './views/editor.js';
import * as settings from './views/settings.js';

const ROUTES = [
  [/^\/?$/, collection, 'collection'],
  [/^\/watch\/(.+)$/, watch, 'collection'],
  [/^\/catalog$/, catalog, 'catalog'],
  [/^\/ref\/(.+)$/, ref, 'catalog'],
  [/^\/ref-new$/, refeditor, 'catalog', true],
  [/^\/ref-edit\/(.+)$/, refeditor, 'catalog', true],
  [/^\/insights$/, insights, 'insights'],
  [/^\/add$/, editor, 'add', true],
  [/^\/edit\/(.+)$/, editor, 'collection', true],
  [/^\/settings$/, settings, 'settings'],
];

const app = $('#app');
let current = null;

function parse() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path, query: new URLSearchParams(qs) };
}

function route({ keepScroll = false } = {}) {
  const { path, query } = parse();
  const match = ROUTES.map(([re, view, nav, isForm]) => ({ m: path.match(re), view, nav, isForm })).find(r => r.m);
  const { m, view, nav, isForm } = match || { m: [], view: collection, nav: 'collection' };
  current = { isForm };
  resetSlots();
  const y = window.scrollY;
  view.render(app, { params: m.slice(1), query });
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === nav));
  $('#local-pill').hidden = !state.local;
  document.title = `${profile().name || 'The Collection'}`;
  window.scrollTo(0, keepScroll ? y : 0);
}

function theme() {
  const btn = $('#theme-toggle');
  const sys = () => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const label = () => {
    const t = document.documentElement.dataset.theme || sys();
    btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    btn.dataset.mode = t;
  };
  btn.addEventListener('click', () => {
    const next = (document.documentElement.dataset.theme || sys()) === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { /* storage blocked */ }
    label();
  });
  label();
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-action="remove-samples"]');
  if (!b) return;
  if (!confirm('Remove all sample watches from the collection?')) return;
  await removeSamples();
  toast('Samples removed');
});

(async function start() {
  theme();
  initTooltips();
  try {
    await init();
  } catch (err) {
    app.innerHTML = `<section class="wrap section empty"><h2 class="display-sm">Couldn’t load the catalog</h2>
      <p>${location.protocol === 'file:' ? 'Open the site through a web server (e.g. <code>python3 -m http.server</code>) rather than as a file.' : String(err.message)}</p></section>`;
    return;
  }
  onChange(() => { if (!current?.isForm) route({ keepScroll: true }); else $('#local-pill').hidden = !state.local; });
  window.addEventListener('hashchange', () => route());
  route();
})();
