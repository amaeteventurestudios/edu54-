// Open-vocabulary vision with CLIP: two towers, one for photos and one for text, map into the same space. Matching pairs land close together.
// The grid shows similarity between six photos from a craft market in Kumasi and six captions: the diagonal should glow.
// Zero-shot classification: write the class names as captions, and pick the caption closest to the photo. No training on these classes at all.
// Break it: bare class names instead of a prompt template ("kente" vs "a photo of kente cloth"), no normalisation (long captions win by size alone), a class the model never saw in training.
const PH = [
  { n: 'kente cloth', c: '#E3A72F' }, { n: 'a talking drum', c: '#8A5A2B' }, { n: 'glass beads', c: '#3D6BD6' },
  { n: 'a carved stool', c: '#6B3E26' }, { n: 'adinkra stamps', c: '#151827' }, { n: 'a smock (fugu)', c: '#E8E0C8' },
];
// hidden "concept" vectors: each photo and caption is a mix of these; captions without context are noisier
const D = 8;
function unit(v) { const n = Math.hypot(...v); return v.map(x => x / n); }
function vecs(o) {
  let s = 21; const r = () => (s = (s * 16807) % 2147483647) / 2147483647, g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());
  const base = PH.map((_, i) => [...Array(D)].map((_, d) => (d === i ? 1 : 0) + (d === 7 ? 0.8 : 0) + g() * 0.18));   // real embeddings share a common offset
  const img = base.map(b => unit(b.map(x => x + g() * 0.15)));
  const noise = o.template ? 0.22 : 0.55;
  let txt = base.map((b, i) => { const v = b.map(x => x + g() * noise); return o.norm ? unit(v) : v.map(x => x * [1.1, 1.6, 0.9, 1.3, 2.6, 1.2][i]); });   // raw lengths differ from caption to caption
  if (o.unseen) { img[5] = unit([...Array(D)].map(() => g() * 0.6).map((x, d) => x + (d === 0 ? 0.45 : 0) + (d === 3 ? 0.35 : 0))); }
  return { img, txt };
}

