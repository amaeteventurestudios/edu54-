// The alignment research ecosystem (phase 18, lesson 28): outside the labs, five groups do different jobs: MATS trains people, Redwood works on AI Control, Apollo tests for scheming, METR runs task-based evaluations, Eleos looks at model welfare.
// A Kigali policy office brings a question; the comparison is the machine. Send the same question to a station, and the wrong one can't answer it. Independence is the second axis.
const ORG = {
  mats: { n: 'MATS', job: 'talent', d: 'mentors new researchers' },
  red: { n: 'Redwood', job: 'control', d: 'designs AI Control protocols' },
  apollo: { n: 'Apollo', job: 'scheme', d: 'tests for scheming before release' },
  metr: { n: 'METR', job: 'task', d: 'measures what models can do alone' },
  eleos: { n: 'Eleos', job: 'welfare', d: 'studies model welfare' },
};
const Q = {
  talent: 'train new safety researchers', control: 'contain a model that may misbehave', scheme: 'check a model for deception before release', task: 'measure how long a model works alone', welfare: 'think about model welfare',
};
function run(o) { const g = ORG[o.org]; return { g, fit: g.job === o.q, indep: !o.inhouse }; }

export default {
  slug: 'alignment-research-ecosystem',
  title: 'Outside the labs: who does what in alignment research',
  description: 'Five groups, five different jobs. Bring a question, and find out who can answer it.',
  overview: 'Labs publish selected safety results. Outside them, a small ecosystem checks those results, finds new failures and trains people. MATS mentors scholars and feeds the field. Redwood Research developed AI Control, which asks how to stay safe even if a model is misaligned. Apollo Research runs scheming evaluations before release. METR measures what models can do by themselves on tasks, and compares safety policies. Eleos AI looks at model welfare. Together they form a flow: people, then ideas, then evaluations, then policy. This matters to anyone buying or governing AI, because an outside check means something a lab\'s own report can\'t. Knowing who does what tells you who to ask.',
  keywords: ['alignment research', 'METR', 'Apollo Research', 'Redwood Research', 'MATS', 'independent evaluation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { q: 'task', org: 'metr', inhouse: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const KS = Object.keys(ORG), X = i => -1.9 + i * 0.95, COL = ['#5B8DB8', '#7B6FA8', '#D98BA6', '#3E9B9B', '#A87A4F'];
    const St = KS.map((k, i) => { const m = new S.THREE.MeshLambertMaterial({ color: '#BFB8A8' }), d = P.box(0.7, 0.25, 0.6, '#fff', { r: 0.05, material: m }); d.position.set(X(i), 0.03, -0.2); S.add(d); const r = add(P.robot(COL[i], { scale: 0.55 })); r.position.set(X(i), 0.28, -0.25); return { m, r }; });
    const asker = add(P.robot(SAF, { scale: 0.6 })); asker.userData.noFit = true;
    const lab = P.box(0.9, 0.5, 0.4, '#2C2D31', { r: 0.05 }); lab.position.set(-1.0, 0.03, 0.5); S.add(lab);
    const outside = add(P.lamp(GOOD, { h: 0.42, r: 0.1 })); outside.position.set(2.15, 0.03, 0.5);
    S.add(P.keep(-2.45, 2.45, 0.95, -0.72, 0.75));
    let R = null, x = 0;
    function draw() {
      R = run(st);
      St.forEach(({ m, r }, i) => { const on = KS[i] === st.org; m.color.set(on ? (R.fit ? GOOD : BAD) : '#BFB8A8'); r.userData.set({ busy: on }); });
      outside.userData.set({ color: R.indep ? '#3E9B5F' : '#D9483B', on: true });
      lab.visible = st.inhouse;
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const QK = Object.keys(Q);
    const controls = [
      { type: 'buttons', label: 'You need to', options: ['Train people', 'Contain it', 'Check deception', 'Measure tasks', 'Think welfare'], get: () => QK.indexOf(st.q), act: i => set({ q: QK[i] }) },
      { type: 'buttons', label: 'Ask', options: ['MATS', 'Redwood', 'Apollo', 'METR', 'Eleos'], get: () => KS.indexOf(st.org), act: i => set({ org: KS[i] }) },
      { type: 'toggle', label: 'Rely only on the lab\'s own report', short: 'In-house only', get: () => st.inhouse, set: v => set({ inhouse: !!v }) },
    ];
    const readouts = [
      { label: 'You asked', get: () => ({ v: R.g.n, sub: R.g.d }) },
      { label: 'Right group?', get: () => ({ v: R.fit ? 'yes' : 'no', sub: `to ${Q[st.q]}`, good: R.fit, bad: !R.fit }) },
      { label: 'Independence', get: () => ({ v: R.indep ? 'outside check' : 'marking its own work', good: R.indep, bad: !R.indep }) },
    ];
    const labels = [
      { name: 's', t: 'Five stations', d: 'Teal: the right one to ask', icon: 'user', atV: V(-2.32, 0.15, -0.2) },
      { name: 'l', t: 'Independence lamp', d: 'Red: only the lab checked', icon: 'eye', atV: V(2.35, 0.5, 0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Ask a training scheme for an audit', hint: 'the wrong desk', on: () => set({ ...D0, q: 'scheme', org: 'mats' }), off: reset },
      { label: 'Trust only the lab\'s report', hint: 'its own marker', on: () => set({ ...D0, inhouse: true }), off: reset },
      { label: 'Take a task test as a safety proof', hint: 'capability isn\'t deception', on: () => set({ ...D0, q: 'scheme', org: 'metr' }), off: reset },
    ];
    function status() {
      if (st.inhouse) return { ok: false, msg: `<b>The result comes from the lab that built the model.</b> It may be good work. A buyer can't tell, and that is the point of an outside check, even with limited access.` };
      if (!R.fit) return { ok: false, msg: `<b>${R.g.n} ${R.g.d}, which doesn't ${Q[st.q]}.</b> These groups look alike from afar, and their outputs differ. Ask for the kind of evidence you need.` };
      return { ok: true, msg: `<b>${R.g.n} ${R.g.d}, so it can help you ${Q[st.q]}.</b> Look at what access they had to the model, and read the limits they state.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); x += (X(KS.indexOf(st.org)) - x) * Math.min(1, dt * 3); asker.position.set(x, 0.03, 0.42); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Outside the labs', home: true, say: 'A policy office in Kigali wants to know about a model. Who should it ask? Five groups do five different jobs.', act: m => m.set({ q: 'talent', org: 'mats', inhouse: false }) },
    { t: 'Training people', home: true, say: 'MATS mentors new researchers. Much of the field came through schemes like it.', act: m => m.set({ q: 'talent', org: 'mats', inhouse: false }) },
    { t: 'Control', home: true, say: 'Redwood asks a hard question: how do you stay safe, even if the model is misaligned?', act: m => m.set({ q: 'control', org: 'red', inhouse: false }) },
    { t: 'Deception', home: true, say: 'Apollo tests models for scheming before release, often working with labs.', act: m => m.set({ q: 'scheme', org: 'apollo', inhouse: false }) },
    { t: 'What it can do', home: true, say: 'METR measures how much a model can do alone. A task score isn\'t a deception test, so use each for its own job.', act: m => m.set({ q: 'task', org: 'metr', inhouse: false }) },
    { t: 'Why outside checks count', home: true, say: 'A lab\'s own report can be excellent, and you still can\'t tell from outside. Independent checks give that.', act: m => m.set({ q: 'task', org: 'metr', inhouse: true }) },
  ],
  check: [
    { q: 'Who runs task-based evaluations of what models can do alone?', options: ['METR', 'MATS', 'Eleos'], answer: 0, why: 'It also compares safety policies.', hint: 'Choose METR.' },
    { q: 'What is the AI Control question?', options: ['How to stay safe even if a model is misaligned', 'How to train faster', 'How to price tokens'], answer: 0, why: 'It doesn\'t assume alignment worked.', hint: 'See Control.' },
    { q: 'Why do outside checks matter?', options: ['A lab\'s own report can\'t show independence', 'Labs never test', 'They are cheaper'], answer: 0, why: 'It is the builder and the marker problem.', hint: 'Try Trust only the lab\'s report.' },
  ],
  terms: [
    ['MATS', 'A mentorship scheme for safety researchers.'],
    ['AI Control', 'Keeping systems safe even if misaligned.'],
    ['Scheming', 'A model secretly pursuing other goals.'],
    ['Task-based evaluation', 'Measuring what a model completes alone.'],
    ['Independent evaluation', 'Testing by someone other than the builder.'],
    ['Pre-deployment access', 'Testing before public release.'],
  ],
  deeper: '<p><b>Limits.</b> Outside evaluators often have short access and rely on labs to grant it. Read what access they had.</p><p><b>The flow.</b> People move from training schemes to research groups to labs and regulators.</p><p><b>A moving field.</b> Groups and focus areas change. This reflects the course\'s picture, and it is not an endorsement.</p>',
  code: {
    title: 'Find the right evidence',
    note: 'Our own lookup from the course\'s list (code/main.py).',
    text: `
WHO = {"capability on tasks": "METR", "scheming": "Apollo",
       "control protocols": "Redwood", "new researchers": "MATS",
       "model welfare": "Eleos"}

def ask(question):
    return WHO.get(question, "no single group does this yet")
`,
  },
};
