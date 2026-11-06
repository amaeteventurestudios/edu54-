// Classical metrics (phase 19, lesson 71): token F1, BLEU with a brevity penalty, ROUGE-L by longest common subsequence, real and in the browser. A Dakar news summariser. Three candidate summaries against one reference. Towers per metric.
const REF = 'the port opened a new grain terminal in dakar on monday'.split(' ');
const CAND = { good: 'the port opened a new grain terminal on monday', short: 'new grain terminal', order: 'on monday in dakar a new terminal opened at the port' };
function lcs(a, b) { const d = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0)); a.forEach((x, i) => b.forEach((y, j) => { d[i + 1][j + 1] = x === y ? d[i][j] + 1 : Math.max(d[i][j + 1], d[i + 1][j]); })); return d[a.length][b.length]; }
function prec(h, n) { const g = a => { const m = {}; for (let i = 0; i + n <= a.length; i++) { const k = a.slice(i, i + n).join(' '); m[k] = (m[k] || 0) + 1; } return m; }, x = g(h), y = g(REF); let c = 0, t = 0; Object.keys(x).forEach(k => { c += Math.min(x[k], y[k] || 0); t += x[k]; }); return t ? Math.max(c, 0.01) / t : 0.01; }
function run(o) {
  const h = CAND[o.c].split(' '), common = h.filter(w => REF.includes(w)).length, p = common / h.length, r = Math.min(1, common / REF.length), f1 = p + r ? 2 * p * r / (p + r) : 0;
  const geo = Math.exp([1, 2, 3, 4].reduce((a, n) => a + Math.log(prec(h, n)), 0) / 4), bp = o.bp ? (h.length >= REF.length ? 1 : Math.exp(1 - REF.length / h.length)) : 1, bleu = geo * bp;
  const L = lcs(h, REF), rp = L / h.length, rr = L / REF.length, rouge = rp + rr ? 2 * rp * rr / (rp + rr) : 0;
  return { f1, bleu, rouge, geo, bp, L, len: h.length };
}

