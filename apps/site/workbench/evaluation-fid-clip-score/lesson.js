// Evaluating image generators with FID, CLIP score and human preference. Three models make travel posters from prompts like "sunrise over Kilimanjaro, giraffes in front".
// The dish shows each image as a dot in a feature space: grey for real photos, colour for the chosen model. FID measures how far apart the two clouds are (centres and spreads).
// The scoreboard shows FID (lower is better), CLIP score (how well each image matches its prompt) and an Elo rating from people choosing between pairs.
// Break it: compute FID from only 50 images (the ranking flips from run to run), trust FID alone (a model that ignores the prompt wins), trust CLIP alone (a model that writes the prompt's words into the picture wins).
const MODELS = [
  { k: 'A', n: 'Model A', c: '#3D6BD6', mu: [0.3, 0.15], sd: 0.95, clip: 0.31, elo: 1530, note: 'balanced' },
  { k: 'B', n: 'Model B', c: '#D9483B', mu: [0.05, 0.02], sd: 0.98, clip: 0.21, elo: 1460, note: 'pretty, ignores prompts' },
  { k: 'C', n: 'Model C', c: '#E3A72F', mu: [0.9, 0.6], sd: 0.75, clip: 0.36, elo: 1410, note: 'writes the words in' },
];

export default {
  slug: 'evaluation-fid-clip-score',
  title: 'Evaluating generators: FID, CLIP and people',
  description: 'One number cannot judge pictures. FID compares crowds of pictures to real ones, CLIP checks the prompt, and each is fooled by something different.',
  overview: 'No single number says how good a generator is. Fréchet Inception Distance (FID) passes real and generated images through a fixed vision network and compares the two clouds of features: how far apart their centres are and how different their spreads. Lower is better, but it needs thousands of images to be stable, and it never looks at the prompt. CLIP score embeds each image and its prompt with a CLIP model and measures their similarity: good for prompt adherence, but it can be fooled. Human preference, gathered as pairwise choices and turned into Elo ratings, is the ground truth but slow and costly. Used together, each covers the others\' blind spots.',
  keywords: ['fid score', 'clip score', 'evaluating image generation', 'elo human preference', 'generative model metrics'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.6, 0], dir: [0.12, 0.85, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { show: 'A', n: 5000, metric: 'all', seed: 1 };
    const ink = '#151827';
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- the feature dish ---------- */
    const DX = -1.6, DR = 1.05, dish = P.cyl(DR + 0.08, 0.06, '#FBF8F1', { seg: 48 }); dish.position.set(DX, 0.12, 0.15); floor.add(dish);

    const NPTS = 140, real = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshLambertMaterial({ color: '#8E91A3' }), NPTS), gen = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), NPTS);
    [real, gen].forEach(m => { m.userData.noFit = true; m.frustumCulled = false; m.layers.set(1); floor.add(m); });
    const ringR = P.tube([V(), V(1, 0, 0)], 0.01, '#5B6178'), ringG = P.tube([V(), V(1, 0, 0)], 0.012, C.indigo); [ringR, ringG].forEach(r => { r.userData.noFit = true; floor.add(r); });
    const gap = P.tube([V(), V(1, 0, 0)], 0.015, C.red); gap.userData.noFit = true; floor.add(gap);
    /* ---------- scoreboard ---------- */
    const WX = 1.4, WZ = -0.45, WW = 3.4, WH = 2.0;
    const wall = P.box(WW, WH, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(WX, 0.12, WZ); floor.add(wall);

    const GZ = WZ + 0.05, MET = [['FID', 'lower is better'], ['CLIP score', 'matches the prompt'], ['People (Elo)', 'pairwise votes']];
    const colX = j => WX - WW / 2 + 0.6 + j * 1.1;
    MET.forEach(([n, sub], j) => {       });
    const bars = MODELS.map((m, i) => MET.map((_, j) => { const mm = new THREE.MeshLambertMaterial({ color: m.c }), b = P.box(0.26, 1, 0.03, m.c, { r: 0.01, material: mm }); b.userData.noFit = true; b.layers.set(1); floor.add(b); return { b, mm, x: colX(j) - 0.3 + i * 0.3 }; }));
    const winT = MET.map((_, j) => {    return t; });
    const keyT = MODELS.map((m, i) => {    const sw = P.box(0.1, 0.02, 0.1, m.c, { r: 0.02 }); sw.position.set(WX - 1.1 + i * 1.15 - 0.5, 0.12, WZ + 0.55); floor.add(sw); return t; });
    /* ---------- maths ---------- */
    const rngFor = seed => { let s = seed * 7919 + 13; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
    const gauss = r => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(6.2832 * r());
    function fid(m, n, seed) {
      // true FID from means and spreads, plus estimation noise that shrinks with sample count
      const d2 = (m.mu[0]) ** 2 + (m.mu[1]) ** 2, sp = 2 * (1 + m.sd ** 2 - 2 * m.sd);
      const r = rngFor(seed + m.k.charCodeAt(0)), noise = gauss(r) * 6 / Math.sqrt(n / 50) + 4 * 50 / n;
      return Math.max(0.5, (d2 + sp) * 40 + 4 + noise);
    }
    let R = null;
    function draw() {
      const m = MODELS.find(x => x.k === st.show), r = rngFor(5), rg = rngFor(7);
      const Z = 0.15, sc = DR * 0.42;
      for (let i = 0; i < NPTS; i++) { const a = gauss(r), b = gauss(r); dummy.position.set(DX + a * sc, 0.2, Z + b * sc); dummy.updateMatrix(); real.setMatrixAt(i, dummy.matrix); const c2 = gauss(rg), d = gauss(rg); dummy.position.set(DX + (m.mu[0] + c2 * m.sd) * sc, 0.22, Z + (m.mu[1] + d * m.sd) * sc); dummy.updateMatrix(); gen.setMatrixAt(i, dummy.matrix); gen.setColorAt(i, col.set(m.c)); }
      real.instanceMatrix.needsUpdate = true; gen.instanceMatrix.needsUpdate = true; gen.instanceColor.needsUpdate = true;
      const ring = (mesh, cx, cz, rr) => { mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([...Array(33)].map((_, k) => V(cx + Math.cos(k / 32 * 6.283) * rr, 0.24, cz + Math.sin(k / 32 * 6.283) * rr)), true), 48, 0.012, 4, true); };
      ring(ringR, DX, Z, sc * 1.6); ring(ringG, DX + m.mu[0] * sc, Z + m.mu[1] * sc, sc * 1.6 * m.sd); ringG.material.color.set(m.c);
      gap.geometry.dispose(); gap.geometry = new THREE.TubeGeometry(new THREE.LineCurve3(V(DX, 0.25, Z), V(DX + m.mu[0] * sc + 0.001, 0.25, Z + m.mu[1] * sc)), 2, 0.015, 4, false);
      const F = MODELS.map(x => fid(x, st.n, st.seed)), CL = MODELS.map(x => x.clip), EL = MODELS.map(x => x.elo);
      const vals = [F, CL, EL], norm = [v => 0.08 + Math.min(1, v / 60) * 1.15, v => 0.08 + (v - 0.15) / 0.25 * 1.15, v => 0.08 + (v - 1350) / 220 * 1.15];
      const show = [st.metric === 'all' || st.metric === 'fid', st.metric === 'all' || st.metric === 'clip', st.metric === 'all'];
      MODELS.forEach((x, i) => MET.forEach((_, j) => { const B = bars[i][j], h = Math.max(0.02, norm[j](vals[j][i])); B.b.visible = show[j]; B.b.scale.y = h; B.b.position.set(B.x, 0.12 + 0.35, GZ); }));
      const best = [F.indexOf(Math.min(...F)), CL.indexOf(Math.max(...CL)), EL.indexOf(Math.max(...EL))];
      const pick = st.metric === 'fid' ? best[0] : st.metric === 'clip' ? best[1] : best[2];
      R = { F, best, pick };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Show in the dish', options: MODELS.map(m => m.n), get: () => MODELS.findIndex(m => m.k === st.show), act: i => { st.show = MODELS[i].k; draw(); } },
      { type: 'buttons', label: 'Images used for FID', options: ['50', '5,000'], get: () => (st.n === 50 ? 0 : 1), act: i => { st.n = i ? 5000 : 50; draw(); } },
      { type: 'button', label: 'Recompute FID with fresh samples', short: 'Rerun', act: () => { st.seed++; draw(); } },
      { type: 'buttons', label: 'Choose the winner by', options: ['All three', 'FID only', 'CLIP only'], get: () => ['all', 'fid', 'clip'].indexOf(st.metric), act: i => { st.metric = ['all', 'fid', 'clip'][i]; draw(); } },
    ];
    const readouts = [
      { label: 'Chosen model', get: () => ({ v: MODELS[R.pick].n, sub: MODELS[R.pick].note, good: R.pick === 0, bad: R.pick !== 0 }) },
      { label: 'FID, model A', get: () => ({ v: R.F[0].toFixed(1), sub: `${st.n.toLocaleString()} images`, bad: st.n < 1000 }) },
      { label: 'FID ranking', get: () => ({ v: R.F.map((v, i) => [v, MODELS[i].k]).sort((a, b) => a[0] - b[0]).map(x => x[1]).join(' < '), sub: 'best first' }) },
    ];
    const labels = [
      { name: 'dish', t: 'Feature space', d: 'FID: distance between the clouds', icon: 'target', atV: V(DX - DR, 0.2, 0.15) },
      { name: 'board', t: 'Three measures', d: 'FID, CLIP score, people', icon: 'scale', atV: V(WX + WW / 2, 0.12 + WH * 0.6, WZ) },
    ];
    const reset = () => { Object.assign(st, { show: 'A', n: 5000, metric: 'all', seed: 1 }); draw(); };
    const breaks = [
      { label: 'FID from 50 images', hint: 'Then press Rerun', on: () => { reset(); st.n = 50; st.seed = 4; draw(); }, off: reset },
      { label: 'Trust FID alone', hint: 'Pick the lowest FID', on: () => { reset(); st.metric = 'fid'; st.show = 'B'; draw(); }, off: reset },
      { label: 'Trust CLIP alone', hint: 'Pick the highest CLIP score', on: () => { reset(); st.metric = 'clip'; st.show = 'C'; draw(); }, off: reset },
    ];
    function status() {
      const rank = R.F.map((v, i) => [v, MODELS[i].k]).sort((a, b) => a[0] - b[0]).map(x => x[1]).join(' < ');
      if (st.n < 1000) return { ok: false, msg: `<b>Too few images to trust.</b> FID estimates the clouds\' centres and spreads, and with 50 images those estimates wobble: this run ranks ${rank}, and pressing Rerun can flip it. It is also biased upwards at small sizes. Use thousands of images, and the same number for every model.` };
      if (st.metric === 'fid' && R.pick !== 0) return { ok: false, msg: `<b>The prettiest model wins, and it ignores prompts.</b> Model B\'s images sit right on top of the real photos in feature space, so it has the best FID, but FID never looks at the prompt: ask for Kilimanjaro at sunrise and it may draw a beach. Its CLIP score and the people\'s votes show it.` };
      if (st.metric === 'clip' && R.pick !== 0) return { ok: false, msg: `<b>The model that writes the words wins.</b> Model C paints words from the prompt into its posters, and CLIP, which also reads text in images, scores them highest. People rank it last, and its cloud sits away from real photos, so its FID is poor. One number can be gamed; three are much harder to fool.` };
      return { ok: true, msg: `<b>Model A, weighing all three.</b> Its images sit close to real photos in feature space (FID ${R.F[0].toFixed(1)}, a little behind model B), match their prompts well (CLIP ${MODELS[0].clip}), and people choose it most often (Elo ${MODELS[0].elo}). Each measure catches what the others miss.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Three poster models', home: true, say: 'Three models make travel posters from prompts like "sunrise over Kilimanjaro, giraffes in front". Which is best?', act: m => m.set({ show: 'A', n: 5000, metric: 'all', seed: 1 }) },
    { t: 'FID', home: true, say: 'FID turns every image into a point in a feature space and compares the cloud of generated images with real photos: how far apart the centres are, and how different the spreads.', act: m => m.set({ show: 'C' }) },
    { t: 'CLIP score', home: true, say: 'CLIP score checks each image against its own prompt. FID never looks at the prompt at all.', act: m => m.set({ show: 'A' }) },
    { t: 'People', home: true, say: 'People choosing between pairs of posters give the ground truth, turned into Elo ratings. It is slow and costly, so it is used sparingly.', act: m => m.set({}) },
    { t: 'One number lies', home: true, say: 'Pick by FID alone, and model B wins: pretty pictures that ignore the prompt. Pick by CLIP alone, and model C wins by writing the words into the picture.', act: m => m.set({ metric: 'fid', show: 'B' }) },
    { t: 'Enough samples', home: true, say: 'And FID from just fifty images wobbles from run to run. Use thousands, and all three measures together.', act: m => m.set({ metric: 'all', n: 50, seed: 4 }) },
  ],
  check: [
    { q: 'What does FID compare?', options: ['The cloud of generated-image features with the cloud of real-image features', 'Each image with its prompt', 'Human votes'], answer: 0, why: 'Centres and spreads of the two clouds.' },
    { q: 'What can FID not tell you?', options: ['Whether images match their prompts', 'Whether images look real', 'Anything about variety'], answer: 0, why: 'It never sees the prompt.' },
    { q: 'Why use FID, CLIP score and human preference together?', options: ['Each can be fooled in ways the others catch', 'They are always identical', 'It is faster'], answer: 0, why: 'A model can game one number but rarely all three.' },
  ],
  terms: [
    ['FID', 'Fréchet Inception Distance: distance between real and generated feature distributions.'],
    ['CLIP score', 'Similarity between an image and its prompt in CLIP\'s shared space.'],
    ['Elo rating', 'A rating built from many pairwise wins and losses.'],
    ['Feature space', 'The vectors a fixed vision network produces for images.'],
    ['Sample size', 'How many images are used to compute a metric.'],
    ['Goodhart\'s law', 'When a measure becomes a target, it stops being a good measure.'],
  ],
  deeper: '<p><b>The formula.</b> FID = |μ_real − μ_gen|² + trace(Σ_real + Σ_gen − 2(Σ_real Σ_gen)^½), the distance between two Gaussians fitted to the features.</p><p><b>Newer measures.</b> Some teams use features from stronger vision models than Inception, or ask a vision-language model to check each image against a list of questions about its prompt.</p><p><b>About this machine.</b> The clouds, scores and ratings are made up to show how each measure behaves; FID here is computed from the clouds\' centres and spreads.</p>',
  code: {
    title: 'FID in a few lines and a CLIP score',
    note: 'Adapted from the course\'s evaluation lesson.',
    text: `
import numpy as np
from scipy.linalg import sqrtm

def fid(real_feats, gen_feats):
    mu1, mu2 = real_feats.mean(0), gen_feats.mean(0)
    s1, s2 = np.cov(real_feats, rowvar=False), np.cov(gen_feats, rowvar=False)
    covmean = sqrtm(s1 @ s2).real
    return ((mu1 - mu2) ** 2).sum() + np.trace(s1 + s2 - 2 * covmean)

def clip_score(img_emb, txt_emb):
    img_emb = img_emb / np.linalg.norm(img_emb, axis=1, keepdims=True)
    txt_emb = txt_emb / np.linalg.norm(txt_emb, axis=1, keepdims=True)
    return (img_emb * txt_emb).sum(1).mean()       # average image-prompt similarity
`,
  },
};
