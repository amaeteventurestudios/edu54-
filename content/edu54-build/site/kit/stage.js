// The stage renderer: an orthographic camera, three passes (normals and depth, colour, ink edges),
// theme colours from CSS, a rounded plinth under the machine, a light tier for phones and an adaptive pixel ratio.
// Adapted from the Amaete Circuits bench renderer: same ink-outline look, its own plinth instead of the cutting mat.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function createStage(stage, canvas, opts = {}) {
  const qs = new URLSearchParams(location.search);
  const lite = matchMedia('(pointer: coarse)').matches || qs.has('lite') || !!opts.lite;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const PR = Math.min(devicePixelRatio || 1, lite ? 1.5 : 2);
  renderer.setPixelRatio(PR);

  const scene = new THREE.Scene();
  const view = opts.view || {};
  const DIST = Math.max(50, (view.half || 6) * 5);
  const cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, DIST * 2.8);
  cam.layers.enable(1);
  const TARGET = V(...(view.target || [0, 0.8, 0]));
  const HOME0 = V(...(view.dir || [1, 1.05, 1.35])).normalize(), HOME_DIR = HOME0.clone();
  const fit = { half: view.half || 5.6, wide: view.wide || 7.4 };
  cam.position.copy(TARGET).addScaledVector(HOME_DIR, DIST);
  cam.lookAt(TARGET);

  const controls = new OrbitControls(cam, canvas);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.minZoom = 0.55; controls.maxZoom = 5;
  controls.maxPolarAngle = view.maxPolar ?? 1.45;
  controls.zoomToCursor = true;
  controls.update();

  const rtColor = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: lite ? 0 : 4 });
  const rtNormal = new THREE.WebGLRenderTarget(4, 4, { depthTexture: new THREE.DepthTexture(4, 4) });
  const normalMat = new THREE.MeshNormalMaterial();
  const post = new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: rtColor.texture }, tNormal: { value: rtNormal.texture }, tDepth: { value: rtNormal.depthTexture },
      px: { value: new THREE.Vector2() }, ink: { value: new THREE.Color() }, range: { value: 140.0 }, thick: { value: 1.0 }
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv = position.xy*0.5+0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tColor, tNormal, tDepth; uniform vec2 px; uniform vec3 ink; uniform float range, thick;
      varying vec2 vUv;
      float D(vec2 uv){ return texture2D(tDepth, uv).x * range; }
      vec3 N(vec2 uv){ return texture2D(tNormal, uv).xyz*2.0-1.0; }
      vec3 toSRGB(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(vec3(0.0031308), c)); }
      void main(){
        vec2 o = px*thick;
        float dc = D(vUv);
        float dl = D(vUv-vec2(o.x,0.0)), dr = D(vUv+vec2(o.x,0.0)), du = D(vUv+vec2(0.0,o.y)), dd = D(vUv-vec2(0.0,o.y));
        float lap = abs(dl+dr-2.0*dc) + abs(du+dd-2.0*dc);
        vec3 nc = N(vUv);
        float nd = (1.0-dot(nc, N(vUv-vec2(o.x,0.0)))) + (1.0-dot(nc, N(vUv+vec2(o.x,0.0)))) + (1.0-dot(nc, N(vUv+vec2(0.0,o.y)))) + (1.0-dot(nc, N(vUv-vec2(0.0,o.y))));
        float e = max(smoothstep(0.05, 0.14, lap), smoothstep(0.45, 0.85, nd));
        vec3 c = texture2D(tColor, vUv).rgb;
        c = mix(c, ink, e*0.9);
        gl_FragColor = vec4(toSRGB(c), 1.0);
      }`,
    depthTest: false, depthWrite: false
  });
  const postScene = new THREE.Scene();
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  const postMesh = new THREE.Mesh(tri, post); postMesh.frustumCulled = false; postScene.add(postMesh);
  const postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  /* ---------- theme ---------- */
  const stageCol = new THREE.Color(), normalClear = new THREE.Color().setRGB(0.5, 0.5, 1.0, THREE.LinearSRGBColorSpace);
  const theme = { dark: false, accent: new THREE.Color(), hi: new THREE.Color(), plinth: new THREE.Color(), side: new THREE.Color(), ink: new THREE.Color(), paper: new THREE.Color() };
  let groundMat = null; const themeHooks = [];
  function readTheme() {
    const cs = getComputedStyle(document.body);
    const get = (k, d) => cs.getPropertyValue(k).trim() || d;
    stageCol.set(get('--stage', '#E9EAF2'));
    theme.dark = stageCol.getHSL({}).l < 0.3;
    theme.accent.set(get('--accent3d', '#2F3C8F')); theme.hi.set(get('--hi', '#E3A72F'));
    theme.plinth.set(get('--plinth', '#DCDFEC')); theme.side.set(get('--plinth-side', '#2F3C8F'));
    theme.paper.set(get('--paper3d', '#F7F5EE')); theme.ink.set(theme.dark ? '#05060C' : '#151827');
    post.uniforms.ink.value.copy(theme.ink);
    if (groundMat) groundMat.opacity = theme.dark ? 0.32 : 0.16;
    if (plinthMats) { plinthMats.side.color.copy(theme.side); drawPlinthTop(); }
    for (const f of themeHooks) f(theme);
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme);
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- lights + floor ---------- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xC4C2CF, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.55);
  sun.position.set(-6, 15, -2);
  sun.target.position.set(1, 0, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 1024 : 2048, lite ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 40 });
  sun.shadow.radius = 4; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  groundMat = new THREE.ShadowMaterial({ color: 0x0b0d1a, opacity: 0.16 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), groundMat);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.layers.set(1);
  scene.add(ground);
  const plinthGroup = new THREE.Group(); scene.add(plinthGroup);
  const skip = new Set([ground, plinthGroup]);

  /* ---------- the plinth: a rounded board under the machine, dotted like graph paper ---------- */
  let plinthMats = null, plinthCanvas = null, plinthTex = null, plinthSize = null;
  function roundedRect(w, d, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r);
    s.quadraticCurveTo(x + w, y + d, x + w - r, y + d); s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  function drawPlinthTop() {
    if (!plinthCanvas) return;
    const g = plinthCanvas.getContext('2d'), W2 = plinthCanvas.width, H2 = plinthCanvas.height;
    g.fillStyle = '#' + theme.plinth.getHexString(); g.fillRect(0, 0, W2, H2);
    const ppu = W2 / plinthSize[0];
    g.fillStyle = theme.dark ? 'rgba(255,255,255,.10)' : 'rgba(20,24,60,.13)';
    for (let x = ppu / 2; x < W2; x += ppu / 2) for (let y = ppu / 2; y < H2; y += ppu / 2) { g.beginPath(); g.arc(x, y, Math.max(1, ppu / 34), 0, Math.PI * 2); g.fill(); }
    plinthTex.needsUpdate = true;
  }
  function buildPlinth(bounds, o = {}) {
    plinthGroup.clear();
    const box = new THREE.Box3();
    if (bounds) box.set(V(bounds[0], 0, bounds[1]), V(bounds[2], 0, bounds[3]));
    else for (const ob of scene.children) if (!skip.has(ob) && ob.isObject3D && !ob.isLight && !ob.userData.noPlinth) box.expandByObject(ob);
    const pad = o.pad ?? 0.8;
    const w = Math.ceil(box.max.x - box.min.x + pad * 2), d = Math.ceil(box.max.z - box.min.z + pad * 2), h = o.h ?? 0.5;
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    plinthSize = [w, d];
    plinthCanvas = document.createElement('canvas');
    const ppu = lite ? 40 : 64; plinthCanvas.width = w * ppu; plinthCanvas.height = d * ppu;
    plinthTex = new THREE.CanvasTexture(plinthCanvas); plinthTex.colorSpace = THREE.SRGBColorSpace; plinthTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const geo = new THREE.ExtrudeGeometry(roundedRect(w, d, Math.min(0.9, Math.min(w, d) * 0.12)), { depth: h, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 8 });
    geo.rotateX(-Math.PI / 2);
    // top-face UVs from x/z so the dotted texture lies flat
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, 1 - (pos.getZ(i) + d / 2) / d);
    plinthMats = { top: new THREE.MeshLambertMaterial({ color: 0xffffff, map: plinthTex }), side: new THREE.MeshLambertMaterial({ color: theme.side }) };
    const m = new THREE.Mesh(geo, [plinthMats.top, plinthMats.side]);
    m.position.set(cx, -h - 0.06, cz); m.receiveShadow = true;
    plinthGroup.add(m);
    ground.position.y = -h - 0.12;
    readTheme();
    return { x0: cx - w / 2, z0: cz - d / 2, x1: cx + w / 2, z1: cz + d / 2 };
  }

  /* ---------- sizing + view ---------- */
  let W = 1, H = 1, curPR = PR;
  function sizeTargets() {
    const pw = Math.round(W * curPR), ph = Math.round(H * curPR);
    rtColor.setSize(pw, ph); rtNormal.setSize(pw, ph);
    post.uniforms.px.value.set(1 / pw, 1 / ph);
    post.uniforms.thick.value = Math.max(1, curPR * 0.85);
  }
  // `area` keeps the machine clear of panels: {top, bottom, left, right} in px of the stage.
  // With area.auto (phones) the machine's own box is fitted into what is left.
  let area = { top: 0, bottom: 0, left: 0, right: 0 }, fitBox = null;
  function boxInView(dir = HOME_DIR) {
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(dir.clone(), V(0, 0, 0), V(0, 1, 0)));
    const right = V(1, 0, 0).applyQuaternion(q), up = V(0, 1, 0).applyQuaternion(q);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const x of [fitBox.min.x, fitBox.max.x]) for (const y of [fitBox.min.y, fitBox.max.y]) for (const z of [fitBox.min.z, fitBox.max.z]) {
      const d = V(x, y, z).sub(TARGET); const a = d.dot(right), b = d.dot(up);
      x0 = Math.min(x0, a); x1 = Math.max(x1, a); y0 = Math.min(y0, b); y1 = Math.max(y1, b);
    }
    return { hw: (x1 - x0) / 2, hh: (y1 - y0) / 2, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }
  function resize() {
    const r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    renderer.setSize(W, H, false);
    sizeTargets();
    const aw = Math.max(1, W - area.left - area.right), ah = Math.max(1, H - area.top - area.bottom);
    const aspect = aw / ah;
    let half = Math.max(fit.half, fit.wide / aspect), cx = 0, cy = 0;
    if (fitBox) {
      const b = boxInView();
      half = Math.max(b.hh, b.hw / aspect) * (area.margin || (area.auto ? 1.04 : 1.12));
      cx = b.cx; cy = b.cy;
    }
    const sH = half * H / ah, sW = sH * W / H;
    const ox = (area.left - area.right) / 2 / W * 2 * sW, oy = (area.bottom - area.top) / 2 / H * 2 * sH;
    cam.left = -sW - ox + cx; cam.right = sW - ox + cx; cam.top = sH - oy + cy; cam.bottom = -sH - oy + cy;
    cam.updateProjectionMatrix();
  }
  // b: a Box3 around what must always be in view
  function setFitBox(b) { fitBox = b; resize(); }
  // phones: turn the machine about its vertical axis to whichever angle shows it biggest in the space left
  function fitTurn(on) {
    let best = HOME0.clone();
    if (on && fitBox) {
      const r = stage.getBoundingClientRect();
      const aspect = Math.max(1, r.width - area.left - area.right) / Math.max(1, r.height - area.top - area.bottom);
      let bs = Infinity;
      for (let a = -60; a <= 60; a += 15) {
        const d = HOME0.clone().applyAxisAngle(V(0, 1, 0), a * Math.PI / 180), b = boxInView(d);
        const sc = Math.max(b.hh, b.hw / aspect) * (1 + Math.abs(a) / 300);
        if (sc < bs) { bs = sc; best = d; }
      }
    }
    if (best.distanceTo(HOME_DIR) > 1e-6) { HOME_DIR.copy(best); goHome(); }
  }
  function setArea(a) { area = { ...area, ...a }; resize(); }
  new ResizeObserver(resize).observe(stage);
  resize();

  const state = { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, spin: null, focus: null };
  function rotateBy(a) { const off = cam.position.clone().sub(controls.target); state.spin = { to: a, t: 0, off }; }
  function zoomBy(f) { cam.zoom = THREE.MathUtils.clamp(cam.zoom * f, controls.minZoom, controls.maxZoom); cam.updateProjectionMatrix(); }
  function goHome(smooth) {
    state.spin = null;
    if (smooth && !state.reduced) { state.focus = { t: 0, ft: controls.target.clone(), tt: TARGET.clone(), fz: cam.zoom, tz: 1, fd: cam.position.clone().sub(controls.target).normalize(), td: HOME_DIR.clone() }; return; }
    state.focus = null; controls.target.copy(TARGET); cam.position.copy(TARGET).addScaledVector(HOME_DIR, DIST); cam.zoom = 1; cam.updateProjectionMatrix(); controls.update();
  }
  function focusOn(target, zoom, dir) {
    const fd = cam.position.clone().sub(controls.target).normalize();
    state.focus = { t: 0, ft: controls.target.clone(), tt: target.clone(), fz: cam.zoom, tz: Math.min(controls.maxZoom, zoom), fd, td: dir ? dir.clone().normalize() : fd };
  }
  function updateView(dt) {
    const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    if (state.spin) {
      const s = state.spin; s.t = Math.min(1, s.t + dt / (state.reduced ? 0.01 : 0.45));
      cam.position.copy(controls.target).add(s.off.clone().applyAxisAngle(V(0, 1, 0), s.to * ease(s.t)));
      if (s.t >= 1) state.spin = null;
    }
    if (state.focus) {
      const f = state.focus; f.t = Math.min(1, f.t + dt / (state.reduced ? 0.01 : 0.8));
      const e = ease(f.t), nt = f.ft.clone().lerp(f.tt, e), nd = f.fd.clone().lerp(f.td, e).normalize();
      controls.target.copy(nt); cam.position.copy(nt).addScaledVector(nd, DIST);
      cam.zoom = THREE.MathUtils.lerp(f.fz, f.tz, e); cam.updateProjectionMatrix();
      if (f.t >= 1) state.focus = null;
    }
    controls.update();
  }

  const tmpV = new THREE.Vector3();
  function toScreen(p) { tmpV.copy(p).project(cam); return [(tmpV.x * 0.5 + 0.5) * W, (-tmpV.y * 0.5 + 0.5) * H]; }

  function draw() {
    renderer.setClearColor(normalClear, 1);
    cam.layers.set(0);
    scene.overrideMaterial = normalMat;
    renderer.setRenderTarget(rtNormal); renderer.render(scene, cam);
    scene.overrideMaterial = null;
    cam.layers.enable(1);
    renderer.setClearColor(stageCol, 1);
    renderer.setRenderTarget(rtColor); renderer.render(scene, cam);
    post.uniforms.range.value = cam.far - cam.near;
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    // layer 3: on-top texts (P.text with top: true), drawn after the outlines so nothing crosses them
    renderer.autoClear = false; cam.layers.set(3); renderer.clearDepth(); renderer.render(scene, cam);
    renderer.autoClear = true; cam.layers.set(0); cam.layers.enable(1);
  }
  // phones: drop the pixel ratio when frames run slow, raise it back when there is room
  let fpsAcc = 0, fpsN = 0;
  function adapt(dt) {
    if (!lite) return;
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 2) {
      const fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0;
      const next = fps < 32 ? Math.max(0.85, curPR - 0.2) : fps > 55 ? Math.min(PR, curPR + 0.1) : curPR;
      if (next !== curPR) { curPR = next; renderer.setPixelRatio(curPR); sizeTargets(); }
    }
  }

  /* ---------- where the machine is on screen ---------- */
  // A coarse picture of the stage: 1 where something stands, 0 where only the plinth or background shows.
  // Labels use it to find empty space. Cached until the view changes.
  const maskRT = new THREE.WebGLRenderTarget(16, 16), white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  let maskCache = null, maskKey = '', maskAt = 0;
  function mask(cell = 8) {
    const key = [W, H, cam.zoom, cam.left, cam.top, ...cam.matrixWorld.elements.map(v => v.toFixed(3))].join();
    if (maskCache && (key === maskKey || performance.now() - maskAt < 250)) return maskCache;
    maskAt = performance.now();
    const mw = Math.max(8, Math.round(W / cell)), mh = Math.max(8, Math.round(H / cell));
    maskRT.setSize(mw, mh);
    const pv = plinthGroup.visible, gv = ground.visible; plinthGroup.visible = false; ground.visible = false;
    const ghosts = [];
    scene.traverse(o => { if (o.isMesh && o.visible && (o.userData.noMask || (o.material && !Array.isArray(o.material) && o.material.transparent && o.material.opacity < 0.05))) { ghosts.push(o); o.visible = false; } });
    scene.overrideMaterial = white; renderer.setClearColor(0x000000, 1); cam.layers.set(0); cam.layers.enable(1);
    renderer.setRenderTarget(maskRT); renderer.render(scene, cam);
    const buf = new Uint8Array(mw * mh * 4); renderer.readRenderTargetPixels(maskRT, 0, 0, mw, mh, buf);
    renderer.setRenderTarget(null); scene.overrideMaterial = null; cam.layers.enable(1); plinthGroup.visible = pv; ground.visible = gv;
    for (const o of ghosts) o.visible = true;
    const on = new Uint8Array(mw * mh);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) on[y * mw + x] = buf[((mh - 1 - y) * mw + x) * 4] > 40 ? 1 : 0;
    const cover = (x0, y0, x1, y1) => {
      const a = Math.max(0, Math.floor(x0 / W * mw)), b = Math.min(mw - 1, Math.floor(x1 / W * mw)), c = Math.max(0, Math.floor(y0 / H * mh)), d = Math.min(mh - 1, Math.floor(y1 / H * mh));
      let n = 0, t = 0; for (let y = c; y <= d; y++) for (let x = a; x <= b; x++) { t++; n += on[y * mw + x]; }
      return t ? n / t : 0;
    };
    maskCache = { w: mw, h: mh, on, cover }; maskKey = key;
    return maskCache;
  }

  /* ---------- taps on the machine ---------- */
  // any object (or its parent) with userData.tap = fn gets called when tapped; userData.cursor shows a pointer
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    for (const h of ray.intersectObjects(scene.children, true)) {
      let o = h.object; while (o && !o.userData.tap) o = o.parent;
      if (o && o.visible) return { o, h };
      if (h.object.userData.solid) return null;
    }
    return null;
  }
  let down = null;
  canvas.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY, performance.now()]; });
  canvas.addEventListener('pointerup', e => {
    if (!down) return; const moved = Math.hypot(e.clientX - down[0], e.clientY - down[1]); down = null;
    if (moved > 8) return;
    const p = pick(e); if (p) p.o.userData.tap(p.h, p.o);
  });
  canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || down) return; canvas.style.cursor = pick(e) ? 'pointer' : ''; });

  readTheme();
  return {
    THREE, renderer, scene, cam, controls, lite, PR, ground, state, TARGET, HOME_DIR, theme,
    get W() { return W; }, get H() { return H; },
    resize, setArea, setFitBox, fitTurn, mask, buildPlinth, readTheme, onTheme: f => { themeHooks.push(f); f(theme); }, rotateBy, zoomBy, goHome, focusOn, updateView, toScreen, draw, adapt,
    noPlinth: o => { o.userData.noPlinth = true; },
  };
}