export default {
  slug: 'open-vocab-clip',
  title: 'CLIP: matching pictures and words',
  description: 'Search photos for a label no model was trained on. CLIP scores each picture against each phrase, so write the classes as sentences and read the grid.',
  overview: 'CLIP learns from photos paired with the text found next to them on the web. A photo encoder and a text encoder each turn their input into a vector, and training pulls the vectors of real pairs together and pushes mismatched ones apart, the same contrastive idea used for self-supervised vision, across two kinds of data. Afterwards you can classify into any classes you like: write each class as a caption, "a photo of a talking drum", and pick the caption whose vector is closest to the photo\'s. Wording matters, vectors must be normalised before comparing, and it can only recognise things that resemble what it saw in training.',
  keywords: ['clip explained', 'zero shot classification', 'contrastive language image', 'prompt templates clip', 'open vocabulary'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.85, 0], dir: [0.12, 0.6, 1.3], half: 1.75, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { template: true, norm: true, unseen: false };
    const ink = '#151827';
    /* ---------- photos on the left, captions along the top ---------- */
    const GX = 0.35, GZ = -0.45, CS = 0.3, GY = 0.12 + 0.3;

    const wall = P.box(6 * CS + 2.2, 6 * CS + 0.75, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(GX - 0.5, 0.12, GZ); floor.add(wall);
    const gx = j => GX - 3 * CS + (j + 0.5) * CS, gy = i => GY + (5 - i + 0.5) * CS;
    const thumbs = PH.map((p, i) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(CS * 0.8, CS * 0.8), new THREE.MeshBasicMaterial({ color: p.c })); m.position.set(GX - 3 * CS - 0.25, gy(i), GZ + 0.046); m.layers.set(1); m.userData.noFit = true; floor.add(m); return m; });
    const cells = [];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      const m = new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), c = new THREE.Mesh(new THREE.PlaneGeometry(CS * 0.94, CS * 0.94), m); c.position.set(gx(j), gy(i), GZ + 0.045); c.layers.set(1); c.userData.noFit = true; floor.add(c); cells.push(m);
    }
    const picks = [...Array(6)].map(() => { const r = P.tube([...Array(5)].map((_, k) => { const a = k / 4 * Math.PI * 2 + Math.PI / 4; return V(Math.cos(a) * CS * 0.66, Math.sin(a) * CS * 0.66, 0); }), 0.012, C.orange); r.userData.noFit = true; floor.add(r); return r; });
    /* ---------- the two towers ---------- */
    const tower = (x, color, name, sub) => {
      const b = P.box(0.7, 0.55, 0.5, color, { r: 0.06 }); b.position.set(x, 0.12, 0.85); floor.add(b);
      return { b };
    };
    tower(-2.2, C.indigo, 'photo tower', 'photo → vector');
    const tt = tower(2.5, C.plum, 'text tower', '');
    const shared = P.cyl(0.35, 0.08, C.gold, { seg: 32 }); shared.position.set(0.15, 0.12, 0.9); floor.add(shared);

    [[-1.8, -0.25], [2.1, 0.55]].forEach(([a, b]) => { const t = P.tube([V(a, 0.35, 0.85), V(b, 0.2, 0.9)], 0.015, '#8E91A3'); t.userData.noFit = true; floor.add(t); });
    /* ---------- maths ---------- */
    let R = null;
    function draw() {
      const { img, txt } = vecs(st);
      const sim = img.map(a => txt.map(b => a.reduce((s, x, d) => s + x * b[d], 0)));
      const flat = sim.flat(), lo = Math.min(...flat), hi = Math.max(...flat);
      let right = 0;
      const pick = sim.map(row => row.indexOf(Math.max(...row)));
      sim.forEach((row, i) => row.forEach((v, j) => { const u = (v - lo) / (hi - lo + 1e-9); cells[i * 6 + j].color.set('#FFFFFF').lerp(new THREE.Color(C.teal), u * 0.95); }));
      pick.forEach((j, i) => { picks[i].position.set(gx(j), gy(i), GZ + 0.052); if (j === i && !(st.unseen && i === 5)) right++; });
      thumbs[5].material.color.set(st.unseen ? '#9C8E6A' : PH[5].c);
      R = { right, n: st.unseen ? 5 : 6, pick, sim, unseenPick: st.unseen ? PH[pick[5]].n : null };
    }
    draw();
    const controls = [
      { type: 'toggle', label: 'Prompt template ("a photo of …")', short: 'template', get: () => st.template, set: v => { st.template = v; draw(); } },
      { type: 'toggle', label: 'Normalise vectors before comparing', short: 'normalise', get: () => st.norm, set: v => { st.norm = v; draw(); } },
      { type: 'toggle', label: 'Swap in an object it never saw', short: 'unseen object', get: () => st.unseen, set: v => { st.unseen = v; draw(); } },
    ];
    const readouts = [
      { label: 'Zero-shot right', get: () => ({ v: `${R.right} of ${R.n}`, sub: 'no training on these', good: R.right === R.n, bad: R.right < R.n - 1 }) },
      { label: 'Training on these classes', get: () => ({ v: 'none', sub: 'just captions' }) },
      { label: 'Diagonal', get: () => { const d = R.sim.map((r, i) => r[i]).reduce((a, v) => a + v, 0) / 6, o = (R.sim.flat().reduce((a, v) => a + v, 0) - d * 6) / 30; return { v: `${d.toFixed(2)} vs ${o.toFixed(2)}`, sub: 'matches vs the rest' }; } },
    ];
    const labels = [
      { name: 'grid', t: 'Photo against caption', d: 'Teal: close; orange box: its pick', icon: 'scale', atV: V(GX + 3 * CS, GY + 3 * CS, GZ) },
      { name: 'photos', t: 'Six photos, Kumasi', d: 'One row each', icon: 'eye', atV: V(GX - 3 * CS - 1.45, GY + 3 * CS, GZ) },
      { name: 'towers', t: 'Two towers', d: 'Photos and text into one space', icon: 'link', atV: V(-2.55, 0.4, 0.85) },
    ];
    const reset = () => { Object.assign(st, { template: true, norm: true, unseen: false }); draw(); };
    const breaks = [
      { label: 'Bare class names', hint: '"kente" instead of "a photo of kente cloth"', on: () => { reset(); st.template = false; draw(); }, off: reset },
      { label: 'Skip normalisation', hint: 'Compare raw vectors', on: () => { reset(); st.norm = false; draw(); }, off: reset },
      { label: 'An object it never saw', hint: 'A shea-butter press', on: () => { reset(); st.unseen = true; draw(); }, off: reset },
    ];
    function status() {
      if (st.unseen) return { ok: false, msg: `<b>Confidently wrong about something new.</b> The shea-butter press looks nothing like anything paired with text in training, so CLIP still has to pick one of the six captions and chooses "${R.unseenPick}". Zero-shot is only as wide as what it saw; it cannot say "none of these" unless you add that as a caption.` };
      if (!st.norm) return { ok: false, msg: `<b>One caption wins by size.</b> Without normalising, a vector's length counts as much as its direction, and the "adinkra stamps" caption happens to come out with a long vector, so it scores high against almost every photo: ${R.right} of ${R.n} right. Normalise both sides so only the direction, the meaning, is compared.` };
      if (!st.template) return { ok: false, msg: `<b>Bare names are vague.</b> On the web, a word on its own appears in all sorts of contexts, so "stool" or "beads" alone gives a noisier vector than "a photo of a carved stool": ${R.right} of ${R.n} right. A prompt template matches how photos are usually described.` };
      return { ok: true, msg: `<b>${R.right} of ${R.n} with no training.</b> Each class is just a caption, "a photo of …", and every photo picks the caption closest to it in the shared space. The bright diagonal shows matches far closer than mismatches. New classes need only new captions.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Two towers', home: true, say: 'CLIP has two towers: one turns a photo into a vector, the other turns text into a vector, in the same space.', act: m => m.set({ template: true, norm: true, unseen: false }) },
    { t: 'Trained on pairs', home: true, say: 'It learned from photos and the words found beside them, pulling real pairs together and pushing mismatches apart.', act: m => m.set({}) },
    { t: 'The diagonal', home: true, say: 'Six photos from a craft market in Kumasi, against six captions. Each photo is closest to its own caption: the bright diagonal.', act: m => m.set({}) },
    { t: 'Zero shot', home: true, say: 'To classify, write each class as a caption and pick the closest. No training on kente, drums or beads at all. The wording matters: bare names are vaguer.', act: m => m.set({ template: false }) },
    { t: 'Normalise', home: true, say: 'Compare raw vectors, and length sneaks in: one caption with a long vector scores high against almost everything. Normalised, only the direction counts.', act: m => m.set({ template: true, norm: false }) },
    { t: 'Something new', home: true, say: 'Show it a shea butter press it never saw, and it still has to choose one of the captions. It only knows what it saw in training.', act: m => m.set({ norm: true, unseen: true }) },
  ],
  check: [
    { q: 'How does CLIP classify with no training on the classes?', options: ['It writes each class as a caption and picks the caption closest to the photo', 'It retrains for each class', 'It asks a person'], answer: 0, why: 'Both live in the same vector space.' },
    { q: 'Why use "a photo of a talking drum" instead of "drum"?', options: ['It matches how photos are described, giving a clearer text vector', 'It is shorter', 'CLIP cannot read single words'], answer: 0, why: 'Bare words appear in many contexts.' },
    { q: 'Why normalise the vectors before comparing?', options: ['So only direction, the meaning, counts, not length', 'To make them longer', 'To speed up training'], answer: 0, why: 'Otherwise long vectors win by size.' },
  ],
  terms: [
    ['CLIP', 'A model with an image encoder and a text encoder trained to match pairs.'],
    ['Zero-shot', 'Handling classes the model was never trained on directly.'],
    ['Shared embedding space', 'One vector space for both photos and text.'],
    ['Prompt template', 'A fixed phrase like "a photo of …" wrapped around class names.'],
    ['Cosine similarity', 'The dot product of normalised vectors: how aligned they are.'],
    ['Open vocabulary', 'Recognising any class you can describe in words.'],
  ],
  deeper: '<p><b>SigLIP</b> replaces the batch-wide softmax with a simple yes-or-no score for every photo-caption pair, which works better with smaller batches.</p><p><b>Where it is used.</b> CLIP-style encoders power image search by text, filter generated images, and give vision-language models their sense of what is in a picture.</p><p><b>About this machine.</b> The vectors are made up to show the effect of templates, normalisation and unseen objects.</p>',
  code: {
    title: 'Zero-shot classification with a two-tower model',
    note: 'Adapted from the course\'s open-vocabulary vision lesson.',
    text: `
import torch, torch.nn.functional as F

classes = ["kente cloth", "a talking drum", "glass beads", "a carved stool"]
prompts = [f"a photo of {c}" for c in classes]

with torch.no_grad():
    t = F.normalize(text_encoder(tokenize(prompts)), dim=-1)     # one vector per class
    v = F.normalize(image_encoder(preprocess(photo)), dim=-1)    # the photo's vector
    sims = v @ t.T                                               # cosine similarity
    probs = (sims * 100).softmax(dim=-1)

print(classes[probs.argmax()])
`,
  },
};
