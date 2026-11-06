// Specifications that preserve judgment (lesson 51): an Addis Ababa city-bus app adds seat holds. The spec is an executable contract of six
// surfaces (outcome, invariants, examples, non-goals, decisions, proof), and every decision is locked, bounded or delegated. Too little and the
// agent guesses; too much and it transcribes a wrong design behind five human checkpoints. Validation and the consequences are computed live.
const DEC = [
  { q: 'booking API response', mode: 'locked', limit: 'unchanged: partners read it', guess: 'renames status to state', over: 'unchanged' },
  { q: 'hold length', mode: 'bounded', limit: '5 to 15 minutes', guess: '30 minutes', over: 'exactly 10 minutes' },
  { q: 'retries to the seat map', mode: 'bounded', limit: 'at most 3, with backoff', guess: 'retries forever', over: 'exactly 2' },
  { q: 'where holds are stored', mode: 'delegated', limit: 'agent chooses and explains', guess: 'a new table', over: 'Redis keys with a TTL' },
  { q: 'function and table names', mode: 'delegated', limit: 'agent chooses', guess: 'its own names', over: 'dictated names' },
];
const SURF = ['outcome', 'invariants', 'examples', 'non-goals', 'decisions', 'proof'];
function spec(o) {
  const lvl = o.level;
  const decisions = DEC.map(d => ({ ...d, m: lvl === 0 ? 'unmarked' : lvl === 2 ? 'locked' : d.mode, shown: lvl === 0 ? d.guess : lvl === 2 ? d.over : d.limit }));
  const surf = {
    outcome: lvl === 0 ? 'add seat holds' : 'a rider holds a seat while paying;\nit frees itself if they don\'t',
    invariants: lvl === 0 ? '' : 'never held by two riders\nevery hold expires',
    examples: lvl === 0 ? '' : o.examples ? 'hold, pay · pay at 9:59 · map down\nhold a sold seat: refused' : 'robust, fast and user-friendly',
    'non-goals': lvl === 0 ? '' : 'no SMS on expiry · no change to fares',
    decisions: lvl === 0 ? '' : `${decisions.filter(d => d.m === 'locked').length} locked · ${decisions.filter(d => d.m === 'bounded').length} bounded · ${decisions.filter(d => d.m === 'delegated').length} delegated`,
    proof: lvl === 0 ? 'tests pass' : o.proofMatch ? 'race replay: 200 holds\non one seat, exactly 1 wins' : 'unit test:\nhold() returns a hold',
  };
  const bad = {
    outcome: lvl === 0, invariants: !surf.invariants, examples: !surf.examples || !o.examples, 'non-goals': !surf['non-goals'], decisions: lvl === 0, proof: lvl === 0 || !o.proofMatch,
  };
  const issues = SURF.filter(s => bad[s]);
  const checkpoints = decisions.filter(d => d.m === 'locked').length, agent = decisions.filter(d => d.m === 'delegated').length;
  return { decisions, surf, bad, issues, checkpoints, agent };
}

