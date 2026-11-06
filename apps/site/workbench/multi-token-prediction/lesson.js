// Multi-token prediction: a toy language of three sentence starts (Kano, Kumasi, Kericho), each with three next words and a word after next that depends on the next word.
// The main model knows the true odds of the next word. The extra predictor for the word after next is learned by counting 400 seeded training sentences (add-0.1 smoothing):
// sequential (DeepSeek-V3) counts it given the start and the real next word; parallel (Gloeckle) counts it given the start only; an untrained module spreads evenly over the 17 words.
// Accuracy = chance its top guess is right; acceptance = Σ min(p, q), the share of drafts the main model keeps under the speculative check, averaged over the three starts.
// Speed-up = (1 + acceptance) / (1 + draft cost), with costs from DeepSeek-V3's active parameters: module 1.61B (sequential) or the head 0.93B (parallel) against 37B per pass.
const STARTS = [
  { ctx: 'The trader in Kano sells', next: [['groundnut', 0.45, [['oil', 0.7], ['cakes', 0.3]]], ['leather', 0.35, [['bags', 0.6], ['sandals', 0.4]]], ['indigo', 0.2, [['cloth', 0.9], ['dye', 0.1]]]] },
  { ctx: 'The weaver in Kumasi makes', next: [['kente', 0.6, [['cloth', 0.8], ['strips', 0.2]]], ['adinkra', 0.25, [['cloth', 0.5], ['stamps', 0.5]]], ['cotton', 0.15, [['thread', 0.7], ['yarn', 0.3]]]] },
  { ctx: 'The farmer in Kericho grows', next: [['tea', 0.7, [['bushes', 0.5], ['leaves', 0.5]]], ['avocado', 0.2, [['trees', 0.8], ['seedlings', 0.2]]], ['maize', 0.1, [['cobs', 0.6], ['seedlings', 0.4]]]] },
];
const WORDS = [...new Set(STARTS.flatMap(s => s.next.flatMap(n => n[2].map(w => w[0]))))];
const H = 7168, ATTN = 187e6, EXPERT = 3 * H * 2048, MOD = 2 * H * H + ATTN + 257 * EXPERT + 256 * H, PAR = ATTN + 257 * EXPERT + 256 * H, MAIN = 671e9;
const COST = { 2: (MOD - 256 * EXPERT + 8 * EXPERT + 129280 * H) / 37e9, 1: 129280 * H / 37e9 };
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const pick = (u, opts) => { let a = 0; for (const o of opts) { a += o[1]; if (u < a) return o; } return opts[opts.length - 1]; };
/* count the training sentences once */
const seqC = STARTS.map(s => s.next.map(() => Object.fromEntries(WORDS.map(w => [w, 0.1])))), parC = STARTS.map(() => Object.fromEntries(WORDS.map(w => [w, 0.1])));
{ const u = rng(5); for (let i = 0; i < 400; i++) { const c = Math.floor(u() * 3), x = pick(u(), STARTS[c].next), xi = STARTS[c].next.indexOf(x), y = pick(u(), x[2])[0]; seqC[c][xi][y]++; parC[c][y]++; } }
const norm = o => { const s = Object.values(o).reduce((a, b) => a + b, 0); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v / s])); };
function q(st, c, xi) {
  if (st.design === 0) return null;
  if (st.untrained) return Object.fromEntries(WORDS.map(w => [w, 1 / WORDS.length]));
  return norm(st.design === 2 ? seqC[c][xi] : parC[c]);
}
function run(st) {
  let acc = 0, alpha = 0;
  STARTS.forEach((s, c) => s.next.forEach(([, px, ys], xi) => {
    const p = Object.fromEntries(ys), Q = q(st, c, xi);
    if (!Q) return;
    const top = Object.entries(Q).sort((a, b) => b[1] - a[1])[0][0];
    acc += px / 3 * (p[top] || 0);
    alpha += px / 3 * WORDS.reduce((a, w) => a + Math.min(p[w] || 0, Q[w]), 0);
  }));
  const cost = st.design ? COST[st.design] : 0, speed = !st.design ? 1 : st.nocheck ? 2 / (1 + cost) : (1 + alpha) / (1 + cost);
  return { acc, alpha, cost, speed, params: st.design === 2 ? MOD : st.design === 1 ? PAR : 0, Q: q(st, st.s, st.x) };
}

