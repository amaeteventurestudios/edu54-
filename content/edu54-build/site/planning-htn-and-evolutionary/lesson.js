// Planning with HTN and evolutionary search, both on a vaccine run in the Niger Delta.
// HTN: compound tasks decompose by methods with preconditions into operators with preconditions and effects; the planner simulates the state and
// accepts a plan only if every operator's preconditions hold. When no method applies (no ice at the depot), an LLM proposes a decomposition
// (ChatHTN); it is accepted only if it validates against the operator schema. Evolution (AlphaEvolve's loop, on a route instead of code):
// mutate the order of six clinic stops, keep the fittest; fitness is the exact route length, or a "model judge" that is mostly noise.
const OPS = {
  buy_ice: { pre: s => s.at === 'depot', eff: s => ({ ...s, ice: true }) },
  load_coolbox: { pre: s => s.ice && s.at === 'depot', eff: s => ({ ...s, loaded: true }) },
  drive_to_jetty: { pre: s => s.at === 'depot', eff: s => ({ ...s, at: 'jetty', hours: s.hours + 1 }) },
  drive_to_clinic: { pre: s => s.at === 'depot' && s.road, eff: s => ({ ...s, at: 'clinic', hours: s.hours + 2 }) },
  boat_to_clinic: { pre: s => s.at === 'jetty', eff: s => ({ ...s, at: 'clinic', hours: s.hours + 2 }) },
  hand_over: { pre: s => s.at === 'clinic' && s.loaded && s.hours <= 4, eff: s => ({ ...s, done: true }) },
};
const METHODS = [
  { name: 'by road', pre: s => s.ice && s.road, steps: ['load_coolbox', 'drive_to_clinic', 'hand_over'] },
  { name: 'by river', pre: s => s.ice && !s.road, steps: ['load_coolbox', 'drive_to_jetty', 'boat_to_clinic', 'hand_over'] },
];
const LLM = {
  good: ['buy_ice', 'load_coolbox', 'drive_to_jetty', 'boat_to_clinic', 'hand_over'],
  bad: ['buy_ice', 'drive_to_jetty', 'boat_to_clinic', 'hand_over'],
};
function check(steps, s0) { let s = { ...s0 }; for (let i = 0; i < steps.length; i++) { const op = OPS[steps[i]]; if (!op) return { ok: false, at: i, why: `${steps[i]} is not an operator` }; if (!op.pre(s)) return { ok: false, at: i, why: `${steps[i]}: precondition fails`, s }; s = op.eff(s); } return { ok: !!s.done, at: steps.length, s, why: s.done ? '' : 'goal not reached' }; }
function plan(o) {
  const s0 = { at: 'depot', ice: o.ice, road: o.road, loaded: false, hours: 0, done: false };
  const m = METHODS.find(M => M.pre(s0));
  if (m) return { s0, source: `method "${m.name}"`, steps: m.steps, v: check(m.steps, s0), llm: false };
  const steps = o.llmBad ? LLM.bad : LLM.good, v = check(steps, s0);
  return { s0, source: 'the model\'s suggested decomposition', steps, v, llm: true, accepted: o.validate ? v.ok : true };
}
/* evolution over a six-stop route */
const STOPS = [['Depot', 0, 0], ['Oloibiri', 2.2, 1.1], ['Kaiama', 3.6, -0.4], ['Nembe', 1.4, 2.6], ['Ogbia', 0.6, 1.5], ['Amassoma', 2.9, 2.2], ['Sagbama', 3.9, 1.0]];
const dist = (a, b) => Math.hypot(STOPS[a][1] - STOPS[b][1], STOPS[a][2] - STOPS[b][2]);
const length = r => [0, ...r, 0].reduce((s, x, i, A) => i ? s + dist(A[i - 1], x) : 0, 0);
function evolve(gens, judge) {
  let x = 21; const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; };
  const score = r => judge ? length(r) * 0.15 + rnd() * 6 : length(r);
  let pop = Array.from({ length: 8 }, () => [1, 2, 3, 4, 5, 6].sort(() => rnd() - 0.5));
  const hist = [];
  for (let g = 0; g <= gens; g++) {
    const scored = pop.map(r => ({ r, f: score(r) })).sort((a, b) => a.f - b.f);
    hist.push({ best: scored[0].r, picked: length(scored[0].r) });
    const elite = scored.slice(0, 3).map(e => e.r);
    pop = [...elite, ...Array.from({ length: 5 }, () => { const p = elite[Math.floor(rnd() * 3)].slice(), i = Math.floor(rnd() * 6), j = Math.floor(rnd() * 6); [p[i], p[j]] = [p[j], p[i]]; if (rnd() < 0.5) { const a = Math.floor(rnd() * 5); p.splice(a, 0, p.splice(a + 1, 1)[0]); } return p; })];
  }
  return hist;
}
const OPT = (() => { let best = 1e9; const perm = (a, k) => { if (k === a.length) { best = Math.min(best, length(a)); return; } for (let i = k; i < a.length; i++) { [a[k], a[i]] = [a[i], a[k]]; perm(a, k + 1); [a[k], a[i]] = [a[i], a[k]]; } }; perm([1, 2, 3, 4, 5, 6], 0); return best; })();

