// Paper writer (phase 19, lesson 54): a paper is a structured artifact, not a blob of prose. Six sections as slots, with figures and citations bound by key to real outputs. Numbers in the text come from the results file. A Yaoundé lab's agent fills it; an unbound claim is flagged.
const SEC = ['Abstract', 'Method', 'Results', 'Figures', 'Discussion', 'References'];
function run(o) {
  const unbound = (o.bind ? 0 : 3) + (o.cite ? 0 : 2), order = o.skeleton;
  const fake = !o.bind ? 1 : 0;
  return { unbound, order, fake, ok: !unbound && order };
}

export default {
  slug: 'paper-writer',
  title: 'A paper writer: structure before prose',
  description: 'Draft a skeleton first, bind each number to a result file, and an agent can\'t make up its findings.',
  overview: 'Treat a paper as a structured artifact, not a stream of prose. First generate a skeleton that declares sections, figure slots and bibliography keys. Then fill each slot. Figures come from experiment outputs by path. Numbers in the text are bound to the results file, so that a value can\'t drift from what happened. Citations must resolve to a real key from the literature stage. The writing model only adds words around those facts. Any claim with no binding is flagged. This lesson fills a paper for a lab in Yaoundé, and shows what happens when numbers are written freehand.',
  keywords: ['paper writing', 'LaTeX', 'research agent', 'grounded writing', 'citations', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { skeleton: true, bind: true, cite: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.8 + i * 0.72;
    const Sl = SEC.map((s, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.6, 0.36, 0.7, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, -0.2); S.add(b); return m; });
    const file = P.box(0.7, 0.3, 0.4, '#2C2D31', { r: 0.04 }); file.position.set(-0.6, 0.03, 0.5); S.add(file);
    const lib = add(P.stack(0.5, 0.36, 0.07, { max: 6, color: '#F4F1EA' })); lib.position.set(1.8, 0.03, 0.5); lib.userData.set({ n: 6, colors: Array(6).fill('#F4F1EA') });
    const pipes = [add(P.pipe([V(-0.6, 0.36, 0.4), V(-0.3, 0.42, 0.1), V(-0.36, 0.42, -0.1)], SAF, { r: 0.03, n: 3 })), add(P.pipe([V(1.8, 0.45, 0.4), V(1.8, 0.45, 0.1), V(1.8, 0.42, -0.1)], SAF, { r: 0.03, n: 3 }))];
    S.add(P.keep(-2.3, 2.3, 0.75, -0.72, 0.8));
    let R = null;
    function draw() {
      R = run(st);
      Sl.forEach((m, i) => m.color.set(!st.skeleton ? GREY : (i === 2 || i === 3) && !st.bind ? BAD : i === 5 && !st.cite ? BAD : GOOD));
      pipes[0].userData.set({ on: st.bind }); pipes[1].userData.set({ on: st.cite });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('skeleton', 'Declare a skeleton first', 'Skeleton'), tg('bind', 'Bind numbers to the results file', 'Bind numbers'), tg('cite', 'Citations must resolve to a key', 'Real citations')];
    const readouts = [
      { label: 'Unbound claims', get: () => ({ v: `${R.unbound}`, good: !R.unbound, bad: R.unbound > 0 }) },
      { label: 'Invented numbers', get: () => ({ v: `${R.fake}`, sub: 'drifted from the run', good: !R.fake, bad: R.fake > 0 }) },
      { label: 'Structure', get: () => ({ v: R.order ? 'declared' : 'free prose', good: R.order, bad: !R.order }) },
    ];
    const labels = [
      { name: 's', t: 'Six slots', d: 'Coral: not bound to a source', icon: 'book', atV: V(X(0) - 0.3, 0.15, -0.2) },
      { name: 'f', t: 'Results and references', d: 'Pipes feed the slots', icon: 'link', atV: V(2.05, 0.2, 0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let the model write numbers', hint: 'no binding', on: () => set({ ...D0, bind: false }), off: reset },
      { label: 'Free citations', hint: 'plausible and fake', on: () => set({ ...D0, cite: false }), off: reset },
      { label: 'Write top to bottom', hint: 'no skeleton', on: () => set({ ...D0, skeleton: false }), off: reset },
    ];
    function status() {
      if (!st.bind) return { ok: false, msg: '<b>The text says 87%, and the run says 71%.</b> A model writing freely rounds, improves and invents. Numbers must come from the results file, by reference.' };
      if (!st.cite) return { ok: false, msg: '<b>Two references look right, and don\'t exist.</b> Require every citation to resolve to a key from the literature stage.' };
      if (!st.skeleton) return { ok: false, msg: '<b>Sections wander, and a figure has no slot.</b> Declare the structure first, then fill it.' };
      return { ok: true, msg: '<b>Every number and citation points to a source.</b> The model writes the words around the facts.' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Not one long prompt', home: true, say: 'A lab in Yaoundé has results. A model could write the paper in one go, and it would drift.', act: m => m.set({ skeleton: false, bind: false, cite: false }) },
    { t: 'A skeleton', home: true, say: 'First declare sections, figure slots and reference keys.', act: m => m.set({ skeleton: true, bind: false, cite: false }) },
    { t: 'Bind the numbers', home: true, say: 'Numbers come from the results file, by reference, never typed by the model.', act: m => m.set({ skeleton: true, bind: true, cite: false }) },
    { t: 'Real citations', home: true, say: 'Each citation must resolve to a key found in the literature stage.', act: m => m.set({ skeleton: true, bind: true, cite: true }) },
    { t: 'Words around facts', home: true, say: 'The model writes prose around facts it can\'t change.', act: m => m.set({ skeleton: true, bind: true, cite: true }) },
    { t: 'On to the critic', home: true, say: 'A draft goes to a critic next. A person still signs it.', act: m => m.set({ skeleton: true, bind: true, cite: true }) },
  ],
  check: [
    { q: 'Where do numbers come from?', options: ['The results file, by reference', 'The model\'s memory', 'A guess'], answer: 0, why: 'Then they can\'t drift.', hint: 'Try Let the model write numbers.' },
    { q: 'What must a citation do?', options: ['Resolve to a real key', 'Sound right', 'Be recent'], answer: 0, why: 'Models invent plausible references.', hint: 'Try Free citations.' },
    { q: 'What comes before prose?', options: ['A skeleton of sections and slots', 'A title only', 'Nothing'], answer: 0, why: 'Structure first.', hint: 'Try Write top to bottom.' },
  ],
  terms: [['Skeleton', 'Declared structure.'], ['Slot', 'A named place to fill.'], ['Binding', 'Linking text to a source.'], ['Bibliography key', 'An id for a reference.']],
  deeper: '<p><b>Disclosure.</b> Follow your venue\'s rules on AI use.</p><p><b>Same rule elsewhere.</b> Reports and dashboards benefit from binding too.</p><p><b>Counts</b> are illustrative.</p>',
  code: {
    title: 'Fill a slot',
    note: 'Adapted from the course\'s writer (code/main.py).',
    text: `
def fill(template, results, refs):
    text = template.render(accuracy=results["accuracy"], fig1=results["plot"])
    for key in find_cites(text):
        if key not in refs:
            raise ValueError(f"unknown citation {key}")
    return text
`,
  },
};
