// Complex numbers: an arrow on a plane. Multiplying by w turns the arrow by w's angle and stretches it by w's length.
// Multiply again and again and the tip walks round the unit circle (|w| = 1), spirals out (|w| > 1) or spirals in (|w| < 1).
// Break it: a length a little above 1 (it explodes), forget that i × i = −1 (no turning at all).
const R0 = 1.6;                          // scene units per 1 on the plane
const STEPS = 24;

export default {
  slug: 'complex-numbers',
  title: 'Complex numbers: arrows that turn',
  description: 'A complex number is an arrow on a plane, and multiplying by one turns and stretches it. Multiply again and again and the tip walks round a circle, or spirals away, or spirals in. The same turning drives the Fourier transform and the position code inside transformers.',
  overview: 'A complex number has two parts, written a + bi, and it can be drawn as an arrow. The magic is in multiplying: multiplying by w turns your arrow by w\'s angle and stretches it by w\'s length. A number of length exactly 1 is a pure turn, so multiplying by it again and again walks the tip round a circle. That is why complex numbers describe anything that rotates or repeats: sound waves, the Fourier transform, and the rotary position encoding (RoPE) in modern language models.',
  keywords: ['complex numbers intuition', 'complex multiplication rotation', 'euler formula', 'unit circle', 'rope positional encoding'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.2, 1.45, 1.0], half: 3, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { ang: 30, len: 1, n: 0, wrong: false, play: true, acc: 0 };
    const W = (a, b, y = 0.14) => V(a * R0, y, -b * R0);
    /* ---------- the plane ---------- */
    const board = P.box(6.4, 0.1, 6.0, '#FBF8F1', { r: 0.12 }); S.add(board);
    for (let k = -3; k <= 3; k++) {
      const s = k * 0.5, a = W(s, -1.75, 0.105), b = W(s, 1.75, 0.105), c = W(-1.9, s, 0.105), d = W(1.9, s, 0.105);
      for (const [p, q] of [[a, b], [c, d]]) { const r = P.rod(p, q, k ? 0.005 : 0.014, k ? '#D8D4C8' : '#8E91A3'); r.layers.set(1); S.add(r); }
    }
    const circ = P.tube([...Array(97)].map((_, i) => { const t = i / 96 * Math.PI * 2; return W(Math.cos(t), Math.sin(t), 0.12); }), 0.018, C.gold, { seg: 200 }); S.add(circ);
    const reT = S.text('real →', { color: '#151827', size: 0.15, weight: 750, maxW: 1.2 }); reT.position.copy(W(1.65, -0.14, 0.105)); S.add(reT);
    const imT = S.text('imaginary ↑', { color: '#151827', size: 0.15, weight: 750, maxW: 1.6 }); imT.position.copy(W(0.42, 1.68, 0.105)); S.add(imT);
    const oneT = S.text('1', { color: '#151827', size: 0.14, weight: 800, maxW: 0.3 }); oneT.position.copy(W(1.08, -0.12, 0.105)); S.add(oneT);
    const iT = S.text('i', { color: '#151827', size: 0.15, weight: 800, maxW: 0.3 }); iT.position.copy(W(-0.1, 1.08, 0.105)); S.add(iT);
    /* ---------- w, the arrow, and its trail ---------- */
    const arW = P.arrow(W(0, 0, 0.16), W(1, 0, 0.16), 0.035, C.coral); arW.userData.noFit = true; S.add(arW);
    const wT = S.text('', { size: 0.14, weight: 800, color: '#FFFFFF', bg: C.coral, face: 'cam', top: true, maxW: 2.2 }); wT.userData.noFit = true; S.add(wT);
    const arZ = P.arrow(W(0, 0, 0.2), W(1, 0, 0.2), 0.05, C.teal); arZ.userData.noFit = true; S.add(arZ);
    const zT = S.text('', { size: 0.14, weight: 800, color: '#FFFFFF', bg: C.teal, face: 'cam', top: true, maxW: 2.4 }); zT.userData.noFit = true; S.add(zT);
    const trail = [...Array(STEPS + 1)].map(() => { const b = P.ball(0.05, '#5FB8B2'); b.userData.noFit = true; S.add(b); return b; });
    const arc = P.tube([V(), V(1, 0, 0)], 0.016, C.coral); arc.userData.noFit = true; S.add(arc);
    const wv = () => { const a = st.ang * Math.PI / 180; return [st.len * Math.cos(a), st.len * Math.sin(a)]; };
    // z_n = w^n, done the honest way (complex multiply) or the wrong way (multiply the parts separately)
    const mul = ([a, b], [c, d]) => st.wrong ? [a * c, b * d] : [a * c - b * d, a * d + b * c];
    const zs = () => { const w = wv(), out = [[1, 0]]; for (let k = 1; k <= STEPS; k++) out.push(mul(out[k - 1], w)); return out; };
    const clampP = ([a, b]) => { const r = Math.hypot(a, b), m = 1.85; return r > m ? [a / r * m, b / r * m] : [a, b]; };
    function update(dt) {
      if (st.play) { st.acc += dt * (S.reduced ? 4 : 1.3); while (st.acc >= 1) { st.acc -= 1; st.n = (st.n + 1) % (STEPS + 1); } }
      const Z = zs(), w = wv(), cur = Z[st.n];
      P.setArrow(arW, W(0, 0, 0.16), W(...clampP(w), 0.16));
      wT.position.copy(W(...clampP(w), 0.5)); wT.userData.set(`w: turn ${st.ang}°, length ${st.len.toFixed(2)}`);
      const cp = clampP(cur), r = Math.hypot(...cur);
      arZ.visible = r > 1e-3; if (r > 1e-3) P.setArrow(arZ, W(0, 0, 0.2), W(...cp, 0.2));
      zT.position.copy(W(...cp, 0.65)); zT.userData.set(`w^${st.n} = ${fmt(cur)}`);
      trail.forEach((b, k) => { b.visible = k <= st.n; if (b.visible) b.position.copy(W(...clampP(Z[k]), 0.15)); b.scale.setScalar(Math.hypot(...Z[k]) > 1.85 ? 1.8 : 1); });
      // the turn of w, drawn as an arc from the real axis
      const pts = []; const a = st.ang * Math.PI / 180; for (let k = 0; k <= 24; k++) { const t = a * k / 24; pts.push(W(0.42 * Math.cos(t), 0.42 * Math.sin(t), 0.17)); }
      arc.geometry.dispose(); arc.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.016, 6, false);
    }
    const fmt = ([a, b]) => Math.hypot(a, b) > 999 ? `${Math.hypot(a, b).toExponential(1)} long` : `${a.toFixed(2)} ${b < 0 ? '−' : '+'} ${Math.abs(b).toFixed(2)}i`;
    const controls = [
      { type: 'slider', label: 'w\'s turn (degrees)', min: 0, max: 180, step: 5, get: () => st.ang, set: v => { st.ang = Math.round(v); st.n = 0; } },
      { type: 'slider', label: 'w\'s length', min: 0.8, max: 1.2, step: 0.01, get: () => st.len, set: v => { st.len = v; st.n = 0; } },
      { type: 'toggle', label: 'Keep multiplying', short: 'Play', get: () => st.play, set: v => { st.play = v; } },
      { type: 'button', label: 'Multiply once more', short: '× w', act: () => { st.play = false; st.n = Math.min(STEPS, st.n + 1); } },
    ];
    const readouts = [
      { label: 'Length after 24 steps', get: () => { const r = Math.hypot(...zs()[STEPS]); return { v: r > 999 ? r.toExponential(1) : r.toFixed(2), good: Math.abs(r - 1) < 0.02, bad: r > 3 || r < 0.2 }; } },
      { label: 'Turned in total', get: () => ({ v: st.wrong ? 'not at all' : `${(st.ang * st.n) % 360}°`, sub: `after ${st.n} steps` }) },
    ];
    const labels = [
      { name: 'w', t: 'The number w', d: 'Its angle is the turn; its length the stretch', icon: 'spark', at: () => W(...clampP(wv()), 0.16) },
      { name: 'circle', t: 'The unit circle', d: 'Every number of length exactly 1', icon: 'target', atV: W(-0.707, 0.707, 0.12) },
      { name: 'z', t: 'w × w × … × w', d: 'One more dot for each multiply', icon: 'link', atV: W(0, -1, 0.15) },
      { name: 'axes', t: 'Two parts', d: 'Real across, imaginary up: a + bi', icon: 'box', atV: W(1.9, 0, 0.12) },
    ];
    const reset = () => { Object.assign(st, { ang: 30, len: 1, n: 0, wrong: false, play: true }); };
    const breaks = [
      { label: 'A length just over 1', hint: '1.12: grows every step', on: () => { reset(); st.len = 1.12; }, off: reset },
      { label: 'Forget that i × i = −1', hint: 'Multiply the parts separately', on: () => { reset(); st.wrong = true; }, off: reset },
    ];
    function status() {
      const r = Math.hypot(...zs()[STEPS]);
      if (st.wrong) return { ok: false, msg: `<b>No turning at all.</b> Multiplying the parts separately, (a × c) and (b × d), throws away the cross terms, and with them the rule i × i = −1. The arrow just slides onto the real axis and shrinks. The rule is what makes multiplication a turn: (a + bi)(c + di) = (ac − bd) + (ad + bc)i.` };
      if (r > 3) return { ok: false, msg: `<b>It explodes.</b> A length of ${st.len.toFixed(2)} stretches the arrow by ${Math.round((st.len - 1) * 100)}% every step, so after 24 steps it is ${r.toFixed(0)} times as long. Repeated multiplication only stays calm when the length is exactly 1. The same thing happens to signals inside a network whose numbers are slightly too big.` };
      if (r < 0.2) return { msg: `<b>It fades away.</b> A length below 1 shrinks the arrow every step: after 24 steps only ${r.toFixed(2)} is left. Vanishing signals in deep networks look just like this.` };
      return { ok: Math.abs(r - 1) < 0.02 ? true : undefined, msg: `<b>w turns ${st.ang}° and stretches by ${st.len.toFixed(2)}.</b> Each multiply turns the arrow another ${st.ang}°. ${Math.abs(st.len - 1) < 0.005 ? `With length exactly 1 the tip walks round the gold circle, back to the start after ${st.ang ? 360 / gcd(st.ang, 360) : 1} steps.` : 'Not quite length 1, so the tip slowly drifts off the circle.'}` };
    }
    const gcd = (a, b) => b ? gcd(b, a % b) : a;
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); st.n = 0; } };
  },

  story: [
    { t: 'An arrow with two parts', home: true, say: 'A complex number has two parts: a real part, along, and an imaginary part, up. So it can be drawn as an arrow on a flat plane.', act: m => m.set({ ang: 30, len: 1, play: false }) },
    { t: 'Multiplying turns', focus: 'w', zoom: 1.4, say: 'Here is the surprise. Multiplying by the coral number w turns your arrow by w\'s angle, thirty degrees, and stretches it by w\'s length.', act: m => m.set({ play: true }) },
    { t: 'Round the circle', home: true, say: 'Multiply again and again. With length exactly one, every multiply is a pure turn, and the tip walks round the gold unit circle, back where it started after twelve steps.', wait: 6 },
    { t: 'The rule behind it', focus: 'axes', zoom: 1.3, say: 'It all comes from one rule: i times i is minus one. Multiply by i and an arrow pointing along turns to point up; multiply by i again and it points backwards.', act: m => m.set({ ang: 90, len: 1, play: true }) },
    { t: 'Grow or fade', home: true, say: 'Make the length a little more than one and the tip spirals outwards, faster and faster. A little less, and it spirals in to nothing. Exactly one keeps it steady.', act: m => m.set({ ang: 30, len: 1.12, play: true }), wait: 6 },
    { t: 'Where AI uses it', home: true, say: 'Anything that repeats can be written as turning arrows. The Fourier transform splits sound into them, and modern language models encode each word\'s position as a turn.', act: m => m.set({ ang: 15, len: 1, play: true }), wait: 5 },
  ],
  check: [
    { q: 'What does multiplying by a complex number of length 1 do to an arrow?', options: ['Turns it, without changing its length', 'Doubles it', 'Makes it point along the real axis'], answer: 0, why: 'A length-1 number is a pure rotation by its angle.' },
    { q: 'Why does i × i = −1 matter?', options: ['It is what makes multiplication a turn', 'It makes numbers bigger', 'It doesn\'t'], answer: 0, why: 'Two quarter-turns make a half-turn: pointing backwards, which is −1.' },
    { q: 'You multiply by w again and again and the arrow grows without limit. What is true of w?', options: ['Its length is more than 1', 'Its angle is 0', 'It is imaginary'], answer: 0, why: 'Each multiply stretches by w\'s length, so a length above 1 compounds.' },
  ],
  terms: [
    ['Complex number', 'A number a + bi with a real part a and an imaginary part b; drawn as an arrow.'],
    ['i', 'The number with i × i = −1: one quarter-turn.'],
    ['Magnitude', 'The arrow\'s length, √(a² + b²).'],
    ['Phase (argument)', 'The arrow\'s angle from the real axis.'],
    ['Euler\'s formula', 'e^(iθ) = cos θ + i sin θ: the arrow of length 1 at angle θ.'],
  ],
  deeper: '<p><b>RoPE.</b> Rotary position embedding treats pairs of numbers in each query and key as complex numbers and turns them by an angle that grows with the word\'s position. When attention compares two words, only the difference of their angles survives, so the model sees how far apart they are.</p><p><b>Fourier.</b> A sound is a sum of arrows spinning at different speeds. The Fourier transform measures how long each arrow is; see the next lesson.</p><p><b>Stability.</b> A recurrent network that multiplies its state by the same matrix each step behaves like repeated multiplication by w: eigenvalues of length above 1 explode, below 1 fade.</p>',
  code: {
    title: 'Turning with complex numbers',
    note: 'Adapted from the course\'s complex-numbers lesson. Python writes i as j.',
    text: `
import cmath, math

w = cmath.rect(1.0, math.radians(30))   # length 1, angle 30°
z = 1 + 0j
for step in range(12):
    z = z * w                            # turn 30° each time
print(round(abs(z), 3), round(math.degrees(cmath.phase(z)), 1))   # 1.0, back at 0°

print(1j * 1j)                           # (-1+0j): i × i = −1

def rope(pair, position, theta=0.1):
    # rotary position encoding: turn a pair of numbers by an angle that grows with position
    z = complex(*pair) * cmath.exp(1j * position * theta)
    return z.real, z.imag
`,
  },
};
