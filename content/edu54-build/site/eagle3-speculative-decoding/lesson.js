// EAGLE-3 in production (phase 17, lesson 5): a Casablanca bank's assistant. Eight towers, one per draft length K, show speedup = (1 − α^(K+1)) / (1 − α) / (1 + K·c), where c is the draft's overhead, which grows with load.
// A plank at height 1 is break-even. A general chat benchmark says α is high; the bank's own traffic says otherwise. Turning it on without measuring is the break.
const ALPHA = { chat: 0.72, bank: 0.38, code: 0.5 };
const OVER = c => 0.06 + c * 0.0018;
const speed = (K, a, c) => (1 - a ** (K + 1)) / (1 - a) / (1 + K * OVER(c));   // tokens kept up to the first reject, over the cost of drafting K
function run(o) {
  const a = o.trained ? Math.min(0.78, ALPHA[o.traffic] + 0.22) : ALPHA[o.traffic];
  const curve = Array.from({ length: 8 }, (_, i) => speed(i + 1, a, o.c));
  const best = curve.indexOf(Math.max(...curve)) + 1;
  return { a, curve, best, now: curve[o.k - 1], seen: o.measure ? ALPHA.chat : a };
}

export default {
  slug: 'eagle3-speculative-decoding',
  title: 'EAGLE-3 in production: measure before you switch it on',
  description: 'A draft head can double your speed or quietly cost you. Measure acceptance on your own traffic, at your own load.',
  overview: 'Decoding is bound by memory: every step reads all the weights to output one token. Speculative decoding verifies several drafted tokens in one pass, and EAGLE-3 draws its draft from the target model\'s own hidden layers, so more guesses are accepted. It is still opt-in in vLLM, for a good reason. Its benefit rests on one number, the acceptance rate alpha, and alpha depends on your traffic. A head trained on general chat scores well on chat and worse on code, medical or legal text. A rejected token costs a second pass, and overhead rises with load. Teams who switch it on without measuring often see their tail latency get worse.',
  keywords: ['EAGLE-3', 'speculative decoding', 'acceptance rate', 'vLLM', 'inference serving', 'tail latency'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.06, 0.45, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { traffic: 'bank', k: 4, c: 32, measure: false, trained: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.75 + i * 0.5, H = 0.42;
    const T = Array.from({ length: 8 }, (_, i) => { const t = add(P.tower(0.34, 0.5, GOOD)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const plank = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.03, 0.72), new THREE.MeshLambertMaterial({ color: '#2C2D31', transparent: true, opacity: 0.35, depthWrite: false })); plank.position.set(0, 0.03 + H, -0.1); plank.userData.noMask = true; S.add(plank);
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.11 })); lamp.position.set(2.32, 0.03, 0.5);
    const dial = add(P.dial(0.32)); dial.position.set(-2.1, 0.03, 0.5);
    S.add(P.keep(-2.5, 2.5, 1.2, -0.72, 0.8));
    let R = null;
    function draw() {
      R = run(st);
      T.forEach((t, i) => { const v = R.curve[i], on = i + 1 === st.k; t.userData.set({ h: Math.max(0.05, v * H), color: on ? SAF : v < 1 ? BAD : GOOD }); });
      dial.userData.set({ v: R.a });
      lamp.userData.set({ color: R.now >= 1.15 ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const TK = ['chat', 'code', 'bank'];
    const controls = [
      { type: 'buttons', label: 'Traffic', options: ['General chat', 'Code', 'Bank letters'], get: () => TK.indexOf(st.traffic), act: i => set({ traffic: TK[i] }) },
      { type: 'slider', label: 'Draft length K', min: 1, max: 8, step: 1, get: () => st.k, set: v => set({ k: v }) },
      { type: 'slider', label: 'Users at once', min: 1, max: 256, step: 1, get: () => st.c, set: v => set({ c: v }) },
      { type: 'toggle', label: 'Trust the benchmark\'s acceptance rate', short: 'Benchmark', get: () => st.measure, set: v => set({ measure: !!v }) },
      { type: 'toggle', label: 'Draft head retrained on your own traffic', short: 'Retrained', get: () => st.trained, set: v => set({ trained: !!v }) },
    ];
    const readouts = [
      { label: 'Real acceptance', get: () => ({ v: `${Math.round(R.a * 100)}%`, sub: st.measure ? `benchmark claims ${Math.round(R.seen * 100)}%` : 'on your traffic', good: R.a > 0.55, bad: R.a < 0.45 }) },
      { label: 'Speedup at K', get: () => ({ v: `${R.now.toFixed(2)}×`, sub: 'plank is break-even', good: R.now >= 1.15, bad: R.now < 1 }) },
      { label: 'Best K here', get: () => ({ v: `${R.best}`, sub: `${R.curve[R.best - 1].toFixed(2)}×` }) },
    ];
    const labels = [
      { name: 'd', t: 'Acceptance dial', d: 'Left low, right high', icon: 'target', atV: V(-2.35, 0.1, 0.5) },
      { name: 't', t: 'Speedup by K', d: 'Below the plank: a net loss', icon: 'scale', atV: V(X(7) + 0.2, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Switch on with the benchmark number', hint: 'chat head, bank letters', on: () => set({ ...D0, measure: true, trained: false, k: 6 }), off: reset },
      { label: 'Draft longer for more speed', hint: 'K = 8', on: () => set({ ...D0, trained: false, k: 8 }), off: reset },
      { label: 'Test at one user only', hint: 'then peak arrives', on: () => set({ ...D0, c: 256, k: 8 }), off: reset },
    ];
    function status() {
      if (st.c > 150 && !st.measure && R.now < 1.3) return { ok: false, msg: `<b>${R.now.toFixed(2)}× at ${st.c} users.</b> With the GPU full, draft work is no longer free. A setting that shines for one user can give nothing at peak. Measure at your real concurrency.` };
      if (R.now < 1) return { ok: false, msg: `<b>${R.now.toFixed(2)}×: slower than with no draft at all.</b> On this traffic only ${Math.round(R.a * 100)}% of drafts survive, and each rejection costs another pass. ${st.measure ? `The benchmark said ${Math.round(R.seen * 100)}%, for general chat.` : ''} Measure on your own prompts.` };
      if (R.now < 1.15) return { ok: false, msg: `<b>${R.now.toFixed(2)}×: not worth the complexity.</b> Try K of ${R.best}, or leave it off.` };
      return { ok: true, msg: `<b>${R.now.toFixed(2)}× at K of ${st.k}, with ${Math.round(R.a * 100)}% acceptance on your own traffic.</b> ${st.k === R.best ? 'This K is the peak here.' : `K of ${R.best} peaks at ${R.curve[R.best - 1].toFixed(2)}×.`} Gate it on tail latency, not just mean speed.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Decode is memory-bound', home: true, say: 'A bank in Casablanca serves a large model. Each step reads all the weights for one token, so verifying several tokens at once is tempting.', act: m => m.set({ traffic: 'chat', k: 4, c: 32, measure: false, trained: false }) },
    { t: 'One number', home: true, say: 'Each tower is one draft length. Above the plank you gain, below it you lose. The dial, acceptance, decides everything.', act: m => m.set({ traffic: 'chat', k: 4, c: 32, measure: false, trained: false }) },
    { t: 'Your traffic is different', home: true, say: 'The benchmark used general chat. Bank letters look nothing like it, and acceptance falls.', act: m => m.set({ traffic: 'bank', k: 6, c: 32, measure: true, trained: false }) },
    { t: 'Longer is not better', home: true, say: 'With low acceptance, long drafts are mostly thrown away, and each rejection costs another pass.', act: m => m.set({ traffic: 'bank', k: 8, c: 32, measure: false, trained: false }) },
    { t: 'Retrain the head', home: true, say: 'Train the draft head on the bank\'s own traffic, and acceptance climbs back up.', act: m => m.set({ traffic: 'bank', k: 4, c: 32, measure: false, trained: true }) },
    { t: 'Measure at peak', home: true, say: 'Test at your real concurrency, as overhead grows with load. Turn it on when your own numbers say so.', act: m => m.set({ traffic: 'bank', k: 4, c: 200, measure: false, trained: true }) },
  ],
  check: [
    { q: 'What single number mainly decides the gain?', options: ['The acceptance rate on your traffic', 'The GPU clock', 'The prompt length'], answer: 0, why: 'Alpha rules the speedup.', hint: 'Watch the dial.' },
    { q: 'Why is a benchmark\'s alpha risky?', options: ['It may come from very different traffic', 'It is always too low', 'It ignores the GPU'], answer: 0, why: 'Domain text scores lower than general chat.', hint: 'Try Switch on with the benchmark number.' },
    { q: 'What happens to a rejected draft token?', options: ['It costs another pass', 'It is free', 'It is kept anyway'], answer: 0, why: 'Rejections add work.', hint: 'Try Draft longer for more speed.' },
  ],
  terms: [
    ['EAGLE-3', 'A draft head built on the target model\'s hidden layers.'],
    ['Draft length K', 'How many tokens are guessed per pass.'],
    ['Acceptance rate', 'The share of drafts kept, alpha.'],
    ['Break-even', 'Where the gain equals the overhead.'],
    ['Opt-in', 'Off unless you set it.'],
    ['Tail latency', 'How slow the slowest responses are.'],
  ],
  deeper: '<p><b>A measuring plan.</b> Use your real prompts at your real concurrency, and gate on tail latency as well as mean speed.</p><p><b>The formula.</b> Tokens are kept up to the first rejection, so expected tokens per pass are (1 − α^(K+1)) / (1 − α). The curves divide that by a load-dependent overhead with round constants; real curves come from your own benchmark.</p><p><b>Same maths, other lessons.</b> The first speculative decoding lessons explain why it stays exact.</p>',
  code: {
    title: 'Opt in, and read alpha',
    note: 'A sketch built on the course\'s measurement plan (code/main.py).',
    text: `
llm = LLM(model=TARGET, speculative_config={
    "method": "eagle3",
    "model": DRAFT_HEAD,
    "num_speculative_tokens": 4,
})

def alpha(metrics):
    return metrics["accepted_tokens"] / metrics["drafted_tokens"]

def gate(on, off):
    return on.p99_latency <= off.p99_latency and alpha(on.metrics) > 0.5
`,
  },
};
