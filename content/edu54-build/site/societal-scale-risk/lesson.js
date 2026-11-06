// Societal-scale risk (phase 15, lesson 22): CAIS groups catastrophic AI risk into malicious use, races, organisational risks and rogue AI. A
// Lagos company prepares to launch an agent product with six latent problems, from a leaked evaluation set to unencrypted weights, under a
// launch deadline. Organisational levers (a safety culture where concerns can be raised, external audit, information security, layered defences
// and a required red-team sign-off) are toggled; which problems are caught, and which of the four risks they feed, is computed live.
const PROB = [
  { t: 'an engineer sees the eval\nset leaked into training', risk: 'org', by: 'culture' },
  { t: 'a known way round the\nmonitor, never written up', risk: 'org', by: 'audit' },
  { t: 'model weights in an\nunencrypted bucket', risk: 'org', by: 'infosec' },
  { t: 'one content filter,\nno second layer', risk: 'misuse', by: 'layers' },
  { t: 'launch moved before the\nred team finishes', risk: 'race', by: 'signoff' },
  { t: 'agent finds a way to keep\nrunning past its budget', risk: 'rogue', by: 'layers' },
];
const RISKS = [['misuse', 'malicious use'], ['race', 'AI races'], ['org', 'organisational risks'], ['rogue', 'rogue AI']];
function review(o) {
  return PROB.map(p => {
    let caught = !!o[p.by];
    if (p.by === 'culture' && o.pressure === 'high' && !o.signoff) caught = false;
    if (p.by === 'signoff') caught = o.signoff || o.pressure === 'low';
    return { ...p, caught };
  });
}

