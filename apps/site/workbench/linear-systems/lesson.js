// Linear systems: two market receipts, two unknown prices. Each receipt is a line of (rice price, beans price) pairs that fit it;
// where the lines cross is the answer. Elimination tilts one line flat; a third, slightly wrong receipt needs the best fit (least squares).
// Break it: two receipts that say the same thing twice (parallel lines), two nearly alike (a small rounding swings the answer), three that disagree.
const PR = 3, PB = 2;                 // the true prices, in US dollars before conversion
const XR = 6, ZR = 5, SX = 0.85, SZ = 0.85;
const W = (r, b, y = 0.13) => ({ x: (r - XR / 2) * SX, y, z: -(b - ZR / 2) * SZ });

export default {
  slug: 'linear-systems',
  title: 'Linear systems: two receipts, two prices',
  description: 'Two market receipts, two unknown prices. Each receipt becomes a line of prices that fit it, and where the lines cross is the answer. Eliminate to solve it, then try receipts that repeat themselves, nearly repeat, or disagree.',
  overview: 'A linear system is a set of equations that must all hold at once. "Two bags of rice and one of beans cost this much; one of rice and three of beans cost that much" is two equations in two unknowns. Each equation is a line of possible prices, and the answer is where the lines cross. Elimination solves it step by step. When the equations repeat themselves there is no single answer, when they nearly repeat the answer is shaky, and when there are more equations than unknowns you look for the best fit: least squares, the heart of linear regression.',
  keywords: ['linear system of equations', 'gaussian elimination', 'least squares', 'ill conditioned matrix', 'solve ax=b'],
  orient: 'any',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.3, 0.1], dir: [0.15, 1.5, 0.95], half: 3, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    // each receipt: rice bags, bean bags, total paid (US dollars)
    const st = { rec: [[2, 1], [1, 3]], third: false, elim: 0, near: false, noise: 0, mode: 'normal', u: 1 };
    const total = (a, b, k = 0) => a * PR + b * PB + (k === 2 ? 0.9 : 0) + (st.near && k === 1 ? st.noise : 0);
    const receipts = () => { const R = st.rec.map(([a, b], k) => [a, b, total(a, b, k)]); if (st.third) R.push([1, 1, total(1, 1, 2)]); return R; };
    /* ---------- the board ---------- */
    const board = P.box(XR * SX + 1.1, 0.1, ZR * SZ + 1.1, '#FBF8F1', { r: 0.1 }); board.position.set(-0.15, 0, 0.15); S.add(board);
    for (let r = 0; r <= XR; r++) { const a = W(r, 0, 0.105), b = W(r, ZR, 0.105), rd = P.rod(V(a.x, a.y, a.z), V(b.x, b.y, b.z), r ? 0.005 : 0.012, '#C9C4B6'); rd.layers.set(1); S.add(rd); }
    for (let b = 0; b <= ZR; b++) { const a = W(0, b, 0.105), c = W(XR, b, 0.105), rd = P.rod(V(a.x, a.y, a.z), V(c.x, c.y, c.z), b ? 0.005 : 0.012, '#C9C4B6'); rd.layers.set(1); S.add(rd); }
    const axR = S.text('price of a bag of rice →', { color: '#151827', size: 0.2, weight: 750, maxW: 4 }); { const p = W(XR / 2, -0.5, 0.105); axR.position.set(p.x, p.y, p.z); } S.add(axR);
    const axB = S.text('price of a bag of beans →', { color: '#151827', size: 0.2, weight: 750, maxW: 4 }); { const p = W(-0.45, ZR / 2, 0.105); axB.position.set(p.x, p.y, p.z); axB.rotation.z = Math.PI / 2; } S.add(axB);
    const tick = [];
    for (let r = 1; r <= XR; r += 1) { const t = S.text('', { color: '#151827', size: 0.14, weight: 700, maxW: 0.8 }); const p = W(r, -0.2, 0.105); t.position.set(p.x, p.y, p.z); S.add(t); tick.push({ t, v: r }); }
    /* ---------- the receipt lines ---------- */
    const COLS = [C.teal, C.coral, C.plum];
    const lines = COLS.map(c => { const r = P.rod(V(), V(0, 1, 0), 0.035, c); r.userData.noFit = true; S.add(r); return r; });
    const chips = COLS.map(c => { const t = S.text('', { size: 0.16, weight: 800, color: '#FFFFFF', bg: c, face: 'cam', top: true, maxW: 3.2 }); t.userData.noFit = true; S.add(t); return t; });
    const dot = P.ball(0.11, C.gold); dot.userData.noFit = true; S.add(dot);
    const dropR = P.rod(V(), V(0, 1, 0), 0.012, '#8E91A3'), dropB = P.rod(V(), V(0, 1, 0), 0.012, '#8E91A3'); [dropR, dropB].forEach(r => { r.userData.noFit = true; S.add(r); });
    // the end points of a line a·r + b·bean = c inside the board
    function ends(a, b, c) {
      const pts = [];
      if (Math.abs(b) > 1e-9) for (const r of [0, XR]) { const y = (c - a * r) / b; if (y >= -1e-9 && y <= ZR + 1e-9) pts.push([r, y]); }
      if (Math.abs(a) > 1e-9) for (const y of [0, ZR]) { const r = (c - b * y) / a; if (r >= -1e-9 && r <= XR + 1e-9) pts.push([r, y]); }
      return pts.length >= 2 ? [pts[0], pts.find(p => Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]) > 1e-6) || pts[1]] : null;
    }
    // least squares: the normal equations AᵀA x = Aᵀc
    function solve(R) {
      let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
      for (const [a, b, c] of R) { a11 += a * a; a12 += a * b; a22 += b * b; b1 += a * c; b2 += b * c; }
      const det = a11 * a22 - a12 * a12;
      if (Math.abs(det) < 1e-9) return null;
      return [(b1 * a22 - b2 * a12) / det, (a11 * b2 - a12 * b1) / det, det];
    }
    const nice = v => S.money.of(v);
    function draw() {
      const R = receipts();
      // elimination: subtract (a2/a1) × receipt 1 from receipt 2, so rice drops out of it
      const e = st.elim;
      const show = R.map((q, k) => k === 1 && e > 0 ? q.map((v, i) => v - e * (R[1][0] / R[0][0]) * R[0][i]) : q);
      lines.forEach((ln, k) => {
        const q = show[k]; ln.visible = !!q;
        if (!q) { chips[k].visible = false; return; }
        const E = ends(...q); ln.visible = !!E; chips[k].visible = !!E;
        if (!E) return;
        const p0 = W(...E[0], 0.15 + k * 0.01), p1 = W(...E[1], 0.15 + k * 0.01);
        P.setRod(ln, V(p0.x, p0.y, p0.z), V(p1.x, p1.y, p1.z));
        const top = E[0][1] > E[1][1] ? E[0] : E[1], pc = W(top[0], top[1], 0.5);
        chips[k].position.set(pc.x, pc.y, pc.z);
        const [a, b, c] = q, fa = x => Math.abs(x) < 1e-9 ? '' : `${+x.toFixed(2)} rice`, fb = x => Math.abs(x) < 1e-9 ? '' : `${+x.toFixed(2)} beans`;
        chips[k].userData.set(`${[fa(a), fb(b)].filter(Boolean).join(' + ')} = ${nice(c)}`);
      });
      const s = solve(R);
      dot.visible = !!s; dropR.visible = dropB.visible = !!s;
      if (s) {
        const p = W(Math.max(0, Math.min(XR, s[0])), Math.max(0, Math.min(ZR, s[1])), 0.2);
        dot.position.set(p.x, p.y, p.z);
        const a = W(s[0], 0, 0.14), b = W(0, s[1], 0.14);
        P.setRod(dropR, V(p.x, 0.14, p.z), V(a.x, a.y, a.z)); P.setRod(dropB, V(p.x, 0.14, p.z), V(b.x, b.y, b.z));
      }
      tick.forEach(t => t.t.userData.set(nice(t.v)));
      st.sol = s;
    }
    draw();
    function eliminate() { st.elimT = 0; }
    function update(dt) { if (st.elimT != null) { st.elimT += dt * (S.reduced ? 4 : 0.8); st.elim = Math.min(1, st.elimT); draw(); if (st.elimT >= 1) st.elimT = null; } }
    const controls = [
      { type: 'button', label: 'Eliminate rice from receipt 2', short: 'Eliminate', act: () => { st.elim = 0; eliminate(); } },
      { type: 'slider', label: 'Receipt 2: bags of rice', min: 0, max: 4, step: 0.05, get: () => st.rec[1][0], set: v => { st.rec[1][0] = v; st.elim = 0; draw(); } },
      { type: 'toggle', label: 'A third receipt (slightly wrong)', short: 'Third receipt', get: () => st.third, set: v => { st.third = v; st.elim = 0; draw(); } },
    ];
    const readouts = [
      { label: 'Rice, a bag', get: () => ({ v: st.sol ? nice(st.sol[0]) : '—', good: st.sol && Math.abs(st.sol[0] - PR) < 0.05 }) },
      { label: 'Beans, a bag', get: () => ({ v: st.sol ? nice(st.sol[1]) : '—', good: st.sol && Math.abs(st.sol[1] - PB) < 0.05 }) },
      { label: 'How shaky', get: () => { if (!st.sol) return { v: 'no single answer', bad: true }; const k = 1 / Math.max(1e-6, Math.abs(st.sol[2])); return { v: k > 0.5 ? 'very' : k > 0.08 ? 'a little' : 'steady', bad: k > 0.5, good: k < 0.08 }; } },
    ];
    const labels = [
      { name: 'r1', t: 'Receipt 1 as a line', d: 'Every pair of prices that fits it', icon: 'link', atV: (() => { const p = W(0, 5, 0.15); return V(p.x, p.y, p.z); })() },
      { name: 'r2', t: 'Receipt 2 as a line', d: 'A different mix of bags', icon: 'link', atV: (() => { const p = W(6, 1, 0.15); return V(p.x, p.y, p.z); })() },
      { name: 'answer', t: 'Where they cross', d: 'The one pair of prices that fits both', icon: 'target', at: () => dot.position.clone() },
      { name: 'axes', t: 'Read off the prices', d: 'Rice across, beans up', icon: 'scale', atV: (() => { const p = W(0, 0, 0.12); return V(p.x, p.y, p.z); })() },
    ];
    const reset = () => { Object.assign(st, { rec: [[2, 1], [1, 3]], third: false, elim: 0, near: false, noise: 0 }); draw(); };
    const breaks = [
      { label: 'The second receipt repeats the first', hint: '4 rice + 2 beans: just double', on: () => { reset(); st.rec[1] = [4, 2]; draw(); }, off: reset },
      { label: 'Two receipts that are nearly the same', hint: 'And one total rounded a little', on: () => { reset(); st.rec[1] = [2.1, 1.1]; st.near = true; st.noise = 0.3; draw(); }, off: reset },
      { label: 'Three receipts that disagree', hint: 'The third one is a little off', on: () => { reset(); st.third = true; draw(); }, off: reset },
    ];
    function status() {
      const s = st.sol;
      if (!s) return { ok: false, msg: `<b>No single answer.</b> Receipt 2 is just receipt 1 doubled, so the two lines lie on top of each other: every point on them fits both. Two receipts, but only one piece of information. You need a receipt with a genuinely different mix of bags.` };
      if (st.near) return { ok: false, msg: `<b>A shaky answer.</b> The two receipts are almost the same mix, so the lines cross at a very shallow angle. A small rounding on one total slid the crossing to rice at ${nice(s[0])} and beans at ${nice(s[1])}, far from the truth. In matrix terms the system is ill-conditioned; its determinant is tiny.` };
      if (st.third) return { ok: false, msg: `<b>Three receipts, no point on all three lines.</b> The third total is a little off, so the lines make a small triangle. Least squares picks the prices that miss all three totals by the least overall: rice ${nice(s[0])}, beans ${nice(s[1])}. Linear regression does exactly this with thousands of rows.` };
      if (st.elimT != null || st.elim > 0) return { msg: `<b>Elimination.</b> Take receipt 2 and subtract ${+(st.rec[1][0] / st.rec[0][0]).toFixed(2)} times receipt 1. Rice drops out, so receipt 2's line turns flat: it now fixes the price of beans alone (${nice(s[1])}). Put that back into receipt 1 to get rice (${nice(s[0])}).` };
      return { ok: true, msg: `<b>Rice ${nice(s[0])} a bag, beans ${nice(s[1])} a bag.</b> The only pair of prices that fits both receipts sits where the two lines cross.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, eliminate: () => { st.elim = 0; eliminate(); }, set: p => { Object.assign(st, p); draw(); }, currency: draw };
  },

  story: [
    { t: 'Two receipts', home: true, say: 'At the market, two bags of rice and one of beans cost one total. One bag of rice and three of beans cost another. What does each bag cost?', act: m => m.reset() },
    { t: 'A receipt is a line', focus: 'r1', zoom: 1.3, say: 'Many pairs of prices would fit the first receipt: cheap rice with dear beans, or the other way round. Together they make a straight line.' },
    { t: 'Where they cross', focus: 'answer', zoom: 1.4, say: 'The second receipt is another line. Only one pair of prices fits both: the point where the lines cross. Read the prices off the edges.' },
    { t: 'Elimination', home: true, say: 'To solve it by hand, subtract half of the first receipt from the second. Rice drops out, the second line turns flat, and it gives the price of beans on its own.', act: m => m.eliminate(), wait: 6 },
    { t: 'Saying the same thing twice', home: true, say: 'If the second receipt were just the first one doubled, the lines would lie on top of each other. Two receipts, one piece of information, and no single answer.', act: m => m.set({ rec: [[2, 1], [4, 2]], elim: 0 }), wait: 5 },
    { t: 'More receipts than prices', home: true, say: 'With three receipts and one a little off, no point lies on every line. The best fit, least squares, misses them all by the least. That is linear regression.', act: m => m.set({ rec: [[2, 1], [1, 3]], third: true, elim: 0 }), wait: 5 },
  ],
  check: [
    { q: 'On the board, what is the answer to two equations in two unknowns?', options: ['The point where the two lines cross', 'The steeper line', 'The middle of the board'], answer: 0, why: 'Each line is everything that fits one equation; only the crossing fits both.' },
    { q: 'The second equation is the first one doubled. What happens?', options: ['There is exactly one answer', 'The lines coincide: no single answer', 'The answer doubles'], answer: 1, why: 'It adds no new information, so infinitely many answers fit.' },
    { q: 'Three equations, two unknowns, and they don\'t all agree. What do you do?', options: ['Give up', 'Find the least-squares best fit', 'Delete one equation at random'], answer: 1, why: 'Least squares finds the values that miss every equation by the least overall.' },
  ],
  terms: [
    ['Linear system', 'Several linear equations that must hold at the same time, written Ax = b.'],
    ['Elimination', 'Subtracting multiples of one equation from another until each has fewer unknowns.'],
    ['Singular', 'A system whose equations repeat each other, so there is no single answer (determinant 0).'],
    ['Ill-conditioned', 'Nearly singular: tiny changes in the data move the answer a lot.'],
    ['Least squares', 'With more equations than unknowns, the answer that minimises the total squared miss.'],
  ],
  deeper: '<p><b>In matrix form</b> the receipts are A = [[2, 1], [1, 3]], the unknown prices x, and the totals b. Solving Ax = b by elimination is what <code>np.linalg.solve</code> does, with clever row swaps for safety.</p><p><b>Condition number.</b> How much errors in b are magnified in x. Shallow crossings mean a large condition number. Adding a little to the diagonal (ridge regression) makes shaky systems steady.</p><p><b>Never invert to solve.</b> Computing A⁻¹ and multiplying is slower and less accurate than solving directly.</p>',
  code: {
    title: 'Solve the receipts',
    note: 'Adapted from the course\'s linear-systems lesson.',
    text: `
import numpy as np

A = np.array([[2.0, 1.0],     # 2 rice + 1 beans
              [1.0, 3.0]])    # 1 rice + 3 beans
totals = np.array([8.0, 9.0])

print(np.linalg.solve(A, totals))    # [3. 2.]: rice 3, beans 2

# three receipts that don't quite agree: least squares
A3 = np.vstack([A, [1.0, 1.0]])
t3 = np.append(totals, 5.9)
prices, *_ = np.linalg.lstsq(A3, t3, rcond=None)
print(prices)

print(np.linalg.cond(np.array([[2, 1], [2.1, 1.1]])))   # large: shaky
`,
  },
};
