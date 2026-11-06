// The coding-agent landscape (phase 15, lesson 9): the same model, wrapped in different scaffolding, gives very different reliability. A task
// is retrieval (finding the right files) then a chain of steps that compounds; a verifier loop retries, a sandbox rolls back so retries start
// clean, and CodeAct packs several steps into one code action. Scores are computed live on three task mixes: a benchmark with an easy tail
// (32% one- or two-line fixes), a harder benchmark (none) and a Nairobi team's own backlog (5%).
const P_STEP = 0.97;
const MIX = { verified: 0.32, pro: 0, backlog: 0.05 };
function solve(o, hard) {
  const n = (hard ? 25 : 5) * (o.codeact ? 0.6 : 1);
  const find = o.retrieval ? (hard ? 0.92 : 0.98) : (hard ? 0.65 : 0.85);
  const a = Math.pow(P_STEP, n), tries = o.verifier ? 3 : 1;
  let miss = 1 - a;
  for (let k = 1; k < tries; k++) miss *= 1 - a * (o.sandbox ? 1 : 0.4);
  return find * (1 - miss);
}
function scores(o) {
  const e = solve(o, false), h = solve(o, true);
  const at = m => m * e + (1 - m) * h;
  const failRate = 1 - at(MIX.backlog);
  const damage = o.codeact && !o.sandbox ? failRate * 0.2 : o.sandbox ? 0 : failRate * 0.02;
  return { e, h, verified: at(MIX.verified), pro: at(MIX.pro), backlog: at(MIX.backlog), damage, turns: Math.round((MIX.backlog * 5 + (1 - MIX.backlog) * 25) * (o.codeact ? 0.6 : 1)) };
}
const pct = x => `${Math.round(x * 100)}%`;

