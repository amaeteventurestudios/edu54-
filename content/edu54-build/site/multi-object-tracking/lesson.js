// Multi-object tracking: four boda-boda motorbikes cross a junction in Kampala, seen from above. A detector finds them in every frame; the tracker must keep each one's ID.
// Each frame: predict where every track should be (a constant-velocity Kalman filter), match predictions to detections (the Hungarian algorithm on distance), and keep the IDs.
// A parked lorry hides two lanes for a stretch; near the market stall the detector is unsure (low scores). Trails are drawn in each track's colour: a colour change is an ID switch.
// Break it: match detections in the order they arrive (IDs swap every frame), no motion prediction (a bike lost behind the lorry comes back as someone new),
// throw away low-score detections (bikes vanish in the busy patch; keeping them for a second matching pass is ByteTrack's idea).
const T = 70, NB = 4;
const BIKES = [
  { y: 0.2, v: 0.013, x0: 0.02 }, { y: 0.4, v: 0.011, x0: 0.06, swap: [0.4, 0.6] }, { y: 0.6, v: 0.012, x0: -0.12, swap: [0.6, 0.4] }, { y: 0.8, v: 0.014, x0: 0.04 },
];
const LORRY = { x0: 0.25, x1: 0.42, y0: 0.32, y1: 0.68 }, BUSY = { x0: 0.78, x1: 0.94 };
function truth(b, t) {
  const B = BIKES[b], x = B.x0 + B.v * t;
  let y = B.y;
  if (B.swap) { const u = Math.max(0, Math.min(1, (x - 0.5) / 0.2)); y = B.swap[0] + (B.swap[1] - B.swap[0]) * u; }
  return [x, y];
}
function detections(t) {
  let s = 1000 + t * 17; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());
  const out = [];
  for (let b = 0; b < NB; b++) {
    const [x, y] = truth(b, t);
    if (x > 1.02) continue;
    if (x > LORRY.x0 && x < LORRY.x1 && y > LORRY.y0 && y < LORRY.y1) continue;    // hidden
    const conf = x > BUSY.x0 && x < BUSY.x1 ? 0.3 + r() * 0.15 : 0.75 + r() * 0.2;
    out.push({ p: [x + g() * 0.006, y + g() * 0.006], conf, b });
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }   // arrival order is random
  return out;
}
const PERMS = [];
function perms(n) { if (n <= 1) return [[...Array(n).keys()]]; const out = []; perms(n - 1).forEach(p => { for (let i = 0; i <= p.length; i++) out.push([...p.slice(0, i), n - 1, ...p.slice(i)]); }); return out; }

for (let n = 0; n <= 6; n++) PERMS[n] = perms(n);

