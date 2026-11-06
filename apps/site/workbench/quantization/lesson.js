// Quantization: 64 weights as rods above and below a glass line. Fewer bits means fewer allowed heights, so each rod snaps
// to the nearest level. Memory shrinks; errors grow. Break it: one outlier weight with a single scale for everything.
const BITS = [16, 8, 4, 3, 2];
const rnd = (() => { let s = 21; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
const gauss = () => { const u = rnd() || 1e-6, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const BASE = Array.from({ length: 64 }, () => +(gauss() * 0.35).toFixed(3));

export default {
  slug: 'quantization',
  title: 'Quantization: shrinking a model',
  description: 'Squeeze a model to fit on a phone. Each weight snaps to fewer allowed heights as the bits drop. Watch the memory fall and the errors grow, then let one giant weight ruin everything.',
  overview: 'A model is billions of numbers. Stored at 16 bits each, a 7-billion-weight model needs 14 GB: too big for most phones. Quantization stores each weight with fewer bits by rounding it to the nearest allowed level. It\'s how large models run on a laptop or a phone, as long as you round carefully.',
  keywords: ['quantization explained', 'int8', '4 bit quantization', 'run llm on phone', 'model compression'],
  orient: 'any',
  view: { target: [0, 1.1, 0], dir: [0.75, 0.8, 1.3], half: 3.0, wide: 4.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { bits: 4, groups: false, outlier: false, shown: BASE.slice() };
    const Y0 = 1.25, SC = 1.25, cell = 0.48;   // baseline height, height per unit of weight, spacing
    const at = k => V(-1.68 + (k % 8) * cell, 0, -1.68 + Math.floor(k / 8) * cell);
    const W = () => { const w = BASE.slice(); if (st.outlier) w[27] = 6.5; return w; };
    // the board and the glass line where a weight of zero sits
    const board = P.box(4.2, 0.12, 4.2, '#2F3040', { r: 0.18 }); S.add(board);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.02, 4.1), new THREE.MeshLambertMaterial({ color: '#8C9BF0', transparent: true, opacity: 0.18, depthWrite: false }));
    glass.position.y = Y0; glass.userData.noMask = true; glass.layers.set(1); S.add(glass);
    const posts = [[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z]) => { const r = P.rod(V(x, 0.1, z), V(x, Y0, z), 0.02, '#8E91A3'); S.add(r); return r; });
    // the rods: solid = stored value, ghost = the original, red tip = the error
    const rods = BASE.map((_, k) => {
      const solid = P.cyl(0.11, 1, C.teal); solid.position.copy(at(k)); S.add(solid);
      const ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false })); ghost.geometry.translate(0, 0.5, 0); ghost.layers.set(1); ghost.userData.noMask = true; ghost.position.copy(at(k)); S.add(ghost);
      const err = P.cyl(0.13, 1, C.red); err.position.copy(at(k)); err.userData.noFit = true; S.add(err);
      return { solid, ghost, err, cur: 0 };
    });
    // the allowed levels, drawn as thin lines on the back wall
    const wall = P.box(4.2, 2.5, 0.08, '#F7F5EE', { r: 0.04, m: { emissive: '#6E6A60' } }); wall.position.set(0, 0.06, -2.2); S.add(wall);
    let levelLines = [];
    const mpos = P.mat(C.teal), mneg = P.mat(C.coral);
    function quant(w) {
      const qmax = 2 ** (st.bits - 1) - 1, qmin = -(2 ** (st.bits - 1));
      const one = sc => w.map(v => Math.max(qmin, Math.min(qmax, Math.round(v / sc))) * sc);
      if (st.bits >= 16) return { q: w.map(v => +v.toFixed(4)), scales: [Math.max(...w.map(Math.abs)) / qmax] };
      if (!st.groups) { const sc = Math.max(...w.map(Math.abs)) / qmax || 1; return { q: one(sc), scales: [sc] }; }
      const q = [], scales = [];
      for (let r = 0; r < 8; r++) { const row = w.slice(r * 8, r * 8 + 8), sc = Math.max(...row.map(Math.abs)) / qmax || 1; scales.push(sc); q.push(...row.map(v => Math.max(qmin, Math.min(qmax, Math.round(v / sc))) * sc)); }
      return { q, scales };
    }
    let Q = quant(W());
    const clampH = v => Math.max(-Y0 + 0.15, Math.min(2.6, v * SC));
    function drawLevels() {
      for (const l of levelLines) { S.root.remove(l); }
      levelLines = [];
      if (st.bits > 4) return;
      const sc = Q.scales[0], qmax = 2 ** (st.bits - 1) - 1;
      for (let q = -(qmax + 1); q <= qmax; q++) {
        const y = Y0 + clampH(q * sc); if (y < 0.15 || y > Y0 + 2.6) continue;
        const l = P.box(4.1, 0.025, 0.025, q === 0 ? C.ink : C.gold, { r: 0 }); l.position.set(0, y, -2.12); l.layers.set(1); l.userData.noFit = true; S.add(l); levelLines.push(l);
      }
    }
    function target() { Q = quant(W()); drawLevels(); }
    target();
    function place(k, v) {
      const r = rods[k], o = W()[k], h = clampH(v), ho = clampH(o);
      r.solid.material = v >= 0 ? mpos : mneg;
      r.solid.position.y = h >= 0 ? Y0 : Y0 + h; r.solid.scale.y = Math.max(0.005, Math.abs(h));
      r.ghost.position.y = ho >= 0 ? Y0 : Y0 + ho; r.ghost.scale.y = Math.max(0.005, Math.abs(ho));
      const e = ho - h; r.err.visible = Math.abs(e) > 0.02;
      if (r.err.visible) { r.err.position.y = Y0 + Math.min(h, ho); r.err.scale.y = Math.abs(e); }
    }
    const shown = W().slice();
    BASE.forEach((_, k) => place(k, shown[k]));
    function update(dt) {
      const w = W(); let moving = false;
      for (let k = 0; k < 64; k++) { const t = Q.q[k], d = t - shown[k]; if (Math.abs(d) > 1e-4) { shown[k] += S.reduced ? d : d * Math.min(1, dt * 6); moving = true; } else shown[k] = t; place(k, shown[k]); }
      return moving || w;
    }
    const err = () => { const w = W(); let s = 0, n = 0; for (let k = 0; k < 64; k++) { if (st.outlier && k === 27) continue; s += Math.abs(Q.q[k] - w[k]); n += Math.abs(w[k]); } return s / n; };
    const zeroed = () => { const w = W(); return Q.q.filter((v, k) => k !== 27 && Math.abs(w[k]) > 0.05 && v === 0).length; };
    const gb = () => 7e9 * st.bits / 8 / 1e9 + (st.groups && st.bits < 16 ? 7e9 / 64 * 2 / 1e9 : 0);
    const controls = [
      { type: 'buttons', label: 'Bits per weight', options: BITS.map(b => `${b}-bit`), get: () => BITS.indexOf(st.bits), act: i => { st.bits = BITS[i]; target(); } },
      { type: 'toggle', label: 'A scale for each row', short: 'Row scales', get: () => st.groups, set: v => { st.groups = v; target(); }, hint: 'Group-wise quantization: each group of 8 weights gets its own ruler' },
    ];
    const readouts = [
      { label: '7B model size', get: () => { const g = gb(); return { v: `${g.toFixed(1)} GB`, sub: g <= 6 ? 'fits an 8 GB phone' : g <= 16 ? 'needs a big laptop' : 'needs a server', good: g <= 6, bar: Math.min(1, g / 14) }; }, bar: true },
      { label: 'Rounding error', get: () => { const e = err(); return { v: `${Math.round(e * 100)}%`, sub: st.outlier && !st.groups ? `${zeroed()} weights wiped to 0` : 'of the weights\' size', bad: e > 0.3, good: e < 0.08 }; } },
    ];
    const labels = [
      { name: 'rod', t: 'One weight', d: 'Height = its value. White line: the original', icon: 'target', at: () => rods[9].solid.position.clone().add(V(0, rods[9].solid.scale.y + 0.05, 0)) },
      { name: 'levels', t: 'Allowed heights', d: 'With few bits there are only a few', icon: 'scale', atV: V(1.6, Y0 + 0.6, -2.12), hide: () => st.bits > 4 },
      { name: 'error', t: 'Rounding error', d: 'Red: what was lost', icon: 'bolt', at: () => { const k = rods.reduce((b, r, i) => r.err.visible && r.err.scale.y > (rods[b]?.err.scale.y || 0) ? i : b, 0); return rods[k].err.position.clone().add(V(0, rods[k].err.scale.y, 0)); }, hide: () => !rods.some(r => r.err.visible) },
      { name: 'outlier', t: 'A giant weight', d: 'Big models have a few of these', icon: 'info', at: () => at(27).add(V(0, Y0 + 2.6, 0)), hide: () => !st.outlier },
    ];
    const breaks = [
      { label: 'One giant weight, one scale', hint: 'An outlier sets the ruler for everyone', on: () => { st.outlier = true; st.groups = false; st.bits = 4; target(); }, off: () => { st.outlier = false; target(); } },
      { label: 'Down to 2 bits', hint: 'Four allowed heights', on: () => { st.bits = 2; target(); }, off: () => { st.bits = 4; target(); } },
    ];
    function status() {
      const e = err(), g = gb();
      if (st.outlier && !st.groups && st.bits < 16) return { ok: false, msg: `<b>One giant ruins the rest.</b> The ruler must stretch to fit the giant weight, so its steps are huge and ${zeroed()} ordinary weights round to zero. Turn on row scales: then only the giant's own row suffers.` };
      if (st.bits <= 2) return { ok: false, msg: `<b>Too coarse.</b> Only four heights are allowed, so most weights land far from where they were (${Math.round(e * 100)}% error). The model would talk nonsense.` };
      if (st.bits >= 16) return { msg: `<b>16-bit: the full model.</b> ${g.toFixed(0)} GB for 7 billion weights. Too big for a phone. Drop the bits.` };
      return { ok: e < 0.15, msg: `<b>${st.bits}-bit:</b> ${g.toFixed(1)} GB, ${Math.round(e * 100)}% rounding error. ${st.bits === 4 ? 'This is the sweet spot many phone and laptop models use.' : st.bits === 8 ? 'Half the size, almost no loss.' : 'Getting rough.'}` };
    }
    return { update, controls, readouts, labels, breaks, status,
      reset: () => { Object.assign(st, { bits: 4, groups: false, outlier: false }); target(); },
      set: p => { Object.assign(st, p); target(); } };
  },

  story: [
    { t: 'A model is numbers', home: true, say: 'These sixty-four rods are weights from a model: some positive, some negative. A real model has billions.', act: m => m.set({ bits: 16, groups: false, outlier: false }) },
    { t: 'Too big for a phone', home: true, say: 'At sixteen bits each, a seven billion weight model needs fourteen gigabytes. Most phones have six or eight.' },
    { t: 'Fewer bits, fewer heights', focus: 'levels', zoom: 1.2, say: 'With four bits, each weight may only be one of sixteen heights. Every rod snaps to the nearest one. The red tip is what was lost.', act: m => m.set({ bits: 4 }), wait: 5 },
    { t: 'Small enough', home: true, say: 'Now the model is three and a half gigabytes, and the answers are almost as good. That is how chat models run on laptops and phones.' },
    { t: 'The giant weight', focus: 'outlier', zoom: 1.1, say: 'But big models have a few giant weights. With one ruler for everything, the steps must be huge, and the small weights all round to zero.', act: m => m.set({ outlier: true, groups: false }), wait: 5 },
    { t: 'A ruler per group', home: true, say: 'The fix: give each small group its own ruler. Only the giant\'s own group suffers. Methods like GPTQ and AWQ go further, and protect the weights that matter most.', act: m => m.set({ groups: true }) },
  ],
  check: [
    { q: 'What does quantization do?', options: ['Stores each weight with fewer bits by rounding it', 'Deletes half the weights', 'Trains the model again'], answer: 0, why: 'Each weight is rounded to the nearest allowed level, so it needs fewer bits.' },
    { q: 'How big is a 7-billion-weight model at 4 bits?', options: ['About 3.5 GB', 'About 14 GB', 'About 28 GB'], answer: 0, why: '7 billion × 4 bits = 28 billion bits = 3.5 GB.' },
    { q: 'Why do outlier weights cause trouble?', options: ['They stretch the scale, so small weights round to zero', 'They are deleted', 'They make the model faster'], answer: 0, why: 'The scale must fit the biggest weight. Group scales or special methods protect the rest.' },
  ],
  terms: [
    ['Bit', 'A 0 or a 1. n bits give 2ⁿ possible values.'],
    ['Quantization', 'Rounding numbers to fewer allowed levels to save memory.'],
    ['Scale', 'The size of one step between levels: the ruler.'],
    ['Group-wise', 'A separate scale for each small group of weights.'],
    ['Outlier', 'A weight far bigger than the rest.'],
  ],
  deeper: '<p><b>GPTQ</b> rounds weights one at a time and nudges the rest to make up for each rounding error. <b>AWQ</b> finds the weights that matter most for real inputs and protects them. Formats like GGUF (used by llama.cpp) store 4-bit models with a scale for every block of weights.</p>',
  code: {
    title: 'Symmetric quantization',
    note: 'From the course\'s quantization lesson.',
    text: `
import numpy as np

def quantize(w, bits=4):
    qmax = 2 ** (bits - 1) - 1            # 7 for 4-bit
    scale = np.max(np.abs(w)) / qmax      # the ruler
    q = np.clip(np.round(w / scale), -qmax - 1, qmax).astype(np.int8)
    return q, scale

def dequantize(q, scale):
    return q.astype(np.float32) * scale

def quantize_groups(w, bits=4, group=8):
    # one ruler per group, so an outlier only hurts its own group
    out = []
    for g in w.reshape(-1, group):
        q, s = quantize(g, bits)
        out.append(dequantize(q, s))
    return np.concatenate(out)
`,
  },
};
