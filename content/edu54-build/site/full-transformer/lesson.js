// The full transformer: an encoder-decoder translating Swahili ("Ninakwenda sokoni kununua nyanya") into English. Two towers of layers; a residual highway runs up each;
// cross-attention bridges carry the encoder's output into every decoder layer. Each slab's colour is the size of the signal at that layer, and the side bar the gradient
// reaching it, computed live by pushing a vector through a small random network (width 16, seed fixed) and back. Translations per setting are scripted.
// Break it: a plain 12-layer stack with no residuals or norms (the gradient vanishes, nothing trains), no normalisation (the signal blows up), no cross-attention (fluent English unrelated to the Swahili).
const D = 16, SRC = ['Ninakwenda', 'sokoni', 'kununua', 'nyanya'];
function net(L, res, norm) {
  let seed = 19; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const g = () => { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const Ws = Array.from({ length: L }, () => Array.from({ length: D }, () => Array.from({ length: D }, () => g() * (res ? 1.1 : 0.7) / Math.sqrt(D))));
  const mv = (W, x) => W.map(r => r.reduce((a, w, j) => a + w * x[j], 0)), mvT = (W, x) => W[0].map((_, j) => W.reduce((a, r, i) => a + r[j] * x[i], 0));
  const rms = x => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);
  let x = Array.from({ length: D }, () => g()); const sig = [rms(x)], scales = [];
  Ws.forEach(W => { const s = norm ? 1 / Math.max(1e-6, rms(x)) : 1; scales.push(s); const f = mv(W, x.map(v => v * s)); x = res ? x.map((v, i) => v + f[i]) : f; sig.push(rms(x)); });
  // backward (linearised): gradient from the top flows down through each layer's Jacobian
  let gr = Array.from({ length: D }, () => 1 / Math.sqrt(D)); const grad = [rms(gr) * Math.sqrt(D)];
  for (let l = L - 1; l >= 0; l--) { const b = mvT(Ws[l], gr).map(v => v * scales[l]); gr = res ? gr.map((v, i) => v + b[i]) : b; grad.unshift(rms(gr) * Math.sqrt(D)); }
  return { sig, grad };
}

