// Function call dispatcher (phase 19, lesson 23): a Kumasi cocoa buyer's agent calls a flaky payment tool. Each call has a timeout, retries with exponential backoff and jitter, and an idempotency key. A seeded run really steps through attempts; bars are the delay before each try.
// Without jitter, clients retry in step and hammer a recovering service. A slow original can race a retry; the key stops a double payment. Errors come back typed.
const rng = s => () => (s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917), (s >>> 0) / 4294967296);
function run(o) {
  const r = rng(5), waits = []; let ok = false, t = 0, runs = 0;
  for (let a = 0; a < o.max; a++) {
    const slow = o.slow && a === 0;
    runs += 1; t += slow ? o.timeout : 200;
    if (slow) { /* the original still completes later */ } else if (a >= o.fails) { ok = true; break; }
    if (a === o.max - 1) break;
    const base = o.backoff ? 500 * 2 ** a : 500, w = o.jitter ? base * (0.5 + r() * 0.5) : base; waits.push(Math.round(w)); t += w;
  }
  const dup = o.slow && ok && !o.key;
  const peak = o.jitter ? 3 : 10;
  return { waits, ok, t: Math.round(t), runs, dup, peak };
}

export default {
  slug: 'function-call-dispatcher',
  title: 'A tool dispatcher: timeouts, retries and a key',
  description: 'A flaky payment tool. See how a dispatcher waits, retries, spreads out, and avoids paying twice.',
  overview: 'A tool call that hangs freezes the whole loop. A dispatcher wraps each call in a timeout that returns a typed error. It retries with exponential backoff, waiting longer each time, and adds jitter so that many clients don\'t all retry at the same instant and knock a recovering service down again. It uses an idempotency key, because a retry can race a slow original, and both may reach the bank. And it maps exceptions to typed errors the model can read. These few lines decide if your agent is robust. This lesson runs attempts live against a flaky payment tool for a cocoa buyer in Kumasi.',
  keywords: ['retries', 'exponential backoff', 'jitter', 'timeouts', 'idempotency', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { fails: 2, max: 4, timeout: 3000, backoff: true, jitter: true, key: true, slow: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const bot = add(P.robot(SAF, { scale: 0.85 })); bot.position.set(-2.1, 0.03, 0);
    const X = i => -1.3 + i * 0.5;
    const T = [0, 1, 2, 3, 4].map(i => { const t = add(P.tower(0.36, 0.5, '#5B8DB8')); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const bank = P.box(0.8, 0.6, 0.7, '#2C2D31', { r: 0.05 }); bank.position.set(1.65, 0.03, -0.1); S.add(bank);
    const paid = add(P.stack(0.5, 0.4, 0.12, { max: 2 })); paid.position.set(1.65, 0.65, -0.1);
    const herd = add(P.tower(0.34, 0.42, BAD)); herd.position.set(2.3, 0.03, 0.3); herd.userData.set({ cap: '' });
    S.add(P.keep(-2.45, 2.55, 1.0, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      T.forEach((t, i) => { const w = R.waits[i]; t.userData.set({ h: w ? w / 4000 + 0.05 : 0.03 }); });
      paid.userData.set({ n: R.ok ? 1 + (R.dup ? 1 : 0) : 0, colors: [GOOD, RED] });
      herd.userData.set({ h: R.peak * 0.08, color: R.peak > 5 ? BAD : GOOD });
      bot.userData.set({ busy: true, lamp: R.ok ? '#3E9B5F' : '#D9483B' });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      { type: 'slider', label: 'Failures before it recovers', min: 0, max: 5, step: 1, get: () => st.fails, set: v => set({ fails: v }) },
      { type: 'slider', label: 'Most tries', min: 1, max: 6, step: 1, get: () => st.max, set: v => set({ max: v }) },
      tg('backoff', 'Wait longer each try', 'Backoff'), tg('jitter', 'Add random jitter', 'Jitter'), tg('key', 'Send an idempotency key', 'Key'), tg('slow', 'The first call is slow, not dead', 'Slow first'),
    ];
    const readouts = [
      { label: 'Result', get: () => ({ v: R.ok ? 'paid' : 'typed error', sub: `${R.runs} tries`, good: R.ok, bad: !R.ok }) },
      { label: 'Total time', get: () => ({ v: `${(R.t / 1000).toFixed(1)} s`, sub: `waits: ${R.waits.join(', ') || 'none'} ms` }) },
      { label: 'Payments made', get: () => ({ v: R.ok ? `${R.dup ? 2 : 1}` : '0', sub: 'should be one', good: !R.dup, bad: R.dup }) },
    ];
    const labels = [
      { name: 'w', t: 'Wait before each try', d: 'Taller is longer', icon: 'target', atV: V(X(0) - 0.2, 0.15, -0.1) },
      { name: 'h', t: 'Load on the service', d: 'Coral: all retrying at once', icon: 'wave', atV: V(2.5, 0.2, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Retry instantly, in step', hint: 'no backoff, no jitter', on: () => set({ ...D0, backoff: false, jitter: false }), off: reset },
      { label: 'A retry races a slow call', hint: 'no key', on: () => set({ ...D0, slow: true, key: false, fails: 1 }), off: reset },
      { label: 'Give up never', hint: 'the service is really down', on: () => set({ ...D0, fails: 5, max: 3 }), off: reset },
    ];
    function status() {
      if (R.dup) return { ok: false, msg: '<b>Two payments.</b> The first call was slow, not dead. It timed out here and landed at the bank, then the retry landed too. Timeouts tell you nothing about what happened at the far end. Use a key.' };
      if (R.peak > 5) return { ok: false, msg: `<b>Every client retried at the same moment.</b> A service coming back up meets a wall of traffic and falls over again. Backoff spreads tries out in time, and jitter spreads them between clients.` };
      if (!R.ok) return { ok: true, msg: `<b>${R.runs} tries, then a typed error for the model.</b> That is a good failure: it stops, and says why, so the model can tell the user. Unlimited retries only hide an outage.` };
      return { ok: true, msg: `<b>Paid once, after ${R.runs} tries in ${(R.t / 1000).toFixed(1)} s.</b> Each wait grew, jitter spread them out, and the key kept it to one payment.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A flaky tool', home: true, say: 'A cocoa buyer\'s agent in Kumasi pays farmers through a tool that sometimes fails. A hang would freeze everything.', act: m => m.set({ fails: 0, max: 4, timeout: 3000, backoff: true, jitter: true, key: true, slow: false }) },
    { t: 'Timeouts', home: true, say: 'Every call gets a timeout that returns a typed error, so the loop never hangs.', act: m => m.set({ fails: 2, max: 4, timeout: 3000, backoff: true, jitter: true, key: true, slow: false }) },
    { t: 'Back off', home: true, say: 'Wait longer each time. Instant retries only add to the trouble.', act: m => m.set({ fails: 2, max: 4, timeout: 3000, backoff: false, jitter: false, key: true, slow: false }) },
    { t: 'Jitter', home: true, say: 'Add randomness, so that a thousand clients don\'t all come back at once.', act: m => m.set({ fails: 2, max: 4, timeout: 3000, backoff: true, jitter: true, key: true, slow: false }) },
    { t: 'The race', home: true, say: 'A timeout doesn\'t mean failure. The slow call lands, and so does the retry. A key makes it count once.', act: m => m.set({ fails: 1, max: 4, timeout: 3000, backoff: true, jitter: true, key: false, slow: true }) },
    { t: 'Know when to stop', home: true, say: 'If the service is really down, stop, and return a typed error. The model can tell the farmer.', act: m => m.set({ fails: 5, max: 3, timeout: 3000, backoff: true, jitter: true, key: true, slow: false }) },
  ],
  check: [
    { q: 'What does jitter prevent?', options: ['Clients retrying in step', 'Slow models', 'Bad schemas'], answer: 0, why: 'It spreads retries between clients.', hint: 'Try Retry instantly, in step.' },
    { q: 'What does a timeout tell you?', options: ['Only that no reply came in time', 'That the call failed', 'That it succeeded'], answer: 0, why: 'It may have landed anyway.', hint: 'Try A retry races a slow call.' },
    { q: 'What should happen after the last try?', options: ['A typed error goes back', 'Retry forever', 'Crash'], answer: 0, why: 'The model can act on it.', hint: 'See Know when to stop.' },
  ],
  terms: [['Timeout', 'A limit on waiting.'], ['Exponential backoff', 'Doubling the wait each try.'], ['Jitter', 'Randomness in the wait.'], ['Idempotency key', 'Makes a repeat count once.'], ['Typed error', 'A failure the caller can read.']],
  deeper: '<p><b>Retry only what is safe.</b> A 400 won\'t fix itself. Retry timeouts and 5xx.</p><p><b>Retry-After.</b> If a server tells you when, obey it.</p><p><b>This run</b> is seeded and stepped live.</p>',
  code: {
    title: 'Dispatch',
    note: 'Adapted from the course\'s dispatcher (code/main.py).',
    text: `
def dispatch(tool, args, key, tries=4):
    for attempt in range(tries):
        try:
            return run_with_timeout(tool, args, key=key, seconds=3)
        except (Timeout, ServerError) as err:
            if attempt == tries - 1:
                return ToolError(kind=type(err).__name__, retryable=True)
            time.sleep(0.5 * 2 ** attempt * (0.5 + random.random() / 2))
`,
  },
};
