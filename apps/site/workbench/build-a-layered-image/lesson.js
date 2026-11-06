// Build it yourself: image layers (after mocker). A Mombasa shipping tool's image is a stack of read-only layers, each a set of file changes, with a writable layer on top. A real union lookup finds each file from the top down, handles whiteouts, and counts shared bytes across two images.
const BASE = { '/bin/sh': 90, '/lib/libc': 120, '/etc/hosts': 1 }, LANG = { '/usr/python': 200, '/etc/hosts': 2 }, APP = { '/app/main.py': 8, '/tmp/build.log': 60 };
function union(layers) { const fs = {}; layers.forEach(l => Object.keys(l.f).forEach(p => { if (l.f[p] === null) delete fs[p]; else fs[p] = { size: l.f[p], from: l.n }; })); return fs; }
function run(o) {
  const clean = o.clean ? { '/tmp/build.log': null } : {}, cow = o.cow ? { '/etc/hosts': 3 } : {};
  const stack = [{ n: 'base', f: BASE }, { n: 'python', f: LANG }, { n: 'app', f: APP }, { n: 'cleanup', f: clean }, { n: 'writable', f: cow }];
  const fs = union(stack), seen = Object.values(fs).reduce((a, f) => a + f.size, 0);
  const sum = l => Object.values(l.f).reduce((a, v) => a + (v || 0), 0), disk = stack.reduce((a, l) => a + sum(l), 0);
  const second = sum({ f: { '/app/other.py': 6 } }), noShare = 2 * disk + second, shared = disk + second;
  return { fs, seen, disk, shared, noShare, sizes: stack.map(sum), hosts: fs['/etc/hosts'].from, hidden: disk - seen };
}

