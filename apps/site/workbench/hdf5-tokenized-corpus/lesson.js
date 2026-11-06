// HDF5 tokenized corpus (phase 19, lesson 43): a Cape Town GPU trainer starves if data can't keep up. Tokens stored in chunked, sharded files; a dataloader reads windows through the page cache. Compare throughput of reading text and tokenizing on the fly with reading stored ids. GPU busy percentage is computed from rates.
function run(o) {
  const need = 800;
  const read = o.store === 'text' ? 90 : o.store === 'pickle' ? 200 : o.chunk ? 1400 : 500;
  const rate = read * (o.workers ** 0.8);
  const busy = Math.min(1, rate / need);
  const shardsLost = o.shards ? 1 : 24;
  return { rate: Math.round(rate), busy, shardsLost, memGB: o.store === 'pickle' ? 64 : 2 };
}

export default {
  slug: 'hdf5-tokenized-corpus',
  title: 'Storing tokens so the GPU never waits',
  description: 'A GPU that\'s starved of data is money burning. Store ids in chunks and shards, and read only what you need.',
  overview: 'A training run reads tokens at a huge rate, and a GPU waiting on data is money burning. Tokenizing text on the fly can\'t keep up. So tokenize once, and store integer ids. An HDF5 dataset holds them in resizable, chunked form, so reads touch only the chunks you need, and the page cache does the rest. Split the write across shards, so that a failure costs one file and writers can run in parallel. A sliding-window dataloader then copies into batch buffers only at batch time. Loading everything into memory is the common mistake. This lesson computes GPU utilisation for a trainer in Cape Town.',
  keywords: ['HDF5', 'dataloader', 'chunking', 'GPU utilisation', 'data pipeline', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { store: 'hdf5', chunk: true, shards: true, workers: 4 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const shelf = add(P.shelf(6, { cell: 0.3, d: 0.5, levels: 2, lh: 0.32 })); shelf.position.set(-1.6, 0.03, -0.1);
    const workers = Array.from({ length: 8 }, (_, i) => { const r = add(P.robot(BLUE, { scale: 0.3 })); r.position.set(-0.45 + (i % 4) * 0.28, 0.03, -0.3 + Math.floor(i / 4) * 0.5); return r; });
    const b = add(P.belt(V(0.7, 0, 0), V(1.45, 0, 0), { w: 0.3, speed: 1.2 }));
    const gpu = P.box(0.7, 0.5, 0.7, '#2C2D31', { r: 0.05 }); gpu.position.set(1.8, 0.03, 0); S.add(gpu);
    const dial = add(P.dial(0.3)); dial.position.set(1.8, 0.03, 0.62);
    S.add(P.keep(-2.45, 2.5, 0.9, -0.72, 0.95));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      shelf.userData.set({ fill: Array.from({ length: 12 }, (_, i) => (st.shards || i < 3) ? (st.store === 'hdf5' ? '#7B6FA8' : '#C9A08A') : null) });
      workers.forEach((r, i) => { r.visible = i < st.workers; r.userData.set({ busy: true }); });
      dial.userData.set({ v: 1 - R.busy });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const SK = ['text', 'pickle', 'hdf5'];
    const controls = [
      { type: 'buttons', label: 'Stored as', options: ['Raw text', 'One big pickle', 'HDF5 ids'], get: () => SK.indexOf(st.store), act: i => set({ store: SK[i] }) },
      { type: 'toggle', label: 'Chunked layout', short: 'Chunks', get: () => st.chunk, set: v => set({ chunk: !!v }) },
      { type: 'toggle', label: 'Split into shards', short: 'Shards', get: () => st.shards, set: v => set({ shards: !!v }) },
      { type: 'slider', label: 'Loader workers', min: 1, max: 8, step: 1, get: () => st.workers, set: v => set({ workers: v }) },
    ];
    const readouts = [
      { label: 'GPU busy', get: () => ({ v: `${Math.round(R.busy * 100)}%`, sub: `${R.rate} MB/s read`, good: R.busy > 0.95, bad: R.busy < 0.6 }) },
      { label: 'Memory', get: () => ({ v: `${R.memGB} GB`, good: R.memGB < 8, bad: R.memGB > 32 }) },
      { label: 'A failed write costs', get: () => ({ v: `${R.shardsLost} hours`, good: st.shards, bad: !st.shards }) },
    ];
    const labels = [
      { name: 's', t: 'Shards on disk', d: 'Integer ids in chunks', icon: 'box', atV: V(-2.42, 0.3, -0.1) },
      { name: 'g', t: 'The GPU', d: 'Needle right: starving', icon: 'target', atV: V(2.2, 0.3, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Tokenize on the fly', hint: 'CPU can\'t keep up', on: () => set({ ...D0, store: 'text' }), off: reset },
      { label: 'Load it all into memory', hint: 'one big pickle', on: () => set({ ...D0, store: 'pickle' }), off: reset },
      { label: 'No chunks, no shards', hint: 'one big write', on: () => set({ ...D0, chunk: false, shards: false }), off: reset },
    ];
    function status() {
      if (st.store === 'text') return { ok: false, msg: `<b>GPU busy ${Math.round(R.busy * 100)}%.</b> The CPU is tokenizing, and the GPU waits. Tokenize once, then store ids.` };
      if (st.store === 'pickle') return { ok: false, msg: `<b>${R.memGB} GB of memory, per worker, and GPU at ${Math.round(R.busy * 100)}%.</b> It doesn\'t scale past your RAM.` };
      if (!st.shards) return { ok: false, msg: `<b>A crash at hour ${R.shardsLost} loses the lot.</b> Shards bound the failure, and let writers run in parallel.` };
      if (R.busy < 0.95) return { ok: false, msg: `<b>GPU at ${Math.round(R.busy * 100)}%.</b> Add loader workers, or use chunks that match your reads.` };
      return { ok: true, msg: `<b>GPU at ${Math.round(R.busy * 100)}%, reading ${R.rate} MB/s, using ${R.memGB} GB.</b> The data keeps up, and your money goes on training.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 1 / Math.max(0.3, R.busy) * 0.5 && b.userData.count() < 4) { u = 0; b.userData.send(SAF, { size: 0.14 }); } }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A starving GPU', home: true, say: 'A trainer in Cape Town rents a GPU by the hour. Read raw text, and it sits waiting for the CPU.', act: m => m.set({ store: 'text', chunk: true, shards: true, workers: 4 }) },
    { t: 'Store ids', home: true, say: 'Tokenize once, and store integers. The read rate jumps.', act: m => m.set({ store: 'hdf5', chunk: false, shards: true, workers: 2 }) },
    { t: 'Chunks', home: true, say: 'A chunked layout lets a read touch only what it needs.', act: m => m.set({ store: 'hdf5', chunk: true, shards: true, workers: 2 }) },
    { t: 'Shards', home: true, say: 'Many smaller files bound a failure, and allow parallel writes.', act: m => m.set({ store: 'hdf5', chunk: true, shards: false, workers: 4 }) },
    { t: 'Not all in memory', home: true, say: 'One big pickle doesn\'t scale. Let the page cache do that job.', act: m => m.set({ store: 'pickle', chunk: true, shards: true, workers: 4 }) },
    { t: 'Keep it fed', home: true, say: 'A few workers, and the dial stays left. Your money goes on training.', act: m => m.set({ store: 'hdf5', chunk: true, shards: true, workers: 4 }) },
  ],
  check: [
    { q: 'Why store token ids?', options: ['Tokenizing on the fly starves the GPU', 'Text is illegal', 'Ids look nicer'], answer: 0, why: 'Do the work once.', hint: 'Try Tokenize on the fly.' },
    { q: 'What do shards give you?', options: ['A smaller failure, and parallel writes', 'Better accuracy', 'Larger vocabulary'], answer: 0, why: 'A crash costs one file.', hint: 'Try No chunks, no shards.' },
    { q: 'What does chunking help?', options: ['Reads touch only what they need', 'Prompts', 'Tokenizer training'], answer: 0, why: 'Less I/O per batch.', hint: 'Toggle Chunks.' },
  ],
  terms: [['HDF5', 'A file format for big arrays.'], ['Chunk', 'A block stored together.'], ['Shard', 'One of many files.'], ['Page cache', 'The OS keeping reads in RAM.'], ['Dataloader', 'What feeds batches.']],
  deeper: '<p><b>Other formats.</b> Memory-mapped binary files are simpler, and common. The principle is the same.</p><p><b>Match chunks to reads.</b> Chunk size should suit your window size.</p><p><b>Rates</b> are round numbers.</p>',
  code: {
    title: 'Write and read',
    note: 'Adapted from the course\'s corpus writer (code/main.py).',
    text: `
with h5py.File(f"shard-{n}.h5", "w") as f:
    d = f.create_dataset("ids", shape=(0,), maxshape=(None,),
                         chunks=(1 << 16,), dtype="u2")
    for doc in docs:
        append(d, tok(doc))

window = h5["ids"][start:start + length + 1]     # reads a few chunks
`,
  },
};
