// Scope contracts: one task, "parents can sign up with a phone number", on a Kigali school-communications app. The contract lists allowed and
// forbidden globs, acceptance commands and a rollback plan; a scope checker matches the agent's final diff against them (real glob matching:
// ** any depth, * within a name). Between sessions a refactor moved signup.py into app/auth/. A feature list bounds the project: one feature per session.
const DIFF = ['app/auth/signup.py', 'app/auth/phone.py', 'tests/test_signup_phone.py', 'app/db/migrations/0042_drop_email.py', 'app/settings/theme.py'];
const C = { allowed: ['app/auth/**/*.py', 'tests/test_signup*.py'], forbidden: ['app/db/migrations/**', 'scripts/release.sh'], raw: ['app/signup.py', 'app/phone.py', 'tests/test_signup_phone.py'] };
const FEATURES = [['phone-signup', 'in_progress', 'parents sign up with a phone number'], ['dark-mode', 'todo', 'a dark theme for the app'], ['sms-reminders', 'todo', 'SMS reminders for fees']];
function glob(g) { return new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '\u0001').replace(/\*\*/g, '\u0002').replace(/\*/g, '[^/]*').replace(/\u0001/g, '(?:.*/)?').replace(/\u0002/g, '.*') + '$'); }
const hit = (f, gs) => gs.some(g => glob(g).test(f));
function check(o) {
  return DIFF.map(f => {
    const feature = f.startsWith('app/settings/') ? 'dark-mode' : 'phone-signup';
    let verdict = 'in scope', why = '';
    const allowed = o.globs ? hit(f, o.broad ? ['app/**', 'tests/test_signup*.py'] : C.allowed) : C.raw.includes(f);
    if (o.forbidden && hit(f, C.forbidden)) { verdict = 'forbidden'; why = 'matches app/db/migrations/**'; }
    else if (o.features && feature !== 'phone-signup') { verdict = 'second feature'; why = 'dark-mode is not the active feature'; }
    else if (!allowed) { verdict = 'out of scope'; why = o.globs ? 'matches no allowed glob' : 'not in the raw path list'; }
    const truth = f.includes('migrations') ? 'bad' : f.startsWith('app/settings') ? 'bad' : 'ok';
    return { f, verdict, why, truth };
  });
}

