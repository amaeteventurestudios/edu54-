// Scaling laws: a lab in Nairobi has a fixed compute budget to train a Swahili and English model. For that budget (C = 6 · parameters · tokens) the curve shows the
// predicted loss for every model size, using the Chinchilla fit L = 406.4 / N^0.34 + 410.7 / D^0.28 + 1.69; the ball is the chosen size. The second curve adds the
// compute of serving the model for a year, which favours smaller models trained longer. The third board turns loss into a per-word success rate and a 10-word
// exact-match score. All computed live. Break it: a huge model for the budget (too few tokens each), judging by exact match only (a smooth gain looks like a sudden
// leap), the training-optimal size for a service that answers billions of questions (serving cost dwarfs training).
const A = 406.4, B = 410.7, AL = 0.34, BE = 0.28, E = 1.69;
const loss = (N, D) => A / N ** AL + B / D ** BE + E;
const BUDGETS = [1e21, 1e22, 1e23];

export default {
  slug: 'scaling-laws',
  title: 'Scaling laws: spend compute wisely',
  description: 'A lab in Nairobi has a fixed compute budget to train a Swahili and English model.',
  overview: 'Language model loss falls predictably as parameters and training tokens grow. The Chinchilla fit writes it as a term that shrinks with parameters, a term that shrinks with tokens, and a floor that never goes away. Training compute is about six times parameters times tokens, so for a fixed budget every extra parameter means fewer tokens. The loss is lowest at tens of tokens per parameter, about 20 by the usual rule of thumb: a model that is too large for its budget sees too little data, one that is too small cannot use it. But training is paid once and serving is paid for every answer, so models that will answer billions of questions are deliberately made smaller and trained far longer, 100 tokens per parameter or more. Abilities that seem to appear suddenly at some size are often an effect of the metric: an all-or-nothing score such as exact match over many words turns a smooth gain into a jump. Plan with smooth measures like loss. Data quality, mixture-of-experts and post-training shift the curves, but the shape holds.',
  keywords: ['scaling laws', 'chinchilla', 'compute optimal', 'tokens per parameter', 'emergence', 'inference cost'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.1, -0.45], dir: [0.05, 0.2, 1.3], half: 1.15, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { budget: 1, logN: 9.7, serve: false, metric: 0 };
    const ink = '#151827';
    const board = (x, w, title) => { const b = P.box(w, 1.75, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); b.position.set(x, 0.3, -0.5); floor.add(b);
      [-w / 2 + 0.15, w / 2 - 0.15].forEach(dx => { const p = P.cyl(0.03, 0.18, '#8A8578'); p.position.set(x + dx, 0.12, -0.5); floor.add(p); });
         return t; };
    /* left: loss against model size for this budget */
    const LX = -1.2, LW = 3.6, X0 = LX - LW / 2 + 0.3, X1 = LX + LW / 2 - 0.2, Y0 = 0.55, YH = 1.15;
    const ttl = board(LX, LW + 0.2, '');
    const NMIN = 8, NMAX = 11.5, xOf = l => X0 + (l - NMIN) / (NMAX - NMIN) * (X1 - X0);
    const axis = P.rod(V(X0, Y0, -0.44), V(X1, Y0, -0.44), 0.006, '#8A8578'); floor.add(axis);
    [8, 9, 10, 11].forEach(l => {    });

    const mk = (col, r) => { const mm = new THREE.MeshBasicMaterial({ color: col }), m = P.tube([V(0, 0, 0), V(0.1, 0, 0)], r, col, { material: mm }); m.layers.set(1); m.userData.noFit = true; floor.add(m); return m; };
    const curve = mk(C.plum, 0.014), cost = mk(C.coral, 0.012);
    const ball = P.ball(0.06, '#F2C94C'); ball.userData.noFit = true; floor.add(ball);
    const opt = P.box(0.015, YH, 0.02, '#1F9E89', { r: 0.004 }); opt.userData.noFit = true; floor.add(opt);


    /* right: smooth versus all-or-nothing */
    const RX = 2.05, RW = 2.3; board(RX, RW, 'What the loss buys');
    const pb = ['per word right', '10 words all right'].map((n, k) => { const x = RX - 0.5 + k * 1.0;
      const mm = new THREE.MeshLambertMaterial({ color: k ? C.coral : '#1F9E89' }), b = P.box(0.5, 1, 0.08, '#888', { r: 0.02, material: mm }); b.position.set(x, 0.55, -0.43); b.userData.noFit = true; floor.add(b);
         return { b, mm, x }; });
    const keep = P.box(0.3, 1.2, 0.1, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(RX, 0.55, -0.43); floor.add(keep);

    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    const Cb = () => BUDGETS[st.budget];
    const total = (N, Cc) => { const D = Cc / (6 * N); const serveFlops = st.serve ? 2 * N * 3e12 : 0; return { D, L: loss(N, D), all: Cc + serveFlops }; };
    function run() {
      const Cc = Cb(), N = 10 ** st.logN, T = total(N, Cc);
      let best = NMIN, bl = 99; for (let l = NMIN; l <= NMAX; l += 0.02) { const v = loss(10 ** l, Cc / (6 * 10 ** l)); if (v < bl) { bl = v; best = l; } }
      // serving: a year of answers, 3e12 tokens, costs 2·N per token; find the size that reaches the optimum's loss at least total compute by training longer
      const pw = Math.exp(-(T.L - E) * 0.35), em = pw ** 10;
      return { Cc, N, D: T.D, L: T.L, best, bl, btpp: Cc / (6 * 10 ** best) / 10 ** best, tpp: T.D / N, pw, em, serveShare: st.serve ? (2 * N * 3e12) / (Cc + 2 * N * 3e12) : 0 };
    }
    function draw() {
      R = run();
      const lo = 1.95, hi = 2.7, yOf = L => Y0 + Math.max(0, Math.min(1, (hi - L) / (hi - lo))) * YH;
      const pts = []; for (let l = NMIN; l <= NMAX; l += 0.05) pts.push(V(xOf(l), yOf(loss(10 ** l, R.Cc / (6 * 10 ** l))), -0.42));
      curve.geometry.dispose(); curve.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.014, 6, false);
      cost.visible = st.serve;
      if (st.serve) { const cp = []; for (let l = NMIN; l <= NMAX; l += 0.05) { const N = 10 ** l, sh = (R.Cc + 2 * N * 3e12) / R.Cc; cp.push(V(xOf(l), Y0 + Math.min(1, Math.log10(sh) / 3) * YH, -0.41)); }
        cost.geometry.dispose(); cost.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cp), 160, 0.012, 6, false); }
      ball.position.set(xOf(st.logN), yOf(R.L), -0.38);
      opt.position.set(xOf(R.best), Y0, -0.43);
      const vals = [R.pw, R.em]; pb.forEach((p, k) => { const h = Math.max(0.01, vals[k] * 1.1); p.b.scale.y = h; p.b.visible = st.metric === 0 || k === 1;  });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Compute budget (FLOPs)', options: ['10^21', '10^22', '10^23'], get: () => st.budget, act: i => { st.budget = i; draw(); } },
      { type: 'slider', label: 'Model size (log10 parameters)', min: 8, max: 11.5, step: 0.1, get: () => st.logN, set: v => { st.logN = v; draw(); }, fmt: v => { const n = 10 ** v; return n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : `${Math.round(n / 1e6)}M`; } },
      { type: 'toggle', label: 'Count a year of serving', short: 'serving', get: () => st.serve, set: v => { st.serve = v; draw(); } },
      { type: 'buttons', label: 'Judge by', options: ['Per word and exact match', 'Exact match only'], get: () => st.metric, act: i => { st.metric = i; draw(); } },
    ];
    const readouts = [
      { label: 'Tokens per parameter', get: () => ({ v: R.tpp >= 10 ? String(Math.round(R.tpp)) : R.tpp.toFixed(1), sub: `lowest loss at about ${Math.round(R.btpp)}`, good: R.tpp >= R.btpp / 2 && R.tpp <= R.btpp * 2, bad: R.tpp < 5 }) },
      { label: 'Predicted loss', get: () => ({ v: R.L.toFixed(3), sub: `best for this budget ${R.bl.toFixed(3)}`, good: R.L - R.bl < 0.02, bad: R.L - R.bl > 0.08 }) },
      { label: 'Serving share', get: () => ({ v: st.serve ? `${Math.round(R.serveShare * 100)}%` : '–', sub: 'of total compute', bad: st.serve && R.serveShare > 0.6 }) },
    ];
    const labels = [
      { name: 'curve', t: 'Loss for this budget', d: 'Gold ball: your choice', icon: 'scale', atV: V(LX - LW / 2 - 0.1, 1.1, -0.5) },
      { name: 'buys', t: 'Smooth or sudden', d: 'Same model, two scores', icon: 'target', atV: V(RX + RW / 2 + 0.05, 1.1, -0.5) },
    ];
    const reset = () => { Object.assign(st, { budget: 1, logN: 9.7, serve: false, metric: 0 }); draw(); };
    const breaks = [
      { label: 'Too big for the budget', hint: '100B parameters', on: () => { reset(); st.logN = 11; draw(); }, off: reset },
      { label: 'Exact match only', hint: 'Compare budgets', on: () => { reset(); st.metric = 1; st.budget = 0; st.logN = 9.1; draw(); }, off: reset },
      { label: 'Ignore serving', hint: 'Billions of answers', on: () => { reset(); st.serve = true; draw(); }, off: reset },
    ];
    function status() {
      const tpp = R.tpp >= 10 ? Math.round(R.tpp) : R.tpp.toFixed(1);
      if (R.tpp < 5) return { ok: false, msg: `<b>A big model that barely saw any data.</b> With ${(R.N / 1e9).toFixed(0)} billion parameters, this budget buys only ${tpp} training tokens per parameter, so the model is undertrained: loss ${R.L.toFixed(3)} against ${R.bl.toFixed(3)} at about ${(10 ** R.best / 1e9).toFixed(1)} billion parameters with about ${Math.round(R.btpp)} tokens each. For a fixed budget, size and data trade off.` };
      if (st.metric === 1) return { ok: false, msg: `<b>A smooth gain dressed up as a leap.</b> Exact match needs all 10 words right, so it multiplies the per-word rate ten times over: ${Math.round(R.pw * 100)}% per word gives only ${Math.round(R.em * 100)}% exact. Raise the budget and per-word success creeps up a few points, while exact match seems to jump. Abilities that "emerge" are often this; plan with smooth measures like loss.` };
      if (st.serve && R.serveShare > 0.6) return { ok: false, msg: `<b>Serving costs ${Math.round(R.serveShare * 100)}% of the compute.</b> The service will answer about 3 trillion tokens a year, and every token costs twice the parameter count. At the training-optimal size, a year of serving dwarfs training. Move the slider left: a smaller model trained on far more tokens per parameter loses a little loss and saves most of the serving bill.` };
      return { ok: true, msg: `<b>${(R.N / 1e9).toFixed(1)}B parameters, ${tpp} tokens each, loss ${R.L.toFixed(3)}.</b> ${R.L - R.bl < 0.02 ? 'Close to the lowest loss this budget can buy.' : `The lowest loss here, ${R.bl.toFixed(3)}, is at about ${(10 ** R.best / 1e9).toFixed(1)}B.`}${st.serve ? ` With serving counted, this smaller, longer-trained model keeps serving to ${Math.round(R.serveShare * 100)}% of the total.` : ''}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A fixed budget', home: true, say: 'A lab in Nairobi has a fixed amount of compute to train a Swahili and English model. How big should the model be?', act: m => m.set({ budget: 1, logN: 9.7, serve: false, metric: 0 }) },
    { t: 'Size against data', home: true, say: 'Compute is roughly six times parameters times tokens. Every extra parameter means fewer tokens to train on.', act: m => m.set({}) },
    { t: 'Too big', home: true, say: 'A hundred-billion-parameter model on this budget sees too little data. The loss is worse than a smaller model trained longer.', act: m => m.set({ logN: 11 }) },
    { t: 'About twenty', home: true, say: 'The lowest loss sits at tens of tokens per parameter. The usual rule of thumb is about twenty.', act: m => m.set({ logN: 9.7 }) },
    { t: 'Serving counts', home: true, say: 'But the model will answer billions of questions. Count a year of serving, and smaller models trained longer win.', act: m => m.set({ serve: true }) },
    { t: 'Sudden or smooth', home: true, say: 'Judge only by exact match over ten words, and a smooth improvement looks like a sudden new ability.', act: m => m.set({ serve: false, budget: 0, logN: 9.1, metric: 1 }) },
  ],
  check: [
    { q: 'For a fixed compute budget, what happens if the model is too large?', options: ['It trains on too few tokens and its loss is worse', 'Its loss is always better', 'It cannot be trained'], answer: 0, why: 'Size and data trade off.' },
    { q: 'What is the usual rule of thumb for compute-optimal training?', options: ['About 20 tokens per parameter', 'About 1 token per parameter', 'About a million tokens per parameter'], answer: 0, why: 'The Chinchilla result; the exact best ratio drifts with budget and fit.' },
    { q: 'Why are popular models often trained far beyond 20 tokens per parameter?', options: ['Smaller models are cheaper to serve for billions of answers', 'More tokens are free', 'It reduces training time'], answer: 0, why: 'Serving is paid for every answer.' },
  ],
  terms: [
    ['Scaling law', 'A formula predicting loss from parameters and data.'],
    ['Compute budget', 'Total training work, about 6 × parameters × tokens.'],
    ['Compute-optimal', 'The size and data split with the lowest loss for a budget.'],
    ['Irreducible loss', 'The floor no amount of scale removes.'],
    ['Over-training', 'Training past the compute-optimal point to get a smaller model.'],
    ['Emergence', 'An ability seeming to appear suddenly at some scale.'],
  ],
  deeper: '<p><b>Data is the limit.</b> For many African languages there is not enough text to train even a small model at 20 tokens per parameter. Data collection, quality filtering and sharing across related languages matter more than model size.</p><p><b>Curves move.</b> Cleaner data, mixture-of-experts and post-training shift the curves; scaling laws are fitted per setup, then used to plan before spending the budget.</p><p><b>About this machine.</b> Loss uses the published Chinchilla fit; per-word success is an illustrative mapping from loss, and serving assumes 3 trillion tokens a year at twice the parameter count per token.</p>',
  code: {
    title: 'Chinchilla: best size for a budget',
    note: 'Adapted from the course\'s scaling laws lesson.',
    text: `
import numpy as np

def loss(N, D, A=406.4, B=410.7, a=0.34, b=0.28, E=1.69):
    return A / N**a + B / D**b + E

def best_size(C):
    Ns = np.logspace(8, 11.5, 400)
    Ds = C / (6 * Ns)                       # compute = 6 * params * tokens
    L = loss(Ns, Ds)
    i = L.argmin()
    return Ns[i], Ds[i] / Ns[i], L[i]       # size, tokens per param, loss

print(best_size(1e22))
`,
  },
};
