// Text watermarking (phase 18, lesson 23): a verification desk checks whether a viral press statement came from a watermarked model.
// At each step the generator hashes the previous tokens to split the vocabulary into green and red halves and adds delta to green logits,
// so watermarked text has more green tokens than chance. The detector counts greens and computes a z-score. The grid shows 48 words of
// the statement coloured green or red; paraphrased words fall back to chance. Length, delta and paraphrase set the expected z-score
// (computed exactly); quality cost is an illustrative curve. A C2PA manifest is the complementary, strippable metadata layer.
const GAMMA = 0.5, Z_DETECT = 4;
function measure(o) {
  const p = o.source === 'wm' ? GAMMA * Math.exp(o.delta) / (GAMMA * Math.exp(o.delta) + 1 - GAMMA) : GAMMA;
  const pe = (1 - o.para) * p + o.para * GAMMA;
  const z = (o.n * pe - GAMMA * o.n) / Math.sqrt(o.n * GAMMA * (1 - GAMMA));
  return { p, pe, z, green: pe, quality: 100 - 3 * o.delta * o.delta * (o.source === 'wm' ? 1 : 0) };
}
const WORDS = 'The water board will close the main pipe on Tuesday for repairs and residents in the eastern wards should store water tonight while crews work through the day and tankers will visit each market from noon until the supply returns on Wednesday morning say officials at the depot'.split(' ');

