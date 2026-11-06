// BPE from scratch (phase 19, lesson 30): a real byte-pair trainer runs on a little Swahili text. Each merge joins the most frequent neighbouring pair. Chips along the strip are tokens: width is letters, colour is id. Slide merges and the strip shortens. Special tokens are kept out of training.
const TEXT = 'watoto wanasoma wanafunzi wanasoma watoto wanacheza wanafunzi wanacheza';
function train(n) {
  let seq = [...TEXT]; const merges = [];
  for (let m = 0; m < n; m++) {
    const c = {}; for (let i = 0; i + 1 < seq.length; i++) { if (seq[i] === ' ' || seq[i + 1] === ' ') continue; const k = seq[i] + '\u0001' + seq[i + 1]; c[k] = (c[k] || 0) + 1; }
    const top = Object.entries(c).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]; if (!top || top[1] < 2) break;
    const [a, b] = top[0].split('\u0001'); merges.push([a, b, top[1]]);
    const out = []; for (let i = 0; i < seq.length; i++) { if (seq[i] === a && seq[i + 1] === b) { out.push(a + b); i++; } else out.push(seq[i]); } seq = out;
  }
  return { seq, merges };
}
function run(o) {
  const { seq, merges } = train(o.n), vocab = new Set([...TEXT]).size + merges.length;
  const unk = o.bytes ? 0 : 1, words = TEXT.length;
  return { seq, merges, vocab, ratio: words / seq.length, unk, last: merges[merges.length - 1] };
}

