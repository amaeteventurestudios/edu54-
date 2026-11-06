// The perceptron: is this plantain ready for dodo? Two inputs (how yellow, how soft), two weights and a bias make a straight fence.
// Each mistake nudges the fence. Break it: a pattern no straight fence can split (XOR).
const N = 16, HALF = 2.4;
// deterministic scatter
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const PTS = Array.from({ length: N }, () => [rnd(), rnd()]);
const ruleReady = ([y, s]) => y + 0.8 * s > 0.98 ? 1 : 0;
const ruleXor = ([y, s]) => (y > 0.5) !== (s > 0.5) ? 1 : 0;

export default {
  slug: 'perceptron',
  title: 'The perceptron',
  description: 'Teach one artificial neuron to tell which plantains are ready for dodo. Watch its fence move with every mistake, then give it a puzzle it can never solve.',
  overview: 'A perceptron is the simplest artificial neuron. It multiplies each input by a weight, adds them up with a bias, and says yes or no. Here it looks at plantains (how yellow, how soft) and learns, one mistake at a time, where to put a straight fence between ready and not ready.',
  keywords: ['perceptron explained', 'artificial neuron', 'xor problem', 'linear classifier'],
  orient: 'any',
  view: { target: [0.9, 0.5, 0], dir: [0.9, 1.3, 1.3], half: 3.6, wide: 5.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const at = ([y, s], h = 0) => V(-HALF + y * HALF * 2, h, HALF - s * HALF * 2);
    /* ---------- the field: tiles show what the neuron would say everywhere ---------- */
    const G = S.lite ? 16 : 22, cell = HALF * 2 / G;
    const field = P.grid(G, G, cell, { h: 0.06, gap: 0.03 }); S.add(field.mesh);
    const ax1 = S.text('more yellow →', { size: 0.2, weight: 650 }); ax1.position.set(1.2, 0.02, HALF + 0.35); S.add(ax1);
    const ax2 = S.text('softer →', { size: 0.2, weight: 650 }); ax2.rotation.z = Math.PI / 2; ax2.position.set(-HALF - 0.35, 0.02, -1.4); S.add(ax2);
    /* ---------- the plantains ---------- */
    const green = new THREE.Color('#4E8B2F'), yellow = new THREE.Color('#F2C94C'), brown = new THREE.Color('#5E3F22');
    const bodies = PTS.map(p => {
      const g = new THREE.Group();
      const col = green.clone().lerp(yellow, p[0]).lerp(brown, p[1] * 0.55);
      const t = P.tube([V(-0.34, 0.07, 0.04), V(0, 0.15, -0.07), V(0.34, 0.07, 0.04)], 0.1, '#' + col.getHexString(), { cast: true });
      const tip = P.cyl(0.03, 0.06, '#3B2A1A'); tip.rotation.z = Math.PI / 2; tip.position.set(0.37, 0.08, 0.04);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.016, 6, 28), P.mat(C.gold)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.075;
      g.add(t, tip, ring); g.position.copy(at(p, 0.06)); g.rotation.y = (p[0] * 7) % 1.2 - 0.6;
      g.userData.ring = ring; S.add(g); return g;
    });
    /* ---------- the fence: where the neuron's sum is zero ---------- */
    // a wooden fence: posts and two rails
    const fence = new THREE.Group(); fence.userData.noFit = true; S.add(fence);
    const rails = [0.14, 0.28].map(y => { const r = P.box(1, 0.035, 0.035, '#8A5A35', { r: 0 }); r.position.y = y; fence.add(r); return r; });
    const posts = Array.from({ length: 22 }, () => { const p = P.box(0.07, 0.36, 0.07, '#6E4527', { r: 0.01 }); fence.add(p); return p; });
    /* ---------- the neuron itself, beside the field ---------- */
    const nx = HALF + 1.35;
    const inBlocks = ['Yellow', 'Soft', '1'].map((n, i) => { const b = P.tile(n, 0.8, 0.3, 0.5, '#F7F5EE', { size: 0.17 }); b.position.set(nx, 0, -1.25 + i * 1.05); S.add(b); return b; });
    const sum = P.ball(0.26, '#A4462A'); sum.position.set(nx + 1.7, 0.35, -0.2); S.add(sum);
    const sumT = S.text('Σ', { size: 0.3, color: '#FFFFFF', face: 'cam', weight: 800, depthTest: false, order: 5 }); sumT.position.copy(sum.position).add(V(0, 0.02, 0)); S.add(sumT);
    const lamp = P.ball(0.22, C.grey); lamp.position.set(nx + 2.6, 0.32, -0.2); S.add(lamp);
    const lampPost = P.rod(sum.position, lamp.position, 0.035, C.ink); S.add(lampPost);
    const wires = inBlocks.map(b => { const r = P.rod(b.position.clone().add(V(0.35, 0.18, 0)), sum.position, 0.03, C.teal); S.add(r); return r; });
    const wT = inBlocks.map(b => { const t = S.text('', { size: 0.15, face: 'cam', weight: 700, bg: 'rgba(255,255,255,.9)', color: C.ink, top: true }); t.position.copy(b.position.clone().add(V(0.35, 0.18, 0)).lerp(sum.position, 0.45)).add(V(0, 0.2, 0)); t.userData.noFit = true; S.add(t); return t; });
    const matPos = P.mat(C.teal), matNeg = P.mat(C.coral), lampOn = P.mat(C.gold, { emissive: '#7A5200' }), lampOff = P.mat('#8E91A3');

    /* ---------- learning ---------- */
    const st = { w: [-0.4, 0.6], b: 0.3, lr: 0.25, xor: false, auto: false, i: 0, epochMiss: 0, epochs: 0, steps: 0, last: null, stuck: false };
    const label = p => st.xor ? ruleXor(p) : ruleReady(p);
    const xin = p => [p[0] * 2 - 1, p[1] * 2 - 1];   // inputs from -1 to 1
    const sumOf = p => { const x = xin(p); return st.w[0] * x[0] + st.w[1] * x[1] + st.b; };
    const predict = p => sumOf(p) >= 0 ? 1 : 0;
    const accuracy = () => PTS.filter(p => predict(p) === label(p)).length;
    const lightA = new THREE.Color('#F6DF9A'), lightB = new THREE.Color('#C9DDB7'), darkA = new THREE.Color('#7A6630'), darkB = new THREE.Color('#3E5A35');
    function draw() {
      const dark = S.theme.dark;
      for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
        const p = [(i + 0.5) / G, 1 - (j + 0.5) / G];
        field.set(i, j, { color: predict(p) ? (dark ? darkA : lightA) : (dark ? darkB : lightB) });
      }
      field.commit();
      PTS.forEach((p, k) => {
        const ok = predict(p) === label(p), r = bodies[k].userData.ring;
        r.material = label(p) ? P.mat(C.gold) : P.mat('#6E8A5C');
        r.scale.setScalar(ok ? 1 : 1.25);
        bodies[k].position.y = 0.06 + (st.last === k ? 0.25 : 0);
        bodies[k].userData.wrong = !ok;
      });
      // fence: w0*x + w1*z' + b = 0 in input space, clipped to the field
      const [a, c] = st.w, pts = [];
      const toWorld = (x, y) => V(x * HALF, 0.06, -y * HALF);
      for (const x of [-1, 1]) if (Math.abs(c) > 1e-6) { const y = -(a * x + st.b) / c; if (y >= -1 && y <= 1) pts.push(toWorld(x, y)); }
      for (const y of [-1, 1]) if (Math.abs(a) > 1e-6) { const x = -(c * y + st.b) / a; if (x >= -1 && x <= 1) pts.push(toWorld(x, y)); }
      fence.visible = pts.length >= 2;
      if (fence.visible) {
        const [p0, p1] = pts, d = p1.clone().sub(p0);
        const L = Math.max(0.05, d.length());
        fence.position.copy(p0).add(p1).multiplyScalar(0.5); fence.rotation.y = -Math.atan2(d.z, d.x);
        for (const r of rails) r.scale.x = L;
        const n = Math.max(2, Math.round(L / 0.42) + 1);
        posts.forEach((p, k) => { p.visible = k < n; p.position.x = -L / 2 + L * k / (n - 1); });
      }
      // the neuron's weights: thick for big, teal for positive, coral for negative
      [st.w[0], st.w[1], st.b].forEach((w, i) => {
        const r = wires[i]; r.material = w >= 0 ? matPos : matNeg; r.scale.x = r.scale.z = 0.4 + Math.min(3, Math.abs(w) * 1.6);
        wT[i].userData.set(`${w >= 0 ? '+' : '−'}${Math.abs(w).toFixed(2)}`);
      });
      lamp.material = st.last != null && predict(PTS[st.last]) ? lampOn : lampOff;
    }
    function learnOne() {
      const k = st.i % N, p = PTS[k], y = label(p), pr = predict(p), x = xin(p);
      st.last = k;
      if (pr !== y) { const e = y - pr; st.w[0] += st.lr * e * x[0]; st.w[1] += st.lr * e * x[1]; st.b += st.lr * e; st.epochMiss++; }
      st.i++; st.steps++;
      if (st.i % N === 0) { st.epochs++; if (st.epochMiss === 0) st.auto = false; if (st.epochs > 25) { st.auto = false; st.stuck = true; } st.epochMiss = 0; }
      draw(); S.sync();
    }
    draw();
    let acc = 0;
    function update(dt) {
      if (!st.auto) return;
      acc += dt;
      const every = st.epochs > 3 ? 0.08 : 0.28;
      while (acc > every) { acc -= every; learnOne(); if (!st.auto) break; }
    }
    const reset = () => { Object.assign(st, { w: [-0.4, 0.6], b: 0.3, auto: false, i: 0, epochMiss: 0, epochs: 0, steps: 0, last: null, stuck: false }); draw(); };
    const controls = [
      { type: 'button', label: 'Learn until right', short: 'Learn', act: () => { st.stuck = false; st.epochs = 0; st.auto = true; } },
      { type: 'button', label: 'Look at one plantain', short: 'One step', act: () => { st.auto = false; learnOne(); } },
      { type: 'button', label: 'Start again', short: 'Reset', act: reset, quick: false },
      { type: 'slider', label: 'Weight: yellow', min: -2, max: 2, step: 0.05, get: () => st.w[0], set: v => { st.w[0] = v; st.auto = false; draw(); } },
      { type: 'slider', label: 'Weight: soft', min: -2, max: 2, step: 0.05, get: () => st.w[1], set: v => { st.w[1] = v; st.auto = false; draw(); } },
      { type: 'slider', label: 'Bias', min: -2, max: 2, step: 0.05, get: () => st.b, set: v => { st.b = v; st.auto = false; draw(); } },
      { type: 'slider', label: 'Learning rate', min: 0.02, max: 1, step: 0.01, get: () => st.lr, set: v => { st.lr = v; } },
    ];
    const readouts = [
      { label: 'Right', get: () => { const a = accuracy(); return { v: `${a} / ${N}`, bar: a / N, good: a === N }; }, bar: true },
      { label: 'Plantains seen', get: () => ({ v: st.steps, sub: `${st.epochs} rounds` }) },
    ];
    const labels = [
      { name: 'fence', t: 'The fence', d: 'Where the neuron\'s sum is exactly zero', icon: 'scale', at: () => fence.position.clone().add(V(0, 0.36, 0)), hide: () => !fence.visible },
      { name: 'neuron', t: 'The neuron', d: 'Inputs × weights, plus bias, then yes or no', icon: 'spark', at: () => sum.position.clone().add(V(0, 0.25, 0)) },
      { name: 'plantain', t: 'A plantain', d: 'Gold ring: ready. Green ring: not yet', icon: 'target', at: () => bodies[st.last ?? 3].position.clone().add(V(0, 0.15, 0)) },
      { name: 'lamp', t: 'Answer', d: 'Lit means ready for dodo', icon: 'bolt', at: () => lamp.position.clone().add(V(0, 0.2, 0)), phone: false },
    ];
    const breaks = [
      { label: 'A pattern no straight fence can split', hint: 'Ready if yellow or soft, but not both (XOR)', on: () => { st.xor = true; reset(); st.auto = true; }, off: () => { st.xor = false; reset(); } },
      { label: 'Learning rate far too small', hint: '0.02: tiny nudges', on: () => { st.lr = 0.02; reset(); st.auto = true; }, off: () => { st.lr = 0.25; reset(); } },
    ];
    function status() {
      const a = accuracy();
      if (st.xor && (st.stuck || st.epochs > 5)) return { ok: false, msg: `<b>It can never get them all.</b> These plantains need two fences, and one neuron can only draw one straight line. It keeps swinging: ${a} of ${N} right. Stacking neurons in layers solves this.` };
      if (a === N && st.steps > 0) return { ok: true, msg: `<b>All ${N} right</b> after ${st.steps} looks. Every mistake nudged the weights a little, until the fence fell between ready and not ready.` };
      if (st.xor) return { ok: false, msg: `<b>A pattern no straight fence can split.</b> Ready now means yellow or soft, but not both. The ready plantains sit in two opposite corners, so any one straight fence leaves some on the wrong side. Watch it keep swinging: ${a} of ${N} right.` };
      if (st.lr < 0.05 && st.auto) return { ok: false, msg: `<b>Tiny nudges.</b> With a learning rate of ${st.lr}, each mistake moves the fence only a hair, so it needs round after round to reach the right place: ${a} of ${N} right after ${st.epochs} rounds.` };
      if (st.auto && st.last != null) { const p = PTS[st.last]; const ok = predict(p) === label(p); return { msg: `<b>Plantain ${st.last + 1}:</b> ${label(p) ? 'ready' : 'not ready'}. ${ok ? 'The neuron agrees, so nothing changes.' : 'Mistake: the weights move toward the right answer.'}` }; }
      if (st.lr < 0.05 && st.steps > 0) return { msg: `<b>Tiny nudges.</b> Each mistake moves the fence only a little, so it takes many rounds.` };
      return { msg: `<b>${a} of ${N} right.</b> Press Learn, or move the weights yourself and watch the fence turn.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, theme: () => draw(), learn: () => { st.auto = true; }, one: learnOne };
  },

  story: [
    { t: 'Ready for dodo?', home: true, say: 'Each plantain has two numbers: how yellow it is, and how soft. A gold ring means it is ready to fry. A green ring means not yet.' },
    { t: 'One neuron', focus: 'neuron', say: 'The perceptron multiplies each number by a weight, adds them up with a bias, and says yes if the total is above zero.' },
    { t: 'The fence', focus: 'fence', zoom: 1.3, say: 'Everywhere the total is exactly zero makes a straight fence. On the gold side it says ready. On the green side, not yet. Right now the fence is in the wrong place.' },
    { t: 'Learn from mistakes', home: true, say: 'Now it learns. It looks at one plantain at a time. When it is right, nothing changes. When it is wrong, it nudges the weights toward the right answer, and the fence turns.', act: m => m.learn(), wait: 9 },
    { t: 'Every plantain right', home: true, say: 'When a whole round has no mistakes, it stops. That simple rule, from 1958, is still the seed of every neural network.' },
    { t: 'What one neuron cannot do', home: true, say: 'But try a rule where ready means yellow or soft, but not both. No straight fence can split that. One neuron fails. Many neurons in layers can do it, and that is the next lesson.' },
  ],
  check: [
    { q: 'What does a perceptron do with its inputs?', options: ['Multiplies by weights, adds a bias, then says yes or no', 'Sorts them', 'Stores them in a list'], answer: 0, why: 'A weighted sum plus a bias, then a yes or no depending on whether it is above zero.' },
    { q: 'When does the perceptron change its weights?', options: ['After every example', 'Only when it gets one wrong', 'Never'], answer: 1, why: 'Right answers leave it alone. A mistake nudges each weight toward the correct answer.' },
    { q: 'Why can\'t one perceptron learn XOR?', options: ['It is too slow', 'It can only draw one straight fence', 'It has no bias'], answer: 1, why: 'XOR needs two fences. One neuron draws one straight line, so layers of neurons are needed.' },
  ],
  terms: [
    ['Neuron', 'A unit that adds up its weighted inputs and passes on a result.'],
    ['Weight', 'How much one input counts. Positive pushes toward yes, negative toward no.'],
    ['Bias', 'A number added at the end. It moves the fence without turning it.'],
    ['Decision boundary', 'The line (the fence) where the answer flips from no to yes.'],
    ['Linearly separable', 'When one straight line can split the two groups.'],
  ],
  deeper: '<p>Frank Rosenblatt built the perceptron in 1958. In 1969 Minsky and Papert showed it could not learn XOR, and interest in neural networks faded for years. The answer was hidden layers, trained with backpropagation, which is the lesson after next.</p>',
  code: {
    title: 'A perceptron in Python',
    note: 'From the course\'s perceptron.py: the same rule the fence follows.',
    text: `
class Perceptron:
    def __init__(self, n_inputs, learning_rate=0.25):
        self.weights = [0.0] * n_inputs
        self.bias = 0.0
        self.lr = learning_rate

    def predict(self, inputs):
        total = sum(w * x for w, x in zip(self.weights, inputs))
        return 1 if total + self.bias >= 0 else 0

    def train(self, data, epochs=100):
        for epoch in range(epochs):
            errors = 0
            for inputs, target in data:
                error = target - self.predict(inputs)
                if error != 0:              # only learn from mistakes
                    errors += 1
                    for i, x in enumerate(inputs):
                        self.weights[i] += self.lr * error * x
                    self.bias += self.lr * error
            if errors == 0:
                return epoch + 1            # a whole round with no mistakes
`,
  },
};
