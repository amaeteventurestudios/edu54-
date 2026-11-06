// Vision encoder patches (phase 19, lesson 58): a Nakuru crop photo becomes a sequence of patch tokens. A real count: (size/patch)² patches, plus a CLS token. The picture is a grid of squares, lifted into a row. 2D sinusoidal positions keep where each came from. Conv2d and unfold-then-linear are the same sum.
function run(o) {
  const side = Math.floor(o.size / o.patch), n = side * side, dim = o.patch * o.patch * 3, params = dim * 768 + 768;
  return { side, n, tokens: n + (o.cls ? 1 : 0), dim, params, cropped: o.size % o.patch };
}

export default {
  slug: 'vision-encoder-patches',
  title: 'Patches: turning a picture into tokens',
  description: 'A transformer reads sequences. Cut an image into squares, project each one, and add where it came from.',
  overview: 'A transformer eats a sequence, so an image must become one. Cut it into fixed squares. At 224 pixels and patches of 16, that is 14 by 14, or 196 patches. Flatten each and project it to the model\'s size: a 16 by 16 by 3 patch is 768 numbers. A convolution with kernel and stride both equal to the patch size does exactly this, faster. Add a position embedding, in two dimensions, so that the model knows where each came from, and a CLS token for a summary. Then you have 197 tokens. Smaller patches see more detail and cost far more. This lesson counts it live on a crop photo from Nakuru.',
  keywords: ['vision transformer', 'patch embedding', 'CLS token', 'positional encoding', 'ViT', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.9, 1.1], half: 1.05, wide: 5 },

  build(S) {
    const { V, P } = S;
    const D0 = { size: 224, patch: 16, cls: true, pos: true }, st = { ...D0 };
    const GOOD = '#1F9E89', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 3, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const MAX = 28, C = Array.from({ length: MAX * MAX }, () => { const m = new S.THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(0.1, 0.08, 0.1, '#fff', { r: 0.005, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    const cls = P.box(0.26, 0.2, 0.26, SAF, { r: 0.03 }); cls.position.set(1.7, 0.03, 0); S.add(cls);
    const belt = P.box(0.06, 0.03, 2.2, '#6B6E7E', { r: 0.01 }); belt.position.set(1.3, 0.03, 0); S.add(belt);
    S.add(P.keep(-2.3, 2.3, 0.6, -1.3, 1.3));
    let R = null;
    const col = (x, y) => `hsl(${90 + 50 * Math.sin(x * 0.5) * Math.cos(y * 0.4)}, 45%, ${35 + 20 * Math.sin(x * 0.3 + y * 0.2) ** 2}%)`;
    function draw() {
      R = run(st);
      const W = 2.6, s = W / R.side;
      C.forEach(({ b, m }, i) => {
        const r = Math.floor(i / MAX), c = i % MAX, on = r < R.side && c < R.side; b.visible = on; if (!on) return;
        b.scale.set((s - 0.012) / 0.1, st.pos ? 1 + (c + r) / R.side * 0.9 : 1, (s - 0.012) / 0.1); b.position.set(-2.0 + c * s + s / 2, 0.03, -1.3 + r * s + s / 2); m.color.set(col(c * 28 / R.side, r * 28 / R.side));
      });
      cls.scale.y = st.cls ? 1 : 0.15;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const SZ = [112, 224, 448], PT = [8, 16, 32];
    const controls = [
      { type: 'buttons', label: 'Image size', options: ['112', '224', '448'], get: () => SZ.indexOf(st.size), act: i => set({ size: SZ[i] }) },
      { type: 'buttons', label: 'Patch size', options: ['8', '16', '32'], get: () => PT.indexOf(st.patch), act: i => set({ patch: PT[i] }) },
      { type: 'toggle', label: 'Add a CLS token', short: 'CLS', get: () => st.cls, set: v => set({ cls: !!v }) },
      { type: 'toggle', label: 'Add 2D position', short: 'Position', get: () => st.pos, set: v => set({ pos: !!v }) },
    ];
    const readouts = [
      { label: 'Tokens', get: () => ({ v: `${R.tokens}`, sub: `${R.side} × ${R.side} patches`, good: R.tokens < 300, bad: R.tokens > 2000 }) },
      { label: 'Numbers per patch', get: () => ({ v: `${R.dim}`, sub: `${st.patch} × ${st.patch} × 3` }) },
      { label: 'Attention cost', get: () => ({ v: `${Math.round((R.tokens / 197) ** 2 * 10) / 10}×`, sub: 'against 197 tokens', good: R.tokens <= 197, bad: R.tokens > 800 }) },
    ];
    const labels = [
      { name: 'g', t: 'The photo as patches', d: 'Height shows the position added', icon: 'eye', atV: V(-2.05, 0.1, 0) },
      { name: 'c', t: 'The CLS token', d: 'A summary slot', icon: 'box', atV: V(1.85, 0.15, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Patches too small', hint: 'tokens explode', on: () => set({ ...D0, size: 448, patch: 8 }), off: reset },
      { label: 'Patches too large', hint: 'small pests vanish', on: () => set({ ...D0, size: 112, patch: 32 }), off: reset },
      { label: 'No position', hint: 'a shuffled picture looks the same', on: () => set({ ...D0, pos: false }), off: reset },
    ];
    function status() {
      if (R.tokens > 2000) return { ok: false, msg: `<b>${R.tokens} tokens: attention costs ${Math.round((R.tokens / 197) ** 2)} times as much.</b> Cost grows with the square of tokens.` };
      if (R.side < 5) return { ok: false, msg: `<b>Only ${R.n} patches.</b> A pest on a leaf is smaller than a patch, and gets lost.` };
      if (!st.pos) return { ok: false, msg: '<b>Shuffle the patches, and the model can\'t tell.</b> Attention has no sense of place. Add position.' };
      return { ok: true, msg: `<b>${R.side} × ${R.side} patches, ${R.tokens} tokens.</b> That is the standard ViT start.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Sequences only', home: true, say: 'A transformer reads sequences. A crop photo from Nakuru isn\'t one.', act: m => m.set({ size: 224, patch: 32, cls: false, pos: false }) },
    { t: 'Cut it up', home: true, say: 'Cut it into squares. Fourteen by fourteen gives a hundred and ninety-six patches.', act: m => m.set({ size: 224, patch: 16, cls: false, pos: false }) },
    { t: 'Project', home: true, say: 'Each patch becomes one vector. A convolution with stride equal to the patch does this.', act: m => m.set({ size: 224, patch: 16, cls: false, pos: false }) },
    { t: 'Where it was', home: true, say: 'Add a position in two dimensions, so that order means place.', act: m => m.set({ size: 224, patch: 16, cls: false, pos: true }) },
    { t: 'A summary slot', home: true, say: 'A CLS token joins the row, to gather the whole image.', act: m => m.set({ size: 224, patch: 16, cls: true, pos: true }) },
    { t: 'Patch size', home: true, say: 'Smaller patches see more, and cost grows with the square.', act: m => m.set({ size: 448, patch: 16, cls: true, pos: true }) },
  ],
  check: [
    { q: 'How many patches at 224 pixels with size 16?', options: ['196', '16', '224'], answer: 0, why: '14 × 14.', hint: 'Read Tokens.' },
    { q: 'What matches unfold-then-linear?', options: ['A convolution with kernel = stride = patch', 'A softmax', 'A pooling layer'], answer: 0, why: 'The same sum, faster.', hint: 'See Project.' },
    { q: 'Why does cost grow fast with small patches?', options: ['Attention scales with the square of tokens', 'Images get bigger', 'Pixels cost more'], answer: 0, why: 'Every token reads every token.', hint: 'Try Patches too small.' },
  ],
  terms: [['Patch', 'A square piece of an image.'], ['Patch embedding', 'A patch as one vector.'], ['CLS token', 'A summary slot.'], ['2D position', 'Row and column information.']],
  deeper: '<p><b>Next.</b> The following lesson stacks blocks on these tokens.</p><p><b>Earlier lessons</b> explain ViTs. This one builds the front end.</p><p><b>Colours</b> stand in for a photo.</p>',
  code: {
    title: 'Patch front end',
    note: 'Adapted from the course\'s encoder (code/main.py).',
    text: `
proj = nn.Conv2d(3, 768, kernel_size=16, stride=16)

def embed(images):
    x = proj(images).flatten(2).transpose(1, 2)      # 196 tokens
    cls = cls_token.expand(len(x), -1, -1)
    return torch.cat([cls, x], dim=1) + pos_2d
`,
  },
};