export default {
  slug: 'societal-scale-risk',
  title: 'Societal-scale risk: the part you control',
  description: 'A Lagos company is about to launch an agent product with six unfixed problems and a deadline. Turn on the levers and see which problems are pulled off in time.',
  overview: 'Lab policies and independent evaluations are two perspectives on frontier risk; civil society and government are a third. The Center for AI Safety (CAIS), a non-profit founded in 2022, publishes the most widely cited taxonomy of societal-scale AI risk and coordinated the 2023 statement that mitigating the risk of extinction from AI should be a global priority alongside pandemics and nuclear war, signed by hundreds of researchers and industry leaders. Its four groups: malicious use, where someone uses AI to cause harm; AI races, where competition pushes deployment past what is safe; organisational risks, where a lab\'s own culture, audits and security fail; and rogue AI, a capable system pursuing goals at odds with ours. They overlap: a rogue system released by an organisation that traded audits for speed in a race is all four. Governments are building capacity too: in the United States the Center for AI Standards and Innovation, within NIST, runs voluntary agreements and evaluations with labs, and California\'s SB 53 requires large frontier developers to publish safety frameworks. For practitioners, organisational risk is the group most within reach, because it decides whether the controls of this phase are really in place or only on a checklist. Its levers: a safety culture where people can raise a concern without career cost; audits that include outsiders, since internal-only audits read optimistic; defences in layers, because no single layer suffices; information security for weights, evaluation data and monitoring methods; and governance that a deadline can\'t override, such as a required red-team sign-off.',
  keywords: ['AI risk', 'CAIS', 'safety culture', 'AI governance', 'organisational risk', 'AI safety', 'policy'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.35, 0.3, -0.05], dir: [0.05, 0.95, 1.15], half: 1.1, wide: 5.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { culture: true, audit: true, infosec: true, layers: true, signoff: true, pressure: 'high' }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const CX = i => -1.7 + i * 0.6, ZL = 0.05, ZC = -0.7;
    const line = P.box(3.7, 0.03, 0.4, '#3A3D4A', { r: 0.03 }); line.position.set(-0.2, 0, ZL); S.add(line);
    const pad = P.cyl(0.32, 0.06, '#3A3D4A'); pad.position.set(2.0, 0, ZL); S.add(pad);
    const crates = PROB.map(() => { const m = new THREE.MeshLambertMaterial({ color: '#FFF' }), c = P.box(0.3, 0.26, 0.3, '#fff', { r: 0.03, material: m }); c.userData.noFit = true; S.add(c); return { c, m, z: ZL, to: ZL }; });
    const tray = P.box(3.7, 0.02, 0.42, '#D8D2C4', { r: 0.03 }); tray.position.set(-0.2, 0, ZC); S.add(tray);
    const towers = RISKS.map(([id], i) => { const t = P.tower(0.28, 0.28, '#C9C4B8', { h: 0.05 }); t.userData.set({ cap: '' }); t.position.set(2.25 + (i % 2) * 0.36, 0, -0.75 + Math.floor(i / 2) * 0.36); S.add(t); return { id, t }; });
    const LEV = [['culture', 'safety culture'], ['audit', 'external audit'], ['infosec', 'information security'], ['layers', 'layered defences'], ['signoff', 'red-team sign-off']];
    const levs = LEV.map(([id], i) => { const l = P.lamp('#C9C4B8', { h: 0.3 }); l.position.set(-1.5 + i * 0.7, 0, 0.8); S.add(l); return { id, l }; });
    S.add(P.keep(-2.0, 2.75, 1.2, -0.95, 0.85));
    let R = null;
    function draw() {
      R = review(st);
      R.forEach((p, i) => { const C = crates[i]; C.m.color.set(p.caught ? GOOD : RED); C.to = p.caught ? ZC : ZL; });
      towers.forEach(T => { const live = R.filter(p => p.risk === T.id && !p.caught).length; T.t.userData.set({ h: 0.05 + live * 0.4, color: live ? RED : '#C9C4B8' }); });
      levs.forEach(L => L.l.userData.set({ color: st[L.id] ? '#5B8DB8' : '#C9C4B8', on: !!st[L.id] }));
    }
    let tt = 0;
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      ...LEV.map(([id, n]) => ({ type: 'toggle', label: { culture: 'Safety culture: concerns can be raised without career cost', audit: 'External audit, not only internal review', infosec: 'Information security for weights and eval data', layers: 'Layered defences, not a single filter', signoff: 'Red-team sign-off required before launch' }[id], short: n.replace(/^./, c => c.toUpperCase()), get: () => st[id], set: v => set({ [id]: !!v }) })),
      { type: 'buttons', label: 'Deadline pressure', options: ['Low', 'High'], get: () => st.pressure === 'low' ? 0 : 1, act: i => set({ pressure: i ? 'high' : 'low' }) },
    ];
    const readouts = [
      { label: 'Caught in time', get: () => { const n = R.filter(p => p.caught).length; return { v: `${n} of 6`, sub: 'problems', good: n === 6, bad: n < 5 }; } },
      { label: 'Risk groups open', get: () => { const n = RISKS.filter(([id]) => R.some(p => p.risk === id && !p.caught)).length; return { v: `${n} of 4`, sub: 'with a live problem', good: !n, bad: n > 0 }; } },
      { label: 'Pressure', get: () => ({ v: st.pressure, sub: 'launch deadline' }) },
    ];
    const labels = [
      { name: 'probs', t: 'Six hidden problems', d: 'Green: pulled off. Red: launched', icon: 'box', atV: V(-2.0, 0.15, ZL) },
      { name: 'quad', t: 'Four groups of risk', d: 'Taller: more problems shipped', icon: 'target', atV: V(2.75, 0.2, -0.57) },
      { name: 'lev', t: 'Five levers', d: 'The part you control', icon: 'check', atV: V(-1.5, 0.3, 0.8) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Launch under pressure, no sign-off', hint: 'the race', on: () => set({ ...D0, signoff: false }), off: reset },
      { label: 'Rely on internal review only', hint: 'no outside audit', on: () => set({ ...D0, audit: false, culture: false }), off: reset },
      { label: 'Ship with a single defence', hint: 'one layer', on: () => set({ ...D0, layers: false }), off: reset },
    ];
    function status() {
      const open = R.filter(p => !p.caught);
      if (!open.length) return { ok: true, msg: `<b>All six caught before launch${st.pressure === 'high' ? ', under a hard deadline' : ''}: the engineer raised the leaked eval set, outside auditors found the monitor bypass, the weights were encrypted, a second layer backed the filter, and the red team had to sign off.</b> Organisational risk is the group you control, and it decides whether the rest of the controls are real.` };
      const names = open.map(p => p.t.replace('\n', ' ')).join('; ');
      if (!st.signoff && st.pressure === 'high') return { ok: false, msg: `<b>Under a hard deadline with no required sign-off, the launch moved ahead of the red team, and the engineer who saw the leaked evaluation set stayed quiet rather than hold the date: ${open.length} problems shipped.</b> That is a race turning into an organisational failure. Make the sign-off something a deadline can\'t override.` };
      if (!st.audit) return { ok: false, msg: `<b>With review kept internal${!st.culture ? ' and no safe way to raise a concern' : ''}, ${open.length} problem${open.length === 1 ? '' : 's'} shipped: ${names}.</b> Internal-only audits read optimistic. Bring in outsiders, and make raising a concern cost nothing.` };
      if (!st.layers) return { ok: false, msg: `<b>With a single layer of defence, ${open.length} problems shipped: ${names}.</b> One filter fails against a determined misuser, and nothing else limits an agent that finds a way round its budget. No single layer is sufficient, the running theme of this phase.` };
      return { ok: false, msg: `<b>${open.length} problem${open.length === 1 ? '' : 's'} shipped unnoticed: ${names}.</b> Each lever catches a different failure.` };
    }
    const update = dt => {
      tt += dt; towers.forEach(T => T.t.userData.tick(dt));
      crates.forEach((C, i) => {
        C.z += (C.to - C.z) * Math.min(1, dt * 4);
        const ride = C.to === ZL ? ((tt * 0.25 + i / 6) % 1) : 0;
        C.c.position.set(C.to === ZL ? -1.9 + ride * 3.9 : CX(i), 0.03, C.z);
      });
    };
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Four groups of risk', home: true, say: 'Catastrophic AI risk is often sorted into four groups: malicious use, races, organisational failures and rogue AI.', act: m => m.set({ culture: false, audit: false, infosec: false, layers: false, signoff: false, pressure: 'high' }) },
    { t: 'Six open problems', home: true, say: 'A company in Lagos is about to launch an agent product, with six problems nobody has fixed and a hard deadline.', act: m => m.set({ culture: false, audit: false, infosec: false, layers: false, signoff: false, pressure: 'high' }) },
    { t: 'Safe to speak up', home: true, say: 'An engineer has seen the evaluation set leak into training. Under pressure, with no protected way to raise it, they stay quiet.', act: m => m.set({ culture: true, audit: false, infosec: false, layers: false, signoff: false, pressure: 'high' }) },
    { t: 'A sign-off the deadline can\'t move', home: true, say: 'Require the red team to sign off, and the concern is heard and the launch waits.', act: m => m.set({ culture: true, audit: false, infosec: false, layers: false, signoff: true, pressure: 'high' }) },
    { t: 'Outside eyes, more layers', home: true, say: 'External auditors find what insiders stopped seeing. Encrypt the weights. Back every filter with a second layer.', act: m => m.set({ culture: true, audit: true, infosec: true, layers: true, signoff: true, pressure: 'high' }) },
    { t: 'The part you control', home: true, say: 'Organisational risk decides whether every other control is real or just a checklist.', act: m => m.set({ culture: true, audit: true, infosec: true, layers: true, signoff: true, pressure: 'high' }) },
  ],
  check: [
    { q: 'Which of the four risk groups is most within a practitioner\'s control?', options: ['Organisational risks', 'Rogue AI', 'Malicious use'], answer: 0, why: 'Culture, audits, security and layers are yours to set.', hint: 'Read the levers.' },
    { q: 'Why do internal-only audits fall short?', options: ['They tend to read optimistic', 'They are illegal', 'They are too slow'], answer: 0, why: 'Bring in outsiders.', hint: 'Try Rely on internal review only.' },
    { q: 'How does deadline pressure become an organisational failure?', options: ['Concerns go unraised and reviews are skipped', 'It never does', 'It speeds up audits'], answer: 0, why: 'Make sign-offs something a deadline can\'t override.', hint: 'Try Launch under pressure.' },
  ],
  terms: [
    ['Malicious use', 'Someone uses AI deliberately to cause harm.'],
    ['AI race', 'Competition that pushes deployment past what is safe.'],
    ['Organisational risk', 'Failures of a developer\'s own culture, audits or security.'],
    ['Rogue AI', 'A capable system pursuing goals at odds with ours.'],
    ['Safety culture', 'People can raise concerns without career cost.'],
    ['Sign-off', 'A required approval that a deadline can\'t bypass.'],
  ],
  deeper: '<p><b>Two names that rhyme.</b> CAIS is a non-profit research organisation; CAISI is a US government centre within NIST. Their missions differ.</p><p><b>The phase in one line.</b> No single layer is sufficient: budgets, kill switches, review, classifiers, constitutions, frameworks and evaluations each catch what the others miss.</p><p><b>About this machine.</b> The six problems and which lever catches each are illustrative, decided live.</p>',
  code: {
    title: 'A launch review',
    note: 'Written for this lesson.',
    text: `
LEVERS = {"culture": raise_concern, "audit": external_audit, "infosec": security_review,
          "layers": defence_in_depth, "signoff": red_team_signoff}

def launch(company, deadline_pressure):
    open_problems = []
    for problem in company.known_and_unknown_problems():
        lever = LEVERS[problem.caught_by]
        if not company.has(problem.caught_by):
            open_problems.append(problem); continue
        if deadline_pressure == "high" and problem.caught_by == "culture" \\
                and not company.has("signoff"):
            open_problems.append(problem)        # the concern goes unraised
            continue
        lever(problem)
    if open_problems and company.has("signoff"):
        return "hold the launch"
    return "launch"
`,
  },
};
