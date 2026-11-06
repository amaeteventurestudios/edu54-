// Hierarchical agents (phase 16, lesson 6): a Tunis bank reviews a contract with a tree of agents: one top manager, three sub-managers, six workers. A report travels up and its meaning fades at each level.
// Three failure modes from the course: task assignment error, output misinterpretation, consensus loop. The task's shape decides whether a tree helps at all.
const FADE = 0.82;
function run(o) {
  const levels = o.depth, hops = levels - 1;
  const fid = Math.pow(o.fault === 'drift' ? FADE : 0.97, hops);
  const wrongBranch = o.fault === 'assign';
  const loops = o.fault === 'loop' ? (o.cap ? 2 : 9) : 1;
  const mgr = o.depth === 3 ? 4 : o.depth === 2 ? 1 : 0, calls = (mgr + 6) * loops;
  const bad = o.shape === 'line' && o.depth > 1;
  return { fid, wrongBranch, loops, calls, bad, ok: fid > 0.8 && !wrongBranch && loops < 3 && !bad };
}

export default {
  slug: 'hierarchical-architecture',
  title: 'Hierarchies of agents: where meaning leaks',
  description: 'Managers over managers over workers. A report climbs the tree, and watch what it loses at each level.',
  overview: 'Once a supervisor works, the next idea is workers who are also supervisors. Teams have sub-teams, after all. It helps when work really is departmental: legal, finance and engineering each review a document, and the top sees three summaries, not fifteen reports. But a model manager is not a human one. It rebuilds its picture of the organisation from its context on every turn. Three failures keep showing up: a wrong split sent to the wrong team, meaning that drifts as each level summarises, and managers who disagree and send work round again. The deciding question: do you really have independent teams, or one line of work pretending to be a tree?',
  keywords: ['hierarchical agents', 'multi-agent', 'manager agents', 'failure modes', 'delegation', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.7, 0], dir: [0.05, 0.3, 1.2], half: 1.1, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { depth: 3, fault: 'none', shape: 'tree', cap: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.2, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const WX = i => -1.75 + i * 0.7, MX = i => -1.4 + i * 1.4;
    const shelfM = P.box(4.2, 0.06, 0.5, '#A87A4F', { r: 0.02 }); shelfM.position.set(0, 0.62, 0); S.add(shelfM);
    const shelfT = P.box(1.1, 0.06, 0.5, '#A87A4F', { r: 0.02 }); shelfT.position.set(0, 1.24, 0); S.add(shelfT);
    [[-2, 0.62], [2, 0.62], [-0.5, 0.62], [0.5, 0.62]].forEach(([x, h]) => { const p = P.box(0.06, h + (Math.abs(x) < 1 ? 0.62 : 0), 0.06, '#6B6E7E', { r: 0.01 }); p.position.set(x, 0, -0.2); S.add(p); });
    const W = Array.from({ length: 6 }, (_, i) => { const r = add(P.robot(BLUE, { scale: 0.5 })); r.position.set(WX(i), 0.03, 0.05); return r; });
    const M = [0, 1, 2].map(i => { const r = add(P.robot('#7B6FA8', { scale: 0.55 })); r.position.set(MX(i), 0.68, 0.02); return r; });
    const T = add(P.robot(SAF, { scale: 0.62 })); T.position.set(0, 1.3, 0.02);
    const rep = P.box(0.26, 0.2, 0.16, GOOD, { r: 0.02, material: new S.THREE.MeshLambertMaterial({ color: GOOD }) }); rep.userData.noFit = true; S.add(rep);
    S.add(P.keep(-2.5, 2.5, 1.95, -0.65, 0.65));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      M.forEach((r, i) => { r.visible = st.depth === 3; r.userData.set({ color: R.wrongBranch && i === 2 ? BAD : '#7B6FA8', busy: st.fault === 'loop' }); });
      shelfM.visible = st.depth === 3;
      T.visible = st.depth >= 2;
      W.forEach((r, i) => r.userData.set({ busy: true, color: R.wrongBranch && i >= 4 ? BAD : BLUE }));
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const FK = ['none', 'assign', 'drift', 'loop'], SK = ['tree', 'line'], DK = [1, 2, 3];
    const controls = [
      { type: 'buttons', label: 'What goes wrong', options: ['Nothing', 'Wrong team', 'Meaning drifts', 'Round and round'], get: () => FK.indexOf(st.fault), act: i => set({ fault: FK[i] }) },
      { type: 'buttons', label: 'Levels', options: ['Workers only', 'One manager', 'Two levels'], get: () => DK.indexOf(st.depth), act: i => set({ depth: DK[i] }) },
      { type: 'buttons', label: 'The work is', options: ['Separate teams', 'One long line'], get: () => SK.indexOf(st.shape), act: i => set({ shape: SK[i] }) },
      { type: 'toggle', label: 'Limit rounds of reconciling', short: 'Round cap', get: () => st.cap, set: v => set({ cap: !!v }) },
    ];
    const readouts = [
      { label: 'Meaning at the top', get: () => ({ v: `${Math.round(R.fid * 100)}%`, sub: 'of the original report', good: R.fid > 0.9, bad: R.fid < 0.75 }) },
      { label: 'Model calls', get: () => ({ v: `${R.calls}`, sub: R.loops > 1 ? `${R.loops} rounds` : 'one round', good: R.calls < 15, bad: R.calls > 30 }) },
      { label: 'Fits this work', get: () => ({ v: R.bad ? 'no' : 'yes', sub: st.shape === 'tree' ? 'independent teams' : 'one linear flow', good: !R.bad, bad: R.bad }) },
    ];
    const labels = [
      { name: 'r', t: 'A report climbs', d: 'It pales as meaning drifts', icon: 'wave', atV: V(WX(0) - 0.25, 0.3, 0.05) },
      { name: 't', t: 'The tree', d: 'Only leaves do real work', icon: 'link', atV: V(WX(5) + 0.25, 0.3, 0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'The manager splits it wrongly', hint: 'obedient teams, wrong work', on: () => set({ ...D0, fault: 'assign' }), off: reset },
      { label: 'Summaries of summaries', hint: 'a phrase changes each level', on: () => set({ ...D0, fault: 'drift' }), off: reset },
      { label: 'Managers disagree, no limit', hint: 'work goes round again', on: () => set({ ...D0, fault: 'loop', cap: false }), off: reset },
      { label: 'A tree for one long line', hint: 'pretend departments', on: () => set({ ...D0, shape: 'line' }), off: reset },
    ];
    function status() {
      if (R.wrongBranch) return { ok: false, msg: '<b>The contract\'s tax clause went to the wrong team, and they worked hard on it.</b> Sub-teams do what they are given, so an early bad split stays hidden until the end. Have the split checked before any work starts.' };
      if (st.fault === 'drift') return { ok: false, msg: `<b>${Math.round(R.fid * 100)}% of the meaning reached the top.</b> "Unable to verify the clause" became "clause not confirmed", then "clause looks fine". Each level summarises the last. Pass structured findings up, not prose.` };
      if (R.loops > 2) return { ok: false, msg: `<b>${R.loops} rounds and ${R.calls} model calls, and they still disagree.</b> The top asks two managers to reconcile, they send it down, the workers repeat, and answers shift a little. Cap the rounds, and let one person decide.` };
      if (R.bad) return { ok: false, msg: `<b>This work is one line, and the tree only adds middle layers.</b> Each step depends on the last, so nothing can run alone. Use a sequence. A tree only earns its keep with truly independent teams.` };
      return { ok: true, msg: `<b>${Math.round(R.fid * 100)}% of the meaning reached the top, in ${R.calls} calls.</b> ${st.depth === 1 ? 'With no managers there is nothing to drift.' : 'Legal, finance and engineering are really independent, so each level earns its place.'}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.4 * (st.fault === 'loop' && !st.cap ? 2 : 1)) % 1;
        const top = st.depth === 3 ? 1.75 : st.depth === 2 ? 1.2 : 0.55, f = 1 - (1 - R.fid) * u * 1.6;
        rep.position.set(-0.7, 0.2 + (top - 0.2) * u, 0.42); rep.material.color.set(GOOD).lerp(new S.THREE.Color(R.fid < 0.8 ? '#D8D2C4' : GOOD), 1 - f);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Teams of teams', home: true, say: 'A bank in Tunis reviews a contract. Legal, finance and engineering each have a manager, and a top manager sits above them.', act: m => m.set({ depth: 3, fault: 'none', shape: 'tree', cap: true }) },
    { t: 'Why it helps', home: true, say: 'The top reads three summaries, not six reports. When teams are truly separate, that is a real saving.', act: m => m.set({ depth: 3, fault: 'none', shape: 'tree', cap: true }) },
    { t: 'Wrong team', home: true, say: 'A model manager rebuilds the organisation in its head each turn. One bad split, and a team works hard on the wrong thing.', act: m => m.set({ depth: 3, fault: 'assign', shape: 'tree', cap: true }) },
    { t: 'Meaning drifts', home: true, say: '"Unable to verify" becomes "not confirmed", then "looks fine". The report pales with every level.', act: m => m.set({ depth: 3, fault: 'drift', shape: 'tree', cap: true }) },
    { t: 'Round and round', home: true, say: 'Two managers disagree. They send work down, it comes back slightly different, and the loop goes on. Cap the rounds.', act: m => m.set({ depth: 3, fault: 'loop', shape: 'tree', cap: false }) },
    { t: 'The deciding question', home: true, say: 'Do you have independent teams, or one line pretending to be a tree? If it is a line, use a sequence.', act: m => m.set({ depth: 2, fault: 'none', shape: 'line', cap: true }) },
  ],
  check: [
    { q: 'When does a hierarchy of agents help?', options: ['When the work really splits into independent teams', 'Always', 'When there is one long sequence'], answer: 0, why: 'Otherwise you only add middle layers.', hint: 'Try A tree for one long line.' },
    { q: 'What is output misinterpretation?', options: ['Meaning changing as each level summarises', 'A typing error', 'A slow API'], answer: 0, why: 'Summaries of summaries drift.', hint: 'Try Summaries of summaries.' },
    { q: 'How do you stop a consensus loop?', options: ['Cap the rounds and name a decider', 'Add another manager', 'Raise the temperature'], answer: 0, why: 'Without a limit, it keeps going round.', hint: 'Try Managers disagree, no limit.' },
  ],
  terms: [
    ['Hierarchy', 'Managers over managers; only leaves do the work.'],
    ['Task assignment error', 'A wrong split sent to the wrong team.'],
    ['Output misinterpretation', 'Meaning that drifts between levels.'],
    ['Consensus loop', 'Work going round while managers disagree.'],
    ['Local summarisation', 'Each team condenses before reporting up.'],
    ['Sequential', 'Steps in one line, each using the last.'],
  ],
  deeper: '<p><b>Check the split.</b> A cheap validation of the plan, before any worker starts, catches the most expensive failure.</p><p><b>Structure up, not prose.</b> Fields such as status, evidence and confidence survive summarising. "Unable to verify" should arrive as a flag.</p><p><b>Numbers here</b> are round figures to show the shape. The fade of 0.82 per level is illustrative.</p>',
  code: {
    title: 'Findings that survive the climb',
    note: 'A sketch built on the course\'s failure modes (code/main.py).',
    text: `
@dataclass
class Finding:
    claim: str
    status: Literal["verified", "unverified", "rejected"]
    evidence: list[str]

def manager(team, task, rounds=2):
    findings = [worker(task) for worker in team]
    if conflict(findings) and rounds > 0:
        return manager(team, narrow(task, findings), rounds - 1)
    return findings                              # passed up unchanged
`,
  },
};
