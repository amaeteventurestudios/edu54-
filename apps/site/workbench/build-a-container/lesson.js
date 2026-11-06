// Build your own container runtime: an invented school coding lab in Nairobi runs each student's program in a container on one shared server.
// A container is an ordinary process with four things added: namespaces so it sees only its own processes, hostname and network; a new root
// filesystem (pivot_root) so it sees only its image; a cgroup that caps its memory; and an overlay filesystem so its writes land in its own
// layer and never change the shared image. The student's program misbehaves on purpose: it lists processes, reads files, leaks memory and
// writes to /usr. Outcomes follow directly from which protections are switched on.
const HOST_MB = 4096, LEAK_MB = 6000, LIMIT_MB = 256;
function run(o) {
  const seesHostProcs = !o.pid, seesHostFiles = !o.root, seesHostNet = !o.net;
  const mem = o.cgroup ? LIMIT_MB : Math.min(HOST_MB, LEAK_MB);
  const hostDown = !o.cgroup;
  const imageChanged = !o.overlay;
  const leaks = [seesHostProcs, seesHostFiles, seesHostNet, hostDown, imageChanged].filter(Boolean).length;
  return { seesHostProcs, seesHostFiles, seesHostNet, mem, hostDown, imageChanged, leaks };
}

export default {
  slug: 'build-a-container',
  title: 'Build your own container',
  description: 'A school coding lab runs every student\'s program in a container on one server. Build the walls one at a time, and see what leaks out when each is missing.',
  overview: 'A container is not a small virtual machine. It is an ordinary process on the host, started with a few kernel features that change what it can see and use, and building one by hand, as the rubber-docker workshop and mocker do in Python, shows that there is no magic. Namespaces give the process its own view of one kind of resource. In a new PID namespace the process is number 1 and cannot see or signal the host\'s processes; a UTS namespace gives it its own hostname; a network namespace gives it its own interfaces, usually joined to the host by a virtual cable; a mount namespace lets it change its mounts without affecting anyone else. With its own mount namespace, the runtime mounts the image\'s files and calls pivot_root to make them the new root, so the host\'s files simply are not there. Control groups, or cgroups, limit and account for resources: a memory limit means a leaking program is killed when it reaches its cap instead of starving the whole server, and CPU shares keep one container from hogging the processor. Finally, images are read-only layers stacked by an overlay filesystem: the container sees the merged view, and every write lands in a thin writable layer of its own, so many containers can share one image and a container\'s changes vanish when it is removed. Real runtimes add dropped capabilities, seccomp filters and user namespaces on top. This machine follows an invented coding lab at a school in Nairobi, where one student\'s program misbehaves.',
  keywords: ['build your own Docker', 'containers', 'Linux namespaces', 'cgroups', 'pivot_root', 'overlay filesystem', 'container runtime'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://github.com/Fewbytes/rubber-docker" target="_blank" rel="noopener">rubber-docker</a> (MIT) and <a href="https://github.com/tonybaloney/mocker" target="_blank" rel="noopener">mocker</a> (Apache-2.0), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short container launcher, written for this lesson after rubber-docker (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { pid: true, root: true, net: true, cgroup: true, overlay: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const host = P.box(4.0, 0.03, 1.75, '#fff', { r: 0.03, material: new THREE.MeshLambertMaterial({ color: '#2F3038' }) }); host.position.set(-0.9, 0.12, -0.15); floor.add(host);

    const chip = (x, z, w, label, col) => { const m = new THREE.MeshLambertMaterial({ color: col }), b = P.box(w, 0.05, 0.2, '#fff', { r: 0.03, material: m }); b.position.set(x, 0.16, z); floor.add(b);    return { m, b }; };
    ['sshd', 'gradebook db', 'web server', 'other student'].forEach((n, i) => chip(-2.45, -0.62 + i * 0.27, 0.8, n, '#D6D1C6'));
    const boxM = new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), cbox = P.box(2.3, 0.04, 1.3, '#fff', { r: 0.04, material: boxM }); cbox.position.set(-0.55, 0.15, -0.2); floor.add(cbox);

    const rows = ['ps: processes it sees', 'ls /: files it sees', 'ip: network it sees', 'memory it uses', 'writes to /usr land in'].map((n, i) => {
      const v = chip(0.05, -0.53 + i * 0.22, 1.0, '', '#fff');
      return v;
    });
    const memTr = P.box(3.7, 0.02, 0.09, '#4A4B55', { r: 0.02 }); memTr.position.set(-0.9, 0.14, 0.64); floor.add(memTr);
    const memM = new THREE.MeshLambertMaterial({ color: GOOD }), memB = P.box(1, 0.03, 0.09, '#fff', { r: 0.02, material: memM }); memB.userData.noFit = true; floor.add(memB);

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    let R = null;
    function draw() {
      R = run(st);
      const vals = [
        [R.seesHostProcs ? 'all host processes' : 'only itself, as PID 1', R.seesHostProcs],
        [R.seesHostFiles ? 'the host\'s files' : 'only its image', R.seesHostFiles],
        [R.seesHostNet ? 'host interfaces' : 'its own veth0', R.seesHostNet],
        [st.cgroup ? `killed at ${LIMIT_MB} MB` : `all ${HOST_MB} MB of the host`, R.hostDown],
        [st.overlay ? 'its own writable layer' : 'the shared image', R.imageChanged],
      ];
      rows.forEach((r, i) => { r.m.color.set(vals[i][1] ? '#F7DED5' : '#D9F0E9');  });
      const frac = R.mem / HOST_MB, len = Math.max(0.02, frac * 3.7);
      memB.scale.x = len; memB.position.set(-0.9 - 1.85 + len / 2, 0.145, 0.64); memM.color.set(R.hostDown ? RED : GOOD);
      boxM.color.set(R.leaks ? '#FBEDE7' : '#FBF8F1');
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return R.leaks === 0; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'New PID namespace', short: 'PID', get: () => st.pid, set: v => set({ pid: !!v }) },
      { type: 'toggle', label: 'New root with pivot_root', short: 'Root', get: () => st.root, set: v => set({ root: !!v }) },
      { type: 'toggle', label: 'New network namespace', short: 'Network', get: () => st.net, set: v => set({ net: !!v }) },
      { type: 'toggle', label: 'Cgroup memory limit', short: 'Memory limit', get: () => st.cgroup, set: v => set({ cgroup: !!v }) },
      { type: 'toggle', label: 'Overlay filesystem for writes', short: 'Overlay', get: () => st.overlay, set: v => set({ overlay: !!v }) },
    ];
    const readouts = [
      { label: 'Walls up', get: () => ({ v: `${5 - R.leaks} of 5`, sub: 'isolation', good: R.leaks === 0, bad: R.leaks > 0 }) },
      { label: 'Memory used', get: () => ({ v: `${R.mem} MB`, sub: `host has ${HOST_MB} MB`, good: !R.hostDown, bad: R.hostDown }) },
      { label: 'Shared image', get: () => ({ v: R.imageChanged ? 'changed' : 'untouched', sub: 'by this container', good: !R.imageChanged, bad: R.imageChanged }) },
    ];
    const labels = [
      { name: 'c', t: 'One container', d: 'A process with walls', icon: 'box', atV: V(-2.45, 0.15, -0.2) },
      { name: 't', t: 'The five walls', d: 'Namespaces, root, cgroup, overlay', icon: 'check', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Skip the PID namespace', hint: 'sees host processes', on: () => set({ ...D0, pid: false }), off: reset },
      { label: 'Keep the host\'s filesystem', hint: 'no pivot_root', on: () => set({ ...D0, root: false }), off: reset },
      { label: 'Drop the memory limit', hint: 'a leak starves the host', on: () => set({ ...D0, cgroup: false }), off: reset },
      { label: 'Write into the shared image', hint: 'no overlay', on: () => set({ ...D0, overlay: false }), off: reset },
    ];
    function status() {
      if (!st.pid) return { ok: false, msg: '<b>Without its own PID namespace, the student\'s ps lists every process on the server, the gradebook database included, and the program can try to signal them.</b> Start the container in a new PID namespace, where it is process 1 and sees nothing else.' };
      if (!st.root) return { ok: false, msg: '<b>Without a new root, the program\'s ls / shows the host\'s own files, configuration and other students\' work.</b> Mount the image in the container\'s mount namespace and pivot_root into it, so the host\'s files are simply not there.' };
      if (!st.cgroup) return { ok: false, msg: `<b>With no memory limit, the leaking program grows past all ${HOST_MB} MB of the server, and the web server, the database and every other student stall.</b> Put the container in a cgroup with a memory cap; at ${LIMIT_MB} MB the kernel kills only the leaking program.` };
      if (!st.overlay) return { ok: false, msg: '<b>Without an overlay, the program\'s write to /usr changes the shared image itself, so every other student\'s container now sees the change.</b> Stack the image\'s read-only layers under a writable layer of the container\'s own.' };
      if (!st.net) return { ok: false, msg: '<b>Without a network namespace, the program shares the host\'s interfaces and can reach anything the server can.</b> Give it its own namespace with one virtual interface and only the routes it needs.' };
      return { ok: true, msg: `<b>The program is process 1 in its own world: it sees only itself, only its image and only its own interface; its memory leak is stopped at ${LIMIT_MB} MB; and its write lands in its own layer.</b> All of that is one ordinary process with namespaces, a new root, a cgroup and an overlay.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Just a process', home: true, say: 'A container is an ordinary process on the server. With no walls, it sees and touches everything.', act: m => m.set({ pid: false, root: false, net: false, cgroup: false, overlay: false }) },
    { t: 'Namespaces', home: true, say: 'New namespaces give it its own view: only its own processes, hostname and network.', act: m => m.set({ pid: true, root: false, net: true, cgroup: false, overlay: false }) },
    { t: 'A new root', home: true, say: 'Mount the image and pivot into it. The host\'s files are no longer there.', act: m => m.set({ pid: true, root: true, net: true, cgroup: false, overlay: false }) },
    { t: 'A memory limit', home: true, say: 'A cgroup caps memory. A leak kills only the leaking program, not the server.', act: m => m.set({ pid: true, root: true, net: true, cgroup: true, overlay: false }) },
    { t: 'Layers', home: true, say: 'Images are read-only layers. Writes land in a thin layer of the container\'s own.', act: m => m.set({ pid: true, root: true, net: true, cgroup: true, overlay: true }) },
    { t: 'No magic', home: true, say: 'Namespaces, a new root, a cgroup and an overlay. That is a container.', act: m => m.set({ pid: true, root: true, net: true, cgroup: true, overlay: true }) },
  ],
  check: [
    { q: 'What is a container, underneath?', options: ['An ordinary process with namespaces, a new root and cgroups', 'A small virtual machine', 'A compressed file'], answer: 0, why: 'Kernel features, not a separate kernel.', hint: 'Read the overview.' },
    { q: 'What does a cgroup memory limit do?', options: ['Kills only the leaking program at its cap', 'Speeds it up', 'Hides files'], answer: 0, why: 'The server stays up.', hint: 'Try Drop the memory limit.' },
    { q: 'Where do a container\'s writes go with an overlay?', options: ['A writable layer of its own', 'The shared image', 'Nowhere'], answer: 0, why: 'The image stays read-only.', hint: 'Try Write into the shared image.' },
  ],
  terms: [
    ['Namespace', 'A kernel feature giving a process its own view of a resource.'],
    ['PID namespace', 'A separate set of process numbers; the container sees only its own.'],
    ['pivot_root', 'Switching a process\'s root filesystem to a new directory.'],
    ['Cgroup', 'A control group that limits and counts resource use.'],
    ['Overlay filesystem', 'Read-only layers merged under one writable layer.'],
    ['Image', 'The stacked layers of files a container starts from.'],
  ],
  deeper: '<p><b>More walls.</b> Real runtimes drop Linux capabilities, filter system calls with seccomp and map the container\'s root user to an ordinary user outside.</p><p><b>Not a sandbox for hostile code.</b> Containers share the host kernel, so a kernel bug can break the walls; untrusted code is often run in lightweight virtual machines instead.</p><p><b>About this machine.</b> The school lab and its server are invented for illustration.</p>',
  code: {
    title: 'Launch a container by hand',
    note: 'Our own short version, after rubber-docker (Linux only, needs root).',
    text: `
import os, linux   # rubber-docker's small wrapper for clone, mount and pivot_root

def child(image_dir, cmd):
    linux.sethostname("lab")
    linux.mount("overlay", f"{image_dir}/merged", "overlay", 0,
                f"lowerdir={image_dir}/base,upperdir={image_dir}/rw,workdir={image_dir}/work")
    os.makedirs(f"{image_dir}/merged/old_root", exist_ok=True)
    linux.pivot_root(f"{image_dir}/merged", f"{image_dir}/merged/old_root")
    os.chdir("/")
    linux.umount2("/old_root", linux.MNT_DETACH)          # host files gone
    os.execvp(cmd[0], cmd)

def run(image_dir, cmd, mem_mb=256):
    flags = linux.CLONE_NEWPID | linux.CLONE_NEWNS | linux.CLONE_NEWUTS | linux.CLONE_NEWNET
    pid = linux.clone(lambda: child(image_dir, cmd), flags)
    cg = f"/sys/fs/cgroup/lab-{pid}"
    os.makedirs(cg)
    open(f"{cg}/memory.max", "w").write(str(mem_mb * 1024 * 1024))
    open(f"{cg}/cgroup.procs", "w").write(str(pid))
    os.waitpid(pid, 0)
`,
  },
};
