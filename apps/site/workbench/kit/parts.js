// Building blocks for the lesson machines. Everything is procedural: boxes, cylinders, tubes and canvas-drawn text.
// Layer 0 objects get ink outlines; layer 1 is colour only (text decals, glows, flow dots).
import * as THREE from 'three';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const mats = new Map();
// a cached matte material; `c` is a colour or a THREE.Color
export function mat(c, o = {}) {
  const key = (c?.isColor ? '#' + c.getHexString() : String(c)) + JSON.stringify(o);
  if (!o.fresh && mats.has(key)) return mats.get(key);
  const m = o.basic ? new THREE.MeshBasicMaterial({ color: c, transparent: !!o.opacity && o.opacity < 1, opacity: o.opacity ?? 1, depthWrite: o.depthWrite ?? true })
    : new THREE.MeshLambertMaterial({ color: c, transparent: !!o.opacity && o.opacity < 1, opacity: o.opacity ?? 1, emissive: o.emissive || 0x000000, side: o.side || THREE.FrontSide });
  if (!o.fresh) mats.set(key, m);
  return m;
}
const shadow = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };

function roundedShape(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2; r = Math.min(r, w / 2, d / 2);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
const geoCache = new Map();
// a box whose bottom sits at y = 0; r rounds its corners seen from above
export function box(w, h, d, color, o = {}) {
  const r = o.r ?? Math.min(w, d) * 0.12;
  const key = `b${w},${h},${d},${r}`;
  let g = geoCache.get(key);
  if (!g) {
    if (r <= 0.001) { g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); }
    else {
      const bev = Math.min(0.04, h / 4, r / 2);
      g = new THREE.ExtrudeGeometry(roundedShape(w - bev * 2, d - bev * 2, Math.max(0.001, r - bev)), { depth: Math.max(0.001, h - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 6 });
      g.rotateX(-Math.PI / 2); g.translate(0, bev, 0);
    }
    geoCache.set(key, g);
  }
  const m = shadow(new THREE.Mesh(g, o.material || mat(color, o.m || {})), o.cast ?? true);
  return m;
}
export function cyl(r, h, color, o = {}) {
  const key = `c${r},${o.r2 ?? r},${h},${o.seg || 24}`;
  let g = geoCache.get(key);
  if (!g) { g = new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg || 24); g.translate(0, h / 2, 0); geoCache.set(key, g); }
  return shadow(new THREE.Mesh(g, o.material || mat(color, o.m || {})), o.cast ?? true);
}
export function ball(r, color, o = {}) {
  const key = `s${r},${o.seg || 20}`;
  let g = geoCache.get(key);
  if (!g) { g = new THREE.SphereGeometry(r, o.seg || 20, Math.round((o.seg || 20) * 0.75)); geoCache.set(key, g); }
  return shadow(new THREE.Mesh(g, o.material || mat(color, o.m || {})), o.cast ?? true);
}
// a rod from a to b (Vector3s), radius r
const UP = V(0, 1, 0);
export function rod(a, b, r, color, o = {}) {
  const g = new THREE.CylinderGeometry(r, r, 1, o.seg || 12); g.translate(0, 0.5, 0);
  const m = shadow(new THREE.Mesh(g, o.material || mat(color, o.m || {})), o.cast ?? false);
  m.userData.ownGeo = true;
  setRod(m, a, b);
  return m;
}
export function setRod(m, a, b) {
  const d = b.clone().sub(a), len = d.length();
  m.position.copy(a); m.scale.set(1, Math.max(1e-4, len), 1);
  if (len > 1e-6) m.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len));
}
// an arrow from a to b: a rod and a cone
export function arrow(a, b, r, color, o = {}) {
  const g = new THREE.Group();
  const shaft = rod(V(), V(0, 1, 0), r, color, o), head = new THREE.Mesh(new THREE.ConeGeometry(r * 2.6, r * 6, 16), o.material || mat(color, o.m || {}));
  head.castShadow = true;
  g.add(shaft, head); g.userData.shaft = shaft; g.userData.head = head; g.userData.r = r;
  setArrow(g, a, b);
  return g;
}
export function setArrow(g, a, b) {
  const d = b.clone().sub(a), len = d.length(), r = g.userData.r, hl = Math.min(r * 6, len * 0.5);
  const dir = len > 1e-6 ? d.clone().multiplyScalar(1 / len) : UP.clone();
  setRod(g.userData.shaft, a, a.clone().addScaledVector(dir, Math.max(1e-4, len - hl)));
  g.userData.head.position.copy(a).addScaledVector(dir, len - hl / 2);
  g.userData.head.quaternion.setFromUnitVectors(UP, dir);
  g.userData.head.scale.setScalar(hl / (r * 6) || 1e-4);
}
// a tube along points (Vector3s)
export function tube(pts, r, color, o = {}) {
  const curve = o.straight ? new THREE.CurvePath() : new THREE.CatmullRomCurve3(pts, false, 'catmullrom', o.tension ?? 0.4);
  if (o.straight) for (let i = 1; i < pts.length; i++) curve.add(new THREE.LineCurve3(pts[i - 1], pts[i]));
  const m = shadow(new THREE.Mesh(new THREE.TubeGeometry(curve, o.seg || Math.max(8, pts.length * 10), r, o.radial || 10, false), o.material || mat(color, o.m || {})), o.cast ?? false);
  m.userData.curve = curve;
  return m;
}

