// Build your own time-travel database: an invented market association in Accra records which trader holds each stall and what they sell. The
// database never overwrites: every transaction adds a new layer holding only the facts that changed, and shares the rest with the layer before
// (structural sharing). A query names a moment, and is answered from the layer as of then. An attribute-value index finds stalls by what they
// sell without reading every stall. Answers, storage and read counts are computed from the history below.
const STALLS = ['stall 12', 'stall 14', 'stall 15'];
const TX = [
  { t: 1, set: [[0, 'owner', 'Adjoa'], [0, 'goods', 'fabric'], [1, 'owner', 'Kofi'], [1, 'goods', 'yams'], [2, 'owner', 'Esi'], [2, 'goods', 'fabric']] },
  { t: 2, set: [[1, 'goods', 'peppers']] },
  { t: 3, set: [[0, 'owner', 'Yaw']] },
  { t: 4, set: [[2, 'goods', 'beads']] },
  { t: 5, set: [[0, 'goods', 'shoes']] },
  { t: 6, set: [[1, 'owner', 'Akosua']] },
];
const MARKET = 10000;
function layers() {
  const out = []; let cur = STALLS.map(() => ({}));
  TX.forEach(tx => { cur = cur.map(e => ({ ...e })); const changed = new Set(); tx.set.forEach(([e, a, v]) => { cur[e][a] = v; changed.add(`${e}|${a}`); }); out.push({ t: tx.t, state: cur, changed }); });
  return out;
}
const L = layers();
function query(o) {
  const at = o.inPlace ? L[L.length - 1] : L[o.asOf - 1];
  const truth = L[o.asOf - 1];
  const owner = at.state[0].owner, ownerTrue = truth.state[0].owner;
  const fabric = at.state.map((e, i) => e.goods === 'fabric' ? STALLS[i] : null).filter(Boolean);
  const fabricTrue = truth.state.map((e, i) => e.goods === 'fabric' ? STALLS[i] : null).filter(Boolean);
  const facts = o.inPlace ? 6 : o.share ? TX.reduce((a, tx) => a + tx.set.length, 0) : TX.length * 6;
  const reads = o.index ? 1 : STALLS.length;
  return { owner, ownerTrue, fabric, fabricTrue, facts, reads, right: owner === ownerTrue && fabric.join() === fabricTrue.join() };
}

