// Unsupervised learning (k-means): shops on a city map with no labels at all. Drop k depots, give each shop to its nearest depot,
// move each depot to the middle of its shops, repeat until nothing changes. The elbow chart shows total distance for each k.
// Break it: start all depots in one corner (a bad start), pick k far too big, stretch one axis (unscaled).
const rngOf = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const CENTRES = [[-1.4, -0.9], [1.3, -1.1], [0.2, 1.2], [-1.6, 1.1]];
const SHOPS = (() => { const r = rngOf(23), g = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()), out = []; for (let i = 0; i < 96; i++) { const c = CENTRES[i % 4]; out.push([c[0] + g() * 0.36, c[1] + g() * 0.36]); } return out; })();
const COLS = ['#1C9A94', '#EE7434', '#8A3F8E', '#E3A72F', '#3D6BD6', '#D9483B', '#3E9B5F', '#C9774A', '#5B4636', '#EE6352'];
const KMAX = 10;

export default {
  slug: 'clustering',
  title: 'Clustering: groups with no labels',
  description: 'Ninety-six shops on a city map and nobody has said which belong together. Drop a few delivery depots, give each shop to its nearest depot, move each depot to the middle of its shops, and repeat until the zones settle. Then start badly, ask for too many zones, and stretch the map.',
  overview: 'Unsupervised learning finds structure in data that has no labels. K-means is the classic: choose how many groups you want (k), drop k centres, and repeat two simple steps. Give every point to its nearest centre, then move each centre to the middle of its points. The groups settle in a few rounds. It is used to segment customers, compress colours and plan delivery zones, but it needs a sensible k, a sensible start and features on the same scale.',
  keywords: ['k means clustering explained', 'unsupervised learning', 'elbow method', 'k-means++', 'customer segmentation'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0.5, 0.3, 0], dir: [0.2, 1.35, 1.05], half: 3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { k: 4, cen: [], assign: [], round: 0, auto: true, acc: 0, stretch: false, done: false };
    const pos = i => st.stretch ? [SHOPS[i][0], SHOPS[i][1] * 0.25] : SHOPS[i];
    // stretched: the north-south axis is measured in different units, so distances only see east-west
    const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (st.stretch ? 16 : 1) * (a[1] - b[1]) ** 2;
    /* ---------- the map ---------- */
    const map = P.box(4.6, 0.1, 3.8, '#E8E3D6', { r: 0.14 }); map.position.set(-0.15, 0, 0); S.add(map);
    const shopG = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11).translate(0, 0.055, 0), new THREE.MeshLambertMaterial(), SHOPS.length); shopG.castShadow = true; S.add(shopG);
    const links = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 4).translate(0, 0.5, 0), new THREE.MeshBasicMaterial(), SHOPS.length); links.userData.noFit = true; links.layers.set(1); S.add(links);
    const depots = [...Array(KMAX)].map((_, j) => { const g = new THREE.Group(); g.userData.noFit = true; S.add(g); const b = P.cyl(0.13, 0.32, COLS[j]); g.add(b); const roof = P.cyl(0.18, 0.06, '#2C2D31'); roof.position.y = 0.32; g.add(roof); return g; });
    const trails = [...Array(KMAX)].map((_, j) => { const r = P.rod(V(), V(0, 1, 0), 0.02, COLS[j]); r.userData.noFit = true; S.add(r); return r; });
    /* ---------- the elbow chart ---------- */
    const EX = 3.15, EZ = 0.2;
    const eBase = P.box(1.6, 0.08, 2.6, '#F1EEE6', { r: 0.08 }); eBase.position.set(EX, 0, EZ); S.add(eBase);
    const eBars = [...Array(KMAX)].map((_, j) => { const m = new THREE.MeshLambertMaterial({ color: '#B9B6AE' }); const b = P.box(0.11, 1, 0.18, '#B9B6AE', { r: 0.01, material: m }); b.position.set(EX - 0.62 + j * 0.138, 0.08, EZ + 0.6); b.userData.noFit = true; S.add(b); return { b, m }; });
    const eT = S.text('total distance for each k', { size: 0.1, weight: 800, color: '#151827', maxW: 1.5 }); eT.position.set(EX, 0.085, EZ + 1.05); S.add(eT);
    const eNums = [...Array(KMAX)].map((_, j) => { const t = S.text(String(j + 1), { size: 0.09, weight: 800, color: '#151827', maxW: 0.12 }); t.position.set(EX - 0.62 + j * 0.138, 0.085, EZ + 0.8); S.add(t); return t; });
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- k-means ---------- */
    function seedStart(bad) {
      // k-means++: each new depot starts at a shop far from the depots already placed; the bad start piles them in one corner
      const r = rngOf(st.k * 7 + 3);
      if (bad) { const [a, b, c, d] = CENTRES; st.cen = [[a[0] - 0.2, a[1]], [a[0] + 0.2, a[1]], [(b[0] + c[0]) / 2, (b[1] + c[1]) / 2], [...d]].slice(0, st.k); return; }
      st.cen = [pos(Math.floor(r() * SHOPS.length))];
      while (st.cen.length < st.k) {
        const d = SHOPS.map((_, i) => Math.min(...st.cen.map(c => dist2(pos(i), c)))), tot = d.reduce((a, b) => a + b, 0);
        let x = r() * tot, i = 0; while (x > d[i]) { x -= d[i]; i++; }
        st.cen.push([...pos(Math.min(i, SHOPS.length - 1))]);
      }
    }
    function assignAll() { st.assign = SHOPS.map((_, i) => { let best = 0, bd = Infinity; st.cen.forEach((c, j) => { const d = dist2(pos(i), c); if (d < bd) { bd = d; best = j; } }); return best; }); }
    function moveAll() {
      let moved = 0;
      st.prev = st.cen.map(c => [...c]);
      st.cen = st.cen.map((c, j) => { const mine = SHOPS.map((_, i) => i).filter(i => st.assign[i] === j); if (!mine.length) return c; const m = [mine.reduce((a, i) => a + pos(i)[0], 0) / mine.length, mine.reduce((a, i) => a + pos(i)[1], 0) / mine.length]; moved += Math.hypot(m[0] - c[0], m[1] - c[1]); return m; });
      return moved;
    }
    function step() { assignAll(); const m = moveAll(); st.round++; if (m < 1e-4) st.done = true; }
    function restart(bad) { st.round = 0; st.done = false; seedStart(bad); st.prev = null; assignAll(); st.bad = !!bad; }
    const inertia = () => SHOPS.reduce((a, _, i) => a + dist2(pos(i), st.cen[st.assign[i]]), 0);
    function elbow() {
      // the best total distance for each k, from a quick run of k-means++
      const save = { k: st.k, cen: st.cen, assign: st.assign }, out = [];
      for (let k = 1; k <= KMAX; k++) { st.k = k; seedStart(false); for (let t = 0; t < 25; t++) { assignAll(); moveAll(); } assignAll(); out.push(inertia()); }
      Object.assign(st, save); return out;
    }
    let curve = elbow();
    function update(dt) {
      if (st.auto && !st.done) { st.acc += dt * (S.reduced ? 6 : 1.4); while (st.acc >= 1) { st.acc -= 1; step(); } }
      SHOPS.forEach((_, i) => {
        const p = pos(i); dummy.position.set(p[0], 0.1, p[1]); dummy.scale.setScalar(1); dummy.quaternion.identity(); dummy.updateMatrix(); shopG.setMatrixAt(i, dummy.matrix); shopG.setColorAt(i, col.set(COLS[st.assign[i]]));
        const c = st.cen[st.assign[i]], d = V(c[0] - p[0], 0, c[1] - p[1]), L = d.length();
        dummy.position.set(p[0], 0.13, p[1]); dummy.quaternion.setFromUnitVectors(V(0, 1, 0), L > 1e-6 ? d.normalize() : V(0, 1, 0)); dummy.scale.set(1, Math.max(1e-4, L), 1); dummy.updateMatrix(); links.setMatrixAt(i, dummy.matrix); links.setColorAt(i, col.set(COLS[st.assign[i]]));
      });
      shopG.instanceMatrix.needsUpdate = true; shopG.instanceColor.needsUpdate = true; links.instanceMatrix.needsUpdate = true; links.instanceColor.needsUpdate = true;
      depots.forEach((g, j) => { g.visible = j < st.k; if (g.visible) g.position.set(st.cen[j][0], 0.1, st.cen[j][1]); });
      trails.forEach((r, j) => { r.visible = j < st.k && !!st.prev && !st.done; if (r.visible) P.setRod(r, V(st.prev[j][0], 0.12, st.prev[j][1]), V(st.cen[j][0], 0.12, st.cen[j][1])); });
      const top = Math.max(...curve);
      eBars.forEach((b, j) => { b.b.scale.y = Math.max(0.01, curve[j] / top * 1.4); b.m.color.set(j + 1 === st.k ? C.orange : '#B9B6AE'); });
    }
    restart(false);
    const controls = [
      { type: 'slider', label: 'k: how many zones', short: 'k', min: 1, max: KMAX, step: 1, get: () => st.k, set: v => { st.k = Math.round(v); restart(false); } },
      { type: 'button', label: 'One round', short: 'Step', act: () => { st.auto = false; step(); } },
      { type: 'button', label: 'Start again', short: 'Again', act: () => { st.auto = true; restart(false); } },
      { type: 'toggle', label: 'North-south in other units (unscaled)', short: 'Stretched', get: () => st.stretch, set: v => { st.stretch = v; curve = elbow(); restart(false); }, quick: false },
    ];
    const readouts = [
      { label: 'Round', get: () => ({ v: st.round, sub: st.done ? 'settled' : 'moving' }) },
      { label: 'Total distance to depots', get: () => ({ v: inertia().toFixed(1), good: st.done && st.k === 4 && !st.bad && !st.stretch }) },
    ];
    const labels = [
      { name: 'shops', t: 'Shops, no labels', d: 'Only where each one is', icon: 'box', atV: V(-2.45, 0.1, -1.9) },
      { name: 'depots', t: 'Depots (centres)', d: 'Each moves to the middle of its shops', icon: 'target', atV: V(-2.45, 0.1, 1.9) },
      { name: 'links', t: 'Nearest depot', d: 'Every shop joins the closest one', icon: 'link', atV: V(2.15, 0.1, -1.9) },
      { name: 'elbow', t: 'The elbow', d: 'Where adding zones stops helping', icon: 'scale', atV: V(EX + 0.8, 0.08, EZ + 0.6) },
    ];
    const reset = () => { Object.assign(st, { k: 4, auto: true, stretch: false }); curve = elbow(); restart(false); };
    const breaks = [
      { label: 'A bad start', hint: 'Two depots in one neighbourhood', on: () => { reset(); restart(true); for (let t = 0; t < 60 && !st.done; t++) step(); }, off: reset },
      { label: 'Ten zones', hint: 'k far too big', on: () => { reset(); st.k = 10; restart(false); }, off: reset },
      { label: 'North-south in other units', hint: 'Not scaled', on: () => { reset(); st.stretch = true; curve = elbow(); restart(false); }, off: reset },
    ];
    function status() {
      const sizes = [...Array(st.k)].map((_, j) => st.assign.filter(a => a === j).length);
      if (st.stretch) return { ok: false, msg: `<b>Zones cut into stripes.</b> North-south is now measured in units sixteen times bigger, so a small step north counts as a long way, and the zones become narrow east-west bands that cut through real neighbourhoods. Scale both directions the same way first.` };
      if (st.bad && st.done) return { ok: false, msg: `<b>A bad start, a bad answer.</b> Two depots began in the same neighbourhood and one between two others, and k-means only ever moves downhill: ${sizes.filter(s => !s).length ? 'some depots ended with no shops at all' : 'two depots now share one neighbourhood while another neighbourhood shares one depot'}. Total distance ${inertia().toFixed(1)} against about ${curve[3].toFixed(1)} from a good start. Spread the starts out (k-means++), or run several times and keep the best.` };
      if (st.k >= 9) return { ok: false, msg: `<b>Too many zones.</b> Ten depots for four natural neighbourhoods: each neighbourhood is split between two or three depots for very little gain. The elbow chart shows it: total distance falls steeply up to 4, then barely moves. Pick k at the elbow.` };
      if (!st.done) return { msg: `<b>Round ${st.round}.</b> Every shop joins its nearest depot (the thin lines), then every depot moves to the middle of its shops (the short coloured trails).` };
      return { ok: st.k === 4 ? true : undefined, msg: `<b>Settled after ${st.round} rounds.</b> ${st.k} zones of ${sizes.join(', ')} shops; total distance to depots ${inertia().toFixed(1)}. Nobody labelled anything: the groups came from where the shops are.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); restart(false); }, bad: () => { st.auto = true; restart(true); } };
  },

  story: [
    { t: 'No labels', home: true, say: 'Here are ninety-six shops across a city, and nobody has said which belong together. We want four delivery zones, each with its own depot.', act: m => { m.set({ k: 4, auto: false }); } },
    { t: 'Nearest depot', focus: 'links', zoom: 1.2, say: 'Drop four depots. Each shop joins whichever depot is nearest. The thin lines show who joins whom.' },
    { t: 'Move to the middle', home: true, say: 'Now each depot moves to the middle of its shops. Then the shops choose again, and the depots move again.', act: m => m.set({ auto: true }), wait: 6 },
    { t: 'It settles', home: true, say: 'After a few rounds nothing changes any more. Four zones, found from nothing but the shops\' positions. That is k-means clustering.', wait: 4 },
    { t: 'How many zones?', focus: [2.4, 0.4, 0.4], zoom: 1.3, say: 'How many zones should there be? The bars show the total distance for each choice. It falls steeply up to four, then barely moves. Four is the elbow.' },
    { t: 'A bad start', home: true, say: 'Start two depots in the same neighbourhood and one between two others, and the zones settle somewhere poor. K-means only walks downhill. Spreading the starting depots out fixes it.', act: m => m.bad(), wait: 6 },
  ],
  check: [
    { q: 'What are the two repeated steps of k-means?', options: ['Assign each point to its nearest centre, then move each centre to the middle of its points', 'Sort the points, then split them', 'Label the points, then train'], answer: 0, why: 'Those two steps repeat until nothing changes.' },
    { q: 'How do you pick k with the elbow method?', options: ['Where adding another cluster stops reducing the total distance much', 'Always choose 10', 'The largest k possible'], answer: 0, why: 'Before the elbow each extra cluster helps a lot; after it, very little.' },
    { q: 'Why can k-means give a poor answer from a bad start?', options: ['It only ever moves downhill, so it can get stuck', 'It never stops', 'It needs labels'], answer: 0, why: 'Like gradient descent it settles in the nearest dip; spread-out starts avoid bad dips.' },
  ],
  terms: [
    ['Unsupervised learning', 'Finding structure in data that has no labels.'],
    ['Cluster', 'A group of points that sit close together.'],
    ['Centroid', 'The middle of a cluster: the average of its points.'],
    ['Inertia', 'The total (squared) distance from points to their centroids; lower is tighter.'],
    ['k-means++', 'A smarter start: each new centre is placed far from the ones already chosen.'],
  ],
  deeper: '<p><b>Round blobs only.</b> K-means assumes roughly round, similar-sized groups. Long thin shapes or rings need other methods, such as DBSCAN (which grows clusters from dense regions) or spectral clustering.</p><p><b>Colour compression.</b> Run k-means on a photo\'s pixel colours with k = 16 and replace each pixel by its centre: a picture with only sixteen colours that still looks right.</p><p><b>Embeddings.</b> Clustering text embeddings groups support tickets, news stories or songs by meaning, with nobody labelling them first.</p>',
  code: {
    title: 'K-means in a few lines',
    note: 'Adapted from the course\'s unsupervised-learning lesson.',
    text: `
import numpy as np

def kmeans(X, k, rounds=50, seed=0):
    rng = np.random.default_rng(seed)
    centres = [X[rng.integers(len(X))]]
    while len(centres) < k:                      # k-means++ start
        d = np.min([((X - c) ** 2).sum(1) for c in centres], axis=0)
        centres.append(X[rng.choice(len(X), p=d / d.sum())])
    centres = np.array(centres)
    for _ in range(rounds):
        labels = ((X[:, None] - centres) ** 2).sum(2).argmin(1)   # nearest centre
        new = np.array([X[labels == j].mean(0) for j in range(k)])
        if np.allclose(new, centres):
            break
        centres = new
    return labels, centres
`,
  },
};
