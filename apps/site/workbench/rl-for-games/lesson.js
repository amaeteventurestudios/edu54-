// RL for games: a game studio in Kumasi trains an Oware player. Monte Carlo tree search (PUCT) chooses moves by simulating ahead, scoring new positions with random
// play-outs or a value function (a hand-made stand-in for a trained network: captured seeds plus seeds on your side). Simplified Oware rules (sow anticlockwise,
// skip the starting pit on a lap, capture 2s and 3s backwards on the opponent's side; no feeding or grand-slam rules). Search runs for real on 12 seeded positions and
// is checked against a six-ply minimax look-ahead. A GRPO panel shows group-relative advantages computed for real for a group of 8 answers to one maths problem.
// Break it: 8 simulations, no exploration bonus, GRPO on problems far too hard (all answers wrong, every advantage zero).
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const own = (p, i) => (p === 0 ? i < 6 : i >= 6);
function moves(st) { const o = st.p * 6, m = []; for (let i = o; i < o + 6; i++) if (st.b[i] > 0) m.push(i); return m; }
function play(st, i) { const b = st.b.slice(), s = st.s.slice(); let n = b[i], j = i; b[i] = 0; while (n > 0) { j = (j + 1) % 12; if (j === i) continue; b[j]++; n--; }
  while (!own(st.p, j) && (b[j] === 2 || b[j] === 3)) { s[st.p] += b[j]; b[j] = 0; j = (j + 11) % 12; } return { b, s, p: 1 - st.p }; }
const over = st => st.s[0] > 24 || st.s[1] > 24 || moves(st).length === 0;
function final(st) { const s = st.s.slice(); if (moves(st).length === 0) for (let i = 0; i < 12; i++) s[i < 6 ? 0 : 1] += st.b[i]; return s; }
const side = (st, p) => { let t = 0; for (let i = p * 6; i < p * 6 + 6; i++) t += st.b[i]; return t; };
const heur = (st, p) => Math.tanh(((st.s[p] - st.s[1 - p]) + 0.15 * (side(st, p) - side(st, 1 - p))) / 4);
function rollout(st, r, p) { let x = st; for (let k = 0; k < 40 && !over(x); k++) { const m = moves(x); x = play(x, m[Math.floor(r() * m.length)]); } const f = over(x) ? final(x) : x.s; return Math.sign(f[p] - f[1 - p]); }
function mcts(root, sims, c, net, r) { const N = new Map(), W = new Map(), key = st => `${st.b.join(',')}|${st.s.join(',')}|${st.p}`;
  function sim(st) { if (over(st)) { const f = final(st); return Math.sign(f[st.p] - f[1 - st.p]); }
    const k = key(st), ms = moves(st); if (!N.has(k)) { N.set(k, ms.map(() => 0)); W.set(k, ms.map(() => 0)); return net ? heur(st, st.p) : rollout(st, r, st.p); }
    const n = N.get(k), w = W.get(k), tot = n.reduce((a, b) => a + b, 0); let best = 0, bv = -1e9;
    ms.forEach((m, i) => { const u = (n[i] ? w[i] / n[i] : 0) + c * Math.sqrt(tot + 1) / (1 + n[i]); if (u > bv) { bv = u; best = i; } });
    const v = -sim(play(st, ms[best])); n[best]++; w[best] += v; return v; }
  for (let i = 0; i < sims; i++) sim(root); return { ms: moves(root), n: N.get(key(root)) }; }
function minimax(st, d, p) { if (over(st)) { const f = final(st); return (f[p] - f[1 - p]) * 10; } if (d === 0) return st.s[p] - st.s[1 - p];
  const v = moves(st).map(m => minimax(play(st, m), d - 1, p)); return st.p === p ? Math.max(...v) : Math.min(...v); }
let POS = null;
function positions() { if (POS) return POS; const r0 = rng(3); POS = [];
  while (POS.length < 12) { let x = { b: Array(12).fill(4), s: [0, 0], p: 0 }; const k = 10 + Math.floor(r0() * 30); for (let i = 0; i < k && !over(x); i++) { const m = moves(x); x = play(x, m[Math.floor(r0() * m.length)]); }
    if (!over(x) && x.p === 0 && moves(x).length >= 3) { const vals = moves(x).map(m => minimax(play(x, m), 5, 0)); if (Math.max(...vals) - Math.min(...vals) >= 2) POS.push({ x, vals }); } }
  return POS; }
