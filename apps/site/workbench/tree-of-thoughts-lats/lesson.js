// Tree of Thoughts and LATS on the Game of 24: four numbers, + − × ÷, make 24. A thought combines two numbers; three thoughts reach one number.
// Chain: one greedy path. ToT: breadth-first with a beam, each candidate scored by an evaluator. MCTS (the search inside LATS): select by UCT,
// expand, roll out, back up the reward. Evaluators: "sure / impossible" from an exact check of whether the remaining numbers can still make 24,
// or a noisy one that likes numbers close to 24. Everything is computed live; "tokens" counts proposals × 40 + evaluations × 20.
const EPS = 1e-6;
function kids(s) {
  const out = [];
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
    const a = s[i], b = s[j], rest = s.filter((_, k) => k !== i && k !== j), add = (v, t) => out.push({ s: [...rest, v].sort((x, y) => x - y), t });
    add(a + b, `${fmt(a)} + ${fmt(b)}`); add(a * b, `${fmt(a)} × ${fmt(b)}`); add(a - b, `${fmt(a)} − ${fmt(b)}`); add(b - a, `${fmt(b)} − ${fmt(a)}`);
    if (Math.abs(b) > EPS) add(a / b, `${fmt(a)} ÷ ${fmt(b)}`); if (Math.abs(a) > EPS) add(b / a, `${fmt(b)} ÷ ${fmt(a)}`);
  }
  return out;
}
function fmt(x) { return Math.abs(x - Math.round(x)) < EPS ? String(Math.round(x)) : (Math.round(x * 100) / 100).toString(); }
const memo = new Map();
function canReach(s) { const k = s.map(x => x.toFixed(6)).join(','); if (memo.has(k)) return memo.get(k); const r = s.length === 1 ? Math.abs(s[0] - 24) < EPS : kids(s).some(c => canReach(c.s)); memo.set(k, r); return r; }
const value = (s, ev) => ev === 'exact' ? (canReach(s) ? 1 : 0) : 1 / (1 + Math.min(...s.map(x => Math.abs(x - 24))) / 4);
function tot(nums, beam, ev) {
  let frontier = [{ s: nums.slice().sort((a, b) => a - b), path: [] }], prop = 0, evals = 0; const shown = [[], [], []];
  for (let d = 0; d < 3; d++) {
    const all = []; frontier.forEach(n => kids(n.s).forEach(c => { prop++; const v = value(c.s, ev); evals++; all.push({ s: c.s, path: [...n.path, c.t], v }); }));
    all.sort((a, b) => b.v - a.v);
    const keep = all.slice(0, beam); all.forEach((n, i) => shown[d].push({ kept: i < beam, win: d === 2 && Math.abs(n.s[0] - 24) < EPS }));
    frontier = keep;
  }
  const win = frontier.find(n => Math.abs(n.s[0] - 24) < EPS);
  return { win, prop, evals, shown };
}
function mcts(nums, iters, c, ev) {
  let x = 7; const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; };
  const root = { s: nums.slice().sort((a, b) => a - b), path: [], N: 0, W: 0, ch: null, d: 0 };
  let prop = 0, evals = 0, win = null, it = 0; const shown = [[], [], []];
  for (; it < iters && !win; it++) {
    let n = root; const path = [n];
    while (n.ch && n.ch.length) { const p = n; n = n.ch.reduce((b, k) => { const u = k.N ? k.W / k.N + c * Math.sqrt(Math.log(p.N + 1) / k.N) : Infinity; return u > b.u ? { k, u } : b; }, { k: null, u: -Infinity }).k; path.push(n); }
    if (n.s.length > 1) { n.ch = kids(n.s).map(k => ({ s: k.s, path: [...n.path, k.t], N: 0, W: 0, ch: null, d: n.d + 1 })); prop += n.ch.length; n.ch.forEach(k => { k.prior = value(k.s, ev); evals++; shown[n.d].push({ kept: false, win: false, node: k }); }); n = n.ch.slice().sort((a, b) => b.prior - a.prior)[0]; path.push(n); }
    let s = n.s, sp = n.path; while (s.length > 1) { const ks = kids(s), k = ks[Math.floor(rnd() * ks.length)]; s = k.s; sp = [...sp, k.t]; }
    const r = Math.abs(s[0] - 24) < EPS ? 1 : 0; if (r) win = { s, path: sp };
    path.forEach(p => { p.N++; p.W += r * 0.5 + value(p.s, ev) * 0.5; });
  }
  shown.forEach(L => L.forEach(e => { e.kept = e.node.N > 0; e.win = !!win && e.node.path.every((t, i) => t === win.path[i]); }));
  return { win, prop, evals, shown, it };
}
const PUZ = [[4, 6, 4, 1], [3, 3, 8, 8], [1, 5, 5, 5], [4, 9, 10, 13]];

