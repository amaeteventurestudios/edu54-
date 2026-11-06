// Build your own UNIX shell: the shell reads a line, splits it into commands, and for each external command forks a child, which calls exec to
// become the program while the shell waits. Builtins such as cd must run inside the shell itself; a pipeline connects children with pipes, and
// the shell must close its own copies of the pipe ends or the last command never sees end of input; finished children must be waited for or
// they linger as zombies; and the shell must ignore Ctrl-C itself so only the running child is interrupted. Each outcome follows these rules.
const CMDS = [
  { line: 'cd /tmp; pwd', kind: 'cd' },
  { line: 'ls | grep log | wc -l', kind: 'pipe' },
  { line: 'sleep 100   (then Ctrl-C)', kind: 'sigint' },
];
function run(o) {
  const c = CMDS[o.cmd];
  let out = [], procs = [], hang = false, died = false, zombies = 0, ok = true;
  if (c.kind === 'cd') {
    if (o.builtin) { procs = [{ n: 'shell runs cd itself', fork: false }, { n: 'pwd', fork: true }]; out = ['/tmp']; }
    else { procs = [{ n: 'child runs cd', fork: true }, { n: 'pwd', fork: true }]; out = ['/home/amina']; ok = false; }
    zombies = o.wait ? 0 : procs.filter(p => p.fork).length;
  } else if (c.kind === 'pipe') {
    procs = [{ n: 'ls', fork: true }, { n: 'grep log', fork: true }, { n: 'wc -l', fork: true }];
    if (o.close) out = ['3']; else { hang = true; out = ['(nothing: wc -l is still waiting)']; ok = false; }
    zombies = o.wait ? 0 : (hang ? 2 : 3);
  } else {
    procs = [{ n: 'sleep 100', fork: true }];
    if (o.ignore) out = ['^C', 'amina@lab:~$ ']; else { died = true; out = ['^C', '[shell exited]']; ok = false; }
    zombies = o.wait ? 0 : 1;
  }
  if (zombies) ok = false;
  return { c, out, procs, hang, died, zombies, ok };
}

