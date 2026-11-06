// Word embeddings: words as points in space. Countries sit where they are on the map, capitals float one floor up,
// national dishes two floors up, so "capital of" is the same arrow everywhere: Abuja − Nigeria + Kenya ≈ Nairobi.
// Break it: an untrained (shuffled) space, squashing everything into one dimension.
const C8 = [
  { c: 'Nigeria', cap: 'Abuja', dish: 'Egusi', lon: 8, lat: 9 },
  { c: 'Ghana', cap: 'Accra', dish: 'Waakye', lon: -1, lat: 8 },
  { c: 'Senegal', cap: 'Dakar', dish: 'Thieboudienne', lon: -14, lat: 14 },
  { c: 'Morocco', cap: 'Rabat', dish: 'Tagine', lon: -7, lat: 32 },
  { c: 'Egypt', cap: 'Cairo', dish: 'Koshari', lon: 30, lat: 27 },
  { c: 'Ethiopia', cap: 'Addis Ababa', dish: 'Injera', lon: 39, lat: 9 },
  { c: 'Kenya', cap: 'Nairobi', dish: 'Ugali', lon: 38, lat: 0 },
  { c: 'South Africa', cap: 'Pretoria', dish: 'Bobotie', lon: 25, lat: -29 },
];
const FLOORS = [0.55, 1.85, 3.15];   // country, capital, dish
const rnd = (() => { let s = 3; return () => ((s = (s * 16807) % 2147483647) / 2147483647) - 0.5; })();
const WORDS = [];
C8.forEach((k, i) => ['c', 'cap', 'dish'].forEach((f, j) => WORDS.push({ w: k[f], kind: j, i, p: [(k.lon - 12) * 0.095 + rnd() * 0.25, FLOORS[j] + rnd() * 0.3, -k.lat * 0.085 + rnd() * 0.25] })));
const idx = w => WORDS.findIndex(x => x.w === w);
const PRESETS = [['Abuja', 'Nigeria', 'Kenya'], ['Egusi', 'Nigeria', 'Senegal'], ['Cairo', 'Egypt', 'Ghana'], ['Injera', 'Ethiopia', 'Morocco']];

