// Calculus for ML: a loss curve over one weight, a ball at the current weight, the tangent line (the derivative) and a secant
// that estimates it by nudging the weight by h. Shrink h and the secant becomes the tangent.
// Break it: an h so big the estimate is wrong, an h so small rounding ruins it, and a kink where there is no single slope.
const K = 2.3;                                     // where the kink is
// the bottom of this loss is a kink, like |x| or ReLU
const f = w => 0.2 * (w - 1.8) ** 2 + 0.35 * Math.abs(w - K) + 0.15;
const df = w => 0.4 * (w - 1.8) + 0.35 * Math.sign(w - K);
const SY = 0.62, X = w => (w - 1) * 1.25, Y = v => 0.25 + v * SY;   // weight → scene x, loss → scene y
const W0 = -1.4, W1 = 3.4;

export default {
  slug: 'derivatives',
  title: 'Derivatives: the slope that teaches',
  description: 'Put a ball on a loss curve and draw the line that just touches it: its slope is the derivative. Estimate it by nudging the weight a little, then nudge too much, too little, and onto a kink.',
  overview: 'Every model learns by asking one question about each of its numbers: if I nudge this weight a little, does the loss go up or down, and how fast? That rate is the derivative, the slope of the line that just touches the loss curve. You can estimate it by nudging for real: move the weight by a tiny h and divide the change in loss by h. Too big an h gives the wrong slope; too tiny an h drowns in rounding error.',
  keywords: ['derivative intuition', 'calculus for machine learning', 'finite difference', 'tangent line slope', 'numerical derivative'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 1.3, 0], dir: [0.15, 0.4, 1.5], half: 3.1, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { w: 0.1, h: 0.5, f32: false };
    /* ---------- the board and the curve ---------- */
    const board = P.box(X(W1) - X(W0) + 0.6, 2.75, 0.1, '#FBF8F1', { r: 0.04 }); board.position.set((X(W0) + X(W1)) / 2, 0, -0.12); S.add(board);
    for (let k = 1; k < 6; k++) { const r = P.rod(V(X(W0), Y(k * 0.6), -0.06), V(X(W1), Y(k * 0.6), -0.06), 0.005, '#D8D4C8'); r.layers.set(1); S.add(r); }
    const pts = []; for (let i = 0; i <= 160; i++) { const w = W0 + (W1 - W0) * i / 160; pts.push(V(X(w), Y(f(w)), 0)); }
    S.add(P.tube(pts, 0.035, C.clay, { seg: 320 }));
    const axX = S.text('the weight w →', { color: '#151827', size: 0.15, face: 'front', weight: 750, maxW: 2.4 }); axX.position.set(X(W1) - 0.9, 0.12, -0.06); S.add(axX);
    const axY = S.text('loss ↑', { color: '#151827', size: 0.15, face: 'front', weight: 750, maxW: 1 }); axY.position.set(X(W0) + 0.4, 2.55, -0.06); S.add(axY);
    /* ---------- the ball, the tangent and the secant ---------- */
    const ball = P.ball(0.11, C.gold); ball.userData.noFit = true; S.add(ball);
    const nudge = P.ball(0.08, C.teal); nudge.userData.noFit = true; S.add(nudge);
    const tan = P.rod(V(), V(0, 1, 0), 0.022, C.ink); tan.userData.noFit = true; S.add(tan);
    const sec = P.rod(V(), V(0, 1, 0), 0.02, C.teal); sec.userData.noFit = true; S.add(sec);
    const runR = P.rod(V(), V(0, 1, 0), 0.012, '#8E91A3'), riseR = P.rod(V(), V(0, 1, 0), 0.012, '#8E91A3'); [runR, riseR].forEach(r => { r.userData.noFit = true; S.add(r); });
    const hT = S.text('h', { size: 0.14, weight: 800, color: '#127570', face: 'cam', top: true }); hT.userData.noFit = true; S.add(hT);
    const kinkM = P.ball(0.06, C.red); kinkM.position.set(X(K), Y(f(K)), 0.02); S.add(kinkM);
    // the slope estimate: nudge by h and see how much the loss moves (optionally with float32 rounding)
    const r32 = x => st.f32 ? Math.fround(x) : x;
    const est = () => { const a = r32(f(r32(st.w))), b = r32(f(r32(st.w + st.h))); return r32(r32(b - a) / st.h); };
    const atKink = () => Math.abs(st.w - K) < 0.03;
    function draw() {
      const w = st.w, y = f(w), p = V(X(w), Y(y), 0.03), s = df(w) * SY / 1.25;     // slope in scene units
      ball.position.copy(p);
      const L = 1.1, d = V(1, s, 0).normalize().multiplyScalar(L);
      tan.visible = !atKink();
      P.setRod(tan, p.clone().sub(d), p.clone().add(d));
      const wh = Math.min(W1, w + Math.max(st.h, 0.0015)), q = V(X(wh), Y(f(wh)), 0.03);
      nudge.position.copy(q); nudge.visible = st.h > 0.004;
      // the secant through both points, drawn a little past each
      const e = est() * SY / 1.25, sd = V(1, Number.isFinite(e) ? Math.max(-6, Math.min(6, e)) : 0, 0).normalize().multiplyScalar(L);
      P.setRod(sec, p.clone().sub(sd), p.clone().add(sd));
      P.setRod(runR, V(p.x, p.y, 0.04), V(q.x, p.y, 0.04)); P.setRod(riseR, V(q.x, p.y, 0.04), V(q.x, q.y, 0.04));
      runR.visible = riseR.visible = hT.visible = st.h > 0.05;
      hT.position.set((p.x + q.x) / 2, p.y - 0.18, 0.05);
    }
    draw();
    const controls = [
      { type: 'slider', label: 'The weight w', min: W0 + 0.2, max: W1 - 0.4, step: 0.01, get: () => st.w, set: v => { st.w = v; draw(); } },
      { type: 'slider', label: 'The nudge h', min: 1e-13, max: 1.2, log: true, get: () => st.h, set: v => { st.h = v; draw(); }, fmt: v => v >= 0.01 ? v.toFixed(2) : v.toExponential(0) },
      { type: 'toggle', label: 'Compute in float32', short: 'float32', get: () => st.f32, set: v => { st.f32 = v; draw(); }, hint: 'Seven digits, as on most GPUs' },
      { type: 'button', label: 'Move to the kink', short: 'The kink', act: () => { st.w = K; draw(); }, quick: false },
    ];
    const err = () => Math.abs(est() - df(st.w));
    const readouts = [
      { label: 'Estimate (nudge)', get: () => ({ v: Number.isFinite(est()) ? est().toFixed(4) : 'NaN', bad: err() > 0.05 }) },
      { label: 'True slope', get: () => ({ v: atKink() ? 'none (a kink)' : df(st.w).toFixed(4), sub: `off by ${err().toExponential(1)}`, good: err() < 1e-3 && !atKink() }) },
    ];
    const labels = [
      { name: 'ball', t: 'The current weight', d: 'And the loss it gives', icon: 'target', at: () => ball.position.clone().add(V(0, 0.11, 0)) },
      { name: 'tangent', t: 'The tangent line', d: 'Its slope is the derivative', icon: 'spark', at: () => { const s = df(st.w) * SY / 1.25, d = V(1, s, 0).normalize().multiplyScalar(1.1); return ball.position.clone().sub(d); }, hide: () => atKink() },
      { name: 'curve', t: 'The loss curve', d: 'Loss for every value of one weight', icon: 'wave', atV: V(X(W1), Y(f(W1)), 0) },
      { name: 'kink', t: 'A kink', d: 'Two slopes meet here', icon: 'info', atV: V(X(K), Y(f(K)) - 0.06, 0.02) },
    ];
    const reset = () => { Object.assign(st, { w: 0.1, h: 0.5, f32: false }); draw(); };
    const breaks = [
      { label: 'Nudge far too much', hint: 'h = 1.2', on: () => { reset(); st.w = 1.4; st.h = 1.2; draw(); }, off: reset },
      { label: 'Nudge far too little', hint: 'h = 1e-10 in float32', on: () => { reset(); st.w = 1.4; st.h = 1e-10; st.f32 = true; draw(); }, off: reset },
      { label: 'Stand on the kink', hint: 'Where |w − 2.3| bends', on: () => { reset(); st.w = K; st.h = 0.001; draw(); }, off: reset },
    ];
    function status() {
      const e = est(), t = df(st.w);
      if (atKink()) return { ok: false, msg: `<b>No single slope here.</b> Just left of it the curve falls (slope ${(df(K - 0.01)).toFixed(2)}); just right of it, it climbs (slope ${(df(K + 0.01)).toFixed(2)}). The nudge only sees the right side (${e.toFixed(2)}). ReLU has exactly this kink at zero, and frameworks simply pick one side's slope.` };
      if (st.f32 && st.h < 1e-5) return { ok: false, msg: `<b>Rounding swamps the nudge.</b> In float32 a number keeps about seven digits, so w + h rounds back to w, the change in loss comes out as 0 (or a few rounding crumbs), and dividing by a tiny h gives ${Number.isFinite(e) ? e.toFixed(3) : 'nonsense'}. The true slope is ${t.toFixed(3)}. Keep h around 0.001, or let autodiff compute it exactly.` };
      if (st.h > 0.6) return { ok: false, msg: `<b>Too big a nudge.</b> With h = ${st.h.toFixed(2)} the second point is far along a curving line, so the straight line through both (teal) tilts away from the tangent: estimate ${e.toFixed(3)} against the true ${t.toFixed(3)}. Shrink h.` };
      if (err() < 1e-3) return { ok: true, msg: `<b>The secant has become the tangent.</b> A nudge of ${st.h < 0.01 ? st.h.toExponential(0) : st.h.toFixed(3)} gives ${e.toFixed(4)}, the true slope is ${t.toFixed(4)}. ${t < 0 ? 'Negative: increasing w lowers the loss, so learning will push w up.' : 'Positive: increasing w raises the loss, so learning will push w down.'}` };
      return { msg: `<b>Slope estimate ${e.toFixed(3)}</b>, true slope ${t.toFixed(3)}. Shrink the nudge h and the teal line turns onto the black tangent.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A loss curve', home: true, say: 'Here is a model\'s loss as one of its weights changes. The gold ball is where the weight is now.', act: m => m.reset() },
    { t: 'The slope', focus: 'ball', zoom: 1.5, say: 'Draw the line that just touches the curve at the ball. Its slope is the derivative: how fast the loss changes when you nudge the weight.', act: m => m.set({ w: 0.1, h: 0.5 }) },
    { t: 'Nudge and measure', focus: 'ball', zoom: 1.4, say: 'You can estimate the slope by trying it. Move the weight a little, by h, see how much the loss changed, and divide by h. That gives the teal line.', act: m => m.set({ h: 0.5 }) },
    { t: 'Smaller nudges', focus: 'ball', zoom: 1.5, say: 'Make the nudge smaller and smaller. The teal line turns until it lies right on the tangent. That is what a derivative is: the slope you get as the nudge shrinks to nothing.', act: m => m.set({ h: 0.001 }), wait: 5 },
    { t: 'Too small', home: true, say: 'But a computer keeps only so many digits. With a nudge far too small, the weight plus the nudge rounds back to the weight itself, and the estimate is garbage.', act: m => m.set({ w: 1.4, h: 1e-10, f32: true }), wait: 5 },
    { t: 'A kink', focus: 'kink', zoom: 1.5, say: 'This curve\'s lowest point is a kink, and at a kink there is no single slope: one side falls, the other climbs. ReLU, the most common activation, has a kink like this at zero, and libraries simply pick one side.', act: m => m.set({ w: 2.3, h: 0.001, f32: false }) },
  ],
  check: [
    { q: 'What does the derivative tell a model about a weight?', options: ['How fast the loss changes when the weight is nudged', 'The weight\'s final value', 'How many weights there are'], answer: 0, why: 'It is the slope of the loss at the current weight: which way, and how steeply.' },
    { q: 'You estimate a slope by nudging with h = 1.0 on a curvy loss. What goes wrong?', options: ['Nothing', 'The estimate is the slope of a long straight line, not the tangent', 'It rounds to zero'], answer: 1, why: 'A big nudge averages the slope over a long stretch of curve.' },
    { q: 'Why not use h = 0.0000000001 in float32?', options: ['It is too slow', 'Rounding: w + h rounds back to w, so the estimate is garbage', 'h must be negative'], answer: 1, why: 'Float32 keeps about seven digits, so tiny nudges vanish in rounding.' },
  ],
  terms: [
    ['Derivative', 'How fast a function\'s output changes as its input changes: the slope of its curve.'],
    ['Tangent line', 'The straight line that just touches a curve at a point, with the same slope.'],
    ['Finite difference', 'Estimating a slope by nudging: (f(w + h) − f(w)) ÷ h.'],
    ['Partial derivative', 'The slope along one input while all the others stay fixed.'],
    ['Gradient', 'All the partial derivatives together: one slope per weight.'],
  ],
  deeper: '<p><b>Many weights.</b> A model has millions of weights, so the slope becomes the gradient: one partial derivative per weight, each found by nudging that weight alone. Nudging each one separately would take millions of runs, which is why backpropagation computes them all in one backward pass.</p><p><b>Check your gradients.</b> A central difference, (f(w + h) − f(w − h)) ÷ 2h, is far more accurate than a one-sided one. Comparing it with your backprop code catches most bugs.</p><p><b>Rules instead of nudges.</b> Calculus gives exact slopes: the slope of w² is 2w, of a sum is the sum of the slopes, and the chain rule handles functions inside functions.</p>',
  code: {
    title: 'Slopes by nudging',
    note: 'Adapted from the course\'s calculus lesson.',
    text: `
def f(w):
    return 0.32 * (w - 0.6) ** 2 + 0.25

def slope_forward(f, w, h=1e-3):
    return (f(w + h) - f(w)) / h

def slope_central(f, w, h=1e-3):
    # nudge both ways: much more accurate
    return (f(w + h) - f(w - h)) / (2 * h)

w = 1.4
print(0.64 * (w - 0.6))            # exact slope: 0.512
print(slope_forward(f, w, 1.0))    # too big a nudge: 0.832
print(slope_forward(f, w))         # 0.5123
print(slope_central(f, w))         # 0.5120

import numpy as np
w32, h32 = np.float32(w), np.float32(1e-10)
print((f(w32 + h32) - f(w32)) / h32)   # 0.0: w + h rounded back to w
`,
  },
};
