// Play the lesson: a few short steps, each with a caption, that move the camera and work the machine,
// so the lesson explains itself. Ported from the Amaete Circuits walkthrough.
// A lesson writes `story: [{ t, say, focus?, zoom?, home?, act?, wait? }]`:
//   t: the step's title in the step list; say: what the narrator says (plain sentences);
//   focus: a label's name or [x, y, z] to fly to; home: back to the whole machine; act(S): work the machine; wait: seconds at least.
// Voice: recorded clips in `<slug>/voice/<file>.mp3` (female, Heart) and `<slug>/voice/m/<file>.mp3` (male, Michael), keyed by
// caption in each folder's `lines.json`. The learner picks the voice in the caption bar (localStorage ab-voice). A step plays its clip only
// while its caption still matches, so an edited step shows its caption alone until it is recorded again.

export const plain = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const readTime = t => Math.max(4, plain(t).split(' ').length / 2.6 + 1.4);   // about 155 words a minute

export function createStory({ L, ui, ctl }) {
  let steps = null, i = 0, t = 0, dur = 0, paused = false, audio = null, speed = 1, lines = null, loaded = false;
  let who = 'f';
  try { speed = +localStorage.getItem('ab-speed') || 1; who = localStorage.getItem('ab-voice') === 'm' ? 'm' : 'f'; } catch { }
  const SPEEDS = [0.75, 1, 1.25, 1.5];
  // one audio element for the whole walkthrough: phones only let a page play sound from an element first played in a tap
  const voice = typeof Audio === 'function' ? new Audio() : null;
  const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
  function unlock() {
    if (!voice || voice.dataset.ok) return;
    voice.dataset.ok = '1'; voice.muted = true; voice.src = SILENT;
    voice.play().then(() => { if (voice.src === SILENT) voice.pause(); }).catch(e => { if (e.name !== 'AbortError') delete voice.dataset.ok; });
  }
  const sets = { f: null, m: null };
  const get = u => fetch(u).then(r => r.ok ? r.json() : null).catch(() => null);
  const voiceLines = (L.voice ? Promise.all([get('./voice/lines.json'), get('./voice/m/lines.json')]) : Promise.resolve([null, null]))
    .then(([f, m]) => { sets.f = f; sets.m = m; lines = f; loaded = true; });
  // the chosen voice, or the other one when a lesson has only one recorded
  const pick = () => (who === 'm' && sets.m) || !sets.f ? ['./voice/m/', sets.m] : ['./voice/', sets.f];
  function show() { const st = steps[i]; ui.caption({ i, n: steps.length, step: st, text: plain(st.say), t: dur ? t / dur : 0, paused, speed, who, both: !!(sets.f && sets.m) }); }
  function enter(k) {
    i = k; t = 0;
    const st = steps[i];
    if (st.focus) ctl.focus(st.focus, st.zoom);
    else if (st.home) ctl.home();
    if (st.act) { try { st.act(ctl.S); } catch (e) { console.warn(e); } }
    dur = Math.max(readTime(st.say) / speed, st.wait || 0);
    if (audio) { audio.pause(); audio = null; }
    const [dir, map] = pick(), clip = map?.[plain(st.say)];
    if (clip && voice) {
      const a = audio = voice, src = new URL(dir + clip, location.href).href;
      a.muted = false; a.src = src; a.defaultPlaybackRate = a.playbackRate = speed;
      // move on as the voice finishes: a step's `wait` (time for its animation) may hold it at most a second longer
      const hold = said => Math.max(said, Math.min(st.wait || 0, said + 1)) + 0.25;
      a.onloadedmetadata = () => { if (audio === a && a.src === src && Number.isFinite(a.duration)) { a.playbackRate = speed; dur = hold(a.duration / speed); } };
      a.onended = () => { if (audio === a && a.src === src) dur = Math.min(dur, hold(t)); };
      a.play().catch(() => { if (audio === a && a.src === src) audio = null; });
    }
    show();
  }
  function start(k = 0) { unlock(); if (audio) { audio.pause(); audio = null; } steps = L.story || []; if (!steps.length) return; paused = false; k = Math.max(0, Math.min(steps.length - 1, k)); ctl.begin?.(); if (loaded) enter(k); else voiceLines.then(() => steps && enter(k)); }
  function stop() { if (audio) { audio.pause(); audio = null; } steps = null; ui.caption(null); }
  function go(d) { if (!steps) return; const k = i + d; if (k < 0) return; if (k >= steps.length) { stop(); ctl.home(); ctl.done?.(); return; } enter(k); }
  function command(c) {
    unlock();
    if (c === 'close') stop();
    else if (c === 'next') go(1);
    else if (c === 'prev') go(-1);
    else if (c === 'speed') {
      const old = speed; speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
      try { localStorage.setItem('ab-speed', speed); } catch { }
      t *= old / speed; dur *= old / speed; if (audio) audio.playbackRate = speed; show();
    }
    else if (c === 'who') {
      who = who === 'm' ? 'f' : 'm';
      try { localStorage.setItem('ab-voice', who); } catch { }
      if (steps) enter(i);   // say this step again in the new voice
    }
    else if (c === 'pause') { paused = !paused; if (audio) paused ? audio.pause() : audio.play().catch(() => { }); show(); }
  }
  // called once a frame with real seconds
  function tick(dt) {
    if (!steps || paused) return;
    t += dt; ui.capBar(t / dur);
    if (t >= dur) go(1);
  }
  return { start, stop, toggle: () => (steps ? stop() : start()), command, tick, playing: () => !!steps, get index() { return steps ? i : -1; },
    lines: () => (L.story || []).map(st => plain(st.say)) };
}
