// Token and position embeddings (phase 19, lesson 32): a table lookup turns an id into a row of numbers, and position adds another. Sinusoids are computed live; a learned table has only as many rows as the context. Eight columns show the summed vector for an Igbo sentence, with repeated words.
const DIM = 8, LEN = 8, CTX = 8, TOK = [0.6, -0.2, 0.4, 0.1, -0.5, 0.3, -0.1, 0.2], WORDS = [0, 1, 2, 0, 3, 2, 0, 1];
const tokV = id => TOK.map((v, d) => Math.sin(id * 2.1 + d * 1.3) * 0.45 + v * 0.2);
const posS = (p, d) => (d % 2 ? Math.cos : Math.sin)(p / 10000 ** (Math.floor(d / 2) * 2 / DIM));
const posL = (p, d) => Math.sin(p * 1.7 + d * 2.3) * 0.5;
function run(o) {
  const grid = Array.from({ length: LEN }, (_, p) => { const id = WORDS[p], tv = tokV(id); return tv.map((v, d) => v + (o.pos === 'none' ? 0 : (o.pos === 'sin' ? posS(p + o.at, d) * 0.5 : posL(p + o.at, d)))); });
  const same = Math.sqrt(grid[0].reduce((a, v, d) => a + (v - grid[3][d]) ** 2, 0));
  return { grid, same, out: o.pos === 'learned' && o.at + LEN > CTX, params: o.pos === 'learned' ? CTX * DIM : 0 };
}

