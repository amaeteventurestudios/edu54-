// Observability for the harness (phase 19, lesson 28): every session writes spans in the GenAI shape to a JSONL file, one complete line per span, and counters and histograms to a metrics page. A Harare team's run is drawn as a stack; a crash mid-run shows why each line must stand alone.
// Metric labels must stay low in number: a label per user explodes the series count. Numbers come from the sums below.
const SP = [{ n: 'session', d: 0, a: 0, b: 10 }, { n: 'chat', d: 1, a: 0.5, b: 3 }, { n: 'tool', d: 1, a: 3.2, b: 5 }, { n: 'chat', d: 1, a: 5.2, b: 7 }, { n: 'tool', d: 1, a: 7.2, b: 8 }, { n: 'chat', d: 1, a: 8.2, b: 9.5 }];
function run(o) {
  const crash = o.crash, kept = o.line ? (crash ? 5 : 6) : crash ? 0 : 6;
  const series = 4 * (o.labels === 'user' ? 12000 : o.labels === 'tool' ? 6 : 1);
  return { kept, series, heavy: series > 10000, p95: o.hist };
}

export default {
  slug: 'observability-otel-traces',
  title: 'Harness observability: spans on disk, numbers on a page',
  description: 'A run writes itself down as it goes. Keep each line whole, and keep your metric labels few.',
  overview: 'A harness should explain itself. Spans shaped by the GenAI conventions record each model and tool call. A simple exporter writes one complete JSON line per span, so a crashed run still leaves everything up to the crash, and a batch written at the end leaves nothing. Metrics answer different questions: counters and latency histograms on a page a scraper reads. A rule to learn early: labels multiply. A label per tool is fine. A label per user makes a series for each person, and your metrics store falls over. Put high-detail facts in spans, and low-detail ones in metrics. This lesson draws a run for a software team in Harare.',
  keywords: ['OpenTelemetry', 'spans', 'Prometheus', 'cardinality', 'JSONL', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { line: true, crash: false, labels: 'tool', hist: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', CHAR = '#2C2D31', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const K = { session: CHAR, chat: BLUE, tool: SAF }, X = t => -2.2 + t * 0.3;
    const B = SP.map(sp => { const m = new S.THREE.MeshLambertMaterial({ color: K[sp.n] }), b = P.box((sp.b - sp.a) * 0.3, 0.2, 0.4, '#fff', { r: 0.02, material: m }); b.position.set(X(sp.a) + (sp.b - sp.a) * 0.15, 0.03 + sp.d * 0.24, -0.25); S.add(b); return { b, m }; });
    const stack = add(P.stack(0.6, 0.4, 0.08, { max: 6, color: '#F4F1EA' })); stack.position.set(1.4, 0.03, -0.25);
    const T = add(P.tower(0.5, 0.5, GOOD)); T.position.set(2.1, 0.03, 0); T.userData.set({ cap: '' });
    const cut = P.box(0.06, 0.6, 0.6, '#D9483B', { r: 0.01 }); cut.position.set(X(6.5), 0.03, -0.25); cut.userData.noFit = true; S.add(cut);
    const plate = P.box(2.8, 0.03, 0.5, '#BFB8A8', { r: 0.02 }); plate.position.set(-0.7, 0.02, 0.42); S.add(plate);
    S.add(P.keep(-2.45, 2.45, 1.15, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      stack.userData.set({ n: R.kept, colors: Array(6).fill('#F4F1EA') });
      cut.visible = st.crash;
      B.forEach(({ m }, i) => m.color.set(st.crash && !st.line ? GREY : K[SP[i].n]));
      T.userData.set({ h: Math.min(1.2, Math.log10(R.series) * 0.25), color: R.heavy ? BAD : GOOD });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const LK = ['none', 'tool', 'user'];
    const controls = [
      { type: 'toggle', label: 'Write each span as it ends', short: 'Line by line', get: () => st.line, set: v => set({ line: !!v }) },
      { type: 'toggle', label: 'The process crashes', short: 'Crash', get: () => st.crash, set: v => set({ crash: !!v }) },
      { type: 'buttons', label: 'Metric labels', options: ['None', 'By tool', 'By user'], get: () => LK.indexOf(st.labels), act: i => set({ labels: LK[i] }) },
      { type: 'toggle', label: 'Latency as a histogram, not an average', short: 'Histogram', get: () => st.hist, set: v => set({ hist: !!v }) },
    ];
    const readouts = [
      { label: 'Spans on disk', get: () => ({ v: `${R.kept} of 6`, sub: st.crash ? 'after the crash' : 'all finished', good: R.kept >= 5, bad: !R.kept }) },
      { label: 'Metric series', get: () => ({ v: `${R.series.toLocaleString('en')}`, sub: 'stored over time', good: !R.heavy, bad: R.heavy }) },
      { label: 'Tail latency', get: () => ({ v: st.hist ? 'p95 available' : 'mean only', good: st.hist, bad: !st.hist }) },
    ];
    const labels = [
      { name: 's', t: 'One run, in spans', d: 'Gold: tools. Blue: model', icon: 'link', atV: V(X(0) + 0.05, 0.15, -0.25) },
      { name: 't', t: 'Series count', d: 'Labels multiply', icon: 'target', atV: V(2.35, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Write the trace at the end', hint: 'a crash loses all of it', on: () => set({ ...D0, line: false, crash: true }), off: reset },
      { label: 'Label metrics by user', hint: 'series explode', on: () => set({ ...D0, labels: 'user' }), off: reset },
      { label: 'Keep only the mean', hint: 'slow calls hide', on: () => set({ ...D0, hist: false }), off: reset },
    ];
    function status() {
      if (!R.kept) return { ok: false, msg: '<b>The run crashed, and the trace went with it.</b> The time you need a trace most is when it failed. Write each span as a complete line as it ends.' };
      if (R.heavy) return { ok: false, msg: `<b>${R.series.toLocaleString('en')} series.</b> Each user makes new series, for ever. Put user ids in spans, and keep metric labels few.` };
      if (!st.hist) return { ok: false, msg: '<b>A mean of 800 ms hides calls of 8 seconds.</b> A histogram keeps the tail.' };
      return { ok: true, msg: `<b>${R.kept} spans safe on disk, ${R.series} series.</b> Spans for detail, metrics for trends.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A run writes itself down', home: true, say: 'A team in Harare wants to see what its agent did. Each bar is a span, nested under the session.', act: m => m.set({ line: true, crash: false, labels: 'tool', hist: true }) },
    { t: 'One complete line', home: true, say: 'As each span ends, one whole JSON line goes to disk.', act: m => m.set({ line: true, crash: false, labels: 'tool', hist: true }) },
    { t: 'A crash', home: true, say: 'The process dies. Everything up to that point is safe.', act: m => m.set({ line: true, crash: true, labels: 'tool', hist: true }) },
    { t: 'At the end only', home: true, say: 'Write the trace at the end, and a crash loses it, just when you need it.', act: m => m.set({ line: false, crash: true, labels: 'tool', hist: true }) },
    { t: 'Labels multiply', home: true, say: 'A label per tool is fine. A label per user makes a series for every person.', act: m => m.set({ line: true, crash: false, labels: 'user', hist: true }) },
    { t: 'Keep the tail', home: true, say: 'A histogram keeps slow calls in view, where a mean hides them.', act: m => m.set({ line: true, crash: false, labels: 'tool', hist: false }) },
  ],
  check: [
    { q: 'Why write one complete line per span?', options: ['A crash keeps everything before it', 'It is shorter', 'JSON requires it'], answer: 0, why: 'You need traces most after a failure.', hint: 'Try Write the trace at the end.' },
    { q: 'Why not label metrics by user?', options: ['Series explode', 'It is private only', 'It is slower to type'], answer: 0, why: 'Labels multiply. Put ids in spans.', hint: 'Try Label metrics by user.' },
    { q: 'What does a histogram keep that a mean loses?', options: ['The tail', 'The total', 'The name'], answer: 0, why: 'Slow calls stay visible.', hint: 'Try Keep only the mean.' },
  ],
  terms: [['Span', 'One timed operation.'], ['JSONL', 'One JSON object per line.'], ['Counter', 'A number that only rises.'], ['Histogram', 'Counts in latency buckets.'], ['Cardinality', 'How many series labels create.']],
  deeper: '<p><b>Spans for detail.</b> User ids and costs belong there. Metrics answer "how many, how fast".</p><p><b>Same names.</b> Use the GenAI attribute names, so that any tool can read them.</p><p><b>Series counts</b> are simple sums here.</p>',
  code: {
    title: 'Export a line',
    note: 'Adapted from the course\'s exporter (code/main.py).',
    text: `
def on_span_end(span):
    with open(path, "a") as f:
        f.write(json.dumps(span.to_dict()) + "\\n")   # one whole line

tool_calls = Counter("tool_calls_total", ["tool"])     # few labels
latency = Histogram("tool_seconds", ["tool"])
`,
  },
};
