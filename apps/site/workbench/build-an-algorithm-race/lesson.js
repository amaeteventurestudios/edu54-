// Build it yourself: sorting algorithms (after JavaScript Algorithms and Data Structures). A Harare library sorts its loans. Real insertion, merge and quick sort on one seeded list; comparisons are counted; bars show the list and a chart shows work as size grows. Already-sorted input shows the worst case of a naive quick sort.
function list(n, kind) { let s = 9; const a = Array.from({ length: n }, () => { s = (s * 16807) % 2147483647; return s % 1000; }); if (kind === 'sorted') a.sort((x, y) => x - y); if (kind === 'rev') a.sort((x, y) => y - x); return a; }
function insertion(a) { let c = 0; a = [...a]; for (let i = 1; i < a.length; i++) { const v = a[i]; let j = i - 1; while (j >= 0) { c++; if (a[j] <= v) break; a[j + 1] = a[j]; j--; } a[j + 1] = v; } return { a, c }; }
function merge(a) { let c = 0; const go = x => { if (x.length < 2) return x; const m = x.length >> 1, l = go(x.slice(0, m)), r = go(x.slice(m)), o = []; let i = 0, j = 0; while (i < l.length && j < r.length) { c++; o.push(l[i] <= r[j] ? l[i++] : r[j++]); } return o.concat(l.slice(i), r.slice(j)); }; return { a: go(a), c }; }
function quick(a, mid) { let c = 0, deep = 0; const b = [...a]; const go = (lo, hi, d) => { if (lo >= hi) return; deep = Math.max(deep, d); if (mid) { const m = (lo + hi) >> 1; [b[m], b[hi]] = [b[hi], b[m]]; } const p = b[hi]; let i = lo; for (let j = lo; j < hi; j++) { c++; if (b[j] < p) { [b[i], b[j]] = [b[j], b[i]]; i++; } } [b[i], b[hi]] = [b[hi], b[i]]; go(lo, i - 1, d + 1); go(i + 1, hi, d + 1); }; go(0, b.length - 1, 1); return { a: b, c, deep }; }
function run(o) { const a = list(o.n, o.kind), I = insertion(a), M = merge(a), Q = quick(a, o.mid), cur = { ins: I, mer: M, qui: Q }[o.al]; const sorted = cur.a.every((v, i, x) => !i || x[i - 1] <= v); return { a, I, M, Q, cur, sorted, nlog: Math.round(o.n * Math.log2(o.n)), nn: (o.n * o.n) / 2 }; }

