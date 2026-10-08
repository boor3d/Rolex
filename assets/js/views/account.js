import { esc, toast, $, $$ } from '../util.js';
import { sb, redirectUrl } from '../supabase.js';
import { user, watches, signOut, adopt } from '../store.js';
import { field } from './fields.js';

let mode = 'signin';

function signedIn(root, u) {
  root.innerHTML = `
<section class="page-head"><div class="wrap">
  <p class="eyebrow">Account</p>
  <h1 class="display">Your account</h1>
</div></section>
<section class="wrap section settings">
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Signed in</h2></div>
    <p>${esc(u.email)}</p>
    <p class="muted small">${watches().length} watch${watches().length === 1 ? '' : 'es'} in your collection.</p>
    <div class="row-gap"><a class="btn" href="#/">Go to my collection</a><a class="btn btn-ghost" href="#/settings">Settings</a><a class="btn btn-ghost" href="#/status">System check</a><button class="btn btn-ghost" id="out">Sign out</button></div>
  </div>
  <div class="panel">
    <div class="panel-head"><h2 class="display-sm">Password</h2><p class="muted">Set one if you signed in with an email link.</p></div>
    <form id="pw" class="fields">
      ${field('New password', '<input type="password" name="password" minlength="8" autocomplete="new-password" required>', 'At least 8 characters.', 'span-2')}
      <div class="span-2"><button class="btn" type="submit">Update password</button></div>
    </form>
  </div>
</section>`;
  $('#out', root).addEventListener('click', async () => { await signOut(); toast('Signed out'); location.hash = '#/'; });
  $('#pw', root).addEventListener('submit', async e => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: e.target.password.value });
    toast(error ? error.message : 'Password updated');
    if (!error) e.target.reset();
  });
}

export function render(root, { query }) {
  const u = user();
  if (u) return signedIn(root, u);
  if (query.get('mode') === 'signup') mode = 'signup';
  const next = query.get('next') || '/';

  root.innerHTML = `
<section class="auth-wrap wrap section">
  <div class="auth-card">
    <p class="eyebrow">${mode === 'signup' ? 'Create your account' : 'Welcome back'}</p>
    <h1 class="display-sm">${mode === 'signup' ? 'Start your collection' : 'Sign in'}</h1>
    <p class="muted">${mode === 'signup'
      ? 'Free. Your collection, prices and photos are private to your account.'
      : 'Sign in to view and edit your collection.'}</p>
    <div class="seg auth-tabs" role="tablist">
      <button role="tab" data-mode="signin" aria-pressed="${mode === 'signin'}">Sign in</button>
      <button role="tab" data-mode="signup" aria-pressed="${mode === 'signup'}">Create account</button>
    </div>
    <form id="auth" class="auth-form">
      ${field('Email', '<input type="email" name="email" autocomplete="email" required>')}
      ${field('Password', `<input type="password" name="password" minlength="8" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required>`, mode === 'signup' ? 'At least 8 characters.' : '')}
      <button class="btn" type="submit">${mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      <button class="link" type="button" id="magic">Email me a sign-in link instead</button>
      <p class="auth-msg" id="msg" role="status"></p>
    </form>
  </div>
</section>`;

  const form = $('#auth', root), msg = $('#msg', root);
  const busy = on => form.querySelectorAll('button').forEach(b => { b.disabled = on; });
  $$('[data-mode]', root).forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; render(root, { query }); }));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = form.email.value.trim(), password = form.password.value;
    busy(true); msg.textContent = '';
    try {
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl() } });
        if (error) throw error;
        if (data.session) { await adopt(data.session); location.hash = '#' + next; return; }
        msg.innerHTML = `<strong>Check your inbox.</strong> We sent a confirmation link to ${esc(email)}. Open it in this browser to finish.`;
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await adopt(data.session);
        toast('Signed in');
        location.hash = '#' + next;
      }
    } catch (err) {
      msg.textContent = err.message;
    } finally { busy(false); }
  });

  $('#magic', root).addEventListener('click', async () => {
    const email = form.email.value.trim();
    if (!form.email.checkValidity() || !email) { msg.textContent = 'Enter your email first.'; form.email.focus(); return; }
    busy(true);
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl() } });
    busy(false);
    msg.innerHTML = error ? esc(error.message) : `<strong>Check your inbox.</strong> Open the link from ${esc(email)} in this browser.`;
  });
}
