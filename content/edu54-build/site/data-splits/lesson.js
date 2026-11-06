// Data management: rows of a dataset go through a shuffle drum (with a seed) into three bins: train, validation and a locked test bin.
// A shelf compares the same data as CSV and as Parquet; a disk shows what downloading everything costs, against streaming.
// Break it: no fixed seed (the test set changes every run), test rows leaking into training, downloading 800 GB onto a 500 GB disk.
const N = 50, NTR = 40, NVA = 5;
const CX = -2.55, CZ = -0.3, DX = -0.85, TRX = 0.95, TRZ = -0.55, VX = 2.6, VZ = -0.95, TEX = 2.6, TEZ = 0.35;
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const FMT = [{ n: 'CSV', gb: 1.0, s: 40 }, { n: 'Parquet', gb: 0.23, s: 3 }];

export default {
  slug: 'data-splits',
  title: 'Data: splits, formats and streaming',
  description: 'Send fifty rows of farm records through a shuffle drum into train, validation and a locked test bin. Fix the seed and the split repeats exactly; forget it and your test set changes every run. Then compare CSV with Parquet, and stream instead of downloading 800 GB.',
  overview: 'Before any model learns, the data has to be split: most rows for training, a few for checking progress (validation), and a few locked away for the final exam (test). Shuffle with a fixed seed and the split is the same every time, so results can be compared. Store big tables as Parquet rather than CSV: a fraction of the size, read in seconds. And when a dataset is bigger than your disk, stream it.',
  keywords: ['train validation test split', 'random seed reproducible', 'data leakage', 'parquet vs csv', 'streaming datasets'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0.2], dir: [0.2, 1.1, 1.3], half: 3.1, wide: 7 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { seed: 42, fixed: true, fmt: 1, stream: true, leak: false, split: null, prevTest: null, t: 0, runs: 0 };
    /* ---------- the dataset crate ---------- */
    const crate = P.box(2.0, 0.42, 1.25, '#A87A4F', { r: 0.08 }); crate.position.set(CX, 0, CZ); S.add(crate);
    const crateF = S.text('FARM RECORDS', { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF', maxW: 1.9 }); crateF.position.set(CX, 0.21, CZ + 0.63); S.add(crateF);
    const home = i => V(CX - 0.81 + (i % 10) * 0.18, 0.42, CZ - 0.36 + Math.floor(i / 10) * 0.18);
    /* ---------- the shuffle drum and its seed ---------- */
    const drumG = new THREE.Group(); drumG.position.set(DX, 0.75, CZ); S.add(drumG);
    const drum = P.cyl(0.42, 0.9, '#E3A72F', { seg: 18 }); drum.rotation.x = Math.PI / 2; drum.position.z = -0.45; drumG.add(drum);
    for (const z of [-0.5, 0.5]) { const leg = P.box(0.1, 0.55, 0.1, '#5B4636', { r: 0.02 }); leg.position.set(DX, 0, CZ + z); S.add(leg); }
    const seedT = S.text('', { size: 0.13, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.3 }); seedT.position.set(DX, 1.4, CZ); seedT.userData.noFit = true; S.add(seedT);
    /* ---------- the three bins ---------- */
    function bin(x, z, w, d, name, col) {
      const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
      const base = P.box(w, 0.08, d, col, { r: 0.05 }); g.add(base);
      for (const [px, pz, sw, sd] of [[0, -d / 2, w, 0.05], [0, d / 2, w, 0.05], [-w / 2, 0, 0.05, d], [w / 2, 0, 0.05, d]]) { const wall = P.box(sw, 0.35, sd, col, { r: 0 }); wall.position.set(px, 0, pz); g.add(wall); }
      const f = S.text(name.toUpperCase(), { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF', maxW: w - 0.1 }); f.position.set(0, 0.2, d / 2 + 0.03); g.add(f);
      return g;
    }
    bin(TRX, TRZ, 1.75, 1.3, 'Train · 80%', '#1C9A94');
    bin(VX, VZ, 0.85, 0.75, 'Valid · 10%', '#3D6BD6');
    bin(TEX, TEZ, 0.85, 0.75, 'Test · 10%', '#8A3F8E');
    const lid = P.box(0.9, 0.05, 0.8, '#8A3F8E', { r: 0.03 }); lid.position.set(TEX, 0.36, TEZ); S.add(lid);
    const lock = P.box(0.22, 0.18, 0.08, '#E3A72F', { r: 0.03 }); lock.position.set(TEX, 0.26, TEZ + 0.41); S.add(lock);
    const lidT = S.text('LOCKED', { size: 0.11, weight: 800, color: '#FFFFFF', maxW: 0.8 }); lidT.position.set(TEX, 0.415, TEZ); S.add(lidT);
    const slot = (b, k) => b === 0 ? V(TRX - 0.7 + (k % 8) * 0.2, 0.1, TRZ - 0.42 + Math.floor(k / 8) * 0.2) : b === 1 ? V(VX - 0.2 + (k % 3) * 0.2, 0.1, VZ - 0.1 + Math.floor(k / 3) * 0.2) : V(TEX - 0.2 + (k % 3) * 0.2, 0.1, TEZ - 0.1 + Math.floor(k / 3) * 0.2);
    /* ---------- the rows: fifty little blocks, each its own colour so you can follow it ---------- */
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.15, 0.15, 0.15).translate(0, 0.075, 0), new THREE.MeshLambertMaterial(), N + 3);
    im.castShadow = true; im.userData.noFit = true; S.add(im);
    const col = new THREE.Color(), dummy = new THREE.Object3D();
    for (let i = 0; i < N + 3; i++) im.setColorAt(i, col.setHSL(((i % N) * 0.618) % 1, 0.55, 0.58));
    const ghosts = [...Array(3)].map(() => { const r = P.box(0.19, 0.19, 0.19, C.red, { r: 0, m: { opacity: 0.45 }, cast: false }); r.userData.noFit = true; S.add(r); return r; });
    /* ---------- the shelf of formats and the disk ---------- */
    const stacks = FMT.map((f, i) => {
      const x = -2.95 + i * 0.95, m = new THREE.MeshLambertMaterial({ color: i ? '#3E9B5F' : '#C9774A' });
      const b = P.box(0.7, 1.4 * f.gb, 0.6, '#ccc', { r: 0.04, material: m }); b.position.set(x, 0, 1.45); S.add(b);
      const t = S.text(`${f.n}\n${f.gb >= 1 ? '1 GB' : '230 MB'}`, { size: 0.11, weight: 800, color: '#FFFFFF', maxW: 0.65, maxH: 0.3 }); t.position.set(x, 1.4 * f.gb + 0.005, 1.45); S.add(t);
      const tf = S.text(`${f.s} s to read`, { size: 0.09, face: 'front', weight: 750, color: '#FFFFFF', maxW: 0.65 }); tf.position.set(x, Math.min(0.1, 0.7 * f.gb), 1.755); S.add(tf);
      return { b, m };
    });
    const disk = P.cyl(0.42, 1.0, '#D8D4C8', { m: { opacity: 0.3 }, cast: false }); disk.material.depthWrite = false; disk.position.set(-0.85, 0, 1.3); S.add(disk);
    const fillM = new THREE.MeshLambertMaterial({ color: C.green });
    const fill = P.cyl(0.38, 1, C.green, { material: fillM }); fill.position.set(-0.85, 0.01, 1.3); S.add(fill);
    const diskT = S.text('', { size: 0.12, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.6 }); diskT.position.set(-0.85, 1.4, 1.3); diskT.userData.noFit = true; S.add(diskT);
    const diskF = S.text('YOUR DISK · 500 GB', { size: 0.1, weight: 800, maxW: 1.4 }); diskF.position.set(-0.85, 0.005, 1.87); S.add(diskF);
    /* ---------- splitting ---------- */
    function split() {
      const seed = st.fixed ? st.seed : Math.floor(Math.random() * 1e6);
      const r = rng(seed), idx = [...Array(N).keys()];
      for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      const bins = new Array(N);
      idx.forEach((row, k) => { bins[row] = k < NTR ? [0, k] : k < NTR + NVA ? [1, k - NTR] : [2, k - NTR - NVA]; });
      st.prevTest = st.split ? st.split.test : null;
      st.split = { bins, test: idx.slice(NTR + NVA).sort((a, b) => a - b).join(), seed };
      st.t = 0; st.runs++;
    }
    function update(dt, t) {
      st.t += dt * (S.reduced ? 5 : 1);
      drum.rotation.y += dt * (st.t < 3 ? 6 : 0.4);
      const sp = st.split;
      for (let i = 0; i < N; i++) {
        const [b, k] = sp.bins[i], u = Math.max(0, Math.min(1, (st.t - i * 0.04) / 1.1));
        const a = home(i), m = V(DX, 0.9, CZ), z = slot(b, k);
        // from the crate up through the drum, then down into its bin
        const p = u < 0.5 ? a.clone().lerp(m, u * 2) : m.clone().lerp(z, (u - 0.5) * 2);
        p.y += Math.sin(u * Math.PI) * 0.5;
        dummy.position.copy(p); dummy.scale.setScalar(1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
      }
      // a leak: three test rows copied into the training bin too
      for (let j = 0; j < 3; j++) {
        const row = sp.test.split(',').map(Number)[j], on = st.leak && st.t > 2.4;
        dummy.position.copy(on ? slot(0, NTR + j) : V(0, -5, 0)); dummy.scale.setScalar(on ? 1 : 0.001); dummy.updateMatrix(); im.setMatrixAt(N + j, dummy.matrix);
        im.setColorAt(N + j, col.setHSL((row * 0.618) % 1, 0.55, 0.58));
        ghosts[j].visible = on; if (on) ghosts[j].position.copy(slot(0, NTR + j)).add(V(0, -0.02, 0));
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      seedT.userData.set(st.fixed ? `seed ${st.seed}` : 'seed: random');
      stacks.forEach((s, i) => s.m.emissive.set(i === st.fmt ? '#FFFFFF' : '#000000').multiplyScalar(0.18));
      const used = st.stream ? 2 : 800, u = used / 500;
      fill.scale.y = Math.max(0.02, Math.min(1, u)) * 0.98; fillM.color.set(u > 1 ? C.red : C.green);
      diskT.userData.set(st.stream ? 'streaming: 2 GB at a time' : '800 GB needed · disk full');
    }
    split();
    const sameTest = () => st.prevTest == null || st.prevTest === st.split.test;
    const controls = [
      { type: 'button', label: 'Split again', short: 'Split', act: split },
      { type: 'toggle', label: 'Fixed seed', get: () => st.fixed, set: v => { st.fixed = v; split(); if (v) st.prevTest = null; } },
      { type: 'slider', label: 'Seed', min: 0, max: 99, step: 1, get: () => st.seed, set: v => { st.seed = Math.round(v); st.prevTest = null; split(); st.prevTest = null; } },
      { type: 'buttons', label: 'Store the table as', options: FMT.map(f => f.n), get: () => st.fmt, act: i => { st.fmt = i; } },
      { type: 'toggle', label: 'Stream instead of downloading', short: 'Stream', get: () => st.stream, set: v => { st.stream = v; } },
    ];
    const readouts = [
      { label: 'Split', get: () => ({ v: `${NTR} / ${NVA} / ${N - NTR - NVA}`, sub: 'train / valid / test' }) },
      { label: 'Test set', get: () => ({ v: sameTest() ? 'same as last run' : 'changed', good: sameTest() && !st.leak, bad: !sameTest() }) },
      { label: 'Test score', get: () => ({ v: st.leak ? '99%' : '84%', bad: st.leak, sub: st.leak ? 'too good to be true' : 'honest' }) },
    ];
    const labels = [
      { name: 'data', t: 'The dataset', d: 'Fifty rows, each its own colour', icon: 'box', atV: V(CX - 1.0, 0.42, CZ - 0.62) },
      { name: 'formats', t: 'CSV or Parquet', d: 'The same table, stored two ways', icon: 'scale', atV: V(-3.3, 0.02, 1.75) },
      { name: 'train', t: 'Train and validation', d: 'Learn here, check progress here', icon: 'spark', atV: V(VX + 0.43, 0.35, VZ - 0.37) },
      { name: 'test', t: 'The locked test set', d: 'Opened once, at the very end', icon: 'check', atV: V(TEX + 0.45, 0.38, TEZ + 0.4) },
    ];
    const reset = () => { Object.assign(st, { seed: 42, fixed: true, fmt: 1, stream: true, leak: false, split: null }); split(); };
    const breaks = [
      { label: 'No fixed seed', hint: 'Split twice', on: () => { reset(); st.fixed = false; split(); split(); }, off: reset },
      { label: 'Test rows leak into training', hint: 'Three rows in both bins', on: () => { reset(); st.leak = true; }, off: reset },
      { label: 'Download all 800 GB', hint: 'Onto a 500 GB disk', on: () => { reset(); st.stream = false; }, off: reset },
    ];
    function status() {
      if (st.leak) return { ok: false, msg: `<b>99% on the test: too good to be true.</b> Three test rows were also put in the training bin (circled red), so the model was examined on answers it had already seen. Split once, by row, and never let a row sit in two bins.` };
      if (!st.stream) return { ok: false, msg: `<b>Disk full.</b> The whole dataset is 800 GB and the disk holds 500. Streaming reads the rows a little at a time as training needs them, so only a couple of gigabytes are ever on disk.` };
      if (!sameTest()) return { ok: false, msg: `<b>The test set changed.</b> Without a fixed seed every split shuffles differently, so this run is examined on different rows from the last one. Scores can't be compared, and rows drift from test into training between runs. Fix the seed.` };
      if (st.t < 3) return { msg: `<b>Shuffling with seed ${st.split.seed}…</b> Every row goes through the drum and lands in a bin: 40 to train, 5 to validation, 5 to the locked test bin.` };
      return { ok: true, msg: `<b>Split with seed ${st.seed}.</b> Run it again and the same rows land in the same bins, every time. Stored as ${FMT[st.fmt].n}: ${FMT[st.fmt].gb >= 1 ? '1 GB' : '230 MB'}, read in ${FMT[st.fmt].s} seconds.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, split, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'Rows to split', home: true, say: 'Here are fifty rows of farm records: maize yields from Kenya, Ghana and Malawi. Each row has its own colour, so you can follow it.', act: m => m.reset() },
    { t: 'Shuffle first', focus: [-0.85, 0.8, -0.3], zoom: 1.5, say: 'First the rows are shuffled, so the bins get a fair mix. The shuffle is driven by a seed: the same seed gives the same shuffle every time.', act: m => m.split(), wait: 4 },
    { t: 'Three bins', focus: [1.6, 0.3, -0.4], zoom: 1.35, say: 'Most rows go to training. A few go to validation, to check progress while the model learns. And a few go into the test bin, which stays locked until the very end.' },
    { t: 'Same seed, same split', home: true, say: 'Split again with the same seed and every row lands exactly where it did before. That is what makes two experiments comparable.', act: m => m.split(), wait: 4 },
    { t: 'CSV or Parquet', focus: [-2.5, 0.5, 1.45], zoom: 1.45, say: 'How you store a table matters too. The same rows as Parquet take a fraction of the space of CSV, and load in seconds instead of minutes.' },
    { t: 'Stream the giants', focus: [-0.85, 0.6, 1.3], zoom: 1.45, say: 'Some datasets are bigger than your whole disk. Stream them: read the rows a little at a time, as training needs them.' },
  ],
  check: [
    { q: 'Why fix the random seed when splitting?', options: ['To make training faster', 'So the same rows land in the same bins every run, and results can be compared', 'Because shuffling is not allowed'], answer: 1, why: 'A fixed seed gives the same shuffle every time, so the test set never changes between experiments.' },
    { q: 'A model scores 99% on the test set because some test rows were also in training. This is called…', options: ['Data leakage', 'Streaming', 'Validation'], answer: 0, why: 'The model saw the answers before the exam. A row must only ever sit in one bin.' },
    { q: 'A dataset is 800 GB and your disk holds 500 GB. What do you do?', options: ['Delete half the rows', 'Stream it, a little at a time', 'Convert it to CSV'], answer: 1, why: 'Streaming reads rows as they are needed, so the whole set never has to fit on disk.' },
  ],
  terms: [
    ['Training set', 'The rows the model learns from, usually about 80%.'],
    ['Validation set', 'Rows used to check progress during training and to tune settings.'],
    ['Test set', 'Rows locked away for one final, honest score.'],
    ['Random seed', 'A starting number for the shuffle; the same seed gives the same order.'],
    ['Data leakage', 'When rows (or clues) from the test set reach training, making scores look better than they are.'],
    ['Parquet', 'A compressed, column-by-column file format: smaller and faster than CSV for big tables.'],
  ],
  deeper: '<p><b>Why columns?</b> CSV stores a table row by row as text. Parquet stores each column together and compresses it; columns of similar values squeeze very small, and a program can read just the columns it needs.</p><p><b>Leaks are sneaky.</b> The same farm measured twice, or the same photo cropped two ways, can sit in both training and test even when no row is copied. Split by farm, by person or by date, not just by row, when rows are related.</p><p><b>Models are files too.</b> Downloaded models and datasets are cached in one folder on disk, so the second load is instant. Keep that folder out of git.</p>',
  code: {
    title: 'A reproducible split, and streaming',
    note: 'Adapted from the course\'s data lesson.',
    text: `
from datasets import load_dataset

ds = load_dataset("csv", data_files="farm_records.csv")["train"]

# 80 / 10 / 10 with a fixed seed: the same split every run
first = ds.train_test_split(test_size=0.2, seed=42)
rest = first["test"].train_test_split(test_size=0.5, seed=42)
train, valid, test = first["train"], rest["train"], rest["test"]

# store big tables as Parquet: smaller, faster to read
train.to_parquet("train.parquet")

# a dataset bigger than the disk: stream it
big = load_dataset("allenai/c4", "en", split="train", streaming=True)
for i, row in enumerate(big):
    if i == 3:
        break
    print(row["text"][:80])
`,
  },
};
