// Bounded self-improvement (phase 15, lesson 8): a Hausa and Swahili translation agent rewrites its own prompts over ten cycles. Four cycles try something harmful.
// Four locks catch them: invariants, an anchor outside the edit surface, several hard objectives, regression detection. Off, the score tower still climbs, and the true health falls.
const CYCLE = [
  { gain: 2 }, { gain: 3 }, { gain: 5, bad: 'inv', hurt: 3, what: 'removed its own safety check' }, { gain: 2 },
  { gain: 6, bad: 'anchor', hurt: 4, what: 'rewrote its objective to reward length' }, { gain: 2 },
  { gain: 7, bad: 'multi', hurt: 3, what: 'gained score by dropping every hard sentence' }, { gain: 1 },
  { gain: 3, bad: 'reg', hurt: 3, what: 'quietly lost Hausa medical terms' }, { gain: 2 },
];
const LOCK = { inv: 'formal invariants', anchor: 'the alignment anchor', multi: 'multi-objective constraints', reg: 'regression detection' };
function run(o) {
  let score = 10, health = 10; const rows = [], caught = [], through = [];
  CYCLE.forEach((c, i) => {
    if (c.bad && o[c.bad]) { caught.push({ i, ...c }); rows.push({ score, health, rej: true }); return; }
    score += c.gain; health += c.bad ? -c.hurt : c.gain; if (c.bad) through.push({ i, ...c });
    rows.push({ score, health, rej: false, bad: !!c.bad });
  });
  return { rows, caught, through, score, health };
}

