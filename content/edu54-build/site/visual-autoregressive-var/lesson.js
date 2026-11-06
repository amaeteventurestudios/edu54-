// Visual autoregressive modelling (VAR): next-scale prediction. A picture of a Ndebele-painted house wall is built coarse to fine:
// first a 1 × 1 token map, then 2 × 2, 4 × 4, 8 × 8, 16 × 16. Each scale is predicted all at once, looking at every coarser scale, and adds detail on top (a residual).
// Compared with next-token prediction, which writes one token at a time in reading order, it needs only five steps instead of 256.
// Break it: next-token raster order (256 steps; and the top rows are fixed before the model knows what the bottom will hold), skip the middle scales (jump from 2 × 2 to 16 × 16: blotchy),
// predict each scale without the residual (each map tries to draw the whole picture again: colours fight).
const SCALES = [1, 2, 4, 8, 16], G = 16;
function wall(x, y) {   // x, y in 0..1
  const bx = Math.floor(x * 8), by = Math.floor(y * 8), edge = (x * 8) % 1 < 0.12 || (y * 8) % 1 < 0.12;
  if (edge) return [0.08, 0.08, 0.1];
  const pal = [[0.96, 0.94, 0.88], [0.85, 0.2, 0.15], [0.2, 0.3, 0.65], [0.95, 0.75, 0.2], [0.2, 0.55, 0.3]];
  const k = (bx * 3 + by * 5 + (bx === by ? 2 : 0)) % 5;
  return pal[y < 0.25 || y > 0.75 ? 0 : k];
}
const TRUTH = []; for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) TRUTH.push(wall((i + 0.5) / G, (j + 0.5) / G));
const avg = (s, i, j) => { const n = G / s, acc = [0, 0, 0]; for (let y = j * n; y < (j + 1) * n; y++) for (let x = i * n; x < (i + 1) * n; x++) { const c = TRUTH[y * G + x]; acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]; } return acc.map(v => v / (n * n)); };

