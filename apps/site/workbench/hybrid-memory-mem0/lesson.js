// Hybrid memory (Mem0): an Ibadan savings group's assistant stores what members say in three stores at once: vectors (hashed bag-of-stems, cosine),
// key-value facts keyed by (member, type), and a graph of typed edges. Three questions need three different stores. Retrieval fuses the hits:
// score = w_rel · relevance + w_imp · importance + w_rec · recency (recency = 0.8^(days ago)). A conflict detector marks the older of two facts with
// the same key invalid instead of deleting it. Each record has a scope (the member it belongs to); searching across scopes leaks one member's note to another.
const DIM = 48;
const stem = w => w.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5);
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function embed(t) { const v = new Array(DIM).fill(0); t.split(/\s+/).map(stem).filter(w => w.length > 2).forEach(w => { v[hash(w) % DIM] += 1; }); const n = Math.hypot(...v) || 1; return v.map(x => x / n); }
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const REC = [
  { id: 1, day: 2, scope: 'group', text: 'We agreed a small late fee when a member misses two weeks of payments.', imp: 0.8 },
  { id: 2, day: 3, scope: 'Kemi', text: 'Kemi pays her contribution every Friday.', kv: ['Kemi', 'pay_day', 'Friday'], imp: 0.6 },
  { id: 3, day: 4, scope: 'Ada', text: 'Ada named Musa as her guarantor.', edge: ['Ada', 'guarantor', 'Musa'], imp: 0.7 },
  { id: 4, day: 5, scope: 'Tunde', text: 'Tunde named Musa as his guarantor.', edge: ['Tunde', 'guarantor', 'Musa'], imp: 0.7 },
  { id: 5, day: 6, scope: 'Bola', text: 'Bola is behind on payments and asked us to keep it private.', imp: 0.9 },
  { id: 6, day: 8, scope: 'Kemi', text: 'From now on Kemi pays her contribution on Saturday.', kv: ['Kemi', 'pay_day', 'Saturday'], imp: 0.6 },
  { id: 7, day: 9, scope: 'group', text: 'Next meeting is at the community hall after Jumat prayers.', imp: 0.3 },
  { id: 8, day: 1, scope: 'Ngozi', text: 'Ngozi named Musa as her guarantor.', edge: ['Ngozi', 'guarantor', 'Musa'], imp: 0.7 },
  { id: 9, day: 6, scope: 'Femi', text: 'Femi named Kunle as his guarantor.', edge: ['Femi', 'guarantor', 'Kunle'], imp: 0.7 },
  { id: 10, day: 7, scope: 'Bisi', text: 'Bisi named Kunle as her guarantor, with Femi as witness.', edge: ['Bisi', 'guarantor', 'Kunle'], imp: 0.7 },
];
REC.forEach(r => { r.v = embed(r.text); });
const TODAY = 10;
const QS = [
  { who: 'Kemi', q: 'What did we agree about late payments?', kind: 'semantic', want: [1] },
  { who: 'Kemi', q: 'Which day does Kemi pay her contribution?', kind: 'fact', key: ['Kemi', 'pay_day'], want: [6] },
  { who: 'Ada', q: 'Who else shares a guarantor with Ada?', kind: 'relation', node: 'Ada', want: [4, 8] },
];
function search(qi, o) {
  const Q = QS[qi], qv = embed(Q.q);
  let pool = REC.filter(r => o.allScopes || r.scope === 'group' || r.scope === Q.who || (Q.kind === 'relation' && r.edge));
  const valid = r => { if (!o.kv || !o.conflicts || !r.kv) return true; return !REC.some(x => x.kv && x.kv[0] === r.kv[0] && x.kv[1] === r.kv[1] && x.day > r.day); };
  const hits = new Map(), add = (r, rel, src) => { const h = hits.get(r.id) || { r, rel: 0, src: [] }; h.rel = Math.max(h.rel, rel); h.src.push(src); hits.set(r.id, h); };
  if (o.vec) pool.map(r => [r, cos(qv, r.v)]).filter(([, c]) => c > 0.15).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([r, c]) => add(r, c, 'vector'));
  if (o.kv && Q.key) pool.filter(r => r.kv && r.kv[0] === Q.key[0] && r.kv[1] === Q.key[1] && valid(r)).forEach(r => add(r, 1, 'kv'));
  if (o.graph && Q.node) { const g = (REC.find(r => r.edge && r.edge[0] === Q.node) || {}).edge; if (g) pool.filter(r => r.edge && r.edge[2] === g[2] && r.edge[0] !== Q.node).forEach(r => add(r, 1, 'graph')); }
  const out = [...hits.values()].map(h => ({ ...h, valid: valid(h.r), rec: Math.pow(0.8, TODAY - h.r.day), score: 0 }));
  out.forEach(h => { h.score = o.wRel * h.rel + o.wImp * h.r.imp + o.wRec * h.rec - (h.valid ? 0 : 1); });
  out.sort((a, b) => b.score - a.score);
  return out;
}
function answer(qi, hits) {
  const Q = QS[qi], top = hits[0];
  if (!top) return 'I have nothing on that.';
  if (Q.kind === 'semantic') return top.r.id === 1 ? 'A small late fee after two missed weeks.' : `"${top.r.text}"`;
  if (Q.kind === 'fact') { const kv = hits.find(h => h.r.kv) || (top.r.kv ? top : null); const day = kv ? kv.r.kv[2] : (top.r.text.match(/(Friday|Saturday)/) || [])[1]; return day ? `Kemi pays on ${day}.` : `"${top.r.text}"`; }
  const pairs = hits.map(h => (h.r.text.match(/^(\w+) named (\w+)/) || []).slice(1)).filter(p => p.length);
  const g = (pairs.find(p => p[0] === Q.node) || [])[1] || (hits.some(h => h.src.includes('graph')) ? 'Musa' : null);
  const names = pairs.filter(p => p[1] === g && p[0] !== Q.node).map(p => p[0]);
  return names.length ? `${names.join(' and ')} also ${names.length > 1 ? 'have' : 'has'} ${g} as guarantor.` : 'I can\'t tell from what I found.';
}

