// Terminal and shell: a training log flows through a pipeline (grep, awk, sort) to find the best loss, while training runs on a server
// you reach over SSH, inside tmux so it survives the laptop closing.
// Break it: close the laptop without tmux, overwrite the log with > instead of appending, leave errors out of the log (no 2>&1).
const RUN1 = [0.92, 0.71, 0.6, 0.52, 0.47, 0.44, 0.42, 0.41, 0.43, 0.42];
const RUN2 = [0.95, 0.74, 0.63, 0.57, 0.52, 0.55];      // today's run, which crashes at epoch 6
const TX = -3.05, PZ = 0.65, STAGES = [{ x: -1.7, cmd: 'grep loss', s: 'keep loss lines' }, { x: -0.3, cmd: "awk '{print $4}'", s: 'cut out the number' }, { x: 1.1, cmd: 'sort -n | head -1', s: 'smallest first' }], CUPX = 2.55;
const SVX = 1.55, SVZ = -1.35, LPX = -1.45;

export default {
  slug: 'terminal-pipes',
  title: 'The terminal: pipes and sessions',
  description: 'Pour a training log through a pipeline of small commands until one number comes out: the best loss. Then keep training alive on a faraway server when your laptop closes, and see what > and 2>&1 really do.',
  overview: 'The terminal joins small tools into pipelines: each one does a single job and passes its output to the next with a pipe (|). grep keeps the lines you want, awk cuts out a column, sort puts them in order. The same window reaches GPU servers over SSH, and tmux keeps a training run alive on the server when your laptop sleeps. Redirects decide where output goes: > replaces a file, >> adds to it, and 2>&1 sends error messages there too.',
  keywords: ['terminal for ai', 'grep awk sort pipe', 'tmux training', 'ssh gpu server', 'redirect stderr 2>&1'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.55, -0.2], dir: [0.25, 1.0, 1.35], half: 3.1, wide: 7 },

  build(S) {
    const { THREE, V, P, C } = S;
    const mono = '"JetBrains Mono", monospace';
    const st = { append: true, errs: true, tmux: true, lid: false, epoch: 3, run: null, result: null, alive: true };
    /* ---------- the log ---------- */
    function lines() {
      const L = [];
      const add = (run, r) => r.forEach((l, i) => { L.push({ loss: false, t: `run ${run} epoch ${i + 1} lr 0.001` }); L.push({ loss: true, v: l, t: `epoch ${i + 1} loss ${l}` }); });
      if (st.append) add(1, RUN1);
      add(2, RUN2);
      if (st.errs) L.push({ loss: false, err: true, t: 'CUDA out of memory' });
      return L;
    }
    const tank = P.cyl(0.55, 1.2, '#E8D9B5'); tank.position.set(TX, 0, PZ); S.add(tank);
    const tankT = S.text('train.log', { size: 0.13, weight: 800, color: '#151827', font: mono, maxW: 0.95 }); tankT.position.set(TX, 1.205, PZ - 0.15); S.add(tankT);
    const tankN = S.text('', { size: 0.1, weight: 700, color: '#151827', font: mono, maxW: 0.95 }); tankN.position.set(TX, 1.205, PZ + 0.18); S.add(tankN);
    const pipe = P.box(CUPX - TX, 0.08, 0.32, '#8E91A3', { r: 0.04 }); pipe.position.set((CUPX + TX) / 2, 0.3, PZ); S.add(pipe);
    /* ---------- the stages ---------- */
    const stages = STAGES.map((s, i) => {
      const g = new THREE.Group(); g.position.set(s.x, 0, PZ); S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: ['#1C9A94', '#3D6BD6', '#8A3F8E'][i] });
      const b = P.box(1.15, 0.75, 0.8, '#ccc', { r: 0.08, material: m }); g.add(b);
      const top = S.text(s.cmd, { size: 0.11, weight: 800, color: '#FFFFFF', font: mono, maxW: 1.05 }); top.position.set(0, 0.755, -0.12); g.add(top);
      const f = S.text(s.s, { size: 0.1, face: 'front', weight: 750, color: '#FFFFFF', maxW: 1.05 }); f.position.set(0, 0.55, 0.405); g.add(f);
      const bar = S.text('|', { size: 0.3, weight: 800, color: '#E3A72F', face: 'cam', top: true }); bar.position.set(0.72, 0.9, 0); bar.userData.noFit = true; if (i < 2) g.add(bar);
      return { g, m };
    });
    const cup = P.cyl(0.32, 0.45, '#F2C94C'); cup.position.set(CUPX, 0, PZ); S.add(cup);
    const resT = S.text('', { size: 0.15, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 1.6 }); resT.position.set(CUPX, 0.95, PZ); resT.userData.noFit = true; S.add(resT);
    const waste = P.box(0.55, 0.2, 0.5, '#5B5F73', { r: 0.05 }); waste.position.set(STAGES[0].x, 0, PZ + 0.85); S.add(waste);
    /* ---------- the beads (log lines) ---------- */
    const beads = [...Array(40)].map(() => { const m = new THREE.MeshLambertMaterial({ color: '#B9B6AE' }); const b = P.ball(0.08, '#B9B6AE', { material: m }); b.visible = false; b.userData.noFit = true; S.add(b); return { b, m }; });
    /* ---------- the server, the laptop and the session ---------- */
    const srv = P.box(1.4, 1.35, 1.0, '#2C2D31', { r: 0.08 }); srv.position.set(SVX, 0, SVZ); S.add(srv);
    const srvT = S.text('GPU SERVER', { size: 0.13, face: 'front', weight: 800, color: '#FFFFFF', maxW: 1.3 }); srvT.position.set(SVX, 1.18, SVZ + 0.505); S.add(srvT);
    const srvTop = S.text('SERVER', { size: 0.13, weight: 800, color: '#FFFFFF', maxW: 1.2 }); srvTop.position.set(SVX, 1.355, SVZ - 0.25); S.add(srvTop);
    const prog = S.text('', { size: 0.11, face: 'front', weight: 750, color: '#E9ECF8', font: mono, maxW: 1.25, maxH: 0.5 }); prog.position.set(SVX, 0.7, SVZ + 0.505); S.add(prog);
    const dome = P.ball(0.55, '#BFE6F2', { m: { opacity: 0.25 }, cast: false }); dome.material.depthWrite = false; dome.scale.set(1.45, 1.35, 1.15); dome.position.set(SVX, 0.62, SVZ); S.add(dome);
    const domeT = S.text('tmux session', { size: 0.12, weight: 800, color: '#127570', face: 'cam', bg: 'rgba(255,255,255,0.85)', top: true, maxW: 1.3 }); domeT.position.set(SVX, 1.62, SVZ); domeT.userData.noFit = true; S.add(domeT);
    const lapB = P.box(1.2, 0.07, 0.8, '#8E91A3', { r: 0.05 }); lapB.position.set(LPX, 0, SVZ); S.add(lapB);
    const lid = new THREE.Group(); lid.position.set(LPX, 0.07, SVZ - 0.38); S.add(lid);
    const lidB = P.box(1.2, 0.8, 0.05, '#5B5F73', { r: 0.03 }); lid.add(lidB);
    const lidS = S.text('$ ssh gpu\n$ tmux attach', { size: 0.09, face: 'front', weight: 600, color: '#E9ECF8', font: mono, align: 'left', maxW: 1.05 }); lidS.position.set(0, 0.45, 0.03); lid.add(lidS);
    const lapT = S.text('LAPTOP', { size: 0.11, weight: 800, color: '#FFFFFF', maxW: 1 }); lapT.position.set(LPX, 0.075, SVZ + 0.2); S.add(lapT);
    const cable = P.tube([V(LPX + 0.6, 0.05, SVZ), V(0, 0.3, SVZ + 0.25), V(SVX - 0.7, 0.4, SVZ)], 0.03, '#E3A72F'); S.add(cable);
    const cableT = S.text('ssh', { size: 0.11, weight: 800, color: '#9A6A10', font: mono, maxW: 0.4 }); cableT.position.set(0, 0.36, SVZ + 0.45); S.add(cableT);
    /* ---------- running the pipeline ---------- */
    function runPipe() {
      const L = lines();
      st.run = { t: 0, L, best: Math.min(...L.filter(l => l.loss).map(l => l.v)) };
      st.result = null;
      beads.forEach((b, i) => { b.b.visible = false; });
    }
    function closeLid() { st.lid = true; if (!st.tmux) st.alive = false; }
    function update(dt, t) {
      // training ticks on the server while it is alive
      if (st.alive) st.epoch = Math.min(10, st.epoch + dt * 0.35);
      prog.userData.set(st.alive ? `epoch ${Math.floor(st.epoch)}/10\ntraining…` : `epoch ${Math.floor(st.epoch)}/10\nKILLED`);
      dome.visible = domeT.visible = st.tmux;
      lid.rotation.x += ((st.lid ? Math.PI / 2 - 0.05 : -0.15) - lid.rotation.x) * Math.min(1, dt * 4);
      srv.material = P.mat(st.alive ? '#2C2D31' : '#5A2A2A');
      const r = st.run;
      tankN.userData.set(`${lines().length} lines`);
      if (r) {
        r.t += dt * (S.reduced ? 4 : 1);
        const n = Math.min(beads.length, r.L.length);
        for (let i = 0; i < n; i++) {
          const l = r.L[i], b = beads[i], u = (r.t - i * 0.06) / 2.0;
          if (u <= 0 || u >= 1.05) { b.b.visible = false; continue; }
          b.b.visible = true;
          const x = TX + 0.5 + (CUPX - TX - 0.5) * Math.min(1, u);
          let y = 0.45, z = PZ;
          const past0 = x > STAGES[0].x;
          // grep drops every line without "loss" into the bin under it
          if (past0 && !l.loss) { b.b.visible = x < STAGES[0].x + 0.4; y = 0.45 - (x - STAGES[0].x) * 1.0; z = PZ + (x - STAGES[0].x) * 2; }
          const cut = x > STAGES[1].x;
          b.b.position.set(x, y, z); b.b.scale.setScalar(cut && l.loss ? 0.75 : 1);
          b.m.color.set(l.err ? C.red : !l.loss ? '#B9B6AE' : cut ? '#F2C94C' : C.orange);
        }
        if (r.t > 2.0 + n * 0.06) st.result = r.best;
      }
      resT.visible = st.result != null;
      if (st.result != null) resT.userData.set(`best loss: ${st.result}`);
    }
    runPipe();
    const controls = [
      { type: 'button', label: 'Run the pipeline', short: 'Run', act: runPipe, hint: 'grep loss train.log | awk \'{print $4}\' | sort -n | head -1' },
      { type: 'button', label: 'Close the laptop lid', short: 'Close lid', act: closeLid },
      { type: 'button', label: 'Open the lid and reconnect', short: 'Reconnect', act: () => { st.lid = false; }, quick: false },
      { type: 'toggle', label: 'Train inside tmux', short: 'tmux', get: () => st.tmux, set: v => { st.tmux = v; } },
      { type: 'toggle', label: 'Append to the log (>>)', get: () => st.append, set: v => { st.append = v; runPipe(); }, quick: false },
      { type: 'toggle', label: 'Errors into the log too (2>&1)', get: () => st.errs, set: v => { st.errs = v; runPipe(); }, quick: false },
    ];
    const readouts = [
      { label: 'Best loss', get: () => ({ v: st.result != null ? String(st.result) : '…', good: st.result === 0.41 }) },
      { label: 'Training', get: () => ({ v: st.alive ? `epoch ${Math.floor(st.epoch)}` : 'killed', good: st.alive, bad: !st.alive, sub: st.lid ? 'laptop closed' : 'connected' }) },
    ];
    const labels = [
      { name: 'log', t: 'The log file', d: 'Every line the training printed', icon: 'box', atV: V(TX - 0.55, 1.2, PZ) },
      { name: 'pipeline', t: 'A pipeline', d: 'Small tools joined by |', icon: 'link', atV: V(STAGES[0].x - 0.58, 0.75, PZ - 0.4) },
      { name: 'result', t: 'One number out', d: 'The lowest loss in the log', icon: 'target', atV: V(CUPX + 0.32, 0.45, PZ) },
      { name: 'server', t: 'Training far away', d: 'Reached over ssh, kept alive by tmux', icon: 'spark', atV: V(SVX + 0.7, 1.35, SVZ) },
    ];
    const reset = () => { Object.assign(st, { append: true, errs: true, tmux: true, lid: false, epoch: 3, alive: true }); runPipe(); };
    const breaks = [
      { label: 'Close the laptop without tmux', hint: 'Training ran in the ssh window', on: () => { reset(); st.tmux = false; closeLid(); }, off: reset },
      { label: 'Overwrite the log with >', hint: 'Instead of >>', on: () => { reset(); st.append = false; runPipe(); }, off: reset },
      { label: 'Leave errors out of the log', hint: 'No 2>&1', on: () => { reset(); st.errs = false; runPipe(); }, off: reset },
    ];
    function status() {
      if (!st.alive) return { ok: false, msg: `<b>Training killed at epoch ${Math.floor(st.epoch)}.</b> It was running in the ssh window itself, so when the laptop closed the connection dropped and the server stopped the job. Start it inside tmux (or with nohup): the session lives on the server and you reattach later.` };
      if (!st.append) return { ok: false, msg: `<b>Yesterday's log is gone.</b> <code>&gt;</code> empties the file before writing, so run 1 (best loss 0.41) was wiped and the pipeline can only find today's ${Math.min(...RUN2)}. Use <code>&gt;&gt;</code> to add to a log.` };
      if (!st.errs) return { ok: false, msg: `<b>The log just stops at epoch 6.</b> The crash message ("CUDA out of memory") went to the screen, not the file, because error messages travel on their own stream. Add <code>2&gt;&amp;1</code> so they land in the log with everything else.` };
      if (st.result == null) return { msg: `<b>Pouring the log through the pipeline…</b> grep keeps the loss lines, awk cuts out the number, sort puts the smallest first.` };
      return { ok: true, msg: `<b>Best loss: ${st.result}</b>, from ${lines().length} lines, with one line of commands. Meanwhile training carries on at epoch ${Math.floor(st.epoch)} inside tmux${st.lid ? ', even with the laptop closed' : ''}.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, run: runPipe, closeLid, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'A log full of lines', focus: [-2.2, 0.7, 0.4], zoom: 1.3, say: 'Training prints hundreds of lines into a log file. You want one number from it: the best loss.', act: m => m.reset() },
    { t: 'Small tools, joined', focus: [-0.4, 0.5, 0.6], zoom: 1.35, say: 'The terminal joins small tools with a pipe. grep keeps only the lines that mention loss. awk cuts out the number. sort puts the smallest first.', act: m => m.run(), wait: 7 },
    { t: 'One number out', focus: [2.4, 0.6, 0.6], zoom: 1.5, say: 'One line of commands, and out comes the answer. The same pipeline works on a log of a million lines.' },
    { t: 'A server far away', focus: [0.1, 0.7, -1.3], zoom: 1.4, say: 'Real training runs on a GPU server. You reach it from your laptop over ssh, a secure connection, and type there as if it were in front of you.' },
    { t: 'Close the lid', home: true, say: 'Start the training inside tmux, and the session lives on the server. Close your laptop and go home: training carries on, and you reattach in the morning.', act: m => m.closeLid(), wait: 5 },
    { t: 'Where output goes', focus: [-3.0, 0.8, 0.6], zoom: 1.45, say: 'One more habit: append to logs with two arrows, never one, and send error messages into the log too, so a crash leaves its reason behind.' },
  ],
  check: [
    { q: 'What does the pipe | do?', options: ['Sends one command\'s output into the next command', 'Deletes a file', 'Runs a command on a server'], answer: 0, why: 'Each tool does one job; the pipe chains them so the output of one is the input of the next.' },
    { q: 'You trained over ssh without tmux and closed your laptop. What happened?', options: ['Training sped up', 'Training was killed when the connection dropped', 'Nothing'], answer: 1, why: 'A job tied to the ssh window dies with it. tmux keeps the session alive on the server.' },
    { q: 'What is the difference between > and >>?', options: ['None', '> replaces the file; >> adds to the end', '>> is faster'], answer: 1, why: 'A single arrow empties the file first. Two arrows append.' },
  ],
  terms: [
    ['Shell', 'The program that reads what you type in the terminal and runs it: zsh, bash.'],
    ['Pipe (|)', 'Sends one command\'s output straight into the next command.'],
    ['grep', 'Keeps only the lines that match a word or pattern.'],
    ['Redirect', '> writes output to a file (replacing it), >> appends, 2>&1 adds error messages.'],
    ['ssh', 'A secure connection to another computer\'s terminal.'],
    ['tmux', 'Keeps terminal sessions running on a machine after you disconnect; you can reattach later.'],
  ],
  deeper: '<p><b>Watching the machine.</b> <code>htop</code> shows processes and memory, <code>nvidia-smi</code> (or <code>nvtop</code>) shows the graphics card: how busy it is and how much memory each job holds. Run them in a second tmux pane beside the training.</p><p><b>Moving files.</b> <code>scp</code> copies a file to or from a server; <code>rsync</code> copies only what changed, which matters for big checkpoints.</p><p><b>History.</b> Ctrl+R searches every command you have typed. It is the shortcut that saves the most time.</p>',
  code: {
    title: 'Pipelines, redirects and tmux',
    note: 'From the course\'s terminal lesson.',
    text: `
# the best loss in a log, in one line
grep "loss" train.log | awk '{print $4}' | sort -n | head -1

# watch a log as it grows, showing only errors
tail -f train.log | grep -i error

# append output and errors to the same log
python train.py >> train.log 2>&1

# on the server: train inside tmux so it survives disconnects
ssh gpu-server
tmux new -s train
python train.py >> train.log 2>&1
# Ctrl+B then D to detach; later:
tmux attach -t train
`,
  },
};
