// Sliding window dataset (phase 19, lesson 31): a stream of 60 token blocks from Luganda news. A frame of length L moves along by a stride. Each stop is one sample; the target is the input shifted by one. Counts, overlap and skipped tokens are computed.
const N = 60;
function run(o) {
  const starts = []; for (let s = 0; s + o.len + 1 <= N; s += o.stride) starts.push(s);
  const covered = new Set(); starts.forEach(s => { for (let i = s; i < s + o.len; i++) covered.add(i); });
  const seen = starts.length * o.len;
  return { starts, n: starts.length, skip: N - 1 - covered.size, redo: seen / Math.max(1, covered.size), shift: o.shift };
}

export default {
  slug: 'tokenized-dataset-sliding-window',
  title: 'Sliding windows: from a stream to training samples',
  description: 'A long stream of tokens, one moving frame. Choose the length and the step, and see what the model actually gets.',
  overview: 'Training reads fixed-size batches, and a corpus is one long stream of token ids. A sliding window turns one into the other. Take a slice of length L as input. The target is the same slice shifted one place, as each token must predict the next. Then move along by a stride. A stride equal to L uses each token once. A smaller stride gives more samples, repeats, and more overlap. A larger one skips tokens that are never trained on. The off-by-one in the shift is the classic bug: without it the model learns to copy. This lesson slides a real frame along a token stream from Luganda news.',
  keywords: ['sliding window', 'dataset', 'stride', 'next-token prediction', 'dataloader', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, 0], dir: [0.04, 0.8, 1.2], half: 1.05, wide: 5.4 },

  build(S) {
    const { V, P } = S;
    const D0 = { len: 8, stride: 8, shift: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5.1, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.4 + (i % 30) * 0.165, Z = i => i < 30 ? -0.42 : 0.02;
    const C = Array.from({ length: N }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.14, 0.14, 0.3, '#fff', { r: 0.01, material: m }); b.position.set(X(i), 0.03, Z(i)); S.add(b); return { b, m }; });
    const T = [0, 1].map(i => { const t = add(P.tower(0.5, 0.36, i ? BAD : GOOD)); t.position.set(-1.2 + i * 0.8, 0.03, 0.55); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.5, 2.5, 0.8, -0.72, 0.8));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      const covered = new Set(); R.starts.forEach(s => { for (let i = s; i < s + st.len; i++) covered.add(i); });
      C.forEach(({ m }, i) => m.color.set(covered.has(i) ? GREY : '#EDB9AB'));
      T[0].userData.set({ h: Math.max(0.04, R.n * 0.012) }); T[1].userData.set({ h: Math.max(0.04, R.skip * 0.02) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Window length', min: 4, max: 16, step: 1, get: () => st.len, set: v => set({ len: v }) },
      { type: 'slider', label: 'Stride', min: 1, max: 20, step: 1, get: () => st.stride, set: v => set({ stride: v }) },
      { type: 'toggle', label: 'Target is the input shifted by one', short: 'Shift', get: () => st.shift, set: v => set({ shift: !!v }) },
    ];
    const readouts = [
      { label: 'Samples', get: () => ({ v: `${R.n}`, sub: `from ${N} tokens` }) },
      { label: 'Tokens never seen', get: () => ({ v: `${Math.max(0, R.skip)}`, sub: 'pink blocks', good: R.skip <= st.len, bad: R.skip > st.len }) },
      { label: 'Repeats', get: () => ({ v: `${R.redo.toFixed(1)}×`, sub: 'each token, on average', bad: R.redo > 3 }) },
    ];
    const labels = [
      { name: 's', t: 'The token stream', d: 'Gold: input. Teal: target', icon: 'wave', atV: V(-2.45, 0.1, -0.2) },
      { name: 't', t: 'Samples, then skipped', d: 'What the choice costs', icon: 'target', atV: V(-0.2, 0.1, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forget the shift', hint: 'target equals input', on: () => set({ ...D0, shift: false }), off: reset },
      { label: 'Stride longer than the window', hint: 'tokens are skipped', on: () => set({ ...D0, stride: 16 }), off: reset },
      { label: 'A stride of one', hint: 'huge overlap', on: () => set({ ...D0, stride: 1 }), off: reset },
    ];
    function status() {
      if (!st.shift) return { ok: false, msg: '<b>Loss falls to nothing, and the model has learned to copy.</b> With no shift, each token predicts itself. The off-by-one matters most here.' };
      if (R.skip > st.len) return { ok: false, msg: `<b>${R.skip} tokens were never trained on.</b> A stride larger than the window leaves gaps.` };
      if (R.redo > 3) return { ok: false, msg: `<b>${R.n} samples, each token seen ${R.redo.toFixed(1)} times.</b> More samples, and little new information, and you pay per step.` };
      return { ok: true, msg: `<b>${R.n} samples, each token used about ${R.redo.toFixed(1)} times.</b> Stride equal to length is the clean default.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.8) % Math.max(1, R.n);
        const s = R.starts[Math.floor(u)] ?? 0;
        C.forEach(({ b, m }, i) => { const inp = i >= s && i < s + st.len; b.position.y = inp ? 0.12 : 0.03; if (i === (st.shift ? s + st.len : -1)) m.color.set(GOOD); else if (inp) m.color.set(SAF); else if (m.color.getHexString() === 'f2ae0c' || m.color.getHexString() === '1f9e89') m.color.set(GREY); });
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'One long stream', home: true, say: 'Luganda news, tokenized, is one long stream of ids. Training needs fixed-size pieces.', act: m => m.set({ len: 8, stride: 8, shift: true }) },
    { t: 'A frame', home: true, say: 'A frame of eight tokens is the input. The target is the same frame, moved one place along.', act: m => m.set({ len: 8, stride: 8, shift: true }) },
    { t: 'The off-by-one', home: true, say: 'Forget the shift, and each token predicts itself. The loss looks perfect, and it learned nothing.', act: m => m.set({ len: 8, stride: 8, shift: false }) },
    { t: 'Small stride', home: true, say: 'A small stride gives many samples, with heavy overlap.', act: m => m.set({ len: 8, stride: 2, shift: true }) },
    { t: 'Large stride', home: true, say: 'Stride past the window, and tokens are skipped.', act: m => m.set({ len: 8, stride: 16, shift: true }) },
    { t: 'The clean default', home: true, say: 'Stride equal to length uses each token once.', act: m => m.set({ len: 8, stride: 8, shift: true }) },
  ],
  check: [
    { q: 'What is the target for next-token training?', options: ['The input shifted one place', 'The input itself', 'A random token'], answer: 0, why: 'Each token predicts the next.', hint: 'Try Forget the shift.' },
    { q: 'What happens with a stride above the window?', options: ['Tokens are skipped', 'More overlap', 'Faster loss'], answer: 0, why: 'Gaps appear.', hint: 'Try Stride longer than the window.' },
    { q: 'What does a stride of one give?', options: ['Many similar samples', 'No samples', 'Skipped tokens'], answer: 0, why: 'High overlap.', hint: 'Try A stride of one.' },
  ],
  terms: [['Window', 'A fixed slice of tokens.'], ['Stride', 'How far the window moves.'], ['Target', 'What each position must predict.'], ['Overlap', 'Tokens repeated between samples.'], ['Epoch', 'One pass over all samples.']],
  deeper: '<p><b>Shuffling.</b> Shuffle windows with a seed set per epoch, so that a run can be repeated.</p><p><b>Document ends.</b> Decide if windows may cross a document boundary. An end-of-text token marks it.</p><p><b>The frame</b> really moves over 60 blocks.</p>',
  code: {
    title: 'A dataset',
    note: 'Adapted from the course\'s dataset (code/main.py).',
    text: `
class Windows(Dataset):
    def __init__(self, ids, length, stride):
        self.starts = range(0, len(ids) - length - 1, stride)
        self.ids, self.length = ids, length
    def __getitem__(self, i):
        s = self.starts[i]
        return self.ids[s:s + self.length], self.ids[s + 1:s + self.length + 1]
`,
  },
};
