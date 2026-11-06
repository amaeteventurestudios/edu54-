// Build your own package manager: an invented clinic-queue app depends on chart ^2.0.0 and date ^1.2.0, and chart 2.3.0 itself needs date
// ^2.0.0. The installer resolves each semver range to the newest matching version in the registry, nests a second copy of date under chart
// when the two ranges cannot share one version, writes the exact versions and their hashes to a lockfile, and checks every download against
// its hash. Next week date 1.5.0 is published with a bug; one mirror serves a tampered chart. Each install is resolved from the registry below.
const REG = {
  chart: { '2.1.0': { deps: { date: '^2.0.0' } }, '2.3.0': { deps: { date: '^2.0.0' } } },
  date: { '1.2.0': {}, '1.4.1': {}, '1.5.0': { buggy: true, week: 1 }, '2.0.0': {}, '2.2.0': {} },
};
const APP = { chart: '^2.0.0', date: '^1.2.0' };
const LOCK = { chart: '2.3.0', date: '1.4.1', 'chart/date': '2.2.0' };
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const sat = (v, range) => { const base = range.slice(1), [M] = base.split('.').map(Number); return +v.split('.')[0] === M && cmp(v, base) >= 0; };
function install(o) {
  const week = o.scen === 'next' ? 1 : 0;
  const avail = name => Object.keys(REG[name]).filter(v => (REG[name][v].week || 0) <= week).sort(cmp);
  const best = (name, range) => avail(name).filter(v => sat(v, range)).pop();
  const tree = [];
  let broken = null, blocked = null;
  const chartV = o.lock ? LOCK.chart : best('chart', APP.chart), dateV = o.lock ? LOCK.date : best('date', APP.date);
  const innerV = o.lock ? LOCK['chart/date'] : best('date', REG.chart[chartV].deps.date);
  tree.push({ path: 'node_modules/chart', v: chartV });
  tree.push({ path: 'node_modules/date', v: dateV });
  if (o.nest) tree.push({ path: 'node_modules/chart/node_modules/date', v: innerV });
  if (o.scen === 'mirror') { if (o.verify) blocked = 'chart 2.3.0: downloaded file does not match its hash'; else broken = 'the tampered chart runs code from the mirror on install'; }
  if (!broken && !blocked) {
    if (!o.nest) broken = `chart ${chartV} needs date ^2.0.0 but finds date ${dateV}: chart.render is not a function`;
    else if (REG.date[dateV].buggy) broken = 'every queue time shows as yesterday';
  }
  return { tree, broken, blocked, dateV, chartV, innerV, works: !broken && !blocked };
}

