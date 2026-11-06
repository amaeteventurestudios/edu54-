// Reflexion: a cargo-tricycle rider in Onitsha must load exactly 135 kg from five sacks (20, 35, 40, 55, 60 kg), three at a time.
// Actor: prefers the heaviest load it hasn't ruled out. Evaluator: the scale (scalar), or the actor's own "close enough" (self-evaluated).
// Self-reflector: writes a sentence after each failure, and the sentence becomes a rule in episodic memory (ban this load; stay under or over a total).
// Next trial starts fresh but conditioned on the memory. Breaks: no memory (the same load forever), a one-off scale fault turned into a superstition
// ("never use the 60 kg sack", which every exact load needs), and self-evaluation that calls 150 kg close enough.
const SACKS = [20, 35, 40, 55, 60], TARGET = 135, MAXT = 8;
const COMBOS = (() => { const out = []; for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) for (let c = b + 1; c < 5; c++) out.push([SACKS[c], SACKS[b], SACKS[a]]); return out.sort((x, y) => (y[0] + y[1] + y[2]) - (x[0] + x[1] + x[2]) || y[0] - x[0]); })();
const sum = c => c[0] + c[1] + c[2];
function run(o) {
  const mem = [], trials = [];
  for (let t = 0; t < MAXT; t++) {
    const rules = o.memory ? mem.slice(-o.window) : [];
    const pick = COMBOS.find(c => rules.every(r => r.ok(c))) || null;
    if (!pick) { trials.push({ pick: null, total: null, verdict: 'stuck', note: 'no load satisfies the rules in memory' }); break; }
    const total = sum(pick);
    const glitch = o.glitch && t === 0;
    let verdict;
    if (glitch) verdict = 'error';
    else if (o.selfEval) verdict = Math.abs(total - TARGET) <= 15 ? 'pass' : total > TARGET ? 'over' : 'under';
    else verdict = total === TARGET ? 'pass' : total > TARGET ? 'over' : 'under';
    let refl = null;
    if (verdict === 'error') refl = { text: `The scale cut out while the ${pick[0]} kg sack was on. Never load the ${pick[0]} kg sack.`, ok: c => !c.includes(pick[0]), bad: true };
    else if (verdict === 'over') refl = { text: `${pick.join(' + ')} = ${total} kg, ${total - TARGET} over. Load less than ${total} kg next time.`, ok: c => sum(c) < total };
    else if (verdict === 'under') refl = { text: `${pick.join(' + ')} = ${total} kg, ${TARGET - total} short. Load more than ${total} kg next time.`, ok: c => sum(c) > total };
    trials.push({ pick, total, verdict, refl, used: rules.length });
    if (verdict === 'pass') break;
    if (refl) mem.push(refl);
  }
  const last = trials[trials.length - 1], right = last.pick && sum(last.pick) === TARGET && last.verdict === 'pass';
  return { trials, mem, right, claimed: last.verdict === 'pass' };
}