/* ---------- text ---------- */
// Canvas-drawn text on a plane. face: 'up' lies flat (readable from above), 'front' stands facing +z,
// 'cam' turns to the camera every frame (call S.face(obj) or keep it in a group the lesson turns).
// The plane sits on layer 1 (colour only), so text never gets ink edges.
export const FONT = { display: '"Bricolage Grotesque", "Instrument Sans", system-ui, sans-serif', body: '"Instrument Sans", system-ui, sans-serif', mono: '"JetBrains Mono", ui-monospace, monospace' };
const texts = new Set();
export function text(str, o = {}) {
  // chips (texts with a background) float over everything unless told otherwise, so no outline or wire cuts through them
  o = { ...o, top: o.top ?? !!o.bg };
  const ppu = o.ppu || 160, h = o.size || 0.34, pad = o.pad ?? (o.bg ? 0.35 : 0.05);
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: o.top ? false : o.depthTest ?? true, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4 }));
  m.layers.set(o.top ? 3 : 1); m.renderOrder = o.order ?? 2; m.userData.noMask = true;   // top: drawn over everything (layer 3)
  const st = { str: String(str), color: o.color || '#151827', bg: o.bg || null, weight: o.weight || 650, font: o.font || FONT.display, w: o.w || 0, align: o.align || 'center', lines: null, maxW: o.maxW || 0, maxH: o.maxH || 0 };
  function draw() {
    const fs = Math.round(h * ppu);
    g.font = `${st.weight} ${fs}px ${st.font}`;
    const lines = st.str.split('\n');
    const tw = Math.max(...lines.map(l => g.measureText(l).width));
    const W = Math.ceil(Math.max(st.w * ppu, tw + pad * fs * 2)), H = Math.ceil(fs * (1.25 * lines.length) + pad * fs * 2);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; tex.dispose(); } // a new size needs a new GPU texture
    g.clearRect(0, 0, W, H);
    if (st.bg) { g.fillStyle = st.bg; const r = Math.min(H / 2, fs * 0.5); g.beginPath(); g.roundRect(0, 0, W, H, r); g.fill(); }
    g.font = `${st.weight} ${fs}px ${st.font}`; g.fillStyle = st.color; g.textBaseline = 'middle';
    g.textAlign = st.align; const x = st.align === 'left' ? pad * fs : st.align === 'right' ? W - pad * fs : W / 2;
    lines.forEach((l, i) => g.fillText(l, x, pad * fs + fs * 1.25 * (i + 0.5)));
    tex.needsUpdate = true;
    m.scale.set(W / ppu, H / ppu, 1);
    // never wider or taller than the space it was given
    const k = Math.min(1, st.maxW ? st.maxW / (W / ppu) : 1, st.maxH ? st.maxH / (H / ppu) : 1);
    if (k < 1) m.scale.multiplyScalar(k);
  }
  draw();
  if (o.face === 'up' || !o.face) m.rotation.x = -Math.PI / 2;
  m.userData.face = o.face || 'up';
  m.userData.set = (s, c) => { const ns = String(s); if (ns === st.str && (!c || c === st.color)) return; st.str = ns; if (c) st.color = c; draw(); };
  m.userData.style = p => { Object.assign(st, p); draw(); };
  m.userData.redraw = draw;
  m.userData.info = () => ({ str: st.str, size: h, pad, lines: st.str.split('\n').length }); // read by tools/flat-audit.mjs
  texts.add(m);
  return m;
}
// turn every 'cam' text to face the camera (called once a frame by the lesson page)
export function faceCamera(cam) { for (const t of texts) if (t.userData.face === 'cam') { t.quaternion.copy(cam.quaternion); if (t.parent) { const q = new THREE.Quaternion(); t.parent.getWorldQuaternion(q); t.quaternion.premultiply(q.invert()); } } }
// redraw every text once the web fonts have loaded
if (typeof document !== 'undefined' && document.fonts) document.fonts.ready.then(() => texts.forEach(t => t.userData.redraw()));

