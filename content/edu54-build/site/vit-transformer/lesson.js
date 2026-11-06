// ViT encoder (phase 19, lesson 59): twelve blocks over 197 tokens for an Arusha wildlife camera. The CLS token gathers information block by block. A small simulation: at each block, CLS mixes in a share of the patch mean; how many patches it has "reached" is counted. Real parameter count for ViT-Base.
function run(o) {
  const L = o.layers, D = 768, H = o.heads;
  const params = (4 * D * D + 2 * 4 * D * D + 4 * D) * L + 196 * D;
  const reach = []; let r = 0; for (let l = 0; l < L; l++) { r = r + (1 - r) * (o.res ? 0.35 : 0.2); reach.push(r); }
  return { params, reach, top: reach[L - 1], perHead: D / H, bad: D % H !== 0 };
}

export default {
  slug: 'vit-transformer',
  title: 'A ViT encoder: how one token sees the whole image',
  description: 'Twelve blocks, one summary token. Watch CLS gather information from every patch.',
  overview: 'A vision encoder is the same pre-norm block you built for text, without the causal mask, because every patch may see every other. Twelve layers and twelve heads over 197 tokens make ViT-Base, about 86 million parameters. The CLS token begins knowing nothing. Through attention, it reads from all patches, layer by layer, and by the end it can stand for the image. The dimension must divide evenly by the heads. This lesson shows CLS gathering information, for a wildlife camera project near Arusha.',
  keywords: ['ViT', 'vision encoder', 'CLS token', 'transformer', 'parameter count', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.06, 0.5, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { layers: 12, heads: 12, res: true, causal: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.2 + i * 0.33;
    const T = Array.from({ length: 12 }, (_, i) => { const t = add(P.tower(0.26, 0.5, GOOD)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const cls = add(P.robot(SAF, { scale: 0.6 })); cls.position.set(2.0, 0.03, -0.1);
    S.add(P.keep(-2.45, 2.45, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach((t, i) => { const on = i < st.layers; t.visible = on; t.userData.set({ h: on ? Math.max(0.03, (st.causal ? R.reach[i] * 0.15 : R.reach[i]) * 1.15) : 0.02, color: st.causal ? BAD : GOOD }); }); cls.userData.set({ busy: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const HK = [8, 10, 12];
    const controls = [
      { type: 'slider', label: 'Layers', min: 2, max: 12, step: 1, get: () => st.layers, set: v => set({ layers: v }) },
      { type: 'buttons', label: 'Heads', options: ['8', '10', '12'], get: () => HK.indexOf(st.heads), act: i => set({ heads: HK[i] }) },
      { type: 'toggle', label: 'Residual connections', short: 'Residual', get: () => st.res, set: v => set({ res: !!v }) },
      { type: 'toggle', label: 'Leave the causal mask from text in', short: 'Causal mask', get: () => st.causal, set: v => set({ causal: !!v }) },
    ];
    const readouts = [
      { label: 'CLS has read', get: () => ({ v: `${Math.round((st.causal ? R.top * 0.15 : R.top) * 100)}%`, sub: 'of the image', good: !st.causal && R.top > 0.9, bad: st.causal }) },
      { label: 'Parameters', get: () => ({ v: `${(R.params / 1e6).toFixed(0)}M`, sub: `${st.layers} layers` }) },
      { label: 'Size per head', get: () => ({ v: R.bad ? `${R.perHead.toFixed(1)}: not whole` : `${R.perHead}`, good: !R.bad, bad: R.bad }) },
    ];
    const labels = [
      { name: 't', t: 'What CLS has read', d: 'After each block', icon: 'eye', atV: V(X(0) - 0.15, 0.15, -0.1) },
      { name: 'c', t: 'The CLS token', d: 'One slot for the whole image', icon: 'user', atV: V(2.3, 0.3, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep the causal mask', hint: 'images have no future', on: () => set({ ...D0, causal: true }), off: reset },
      { label: 'Heads that don\'t divide', hint: 'ten into 768', on: () => set({ ...D0, heads: 10 }), off: reset },
      { label: 'Too few layers', hint: 'CLS hasn\'t read enough', on: () => set({ ...D0, layers: 2 }), off: reset },
    ];
    function status() {
      if (st.causal) return { ok: false, msg: '<b>CLS sits first, so a causal mask stops it reading anything.</b> Images have no future. Vision attention is unmasked.' };
      if (R.bad) return { ok: false, msg: `<b>768 doesn\'t divide by ${st.heads}.</b> Each head needs a whole share.` };
      if (R.top < 0.7) return { ok: false, msg: `<b>CLS has read ${Math.round(R.top * 100)}%.</b> Too few layers to gather much.` };
      return { ok: true, msg: `<b>${(R.params / 1e6).toFixed(0)} million parameters, and CLS has read ${Math.round(R.top * 100)}% of the image.</b>` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The same block', home: true, say: 'A wildlife camera near Arusha sends photos. The encoder uses the block you built for text.', act: m => m.set({ layers: 12, heads: 12, res: true, causal: false }) },
    { t: 'No mask', home: true, say: 'Images have no future. Leave the causal mask in, and CLS reads nothing.', act: m => m.set({ layers: 12, heads: 12, res: true, causal: true }) },
    { t: 'A summary grows', home: true, say: 'CLS starts empty, and reads from all patches, layer by layer.', act: m => m.set({ layers: 4, heads: 12, res: true, causal: false }) },
    { t: 'Depth', home: true, say: 'By twelve layers, it can stand for the whole image.', act: m => m.set({ layers: 12, heads: 12, res: true, causal: false }) },
    { t: 'Heads', home: true, say: 'The size must divide by the heads. Ten into 768 doesn\'t work.', act: m => m.set({ layers: 12, heads: 10, res: true, causal: false }) },
    { t: 'ViT-Base', home: true, say: 'Twelve layers, twelve heads, about eighty-six million parameters.', act: m => m.set({ layers: 12, heads: 12, res: true, causal: false }) },
  ],
  check: [
    { q: 'What differs from a text block?', options: ['No causal mask', 'No attention', 'No norm'], answer: 0, why: 'Every patch may see every other.', hint: 'Try Keep the causal mask.' },
    { q: 'What does CLS do?', options: ['Gathers a summary of the image', 'Stores pixels', 'Sets the size'], answer: 0, why: 'It reads through attention.', hint: 'See A summary grows.' },
    { q: 'Why must size divide by heads?', options: ['Each head needs a whole share', 'For speed', 'For colour'], answer: 0, why: 'Vectors are split evenly.', hint: 'Try Heads that don\'t divide.' },
  ],
  terms: [['ViT-Base', 'A standard vision encoder size.'], ['CLS', 'A summary token.'], ['Encoder', 'Reads input, with no mask.'], ['Head', 'One parallel attention.']],
  deeper: '<p><b>Pooling.</b> Some models average patches instead of using CLS.</p><p><b>Reuse.</b> This is the block from the GPT lessons.</p><p><b>The reach curve</b> is an illustration.</p>',
  code: {
    title: 'The encoder',
    note: 'Adapted from the course\'s encoder (code/main.py).',
    text: `
class ViT(nn.Module):
    def __init__(self):
        self.embed = PatchEmbed()
        self.blocks = nn.Sequential(*[Block(768, 12) for _ in range(12)])
    def forward(self, images):
        return self.blocks(self.embed(images))[:, 0]    # CLS
`,
  },
};
