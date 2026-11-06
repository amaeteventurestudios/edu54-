// Data provenance and documentation (phase 18, lessons 26 and 27): an invented lab assembles training data for a multilingual assistant
// from six sources. Respecting machine-readable opt-outs, scrubbing personal data and recording provenance happen at collection time,
// because once data is in the weights it cannot be cleanly removed. The datasheet feeds the model card, which feeds the system card;
// gaps upstream become unverifiable claims downstream. An erasure request shows the one-way door: cheap before training, retraining or
// approximate unlearning after. Field counts follow California AB 2013's twelve items.
const SOURCES = [
  { name: 'news archive · licensed', optOut: false, pii: false },
  { name: 'public forum posts', optOut: false, pii: false, erase: true },
  { name: 'recipe sites · no-AI tag', optOut: true, pii: false },
  { name: 'Hausa radio transcripts · licensed', optOut: false, pii: false },
  { name: 'support chats · phone numbers', optOut: false, pii: true },
  { name: 'photo blog · robots.txt opt-out', optOut: true, pii: false },
];
function ledger(o) {
  const used = SOURCES.map(s => !(s.optOut && o.respect));
  const optViol = SOURCES.filter((s, i) => s.optOut && used[i]).length;
  const pii = !o.scrub;
  const fields = o.record ? 12 : 5;
  const erase = o.erase === 'none' ? null : o.erase === 'before' ? 'filtered out before training' : 'already in the weights';
  return { used, optViol, pii, fields, erase };
}

