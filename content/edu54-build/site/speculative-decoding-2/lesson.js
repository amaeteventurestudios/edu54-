// Speculative decoding, one level deeper (phase 10, lesson 25): the plain lesson shows the speedup; this one shows why the output stays exact.
// A shop assistant in Mombasa picks the next word from six. Blue towers are the draft model's odds q, gold the big model's odds p, teal what actually came out
// over many samples. Sample from q, accept with min(1, p/q), and on a reject draw from the leftover (p − q)+. Skip any part of that and teal drifts away from gold.
const P0 = [0.34, 0.26, 0.17, 0.11, 0.08, 0.04], BENT = [0.08, 0.12, 0.2, 0.3, 0.2, 0.1], N = 6;
const draftOf = g => P0.map((p, i) => (1 - g) * BENT[i] + g * p);
const rng = s => () => (s = Math.imul(s ^ (s >>> 15), 2246822519) ^ Math.imul(s ^ (s >>> 13), 3266489917), (s >>> 0) / 4294967296);
const pick = (d, r) => { let u = r() * d.reduce((a, b) => a + b, 0); for (let i = 0; i < d.length; i++) { u -= d[i]; if (u <= 0) return i; } return d.length - 1; };
function run(o) {
  const q = draftOf(o.good), left = P0.map((p, i) => Math.max(0, p - q[i])), r = rng(7), got = Array(N).fill(0);
  let acc = 0;
  for (let k = 0; k < o.n; k++) {
    const x = pick(q, r), ok = o.rule === 'all' ? true : r() < Math.min(1, P0[x] / q[x]);
    if (ok) { acc++; got[x]++; continue; }
    got[o.rule === 'redraft' ? pick(q, r) : o.rule === 'plain' ? pick(P0, r) : left.some(v => v > 0) ? pick(left, r) : x]++;
  }
  const out = got.map(g => g / o.n), tv = out.reduce((a, v, i) => a + Math.abs(v - P0[i]), 0) / 2;
  const alpha = q.reduce((a, v, i) => a + Math.min(v, P0[i]), 0), K = o.k, perPass = alpha > 0.999 ? K + 1 : (1 - alpha ** (K + 1)) / (1 - alpha);
  return { q, out, tv, seen: acc / o.n, alpha, perPass, speed: perPass / (1 + K * 0.06) };
}

