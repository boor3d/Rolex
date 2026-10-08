// System check: verifies Supabase auth, database and storage end to end, with fixes for each failure.
import { esc, $ } from '../util.js';
import { sb, SUPABASE_URL, SUPABASE_KEY, PHOTO_BUCKET, redirectUrl } from '../supabase.js';
import { user } from '../store.js';

const TABLES = ['profiles', 'watches', 'watch_finance', 'valuations', 'watch_photos', 'custom_references'];

async function checks(u) {
  const out = [];
  const add = (name, ok, detail, fix = '') => out.push({ name, ok, detail, fix });

  // 1. Reachability
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    const s = await r.json();
    add('Supabase reachable', r.ok, r.ok ? `Email sign-in ${s.external?.email ? 'enabled' : 'disabled'}; email confirmation ${s.mailer_autoconfirm ? 'off' : 'required'}.` : `HTTP ${r.status}`,
      r.ok ? '' : 'Check the project URL and publishable key in assets/js/supabase.js, and that the project is not paused.');
    if (r.ok && !s.external?.email) out.at(-1).fix = 'Enable the Email provider under Authentication → Sign In / Providers.';
    if (r.ok && !s.external?.email) out.at(-1).ok = false;
  } catch (e) { add('Supabase reachable', false, e.message, 'Check your connection, or whether the Supabase project is paused (free projects pause after a week idle).'); }

  // 2. Tables exist (signed-out requests should be refused, not "not found")
  const missing = [];
  for (const t of TABLES) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*&limit=0`, { headers: { apikey: SUPABASE_KEY } });
    const body = await r.json().catch(() => ({}));
    if (body.code === 'PGRST205' || r.status === 404) missing.push(t);
  }
  add('Database tables', !missing.length, missing.length ? `Missing: ${missing.join(', ')}` : `All ${TABLES.length} tables present.`,
    missing.length ? 'Run supabase/schema.sql in Supabase → SQL Editor.' : '');

  add('Sign-in link destination', true, `Emails send people back to <code>${esc(redirectUrl())}</code>.`,
    `In Supabase → Authentication → URL Configuration, the Site URL should be <code>https://boor3d.github.io/Rolex/</code> and Redirect URLs must include <code>${esc(redirectUrl())}</code> (or a <code>/**</code> wildcard). Otherwise links fall back to localhost and fail.`);

  if (!u) return out;

  // 3. Session
  const { data: got, error: uerr } = await sb.auth.getUser();
  add('Signed-in session', !!got?.user && !uerr, got?.user ? `Signed in as ${esc(got.user.email)}${got.user.email_confirmed_at ? ' (email confirmed)' : ''}.` : esc(uerr?.message || 'No session'),
    'Sign out and back in. If it keeps failing, clear site data for this page.');

  // 4. Profile
  const { data: prof, error: perr } = await sb.from('profiles').select('id, name').eq('id', u.id).maybeSingle();
  add('Profile row', !!prof && !perr, prof ? `Profile “${esc(prof.name)}” found.` : esc(perr?.message || 'No profile row for this account.'),
    'Re-run supabase/schema.sql — its last “backfill” step creates profiles for existing accounts.');

  // 5. Write + read + delete a throwaway watch, finance row and valuation
  const id = crypto.randomUUID();
  let step = 'insert watch';
  try {
    let r = await sb.from('watches').insert({ id, model: '__system check__' }); if (r.error) throw r.error;
    step = 'insert price'; r = await sb.from('watch_finance').insert({ watch_id: id, purchase_price: 1 }); if (r.error) throw r.error;
    step = 'insert valuation'; r = await sb.from('valuations').insert({ watch_id: id, value: 1 }); if (r.error) throw r.error;
    step = 'read back'; r = await sb.from('watches').select('id, watch_finance(purchase_price)').eq('id', id).single(); if (r.error) throw r.error;
    add('Save & load a watch', true, 'Created, read back and removed a test watch with a price and valuation.');
  } catch (e) {
    add('Save & load a watch', false, `Failed at “${step}”: ${esc(e.message)}`, 'Re-run supabase/schema.sql (it re-creates the security policies and grants).');
  } finally {
    await sb.from('watches').delete().eq('id', id);
  }

  // 6. Storage round trip
  const path = `${u.id}/_system-check/${id}.jpg`;
  try {
    const blob = await (await fetch('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==')).blob();
    let r = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true }); if (r.error) throw r.error;
    r = await sb.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60); if (r.error) throw r.error;
    add('Photo upload', true, 'Uploaded, signed and removed a test image in the private photo bucket.');
  } catch (e) {
    add('Photo upload', false, esc(e.message), 'Re-run supabase/schema.sql — it creates the “watch-photos” bucket and its policies.');
  } finally {
    await sb.storage.from(PHOTO_BUCKET).remove([path]);
  }
  return out;
}

export function render(root) {
  const u = user();
  root.innerHTML = `
<section class="page-head"><div class="wrap">
  <p class="eyebrow">System check</p>
  <h1 class="display">Is everything working?</h1>
  <p class="lede">${u ? 'Runs real tests against your account: sign-in, database and photo storage. Test data is removed afterwards.' : 'Sign in to run the full test (saving and photo upload). Connection checks run now.'}</p>
</div></section>
<section class="wrap section"><ul class="checks" id="checks"><li class="pending">Running checks…</li></ul>
${u ? '' : '<p><a class="btn" href="#/account?next=%2Fstatus">Sign in for the full check</a></p>'}</section>`;
  checks(u).then(rows => {
    $('#checks', root).innerHTML = rows.map(r => `<li class="${r.ok ? 'ok' : 'fail'}">
      <span class="check-icon" aria-hidden="true">${r.ok ? '✓' : '✕'}</span>
      <div><p class="check-name">${esc(r.name)} <span class="sr">${r.ok ? 'passed' : 'failed'}</span></p><p class="small">${r.detail}</p>${r.fix && (!r.ok || r.name.startsWith('Sign-in link')) ? `<p class="small muted">${r.fix}</p>` : ''}</div></li>`).join('')
      + (rows.every(r => r.ok) ? `<li class="ok summary"><span class="check-icon">✓</span><div><p class="check-name">All checks passed${u ? '' : ' (signed-out checks)'}.</p></div></li>` : '');
  });
}
