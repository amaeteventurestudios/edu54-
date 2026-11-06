// Object detection: a street scene in Lagos on an upright board, split into a 7 × 7 grid as YOLO does.
// Every cell guesses boxes with a confidence; a threshold drops weak guesses, and non-max suppression (NMS) keeps only the best of overlapping boxes.
// In front, three counters show how many boxes survive each stage. Boxes are drawn in their class colour with their confidence.
// Break it: switch NMS off (every object gets a pile of boxes), set the threshold too high (objects are missed), set NMS overlap too low (a person standing beside another is erased).
const CLS = { bus: { n: 'danfo bus', c: '#E3A72F' }, bike: { n: 'okada', c: '#3D6BD6' }, ped: { n: 'person', c: '#D9483B' } };
const GT = [
  { k: 'bus', x: 0.07, y: 0.18, w: 0.3, h: 0.3 }, { k: 'bus', x: 0.56, y: 0.2, w: 0.28, h: 0.28 },
  { k: 'bike', x: 0.41, y: 0.16, w: 0.1, h: 0.2 }, { k: 'bike', x: 0.87, y: 0.14, w: 0.09, h: 0.2 },
  { k: 'ped', x: 0.14, y: 0.56, w: 0.055, h: 0.24 }, { k: 'ped', x: 0.18, y: 0.57, w: 0.055, h: 0.24 },
  { k: 'ped', x: 0.47, y: 0.55, w: 0.055, h: 0.25 }, { k: 'ped', x: 0.72, y: 0.56, w: 0.055, h: 0.24 }, { k: 'ped', x: 0.9, y: 0.55, w: 0.055, h: 0.25 },
];
const iou = (a, b) => { const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h); const I = Math.max(0, x1 - x0) * Math.max(0, y1 - y0); return I / (a.w * a.h + b.w * b.h - I); };
function candidates() {
  let s = 17; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [];
  GT.forEach((g, gi) => {
    const drop = g.k === 'ped' ? 0.12 : g.k === 'bike' ? 0.07 : 0;
    [0.93, 0.82, 0.72, 0.58, 0.4].forEach((c, j) => { const jx = (r() - 0.5) * 0.18 * j / 4, jy = (r() - 0.5) * 0.18 * j / 4, js = 1 + (r() - 0.5) * 0.25 * j / 4; out.push({ k: g.k, x: g.x + jx * g.w, y: g.y + jy * g.h, w: g.w * js, h: g.h * js, conf: Math.max(0.05, c - drop - (gi === 5 ? 0.1 : 0) + (r() - 0.5) * 0.06), gt: gi }); });
  });
  for (let i = 0; i < 14; i++) { const k = ['bus', 'bike', 'ped'][i % 3], w = k === 'bus' ? 0.2 : k === 'bike' ? 0.08 : 0.05, h = k === 'ped' ? 0.2 : 0.17; out.push({ k, x: r() * (0.95 - w), y: 0.05 + r() * (0.85 - h), w, h, conf: 0.06 + r() * (i < 3 ? 0.6 : 0.4), gt: -1 }); }
  return out;
}
const CANDS = candidates();

