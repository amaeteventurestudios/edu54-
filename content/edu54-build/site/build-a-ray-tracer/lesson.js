// Build your own ray tracer: one ray per sample leaves the camera through each pixel, hits the nearest sphere, and bounces: diffuse surfaces
// scatter it in a random direction around the normal, the metal sphere mirrors it. Each bounce multiplies the colour by the surface's albedo;
// rays that escape take the sky's colour. Averaging several samples per pixel removes noise; gamma correction turns the linear average into
// screen brightness; ignoring hits very close to the surface prevents shadow acne. All pixels are traced live with a seeded random generator.
const RES = { low: [24, 12], mid: [36, 18], high: [48, 24] };
const SPHERES = [
  { c: [0, -100.5, -1], r: 100, alb: [0.78, 0.72, 0.55], metal: false },
  { c: [0, 0, -1.2], r: 0.5, alb: [0.85, 0.42, 0.3], metal: false },
  { c: [-1.05, 0, -1.3], r: 0.5, alb: [0.85, 0.85, 0.88], metal: true },
  { c: [1.05, 0, -1.25], r: 0.5, alb: [0.15, 0.6, 0.52], metal: false },
];
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = a => { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; };
function hit(o, d, tmin) {
  let best = null;
  for (const s of SPHERES) {
    const oc = [o[0] - s.c[0], o[1] - s.c[1], o[2] - s.c[2]];
    const b = dot(oc, d), c = dot(oc, oc) - s.r * s.r, disc = b * b - c;
    if (disc < 0) continue;
    const sq = Math.sqrt(disc);
    let t = -b - sq;
    if (t <= tmin) t = -b + sq;
    if (t <= tmin) continue;
    if (!best || t < best.t) best = { t, s };
  }
  return best;
}
function trace(o, d, depth, tmin, rng, stats) {
  let col = [1, 1, 1];
  for (let k = 0; k < depth; k++) {
    stats.rays++;
    const h = hit(o, d, tmin);
    if (!h) { const t = 0.5 * (d[1] + 1); const sky = [(1 - t) + t * 0.5, (1 - t) + t * 0.7, 1]; return [col[0] * sky[0], col[1] * sky[1], col[2] * sky[2]]; }
    const p = [o[0] + h.t * d[0], o[1] + h.t * d[1], o[2] + h.t * d[2]];
    const n = unit([p[0] - h.s.c[0], p[1] - h.s.c[1], p[2] - h.s.c[2]]);
    let nd;
    if (h.s.metal) { const k2 = 2 * dot(d, n); nd = unit([d[0] - k2 * n[0] + 0.08 * (rng() - 0.5), d[1] - k2 * n[1] + 0.08 * (rng() - 0.5), d[2] - k2 * n[2] + 0.08 * (rng() - 0.5)]); }
    else { const z = 2 * rng() - 1, a = 2 * Math.PI * rng(), r = Math.sqrt(1 - z * z); nd = [n[0] + r * Math.cos(a), n[1] + r * Math.sin(a), n[2] + z]; const l = Math.hypot(...nd); nd = l < 1e-8 ? n : nd.map(x => x / l); }
    col = [col[0] * h.s.alb[0], col[1] * h.s.alb[1], col[2] * h.s.alb[2]];
    const off = tmin > 0 ? 0 : (rng() < 0.7 ? -1e-4 : 1e-4);
    o = [p[0] + off * n[0], p[1] + off * n[1], p[2] + off * n[2]]; d = nd;
  }
  return [0, 0, 0];
}
function render(o, spp) {
  const [W, H] = RES[o.res], img = new Array(W * H), stats = { rays: 0 };
  const aspect = W / H, vh = 2 * Math.tan(Math.PI / 6), vw = vh * aspect;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const rng = mulberry((y * W + x) * 7919 + spp * 131 + o.depth * 17);
    let acc = [0, 0, 0];
    for (let s = 0; s < spp; s++) {
      const u = (x + (spp > 1 ? rng() : 0.5)) / W, v = (y + (spp > 1 ? rng() : 0.5)) / H;
      const d = unit([(u - 0.5) * vw, (0.5 - v) * vh + 0.05, -1]);
      const c = trace([0, 0.15, 0.6], d, o.depth, o.eps ? 0.001 : 0, rng, stats);
      acc = [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]];
    }
    const lin = acc.map(a => a / spp);
    img[y * W + x] = lin.map(a => Math.min(1, o.gamma ? Math.sqrt(a) : a));
  }
  return { W, H, img, rays: stats.rays };
}

