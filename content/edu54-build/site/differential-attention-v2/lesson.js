// Differential attention: a land office in Kampala asks its assistant who owns one plot; the answer is one line in a long file of records.
// Scores are computed for every token: each unrelated token has a shared part (both maps see it alike, sd 1.0) plus a part of its own per map (sd 0.3);
// the answer scores 11 in map 1 and 7 in map 2 (both 11 when "the same in both"). Softmax runs over all N tokens (4K, 32K or 128K) with seeded noise.
// Output: map 1 alone (standard) or map 1 − λ·map 2, with λ none, learned (where the two maps' noise totals balance) or twice that. Rows show the weight in 64 equal slices of the file on a square-root scale (red: below zero).
// Answer share = weight on the answer ÷ (that + the total size of every other weight). Break it: λ = 0, λ too large, the answer equally strong in both maps.
const NS = [4096, 32768, 131072], LAMS = [0, 1, 2], CH = 64;
function gauss(seed) { let t = seed >>> 0; const u = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return (((r ^ (r >>> 14)) >>> 0) + 1) / 4294967297; };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u()); }
function run(st) {
  const N = NS[st.n], g = gauss(17), at = Math.floor(N * 0.63), s1 = 11, s2 = st.same ? 11 : 7;
  const x1 = new Float64Array(N), x2 = new Float64Array(N);
  for (let i = 0; i < N; i++) { const c = g(); x1[i] = c + 0.3 * g(); x2[i] = c + 0.3 * g(); }
  x1[at] = s1; x2[at] = s2;
  const sm = x => { let m = -Infinity; for (const v of x) m = Math.max(m, v); let s = 0; const e = new Float64Array(x.length); for (let i = 0; i < x.length; i++) { e[i] = Math.exp(x[i] - m); s += e[i]; } for (let i = 0; i < x.length; i++) e[i] /= s; return e; };
  const a1 = sm(x1), a2 = sm(x2), ch = [new Float64Array(CH), new Float64Array(CH), new Float64Array(CH)];
  /* the learned λ settles where the two maps' noise balances; options: none, that, twice that */
  const bal = (1 - a1[at]) / (1 - a2[at]), lam = st.diff ? LAMS[st.l] * bal : 0;
  let noise = 0;
  for (let i = 0; i < N; i++) { const k = Math.floor(i / N * CH), o = a1[i] - lam * a2[i]; ch[0][k] += a1[i]; ch[1][k] += a2[i]; ch[2][k] += o; if (i !== at) noise += Math.abs(o); }
  const sig = Math.abs(a1[at] - lam * a2[at]) < 5e-4 ? 0 : a1[at] - lam * a2[at];
  return { N, at, ch, sig, noise, share: Math.max(0, sig) / (Math.abs(sig) + noise), std: a1[at] / (a1[at] + (1 - a1[at])), lam, w1: a1[at], w2: a2[at] };
}

