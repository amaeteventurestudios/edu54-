// Agent skills: a mobile-money app team in Harare packages its release check as a skill: a folder with SKILL.md (name, description, then the steps),
// references/release-policy.md, scripts/inspect_release.py and assets/release-checklist.md. Other pieces of the team's know-how are sorted by what they are:
// repository rules (instructions file), "never publish on a Friday" (a hook: code that runs on an event and can block it), the release registry (an MCP tool),
// an independent security audit (a subagent with its own context). A skill is loaded when a task matches its description; the host's tools do the work.
// Three release requests in a week: Tuesday (fine), Thursday (one blocking migration), Friday afternoon (must be stopped).
const SORT = [
  ['skill', 'release-readiness/', 'the procedure: read policy, run the inspector, stop on blockers, fill the checklist'],
  ['instructions', 'AGENTS.md', 'this repo\'s standing rules: test command, code style'],
  ['hook', 'pre-publish hook', 'blocks any publish on a Friday, whatever the model thinks'],
  ['tool', 'release_registry (MCP)', 'reads and writes release records'],
  ['subagent', 'security-auditor', 'reviews the build in its own context, reports back'],
];
function run(st) {
  const days = [
    { d: 'Tuesday', ask: '"Is v4.12 ready to publish?"' },
    { d: 'Thursday', ask: '"Ready to ship v4.13?"' },
    { d: 'Friday 16:40', ask: '"Push v4.13.1 out now, it\'s urgent"' },
  ];
  return days.map((x, i) => {
    let act = true, out, bad = false;
    if (!st.desc) act = false;
    if (!act) { out = 'skill not loaded (its description, "Release stuff.", matched nothing): the agent improvised a release from memory'; bad = true; }
    else if (!st.folder) { out = 'skill loaded, but scripts/inspect_release.py is missing: the agent guessed at the checks and skipped the migration review'; bad = true; }
    else if (i === 0) out = 'skill loaded · policy read · inspector: no blockers · checklist filled · asks before publishing';
    else if (i === 1) out = 'skill loaded · inspector: migration 0412 not reviewed (blocking) · stops and reports';
    if (i === 2) {
      if (st.hook) out = `${act && st.folder ? 'skill loaded · ' : ''}publish attempted · pre-publish hook: Friday, blocked · the team is told to ship Monday`, bad = !act || !st.folder;
      else { out = `${act ? 'skill loaded, its text says "avoid Fridays" · ' : ''}the user insists it\'s urgent, the model agrees · published at 16:52 · no one on call`; bad = true; }
    }
    return { ...x, out, bad };
  });
}