export default {
  slug: 'full-transformer',
  title: 'The full transformer: encoder and decoder',
  description: 'An encoder-decoder transformer translates "Ninakwenda sokoni kununua nyanya" from Swahili into English. Watch the signal and the gradient through every layer, and the bridges between the towers. Then build a plain deep stack, leave out normalisation, or cut the cross-attention bridges.',
  overview: 'The original transformer has two stacks. The encoder reads the whole source sentence with self-attention that sees every position, then a feed-forward network transforms each position. The decoder writes the output one token at a time: masked self-attention over what it has written so far, cross-attention whose queries come from the decoder and whose keys and values come from the encoder output, the only path from source to target, and its own feed-forward network. Around every sublayer sits a residual connection, adding the sublayer\'s output to its input, which gives gradients a direct path through deep stacks; and a normalisation layer, now usually RMSNorm placed before each sublayer, which keeps the signal at a steady size. Modern blocks also swap ReLU for SwiGLU, sinusoidal positions for RoPE and full multi-head attention for grouped-query attention. BERT keeps only the encoder, GPT only the decoder, and T5 both.',
  keywords: ['transformer', 'encoder decoder', 'cross-attention', 'residual connection', 'layer normalisation', 'feed-forward network'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.15, 0], dir: [0.15, 0.35, 1.3], half: 1.45, wide: 5.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { L: 1, res: true, norm: true, cross: true };
    const ink = '#151827', LS = [2, 6, 12];
    const base = P.box(4.8, 0.12, 2.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    const EX = -1.2, DX = 1.2, Y0 = 0.4, TH = 1.75;
    const mkTower = (x, name, col) => {
      const plinth = P.box(1.4, 0.2, 1.0, col, { r: 0.04 }); plinth.position.set(x, 0.12, 0); S.add(plinth);
      const f = S.text(name, { size: 0.11, weight: 800, face: 'front', color: '#FFFFFF' }); f.position.set(x, 0.22, 0.505); S.add(f);
      const slabs = Array.from({ length: 12 }, () => { const mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(1.1, 1, 0.7, col, { r: 0.03, material: mm }); b.userData.noFit = true; S.add(b);
        const gm = new THREE.MeshLambertMaterial({ color: C.coral }), gb = P.box(0.08, 1, 0.08, C.coral, { r: 0.01, material: gm }); gb.userData.noFit = true; S.add(gb); return { b, mm, gb, gm }; });
      const hw = P.box(0.06, TH, 0.06, '#C9A227', { r: 0.02 }); hw.position.set(x - 0.7, Y0, 0.3); S.add(hw);
      const keep = P.box(1.1, TH, 0.7, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(x, Y0, 0); S.add(keep);
      return { slabs, hw };
    };
    const enc = mkTower(EX, 'Encoder', '#3B3F8F'), dec = mkTower(DX, 'Decoder', C.plum);
    const bridges = Array.from({ length: 12 }, () => { const mm = new THREE.MeshBasicMaterial({ color: C.coral, transparent: true, opacity: 0.6 }), t = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.012, C.coral, { material: mm }); t.layers.set(1); t.userData.noFit = true; S.add(t); return t; });
    /* source words in front of the encoder, output words above the decoder */
    SRC.forEach((w, i) => { const t = S.text(w, { size: 0.1, weight: 800, face: 'front', color: '#FFFFFF', bg: '#3B3F8F', top: true }); t.position.set(EX - 1.0 + i * 0.68, 0.16, 1.02); t.userData.noFit = true; S.add(t); });
    const outB = P.box(2.6, 0.4, 0.06, '#FBF8F1', { r: 0.03 }); outB.position.set(DX, Y0 + TH + 0.12, -0.2); S.add(outB);
    const outT = S.text('', { size: 0.13, weight: 800, face: 'front', color: ink, maxW: 2.5 }); outT.position.set(DX, Y0 + TH + 0.32, -0.165); S.add(outT);
    const leg = S.text('slab colour: signal size · red post: gradient · gold rod: residual path', { size: 0.07, weight: 700, face: 'front', color: '#5A5A66', maxW: 4.5 }); leg.position.set(0, 0.03, 1.11); leg.userData.noFit = true; S.add(leg);

    let R = null;
    const colOf = (v, base0) => (v > 8 ? '#D64545' : v < 0.15 ? '#B9B4A8' : base0);
    function draw() {
      const L = LS[st.L], N = net(L, st.res, st.norm), M = net(L, st.res, st.norm);
      const h = TH / L;
      [[enc, '#3B3F8F', N], [dec, C.plum, M]].forEach(([T, col, nn]) => T.slabs.forEach((s, l) => { const on = l < L; s.b.visible = on; s.gb.visible = on; if (!on) return;
        const y = Y0 + l * h, sig = nn.sig[l + 1], gr = nn.grad[l];
        s.b.scale.set(1, h * 0.8, 1); s.b.position.set(T === enc ? EX : DX, y, 0); s.mm.color.set(colOf(sig, col));
        const gh = Math.max(0.01, Math.min(h * 0.8, Math.log10(1 + gr) * h)); s.gb.scale.y = gh; s.gb.position.set((T === enc ? EX : DX) + 0.62, y, 0.3); s.gm.color.set(gr < 0.05 ? '#B9B4A8' : gr > 50 ? '#D64545' : C.coral); }));
      enc.hw.visible = st.res; dec.hw.visible = st.res;
      bridges.forEach((b, l) => { const on = st.cross && l < L; b.visible = on; if (!on) return; const a = V(EX + 0.55, Y0 + L * h - h * 0.3, -0.2), c = V(DX - 0.55, Y0 + l * h + h * 0.4, -0.2), mid = a.clone().lerp(c, 0.5).add(V(0, 0.15, -0.35));
        b.geometry.dispose(); b.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, c), 20, 0.012, 6, false); });
      const top = N.sig[L], g1 = N.grad[0];
      const trains = g1 > 0.05 && top < 8;
      const out = !trains ? (top >= 8 ? 'nan nan nan nan' : 'the the the the') : !st.cross ? 'The weather is very good today.' : 'I am going to the market to buy tomatoes.';
      outT.userData.set(`→ ${out}`, out.startsWith('I am') ? '#151827' : '#8A1F1F');
      R = { L, top, g1, trains, out };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Layers per tower', options: LS.map(String), get: () => st.L, act: i => { st.L = i; draw(); } },
      { type: 'toggle', label: 'Residual connections', short: 'residual', get: () => st.res, set: v => { st.res = v; draw(); } },
      { type: 'toggle', label: 'Normalisation before each sublayer', short: 'norm', get: () => st.norm, set: v => { st.norm = v; draw(); } },
      { type: 'toggle', label: 'Cross-attention bridges', short: 'cross-attention', get: () => st.cross, set: v => { st.cross = v; draw(); } },
    ];
    const readouts = [
      { label: 'Signal at the top', get: () => ({ v: R.top >= 1000 ? R.top.toExponential(1) : R.top.toFixed(2), sub: 'size of the vector', bad: R.top > 8 || R.top < 0.15, good: R.top <= 8 && R.top >= 0.15 }) },
      { label: 'Gradient at layer 1', get: () => ({ v: R.g1 < 0.001 ? R.g1.toExponential(1) : R.g1.toFixed(2), sub: 'what reaches the bottom', bad: R.g1 < 0.05 || R.g1 > 50, good: R.g1 >= 0.05 && R.g1 <= 50 }) },
      { label: 'Translation', get: () => ({ v: R.out.startsWith('I am') ? 'faithful' : R.trains ? 'unrelated' : 'does not train', good: R.out.startsWith('I am'), bad: !R.out.startsWith('I am') }) },
    ];
    const labels = [
      { name: 'enc', t: 'Encoder', d: 'Reads all the Swahili at once', icon: 'eye', atV: V(EX - 0.75, Y0 + TH / 2, 0) },
      { name: 'dec', t: 'Decoder', d: 'Writes English, word by word', icon: 'spark', atV: V(DX + 0.75, Y0 + TH / 2, 0) },
      { name: 'bridge', t: 'Cross-attention', d: 'The only path between towers', icon: 'link', atV: V(0, Y0 + TH * 0.75, -0.55) },
    ];
    const reset = () => { Object.assign(st, { L: 1, res: true, norm: true, cross: true }); draw(); };
    const breaks = [
      { label: 'Plain stack, 12 layers', hint: 'No residuals, no norms', on: () => { reset(); st.L = 2; st.res = false; st.norm = false; draw(); }, off: reset },
      { label: 'No normalisation, 12 layers', hint: 'Let it grow', on: () => { reset(); st.L = 2; st.norm = false; draw(); }, off: reset },
      { label: 'Cut the bridges', hint: 'No cross-attention', on: () => { reset(); st.cross = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.res && R.g1 < 0.05) return { ok: false, msg: `<b>The gradient never reaches the bottom.</b> In a plain stack with no residual connections and no norms, the signal must pass through every one of ${R.L} layers in turn, and each shrinks it: only ${R.g1.toExponential(1)} of the gradient reaches layer 1, so the lower layers never learn and the output is "${R.out}". Residuals add each sublayer's output to its input, a direct path the gold rod shows.` };
      if (R.top >= 8) return { ok: false, msg: `<b>The signal blows up.</b> With residuals but no normalisation, each layer adds to the vector without rescaling it, and after ${R.L} layers its size is ${R.top >= 1000 ? R.top.toExponential(1) : R.top.toFixed(0)}. Training diverges and produces "${R.out}". A norm before each sublayer brings the input back to a steady size.` };
      if (!st.cross) return { ok: false, msg: `<b>Fluent, and unrelated.</b> The decoder trains fine and writes good English, "${R.out}", but without cross-attention it never sees the encoder's reading of the Swahili. Cross-attention is the only bridge: queries from the decoder, keys and values from the encoder.` };
      return { ok: true, msg: `<b>"${R.out}"</b> ${R.L} layers per tower: residuals carry the gradient down (${R.g1.toFixed(2)} at layer 1), norms keep the signal near ${R.top.toFixed(2)}, and every decoder layer reads the encoder's output through cross-attention.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Two towers', home: true, say: 'An encoder reads "Ninakwenda sokoni kununua nyanya" all at once. A decoder writes the English, word by word.', act: m => m.set({ L: 1, res: true, norm: true, cross: true }) },
    { t: 'Inside a layer', home: true, say: 'Each layer has attention, then a feed-forward network. Around each sits a residual connection and a normalisation step.', act: m => m.set({}) },
    { t: 'The bridges', home: true, say: 'Cross-attention carries the encoder\'s reading into every decoder layer. Cut it, and the English is fluent but has nothing to do with the Swahili.', act: m => m.set({ cross: false }) },
    { t: 'Go deep', home: true, say: 'Stack twelve layers. With residual connections, the gradient still reaches the bottom.', act: m => m.set({ cross: true, L: 2 }) },
    { t: 'A plain stack', home: true, say: 'Remove residuals and norms, the way deep networks were built before 2015, and the gradient shrinks at every layer. The bottom layers never learn.', act: m => m.set({ res: false, norm: false }) },
    { t: 'No normalisation', home: true, say: 'Put residuals back but leave normalisation out, and the signal grows at every layer until it blows up.', act: m => m.set({ res: true, norm: false }) },
  ],
  check: [
    { q: 'What is the only path from the encoder to the decoder?', options: ['Cross-attention', 'The residual connection', 'The feed-forward network'], answer: 0, why: 'Queries from the decoder, keys and values from the encoder.' },
    { q: 'Why do deep transformers need residual connections?', options: ['They give the gradient a direct path down through the layers', 'They make the model smaller', 'They replace attention'], answer: 0, why: 'Without them the gradient vanishes.' },
    { q: 'What does normalisation before each sublayer prevent?', options: ['The signal growing out of control through the layers', 'Attention looking ahead', 'Overfitting'], answer: 0, why: 'It rescales each input to a steady size.' },
  ],
  terms: [
    ['Encoder', 'The stack that reads the whole input with unmasked self-attention.'],
    ['Decoder', 'The stack that writes output token by token with masked self-attention.'],
    ['Cross-attention', 'Decoder queries attending to encoder keys and values.'],
    ['Residual connection', 'Adding a sublayer\'s output to its input.'],
    ['RMSNorm', 'Rescaling a vector by its root mean square; the modern norm.'],
    ['Feed-forward network', 'A small two-layer network applied to each position.'],
  ],
  deeper: '<p><b>One block, three families.</b> Keep only the encoder and you have BERT, for understanding text; keep only the decoder and you have GPT, for writing it; keep both and you have T5 or the original translator.</p><p><b>Modern blocks.</b> Today\'s blocks use RMSNorm before each sublayer, SwiGLU in the feed-forward network, rotary positions and grouped-query attention, and drop bias terms.</p><p><b>About this machine.</b> Signal and gradient sizes come from a real forward and (linearised) backward pass through a small random network of width 16 with a fixed seed. The translations are scripted.</p>',
  code: {
    title: 'A pre-norm decoder block',
    note: 'Adapted from the course\'s full transformer lesson.',
    text: `
import torch.nn as nn

class DecoderBlock(nn.Module):
    def __init__(self, d, heads):
        super().__init__()
        self.n1, self.n2, self.n3 = nn.RMSNorm(d), nn.RMSNorm(d), nn.RMSNorm(d)
        self.self_attn = nn.MultiheadAttention(d, heads, batch_first=True)
        self.cross_attn = nn.MultiheadAttention(d, heads, batch_first=True)
        self.ffn = nn.Sequential(nn.Linear(d, 4 * d), nn.GELU(), nn.Linear(4 * d, d))

    def forward(self, x, memory, causal_mask):
        h = self.n1(x); x = x + self.self_attn(h, h, h, attn_mask=causal_mask)[0]
        h = self.n2(x); x = x + self.cross_attn(h, memory, memory)[0]   # the bridge
        return x + self.ffn(self.n3(x))
`,
  },
};
