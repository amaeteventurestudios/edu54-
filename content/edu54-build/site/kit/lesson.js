// Mount a lesson: the stage, the page shell, the lesson's machine, the walkthrough, labels, readouts and Break it.
// A lesson is a plain object (see docs/HANDOFF.md) with no imports, so Node can read it for the pages:
//   { slug, title, description, overview, orient, view, build(S) → M, story, code, check, terms, deeper }
// build(S) makes the machine with the helpers in S and returns
//   M = { update(dt, t), controls, readouts, labels, status() → {msg, ok}, breaks: [{label, hint, on(), off()}], reset(), fit, plinth }
import * as THREE from 'three';
import * as P from './parts.js';
import { createStage } from './stage.js';
import { createUI } from './ui.js';
import { createStory } from './story.js';
import { progress } from './progress.js';
import { openAccount, initAccount } from './account.js';
import { money } from './money.js';

const V = P.V;

export function mountLesson(L) {
  const qs = new URLSearchParams(location.search);
  let R, M, story, showLabels = true, broken = null, t = 0;
  const ui = createUI(L, {
    view: {
      zIn: () => R.zoomBy(1.25), zOut: () => R.zoomBy(0.8), rotL: () => R.rotateBy(-Math.PI / 6), rotR: () => R.rotateBy(Math.PI / 6),
      fit: () => R.goHome(true),
      labels: b => { showLabels = !showLabels; ui.setPressed('labels', showLabels); },
    },
    play: () => story.toggle(),
    storyFrom: i => story.start(i),
    storyCtl: c => story.command(c),
    layout: a => layout(a),
    themeChanged: () => R?.readTheme(),
    currencyChanged: () => { M.currency?.(); ui.buildTry(M.controls || [], M.breaks || []); ui.syncAll(); },
    account: () => openAccount(ui),
    breakIt: i => breakIt(i),
    broken: () => broken,
    completed: () => { if (progress.add(L.slug)) ui.showPop('Lesson complete', `<p>Well done. <b>${L.title}</b> is saved in your progress.</p><p>Finish every lesson in a track to earn its certificate.</p>`); },
  });
  for (const s of progress.all()) ui.markDone(s);

  R = createStage(ui.stage, ui.canvas, { view: L.view, preserve: qs.has('shot') });
  const root = new THREE.Group(); R.scene.add(root);

  /* ---------- what a lesson's build(S) gets ---------- */
  // live materials follow the theme; texts made with S.text and no colour follow the theme's ink
  const live = { accent: P.mat(0, { fresh: true }), hi: P.mat(0, { fresh: true }), paper: P.mat(0, { fresh: true }), side: P.mat(0, { fresh: true }) };
  const inkNow = () => R.theme.dark ? '#E9EAF4' : '#151827';
  const autoTexts = [];
  const S = {
    THREE, V, P, R, root, money, lite: R.lite, reduced: R.state.reduced, theme: R.theme, M: live,
    // colours that read on both themes: the lesson's own content
    C: { red: '#D9483B', orange: '#EE7434', gold: '#E3A72F', yellow: '#F2C94C', green: '#3E9B5F', leaf: '#6FAE4A', teal: '#1C9A94', blue: '#3D6BD6', indigo: '#2F3C8F', plum: '#8A3F8E', coral: '#EE6352', clay: '#C9774A', wood: '#A87A4F', sand: '#E8D9B5', paper: '#F7F5EE', stone: '#B9B6AE', ink: '#151827', grey: '#8E91A3' },
    add: (...o) => { root.add(...o); return o[0]; },
    text: (str, o = {}) => { const m = P.text(str, { ...o, color: o.color || inkNow() }); if (!o.color) autoTexts.push(m); return m; },
    ink: inkNow,
    tap: (obj, fn) => { obj.userData.tap = fn; return obj; },
    status: c => ui.setStatus(c),
    pop: (title, html) => ui.showPop(title, html),
    sync: () => ui.syncAll(),
    label: (name, t, d) => ui.setLabelText(name, t, d),
    focus: (target, zoom) => focus(target, zoom),
    home: () => R.goHome(true),
    get t() { return t; },
    get form() { return ui.form; },
  };
  R.onTheme(th => {
    live.accent.color.copy(th.accent); live.hi.color.copy(th.hi); live.paper.color.copy(th.paper); live.side.color.copy(th.side);
    for (const m of autoTexts) m.userData.style({ color: inkNow() });
    M?.theme?.(th);
  });

  M = L.build(S) || {};
  M.S = S;
  ui.buildTry(M.controls || [], M.breaks || []);
  ui.buildReadouts(M.readouts || []);
  ui.buildLabels(M.labels || []);

  /* ---------- the plinth and the fit ---------- */
  function fitBox() {
    if (M.fit) return new THREE.Box3(V(M.fit[0], M.fit[1], M.fit[2]), V(M.fit[3], M.fit[4], M.fit[5]));
    const b = new THREE.Box3();
    root.updateMatrixWorld(true);
    (function walk(o) {
      if (o.userData.noFit || !o.visible) return;
      if ((o.isMesh || o.isInstancedMesh) && o.layers.mask !== 2) b.expandByObject(o, false);
      else for (const c of o.children) walk(c);
    })(root);
    if (b.isEmpty()) b.set(V(-3, 0, -3), V(3, 2, 3));
    return b;
  }
  let box = fitBox(), plinth = null;
  if (M.plinth !== false) {
    const pl = M.plinth || {};
    plinth = R.buildPlinth(pl.bounds || [box.min.x, box.min.z, box.max.x, box.max.z], { pad: pl.pad ?? 0.7, h: pl.h ?? 0.45 });
  }
  // the machine and its plinth are fitted into the space the panels leave
  const refit = () => {
    box = fitBox(); const b = box.clone();
    if (plinth) b.union(new THREE.Box3(V(plinth.x0, -0.5, plinth.z0), V(plinth.x1, 0, plinth.z1)));
    R.setFitBox(b);
  };
  refit();
  let lastForm = null;
  function layout(a) {
    if (!R) return;
    R.setArea({ ...(a || ui.area), auto: true, margin: ui.form === 'desktop' ? 1.02 : 1.05 });
    if (ui.form !== lastForm) { lastForm = ui.form; R.fitTurn(ui.form === 'sheet' && L.phoneTurn !== false); }
  }
  layout(ui.area);

  /* ---------- the walkthrough ---------- */
  const labelAt = name => { const l = (M.labels || []).find(x => x.name === name || x.t === name); return l ? (typeof l.at === 'function' ? l.at() : l.atV) : null; };
  function focus(target, zoom) {
    const p = Array.isArray(target) ? V(...target) : target?.isVector3 ? target : labelAt(target);
    if (p) R.focusOn(p, zoom || (ui.form === 'desktop' ? 1.7 : 1.45));
  }
  story = createStory({
    L, ui, ctl: {
      S: M, focus, home: () => R.goHome(true),
      begin: () => { if (broken != null) breakIt(null); M.reset?.(); ui.syncAll(); if (ui.form !== 'desktop') { ui.closeAll(); ui.openSheet(false); } },
      done: () => ui.showCheck(),
    }
  });

  /* ---------- Break it ---------- */
  function breakIt(i) {
    const br = M.breaks || [];
    if (broken != null) br[broken]?.off?.();
    broken = i == null || i === broken ? null : i;
    if (broken != null) br[broken].on?.();
    ui.syncAll();
  }

  /* ---------- the frame ---------- */
  const clock = new THREE.Clock();
  let stT = 0;
  function step(dt) { t += dt; M.update?.(dt, t); }
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    step(dt);
    R.updateView(dt);
    P.faceCamera(R.cam);
    ui.updateReadouts(dt);
    stT += dt; if (stT > 0.12 && M.status) { stT = 0; ui.setStatus(M.status()); }
    story.tick(dt);
    R.draw();
    const playing = story.playing() ? (L.story[story.index]?.labels || null) : null;
    ui.placeLabels({ show: showLabels, toScreen: p => R.toScreen(p), W: R.W, H: R.H, mask: () => R.mask(), only: playing });
    R.adapt(dt);
    requestAnimationFrame(frame);
  }
  if (M.status) ui.setStatus(M.status());
  requestAnimationFrame(frame);
  setTimeout(refit, 300);
  initAccount(ui);

  /* ---------- test hooks ---------- */
  function audit() {
    const sr = ui.stage.getBoundingClientRect(), a = ui.area, out = { overlaps: [], offscreen: [], covers: [], covered: [], nan: [] };
    const boxes = ui.placed;
    const ov = (p, q) => p[0] < q[2] && p[2] > q[0] && p[1] < q[3] && p[3] > q[1];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (ov(boxes[i].box, boxes[j].box)) out.overlaps.push([boxes[i].name, boxes[j].name]);
    for (const b of boxes) { const [x0, y0, x1, y1] = b.box; if (x0 < 0 || y0 < a.top - 2 || x1 > sr.width || y1 > sr.height - a.bottom + 2) out.offscreen.push(b.name); }
    // the machine must sit inside the space the panels leave
    const c = []; const bb = fitBox(); if (plinth) bb.union(new THREE.Box3(V(plinth.x0, -0.5, plinth.z0), V(plinth.x1, 0, plinth.z1)));
    for (const x of [bb.min.x, bb.max.x]) for (const y of [bb.min.y, bb.max.y]) for (const z of [bb.min.z, bb.max.z]) c.push(R.toScreen(V(x, y, z)));
    const mb = [Math.min(...c.map(q => q[0])), Math.min(...c.map(q => q[1])), Math.max(...c.map(q => q[0])), Math.max(...c.map(q => q[1]))];
    out.machine = mb.map(Math.round);
    const slack = 0.04 * (mb[3] - mb[1]);
    if (mb[1] < a.top - slack || mb[3] > sr.height - a.bottom + slack || mb[0] < -2 || mb[2] > sr.width + 2) out.covered.push('machine');
    const mask = R.mask();
    for (const b of boxes) if (b.kind === 'card' && mask.cover(...b.box) > 0.08) out.covers.push(b.name);
    root.traverse(o => { if (!Number.isFinite(o.position.x + o.position.y + o.position.z)) out.nan.push(o.name || o.type); });
    out.ok = !out.overlaps.length && !out.offscreen.length && !out.covers.length && !out.covered.length && !out.nan.length;
    return out;
  }
  window.__build = {
    L, M, S, R, ui, story,
    skipIntro: () => { ui.hidePop(); return true; },
    ff: sec => { const st = 1 / 30; for (let k = 0; k < sec / st; k++) step(st); if (M.status) ui.setStatus(M.status()); return M.status?.()?.msg; },
    step: n => { const st = L.story?.[n - 1]; if (!st) return false; if (st.focus) focus(st.focus, st.zoom); else if (st.home) R.goHome(); st.act?.(M); R.state.focus && (R.state.focus.t = 0.999); return true; },
    play: k => story.start(k || 0), stop: () => story.stop(),
    breakIt: i => { breakIt(i); return M.status?.()?.msg; },
    set: (label, v) => { const c = (M.controls || []).find(x => x.label === label); if (!c) return false; if (c.type === 'button') c.act(); else if (c.type === 'buttons') c.act(v); else c.set(v); ui.syncAll(); return true; },
    status: () => M.status?.(),
    audit, settle: () => { if (R.state.focus) R.state.focus.t = 0.999; R.state.spin = null; },
    panel: p => ui.setPanel(p), sheet: o => ui.openSheet(o), home: () => R.goHome(), labels: on => { showLabels = on; },
    check: () => ui.showCheck(),
  };
  return window.__build;
}
