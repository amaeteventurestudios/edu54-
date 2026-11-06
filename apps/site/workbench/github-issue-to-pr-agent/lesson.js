// Capstone: an issue-to-PR agent (phase 19, capstone 16). An async cloud agent: label an issue at a Lusaka software firm and a sandboxed run writes a pull request. Ten issues of mixed difficulty go through triage, sandbox, tests and a required human review.
// Merge rate is low unless triage filters. Cost per merged PR is the honest unit. Counts come from the issue list.
const ISS = [...Array(10)].map((_, i) => ({ easy: i % 3 !== 2, clear: i % 4 !== 3 }));
function run(o) {
  let tried = 0, passed = 0, merged = 0, spent = 0, leak = 0;
  ISS.forEach(x => {
    if (o.triage && !(x.easy && x.clear)) return;
    tried++; spent += 3;
    const ok = x.easy && (x.clear || o.ask);
    if (ok) passed++;
    else if (!o.tests) passed++;
    if (ok && o.human) merged++;
    if (!o.human && (ok || !o.tests)) merged++;
    if (!ok && !o.human && !o.tests) leak++;
  });
  if (!o.sand) leak += 1;
  return { tried, passed, merged, spent, leak, per: merged ? spent / merged : 0 };
}

export default {
  slug: 'github-issue-to-pr-agent',
  title: 'Capstone: label an issue, get a pull request',
  description: 'An agent in the cloud picks up issues overnight. Triage, sandbox, tests and a person decide what it\'s worth.',
  overview: 'Async coding agents are a different product from a terminal assistant. You put a label on an issue, and a pull request appears. Nobody watches the run, which changes the design. It needs a sandbox with no secrets. It needs tests, as there is no person to say that looks wrong. It needs triage, because vague issues waste money. A person still reviews before merge. And the honest metric is cost per merged pull request, not runs or lines. This capstone sends ten issues through the full line at a software firm in Lusaka, and counts what comes out.',
  keywords: ['coding agent', 'pull request', 'async agents', 'sandbox', 'triage', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { triage: true, sand: true, tests: true, human: true, ask: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const Iss = ISS.map((x, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.28, 0.2, 0.28, '#fff', { r: 0.03, material: m }); b.position.set(-2.2 + (i % 5) * 0.33, 0.03, i < 5 ? -0.25 : 0.12); S.add(b); return m; });
    const box = P.box(1.0, 0.5, 1.0, '#BFD8D2', { r: 0.05, material: new S.THREE.MeshLambertMaterial({ color: '#BFD8D2' }) }); box.position.set(-0.05, 0.03, 0); S.add(box);
    const bot = add(P.robot(BLUE, { scale: 0.55 })); bot.position.set(-0.05, 0.53, 0);
    const test = add(P.lamp(GOOD, { h: 0.5, r: 0.11 })); test.position.set(0.8, 0.03, 0);
    const person = add(P.robot('#A87A4F', { scale: 0.7 })); person.position.set(1.35, 0.03, -0.2);
    const stack = add(P.stack(0.5, 0.42, 0.09, { max: 7, color: GOOD })); stack.position.set(2.05, 0.03, 0);
    S.add(P.keep(-2.45, 2.45, 1.05, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      Iss.forEach((m, i) => { const x = ISS[i]; const skip = st.triage && !(x.easy && x.clear); m.color.set(skip ? GREY : x.easy && (x.clear || st.ask) ? GOOD : BAD); });
      box.material.color.set(st.sand ? '#BFD8D2' : '#EAD3C4');
      test.userData.set({ color: st.tests ? '#3E9B5F' : '#C9C4B6', on: st.tests }); person.visible = st.human;
      stack.userData.set({ n: R.merged, colors: Array(7).fill(GOOD).map((c, i) => (R.leak && i >= R.merged - R.leak ? BAD : GOOD)) });
      bot.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('triage', 'Skip vague or hard issues', 'Triage'), tg('sand', 'Run in a sandbox with no secrets', 'Sandbox'), tg('tests', 'Tests must pass before a PR', 'Tests'), tg('human', 'A person reviews before merge', 'Review'), tg('ask', 'Agent asks when unclear', 'Asks')];
    const readouts = [
      { label: 'Merged', get: () => ({ v: `${R.merged}`, sub: `of ${R.tried} runs`, good: R.merged > 0 }) },
      { label: 'Cost per merged PR', get: () => ({ v: R.merged ? M(R.per) : 'none', sub: `${M(R.spent)} spent`, good: R.per && R.per < 5, bad: R.per > 6 }) },
      { label: 'Bad changes or leaks', get: () => ({ v: `${R.leak}`, good: !R.leak, bad: R.leak > 0 }) },
    ];
    const labels = [
      { name: 'i', t: 'Ten issues', d: 'Grey: skipped by triage', icon: 'box', atV: V(-2.38, 0.15, -0.05) },
      { name: 's', t: 'Merged work', d: 'Coral: should not have merged', icon: 'check', atV: V(2.32, 0.1, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Take every issue', hint: 'vague ones waste runs', on: () => set({ ...D0, triage: false, ask: false }), off: reset },
      { label: 'Merge without review or tests', hint: 'nobody watched', on: () => set({ ...D0, triage: false, human: false, tests: false }), off: reset },
      { label: 'Give the run real secrets', hint: 'no sandbox', on: () => set({ ...D0, sand: false }), off: reset },
    ];
    function status() {
      if (!st.sand) return { ok: false, msg: '<b>The run held real credentials, and it reads text from strangers.</b> An issue is untrusted input. An unattended agent needs a sandbox and no secrets.' };
      if (R.leak) return { ok: false, msg: `<b>${R.leak} bad changes reached main.</b> Nobody saw the run, and nothing checked it. An async agent has only the checks you built.` };
      if (R.per > 6 || !st.triage) return { ok: false, msg: `<b>${M(R.per)} per merged PR.</b> Runs on vague issues produce nothing, and you pay for them anyway. Triage, or have the agent ask.` };
      return { ok: true, msg: `<b>${R.merged} merged for ${M(R.spent)}: ${M(R.per)} each.</b> Cost per merged PR is the number to watch.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A label', home: true, say: 'A software firm in Lusaka labels an issue, and an agent in the cloud picks it up. Nobody watches.', act: m => m.set({ triage: false, sand: true, tests: true, human: true, ask: false }) },
    { t: 'Triage', home: true, say: 'Vague issues waste runs. Filter them, or have the agent ask a question first.', act: m => m.set({ triage: true, sand: true, tests: true, human: true, ask: true }) },
    { t: 'A sandbox', home: true, say: 'An issue is text from strangers. Run with no secrets, in a box.', act: m => m.set({ triage: true, sand: false, tests: true, human: true, ask: true }) },
    { t: 'Tests stand in', home: true, say: 'No one is watching, so tests must pass before a pull request is opened.', act: m => m.set({ triage: true, sand: true, tests: true, human: true, ask: true }) },
    { t: 'A person merges', home: true, say: 'A person still reviews. Remove that and the tests, and bad changes land.', act: m => m.set({ triage: false, sand: true, tests: false, human: false, ask: true }) },
    { t: 'The honest number', home: true, say: 'Count cost per merged pull request. Runs and lines of code tell you nothing.', act: m => m.set({ triage: true, sand: true, tests: true, human: true, ask: true }) },
  ],
  check: [
    { q: 'What is the honest metric?', options: ['Cost per merged PR', 'Lines written', 'Runs started'], answer: 0, why: 'Only merged work counts.', hint: 'See The honest number.' },
    { q: 'Why does an async agent need a sandbox with no secrets?', options: ['Issues are untrusted text and nobody watches', 'To run faster', 'It\'s cheaper'], answer: 0, why: 'Injection could reach real credentials.', hint: 'Try Give the run real secrets.' },
    { q: 'What does triage do?', options: ['Keeps vague issues from wasting runs', 'Writes tests', 'Merges code'], answer: 0, why: 'A clear issue is a cheap one.', hint: 'Try Take every issue.' },
  ],
  terms: [['Async agent', 'One that works without a person watching.'], ['Triage', 'Choosing which issues to run.'], ['Pull request', 'A proposed change for review.'], ['Sandbox', 'A confined run.'], ['Merge rate', 'The share of runs that land.']],
  deeper: '<p><b>Compared with capstone 1.</b> A terminal agent has a person watching each step. Here, checks must do that job.</p><p><b>Ask first.</b> A clarifying comment costs little.</p><p><b>Run cost</b> is a round figure.</p>',
  code: {
    title: 'From label to PR',
    note: 'A sketch of the course\'s capstone (code/main.py).',
    text: `
@on_label("agent")
def handle(issue):
    if not clear_enough(issue):
        return comment(issue, ask_question(issue))
    box = new_sandbox(repo=issue.repo, secrets=None)
    result = run_agent(box, issue.body, budget=BUDGET)
    if box.run("pytest").ok:
        open_pr(result.diff, reviewers=issue.owners)
`,
  },
};
