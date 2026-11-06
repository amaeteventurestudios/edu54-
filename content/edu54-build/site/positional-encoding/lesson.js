// Positional encoding: attention on its own sees a bag of words, so "Lion chases goat" and "Goat chases lion" look the same.
// Each position gets its own set of turning dials (sines and cosines at different speeds), added to the word's numbers.
// Break it: no positions at all, positions so loud the words are drowned.
const PAIRS = [['Lion', 'chases', 'goat'], ['Ada', 'pays', 'Tunde'], ['Dog', 'bites', 'man']];
const EMB = {
  lion: [0.9, 0.2, -0.5, 0.6, 0.1, -0.3, 0.8, 0.0], goat: [-0.6, 0.7, 0.4, -0.2, 0.5, 0.6, -0.4, 0.3], chases: [0.1, -0.8, 0.6, 0.5, -0.7, 0.2, 0.1, -0.6],
  ada: [0.7, 0.5, 0.3, -0.6, -0.2, 0.4, 0.1, 0.8], tunde: [-0.3, 0.6, -0.7, 0.2, 0.8, -0.1, 0.5, -0.4], pays: [0.2, -0.5, 0.8, 0.4, -0.6, -0.7, 0.2, 0.1],
  dog: [0.8, -0.3, 0.2, 0.7, -0.4, 0.5, -0.2, 0.3], man: [-0.5, 0.4, 0.6, -0.3, 0.2, -0.8, 0.7, 0.1], bites: [0.3, -0.7, -0.4, 0.6, 0.7, 0.2, -0.5, -0.3],
};
const W = [1, 0.32, 0.1, 0.032];   // how fast each pair of dials turns per position
const pe = p => W.flatMap(w => [Math.sin(p * w), Math.cos(p * w)]);

