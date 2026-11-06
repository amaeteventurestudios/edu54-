// Skill discovery and progressive disclosure: a logistics firm's coding agent in Kinshasa has 200 skills installed across scopes (workspace, user, admin, built-in).
// Sizes: a catalog entry (name + description) ~100 tokens; a SKILL.md body ~2,000; a reference guide ~1,500; context window 200K, task itself ~6K.
// Level 1, catalog: all eligible skills' names and descriptions, within a catalog budget of 24K tokens. Level 2: the matched skill's body. Level 3: only the files its steps name.
// The release skill's body either maps branches ("Python package → references/python-release.md") or says "read the relevant guide", which makes the model open all 12 guides.
// Two packages are named release-readiness: the workspace one (this repo's process) and an old user-level copy. Policy: workspace beats user beats built-in,
// or "whichever discovery found first" (the user folder is searched first). A third candidate is a symlink to a downloaded folder outside every trusted root.
const N = 200, CAT = 100, BODY = 2000, REF = 1500, TASK = 6000, WIN = 200000;
function run(st) {
  let tokens, parts;
  if (st.mode === 0) { tokens = TASK + N * (BODY + 3 * REF); parts = { catalog: 0, body: N * BODY, refs: N * 3 * REF }; }
  else { const refs = st.map ? 1 : 12; parts = { catalog: N * CAT, body: BODY, refs: refs * REF }; tokens = TASK + parts.catalog + parts.body + parts.refs; }
  const winner = st.policy ? 'workspace' : 'user (old copy)';
  const symlink = st.root ? 'rejected: resolves outside the trusted roots' : 'loaded: a downloaded folder became a skill';
  return { tokens, parts, fits: tokens <= WIN, winner, symlink, guides: st.mode === 0 ? 600 : st.map ? 1 : 12 };
}
const K = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}K` : `${n}`;

export default {
  slug: 'skill-discovery-and-progressive-disclosure',
  title: 'Skill discovery: show a catalog, load on demand',
  description: 'A Kinshasa logistics firm\'s coding agent has 200 skills. Show a short catalog, load one skill when a task matches, open only what it names.',
  overview: 'Skills are useful only if the agent can find the right one without carrying all of them. Progressive disclosure does it in three levels. First, a catalog: each eligible skill\'s name and description, about a hundred tokens each, enough to tell neighbours apart. Second, once a task matches, that skill\'s instructions: the boundary, the steps, the branches, the stopping rules and the paths to deeper files. Third, only the references, scripts and assets those steps name. The body should be a decision map ("for a Python package, read references/python-release.md"), not "read the relevant guide", which makes the model open every guide to decide. Discovery itself is a pipeline: search declared roots (workspace, user, admin, built-in), parse and validate each package, resolve symlinks and reject any that lead outside the trusted roots, resolve name collisions by a declared precedence rather than by search order, fit the catalog into its budget, and log what was found, rejected, shadowed or shortened. Without that log, "the agent didn\'t use my skill" can\'t be diagnosed.',
  keywords: ['progressive disclosure', 'agent skills', 'skill discovery', 'context budget', 'SKILL.md', 'name collision', 'agent context'],
  orient: 'landscape',
  view: { target: [-0.5, 0.35, -0.05], dir: [0.4, 0.85, 1.3], half: 1.55, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 1, map: true, policy: true, root: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the shelf of 200 installed skills: gold blocks are catalog entries only, green ones are loaded in full */
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), N); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const sp = P.box(1.55, 0.04, 1.1, '#FFFFFF', { r: 0.03 }); sp.position.set(-2.15, 0, -0.5); S.add(sp);
    /* two packages named release-readiness (teal workspace, grey old user copy) and a symlinked folder outside the fence */
    const wsM = new THREE.MeshLambertMaterial({ color: '#1F9E89' }), ws = P.box(0.32, 0.25, 0.32, '#fff', { r: 0.04, material: wsM }); S.add(ws);
    const usM = new THREE.MeshLambertMaterial({ color: '#9A968C' }), us = P.box(0.32, 0.25, 0.32, '#fff', { r: 0.04, material: usM }); S.add(us);
    const ped = P.box(0.45, 0.2, 0.45, '#6B6E7E', { r: 0.04 }); ped.position.set(-1.6, 0, 0.6); S.add(ped);
    const fence = P.box(0.05, 0.3, 0.6, '#6B6E7E', { r: 0.01 }); fence.position.set(-2.95, 0, 0.6); S.add(fence);
    const symM = new THREE.MeshLambertMaterial({ color: '#B9B4A8' }), sym = P.box(0.28, 0.22, 0.28, '#fff', { r: 0.04, material: symM }); S.add(sym);
    /* the context window: a trough with an end wall; task (blue), catalog (gold), the skill's steps (green), guides (purple) pile in */
    const WX0 = -1.05, WW = 2.1, WZ = -0.5;
    const tray = P.box(WW + 0.06, 0.04, 0.5, '#FFFFFF', { r: 0.02 }); tray.position.set(WX0 + WW / 2, 0, WZ); S.add(tray);
    const end = P.box(0.05, 0.45, 0.6, CHAR, { r: 0.01 }); end.position.set(WX0 + WW + 0.03, 0, WZ); S.add(end);
    const segs = [['task', '#5B8DB8'], ['catalog', '#C9A227'], ['body', '#1F9E89'], ['refs', '#7B6FA8']].map(([k, c]) => { const mm = new THREE.MeshLambertMaterial({ color: c }), b = P.box(1, 0.25, 0.4, '#fff', { r: 0.01, material: mm }); b.userData.noFit = true; S.add(b); return { k, b, mm }; });
    /* the twelve guides: purple when opened */
    const guides = Array.from({ length: 12 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#D9D4C7' }), g = P.box(0.13, 0.18, 0.2, '#fff', { r: 0.02, material: mm }); g.position.set(WX0 + 0.15 + (i % 6) * 0.2, 0, 0.45 + Math.floor(i / 6) * 0.27); S.add(g); return mm; });
    const tokTw = P.tower(0.5, 0.5, GOOD, { size: 0.28 }); tokTw.position.set(1.75, 0, 0.0); S.add(tokTw);
    S.add(P.keep(-3.0, 2.05, 1.2, -1.1, 1.0));

    let R = null;
    function draw() {
      R = run(st);
      for (let i = 0; i < N; i++) {
        const x = -2.84 + (i % 20) * 0.072, z = -0.98 + Math.floor(i / 20) * 0.1, active = st.mode === 0 || i === 37;
        dummy.position.set(x, 0.04, z); dummy.scale.set(0.055, active ? 0.14 : 0.05, 0.07); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, col.set(active ? GOOD : '#C9A227'));
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      const sc = WW / WIN; let x = WX0;
      const vals = { task: TASK, catalog: R.parts.catalog, body: R.parts.body, refs: R.parts.refs };
      segs.forEach(sg => { const v = vals[sg.k], len = Math.max(0.004, Math.min(v * sc, Math.max(0.004, WX0 + WW + 0.5 - x))); sg.b.visible = v > 0; sg.b.scale.x = len; sg.b.position.set(x + len / 2, 0.04, WZ); sg.mm.color.set(!R.fits && x + len > WX0 + WW ? RED : { task: '#5B8DB8', catalog: '#C9A227', body: '#1F9E89', refs: '#7B6FA8' }[sg.k]); x += len; });
      const win = st.policy ? ws : us, lose = st.policy ? us : ws;
      win.position.set(-1.6, 0.2, 0.6); lose.position.set(-2.2, 0, 0.6);
      sym.position.set(st.root ? -3.2 : -2.55, 0, st.root ? 0.6 : 0.95); symM.color.set(st.root ? '#B9B4A8' : RED);
      usM.color.set(st.policy ? '#9A968C' : RED);
      guides.forEach((mm, i) => mm.color.set(i < Math.min(12, R.guides) ? '#7B6FA8' : '#D9D4C7'));
      tokTw.userData.set({ h: 0.05 + Math.min(1, R.tokens / WIN) * 1.1, cap: K(R.tokens), color: R.fits ? (R.tokens < 40000 ? GOOD : SAF) : RED });
    }
    draw();
    const update = dt => tokTw.userData.tick(dt);
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Loading', options: ['Everything at start', 'Catalog, then on demand'], get: () => st.mode, act: i => set({ mode: i }) },
      { type: 'toggle', label: 'Skill body maps branches to files', short: 'Branch map', get: () => st.map, set: v => set({ map: !!v }) },
      { type: 'toggle', label: 'Collisions resolved by declared precedence', short: 'Precedence', get: () => st.policy, set: v => set({ policy: !!v }) },
      { type: 'toggle', label: 'Reject symlinks outside trusted roots', short: 'Root check', get: () => st.root, set: v => set({ root: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Context before work', get: () => ({ v: `${K(R.tokens)}`, sub: `of ${K(WIN)}`, good: R.tokens < 40000, bad: !R.fits }) },
      { label: 'Guides opened', get: () => ({ v: `${R.guides}`, sub: 'for one release', bad: R.guides > 1 }) },
      { label: 'Release procedure', get: () => ({ v: st.policy ? 'workspace' : 'old copy', sub: 'which skill won', bad: !st.policy, good: st.policy }) },
    ];
    const labels = [
      { name: 'shelf', t: '200 installed skills', d: 'Gold: catalog only. Green: loaded in full. In front, two packages named release-readiness: the winner stands on the pedestal; a red block past the fence is a symlinked stranger', icon: 'layers', atV: V(-2.95, 0.1, -0.5) },
      { name: 'ctx', t: 'The context window', d: 'Task, catalog, the skill\'s steps, guides; red past the end wall. Below: the twelve guides, purple when opened', icon: 'box', atV: V(WX0 + WW + 0.1, 0.4, WZ) },
      { name: 'tok', t: 'Tokens before work', d: 'Of a 200K window', icon: 'gauge', atV: V(2.0, 0.3, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Load everything at start', hint: 'every skill and guide', on: () => set({ ...D0, mode: 0 }), off: reset },
      { label: '"Read the relevant guide"', hint: 'a topic dump, not a map', on: () => set({ ...D0, map: false }), off: reset },
      { label: 'First one found wins', hint: 'collisions by search order', on: () => set({ ...D0, policy: false }), off: reset },
    ];
    function status() {
      if (st.mode === 0) return { ok: false, msg: `<b>Everything loaded at the start: ${K(R.tokens)} tokens, about ${Math.round(R.tokens / WIN)} times the window.</b> Two hundred skills\' steps and guides can't all fit, and most are irrelevant to the task. Show a catalog of names and descriptions (${K(N * CAT)}), load one skill when it matches, and open only what its steps name.` };
      if (!st.map) return { ok: false, msg: `<b>"Read the relevant guide": the model opened all 12 guides to work out which one applied, ${K(R.parts.refs)} tokens of mostly wrong procedure.</b> Write the skill body as a map: "for a Python package, read references/python-release.md". One branch, one file.` };
      if (!st.policy) return { ok: false, msg: '<b>Two skills are called release-readiness, and the old user-level copy won because its folder was searched first.</b> The agent followed last year\'s process. Declare precedence (workspace over user over built-in), test it, and log which candidate was shadowed.' };
      if (!st.root) return { ok: false, msg: '<b>A symlink in the skills folder pointed to a downloaded folder, and it was loaded as a skill.</b> Resolve every path and reject any that lead outside the trusted roots; a skill\'s files are instructions the agent will follow.' };
      return { ok: true, msg: `<b>${K(R.tokens)} tokens before work starts: the task, a 20K catalog, one skill's steps and one guide.</b> The workspace release skill shadowed the old user copy by declared precedence, the stray symlink was rejected, and the discovery log records all of it.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two hundred skills', home: true, say: 'A logistics firm\'s coding agent in Kinshasa has two hundred skills installed. Loaded all at once, they would more than fill the context window.', act: m => m.set({ mode: 0, map: true, policy: true, root: true }) },
    { t: 'A catalog first', home: true, say: 'Instead, the agent sees a catalog: each skill\'s name and a short description, about a hundred tokens each.', act: m => m.set({ mode: 1 }) },
    { t: 'Load one, then its files', home: true, say: 'When a release task matches, it loads that one skill\'s steps, and opens only the guide its steps name for a Python package.', act: m => m.set({ map: true }) },
    { t: 'A map, not a pile', home: true, say: 'If the steps just say "read the relevant guide", the model opens all twelve to decide. Write the branches out.', act: m => m.set({ map: false }) },
    { t: 'Same name, which one?', home: true, say: 'Two skills share the name release-readiness. If whichever is found first wins, an old personal copy beats the team\'s. Declare precedence.', act: m => m.set({ map: true, policy: false }) },
    { t: 'Know where skills come from', home: true, say: 'Reject skill folders that lead outside trusted places, and log every decision, so "it didn\'t use my skill" can be answered.', act: m => m.set({ policy: true, root: true }) },
  ],
  check: [
    { q: 'What does the agent see about a skill before using it?', options: ['Its name and description in a catalog', 'Its whole folder', 'Nothing'], answer: 0, why: 'About a hundred tokens per skill.', hint: 'Compare the two loading options.' },
    { q: 'Why write "for a Python package, read references/python-release.md" instead of "read the relevant guide"?', options: ['The model opens one file instead of all of them', 'It is shorter', 'Guides must be named'], answer: 0, why: 'A branch map keeps level three small.', hint: 'Try "Read the relevant guide".' },
    { q: 'Two installed skills share a name. How should the host choose?', options: ['By a declared, tested precedence, with the loser logged', 'Whichever was found first', 'At random'], answer: 0, why: 'Search order is an accident.', hint: 'Try First one found wins.' },
  ],
  terms: [
    ['Progressive disclosure', 'Catalog first, instructions on match, files on demand.'],
    ['Skill catalog', 'The names and descriptions of eligible skills shown to the model.'],
    ['Scope', 'Where a skill is installed: workspace, user, admin or built-in.'],
    ['Precedence', 'The declared order that decides which same-named skill wins.'],
    ['Shadowed skill', 'A skill hidden by another with the same name and higher precedence.'],
    ['Discovery log', 'A record of what was found, rejected, shadowed or shortened, and why.'],
  ],
  deeper: '<p><b>Two budgets.</b> The catalog has its own budget, separate from the active skill\'s; when too many skills are eligible, shorten descriptions or filter by scope, and log what was cut.</p><p><b>Keep the core in the body.</b> Don\'t move the main workflow into a reference just to make SKILL.md short: activation must give the model enough to start correctly. Under 500 lines is a ceiling, not a target.</p><p><b>Resources are a trust boundary.</b> Paths a skill names are resolved inside its own folder; scripts run only through the host\'s tools and permissions.</p><p><b>About this machine.</b> Token sizes and the discovery cases follow the file header.</p>',
  code: {
    title: 'Build the catalog, resolve collisions',
    note: 'Adapted from the course\'s skill discovery lesson.',
    text: `
RANK = {"workspace": 0, "user": 1, "admin": 2, "builtin": 3}     # declared, not inferred

def discover(roots):
    found, log = {}, []
    for scope, root in roots:
        for path in root.glob("*/SKILL.md"):
            real = path.resolve()
            if not any(real.is_relative_to(r.resolve()) for _, r in roots):
                log.append(("rejected", path, "outside trusted roots")); continue
            meta = parse_frontmatter(real)
            name = meta["name"]
            if name in found and RANK[found[name]["scope"]] <= RANK[scope]:
                log.append(("shadowed", path, f"by {found[name]['source']}")); continue
            found[name] = {"description": meta["description"], "scope": scope, "source": str(real.parent)}
    return found, log
`,
  },
};