// a block with a word printed on its top (a token, a card, a key)
export function tile(word, w, h, d, color, o = {}) {
  const g = new THREE.Group();
  const b = box(w, h, d, color, { r: o.r ?? Math.min(w, d) * 0.18, m: o.m });
  const t = text(word, { size: o.size || Math.min(d * 0.42, 0.34), color: o.ink || '#151827', w: w * 0.92, weight: o.weight, font: o.font, maxW: w * 0.94, maxH: d * 0.9 });
  t.position.y = h + 0.012;
  g.add(b, t); g.userData.body = b; g.userData.label = t;
  return g;
}

/* ---------- instanced grids ---------- */
// n×m blocks (a matrix, a heat map, an image). set(i, j, {h, color}) then commit()
export function grid(n, m, cell, o = {}) {
  const gap = o.gap ?? 0.08, geo = new THREE.BoxGeometry(cell - gap, 1, cell - gap); geo.translate(0, 0.5, 0);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), n * m);
  im.castShadow = true; im.receiveShadow = true;
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  const w = n * cell, d = m * cell;
  const hs = new Float32Array(n * m).fill(o.h ?? 0.1);
  function set(i, j, p) {
    const k = j * n + i; if (p.h != null) hs[k] = Math.max(0.02, p.h);
    dummy.position.set(-w / 2 + cell * (i + 0.5), 0, -d / 2 + cell * (j + 0.5)); dummy.scale.set(1, hs[k], 1); dummy.updateMatrix();
    im.setMatrixAt(k, dummy.matrix);
    if (p.color != null) im.setColorAt(k, col.set(p.color));
  }
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) set(i, j, { color: o.color || '#cccccc' });
  const commit = () => { im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); };
  commit();
  const at = (i, j, y = 0) => V(-w / 2 + cell * (i + 0.5), y, -d / 2 + cell * (j + 0.5));
  return { mesh: im, set, commit, at, w, d, heights: hs };
}

