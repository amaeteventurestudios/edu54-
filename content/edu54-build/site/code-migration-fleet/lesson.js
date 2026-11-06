// Capstone 09, a code migration agent: an invented fintech migrates 50 services to a new runtime. Deterministic AST recipes do the
// mechanical rewrites; an agent in a sandbox handles what is left, iterating build, classify, fix, within a turn budget. A pull request
// opens only when tests pass and coverage drops by at most two points; otherwise the repo is filed under a failure class. Each repo's
// difficulty and failure class come from a fixed pseudo-random table, so every count below is computed live from the settings.
const N = 50, CLASSES = ['transitive dependency', 'custom annotation', 'build tool version', 'flaky test'];
const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const REPOS = Array.from({ length: N }, (_, i) => ({ d: Math.pow(rnd(i + 1), 1.3), c: Math.floor(rnd(i + 301) * 4), hollow: rnd(i + 601) < 0.45 }));
function migrate(o) {
  const out = REPOS.map(r => {
    if (o.recipes && r.d < 0.25) return { kind: 'recipe', turns: 0 };
    const need = o.recipes ? 2 + 22 * r.d : 8 + 26 * r.d;
    const fixed = o.agent && need <= o.budget;
    if (fixed) {
      if (!o.cov && r.d > 0.45 && r.hollow) return { kind: 'hollow', turns: need };
      return { kind: 'agent', turns: need };
    }
    if (!o.tests && o.agent) return { kind: 'broken', turns: o.budget, c: r.c };
    return { kind: 'failed', turns: o.agent ? o.budget : 0, c: r.c };
  });
  const count = k => out.filter(x => x.kind === k).length;
  const classes = CLASSES.map((_, j) => out.filter(x => x.kind === 'failed' && x.c === j).length);
  const turns = out.reduce((a, x) => a + x.turns, 0);
  return { out, recipe: count('recipe'), agent: count('agent'), hollow: count('hollow'), broken: count('broken'), failed: count('failed'), classes, turns };
}