export default {
  slug: 'planning-htn-and-evolutionary',
  title: 'Planning you can prove, and search you can score',
  description: 'A vaccine run in the Niger Delta, planned two ways: a task network that checks every step, and evolution that improves a route it can score.',
  overview: 'Two kinds of planning sit beside ReAct and ReWOO. A hierarchical task network (HTN) breaks compound tasks down with methods that have preconditions, into primitive operators that have preconditions and effects. The planner simulates the state through every step, so a plan it returns is sound by construction; it is the tool for scheduling, logistics and policy-bound workflows. ChatHTN adds a language model where the method library runs out: if no method applies (there is no ice at the depot), the model proposes a decomposition, and the planner accepts it only if it validates against the operator schema. The model widens what the planner can do; the symbols keep it correct. Evolutionary search answers a different question: not "is this plan valid?" but "which plan is best?". AlphaEvolve has models propose mutations to a program, runs every candidate through an evaluator, keeps the fittest and repeats; it found a 4×4 complex matrix multiplication with 48 multiplications, the first improvement on that case in 56 years. It works only when fitness is machine-checkable, deterministic and fast; asking a model which candidate is better is not a fitness function. Most agent tasks need neither: reach for ReAct or ReWOO first.',
  keywords: ['HTN planning', 'ChatHTN', 'AlphaEvolve', 'evolutionary search', 'symbolic planning', 'AI agents', 'fitness function'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.95, 1.25], half: 1.35, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { ice: true, road: false, llmBad: false, validate: true, gens: 40, judge: false }, st = { ...D0 };
    const CHAR = '#2C2D31', GOLD = '#E3A72F', GOOD = '#1F9E89', RED = '#D9483B', BLUE = '#5B8DB8', GREY = '#C9C4B6', WATER = '#6FA8C9';
    const OPC = { buy_ice: '#E8F1F7', load_coolbox: BLUE, drive_to_jetty: '#8E91A3', drive_to_clinic: '#8E91A3', boat_to_clinic: '#3E9B9B', hand_over: GOOD };
    /* the task network: the goal block on top, rods down to each step; each step is a plate in its operator's colour with a lamp:
       green when its preconditions held, red where they failed, grey never reached. A model robot appears when no method fits; the gate is the schema check */
    const SX = i => -2.75 + i * 0.58, PZ = -0.3;
    const root = P.box(1.3, 0.3, 0.42, CHAR, { r: 0.05 }); root.position.set(-1.6, 0.55, -0.95); S.add(root);
    const rootLegs = [-0.5, 0.5].map(x => { const l = P.box(0.06, 0.55, 0.06, '#8E91A3', { r: 0.01 }); l.position.set(-1.6 + x, 0, -0.95); S.add(l); return l; });
    const steps = Array.from({ length: 5 }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.48, 0.16, 0.4, '#fff', { r: 0.05, material: m }); b.position.set(SX(i), 0, PZ); S.add(b);
      const rod = P.rod(V(-1.6, 0.55, -0.8), V(SX(i), 0.16, PZ - 0.1), 0.015, '#B9B3A5'); S.add(rod);
      const l = P.lamp(GREY, { h: 0.12, r: 0.075 }); l.position.set(SX(i), 0.16, PZ + 0.05); S.add(l); return { b, m, rod, l }; });
    const bot = P.robot('#7B6FA8', { scale: 0.6 }); bot.position.set(-0.45, 0, -0.95); S.add(bot);
    const gate = P.gate(0.5, RED, { h: 0.4 }); gate.position.set(-0.75, 0, -0.55); gate.rotation.y = Math.PI / 2; S.add(gate);
    /* the run itself: depot, road to the clinic (a puddle when flooded), river from the jetty; the cool box ends where the plan leaves it */
    const WZ = 0.75, DX = -2.75, CX = -0.65, JX = -2.2;
    const depot = P.box(0.5, 0.35, 0.45, '#A87A4F', { r: 0.04 }); depot.position.set(DX, 0, WZ); S.add(depot);
    const clinic = P.box(0.55, 0.4, 0.5, '#F4F1EA', { r: 0.04 }); clinic.position.set(CX, 0, WZ); S.add(clinic);
    const cross = [[0.3, 0.06], [0.06, 0.3]].map(([w, d]) => { const c = P.box(w, 0.06, d, RED, { r: 0.01 }); c.position.set(CX, 0.4, WZ); S.add(c); return c; });
    const road = P.box(1.55, 0.03, 0.22, '#8E91A3', { r: 0.02 }); road.position.set((DX + CX) / 2, 0, WZ); S.add(road);
    const puddle = P.box(0.5, 0.05, 0.36, WATER, { r: 0.05 }); puddle.position.set((DX + CX) / 2, 0, WZ); S.add(puddle);
    const river = P.box(1.75, 0.03, 0.3, WATER, { r: 0.03 }); river.position.set((JX + CX) / 2 + 0.1, 0, WZ + 0.42); S.add(river);
    const jetty = P.box(0.3, 0.08, 0.3, '#8A5F3A', { r: 0.02 }); jetty.position.set(JX, 0, WZ + 0.42); S.add(jetty);
    const ice = P.box(0.18, 0.14, 0.18, '#E8F1F7', { r: 0.03 }); S.add(ice);
    const cbox = new THREE.Group(); const cb1 = P.box(0.24, 0.16, 0.18, '#F4F1EA', { r: 0.03 }); cbox.add(cb1); const cb2 = P.box(0.26, 0.05, 0.2, BLUE, { r: 0.02 }); cb2.position.y = 0.16; cbox.add(cb2); S.add(cbox);
    const lpC = P.lamp(GOOD, { h: 0.3, r: 0.09 }); lpC.position.set(CX + 0.42, 0, WZ); S.add(lpC);
    /* evolution: the six clinic stops and the best route found; under it, a tower per generation, as long as the route it kept; the green bar is the shortest possible */
    const MX = x => 0.4 + x * 0.64, MZ = z => -0.95 + z * 0.4;
    STOPS.forEach(([, x, z], i) => { const b = P.cyl(0.1, i ? 0.14 : 0.24, i ? BLUE : CHAR); b.position.set(MX(x), 0, MZ(z)); S.add(b); });
    let route = null; const routeMat = new THREE.MeshLambertMaterial({ color: GOLD });
    const GZ = 0.85, GX = i => 0.35 + i * 0.066, GH = 0.12;
    const gens = Array.from({ length: 41 }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.05, 1, 0.3, '#fff', { r: 0.005, material: m }); b.position.set(GX(i), 0, GZ); S.add(b); return { b, m }; });
    const opt = P.box(41 * 0.066 + 0.05, 0.02, 0.36, GOOD, { r: 0 }); opt.position.set(GX(20), 0.08, GZ); opt.layers.set(1); S.add(opt);
    S.add(P.keep(-3.05, 3.1, 1.25, -1.2, 1.25));

    let PL = null, H = null;
    function draw() {
      PL = plan(st);
      steps.forEach((o, i) => { const s = PL.steps[i]; o.b.visible = o.rod.visible = o.l.visible = !!s; if (!s) return; o.m.color.set(OPC[s]); const bad = !PL.v.ok && i === PL.v.at, ok = PL.v.ok || i < PL.v.at; o.l.userData.set({ color: bad ? RED : ok ? GOOD : GREY, on: bad || ok }); });
      bot.visible = PL.llm; gate.visible = PL.llm && st.validate; gate.userData.set({ open: PL.v.ok, color: PL.v.ok ? GOOD : RED });
      const executed = !PL.llm || !st.validate || PL.v.ok;
      // run the plan as far as it gets (or only up to the check, if the gate refused it)
      let sx = { ...PL.s0 }; if (executed) for (const k of PL.steps) { const op = OPS[k]; if (!op) break; sx = op.eff(sx); }
      puddle.visible = !st.road;
      ice.visible = PL.s0.ice || (executed && PL.steps.includes('buy_ice')); ice.position.set(DX + 0.12, 0.35, WZ);
      const at = { depot: [DX - 0.05, 0.35, WZ], jetty: [JX, 0.08, WZ + 0.42], clinic: [CX, 0.4, WZ] }[sx.at];
      if (!sx.loaded) cbox.position.set(DX - 0.1, 0.35, WZ); else cbox.position.set(...at);
      const done = executed && PL.v.ok;
      cross.forEach(c => { c.visible = executed && !PL.v.ok; });
      lpC.userData.set({ color: done ? GOOD : executed ? RED : GREY, on: done || executed });
      H = evolve(st.gens, st.judge);
      const best = H[H.length - 1].best;
      if (route) { route.parent.remove(route); route.geometry.dispose(); }
      route = P.tube([0, ...best, 0].map(k => V(MX(STOPS[k][1]), 0.12, MZ(STOPS[k][2]))), 0.03, GOLD, { straight: true, material: routeMat }); route.userData.noFit = true; S.add(route);
      routeMat.color.set(Math.abs(H[H.length - 1].picked - OPT) < 1e-6 ? GOOD : st.judge ? RED : GOLD);
      gens.forEach((g, i) => { const h = H[i]; g.b.visible = !!h; if (!h) return; g.b.scale.y = 0.08 + (h.picked - OPT) * GH; g.m.color.set(Math.abs(h.picked - OPT) < 1e-6 ? GOOD : st.judge ? RED : BLUE); });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Ice at the depot', short: 'Ice', get: () => st.ice, set: v => set({ ice: !!v }) },
      { type: 'toggle', label: 'Road to the clinic open', short: 'Road open', get: () => st.road, set: v => set({ road: !!v }) },
      { type: 'toggle', label: 'The model\'s suggestion skips loading the cool box', short: 'Bad suggestion', get: () => st.llmBad, set: v => set({ llmBad: !!v }), quick: false },
      { type: 'toggle', label: 'Validate model suggestions against the schema', short: 'Validate', get: () => st.validate, set: v => set({ validate: !!v }) },
      { type: 'slider', label: 'Generations', min: 0, max: 40, step: 1, get: () => st.gens, set: v => set({ gens: Math.round(v) }), fmt: v => String(Math.round(v)) },
    ];
    const readouts = [
      { label: 'Plan', get: () => ({ v: PL.v.ok ? 'sound' : PL.llm && !st.validate ? 'executed, broken' : 'refused', sub: PL.source, good: PL.v.ok, bad: !PL.v.ok }) },
      { label: 'Route', get: () => { const L = H[H.length - 1].picked; return { v: L.toFixed(2), sub: `best ${OPT.toFixed(2)}`, good: Math.abs(L - OPT) < 1e-6, bad: st.judge }; } },
      { label: 'Evaluator', get: () => ({ v: st.judge ? 'model judge' : 'exact length', sub: st.judge ? 'noisy' : 'deterministic, fast', bad: st.judge, good: !st.judge }) },
    ];
    const labels = [
      { name: 'htn', t: 'Task network', d: 'The goal splits into steps. White: buy ice, blue: load the cool box, grey: drive, teal: boat, green: hand over. A lamp per step: did its preconditions hold? The gate checks a model\'s suggestion', icon: 'link', atV: V(SX(0) - 0.3, 0.2, PZ) },
      { name: 'run', t: 'The vaccine run', d: 'Depot, road (a puddle when flooded), river from the jetty, clinic. The cool box ends where the plan leaves it', icon: 'box', atV: V(DX - 0.3, 0.2, WZ) },
      { name: 'evo', t: 'Evolving a route', d: 'Six clinics and the best route found. Below, a tower per generation, as tall as the extra distance over the shortest route possible (the green bar)', icon: 'target', atV: V(MX(3.9) + 0.25, 0.2, MZ(1.0)) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Accept the model\'s plan unchecked', hint: 'it forgot the cool box', on: () => set({ ...D0, ice: false, llmBad: true, validate: false }), off: reset },
      { label: 'Score routes by asking a model', hint: 'no real fitness', on: () => set({ ...D0, judge: true }), off: reset },
    ];
    function status() {
      if (PL.llm && !st.validate && !PL.v.ok) return { ok: false, msg: `<b>With no ice and no method that applies, the model suggested a plan, and it ran unchecked: ${PL.v.why} at "${PL.steps[PL.v.at].replace(/_/g, ' ')}".</b> It bought ice but never loaded the cool box. In ChatHTN the model only proposes decompositions; the planner simulates them against each operator's preconditions and rejects this one before anyone leaves the depot.` };
      if (st.judge) return { ok: false, msg: `<b>Scored by a model judge, evolution settles on a route of ${H[H.length - 1].picked.toFixed(2)}; the shortest is ${OPT.toFixed(2)}.</b> The judge's opinion is mostly noise, so selection keeps lucky candidates, not good ones. Evolutionary search needs a deterministic, fast, machine-checkable fitness: here, the route length itself.` };
      return { ok: PL.v.ok, msg: `<b>${PL.v.ok ? `${PL.llm ? 'The model\'s suggested plan' : `The ${PL.source} plan`} is sound: ${PL.steps.map(s => s.replace(/_/g, ' ')).join(', ')}, ${PL.v.s.hours} hours.` : `The plan was refused: ${PL.v.why}.`}</b> ${PL.llm && PL.v.ok ? 'No method applied without ice, so the model proposed a decomposition and the planner validated it step by step. ' : ''}Evolution, scored by exact length, reached ${H[H.length - 1].picked.toFixed(2)} after ${st.gens} generations (shortest possible ${OPT.toFixed(2)}).` };
    }
    return { update: dt => { bot.userData.tick(dt); bot.userData.set({ busy: true }); gate.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A plan you can prove', home: true, say: 'A vaccine run in the Niger Delta: load the cool box, reach the clinic by road or river, hand over within four hours. A task network breaks it down and checks every step.', act: m => m.set({ ice: true, road: true, llmBad: false, validate: true, gens: 40, judge: false }) },
    { t: 'The road floods', home: true, say: 'With the road flooded, the planner picks the river method: drive to the jetty, then the boat.', act: m => m.set({ road: false }) },
    { t: 'No method fits', home: true, say: 'No ice at the depot, and no method covers that. A language model suggests a breakdown, and the planner checks it against every operator.', act: m => m.set({ ice: false }) },
    { t: 'Unchecked suggestions', home: true, say: 'Accept the model\'s plan without checking, and it forgets to load the cool box. The vaccines arrive unusable.', act: m => m.set({ llmBad: true, validate: false }) },
    { t: 'Search you can score', home: true, say: 'A rider\'s route through six clinics improves by evolution: mutate the order, keep the shortest, repeat.', act: m => m.set({ ice: true, llmBad: false, validate: true, judge: false }) },
    { t: 'A real fitness', home: true, say: 'Score the routes by asking a model, and evolution keeps lucky guesses. It needs a fitness a machine can check.', act: m => m.set({ judge: true }) },
  ],
  check: [
    { q: 'In ChatHTN, what does the language model contribute?', options: ['Candidate decompositions, which the planner validates', 'The final plan, executed directly', 'Nothing'], answer: 0, why: 'The symbols keep the plan sound.', hint: 'Try Accept the model\'s plan unchecked.' },
    { q: 'What does evolutionary search like AlphaEvolve require?', options: ['A deterministic, machine-checkable fitness', 'A model judging which is better', 'Human review of each candidate'], answer: 0, why: 'Noisy scores select luck.', hint: 'Try Score routes by asking a model.' },
    { q: 'An HTN operator has preconditions and effects. Why do they matter?', options: ['The planner simulates them, so a returned plan is sound', 'They are documentation', 'They speed up the model'], answer: 0, why: 'Without them the soundness claim collapses.', hint: 'Turn the ice off.' },
  ],
  terms: [
    ['HTN', 'Hierarchical task network: tasks broken down by methods into operators.'],
    ['Method', 'One way to break a compound task down, with preconditions.'],
    ['Operator', 'A primitive action with preconditions and effects.'],
    ['ChatHTN', 'HTN planning that asks a model for decompositions and validates them.'],
    ['Fitness function', 'The machine-checkable score evolution optimises.'],
    ['AlphaEvolve', 'Evolutionary code search with model-proposed mutations.'],
  ],
  deeper: '<p><b>Learning methods.</b> A follow-up to ChatHTN generalises model-proposed decompositions into new methods, cutting how often the model is asked by up to three quarters.</p><p><b>Other AlphaEvolve results.</b> A scheduling heuristic that recovered 0.7% of a large fleet\'s compute, and a large speedup on an attention kernel; each had an exact evaluator.</p><p><b>About this machine.</b> The planner simulates every operator\'s preconditions and effects live; evolution runs 8 routes per generation with swaps and moves, keeping the best 3, against the exact length found by checking all 720 orders.</p>',
  code: {
    title: 'Plan with methods; accept a suggestion only if it simulates',
    note: 'Adapted from the course\'s HTN and evolutionary-search lesson.',
    text: `
def simulate(steps, state, ops):
    for i, name in enumerate(steps):
        op = ops.get(name)
        if op is None or not op.pre(state):
            return False, i                      # unsound at step i
        state = op.eff(state)
    return state.done, len(steps)

def plan(task, state, methods, ops, llm):
    for m in methods[task]:
        if m.pre(state):
            return m.steps
    steps = llm.decompose(task, state)           # a suggestion, not a plan
    ok, _ = simulate(steps, state, ops)
    return steps if ok else None

def evolve(pop, fitness, mutate, gens=40, keep=3):
    for _ in range(gens):                        # fitness must be exact and fast
        pop = sorted(pop, key=fitness)[:keep]
        pop += [mutate(random.choice(pop)) for _ in range(len(pop) * 2)]
    return min(pop, key=fitness)
`,
  },
};
