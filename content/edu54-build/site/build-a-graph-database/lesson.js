// Build your own graph database: an invented family tree of three generations stored as vertices and "parent of" edges. A query is a pipeline
// of steps, here v(Ama, Kweku).out().out().unique().take(k): find the grandchildren of a couple. A lazy pipeline pulls one result at a time,
// so take(k) stops the traversal early; a unique step removes the duplicates that arise because both grandparents reach each grandchild; an
// index finds the starting vertices by id instead of scanning every vertex. Edge counts are measured by running the pipeline below.
const PEOPLE = ['Ama', 'Kweku', 'Kwame', 'Efua', 'Kofi', 'Kojo', 'Abena', 'Esi', 'Adwoa', 'Nana', 'Mansa'];
const GEN = { Ama: 0, Kweku: 0, Kwame: 1, Efua: 1, Kofi: 1, Kojo: 2, Abena: 2, Esi: 2, Adwoa: 2, Nana: 2, Mansa: 2 };
const EDGES = [['Ama', 'Kwame'], ['Ama', 'Efua'], ['Ama', 'Kofi'], ['Kweku', 'Kwame'], ['Kweku', 'Efua'], ['Kweku', 'Kofi'], ['Kwame', 'Kojo'], ['Kwame', 'Abena'], ['Efua', 'Esi'], ['Efua', 'Adwoa'], ['Efua', 'Nana'], ['Kofi', 'Mansa']];
function run(o) {
  const walked = [];
  const out = function* (src) { for (const v of src) for (const e of EDGES) if (e[0] === v) { walked.push(e); yield e[1]; } };
  const uniq = function* (src) { const seen = new Set(); for (const v of src) { if (seen.has(v)) continue; seen.add(v); yield v; } };
  const lookups = o.index ? 2 : 2 * PEOPLE.length;
  const start = ['Ama', 'Kweku'];
  let results;
  if (o.lazy) {
    let g = out(out(start)); if (o.unique) g = uniq(g);
    results = []; for (const v of g) { results.push(v); if (results.length >= o.k) break; }
  } else {
    const a = [...out(start)], b = [...out(a)];
    const c = o.unique ? [...new Set(b)] : b;
    results = c.slice(0, o.k);
  }
  const dupes = results.length - new Set(results).size;
  return { results, walked, edges: walked.length, lookups, dupes };
}

