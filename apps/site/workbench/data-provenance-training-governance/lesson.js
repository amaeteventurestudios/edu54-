// Data provenance and governance (phase 18, lesson 27): a Yoruba radio archive goes into a language model. Data can be deleted from a database, not from a trained network. Sources pass a gate; an erasure request then arrives.
// Machine: a hopper of tagged sources, an oven that bakes them into a block, a request ball. A ledger of what went in decides what you can answer. Retraining is the real erasure and it costs; an output filter only hides.
const SRC = [
  { n: 'Licensed radio archive', ok: true }, { n: 'Community recordings with consent', ok: true },
  { n: 'Web pages, no opt-out', ok: false }, { n: 'Web pages marked opt-out', ok: false, out: true }, { n: 'Personal voice notes', ok: false, pii: true },
];
function run(o) {
  const used = SRC.map(s => (!o.optout || !s.out) && (!o.pii || !s.pii) && (!o.consent || s.ok));
  const count = used.filter(Boolean).length, risk = used.filter((u, i) => u && !SRC[i].ok).length;
  const req = o.fix;
  const erased = req === 'retrain', hidden = req === 'filter';
  return { used, count, risk, erased, hidden, fields: o.ledger ? 12 : 0, known: o.ledger, cost: erased ? 10 : hidden ? 1 : 0 };
}

