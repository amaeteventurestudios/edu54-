// Relation extraction: a model reads four sentences about an invented solar company in Nakuru and emits triples (subject, relation, object), one of them unsupported.
// Coreference ("She", "the firm"), canonicalisation ("Kamau" is Wanjiru Kamau; "leads" means chief executive of) and span verification run live, and the
// knowledge graph is rebuilt from what survives. A two-step question is answered by walking the graph. The model's raw triples are scripted.
// Break it: no verification (a headquarters in Nairobi the text never states enters the graph), no coreference ("She" becomes a person of her own),
// no canonicalisation ("Kamau" and "Wanjiru Kamau" become two people).
const TEXT = 'Wanjiru Kamau founded Savanna Solar in Nakuru in 2019. She was born in Nyeri. Savanna Solar supplies panels to clinics such as Ol Kalou Health Centre. Kamau leads the firm as chief executive.';
const RAW = [
  { s: 'Wanjiru Kamau', r: 'founded', o: 'Savanna Solar' },
  { s: 'Savanna Solar', r: 'located in', o: 'Nakuru', ev: 'Savanna Solar in Nakuru' },
  { s: 'She', r: 'was born in', o: 'Nyeri' },
  { s: 'Savanna Solar', r: 'supplies panels to', o: 'Ol Kalou Health Centre' },
  { s: 'Kamau', r: 'leads', o: 'the firm' },
  { s: 'Savanna Solar', r: 'headquartered in', o: 'Nairobi' },
];
const COREF = { She: 'Wanjiru Kamau', 'the firm': 'Savanna Solar' };
const CANON_E = { Kamau: 'Wanjiru Kamau' };
const CANON_R = { founded: 'founded', 'located in': 'located in', 'was born in': 'born in', 'supplies panels to': 'supplies', leads: 'chief executive of', 'headquartered in': 'headquartered in' };
const POS = { 'Wanjiru Kamau': [0.85, 1.6], 'Savanna Solar': [2.05, 1.25], Nakuru: [3.05, 1.4], Nyeri: [0.75, 0.8], 'Ol Kalou Health Centre': [2.85, 0.8], Nairobi: [1.95, 0.72], She: [0.35, 1.2], Kamau: [1.4, 1.0], 'the firm': [2.6, 1.8] };
function process(st) {
  return RAW.map(t => {
    const verified = TEXT.includes(t.s) && TEXT.includes(t.o) && (t.ev ? TEXT.includes(t.ev) : TEXT.includes(t.r.split(' ')[0]));
    let s = t.s, o = t.o, r = t.r;
    if (st.coref) { s = COREF[s] || s; o = COREF[o] || o; }
    if (st.canon) { s = CANON_E[s] || s; o = CANON_E[o] || o; r = CANON_R[r]; }
    return { ...t, s2: s, o2: o, r2: r, verified, kept: !st.verify || verified };
  });
}
function ask(tr) {   // who founded Savanna Solar, and where was that person born?
  const f = tr.find(t => t.kept && t.r2 === 'founded' && t.o2 === 'Savanna Solar');
  if (!f) return null; const b = tr.find(t => t.kept && t.r2 === 'born in' && t.s2 === f.s2);
  return { who: f.s2, where: b ? b.o2 : null };
}