export default {
  slug: 'positional-encoding',
  title: 'Positional encoding',
  description: '"Lion chases goat" and "Goat chases lion" use the same words. Without positions a transformer can\'t tell them apart. Turn on the position dials and the difference appears.',
  overview: 'Attention compares every word with every other word, but it has no idea of order: shuffle the words and it sees exactly the same bag. So before attention, each word gets a pattern of numbers that says where it sits, made from dials turning at different speeds. Lion at the start and lion at the end are no longer the same.',
  keywords: ['positional encoding explained', 'sinusoidal position embedding', 'why transformers need positions', 'word order'],
  orient: 'landscape',
  view: { target: [0, 0.8, 0], dir: [0.5, 1.05, 1.2], half: 3.3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { pair: 0, on: true, strength: 0.6 };
    const rows = [{ z: -1.25 }, { z: 1.0 }];
    const sentence = r => { const [a, v, b] = PAIRS[st.pair]; return r === 0 ? [a, v, b] : [b[0].toUpperCase() + b.slice(1), v, a.toLowerCase()]; };
    const vecOf = (w, p) => { const e = EMB[w.toLowerCase()], q = pe(p), s = st.on ? st.strength : 0; return e.map((v, i) => v + s * q[i]); };
    const cubeCol = new THREE.Color(), pos = new THREE.Color(C.teal), neg = new THREE.Color(C.coral), mid = new THREE.Color('#F1EEE6');
    const colFor = v => cubeCol.copy(mid).lerp(v >= 0 ? pos : neg, Math.min(1, Math.abs(v) / 1.2));
    function column() {
      const g = new THREE.Group(), cubes = [];
      for (let i = 0; i < 8; i++) { const c = P.box(0.22, 0.2, 0.22, '#ffffff', { r: 0.03 }); c.material = new THREE.MeshLambertMaterial({ color: '#ffffff' }); c.position.y = i * 0.23; g.add(c); cubes.push(c); }
      g.userData.cubes = cubes; return g;
    }
    function dialSet() {
      const g = new THREE.Group(), hands = [];
      for (let k = 0; k < 4; k++) {
        const d = P.cyl(0.17, 0.05, '#F7F5EE', { seg: 28 }); d.position.set((k - 1.5) * 0.4, 0, 0); g.add(d);
        const h = P.box(0.03, 0.03, 0.15, C.ink, { r: 0 }); h.position.set((k - 1.5) * 0.4, 0.06, 0); h.geometry = h.geometry.clone(); h.geometry.translate(0, 0, -0.07); g.add(h); hands.push(h);
      }
      g.userData.hands = hands; return g;
    }
    // each row: three words, each with its position dials and its column of eight numbers; then the bag the model sees
    rows.forEach((R, r) => {
      R.tiles = []; R.cols = []; R.dials = []; R.bag = [];
      for (let p = 0; p < 3; p++) {
        const x = -3.1 + p * 1.45;
        const t = P.tile('', 1.05, 0.25, 0.6, '#FFFFFF', { size: 0.2 }); t.position.set(x, 0, R.z + 0.35); S.add(t); R.tiles.push(t);
        const ds = dialSet(); ds.position.set(x, 0, R.z + 0.95); ds.scale.setScalar(0.62); S.add(ds); R.dials.push(ds);
        const col = column(); col.position.set(x + 0.45, 0.02, R.z - 0.25); S.add(col); R.cols.push(col);
        const n = S.text(`${p + 1}`, { size: 0.15, weight: 800, color: C.grey }); n.position.set(x - 0.62, 0.01, R.z + 0.35); S.add(n);
      }
      const bowl = P.cyl(1.0, 0.22, '#E6E1D3', { r2: 1.15, seg: 40 }); bowl.position.set(2.75, 0, R.z); S.add(bowl); R.bowl = bowl;
      for (let k = 0; k < 3; k++) { const c = column(); c.scale.setScalar(0.8); c.position.set(2.75 + (k - 1) * 0.45, 0.22, R.z); S.add(c); R.bag.push(c); }
      const arrow = P.arrow(V(0.55, 0.3, R.z), V(1.6, 0.3, R.z), 0.04, C.grey); S.add(arrow);
    });
    const verdict = S.text('', { size: 0.2, face: 'cam', weight: 800, bg: 'rgba(255,255,255,.95)', color: C.ink, order: 7, depthTest: false }); verdict.position.set(2.75, 2.7, -0.1); verdict.userData.noFit = true; S.add(verdict);
    // how different are the two bags? best matching of vectors, ignoring order
    const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    function bagGap() {
      const A = sentence(0).map((w, p) => vecOf(w, p)), B = sentence(1).map((w, p) => vecOf(w, p));
      return Math.min(...perms.map(pm => pm.reduce((s, j, i) => s + dist(A[i], B[j]), 0)));
    }
    const cos = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0) / Math.hypot(...a) / Math.hypot(...b);
    let ang = 0;
    function draw() {
      rows.forEach((R, r) => {
        const s = sentence(r);
        s.forEach((w, p) => {
          R.tiles[p].userData.label.userData.set(w);
          const v = vecOf(w, p); R.cols[p].userData.cubes.forEach((c, i) => c.material.color.copy(colFor(v[i])));
          R.dials[p].visible = st.on;
          R.dials[p].userData.hands.forEach((h, k) => { h.rotation.y = -p * W[k] * 2.2; });
        });
        // the bag: the same three columns, in no particular order (sorted so equal bags look equal)
        const vs = s.map((w, p) => vecOf(w, p)).sort((a, b) => a.reduce((x, y) => x + y, 0) - b.reduce((x, y) => x + y, 0));
        R.bag.forEach((c, k) => c.userData.cubes.forEach((q, i) => q.material.color.copy(colFor(vs[k][i]))));
      });
      const g = bagGap();
      verdict.userData.set(g < 0.01 ? 'The model sees: the same bag' : 'The model sees: two different bags', g < 0.01 ? C.red : C.green);
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Sentence', options: PAIRS.map(p => p.join(' ')), get: () => st.pair, act: i => { st.pair = i; draw(); } },
      { type: 'toggle', label: 'Add positions', get: () => st.on, set: v => { st.on = v; draw(); } },
      { type: 'slider', label: 'Position strength', min: 0.1, max: 4, step: 0.1, get: () => st.strength, set: v => { st.strength = v; draw(); } },
    ];
    const recog = () => { const [a, , b] = PAIRS[st.pair]; const x = vecOf(a, 0), same = vecOf(a, 2), other = vecOf(b, 0); return cos(x, same) - cos(x, other); };
    const readouts = [
      { label: 'Can it tell them apart?', get: () => { const g = bagGap(); return { v: g < 0.01 ? 'No' : 'Yes', sub: `difference ${g.toFixed(2)}`, good: g > 0.01, bad: g < 0.01 }; } },
      { label: 'Word still clear?', get: () => { const r = recog(); return { v: r > 0.1 ? 'Yes' : 'Drowned', sub: 'same word, new place', good: r > 0.1, bad: r <= 0.1 }; } },
    ];
    const labels = [
      { name: 'dials', t: 'Position dials', d: 'Four dials, turning at different speeds', icon: 'target', at: () => rows[0].dials[2].position.clone().add(V(0, 0.15, 0)), hide: () => !st.on },
      { name: 'column', t: 'The word\'s numbers', d: 'Its meaning plus its position', icon: 'box', at: () => rows[0].cols[0].position.clone().add(V(0, 1.85, 0)) },
      { name: 'bag', t: 'What attention sees', d: 'A bag of word columns, in no order', icon: 'eye', at: () => rows[1].bowl.position.clone().add(V(0, 0.9, 0)) },
    ];
    const breaks = [
      { label: 'No positions', hint: 'Just the words', on: () => { st.on = false; draw(); }, off: () => { st.on = true; draw(); } },
      { label: 'Positions far too loud', hint: 'Strength 4', on: () => { st.on = true; st.strength = 4; draw(); }, off: () => { st.strength = 0.6; draw(); } },
    ];
    function status() {
      const [a, v, b] = PAIRS[st.pair], g = bagGap();
      if (g < 0.01) return { ok: false, msg: `<b>The same bag.</b> "${a} ${v} ${b}" and "${b[0].toUpperCase() + b.slice(1)} ${v} ${a.toLowerCase()}" give attention exactly the same three columns. It cannot tell who did what to whom.` };
      if (recog() <= 0.1) return { ok: false, msg: `<b>The words are drowned.</b> The position numbers are so loud that "${a}" at the start looks more like "${b}" at the start than like itself at the end. Positions must whisper, not shout.` };
      return { ok: true, msg: `<b>Two different bags.</b> Each column now carries its word and its place, so "${a}" first is not the same as "${a.toLowerCase()}" last. The fast dial tells near places apart; the slow ones tell far places apart.` };
    }
    return { update: dt => { if (S.reduced || !st.on) return; ang += dt; rows.forEach(R => R.dials.forEach((d, p) => d.userData.hands.forEach((h, k) => { h.rotation.y = -(p * W[k] * 2.2) - Math.sin(ang * 0.8) * 0.05; }))); },
      controls, readouts, labels, breaks, status,
      reset: () => { Object.assign(st, { pair: 0, on: true, strength: 0.6 }); draw(); },
      set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Same words, different story', home: true, say: 'Lion chases goat. Goat chases lion. Same three words, very different news for the goat.', act: m => m.set({ on: false, pair: 0 }) },
    { t: 'Attention sees a bag', focus: 'bag', zoom: 1.3, say: 'Attention compares every word with every other, but it has no sense of order. Both sentences go into the bag as the same three columns. To the model they are identical.' },
    { t: 'Position dials', focus: 'dials', zoom: 1.5, say: 'The fix: give every position its own pattern. Picture four dials turning at different speeds. The fast dial moves a lot from one word to the next; the slow ones barely move.', act: m => m.set({ on: true, strength: 0.6 }) },
    { t: 'Add them to the word', focus: 'column', zoom: 1.3, say: 'The dial readings are added to the word\'s own numbers. Lion in first place now looks a little different from lion in last place.' },
    { t: 'Two different bags', home: true, say: 'Now the bags differ, and the model can tell who chased whom.' },
    { t: 'Not too loud', home: true, say: 'But if the positions shout, they drown the words, and lion stops looking like lion. The position must whisper next to the meaning.', act: m => m.set({ strength: 4 }), wait: 5 },
  ],
  check: [
    { q: 'Why does a transformer need positional encoding?', options: ['Attention on its own ignores word order', 'To make the model bigger', 'To translate languages'], answer: 0, why: 'Attention treats the words as a bag. Positions are the only clue to order.' },
    { q: 'How is the position information used?', options: ['It replaces the word', 'It is added to the word\'s numbers', 'It is stored in a separate model'], answer: 1, why: 'The position pattern is added to each word\'s embedding before attention.' },
    { q: 'Why dials at several speeds?', options: ['Fast ones separate near places, slow ones far places', 'They look nice', 'To slow the model down'], answer: 0, why: 'Like the hands of a clock: seconds, minutes and hours together give every moment its own reading.' },
  ],
  terms: [
    ['Position', 'Where a word sits in the sentence: first, second, third…'],
    ['Positional encoding', 'A pattern of numbers for each position, added to the word.'],
    ['Sinusoidal', 'Made of sine and cosine waves: the turning dials.'],
    ['Permutation', 'A shuffled order. Attention alone can\'t tell permutations apart.'],
  ],
  deeper: '<p>The original transformer used these fixed sine and cosine dials. Many newer models use <b>rotary position embedding (RoPE)</b>, which turns the query and key vectors themselves by an angle that depends on position, so attention scores depend on how far apart two words are.</p>',
  code: {
    title: 'Sinusoidal positional encoding',
    note: 'From the course\'s positional encoding lesson.',
    text: `
import numpy as np

def positional_encoding(n_positions, d_model):
    pe = np.zeros((n_positions, d_model))
    pos = np.arange(n_positions)[:, None]
    # each pair of numbers is a dial turning at its own speed
    speed = 1 / (10000 ** (np.arange(0, d_model, 2) / d_model))
    pe[:, 0::2] = np.sin(pos * speed)
    pe[:, 1::2] = np.cos(pos * speed)
    return pe

# x = word_embeddings + positional_encoding(len(words), d_model)
`,
  },
};
