// Capstone: a multi-agent software team (phase 19, capstone 10). A Kigali start-up's feature is split by an architect into four slices. Coders work on branches that run into a merge gate; a reviewer and a test step sit before it.
// Shared files make conflicts; worktrees and an interface agreed first prevent them. Conflicts and rework are counted from a small file-overlap table.
const SLICE = [[0, 1], [1, 2], [3], [4, 0]];
function run(o) {
  const n = o.n, used = {}; let conflicts = 0;
  SLICE.slice(0, n).forEach(s => s.forEach(f => { used[f] = (used[f] || 0) + 1; if (used[f] > 1) conflicts++; }));
  const c = o.plan ? 0 : o.iso ? conflicts : conflicts * 3;
  const bugs = o.review ? 0 : 2, broke = o.tests ? 0 : 1;
  const time = Math.ceil(8 / n) + c * 2 + (o.review ? 1 : 0);
  return { c, bugs, broke, time, tokens: 10 + n * 12 + (o.review ? 8 : 0), ok: !c && !bugs && !broke };
}

export default {
  slug: 'multi-agent-software-team',
  title: 'Capstone: a team of agents ships a feature',
  description: 'An architect, four coders, a reviewer, one merge gate. See where parallel coding pays, and where it collides.',
  overview: 'A single coding agent hits a ceiling on large work, because one window can\'t hold the plan, four parts of the code, and the review. A team splits that. An architect plans and agrees interfaces. Coders work in parallel, each in its own git worktree. A reviewer who wrote none of it reads the diffs. Tests guard the merge. The speed comes from parallel work, and so does the danger: agents who touch the same files collide. The plan is what makes parallel work possible, since slices with agreed boundaries don\'t meet. This capstone builds a feature for a start-up in Kigali, and shows where the time goes.',
  keywords: ['multi-agent', 'coding agents', 'git worktree', 'code review', 'merge conflicts', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { n: 4, iso: true, plan: true, review: true, tests: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const arch = add(P.robot(SAF, { scale: 0.85 })); arch.position.set(-2.1, 0.03, 0);
    const ZS = [-0.54, -0.18, 0.18, 0.54], Co = ZS.map((z, i) => { const r = add(P.robot(BLUE, { scale: 0.42 })); r.position.set(-1.35, 0.03, z); const b = add(P.belt(V(-1.1, 0, z), V(0.4, 0, z * 0.25), { w: 0.14, speed: 1 })); return { r, b, u: i * 0.2 }; });
    const rev = add(P.robot('#7B6FA8', { scale: 0.7 })); rev.position.set(0.8, 0.03, -0.45);
    const gate = P.box(0.14, 0.7, 0.9, GOOD, { r: 0.02, material: new S.THREE.MeshLambertMaterial({ color: GOOD }) }); gate.position.set(0.95, 0.03, 0.1); S.add(gate);
    const main = P.box(1.1, 0.25, 0.7, '#2C2D31', { r: 0.05 }); main.position.set(1.75, 0.03, 0); S.add(main);
    const piles = add(P.stack(0.5, 0.4, 0.09, { max: 10 })); piles.position.set(1.75, 0.3, 0);
    S.add(P.keep(-2.45, 2.45, 1.0, -0.75, 0.75));
    let R = null;
    function draw() {
      R = run(st);
      Co.forEach((C, i) => { C.r.visible = i < st.n; C.b.visible = i < st.n; C.r.userData.set({ busy: i < st.n }); });
      rev.visible = st.review; gate.material.color.set(R.ok ? GOOD : BAD);
      piles.userData.set({ n: R.c + R.bugs + R.broke, colors: Array(10).fill(RED) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      { type: 'slider', label: 'Coders', min: 1, max: 4, step: 1, get: () => st.n, set: v => set({ n: v }) },
      tg('plan', 'Architect agrees interfaces first', 'Plan'), tg('iso', 'Each coder has a worktree', 'Worktrees'), tg('review', 'A reviewer reads every diff', 'Reviewer'), tg('tests', 'Tests guard the merge', 'Tests'),
    ];
    const readouts = [
      { label: 'Conflicts', get: () => ({ v: `${R.c}`, sub: 'at the merge gate', good: !R.c, bad: R.c > 2 }) },
      { label: 'Hours to ship', get: () => ({ v: `${R.time}`, sub: `with ${st.n} coders`, good: R.time < 6 }) },
      { label: 'Bugs reaching main', get: () => ({ v: `${R.bugs + R.broke}`, sub: `${R.tokens}k tokens`, good: !(R.bugs + R.broke), bad: R.bugs + R.broke > 0 }) },
    ];
    const labels = [
      { name: 'a', t: 'The architect', d: 'Splits work, sets interfaces', icon: 'user', atV: V(-2.35, 0.5, 0) },
      { name: 'm', t: 'Main branch', d: 'Red stack: conflicts and bugs', icon: 'check', atV: V(2.3, 0.15, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One shared checkout', hint: 'coders overwrite each other', on: () => set({ ...D0, iso: false, plan: false }), off: reset },
      { label: 'Start coding with no plan', hint: 'slices overlap', on: () => set({ ...D0, plan: false }), off: reset },
      { label: 'Skip the reviewer', hint: 'nobody fresh reads it', on: () => set({ ...D0, review: false }), off: reset },
      { label: 'Merge without tests', hint: 'green on each branch', on: () => set({ ...D0, tests: false }), off: reset },
    ];
    function status() {
      if (R.c > 3) return { ok: false, msg: `<b>${R.c} conflicts and ${R.time} hours.</b> In one checkout, coders overwrite each other. The time parallel work saved went straight on untangling it.` };
      if (R.c) return { ok: false, msg: `<b>${R.c} conflicts: slices touched the same files.</b> Worktrees keep edits apart until the merge, and they can't make overlapping plans fit. Agree interfaces before anyone codes.` };
      if (R.bugs) return { ok: false, msg: `<b>${R.bugs} bugs reached main.</b> Each coder marked its own work. A reviewer with fresh context reads the diff, not the reasoning.` };
      if (R.broke) return { ok: false, msg: '<b>Each branch passed alone, and together they broke.</b> Run tests on the merged result.' };
      return { ok: true, msg: `<b>Shipped in ${R.time} hours, with no conflicts, using ${R.tokens}k tokens.</b> ${st.n > 1 ? 'The plan made parallel work safe.' : 'One coder is simpler, and slower.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); Co.forEach((C, i) => { C.u += dt; if (i < st.n && C.u > 1 && C.b.userData.count() < 2) { C.u = 0; C.b.userData.send('#F4F1EA', { size: 0.1 }); } }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Too big for one', home: true, say: 'A start-up in Kigali has a feature too large for one window. One agent would run out of room.', act: m => m.set({ n: 1, iso: true, plan: true, review: true, tests: true }) },
    { t: 'An architect', home: true, say: 'An architect splits it into slices, and agrees the interfaces before any code.', act: m => m.set({ n: 4, iso: true, plan: true, review: true, tests: true }) },
    { t: 'In parallel', home: true, say: 'Four coders work at once, each in a worktree. Hours fall.', act: m => m.set({ n: 4, iso: true, plan: true, review: true, tests: true }) },
    { t: 'Collisions', home: true, say: 'Without a plan, slices touch the same files. Conflicts pile up at the gate.', act: m => m.set({ n: 4, iso: false, plan: false, review: true, tests: true }) },
    { t: 'A fresh reader', home: true, say: 'A reviewer who wrote none of it reads every diff, and catches what the coder believes is fine.', act: m => m.set({ n: 4, iso: true, plan: true, review: false, tests: true }) },
    { t: 'Test the merge', home: true, say: 'Branches can pass alone and fail together, so test the merged result.', act: m => m.set({ n: 4, iso: true, plan: true, review: true, tests: false }) },
  ],
  check: [
    { q: 'What makes parallel coding safe?', options: ['Interfaces agreed first', 'More agents', 'Longer prompts'], answer: 0, why: 'Slices with boundaries don\'t collide.', hint: 'Try Start coding with no plan.' },
    { q: 'What does a worktree give each coder?', options: ['Its own copy of the files', 'A bigger model', 'A new repo'], answer: 0, why: 'Edits stay apart until the merge.', hint: 'Try One shared checkout.' },
    { q: 'Why test after the merge?', options: ['Branches can pass alone and fail together', 'Tests are cheap', 'It is required'], answer: 0, why: 'Only the merged code is real.', hint: 'Try Merge without tests.' },
  ],
  terms: [['Architect agent', 'Plans and splits the work.'], ['Git worktree', 'A separate checkout of one repo.'], ['Merge conflict', 'Two edits to one place.'], ['Interface', 'The agreed boundary between parts.'], ['Merge gate', 'Checks before main.']],
  deeper: '<p><b>Use it when work splits.</b> A tightly linked change is faster with one agent.</p><p><b>Tokens.</b> Teams cost several times more. Count it in the plan.</p><p><b>Numbers</b> come from a small overlap table.</p>',
  code: {
    title: 'A team run',
    note: 'A sketch of the course\'s capstone (code/main.py).',
    text: `
plan = architect(feature)                        # slices and interfaces
branches = parallel(coder, plan.slices)          # one worktree each
for branch in branches:
    report = reviewer(branch.diff, plan)
    if report.ok:
        merge_queue.add(branch)
merged = merge_queue.run(run_tests)
`,
  },
};