export default {
  slug: 'token-positional-embeddings',
  title: 'Embeddings: what a word is, and where it stands',
  description: 'A table turns ids into vectors, and position adds a second lookup. Learned or fixed, each has a limit.',
  overview: 'A model\'s first contact with a token id is a row in a table: an id goes in, and a vector comes out. That is all a token embedding is, and training shapes the table. But attention treats its inputs as a set, so without position, a word first and last look identical. Position adds its own vector. One choice is a learned table, with a row per position, which is flexible and has no row past the context length. The other is fixed sinusoids, computed from a formula, with no parameters at all, for any position. Add the two and the input is ready. This lesson computes both on an Igbo sentence that repeats words.',
  keywords: ['embeddings', 'positional encoding', 'sinusoidal', 'context length', 'transformer input', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.45, 0.8, 1.1], half: 1.05, wide: 5 },

  build(S) {
    const { V, P } = S;
    const D0 = { pos: 'sin', at: 0 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(4.6, 0.03, 3, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = p => -1.75 + p * 0.5, Z = d => -1.05 + d * 0.3;
    const C = Array.from({ length: LEN }, (_, p) => Array.from({ length: DIM }, (_, d) => { const m = new S.THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.42, 1, 0.24, '#fff', { r: 0.01, material: m }); b.position.set(X(p), 0.03, Z(d)); b.userData.noFit = true; S.add(b); return { b, m }; }));
    S.add(P.keep(-2.2, 2.2, 1.0, -1.3, 1.3));
    let R = null;
    function draw() {
      R = run(st);
      R.grid.forEach((row, p) => row.forEach((v, d) => { const c = C[p][d]; c.b.scale.y = Math.max(0.02, Math.abs(v) * 0.7); c.m.color.set(v >= 0 ? (R.out && p + st.at >= CTX ? '#C9C4B6' : BLUE) : BAD); }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const PK = ['none', 'learned', 'sin'];
    const controls = [
      { type: 'buttons', label: 'Position', options: ['None', 'Learned table', 'Sinusoids'], get: () => PK.indexOf(st.pos), act: i => set({ pos: PK[i] }) },
      { type: 'slider', label: 'Start position in a long text', min: 0, max: 8, step: 1, get: () => st.at, set: v => set({ at: v }) },
    ];
    const readouts = [
      { label: 'Same word, two places', get: () => ({ v: R.same.toFixed(2), sub: 'distance between them', good: R.same > 0.3, bad: R.same < 0.05 }) },
      { label: 'Position parameters', get: () => ({ v: `${R.params}`, sub: st.pos === 'sin' ? 'a formula' : 'to train' }) },
      { label: 'Past the context', get: () => ({ v: R.out ? 'no row' : 'fine', good: !R.out, bad: R.out }) },
    ];
    const labels = [
      { name: 'g', t: 'A vector per token', d: 'Rows: word order. Depth: dimensions', icon: 'target', atV: V(X(0) - 0.22, 0.25, 0) },
      { name: 'r', t: 'Blue up, coral down', d: 'Height: size of the number', icon: 'scale', atV: V(X(7) + 0.22, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No position at all', hint: 'order disappears', on: () => set({ ...D0, pos: 'none' }), off: reset },
      { label: 'A learned table past its end', hint: 'no row for it', on: () => set({ ...D0, pos: 'learned', at: 6 }), off: reset },
    ];
    function status() {
      if (st.pos === 'none') return { ok: false, msg: '<b>Columns 1 and 4 are identical.</b> Same word, same vector, so attention can\'t tell which came first. The sentence is a bag of words.' };
      if (R.out) return { ok: false, msg: `<b>Position ${st.at + LEN - 1} has no row in a table of ${CTX}.</b> A learned table can\'t go past the context it was built for.` };
      return { ok: true, msg: `<b>The same word now differs by ${R.same.toFixed(2)} between its two places.</b> ${st.pos === 'sin' ? 'Sinusoids need no training, and they continue past any length.' : `The learned table used ${R.params} parameters.`}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A lookup', home: true, say: 'An Igbo sentence repeats some words. Each id looks up a row of numbers, shown as one column of towers.', act: m => m.set({ pos: 'none', at: 0 }) },
    { t: 'The same word', home: true, say: 'The first and fourth words are the same, so their columns are identical. Attention can\'t tell them apart.', act: m => m.set({ pos: 'none', at: 0 }) },
    { t: 'Add position', home: true, say: 'Add a position vector to each. Now a word differs by where it stands.', act: m => m.set({ pos: 'sin', at: 0 }) },
    { t: 'Learned', home: true, say: 'A learned table has one row per position, and training shapes it.', act: m => m.set({ pos: 'learned', at: 0 }) },
    { t: 'Its limit', home: true, say: 'Go past the context length, and there is no row.', act: m => m.set({ pos: 'learned', at: 6 }) },
    { t: 'Sinusoids', home: true, say: 'Sinusoids come from a formula, with no parameters, for any position.', act: m => m.set({ pos: 'sin', at: 6 }) },
  ],
  check: [
    { q: 'What does a token embedding do?', options: ['Maps an id to a vector', 'Sorts the tokens', 'Counts words'], answer: 0, why: 'It is a table lookup.', hint: 'See A lookup.' },
    { q: 'Why add position?', options: ['Attention doesn\'t know order', 'To save memory', 'To speed training'], answer: 0, why: 'Otherwise repeats look identical.', hint: 'Try No position at all.' },
    { q: 'What limit has a learned position table?', options: ['No row past its context length', 'It can\'t train', 'It is too small'], answer: 0, why: 'Sinusoids have no such limit.', hint: 'Try A learned table past its end.' },
  ],
  terms: [['Embedding', 'A vector for a token.'], ['Lookup table', 'Id in, row out.'], ['Positional encoding', 'A vector for a place.'], ['Sinusoid', 'A sine or cosine wave.'], ['Context length', 'The most positions a model takes.']],
  deeper: '<p><b>Add, not join.</b> The two vectors are summed, so the input keeps one size.</p><p><b>Rotary methods.</b> Many recent models use RoPE inside attention. The later lessons on variants cover that.</p><p><b>The grid</b> uses the real sinusoid formula and illustrative tokens.</p>',
  code: {
    title: 'Input to the block',
    note: 'Adapted from the course\'s embeddings (code/main.py).',
    text: `
tok = nn.Embedding(vocab, dim)
pos = nn.Embedding(context, dim)                 # learned

def embed(ids):
    positions = torch.arange(ids.size(1))
    return tok(ids) + pos(positions)
`,
  },
};
