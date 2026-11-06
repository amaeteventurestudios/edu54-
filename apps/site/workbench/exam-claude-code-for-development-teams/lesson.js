// Exam prep, Claude Code for teams: an invented fintech engineering team in Lagos shares a repository and wants six things to apply when
// Claude Code works in it. Each belongs in one place: the project CLAUDE.md (short, shared, project-specific), a person's own memory, a skill
// (a reusable procedure), a hook (a deterministic lifecycle check), settings permissions (what may run without asking) or a secret manager.
// The right place is the narrowest durable scope that also enforces what must be enforced. Check the current documentation for exact names.
const PLACES = [
  { id: 'claude', c: 'short shared\nproject guidance', n: 'Project CLAUDE.md', what: 'short, shared, project-specific guidance read every session' },
  { id: 'user', c: 'one person\'s\npreferences', n: 'My own memory', what: 'one person\'s preferences' },
  { id: 'skill', c: 'a procedure,\nloaded on demand', n: 'A skill', what: 'a reusable procedure loaded when the task needs it' },
  { id: 'hook', c: 'a check that\nalways runs', n: 'A hook', what: 'a deterministic check that runs at a fixed point' },
  { id: 'perm', c: 'what may run\nwithout asking', n: 'Settings permissions', what: 'which commands run without asking, and which are denied' },
  { id: 'secret', c: 'credentials,\noutside the repo', n: 'Secret manager', what: 'credentials, outside the repository and prompts' },
];
const ITEMS = [
  { n: '"Use pnpm; run the tests before every commit"', best: 'claude' },
  { n: '"I prefer short replies"', best: 'user' },
  { n: 'The 12-step release checklist with templates', best: 'skill' },
  { n: 'Never edit migrations/ without approval', best: 'hook' },
  { n: 'Run the test command without asking; never rm -rf', best: 'perm' },
  { n: 'The staging database password', best: 'secret' },
];
const WHY = {
  claude: { user: 'everyone would get one person\'s taste in every session', skill: 'a long procedure would bloat every session; load it only when needed', hook: 'a sentence is advice; a rule that must hold needs a deterministic check', perm: 'text cannot grant or deny commands; permissions are settings', secret: 'a password in a committed file is a leaked password' },
  user: { claude: 'the whole team needs it, not one person', skill: 'the whole team needs the procedure', hook: 'one person\'s memory enforces nothing for the team', perm: 'permissions belong in shared, reviewed settings', secret: 'credentials do not belong in memory' },
  skill: { claude: 'a short rule that applies every time belongs in CLAUDE.md', user: 'a personal preference is not a team procedure', hook: 'a skill is guidance; this must be enforced', perm: 'a skill cannot grant permissions', secret: 'never put credentials in a skill' },
  hook: { claude: 'guidance does not need a check that blocks', user: 'a preference is not a check', skill: 'a procedure with templates is guidance, not a gate', perm: 'allowing commands is a permission setting', secret: 'a hook is not a secret store' },
  perm: { claude: 'conventions are guidance, not permissions', user: 'a preference is not a permission', skill: 'a procedure is not a permission', hook: 'a conditional, path-specific rule needs a hook', secret: 'permissions do not store credentials' },
  secret: { claude: 'conventions are not secrets', user: 'preferences are not secrets', skill: 'procedures are not secrets', hook: 'checks are not secrets', perm: 'permissions are not secrets' },
};
function judge(o) { const it = ITEMS[o.item], p = PLACES.find(x => x.id === o.place), best = PLACES.find(x => x.id === it.best); return { it, p, best, right: p.id === best.id, why: p.id === best.id ? '' : WHY[p.id][best.id] }; }

