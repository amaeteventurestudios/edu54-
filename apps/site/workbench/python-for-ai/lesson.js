// Python for AI: a list is a row of pointers to number objects scattered in memory; a NumPy array is one block of raw numbers.
// Summing walks the pointers one by one, or sweeps the block in chunks. In front: rows that share one list, and a generator that runs dry.
// Break it: loop over a million numbers in Python, build rows as [[0]*3]*3, loop twice over a generator.
const VALS = [3.1, 0.4, 2.7, 1.8, 0.9, 2.2, 1.5, 0.6];
const LX0 = -3.05, AX0 = 0.55, CW = 0.32, BZ = -1.15;

export default {
  slug: 'python-for-ai',
  title: 'Python for AI: lists, arrays and traps',
  description: 'See why a Python list of numbers is a row of pointers and a NumPy array is one solid block, and race them on a sum. Then fall into the three silent traps: rows that share one list, and a generator that is empty the second time.',
  overview: 'Most course code is plain Python plus NumPy. A Python list doesn\'t hold numbers: it holds pointers to number objects scattered through memory, so a loop visits them one by one, checking each as it goes. A NumPy array is one block of raw numbers that compiled code sweeps several at a time: often a hundred times faster and a quarter of the memory. And three Python habits give wrong answers with no error at all.',
  keywords: ['python for machine learning', 'numpy vs list', 'why python loops are slow', 'mutable default argument', 'generator exhausted'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, -0.2], dir: [0.15, 1.05, 1.3], half: 3, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const mono = '"JetBrains Mono", monospace';
    const st = { race: null, who: 'numpy', big: false, comp: true, list: true, set5: false, epochs: null };
    /* ---------- the list: slots of pointers to objects ---------- */
    const lbase = P.box(8 * CW + 0.3, 0.12, 0.6, '#2C2D31', { r: 0.06 }); lbase.position.set(LX0 + 3.5 * CW, 0, BZ); S.add(lbase);
    const lname = S.text('Python list: pointers', { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF', maxW: 2.6 }); lname.position.set(LX0 + 3.5 * CW, 0.06, BZ + 0.305); S.add(lname);
    const slots = VALS.map((v, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#8E91A3' });
      const b = P.box(CW - 0.06, 0.12, 0.34, '#8E91A3', { r: 0.03, material: m }); b.position.set(LX0 + i * CW, 0.12, BZ); S.add(b);
      // each number lives somewhere else in memory, as its own object
      const o = V(LX0 + i * CW + Math.sin(i * 2.3) * 0.35, 0.75 + (i % 3) * 0.28, BZ - 0.65 - (i % 2) * 0.35);
      const om = new THREE.MeshLambertMaterial({ color: '#F2C94C' });
      const ob = P.ball(0.13, '#F2C94C', { material: om }); ob.position.copy(o); S.add(ob);
      const t = S.text(String(v), { size: 0.1, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 0.4 }); t.position.copy(o).add(V(0, 0.22, 0)); t.userData.noFit = true; S.add(t);
      const r = P.rod(V(LX0 + i * CW, 0.24, BZ), o, 0.012, '#8E91A3'); S.add(r);
      return { m, om, o };
    });
    /* ---------- the array: one block of raw numbers ---------- */
    const abase = P.box(8 * CW + 0.3, 0.12, 0.6, '#1C9A94', { r: 0.06 }); abase.position.set(AX0 + 3.5 * CW, 0, BZ); S.add(abase);
    const aname = S.text('NumPy array: one block', { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF', maxW: 2.6 }); aname.position.set(AX0 + 3.5 * CW, 0.06, BZ + 0.305); S.add(aname);
    const cells = VALS.map((v, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#BDE3DE' });
      const t = P.tile(String(v), CW - 0.02, 0.22, 0.42, '#BDE3DE', { size: 0.12, font: mono }); t.userData.body.material = m; t.position.set(AX0 + i * CW, 0.12, BZ); S.add(t);
      return { m };
    });
    const sumT = S.text('', { size: 0.13, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 2.2 }); sumT.position.set(0, 1.75, BZ); sumT.userData.noFit = true; S.add(sumT);
    /* ---------- front left: rows of a grid ---------- */
    const GX = -2.75, RX = -1.45, RZ = [0.45, 0.95, 1.45];
    const gname = S.text('', { size: 0.1, weight: 750, font: mono, maxW: 2.2 }); gname.position.set(-2.1, 0.005, 1.95); S.add(gname);
    const rslots = RZ.map(z => { const b = P.box(0.42, 0.14, 0.34, '#8E91A3', { r: 0.03 }); b.position.set(GX, 0, z); S.add(b); return b; });
    const rows = RZ.map(z => {
      const g = new THREE.Group(); g.position.set(RX, 0, z); S.add(g);
      const ts = [0, 1, 2].map(k => { const t = P.tile('0', 0.34, 0.14, 0.34, '#F7F5EE', { size: 0.15, font: mono }); t.position.x = k * 0.38; g.add(t); return t; });
      return { g, ts };
    });
    const rrods = RZ.map(() => { const r = P.rod(V(), V(0, 1, 0), 0.015, '#8E91A3'); S.add(r); return r; });
    /* ---------- front right: a batch hopper (a generator or a list) ---------- */
    const HX = 1.55, HZ = 0.85;
    const hop = P.cyl(0.42, 0.6, '#C9774A', { r2: 0.62 }); hop.position.set(HX, 0.25, HZ); S.add(hop);
    const hopLeg = P.box(0.24, 0.25, 0.24, '#5B4636', { r: 0.03 }); hopLeg.position.set(HX, 0, HZ); S.add(hopLeg);
    const hopT = S.text('', { size: 0.11, weight: 800, color: '#FFFFFF', font: mono, maxW: 1.1 }); hopT.position.set(HX, 0.855, HZ); S.add(hopT);
    const fill = [...Array(10)].map((_, k) => { const b = P.box(0.14, 0.08, 0.14, '#F2C94C', { r: 0.02 }); b.position.set(HX - 0.32 + (k % 5) * 0.16, 0.86 - 0.03, HZ - 0.1 + Math.floor(k / 5) * 0.2); b.userData.noFit = true; S.add(b); return b; });
    const trays = [0, 1].map(e => { const b = P.box(0.85, 0.08, 0.55, '#D8D4C8', { r: 0.04 }); b.position.set(2.65, 0, HZ - 0.35 + e * 0.75); S.add(b); const t = S.text(`epoch ${e + 1}`, { size: 0.1, weight: 800, color: '#151827', maxW: 0.8 }); t.position.set(2.65, 0.085, HZ - 0.53 + e * 0.75); S.add(t); return b; });
    const got = [0, 1].map(e => [...Array(10)].map((_, k) => { const b = P.box(0.12, 0.07, 0.12, '#F2C94C', { r: 0.02 }); b.position.set(2.65 - 0.32 + (k % 5) * 0.16, 0.08, HZ - 0.3 + e * 0.75 + Math.floor(k / 5) * 0.15); b.userData.noFit = true; S.add(b); return b; }));
    /* ---------- actions ---------- */
    function race(who) { st.who = who; st.race = { t: 0 }; st.last = 'sum'; }
    function epochs() { st.epochs = { t: 0, n: [10, st.list ? 10 : 0] }; st.last = 'batch'; }
    const N = () => st.big ? 1e6 : 8;
    const tList = () => N() * 80e-9 * 1.0, tNp = () => Math.max(1e-6, N() * 0.8e-9);
    const fmtT = s => s >= 1e-4 ? `${(s * 1e3).toFixed(s < 1e-2 ? 1 : 0)} ms` : `${(s * 1e6).toFixed(1)} µs`;
    function update(dt, t) {
      const r = st.race;
      slots.forEach(s => { s.m.color.set('#8E91A3'); s.om.color.set('#F2C94C'); });
      cells.forEach(c => c.m.color.set('#BDE3DE'));
      if (r) {
        r.t += dt * (S.reduced ? 4 : 1);
        if (st.who === 'list') {
          // one slot, then its object, then the next slot: 0.45 s each
          const k = Math.min(7, Math.floor(r.t / 0.45));
          for (let i = 0; i < k; i++) slots[i].om.color.set('#9FDDB2');
          slots[k].m.color.set(C.orange); slots[k].om.color.set(C.orange);
          if (r.t > 8 * 0.45) slots.forEach(s => s.om.color.set('#9FDDB2'));
        } else {
          // four numbers per instruction, twice
          const k = Math.min(1, Math.floor(r.t / 0.5));
          cells.forEach((c, i) => { if (Math.floor(i / 4) < k || r.t > 1) c.m.color.set('#9FDDB2'); else if (Math.floor(i / 4) === k) c.m.color.set(C.orange); });
        }
        sumT.visible = true;
        const done = st.who === 'list' ? r.t > 3.6 : r.t > 1;
        sumT.userData.set(done ? `sum = ${VALS.reduce((a, b) => a + b, 0).toFixed(1)} · ${N() === 8 ? '8' : 'a million'} values · ${fmtT(st.who === 'list' ? tList() : tNp())}` : st.who === 'list' ? 'for x in values: total += x …' : 'np.sum(values) …');
        sumT.position.set(st.who === 'list' ? LX0 + 3.5 * CW : AX0 + 3.5 * CW, 1.75, BZ);
      } else sumT.visible = false;
      // the grid: three separate rows, or three pointers to one row
      const shared = !st.comp;
      rows.forEach((row, i) => { row.g.visible = !shared || i === 1; row.ts.forEach((tl, k) => tl.userData.label.userData.set(st.set5 && k === 0 && (shared || i === 0) ? '5' : '0')); row.ts[0].userData.body.material = P.mat(st.set5 && (shared || i === 0) ? (shared ? '#F4A99F' : '#9FDDB2') : '#F7F5EE'); });
      RZ.forEach((z, i) => P.setRod(rrods[i], V(GX + 0.21, 0.07, z), V(RX - 0.17, 0.07, shared ? RZ[1] : z)));
      gname.userData.set(shared ? 'grid = [[0]*3]*3' : 'grid = [[0]*3 for _ in range(3)]');
      // the hopper empties as batches are drawn; a generator stays empty
      const e = st.epochs;
      hopT.userData.set(st.list ? 'batches = list(...)' : 'batches = (b for ...)');
      const t1 = e ? e.t : 0, s1 = e ? Math.max(0, Math.min(10, Math.floor(t1 / 0.18))) : 0, s2 = e ? Math.max(0, Math.min(e.n[1], Math.floor((t1 - 2.2) / 0.18))) : 0;
      got[0].forEach((b, k) => { b.visible = k < s1; });
      got[1].forEach((b, k) => { b.visible = k < s2; });
      // a list can be read again (the hopper refills); a generator stays empty after one pass
      const left = !e ? 10 : st.list ? (t1 < 2.2 ? 10 - s1 : 10 - s2) : 10 - s1;
      if (e) e.t += dt * (S.reduced ? 4 : 1);
      fill.forEach((b, k) => { b.visible = k < Math.max(0, left); });
    }
    const controls = [
      { type: 'buttons', label: 'Sum the numbers with', options: ['A Python loop', 'NumPy'], get: () => st.who === 'list' ? 0 : 1, act: i => race(i ? 'numpy' : 'list') },
      { type: 'toggle', label: 'A million numbers', short: 'A million', get: () => st.big, set: v => { st.big = v; race(st.who); } },
      { type: 'button', label: 'Set grid[0][0] = 5', short: 'grid[0][0] = 5', act: () => { st.set5 = true; st.last = 'grid'; } },
      { type: 'toggle', label: 'Build rows with a comprehension', short: 'Comprehension', get: () => st.comp, set: v => { st.comp = v; st.last = 'grid'; }, quick: false },
      { type: 'button', label: 'Loop over the batches twice', short: 'Two epochs', act: epochs },
      { type: 'toggle', label: 'Keep the batches in a list', short: 'List', get: () => st.list, set: v => { st.list = v; epochs(); }, quick: false },
    ];
    const readouts = [
      { label: 'Sum of a million', get: () => ({ v: st.who === 'list' ? '80 ms' : '0.8 ms', sub: st.who === 'list' ? 'Python loop' : 'NumPy', bad: st.who === 'list' && st.big, good: st.who === 'numpy' }) },
      { label: 'Memory per number', get: () => ({ v: st.who === 'list' ? '32 bytes' : '8 bytes', sub: st.who === 'list' ? 'pointer + object' : 'raw float64' }) },
      { label: 'Batches per epoch', get: () => ({ v: st.epochs ? `${st.epochs.n[0]}, ${st.epochs.n[1]}` : '—', bad: st.epochs && !st.epochs.n[1], good: st.epochs && st.epochs.n[1] === 10 }) },
    ];
    const labels = [
      { name: 'list', t: 'A list of pointers', d: 'Each number is a separate object', icon: 'link', atV: V(LX0 - 0.2, 0.12, BZ - 0.3) },
      { name: 'grid', t: 'Rows of a grid', d: 'Three rows, or three names for one?', icon: 'box', atV: V(GX - 0.21, 0.14, RZ[2]) },
      { name: 'array', t: 'An array: one block', d: 'Raw numbers, side by side', icon: 'spark', atV: V(AX0 + 7 * CW + 0.16, 0.34, BZ - 0.3) },
      { name: 'batches', t: 'A batch hopper', d: 'A generator runs dry after one pass', icon: 'info', atV: V(2.65 + 0.43, 0.08, HZ + 0.68) },
    ];
    const reset = () => { Object.assign(st, { who: 'numpy', big: false, comp: true, list: true, set5: false, epochs: null }); race('numpy'); };
    const breaks = [
      { label: 'Loop over a million numbers in Python', hint: 'for x in values: total += x', on: () => { reset(); st.big = true; race('list'); }, off: reset },
      { label: 'Rows built as [[0]*3]*3', hint: 'Then set grid[0][0] = 5', on: () => { reset(); st.comp = false; st.set5 = true; }, off: reset },
      { label: 'Loop twice over a generator', hint: 'The second epoch gets nothing', on: () => { reset(); st.list = false; epochs(); }, off: reset },
    ];
    function status() {
      if (!st.comp && st.set5) return { ok: false, msg: `<b>Every row changed.</b> <code>[[0]*3]*3</code> makes one row and three pointers to it, so setting <code>grid[0][0]</code> also "sets" rows 1 and 2. No error, just wrong numbers. Build each row fresh: <code>[[0]*3 for _ in range(3)]</code>.` };
      if (st.epochs && !st.epochs.n[1]) return { ok: false, msg: `<b>Epoch 2 trained on nothing.</b> A generator hands out each batch once and is then empty; the second loop over it ends at once, silently. Keep the batches in a list, or make a fresh generator every epoch.` };
      if (st.who === 'list' && st.big) return { ok: false, msg: `<b>80 ms for one sum.</b> A Python loop over a million numbers follows a million pointers and checks each object's type as it goes. <code>np.sum</code> does the same in about 0.8 ms: one block, one type check, four numbers per instruction. Inside a training loop that difference is everything.` };
      if (st.who === 'list') return { msg: `<b>The Python loop</b> visits each slot, follows its pointer to the number object, checks what it is, and adds. One at a time.` };
      if (st.last === 'grid' && st.set5) return { ok: true, msg: `<b>Only row 0 changed,</b> because each row is its own list. That is what you meant.` };
      if (st.last === 'grid') return { msg: `<b>Three separate rows.</b> Press <b>grid[0][0] = 5</b> to see which rows change.` };
      if (st.last === 'batch') return { ok: true, msg: `<b>Ten batches, both epochs.</b> A list can be looped over as many times as you like.` };
      return { ok: true, msg: `<b>NumPy sums the block</b> four numbers per instruction, with no pointers to follow. ${N() === 8 ? 'Eight numbers' : 'A million numbers'} in ${fmtT(tNp())}.` };
    }
    reset();
    return { update, controls, readouts, labels, breaks, status, reset, race, epochs, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'Two ways to hold numbers', home: true, say: 'Here are the same eight numbers held two ways: on the left a Python list, on the right a NumPy array.', act: m => m.reset() },
    { t: 'A list is pointers', focus: [-2.0, 0.7, -1.4], zoom: 1.45, say: 'A Python list does not hold numbers. It holds pointers, and each number is its own object somewhere else in memory. Summing them means following every pointer, one at a time.', act: m => m.race('list'), wait: 5 },
    { t: 'An array is one block', focus: [1.7, 0.4, -1.2], zoom: 1.45, say: 'A NumPy array is one solid block of raw numbers. Compiled code sweeps it several numbers at a time. A million numbers sum about a hundred times faster, in a quarter of the memory.', act: m => m.race('numpy') },
    { t: 'Silent trap: shared rows', focus: [-2.1, 0.2, 1.0], zoom: 1.5, say: 'Now a trap with no error message. Build a grid by multiplying a list, and you get three names for one row. Change one cell, and every row changes.', act: m => m.set({ comp: false, set5: true }), wait: 5 },
    { t: 'Silent trap: a dry generator', focus: [2.1, 0.3, 0.9], zoom: 1.5, say: 'A generator hands out batches one at a time, and then it is empty. Loop over it a second time and the second epoch trains on nothing, without a word.', act: m => { m.set({ comp: true, set5: false, list: false }); m.epochs(); }, wait: 6 },
    { t: 'The habits', home: true, say: 'Keep numbers in arrays, build each row fresh, and keep batches in a list or make them again each epoch. Then Python stays fast and honest.', act: m => m.reset() },
  ],
  check: [
    { q: 'Why is a Python loop over a million numbers slow?', options: ['Python can\'t add', 'Each number is a separate object reached through a pointer and checked one at a time', 'The numbers are too big'], answer: 1, why: 'A list holds pointers to objects. NumPy keeps raw numbers in one block and loops in compiled code.' },
    { q: 'grid = [[0]*3]*3, then grid[0][0] = 5. What happens?', options: ['Only row 0 changes', 'All three rows show 5', 'An error'], answer: 1, why: 'The three rows are the same list. Use [[0]*3 for _ in range(3)].' },
    { q: 'You loop over a generator of batches for two epochs. What does epoch 2 see?', options: ['The same batches again', 'Nothing: the generator is used up', 'The batches in reverse'], answer: 1, why: 'A generator yields each item once. Make a new one each epoch, or keep a list.' },
  ],
  terms: [
    ['List', 'Python\'s ordered collection: a row of pointers to objects of any kind.'],
    ['NumPy array', 'A block of raw numbers of one type, processed by compiled code.'],
    ['Broadcasting', 'NumPy stretching a small array to match a bigger one, so whole-array maths needs no loop.'],
    ['Generator', 'A function or expression that yields items one at a time and is then exhausted.'],
    ['Mutable default', 'A default argument such as seen=[] that is created once and shared by every call.'],
  ],
  deeper: '<p><b>The third silent trap.</b> <code>def add(x, seen=[])</code> creates the list once, when the function is defined, so every call keeps appending to the same list. Use <code>seen=None</code> and make a new list inside.</p><p><b>SIMD.</b> Numbers that sit side by side let the processor add four or eight of them with one instruction. Python objects scattered through memory can\'t be added that way.</p><p><b>Dataclasses</b> give records named fields and a readable print with almost no code: <code>@dataclass class Row: farm: str; yield_t: float</code>.</p>',
  code: {
    title: 'The fast way and the three traps',
    note: 'Adapted from the course\'s Python lesson.',
    text: `
import numpy as np

values = [0.5] * 1_000_000
total = 0.0
for x in values:          # follows a million pointers: slow
    total += x

arr = np.array(values)    # one block of float64
total = arr.sum()         # compiled, four at a time: fast

# trap 1: three names for one row
grid = [[0] * 3] * 3          # wrong
grid = [[0] * 3 for _ in range(3)]   # right

# trap 2: a default list shared by every call
def add(x, seen=None):
    seen = [] if seen is None else seen
    seen.append(x)
    return seen

# trap 3: a generator runs dry
batches = list(make_batches(data, 32))   # loop over it every epoch
`,
  },
};