export default {
  slug: 'speculative-decoding-2',
  title: 'Speculative decoding: why the answer stays exact',
  description: 'Six words, two models. The draft guesses and the big model checks. See the one rule that keeps the output exactly the big model\'s.',
  overview: 'Speculative decoding promises the big model\'s output at two to four times the speed. That promise needs more than checking guesses. If you keep every draft token, you get the draft\'s habits. The fix, from Leviathan, Kalai and Matias (2023), is a rejection rule: keep a guessed token with probability min(1, p/q), and if you throw it away, draw the replacement only from what the draft under-weighted, (p − q)+. Run it many times and the words that come out match the big model exactly, whatever the draft was. This lesson samples the rule live, one thousand tokens at a time, so you can see it hold and see it fail.',
  keywords: ['speculative decoding', 'rejection sampling', 'draft model', 'exact sampling', 'acceptance rate', 'inference speed'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.55, 0], dir: [0.1, 0.42, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { good: 0.45, k: 4, n: 2000, rule: 'exact' }, st = { ...D0 };
    const BLUE = '#5B8DB8', GOLD = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', TW = 0.24, H = 3.4;
    const X = i => -1.9 + i * 0.76, ticks = [];
    const tw = (x, c) => { const t = P.tower(TW, 0.3, c); t.position.set(x, 0, 0); t.userData.set({ cap: '' }); S.add(t); ticks.push(t); return t; };
    const pad = P.box(4.75, 0.04, 0.62, '#D8D2C4', { r: 0.03 }); pad.position.set(0, -0.04, 0); S.add(pad);
    const qs = [], ps = [], os = [];
    for (let i = 0; i < N; i++) { qs.push(tw(X(i) - 0.25, BLUE)); ps.push(tw(X(i), GOLD)); os.push(tw(X(i) + 0.25, GOOD)); ps[i].userData.set({ h: P0[i] * H }); }
    const lamp = P.lamp(GOOD, { h: 0.5, r: 0.11 }); lamp.position.set(2.15, 0, -0.55); S.add(lamp);
    const dart = P.ball(0.08, '#2C2D31'); dart.userData.noFit = true; S.add(dart);
    S.add(P.keep(-2.4, 2.4, 1.35, -0.7, 0.4));
    let R = null, u = 0, cur = 0, keepIt = true;
    function draw() {
      R = run(st);
      R.q.forEach((v, i) => qs[i].userData.set({ h: v * H }));
      R.out.forEach((v, i) => os[i].userData.set({ h: v * H, color: Math.abs(v - P0[i]) > 0.03 ? BAD : GOOD }));
      lamp.userData.set({ color: R.tv < 0.03 ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.snap());
    const set = p => { Object.assign(st, p); draw(); };
    const RK = ['exact', 'redraft', 'all'];
    const controls = [
      { type: 'slider', label: 'How good the draft is', min: 0, max: 1, step: 0.05, get: () => st.good, set: v => set({ good: v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'slider', label: 'Tokens guessed per pass', min: 1, max: 10, step: 1, get: () => st.k, set: v => set({ k: v }) },
      { type: 'buttons', label: 'On a rejected word', options: ['Use the leftover', 'Ask the draft again', 'Never reject'], get: () => RK.indexOf(st.rule), act: i => set({ rule: RK[i] }) },
      { type: 'buttons', label: 'Tokens sampled', options: ['200', '2000', '20000'], get: () => [200, 2000, 20000].indexOf(st.n), act: i => set({ n: [200, 2000, 20000][i] }) },
    ];
    const readouts = [
      { label: 'Gap from the big model', get: () => ({ v: `${(R.tv * 100).toFixed(1)}%`, sub: 'teal against gold', good: R.tv < 0.03, bad: R.tv >= 0.03 }) },
      { label: 'Draft words kept', get: () => ({ v: `${Math.round(R.alpha * 100)}%`, sub: 'overlap of blue and gold' }) },
      { label: 'Speedup', get: () => ({ v: `${R.speed.toFixed(1)}×`, sub: `${R.perPass.toFixed(1)} tokens per big pass`, good: R.speed > 1.5 }) },
    ];
    const labels = [
      { name: 'q', t: 'Blue: the draft', d: 'Gold: the big model', icon: 'scale', atV: V(X(0) - 0.25, 0.2, 0.15) },
      { name: 'o', t: 'Teal: what came out', d: 'Coral: it drifted', icon: 'chart', atV: V(X(5) + 0.25, 0.04, 0.15) },
      { name: 'l', t: 'Exact lamp', d: 'Red: not the big model', icon: 'check', atV: V(2.15, 0.6, -0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Never reject a guess', hint: 'keep every draft word', on: () => set({ ...D0, rule: 'all' }), off: reset },
      { label: 'On a reject, ask the draft again', hint: 'skip the leftover', on: () => set({ ...D0, rule: 'redraft' }), off: reset },
      { label: 'Judge it on 200 tokens', hint: 'too few to tell', on: () => set({ ...D0, n: 200 }), off: reset },
    ];
    function status() {
      const g = `${(R.tv * 100).toFixed(1)}%`;
      if (st.rule === 'all') return { ok: false, msg: `<b>Fast and wrong: teal now copies blue, ${g} away from gold.</b> Keeping every guess gives you the draft model's habits at the big model's price. The speed number looks fine, which is why this bug survives.` };
      if (st.rule === 'redraft') return { ok: false, msg: `<b>Closer, but still ${g} off.</b> A rejected word was over-weighted by the draft. Asking the draft again repeats the same bias, so the words it favours stay too common and the ones it misses stay too rare.` };
      if (st.n === 200) return { ok: false, msg: `<b>Teal wobbles by ${g} with only 200 tokens.</b> The rule is exact, but a small sample is noisy. Compare distributions over thousands of tokens before you blame the sampler, or trust it.` };
      return { ok: true, msg: `<b>Teal sits on gold, ${g} apart, even with a draft that keeps only ${Math.round(R.alpha * 100)}% of its words.</b> A worse draft changes the speed, never the answer: rejects are refilled from what the draft under-weighted.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt * 1.1;
        if (u > 1) { u = 0; cur = (cur + 1) % N; keepIt = st.rule === 'all' || P0[cur] >= R.q[cur]; }
        const a = V(X(cur) - 0.25, R.q[cur] * H + 0.1, 0), b = keepIt ? V(X(cur) + 0.25, R.out[cur] * H + 0.1, 0) : V(X(cur), P0[cur] * H + 0.14, 0);
        dart.position.copy(a.lerp(b, u)); dart.position.y += Math.sin(u * Math.PI) * 0.22;
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Two sets of odds', home: true, say: 'A shop assistant in Mombasa picks its next word from six. Gold towers are the big model\'s odds. Blue towers are the small draft\'s.', act: m => m.set({ good: 0.45, k: 4, n: 2000, rule: 'exact' }) },
    { t: 'Keep every guess', home: true, say: 'Keep every word the draft guesses, and what comes out, in teal, simply copies the draft. Fast, and no longer the big model.', act: m => m.set({ good: 0.45, k: 4, n: 2000, rule: 'all' }) },
    { t: 'The rule', home: true, say: 'So check each guess. Keep it with the chance gold over blue. A word the draft over-likes gets thrown out just often enough.', act: m => m.set({ good: 0.45, k: 4, n: 2000, rule: 'redraft' }) },
    { t: 'The leftover', home: true, say: 'A thrown-out word is replaced from the leftover: only the gold the blue did not cover. Now teal lands on gold.', act: m => m.set({ good: 0.45, k: 4, n: 2000, rule: 'exact' }) },
    { t: 'A poor draft', home: true, say: 'Make the draft much worse. Teal still sits on gold. Only the speed falls, because more guesses are thrown out.', act: m => m.set({ good: 0.1, k: 4, n: 2000, rule: 'exact' }) },
    { t: 'A good draft', home: true, say: 'Make the draft good and most guesses survive. The answer is the same as before; it just arrives several times faster.', act: m => m.set({ good: 0.9, k: 4, n: 2000, rule: 'exact' }) },
  ],
  check: [
    { q: 'What goes wrong if you keep every draft token?', options: ['The output follows the draft, not the big model', 'It runs slower', 'The big model crashes'], answer: 0, why: 'No check means no correction of the draft\'s bias.', hint: 'Try Never reject a guess.' },
    { q: 'Where does the replacement for a rejected token come from?', options: ['The leftover: what the big model wants beyond the draft', 'The draft again', 'A uniform pick'], answer: 0, why: 'The leftover (p − q)+ fills exactly what the draft missed.', hint: 'Compare the On a rejected word buttons.' },
    { q: 'What does a poor draft cost you?', options: ['Speed only', 'Accuracy only', 'Both'], answer: 0, why: 'The rule keeps the output exact, so a poor draft only means more rejects.', hint: 'Drag How good the draft is down.' },
  ],
  terms: [
    ['Target model', 'The big model whose answers you want.'],
    ['Draft model', 'A small model that guesses ahead.'],
    ['Acceptance rate', 'How often a guessed token is kept.'],
    ['Rejection sampling', 'Sampling from one set of odds and rejecting so that the result follows another.'],
    ['Residual', 'The leftover (p − q)+, where the big model wants more than the draft gave.'],
    ['Total variation', 'Half the summed gaps between two sets of odds; the gap readout.'],
  ],
  deeper: '<p><b>Greedy decoding is simpler.</b> At temperature zero there is nothing to balance: check whether the draft\'s word is the big model\'s top word, keep it if so, and otherwise output the top word and stop.</p><p><b>EAGLE.</b> The EAGLE family trains the draft on the big model\'s own hidden states, which raises acceptance; see the later lessons on EAGLE-3 and vLLM internals.</p><p><b>A catch.</b> Exactness needs q(x) to be the true probability the draft used. Temperature or top-p must be applied the same way to both models, or the ratio is measuring the wrong thing.</p>',
  code: {
    title: 'The exact accept rule',
    note: 'Adapted from the course\'s speculative decoding sketch (code/main.py).',
    text: `
def accept_or_replace(token, p, q, rng):
    if rng.random() < min(1.0, p[token] / q[token]):
        return token, True                       # keep the draft's word

    left = np.maximum(p - q, 0.0)                # what the draft under-weighted
    left = left / left.sum()
    return rng.choice(len(p), p=left), False     # replace, then stop this round
`,
  },
};
