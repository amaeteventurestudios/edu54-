// Dev environment: the four layers of a working setup as a terrace of steps, installed bottom up.
// A check runs up the steps and lights each tool. Break it: libraries with nothing under them, a Python too old, two projects sharing one shelf.
const W = 4.6, RISE = 0.45, BACK = -1.6;
const LAYERS = [
  { n: 'System', c: '#5B4636', ink: '#FFFFFF', tools: ['Shell + git', 'Editor', 'GPU driver'] },
  { n: 'Package managers', s: 'Managers', c: '#C9774A', ink: '#FFFFFF', tools: ['uv', 'pnpm', 'cargo'] },
  { n: 'Runtimes', c: '#E3A72F', ink: '#151827', tools: ['Python', 'Node 22', 'Rust'] },
  { n: 'Projects', c: '#E8D9B5', ink: '#151827', tools: [] },
];
const DEPTH = [3.4, 2.65, 1.9, 1.3];
const PY = ['3.8', '3.11', '3.12'];
const PROJ = [
  { n: 'Accra rain model', needs: '1.26', x: -1.2, c: '#1C9A94' },
  { n: 'Mombasa fares app', needs: '2.1', x: 1.2, c: '#EE6352' },
];
const TOOLX = [-0.42, 0.64, 1.7];