export default {
  slug: 'build-a-shell',
  title: 'Build your own UNIX shell',
  description: 'A shell is a loop: read a line, fork a child, let it become the program, wait, repeat. Run three lines and catch the zombie and the hang.',
  overview: 'The shell you type commands into is an ordinary program, and writing one, as the Writing a UNIX Shell tutorial does in C, is a good tour of how UNIX runs programs. The main loop prints a prompt, reads a line and splits it into words. For an external command such as ls, the shell calls fork, which makes a copy of the shell process; in the child, exec replaces that copy with the ls program, and in the parent the shell calls wait until the child finishes, collecting its exit status. Some commands cannot work that way. cd changes the current directory, which belongs to a process, so if a child ran it only the child\'s directory would change and the child would then exit; cd, exit and a few others must be builtins that the shell runs inside itself. A pipeline such as ls | grep log | wc -l asks the kernel for pipes, each a pair of file descriptors, a write end and a read end. The shell forks a child per command, and each child uses dup2 to connect its standard output to the next pipe\'s write end or its standard input to the previous pipe\'s read end, then closes the rest. The parent must close its own copies of every pipe end too: a reader sees end of input only when every write end is closed, so one forgotten descriptor leaves wc waiting for ever. Children that finish but are not waited for stay in the process table as zombies. Finally, pressing Ctrl-C sends an interrupt signal to every process in the foreground; the shell should ignore it, and restore the default in each child, so the running program stops and the prompt returns. Real shells add job control, redirection, globbing and scripting. This machine traces each command line for an invented student, Amina, in a computer lab.',
  keywords: ['build your own shell', 'fork and exec', 'pipes', 'file descriptors', 'builtins', 'zombie processes', 'signals'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.6, 0.35, -0.15], dir: [0.05, 0.75, 1.2], half: 0.95, wide: 4.4 },
  credit: 'Built from <a href="https://indradhanush.github.io/blog/writing-a-unix-shell-part-1/" target="_blank" rel="noopener">Writing a UNIX Shell</a> by Indradhanush Gupta (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short shell loop, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cmd: 1, builtin: true, close: true, wait: true, ignore: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#9A9DAA';
    const HOME = '#5B8DB8', TMP = '#E3A72F';
    // the shell stands on its working directory: blue pad home, gold pad /tmp
    const padH = P.cyl(0.32, 0.05, HOME); padH.position.set(-1.3, 0, -0.7); S.add(padH);
    const padT = P.cyl(0.32, 0.05, TMP); padT.position.set(0.1, 0, -0.7); S.add(padT);
    const shell = P.robot('#3F4049', { scale: 1.1 }); S.add(shell);
    // the children's row
    const row = P.box(3.6, 0.04, 0.6, '#3A3D4A', { r: 0.04 }); row.position.set(-0.6, 0, 0.35); S.add(row);
    S.add(P.keep(-2.45, 1.25, 1.2, -1.05, 0.7));
    let parts = [], kids = [], flows = [], R = null, shellTo = V();
    function draw() {
      R = run(st);
      parts.forEach(p => p.parent && p.parent.remove(p)); parts = []; kids = []; flows = [];
      const add = o => { o.userData.noFit = true; S.add(o); parts.push(o); return o; };
      const cd = R.c.kind === 'cd', inTmp = cd && st.builtin;
      shellTo = V(inTmp ? 0.1 : -1.3, 0.05, -0.7);
      shell.rotation.z = R.died ? 1.2 : 0;
      shell.userData.set({ color: R.died ? BAD : '#3F4049', lamp: R.ok ? GOOD : BAD });
      const forks = R.procs.filter(p => p.fork), n = forks.length;
      forks.forEach((p, i) => {
        const x = -0.6 + (i - (n - 1) / 2) * 1.05, z = 0.35;
        const blocked = R.hang && i === n - 1, zombie = R.zombies > 0 && !blocked && !(R.c.kind === 'sigint' && R.died);
        // the child's own working directory
        const dirC = cd && p.n === 'child runs cd' ? TMP : inTmp ? TMP : HOME;
        const pad = add(P.cyl(0.2, 0.04, dirC)); pad.position.set(x, 0.04, z);
        const k = add(P.robot(zombie ? OFF : '#4A6FA5', { scale: 0.7, lamp: blocked ? SAF : zombie ? BAD : GOOD })); k.position.set(x, 0.08, z);
        if (zombie) { k.rotation.z = -1.3; k.position.y = 0.2; }
        k.userData.set({ busy: blocked }); kids.push(k);
        add(P.rod(V(shellTo.x, 0.45, -0.6), V(x, 0.42, z - 0.1), 0.012, SAF));
        if (R.c.kind === 'pipe' && i < n - 1) { const nx = -0.6 + (i + 1 - (n - 1) / 2) * 1.05; const f = add(P.pipe([V(x + 0.18, 0.28, z), V((x + nx) / 2, 0.38, z), V(nx - 0.18, 0.28, z)], GOOD, { r: 0.03, n: 4 })); flows.push(f); }
      });
      // a write end the shell forgot to close keeps the last reader waiting
      if (R.hang) { const lx = -0.6 + ((n - 1) / 2) * 1.05; const f = add(P.pipe([V(shellTo.x + 0.2, 0.5, -0.6), V(lx - 0.2, 0.7, -0.1), V(lx, 0.45, 0.25)], BAD, { r: 0.03, n: 3, pipe: '#E9B8A8' })); flows.push(f); }
    }
    const tick = dt => { shell.position.lerp(shellTo, Math.min(1, dt * 5)); shell.userData.tick(dt); kids.forEach(k => k.userData.tick(dt)); flows.forEach(f => f.userData.tick(dt)); };
    function isOk() { return R.ok && st.builtin && st.close && st.wait && st.ignore; }
    draw(); shell.position.copy(shellTo);
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Run cd as a builtin', short: 'Builtin cd', get: () => st.builtin, set: v => set({ builtin: !!v }) },
      { type: 'toggle', label: 'Close the shell\'s copies of pipe ends', short: 'Close pipes', get: () => st.close, set: v => set({ close: !!v }) },
      { type: 'toggle', label: 'Wait for every child', short: 'Wait', get: () => st.wait, set: v => set({ wait: !!v }) },
      { type: 'toggle', label: 'Shell ignores Ctrl-C', short: 'Ignore ^C', get: () => st.ignore, set: v => set({ ignore: !!v }) },
      { type: 'buttons', label: 'Command line', options: CMDS.map(c => c.line), get: () => st.cmd, act: i => set({ cmd: i }) },
    ];
    const readouts = [
      { label: 'Outcome', get: () => ({ v: R.died ? 'shell died' : R.hang ? 'hangs' : 'done', sub: R.c.line, good: R.ok, bad: !R.ok }) },
      { label: 'Zombies', get: () => ({ v: `${R.zombies}`, sub: 'unreaped children', good: R.zombies === 0, bad: R.zombies > 0 }) },
      { label: 'Processes forked', get: () => ({ v: `${R.procs.filter(p => p.fork).length}`, sub: 'for this line', good: true, bad: false }) },
    ];
    const labels = [
      { name: 's', t: 'The shell', d: 'Its pad is its directory: blue home, gold /tmp', icon: 'code', atV: V(-1.62, 0.04, -0.7) },
      { name: 'k', t: 'Forked children', d: 'Teal pipes join them. Grey, tipped over: a zombie', icon: 'box', atV: V(1.2, 0.03, 0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Run cd in a child', hint: 'only the child moves', on: () => set({ ...D0, builtin: false, cmd: 0 }), off: reset },
      { label: 'Leave pipe ends open', hint: 'wc never finishes', on: () => set({ ...D0, close: false, cmd: 1 }), off: reset },
      { label: 'Never wait for children', hint: 'zombies', on: () => set({ ...D0, wait: false, cmd: 1 }), off: reset },
      { label: 'Let Ctrl-C reach the shell', hint: 'the shell dies', on: () => set({ ...D0, ignore: false, cmd: 2 }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.c.kind === 'cd' && !st.builtin) return { ok: false, msg: '<b>The shell forked a child to run cd, the child moved to /tmp and exited, and the shell never moved: pwd still prints /home/amina.</b> The current directory belongs to a process; cd must run inside the shell as a builtin.' };
      if (r.hang) return { ok: false, msg: '<b>The shell kept its own copies of the pipes\' write ends, so even after ls and grep finished, wc -l never saw end of input: the pipeline hangs.</b> After forking, close every pipe end the parent does not use.' };
      if (r.died) return { ok: false, msg: '<b>Ctrl-C sent an interrupt to every foreground process, the shell included, so sleep stopped and so did the shell: Amina\'s terminal closed.</b> The shell should ignore SIGINT and restore the default handler in each child before exec.' };
      if (r.zombies) return { ok: false, msg: `<b>The command worked, but the shell never called wait, so ${r.zombies} finished child${r.zombies > 1 ? 'ren stay' : ' stays'} in the process table as zombie${r.zombies > 1 ? 's' : ''}; run enough commands and the table fills.</b> Wait for every child and collect its exit status.` };
      if (!st.builtin || !st.close || !st.wait || !st.ignore) return { ok: false, msg: `<b>This line happens to work, but the shell ${!st.builtin ? 'runs cd in a child' : !st.close ? 'keeps pipe ends open' : !st.wait ? 'never waits for children' : 'lets Ctrl-C kill it'}: try ${!st.builtin ? 'cd /tmp; pwd' : !st.close ? 'the pipeline' : !st.wait ? 'any command' : 'the interrupted sleep'}.</b>` };
      return { ok: true, msg: r.c.kind === 'cd' ? '<b>cd ran inside the shell, so its directory is now /tmp, and the forked pwd inherits it: /tmp.</b>' : r.c.kind === 'pipe' ? '<b>Three children joined by two pipes, every unused end closed, so wc -l saw end of input and printed 3; the shell waited for all three.</b>' : '<b>Ctrl-C stopped sleep; the shell ignored it, reaped the child and printed the prompt again.</b>' };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Read, fork, exec, wait', home: true, say: 'A shell reads a line, forks a child, the child becomes the program, and the shell waits.', act: m => m.set({ cmd: 1, builtin: true, close: true, wait: true, ignore: true }) },
    { t: 'Builtins', home: true, say: 'cd changes the shell\'s own directory, so it must run inside the shell, not in a child.', act: m => m.set({ cmd: 0, builtin: false, close: true, wait: true, ignore: true }) },
    { t: 'Pipes', home: true, say: 'A pipeline links children with pipes. Each child connects its input and output, then closes the rest.', act: m => m.set({ cmd: 1, builtin: true, close: true, wait: true, ignore: true }) },
    { t: 'Close every end', home: true, say: 'If the shell keeps a write end open, the last command never sees the end of its input.', act: m => m.set({ cmd: 1, builtin: true, close: false, wait: true, ignore: true }) },
    { t: 'Reap the children', home: true, say: 'Finished children must be waited for, or they linger as zombies.', act: m => m.set({ cmd: 1, builtin: true, close: true, wait: false, ignore: true }) },
    { t: 'Ctrl-C', home: true, say: 'The shell ignores the interrupt, so only the running program stops.', act: m => m.set({ cmd: 2, builtin: true, close: true, wait: true, ignore: true }) },
  ],
  check: [
    { q: 'Why must cd be a builtin?', options: ['The directory belongs to the shell\'s own process', 'It is faster', 'It has no program'], answer: 0, why: 'A child\'s change dies with it.', hint: 'Try Run cd in a child.' },
    { q: 'Why does a pipeline hang if the shell keeps pipe ends open?', options: ['The reader never sees end of input', 'The pipe is full', 'The child crashed'], answer: 0, why: 'Every write end must close.', hint: 'Try Leave pipe ends open.' },
    { q: 'What is a zombie process?', options: ['A finished child nobody has waited for', 'A frozen program', 'A virus'], answer: 0, why: 'wait reaps it.', hint: 'Try Never wait for children.' },
  ],
  terms: [
    ['fork', 'Makes a copy of the calling process.'],
    ['exec', 'Replaces a process\'s program with another.'],
    ['wait', 'Pauses until a child finishes and collects its status.'],
    ['Builtin', 'A command the shell runs inside itself.'],
    ['Pipe', 'A kernel buffer with a write end and a read end.'],
    ['Signal', 'A notice the kernel delivers to a process, such as an interrupt.'],
  ],
  deeper: '<p><b>Redirection.</b> ls > out.txt opens the file and uses dup2 to make it the child\'s standard output before exec.</p><p><b>Job control.</b> Real shells put each pipeline in its own process group so Ctrl-C and Ctrl-Z reach only the foreground job.</p><p><b>About this machine.</b> The student and lab are invented; each trace follows the rules of fork, exec, pipes and signals.</p>',
  code: {
    title: 'A shell loop with a builtin and pipes',
    note: 'Our own short version, written for this lesson.',
    text: `
import os, signal, shlex

signal.signal(signal.SIGINT, signal.SIG_IGN)            # the shell ignores Ctrl-C
while True:
    line = input("$ ")
    stages = [shlex.split(s) for s in line.split("|")]
    if stages[0][0] == "cd":
        os.chdir(stages[0][1]); continue                 # builtin: runs in the shell
    prev, pids = None, []
    for i, argv in enumerate(stages):
        r, w = os.pipe() if i < len(stages) - 1 else (None, None)
        pid = os.fork()
        if pid == 0:
            signal.signal(signal.SIGINT, signal.SIG_DFL)
            if prev is not None: os.dup2(prev, 0)
            if w is not None: os.dup2(w, 1)
            for fd in (prev, r, w):
                if fd is not None: os.close(fd)
            os.execvp(argv[0], argv)
        pids.append(pid)
        if prev is not None: os.close(prev)              # parent closes its copies
        if w is not None: os.close(w)
        prev = r
    for pid in pids:
        os.waitpid(pid, 0)                               # reap every child
`,
  },
};