export default {
  slug: 'build-a-package-manager',
  title: 'Build your own package manager',
  description: 'A clinic-queue app needs two libraries, and one needs a newer version of the other. Resolve each range, nest a second copy, lock it.',
  overview: 'A package manager such as npm or Yarn turns a list of what your project needs into a folder of exact code, and the tiny-package-manager tutorial builds the core. Each dependency is declared with a version range in semantic versioning: ^1.2.0 means any 1.x version from 1.2.0 up, because by convention a change in the first number may break callers while the others should not. The installer asks the registry which versions exist, picks the newest that satisfies each range, and repeats for those packages\' own dependencies, building a tree. Two parts of the tree may need incompatible versions of the same package, here date 1.x for the app and date 2.x for the chart library. Node\'s resolution rules allow a second copy: put date 1.x in the top node_modules and date 2.x inside chart\'s own node_modules, where chart finds it first. Flattening everything to one version would hand one of them the wrong date library. Ranges have a cost: install next week and you may get a release published since, and if it has a bug, your build changes under you though your code did not. A lockfile records the exact version chosen for every package, and where it sits, so every later install, on a laptop or in CI, reproduces the same tree until you choose to update. It also records a hash of each package\'s contents, so the installer can check that what it downloaded is what was locked; a mirror or registry account that serves altered code is caught before that code runs. This machine resolves the installs against an invented registry.',
  keywords: ['build your own package manager', 'semantic versioning', 'dependency resolution', 'lockfile', 'node_modules', 'integrity hash', 'supply chain'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.35, -0.15], dir: [0.05, 0.8, 1.2], half: 0.9, wide: 4.4 },
  credit: 'Built from <a href="https://github.com/g-plane/tiny-package-manager" target="_blank" rel="noopener">Tiny Package Manager</a> by Pig Fang (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short resolver, written for this lesson after tiny-package-manager (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { scen: 'next', nest: true, lock: true, verify: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    const D1 = '#D9C9A8', D2 = '#5B8DB8', CH = '#7A4FB5';
    const colOf = (name, v) => name === 'chart' ? CH : REG.date[v] && REG.date[v].buggy ? BAD : v.startsWith('1.') ? D1 : D2;
    // the registry: every published version on a shelf; sand date 1, blue date 2, plum chart
    const VERS = [['chart', '2.1.0'], ['chart', '2.3.0'], ['date', '1.2.0'], ['date', '1.4.1'], ['date', '1.5.0'], ['date', '2.0.0'], ['date', '2.2.0']];
    const reg = P.shelf(VERS.length, { cell: 0.3, d: 0.32, lh: 0.32 }); reg.position.set(0.3, 0, -0.85); S.add(reg);
    const pull = P.pipe([V(0.3, 0.4, -0.65), V(0.4, 0.5, -0.25), V(0.5, 0.35, 0.0)], SAF, { r: 0.03, n: 4 }); S.add(pull);
    // the app's folder: chart and date side by side, and chart's own copy of date nested on top of it
    const base = P.box(1.8, 0.05, 0.75, '#3A3D4A', { r: 0.04 }); base.position.set(0.55, 0, 0.35); S.add(base);
    const crate = (w, h) => { const m = own('#fff'), b = P.box(w, h, w, '#fff', { r: 0.05, material: m }); b.userData.m = m; S.add(b); return b; };
    const chart = crate(0.5, 0.35); chart.position.set(0.15, 0.05, 0.35);
    const date = crate(0.5, 0.35); date.position.set(1.0, 0.05, 0.35);
    const inner = crate(0.3, 0.22); inner.position.set(0.15, 0.4, 0.35);
    const reachM = own(BAD), reach = P.rod(V(0.4, 0.3, 0.35), V(0.78, 0.3, 0.35), 0.03, BAD, { material: reachM }); S.add(reach);
    // the lockfile: pins exact versions and hashes
    const lockM = own(SAF), lockB = P.box(0.4, 0.28, 0.3, '#fff', { r: 0.05, material: lockM }); lockB.position.set(-0.85, 0, 0.35); S.add(lockB);
    const shackle = P.cyl(0.08, 0.12, '#8E91A3'); shackle.position.set(-0.85, 0.28, 0.35); S.add(shackle);
    const pins = [chart, date].map(c => { const m = own(SAF), r = P.rod(V(-0.65, 0.2, 0.35), c.position.clone().add(V(-0.25, 0.15, 0.1)), 0.015, SAF, { material: m }); S.add(r); return r; });
    // a tampered mirror, and the hash check that refuses its file
    const mirror = P.robot('#8A3B2E', { scale: 0.75, lamp: BAD }); mirror.position.set(-1.75, 0, -0.45); S.add(mirror);
    const bad = P.pipe([V(-1.55, 0.45, -0.45), V(-0.6, 0.6, -0.1), V(-0.05, 0.4, 0.3)], BAD, { r: 0.03, n: 4, pipe: '#E9B8A8' }); S.add(bad);
    const hash = P.gate(0.45, GOOD, { h: 0.5 }); hash.position.set(-0.55, 0, -0.05); hash.rotation.y = 0.6; S.add(hash);
    const lamp = P.lamp(GOOD, { h: 0.5, r: 0.13 }); lamp.position.set(1.75, 0, 0.35); S.add(lamp);
    S.add(P.keep(-2.0, 2.0, 0.9, -1.1, 0.8));
    let R = null;
    function draw() {
      R = install(st);
      const week = st.scen === 'next' ? 1 : 0;
      reg.userData.set({ fill: VERS.map(([n, v]) => (REG[n][v].week || 0) > week ? null : (n === 'chart' ? v === R.chartV : v === R.dateV || (st.nest && v === R.innerV)) ? SAF : colOf(n, v)) });
      const mirrorOn = st.scen === 'mirror';
      chart.userData.m.color.set(mirrorOn && !st.verify ? BAD : CH);
      chart.visible = !(mirrorOn && st.verify);
      date.userData.m.color.set(colOf('date', R.dateV));
      inner.visible = st.nest && chart.visible; inner.userData.m.color.set(colOf('date', R.innerV));
      reach.visible = !st.nest && chart.visible;
      lockM.color.set(st.lock ? SAF : OFF); pins.forEach(p => p.visible = st.lock);
      mirror.visible = mirrorOn; bad.visible = mirrorOn; hash.visible = mirrorOn && st.verify;
      pull.visible = !mirrorOn;
      lamp.userData.set({ color: R.works ? GOOD : R.blocked ? SAF : BAD });
    }
    const tick = dt => { [pull, bad, mirror].forEach(o => o.userData.tick(dt)); hash.userData.tick(dt, true); };
    function isOk() { return st.nest && st.lock && st.verify && (R.works || !!R.blocked); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const SC = { today: 'Install today', next: 'Install next week', mirror: 'Install from a tampered mirror' };
    const SCN = ['today', 'next', 'mirror'];
    const controls = [
      { type: 'toggle', label: 'Nest a second copy when ranges conflict', short: 'Nest', get: () => st.nest, set: v => set({ nest: !!v }) },
      { type: 'toggle', label: 'Install from the lockfile', short: 'Lockfile', get: () => st.lock, set: v => set({ lock: !!v }) },
      { type: 'toggle', label: 'Check every download\'s hash', short: 'Hashes', get: () => st.verify, set: v => set({ verify: !!v }) },
      { type: 'buttons', label: 'When', options: SCN.map(k => SC[k]), get: () => SCN.indexOf(st.scen), act: i => set({ scen: SCN[i] }) },
    ];
    const readouts = [
      { label: 'App', get: () => ({ v: R.works ? 'works' : R.blocked ? 'blocked' : 'broken', sub: SC[st.scen], good: R.works || !!R.blocked, bad: !R.works && !R.blocked }) },
      { label: 'date for the app', get: () => ({ v: R.dateV, sub: '^1.2.0', good: !REG.date[R.dateV].buggy, bad: REG.date[R.dateV].buggy }) },
      { label: 'date for chart', get: () => ({ v: st.nest ? R.innerV : R.dateV, sub: '^2.0.0', good: st.nest, bad: !st.nest }) },
    ];
    const labels = [
      { name: 'r', t: 'The registry', d: 'Every version. Gold: the ones picked', icon: 'book', atV: V(-0.85, 0.35, -0.85) },
      { name: 'i', t: 'The app\'s packages', d: 'Sand: date 1. Blue: date 2. Plum: chart', icon: 'box', atV: V(1.25, 0.3, 0.35) },
      { name: 'l', t: 'The lockfile', d: 'Gold pins: exact versions', icon: 'shield', atV: V(-1.05, 0.15, 0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Flatten to one version', hint: 'chart gets date 1.x', on: () => set({ ...D0, nest: false, scen: 'today' }), off: reset },
      { label: 'Install without the lockfile', hint: 'next week\'s release', on: () => set({ ...D0, lock: false }), off: reset },
      { label: 'Skip the hash check', hint: 'tampered mirror', on: () => set({ ...D0, verify: false, scen: 'mirror' }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.broken && !st.nest) return { ok: false, msg: `<b>Flattened to one date library, the app\'s ^1.2.0 won, so chart, which needs ^2.0.0, got date ${r.dateV}: ${r.broken}.</b> When two ranges cannot share a version, install a second copy inside chart\'s own node_modules.` };
      if (r.broken && st.scen === 'next') return { ok: false, msg: `<b>Without the lockfile, ^1.2.0 picked up date ${r.dateV}, published this week with a bug, so ${r.broken}, though nobody changed the app.</b> Commit a lockfile so every install reproduces the same exact versions until you choose to update.` };
      if (r.broken) return { ok: false, msg: `<b>Without a hash check, the installer trusted whatever the mirror sent: ${r.broken}.</b> Record each package\'s hash in the lockfile and refuse any download that does not match.` };
      if (!st.nest || !st.lock || !st.verify) return { ok: false, msg: `<b>This install happens to work, but the installer ${!st.nest ? 'flattens conflicting versions' : !st.lock ? 'ignores the lockfile: try next week' : 'skips hash checks: try the tampered mirror'}.</b>` };
      return { ok: true, msg: r.blocked ? '<b>The mirror\'s copy of chart did not match the hash in the lockfile, so the install stopped before any of its code ran.</b>' : `<b>The lockfile pinned date ${r.dateV} for the app and ${r.innerV} inside chart, so ${st.scen === 'next' ? 'this week\'s buggy release was never picked up' : 'the tree is exactly what was tested'}, and every file matched its hash.</b>` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Ranges', home: true, say: 'The app asks for chart from 2.0.0 and date from 1.2.0, any compatible version.', act: m => m.set({ scen: 'today', nest: true, lock: false, verify: true }) },
    { t: 'A conflict', home: true, say: 'chart needs date 2. The app needs date 1. One copy cannot satisfy both.', act: m => m.set({ scen: 'today', nest: false, lock: false, verify: true }) },
    { t: 'Nest it', home: true, say: 'Put date 2 inside chart\'s own folder, where chart finds it first.', act: m => m.set({ scen: 'today', nest: true, lock: false, verify: true }) },
    { t: 'Next week', home: true, say: 'A new date 1.5.0 is published with a bug. A fresh install picks it up.', act: m => m.set({ scen: 'next', nest: true, lock: false, verify: true }) },
    { t: 'A lockfile', home: true, say: 'The lockfile records exact versions and hashes, so every install is the same.', act: m => m.set({ scen: 'next', nest: true, lock: true, verify: true }) },
    { t: 'Tampered downloads', home: true, say: 'A mirror serves an altered chart. The hash does not match, and the install stops.', act: m => m.set({ scen: 'mirror', nest: true, lock: true, verify: true }) },
  ],
  check: [
    { q: 'What does ^1.2.0 allow?', options: ['Any 1.x version from 1.2.0 up', 'Only 1.2.0', 'Any version at all'], answer: 0, why: 'The first number signals breaking changes.', hint: 'Install next week without the lockfile.' },
    { q: 'How can two parts of a tree use different versions of one package?', options: ['Nest a copy in the package that needs it', 'Rename one', 'They cannot'], answer: 0, why: 'It finds its own copy first.', hint: 'Try Flatten to one version.' },
    { q: 'What does a lockfile\'s hash protect against?', options: ['Altered downloads', 'Slow installs', 'Version conflicts'], answer: 0, why: 'Mismatch stops the install.', hint: 'Try Skip the hash check.' },
  ],
  terms: [
    ['Semantic versioning', 'MAJOR.MINOR.PATCH: a major bump may break callers.'],
    ['Version range', 'A rule such as ^1.2.0 for acceptable versions.'],
    ['Dependency tree', 'Packages and the packages they need, recursively.'],
    ['Nesting', 'Installing a private copy inside the package that needs it.'],
    ['Lockfile', 'A record of exact versions and hashes for repeatable installs.'],
    ['Integrity hash', 'A fingerprint of a package\'s contents, checked on download.'],
  ],
  deeper: '<p><b>Deduplication.</b> Installers hoist a version to the top when every dependant accepts it, so most trees stay nearly flat.</p><p><b>Install scripts.</b> Packages can run code when installed, which is why supply-chain attacks target them; some managers disable scripts by default.</p><p><b>About this machine.</b> The app, registry and versions are invented.</p>',
  code: {
    title: 'Resolve ranges and check hashes',
    note: 'Our own short version, after tiny-package-manager.',
    text: `
const semver = require("semver"), crypto = require("crypto");

async function resolve(name, range, parentDir, tree, lock) {
  const locked = lock[\`\${parentDir}\${name}\`];
  const version = locked?.version ?? semver.maxSatisfying(await registry.versions(name), range);
  const top = tree["node_modules/" + name];
  const dir = !top || top.version === version ? "node_modules/" : \`\${parentDir}node_modules/\`;  // nest on conflict
  tree[dir + name] = { version, integrity: locked?.integrity };
  for (const [dep, r] of Object.entries(await registry.deps(name, version)))
    await resolve(dep, r, \`\${dir}\${name}/\`, tree, lock);
}

function verify(buffer, integrity) {
  const actual = "sha512-" + crypto.createHash("sha512").update(buffer).digest("base64");
  if (actual !== integrity) throw new Error("integrity mismatch: refusing to install");
}
`,
  },
};