export default {
  slug: 'build-a-graph-database',
  title: 'Build your own graph database',
  description: 'A family tree lives in a tiny graph database of people and parent-of edges. Ask for a couple\'s grandchildren with a pipeline of hops, and watch it light up.',
  overview: 'A graph database stores things as vertices and the relationships between them as edges, which suits questions about connections: who knows whom, which parts make up a machine, who descends from whom. Dagoba, the database this lesson follows, keeps vertices and edges in memory and answers queries written as a chain of steps, a pipeline: start at some vertices, follow outgoing edges, follow them again, filter by a property, remove duplicates, take the first few. Each step is a small function that receives items from the step before and passes items to the next. The pipeline can run eagerly, finishing each step for every item before the next step starts, or lazily, where the last step asks the one before it for a single item, which asks the one before it, and so on back to the start. Lazy evaluation means a query that only wants the first two results stops traversing as soon as it has them, which matters on a graph with millions of edges. Graphs often contain several paths to the same vertex, here because both grandparents are parents of each child, so a unique step is needed or every grandchild appears twice. Finding the starting vertices quickly needs an index from id to vertex; without one every query begins by scanning the whole vertex list. Graph databases such as Neo4j and query languages such as Gremlin and Cypher work the same way at scale. This machine stores an invented three-generation family from the Ashanti region.',
  keywords: ['build your own graph database', 'graph database', 'lazy evaluation', 'query pipeline', 'graph traversal', 'Gremlin', 'Dagoba'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://aosabook.org/en/500L/dagoba-an-in-memory-graph-database.html" target="_blank" rel="noopener">Dagoba: an in-memory graph database</a> by Dann Toliver, in <a href="https://aosabook.org/en/500L/" target="_blank" rel="noopener">500 Lines or Less</a> (text CC BY 3.0, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short graph pipeline, written for this lesson after Dagoba (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { k: 2, lazy: true, unique: true, index: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const pos = {};
    [0, 1, 2].forEach(g => { const row = PEOPLE.filter(p => GEN[p] === g); row.forEach((p, i) => { pos[p] = [-0.9 + (i - (row.length - 1) / 2) * (g === 2 ? 0.6 : g === 1 ? 1.1 : 0.9), [-0.78, -0.25, 0.3][g]]; }); });
    const edgeM = {}, nodes = {};
    EDGES.forEach(e => { const m = new THREE.MeshLambertMaterial({ color: '#B9B3A6' }); const a = pos[e[0]], b = pos[e[1]]; floor.add(P.tube([V(a[0], 0.15, a[1] + 0.12), V(b[0], 0.15, b[1] - 0.12)], 0.01, '#B9B3A6', { straight: true, material: m })); edgeM[e.join('>')] = m; });
    PEOPLE.forEach(p => {
      const m = new THREE.MeshLambertMaterial({ color: '#fff' }), d = P.cyl(0.19, 0.05, '#fff', { material: m }); d.position.set(pos[p][0], 0.12, pos[p][1]); floor.add(d);
      nodes[p] = { m };
    });

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    let R = null;
    function draw() {
      R = run(st);
      const walked = new Set(R.walked.map(e => e.join('>')));
      EDGES.forEach(e => edgeM[e.join('>')].color.set(walked.has(e.join('>')) ? SAF : '#D6D1C6'));
      PEOPLE.forEach(p => {
        const n = R.results.filter(x => x === p).length, start = p === 'Ama' || p === 'Kweku';
        nodes[p].m.color.set(n ? '#9FD9CB' : start ? '#FBE3B0' : '#E9E2D3');
      });
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.lazy && st.unique && st.index && R.dupes === 0; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Take how many grandchildren', min: 1, max: 10, step: 1, get: () => st.k, set: v => set({ k: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Run the pipeline lazily', short: 'Lazy', get: () => st.lazy, set: v => set({ lazy: !!v }) },
      { type: 'toggle', label: 'Remove duplicates', short: 'Unique', get: () => st.unique, set: v => set({ unique: !!v }) },
      { type: 'toggle', label: 'Index vertices by id', short: 'Index', get: () => st.index, set: v => set({ index: !!v }) },
    ];
    const readouts = [
      { label: 'Edges walked', get: () => ({ v: `${R.edges}`, sub: `for ${st.k} result${st.k > 1 ? 's' : ''}`, good: st.lazy, bad: !st.lazy && st.k < 6 }) },
      { label: 'Duplicates', get: () => ({ v: `${R.dupes}`, sub: 'in the results', good: R.dupes === 0, bad: R.dupes > 0 }) },
      { label: 'Start lookups', get: () => ({ v: `${R.lookups}`, sub: 'vertex reads', good: st.index, bad: !st.index }) },
    ];
    const labels = [
      { name: 'g', t: 'A family graph', d: 'People and parent-of edges', icon: 'link', atV: V(-2.45, 0.15, -0.25) },
      { name: 't', t: 'The query', d: 'A pipeline of steps', icon: 'code', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Run every step in full first', hint: 'eager', on: () => set({ ...D0, lazy: false }), off: reset },
      { label: 'Drop the unique step', hint: 'grandchildren twice', on: () => set({ ...D0, unique: false, k: 10 }), off: reset },
      { label: 'Scan for the starting people', hint: 'no index', on: () => set({ ...D0, index: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.unique && r.dupes) return { ok: false, msg: `<b>Without a unique step, asking for ${st.k} returns ${r.dupes} grandchildren twice: each is reached once through Ama and again through Kweku.</b> Graphs often have several paths to one vertex; add a unique step before take.` };
      if (!st.unique) return { ok: false, msg: `<b>No duplicates yet, but only because take stopped after ${st.k}: all six grandchildren come through Ama first, and asking for more returns them again through Kweku.</b> Add a unique step before take.` };
      if (!st.lazy) return { ok: false, msg: `<b>Run eagerly, every step finished in full: ${r.edges} edges walked to return just ${st.k} grandchild${st.k > 1 ? 'ren' : ''}.</b> On a graph of millions of edges that is wasted work. Pull results one at a time so take can stop the traversal early.` };
      if (!st.index) return { ok: false, msg: `<b>Without an index, finding Ama and Kweku meant reading every vertex for each: ${r.lookups} reads before the traversal even started.</b> Keep a map from id to vertex.` };
      return { ok: true, msg: `<b>Lazily, the pipeline walked ${r.edges} edges to return ${r.results.join(', ')}, with no duplicates and two index lookups to start.</b> ${st.k < 6 ? 'Ask for more and it walks further, only as far as it must.' : 'Even all six need only Ama\'s branch: by the time it would reach Kweku\'s, every grandchild has been found.'}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'People and edges', home: true, say: 'A family tree is stored as people and parent-of edges: a graph.', act: m => m.set({ k: 6, lazy: true, unique: true, index: true }) },
    { t: 'A pipeline', home: true, say: 'Ask for Ama and Kweku\'s grandchildren: start at them, step out, step out again.', act: m => m.set({ k: 6, lazy: true, unique: true, index: true }) },
    { t: 'Twice over', home: true, say: 'Both grandparents reach every grandchild, so without a unique step each appears twice.', act: m => m.set({ k: 6, lazy: true, unique: false, index: true }) },
    { t: 'Only what you need', home: true, say: 'Take just two. A lazy pipeline pulls one result at a time and stops when it has two.', act: m => m.set({ k: 2, lazy: true, unique: true, index: true }) },
    { t: 'Eager wastes work', home: true, say: 'Run each step in full first, and it walks every edge for the same two answers.', act: m => m.set({ k: 2, lazy: false, unique: true, index: true }) },
    { t: 'Start fast', home: true, say: 'An index from id to vertex finds the starting people without scanning everyone.', act: m => m.set({ k: 2, lazy: true, unique: true, index: true }) },
  ],
  check: [
    { q: 'What does lazy evaluation let take(2) do?', options: ['Stop the traversal once two results are found', 'Return results faster but all of them', 'Skip duplicates'], answer: 0, why: 'Each step pulls one item at a time.', hint: 'Try Run every step in full first.' },
    { q: 'Why does this query need a unique step?', options: ['Two paths lead to each grandchild', 'Names repeat', 'Edges are broken'], answer: 0, why: 'Through each grandparent.', hint: 'Try Drop the unique step.' },
    { q: 'What does an id index speed up?', options: ['Finding the starting vertices', 'Following edges', 'Removing duplicates'], answer: 0, why: 'No scan of every vertex.', hint: 'Try Scan for the starting people.' },
  ],
  terms: [
    ['Vertex', 'A thing in the graph, such as a person.'],
    ['Edge', 'A relationship from one vertex to another.'],
    ['Traversal', 'Walking along edges from vertex to vertex.'],
    ['Pipeline', 'A query built from steps that pass items along.'],
    ['Lazy evaluation', 'Computing items only when the next step asks for them.'],
    ['Index', 'A map that finds a vertex by id without scanning.'],
  ],
  deeper: '<p><b>Query optimisers.</b> Real graph databases rewrite pipelines, such as moving a filter earlier, so fewer items flow through.</p><p><b>Edges both ways.</b> Storing each edge in both its vertices\' lists makes in() as fast as out().</p><p><b>About this machine.</b> The family is invented; the edge counts come from running the pipeline in this lesson.</p>',
  code: {
    title: 'A lazy graph pipeline',
    note: 'Our own short version, after Dagoba.',
    text: `
def v(graph, *ids):
    for i in ids:
        yield graph.by_id[i]                      # index: no scan

def out(graph, vertices):
    for vert in vertices:
        for edge in graph.out_edges[vert.id]:
            yield graph.by_id[edge.to]

def unique(items):
    seen = set()
    for item in items:
        if item.id not in seen:
            seen.add(item.id)
            yield item

def take(items, k):
    for n, item in enumerate(items):
        if n == k:
            return                                # stops pulling: traversal ends
        yield item

grandchildren = list(take(unique(out(g, out(g, v(g, "Ama", "Kweku")))), 2))
`,
  },
};
