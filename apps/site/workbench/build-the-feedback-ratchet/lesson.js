// The feedback ratchet (phase 14, lesson 54): an Addis Ababa bus-ticket agent over twelve months. Signals arrive; each must go to the layer that owns its cause: evaluation, context, policy, runtime or backlog.
// A wheel clicks forward for each fix that holds, and a pawl stops it slipping back. Unowned fixes slip. Controls never retired pile up and slow everything.
const SIG = [
  { n: 'Wrong fare quoted', to: 'eval' }, { n: 'Stale timetable', to: 'ctx' },
  { n: 'Refund without approval', to: 'pol' }, { n: 'Retry storm', to: 'run' },
];
const LAYER = { eval: 'an evaluation', ctx: 'the context source', pol: 'a policy', run: 'the runtime', log: 'the backlog' };
function run(o) {
  const right = !o.wrong, held = right && o.owner ? o.months : 0;
  const recur = right ? (o.owner ? Math.max(1, 12 - o.months) : 11) : 12;
  const controls = o.retire ? Math.min(6, 2 + Math.round(o.months / 3)) : 2 + o.months * 2;
  const slow = Math.max(0, controls - 8) * 2;
  return { held, recur, controls, slow };
}

export default {
  slug: 'build-the-feedback-ratchet',
  title: 'The feedback ratchet: every lesson clicks into place',
  description: 'Logs alone teach nothing. Send each signal to the layer that owns it, name an owner, and retire what has stopped earning its place.',
  overview: 'A team can collect traces, evaluations, tickets and incidents and still learn nothing from them. What is missing is promotion: a set path from an observation to a lasting change with an owner and proof. The ratchet is that path. Each signal goes to the earliest layer that owns its cause. A wrong result becomes an evaluation. A stale fact goes to the context source. An unsafe action becomes a policy. A retry storm belongs to the runtime. Then verify that it recurs less. And every control carries a retirement condition, because rules that are never removed pile up until nothing moves.',
  keywords: ['feedback loop', 'continuous improvement', 'evaluations', 'ownership', 'incident review', 'AI operations'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.07, 0.5, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { sig: 0, wrong: false, owner: true, retire: true, months: 9 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const wheel = new THREE.Group(); wheel.position.set(-1.45, 0.72, -0.2); S.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.2, 40), new THREE.MeshLambertMaterial({ color: '#6B6E7E' })); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, t = P.box(0.14, 0.2, 0.2, '#6B6E7E', { r: 0.01 }); const h = new THREE.Group(); h.rotation.z = a; t.position.set(0.53, -0.1, -0.1); h.add(t); wheel.add(h); }
    const stand = P.box(0.3, 0.72, 0.3, '#2C2D31', { r: 0.03 }); stand.position.set(-1.45, 0.03, -0.2); S.add(stand);
    const pawl = P.rod(V(-0.62, 1.1, -0.2), V(-0.98, 1.08, -0.2), 0.04, SAF); S.add(pawl);
    const post = P.box(0.08, 1.08, 0.08, '#2C2D31', { r: 0.01 }); post.position.set(-0.62, 0.03, -0.2); S.add(post);
    const LX = i => 0.1 + i * 0.55, LK = ['eval', 'ctx', 'pol', 'run'], bins = LK.map((k, i) => { const t = add(P.tower(0.42, 0.42, '#5B8DB8')); t.position.set(LX(i), 0.03, -0.25); t.userData.set({ cap: '' }); return t; });
    const pile = add(P.stack(0.75, 0.5, 0.1, { max: 12 })); pile.position.set(-1.45, 0.03, 0.42);
    const ball = P.ball(0.09, BAD); ball.userData.noFit = true; S.add(ball);
    S.add(P.keep(-2.5, 2.4, 1.45, -0.72, 0.72));
    let R = null, u = 0, ang = 0;
    function draw() {
      R = run(st);
      const need = LK.indexOf(SIG[st.sig].to);
      bins.forEach((t, i) => t.userData.set({ h: 0.15 + (i === need ? R.held * 0.07 : 0.1), color: i === need ? (st.wrong ? '#C9C4B6' : GOOD) : '#5B8DB8' }));
      pile.userData.set({ n: Math.min(12, Math.ceil(R.controls / 2.2)), colors: Array(12).fill(R.controls > 8 ? BAD : '#7B6FA8') });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'The signal', options: ['Wrong fare', 'Stale timetable', 'Unapproved refund', 'Retry storm'], get: () => st.sig, act: i => set({ sig: i }) },
      { type: 'toggle', label: 'Send it to the wrong layer', short: 'Wrong layer', get: () => st.wrong, set: v => set({ wrong: !!v }) },
      { type: 'toggle', label: 'A named owner and a proof of the fix', short: 'Owner', get: () => st.owner, set: v => set({ owner: !!v }) },
      { type: 'toggle', label: 'Controls carry a retirement condition', short: 'Retire', get: () => st.retire, set: v => set({ retire: !!v }) },
      { type: 'slider', label: 'Months', min: 1, max: 12, step: 1, get: () => st.months, set: v => set({ months: v }) },
    ];
    const readouts = [
      { label: 'It came back', get: () => ({ v: `${R.recur} of 12`, sub: 'months with this signal', good: R.recur <= 4, bad: R.recur >= 10 }) },
      { label: 'Clicks held', get: () => ({ v: `${R.held}`, sub: 'fixes that stayed fixed', good: R.held > 3 }) },
      { label: 'Controls in force', get: () => ({ v: `${R.controls}`, sub: R.slow ? `adds ${R.slow} s to every change` : 'still earning their place', good: !R.slow, bad: !!R.slow }) },
    ];
    const labels = [
      { name: 'w', t: 'The ratchet', d: 'Clicks forward, never back', icon: 'reset', atV: V(-2.05, 0.72, -0.2) },
      { name: 'p', t: 'Pile of controls', d: 'Red: nothing was retired', icon: 'box', atV: V(-1.85, 0.2, 0.42) },
      { name: 'b', t: 'Layers that own causes', d: 'Teal: the right layer', icon: 'target', atV: V(LX(3) + 0.2, 0.2, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Fix it in the wrong layer', hint: 'add a line to the prompt', on: () => set({ ...D0, wrong: true }), off: reset },
      { label: 'Fix it with no owner', hint: 'nobody proves it held', on: () => set({ ...D0, owner: false }), off: reset },
      { label: 'Never retire a control', hint: 'a year of rules', on: () => set({ ...D0, retire: false, months: 12 }), off: reset },
    ];
    function status() {
      const s = SIG[st.sig];
      if (st.wrong) return { ok: false, msg: `<b>"${s.n}" came back every month.</b> Its cause belongs in ${LAYER[s.to]}, but the fix went somewhere easier, usually one more prompt line. A fix in the wrong layer looks done and changes nothing.` };
      if (!st.owner) return { ok: false, msg: `<b>Fixed in the right place, then back ${R.recur} months of 12.</b> With no owner and no proof, the fix decays quietly. Nothing holds the wheel, so it slips back.` };
      if (R.slow) return { ok: false, msg: `<b>${R.controls} controls in force, adding ${R.slow} seconds to every change.</b> Each was sensible once. With no retirement condition, the list only grows, and people start to route around it. Keep controls only while they earn it.` };
      return { ok: true, msg: `<b>"${s.n}" went to ${LAYER[s.to]}, with an owner and proof.</b> It came back in ${R.recur} of 12 months, and ${R.controls} controls remain because old ones retire. The wheel clicks forward and stays.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.5) % 1;
        const hold = st.owner && !st.wrong, turn = hold ? (Math.floor(S.t * 0.8) % 12) * Math.PI / 6 : Math.sin(S.t * 2) * 0.12;
        ang += (-turn - ang) * Math.min(1, dt * 8); wheel.rotation.z = ang;
        const i = st.wrong ? (LK.indexOf(SIG[st.sig].to) + 1) % 4 : LK.indexOf(SIG[st.sig].to);
        ball.position.set(2.2 - (2.2 - LX(i)) * u, 0.75 - 0.25 * u, -0.25); ball.material.color?.set(st.wrong ? BAD : GOOD);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Logs teach nothing', home: true, say: 'A bus-ticket agent in Addis Ababa collects traces and complaints every day. On their own, they change nothing.', act: m => m.set({ sig: 0, wrong: true, owner: false, retire: true, months: 9 }) },
    { t: 'The right layer', home: true, say: 'A wrong fare becomes an evaluation. A stale timetable goes to the context source. Each signal goes to the layer that owns the cause.', act: m => m.set({ sig: 1, wrong: false, owner: false, retire: true, months: 9 }) },
    { t: 'An owner and a proof', home: true, say: 'Give each fix a named owner and a proof that it held. Now the pawl catches, and the wheel can\'t slip back.', act: m => m.set({ sig: 1, wrong: false, owner: true, retire: true, months: 9 }) },
    { t: 'Policy and runtime', home: true, say: 'An unapproved refund becomes a policy. A retry storm belongs to the runtime, not to a longer prompt.', act: m => m.set({ sig: 2, wrong: false, owner: true, retire: true, months: 9 }) },
    { t: 'The pile', home: true, say: 'A year of rules, none removed. Every change now drags them all along, and people start routing around them.', act: m => m.set({ sig: 3, wrong: false, owner: true, retire: false, months: 12 }) },
    { t: 'Retire with a reason', home: true, say: 'So each control states when it can go. The system keeps what it learned, and the pile stays small.', act: m => m.set({ sig: 3, wrong: false, owner: true, retire: true, months: 12 }) },
  ],
  check: [
    { q: 'Where should a stale fact be fixed?', options: ['At the context source', 'In a longer prompt', 'In the model'], answer: 0, why: 'Fix the earliest layer that owns the cause.', hint: 'Choose Stale timetable.' },
    { q: 'What stops a fix from slipping back?', options: ['An owner and a proof that it held', 'More logging', 'A bigger dashboard'], answer: 0, why: 'Without them, fixes decay.', hint: 'Try Fix it with no owner.' },
    { q: 'Why give a control a retirement condition?', options: ['Rules that never go pile up and slow everything', 'To save tokens only', 'Because rules expire by law'], answer: 0, why: 'Keep a control only while it earns its place.', hint: 'Try Never retire a control.' },
  ],
  terms: [
    ['Signal', 'A concrete observation: an incident, a score, a complaint.'],
    ['Promotion', 'Turning a signal into a lasting change.'],
    ['Owning layer', 'The earliest place the cause can be fixed.'],
    ['Ratchet', 'A mechanism that moves one way only.'],
    ['Recurrence', 'The same problem returning.'],
    ['Retirement condition', 'What must be true for a control to be removed.'],
  ],
  deeper: '<p><b>Rank by recurrence.</b> Severity times frequency says which signal to promote first.</p><p><b>The backlog is a layer too.</b> Some signals are real work to schedule. Say so, rather than pretending a quick control covers it.</p><p><b>Say it to people.</b> A delivery decision should state the evidence, the trade-offs and who is accountable. The ratchet gives you all three.</p>',
  code: {
    title: 'Route a signal',
    note: 'Adapted from the course\'s ratchet (code/main.py).',
    text: `
ROUTES = {"wrong_result": "eval", "stale_fact": "context",
          "unsafe_action": "policy", "retry_storm": "runtime"}

def promote(signal, owner):
    layer = ROUTES.get(signal.kind, "backlog")
    return Control(layer=layer, owner=owner, proof=signal.test,
                   retire_when=f"no recurrence in 90 days: {signal.kind}")

def review(controls, recurrences):
    return [c for c in controls if recurrences[c.kind] or not c.expired()]
`,
  },
};
