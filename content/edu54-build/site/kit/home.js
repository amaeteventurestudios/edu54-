// Amaete Build home page. The stage: the logo's cube, built from twelve slabs (one per track, in its family's colour).
// Scrolling through the stage pulls each group of slabs out like drawers while its tracks slide in beside it.
// Below it: entrances as sections arrive, the moving tapes, and a real slope to roll a ball down.
import * as THREE from '../vendor/three/three.module.min.js';

document.documentElement.classList.add('js');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches || /[?&]lite\b/.test(location.search);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t * t * (3 - 2 * t);
const isDark = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);

/* ---------- entrances ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('seen'); io.unobserve(e.target); } }), { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.rise, .slide-l, .slide-r').forEach(el => io.observe(el));

/* ---------- the stage ---------- */
const stage = document.querySelector('.stage'), pin = stage.querySelector('.pin'), hero = stage.querySelector('.hero');
const chaps = [...stage.querySelectorAll('.chap')], bg = stage.querySelector('.bg'), sun = stage.querySelector('.sun'), hint = stage.querySelector('.hint');
const TRACKS = JSON.parse(document.getElementById('tracks').textContent);
const FAM = { clay: ['#A4462A', '#E3A72F'], teal: ['#0E6B6B', '#EE7434'], plum: ['#5E2A61', '#EE6352'], char: ['#2C2D31', '#F2AE0C'] };
const CH = [[1, 2, 3], [4, 5], [6, 7], [8, 9, 10], [11, 12]];
const CH_SUN = ['#E3A72F', '#EE7434', '#EE6352', '#F2AE0C', '#0E6B6B'];

