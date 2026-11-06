// Stochastic processes: a Markov chain of the weather. Three states (sun, cloud, rain) with arrows whose thickness is the chance of moving
// from one to the next tomorrow. A walker hops day by day; the share of days spent in each state settles to the same mix whatever the start.
// Break it: a state you can never leave (rain forever), and chances out of a state that don't add up to 100%.
const NAMES = ['Sun', 'Cloud', 'Rain'];
const COLS = ['#F2C94C', '#B9B6AE', '#3D6BD6'];
const POS = [[-1.9, -0.6], [1.9, -0.6], [0, 1.5]];
const T0 = [[0.7, 0.2, 0.1], [0.3, 0.4, 0.3], [0.2, 0.4, 0.4]];

export default {
  slug: 'markov-chains',
  title: 'Markov chains: tomorrow from today',
  description: 'Sun, cloud and rain are three stops, and arrows between them say how likely tomorrow\'s weather is given today\'s. Send a walker hopping day by day and watch the share of sunny days settle to the same mix, wherever it starts. Then trap it in the rain.',
  overview: 'A stochastic process is a sequence of random steps. The simplest useful kind is a Markov chain: tomorrow depends only on today, through a table of chances. Run it long enough and the share of time spent in each state settles to a fixed mix, the stationary distribution, no matter where it started. Language models generate text one token at a time in the same spirit, PageRank is the stationary mix of a random web surfer, and reinforcement learning is built on Markov decision processes.',
  keywords: ['markov chain explained', 'stochastic process', 'stationary distribution', 'transition matrix', 'random walk'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0.4, 0.4, 0.4], dir: [0.15, 1.4, 1.05], half: 3, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { T: T0.map(r => [...r]), cur: 0, days: 0, counts: [1, 0, 0], run: true, acc: 0, seed: 3, bad: false };
    const rnd = () => { st.seed = (st.seed * 16807) % 2147483647; return st.seed / 2147483647; };
    const W = ([x, z], y = 0.1) => V(x, y, z);
    /* ---------- the three stops ---------- */
    const board = P.box(5.4, 0.1, 5.0, '#F1EEE6', { r: 0.14 }); board.position.set(0, 0, 0.6); S.add(board);
    const stops = NAMES.map((n, i) => {
      const m = new THREE.MeshLambertMaterial({ color: COLS[i] });
      const b = P.cyl(0.55, 0.3, COLS[i], { material: m }); b.position.copy(W(POS[i])); S.add(b);
      const t = S.text(n.toUpperCase(), { size: 0.17, weight: 800, color: i === 2 ? '#FFFFFF' : '#151827', maxW: 0.9 }); t.position.copy(W(POS[i], 0.405)).add(V(0, 0, -0.12)); S.add(t);
      const pc = S.text('', { size: 0.13, weight: 800, color: i === 2 ? '#FFFFFF' : '#151827', maxW: 0.9 }); pc.position.copy(W(POS[i], 0.405)).add(V(0, 0, 0.2)); S.add(pc);
      const f = S.text(n, { size: 0.12, face: 'front', weight: 800, color: i === 2 ? '#FFFFFF' : '#151827', maxW: 0.8 }); f.position.copy(W(POS[i], 0.25)).add(V(0, 0, 0.555)); S.add(f);
      return { b, m, pc };
    });
    /* ---------- the arrows (curved, one for each ordered pair) and the stay loops ---------- */
    const arrows = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      if (i === j) {
        const c = W(POS[i], 0.2), out = c.clone().sub(V(0.4, 0.2, 0.6)).normalize(), pts = [];
        const dir = V(POS[i][0], 0, POS[i][1]).normalize(); if (dir.length() < 0.1) dir.set(0, 0, 1);
        for (let k = 0; k <= 20; k++) { const a = k / 20 * Math.PI * 2; pts.push(c.clone().add(dir.clone().multiplyScalar(0.78 + 0.32 * Math.cos(a) - 0.0)).add(V(-dir.z, 0, dir.x).multiplyScalar(0.32 * Math.sin(a))).add(V(0, 0.12, 0))); }
        const loop = P.tube(pts, 0.03, COLS[i]); loop.userData.noFit = false; S.add(loop);
        const t = S.text('', { size: 0.13, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 0.7 }); t.position.copy(c.clone().add(dir.clone().multiplyScalar(1.25))).add(V(0, 0.3, 0)); t.userData.noFit = true; S.add(t);
        arrows.push({ i, j, loop, t });
      } else {
        const A = W(POS[i], 0.2), B = W(POS[j], 0.2), mid = A.clone().lerp(B, 0.5), side = V(B.z - A.z, 0, A.x - B.x).normalize().multiplyScalar(0.28);
        const a0 = A.clone().lerp(mid, 0.35).add(side), b0 = A.clone().lerp(B, 0.82).add(side);
        const g = P.arrow(a0, b0, 0.03, '#5B5F73'); S.add(g);
        const t = S.text('', { size: 0.12, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 0.7 }); t.position.copy(a0.clone().lerp(b0, 0.5)).add(side.clone().multiplyScalar(0.9)).add(V(0, 0.25, 0)); t.userData.noFit = true; S.add(t);
        arrows.push({ i, j, g, t, a0, b0 });
      }
    }
    const walker = P.ball(0.14, C.coral); walker.userData.noFit = true; S.add(walker);
    /* ---------- the tally: share of days in each state ---------- */
    const TX = 0, TZ = 2.75;
    const tally = NAMES.map((n, i) => { const m = new THREE.MeshLambertMaterial({ color: COLS[i] }); const b = P.box(1, 0.22, 0.3, COLS[i], { r: 0.03, material: m }); b.userData.noFit = true; S.add(b); return b; });
    const ghost = NAMES.map(() => { const r = P.box(0.03, 0.3, 0.36, C.ink, { r: 0 }); r.userData.noFit = true; S.add(r); return r; });
    const tallyT = S.text('', { size: 0.12, face: 'front', weight: 800, color: '#151827', maxW: 4 }); tallyT.position.set(TX, 0.05, TZ + 0.5); S.add(tallyT);
    const TL = 4.6;
    // the long-run mix: multiply any start by the table many times
    function stationary() { let p = [1 / 3, 1 / 3, 1 / 3]; for (let k = 0; k < 300; k++) p = [0, 1, 2].map(j => p.reduce((s, v, i) => s + v * st.T[i][j], 0)); return p; }
    let hop = null;
    function step() {
      const row = st.T[st.cur], tot = row.reduce((a, b) => a + b, 0);
      let r = rnd() * Math.max(tot, 1e-9), j = 0; while (j < 2 && r > row[j]) { r -= row[j]; j++; }
      hop = { from: st.cur, to: j, t: 0 }; st.cur = j; st.days++; st.counts[j]++;
    }
    function start(s) { st.cur = s; st.days = 0; st.counts = [0, 0, 0]; st.counts[s] = 1; hop = null; }
    function update(dt, t) {
      if (st.run) { st.acc += dt * (S.reduced ? 12 : 4); while (st.acc >= 1) { st.acc -= 1; step(); } }
      if (hop) hop.t = Math.min(1, hop.t + dt * 6);
      const a = W(POS[hop ? hop.from : st.cur], 0.55), b = W(POS[st.cur], 0.55), u = hop ? hop.t : 1;
      walker.position.copy(a).lerp(b, u); walker.position.y += Math.sin(u * Math.PI) * 0.4;
      const total = st.counts.reduce((x, y) => x + y, 0), stat = stationary();
      let x0 = TX - TL / 2;
      stops.forEach((s, i) => { s.pc.userData.set(`${Math.round(st.counts[i] / total * 100)}% of days`); s.m.emissive.set(i === st.cur ? '#FFFFFF' : '#000000').multiplyScalar(0.18); });
      tally.forEach((b, i) => { const w = Math.max(0.001, st.counts[i] / total * TL); b.scale.x = w; b.position.set(x0 + w / 2, 0.1, TZ); x0 += w; });
      let gx = TX - TL / 2; ghost.forEach((g, i) => { gx += stat[i] * TL; g.visible = i < 2; g.position.set(gx, 0.1, TZ); });
      tallyT.userData.set(`after ${st.days} days · black marks: the long-run mix`);
      arrows.forEach(ar => {
        const p = st.T[ar.i][ar.j], th = Math.max(0.15, p * 3.5);
        if (ar.g) { ar.g.visible = p > 0.001; ar.g.userData.shaft.scale.x = ar.g.userData.shaft.scale.z = th; ar.g.userData.head.scale.setScalar(Math.max(0.6, th * 0.6)); }
        if (ar.loop) ar.loop.scale.setScalar(1);
        ar.t.visible = p > 0.001; ar.t.userData.set(`${Math.round(p * 100)}%`);
      });
    }
    const rowSum = i => st.T[i].reduce((a, b) => a + b, 0);
    const controls = [
      { type: 'toggle', label: 'Run day by day', short: 'Run', get: () => st.run, set: v => { st.run = v; } },
      { type: 'buttons', label: 'Start on a day of', options: NAMES, get: () => -1, act: i => start(i) },
      { type: 'button', label: 'Jump ahead 1,000 days', short: '+1,000 days', act: () => { for (let k = 0; k < 1000; k++) step(); hop = null; } },
      { type: 'slider', label: 'After rain, chance of more rain', min: 0, max: 1, step: 0.05, get: () => st.T[2][2], set: v => { const rest = 1 - v; st.T[2] = [rest * 0.33, rest * 0.67, v]; start(st.cur); }, fmt: v => `${Math.round(v * 100)}%` },
    ];
    const readouts = [
      { label: 'Days so far', get: () => ({ v: st.days }) },
      { label: 'Long-run mix', get: () => { const p = stationary(); return { v: p.map((v, i) => `${NAMES[i]} ${Math.round(v * 100)}%`).join(' · '), bad: p[2] > 0.95 }; } },
      { label: 'Chances out of rain add to', get: () => ({ v: `${Math.round(rowSum(2) * 100)}%`, bad: Math.abs(rowSum(2) - 1) > 0.01, good: Math.abs(rowSum(2) - 1) <= 0.01 }) },
    ];
    const labels = [
      { name: 'states', t: 'Three states', d: 'Today\'s weather is all that matters', icon: 'box', atV: W(POS[0], 0.4).add(V(-0.55, 0, 0)) },
      { name: 'arrows', t: 'Tomorrow\'s chances', d: 'Thicker arrow: more likely', icon: 'link', atV: W(POS[0], 0.2).lerp(W(POS[2], 0.2), 0.5).add(V(-0.3, 0, 0)) },
      { name: 'walker', t: 'One run of days', d: 'The walker hops once a day', icon: 'target', atV: W(POS[1], 0.55).add(V(0.55, 0, 0)) },
      { name: 'tally', t: 'Share of days', d: 'It settles to the long-run mix', icon: 'scale', atV: V(TX + TL / 2, 0.2, TZ) },
    ];
    const reset = () => { Object.assign(st, { T: T0.map(r => [...r]), run: true, bad: false }); start(0); };
    const breaks = [
      { label: 'Rain that never stops', hint: 'After rain: 100% rain', on: () => { reset(); st.T[2] = [0, 0, 1]; start(0); }, off: reset },
      { label: 'Chances that don\'t add up', hint: 'Out of rain: 20% + 40% + 70%', on: () => { reset(); st.T[2] = [0.2, 0.4, 0.7]; st.bad = true; start(0); }, off: reset },
    ];
    function status() {
      const p = stationary(), total = st.counts.reduce((x, y) => x + y, 0);
      if (st.bad || Math.abs(rowSum(2) - 1) > 0.01) return { ok: false, msg: `<b>The chances out of rain add up to ${Math.round(rowSum(2) * 100)}%.</b> Tomorrow has to be something, so every row of the table must add to exactly 100%. With 130% the chain isn't a chain of probabilities at all; the walker's choices quietly depend on how the code handles the extra, and the long-run mix is meaningless. Normalise each row.` };
      if (st.T[2][2] >= 0.999) return { ok: false, msg: `<b>Stuck in the rain forever.</b> Once the walker reaches rain it can never leave: rain is an absorbing state. However the run starts, in the long run 100% of days are rainy (it has spent ${Math.round(st.counts[2] / total * 100)}% there so far). Real weather always has a way out; a model with a trap like this will predict nonsense.` };
      if (st.days < 60) return { msg: `<b>Day ${st.days}: ${NAMES[st.cur]}.</b> Each day the walker picks tomorrow using only today's arrows.` };
      return { ok: true, msg: `<b>After ${st.days} days:</b> ${NAMES.map((n, i) => `${n.toLowerCase()} ${Math.round(st.counts[i] / total * 100)}%`).join(', ')}. The long-run mix is ${p.map((v, i) => `${NAMES[i].toLowerCase()} ${Math.round(v * 100)}%`).join(', ')}, the same whichever day you start on.` };
    }
    reset();
    return { update, controls, readouts, labels, breaks, status, reset, start, ahead: n => { for (let k = 0; k < n; k++) step(); hop = null; }, set: p => { Object.assign(st, p); start(st.cur); } };
  },

  story: [
    { t: 'Three kinds of day', home: true, say: 'Here are three kinds of day in the rainy season: sun, cloud and rain. A Markov chain says how likely tomorrow is, given only today.', act: m => m.reset() },
    { t: 'Arrows of chance', focus: [-0.6, 0.3, 0.2], zoom: 1.3, say: 'After a sunny day there is a seventy percent chance of sun again, twenty of cloud and ten of rain. Thicker arrows are more likely. The chances out of each day add up to one hundred percent.' },
    { t: 'One run of days', home: true, say: 'The coral walker lives one day at a time. Each morning it picks tomorrow using only today\'s arrows. It has no memory of last week.', wait: 5 },
    { t: 'The mix settles', focus: [0, 0.3, 2.2], zoom: 1.25, say: 'Count the share of days spent in each state. At first it jumps about; after a thousand days it settles on the black marks: the long-run mix.', act: m => m.ahead(1000) },
    { t: 'Whatever the start', home: true, say: 'Start on a rainy day instead, and after a while the mix is exactly the same. The start is forgotten. That long-run mix is called the stationary distribution.', act: m => { m.start(2); m.ahead(1000); }, wait: 5 },
    { t: 'A trap', home: true, say: 'Now make rain certain after rain. Once the walker gets there it can never leave, and in the long run every day is rainy. A state like that is called absorbing.', act: m => { m.set({ T: [[0.7, 0.2, 0.1], [0.3, 0.4, 0.3], [0, 0, 1]] }); }, wait: 5 },
  ],
  check: [
    { q: 'In a Markov chain, what does tomorrow depend on?', options: ['Only today', 'The whole past week', 'Nothing at all'], answer: 0, why: 'That is the Markov property: the present state is all you need.' },
    { q: 'What must the chances out of each state add up to?', options: ['100%', 'Any amount', '50%'], answer: 0, why: 'Tomorrow has to be one of the states, so each row of the table sums to one.' },
    { q: 'After many days, does the share of rainy days depend on the first day?', options: ['No: it settles to the same long-run mix', 'Yes, always', 'Only on Mondays'], answer: 0, why: 'For a chain like this the stationary distribution is the same from any start.' },
  ],
  terms: [
    ['Stochastic process', 'A sequence of random steps over time.'],
    ['Markov chain', 'A process where the next step depends only on the current state.'],
    ['Transition matrix', 'The table of chances of moving from each state to each other state; each row adds to 1.'],
    ['Stationary distribution', 'The long-run share of time in each state, the same from any start.'],
    ['Absorbing state', 'A state the chain can enter but never leave.'],
  ],
  deeper: '<p><b>PageRank</b> is the stationary distribution of a random surfer who follows links and now and then jumps to a random page. Pages where the surfer spends more time rank higher.</p><p><b>Language models</b> are not Markov chains over words (they look back over the whole context), but generating text one token at a time from a distribution is the same kind of random walk.</p><p><b>Reinforcement learning</b> adds choices: in a Markov decision process the walker picks an action at each state, and the arrows depend on the action. Learning means choosing actions that lead to rewarding states.</p>',
  code: {
    title: 'A weather Markov chain',
    note: 'Adapted from the course\'s stochastic-processes lesson.',
    text: `
import random
import numpy as np

T = np.array([[0.7, 0.2, 0.1],     # from sun   to sun, cloud, rain
              [0.3, 0.4, 0.3],     # from cloud
              [0.2, 0.4, 0.4]])    # from rain
assert np.allclose(T.sum(axis=1), 1)   # every row must add to 100%

state, counts = 0, np.zeros(3)
for day in range(10_000):
    state = random.choices([0, 1, 2], weights=T[state])[0]
    counts[state] += 1
print(counts / counts.sum())           # the long-run mix

p = np.ones(3) / 3
for _ in range(200):
    p = p @ T                          # or find it directly
print(p)
`,
  },
};
