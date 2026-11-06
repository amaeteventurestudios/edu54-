// Numerical stability: softmax turns five scores into chances. Each score becomes a column of e^score; columns that outgrow the ceiling
// of what a float can hold overflow to infinity, and inf / inf = NaN. Subtracting the largest score first keeps every column under the roof.
// Break it: big scores without the shift (overflow), very negative scores in float16 (everything underflows to 0, 0 / 0).
const WORDS = ['jollof', 'ugali', 'injera', 'fufu', 'couscous'];
const COLS = ['#D9483B', '#E3A72F', '#3E9B5F', '#3D6BD6', '#8A3F8E'];
const FMT = { float32: { max: 3.4e38, tiny: 1.4e-45, lnMax: 88.7 }, float16: { max: 65504, tiny: 6e-8, lnMax: 11.09 } };
const X0 = -2.0, DXC = 0.95, CEIL = 2.2;

export default {
  slug: 'numerical-stability',
  title: 'Numbers that overflow',
  description: 'Softmax turns a model\'s scores into chances by raising e to each score. Push the scores up and the columns burst through the ceiling of what a float can hold: infinity, then NaN. Subtract the largest score first and every column fits.',
  overview: 'Computers store numbers in a fixed number of bits, so there is a largest number and a smallest one. Softmax, used at the end of nearly every classifier and language model, computes e to the power of each score, and e grows so fast that a score of 89 already overflows a 32-bit float (and 12 overflows a 16-bit one). The fix is simple and exact: subtract the largest score from all of them first. The chances don\'t change, and no column ever goes through the roof.',
  keywords: ['numerical stability', 'softmax overflow', 'log sum exp trick', 'float16 underflow', 'nan loss'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 1.1, 0], dir: [0.15, 0.65, 1.45], half: 3, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { base: [2.1, 1.3, 0.6, 0.2, -0.4], scale: 1, shift: true, fmt: 'float32' };
    const scores = () => st.base.map(x => x * st.scale);
    /* ---------- the hall: floor, ceiling glass ---------- */
    const floor = P.box(5.4, 0.1, 1.8, '#F1EEE6', { r: 0.1 }); floor.position.set(0, 0, 0); S.add(floor);
    const ceil = P.box(5.2, 0.05, 1.6, '#BFE6F2', { r: 0.04, m: { opacity: 0.35 }, cast: false }); ceil.material.depthWrite = false; ceil.position.set(0, 0.1 + CEIL, 0); S.add(ceil);
    const ceilT = S.text('', { size: 0.13, weight: 800, color: '#127570', face: 'front', maxW: 3.5 }); ceilT.position.set(0, 0.1 + CEIL + 0.12, 0.81); S.add(ceilT);
    for (const x of [-2.55, 2.55]) { const post = P.box(0.08, CEIL, 0.08, '#8E91A3', { r: 0.01 }); post.position.set(x, 0.1, 0.75); S.add(post); }
    /* ---------- five columns ---------- */
    const cols = WORDS.map((w, i) => {
      const x = X0 + i * DXC, m = new THREE.MeshLambertMaterial({ color: COLS[i] });
      const b = P.box(0.5, 1, 0.5, COLS[i], { r: 0.04, material: m }); b.position.set(x, 0.1, -0.1); b.userData.noFit = true; S.add(b);
      const burst = P.ball(0.18, C.red); burst.userData.noFit = true; S.add(burst);
      const name = S.text(w, { size: 0.12, face: 'front', weight: 800, color: '#151827', maxW: 0.8 }); name.position.set(x, 0.05, 0.905); S.add(name);
      const top = S.text('', { size: 0.12, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 0.95, font: '"JetBrains Mono", monospace' }); top.userData.noFit = true; S.add(top);
      const pc = P.tile('', 0.86, 0.08, 0.62, '#FFFFFF', { size: 0.2 }); pc.position.set(x, 0.1, 0.5); S.add(pc);
      return { b, m, burst, top, pc, x };
    });
    // a float can only hold so much: e^x above the ceiling is infinity, below the floor it rounds to 0
    const F = () => FMT[st.fmt];
    const ex = x => { const v = Math.exp(x); if (x > F().lnMax || !Number.isFinite(v)) return Infinity; return v < F().tiny ? 0 : v; };
    function compute() {
      const s = scores(), m = st.shift ? Math.max(...s) : 0, e = s.map(x => ex(x - m)), sum = e.reduce((a, b) => a + b, 0);
      const p = e.map(v => (Number.isFinite(sum) && sum > 0 ? v / sum : (v === Infinity && sum === Infinity ? NaN : sum === 0 ? NaN : v / sum)));
      return { s, e, sum, p };
    }
    // column height: log scale between "1 in a billion" and the ceiling of the format
    const hOf = v => { if (v === Infinity) return CEIL + 0.6; if (v <= 0) return 0.02; const L = Math.log(v), lo = Math.log(1e-9); return Math.max(0.02, Math.min(CEIL - 0.02, (L - lo) / (F().lnMax - lo) * CEIL)); };
    function update(dt, t) {
      const { s, e, p } = compute();
      cols.forEach((c, i) => {
        const h = hOf(e[i]), inf = e[i] === Infinity, zero = e[i] === 0;
        c.b.scale.y = h; c.m.color.set(inf ? C.red : zero ? '#B9B6AE' : COLS[i]);
        c.burst.visible = inf; c.burst.position.set(c.x, 0.1 + CEIL + 0.25 + Math.abs(Math.sin(t * 5 + i)) * 0.12, -0.1);
        c.top.position.set(c.x, 0.1 + Math.min(h, CEIL) + (inf ? 0.75 : 0.2), -0.1);
        c.top.userData.set(inf ? 'inf' : zero ? '0.0' : e[i] >= 1e4 || e[i] < 1e-3 ? e[i].toExponential(1) : e[i].toFixed(e[i] < 10 ? 2 : 0));
        const pp = p[i];
        c.pc.userData.label.userData.set(`${WORDS[i]}\n${Number.isNaN(pp) ? 'NaN' : `${Math.round(pp * 100)}%`}`);
        c.pc.userData.body.material = P.mat(Number.isNaN(pp) ? '#FBD9D3' : '#FFFFFF');
      });
      ceilT.userData.set(`the largest ${st.fmt}: ${st.fmt === 'float32' ? '3.4 × 10^38' : '65,504'}`);
    }
    const controls = [
      { type: 'slider', label: 'Scale the scores', min: 0.5, max: 60, log: true, get: () => st.scale, set: v => { st.scale = v; }, fmt: v => `× ${v.toFixed(v < 10 ? 1 : 0)}`, hint: 'Bigger scores mean a more confident model' },
      { type: 'toggle', label: 'Subtract the largest score first', short: 'Shift', get: () => st.shift, set: v => { st.shift = v; } },
      { type: 'buttons', label: 'Number format', options: ['float32', 'float16'], get: () => st.fmt === 'float32' ? 0 : 1, act: i => { st.fmt = i ? 'float16' : 'float32'; } },
      { type: 'button', label: 'Make all scores very negative', short: 'All negative', act: () => { st.base = [-2.1, -2.4, -2.7, -3.0, -3.3]; st.scale = 10; }, quick: false },
    ];
    const ok = () => compute().p.every(Number.isFinite);
    const readouts = [
      { label: 'Top score', get: () => ({ v: Math.max(...scores()).toFixed(1) }) },
      { label: 'Chances add up to', get: () => { const p = compute().p; return ok() ? { v: `${Math.round(p.reduce((a, b) => a + b, 0) * 100)}%`, good: true } : { v: 'NaN', bad: true }; } },
    ];
    const labels = [
      { name: 'scores', t: 'e to each score', d: 'Columns on a log scale: they grow fast', icon: 'wave', atV: V(X0 - 0.25, 0.4, -0.35) },
      { name: 'ceiling', t: 'The largest number', d: 'Above this a float becomes infinity', icon: 'info', atV: V(2.6, 0.1 + CEIL, -0.8 + 0.0) },
      { name: 'chances', t: 'The chances', d: 'Each column ÷ the sum of all', icon: 'check', atV: V(X0 - 0.39, 0.14, 0.73) },
      { name: 'floor', t: 'The smallest number', d: 'Below it a float rounds to 0', icon: 'target', atV: V(2.6, 0.1, 0.8) },
    ];
    const reset = () => { Object.assign(st, { base: [2.1, 1.3, 0.6, 0.2, -0.4], scale: 1, shift: true, fmt: 'float32' }); };
    const breaks = [
      { label: 'Big scores, no shift', hint: 'Scores up to 95', on: () => { reset(); st.scale = 45; st.shift = false; }, off: reset },
      { label: 'Very negative scores in float16', hint: 'No shift', on: () => { reset(); st.base = [-2.1, -2.4, -2.7, -3.0, -3.3]; st.scale = 10; st.fmt = 'float16'; st.shift = false; }, off: reset },
    ];
    function status() {
      const { e, sum, p } = compute(), top = Math.max(...scores());
      if (!ok() && e.some(v => v === Infinity)) return { ok: false, msg: `<b>Overflow, then NaN.</b> e to ${top.toFixed(0)} is bigger than the largest ${st.fmt} (${st.fmt === 'float32' ? 'about 3.4 × 10^38' : '65,504'}), so it became infinity, and infinity ÷ infinity is NaN. One NaN and the whole loss is NaN. Subtract the largest score first: the chances are identical, and the biggest column is exactly 1.` };
      if (!ok() && sum === 0) return { ok: false, msg: `<b>Underflow: 0 ÷ 0.</b> Every score is around −21 to −33, and e to those is smaller than the tiniest ${st.fmt} can hold, so every column rounded to 0. The sum is 0, and 0 ÷ 0 is NaN. The same shift fixes it: subtract the largest score and the top column becomes exactly 1.` };
      if (!st.shift && top > F().lnMax * 0.7) return { msg: `<b>Getting close to the ceiling.</b> e to ${top.toFixed(0)} is ${ex(top).toExponential(1)}; a little more and it overflows.` };
      return { ok: true, msg: `<b>Chances: ${p.map((x, i) => `${WORDS[i]} ${Math.round(x * 100)}%`).join(', ')}.</b> ${st.shift ? 'The scores were shifted so the largest is 0: its column is exactly 1 and every other is smaller, so nothing can overflow, at any scale.' : 'No shift, but the scores are small enough for now.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'Scores into chances', home: true, say: 'A model gives each dish a score. Softmax turns the scores into chances: raise e to each score, then divide by the total. Here jollof leads.', act: m => m.reset() },
    { t: 'e grows fast', focus: 'scores', zoom: 1.35, say: 'e to a score grows terribly fast. Each step of one in the score multiplies the column by almost three. The columns are drawn on a log scale, or they would not fit on the screen.', act: m => m.set({ scale: 8 }) },
    { t: 'The ceiling', focus: 'ceiling', zoom: 1.4, say: 'A thirty-two bit float can hold numbers up to about three times ten to the thirty-eight. That is the glass ceiling. Nothing can go above it.' },
    { t: 'Overflow', home: true, say: 'Raise the scores past eighty-nine and the first column bursts through: infinity. Infinity divided by infinity is not a number, NaN, and the model\'s loss is ruined.', act: m => m.set({ scale: 45, shift: false }), wait: 5 },
    { t: 'The shift', home: true, say: 'The fix: subtract the largest score from every score first. The chances come out exactly the same, but now the biggest column is one, and nothing can overflow.', act: m => m.set({ shift: true }), wait: 5 },
    { t: 'Smaller floats', home: true, say: 'Sixteen bit floats save memory but have a much lower ceiling, and a much higher floor. Without the shift, very small columns round to zero. With it, softmax is safe in any format.', act: m => m.set({ fmt: 'float16' }), wait: 5 },
  ],
  check: [
    { q: 'Why does softmax overflow with big scores?', options: ['e to a large score is bigger than the largest number a float can hold', 'The scores are negative', 'Division is slow'], answer: 0, why: 'e to 89 already exceeds the largest 32-bit float, so it becomes infinity.' },
    { q: 'What does subtracting the largest score do to the final chances?', options: ['Nothing: they come out exactly the same', 'Makes them all equal', 'Makes them negative'], answer: 0, why: 'It divides top and bottom by the same number, so the ratios are unchanged.' },
    { q: 'What is inf ÷ inf?', options: ['1', 'NaN', 'Infinity'], answer: 1, why: 'It has no defined value, so it becomes NaN, and NaN spreads to every sum it touches.' },
  ],
  terms: [
    ['Floating point', 'How computers store real numbers: a fixed number of bits, so limited range and precision.'],
    ['Overflow', 'A result too big for the format, which becomes infinity.'],
    ['Underflow', 'A result too close to zero for the format, which rounds to 0.'],
    ['Softmax', 'e to each score, divided by the sum: turns scores into chances that add up to 1.'],
    ['Log-sum-exp trick', 'Subtracting the largest value before exponentiating, so the sum never overflows.'],
  ],
  deeper: '<p><b>Mixed precision.</b> Training in 16-bit floats halves memory and speeds up the graphics card, but the small range bites. Loss scaling multiplies the loss up before the backward pass, so tiny gradients don\'t underflow to zero, then divides it back down.</p><p><b>bfloat16</b> keeps the same range as float32 with less precision, which is why it is popular for training: overflow almost never happens.</p><p><b>Log-softmax.</b> Cross-entropy only needs the log of the chances, and computing log-softmax directly (with the same shift) is both faster and safer than taking the log of a softmax.</p>',
  code: {
    title: 'Softmax, unsafe and safe',
    note: 'Adapted from the course\'s numerical-stability lesson.',
    text: `
import numpy as np

def softmax_unsafe(x):
    e = np.exp(x)
    return e / e.sum()

def softmax(x):
    e = np.exp(x - x.max())        # the largest becomes e^0 = 1
    return e / e.sum()

scores = np.array([2.1, 1.3, 0.6, 0.2, -0.4], dtype=np.float32)
print(softmax_unsafe(scores * 45))   # [nan, nan, ...]: overflow
print(softmax(scores * 45))          # fine

def log_softmax(x):
    m = x.max()
    return x - m - np.log(np.exp(x - m).sum())   # the log-sum-exp trick
`,
  },
};
