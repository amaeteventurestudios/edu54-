// Instructions as executable constraints: the fees-app team's rules, one per heading in docs/agent-rules.md, each with a category and a check function.
// The agent's run record (files changed, commands run, dependencies added, test exit code, state-file age, open questions) is checked rule by rule.
// As prose in one long AGENTS.md, the agent acts only on the rules it actually reads: those within its attention budget from the top of the file.
// With a short router that links topic files, every rule is two hops away. Everything is computed live from the rules and the run record.
const RULES = [
  { slug: 'state-fresh', cat: 'startup', line: 1820, d: 'STATE.md updated within the last day', check: r => r.stateAgeH <= 24 },
  { slug: 'no-release-script', cat: 'forbidden', line: 640, d: 'never edit scripts/release.sh', check: r => !r.files.includes('scripts/release.sh') },
  { slug: 'no-payments', cat: 'forbidden', line: 1210, d: 'never touch fees/payments/ in an export task', check: r => !r.files.some(f => f.startsWith('fees/payments/')) },
  { slug: 'tests-pass', cat: 'done', line: 40, d: 'pytest exits 0', check: r => r.testExit === 0 },
  { slug: 'acceptance', cat: 'done', line: 980, d: 'the acceptance line in TASKS.md passes', check: r => r.acceptance },
  { slug: 'ask-when-unsure', cat: 'uncertainty', line: 1505, d: 'open a question note instead of guessing a tax rule', check: r => !r.guessed || r.questionNote },
  { slug: 'new-deps', cat: 'approval', line: 1960, d: 'any new dependency needs a person\'s approval', check: r => !r.newDeps.length || r.approved },
];
const RUN = { files: ['fees/export.py', 'tests/test_export.py', 'fees/payments/rounding.py', 'scripts/release.sh'], testExit: 0, acceptance: true, stateAgeH: 30, guessed: true, questionNote: false, newDeps: ['pandas'], approved: false };
function evaluate(o) {
  const out = RULES.map(rule => {
    const read = o.layered || rule.line <= o.budget;
    const broken = !read && !rule.check(RUN);              // a rule the agent read is followed; an unread one is up to chance
    const hasCheck = o.checks && (o.approval || rule.cat !== 'approval');
    return { rule, read, broken, caught: broken && hasCheck };
  });
  return { out, broken: out.filter(x => x.broken).length, caught: out.filter(x => x.caught).length, unread: out.filter(x => !x.read).length };
}

