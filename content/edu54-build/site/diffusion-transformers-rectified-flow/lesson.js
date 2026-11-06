// Diffusion transformers and rectified flow: every generated picture is squeezed to one dot on a table so its whole journey can be seen.
// Dots start as noise on the left and follow a velocity field to the right, where real pictures live: two kinds of cloth, indigo adire (two clumps) and gold kente (two clumps).
// The velocity field is the exact flow-matching field for this data; the sampler takes Euler steps along it. Rectifying the flow straightens the paths.
// A diffusion transformer (DiT) block in front is told the timestep and the prompt through AdaLN.
// Break it: 2 steps on curved paths (dots land between the clumps), no timestep for the transformer (dots stall halfway), guidance far too high (dots fly past the clumps).
const M0 = [-1.7, 0], S0 = 0.42, SD = 0.13;
const COMP = [{ m: [1.25, 1.05], k: 'adire' }, { m: [2.05, 0.45], k: 'adire' }, { m: [1.25, -1.05], k: 'kente' }, { m: [2.05, -0.45], k: 'kente' }];
const KC = { adire: '#2F3C8F', kente: '#E3A72F' };

function velocity(x, t, only) {
  const comps = only ? COMP.filter(c => c.k === only) : COMP;
  const s2 = (1 - t) ** 2 * S0 * S0 + t * t * SD * SD;
  let wsum = 0; const v = [0, 0], lw = [];
  comps.forEach(c => { const mu = [(1 - t) * M0[0] + t * c.m[0], (1 - t) * M0[1] + t * c.m[1]], d2 = (x[0] - mu[0]) ** 2 + (x[1] - mu[1]) ** 2; lw.push(-d2 / (2 * s2)); });
  const mx = Math.max(...lw);
  comps.forEach((c, i) => {
    const w = Math.exp(lw[i] - mx); wsum += w;
    const mu = [(1 - t) * M0[0] + t * c.m[0], (1 - t) * M0[1] + t * c.m[1]];
    for (let d = 0; d < 2; d++) { const e1 = c.m[d] + (t * SD * SD / s2) * (x[d] - mu[d]), e0 = M0[d] + ((1 - t) * S0 * S0 / s2) * (x[d] - mu[d]); v[d] += w * (e1 - e0); }
  });
  return [v[0] / wsum, v[1] / wsum];
}