export default {
  slug: 'exam-claude-code-for-development-teams',
  title: 'Exam prep: Claude Code scales through shared constraints',
  description: 'An engineering team wants six things to hold in its repository. Put each in the narrowest place that also enforces what must be enforced.',
  overview: 'Claude Code scales across a team when the constraints are shared, reviewed and put in the right place. The project CLAUDE.md is read at the start of every session, so it should stay short and specific to the project: build commands, conventions, where things live; every line in it costs context in every session. Put information at the narrowest durable scope: a personal preference belongs in your own user-level memory, not in a file the whole team inherits. A long, reusable procedure such as a release checklist with templates is better as a skill, loaded only when the task calls for it. Anything that must hold, rather than merely be advised, needs a deterministic mechanism: a hook that runs at a fixed point, for example blocking edits to a migrations folder without approval, and permission settings that say which commands may run without asking and which are denied. Credentials stay in a secret manager or protected environment, never in CLAUDE.md, prompts, logs or the repository. Treat settings, plugins and MCP servers as reviewed code, because they change what the agent can do. Permission modes trade speed for oversight: accepting edits automatically speeds editing, pre-approved automation suits trusted scripts, and bypassing prompts belongs only in a disposable, isolated environment. Parallel agents writing code need separate worktrees and clear ownership. Headless runs in CI get minimal tokens, tools, network, time and authority, and agent changes go through normal review and protected merges. Version and evaluate configuration changes like any other code. Command and setting names change; check the current documentation. This machine follows an invented fintech team in Lagos.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'Claude Code', 'CLAUDE.md', 'hooks', 'skills', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.25, -0.15], dir: [0.05, 1.05, 1.12], half: 1.15, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { item: 3, place: 'hook' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8';
    /* six places, each its own object: a short sheet of guidance, a personal jar, a shelf of procedures, a gate that always runs, a permissions dial, a locked safe */
    const X = i => -2.2 + i * 0.82, BZ = -0.45;
    const sheet = P.box(0.5, 0.08, 0.62, '#F4F1EA', { r: 0.02 }); sheet.position.set(X(0), 0, BZ); S.add(sheet);
    const jar = P.jar(0.2, 0.5); jar.userData.set({ n: 6 }); jar.position.set(X(1), 0, BZ); S.add(jar);
    const shelf = P.shelf(2, { cell: 0.26, levels: 2, lh: 0.28, d: 0.34 }); shelf.userData.set({ fill: Array(4).fill('#A9B8C9') }); shelf.position.set(X(2), 0, BZ); S.add(shelf);
    const hook = P.gate(0.56, BLUE, { h: 0.5 }); hook.position.set(X(3), 0, BZ); S.add(hook);
    const perm = P.dial(0.27); perm.userData.set({ v: 0.25 }); perm.position.set(X(4), 0, BZ); S.add(perm);
    const safe = P.box(0.46, 0.46, 0.46, '#3B3F52', { r: 0.05 }); safe.position.set(X(5), 0, BZ); S.add(safe);
    /* a gold ring round the right place; the robot carries the item to your choice; a lamp gives the verdict */
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 8, 48), new THREE.MeshBasicMaterial({ color: SAF })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; ring.userData.noFit = true; S.add(ring);
    const bot = P.robot(BLUE, { scale: 0.45 }); bot.userData.noFit = true; S.add(bot);
    const pm = new THREE.MeshLambertMaterial({ color: SAF }), item = P.box(0.18, 0.18, 0.18, '#fff', { r: 0.03, material: pm }); item.userData.noFit = true; S.add(item);
    const lamp = P.lamp(GOOD, { h: 0.4, r: 0.13 }); lamp.position.set(2.5, 0, BZ); S.add(lamp);
    S.add(P.keep(-2.65, 2.7, 0.9, -1.0, 0.8));

    let R = null;
    function draw() {
      R = judge(st);
      const i = PLACES.findIndex(p => p.id === st.place);
      bot.position.set(X(i) - 0.12, 0, 0.45); bot.userData.set({ color: R.right ? BLUE : BAD });
      item.position.set(X(i) + 0.16, 0, 0.45);
      ring.position.set(X(PLACES.findIndex(p => p.id === R.best.id)), 0.03, BZ);
      lamp.userData.set({ color: isOk() ? GOOD : RED, on: true });
    }
    function isOk() { return R.right; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'What to keep', options: ['Build convention', 'Short replies', 'Release checklist', 'Migrations rule', 'Command permissions', 'Database password'], get: () => st.item, act: i => set({ item: i, place: ITEMS[i].best }) },
      { type: 'buttons', label: 'Put it in', options: PLACES.map(p => p.n), get: () => PLACES.findIndex(p => p.id === st.place), act: i => set({ place: PLACES[i].id }) },
    ];
    const readouts = [
      { label: 'Your choice', get: () => ({ v: R.p.n, sub: R.right ? 'right place' : 'wrong place', good: R.right, bad: !R.right }) },
      { label: 'Belongs in', get: () => ({ v: R.best.n, sub: 'narrowest durable scope', good: true, bad: false }) },
      { label: 'Enforced', get: () => ({ v: ['hook', 'perm', 'secret'].includes(R.p.id) ? 'yes' : 'advice only', sub: 'by code, not text', good: ['hook', 'perm', 'secret'].includes(R.best.id) ? ['hook', 'perm', 'secret'].includes(R.p.id) : true, bad: ['hook', 'perm', 'secret'].includes(R.best.id) && !['hook', 'perm', 'secret'].includes(R.p.id) }) },
    ];
    const labels = [
      { name: 'p', t: 'Six places', d: 'Guidance, procedure, enforcement', icon: 'box', atV: V(-2.46, 0.08, -0.45) },
      { name: 't', t: 'The verdict', d: 'Gold ring: where it belongs', icon: 'target', atV: V(2.65, 0.45, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Commit the password to CLAUDE.md', hint: 'a leaked secret', on: () => set({ item: 5, place: 'claude' }), off: reset },
      { label: 'Paste the checklist into CLAUDE.md', hint: 'bloats every session', on: () => set({ item: 2, place: 'claude' }), off: reset },
      { label: 'Write the migrations rule as a sentence', hint: 'advice, not a gate', on: () => set({ item: 3, place: 'claude' }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.right) return { ok: true, msg: `<b>${r.it.n.replace(/"/g, '')} belongs in ${r.best.n.toLowerCase()}: ${r.best.what}.</b> ${['hook', 'perm', 'secret'].includes(r.best.id) ? 'It must hold, so it is enforced outside the model\'s judgement.' : 'It is guidance at the narrowest scope that needs it.'}` };
      return { ok: false, msg: `<b>${r.p.n} is the wrong place: ${r.why}.</b> It belongs in ${r.best.n.toLowerCase()}, ${r.best.what}.` };
    }
    return { update: dt => { bot.userData.tick(dt); hook.userData.tick(dt); perm.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Shared constraints', home: true, say: 'A team wants six things to hold whenever Claude Code works in their repository.', act: m => m.set({ item: 0, place: 'claude' }) },
    { t: 'Keep CLAUDE.md short', home: true, say: 'Build commands and conventions go in the project CLAUDE.md, read every session.', act: m => m.set({ item: 0, place: 'claude' }) },
    { t: 'Narrowest scope', home: true, say: 'A personal preference goes in your own memory, not the file the team inherits.', act: m => m.set({ item: 1, place: 'user' }) },
    { t: 'Skills for procedure', home: true, say: 'A long release checklist is a skill, loaded only when it is needed.', act: m => m.set({ item: 2, place: 'skill' }) },
    { t: 'Enforce what must hold', home: true, say: 'Never edit migrations without approval: a hook checks it, every time.', act: m => m.set({ item: 3, place: 'hook' }) },
    { t: 'Secrets outside', home: true, say: 'The database password lives in a secret manager, never in the repository.', act: m => m.set({ item: 5, place: 'secret' }) },
  ],
  check: [
    { q: 'What belongs in the project CLAUDE.md?', options: ['Short, shared, project-specific guidance', 'Every procedure the team has', 'Passwords'], answer: 0, why: 'It costs context in every session.', hint: 'Try Paste the checklist into CLAUDE.md.' },
    { q: 'A rule must always hold. Where should it live?', options: ['A hook or permission setting', 'A sentence in CLAUDE.md', 'Someone\'s memory'], answer: 0, why: 'Text is advice; hooks enforce.', hint: 'Try Write the migrations rule as a sentence.' },
    { q: 'Where do credentials go?', options: ['A secret manager or protected environment', 'CLAUDE.md', 'A skill'], answer: 0, why: 'Never in the repository.', hint: 'Try Commit the password.' },
  ],
  practice: [
    { q: 'A developer adds "I like detailed explanations" to the project CLAUDE.md. What is the better place?', options: ['Their own user-level memory', 'The project CLAUDE.md', 'A hook', 'Settings permissions'], answer: 0, why: 'Narrowest durable scope.' },
    { q: 'Edits to a payments module must always be reviewed by a human before they are written. What enforces this?', options: ['A hook or permission rule that blocks unapproved edits to that path', 'A line in CLAUDE.md', 'A skill', 'A code comment'], answer: 0, why: 'Deterministic checks enforce; text advises.' },
    { q: 'Two agents edit the same repository in parallel. What prevents them overwriting each other?', options: ['Separate worktrees and explicit ownership of files', 'One shared checkout', 'A longer prompt', 'Running them faster'], answer: 0, why: 'Isolation for parallel writers.' },
    { q: 'A headless CI job runs Claude Code on pull requests. What access should it get?', options: ['Minimal tokens, tools, network, time and authority', 'Admin rights to everything', 'The production database password', 'Bypass mode on a shared server'], answer: 0, why: 'Least authority for automation.' },
    { q: 'When is bypassing permission prompts acceptable?', options: ['Only in a disposable, isolated environment', 'On a shared production machine', 'Whenever it is faster', 'Never under any circumstance'], answer: 0, why: 'Speed without oversight needs isolation.' },
    { q: 'A team installs a new MCP server for Claude Code. How should they treat it?', options: ['As reviewed code and capability, versioned and evaluated', 'As harmless configuration', 'As a personal preference', 'As a secret'], answer: 0, why: 'It changes what the agent can do.' },
  ],
  terms: [
    ['CLAUDE.md', 'A project file of guidance read at the start of each session.'],
    ['User memory', 'One person\'s preferences, not shared with the team.'],
    ['Skill', 'A packaged procedure loaded when the task needs it.'],
    ['Hook', 'A deterministic check that runs at a fixed point.'],
    ['Permissions', 'Settings for which commands run without asking or are denied.'],
    ['Worktree', 'A separate working copy so parallel writers do not collide.'],
  ],
  deeper: '<p><b>Context tools.</b> Inspect what is loaded, compact with a focus, clear for a fresh start, or rewind to an earlier point; each fixes a different problem.</p><p><b>Long-running loops.</b> Scheduled or looping jobs need bounds on evidence, authority, time and cost.</p><p><b>About this machine.</b> The team and items are invented; check the current Claude Code documentation for exact names.</p>',
  code: {
    title: 'A project CLAUDE.md and a hook',
    note: 'Written for this lesson; check the current documentation for hook configuration.',
    text: `
# CLAUDE.md  (short, shared, project-specific)
- Use pnpm. Run \`pnpm test\` before every commit.
- API handlers live in src/api; migrations in db/migrations.
- Release steps: use the "release" skill.

# hooks/protect_migrations.py  (runs before every edit)
import json, sys
call = json.load(sys.stdin)
path = call.get("tool_input", {}).get("file_path", "")
if path.startswith("db/migrations/") and not approved(path):
    print(json.dumps({"decision": "block", "reason": "migrations need approval"}))
    sys.exit(2)
`,
  },
};
