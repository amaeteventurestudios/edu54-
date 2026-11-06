// A production LLM app under load: results day at a national exams council's helpline in Addis Ababa. Five minutes of traffic, second by second:
// 6 questions a second, 32 a second for ten seconds when results go live (t = 60), then 6 again. The main provider serves 16 calls a second and answers
// "too many requests" to the rest; from t = 150 to 200 it browns out to 3 a second and fails 20% of calls. A fallback provider serves 8 a second.
// Retries: none; at once (0.1 s later); or exponential backoff with jitter (2^k·(1 + 0.5u) seconds), up to 4 retries within a 6-second budget (people leave after 8), then the fallback if on.
// An answer takes 0.5 s to its first word and 6 s in full. Streaming shows the first word at once; without it the whole answer arrives together.
// People leave if nothing has appeared after 8 seconds. Fixed random arrivals.
const T = 300, CAP = 16, FCAP = 8, MAXR = 4, BUDGET = 6, FIRST = 0.5, FULL = 6, PATIENCE = 8;
let seed = 31; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const rate = t => t < 60 ? 6 : t < 70 ? 32 : 6;
const ARR = [];
for (let t = 0; t < T;) { t += -Math.log(1 - rnd()) / rate(t); if (t < T) ARR.push({ t, j: Array.from({ length: 6 }, rnd), e: Array.from({ length: 6 }, rnd) }); }
const brown = s => s >= 150 && s < 200, cap = s => brown(s) ? 3 : CAP;
function run(st) {
  const used = new Map(), fused = new Map(), bins = Array.from({ length: T / 2 }, () => [0, 0, 0]);
  const heap = ARR.map((a, i) => ({ t: a.t, i, k: 0 }));
  const push = x => { let lo = 0, hi = heap.length; while (lo < hi) { const m = (lo + hi) >> 1; if (heap[m].t < x.t) lo = m + 1; else hi = m; } heap.splice(lo, 0, x); };
  const out = new Array(ARR.length); let calls = 0;
  while (heap.length) {
    const x = heap.shift(), A = ARR[x.i], s = Math.floor(x.t), b = Math.min(T / 2 - 1, Math.floor(s / 2));
    calls++;
    if (x.fb) { const n = (fused.get(s) || 0) + 1; fused.set(s, n); bins[b][2]++; out[x.i] = n <= FCAP ? { ok: true, fb: true, wait: x.t - A.t } : { ok: false, wait: x.t - A.t }; continue; }
    const n = (used.get(s) || 0) + 1; used.set(s, n);
    const err = n > cap(s) || (brown(s) && A.e[x.k] < 0.2);
    bins[b][err ? 1 : 0]++;
    if (!err) { out[x.i] = { ok: true, wait: x.t - A.t }; continue; }
    if (x.k < MAXR && st.pol > 0) {
      const d = st.pol === 1 ? 0.1 : 2 ** x.k * (1 + 0.5 * A.j[x.k]);
      if (x.t + d - A.t <= BUDGET) { push({ t: x.t + d, i: x.i, k: x.k + 1 }); continue; }
    }
    if (st.fb) { push({ t: x.t + 0.05, i: x.i, k: x.k, fb: true }); continue; }
    out[x.i] = { ok: false, wait: x.t - A.t };
  }
  const shown = r => r.wait + (st.stream ? FIRST : FULL);
  const res = out.map(r => r.ok && shown(r) > PATIENCE ? { ...r, left: true } : r);
  const ok = res.filter(r => r.ok && !r.left), first = ok.map(r => shown(r)).sort((a, b) => a - b);
  return { bins, calls, n: ARR.length, ok: ok.length, fb: ok.filter(r => r.fb).length, err: res.filter(r => !r.ok).length, left: res.filter(r => r.left).length, p50: first[Math.floor(first.length / 2)], p95: first[Math.floor(first.length * 0.95)], peak: Math.max(...bins.map(b => (b[0] + b[1]) / 2)) };
}

