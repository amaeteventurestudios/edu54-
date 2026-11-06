// GPT assembly (phase 19, lesson 35): stack embedding, twelve blocks, norm and head into one model, and count parameters with the real formula for the 124M configuration. Weight tying is computed. A top-k and temperature sampler runs on six next words.
const P0 = { V: 50257, C: 1024, D: 768, H: 12, L: 12 };
function count(o) {
  const tok = o.V * o.D, pos = o.C * o.D, ff = 2 * (o.D * 4 * o.D + o.D * 4), attn = 3 * o.D * o.D + o.D * o.D + 4 * o.D, norm = 2 * 2 * o.D;
  const block = attn + ff + norm, blocks = block * o.L, head = o.tie ? 0 : o.V * o.D;
  return { tok, pos, blocks, head, total: tok + pos + blocks + 2 * o.D + head };
}
const LOGIT = [2.2, 1.8, 1.0, 0.4, -0.5, -1.5];
function run(o) {
  const c = count(o), tk = LOGIT.slice(0, o.k), z = tk.map(v => Math.exp(v / o.temp)), s = z.reduce((a, b) => a + b, 0), p = LOGIT.map((v, i) => i < o.k ? z[i] / s : 0);
  return { ...c, p, top: Math.max(...p) };
}

export default {
  slug: 'gpt-model-assembly',
  title: 'Assembling a GPT: every part, and the parameter count',
  description: 'Embeddings, blocks, a norm and a head join into one model. Count all 124 million parameters, and generate.',
  overview: 'A GPT is simple to assemble once its parts exist. Token and position embeddings go in, twelve transformer blocks follow, then a final LayerNorm and a head that maps back to the vocabulary. A configuration of vocabulary 50257, context 1024, size 768, twelve heads and twelve layers comes to about 124 million parameters. Most of what surprises people is in the ends: the head alone is 38 million, and tying it to the token embedding removes those. To generate, feed the context, take the last position\'s scores, apply temperature and top-k, sample, and slide the window. This lesson computes the count from the formula, and the sampler live.',
  keywords: ['GPT', 'parameter count', 'weight tying', 'top-k', 'temperature', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.06, 0.5, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { V: 50257, C: 1024, D: 768, H: 12, L: 12, tie: true, temp: 1, k: 6 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const emb = add(P.tower(0.6, 0.6, BLUE)); emb.position.set(-2.1, 0.03, -0.15); emb.userData.set({ cap: '' });
    const stack = add(P.stack(0.9, 0.6, 0.075, { max: 24, color: '#7B6FA8' })); stack.position.set(-1.1, 0.03, -0.15);
    const head = add(P.tower(0.6, 0.6, SAF)); head.position.set(-0.1, 0.03, -0.15); head.userData.set({ cap: '' });
    const X = i => 0.6 + i * 0.32, T = [0, 1, 2, 3, 4, 5].map(i => { const t = add(P.tower(0.26, 0.5, GOOD)); t.position.set(X(i), 0.03, -0.15); t.userData.set({ cap: '' }); return t; });
    const line = P.box(2.4, 0.03, 0.4, '#BFB8A8', { r: 0.02 }); line.position.set(-1.1, 0.02, 0.45); S.add(line);
    S.add(P.keep(-2.45, 2.45, 1.15, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      const k = 1 / 110e6;
      emb.userData.set({ h: Math.max(0.04, (R.tok + R.pos) * k * 2) }); head.userData.set({ h: Math.max(0.03, R.head * k * 2), color: st.tie ? '#D8D2C4' : SAF });
      stack.userData.set({ n: st.L, colors: Array(24).fill('#7B6FA8') });
      R.p.forEach((v, i) => T[i].userData.set({ h: Math.max(0.03, v * 1.5) }));
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Layers', min: 2, max: 24, step: 2, get: () => st.L, set: v => set({ L: v }) },
      { type: 'buttons', label: 'Size', options: ['384', '768', '1024'], get: () => [384, 768, 1024].indexOf(st.D), act: i => set({ D: [384, 768, 1024][i] }) },
      { type: 'toggle', label: 'Tie the head to the token embedding', short: 'Tied', get: () => st.tie, set: v => set({ tie: !!v }) },
      { type: 'slider', label: 'Temperature', min: 0.2, max: 2, step: 0.1, get: () => st.temp, set: v => set({ temp: v }) },
      { type: 'slider', label: 'Top-k', min: 1, max: 6, step: 1, get: () => st.k, set: v => set({ k: v }) },
    ];
    const readouts = [
      { label: 'Parameters', get: () => ({ v: `${(R.total / 1e6).toFixed(1)}M`, sub: 'computed from the sizes' }) },
      { label: 'In the head', get: () => ({ v: `${(R.head / 1e6).toFixed(1)}M`, sub: st.tie ? 'shared with the embedding' : `${(st.V * st.D / 1e6).toFixed(1)}M extra`, good: st.tie }) },
      { label: 'Top word\'s chance', get: () => ({ v: `${Math.round(R.top * 100)}%`, sub: `temperature ${st.temp.toFixed(1)}, top-${st.k}` }) },
    ];
    const labels = [
      { name: 'p', t: 'Embed, blocks, head', d: 'Height: parameters', icon: 'box', atV: V(-2.42, 0.2, -0.15) },
      { name: 's', t: 'Next-word chances', d: 'What the sampler draws from', icon: 'target', atV: V(X(5) + 0.15, 0.2, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Untie the head', hint: '38 million extra', on: () => set({ ...D0, tie: false }), off: reset },
      { label: 'Temperature near zero', hint: 'always the same word', on: () => set({ ...D0, temp: 0.2 }), off: reset },
      { label: 'Top-k of one', hint: 'no choice left', on: () => set({ ...D0, k: 1 }), off: reset },
    ];
    function status() {
      if (!st.tie) return { ok: false, msg: `<b>${(R.total / 1e6).toFixed(0)}M parameters, ${(R.head / 1e6).toFixed(0)}M in the head.</b> Input and output use the same vocabulary. Tying them shares one table.` };
      if (st.temp < 0.4 || st.k === 1) return { ok: false, msg: `<b>The top word takes ${Math.round(R.top * 100)}%.</b> Near-greedy output repeats itself. A little randomness keeps text alive.` };
      return { ok: true, msg: `<b>${(R.total / 1e6).toFixed(1)}M parameters.</b> Blocks hold most of them, and ${(R.tok / 1e6).toFixed(0)}M sit in the token table. Change a size, and the count follows.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The parts', home: true, say: 'We have embeddings and blocks. Join them with a final norm and a head, and that is a GPT.', act: m => m.set({ L: 12, D: 768, tie: true, temp: 1, k: 6 }) },
    { t: 'Count it', home: true, say: 'Vocabulary, context, size, heads and layers fix the count: about a hundred and twenty-four million.', act: m => m.set({ L: 12, D: 768, tie: true, temp: 1, k: 6 }) },
    { t: 'Weight tying', home: true, say: 'The head is huge. Untie it and you add thirty-eight million. Share it with the token table.', act: m => m.set({ L: 12, D: 768, tie: false, temp: 1, k: 6 }) },
    { t: 'Temperature', home: true, say: 'To generate, take the last scores. Low temperature nearly always picks the top word.', act: m => m.set({ L: 12, D: 768, tie: true, temp: 0.2, k: 6 }) },
    { t: 'Top-k', home: true, say: 'Top-k drops all but the best few, and renormalises.', act: m => m.set({ L: 12, D: 768, tie: true, temp: 1, k: 3 }) },
    { t: 'Assembled', home: true, say: 'Sample, append, slide the window, repeat. Next comes training.', act: m => m.set({ L: 12, D: 768, tie: true, temp: 0.8, k: 4 }) },
  ],
  check: [
    { q: 'What does weight tying share?', options: ['The head and the token embedding', 'Two blocks', 'The norm and the head'], answer: 0, why: 'Both map to the vocabulary.', hint: 'Try Untie the head.' },
    { q: 'What does low temperature do?', options: ['Sharpens toward the top word', 'Adds noise', 'Slows training'], answer: 0, why: 'Near zero is almost greedy.', hint: 'Try Temperature near zero.' },
    { q: 'What sets the parameter count?', options: ['Vocabulary, context, size, layers', 'The prompt', 'The batch size'], answer: 0, why: 'It follows from the config.', hint: 'Change Layers.' },
  ],
  terms: [['Head', 'Maps vectors to vocabulary scores.'], ['Weight tying', 'Sharing the head and embedding.'], ['Temperature', 'Scales scores before sampling.'], ['Top-k', 'Keeping only the best k.'], ['Context window', 'The most tokens taken in.']],
  deeper: '<p><b>The count here</b> follows a standard formula, and may differ slightly from a given implementation, for instance in bias terms.</p><p><b>Generation.</b> Crop the input to the context length as text grows.</p>',
  code: {
    title: 'The model',
    note: 'Adapted from the course\'s assembly (code/main.py).',
    text: `
class GPT(nn.Module):
    def __init__(self, c):
        self.tok, self.pos = nn.Embedding(c.vocab, c.dim), nn.Embedding(c.context, c.dim)
        self.blocks = nn.Sequential(*[Block(c) for _ in range(c.layers)])
        self.norm, self.head = nn.LayerNorm(c.dim), nn.Linear(c.dim, c.vocab, bias=False)
        self.head.weight = self.tok.weight       # tied
`,
  },
};
