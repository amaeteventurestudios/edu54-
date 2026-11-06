// Frame the task before code, and outcomes before output (lessons 43 and 47): a Nairobi savings co-operative asks its coding agent to
// "add duplicate phone protection" to the member app. An outcome statement is checked for solution leakage (a product form, interface, model or
// architecture not yet earned), a task frame records repository facts with receipts and classifies every unknown (discoverable, decidable, human,
// deferred), and acceptance evidence is written before the patch. Without a frame the agent fills gaps with plausible choices; the cost is computed live.
const OUTCOMES = [
  ['Build an AI duplicate-member checker', ['AI', 'checker']],
  ['Add a unique index on members.phone', ['unique index']],
  ['A member can\'t register a phone number already in use, and the 37 existing duplicate records stay readable for the audit', []],
];
const FACTS = [
  ['duplicates answer 409 "conflict"', 'members.py:88'],
  ['phones stored as typed', 'models.py:41'],
  ['37 members share a phone', 'SELECT … → 37 rows'],
  ['tests run with pytest -q', 'pyproject.toml'],
];
const UNKNOWNS = [
  ['+254 712… equals 0712…?', 'discoverable', 'normalise.py: yes'],
  ['error wording', 'decidable', 'reuse the 409 shape'],
  ['a migration over 37 rows?', 'human', 'ask the co-op\'s lead'],
  ['merge old duplicates', 'deferred', 'a non-goal for now'],
];
function plan(o) {
  const leak = OUTCOMES[o.out][1].length > 0;
  if (!o.frame) return { leak, buried: ['compares phones as typed', 'adds a migration that fails on 37 rows', 'invents a new 400 error'], paused: false, proof: o.namedTest ? 'test_duplicate_phone' : '"tests pass"' };
  return { leak, buried: [], paused: true, proof: o.namedTest ? 'test_duplicate_phone: 409 for both forms' : '"tests pass" (which test?)' };
}