export default {
  slug: 'bpe-tokenizer-from-scratch',
  title: 'A BPE tokenizer from scratch',
  description: 'A real trainer runs on Swahili text, joining the commonest pair again and again, until words become tokens.',
  overview: 'A model needs numbers, and byte-pair encoding is how text becomes them. Start from the smallest units. Count every neighbouring pair. Merge the most frequent into one new token, write that rule down, and repeat. The merge list is the tokenizer: apply it in order to fresh text, and you get the same tokens every time. Starting from bytes means no text is ever unknown, and any input can go to ids and back without loss. Special tokens such as end of text are set aside, so that they can\'t be made from ordinary text. Here a real trainer runs on a little Swahili, and you can step through each merge.',
  keywords: ['BPE', 'tokenizer', 'byte pair encoding', 'merges', 'from scratch', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.04, 0.8, 1.2], half: 1.05, wide: 5.4 },

  build(S) {
    const { V, P } = S;
    const D0 = { n: 12, bytes: true, special: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5.1, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const MAX = TEXT.length, Chips = Array.from({ length: MAX }, () => { const m = new S.THREE.MeshLambertMaterial({ color: '#888' }), b = P.box(1, 0.26, 0.5, '#fff', { r: 0.01, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    const rail = P.box(4.9, 0.03, 0.62, '#2C2D31', { r: 0.01 }); rail.position.set(0, 0.02, -0.3); S.add(rail);
    const book = add(P.stack(0.8, 0.5, 0.05, { max: 24, color: '#F4F1EA' })); book.position.set(-1.9, 0.03, 0.42);
    const T = add(P.tower(0.5, 0.45, GOOD)); T.position.set(0.2, 0.03, 0.42); T.userData.set({ cap: '' });
    const lock = add(P.lamp(GOOD, { h: 0.34, r: 0.1 })); lock.position.set(1.6, 0.03, 0.42);
    S.add(P.keep(-2.5, 2.5, 0.9, -0.72, 0.72));
    const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h}, 55%, 58%)`; };
    let R = null;
    function draw() {
      R = run(st);
      const total = TEXT.length, W = 4.8; let x = -2.4, i = 0;
      R.seq.forEach(tok => { const w = tok.length / total * W, C = Chips[i++]; C.b.visible = tok !== ' '; C.b.scale.x = Math.max(0.01, w - 0.012); C.b.position.set(x + w / 2, 0.05, -0.3); C.m.color.set(hue(tok)); x += w; });
      for (; i < MAX; i++) Chips[i].b.visible = false;
      book.userData.set({ n: Math.min(24, R.merges.length), colors: Array(24).fill('#F4F1EA') });
      T.userData.set({ h: Math.max(0.05, R.seq.length / 80) });
      lock.userData.set({ color: st.special ? '#3E9B5F' : '#D9483B', on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Merges', min: 0, max: 30, step: 1, get: () => st.n, set: v => set({ n: v }) },
      { type: 'toggle', label: 'Start from bytes, so nothing is unknown', short: 'Byte floor', get: () => st.bytes, set: v => set({ bytes: !!v }) },
      { type: 'toggle', label: 'Reserve special tokens', short: 'Specials', get: () => st.special, set: v => set({ special: !!v }) },
    ];
    const readouts = [
      { label: 'Tokens in this text', get: () => ({ v: `${R.seq.length}`, sub: `from ${TEXT.length} letters`, good: R.ratio > 1.5 }) },
      { label: 'Vocabulary', get: () => ({ v: `${R.vocab}`, sub: `${R.merges.length} merges learned` }) },
      { label: 'Last merge', get: () => ({ v: R.last ? `${R.last[0]} + ${R.last[1]}` : 'none yet', sub: R.last ? `seen ${R.last[2]} times` : '' }) },
    ];
    const labels = [
      { name: 's', t: 'The text as tokens', d: 'Same colour, same token', icon: 'wave', atV: V(-2.42, 0.12, -0.3) },
      { name: 'b', t: 'The merge list', d: 'This is the tokenizer', icon: 'book', atV: V(-2.32, 0.15, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No merges', hint: 'one token per letter', on: () => set({ ...D0, n: 0 }), off: reset },
      { label: 'No byte floor', hint: 'a new letter is unknown', on: () => set({ ...D0, bytes: false }), off: reset },
      { label: 'Let specials be typed', hint: 'text can fake them', on: () => set({ ...D0, special: false }), off: reset },
    ];
    function status() {
      if (!st.special) return { ok: false, msg: '<b>Anyone can now type an end-of-text token.</b> Specials must be reserved outside the merge table, or user text can forge a control signal.' };
      if (!st.bytes) return { ok: false, msg: '<b>A character it never saw comes out as unknown, and that is lost.</b> Start from bytes, and any text round-trips exactly.' };
      if (!R.merges.length) return { ok: false, msg: `<b>${R.seq.length} tokens for ${TEXT.length} letters.</b> Nothing is learned, and every sequence is as long as can be.` };
      return { ok: true, msg: `<b>${R.merges.length} merges took ${TEXT.length} letters to ${R.seq.length} tokens.</b> ${R.last ? `The last joined "${R.last[0]}" and "${R.last[1]}".` : ''} Common pieces such as "wana" become single tokens.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Letters first', home: true, say: 'Take a little Swahili text. At the start, each letter is its own token, and the strip is as long as it gets.', act: m => m.set({ n: 0, bytes: true, special: true }) },
    { t: 'The commonest pair', home: true, say: 'Count every neighbouring pair. Merge the commonest into one new token, and write that rule down.', act: m => m.set({ n: 1, bytes: true, special: true }) },
    { t: 'Again and again', home: true, say: 'Repeat. Pieces grow, and common ones like wana become single tokens.', act: m => m.set({ n: 12, bytes: true, special: true }) },
    { t: 'The list is the tokenizer', home: true, say: 'Apply the merge list in order to new text, and you get the same tokens every time.', act: m => m.set({ n: 20, bytes: true, special: true }) },
    { t: 'A byte floor', home: true, say: 'Start from bytes, and no character is ever unknown. Text can go to ids and back, exactly.', act: m => m.set({ n: 12, bytes: false, special: true }) },
    { t: 'Special tokens', home: true, say: 'End of text is set aside, so that ordinary text can\'t forge it.', act: m => m.set({ n: 12, bytes: true, special: false }) },
  ],
  check: [
    { q: 'What does each training step do?', options: ['Merges the commonest pair', 'Removes rare words', 'Sorts the text'], answer: 0, why: 'Then it counts again.', hint: 'Move the Merges slider.' },
    { q: 'Why start from bytes?', options: ['Any text can round-trip', 'It is shorter', 'Models prefer bytes'], answer: 0, why: 'Nothing is unknown.', hint: 'Try No byte floor.' },
    { q: 'Why reserve special tokens?', options: ['So text can\'t forge them', 'To save space', 'To speed up training'], answer: 0, why: 'They are control signals.', hint: 'Try Let specials be typed.' },
  ],
  terms: [['Token', 'A unit of text with an id.'], ['Merge', 'Joining a pair into a new token.'], ['Merge list', 'The ordered rules.'], ['Round trip', 'Text to ids and back unchanged.'], ['Special token', 'A reserved control token.']],
  deeper: '<p><b>Real corpora.</b> Training on gigabytes needs care for speed, and pre-splits on spaces and punctuation.</p><p><b>Other languages.</b> Tokenizers trained on English spend more tokens on Swahili, which raises cost. Train on your own text if you can.</p><p><b>This trainer</b> is real, on a short text.</p>',
  code: {
    title: 'One merge',
    note: 'Adapted from the course\'s trainer (code/main.py).',
    text: `
def train(ids, n):
    merges = {}
    for i in range(n):
        pairs = Counter(zip(ids, ids[1:]))
        best = pairs.most_common(1)[0][0]
        new = 256 + i
        ids = merge(ids, best, new)
        merges[best] = new
    return merges
`,
  },
};
