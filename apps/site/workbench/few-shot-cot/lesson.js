// Few-shot, chain of thought, self-consistency and tree of thought on a market trader's word problem in Kumasi:
// 48 crates; a third sold on Monday, a quarter of the rest on Tuesday; how many are left? Four steps: 16 sold, 32 left, 8 sold, 24 left.
// A simulated model makes each step wrong with some chance; a wrong step carries forward. The classic slip is a quarter of the original (12), giving 20.
// Each question has its own hardness, so some questions trip most paths. Accuracy is measured over 400 simulated questions with fixed random numbers.
// Answer only: every step done "in its head", error 0.2 a step. Step by step: 0.06. Examples with steps: 0.035. Check each step: 3 candidates a step and a checker
// that picks a right one 98% of the time when there is one. Temperature 0 is one fixed path: every vote copies it.
const Q = 400, STEPS = ['Monday sold', 'Left', 'Tuesday sold', 'Left'], RIGHT = [16, 32, 8, 24];
const METHODS = ['Answer only', 'Step by step', 'Examples with steps', 'Check each step'];
const ERR = [0.2, 0.06, 0.035, 0.06], NS = [1, 3, 5, 9], MAXN = 9;
let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd());
/* per question: hardness; per path and step: draws for error, kind of error, size of a slip, and for three candidates */
const DRAW = Array.from({ length: Q }, () => ({ h: Math.exp(0.8 * gauss() - 0.32), p: Array.from({ length: MAXN }, () => Array.from({ length: 4 }, () => ({ e: rnd(), k: rnd(), d: 1 + Math.floor(rnd() * 4) * (rnd() < 0.5 ? -1 : 1), c: [rnd(), rnd(), rnd()], ch: rnd() }))) }));
function path(st, q, j) {
  const D = DRAW[q], P = D.p[st.T0 ? 0 : j], e = Math.min(0.9, ERR[st.m] * D.h), slip = st.bad ? 0.75 : 0.5 * (st.m === 2 ? 0.5 : 1);
  let sold1, left1, sold2, left2; const ok = [], cand = [];
  const step = (s, right, wrongs) => {
    let wrong;
    if (st.m === 3) {
      /* three candidates; a checker keeps a right one if any */
      const c = P[s].c.map(u => u >= e && !(s === 2 && st.bad && u < 0.75)); cand.push(c);
      wrong = !(c.some(Boolean) && P[s].ch < 0.98);
    } else wrong = s === 2 && st.bad ? P[s].e < 0.75 || P[s].e < e : P[s].e < e;
    ok.push(!wrong);
    if (!wrong) return right;
    return s === 2 && (st.bad || P[s].k < slip) ? wrongs : right + P[s].d;
  };
  sold1 = step(0, 16, 16); left1 = step(1, 48 - sold1, 48 - sold1); sold2 = step(2, left1 / 4, 12); left2 = step(3, left1 - sold2, left1 - sold2);
  const v = [sold1, left1, sold2, left2].map(x => Math.round(x));
  return { v, ok: v.map((x, i) => x === [16, 32, 8, 24][i] && ok[i]), ans: v[3], cand };
}
function vote(paths) {
  const t = new Map(); paths.forEach(p => t.set(p.ans, (t.get(p.ans) || 0) + 1));
  const rows = [...t.entries()].sort((a, b) => b[1] - a[1] || (a[0] === 24 ? -1 : 1));
  return { rows, win: rows[0][0], tie: rows.length > 1 && rows[1][1] === rows[0][1] };
}
function run(st) {
  const n = NS[st.n];
  let right = 0, single = 0;
  const all = DRAW.map((_, q) => {
    const ps = Array.from({ length: n }, (_, j) => path(st, q, j)), V = vote(ps);
    if (V.win === 24) right++;
    if (ps[0].ans === 24) single++;
    return { ps, V };
  });
  const per = st.m === 3 ? 4 * 4 : 1, calls = n * per;
  const out = st.m === 0 ? 6 : st.m === 3 ? 4 * (3 * 20 + 10) : 70, inp = 60 + (st.m === 2 || st.bad ? 240 : 0);
  return { all, n, acc: right / Q, single: single / Q, calls, tokens: n * (st.m === 3 ? 4 * (4 * (inp + 40)) + out : inp + out) };
}

