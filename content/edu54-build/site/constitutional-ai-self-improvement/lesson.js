// Constitutional AI and self-improvement: a homework helper for secondary students in Kumasi, Kisumu and Lusaka. On the left, the constitution and one
// critique-and-revise pass (stage 1, scripted). In the middle and right, GRPO runs for real on a policy over six answer styles: each round, 48 problems,
// a group of G answers per problem, a rule reward (right number +1, answer tags +0.1), advantages as z-scores within the group, one policy-gradient
// step with a small KL pull to the starting model. Style success rates are simulated. Break it: a rule that checks only the tags (quick tagged guesses
// win), problems the model cannot solve at all (nothing to amplify), a group of one (every advantage is zero).
const ST = [
  ['works it out and checks', 0.92, 0.8, '102'],
  ['right, but no tags', 0.7, 0, '96'],
  ['long working, slips', 0.45, 0.85, '112'],
  ['quick tagged guess', 0.08, 1, '100'],
  ['refuses', 0, 0, ''],
  ['rambles, no number', 0.05, 0.1, ''],
];
const REF = [0.15, 0.25, 0.2, 0.12, 0.13, 0.15], GS = [1, 4, 16], ROUNDS = 8, HMAX = Math.log2(6);
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const sm = th => { const m = Math.max(...th), e = th.map(x => Math.exp(x - m)), s = e.reduce((a, b) => a + b, 0); return e.map(x => x / s); };
function run(st) {
  const r = rng(7), G = GS[st.g], th = REF.map(Math.log), lr = REF.map(Math.log), out = [];
  const pick = p => { let u = r(), k = 0; while (k < 5 && (u -= p[k]) > 0) k++; return k; };
  for (let round = 0; round <= ROUNDS; round++) {
    const p = sm(th), g = Array(6).fill(0); let sd = 0, first = null;
    for (let q = 0; q < 48; q++) {
      const s = [];
      for (let i = 0; i < G; i++) { const k = pick(p), c = r() < (st.hard ? 0 : ST[k][1]), f = r() < ST[k][2]; s.push({ k, c, f, rw: (st.rule ? 0 : +c) + (st.rule ? 1 : 0.1) * f }); }
      const m = s.reduce((a, x) => a + x.rw, 0) / G, sdv = Math.sqrt(s.reduce((a, x) => a + (x.rw - m) ** 2, 0) / G);
      s.forEach(x => { x.A = sdv < 1e-8 ? 0 : (x.rw - m) / (sdv + 1e-8); for (let j = 0; j < 6; j++) g[j] += x.A * ((j === x.k) - p[j]) / (G * 48); });
      sd += sdv / 48; if (!first) first = s;
    }
    const acc = st.hard ? 0 : p.reduce((a, x, i) => a + x * ST[i][1], 0), H = -p.reduce((a, x) => a + (x > 1e-12 ? x * Math.log2(x) : 0), 0);
    const kl = p.reduce((a, x, i) => a + (x > 1e-12 ? x * Math.log(x / REF[i]) : 0), 0);
    out.push({ p, acc, H, kl, sd, group: first, top: p.indexOf(Math.max(...p)) });
    const lp = p.map(Math.log), mk = p.reduce((a, x, i) => a + x * (lp[i] - lr[i]), 0);
    for (let j = 0; j < 6; j++) th[j] += 3 * (g[j] - 0.04 * p[j] * ((lp[j] - lr[j]) - mk));
  }
  return out;
}

