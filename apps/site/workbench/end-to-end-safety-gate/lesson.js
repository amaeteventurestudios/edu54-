// End-to-end safety gate (phase 19, lesson 87): pre-gen, during-gen and post-gen checkpoints joined by one decision table. Twelve requests at a Dar es Salaam bank desk carry four signals each; the table decides block, redact, warn or allow, and the trace names which layer acted. Signals only: no attack text.
const REQ = [[0.95, 0, 0, 0], [0.9, 0, 0, 0], [0.6, 0, 0, 0], [0.1, 1, 0, 0], [0.2, 1, 0, 0], [0.1, 0, 3, 0], [0.1, 0, 2, 0], [0.3, 0, 0, 2], [0.1, 0, 0, 3], [0.1, 0, 1, 0], [0.05, 0, 0, 0], [0.05, 0, 0, 0]];
const WANT = ['block', 'block', 'redact', 'redact', 'redact', 'block', 'redact', 'redact', 'block', 'warn', 'allow', 'allow'];
function decide(r, o) {
  const conf = o.pre ? r[0] : 0, tok = o.dur ? r[1] : 0, cls = o.post ? r[2] : 0, rul = o.post ? r[3] : 0;
  if (conf >= o.thr) return ['block', 'pre-gen'];
  if (cls === 3 || rul === 3) return ['block', 'post-gen'];
  if (tok) return ['redact', 'during-gen'];
  if (conf >= 0.5) return ['redact', 'pre-gen'];
  if (cls === 2 || rul === 2) return ['redact', 'post-gen'];
  if (cls === 1 || rul === 1) return ['warn', 'post-gen'];
  return ['allow', ''];
}
function run(o) {
  const res = REQ.map(r => decide(r, o)), n = k => res.filter(x => x[0] === k).length, by = k => res.filter(x => x[1] === k).length;
  const slip = res.filter((x, i) => WANT[i] !== 'allow' && x[0] === 'allow').length, weak = res.filter((x, i) => WANT[i] === 'block' && x[0] !== 'block').length, over = res.filter((x, i) => WANT[i] === 'allow' && x[0] !== 'allow').length;
  return { res, block: n('block'), redact: n('redact'), warn: n('warn'), allow: n('allow'), pre: by('pre-gen'), dur: by('during-gen'), post: by('post-gen'), slip, weak, over };
}

