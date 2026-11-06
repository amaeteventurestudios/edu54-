// The certificate page. ?track=<slug> shows that track's certificate: the real one once every lesson in a finished
// track is done, otherwise a sample. ?id=<record> checks a saved certificate against the server (anyone can open it).
// Signed-in learners can save theirs to get that link; the server checks their progress first (server/pb_hooks).
import { SITE, TRACKS, LIVE, certifiable } from '../engine/catalog.js';
import { progress } from './progress.js';
import { account, api } from './account.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LOGO = '<svg class="mark" viewBox="0 0 40 40" fill="none" stroke="#2C2D31" stroke-width="2.3" stroke-linejoin="round" aria-hidden="true"><path d="M20 4l12 6.5L20 17 8 10.5z"/><path d="M8 10.5V17l12 6.5V17M32 10.5V17l-12 6.5"/><path d="M4 23.5l10-5.4M36 23.5l-10-5.4M4 23.5v6.5L16 36.5V30L4 23.5zM36 23.5v6.5L24 36.5V30l12-6.5z" opacity=".55"/></svg>';
const GROUP = { clay: '#A4462A', teal: '#0E6B6B', plum: '#5E2A61', char: '#2C2D31' };
const q = new URLSearchParams(location.search);
const done = progress.all();
const NAME = 'ab-cert-name';
const savedName = () => { try { return localStorage.getItem(NAME) || ''; } catch { return ''; } };

function card({ name, tr, date, id, sample }) {
  const n = LIVE.filter(l => l.track === tr.n).length;
  return `<div class="cert" role="img" aria-label="${esc(`Certificate: ${name} completed ${tr.title}`)}"><div class="edge"></div><div class="in">
    ${LOGO}<div class="k">${esc(SITE.name)} · certificate of completion</div>
    <div class="who">${esc(name || 'Your name')}</div>
    <div class="what">built, broke and fixed every lesson in the track</div>
    <div class="trackname" style="color:${GROUP[tr.group] || '#A4462A'}">Track ${tr.n} · ${esc(tr.title)}</div>
    <div class="meta">${tr.size || n} lessons · ${esc(date)}${id ? ` · check it at ${esc(SITE.url.replace(/^https?:\/\//, ''))}/certificate/?id=${esc(id)}` : ''}</div>
  </div>${sample ? '<div class="sample">SAMPLE</div>' : ''}</div>`;
}

function trackList(cur) {
  return `<div class="tracks">${TRACKS.map(tr => {
    const ls = LIVE.filter(l => l.track === tr.n), k = ls.filter(l => done.has(l.slug)).length, of = tr.size || ls.length;
    const note = certifiable(tr, done) ? 'Ready: your certificate is waiting' : !tr.size ? `${ls.length} lesson${ls.length === 1 ? '' : 's'} open so far, more coming` : ls.length < tr.size ? `${ls.length} of ${tr.size} lessons open so far` : `${of - k} to go`;
    return `<a class="trk" href="?track=${tr.slug}"${tr === cur ? ' aria-current="true"' : ''} style="--g:${GROUP[tr.group]}"><b>Track ${tr.n} · ${esc(tr.title)}</b><span>${k} of ${of}</span><small>${note}</small><span class="bar"><i style="width:${Math.round(100 * k / Math.max(1, of))}%"></i></span></a>`;
  }).join('')}</div>`;
}

async function verify(id) {
  const out = $('#out');
  if (!account.on) { out.innerHTML = '<p class="note">Saved certificates can be checked once accounts open.</p>'; return; }
  try {
    const r = await api(`/api/collections/certificates/records/${encodeURIComponent(id)}`);
    const tr = TRACKS.find(t => t.n === r.track) || TRACKS[0];
    out.innerHTML = `<p class="note"><b>Checked.</b> This certificate is on record: issued ${esc(new Date(r.created).toDateString())}.</p>${card({ name: r.name, tr, date: new Date(r.created).toDateString(), id })}`;
  } catch { out.innerHTML = '<p class="note"><b>Not found.</b> No certificate has this code. Check the link, or ask its owner for a new one.</p>'; }
}

function show(tr) {
  const out = $('#out');
  const ok = certifiable(tr, done);
  if (!ok) {
    out.innerHTML = `<h2>Track ${tr.n}: ${esc(tr.title)}</h2><p>${tr.size && LIVE.filter(l => l.track === tr.n).length >= tr.size ? 'Finish every lesson in this track (pass each one\'s questions) and your certificate appears here.' : 'This track is still being built. When all of its lessons are open and you have finished them, your certificate appears here. This is what it will look like.'}</p>${card({ name: savedName() || 'Your name', tr, date: new Date().toDateString(), sample: true })}`;
    return;
  }
  const u = account.user();
  out.innerHTML = `<h2>Well done.</h2><p>You finished every lesson in Track ${tr.n}. Put your name on it, then print it or save it as a PDF.</p>
    <div class="cert-tools noprint"><label for="nm" class="sr">Name on the certificate</label><input id="nm" type="text" maxlength="60" autocomplete="name" placeholder="Your name" value="${esc(u?.name || savedName())}">
    <button class="btn" id="pr">Print or save as PDF</button>${account.on && u ? '<button class="btn ghost" id="sv">Get a link anyone can check</button>' : ''}</div>
    <p class="noprint" id="msg"></p><div id="cardHost"></div>`;
  const draw = id => { $('#cardHost').innerHTML = card({ name: $('#nm').value.trim() || 'Your name', tr, date: new Date().toDateString(), id }); };
  $('#nm').oninput = () => { try { localStorage.setItem(NAME, $('#nm').value.trim()); } catch { } draw(); };
  $('#pr').onclick = () => print();
  $('#sv')?.addEventListener('click', async () => {
    try {
      const r = await api('/api/collections/certificates/records', { user: u.id, track: tr.n, name: $('#nm').value.trim() || u.name || 'Learner' });
      const link = `${location.origin}${location.pathname}?id=${r.id}`;
      $('#msg').innerHTML = `Saved. Anyone can check it here: <a href="${esc(link)}">${esc(link)}</a>`; draw(r.id);
    } catch (e) { $('#msg').textContent = e.message || 'That did not work. Try again later.'; }
  });
  draw();
}

const id = q.get('id');
const tr = TRACKS.find(t => t.slug === q.get('track'));
$('#list').innerHTML = trackList(tr);
if (id) verify(id);
else if (tr) show(tr);
else $('#out').innerHTML = card({ name: savedName() || 'Your name', tr: TRACKS[0], date: new Date().toDateString(), sample: true });
