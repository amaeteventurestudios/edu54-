// Build your own module bundler: an invented market-stall app has four files. index.js imports cart.js and ui/render.js, and both of those import
// store.js, which keeps a running count. The bundler starts at the entry, reads each file's imports, resolves each path relative to the file
// that wrote it, gives every module one id, and wraps each in a function so its top-level names stay private. The bundle then runs: two
// items are added through cart.js and render.js reads the count. Each outcome follows from building and running the graph below.
const FILES = {
  'index.js': { deps: ['./cart.js', './ui/render.js'], code: 'cart.add(); cart.add(); show(render())' },
  'cart.js': { deps: ['./store.js'], code: 'export const add = () => store.add()' },
  'ui/render.js': { deps: ['../store.js'], code: 'const count = store.get(); export default () => `${count} items`' },
  'store.js': { deps: [], code: 'let count = 0; export add, get' },
};
const dir = p => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
const join = (base, rel) => { const parts = base ? base.split('/') : []; for (const seg of rel.split('/')) { if (seg === '.' || seg === '') continue; if (seg === '..') { if (!parts.length) return null; parts.pop(); } else parts.push(seg); } return parts.join('/'); };
function bundle(o) {
  const mods = [], byPath = {};
  let error = null;
  const visit = (path, from) => {
    if (!FILES[path]) { error = error || `cannot find ${path} (imported by ${from})`; return -1; }
    if (o.dedupe && byPath[path] !== undefined) return byPath[path];
    const id = mods.length, m = { id, path, map: {} };
    mods.push(m); byPath[path] = id;
    FILES[path].deps.forEach(d => { const target = join(o.relative ? dir(path) : '', d) ?? `${d} (outside the project)`; m.map[d] = visit(target, path); });
    return id;
  };
  visit('index.js', 'the entry');
  let result = null, runtime = null;
  if (!error) {
    if (!o.wrap) runtime = 'SyntaxError: Identifier \'count\' has already been declared';
    else {
      const stores = mods.filter(m => m.path === 'store.js').map(() => ({ count: 0 }));
      const storeOf = m => stores[mods.filter(x => x.path === 'store.js').indexOf(mods[m.map['./store.js'] ?? m.map['../store.js']])];
      const cart = mods.find(m => m.path === 'cart.js'), ui = mods.find(m => m.path === 'ui/render.js');
      storeOf(cart).count += 2;
      result = storeOf(ui).count;
    }
  }
  return { mods, error, result, runtime, copies: mods.filter(m => m.path === 'store.js').length, size: mods.reduce((a, m) => a + FILES[m.path].code.length + 40, 60) };
}