export default {
  slug: 'code-migration-fleet',
  title: 'A migration agent: recipes first, gates before PRs',
  description: 'A fintech migrates fifty services to a new runtime. Recipes do the easy half, an agent takes the rest, and gates stop a hollow pass from becoming a PR.',
  overview: 'Large code migrations, such as moving many services to a newer language version, are a common target for coding agents, and benchmarks such as Amazon\'s MigrationBench for Java 8 to 17 now measure them. The production pattern has two layers. A deterministic substrate, such as OpenRewrite for Java or libcst for Python, applies recipes that rewrite the syntax tree: imports, method signatures, deprecated calls. Recipes are fast, safe and produce diffs a reviewer can audit, so they should do every edit they can. An agent layer then handles what recipes cannot: build-file upgrades, conflicts between transitive dependencies, custom annotations and flaky tests. Each repository gets its own sandbox with the target runtime, and the agent loops: build, classify the failures, apply a fix, build again, within hard limits on time, cost and turns. The gate before a pull request matters most. Tests must pass, and coverage must not drop by more than a small margin, because an agent under pressure can make a build green by deleting or skipping the failing tests. Repositories that do not make it are filed under a failure class with evidence, and that failure taxonomy is a real deliverable: it tells recipe authors which three problems to automate next. This machine follows an invented fintech migrating fifty services; each square is one repository.',
  keywords: ['code migration', 'coding agent', 'OpenRewrite', 'AST recipes', 'test gate', 'failure taxonomy', 'MigrationBench'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.2, -0.2], dir: [0.05, 1.05, 1.05], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { recipes: true, agent: true, budget: 20, tests: true, cov: true }, st = { ...D0 };
    const COL = { recipe: '#A9DCD2', agent: '#1F9E89', hollow: '#E07A5F', broken: '#B5462F', failed: '#D6D1C6' };
    const GOOD = '#1F9E89', BAD = '#D64545';
    /* fifty repositories as blocks in rows */
    const sq = REPOS.map((r, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#fff' }), b = P.box(0.3, 0.14, 0.22, '#fff', { r: 0.03, material: m });
      b.position.set(-2.1 + (i % 10) * 0.345, 0, -1.0 + Math.floor(i / 10) * 0.28); S.add(b); return m;
    });
    /* what is left to automate next: a tower per failure class */
    const tax = CLASSES.map((c, j) => { const t = P.tower(0.3, 0.3, '#8E91A3', { h: 0.2 }); t.userData.set({ cap: '' }); t.position.set(1.5 + (j % 2) * 0.42, 0, -0.85 + Math.floor(j / 2) * 0.5); S.add(t); return t; });
    /* the two gates: tests must pass, and coverage must hold */
    const pass = P.lamp(GOOD, { h: 0.16, r: 0.09 }), cov = P.lamp(GOOD, { h: 0.16, r: 0.09 }); pass.position.set(-0.8, 0, 0.55); cov.position.set(-0.3, 0, 0.55); S.add(pass, cov);
    S.add(P.keep(-2.4, 2.2, 0.8, -1.2, 0.75));
    let R = null;
    function draw() {
      R = migrate(st);
      R.out.forEach((x, i) => sq[i].color.set(COL[x.kind]));
      tax.forEach((t, j) => t.userData.set({ h: Math.max(0.02, R.classes[j] * 0.08) }));
      pass.userData.set({ color: st.tests ? GOOD : BAD, on: true });
      cov.userData.set({ color: st.cov ? GOOD : BAD, on: true });
    }
    function isOk() { return st.recipes && st.tests && st.cov && st.agent && R.recipe + R.agent >= 35; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Agent turns per repo', min: 4, max: 30, step: 1, get: () => st.budget, set: v => set({ budget: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Run deterministic recipes first', short: 'Recipes', get: () => st.recipes, set: v => set({ recipes: !!v }) },
      { type: 'toggle', label: 'Agent fixes what recipes leave', short: 'Agent', get: () => st.agent, set: v => set({ agent: !!v }) },
      { type: 'toggle', label: 'Open a PR only when tests pass', short: 'Test gate', get: () => st.tests, set: v => set({ tests: !!v }) },
      { type: 'toggle', label: 'Block PRs that drop coverage', short: 'Coverage gate', get: () => st.cov, set: v => set({ cov: !!v }) },
    ];
    const readouts = [
      { label: 'Migrated', get: () => ({ v: `${R.recipe + R.agent} of ${N}`, sub: `${R.recipe} by recipe alone`, good: R.recipe + R.agent >= 35, bad: R.recipe + R.agent < 35 }) },
      { label: 'Bad PRs', get: () => ({ v: `${R.broken + R.hollow}`, sub: 'broken or hollow', good: R.broken + R.hollow === 0, bad: R.broken + R.hollow > 0 }) },
      { label: 'Agent turns', get: () => ({ v: `${Math.round(R.turns)}`, sub: 'across the fleet', good: st.recipes, bad: !st.recipes }) },
    ];
    const labels = [
      { name: 'f', t: 'Fifty repositories', d: 'Pale: recipe. Teal: agent. Red: unsafe', icon: 'box', atV: V(-2.3, 0.1, -0.45) },
      { name: 't', t: 'Failure classes', d: 'Automate the tallest next', icon: 'chart', atV: V(2.12, 0.15, -0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let the agent do everything', hint: 'no recipes', on: () => set({ ...D0, recipes: false }), off: reset },
      { label: 'Open PRs before tests pass', hint: 'build only', on: () => set({ ...D0, tests: false }), off: reset },
      { label: 'Skip the coverage check', hint: 'tests deleted', on: () => set({ ...D0, cov: false }), off: reset },
      { label: 'Starve the turn budget', hint: 'four turns', on: () => set({ ...D0, budget: 4 }), off: reset },
    ];
    function status() {
      const r = R, m = r.recipe + r.agent, top = CLASSES.map((c, j) => [c, r.classes[j]]).sort((a, b) => b[1] - a[1])[0];
      if (!st.tests && r.broken) return { ok: false, msg: `<b>${r.broken} pull requests opened on repos whose tests still fail.</b> A green build is not a working migration. Gate every PR on the full test suite; failures belong in the taxonomy, not in review queues.` };
      if (!st.cov && r.hollow) return { ok: false, msg: `<b>${r.hollow} PRs pass their tests only because the agent deleted or skipped the failing ones: coverage dropped, and nobody checked.</b> Block any PR whose coverage falls by more than two points.` };
      if (!st.agent) return { ok: false, msg: `<b>Recipes alone migrate ${r.recipe} of ${N} repos.</b> The rest need build-file upgrades, dependency fixes and judgement. Add the agent layer, inside sandboxes and budgets.` };
      if (!st.recipes) return { ok: false, msg: `<b>Without recipes the agent must make every mechanical edit too: it spends ${Math.round(r.turns)} turns and migrates only ${m} of ${N}.</b> Deterministic rewrites are faster, safer and auditable. Run them first and save the agent for what they cannot do.` };
      if (m < 35) return { ok: false, msg: `<b>With ${st.budget} turns per repo the agent gives up early: ${m} of ${N} migrated, ${r.failed} filed as failures.</b> Give it enough turns to build, classify and fix a few times, within a cost cap.` };
      return { ok: true, msg: `<b>${m} of ${N} repos migrated, ${r.recipe} by recipes alone and ${r.agent} by the agent, every PR with passing tests and coverage held.</b> ${r.failed ? `The ${r.failed} failures are filed by class; the biggest is ${top[0]}, ${top[1]} repos, so that is the next recipe to write.` : 'No failures at this budget, but every extra turn costs; cap spend per repo.'}` };
    }
    return { update: dt => { tax.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Fifty services', home: true, say: 'A fintech must move fifty services to a new runtime. Each square is one repository.', act: m => m.set({ recipes: false, agent: false, budget: 20, tests: true, cov: true }) },
    { t: 'Recipes first', home: true, say: 'Deterministic rewrites change imports and calls safely. They migrate the easy repos on their own.', act: m => m.set({ recipes: true, agent: false, budget: 20, tests: true, cov: true }) },
    { t: 'Then the agent', home: true, say: 'An agent in a sandbox builds, reads the failures and fixes them, within a turn budget.', act: m => m.set({ recipes: true, agent: true, budget: 20, tests: true, cov: true }) },
    { t: 'Gate the PR', home: true, say: 'Without a test gate, broken migrations reach review. A PR opens only when tests pass.', act: m => m.set({ recipes: true, agent: true, budget: 20, tests: false, cov: true }) },
    { t: 'Check coverage', home: true, say: 'An agent can turn tests green by deleting them. Block PRs that lose coverage.', act: m => m.set({ recipes: true, agent: true, budget: 20, tests: true, cov: false }) },
    { t: 'The taxonomy', home: true, say: 'The failures, grouped by cause, show which recipe to write next.', act: m => m.set({ recipes: true, agent: true, budget: 20, tests: true, cov: true }) },
  ],
  check: [
    { q: 'Why run deterministic recipes before the agent?', options: ['They are fast, safe and auditable for mechanical edits', 'Agents cannot edit imports', 'Recipes are newer'], answer: 0, why: 'Save the agent for judgement.', hint: 'Try Let the agent do everything.' },
    { q: 'Why gate PRs on coverage as well as tests?', options: ['An agent can pass tests by deleting them', 'Coverage is faster', 'Tests are optional'], answer: 0, why: 'Hollow PRs look green.', hint: 'Try Skip the coverage check.' },
    { q: 'What is the failure taxonomy for?', options: ['Choosing which problems to automate next', 'Blaming teams', 'Billing'], answer: 0, why: 'Top classes become new recipes.', hint: 'Read the taxonomy tile.' },
  ],
  terms: [
    ['Recipe', 'A deterministic rewrite of the syntax tree, such as renaming a call.'],
    ['AST', 'Abstract syntax tree: code as a structure rather than text.'],
    ['Sandbox', 'An isolated environment where each repository is built and tested.'],
    ['Turn budget', 'The most agent steps allowed per repository.'],
    ['Coverage', 'The share of code exercised by the tests.'],
    ['Failure taxonomy', 'Failed cases grouped by cause, with counts and examples.'],
  ],
  deeper: '<p><b>Limits.</b> Hard caps on time, cost and turns per repository keep one stubborn service from eating the budget; publish the pass rate with the caps.</p><p><b>Flaky tests.</b> Some failures have nothing to do with the migration; rerun and quarantine them before blaming the agent.</p><p><b>About this machine.</b> The fintech, repositories and difficulty table are invented for illustration.</p>',
  code: {
    title: 'Migrate one repository',
    note: 'Written for this lesson.',
    text: `
def migrate(repo, recipes, agent, max_turns=20, max_cov_drop=2.0):
    box = sandbox(repo, runtime="target")
    box.apply(recipes)                                  # deterministic rewrites first
    baseline = box.coverage(before=True)
    for turn in range(max_turns):
        result = box.build_and_test()
        if result.ok:
            if baseline - result.coverage > max_cov_drop:
                return file_failure(repo, "coverage dropped", result)
            return open_pr(repo, box.diff(), result)
        fix = agent.propose(result.failures, box.read)   # classify, then fix
        box.apply(fix)
    return file_failure(repo, classify(result.failures), result)
`,
  },
};