export default {
  slug: 'dev-environment',
  title: 'Your dev environment',
  description: 'Build a working setup the way it really stacks up: system, package managers, runtimes, then each project with its own box of libraries. Then install it in the wrong order and watch it fail.',
  overview: 'Every lesson after this one runs code, and code needs a place to run. A good setup has four layers, each resting on the one below: the system (shell, git, editor, GPU driver), package managers that fetch the right versions, language runtimes such as Python, and your projects, each with its own private set of libraries. Install them bottom up and check them once, and you stop fighting your tools.',
  keywords: ['ai dev environment setup', 'python virtual environment', 'uv python', 'install python for ai', 'dependency conflicts'],
  orient: 'any',
  phoneTurn: false,
  view: { target: [0, 0.85, 0], dir: [0.75, 0.95, 1.5], half: 3.2, wide: 6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { have: [true, true, true, true], grow: [1, 1, 1, 1], py: 2, venv: true, check: null };
    const H = k => RISE * (k + 1), ZF = k => BACK + DEPTH[k];
    const glow = (m, c, k) => m.emissive.set(c).multiplyScalar(k);
    /* ---------- the terrace ---------- */
    const layers = LAYERS.map((L, k) => {
      // each layer is one slab resting on the deeper slab below it
      const g = new THREE.Group(); g.position.y = k * RISE; S.add(g);
      const mat = new THREE.MeshLambertMaterial({ color: L.c });
      const block = P.box(W, RISE, DEPTH[k], L.c, { r: 0.08, material: mat }); block.position.z = BACK + DEPTH[k] / 2; g.add(block);
      // its name on the riser, and again on the top so it reads from above
      const front = S.text(L.n.toUpperCase(), { size: 0.22, face: 'front', weight: 800, color: L.ink, maxW: W * 0.8, maxH: RISE * 0.8 }); front.position.set(0, RISE / 2, ZF(k) + 0.012); g.add(front);
      const top = S.text((L.s || L.n).toUpperCase(), { size: 0.16, weight: 800, color: L.ink, maxW: 0.98, maxH: 0.4 }); top.position.set(-1.68, RISE + 0.012, ZF(k) - 0.36); g.add(top);
      const tiles = L.tools.map((t, i) => {
        const tm = new THREE.MeshLambertMaterial({ color: '#F7F5EE' });
        const tl = P.tile(t, 0.98, 0.16, 0.5, '#F7F5EE', { size: 0.2 }); tl.userData.body.material = tm;
        tl.position.set(TOOLX[i], RISE, ZF(k) - 0.36); g.add(tl); return { tl, tm };
      });
      // a faint outline where the layer will go when it is missing
      const ghost = P.box(W, RISE, DEPTH[k], '#FFFFFF', { r: 0.08, m: { opacity: 0.13 }, cast: false }); ghost.position.set(0, k * RISE, BACK + DEPTH[k] / 2); ghost.material.depthWrite = false; S.add(ghost);
      return { g, block, mat, front, top, tiles, ghost };
    });
    /* ---------- the projects on the top step, each in its own glass box (a virtual environment) ---------- */
    const yTop = H(3), zTop = BACK + DEPTH[3] / 2;
    const projects = PROJ.map(p => {
      const g = new THREE.Group(); g.position.set(p.x, RISE, zTop + 0.05); layers[3].g.add(g);
      const mat = new THREE.MeshLambertMaterial({ color: p.c });
      const crate = P.box(1.7, 0.34, 0.8, p.c, { r: 0.06, material: mat }); g.add(crate);
      const nameF = S.text(p.n, { size: 0.13, face: 'front', weight: 750, color: '#FFFFFF', maxW: 1.6, maxH: 0.3 }); nameF.position.set(0, 0.17, 0.405); g.add(nameF);
      const nameT = S.text(p.n, { size: 0.13, weight: 750, color: '#FFFFFF', maxW: 1.55, maxH: 0.25 }); nameT.position.set(0, 0.342, 0.27); g.add(nameT);
      const pm = new THREE.MeshLambertMaterial({ color: '#F7F5EE' });
      const pkg = P.tile('numpy ' + p.needs, 1.45, 0.12, 0.34, '#F7F5EE', { size: 0.17 }); pkg.userData.body.material = pm; pkg.position.set(0, 0.34, -0.12); g.add(pkg);
      const glass = P.box(1.95, 0.85, 1.0, '#BFE6F2', { r: 0.1, m: { opacity: 0.22 }, cast: false }); glass.material.depthWrite = false; glass.position.y = -0.01; g.add(glass);
      return { g, mat, pkg, pm, glass, p };
    });
    // without environments, one shared shelf of packages sits between the projects
    const shelf = P.tile('numpy 2.1\nshared', 0.62, 0.12, 0.62, '#F7F5EE', { size: 0.12 }); shelf.position.set(0, RISE, zTop + 0.05); layers[3].g.add(shelf);
    /* ---------- the check: a light that hops up the steps ---------- */
    const pulse = P.ball(0.13, C.gold); pulse.material = new THREE.MeshLambertMaterial({ color: C.gold, emissive: C.gold, emissiveIntensity: 0.6 }); pulse.userData.noFit = true; S.add(pulse);
    const spot = k => k < 0 ? V(-2.05, 0.13, ZF(0) + 0.5) : k < 3 ? V(-2.05, H(k) + 0.13, ZF(k) - 0.08) : V(0, yTop + 0.13, zTop + 0.5);
    const pyOk = () => st.py > 0;
    const floating = k => st.have[k] && st.have.slice(0, k).some(h => !h);
    // what goes wrong at layer k, if anything
    function fault(k) {
      if (!st.have[k]) return 'missing';
      if (floating(k)) return 'floating';
      if (k === 2 && !pyOk()) return 'python';
      if (k === 3 && !st.venv) return 'shared';
      return null;
    }
    function runCheck() { st.check = { k: -1, u: 0, done: false, fail: null }; }
    function update(dt, t) {
      // layers grow up out of the plinth when installed
      layers.forEach((l, k) => {
        st.grow[k] += (st.have[k] ? 1 : -1) * dt * (S.reduced ? 10 : 2.2); st.grow[k] = Math.max(0, Math.min(1, st.grow[k]));
        l.g.visible = st.grow[k] > 0.01;
        l.g.scale.y = Math.max(0.01, st.grow[k]);
        // a layer with a gap under it hangs in the air and wobbles, tinted red
        const fl = floating(k);
        l.g.position.y = k * RISE + (fl ? 0.5 + Math.sin(t * 2 + k) * 0.06 : 0);
        l.g.rotation.z = fl ? Math.sin(t * 1.3) * 0.05 : 0;
        l.ghost.visible = !st.have[k];
        l.mat.color.set(fl ? P.lerpColor(LAYERS[k].c, C.red, 0.5) : LAYERS[k].c);
      });
      layers[2].tiles[0].tl.userData.label.userData.set('Python ' + PY[st.py]);
      projects.forEach((pr, i) => {
        pr.glass.visible = st.venv;
        const clash = !st.venv && pr.p.needs !== '2.1';
        pr.pkg.userData.label.userData.set(st.venv ? 'numpy ' + pr.p.needs : clash ? 'needs numpy ' + pr.p.needs : 'numpy 2.1');
        glow(pr.mat, C.red, clash ? 0.35 : 0);
      });
      shelf.visible = !st.venv;
      // the check hops from step to step and stops at the first fault
      const ck = st.check;
      for (const l of layers) for (const x of l.tiles) x.tm.color.set('#F7F5EE');
      for (const pr of projects) pr.pm.color.set('#F7F5EE');
      pulse.visible = !!ck;
      if (ck) {
        if (!ck.done) {
          ck.u += dt * (S.reduced ? 4 : 1.5);
          if (ck.u >= 1) { ck.k++; ck.u = 0; const f = fault(ck.k); if (f) { ck.done = true; ck.fail = { k: ck.k, f }; } else if (ck.k === 3) ck.done = true; }
        }
        const a = spot(ck.k), b = spot(Math.min(3, ck.k + 1)), u = ck.done ? 0 : ck.u;
        pulse.position.copy(a).lerp(b, u); pulse.position.y += Math.sin(u * Math.PI) * 0.45;
        if (ck.fail && ck.fail.f === 'missing') pulse.position.y = Math.max(0.13, spot(ck.k - 1).y - 0.5);
        for (let k = 0; k <= Math.min(3, ck.k); k++) {
          const bad = ck.fail && ck.fail.k === k, col = bad ? '#F4A99F' : '#9FDDB2';
          layers[k].tiles.forEach((x, i) => x.tm.color.set(bad && k === 2 && i > 0 ? '#9FDDB2' : col));
          if (k === 3) projects.forEach(pr => pr.pm.color.set(bad && pr.p.needs === '2.1' ? '#9FDDB2' : col));
        }
        pulse.material.color.set(ck.fail ? C.red : ck.done ? C.green : C.gold); pulse.material.emissive.copy(pulse.material.color);
      }
    }
    const installNext = () => { const k = st.have.indexOf(false); if (k >= 0) st.have[k] = true; st.check = null; };
    const controls = [
      { type: 'button', label: 'Run the check', short: 'Check', act: runCheck },
      { type: 'button', label: 'Install the next layer', short: 'Install', act: installNext, hint: 'Always the lowest one missing' },
      { type: 'button', label: 'Start from nothing', short: 'Clear', act: () => { st.have = [false, false, false, false]; st.check = null; }, quick: false },
      { type: 'buttons', label: 'Python version', options: PY, get: () => st.py, act: i => { st.py = i; st.check = null; } },
      { type: 'toggle', label: 'One environment per project', short: 'Own environments', get: () => st.venv, set: v => { st.venv = v; st.check = null; }, hint: 'Each project keeps its own packages' },
    ];
    const n = () => st.have.filter(Boolean).length;
    const readouts = [
      { label: 'Layers', get: () => ({ v: `${n()} / 4`, bar: n() / 4, good: n() === 4 && !st.have.some((h, k) => floating(k)) }), bar: true },
      { label: 'The check', get: () => { const ck = st.check; return !ck ? { v: 'not run' } : !ck.done ? { v: 'running…' } : ck.fail ? { v: 'failed', bad: true, sub: LAYERS[ck.fail.k].n } : { v: 'all green', good: true }; } },
    ];
    const labels = [
      { name: 'system', t: 'System', d: 'Shell, git, editor and the GPU driver', icon: 'box', atV: V(W / 2, H(0), ZF(0) - 0.2), hide: () => !st.have[0] },
      { name: 'managers', t: 'Package managers', d: 'They fetch the right version of everything', icon: 'link', atV: V(-W / 2, H(1), ZF(1) - 0.2), hide: () => !st.have[1] },
      { name: 'runtimes', t: 'Runtimes', d: 'Python, Node and Rust run your code', icon: 'spark', atV: V(W / 2, H(2), ZF(2) - 0.2), hide: () => !st.have[2] },
      { name: 'projects', t: 'One environment per project', d: 'Each glass box keeps its own packages', icon: 'eye', atV: V(-2.1, yTop + 0.84, zTop + 0.05), hide: () => !st.have[3] || !st.venv },
    ];
    const reset = () => { Object.assign(st, { have: [true, true, true, true], py: 2, venv: true, check: null }); };
    const breaks = [
      { label: 'Install the top layer first', hint: 'Libraries before Python', on: () => { reset(); st.have = [true, false, false, true]; runCheck(); }, off: () => { reset(); } },
      { label: 'Python too old', hint: 'Python 3.8', on: () => { reset(); st.py = 0; runCheck(); }, off: () => { reset(); } },
      { label: 'One shared shelf', hint: 'No virtual environments', on: () => { reset(); st.venv = false; runCheck(); }, off: () => { reset(); } },
    ];
    function status() {
      const ck = st.check;
      if (st.have.some((h, k) => floating(k))) return { ok: false, msg: `<b>Libraries with nothing under them.</b> The projects were set up before the package managers and Python existed, so their packages have nothing to run on. Install bottom up: each layer needs the one below it.` };
      if (!pyOk()) return { ok: false, msg: `<b>Python ${PY[st.py]} is too old.</b> Today's AI libraries need Python 3.11 or newer, so the check stops at the runtime layer. Ask uv for a newer Python; it sits beside the old one without touching it.` };
      if (!st.venv) return { ok: false, msg: `<b>Two projects, one shelf.</b> The Accra rain model was written for numpy 1.26. The Mombasa fares app upgraded the shared numpy to 2.1, and the rain model broke. One environment per project keeps their packages apart.` };
      if (n() < 4) return { msg: `<b>${n()} of 4 layers.</b> ${n() ? `Next: ${LAYERS[st.have.indexOf(false)].n.toLowerCase()}.` : 'An empty machine.'} Press <b>Install</b> to add the lowest missing layer.` };
      if (ck && !ck.done) return { msg: `<b>Checking ${LAYERS[Math.max(0, Math.min(3, ck.k + 1))].n.toLowerCase()}…</b> The check asks each tool for its version.` };
      if (ck && ck.done && !ck.fail) return { ok: true, msg: `<b>All green.</b> Shell and git, three package managers, Python ${PY[st.py]}, and each project with its own numpy. Ready for every lesson that follows.` };
      return { msg: `<b>Four layers, installed bottom up.</b> Press <b>Check</b> to send the check up the steps.` };
    }
    return {
      update, controls, readouts, labels, breaks, status, reset,
      clear: () => { st.have = [false, false, false, false]; st.check = null; },
      upTo: k => { st.have = st.have.map((_, i) => i <= k); st.check = null; },
      set: p => Object.assign(st, p), check: runCheck,
    };
  },

  story: [
    { t: 'Four layers', home: true, say: 'Before any model runs, your computer needs a place for code to live. A good setup has four layers, and each one rests on the layer below.', act: m => { m.reset(); m.clear(); m.upTo(3); } },
    { t: 'The system', focus: [0.4, 0.45, 1.45], zoom: 1.45, say: 'The bottom layer is the system itself: a shell to type commands, git to keep every version of your work, an editor, and the driver that lets code use the graphics card.', act: m => { m.clear(); m.upTo(0); } },
    { t: 'Package managers', focus: [0.4, 0.9, 0.7], zoom: 1.45, say: 'Next come package managers, like uv for Python. You ask for a tool and a version, and they fetch exactly that, every time, on every machine.', act: m => m.upTo(1) },
    { t: 'Runtimes', focus: [0.4, 1.35, -0.05], zoom: 1.45, say: 'On top of them sit the runtimes: Python, Node and Rust, the programs that actually run your code. AI libraries need a recent Python, so this layer has to be new enough.', act: m => m.upTo(2) },
    { t: 'A box per project', focus: [0, 2.0, -0.9], zoom: 1.4, say: 'Each project gets its own glass box, a virtual environment. A rain model in Accra and a fares app in Mombasa can need different versions of the same library, and neither breaks the other.', act: m => m.upTo(3), wait: 7 },
    { t: 'Check it once', home: true, say: 'Finally, run one check. It climbs the steps and asks every tool for its version. All green means you are ready, and every lesson after this one just works.', act: m => { m.set({ venv: true }); m.check(); }, wait: 7 },
  ],
  check: [
    { q: 'Which layer goes in first?', options: ['The system: shell, git, editor, driver', 'The AI libraries', 'The runtimes'], answer: 0, why: 'Each layer rests on the one below it, so you install bottom up, starting with the system.' },
    { q: 'Two projects need different versions of numpy. What keeps them both working?', options: ['Installing numpy twice in one place', 'A virtual environment for each project', 'A faster computer'], answer: 1, why: 'Each project gets its own environment with its own packages, so upgrading one never breaks the other.' },
    { q: 'The check says "need Python 3.11 or newer". What do you fix?', options: ['The editor', 'The projects', 'The runtime layer: install a newer Python'], answer: 2, why: 'The runtime is too old. A package manager such as uv installs a newer Python beside the old one.' },
  ],
  terms: [
    ['Shell', 'The window where you type commands, such as zsh or bash.'],
    ['Package manager', 'A tool that fetches libraries and tools in the exact versions you ask for: uv, pnpm, cargo.'],
    ['Runtime', 'The program that runs your code: Python, Node or Rust.'],
    ['Virtual environment', 'A private folder of packages for one project, so projects never fight over versions.'],
    ['GPU driver', 'The software that lets your code use the graphics card for fast maths.'],
  ],
  deeper: '<p><b>Lock files</b> such as <code>uv.lock</code> write down the exact version of every package, including the packages your packages need. Anyone who installs from the lock file gets the same set, byte for byte.</p><p><b>CUDA and MPS</b> are how Python libraries reach the graphics card: CUDA on NVIDIA cards, MPS on Apple chips. Without them the code still runs, only slower, on the main processor.</p><p><b>Containers</b> go one step further and pack the whole system layer with the project. That is the Docker lesson.</p>',
  code: {
    title: 'A small setup check in Python',
    note: 'Adapted from the course\'s <code>verify.py</code>: ask each tool for its version and say what to fix.',
    text: `
import shutil, subprocess, sys

def check(command, fix):
    path = shutil.which(command)
    if path is None:
        return False, f"{command} not found. Fix: {fix}"
    out = subprocess.run([path, "--version"], capture_output=True, text=True)
    return True, (out.stdout or out.stderr).strip().splitlines()[0]

def python_ok():
    if sys.version_info < (3, 11):
        return False, f"Python {sys.version.split()[0]}: need 3.11+"
    return True, f"Python {sys.version.split()[0]}"

layers = [
    ("system", lambda: check("git", "install git")),
    ("package manager", lambda: check("uv", "curl -LsSf https://astral.sh/uv/install.sh | sh")),
    ("runtime", python_ok),
]
for name, probe in layers:          # bottom up: stop at the first fault
    ok, detail = probe()
    print("ok  " if ok else "FAIL", name, "-", detail)
    if not ok:
        break
`,
  },
};
