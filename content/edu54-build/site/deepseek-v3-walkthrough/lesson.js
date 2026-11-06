// DeepSeek-V3's router: a lab in Addis Ababa trains a mixture-of-experts layer with 256 routed experts on 8 machines (32 each); every token picks 8.
// A pool of 4,096 tokens has seeded affinities s = sigmoid(popularity_e + noise − 1.5), popularity sd 0.4 (some experts are favourites), noise sd 1.
// Each step routes 1,024 tokens from the pool: top 8 by s + bias, optionally from at most 4 machines (machines ranked by the sum of their two best s + bias).
// Auxiliary-loss-free balancing: after each step every expert's bias moves by γ toward even load (down if above average, up if below). The bias only chooses; it never weights.
// Readouts: busiest machine's load against the average (the step waits for it), busiest expert ÷ average, the share of each token's own top-8 affinity kept, machines per token.
const E = 256, K = 8, NODES = 8, PER = 32, T = 1024, POOL = 4096, STEPS = 400, GAMMAS = [0.0005, 0.002, 0.3];
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
let S = null, TOP = null;
const sel = new Int32Array(K), sv = new Float64Array(K);
function topk(row, b, allowed) {
  let n = 0;
  for (let e = 0; e < E; e++) {
    if (allowed && !allowed[(e / PER) | 0]) continue;
    const v = S[row + e] + b[e];
    if (n < K || v > sv[K - 1]) { let j = n < K ? n++ : K - 1; while (j > 0 && sv[j - 1] < v) { sv[j] = sv[j - 1]; sel[j] = sel[j - 1]; j--; } sv[j] = v; sel[j] = e; }
  }
}
function pool() {
  if (S) return;
  const u = rng(7), g = () => Math.sqrt(-2 * Math.log(u() + 1e-12)) * Math.cos(2 * Math.PI * u());
  const pop = Float64Array.from({ length: E }, () => g() * 0.4);
  S = new Float32Array(POOL * E); TOP = new Float32Array(POOL);
  for (let t = 0; t < POOL; t++) for (let e = 0; e < E; e++) S[t * E + e] = 1 / (1 + Math.exp(-(pop[e] + g() - 1.5)));
  const Z = new Float64Array(E);
  for (let t = 0; t < POOL; t++) { topk(t * E, Z, null); let s = 0; for (let j = 0; j < K; j++) s += S[t * E + sel[j]]; TOP[t] = s; }
}
function sim(cfg) {
  pool();
  const b = new Float64Array(E), ur = rng(3), allowed = new Uint8Array(NODES), hist = [];
  let load = new Float64Array(E), last = null;
  function step() {
    load = new Float64Array(E); let kept = 0, ideal = 0, nodes = 0;
    for (let i = 0; i < T; i++) {
      const t = Math.floor(ur() * POOL), row = t * E;
      if (cfg.lim) { const ns = []; for (let n = 0; n < NODES; n++) { let a = -9, c = -9; for (let e = n * PER; e < (n + 1) * PER; e++) { const v = S[row + e] + b[e]; if (v > a) { c = a; a = v; } else if (v > c) c = v; } ns.push([a + c, n]); }
        ns.sort((x, y) => y[0] - x[0]); allowed.fill(0); for (let j = 0; j < 4; j++) allowed[ns[j][1]] = 1; }
      topk(row, b, cfg.lim ? allowed : null); let m = 0;
      for (let j = 0; j < K; j++) { const e = sel[j]; load[e]++; kept += S[row + e]; m |= 1 << ((e / PER) | 0); }
      let c = 0; while (m) { c += m & 1; m >>= 1; } nodes += c; ideal += TOP[t];
    }
    const mean = T * K / E, nl = new Float64Array(NODES); let mx = 0;
    for (let e = 0; e < E; e++) { mx = Math.max(mx, load[e]); nl[(e / PER) | 0] += load[e]; }
    const eff = (T * K / NODES) / Math.max(...nl);
    if (cfg.bal) for (let e = 0; e < E; e++) b[e] -= cfg.gamma * Math.sign(load[e] - mean);
    last = { hot: mx / mean, eff, kept: kept / ideal, nodes: nodes / T, nl };
    hist.push(last);
  }
  return { step, get load() { return load; }, get last() { return last; }, hist, b };
}