export default {
  slug: 'coding-agent-landscape',
  title: 'Coding agents: the scaffold is the product',
  description: 'The same model in different scaffolding scores very differently. Add retrieval, tests, a sandbox and code actions, and judge it on your own backlog.',
  overview: '"Which coding agent is best?" is the wrong question. The right one is: on tasks like mine, with the scaffolding I will actually run, how reliable is it end to end? SWE-bench gives agents real GitHub issues and checks whether their patch makes the tests pass; SWE-bench Verified is a curated 500-task subset; SWE-bench Pro keeps only changes of ten or more lines. Scores on Verified climbed from a few percent to around 80% in under three years, from better models, better scaffolding and a cleaner benchmark. Scaffolding is load-bearing: the same model has scored 43% in one open scaffold and 60% in another. It buys points in three places. Retrieval: finding the right files is the silent bottleneck, which repo maps and file indexes attack. A verifier loop: run the tests, read the trace, try again, worth ten points or more. Containment: a sandbox that rolls back keeps a failed attempt from leaving a mess the next attempt inherits. Action format is a trade-off: JSON tool calls are one validated action per turn, easy to audit; CodeAct, used by OpenHands, lets the model emit a small program per action, which is compositional and needs fewer turns but has a larger blast radius and needs a hardened sandbox. Finally, beware saturation: about a third of Verified\'s tasks need only one or two lines, which lifts top scores, while the same leaders score far lower on Pro. Your backlog is probably closer to Pro. Measure on a sample of it.',
  keywords: ['coding agents', 'SWE-bench', 'scaffolding', 'CodeAct', 'OpenHands', 'benchmarks', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.4, 0.55, -0.1], dir: [0.05, 0.8, 1.2], half: 1.2, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { retrieval: true, verifier: true, sandbox: true, codeact: true, judge: 'backlog' }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const SXc = -1.9, SZc = -0.3;
    const core = P.cyl(0.34, 0.34, '#3B3F52'); core.position.set(SXc, 0, SZc); S.add(core);
    const ring = (r, h, y, c) => { const m = new THREE.MeshLambertMaterial({ color: c }), g = new THREE.Mesh(new THREE.TorusGeometry(r, 0.04, 10, 48), m); g.rotation.x = Math.PI / 2; g.position.set(SXc, y, SZc); S.add(g); return { g, m }; };
    const rRet = ring(0.5, 0, 0.1, '#5B8DB8'), rVer = ring(0.66, 0, 0.2, GOOD);
    const sbm = new THREE.MeshLambertMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.28 });
    const shell = P.box(1.9, 0.7, 1.5, '#fff', { r: 0.08, material: sbm }); shell.position.set(SXc, 0, SZc); shell.userData.noFit = true; S.add(shell);
    const am = new THREE.MeshLambertMaterial({ color: '#FFF' }), plate = P.box(1.0, 0.05, 0.3, '#fff', { r: 0.03, material: am }); plate.position.set(SXc, 0, SZc + 0.95); S.add(plate);
    const BX = i => 0.0 + i * 0.85, BZ = -0.3, BH = 1.2;
    const names = [['verified', 'benchmark with an\neasy tail (32%)'], ['pro', 'harder benchmark\n(10+ line changes)'], ['backlog', 'your team\'s\nbacklog']];
    const bars = names.map(([k, n], i) => {
      const tr = P.box(0.5, BH, 0.5, '#EFEAE0', { r: 0.03 }); tr.position.set(BX(i), 0, BZ); tr.material = new THREE.MeshLambertMaterial({ color: '#EFEAE0', transparent: true, opacity: 0.45 }); S.add(tr);
      const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.44, 1, 0.44, GOOD, { r: 0.03, material: m }); b.position.set(BX(i), 0, BZ); b.userData.noFit = true; S.add(b);
      return { k, m, b };
    });

    /* an arrow over the score you are judged on, and a lamp for damage outside the workspace */
    const mark = P.arrow(V(0, 1.7, BZ), V(0, 1.35, BZ), 0.03, '#2C2D31'); mark.userData.noFit = true; S.add(mark);
    const dmg = P.lamp(GOOD, { h: 0.45, r: 0.1 }); dmg.position.set(SXc + 0.8, 0, SZc + 0.95); S.add(dmg);
    S.add(P.keep(-2.9, 2.0, 1.75, -1.1, 0.8));
    let R = null;
    function draw() {
      R = scores(st);
      rRet.g.visible = st.retrieval; rVer.g.visible = st.verifier; shell.visible = st.sandbox;
      am.color.set(st.codeact ? '#FBE9C9' : '#E3EEF6');
      dmg.userData.set({ color: R.damage > 0.005 ? RED : GOOD, on: true });
      bars.forEach(B => {
        const x = R[B.k], judged = st.judge === B.k;
        B.b.scale.y = Math.max(0.01, x * BH); B.m.color.set(x >= 0.8 ? GOOD : x >= 0.55 ? SAF : BAD);
        if (judged) P.setArrow(mark, V(BX(bars.indexOf(B)), BH + 0.5, BZ), V(BX(bars.indexOf(B)), BH + 0.12, BZ));
      });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Retrieval: a repo map to find the right files', short: 'Retrieval', get: () => st.retrieval, set: v => set({ retrieval: !!v }) },
      { type: 'toggle', label: 'Verifier loop: run the tests, read the trace, retry', short: 'Verifier', get: () => st.verifier, set: v => set({ verifier: !!v }) },
      { type: 'toggle', label: 'Sandbox that rolls back a failed attempt', short: 'Sandbox', get: () => st.sandbox, set: v => set({ sandbox: !!v }) },
      { type: 'toggle', label: 'CodeAct: a small program per action', short: 'CodeAct', get: () => st.codeact, set: v => set({ codeact: !!v }) },
      { type: 'buttons', label: 'Choose the agent by', options: ['Easy-tail benchmark', 'Harder benchmark', 'Your backlog'], get: () => ['verified', 'pro', 'backlog'].indexOf(st.judge), act: i => set({ judge: ['verified', 'pro', 'backlog'][i] }) },
    ];
    const readouts = [
      { label: 'Your backlog', get: () => ({ v: pct(R.backlog), sub: 'end to end', good: R.backlog >= 0.8, bad: R.backlog < 0.6 }) },
      { label: 'Easy-tail benchmark', get: () => ({ v: pct(R.verified), sub: `harder one: ${pct(R.pro)}` }) },
      { label: 'Damage', get: () => ({ v: pct(R.damage), sub: 'outside the repo', good: R.damage < 0.005, bad: R.damage > 0.03 }) },
    ];
    const labels = [
      { name: 'stack', t: 'One model, a scaffold', d: 'Blue ring repo map, teal tests and retry, glass sandbox', icon: 'box', atV: V(SXc - 0.95, 0.2, SZc) },
      { name: 'act', t: 'Action format', d: 'Gold: code per action. Lamp: damage outside', icon: 'code', atV: V(SXc - 0.5, 0.05, SZc + 0.95) },
      { name: 'bars', t: 'Three task mixes', d: 'Easy-tail benchmark, harder one, your backlog. Arrow: judged', icon: 'target', atV: V(BX(2) + 0.25, 0.2, BZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Strip the scaffold', hint: 'the bare model', on: () => set({ ...D0, retrieval: false, verifier: false, sandbox: false, codeact: false }), off: reset },
      { label: 'Run code actions without a sandbox', hint: 'blast radius', on: () => set({ ...D0, sandbox: false }), off: reset },
      { label: 'Choose by the easy-tail benchmark', hint: 'saturation', on: () => set({ ...D0, retrieval: false, verifier: false, judge: 'verified' }), off: reset },
    ];
    function status() {
      if (!st.retrieval && !st.verifier && !st.sandbox) return { ok: false, msg: `<b>The bare model solves ${pct(R.backlog)} of the backlog; the same weights in the full scaffold solve ${pct(scores(D0).backlog)}.</b> Without a repo map it often edits the wrong files, and without tests and retries one slip ends the task. The model is a component; the loop is the product.` };
      if (st.codeact && !st.sandbox) return { ok: false, msg: `<b>Code actions without a sandbox: a failed attempt leaves its mess for the next retry, so the backlog falls to ${pct(R.backlog)}, and ${pct(R.damage)} of tasks damage something outside the repository.</b> One action can be a whole program; it needs a hardened sandbox that rolls back. JSON calls are safer by default, each one validated.` };
      if (st.judge === 'verified') return { ok: false, msg: `<b>Chosen by the easy-tail benchmark, this agent looks like ${pct(R.verified)}; on the harder benchmark it is ${pct(R.pro)}, and on your backlog ${pct(R.backlog)}.</b> A third of that benchmark is one- or two-line fixes, which lift the top scores. Measure on a sample of the work you actually ship.` };
      if (st.judge === 'pro') return { ok: true, msg: `<b>The harder benchmark (${pct(R.pro)}) is closer to your backlog (${pct(R.backlog)}) than the easy-tail one (${pct(R.verified)}).</b> Better still, sample your own backlog.` };
      if (!st.codeact && st.retrieval && st.verifier && st.sandbox) return { ok: true, msg: `<b>JSON tool calls: ${pct(R.backlog)} on your backlog in about ${R.turns} turns a task, against ${pct(scores(D0).backlog)} in about ${scores(D0).turns} with code actions.</b> Slower and a little less reliable over long tasks, but every call goes through an explicit validator: easier to audit, safer by default.` };
      if (R.backlog < 0.8) return { ok: false, msg: `<b>${pct(R.backlog)} on your backlog with this scaffold.</b> ${!st.retrieval ? 'Without retrieval the agent often edits the wrong files. ' : ''}${!st.verifier ? 'Without a verifier loop, one failed step ends the task. ' : ''}Each layer buys points the model alone can\'t.` };
      return { ok: true, msg: `<b>Same model, full scaffold: ${pct(R.backlog)} on your backlog, ${pct(R.pro)} on the harder benchmark and ${pct(R.verified)} on the easy-tail one, in about ${R.turns} turns a task with nothing damaged outside the sandbox.</b> Retrieval finds the files, the verifier catches slips, the sandbox keeps retries clean.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One model', home: true, say: 'A fintech team in Nairobi wants a coding agent. Start with a bare model: it solves under half their backlog.', act: m => m.set({ retrieval: false, verifier: false, sandbox: false, codeact: false, judge: 'backlog' }) },
    { t: 'Find the right files', home: true, say: 'A repo map helps it find the files to change. Finding them is the silent bottleneck.', act: m => m.set({ retrieval: true, verifier: false, sandbox: false, codeact: false, judge: 'backlog' }) },
    { t: 'Test and retry', home: true, say: 'Run the tests, read the trace, try again, inside a sandbox that rolls back each failed attempt.', act: m => m.set({ retrieval: true, verifier: true, sandbox: true, codeact: false, judge: 'backlog' }) },
    { t: 'Code as the action', home: true, say: 'Let each action be a small program, and tasks take fewer turns. It needs the sandbox even more.', act: m => m.set({ retrieval: true, verifier: true, sandbox: true, codeact: true, judge: 'backlog' }) },
    { t: 'The easy tail', home: true, say: 'A third of one popular benchmark is one- or two-line fixes. Scores there look better than on real work.', act: m => m.set({ retrieval: false, verifier: true, sandbox: true, codeact: true, judge: 'verified' }) },
    { t: 'Measure on your work', home: true, say: 'The scaffold is the product. Judge it on a sample of the tasks you actually ship.', act: m => m.set({ retrieval: true, verifier: true, sandbox: true, codeact: true, judge: 'backlog' }) },
  ],
  check: [
    { q: 'The same model scores very differently in two agents. Why?', options: ['The scaffolding around it differs', 'The weights changed', 'Luck'], answer: 0, why: 'Retrieval, verifier loops and containment are load-bearing.', hint: 'Try Strip the scaffold.' },
    { q: 'What does CodeAct need that JSON tool calls need less?', options: ['A hardened sandbox', 'More turns', 'A bigger model'], answer: 0, why: 'One action can be a whole program.', hint: 'Try Run code actions without a sandbox.' },
    { q: 'Why can a benchmark score overstate real performance?', options: ['An easy tail of tiny fixes lifts it', 'Benchmarks are always wrong', 'It uses old models'], answer: 0, why: 'Measure on your own task mix.', hint: 'Try Choose by the easy-tail benchmark.' },
  ],
  terms: [
    ['Scaffolding', 'Everything around the model: retrieval, planner, tools, verifier, sandbox.'],
    ['SWE-bench', 'Real GitHub issues; the patch must make the tests pass.'],
    ['Verifier loop', 'Run tests, read the failure, try again.'],
    ['CodeAct', 'The model emits code as its action, run in a sandbox.'],
    ['Benchmark saturation', 'Top scores bunch up and stop telling agents apart.'],
    ['Blast radius', 'How much one action can affect if it goes wrong.'],
  ],
  deeper: '<p><b>Open scaffolds.</b> OpenHands (CodeAct in containers, replayable event streams), SWE-agent (an agent-computer interface), Aider (edits as diffs in your repo) and others; managed services tend to keep JSON tool calls because the provider controls the executor.</p><p><b>Long-horizon again.</b> A coding run is a trajectory, so per-step reliability compounds (lesson 1 of this phase); retrieval and retries change the compounding.</p><p><b>About this machine.</b> One fixed per-step reliability; task lengths, retrieval rates and the damage rate are illustrative. The 32% easy share follows the 161 of 500 one- or two-line tasks reported for SWE-bench Verified.</p>',
  code: {
    title: 'Same model, different loop',
    note: 'Adapted from the course\'s scaffold comparison (code/main.py).',
    text: `
def solve(task, scaffold, p_step=0.97):
    steps = task.steps * (0.6 if scaffold.codeact else 1.0)
    found = scaffold.find_rate(task)                 # retrieval: the right files?
    attempt = p_step ** steps                        # compounding over the steps
    miss = 1 - attempt
    for _ in range(scaffold.retries):               # the verifier loop
        clean = 1.0 if scaffold.rollback else 0.4    # retry from a clean state?
        miss *= 1 - attempt * clean
    return found * (1 - miss)

score = lambda agent, tasks: sum(solve(t, agent) for t in tasks) / len(tasks)
`,
  },
};