export default {
  slug: 'classical-metrics',
  title: 'Classical text metrics, from the ground up',
  description: 'Token F1, BLEU and ROUGE-L, computed live on one sentence. Each rewards something different.',
  overview: 'Before judges, there were counting metrics, and they still earn their place. Token F1 ignores order and counts overlap. BLEU looks at runs of up to four words and clips repeats, with a brevity penalty so that a short, safe output can\'t win. ROUGE-L uses the longest common subsequence, rewarding shared words in order, with gaps allowed. Each has blind spots: a good paraphrase scores poorly on all three. All three really run here on summaries of a news item from Dakar.',
  keywords: ['BLEU', 'ROUGE', 'F1', 'evaluation', 'text metrics', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { c: 'good', bp: true }, st = { ...D0 };
    const GOOD = '#1F9E89', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.4 + i * 1.2, T = [0, 1, 2].map(i => { const t = add(P.tower(0.8, 0.7, ['#5B8DB8', '#7B6FA8', '#3E9B9B'][i])); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const penalty = add(P.lamp(GOOD, { h: 0.4, r: 0.1 })); penalty.position.set(2.1, 0.03, 0.3);
    S.add(P.keep(-2.3, 2.4, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); [R.f1, R.bleu, R.rouge].forEach((v, i) => T[i].userData.set({ h: Math.max(0.03, v * 1.15) })); penalty.userData.set({ color: st.bp ? (R.bp < 0.99 ? '#D9483B' : '#3E9B5F') : '#C9C4B6', on: st.bp }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const CK = ['good', 'short', 'order'];
    const controls = [
      { type: 'buttons', label: 'Summary', options: ['Close', 'Very short', 'Reordered'], get: () => CK.indexOf(st.c), act: i => set({ c: CK[i] }) },
      { type: 'toggle', label: 'Brevity penalty', short: 'Brevity', get: () => st.bp, set: v => set({ bp: !!v }) },
    ];
    const readouts = [
      { label: 'Token F1', get: () => ({ v: R.f1.toFixed(2), sub: 'order ignored' }) },
      { label: 'BLEU', get: () => ({ v: R.bleu.toFixed(2), sub: `brevity ${R.bp.toFixed(2)}` }) },
      { label: 'ROUGE-L', get: () => ({ v: R.rouge.toFixed(2), sub: `common run ${R.L} of ${R.len}` }) },
    ];
    const labels = [
      { name: 't', t: 'F1, BLEU, ROUGE-L', d: 'Same text, three views', icon: 'target', atV: V(X(0) - 0.42, 0.2, -0.1) },
      { name: 'p', t: 'Brevity lamp', d: 'Red: penalised for being short', icon: 'scale', atV: V(2.32, 0.5, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Short and safe', hint: 'with no brevity penalty', on: () => set({ ...D0, c: 'short', bp: false }), off: reset },
      { label: 'All the words, new order', hint: 'F1 can\'t see it', on: () => set({ ...D0, c: 'order' }), off: reset },
    ];
    function status() {
      if (st.c === 'short' && !st.bp) return { ok: false, msg: `<b>BLEU ${R.bleu.toFixed(2)} for three safe words.</b> Precision alone rewards saying little. The brevity penalty fixes that.` };
      if (st.c === 'order') return { ok: false, msg: `<b>F1 ${R.f1.toFixed(2)}, BLEU ${R.bleu.toFixed(2)}.</b> Same words, new order. F1 can\'t see order, and BLEU can. It is a fine sentence too: each metric has blind spots.` };
      return { ok: true, msg: `<b>F1 ${R.f1.toFixed(2)}, BLEU ${R.bleu.toFixed(2)}, ROUGE-L ${R.rouge.toFixed(2)}.</b> All three really computed on this sentence.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three counters', home: true, say: 'A news summariser in Dakar writes one line. How close is it to a reference? Three old counters answer.', act: m => m.set({ c: 'good', bp: true }) },
    { t: 'Token F1', home: true, say: 'F1 counts shared words, ignoring order.', act: m => m.set({ c: 'order', bp: true }) },
    { t: 'BLEU', home: true, say: 'BLEU counts runs of up to four words, so that order matters.', act: m => m.set({ c: 'order', bp: true }) },
    { t: 'Saying little', home: true, say: 'A short, safe output scores high precision. The brevity penalty pulls it down.', act: m => m.set({ c: 'short', bp: true }) },
    { t: 'ROUGE-L', home: true, say: 'ROUGE-L uses the longest shared run in order, with gaps allowed.', act: m => m.set({ c: 'good', bp: true }) },
    { t: 'Blind spots', home: true, say: 'A good paraphrase can score poorly on all three. Use them with care.', act: m => m.set({ c: 'order', bp: true }) },
  ],
  check: [
    { q: 'What does token F1 ignore?', options: ['Word order', 'Word overlap', 'Length'], answer: 0, why: 'It counts shared words.', hint: 'Try All the words, new order.' },
    { q: 'What is the brevity penalty for?', options: ['Short outputs can\'t win', 'Long outputs lose', 'Speed'], answer: 0, why: 'Precision alone rewards saying little.', hint: 'Try Short and safe.' },
    { q: 'What does ROUGE-L use?', options: ['Longest common subsequence', 'Embeddings', 'A judge model'], answer: 0, why: 'Shared words in order, gaps allowed.', hint: 'See ROUGE-L.' },
  ],
  terms: [['BLEU', 'N-gram precision with a brevity penalty.'], ['ROUGE-L', 'LCS-based overlap.'], ['Token F1', 'Harmonic mean of overlap.'], ['Brevity penalty', 'A cost for being short.']],
  deeper: '<p><b>Normalise</b> before counting.</p><p><b>Use with judges.</b> They cover paraphrase.</p><p><b>All three</b> are real here, with zero n-gram counts lightly smoothed.</p>',
  code: {
    title: 'ROUGE-L core',
    note: 'Adapted from the course\'s metrics (code/main.py).',
    text: `
def lcs(a, b):
    d = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i, x in enumerate(a):
        for j, y in enumerate(b):
            d[i+1][j+1] = d[i][j] + 1 if x == y else max(d[i][j+1], d[i+1][j])
    return d[-1][-1]
`,
  },
};