export default {
  slug: 'hybrid-memory-mem0',
  title: 'Hybrid memory: three stores, one search',
  description: 'An Ibadan savings group\'s assistant keeps memory in three stores: meaning, facts by key, and relationships. Each question needs the right one.',
  overview: 'No single store answers every question an agent gets. A vector store finds records with similar meaning ("what did we agree about late payments?") but is a poor way to look up an exact, changing fact and can\'t follow relationships. A key-value store answers "which day does Kemi pay?" in one lookup, keyed by member and fact type. A graph store answers "who shares a guarantor with Ada?" by following typed edges: Ada to Musa, then back to everyone else Musa guarantees. Mem0 writes each new fact to all three and, on search, fuses what comes back with a weighted score of relevance, importance and recency; the weights are a product choice, recency higher for chat, importance higher for compliance. When a new fact contradicts an old one with the same key, a conflict detector marks the old one invalid instead of deleting it, so "what day did she pay in March?" stays answerable. Memory also has scopes: one member\'s notes, a session, the agent itself. Searching across scopes without thought is how one member\'s private note reaches another. Watch for embeddings that drift as the store grows, key types that multiply, and noisy extractors that flood the graph.',
  keywords: ['Mem0', 'hybrid memory', 'vector store', 'knowledge graph', 'key-value store', 'agent memory', 'retrieval fusion'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.3, 0.95, 1.25], half: 1.25, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { q: 1, vec: true, kv: true, graph: true, conflicts: true, allScopes: false, wRel: 1, wImp: 0.3, wRec: 0.5 }, st = { ...D0 };
    const CHAR = '#2C2D31', GOLD = '#E3A72F', GOOD = '#1F9E89', RED = '#D9483B', BLUE = '#5B8DB8', OFF = '#D8D1C2', GREY = '#B9B3A5';
    const SRC = { vector: GOLD, kv: BLUE, graph: GOOD };
    const leak = (h, Q) => h.r.scope !== 'group' && h.r.scope !== Q.who && !h.r.edge;
    /* vector store: every note is a ball placed by its meaning (a fixed 2-D projection of its embedding); the gold ball is the question */
    const VX = -2.05, SZ = -0.35;
    const pad = P.box(1.7, 0.08, 1.25, '#3A3D4A', { r: 0.05 }); pad.position.set(VX, 0, SZ); S.add(pad);
    const proj = [0, 1].map(k => Array.from({ length: DIM }, (_, i) => Math.sin(i * 12.9898 + k * 78.233) * 43758.5453 % 1));
    const p2 = v => [proj[0].reduce((s, x, i) => s + x * v[i], 0), proj[1].reduce((s, x, i) => s + x * v[i], 0)];
    const pts = REC.map(r => p2(r.v)), xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
    const nx = x => VX - 0.65 + 1.3 * (x - Math.min(...xs)) / (Math.max(...xs) - Math.min(...xs) || 1), nz = z => SZ - 0.45 + 0.9 * (z - Math.min(...zs)) / (Math.max(...zs) - Math.min(...zs) || 1);
    const dots = REC.map((r, i) => { const mm = new THREE.MeshLambertMaterial({ color: GREY }), b = P.ball(0.09, '#fff', { material: mm }); b.position.set(nx(pts[i][0]), 0.17, nz(pts[i][1])); S.add(b); return { b, mm }; });
    const qdot = P.ball(0.11, '#fff', { material: new THREE.MeshLambertMaterial({ color: GOLD, emissive: '#7A5200' }) }); S.add(qdot);
    /* key-value store: a cabinet with one drawer per (member, key) fact; an invalid fact's drawer goes grey; the drawer it reads slides out */
    const KX = 0, cab = P.box(0.95, 0.85, 0.6, '#A87A4F', { r: 0.04 }); cab.position.set(KX, 0, SZ); S.add(cab);
    const KVR = REC.filter(r => r.kv);
    const drawers = KVR.map((r, i) => { const m = new THREE.MeshLambertMaterial({ color: '#F4F1EA' }), d = P.box(0.8, 0.3, 0.5, '#fff', { r: 0.03, material: m }); d.position.set(KX, 0.08 + i * 0.38, SZ + 0.08); S.add(d); const k = P.box(0.16, 0.05, 0.05, '#6B6E7E', { r: 0.01 }); d.add(k); k.position.set(0, 0.13, 0.26); return { r, d, m }; });
    /* graph store: a node per person, arrows from member to guarantor */
    const GX = 2.05, NODES = { Ada: [-0.6, -0.45], Tunde: [-0.6, 0], Ngozi: [-0.6, 0.45], Musa: [0.0, 0], Femi: [0.6, -0.45], Bisi: [0.6, 0.45], Kunle: [0.6, 0] };
    const gpad = P.box(1.7, 0.08, 1.25, '#3A3D4A', { r: 0.05 }); gpad.position.set(GX, 0, SZ); S.add(gpad);
    const gn = Object.fromEntries(Object.entries(NODES).map(([n, [x, z]]) => { const mm = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.cyl(0.13, 0.16, '#fff', { material: mm }); b.position.set(GX + x, 0.08, SZ + z); S.add(b); return [n, { b, mm }]; }));
    const edges = REC.filter(r => r.edge).map(r => { const [a, , b] = r.edge, A = NODES[a], B = NODES[b], dir = V(B[0] - A[0], 0, B[1] - A[1]).normalize(), g = P.arrow(V(GX + A[0], 0.2, SZ + A[1]).addScaledVector(dir, 0.16), V(GX + B[0], 0.2, SZ + B[1]).addScaledVector(dir, -0.17), 0.022, '#C9C4B6'); S.add(g); return { r, g }; });
    /* fusion: the top three hits as towers, as tall as their fused score, coloured by the store that found them (red: invalid or another member's note) */
    const FZ = 0.85, FX = i => -0.45 + i * 0.45;
    const tw = [0, 1, 2].map(i => { const t = P.tower(0.34, 0.34, GOLD, { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(FX(i), 0, FZ); S.add(t); return t; });
    const pipes = [[VX, 'vector'], [KX, 'kv'], [GX, 'graph']].map(([x, k]) => { const p = P.pipe([V(x, 0.12, SZ + 0.65), V(x * 0.6, 0.12, FZ - 0.2), V(x * 0.15, 0.12, FZ - 0.25)], SRC[k], { r: 0.03, n: 4 }); S.add(p); return { p, k }; });
    const bot = P.robot(CHAR, { scale: 0.8 }); bot.position.set(-1.45, 0, FZ); S.add(bot);
    const lp = P.lamp(GOOD, { h: 0.45, r: 0.11 }); lp.position.set(1.0, 0, FZ); S.add(lp);
    S.add(P.keep(-2.95, 2.95, 1.3, -1.05, 1.25));

    let H = null, A = '';
    function draw() {
      const Q = QS[st.q]; H = search(st.q, st); A = answer(st.q, H);
      const qp = p2(embed(Q.q)); qdot.position.set(Math.max(VX - 0.75, Math.min(VX + 0.75, nx(qp[0]))), 0.2, Math.max(SZ - 0.55, Math.min(SZ + 0.55, nz(qp[1])))); qdot.visible = st.vec;
      dots.forEach((d, i) => { const h = H.find(x => x.r.id === REC[i].id && x.src.includes('vector')); d.mm.color.set(!st.vec ? OFF : h ? (leak(h, Q) ? RED : GOLD) : GREY); d.b.position.y = h ? 0.27 : 0.17; });
        drawers.forEach(k => { const valid = !st.conflicts || !REC.some(x => x.kv && x.kv[1] === k.r.kv[1] && x.day > k.r.day), hit = H.some(h => h.r.id === k.r.id && h.src.includes('kv')); k.m.color.set(!st.kv ? OFF : hit ? BLUE : valid ? '#F4F1EA' : '#8E8C84'); k.d.position.z = SZ + 0.08 + (hit ? 0.35 : 0); });
      Object.entries(gn).forEach(([n, g]) => g.mm.color.set(!st.graph ? OFF : st.q === 2 ? (n === 'Ada' || n === 'Musa' ? GOLD : H.some(h => h.src.includes('graph') && h.r.edge[0] === n) ? GOOD : BLUE) : BLUE));
      edges.forEach(e => { e.g.visible = st.graph; });
      const mx = Math.max(1.5, ...H.slice(0, 3).map(h => h.score));
      tw.forEach((t, i) => { const h = H[i]; t.visible = !!h; if (!h) return; t.userData.set({ h: Math.max(0.05, h.score / mx * 0.9), color: !h.valid || leak(h, Q) ? RED : SRC[h.src[0]] }); });
      pipes.forEach(p => p.p.userData.set({ on: H.slice(0, 3).some(h => h.src.includes(p.k)), color: SRC[p.k] }));
      lp.userData.set({ color: good(st.q) ? GOOD : RED, on: true });
    }
    const good = qi => { const h = search(qi, st), Q = QS[qi]; return Q.want.every(id => h.slice(0, Q.want.length).some(x => x.r.id === id)) && !h.slice(0, 3).some(x => leak(x, Q)); };
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Question', options: ['Late payments?', 'Kemi\'s pay day?', 'Same guarantor as Ada?'], get: () => st.q, act: i => set({ q: i }) },
      { type: 'toggle', label: 'Vector store', short: 'Vector', get: () => st.vec, set: v => set({ vec: !!v }) },
      { type: 'toggle', label: 'Key-value store', short: 'KV', get: () => st.kv, set: v => set({ kv: !!v }) },
      { type: 'toggle', label: 'Graph store', short: 'Graph', get: () => st.graph, set: v => set({ graph: !!v }) },
      { type: 'slider', label: 'Recency weight', min: 0, max: 2, step: 0.1, get: () => st.wRec, set: v => set({ wRec: Math.round(v * 10) / 10 }), fmt: v => (Math.round(v * 10) / 10).toFixed(1) },
    ];
    const readouts = [
      { label: 'This answer', get: () => ({ v: good(st.q) ? 'right' : 'wrong', sub: QS[st.q].kind, good: good(st.q), bad: !good(st.q) }) },
      { label: 'All three', get: () => { const n = [0, 1, 2].filter(good).length; return { v: `${n} of 3`, sub: 'questions answered', good: n === 3, bad: n < 3 }; } },
      { label: 'Top hit', get: () => ({ v: H[0] ? `#${H[0].r.id}` : '–', sub: H[0] ? H[0].src.join(' + ') : 'nothing' }) },
    ];
    const labels = [
      { name: 'vec', t: 'Vector store', d: 'A ball per note, placed by meaning. Gold ball: the question; gold notes: the closest. Red: another member\'s private note', icon: 'target', atV: V(VX - 0.85, 0.3, SZ) },
      { name: 'kv', t: 'Key-value store', d: 'A drawer per fact: Kemi\'s pay day, Friday then Saturday. Grey: marked invalid. The one read slides out', icon: 'box', atV: V(KX - 0.48, 0.3, SZ) },
      { name: 'graph', t: 'Graph store', d: 'A disc per person, arrows to each guarantor. Gold: Ada and Musa; green: the others Musa guarantees', icon: 'link', atV: V(GX + 0.85, 0.3, SZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Use only the vector store', hint: 'one store for everything', on: () => set({ ...D0, kv: false, graph: false }), off: reset },
      { label: 'Keep contradicted facts valid', hint: 'no conflict detector', on: () => set({ ...D0, conflicts: false, wRec: 0 }), off: reset },
      { label: 'Search every member\'s notes', hint: 'no scopes', on: () => set({ ...D0, q: 0, allScopes: true }), off: reset },
    ];
    function status() {
      const n = [0, 1, 2].filter(good).length;
      if (!st.kv && !st.graph) return { ok: false, msg: `<b>With only vectors, ${n} of 3 questions come out right.</b> Similar meaning finds the late-fee agreement. "Which day does Kemi pay?" matches the old Friday note slightly better than the new Saturday one, and only the recency weight saves it (set it to 0 and the answer flips). And "who shares a guarantor with Ada?" needs two hops along edges, not similarity. Use a key-value store for facts and a graph for relationships.` };
      if (!st.conflicts && !good(1)) return { ok: false, msg: '<b>Both pay-day facts stay valid, and the older Friday one wins the tie.</b> A conflict detector marks the older fact with the same key invalid when the new one arrives, without deleting it, so the history is still there for "what day did she pay before?".' };
      if (st.allScopes && !good(0)) return { ok: false, msg: '<b>Searching every member\'s notes, Kemi\'s question about late payments pulls up Bola\'s private note.</b> Each record belongs to a scope (a member, a session, the group). Search the asker\'s scope and the shared group scope, not everyone\'s.' };
      const fq = [0, 1, 2].find(q => !good(q));
      if (st.wRec >= 1.2 && fq !== undefined) { const t = search(fq, st)[0]; return { ok: false, msg: `<b>With recency weighted ${st.wRec}, "${QS[fq].q}" ranks the newest note first instead of the right one: "${t ? t.r.text : ''}"</b> Recency is one term in the fusion score, not the whole of it. Chat agents weight it more, retrieval agents less; tune it per product.` }; }
      if (n < 3) return { ok: false, msg: `<b>${n} of 3 questions answered.</b> ${!st.vec ? 'Without vectors, the late-fee question finds nothing. ' : ''}${!st.kv ? 'Without the key-value store, the pay-day fact is a guess. ' : ''}${!st.graph ? 'Without the graph, nobody follows the guarantor edges. ' : ''}` };
      return { ok: true, msg: `<b>All three questions answered from the store that fits each: ${A}</b> Results were fused by ${st.wRel} × relevance + ${st.wImp} × importance + ${st.wRec} × recency. The old Friday fact is still stored, marked invalid since day 8.` };
    }
    return { update: dt => { tw.forEach(t => t.userData.tick(dt)); pipes.forEach(p => p.p.userData.tick(dt)); bot.userData.tick(dt); bot.userData.set({ busy: true }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three kinds of question', home: true, say: 'A savings group in Ibadan asks its assistant three kinds of question: about meaning, about a fact, and about relationships.', act: m => m.set({ q: 0, vec: true, kv: true, graph: true, conflicts: true, allScopes: false, wRel: 1, wImp: 0.3, wRec: 0.5 }) },
    { t: 'Similar meaning', home: true, say: 'What did we agree about late payments? The vector store finds the note with the closest meaning.', act: m => m.set({ q: 0 }) },
    { t: 'A fact that changed', home: true, say: 'Which day does Kemi pay? The key-value store has the answer, and the conflict detector marked the old Friday fact invalid when she switched to Saturday.', act: m => m.set({ q: 1 }) },
    { t: 'Follow the edges', home: true, say: 'Who else shares a guarantor with Ada? The graph follows Ada to Musa, then back to everyone Musa guarantees.', act: m => m.set({ q: 2 }) },
    { t: 'One store is not enough', home: true, say: 'With only the vector store, the fact and the relationship questions come out wrong.', act: m => m.set({ q: 1, kv: false, graph: false }) },
    { t: 'Whose memory?', home: true, say: 'Search every member\'s notes, and Kemi\'s question pulls up Bola\'s private one. Keep each record in its scope.', act: m => m.set({ q: 0, kv: true, graph: true, allScopes: true }) },
  ],
  check: [
    { q: '"Who else shares a guarantor with Ada?" Which store answers it?', options: ['The graph store', 'The vector store', 'None'], answer: 0, why: 'Relationships are typed edges.', hint: 'Pick Same guarantor as Ada?' },
    { q: 'Kemi changed her pay day. What should happen to the old fact?', options: ['Marked invalid, kept for history', 'Deleted', 'Left valid'], answer: 0, why: 'A conflict detector keeps the timeline.', hint: 'Try Keep contradicted facts valid.' },
    { q: 'Why scope memory by member?', options: ['So one member\'s private notes don\'t reach another', 'To save space', 'To speed up vectors'], answer: 0, why: 'Search the asker\'s scope and the shared one.', hint: 'Try Search every member\'s notes.' },
  ],
  terms: [
    ['Vector store', 'Finds records with similar meaning.'],
    ['Key-value store', 'Looks up a fact by an exact key.'],
    ['Graph store', 'Stores typed relationships between entities.'],
    ['Fusion score', 'A weighted mix of relevance, importance and recency.'],
    ['Conflict detector', 'Marks an older fact invalid when a newer one contradicts it.'],
    ['Scope', 'Whose memory a record belongs to.'],
  ],
  deeper: '<p><b>Reported results.</b> The Mem0 paper reports gains of ten points or more over a full-context model, a flat vector store and a flat key-value store on long-conversation memory benchmarks.</p><p><b>Upkeep.</b> Re-embed heavily used records as the store grows, audit the set of key types, and cap how many edges one message may add.</p><p><b>About this machine.</b> Embeddings are hashed bags of word stems in 48 dimensions; the vector, key-value and graph lookups, the conflict check, scopes and the fused score are computed live.</p>',
  code: {
    title: 'Write to three stores, fuse on search',
    note: 'Adapted from the course\'s hybrid-memory lesson.',
    text: `
def add(mem, fact, scope, day, importance):
    mem.vectors.add(embed(fact.text), fact, scope)
    if fact.key:                                   # (member, type) -> value
        for old in mem.kv.get(fact.key):
            old.valid_until = day                  # conflict: invalidate, don't delete
        mem.kv.put(fact.key, fact)
    for a, rel, b in fact.edges:
        mem.graph.add_edge(a, rel, b, fact)

def search(mem, q, scopes, w=(1.0, 0.3, 0.5), today=10):
    hits = mem.vectors.top_k(embed(q.text), scopes) + mem.kv.lookup(q.key) + mem.graph.near(q.entities)
    def score(h):
        return (w[0] * h.relevance + w[1] * h.fact.importance
                + w[2] * 0.8 ** (today - h.fact.day) - (0 if h.fact.valid else 1))
    return sorted(hits, key=score, reverse=True)
`,
  },
};