export default {
  slug: 'multi-object-tracking',
  title: 'Tracking: keeping every ID',
  description: 'Four boda-boda motorbikes cross a junction in Kampala, seen from above. A detector finds them in every frame, and the tracker predicts where each should be, matches predictions to detections and keeps their IDs, even behind a parked lorry. Then match in arrival order, switch off prediction, or throw away the unsure detections and count the ID switches.',
  overview: 'Tracking-by-detection runs a detector on every frame, then links the boxes into tracks. For each track a Kalman filter predicts where it should be now, assuming roughly constant speed; the Hungarian algorithm then finds the cheapest one-to-one matching between predictions and new detections. Unmatched tracks coast on their prediction for a few frames, which carries them through short occlusions; unmatched detections start new tracks. ByteTrack added a simple idea: keep the low-confidence detections and use them in a second matching pass, because objects in crowds and at the edges of occlusions often score low. The key failure is an ID switch: one object handed another\'s ID.',
  keywords: ['multi object tracking', 'kalman filter tracking', 'hungarian algorithm', 'bytetrack', 'id switches'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0.05], dir: [0.1, 1.4, 1.0], half: 1.7, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { match: 'hungarian', predict: true, lowConf: true, frame: T, play: true, clock: 0 };
    const ink = '#151827';
    const base = P.box(6.4, 0.12, 3.0, '#8C8A86', { r: 0.12 }); base.position.set(0, 0, 0.05); S.add(base);
    const RW = 5.6, RD = 2.3, X = x => -RW / 2 + x * RW, Z = y => -RD / 2 + y * RD + 0.05, Y0 = 0.14;
    const road = P.box(RW, 0.02, RD, '#4A4A4A', { r: 0.03 }); road.position.set(0, 0.12, 0.05); S.add(road);
    for (let k = 1; k < 4; k++) for (let i = 0; i < 14; i++) { const m = P.box(0.18, 0.005, 0.02, '#E6E1D6', { r: 0 }); m.position.set(X(i / 14 + 0.03), Y0, Z(k * 0.2 + 0.1)); S.add(m); }
    const lorry = P.box((LORRY.x1 - LORRY.x0) * RW, 0.45, (LORRY.y1 - LORRY.y0) * RD, '#C0392B', { r: 0.05 }); lorry.position.set(X((LORRY.x0 + LORRY.x1) / 2), Y0, Z((LORRY.y0 + LORRY.y1) / 2)); S.add(lorry);
    const lT = S.text('parked lorry', { size: 0.08, weight: 800, color: '#FFFFFF' }); lT.position.set(X((LORRY.x0 + LORRY.x1) / 2), Y0 + 0.455, Z(0.5)); S.add(lT);
    const stall = P.box((BUSY.x1 - BUSY.x0) * RW, 0.03, 0.25, '#E3A72F', { r: 0.02 }); stall.position.set(X((BUSY.x0 + BUSY.x1) / 2), 0.12, Z(1) + 0.2); S.add(stall);
    const sT = S.text('busy patch: unsure detections', { size: 0.07, weight: 800, color: ink }); sT.position.set(X((BUSY.x0 + BUSY.x1) / 2), 0.155, Z(1) + 0.2); S.add(sT);
    const ID = ['#1C9A94', '#E3A72F', '#8A3F8E', '#3D6BD6', '#D9483B', '#3E9B5F', '#EE7434', '#F2F2F2', '#6FAE4A', '#C9774A', '#2F3C8F', '#B9B6AE'];
    const bikes = [...Array(NB)].map(() => { const g = new THREE.Group(); const b = P.box(0.22, 0.08, 0.1, '#151827', { r: 0.02 }); g.add(b); const h = P.ball(0.04, '#F2C94C'); h.position.set(-0.02, 0.13, 0); g.add(h); g.userData.noFit = true; S.add(g); return g; });
    const tags = [...Array(NB)].map(() => { const t = S.text('', { size: 0.07, weight: 800, color: '#FFFFFF', bg: '#151827', face: 'cam', top: true }); t.userData.noFit = true; S.add(t); return t; });
    const trail = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 6, 5), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), NB * T);
    trail.userData.noFit = true; trail.frustumCulled = false; trail.layers.set(1); S.add(trail);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- the tracker ---------- */
    let R = null;
    function run() {
      let tracks = [], next = 0; const hist = [];       // hist[t] = [{b, id, p}]
      const GATE = 0.08;
      for (let t = 0; t < T; t++) {
        let dets = detections(t);
        tracks.forEach(k => { if (st.predict) { k.p = [k.p[0] + k.v[0], k.p[1] + k.v[1]]; } });
        const pass = (pool, trs) => {
          const used = new Set(), done = new Set(), pairs = [];
          if (st.match === 'order') { trs.forEach((k, i) => { if (i < pool.length) pairs.push([k, pool[i]]); }); }
          else {
            const n = Math.max(trs.length, pool.length), P2 = PERMS[Math.min(n, 6)];
            let best = null, bc = Infinity;
            if (trs.length && pool.length) P2.forEach(pm => { let c = 0; for (let i = 0; i < trs.length; i++) { const j = pm[i]; if (j === undefined || j >= pool.length) { c += GATE; continue; } const d = Math.hypot(trs[i].p[0] - pool[j].p[0], trs[i].p[1] - pool[j].p[1]); c += Math.min(d, GATE); } if (c < bc) { bc = c; best = pm; } });
            if (best) for (let i = 0; i < trs.length; i++) { const j = best[i]; if (j !== undefined && j < pool.length && Math.hypot(trs[i].p[0] - pool[j].p[0], trs[i].p[1] - pool[j].p[1]) < GATE) pairs.push([trs[i], pool[j]]); }
          }
          pairs.forEach(([k, d]) => { const old = k.last || k.p; k.v = [d.p[0] - old[0], d.p[1] - old[1]]; if (st.predict && k.vs) k.v = [0.85 * k.vs[0] + 0.15 * k.v[0], 0.85 * k.vs[1] + 0.15 * k.v[1]]; k.vs = k.v; k.p = d.p.slice(); k.last = d.p.slice(); k.miss = 0; k.det = d; used.add(d); done.add(k); });
          return { used, done };
        };
        const hi = dets.filter(d => d.conf >= 0.5), lo = dets.filter(d => d.conf < 0.5);
        tracks.forEach(k => { k.det = null; });
        const a = pass(hi, tracks);
        const rest = tracks.filter(k => !a.done.has(k));
        let usedLo = new Set();
        if (st.lowConf) { const b2 = pass(lo, rest); usedLo = b2.used; }
        tracks.forEach(k => { if (!k.det) { k.miss = (k.miss || 0) + 1; if (!st.predict) k.v = [0, 0]; } });
        tracks = tracks.filter(k => k.miss <= 20);
        hi.filter(d => !a.used.has(d)).forEach(d => tracks.push({ id: next++, p: d.p.slice(), v: [0.012, 0], miss: 0, last: d.p.slice(), det: d }));
        hist.push(tracks.filter(k => k.det).map(k => ({ b: k.det.b, id: k.id, p: k.det.p.slice() })));
      }
      // ID switches: per real bike, count changes in the ID it was given
      let switches = 0, frag = 0; const ids = [...Array(NB)].map(() => new Set());
      for (let b = 0; b < NB; b++) { let prev = null; hist.forEach(h => { const e = h.find(x => x.b === b); if (e) { if (prev !== null && e.id !== prev) switches++; prev = e.id; ids[b].add(e.id); } }); }
      const seen = hist.reduce((a, h) => a + h.length, 0);
      return { hist, switches, ids, coverage: seen / Math.max(1, [...Array(T).keys()].reduce((a, t) => a + [...Array(NB).keys()].filter(b => truth(b, t)[0] <= 1.02).length, 0)) };
    }
    function draw(rerun = true) {
      if (rerun || !R) R = run();
      let q = 0;
      R.hist.slice(0, st.frame).forEach(h => h.forEach(e => { if (q >= NB * T) return; dummy.position.set(X(e.p[0]), Y0 + 0.02, Z(e.p[1])); dummy.updateMatrix(); trail.setMatrixAt(q, dummy.matrix); trail.setColorAt(q, col.set(ID[e.id % ID.length])); q++; }));
      trail.count = q; trail.instanceMatrix.needsUpdate = true; if (trail.instanceColor) trail.instanceColor.needsUpdate = true;
      const f = Math.max(0, Math.min(T - 1, st.frame - 1)), h = R.hist[f];
      for (let b = 0; b < NB; b++) {
        const [x, y] = truth(b, f), hidden = x > LORRY.x0 && x < LORRY.x1 && y > LORRY.y0 && y < LORRY.y1;
        bikes[b].visible = x <= 1.02; bikes[b].position.set(X(Math.min(1.02, x)), Y0 + 0.04, Z(y)); bikes[b].children.forEach(c => { c.visible = !hidden; });
        const e = h.find(z => z.b === b); tags[b].visible = !!e && !hidden; if (e) { tags[b].userData.set(`#${e.id + 1}`); tags[b].position.set(X(x), Y0 + 0.35, Z(y)); }
      }
    }
    draw();
    function update(dt) {
      if (!st.play) return;
      st.clock += dt; const per = S.reduced ? 0.02 : 0.09;
      if (st.clock > per) { st.clock = 0; st.frame = st.frame >= T ? 1 : st.frame + 1; draw(false); }
    }
    const controls = [
      { type: 'buttons', label: 'Matching', options: ['Hungarian on distance', 'Arrival order'], get: () => (st.match === 'hungarian' ? 0 : 1), act: i => { st.match = i ? 'order' : 'hungarian'; draw(); } },
      { type: 'toggle', label: 'Predict motion (Kalman filter)', short: 'predict', get: () => st.predict, set: v => { st.predict = v; draw(); } },
      { type: 'toggle', label: 'Second pass with low-score detections', short: 'low scores', get: () => st.lowConf, set: v => { st.lowConf = v; draw(); } },
      { type: 'toggle', label: 'Play', get: () => st.play, set: v => { st.play = v; } },
    ];
    const readouts = [
      { label: 'ID switches', get: () => ({ v: String(R.switches), sub: 'a bike given a new ID', good: R.switches === 0, bad: R.switches > 0 }) },
      { label: 'IDs used', get: () => { const n = new Set(R.hist.flat().map(e => e.id)).size; return { v: String(n), sub: `${NB} bikes`, good: n === NB, bad: n > NB }; } },
      { label: 'Tracked', get: () => ({ v: `${Math.round(R.coverage * 100)}%`, sub: 'of bike-frames', good: R.coverage > 0.85, bad: R.coverage < 0.7 }) },
    ];
    const labels = [
      { name: 'road', t: 'The junction from above', d: 'Trail colour = track ID', icon: 'eye', atV: V(X(0), Y0, Z(0.5)) },
      { name: 'lorry', t: 'A parked lorry', d: 'Hides two lanes for a stretch', icon: 'box', atV: V(X(LORRY.x1), Y0 + 0.3, Z(0.5)) },
      { name: 'busy', t: 'The busy patch', d: 'Low detector scores here', icon: 'scale', atV: V(X(BUSY.x1) + 0.1, 0.15, Z(1) + 0.2) },
    ];
    const reset = () => { Object.assign(st, { match: 'hungarian', predict: true, lowConf: true }); draw(); };
    const breaks = [
      { label: 'Match in arrival order', hint: 'Track 1 gets the first detection', on: () => { reset(); st.match = 'order'; draw(); }, off: reset },
      { label: 'No motion prediction', hint: 'Tracks wait where they were last seen', on: () => { reset(); st.predict = false; draw(); }, off: reset },
      { label: 'Drop low-score detections', hint: 'Only boxes scoring 0.5 or more', on: () => { reset(); st.lowConf = false; draw(); }, off: reset },
    ];
    function status() {
      const nIds = new Set(R.hist.flat().map(e => e.id)).size;
      if (st.match === 'order') return { ok: false, msg: `<b>IDs swap every frame.</b> The detector returns boxes in no particular order, so handing track 1 the first box, track 2 the second, and so on, shuffles the IDs constantly: ${R.switches} switches. Matching must be by position, choosing the pairing with the smallest total distance.` };
      if (!st.predict) return { ok: false, msg: `<b>Lost behind the lorry.</b> Without a motion model, a track that loses its detection waits where the bike was last seen. When the bike comes out the other side of the lorry it is too far away to match, so it starts again with a new ID: ${nIds} IDs for ${NB} bikes, ${R.switches} switches. A Kalman filter keeps the track moving while the bike is hidden.` };
      if (!st.lowConf) return { ok: false, msg: `<b>Bikes vanish in the busy patch.</b> Near the stall the detector is unsure and scores the bikes around 0.35. Throwing those boxes away leaves the bikes untracked all the way through the patch: only ${Math.round(R.coverage * 100)}% of bike-frames are tracked, so a counter at the stall would miss them. Keeping low-score boxes for a second matching pass fixes it.` };
      return { ok: true, msg: `<b>Every bike keeps its ID.</b> The Kalman filter carries tracks through the lorry, Hungarian matching pairs predictions with the nearest detections, and the second pass keeps the unsure boxes in the busy patch: ${R.switches} ID switches, ${nIds} IDs for ${NB} bikes.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); }, trace: () => R.hist };
  },

  story: [
    { t: 'Four bikes', home: true, say: 'Four boda boda motorbikes cross a junction in Kampala, seen from above. A detector finds them in every frame. The tracker must keep each one\'s ID.', act: m => m.set({ match: 'hungarian', predict: true, lowConf: true }) },
    { t: 'Predict, then match', home: true, say: 'Each frame, a Kalman filter predicts where every track should be. Then the Hungarian algorithm pairs predictions with detections, choosing the smallest total distance.', act: m => m.set({}), wait: 4 },
    { t: 'Order is not identity', home: true, say: 'Match in the order the detections happen to arrive, and the IDs shuffle every frame. The trail colours flicker.', act: m => m.set({ match: 'order' }), wait: 4 },
    { t: 'Behind the lorry', home: true, say: 'Switch off prediction, and a track waits where its bike was last seen. The bike comes out from behind the lorry too far away, and gets a new ID.', act: m => m.set({ match: 'hungarian', predict: false }), wait: 4 },
    { t: 'Unsure detections', home: true, say: 'In the busy patch the detector is unsure. Throw away its low scores, and the bikes vanish from the tracker there.', act: m => m.set({ predict: true, lowConf: false }), wait: 4 },
    { t: 'Keep them all', home: true, say: 'Keep the low scores for a second matching pass, and every bike keeps one ID from one side of the junction to the other.', act: m => m.set({ lowConf: true }), wait: 4 },
  ],
  check: [
    { q: 'What does the Kalman filter do in a tracker?', options: ['Predicts where each track should be in the next frame', 'Detects new objects', 'Colours the trails'], answer: 0, why: 'Predictions carry tracks through missed detections.' },
    { q: 'What does the Hungarian algorithm decide?', options: ['The cheapest one-to-one pairing of tracks and detections', 'How many objects there are', 'Which detections are low score'], answer: 0, why: 'It minimises the total matching cost.' },
    { q: 'Why keep low-score detections for a second pass?', options: ['Objects in crowds and near occlusions often score low but are real', 'They are always more accurate', 'To make tracking faster'], answer: 0, why: 'That is ByteTrack\'s key idea.' },
  ],
  terms: [
    ['Tracking-by-detection', 'Detect in every frame, then link detections into tracks.'],
    ['Kalman filter', 'Predicts the next position from the current position and velocity, and corrects it with each measurement.'],
    ['Hungarian algorithm', 'Finds the cheapest one-to-one matching between two sets.'],
    ['ID switch', 'A track\'s identity jumping from one object to another.'],
    ['Occlusion', 'An object hidden behind something else.'],
    ['ByteTrack', 'A tracker that matches low-confidence detections in a second pass.'],
  ],
  deeper: '<p><b>Appearance too.</b> Trackers such as DeepSORT add an appearance vector for each detection, so two people who pass close together can still be told apart by what they look like.</p><p><b>Metrics.</b> MOTA counts misses, false alarms and ID switches; IDF1 measures how long each object keeps its correct ID; HOTA balances detection and association.</p><p><b>About this machine.</b> The tracker here really runs: prediction, matching and the two passes are computed on the simulated detections every frame.</p>',
  code: {
    title: 'One step of a SORT-style tracker',
    note: 'Adapted from the course\'s multi-object tracking lesson.',
    text: `
import numpy as np
from scipy.optimize import linear_sum_assignment

def step(tracks, detections, gate=0.08):
    for t in tracks:
        t.predict()                                    # constant-velocity Kalman step
    if tracks and detections:
        cost = np.array([[np.linalg.norm(t.pos - d.pos) for d in detections] for t in tracks])
        rows, cols = linear_sum_assignment(cost)       # Hungarian algorithm
        matched = [(r, c) for r, c in zip(rows, cols) if cost[r, c] < gate]
    else:
        matched = []
    for r, c in matched:
        tracks[r].update(detections[c].pos)            # correct the prediction
    unmatched = set(range(len(detections))) - {c for _, c in matched}
    return matched, unmatched                          # unmatched detections start new tracks
`,
  },
};