/* ---------- glowing dots that run along a curve (data flowing) ---------- */
export function flow(curve, n, color, o = {}) {
  const geo = new THREE.SphereGeometry(o.r || 0.06, 10, 8);
  const im = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color, toneMapped: false }), n);
  im.layers.set(1); im.userData.noMask = true; im.frustumCulled = false;
  const dummy = new THREE.Object3D(); let t = 0, on = true, speed = o.speed || 0.35;
  function tick(dt) {
    if (!on) { im.visible = false; return; } im.visible = true;
    t = (t + dt * speed) % 1;
    for (let i = 0; i < n; i++) {
      const u = (t + i / n) % 1; dummy.position.copy(curve.getPointAt(u));
      const s = o.fade ? Math.sin(u * Math.PI) : 1; dummy.scale.setScalar(Math.max(0.01, s)); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  }
  tick(0);
  return { mesh: im, tick, set on(v) { on = v; }, get on() { return on; }, set speed(v) { speed = v; }, setCurve(c) { curve = c; } };
}

// colour helpers
export const lerpColor = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t)));
export const hex = c => '#' + new THREE.Color(c).getHexString();

/* ---------- machine parts (run 3): objects whose shape, height, colour or motion carries the meaning ----------
   Every part is a Group standing on y = 0 at its own origin. Parts that change take set({...}); parts that move take tick(dt).
   Their materials are their own, so recolouring one never recolours another. Names stay short (a word or two). */
const own = c => new THREE.MeshLambertMaterial({ color: c });

// a short name on the top face and the front face of a part (so it reads from above and from the side)
export function nameplate(word, w, h, d, o = {}) {
  const g = new THREE.Group(), size = o.size || Math.min(0.26, w * 0.2), color = o.color || '#151827';
  const top = text(word, { size, weight: 800, color, maxW: w * 0.92, maxH: d * 0.8 }); top.position.set(0, h + 0.012, 0); g.add(top);
  const front = text(word, { size, weight: 800, color, face: 'front', maxW: w * 0.92, maxH: h * 0.8 }); front.position.set(0, h / 2, d / 2 + 0.012); g.add(front);
  g.userData.set = (s, c) => { top.userData.set(s, c); front.userData.set(s, c); };
  return g;
}

// a station: a block with a short name, recolourable
export function station(word, w, h, d, color, o = {}) {
  const g = new THREE.Group(), m = own(color);
  const b = box(w, h, d, color, { r: o.r ?? Math.min(w, d) * 0.15, material: m }); g.add(b);
  const n = nameplate(word, w, h, d, { color: o.ink || '#FFFFFF', size: o.size }); g.add(n);
  g.userData.body = b;
  g.userData.set = p => { if (p.color) m.color.set(p.color); if (p.word != null) n.userData.set(p.word, p.ink); };
  return g;
}

// a tower whose height is a number (0..max units tall)
export function tower(w, d, color, o = {}) {
  const g = new THREE.Group(), m = own(color);
  const b = box(w, 1, d, color, { r: Math.min(w, d) * 0.12, material: m }); g.add(b);
  const cap = text('', { size: o.size || Math.min(0.22, w * 0.45), weight: 800, color: o.ink || '#151827', face: 'cam', bg: o.bg || '#FFFFFF', top: true }); cap.userData.noFit = true; g.add(cap);
  let cur = o.h ?? 0.4, to = cur;
  const place = () => { b.scale.y = Math.max(0.02, cur); cap.position.set(0, Math.max(0.02, cur) + 0.2, 0); };
  place();
  g.userData.set = p => { if (p.h != null) to = Math.max(0.02, p.h); if (p.color) m.color.set(p.color); if (p.cap != null) { cap.userData.set(p.cap); cap.visible = !!p.cap; } };
  g.userData.tick = (dt, snap) => { cur = snap ? to : cur + (to - cur) * Math.min(1, dt * 6); place(); };
  g.userData.snap = () => { cur = to; place(); };
  return g;
}

