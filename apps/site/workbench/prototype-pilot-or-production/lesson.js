// Prototype, pilot or production (phase 14, lesson 53): a Kampala savings co-operative's loan-triage agent. Three platforms, each answering a different question and needing different controls.
// The learner places the agent on a stage, then sets its audience and its authority. A stage is safe only when its controls are present; a prototype quietly serving members is the classic failure.
const STAGE = {
  proto: { n: 'Prototype', max: 5, real: false, act: false, need: ['exit'] },
  pilot: { n: 'Pilot', max: 60, real: true, act: false, need: ['exit', 'watch'] },
  prod: { n: 'Production', max: 5000, real: true, act: true, need: ['exit', 'watch', 'owner', 'back'] },
};
const CTRL = { exit: 'exit criteria', watch: 'monitoring', owner: 'an on-call owner', back: 'a rollback path' };
function run(o) {
  const s = STAGE[o.stage];
  const missing = s.need.filter(k => !o[k]);
  const over = o.people > s.max, wrongData = o.realData && !s.real, tooMuch = o.acts && !s.act;
  return { s, missing, over, wrongData, tooMuch, ok: !missing.length && !over && !wrongData && !tooMuch };
}

export default {
  slug: 'prototype-pilot-or-production',
  title: 'Prototype, pilot or production: pick the stage on purpose',
  description: 'Three platforms ask three different questions. Place the agent, and see what happens when a demo quietly gains real users.',
  overview: 'A prototype asks whether a mechanism can work at all. A pilot asks whether it works safely with a bounded real audience. Production asks whether you can own it, continuously, at the promised reliability. They are different questions with different controls. Prototypes are discardable, isolated and narrow, with no real data. Pilots may use real data with limited people and limited authority, and need exit criteria. Production begins when the organisation accepts ongoing responsibility: an owner, monitoring and a way back. The classic failure is a prototype nobody retired that slowly gains real users, with none of those things. Real authority comes last.',
  keywords: ['prototype', 'pilot', 'production readiness', 'release stages', 'AI product', 'agent authority'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.07, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { stage: 'pilot', people: 40, realData: true, acts: false, exit: true, watch: true, owner: false, back: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const KEYS = ['proto', 'pilot', 'prod'], PX = { proto: -1.75, pilot: -0.1, prod: 1.6 }, PH = { proto: 0.12, pilot: 0.3, prod: 0.5 };
    const plats = KEYS.map(k => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(1.4, PH[k], 1.3, '#fff', { r: 0.05, material: m }); b.position.set(PX[k], 0, 0); S.add(b); return { k, b, m }; });
    const bot = add(P.robot(SAF, { scale: 0.8 })); bot.userData.noFit = true;
    const crowd = Array.from({ length: 14 }, (_, i) => { const p = P.ball(0.075, '#A87A4F'); p.userData.noFit = true; S.add(p); return p; });
    const CK = ['exit', 'watch', 'owner', 'back'];
    const lamps = CK.map((k, i) => { const l = add(P.lamp(GREY, { h: 0.34, r: 0.08 })); l.position.set(-2.3 + i * 0.28, 0.0, 0.84); return l; });
    const base = P.box(1.1, 0.03, 0.26, '#6B6E7E', { r: 0.02 }); base.position.set(-1.88, 0, 0.84); S.add(base);
    const dial = add(P.dial(0.3)); dial.position.set(2.2, 0.03, 0.84);
    S.add(P.keep(-2.5, 2.5, 1.2, -0.72, 1.05));
    let R = null;
    function draw() {
      R = run(st);
      plats.forEach(({ k, m }) => m.color.set(k === st.stage ? (R.ok ? '#7FC8BA' : '#E8A897') : '#D8D2C4'));
      const x = PX[st.stage], y = PH[st.stage];
      bot.position.set(x, y, -0.2);
      const n = Math.min(14, Math.ceil(Math.log10(Math.max(1, st.people) + 1) * 3.8));
      crowd.forEach((p, i) => { p.visible = i < n; p.position.set(x - 0.55 + (i % 7) * 0.18, y + 0.08, 0.2 + Math.floor(i / 7) * 0.18); });
      lamps.forEach((l, i) => { const k = CK[i], need = R.s.need.includes(k); l.userData.set({ color: st[k] ? '#3E9B5F' : need ? '#D9483B' : GREY, on: st[k] || need }); });
      dial.userData.set({ v: (R.ok ? 0.1 : 0.5) + (st.acts ? 0.25 : 0) + (st.realData ? 0.1 : 0) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Where it stands', options: ['Prototype', 'Pilot', 'Production'], get: () => KEYS.indexOf(st.stage), act: i => set({ stage: KEYS[i] }) },
      { type: 'slider', label: 'People using it', min: 1, max: 5000, log: true, get: () => st.people, set: v => set({ people: Math.round(v) }), fmt: v => `${Math.round(v)}` },
      { type: 'toggle', label: 'Uses real member data', short: 'Real data', get: () => st.realData, set: v => set({ realData: !!v }) },
      { type: 'toggle', label: 'It decides loans, not just suggests', short: 'Acts', get: () => st.acts, set: v => set({ acts: !!v }) },
      { type: 'toggle', label: 'Exit criteria written', short: 'Exit', get: () => st.exit, set: v => set({ exit: !!v }) },
      { type: 'toggle', label: 'Monitoring', short: 'Monitor', quick: false, get: () => st.watch, set: v => set({ watch: !!v }) },
      { type: 'toggle', label: 'An on-call owner', short: 'Owner', quick: false, get: () => st.owner, set: v => set({ owner: !!v }) },
      { type: 'toggle', label: 'A rollback path', short: 'Rollback', quick: false, get: () => st.back, set: v => set({ back: !!v }) },
    ];
    const readouts = [
      { label: 'The stage\'s question', get: () => ({ v: R.s.n, sub: { proto: 'can it work at all?', pilot: 'does it work safely with real people?', prod: 'can we own it?' }[st.stage] }) },
      { label: 'Controls missing', get: () => ({ v: `${R.missing.length}`, sub: R.missing.length ? CTRL[R.missing[0]] : 'none', good: !R.missing.length, bad: R.missing.length > 0 }) },
      { label: 'Audience limit', get: () => ({ v: `${st.people} of ${R.s.max}`, sub: 'people', good: !R.over, bad: R.over }) },
    ];
    const labels = [
      { name: 'l', t: 'Controls in place', d: 'Red: this stage needs it', icon: 'check', atV: V(-2.32, 0.45, 0.84) },
      { name: 'd', t: 'Risk needle', d: 'Right is danger', icon: 'target', atV: V(2.45, 0.1, 0.84) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'The prototype nobody retired', hint: 'a demo with real users', on: () => set({ ...D0, stage: 'proto', people: 300 }), off: reset },
      { label: 'Give a pilot real authority', hint: 'it starts deciding loans', on: () => set({ ...D0, acts: true }), off: reset },
      { label: 'Call it production with no owner', hint: 'nobody is on call', on: () => set({ ...D0, stage: 'prod', people: 2000, acts: true }), off: reset },
    ];
    function status() {
      if (st.stage === 'proto' && (R.over || R.wrongData)) return { ok: false, msg: `<b>${st.people} real members on a prototype.</b> Nobody decided this. A demo worked, so people kept using it, and it has no owner, monitoring or way back. Promote it on purpose, or switch it off.` };
      if (R.tooMuch) return { ok: false, msg: `<b>A ${R.s.n.toLowerCase()} is now deciding loans.</b> Real authority is the last thing to grant, after evidence and operations exist. Until then it suggests, and a loan officer decides.` };
      if (R.over) return { ok: false, msg: `<b>${st.people} people is past this ${R.s.n.toLowerCase()}'s limit of ${R.s.max}.</b> The audience should grow only when the exit criteria say so.` };
      if (R.missing.length) return { ok: false, msg: `<b>${R.s.n} without ${R.missing.map(k => CTRL[k]).join(' or ')}.</b> Production isn't a level of quality. It is someone accepting responsibility. Without that, the first outage has nobody to answer it.` };
      return { ok: true, msg: `<b>${R.s.n}, with the right controls for ${st.people} people.</b> ${st.stage === 'pilot' ? 'Real data, a bounded audience, suggestions only, and exit criteria that decide what comes next.' : st.stage === 'proto' ? 'Small, isolated and ready to throw away.' : 'An owner, monitoring and a way back: the organisation has accepted this.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Can it work at all?', home: true, say: 'A savings co-operative in Kampala wants help sorting loan requests. A prototype answers one question: can this work at all? It stays small and disposable.', act: m => m.set({ stage: 'proto', people: 3, realData: false, acts: false, exit: true, watch: false, owner: false, back: false }) },
    { t: 'The demo that stayed', home: true, say: 'The demo goes well, and people keep using it. Now real members rely on something nobody owns.', act: m => m.set({ stage: 'proto', people: 300, realData: true, acts: false, exit: true, watch: false, owner: false, back: false }) },
    { t: 'A pilot', home: true, say: 'Move it deliberately. A pilot has real data, a limited group and exit criteria. The agent suggests, and loan officers decide.', act: m => m.set({ stage: 'pilot', people: 40, realData: true, acts: false, exit: true, watch: true, owner: false, back: false }) },
    { t: 'Authority comes last', home: true, say: 'Let the pilot decide loans, and you have given real power before you have the evidence or the operations for it.', act: m => m.set({ stage: 'pilot', people: 40, realData: true, acts: true, exit: true, watch: true, owner: false, back: false }) },
    { t: 'Production is ownership', home: true, say: 'Production needs an on-call owner and a way back. Without them, the first outage has nobody to answer it.', act: m => m.set({ stage: 'prod', people: 2000, realData: true, acts: false, exit: true, watch: true, owner: false, back: false }) },
    { t: 'On purpose', home: true, say: 'With an owner, monitoring and a rollback, it can serve everyone. Each stage was chosen, not drifted into.', act: m => m.set({ stage: 'prod', people: 2000, realData: true, acts: true, exit: true, watch: true, owner: true, back: true }) },
  ],
  check: [
    { q: 'What question does a pilot answer?', options: ['Does it work safely with a bounded real audience?', 'Can it work at all?', 'Can we run it forever?'], answer: 0, why: 'Real conditions, limited exposure.', hint: 'Read the stage readout.' },
    { q: 'What makes something production?', options: ['Someone accepts ongoing responsibility', 'A polished interface', 'A large model'], answer: 0, why: 'An owner, monitoring and a way back.', hint: 'Try Call it production with no owner.' },
    { q: 'When should an agent get real authority?', options: ['After evidence and operations exist', 'At the first demo', 'During the prototype'], answer: 0, why: 'Authority comes last.', hint: 'Try Give a pilot real authority.' },
  ],
  terms: [
    ['Prototype', 'A disposable build that tests a mechanism.'],
    ['Pilot', 'A bounded trial with real people and conditions.'],
    ['Production', 'A service someone owns continuously.'],
    ['Exit criteria', 'What must be true to move on or stop.'],
    ['Authority', 'What the agent may do without a person.'],
    ['Rollback', 'A tested way back to the last good state.'],
  ],
  deeper: '<p><b>Stop is an exit too.</b> Exit criteria should say what ends the work as well as what promotes it.</p><p><b>Limits.</b> The audience limits here are round numbers. Choose yours by how many mistakes you can afford to fix by hand.</p><p><b>Prototype code.</b> It earned its evidence, not its architecture. Expect to rewrite most of it.</p>',
  code: {
    title: 'A stage check',
    note: 'Adapted from the course\'s stage chooser (code/main.py).',
    text: `
REQUIRED = {"prototype": {"exit"}, "pilot": {"exit", "monitoring"},
            "production": {"exit", "monitoring", "owner", "rollback"}}

def check(stage, have, audience, limit, acts):
    missing = REQUIRED[stage] - have
    if audience > limit:
        return f"audience over the {stage} limit"
    if acts and stage != "production":
        return "authority before production"
    return f"missing: {sorted(missing)}" if missing else "ok"
`,
  },
};
