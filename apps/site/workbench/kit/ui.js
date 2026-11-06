// The page shell for every lesson: the lesson pane, the title over the stage, the control bar, the drawer
// (Lesson, Try it, Code), readouts, callouts, the status line and the walkthrough caption.
// Phones get one control bar and a bottom sheet (portrait) or a column (landscape); panels open in the sheet's place.
// Layout patterns come from Amaete Circuits; the look (four colour families, Bricolage and Instrument Sans) is this site's own.
import { SITE, SOURCE, TRACKS, LESSONS, trackOf } from '../engine/catalog.js';
import { money, CURRENCIES } from './money.js';

export const ICON = {
  logo: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round" aria-hidden="true"><path d="M20 4l12 6.5L20 17 8 10.5z"/><path d="M8 10.5V17l12 6.5V17M32 10.5V17l-12 6.5"/><path d="M4 23.5l10-5.4M36 23.5l-10-5.4M4 23.5v6.5L16 36.5V30L4 23.5zM36 23.5v6.5L24 36.5V30l12-6.5z" opacity=".55"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M2 5c3-1.5 6.5-1.5 10 1 3.5-2.5 7-2.5 10-1v14c-3-1.5-6.5-1.5-10 1-3.5-2.5-7-2.5-10-1z"/><path d="M12 6v14"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6 2 12l6 6M16 6l6 6-6 6"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 3l14 8-6 2-3 6z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  rotL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  rotR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/></svg>',
  theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
  turn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M21 15a9 9 0 0 1-6 6M3 9a9 9 0 0 1 6-6" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4M12 16h.01"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  spark: '<path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/>',
  scale: '<path d="M12 3v18M5 21h14M4 8h16M7 8l-3 7h6zM17 8l-3 7h6z"/>',
  link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
  box: '<path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  wave: '<path d="M2 12c2.5-6 5-6 7.5 0s5 6 7.5 0 3.5-4 5-2"/>',
};
const svgI = d => d.startsWith('<svg') ? d : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const lsTry = (f, d) => { try { return f(); } catch { return d; } };

/* ---------- a tiny highlighter for the code panel (Python, JavaScript, TypeScript, C) ---------- */
const KW = new Set('def return if elif else for while in not and or import from as class with try except finally raise lambda None True False pass break continue yield async await const let var function new of typedef struct int float double char void include export interface type'.split(' '));
function highlight(src) {
  let out = '';
  const re = /(#[^\n]*|\/\/[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`[^`]*`)|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)(\s*\()?|([\s\S])/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[1]) out += `<span class="com">${esc(m[1])}</span>`;
    else if (m[2]) out += `<span class="str">${esc(m[2])}</span>`;
    else if (m[3]) out += `<span class="num">${m[3]}</span>`;
    else if (m[4]) out += KW.has(m[4]) ? `<span class="k">${m[4]}</span>${esc(m[5] || '')}` : m[5] ? `<span class="fn">${m[4]}</span>${esc(m[5])}` : esc(m[4]);
    else out += esc(m[6]);
  }
  return out;
}