export default {
  slug: 'build-a-time-travel-database',
  title: 'Build your own time-travel database',
  description: 'A market association\'s database never overwrites. Each change adds a new layer on top, so you can ask what was true at any moment.',
  overview: 'Most databases update in place: change a value and the old one is gone. A time-travel database, like the archaeology-inspired one this lesson follows or Datomic in production, treats data as a growing record of facts instead. Each fact says that an entity has an attribute with a value, such as stall 12, owner, Adjoa, and each transaction adds a new layer of facts on top of the old ones, like soil building up over a dig site. Nothing is erased; a change is a newer fact. A query therefore names a moment, as of transaction three, and reads the layer that was current then, so questions such as who held this stall last year, or what did we believe before the correction, have exact answers. Keeping every layer could be wasteful, so layers use structural sharing: a new layer stores only the facts that changed and points to the previous layer for everything else, so storage grows with the number of changes, not with the size of the database times the number of versions. To answer questions by value rather than by entity, the database keeps several indexes over the same facts, sorted in different orders: by entity then attribute, by attribute then value, and by value; the attribute-value index finds every stall selling fabric without reading each stall. A related query, the evolution of an attribute, walks back through the layers to list every value it has had. This machine follows an invented market association in Accra with three stalls and six transactions.',
  keywords: ['build your own database', 'time travel database', 'immutable data', 'as-of query', 'structural sharing', 'Datomic', 'database index'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, -0.15], dir: [0.12, 0.75, 1.2], half: 1.0, wide: 5.4 },
  credit: 'Built from <a href="https://aosabook.org/en/500L/an-archaeology-inspired-database.html" target="_blank" rel="noopener">An Archaeology-Inspired Database</a> by Yoav Rubin, in <a href="https://aosabook.org/en/500L/" target="_blank" rel="noopener">500 Lines or Less</a> (text CC BY 3.0, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short layered store, written for this lesson after the CircleDB chapter (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { asOf: 2, inPlace: false, share: true, index: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B8';
    const PEOPLE = { Adjoa: '#7A4FB5', Kofi: '#3D6BD6', Esi: '#D9822B', Yaw: '#2E8C5A', Akosua: '#C2477A' };
    const GOODS = { fabric: '#E3A72F', yams: '#8A5F3A', peppers: '#D9483B', beads: '#4FB3C9', shoes: '#4A4D5C' };
    const SX = r => -1.05 + r * 1.05, LY = i => 0.1 + i * 0.2, LZ = i => 0.62 - i * 0.3;
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // six strata: one slab per transaction, the newest on top
    const SOIL = ['#D9C9A8', '#CDBA94'];
    const slabs = TX.map((tx, i) => { const m = own(SOIL[i % 2]), b = P.box(3.3, LY(i), 0.3, '#fff', { r: 0.02, material: m }); b.position.set(0, 0, LZ(i)); S.add(b); return { b, m }; });
    // the facts stored in a layer: a pawn for the owner, a crate for the goods
    const pawn = c => { const g = new THREE.Group(), m = own(c); const body = P.cyl(0.075, 0.16, c, { material: m }); g.add(body); const head = P.ball(0.07, c, { material: m }); head.position.y = 0.21; g.add(head); g.userData.m = m; return g; };
    const crate = c => { const m = own(c), b = P.box(0.21, 0.15, 0.2, c, { r: 0.025, material: m }); b.userData.m = m; return b; };
    const facts = TX.map((tx, i) => STALLS.map((s, r) => {
      const o = pawn('#fff'); o.position.set(SX(r) - 0.16, LY(i), LZ(i)); S.add(o);
      const g = crate('#fff'); g.position.set(SX(r) + 0.16, LY(i), LZ(i)); S.add(g);
      return { o, g };
    }));
    // the question: a probe from the lamp to stall 12 on the layer asked about
    const lamp = P.lamp(GOOD, { h: 0.35 }); lamp.position.set(-2.15, 0, 0.75); S.add(lamp);
    const probeM = own(SAF), probe = P.rod(V(-2.15, 0.5, 0.75), V(-1.2, 0.3, 0), 0.018, SAF, { material: probeM }); S.add(probe);
    // the attribute-value index: goods sorted, with a rod from fabric to every fabric seller
    const order = Object.keys(GOODS).sort();
    const idx = P.stack(0.32, 0.32, 0.17, { max: order.length }); idx.position.set(2.2, 0, 0.6); S.add(idx);
    idx.userData.set({ n: order.length, colors: order.map(k => GOODS[k]) });
    const scan = P.robot('#8E91A3', { scale: 0.8 }); scan.position.set(2.2, 0, 0.6); S.add(scan);
    const reads = STALLS.map(() => { const m = own(GOOD), r = P.rod(V(0, 0, 0), V(0, 1, 0), 0.016, GOOD, { material: m }); r.userData.m = m; r.userData.noFit = true; S.add(r); return r; });
    S.add(P.keep(-2.4, 2.5, LY(5) + 0.35, LZ(5) - 0.2, LZ(0) + 0.25));

    let R = null;
    const at = (i, r) => { for (let k = i; k >= 0; k--) { const f = TX[k].set.filter(([e]) => e === r); if (f.length) return k; } return 0; };
    function draw() {
      R = query(st);
      const sel = st.inPlace ? TX.length - 1 : st.asOf - 1;
      TX.forEach((tx, i) => {
        const live = !st.inPlace || i === TX.length - 1;
        slabs[i].b.visible = live; slabs[i].m.color.set(i === sel ? '#F6D98A' : SOIL[i % 2]);
        STALLS.forEach((s, r) => {
          const F = facts[i][r], state = L[i].state[r];
          const chO = L[i].changed.has(`${r}|owner`), chG = L[i].changed.has(`${r}|goods`);
          const showO = live && (st.inPlace || !st.share || chO), showG = live && (st.inPlace || !st.share || chG);
          // on the layer asked about, facts shared from below show as small ghosts
          const ghost = live && st.share && !st.inPlace && i === sel;
          F.o.visible = showO || ghost; F.g.visible = showG || ghost;
          F.o.scale.setScalar(showO ? 1 : 0.6); F.g.scale.setScalar(showG ? 1 : 0.6);
          F.o.userData.m.color.set(PEOPLE[state.owner]); F.g.userData.m.color.set(GOODS[state.goods]);
          F.o.userData.m.transparent = F.g.userData.m.transparent = false;
        });
      });
      lamp.userData.set({ color: R.right ? GOOD : BAD, on: true });
      P.setRod(probe, V(-2.15, 0.6, 0.75), V(SX(0) - 0.25, LY(sel) + 0.14, LZ(sel)));
      idx.visible = st.index; scan.visible = !st.index;
      const fab = L[sel].state.map((e, r) => e.goods === 'fabric');
      reads.forEach((rd, r) => {
        const on = st.index ? fab[r] : true;
        rd.visible = on; if (!on) return;
        const from = st.index ? V(2.2 - 0.16, 0.17 * order.indexOf('fabric') + 0.08, 0.6) : V(2.2, 0.55, 0.6);
        P.setRod(rd, from, V(SX(r) + 0.27, LY(sel) + 0.08, LZ(sel))); rd.userData.m.color.set(st.index ? GOOD : BAD);
      });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Ask as of transaction', min: 1, max: 6, step: 1, get: () => st.asOf, set: v => set({ asOf: +v }), fmt: v => `t${v}` },
      { type: 'toggle', label: 'Overwrite facts in place', short: 'In place', get: () => st.inPlace, set: v => set({ inPlace: !!v }) },
      { type: 'toggle', label: 'Share unchanged facts between layers', short: 'Share', get: () => st.share, set: v => set({ share: !!v }) },
      { type: 'toggle', label: 'Keep an attribute-value index', short: 'Index', get: () => st.index, set: v => set({ index: !!v }) },
    ];
    const readouts = [
      { label: 'Stall 12 then', get: () => ({ v: R.owner, sub: R.owner === R.ownerTrue ? 'correct' : `really ${R.ownerTrue}`, good: R.owner === R.ownerTrue, bad: R.owner !== R.ownerTrue }) },
      { label: 'Facts stored', get: () => ({ v: `${R.facts}`, sub: 'for six transactions', good: R.facts <= 11, bad: R.facts > 11 }) },
      { label: 'Fabric query', get: () => ({ v: `${R.reads} read${R.reads === 1 ? '' : 's'}`, sub: st.index ? 'index' : `${MARKET.toLocaleString('en')} at market scale`, good: st.index, bad: !st.index }) },
    ];
    const labels = [
      { name: 'l', t: 'Six layers, newest on top', d: 'Pawn: owner. Crate: goods. Gold: the moment asked', icon: 'box', atV: V(1.65, LY(5), LZ(5)) },
      { name: 'q', t: 'The question', d: 'Teal: right answer. Coral: wrong', icon: 'target', atV: V(-2.15, 0.2, 0.8) },
      { name: 'i', t: 'Index by goods', d: 'Teal rods: straight to fabric', icon: 'eye', atV: V(2.36, 0.3, 0.75) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Overwrite facts in place', hint: 'history gone', on: () => set({ ...D0, inPlace: true }), off: reset },
      { label: 'Copy the whole database each time', hint: 'storage balloons', on: () => set({ ...D0, share: false }), off: reset },
      { label: 'Find stalls by reading every one', hint: 'no index', on: () => set({ ...D0, index: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (st.inPlace) return { ok: false, msg: `<b>With facts overwritten in place there is only the latest state, so asked who held stall 12 as of t${st.asOf}, the database says ${r.owner}${r.owner !== r.ownerTrue ? `, but it was ${r.ownerTrue}` : ', right only by luck'}.</b> Add a new layer for every transaction and never erase the old facts.` };
      if (!st.share) return { ok: false, msg: `<b>Copying every stall into every layer stores ${r.facts} facts for six transactions that changed only ${TX.reduce((a, tx) => a + tx.set.length, 0)}; with ${MARKET.toLocaleString('en')} stalls each change would copy them all.</b> Store only the changed facts and point to the previous layer for the rest.` };
      if (!st.index) return { ok: false, msg: `<b>Without an attribute-value index, finding who sold fabric reads all ${STALLS.length} stalls, and at market scale it would read ${MARKET.toLocaleString('en')}.</b> Keep an index sorted by attribute then value, so the query jumps straight to fabric.` };
      return { ok: true, msg: `<b>As of t${st.asOf}, stall 12 was held by ${r.owner} and ${r.fabric.length ? r.fabric.join(' and ') : 'nobody'} sold fabric, answered from that layer.</b> Six transactions cost ${r.facts} stored facts thanks to sharing, and the fabric query took ${r.reads} index read${r.reads === 1 ? '' : 's'}. Slide through time to see the history.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Facts, not rows', home: true, say: 'A market association records who holds each stall and what they sell, as facts that build up over time.', act: m => m.set({ asOf: 1, inPlace: false, share: true, index: true }) },
    { t: 'Layers', home: true, say: 'Each transaction adds a new layer. Nothing is erased; a change is just a newer fact.', act: m => m.set({ asOf: 3, inPlace: false, share: true, index: true }) },
    { t: 'Ask about the past', home: true, say: 'Ask who held stall 12 as of transaction two, and read that layer. It was Adjoa.', act: m => m.set({ asOf: 2, inPlace: false, share: true, index: true }) },
    { t: 'Overwriting', home: true, say: 'Overwrite in place and only today survives. The answer about the past is wrong.', act: m => m.set({ asOf: 2, inPlace: true, share: true, index: true }) },
    { t: 'Share, don\'t copy', home: true, say: 'Each layer stores only what changed and points back for the rest.', act: m => m.set({ asOf: 6, inPlace: false, share: true, index: true }) },
    { t: 'Index by value', home: true, say: 'An index sorted by attribute and value finds every fabric seller without reading each stall.', act: m => m.set({ asOf: 1, inPlace: false, share: true, index: true }) },
  ],
  check: [
    { q: 'How does a time-travel database record a change?', options: ['It adds a newer fact in a new layer', 'It overwrites the old value', 'It deletes the row'], answer: 0, why: 'Nothing is erased.', hint: 'Try Overwrite facts in place.' },
    { q: 'What does structural sharing save?', options: ['Copying unchanged facts into every layer', 'Query time only', 'Nothing'], answer: 0, why: 'Storage grows with changes.', hint: 'Try Copy the whole database each time.' },
    { q: 'What is an attribute-value index for?', options: ['Finding entities by a value without reading them all', 'Time travel', 'Sharing layers'], answer: 0, why: 'Jump straight to fabric.', hint: 'Try Find stalls by reading every one.' },
  ],
  terms: [
    ['Fact', 'An entity, an attribute and a value, recorded at a moment.'],
    ['Layer', 'The database as it stood after one transaction.'],
    ['As-of query', 'A question answered from the layer current at a given time.'],
    ['Structural sharing', 'New versions storing only changes and pointing back for the rest.'],
    ['Index', 'The same facts sorted another way, to answer a kind of query fast.'],
    ['Immutable', 'Never changed after it is written.'],
  ],
  deeper: '<p><b>Evolution.</b> Walking back through the layers lists every value an attribute has had, such as each trader who held a stall.</p><p><b>Forgetting.</b> Laws that require deleting personal data are hard for an append-only store; systems add a special excision step.</p><p><b>About this machine.</b> The market, stalls and traders are invented for illustration.</p>',
  code: {
    title: 'Layers and as-of queries',
    note: 'Our own short version, after the CircleDB chapter.',
    text: `
class Database:
    def __init__(self):
        self.layers = [{}]                       # layer 0 is empty

    def transact(self, facts):
        changed = {}
        for entity, attr, value in facts:
            changed[(entity, attr)] = value
        self.layers.append({"changed": changed, "prev": len(self.layers) - 1})

    def value(self, entity, attr, as_of=None):
        t = len(self.layers) - 1 if as_of is None else as_of
        while t > 0:                             # walk back through shared layers
            layer = self.layers[t]
            if (entity, attr) in layer["changed"]:
                return layer["changed"][(entity, attr)]
            t = layer["prev"]
        return None
`,
  },
};