export default {
  slug: 'data-provenance-training-governance',
  title: 'Training-data governance: you can\'t un-bake a model',
  description: 'Delete a row, and it is gone. Ask a model to forget, and it can\'t. Decide what goes in before it is baked.',
  overview: 'Data governance sits upstream of every model card and every rule. Three ideas have settled in. Opt-out signals should be honoured, as publishers increasingly restrict what crawlers may take. Datasets should be disclosed, as California\'s AB 2013 asks with twelve fields. And regulators in Europe have accepted some legitimate-interest training on public data, under conditions. The hard part is irreversibility. Data protection law gives a right to erasure, and a database can honour that. A trained network has no row to delete. Retraining works and is costly. Filtering outputs hides the symptom. So the time to decide is before training, with a ledger of what went in.',
  keywords: ['data provenance', 'AB 2013', 'right to erasure', 'opt-out', 'training data', 'data governance'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { optout: true, pii: true, consent: false, ledger: true, fix: 'none' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const Z = i => -0.6 + i * 0.3;
    const C = SRC.map((s, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.42, 0.22, 0.24, '#fff', { r: 0.03, material: m }); b.position.set(-2.1, 0.03, Z(i)); S.add(b); return m; });
    const gate = P.box(0.08, 0.5, 1.45, SAF, { r: 0.01 }); gate.position.set(-1.55, 0.03, 0); S.add(gate);
    const b = add(P.belt(V(-1.4, 0, 0.1), V(0.1, 0, 0.1), { w: 0.34, speed: 1 }));
    const oven = P.box(0.9, 0.8, 0.9, '#2C2D31', { r: 0.08 }); oven.position.set(0.5, 0.03, 0); S.add(oven);
    const model = P.box(0.7, 0.5, 0.7, GOOD, { r: 0.12, material: new S.THREE.MeshLambertMaterial({ color: GOOD }) }); model.position.set(1.55, 0.03, -0.1); S.add(model);
    const book = add(P.stack(0.55, 0.42, 0.06, { max: 12, color: '#F4F1EA' })); book.position.set(-0.6, 0.03, -0.5);
    const lamp = add(P.lamp(GOOD, { h: 0.45, r: 0.1 })); lamp.position.set(2.3, 0.03, 0.4);
    S.add(P.keep(-2.5, 2.5, 0.95, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      C.forEach((m, i) => m.color.set(R.used[i] ? (SRC[i].ok ? GOOD : BAD) : GREY));
      book.userData.set({ n: R.fields, colors: Array(12).fill('#F4F1EA') });
      model.material.color.set(R.erased ? GOOD : R.risk ? '#C9A08A' : GOOD);
      lamp.userData.set({ color: !R.risk || R.erased ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const FK = ['none', 'filter', 'retrain'];
    const controls = [
      { type: 'toggle', label: 'Honour opt-out signals', short: 'Opt-out', get: () => st.optout, set: v => set({ optout: !!v }) },
      { type: 'toggle', label: 'Keep out personal voice notes', short: 'No PII', get: () => st.pii, set: v => set({ pii: !!v }) },
      { type: 'toggle', label: 'Licensed or consented sources only', short: 'Consent only', get: () => st.consent, set: v => set({ consent: !!v }) },
      { type: 'toggle', label: 'Keep a ledger of every dataset', short: 'Ledger', get: () => st.ledger, set: v => set({ ledger: !!v }) },
      { type: 'buttons', label: 'A speaker asks to be erased', options: ['Do nothing', 'Filter outputs', 'Retrain'], get: () => FK.indexOf(st.fix), act: i => set({ fix: FK[i] }) },
    ];
    const readouts = [
      { label: 'Sources baked in', get: () => ({ v: `${R.count} of 5`, sub: `${R.risk} carry risk`, good: !R.risk, bad: R.risk > 1 }) },
      { label: 'Disclosure fields', get: () => ({ v: `${R.fields} of 12`, sub: 'AB 2013 style', good: R.known, bad: !R.known }) },
      { label: 'Erasure', get: () => ({ v: R.erased ? 'done, costly' : R.hidden ? 'only hidden' : 'not possible', sub: 'the data stays in the weights', good: R.erased, bad: !R.erased && st.fix !== 'none' }) },
    ];
    const labels = [
      { name: 's', t: 'Five sources', d: 'Coral: risky. Grey: kept out', icon: 'box', atV: V(-2.38, 0.2, 0) },
      { name: 'm', t: 'The baked model', d: 'No row to delete', icon: 'target', atV: V(2.0, 0.3, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Take everything', hint: 'sort it out later', on: () => set({ ...D0, optout: false, pii: false, ledger: false }), off: reset },
      { label: 'Delete the source file', hint: 'it is already baked', on: () => set({ ...D0, pii: false, fix: 'none' }), off: reset },
      { label: 'Answer erasure with a filter', hint: 'hide the symptom', on: () => set({ ...D0, pii: false, fix: 'filter' }), off: reset },
    ];
    function status() {
      if (!st.ledger) return { ok: false, msg: `<b>${R.count} sources in, and no record of them.</b> When someone asks "was my voice used?", nobody can answer. Disclosure duties need the ledger from the start.` };
      if (R.hidden) return { ok: false, msg: '<b>The filter stops the model repeating it. The data stays in the weights.</b> That is a useful stopgap and not erasure. Say which one you are doing.' };
      if (R.erased) return { ok: true, msg: '<b>Retrained without that source: a real erasure, at the price of a full run.</b> A ledger tells you which source and which run. This cost is why it pays to decide before baking.' };
      if (R.risk) return { ok: false, msg: `<b>${R.risk} risky source${R.risk === 1 ? '' : 's'} in the model, and deleting the file changes nothing now.</b> A database has a row to remove. A network doesn't.` };
      return { ok: true, msg: `<b>${R.count} sources in, each on the ledger.</b> The community recordings came with consent, so nobody has to be un-baked later.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 0.9 && b.userData.count() < 3) { u = 0; b.userData.send('#F4F1EA', { size: 0.16 }); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Into the oven', home: true, say: 'A team in Ibadan builds a Yoruba language model from radio archives, community recordings and the web. Once it is baked, it is baked.', act: m => m.set({ optout: false, pii: false, consent: false, ledger: false, fix: 'none' }) },
    { t: 'The gate', home: true, say: 'Decide what goes in first. Honour opt-out signals, and keep personal recordings out.', act: m => m.set({ optout: true, pii: true, consent: false, ledger: false, fix: 'none' }) },
    { t: 'A ledger', home: true, say: 'Record every dataset as it goes in. Laws like California\'s AB 2013 ask for just that.', act: m => m.set({ optout: true, pii: true, consent: false, ledger: true, fix: 'none' }) },
    { t: 'Please erase me', home: true, say: 'A speaker asks to be removed. A database has a row to delete. A network doesn\'t.', act: m => m.set({ optout: true, pii: false, consent: false, ledger: true, fix: 'none' }) },
    { t: 'Hide or remove', home: true, say: 'An output filter hides the symptom. Retraining removes it, at a high price.', act: m => m.set({ optout: true, pii: false, consent: false, ledger: true, fix: 'filter' }) },
    { t: 'Consent first', home: true, say: 'Community data gathered with consent needs no un-baking. It is slower, and it lasts.', act: m => m.set({ optout: true, pii: true, consent: true, ledger: true, fix: 'none' }) },
  ],
  check: [
    { q: 'Why is erasure hard for a trained model?', options: ['There is no row to delete', 'Models are encrypted', 'Laws forbid it'], answer: 0, why: 'Data lives on in the weights.', hint: 'See Please erase me.' },
    { q: 'What does an output filter do?', options: ['Hides the symptom only', 'Removes the data', 'Retrains the model'], answer: 0, why: 'The weights don\'t change.', hint: 'Try Answer erasure with a filter.' },
    { q: 'When should you decide about data?', options: ['Before training', 'After launch', 'After a complaint'], answer: 0, why: 'Afterwards is costly or impossible.', hint: 'See The gate.' },
  ],
  terms: [
    ['Provenance', 'Where data came from.'],
    ['Opt-out signal', 'A notice not to use content.'],
    ['Right to erasure', 'A legal right to have data removed.'],
    ['Machine unlearning', 'Attempts to remove data\'s effect without full retraining.'],
    ['Legitimate interest', 'A legal basis some regulators accept for training.'],
    ['AB 2013', 'A California law on training-data disclosure.'],
  ],
  deeper: '<p><b>Consent in crisis.</b> The Data Provenance Initiative found that publishers are restricting more of the web to crawlers, so the open data commons is shrinking.</p><p><b>Unlearning.</b> Research methods exist, and few give strong guarantees at this scale.</p><p><b>Not legal advice.</b> Rules differ by country. Community-led data projects across Africa offer strong models of consent and shared benefit.</p>',
  code: {
    title: 'A ledger entry',
    note: 'Adapted from the course\'s AB 2013 scaffold (code/main.py).',
    text: `
entry = {
    "name": "Ibadan community recordings",
    "source": "gathered with signed consent",
    "licence": "community licence v1",
    "personal_data": True,
    "date_range": "2023-2025",
    "size": 41000,
}
ledger.append(entry)
`,
  },
};
