// Evolutionary coding (phase 15, lesson 3): an AlphaEvolve-style loop evolves a program that predicts a Kampala mini-grid's demand by hour.
// Each generation the generator proposes edits (add a polynomial term, or add a daily harmonic); every variant is fitted, scored by the evaluator
// and stored in an archive keyed by family and size. The evaluator decides what wins: held-out hours, training hours only, speed only, or nothing
// but the generator's own claim. Least-squares fits and errors are computed live.
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const noise = h => ((Math.sin(h * 12.9898) * 43758.5453) % 1) * 10 - 5;
const demand = h => 30 + 25 * Math.exp(-(((h - 7) / 2) ** 2)) + 40 * Math.exp(-(((h - 20) / 2.5) ** 2)) + 12 * Math.exp(-(((h + 4) / 2.5) ** 2)) + noise(h);
const HELD = [0, 4, 7, 11, 15, 19, 23];
const TRAIN = HOURS.filter(h => !HELD.includes(h));
const W = 2 * Math.PI / 24;
const basis = (fam, k, h) => {
  if (fam === 'const') return [];
  const t = (h - 11.5) / 11.5;
  if (fam === 'poly') return [1, ...Array.from({ length: k }, (_, i) => t ** (i + 1))];
  return [1, ...Array.from({ length: k }, (_, i) => [Math.sin((i + 1) * W * h), Math.cos((i + 1) * W * h)]).flat()];
};
function solve(A, b) {
  const n = A.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
function fit(fam, k) {
  if (fam === 'const') return { fam, k: 0, w: [], f: () => 0 };
  const X = TRAIN.map(h => basis(fam, k, h)), y = TRAIN.map(demand), p = X[0].length;
  const A = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) + (i === j ? 1e-6 : 0)));
  const b = Array.from({ length: p }, (_, i) => X.reduce((s, r, n) => s + r[i] * y[n], 0));
  const w = solve(A, b);
  return { fam, k, w, f: h => basis(fam, k, h).reduce((s, v, i) => s + v * w[i], 0) };
}
const rmse = (P, hs) => Math.sqrt(hs.reduce((s, h) => s + (P.f(h) - demand(h)) ** 2, 0) / hs.length);
const name = P => P.fam === 'const' ? 'empty program' : P.fam === 'poly' ? `${P.k}-term polynomial` : `${P.k}-harmonic program`;
const ARCH = [{ fam: 'const', k: 0 }, ...Array.from({ length: 10 }, (_, i) => ({ fam: 'poly', k: i + 1 })), ...Array.from({ length: 4 }, (_, i) => ({ fam: 'harm', k: i + 1 }))].map(c => { const P = fit(c.fam, c.k); return { ...P, train: rmse(P, TRAIN), held: rmse(P, HELD), size: P.w.length }; });
function evolve(o) {
  const pool = ARCH.filter(c => c.fam === 'const' ? o.ev === 'speed' : c.fam === 'poly' ? c.k <= o.gen : c.k <= Math.ceil(o.gen / 2));
  const sig = { held: c => c.held, train: c => c.train, speed: c => c.size, claim: c => -(c.size + (c.fam === 'poly' ? 0.5 : 0)) }[o.ev];
  const champ = pool.slice().sort((a, b) => sig(a) - sig(b) || a.size - b.size)[0];
  return { pool, champ };
}

