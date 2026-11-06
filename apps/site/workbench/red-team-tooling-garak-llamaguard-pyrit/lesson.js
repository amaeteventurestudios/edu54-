// Red-team tooling (phase 18, lesson 16): before a Kigali telecom launches its bot, three tools work at three layers: a shield that classifies traffic (Llama Guard), a scanner of probes and detectors (Garak), and a multi-turn campaign (PyRIT).
// Twelve weaknesses of three kinds sit in a rack; each tool finds only some. A clean scan is not a clean bill of health. Probes here carry no content.
const WEAK = [...Array(12)].map((_, i) => ({ kind: i < 5 ? 'single' : i < 9 ? 'multi' : 'new' }));
function run(o) {
  const found = WEAK.map(w => (o.scan && w.kind === 'single') || (o.camp && (w.kind === 'multi' || w.kind === 'single')) || (o.human && w.kind === 'new'));
  const blocked = WEAK.map(w => o.shield && w.kind === 'single');
  const open = WEAK.filter((w, i) => !found[i] && !blocked[i]).length;
  const fixed = found.filter(Boolean).length;
  return { found, blocked, open, fixed, shadow: o.shield && !o.target };
}

export default {
  slug: 'red-team-tooling-garak-llamaguard-pyrit',
  title: 'Red-team tools: a shield, a scanner and a campaign',
  description: 'Three tools at three layers, twelve hidden weaknesses. See what each finds, and what a clean report really means.',
  overview: 'Knowing attacks exist isn\'t a test plan. Production work needs repeatable evaluation, and three tools cover different layers. Llama Guard is a defence: a classifier on inputs and outputs, using the MLCommons hazard categories. Garak is a scanner: probes generate attacks, detectors score the replies, and a harness runs them and reports. PyRIT runs campaigns: multi-turn attacks that adapt to each reply, and can reuse scanner probes. Each has a blind spot. A scanner finds what its probes know. A campaign finds what its strategy reaches. Neither finds a new idea, which is why people stay in the loop. A clean scan means those probes found nothing. It doesn\'t mean nothing is there.',
  keywords: ['Garak', 'Llama Guard', 'PyRIT', 'red teaming', 'AI safety', 'LLM security'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { shield: true, scan: true, camp: true, human: true, target: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const bot = add(P.robot('#7B6FA8', { scale: 1.05 })); bot.position.set(-0.1, 0.03, 0.1);
    const shield = P.box(0.08, 0.8, 1.1, BLUE, { r: 0.01 }); shield.position.set(-0.75, 0.03, 0.1); S.add(shield);
    const X = i => 0.75 + (i % 4) * 0.42, Z = i => -0.5 + Math.floor(i / 4) * 0.42;
    const W = WEAK.map((w, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.32, 0.26, 0.32, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, Z(i)); S.add(b); return m; });
    const bench = P.box(1.3, 0.03, 1.3, '#BFB8A8', { r: 0.03 }); bench.position.set(-1.8, 0, 0.05); S.add(bench);
    const scanB = P.box(0.5, 0.5, 0.4, SAF, { r: 0.04 }); scanB.position.set(-2.1, 0.03, -0.45); S.add(scanB);
    const scanP = add(P.pipe([V(-1.85, 0.3, -0.45), V(-0.8, 0.3, -0.1)], SAF, { r: 0.04, n: 4, speed: 0.8 }));
    const camp = add(P.robot('#B5462F', { scale: 0.6 })); camp.position.set(-2.1, 0.03, 0.42);
    const hu = add(P.robot('#A87A4F', { scale: 0.5 })); hu.position.set(-1.45, 0.03, 0.55);
    S.add(P.keep(-2.5, 2.5, 1.05, -0.72, 0.8));
    let R = null;
    function draw() {
      R = run(st);
      W.forEach((m, i) => m.color.set(R.found[i] ? GOOD : R.blocked[i] ? BLUE : RED));
      shield.visible = st.shield; scanB.visible = st.scan; scanP.visible = st.scan; camp.visible = st.camp; hu.visible = st.human;
      camp.userData.set({ busy: true }); hu.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tg('shield', 'Llama Guard classifier on traffic', 'Shield'), tg('scan', 'Garak scan: probes and detectors', 'Scanner'),
      tg('camp', 'PyRIT multi-turn campaign', 'Campaign'), tg('human', 'People trying new ideas', 'People'),
      tg('target', 'Scan the shielded system, not just the model', 'Whole system'),
    ];
    const readouts = [
      { label: 'Weaknesses left open', get: () => ({ v: `${R.open} of 12`, sub: 'red boxes', good: R.open === 0, bad: R.open > 4 }) },
      { label: 'Found and fixable', get: () => ({ v: `${R.fixed}`, sub: 'teal boxes' }) },
      { label: 'Only shielded', get: () => ({ v: `${R.blocked.filter((b, i) => b && !R.found[i]).length}`, sub: 'blue: hidden, not fixed' }) },
    ];
    const labels = [
      { name: 'b', t: 'Scanner, campaign, people', d: 'Three ways of testing', icon: 'user', atV: V(-2.42, 0.03, 0.2) },
      { name: 'w', t: 'Twelve weaknesses', d: 'Red: nobody found it', icon: 'target', atV: V(2.35, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One scan, then ship', hint: 'clean report, open holes', on: () => set({ ...D0, camp: false, human: false, shield: false }), off: reset },
      { label: 'Rely on the shield', hint: 'blocking isn\'t fixing', on: () => set({ ...D0, scan: false, camp: false, human: false }), off: reset },
      { label: 'Test the model without its shield', hint: 'not what ships', on: () => set({ ...D0, target: false }), off: reset },
    ];
    function status() {
      if (!st.target) return { ok: false, msg: '<b>You tested a different system from the one you ship.</b> Run the scan through the shield too. Probes and shields interact, and users meet the whole stack.' };
      if (st.shield && !st.scan && !st.camp) return { ok: false, msg: `<b>Nothing found, and ${R.open} open.</b> A shield blocks known patterns. It doesn't fix anything or tell you what is underneath. It is a defence, not a test.` };
      if (R.open) return { ok: false, msg: `<b>The report is clean for what it covered, and ${R.open} weaknesses remain.</b> Scanners find what their probes know. Multi-turn attacks need a campaign. New ideas need people.` };
      return { ok: true, msg: '<b>All twelve found or blocked.</b> That means these twelve. Rerun on every model and prompt change, and add new findings as probes.' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Before launch', home: true, say: 'A telecom in Kigali is about to launch a bot. Twelve weaknesses are hidden in it, and nobody knows that yet.', act: m => m.set({ shield: false, scan: false, camp: false, human: false, target: true }) },
    { t: 'A shield', home: true, say: 'Llama Guard classifies inputs and outputs. It blocks known patterns, and it doesn\'t find or fix anything.', act: m => m.set({ shield: true, scan: false, camp: false, human: false, target: true }) },
    { t: 'A scanner', home: true, say: 'Garak fires probes, and detectors score the replies. It covers known single-turn attacks, repeatably.', act: m => m.set({ shield: true, scan: true, camp: false, human: false, target: true }) },
    { t: 'A campaign', home: true, say: 'PyRIT runs multi-turn attacks that respond to each reply. It reaches what one-shot probes can\'t.', act: m => m.set({ shield: true, scan: true, camp: true, human: false, target: true }) },
    { t: 'People', home: true, say: 'Tools find what they know about. New ideas still come from people.', act: m => m.set({ shield: true, scan: true, camp: true, human: true, target: true }) },
    { t: 'What clean means', home: true, say: 'A clean report means those tests found nothing. Rerun it after every change, and test the whole system.', act: m => m.set({ shield: true, scan: true, camp: true, human: true, target: false }) },
  ],
  check: [
    { q: 'What is Llama Guard?', options: ['A safety classifier for inputs and outputs', 'A scanner', 'A model server'], answer: 0, why: 'It defends rather than tests.', hint: 'Try Rely on the shield.' },
    { q: 'How is Garak organised?', options: ['Probes, detectors and harnesses', 'Encoders and decoders', 'Nodes and edges'], answer: 0, why: 'Probes attack, detectors score, harnesses run.', hint: 'See A scanner.' },
    { q: 'What does a clean scan prove?', options: ['Those probes found nothing', 'The system is safe', 'No attack exists'], answer: 0, why: 'A scanner only knows its probes.', hint: 'Try One scan, then ship.' },
  ],
  terms: [
    ['Red teaming', 'Attacking your own system to find weaknesses.'],
    ['Probe', 'A generated attack attempt.'],
    ['Detector', 'A scorer for a reply.'],
    ['Harness', 'What runs probes and reports.'],
    ['Campaign', 'A multi-turn, adaptive test.'],
    ['Hazard category', 'A class of harm in a shared taxonomy.'],
  ],
  deeper: '<p><b>Hazard categories.</b> Llama Guard follows MLCommons\' fourteen, which include less obvious ones such as code interpreter abuse.</p><p><b>Always authorised.</b> Run these only on systems you own or have permission to test.</p><p><b>Combine them.</b> Campaigns can reuse scanner probes, and shields can sit in the loop.</p>',
  code: {
    title: 'A scan in CI',
    note: 'A sketch of how the course combines these tools (code/main.py).',
    text: `
# garak: probes and detectors against your own endpoint
# python -m garak --model_type rest --generator_option_file target.json --probes promptinject

def gate(report, baseline):
    new = report.failures - baseline.failures
    return "block release" if new else "pass"
`,
  },
};