export default {
  slug: 'diffusion-transformers-rectified-flow',
  title: 'Rectified flow: straight paths from noise',
  description: 'Every generated picture shrunk to a dot on a table, so you can watch its whole journey from noise on the left to real cloth on the right: indigo adire or gold kente. A transformer predicts the velocity at each step; straighten the paths and one or two steps are enough. Then take two steps on curved paths, hide the timestep, or push the guidance too far.',
  overview: 'Newer image generators replace the diffusion U-Net with a transformer (a DiT) that works on patches of the latent picture, told the timestep and the prompt through adaptive layer norm (AdaLN). Many also replace the noise schedule with flow matching: learn a velocity that carries each noise sample to a picture along a path, then follow it with a few Euler steps. Plain flow matching gives curved paths, which need many small steps. Rectified flow re-pairs noise with the pictures it actually reaches and trains again, straightening the paths so a handful of steps, or even one, lands correctly. Classifier-free guidance still works: push the velocity towards the prompt, but not too hard.',
  keywords: ['rectified flow', 'flow matching explained', 'diffusion transformer dit', 'adaln conditioning', 'few step image generation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.4, 0.1], dir: [0.1, 1.3, 1.0], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { steps: 4, rect: true, tIn: true, guide: 2, prompt: 'adire', clock: 0 };
    const ink = '#151827', NP = 48;
    const base = P.box(6.6, 0.12, 3.2, '#E9E2D3', { r: 0.12 }); base.position.set(0.2, 0, 0); S.add(base);
    const table = P.box(5.2, 0.04, 2.6, '#FBF8F1', { r: 0.05 }); table.position.set(0.2, 0.12, -0.15); S.add(table);
    const X = x => x * 1.15 + 0.15, Z = y => -y * 0.95 - 0.15, Y0 = 0.17;
    /* noise cloud and data clumps */
    const noiseDisc = P.cyl(0.5, 0.008, '#D9D2C4', { seg: 32 }); noiseDisc.position.set(X(M0[0]), Y0 - 0.005, Z(M0[1])); S.add(noiseDisc);
    const nT = S.text('noise', { size: 0.09, weight: 800, color: ink }); nT.position.set(X(M0[0]), Y0, Z(M0[1]) + 0.62); S.add(nT);
    COMP.forEach(c => { const d = P.cyl(0.24, 0.012, KC[c.k], { seg: 24, material: new THREE.MeshLambertMaterial({ color: KC[c.k], transparent: true, opacity: 0.6 }) }); d.position.set(X(c.m[0]), Y0 - 0.004, Z(c.m[1])); S.add(d); });
    const aT = S.text('indigo adire', { size: 0.08, weight: 800, color: '#2F3C8F' }); aT.position.set(X(1.65), Y0, Z(1.45)); S.add(aT);
    const kT = S.text('gold kente', { size: 0.08, weight: 800, color: '#9A6B10' }); kT.position.set(X(1.65), Y0, Z(-1.45)); S.add(kT);
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), NP);
    dots.userData.noFit = true; dots.frustumCulled = false; S.add(dots);
    const trail = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.007, 0.007, 1, 4), new THREE.MeshBasicMaterial({ color: '#8E91A3' }), NP * 50);
    trail.userData.noFit = true; trail.frustumCulled = false; trail.layers.set(1); S.add(trail);
    /* the DiT block */
    const DX = -1.5, dit = P.box(1.3, 0.34, 0.5, C.indigo, { r: 0.06 }); dit.position.set(DX, 0.12, 1.4); S.add(dit);
    const ditT = S.text('DiT: predicts the velocity', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); ditT.position.set(DX, 0.29, 1.655); S.add(ditT);
    const ditTop = S.text('transformer', { size: 0.07, weight: 800, color: '#FFFFFF' }); ditTop.position.set(DX - 0.3, 0.465, 1.4); S.add(ditTop);
    const dial = P.cyl(0.12, 0.06, C.gold, { seg: 20, material: new THREE.MeshLambertMaterial({ color: C.gold }) }); dial.position.set(DX + 0.4, 0.46, 1.4); S.add(dial);
    const dialT = S.text('', { size: 0.055, weight: 800, color: ink, bg: '#FFFFFF', face: 'cam', top: true }); dialT.position.set(DX + 0.4, 0.75, 1.4); dialT.userData.noFit = true; S.add(dialT);
    const stepB = P.box(1.0, 0.3, 0.5, C.teal, { r: 0.06 }); stepB.position.set(0.3, 0.12, 1.4); S.add(stepB);
    const stepT = S.text('', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); stepT.position.set(0.3, 0.27, 1.655); S.add(stepT);
    const stepTop = S.text('sampler', { size: 0.065, weight: 800, color: '#FFFFFF' }); stepTop.position.set(0.3, 0.425, 1.4); S.add(stepTop);
    const gB = P.box(1.0, 0.3, 0.5, C.plum, { r: 0.06 }); gB.position.set(1.8, 0.12, 1.4); S.add(gB);
    const gT = S.text('', { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); gT.position.set(1.8, 0.27, 1.655); S.add(gT);
    const gTop = S.text('guidance', { size: 0.065, weight: 800, color: '#FFFFFF' }); gTop.position.set(1.8, 0.425, 1.4); S.add(gTop);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- simulate ---------- */
    let s0 = 5; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647, gs = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(6.2832 * rnd());
    const START = [...Array(NP)].map(() => [M0[0] + gs() * S0, M0[1] + gs() * S0]);
    const fine = x => { let p = x.slice(); for (let i = 0; i < 200; i++) { const t = i / 200, v = vfield(p, t); p = [p[0] + v[0] / 200, p[1] + v[1] / 200]; } return p; };
    function vfield(x, t) {
      const tt = st.tIn ? t : 0.5;
      const vu = velocity(x, tt, null);
      if (!st.prompt) return vu;
      const vc = velocity(x, tt, st.prompt);
      return [vu[0] + st.guide * (vc[0] - vu[0]), vu[1] + st.guide * (vc[1] - vu[1])];
    }
    let R = null;
    function simulate() {
      const paths = START.map(x0 => {
        const pts = [x0.slice()];
        if (st.rect) { const x1 = fine(x0); for (let i = 1; i <= st.steps; i++) { const u = i / st.steps; pts.push([x0[0] + (x1[0] - x0[0]) * u, x0[1] + (x1[1] - x0[1]) * u]); } }
        else { let p = x0.slice(); for (let i = 0; i < st.steps; i++) { const t = i / st.steps, v = vfield(p, t); p = [p[0] + v[0] / st.steps, p[1] + v[1] / st.steps]; pts.push(p.slice()); } }
        return pts;
      });
      const ends = paths.map(p => p[p.length - 1]);
      const near = e => COMP.reduce((b, c) => { const d = Math.hypot(e[0] - c.m[0], e[1] - c.m[1]); return d < b.d ? { d, k: c.k } : b; }, { d: 9, k: null });
      const landed = ends.filter(e => near(e).d < 2.2 * SD).length / NP;
      const onPrompt = st.prompt ? ends.filter(e => { const n = near(e); return n.d < 2.2 * SD && n.k === st.prompt; }).length / NP : landed;
      const meanX = ends.reduce((a, e) => a + e[0], 0) / NP;
      return { paths, ends, landed, onPrompt, meanX, near };
    }
    function draw() {
      R = simulate();
      let q = 0;
      R.paths.forEach(p => { for (let i = 1; i < p.length && q < NP * 50; i++) { const a = V(X(p[i - 1][0]), Y0 + 0.01, Z(p[i - 1][1])), b = V(X(p[i][0]), Y0 + 0.01, Z(p[i][1])), len = a.distanceTo(b); dummy.position.copy(a).add(b).multiplyScalar(0.5); dummy.scale.set(1, Math.max(0.001, len), 1); dummy.lookAt(b); dummy.rotateX(Math.PI / 2); dummy.updateMatrix(); trail.setMatrixAt(q++, dummy.matrix); } });
      trail.count = q; trail.instanceMatrix.needsUpdate = true;
      stepT.userData.set(`${st.steps} Euler step${st.steps > 1 ? 's' : ''}`); gT.userData.set(st.prompt ? `× ${st.guide}, "${st.prompt}"` : 'no prompt');
      dialT.userData.set(st.tIn ? 'timestep t (AdaLN)' : 'no timestep!'); dial.material.color.set(st.tIn ? C.gold : '#4A4D63');
      st.clock = 0;
    }
    draw();
    function update(dt) {
      st.clock += dt; const per = S.reduced ? 0.6 : 2.6, u = Math.min(1, (st.clock % (per + 0.8)) / per);
      R.paths.forEach((p, i) => {
        const f = u * (p.length - 1), k = Math.min(p.length - 2, Math.floor(f)), w = f - k, a = p[k], b = p[k + 1] || a, x = a[0] + (b[0] - a[0]) * w, y = a[1] + (b[1] - a[1]) * w;
        dummy.position.set(X(x), Y0 + 0.035, Z(y)); dummy.scale.setScalar(1); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); dots.setMatrixAt(i, dummy.matrix);
        const n = R.near([x, y]); dots.setColorAt(i, col.set(u > 0.98 && n.d < 2.2 * SD ? KC[n.k] : u > 0.98 ? C.red : '#5B6178'));
      });
      dots.instanceMatrix.needsUpdate = true; dots.instanceColor.needsUpdate = true;
    }
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'slider', label: 'Sampling steps', min: 1, max: 40, step: 1, get: () => st.steps, set: v => { st.steps = Math.round(v); draw(); } },
      { type: 'toggle', label: 'Rectified (straightened) flow', short: 'rectified', get: () => st.rect, set: v => { st.rect = v; draw(); } },
      { type: 'toggle', label: 'Tell the transformer the timestep', short: 'timestep', get: () => st.tIn, set: v => { st.tIn = v; draw(); } },
      { type: 'buttons', label: 'Prompt', options: ['None', 'Adire', 'Kente'], get: () => ['', 'adire', 'kente'].indexOf(st.prompt), act: i => { st.prompt = ['', 'adire', 'kente'][i]; draw(); } },
      { type: 'slider', label: 'Guidance strength', min: 1, max: 14, step: 0.5, get: () => st.guide, set: v => { st.guide = v; draw(); } },
    ];
    const readouts = [
      { label: 'Landed on real cloth', get: () => ({ v: pct(R.landed), sub: 'dots inside a clump', good: R.landed > 0.9, bad: R.landed < 0.6 }) },
      { label: 'Matched the prompt', get: () => ({ v: st.prompt ? pct(R.onPrompt) : '–', sub: st.prompt ? `"${st.prompt}"` : 'no prompt', good: st.prompt && R.onPrompt > 0.9 }) },
      { label: 'Network calls', get: () => ({ v: String(st.steps * (st.prompt ? 2 : 1)), sub: st.prompt ? 'two per step with guidance' : 'one per step' }) },
    ];
    const labels = [
      { name: 'noise', t: 'Noise', d: 'Where every picture starts', icon: 'spark', atV: V(X(M0[0]) - 0.5, Y0, Z(M0[1])) },
      { name: 'data', t: 'Real pictures', d: 'Two kinds of cloth, two clumps each', icon: 'target', atV: V(X(2.4), Y0, Z(0)) },
      { name: 'dit', t: 'The DiT', d: 'Told the timestep and prompt', icon: 'box', atV: V(DX - 0.65, 0.3, 1.4) },
    ];
    const reset = () => { Object.assign(st, { steps: 4, rect: true, tIn: true, guide: 2, prompt: 'adire' }); draw(); };
    const breaks = [
      { label: 'Two steps on curved paths', hint: 'Plain flow matching, not rectified', on: () => { reset(); st.rect = false; st.steps = 2; st.prompt = ''; draw(); }, off: reset },
      { label: 'No timestep for the DiT', hint: 'AdaLN gets nothing', on: () => { reset(); st.tIn = false; st.rect = false; st.steps = 20; draw(); }, off: reset },
      { label: 'Guidance far too high', hint: '× 14', on: () => { reset(); st.guide = 14; st.rect = false; st.steps = 20; draw(); }, off: reset },
    ];
    function status() {
      if (!st.tIn) return { ok: false, msg: `<b>Stuck halfway.</b> Without the timestep, the transformer cannot tell a dot that has just left the noise from one that has nearly arrived, so it predicts the same middling velocity everywhere. The dots drift but never settle on real cloth: ${pct(R.landed)} land in a clump.` };
      if (st.prompt && st.guide > 5) return { ok: false, msg: `<b>Flung past the target.</b> Guidance multiplies the difference between the prompted and unprompted velocity. At × ${st.guide} the push towards "${st.prompt}" overshoots, and dots fly past the clumps into places no real cloth lives: ${pct(R.landed)} land well. In pictures, that looks like burnt, oversaturated colours.` };
      if (!st.rect && st.steps < 8) return { ok: false, msg: `<b>Landing between the clumps.</b> Plain flow matching gives curved paths. With ${st.steps} big Euler step${st.steps > 1 ? 's' : ''}, each dot heads for the average of where it might end up, so many finish in the empty space between two kinds of cloth: ${pct(R.landed)} land. Many small steps, or straightened paths, fix it.` };
      return { ok: true, msg: `<b>${pct(R.landed)} land on real cloth${st.prompt ? `, ${pct(R.onPrompt)} on "${st.prompt}"` : ''}.</b> ${st.rect ? `The paths are straight, so ${st.steps} step${st.steps > 1 ? 's are' : ' is'} enough: each step just walks along a line.` : `Curved paths, but ${st.steps} small steps follow them closely.`} ${st.steps * (st.prompt ? 2 : 1)} network calls per picture.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Pictures as dots', home: true, say: 'Imagine every picture squeezed to a single dot on this table. Noise lives on the left; real pictures of cloth live on the right, indigo adire above, gold kente below.', act: m => m.set({ steps: 40, rect: false, tIn: true, prompt: '', guide: 2 }) },
    { t: 'Following a velocity', home: true, say: 'Generating means following a velocity, step by step, from noise to a real picture. A transformer predicts that velocity, told the timestep through adaptive layer norm.', act: m => m.set({ steps: 40, rect: false }) },
    { t: 'Curved paths', home: true, say: 'Plain flow matching gives curved paths. Take only two big steps, and each dot cuts the corner and lands between the clumps.', act: m => m.set({ steps: 2, rect: false }) },
    { t: 'Straighten them', home: true, say: 'Rectified flow pairs each noise dot with the picture it actually reaches and trains again. The paths straighten, and two steps land perfectly.', act: m => m.set({ steps: 2, rect: true }) },
    { t: 'Prompts and guidance', home: true, say: 'A prompt pulls dots towards one kind of cloth. Guidance strengthens that pull; a little helps, too much flings dots past the target.', act: m => m.set({ steps: 4, rect: true, prompt: 'adire', guide: 2 }) },
    { t: 'Without the timestep', home: true, say: 'Hide the timestep from the transformer, and it cannot tell a dot just leaving the noise from one nearly arrived. The dots stall halfway.', act: m => m.set({ rect: false, steps: 20, tIn: false }) },
  ],
  check: [
    { q: 'Why do straight paths allow fewer sampling steps?', options: ['A single Euler step along a straight line lands exactly', 'Straight paths use smaller images', 'They skip the transformer'], answer: 0, why: 'Curved paths need many small steps to follow.' },
    { q: 'What does rectified flow do?', options: ['Re-pairs noise with the pictures it reaches and retrains, straightening the paths', 'Adds more noise', 'Removes the prompt'], answer: 0, why: 'That is why few-step generators are possible.' },
    { q: 'How does a DiT learn which timestep it is at?', options: ['The timestep conditions its layer norms (AdaLN)', 'It counts the pixels', 'It does not need to know'], answer: 0, why: 'Without it, the velocity cannot depend on how far along the dot is.' },
  ],
  terms: [
    ['DiT', 'Diffusion transformer: a transformer that denoises or predicts velocity on latent patches.'],
    ['AdaLN', 'Adaptive layer norm: scale and shift set by the timestep and prompt.'],
    ['Flow matching', 'Learning a velocity field that carries noise to data.'],
    ['Rectified flow', 'Straightening those paths by re-pairing and retraining.'],
    ['Euler step', 'Moving a sample by velocity × step size.'],
    ['Classifier-free guidance', 'Pushing the velocity further towards the prompt.'],
  ],
  deeper: '<p><b>Why transformers?</b> Transformers scale smoothly with more compute and data, handle long sequences of patches, and accept text through attention, which made them the choice for the largest image and video generators.</p><p><b>One-step models.</b> Distillation methods train a student to jump from noise to picture in one or a few steps, building on straightened flows.</p><p><b>About this machine.</b> The velocity field is the exact flow-matching field for this two-dimensional data; the "rectified" paths join each noise dot straight to where a fine integration takes it.</p>',
  code: {
    title: 'Flow matching loss and an Euler sampler',
    note: 'Adapted from the course\'s rectified flow lesson.',
    text: `
import torch

def flow_matching_loss(model, x1, cond):
    x0 = torch.randn_like(x1)                       # noise
    t = torch.rand(x1.shape[0], 1, 1, 1)
    xt = (1 - t) * x0 + t * x1                      # a point on the straight line
    target = x1 - x0                                # its velocity
    return ((model(xt, t, cond) - target) ** 2).mean()

@torch.no_grad()
def sample(model, shape, cond, steps=4, guidance=2.0):
    x = torch.randn(shape)
    for i in range(steps):
        t = torch.full((shape[0], 1, 1, 1), i / steps)
        v_c, v_u = model(x, t, cond), model(x, t, None)
        v = v_u + guidance * (v_c - v_u)            # classifier-free guidance
        x = x + v / steps                           # Euler step
    return x
`,
  },
};
