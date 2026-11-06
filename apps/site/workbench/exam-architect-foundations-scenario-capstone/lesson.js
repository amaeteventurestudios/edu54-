// Exam prep, architect foundations capstone: an invented software and services company in Cape Town runs six kinds of Claude work (support
// resolution, code generation, multi-agent research, developer productivity, CI review and structured extraction) on one architecture with five
// gates: orchestration, tool contracts, Claude Code configuration, structured output and review, and context reliability. The readiness matrix
// shows which lenses each gate's invariant protects; switch an invariant off and see which scenarios become blocked and what fails. Illustrative.
const GATES = [
  { n: 'orchestration', s: 'code orders fixed steps; bounded subagents return complete, partial or blocked' },
  { n: 'tool contracts', s: 'one action per tool, closed schemas, scoped permissions, structured errors' },
  { n: 'Claude Code config', s: 'shared versioned guidance, path rules, CI from a clean commit' },
  { n: 'output and review', s: 'nullable fields, four validation layers, a separate reviewer' },
  { n: 'context reliability', s: 'provenance, a manifest, partial states, revalidate on resume' },
];
const LENSES = [
  { n: 'support', t: 'draft a resolution from active policy and case evidence', f: { 0: 'the refund executor sat inside the agent loop, with no authority boundary', 1: 'a conflict error was retried blindly and the refund ran twice', 3: 'a reply claimed a refund that no tool result supports', 4: 'two approved policies conflicted and the agent picked one' } },
  { n: 'code generation', t: 'patch a request parser in a monorepo', f: { 0: 'every explorer got the whole repository and they duplicated work', 1: 'a write tool had no declared side effects', 2: 'the parser rule lived in one developer\'s local config', 4: 'a resumed session followed a plan from before the branch changed' } },
  { n: 'research', t: 'compare three migration approaches', f: { 0: 'a subagent broke its result schema and the coordinator merged it', 3: 'the reviewer shared the writers\' context', 4: 'one source timed out and its partial results were read as complete' } },
  { n: 'productivity', t: 'turn an approved decision into an ADR and tasks', f: { 2: 'the team\'s ADR template sat in someone\'s user memory', 4: 'stale conversational state overrode the approved decision' } },
  { n: 'CI review', t: 'review a pull request from a clean checkout', f: { 1: 'the pipeline was granted production deployment just because it could', 2: 'CI picked up a hidden local instruction absent from the repository', 3: 'findings were free text with no stable IDs to verify later' } },
  { n: 'extraction', t: 'normalise change notices into records', f: { 1: 'the extraction tool shared authority with a write tool', 3: 'records were valid JSON with invented effective dates', 4: 'a record cited the wrong version of the notice' } },
];

function run(o) {
  const cells = LENSES.map(l => GATES.map((g, j) => (l.f[j] && !o.on[j] ? 'bad' : l.f[j] ? 'ok' : 'na')));
  const blocked = cells.map(r => r.includes('bad'));
  return { cells, blocked, nBlocked: blocked.filter(Boolean).length, ok: o.on.every(Boolean) };
}

