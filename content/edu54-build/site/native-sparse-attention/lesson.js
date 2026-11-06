// Native sparse attention: a market office in Kumasi asks who signed the lease for stall 12, and when. The two lines sit far back in a long file of records.
// Token scores (query · key) are simulated for every token: a slow topic drift (sd 0.3, so related passages score alike) plus white noise (sd 1),
// a recency bonus 4·e^(−distance/150) for the words just written, and two lines of 16 tokens scoring 8 (the signer at 12% of the file, the date at 41%).
// Summaries are mean-pooled, so a block's summary score is the mean of its tokens' scores. Selection takes the top k blocks by summary score,
// skipping blocks the window already covers. A line is found when its block is read in full. Keys per query = N/l summaries + k·l chosen tokens + W window.
const NS = [16384, 65536, 131072], LS = [32, 64, 128, 512], KS = [1, 4, 16], W = 512, M = 16, HIT = 8, FACTS = [0.12, 0.41];
function gauss(seed) { let t = seed >>> 0; const u = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return (((r ^ (r >>> 14)) >>> 0) + 1) / 4294967297; };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u()); }
const cache = {};
function scores(N) {
  if (cache[N]) return cache[N];
  const g = gauss(23), s = new Float64Array(N), a = Math.exp(-1 / 600); let topic = 0;
  for (let i = 0; i < N; i++) { topic = a * topic + Math.sqrt(1 - a * a) * g(); s[i] = 0.3 * topic + g() + 4 * Math.exp(-(N - 1 - i) / 150); }
  const at = FACTS.map(f => { const p = Math.floor(N * f); return p - (p % 64) + 16; });
  for (const p of at) for (let j = 0; j < M; j++) s[p + j] = HIT;
  return (cache[N] = { s, at });
}
function run(st) {
  const N = NS[st.n], l = LS[st.l], k = KS[st.k], { s, at } = scores(N), nb = Math.ceil(N / l), cmp = new Float64Array(nb);
  for (let b = 0; b < nb; b++) { let t = 0, c = 0; for (let i = b * l; i < Math.min(N, (b + 1) * l); i++) { t += s[i]; c++; } cmp[b] = t / c; }
  const win = st.mode === 2 || (st.mode === 1 && st.win), wb = win ? Math.floor((N - W) / l) : nb;
  const cand = []; for (let b = 0; b < wb; b++) cand.push(b);
  cand.sort((x, y) => cmp[y] - cmp[x]);
  const sel = st.mode === 1 ? cand.slice(0, k) : [], fb = at.map(p => Math.floor(p / l));
  const found = fb.map(b => st.mode === 0 || sel.includes(b)), rank = fb.map(b => cand.indexOf(b) + 1);
  let recent = 0; if (st.mode === 0 || win) recent = 1; else { for (const b of sel) recent += Math.max(0, Math.min(N, (b + 1) * l) - Math.max(N - W, b * l)); recent /= W; }
  const rows = st.mode === 0 ? [['Every token', N, '#E07A5F']] : st.mode === 2 ? [['Window', W, '#1F9E89']]
    : [['Summaries', nb, '#8C7BAF'], ['Chosen blocks', k * l, '#E07A5F'], ['Window', st.win ? W : 0, '#1F9E89']];
  const keys = rows.reduce((a, r) => a + r[1], 0), recentSel = sel.filter(b => (b + 1) * l > N - W).length;
  return { N, l, k, nb, cmp, sel, wb, win, at, fb, found, rank, recent, rows, keys, recentSel, nf: found.filter(Boolean).length };
}
const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');

