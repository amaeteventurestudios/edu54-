// Large corpus downloader (phase 19, lesson 42): a Lagos team pulls a 200 GB corpus over a poor link. Shards download with byte-range resume, and a manifest of hashes checks each one. MinHash near-duplicate removal cuts repeats. Twelve shards; the network drops at one point. Counts are computed.
const SHARDS = 12, DUP = 0.28;
function run(o) {
  const dropAt = 5, partial = 0.41;
  const redo = o.resume ? 0 : dropAt + partial, total = SHARDS + redo, bad = o.hash ? 0 : 1;
  const kept = SHARDS * (o.dedup ? 1 - DUP : 1);
  return { total, redo, bad, kept, gb: Math.round(kept / SHARDS * 200), waste: redo / SHARDS };
}

export default {
  slug: 'large-corpus-downloader',
  title: 'Downloading a corpus that won\'t fit in one go',
  description: 'Two hundred gigabytes on a shaky link. Resume, hash and remove duplicates, so a dropped line doesn\'t cost a day.',
  overview: 'The first time you pull a 200 GB corpus, the network drops at 41 percent, the script exits, and you start again. A real downloader treats failure as normal. Stream each shard, so that nothing has to fit in memory. Save progress and resume with an HTTP Range request from a verified byte offset. Keep a manifest with a content hash per shard, so that a damaged file is caught. Web text is full of repeats, and near-duplicates waste training, so a MinHash signature per document, bucketed by LSH, finds them cheaply. On a slow or costly link, this is not a nicety. This lesson runs twelve shards for a team in Lagos.',
  keywords: ['data pipeline', 'HTTP range', 'MinHash', 'deduplication', 'corpus', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { resume: true, hash: true, dedup: true, drop: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.2 + i * 0.28;
    const C = Array.from({ length: SHARDS }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.26, 0.4, 0.5, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, -0.2); S.add(b); return m; });
    const hook = add(P.lamp('#D9483B', { h: 0.2, r: 0.09 })); hook.position.set(X(5), 0.43, -0.2); hook.userData.noFit = true;
    const pipe = add(P.pipe([V(-2.3, 0.14, 0.42), V(-0.8, 0.14, 0.42), V(0.8, 0.14, 0.42)], SAF, { r: 0.05, n: 6, speed: 0.4 }));
    const tank = add(P.tank(0.8, 0.9, 0.7, GOOD)); tank.position.set(1.65, 0.08, 0.1);
    const jar = add(P.jar(0.26, 0.7, { max: 12 })); jar.position.set(2.25, 0.03, -0.1);
    S.add(P.keep(-2.45, 2.55, 1.05, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      C.forEach((m, i) => m.color.set(st.drop && !st.resume && i <= 5 ? BAD : !st.hash && i === 8 ? RED : i === 5 && st.drop ? SAF : GOOD));
      hook.visible = !!st.drop; tank.userData.set({ level: R.kept / SHARDS * 0.95 }); jar.userData.set({ n: Math.min(12, Math.round(R.total * 0.7)) });
      pipe.userData.set({ on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('drop', 'The network drops', 'Drop'), tg('resume', 'Resume from a byte offset', 'Resume'), tg('hash', 'Check a hash per shard', 'Hashes'), tg('dedup', 'Remove near-duplicates', 'Dedup')];
    const readouts = [
      { label: 'Data pulled', get: () => ({ v: `${R.total.toFixed(1)} of ${SHARDS} shards`, sub: `${Math.round(R.waste * 100)}% wasted`, good: !R.redo, bad: R.redo > 2 }) },
      { label: 'Bad shards', get: () => ({ v: `${R.bad}`, sub: st.hash ? 'caught by hash' : 'silently damaged', good: !R.bad, bad: R.bad > 0 }) },
      { label: 'Corpus kept', get: () => ({ v: `${R.gb} GB`, sub: st.dedup ? 'after dedup' : 'with repeats' }) },
    ];
    const labels = [
      { name: 's', t: 'Twelve shards', d: 'Gold: resumed. Coral: redone', icon: 'box', atV: V(X(0) - 0.13, 0.2, -0.2) },
      { name: 'j', t: 'Data paid for', d: 'Bandwidth has a cost', icon: 'money', atV: V(2.5, 0.4, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Start again on failure', hint: 'no resume', on: () => set({ ...D0, resume: false }), off: reset },
      { label: 'Trust the file size', hint: 'no hash', on: () => set({ ...D0, hash: false }), off: reset },
      { label: 'Keep the repeats', hint: 'no dedup', on: () => set({ ...D0, dedup: false }), off: reset },
    ];
    function status() {
      if (st.drop && !st.resume) return { ok: false, msg: `<b>${R.redo.toFixed(1)} shards pulled twice.</b> On a metered link that is real money and a lost day. Range requests pick up where it stopped.` };
      if (!st.hash) return { ok: false, msg: '<b>One shard is damaged, and nothing noticed.</b> Same size, wrong bytes. Training will fail days later, or worse, it won\'t.' };
      if (!st.dedup) return { ok: false, msg: `<b>${R.gb} GB, of which about a quarter is repeats.</b> Near-duplicates waste compute and can leak into test sets.` };
      return { ok: true, msg: `<b>${R.gb} GB kept, with ${R.total.toFixed(1)} shards pulled.</b> The drop cost nothing, as the download resumed from a verified offset.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two hundred gigabytes', home: true, say: 'A team in Lagos pulls a large corpus over a shaky link. At shard six, the line drops.', act: m => m.set({ resume: false, hash: true, dedup: false, drop: true }) },
    { t: 'Start again?', home: true, say: 'A naive script starts over. A day of bandwidth is gone.', act: m => m.set({ resume: false, hash: true, dedup: false, drop: true }) },
    { t: 'Resume', home: true, say: 'A range request continues from a verified byte. The drop costs nothing.', act: m => m.set({ resume: true, hash: true, dedup: false, drop: true }) },
    { t: 'A hash per shard', home: true, say: 'A manifest of hashes catches damage. Size alone doesn\'t.', act: m => m.set({ resume: true, hash: false, dedup: false, drop: true }) },
    { t: 'Near-duplicates', home: true, say: 'The web repeats itself. MinHash finds near-copies, without comparing every pair.', act: m => m.set({ resume: true, hash: true, dedup: true, drop: true }) },
    { t: 'Failure is normal', home: true, say: 'Treat dropped lines as normal, and the pipeline just keeps going.', act: m => m.set({ resume: true, hash: true, dedup: true, drop: true }) },
  ],
  check: [
    { q: 'How do you resume a download?', options: ['An HTTP Range request from a verified offset', 'Rename the file', 'Restart'], answer: 0, why: 'It continues from the byte you trust.', hint: 'Try Start again on failure.' },
    { q: 'Why hash each shard?', options: ['Size alone misses damage', 'To compress it', 'To speed it up'], answer: 0, why: 'Same size can mean wrong bytes.', hint: 'Try Trust the file size.' },
    { q: 'What does MinHash find?', options: ['Near-duplicate documents', 'Bad words', 'Slow servers'], answer: 0, why: 'Without comparing all pairs.', hint: 'Try Keep the repeats.' },
  ],
  terms: [['Shard', 'One file of a split corpus.'], ['Range request', 'Asking for part of a file.'], ['Manifest', 'A list of shards and hashes.'], ['MinHash', 'A short signature of a document.'], ['LSH', 'Bucketing similar signatures.']],
  deeper: '<p><b>Stream.</b> Decompress as you read, so nothing has to fit in memory.</p><p><b>Licences.</b> Keep source and licence in the manifest.</p><p><b>Shard numbers</b> are a round example.</p>',
  code: {
    title: 'Resume',
    note: 'Adapted from the course\'s downloader (code/main.py).',
    text: `
def fetch(url, path):
    done = path.stat().st_size if path.exists() else 0
    req = Request(url, headers={"Range": f"bytes={done}-"})
    with urlopen(req) as r, open(path, "ab") as f:
        shutil.copyfileobj(r, f)
    assert sha256(path) == manifest[url]
`,
  },
};