export default {
  slug: 'deepseek-v3-walkthrough',
  title: 'DeepSeek-V3: keep the experts evenly busy',
  description: 'A lab in Addis Ababa trains a layer of 256 experts on eight machines, and every word picks eight. The step waits for the busiest machine, so balance them.',
  overview: 'DeepSeek-V3 is a 671-billion-parameter mixture of experts with 37 billion active per token: 61 layers, the first three dense, the rest each with 256 routed experts and one shared expert, eight routed experts per token. The lesson on open models derives those counts and the small latent cache of its multi-head latent attention; the lessons on multi-token prediction and DualPipe cover two more of its ideas. This one is about the router. Each token scores every expert and goes to its top eight. Some experts are favourites, so without care a few get swamped while others idle, and because experts sit on different machines, the whole step waits for the busiest one. The usual fix is an extra balancing loss, but that loss pulls against the main objective. DeepSeek-V3 instead keeps a bias for each expert, added to its score only when choosing. After each step, overloaded experts\' biases go down and idle ones go up by a fixed small step. The bias never changes how much an expert\'s output counts, and there is no extra loss. The router also limits each token to experts on at most four machines, capping the network traffic.',
  keywords: ['DeepSeek-V3', 'mixture of experts', 'load balancing', 'auxiliary-loss-free', 'router bias', 'expert parallelism', 'node-limited routing'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { bal: true, g: 1, lim: true }, st = { ...D0 };
    const ink = '#151827', AUB = '#6B5E86', TEAL = '#1F9E89';
    const hd = P.box(4.0, 0.04, 0.3, '#FFFFFF', { r: 0.03 }); hd.position.set(-0.75, 0.12, -1.17); S.add(hd);

    /* eight machines, 32 experts each */
    const TW = 0.95, TD = 0.5, CELL = 0.1, TX = i => -2.75 + TW / 2 + (i % 4) * (TW + 0.05), TZ = i => -0.68 + Math.floor(i / 4) * (TD + 0.12);
    const trays = Array.from({ length: NODES }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#F6F1E6' }), t = P.box(TW, 0.03, TD, '#fff', { r: 0.02, material: mm }); t.position.set(TX(i), 0.12, TZ(i)); S.add(t);
         return { mm }; });
    const geo = new THREE.BoxGeometry(CELL * 0.72, 1, CELL * 0.72); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), E); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const ex = e => { const n = (e / PER) | 0, k = e % PER; return [TX(n) - TW / 2 + 0.075 + (k % 8) * CELL * 1.1 + CELL / 2, TZ(n) - TD / 2 + 0.07 + Math.floor(k / 8) * CELL + CELL / 2]; };
    const keep = P.box(4.0, 0.6, 1.25, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(-0.75, 0.12, -0.37); S.add(keep);
    /* chart: the busiest machine against the average, step by step */
    const CX0 = -2.75, CW = 4.0, CZ0 = 1.15, CH = 0.5;
    const card = P.box(CW + 0.1, 0.03, CH + 0.22, '#FFFFFF', { r: 0.03 }); card.position.set(CX0 + CW / 2, 0.12, CZ0 - CH / 2 + 0.02); S.add(card);

    const ref = P.box(CW, 0.005, 0.008, '#B8B0A6', { r: 0 }); ref.position.set(CX0 + CW / 2, 0.15, CZ0 - CH); S.add(ref);
    const dots = new THREE.InstancedMesh(new THREE.BoxGeometry(CW / STEPS * 1.6, 0.012, 0.022), new THREE.MeshBasicMaterial({ color: '#C62828' }), STEPS);
    dots.frustumCulled = false; dots.layers.set(1); dots.userData.noFit = true; S.add(dots);
    /* results */
    const PX = 2.42, rp = P.box(1.3, 0.05, 2.6, '#FFFFFF', { r: 0.03 }); rp.position.set(PX, 0.12, 0.08); S.add(rp);

    const gm = new THREE.MeshLambertMaterial({ color: TEAL }), gauge = P.box(0.4, 1, 0.4, '#fff', { r: 0.03, material: gm }); gauge.position.set(PX, 0.15, -0.5); gauge.userData.noFit = true; S.add(gauge);




    let run = null, acc = 0;
    const dummy = new THREE.Object3D(), col = new THREE.Color(), pc = v => `${Math.round(v * 100)}%`;
    const cfg = () => ({ bal: st.bal, gamma: GAMMAS[st.g], lim: st.lim });
    function restart() { run = sim(cfg()); run.step(); draw(); }
    function draw() {
      const L = run.last, mean = T * K / E, n = run.hist.length;
      for (let e = 0; e < E; e++) { const r = run.load[e] / mean, [x, z] = ex(e);
        dummy.position.set(x, 0.135, z); dummy.scale.set(1, 0.006 + 0.06 * Math.min(r, 9), 1); dummy.updateMatrix(); im.setMatrixAt(e, dummy.matrix);
        im.setColorAt(e, col.set(r > 2.5 ? '#C62828' : r > 1.6 ? '#E07A5F' : r < 0.3 ? '#C9C1D9' : TEAL)); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      const nm = T * K / NODES; L.nl.forEach((v, i) => trays[i].mm.color.set(v / nm > 1.3 ? '#F4D3C9' : '#F6F1E6'));
      run.hist.forEach((h, i) => { dummy.position.set(CX0 + CW * i / (STEPS - 1), 0.16, CZ0 - CH * h.eff); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix); });
      dots.count = n; dots.instanceMatrix.needsUpdate = true;
      gauge.scale.y = 0.03 + 0.55 * L.eff; gm.color.set(L.eff >= 0.88 ? TEAL : L.eff >= 0.75 ? '#C9A227' : '#C62828');


    }
    restart();
    const set = p => { Object.assign(st, p); restart(); };
    function update() {
      if (run.hist.length >= STEPS) return;
      const t0 = performance.now(); let k = 0;
      while (run.hist.length < STEPS && k < 4 && performance.now() - t0 < 12) { run.step(); k++; }
      draw();
    }
    const controls = [
      { type: 'toggle', label: 'Bias balancing', get: () => st.bal, set: v => set({ bal: !!v }) },
      { type: 'buttons', label: 'Bias step', options: GAMMAS.map(String), get: () => st.g, act: i => set({ g: i, bal: true }) },
      { type: 'toggle', label: 'At most 4 machines per token', get: () => st.lim, set: v => set({ lim: !!v }), quick: false },
      { type: 'button', label: 'Start again', act: () => restart() },
    ];
    const readouts = [
      { label: 'Machine time used', get: () => ({ v: pc(run.last.eff), sub: 'average load ÷ busiest machine', good: run.last.eff >= 0.88, bad: run.last.eff < 0.75 }) },
      { label: 'Busiest expert', get: () => ({ v: `${run.last.hot.toFixed(1)}×`, sub: 'the average expert\'s load', bad: run.last.hot > 4 }) },
      { label: 'Machines per token', get: () => ({ v: run.last.nodes.toFixed(1), sub: st.lim ? 'limit: 4' : 'no limit', bad: !st.lim }) },
    ];
    const labels = [
      { name: 'experts', t: '256 experts', d: 'Bar height: words routed this step', icon: 'box', atV: V(-2.82, 0.2, -0.68) },
      { name: 'used', t: 'Machine time used', d: 'The step waits for the busiest machine', icon: 'target', atV: V(2.45, 0.2, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No balancing', hint: 'the router picks favourites', on: () => set({ ...D0, bal: false }), off: reset },
      { label: 'Bias step too big', hint: 'nudges of 0.3', on: () => set({ ...D0, g: 2 }), off: reset },
      { label: 'Any machine', hint: 'no limit per token', on: () => set({ ...D0, lim: false }), off: reset },
    ];
    function status() {
      const L = run.last, n = run.hist.length, settled = n >= 150, tail = run.hist.slice(-50), avg = k => tail.reduce((a, h) => a + h[k], 0) / tail.length;
      if (!st.bal) return { ok: false, msg: `<b>No balancing: the busiest machine has ${(1 / avg('eff')).toFixed(2)} times the average load, so ${pc(1 - avg('eff'))} of machine time is spent waiting.</b> Some experts are favourites for most words (busiest expert ${avg('hot').toFixed(1)}× the average) and the router keeps choosing them. An extra balancing loss would fix it but pulls against the main objective.` };
      if (st.g === 2) return { ok: false, msg: `<b>Bias step too big: the load swings and never settles${settled ? ` (machine time used ${pc(avg('eff'))}, busiest expert ${avg('hot').toFixed(1)}×)` : ''}.</b> Each nudge of 0.3 is far larger than the gaps between experts' scores, so the overloaded experts become idle, then the idle ones overloaded, every step. Words also lose their best experts: ${pc(avg('kept'))} of their top-8 affinity kept. DeepSeek-V3 used a step of 0.001 on scores between 0 and 1.` };
      if (!st.lim) return { ok: false, msg: `<b>Any machine: each word reaches ${L.nodes.toFixed(1)} machines on average.</b> Every machine a word touches means sending its activations across the network and gathering them back. Limiting each word to the four machines with its best experts caps that traffic at four with almost no loss of affinity.` };
      if (!settled) return { msg: `<b>Settling, step ${n}: machine time used ${pc(L.eff)}.</b> Each step, overloaded experts' biases go down by ${GAMMAS[st.g]} and idle ones go up. ${st.g === 0 ? 'With a step this small it takes longer to even out.' : 'Watch the line climb toward 100%.'}` };
      return { ok: avg('eff') >= 0.88, msg: `<b>Balanced: machine time used ${pc(avg('eff'))}, busiest expert ${avg('hot').toFixed(1)}× the average.</b> The bias only decides which experts are chosen, never how much their output counts, and there is no extra loss term. Words keep ${pc(avg('kept'))} of their own top-8 affinity, and each reaches at most 4 machines (${L.nodes.toFixed(1)} on average).` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Experts on eight machines', home: true, say: 'A lab in Addis Ababa trains a mixture-of-experts model: two hundred and fifty-six experts on eight machines, and each word goes to eight of them. Left alone, the router sends most words to the same favourites.', act: m => m.set({ bal: false, g: 1, lim: true }) },
    { t: 'The busiest machine sets the pace', home: true, say: 'Every step waits for the busiest machine, so the others spend much of their time idle.' },
    { t: 'A bias for each expert', home: true, say: 'DeepSeek-V3 gives each expert a bias. After every step, busy experts are nudged down and idle ones up. Within a few hundred steps the load evens out.', act: m => m.set({ bal: true }) },
    { t: 'Only for choosing', home: true, say: 'The bias only changes which experts are chosen, not how much their answers count. There is no extra loss pulling against the main one.' },
    { t: 'Too big a nudge', home: true, say: 'Make the nudge too big, and the load swings from one side to the other and never settles.', act: m => m.set({ g: 2 }) },
    { t: 'At most four machines', home: true, say: 'Each word may use experts on at most four machines, which caps the traffic across the network. The rest of DeepSeek-V3, its attention, its extra prediction module and its pipeline, have lessons of their own.', act: m => m.set({ g: 1 }) },
  ],
  check: [
    { q: 'Why does an uneven router slow training down?', options: ['The step waits for the busiest machine while others idle', 'Idle experts use more memory', 'The favourite experts give wrong answers'], answer: 0, why: 'Experts on different machines run in parallel; the slowest sets the pace.', hint: 'Look at Machine time used with balancing off.' },
    { q: 'How does DeepSeek-V3 balance experts without an extra loss?', options: ['A per-expert bias added to scores only when choosing, nudged after each step toward even load', 'Dropping words sent to busy experts', 'Giving every expert the same score'], answer: 0, why: 'No loss term competes with the main objective.', hint: 'Watch the bars even out.' },
    { q: 'What goes wrong with a bias step that is too big?', options: ['The load swings back and forth and never settles', 'Balancing becomes too slow', 'Nothing; bigger is faster'], answer: 0, why: 'Each nudge overshoots the small gaps between expert scores.', hint: 'Try 0.3.' },
  ],
  terms: [
    ['Router', 'The layer that scores every expert for a token and sends it to the top few.'],
    ['Load balancing', 'Keeping experts, and the machines they sit on, about equally busy.'],
    ['Auxiliary loss', 'An extra training loss that penalises uneven load; it competes with the main objective.'],
    ['Auxiliary-loss-free balancing', 'DeepSeek-V3\'s per-expert bias, used only for choosing and nudged toward even load each step.'],
    ['Shared expert', 'An expert every token uses, alongside its routed experts.'],
    ['Node-limited routing', 'Each token may use experts on at most a few machines, capping network traffic.'],
  ],
  deeper: '<p><b>The rest of DeepSeek-V3.</b> 61 layers with hidden size 7,168; the first three use a dense feed-forward layer, the other 58 have 256 routed experts and one shared expert each, with eight routed experts per token. Attention is multi-head latent attention, which caches a 512-number summary per token per layer instead of full keys and values. One multi-token prediction module, FP8 training and the DualPipe schedule complete the picture: 671 billion parameters, 37 billion active, trained on 14.8 trillion tokens.</p><p><b>Scores and weights.</b> V3 scores experts with a sigmoid rather than a softmax, then normalises the chosen experts\' raw scores into weights. Because the bias is left out of those weights, it can push the choice without bending what the model computes.</p><p><b>A small safety net.</b> V3 still adds a tiny sequence-level balance loss to avoid extreme imbalance within a single sequence, and drops no tokens during training.</p><p><b>About this machine.</b> Affinities come from a seeded pool as described in the file header; with 1,024 tokens a step, an average expert gets 32, so even a balanced router shows some random spread.</p>',
  code: {
    title: 'Choose with the bias, weight without it, nudge after the step',
    note: 'Adapted from the course\'s DeepSeek-V3 lesson and the V3 report.',
    text: `
import numpy as np

def route(scores, bias, k=8):
    chosen = np.argsort(scores + bias)[-k:]       # bias only for choosing
    w = scores[chosen] / scores[chosen].sum()     # weights from raw scores
    return chosen, w

def update_bias(bias, load, gamma=0.001):
    return bias - gamma * np.sign(load - load.mean())
`,
  },
};
