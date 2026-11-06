// Many-shot jailbreaking (phase 18, lesson 13): long context windows mean in-context examples can teach a model a pattern. A tank fills with fake dialogue blocks (grey; no real content anywhere on this page).
// Success follows a power law in shots: fails at about 5, starts near 32, reliable near 256. The same mechanism powers useful few-shot learning, so a per-message filter misses it. A classifier-based prompt change cut it from 61% to 2%.
const asr = n => Math.min(0.99, 0.0018 * n ** 1.05);
const LEARN = n => Math.min(0.98, 0.3 + 0.17 * Math.log2(n + 1));
function run(o) {
  let a = asr(o.n), keep = LEARN(o.n);
  if (o.def === 'filter') a *= 0.96;
  if (o.def === 'class') a = Math.min(a, 0.61) * (2 / 61);
  if (o.def === 'cap') { a = asr(Math.min(o.n, 8)); keep = LEARN(Math.min(o.n, 8)); }
  return { a, keep, ctx: Math.min(1, o.n / 300) };
}

export default {
  slug: 'many-shot-jailbreaking',
  title: 'Many-shot jailbreaking: when context becomes the attack',
  description: 'Long context windows let a pattern build up. See why one filter misses it, and how a defence that sees the whole prompt helps.',
  overview: 'Long context is a product feature, and it is also an attack surface. Anthropic\'s many-shot work showed that if a prompt holds many fake dialogues in which an assistant behaves badly, the model picks up that pattern and may continue it. Success follows a power law in the number of shots: it fails at a handful, starts to work in the dozens and is reliable in the hundreds. Nothing is exploited here in the usual sense. It is the same mechanism as helpful in-context learning, which is why it is hard to remove. Per-message filters miss it, because no one message is the problem. This lesson shows only the shape, using grey blocks with no content.',
  keywords: ['many-shot jailbreaking', 'prompt safety', 'context window', 'in-context learning', 'AI safety', 'classifiers'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.06, 0.55, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { n: 256, def: 'class' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#8E91A3', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const tank = add(P.tank(0.9, 1.15, 0.8, GREY)); tank.position.set(-1.9, 0.08, 0);
    const SH = [1, 5, 16, 32, 64, 128, 256], X = i => -0.9 + i * 0.42;
    const T = SH.map((n, i) => { const t = add(P.tower(0.32, 0.42, GOOD)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const shield = P.box(0.08, 0.9, 1.0, SAF, { r: 0.01, material: new S.THREE.MeshLambertMaterial({ color: SAF }) }); shield.position.set(-1.2, 0.03, 0); S.add(shield);
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.11 })); lamp.position.set(2.2, 0.03, 0.4);
    S.add(P.keep(-2.5, 2.5, 1.3, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      tank.userData.set({ level: R.ctx });
      T.forEach((t, i) => { const v = run({ ...st, n: SH[i] }).a; t.userData.set({ h: Math.max(0.03, v * 1.15), color: SH[i] <= st.n ? (v > 0.3 ? BAD : GOOD) : '#D8D2C4' }); });
      shield.visible = st.def !== 'none';
      shield.material.color.set(st.def === 'class' ? GOOD : SAF);
      lamp.userData.set({ color: R.a < 0.1 && R.keep > 0.6 ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const DK = ['none', 'filter', 'class', 'cap'];
    const controls = [
      { type: 'slider', label: 'Fake examples in the prompt', min: 1, max: 256, step: 1, get: () => st.n, set: v => set({ n: v }) },
      { type: 'buttons', label: 'Defence', options: ['None', 'Per-message filter', 'Whole-prompt classifier', 'Cut context'], get: () => DK.indexOf(st.def), act: i => set({ def: DK[i] }) },
    ];
    const readouts = [
      { label: 'Attack success', get: () => ({ v: `${Math.round(R.a * 100)}%`, sub: `at ${st.n} examples`, good: R.a < 0.1, bad: R.a > 0.3 }) },
      { label: 'Useful in-context learning', get: () => ({ v: `${Math.round(R.keep * 100)}%`, sub: 'legitimate use kept', good: R.keep > 0.6, bad: R.keep < 0.6 }) },
      { label: 'Window used', get: () => ({ v: `${Math.round(R.ctx * 100)}%`, sub: 'by the prompt' }) },
    ];
    const labels = [
      { name: 't', t: 'Context window', d: 'Grey: repeated fake examples', icon: 'box', atV: V(-2.38, 0.5, 0) },
      { name: 'c', t: 'Success by shots', d: 'It keeps climbing', icon: 'target', atV: V(X(6) + 0.18, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No defence, long context', hint: 'the climb continues', on: () => set({ ...D0, def: 'none' }), off: reset },
      { label: 'Check one message at a time', hint: 'each looks fine', on: () => set({ ...D0, def: 'filter' }), off: reset },
      { label: 'Cut the context window', hint: 'hurts legitimate work', on: () => set({ ...D0, def: 'cap' }), off: reset },
    ];
    function status() {
      const a = `${Math.round(R.a * 100)}%`;
      if (st.def === 'none' && R.a > 0.3) return { ok: false, msg: `<b>${a} at ${st.n} examples, and the curve doesn't level off.</b> It follows a power law, so more context means more risk. The model is doing what it does well: spotting a pattern.` };
      if (st.def === 'filter') return { ok: false, msg: `<b>${a}: no single message looks like the problem.</b> A message-by-message filter can't see a pattern across hundreds. The attack lives in the prompt as a whole.` };
      if (st.def === 'cap') return { ok: false, msg: `<b>Attack down to ${a}, and useful learning down to ${Math.round(R.keep * 100)}%.</b> Cutting context removes a real feature, as this mechanism is what makes examples useful.` };
      if (st.def === 'class') return { ok: true, msg: `<b>${a} at ${st.n} examples.</b> A classifier that looks at the prompt as a whole, then changes it, cut success sharply: the course cites 61% to 2%. Legitimate long prompts keep working.` };
      return { ok: R.a < 0.1, msg: `<b>${a} at ${st.n} examples.</b> Below about thirty, this mostly fails. Slide it up and watch the curve.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Long context', home: true, say: 'Models now hold huge prompts. That is what lets them read whole books, and it opens a new way to attack.', act: m => m.set({ n: 5, def: 'none' }) },
    { t: 'A pattern', home: true, say: 'Fill a prompt with fake dialogues in which an assistant misbehaves. At a few examples, it fails.', act: m => m.set({ n: 16, def: 'none' }) },
    { t: 'A power law', home: true, say: 'At dozens it begins to work, at hundreds it is reliable, and the curve doesn\'t level off.', act: m => m.set({ n: 256, def: 'none' }) },
    { t: 'The same mechanism', home: true, say: 'This is how helpful examples work too. The model extracts a task from context, so you can\'t simply remove it.', act: m => m.set({ n: 256, def: 'cap' }) },
    { t: 'No single message', home: true, say: 'A filter on each message sees nothing wrong, as no message is the problem.', act: m => m.set({ n: 256, def: 'filter' }) },
    { t: 'See the whole prompt', home: true, say: 'A classifier that looks at the whole prompt cuts success sharply, and normal long prompts still work.', act: m => m.set({ n: 256, def: 'class' }) },
  ],
  check: [
    { q: 'How does success grow with examples?', options: ['A power law that keeps climbing', 'It plateaus at ten', 'It falls'], answer: 0, why: 'More context, more risk.', hint: 'Slide the examples up.' },
    { q: 'Why is this hard to remove?', options: ['It shares a mechanism with useful in-context learning', 'It is a bug in the tokenizer', 'It needs a GPU'], answer: 0, why: 'Pattern extraction is a feature.', hint: 'Try Cut the context window.' },
    { q: 'Why do per-message filters miss it?', options: ['No single message is the problem', 'They are too slow', 'They only read English'], answer: 0, why: 'The attack is a pattern across messages.', hint: 'Try Check one message at a time.' },
  ],
  terms: [
    ['Shot', 'One example in a prompt.'],
    ['In-context learning', 'Picking up a task from examples in the prompt.'],
    ['Power law', 'Growth that follows a fixed exponent.'],
    ['Attack success rate', 'How often an attack works.'],
    ['Prompt classifier', 'A check on the prompt as a whole.'],
    ['Context window', 'How much a model can read at once.'],
  ],
  deeper: '<p><b>Disclosure.</b> Anthropic shared this work with other labs before publishing, so that defences could be put in place first.</p><p><b>No examples here.</b> This page shows only the shape, and deliberately none of the content.</p><p><b>The curve</b> is a fitted illustration of the reported pattern, not measured data.</p>',
  code: {
    title: 'A whole-prompt check',
    note: 'A defensive sketch based on the course\'s description (code/main.py).',
    text: `
def guard(prompt):
    dialogues = count_embedded_turns(prompt)     # role-labelled turns in one message
    if dialogues > LIMIT and classifier(prompt).risky:
        return add_safety_context(prompt)
    return prompt
`,
  },
};
