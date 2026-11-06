// Graph theory: towns are nodes, roads are edges. Breadth-first search spreads out from a start town one ring at a time, finding the
// fewest-hops route; the adjacency matrix holds the same roads as a grid of 0s and 1s; message passing lets each town average its neighbours.
// Break it: floods close two roads (the map splits in two), the roads into Mombasa go one-way (you can get in but not out).
const TOWNS = [
  { n: 'Kampala', p: [-2.6, -0.9] }, { n: 'Kisumu', p: [-1.1, -0.2] }, { n: 'Eldoret', p: [-0.9, -1.5] }, { n: 'Nakuru', p: [0.4, -0.8] },
  { n: 'Nairobi', p: [1.2, 0.3] }, { n: 'Mombasa', p: [2.9, 1.5] }, { n: 'Arusha', p: [0.6, 1.5] }, { n: 'Kigali', p: [-2.8, 0.9] }, { n: 'Mwanza', p: [-1.2, 1.4] },
];
const ROADS = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4], [4, 5], [4, 6], [0, 7], [7, 8], [8, 1], [8, 6], [6, 5]];
const SC = 0.95;

export default {
  slug: 'graphs',
  title: 'Graphs: towns, roads and hops',
  description: 'Nine East African towns and the roads between them make a graph. Search outwards from Kampala ring by ring to find the fewest-hop route to Mombasa, see the same roads as a grid of 0s and 1s, then let floods close two roads and make the roads into Mombasa one-way.',
  overview: 'A graph is dots (nodes) joined by lines (edges): towns and roads, people and friendships, atoms and bonds, web pages and links. Breadth-first search finds the route with the fewest hops by spreading out one ring of neighbours at a time. The same graph can be stored as an adjacency matrix, a grid with a 1 wherever two nodes are joined, and that is how graph neural networks see it: each node updates itself from its neighbours, again and again.',
  keywords: ['graph theory machine learning', 'breadth first search', 'adjacency matrix', 'graph neural network', 'shortest path'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0.2, 0.3, 0.2], dir: [0.2, 1.5, 1.0], half: 3.1, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { start: 0, goal: 5, cut: false, oneway: false, ring: 0, t: 0, msg: false, round: 0 };
    const W = (x, z, y = 0.1) => V(x * SC, y, z * SC);
    /* ---------- the map ---------- */
    const land = P.box(6.6, 0.1, 4.0, '#E8D9B5', { r: 0.2 }); land.position.set(0.15, 0, 0.3); S.add(land);
    const lake = P.cyl(0.62, 0.02, '#7FB6D6', { seg: 32 }); lake.scale.set(1, 1, 0.8); lake.position.set(-1.9 * SC, 0.1, 0.45 * SC); S.add(lake);
    const lakeT = S.text('Lake Victoria', { size: 0.1, weight: 700, color: '#2E5C7A', maxW: 1.2 }); lakeT.position.set(-1.9 * SC, 0.125, 0.45 * SC); S.add(lakeT);
    const roads = ROADS.map(([a, b]) => {
      const A = W(...TOWNS[a].p, 0.14), B = W(...TOWNS[b].p, 0.14);
      const r = P.rod(A, B, 0.04, '#8E91A3'); S.add(r);
      const arr = P.arrow(A.clone().lerp(B, 0.42).add(V(0, 0.05, 0)), A.clone().lerp(B, 0.62).add(V(0, 0.05, 0)), 0.035, C.red); arr.visible = false; arr.userData.noFit = true; S.add(arr);
      return { a, b, r, arr };
    });
    // floods close Nakuru–Nairobi and Mwanza–Arusha; the one-way roads both lead into Mombasa
    const CUTS = [5, 11], ONEWAY = [6, 12];
    const gaps = CUTS.map(k => { const g = P.box(0.32, 0.04, 0.32, '#5B9BD5', { r: 0.06 }); g.position.copy(W(...TOWNS[ROADS[k][0]].p).lerp(W(...TOWNS[ROADS[k][1]].p), 0.5)).add(V(0, 0.07, 0)); g.userData.noFit = true; S.add(g); return g; });
    const towns = TOWNS.map((t, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#F7F5EE' });
      const b = P.cyl(0.2, 0.3, '#F7F5EE', { material: m }); b.position.copy(W(...t.p, 0.1)); S.add(b);
      const nm = S.text(t.n, { size: 0.13, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.3 }); nm.position.copy(W(...t.p, 0.75)); nm.userData.noFit = true; S.add(nm);
      const hop = S.text('', { size: 0.13, weight: 800, color: '#151827', maxW: 0.35 }); hop.position.copy(W(...t.p, 0.405)); S.add(hop);
      return { b, m, nm, hop };
    });
    /* ---------- the adjacency matrix, beside the map ---------- */
    const N = TOWNS.length, MX = 3.75 * SC + 1.25, MZ = 0.3, CELL = 0.2;
    const mbase = P.box(N * CELL + 0.3, 0.08, N * CELL + 0.3, '#2C2D31', { r: 0.06 }); mbase.position.set(MX, 0, MZ); S.add(mbase);
    const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL * 0.85, 0.06, CELL * 0.85).translate(0, 0.03, 0), new THREE.MeshLambertMaterial(), N * N); S.add(cells);
    const mT = S.text('ADJACENCY MATRIX', { size: 0.11, face: 'front', weight: 800, color: '#FFFFFF', maxW: 2 }); mT.position.set(MX, 0.04, MZ + (N * CELL + 0.3) / 2 + 0.005); S.add(mT);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- the search ---------- */
    const edges = () => ROADS.map(([a, b], k) => ({ a, b, k })).filter(e => !(st.cut && CUTS.includes(e.k)));
    const back = e => !(st.oneway && ONEWAY.includes(e.k));   // can you drive this road from b to a?
    const nbrs = i => { const out = []; for (const e of edges()) { if (e.a === i) out.push(e.b); if (e.b === i && back(e)) out.push(e.a); } return out; };
    function bfs(from) {
      const dist = new Array(N).fill(Infinity), prev = new Array(N).fill(-1); dist[from] = 0; const q = [from];
      while (q.length) { const u = q.shift(); for (const v of nbrs(u)) if (dist[v] === Infinity) { dist[v] = dist[u] + 1; prev[v] = u; q.push(v); } }
      return { dist, prev };
    }
    let R = bfs(st.start);
    const path = () => { const p = []; let v = st.goal; if (R.dist[v] === Infinity) return null; while (v !== -1) { p.unshift(v); v = R.prev[v]; } return p; };
    function search(from = st.start) { st.start = from; R = bfs(from); st.t = 0; }
    // message passing: each town's value becomes the average of itself and its neighbours (rainfall spreading on the map)
    let val = TOWNS.map((_, i) => i === 7 ? 1 : 0);
    const passOnce = () => { val = val.map((v, i) => { const nb = nbrs(i); return (v + nb.reduce((s, j) => s + val[j], 0)) / (1 + nb.length); }); st.round++; };
    function update(dt) {
      st.t += dt * (S.reduced ? 6 : 1.3);
      const ring = Math.floor(st.t), p = path(), onPath = new Set(p || []);
      towns.forEach((t, i) => {
        const d = R.dist[i], seen = d <= ring;
        const c = st.msg ? P.lerpColor('#F7F5EE', C.blue, Math.min(1, val[i] * 2.5)) : i === st.start ? C.gold : seen ? (onPath.has(i) && ring >= R.dist[st.goal] ? C.orange : P.lerpColor('#9FDDB2', '#3E9B5F', d / 5)) : '#F7F5EE';
        t.m.color.set(c);
        t.hop.userData.set(st.msg ? (val[i] * 100).toFixed(0) : seen && Number.isFinite(d) ? String(d) : '');
      });
      roads.forEach((r, k) => {
        const cut = st.cut && CUTS.includes(k);
        r.r.visible = !cut;
        const used = p && p.some((v, j) => j && ((p[j - 1] === r.a && v === r.b) || (p[j - 1] === r.b && v === r.a)));
        r.r.material = P.mat(used && ring >= R.dist[st.goal] && !st.msg ? C.orange : '#8E91A3');
        r.arr.visible = st.oneway && ONEWAY.includes(k);
      });
      gaps.forEach(g => { g.visible = st.cut; });
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const on = edges().some(e => (e.a === i && e.b === j) || (e.b === i && e.a === j && back(e)));
        dummy.position.set(MX - N * CELL / 2 + CELL * (j + 0.5), 0.08, MZ - N * CELL / 2 + CELL * (i + 0.5)); dummy.scale.set(1, on ? 2.5 : 1, 1); dummy.updateMatrix(); cells.setMatrixAt(i * N + j, dummy.matrix);
        cells.setColorAt(i * N + j, col.set(on ? C.gold : '#4A4E5E'));
      }
      cells.instanceMatrix.needsUpdate = true; cells.instanceColor.needsUpdate = true;
    }
    const controls = [
      { type: 'buttons', label: 'Search from', options: ['Kampala', 'Mombasa', 'Kigali'], get: () => [0, 5, 7].indexOf(st.start), act: i => { st.msg = false; st.goal = [5, 0, 5][i]; search([0, 5, 7][i]); } },
      { type: 'button', label: 'Pass messages once', short: 'Pass messages', act: () => { if (!st.msg) { st.msg = true; val = TOWNS.map((_, i) => i === 7 ? 1 : 0); st.round = 0; } passOnce(); } },
      { type: 'toggle', label: 'Floods close two roads', short: 'Floods', get: () => st.cut, set: v => { st.cut = v; st.msg = false; search(); }, quick: false },
      { type: 'toggle', label: 'Roads into Mombasa one-way', short: 'One-way', get: () => st.oneway, set: v => { st.oneway = v; st.msg = false; search(); }, quick: false },
    ];
    const readouts = [
      { label: 'Fewest hops', get: () => { const d = R.dist[st.goal]; return { v: Number.isFinite(d) ? `${d}` : 'no route', sub: `${TOWNS[st.start].n} to ${TOWNS[st.goal].n}`, bad: !Number.isFinite(d), good: Number.isFinite(d) }; } },
      { label: 'Towns reached', get: () => ({ v: `${R.dist.filter(Number.isFinite).length} of ${N}` }) },
    ];
    const labels = [
      { name: 'nodes', t: 'Nodes: the towns', d: 'Each number: hops from the start', icon: 'target', atV: W(-2.6, -0.9, 0.42) },
      { name: 'edges', t: 'Edges: the roads', d: 'Which towns are joined', icon: 'link', atV: W(-2.6, -0.9, 0.14).add(V(0.22, 0, 0)) },
      { name: 'matrix', t: 'The same roads as a grid', d: 'A gold cell where two towns are joined', icon: 'box', atV: V(MX - N * CELL / 2 - 0.15, 0.14, 1.5 * SC) },
      { name: 'route', t: 'Fewest-hop route', d: 'Found ring by ring (orange)', icon: 'check', atV: W(2.9, 1.5, 0.14).add(V(-0.25, 0, 0)) },
    ];
    const reset = () => { Object.assign(st, { start: 0, goal: 5, cut: false, oneway: false, msg: false }); search(0); };
    const breaks = [
      { label: 'Floods close two roads', hint: 'Nakuru–Nairobi and Mwanza–Arusha', on: () => { reset(); st.cut = true; search(); }, off: reset },
      { label: 'One-way roads into Mombasa', hint: 'Then search from Mombasa', on: () => { reset(); st.oneway = true; st.goal = 0; search(5); }, off: reset },
    ];
    function status() {
      const d = R.dist[st.goal], p = path();
      if (st.msg) return { msg: `<b>Message passing, round ${st.round}.</b> Kigali starts with a value of 100; each round every town becomes the average of itself and its neighbours, so the value spreads one road further each time. Graph neural networks learn by doing exactly this, with learned weights.` };
      if (!Number.isFinite(d) && st.oneway) return { ok: false, msg: `<b>You can get in, but not out.</b> Both roads into Mombasa are one-way towards it, so a search starting there reaches no other town. In a directed graph an edge from A to B is not an edge from B to A, and the matrix stops being symmetric: Mombasa's row is empty while its column is not.` };
      if (st.oneway) return { msg: `<b>One-way roads into Mombasa.</b> Every town can still reach Mombasa (${d} hops from ${TOWNS[st.start].n}), but try searching from Mombasa itself.` };
      if (!Number.isFinite(d)) return { ok: false, msg: `<b>No route at all.</b> With two roads flooded the map has split into two pieces, west and east of the floods, and no number of hops joins them. Search reaches only ${R.dist.filter(Number.isFinite).length} of ${N} towns.` };
      return { ok: true, msg: `<b>${TOWNS[st.start].n} to ${TOWNS[st.goal].n} in ${d} hops:</b> ${p.map(i => TOWNS[i].n).join(' → ')}. Breadth-first search spreads one ring of neighbours at a time, so the first time it reaches a town, it has found the fewest hops.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, search, pass: () => { if (!st.msg) { st.msg = true; val = TOWNS.map((_, i) => i === 7 ? 1 : 0); st.round = 0; } passOnce(); }, set: p => { Object.assign(st, p); search(); } };
  },

  story: [
    { t: 'Towns and roads', home: true, say: 'Here are nine towns around Lake Victoria and the roads between them. To a computer this is a graph: dots called nodes, joined by lines called edges.', act: m => m.reset() },
    { t: 'Ring by ring', home: true, say: 'Breadth-first search starts in Kampala and spreads out one ring at a time: first every town one road away, then every town two roads away, and so on.', act: m => m.search(0), wait: 6 },
    { t: 'Fewest hops', focus: [1.4, 0.3, 0.4], zoom: 1.35, say: 'The first time the search reaches Mombasa, it has found the route with the fewest hops, shown in orange.' },
    { t: 'A grid of roads', focus: 'matrix', zoom: 1.5, say: 'The same roads can be stored as a grid: one row and one column per town, with a gold cell wherever two towns are joined. This is the adjacency matrix.' },
    { t: 'Floods', home: true, say: 'Now floods close two roads, Nakuru to Nairobi and Mwanza to Arusha. The map splits into two pieces, and no number of hops gets from Kampala to Mombasa.', act: m => m.set({ cut: true }), wait: 5 },
    { t: 'Messages between neighbours', home: true, say: 'Graph neural networks work by passing messages: each town looks at its neighbours and updates itself, round after round. Here a value starting in Kigali spreads one road further each round.', act: m => { m.set({ cut: false }); m.pass(); m.pass(); }, wait: 6 },
  ],
  check: [
    { q: 'What does breadth-first search find?', options: ['The route with the fewest hops', 'The longest route', 'Every route at once'], answer: 0, why: 'It explores one ring of neighbours at a time, so the first arrival is the fewest hops.' },
    { q: 'In an adjacency matrix, what does a 1 (gold cell) in row A, column B mean?', options: ['A and B are joined by an edge', 'A is bigger than B', 'A has one neighbour'], answer: 0, why: 'Each cell records whether that pair of nodes is connected.' },
    { q: 'A road becomes one-way. What changes in the matrix?', options: ['Nothing', 'It is no longer symmetric', 'It gets an extra row'], answer: 1, why: 'A to B is now an edge but B to A is not, so the grid no longer mirrors itself.' },
  ],
  terms: [
    ['Graph', 'Nodes joined by edges: towns and roads, people and friendships.'],
    ['Degree', 'How many edges touch a node.'],
    ['Breadth-first search', 'Exploring a graph one ring of neighbours at a time; finds fewest-hop routes.'],
    ['Adjacency matrix', 'A grid with a 1 wherever two nodes are joined.'],
    ['Directed graph', 'A graph whose edges have a direction, like one-way roads or web links.'],
    ['Message passing', 'Each node updating itself from its neighbours, the core of graph neural networks.'],
  ],
  deeper: '<p><b>Weighted roads.</b> Hops are not kilometres. When edges carry lengths or times, Dijkstra\'s algorithm finds the shortest total, always expanding the closest unvisited town next.</p><p><b>Matrix powers.</b> Square the adjacency matrix and each cell counts the routes of exactly two hops between that pair of towns. Graph neural networks are built from repeated multiplications like this.</p><p><b>Transformers are graphs too.</b> Attention lets every word send a message to every other word: a complete graph whose edge weights are learned for each sentence.</p>',
  code: {
    title: 'Breadth-first search and message passing',
    note: 'Adapted from the course\'s graph-theory lesson.',
    text: `
from collections import deque

roads = {"Kampala": ["Kisumu", "Eldoret", "Kigali"], "Kisumu": ["Kampala", "Eldoret", "Nakuru", "Mwanza"],
         "Eldoret": ["Kampala", "Kisumu", "Nakuru"], "Nakuru": ["Kisumu", "Eldoret", "Nairobi"],
         "Nairobi": ["Nakuru", "Mombasa", "Arusha"], "Mombasa": ["Nairobi", "Arusha"],
         "Arusha": ["Nairobi", "Mwanza", "Mombasa"], "Kigali": ["Kampala", "Mwanza"], "Mwanza": ["Kigali", "Kisumu", "Arusha"]}

def bfs(start):
    hops, queue = {start: 0}, deque([start])
    while queue:
        town = queue.popleft()
        for nxt in roads[town]:
            if nxt not in hops:
                hops[nxt] = hops[town] + 1
                queue.append(nxt)
    return hops

print(bfs("Kampala")["Mombasa"])     # 4

def pass_messages(value):
    return {t: (value[t] + sum(value[n] for n in roads[t])) / (1 + len(roads[t])) for t in roads}
`,
  },
};