export default {
  slug: 'frame-the-task-before-code',
  title: 'Frame the task before the code',
  description: 'A Nairobi savings co-operative asks its agent to stop duplicate phone numbers. Frame the task first: the outcome, facts with receipts, sorted unknowns and the proof.',
  overview: 'A coding agent implements a clear task quickly, and an unclear one just as quickly; the speed is the same, the cost is not. "Add duplicate phone protection" leaves open where uniqueness lives, whether +254 712… and 0712… are the same number, which error shape is already public, whether a migration is allowed, and which test proves it. A capable agent fills those gaps with plausible choices, and a clean, tested change can still be wrong for the system. Start with the outcome, not the output: who is affected, in what situation, what happens today, what should improve, the constraints that are fixed, and the non-goals. Watch for solution leakage: an outcome that names an AI checker or a unique index has already chosen the answer before any evidence. Then frame the task from the repository: the goal, facts with receipts (a file and line, better a command result), allowed and forbidden paths, acceptance evidence, and unknowns. Reconnaissance is a search for constraints (current behaviour, the nearest test, the public contract, project rules, build commands, a similar past change), and it stops when every decision is supported, delegated or listed. Classify each unknown: discoverable (the repo can answer), decidable (the task lets the agent choose), human (it changes product behaviour, cost, risk or compatibility: pause), or deferred (a non-goal). Write the proof before the patch: a named test and the claim it supports, not "tests pass".',
  keywords: ['task framing', 'requirements', 'coding agents', 'acceptance criteria', 'AI agents', 'product thinking', 'software engineering'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.75, 1.2], half: 1.15, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { out: 2, frame: true, namedTest: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', AMB = '#E3A72F';
    const UC = { discoverable: '#5B8DB8', decidable: '#1F9E89', human: '#E07A5F', deferred: '#8E8C84' };
    /* the outcome: a target on a post. A statement that names a solution sits on it as a red block, hiding what the co-operative wants */
    const tgt = P.cyl(0.32, 0.06, '#F4F1EA'); tgt.position.set(-2.45, 0.35, 0); tgt.rotation.x = Math.PI / 2; S.add(tgt);
    [0.22, 0.12].forEach((r, i) => { const c = P.cyl(r, 0.07 + i * 0.01, i ? RED : '#F4F1EA'); c.position.set(-2.45, 0.35, 0.005 + i * 0.005); c.rotation.x = Math.PI / 2; S.add(c); });
    const ring = P.cyl(0.27, 0.065, AMB); ring.position.set(-2.45, 0.35, -0.002); ring.rotation.x = Math.PI / 2; S.add(ring);
    const post = P.cyl(0.03, 0.35, '#6B6E7E'); post.position.set(-2.45, 0, -0.05); S.add(post);
    const leak = P.box(0.45, 0.45, 0.2, RED, { r: 0.05 }); leak.position.set(-2.45, 0.13, 0.12); S.add(leak);
    /* four repository facts: a block each with its receipt (file and line, or a command); with no frame they are guesses, in red */
    const FX = i => -1.7 + i * 0.36;
    const facts = FACTS.map((f, i) => { const m = new THREE.MeshLambertMaterial({ color: '#5B8DB8' }), b = P.box(0.26, 0.3, 0.26, '#fff', { r: 0.04, material: m }); b.position.set(FX(i), 0, 0); S.add(b); const r = P.box(0.2, 0.01, 0.16, '#FFFFFF', { r: 0.005 }); r.position.set(FX(i), 0.3, 0); S.add(r); return { m, r }; });
    /* the agent, then four bins for the unknowns: discoverable, decidable, ask a person (its lamp: the agent pauses), deferred */
    const bot = P.robot(CHAR, { scale: 0.7 }); bot.position.set(-0.15, 0, 0); S.add(bot);
    const BX = i => 0.55 + i * 0.45;
    const bins = UNKNOWNS.map((u, i) => { const bin = P.box(0.34, 0.16, 0.34, UC[u[1]], { r: 0.03 }); bin.position.set(BX(i), 0, 0); S.add(bin); const ball = P.ball(0.08, '#fff', { material: new THREE.MeshLambertMaterial({ color: '#F4F1EA' }) }); ball.userData.noFit = true; S.add(ball); return ball; });
    const ask = P.lamp(AMB, { h: 0.4, r: 0.08 }); ask.position.set(BX(2), 0.16, -0.1); S.add(ask);
    /* the proof, written before the patch: a named test (green) or "tests pass" (grey) */
    const proof = P.tower(0.3, 0.3, GOOD, { h: 0.5 }); proof.userData.set({ cap: '' }); proof.position.set(2.55, 0, 0); S.add(proof);
    S.add(P.keep(-2.8, 2.75, 0.9, -0.4, 0.4));

    let R = null;
    function draw() {
      R = plan(st);
      leak.visible = R.leak;
      FACTS.forEach((f, i) => { facts[i].m.color.set(st.frame ? '#5B8DB8' : i < R.buried.length ? RED : '#C9C4B6'); facts[i].r.visible = st.frame; });
      bins.forEach((b, i) => { if (st.frame) b.position.set(BX(i), 0.2, 0); else b.position.set(-0.15 + (i - 1.5) * 0.18, 0.08, 0.42); b.material.color.set(st.frame ? '#F4F1EA' : RED); });
      ask.userData.set({ on: st.frame && R.paused }); ask.visible = st.frame;
      proof.userData.set({ h: st.namedTest ? 0.55 : 0.2, color: st.namedTest ? GOOD : '#B9B3A6' });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Outcome statement', options: ['AI checker', 'Unique index', 'The result'], get: () => st.out, act: i => set({ out: i }) },
      { type: 'toggle', label: 'Frame the task from the repository first', short: 'Frame', get: () => st.frame, set: v => set({ frame: !!v }) },
      { type: 'toggle', label: 'Name the test that proves the goal', short: 'Named proof', get: () => st.namedTest, set: v => set({ namedTest: !!v }) },
    ];
    const readouts = [
      { label: 'Outcome', get: () => ({ v: R.leak ? 'leaks a solution' : 'a result', sub: OUTCOMES[st.out][0].slice(0, 28) + '…', bad: R.leak, good: !R.leak }) },
      { label: 'Buried assumptions', get: () => ({ v: String(R.buried.length), sub: st.frame ? 'facts have receipts' : 'plausible guesses', good: !R.buried.length, bad: R.buried.length > 0 }) },
      { label: 'Agent', get: () => ({ v: R.paused ? 'pauses to ask' : 'ships', sub: R.paused ? 'at the migration question' : 'a migration that fails', good: R.paused, bad: !R.paused }) },
    ];
    const labels = [
      { name: 'goal', t: 'The outcome', d: 'Red block: it names a solution', icon: 'target', atV: V(-2.75, 0.2, 0.13) },
      { name: 'facts', t: 'Facts with receipts', d: 'File and line, or a command. Red: a guess', icon: 'book', atV: V(FX(0) - 0.13, 0.2, 0.13) },
      { name: 'unk', t: 'Unknowns, sorted', d: 'Find out, decide, ask a person, defer', icon: 'info', atV: V(BX(3) + 0.17, 0.2, 0.13) },
      { name: 'proof', t: 'Proof first', d: 'A named test, written before the patch', icon: 'check', atV: V(2.7, 0.2, 0.13) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Start coding straight away', hint: 'no frame', on: () => set({ ...D0, frame: false }), off: reset },
      { label: 'Frame the outcome as a solution', hint: '"add a unique index"', on: () => set({ ...D0, out: 1 }), off: reset },
      { label: 'Accept "tests pass" as proof', hint: 'no named test', on: () => set({ ...D0, namedTest: false }), off: reset },
    ];
    function status() {
      if (!st.frame) return { ok: false, msg: `<b>Without a frame the agent filled every gap with a plausible choice: ${R.buried.join('; ')}.</b> The change is clean and tested, and wrong for this system. Look for the constraints first, back each fact with a receipt, and stop at the human question (is a migration allowed?) before burying it in code.` };
      if (R.leak) return { ok: false, msg: `<b>"${OUTCOMES[st.out][0]}" names a solution before any evidence.</b> The frame then argues about the index, not the result. State the outcome instead: a member can\'t reuse a phone number, and the 37 existing duplicates stay readable. That leaves room for an application check now and a migration later.` };
      if (!st.namedTest) return { ok: false, msg: '<b>"Tests pass" is not a proof plan: which test, proving which claim?</b> Name it before the patch: test_duplicate_phone returns 409 for both +254 712… and 0712…, with the existing error shape.' };
      return { ok: true, msg: '<b>Outcome stated without a solution; four facts with receipts; the phone-format question settled from normalise.py, the message reused, the migration sent to the co-op\'s lead, merging duplicates deferred; and the proof named before the patch.</b> Now the agent can be fast in the right direction.' };
    }
    return { update: dt => { proof.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A specific-sounding request', home: true, say: 'A savings co-operative in Nairobi asks its coding agent to add duplicate phone protection. It sounds specific. It is not.', act: m => m.set({ out: 1, frame: false, namedTest: false }) },
    { t: 'Plausible guesses', home: true, say: 'Starting straight away, the agent guesses: compare phones as typed, add a database constraint, invent a new error. Each guess is reasonable, and wrong here.', act: m => m.set({ out: 1, frame: false, namedTest: false }) },
    { t: 'The outcome first', home: true, say: 'State the result, not a solution: a member can\'t reuse a phone number, and existing duplicates stay readable.', act: m => m.set({ out: 2, frame: false, namedTest: false }) },
    { t: 'Facts with receipts', home: true, say: 'Search the repository for the constraints: the existing error shape, how phones are stored, how many duplicates exist. Each fact gets a receipt.', act: m => m.set({ out: 2, frame: true, namedTest: false }) },
    { t: 'Sort the unknowns', home: true, say: 'Some unknowns the repo can answer; some the agent may choose; one, the migration, belongs to a person. The agent pauses there.', act: m => m.set({ out: 2, frame: true, namedTest: false }) },
    { t: 'Proof before the patch', home: true, say: 'Name the test that proves the goal before writing any code.', act: m => m.set({ out: 2, frame: true, namedTest: true }) },
  ],
  check: [
    { q: 'Which outcome statement leaks a solution?', options: ['"Add a unique index on members.phone"', '"A member can\'t reuse a phone number"', 'Both are fine'], answer: 0, why: 'It chooses the answer before the evidence.', hint: 'Try Frame the outcome as a solution.' },
    { q: 'Allowing a migration over existing duplicate data is which kind of unknown?', options: ['Human: it changes data and risk', 'Discoverable', 'Decidable'], answer: 0, why: 'Pause before burying it in code.', hint: 'Read the unknowns.' },
    { q: 'What makes a fact in a task frame trustworthy?', options: ['A receipt: a file and line, or a command result', 'It sounds right', 'The agent said so'], answer: 0, why: 'Facts need evidence.', hint: 'Read the facts panel.' },
  ],
  terms: [
    ['Outcome frame', 'User, situation, current behaviour, desired outcome, constraints, non-goals.'],
    ['Solution leakage', 'An outcome that names a product form or architecture too early.'],
    ['Task frame', 'Goal, facts with receipts, paths, acceptance evidence, unknowns.'],
    ['Receipt', 'Evidence for a fact: a file and line, or a command result.'],
    ['Human unknown', 'A choice that changes behaviour, cost, risk or compatibility.'],
    ['Non-goal', 'Tempting adjacent work, explicitly excluded.'],
  ],
  deeper: '<p><b>When to stop reading.</b> Reconnaissance ends when every planned decision is supported, delegated or listed as an unknown; more reading after that is often avoidance.</p><p><b>Constraints are part of the goal.</b> No production writes during diagnosis, no new runtime dependency, accessibility intact: a build that breaks a constraint hasn\'t reached the outcome.</p><p><b>About this machine.</b> The facts, unknowns and the unframed agent\'s guesses are fixed; leakage detection and the plan follow the choices live.</p>',
  code: {
    title: 'A task frame as data',
    note: 'Adapted from the course\'s task-framing lessons.',
    text: `
frame = {
  "goal": "registering a phone already in use returns 409; existing duplicates stay readable",
  "facts": [
    {"claim": "duplicates return 409 {'error': 'conflict'}", "receipt": "api/handlers/members.py:88"},
    {"claim": "37 members share a phone", "receipt": "SELECT phone, count(*) ... -> 37 rows"},
  ],
  "allowed": ["api/handlers/members.py", "tests/test_members.py"],
  "forbidden": ["migrations/**"],
  "acceptance": ["pytest tests/test_members.py::test_duplicate_phone"],
  "unknowns": [
    {"q": "unique constraint + migration?", "kind": "human"},      # pause here
    {"q": "merge existing duplicates", "kind": "deferred"},
  ],
}
`,
  },
};
