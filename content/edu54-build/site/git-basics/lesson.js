// Git: files move from the working folder to the staging tray, get sealed into commits on a history rail,
// branch off for experiments, merge back, and get pushed to a shared copy on the shelf above.
// Break it: commit the 2 GB model file, experiment straight on main, force-push over a teammate's work.
const HASH = ['3f9a', 'b71c', 'e24d', '9c05', '71ab', 'd3e8', '05fc', 'a6b2', 'c9d1', '4e7f', '8b30', 'f15d', '2ac6', '6d94'];
const FILES = [{ n: 'train.py' }, { n: 'data.csv' }, { n: 'model.pt', big: true }];
const DESK_X = -2.75, TRAY_X = -1.38, X0 = -0.2, STEP = 0.72, SLOTS = 5;
const LANE = { main: 0.55, exp: -0.6 }, FZ = [-0.62, 0.02, 0.66];
const SHELF_Y = 1.15, SHELF_Z = -1.95;

export default {
  slug: 'git-basics',
  title: 'Git: save every version',
  description: 'Watch your changes travel from the working folder to the staging tray, get sealed into commits, branch off for an experiment and merge back. Then commit a 2 GB model file and force-push over a teammate.',
  overview: 'Git keeps every saved version of a project. You change files in your working folder, choose which changes go in the next snapshot (git add), seal them with a message (git commit), try risky ideas on a branch, and send your history to a shared copy so the team can pull it (git push). Model files are huge, so they stay out of git: you list them in .gitignore.',
  keywords: ['git explained', 'git add commit push', 'git branch merge', 'gitignore model files', 'git for ai projects'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.55, -0.35], dir: [0.3, 1.0, 1.35], half: 3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = {};
    /* ---------- the places ---------- */
    const desk = P.box(1.4, 0.5, 2.2, '#A87A4F', { r: 0.1 }); desk.position.set(DESK_X, 0, 0); S.add(desk);
    const deskF = S.text('WORKING FOLDER', { size: 0.13, face: 'front', weight: 800, color: '#FFFFFF', maxW: 1.3 }); deskF.position.set(DESK_X, 0.25, 1.105); S.add(deskF);
    const tray = P.box(1.25, 0.22, 2.2, '#E8D9B5', { r: 0.1 }); tray.position.set(TRAY_X, 0, 0); S.add(tray);
    const trayF = S.text('STAGING', { size: 0.12, face: 'front', weight: 800, color: '#151827', maxW: 1.4 }); trayF.position.set(TRAY_X, 0.11, 1.105); S.add(trayF);
    const rail = P.box(3.8, 0.12, 2.3, '#F1EEE6', { r: 0.12 }); rail.position.set(1.33, 0, -0.02); S.add(rail);
    const railF = S.text('HISTORY (YOUR COMPUTER)', { size: 0.12, face: 'front', weight: 800, color: '#151827', maxW: 3.6 }); railF.position.set(1.33, 0.06, 1.135); S.add(railF);
    for (const [k, z] of Object.entries(LANE)) {
      const line = P.box(3.5, 0.02, 0.06, k === 'main' ? '#E3A72F' : '#1C9A94', { r: 0 }); line.position.set(1.4, 0.12, z); S.add(line);
      const t = S.text(k === 'main' ? 'main' : 'experiment', { size: 0.12, weight: 800, color: k === 'main' ? '#9A6A10' : '#127570', maxW: 1.1 }); t.position.set(2.55, 0.14, z + 0.4); t.userData.noFit = true; S.add(t);
    }
    // the shared copy (the remote) on a shelf above the history
    const shelf = P.box(3.8, 0.1, 0.8, '#5B4636', { r: 0.06 }); shelf.position.set(1.33, SHELF_Y - 0.1, SHELF_Z); S.add(shelf);
    for (const x of [-0.45, 3.1]) { const post = P.box(0.12, SHELF_Y - 0.1, 0.12, '#5B4636', { r: 0.02 }); post.position.set(x, 0, SHELF_Z); S.add(post); }
    const shelfF = S.text('SHARED COPY (REMOTE)', { size: 0.1, face: 'front', weight: 800, color: '#FFFFFF', maxW: 3 }); shelfF.position.set(1.33, SHELF_Y - 0.05, SHELF_Z + 0.405); S.add(shelfF);
    const lamp = P.ball(0.1, C.green); lamp.material = new THREE.MeshLambertMaterial({ color: C.green, emissive: C.green, emissiveIntensity: 0.4 }); lamp.position.set(3.08, 0.22, LANE.main); S.add(lamp);
    /* ---------- files ---------- */
    const files = FILES.map((f, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#F7F5EE' });
      const tl = P.tile(f.n, 1.15, 0.08, 0.46, '#F7F5EE', { size: 0.17, font: '"JetBrains Mono", monospace' }); tl.userData.body.material = m; tl.userData.label.position.z = -0.06; tl.userData.noFit = true; S.add(tl);
      const tag = S.text('', { size: 0.1, weight: 750, color: '#151827', maxW: 1.2 }); tag.position.set(0, 0.09, 0.17); tl.add(tag);
      return { ...f, tl, m, tag, state: 'clean', pos: V(DESK_X, 0.5, FZ[i]) };
    });
    /* ---------- commits ---------- */
    const commits = [], remote = [], rods = new THREE.Group(); S.add(rods);
    let slot = 0, hashN = 0;
    function mkBlock(c, col) {
      const g = new THREE.Group(); g.userData.noFit = true; S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: col });
      const b = P.box(0.6, c.big ? 0.66 : 0.34, 0.56, col, { r: 0.06, material: m }); g.add(b);
      const top = c.big ? 0.66 : 0.34;
      const h = S.text(c.hash, { size: 0.15, weight: 800, color: '#151827', font: '"JetBrains Mono", monospace', maxW: 0.56 }); h.position.set(0, top + 0.01, -0.1); g.add(h);
      const hf = S.text(c.hash, { size: 0.13, face: 'front', weight: 800, color: '#151827', font: '"JetBrains Mono", monospace', maxW: 0.56, maxH: top * 0.8 }); hf.position.set(0, top / 2, 0.285); g.add(hf);
      const msg = S.text(c.msg.replace(' ', '\n'), { size: 0.1, weight: 650, color: '#151827', maxW: 0.56, maxH: 0.24 }); msg.position.set(0, top + 0.01, 0.13); g.add(msg);
      g.scale.setScalar(0.01);
      return { g, m };
    }
    const colOf = c => c.mine === false ? C.coral : c.big ? C.red : c.bad ? '#E9A99E' : c.lane === 'main' ? '#F2C94C' : '#7FD1CB';
    function addCommit(lane, msg, o = {}) {
      const c = { lane, msg, hash: HASH[hashN++ % HASH.length], t: slot++, parents: o.parents || [], big: !!o.big, bad: !!o.bad, mine: o.mine };
      if (!o.parents) { const prev = [...commits].reverse().find(x => x.lane === lane) || (lane === 'exp' ? st.branchFrom : null); if (prev) c.parents = [prev]; }
      Object.assign(c, mkBlock(c, colOf(c)));
      commits.push(c); drawRods(); return c;
    }
    const tmin = () => Math.max(0, slot - SLOTS);
    const xOf = t => X0 + (t - tmin()) * STEP;
    function drawRods() {
      for (const r of [...rods.children]) { rods.remove(r); r.geometry.dispose(); }
      for (const c of commits) for (const p of c.parents) {
        if (p.t < tmin() - 1) continue;
        const a = V(Math.max(X0 - 0.3, xOf(p.t)), 0.27, LANE[p.lane]), b = V(xOf(c.t), 0.27, LANE[c.lane]);
        const r = P.rod(a, b, 0.035, '#8E91A3'); r.userData.noFit = true; rods.add(r);
      }
    }
    function pushCopy(c, mine = true) {
      const m = mkBlock({ ...c, big: false }, mine ? '#F2C94C' : C.coral);
      remote.push({ c, ...m, mine, gone: false, from: V(xOf(c.t), 0.12, LANE[c.lane]) });
    }
    /* ---------- state ---------- */
    function reset() {
      for (const c of commits) S.root.remove(c.g); for (const r of remote) S.root.remove(r.g);
      commits.length = 0; remote.length = 0; slot = 0; hashN = 0;
      Object.assign(st, { head: 'main', ignore: true, branchFrom: null, msg: '', refused: false, forced: false, failBig: false, merged: false, teammate: null });
      files.forEach(f => { f.state = 'clean'; });
      const a = addCommit('main', 'start project'), b = addCommit('main', 'load data');
      for (const c of [a, b]) { pushCopy(c); const r = remote[remote.length - 1]; r.from = null; }
      drawRods();
    }
    const staged = () => files.filter(f => f.state === 'staged');
    const lastOn = lane => [...commits].reverse().find(c => c.lane === lane);
    function edit() { st.msg = ''; for (const f of files) if (f.n !== 'data.csv') f.state = f.state === 'staged' ? 'staged' : 'mod'; }
    function add() { st.msg = ''; for (const f of files) if (f.state === 'mod') { if (f.big && st.ignore) f.state = 'ignored'; else f.state = 'staged'; } }
    function commit(msg) {
      const sf = staged();
      if (!sf.length) { st.msg = 'nothing'; return null; }
      const big = sf.some(f => f.big);
      const c = addCommit(st.head, msg || (big ? 'add model.pt' : st.head === 'exp' ? 'bigger learning rate' : 'tune training'), { big, bad: st.badNext });
      st.badNext = false;
      sf.forEach(f => { f.state = 'clean'; f.fly = c; f.flyT = 0; });
      files.forEach(f => { if (f.state === 'ignored') f.state = 'clean'; });
      return c;
    }
    function branch(lane) { if (lane === 'exp' && st.head !== 'exp') st.branchFrom = lastOn('main'); st.head = lane; }
    function merge() {
      const e = lastOn('exp'); if (!e || st.merged) { st.msg = 'nomerge'; return; }
      const m = lastOn('main'); addCommit('main', 'merge experiment', { parents: [m, e] }); st.head = 'main'; st.merged = true;
    }
    const pushedSet = () => new Set(remote.filter(r => !r.gone).map(r => r.c));
    function push(force) {
      st.refused = false; st.failBig = false;
      const mainC = commits.filter(c => c.lane === 'main');
      if (mainC.some(c => c.big)) { st.failBig = true; return; }
      const theirs = remote.filter(r => !r.mine && !r.gone);
      if (theirs.length && !force) { st.refused = true; return; }
      if (force) { theirs.forEach(r => { r.gone = true; }); st.forced = theirs.length > 0; }
      const have = pushedSet();
      for (const c of mainC) if (!have.has(c)) pushCopy(c);
    }
    function pull() {
      const theirs = remote.filter(r => !r.mine && !r.gone);
      for (const r of theirs) { const c = addCommit('main', r.c.msg, { mine: false }); r.mine = true; r.c = c; r.m.color.set('#F2C94C'); }
      st.refused = false; if (theirs.length) st.msg = 'pulled';
    }
    function teammate() {
      // a teammate pushed a fix you don't have yet
      const fake = { lane: 'main', msg: 'Wanjiru: fix path', hash: '7e21', t: slot++, big: false };
      fake.parents = []; const m = mkBlock(fake, C.coral);
      remote.push({ c: fake, ...m, mine: false, gone: false, from: null });
      st.teammate = fake;
    }
    reset();
    /* ---------- every frame: things glide to where they belong ---------- */
    const tmp = V();
    function update(dt, t) {
      const k = 1 - Math.exp(-dt * (S.reduced ? 30 : 6));
      files.forEach((f, i) => {
        const goal = f.state === 'staged' ? V(TRAY_X, 0.22, FZ[i]) : V(DESK_X, 0.5, FZ[i]);
        if (f.fly) { f.flyT += dt * (S.reduced ? 5 : 1.6); const c = f.fly, to = V(xOf(c.t), 0.4, LANE[c.lane]); tmp.copy(V(TRAY_X, 0.22, FZ[i])).lerp(to, Math.min(1, f.flyT)); tmp.y += Math.sin(Math.min(1, f.flyT) * Math.PI) * 0.7; f.tl.position.copy(tmp); f.tl.scale.setScalar(Math.max(0.05, 1 - f.flyT * 0.8)); if (f.flyT >= 1) { f.fly = null; f.tl.position.copy(goal); f.tl.scale.setScalar(1); } }
        else { f.tl.position.lerp(goal, k); f.tl.scale.setScalar(1); }
        f.m.color.set(f.state === 'mod' ? '#F6C59A' : f.state === 'staged' ? '#BDE3C8' : f.state === 'ignored' ? '#D5D3CC' : '#F7F5EE');
        const tg = f.state === 'mod' ? 'changed' : f.state === 'staged' ? 'staged' : f.state === 'ignored' ? 'ignored (.gitignore)' : f.big ? '2 GB' : '';
        f.tag.visible = !!tg; if (tg) f.tag.userData.set(tg);
      });
      for (const c of commits) {
        const vis = c.t >= tmin(); c.g.visible = vis;
        c.g.position.lerp(V(xOf(c.t), 0.12, LANE[c.lane]), c.g.scale.x < 0.05 ? 1 : k);
        c.g.scale.setScalar(Math.min(1, c.g.scale.x + dt * 3));
        c.m.color.set(colOf(c));
      }
      for (const r of remote) {
        const goal = V(xOf(r.c.t), SHELF_Y, SHELF_Z);
        if (r.from) { r.g.position.copy(r.from); r.from = null; }
        r.g.position.lerp(goal, k);
        const s = r.gone ? Math.max(0.01, r.g.scale.x - dt * 1.5) : Math.min(1, r.g.scale.x + dt * 3);
        r.g.scale.setScalar(s); r.g.visible = s > 0.02 && r.c.t >= tmin();
      }
      const mainBad = commits.some(c => c.lane === 'main' && c.bad);
      lamp.material.color.set(mainBad ? C.red : C.green); lamp.material.emissive.copy(lamp.material.color);
      lamp.position.y = 0.22 + Math.sin(t * 3) * 0.02;
    }
    /* ---------- the panel ---------- */
    const ahead = () => commits.filter(c => c.lane === 'main' && !pushedSet().has(c)).length;
    // every action starts with a clean message
    const A = f => (...a) => { st.msg = ''; return f(...a); };
    const controls = [
      { type: 'button', label: 'Edit and train', short: 'Edit', act: A(edit), hint: 'Changes train.py, and training rewrites model.pt' },
      { type: 'button', label: 'git add (stage the changes)', short: 'Add', act: A(add) },
      { type: 'button', label: 'git commit', short: 'Commit', act: A(() => commit()) },
      { type: 'button', label: 'git push', short: 'Push', act: A(() => push(false)) },
      { type: 'buttons', label: 'Branch', options: ['main', 'experiment'], get: () => st.head === 'main' ? 0 : 1, act: A(i => branch(i ? 'exp' : 'main')) },
      { type: 'button', label: 'Merge the experiment into main', short: 'Merge', act: A(merge), quick: false },
      { type: 'button', label: 'A teammate pushes a fix', short: 'Teammate', act: A(() => { if (!st.teammate) teammate(); }), quick: false },
      { type: 'button', label: 'git pull', short: 'Pull', act: A(pull), quick: false },
      { type: 'toggle', label: 'Big files in .gitignore', get: () => st.ignore, set: A(v => { st.ignore = v; }) },
    ];
    const readouts = [
      { label: 'Branch', get: () => ({ v: st.head === 'main' ? 'main' : 'experiment' }) },
      { label: 'Not pushed', get: () => { const a = ahead(); return { v: st.failBig ? 'too big' : st.refused ? 'refused' : `${a} commit${a === 1 ? '' : 's'}`, bad: st.failBig || st.refused, good: !a && !st.forced }; } },
    ];
    const labels = [
      { name: 'folder', t: 'Working folder', d: 'Where you edit. Git notices what changed', icon: 'box', atV: V(DESK_X - 0.7, 0.5, -0.9) },
      { name: 'staging', t: 'Staging tray', d: 'git add: what goes in the next snapshot', icon: 'check', atV: V(TRAY_X, 0.22, 1.1) },
      { name: 'history', t: 'History', d: 'git commit seals a snapshot with an id', icon: 'link', atV: V(3.23, 0.12, 0.6) },
      { name: 'remote', t: 'The shared copy', d: 'git push sends it; teammates pull it', icon: 'spark', atV: V(3.23, SHELF_Y, SHELF_Z) },
    ];
    const breaks = [
      { label: 'Commit the 2 GB model file', hint: 'No .gitignore', on: () => { reset(); st.ignore = false; edit(); add(); commit(); push(false); }, off: reset },
      { label: 'Experiment straight on main', hint: 'No branch', on: () => { reset(); edit(); add(); st.badNext = true; commit('bigger learning rate'); }, off: reset },
      { label: 'Force-push over a teammate', hint: 'git push --force', on: () => { reset(); teammate(); edit(); add(); commit(); push(true); }, off: reset },
    ];
    function status() {
      if (st.failBig) return { ok: false, msg: `<b>Push refused: model.pt is 2 GB.</b> Shared git hosts turn away files over about 100 MB, and every clone would download it forever, even after you delete it. List model files in <code>.gitignore</code> and keep them in storage made for big files.` };
      if (commits.some(c => c.lane === 'main' && c.bad)) return { ok: false, msg: `<b>Main is broken.</b> The risky change went straight onto main, so main no longer trains and every teammate who pulls gets the breakage. Make a branch for experiments; merge only what works.` };
      if (st.forced) return { ok: false, msg: `<b>Wanjiru's fix is gone.</b> A force-push makes the shared copy match yours exactly, so her commit, which you never pulled, was deleted. Pull first, then push: git refuses a normal push for exactly this reason.` };
      if (st.refused) return { ok: false, msg: `<b>Push refused.</b> The shared copy has a commit you don't have (Wanjiru's fix). Press <b>Pull</b> to bring it in, then push again.` };
      if (st.msg === 'nothing') return { msg: `<b>Nothing to commit.</b> The tray is empty. Edit something, then <b>Add</b> it to the tray first.` };
      if (st.msg === 'pulled') return { ok: true, msg: `<b>Pulled.</b> Wanjiru's fix is now in your history (the coral commit), so a normal push will go through.` };
      if (st.msg === 'nomerge') return { msg: `<b>Nothing to merge.</b> Switch to the experiment branch and commit something there first.` };
      const mod = files.filter(f => f.state === 'mod').length, stg = staged().length, a = ahead();
      if (mod) return { msg: `<b>${mod} file${mod > 1 ? 's' : ''} changed</b> in the working folder. <b>Add</b> puts them on the staging tray.${!st.ignore ? ' Careful: model.pt is not ignored.' : ''}` };
      if (stg) return { msg: `<b>${stg} file${stg > 1 ? 's' : ''} on the tray.</b> <b>Commit</b> seals them into one snapshot with a message.${files.some(f => f.state === 'ignored') ? '' : ''}` };
      if (remote.some(r => !r.mine && !r.gone)) return { msg: `<b>The shared copy is ahead.</b> Wanjiru pushed a fix you don't have yet. <b>Pull</b> brings it into your history; then you can push.` };
      if (!st.ignore) return { ok: false, msg: `<b>model.pt is no longer ignored.</b> The next add would put all 2 GB of it on the tray, and from there into the history for good.` };
      if (st.head === 'exp') return { msg: `<b>On the experiment branch.</b> Commits here leave main untouched. <b>Merge</b> brings them back when they work.` };
      if (a) return { msg: `<b>${a} commit${a > 1 ? 's' : ''} only on your computer.</b> <b>Push</b> sends them to the shared copy.` };
      return { ok: true, msg: `<b>In sync.</b> Your history and the shared copy match: ${commits.length} commits, newest <code>${commits[commits.length - 1].hash}</code>.` };
    }
    return {
      update, controls, readouts, labels, breaks, status, reset,
      edit, add, commit: m => commit(m), push: () => push(false), branch, merge,
    };
  },

  story: [
    { t: 'Every version, kept', home: true, say: 'Git keeps every saved version of a project. There are three places on your computer, and one shared copy for the whole team.', act: m => m.reset() },
    { t: 'The working folder', focus: 'folder', zoom: 1.5, say: 'You edit files in the working folder. Git notices which ones changed. Training also rewrites the model file, which is huge.', act: m => m.edit() },
    { t: 'The staging tray', focus: 'staging', zoom: 1.5, say: 'git add puts changes on the staging tray. You choose what goes into the next snapshot. The model file is listed in gitignore, so git leaves it out.', act: m => m.add() },
    { t: 'A commit', focus: [1.3, 0.3, 0.2], zoom: 1.4, say: 'git commit seals the tray into a snapshot, with a message and a short id. History only grows, so you can always go back.', act: m => m.commit() },
    { t: 'Branch, then merge', focus: [1.4, 0.3, 0], zoom: 1.35, say: 'Risky ideas go on a branch. Main keeps working while you experiment. When the experiment works, you merge it back into main.', act: m => { m.branch('exp'); m.edit(); m.add(); m.commit(); m.merge(); }, wait: 6 },
    { t: 'Push to the team', home: true, say: 'git push sends your history to the shared copy. A teammate in Nairobi, Lagos or Cairo pulls it and gets exactly what you have.', act: m => m.push(), wait: 5 },
  ],
  check: [
    { q: 'What does git add do?', options: ['Sends your work to the team', 'Puts changes on the staging tray for the next commit', 'Deletes old versions'], answer: 1, why: 'Add chooses what goes into the next snapshot. Commit seals it; push shares it.' },
    { q: 'Why list model files in .gitignore?', options: ['They are too big for git: every clone would download them forever', 'Git cannot read binary files at all', 'It makes training faster'], answer: 0, why: 'Model files run to gigabytes. Shared hosts refuse them, and once committed they stay in the history.' },
    { q: 'Your push is refused because the shared copy has a commit you don\'t. What do you do?', options: ['Force-push', 'Delete the shared copy', 'Pull first, then push'], answer: 2, why: 'Pull brings in your teammate\'s work. A force-push would delete it.' },
  ],
  terms: [
    ['Repository', 'A project folder plus its whole history of saved versions.'],
    ['Commit', 'A sealed snapshot of the staged changes, with a message and a short id.'],
    ['Staging area', 'The tray where you collect changes for the next commit (git add).'],
    ['Branch', 'A separate line of commits for an experiment, so main keeps working.'],
    ['Remote', 'The shared copy of the repository that the team pushes to and pulls from.'],
    ['.gitignore', 'A list of files git should never track, such as model checkpoints and secrets.'],
  ],
  deeper: '<p><b>What a commit really is.</b> Git stores a snapshot of every tracked file and names it by a hash of its contents, so the id changes if anything inside changes. Each commit points to its parent; a merge commit has two parents. That chain is the history rail.</p><p><b>Big files.</b> Datasets and checkpoints go to storage built for them, and the repository keeps only a small pointer or a download script. Then a fresh clone stays fast.</p><p><b>Pull requests.</b> On a team, a branch usually goes up for review before it is merged into main, so a second pair of eyes sees every change.</p>',
  code: {
    title: 'The daily git workflow',
    note: 'The commands from the lesson, in order. Lines starting with <code>#</code> are comments.',
    text: `
# once per computer: who you are
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# keep model files and secrets out of git
echo "*.pt" >> .gitignore
echo ".env" >> .gitignore

# the daily loop
git status                  # what changed?
git add train.py            # put it on the tray
git commit -m "tune training"
git push                    # share it

# experiments live on a branch
git checkout -b experiment
git commit -am "bigger learning rate"
git checkout main
git merge experiment

# someone else pushed first? bring their work in
git pull
git push
`,
  },
};
