// Linux for AI: the file tree from / down to your project, nine permission switches on a file, and a disk that checkpoints fill up.
// Break it: run a script with no execute bit, let checkpoints fill the disk, write into a folder that root owns.
const NODES = [
  { id: '/', x: 0, z: -1.75, w: 1.0 },
  { id: 'home', x: -2.3, z: -0.55, p: '/' }, { id: 'usr', x: -0.75, z: -0.55, p: '/' }, { id: 'data', x: 0.8, z: -0.55, p: '/' }, { id: 'tmp', x: 2.35, z: -0.55, p: '/' },
  { id: 'amina', x: -2.3, z: 0.6, p: 'home' }, { id: 'checkpoints', x: 0.8, z: 0.6, p: 'data', w: 1.4 },
];
const CAP = 500, CK = 60;        // disk size and one checkpoint, in GB
const BITS = ['r', 'w', 'x'];

export default {
  slug: 'linux-basics',
  title: 'Linux: files, permissions and disks',
  description: 'Walk the Linux file tree from / down to your project, flip the nine permission switches on a script, and watch checkpoints fill a 500 GB disk until training dies with "No space left on device".',
  overview: 'Almost every GPU machine runs Linux, so sooner or later you will be typing on one. Everything hangs off one tree that starts at /: your files under /home, programs under /usr, big data on its own disk under /data. Every file carries nine switches (read, write and run, for its owner, its group and everyone else), and most "Permission denied" errors are one of them. Disks fill up fast when every epoch saves a checkpoint.',
  keywords: ['linux for ai', 'permission denied chmod', 'linux file system', 'no space left on device', 'chown'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, -0.3], dir: [0.2, 1.15, 1.25], half: 3.1, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const mono = '"JetBrains Mono", monospace';
    const st = { x: true, keep: true, mine: true, cks: 2, run: null, last: null, t: 0 };
    /* ---------- the tree ---------- */
    const pos = {};
    for (const n of NODES) {
      const w = n.w || 1.15, g = new THREE.Group(); g.position.set(n.x, 0, n.z); S.add(g);
      const b = P.box(w, 0.28, 0.62, n.id === '/' ? '#2C2D31' : '#5B4636', { r: 0.06 }); g.add(b);
      const name = n.id === '/' ? '/' : `${n.id}/`;
      const t = S.text(name, { size: n.id === '/' ? 0.26 : 0.15, weight: 800, color: '#FFFFFF', font: mono, maxW: w - 0.1 }); t.position.set(0, 0.285, -0.05); g.add(t);
      const f = S.text(name, { size: 0.11, face: 'front', weight: 800, color: '#FFFFFF', font: mono, maxW: w - 0.1 }); f.position.set(0, 0.14, 0.315); g.add(f);
      pos[n.id] = V(n.x, 0.14, n.z);
      if (n.p) { const a = pos[n.p], r = P.rod(V(a.x, 0.12, a.z + 0.3), V(n.x, 0.12, n.z - 0.3), 0.025, '#B9B6AE'); S.add(r); }
    }
    const homeT = S.text('/home/amina', { size: 0.1, weight: 750, font: mono, maxW: 1.3 }); homeT.position.set(-2.3, 0.005, 1.08); S.add(homeT);
    /* ---------- the project: train.py and outputs/ ---------- */
    const fileM = new THREE.MeshLambertMaterial({ color: '#F7F5EE' });
    const file = P.tile('train.py', 1.25, 0.12, 0.62, '#F7F5EE', { size: 0.16, font: mono }); file.userData.body.material = fileM; file.userData.label.position.z = -0.12; file.position.set(-3.0, 0, 1.75); S.add(file);
    const lamps = [];
    for (let k = 0; k < 9; k++) {
      const m = new THREE.MeshLambertMaterial({ color: C.grey, emissive: C.grey, emissiveIntensity: 0.4 });
      const l = P.ball(0.045, C.grey, { material: m }); l.position.set(-3.47 + k * 0.1 + Math.floor(k / 3) * 0.07, 0.17, 1.93); S.add(l); lamps.push(m);
    }
    const permT = S.text('', { size: 0.085, weight: 700, color: '#151827', font: mono, maxW: 1.2 }); permT.position.set(-3.0, 0.125, 2.0); S.add(permT);
    const outM = new THREE.MeshLambertMaterial({ color: '#C9774A' });
    const out = P.box(1.05, 0.3, 0.62, '#C9774A', { r: 0.06, material: outM }); out.position.set(-1.6, 0, 1.75); S.add(out);
    const outT = S.text('outputs/', { size: 0.14, weight: 800, color: '#FFFFFF', font: mono, maxW: 0.95 }); outT.position.set(-1.6, 0.305, 1.65); S.add(outT);
    const ownT = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', font: mono, maxW: 0.95 }); ownT.position.set(-1.6, 0.305, 1.9); S.add(ownT);
    for (const x of [-3.0, -1.6]) S.add(P.rod(V(-2.3, 0.12, 0.9), V(x, 0.12, 1.45), 0.02, '#B9B6AE'));
    /* ---------- checkpoints and the disk ---------- */
    const stack = [...Array(9)].map((_, k) => { const b = P.box(1.1, 0.1, 0.5, '#E3A72F', { r: 0.03 }); b.position.set(0.8, 0.0 + k * 0.11, 1.75); b.userData.noFit = k > 2; S.add(b); return b; });
    const ckT = S.text('', { size: 0.12, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.6 }); ckT.position.set(0.8, 1.3, 1.75); ckT.userData.noFit = true; S.add(ckT);
    S.add(P.rod(V(0.8, 0.12, 0.9), V(0.8, 0.05, 1.5), 0.02, '#B9B6AE'));
    const disk = P.cyl(0.45, 1.1, '#D8D4C8', { m: { opacity: 0.3 }, cast: false }); disk.material.depthWrite = false; disk.position.set(2.35, 0, 1.55); S.add(disk);
    const fillM = new THREE.MeshLambertMaterial({ color: C.green });
    const fill = P.cyl(0.41, 1, C.green, { material: fillM }); fill.position.set(2.35, 0.01, 1.55); S.add(fill);
    const diskT = S.text('/data disk · 500 GB', { size: 0.1, weight: 800, maxW: 1.5 }); diskT.position.set(2.35, 0.005, 2.18); S.add(diskT);
    const termT = S.text('', { size: 0.12, weight: 700, color: '#E9ECF8', bg: '#1E2233', font: mono, face: 'cam', top: true, align: 'left', maxW: 2.6 }); termT.position.set(-2.3, 1.7, 1.6); termT.userData.noFit = true; S.add(termT);
    /* ---------- running it ---------- */
    const used = () => 40 + st.cks * CK;
    function run() {
      if (!st.x) { st.last = 'perm'; st.run = null; return; }
      if (!st.mine) { st.last = 'owner'; st.run = null; return; }
      st.last = null; st.run = { t: 0, saved: 0 };
    }
    function update(dt, t) {
      const r = st.run;
      if (r) {
        r.t += dt * (S.reduced ? 4 : 1);
        // one checkpoint every 0.8 s; old ones go when "keep the last 3" is on
        if (r.t > (r.saved + 1) * 0.8) {
          if (used() + CK > CAP) { st.last = 'disk'; st.run = null; }
          else { st.cks++; r.saved++; if (st.keep && st.cks > 3) st.cks = 3; if (r.saved >= 5) { st.run = null; st.last = 'ok'; } }
        }
      }
      stack.forEach((b, k) => { b.visible = k < st.cks; });
      ckT.userData.set(`${st.cks} checkpoint${st.cks === 1 ? '' : 's'} · ${st.cks * CK} GB`);
      const u = used() / CAP; fill.scale.y = Math.max(0.02, Math.min(1, u)) * 1.08; fillM.color.set(u > 0.9 ? C.red : u > 0.7 ? C.orange : C.green);
      lamps.forEach((m, k) => { const on = k === 2 ? st.x : k === 5 ? st.x : k === 8 ? false : k % 3 === 0 || k === 1; m.color.set(on ? C.green : '#6C6F80'); m.emissive.copy(m.color); });
      permT.userData.set(`-rw${st.x ? 'x' : '-'}r-${st.x ? 'x' : '-'}r--  amina`);
      outM.color.set(st.mine ? '#C9774A' : '#7A3B2E'); ownT.userData.set(st.mine ? 'owner: amina' : 'owner: root');
      const L = st.last;
      termT.userData.set(L === 'perm' ? '$ ./train.py\nbash: ./train.py: Permission denied' : L === 'owner' ? '$ ./train.py\nPermissionError: outputs/log.txt' : L === 'disk' ? 'OSError: [Errno 28]\nNo space left on device' : st.run ? `$ ./train.py\nepoch ${st.run.saved + 1}: saving checkpoint…` : L === 'ok' ? '$ ./train.py\ndone: 5 epochs' : '$ ./train.py');
      termT.userData.style({ color: L && L !== 'ok' ? '#FFB3A7' : '#E9ECF8' });
    }
    const controls = [
      { type: 'button', label: 'Run ./train.py', short: 'Run', act: run },
      { type: 'toggle', label: 'Execute permission (chmod +x)', short: 'chmod +x', get: () => st.x, set: v => { st.x = v; st.last = null; } },
      { type: 'toggle', label: 'Keep only the last 3 checkpoints', short: 'Keep 3', get: () => st.keep, set: v => { st.keep = v; st.last = null; if (v && st.cks > 3) st.cks = 3; } },
      { type: 'toggle', label: 'outputs/ owned by you (chown)', short: 'chown', get: () => st.mine, set: v => { st.mine = v; st.last = null; }, quick: false },
      { type: 'button', label: 'Delete old checkpoints', short: 'Clean up', act: () => { st.cks = Math.min(st.cks, 1); if (st.last === 'disk') st.last = null; }, quick: false },
    ];
    const readouts = [
      { label: '/data disk', get: () => ({ v: `${used()} / ${CAP} GB`, bar: Math.min(1, used() / CAP), bad: used() + CK > CAP }), bar: true },
      { label: 'Last run', get: () => ({ v: st.run ? 'running…' : st.last === 'ok' ? 'finished' : st.last ? 'failed' : '—', good: st.last === 'ok', bad: !!st.last && st.last !== 'ok' }) },
    ];
    const labels = [
      { name: 'root', t: 'One tree from /', d: 'Every file and disk hangs off it', icon: 'box', atV: V(-0.5, 0.28, -2.06) },
      { name: 'home', t: 'Your home folder', d: '/home/amina: your code and outputs', icon: 'info', atV: V(-3.62, 0.12, 1.75) },
      { name: 'perms', t: 'Nine switches', d: 'Read, write, run · owner, group, others', icon: 'check', atV: V(-3.0, 0.17, 2.06) },
      { name: 'disk', t: 'The data disk', d: 'Checkpoints fill it fast', icon: 'scale', atV: V(2.8, 1.1, 1.55) },
    ];
    const reset = () => { Object.assign(st, { x: true, keep: true, mine: true, cks: 2, run: null, last: null }); };
    const breaks = [
      { label: 'No execute permission', hint: 'chmod -x train.py', on: () => { reset(); st.x = false; run(); }, off: reset },
      { label: 'Checkpoints fill the disk', hint: 'Keep every one', on: () => { reset(); st.keep = false; st.cks = 6; run(); }, off: reset },
      { label: 'outputs/ owned by root', hint: 'Made with sudo by mistake', on: () => { reset(); st.mine = false; run(); }, off: reset },
    ];
    function status() {
      const L = st.last;
      if (L === 'perm') return { ok: false, msg: `<b>Permission denied.</b> train.py has no execute switch on (<code>-rw-r--r--</code>), so the shell refuses to run it as a program. <code>chmod +x train.py</code> turns it on, or run it as <code>python train.py</code>.` };
      if (L === 'owner') return { ok: false, msg: `<b>PermissionError writing outputs/log.txt.</b> The folder was made with sudo, so it belongs to root, and amina may not write in it. <code>sudo chown -R amina outputs/</code> gives it back. Use sudo only for system changes, never for your own folders.` };
      if (L === 'disk') return { ok: false, msg: `<b>No space left on device.</b> ${st.cks} checkpoints at ${CK} GB each filled the 500 GB disk, and training died mid-save. Keep only the last few (and the best), or clean up with <code>du -sh</code> to find what's big.` };
      if (st.run) return { msg: `<b>Training.</b> Each epoch saves a ${CK} GB checkpoint under /data/checkpoints${st.keep ? '; the oldest is deleted once there are three' : ''}.` };
      if (L === 'ok') return { ok: true, msg: `<b>Finished.</b> Five epochs, ${st.keep ? 'only the last three checkpoints kept' : 'every checkpoint kept'}, the disk at ${Math.round(used() / CAP * 100)}%.` };
      if (!st.x) return { ok: false, msg: `<b>The run switch is off.</b> <code>-rw-r--r--</code>: anyone can read train.py, only amina can change it, and nobody can run it directly. <b>Run</b> will be refused.` };
      if (!st.mine) return { ok: false, msg: `<b>outputs/ belongs to root.</b> amina can look inside but not write, so the first log line will fail.` };
      if (!st.keep) return { msg: `<b>Keeping every checkpoint.</b> ${CK} GB per epoch; the disk has room for ${Math.floor((CAP - used()) / CK)} more.` };
      return { msg: `<b>Ready.</b> Press <b>Run</b> to start <code>./train.py</code> from your home folder.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, run, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'One tree', home: true, say: 'Almost every GPU machine runs Linux. Everything on it hangs off one tree, starting at the root, written as a single slash.', act: m => m.reset() },
    { t: 'Where things live', focus: [-2.3, 0.3, 0.8], zoom: 1.4, say: 'Your files live in your home folder, here slash home slash amina. Programs live under user, and big data often sits on its own disk under data.' },
    { t: 'Nine switches', focus: [-3.0, 0.2, 1.8], zoom: 1.7, say: 'Every file has nine switches: read, write and run, for its owner, its group and everyone else. To run a script directly, its run switch must be on. That is what chmod plus x does.' },
    { t: 'Checkpoints pile up', focus: [1.4, 0.5, 1.6], zoom: 1.4, say: 'Run the training. Every epoch saves a checkpoint, sixty gigabytes each, onto the data disk.', act: m => m.run(), wait: 5 },
    { t: 'Keep the last few', focus: [1.4, 0.5, 1.6], zoom: 1.4, say: 'Keep every checkpoint and the disk fills, and training dies mid-save. Keep only the last few, and the disk stays calm.', act: m => { m.set({ keep: false, cks: 5 }); m.run(); }, wait: 5 },
    { t: 'Careful with sudo', home: true, say: 'One last trap. A folder made with sudo belongs to root, and your own training cannot write in it. Use sudo for the system only, and give your folders back with chown.', act: m => { m.reset(); m.set({ mine: false }); m.run(); } },
  ],
  check: [
    { q: 'You type ./train.py and get "Permission denied". The likely fix?', options: ['Buy a bigger disk', 'chmod +x train.py, or run python train.py', 'Restart the server'], answer: 1, why: 'The file\'s execute switch is off. chmod +x turns it on.' },
    { q: 'Training stops with "No space left on device". What do you do?', options: ['Keep only the last few checkpoints and clean up big files', 'Run it with sudo', 'Rename the folder'], answer: 0, why: 'The disk is full. du -sh finds what is big; keep the checkpoints you need and delete the rest.' },
    { q: 'Why not make your own folders with sudo?', options: ['sudo is slower', 'They end up owned by root, and your programs can\'t write in them', 'It deletes them'], answer: 1, why: 'Files made with sudo belong to root. Use sudo only for system changes.' },
  ],
  terms: [
    ['Root (/)', 'The top of the Linux file tree. Also the name of the all-powerful admin user.'],
    ['Home folder', '/home/your-name: where your own files live, written ~ for short.'],
    ['Permissions', 'Nine switches per file: read, write and execute for the owner, the group and everyone else.'],
    ['chmod / chown', 'Change a file\'s permission switches / change who owns it.'],
    ['sudo', 'Run one command as root. Needed for system changes; dangerous for your own files.'],
    ['du / df', 'How much space a folder uses / how full each disk is.'],
  ],
  deeper: '<p><b>Reading permissions.</b> <code>ls -l</code> shows <code>-rwxr-xr--</code>: the first three letters are the owner\'s switches, the next three the group\'s, the last three everyone else\'s. As numbers, read is 4, write 2 and run 1, so <code>chmod 755</code> means rwx for you and r-x for the rest.</p><p><b>Installing system tools.</b> <code>sudo apt install htop tmux</code> installs programs for the whole machine. Python packages stay in your project\'s environment instead.</p><p><b>From a Mac to Linux.</b> Paths are case-sensitive, there is no Homebrew, and the GPU is NVIDIA, not Apple: check with <code>nvidia-smi</code>.</p>',
  code: {
    title: 'Linux commands for a GPU box',
    note: 'From the course\'s Linux lesson.',
    text: `
pwd                         # where am I?   /home/amina
ls -la                      # files, with their permission switches
chmod +x train.py           # turn on "run" so ./train.py works
./train.py

sudo chown -R amina outputs/   # give a folder made with sudo back to you

df -h /data                 # how full is the data disk?
du -sh /data/checkpoints/*  # which checkpoints are biggest?
ls -t /data/checkpoints | tail -n +4 | xargs -I{} rm /data/checkpoints/{}   # keep the newest 3

sudo apt update && sudo apt install -y htop tmux
`,
  },
};