export default {
  slug: 'constitutional-ai-self-improvement',
  title: 'Constitutional AI: the model grades itself',
  description: 'A homework helper for students in Kumasi, Kisumu and Lusaka learns with almost no human labels: a written constitution, the model critiques itself, and it improves.',
  overview: 'RLHF and DPO both need people to compare thousands of answers. Constitutional AI moves most of that work onto the model. Stage one: write a short list of principles, the constitution, then have the model critique its own drafts against a principle and rewrite them; fine-tune on the rewrites. Stage two, reinforcement learning from AI feedback: the model judges pairs of its own answers against the constitution, and those preferences train it with PPO or DPO. Changing behaviour now means editing a paragraph rather than relabelling data, but the model can only judge as well as it already understands, so real pipelines still keep some human data. For tasks with a checkable outcome, a rule replaces the judge: the number is right or wrong, the code passes its tests or fails. GRPO, used for DeepSeek-R1, samples a group of answers to each problem, scores each with the rule, and uses each answer\'s distance from the group average, divided by the spread, as its advantage. The group is the baseline, so there is no value model to train. When every answer in a group scores the same, the advantage is zero and that problem teaches nothing. Self-improvement loops repeat this: generate, score, keep the best, train, again. They sharpen what the model can already do; they cannot create a skill it lacks, and a rule that can be satisfied without doing the task gets satisfied that way.',
  keywords: ['constitutional ai', 'rlaif', 'grpo', 'group relative policy optimization', 'rule-based reward', 'self-improvement', 'deepseek-r1', 'reward hacking'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { rule: 0, hard: 0, g: 2, round: ROUNDS };
    const ink = '#151827';
    /* the constitution and one critique-and-revise pass, at the left */
    const put = (str, x, z, o) => {    return t; };
    put('Constitution', -2.1, -1.0, { size: 0.11, weight: 800, color: '#6B5E86' });
    ['1. Answer the question that was asked', '2. Give the final number plainly', '3. Never refuse a fair request'].forEach((s, i) => put(s, -2.1, -0.76 + i * 0.18));
    put('Critique and revise', -2.1, -0.12, { size: 0.09, weight: 800, color: '#6B5E86' });
    const steps = [['Draft', 'I cannot help with homework.', '#C62828'], ['Critique', 'This breaks rule 3.', '#B5541C'], ['Revised', 'It is 102. <answer>102</answer>', '#1D6B3A']];
    steps.forEach(([h, s, c], i) => { const z = 0.14 + i * 0.32, chip = P.box(0.08, 0.04, 0.2, c, { r: 0.02 }); chip.position.set(-2.78, 0.15, z); floor.add(chip);
      put(`${h}: ${s}`, -2.03, z, { color: c, maxW: 1.3 }); });
    put('Fine-tune on the rewrites:\nno human labels', -2.1, 1.12, { size: 0.07, color: '#5E5E6E' });
    /* the problem and the rule, at the back of the middle */
    const qc = P.box(2.3, 0.05, 0.42, '#FFFFFF', { r: 0.03 }); qc.position.set(0.05, 0.12, -1.0); floor.add(qc);


    /* a group of answers: tile coloured by what the answer got right, bar = advantage */
    const tiles = Array.from({ length: 16 }, () => {
      const tm = new THREE.MeshLambertMaterial({ color: '#B8B2C4' }), bm = new THREE.MeshLambertMaterial({ color: '#1F9E89' });
      const t = P.box(0.25, 0.05, 0.3, '#fff', { r: 0.03, material: tm }); t.userData.noFit = true; floor.add(t);
      const b = P.box(0.08, 1, 0.08, '#fff', { r: 0.02, material: bm }); b.userData.noFit = true; floor.add(b);
      return { t, tm, b, bm };
    });
    const keepG = P.box(2.4, 0.6, 1.5, '#000'); keepG.material = new THREE.MeshBasicMaterial({ visible: false }); keepG.position.set(0.05, 0.12, 0.05); floor.add(keepG);

    /* rounds chart at the right */

    const X = i => 1.6 + i / ROUNDS * 1.2, Z = v => 0.3 - v * 1.05;
    const axx = P.box(1.3, 0.01, 0.012, ink, { r: 0 }); axx.position.set(2.2, 0.17, 0.3); floor.add(axx);
    const axz = P.box(0.012, 0.01, 1.1, ink, { r: 0 }); axz.position.set(1.58, 0.17, -0.24); floor.add(axz);
    const COL = ['#1F9E89', C.plum];
    const lines = COL.map(c => { const mm = new THREE.MeshBasicMaterial({ color: c }), t = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.018, c, { material: mm }); t.layers.set(1); t.userData.noFit = true; floor.add(t); return t; });
    const dots = COL.map(c => { const d = P.ball(0.045, c); d.userData.noFit = true; floor.add(d); return d; });




    const keep = P.box(5.6, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null, anim = 0;
    const tube = (pts, k) => { lines[k].geometry.dispose(); lines[k].geometry = pts.length > 1 ? new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.018, 5, false) : new THREE.BufferGeometry(); };
    function show() {
      const now = R[st.round], G = GS[st.g], grp = now.group, cols = Math.min(G, 8), rows = Math.ceil(G / 8);
      tiles.forEach((T, i) => {
        const on = i < G; T.t.visible = on; T.b.visible = on;  if (!on) return;
        const a = grp[i], c = i % 8, rI = Math.floor(i / 8), x = 0.05 + (c - (cols - 1) / 2) * 0.29, z = rows === 1 ? 0.15 : -0.3 + rI * 0.8;
        T.t.position.set(x, 0.12, z); T.tm.color.set(a.c ? '#1F9E89' : a.f ? '#E0A030' : '#B8B2C4');
        const h = 0.02 + Math.min(Math.abs(a.A), 2.5) * 0.16; T.b.scale.y = h; T.b.position.set(x, 0.17, z - 0.11); T.bm.color.set(a.A >= 0 ? '#1F9E89' : '#C62828');
        const num = st.hard ? (ST[a.k][3] ? 'wrong' : '') : (a.c ? '102' : ST[a.k][3]);
      });
      [R.map(o => o.acc), R.map(o => o.H / HMAX)].forEach((vs, k) => { tube(vs.slice(0, st.round + 1).map((v, i) => V(X(i), 0.2, Z(v))), k); dots[k].position.set(X(st.round), 0.2, Z(vs[st.round])); });


    }
    function draw() {
      R = run(st);
      show();
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Reward rule', options: ['Number and tags', 'Tags only'], get: () => st.rule, act: i => { st.rule = i; anim = 0; draw(); } },
      { type: 'buttons', label: 'Problems', options: ['School maths', 'Far too hard'], get: () => st.hard, act: i => { st.hard = i; anim = 0; draw(); } },
      { type: 'buttons', label: 'Group size', options: GS.map(String), get: () => st.g, act: i => { st.g = i; anim = 0; draw(); } },
      { type: 'slider', label: 'Round', min: 0, max: ROUNDS, step: 1, get: () => st.round, set: v => { st.round = Math.round(v); anim = 0; show(); } },
    ];
    const now = () => R[st.round];
    const readouts = [
      { label: 'Right answers', get: () => ({ v: `${Math.round(now().acc * 100)}%`, sub: `round ${st.round}, started at ${Math.round(R[0].acc * 100)}%`, good: now().acc >= 0.8, bad: now().acc < R[0].acc - 0.05 || !!st.hard }) },
      { label: 'Variety of styles', get: () => ({ v: `${now().H.toFixed(1)} bits`, sub: `of ${HMAX.toFixed(1)} at most` }) },
      { label: 'KL from start', get: () => ({ v: now().kl.toFixed(2), sub: 'how far it moved' }) },
    ];
    const labels = [
      { name: 'cons', t: 'Constitution', d: 'Rules in plain words; the model critiques itself', icon: 'book', atV: V(-2.55, 0.15, 0.3) },
      { name: 'chart', t: 'Round by round', d: 'Right answers and variety', icon: 'wave', atV: V(2.95, 0.2, -0.3) },
    ];
    const reset = () => { Object.assign(st, { rule: 0, hard: 0, g: 2, round: ROUNDS }); anim = 0; draw(); };
    const breaks = [
      { label: 'The rule checks only the tags', hint: 'tags +1, number ignored', on: () => { reset(); st.rule = 1; draw(); }, off: reset },
      { label: 'Problems beyond the model', hint: 'none of its styles can solve them', on: () => { reset(); st.hard = 1; draw(); }, off: reset },
      { label: 'A group of one', hint: 'one answer per problem', on: () => { reset(); st.g = 0; draw(); }, off: reset },
    ];
    function status() {
      const n = now(), a0 = Math.round(R[0].acc * 100), a = Math.round(n.acc * 100);
      if (st.round === 0) return { msg: `<b>Round 0: the starting model, ${a}% right.</b> Its answers come in six styles; move the round slider or press Play to watch GRPO train it.` };
      if (st.g === 0) return { ok: false, msg: `<b>Nothing learned: still ${a}% right after ${st.round} rounds.</b> With one answer per problem the group average is that answer itself, so every advantage is zero and no gradient flows. GRPO needs several answers to the same problem to know which ones were better than usual.` };
      if (st.hard) return { ok: false, msg: `<b>Still 0% right after ${st.round} rounds.</b> None of its styles can solve these problems, so every group is all wrong. The only difference left is the answer tags, and that is all it learns: ${ST[n.top][0]} now ${Math.round(n.p[n.top] * 100)}%. Self-improvement sharpens skills the model already has; it cannot create one.` };
      if (st.rule) return { ok: false, msg: `<b>Right answers fell from ${a0}% to ${a}%.</b> The rule pays for tags and never checks the number, so a quick tagged guess scores as well as careful working and costs less: it now makes up ${Math.round(n.p[3] * 100)}% of answers. A rule must check the outcome itself.` };
      return { ok: true, msg: `<b>${a}% right after ${st.round} rounds, up from ${a0}%.</b> In each group of ${GS[st.g]}, answers above the average were pushed up and those below pushed down, with no value model and no human labels. Variety falls to ${n.H.toFixed(1)} bits as one style takes over: on maths that is fine, on open-ended tasks it is the start of mode collapse.` };
    }
    function update(dt) {
      if (!anim) return; anim += dt;
      const r = Math.min(ROUNDS, Math.floor(anim / 0.55)); if (r !== st.round) { st.round = r; show(); S.sync(); }
      if (r >= ROUNDS) anim = 0;
    }
    const play = () => { st.round = 0; anim = 1e-6; show(); };
    return { update, controls, readouts, labels, breaks, status, reset, play, set: p => { Object.assign(st, p); anim = 0; draw(); } };
  },

  story: [
    { t: 'Rules in plain words', focus: [-2.1, 0.2, -0.45], zoom: 2, say: 'A homework helper for students in Kumasi, Kisumu and Lusaka writes down how it should behave, in plain words. That list is its constitution.', act: m => m.set({ rule: 0, hard: 0, g: 2, round: 0 }) },
    { t: 'Critique and revise', focus: [-2.1, 0.2, 0.45], zoom: 2, say: 'The model reads its own draft, says which rule it breaks, and rewrites it. Training on the rewrites needs no human labels.', act: m => m.set({}) },
    { t: 'A group of answers', home: true, say: 'For maths, a simple rule can check the answer. The model writes sixteen answers to each problem, and each is scored against the group\'s average.', act: m => m.set({ round: 0 }) },
    { t: 'Round by round', home: true, say: 'Answers above the average are pushed up, and those below are pushed down. Over eight rounds, careful answers take over.', act: m => m.play(), wait: 1 },
    { t: 'Check only the tags', home: true, say: 'Now let the rule check only the answer tags. The model learns to tag quick guesses, and fewer answers are right.', act: m => m.set({ rule: 1, round: 8 }) },
    { t: 'Too hard to learn', home: true, say: 'Give it problems it cannot solve at all, and every answer is wrong. Self-improvement sharpens a skill the model has. It cannot create one.', act: m => m.set({ rule: 0, hard: 1, round: 8 }) },
  ],
  check: [
    { q: 'In GRPO, what takes the place of PPO\'s value model?', options: ['The average reward of a group of answers to the same problem', 'A larger reward model', 'A human rating of each answer'], answer: 0, why: 'Each answer\'s advantage is its distance from the group average, divided by the spread.', hint: 'Think of what each answer is compared with.' },
    { q: 'Every answer in a group gets the same reward. What does that problem teach?', options: ['Nothing: every advantage is zero', 'Twice as much as usual', 'To copy the first answer'], answer: 0, why: 'With no spread there is nothing above or below average, so no gradient flows.', hint: 'Subtract the average from each reward.' },
    { q: 'Why can\'t a self-improvement loop teach a skill the model lacks entirely?', options: ['It only amplifies what already shows up in the model\'s own answers', 'The constitution forbids new skills', 'GRPO needs a value model to learn'], answer: 0, why: 'If no answer is ever right, there is no right answer to push up.', hint: 'Where do the training answers come from?' },
  ],
  terms: [
    ['Constitution', 'A short written list of principles the model uses to judge its own answers.'],
    ['Critique and revise', 'Stage one of Constitutional AI: the model criticises a draft against a principle, rewrites it, and is fine-tuned on the rewrites.'],
    ['RLAIF', 'Reinforcement learning from AI feedback: preferences come from the model judging its own answers, not from people.'],
    ['GRPO', 'Group relative policy optimisation: PPO without a value model, using each answer\'s standing within its group as the advantage.'],
    ['Rule-based reward', 'A check that needs no learned model: the number matches, the tests pass, the format is right.'],
    ['Mode collapse', 'Training on its own outputs narrows the model to a few styles; watch the spread of rewards within groups.'],
  ],
  deeper: '<p><b>Text, not data.</b> With a constitution, changing how a model behaves means editing a sentence and rerunning the loop, not relabelling thousands of comparisons. The catch is that the model judges with the understanding it already has: if it cannot spot a manipulative reply, its critique will not either. Production pipelines still mix in a smaller share of human preference data.</p><p><b>Outcome or process.</b> Rewarding only the final answer is cheap and hard to game. Rewarding every step gives denser feedback but needs step-by-step labels, and models learn to write steps that look good to the step scorer. Most teams start with outcome rewards and GRPO.</p><p><b>Health checks.</b> In a healthy run the average reward climbs, the spread of rewards within each group stays above zero, and the drift from the starting model grows slowly. A spread that falls to zero means every problem is either solved every time or never: nothing is left to learn from.</p><p><b>About this machine.</b> GRPO training runs for real on a policy over six answer styles, 48 problems per round; how often each style gets the number right and uses the tags is simulated.</p>',
  code: {
    title: 'Group-relative advantage',
    note: 'Adapted from the course\'s Constitutional AI lesson.',
    text: `
import re
import numpy as np

def reward(expected, response):
    nums = re.findall(r"-?\\d+", response)
    right = 1.0 if nums and int(nums[-1]) == expected else 0.0
    tags = 1.0 if re.search(r"<answer>.*</answer>", response) else 0.0
    return right + 0.1 * tags                  # the number matters most

def group_advantage(rewards):
    r = np.array(rewards, dtype=float)
    if r.std() < 1e-8:
        return np.zeros_like(r)                # all the same: nothing to learn
    return (r - r.mean()) / (r.std() + 1e-8)   # the group is the baseline
`,
  },
};
