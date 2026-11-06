// Build your own software renderer: a cube and a pyramid are projected with a perspective divide and rasterised into a grid of pixels,
// one triangle at a time, using barycentric coordinates. A depth buffer keeps the nearest surface at each pixel; back-face culling skips
// triangles facing away (decided by the winding of their corners); flat shading lights each face by the dot product of its normal with
// the light. Every pixel shown is computed live by this file's rasteriser.
const CUBE_V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
const CUBE_F = [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]];
const PYR_V = [[-0.9, -1, -0.9], [0.9, -1, -0.9], [0.9, -1, 0.9], [-0.9, -1, 0.9], [0, 0.9, 0]];
const PYR_F = [[0, 1, 2], [0, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]];
const RES = { low: [18, 9], mid: [36, 18], high: [54, 27] };
function render(o) {
  const [W, H] = RES[o.res], img = Array(W * H).fill(null), depth = Array(W * H).fill(Infinity);
  const light = [-0.5, 0.7, -0.6], ll = Math.hypot(...light), L = light.map(x => x / ll);
  const tris = [];
  const add = (verts, faces, off, rot, col) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    const vs = verts.map(([x, y, z]) => { const X = x * c + z * s, Z = -x * s + z * c; return [X + off[0], y + off[1], Z + off[2]]; });
    faces.forEach(f => tris.push({ v: (o.flip ? [f[0], f[2], f[1]] : f).map(i => vs[i]), col }));
  };
  add(CUBE_V, CUBE_F, [1.1, -1.9, 6.5], o.angle, [224, 122, 95]);
  add(PYR_V, PYR_F, [-0.4, -1.6, 9.5], -o.angle * 0.7, [31, 158, 137]);
  let drawn = 0, culled = 0, written = 0;
  const f = 3.2;
  for (const t of tris) {
    const [a, b, c] = t.v;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], nl = Math.hypot(...n) || 1;
    const N = n.map(x => x / nl);
    const toCam = [-a[0], -a[1], -a[2]];
    if (o.cull && N[0] * toCam[0] + N[1] * toCam[1] + N[2] * toCam[2] <= 0) { culled++; continue; }
    drawn++;
    const lit = o.shade ? Math.max(0.18, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]) : 0.8;
    const P = t.v.map(([x, y, z]) => { const sx = o.persp ? x * f / z : x * f / 7, sy = o.persp ? y * f / z : y * f / 7; return [(sx * H / 2) + W / 2, H * 0.04 - sy * H / 2, z]; });
    const minX = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), maxX = Math.min(W - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
    const minY = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), maxY = Math.min(H - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
    const area = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
    if (Math.abs(area) < 1e-9) continue;
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5, py = y + 0.5;
      const w0 = ((P[1][0] - px) * (P[2][1] - py) - (P[2][0] - px) * (P[1][1] - py)) / area;
      const w1 = ((P[2][0] - px) * (P[0][1] - py) - (P[0][0] - px) * (P[2][1] - py)) / area;
      const w2 = 1 - w0 - w1;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;
      const z = w0 * P[0][2] + w1 * P[1][2] + w2 * P[2][2], k = y * W + x;
      if (o.zbuf && z >= depth[k]) continue;
      depth[k] = z; img[k] = t.col.map(ch => Math.round(ch * lit)); written++;
    }
  }
  const covered = img.filter(Boolean).length;
  return { W, H, img, drawn, culled, written, covered, tris: tris.length };
}