export default {
  slug: 'tree-of-thoughts-lats',
  title: 'Tree of Thoughts: search instead of one guess',
  description: 'Make 24 from four numbers. One chain of thought commits to its first step; a search tries many and keeps the promising ones.',
  overview: 'Reasoning can be framed as search. Each node is a thought, a partial step toward the answer; each thought expands into several next thoughts; an evaluator scores how promising each one is. Chain-of-thought is one path with no backtracking: if the first step is wrong, everything after it is wasted. Tree of Thoughts proposes several thoughts at each step, scores them (for example sure, likely or impossible), keeps the best few in a beam, and continues; on the Game of 24 this raised one model\'s success from 4% to 74%. LATS puts the same pieces inside Monte Carlo tree search: select a path by UCT (average value plus an exploration bonus), expand it, roll out to the end, and back the result up the path; real feedback from tools or tests feeds the value, and failures can be turned into reflections. Search multiplies cost by tens to hundreds of times, so keep it for problems where one path is demonstrably not enough and the evaluator is cheap and reliable, like unit tests or an exact target. With a noisy evaluator, search can confidently find a good-scoring wrong answer, or prune the right one.',
  keywords: ['Tree of Thoughts', 'LATS', 'Monte Carlo tree search', 'reasoning', 'AI agents', 'Game of 24', 'search'],
  orient: 'landscape',
  view: { target: [-0.2, 0.3, 0.05], dir: [0.35, 0.9, 1.3], half: 1.5, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pz: 1, m: 1, beam: 5, ev: 'exact', iters: 400, c: 1.4 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the tree: the four numbers on a root block, then one row of thought blocks per step (tall green: reached 24, middle: kept, low: pruned) */
    const tp = P.box(4.1, 0.03, 2.3, '#FFFFFF', { r: 0.03 }); tp.position.set(-0.95, 0, 0.1); S.add(tp);
    const root = P.box(0.6, 0.18, 0.28, '#fff', { r: 0.04, material: new THREE.MeshLambertMaterial({ color: SAF }) }); root.position.set(-0.95, 0.03, -0.85); S.add(root);
    const rT = S.text('', { size: 0.24, weight: 800, color: ink, face: 'cam', bg: '#FFFFFF', top: true }); rT.position.set(-0.95, 0.5, -0.85); S.add(rT);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 1200); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const winLamp = P.lamp(GOOD, { h: 0.55, r: 0.12 }); winLamp.position.set(1.25, 0, 0.9); S.add(winLamp);
    /* cost: the chain's tokens (grey) and this run's (blue) */
    const MX = 2.0, bars = ['Chain', 'This run'].map((n, i) => { const t = P.tower(0.4, 0.4, i ? '#5B8DB8' : '#B9B3A5', { size: 0.24 }); t.position.set(MX + i * 0.55, 0, -0.2); S.add(t); return t; });
    S.add(P.keep(-3.05, 2.8, 1.3, -1.05, 1.25));

    let R = null, chain = null;
    const tokens = r => r.prop * 40 + r.evals * 20;
    function draw() {
      const nums = PUZ[st.pz];
      chain = tot(nums, 1, st.ev === 'exact' ? 'noisy' : st.ev);
      R = st.m === 0 ? tot(nums, 1, st.ev) : st.m === 1 ? tot(nums, st.beam, st.ev) : mcts(nums, st.iters, st.c, st.ev);
      void (`Make 24 from ${nums.join(' ')} · ${['one chain', `tree of thoughts, beam ${st.beam}`, `tree search, ${st.iters} rollouts, c = ${st.c}`][st.m]} · ${st.ev === 'exact' ? 'exact evaluator' : 'noisy evaluator'}`);
      rT.userData.set(nums.join('  '));
      let k = 0;
      R.shown.forEach((L, d) => {
        const per = d === 0 ? 40 : 60, n = Math.min(L.length, d === 0 ? 40 : 360);
        for (let i = 0; i < n; i++) { const e = L[i], cx = i % per, rz = Math.floor(i / per); dummy.position.set(-2.85 + 0.06 + cx * (3.75 / per), 0.03, -0.45 + d * 0.62 + rz * 0.1); dummy.scale.set(3.75 / per * 0.8, e.win ? 0.4 : e.kept ? 0.16 : 0.04, 0.08); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(e.win ? SAF : e.kept ? GOOD : '#D9D4C7')); k++; }
      });
      for (; k < 1200; k++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      winLamp.userData.set({ color: R.win ? GOOD : RED, on: true });
      const tc = tokens(chain), tr = tokens(R), mx = Math.max(tc, tr);
      bars[0].userData.set({ h: 0.05 + 1.2 * tc / mx, cap: `${tc}` }); bars[1].userData.set({ h: 0.05 + 1.2 * tr / mx, cap: `${tr}` });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Numbers', options: PUZ.map(p => p.join(' ')), get: () => st.pz, act: i => set({ pz: i }) },
      { type: 'buttons', label: 'Method', options: ['Chain', 'Tree of thoughts', 'Tree search'], get: () => st.m, act: i => set({ m: i }) },
      { type: 'slider', label: 'Beam width', min: 1, max: 12, step: 1, get: () => st.beam, set: v => set({ beam: Math.round(v) }), fmt: v => String(Math.round(v)) },
      { type: 'buttons', label: 'Evaluator', options: ['Exact (sure / impossible)', 'Noisy (close to 24)'], get: () => st.ev === 'exact' ? 0 : 1, act: i => set({ ev: i ? 'noisy' : 'exact' }) },
      { type: 'slider', label: 'Rollouts', min: 10, max: 400, step: 10, get: () => st.iters, set: v => set({ iters: Math.round(v) }), fmt: v => String(Math.round(v)) },
      { type: 'slider', label: 'Exploration c', min: 0, max: 3, step: 0.1, get: () => st.c, set: v => set({ c: Math.round(v * 10) / 10 }), fmt: v => (Math.round(v * 10) / 10).toFixed(1) },
    ];
    const readouts = [
      { label: 'Result', get: () => ({ v: R.win ? '24' : 'none', sub: R.win ? `${R.win.path.length} steps` : 'search failed', good: !!R.win, bad: !R.win }) },
      { label: 'Thoughts', get: () => ({ v: String(R.prop), sub: `${R.evals} scored` }) },
      { label: 'Tokens', get: () => ({ v: `≈${tokens(R)}`, sub: `${Math.round(tokens(R) / tokens(chain))}× a chain` }) },
    ];
    const labels = [
      { name: 'root', t: 'The four numbers', d: 'Each step combines two. Rows below: every thought tried at steps 1, 2 and 3; tall green reached 24, middle kept, low pruned', icon: 'layers', atV: V(-1.3, 0.1, -0.85) },
      { name: 'cost', t: 'The price of search', d: 'Tokens: a single chain (grey) against this run (blue). The lamp in front turns green when the search reaches 24', icon: 'chart', atV: V(MX + 0.8, 0.05, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Think in one chain', hint: 'no backtracking', on: () => set({ ...D0, m: 0, ev: 'noisy' }), off: reset },
      { label: 'Trust a noisy evaluator', hint: 'close to 24 looks good', on: () => set({ ...D0, ev: 'noisy', beam: 3 }), off: reset },
      { label: 'Stop exploring', hint: 'UCT with c = 0, few rollouts', on: () => set({ ...D0, m: 2, c: 0, iters: 15, ev: 'noisy' }), off: reset },
    ];
    function status() {
      const nums = PUZ[st.pz].join(' ');
      if (st.m === 0 && !R.win) return { ok: false, msg: `<b>One chain commits to its best-looking first step for ${nums} and ends at ${R.shown[2].length ? 'a number that isn\'t 24' : 'a dead end'}.</b> Chain-of-thought can't back up: if step one is wrong, steps two and three are wasted. Propose several thoughts per step and keep the promising ones.` };
      if (st.m === 2 && st.c === 0 && !R.win) return { ok: false, msg: `<b>With no exploration bonus, the tree search keeps revisiting its first favourite branch and finds nothing in ${R.it} rollouts.</b> UCT adds c · √(ln N / n) so that rarely tried branches get a turn. Set c above zero and give it enough rollouts.` };
      if (st.ev === 'noisy' && !R.win) return { ok: false, msg: `<b>The noisy evaluator likes numbers near 24, so the search keeps those and prunes the branches that actually lead to 24.</b> For ${nums}, the winning path goes through numbers that look far from 24. A search is only as good as its value function; with a noisy one it confidently explores the wrong places. Use a reliable check (here: can the remaining numbers still make 24?) or real feedback such as tests.` };
      if (!R.win) return { ok: false, msg: `<b>No 24 found for ${nums} with this budget.</b> Widen the beam or add rollouts.` };
      return { ok: true, msg: `<b>${R.win.path.join(', then ')} = 24.</b> ${['One chain got lucky here.', `The tree kept the best ${st.beam} thoughts at each step and scored ${R.evals} candidates.`, `Tree search found it in ${R.it} rollouts.`][st.m]} It cost about ${Math.round(tokens(R) / tokens(chain))} times the tokens of a single chain: worth it only when one chain is not enough and the evaluator can be trusted.` };
    }
    return { update: dt => bars.forEach(b => b.userData.tick(dt)), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Make 24', home: true, say: 'Four numbers, four operations, make twenty-four. Each step of thought combines two numbers; three steps reach the answer.', act: m => m.set({ pz: 1, m: 0, beam: 5, ev: 'exact', iters: 400, c: 1.4 }) },
    { t: 'One chain', home: true, say: 'A single chain of thought picks its favourite first step and can never go back.', act: m => m.set({ m: 0, ev: 'noisy' }) },
    { t: 'A tree of thoughts', home: true, say: 'Tree of thoughts proposes many next steps, scores each one, and keeps the best few.', act: m => m.set({ m: 1, ev: 'exact' }) },
    { t: 'The score matters', home: true, say: 'Score the steps by how close they look to twenty-four, and the search throws away the path that works.', act: m => m.set({ ev: 'noisy', beam: 3 }) },
    { t: 'Search with rollouts', home: true, say: 'Tree search tries a path to the end, then spends more effort where the endings looked good. That is the engine inside LATS.', act: m => m.set({ m: 2, ev: 'exact', beam: 5 }) },
    { t: 'The price', home: true, say: 'Search costs many times the tokens of one chain. Use it when one chain is not enough and the scoring can be trusted.', act: m => m.set({ m: 1 }) },
  ],
  check: [
    { q: 'Why does chain-of-thought fail on many Game of 24 puzzles?', options: ['It commits to its first step and cannot backtrack', 'It cannot do division', 'It uses too many tokens'], answer: 0, why: 'A wrong first step wastes the rest.', hint: 'Try Think in one chain.' },
    { q: 'What happens to a tree search with a noisy evaluator?', options: ['It can prune the right branch and keep good-looking wrong ones', 'Nothing changes', 'It becomes faster and right'], answer: 0, why: 'Search is only as good as its value function.', hint: 'Try Trust a noisy evaluator.' },
    { q: 'What does the c in UCT control?', options: ['How much to explore rarely tried branches', 'The number of children', 'The final answer'], answer: 0, why: 'Value plus c · √(ln N / n).', hint: 'Try Stop exploring.' },
  ],
  terms: [
    ['Thought', 'One intermediate step toward an answer.'],
    ['Evaluator', 'What scores how promising a thought is.'],
    ['Beam', 'How many thoughts are kept at each step.'],
    ['MCTS', 'Monte Carlo tree search: select, expand, roll out, back up.'],
    ['UCT', 'Average value plus an exploration bonus.'],
    ['LATS', 'Tree search where a model proposes, scores and reflects.'],
  ],
  deeper: '<p><b>Where search ships.</b> Coding agents that use tests as the value, deep-research agents that explore several query paths, and planning-heavy subgraphs. Most production agents run one trajectory with tool-checked verification instead.</p><p><b>LATS in full.</b> The model is the policy (propose actions), the value function (score partial paths) and the reflector (turn failures into notes that seed new rollouts), with tool observations mixed into the value.</p><p><b>About this machine.</b> The puzzles are solved live: every thought, score and rollout is computed here, and the token figure assumes 40 tokens per proposal and 20 per score.</p>',
  code: {
    title: 'Beam search over thoughts',
    note: 'Adapted from the course\'s Tree of Thoughts lesson.',
    text: `
from itertools import combinations

def children(nums):
    for (i, a), (j, b) in combinations(enumerate(nums), 2):
        rest = [x for k, x in enumerate(nums) if k not in (i, j)]
        for v in {a + b, a * b, a - b, b - a} | ({a / b} if b else set()) | ({b / a} if a else set()):
            yield sorted(rest + [v])

def can_reach(nums):                         # an exact "sure / impossible" evaluator
    if len(nums) == 1:
        return abs(nums[0] - 24) < 1e-6
    return any(can_reach(c) for c in children(nums))

def tree_of_thoughts(nums, beam=5, score=can_reach):
    frontier = [sorted(nums)]
    for _ in range(3):
        cands = [c for s in frontier for c in children(s)]
        frontier = sorted(cands, key=score, reverse=True)[:beam]
    return [s for s in frontier if abs(s[0] - 24) < 1e-6]
`,
  },
};