export default {
  slug: 'native-sparse-attention',
  title: 'Native sparse attention: read the summaries first',
  description: 'A market office in Kumasi asks who signed the lease for stall 12. The lines sit far back in a long file, so score whole blocks first and read only the tall ones.',
  overview: 'Full attention reads every earlier token for every new word, so at 64K tokens attention takes most of the time spent writing each word. Reading only the last few hundred words (a sliding window) is cheap but blind to anything further back. Native sparse attention, from DeepSeek, runs three branches side by side. The compressed branch squeezes every block of tokens (typically 32 or 64) into one summary and attends over all the summaries: a coarse view of the whole file. The selected branch takes the blocks whose summaries scored highest and reads their tokens in full, so exact words are not lost. The sliding-window branch reads the most recent tokens for local sense. A small learned gate mixes the three outputs. The summary scores are part of the model\'s own attention, so they get gradients like any other attention weight; the choice of blocks simply reuses them. That is why the sparse pattern can be learned during pre-training, which is what "native" means, instead of being bolted onto a model trained dense. Per query the cost is N/l summaries plus k·l chosen tokens plus the window: at 64K tokens with blocks of 64, sixteen blocks and a window of 512, that is 2,560 keys instead of 65,536. The saving grows with length.',
  keywords: ['native sparse attention', 'NSA', 'DeepSeek', 'sparse attention', 'long context', 'compressed attention', 'top-k blocks', 'sliding window'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { n: 1, l: 1, k: 2, win: true, mode: 1 }, st = { ...D0 };
    const ink = '#151827';
    const qc = P.box(4.0, 0.04, 0.3, '#FFFFFF', { r: 0.03 }); qc.position.set(-0.75, 0.12, -1.17); floor.add(qc);

    /* the file: one tile per block, read left to right, top to bottom */
    const GX = -0.75, GZ = 0.05, GW = 4.0, GD = 1.75, MAXB = 4096;
    const pad = P.box(GW + 0.1, 0.02, GD + 0.1, '#F6F1E6', { r: 0.02 }); pad.position.set(GX, 0.12, GZ); floor.add(pad);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), MAXB); im.frustumCulled = false; im.userData.noFit = true; im.layers.set(1); floor.add(im);
    const keep = P.box(GW, 0.45, GD, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(GX, 0.12, GZ); floor.add(keep);
    const pins = [0, 1].map(i => { const ball = P.ball(0.045, '#C9A227');
      ball.userData.noFit = true; floor.add(ball); return { ball }; });

    /* keys per query and the answer */
    const PX = 2.42, BL = 1.05;

    const bars = [0, 1, 2].map(r => { const z = -0.8 + r * 0.33;
      const tr = P.box(BL, 0.02, 0.07, '#E6E0D4', { r: 0 }); tr.position.set(PX, 0.15, z + 0.12); floor.add(tr);
      const mm = new THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(1, 0.04, 0.07, '#fff', { r: 0, material: mm }); b.userData.noFit = true; floor.add(b);
      return { tr, b, mm, z }; });



    let R = null;
    const K = k => `${Math.round(k / 1024)}K`, n = v => v.toLocaleString('en');
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    function draw() {
      R = run(st);
      const cols = Math.ceil(Math.sqrt(R.nb * GW / GD)), rowsN = Math.ceil(R.nb / cols), cell = Math.min(GW / cols, GD / rowsN);
      const x0 = GX - cols * cell / 2, z0 = GZ - rowsN * cell / 2, sel = new Set(R.sel);
      const pos = b => [x0 + (b % cols + 0.5) * cell, z0 + (Math.floor(b / cols) + 0.5) * cell];
      for (let b = 0; b < MAXB; b++) {
        if (b >= R.nb) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(b, dummy.matrix); continue; }
        const [x, z] = pos(b), inWin = R.win && b >= R.wb;
        const h = st.mode === 1 ? 0.012 + 0.07 * Math.max(0, Math.min(4, R.cmp[b])) : 0.02;
        dummy.position.set(x, 0.13, z); dummy.scale.set(cell * 0.8, h, cell * 0.8); dummy.updateMatrix(); im.setMatrixAt(b, dummy.matrix);
        im.setColorAt(b, col.set(st.mode === 0 || sel.has(b) ? '#E07A5F' : inWin ? '#1F9E89' : st.mode === 1 ? '#CFC6DD' : '#E2DCCF'));
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      R.fb.forEach((b, i) => { const [x, z] = pos(b), h = st.mode === 1 ? 0.012 + 0.07 * Math.max(0, Math.min(4, R.cmp[b])) : 0.02;
        pins[i].ball.position.set(x, 0.13 + h + 0.12, z); pins[i].ball.material.color.set(R.found[i] ? '#C9A227' : '#C62828');
 });
      R.rows.forEach((r, i) => { const B = bars[i], frac = r[1] / R.N, len = Math.max(0.006, BL * frac);
        B.mm.color.set(r[2]); B.b.scale.x = len; B.b.position.set(PX - BL / 2 + len / 2, 0.15, B.z + 0.12); });
      bars.forEach((B, i) => { const on = i < R.rows.length; B.tr.visible = on; B.b.visible = on; });


    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Attention', options: ['Full', 'Sparse (NSA)', 'Window only'], get: () => st.mode, act: i => set({ mode: i }) },
      { type: 'buttons', label: 'File length', options: NS.map(K), get: () => st.n, act: i => set({ n: i }) },
      { type: 'buttons', label: 'Block size', options: LS.map(String), get: () => st.l, act: i => set({ l: i, mode: 1 }) },
      { type: 'buttons', label: 'Blocks read in full', options: KS.map(String), get: () => st.k, act: i => set({ k: i, mode: 1 }) },
      { type: 'toggle', label: 'Sliding window', get: () => st.win, set: v => set({ win: !!v, mode: 1 }), quick: false },
    ];
    const readouts = [
      { label: 'Keys read per word', get: () => ({ v: n(R.keys), sub: st.mode === 0 ? 'every earlier token' : `${(R.N / R.keys).toFixed(1)}× fewer than full`, good: st.mode !== 0 && R.nf === 2 && R.recent === 1 }) },
      { label: 'Lines found', get: () => ({ v: `${R.nf} of 2`, sub: 'signer and date', good: R.nf === 2, bad: R.nf < 2 }) },
      { label: `Last ${W} words read`, get: () => ({ v: `${Math.round(R.recent * 100)}%`, sub: 'the question itself', bad: R.recent < 1 }) },
    ];
    const labels = [
      { name: 'blocks', t: 'Block summaries', d: 'One score per block; the tall ones get read in full', icon: 'box', atV: V(-2.8, 0.2, -0.4) },
      { name: 'keys', t: 'Keys per word', d: 'What each new word has to read', icon: 'target', atV: V(3.07, 0.2, -0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Window only', hint: 'read just the last 512 tokens', on: () => set({ ...D0, mode: 2 }), off: reset },
      { label: 'Blocks too big', hint: '512 tokens per summary', on: () => set({ ...D0, l: 3 }), off: reset },
      { label: 'Keep one block', hint: 'read a single block in full', on: () => set({ ...D0, k: 0 }), off: reset },
    ];
    function status() {
      const names = ['the signer', 'the date'], miss = [0, 1].filter(i => !R.found[i]);
      if (st.mode === 0) return { msg: `<b>Full attention finds both lines, reading all ${n(R.N)} tokens for every new word.</b> Cost grows with the file: double the length and every word reads twice as much. At this length attention takes most of the time spent writing each word.` };
      if (st.mode === 2) return { ok: false, msg: `<b>Window only: neither line found.</b> Reading the last ${W} tokens costs little, but the signer is ${n(R.N - R.at[0])} tokens back and the date ${n(R.N - R.at[1])}. A fixed pattern throws the far text away whatever the question asks.` };
      if (miss.length) {
        const i = miss.reduce((a, j) => R.rank[j] > R.rank[a] ? j : a), why = R.rank[i] <= 3
          ? `${R.k === 1 ? 'Only one block is' : `Only ${R.k} blocks are`} read in full, and the question needs two lines in two blocks. The summaries rank them ${R.rank.map(ord).join(' and ')}, so the summaries point the right way, but ${R.k === 1 ? 'one slot holds one' : 'the slots run out'}.`
          : `${names[i][0].toUpperCase() + names[i].slice(1)}'s block ranked ${ord(R.rank[i])} of ${n(R.wb)}, outside the top ${R.k}. A line of ${M} tokens is averaged with ${R.l - M} others in a ${R.l}-token summary, so the line is only one part in ${R.l / M} of the summary and unrelated blocks outscore it.${R.l === 512 ? ` The big blocks also cost more: ${n(R.k * R.l)} chosen tokens.` : ''}`;
        return { ok: false, msg: `<b>Missed ${miss.map(j => names[j]).join(' and ')}.</b> ${why} A summary only points; the exact words come from reading the block.` };
      }
      if (!st.win && R.recent === 1) return { ok: undefined, msg: `<b>Both lines found with no window, because the last ${W} words fit in one ${R.l}-token block that was chosen.</b> It took ${R.recentSel} of the ${R.k} slots. With smaller blocks the recent words spread over several blocks and selection covers only part of them.` };
      if (!st.win) return { ok: false, msg: `<b>Both lines found, but only ${Math.round(R.recent * 100)}% of the last ${W} words read.</b> Without the window, the recent blocks score high and take ${R.recentSel} of the ${R.k} slots, yet still leave parts of the question itself unread. The window gives local reading its own branch, so selection is free for the far blocks.` };
      return { ok: true, msg: `<b>Both lines found, reading ${n(R.keys)} keys instead of ${n(R.N)} (${(R.N / R.keys).toFixed(1)}× fewer).</b> ${n(R.nb)} summaries pointed at the right blocks (ranked ${R.rank.map(ord).join(' and ')}); ${R.k} blocks read in full gave the exact words; the window covered the last ${W}.${R.N === NS[0] ? ' At 16K the saving is modest; it grows with length.' : ''}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two lines, far back', home: true, say: 'A market office in Kumasi asks: who signed the lease for stall twelve, and on what date? The two lines sit far back in a long file. Full attention reads every token for every new word.', act: m => m.set({ n: 1, l: 1, k: 2, win: true, mode: 0 }) },
    { t: 'Window only', home: true, say: 'Reading only the last five hundred words is cheap, but both lines are far behind. The model cannot answer.', act: m => m.set({ mode: 2 }) },
    { t: 'Summaries', focus: [-0.75, 0.2, 0.05], zoom: 2, say: 'Native sparse attention first reads a summary of every block of sixty-four tokens. The tall tiles are the summaries that match the question.', act: m => m.set({ mode: 1 }) },
    { t: 'Read the best blocks', home: true, say: 'It then reads the sixteen best blocks in full, plus the last five hundred words. Both lines are found, reading about twenty-six times fewer keys.' },
    { t: 'Blocks too big', home: true, say: 'Make each block five hundred and twelve tokens, and a short line is averaged away in its summary. The date drops out of the top sixteen.', act: m => m.set({ l: 3 }) },
    { t: 'Trained sparse', home: true, say: 'The summary scores are part of the model\'s own attention, so training teaches them to point at what matters. That is why the model is trained sparse from the start, not changed later.', act: m => m.set({ l: 1 }) },
  ],
  check: [
    { q: 'What does the compressed branch give each new word?', options: ['A coarse view of the whole file: one summary per block', 'The exact words of the best blocks', 'The last few hundred words'], answer: 0, why: 'Summaries are cheap and cover everything, but blur the exact words.', hint: 'Look at the tile heights.' },
    { q: 'Why did the date go missing with 512-token blocks?', options: ['Its short line was averaged with hundreds of other tokens, so its summary scored too low to be chosen', 'The window was too small', 'The file was too long to read'], answer: 0, why: 'A bigger block dilutes a short line in its summary.', hint: 'Try block size 64 and 512.' },
    { q: 'Why can the sparse pattern be learned during pre-training?', options: ['The summary scores are ordinary attention that gets gradients; choosing blocks just reuses them', 'The block choice is smoothed into a probability', 'It is not; it is added after training'], answer: 0, why: 'That is what "native" means: trained sparse from the start.', hint: 'Think about what gets gradients.' },
  ],
  terms: [
    ['Native sparse attention (NSA)', 'DeepSeek\'s attention with three branches (summaries, chosen blocks, a window) mixed by a learned gate.'],
    ['Compressed branch', 'Attention over one summary per block of tokens: a coarse view of the whole context.'],
    ['Selected branch', 'Attention over every token of the top-k blocks, chosen by their summary scores.'],
    ['Sliding window', 'Attention over the most recent tokens, for local sense.'],
    ['Branch gate', 'A small learned layer that weights the three branches for each position.'],
    ['Natively trainable', 'The sparse pattern is learned during pre-training, not added to a model trained dense.'],
  ],
  deeper: '<p><b>The kernel.</b> Speed on paper means nothing unless the GPU gets it. NSA chooses blocks per group of query heads that share keys and values, so one load of a block serves the whole group, and the kernel keeps the work in fast on-chip memory. The paper reports large speedups over FlashAttention at 64K, growing with length, for both training and decoding.</p><p><b>Why the window matters in training.</b> Local patterns are the easiest to learn. Without a branch of their own they dominate the other two and the model never learns to use the summaries; giving them a window frees the other branches to learn long-range lookups.</p><p><b>Relatives.</b> MoBA from Moonshot routes queries to blocks in a similar way. DeepSeek\'s later sparse attention follows the same line. Pruning the cache of a model trained dense (H2O, StreamingLLM) recovers less, because the model never learned to send information through the sparse pattern.</p><p><b>When not to use it.</b> Below about 16K tokens the three branches cost about as much as they save, and an existing dense model cannot switch without more training.</p><p><b>About this machine.</b> Scores are simulated for every one of up to 131,072 tokens as described in the file header; summaries are averages (the real model learns a small network for them), and the gate is left out of the count.</p>',
  code: {
    title: 'One NSA step: summaries, chosen blocks, window',
    note: 'Adapted from the course\'s native sparse attention lesson.',
    text: `
def nsa_step(q, K, V, Wg, l, k, W):
    K_cmp = compress_mean(K, l)              # one summary per block
    V_cmp = compress_mean(V, l)
    cmp_w, cmp_out = attention(q, K_cmp, V_cmp)

    picks = top_k_blocks(cmp_w, k)           # reuse the summary scores
    K_sel, V_sel = fine_grained_keys(K, V, l, picks)
    _, sel_out = attention(q, K_sel, V_sel)  # exact words of the best blocks

    K_win, V_win = K[-W:], V[-W:]            # the last W tokens
    _, win_out = attention(q, K_win, V_win)

    g = gate(q, Wg)                          # three learned weights
    return [g[0] * c + g[1] * s + g[2] * w
            for c, s, w in zip(cmp_out, sel_out, win_out)]
`,
  },
};