export default {
  slug: 'exam-architect-foundations-scenario-capstone',
  title: 'Exam prep capstone: one architecture, six contexts',
  description: 'Six kinds of Claude work run on one architecture with five shared gates. Switch a gate off and watch which scenarios fall on the pegboard.',
  overview: 'Scenario-based architecture questions test transfer: the business details change, but the same decisions recur. Which sequence is deterministic and which choice needs model reasoning? Which context owns each concern? Which tools are visible, authorised and retryable? Where does shared Claude Code guidance live? How does a typed result become semantically and evidentially valid? What state survives failure, compaction, resume and handoff? Rather than six unrelated diagrams, build one core architecture with explicit variation points and test it through five gates. Orchestration: tasks, prerequisites, context boundaries, allowed tools, complete or partial states and merge rules, with code for fixed ordering and model reasoning for semantic choices; an executor with authority sits outside the reasoning loop. Tool and MCP contracts: one action and object per tool, selection guidance, closed schemas, permission scope, declared side effects and structured errors; resources for context, tools for actions, prompts for reusable templates; CI needs read, search and test, not deployment. Claude Code configuration: concise shared guidance, path rules, skills and commands, hooks for deterministic gates, and CI from a clean commit with bounded tools and structured findings. Output and review: criteria before wording, boundary examples, representable unknowns, four validation layers, bounded retries with specific errors, and a separate reviewer. Context reliability: clear constraints, small evidence slices with provenance, honest trimming, manifests and side-effect records outside the conversation, revalidation on resume, and evidence-based confidence with stratified review. Architecture quality shows in failure behaviour, so for each fixture name detection, containment, retry or escalation, durable state and the human owner. The company is invented; this course does not reproduce exam scenarios.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'capstone', 'architecture', 'scenarios', 'orchestration', 'tool contracts', 'context reliability', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.2, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { lens: 0, on: [true, true, true, true, true] }, st = { lens: 0, on: [...D0.on] };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* five gates across the back, one per shared invariant */
    const X = j => -0.9 + j * 0.52, Z = i => -0.5 + i * 0.2;
    const posts = GATES.map((g, j) => { const b = P.gate(0.4, GOOD, { h: 0.36 }); b.position.set(X(j), 0, -0.82); S.add(b); return b; });
    /* the readiness pegboard: six scenarios by five gates; a peg rises teal where a gate protects a scenario, red where it is lost */
    const rows = LENSES.map((l, i) => {
      const m = new THREE.MeshLambertMaterial({ color: OFF }), pad = P.box(2.72, 0.04, 0.17, '#fff', { r: 0.02, material: m }); pad.position.set(0.14, 0, Z(i)); S.add(pad);
      const lamp = P.lamp(GOOD, { h: 0.1, r: 0.085 }); lamp.position.set(-1.45, 0, Z(i)); S.add(lamp);
      const pegs = GATES.map((g, j) => { const t = P.tower(0.2, 0.12, OFF, { h: 0.04 }); t.userData.set({ cap: '' }); t.position.set(X(j), 0.04, Z(i)); S.add(t); return t; });
      return { m, lamp, pegs };
    });
    S.add(P.keep(-1.7, 1.6, 0.6, -1.0, 0.65));
    const parts = rows.flatMap(r => r.pegs);

    let R = null;
    function draw() {
      R = run(st);
      posts.forEach((b, j) => { b.visible = !!st.on[j]; });
      rows.forEach((g, i) => {
        g.m.color.set(i === st.lens ? SAF : '#E4DED2');
        g.lamp.userData.set({ color: R.blocked[i] ? RED : GOOD, on: true });
        g.pegs.forEach((t, j) => { const v = R.cells[i][j]; t.userData.set({ h: v === 'na' ? 0.03 : v === 'bad' ? 0.42 : 0.2, color: v === 'bad' ? RED : v === 'ok' ? GOOD : OFF }); });
      });
    }
    draw();
    const set = p => { if (p.on) st.on = [...p.on]; if (p.lens !== undefined) st.lens = p.lens; draw(); };
    const gate = j => ({ type: 'toggle', label: `Gate ${j + 1}: ${GATES[j].n}`, short: GATES[j].n, hint: GATES[j].s, get: () => st.on[j], set: v => { const on = [...st.on]; on[j] = !!v; set({ on }); } });
    const controls = [
      { type: 'buttons', label: 'Scenario', options: LENSES.map(l => l.n), get: () => st.lens, act: i => set({ lens: i }) },
      gate(0), gate(1), gate(2), gate(3), gate(4),
    ];
    const readouts = [
      { label: 'Scenarios blocked', get: () => ({ v: `${R.nBlocked} of 6`, sub: 'by an invariant that is off', good: R.nBlocked === 0, bad: R.nBlocked > 0 }) },
      { label: 'Gates holding', get: () => ({ v: `${st.on.filter(Boolean).length} of 5`, sub: 'shared invariants', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'm', t: 'Six scenarios', d: 'Gold row: the one you picked', icon: 'target', atV: V(-1.6, 0.15, 0.1) },
      { name: 't', t: 'Five gates', d: 'Red pegs: what falls without one', icon: 'check', atV: V(1.3, 0.3, -0.82) },
    ];
    const reset = () => set({ on: [true, true, true, true, true] });
    const breaks = [
      { label: 'Loosen the tool contracts', hint: 'four scenarios feel it', on: () => set({ lens: 4, on: [true, false, true, true, true] }), off: reset },
      { label: 'Keep config on one laptop', hint: 'CI and code generation drift', on: () => set({ lens: 1, on: [true, true, false, true, true] }), off: reset },
      { label: 'Trust valid JSON', hint: 'schema is not evidence', on: () => set({ lens: 5, on: [true, true, true, false, true] }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>All five gates hold, so every scenario passes: ${LENSES[st.lens].n} (${LENSES[st.lens].t}) is protected by ${Object.keys(LENSES[st.lens].f).map(j => GATES[j].n).join(', ')}.</b> The same invariants carry over; only the variation points change.` };
      const off = GATES.map((g, j) => j).filter(j => !st.on[j]);
      const hits = off.map(j => `${GATES[j].n} off: ${LENSES.filter(l => l.f[j]).map(l => `${l.n} (${l.f[j]})`).join('; ')}`);
      return { ok: false, msg: `<b>${R.nBlocked} of 6 scenarios blocked.</b> ${hits.join('. ').replace(/^./, c => c.toUpperCase())}.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Six diagrams', home: true, say: 'An architect drew six unrelated diagrams and could not say why one step is a tool and another a subagent.', act: m => m.set({ lens: 0, on: [false, false, false, false, false] }) },
    { t: 'Orchestration', home: true, say: 'Code orders the fixed steps; bounded subagents return complete, partial or blocked.', act: m => m.set({ lens: 2, on: [true, false, false, false, false] }) },
    { t: 'Tool contracts', home: true, say: 'One action per tool, closed schemas, scoped permissions and structured errors.', act: m => m.set({ lens: 0, on: [true, true, false, false, false] }) },
    { t: 'Shared configuration', home: true, say: 'Guidance lives in the repository, and CI starts from a clean commit.', act: m => m.set({ lens: 4, on: [true, true, true, false, false] }) },
    { t: 'Output and review', home: true, say: 'Valid JSON is not evidence. Validate in layers and review in a separate context.', act: m => m.set({ lens: 5, on: [true, true, true, true, false] }) },
    { t: 'Context reliability', home: true, say: 'Provenance, a manifest and partial states hold the last scenarios. One architecture now fits all six.', act: m => m.set({ lens: 3, on: [true, true, true, true, true] }) },
  ],
  check: [
    { q: 'What does a CI review pipeline need from its tools?', options: ['Read, search and test, not deployment', 'Production deployment', 'Every tool available'], answer: 0, why: 'Do not grant authority because a pipeline can run it.', hint: 'Try Loosen the tool contracts.' },
    { q: 'Where should a team\'s parser rule live?', options: ['In versioned project guidance or a path rule', 'In one developer\'s local config', 'In the CI log'], answer: 0, why: 'Hidden local config cannot govern team work.', hint: 'Try Keep config on one laptop.' },
    { q: 'An extraction record is valid JSON with an invented date. Which gate should stop it?', options: ['Output and review: semantic and provenance checks', 'Orchestration', 'None: it is valid'], answer: 0, why: 'Schema is not evidence.', hint: 'Try Trust valid JSON.' },
  ],
  practice: [
    { q: 'A source times out after returning valid partial results. What should the design do?', options: ['Keep the valid part, mark the result partial and re-delegate the gap', 'Treat it as complete', 'Discard everything', 'Retry forever'], answer: 0, why: 'Partial is a first-class state.' },
    { q: 'A tool returns a conflict error. Retry?', options: ['Not blindly: reconcile state first', 'Yes, immediately', 'Yes, with a bigger model', 'Ignore the error'], answer: 0, why: 'Conflicts need reconciliation, not retries.' },
    { q: 'In support resolution, where does the refund executor belong?', options: ['Outside the reasoning loop, behind its own authority boundary', 'Inside the agent loop', 'In the system prompt', 'In the reviewer'], answer: 0, why: 'Authority is a separate boundary.' },
    { q: 'For multi-agent research, how should work fan out?', options: ['By non-overlapping question, reduced by claim ID', 'Every agent gets the whole topic', 'One agent per paragraph', 'Randomly'], answer: 0, why: 'Avoid duplicate work and conflicts.' },
    { q: 'A resumed session follows a plan made before the branch changed. Which gate fixes it?', options: ['Context reliability: revalidate on resume', 'Tool contracts', 'Output format', 'None'], answer: 0, why: 'A session ID does not prove the world is unchanged.' },
    { q: 'What is the best way to prepare for scenario questions?', options: ['One decision method with explicit variation points', 'Memorise one topology per scenario', 'Always choose multi-agent', 'Always choose a single call'], answer: 0, why: 'Scenarios are lenses, not templates.' },
  ],
  terms: [
    ['Scenario lens', 'A context that stresses part of one architecture.'],
    ['Variation point', 'Where one scenario differs from the shared core.'],
    ['Invariant', 'A rule that must hold in every scenario.'],
    ['Readiness matrix', 'Scenarios against gates, showing what each gate protects.'],
    ['Failure fixture', 'A planted failure used to test detection and recovery.'],
    ['Authority boundary', 'Where a separate identity and approval control an action.'],
  ],
  deeper: '<p><b>Failure packets.</b> For each fixture, name detection, containment, retry or escalation, the durable state and the human owner.</p><p><b>Cross-scenario deltas.</b> When one scenario needs a change, write it as a delta that keeps the shared invariant.</p><p><b>About this machine.</b> The company and scenarios are invented, not exam items.</p>',
  code: {
    title: 'Check invariants, not prose',
    note: 'Written for this lesson.',
    text: `
def check(packet):
    errs = []
    for t in packet.tasks:
        if t.reasoning and t.kind == "fixed_order": errs.append(f"{t.id}: fixed order belongs in code")
        if t.result_states != {"complete", "partial", "blocked"}: errs.append(f"{t.id}: result states")
    for tool in packet.tools:
        if tool.schema.get("additionalProperties", True): errs.append(f"{tool.name}: open schema")
        if tool.writes and not tool.needs_fresh_approval: errs.append(f"{tool.name}: write without approval")
    if packet.ci.inherits_local_config: errs.append("ci: hidden local config")
    if not packet.output.validators >= {"syntax", "schema", "semantic", "provenance"}: errs.append("output layers")
    if not packet.context.revalidate_on_resume: errs.append("context: resume")
    return errs
`,
  },
};