export default {
  slug: 'build-a-ray-tracer',
  title: 'Build your own ray tracer',
  description: 'Trace light backwards from a camera, one ray per sample through every pixel. Rays hit the nearest sphere and bounce, and more samples mean less noise.',
  overview: 'A ray tracer makes a picture by following light backwards, from the eye into the scene. For each pixel it shoots a ray from the camera through that pixel and finds the nearest object it hits; for a sphere that is a quadratic equation whose smaller positive root is the distance. What happens next depends on the surface. A matte, or diffuse, surface scatters light in all directions, so the ray bounces off in a random direction around the surface normal and the colour is multiplied by the surface\'s albedo, the share of light it reflects. A metal surface mirrors the ray about the normal, with a little fuzz. A ray that escapes takes the colour of the sky, and a ray that bounces too many times is treated as black. Because the bounces are random, one sample per pixel is noisy; averaging many samples, each through a slightly different point in the pixel, converges on the true image and smooths jagged edges too, with noise falling as one over the square root of the sample count. Two small details matter. Screens expect gamma-encoded values, so the linear average must be brightened, roughly by a square root, or the image looks too dark. And a bounced ray starting exactly on the surface can hit that same surface again because of rounding, speckling it with dark spots called shadow acne; ignoring hits closer than a small epsilon fixes it. Films and games now use the same path-tracing ideas, with clever sampling and denoisers. This machine traces three spheres on a sandy floor, live, into a grid you can count.',
  keywords: ['build your own ray tracer', 'ray tracing in one weekend', 'path tracing', 'samples per pixel', 'gamma correction', 'shadow acne', 'diffuse reflection'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://raytracing.github.io/books/RayTracingInOneWeekend.html" target="_blank" rel="noopener">Ray Tracing in One Weekend</a> by Peter Shirley, Trevor David Black and Steve Hollasch (CC0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short path tracer, written for this lesson after Ray Tracing in One Weekend (CC0).',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { spp: 16, depth: 5, gamma: true, eps: true, res: 'mid' }, st = { ...D0 };
    const ink = '#151827', RED = '#B5462F';
    let grid = null, key = '';

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color();
    const refs = {};
    const ref = () => { const k = `${st.res}|${st.depth}|${st.gamma}|${st.eps}`; if (!refs[k]) refs[k] = render({ ...st }, 48).img; return refs[k]; };

    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null, noise = 0, bright = 0;
    function draw() {
      R = render(st, st.spp);
      const rf = ref();
      noise = Math.sqrt(R.img.reduce((a, p, i) => a + ((p[0] - rf[i][0]) ** 2 + (p[1] - rf[i][1]) ** 2 + (p[2] - rf[i][2]) ** 2) / 3, 0) / R.img.length);
      bright = R.img.reduce((a, p) => a + (p[0] + p[1] + p[2]) / 3, 0) / R.img.length;
      const cell = Math.min(3.7 / R.W, 1.45 / R.H), gw = cell * R.W, gh = cell * R.H;
      if (key !== st.res) {
        if (grid) { grid.parent.remove(grid); grid.geometry.dispose(); }
        grid = new THREE.InstancedMesh(new THREE.BoxGeometry(cell * 0.92, 0.02, cell * 0.92), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), R.W * R.H);
        for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) { tmpM.makeTranslation(-0.9 - gw / 2 + cell * (x + 0.5), 0.145, -0.22 - gh / 2 + cell * (y + 0.5)); grid.setMatrixAt(y * R.W + x, tmpM); }
        grid.layers.set(1); grid.userData.noFit = true; floor.add(grid); key = st.res;
      }
      R.img.forEach((p, i) => grid.setColorAt(i, tmpC.setRGB(p[0], p[1], p[2], THREE.SRGBColorSpace)));
      grid.instanceColor.needsUpdate = true;
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.spp >= 8 && st.depth >= 3 && st.gamma && st.eps; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const SPP = [1, 2, 4, 8, 16, 32], RS = ['low', 'mid', 'high'];
    const controls = [
      { type: 'slider', label: 'Samples per pixel', min: 0, max: 5, step: 1, get: () => SPP.indexOf(st.spp), set: v => set({ spp: SPP[+v] }), fmt: v => `${SPP[+v]}` },
      { type: 'slider', label: 'Bounces', min: 1, max: 8, step: 1, get: () => st.depth, set: v => set({ depth: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Gamma correction', short: 'Gamma', get: () => st.gamma, set: v => set({ gamma: !!v }) },
      { type: 'toggle', label: 'Ignore hits right at the surface', short: 'Epsilon', get: () => st.eps, set: v => set({ eps: !!v }) },
      { type: 'buttons', label: 'Resolution', options: ['24 × 12', '36 × 18', '48 × 24'], get: () => RS.indexOf(st.res), act: i => set({ res: RS[i] }) },
    ];
    const readouts = [
      { label: 'Noise', get: () => ({ v: noise.toFixed(3), sub: 'against 48 samples', good: noise < 0.06, bad: noise > 0.1 }) },
      { label: 'Rays', get: () => ({ v: R.rays.toLocaleString('en'), sub: 'traced', good: true, bad: false }) },
      { label: 'Brightness', get: () => ({ v: `${Math.round(bright * 100)}%`, sub: 'average pixel', good: bright > 0.5, bad: bright < 0.4 }) },
    ];
    const labels = [
      { name: 'g', t: 'The picture', d: 'One square per pixel', icon: 'eye', atV: V(-2.5, 0.15, -0.22) },
      { name: 't', t: 'What it cost', d: 'Rays, noise, brightness', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One sample per pixel', hint: 'noisy', on: () => set({ ...D0, spp: 1 }), off: reset },
      { label: 'Allow one bounce only', hint: 'no indirect light', on: () => set({ ...D0, depth: 1 }), off: reset },
      { label: 'Skip gamma correction', hint: 'too dark', on: () => set({ ...D0, gamma: false }), off: reset },
      { label: 'Let rays hit their own surface', hint: 'shadow acne', on: () => set({ ...D0, eps: false }), off: reset },
    ];
    function status() {
      if (st.depth < 3) return { ok: false, msg: `<b>With ${st.depth === 1 ? 'one bounce' : 'two bounces'}, any ray that hits a sphere ${st.depth === 1 ? 'is cut off at once and turns black, so every surface is black' : 'rarely reaches the sky, so shadows and undersides go black'}: brightness ${Math.round(bright * 100)}%.</b> Allow a few bounces so light can reach surfaces indirectly.` };
      if (!st.eps) return { ok: false, msg: `<b>Bounced rays start exactly on the surface, and rounding lets many of them hit that same surface again: the spheres are speckled with shadow acne and brightness drops to ${Math.round(bright * 100)}%.</b> Ignore hits closer than a small distance, such as 0.001.` };
      if (!st.gamma) return { ok: false, msg: `<b>The linear average went straight to the screen, which expects gamma-encoded values, so the picture looks too dark: brightness ${Math.round(bright * 100)}%.</b> Take the square root of each channel before display, a simple gamma of 2.` };
      if (st.spp < 8) return { ok: false, msg: `<b>With ${st.spp} sample${st.spp > 1 ? 's' : ''} per pixel the random bounces show as grain: noise ${noise.toFixed(3)} against a 48-sample reference.</b> Average more samples; noise falls as one over the square root of the count.` };
      return { ok: true, msg: `<b>${st.spp} samples per pixel, up to ${st.depth} bounces, gamma corrected and with acne prevented: ${R.rays.toLocaleString('en')} rays, noise ${noise.toFixed(3)} against the reference.</b> Doubling the samples costs twice the rays and cuts noise by only about 30%.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Rays from the eye', home: true, say: 'For each pixel, shoot a ray from the camera and find the nearest sphere it hits.', act: m => m.set({ spp: 1, depth: 1, gamma: true, eps: true, res: 'mid' }) },
    { t: 'Bounce', home: true, say: 'Matte surfaces scatter the ray in a random direction; metal mirrors it. Each bounce takes some colour.', act: m => m.set({ spp: 1, depth: 5, gamma: true, eps: true, res: 'mid' }) },
    { t: 'Average samples', home: true, say: 'One random path per pixel is grainy. Average many, and the noise fades.', act: m => m.set({ spp: 16, depth: 5, gamma: true, eps: true, res: 'mid' }) },
    { t: 'Gamma', home: true, say: 'Screens expect gamma-encoded values. Without correction, the picture is too dark.', act: m => m.set({ spp: 16, depth: 5, gamma: false, eps: true, res: 'mid' }) },
    { t: 'Shadow acne', home: true, say: 'A bounced ray can hit its own surface by rounding. Ignore hits right at the surface.', act: m => m.set({ spp: 16, depth: 5, gamma: true, eps: false, res: 'mid' }) },
    { t: 'A clean picture', home: true, say: 'Enough samples, a few bounces, gamma and an epsilon. That is a ray tracer.', act: m => m.set({ spp: 32, depth: 5, gamma: true, eps: true, res: 'high' }) },
  ],
  check: [
    { q: 'Why average many samples per pixel?', options: ['Random bounces are noisy; averages converge', 'To make it faster', 'To add colour'], answer: 0, why: 'Noise falls as one over root n.', hint: 'Try One sample per pixel.' },
    { q: 'What causes shadow acne?', options: ['Bounced rays hitting their own surface by rounding', 'Too few spheres', 'Gamma'], answer: 0, why: 'Ignore hits closer than an epsilon.', hint: 'Try Let rays hit their own surface.' },
    { q: 'Why take a square root before display?', options: ['Screens expect gamma-encoded values', 'To reduce noise', 'To save rays'], answer: 0, why: 'Linear values look too dark.', hint: 'Try Skip gamma correction.' },
  ],
  terms: [
    ['Ray', 'A starting point and a direction.'],
    ['Albedo', 'The share of light a surface reflects, per colour.'],
    ['Diffuse', 'Scattering light in all directions, like matte paint.'],
    ['Samples per pixel', 'How many random rays are averaged for each pixel.'],
    ['Gamma', 'The curve screens use to map stored values to brightness.'],
    ['Shadow acne', 'Dark speckles from rays re-hitting their own surface.'],
  ],
  deeper: '<p><b>Glass.</b> Refraction bends rays by Snell\'s law, and a sphere of glass both reflects and refracts by an amount set by the angle.</p><p><b>Faster.</b> Bounding volume hierarchies avoid testing every object, and importance sampling sends rays where the light is.</p><p><b>About this machine.</b> Every pixel is traced by this lesson\'s own code in your browser.</p>',
  code: {
    title: 'The heart of a path tracer',
    note: 'Our own short version, after Ray Tracing in One Weekend.',
    text: `
def ray_color(ray, world, depth):
    if depth <= 0:
        return Color(0, 0, 0)
    hit = world.hit(ray, t_min=0.001, t_max=float("inf"))   # epsilon prevents acne
    if hit:
        scattered, attenuation = hit.material.scatter(ray, hit)
        return attenuation * ray_color(scattered, world, depth - 1)
    t = 0.5 * (ray.direction.unit().y + 1)
    return (1 - t) * Color(1, 1, 1) + t * Color(0.5, 0.7, 1.0)   # sky

def pixel(x, y, samples):
    total = sum((ray_color(camera.ray(x + random(), y + random()), world, 5)
                 for _ in range(samples)), Color(0, 0, 0))
    return (total / samples).sqrt()                          # gamma 2
`,
  },
};