export default {
  slug: 'build-an-algorithm-race',
  title: 'Build your own sorting race',
  description: 'Three sorts, one list, and a counter. See why the shape of the input matters as much as the size.',
  overview: 'Sorting is the best place to learn how algorithms grow. Insertion sort is simple, and it does about n squared over two comparisons on random data. It\'s also excellent on data that\'s already sorted. Merge sort splits in half, sorts both, and joins them, for about n log n every time. Quick sort picks a pivot and splits around it. It\'s usually fastest, and a poor pivot choice on sorted input turns it into n squared. So a sort isn\'t simply fast or slow. It\'s fast on some inputs. This counts real comparisons as a library in Harare sorts its loans.',
  keywords: ['sorting', 'big O', 'merge sort', 'quick sort', 'algorithms', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { n: 200, kind: 'random', al: 'mer', mid: true }, st = { ...D0 };
    const CL = ['#E07A5F', '#1F9E89', '#5B8DB8'], ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.2 + i * 1.2;
    const T = CL.map((c, i) => { const t = add(P.tower(0.8, 0.4, c)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.1, 2.1, 1.25, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); const m = Math.max(R.I.c, R.M.c, R.Q.c); [R.I.c, R.M.c, R.Q.c].forEach((c, i) => T[i].userData.set({ h: Math.max(0.03, (Math.log10(c + 1) / Math.log10(m + 1)) ** 2 * 1.2) })); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const KI = ['random', 'sorted', 'rev'], AL = ['ins', 'mer', 'qui'];
    const controls = [
      { type: 'slider', label: 'Items', min: 50, max: 800, step: 50, get: () => st.n, set: v => set({ n: v }) },
      { type: 'buttons', label: 'Input', options: ['Random', 'Sorted', 'Reversed'], get: () => KI.indexOf(st.kind), act: i => set({ kind: KI[i] }) },
      { type: 'buttons', label: 'Algorithm', options: ['Insertion', 'Merge', 'Quick'], get: () => AL.indexOf(st.al), act: i => set({ al: AL[i] }) },
      { type: 'toggle', label: 'Pick the middle as pivot', short: 'Middle pivot', get: () => st.mid, set: v => set({ mid: !!v }) },
    ];
    const readouts = [
      { label: 'Insertion', get: () => ({ v: R.I.c.toLocaleString('en'), sub: 'comparisons' }) },
      { label: 'Merge', get: () => ({ v: R.M.c.toLocaleString('en'), sub: `n log n is ${R.nlog.toLocaleString('en')}` }) },
      { label: 'Quick', get: () => ({ v: R.Q.c.toLocaleString('en'), sub: `depth ${R.Q.deep}`, bad: R.Q.c > R.nn * 0.7, good: R.Q.c < R.nlog * 2 }) },
    ];
    const labels = [
      { name: 'a', t: 'Insertion, merge, quick', d: 'Height: comparisons, compressed', icon: 'scale', atV: V(X(0) - 0.4, 0.2, -0.1) },
      { name: 'b', t: 'Quick sort', d: 'Watch it on sorted input', icon: 'bolt', atV: V(X(2) + 0.4, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Last item as pivot, sorted input', hint: 'the worst split', on: () => set({ ...D0, kind: 'sorted', mid: false, al: 'qui' }), off: reset },
      { label: 'Insertion on reversed input', hint: 'every item moves', on: () => set({ ...D0, kind: 'rev', al: 'ins' }), off: reset },
    ];
    function status() {
      if (st.kind === 'sorted' && !st.mid && st.al === 'qui') return { ok: false, msg: `<b>${R.Q.c.toLocaleString('en')} comparisons, and ${R.Q.deep} levels deep.</b> Each pivot splits nothing off. A real run could also overflow its stack.` };
      if (st.kind === 'rev' && st.al === 'ins') return { ok: false, msg: `<b>${R.I.c.toLocaleString('en')} comparisons.</b> Every item walks past all the others. That\'s n squared over two.` };
      if (st.kind === 'sorted' && st.al === 'ins') return { ok: true, msg: `<b>${R.I.c.toLocaleString('en')} comparisons: the fastest here.</b> The simple sort shines on nearly sorted data.` };
      return { ok: true, msg: `<b>${R.cur.c.toLocaleString('en')} comparisons for ${st.n} items, and the output is sorted.</b> Merge costs about the same on every input.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A counter', home: true, say: 'A library in Harare sorts its loans. Count comparisons, not seconds.', act: m => m.set({ n: 100, kind: 'random', al: 'ins', mid: true }) },
    { t: 'Insertion', home: true, say: 'Insertion sort slides each item into place, and grows with the square.', act: m => m.set({ n: 800, kind: 'random', al: 'ins', mid: true }) },
    { t: 'Merge', home: true, say: 'Merge sort splits in half and joins. It grows gently, on any input.', act: m => m.set({ n: 800, kind: 'random', al: 'mer', mid: true }) },
    { t: 'Quick', home: true, say: 'Quick sort splits around a pivot, and it\'s usually good.', act: m => m.set({ n: 800, kind: 'random', al: 'qui', mid: true }) },
    { t: 'Bad pivot', home: true, say: 'Take the last item as the pivot on sorted input, and it collapses.', act: m => m.set({ n: 800, kind: 'sorted', al: 'qui', mid: false }) },
    { t: 'Know your input', home: true, say: 'On sorted input, simple insertion wins. The input matters as much as the size.', act: m => m.set({ n: 800, kind: 'sorted', al: 'ins', mid: true }) },
  ],
  check: [
    { q: 'How does merge sort grow?', options: ['About n log n', 'About n squared', 'Not at all'], answer: 0, why: 'On every input.', hint: 'See Merge.' },
    { q: 'What makes quick sort collapse?', options: ['A pivot that splits nothing off', 'Too much memory', 'Random data'], answer: 0, why: 'Sorted input with a last-item pivot.', hint: 'See Bad pivot.' },
    { q: 'Where does insertion sort shine?', options: ['On nearly sorted data', 'On reversed data', 'On huge random data'], answer: 0, why: 'Almost nothing moves.', hint: 'See Know your input.' },
  ],
  terms: [['Big O', 'How work grows with size.'], ['Pivot', 'The item a list is split around.'], ['Stable sort', 'Equal items keep their order.'], ['Comparison', 'One check of two items.']],
  deeper: '<p><b>Real counts.</b> Each sort really runs on the same list.</p><p><b>Real libraries</b> blend them: Timsort uses merging plus insertion.</p>',
  credit: 'Built from <a href="https://github.com/trekhleb/javascript-algorithms" target="_blank" rel="noopener">JavaScript Algorithms and Data Structures</a> by Oleksii Trekhleb (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short sorts, written for this lesson.',
  code: {
    title: 'Merge',
    note: 'Our own short version.',
    text: `
function sort(list) {
  if (list.length < 2) return list;
  const mid = list.length >> 1;
  const left = sort(list.slice(0, mid)), right = sort(list.slice(mid));
  const out = [];
  while (left.length && right.length)
    out.push(left[0] <= right[0] ? left.shift() : right.shift());
  return out.concat(left, right);
}
`,
  },
};