export default {
  slug: 'scope-contracts',
  title: 'Scope contracts: where the work begins and ends',
  description: 'A Kigali school app\'s agent adds phone sign-up under a scope contract: allowed files, forbidden files and one feature at a time. Check its final diff.',
  overview: 'A model doesn\'t know where the work ends. A scope contract is a per-task file that says so: the task ID and a one-sentence goal a reviewer can check, the files the agent may write as globs, the files it must never touch even by accident, acceptance criteria as commands or assertions, a rollback plan an operator can carry out, and the actions outside scope that need a person\'s approval. The forbidden list is half the contract: an allowed glob such as app/** quietly includes the database migrations. Use globs, not raw paths, because files move: a refactor between sessions that puts signup.py under app/auth/ breaks a raw-path contract, flagging the right edits and missing the wrong ones. Writing the rollback plan forces the author to think about what could go wrong; a contract you can\'t roll back from shouldn\'t be approved. Checking scope is a diff check: the checker reads the diff against the allowed and forbidden globs and the acceptance commands that ran, and each violation is a finding the verification gate can refuse. The contract bounds one task, not the project: a feature list in the repo, read at session start, lets the agent pick exactly one feature whose status is todo, and starting a second one in the same session is a violation the gate enforces, not a line in a prompt to rationalise past.',
  keywords: ['scope contract', 'coding agents', 'globs', 'feature list', 'AI agents', 'guardrails', 'software engineering'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.45, 0.25, 0], dir: [0.05, 1.0, 1.15], half: 1.3, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { globs: true, forbidden: true, features: true, broad: false }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', SAF = '#E3A72F';
    /* the repo as ground: auth and tests (blue), the migrations (red when forbidden), settings (grey). The fence is what the contract allows.
       Each file in the final diff is a parcel where it lives, with a lamp: green allowed and right, gold flagged and right, red the checker got it wrong */
    const zone = (x0, x1, z0, z1, c) => { const b = P.box(x1 - x0, 0.03, z1 - z0, c, { r: 0.03 }); b.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); S.add(b); return b; };
    zone(-2.5, -0.65, -0.75, 0.6, '#D6E4F0'); const migM = new THREE.MeshLambertMaterial({ color: '#E9A99C' }), mig = P.box(1.15, 0.03, 1.35, '#fff', { r: 0.03, material: migM }); mig.position.set(0.175, 0, -0.075); S.add(mig); zone(1.0, 1.95, -0.75, 0.6, '#E2DED4');
    const POS = [[-2.05, -0.35], [-1.15, -0.35], [-1.6, 0.25], [0.15, -0.1], [1.55, -0.1]];
    const files = DIFF.map((f, i) => { const b = P.box(0.32, 0.26, 0.32, '#F4F1EA', { r: 0.04 }); b.position.set(POS[i][0], 0.03, POS[i][1]); S.add(b); const l = P.lamp(GOOD, { h: 0.4, r: 0.08 }); l.position.set(POS[i][0] + 0.3, 0.03, POS[i][1]); S.add(l); return l; });
    const fm = new THREE.MeshLambertMaterial({ color: GOOD }), fence = [0, 1, 2, 3].map(() => { const w = P.box(1, 0.22, 1, '#fff', { r: 0.01, material: fm }); S.add(w); return w; });
    const setFence = (x0, x1, z0, z1) => { const t = 0.05; [[x0, x1, z0, z0 + t], [x0, x1, z1 - t, z1], [x0, x0 + t, z0, z1], [x1 - t, x1, z0, z1]].forEach(([a, b, c, d], i) => { const w = fence[i]; w.scale.set(b - a, 1, d - c); w.position.set((a + b) / 2, 0.03, (c + d) / 2); }); };
    /* the feature list: one active feature (blue), the rest wait their turn; and the verdict for the verification gate */
    const shelf = P.shelf(3, { cell: 0.32, lh: 0.32, d: 0.32 }); shelf.position.set(2.65, 0, -0.1); S.add(shelf);
    const verdict = P.lamp(SAF, { h: 0.55, r: 0.14 }); verdict.position.set(3.35, 0, -0.1); S.add(verdict);
    S.add(P.keep(-2.6, 3.5, 1.0, -0.85, 0.7));

    let R = null;
    function draw() {
      R = check(st);
      if (!st.globs) setFence(-1.95, -1.25, -0.05, 0.55); else if (st.broad) setFence(-2.55, 2.0, -0.8, 0.65); else setFence(-2.55, -0.6, -0.8, 0.65);
      R.forEach((r, i) => { const flagged = r.verdict !== 'in scope', right = (flagged && r.truth === 'bad') || (!flagged && r.truth === 'ok'); files[i].userData.set({ color: !right ? RED : flagged ? SAF : GOOD, on: true }); });
      shelf.visible = st.features; shelf.userData.set({ fill: ['#5B8DB8', '#C9C4B6', '#C9C4B6'] });
      const missed = R.filter(r => r.truth === 'bad' && r.verdict === 'in scope').length, wrong = R.filter(r => r.truth === 'ok' && r.verdict !== 'in scope').length;
      verdict.userData.set({ color: missed || wrong ? RED : SAF, on: true });
      migM.color.set(st.forbidden ? '#E9A99C' : '#E2DED4');
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Allowed files as globs (not raw paths)', short: 'Globs', get: () => st.globs, set: v => set({ globs: !!v }) },
      { type: 'toggle', label: 'Forbidden list in the contract', short: 'Forbidden', get: () => st.forbidden, set: v => set({ forbidden: !!v }) },
      { type: 'toggle', label: 'Feature list: one feature per session', short: 'Feature list', get: () => st.features, set: v => set({ features: !!v }) },
      { type: 'toggle', label: 'Allow all of app/** (too broad)', short: 'Broad glob', get: () => st.broad, set: v => set({ broad: !!v }), quick: false },
    ];
    const missed = () => R.filter(r => r.truth === 'bad' && r.verdict === 'in scope').length, wrong = () => R.filter(r => r.truth === 'ok' && r.verdict !== 'in scope').length;
    const readouts = [
      { label: 'Bad changes caught', get: () => ({ v: `${2 - missed()} of 2`, sub: 'migration, dark mode', good: !missed(), bad: missed() > 0 }) },
      { label: 'Good files flagged', get: () => ({ v: String(wrong()), sub: 'false alarms', good: !wrong(), bad: wrong() > 0 }) },
      { label: 'Diff', get: () => ({ v: `${DIFF.length} files`, sub: 'checked against the contract' }) },
    ];
    const labels = [
      { name: 'fence', t: 'Allowed by the contract', d: 'Auth code and its tests', icon: 'box', atV: V(-2.55, 0.2, 0.07) },
      { name: 'files', t: 'The final diff', d: 'Lamp gold: flagged. Red: checker wrong', icon: 'code', atV: V(0.15, 0.2, 0.07) },
      { name: 'feat', t: 'Feature list', d: 'One active feature per session', icon: 'check', atV: V(2.65, 0.3, 0.06), hide: () => !st.features },
      { name: 'verdict', t: 'The verdict', d: 'Gold: blocked with findings to fix', icon: 'target', atV: V(3.35, 0.3, 0.06) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Leave out the forbidden list', hint: 'and allow app/**', on: () => set({ ...D0, forbidden: false, broad: true }), off: reset },
      { label: 'Pin the contract to raw paths', hint: 'files moved in a refactor', on: () => set({ ...D0, globs: false, forbidden: false }), off: reset },
      { label: 'Let the agent start a second feature', hint: 'no feature list', on: () => set({ ...D0, features: false, broad: true }), off: reset },
    ];
    function status() {
      const m = missed(), w = wrong();
      if (!st.forbidden && st.broad && m) return { ok: false, msg: `<b>With app/** allowed and no forbidden list, the migration that drops the email column passes the scope check${st.features ? '' : ', and so does the dark theme'}.</b> The negative space is half the contract: name app/db/migrations/** as forbidden, and keep allowed globs as narrow as the task.` };
      if (!st.globs) return { ok: false, msg: `<b>Pinned to raw paths, the contract still lists app/signup.py; after the refactor the real edits in app/auth/ are flagged (${w} false alarms)${m ? `, and with no forbidden list the migration passes` : ''}.</b> Files move between sessions. Write the contract in globs (app/auth/**/*.py) so it survives a refactor.` };
      if (!st.features && m) return { ok: false, msg: '<b>Nothing stopped the agent from also building a dark theme in app/settings/: with app/** allowed, the task contract is satisfied and the project grew a second feature.</b> A feature list in the repo, read at session start, allows exactly one active feature; starting another is a finding the gate refuses.' };
      if (m || w) return { ok: false, msg: `<b>${m} bad change${m === 1 ? '' : 's'} let through, ${w} good file${w === 1 ? '' : 's'} flagged.</b>` };
      return { ok: true, msg: '<b>The checker passes the three sign-up files and blocks two: the migration (forbidden) and the dark theme (a second feature).</b> The globs survived the refactor, and the findings go to the verification gate; the agent opens a question about the migration instead of shipping it.' };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One task', home: true, say: 'An agent adds phone-number sign-up for parents to a Kigali school app. A scope contract says where that work begins and ends.', act: m => m.set({ globs: true, forbidden: true, features: true, broad: false }) },
    { t: 'The diff, checked', home: true, say: 'At the end, a checker reads the agent\'s diff against the contract. Three files are fine; two are not.', act: m => m.set({}) },
    { t: 'The negative space', home: true, say: 'Allow all of the app and list nothing as forbidden, and a migration that drops a column slips through.', act: m => m.set({ forbidden: false, broad: true }) },
    { t: 'Files move', home: true, say: 'A refactor moved the sign-up file. A contract written as raw paths now flags the right edits.', act: m => m.set({ forbidden: true, broad: false, globs: false }) },
    { t: 'One feature at a time', home: true, say: 'The agent also starts a dark theme. A feature list in the repo allows exactly one active feature per session.', act: m => m.set({ globs: true, features: false, broad: true }) },
    { t: 'Findings for the gate', home: true, say: 'Each violation is a finding the verification gate can refuse. The agent asks about the migration instead of shipping it.', act: m => m.set({ features: true, broad: false }) },
  ],
  check: [
    { q: 'Why does a scope contract need a forbidden list?', options: ['Broad allowed globs quietly include dangerous files', 'To make it longer', 'Forbidden lists are optional'], answer: 0, why: 'The negative space is half the contract.', hint: 'Try Leave out the forbidden list.' },
    { q: 'Why write allowed files as globs?', options: ['Files move between sessions', 'Globs are faster', 'Raw paths are not allowed'], answer: 0, why: 'A refactor broke the raw-path contract.', hint: 'Try Pin the contract to raw paths.' },
    { q: 'What stops an agent from starting a second feature?', options: ['A feature list allowing one active feature per session', 'A longer prompt', 'Nothing can'], answer: 0, why: 'A value on disk and a check the gate enforces.', hint: 'Try Let the agent start a second feature.' },
  ],
  terms: [
    ['Scope contract', 'A per-task file: allowed, forbidden, acceptance, rollback, approvals.'],
    ['Glob', 'A file pattern such as app/auth/**/*.py.'],
    ['Forbidden files', 'Files the agent must never touch, even by accident.'],
    ['Acceptance criteria', 'Commands or checks that prove the task is done.'],
    ['Rollback plan', 'How an operator undoes the change.'],
    ['Feature list', 'The project backlog on disk, one active feature at a time.'],
  ],
  deeper: '<p><b>Two altitudes.</b> The contract bounds the files of one task; the feature list bounds the work of the project. An agent can obey the first and still wander on the second.</p><p><b>Rollback first.</b> If you can\'t write the rollback plan, the contract isn\'t ready to approve.</p><p><b>About this machine.</b> The diff is fixed; glob matching, the forbidden check, the feature check and which findings are right or wrong are computed live.</p>',
  code: {
    title: 'Check a diff against the contract',
    note: 'Adapted from the course\'s scope-contracts lesson.',
    text: `
from fnmatch import fnmatch

def scope_check(diff_files, contract, features):
    findings = []
    for f in diff_files:
        if any(fnmatch(f, g) for g in contract["forbidden_files"]):
            findings.append((f, "forbidden"))
        elif feature_of(f) != features["active"]:
            findings.append((f, "second feature"))
        elif not any(fnmatch(f, g) for g in contract["allowed_files"]):
            findings.append((f, "out of scope"))
    return findings          # the verification gate refuses any finding
`,
  },
};
