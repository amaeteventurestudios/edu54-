// Capstone: a speculative-decoding server (phase 19, capstone 14). A Kampala translation service runs a target model with a draft head behind a load test. Users rise; p95 and tokens per second are measured against a plain server. A kill switch turns drafting off when acceptance falls.
// Queue sums are simple: service rate falls with draft overhead, rises with accepted tokens. Above capacity, latency climbs fast.
const BASE = 40;
function run(o) {
  const gain = o.spec ? 1 + (o.a - 0.35) * 2 : 1, over = o.spec ? 1 + 0.002 * o.users : 1;
  const cap = BASE * gain / over * o.gpus, load = o.users * 6;
  const rho = Math.min(0.98, load / cap), p95 = 90 / (1 - rho);
  const auto = o.spec && o.fallback && o.a < 0.4;
  const off = auto ? { cap: BASE * o.gpus } : null;
  const cap2 = off ? off.cap : cap, rho2 = Math.min(0.98, load / cap2);
  return { cap: cap2, rho: rho2, p95: Math.round(90 / (1 - rho2)), auto, plain: Math.round(90 / (1 - Math.min(0.98, load / (BASE * o.gpus)))) };
}

export default {
  slug: 'speculative-decoding-server',
  title: 'Capstone: serving with a draft head under load',
  description: 'A real server, a load test and a p95 target. See what speculative decoding buys you, and when to turn it off.',
  overview: 'Speculative decoding is now a setting in serving engines, which makes the hard part operational. How many users can this GPU take at your p95 target? What does drafting do to that? What happens when traffic changes and acceptance falls? This capstone runs a translation service in Kampala through a load test. Users rise and a queue forms, and latency shoots up near capacity. A draft head adds capacity, when acceptance is good. When it isn\'t, an automatic fallback turns drafting off, so that a change in traffic can\'t turn your speedup into a slowdown. Earlier lessons covered why it works. Here you run it.',
  keywords: ['speculative decoding', 'load testing', 'p95 latency', 'inference serving', 'capacity', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { users: 8, spec: true, a: 0.7, fallback: true, gpus: 1 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const queue = add(P.belt(V(-2.4, 0, 0.3), V(-0.5, 0, 0.3), { w: 0.34, speed: 1.2 }));
    const srv = add(P.robot('#7B6FA8', { scale: 1 })); srv.position.set(-0.15, 0.03, 0.2);
    const head = add(P.robot(SAF, { scale: 0.45 })); head.position.set(0.4, 0.03, 0.42);
    const tank = add(P.tank(0.6, 1.0, 0.5, GOOD)); tank.position.set(1.05, 0.08, -0.1);
    const T = [0, 1].map(i => { const t = add(P.tower(0.42, 0.42, i ? SAF : BLUE)); t.position.set(1.75 + i * 0.5, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const sw = add(P.lamp('#C9C4B6', { h: 0.34, r: 0.09 })); sw.position.set(0.4, 0.03, -0.3);
    S.add(P.keep(-2.45, 2.55, 1.2, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      tank.userData.set({ level: R.rho, color: R.rho > 0.85 ? BAD : GOOD });
      T[0].userData.set({ h: Math.min(1.2, R.plain / 800) }); T[1].userData.set({ h: Math.min(1.2, R.p95 / 800), color: R.p95 > 400 ? BAD : GOOD });
      head.visible = st.spec && !R.auto; sw.userData.set({ color: R.auto ? '#D9483B' : '#C9C4B6', on: !!R.auto });
      srv.userData.set({ busy: true }); head.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Users at once', min: 1, max: 30, step: 1, get: () => st.users, set: v => set({ users: v }) },
      { type: 'toggle', label: 'Speculative decoding', short: 'Draft head', get: () => st.spec, set: v => set({ spec: !!v }) },
      { type: 'slider', label: 'Acceptance on current traffic', min: 0.1, max: 0.9, step: 0.05, get: () => st.a, set: v => set({ a: v }) },
      { type: 'toggle', label: 'Auto-off if acceptance falls', short: 'Fallback', get: () => st.fallback, set: v => set({ fallback: !!v }) },
      { type: 'slider', label: 'GPUs', min: 1, max: 4, step: 1, get: () => st.gpus, set: v => set({ gpus: v }) },
    ];
    const readouts = [
      { label: 'p95 latency', get: () => ({ v: `${R.p95} ms`, sub: `plain server: ${R.plain} ms`, good: R.p95 <= 400, bad: R.p95 > 800 }) },
      { label: 'GPU load', get: () => ({ v: `${Math.round(R.rho * 100)}%`, sub: `capacity ${Math.round(R.cap)} tokens/s`, good: R.rho < 0.8, bad: R.rho > 0.92 }) },
      { label: 'Draft head', get: () => ({ v: !st.spec ? 'off' : R.auto ? 'auto-off' : 'on', sub: `acceptance ${Math.round(st.a * 100)}%` }) },
    ];
    const labels = [
      { name: 'q', t: 'The queue', d: 'Users waiting for a slot', icon: 'link', atV: V(-2.3, 0.1, 0.35) },
      { name: 't', t: 'Plain, then with draft', d: 'p95, side by side', icon: 'target', atV: V(2.45, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Push past capacity', hint: 'the queue takes off', on: () => set({ ...D0, users: 26 }), off: reset },
      { label: 'Traffic changes, no fallback', hint: 'acceptance falls', on: () => set({ ...D0, users: 4, a: 0.2, fallback: false }), off: reset },
      { label: 'Add GPUs before measuring', hint: 'paying for idle', on: () => set({ ...D0, users: 6, gpus: 4 }), off: reset },
    ];
    function status() {
      if (R.rho > 0.92) return { ok: false, msg: `<b>${R.p95} ms: the queue has taken off at ${Math.round(R.rho * 100)}% load.</b> Latency doesn't rise evenly. Near capacity it shoots up. Keep headroom.` };
      if (st.spec && !st.fallback && st.a < 0.4) return { ok: false, msg: `<b>${R.p95} ms with drafting, against ${R.plain} ms without.</b> Traffic changed, acceptance fell, and the draft head is wasting GPU time. Watch acceptance, and turn it off automatically.` };
      if (R.rho < 0.3) return { ok: false, msg: `<b>${Math.round(R.rho * 100)}% load: most of this hardware is idle.</b> Measure capacity first, then buy what your p95 needs.` };
      return { ok: true, msg: `<b>${R.p95} ms at ${Math.round(R.rho * 100)}% load${st.spec ? `, against ${R.plain} ms plain` : ''}.</b> ${R.auto ? 'Acceptance fell, and the server turned drafting off by itself.' : 'Headroom remains for the peak.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 3 / Math.max(1, st.users) && queue.userData.count() < 6) { u = 0; queue.userData.send('#F4F1EA', { size: 0.15 }); } }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A load test', home: true, say: 'A translation service in Kampala runs one GPU. Users rise, and we measure the slowest calls.', act: m => m.set({ users: 4, spec: false, a: 0.7, fallback: true, gpus: 1 }) },
    { t: 'Near capacity', home: true, say: 'Latency doesn\'t climb evenly. Near capacity, the queue takes off.', act: m => m.set({ users: 6, spec: false, a: 0.7, fallback: true, gpus: 1 }) },
    { t: 'A draft head', home: true, say: 'Turn on speculative decoding. With good acceptance, the same GPU serves more people.', act: m => m.set({ users: 8, spec: true, a: 0.7, fallback: true, gpus: 1 }) },
    { t: 'Traffic changes', home: true, say: 'New kinds of text arrive and acceptance falls. Now drafting costs more than it saves.', act: m => m.set({ users: 4, spec: true, a: 0.2, fallback: false, gpus: 1 }) },
    { t: 'Auto-off', home: true, say: 'Watch acceptance, and switch the draft head off by itself. A speedup should never become a slowdown.', act: m => m.set({ users: 4, spec: true, a: 0.2, fallback: true, gpus: 1 }) },
    { t: 'Capacity first', home: true, say: 'Measure first, then buy hardware. Two GPUs with headroom beat four sitting idle.', act: m => m.set({ users: 14, spec: true, a: 0.7, fallback: true, gpus: 2 }) },
  ],
  check: [
    { q: 'What happens to latency near capacity?', options: ['It rises sharply', 'It falls', 'It stays flat'], answer: 0, why: 'Queues take off near full load.', hint: 'Try Push past capacity.' },
    { q: 'Why add an automatic fallback?', options: ['Traffic can change and acceptance can fall', 'To save disk', 'To make logs shorter'], answer: 0, why: 'A draft head with low acceptance slows things down.', hint: 'Try Traffic changes, no fallback.' },
    { q: 'What should you measure before buying GPUs?', options: ['Capacity at your p95 target', 'Model size', 'Number of prompts'], answer: 0, why: 'Otherwise you pay for idle.', hint: 'Try Add GPUs before measuring.' },
  ],
  terms: [['Load test', 'Rising traffic to find limits.'], ['p95', 'What 95% of requests beat.'], ['Capacity', 'The most a server can sustain.'], ['Headroom', 'Spare capacity for peaks.'], ['Fallback', 'A safe mode when conditions change.']],
  deeper: '<p><b>The queue here</b> follows a simple M/M/1-style curve, for shape. Real curves come from your own load test.</p><p><b>Metrics to export.</b> Acceptance, draft time and p95, per route.</p><p><b>Earlier lessons</b> cover why speculative decoding is exact, and how to measure it.</p>',
  code: {
    title: 'Auto-off',
    note: 'A sketch of the course\'s capstone (code/main.py).',
    text: `
def tick(metrics, server):
    alpha = metrics.accepted / max(1, metrics.drafted)
    if server.speculative and alpha < 0.4:
        server.speculative = False               # back to plain decode
    if not server.speculative and alpha_probe(server) > 0.55:
        server.speculative = True
`,
  },
};