export default {
  slug: 'specs-that-preserve-judgment',
  title: 'Specifications that keep judgment where it belongs',
  description: 'An Addis Ababa city-bus app adds seat holds. Write a spec that locks what matters, bounds what can vary and leaves the rest to the agent.',
  overview: 'An underspecified task asks an agent to guess the system; an overspecified one asks it to copy a design that may already be wrong. The useful middle is an executable contract with six surfaces: the outcome (the observable result), invariants (what must always stay true), examples (concrete cases that reveal intent), non-goals (adjacent work deliberately left out), a decision policy and the proof required before completion. Mark each decision. Locked: the agent must not choose, for public compatibility, authority, safety, irreversible cost or a product commitment; these become human checkpoints. Bounded: the agent chooses inside explicit limits, such as a hold length between five and fifteen minutes or at most three retries. Delegated: the agent owns the choice and explains it, for local structure, names and reversible details. Examples compress intent better than adjectives: "robust" and "user-friendly" can\'t be checked, while "pay at 9:59" and "hold a sold seat: refused" can. Examples don\'t replace invariants, because one passing case can\'t prove a universal rule. Proof must match the claim: a unit test proves a function, a wire test proves transport, a browser journey proves an interface path, a replay proves behaviour over many cases and an audit log proves authority held; never accept a lower layer as proof of a higher claim. Leaving a choice open on purpose, with a boundary and a proof, is not vagueness. Keep the reason behind every locked and bounded choice so a later team can revise it without archaeology.',
  keywords: ['specifications', 'requirements', 'coding agents', 'acceptance criteria', 'AI agents', 'software design', 'delegation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.35, 0.3, -0.1], dir: [0.05, 1.0, 1.1], half: 1.15, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { level: 1, examples: true, proofMatch: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#D9483B', AMB = '#E3A72F', BLUE = '#5B8DB8';
    const MC = { locked: '#E07A5F', bounded: '#E3A72F', delegated: '#1F9E89', unmarked: '#A9A59A' };
    /* the spec as a stack of six surfaces (outcome at the bottom, proof on top): blue when filled and executable, red when missing or vague */
    const doc = P.stack(0.6, 0.45, 0.12, { max: 6, color: BLUE }); doc.position.set(-2.45, 0.02, 0); S.add(doc);
    /* each decision is a parcel sorted into a bay: locked (a person decides), bounded (a range), delegated (the agent chooses), or left unmarked */
    const COLS = ['locked', 'bounded', 'delegated', 'unmarked'], CX = k => -1.35 + k * 0.95;
    COLS.forEach((c, k) => { const b = P.box(0.8, 0.04, 0.95, MC[c], { r: 0.03 }); b.position.set(CX(k), 0, 0); S.add(b);
      if (c !== 'unmarked') { const h = c === 'locked' ? 0.35 : c === 'bounded' ? 0.15 : 0.04; [[-0.4, 0, 0.04, 0.95], [0.4, 0, 0.04, 0.95], [0, -0.475, 0.8, 0.04]].forEach(([x, z, w, d]) => { const wall = P.box(w, h, d, MC[c], { r: 0.01 }); wall.position.set(CX(k) + x, 0.04, z); S.add(wall); }); } });
    const parcels = DEC.map(() => { const m = new THREE.MeshLambertMaterial({ color: '#F4F1EA' }), b = P.box(0.24, 0.2, 0.24, '#fff', { r: 0.04, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    /* a person per human checkpoint, and the agent beside what it may choose */
    const ppl = P.stack(0.2, 0.2, 0.2, { max: 5, color: '#7B6FA8' }); ppl.position.set(CX(0), 0.04, -0.75); S.add(ppl);
    const bot = P.robot(CHAR, { scale: 0.6 }); bot.position.set(CX(2), 0, -0.75); S.add(bot);
    S.add(P.keep(-2.8, 2.05, 1.0, -0.95, 0.55));

    let R = null;
    function draw() {
      R = spec(st);
      doc.userData.set({ n: 6, colors: SURF.map(n => R.bad[n] ? RED : BLUE) });
      const count = {};
      R.decisions.forEach((d, i) => {
        const k = COLS.indexOf(d.m), row = count[k] = (count[k] || 0) + 1, C = parcels[i];
        C.b.position.set(CX(k) + ((row - 1) % 2 ? 0.17 : -0.17), 0.04, -0.25 + Math.floor((row - 1) / 2) * 0.3);
        C.m.color.set(st.level === 0 || (st.level === 2 && d.mode !== 'locked') ? RED : '#F4F1EA');
      });
      ppl.userData.set({ n: R.checkpoints, colors: Array(5).fill('#7B6FA8') });
      bot.userData.set({ busy: R.agent > 0 });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Concrete examples, not adjectives', short: 'Examples', get: () => st.examples, set: v => set({ examples: !!v }) },
      { type: 'toggle', label: 'Proof that matches the claim', short: 'Matching proof', get: () => st.proofMatch, set: v => set({ proofMatch: !!v }) },
      { type: 'buttons', label: 'Specification', options: ['Too little', 'Executable', 'Too much'], get: () => st.level, act: i => set({ level: i }) },
    ];
    const readouts = [
      { label: 'Contract', get: () => ({ v: R.issues.length ? 'incomplete' : 'executable', sub: R.issues.length ? `${R.issues.length} surface${R.issues.length === 1 ? '' : 's'} weak` : 'six surfaces', good: !R.issues.length, bad: !!R.issues.length }) },
      { label: 'Human checkpoints', get: () => ({ v: String(R.checkpoints), sub: st.level === 0 ? 'none: it guesses' : R.checkpoints > 2 ? 'a queue to wait in' : 'where it matters', good: st.level === 1, bad: st.level !== 1 }) },
      { label: 'Agent decides', get: () => ({ v: String(R.agent), sub: st.level === 0 ? 'everything, unmarked' : 'and explains', bad: st.level === 2 }) },
    ];
    const labels = [
      { name: 'surf', t: 'The spec', d: 'Outcome up to proof. Red: missing or vague', icon: 'book', atV: V(-2.75, 0.2, 0.23) },
      { name: 'locked', t: 'Locked', d: 'A person per checkpoint', icon: 'user', atV: V(CX(0) - 0.4, 0.2, 0.48) },
      { name: 'dec', t: 'Bounded, delegated', d: 'A range, or the agent\'s call', icon: 'scale', atV: V(CX(2) + 0.4, 0.2, 0.48) },
      { name: 'unm', t: 'Unmarked', d: 'The agent guesses', icon: 'info', atV: V(CX(3) + 0.4, 0.2, 0.48), hide: () => st.level !== 0 },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Specify too little', hint: 'the agent guesses', on: () => set({ ...D0, level: 0 }), off: reset },
      { label: 'Specify too much', hint: 'lock everything', on: () => set({ ...D0, level: 2 }), off: reset },
      { label: 'Accept a unit test as proof of a race', hint: 'proof below the claim', on: () => set({ ...D0, proofMatch: false }), off: reset },
    ];
    function status() {
      if (st.level === 0) return { ok: false, msg: '<b>"Add seat holds" and "tests pass" leave every decision unmarked, so the agent guesses: it renames status to state, which breaks the partner apps in Adama and Hawassa, holds seats for 30 minutes on busy routes, and retries the seat map forever.</b> Lock the public response, bound the hold length and retries, and delegate the rest.' };
      if (st.level === 2) return { ok: false, msg: '<b>Everything is locked, so there are five human checkpoints, and the agent faithfully copies a design that is already wrong: Redis keys with a TTL, on city servers that have no Redis.</b> Lock only what is public, unsafe or irreversible; bound what has a known safe range; delegate storage and names, and ask for an explanation.' };
      if (!st.proofMatch) return { ok: false, msg: '<b>"A seat is never held by two riders" is a claim about concurrency, and a unit test that hold() returns a hold can\'t prove it.</b> Proof must match the claim: a race replay, 200 parallel holds on one seat with exactly one winner.' };
      if (!st.examples) return { ok: false, msg: '<b>"Robust, fast and user-friendly" gives neither the builder nor the verifier anything to check.</b> Examples compress intent: hold then pay, pay at 9:59, the seat map down, and a hold on a sold seat that must be refused.' };
      return { ok: true, msg: '<b>Six surfaces filled; the public response locked with its reason, the hold length and retries bounded, storage and names left to the agent with an explanation; and a race replay as proof for the never-double-held invariant.</b> One checkpoint, where it matters.' };
    }
    return { update: dt => bot.userData.tick(dt), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Too little', home: true, say: 'A city-bus app in Addis Ababa adds seat holds. Specify too little, and the agent guesses, including at the public booking response.', act: m => m.set({ level: 0, examples: true, proofMatch: true }) },
    { t: 'Too much', home: true, say: 'Specify too much, and the agent copies a design that is already wrong, and waits at five checkpoints.', act: m => m.set({ level: 2, examples: true, proofMatch: true }) },
    { t: 'An executable contract', home: true, say: 'In between: an outcome, invariants, examples, non-goals, a decision policy and the proof.', act: m => m.set({ level: 1, examples: true, proofMatch: true }) },
    { t: 'Three decision modes', home: true, say: 'Lock what is public or unsafe. Bound what has a safe range. Delegate what is cheap to change, and ask for an explanation.', act: m => m.set({ level: 1, examples: true, proofMatch: true }) },
    { t: 'Examples, not adjectives', home: true, say: 'Robust and user-friendly can\'t be checked. Paying at one second before expiry can.', act: m => m.set({ level: 1, examples: false, proofMatch: true }) },
    { t: 'Proof that matches', home: true, say: 'A seat never held twice is a claim about a race, so the proof is a race replay, not a unit test.', act: m => m.set({ level: 1, examples: true, proofMatch: true }) },
  ],
  check: [
    { q: 'The public booking response is read by partner apps. Which mode?', options: ['Locked', 'Bounded', 'Delegated'], answer: 0, why: 'Public compatibility is a human checkpoint.', hint: 'Look at the locked column.' },
    { q: 'Where holds are stored is cheap to change. Which mode?', options: ['Delegated, with an explanation', 'Locked', 'Unmarked'], answer: 0, why: 'Leave reversible detail to the agent.', hint: 'Try Specify too much.' },
    { q: 'What proves "a seat is never held by two riders"?', options: ['A race replay with many parallel holds', 'A unit test of hold()', 'An example'], answer: 0, why: 'Proof must match the claim.', hint: 'Try Accept a unit test.' },
  ],
  terms: [
    ['Executable contract', 'Outcome, invariants, examples, non-goals, decisions and proof.'],
    ['Invariant', 'A condition that must always stay true.'],
    ['Locked', 'The agent must not choose; a person decides.'],
    ['Bounded', 'The agent chooses inside stated limits.'],
    ['Delegated', 'The agent owns the choice and explains it.'],
    ['Proof layer', 'Unit, wire, browser journey, replay or audit log, matched to the claim.'],
  ],
  deeper: '<p><b>Keep the reasons.</b> A locked choice with its reason ("partner apps read it") can be revised later without archaeology; one without a reason becomes folklore.</p><p><b>Open on purpose.</b> "Any read-only source that answers within the time budget" is a delegated decision with a boundary and a proof, not vagueness.</p><p><b>About this machine.</b> The decisions, guesses and dictated designs are fixed; the validation, modes, checkpoints and messages follow the controls live.</p>',
  code: {
    title: 'Validate the contract',
    note: 'Adapted from the course\'s executable specification (code/main.py).',
    text: `
VALID_MODES = {"locked", "bounded", "delegated"}

def validate(spec):
    issues = []
    for name in ("outcome", "invariants", "examples", "non_goals", "decisions", "proof"):
        if not getattr(spec, name):
            issues.append(f"{name} is required")
    for d in spec.decisions:
        if d.mode not in VALID_MODES:
            issues.append(f"{d.question}: unknown mode {d.mode}")
        if d.mode != "delegated" and not d.rationale.strip():
            issues.append(f"{d.question}: locked or bounded needs a reason")
    return issues

def compile_contract(spec):
    return {
        "agent_may_decide": [d.question for d in spec.decisions if d.mode == "delegated"],
        "agent_may_choose_within": {d.question: d.limit for d in spec.decisions if d.mode == "bounded"},
        "human_checkpoint": [d.question for d in spec.decisions if d.mode == "locked"],
    }
`,
  },
};