export default {
  slug: 'relation-extraction-kg',
  title: 'Relations: from text to a graph',
  description: 'A model reads four sentences about an invented solar company in Nakuru and writes a graph. Check every edge against the text, or it invents a place.',
  overview: 'Relation extraction turns text into triples of subject, relation and object, which become the edges of a knowledge graph. Patterns are precise but brittle; trained classifiers pick a relation for each pair of entities; language models extract triples out of the box but will sometimes write plausible facts the text never states. Verification anchors every triple element to a span of the source and rejects what cannot be found. Two earlier steps matter as much: coreference, so that "she" and "the firm" become the people and companies they mean, and canonicalisation, so that "Kamau" and "Wanjiru Kamau" are one node and "leads ... as chief executive" becomes one standard relation. Without them the graph splits into fragments and questions that need two hops cannot be answered.',
  keywords: ['relation extraction', 'knowledge graph', 'triples', 'open information extraction', 'canonicalisation', 'hallucination'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.1], dir: [0.05, 1.0, 1.1], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { verify: true, coref: true, canon: true };
    /* the graph on the floor: each node a ball on a pin, each edge a rod */
    const GX = p => -2.1 + p[0] * 1.3, GZ = p => 0.55 - (p[1] - 0.4) * 1.1;
    const nodes = {}; Object.keys(POS).forEach(n => { const x = GX(POS[n]), z = GZ(POS[n]);
      const pin = P.cyl(0.03, 0.16, '#8A8578'); pin.position.set(x, 0, z); S.add(pin);
      const mm = new THREE.MeshLambertMaterial({ color: '#3B3F8F' }), ball = P.ball(0.1, '#fff', { material: mm }); ball.position.set(x, 0.2, z); S.add(ball);
      nodes[n] = { ball, pin, mm, x, z }; });
    const edges = RAW.map(() => { const mm = new THREE.MeshLambertMaterial({ color: C.teal }), rod = P.rod(V(0, 0.2, 0), V(0.1, 0.2, 0), 0.016, C.teal, { material: mm }); rod.userData.noFit = true; S.add(rod); return { rod, mm }; });
    /* every extracted triple as a lamp, and the two-hop question answered or not */
    const lines = RAW.map((_, k) => { const l = P.lamp('#9A9AA6', { h: 0.1, r: 0.075 }); l.position.set(-2.4 + k * 0.3, 0, 1.0); S.add(l); return l; });
    const qa = P.lamp(C.green, { h: 0.24, r: 0.11 }); qa.position.set(2.3, 0, 1.0); S.add(qa);
    S.add(P.keep(-2.6, 2.5, 0.6, -0.9, 1.2));

    let TR = [], A = null;
    function draw() {
      TR = process(st); A = ask(TR);
      lines.forEach((l, k) => { const x = TR[k]; l.userData.set({ color: !x.kept ? '#9A9AA6' : x.verified ? C.green : C.red, on: true }); });
      const used = new Set(); TR.forEach(t => { if (t.kept) { used.add(t.s2); used.add(t.o2); } });
      Object.entries(nodes).forEach(([n, N]) => { const on = used.has(n); N.ball.visible = on; N.pin.visible = on;
        N.mm.color.set(n === 'Nairobi' ? '#D64545' : ['She', 'Kamau', 'the firm'].includes(n) ? '#C9A227' : '#3B3F8F'); });
      edges.forEach((E, k) => { const t = TR[k], on = t.kept && nodes[t.s2] && nodes[t.o2]; E.rod.visible = !!on; if (!on) return;
        P.setRod(E.rod, V(nodes[t.s2].x, 0.2, nodes[t.s2].z), V(nodes[t.o2].x, 0.2, nodes[t.o2].z));
        E.mm.color.set(t.verified ? C.teal : '#D64545'); });
      qa.userData.set({ color: A && A.where ? C.green : C.red, on: true });
    }
    draw();
    const nodesUsed = () => { const u = new Set(); TR.forEach(t => { if (t.kept) { u.add(t.s2); u.add(t.o2); } }); return u.size; };
    const unsupported = () => TR.filter(t => t.kept && !t.verified).length;
    const controls = [
      { type: 'toggle', label: 'Check every triple against the text', short: 'verify', get: () => st.verify, set: v => { st.verify = v; draw(); } },
      { type: 'toggle', label: 'Resolve "she" and "the firm"', short: 'coreference', get: () => st.coref, set: v => { st.coref = v; draw(); } },
      { type: 'toggle', label: 'Merge names and relations', short: 'canonical', get: () => st.canon, set: v => { st.canon = v; draw(); } },
    ];
    const readouts = [
      { label: 'Question', get: () => ({ v: A && A.where ? 'answered' : 'no answer', good: !!(A && A.where), bad: !(A && A.where) }) },
      { label: 'Nodes', get: () => ({ v: String(nodesUsed()), sub: '5 real things' , bad: nodesUsed() > 5 }) },
      { label: 'Unsupported edges', get: () => ({ v: String(unsupported()), bad: unsupported() > 0, good: unsupported() === 0 }) },
    ];
    const labels = [
      { name: 'triples', t: 'Triples', d: 'Red lamp: not in the text', icon: 'check', atV: V(-2.5, 0.15, 1.0) },
      { name: 'graph', t: 'Knowledge graph', d: 'Gold: unresolved. Red: invented', icon: 'link', atV: V(2.42, 0.3, 1.0) },
    ];
    const reset = () => { Object.assign(st, { verify: true, coref: true, canon: true }); draw(); };
    const breaks = [
      { label: 'No verification', hint: 'Trust every triple', on: () => { reset(); st.verify = false; draw(); }, off: reset },
      { label: 'No coreference', hint: '"She" stays "she"', on: () => { reset(); st.coref = false; draw(); }, off: reset },
      { label: 'No merging', hint: 'Kamau and Wanjiru Kamau', on: () => { reset(); st.canon = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.verify) return { ok: false, msg: `<b>A fact the text never states.</b> The model also wrote (Savanna Solar, headquartered in, Nairobi). It sounds plausible, but "Nairobi" appears nowhere in the four sentences. Without checking each triple against a span of the source, it becomes a red edge in the graph, and anyone querying it gets a made-up answer.` };
      if (!st.coref) return { ok: false, msg: `<b>"She" is now a person of her own.</b> Without coreference, (She, born in, Nyeri) and (Kamau, chief executive of, the firm) attach to nodes called "She" and "the firm". The founder's birthplace is in the graph but not connected to her, so the question gets ${A && !A.where ? 'only half an answer' : 'no answer'}. Run coreference before extraction.` };
      if (!st.canon) return { ok: false, msg: `<b>Two Kamaus, and relations nobody can query.</b> Without merging, "Kamau" and "Wanjiru Kamau" are separate nodes, and the relations stay as written ("was born in", "supplies panels to", "leads"). The graph has ${nodesUsed()} nodes for 5 real things, and a query for "born in" finds nothing. Map names and relations to one standard form.` };
      return { ok: true, msg: `<b>${A.who}, born in ${A.where}.</b> Two hops: (${A.who}, founded, Savanna Solar), then (${A.who}, born in, ${A.where}). Every kept triple is anchored in the text, "she" and "the firm" are resolved, and names and relations are merged: ${nodesUsed()} nodes for 5 real things.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Text to triples', home: true, say: 'Four sentences about a solar company in Nakuru. A model turns them into triples: subject, relation, object.', act: m => m.set({ verify: true, coref: true, canon: true }) },
    { t: 'A graph', home: true, say: 'Each triple is an edge. Now a question with two hops can be answered: who founded the company, and where were they born?', act: m => m.set({}) },
    { t: 'Check the text', home: true, say: 'The model also wrote that the company is headquartered in Nairobi. The text never says so. Skip the check, and it enters the graph.', act: m => m.set({ verify: false }) },
    { t: 'Who is she?', home: true, say: 'Without coreference, "she was born in Nyeri" makes a node called She. The founder\'s birthplace is lost.', act: m => m.set({ verify: true, coref: false }) },
    { t: 'One name, one node', home: true, say: 'Without merging, Kamau and Wanjiru Kamau are two people, and "was born in" cannot be found by a query for "born in".', act: m => m.set({ coref: true, canon: false }) },
    { t: 'All together', home: true, say: 'Verify, resolve, merge. Five real things, five nodes, and the question is answered.', act: m => m.set({ canon: true }) },
  ],
  check: [
    { q: 'What is a triple in relation extraction?', options: ['Subject, relation, object', 'Three sentences', 'Three entities with no relation'], answer: 0, why: 'Each triple becomes an edge in the graph.' },
    { q: 'Why check each extracted triple against the source text?', options: ['Models can write plausible facts the text never states', 'To make extraction faster', 'Triples are always wrong'], answer: 0, why: 'Anchor every element to a span.' },
    { q: 'Why run coreference before relation extraction?', options: ['So "she" attaches to the person she means', 'To shorten the text', 'It replaces extraction'], answer: 0, why: 'Otherwise facts attach to pronouns.' },
  ],
  terms: [
    ['Triple', 'Subject, relation and object: one fact.'],
    ['Knowledge graph', 'Entities as nodes, relations as edges.'],
    ['Open extraction', 'Any phrase can be a relation; messy to query.'],
    ['Closed ontology', 'A fixed list of relation types.'],
    ['Canonicalisation', 'Mapping names and relations to one standard form.'],
    ['Verification', 'Checking each triple against spans of the source.'],
  ],
  deeper: '<p><b>Time matters.</b> "Kamau leads the firm" is true now and may not be next year. Real graphs attach start and end dates to relations like chief executive of.</p><p><b>Linking first.</b> Entity linking connects "Nakuru" to the town in a public knowledge base, so graphs built from different sources can be merged.</p><p><b>About this machine.</b> The model\'s raw triples are scripted, including the unsupported one. Verification, coreference, merging, the graph and the two-hop question are computed live.</p>',
  code: {
    title: 'Verify, resolve, merge',
    note: 'Adapted from the course\'s relation extraction lesson.',
    text: `
def build_graph(text, triples, coref, canon_entity, canon_relation):
    graph = []
    for s, r, o in triples:
        if s not in text or o not in text:        # not anchored in the source
            continue
        s, o = coref.get(s, s), coref.get(o, o)   # "she" -> the person
        s, o = canon_entity.get(s, s), canon_entity.get(o, o)
        r = canon_relation.get(r, r)              # "was born in" -> "born in"
        graph.append((s, r, o))
    return graph

def founder_birthplace(graph, company):
    founder = next(s for s, r, o in graph if r == "founded" and o == company)
    return next(o for s, r, o in graph if s == founder and r == "born in")
`,
  },
};