export default {
  slug: 'word-embeddings',
  title: 'Word embeddings',
  description: 'Fly through a space where every word is a point. Countries, capitals and dishes line up so neatly that Abuja − Nigeria + Kenya lands on Nairobi.',
  overview: 'Models store each word as a list of numbers: a point in space. Training pulls words used in similar ways close together, and something surprising appears: relationships become directions. Here the space has three numbers per word so you can walk around it. Real models use hundreds.',
  keywords: ['word embeddings explained', 'word2vec', 'king minus man plus woman', 'vector analogies', 'semantic space'],
  orient: 'any',
  view: { target: [0.2, 1.7, 0.2], dir: [0.9, 0.55, 1.3], half: 3.6, wide: 4.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { q: PRESETS[0].map(idx), shuffled: false, flat: false, show: true, picked: null };
    const KC = [C.teal, C.indigo, C.orange], KN = ['country', 'capital', 'dish'];
    let pos = WORDS.map(w => V(...w.p));
    const shuffledPos = WORDS.map(() => V(rnd() * 5.5, 0.5 + (rnd() + 0.5) * 2.9, rnd() * 5.5));
    const flatPos = WORDS.map(w => V(0, 0.3 + (w.p[0] + 2.6) * 0.62, 0));
    const P0 = () => st.shuffled ? shuffledPos : st.flat ? flatPos : pos;
    /* ---------- floors, like glass shelves ---------- */
    FLOORS.forEach((y, j) => {
      const g = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.03, 6.4), new THREE.MeshLambertMaterial({ color: KC[j], transparent: true, opacity: 0.1, depthWrite: false }));
      g.position.set(0.4, y - 0.18, 0.15); g.userData.noMask = true; g.layers.set(1); S.add(g);
      const t = S.text(['COUNTRIES', 'CAPITALS', 'DISHES'][j], { size: 0.18, weight: 800, color: KC[j], face: 'cam' }); t.position.set(-2.95, y, 3.1); t.userData.noFit = true; S.add(t);
    });
    const posts = [[-2.8, -2.6], [3.6, -2.6], [-2.8, 3.0], [3.6, 3.0]].map(([x, z]) => { const r = P.rod(V(x, 0, z), V(x, FLOORS[2], z), 0.02, '#B8B4C8'); S.add(r); return r; });
    /* ---------- the words ---------- */
    const items = WORDS.map((w, k) => {
      const b = P.ball(0.1, KC[w.kind]); S.add(b);
      const t = S.text(w.w, { size: 0.16, face: 'cam', weight: 650 }); t.userData.noFit = true; S.add(t);
      S.tap(b, () => { st.picked = st.picked === k ? null : k; draw(); });
      return { b, t };
    });
    // the analogy: A − B + C = ?
    const arrAB = P.arrow(V(), V(0, 1, 0), 0.04, C.gold), arrC = P.arrow(V(), V(0, 1, 0), 0.04, C.gold), guess = P.ball(0.16, C.red);
    arrAB.userData.noFit = arrC.userData.noFit = guess.userData.noFit = true; S.add(arrAB, arrC, guess);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 8, 32), P.mat(C.red)); ring.userData.noFit = true; S.add(ring);
    const nearLines = [0, 1, 2].map(() => { const r = P.rod(V(), V(0, 1, 0), 0.015, C.grey); r.layers.set(1); r.userData.noFit = true; S.add(r); return r; });
    const nearest = (p, skip = []) => WORDS.map((w, k) => [k, P0()[k].distanceTo(p)]).filter(([k]) => !skip.includes(k)).sort((a, b) => a[1] - b[1]);
    let answer = null, target = V();
    function draw() {
      const ps = P0();
      items.forEach((it, k) => {
        it.b.position.copy(ps[k]); it.t.position.copy(ps[k]).add(V(0, 0.24, 0));
        const inQ = st.q.includes(k) || k === answer;
        it.b.scale.setScalar(inQ ? 1.5 : 1); it.t.userData.style({ weight: inQ ? 800 : 550 });
      });
      const [a, b, c] = st.q;
      target = ps[a].clone().sub(ps[b]).add(ps[c]);
      answer = nearest(target, st.q)[0][0];
      arrAB.visible = arrC.visible = guess.visible = ring.visible = st.show;
      if (st.show) {
        P.setArrow(arrAB, ps[b], ps[a]); P.setArrow(arrC, ps[c], target);
        guess.position.copy(target); ring.position.copy(ps[answer]); ring.quaternion.copy(S.R.cam.quaternion);
      }
      items.forEach((it, k) => { if (k === answer) it.b.scale.setScalar(1.6); });
      S.label('country', WORDS[c].w, `${WORDS[c].w}: start the copied arrow here`);
      const nn = st.picked != null ? nearest(ps[st.picked], [st.picked]).slice(0, 3) : [];
      nearLines.forEach((r, i) => { r.visible = !!nn[i]; if (nn[i]) P.setRod(r, ps[st.picked], ps[nn[i][0]]); });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Try an analogy', options: PRESETS.map(p => `${p[0]} − ${p[1]} + ${p[2]}`), get: () => PRESETS.findIndex(p => p.map(idx).join() === st.q.join()), act: i => { st.q = PRESETS[i].map(idx); draw(); } },
      { type: 'text', label: 'Your own: A − B + C', placeholder: 'e.g. Accra − Ghana + Egypt', go: 'Go', get: () => '', set: v => { const parts = v.split(/[−\-+]/).map(s => s.trim().toLowerCase()); const ks = parts.map(p => WORDS.findIndex(w => w.w.toLowerCase() === p)); if (ks.length === 3 && ks.every(k => k >= 0)) { st.q = ks; draw(); } else S.pop('Not in this space', `<p>Use three words from the space: ${WORDS.map(w => w.w).join(', ')}.</p>`); } },
      { type: 'toggle', label: 'Show the arrows', get: () => st.show, set: v => { st.show = v; draw(); }, quick: false },
    ];
    const readouts = [
      { label: 'Answer', get: () => { const ok = WORDS[answer].kind === WORDS[st.q[0]].kind && WORDS[answer].i === WORDS[st.q[2]].i; return { v: WORDS[answer].w, sub: `${WORDS[st.q[0]].w} − ${WORDS[st.q[1]].w} + ${WORDS[st.q[2]].w}`, good: ok, bad: !ok }; } },
    ];
    const labels = [
      { name: 'offset', t: 'The "capital of" arrow', d: 'The same direction for every country', icon: 'link', at: () => P0()[st.q[1]].clone().lerp(P0()[st.q[0]], 0.5), hide: () => !st.show },
      { name: 'answer', t: 'Nearest word', d: 'Where the copied arrow lands', icon: 'target', at: () => P0()[answer].clone().add(V(0, 0.15, 0)) },
      { name: 'country', t: 'Kenya', d: 'Countries sit where they are on the map', icon: 'info', at: () => P0()[st.q[2]].clone(), phone: false },
    ];
    const breaks = [
      { label: 'Before training', hint: 'Every word in a random place', on: () => { st.shuffled = true; draw(); }, off: () => { st.shuffled = false; draw(); } },
      { label: 'Only one number per word', hint: 'Squash the space into a line', on: () => { st.flat = true; draw(); }, off: () => { st.flat = false; draw(); } },
    ];
    function status() {
      const [a, b, c] = st.q.map(k => WORDS[k].w), ans = WORDS[answer].w;
      const ok = WORDS[answer].kind === WORDS[st.q[0]].kind && WORDS[answer].i === WORDS[st.q[2]].i;
      if (st.shuffled) return { ok: false, msg: `<b>No meaning yet.</b> Before training, words are scattered at random, so ${a} − ${b} + ${c} lands on "${ans}". Training is what moves words used alike close together.` };
      if (st.flat) return { ok: false, msg: `<b>One number is not enough.</b> On a single line every word must fight for one spot, and capitals, dishes and countries pile up. That's why real models use hundreds of numbers per word.` };
      if (st.picked != null) return { msg: `<b>${WORDS[st.picked].w}</b> (a ${KN[WORDS[st.picked].kind]}). The grey lines go to its three nearest words.` };
      return { ok, msg: `<b>${a} − ${b} + ${c} = ${ans}.</b> Take the arrow from ${b} to ${a}, start it at ${c}, and see where it lands. ${ok ? 'Right.' : 'Close, but not quite.'} Tap any word to see its neighbours.` };
    }
    return { update: () => { if (st.show) ring.quaternion.copy(S.R.cam.quaternion); }, controls, readouts, labels, breaks, status,
      reset: () => { Object.assign(st, { q: PRESETS[0].map(idx), shuffled: false, flat: false, show: true, picked: null }); draw(); },
      pick: i => { st.q = PRESETS[i].map(idx); st.picked = null; draw(); } };
  },

  story: [
    { t: 'Words as points', home: true, say: 'Each word here is a point in space: three numbers. Words that are used in similar ways end up near each other.', act: m => m.pick(0) },
    { t: 'Three floors', home: true, say: 'Countries sit on the bottom floor, roughly where they are on the map. Capitals float one floor up, and national dishes two floors up.' },
    { t: 'A direction means something', focus: 'offset', zoom: 1.4, say: 'The arrow from Nigeria up to Abuja means: the capital of. And it is almost the same arrow for every country.' },
    { t: 'Word arithmetic', focus: 'answer', zoom: 1.3, say: 'So take Abuja, subtract Nigeria, add Kenya. Start the arrow at Kenya, follow it, and the nearest word is Nairobi.' },
    { t: 'Dishes too', home: true, say: 'It works for food. Egusi minus Nigeria plus Senegal lands on thieboudienne.', act: m => m.pick(1) },
    { t: 'Learned, not drawn', home: true, say: 'We placed these words by hand so you can see them. A real model learns hundreds of numbers per word from billions of sentences, and these directions appear on their own.' },
  ],
  check: [
    { q: 'What is a word embedding?', options: ['A list of numbers that places a word in space', 'A dictionary definition', 'A picture of the word'], answer: 0, why: 'Each word becomes a point. Similar words get similar numbers.' },
    { q: 'Abuja − Nigeria + Kenya lands near…', options: ['Ugali', 'Nairobi', 'Ghana'], answer: 1, why: 'The "capital of" arrow, started from Kenya, lands on its capital.' },
    { q: 'Why do real models use hundreds of numbers per word?', options: ['To look impressive', 'So many kinds of meaning can each have their own direction', 'Because words are long'], answer: 1, why: 'With one or three numbers, words pile up. Hundreds of directions leave room for every kind of relationship.' },
  ],
  terms: [
    ['Embedding', 'A word (or picture, or song) turned into a list of numbers.'],
    ['Dimension', 'One of those numbers: one direction in the space.'],
    ['Nearest neighbour', 'The word whose point is closest.'],
    ['Analogy', 'A − B + C: copying a relationship from one pair to another.'],
    ['word2vec', 'A 2013 method that learns embeddings by predicting nearby words.'],
  ],
  deeper: '<p>Word2vec learns by playing a guessing game: given a word, predict the words around it in real sentences. Words that appear in similar company get pushed toward similar numbers. Nobody tells it about capitals; the pattern appears because "Abuja" and "Nairobi" are used in similar sentences.</p><p>Embeddings carry the biases of the text they learn from, so they are tested and corrected before they are used for decisions about people.</p>',
  code: {
    title: 'Word arithmetic in Python',
    note: 'Nearest neighbour after A − B + C, with cosine similarity.',
    text: `
import numpy as np

def cosine(a, b):
    return a @ b / (np.linalg.norm(a) * np.linalg.norm(b))

def analogy(emb, a, b, c, top=1):
    target = emb[a] - emb[b] + emb[c]
    scores = {w: cosine(v, target) for w, v in emb.items()
              if w not in (a, b, c)}
    return sorted(scores, key=scores.get, reverse=True)[:top]

# emb = {"abuja": np.array([...]), "nigeria": ..., ...}
# analogy(emb, "abuja", "nigeria", "kenya")  ->  ["nairobi"]
`,
  },
};