export default {
  slug: 'reflexion-verbal-rl',
  title: 'Reflexion: learn from a failure in words',
  description: 'A cargo-tricycle rider in Onitsha must load exactly 135 kg from five sacks. After each miss, a sentence of reflection guides the next try.',
  overview: 'Reflexion improves an agent between attempts without changing its weights. An actor makes an attempt; an evaluator scores it; when it fails, a self-reflector writes a short sentence about why, and that sentence goes into episodic memory. The next attempt starts fresh but reads the memory first. The evaluator can be a scalar signal from the world (tests pass, the scale reads 135), a heuristic (the same action twice means stuck), or the model judging itself, which is the weakest: it can call a wrong answer close enough. Reflexion helps when there is a clear failure signal, the task can be tried again, and there is budget left. It does not help when the failure came from outside, such as a broken tool: a reflection about a one-off fault becomes a superstition that blocks the right answer. Memory needs care: reflections pile up, some go stale, and old ones should expire or be compacted. The same pattern shows up wherever an agent saves lessons for later, such as notes files loaded at the start of each session.',
  keywords: ['Reflexion', 'self-reflection', 'episodic memory', 'AI agents', 'verbal reinforcement learning', 'evaluator', 'agent memory'],
  orient: 'landscape',
  view: { target: [0, 0.4, 0], dir: [0.4, 0.85, 1.3], half: 1.6, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { memory: true, window: 8, glitch: false, selfEval: false }, st = { ...D0, t: 0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the tricycle and the scale */
    const TX = -1.85;
    const bed = P.box(1.3, 0.12, 0.8, '#2E6F95', { r: 0.04 }); bed.position.set(TX, 0.32, 0.1); S.add(bed);
    [[TX - 0.5, -0.45], [TX - 0.5, 0.65], [TX + 0.85, 0.1]].forEach(([x, z]) => { const w = P.cyl(0.2, 0.08, '#2C2D31'); w.rotation.x = Math.PI / 2; w.position.set(x, 0.2, z + 0.04); S.add(w); });
    const seat = P.box(0.2, 0.25, 0.2, '#2C2D31', { r: 0.03 }); seat.position.set(TX + 0.85, 0.3, 0.1); S.add(seat);
    const sackMats = SACKS.map(() => new THREE.MeshLambertMaterial({ color: '#C9A227' }));
    const sacks = SACKS.map((kg, i) => { const s = Math.cbrt(kg / 60), b = P.box(0.36 * s, 0.4 * s, 0.36 * s, '#fff', { r: 0.06, material: sackMats[i] }); S.add(b); const t = S.text(`${kg}`, { size: 0.2, weight: 800, color: ink, face: 'cam', bg: '#FFFFFF', top: true }); t.userData.noFit = true; S.add(t); return { b, t, kg, s }; });
    const scale = P.box(0.7, 0.3, 0.5, '#FFFFFF', { r: 0.05 }); scale.position.set(TX, 0.12, -1.0); S.add(scale);
    const sT = S.text('', { size: 0.24, weight: 800, color: ink, face: 'cam', bg: '#FFFFFF', top: true }); sT.position.set(TX, 0.62, -1.0); S.add(sT);
    /* trials: a tower per trial, as tall as the load weighed (the gold bar is the 135 kg target); green exact, red wrong or stuck, coral an error */
    const TRX = i => 0.0 + i * 0.26, TH = kg => kg / 160 * 1.2;
    const trows = Array.from({ length: MAXT }, (_, i) => { const t = P.tower(0.18, 0.3, GOOD); t.position.set(TRX(i), 0, -0.2); t.userData.set({ cap: '' }); S.add(t); return t; });
    const tgt = P.box(MAXT * 0.26 + 0.1, 0.025, 0.36, '#fff', { r: 0, material: new THREE.MeshLambertMaterial({ color: SAF, transparent: true, opacity: 0.55 }) }); tgt.position.set(TRX((MAXT - 1) / 2), TH(TARGET), -0.2); S.add(tgt);
    /* episodic memory: a stack of notes, one per reflection; red notes are bad lessons, grey ones fell out of the window */
    const MX = 2.25, notes = Array.from({ length: 7 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF7D6' }), b = P.box(0.5, 0.08, 0.4, '#fff', { r: 0.02, material: mm }); b.position.set(MX, 0.02 + i * 0.1, 0.5); S.add(b); return { b, mm }; });
    const book = P.box(0.6, 0.04, 0.5, '#8A5F3A', { r: 0.02 }); book.position.set(MX, 0, 0.5); S.add(book);
    S.add(P.keep(-2.65, 2.6, 1.3, -1.3, 1.0));

    let R = null;
    function plan() { R = run(st); st.t = 0; paint(); }
    function paint() {
      const k = Math.min(R.trials.length - 1, Math.floor(st.t)), T = R.trials[k];
      // load the current trial's sacks onto the bed, the rest beside it
      const on = T.pick ? T.pick.slice() : [];
      let slot = 0, off = 0;
      sacks.forEach((s, i) => {
        const idx = on.indexOf(s.kg); const isOn = idx >= 0; if (isOn) on[idx] = -1;
        if (isOn) { s.b.position.set(TX - 0.42 + slot * 0.42, 0.44, 0.1); slot++; } else { s.b.position.set(TX - 0.6 + off * 0.42, 0.12, 0.85 - 0.35); s.b.position.z = -0.45 + 0; s.b.position.x = TX - 0.75 + off * 0.36; s.b.position.z = 0.75; off++; }
        s.t.position.set(s.b.position.x, s.b.position.y + 0.4 * s.s + 0.02, s.b.position.z); s.t.userData.set(`${s.kg}`);
        sackMats[i].color.set(isOn ? '#C9A227' : '#B9B3A5');
      });
      sT.userData.set(T.verdict === 'error' ? 'Err' : T.total == null ? '–' : `${T.total}`, T.verdict === 'error' ? RED : T.verdict === 'pass' && T.total === TARGET ? GOOD : ink);
      trows.forEach((r, i) => { const x = i <= k ? R.trials[i] : null; r.visible = !!x; if (!x) return; const col = x.verdict === 'pass' ? (x.total === TARGET ? GOOD : RED) : x.verdict === 'stuck' ? RED : x.verdict === 'error' ? BAD : SAF; r.userData.set({ h: x.total ? TH(x.total) : 0.05, color: col }); });
      const memNow = R.trials.slice(0, k).map(x => x.refl).filter(Boolean);
      const shown = st.memory ? memNow.slice(-7) : [];
      notes.forEach((n, i) => { const m = shown[i]; n.b.visible = !!m; if (!m) return; const live = memNow.length - shown.length + i >= memNow.length - st.window; n.mm.color.set(m.bad ? RED : live ? '#FFF7D6' : '#C9C4B6'); });
    }
    plan();
    const set = p => { Object.assign(st, p); plan(); };
    const controls = [
      { type: 'toggle', label: 'Keep reflections between trials', short: 'Memory', get: () => st.memory, set: v => set({ memory: !!v }) },
      { type: 'toggle', label: 'The actor judges its own load', short: 'Self-eval', get: () => st.selfEval, set: v => set({ selfEval: !!v }), quick: false },
      { type: 'button', label: 'Run the trials again', act: () => { st.t = 0; paint(); } },
    ];
    const readouts = [
      { label: 'Trials', get: () => ({ v: `${R.trials.length}`, sub: R.right ? 'until 135 kg' : 'and no exact load', good: R.right, bad: !R.right }) },
      { label: 'Memory', get: () => ({ v: `${R.mem.length} notes`, sub: st.memory ? 'kept between trials' : 'not kept' }) },
      { label: 'Final load', get: () => { const L = R.trials[R.trials.length - 1]; return { v: L.total == null ? '–' : `${L.total} kg`, sub: R.claimed ? 'marked pass' : 'not passed', good: R.right, bad: R.claimed && !R.right }; } },
    ];
    const labels = [
      { name: 'scale', t: 'The scale', d: 'The evaluator: it weighs each load the rider tries on the tricycle', icon: 'gauge', atV: V(-2.25, 0.3, -1.0) },
      { name: 'trials', t: 'Trials', d: 'A tower per try, as tall as its weight; the gold bar is the 135 kg target', icon: 'chart', atV: V(TRX(MAXT - 1) + 0.15, 0.6, -0.2) },
      { name: 'mem', t: 'Episodic memory', d: 'One note per lesson learned from a failure; red: a bad lesson, grey: forgotten', icon: 'book', atV: V(MX + 0.3, 0.3, 0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Take the memory away', hint: 'same load every time', on: () => set({ ...D0, memory: false }), off: reset },
      { label: 'Turn a one-off fault into a rule', hint: 'the scale cut out once', on: () => set({ ...D0, glitch: true }), off: reset },
      { label: 'Let the actor mark its own load', hint: '"close enough"', on: () => set({ ...D0, selfEval: true }), off: reset },
    ];
    function status() {
      const L = R.trials[R.trials.length - 1];
      if (!st.memory) return { ok: false, msg: `<b>With no memory, every trial loads ${R.trials[0].pick.join(' + ')} = ${R.trials[0].total} kg again, ${R.trials.length} times.</b> Each attempt starts fresh, and without the reflections nothing tells the actor what went wrong. Reflexion's whole mechanism is the sentence carried from one trial to the next.` };
      if (st.glitch && !R.right) return { ok: false, msg: `<b>The scale cut out once, and the reflection blamed the 60 kg sack: "never load it". Every load that makes exactly 135 kg needs that sack, so the actor ${L.verdict === 'stuck' ? 'runs out of options' : 'never gets there'}.</b> A failure from outside (a broken tool, a dropped connection) is not a lesson about the task. Reflect only on failures the agent caused, and let such notes expire.` };
      if (st.selfEval && R.claimed && !R.right) return { ok: false, msg: `<b>The actor judged its own ${L.total} kg load "close enough" and stopped: ${L.total - TARGET} kg over, marked pass.</b> Self-evaluation is the weakest signal; it agrees with itself. Use the scale (a scalar signal from the world) whenever one exists, and keep self-evaluation for when nothing else can check.` };
      if (!R.right) return { ok: false, msg: `<b>No exact load in ${R.trials.length} trials.</b> With only the last ${st.window} reflections, the actor forgets bounds it learned earlier.` };
      return { ok: true, msg: `<b>Trial ${R.trials.length} loads ${L.pick.join(' + ')} = 135 kg exactly.</b> Each failed trial left one sentence (over by so much, stay under; short by so much, stay over), and the next trial read them first. No weights changed; the notes narrowed the search. The scale was the evaluator, a signal from the world.` };
    }
    return {
      update: dt => { trows.forEach(t => t.userData.tick(dt)); if (st.t < R.trials.length - 1 + 0.99) { const k = Math.floor(st.t); st.t = Math.min(R.trials.length - 1 + 0.99, st.t + dt * 0.8); if (Math.floor(st.t) !== k) paint(); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Exactly 135 kilograms', home: true, say: 'A tricycle rider in Onitsha has to load exactly one hundred and thirty-five kilograms, using three of five sacks. The agent tries, and the scale says how it went.', act: m => m.set({ memory: true, window: 8, glitch: false, selfEval: false }) },
    { t: 'One sentence per failure', home: true, say: 'After each wrong load, the agent writes one sentence: how far off it was, and which way to go next. The sentence is kept.', act: m => m.set({ memory: true }) },
    { t: 'Read before trying', home: true, say: 'Each new try starts fresh, but reads the notes first. The notes narrow the choices until the load is exact.', act: m => m.set({ window: 8 }) },
    { t: 'Without notes', home: true, say: 'Take the notes away, and the agent makes the same heavy load every time.', act: m => m.set({ memory: false }) },
    { t: 'A superstition', home: true, say: 'The scale cuts out once. The agent blames the heaviest sack and swears never to use it again. Now no exact load is possible.', act: m => m.set({ memory: true, glitch: true }) },
    { t: 'Marking its own work', home: true, say: 'If the agent judges its own load, it calls one hundred and fifty close enough and stops. The scale would not have.', act: m => m.set({ glitch: false, selfEval: true }) },
  ],
  check: [
    { q: 'What does Reflexion change between attempts?', options: ['A written reflection in memory, read at the start of the next attempt', 'The model\'s weights', 'The task'], answer: 0, why: 'Verbal reinforcement: no gradient, just notes.', hint: 'Watch the memory fill.' },
    { q: 'A tool failed once for reasons outside the agent. Should it write a rule about it?', options: ['No: an outside fault becomes a superstition', 'Yes, always', 'Only if it fails twice'], answer: 0, why: 'The 60 kg rule blocked every correct load.', hint: 'Try Turn a one-off fault into a rule.' },
    { q: 'Which evaluator is the weakest?', options: ['The agent judging its own work', 'A test suite', 'A scale'], answer: 0, why: 'It agrees with itself; prefer a signal from the world.', hint: 'Try Let the actor mark its own load.' },
  ],
  terms: [
    ['Actor', 'The part that makes an attempt.'],
    ['Evaluator', 'What scores the attempt: the world, a rule, or the model itself.'],
    ['Self-reflector', 'Writes a sentence about why an attempt failed.'],
    ['Episodic memory', 'The reflections kept between attempts.'],
    ['Memory rot', 'Old or wrong reflections that pile up and mislead.'],
    ['Verbal reinforcement', 'Improving through written feedback instead of weight updates.'],
  ],
  deeper: '<p><b>Results.</b> The Reflexion paper improved on ReAct for decision-making, multi-hop question answering and code generation, where unit tests make an excellent scalar evaluator.</p><p><b>Keep memory healthy.</b> Give reflections an expiry, compact them, or let a separate process clean them up between sessions.</p><p><b>The same idea elsewhere.</b> Reflection nodes in agent graphs, saved lessons in a project notes file, and sleep-time agents that rewrite memory blocks all carry lessons forward in words.</p><p><b>About this machine.</b> The actor, the scale, the reflections and the rules they become are computed live; the actor prefers the heaviest load that its rules still allow.</p>',
  code: {
    title: 'Try, reflect, remember',
    note: 'Adapted from the course\'s Reflexion lesson.',
    text: `
def reflexion(actor, evaluate, reflect, trials=8, window=8):
    memory = []
    for t in range(trials):
        attempt = actor(memory[-window:])        # fresh attempt, reads the notes
        verdict = evaluate(attempt)              # prefer a signal from the world
        if verdict == "pass":
            return attempt, t + 1
        if verdict.external:                     # a broken tool is not a lesson
            continue
        memory.append(reflect(attempt, verdict)) # one sentence about why
    return None, trials
`,
  },
};
