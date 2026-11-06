// Speculative decoding: a Yoruba customer-support bot answers with a big model, helped by a small draft model. Each row is one round: the draft proposes k tokens (small
// tiles), the big model checks them all in one pass, keeps the ones it agrees with (teal) up to the first it rejects (red), and adds one token of its own (gold).
// Acceptance is simulated live with a seed from the chosen acceptance rate; the expected speedup uses (1 − α^(k+1)) / (1 − α) tokens per big pass and the draft's cost.
// Break it: a weak draft with k = 8 (most drafts are thrown away), a draft half the size of the big model (drafting costs more than it saves), accepting every draft
// token without the probability check (fast, but the answers are no longer the big model's).
const ALPHAS = [0.4, 0.8], COSTS = [0.05, 0.5];
const ANSWER = 'E kaaro! A ti gba owo re, a o fi oja ranse ni ola. E se fun suuru yin.'.split(' ');

export default {
  slug: 'speculative-decoding',
  title: 'Speculative decoding: draft, then check',
  description: 'A Yoruba customer-support bot answers with a big model and a small draft model. The draft guesses ahead, the big one checks them all at once and keeps what fits.',
  overview: 'A large model writes one token per forward pass, and each pass is slow mostly because the weights must be read from memory. Speculative decoding lets a small, cheap draft model guess the next k tokens, then runs the large model once over all of them in parallel. Each draft token is accepted with probability min(1, q/p), the large model\'s probability over the draft\'s; at the first rejection, a replacement is sampled from the leftover of the large model\'s distribution, and the rest of the draft is discarded. If every draft token is accepted, the large model adds one more for free. This keeps the output exactly as if the large model had written it alone. The gain depends on the acceptance rate α and the draft\'s cost: each large pass yields (1 − α^(k+1)) / (1 − α) tokens on average, so a good draft from the same family, on predictable text, gives two to three times the speed. Medusa and EAGLE replace the separate draft with extra heads on the large model.',
  keywords: ['speculative decoding', 'draft model', 'acceptance rate', 'inference speed', 'medusa', 'lossless sampling'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.1, -0.3], dir: [0.05, 0.2, 1.3], half: 1.25, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { a: 1, k: 4, cost: 0, check: true };
    const ink = '#151827', ROWS = 6, TW = 0.42;
    const bd = P.box(4.9, 1.9, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); bd.position.set(-0.6, 0.25, -0.5); floor.add(bd);
    [-2.3, 2.3].forEach(dx => { const p = P.cyl(0.03, 0.13, '#8A8578'); p.position.set(-0.6 + dx, 0.12, -0.5); floor.add(p); });

    const RY = r => 1.78 - r * 0.27, TX = j => -2.78 + j * (TW + 0.04);
    const tiles = Array.from({ length: ROWS * 10 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(TW, 0.2, 0.05, '#888', { r: 0.02, material: mm }); b.userData.noFit = true; floor.add(b);
         return { b, mm }; });
    /* speed gauge */
    const GX = 2.6, gb = P.box(1.4, 1.9, 0.05, '#2B2B38', { r: 0.03 }); gb.position.set(GX, 0.25, -0.5); floor.add(gb);

    const bars = ['big model alone', 'with a draft'].map((n, k) => { const x = GX - 0.33 + k * 0.66, mm = new THREE.MeshLambertMaterial({ color: k ? '#1F9E89' : '#8E91A3' }), b = P.box(0.42, 1, 0.06, '#888', { r: 0.02, material: mm }); b.position.set(x, 0.55, -0.44); b.userData.noFit = true; floor.add(b);
         return { b, mm, x }; });

    let R = null;
    function run() {
      const a = ALPHAS[st.a], c = COSTS[st.cost], k = st.k;
      let seed = 61 + st.a * 7 + k; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const rounds = []; let pos = 0, drafted = 0, kept = 0;
      for (let r = 0; r < ROWS; r++) { const row = []; let rej = false;
        for (let j = 0; j < k; j++) { const ok = st.check ? rnd() < a : true; drafted++; if (ok && !rej) { row.push('acc'); kept++; } else if (!rej) { row.push('rej'); rej = true; } else row.push('drop'); }
        row.push(rej ? 'fix' : 'bonus'); rounds.push(row); }
      const perPass = st.check ? (1 - a ** (k + 1)) / (1 - a) : k + 1;
      const speed = perPass / (1 + k * c);
      return { a, c, k, rounds, perPass, speed, waste: 1 - kept / drafted };
    }
    function draw() {
      R = run();
      let w = 0;
      tiles.forEach(T => { T.b.visible = false;  });
      R.rounds.forEach((row, r) => { let n = 0; row.forEach((kind, j) => { const T = tiles[r * 10 + j]; if (!T) return; T.b.visible = true;
          const word = kind === 'drop' || kind === 'rej' ? '·' : ANSWER[w % ANSWER.length];
          if (kind === 'acc' || kind === 'fix' || kind === 'bonus') { w++; n++; }
          T.b.position.set(TX(j), RY(r) - 0.1, -0.46); T.b.scale.y = kind === 'fix' || kind === 'bonus' ? 1.15 : 1;
          T.mm.color.set(kind === 'acc' ? (st.check ? '#1F9E89' : '#C9A227') : kind === 'rej' ? '#D64545' : kind === 'drop' ? '#C9C5BA' : '#F2C94C');
            }); });
      const h0 = 0.25, h1 = Math.min(1.3, h0 * R.speed);
      bars[0].b.scale.y = h0; bars[1].b.scale.y = Math.max(0.03, h1); bars[1].mm.color.set(R.speed < 1 ? '#D64545' : !st.check ? '#C9A227' : '#1F9E89');


    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Draft quality', options: ['Weak (40% agree)', 'Good (80% agree)'], get: () => st.a, act: i => { st.a = i; draw(); } },
      { type: 'slider', label: 'Tokens drafted per round (k)', min: 1, max: 8, step: 1, get: () => st.k, set: v => { st.k = v; draw(); } },
      { type: 'buttons', label: 'Draft model size', options: ['1/20 of the big model', 'Half the big model'], get: () => st.cost, act: i => { st.cost = i; draw(); } },
      { type: 'toggle', label: 'Check each draft token', short: 'check', get: () => st.check, set: v => { st.check = v; draw(); } },
    ];
    const readouts = [
      { label: 'Words per big pass', get: () => ({ v: R.perPass.toFixed(2), sub: '(1 − α^(k+1)) ÷ (1 − α)' }) },
      { label: 'Speed-up', get: () => ({ v: `${R.speed.toFixed(2)}×`, sub: 'counting the draft\'s cost', good: R.speed >= 2 && st.check, bad: R.speed < 1.2 || !st.check }) },
      { label: 'Draft tokens wasted', get: () => ({ v: `${Math.round(R.waste * 100)}%`, sub: 'rejected or discarded', bad: R.waste > 0.5 }) },
    ];
    const labels = [
      { name: 'rows', t: 'Draft and check', d: 'Teal kept, red rejected, gold from the big model', icon: 'check', atV: V(-3.05, 1.1, -0.5) },
      { name: 'speed', t: 'Speed-up', d: 'Against the big model alone', icon: 'bolt', atV: V(GX + 0.72, 1.0, -0.5) },
    ];
    const reset = () => { Object.assign(st, { a: 1, k: 4, cost: 0, check: true }); draw(); };
    const breaks = [
      { label: 'Weak draft, long guesses', hint: 'k = 8', on: () => { reset(); st.a = 0; st.k = 8; draw(); }, off: reset },
      { label: 'Draft too big', hint: 'Half the big model', on: () => { reset(); st.cost = 1; draw(); }, off: reset },
      { label: 'Skip the check', hint: 'Keep every draft token', on: () => { reset(); st.check = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.check) return { ok: false, msg: `<b>Fast, and no longer the big model's answer.</b> Keeping every draft token gives ${R.speed.toFixed(1)}× the speed, but the words are now the small model's, mistakes included; in support replies that means wrong order numbers and odd Yoruba. The check, accept with probability min(1, q/p) and resample on rejection, is what guarantees the output matches the big model.` };
      if (R.speed < 1.2 && st.cost === 1) return { ok: false, msg: `<b>Drafting eats the gain.</b> A draft half the size of the big model costs half a big pass per guess, so ${R.k} guesses cost ${(R.k * R.c).toFixed(1)} big passes, almost all of the ${(R.perPass - 1).toFixed(1)} they save: only ${R.speed.toFixed(2)}×. Drafts should be tiny, a twentieth of the size or less, or extra heads on the big model itself.` };
      if (R.waste > 0.5) return { ok: false, msg: `<b>Most guesses are thrown away.</b> The weak draft agrees with the big model only ${Math.round(R.a * 100)}% of the time, so a run of ${R.k} guesses almost always breaks early: ${Math.round(R.waste * 100)}% of draft tokens are rejected or discarded, and each big pass yields only ${R.perPass.toFixed(2)} words. Draft fewer tokens, or use a draft from the same family trained on the same data.` };
      return { ok: true, msg: `<b>${R.speed.toFixed(2)}× faster, same answers.</b> The draft agrees ${Math.round(R.a * 100)}% of the time, so each big pass confirms ${R.perPass.toFixed(2)} words on average, and drafting ${R.k} tokens costs only ${(R.k * R.c).toFixed(2)} of a big pass. Every kept word is one the big model would have written.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A big, slow model', home: true, say: 'A Yoruba customer-support bot answers with a big model, one word per slow pass. E kaaro! A ti gba owo re...', act: m => m.set({ a: 1, k: 4, cost: 0, check: true }) },
    { t: 'Draft ahead', home: true, say: 'A small draft model guesses the next few words. The big model checks them all in a single pass.', act: m => m.set({}) },
    { t: 'Keep, reject, add', home: true, say: 'It keeps words it agrees with up to the first it rejects, replaces that one, and moves on. Each pass yields several words.', act: m => m.set({}) },
    { t: 'A weak draft', home: true, say: 'A weak draft with long guesses wastes most of them. Agreement is what makes this fast.', act: m => m.set({ a: 0, k: 8 }) },
    { t: 'A big draft', home: true, say: 'A draft half the size of the big model costs nearly as much to run as it saves.', act: m => m.set({ a: 1, k: 4, cost: 1 }) },
    { t: 'Always check', home: true, say: 'Skip the check, and it is faster, but the answers are the small model\'s, not the big one\'s.', act: m => m.set({ cost: 0, check: false }) },
  ],
  check: [
    { q: 'What does the big model do in speculative decoding?', options: ['Checks all the draft tokens in one pass', 'Writes the draft', 'Nothing'], answer: 0, why: 'One parallel pass verifies many tokens.' },
    { q: 'Why does a weak draft model give little speed-up?', options: ['Most of its guesses are rejected', 'It is too fast', 'It changes the answers'], answer: 0, why: 'Speed depends on agreement.' },
    { q: 'What keeps the output exactly like the big model\'s?', options: ['Accepting with probability min(1, q/p) and resampling on rejection', 'Using a bigger draft', 'Drafting more tokens'], answer: 0, why: 'The check makes it lossless.' },
  ],
  terms: [
    ['Speculative decoding', 'A draft model guesses ahead; the big model verifies in one pass.'],
    ['Draft model', 'A small, cheap model that proposes tokens.'],
    ['Acceptance rate', 'How often the big model keeps a draft token.'],
    ['Bonus token', 'The extra token the big model adds when every draft is kept.'],
    ['Lossless', 'Producing exactly the distribution the big model would.'],
    ['Medusa', 'Extra prediction heads on the big model instead of a separate draft.'],
  ],
  deeper: '<p><b>Where it helps.</b> Predictable text, such as code, forms and support replies, gives high acceptance; free creative writing gives less. Greedy decoding accepts more than high-temperature sampling.</p><p><b>Drafts for African languages.</b> A draft model must know the language too: a small model with little Yoruba agrees rarely. Distilling the draft from the big model on local text raises agreement.</p><p><b>About this machine.</b> Acceptance is simulated with a seed from the chosen rate; speed-up uses the standard expected-tokens formula and the draft\'s cost relative to the big model.</p>',
  code: {
    title: 'Verify a draft, losslessly',
    note: 'Adapted from the course\'s speculative decoding lesson.',
    text: `
import numpy as np

def verify(draft_tokens, p_draft, q_big, rng):
    out = []
    for i, t in enumerate(draft_tokens):
        if rng.random() < min(1.0, q_big[i][t] / p_draft[i][t]):
            out.append(t)                                  # keep it
        else:
            resid = np.maximum(q_big[i] - p_draft[i], 0)
            out.append(rng.choice(len(resid), p=resid / resid.sum()))
            return out                                     # stop at first rejection
    out.append(rng.choice(len(q_big[-1]), p=q_big[-1]))    # bonus token
    return out
`,
  },
};