// a robot worker: body, head, two eyes and an antenna lamp; busy makes it bob
export function robot(color, o = {}) {
  const g = new THREE.Group(), body = own(color), lampM = own(o.lamp || '#F2C94C');
  const s = o.scale || 1;
  const torso = box(0.42 * s, 0.42 * s, 0.32 * s, color, { r: 0.08 * s, material: body }); g.add(torso);
  const head = box(0.34 * s, 0.26 * s, 0.28 * s, color, { r: 0.07 * s, material: body }); head.position.y = 0.46 * s; g.add(head);
  for (const x of [-0.07, 0.07]) { const e = ball(0.035 * s, '#FFFFFF'); e.position.set(x * s, 0.6 * s, 0.14 * s); g.add(e); }
  const ant = cyl(0.012 * s, 0.14 * s, '#555'); ant.position.y = 0.72 * s; g.add(ant);
  const lamp = ball(0.05 * s, '#fff', { material: lampM }); lamp.position.y = 0.88 * s; g.add(lamp);
  let busy = false, t = Math.random() * 6;
  g.userData.set = p => { if (p.color) body.color.set(p.color); if (p.lamp) lampM.color.set(p.lamp); if (p.busy != null) busy = !!p.busy; };
  g.userData.tick = dt => { t += dt; const k = busy ? Math.abs(Math.sin(t * 6)) * 0.05 * s : 0; torso.position.y = k; head.position.y = 0.46 * s + k; };
  return g;
}

// a lamp on a post: on/off and a colour (green ok, red fault, gold busy)
export function lamp(color, o = {}) {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color, emissive: 0x000000 });
  const post = cyl(0.03, o.h || 0.5, '#6B6E7E'); g.add(post);
  const bulb = ball(o.r || 0.11, '#fff', { material: m }); bulb.position.y = (o.h || 0.5) + (o.r || 0.11) * 0.8; g.add(bulb);
  g.userData.set = p => { if (p.color) m.color.set(p.color); if (p.on != null) m.emissive.set(p.on ? m.color : 0x000000).multiplyScalar(p.on ? 0.45 : 0); };
  g.userData.set({ on: true });
  return g;
}

// a gate: two posts and a bar that swings up (open) or down (shut)
export function gate(w, color, o = {}) {
  const g = new THREE.Group(), barM = own(color), h = o.h || 0.55;
  for (const x of [-w / 2, w / 2]) { const p = box(0.1, h, 0.1, '#6B6E7E', { r: 0.02 }); p.position.x = x; g.add(p); }
  const hinge = new THREE.Group(); hinge.position.set(-w / 2, h * 0.75, 0); g.add(hinge);
  const bar = box(w, 0.08, 0.08, color, { r: 0.02, material: barM }); bar.position.set(w / 2, -0.04, 0); hinge.add(bar);
  let ang = 0, to = 0;
  g.userData.set = p => { if (p.open != null) to = p.open ? 1.25 : 0; if (p.color) barM.color.set(p.color); };
  g.userData.tick = (dt, snap) => { ang = snap ? to : ang + (to - ang) * Math.min(1, dt * 6); hinge.rotation.z = ang; };
  return g;
}

// a glass tank that fills to a level; past 1 it spills over the rim in red (a context window, a queue, a budget)
export function tank(w, h, d, color, o = {}) {
  const g = new THREE.Group(), fillM = own(color), spillM = own(o.spill || '#D9483B');
  const glass = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: '#CFE3F2', transparent: true, opacity: 0.28, depthWrite: false }));
  glass.position.y = h / 2; glass.userData.noMask = true; g.add(glass);
  const base = box(w + 0.08, 0.05, d + 0.08, '#6B6E7E', { r: 0.03 }); base.position.y = -0.05; g.add(base);
  const fill = box(w - 0.04, 1, d - 0.04, color, { r: 0.02, material: fillM }); fill.position.y = 0.0; g.add(fill);
  const spill = box(w * 0.5, 0.04, d * 0.9, o.spill || '#D9483B', { r: 0.02, material: spillM }); spill.position.set(w * 0.75, -0.04, 0); spill.visible = false; g.add(spill);
  let cur = 0, to = 0;
  const place = () => { const lv = Math.min(1, cur); fill.scale.y = Math.max(0.01, lv * h * 0.98); spill.visible = cur > 1.001; spill.scale.x = Math.min(2, 1 + (cur - 1) * 3); };
  g.userData.set = p => { if (p.level != null) to = Math.max(0, p.level); if (p.color) fillM.color.set(p.color); };
  g.userData.tick = (dt, snap) => { cur = snap ? to : cur + (to - cur) * Math.min(1, dt * 5); place(); };
  place();
  return g;
}