export default {
  slug: 'build-a-software-renderer',
  title: 'Build your own software renderer',
  description: 'Draw a cube and a pyramid into a grid of pixels with nothing but arithmetic: project each corner, fill each triangle, and keep the nearest with a depth buffer.',
  overview: 'Every 3D picture on a screen, from games to this page, comes from the same few steps, and they fit in a few hundred lines of code with no graphics library. A model is a list of corners, called vertices, and triangles that join them. First each vertex is moved into place and projected: dividing x and y by the distance z makes far things smaller, which is perspective. Then each triangle is rasterised: for every pixel in its bounding box, barycentric coordinates say how much of each corner the pixel centre is made of; if all three weights are positive the pixel lies inside the triangle, and the same weights blend the corners\' depths and colours. Triangles arrive in no particular order, so a depth buffer, or z-buffer, stores the nearest depth drawn so far at every pixel and rejects anything behind it; without it, whatever is drawn last wins. Back-face culling skips triangles facing away from the camera, which roughly halves the work for closed shapes; which way a triangle faces comes from the order of its corners, its winding, through the cross product of two edges, so a model with flipped winding is culled inside out. Flat shading lights each triangle by the dot product of its normal with the light direction, so faces turned towards the light are bright and faces turned away are dark. Graphics cards do exactly this in hardware, millions of times a frame. This machine renders a cube and a pyramid, one triangle at a time, into a grid you can count.',
  keywords: ['build your own renderer', 'rasterization', 'barycentric coordinates', 'z-buffer', 'back-face culling', 'flat shading', 'tinyrenderer'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://github.com/ssloy/tinyrenderer/wiki" target="_blank" rel="noopener">How OpenGL works: software rendering in 500 lines of code</a> by Dmitry V. Sokolov (permissive licence), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short rasteriser, written for this lesson after the ideas in tinyrenderer.',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { angle: 0.6, res: 'mid', zbuf: true, cull: true, shade: true, flip: false, persp: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', RED = '#B5462F';
    let grid = null, key = '';

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    const tmpM = new THREE.Matrix4(), tmpC = new THREE.Color(), bg = new THREE.Color('#3A3B44');

    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = render(st);
      const cell = Math.min(3.7 / R.W, 1.45 / R.H), gw = cell * R.W, gh = cell * R.H;
      if (key !== st.res) {
        if (grid) { grid.parent.remove(grid); grid.geometry.dispose(); }
        grid = new THREE.InstancedMesh(new THREE.BoxGeometry(cell * 0.9, 0.02, cell * 0.9), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), R.W * R.H);
        for (let y = 0; y < R.H; y++) for (let x = 0; x < R.W; x++) {
          tmpM.makeTranslation(-0.9 - gw / 2 + cell * (x + 0.5), 0.145, -0.22 - gh / 2 + cell * (y + 0.5));
          grid.setMatrixAt(y * R.W + x, tmpM);
        }
        grid.layers.set(1); grid.userData.noFit = true; floor.add(grid); key = st.res;
      }
      R.img.forEach((px, i) => grid.setColorAt(i, px ? tmpC.setRGB(px[0] / 255, px[1] / 255, px[2] / 255, THREE.SRGBColorSpace) : bg));
      grid.instanceColor.needsUpdate = true;
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.zbuf && st.shade && !st.flip && st.persp; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const RS = ['low', 'mid', 'high'];
    const controls = [
      { type: 'slider', label: 'Turn the shapes', min: -3.1, max: 3.1, step: 0.05, get: () => st.angle, set: v => set({ angle: +v }), fmt: v => `${Math.round(v * 57.3)}°` },
      { type: 'toggle', label: 'Depth buffer', short: 'Z-buffer', get: () => st.zbuf, set: v => set({ zbuf: !!v }) },
      { type: 'toggle', label: 'Skip faces turned away', short: 'Cull', get: () => st.cull, set: v => set({ cull: !!v }) },
      { type: 'toggle', label: 'Shade by angle to the light', short: 'Shade', get: () => st.shade, set: v => set({ shade: !!v }) },
      { type: 'toggle', label: 'Flip the triangle winding', short: 'Flip', get: () => st.flip, set: v => set({ flip: !!v }) },
      { type: 'toggle', label: 'Divide by depth (perspective)', short: 'Perspective', get: () => st.persp, set: v => set({ persp: !!v }) },
      { type: 'buttons', label: 'Resolution', options: ['18 × 9', '36 × 18', '54 × 27'], get: () => RS.indexOf(st.res), act: i => set({ res: RS[i] }) },
    ];
    const readouts = [
      { label: 'Rasterised', get: () => ({ v: `${R.drawn} of ${R.tris}`, sub: 'triangles', good: st.cull, bad: false }) },
      { label: 'Overdraw', get: () => ({ v: R.covered ? `${(R.written / R.covered).toFixed(2)}×` : '—', sub: 'writes per pixel', good: R.written / R.covered < 1.3, bad: R.written / R.covered > 1.8 }) },
      { label: 'Depth test', get: () => ({ v: st.zbuf ? 'on' : 'off', sub: 'nearest wins', good: st.zbuf, bad: !st.zbuf }) },
    ];
    const labels = [
      { name: 'g', t: 'The framebuffer', d: 'One square per pixel', icon: 'box', atV: V(-2.5, 0.15, -0.22) },
      { name: 't', t: 'What it took', d: 'Triangles, pixels, writes', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Switch off the depth buffer', hint: 'last drawn wins', on: () => set({ ...D0, zbuf: false }), off: reset },
      { label: 'Flip the triangle winding', hint: 'inside out', on: () => set({ ...D0, flip: true }), off: reset },
      { label: 'Turn off shading', hint: 'flat blobs', on: () => set({ ...D0, shade: false }), off: reset },
      { label: 'Skip the perspective divide', hint: 'no depth cue', on: () => set({ ...D0, persp: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (st.flip) return { ok: false, msg: `<b>With the winding flipped, every normal points inward: ${st.cull ? 'culling throws away the faces towards the camera and draws the far insides' : 'the front faces are lit as if they faced away'}, so the shapes look inside out.</b> Keep every triangle\'s corners in the same order, anticlockwise seen from outside.` };
      if (!st.zbuf) return { ok: false, msg: `<b>Without a depth buffer the pyramid, drawn after the cube, paints over it even where it is behind: ${r.written} writes for ${r.covered} pixels, and the last one wins.</b> Store the nearest depth at each pixel and reject anything farther.` };
      if (!st.shade) return { ok: false, msg: '<b>With one flat colour per shape, every face looks the same and the cube becomes a hexagon-shaped blob.</b> Light each face by the dot product of its normal with the light direction, so turned faces darken.' };
      if (!st.persp) return { ok: false, msg: '<b>Without dividing by depth, the far pyramid is drawn as large as the near cube and parallel edges never converge.</b> Divide x and y by z after moving the shapes into place.' };
      return { ok: true, msg: `<b>${r.tris} triangles, ${st.cull ? `${r.culled} culled as facing away, ` : ''}${r.drawn} rasterised into ${r.W} × ${r.H} pixels: ${r.written} writes for ${r.covered} pixels, the nearest kept by the depth buffer, each face lit by its angle to the light.</b> ${st.cull ? '' : 'Turn culling on to skip the hidden half of the faces.'}` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Corners and triangles', home: true, say: 'A cube and a pyramid are just lists of corners and the triangles between them.', act: m => m.set({ angle: 0.6, res: 'mid', zbuf: true, cull: true, shade: false, flip: false, persp: true }) },
    { t: 'Project', home: true, say: 'Divide each corner\'s position by its depth, so far things shrink. That is perspective.', act: m => m.set({ angle: 0.6, res: 'mid', zbuf: true, cull: true, shade: false, flip: false, persp: true }) },
    { t: 'Fill the pixels', home: true, say: 'For each pixel near a triangle, three weights say whether its centre is inside.', act: m => m.set({ angle: 0.6, res: 'low', zbuf: true, cull: true, shade: false, flip: false, persp: true }) },
    { t: 'Nearest wins', home: true, say: 'Without a depth buffer, whatever is drawn last wins, even from behind.', act: m => m.set({ angle: 0.6, res: 'mid', zbuf: false, cull: true, shade: true, flip: false, persp: true }) },
    { t: 'Light the faces', home: true, say: 'Each face is lit by its angle to the light, and the shapes come alive.', act: m => m.set({ angle: 0.6, res: 'mid', zbuf: true, cull: true, shade: true, flip: false, persp: true }) },
    { t: 'Skip the back', home: true, say: 'Faces turned away are skipped before filling. Corner order tells which way a face points.', act: m => m.set({ angle: 1.2, res: 'high', zbuf: true, cull: true, shade: true, flip: false, persp: true }) },
  ],
  check: [
    { q: 'What do barycentric coordinates tell the rasteriser?', options: ['Whether a pixel is inside a triangle, and how to blend its corners', 'The light direction', 'The texture'], answer: 0, why: 'All three weights positive means inside.', hint: 'Try the low resolution.' },
    { q: 'What does the depth buffer store?', options: ['The nearest depth drawn so far at each pixel', 'The colour', 'The triangle count'], answer: 0, why: 'Farther surfaces are rejected.', hint: 'Try Switch off the depth buffer.' },
    { q: 'What decides which way a triangle faces?', options: ['The order of its corners, its winding', 'Its colour', 'Its size'], answer: 0, why: 'The cross product of two edges.', hint: 'Try Flip the triangle winding.' },
  ],
  terms: [
    ['Vertex', 'A corner point of a 3D model.'],
    ['Rasterise', 'Turn a triangle into the pixels it covers.'],
    ['Barycentric coordinates', 'Three weights that describe a point inside a triangle.'],
    ['Depth buffer', 'A per-pixel store of the nearest depth so far.'],
    ['Back-face culling', 'Skipping triangles that face away from the camera.'],
    ['Normal', 'The direction a surface faces.'],
  ],
  deeper: '<p><b>Smooth shading.</b> Shading each pixel from normals blended across the triangle, rather than one value per face, gives curved-looking surfaces.</p><p><b>Textures.</b> The same barycentric weights blend texture coordinates, with a correction for perspective.</p><p><b>About this machine.</b> The scene is rendered by this lesson\'s own rasteriser; the 3D board around it is drawn by the browser.</p>',
  code: {
    title: 'Fill one triangle with a depth test',
    note: 'Our own short version, after tinyrenderer.',
    text: `
def fill(tri, image, depth, colour):
    (x0, y0, z0), (x1, y1, z1), (x2, y2, z2) = tri          # already projected
    area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
    for y in range(int(min(y0, y1, y2)), int(max(y0, y1, y2)) + 1):
        for x in range(int(min(x0, x1, x2)), int(max(x0, x1, x2)) + 1):
            px, py = x + 0.5, y + 0.5
            w0 = ((x1 - px) * (y2 - py) - (x2 - px) * (y1 - py)) / area
            w1 = ((x2 - px) * (y0 - py) - (x0 - px) * (y2 - py)) / area
            w2 = 1 - w0 - w1
            if min(w0, w1, w2) < 0:
                continue                                       # outside
            z = w0 * z0 + w1 * z1 + w2 * z2
            if z < depth[y][x]:                                # nearest wins
                depth[y][x] = z
                image[y][x] = colour
`,
  },
};
