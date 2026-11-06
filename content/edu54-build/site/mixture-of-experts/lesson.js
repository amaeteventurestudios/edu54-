// Mixture of experts: a helpdesk model in Kano reads a mix of Hausa, English, code and numbers. A router scores each of 200 tokens against 8 expert networks and sends
// it to its top k. Columns are how many tokens each expert receives; the gold line is a fair share. Routing is simulated live: each token has a kind, the router's
// learned scores favour some experts for each kind, and one expert starts with a head start (as untrained routers do). Balancing nudges a per-expert bias, the
// auxiliary-loss-free method. Break it: no balancing (one expert takes most tokens, others sit idle), k = 1 with a capacity limit (overflow tokens skip the layer),
// k = 8 (every expert runs for every token: as slow as a dense model eight times the size).
const E = 8, N = 200, KINDS = ['Hausa', 'English', 'code', 'numbers'], KC = ['#1F9E89', '#3B3F8F', '#7A3B69', '#C9A227'];
function route(st) {
  let seed = 23; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const g = () => { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const PREF = [[2.0, 1.5, 0, 0, 0.3, 0, 0, 0], [0, 0.4, 2.0, 1.4, 0, 0, 0, 0], [0, 0, 0, 0.3, 2.0, 1.6, 0, 0], [0, 0, 0, 0, 0, 0.4, 2.0, 1.5]];
  const toks = Array.from({ length: N }, (_, i) => ({ kind: [0, 0, 1, 1, 2, 3][Math.floor(rnd() * 6)] }));
  const bias = Array(E).fill(0), head = [0, 2.2, 0, 0, 0, 0, 0, 0];   // expert 2 starts with a head start
  let load = Array(E).fill(0), picks = [];
  const rounds = st.balance ? 30 : 1;
  for (let r = 0; r < rounds; r++) {
    seed = 23 + 7;   // same tokens, same noise each round
    load = Array(E).fill(0); picks = [];
    toks.forEach(t => {
      const sc = PREF[t.kind].map((p, e) => p + head[e] + 0.6 * g());
      const sel = sc.map((v, e) => [v + bias[e], e]).sort((a, b) => b[0] - a[0]).slice(0, st.k).map(x => x[1]);
      picks.push(sel); sel.forEach(e => load[e]++);
    });
    if (st.balance) { const target = N * st.k / E; load.forEach((l, e) => { bias[e] += l > target ? -0.12 : 0.12; }); }
  }
  const cap = st.cap ? Math.ceil(1.25 * N * st.k / E) : Infinity, used = Array(E).fill(0);
  let dropped = 0; picks.forEach(sel => sel.forEach(e => { if (used[e] < cap) used[e]++; else dropped++; }));
  return { toks, load, used, dropped, cap, picks };
}

export default {
  slug: 'mixture-of-experts',
  title: 'Mixture of experts: route each token',
  description: 'A helpdesk model in Kano reads Hausa, English, code and numbers. A router sends each token to a few of eight expert networks, so only a fraction of the model runs per token. Then switch off load balancing, cap each expert with only one choice per token, or send every token to all eight.',
  overview: 'A mixture-of-experts layer replaces the transformer\'s single feed-forward network with many expert networks and a small router. For each token the router scores every expert and sends the token to the top k, then mixes their outputs by the router\'s weights. Only k experts run per token, so a model can hold far more parameters, more knowledge, while the compute per token stays like a much smaller dense model; DeepSeek-V3 has 671 billion parameters but uses about 37 billion per token. Routers tend to favour a few experts, which then get all the training while others starve. Fixes include an auxiliary balancing loss, a capacity limit that drops overflow tokens, and DeepSeek\'s per-expert bias nudged after each step, which balances selection without touching the training loss. Fine-grained designs use many small experts with a larger k, and shared experts that every token uses. The catch is memory: every expert must sit in GPU memory even though few run.',
  keywords: ['mixture of experts', 'router', 'top-k', 'load balancing', 'sparse model', 'expert capacity'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.55, 0.15], dir: [0.05, 0.4, 1.3], half: 1.4, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { k: 2, balance: true, cap: false };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.6, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.2); S.add(base);
    /* the router in front */
    const router = P.box(1.4, 0.4, 0.5, '#2B2B38', { r: 0.05 }); router.position.set(-1.6, 0.12, 0.95); S.add(router);
    const rf = S.text('Router', { size: 0.12, weight: 800, face: 'front', color: '#F2C94C' }); rf.position.set(-1.6, 0.32, 1.205); S.add(rf);
    const ru = S.text('Router', { size: 0.12, weight: 800, color: '#F2C94C' }); ru.position.set(-1.6, 0.525, 0.95); S.add(ru);
    /* token stream: dots in kind colours flowing into the router */
    const dots = Array.from({ length: 24 }, (_, i) => { const b = P.ball(0.045, '#888'); b.userData.noFit = true; S.add(b); return b; });
    /* eight experts, each a column on a pad */
    const EX = e => -2.8 + e * 0.8, EZ = -0.45;
    const experts = Array.from({ length: E }, (_, e) => {
      const pad = P.box(0.62, 0.08, 0.62, '#D9D1C0', { r: 0.03 }); pad.position.set(EX(e), 0.12, EZ); S.add(pad);
      const segs = KINDS.map((_, k) => { const mm = new THREE.MeshLambertMaterial({ color: KC[k] }), b = P.box(0.46, 1, 0.46, KC[k], { r: 0.02, material: mm }); b.userData.noFit = true; S.add(b); return b; });
      const dropB = P.box(0.46, 1, 0.46, '#D64545', { r: 0.02 }); dropB.material = new THREE.MeshBasicMaterial({ color: '#D64545', transparent: true, opacity: 0.35 }); dropB.userData.noFit = true; S.add(dropB);
      const pl = P.box(0.6, 0.18, 0.06, '#FBF8F1', { r: 0.02 }); pl.position.set(EX(e), 0.12, EZ + 0.36); S.add(pl);
      const f = S.text(`expert ${e + 1}`, { size: 0.09, weight: 800, face: 'front', color: ink, maxW: 0.58 }); f.position.set(EX(e), 0.21, EZ + 0.395); S.add(f);
      const v = S.text('', { size: 0.085, weight: 800, color: '#FFFFFF', bg: '#151827CC', top: true, face: 'cam' }); v.userData.noFit = true; S.add(v);
      const pipe = new THREE.MeshBasicMaterial({ color: '#8A8578', transparent: true, opacity: 0.5 }), t = P.tube([V(-1.6, 0.45, 0.75), V((EX(e) - 1.6) * 0.5, 0.75, 0.25), V(EX(e), 0.25, EZ + 0.2)], 0.012, '#8A8578', { material: pipe }); t.layers.set(1); t.userData.noFit = true; S.add(t);
      return { segs, dropB, v, pipe };
    });
    const fair = P.box(6.4, 0.012, 0.03, '#C9A227', { r: 0.004 }); fair.userData.noFit = true; S.add(fair);
    const fairT = S.text('fair share', { size: 0.075, weight: 800, color: '#8A6D00' }); fairT.userData.noFit = true; S.add(fairT);
    const keep = P.box(0.46, 1.5, 0.46, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(EX(1), 0.16, EZ); S.add(keep);
    const legend = KINDS.map((k, i) => { const t = S.text(k, { size: 0.11, weight: 800, color: '#FFFFFF', bg: KC[i], top: true }); t.position.set(0.2 + i * 0.85, 0.13, 0.8); t.rotation.x = -Math.PI / 2; S.add(t); return t; });

    let R = null, t0 = 0;
    const H = 1.2 / (N * 2 / E * 2.2);
    function draw() {
      R = route(st);
      const byKind = Array.from({ length: E }, () => Array(4).fill(0));
      R.picks.forEach((sel, i) => sel.forEach(e => { byKind[e][R.toks[i].kind]++; }));
      experts.forEach((X, e) => { let y = 0.16; X.segs.forEach((b, k) => { const n = byKind[e][k], h = Math.max(0.001, Math.min(n, R.cap === Infinity ? n : n) * H); b.visible = n > 0; b.scale.y = h; b.position.set(EX(e), y, EZ); y += h; });
        const over = Math.max(0, R.load[e] - R.used[e]); X.dropB.visible = over > 0; if (over) { const top = 0.16 + R.used[e] * H; X.dropB.scale.y = over * H; X.dropB.position.set(EX(e), 0.16 + R.load[e] * H - over * H, EZ); }
        X.v.userData.set(`${R.load[e]}`); X.v.position.set(EX(e), 0.16 + R.load[e] * H + 0.16, EZ); X.pipe.opacity = R.load[e] ? 0.25 + 0.6 * R.load[e] / Math.max(...R.load) : 0.08; });
      const fs = N * st.k / E; fair.position.set(0, 0.16 + fs * H, EZ); fairT.position.set(EX(7) + 0.55, 0.16 + fs * H, EZ);
    }
    draw();
    const update = dt => { t0 += dt; dots.forEach((d, i) => { const u = (t0 * 0.35 + i / dots.length) % 1, kind = [0, 0, 1, 1, 2, 3][i % 6]; d.material.color.set(KC[kind]); d.position.set(-2.95 + u * 0.75, 0.3, 0.95 + Math.sin(i * 1.7) * 0.15); }); };
    const spec = () => { const byKind = KINDS.map(() => Array(E).fill(0)); R.picks.forEach((sel, i) => sel.forEach(e => { byKind[R.toks[i].kind][e]++; })); return [0, 2].map(k => { const top2 = byKind[k].map((v, e) => [v, e]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(x => x[1] + 1).sort(); return `${KINDS[k]} tokens mostly go to experts ${top2[0]} and ${top2[1]}`; }).join(', '); };
    const idle = () => R.load.filter(l => l < N * st.k / E * 0.6).length, top = () => Math.max(...R.load) / (N * st.k) * 100;
    const controls = [
      { type: 'buttons', label: 'Experts per token (k)', options: ['1', '2', '8'], get: () => [1, 2, 8].indexOf(st.k), act: i => { st.k = [1, 2, 8][i]; draw(); } },
      { type: 'toggle', label: 'Balance with a per-expert bias', short: 'balance', get: () => st.balance, set: v => { st.balance = v; draw(); } },
      { type: 'toggle', label: 'Capacity limit (1.25 × fair share)', short: 'capacity', get: () => st.cap, set: v => { st.cap = v; draw(); } },
    ];
    const readouts = [
      { label: 'Active per token', get: () => ({ v: `${st.k} of 8`, sub: `${Math.round(st.k / E * 100)}% of expert compute`, good: st.k <= 2, bad: st.k === 8 }) },
      { label: 'Busiest expert', get: () => ({ v: `${Math.round(top())}%`, sub: `of routed slots; fair is ${Math.round(100 / E)}%`, bad: top() > 25, good: top() <= 17 }) },
      { label: 'Tokens dropped', get: () => ({ v: String(R.dropped), sub: 'skip the layer', bad: R.dropped > 0, good: R.dropped === 0 }) },
    ];
    const labels = [
      { name: 'router', t: 'Router', d: 'Scores every expert per token', icon: 'target', atV: V(-2.35, 0.32, 0.95) },
      { name: 'experts', t: 'Eight experts', d: 'Column: tokens received, by kind', icon: 'box', atV: V(EX(7) + 0.35, 0.6, EZ) },
    ];
    const reset = () => { Object.assign(st, { k: 2, balance: true, cap: false }); draw(); };
    const breaks = [
      { label: 'No balancing', hint: 'Let the router pick freely', on: () => { reset(); st.balance = false; draw(); }, off: reset },
      { label: 'k = 1 with a capacity limit', hint: 'Unbalanced', on: () => { reset(); st.k = 1; st.cap = true; st.balance = false; draw(); }, off: reset },
      { label: 'Every expert, every token', hint: 'k = 8', on: () => { reset(); st.k = 8; draw(); }, off: reset },
    ];
    function status() {
      if (st.k === 8) return { ok: false, msg: `<b>All eight experts run for every token.</b> With k = 8 nothing is skipped: each token costs as much as a dense feed-forward network eight times the size, and the router does nothing useful. The point of experts is to hold many parameters but run only a few; k of 1 or 2 out of 8 uses ${Math.round(2 / E * 100)}% of the expert compute.` };
      if (R.dropped > 0) return { ok: false, msg: `<b>${R.dropped} tokens skip the layer.</b> Unbalanced, the router still overloads expert 2, and a capacity limit of ${R.cap} tokens per expert sends the overflow (red) straight past the layer unprocessed. Quality suffers. Balance first, so few tokens overflow.` };
      if (!st.balance) return { ok: false, msg: `<b>One expert takes ${Math.round(top())}% of the work.</b> Expert 2 started with a small head start, so the router favours it for every kind of token; it trains more and gets favoured more, while ${idle()} experts get under 60% of a fair share and learn far less. A per-expert bias, nudged after each step, spreads the load without changing the training loss.` };
      return { ok: true, msg: `<b>Balanced, and sparse.</b> Each token runs ${st.k} of 8 experts. After balancing, the busiest expert takes ${Math.round(top())}% of routed slots (fair is ${Math.round(100 / E)}%), and experts still specialise: ${spec()}.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Many experts', home: true, say: 'A helpdesk model in Kano reads Hausa, English, code and numbers. Its feed-forward layer is split into eight expert networks.', act: m => m.set({ k: 2, balance: true, cap: false }) },
    { t: 'The router', home: true, say: 'For each token, a small router picks the best two experts. Only those two run, so most of the layer rests.', act: m => m.set({}) },
    { t: 'Specialists', home: true, say: 'Experts specialise: Hausa tokens mostly reach one pair, code another.', act: m => m.set({}) },
    { t: 'The rich get richer', home: true, say: 'Without balancing, one expert with a small head start takes most of the tokens, and others starve.', act: m => m.set({ balance: false }) },
    { t: 'Overflow', home: true, say: 'Cap each expert\'s load instead, and the overflow tokens skip the layer entirely.', act: m => m.set({ k: 1, cap: true }) },
    { t: 'Not all at once', home: true, say: 'Send every token to all eight, and it costs as much as a dense model eight times the size. Sparse is the point.', act: m => m.set({ k: 8, cap: false, balance: true }) },
  ],
  check: [
    { q: 'What does the router in a mixture-of-experts layer do?', options: ['Sends each token to its top k experts', 'Trains every expert equally', 'Removes tokens'], answer: 0, why: 'Only k experts run per token.' },
    { q: 'Why can a 671-billion-parameter MoE run as cheaply as a much smaller dense model?', options: ['Only a few experts run for each token', 'It skips attention', 'Its weights are smaller numbers'], answer: 0, why: 'Parameters and compute per token are decoupled.' },
    { q: 'What goes wrong without load balancing?', options: ['A few experts get most tokens and the rest barely learn', 'Every expert gets the same tokens', 'The router stops working'], answer: 0, why: 'Favoured experts get more favoured.' },
  ],
  terms: [
    ['Mixture of experts', 'Many expert networks with a router choosing a few per token.'],
    ['Router', 'A small layer that scores the experts for each token.'],
    ['Top-k', 'The number of experts each token is sent to.'],
    ['Load balancing', 'Keeping tokens spread across experts.'],
    ['Capacity', 'The most tokens an expert will take in one batch.'],
    ['Active parameters', 'The parameters actually used for one token.'],
  ],
  deeper: '<p><b>Memory, not compute.</b> Every expert must be loaded even though few run, so serving a large MoE spreads experts across GPUs and sends tokens between them; that communication, not the arithmetic, often sets the speed.</p><p><b>Languages as experts.</b> Experts do not neatly map to languages, but in multilingual models some specialise in scripts and languages. Balanced routing matters most for the languages with the least data.</p><p><b>About this machine.</b> Token kinds, router preferences and the head start are set by hand; routing, the bias balancer, capacity dropping and every count are simulated live over 200 tokens.</p>',
  code: {
    title: 'Top-k routing with a balancing bias',
    note: 'Adapted from the course\'s mixture of experts lesson.',
    text: `
import torch

def route(x, W_router, bias, k=2):
    scores = x @ W_router                        # (tokens, experts)
    top = torch.topk(scores + bias, k).indices   # bias changes who is picked...
    gate = torch.softmax(scores.gather(1, top), dim=1)   # ...not how much they count
    return top, gate

def update_bias(bias, load, target, step=0.001):
    return bias - step * torch.sign(load - target)       # outside the training loss
`,
  },
};
