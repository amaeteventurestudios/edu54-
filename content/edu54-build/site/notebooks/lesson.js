// Notebooks: cells on a page, a kernel (one Python process) that keeps every variable between cells.
// Run cells in order and outputs appear beside them; run them out of order and the kernel's hidden state lies to you.
// Break it: run the average before loading the data, change the city without rerunning, delete a cell whose variable lives on.
const RAIN = {
  Kisumu: [60, 80, 140, 190, 150, 75, 60, 75, 85, 95, 130, 95],
  Accra: [15, 35, 75, 95, 140, 200, 60, 25, 65, 80, 35, 20],
  Dakar: [0, 0, 0, 0, 0, 15, 90, 250, 165, 50, 2, 5],
};
const CITIES = Object.keys(RAIN);
const ROWZ = [-1.6, -0.8, 0, 0.8, 1.6], CODE_X = -1.35, CODE_W = 3.3, OUT_X = 1.15, OUT_W = 1.25, KX = 3.0;
const wetOf = c => RAIN[c].filter(m => m > 100).length, avgOf = c => Math.round(RAIN[c].reduce((a, b) => a + b, 0) / 12);

export default {
  slug: 'notebooks',
  title: 'Notebooks and the kernel',
  description: 'Run cells one by one and watch the kernel remember every variable, with answers and charts right beside the code. Then run them out of order and let hidden state lie to you.',
  overview: 'A notebook is a page of cells: text cells that explain and code cells that run. Behind the page is the kernel, one Python process that keeps every variable in memory, so each cell builds on the last and its answer appears right beside it. You can run cells in any order you like, which is the superpower and the trap: the kernel remembers things the page no longer shows. Restart and run all, and you know the notebook is honest.',
  keywords: ['jupyter notebook explained', 'what is a kernel', 'notebook hidden state', 'restart and run all', 'notebooks vs scripts'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.3, 0.4, 0], dir: [0.2, 1.05, 1.25], half: 3.2, wide: 7.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { city: 'Kisumu', vars: {}, n: 0, cursor: 1, queue: [], cur: null, gone: false, outs: [null, null, null, null, null] };
    const mono = '"JetBrains Mono", monospace';
    const SRC = [
      () => '# Rain by month',
      () => `rain = load("${st.city.toLowerCase()}")`,
      () => 'wet = [m for m in rain if m > 100]',
      () => 'print(len(wet), sum(rain) // 12)',
      () => 'plot(rain)',
    ];
    /* ---------- the page of cells ---------- */
    const L0 = CODE_X - CODE_W / 2, R0 = OUT_X + OUT_W / 2;
    const page = P.box(R0 - L0 + 0.4, 0.06, 4.1, '#FFFFFF', { r: 0.12 }); page.position.set((L0 + R0) / 2, 0, 0); S.add(page);
    const cells = ROWZ.map((z, i) => {
      const g = new THREE.Group(); g.position.set(0, 0.06, z); S.add(g);
      const md = i === 0;
      const m = new THREE.MeshLambertMaterial({ color: md ? '#FFFFFF' : '#F1EEE6' });
      const slab = P.box(CODE_W, 0.08, 0.62, '#F1EEE6', { r: 0.05, material: m }); slab.position.x = CODE_X; g.add(slab);
      const txt = S.text('', { size: md ? 0.22 : 0.14, weight: md ? 800 : 650, color: '#151827', font: md ? undefined : mono, align: 'left', w: CODE_W - 0.6, maxW: CODE_W - 0.6, maxH: 0.5 }); txt.position.set(CODE_X + 0.22, 0.081, 0); g.add(txt);
      const cnt = S.text(md ? '' : '[ ]', { size: 0.13, weight: 700, color: '#8E91A3', font: mono, maxW: 0.42 }); cnt.position.set(CODE_X - CODE_W / 2 + 0.25, 0.081, 0); g.add(cnt);
      const om = new THREE.MeshLambertMaterial({ color: '#FFFFFF' });
      const out = P.box(OUT_W, 0.05, 0.62, '#FFFFFF', { r: 0.05, material: om }); out.position.x = OUT_X; g.add(out);
      const otx = S.text('', { size: 0.12, weight: 650, color: '#151827', font: mono, align: 'left', maxW: OUT_W - 0.1, maxH: 0.52 }); otx.position.set(OUT_X, 0.052, 0); g.add(otx);
      out.visible = otx.visible = !md;
      return { g, m, slab, txt, cnt, out, om, otx };
    });
    // the chart output of cell 4: twelve little bars
    const bars = [...Array(12)].map((_, k) => { const b = P.box(0.07, 1, 0.07, C.blue, { r: 0 }); b.position.set(OUT_X - 0.5 + k * 0.09, 0.11, ROWZ[4] + 0.12); b.userData.noFit = true; S.add(b); return b; });
    const chartT = S.text('', { size: 0.08, weight: 700, color: '#151827', maxW: OUT_W - 0.15 }); chartT.position.set(OUT_X, 0.115, ROWZ[4] - 0.2); S.add(chartT);
    const cursor = P.arrow(V(), V(1, 0, 0), 0.04, C.orange); cursor.userData.noFit = true; S.add(cursor);
    /* ---------- the kernel ---------- */
    const kbase = P.box(1.6, 0.22, 2.6, '#2C2D31', { r: 0.1 }); kbase.position.set(KX, 0, 0); S.add(kbase);
    const jar = P.box(1.5, 1.0, 2.5, '#DDF3FA', { r: 0.12, m: { opacity: 0.18 }, cast: false }); jar.material.depthWrite = false; jar.position.set(KX, 0.22, 0); S.add(jar);
    const kF = S.text('KERNEL (PYTHON)', { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF', maxW: 1.5 }); kF.position.set(KX, 0.11, 1.305); S.add(kF);
    const kT = S.text('KERNEL', { size: 0.14, weight: 800, color: '#FFFFFF', maxW: 1.3 }); kT.position.set(KX, 0.225, 1.05); S.add(kT);
    const VARS = ['rain', 'wet'];
    const varT = VARS.map((v, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#F2C94C' });
      const t = P.tile('', 1.25, 0.3, 0.7, '#F2C94C', { size: 0.12, font: mono }); t.userData.body.material = m; t.position.set(KX, 0.22, -0.55 + i * 1.0); t.userData.noFit = true; S.add(t);
      return { t, m };
    });
    const beam = new THREE.CatmullRomCurve3([V(0, 0.3, 0), V(1, 0.8, 0), V(2, 0.6, 0)]);
    const flow = P.flow(beam, 5, C.orange, { r: 0.06, speed: 2 }); S.add(flow.mesh);
    /* ---------- running cells ---------- */
    function exec(i) {
      st.n++; const c = cells[i]; c.ran = st.n;
      const need = { 2: ['rain'], 3: ['rain', 'wet'], 4: ['rain'] }[i] || [];
      const miss = need.find(v => !st.vars[v]);
      if (miss) { st.outs[i] = { err: `NameError: name\n'${miss}' is not defined`, miss }; return; }
      if (i === 1) st.vars.rain = { city: st.city };
      if (i === 2) st.vars.wet = { city: st.vars.rain.city };
      if (i === 3) st.outs[i] = { text: `${wetOf(st.vars.wet.city)} wet months,\naverage ${avgOf(st.vars.rain.city)}`, city: st.vars.rain.city, wetCity: st.vars.wet.city };
      if (i === 1) st.outs[i] = { text: `12 months of\n${st.city}`, city: st.city };
      if (i === 2) st.outs[i] = { text: `(wet saved)`, city: st.vars.wet.city };
      if (i === 4) st.outs[i] = { chart: st.vars.rain.city, city: st.vars.rain.city };
    }
    const run = i => { if (st.gone && i === 2) return; st.queue.push(i); };
    function restart() { st.vars = {}; st.n = 0; st.queue = []; st.cur = null; cells.forEach(c => { c.ran = 0; }); st.outs = [null, null, null, null, null]; st.restarted = true; }
    function runAll() { restart(); for (let i = 1; i <= 4; i++) run(i); }
    function runNext() { st.restarted = false; run(st.cursor); st.cursor = st.cursor >= 4 ? 1 : st.cursor + 1; if (st.gone && st.cursor === 2) st.cursor = 3; }
    function update(dt, t) {
      if (!st.cur && st.queue.length) st.cur = { i: st.queue.shift(), t: 0 };
      if (st.cur) { st.cur.t += dt * (S.reduced ? 5 : 2.2); if (st.cur.t >= 1) { exec(st.cur.i); st.cur = null; } }
      const ci = st.cur ? st.cur.i : null;
      flow.on = ci != null;
      if (ci != null) { const z = ROWZ[ci]; beam.points[0].set(CODE_X + CODE_W / 2, 0.25, z); beam.points[1].set((CODE_X + KX) / 2 + 1.2, 0.95, (z + 0) / 2); beam.points[2].set(KX - 0.6, 0.6, 0); beam.updateArcLengths(); }
      flow.tick(dt);
      cells.forEach((c, i) => {
        const hide = st.gone && i === 2; c.g.visible = !hide;
        c.txt.userData.set(SRC[i]());
        if (i) c.cnt.userData.set(ci === i ? '[*]' : c.ran ? `[${c.ran}]` : '[ ]', ci === i ? C.orange : c.ran ? '#151827' : '#8E91A3');
        c.m.color.set(ci === i ? '#FDE7CF' : i === 0 ? '#FFFFFF' : '#F1EEE6');
        const o = st.outs[i];
        c.om.color.set(o?.err ? '#FBD9D3' : '#FFFFFF');
        c.otx.userData.set(o ? (o.err || o.text || '') : '');
        c.otx.visible = !!o && !o.chart && i > 0;
      });
      const ch = st.outs[4]?.chart;
      bars.forEach((b, k) => { b.visible = !!ch && !(st.gone && false); if (ch) { const h = Math.max(0.01, RAIN[ch][k] / 250 * 0.42); b.scale.y = h; } });
      chartT.visible = !!ch; if (ch) chartT.userData.set(`rain in ${ch}`);
      // the cursor points at the next cell to run
      const cz = ROWZ[st.cursor]; P.setArrow(cursor, V(CODE_X - CODE_W / 2 - 0.55, 0.2, cz), V(CODE_X - CODE_W / 2 - 0.08, 0.2, cz));
      // the kernel's memory
      varT.forEach((v, k) => {
        const x = st.vars[VARS[k]];
        v.t.visible = !!x;
        if (x) v.t.userData.label.userData.set(VARS[k] === 'rain' ? `rain\n(${x.city}, 12)` : `wet\n(${x.city}, ${wetOf(x.city)})`);
        v.m.color.set(x && x.city !== st.city ? '#F6C59A' : '#F2C94C');
      });
    }
    /* ---------- what's wrong, if anything ---------- */
    const stale = () => Object.values(st.vars).some(v => v.city !== st.city) || st.outs.some(o => o && o.city && o.city !== st.city);
    const controls = [
      { type: 'button', label: 'Run the next cell', short: 'Run cell', act: runNext, hint: 'Shift + Enter in a real notebook' },
      { type: 'button', label: 'Restart and run all', short: 'Run all', act: runAll },
      { type: 'buttons', label: 'Run one cell', options: ['1', '2', '3', '4'], get: () => -1, act: i => { st.restarted = false; run(i + 1); } },
      { type: 'buttons', label: 'Data in cell 1', options: CITIES, get: () => CITIES.indexOf(st.city), act: i => { st.city = CITIES[i]; }, hint: 'Changes the code, does not run it' },
      { type: 'button', label: 'Restart the kernel', short: 'Restart', act: restart, quick: false },
    ];
    const readouts = [
      { label: 'Kernel remembers', get: () => { const k = Object.keys(st.vars); return { v: k.length ? k.join(', ') : 'nothing', bad: stale() }; } },
      { label: 'Runs so far', get: () => ({ v: st.n }) },
    ];
    const labels = [
      { name: 'cells', t: 'Cells', d: 'Text cells explain, code cells run', icon: 'box', atV: V(CODE_X - CODE_W / 2, 0.14, ROWZ[0] - 0.31) },
      { name: 'count', t: 'Run order', d: 'The number says when it really ran', icon: 'info', atV: V(CODE_X - CODE_W / 2, 0.14, ROWZ[3] + 0.31) },
      { name: 'output', t: 'Output', d: 'Answers and charts appear beside the code', icon: 'eye', atV: V(OUT_X + OUT_W / 2, 0.11, ROWZ[4] + 0.31) },
      { name: 'kernel', t: 'The kernel', d: 'One Python process that keeps every variable', icon: 'spark', atV: V(KX - 0.75, 1.22, 1.25) },
    ];
    const reset = () => { st.city = 'Kisumu'; st.gone = false; st.cursor = 1; restart(); st.restarted = false; };
    const instant = () => { while (st.queue.length) exec(st.queue.shift()); st.cur = null; };
    const breaks = [
      { label: 'Run cell 3 first', hint: 'Before the data is loaded', on: () => { reset(); run(3); }, off: reset },
      { label: 'Change the data, rerun only some cells', hint: 'Hidden state', on: () => { reset(); runAll(); instant(); st.city = 'Dakar'; run(1); run(4); }, off: reset },
      { label: 'Delete a cell, keep its variable', hint: 'Works today, fails after a restart', on: () => { reset(); runAll(); instant(); st.gone = true; runAll(); }, off: reset },
    ];
    function status() {
      if (st.cur || st.queue.length) return { msg: `<b>Running cell ${st.cur ? st.cur.i : st.queue[0]}…</b> The code goes to the kernel, which runs it and sends the answer back.` };
      const ei = st.outs.findIndex(o => o?.err), err = ei > 0 ? { i: ei, miss: st.outs[ei].miss } : null;
      if (err && st.gone && err.miss === 'wet') return { ok: false, msg: `<b>NameError after a restart.</b> Cell 3 needs <code>wet</code>, which only existed because a cell you deleted had run earlier. Before the restart the kernel still remembered it and everything looked fine. Restart and run all is what catches this.` };
      if (err) return { ok: false, msg: `<b>NameError: '${err.miss}' is not defined.</b> Cell ${err.i} ran before the cell that makes <code>${err.miss}</code>. The kernel only knows what has already run, not what is written above. Run from the top.` };
      if (stale()) return { ok: false, msg: `<b>Hidden state.</b> Cell 1 now says ${st.city}, but the kernel still holds data from ${Object.values(st.vars).find(v => v.city !== st.city)?.city || 'before'}, and some outputs describe a run that the page no longer shows. The notebook is lying. <b>Restart and run all</b>.` };
      const done = [1, 2, 3, 4].every(i => cells[i].ran);
      if (done && st.restarted) return { ok: true, msg: `<b>Honest notebook.</b> Restarted, then run top to bottom: ${wetOf(st.city)} wet months in ${st.city}, average ${avgOf(st.city)} mm. Anyone who runs it gets the same answers.` };
      if (done) return { ok: true, msg: `<b>All four cells ran.</b> ${wetOf(st.city)} wet months in ${st.city}, average ${avgOf(st.city)} mm a month. The kernel remembers <code>rain</code> and <code>wet</code>.` };
      return { msg: `<b>${st.n ? `${st.n} run${st.n > 1 ? 's' : ''} so far.` : 'Nothing has run yet.'}</b> Press <b>Run cell</b> to run the cell the arrow points at, or <b>Run all</b>.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, run, runAll, restart, city: c => { st.city = c; } };
  },

  story: [
    { t: 'A page of cells', home: true, say: 'A notebook is a page of cells that you run one at a time. Text cells explain. Code cells do the work.', act: m => m.reset() },
    { t: 'The kernel', focus: 'kernel', zoom: 1.4, say: 'Behind the page is the kernel: one Python process that keeps every variable in memory. Run the first cell, and the rain for Kisumu now lives in the kernel.', act: m => m.run(1) },
    { t: 'Answers beside the code', focus: 'output', zoom: 1.35, say: 'Each cell builds on what the kernel already holds, and its answer appears right beside it, even a chart. That makes notebooks great for exploring.', act: m => { m.run(2); m.run(3); m.run(4); }, wait: 5 },
    { t: 'Any order you like', focus: 'count', zoom: 1.4, say: 'The number beside a cell says when it really ran. You can run any cell at any time, in any order. That freedom is the trap.' },
    { t: 'Hidden state', home: true, say: 'Change the data to Dakar, then rerun the first cell and the chart, but not the others. The chart shows Dakar, while the wet months and the average still describe Kisumu. The page and the kernel disagree.', act: m => { m.city('Dakar'); m.run(1); m.run(4); }, wait: 5 },
    { t: 'Restart and run all', home: true, say: 'The fix is to restart the kernel and run everything from the top. If that works, the notebook is honest. Explore in a notebook, then move the code that works into a script.', act: m => m.runAll(), wait: 5 },
  ],
  check: [
    { q: 'What is the kernel?', options: ['The text at the top of the notebook', 'The Python process that runs cells and keeps the variables', 'A file that stores your charts'], answer: 1, why: 'The kernel is one running Python process. Every cell you run talks to it, and it remembers every variable.' },
    { q: 'You changed cell 1 and reran it and the chart, but not the cells between. What is the danger?', options: ['None, the chart is enough', 'The other outputs still describe the old data: hidden state', 'The notebook file gets deleted'], answer: 1, why: 'The kernel still holds values from the old run, so the page shows a mix of old and new answers.' },
    { q: 'How do you check a notebook is honest?', options: ['Restart the kernel and run all cells from the top', 'Save it twice', 'Run the last cell again'], answer: 0, why: 'A fresh kernel knows nothing, so running top to bottom proves the page alone produces the answers.' },
  ],
  terms: [
    ['Notebook', 'A page of text and code cells, saved as an .ipynb file, that you run one cell at a time.'],
    ['Cell', 'One box of code or text. Code cells show their output right under or beside them.'],
    ['Kernel', 'The Python process behind the notebook. It runs the cells and remembers every variable.'],
    ['Execution count', 'The number beside a cell, [3], saying when it ran in this kernel.'],
    ['Hidden state', 'Values the kernel remembers that the page no longer explains, after cells ran out of order or were deleted.'],
  ],
  deeper: '<p><b>Magic commands.</b> Lines starting with <code>%</code> talk to the notebook itself: <code>%timeit</code> times a line many times, <code>%%time</code> times a whole cell, and <code>%matplotlib inline</code> puts charts on the page.</p><p><b>Explore, then ship.</b> Notebooks are for trying things. Once a piece works, move it into a <code>.py</code> file, import it back into the notebook, and keep experimenting on top of it. Scripts can be tested, reviewed and run on a schedule; notebooks are hard to do all three with.</p><p><b>Free notebooks with a graphics card</b> exist in the cloud: upload the .ipynb file, choose a GPU runtime, and remember that the files vanish when the session ends.</p>',
  code: {
    title: 'Notebook cells, written out',
    note: 'The four code cells from the scene, as they would sit in a notebook. Run them top to bottom in a fresh kernel.',
    text: `
# [1]
import pandas as pd
rain = pd.read_csv("kisumu.csv")["mm"].tolist()   # 12 months

# [2]
wet = [m for m in rain if m > 100]

# [3]
print(len(wet), sum(rain) // 12)     # wet months, average

# [4]
%matplotlib inline
import matplotlib.pyplot as plt
plt.bar(range(1, 13), rain)

# time something without leaving the page
%timeit sum(rain)
`,
  },
};