let renderer = null;
try { renderer = new THREE.WebGLRenderer({ antialias: !touch, alpha: true, powerPreference: 'high-performance' }); } catch { renderer = null; }
if (renderer) {
  stage.querySelector('.fallback')?.remove();
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  pin.insertBefore(renderer.domElement, hero);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xFFF6EA, 0x6B5A50, 1.5));
  const sunL = new THREE.DirectionalLight(0xFFFFFF, 2.1); sunL.position.set(5, 9, 6); scene.add(sunL);
  const rim = new THREE.DirectionalLight(0xFFE2C4, 0.7); rim.position.set(-6, 3, -4); scene.add(rim);

  const W = 3, H = 0.25, GAP = 0.025, N = TRACKS.length;
  const cube = new THREE.Group(); scene.add(cube);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x1C1B19, transparent: true, opacity: 0.55 });
  const label = (tr, c) => {
    const cv = document.createElement('canvas'); cv.width = 1536; cv.height = 128; const g = cv.getContext('2d');
    g.fillStyle = c; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(255,255,255,.95)'; g.font = '800 100px "Bricolage Grotesque", "Instrument Sans", sans-serif'; g.textBaseline = 'middle';
    g.fillText(`${tr.n}  ${tr.title}`, 36, 70, cv.width - 72);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  const slabs = TRACKS.map((tr, i) => {
    const [c, hi] = FAM[tr.group];
    const g = new THREE.Group(); g.position.y = (N - 1 - i) * (H + GAP); cube.add(g);
    const top = new THREE.Color(c).lerp(new THREE.Color('#FFFFFF'), 0.1);
    const side = new THREE.MeshStandardMaterial({ color: c, roughness: 0.78 });
    const mats = [side, side, new THREE.MeshStandardMaterial({ color: top, roughness: 0.8 }), side, side, side];
    const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, W), mats); g.add(box);
    box.add(new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), edgeMat));
    // the track's name on its front face, and on its right face
    const lm = new THREE.MeshBasicMaterial({ map: label(tr, c), toneMapped: false });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.97, H * 0.8), lm); f.position.set(0, 0, W / 2 + 0.002); g.add(f);
    const r = f.clone(); r.rotation.y = Math.PI / 2; r.position.set(W / 2 + 0.002, 0, 0); g.add(r);
    // a little machine on each slab's top, seen when the drawer is out: nodes on rods, in the family's highlight
    const hm = new THREE.MeshStandardMaterial({ color: hi, roughness: 0.5 }), im = new THREE.MeshStandardMaterial({ color: '#F6F4EF', roughness: 0.7 });
    const pts = [];
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + i, rr = 0.55 + (k % 2) * 0.45; pts.push(new THREE.Vector3(Math.cos(a) * rr, H / 2 + 0.11, Math.sin(a) * rr)); }
    pts.forEach((p, k) => { const b = new THREE.Mesh(new THREE.SphereGeometry(k === 0 ? 0.13 : 0.09, 18, 12), k === 0 ? hm : im); b.position.copy(p); g.add(b); });
    for (let k = 1; k < pts.length; k++) {
      const a = pts[0], b = pts[k], d = b.clone().sub(a), rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, d.length(), 6), hm);
      rod.position.copy(a).add(b).multiplyScalar(0.5); rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(rod);
    }
    return { g, tr, base: g.position.y, out: 0 };
  });
  const midY = ((N - 1) * (H + GAP)) / 2; cube.position.y = -midY;
  // a soft floor shadow
  const sh = document.createElement('canvas'); sh.width = sh.height = 128; { const g = sh.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -midY - H / 2 - 0.01; scene.add(shadow);

  let fitD = 24, fitY = 0.3, fitN = 0, vw = 0, vh = 0, p = 0, pp = 0, yaw = 0, tilt = 0, py = 0, px = 0, fps = 60, dpr = Math.min(devicePixelRatio || 1, touch ? 1.5 : 2);
  function size() {
    vw = pin.clientWidth; vh = pin.clientHeight;
    renderer.setPixelRatio(dpr); renderer.setSize(vw, vh, false);
    cam.aspect = vw / vh;
    // portrait screens: widen the view so the whole cube fits above the words
    cam.fov = vw < vh ? 34 : 26; cam.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);
  addEventListener('pointermove', e => { px = (e.clientX / innerWidth - 0.5) * 2; py = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
  const prog = () => { const r = stage.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };
  // chapter k occupies [a, b] of the scroll: its slabs rise out, hold, and slide home again
  const START = 0.13, END = 0.97, SPAN = (END - START) / CH.length;
  const bump = u => u < 0 || u > 1 ? 0 : u < 0.22 ? ease(u / 0.22) : u > 0.86 ? ease((1 - u) / 0.14) : 1;
  let last = performance.now(), t0 = last, frames = 0, sum = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    p = reduced ? 0 : prog(); pp += (p - pp) * (1 - Math.exp(-dt * 7));
    const portrait = vw < vh * 0.9;
    // the hero: words on the left, the cube turning slowly on the right; then the words slide away
    const h = ease(clamp((pp - 0.02) / (START - 0.02)));
    hero.style.transform = portrait ? `translateY(${h * 60}px)` : `translate(${-h * 140}px, -50%)`;
    hero.style.opacity = 1 - h; hero.style.pointerEvents = h > 0.5 ? 'none' : '';
    if (hint) hint.style.opacity = 1 - clamp(pp * 12);
    // which chapter, and how far out its slabs are
    let lead = -1, best = 0;
    chaps.forEach((el, k) => {
      const u = (pp - START - k * SPAN) / SPAN, b = bump(u);
      if (b > best) { best = b; lead = k; }
      el.style.opacity = b;
      el.style.transform = portrait ? `translateY(${(1 - b) * 40}px)` : `translate(${(1 - b) * (u < 0.5 ? 80 : -40)}px, -50%)`;
      el.classList.toggle('on', b > 0.6);
    });
    sun.style.backgroundColor = CH_SUN[lead < 0 ? 0 : lead];
    slabs.forEach(s => {
      const k = CH.findIndex(c => c.includes(s.tr.n)), u = (pp - START - k * SPAN) / SPAN;
      const want = bump(u);
      s.out += (want - s.out) * (1 - Math.exp(-dt * 9));
      const j = CH[k].indexOf(s.tr.n);
      // drawers pull out towards the viewer, each one a little further than the one above, like a fanned stack
      s.g.position.set(s.out * (0.75 + j * 0.25), s.base + s.out * 0.1, s.out * (0.75 + j * 0.25));
    });
    const t = (now - t0) / 1000;
    // the camera: a slow turn while idle on the hero, then a measured orbit as you scroll
    yaw = (reduced ? 0 : Math.sin(t * 0.25) * 0.18 * (1 - h)) + pp * 0.7 + px * 0.08;
    tilt = 0.52 - pp * 0.12 - py * 0.04;
    const d = portrait ? fitD : 14.5 + h * 2.5, a = Math.PI / 4 + yaw;
    cam.position.set(Math.sin(a) * Math.cos(tilt) * d, Math.sin(tilt) * d, Math.cos(a) * Math.cos(tilt) * d);
    cam.lookAt(0, 0, 0);
    // slide the cube across the screen: right of the words on the hero, left of the chapters after
    const sx = portrait ? 0 : 0.2 * (1 - h) - 0.21 * h, sy = portrait ? fitY : 0;
    cam.setViewOffset(vw, vh, -sx * vw, sy * vh, vw, vh);
    if (bg) bg.style.transform = `translate3d(0, ${-pp * 6}%, 0)`;
    renderer.render(scene, cam);
    // the circle: around the cube on the hero, then around the words of the chapter that is open
    const c0 = new THREE.Vector3(0, 0, 0).project(cam), up = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1).multiplyScalar(2.75).project(cam);
    const cx = (c0.x + 1) / 2 * vw, cy = (1 - c0.y) / 2 * vh, rc = Math.abs(up.y - c0.y) / 2 * vh;
    // phones: the cube sizes and places itself in the space between the top bar and the words, so they never overlap
    if (portrait) {
      const pr = pin.getBoundingClientRect(), hb = document.querySelector('.home .top').getBoundingClientRect().bottom - pr.top;
      const words = h < 0.5 ? hero : lead >= 0 ? chaps[lead] : null;
      const top = Math.max(10, hb + 6), bot = words ? words.getBoundingClientRect().top - pr.top - 10 : vh * 0.6;
      const rD = Math.max(60, (bot - top) / 2 * 0.94), cyD = (top + bot) / 2;
      const k = fitN < 30 ? 1 : 1 - Math.exp(-dt * 6); fitN++;
      fitD = clamp(fitD * (1 + (rc / rD - 1) * k), 10, 80); fitY += (cy - cyD) / vh * k;
    }
    let tx = cx, ty = cy, tr = rc * 1.08;
    if (!portrait && lead >= 0) {
      const r = chaps[lead].getBoundingClientRect(), pr = pin.getBoundingClientRect();
      const k = ease(clamp(best * 1.4));
      tx = cx + (r.left - pr.left + r.width / 2 - cx) * k; ty = cy + (r.top - pr.top + r.height / 2 - cy) * k;
      tr = tr + (Math.max(Math.hypot(r.width, r.height) / 2 + 40, vh * 0.46) - tr) * k;
    }
    sun.style.width = sun.style.height = `${(tr * 2).toFixed(1)}px`;
    sun.style.transform = `translate(${(tx - tr).toFixed(1)}px, ${(ty - tr).toFixed(1)}px)`;
    // keep phones smooth: drop the pixel ratio if frames run slow
    frames++; sum += dt; if (sum > 2) { fps = frames / sum; frames = 0; sum = 0; if (fps < 40 && dpr > 1) { dpr = Math.max(1, dpr - 0.25); size(); } }
    if (!reduced) requestAnimationFrame(frame);
  }
  if (reduced) { document.fonts?.ready.then(() => frame(performance.now())); frame(performance.now()); }
  else requestAnimationFrame(frame);
  window.__home = { p: () => pp, jump: v => { const r = stage.getBoundingClientRect(); scrollTo(0, scrollY + r.top + v * (r.height - innerHeight)); pp = v; } };
}

