// Long-context evaluation: a court records office in Lagos wants to put whole case files into a model that advertises 128k tokens. A grid of columns shows accuracy
// for every context length (across) and depth of the planted fact (back to front); a glass sheet marks 90%. Effective length is computed live from the tested cells.
// The accuracies come from an illustrative formula that decays with length and dips in the middle ("lost in the middle").
// Break it: test only the start and end (the middle dip is never seen), retrieval only (multi-hop reasoning fails far earlier), a needle that shares words with the question.
const LENS = [8, 16, 32, 64, 128], DEPTHS = [0, 0.25, 0.5, 0.75, 1];
const TASKS = [
  { n: 'Find a fact, shared words', f: (x, mid) => 0.995 - 0.02 * x - 0.04 * mid * x },
  { n: 'Find a fact, no shared words', f: (x, mid) => 0.99 - 0.2 * Math.pow(x, 1.2) - 0.15 * mid * x },
  { n: 'Follow a chain of facts', f: (x, mid) => 0.98 - 0.35 * Math.pow(x, 0.9) - 0.12 * mid * x },
];
const acc = (t, L, d) => { const x = L / 128, mid = Math.exp(-(((d - 0.5) / 0.22) ** 2)); return Math.max(0.05, Math.min(1, TASKS[t].f(x, mid))); };