export default {
  slug: 'differential-attention-v2',
  title: 'Differential attention: cancel the noise',
  description: 'A land office in Kampala asks who owns one plot, and the answer is one line in a long file. Two attention maps subtract, and the shared noise cancels out.',
  overview: 'Softmax never gives a word exactly zero weight. A word unrelated to the question still scores near zero, so it gets a small share, and across a hundred thousand such words those small shares add up to most of the attention: the noise floor. The longer the context, the smaller the share left for the one line that matters. Differential attention splits each head\'s queries and keys into two sets, computes two attention maps, and outputs the first minus λ times the second, where λ is a learned number for each head, typically starting near 0.8. Noise that both maps share cancels in the subtraction, like two microphones picking up the same background hum. The answer survives because, once trained, the two maps do not weight it equally. The first version halved each head\'s size to keep the parameter count, which made decoding slower than ordinary attention. Version 2 doubles the number of query heads instead and leaves key-value heads alone, so the cache is read once, standard fast attention kernels run unchanged, and decoding is as fast as before. The gain grows with context: at a few thousand tokens it hardly matters; at 128K it is the difference between finding the line and losing it.',
  keywords: ['differential attention', 'diff transformer', 'attention noise', 'softmax', 'long context', 'needle in a haystack', 'lambda', 'noise cancelling'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { n: 2, diff: true, l: 1, same: false };
    const ink = '#151827';
    const qc = P.box(3.9, 0.04, 0.32, '#FFFFFF', { r: 0.03 }); qc.position.set(-0.45, 0.12, -1.18); floor.add(qc);

    /* three rows of 64 slices of the file */
    const X0 = -2.35, DX = 4.0 / CH, RZ = [-0.72, -0.12, 0.55], ROWC = ['#6B5E86', '#8A8A96', '#1F9E89'];
    const rows = RZ.map((z, r) => {
      const strip = P.box(4.05, 0.02, 0.16, '#F6F1E6', { r: 0 }); strip.position.set(X0 + 2.0 - DX / 2, 0.13, z); floor.add(strip);
      const bars = Array.from({ length: CH }, () => { const mm = new THREE.MeshLambertMaterial({ color: ROWC[r] }), b = P.box(DX * 0.75, 1, 0.12, '#fff', { r: 0, material: mm }); b.userData.noFit = true; floor.add(b); return { b, mm }; });
      return { bars, strip };
    });
    const ans = P.box(0.12, 0.05, 0.12, '#C9A227', { r: 0.02 }); floor.add(ans);


    /* results */

    const gm = new THREE.MeshLambertMaterial({ color: '#1F9E89' }), gauge = P.box(0.36, 1, 0.36, '#fff', { r: 0.03, material: gm }); gauge.position.set(2.45, 0.15, -0.35); gauge.userData.noFit = true; floor.add(gauge);


    const keep = P.box(6.0, 0.6, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.1); floor.add(keep);

    let R = null;
    const K = k => `${Math.round(k / 1024)}K`;
    function draw() {
      R = run(st);
      const ak = Math.floor(R.at / R.N * CH), ax = X0 + ak * DX;
      rows.forEach((row, r) => { const on = r !== 1 || st.diff; row.strip.visible = on;
        row.bars.forEach((B, k) => { const v = R.ch[r][k], h = 0.004 + 0.5 * Math.sqrt(Math.abs(v)); B.b.visible = on; B.b.scale.y = h; B.b.position.set(X0 + k * DX, 0.14, RZ[r]);
          B.mm.color.set(v < 0 ? '#C62828' : k === ak ? '#C9A227' : ROWC[r]); }); });
      ans.position.set(ax, 0.12, 0.9);
      const sh = R.share; gauge.scale.y = 0.02 + sh * 0.9; gm.color.set(sh >= 0.4 ? '#1F9E89' : sh >= 0.25 ? '#C9A227' : '#C62828');


    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Attention', options: ['Standard', 'Differential'], get: () => +st.diff, act: i => { st.diff = !!i; draw(); } },
      { type: 'buttons', label: 'File length', options: NS.map(K), get: () => st.n, act: i => { st.n = i; draw(); } },
      { type: 'buttons', label: 'λ', options: ['0', 'Learned', 'Twice learned'], get: () => st.l, act: i => { st.l = i; draw(); } },
      { type: 'toggle', label: 'Both maps see the answer equally', get: () => st.same, set: v => { st.same = !!v; draw(); }, quick: false },
    ];
    const std = () => run({ ...st, diff: false });
    const readouts = [
      { label: 'Answer\'s share', get: () => ({ v: `${Math.round(R.share * 100)}%`, sub: st.diff ? `standard: ${Math.round(std().share * 100)}%` : `of all attention, ${K(R.N)} tokens`, good: R.share >= 0.4, bad: R.share < 0.25 }) },
      { label: 'Weight on the answer', get: () => ({ v: R.sig.toFixed(3), sub: st.diff ? `map 1 ${R.w1.toFixed(3)}, map 2 ${R.w2.toFixed(3)}` : 'one map' }) },
      { label: 'Weight on everything else', get: () => ({ v: R.noise.toFixed(3), sub: 'total size, all other tokens' }) },
    ];
    const labels = [
      { name: 'maps', t: 'Two attention maps', d: 'Subtract one from the other; shared noise cancels', icon: 'wave', atV: V(-2.42, 0.2, -0.42) },
      { name: 'share', t: 'The answer\'s share', d: 'Weight on the line that matters', icon: 'target', atV: V(2.68, 0.2, -0.35) },
    ];
    const reset = () => { Object.assign(st, { n: 2, diff: true, l: 1, same: false }); draw(); };
    const breaks = [
      { label: 'λ = 0', hint: 'nothing subtracted', on: () => { reset(); st.l = 0; draw(); }, off: reset },
      { label: 'Subtract too much', hint: 'twice the learned λ', on: () => { reset(); st.l = 2; draw(); }, off: reset },
      { label: 'Both maps see the answer equally', hint: 'the signal cancels too', on: () => { reset(); st.same = true; draw(); }, off: reset },
    ];
    function status() {
      const pc = v => Math.round(v * 100), s0 = std().share;
      if (!st.diff) return { ok: st.n === 0 ? undefined : false, msg: `<b>The answer gets ${pc(R.share)}% of the attention in a ${K(R.N)} file.</b> ${st.n === 0 ? 'With a few thousand words the noise floor is small, so ordinary attention copes.' : `Every other word still gets a little weight, and ${(R.N - 1).toLocaleString('en')} littles add up to ${R.noise.toFixed(2)}. The longer the file, the more the one line that matters is drowned out.`}` };
      if (st.same) return { ok: false, msg: `<b>The answer cancelled too: weight ${R.sig.toFixed(3)}, share ${pc(R.share)}%.</b> When both maps weight the answer equally (${R.w1.toFixed(3)} and ${R.w2.toFixed(3)}), subtracting removes it along with the noise. Training makes the two maps differ on what matters and agree on what does not.` };
      if (st.l === 0) return { ok: false, msg: `<b>λ = 0: ${pc(R.share)}%, the same as standard attention.</b> Nothing is subtracted, so map 1 passes through with all its noise. A learned λ, here ${(run({ ...st, l: 1 }).lam).toFixed(2)}, cancels the hum the two maps share.` };
      if (st.l === 2) return { ok: false, msg: `<b>Subtracted too much: ${pc(R.share)}%, worse than ${pc(s0)}% with no subtraction.</b> With λ = ${R.lam.toFixed(2)}, twice the learned value, the second map outweighs the shared noise, so every unrelated word ends up below zero (red) and their total size, ${R.noise.toFixed(2)}, drowns the answer again. λ is learned per head so it lands near the balance point.` };
      return { ok: R.share > s0, msg: `<b>The answer's share rises from ${pc(s0)}% to ${pc(R.share)}% in a ${K(R.N)} file.</b> Map 1 and map 2 see the unrelated records alike, so λ = ${R.lam.toFixed(2)} times map 2 cancels most of their weight. Map 2 sees the answer more weakly (${R.w2.toFixed(3)} against ${R.w1.toFixed(3)}), so the answer survives the subtraction.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'One line in a long file', home: true, say: 'A land office in Kampala asks its assistant who owns one plot. The answer is a single line in a long file of records.', act: m => m.set({ n: 0, diff: false, l: 1, same: false }) },
    { t: 'The noise floor', home: true, say: 'Softmax never gives a word zero weight. Across a hundred thousand unrelated words those small weights add up, and the answer\'s share shrinks.', act: m => m.set({ n: 2 }) },
    { t: 'Two maps', home: true, say: 'Differential attention computes two attention maps and subtracts the second from the first. The noise they share cancels, like two microphones hearing the same hum.', act: m => m.set({ diff: true }) },
    { t: 'Subtract too much', home: true, say: 'Subtract too much, and every unrelated word goes below zero. Together they drown the answer again.', act: m => m.set({ l: 2 }) },
    { t: 'Equal in both', home: true, say: 'And if both maps see the answer equally strongly, the subtraction removes the answer along with the noise.', act: m => m.set({ l: 1, same: true }) },
    { t: 'Version two', home: true, say: 'Trained, the two maps differ on what matters. Version two doubles the query heads and keeps the memory cache the same, so decoding is as fast as before.', act: m => m.set({ same: false }) },
  ],
  check: [
    { q: 'Why does the answer\'s share fall as the file gets longer with ordinary attention?', options: ['Every unrelated word gets a little weight, and many littles add up', 'Softmax gives long files less total weight', 'The answer\'s score drops'], answer: 0, why: 'Softmax weights are never zero, so the noise floor grows with the number of words.', hint: 'Compare 4K and 128K.' },
    { q: 'What cancels when one attention map is subtracted from another?', options: ['Weight that both maps place alike, the shared noise', 'Only the answer', 'Nothing; it just halves every weight'], answer: 0, why: 'Like two microphones hearing the same hum.', hint: 'Look at Map 1 and Map 2 away from the answer.' },
    { q: 'What did version 2 change to make decoding as fast as ordinary attention?', options: ['More query heads, the same key-value heads, so the cache is read once', 'A smaller λ', 'Fewer layers'], answer: 0, why: 'Version 1 halved head size, which meant reading the value cache twice.', hint: 'Think about the memory cache.' },
  ],
  terms: [
    ['Noise floor', 'The weight softmax spreads over unrelated words; it grows with context length.'],
    ['Differential attention', 'Two attention maps per head; the output is the first minus λ times the second.'],
    ['λ (lambda)', 'A learned number per head that sets how much of the second map to subtract.'],
    ['Needle in a haystack', 'A test that hides one fact in a long context and asks for it.'],
    ['Common-mode noise', 'Noise that two signals share, which subtracting one from the other removes.'],
    ['DIFF V2', 'The second version: more query heads instead of smaller ones, so decoding stays fast.'],
  ],
  deeper: '<p><b>Where it helps.</b> Long-context retrieval, needle tests past 32K tokens and multi-document questions gain most; short chats hardly change. It combines with grouped-query attention, rotary positions and mixtures of experts, since it only changes how a head turns scores into weights.</p><p><b>λ as a formula.</b> In the paper λ is the difference of two exponentials of learned vectors plus a starting value, so it can move freely and even go below zero during training.</p><p><b>Version 1 against 2.</b> Version 1 also normalised each head after the subtraction; at very large scales that destabilised late training, and version 2 replaces it with a careful initialisation.</p><p><b>About this machine.</b> Softmax runs over every one of the up to 131,072 tokens; the scores are drawn from a seeded random generator with a shared part and a part of each map\'s own, and the answer\'s two scores are set as listed in the file header.</p>',
  code: {
    title: 'Differential attention for one head',
    note: 'Adapted from the course\'s differential attention lesson.',
    text: `
import numpy as np

def softmax(x):
    e = np.exp(x - x.max(-1, keepdims=True))
    return e / e.sum(-1, keepdims=True)

def diff_attention(q1, k1, q2, k2, v, lam=0.8):
    d = q1.shape[-1]
    a1 = softmax(q1 @ k1.T / np.sqrt(d))    # map 1
    a2 = softmax(q2 @ k2.T / np.sqrt(d))    # map 2
    return (a1 - lam * a2) @ v              # shared noise cancels
`,
  },
};