export default {
  slug: 'skills-and-agent-sdks',
  title: 'Skills: know-how an agent loads when it needs it',
  description: 'A Harare mobile-money team packages its release check as a skill, then sorts the rest of its know-how into rules, hooks, tools and helpers.',
  overview: 'An agent skill is a folder of procedural know-how. Its entry point, SKILL.md, starts with two required fields, a name and a description of what it does and when it applies, followed by instructions: the steps, the decision points, what to do on failure, and paths to the folder\'s references, scripts and assets. Agents see only the names and descriptions until a task matches, then load the instructions, then open resources as the steps need them, so many skills cost little context. The folder, not the Markdown file, is the unit you ship: a SKILL.md copied without its scripts is a broken package. Skills sit beside other pieces that do different jobs, and confusing them causes trouble. Repository instructions hold a codebase\'s standing rules. A hook is code that runs on an event and can enforce a rule deterministically; a skill only advises, so "never publish on a Friday" belongs in a hook. An MCP tool exposes a capability, such as the release registry. A subagent works in its own context, such as an independent audit. And a skill is not a security boundary: what it may do is decided by the host\'s permissions. Agent SDKs and coding assistants increasingly load the same skill format.',
  keywords: ['agent skills', 'SKILL.md', 'Claude skills', 'agent SDK', 'progressive disclosure', 'hooks', 'subagents'],
  orient: 'landscape',
  view: { target: [-0.7, 0.35, 0], dir: [0.4, 0.85, 1.3], half: 1.5, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { hook: true, folder: true, desc: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const KC = { skill: '#1F9E89', instructions: '#8E8C84', hook: '#E07A5F', tool: '#5B8DB8', subagent: '#7B6FA8' };
    /* the skill folder: an open crate with SKILL.md (gold) and the three files it uses */
    const FX = -2.1, FZ = -0.45;
    const crate = P.box(1.2, 0.08, 0.9, '#A87A4F', { r: 0.03 }); crate.position.set(FX, 0, FZ); S.add(crate);
    [[FX, FZ - 0.45, 1.2, 0.05], [FX, FZ + 0.45, 1.2, 0.05]].forEach(([x, z, w, d]) => { const b = P.box(w, 0.25, d, '#8A5F3A', { r: 0.01 }); b.position.set(x, 0, z); S.add(b); });
    [FX - 0.6, FX + 0.6].forEach(x => { const b = P.box(0.05, 0.25, 0.9, '#8A5F3A', { r: 0.01 }); b.position.set(x, 0, FZ); S.add(b); });
    const skillM = new THREE.MeshLambertMaterial({ color: SAF }), skill = P.box(0.42, 0.35, 0.55, '#fff', { r: 0.03, material: skillM }); skill.position.set(FX - 0.28, 0.08, FZ); S.add(skill);
    const parts = ['#5B8DB8', '#1F9E89', '#C9C4B6'].map((c, i) => { const b = P.box(0.22, 0.2, 0.22, c, { r: 0.03 }); b.position.set(FX + 0.25, 0.08, FZ - 0.25 + i * 0.25); S.add(b); return b; });
    /* the rest of the team's know-how, sorted: instructions file, the Friday hook (a barrier), the registry tool, the security subagent */
    const SZ = 0.65;
    const instr = P.box(0.35, 0.12, 0.45, '#5B8DB8', { r: 0.03 }); instr.position.set(-2.55, 0, SZ); S.add(instr);
    const tool = P.box(0.35, 0.3, 0.35, KC.tool, { r: 0.04 }); tool.position.set(-2.05, 0, SZ); S.add(tool);
    const sub = P.robot(KC.subagent, { scale: 0.6 }); sub.position.set(-1.55, 0, SZ); S.add(sub);
    /* the agent and three release pads: Tuesday, Thursday, Friday; the hook is a barrier in front of the last one */
    const bot = P.robot(CHAR, { scale: 1.0 }); bot.position.set(-0.4, 0, -0.1); S.add(bot);
    const pads = [0, 1, 2].map(i => { const pad = P.box(0.55, 0.06, 0.45, '#D9D4C7', { r: 0.03 }); pad.position.set(0.75, 0, -0.75 + i * 0.68); S.add(pad); const l = P.lamp('#C9C4B6', { h: 0.4, r: 0.09 }); l.position.set(1.15, 0, -0.75 + i * 0.68); S.add(l); const box = P.box(0.26, 0.24, 0.26, '#FFFFFF', { r: 0.03 }); box.position.set(0.75, 0.06, -0.75 + i * 0.68); box.userData.noFit = true; S.add(box); return { l, box }; });
    const hookM = new THREE.MeshLambertMaterial({ color: '#B5462F' }), hook = P.box(0.08, 0.5, 0.6, '#fff', { r: 0.02, material: hookM }); hook.position.set(0.35, 0, 0.61); S.add(hook);
    S.add(P.keep(-2.8, 1.4, 1.1, -1.05, 1.0));

    let R = null, k = 0, clock = 0;
    function show() {
      R.forEach((r, i) => { const on = i <= k; pads[i].l.userData.set({ color: !on ? '#C9C4B6' : r.bad ? RED : GOOD, on }); pads[i].box.visible = on && !(i === 2 && st.hook); });
    }
    function draw() {
      R = run(st); k = 0; clock = 0;
      skillM.color.set(st.desc ? SAF : RED);
      parts.forEach(p => { p.visible = !!st.folder; });
      hook.visible = !!st.hook;
      show();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { bot.userData.tick(dt); sub.userData.tick(dt); bot.userData.set({ busy: true }); clock += dt; if (clock >= 1.8) { clock -= 1.8; if (k < 2) { k++; show(); } } };
    const controls = [
      { type: 'toggle', label: 'Friday rule as a hook', short: 'Hook', get: () => st.hook, set: v => set({ hook: !!v }) },
      { type: 'toggle', label: 'Ship the whole folder', short: 'Whole folder', get: () => st.folder, set: v => set({ folder: !!v }) },
      { type: 'toggle', label: 'A description that says when', short: 'Clear description', get: () => st.desc, set: v => set({ desc: !!v }) },
      { type: 'button', label: 'Run the week again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Releases handled right', get: () => { const n = R.filter(r => !r.bad).length; return { v: `${n} of 3`, sub: 'Tue, Thu, Fri', good: n === 3, bad: n < 2 }; } },
      { label: 'Friday publish', get: () => ({ v: st.hook ? 'blocked' : 'went out', sub: st.hook ? 'by the hook' : 'skill text ignored', bad: !st.hook, good: st.hook }) },
      { label: 'Package', get: () => ({ v: st.folder ? '4 files' : '1 file', sub: 'the folder is the unit' }) },
    ];
    const labels = [
      { name: 'pkg', t: 'The skill folder', d: 'Gold SKILL.md (red: a vague description) with the policy, the inspector script and the checklist it uses', icon: 'book', atV: V(FX - 0.62, 0.2, FZ) },
      { name: 'rest', t: 'Not skills', d: 'In front: the repo\'s instructions file, the registry tool, the security subagent; the red barrier is the Friday hook', icon: 'layers', atV: V(-2.75, 0.1, SZ) },
      { name: 'week', t: 'The week', d: 'Release pads for Tuesday, Thursday and Friday; a lamp each', icon: 'check', atV: V(1.3, 0.45, -0.07) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'A rule as skill text', hint: '"avoid Fridays" instead of a hook', on: () => set({ ...D0, hook: false }), off: reset },
      { label: 'Copy only SKILL.md', hint: 'leave the folder behind', on: () => set({ ...D0, folder: false }), off: reset },
      { label: 'A vague description', hint: '"Release stuff."', on: () => set({ ...D0, desc: false }), off: reset },
    ];
    function status() {
      if (!st.hook) return { ok: false, msg: '<b>"Avoid publishing on Fridays" was skill text, so on Friday at 16:40, when the user insisted, the model agreed and published.</b> A skill advises; it can be outweighed or not loaded at all. Rules that must hold belong in a hook, code that runs on the publish event and blocks it.' };
      if (!st.folder) return { ok: false, msg: '<b>Only SKILL.md was copied: its steps point to a policy, a script and a checklist that aren\'t there.</b> The agent guessed at the checks and missed Thursday\'s blocking migration. The folder is the package; ship and version it whole.' };
      if (!st.desc) return { ok: false, msg: '<b>The description said "Release stuff.", so the agent never matched it to "is v4.12 ready to publish?" and improvised from memory.</b> Agents see only names and descriptions until a skill is loaded. Say what the skill does and when to use it, in the words people use.' };
      return { ok: true, msg: '<b>Three requests, three right outcomes.</b> Tuesday\'s release passed the inspector; Thursday\'s stopped on an unreviewed migration; Friday\'s publish was blocked by the hook. The skill carried the procedure, the hook the hard rule, the MCP tool the registry, and the subagent the independent audit.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A procedure, packaged', home: true, say: 'A mobile-money app team in Harare writes its release check as a skill: a folder with instructions, a policy file, a script and a checklist. The description says when to use it.', act: m => m.set({ hook: true, folder: true, desc: true }) },
    { t: 'Loaded when needed', home: true, say: 'The agent sees only skill names and descriptions until a request matches. Then it loads the steps, and opens the script and checklist as the steps call for them.', act: m => m.set({ desc: true }) },
    { t: 'Everything in its place', home: true, say: 'Not everything is a skill. Repository rules go in an instructions file; the registry is an MCP tool; an independent audit is a subagent; and a rule that must hold is a hook.', act: m => m.set({ hook: true }) },
    { t: 'A rule is not advice', home: true, say: 'Write "avoid Fridays" into the skill instead of a hook, and on Friday afternoon an urgent request talks the model into publishing.', act: m => m.set({ hook: false }) },
    { t: 'The folder is the package', home: true, say: 'Copy only the instructions file, and its steps point at a script that isn\'t there. The agent guesses, and misses a blocking migration.', act: m => m.set({ hook: true, folder: false }) },
    { t: 'Say when', home: true, say: 'Give it a vague description, and the agent never picks it. Descriptions are how skills are found.', act: m => m.set({ folder: true, desc: false }) },
  ],
  check: [
    { q: 'What is the deployable unit of an agent skill?', options: ['The whole folder: SKILL.md plus its references, scripts and assets', 'SKILL.md alone', 'The description'], answer: 0, why: 'Instructions point at files that must ship with them.', hint: 'Try Copy only SKILL.md.' },
    { q: '"Never publish on a Friday" must always hold. Where should it live?', options: ['In a hook that blocks the publish event', 'In the skill\'s instructions', 'In the description'], answer: 0, why: 'Skills advise; hooks enforce.', hint: 'Try A rule as skill text.' },
    { q: 'What does an agent see before a skill is loaded?', options: ['Its name and description', 'All its instructions', 'Its scripts'], answer: 0, why: 'That is why the description must say when to use it.', hint: 'Try A vague description.' },
  ],
  terms: [
    ['Agent skill', 'A folder of procedural know-how an agent loads when a task matches it.'],
    ['SKILL.md', 'The entry file: name and description, then the instructions.'],
    ['Progressive disclosure', 'Loading only descriptions first, instructions on match, resources on demand.'],
    ['Hook', 'Code that runs on an event, such as a publish, and can block it.'],
    ['Subagent', 'A separate agent with its own context, given part of a job.'],
    ['Repository instructions', 'A codebase\'s standing rules, loaded when working in it.'],
  ],
  deeper: '<p><b>Two meanings of "skill".</b> Research systems also call learned behaviours skills: programs or trajectories an agent discovers and reuses. Packaged agent skills are authored folders with a declared format; the name is shared, the machinery isn\'t.</p><p><b>Portable core, host extras.</b> name and description are required; license, compatibility and metadata are standard; allowed-tools is experimental. Hosts add their own fields, which may not travel.</p><p><b>Later lessons.</b> How skills are found, routed, sandboxed and tested each get their own lesson in this track.</p><p><b>About this machine.</b> The week\'s three requests and their outcomes follow the file header.</p>',
  code: {
    title: 'A skill\'s entry file',
    note: 'Adapted from the course\'s skills and agent SDKs lesson.',
    text: `
---
name: release-readiness
description: Check a release candidate when someone asks whether a version is ready to publish or ship.
---

# Release readiness

Use this for release candidates, not ordinary development builds.

1. Read references/release-policy.md.
2. Run: python3 scripts/inspect_release.py --format json
3. If the report has a blocking failure, stop and report it.
4. Fill in assets/release-checklist.md.
5. Ask for approval before any publish or tag action.
`,
  },
};
