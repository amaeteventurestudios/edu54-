// EAGLE speculative decoding: a travel assistant that answers in English and Swahili across East and West Africa. Left: the big model (verifier) and its
// draft: a separate small model, or an EAGLE head that reads the big model's hidden states (EAGLE-1: top layer; EAGLE-3: low, middle and top layers).
// Middle: rounds play live. The draft proposes N tokens; the i-th is accepted with probability α·d^(i−1) (d: how fast the draft's own errors pile up;
// teacher-forced training makes d small, training on its own predictions keeps it near 1); the big model adds one token per pass. Expected tokens per pass
// and speedup are exact sums of the same rates. Right: the next-word distribution after "Habari za", computed exactly: the exact rule (accept with
// min(1, q/p), else sample the residual) reproduces the big model's q; resampling from q on rejection does not. Break it: teacher forcing only,
// resample from q on rejection, keep rejected tokens in the cache.
const DR = [['Small model', 0.62, 1, 0.10], ['EAGLE-1', 0.78, 0.9, 0.03], ['EAGLE-3', 0.9, 0.99, 0.04]], NS = [3, 6, 10];
const WORDS = ['asubuhi', 'mchana', 'jioni', 'leo', 'safari'], Q = [0.45, 0.22, 0.15, 0.12, 0.06], PD = [0.62, 0.08, 0.12, 0.13, 0.05];
const TEXT = 'The matatu to Mombasa leaves the Nairobi stage at six , and the trotro to Kumasi leaves Accra at seven . Habari za asubuhi , safe travels .'.split(' ');
const WRONG = ['bus', 'the', 'at', 'from', 'to', 'eight', 'Lagos', 'stop', 'and'];
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
function rates(st) { const [, a, d0, c] = DR[st.d], d = st.d && !st.ttt ? 0.85 : d0, N = NS[st.n], al = Array.from({ length: N }, (_, i) => a * d ** i);
  let E = 1, pr = 1; al.forEach(x => { pr *= x; E += pr; }); return { al, E, c, N, speed: E / (N * c + 1) }; }
function dist(st) { const mn = Q.map((q, i) => Math.min(q, PD[i])), r = 1 - mn.reduce((a, b) => a + b, 0);
  const out = st.exact ? Q.slice() : mn.map((m, i) => m + r * Q[i]); return { out, tv: 0.5 * out.reduce((a, o, i) => a + Math.abs(o - Q[i]), 0) }; }