/* ---------- headings stay on one line: each shrinks just enough to fit its column ---------- */
const fitEls = [...document.querySelectorAll('.hero h1 span, .sec h2, .chap h2, .close .name')];
function fitText() {
  for (const el of fitEls) {
    el.style.fontSize = ''; el.style.whiteSpace = 'nowrap';
    const w = el.clientWidth, sw = el.scrollWidth;
    if (sw > w + 1) el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * w / sw * 0.98).toFixed(1)}px`;
  }
}
fitText(); document.fonts?.ready.then(fitText); addEventListener('resize', fitText);

/* ---------- the lessons wall: a few first, the rest on request ---------- */
const wall = document.getElementById('wall'), wallBtn = document.getElementById('wallBtn');
if (wall && wallBtn) wallBtn.addEventListener('click', () => {
  const open = wall.classList.toggle('open'); wallBtn.setAttribute('aria-expanded', open);
  wallBtn.textContent = open ? 'Show fewer' : wallBtn.dataset.label || wallBtn.textContent;
  if (!open) wall.scrollIntoView({ block: 'start' });
  wall.querySelectorAll('.tile').forEach(t => t.classList.add('seen'));
});
if (wallBtn) wallBtn.dataset.label = wallBtn.textContent;

/* ---------- the tapes slide with the scroll, in opposite directions ---------- */
const tapes = [...document.querySelectorAll('.tape')];
if (tapes.length && !reduced) {
  const sec = document.querySelector('.afr');
  const go = () => {
    const r = sec.getBoundingClientRect(), u = (innerHeight - r.top) / (innerHeight + r.height);
    tapes.forEach((el, i) => { const w = el.scrollWidth - innerWidth; el.style.transform = `translate3d(${(i % 2 ? -(1 - u) : -u) * Math.max(0, w) * 0.8}px,0,0)`; });
    requestAnimationFrame(go);
  };
  requestAnimationFrame(go);
}

/* ---------- the live thing: roll a ball down a real slope ---------- */
const cv = document.getElementById('slope');
if (cv) {
  const g = cv.getContext('2d'), out = document.getElementById('slopeOut'), lr = document.getElementById('lr'), lrV = document.getElementById('lrV');
  const f = x => 0.5 * x * x, df = x => x;            // the hill: height = half of x squared
  const X = 4.2, st = { x: -3.6, trail: [], n: 0, t: 0, done: false, off: false };
  const drop = x => { st.x = x; st.trail = [x]; st.n = 0; st.t = 0; st.done = false; st.off = false; say(); };
  function say() {
    const k = +lr.value; lrV.textContent = k.toFixed(2);
    if (st.off) out.textContent = 'Too big a step: it flew off the hill.';
    else if (st.done) out.textContent = k > 1.02 ? `Bounced across the valley, at the bottom after ${st.n} steps.` : `At the bottom after ${st.n} step${st.n === 1 ? '' : 's'}.`;
    else if (k > 1.02) out.textContent = `Step ${st.n}: overshooting, it jumps across the valley.`;
    else if (k < 0.15) out.textContent = `Step ${st.n}: tiny steps, safe but slow.`;
    else out.textContent = `Step ${st.n}: rolling downhill.`;
  }
  // while the slider moves, every step for the new size is worked out at once and drawn: the trail, where the ball ends,
  // and what happened. Letting go replays it step by step.
  let x0 = -3.6;
  function preview() {
    let x = x0, n = 0; const trail = [x];
    while (n < 60 && Math.abs(x) >= 0.02 && Math.abs(x) <= X * 1.05) { x -= +lr.value * df(x); n++; trail.push(x); }
    Object.assign(st, { x, trail, n, t: 0, off: Math.abs(x) > X, done: Math.abs(x) < 0.02 }); say();
  }
  lr.addEventListener('input', preview);
  lr.addEventListener('change', () => drop(x0));
  document.getElementById('drop').addEventListener('click', () => drop(x0));
  cv.addEventListener('pointerdown', e => { const r = cv.getBoundingClientRect(); x0 = clamp(((e.clientX - r.left) / r.width - 0.5) * 2 * X, -X, X); drop(x0); });
  function draw(dt) {
    const w = cv.clientWidth, h = cv.clientHeight, s = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * s)) { cv.width = Math.round(w * s); cv.height = Math.round(h * s); }
    g.setTransform(s, 0, 0, s, 0, 0); g.clearRect(0, 0, w, h);
    const sx = x => w / 2 + (x / X) * (w / 2 - 24), sy = y => h - 28 - (y / f(X)) * (h - 70);
    // dotted ground
    g.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < w; i += 18) for (let j = 0; j < h; j += 18) g.fillRect(i, j, 2, 2);
    g.beginPath(); for (let i = 0; i <= 120; i++) { const x = -X + (i / 120) * 2 * X; i ? g.lineTo(sx(x), sy(f(x))) : g.moveTo(sx(x), sy(f(x))); }
    g.lineTo(sx(X), h); g.lineTo(sx(-X), h); g.closePath(); g.fillStyle = '#EE7434'; g.globalAlpha = 0.22; g.fill(); g.globalAlpha = 1;
    g.lineWidth = 4; g.strokeStyle = '#EE7434'; g.beginPath(); for (let i = 0; i <= 120; i++) { const x = -X + (i / 120) * 2 * X; i ? g.lineTo(sx(x), sy(f(x))) : g.moveTo(sx(x), sy(f(x))); } g.stroke();
    // each step's landing spot, joined by hops
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; g.setLineDash([5, 6]); g.beginPath();
    st.trail.forEach((x, i) => { const yy = sy(Math.min(f(x), f(X))) - 12; i ? g.lineTo(sx(clamp(x, -X, X)), yy) : g.moveTo(sx(clamp(x, -X, X)), yy); }); g.stroke(); g.setLineDash([]);
    if (!st.done && !st.off) { st.t += dt; if (st.t > (reduced ? 0.15 : 0.42)) { st.t = 0; st.x -= +lr.value * df(st.x); st.n++; st.trail.push(st.x); if (Math.abs(st.x) < 0.02) st.done = true; if (Math.abs(st.x) > X * 1.05 || st.n > 60) { st.off = Math.abs(st.x) > X; st.done = !st.off; } say(); } }
    const bx = clamp(st.x, -X, X);
    g.fillStyle = '#F2AE0C'; g.beginPath(); g.arc(sx(bx), sy(f(bx)) - 12, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#FFFFFF'; g.font = '600 14px "Instrument Sans", sans-serif'; g.fillText('the lowest point: the least error', sx(0) - 104, h - 8);
  }
  let lt = performance.now();
  const loop = now => { const dt = Math.min(0.05, (now - lt) / 1000); lt = now; const r = cv.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight) draw(dt); requestAnimationFrame(loop); };
  drop(-3.6); requestAnimationFrame(loop);
}
