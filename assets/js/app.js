import { init, onChange, profile, user, isDemo } from './store.js';
import { initTooltips, $, $$ } from './util.js';
import { resetSlots } from './views/common.js';
import * as collection from './views/collection.js';
import * as watch from './views/watch.js';
import * as catalog from './views/catalog.js';
import * as ref from './views/ref.js';
import * as refeditor from './views/refeditor.js';
import * as insights from './views/insights.js';
import * as editor from './views/editor.js';
import * as settings from './views/settings.js';
import * as account from './views/account.js';
import * as credits from './views/credits.js';

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
  [/^\/settings$/, settings, 'settings', true],
  [/^\/account$/, account, 'account'],
  [/^\/credits$/, credits, ''],
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
  if (isForm && isDemo()) {
    location.replace(`#/account?next=${encodeURIComponent(path)}`);
    return;
  }
  resetSlots();
  const y = window.scrollY;
  view.render(app, { params: m.slice(1), query });
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === nav));
  accountLink();
  document.title = `${profile().name || 'The Collection'}`;
  window.scrollTo(0, keepScroll ? y : 0);
}

function accountLink() {
  const a = $('#account-link'), u = user();
  a.textContent = u ? (u.email || '?')[0].toUpperCase() : 'Sign in';
  a.classList.toggle('is-user', !!u);
  a.setAttribute('aria-label', u ? `Account (${u.email})` : 'Sign in');
  a.dataset.tip = u ? u.email : '';
  if (!u) delete a.dataset.tip;
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
  onChange(() => { if (!current?.isForm || isDemo()) route({ keepScroll: true }); else accountLink(); });
  window.addEventListener('hashchange', () => route());
  route();
})();