export default {
  slug: 'long-context-evaluation',
  title: 'Long context: what really fits?',
  description: 'A court records office in Lagos wants to feed whole case files to a model that advertises 128,000 tokens. Test it across every length and every depth, and find the length it can really use. Then test only the ends, test only simple lookups, or plant a fact that shares words with the question.',
  overview: 'A model\'s advertised context window is how much it accepts, not how much it uses well. Needle-in-a-haystack tests plant a fact at a chosen depth in long filler text and ask for it back, sweeping length and depth; most models now pass at full length when the needle shares words with the question. Harder tests remove the shared words, so finding the fact needs a step of meaning, or require following a chain of facts across the document, or counting and aggregating. Accuracy usually falls with length and dips for facts in the middle, so every depth must be tested. Report two numbers alongside the advertised window: the effective length for retrieval and the effective length for reasoning, often a quarter to a half of the advertised figure.',
  keywords: ['long context', 'needle in a haystack', 'ruler', 'lost in the middle', 'effective context length', 'multi-hop'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.6, 0.1], dir: [0.3, 0.8, 1.3], half: 1.55, wide: 5.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { task: 1, ends: false };
    const ink = '#151827', H = 1.5;
    const base = P.box(5.6, 0.12, 3.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    const X = i => -1.8 + i * 0.85, Z = j => -1.1 + j * 0.55;
    const cells = DEPTHS.map((d, j) => LENS.map((L, i) => {
      const mm = new THREE.MeshLambertMaterial({ color: C.teal }), col = P.box(0.5, 1, 0.38, C.teal, { r: 0.03, material: mm }); col.position.set(X(i), 0.12, Z(j)); col.userData.noFit = true; S.add(col);
      return { col, mm, i, j };
    })).flat();
    const keep = P.box(0.5, H, 0.38, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(X(4), 0.12, Z(0)); S.add(keep);
    LENS.forEach((L, i) => { const pl = P.box(0.6, 0.2, 0.08, '#FBF8F1', { r: 0.02 }); pl.position.set(X(i), 0.12, Z(4) + 0.42); S.add(pl); const t = S.text(`${L}k`, { size: 0.15, weight: 800, face: 'front', color: ink }); t.position.set(X(i), 0.22, Z(4) + 0.465); S.add(t); const tp = S.text(`${L}k`, { size: 0.13, weight: 800, color: ink }); tp.position.set(X(i), 0.325, Z(4) + 0.42); S.add(tp); });
    DEPTHS.forEach((d, j) => { const pl = P.box(0.8, 0.2, 0.08, '#FBF8F1', { r: 0.02 }); pl.position.set(X(0) - 0.75, 0.12, Z(j)); S.add(pl); const t = S.text(`${Math.round(d * 100)}% deep`, { size: 0.11, weight: 800, face: 'front', color: ink }); t.position.set(X(0) - 0.75, 0.22, Z(j) + 0.045); S.add(t); });
    const ax = S.text('context length →', { size: 0.11, weight: 700, color: '#5A5A66' }); ax.position.set(X(2), 0.125, Z(4) + 0.72); S.add(ax);
    const chip = S.text('', { size: 0.11, weight: 800, face: 'cam', color: '#FFFFFF', bg: '#D64545', top: true }); chip.userData.noFit = true; S.add(chip);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.8), new THREE.MeshBasicMaterial({ color: '#D64545', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })); sheet.rotation.x = -Math.PI / 2; sheet.position.set(X(2), 0.12 + 0.9 * H, Z(2)); sheet.layers.set(1); S.add(sheet);
    const sheetT = S.text('90%', { size: 0.1, weight: 800, face: 'front', color: '#D64545' }); sheetT.position.set(X(4) + 0.5, 0.12 + 0.9 * H, Z(4)); S.add(sheetT);
    const sign = P.box(2.6, 0.34, 0.06, '#3B3F8F', { r: 0.03 }); sign.position.set(X(2), 0.12, Z(0) - 0.45); S.add(sign);
    const sT = S.text('', { size: 0.1, weight: 800, face: 'front', color: '#FFFFFF', maxW: 2.5 }); sT.position.set(X(2), 0.29, Z(0) - 0.415); S.add(sT);

    let EFF = 0, WORST = 1, WD = null;
    const tested = j => !st.ends || j === 0 || j === 4;
    function draw() {
      cells.forEach(c => { const a = acc(st.task, LENS[c.i], DEPTHS[c.j]), on = tested(c.j), h = on ? Math.max(0.02, a * H) : 0.02;
        c.col.scale.y = h; c.mm.color.set(!on ? '#C9C5BA' : a >= 0.9 ? C.teal : a >= 0.7 ? '#C9A227' : '#D64545');
        });
      EFF = 0; WORST = 1; WD = null;
      LENS.forEach((L, i) => { const ok = DEPTHS.every((d, j) => !tested(j) || acc(st.task, L, d) >= 0.9); if (ok && (i === 0 || LENS[i - 1] === EFF)) EFF = L; });
      DEPTHS.forEach((d, j) => { if (!tested(j)) return; LENS.forEach(L => { const a = acc(st.task, L, d); if (a < WORST) { WORST = a; WD = { L, d }; } }); });
      sT.userData.set(`${TASKS[st.task].n}: works up to ${EFF ? EFF + 'k' : 'less than 8k'}`);
      const wi = LENS.indexOf(WD.L), wj = DEPTHS.indexOf(WD.d); chip.userData.set(`worst ${Math.round(WORST * 100)}%`); chip.position.set(X(wi), 0.12 + WORST * H + 0.2, Z(wj));
    }
    draw();
    const truthEff = () => { let e = 0; LENS.forEach((L, i) => { if (DEPTHS.every(d => acc(st.task, L, d) >= 0.9) && (i === 0 || LENS[i - 1] === e)) e = L; }); return e; };
    const controls = [
      { type: 'buttons', label: 'Task', options: ['Shared words', 'No shared words', 'Chain of facts'], get: () => st.task, act: i => { st.task = i; draw(); } },
      { type: 'buttons', label: 'Depths tested', options: ['All five', 'Start and end only'], get: () => (st.ends ? 1 : 0), act: i => { st.ends = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Advertised', get: () => ({ v: '128k', sub: 'tokens' }) },
      { label: 'Effective (90%)', get: () => ({ v: EFF ? `${EFF}k` : '<8k', sub: 'from the cells tested', good: EFF >= 64, bad: EFF < 32 }) },
      { label: 'Worst cell', get: () => ({ v: `${Math.round(WORST * 100)}%`, sub: WD ? `${WD.L}k, ${Math.round(WD.d * 100)}% deep` : '', bad: WORST < 0.7 }) },
    ];
    const labels = [
      { name: 'grid', t: 'Length × depth', d: 'Height: accuracy. Grey: not tested', icon: 'scale', atV: V(X(4) + 0.4, 0.6, Z(2)) },
      { name: 'sheet', t: 'The 90% line', d: 'Columns below it fail', icon: 'target', atV: V(X(0) - 0.4, 0.12 + 0.9 * H, Z(0)) },
    ];
    const reset = () => { Object.assign(st, { task: 1, ends: false }); draw(); };
    const breaks = [
      { label: 'Test only the ends', hint: 'Skip the middle', on: () => { st.task = 1; st.ends = true; draw(); }, off: reset },
      { label: 'Simple lookups only', hint: 'Shared words', on: () => { st.task = 0; st.ends = false; draw(); }, off: reset },
      { label: 'Chains of facts', hint: 'Real case-file questions', on: () => { st.task = 2; st.ends = false; draw(); }, off: reset },
    ];
    function status() {
      const tr = truthEff();
      if (st.ends && EFF > tr) return { ok: false, msg: `<b>The middle was never tested.</b> At the start and end of the file the model passes up to ${EFF}k, but facts buried in the middle fail much sooner: with all depths tested the honest answer is ${tr ? tr + 'k' : 'under 8k'}. A clerk's question about page 300 of a 600-page file would go wrong. Test every depth.` };
      if (st.task === 0) return { ok: false, msg: `<b>A test that is too easy.</b> When the planted fact shares words with the question, the model finds it almost everywhere: effective length ${EFF}k, the full window. Remove the shared words and it drops to ${(() => { const s = st.task; st.task = 1; const e = truthEff(); st.task = s; return e ? e + 'k' : 'under 8k'; })()}. Case-file questions rarely use the file's exact words.` };
      if (st.task === 2) return { ok: false, msg: `<b>Reasoning gives out long before the window.</b> Following a chain of facts (a witness named on one page, their statement on another, the date it contradicts on a third) stays above 90% only up to ${EFF ? EFF + 'k' : 'under 8k'} tokens, and the worst cell is ${Math.round(WORST * 100)}% at ${WD.L}k. Report this reasoning-effective length next to the advertised 128k, and split longer files.` };
      return { ok: true, msg: `<b>Retrieval works up to ${EFF}k.</b> With no shared words and every depth tested, the model passes 90% up to ${EFF}k tokens of the advertised 128k. Beyond that, facts in the middle are missed first (worst: ${Math.round(WORST * 100)}% at ${WD.L}k, ${Math.round(WD.d * 100)}% deep).` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Whole case files', home: true, say: 'A court records office in Lagos wants to feed whole case files to a model that accepts a hundred and twenty-eight thousand tokens. How much can it really use?', act: m => m.set({ task: 1, ends: false }) },
    { t: 'A needle in a haystack', home: true, say: 'Plant one fact at every depth of files of every length, and ask for it back. Each column is the accuracy.', act: m => m.set({ task: 1 }) },
    { t: 'Lost in the middle', home: true, say: 'Accuracy falls with length, and dips for facts in the middle. Test only the start and end, and you never see it.', act: m => m.set({ ends: true }) },
    { t: 'Too easy', home: true, say: 'If the fact shares words with the question, almost everything passes. Real questions rarely use the file\'s exact words.', act: m => m.set({ ends: false, task: 0 }) },
    { t: 'Chains of facts', home: true, say: 'Ask it to follow a chain of facts across pages, and it holds up only for much shorter files.', act: m => m.set({ task: 2 }) },
    { t: 'Two honest numbers', home: true, say: 'Report the length that works for finding facts and the length that works for reasoning, next to the advertised window.', act: m => m.set({ task: 1 }) },
  ],
  check: [
    { q: 'What does a needle-in-a-haystack test do?', options: ['Plants a fact at a chosen depth in long text and asks for it back', 'Measures typing speed', 'Counts the tokens in a file'], answer: 0, why: 'Sweep both length and depth.' },
    { q: 'Why test facts at every depth, not just the start and end?', options: ['Models often miss facts in the middle', 'The middle is always easier', 'Ends are never read'], answer: 0, why: 'The lost-in-the-middle effect.' },
    { q: 'Which is usually shortest?', options: ['The length that works for chains of reasoning', 'The length that works for simple lookups', 'The advertised window'], answer: 0, why: 'Reasoning fails first.' },
  ],
  terms: [
    ['Context window', 'The most tokens a model accepts at once.'],
    ['Needle in a haystack', 'A planted fact retrieved from long filler.'],
    ['Depth', 'How far into the text the fact is placed.'],
    ['Lost in the middle', 'Facts in the middle are missed more often.'],
    ['Effective length', 'The longest input that still meets an accuracy bar.'],
    ['Multi-hop', 'Questions that need several facts combined.'],
  ],
  deeper: '<p><b>Harder benchmarks.</b> RULER adds multi-key retrieval, variable tracing and aggregation; LongBench v2 asks real questions over long documents, code and dialogue; tests with no shared words show whether retrieval needs real understanding.</p><p><b>Latency too.</b> Very long prompts take a long time to read in before the first word comes out. Measure time to first token alongside accuracy.</p><p><b>About this machine.</b> The accuracies come from an illustrative formula with the shape real studies find: decline with length, a dip in the middle, and faster decline for harder tasks. The effective length is computed live from the cells tested.</p>',
  code: {
    title: 'A needle-in-a-haystack sweep',
    note: 'Adapted from the course\'s long-context evaluation lesson.',
    text: `
def plant(filler, needle, length, depth):
    words = filler.split()[:length]
    at = int(len(words) * depth)
    return " ".join(words[:at] + [needle] + words[at:])

def sweep(model, filler, needle, question, answer,
          lengths=(8_000, 32_000, 128_000), depths=(0, .25, .5, .75, 1)):
    grid = {}
    for n in lengths:
        for d in depths:
            reply = model(plant(filler, needle, n, d) + "\\n\\n" + question)
            grid[(n, d)] = answer.lower() in reply.lower()
    return grid
`,
  },
};