export default {
  slug: 'text-watermark-green-list',
  title: 'Text watermarks: a hidden tilt you can count',
  description: 'A verification desk checks whether a viral press statement came from a watermarked model. Count the tilt across its words, and see paraphrase wash it out.',
  overview: 'A watermark marks generated content at the moment it is made so it can be recognised later. For text, the standard scheme (Kirchenbauer and colleagues, 2023), which Google put into production as SynthID-Text and open-sourced in October 2024, works on word choice. At every step the generator hashes the few tokens before it to split the vocabulary pseudo-randomly into a green half and a red half, then adds a small bonus, delta, to the scores of green tokens. A reader cannot see it, but the text ends up with more green tokens than the half that chance would give. A detector with the same hashing key recomputes each split, counts the green tokens and turns the count into a z-score: watermarked text scores high, human text scores near zero. Evidence grows with length, so a short message may not carry enough signal to decide. The limits matter as much as the mechanism. Paraphrasing replaces the tilted choices with ordinary ones and washes the signal out, and 2025 work shows meaning-preserving rewrites defeat many text and image watermarks. A larger delta makes the signal stronger but pushes the model towards worse word choices. And the signal is model-specific: text from a model without the watermark shows nothing, so the absence of a signal never proves a person wrote it. Image watermarks have their own story; Stable Signature built the mark into an image decoder in 2023, and a 2024 paper removed it by fine-tuning. C2PA is the complementary layer: a cryptographically signed manifest recording who made a piece of content and how it was edited. It carries far more information but can be stripped, while a watermark carries a few bits but travels with the content. Regulation such as the EU AI Act\'s transparency rules is pushing both. This machine follows a verification desk checking an invented water board statement; the counts are computed exactly from the settings.',
  keywords: ['text watermarking', 'SynthID', 'green list', 'z-score', 'C2PA', 'content provenance', 'AI-generated text detection'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.2, -0.2], dir: [0.05, 1.05, 1.05], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { delta: 2, n: 120, para: 0, source: 'wm', c2pa: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
    /* the statement as tiles, one per word, green or red by the secret list */
    const COLS = 8, TW = 0.4, TH = 0.3;
    const tiles = WORDS.slice(0, 48).map((w, i) => {
      const c = i % COLS, r = Math.floor(i / COLS), m = new THREE.MeshLambertMaterial({ color: '#fff' });
      const b = P.box(TW - 0.05, 0.1, TH - 0.05, '#fff', { r: 0.03, material: m }); b.position.set(-2.2 + c * TW, 0, -0.95 + r * TH); S.add(b);
      return { m, u: rnd(i + 1), v: rnd(i + 101) };
    });
    /* the detector: a z-score tower against a gold wall, a quality tower, and the signed origin */
    const zT = P.tower(0.36, 0.36, GOOD, { h: 0.3 }), qT = P.tower(0.36, 0.36, '#5B8DB8', { h: 0.5 }); [zT, qT].forEach(t => t.userData.set({ cap: '' })); zT.position.set(1.15, 0, -0.5); qT.position.set(1.7, 0, -0.5); S.add(zT, qT);
    const wall = P.box(0.56, Z_DETECT * 0.07, 0.03, SAF, { r: 0.004 }); wall.position.set(1.15, 0, -0.72); S.add(wall);
    const sign = P.lamp(GOOD, { h: 0.16, r: 0.09 }); sign.position.set(1.42, 0, 0.1); S.add(sign);
    S.add(P.keep(-2.4, 1.95, 1.0, -1.2, 0.5));
    const parts = [zT, qT];
    let R = null;
    function draw() {
      R = measure(st);
      R = measure(st);
      tiles.forEach(t => {
        const para = t.v < st.para, green = t.u < (para ? GAMMA : R.p);
        t.m.color.set(green ? (para ? '#BFE3DB' : GOOD) : (para ? '#F5D3C8' : BAD));
      });
      const ok = isOk();
      zT.userData.set({ h: Math.max(0.02, Math.min(0.95, R.z * 0.07)), color: ok ? GOOD : st.source === 'wm' ? SAF : OFF });
      qT.userData.set({ h: R.quality * 0.008 });
      sign.userData.set({ color: st.c2pa ? GOOD : OFF, on: !!st.c2pa });
    }
    function isOk() { return st.source === 'wm' && R.z >= Z_DETECT && R.quality >= 85; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Watermark tilt (delta)', min: 0, max: 4, step: 0.1, get: () => st.delta, set: v => set({ delta: +v }), fmt: v => (+v).toFixed(1) },
      { type: 'slider', label: 'Tokens checked', min: 20, max: 200, step: 10, get: () => st.n, set: v => set({ n: +v }), fmt: v => `${v}` },
      { type: 'slider', label: 'Paraphrased', min: 0, max: 1, step: 0.05, get: () => st.para, set: v => set({ para: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'toggle', label: 'Written by a model with no watermark', short: 'Unmarked model', get: () => st.source === 'other', set: v => set({ source: v ? 'other' : 'wm' }) },
      { type: 'toggle', label: 'Keep the signed C2PA manifest', short: 'C2PA', get: () => st.c2pa, set: v => set({ c2pa: !!v }) },
    ];
    const readouts = [
      { label: 'z-score', get: () => ({ v: R.z.toFixed(1), sub: `found at ${Z_DETECT}`, good: R.z >= Z_DETECT, bad: R.z < Z_DETECT }) },
      { label: 'Green words', get: () => ({ v: `${Math.round(R.pe * 100)}%`, sub: 'chance is 50%', good: R.pe > 0.6, bad: R.pe < 0.55 }) },
      { label: 'Writing quality', get: () => ({ v: `${Math.round(R.quality)}%`, sub: 'cost of the tilt', good: R.quality >= 85, bad: R.quality < 85 }) },
    ];
    const labels = [
      { name: 'g', t: 'The statement', d: 'Each word green or red', icon: 'book', atV: V(-2.42, 0.1, -0.5) },
      { name: 't', t: 'The detector', d: 'Past the gold wall, it is flagged', icon: 'target', atV: V(1.35, 0.3, -0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Paraphrase the statement', hint: 'the tilt washes out', on: () => set({ ...D0, para: 0.65 }), off: reset },
      { label: 'Crank the tilt up', hint: 'the writing suffers', on: () => set({ ...D0, delta: 3.5 }), off: reset },
      { label: 'Check a short message', hint: 'too little evidence', on: () => set({ ...D0, n: 20 }), off: reset },
      { label: 'Treat no signal as proof', hint: 'an unmarked model', on: () => set({ ...D0, source: 'other' }), off: reset },
    ];
    function status() {
      const r = R, z = r.z.toFixed(1), g = `${Math.round(r.pe * 100)}%`;
      if (st.source === 'other') return { ok: false, msg: `<b>The z-score is ${z}: no signal. But this statement came from a model with no watermark.</b> Watermarks are model-specific, so the absence of a signal never proves a person wrote it.${st.c2pa ? '' : ' With the manifest stripped too, the desk has no provenance at all.'}` };
      if (st.delta < 0.5) return { ok: false, msg: `<b>With a tilt of ${st.delta.toFixed(1)}, green words stay near chance, ${g}, and the z-score is ${z}.</b> No tilt, no watermark. A delta around 2 is strong enough to detect in a hundred tokens and still keeps the writing natural.` };
      if (r.quality < 85) return { ok: false, msg: `<b>A tilt of ${st.delta.toFixed(1)} gives a huge z-score, ${z}, but writing quality falls to ${Math.round(r.quality)}%: the model is forced onto worse words.</b> A small tilt is enough with a few hundred tokens; keep it imperceptible.` };
      if (r.z < Z_DETECT && st.para > 0.2) return { ok: false, msg: `<b>${Math.round(st.para * 100)}% of the words were paraphrased, so green words fall to ${g} and the z-score to ${z}, under the threshold of ${Z_DETECT}.</b> Meaning-preserving rewrites wash text watermarks out. Pair the watermark with signed C2PA provenance and other evidence.` };
      if (r.z < Z_DETECT) return { ok: false, msg: `<b>Only ${st.n} tokens: green words are ${g}, but the z-score is ${z}, under ${Z_DETECT}.</b> Evidence grows with length, so short messages cannot be decided. Check longer text or treat the result as unknown.` };
      return { ok: true, msg: `<b>${st.n} tokens with ${g} green words, against 50% by chance: a z-score of ${z}, well past ${Z_DETECT}, so the watermark is found.</b> The tilt of ${st.delta.toFixed(1)} keeps quality at ${Math.round(r.quality)}%. ${st.c2pa ? 'The signed C2PA manifest adds who made it and how it was edited.' : 'The C2PA manifest was stripped, but the watermark travelled with the words.'}` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A viral statement', home: true, say: 'A verification desk checks whether a press statement came from a watermarked model.', act: m => m.set({ delta: 0, n: 120, para: 0, source: 'wm', c2pa: true }) },
    { t: 'A hidden split', home: true, say: 'At each word, a hash of the previous words splits the vocabulary into green and red halves.', act: m => m.set({ delta: 0, n: 120, para: 0, source: 'wm', c2pa: true }) },
    { t: 'A small tilt', home: true, say: 'The model adds a small bonus to green words. The text reads the same, but more words are green.', act: m => m.set({ delta: 2, n: 120, para: 0, source: 'wm', c2pa: true }) },
    { t: 'Count and test', home: true, say: 'The detector counts green words and turns the count into a z-score. More words, more evidence.', act: m => m.set({ delta: 2, n: 200, para: 0, source: 'wm', c2pa: true }) },
    { t: 'Paraphrase', home: true, say: 'Rewrite the words and the tilt washes out. The z-score drops below the line.', act: m => m.set({ delta: 2, n: 120, para: 0.65, source: 'wm', c2pa: true }) },
    { t: 'Two layers', home: true, say: 'A signed C2PA manifest says who made it, but can be stripped. Together they tell the story.', act: m => m.set({ delta: 2, n: 120, para: 0, source: 'wm', c2pa: true }) },
  ],
  check: [
    { q: 'How does a green-list watermark mark text?', options: ['It adds a small bonus to a hashed half of the vocabulary', 'It hides invisible characters', 'It appends a code'], answer: 0, why: 'More green words than chance.', hint: 'Move the tilt slider.' },
    { q: 'Why does a short message often show no clear signal?', options: ['Too few tokens for a high z-score', 'Short text cannot be watermarked', 'The hash fails'], answer: 0, why: 'Evidence grows with length.', hint: 'Try Check a short message.' },
    { q: 'What does no watermark signal prove?', options: ['Nothing: the text may come from an unmarked model', 'A person wrote it', 'It was paraphrased'], answer: 0, why: 'Watermarks are model-specific.', hint: 'Try Treat no signal as proof.' },
  ],
  terms: [
    ['Watermark', 'A hidden signal added at generation time, detectable later.'],
    ['Green list', 'The hashed half of the vocabulary that gets a bonus.'],
    ['Delta', 'The size of the bonus added to green tokens.'],
    ['z-score', 'How far the green count sits above chance, in standard deviations.'],
    ['C2PA', 'A signed, tamper-evident manifest recording content provenance.'],
    ['Paraphrase attack', 'Rewriting text to remove a watermark while keeping its meaning.'],
  ],
  deeper: '<p><b>Images and video.</b> Stable Signature fine-tuned the image decoder so every output carries a message; a 2024 paper removed it by fine-tuning again. SynthID marks for images and video aim to survive compression and cropping.</p><p><b>Regulation.</b> The EU AI Act\'s transparency rules require AI-generated content to be marked and deepfakes labelled; a code of practice is being drafted.</p><p><b>About this machine.</b> The statement and water board are invented; the quality curve is illustrative.</p>',
  code: {
    title: 'Embed and detect a green-list watermark',
    note: 'Adapted from the scheme in Kirchenbauer and colleagues (2023).',
    text: `
import hashlib, math, random

def green_set(prev_tokens, vocab_size, key, gamma=0.5):
    seed = int(hashlib.sha256((key + "|".join(map(str, prev_tokens))).encode()).hexdigest(), 16)
    rng = random.Random(seed)
    return set(rng.sample(range(vocab_size), int(gamma * vocab_size)))

def tilt(logits, prev_tokens, key, delta=2.0):
    green = green_set(prev_tokens[-4:], len(logits), key)
    return [l + delta if i in green else l for i, l in enumerate(logits)]

def detect(tokens, vocab_size, key, gamma=0.5):
    hits = sum(tokens[i] in green_set(tokens[max(0, i - 4):i], vocab_size, key) for i in range(1, len(tokens)))
    n = len(tokens) - 1
    return (hits - gamma * n) / math.sqrt(n * gamma * (1 - gamma))     # z-score
`,
  },
};