const SIMS = [8, 64, 512];
function search(st) { const r = rng(5), P = positions(); let ok = 0; const res = P.map(({ x, vals }) => { const o = mcts(x, SIMS[st.sims], st.c ? 1.4 : 0, st.net, r), ch = o.n.indexOf(Math.max(...o.n)), good = vals[ch] === Math.max(...vals); if (good) ok++; return { ...o, ch, good, vals }; }); return { ok, res }; }
const GROUPS = { right: [1, 0, 1, 1, 0, 0, 1, 0], hard: [0, 0, 0, 0, 0, 0, 0, 0], easy: [1, 1, 1, 1, 1, 1, 1, 1] };
function grpo(level) { const r = GROUPS[level], m = r.reduce((a, b) => a + b, 0) / r.length, sd = Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / r.length); return { r, A: r.map(x => (sd > 0 ? (x - m) / sd : 0)) }; }

export default {
  slug: 'rl-for-games',
  title: 'Games: search, self-play, reasoning',
  description: 'A game studio in Kumasi trains an Oware player. Tree search looks ahead before each move, guided by a value estimate: the AlphaZero recipe, on an African board.',
  overview: 'AlphaZero mastered chess, shogi and Go with one recipe and no human examples. A network takes a position and outputs move probabilities and a value, the expected result. Before each move, Monte Carlo tree search runs many simulations: from the root it repeatedly picks the child with the best mix of average value and an exploration bonus that favours moves tried less often (the PUCT rule), expands a new position, scores it with the value network, and backs the score up the path. The most-visited move is played, and the visit counts become the training target for the policy, while the final result trains the value: self-play feeds better search, which feeds a better network. More simulations look further; without the exploration bonus the search commits to whatever looked good first. Older search scored new positions with random play-outs, which are noisy; a learned value is far sharper. MuZero learns the rules too, searching inside a learned model. And GRPO carries the loop to language models: sample a group of answers to a problem, check each with a verifier, and push up answers that scored above the group average, with no critic. A group that is all wrong, or all right, gives no signal, so problems must be at the right level.',
  keywords: ['alphazero', 'monte carlo tree search', 'puct', 'self-play', 'muzero', 'grpo'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.15, 1.08], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { sims: 2, c: true, net: true, level: 'right' };
    const ink = '#151827';
    /* the Oware board */
    const CX = i => (i < 6 ? -2.35 + i * 0.4 : -2.35 + (11 - i) * 0.4), CZ = i => (i < 6 ? 0.1 : -0.42);
    const plank = P.box(2.75, 0.14, 1.05, '#7A4A26', { r: 0.1 }); plank.position.set(-1.35, 0.12, -0.16); floor.add(plank);
    const cups = Array.from({ length: 12 }, (_, i) => { const c = P.cyl(0.16, 0.03, '#4E2E16'); c.position.set(CX(i), 0.255, CZ(i)); floor.add(c); return c; });
    const seedGeo = new THREE.SphereGeometry(0.035, 10, 8), seeds = new THREE.InstancedMesh(seedGeo, new THREE.MeshLambertMaterial({ color: '#D9C7A0' }), 48); seeds.frustumCulled = false; seeds.userData.noFit = true; floor.add(seeds);



    /* visit bars in front of your pits */
    const bars = Array.from({ length: 6 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#6B5E86' }), b = P.box(0.22, 1, 0.16, '#fff', { r: 0.02, material: mm }); b.position.set(CX(i), 0.12, 0.6); b.userData.noFit = true; floor.add(b);
         return { b, mm, t }; });

    const keepB = P.box(2.5, 0.7, 0.3, '#000'); keepB.material = new THREE.MeshBasicMaterial({ visible: false }); keepB.position.set(-1.35, 0.12, 0.6); floor.add(keepB);
    /* GRPO panel */

    const tiles = Array.from({ length: 8 }, (_, i) => { const x = 0.95 + (i % 4) * 0.52, z = -0.6 + Math.floor(i / 4) * 0.62;
      const t = P.box(0.42, 0.04, 0.22, '#FFFFFF', { r: 0.02 }); t.position.set(x, 0.15, z); floor.add(t);
      const a = P.box(0.14, 1, 0.08, '#1F9E89', { r: 0.01 }); a.userData.noFit = true; floor.add(a);
         return { x, z, a }; });


    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null, G = null, SH = null;
    const m4 = new THREE.Matrix4();
    function show() { const P0 = positions(); let idx = P0.findIndex((_, i) => !SH || i === SH); if (idx < 0) idx = 0; const { x } = P0[idx], o = R.res[idx];
      let k = 0; for (let i = 0; i < 12; i++) { const n = x.b[i]; for (let s = 0; s < n && k < 48; s++, k++) { const a = s * 2.4, rr = 0.03 + 0.012 * s; m4.makeTranslation(CX(i) + Math.cos(a) * Math.min(0.11, rr), 0.3 + Math.floor(s / 7) * 0.05, CZ(i) + Math.sin(a) * Math.min(0.11, rr)); seeds.setMatrixAt(k, m4); }
      }
      for (; k < 48; k++) { m4.makeScale(0.0001, 0.0001, 0.0001); seeds.setMatrixAt(k, m4); } seeds.instanceMatrix.needsUpdate = true;
      const tot = o.n.reduce((a, b) => a + b, 0), bestV = Math.max(...o.vals);
      bars.forEach((b, i) => { const mi = o.ms.indexOf(i); const v = mi >= 0 ? o.n[mi] / tot : 0, h = 0.02 + v * 0.75; b.b.scale.y = h; b.mm.color.set(mi === o.ch ? (o.good ? '#1F9E89' : '#C62828') : '#9A94AE');  });
      const bi = o.ms[o.vals.indexOf(bestV)];  }
    function draw() {
      R = search(st); G = grpo(st.level);
      if (SH == null) { const lo = search({ sims: 0, c: true, net: false }).res, nc = search({ sims: 2, c: false, net: true }).res, def = st.sims === 2 && st.c && st.net ? R.res : search({ sims: 2, c: true, net: true }).res;
        SH = def.findIndex((o, i) => o.good && !lo[i].good && !nc[i].good); if (SH < 0) SH = def.findIndex((o, i) => o.good && !lo[i].good); if (SH < 0) SH = 0; }
      show();
      tiles.forEach((t, i) => { const ok = G.r[i] === 1, A = G.A[i], h = Math.max(0.005, Math.abs(A) * 0.18);
        t.a.scale.y = h; t.a.position.set(t.x + 0.27, A >= 0 ? 0.17 : 0.17, t.z); t.a.material.color.set(A > 0 ? '#1F9E89' : A < 0 ? '#C62828' : '#9A94AE');  });
      const nz = G.A.filter(a => Math.abs(a) > 1e-9).length;
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Simulations', options: ['8', '64', '512'], get: () => st.sims, act: i => { st.sims = i; draw(); } },
      { type: 'buttons', label: 'Exploration bonus', options: ['None', 'c = 1.4'], get: () => (st.c ? 1 : 0), act: i => { st.c = !!i; draw(); } },
      { type: 'buttons', label: 'New positions scored by', options: ['Random play-outs', 'Value function'], get: () => (st.net ? 1 : 0), act: i => { st.net = !!i; draw(); } },
      { type: 'buttons', label: 'GRPO problems', options: ['Right level', 'Far too hard', 'Too easy'], get: () => ['right', 'hard', 'easy'].indexOf(st.level), act: i => { st.level = ['right', 'hard', 'easy'][i]; draw(); } },
    ];
    const readouts = [
      { label: 'Best move found', get: () => ({ v: `${R.ok}/12`, sub: 'positions, against a 6-move look-ahead', good: R.ok >= 9, bad: R.ok <= 5 }) },
      { label: 'This position', get: () => { const o = R.res[SH]; return { v: o.good ? 'Best' : 'Worse', sub: `pit ${o.ch + 1} of your 6`, good: o.good, bad: !o.good }; } },
      { label: 'GRPO signal', get: () => { const nz = G.A.filter(a => Math.abs(a) > 1e-9).length; return { v: `${nz}/8`, sub: 'answers with a non-zero push', good: nz > 0, bad: nz === 0 }; } },
    ];
    const labels = [
      { name: 'board', t: 'Oware board', d: 'Bars: how often search tried each pit', icon: 'target', atV: V(-2.73, 0.27, -0.16) },
      { name: 'grpo', t: 'GRPO group', d: 'Push up above-average answers', icon: 'check', atV: V(2.3, 0.2, -0.3) },
    ];
    const reset = () => { Object.assign(st, { sims: 2, c: true, net: true, level: 'right' }); draw(); };
    const breaks = [
      { label: '8 simulations', hint: 'Barely any look-ahead', on: () => { reset(); st.sims = 0; st.net = false; draw(); }, off: reset },
      { label: 'No exploration bonus', hint: 'c = 0', on: () => { reset(); st.c = false; draw(); }, off: reset },
      { label: 'Problems far too hard', hint: 'Every answer fails', on: () => { reset(); st.level = 'hard'; draw(); }, off: reset },
    ];
    function status() {
      if (st.level === 'hard') return { ok: false, msg: `<b>Every advantage is zero.</b> All 8 answers fail the verifier, so every reward equals the group mean and GRPO has nothing to push up or down: no learning at all. ${st.level === 'hard' ? 'Problems need to be hard enough that some answers fail, easy enough that some pass.' : ''}` };
      if (st.level === 'easy') return { ok: false, msg: `<b>Every advantage is zero.</b> All 8 answers pass, so no answer is better than average and there is no signal. Problems at the edge of the model's ability teach the most.` };
      if (R.ok <= 6 && st.sims === 0) return { ok: false, msg: `<b>Best move in only ${R.ok} of 12 positions.</b> Eight simulations barely look one move ahead, and ${st.net ? 'the value function alone' : 'a handful of random play-outs'} cannot tell good moves from bad. AlphaZero ran 800 simulations a move.` };
      if (!st.c && R.ok < 9) return { ok: false, msg: `<b>Best move in only ${R.ok} of 12.</b> With no exploration bonus the search keeps revisiting whichever move scored well first, and never checks the others properly. The PUCT bonus favours moves tried less often.` };
      return { ok: true, msg: `<b>Best move in ${R.ok} of 12 positions.</b> ${SIMS[st.sims]} simulations, guided by ${st.net ? 'a value function' : 'random play-outs'} with an exploration bonus, agree with a six-move look-ahead${st.net ? '' : '; a value function sharpens it further'}. In GRPO, ${G.A.filter(a => Math.abs(a) > 1e-9).length} of 8 answers get a push.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Oware', home: true, say: 'A game studio in Kumasi trains a player for Oware, the sowing game played across West Africa.', act: m => m.set({ sims: 2, c: true, net: true, level: 'right' }) },
    { t: 'Look ahead', home: true, say: 'Before each move, tree search simulates hundreds of continuations. The bars show how often it tried each pit; it plays the most tried.', act: m => m.set({}) },
    { t: 'The same loop', home: true, say: 'Reasoning models train the same way: a group of answers, a verifier marks each, and above-average answers get pushed up.', act: m => m.set({}) },
    { t: 'Eight simulations', home: true, say: 'With eight random simulations, search barely looks ahead and often picks a worse pit.', act: m => m.set({ sims: 0, net: false }) },
    { t: 'No exploration', home: true, say: 'Remove the exploration bonus, and search fixes on the first move that looked good.', act: m => m.set({ sims: 2, net: true, c: false }) },
    { t: 'Too hard', home: true, say: 'Give the reasoning model problems it always fails, and every answer scores the same. There is nothing to learn.', act: m => m.set({ c: true, level: 'hard' }) },
  ],
  check: [
    { q: 'What does the exploration bonus in PUCT do?', options: ['Favours moves tried less often', 'Ends the search early', 'Scores the final position'], answer: 0, why: 'It balances trying and trusting.' },
    { q: 'What becomes the policy\'s training target in AlphaZero?', options: ['The search\'s visit counts', 'Human games', 'Random moves'], answer: 0, why: 'Search improves on the raw policy.' },
    { q: 'Why does an all-wrong group give GRPO no signal?', options: ['Every reward equals the mean, so every advantage is zero', 'The verifier breaks', 'The group is too big'], answer: 0, why: 'Advantages are relative to the group.' },
  ],
  terms: [
    ['MCTS', 'Monte Carlo tree search: simulate ahead, back up values.'],
    ['PUCT', 'Pick children by value plus an exploration bonus.'],
    ['Self-play', 'The agent plays itself to make training data.'],
    ['Value network', 'Predicts the result from a position.'],
    ['MuZero', 'Search inside a learned model of the rules.'],
    ['GRPO', 'Policy updates from group-relative, verified rewards.'],
  ],
  deeper: '<p><b>Oware.</b> Known as oware in Ghana, awalé in Côte d\'Ivoire and ayo in Nigeria, the game rewards counting ahead, exactly what tree search does. Studios across West Africa build digital versions with computer opponents of adjustable strength.</p><p><b>Reasoning models.</b> DeepSeek-R1 applied GRPO with verifiable rewards for maths and code; the main practical lesson matches the panel: choose problems the model sometimes solves.</p><p><b>About this machine.</b> Search runs for real on 12 seeded positions under simplified rules; the value function is a hand-made stand-in for a trained network.</p>',
  code: {
    title: 'PUCT and group advantages',
    note: 'Adapted from the course\'s RL-for-games lesson.',
    text: `
def select(children, c=1.4):
    total = sum(ch.n for ch in children)
    return max(children, key=lambda ch: ch.q() + c * ch.prior * sqrt(total + 1) / (1 + ch.n))

def grpo_advantages(rewards):
    m = mean(rewards); s = pstdev(rewards)
    return [(r - m) / s if s else 0.0 for r in rewards]
`,
  },
};