// the lesson notes: one long overview string, shown as short paragraphs of two or three sentences
function paras(t) {
  if (!t) return '<p class="lead"></p>';
  if (/<p[\s>]/.test(t)) return t.replace(/<p(?=[\s>])/, '<p class="lead"').replace(/<p>/g, '<p class="ovp">');
  const ss = t.split(/(?<=[a-z0-9)\]'"%][.!?]['")]?)\s+(?=[A-Z0-9"'(<])/).filter(Boolean);
  const out = []; let cur = '';
  for (const x of ss) {
    if (cur && (cur.length + x.length > 300 || (cur.match(/[.!?]['")]?(\s|$)/g) || []).length >= 3)) { out.push(cur); cur = x; }
    else cur = cur ? cur + ' ' + x : x;
  }
  if (cur) { if (out.length && cur.length < 70) out[out.length - 1] += ' ' + cur; else out.push(cur); }
  return out.map((x, i) => `<p class="${i ? 'ovp' : 'lead'}">${x}</p>`).join('');
}

export function createUI(L, H) {
  const meta = LESSONS.find(x => x.slug === L.slug) || {};
  const track = trackOf(meta);
  const isExam = track?.n === 12;
  if (!document.title) document.title = `${L.title} · ${SITE.name}`;
  document.body.dataset.group = track?.group || 'clay';
  const eyebrow = `Track ${track?.n} · ${esc(track?.title || '')} · Lesson ${meta.n || ''}`;
  const steps = L.story || [];
  const stepTitle = st => st.t || String(st.say || '').replace(/<[^>]+>/g, '').split(/(?<=[.!?:])\s/)[0];
  const checks = L.check || [];
  // show the options in a fixed shuffled order, so the right answer isn't always in the same place
  const mix = c => { let h = 0; for (const ch of c.q) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const o = c.options.map((_, i) => i); for (let i = o.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o; };
  const srcUrl = meta.src && meta.src.startsWith('phases/') || meta.src?.startsWith('certifications/') ? SOURCE.file(meta.src) : null;
  // the course is credited once, in the site footer and on the credits page; only lessons from other sources carry their own line
  const credit = L.credit || '';
  // a host platform (engine/site.local.js) has its own lessons page: home and track links go there
  const trackHref = SITE.home ? `${SITE.home}${track ? `?track=${track.slug}` : ''}` : `../${track ? track.slug + '/' : ''}`;
  const disclaimer = String(L.disclaimer || '').replace(/Amaete Build/g, SITE.name);
  document.body.innerHTML = `
<div class="app">
  <aside class="pane" id="pane" aria-label="Lessons">
    <div class="pane-h">
      <a class="brand" href="${SITE.home || '../'}" aria-label="${esc(SITE.name)} home">${ICON.logo}<div><div class="brand-name">${esc(SITE.name)}</div><div class="brand-tag">Turn it · Break it · Fix it</div></div></a>
      <button class="pane-x" data-act="pane" aria-label="Hide the lessons" title="Hide the lessons">${ICON.left}</button>
    </div>
    <div class="pane-l" id="lessonHost"></div>
  </aside>
  <main class="main">
    <section class="stage" id="stage" aria-label="${esc(`3D lesson: ${L.title}`)}">
      <canvas id="c"></canvas>
      <svg id="leaders" aria-hidden="true"></svg>
      <div id="labels"></div>
      <header class="hero" id="hero">
        <button class="pane-o" data-act="pane" aria-label="Show the lessons" title="Lessons">${ICON.book}</button>
        <a class="eyebrow" href="${trackHref}">${eyebrow}</a>
        <h1>${esc(L.title)}</h1>
        <p>${esc(L.description || '')}</p>
      </header>
      <nav class="phnav" aria-label="Leave this lesson">
        <a class="pn-back" href="${trackHref}" aria-label="Back to ${esc(track ? track.title : 'all lessons')}">${ICON.left}</a>
        <button class="pn-list" data-goto="lessonsFly" aria-label="Other lessons">${ICON.book}<span>Lessons</span></button>
      </nav>
      <div class="topr" role="toolbar" aria-label="Page">
        <button data-act="account" id="acctBtn">${ICON.user}<span>Progress</span><em class="pgb" aria-hidden="true"><i></i></em></button>
        ${L.money ? `<button data-act="money" aria-label="Choose your currency">${ICON.money}<span id="curBtn">${money.code}</span></button>` : ''}
        <button data-act="theme" aria-label="Light or dark">${ICON.theme}<span>Theme</span></button>
        <button data-act="share">${ICON.share}<span>Share</span></button>
      </div>
      <div class="readout" id="readout" aria-live="off"></div>
      <div class="tools" role="toolbar" aria-label="View">
        <button data-act="zIn" title="Zoom in" aria-label="Zoom in">${ICON.plus}</button>
        <button data-act="zOut" title="Zoom out" aria-label="Zoom out">${ICON.minus}</button>
        <span class="sep"></span>
        <button data-act="rotL" title="Turn left" aria-label="Turn left">${ICON.rotL}</button>
        <button data-act="rotR" title="Turn right" aria-label="Turn right">${ICON.rotR}</button>
        <span class="sep"></span>
        <button data-act="fit" title="Whole machine" aria-label="Whole machine">${ICON.fit}</button>
      </div>
      <button class="sideways" id="sideways" hidden>${ICON.turn}<span>Best viewed sideways</span><i aria-hidden="true">✕</i></button>
      <div class="lower" id="lower">
        <div class="caption" id="caption" hidden aria-live="polite">
          <div class="cap-h"><span id="capN"></span><span class="cap-bar"><i id="capBar"></i></span>
            <button data-cap="prev" aria-label="Back">${ICON.left}</button><button data-cap="pause" aria-label="Pause">${ICON.pause}</button><button data-cap="next" aria-label="Next">${ICON.right}</button><button data-cap="speed" class="spd" aria-label="Voice speed">1×</button><button data-cap="who" class="spd who" aria-label="Female or male voice" hidden>Female</button><button data-cap="close" aria-label="Stop the walkthrough">✕</button></div>
          <p id="capT"></p>
        </div>
        <div class="status" id="status"><i></i><p id="statusMsg"></p></div>
      </div>
      <div class="fly" id="lessonsFly" hidden><header><h3>Lessons</h3><small id="lessonCount"></small><button class="x" data-close aria-label="Close">✕</button></header><div class="list" id="lessonList"></div></div>
      <div class="fly vp" id="viewPnl" hidden><header><h3>More</h3><button class="x" data-close aria-label="Close">✕</button></header><div class="list vgrid">
        <button data-goto="lessonsFly">${ICON.book}<span>Lessons</span></button>
        <button data-act="rotL">${ICON.rotL}<span>Turn left</span></button>
        <button data-act="rotR">${ICON.rotR}<span>Turn right</span></button>
        <button data-act="zIn">${ICON.plus}<span>Zoom in</span></button>
        <button data-act="zOut">${ICON.minus}<span>Zoom out</span></button>
        <button data-act="fit">${ICON.fit}<span>Whole machine</span></button>
        <button data-act="labels" aria-pressed="true">${svgI(ICON.info)}<span>Labels</span></button>
        <button data-act="account">${ICON.user}<span>Progress</span></button>
        ${L.money ? `<button data-act="money">${ICON.money}<span>Currency</span></button>` : ''}
        <button data-act="theme">${ICON.theme}<span>Theme</span></button>
        <button data-act="share">${ICON.share}<span>Share</span></button>
      </div></div>
      <div class="pop" id="pop" hidden><button class="x" id="popX" aria-label="Close">✕</button><h3 id="popT"></h3><div id="popP"></div></div>
    </section>
    <aside class="rail" id="rail">
      <div class="sheet-top"><button class="sheet-tk" data-act="tuck" aria-label="Hide the lesson to see more of the machine">${ICON.down}<span>Hide</span></button><div class="sheet-grip"></div><button class="sheet-x" data-act="sheet" aria-label="Open or close the lesson">${ICON.down}<span>More</span></button></div>
      <div class="card info" id="infoCard">
        <div class="pnl-h dk">Lesson<button class="pnl-x" data-close aria-label="Close">✕</button></div>
        <div class="tabpanel">
          <h2>${esc(L.title)}</h2>
          ${paras(L.overview)}
          ${isExam ? `<div class="indep"><b>Independent preparation.</b> ${disclaimer}</div>` : ''}
          ${steps.length ? `<h4 class="steps-h">The lesson in ${steps.length} steps</h4><ol class="steps" id="steps">${steps.map((st, i) => `<li><button data-step="${i}"><span class="n">${i + 1}</span><span class="tx">${esc(stepTitle(st))}</span></button></li>`).join('')}</ol>` : ''}
          ${checks.length ? `<div class="check" id="check"><h4>Check yourself <small id="checkScore">0 of ${checks.length}</small></h4>${checks.map((c, k) => `<div class="cq" data-q="${k}"><p class="q"><span>${k + 1}</span>${esc(c.q)}</p><div class="opts">${mix(c).map(i => `<button data-opt="${i}">${esc(c.options[i])}</button>`).join('')}</div><p class="why" hidden></p></div>`).join('')}<p class="done" id="checkDone" hidden>${ICON.check}<span>Lesson complete. It is saved in your progress.</span></p></div>` : ''}
          ${L.practice?.length ? `<div class="check practice" id="practice"><h4>Practice questions <small id="pracScore">0 of ${L.practice.length}</small></h4><p class="fine">Scenario questions written for this site, in the style of the exam. Your score here is a raw count, not a prediction of an exam result.</p>${L.practice.map((c, k) => `<div class="cq" data-q="${k}"><p class="q"><span>${k + 1}</span>${esc(c.q)}</p><div class="opts">${mix(c).map(i => `<button data-opt="${i}">${esc(c.options[i])}</button>`).join('')}</div><p class="why" hidden></p></div>`).join('')}</div>` : ''}
          ${L.terms?.length ? `<h4>Words to know</h4><dl class="terms">${L.terms.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${b}</dd>`).join('')}</dl>` : ''}
          ${L.deeper ? `<details class="deeper"><summary>Go deeper</summary><div>${L.deeper}</div></details>` : ''}
          ${credit ? `<p class="credit">${credit}</p>` : ''}
        </div>
      </div>
      <div class="card trycard" id="tryCard" hidden><div class="pnl-h">Try it<button class="pnl-x" data-close aria-label="Close">✕</button></div><div class="try"><div id="tryList"></div>
        <div class="breaks" id="breaks" hidden><h4>${ICON.bolt}<span>Break it</span></h4><p>Each one breaks the machine on purpose. Watch the status line explain what goes wrong.</p><div class="bl" id="breakList"></div></div>
      </div></div>
      <div class="card code" id="codeCard" hidden>
        <div class="pnl-h">Code<button class="pnl-x" data-close aria-label="Close">✕</button></div>
        <div class="code-head"><h3>${esc(L.code?.title || 'The same idea in code')}</h3><button class="cbtn" id="copyBtn">${ICON.copy}<span>Copy</span></button></div>
        ${L.code?.note ? `<p class="code-help">${L.code.note}</p>` : ''}
        <div class="ed-scroll"><pre class="ed" id="codeEl"></pre></div>
        ${L.code?.after ? `<p class="code-help">${L.code.after}</p>` : ''}
        ${srcUrl ? `<p class="code-src">Adapted from <a href="${srcUrl}" target="_blank" rel="noopener">${esc(meta.src.split('/').pop())}</a> · ${SOURCE.name} · MIT License</p>` : L.codeSource ? `<p class="code-src">${L.codeSource}</p>` : ''}
      </div>
    </aside>
  </main>
</div>
<div id="pnls"></div>
<nav class="dock" id="dock" aria-label="Controls">
  <button class="ic dk" data-act="fit" aria-label="Whole machine" title="Whole machine">${ICON.reset}</button>
  <span class="sep dk"></span>
  <button class="playb" data-act="play" aria-label="Play the lesson">${ICON.play}<span class="lng">Play the lesson</span><span class="sh">Play</span></button>
  <span class="quick dk" id="quick"></span>
  <button class="tab" data-panel="try" aria-pressed="false" id="dockTry">${ICON.hand}<span>Try it</span></button>
  <button class="tab" data-panel="break" aria-pressed="false" id="dockBreak" hidden>${ICON.bolt}<span>Break it</span></button>
  <button class="tab" data-panel="code" aria-pressed="false" id="dockCode">${ICON.code}<span>Code</span></button>
  <button class="tab dk" data-panel="lesson" aria-pressed="false">${ICON.book}<span>Lesson</span></button>
  <button class="tab ph" data-panel="viewPnl" aria-pressed="false">${ICON.dots}<span>More</span></button>
  <span class="sep dk"></span>
  <button class="ic dk" data-act="full" aria-label="Full screen" title="Full screen">${ICON.fit}</button>
</nav>`;

  const stage = $('#stage'), canvas = $('#c'), rail = $('#rail'), dock = $('#dock'), pnls = $('#pnls');
  const codeCard = $('#codeCard'), tryCard = $('#tryCard');
  if (!L.code) $('#dockCode').hidden = true;
  else { $('#codeEl').innerHTML = highlight(L.code.text.replace(/^\n+|\s+$/g, '')); }
  $('#copyBtn').onclick = async () => { try { await navigator.clipboard.writeText(L.code.text.trim()); $('#copyBtn span').textContent = 'Copied'; setTimeout(() => { $('#copyBtn span').textContent = 'Copy'; }, 1400); } catch { } };

  /* ---------- the lesson list: the left pane on a desktop, a panel on phones ---------- */
  const lessonList = $('#lessonList');
  lessonList.innerHTML = `<div class="lsearch"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg><input type="search" id="lessonQ" placeholder="Search lessons" aria-label="Search lessons" autocomplete="off"></div><p class="lnone" id="lessonNone" hidden>No lesson matches that. Try another word.</p><div id="lessonItems"></div>`;
  const lessonItems = $('#lessonItems'), lessonQ = $('#lessonQ');
  function filterList() {
    const words = lessonQ.value.toLowerCase().split(/\s+/).filter(Boolean); let any = false, head = null, shown = 0;
    const flush = () => { if (head) head.hidden = words.length > 0 && !shown; };
    for (const el of lessonItems.children) {
      if (el.classList.contains('trk')) { flush(); head = el; shown = 0; continue; }
      const t = el.dataset.q || ''; const ok = words.every(w => t.includes(w));
      el.hidden = !ok; if (ok) { shown++; any = true; }
    }
    flush(); $('#lessonNone').hidden = any;
  }
  lessonQ.addEventListener('input', () => { filterList(); const h = lessonList.parentElement; if (h) h.scrollTop = 0; });
  lessonQ.addEventListener('keydown', e => { if (e.key === 'Enter') { const a = lessonItems.querySelector('a.item:not([hidden])'); if (a) location.href = a.href; } });
  const done = new Set(lsTry(() => JSON.parse(localStorage.getItem('ab-done') || '[]'), []));
  function renderList() {
    const live = LESSONS.filter(x => x.live);
    $('#lessonCount').textContent = `${live.length} open`;
    const pct = Math.round(100 * live.filter(x => done.has(x.slug)).length / Math.max(1, live.length)); const pg = $('#acctBtn .pgb i'); if (pg) pg.style.width = `${pct}%`; $('#acctBtn')?.setAttribute('title', `${pct}% of lessons done`);
    let html = '';
    for (const tr of TRACKS) {
      const items = LESSONS.filter(x => x.track === tr.n);
      if (!items.length) continue;
      html += `<div class="trk" data-g="${tr.group}"><i></i>Track ${tr.n} · ${esc(tr.title)}</div>`;
      for (const x of items) {
        const on = x.slug === L.slug, ok = done.has(x.slug);
        const inner = `<span class="b${ok ? ' ok' : ''}" data-g="${tr.group}">${ok ? ICON.check : String(x.n).padStart(2, '0')}</span><span><span class="t">${esc(x.title)}</span><span class="d">${on ? 'Open now' : ok ? 'Done' : x.live ? 'Open' : 'Soon'}</span></span>`;
        const q = esc(`${x.title} ${tr.title} ${x.n}`.toLowerCase());
        html += x.live && !on ? `<a class="item" data-q="${q}" href="../${x.slug}/">${inner}</a>` : `<div class="item${on ? ' on' : ' off'}" data-q="${q}"${on ? ' aria-current="page"' : ''}>${inner}</div>`;
      }
    }
    lessonItems.innerHTML = html; filterList();
  }
  renderList();
  const setPane = on => { document.body.classList.toggle('paneoff', !on); lsTry(() => localStorage.setItem('ab-pane', on ? '1' : '0')); };
  setPane(lsTry(() => localStorage.getItem('ab-pane'), '1') !== '0' && innerWidth >= 1100);
  document.querySelectorAll('[data-act="pane"]').forEach(b => b.onclick = () => { const off = document.body.classList.contains('paneoff') || document.body.classList.contains('panefold'); document.body.classList.remove('panefold'); setPane(off); requestAnimationFrame(measure); });

  /* ---------- panels ---------- */
  // Desktop: one drawer on the right holds the lesson, Try it or Code. Phones: the lesson is a bottom sheet; the others open in its place.
  const FLIES = ['lessonsFly', 'viewPnl'];
  let panel = null, desk = null;
  const closeFlies = () => { for (const id of FLIES) $('#' + id).hidden = true; };
  function closeAll() { if (form === 'desktop') setDesk(null); else setPanel(null); }
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => closeAll());
  function setDesk(p) {
    if (p === 'break') { p = 'try'; requestAnimationFrame(() => $('#breaks')?.scrollIntoView({ block: 'start', behavior: 'smooth' })); }
    desk = p;
    const card = { lesson: $('#infoCard'), try: tryCard, code: codeCard };
    for (const [k, el] of Object.entries(card)) el.hidden = k !== p;
    rail.hidden = !card[p];
    for (const id of FLIES) $('#' + id).hidden = id !== p;
    document.body.classList.toggle('drawer', !!card[p]);
    document.body.classList.toggle('panefold', !!card[p] && innerWidth < 1440);
    dock.querySelectorAll('[data-panel]').forEach(b => b.setAttribute('aria-pressed', b.dataset.panel === p));
    lsTry(() => localStorage.setItem('ab-desk', p === 'lesson' ? p : ''));
    requestAnimationFrame(measure);
  }

  /* ---------- forms: desktop, phone portrait (sheet), phone landscape (column) ---------- */
  const mqLand = matchMedia('(orientation: landscape) and (max-height: 540px)');
  let form = '';
  const formNow = () => mqLand.matches ? 'land' : innerWidth <= 860 ? 'sheet' : 'desktop';
  function reform() {
    const f = formNow();
    if (f !== form) {
      const first = !form;
      form = f;
      document.body.classList.toggle('compact', f !== 'desktop');
      document.body.classList.toggle('sheet', f === 'sheet');
      document.body.classList.toggle('land', f === 'land');
      closeFlies();
      if (f === 'desktop') {
        rail.append(tryCard, codeCard); codeCard.classList.remove('pnl'); tryCard.classList.remove('pnl'); rail.classList.remove('open', 'tuck');
        $('#lessonHost').append(lessonList); panel = null; document.body.classList.remove('panel');
        requestAnimationFrame(() => { const on = lessonItems.querySelector('.item.on'); const host = $('#lessonHost'); if (on) host.scrollTop = on.offsetTop - host.clientHeight / 2 + on.offsetHeight / 2; });
        setDesk(first ? (lsTry(() => localStorage.getItem('ab-desk'), '') || null) : null);
      } else {
        pnls.append(tryCard, codeCard); $('#lessonsFly').append(lessonList);
        $('#infoCard').hidden = false; rail.hidden = false; document.body.classList.remove('drawer');
        setPanel(panel, true);
      }
      if (f === 'land') document.body.style.setProperty('--col-w', `${Math.min(330, Math.round(innerWidth * 0.4))}px`);
    }
    sideways();
    measure();
  }
  function setPanel(p, quiet) {
    if (form === 'desktop') { setDesk(p === desk && !quiet ? null : p); return; }
    let toBreaks = false;
    if (p === 'break') { p = 'try'; toBreaks = true; }
    if (p === 'lesson') p = 'sheet';
    panel = p === panel && !quiet && !toBreaks ? null : p;
    if (p === 'sheet') { panel = null; if (form === 'sheet') openSheet(!rail.classList.contains('open')); }
    codeCard.classList.toggle('pnl', panel === 'code'); codeCard.hidden = panel !== 'code';
    tryCard.classList.toggle('pnl', panel === 'try'); tryCard.hidden = panel !== 'try';
    for (const id of FLIES) $('#' + id).hidden = panel !== id;
    document.body.classList.toggle('panel', !!panel);
    if (panel && rail.classList.contains('open')) { rail.classList.remove('open'); sheetLabel(); }
    dock.querySelectorAll('[data-panel]').forEach(b => b.setAttribute('aria-pressed', b.dataset.panel === panel || (b.dataset.panel === 'viewPnl' && panel === 'lessonsFly')));
    if (toBreaks) requestAnimationFrame(() => { const br = $('#breaks'); if (br) tryCard.scrollTop = br.offsetTop - 8; });
    measure();
  }
  const sheetLabel = () => { $('.sheet-x span').textContent = rail.classList.contains('open') ? 'Close' : rail.classList.contains('tuck') ? 'Lesson' : 'More'; };
  function openSheet(o) {
    if (form !== 'sheet') return;
    rail.classList.toggle('open', !!o); if (o) { rail.classList.remove('tuck'); if (panel) setPanel(null, true); }
    if (!o) rail.scrollTop = 0;
    sheetLabel(); measure();
  }
  function tuck(t) { if (form !== 'sheet') return; rail.classList.toggle('tuck', !!t); if (t) rail.classList.remove('open'); rail.scrollTop = 0; sheetLabel(); measure(); }
  dock.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => setPanel(b.dataset.panel));
  document.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => setPanel(b.dataset.goto));
  // swipe the sheet: up to open, down to close, down again to tuck it away
  let sy = null;
  rail.addEventListener('touchstart', e => { sy = [e.touches[0].clientY, rail.scrollTop, !!e.target.closest('.sheet-top')]; }, { passive: true });
  rail.addEventListener('touchmove', e => {
    if (!sy || form !== 'sheet') return;
    const dy = e.touches[0].clientY - sy[0], open = rail.classList.contains('open'), tk = rail.classList.contains('tuck');
    if (tk && dy < -20) { tuck(false); sy = null; }
    else if (!open && !tk && dy < -24) { openSheet(true); sy = null; }
    else if (!open && !tk && dy > 24) { tuck(true); sy = null; }
    else if (open && (sy[2] || (sy[1] <= 0 && rail.scrollTop <= 0)) && dy > 40) { openSheet(false); sy = null; }
  }, { passive: true });
  rail.addEventListener('touchend', () => { sy = null; });
  rail.addEventListener('click', e => {
    if (form !== 'sheet' || e.target.closest('[data-act],a,button,summary')) return;
    if (rail.classList.contains('tuck')) { tuck(false); return; }
    if (!rail.classList.contains('open')) openSheet(true);
  });
  $('[data-act="sheet"]').onclick = () => { if (rail.classList.contains('tuck')) tuck(false); else openSheet(!rail.classList.contains('open')); };
  $('[data-act="tuck"]').onclick = () => tuck(true);

  // portrait phones: some machines read better sideways; say so once
  function sideways() {
    const el = $('#sideways');
    const want = L.orient === 'landscape' && form === 'sheet' && !lsTry(() => sessionStorage.getItem('ab-side'), null);
    el.hidden = !want;
  }
  $('#sideways').onclick = () => { lsTry(() => sessionStorage.setItem('ab-side', '1')); $('#sideways').hidden = true; measure(); };

  // how much of the stage is covered (px): the machine is framed in what is left
  let area = { top: 0, bottom: 0, left: 0, right: 0 };
  function measure() {
    let a;
    const sr = stage.getBoundingClientRect();
    if (form === 'desktop') {
      const hr = $('#hero').getBoundingClientRect(), lr = $('#lower').getBoundingClientRect(), dr = dock.getBoundingClientRect();
      const low = Math.min(lr.height ? lr.top : dr.top, dr.top);
      const ro = $('#readout').getBoundingClientRect();
      const gut = CARDS.length && sr.width >= 760 ? CARD_W + 24 : 0; // room for the card columns, so cards sit beside the machine
      a = { top: Math.round(hr.bottom - sr.top) + 6, bottom: Math.max(100, Math.round(sr.bottom - low) + 10), left: 24 + gut, right: gut ? gut + 72 : 70 };
      document.body.style.setProperty('--stage-l', `${Math.round(sr.left)}px`);
      document.body.style.setProperty('--stage-w', `${Math.round(sr.width)}px`);
      document.body.classList.toggle('tight', sr.width < 1020);
    } else {
      const ro = $('#readout'), st = $('#status');
      const roH = Math.max(ro.childElementCount ? ro.offsetHeight + 8 : 0, 50);
      document.body.style.setProperty('--status-top', `${8 + roH}px`);
      let top = 8 + roH + (st.hidden ? 0 : st.offsetHeight + 6);
      const capEl = $('#caption'), capOn = form === 'sheet' && capEl && !capEl.hidden;
      if (capOn) { document.body.style.setProperty('--cap-top', `${8 + roH}px`); top = 8 + roH + capEl.offsetHeight + 10; }
      const sw = $('#sideways'); if (!sw.hidden) { sw.style.top = `${top}px`; top += sw.offsetHeight + 8; }
      let below;
      if (form === 'sheet') {
        const peekH = rail.classList.contains('tuck') ? $('.sheet-top').offsetHeight + 4 : $('.sheet-top').offsetHeight + $('.info h2').offsetHeight + ($('.info p.lead')?.offsetHeight || 0) + 24;
        document.body.style.setProperty('--peek', `${Math.round(Math.min(peekH, innerHeight * 0.3))}px`);
        const pe = panel === 'code' ? codeCard : panel === 'try' ? tryCard : panel ? $('#' + panel) : null;
        if (pe) { pe.style.height = 'auto'; const ch = pe.scrollHeight; pe.style.height = ''; const h = Math.round(Math.min(innerHeight * 0.46, Math.max(150, ch + 8))); document.body.style.setProperty('--pnl-h', `${h}px`); below = h; }
        else below = rail.classList.contains('open') ? rail.offsetHeight : Math.min(peekH, innerHeight * 0.3);
        document.body.style.setProperty('--below', `${Math.round(below)}px`);
        a = { top, bottom: below + 8 + dock.offsetHeight + 8 - (innerHeight - sr.bottom), left: 6, right: 6, auto: true };
      } else {
        a = { top, bottom: dock.offsetHeight + 16, left: 6, right: 6, auto: true };
      }
    }
    area = a;
    H.layout?.(a);
  }
  addEventListener('resize', reform);
  mqLand.addEventListener('change', reform);

  /* ---------- toolbar ---------- */
  const acts = { ...H.view };
  document.querySelectorAll('[data-act]').forEach(b => { const a = b.dataset.act; if (acts[a]) b.addEventListener('click', () => acts[a](b)); });
  $('[data-act="play"]', dock).onclick = () => H.play?.();
  $('[data-act="full"]', dock).onclick = () => { const d = document; if (d.fullscreenElement) d.exitFullscreen?.(); else d.documentElement.requestFullscreen?.().catch(() => { }); };
  document.querySelectorAll('[data-act="theme"]').forEach(b => b.onclick = () => {
    const root = document.documentElement, dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark'; lsTry(() => localStorage.setItem('ab-theme', JSON.stringify(root.dataset.theme))); H.themeChanged?.();
  });
  // the currency picker: lessons with prices redraw in the learner's own money
  document.querySelectorAll('[data-act="money"]').forEach(b => b.onclick = () => {
    showPop('Your currency', `<p>Prices in this lesson are examples. Pick the money you think in.</p><div class="curs">${CURRENCIES.map(c => `<button data-cur="${c.code}" aria-pressed="${c.code === money.code}"><b>${esc(c.sym.trim())}</b><span>${esc(c.name)}</span></button>`).join('')}</div><p class="fine">Rates are rough and only for the examples.</p>`);
    $('#popP').querySelectorAll('[data-cur]').forEach(k => k.onclick = () => {
      money.set(k.dataset.cur); const cb = $('#curBtn'); if (cb) cb.textContent = money.code;
      hidePop(); H.currencyChanged?.();
    });
  });
  document.querySelectorAll('[data-act="share"]').forEach(b => b.onclick = async () => {
    const url = location.href.split('#')[0].split('?')[0];
    try { if (navigator.share) { await navigator.share({ title: `${L.title} · ${SITE.name}`, text: L.description, url }); return; } await navigator.clipboard.writeText(url); showPop('Link copied', '<p>Paste it anywhere to share this lesson.</p>'); } catch { }
  });
  document.querySelectorAll('[data-act="account"]').forEach(b => b.onclick = () => H.account?.());
  function setPressed(act, v) { document.querySelectorAll(`[data-act="${act}"]`).forEach(b => b.setAttribute('aria-pressed', v)); }

  /* ---------- status line and pop-up ---------- */
  const status = $('#status'), msgEl = $('#statusMsg');
  function setStatus(c) {
    if (!c) { status.hidden = true; return; }
    status.hidden = false;
    if (msgEl.innerHTML !== c.msg) { msgEl.innerHTML = c.msg; if (form !== 'desktop') measure(); }
    status.classList.toggle('bad', c.ok === false); status.classList.toggle('good', c.ok === true);
    const drill = c.ok === false && H.broken?.() != null;
    if (status.classList.contains('drill') !== drill) { status.classList.toggle('drill', drill); if (form !== 'desktop') measure(); }
  }
  const pop = $('#pop');
  function showPop(title, html, cls = '') { $('#popT').textContent = title; $('#popP').innerHTML = html; pop.className = 'pop' + (cls ? ' ' + cls : ''); pop.hidden = false; }
  const hidePop = () => { pop.hidden = true; };
  $('#popX').onclick = hidePop;

  /* ---------- readouts: small gauges top right ---------- */
  const readoutEl = $('#readout');
  let readouts = [];
  function buildReadouts(list) {
    readouts = list || [];
    readoutEl.innerHTML = readouts.map((r, i) => `<div class="gauge" data-r="${i}"><span class="gl">${esc(r.label)}</span><b class="gv"></b>${r.bar ? '<span class="gb"><i></i></span>' : ''}<span class="gs"></span></div>`).join('');
  }
  let roT = 0;
  function updateReadouts(dt) {
    roT += dt; if (roT < 0.1) return; roT = 0;
    readouts.forEach((r, i) => {
      const g = readoutEl.children[i]; if (!g) return;
      const v = r.get(); const s = typeof v === 'object' ? v : { v };
      g.querySelector('.gv').innerHTML = s.v ?? '';
      g.querySelector('.gs').textContent = s.sub ?? r.sub ?? '';
      if (r.bar) g.querySelector('.gb i').style.width = `${Math.round(100 * Math.max(0, Math.min(1, s.bar ?? 0)))}%`;
      g.classList.toggle('bad', s.bad === true); g.classList.toggle('good', s.good === true);
    });
  }

  /* ---------- Try it and Break it ---------- */
  function buildTry(controls, breaks) {
    const list = $('#tryList'); list.replaceChildren();
    for (const c of controls) {
      const d = document.createElement('div'); d.className = 'ctl';
      const fmt = v => c.fmt ? c.fmt(v) : (Math.abs(v) >= 100 ? Math.round(v) : +(+v).toFixed(c.step && c.step < 1 ? (c.step < 0.01 ? 3 : 2) : 0)) + (c.unit ? ` ${c.unit}` : '');
      if (c.type === 'slider') {
        const id = 'c' + Math.random().toString(36).slice(2, 8);
        d.innerHTML = `<label for="${id}"><span></span><b></b></label><input id="${id}" type="range">${c.hint ? '<small></small>' : ''}`;
        d.querySelector('span').textContent = c.label; if (c.hint) d.querySelector('small').textContent = c.hint;
        const inp = d.querySelector('input'), b = d.querySelector('b');
        const toS = v => c.log ? Math.log10(v) : v, fromS = s => c.log ? 10 ** s : s;
        inp.min = toS(c.min); inp.max = toS(c.max); inp.step = c.log ? 0.01 : (c.step ?? 'any'); inp.value = toS(c.get());
        b.textContent = fmt(c.get());
        inp.oninput = () => { c.set(fromS(+inp.value)); b.textContent = fmt(c.get()); };
        c.sync = () => { if (document.activeElement !== inp) inp.value = toS(c.get()); b.textContent = fmt(c.get()); };
      } else if (c.type === 'toggle') {
        d.innerHTML = `<div class="row"><span></span><button class="switch" role="switch"></button></div>${c.hint ? '<small></small>' : ''}`;
        d.querySelector('span').textContent = c.label; if (c.hint) d.querySelector('small').textContent = c.hint;
        const sw = d.querySelector('.switch'); sw.setAttribute('aria-label', c.label);
        c.sync = () => sw.setAttribute('aria-checked', !!c.get()); c.sync();
        sw.onclick = () => { c.set(!c.get()); c.sync(); syncAll(); };
      } else if (c.type === 'button') {
        d.innerHTML = `<button class="act"></button>`; d.querySelector('button').textContent = c.label; d.querySelector('button').onclick = () => { c.act(); syncAll(); };
      } else if (c.type === 'buttons') {
        d.innerHTML = `<div class="nm"><span></span></div><div class="keys"></div>`;
        d.querySelector('span').textContent = c.label;
        const keys = d.querySelector('.keys');
        c.options.forEach((name, i) => { const b = document.createElement('button'); b.textContent = name; b.onclick = () => { c.act(i); syncAll(); }; keys.appendChild(b); });
        c.sync = () => { const cur = c.get?.(); keys.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-pressed', i === cur)); }; c.sync();
      } else if (c.type === 'text') {
        const id = 'c' + Math.random().toString(36).slice(2, 8);
        d.innerHTML = `<label for="${id}"><span></span></label><form class="tin"><input id="${id}" autocomplete="off" maxlength="${c.max || 80}"><button type="submit">${esc(c.go || 'Go')}</button></form>`;
        d.querySelector('span').textContent = c.label;
        const inp = d.querySelector('input'); inp.value = c.get?.() || ''; inp.placeholder = c.placeholder || '';
        d.querySelector('form').onsubmit = e => { e.preventDefault(); c.set(inp.value); inp.blur(); syncAll(); };
        c.sync = () => { if (document.activeElement !== inp) inp.value = c.get?.() || ''; };
      }
      list.appendChild(d);
    }
    // the first few buttons and switches also sit in the control bar, one tap away
    const quick = $('#quick'); quick.replaceChildren();
    const q = controls.filter(c => c.quick || ((c.type === 'button' || c.type === 'toggle') && c.quick !== false)).slice(0, 3);
    while (q.length > 1 && q.reduce((n, c) => n + (c.short || c.label).length, 0) > 40) q.pop();
    for (const c of q) {
      const b = document.createElement('button'); b.className = 'chip'; b.textContent = c.short || c.label;
      if (c.type === 'toggle') { const sync0 = c.sync; c.sync = () => { sync0?.(); b.setAttribute('aria-pressed', !!c.get()); }; b.onclick = () => { c.set(!c.get()); syncAll(); }; b.setAttribute('aria-pressed', !!c.get()); }
      else b.onclick = () => { c.act(); syncAll(); };
      quick.appendChild(b);
    }
    quick.hidden = !q.length;
    // Break it: one button each, and Fix it
    const bl = $('#breakList'); bl.replaceChildren();
    $('#breaks').hidden = !breaks?.length; $('#dockBreak').hidden = !breaks?.length;
    (breaks || []).forEach((br, i) => {
      const b = document.createElement('button'); b.className = 'brk'; b.innerHTML = `<b></b><span></span>`;
      b.querySelector('b').textContent = br.label; b.querySelector('span').textContent = br.hint || '';
      b.onclick = () => { H.breakIt?.(i); markBreak(); };
      bl.appendChild(b);
    });
    if (breaks?.length) { const f = document.createElement('button'); f.className = 'brk fix'; f.innerHTML = `${ICON.check}<b>Fix it</b>`; f.onclick = () => { H.breakIt?.(null); markBreak(); }; bl.appendChild(f); }
    syncs = controls;
  }
  let syncs = [];
  function syncAll() { for (const c of syncs) c.sync?.(); markBreak(); }
  function markBreak() { const cur = H.broken?.(); $('#breakList').querySelectorAll('.brk').forEach((b, i) => b.setAttribute('aria-pressed', i === cur)); }

  /* ---------- callouts and tags ---------- */
  // Cards (desktop) and tags (phones) look for empty space: each spot is scored by how much of it covers the machine
  // (from the stage's mask), what else is there, and how far it is from where it would like to be.
  const SVGNS = 'http://www.w3.org/2000/svg';
  const labelsEl = $('#labels'), leaders = $('#leaders');
  function makeTag(text) {
    const el = document.createElement('div'); el.className = 'ptag'; el.innerHTML = '<i></i><span></span>'; el.querySelector('span').textContent = text; el.hidden = true; labelsEl.appendChild(el);
    const line = document.createElementNS(SVGNS, 'path'); line.setAttribute('class', 'lead tl'); leaders.appendChild(line);
    el._line = line; return el;
  }
  let CARDS = [];
  function buildLabels(list) {
    labelsEl.replaceChildren(); leaders.replaceChildren();
    CARDS = (list || []).map(c => {
      const el = document.createElement('div'); el.className = 'ccard';
      el.innerHTML = `${svgI(ICON[c.icon] || ICON.info)}<div><b></b><span></span></div>`;
      el.querySelector('b').textContent = c.t; el.querySelector('span').textContent = c.d || '';
      labelsEl.appendChild(el);
      const path = document.createElementNS(SVGNS, 'path'); path.setAttribute('class', 'lead'); leaders.appendChild(path);
      const dot = document.createElementNS(SVGNS, 'circle'); dot.setAttribute('r', '5'); dot.setAttribute('class', 'ldot'); leaders.appendChild(dot);
      return { ...c, el, path, dot, tag: makeTag(c.t) };
    });
    requestAnimationFrame(() => measure()); // the card columns change the machine's space
  }
  function setLabelText(name, t, d) {
    const c = CARDS.find(x => x.name === name || x.t === name); if (!c) return;
    if (c.cur === t + '|' + d) return; c.cur = t + '|' + d;
    c.el.querySelector('b').textContent = t; if (d != null) c.el.querySelector('span').textContent = d; c.tag.querySelector('span').textContent = t;
  }
  const rectOf = el => { const s = stage.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - s.left, r.top - s.top, r.right - s.left, r.bottom - s.top]; };
  const ovA = (p, q) => Math.max(0, Math.min(p[2], q[2]) - Math.max(p[0], q[0])) * Math.max(0, Math.min(p[3], q[3]) - Math.max(p[1], q[1]));
  let placedBoxes = [];
  // Desktop cards sit in two columns, one each side of the machine, sorted by the height of what they point at, so
  // their straight leader lines never cross. Every frame each card glides towards its slot (no jumps while the
  // camera turns or zooms). A card only changes side when its part clearly moves to the other half.
  // Phone tags keep their offset from the part and glide too; a tag only picks a new offset when its old one is
  // clearly worse.
  const CARD_W = 204, GAP = 10, STUB = 14;
  let lastT = 0, lastMove = 0, lastAnch = [], stillFrames = 0;
  const glide = (c, x, y, k) => { if (!c.at0) c.at0 = { x, y }; else { c.at0.x += (x - c.at0.x) * k; c.at0.y += (y - c.at0.y) * k; } return c.at0; };
  function pack(col, top, bot) {
    // col: [{ c, dy, h }] sorted by dy; returns y for each, as close to dy as fits between top and bot
    const ys = col.map(o => Math.max(top, Math.min(bot - o.h, o.dy - o.h / 2)));
    for (let it = 0; it < 4; it++) {
      for (let i = 1; i < col.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + col[i - 1].h + GAP);
      if (col.length) ys[col.length - 1] = Math.min(ys[col.length - 1], bot - col[col.length - 1].h);
      for (let i = col.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - col[i].h - GAP);
      if (col.length) ys[0] = Math.max(ys[0], top);
    }
    return ys;
  }
  const colH = col => col.reduce((n, o) => n + o.h + GAP, -GAP);
  function placeLabels(Lx) {
    // Lx: { show, toScreen, W, H, mask, only: [names] }
    const { W: w, H: h, toScreen } = Lx;
    const now = performance.now(), dt = Math.min(0.1, lastT ? (now - lastT) / 1000 : 0.016); lastT = now;
    const k = 1 - Math.exp(-dt * 14);
    labelsEl.hidden = !Lx.show; leaders.style.display = Lx.show ? '' : 'none';
    placedBoxes = [];
    if (!Lx.show) return;
    const cardsOn = form === 'desktop' && w >= 760;
    const top = area.top + 4, bot = h - area.bottom - 4;
    const reserved = [...document.querySelectorAll('#readout .gauge, #status, #caption, .tools, .hero > *, .topr, #sideways')].filter(e => e.offsetParent && !e.hidden).map(rectOf);
    const mask = Lx.mask?.();
    const active = CARDS.filter(c => !c.hide?.() && (!Lx.only || Lx.only.includes(c.name || c.t)));
    const anchors = CARDS.map(c => toScreen(typeof c.at === 'function' ? c.at() : c.atV));
    const asTag = new Set();
    // is the camera (or the machine) moving? sides only change once things have been still for a moment
    if (anchors.some((p, i) => lastAnch[i] && Math.hypot(p[0] - lastAnch[i][0], p[1] - lastAnch[i][1]) > 1.5)) { lastMove = now; stillFrames = 0; } else stillFrames++;
    lastAnch = anchors.map(p => [p[0], p[1]]);
    const still = now - lastMove > 450 && stillFrames > 12;
    if (cardsOn) {
      // the two columns: left under the title, right under the readouts and clear of the view buttons
      const xL = 16, xR = w - CARD_W - 72;
      const topOf = x0 => { let t = top; for (const r of reserved) if (r[0] < x0 + CARD_W && r[2] > x0 && r[1] < h * 0.45) t = Math.max(t, r[3] + 10); return t; };
      const botOf = x0 => { let b = bot; for (const r of reserved) if (r[0] < x0 + CARD_W && r[2] > x0 && r[1] > h * 0.45) b = Math.min(b, r[1] - 10); return b; };
      const tL = topOf(xL), bL = botOf(xL), tR = topOf(xR), bR = botOf(xR);
      const mid = (area.left + (w - area.right)) / 2, hys = w * 0.08;
      const cols = { L: [], R: [] };
      for (const c of active) {
        const i = CARDS.indexOf(c), [dx, dy] = anchors[i];
        const want = dx < mid ? 'L' : 'R';
        if (!c.side) c.side = want;
        else if (still && c.side !== want && Math.abs(dx - mid) > (c.pinned ? w * 0.22 : hys)) { c.pinned = false; c.side = want; c.at0 = null; c.el.classList.add('fade'); requestAnimationFrame(() => requestAnimationFrame(() => c.el.classList.remove('fade'))); }
        cols[c.side].push({ c, dx, dy, h: c.el.offsetHeight || 60 });
      }
      // keep the two columns even: a column with two more cards than the other hands over its most central one
      // (only while things are still, or the first time, so nothing flies across mid-turn)
      for (const [a, b] of [['L', 'R'], ['R', 'L']]) while (cols[a].length - cols[b].length > 1 && (still || cols[a].some(o => !o.c.at0))) {
        cols[a].sort((p, q) => Math.abs(q.dx - mid) - Math.abs(p.dx - mid)); const o = cols[a].pop(); if (o.c.at0) { o.c.at0 = null; o.c.el.classList.add('fade'); requestAnimationFrame(() => requestAnimationFrame(() => o.c.el.classList.remove('fade'))); } o.c.side = b; o.c.pinned = true; cols[b].push(o);
      }
      // a full column hands its most central card to the other side, then turns what still doesn't fit into tags
      const room = { L: bL - tL, R: bR - tR };
      for (const [a, b] of [['L', 'R'], ['R', 'L']]) while (cols[a].length > 1 && colH(cols[a]) > room[a] && colH(cols[b]) + cols[a][0].h + GAP <= room[b]) {
        cols[a].sort((p, q) => Math.abs(q.dx - mid) - Math.abs(p.dx - mid)); const o = cols[a].pop(); if (o.c.side !== b) o.c.at0 = null; o.c.side = b; cols[b].push(o);
      }
      for (const s of ['L', 'R']) while (cols[s].length && colH(cols[s]) > room[s]) { const o = cols[s].pop(); asTag.add(o.c); }
      for (const s of ['L', 'R']) {
        const col = cols[s].sort((p, q) => p.dy - q.dy), x0 = s === 'L' ? xL : xR;
        const ys = pack(col, s === 'L' ? tL : tR, s === 'L' ? bL : bR);
        col.forEach((o, j) => {
          const c = o.c, ty = ys[j];
          // zoomed in, a card in its column can land on the machine itself: then it folds to a small tag that finds
          // empty space, and unfolds once its slot is clear again (only while still, so nothing flickers mid-turn)
          const cov = mask ? mask.cover(x0, ty, x0 + CARD_W, ty + o.h) : 0;
          if (c.small == null) c.small = cov > 0.06; else if (still && (c.small ? cov < 0.02 : cov > 0.06)) c.small = !c.small;
          if (c.small) { asTag.add(c); return; }
          const p = glide(c, x0, ty, c.el.hidden || !c.at0 ? 1 : k);
          c.el.hidden = false; c.path.style.display = c.dot.style.display = '';
          c.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
          const ex = s === 'L' ? p.x + CARD_W : p.x, ey = p.y + o.h / 2, sx = ex + (s === 'L' ? STUB : -STUB);
          c.path.setAttribute('d', `M${ex.toFixed(1)} ${ey.toFixed(1)} H${sx.toFixed(1)} L${o.dx.toFixed(1)} ${o.dy.toFixed(1)}`);
          c.dot.setAttribute('cx', o.dx.toFixed(1)); c.dot.setAttribute('cy', o.dy.toFixed(1));
          c.tag.hidden = true; c.tag._line.style.display = 'none';
          placedBoxes.push({ name: c.t, kind: 'card', box: [x0, ty, x0 + CARD_W, ty + o.h], anchor: [o.dx, o.dy] });
        });
      }
    }
    const shown = [];
    let tagBudget = form === 'desktop' ? 99 : 4;
    CARDS.forEach((c, i) => {
      const on = active.includes(c), [dx, dy] = anchors[i];
      if (!on || !cardsOn || asTag.has(c)) { c.el.hidden = true; c.path.style.display = c.dot.style.display = 'none'; c.at0 = null; if (!on) c.side = null; }
      if (!on) { c.tag.hidden = true; c.tag._line.style.display = 'none'; c.tp = null; return; }
      if (cardsOn && !asTag.has(c)) return;
      const hideTag = tagBudget <= 0 || (form !== 'desktop' && c.phone === false);
      c.tag.hidden = hideTag;
      if (!hideTag) { tagBudget--; shown.push({ c, tag: c.tag, dx, dy, name: c.cur || c.t }); } else { c.tag._line.style.display = 'none'; c.tp = null; }
    });
    shown.sort((a, b) => a.dy - b.dy);
    const placed = [...reserved, ...placedBoxes.map(b => b.box)];
    const score = (s, r, rad) => {
      let sc = (mask ? mask.cover(...r) : 0) * 30 + rad * 0.45;
      if (r[0] < 4 || r[2] > w - 4 || r[1] < top || r[3] > bot) sc += 1e4;
      for (const t of placed) sc += ovA(r, t) * 2;
      for (const o of shown) if (o !== s) { const dr = [o.dx - 8, o.dy - 8, o.dx + 8, o.dy + 8]; sc += ovA(r, dr) * 3; }
      return sc;
    };
    for (const s of shown) {
      const { c, tag, dx, dy } = s, sp = tag.querySelector('span');
      const sw = sp.offsetWidth || 90, sh = sp.offsetHeight || 22;
      const rectFor = o => { const x0 = dx + o.ox + (o.right ? 12 : -12 - sw), y0 = dy + o.oy - sh / 2; return [x0, y0, x0 + sw, y0 + sh]; };
      let best = null, bs = Infinity;
      for (const rad of [0, 26, 48, 74, 104]) for (let j = 0; j < 8; j++) {
        if (rad === 0 && j > 1) break;
        const ang = j * Math.PI / 4, o = { ox: Math.cos(ang) * rad, oy: Math.sin(ang) * rad, rad, right: rad === 0 ? j === 0 : Math.cos(ang) >= -0.01 };
        const sc = score(s, rectFor(o), rad); if (sc < bs) { bs = sc; best = o; }
      }
      // keep the old offset unless the new one is clearly better
      if (c.tp) { const old = score(s, rectFor(c.tp), c.tp.rad); if (old <= bs * 1.4 + 20) best = c.tp; }
      c.tp = best;
      const r = rectFor(best); placed.push(r);
      const p = glide(s, r[0] - dx, r[1] - dy, 1); // offset from the part, smoothed below
      c.tg = c.tg ? { x: c.tg.x + (p.x - c.tg.x) * k, y: c.tg.y + (p.y - c.tg.y) * k } : { x: p.x, y: p.y };
      const gx = dx + c.tg.x, gy = dy + c.tg.y;
      tag.classList.toggle('left', !best.right);
      tag.querySelector('i').style.transform = `translate(${(dx - 7).toFixed(1)}px, ${(dy - 7).toFixed(1)}px)`;
      sp.style.transform = `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px)`;
      const ln = tag._line;
      if (best.rad > 0) { const ex = best.right ? gx : gx + sw, ey = gy + sh / 2; ln.setAttribute('d', `M${dx.toFixed(1)} ${dy.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}`); ln.style.display = ''; }
      else ln.style.display = 'none';
      placedBoxes.push({ name: sp.textContent, kind: 'tag', box: r, anchor: [dx, dy] });
    }
  }

  /* ---------- the lesson's steps and its check ---------- */
  const stepsEl = $('#steps');
  stepsEl?.addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (!b) return; H.storyFrom?.(+b.dataset.step); if (form === 'sheet') openSheet(false); else if (form === 'land') setPanel(null, true); });
  const checkEl = $('#check');
  const right = new Set();
  checkEl?.addEventListener('click', e => {
    const b = e.target.closest('[data-opt]'); if (!b) return;
    const q = b.closest('.cq'), k = +q.dataset.q, i = +b.dataset.opt, C = checks[k], ok = i === C.answer;
    q.querySelectorAll('[data-opt]').forEach(x => { x.classList.remove('right', 'wrong'); if (+x.dataset.opt === i) x.classList.add(ok ? 'right' : 'wrong'); });
    const why = q.querySelector('.why'); why.hidden = false;
    why.innerHTML = `<b>${ok ? 'Right.' : 'Not quite.'}</b> ${ok ? esc(C.why) : esc(C.hint || 'Have another go. Play the lesson again if it helps.')}`;
    if (ok) right.add(k); else right.delete(k);
    $('#checkScore').textContent = `${right.size} of ${checks.length}`;
    if (right.size === checks.length) { $('#checkDone').hidden = false; done.add(L.slug); renderList(); H.completed?.(); }
  });
  // exam-style practice: first answer counts, the explanation shows either way
  const pracEl = $('#practice'), tried = new Map();
  pracEl?.addEventListener('click', e => {
    const b = e.target.closest('[data-opt]'); if (!b) return;
    const q = b.closest('.cq'), k = +q.dataset.q, i = +b.dataset.opt, C = L.practice[k], ok = i === C.answer;
    if (!tried.has(k)) tried.set(k, ok);
    q.querySelectorAll('[data-opt]').forEach(x => { x.classList.remove('right', 'wrong'); if (+x.dataset.opt === i) x.classList.add(ok ? 'right' : 'wrong'); if (+x.dataset.opt === C.answer && !ok) x.classList.add('right'); });
    const why = q.querySelector('.why'); why.hidden = false;
    why.innerHTML = `<b>${ok ? 'Right.' : 'The best answer is marked.'}</b> ${esc(C.why)}`;
    const n = [...tried.values()].filter(Boolean).length;
    $('#pracScore').textContent = `${n} of ${L.practice.length} right first time` + (tried.size === L.practice.length ? ` · ${Math.round(100 * n / L.practice.length)}% raw` : '');
  });
  if (done.has(L.slug) && checkEl) { $('#checkDone').hidden = false; $('#checkDone span').textContent = 'You finished this lesson before. Try the questions again any time.'; }
  function showCheck() {
    if (!checkEl) return;
    if (form === 'desktop') { if (desk !== 'lesson') setDesk('lesson'); }
    else if (form === 'sheet') openSheet(true); else setPanel(null, true);
    requestAnimationFrame(() => checkEl.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }

  /* ---------- the walkthrough caption ---------- */
  const cap = $('#caption');
  function caption(c) {
    stepsEl?.querySelectorAll('li').forEach((li, i) => li.classList.toggle('on', !!c && i === c.i));
    cap.hidden = !c; document.body.classList.toggle('playing', !!c);
    const pb = $('[data-act="play"]', dock);
    pb.classList.toggle('on', !!c);
    pb.innerHTML = c ? `${ICON.stop}<span class="lng">Stop the lesson</span><span class="sh">Stop</span>` : `${ICON.play}<span class="lng">Play the lesson</span><span class="sh">Play</span>`;
    pb.setAttribute('aria-label', c ? 'Stop the walkthrough' : 'Play the lesson');
    if (!c) { measure(); return; }
    $('#capN').textContent = `${c.i + 1} / ${c.n}`;
    $('#capT').textContent = c.text;
    $('#capBar').style.width = `${Math.round(100 * Math.min(1, c.t ?? 0))}%`;
    $('[data-cap="pause"]').innerHTML = c.paused ? ICON.play : ICON.pause;
    $('[data-cap="pause"]').setAttribute('aria-label', c.paused ? 'Carry on' : 'Pause');
    $('[data-cap="speed"]').textContent = `${c.speed ?? 1}×`;
    const wb = $('[data-cap="who"]'); wb.hidden = !c.both; wb.textContent = c.who === 'm' ? 'Male' : 'Female';
    wb.setAttribute('aria-label', c.who === 'm' ? 'Male voice. Switch to the female voice' : 'Female voice. Switch to the male voice');
    measure();
  }
  const capBar = t => { $('#capBar').style.width = `${Math.round(100 * Math.min(1, t))}%`; };
  cap.addEventListener('click', e => { const b = e.target.closest('[data-cap]'); if (b) H.storyCtl?.(b.dataset.cap); });

  reform();
  return {
    stage, canvas, caption, capBar, showCheck, get form() { return form; }, get area() { return area; }, measure, reform,
    setStatus, showPop, hidePop, buildReadouts, updateReadouts, buildTry, syncAll, buildLabels, placeLabels, setLabelText, setPressed,
    closeAll, openSheet, setPanel, get placed() { return placedBoxes; }, renderList, markDone: s => { done.add(s); renderList(); }, setDone: list => { done.clear(); for (const s of list) done.add(s); renderList(); },
  };
}