export default {
  slug: 'data-provenance-cards',
  title: 'Data provenance and model cards: decide at collection',
  description: 'A lab gathers training data for a multilingual assistant from six sources. Filter at collection, because no card can take anything back out of the weights.',
  overview: 'Documentation turns a model from a black box into something others can check. Datasheets for Datasets (Gebru and colleagues, 2018) ask why a dataset was made, what is in it, how it was collected and labelled, what uses are intended or ruled out, and who maintains it. Model Cards (Mitchell and colleagues, 2019) describe intended use, evaluation data and results broken down by the factors that matter, ethical considerations and caveats. Data Cards (Google, 2022) layer detail for different readers, and system cards cover the whole deployed system, including its safety stack and incident response. Each layer depends on the one below: a model card\'s training-data section is only as true as the datasheet behind it. Adoption has been patchy; one audit found almost no public model cards documented ethical considerations, though detailed cards now correlate with more downloads, and work on signed attestations lets a card carry proof rather than only a claim. Law is catching up. California\'s AB 2013 requires developers of generative AI to publish a summary of training data covering twelve items, including sources, whether data is licensed or copyrighted, whether it holds personal information, how it was cleaned and when it was collected. In the EU, providers of general-purpose models must respect machine-readable opt-outs from text and data mining. The hard part is time. Consent tools on the web assume tracking can be reversed, but once data is trained into weights it cannot be surgically removed: retraining is the only complete fix, and unlearning is approximate. So the compliance window is at collection. A 2024 audit by the Data Provenance Initiative also found publishers adding restrictions quickly, shrinking the openly usable data commons. This machine follows an invented lab building an assistant from six sources, including licensed news and Hausa radio transcripts.',
  keywords: ['data provenance', 'model cards', 'datasheets for datasets', 'system cards', 'AB 2013', 'opt-out', 'training data governance'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { respect: true, scrub: true, record: true, erase: 'before' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* six sources pipe into the dataset, the dataset into the weights */
    const SZ = i => -1.05 + i * 0.3;
    const src = SOURCES.map((s, i) => {
      const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.42, 0.18, 0.22, '#fff', { r: 0.03, material: m }); b.position.set(-2.1, 0, SZ(i)); S.add(b);
      const lm = new THREE.MeshLambertMaterial({ color: GOOD }), l = P.rod(V(-1.88, 0.1, SZ(i)), V(-0.95, 0.12, -0.3), 0.014, '#fff', { material: lm }); S.add(l);
      return { m, lm, l };
    });
    const set0 = P.jar(0.32, 0.5, { max: 6, coin: '#5B8DB8' }); set0.position.set(-0.7, 0, -0.3); S.add(set0);
    const pipe = P.pipe([V(-0.38, 0.2, -0.3), V(0, 0.2, -0.3), V(0.3, 0.2, -0.3)], '#3D6BD6', { r: 0.04, n: 3 }); S.add(pipe);
    /* the weights: a sealed block; once in, nothing comes out */
    const sealM = new THREE.MeshLambertMaterial({ color: '#3B3F52' }), seal = P.box(0.6, 0.46, 0.6, '#fff', { r: 0.05, material: sealM }); seal.position.set(0.65, 0, -0.3); S.add(seal);
    /* three documents, each resting on the one before */
    const docs = [0, 1, 2].map(i => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.7, 0.1, 0.46, '#fff', { r: 0.03, material: m }); b.position.set(1.55, i * 0.12, -0.3); S.add(b); return m; });
    S.add(P.keep(-2.35, 1.95, 0.75, -1.25, 0.5));
    let R = null;
    function draw() {
      R = ledger(st);
      SOURCES.forEach((s, i) => {
        const used = R.used[i], warn = (s.optOut && used) || (s.pii && !st.scrub), erased = s.erase && st.erase === 'before';
        src[i].m.color.set(!used ? OFF : warn ? BAD : erased ? SAF : GOOD);
        src[i].l.visible = !!used; src[i].lm.color.set(warn ? BAD : GOOD);
      });
      const nUsed = R.used.filter(Boolean).length, bad = R.optViol > 0 || R.pii;
      set0.userData.set({ n: nUsed, color: bad ? BAD : '#5B8DB8' });
      sealM.color.set(st.erase === 'after' ? BAD : '#3B3F52');
      docs[0].color.set(st.record ? GOOD : BAD); docs[1].color.set(st.record && !bad ? GOOD : BAD); docs[2].color.set(st.erase !== 'after' ? GOOD : BAD);
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Respect opt-out signals', short: 'Opt-outs', get: () => st.respect, set: v => set({ respect: !!v }) },
      { type: 'toggle', label: 'Scrub personal data', short: 'Scrub', get: () => st.scrub, set: v => set({ scrub: !!v }) },
      { type: 'toggle', label: 'Record provenance for every source', short: 'Provenance', get: () => st.record, set: v => set({ record: !!v }) },
      { type: 'buttons', label: 'Erasure request arrives', options: ['Never', 'Before training', 'After training'], get: () => ['none', 'before', 'after'].indexOf(st.erase), act: i => set({ erase: ['none', 'before', 'after'][i] }) },
    ];
    const readouts = [
      { label: 'Opted-out sources', get: () => ({ v: `${R.optViol}`, sub: 'trained on anyway', good: R.optViol === 0, bad: R.optViol > 0 }) },
      { label: 'Datasheet', get: () => ({ v: `${R.fields} of 12`, sub: 'AB 2013 items', good: R.fields === 12, bad: R.fields < 12 }) },
      { label: 'Erasure', get: () => ({ v: st.erase === 'after' ? 'retrain' : st.erase === 'before' ? 'filter' : 'none yet', sub: 'cost of removal', good: st.erase !== 'after', bad: st.erase === 'after' }) },
    ];
    const labels = [
      { name: 's', t: 'Six data sources', d: 'Red: should not go in', icon: 'box', atV: V(-2.32, 0.1, -0.3) },
      { name: 'd', t: 'Three documents', d: 'Each rests on the one below', icon: 'book', atV: V(1.9, 0.15, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Ignore opt-out signals', hint: 'two sources said no', on: () => set({ ...D0, respect: false }), off: reset },
      { label: 'Skip provenance records', hint: 'the card can\'t be checked', on: () => set({ ...D0, record: false }), off: reset },
      { label: 'Keep the personal data', hint: 'phone numbers in training', on: () => set({ ...D0, scrub: false }), off: reset },
      { label: 'Get the erasure request after training', hint: 'too late to filter', on: () => set({ ...D0, erase: 'after' }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.optViol) return { ok: false, msg: `<b>${r.optViol} sources carried machine-readable opt-outs, and they went into training anyway.</b> In the EU, general-purpose model providers must respect these signals, and once trained in, the data cannot be pulled back out. Check opt-outs at collection.` };
      if (r.pii) return { ok: false, msg: '<b>Support chats with customers\' phone numbers went into training unscrubbed.</b> Models can memorise and repeat such details, and the data cannot be cleanly removed later. Scrub personal data before training, and say so in the datasheet.' };
      if (!st.record) return { ok: false, msg: `<b>Without provenance records the datasheet covers only ${r.fields} of the 12 items AB 2013 asks for, so the model card\'s training-data section is a claim no one can check.</b> Record source, licence, personal-data status, cleaning and dates for every source as you collect it.` };
      if (st.erase === 'after') return { ok: false, msg: '<b>A forum user asked for their posts to be erased after training: the posts are already spread through the weights.</b> The only complete fix is retraining without them; unlearning is approximate and must be audited. Removal is cheap only at collection time.' };
      return { ok: true, msg: `<b>Opt-outs respected, personal data scrubbed and all 12 items recorded: the datasheet backs the model card, and the system card names a working erasure route.</b> ${st.erase === 'before' ? 'The forum user\'s posts were filtered out before training, at almost no cost.' : 'No erasure requests yet; the route is ready.'}` };
    }
    return { update: dt => { pipe.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Six sources', home: true, say: 'A lab gathers training data for a multilingual assistant from six sources, each with its own terms.', act: m => m.set({ respect: false, scrub: false, record: false, erase: 'none' }) },
    { t: 'Respect opt-outs', home: true, say: 'Two sources carry machine-readable signals saying no to AI training. Leave them out.', act: m => m.set({ respect: true, scrub: false, record: false, erase: 'none' }) },
    { t: 'Scrub personal data', home: true, say: 'Support chats hold phone numbers. Remove them before training, not after.', act: m => m.set({ respect: true, scrub: true, record: false, erase: 'none' }) },
    { t: 'Record provenance', home: true, say: 'Record source, licence, dates and cleaning for every source. The datasheet now backs the model card.', act: m => m.set({ respect: true, scrub: true, record: true, erase: 'none' }) },
    { t: 'A one-way door', home: true, say: 'A forum user asks for their posts to be erased. After training, only retraining fully removes them.', act: m => m.set({ respect: true, scrub: true, record: true, erase: 'after' }) },
    { t: 'Decide at collection', home: true, say: 'Before training, the same request is a simple filter. The compliance window is at collection.', act: m => m.set({ respect: true, scrub: true, record: true, erase: 'before' }) },
  ],
  check: [
    { q: 'Why does a model card depend on the datasheet?', options: ['Its training-data claims come from the datasheet', 'They are the same document', 'It does not'], answer: 0, why: 'Gaps upstream become unverifiable claims.', hint: 'Try Skip provenance records.' },
    { q: 'Why is erasure hard after training?', options: ['Data is spread through the weights; only retraining fully removes it', 'The file is locked', 'Law forbids it'], answer: 0, why: 'Unlearning is approximate.', hint: 'Try Get the erasure request after training.' },
    { q: 'When should opt-out signals be checked?', options: ['At collection, before training', 'After release', 'Only on request'], answer: 0, why: 'Trained-in data can\'t be pulled out.', hint: 'Try Ignore opt-out signals.' },
  ],
  terms: [
    ['Datasheet', 'Documentation of why a dataset exists, what is in it and how it was made.'],
    ['Model card', 'Documentation of a model\'s intended use, evaluations and caveats.'],
    ['System card', 'Documentation of a whole deployed system, including its safeguards.'],
    ['Provenance', 'A record of where data came from and under what terms.'],
    ['Opt-out signal', 'A machine-readable instruction not to use content for training.'],
    ['Right to erasure', 'A person\'s right to have their data deleted.'],
  ],
  deeper: '<p><b>Different readers.</b> Data Cards layer detail: a short summary for the public, an overview for practitioners and feature-level detail for auditors, all from one document.</p><p><b>Proof, not only claims.</b> Signed attestations can let a card prove what data and evaluations were used. Newer cards also add energy and water footprints.</p><p><b>About this machine.</b> The lab and sources are invented; the five-item count without provenance is illustrative.</p>',
  code: {
    title: 'A provenance record per source',
    note: 'Written for this lesson; the fields follow California AB 2013.',
    text: `
from dataclasses import dataclass, asdict
from datetime import date

@dataclass
class SourceRecord:
    owner: str
    purpose: str
    size_range: str
    data_types: str
    ip_status: str          # copyrighted, licensed, public domain
    licensed: bool
    personal_info: bool
    consumer_aggregate: bool
    cleaning: str
    collected: tuple[date, date | None]
    first_used: date
    synthetic: bool

def admit(source, record, opt_out_signals):
    if source.url in opt_out_signals:      # check at collection: trained-in data can't be pulled out
        return None
    return asdict(record)                   # feeds the datasheet, then the model card
`,
  },
};
