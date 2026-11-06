// Python environments: a resolver walks a shelf of package versions and picks one of each that fits every rule,
// writes them into a lock file, and two laptops (Lagos and Kigali) install exactly the same set.
// Break it: no lock file (Kigali installs months later and gets numpy 2), two rules that can't both hold, a GPU build newer than the driver.
const PK = [
  { n: 'torch', v: ['2.2', '2.3', '2.4', '2.5'] },
  { n: 'transformers', v: ['4.38', '4.44', '4.46'] },
  { n: 'numpy', v: ['1.24', '1.26', '2.0', '2.1', '2.2'] },
];
const ROWZ = [-0.15, 0.65, 1.45], VX0 = -0.75, VSTEP = 0.56, LX = -3.05, LZ = -1.15, MX = [0.3, 1.7], MZ = -1.5, DESK = 0.6;
const num = s => s.split('.').map(Number).reduce((a, b) => a * 100 + b, 0);
const ge = (a, b) => num(a) >= num(b), lt = (a, b) => num(a) < num(b);

export default {
  slug: 'python-environments',
  title: 'Python environments and lock files',
  description: 'Watch a resolver walk the shelves of package versions and pick one of each that fits every rule, then write them into a lock file so Lagos and Kigali install exactly the same set. Then forget the lock file.',
  overview: 'Every project lists the packages it needs, with loose rules ("torch 2.3 or newer"). A resolver picks one exact version of each that satisfies every rule at once, including the rules the packages set for each other, and installs them into the project\'s own environment. A lock file writes those exact versions down, so every machine, today or in six months, gets the same set. Without one, "works on my machine" is a promise nobody can keep.',
  keywords: ['python virtual environment', 'uv lock file', 'pyproject toml', 'dependency conflict', 'cuda version mismatch'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.4, 0.4, 0.2], dir: [0.25, 1.15, 1.25], half: 3, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const mono = '"JetBrains Mono", monospace';
    const st = { lock: true, rain: false, plot: false, later: false, cuda: false, pick: [null, null, null], scan: null, fail: null, installed: [null, null], kig: false };
    /* ---------- pyproject.toml: what the project asks for ---------- */
    const sheet = P.box(1.35, 0.04, 2.6, '#FFFFFF', { r: 0.06 }); sheet.position.set(-3.05, 0, 0.65); S.add(sheet);
    const sheetT = S.text('', { size: 0.13, weight: 650, color: '#151827', font: mono, align: 'left', maxW: 1.25, maxH: 2.4 }); sheetT.position.set(-3.05, 0.045, 0.65); S.add(sheetT);
    /* ---------- the shelf of versions ---------- */
    const shelf = P.box(4.05, 0.1, 2.8, '#A87A4F', { r: 0.1 }); shelf.position.set(-0.15, 0, 0.65); S.add(shelf);
    const rows = PK.map((p, r) => {
      const name = P.tile(p.n, 1.1, 0.14, 0.5, '#2C2D31', { size: 0.14, ink: '#FFFFFF', font: mono }); name.position.set(-1.6, 0.1, ROWZ[r]); S.add(name);
      const blocks = p.v.map((v, k) => {
        const m = new THREE.MeshLambertMaterial({ color: '#F7F5EE' });
        const t = P.tile(v, 0.48, 0.18, 0.5, '#F7F5EE', { size: 0.16, font: mono }); t.userData.body.material = m; t.position.set(VX0 + k * VSTEP, 0.1, ROWZ[r]); S.add(t);
        return { t, m };
      });
      return { blocks };
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 8, 32), new THREE.MeshLambertMaterial({ color: C.orange, emissive: C.orange, emissiveIntensity: 0.4 })); ring.rotation.x = -Math.PI / 2; ring.userData.noFit = true; S.add(ring);
    /* ---------- the lock file and the two laptops ---------- */
    // the lock file stands up behind pyproject.toml, so it reads from the front
    const lockB = P.box(1.3, 1.45, 0.06, '#FFF6DA', { r: 0.03 }); lockB.position.set(LX, 0, LZ); S.add(lockB);
    const lockT = S.text('', { size: 0.12, weight: 650, color: '#151827', font: mono, align: 'left', face: 'front', maxW: 1.2, maxH: 1.35 }); lockT.position.set(LX, 0.73, LZ + 0.035); S.add(lockT);
    const desk = P.box(3.0, DESK, 1.3, '#A87A4F', { r: 0.08 }); desk.position.set(1.0, 0, MZ); S.add(desk);
    const machines = ['Lagos', 'Kigali'].map((n, i) => {
      const g = new THREE.Group(); g.position.set(MX[i], DESK, MZ); S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: '#5B5F73' });
      const b = P.box(1.15, 0.36, 1.05, '#5B5F73', { r: 0.08, material: m }); g.add(b);
      const f = S.text(`${n.toUpperCase()} LAPTOP`, { size: 0.1, face: 'front', weight: 800, color: '#FFFFFF', maxW: 1.05 }); f.position.set(0, 0.18, 0.53); g.add(f);
      const top = S.text(n.toUpperCase(), { size: 0.12, weight: 800, color: '#FFFFFF', maxW: 1 }); top.position.set(0, 0.365, -0.36); g.add(top);
      const inst = S.text('', { size: 0.09, weight: 650, color: '#FFFFFF', font: mono, align: 'left', maxW: 1.0, maxH: 0.55 }); inst.position.set(0, 0.365, 0.12); g.add(inst);
      const lm = new THREE.MeshLambertMaterial({ color: C.grey, emissive: C.grey, emissiveIntensity: 0.4 });
      const lamp = P.ball(0.07, C.grey, { material: lm }); lamp.position.set(0.47, 0.42, -0.36); g.add(lamp);
      return { g, m, inst, lm };
    });
    /* ---------- the rules ---------- */
    // what each choice demands of the others; extras add their own rules on numpy
    function allowed(r, v) {
      const [t, tf] = st.pick;
      if (r === 0) return ge(v, '2.3') && (!st.later || true);
      if (r === 1) return true;
      if (r === 2) {
        if (tf === '4.46' && !ge(v, '1.26')) return false;
        if (st.rain && !lt(v, '2.0')) return false;
        if (st.plot && !ge(v, '2.1')) return false;
        return true;
      }
      return true;
    }
    // versions that existed on the day of the install: months later numpy 2 is out
    const exists = (r, v) => st.later || !(r === 2 && ge(v, '2.0')) && !(r === 0 && v === '2.5');
    function resolve() { st.pick = [null, null, null]; st.fail = null; st.scan = { r: 0, k: PK[0].v.length - 1, t: 0 }; st.installed = [null, null]; }
    function install(i) {
      if (!st.pick.every(Boolean)) return;
      // with a lock file every laptop gets the pinned set; without one, Kigali resolves again on its own day
      if (i === 1 && !st.lock) { const keep = [...st.pick]; st.later = true; const p = quick(); st.installed[1] = p; st.pick = keep; st.later = false; return; }
      st.installed[i] = [...st.pick];
    }
    function quick() {
      const p = [null, null, null];
      for (let r = 0; r < 3; r++) { const save = st.pick; st.pick = p; for (let k = PK[r].v.length - 1; k >= 0; k--) { const v = PK[r].v[k]; if (exists(r, v) && allowed(r, v)) { p[r] = v; break; } } st.pick = save; }
      return p;
    }
    function update(dt, t) {
      const sc = st.scan;
      if (sc) {
        sc.t += dt * (S.reduced ? 12 : 3.2);
        if (sc.t >= 1) {
          sc.t = 0;
          const v = PK[sc.r].v[sc.k];
          if (exists(sc.r, v) && allowed(sc.r, v)) { st.pick[sc.r] = v; sc.r++; if (sc.r > 2) { st.scan = null; install(0); install(1); } else sc.k = PK[sc.r].v.length - 1; }
          else if (--sc.k < 0) { st.fail = sc.r; st.scan = null; }
        }
      }
      ring.visible = !!st.scan;
      if (st.scan) ring.position.set(VX0 + st.scan.k * VSTEP, 0.31, ROWZ[st.scan.r]);
      rows.forEach((row, r) => row.blocks.forEach((b, k) => {
        const v = PK[r].v[k], picked = st.pick[r] === v;
        const ok = exists(r, v) && (st.pick.slice(0, r).every(Boolean) || r === 0 ? allowed(r, v) : true);
        b.m.color.set(picked ? '#9FDDB2' : st.fail === r ? '#F4A99F' : !exists(r, v) ? '#D5D3CC' : ok ? '#F7F5EE' : '#E6E2D8');
        b.t.position.y = picked ? 0.22 : 0.1;
      }));
      sheetT.userData.set(['# pyproject.toml', '[project]', 'dependencies = [', '  "torch>=2.3",', '  "transformers",', '  "numpy",', st.rain ? '  "rain-tools",' : '', st.plot ? '  "plot-kit",' : '', ']', '', st.rain ? '# rain-tools: numpy<2' : '', st.plot ? '# plot-kit: numpy>=2.1' : '', '# transformers 4.46:', '#   numpy>=1.26'].filter(x => x !== '').join('\n'));
      lockT.userData.set(st.lock ? (st.pick.every(Boolean) ? ['# uv.lock', ...PK.map((p, r) => `${p.n}\n  ==${st.pick[r]}`)].join('\n') : '# uv.lock\n(resolving…)') : '(no lock file)');
      lockB.material = P.mat(st.lock ? '#FFF6DA' : '#E6E2D8');
      machines.forEach((m, i) => {
        const inst = st.installed[i];
        m.inst.userData.set(inst ? PK.map((p, r) => `${p.n.slice(0, 6)} ${inst[r]}`).join('\n') : '…');
        const bad = (inst && i === 1 && st.installed[0] && inst.join() !== st.installed[0].join()) || (st.cuda && i === 0);
        m.lm.color.set(!inst ? C.grey : bad ? C.red : C.green); m.lm.emissive.copy(m.lm.color);
        m.m.emissive.set(bad ? C.red : '#000000').multiplyScalar(0.18);
      });
    }
    const controls = [
      { type: 'button', label: 'Resolve and install', short: 'Resolve', act: resolve },
      { type: 'toggle', label: 'Write a lock file', short: 'Lock file', get: () => st.lock, set: v => { st.lock = v; resolve(); } },
      { type: 'toggle', label: 'Add rain-tools (needs numpy below 2)', short: 'rain-tools', get: () => st.rain, set: v => { st.rain = v; resolve(); }, quick: false },
      { type: 'toggle', label: 'Add plot-kit (needs numpy 2.1 or newer)', short: 'plot-kit', get: () => st.plot, set: v => { st.plot = v; resolve(); }, quick: false },
      { type: 'toggle', label: 'GPU build newer than the driver', short: 'CUDA', get: () => st.cuda, set: v => { st.cuda = v; }, quick: false },
    ];
    const same = () => st.installed[0] && st.installed[1] && st.installed[0].join() === st.installed[1].join();
    const readouts = [
      { label: 'Resolver', get: () => ({ v: st.scan ? 'working…' : st.fail != null ? 'no solution' : st.pick.every(Boolean) ? 'solved' : '—', good: st.pick.every(Boolean) && st.fail == null, bad: st.fail != null }) },
      { label: 'Laptops match', get: () => ({ v: !st.installed[1] ? '—' : same() ? 'yes' : 'no', good: same(), bad: st.installed[1] && !same() }) },
    ];
    const labels = [
      { name: 'wants', t: 'What the project asks for', d: 'Loose rules in pyproject.toml', icon: 'info', atV: V(-3.72, 0.05, -0.62) },
      { name: 'shelf', t: 'Every version there is', d: 'The resolver picks one per row', icon: 'box', atV: V(1.85, 0.1, -0.75) },
      { name: 'lock', t: 'The lock file', d: 'The exact versions, written down', icon: 'check', atV: V(LX - 0.65, 1.45, LZ) },
      { name: 'laptops', t: 'Every machine', d: 'Installs exactly what the lock says', icon: 'link', atV: V(MX[1] + 0.58, DESK + 0.36, MZ - 0.3) },
    ];
    const reset = () => { Object.assign(st, { lock: true, rain: false, plot: false, cuda: false }); resolve(); };
    const breaks = [
      { label: 'No lock file', hint: 'Kigali installs three months later', on: () => { reset(); st.lock = false; resolve(); }, off: reset },
      { label: 'Two rules that can\'t both hold', hint: 'rain-tools and plot-kit disagree on numpy', on: () => { reset(); st.rain = true; st.plot = true; resolve(); }, off: reset },
      { label: 'GPU build newer than the driver', hint: 'torch for CUDA 12.4, driver for 11.8', on: () => { reset(); st.cuda = true; }, off: reset },
    ];
    function status() {
      if (st.scan) return { msg: `<b>Resolving ${PK[st.scan.r].n}…</b> Try the newest version first; step back until one fits every rule so far.` };
      if (st.fail != null && !st.rain) return { ok: false, msg: `<b>No solution yet.</b> plot-kit needs numpy 2.1 or newer, and on the day of this install the newest numpy is 1.26. Wait for the release, or use an older plot-kit.` };
      if (st.fail != null) return { ok: false, msg: `<b>No solution.</b> rain-tools needs numpy below 2.0 and plot-kit needs numpy 2.1 or newer. No version is both, so the resolver stops and installs nothing. Drop one, or find a release of it that agrees.` };
      if (st.cuda) return { ok: false, msg: `<b>The GPU build doesn't match the driver.</b> This torch was built for CUDA 12.4, but the Lagos laptop's driver only speaks CUDA 11.8, so torch can't reach the graphics card. The build's CUDA version must be at or below the driver's.` };
      if (st.installed[1] && !same()) return { ok: false, msg: `<b>Works in Lagos, breaks in Kigali.</b> With no lock file, Kigali resolved again three months later and got numpy ${st.installed[1][2]} instead of ${st.installed[0][2]}. The code was written for numpy 1, and a few names it uses no longer exist in 2. Write a lock file and commit it.` };
      if (same()) return { ok: true, msg: `<b>Solved and locked.</b> torch ${st.pick[0]}, transformers ${st.pick[1]}, numpy ${st.pick[2]}. Both laptops installed exactly this set from the lock file.` };
      return { msg: `<b>Press Resolve</b> to pick one version of each package that fits every rule.` };
    }
    resolve();
    return { update, controls, readouts, labels, breaks, status, reset, resolve, set: p => { Object.assign(st, p); resolve(); }, cuda: v => { st.cuda = v; } };
  },

  story: [
    { t: 'Loose rules', focus: 'wants', zoom: 1.4, say: 'A project lists the packages it needs, with loose rules: torch, version two point three or newer, and whatever transformers and numpy fit.', act: m => m.reset() },
    { t: 'The resolver', focus: [-0.15, 0.2, 0.65], zoom: 1.35, say: 'The resolver walks the shelf. For each package it tries the newest version, and steps back until one fits every rule, including the rules the packages set for each other.', act: m => m.resolve(), wait: 6 },
    { t: 'Write it down', focus: [LX, 0.8, LZ + 0.3], zoom: 1.5, say: 'The answer goes into a lock file: one exact version of everything. You commit it with your code.' },
    { t: 'Same set everywhere', focus: [1.0, 0.8, -1.5], zoom: 1.45, say: 'Now a laptop in Lagos and another in Kigali install from the same lock file, and get exactly the same set.' },
    { t: 'Without the lock', home: true, say: 'Without a lock file, Kigali resolves again months later. Numpy two has come out, so Kigali gets it, and code written for numpy one breaks there and nowhere else.', act: m => m.set({ lock: false }), wait: 7 },
    { t: 'When rules collide', home: true, say: 'Sometimes no answer exists. One library needs numpy below two, another needs two point one or newer. The resolver says so plainly, and installs nothing.', act: m => m.set({ lock: true, rain: true, plot: true }), wait: 7 },
  ],
  check: [
    { q: 'What does a resolver do?', options: ['Picks one exact version of each package that fits every rule at once', 'Deletes old packages', 'Makes Python run faster'], answer: 0, why: 'It searches the available versions for one set that satisfies every requirement, including the packages\' own.' },
    { q: 'Why commit a lock file?', options: ['It makes the download smaller', 'So every machine installs exactly the same versions, now and later', 'Git needs it to work'], answer: 1, why: 'Loose rules give different answers on different days. The lock file pins the answer.' },
    { q: 'torch is built for CUDA 12.4 but the driver supports 11.8. What happens?', options: ['It runs faster', 'torch can\'t use the graphics card', 'Nothing, versions don\'t matter'], answer: 1, why: 'The build\'s CUDA version must be at or below what the driver supports.' },
  ],
  terms: [
    ['Virtual environment', 'A private folder of packages for one project.'],
    ['pyproject.toml', 'The file where a project lists what it needs, with loose version rules.'],
    ['Resolver', 'The part of the package manager that picks exact versions satisfying every rule.'],
    ['Lock file', 'The resolver\'s answer written down (uv.lock), so every install gets the same set.'],
    ['Version pin', 'An exact version, such as numpy==1.26.4, instead of a rule.'],
    ['CUDA', 'The layer between Python libraries and the graphics card; builds and drivers must agree on its version.'],
  ],
  deeper: '<p><b>Why not pin everything by hand?</b> You could write exact versions in pyproject.toml, but then every package\'s own needs become your job. Keep loose rules for what you want, and let the lock file hold the exact answer.</p><p><b>Upgrading on purpose.</b> <code>uv lock --upgrade</code> resolves again with today\'s versions; run the tests, then commit the new lock. Upgrades become a choice, not an accident.</p><p><b>Never commit the environment folder itself</b> (.venv): it holds machine-specific files and can be rebuilt from the lock in seconds.</p>',
  code: {
    title: 'A project, its rules and its lock',
    note: 'Commands from the course\'s environment lesson, with uv.',
    text: `
# make the project and its own environment
uv init rain-model && cd rain-model
uv venv
source .venv/bin/activate

# add what you need: uv writes the rule into pyproject.toml
# and the exact answer into uv.lock
uv add "torch>=2.3" transformers numpy

# a teammate in Kigali, months later: same lock, same set
git clone https://example.com/rain-model.git
cd rain-model
uv sync          # installs exactly what uv.lock says

# check the GPU build against the driver
python -c "import torch; print(torch.version.cuda, torch.cuda.is_available())"
nvidia-smi       # the driver's CUDA version, top right
`,
  },
};