export default {
  slug: 'few-shot-cot',
  title: 'Chain of thought: scratch paper, then a vote',
  description: 'A trader sells a third of 48 crates, then a quarter of the rest. Watch a model answer in one go, step by step, then many times with a vote.',
  overview: 'A model writes one token at a time, and everything it has written becomes input for the next token. Asked for the answer straight away, it has to do every step of a word problem inside a single pass, and often slips. Asked to think step by step (chain of thought), it writes the steps down, so each step can use the one before: on multi-step problems that alone lifts accuracy a lot. Worked examples that show the steps (few-shot chain of thought) help further, because the model copies the method as well as the format. A single chain can still slip, so self-consistency samples several chains at a temperature above zero and takes a majority vote on the final answer: independent slips scatter across different wrong answers while the right one keeps collecting votes. Voting has two blind spots. If every chain makes the same mistake, say because an example in the prompt taught it, the vote confirms the mistake. And at temperature 0 every chain is identical, so the vote adds cost and nothing else. Tree of thought goes further: propose several next steps, have the model judge them, keep the best and continue. It shines on puzzles where most first moves are dead ends, and costs many calls per question.',
  keywords: ['chain of thought', 'few-shot prompting', 'self-consistency', 'tree of thought', 'majority vote', 'reasoning', 'prompting'],
  orient: 'landscape',
  view: { target: [0, 0.45, 0.1], dir: [0.4, 0.85, 1.3], half: 2.0, wide: 6.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { m: 1, n: 2, T0: false, bad: false }, st = { ...D0 };
    const CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F';
    /* the question, as crates: 16 sold Monday (grey), 8 sold Tuesday (gold), 24 left (teal) */
    const cg = new THREE.BoxGeometry(0.19, 0.17, 0.19); cg.translate(0, 0.085, 0);
    const crates = new THREE.InstancedMesh(cg, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 48); crates.castShadow = true; S.add(crates);
    { const d = new THREE.Object3D(), c = new THREE.Color();
      for (let i = 0; i < 48; i++) {
        const g = i < 16 ? 0 : i < 24 ? 1 : 2, j = g === 0 ? i : g === 1 ? i - 16 : i - 24;
        const x = j % 4, zz = Math.floor((j % (g === 2 ? 12 : 16)) / 4), y = g === 2 ? Math.floor(j / 12) : 0;
        d.position.set(-3.05 + x * 0.21, y * 0.18, [-1.05, -0.05, 0.45][g] + zz * 0.21); d.updateMatrix(); crates.setMatrixAt(i, d.matrix); crates.setColorAt(i, c.set(['#8E91A3', '#E3A72F', '#1F9E89'][g]));
      }
      crates.instanceMatrix.needsUpdate = true; crates.instanceColor.needsUpdate = true; }
    /* up to nine reasoning paths: four stepping stones and an answer block each; a ball walks each path */
    const LX = -1.75, SX = 0.5, LDZ = 0.27;
    const lanes = Array.from({ length: MAXN }, () => {
      const steps = STEPS.map((_, i) => { const mm = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.36, 0.14, 0.2, '#fff', { r: 0.03, material: mm }); b.position.set(LX + i * SX, 0, 0); b.userData.noFit = true; S.add(b); return { b, mm }; });
      const amm = new THREE.MeshLambertMaterial({ color: GOOD }), a = P.box(0.36, 0.3, 0.22, '#fff', { r: 0.04, material: amm }); a.position.set(LX + 4 * SX, 0, 0); a.userData.noFit = true; S.add(a);
      const walker = P.ball(0.07, SAF); walker.userData.noFit = true; S.add(walker);
      return { steps, a, amm, walker, z: 0 };
    });
    const floor = P.box(2.7, 0.03, 2.5, '#F6F1E6', { r: 0.04 }); floor.position.set(LX + 2 * SX, 0, 0); S.add(floor);
    /* candidates that tree of thought proposes at each step */
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MAXN * 12); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* the vote: a tower per answer given, capped with the answer; and the score over 400 questions */
    const votes = Array.from({ length: 5 }, (_, k) => { const t = P.tower(0.36, 0.36, GOOD, { size: 0.24, h: 0.02 }); t.position.set(1.15 + k * 0.42, 0, -0.6); S.add(t); return t; });
    const acc = P.tower(0.6, 0.6, GOOD, { size: 0.28 }); acc.position.set(2.8, 0, 0.75); S.add(acc);
    const ticks = [...votes, acc];
    S.add(P.keep(-3.2, 3.2, 1.45, -1.15, 1.15));
    let R = null, q = 0, rev = 0;
    const pct = v => `${Math.round(v * 100)}%`;
    function showQ() {
      const { ps, V: Vt } = R.all[q], n = R.n, hide = st.m === 0;
      lanes.forEach((L, j) => {
        const on = j < n, p = ps[j];
        L.z = (j - (n - 1) / 2) * LDZ;
        L.steps.forEach((s0, i) => { s0.b.position.z = L.z; const vis = on && rev > i * 0.35; s0.b.visible = vis; if (vis) s0.mm.color.set(hide ? '#C9C6BD' : p.ok[i] ? GOOD : BAD); });
        L.a.position.z = L.z; const av = on && rev > 1.45; L.a.visible = av; if (av) L.amm.color.set(p.ans === 24 ? GOOD : BAD);
        L.walker.visible = on; const u = Math.min(4, rev / 0.35); L.walker.position.set(LX + u * SX, 0.24 + Math.abs(Math.sin(u * Math.PI)) * 0.1, L.z);
      });
      let k = 0;
      for (let j = 0; j < MAXN; j++) for (let i = 0; i < 4; i++) for (let c = 0; c < 3; c++, k++) {
        const on = st.m === 3 && j < n && rev > i * 0.35;
        dummy.position.set(LX + i * SX - 0.12 + c * 0.12, 0, lanes[j].z - 0.13); dummy.scale.set(on ? 0.08 : 0, 0.06, on ? 0.05 : 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix);
        im.setColorAt(k, col.set(on && ps[j].cand[i] && ps[j].cand[i][c] ? GOOD : BAD));
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      const show = rev > 1.6;
      votes.forEach((t, k2) => { const r = Vt.rows[k2], vis = show && !!r; t.visible = vis; if (vis) t.userData.set({ h: 0.05 + r[1] / Math.max(n, 1) * 1.05, cap: String(r[0]), color: r[0] === 24 ? GOOD : BAD }); });
    }
    function draw() {
      R = run(st); rev = 0;
      acc.userData.set({ h: 0.05 + R.acc * 1.25, cap: pct(R.acc), color: R.acc >= 0.9 ? GOOD : R.acc < 0.6 ? BAD : SAF });
      showQ();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { ticks.forEach(t => t.userData.tick?.(dt)); if (rev > 2.6) { next(); return; } rev = Math.min(2.61, rev + dt * 0.9); showQ(); };
    const next = () => { q = (q + 1) % Q; rev = 0; showQ(); };
    const controls = [
      { type: 'buttons', label: 'How it answers', options: METHODS, get: () => st.m, act: i => set({ m: i }) },
      { type: 'buttons', label: 'Paths that vote', options: NS.map(String), get: () => st.n, act: i => set({ n: i }) },
      { type: 'toggle', label: 'Temperature 0', get: () => st.T0, set: v => set({ T0: !!v }) },
      { type: 'toggle', label: 'Example teaches the slip', short: 'Bad example', get: () => st.bad, set: v => set({ bad: !!v }) },
      { type: 'button', label: 'Next question', act: next },
    ];
    const readouts = [
      { label: 'Right answers', get: () => ({ v: pct(R.acc), sub: `of ${Q} questions`, good: R.acc >= 0.9, bad: R.acc < 0.6 }) },
      { label: 'Model calls', get: () => ({ v: String(R.calls), sub: 'per question' }) },
      { label: 'Tokens', get: () => ({ v: `~${R.tokens.toLocaleString('en')}`, sub: 'per question' }) },
    ];
    const labels = [
      { name: 'crates', t: '48 crates', d: 'Grey sold Monday, gold Tuesday, teal left: 24', icon: 'box', atV: V(-3.2, 0.36, 0.7) },
      { name: 'paths', t: 'Reasoning paths', d: 'Four steps each; coral is a wrong step', icon: 'layers', atV: V(-1.95, 0.05, 1.2) },
      { name: 'vote', t: 'The vote', d: 'A tower per answer given; tallest wins', icon: 'check', atV: V(3.0, 1.0, -0.6) },
      { name: 'acc', t: 'Over 400 questions', d: 'Share answered right', icon: 'target', atV: V(3.1, 0.02, 1.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'An example teaches the slip', hint: 'every path learns the same mistake', on: () => set({ ...D0, m: 2, bad: true }), off: reset },
      { label: 'Vote at temperature 0', hint: 'five paths, all the same', on: () => set({ ...D0, T0: true }), off: reset },
      { label: 'No scratch paper', hint: 'answer straight away', on: () => set({ ...D0, m: 0, n: 0 }), off: reset },
    ];
    function status() {
      if (st.bad) {
        const good = run({ ...st, bad: false });
        return { ok: false, msg: `<b>A shared mistake: only ${pct(R.acc)} right${R.n === 1 ? '' : R.acc < R.single ? `, and the vote makes it worse (one path alone: ${pct(R.single)})` : ` (one path alone: ${pct(R.single)})`}.</b> The example in the prompt worked "a quarter of the rest" as a quarter of the original, so most paths now sell 12 on Tuesday and land on 20. Voting only cancels slips that differ from path to path; a mistake every path shares wins the vote. With correct examples: ${pct(good.acc)}.` };
      }
      if (st.T0 && R.n > 1) {
        const hot = run({ ...st, T0: false });
        return { ok: false, msg: `<b>Temperature 0: all ${R.n} paths are the same, so the vote is just one path, ${pct(R.acc)} right, for ${R.n}× the cost.</b> Self-consistency needs paths that differ, so their slips land on different wrong answers. At temperature 0.7 the same ${R.n} paths reach ${pct(hot.acc)}.` };
      }
      if (st.m === 0) {
        const cot = run({ ...st, m: 1 });
        return { ok: R.acc >= 0.9 ? undefined : false, msg: `<b>No scratch paper: ${pct(R.acc)} right.</b> Answering straight away, the model does all four steps inside one pass, and any slip is hidden in the final number. Writing the steps down lets each step read the one before: step by step with the same ${R.n} ${R.n === 1 ? 'path' : 'paths'} gets ${pct(cot.acc)}.` };
      }
      if (st.m === 3) {
        const sc = run({ ...st, m: 1, n: 2 });
        return { msg: `<b>Check each step: ${pct(R.acc)} right, using ${R.calls} model calls a question.</b> Proposing three next steps and judging them catches most slips as they happen. On a short chain like this, five voting paths reach ${pct(sc.acc)} with ${sc.calls} calls; tree of thought earns its cost on puzzles where most first moves are dead ends.` };
      }
      return { ok: R.acc >= 0.9 ? true : undefined, msg: `<b>${METHODS[st.m]}${R.n > 1 ? `, ${R.n} paths voting` : ''}: ${pct(R.acc)} right.</b> ${R.n > 1 ? `One path alone gets ${pct(R.single)}; independent slips scatter over different wrong answers, while the right one keeps collecting votes.` : 'One path: any slip goes straight into the answer. More paths with a vote catch slips that differ.'}${st.m === 1 ? ' Worked examples with steps lower the slip rate further.' : ''}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Answer straight away', home: true, say: 'A trader in Kumasi sells a third of 48 crates on Monday, and a quarter of the rest on Tuesday. Asked for just the number, the model does every step in its head, and slips often.', act: m => m.set({ m: 0, n: 0, T0: false, bad: false }) },
    { t: 'Think step by step', home: true, say: 'Ask it to think step by step. Each step it writes becomes input for the next, so the working is checked as it goes. Accuracy jumps.', act: m => m.set({ m: 1 }) },
    { t: 'Worked examples', home: true, say: 'Show two worked examples first, and the model copies the method as well as the format. Fewer slips again.', act: m => m.set({ m: 2 }) },
    { t: 'Sample, then vote', home: true, say: 'Self-consistency runs five paths at a temperature above zero and takes the most common answer. Slips scatter over different wrong numbers, so the right answer wins the vote.', act: m => m.set({ m: 1, n: 2 }) },
    { t: 'A shared mistake', home: true, say: 'But if an example teaches the wrong method, taking a quarter of the original, every path makes the same mistake, and the vote confirms it.', act: m => m.set({ m: 2, bad: true }) },
    { t: 'Check each step', home: true, say: 'Tree of thought proposes several next steps, judges them, and keeps the best. It catches slips early, but at many calls a question; save it for puzzles where most first moves fail.', act: m => m.set({ m: 3, n: 0, bad: false }) },
  ],
  check: [
    { q: 'Why does "think step by step" help on a four-step word problem?', options: ['Each written step becomes input for the next, so the model doesn\'t do it all in one pass', 'It makes the model bigger', 'It lowers the temperature'], answer: 0, why: 'The working becomes part of the context the model reads.', hint: 'Compare Answer only with Step by step.' },
    { q: 'When does majority voting over several paths fail?', options: ['When every path makes the same mistake, or every path is identical', 'When there are more than three paths', 'When the answer is a number'], answer: 0, why: 'Voting only cancels errors that differ between paths.', hint: 'Try the bad example, then temperature 0.' },
    { q: 'When is tree of thought worth its cost?', options: ['On puzzles where most first moves are dead ends and steps can be judged', 'On every question', 'On simple look-ups'], answer: 0, why: 'It spends many calls a question exploring and judging branches.', hint: 'Compare model calls for Check each step and a five-path vote.' },
  ],
  terms: [
    ['Few-shot', 'Putting a few worked examples in the prompt so the model copies the pattern.'],
    ['Chain of thought', 'Asking the model to write its reasoning steps before the answer.'],
    ['Self-consistency', 'Sampling several reasoning paths and taking a majority vote on the answer.'],
    ['Tree of thought', 'Proposing several next steps, judging them, and searching the most promising branches.'],
    ['Temperature', 'How much sampled paths differ; at zero every path is the same.'],
    ['Reasoning model', 'A model trained to think at length before answering, so it needs no "step by step" prompt.'],
  ],
  deeper: '<p><b>Choosing examples.</b> Examples close to the question in meaning beat random ones, and covering every label matters for classification. Three to five usually capture most of the gain; more cost tokens on every call.</p><p><b>Reasoning models.</b> Models trained to think before answering already write their own chain of thought. Adding "think step by step" to them is redundant, and votes add less because their single answers are already strong.</p><p><b>ReAct and prompt chaining.</b> Reasoning can alternate with actions, such as a search or a calculator, so steps rest on facts rather than memory. Long tasks can also be split into a chain of smaller prompts, each checked before the next.</p><p><b>About this machine.</b> The model is simulated. Each step is wrong with a set chance, scaled by each question\'s hardness; a wrong step carries forward, and half the Tuesday slips take a quarter of the original. Temperature 0 is one fixed path that every vote copies. Accuracy is counted over 400 simulated questions with fixed random numbers.</p>',
  code: {
    title: 'Self-consistency: sample, then vote',
    note: 'Adapted from the course\'s few-shot and chain-of-thought lesson.',
    text: `
from collections import Counter

def cot_prompt(question, examples):
    shots = "\\n\\n".join(f"Q: {e['q']}\\nA: {e['steps']} The answer is {e['a']}." for e in examples)
    return f"{shots}\\n\\nQ: {question}\\nA: Let's think step by step."

def final_answer(text):
    return text.rsplit("The answer is", 1)[-1].strip(" .")

def self_consistency(question, examples, n=5):
    answers = [final_answer(call_model(cot_prompt(question, examples), temperature=0.7))
               for _ in range(n)]
    best, votes = Counter(answers).most_common(1)[0]
    return best, votes / n
`,
  },
};
