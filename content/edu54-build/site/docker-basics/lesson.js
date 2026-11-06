// Docker: a Dockerfile builds an image layer by layer (with a cache), the image runs as a container on a host,
// borrows the host's GPU and a volume of model files, and the same image runs on every other machine.
// Break it: copy the code before installing packages (the cache never helps), keep the model inside the container, forget the GPU flag.
const LAYERS = [
  { n: 'FROM cuda 12.4 + ubuntu', s: 'base image', min: 3, c: '#2E3440' },
  { n: 'RUN install python 3.12', s: 'python', min: 1, c: '#5B4636' },
  { n: 'RUN pip install -r requirements', s: 'packages', min: 6, c: '#A4462A' },
  { n: 'COPY . /workspace', s: 'your code', min: 0.05, c: '#E3A72F', ink: '#151827' },
];
const TX = -2.35, TZ = 0.55, LH = 0.32, HX = 1.3, HZ = 0.35;
const HOSTS = ['Accra laptop', 'Nairobi server', 'Cloud GPU'];

export default {
  slug: 'docker-basics',
  title: 'Docker: the same box everywhere',
  description: 'Build an image layer by layer, watch the cache skip what hasn\'t changed, then run it as a container that borrows the GPU and a folder of models, and ship the very same box to Accra, Nairobi and the cloud.',
  overview: 'Docker packs your code, Python, libraries and system tools into an image, built layer by layer from a Dockerfile. A running image is a container: it borrows the host\'s graphics card when you ask, and keeps big files such as model weights in a volume on the host, so they survive when the container is replaced. The same image runs the same way on your laptop, a teammate\'s server or a cloud GPU.',
  keywords: ['docker for ai', 'dockerfile layers cache', 'docker gpu', 'docker volume models', 'container vs image'],
  orient: 'any',
  view: { target: [0, 0.6, -0.2], dir: [0.35, 1.0, 1.35], half: 3.3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { order: true, vol: true, gpu: true, build: null, lastMin: null, rebuilt: [], hasModel: true, lost: false, runs: 0, ship: 0 };
    /* ---------- the Dockerfile as a tower of layers ---------- */
    const order = () => st.order ? [0, 1, 2, 3] : [0, 1, 3, 2];   // the wrong order copies the code before installing packages
    const layers = LAYERS.map((L, i) => {
      const g = new THREE.Group(); S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: L.c });
      const b = P.box(2.1, LH - 0.03, 1.3, L.c, { r: 0.06, material: m }); g.add(b);
      const f = S.text(L.n, { size: 0.12, face: 'front', weight: 750, color: L.ink || '#FFFFFF', font: '"JetBrains Mono", monospace', maxW: 2.0, maxH: 0.24 }); f.position.set(0, (LH - 0.03) / 2, 0.655); g.add(f);
      const t = S.text(L.s.toUpperCase(), { size: 0.13, weight: 800, color: L.ink || '#FFFFFF', maxW: 1.9 }); t.position.set(0, LH - 0.025, 0.25); g.add(t);
      const tag = S.text('', { size: 0.1, weight: 800, color: '#151827', bg: '#FFFFFF', face: 'cam', top: true, maxW: 1 }); tag.position.set(1.32, (LH - 0.03) / 2, 0.4); tag.userData.noFit = true; g.add(tag);
      return { g, m, tag, L };
    });
    const place = () => order().forEach((li, k) => layers[li].g.position.set(TX, k * LH, TZ));
    place();
    const scan = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.04, 6, 40), new THREE.MeshBasicMaterial({ color: C.orange })); scan.rotation.x = -Math.PI / 2; scan.scale.z = 0.62; scan.userData.noFit = true; S.add(scan);
    /* ---------- the host: a running container, the GPU and a volume ---------- */
    const host = P.box(3.5, 0.12, 2.3, '#D8D4C8', { r: 0.1 }); host.position.set(HX, 0, HZ); S.add(host);
    const hostT = S.text('HOST: YOUR LAPTOP', { size: 0.12, face: 'front', weight: 800, color: '#151827', maxW: 3 }); hostT.position.set(HX, 0.06, HZ + 1.155); S.add(hostT);
    const boxM = new THREE.MeshLambertMaterial({ color: '#1C9A94' });
    const cont = P.box(1.9, 0.95, 1.05, '#1C9A94', { r: 0.05, material: boxM }); cont.position.set(HX - 0.45, 0.12, HZ + 0.15); S.add(cont);
    for (let k = 0; k < 9; k++) { const rib = P.box(0.05, 0.85, 0.02, '#127570', { r: 0, cast: false }); rib.position.set(HX - 1.3 + k * 0.21, 0.17, HZ + 0.68); S.add(rib); }
    const contF = S.text('CONTAINER', { size: 0.14, face: 'front', weight: 800, color: '#FFFFFF', bg: 'rgba(0,0,0,0.28)', top: false, maxW: 1.6 }); contF.position.set(HX - 0.45, 0.62, HZ + 0.7); S.add(contF);
    const contT = S.text('rain-model', { size: 0.15, weight: 800, color: '#FFFFFF', font: '"JetBrains Mono", monospace', maxW: 1.7 }); contT.position.set(HX - 0.45, 1.075, HZ + 0.05); S.add(contT);
    const inside = S.text('', { size: 0.1, weight: 700, color: '#FFFFFF', font: '"JetBrains Mono", monospace', align: 'left', maxW: 1.7, maxH: 0.4 }); inside.position.set(HX - 0.45, 1.075, HZ + 0.43); S.add(inside);
    const gpuM = new THREE.MeshLambertMaterial({ color: '#2E3440' });
    const gpu = P.box(0.7, 0.14, 0.7, '#2E3440', { r: 0.05, material: gpuM }); gpu.position.set(HX + 1.25, 0.12, HZ + 0.75); S.add(gpu);
    const gpuT = S.text('GPU', { size: 0.15, weight: 800, color: '#7FD1CB', maxW: 0.6 }); gpuT.position.set(HX + 1.25, 0.265, HZ + 0.75); S.add(gpuT);
    const tank = P.cyl(0.47, 0.6, '#E8D9B5'); tank.position.set(HX + 1.25, 0.12, HZ - 0.5); S.add(tank);
    const tankT = S.text('volume: models/', { size: 0.11, weight: 800, color: '#151827', font: '"JetBrains Mono", monospace', maxW: 0.95 }); tankT.position.set(HX + 1.25, 0.125, HZ + 0.2); S.add(tankT);
    const gpuPipe = P.rod(V(HX + 0.5, 0.35, HZ + 0.6), V(HX + 0.9, 0.2, HZ + 0.75), 0.06, C.green); S.add(gpuPipe);
    const volPipe = P.rod(V(HX + 0.5, 0.5, HZ - 0.3), V(HX + 0.8, 0.5, HZ - 0.45), 0.07, C.gold); S.add(volPipe);
    // the model file: inside the volume (safe) or inside the container (lost when it is replaced)
    const model = P.tile('model 14 GB', 0.85, 0.1, 0.3, '#F2C94C', { size: 0.12 }); model.userData.noFit = true; S.add(model);
    /* ---------- the same image on other machines ---------- */
    const minis = HOSTS.map((n, i) => {
      const x = -2.25 + i * 2.25, pad = P.box(1.8, 0.1, 1.2, '#D8D4C8', { r: 0.08 }); pad.position.set(x, 0, -2.0); S.add(pad);
      const t = S.text(n, { size: 0.13, weight: 800, color: '#151827', maxW: 1.7 }); t.position.set(x, 0.105, -1.58); S.add(t);
      const m = new THREE.MeshLambertMaterial({ color: '#1C9A94' });
      const b = P.box(1.0, 0.45, 0.55, '#1C9A94', { r: 0.04, material: m }); b.position.set(x, 0.1, -2.17); S.add(b);
      const bt = S.text('rain-model', { size: 0.1, weight: 800, color: '#FFFFFF', font: '"JetBrains Mono", monospace', maxW: 0.9 }); bt.position.set(x, 0.555, -2.17); S.add(bt);
      return { b, m };
    });
    /* ---------- building and running ---------- */
    function build(changed = 3) {
      // a layer is rebuilt when it or anything below it changed; the rest come from the cache
      const ord = order(), at = ord.indexOf(changed);
      st.rebuilt = ord.filter((_, k) => k >= at); st.note = '';
      st.build = { k: 0, t: 0 };
      st.lastMin = st.rebuilt.reduce((s, i) => s + LAYERS[i].min, 0);
    }
    function rerun() { st.runs++; st.note = 'replaced'; if (!st.vol) { st.hasModel = false; st.lost = true; } }
    function update(dt, t) {
      const b = st.build;
      if (b) { b.t += dt * (S.reduced ? 6 : 1.6); if (b.t >= 1) { b.t = 0; b.k++; if (b.k >= 4) { st.build = null; st.ship = 1; } } }
      scan.visible = !!b; if (b) scan.position.set(TX, (b.k + b.t) * LH, TZ);
      order().forEach((li, k) => {
        const L = layers[li], done = !b || k < b.k, now = b && k === b.k, re = st.rebuilt.includes(li);
        L.m.emissive.set(now && re ? C.orange : '#000000').multiplyScalar(0.45);
        L.tag.visible = !!b && (done || now) || (!b && st.lastMin != null);
        L.tag.userData.set(now ? (re ? 'building…' : 'cached') : re ? `rebuilt · ${LAYERS[li].min >= 1 ? LAYERS[li].min + ' min' : 'seconds'}` : 'cached');
        L.tag.userData.style({ bg: re ? '#FDE7CF' : '#E5F4EA' });
      });
      st.ship = Math.max(0, st.ship - dt * 1.2);
      minis.forEach(m => { m.b.scale.setScalar(1 + Math.sin(st.ship * Math.PI) * 0.12); m.m.emissive.set('#4CC6C0').multiplyScalar(st.ship * 0.5); });
      gpuPipe.visible = st.gpu; volPipe.visible = st.vol;
      gpuM.emissive.set(st.gpu ? '#1C9A94' : '#000000').multiplyScalar(0.4 + 0.2 * Math.sin(t * 4));
      // the model lives in the tank (volume) or inside the container
      model.visible = st.hasModel;
      if (st.vol) model.position.set(HX + 1.25, 0.72, HZ - 0.5); else model.position.set(HX - 0.45, 1.07, HZ - 0.25);
      inside.userData.set([`python 3.12 · torch`, `gpu: ${st.gpu ? 'yes' : 'no'}`, `model: ${st.hasModel ? (st.vol ? 'on the volume' : 'inside') : 'gone'}`].join('\n'));
      boxM.emissive.set(st.lost || !st.gpu ? C.red : '#000000').multiplyScalar(0.25);
    }
    build(0);
    const controls = [
      { type: 'button', label: 'Edit the code and rebuild', short: 'Rebuild', act: () => build(3) },
      { type: 'button', label: 'Replace the container', short: 'Replace', act: rerun, hint: 'Stop it, remove it and start a fresh one from the image' },
      { type: 'toggle', label: 'Model folder on a volume', short: 'Volume', get: () => st.vol, set: v => { st.vol = v; st.hasModel = true; st.lost = false; st.note = ''; } },
      { type: 'toggle', label: 'Give it the GPU (--gpus all)', short: 'GPU', get: () => st.gpu, set: v => { st.gpu = v; } },
      { type: 'toggle', label: 'Install packages before copying code', short: 'Good order', get: () => st.order, set: v => { st.order = v; place(); build(3); }, quick: false },
    ];
    const readouts = [
      { label: 'Last build', get: () => ({ v: st.build ? 'building…' : st.lastMin == null ? '—' : st.lastMin >= 1 ? `${st.lastMin.toFixed(0)} min` : 'a few seconds', good: !st.build && st.lastMin != null && st.lastMin < 1, bad: !st.build && st.lastMin >= 6 }) },
      { label: 'Inside the container', get: () => ({ v: `GPU ${st.gpu ? 'yes' : 'no'}`, sub: st.hasModel ? 'model ready' : 'model gone', bad: !st.gpu || !st.hasModel, good: st.gpu && st.hasModel }) },
    ];
    const labels = [
      { name: 'layers', t: 'Image layers', d: 'One per Dockerfile line, cached', icon: 'box', atV: V(TX - 1.05, 0.02, TZ + 0.65) },
      { name: 'copies', t: 'The same image everywhere', d: 'Laptop, server or cloud', icon: 'link', atV: V(-3.15, 0.1, -2.6) },
      { name: 'container', t: 'A running container', d: 'The image, started on this host', icon: 'spark', atV: V(HX - 1.4, 1.07, HZ - 0.37) },
      { name: 'volume', t: 'A volume', d: 'Model files stay on the host', icon: 'scale', atV: V(HX + 1.72, 0.72, HZ - 0.5) },
    ];
    const reset = () => { Object.assign(st, { order: true, vol: true, gpu: true, hasModel: true, lost: false }); place(); build(0); };
    const breaks = [
      { label: 'Copy the code before installing packages', hint: 'Every edit reinstalls everything', on: () => { reset(); st.order = false; place(); build(3); }, off: reset },
      { label: 'Model saved inside the container', hint: 'No volume, then replace it', on: () => { reset(); st.vol = false; st.hasModel = true; rerun(); }, off: reset },
      { label: 'Forget the GPU flag', hint: 'docker run without --gpus all', on: () => { reset(); st.gpu = false; }, off: reset },
    ];
    function status() {
      if (st.build) { const li = order()[st.build.k]; return { msg: `<b>Building layer ${st.build.k + 1}: ${LAYERS[li].s}.</b> ${st.rebuilt.includes(li) ? 'Something below or inside it changed, so it runs again.' : 'Nothing changed here, so it comes from the cache in a blink.'}` }; }
      if (!st.order && st.lastMin >= 6) return { ok: false, msg: `<b>${st.lastMin.toFixed(0)} minutes for a one-line edit.</b> The code is copied before the packages are installed, so every change to the code breaks the cache for every layer above it, and pip installs everything again. Copy requirements and install first; copy the code last.` };
      if (st.lost) return { ok: false, msg: `<b>The 14 GB model is gone.</b> It was saved inside the container, and a replaced container starts fresh from the image. Put the models folder on a volume (a folder on the host) and it survives every restart and rebuild.` };
      if (!st.gpu) return { ok: false, msg: `<b>No GPU inside.</b> The container was started without <code>--gpus all</code>, so it can't see the graphics card and <code>torch.cuda.is_available()</code> says False. Training would crawl along on the CPU.` };
      if (st.note === 'replaced') return { ok: true, msg: `<b>A fresh container.</b> The old one was removed and a new one started from the same image in a second. The model is still there, because it lives on the volume, not inside.` };
      if (st.lastMin != null && st.lastMin < 1) return { ok: true, msg: `<b>Rebuilt in seconds.</b> Only the code layer changed; the base, Python and packages came from the cache. The new image goes to Accra, Nairobi and the cloud unchanged.` };
      return { ok: true, msg: `<b>Built and running.</b> ${st.lastMin.toFixed(0)} minutes the first time, from nothing. The container sees the GPU and finds the model on the volume.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, build, rerun, set: p => { Object.assign(st, p); place(); } };
  },

  story: [
    { t: 'A box with everything', home: true, say: 'Docker packs your code, Python, the libraries and the system tools into one box called an image. Here it is being built for the first time.', act: m => m.reset(), wait: 6 },
    { t: 'Layers and the cache', focus: [-2.35, 0.7, 0.55], zoom: 1.45, say: 'Each line of the Dockerfile makes one layer. Change only your code and rebuild: the layers below come from the cache, and the build takes seconds.', act: m => m.build(3), wait: 6 },
    { t: 'A running container', focus: [0.9, 0.6, 0.5], zoom: 1.45, say: 'Start the image and it becomes a container, running on this host like a small computer of its own.' },
    { t: 'Borrow the GPU', focus: [2.4, 0.4, 0.8], zoom: 1.5, say: 'A container cannot see the graphics card unless you hand it over when you start it. With the GPU flag, the code inside uses the card at full speed.' },
    { t: 'Keep models outside', focus: [2.4, 0.6, -0.2], zoom: 1.5, say: 'A model can be fourteen gigabytes. Keep it in a volume, a folder on the host, so it survives when the container is replaced.' },
    { t: 'The same box everywhere', home: true, say: 'Now the very same image runs on a laptop in Accra, a server in Nairobi and a cloud GPU, with the same versions of everything.', act: m => m.build(3), wait: 6 },
  ],
  check: [
    { q: 'What is the difference between an image and a container?', options: ['An image is the packed box; a container is that image running', 'They are the same thing', 'A container is the Dockerfile'], answer: 0, why: 'The image is built once from the Dockerfile. Each time you start it, you get a container.' },
    { q: 'Why install the packages before copying the code into the image?', options: ['It looks tidier', 'So a code edit only rebuilds the last layer and the packages come from the cache', 'Docker needs packages first to start'], answer: 1, why: 'A layer is rebuilt when anything below it changes. Code changes often; packages rarely.' },
    { q: 'Where should a 14 GB model live?', options: ['Inside the container', 'In the Dockerfile', 'On a volume: a folder on the host'], answer: 2, why: 'A replaced container starts fresh from the image. A volume keeps the files on the host.' },
  ],
  terms: [
    ['Image', 'A read-only package of code, runtime, libraries and tools, built from a Dockerfile.'],
    ['Container', 'An image running on a host, isolated from the rest of the machine.'],
    ['Dockerfile', 'The recipe: one instruction per line, each making a layer of the image.'],
    ['Layer cache', 'Saved layers that are reused when nothing they depend on has changed.'],
    ['Volume', 'A folder on the host mounted into a container, so its files survive restarts.'],
    ['Docker Compose', 'A file that starts several containers together, such as a model server and a vector database.'],
  ],
  deeper: '<p><b>Three kinds of container.</b> A development container has editors, notebooks and debuggers. A training container is lean, just the script and its packages, for GPU clusters. An inference container is smallest of all, so it starts fast when traffic arrives.</p><p><b>The GPU and the driver.</b> The container brings its own CUDA toolkit, but borrows the host\'s driver. The toolkit inside must not be newer than what the driver supports.</p><p><b>Compose</b> starts a whole app with one command: a model server, a vector database for retrieval, a web front end, each in its own container on a shared network.</p>',
  code: {
    title: 'A Dockerfile in the right order',
    note: 'Shortened from the course\'s Dockerfile. Packages go in before the code, so code edits rebuild in seconds.',
    text: `
FROM nvidia/cuda:12.4.1-devel-ubuntu22.04

RUN apt-get update && apt-get install -y python3.12 python3-pip \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt   # cached until requirements change

COPY . .                                             # your code: changes often, so last
CMD ["python", "train.py"]

# build once, then run with the GPU and a volume of models:
#   docker build -t rain-model .
#   docker run --gpus all -v ~/models:/workspace/models rain-model
`,
  },
};