export default {
  slug: 'alphaevolve-evolutionary-coding',
  title: 'Evolving code: the evaluator decides',
  description: 'An evolving program predicts a Kampala mini-grid\'s demand hour by hour. The evaluator decides what wins: watch what each kind of evaluator rewards.',
  overview: 'Language models can write plausible code that doesn\'t do what it claims; evolutionary search over raw code rarely even compiles. AlphaEvolve (DeepMind, 2025) combines them: a model proposes targeted edits to programs in a database, an automatic evaluator scores every variant, and high scorers become parents for the next generation, for hours or weeks. The model handles writing plausible code; the evaluator catches what it gets wrong. Its reported wins (a 4×4 complex matrix multiplication in 48 scalar multiplications, a scheduling heuristic for a production cluster, faster attention kernels) all came where the evaluator is fast, deterministic and hard to game: an exact test, a simulator replaying real load, a benchmark on real hardware. The database is structured, a MAP-Elites grid or islands, so the loop keeps diverse solutions instead of only chasing the leader. The other face of this is reward hacking: evolution optimises whatever the evaluator measures, and finds its flaws. A loop rewarded for speed alone submits an empty program; one scored on the training data memorises it; a "code quality" proxy rewards renamed variables. The defence is an evaluator the generator has never seen, with fresh inputs, and human review before anything ships. FunSearch, AI Scientist and the Darwin Gödel Machine are the same recipe, generator plus evaluator in a loop; they differ in what the evaluator grades and how rigorous it is.',
  keywords: ['AlphaEvolve', 'evolutionary algorithms', 'program search', 'reward hacking', 'overfitting', 'MAP-Elites', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, -0.15], dir: [0.05, 0.8, 1.2], half: 1.25, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { gen: 10, ev: 'held' }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const HX = h => -2.85 + h * 0.15, HY = d => 0.1 + Math.max(-0.02, Math.min(1.5, d / 80 * 1.1)), CZ = -0.7;
    const back = P.box(3.7, 1.35, 0.04, '#FBF8F1', { r: 0.02 }); back.position.set(-1.12, 0, CZ - 0.08); S.add(back);
    HOURS.forEach(h => { const held = HELD.includes(h), b = P.ball(0.04, held ? SAF : GOOD); b.position.set(HX(h), HY(demand(h)), CZ); S.add(b); });
    let tube = null;
    const ARX = k => 0.92 + k * 0.215;
    const rowsT = [['poly', 'polynomial terms 1 to 10', -0.75], ['harm', 'daily harmonics 1 to 4', -0.25], ['const', 'empty program', 0.25]];
    const cells = ARCH.map(c => {
      const row = rowsT.find(r => r[0] === c.fam), m = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.19, 0.08, 0.3, '#fff', { r: 0.02, material: m });
      b.position.set(ARX(c.fam === 'const' ? 0 : c.k - 1), 0, row[2]); S.add(b); return { c, m, b };
    });
    const EVN = { held: 'error on held-out hours, drawn fresh', train: 'error on training hours only', speed: 'speed only: fewer operations wins', claim: 'no evaluator: the model\'s own claim' };

    /* the evaluator (a robot whose lamp is green only when it scores held-out hours), and the champion's held-out error as a column */
    const judge = P.robot('#2C2D31', { scale: 0.7 }); judge.position.set(0.25, 0, 0.35); S.add(judge);
    const err = P.tower(0.35, 0.35, GOOD, { h: 0.3 }); err.userData.set({ cap: '' }); err.position.set(-0.35, 0, 0.35); S.add(err);
    S.add(P.keep(-3.0, 3.05, 1.5, -0.85, 0.8));
    let R = null;
    function draw() {
      R = evolve(st);
      const C = R.champ;
      if (tube) tube.parent.remove(tube);
      const pts = []; for (let i = 0; i <= 92; i++) { const h = i / 4; pts.push(V(HX(h), HY(C.f(h)), CZ)); }
      tube = P.tube(pts, 0.014, C.held < 8 ? ink : RED); tube.userData.noFit = true; S.add(tube);
      const best = Math.min(...ARCH.map(c => c.held));
      cells.forEach(({ c, m, b }) => {
        const inPool = R.pool.includes(c), q = Math.min(1, (c.held - best) / 25);
        b.visible = inPool || c.fam !== 'const';
        m.color.set(!inPool ? '#E4DED1' : c === C ? SAF : new THREE.Color(GOOD).lerp(new THREE.Color(BAD), q).getStyle());
        b.scale.y = c === C ? 2.2 : 1;
      });
      judge.userData.set({ lamp: st.ev === 'held' ? GOOD : RED, busy: st.ev !== 'claim' });
      err.userData.set({ h: Math.min(1.2, C.held / 20), color: C.held < 8 ? GOOD : BAD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const EVS = ['held', 'train', 'speed', 'claim'];
    const controls = [
      { type: 'slider', label: 'Generations', min: 1, max: 10, step: 1, get: () => st.gen, set: v => set({ gen: Math.round(v) }) },
      { type: 'buttons', label: 'Evaluator scores', options: ['Held-out hours', 'Training only', 'Speed only', 'Model\'s claim'], get: () => EVS.indexOf(st.ev), act: i => set({ ev: EVS[i] }) },
    ];
    const readouts = [
      { label: 'Champion', get: () => ({ v: R.champ.fam === 'const' ? 'empty' : R.champ.fam === 'poly' ? `poly ${R.champ.k}` : `${R.champ.k} harm.`, sub: `generation ${st.gen}` }) },
      { label: 'Training error', get: () => ({ v: `${R.champ.train.toFixed(1)} kW`, sub: 'hours it saw', good: R.champ.train < 6 }) },
      { label: 'Held-out error', get: () => ({ v: `${R.champ.held.toFixed(1)} kW`, sub: 'hours it never saw', good: R.champ.held < 8, bad: R.champ.held >= 8 }) },
    ];
    const labels = [
      { name: 'curve', t: 'The champion program', d: 'Its line over 24 hours. Teal: training hours, orange: held out', icon: 'wave', atV: V(-2.98, 0.6, -0.7) },
      { name: 'judge', t: 'The evaluator', d: 'Green: scores hours it never saw', icon: 'check', atV: V(0.05, 0.25, 0.47) },
      { name: 'arch', t: 'The archive', d: 'Rows: polynomial, harmonic, empty. Gold: champion', icon: 'box', atV: V(2.9, 0.25, 0.47) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Score on training hours only', hint: 'it memorises', on: () => set({ ...D0, ev: 'train' }), off: reset },
      { label: 'Reward speed alone', hint: 'an empty program wins', on: () => set({ ...D0, ev: 'speed' }), off: reset },
      { label: 'Trust the model\'s own claim', hint: 'no evaluator', on: () => set({ ...D0, ev: 'claim' }), off: reset },
    ];
    function status() {
      const C = R.champ;
      if (st.ev === 'train') return { ok: false, msg: `<b>Scored on the training hours alone, the loop picks the ${name(C)}: ${C.train.toFixed(1)} kW error on hours it saw, ${C.held.toFixed(1)} kW on hours it didn\'t.</b> It bends through the training points and swings wildly between them. Evolution optimises exactly what the evaluator measures; score on held-out hours the generator has never seen.` };
      if (st.ev === 'speed') return { ok: false, msg: `<b>Rewarded for speed alone, the winner is "return 0": no operations at all, and ${C.held.toFixed(1)} kW wrong on every hour.</b> That is reward hacking. The loop found the flaw in the evaluator, as it always will. Speed can only count after correctness is checked.` };
      if (st.ev === 'claim') return { ok: false, msg: `<b>With no evaluator, the model picks its most elaborate edit and claims it fits "within 1 kW". It is ${C.held.toFixed(1)} kW off on new hours.</b> The generator writes plausible code and confident claims; only an evaluator turns them into evidence.` };
      return { ok: true, msg: `<b>Scored on held-out hours, generation ${st.gen}\'s champion is the ${name(C)}: ${C.train.toFixed(1)} kW error on training hours and ${C.held.toFixed(1)} kW on hours it never saw.</b> It holds up on new hours because the evaluator rewarded predicting new hours, not memorising old ones, with inputs the generator never saw.` };
    }
    return { update: dt => { judge.userData.tick(dt); err.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Generator and evaluator', home: true, say: 'A model proposes small edits to a program that predicts a mini-grid\'s demand in Kampala. An evaluator scores every variant.', act: m => m.set({ gen: 1, ev: 'held' }) },
    { t: 'Generations', home: true, say: 'Each generation adds a term or a daily rhythm. The best of each kind is kept in an archive, so the search stays diverse.', act: m => m.set({ gen: 5, ev: 'held' }) },
    { t: 'Held-out hours', home: true, say: 'Scored on hours it has never seen, the loop keeps the program that predicts new hours best.', act: m => m.set({ gen: 10, ev: 'held' }) },
    { t: 'Training only', home: true, say: 'Score on the training hours alone and it memorises them, swinging wildly in between.', act: m => m.set({ gen: 10, ev: 'train' }) },
    { t: 'Reward hacking', home: true, say: 'Reward speed alone and an empty program wins. The loop finds whatever flaw the evaluator has.', act: m => m.set({ gen: 10, ev: 'speed' }) },
    { t: 'The evaluator decides', home: true, say: 'These loops win only where the evaluator is fast, exact and hard to game. Then a person still reviews before it ships.', act: m => m.set({ gen: 10, ev: 'held' }) },
  ],
  check: [
    { q: 'Why did the loop pick an empty program?', options: ['The evaluator rewarded speed alone', 'It was the most accurate', 'The model refused'], answer: 0, why: 'Evolution optimises what is measured.', hint: 'Try Reward speed alone.' },
    { q: 'What stops the loop memorising the training data?', options: ['Scoring on held-out inputs it has never seen', 'More generations', 'A bigger model'], answer: 0, why: 'Fresh inputs expose memorising.', hint: 'Try Score on training hours only.' },
    { q: 'Where do generator-plus-evaluator loops work best?', options: ['Where the evaluator is fast, exact and hard to game', 'Anywhere code is written', 'Where the model is confident'], answer: 0, why: 'The wins came from checkable domains.', hint: 'Read the overview.' },
  ],
  terms: [
    ['AlphaEvolve', 'A model proposes code edits; an evaluator scores them; the best become parents.'],
    ['Evaluator', 'The automatic check that scores every variant.'],
    ['Reward hacking', 'The loop optimises a flaw in the evaluator instead of the intent.'],
    ['Held-out set', 'Inputs the generator never saw, used for scoring.'],
    ['MAP-Elites', 'An archive keeping the best solution for each kind and size.'],
    ['Overfitting', 'Fitting the training data so closely it fails on new data.'],
  ],
  deeper: '<p><b>Why model plus search.</b> Random mutation of a large file almost always breaks the syntax; a model proposes plausible, local edits, which wastes far fewer evaluator calls. The evaluator in turn settles claims the model can\'t be trusted on, like how fast a function really is.</p><p><b>Same recipe, different rigour.</b> FunSearch scored maths constructions exactly; AI Scientist uses model critique and experiments; the Darwin Gödel Machine scores agent code on coding benchmarks.</p><p><b>About this machine.</b> The demand curve and its noise are made up; every variant is a least-squares fit computed live, and the "generator" proposes edits in a fixed order rather than with a model.</p>',
  code: {
    title: 'The loop, and its evaluator',
    note: 'Adapted from the course\'s AlphaEvolve sketch (code/main.py).',
    text: `
def run_loop(seed, generations, train_xs, test_xs, use_holdout=True):
    archive = {cell_key(seed): seed}            # MAP-Elites: best per cell
    for gen in range(generations):
        parent = sample_parent(archive)
        child = propose_edit(parent)            # the model's job
        child.train = mse(child, train_xs)
        child.test = mse(child, test_xs)        # inputs it never saw
        signal = child.test if use_holdout else child.train
        key = cell_key(child)
        if key not in archive or signal < archive[key].signal:
            child.signal = signal
            archive[key] = child
    return min(archive.values(), key=lambda c: c.signal)
`,
  },
};