export default {
  slug: 'instructions-as-executable-constraints',
  title: 'Instructions as checks, not wishes',
  description: 'A school fees app\'s team turns its agent rules into checks. Compare one long instruction file the agent skims with a short router, and see which broken rules get caught.',
  overview: 'Instructions written as prose are wishes; written as constraints, they are tests. Keep a short router at the root and put the rules in their own file, one per heading, each with a name, a category and a check that a script runs against the agent\'s work. Five categories cover most rules: start-up (what must be true before work begins, such as a fresh state file), forbidden (what must never happen, such as editing the release script), definition of done (tests pass and the acceptance line holds), uncertainty (what to do when unsure: open a question instead of guessing), and approval (what needs a person, such as a new dependency or a production write). A rule that fits none of these is usually two rules. The checker writes a report the reviewer reads, so a broken rule is a fact, not an impression. Instruction files grow because every incident adds a rule and none removes one; past a point the agent reads the first screen and acts on a fraction of it. Progressive disclosure fixes that: a router under about fifty lines that links topic files by path, loaded only when a task touches them, so any rule is at most two hops away. Runtime guardrails enforce rules during a turn; the rule file is the reviewable contract they implement.',
  keywords: ['agent instructions', 'AGENTS.md', 'rules as code', 'progressive disclosure', 'coding agents', 'AI agents', 'verification'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.45, 0], dir: [0.05, 0.75, 1.2], half: 1.3, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { checks: true, layered: true, budget: 200, approval: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', AMB = '#E3A72F';
    const CC = { startup: '#5B8DB8', forbidden: '#B5462F', done: '#1F9E89', uncertainty: '#C9A227', approval: '#7B6FA8' };
    /* one long AGENTS.md as a column of 2,000 lines, read from the top: the green sleeve is what the agent reads. A plate sticks out at each rule's line,
       in its category's colour. Layered, it becomes a short router block with three topic files, every rule two hops away */
    const FX = -2.35, FH = 1.3;
    const file = P.box(0.5, FH, 0.5, '#F4F1EA', { r: 0.04 }); file.position.set(FX, 0, 0); S.add(file);
    const readB = P.box(0.56, 1, 0.56, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: '#7FCBB8', transparent: true, opacity: 0.55 }) }); S.add(readB);
    const marks = RULES.map(r => { const b = P.box(0.7, 0.035, 0.7, CC[r.cat], { r: 0.01 }); b.position.set(FX, FH - r.line / 2000 * FH, 0); S.add(b); return b; });
    const router = P.box(0.5, 0.25, 0.4, CHAR, { r: 0.04 }); router.position.set(FX, 0, 0); S.add(router);
    const topics = [-0.55, 0, 0.55].map(z => { const b = P.box(0.4, 0.18, 0.3, '#E3EEF6', { r: 0.03 }); b.position.set(FX + 0.75, 0, z); S.add(b); const r = P.rod(V(FX + 0.2, 0.12, 0), V(FX + 0.6, 0.09, z), 0.015, '#8E91A3'); S.add(r); return [b, r]; });
    /* the agent, then a post per rule on a plate of its category's colour: lamp green kept, gold broken but flagged by its check, red broken unseen */
    const bot = P.robot(CHAR, { scale: 0.75 }); bot.position.set(-0.75, 0, 0); bot.userData.set({ busy: true }); S.add(bot);
    const LX = i => -0.05 + i * 0.47;
    const lamps = RULES.map((r, i) => { const pl = P.box(0.36, 0.05, 0.36, CC[r.cat], { r: 0.02 }); pl.position.set(LX(i), 0, 0); S.add(pl); const l = P.lamp(GOOD, { h: 0.45, r: 0.1 }); l.position.set(LX(i), 0.05, 0); S.add(l); return l; });
    S.add(P.keep(-2.75, 3.0, 1.45, -0.8, 0.8));

    let E = null;
    function draw() {
      RUN.approved = false;
      E = evaluate(st);
      const big = !st.layered;
      file.visible = big; marks.forEach(m => m.visible = big); readB.visible = big;
      router.visible = !big; topics.forEach(([b, r]) => { b.visible = r.visible = !big; });
      if (big) { const L = Math.max(0.02, Math.min(st.budget, 2000) / 2000 * FH); readB.scale.y = L; readB.position.set(FX, FH - L + 0.005, 0); }
      E.out.forEach((x, i) => lamps[i].userData.set({ color: !x.broken ? GOOD : x.caught ? AMB : RED, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Every rule has a check that runs', short: 'Checks', get: () => st.checks, set: v => set({ checks: !!v }) },
      { type: 'toggle', label: 'Short router with topic files', short: 'Router', get: () => st.layered, set: v => set({ layered: !!v }) },
      { type: 'toggle', label: 'The approval rule has a check', short: 'Approval check', get: () => st.approval, set: v => set({ approval: !!v }), quick: false },
      { type: 'slider', label: 'Lines the agent reads of a long file', min: 50, max: 2000, step: 50, get: () => st.budget, set: v => set({ budget: Math.round(v / 50) * 50 }), fmt: v => `${Math.round(v / 50) * 50}` },
    ];
    const readouts = [
      { label: 'Broken', get: () => ({ v: `${E.broken} of 7`, sub: 'rules the run broke', good: !E.broken, bad: E.broken > 0 }) },
      { label: 'Slipped through', get: () => ({ v: String(E.broken - E.caught), sub: 'broken and not flagged', good: E.broken === E.caught, bad: E.broken > E.caught }) },
      { label: 'Unread rules', get: () => ({ v: String(E.unread), sub: st.layered ? 'two hops from the router' : 'past the attention budget' }) },
    ];
    const labels = [
      { name: 'file', t: 'One long AGENTS.md', d: 'Green: the part it reads. Plates: rules', icon: 'book', atV: V(FX - 0.28, 0.25, 0), hide: () => st.layered },
      { name: 'router', t: 'Router and topic files', d: 'Every rule two hops away', icon: 'link', atV: V(FX - 0.28, 0.25, 0), hide: () => !st.layered },
      { name: 'agent', t: 'The agent\'s run', d: 'Checked rule by rule', icon: 'spark', atV: V(-0.75, 0.25, 0.13) },
      { name: 'rules', t: 'A check per rule', d: 'Green kept, gold flagged, red unseen', icon: 'check', atV: V(LX(6) + 0.15, 0.25, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One giant file of prose rules', hint: 'skimmed, unchecked', on: () => set({ ...D0, layered: false, checks: false }), off: reset },
      { label: 'Drop the approval check', hint: 'one rule left as prose', on: () => set({ ...D0, layered: false, approval: false }), off: reset },
    ];
    function status() {
      if (!st.checks && E.broken) return { ok: false, msg: `<b>As prose in a 2,000-line file, the agent read the first ${st.budget} lines and broke ${E.broken} rules it never reached: ${E.out.filter(x => x.broken).map(x => x.rule.slug).join(', ')}. Nothing flagged them.</b> It edited the release script and the payments module, guessed a tax rule and added a dependency unapproved. Give every rule a check, and keep the router short.` };
      if (E.broken > E.caught) return { ok: false, msg: `<b>Every rule has a check except approval, and that is the one that slipped: the agent added pandas without a person\'s approval, and the report says nothing.</b> A rule without a check is still a wish. Add the check, or the rule may as well not exist.` };
      if (E.broken) return { ok: true, msg: `<b>The run still broke ${E.broken} rules (${E.out.filter(x => x.broken).map(x => x.rule.slug).join(', ')}), and every one is flagged in rule_report.json for the reviewer.</b> Checks turn "stay out of payments" from a wish into a fact someone must answer.` };
      return { ok: true, msg: st.checks ? '<b>With a short router, every rule is two hops away: the agent read them all and kept all seven.</b> The checker still ran and confirmed it; the report is evidence, not an impression.' : '<b>With a short router the agent read all seven rules and kept them, but with no checks nothing would have flagged a slip.</b> Reading is not enforcement; give every rule a check.' };
    }
    return { update: dt => bot.userData.tick(dt), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Rules the team learned', home: true, say: 'The fees-app team has collected rules for its agent: never edit the release script, ask instead of guessing a tax rule, get approval for new libraries.', act: m => m.set({ checks: false, layered: false, budget: 200 }) },
    { t: 'A file nobody finishes', home: true, say: 'Kept in one two-thousand-line file, the agent reads the first screen and acts on a fraction of what it was told.', act: m => m.set({ layered: false }) },
    { t: 'Rules become checks', home: true, say: 'Give each rule a category and a check. Now every broken rule is flagged in a report, whatever the agent read.', act: m => m.set({ checks: true }) },
    { t: 'Five categories', home: true, say: 'Start-up, forbidden, done, uncertainty, approval. A rule that fits none of them is usually two rules.', act: m => m.set({ checks: true }) },
    { t: 'A map, not an encyclopaedia', home: true, say: 'A short router links topic files by path. Every rule is two hops away, and the agent reads what the task touches.', act: m => m.set({ layered: true }) },
    { t: 'Evidence for the reviewer', home: true, say: 'The checker\'s report goes to the reviewer: a broken rule is a fact to answer, not an impression.', act: m => m.set({}) },
  ],
  check: [
    { q: 'What turns a rule from a wish into a constraint?', options: ['A check that runs against the agent\'s work', 'Writing it in capitals', 'Putting it first'], answer: 0, why: 'Then a broken rule is reported.', hint: 'Try One giant file of prose rules.' },
    { q: 'Why keep AGENTS.md short?', options: ['The agent reads a screen and acts on a fraction of a long file', 'To save disk', 'It must be under 10 lines'], answer: 0, why: 'Progressive disclosure: a router plus topic files.', hint: 'Turn off Router.' },
    { q: '"Any new dependency needs approval" belongs to which category?', options: ['Approval', 'Forbidden', 'Start-up'], answer: 0, why: 'It needs a person, not a ban.', hint: 'Read the categories.' },
  ],
  terms: [
    ['Rule file', 'Agent rules, one per heading, each with a category and a check.'],
    ['Rule check', 'A function that tests the agent\'s work against one rule.'],
    ['Rule report', 'The checker\'s results, read by the reviewer.'],
    ['Router', 'A short root file that points to topic files.'],
    ['Progressive disclosure', 'Loading depth only when a task needs it.'],
    ['Attention budget', 'How much of a long file an agent really acts on.'],
  ],
  deeper: '<p><b>Two tests for the layering.</b> Reachability: any rule within two hops of the router. Freshness: the router is short enough to reread on every pull request.</p><p><b>Rules and guardrails.</b> Runtime guardrails catch violations during a turn; the rule file is the human-readable contract that proves they do the right thing.</p><p><b>About this machine.</b> The run record is fixed; which rules are read (by their line in a 2,000-line file, or all via the router), broken and flagged is computed live.</p>',
  code: {
    title: 'Rules with checks',
    note: 'Adapted from the course\'s executable-constraints lesson.',
    text: `
RULES = [
    ("no-release-script", "forbidden", lambda r: "scripts/release.sh" not in r.files),
    ("tests-pass",        "done",      lambda r: r.test_exit == 0),
    ("state-fresh",       "startup",   lambda r: r.state_age_hours <= 24),
    ("ask-when-unsure",   "uncertainty", lambda r: not r.guessed or r.question_note),
    ("new-deps",          "approval",  lambda r: not r.new_deps or r.approved),
]

def rule_report(run):
    return [{"rule": slug, "category": cat, "ok": check(run)} for slug, cat, check in RULES]
`,
  },
};