export default {
  slug: 'object-detection-yolo',
  title: 'Object detection: boxes, confidence and NMS',
  description: 'A Lagos street on a 7 × 7 grid: every cell guesses boxes for danfo buses, okadas and people. A confidence threshold drops weak guesses and non-max suppression keeps the best of each overlapping pile. Then switch NMS off, set the threshold too high, or squeeze the overlap limit until a person vanishes from beside their friend.',
  overview: 'An object detector answers two questions at once: what is in the picture, and where. YOLO splits the image into a grid; each cell predicts a few boxes, each with a class and a confidence. That produces many overlapping guesses for every object. Two clean-up steps follow: a confidence threshold throws away weak guesses, and non-max suppression keeps the most confident box and removes any other box of the same class that overlaps it by more than a set amount, measured as intersection over union (IoU). Precision and recall then say how many kept boxes were right, and how many objects were found.',
  keywords: ['object detection', 'yolo explained', 'non max suppression', 'intersection over union', 'precision recall detection'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.15, 0], dir: [0.12, 0.35, 1.3], half: 1.75, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { conf: 0.5, nms: true, iouT: 0.5 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.2, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.2); S.add(base);
    /* ---------- the street board ---------- */
    const BW = 4.6, BH = 2.3, BZ = -0.4, BY = 0.35;
    const board = P.box(BW + 0.2, BH + 0.3, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(0, 0.12, BZ); S.add(board);
    const bTop = S.text('a street in Lagos', { size: 0.08, weight: 800 }); bTop.position.set(0, 0.12 + BH + 0.305, BZ); S.add(bTop);
    const FZ = BZ + 0.045, bx = u => -BW / 2 + u * BW, by = v => BY + (1 - v) * BH;   // v measured from the top, like image rows
    const flat = (x, y, w, h, col, z = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w * BW, h * BH), new THREE.MeshBasicMaterial({ color: col })); m.position.set(bx(x + w / 2), by(y + h / 2), FZ + 0.002 + z); m.layers.set(1); m.userData.noFit = true; S.add(m); return m; };
    flat(0, 0, 1, 0.5, '#CFE3EE'); flat(0, 0.5, 1, 0.3, '#D8D2C4'); flat(0, 0.8, 1, 0.2, '#8C8A86');
    flat(0, 0.88, 1, 0.012, '#F2F2F2', 0.001);
    GT.forEach(g => {
      if (g.k === 'bus') { flat(g.x, g.y + 0.04, g.w, g.h - 0.08, '#F2C230', 0.003); flat(g.x, g.y + g.h * 0.55, g.w, 0.025, '#151827', 0.004); for (let i = 0; i < 4; i++) flat(g.x + 0.02 + i * g.w / 4.3, g.y + 0.07, g.w / 6, g.h * 0.28, '#5B7A99', 0.004); flat(g.x + 0.03, g.y + g.h - 0.06, 0.05, 0.06, '#222', 0.004); flat(g.x + g.w - 0.08, g.y + g.h - 0.06, 0.05, 0.06, '#222', 0.004); }
      if (g.k === 'bike') { flat(g.x + 0.02, g.y + 0.02, g.w * 0.45, g.h * 0.5, '#3B3F8F', 0.003); flat(g.x, g.y + g.h * 0.55, g.w, g.h * 0.25, '#2B2B2B', 0.003); flat(g.x, g.y + g.h - 0.04, 0.035, 0.04, '#111', 0.004); flat(g.x + g.w - 0.035, g.y + g.h - 0.04, 0.035, 0.04, '#111', 0.004); }
      if (g.k === 'ped') { flat(g.x + g.w * 0.25, g.y, g.w * 0.5, g.h * 0.18, '#7A4A22', 0.003); flat(g.x, g.y + g.h * 0.18, g.w, g.h * 0.45, ['#C9774A', '#2F6B4F', '#8A3F8E'][Math.round(g.x * 10) % 3], 0.003); flat(g.x + g.w * 0.1, g.y + g.h * 0.63, g.w * 0.8, g.h * 0.37, '#2B2B2B', 0.003); }
    });
    // the YOLO grid
    const gridMat = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.55 });
    for (let i = 1; i < 7; i++) { const v = new THREE.Mesh(new THREE.PlaneGeometry(0.008, BH), gridMat); v.position.set(bx(i / 7), BY + BH / 2, FZ + 0.006); v.layers.set(1); v.userData.noFit = true; S.add(v); const h = new THREE.Mesh(new THREE.PlaneGeometry(BW, 0.008), gridMat); h.position.set(0, BY + i / 7 * BH, FZ + 0.006); h.layers.set(1); h.userData.noFit = true; S.add(h); }
    /* boxes: four bars each, from one instanced mesh, plus a confidence chip */
    const MAXB = CANDS.length;
    const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 0.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), MAXB * 4);
    bars.userData.noFit = true; bars.layers.set(1); bars.frustumCulled = false; S.add(bars);
    const chips = [...Array(24)].map(() => { const t = S.text('', { size: 0.06, weight: 800, color: '#FFFFFF', bg: '#151827', face: 'front' }); t.userData.noFit = true; S.add(t); return t; });
    /* ---------- the pipeline counters ---------- */
    const counters = [['guesses', C.grey], ['above threshold', C.gold], ['after NMS', C.teal]].map(([n, c], i) => {
      const x = -1.6 + i * 1.6, b = P.box(1.1, 0.42, 0.5, c, { r: 0.06 }); b.position.set(x, 0.12, 0.85); S.add(b);
      const t = S.text(n, { size: 0.07, weight: 800, face: 'front', color: '#FFFFFF' }); t.position.set(x, 0.2, 1.105); S.add(t);
      const v = S.text('', { size: 0.15, weight: 800, face: 'front', color: '#FFFFFF' }); v.position.set(x, 0.38, 1.105); S.add(v);
      const top = S.text(n, { size: 0.07, weight: 800, color: '#FFFFFF' }); top.position.set(x, 0.545, 0.85); S.add(top);
      if (i < 2) { const a = P.tube([V(x + 0.6, 0.28, 0.85), V(x + 1.0, 0.28, 0.85)], 0.02, '#8E91A3'); a.userData.noFit = true; S.add(a); }
      return { b, v };
    });
    /* ---------- detection ---------- */
    let R = null;
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    function detect() {
      const above = CANDS.filter(c => c.conf >= st.conf).sort((a, b) => b.conf - a.conf);
      let kept = above;
      if (st.nms) { kept = []; above.forEach(c => { if (!kept.some(k => k.k === c.k && iou(k, c) > st.iouT)) kept.push(c); }); }
      const matched = new Set(); let tp = 0;
      kept.forEach(k => { let best = -1, bi = 0; GT.forEach((g, gi) => { if (g.k === k.k && !matched.has(gi)) { const v = iou(g, k); if (v > bi) { bi = v; best = gi; } } }); if (bi >= 0.5) { matched.add(best); tp++; } });
      R = { above, kept, tp, found: matched.size, missed: GT.filter((_, i) => !matched.has(i)) };
    }
    function draw() {
      detect();
      const T = 0.012;
      for (let i = 0; i < MAXB; i++) {
        const b = R.kept[i];
        for (let e = 0; e < 4; e++) {
          const q = i * 4 + e;
          if (!b) { dummy.position.set(0, -20, 0); dummy.scale.setScalar(0.0001); dummy.updateMatrix(); bars.setMatrixAt(q, dummy.matrix); continue; }
          const x0 = bx(b.x), x1 = bx(b.x + b.w), y0 = by(b.y + b.h), y1 = by(b.y), z = FZ + 0.01 + i * 0.0004;
          if (e < 2) { dummy.position.set((x0 + x1) / 2, e ? y1 : y0, z); dummy.scale.set(x1 - x0 + T, T, 1); } else { dummy.position.set(e === 2 ? x0 : x1, (y0 + y1) / 2, z); dummy.scale.set(T, y1 - y0, 1); }
          dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); bars.setMatrixAt(q, dummy.matrix); bars.setColorAt(q, col.set(CLS[b.k].c));
        }
      }
      bars.instanceMatrix.needsUpdate = true; bars.instanceColor.needsUpdate = true;
      chips.forEach((c, i) => { const b = R.kept[i]; c.visible = !!b && i < 24; if (!b) return; c.userData.set(b.conf.toFixed(2)); c.position.set(bx(b.x) + 0.1, by(b.y) + 0.045, FZ + 0.02 + i * 0.0004); });
      [CANDS.length, R.above.length, R.kept.length].forEach((n, i) => counters[i].v.userData.set(String(n)));
    }
    draw();
    const precision = () => (R.kept.length ? R.tp / R.kept.length : 1), recall = () => R.found / GT.length;
    const controls = [
      { type: 'slider', label: 'Confidence threshold', min: 0.05, max: 0.95, step: 0.01, get: () => st.conf, set: v => { st.conf = v; draw(); } },
      { type: 'toggle', label: 'Non-max suppression', short: 'NMS', get: () => st.nms, set: v => { st.nms = v; draw(); } },
      { type: 'slider', label: 'NMS overlap limit (IoU)', min: 0.05, max: 0.9, step: 0.01, get: () => st.iouT, set: v => { st.iouT = v; draw(); } },
    ];
    const pct = v => `${Math.round(v * 100)}%`;
    const readouts = [
      { label: 'Boxes shown', get: () => ({ v: String(R.kept.length), sub: `${GT.length} objects really there`, bad: R.kept.length > GT.length * 1.6 }) },
      { label: 'Precision', get: () => ({ v: pct(precision()), sub: 'kept boxes that are right', good: precision() > 0.85, bad: precision() < 0.6 }) },
      { label: 'Recall', get: () => ({ v: pct(recall()), sub: 'objects found', good: recall() > 0.99, bad: recall() < 0.9 }) },
    ];
    const labels = [
      { name: 'grid', t: 'The grid', d: 'Each cell guesses boxes', icon: 'box', atV: V(-BW / 2, BY + BH * 0.85, BZ) },
      { name: 'boxes', t: 'Detected boxes', d: 'Colour: class; chip: confidence', icon: 'target', atV: V(-BW / 2, BY + BH * 0.35, BZ) },
      { name: 'counters', t: 'Clean-up stages', d: 'Threshold, then NMS', icon: 'scale', atV: V(-1.6 + 2 * 1.6 + 0.55, 0.3, 0.85) },
      { name: 'key', t: 'Three classes', d: 'Yellow bus, blue okada, red person', icon: 'eye', atV: V(BW / 2, BY + BH * 0.7, BZ) },
    ];
    const reset = () => { Object.assign(st, { conf: 0.5, nms: true, iouT: 0.5 }); draw(); };
    const breaks = [
      { label: 'Switch NMS off', hint: 'Keep every box above the threshold', on: () => { reset(); st.nms = false; draw(); }, off: reset },
      { label: 'Threshold too high', hint: 'Only boxes above 0.85', on: () => { reset(); st.conf = 0.85; draw(); }, off: reset },
      { label: 'NMS overlap too low', hint: 'IoU limit 0.1', on: () => { reset(); st.iouT = 0.1; draw(); }, off: reset },
    ];
    function status() {
      const p = precision(), r = recall(), names = [...new Set(R.missed.map(g => CLS[g.k].n))];
      if (!st.nms) return { ok: false, msg: `<b>A pile of boxes on everything.</b> Without NMS every confident guess stays, so ${R.kept.length} boxes cover ${GT.length} objects: several per bus, bike and person. Only ${pct(p)} of them can count as correct, because each object can be matched once.` };
      if (st.nms && st.iouT < 0.25 && R.missed.some(g => g.k === 'ped')) return { ok: false, msg: `<b>A person vanished.</b> With the overlap limit at ${st.iouT.toFixed(2)}, any box touching a more confident box of the same class is removed, and the two people standing side by side overlap a little. One of them is erased: recall ${pct(r)}. In crowds, NMS needs a higher limit.` };
      if (st.iouT > 0.65 && p < 0.75) return { ok: false, msg: `<b>Duplicates slip through.</b> With the overlap limit at ${st.iouT.toFixed(2)}, two boxes on the same bus must overlap almost completely before one is removed, so ${R.kept.length - R.tp} extra boxes survive. Precision is ${pct(p)}. Around 0.5 is usual.` };
      if (r < 0.8) return { ok: false, msg: `<b>Missed objects.</b> At a threshold of ${st.conf.toFixed(2)}, the less certain guesses are thrown away, and with them ${R.missed.length} real object${R.missed.length > 1 ? 's' : ''} (${names.join(', ')}). Recall is ${pct(r)}. People are small and partly hidden, so their scores are lower.` };
      if (p < 0.75) return { ok: false, msg: `<b>Seeing things.</b> At a threshold of ${st.conf.toFixed(2)}, weak guesses get through, and ${R.kept.length - R.tp} boxes sit on empty road or sky. Precision is ${pct(p)}. Raise the threshold.` };
      return { ok: true, msg: `<b>Every object, once.</b> Of ${CANDS.length} guesses, ${R.above.length} pass the threshold and NMS keeps ${R.kept.length}: precision ${pct(p)}, recall ${pct(r)}. Each bus, okada and person has one box.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'What and where', home: true, say: 'A street in Lagos: danfo buses, okadas and people. A detector must say what each thing is, and draw a box around it.', act: m => m.set({ conf: 0.5, nms: true, iouT: 0.5 }) },
    { t: 'A grid of guesses', home: true, say: 'YOLO splits the picture into a seven by seven grid. Every cell guesses boxes with a confidence. Without any clean up, every object gets a pile of boxes.', act: m => m.set({ nms: false, conf: 0.05 }) },
    { t: 'The threshold', home: true, say: 'First, drop every guess below a confidence threshold. The empty road and sky clear, but each object still has several boxes.', act: m => m.set({ conf: 0.5 }) },
    { t: 'Non max suppression', home: true, say: 'Then non max suppression: keep the most confident box, and remove any box of the same class that overlaps it too much. Now each object has one box.', act: m => m.set({ nms: true }) },
    { t: 'Too strict', home: true, say: 'Raise the threshold too far, and the less certain objects disappear: people, small and partly hidden, are missed first.', act: m => m.set({ conf: 0.85 }) },
    { t: 'Crowds', home: true, say: 'Squeeze the overlap limit, and two people standing side by side count as duplicates. One of them is erased. Crowded scenes need a gentler limit.', act: m => m.set({ conf: 0.5, iouT: 0.1 }) },
  ],
  check: [
    { q: 'What does non-max suppression do?', options: ['Keeps the most confident box and removes overlapping boxes of the same class', 'Removes the most confident box', 'Makes boxes bigger'], answer: 0, why: 'It turns a pile of guesses per object into one box.' },
    { q: 'What happens when the confidence threshold is too high?', options: ['Real but less certain objects are missed, so recall drops', 'More false boxes appear', 'Boxes overlap more'], answer: 0, why: 'Only the most confident guesses survive.' },
    { q: 'What does IoU measure?', options: ['How much two boxes overlap, as intersection divided by union', 'How confident a box is', 'How many classes there are'], answer: 0, why: '1 means identical boxes, 0 means no overlap.' },
  ],
  terms: [
    ['Object detection', 'Finding objects in an image and drawing a labelled box around each.'],
    ['Bounding box', 'A rectangle given by its position, width and height.'],
    ['Confidence', 'How sure the model is that a box holds an object of that class.'],
    ['IoU', 'Intersection over union: overlap between two boxes, from 0 to 1.'],
    ['Non-max suppression', 'Removing lower-confidence boxes that overlap a better one.'],
    ['Precision and recall', 'Share of boxes that are right, and share of objects found.'],
  ],
  deeper: '<p><b>Anchors and offsets.</b> Each grid cell predicts boxes as small adjustments to a few preset shapes, which makes learning tall people and wide buses easier.</p><p><b>mAP.</b> Detection papers sweep the confidence threshold, trace precision against recall, and average the area under that curve over classes: mean average precision.</p><p><b>About this machine.</b> The guesses are made up for this scene, but the threshold, NMS, IoU, precision and recall are computed exactly as a detector does.</p>',
  code: {
    title: 'IoU and non-max suppression',
    note: 'Adapted from the course\'s object detection lesson.',
    text: `
def iou(a, b):
    x0, y0 = max(a.x, b.x), max(a.y, b.y)
    x1, y1 = min(a.x + a.w, b.x + b.w), min(a.y + a.h, b.y + b.h)
    inter = max(0, x1 - x0) * max(0, y1 - y0)
    return inter / (a.w * a.h + b.w * b.h - inter)

def nms(boxes, conf_threshold=0.5, iou_limit=0.5):
    boxes = sorted([b for b in boxes if b.conf >= conf_threshold],
                   key=lambda b: b.conf, reverse=True)
    kept = []
    for b in boxes:
        if all(k.cls != b.cls or iou(k, b) <= iou_limit for k in kept):
            kept.append(b)
    return kept
`,
  },
};
