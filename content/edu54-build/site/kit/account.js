// Accounts: progress is always kept in this browser; signing in (PocketBase, SITE.api) keeps it on every device
// and lets certificates be checked by anyone with the link. Guests lose nothing: their progress merges on sign-in.
// PocketBase collections (pb_migrations/): users (built in), progress { user, lesson }, certificates { user, track, name }.
import { SITE, TRACKS, LESSONS, certifiable } from '../engine/catalog.js';
import { progress } from './progress.js';
import { esc } from './ui.js';

const API = SITE.api.replace(/\/$/, '');
// Host mode (engine/site.local.js, e.g. Ashanti Build inside LabOS): the learner is already signed in to the host, whose
// session cookie goes with every request. Progress uses the host's two endpoints, GET and POST {api}/progress, and the
// sign-in form never appears. Certificates live on the host's own Progress page.
const HOST = !!(SITE.host && API);
let hostUser = null;
const cookie = n => (document.cookie.split('; ').find(c => c.startsWith(n + '=')) || '').slice(n.length + 1);
async function hostApi(body) {
  const r = await fetch(API + '/progress', {
    method: body ? 'POST' : 'GET', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(body && SITE.csrf ? { 'X-CSRF-Token': decodeURIComponent(cookie(SITE.csrf)) } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`The server said ${r.status}.`);
  return r.json();
}
const AUTH = 'ab-auth';
const getAuth = () => { try { return JSON.parse(localStorage.getItem(AUTH) || 'null'); } catch { return null; } };
const setAuth = a => { try { a ? localStorage.setItem(AUTH, JSON.stringify(a)) : localStorage.removeItem(AUTH); } catch { } };

export async function api(path, body, method) {
  const a = getAuth();
  const r = await fetch(API + path, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(a?.token ? { Authorization: a.token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const f = j?.data && Object.values(j.data)[0]?.message;
    throw new Error(f || j?.message || `The server said ${r.status}.`);
  }
  return j;
}

export const account = {
  on: !!API && !HOST,
  host: HOST,
  user: () => HOST ? hostUser : getAuth()?.record || null,
  async signIn(email, password) {
    const j = await api('/api/collections/users/auth-with-password', { identity: email, password });
    setAuth({ token: j.token, record: j.record }); await account.sync(); return j.record;
  },
  async signUp(name, email, password) {
    await api('/api/collections/users/records', { name, email, password, passwordConfirm: password });
    return account.signIn(email, password);
  },
  reset: email => api('/api/collections/users/request-password-reset', { email }),
  signOut() { setAuth(null); },
  // everything we hold about the signed-in learner, as one JSON file (NDPA / GDPR access and portability)
  async export() {
    const u = account.user(); if (!u) return null;
    const me = await api(`/api/collections/users/records/${u.id}`);
    const f = encodeURIComponent(`user="${u.id}"`);
    const [pr, ce] = await Promise.all([api(`/api/collections/progress/records?perPage=500&filter=${f}`), api(`/api/collections/certificates/records?perPage=100&filter=${f}`)]);
    return { account: { name: me.name, email: me.email, created: me.created }, progress: (pr.items || []).map(x => ({ lesson: x.lesson, at: x.created })), certificates: (ce.items || []).map(x => ({ id: x.id, track: x.track, name: x.name, at: x.created })) };
  },
  // deletes the account; progress and certificates go with it (cascade on the server)
  async remove() { const u = account.user(); if (!u) return; await api(`/api/collections/users/records/${u.id}`, null, 'DELETE'); setAuth(null); },
  // pull the account's lessons into this browser, then push the ones only this browser has
  async sync() {
    if (HOST) {
      // School computers are shared: this browser shows exactly the signed-in learner's lessons from the host, and
      // nothing a previous learner left here is copied into their account. Signed out: the list here is cleared.
      try { const j = await hostApi(); hostUser = { name: j.name || '' }; progress.replace(j.lessons || []); }
      catch (e) { hostUser = null; progress.replace([]); throw e; }
      return;
    }
    const u = account.user(); if (!u) return;
    const j = await api(`/api/collections/progress/records?perPage=500&fields=lesson&filter=${encodeURIComponent(`user="${u.id}"`)}`);
    const theirs = new Set((j.items || []).map(x => x.lesson));
    progress.merge([...theirs]);
    for (const s of progress.all()) if (!theirs.has(s)) await api('/api/collections/progress/records', { user: u.id, lesson: s }).catch(() => { });
  },
};

// save each finished lesson to the account as it happens
progress.on(slug => { if (HOST) { hostApi({ lesson: slug }).catch(() => { }); return; } const u = account.user(); if (API && u) api('/api/collections/progress/records', { user: u.id, lesson: slug }).catch(() => { }); });

export function initAccount(ui) {
  if (HOST) { const show = () => ui.setDone([...progress.all()]); account.sync().then(show, show); return; }
  if (API && account.user()) account.sync().then(() => { for (const s of progress.all()) ui.markDone(s); }).catch(e => { if (/401|403|auth/i.test(e.message)) account.signOut(); });
}

// the Progress pop-up: lessons done per track, certificates, and sign in
export function openAccount(ui) {
  const done = progress.all();
  const live = LESSONS.filter(x => x.live);
  const n = live.filter(x => done.has(x.slug)).length;
  const u = account.user();
  const rows = TRACKS.map(tr => {
    const ls = live.filter(x => x.track === tr.n); if (!ls.length) return '';
    const k = ls.filter(x => done.has(x.slug)).length;
    return `<li><span>${esc(tr.title)}</span><em class="mini"><i style="width:${Math.round(100 * k / Math.max(1, tr.size || ls.length))}%"></i></em><b>${k} of ${tr.size || ls.length}</b>${certifiable(tr, done) ? `<a href="${HOST ? esc(SITE.progress || '#') : `../certificate/?track=${tr.slug}`}">Certificate</a>` : ''}</li>`;
  }).join('');
  let html = `<div class="total"><b>${Math.round(100 * n / Math.max(1, live.length))}%</b><span>${n} of ${live.length} lessons done</span></div><div class="bar"><i style="width:${Math.round(100 * n / Math.max(1, live.length))}%"></i></div><ul class="prog">${rows}</ul>`;
  if (HOST) html += u ? `<p class="fine">Signed in as <b>${esc(u.name)}</b>. Your progress is saved to your ${esc(SITE.hostName || 'school')} account.</p>${SITE.progress ? `<p class="fine"><a href="${esc(SITE.progress)}">See your certificates on your Progress page</a></p>` : ''}` : `<p class="fine">You are not signed in, so lessons you finish are kept in this browser only. Sign in to save them to your account.</p>`;
  else if (!API) html += `<p class="fine">Your progress is saved in this browser. Accounts, so it follows you to every device, open soon.</p>`;
  else if (u) html += `<p class="fine">Signed in as <b>${esc(u.name || u.email)}</b>. Your progress is saved to your account.</p><button class="pbtn ghost" id="acOut">Sign out</button><p class="fine"><button type="button" class="lnk" id="acData">Download my data</button> · <button type="button" class="lnk" id="acDel">Delete my account</button></p><p class="err" id="acErr" hidden></p>`;
  else html += `<p class="fine">Saved in this browser. Make a free account to keep it on every device and put your name on certificates.</p>
    <form id="acForm"><input name="name" placeholder="Your name (for certificates)" autocomplete="name" hidden>
    <input name="email" type="email" placeholder="Email" autocomplete="email" required><input name="password" type="password" placeholder="Password (8 or more characters)" minlength="8" autocomplete="current-password" required>
    <button class="pbtn" type="submit">Sign in</button><p class="fine"><button type="button" class="lnk" id="acMode">New here? Make an account</button> · <button type="button" class="lnk" id="acReset">Forgot password</button></p><p class="err" id="acErr" hidden></p></form>
    <p class="fine">By making an account you agree to the <a href="../terms/">terms</a> and <a href="../privacy/">privacy policy</a>. You must be 13 or older.</p>`;
  ui.showPop(u ? 'Your progress' : 'Progress', html, 'acct');
  const $ = s => document.querySelector(s);
  $('#acOut')?.addEventListener('click', () => { account.signOut(); openAccount(ui); });
  $('#acData')?.addEventListener('click', async () => {
    try { const d = await account.export(); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })); a.download = 'amaete-build-my-data.json'; a.click(); }
    catch (e) { const x = $('#acErr'); x.hidden = false; x.textContent = e.message; }
  });
  $('#acDel')?.addEventListener('click', async () => {
    if (!confirm('Delete your account, progress and certificates for good? Progress in this browser stays.')) return;
    try { await account.remove(); openAccount(ui); } catch (e) { const x = $('#acErr'); x.hidden = false; x.textContent = e.message; }
  });
  const form = $('#acForm'); if (!form) return;
  let mode = 'in';
  const err = m => { const e = $('#acErr'); e.hidden = !m; e.textContent = m || ''; };
  $('#acMode').onclick = () => {
    mode = mode === 'in' ? 'up' : 'in';
    form.name.hidden = mode === 'in'; form.name.required = mode === 'up';
    form.querySelector('[type=submit]').textContent = mode === 'in' ? 'Sign in' : 'Make my account';
    $('#acMode').textContent = mode === 'in' ? 'New here? Make an account' : 'Have an account? Sign in';
    form.password.autocomplete = mode === 'in' ? 'current-password' : 'new-password';
  };
  $('#acReset').onclick = async () => { if (!form.email.value) return err('Type your email first.'); try { await account.reset(form.email.value); err('If that email has an account, a reset link is on its way.'); } catch (e) { err(e.message); } };
  form.onsubmit = async e => {
    e.preventDefault(); err('');
    try {
      if (mode === 'in') await account.signIn(form.email.value, form.password.value);
      else await account.signUp(form.name.value.trim(), form.email.value, form.password.value);
      for (const s of progress.all()) ui.markDone(s);
      openAccount(ui);
    } catch (x) { err(x.message || 'That did not work. Check your connection and try again.'); }
  };
}