export default {
  slug: 'production-app',
  title: 'Production: retries, fallbacks, streaming',
  description: 'Results day at an exams helpline in Addis Ababa: traffic jumps fivefold, then the provider slows. Back off, fall back and stream to keep people answered.',
  overview: 'A working demo becomes a production app when it survives the bad minutes. Three kinds of failure need different answers. The provider says "too many requests" or errors: retry, but with exponential backoff (wait 1, 2, 4, 8 seconds) and a little randomness (jitter) so thousands of clients don\'t retry in step, and within a time budget. Retrying at once only adds load to a provider that is already full. The provider is down or slowed for minutes: fall back along a chain (a second provider, a smaller model, a cached answer, an honest "try again shortly"), trading some quality for an answer. And people are waiting: stream the reply so the first words appear in half a second, even if the whole answer takes several; most people will wait for text that is arriving and leave a blank screen. Around all of this sit structured logs and traces for every request (model, tokens, latency, cache hit, cost, errors), dashboards for the few numbers that matter, and gradual rollouts of prompt changes. When demand stays above capacity for long, no retry policy helps: you need more capacity or a queue.',
  keywords: ['production LLM app', 'exponential backoff', 'retry with jitter', 'fallback model', 'streaming responses', 'time to first token', 'LLM reliability'],
  orient: 'landscape',
  view: { target: [0, 0.4, 0], dir: [0.4, 0.85, 1.3], half: 1.9, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pol: 2, fb: true, stream: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', BLUE = '#5B8DB8';
    /* five minutes, two seconds a column: answered (teal), refused (coral) and fallback (blue) calls stack up; the glass shelf is what the provider can serve */
    const X0 = -2.85, XW = 4.3, HS = 0.016, NB = T / 2, CW = XW / NB, CZ = -0.25;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), NB * 3); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const zone = (a, b, c) => { const z = P.box((b - a) / 2 * CW, 0.012, 0.6, c, { r: 0 }); z.position.set(X0 + (a + b) / 4 * CW, 0, CZ); S.add(z); };
    zone(0, 300, '#FFFFFF'); zone(60, 70, '#FBE9C2'); zone(150, 200, '#F6D9D0');
    const glass = new THREE.MeshLambertMaterial({ color: CHAR, transparent: true, opacity: 0.35 });
    [[0, 150, CAP], [150, 200, 3], [200, 300, CAP]].forEach(([a, b, c]) => { const sl = P.box((b - a) / 2 * CW, 0.02, 0.6, '#fff', { r: 0, material: glass }); sl.position.set(X0 + (a + b) / 4 * CW, 0.012 + c * HS, CZ); S.add(sl); });
    /* the people: a long bar split into answered, fallback, left waiting and error */
    const segs = [GOOD, BLUE, SAF, RED].map(c => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(1, 0.14, 0.32, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; S.add(b); return b; });
    /* results: share answered and read, and seconds until the first words */
    const okTw = P.tower(0.5, 0.5, GOOD, { size: 0.26 }), fwTw = P.tower(0.5, 0.5, SAF, { size: 0.26 });
    okTw.position.set(2.05, 0, -0.5); fwTw.position.set(2.7, 0, 0.35); S.add(okTw, fwTw);
    S.add(P.keep(-2.95, 3.0, 1.45, -0.7, 0.75));
    let R = null, clock = 0;
    const pct = n => `${Math.round(n / R.n * 100)}%`, K = n => n.toLocaleString('en');
    function bars() {
      const upto = Math.min(NB, Math.floor(clock * 60));
      let k = 0;
      R.bins.forEach((b, i) => {
        let y = 0.012;
        [[b[0], GOOD], [b[1], BAD], [b[2], BLUE]].forEach(([n, c]) => {
          const h = Math.min(1.2 - y, (i < upto ? n / 2 : 0) * HS);
          dummy.position.set(X0 + (i + 0.5) * CW, y + h / 2, CZ); dummy.scale.set(CW * 0.8, Math.max(0.0001, h), 0.3); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(c)); k++; y += h;
        });
      });
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    }
    function draw() {
      R = run(st); clock = 0;
      const tot = R.n, parts = [R.ok - R.fb, R.fb, R.left, R.err];
      let x = X0;
      segs.forEach((b, i) => { const len = Math.max(0.002, parts[i] / tot * XW); b.scale.x = len; b.position.set(x + len / 2, 0, 0.55); x += len; });
      okTw.userData.set({ h: 0.05 + R.ok / R.n * 1.3, cap: pct(R.ok), color: R.ok / R.n >= 0.97 ? GOOD : R.ok / R.n < 0.9 ? RED : SAF });
      fwTw.userData.set({ h: 0.05 + Math.min(1, R.p50 / 8) * 1.3, cap: `${R.p50.toFixed(1)} s`, color: R.p50 > 4 ? RED : SAF });
      bars();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { okTw.userData.tick(dt); fwTw.userData.tick(dt); if (clock * 60 > NB) return; clock += dt; bars(); };
    const controls = [
      { type: 'buttons', label: 'When a call is refused', options: ['Give up', 'Retry at once', 'Back off and retry'], get: () => st.pol, act: i => set({ pol: i }) },
      { type: 'toggle', label: 'Fallback provider', short: 'Fallback', get: () => st.fb, set: v => set({ fb: !!v }) },
      { type: 'toggle', label: 'Stream the answer', short: 'Streaming', get: () => st.stream, set: v => set({ stream: !!v }) },
      { type: 'button', label: 'Replay the five minutes', act: () => { clock = 0; bars(); } },
    ];
    const readouts = [
      { label: 'Answered and read', get: () => ({ v: pct(R.ok), sub: `${K(R.ok)} of ${K(R.n)} people`, good: R.ok / R.n >= 0.97, bad: R.ok / R.n < 0.9 }) },
      { label: 'Model calls', get: () => ({ v: K(R.calls), sub: `${(R.calls / R.n).toFixed(2)} per question` }) },
      { label: 'First words', get: () => ({ v: `${R.p50.toFixed(1)} s`, sub: 'half of people', bad: R.p50 > 4 }) },
    ];
    const labels = [
      { name: 'load', t: 'Calls, five minutes', d: 'Teal answered, coral refused, blue fallback; the glass shelf is what the provider serves', icon: 'gauge', atV: V(-2.95, 0.3, CZ) },
      { name: 'people', t: 'What people saw', d: 'Answered, by the fallback, left waiting, error', icon: 'eye', atV: V(-2.95, 0.07, 0.55) },
      { name: 'ok', t: 'Answered and read', d: 'Share of everyone who asked', icon: 'check', atV: V(2.3, 0.6, -0.5) },
      { name: 'first', t: 'First words', d: 'Seconds until half of people see text', icon: 'eye', atV: V(2.95, 0.2, 0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Retry at once', hint: 'no waiting between tries', on: () => set({ ...D0, pol: 1 }), off: reset },
      { label: 'No fallback', hint: 'one provider only', on: () => set({ ...D0, fb: false }), off: reset },
      { label: 'No streaming', hint: 'show the answer when it is all done', on: () => set({ ...D0, stream: false }), off: reset },
    ];
    function status() {
      const d = run(D0);
      if (st.pol === 1) return { ok: false, msg: `<b>Retrying at once: ${K(R.calls)} model calls for ${K(R.n)} questions, peaking at ${Math.round(R.peak)} a second against ${CAP}.</b> A refused call is retried a tenth of a second later, into the same full second, up to four more times. The extra load is a storm the provider has to turn away. Back off (wait 1, 2, 4, 8 seconds, with a little randomness) so retries land when there is room: ${K(d.calls)} calls, ${pct(d.ok)} answered.` };
      if (!st.fb && R.err) return { ok: false, msg: `<b>No fallback: ${K(R.err)} people saw an error, most while the provider was slowed down.</b> Retries can't help when a provider is short of capacity for minutes. A fallback chain (a second provider, a smaller model, a cached answer, then an honest "try again shortly") keeps people answered: ${K(d.err)} errors with it.` };
      if (!st.stream) return { ok: false, msg: `<b>No streaming: half of people wait ${R.p50.toFixed(1)} s for any words, and ${K(R.left)} leave before the answer appears.</b> The answer takes as long either way; streaming shows its first words in about half a second, and people wait for text that is arriving. Stream it: ${K(d.left)} leave.` };
      if (st.pol === 0) return { ok: false, msg: `<b>Giving up on the first refusal: ${K(R.fb)} people sent to the fallback${R.err ? `, ${K(R.err)} errors` : ''}.</b> A short spike is better handled by backing off and retrying a few seconds later, when the main provider has room.` };
      return { ok: R.ok / R.n >= 0.97 ? true : undefined, msg: `<b>${pct(R.ok)} of people answered and read, ${K(R.calls)} model calls.</b> Back-off retries soak up the spike when results go live; the fallback carries people through the slowdown; streaming puts words on screen in about half a second.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Results day', home: true, say: 'Results day at a national exams council\'s helpline in Addis Ababa. When results go live, questions jump fivefold, and later the model provider slows down. Give up on every refused call, and many people get nothing.', act: m => m.set({ pol: 0, fb: false, stream: true }) },
    { t: 'Retry at once', home: true, say: 'Retrying straight away throws the same calls back into the same full second. The load spikes far above what the provider serves, and few more get through.', act: m => m.set({ pol: 1 }) },
    { t: 'Back off', home: true, say: 'Back off instead: wait one second, then two, then four, with a little randomness so clients don\'t retry in step. The spike is spread into quieter seconds.', act: m => m.set({ pol: 2 }) },
    { t: 'Fall back', home: true, say: 'When the provider slows for minutes, retries run out of time. A fallback provider carries people through: a slightly different model, but an answer.', act: m => m.set({ fb: true }) },
    { t: 'Without streaming', home: true, say: 'Show the answer only when it is complete, and people stare at a blank screen for several seconds. Many leave before any words appear.', act: m => m.set({ stream: false }) },
    { t: 'Stream it', home: true, say: 'Stream the answer, and the first words appear in about half a second. Same answer, same time to finish, and people stay to read it.', act: m => m.set({ stream: true }) },
  ],
  check: [
    { q: 'Why is retrying at once a bad idea when the provider is overloaded?', options: ['It adds more calls to a provider that is already full', 'It costs nothing', 'Providers block all retries'], answer: 0, why: 'Back off so retries land when there is room.', hint: 'Try Retry at once and watch the peak.' },
    { q: 'What is jitter for in exponential backoff?', options: ['So many clients don\'t retry at exactly the same moment', 'To make retries faster', 'To lower costs'], answer: 0, why: 'Clients failing together would otherwise retry together.', hint: 'Read the overview.' },
    { q: 'Streaming doesn\'t make the answer finish sooner. Why use it?', options: ['The first words appear in about half a second, so people don\'t leave', 'It uses fewer tokens', 'It avoids rate limits'], answer: 0, why: 'Perceived waiting is what people feel.', hint: 'Try No streaming.' },
  ],
  terms: [
    ['Rate limit (429)', 'A provider\'s reply that you have sent too many requests; try again later.'],
    ['Exponential backoff', 'Waiting longer after each failed try: 1, 2, 4, 8 seconds.'],
    ['Jitter', 'Randomness added to waits so clients don\'t retry in step.'],
    ['Fallback chain', 'Other providers, smaller models or cached answers to try when the main one fails.'],
    ['Streaming', 'Sending the answer as it is written, token by token, usually as server-sent events.'],
    ['Time to first token', 'How long until the first words of an answer appear.'],
    ['Tracing', 'Following one request through every step it touches, with timings.'],
  ],
  deeper: '<p><b>The three layers of failure.</b> Provider errors get retries with backoff; model errors (bad JSON, a made-up tool name) get a retry with the error message; failures of your own services get graceful degradation, such as answering without retrieval when the vector store is slow. A side system should never crash the main path.</p><p><b>What to watch.</b> Requests and errors per minute, latency to first token and to the end, cost per request, cache hit rate, and how often each fallback fires. Log every request with its model, tokens, time and cost so any number on a dashboard can be traced back.</p><p><b>Changing prompts safely.</b> Run a new prompt in shadow mode on real traffic without showing it, then to a small share of users chosen by a hash of their ID, and widen it while the numbers hold.</p><p><b>About this machine.</b> The traffic, the provider\'s capacity and the slowdown follow the rules in the file header, simulated second by second for every question. Change a setting and the five minutes are run again.</p>',
  code: {
    title: 'Retry with backoff, then fall back',
    note: 'Adapted from the course\'s production app lesson.',
    text: `
import random, time

def ask(question, providers, max_retries=4, budget_s=15):
    start = time.monotonic()
    for provider in providers:                       # main, then fallbacks
        for attempt in range(max_retries + 1):
            try:
                return provider.stream(question)     # yields text as it arrives
            except (RateLimited, ServerError):
                wait = 2 ** attempt * (1 + 0.5 * random.random())
                if time.monotonic() - start + wait > budget_s:
                    break                            # try the next provider
                time.sleep(wait)
    return cached_answer(question) or "We're busy right now. Please try again shortly."
`,
  },
};