export default {
  slug: 'visual-autoregressive-var',
  title: 'VAR: predicting the next scale',
  description: 'A painted Ndebele house wall built coarse to fine: one colour, then 2 × 2, 4 × 4, 8 × 8 and 16 × 16, each scale predicted all at once and adding detail on top of the last. Five steps instead of 256. Then switch to one token at a time in reading order, skip the middle scales, or drop the residual.',
  overview: 'Autoregressive image models used to write an image one token at a time in raster order, left to right, top to bottom, like text. That takes as many steps as there are tokens and forces early rows to be fixed before the model knows what lies below. Visual autoregressive modelling (VAR) changes what "next" means: a multi-scale VQ tokeniser represents the image as a stack of token maps from 1 × 1 up to full size, each adding the detail the coarser ones missed. A transformer predicts each whole map at once, conditioned on all the coarser maps, so generation takes a handful of steps and every token sees the whole picture. It scales like a language model, which is its appeal.',
  keywords: ['visual autoregressive var', 'next scale prediction', 'multi scale vq tokenizer', 'autoregressive image generation', 'coarse to fine'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.9, 0], dir: [0.1, 0.45, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 'scale', skip: false, residual: true, step: 5 };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- the scale ladder ---------- */
    const LS = 0.62, LZ = -0.5, ladder = SCALES.map((s, k) => {
      const x = -2.55 + k * (LS + 0.15), b = P.box(LS + 0.08, LS + 0.35, 0.06, '#FBF8F1', { r: 0.03 }); b.position.set(x + LS / 2, 0.12, LZ); S.add(b);
      const t = S.text(`${s} × ${s}`, { size: 0.065, weight: 800, face: 'front', color: ink }); t.position.set(x + LS / 2, 0.12 + LS + 0.2, LZ + 0.035); S.add(t);
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(LS / s * 1.01, LS / s * 1.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), s * s); m.layers.set(1); m.userData.noFit = true; S.add(m);
      for (let q = 0; q < s * s; q++) { dummy.position.set(x + (q % s + 0.5) * LS / s, 0.12 + 0.1 + LS - (Math.floor(q / s) + 0.5) * LS / s, LZ + 0.035); dummy.updateMatrix(); m.setMatrixAt(q, dummy.matrix); }
      m.instanceMatrix.needsUpdate = true;
      return { s, x, m, t, b };
    });
    const ladT = S.text('token maps, coarse to fine', { size: 0.07, weight: 800 }); ladT.position.set(-1.0, 0.12 + LS + 0.355, LZ); S.add(ladT);
    /* ---------- the final picture ---------- */
    const FX = 2.25, FS = 1.5, fin = P.box(FS + 0.2, FS + 0.45, 0.08, '#FBF8F1', { r: 0.04 }); fin.position.set(FX, 0.12, LZ); S.add(fin);
    const finT = S.text('', { size: 0.065, weight: 800, face: 'front', color: ink }); finT.position.set(FX, 0.12 + 0.12 + FS + 0.13, LZ + 0.045); S.add(finT);
    const finTop = S.text('the picture', { size: 0.07, weight: 800 }); finTop.position.set(FX, 0.12 + FS + 0.455, LZ); S.add(finTop);
    const out = new THREE.InstancedMesh(new THREE.PlaneGeometry(FS / G * 1.01, FS / G * 1.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), G * G); out.layers.set(1); out.userData.noFit = true; S.add(out);
    for (let q = 0; q < G * G; q++) { dummy.position.set(FX - FS / 2 + (q % G + 0.5) * FS / G, 0.12 + 0.12 + FS - (Math.floor(q / G) + 0.5) * FS / G, LZ + 0.045); dummy.updateMatrix(); out.setMatrixAt(q, dummy.matrix); }
    out.instanceMatrix.needsUpdate = true;
    /* the transformer and a step counter */
    const tr = P.box(1.8, 0.32, 0.45, C.indigo, { r: 0.05 }); tr.position.set(-0.6, 0.12, 0.85); S.add(tr);
    const trT = S.text('', { size: 0.06, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.7 }); trT.position.set(-0.6, 0.28, 1.08); S.add(trT);
    const trTop = S.text('transformer', { size: 0.065, weight: 800, color: '#FFFFFF' }); trTop.position.set(-1.2, 0.445, 0.85); S.add(trTop);
    const ctr = P.box(0.8, 0.3, 0.45, C.plum, { r: 0.05 }); ctr.position.set(1.0, 0.12, 0.85); S.add(ctr);
    const ctrT = S.text('', { size: 0.075, weight: 800, face: 'front', color: '#FFFFFF' }); ctrT.position.set(1.0, 0.27, 1.08); S.add(ctrT);
    const ctrTop = S.text('steps', { size: 0.065, weight: 800, color: '#FFFFFF' }); ctrTop.position.set(1.0, 0.425, 0.85); S.add(ctrTop);
    /* ---------- generation ---------- */
    let R = null;
    function draw() {
      const used = st.skip ? [1, 2, 16] : SCALES;
      let pic = TRUTH.map(() => [0.55, 0.52, 0.48]), err = 0;
      ladder.forEach((L, k) => {
        const on = used.includes(L.s) && st.mode === 'scale' && k < st.step;
        for (let q = 0; q < L.s * L.s; q++) {
          const i = q % L.s, j = Math.floor(q / L.s), c = avg(L.s, i, j);
          L.m.setColorAt(q, on ? col.setRGB(...c, THREE.SRGBColorSpace) : col.set('#E6E1D6'));
        }
        L.m.instanceColor.needsUpdate = true; L.t.userData.set(used.includes(L.s) ? `${L.s} × ${L.s}` : `${L.s} × ${L.s}: skipped`);
      });
      if (st.mode === 'scale') {
        const shown = used.filter((s, k) => SCALES.indexOf(s) < st.step);
        let s0 = 3; const r = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647;
        TRUTH.forEach((t, q) => {
          const x = q % G, y = Math.floor(q / G);
          if (!shown.length) return;
          const top = shown[shown.length - 1], c = avg(top, Math.floor(x * top / G), Math.floor(y * top / G));
          let v = c.slice();
          if (st.skip && top === 16) { const prev = avg(2, Math.floor(x / 8), Math.floor(y / 8)); v = t.map((tc, ch) => prev[ch] + (tc - prev[ch]) * 0.45 + (r() - 0.5) * 0.25); }
          if (!st.residual && shown.length > 1) { const prev = avg(shown[shown.length - 2], Math.floor(x * shown[shown.length - 2] / G), Math.floor(y * shown[shown.length - 2] / G)); v = v.map((cv, ch) => (cv + prev[ch] * 1.0) * 0.75 + 0.08); }
          pic[q] = v;
        });
      } else {
        const done = Math.round(st.step / 5 * 256), wrongRow = 9;
        TRUTH.forEach((t, q) => { if (q < done) { const y = Math.floor(q / G); pic[q] = y < wrongRow ? t : t.map((v, ch) => (ch === 0 ? v * 0.6 + 0.3 : v * 0.8)); } });
      }
      pic.forEach((c, q) => { out.setColorAt(q, col.setRGB(...c.map(v => Math.max(0, Math.min(1, v))), THREE.SRGBColorSpace)); err += c.reduce((a, v, ch) => a + Math.abs(v - TRUTH[q][ch]), 0); });
      out.instanceColor.needsUpdate = true;
      const steps = st.mode === 'scale' ? used.length : 256;
      ctrT.userData.set(String(steps));
      trT.userData.set(st.mode === 'scale' ? `predicts a whole map at once${st.residual ? ', adding detail' : ', no residual'}` : 'predicts one token at a time, row by row');
      finT.userData.set(st.mode === 'scale' ? 'built coarse to fine' : 'built in reading order');
      R = { steps, err: err / (G * G * 3) };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'What "next" means', options: ['Next scale (VAR)', 'Next token (raster)'], get: () => (st.mode === 'scale' ? 0 : 1), act: i => { st.mode = i ? 'token' : 'scale'; draw(); } },
      { type: 'slider', label: 'Generation progress', min: 1, max: 5, step: 1, get: () => st.step, set: v => { st.step = Math.round(v); draw(); } },
      { type: 'toggle', label: 'Skip the middle scales', short: 'skip', get: () => st.skip, set: v => { st.skip = v; draw(); } },
      { type: 'toggle', label: 'Each scale adds a residual', short: 'residual', get: () => st.residual, set: v => { st.residual = v; draw(); } },
    ];
    const readouts = [
      { label: 'Steps', get: () => ({ v: String(R.steps), sub: 'network calls per picture', good: R.steps <= 5, bad: R.steps > 50 }) },
      { label: 'Match', get: () => ({ v: `${Math.round((1 - R.err * 2.5) * 100)}%`, sub: 'to the painted wall', good: R.err < 0.03, bad: R.err > 0.08 }) },
      { label: 'Each token sees', get: () => ({ v: st.mode === 'scale' ? 'the whole picture' : 'only what is above', good: st.mode === 'scale', bad: st.mode !== 'scale' }) },
    ];
    const labels = [
      { name: 'ladder', t: 'Coarse to fine', d: 'One whole map per step', icon: 'scale', atV: V(-2.65, 0.12 + LS * 0.6, LZ) },
      { name: 'final', t: 'The picture', d: 'Each scale adds detail', icon: 'eye', atV: V(FX + FS / 2 + 0.1, 0.12 + FS * 0.6, LZ) },
      { name: 'counter', t: 'Steps', d: 'Five, not 256', icon: 'spark', atV: V(1.45, 0.25, 0.85) },
    ];
    const reset = () => { Object.assign(st, { mode: 'scale', skip: false, residual: true, step: 5 }); draw(); };
    const breaks = [
      { label: 'One token at a time', hint: 'Raster order, 256 steps', on: () => { reset(); st.mode = 'token'; draw(); }, off: reset },
      { label: 'Skip the middle scales', hint: '2 × 2 straight to 16 × 16', on: () => { reset(); st.skip = true; draw(); }, off: reset },
      { label: 'No residual', hint: 'Each scale redraws everything', on: () => { reset(); st.residual = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.mode === 'token') return { ok: false, msg: `<b>256 steps, and early rows locked in.</b> Writing one token at a time in reading order takes as many steps as there are tokens, and the top rows are fixed before the model has decided what goes below, so the lower half has to make do with whatever the top committed to: here its colours drift. Next-scale prediction lets every token see the whole picture at every step.` };
      if (st.skip) return { ok: false, msg: `<b>Blotchy.</b> Jumping from 2 × 2 straight to 16 × 16 asks one step to invent all the structure in between: where the bands and diamond blocks go. Without the 4 × 4 and 8 × 8 maps to build on, the fine map is a noisy guess (match ${Math.round((1 - R.err * 2.5) * 100)}%). Each scale should only add a little.` };
      if (!st.residual) return { ok: false, msg: `<b>Colours fight.</b> Each finer map should add only the detail the coarser maps missed. Predicting each map as a whole new picture and stacking them double-counts the colours, washing them out and shifting them (match ${Math.round((1 - R.err * 2.5) * 100)}%). The multi-scale tokeniser is built on residuals for exactly this reason.` };
      return { ok: true, msg: `<b>Five steps, coarse to fine.</b> One colour, then 2 × 2, 4 × 4, 8 × 8 and 16 × 16: each map predicted whole, conditioned on every coarser map, adding only the detail they lacked. ${R.steps} network calls instead of 256, and every token could see the whole picture.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A painted wall', home: true, say: 'A Ndebele painted house wall: bold blocks of colour with black outlines. We will build it up as tokens.', act: m => m.set({ mode: 'scale', skip: false, residual: true, step: 1 }) },
    { t: 'Coarse first', home: true, say: 'Next scale prediction starts with one colour for the whole picture, then a two by two map.', act: m => m.set({ step: 2 }) },
    { t: 'Then finer', home: true, say: 'Each new map is predicted all at once, looking at every coarser map, and adds the detail they missed.', act: m => m.set({ step: 4 }) },
    { t: 'Five steps', home: true, say: 'Five steps, and the wall is done. Writing one token at a time would take two hundred and fifty six.', act: m => m.set({ step: 5 }) },
    { t: 'Reading order', home: true, say: 'One token at a time, in reading order, locks in the top rows before the model knows what goes below.', act: m => m.set({ mode: 'token' }) },
    { t: 'Every step counts', home: true, say: 'Skip the middle scales, and one step must invent all the structure at once. The wall comes out blotchy.', act: m => m.set({ mode: 'scale', skip: true }) },
  ],
  check: [
    { q: 'What does VAR predict at each step?', options: ['A whole token map at the next finer scale', 'One token in reading order', 'A text caption'], answer: 0, why: 'Coarse to fine, a few steps in total.' },
    { q: 'Why is next-scale prediction faster than next-token?', options: ['It needs one step per scale instead of one per token', 'It uses smaller images', 'It skips the transformer'], answer: 0, why: 'Five steps instead of 256 here.' },
    { q: 'Why does each scale add a residual?', options: ['So finer maps only add the detail coarser maps missed', 'To make colours brighter', 'To remove the tokeniser'], answer: 0, why: 'Otherwise colours are double-counted.' },
  ],
  terms: [
    ['VAR', 'Visual autoregressive modelling: predicting images scale by scale.'],
    ['Next-scale prediction', 'Generating a whole finer token map conditioned on all coarser ones.'],
    ['Multi-scale VQ tokeniser', 'Represents an image as a stack of residual token maps.'],
    ['Raster order', 'Left to right, top to bottom, one token at a time.'],
    ['Residual', 'The difference a finer map adds on top of the coarser ones.'],
    ['Scaling law', 'How performance improves predictably with model size and compute.'],
  ],
  deeper: '<p><b>Why it scales.</b> VAR keeps the language-model recipe, a transformer predicting discrete tokens with cross-entropy, so the same tooling and scaling behaviour apply, while fixing raster order\'s slowness and one-directional view.</p><p><b>Against diffusion.</b> Both refine coarse to fine; diffusion refines by removing noise from the whole image, VAR by adding resolution. VAR takes fewer steps but each step\'s map is larger.</p><p><b>About this machine.</b> The token maps are averages of the true picture at each scale; the failures show their typical effect.</p>',
  code: {
    title: 'Next-scale generation',
    note: 'Adapted from the course\'s VAR lesson.',
    text: `
import torch
import torch.nn.functional as F

SCALES = [1, 2, 4, 8, 16]

@torch.no_grad()
def generate(transformer, tokenizer, class_id):
    maps, f = [], torch.zeros(1, tokenizer.dim, 16, 16)
    for s in SCALES:
        context = torch.cat([m.flatten(1) for m in maps], dim=1) if maps else None
        logits = transformer(context, scale=s, cond=class_id)   # the whole s x s map at once
        tokens = logits.softmax(-1).multinomial(1).view(1, s, s)
        maps.append(tokens)
        f = f + F.interpolate(tokenizer.embed(tokens, s), size=16)   # residual: add detail
    return tokenizer.decode(f)
`,
  },
};
