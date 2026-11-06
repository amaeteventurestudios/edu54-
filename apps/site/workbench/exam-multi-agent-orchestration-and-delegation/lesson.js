// Exam prep, multi-agent orchestration: an invented consultancy in Accra produces a market report on solar-lamp retailers with a coordinator
// and four specialists: market sizing, competitor list, pricing analysis (which needs the competitor list) and an independent reviewer. The
// coordinator restricts each role's tools, asks for compact structured results, runs only independent tasks in parallel, gives the reviewer a
// fresh context with the draft, evidence and rubric, and re-delegates only the gaps the review finds. Outcomes use illustrative figures.
function run(o) {
  const ctx = o.structured ? 12 : 180;
  const rework = o.parallelSmart ? 0 : 1;
  const caught = o.freshReview ? 4 : 1;
  const risky = o.scoped ? 0 : 1;
  const cost = (o.structured ? 1 : 1.6) * (o.parallelSmart ? 1 : 1.25) * (o.gapsOnly ? 1 : 1.9);
  return { ctx, rework, caught, risky, cost };
}

export default {
  slug: 'exam-multi-agent-orchestration-and-delegation',
  title: 'Exam prep: orchestrate bounded specialists',
  description: 'A consultancy builds a market report with a coordinator and four specialists. Bound each role, shape what comes back, and see what independence catches.',
  overview: 'Multi-agent designs help when work splits into parts that benefit from isolated context or genuine parallelism; they hurt when they are used to dodge an overgrown prompt. A strong pattern is a coordinator with a few bounded specialists. The coordinator decomposes the task, delegates each part with a clear contract, and assembles the result; it should not become a data warehouse. Ask specialists for compact, structured results, with partial states and the provenance of sources and errors, and keep detailed evidence outside the coordinator\'s context, because raw transcripts flood it and bury what matters. Restrict tools per role: the agent searching the web does not need to write to the customer database. Run tasks in parallel only when they are independent; a pricing analysis that needs the competitor list should wait for it, or it works from stale assumptions and must be redone. A fixed, deterministic step does not need an agent at all; call code or a tool. Review independently: a reviewer that shares the writers\' context inherits their framing and becomes a style editor, so give it a fresh context with only the artifact, the evidence and a rubric. When the review finds gaps, re-delegate only those gaps rather than rerunning everything. Enforce prerequisites and authority structurally, in the orchestration code, not by asking agents to remember them. And as with any change, measure decompositions against the same evaluation cases. This machine follows an invented consultancy in Accra; the figures are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'multi-agent', 'orchestration', 'subagents', 'delegation', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.05], dir: [0.05, 1.1, 1.05], half: 1.2, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { scoped: true, structured: true, parallelSmart: true, freshReview: true, gapsOnly: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', CHAR = '#3B3F52';
    /* the coordinator at the back, with a tank of its own context */
    const co = P.robot(CHAR, { scale: 0.75 }); co.position.set(-0.5, 0, -0.9); S.add(co);
    const ctx = P.tank(0.36, 0.8, 0.36, BLUE); ctx.position.set(0.1, 0, -0.9); S.add(ctx);
    /* four specialists in front, each on a pipe to the coordinator; competitor list feeds pricing by a gold rod */
    const SX = i => -2.0 + i * 1.0, SZ = 0.35;
    const specs = [0, 1, 2, 3].map(i => {
      const r = P.robot(i === 3 ? '#7B6FA8' : GOOD, { scale: 0.55 }); r.position.set(i === 3 ? SX(i) + 0.3 : SX(i), 0, SZ); S.add(r);
      const p = P.pipe([V(-0.5, 0.25, -0.78), V((SX(i) - 0.5) / 2, 0.4, -0.2), V(SX(i), 0.3, SZ - 0.12)], GOOD, { r: 0.022, n: 4 }); S.add(p);
      return { r, p };
    });
    const dep = P.rod(V(SX(1) + 0.16, 0.14, SZ), V(SX(2) - 0.16, 0.14, SZ), 0.024, SAF); S.add(dep);
    /* the reviewer behind a wall: a fresh context, with lamps for the four planted issues */
    const wall = P.box(0.06, 0.55, 0.8, '#A9B8C9', { r: 0.01 }); wall.position.set(SX(2) + 0.62, 0, SZ); S.add(wall);
    const iss = [0, 1, 2, 3].map(k => { const l = P.lamp(GOOD, { h: 0.12, r: 0.07 }); l.position.set(SX(3) + 0.3 - 0.27 + k * 0.18, 0, SZ + 0.5); S.add(l); return l; });
    /* the customer system search agents should never touch, wired up when tools are not restricted; and the run's relative cost */
    const crm = P.box(0.46, 0.42, 0.42, '#A87A4F', { r: 0.04 }); crm.position.set(-1.75, 0, -0.9); S.add(crm);
    const reach = [0, 1].map(i => { const m = P.rod(V(SX(i), 0.25, SZ - 0.1), V(-1.75, 0.25, -0.7), 0.018, BAD); S.add(m); return m; });
    const costT = P.tower(0.4, 0.4, '#E3A72F'); costT.userData.set({ cap: '' }); costT.position.set(2.0, 0, -0.75); costT.userData.noFit = true; S.add(costT);
    S.add(P.keep(-2.4, 2.3, 1.2, -1.2, 1.05));

    let R = null;
    function draw() {
      R = run(st);
      ctx.userData.set({ level: R.ctx / 180, color: R.ctx > 50 ? BAD : BLUE });
      specs.forEach(s => s.p.userData.set({ color: st.structured ? GOOD : BAD }));
      specs[2].r.userData.set({ color: st.parallelSmart ? GOOD : BAD });
      wall.visible = !!st.freshReview;
      iss.forEach((l, k) => l.userData.set({ color: k < R.caught ? GOOD : BAD, on: true }));
      reach.forEach(r => { r.visible = !st.scoped; });
      costT.userData.set({ h: 0.25 + (R.cost - 1) * 0.3 });
    }
    function isOk() { return Object.keys(D0).every(k => st[k]); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Restrict tools per role', short: 'Tools per role', get: () => st.scoped, set: v => set({ scoped: !!v }) },
      { type: 'toggle', label: 'Return compact structured results', short: 'Structured', get: () => st.structured, set: v => set({ structured: !!v }) },
      { type: 'toggle', label: 'Parallel only when independent', short: 'Smart parallel', get: () => st.parallelSmart, set: v => set({ parallelSmart: !!v }) },
      { type: 'toggle', label: 'Reviewer in a fresh context', short: 'Fresh review', get: () => st.freshReview, set: v => set({ freshReview: !!v }) },
      { type: 'toggle', label: 'Re-delegate only the gaps', short: 'Gaps only', get: () => st.gapsOnly, set: v => set({ gapsOnly: !!v }) },
    ];
    const readouts = [
      { label: 'Coordinator context', get: () => ({ v: `${R.ctx}k`, sub: 'tokens', good: R.ctx < 50, bad: R.ctx > 50 }) },
      { label: 'Review caught', get: () => ({ v: `${R.caught} of 4`, sub: 'planted issues', good: R.caught === 4, bad: R.caught < 4 }) },
      { label: 'Relative cost', get: () => ({ v: `${R.cost.toFixed(1)}×`, sub: 'against the best design', good: R.cost < 1.05, bad: R.cost > 1.5 }) },
    ];
    const labels = [
      { name: 'c', t: 'Coordinator and specialists', d: 'Coral pipes: raw transcripts', icon: 'link', atV: V(-2.2, 0.25, 0.35) },
      { name: 't', t: 'How the run went', d: 'Tank: context. Gold: cost', icon: 'target', atV: V(2.22, 0.15, -0.75) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Pass raw transcripts up', hint: 'the coordinator drowns', on: () => set({ ...D0, structured: false }), off: reset },
      { label: 'Run everything in parallel', hint: 'pricing works blind', on: () => set({ ...D0, parallelSmart: false }), off: reset },
      { label: 'Review in the writers\' context', hint: 'a style editor, not a reviewer', on: () => set({ ...D0, freshReview: false }), off: reset },
    ];
    function status() {
      if (isOk()) return { ok: true, msg: `<b>Specialists with only their own tools return compact results, so the coordinator holds ${R.ctx}k tokens; pricing waits for the competitor list; a reviewer with only the draft, evidence and rubric catches all four planted issues; and only the gaps are re-delegated.</b>` };
      const f = [];
      if (!st.structured) f.push(`raw transcripts push the coordinator to ${R.ctx}k tokens, burying what matters`);
      if (!st.parallelSmart) f.push('pricing started before the competitor list existed and had to be redone');
      if (!st.freshReview) f.push(`the reviewer shared the writers' framing and caught only ${R.caught} of 4 issues`);
      if (!st.scoped) f.push('the search agents could also write to the CRM');
      if (!st.gapsOnly) f.push('the whole report was rerun to fix two gaps');
      return { ok: false, msg: `<b>${f.join('; ').replace(/^./, c => c.toUpperCase())}.</b> Bounded specialists, structured results, dependency-aware scheduling and independent review.` };
    }
    return { update: dt => { co.userData.tick(dt); ctx.userData.tick(dt); costT.userData.tick(dt); specs.forEach(s => { s.r.userData.tick(dt); s.p.userData.tick(dt); }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A coordinator', home: true, say: 'A consultancy builds a market report with a coordinator and four specialists.', act: m => m.set({ scoped: false, structured: false, parallelSmart: false, freshReview: false, gapsOnly: false }) },
    { t: 'Tools per role', home: true, say: 'The search agents need search, not a way to write to the customer database.', act: m => m.set({ scoped: true, structured: false, parallelSmart: false, freshReview: false, gapsOnly: false }) },
    { t: 'Structured results', home: true, say: 'Raw transcripts drown the coordinator. Ask for compact results with sources.', act: m => m.set({ scoped: true, structured: true, parallelSmart: false, freshReview: false, gapsOnly: false }) },
    { t: 'Respect dependencies', home: true, say: 'Pricing needs the competitor list. Run in parallel only what is independent.', act: m => m.set({ scoped: true, structured: true, parallelSmart: true, freshReview: false, gapsOnly: false }) },
    { t: 'Independent review', home: true, say: 'A reviewer with the writers\' context polishes style. A fresh one finds the real gaps.', act: m => m.set({ scoped: true, structured: true, parallelSmart: true, freshReview: true, gapsOnly: false }) },
    { t: 'Fix only the gaps', home: true, say: 'Re-delegate what the review found, not the whole report.', act: m => m.set({ scoped: true, structured: true, parallelSmart: true, freshReview: true, gapsOnly: true }) },
  ],
  check: [
    { q: 'What should specialists send back to the coordinator?', options: ['Compact structured results with sources', 'Full transcripts', 'Nothing'], answer: 0, why: 'Keep the coordinator\'s context clean.', hint: 'Try Pass raw transcripts up.' },
    { q: 'When should tasks run in parallel?', options: ['Only when they are independent', 'Always', 'Never'], answer: 0, why: 'Dependent tasks work from stale assumptions.', hint: 'Try Run everything in parallel.' },
    { q: 'Why give the reviewer a fresh context?', options: ['So it does not inherit the writers\' framing', 'To save tokens only', 'For speed'], answer: 0, why: 'Artifact, evidence and rubric only.', hint: 'Try Review in the writers\' context.' },
  ],
  practice: [
    { q: 'A step always formats a date the same way. Should it be a subagent?', options: ['No: deterministic steps are code or a tool', 'Yes, every step should be an agent', 'Only in parallel', 'Only for reviews'], answer: 0, why: 'Subagents are for isolated reasoning.' },
    { q: 'A coordinator\'s context keeps overflowing with specialists\' full working notes. What fixes it?', options: ['Ask for compact structured results and keep evidence outside the prompt', 'A bigger context window', 'More specialists', 'Shorter specialist names'], answer: 0, why: 'The coordinator is not a data warehouse.' },
    { q: 'A writer agent and a reviewer agent share one conversation. The review only fixes wording. Why?', options: ['The reviewer inherited the writer\'s framing', 'The reviewer is too small', 'The rubric is too long', 'Reviews always do that'], answer: 0, why: 'Independent review needs a clean context.' },
    { q: 'A review finds two missing sections in a ten-section report. What should happen?', options: ['Re-delegate only those two sections', 'Rerun all ten', 'Ship it anyway', 'Ask the reviewer to write them'], answer: 0, why: 'Re-delegate identified gaps.' },
    { q: 'How should a prerequisite such as "approval before publishing" be enforced in a multi-agent system?', options: ['Structurally, in the orchestration code', 'By reminding each agent in its prompt', 'By trusting the coordinator to remember', 'By the reviewer'], answer: 0, why: 'Structure, not reminders.' },
    { q: 'A weak multi-agent design often looks like…', options: ['Several agents sharing the same broad prompt and tool set', 'A coordinator with bounded specialists', 'Tools restricted per role', 'Structured results'], answer: 0, why: 'Bounded roles are the point.' },
  ],
  terms: [
    ['Coordinator', 'The agent that decomposes, delegates and assembles.'],
    ['Specialist', 'A bounded agent with one job and its own tools.'],
    ['Structured result', 'A compact, typed summary with sources and status.'],
    ['Dependency', 'A task that needs another task\'s output first.'],
    ['Independent review', 'Review in a fresh context with artifact, evidence and rubric.'],
    ['Re-delegation', 'Sending only the identified gaps back for more work.'],
  ],
  deeper: '<p><b>Provenance.</b> Keep which agent produced each claim and from which source, so errors can be traced and gaps re-delegated precisely.</p><p><b>Measure the split.</b> Compare a multi-agent design with a single agent on the same eval cases before adopting it.</p><p><b>About this machine.</b> The consultancy and figures are invented.</p>',
  code: {
    title: 'A coordinator with bounded specialists',
    note: 'Written for this lesson.',
    text: `
async def report(topic):
    sizing, competitors = await gather(                       # independent: parallel
        run_agent("sizing", topic, tools=["web_search"], schema=SizingResult),
        run_agent("competitors", topic, tools=["web_search"], schema=CompetitorList),
    )
    pricing = await run_agent("pricing", competitors, tools=["spreadsheet"], schema=Pricing)
    draft = assemble(sizing, competitors, pricing)
    review = await run_agent("reviewer", {"draft": draft, "evidence": sources(draft),
                             "rubric": RUBRIC}, tools=[], fresh_context=True)
    for gap in review.gaps:                                  # only what was found
        draft = patch(draft, await run_agent(gap.owner, gap.request, schema=gap.schema))
    return draft
`,
  },
};
