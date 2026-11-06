// Build your own 3D modeller: a tiny scene graph of a table with a lamp and a cup on it, and a bench beside it. Each node has a local
// transform built as translate × rotate × scale; a child's world matrix is its parent's world matrix times its own. Picking turns the cursor
// into each object's own space with the inverse of its world matrix and tests it against a unit box, so rotated and scaled objects are hit
// where they appear. All matrices are computed by this lesson and applied directly to the meshes.
const NODES = [
  { id: 'table', parent: null, pos: [0, 0, 0], rot: 0, dims: [1.5, 0.22, 0.9], col: '#C9875E' },
  { id: 'lamp', parent: 'table', pos: [0.5, 0.22, -0.22], rot: 0, dims: [0.22, 0.3, 0.22], col: '#F2AE0C' },
  { id: 'cup', parent: 'table', pos: [-0.45, 0.22, 0.2], rot: 0, dims: [0.18, 0.16, 0.18], col: '#1F9E89' },
  { id: 'bench', parent: null, pos: [0.25, 0, 0.2], rot: 0.7, dims: [1.4, 0.26, 0.34], col: '#5B6CC4' },
];

export default {
  slug: 'build-a-3d-modeller',
  title: 'Build your own 3D modeller',
  description: 'A tiny 3D modeller keeps a scene graph: a table with a lamp and a cup, and a bench. Move the table and its children follow.',
  overview: 'A 3D modeller, like Blender in miniature, does three things: it keeps a scene, draws it, and lets you pick and change things with the mouse. The scene is a graph, usually a tree. Every node has a local transform, its position, rotation and scale relative to its parent, stored as a 4 by 4 matrix built as translate times rotate times scale, so a point is scaled first, then rotated about the node\'s own centre, then moved into place; compose them in another order and objects orbit the origin or stretch along the wrong axes. A node\'s world matrix is its parent\'s world matrix times its own local matrix, so moving a table moves the lamp and cup standing on it, and the lamp only stores where it sits on the table. Picking reverses the process. The mouse defines a ray into the scene; to test an object the modeller multiplies the ray by the inverse of the object\'s world matrix, which carries it into the object\'s own space, where the object is a simple unit box and the test is easy. Skip that step and test the ray against an upright, unscaled box at the object\'s position, and rotated or stretched objects are missed or hit in the wrong place. The nearest hit wins, the selected node is highlighted, and the controls change its local transform. This machine shows the board from above, with the cursor pointing straight down, so picking is a point-in-box test after the inverse transform.',
  keywords: ['build your own 3D modeller', 'scene graph', 'transformation matrix', 'picking', 'inverse matrix', 'model matrix', '500 lines or less'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.3, -0.1], dir: [0.05, 0.85, 1.15], half: 0.95, wide: 5.8 },
  credit: 'Built from <a href="https://aosabook.org/en/500L/a-3d-modeller.html" target="_blank" rel="noopener">A 3D Modeller</a> by Erick Dransch, in <a href="https://aosabook.org/en/500L/" target="_blank" rel="noopener">500 Lines or Less</a> (text CC BY 3.0, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short scene graph and picker, written for this lesson after the 3D Modeller chapter (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { tx: -1.3, tz: -0.3, tr: 0.35, cursor: 0.63, inherit: true, order: true, objSpace: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', RED = '#B5462F';
    const FLOOR = 0, CZ = -0.18, OX = 0;
    const unit = new THREE.BoxGeometry(1, 1, 1);
    const meshes = {};
    NODES.forEach(n => { const m = new THREE.Mesh(unit, new THREE.MeshLambertMaterial({ color: n.col })); m.matrixAutoUpdate = false; m.castShadow = true; m.userData.noFit = true; S.add(m); meshes[n.id] = m; });
    // the cursor: a red pin standing where the pointer is
    const cur = P.cyl(0.02, 0.55, RED); cur.userData.noFit = true; S.add(cur);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 32), new THREE.MeshBasicMaterial({ color: RED })); ring.rotation.x = Math.PI / 2; ring.userData.noFit = true; S.add(ring);
    // the scene graph itself, as a little mobile: the root on a post, the table and the bench under it, the lamp and cup under the table
    const GX = 2.25, GZ = -0.3;
    const post = P.cyl(0.03, 1.0, '#6B6E7E'); post.position.set(GX, 0, GZ); S.add(post);
    const GP = { root: V(GX, 1.0, GZ), table: V(GX - 0.38, 0.72, GZ), bench: V(GX + 0.4, 0.72, GZ), lamp: V(GX - 0.62, 0.42, GZ), cup: V(GX - 0.14, 0.42, GZ) };
    const nodeM = {}; Object.entries(GP).forEach(([id, p]) => { const n = NODES.find(x => x.id === id); const m = new THREE.MeshLambertMaterial({ color: n ? n.col : '#8E91A3' }); const b = P.ball(id === 'root' ? 0.07 : 0.09, '#fff', { material: m }); b.position.copy(p); S.add(b); nodeM[id] = m; });
    const link = (a, b) => { const m = new THREE.MeshLambertMaterial({ color: SAF }), r = P.rod(GP[a], GP[b], 0.018, SAF, { material: m }); S.add(r); return m; };
    link('root', 'table'); link('root', 'bench');
    const childLinks = [link('table', 'lamp'), link('table', 'cup')];
    const lamp = P.lamp(GOOD, { h: 0.45, r: 0.12 }); lamp.position.set(2.85, 0, 0.45); S.add(lamp);
    S.add(P.keep(-2.65, 3.0, 1.1, -1.0, 0.75));

    const mT = new THREE.Matrix4(), mR = new THREE.Matrix4(), mS = new THREE.Matrix4(), lift = new THREE.Matrix4();
    let world = {}, picked = null, truth = null;
    function local(n) {
      const pos = n.id === 'table' ? [st.tx, 0, st.tz] : n.parent ? n.pos : [n.pos[0] + OX, n.pos[1], n.pos[2] + CZ];
      const rot = n.id === 'table' ? st.tr : n.rot;
      mT.makeTranslation(pos[0], pos[1], pos[2]); mR.makeRotationY(rot); mS.makeScale(...n.dims);
      return st.order ? new THREE.Matrix4().multiplyMatrices(mT, mR).multiply(mS) : new THREE.Matrix4().multiplyMatrices(mS, mR).multiply(mT);
    }
    function pick(useObj) {
      const p = new THREE.Vector3(st.cursor, 0, CZ + 0.0);
      let best = null;
      NODES.forEach(n => {
        const w = world[n.id];
        let inside;
        if (useObj) { const q = p.clone().setY(0).applyMatrix4(new THREE.Matrix4().copy(w).invert()); inside = Math.abs(q.x) <= 0.5 && Math.abs(q.z) <= 0.5; }
        else { const c = new THREE.Vector3().setFromMatrixPosition(w); inside = Math.abs(p.x - c.x) <= n.dims[0] / 2 && Math.abs(p.z - c.z) <= n.dims[2] / 2; }
        const top = new THREE.Vector3().setFromMatrixPosition(w).y + n.dims[1];
        if (inside && (!best || top > best.top)) best = { id: n.id, top };
      });
      return best ? best.id : null;
    }
    function draw() {
      world = {};
      NODES.forEach(n => { const l = local(n); world[n.id] = n.parent && st.inherit ? new THREE.Matrix4().multiplyMatrices(world[n.parent], (() => { const pl = new THREE.Matrix4(); const par = NODES.find(x => x.id === n.parent); mS.makeScale(...par.dims); pl.copy(mS).invert(); return pl.multiply(l); })()) : l; });
      truth = pick(true); picked = pick(st.objSpace);
      NODES.forEach(n => {
        lift.makeTranslation(0, FLOOR, 0);
        const w = new THREE.Matrix4().multiplyMatrices(lift, world[n.id]).multiply(new THREE.Matrix4().makeTranslation(0, 0.5, 0));
        meshes[n.id].matrix.copy(w); meshes[n.id].matrixWorldNeedsUpdate = true;
        meshes[n.id].material.color.set(picked === n.id ? '#FFFFFF' : n.col);
        meshes[n.id].material.emissive = new THREE.Color(picked === n.id ? '#F2AE0C' : '#000000');
        nodeM[n.id].emissive = new THREE.Color(picked === n.id ? '#F2AE0C' : '#000000');
      });
      childLinks.forEach(m => m.color.set(st.inherit ? SAF : BAD));
      cur.position.set(st.cursor, FLOOR, CZ); ring.position.set(st.cursor, FLOOR + 0.005, CZ);
      lamp.userData.set({ color: isOk() ? GOOD : BAD });
    }
    function isOk() { return st.inherit && st.order && st.objSpace && picked === truth; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Move the table', min: -2.2, max: -0.6, step: 0.05, get: () => st.tx, set: v => set({ tx: +v }), fmt: v => (+v).toFixed(2) },
      { type: 'slider', label: 'Turn the table', min: -1.6, max: 1.6, step: 0.05, get: () => st.tr, set: v => set({ tr: +v }), fmt: v => `${Math.round(v * 57.3)}°` },
      { type: 'slider', label: 'Cursor', min: -2.6, max: 1.0, step: 0.02, get: () => st.cursor, set: v => set({ cursor: +v }), fmt: v => (+v).toFixed(2) },
      { type: 'toggle', label: 'Children inherit the parent\'s transform', short: 'Inherit', get: () => st.inherit, set: v => set({ inherit: !!v }) },
      { type: 'toggle', label: 'Scale, then rotate, then move', short: 'T · R · S', get: () => st.order, set: v => set({ order: !!v }) },
      { type: 'toggle', label: 'Pick in each object\'s own space', short: 'Object space', get: () => st.objSpace, set: v => set({ objSpace: !!v }) },
    ];
    const readouts = [
      { label: 'Picked', get: () => ({ v: picked || 'nothing', sub: `under it: ${truth || 'nothing'}`, good: picked === truth, bad: picked !== truth }) },
      { label: 'Children', get: () => ({ v: st.inherit ? 'follow' : 'left behind', sub: 'lamp and cup', good: st.inherit, bad: !st.inherit }) },
      { label: 'Matrix order', get: () => ({ v: st.order ? 'T·R·S' : 'S·R·T', sub: 'local transform', good: st.order, bad: !st.order }) },
    ];
    const labels = [
      { name: 's', t: 'The scene graph', d: 'Gold links: lamp and cup follow the table', icon: 'layers', atV: V(GX - 0.71, 0.42, GZ) },
      { name: 't', t: 'The pick', d: 'Glowing: picked. Red pin: the cursor. Lamp: right or wrong', icon: 'target', atV: V(2.98, 0.3, 0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Stop children inheriting', hint: 'lamp left behind', on: () => set({ ...D0, inherit: false }), off: reset },
      { label: 'Compose in the wrong order', hint: 'S · R · T', on: () => set({ ...D0, order: false }), off: reset },
      { label: 'Pick against upright boxes', hint: 'no inverse', on: () => set({ ...D0, objSpace: false }), off: reset },
    ];
    function status() {
      if (!st.inherit) return { ok: false, msg: '<b>The lamp and cup ignore their parent: their local positions are read as world positions, so they sit near the middle of the board instead of on the table.</b> A child\'s world matrix is its parent\'s world matrix times its own local one.' };
      if (!st.order) return { ok: false, msg: '<b>Composed as scale × rotate × translate, each object is moved first and then rotated and scaled about the origin, so the bench swings away and stretches along the wrong axis.</b> Build local matrices as translate × rotate × scale.' };
      if (picked !== truth) return { ok: false, msg: `<b>The cursor is over the ${truth || 'floor'}, but the picker chose ${picked || 'nothing'}: it tested an upright, unscaled box at the object\'s position, which misses the turned bench.</b> Multiply the cursor by the inverse of each world matrix and test against a unit box.` };
      return { ok: true, msg: `<b>Each child\'s world matrix is the table\'s times its own, so the lamp and cup ride along when the table moves or turns; the cursor, carried into each object\'s space by the inverse matrix, picks the ${picked || 'floor'} it is really over.</b> Slide the cursor or turn the table to test it.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A scene graph', home: true, say: 'A table with a lamp and a cup on it, and a bench beside it. Each object stores a transform relative to its parent.', act: m => m.set({ tx: -1.3, tz: -0.3, tr: 0.35, cursor: -1.5, inherit: true, order: true, objSpace: true }) },
    { t: 'Children follow', home: true, say: 'Turn the table and the lamp and cup turn with it. Their world matrix is the table\'s times their own.', act: m => m.set({ tx: -1.3, tz: -0.3, tr: 1.2, cursor: -1.5, inherit: true, order: true, objSpace: true }) },
    { t: 'Left behind', home: true, say: 'Forget the parent, and the children\'s local positions are read as world positions.', act: m => m.set({ tx: -1.3, tz: -0.3, tr: 0.35, cursor: -1.5, inherit: false, order: true, objSpace: true }) },
    { t: 'Order matters', home: true, say: 'Scale, then rotate, then move. In any other order objects orbit and stretch the wrong way.', act: m => m.set({ tx: -1.3, tz: -0.3, tr: 0.35, cursor: -1.5, inherit: true, order: false, objSpace: true }) },
    { t: 'Picking', home: true, say: 'Point at the end of the turned bench. Testing an upright box misses it.', act: m => m.set({ tx: -1.3, tz: -0.3, tr: 0.35, cursor: 0.63, inherit: true, order: true, objSpace: false }) },
    { t: 'Into object space', home: true, say: 'Carry the cursor into the bench\'s own space with the inverse matrix, and the hit is right.', act: m => m.set({ tx: -1.3, tz: -0.3, tr: 0.35, cursor: 0.63, inherit: true, order: true, objSpace: true }) },
  ],
  check: [
    { q: 'How is a child\'s world matrix found?', options: ['Parent\'s world matrix times the child\'s local matrix', 'The child\'s local matrix alone', 'The parent\'s inverse'], answer: 0, why: 'So children follow their parent.', hint: 'Try Stop children inheriting.' },
    { q: 'Which order builds a local transform?', options: ['Translate × rotate × scale', 'Scale × rotate × translate', 'Any order'], answer: 0, why: 'Scale and rotate about the centre, then move.', hint: 'Try Compose in the wrong order.' },
    { q: 'How does picking handle rotated objects?', options: ['Multiply the ray by the inverse world matrix, test a unit box', 'Test an upright box', 'Ignore rotation'], answer: 0, why: 'Object space makes the test simple.', hint: 'Try Pick against upright boxes.' },
  ],
  terms: [
    ['Scene graph', 'A tree of objects, each placed relative to its parent.'],
    ['Local transform', 'An object\'s position, rotation and scale relative to its parent.'],
    ['World matrix', 'The transform from an object\'s space to the scene\'s.'],
    ['Inverse matrix', 'The transform that undoes another.'],
    ['Picking', 'Finding which object is under the mouse.'],
    ['Object space', 'Coordinates in which an object is a simple unit shape.'],
  ],
  deeper: '<p><b>Rays, not points.</b> With a perspective camera the mouse gives a ray; the same inverse transform carries the ray into object space, where a slab test finds the hit distance.</p><p><b>Bounding boxes.</b> Real modellers test cheap bounding boxes first and only then exact shapes.</p><p><b>About this machine.</b> The scene is viewed from above with the cursor pointing straight down; the objects are invented.</p>',
  code: {
    title: 'World matrices and object-space picking',
    note: 'Our own short version, after the 3D Modeller chapter.',
    text: `
import numpy as np

def local(node):
    return translate(node.pos) @ rotate_y(node.rot) @ scale(node.dims)   # T · R · S

def world(node):
    m = local(node)
    return world(node.parent) @ m if node.parent else m

def pick(nodes, ray_origin, ray_dir):
    best = None
    for n in nodes:
        inv = np.linalg.inv(world(n))
        o = inv @ np.append(ray_origin, 1.0)          # point: w = 1
        d = inv @ np.append(ray_dir, 0.0)             # direction: w = 0
        t = hit_unit_box(o[:3], d[:3])                # simple test in object space
        if t is not None and (best is None or t < best[0]):
            best = (t, n)
    return best[1] if best else None
`,
  },
};