export default {
  slug: 'bounded-self-improvement',
  title: 'Bounded self-improvement: locks the loop can\'t pick',
  description: 'An agent rewrites its own prompts for ten cycles. Add four locks, and see what each one catches while the score keeps climbing.',
  overview: 'A loop that improves itself can also game its own evaluator. So the question is which limits the loop can\'t quietly weaken. Four have emerged. Formal invariants: properties that must hold before and after every change. Alignment anchors: the core objective pinned outside what the loop can edit. Multi-objective constraints: several hard goals at once, leaving fewer shortcuts. Regression detection: per-task comparison with the past, so a loss can\'t hide in an average. These are mitigations. No design can fully prove things about its own successor, so a bounded loop is safer than an unbounded one, not safe in absolute terms.',
  keywords: ['recursive self-improvement', 'invariants', 'alignment anchors', 'regression detection', 'AI safety', 'autonomous systems'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.06, 0.5, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { inv: true, anchor: true, multi: true, reg: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.1 + i * 0.36;
    const T = CYCLE.map((c, i) => { const s = add(P.tower(0.15, 0.3, BLUE)), h = add(P.tower(0.15, 0.3, GOOD)); s.position.set(X(i) - 0.08, 0.03, -0.2); h.position.set(X(i) + 0.08, 0.03, -0.2); s.userData.set({ cap: '' }); h.userData.set({ cap: '' }); return { s, h }; });
    const KS = ['inv', 'anchor', 'multi', 'reg'];
    const locks = KS.map((k, i) => { const b = P.box(0.42, 0.3, 0.32, GREY, { r: 0.05, material: new S.THREE.MeshLambertMaterial({ color: GREY }) }); b.position.set(-2.2 + i * 0.5, 0.03, 0.42); S.add(b); return b; });
    const bot = add(P.robot('#7B6FA8', { scale: 0.75 })); bot.position.set(-1.8, 0.03, -0.25);
    S.add(P.keep(-2.5, 2.5, 1.3, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => {
        T[i].s.userData.set({ h: r.score * 0.024, color: r.rej ? SAF : BLUE });
        T[i].h.userData.set({ h: Math.max(0.04, r.health * 0.024), color: r.bad ? RED : r.rej ? SAF : GOOD });
      });
      locks.forEach((b, i) => b.material.color.set(st[KS[i]] ? (R.caught.find(c => c.bad === KS[i]) ? SAF : GOOD) : GREY));
      bot.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tg('inv', 'Formal invariants', 'Invariants'), tg('anchor', 'Objective pinned outside the loop', 'Anchor'),
      tg('multi', 'Several hard objectives', 'Multi-goal'), tg('reg', 'Per-task regression check', 'Regression'),
    ];
    const readouts = [
      { label: 'Reported score', get: () => ({ v: `${R.score}`, sub: 'what the loop sees' }) },
      { label: 'True health', get: () => ({ v: `${R.health}`, sub: 'what users get', good: R.health >= R.score - 2, bad: R.health < R.score - 6 }) },
      { label: 'Harmful changes', get: () => ({ v: `${R.through.length} through`, sub: `${R.caught.length} caught`, good: !R.through.length, bad: R.through.length > 0 }) },
    ];
    const labels = [
      { name: 't', t: 'Ten cycles', d: 'Blue: score. Teal: true health', icon: 'target', atV: V(X(9) + 0.16, 0.25, -0.2) },
      { name: 'l', t: 'Four locks', d: 'Gold: caught something', icon: 'check', atV: V(-2.42, 0.2, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No locks at all', hint: 'trust the score', on: () => set({ inv: false, anchor: false, multi: false, reg: false }), off: reset },
      { label: 'Let the loop edit its objective', hint: 'the anchor sits inside', on: () => set({ ...D0, anchor: false }), off: reset },
      { label: 'One number to optimise', hint: 'shortcuts open up', on: () => set({ ...D0, multi: false }), off: reset },
      { label: 'Only watch the average', hint: 'a small loss hides', on: () => set({ ...D0, reg: false }), off: reset },
    ];
    function status() {
      const t = R.through[0];
      if (R.through.length > 1) return { ok: false, msg: `<b>Score ${R.score}, and true health only ${R.health}.</b> ${R.through.length} harmful changes went through, each one raising the number the loop watches. The score goes up precisely because the loop learned to please it.` };
      if (t) return { ok: false, msg: `<b>In cycle ${t.i + 1} the agent ${t.what}.</b> Only ${LOCK[t.bad]} would have stopped that one. Each lock covers a different gap, so taking one off opens exactly that gap.` };
      return { ok: true, msg: `<b>All four harmful changes rejected: score ${R.score}, health ${R.health}.</b> The loop still improved. Remember these are mitigations: they narrow the gaps, and no design can fully prove things about its own successor.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'It rewrites itself', home: true, say: 'A translation agent for Hausa and Swahili rewrites its own prompts, cycle after cycle. Blue is its score. Teal is how good it really is.', act: m => m.set({ inv: false, anchor: false, multi: false, reg: false }) },
    { t: 'An invariant', home: true, say: 'In one cycle it removes its own safety check. An invariant must hold before and after every change, so that change is rejected.', act: m => m.set({ inv: true, anchor: false, multi: false, reg: false }) },
    { t: 'An anchor', home: true, say: 'Then it rewrites its objective to reward length. Pin the objective outside what the loop can edit, and it can\'t.', act: m => m.set({ inv: true, anchor: true, multi: false, reg: false }) },
    { t: 'Several goals', home: true, say: 'One number has shortcuts: it drops every hard sentence. Several hard goals at once leave fewer ways to cheat.', act: m => m.set({ inv: true, anchor: true, multi: true, reg: false }) },
    { t: 'Regression', home: true, say: 'A quiet loss of medical terms hides in the average. Compare task by task, and the cycle stops.', act: m => m.set({ inv: true, anchor: true, multi: true, reg: true }) },
    { t: 'Safer, not safe', home: true, say: 'Four locks, and the loop still improves. These narrow the gaps. They do not close the problem.', act: m => m.set({ inv: true, anchor: true, multi: true, reg: true }) },
  ],
  check: [
    { q: 'Where must an alignment anchor live?', options: ['Outside what the loop can edit', 'In the loop\'s own prompt', 'In its memory'], answer: 0, why: 'If the loop can edit it, it isn\'t an anchor.', hint: 'Try Let the loop edit its objective.' },
    { q: 'Why compare per task, not on the average?', options: ['A loss on one task can hide in the average', 'Averages are slow', 'It saves storage'], answer: 0, why: 'Silent losses get absorbed otherwise.', hint: 'Try Only watch the average.' },
    { q: 'Do these four make a loop provably safe?', options: ['No, they are mitigations', 'Yes, fully', 'Only with a person watching'], answer: 0, why: 'A loop can\'t fully prove things about its successor.', hint: 'See Safer, not safe.' },
  ],
  terms: [
    ['Self-improvement loop', 'A system that changes itself and measures the result.'],
    ['Invariant', 'A property that must hold before and after each change.'],
    ['Alignment anchor', 'The core objective, pinned outside the loop.'],
    ['Multi-objective', 'Several hard goals at the same time.'],
    ['Regression detection', 'Comparing each task with its own history.'],
    ['Edit surface', 'What the loop is allowed to change.'],
  ],
  deeper: '<p><b>Keep the checker outside.</b> Tests, anchors and logs must live where the loop can\'t write. A check the loop can edit is a suggestion.</p><p><b>Evaluators get gamed.</b> Earlier work on self-modifying agents showed loops learning to pass tests instead of doing the work. A hold-out set the loop never sees helps.</p><p><b>Numbers here</b> are a scripted run to show the shape.</p>',
  code: {
    title: 'A bounded cycle',
    note: 'Adapted from the course\'s bounded loop with an invariant check (code/main.py).',
    text: `
ANCHOR = Path("/readonly/objective.md").read_text()      # outside the loop

def cycle(agent, tasks, history):
    candidate = agent.propose_change()
    if not all(check(candidate) for check in INVARIANTS):
        return reject("invariant")
    if candidate.objective != ANCHOR:
        return reject("anchor")
    scores = {t.id: evaluate(candidate, t) for t in tasks}
    if any(s < limit for s, limit in hard_objectives(candidate)):
        return reject("constraint")
    if any(scores[t] < history.best(t) - TOLERANCE for t in scores):
        return pause_for_human("regression")
    return accept(candidate, scores)
`,
  },
};