// a glass jar of coins: n coins stacked inside (a budget)
export function jar(r, h, o = {}) {
  const g = new THREE.Group(), max = o.max || 12;
  const glass = cyl(r, h, '#CFE3F2', { material: new THREE.MeshLambertMaterial({ color: '#CFE3F2', transparent: true, opacity: 0.3, depthWrite: false }) }); glass.userData.noMask = true; g.add(glass);
  const coins = []; for (let i = 0; i < max; i++) { const c = cyl(r * 0.72, h / max * 0.8, o.coin || '#E3A72F'); c.position.y = i * h / max + 0.01; g.add(c); coins.push(c); }
  g.userData.set = p => { if (p.n != null) coins.forEach((c, i) => { c.visible = i < Math.round(p.n); }); if (p.color) coins.forEach(c => { c.material = mat(p.color); }); };
  return g;
}

// a shelf with slots that fill with boxes (a cache, a store, a queue of jobs)
export function shelf(n, o = {}) {
  const g = new THREE.Group(), cw = o.cell || 0.42, w = n * cw + 0.1, levels = o.levels || 1, lh = o.lh || 0.5;
  for (let l = 0; l <= levels; l++) { const b = box(w, 0.05, o.d || 0.45, '#A87A4F', { r: 0.02 }); b.position.y = l * lh; g.add(b); }
  for (const x of [-w / 2, w / 2]) { const s = box(0.05, levels * lh + 0.05, o.d || 0.45, '#8A5F3A', { r: 0.01 }); s.position.x = x; g.add(s); }
  const slots = [];
  for (let l = 0; l < levels; l++) for (let i = 0; i < n; i++) {
    const m = own('#C9C4B6'), b = box(cw * 0.78, lh * 0.7, (o.d || 0.45) * 0.75, '#fff', { r: 0.04, material: m }); b.position.set(-w / 2 + 0.05 + cw * (i + 0.5), l * lh + 0.05, 0); g.add(b); slots.push({ b, m });
  }
  g.userData.slots = slots;
  g.userData.set = p => { if (p.fill) p.fill.forEach((c, i) => { if (!slots[i]) return; slots[i].b.visible = !!c; if (c) slots[i].m.color.set(c); }); };
  return g;
}

// a dial: a face with a needle from 0 (left) to 1 (right), green to red
export function dial(r, o = {}) {
  const g = new THREE.Group();
  const face = cyl(r, 0.06, '#FFFFFF'); g.add(face);
  const arc = [['#3E9B5F', 0, 0.5], ['#E3A72F', 0.5, 0.8], ['#D9483B', 0.8, 1]];
  arc.forEach(([c, a, b]) => { const s = new THREE.Mesh(new THREE.RingGeometry(r * 0.72, r * 0.92, 24, 1, Math.PI - b * Math.PI, (b - a) * Math.PI), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); s.rotation.x = -Math.PI / 2; s.position.y = 0.065; s.layers.set(1); s.userData.noMask = true; g.add(s); });
  const pivot = new THREE.Group(); pivot.position.y = 0.08; g.add(pivot);
  const needle = box(r * 0.8, 0.03, 0.04, '#151827', { r: 0.01 }); needle.position.x = r * 0.4; pivot.add(needle);
  let cur = 0, to = 0;
  g.userData.set = p => { if (p.v != null) to = Math.max(0, Math.min(1.05, p.v)); };
  g.userData.tick = (dt, snap) => { cur = snap ? to : cur + (to - cur) * Math.min(1, dt * 6); pivot.rotation.y = Math.PI - cur * Math.PI; };
  return g;
}