export default {
  slug: 'build-a-layered-image',
  title: 'Build your own image layers',
  description: 'An image is a stack of read-only changes. A lookup from the top down makes them look like one disk.',
  overview: 'A container image isn\'t one big disk. It\'s a stack of layers, and each records only what changed: files added, replaced or deleted. A union view shows them as one tree by looking from the top down. A delete is a whiteout marker that hides the file below, so the bytes remain in the image. Layers are read-only and shared, which is why ten images on one base use the disk once. A running container adds one thin writable layer on top, and copies a file up the first time it changes it. Here is a real union lookup for a shipping tool in Mombasa.',
  keywords: ['Docker', 'image layers', 'overlay', 'copy on write', 'containers', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.1, 0.55, 1.2], half: 1.05, wide: 5 },

  build(S) {
    const { V, P } = S;
    const D0 = { clean: false, cow: false, share: true }, st = { ...D0 };
    const CL = ['#5B8DB8', '#7B6FA8', '#1F9E89', '#E07A5F', '#F2AE0C'], ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(4.8, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const L = CL.map((c, i) => { const m = new S.THREE.MeshLambertMaterial({ color: c }), b = P.box(1.6, 0.14, 1, '#fff', { r: 0.03, material: m }); b.position.set(-0.9, 0.05 + i * 0.2, -0.05); S.add(b); return b; });
    const A = add(P.tower(0.5, 0.4, '#3E7F73')), B = add(P.tower(0.5, 0.4, '#B5462F')); A.position.set(0.8, 0.03, -0.05); B.position.set(1.5, 0.03, -0.05); A.userData.set({ cap: '' }); B.userData.set({ cap: '' });
    S.add(P.keep(-2, 1.9, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); L.forEach((b, i) => { b.visible = R.sizes[i] > 0 || i < 3 || (i === 3 && st.clean); b.scale.x = Math.max(0.15, Math.min(1, R.sizes[i] / 210)); }); A.userData.set({ h: R.shared * 0.0012 }); B.userData.set({ h: (st.share ? R.shared : R.noShare) * 0.0012 }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('clean', 'Delete the build log in a later layer', 'Delete'), tg('cow', 'Change a file while running', 'Write'), tg('share', 'Share layers between images', 'Share')];
    const readouts = [
      { label: 'Files you see', get: () => ({ v: `${Object.keys(R.fs).length} files`, sub: `${R.seen} units` }) },
      { label: 'Image on disk', get: () => ({ v: `${R.disk} units`, sub: `${R.hidden} hidden below`, bad: R.hidden > 50 }) },
      { label: '/etc/hosts comes from', get: () => ({ v: R.hosts }) },
    ];
    const labels = [
      { name: 'l', t: 'Layers, base at the bottom', d: 'Width: size of its changes', icon: 'box', atV: V(-1.72, 0.3, -0.05) },
      { name: 'd', t: 'Two images on disk', d: 'Red: with no sharing', icon: 'scale', atV: V(1.76, 0.2, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Delete in a later layer', hint: 'it doesn\'t shrink', on: () => set({ ...D0, clean: true }), off: reset },
      { label: 'No sharing', hint: 'one copy per image', on: () => set({ ...D0, share: false }), off: reset },
    ];
    function status() {
      if (!st.share) return { ok: false, msg: `<b>${R.noShare} units for two images, not ${R.shared}.</b> Without shared layers, every image stores its own base.` };
      if (st.clean) return { ok: false, msg: `<b>The log is gone from view, and the image is still ${R.disk} units.</b> A whiteout hides a file. Delete it in the same layer that made it.` };
      if (st.cow) return { ok: true, msg: '<b>/etc/hosts was copied up to the writable layer.</b> The layers below don\'t change, so other containers aren\'t affected.' };
      return { ok: true, msg: `<b>${Object.keys(R.fs).length} files from three layers, in one view.</b> Two images share ${R.disk} units.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Not one disk', home: true, say: 'A shipping tool in Mombasa has an image made of three stacked layers.', act: m => m.set({ clean: false, cow: false, share: true }) },
    { t: 'Top down', home: true, say: 'To find a file, look from the top layer down. The first match wins.', act: m => m.set({ clean: false, cow: false, share: true }) },
    { t: 'Shared', home: true, say: 'Layers are read-only, so images on one base use the disk once.', act: m => m.set({ clean: false, cow: false, share: false }) },
    { t: 'Whiteout', home: true, say: 'Delete a file in a later layer, and a marker hides it. The bytes stay.', act: m => m.set({ clean: true, cow: false, share: true }) },
    { t: 'Copy up', home: true, say: 'A running container copies a file to its writable layer the first time it changes.', act: m => m.set({ clean: false, cow: true, share: true }) },
    { t: 'Thin on top', home: true, say: 'Many containers can share one image, each with its own thin top layer.', act: m => m.set({ clean: false, cow: true, share: true }) },
  ],
  check: [
    { q: 'How is a file found?', options: ['From the top layer down', 'From the bottom up', 'By its size'], answer: 0, why: 'The first match wins.', hint: 'See Top down.' },
    { q: 'What does deleting in a later layer do?', options: ['Hides it, and the bytes stay', 'Frees the space', 'Corrupts the image'], answer: 0, why: 'Lower layers are read-only.', hint: 'Try Delete in a later layer.' },
    { q: 'What is copy on write?', options: ['Copying a file up when it first changes', 'Writing every file twice', 'Copying the whole image'], answer: 0, why: 'Only changed files move.', hint: 'See Copy up.' },
  ],
  terms: [['Layer', 'A set of file changes.'], ['Union view', 'Layers seen as one tree.'], ['Whiteout', 'A marker that hides a file.'], ['Copy on write', 'Copying only when changed.']],
  deeper: '<p><b>Real code.</b> The lookup and the counts run live. Sizes are invented.</p><p><b>On Linux.</b> OverlayFS does this in the kernel.</p>',
  credit: 'Built from <a href="https://github.com/tonybaloney/mocker" target="_blank" rel="noopener">mocker</a> by Anthony Shaw (Apache-2.0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short union view, written for this lesson.',
  code: {
    title: 'The union',
    note: 'Our own short version.',
    text: `
function union(layers) {
  const fs = {};
  for (const layer of layers)                // bottom to top
    for (const [path, file] of Object.entries(layer))
      if (file === null) delete fs[path];    // a whiteout
      else fs[path] = file;
  return fs;
}
`,
  },
};