export default {
  slug: 'build-a-module-bundler',
  title: 'Build your own module bundler',
  description: 'A market-stall app has four files that import each other, and the browser wants one. Follow the imports, keep one copy of each, wrap them.',
  overview: 'Modern web apps are written as many small files that import one another, but browsers long loaded scripts one by one, so bundlers such as webpack, Rollup and esbuild combine them; minipack shows the core in about two hundred lines. The bundler starts from an entry file, parses it into a syntax tree and collects its import statements. Each import path is resolved relative to the directory of the file that wrote it, so ../store.js written inside ui/render.js means store.js at the root, not a folder above the project. The bundler visits each resolved file in turn, building a dependency graph, and gives every distinct file one id; when a second file imports a module that is already in the graph, it must reuse the same id, because a module is meant to run once and be shared. A shared store imported twice and bundled twice becomes two stores, and changes made through one are invisible through the other. Next, each module\'s code, transpiled for older browsers if needed, is wrapped in a function that receives require, module and exports, so its top-level names are private to it: pasted together unwrapped, two files that both declare const count would clash. Each module also gets a mapping from its own import strings to ids. Finally the bundle adds a tiny runtime, a require function that runs a module\'s function the first time, caches its exports and returns them. Real bundlers add tree shaking to drop unused exports, code splitting, source maps and caching. This machine bundles an invented market-stall app from Kumasi.',
  keywords: ['build your own bundler', 'module bundler', 'dependency graph', 'minipack', 'module resolution', 'webpack', 'JavaScript modules'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.25, -0.1], dir: [0.05, 0.85, 1.2], half: 0.95, wide: 5.6 },
  credit: 'Built from <a href="https://github.com/ronami/minipack" target="_blank" rel="noopener">Minipack</a> by Ronen Amiel (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short bundler, written for this lesson after Minipack (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { dedupe: true, relative: true, wrap: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const KIND = { 'index.js': '#3D6BD6', 'cart.js': '#2E8C5A', 'ui/render.js': '#C2477A', 'store.js': '#D9822B' };
    const glassM = new THREE.MeshLambertMaterial({ color: '#CFE3F2', transparent: true, opacity: 0.3, depthWrite: false });
    // the bundle: a tray where each module lands, wrapped in its own glass case
    const tray = P.box(1.9, 0.05, 0.75, '#3A3D4A', { r: 0.04 }); tray.position.set(0.9, 0, 0.0); S.add(tray);
    // the screen's count: one cube per item in the cart, two expected
    const pedM = new THREE.MeshLambertMaterial({ color: '#3A3D4A' }), ped = P.box(0.5, 0.05, 0.5, '#fff', { r: 0.04, material: pedM }); ped.position.set(2.45, 0, 0.0); S.add(ped);
    const shown = P.stack(0.3, 0.3, 0.2, { max: 4 }); shown.position.set(2.45, 0.05, 0.0); S.add(shown);
    S.add(P.keep(-2.55, 2.75, 0.85, -1.05, 0.8));
    let parts = [], R = null;
    function draw() {
      R = bundle(st);
      parts.forEach(p => p.parent && p.parent.remove(p)); parts = [];
      const add = o => { o.userData.noFit = true; S.add(o); parts.push(o); return o; };
      // the dependency graph: crates joined by gold import rods
      const slots = { 'index.js': V(-1.6, 0, -0.75), 'cart.js': V(-2.2, 0, -0.1), 'ui/render.js': V(-1.0, 0, -0.1) };
      const storeSlots = R.copies > 1 ? [V(-2.2, 0, 0.55), V(-1.0, 0, 0.55)] : [V(-1.6, 0, 0.55)];
      let si = 0;
      const pos = R.mods.map(m => m.path === 'store.js' ? storeSlots[si++] : slots[m.path]);
      const stores = [];
      R.mods.forEach((m, i) => {
        const p = pos[i], dup = m.path === 'store.js' && R.copies > 1;
        const b = add(P.box(0.42, 0.3, 0.36, KIND[m.path], { r: 0.05 })); b.position.copy(p);
        if (dup) { const ring = add(P.box(0.62, 0.04, 0.56, BAD, { r: 0.04 })); ring.position.copy(p); }
        if (m.path === 'store.js') stores.push(p);
        Object.entries(m.map).forEach(([rel, id]) => {
          const q = id >= 0 ? pos[id] : V(-0.35, 0, 0.55);
          if (id < 0) { const miss = add(P.box(0.4, 0.03, 0.36, BAD, { r: 0.04 })); miss.position.copy(q); }
          add(P.rod(p.clone().setY(0.16), q.clone().setY(0.16), 0.02, id < 0 ? BAD : SAF));
        });
      });
      // each store's own count, as coins: the cart adds to one, the screen reads the other
      if (!R.error && st.wrap) {
        const cartStore = 0;
        stores.forEach((p, k) => { const n = R.copies > 1 ? (k === cartStore ? 2 : 0) : 2; for (let c = 0; c < n; c++) { const coin = add(P.cyl(0.09, 0.04, SAF)); coin.position.set(p.x + 0.28, 0.0 + c * 0.05, p.z); } });
      }
      // the bundle tray: one case per module; unwrapped, their names collide
      const n = R.mods.length, w = Math.min(0.34, 1.7 / Math.max(1, n));
      R.mods.forEach((m, i) => {
        const x = 0.05 + (1.7 / n) * (i + 0.5);
        const clash = !st.wrap;
        const b = add(P.box(w * 0.7, 0.22, 0.3, clash ? BAD : R.error ? OFF : KIND[m.path], { r: 0.04 })); b.position.set(x, 0.05, 0);
        if (st.wrap) { const g = add(new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.32, 0.42), glassM)); g.position.set(x, 0.21, 0); g.userData.noMask = true; }
      });
      const ok = R.result === 2;
      shown.userData.set({ n: R.result ?? 0, colors: Array(4).fill(ok ? GOOD : BAD) }); pedM.color.set(ok ? '#3A3D4A' : BAD);
    }
    function isOk() { return !R.error && !R.runtime && R.result === 2; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Give each file one id', short: 'Dedupe', get: () => st.dedupe, set: v => set({ dedupe: !!v }) },
      { type: 'toggle', label: 'Resolve imports from the importing file', short: 'Relative', get: () => st.relative, set: v => set({ relative: !!v }) },
      { type: 'toggle', label: 'Wrap each module in a function', short: 'Wrap', get: () => st.wrap, set: v => set({ wrap: !!v }) },
    ];
    const readouts = [
      { label: 'Modules', get: () => ({ v: R.error ? '—' : `${R.mods.length}`, sub: '4 files', good: R.mods.length === 4 && !R.error, bad: R.mods.length > 4 || !!R.error }) },
      { label: 'Items shown', get: () => ({ v: R.result === null ? '—' : `${R.result}`, sub: 'should be 2', good: R.result === 2, bad: R.result !== 2 }) },
      { label: 'Bundle size', get: () => ({ v: `${R.size} chars`, sub: 'before minifying', good: true, bad: false }) },
    ];
    const labels = [
      { name: 'g', t: 'Four files and their imports', d: 'Orange: the store. Gold coins: its count', icon: 'link', atV: V(-1.81, 0.15, -0.75) },
      { name: 'b', t: 'One bundle, then the screen', d: 'Glass: wrapped modules. Cubes: items shown. Coral: wrong', icon: 'box', atV: V(0.3, 0.03, 0.37) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Bundle store.js twice', hint: 'two separate stores', on: () => set({ ...D0, dedupe: false }), off: reset },
      { label: 'Resolve from the entry', hint: '../ goes missing', on: () => set({ ...D0, relative: false }), off: reset },
      { label: 'Paste files together', hint: 'names collide', on: () => set({ ...D0, wrap: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.error) return { ok: false, msg: `<b>Resolving every import from the entry\'s folder turned ui/render.js\'s ../store.js into a path above the project: ${r.error}.</b> Resolve each import relative to the directory of the file that wrote it.` };
      if (r.runtime) return { ok: false, msg: '<b>Pasted together unwrapped, store.js and ui/render.js both declare count at the top level, so the bundle fails to load.</b> Wrap each module in a function so its top-level names stay private, and pass it require.' };
      if (r.copies > 1) return { ok: false, msg: `<b>store.js was bundled twice, once for cart.js and once for ui/render.js, so cart added two items to one store while the screen read the other: it shows ${r.result} items.</b> Give each file one id and reuse it on every import.` };
      return { ok: true, msg: `<b>Four files, four modules: ../store.js from ui/ and ./store.js from the root resolved to the same file and the same id, each module was wrapped in a function, and the screen shows ${r.result} items.</b>` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Four files', home: true, say: 'A market-stall app has four files that import each other. The browser wants one.', act: m => m.set({ dedupe: true, relative: true, wrap: true }) },
    { t: 'Follow the imports', home: true, say: 'Start at index.js, read its imports, and visit each file in turn to build a graph.', act: m => m.set({ dedupe: true, relative: true, wrap: true }) },
    { t: 'Relative paths', home: true, say: 'Dot dot slash store means one folder up from the file that wrote it, not from the entry.', act: m => m.set({ dedupe: true, relative: false, wrap: true }) },
    { t: 'One id per file', home: true, say: 'Two files import the store. Bundle it twice and they talk to two different stores.', act: m => m.set({ dedupe: false, relative: true, wrap: true }) },
    { t: 'Wrap each module', home: true, say: 'Paste files together and their top-level names collide. Wrap each in a function.', act: m => m.set({ dedupe: true, relative: true, wrap: false }) },
    { t: 'A working bundle', home: true, say: 'A tiny require runs each module once and caches it. The screen shows two items.', act: m => m.set({ dedupe: true, relative: true, wrap: true }) },
  ],
  check: [
    { q: 'How is ../store.js resolved inside ui/render.js?', options: ['From ui/, so it means store.js at the root', 'From the entry\'s folder', 'From the bundler'], answer: 0, why: 'Relative to the importing file.', hint: 'Try Resolve from the entry.' },
    { q: 'Why give each file a single id?', options: ['So shared modules run once and share state', 'To shorten the bundle', 'For sorting'], answer: 0, why: 'Two copies, two stores.', hint: 'Try Bundle store.js twice.' },
    { q: 'Why wrap each module in a function?', options: ['So top-level names stay private', 'For speed', 'To minify'], answer: 0, why: 'Otherwise names collide.', hint: 'Try Paste files together.' },
  ],
  terms: [
    ['Bundler', 'A tool that combines many modules into one file.'],
    ['Entry', 'The file the bundler starts from.'],
    ['Dependency graph', 'Files as nodes, imports as edges.'],
    ['Module resolution', 'Turning an import string into a real file path.'],
    ['Module scope', 'Names private to one module.'],
    ['Tree shaking', 'Leaving out exports nothing uses.'],
  ],
  deeper: '<p><b>Cycles.</b> If two modules import each other, the runtime\'s cache returns a partly finished exports object to break the loop, which is why import order sometimes matters.</p><p><b>Native modules.</b> Browsers now load ES modules directly, but bundlers still win on fewer requests, minifying and tree shaking.</p><p><b>About this machine.</b> The app is invented; the graph and the run follow the rules in this lesson.</p>',
  code: {
    title: 'A bundler in a few lines',
    note: 'Our own short version, after Minipack.',
    text: `
const path = require("path"), fs = require("fs");

function graph(entry) {
  const ids = new Map(), mods = [];
  (function visit(file) {
    if (ids.has(file)) return ids.get(file);              // one id per file
    const id = mods.length, code = fs.readFileSync(file, "utf8");
    ids.set(file, id);
    const mod = { id, code, map: {} };
    mods.push(mod);
    for (const [, rel] of code.matchAll(/import .* from ["'](.+)["']/g)) {
      mod.map[rel] = visit(path.resolve(path.dirname(file), rel));   // relative to the importer
    }
    return id;
  })(path.resolve(entry));
  return mods;
}

function bundle(mods) {
  const body = mods.map(m => \`\${m.id}: [function (require, module, exports) { \${transpile(m.code)} }, \${JSON.stringify(m.map)}]\`);
  return \`(function (modules) {
    const cache = {};
    function require(id) {
      if (cache[id]) return cache[id].exports;
      const [fn, map] = modules[id], module = cache[id] = { exports: {} };
      fn(rel => require(map[rel]), module, module.exports);
      return module.exports;
    }
    require(0);
  })({\${body.join(",")}})\`;
}
`,
  },
};