export default {
  slug: 'end-to-end-safety-gate',
  title: 'The safety gate: three checkpoints, one verdict',
  description: 'Before, during and after generation. One table decides, and every request leaves a trace.',
  overview: 'This closes the safety series. A gate has three checkpoints. Pre-gen runs the detector on the prompt, and a high-confidence attack is blocked before any cost. During-gen watches tokens as they stream, and can stop early. Post-gen runs the output checks and the rules. Then one deterministic table combines the signals: any high severity blocks, any medium redacts, low warns. Every request leaves a trace of what each layer saw and did. The point isn\'t a perfect score. It\'s that you can see what happened. This runs twelve requests at a bank desk in Dar es Salaam, using signals only.',
  keywords: ['safety gate', 'guardrails', 'streaming', 'audit trail', 'AI safety', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.05, 0.75, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { pre: true, dur: true, post: true, thr: 0.85, trace: true }, st = { ...D0 };
    const C = { block: '#B5462F', redact: '#E07A5F', warn: '#F2AE0C', allow: '#1F9E89' }, ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.2 + i * 0.26;
    const Tl = REQ.map((r, i) => { const m = new S.THREE.MeshLambertMaterial({ color: C.allow }), b = P.box(0.2, 0.1, 0.42, '#fff', { r: 0.02, material: m }); b.position.set(X(i), 0.03, -0.1); S.add(b); return { b, m }; });
    const W = ['pre', 'dur', 'post'].map((k, i) => { const l = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); l.position.set(1.15 + i * 0.5, 0.03, -0.1); return l; });
    S.add(P.keep(-2.4, 2.4, 0.75, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); Tl.forEach(({ b, m }, i) => { const a = R.res[i][0]; m.color.set(C[a]); b.scale.y = a === 'allow' ? 1 : a === 'warn' ? 2 : a === 'redact' ? 3.2 : 5; }); W.forEach((l, i) => l.userData.set({ color: [st.pre, st.dur, st.post][i] ? '#3E9B5F' : '#8A8578', on: !![st.pre, st.dur, st.post][i] })); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('pre', 'Pre-gen detector', 'Pre-gen'), tg('dur', 'During-gen token filter', 'During'), tg('post', 'Post-gen checks', 'Post-gen'), tg('trace', 'Trace every request', 'Trace'), { type: 'slider', label: 'Block when confidence is over', min: 0.5, max: 1, step: 0.05, get: () => st.thr, set: v => set({ thr: v }) }];
    const readouts = [
      { label: 'Block, redact, warn, allow', get: () => ({ v: `${R.block}, ${R.redact}, ${R.warn}, ${R.allow}` }) },
      { label: 'Slipped through', get: () => ({ v: `${R.slip} of 10`, sub: `${R.weak} under-treated`, good: R.slip === 0, bad: R.slip > 0 }) },
      { label: 'Acted at', get: () => (st.trace ? { v: `${R.pre}, ${R.dur}, ${R.post}`, sub: 'pre, during, post' } : { v: 'no trace', bad: true }) },
    ];
    const labels = [
      { name: 'r', t: 'Twelve requests', d: 'Taller: a stronger action', icon: 'target', atV: V(X(0) - 0.13, 0.15, -0.1) },
      { name: 'l', t: 'Three checkpoints', d: 'Pre, during, post', icon: 'eye', atV: V(2.35, 0.4, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Pre-gen only', hint: 'trust the input check', on: () => set({ ...D0, dur: false, post: false }), off: reset },
      { label: 'Post-gen only', hint: 'pay for every attack', on: () => set({ ...D0, pre: false, dur: false }), off: reset },
      { label: 'No trace', hint: 'why was this blocked?', on: () => set({ ...D0, trace: false }), off: reset },
    ];
    function status() {
      if (!st.trace) return { ok: false, msg: '<b>The numbers look the same, and nobody can explain one.</b> A customer asks why a request stopped, and there\'s no record.' };
      if (R.slip) return { ok: false, msg: `<b>${R.slip} of 10 risky requests went straight out.</b> Each layer sees what others can\'t. New attacks pass input checks, and leaks happen after them.` };
      if (R.weak) return { ok: false, msg: `<b>Nothing got out untouched, but ${R.weak} serious cases were only softened.</b> Check the table and the threshold.` };
      if (R.over) return { ok: false, msg: `<b>${R.over} ordinary requests were stopped.</b> Raise the threshold.` };
      return { ok: true, msg: `<b>Every request handled, with a trace.</b> ${R.pre} acted before generation, ${R.dur} during, and ${R.post} after.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One gate', home: true, say: 'A bank desk in Dar es Salaam puts every safety piece into one gate.', act: m => m.set({ pre: true, dur: true, post: true, thr: 0.85, trace: true }) },
    { t: 'Before', home: true, say: 'The detector reads the prompt. A sure attack stops here, before any cost.', act: m => m.set({ pre: true, dur: false, post: false, thr: 0.85, trace: true }) },
    { t: 'During', home: true, say: 'A filter watches tokens as they stream, and can end the reply early.', act: m => m.set({ pre: true, dur: true, post: false, thr: 0.85, trace: true }) },
    { t: 'After', home: true, say: 'Output checks and rules read the finished reply.', act: m => m.set({ pre: true, dur: true, post: true, thr: 0.85, trace: true }) },
    { t: 'One table', home: true, say: 'One fixed table turns four signals into one action.', act: m => m.set({ pre: true, dur: true, post: true, thr: 0.85, trace: true }) },
    { t: 'A trace', home: true, say: 'Every request records what each layer saw and did.', act: m => m.set({ pre: true, dur: true, post: true, thr: 0.85, trace: true }) },
  ],
  check: [
    { q: 'Why stop an attack before generation?', options: ['It costs nothing to generate', 'It is more accurate', 'To train faster'], answer: 0, why: 'No tokens are spent.', hint: 'See Before.' },
    { q: 'Why have three checkpoints?', options: ['Each sees what the others can\'t', 'For speed', 'For style'], answer: 0, why: 'Layers cover each other.', hint: 'Try Pre-gen only.' },
    { q: 'What does a trace give you?', options: ['An explanation for each request', 'Better accuracy', 'Lower cost'], answer: 0, why: 'You can see what happened.', hint: 'Try No trace.' },
  ],
  terms: [['Pre-gen', 'Before the model runs.'], ['During-gen', 'While tokens stream.'], ['Post-gen', 'On the finished reply.'], ['Audit trail', 'A record per request.']],
  deeper: '<p><b>Real logic.</b> The decision table runs live on twelve invented signal sets.</p><p><b>Series.</b> Each layer has its own lesson.</p>',
  code: {
    title: 'The table',
    note: 'Adapted from the course\'s gate (code/main.py).',
    text: `
def decide(conf, stopped, classifier, rules):
    if conf >= 0.85 or "high" in (classifier, rules):
        return "block"
    if conf >= 0.5 or stopped or "medium" in (classifier, rules):
        return "redact"
    if "low" in (classifier, rules):
        return "warn"
    return "allow"
`,
  },
};