export default {
  slug: 'multi-token-prediction',
  title: 'Multi-token prediction: two words ahead',
  description: 'A language model learns the next word at each position. DeepSeek-V3 adds a small module that also learns the word after, as training help and as a fast draft.',
  overview: 'Ordinary pre-training gives every position one target: the next token. Multi-token prediction adds more. Meta\'s first version put several output heads on the same final state, each guessing a different offset in parallel. DeepSeek-V3 made it sequential: module k takes the previous depth\'s state and the embedding of the real token at that depth, mixes them through a projection and one transformer block, and predicts one token further. Because it sees the word before the one it predicts, it follows the same chain a decoder does. The modules share the main model\'s embedding table and output head, so the extra parameters are the projection and the block, under two percent of DeepSeek-V3. The training loss becomes the main loss plus λ times the average of the extra losses (λ of 0.3 early, 0.1 later). The payoff comes twice: a denser training signal, and a ready-made draft for speculative decoding. DeepSeek reports that 85 to 90 percent of the module\'s drafts pass the main model\'s check, which makes generation about 1.8 times faster.',
  keywords: ['multi-token prediction', 'MTP', 'DeepSeek-V3', 'speculative decoding', 'draft model', 'pre-training objective', 'shared output head'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { s: 0, x: 0, design: 2, untrained: false, nocheck: false }, st = { ...D0 };
    const ink = '#151827', AUB = '#6B5E86', CORAL = '#E07A5F', TEAL = '#1F9E89';
    /* the sentence */
    const sc = P.box(4.6, 0.04, 0.34, '#FFFFFF', { r: 0.03 }); sc.position.set(-0.65, 0.12, 1.15); floor.add(sc);

    /* main model and the module */
    const ZA = -0.6, ZB = 0.45;
    const main = new THREE.Group(); for (let i = 0; i < 5; i++) { const sl = P.box(1.0, 0.07, 0.62, i % 2 ? '#8C7BAF' : AUB, { r: 0.03 }); sl.position.y = 0.12 + i * 0.085; main.add(sl); }
    main.position.set(-2.35, 0, ZA); floor.add(main);

    const modM = new THREE.MeshLambertMaterial({ color: CORAL }), mod = P.box(0.8, 0.1, 0.5, '#fff', { r: 0.03, material: modM }); mod.position.set(-2.35, 0.12, ZB); floor.add(mod);

    const head = P.box(0.42, 0.14, 1.55, '#C9A227', { r: 0.04 }); head.position.set(-1.05, 0.12, (ZA + ZB) / 2); floor.add(head);

    const a1 = P.arrow(V(-1.83, 0.3, ZA), V(-1.28, 0.3, ZA), 0.022, '#5E5E6E'); floor.add(a1);
    const a2 = P.arrow(V(-1.93, 0.2, ZB), V(-1.28, 0.2, ZB), 0.022, '#5E5E6E'); floor.add(a2);
    const hA = P.arrow(V(-2.35, 0.2, ZA + 0.33), V(-2.35, 0.2, ZB - 0.27), 0.022, '#5E5E6E'); floor.add(hA);

    /* prediction cards: next word, word after next */
    const CX = 0.3, CW = 1.85, rows = [ZA, ZB].map((z, r) => {
      const card = P.box(CW, 0.04, 0.82, '#FBF8F1', { r: 0.03 }); card.position.set(CX, 0.12, z); floor.add(card);
      const bars = [0, 1, 2, 3].map(i => { const bz = z - 0.16 + i * 0.15, mm = new THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(1, 0.05, 0.09, '#fff', { r: 0, material: mm }); b.userData.noFit = true; floor.add(b);
           return { b, mm, z: bz }; });
      return { card, bars };
    });
    /* the real next word feeds the module: an arc over the head */
    const loop = new THREE.CatmullRomCurve3([V(CX - 0.5, 0.2, ZA + 0.2), V(-0.4, 0.75, 0), V(-1.6, 0.75, 0.1), V(-2.2, 0.3, ZB - 0.15)]);
    const loopT = P.tube(loop.getPoints(40), 0.018, TEAL); floor.add(loopT);
    const fl = P.flow(loop, 4, TEAL, { r: 0.04, speed: 0.45 }); fl.mesh.userData.noFit = true; floor.add(fl.mesh);

    /* results */
    const PX = 2.42, rp = P.box(1.3, 0.05, 2.6, '#FFFFFF', { r: 0.03 }); rp.position.set(PX, 0.12, 0.08); floor.add(rp);


    const gm = new THREE.MeshLambertMaterial({ color: TEAL }), gauge = P.box(0.34, 1, 0.3, '#fff', { r: 0.03, material: gm }); gauge.position.set(PX - 0.3, 0.15, 0.75); gauge.userData.noFit = true; floor.add(gauge);


    const keep = P.box(6.0, 0.9, 2.7, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.1); floor.add(keep);

    let R = null;
    const pc = v => `${Math.round(v * 100)}%`, B = v => `${(v / 1e9).toFixed(1)}B`;
    function bars(row, list, color, on) {
      row.bars.forEach((b, i) => { const it = on && list[i]; b.b.visible = !!it;   if (!it) return;
        const len = Math.max(0.01, 0.8 * it[1]), x0 = CX - CW / 2 + 0.72;
        b.b.scale.x = len; b.b.position.set(x0 + len / 2, 0.14, b.z); b.mm.color.set(it[2] || color);
           });
    }
    function draw() {
      R = run(st);
      const s = STARTS[st.s], [xw, , ys] = s.next[st.x], seq = st.design === 2, any = st.design > 0;
      const Q = R.Q ? Object.entries(R.Q).sort((a, b) => b[1] - a[1]).slice(0, 4) : [];
      const guess = Q.length ? Q[0][0] : '…';
      bars(rows[0], s.next.map((n, i) => [n[0], n[1], i === st.x ? AUB : '#C9C1D9']), AUB, true);
      const truth = Object.fromEntries(ys);
      bars(rows[1], Q.map(([w, v]) => [w, v, truth[w] ? CORAL : '#D8CFC6']), CORAL, any);
      mod.visible = any;  a2.visible = any; hA.visible = any;
       modM.color.set(st.untrained ? '#B8B0A6' : CORAL);
      loopT.visible = seq; fl.on = seq;
      gauge.scale.y = 0.05 + 0.25 * (R.speed - 0.9); gm.color.set(st.nocheck ? '#C62828' : R.speed >= 1.6 ? TEAL : R.speed > 1.05 ? '#C9A227' : '#C62828');

    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Extra target', options: ['None', 'Parallel heads', 'Sequential (MTP)'], get: () => st.design, act: i => set({ design: i }) },
      { type: 'buttons', label: 'Sentence', options: ['Kano', 'Kumasi', 'Kericho'], get: () => st.s, act: i => set({ s: i }) },
      { type: 'buttons', label: 'Real next word', options: ['Most likely', 'Second', 'Third'], get: () => st.x, act: i => set({ x: i }) },
      { type: 'toggle', label: 'Check the drafts', get: () => !st.nocheck, set: v => set({ nocheck: !v }), quick: false },
    ];
    const readouts = [
      { label: 'Word-after-next accuracy', get: () => ({ v: st.design ? pc(R.acc) : '—', sub: 'top guess right, all three sentences', good: R.acc >= 0.6, bad: st.design > 0 && R.acc < 0.5 }) },
      { label: 'Drafts kept', get: () => ({ v: st.design ? pc(R.alpha) : '—', sub: 'pass the main model\'s check', bad: st.design > 0 && R.alpha < 0.6 }) },
      { label: 'Generation speed', get: () => ({ v: `${R.speed.toFixed(2)}×`, sub: st.nocheck && st.design ? 'but not the main model\'s words' : 'with DeepSeek-V3\'s costs', good: !st.nocheck && R.speed >= 1.6, bad: (st.nocheck && st.design > 0) || (st.design > 0 && R.speed < 1.2) }) },
    ];
    const labels = [
      { name: 'module', t: 'MTP module', d: 'One block that predicts one word further', icon: 'box', atV: V(-2.77, 0.2, ZB) },
      { name: 'speed', t: 'Generation speed', d: 'Drafts that pass give extra words per pass', icon: 'target', atV: V(2.4, 0.2, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Parallel heads', hint: 'guess the word after next blind', on: () => set({ ...D0, design: 1 }), off: reset },
      { label: 'Untrained module', hint: 'bolted on after pre-training', on: () => set({ ...D0, untrained: true }), off: reset },
      { label: 'Skip the check', hint: 'keep every draft', on: () => set({ ...D0, nocheck: true }), off: reset },
    ];
    function status() {
      const seq = run({ ...st, design: 2, untrained: false, nocheck: false });
      if (st.design === 0) return { msg: `<b>One target per position: the next word.</b> After "${STARTS[st.s].ctx}" the model learns the next word and nothing about the one after. There is nothing to draft with at serving time, so each pass makes one word.` };
      if (st.untrained) return { ok: false, msg: `<b>Untrained module: only ${pc(R.alpha)} of drafts kept, ${R.speed.toFixed(2)}× instead of ${seq.speed.toFixed(2)}×.</b> A module added after pre-training has learned nothing, so it spreads its guess evenly over all ${WORDS.length} words. Even that small share passes only because this toy language has ${WORDS.length} words; with a real vocabulary of over a hundred thousand, almost no draft would pass and drafting would only cost time. The module has to be trained with the model.` };
      if (st.nocheck) return { ok: false, msg: `<b>Every draft kept: ${R.speed.toFixed(2)}×, but the words are no longer the main model's.</b> The check would have replaced ${pc(1 - seq.alpha)} of drafts; skipping it lets about ${pc((1 - seq.alpha) / 2)} of all words come from the small module's guesses. The check is what keeps speculative decoding exact.` };
      if (st.design === 1) return { ok: false, msg: `<b>Parallel heads: ${pc(R.acc)} accuracy on the word after next, against ${pc(seq.acc)} for the sequential module.</b> A parallel head sees the same state as the next-word head and never learns which next word came, so for "${STARTS[st.s].next[st.x][0]}" it still guesses from all of them. As a draft, ${pc(R.alpha)} pass, against ${pc(seq.alpha)}.` };
      return { ok: true, msg: `<b>${pc(R.acc)} accuracy on the word after next; ${pc(R.alpha)} of drafts kept; ${R.speed.toFixed(2)}× faster.</b> The module sees the real next word ("${STARTS[st.s].next[st.x][0]}"), so its guess follows it, the same chain a decoder follows. It shares the embedding and output head, so it adds ${B(R.params)}, ${(R.params / MAIN * 100).toFixed(1)}% of DeepSeek-V3.` };
    }
    return { update: dt => fl.tick(dt), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One target per word', home: true, say: 'A language model learns one thing at each position: the next word. After "the trader in Kano sells", it learns groundnut, and nothing about the word after.', act: m => m.set({ s: 0, x: 0, design: 0, untrained: false, nocheck: false }) },
    { t: 'Two words ahead', home: true, say: 'DeepSeek-V3 adds a small module that also predicts the word after next. It takes the main model\'s state and the real next word, so every position gets two targets.', act: m => m.set({ design: 2 }) },
    { t: 'It sees the next word', focus: [-0.4, 0.3, 0.2], zoom: 1.6, say: 'Change the next word to leather, and the module\'s guess changes to bags and sandals. It follows the same chain a decoder does.', act: m => m.set({ x: 1 }) },
    { t: 'Parallel heads', focus: [-0.4, 0.3, 0.2], zoom: 1.6, say: 'Parallel heads guess the word after next from the same state, without knowing the next word. They can only guess an average, so they are right far less often.', act: m => m.set({ design: 1 }) },
    { t: 'A free draft', home: true, say: 'When serving, the module drafts a word and the main model checks it. Most drafts pass, so each pass yields almost two words.', act: m => m.set({ design: 2, x: 0 }) },
    { t: 'Shared parts', home: true, say: 'The module shares the embedding table and output head with the main model, so it adds under two percent to the size of DeepSeek-V3.' },
  ],
  check: [
    { q: 'What does the sequential MTP module see that a parallel head does not?', options: ['The real next word, as an embedding', 'The whole future sentence', 'A different tokenizer'], answer: 0, why: 'It mixes the previous state with the next word\'s embedding, so its guess follows that word.', hint: 'Switch Real next word with each design.' },
    { q: 'Why does an MTP module make generation faster?', options: ['It drafts the next word and the main model checks it, so most passes yield two words', 'It makes the main model smaller', 'It skips the output head'], answer: 0, why: 'A trained module\'s drafts mostly pass the check.', hint: 'Look at Drafts kept.' },
    { q: 'Why does the module add under two percent to DeepSeek-V3?', options: ['It shares the embedding table and output head; only a projection and one block are new', 'It has no attention', 'It is removed after training'], answer: 0, why: 'The big vocabulary tables are reused.', hint: 'Look at the gold head.' },
  ],
  terms: [
    ['Multi-token prediction (MTP)', 'Training each position to predict more than the next token.'],
    ['MTP module', 'A projection and one transformer block that predict one token further than the depth before.'],
    ['Sequential MTP', 'Each depth sees the previous depth\'s state and the real token at that depth, keeping the causal chain.'],
    ['Parallel heads', 'Several output heads on the same state, each guessing a different offset without seeing the tokens between.'],
    ['Shared output head', 'The modules reuse the main model\'s output layer and embedding table instead of their own.'],
    ['λ (MTP weight)', 'How much the extra losses count: 0.3 early in DeepSeek-V3\'s training, 0.1 later.'],
  ],
  deeper: '<p><b>The loss.</b> Total loss is the main next-token loss plus λ times the average of the D extra losses. DeepSeek-V3 uses one module (D = 1). The paper\'s ablations show small, steady gains on reasoning and code benchmarks from the denser signal alone.</p><p><b>The cost.</b> Training runs roughly ten percent slower for the extra forward work. The first time the model is served with its module as a draft, that is paid back.</p><p><b>Against EAGLE.</b> EAGLE trains a draft after pre-training and works on any existing model; MTP must be built in from the start but also improves the model itself. Their acceptance rates are similar.</p><p><b>About this machine.</b> The main model knows the toy language\'s true odds; the extra predictors are counted from 400 seeded training sentences. Drafts kept is Σ min(p, q) under the usual check. Speed uses DeepSeek-V3\'s active parameters for the cost of one draft (the module\'s attention, one shared and eight routed experts, the projection and the output head, about four percent of a pass); extra parameters count the projection, attention, router and all 257 experts of the module\'s block.</p>',
  code: {
    title: 'One MTP depth: state + next word → word after next',
    note: 'Adapted from the course\'s multi-token prediction lesson.',
    text: `
def mtp_depth(h_prev, next_token, E, M_k, block_k, out_head):
    e = rms_norm(E[next_token])              # shared embedding table
    x = M_k @ concat(rms_norm(h_prev), e)    # h x 2h projection
    h_k = block_k(x)                         # one transformer block
    return h_k, out_head(h_k)                # shared output head

def total_loss(main_loss, depth_losses, lam=0.3):
    return main_loss + lam * sum(depth_losses) / len(depth_losses)
`,
  },
};