// a conveyor belt from a to b (on the floor) carrying parcels; send(color) launches one, done(p) fires at the far end
export function belt(a, b, o = {}) {
  const g = new THREE.Group(), len = a.distanceTo(b), w = o.w || 0.4;
  const dir = b.clone().sub(a); const ang = Math.atan2(-dir.z, dir.x);
  const frame = new THREE.Group(); frame.position.copy(a); frame.rotation.y = ang; g.add(frame);
  const bed = box(len, 0.08, w, '#3A3D4A', { r: 0.03 }); bed.position.x = len / 2; frame.add(bed);
  for (let x = 0.1; x < len; x += 0.35) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, w + 0.04, 10), mat('#8E91A3')); r.rotation.x = Math.PI / 2; r.position.set(x, 0.05, 0); frame.add(r); }
  const parcels = [];
  const speed = () => o.speed || 0.9;
  g.userData.send = (color, opt = {}) => {
    const p = box(opt.size || 0.24, opt.size || 0.22, opt.size || 0.24, color, { r: 0.04, material: own(color) });
    p.userData.noFit = true; p.userData.u = 0; p.userData.cb = opt.done; p.userData.stop = opt.stop ?? 1; frame.add(p); parcels.push(p);
    return p;
  };
  g.userData.clear = () => { parcels.splice(0).forEach(p => frame.remove(p)); };
  g.userData.tick = dt => {
    for (let i = parcels.length - 1; i >= 0; i--) {
      const p = parcels[i]; p.userData.u = Math.min(p.userData.stop, p.userData.u + dt * speed() / len);
      p.position.set(p.userData.u * len, 0.08, 0);
      if (p.userData.u >= p.userData.stop) { frame.remove(p); parcels.splice(i, 1); p.userData.cb?.(p); }   // stop < 1: leaves the belt there (a gate)
    }
  };
  g.userData.count = () => parcels.length;
  return g;
}

// a stack of n blocks (pages, messages, layers); colours per block
export function stack(w, d, bh, o = {}) {
  const g = new THREE.Group(), max = o.max || 10, blocks = [];
  for (let i = 0; i < max; i++) { const m = own(o.color || '#3D6BD6'), b = box(w, bh * 0.85, d, '#fff', { r: Math.min(w, d) * 0.1, material: m }); b.position.y = i * bh; g.add(b); blocks.push({ b, m }); }
  g.userData.set = p => { const cs = p.colors || []; blocks.forEach((k, i) => { k.b.visible = i < (p.n ?? cs.length); if (cs[i]) k.m.color.set(cs[i]); }); };
  return g;
}

// a pipe between points with dots flowing along it (data in transit); on(false) stops it
export function pipe(pts, color, o = {}) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(pts);
  const m = own(o.pipe || '#B9B3A6');
  const t = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, o.r || 0.05, 8, false), m); t.castShadow = true; g.add(t);
  const f = flow(curve, o.n || 6, color, { r: (o.r || 0.05) * 1.3, speed: o.speed || 0.4 }); g.add(f.mesh);
  g.userData.tick = dt => f.tick(dt);
  g.userData.set = p => { if (p.on != null) f.on = !!p.on; if (p.color) f.mesh.material.color.set(p.color); if (p.pipe) m.color.set(p.pipe); if (p.speed != null) f.speed = p.speed; };
  return g;
}

// an invisible box the camera frames: reserve the full space a machine can grow into (towers at their tallest)
export function keep(x0, x1, y1, z0, z1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1, z1 - z0), new THREE.MeshBasicMaterial({ visible: false }));
  m.position.set((x0 + x1) / 2, y1 / 2, (z0 + z1) / 2); m.userData.noMask = true;
  return m;
}
