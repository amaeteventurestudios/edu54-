// 3D generation: "a carved wooden giraffe" becomes a 3D object. A multi-view diffusion model draws the object from four camera angles at once, so the views agree;
// a reconstruction step then fits a 3D shape (here, simple blocks) that matches all four. The carving turns on a turntable beside the four views.
// Break it: draw each view separately (every view puts the face towards the camera: a two-headed carving, the Janus problem), use one view only (the back is invented flat),
// forget to tell the model which angle each view is (the views disagree and the shape comes out blurred and lumpy).
const VIEWS = [{ n: 'front', a: 0 }, { n: 'left', a: Math.PI / 2 }, { n: 'back', a: Math.PI }, { n: 'right', a: -Math.PI / 2 }];

export default {
  slug: '3d-generation',
  title: '3D generation: views that agree',
  description: '"A carved wooden giraffe" becomes a 3D object. A multi-view diffusion model draws it from four angles at once so the views agree, then a reconstruction step fits a 3D shape to all four. Turn the carving on its turntable, then draw each view separately and get a two-headed giraffe, use a single view, or drop the camera angles.',
  overview: 'There is far less 3D training data than images, so most text-to-3D systems borrow from image models. Multi-view diffusion models are image models fine-tuned to draw several views of one object at known camera angles in a single pass, with attention across the views so they agree. A reconstruction step, often a fast feed-forward model or a Gaussian-splat fit, turns those views into 3D. Older methods optimised a 3D shape by asking a 2D model to score random views (score distillation), which tended to give every side a face: the Janus problem. Consistent views, known angles and enough of them are what make the shape solid.',
  keywords: ['text to 3d', 'multi view diffusion', 'janus problem', 'score distillation', '3d reconstruction from views'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.85, 0], dir: [0.15, 0.5, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 'multi', nviews: 4, cams: true, spin: 0, auto: true };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.4, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.15); S.add(base);
    const WOOD = '#8A5A2B', DARK = '#4E2E1C';
    /* ---------- the four view boards ---------- */
    const VB = 1.15, VX0 = -2.55, VZ = -0.6;
    const boards = VIEWS.map((v, i) => {
      const x = VX0 + i * (VB + 0.12), b = P.box(VB, VB + 0.3, 0.06, '#FBF8F1', { r: 0.03 }); b.position.set(x + VB / 2, 0.12, VZ); S.add(b);
      const t = S.text(v.n, { size: 0.07, weight: 800, face: 'front', color: ink }); t.position.set(x + VB / 2, 0.12 + VB + 0.14, VZ + 0.035); S.add(t);
      const grp = new THREE.Group(); grp.position.set(x + VB / 2, 0.12 + 0.12, VZ + 0.04); S.add(grp);
      return { x, b, grp, t };
    });
    const vTop = S.text('four views, drawn together', { size: 0.07, weight: 800 }); vTop.position.set(VX0 + 2 * (VB + 0.12) - 0.06, 0.12 + VB + 0.305, VZ); S.add(vTop);
    // a flat silhouette giraffe in a board group, seen from angle a, with the face turned towards the viewer when 'janus'
    function drawView(grp, a, opts) {
      while (grp.children.length) grp.remove(grp.children[0]);
      const side = Math.abs(Math.sin(a)), facing = Math.cos(a), sc = 1.1;
      const mk = (w, h, x, y, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w * sc, h * sc), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x * sc, y * sc, 0.001); m.layers.set(1); grp.add(m); return m; };
      const bodyW = 0.18 + 0.32 * side, dir = Math.sin(a) >= 0 ? 1 : -1;
      if (opts.blur) { mk(0.7, 0.62, 0, 0.36, '#B08A62'); return; }
      mk(bodyW, 0.18, 0, 0.35, WOOD);
      [-1, 1].forEach(s2 => { mk(0.04, 0.26, s2 * bodyW * 0.38, 0.13, DARK); });
      const neckX = opts.janus ? 0 : dir * bodyW * 0.42 * side, headX = opts.janus ? 0 : dir * (bodyW * 0.42 + 0.08) * side;
      mk(0.06, 0.36, neckX, 0.6, WOOD);
      if (opts.janus || facing > 0.3) { mk(0.14, 0.1, headX, 0.82, WOOD); mk(0.025, 0.025, headX - 0.03, 0.83, '#151827'); mk(0.025, 0.025, headX + 0.03, 0.83, '#151827'); }
      else if (facing < -0.3) mk(0.12, 0.1, headX, 0.82, DARK);
      else mk(0.16, 0.08, headX + dir * 0.04, 0.82, WOOD);
      if (opts.flatBack) { grp.children.forEach(c => c.material.color.lerp(new THREE.Color('#D9C8A8'), 0.7)); }
    }
    /* ---------- the 3D carving on a turntable ---------- */
    const TX = 1.35, TZ = 0.55, turn = P.cyl(0.7, 0.06, '#5B4636', { seg: 32 }); turn.position.set(TX, 0.12, TZ); S.add(turn);
    const carv = new THREE.Group(); carv.position.set(TX, 0.18, TZ); carv.scale.setScalar(1.35); S.add(carv);
    const tT = S.text('the reconstructed carving', { size: 0.07, weight: 800, color: ink }); tT.position.set(TX, 0.13, TZ + 0.82); S.add(tT);
    function build3D(opts) {
      while (carv.children.length) carv.remove(carv.children[0]);
      const add = (m) => { m.userData.noFit = true; carv.add(m); return m; };
      const wood = opts.blur ? '#B08A62' : WOOD;
      const body = add(P.box(0.5, 0.22, 0.24, wood, { r: opts.blur ? 0.11 : 0.05 })); body.position.set(0, 0.42, 0);
      [[-0.18, -0.08], [-0.18, 0.08], [0.18, -0.08], [0.18, 0.08]].forEach(([x, z]) => { const l = add(P.box(0.05, 0.42, 0.05, DARK, { r: 0.02 })); l.position.set(x, 0, z); });
      const neck = add(P.box(0.08, 0.45, 0.08, wood, { r: 0.03 })); neck.position.set(0.2, 0.62, 0); neck.rotation.z = -0.25;
      const head = add(P.box(0.18, 0.1, 0.1, wood, { r: 0.03 })); head.position.set(0.3, 1.04, 0);
      if (opts.janus) { const n2 = add(P.box(0.08, 0.45, 0.08, wood, { r: 0.03 })); n2.position.set(-0.2, 0.62, 0); n2.rotation.z = 0.25; const h2 = add(P.box(0.18, 0.1, 0.1, wood, { r: 0.03 })); h2.position.set(-0.3, 1.04, 0); }
      if (opts.flatBack) { const slab = add(P.box(0.56, 0.3, 0.02, '#D9C8A8', { r: 0 })); slab.position.set(0, 0.42, -0.13); body.scale.z = 0.5; body.position.z = 0.06; }
      if (opts.blur) { [-0.1, 0.12].forEach(x => { const lump = add(P.ball(0.12, '#B08A62')); lump.position.set(x, 0.6, 0.05); }); }
    }
    /* ---------- the model parts ---------- */
    const part = (x, c, name, sub) => { const m = new THREE.MeshLambertMaterial({ color: c }), b = P.box(1.2, 0.3, 0.42, c, { r: 0.05, material: m }); b.position.set(x, 0.12, 0.95); S.add(b); const t = S.text(name, { size: 0.065, weight: 800, face: 'front', color: '#FFFFFF' }); t.position.set(x, 0.32, 1.165); S.add(t); const u = S.text(sub, { size: 0.05, weight: 800, face: 'front', color: '#FFFFFF', maxW: 1.15 }); u.position.set(x, 0.2, 1.165); S.add(u); return { m, u }; };
    const pMv = part(-2.2, C.indigo, 'view generator', ''), pRec = part(-0.8, C.teal, 'reconstruction', 'fit a 3D shape to the views');
    let R = null;
    function draw() {
      const janus = st.mode === 'separate', blur = !st.cams && st.mode === 'multi', flatBack = st.nviews === 1;
      boards.forEach((b, i) => {
        const used = i < st.nviews; b.grp.visible = used; b.b.material && 0;
        if (used) drawView(b.grp, VIEWS[i].a, { janus: janus && i !== 0 ? true : janus && i === 0, blur: blur && i > 0, flatBack: false });
        b.t.userData.set(used ? VIEWS[i].n : `${VIEWS[i].n}: not drawn`);
      });
      build3D({ janus, blur, flatBack });
      pMv.u.userData.set(st.mode === 'multi' ? `${st.nviews} view${st.nviews > 1 ? 's' : ''} at once${st.cams ? ', angles given' : ', no angles'}` : 'each view on its own');
      pMv.m.color.set(st.mode === 'multi' && st.cams ? C.indigo : '#9A9AA6');
      R = { janus, blur, flatBack };
    }
    draw();
    function update(dt) { if (st.auto) { st.spin += dt * 0.6; carv.rotation.y = st.spin; } }
    const controls = [
      { type: 'buttons', label: 'How the views are drawn', options: ['Together (multi-view)', 'Each on its own'], get: () => (st.mode === 'multi' ? 0 : 1), act: i => { st.mode = i ? 'separate' : 'multi'; draw(); } },
      { type: 'buttons', label: 'Number of views', options: ['1', '2', '4'], get: () => [1, 2, 4].indexOf(st.nviews), act: i => { st.nviews = [1, 2, 4][i]; draw(); } },
      { type: 'toggle', label: 'Tell the model each view\'s camera angle', short: 'angles', get: () => st.cams, set: v => { st.cams = v; draw(); } },
      { type: 'toggle', label: 'Spin the carving', short: 'spin', get: () => st.auto, set: v => { st.auto = v; } },
    ];
    const readouts = [
      { label: 'Heads', get: () => ({ v: R.janus ? '2' : '1', good: !R.janus, bad: R.janus }) },
      { label: 'Back of the carving', get: () => ({ v: R.flatBack ? 'flat, guessed' : st.nviews === 2 ? 'partly seen' : 'seen', good: st.nviews === 4, bad: R.flatBack }) },
      { label: 'Shape', get: () => ({ v: R.blur ? 'lumpy' : 'crisp', sub: st.cams ? 'angles known' : 'angles unknown', good: !R.blur, bad: R.blur }) },
    ];
    const labels = [
      { name: 'views', t: 'Four camera views', d: 'Drawn together so they agree', icon: 'eye', atV: V(VX0 - 0.1, 0.12 + VB * 0.6, VZ) },
      { name: 'carving', t: 'The 3D result', d: 'Fitted to every view', icon: 'box', atV: V(TX + 0.75, 0.5, TZ) },
      { name: 'parts', t: 'Generate, then reconstruct', d: 'Two stages', icon: 'link', atV: V(-2.85, 0.25, 0.95) },
    ];
    const reset = () => { Object.assign(st, { mode: 'multi', nviews: 4, cams: true, auto: true }); draw(); };
    const breaks = [
      { label: 'Each view on its own', hint: 'An ordinary image model, four times', on: () => { reset(); st.mode = 'separate'; draw(); }, off: reset },
      { label: 'A single view', hint: 'Front only', on: () => { reset(); st.nviews = 1; draw(); }, off: reset },
      { label: 'No camera angles', hint: 'The model guesses each angle', on: () => { reset(); st.cams = false; draw(); }, off: reset },
    ];
    function status() {
      if (R.janus) return { ok: false, msg: `<b>A two-headed giraffe.</b> An ordinary image model, asked for "a carved giraffe" four times, draws the most typical picture each time, and the most typical picture faces the camera. Every view shows a face, so the reconstruction gives the carving a head at both ends. This is the Janus problem; drawing the views together, with attention across them, prevents it.` };
      if (R.flatBack) return { ok: false, msg: `<b>The back is a guess.</b> From the front view alone, nothing says what the far side looks like, so the reconstruction flattens it into a pale slab. More views, or a model trained to imagine the hidden sides, fill it in.` };
      if (R.blur) return { ok: false, msg: `<b>Lumpy and blurred.</b> Without being told the camera angle for each view, the model draws views at slightly wrong angles, so they disagree about where the neck and legs are. The reconstruction can only average them into soft lumps.` };
      return { ok: true, msg: `<b>One giraffe, solid from every side.</b> The ${st.nviews} views are drawn in one pass at known angles, with attention between them, so they agree; the reconstruction fits a single shape that matches them all. Spin it: one head, four legs, a carved back.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Text to 3D', home: true, say: 'The prompt is "a carved wooden giraffe". There is little 3D training data, so most systems start from an image model.', act: m => m.set({ mode: 'multi', nviews: 4, cams: true, auto: true }) },
    { t: 'Views that agree', home: true, say: 'A multi view model draws the carving from four camera angles at once, with attention across the views so they agree.', act: m => m.set({}) },
    { t: 'Reconstruct', home: true, say: 'A reconstruction step then fits one 3D shape that matches all four views. Spin it on the turntable.', act: m => m.set({}) },
    { t: 'The Janus problem', home: true, say: 'Draw each view on its own, and every view shows the giraffe facing the camera. The reconstruction gets a head at both ends.', act: m => m.set({ mode: 'separate' }) },
    { t: 'Too few views', home: true, say: 'From one view only, the back is a guess, and comes out flat.', act: m => m.set({ mode: 'multi', nviews: 1 }) },
    { t: 'Know the angles', home: true, say: 'And without being told the camera angles, the views disagree, and the shape comes out lumpy.', act: m => m.set({ nviews: 4, cams: false }) },
  ],
  check: [
    { q: 'Why do many text-to-3D systems start from image models?', options: ['There is far more image training data than 3D data', 'Images are 3D already', 'It is required by law'], answer: 0, why: 'They reuse what image models know.' },
    { q: 'What is the Janus problem?', options: ['Every view shows a face, giving the object faces on several sides', 'The object is too small', 'The colours are wrong'], answer: 0, why: 'Typical pictures face the camera.' },
    { q: 'Why give the model each view\'s camera angle?', options: ['So the views agree on where every part is', 'To make it faster', 'To add colour'], answer: 0, why: 'Disagreeing views reconstruct as blur.' },
  ],
  terms: [
    ['Multi-view diffusion', 'An image model fine-tuned to draw several consistent views of one object.'],
    ['Reconstruction', 'Fitting a 3D shape to a set of views.'],
    ['Janus problem', 'Generated 3D objects with faces on several sides.'],
    ['Score distillation', 'Optimising a 3D shape so a 2D model likes its rendered views.'],
    ['Camera conditioning', 'Telling the model the angle of each view.'],
    ['Gaussian splats', 'A fast 3D representation often used for reconstruction.'],
  ],
  deeper: '<p><b>Feed-forward reconstruction.</b> Newer models go straight from views to a 3D representation in one pass, taking seconds instead of the minutes or hours that optimisation needed.</p><p><b>Native 3D models.</b> A few systems train directly on large 3D collections, generating meshes or splats without going through images at all.</p><p><b>About this machine.</b> The views and carving are drawn from simple shapes to show each setting\'s typical effect.</p>',
  code: {
    title: 'Multi-view generation, then reconstruction',
    note: 'Adapted from the course\'s 3D generation lesson.',
    text: `
import torch

def text_to_3d(mv_model, reconstructor, prompt, angles=(0, 90, 180, 270)):
    cams = torch.tensor(angles, dtype=torch.float32)
    views = mv_model.sample(prompt, cameras=cams)     # all views in one pass, attending to each other
    return reconstructor(views, cams)                  # e.g. fit Gaussian splats to the views

def janus_check(views, face_detector):
    faces = [face_detector(v) for v in views]
    return sum(faces) > 1                              # a face on more than one side is suspicious
`,
  },
};