export default {
  slug: 'speculative-decoding-eagle3',
  title: 'EAGLE-3: a smarter draft',
  description: 'A travel assistant in English and Swahili drafts words ahead with a tiny head that reads the big model\'s own states. The check keeps the answers exactly the same.',
  overview: 'Speculative decoding lets a cheap draft guess several tokens and the big model check them in one forward pass. The check is exact: accept a drafted token with probability equal to the smaller of one and the big model\'s probability divided by the draft\'s; on the first rejection, sample from the leftover distribution, the part where the big model wants more than the draft offered, and stop. The words that come out are distributed exactly as if the big model had written them alone, however poor the draft. Draft quality only sets the speed: with acceptance rate α and N drafted tokens, each big pass yields on average 1 + α + α² + … + α^N tokens. The original drafts were separate small models, accepting about six in ten. EAGLE replaces them with a one-layer head that reads the big model\'s last hidden state, so its guesses track the big model closely. EAGLE-2 drafts a small tree of alternatives and checks every branch at once. EAGLE-3 reads hidden states from low, middle and top layers, predicts tokens directly, and is trained on its own earlier predictions, the way it runs at inference, so errors do not pile up along a long draft; acceptance reaches about nine in ten and speedups of three to six times. One piece of plumbing matters: the check writes every drafted token into the key-value cache, so rejected ones must be rolled back before the next round.',
  keywords: ['speculative decoding', 'eagle-3', 'eagle', 'draft model', 'rejection sampling', 'acceptance rate', 'training-time test', 'kv cache rollback', 'medusa'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { d: 2, n: 1, ttt: true, exact: true, roll: true };
    const ink = '#151827';
    /* the big model: six layers; the draft beside it */
    const TX = -2.45, layers = Array.from({ length: 6 }, (_, i) => { const b = P.box(0.8, 0.1, 0.62, i % 2 ? '#5B4B8A' : '#6B5E86', { r: 0.03 }); b.position.set(TX, 0.13 + i * 0.12, -0.35); floor.add(b); return b; });


    const dm = new THREE.MeshLambertMaterial({ color: '#E07B39' }), draft = P.box(0.42, 0.24, 0.42, '#fff', { r: 0.04, material: dm }); draft.position.set(-1.62, 0.12, -0.35); floor.add(draft);

    const taps = [0, 2, 5].map(k => { const r = P.rod(V(TX + 0.4, 0.18 + k * 0.12, -0.35), V(-1.83, 0.24, -0.35), 0.014, '#E07B39'); floor.add(r); return r; });

    /* the round: drafted tokens, then the output so far */
    const RX0 = -1.05, RW = 0.225;
    const tiles = Array.from({ length: 11 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#C9C3D3' }), b = P.box(0.21, 0.06, 0.3, '#fff', { r: 0.03, material: mm }); b.userData.noFit = true; floor.add(b);
         return { b, mm }; });


    /* the next-word check after "Habari za" */

    const hist = WORDS.map((w, i) => { const z = -0.55 + i * 0.27, x0 = 1.65;
      const tq = P.box(1, 0.05, 0.16, '#D9D2E6', { r: 0 }); tq.position.set(x0, 0.15, z - 0.03); tq.userData.noFit = true; floor.add(tq);
      const mm = new THREE.MeshLambertMaterial({ color: '#1F9E89' }), to = P.box(1, 0.08, 0.08, '#fff', { r: 0, material: mm }); to.position.set(x0, 0.15, z + 0.03); to.userData.noFit = true; floor.add(to);
         return { tq, to, mm, x0 }; });

    const keep = P.box(6.0, 0.9, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.1); floor.add(keep);

    let R = null, D = null, r = rng(4), pos = 0, out = [], round = null, clock = 0, rounds = 0, passes = 0, toks = 0;
    function newRound() {
      const N = NS[st.n], drafted = [], stat = []; let ok = true;
      for (let i = 0; i < N; i++) { const right = TEXT[(pos + i) % TEXT.length], acc = ok && r() < R.al[i];
        drafted.push(acc || !ok ? (r() < 0.75 || acc ? right : WRONG[Math.floor(r() * WRONG.length)]) : WRONG[Math.floor(r() * WRONG.length)]);
        stat.push(!ok ? 'skip' : acc ? 'ok' : 'no'); if (!acc) ok = false; }
      const k = stat.filter(s => s === 'ok').length, rej = stat.indexOf('no');
      round = { drafted, stat, k, bonus: TEXT[(pos + k) % TEXT.length], rejTok: rej >= 0 ? drafted[rej] : null };
    }
    function commit() {
      const kept = round.drafted.slice(0, round.k);
      if (!st.roll && round.rejTok) { out.push(...kept, `~${round.rejTok}~`); pos += round.k; }
      else { out.push(...kept, round.bonus); pos += round.k + 1; }
      passes++; toks += round.k + 1; out = out.slice(-18);
    }
    function paint(phase) {
      const N = NS[st.n];
      tiles.forEach((T, i) => { const on = !!round && i <= N; T.b.visible = on;  if (!on) return;
        const x = RX0 + i * RW, z = -0.55; T.b.position.set(x, 0.12, z);
        if (i < N) { const s = round.stat[i];  T.mm.color.set(phase === 0 ? '#E8C9A8' : s === 'ok' ? '#7FCBB4' : s === 'no' ? '#E79A9A' : '#C9C3D3'); }
        else {  T.mm.color.set(phase === 0 ? '#E9E2D3' : st.roll || !round.rejTok ? '#F2D27A' : '#E9E2D3'); } });


    }
    function draw() {
      R = rates(st); D = dist(st); r = rng(4); pos = 0; out = []; rounds = 0; passes = 0; toks = 0; clock = 0; newRound(); paint(0);
      dm.color.set(st.d ? '#E07B39' : '#8A8A96');
      draft.position.set(-1.62, 0.12, -0.35);
      taps.forEach((t, i) => {  });
      const mx = 0.7; hist.forEach((H, i) => { const wq = Q[i] / mx * 1.1, wo = D.out[i] / mx * 1.1; H.tq.scale.x = wq; H.tq.position.x = H.x0 + wq / 2; H.to.scale.x = wo; H.to.position.x = H.x0 + wo / 2; H.mm.color.set(D.tv > 0.01 ? '#C62828' : '#1F9E89'); });

    }
    draw();
    function update(dt) {
      clock += Math.min(dt, 0.1);
      if (round && clock > 0.9 && !round.shown) { round.shown = true; paint(1); }
      if (clock > 2.0) { commit(); rounds++; clock = 0; newRound(); paint(0); }
    }
    const controls = [
      { type: 'buttons', label: 'Draft', options: DR.map(d => d[0]), get: () => st.d, act: i => { st.d = i; draw(); } },
      { type: 'buttons', label: 'Words drafted', options: NS.map(String), get: () => st.n, act: i => { st.n = i; draw(); } },
      { type: 'buttons', label: 'Draft training', options: ['Right answers only', 'Its own guesses'], get: () => +st.ttt, act: i => { st.ttt = !!i; draw(); } },
      { type: 'buttons', label: 'On rejection', options: ['Sample the leftover', 'Sample the big model'], get: () => (st.exact ? 0 : 1), act: i => { st.exact = !i; draw(); } },
      { type: 'toggle', label: 'Roll back the cache', get: () => st.roll, set: v => { st.roll = !!v; draw(); }, quick: false },
    ];
    const readouts = [
      { label: 'Words per big pass', get: () => ({ v: R.E.toFixed(2), sub: `drafting ${R.N}, first guess right ${Math.round(R.al[0] * 100)}%` }) },
      { label: 'Speed-up', get: () => ({ v: `${R.speed.toFixed(1)}×`, sub: 'against the big model alone', good: R.speed >= 3, bad: R.speed < 2 }) },
      { label: 'Same answers as the big model', get: () => ({ v: D.tv > 0.01 || !st.roll ? 'No' : 'Yes', sub: !st.roll ? 'rejected words left in the cache' : D.tv > 0.01 ? `off by ${Math.round(D.tv * 100)} points` : 'exactly', good: D.tv <= 0.01 && st.roll, bad: D.tv > 0.01 || !st.roll }) },
    ];
    const labels = [
      { name: 'draft', t: 'The draft', d: 'Guesses ahead from the big model\'s own hidden states', icon: 'spark', atV: V(-2.86, 0.5, -0.35) },
    ];
    const reset = () => { Object.assign(st, { d: 2, n: 1, ttt: true, exact: true, roll: true }); draw(); };
    const breaks = [
      { label: 'Trained on right answers only', hint: 'EAGLE-3, ten words drafted', on: () => { reset(); st.ttt = false; st.n = 2; draw(); }, off: reset },
      { label: 'Sample the big model on rejection', hint: 'not the leftover', on: () => { reset(); st.exact = false; draw(); }, off: reset },
      { label: 'Forget to roll back the cache', hint: 'rejected words stay', on: () => { reset(); st.roll = false; draw(); }, off: reset },
    ];
    function status() {
      const pc = v => Math.round(v * 100);
      if (!st.roll) return { ok: false, msg: `<b>Rejected words are leaking into the answer.</b> The check wrote all ${R.N} drafted words into the key-value cache. Without rolling back to the last kept word, the big model carries on from words it rejected (marked ~like this~ in red), so the text no longer follows what it would have said. Keep a logical length and cut the cache back after every rejection.` };
      if (!st.exact) return { ok: false, msg: `<b>Faster, but no longer the big model's answers: off by ${pc(D.tv)} points.</b> After a rejection the true rule samples only from the leftover, where the big model wants more than the draft offered. Sampling from the big model's full distribution adds back words the draft already had its chance at, so "${WORDS[0]}" comes out ${pc(D.out[0])}% of the time instead of ${pc(Q[0])}%.` };
      if (st.d && !st.ttt) return { ok: false, msg: `<b>${R.speed.toFixed(1)}× instead of ${rates({ ...st, ttt: true }).speed.toFixed(1)}×: the ${{ 3: 'third', 6: 'sixth', 10: 'tenth' }[R.N]} guess is right only ${pc(R.al[R.N - 1])}% of the time.</b> Trained only with the right answers before each guess, the head never saw its own mistakes, so each wrong guess makes the next one worse. Training on its own earlier guesses, as it runs for real, keeps later guesses at ${pc(rates({ ...st, ttt: true }).al[R.N - 1])}%.` };
      if (st.d === 0) return { ok: R.speed >= 2 ? undefined : false, msg: `<b>${R.speed.toFixed(1)}× with a separate small model.</b> It guesses on its own, so the first word is right ${pc(R.al[0])}% of the time and each pass yields ${R.E.toFixed(2)} words. An EAGLE head reads the big model's hidden states and agrees with it far more often.` };
      return { ok: true, msg: `<b>${R.E.toFixed(2)} words per big pass: ${R.speed.toFixed(1)}× faster, with exactly the big model's answers.</b> The ${DR[st.d][0]} head drafts ${R.N} words; each is kept with probability min(1, big ÷ draft), and the first rejection is replaced from the leftover, so the histogram matches the big model's to the last point.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Guess, then check', home: true, say: 'A travel assistant answering in English and Swahili writes one word per pass of its big model. A cheap draft can guess several words ahead, and the big model checks them all in one pass.', act: m => m.set({ d: 0, n: 1, ttt: true, exact: true, roll: true }), wait: 1 },
    { t: 'Read its mind', focus: [-2.0, 0.4, -0.3], zoom: 1.6, say: 'EAGLE drops the separate small model. A tiny head reads the big model\'s own hidden states, so its guesses agree with the big model far more often.', act: m => m.set({ d: 2 }) },
    { t: 'Exactly the same', focus: [2.25, 0.2, 0], zoom: 1.6, say: 'Each guess is kept with a probability set by how much the big model likes it. On the first miss, the replacement comes from what is left over. The answers come out exactly as the big model alone would give them.', act: m => m.set({}) },
    { t: 'Its own mistakes', home: true, say: 'Train the head only on the right answers, and it never learns to recover from its own wrong guesses. Long drafts fall apart, and the speed-up shrinks.', act: m => m.set({ n: 2, ttt: false }), wait: 1 },
    { t: 'The wrong replacement', home: true, say: 'Replace a rejected word by sampling the big model\'s whole distribution, and some words come out too often. It is faster, but no longer the same model.', act: m => m.set({ n: 1, ttt: true, exact: false }) },
    { t: 'Roll back', home: true, say: 'The check writes every guess into the memory cache. Forget to cut the rejected ones back out, and they leak into the answer.', act: m => m.set({ exact: true, roll: false }), wait: 1 },
  ],
  check: [
    { q: 'What does the draft\'s quality change in speculative decoding?', options: ['Only the speed: the output still matches the big model exactly', 'The quality of the answers', 'The size of the big model'], answer: 0, why: 'The accept-or-replace rule makes the output follow the big model\'s distribution whatever the draft does.', hint: 'Look at the histogram as you change the draft.' },
    { q: 'Why does an EAGLE head guess better than a separate small model?', options: ['It reads the big model\'s own hidden states', 'It has more parameters', 'It skips the check'], answer: 0, why: 'It starts from what the big model is already thinking.', hint: 'Follow the rods into the draft.' },
    { q: 'What does EAGLE-3\'s training on its own guesses fix?', options: ['Errors piling up along a long draft', 'The size of the cache', 'Rejected words in the answer'], answer: 0, why: 'At inference the head builds on its own earlier guesses, so it should be trained that way too.', hint: 'Compare the two training options with ten words drafted.' },
  ],
  terms: [
    ['Draft', 'A cheap model or head that guesses several next tokens ahead.'],
    ['Verifier', 'The big model, which checks all the guesses in one forward pass.'],
    ['Acceptance rate', 'How often a drafted token is kept.'],
    ['Leftover distribution', 'Where the big model wants more probability than the draft gave; rejected tokens are replaced from it.'],
    ['EAGLE head', 'A one- or few-layer draft that reads the big model\'s hidden states.'],
    ['Training-time test', 'Training a draft on its own earlier predictions, the way it runs at inference.'],
  ],
  deeper: '<p><b>How long a draft?</b> Each extra guess costs a little draft time and pays only if every guess before it was kept, so the best length grows with the acceptance rate: about five to seven guesses at eight in ten, more at nine in ten.</p><p><b>Trees.</b> EAGLE-2 and EAGLE-3 draft a small tree of alternatives and check every branch in one pass with a custom attention mask, then follow the longest accepted path.</p><p><b>Other routes.</b> Medusa adds extra prediction heads to the big model itself; lookahead decoding needs no draft at all and gains less. Serving engines such as vLLM and SGLang ship EAGLE drafts for popular open models.</p><p><b>About this machine.</b> Acceptance rates per draft are typical published values; the rounds are sampled live from them, and the histogram is computed exactly from the two distributions shown.</p>',
  code: {
    title: 'Accept, or replace from the leftover',
    note: 'Adapted from the course\'s EAGLE-3 lesson.',
    text: `
import numpy as np

def verify(drafts, p, q, rng):
    """drafts: N token ids; p[i], q[i]: draft and big-model distributions."""
    out = []
    for i, d in enumerate(drafts):
        if rng.random() < min(1.0, q[i][d] / p[i][d]):
            out.append(d)                       # kept
            continue
        left = np.maximum(q[i] - p[i], 0)       # where the big model wants more
        out.append(rng.choice(len(left), p=left / left.sum()))
        return out, i                           # roll the cache back to len(out)
    out.append(rng.choice(len(q[-1]), p=q[-1])) # all kept: one more, free
    return out, len(drafts)
`,
  },
};
