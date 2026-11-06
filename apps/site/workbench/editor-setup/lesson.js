// Editor setup: a code screen with three helpers under it (type checker, formatter, auto-save), the file as saved on disk,
// and a GPU box far away that the same editor can work on through a tunnel (remote SSH).
// Break it: run code you haven't saved, turn type checking off and crash forty minutes in, train on the laptop instead of the GPU box.
const EX = -1.55, EZ = -0.45, SW = 2.9, SH = 1.75, SY = 0.35, HZ = 0.75, DX = 0.85, DZ = 0.75, GX = 2.55, GZ = -0.7;

export default {
  slug: 'editor-setup',
  title: 'An editor that helps',
  description: 'Set up the three helpers every AI engineer leans on: a type checker that spots mistakes before you run, a formatter on save, and auto-save. Then reach a GPU box in Johannesburg from the same editor.',
  overview: 'An editor is more than a place to type. A type checker reads your code as you write and underlines mistakes before you run anything. A formatter tidies every file when you save. Auto-save makes sure the file on disk is the one you are looking at. And a remote connection lets the same editor work on a GPU machine in a data centre, as if it were on your desk.',
  keywords: ['ai code editor setup', 'python type checking', 'format on save', 'auto save', 'remote ssh gpu'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.3, 0.8, -0.1], dir: [0.3, 0.75, 1.45], half: 3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const mono = '"JetBrains Mono", monospace';
    const st = { types: true, fmt: true, auto: true, remote: true, bug: false, formatted: true, edited: false, saved: { lr: '0.001', bug: false, formatted: true }, run: null, out: null };
    /* ---------- the editor ---------- */
    const stand = P.box(0.3, SY, 0.3, '#5B5F73', { r: 0.04 }); stand.position.set(EX, 0, EZ); S.add(stand);
    const foot = P.box(1.1, 0.06, 0.7, '#5B5F73', { r: 0.06 }); foot.position.set(EX, 0, EZ); S.add(foot);
    const frame = P.box(SW, SH, 0.08, '#2C2D31', { r: 0.04 }); frame.position.set(EX, SY, EZ); S.add(frame);
    const scr = P.box(SW - 0.12, SH - 0.32, 0.02, '#1E2233', { r: 0.02, cast: false }); scr.position.set(EX, SY + 0.06, EZ + 0.045); S.add(scr);
    const tab = S.text('', { size: 0.11, face: 'front', weight: 700, color: '#E9ECF8', font: mono, align: 'left', w: SW - 0.3, maxW: SW - 0.3 }); tab.position.set(EX, SY + SH - 0.13, EZ + 0.045); S.add(tab);
    const code = S.text('', { size: 0.12, face: 'front', weight: 500, color: '#E9ECF8', font: mono, align: 'left', w: SW - 0.3, maxW: SW - 0.3, maxH: SH - 0.45 }); code.position.set(EX, SY + 0.06 + (SH - 0.32) / 2, EZ + 0.058); S.add(code);
    const squig = P.box(0.32, 0.03, 0.01, C.red, { r: 0, cast: false }); squig.userData.noFit = true; S.add(squig);
    const frameTop = S.text('EDITOR', { size: 0.12, weight: 800, color: '#FFFFFF', maxW: 1 }); frameTop.position.set(EX, SY + SH + 0.005, EZ); S.add(frameTop);
    /* ---------- the three helpers ---------- */
    const HELP = [{ n: 'Type check', k: 'types' }, { n: 'Format', k: 'fmt' }, { n: 'Auto-save', k: 'auto' }];
    const helpers = HELP.map((h, i) => {
      const x = EX - 1.0 + i * 1.0, m = new THREE.MeshLambertMaterial({ color: '#D8D4C8' });
      const b = P.box(0.88, 0.32, 0.6, '#D8D4C8', { r: 0.08, material: m }); b.position.set(x, 0, HZ); S.add(b);
      const t = S.text(h.n.toUpperCase(), { size: 0.11, weight: 800, color: '#151827', maxW: 0.8 }); t.position.set(x, 0.325, HZ - 0.05); S.add(t);
      const f = S.text(h.n, { size: 0.1, face: 'front', weight: 750, color: '#151827', maxW: 0.8 }); f.position.set(x, 0.16, HZ + 0.305); S.add(f);
      const lm = new THREE.MeshLambertMaterial({ color: C.grey, emissive: C.grey, emissiveIntensity: 0.5 });
      const lamp = P.ball(0.06, C.grey, { material: lm }); lamp.position.set(x, 0.36, HZ + 0.18); S.add(lamp);
      return { m, lm, k: h.k };
    });
    /* ---------- the file on disk ---------- */
    const disk = P.box(1.25, 0.22, 0.9, '#5B4636', { r: 0.08 }); disk.position.set(DX, 0, DZ); S.add(disk);
    const diskT = S.text('ON DISK', { size: 0.11, weight: 800, color: '#FFFFFF', maxW: 1.1 }); diskT.position.set(DX, 0.225, DZ - 0.28); S.add(diskT);
    const diskV = S.text('', { size: 0.1, weight: 700, color: '#FFFFFF', font: mono, maxW: 1.15, maxH: 0.42 }); diskV.position.set(DX, 0.225, DZ + 0.1); S.add(diskV);
    const diskF = S.text('train.py on disk', { size: 0.09, face: 'front', weight: 750, color: '#FFFFFF', maxW: 1.15 }); diskF.position.set(DX, 0.11, DZ + 0.455); S.add(diskF);
    /* ---------- the GPU box far away ---------- */
    const box = P.box(1.25, 1.6, 1.1, '#2C2D31', { r: 0.08 }); box.position.set(GX, 0, GZ); S.add(box);
    for (let k = 0; k < 4; k++) { const s = P.box(0.95, 0.04, 0.02, '#4CC6C0', { r: 0, cast: false }); s.position.set(GX, 0.3 + k * 0.25, GZ + 0.56); S.add(s); }
    const boxT = S.text('GPU BOX', { size: 0.15, face: 'front', weight: 800, color: '#FFFFFF', maxW: 1.15 }); boxT.position.set(GX, 1.42, GZ + 0.555); S.add(boxT);
    const boxTop = S.text('JOHANNESBURG', { size: 0.12, weight: 800, color: '#FFFFFF', maxW: 1.1 }); boxTop.position.set(GX, 1.605, GZ); S.add(boxTop);
    const outT = S.text('', { size: 0.13, weight: 750, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 2.2 }); outT.position.set(GX - 0.4, 2.05, GZ); outT.userData.noFit = true; S.add(outT);
    const tun = new THREE.CatmullRomCurve3([V(EX + SW / 2, SY + SH * 0.7, EZ), V(0.6, 2.0, -0.9), V(GX - 0.62, 1.2, GZ)]);
    const tube = P.tube(tun.points, 0.035, '#8E91A3'); S.add(tube);
    const flow = P.flow(tun, 5, C.teal, { r: 0.06, speed: 0.8 }); S.add(flow.mesh);
    /* ---------- what happens ---------- */
    const lrNow = () => st.edited ? '0.001' : '0.01';
    function src(d) {
      const ep = d.bug ? '"10"' : '10';
      return d.formatted
        ? ['def train(epochs: int, lr: float):', '    for e in range(epochs):', '        loss = step(lr)', '        print(e, loss)', '', `train(epochs=${ep}, lr=${d.lr})`]
        : ['def train( epochs:int,lr :float ):', '  for e in range( epochs ) :', '        loss=step( lr )', '   print(e,loss)', '', `train(epochs = ${ep},lr= ${d.lr})`];
    }
    const editorView = () => ({ lr: lrNow(), bug: st.bug, formatted: st.formatted });
    function save() { if (st.fmt) st.formatted = true; st.saved = editorView(); }
    function edit(k) {
      if (k === 'lr') st.edited = !st.edited;
      if (k === 'bug') st.bug = !st.bug;
      st.formatted = false;
      if (st.auto) save();
    }
    function run() {
      const d = st.saved;
      st.run = { t: 0, d, where: st.remote ? 'gpu' : 'laptop', crash: d.bug };
    }
    const dirty = () => JSON.stringify(st.saved) !== JSON.stringify(editorView());
    function update(dt, t) {
      tab.userData.set(`train.py${dirty() ? '  ●  (not saved)' : ''}`);
      code.userData.set(src(editorView()).join('\n'));
      const flag = st.types && st.bug;
      squig.visible = flag;
      if (flag) squig.position.set(-1.764, 0.66, EZ + 0.07);   // under "10" on the last line
      helpers.forEach(h => { const on = st[h.k]; h.lm.color.set(on ? (h.k === 'types' && flag ? C.red : C.green) : C.grey); h.lm.emissive.copy(h.lm.color); h.m.color.set(on ? '#F1EEE6' : '#BDBAB2'); });
      diskV.userData.set(`lr=${st.saved.lr}${st.saved.bug ? '\nepochs="10"' : ''}`);
      flow.on = st.remote; flow.tick(dt); tube.visible = st.remote;
      const r = st.run;
      if (r) r.t += dt * (S.reduced ? 4 : 1);
      outT.visible = !!r;
      if (r) {
        const ep = Math.min(10, Math.floor(r.t * 3));
        outT.userData.set(r.crash && r.t > 1.2 ? 'TypeError: \'str\' object\ncannot be interpreted as an integer' : r.where === 'laptop' ? `laptop CPU: epoch ${Math.min(ep, 1)}/10 · about 9 hours` : `GPU: epoch ${ep}/10 · lr ${r.d.lr}`);
        outT.userData.style({ bg: r.crash && r.t > 1.2 ? '#FBD9D3' : '#FFFFFF' });
      }
    }
    run();
    const controls = [
      { type: 'button', label: 'Run training', short: 'Run', act: run },
      { type: 'button', label: 'Change the learning rate', short: 'Edit lr', act: () => edit('lr') },
      { type: 'button', label: 'Save', short: 'Save', act: save },
      { type: 'button', label: 'Type epochs as text, "10"', short: 'Typo', act: () => edit('bug'), quick: false },
      { type: 'toggle', label: 'Type checking', get: () => st.types, set: v => { st.types = v; } },
      { type: 'toggle', label: 'Format on save', get: () => st.fmt, set: v => { st.fmt = v; } },
      { type: 'toggle', label: 'Auto-save', get: () => st.auto, set: v => { st.auto = v; if (v) save(); } },
      { type: 'toggle', label: 'Work on the GPU box (remote)', short: 'Remote', get: () => st.remote, set: v => { st.remote = v; } },
    ];
    const readouts = [
      { label: 'Problems', get: () => { const n = st.types && st.bug ? 1 : 0; return { v: st.types ? `${n}` : 'not checked', good: st.types && !n, bad: !!n || !st.types }; } },
      { label: 'File on disk', get: () => ({ v: dirty() ? 'out of date' : 'up to date', bad: dirty(), good: !dirty() }) },
    ];
    const labels = [
      { name: 'editor', t: 'The editor', d: 'What you see and type', icon: 'code', atV: V(EX - SW / 2, SY + SH, EZ) },
      { name: 'helpers', t: 'Three helpers', d: 'Type check, format on save, auto-save', icon: 'check', atV: V(EX - 1.44, 0.32, HZ + 0.3) },
      { name: 'disk', t: 'The file on disk', d: 'What actually runs', icon: 'box', atV: V(DX + 0.62, 0.22, DZ + 0.45) },
      { name: 'remote', t: 'A GPU box far away', d: 'Same editor, through a tunnel', icon: 'link', atV: V(GX + 0.62, 1.6, GZ) },
    ];
    const reset = () => { Object.assign(st, { types: true, fmt: true, auto: true, remote: true, bug: false, formatted: true, edited: false, saved: { lr: '0.001', bug: false, formatted: true } }); st.edited = true; save(); run(); };
    const breaks = [
      { label: 'Run code you haven\'t saved', hint: 'Auto-save off, edit, run', on: () => { reset(); st.auto = false; edit('lr'); run(); }, off: reset },
      { label: 'Type checking off', hint: 'epochs="10" slips through', on: () => { reset(); st.types = false; edit('bug'); run(); }, off: reset },
      { label: 'Train on the laptop', hint: 'Not on the GPU box', on: () => { reset(); st.remote = false; run(); }, off: reset },
    ];
    function status() {
      const r = st.run;
      if (r && r.crash && !st.types) return { ok: false, msg: `<b>Crashed after it started.</b> <code>epochs="10"</code> is text, not a number, and nothing checked it. In a real run the crash comes when the loop starts, after loading the data and the model, which can be forty minutes in. A type checker underlines it before you press run.` };
      if (r && r.crash) return { ok: false, msg: `<b>The type checker saw it first.</b> The red line under <code>epochs="10"</code> said "expected int, got str" before you ran anything. Fix it, then run.` };
      if (r && JSON.stringify(r.d) !== JSON.stringify(editorView()) && !st.auto) return { ok: false, msg: `<b>You ran the old code.</b> The screen says lr=${lrNow()}, but the file on disk still says lr=${r.d.lr}, and the disk is what runs. Hours of training with the wrong setting. Turn auto-save on, or save before every run.` };
      if (r && r.where === 'laptop') return { ok: false, msg: `<b>Training on the laptop's processor:</b> about 9 hours. With the remote connection on, the same editor opens the files on the GPU box in Johannesburg and runs the same code there in about 12 minutes.` };
      if (!st.types) return { ok: false, msg: `<b>Type checking is off.</b> Mistakes such as text where a number belongs now only show up when the code runs, sometimes long after it starts.` };
      if (!st.remote) return { msg: `<b>Working on the laptop.</b> Fine for writing code; slow for training. Turn <b>Remote</b> on to open the same files on the GPU box.` };
      if (!st.fmt) return { msg: `<b>Format on save is off.</b> Files keep whatever spacing you typed, and every review starts with tidying.` };
      if (st.types && st.bug) return { ok: false, msg: `<b>Red underline:</b> epochs should be a number. The type checker caught it while you typed.` };
      if (dirty()) return { msg: `<b>Unsaved changes.</b> The dot on the tab means the screen and the disk disagree. <b>Save</b> before you run.` };
      return { ok: true, msg: `<b>All three helpers on.</b> No problems found, the file on disk matches the screen, and training runs on the GPU box with lr=${st.saved.lr}.` };
    }
    reset();
    return { update, controls, readouts, labels, breaks, status, reset, run, edit, save, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'More than typing', home: true, say: 'A good editor is more than a place to type. Three helpers sit under this one, and a tunnel reaches a GPU machine far away.', act: m => m.reset() },
    { t: 'Mistakes before you run', focus: [-1.6, 1.0, -0.4], zoom: 1.4, say: 'The type checker reads your code as you write. Type the number of epochs as text, and it is underlined in red before you run anything.', act: m => m.edit('bug') },
    { t: 'Tidy on save', focus: [-1.6, 0.6, 0.3], zoom: 1.4, say: 'The formatter tidies every file the moment you save, so spacing never comes up in a review again.', act: m => { m.edit('bug'); m.save(); } },
    { t: 'The disk is what runs', focus: [0.3, 0.4, 0.5], zoom: 1.4, say: 'Code runs from the file on disk, not from the screen. Auto-save keeps the two the same, so you never train with yesterday\'s setting.', act: m => { m.edit('lr'); m.edit('lr'); } },
    { t: 'A GPU box far away', focus: [2.2, 1.0, -0.6], zoom: 1.35, say: 'With a remote connection, the same editor opens the files on a GPU machine in a data centre in Johannesburg, and runs them there.', act: m => m.run() },
    { t: 'Set it up once', home: true, say: 'Type checking, format on save, auto-save and a remote connection. Set them up once, and they save you hours every week.', act: m => m.run(), wait: 4 },
  ],
  check: [
    { q: 'What does a type checker do?', options: ['Formats your code', 'Spots mistakes such as text where a number belongs, before you run', 'Makes training faster'], answer: 1, why: 'It reads the code and its type hints as you type and underlines what can\'t work.' },
    { q: 'You changed the learning rate on screen but didn\'t save, then ran training. Which value was used?', options: ['The old value in the file on disk', 'The new value on screen', 'Neither'], answer: 0, why: 'Programs run the file on disk. Auto-save keeps the disk and the screen the same.' },
    { q: 'Why connect the editor to a remote GPU machine?', options: ['To change its colours', 'To edit and run code there as if it were on your desk', 'Because laptops cannot run Python'], answer: 1, why: 'Remote SSH lets you work on the GPU box\'s files directly, with all your helpers.' },
  ],
  terms: [
    ['Type hint', 'A note in the code saying what kind of value goes where, such as epochs: int.'],
    ['Type checker', 'A helper that reads the hints and underlines code that can\'t work.'],
    ['Formatter', 'A tool that rewrites code into one consistent style, usually on save.'],
    ['Linter', 'A tool that flags likely bugs and bad habits: unused variables, shadowed names.'],
    ['Remote SSH', 'A secure connection that lets your editor open and run files on another machine.'],
  ],
  deeper: '<p><b>Settings worth having.</b> Type checking on "basic" catches wrong argument types without drowning you in warnings. Rulers at 88 and 120 columns show when a line is getting long. Scrolling output in notebooks stops a training loop from flooding the page.</p><p><b>Editors with AI built in</b> suggest whole lines and explain code. They are helpers too, but read what they write: the type checker still matters.</p><p><b>Terminal editors</b> such as Neovim are fast and work over any connection; with a language server they get the same type checking and formatting.</p>',
  code: {
    title: 'Editor settings for AI work',
    note: 'The settings the course recommends, as a settings file most editors understand.',
    text: `
{
  "python.analysis.typeCheckingMode": "basic",
  "editor.formatOnSave": true,
  "editor.rulers": [88, 120],
  "files.autoSave": "afterDelay",
  "notebook.output.scrolling": true,
  "[python]": {
    "editor.defaultFormatter": "black",
    "editor.codeActionsOnSave": { "source.organizeImports": "explicit" }
  }
}

# then, to work on a GPU box:
#   Remote-SSH: Connect to Host...  user@gpu-box.example.com
`,
  },
};
