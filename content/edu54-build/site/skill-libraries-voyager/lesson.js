// Skill libraries (Voyager): a chop-bar kitchen agent learns to serve eba and egusi. Each skill is code that calls other skills; a primitive costs one step,
// calling a skill already in the library costs one step, and a skill not in the library must be worked out from its parts (the full expansion).
// Every task has a budget of 7 steps. The curriculum proposes the next task whose parts are all known (just above current ability), or a random one.
// When the egusi task needs a kettle, boil_water is refined to v2 (returns a kettle, not a pot); make_eba was written against v1 and breaks unless it pinned v1.
const SK = {
  fetch_water: [], gather_wood: [], peel_cassava: [], grind_egusi: [],
  light_fire: ['gather_wood'],
  boil_water: ['fetch_water', 'light_fire'],
  grate_cassava: ['peel_cassava'],
  fry_garri: ['grate_cassava', 'light_fire'],
  make_eba: ['fry_garri', 'boil_water'],
  cook_egusi: ['grind_egusi', 'boil_water', 'light_fire'],
  serve_eba_and_egusi: ['make_eba', 'cook_egusi'],
};
const PRIM = ['fetch_water', 'gather_wood', 'peel_cassava', 'grind_egusi'];
const TASKS = Object.keys(SK).filter(k => !PRIM.includes(k));
const BUDGET = 7;
const expand = k => SK[k].length ? SK[k].reduce((s, c) => s + expand(c), 0) + 1 : 1;
function cost(k, lib) { return SK[k].reduce((s, c) => s + (PRIM.includes(c) || lib.has(c) ? 1 : cost(c, lib)), 0) + 1; }
function run(o) {
  const lib = new Map(), log = []; let x = 11; const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; };
  let bw = 1;
  for (let it = 0; it < 12 && !lib.has('serve_eba_and_egusi'); it++) {
    const left = TASKS.filter(t => !lib.has(t));
    let task;
    if (o.curriculum) task = left.find(t => SK[t].every(c => PRIM.includes(c) || lib.has(c))) || left[0];
    else task = left[Math.floor(rnd() * left.length)];
    const c = o.library ? cost(task, lib) : expand(task);
    let ok = c <= BUDGET, note = ok ? `${c} steps` : `needs ${c} steps, budget ${BUDGET}`;
    if (ok && task === 'cook_egusi' && bw === 1) { bw = 2; note += '; boil_water refined to v2 (kettle)'; if (lib.has('boil_water')) lib.set('boil_water', { v: 2 }); }
    if (ok && task === 'serve_eba_and_egusi' && lib.has('make_eba') && lib.get('make_eba').bw !== bw && !o.pin) { ok = false; note = `make_eba expects boil_water v${lib.get('make_eba').bw} (a pot), got v${bw} (a kettle)`; }
    if (ok && o.library) lib.set(task, { v: 1, bw: task === 'make_eba' ? bw : undefined });
    if (ok && !o.library) lib.set(task, { v: 1, done: true });
    log.push({ task, c, ok, note });
    if (!ok && log.filter(l => l.task === task && !l.ok).length >= 2) break;
  }
  const done = log.some(l => l.task === 'serve_eba_and_egusi' && l.ok);
  return { lib, log, done, steps: log.reduce((s, l) => s + Math.min(l.c, BUDGET), 0), fails: log.filter(l => !l.ok).length };
}

export default {
  slug: 'skill-libraries-voyager',
  title: 'Skill libraries: learn once, reuse forever',
  description: 'A chop-bar kitchen agent learns to serve eba and egusi by saving each skill as code it can call again, from fire to the full meal.',
  overview: 'Voyager made an agent\'s actions code. Each capability is a named function that calls other functions: boil_water calls fetch_water and light_fire; make_eba calls fry_garri and boil_water. When a task succeeds, its code goes into a skill library, retrievable by description, so the next task calls it in one step instead of working it out again. Without a library every task is rebuilt from primitives, and long tasks blow through any step budget. Three parts make it work. An automatic curriculum proposes the next task from what the agent already knows: just above its current ability, not far beyond. The skill library stores, retrieves and composes skills. Iterative prompting refines a skill from execution errors, environment feedback and self-checks, like Self-Refine with the world as the verifier. In Minecraft this found several times more unique items and reached tools many times faster than earlier agents. The usual failures: near-duplicate skills piling up (deduplicate on write), retrieval that weakens past a few hundred skills (add tags and filters), and composed skills drifting when a skill they call is refined. Version skills, and let a parent pin the version it was written against.',
  keywords: ['Voyager', 'skill library', 'lifelong learning', 'curriculum', 'AI agents', 'code as action', 'composition'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, -0.1], dir: [0.3, 0.95, 1.25], half: 1.3, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { library: true, curriculum: true, pin: true }, st = { ...D0, t: 0 };
    const CHAR = '#2C2D31', GOLD = '#E3A72F', GOOD = '#1F9E89', RED = '#D9483B', GHOST = '#E4E0D6';
    /* the skill tree as a building: primitives on the ground, each skill a pillar as tall as its level, rods to the skills it calls.
       A pillar takes its colour once learned; gold while being tried, red when the attempt fails */
    const LAYOUT = { fetch_water: [-2.6, 0.75], gather_wood: [-1.75, 0.75], peel_cassava: [-0.9, 0.75], grind_egusi: [-0.05, 0.75], light_fire: [-1.75, 0.15], grate_cassava: [-0.9, 0.15], boil_water: [-2.45, -0.35], fry_garri: [-1.3, -0.35], cook_egusi: [-0.15, -0.35], make_eba: [-1.85, -0.85], serve_eba_and_egusi: [-0.85, -1.0] };
    const COL = { fetch_water: '#5B8DB8', gather_wood: '#8A5F3A', peel_cassava: '#D8B26E', grind_egusi: '#C9A227', light_fire: '#E07A5F', grate_cassava: '#E9D8A6', boil_water: '#7FB3D9', fry_garri: '#E3C16F', cook_egusi: '#9DBF5A', make_eba: '#F0E2B6', serve_eba_and_egusi: '#B5462F' };
    const lvl = k => SK[k].length ? 1 + Math.max(...SK[k].map(lvl)) : 0;
    const node = {};
    Object.entries(LAYOUT).forEach(([k, [x, z]]) => { const h = 0.16 + lvl(k) * 0.17, mm = new THREE.MeshLambertMaterial({ color: GHOST }), b = P.box(0.5, h, 0.36, '#fff', { r: 0.05, material: mm }); b.position.set(x, 0, z); S.add(b); node[k] = { b, mm, x, z, h }; });
    Object.entries(SK).forEach(([k, deps]) => deps.forEach(d => { const A = node[d], B = node[k]; const r = P.rod(V(A.x, A.h, A.z), V(B.x, B.h, B.z), 0.02, '#B9B3A5'); S.add(r); }));
    const kettle = P.cyl(0.11, 0.16, '#3E9B9B'); kettle.position.set(node.boil_water.x, node.boil_water.h, node.boil_water.z); S.add(kettle);
    const chef = P.robot(CHAR, { scale: 0.8 }); chef.position.set(0.4, 0, -0.85); S.add(chef);
    /* each attempt: a tower as tall as the steps it needed; the gold plate is the budget of 7 steps */
    const RX = i => 0.75 + i * 0.22, RZ = 0.1, SH = 0.075;
    const tries = Array.from({ length: 12 }, (_, i) => { const t = P.tower(0.17, 0.4, GOOD, { h: 0.1 }); t.userData.set({ cap: '' }); t.position.set(RX(i), 0, RZ); S.add(t); return t; });
    const plate = P.box(12 * 0.22 + 0.1, 0.025, 0.52, GOLD, { r: 0.01, material: new THREE.MeshLambertMaterial({ color: GOLD, transparent: true, opacity: 0.55 }) }); plate.position.set(RX(5.5), BUDGET * SH, RZ); plate.layers.set(1); S.add(plate);
    const floor = P.box(12 * 0.22 + 0.1, 0.04, 0.52, '#3A3D4A', { r: 0.02 }); floor.position.set(RX(5.5), 0, RZ); S.add(floor);
    S.add(P.keep(-2.95, 3.35, 1.45, -1.3, 1.05));

    let R = null;
    function plan() { R = run(st); st.t = 0; paint(); }
    function paint() {
      const k = Math.min(R.log.length - 1, Math.floor(st.t));
      const known = new Set(R.log.slice(0, k + 1).filter(l => l.ok).map(l => l.task));
      Object.entries(node).forEach(([n, N]) => { const cur = R.log[k] && R.log[k].task === n; N.mm.color.set(PRIM.includes(n) ? COL[n] : cur ? (R.log[k].ok ? GOLD : RED) : known.has(n) ? COL[n] : GHOST); });
      kettle.visible = R.log.slice(0, k + 1).some(l => /refined/.test(l.note));
      tries.forEach((t, i) => { const l = i <= k ? R.log[i] : null; t.visible = !!l; if (!l) return; t.userData.set({ h: Math.min(l.c, 22) * SH, color: l.ok ? GOOD : RED }); });
      const cur = R.log[k], N = cur && node[cur.task]; if (N) chef.position.set(N.x + 0.45, 0, N.z + 0.05);
    }
    plan();
    const set = p => { Object.assign(st, p); plan(); };
    const controls = [
      { type: 'toggle', label: 'Save learned skills to a library', short: 'Library', get: () => st.library, set: v => set({ library: !!v }) },
      { type: 'toggle', label: 'Curriculum: next task just above ability', short: 'Curriculum', get: () => st.curriculum, set: v => set({ curriculum: !!v }) },
      { type: 'toggle', label: 'Composed skills pin the versions they call', short: 'Pin versions', get: () => st.pin, set: v => set({ pin: !!v }) },
      { type: 'button', label: 'Run the learning again', act: () => { st.t = 0; paint(); } },
    ];
    const readouts = [
      { label: 'Serve eba and egusi', get: () => ({ v: R.done ? 'learned' : 'not yet', sub: `${R.log.length} tasks tried`, good: R.done, bad: !R.done }) },
      { label: 'Failures', get: () => ({ v: String(R.fails), sub: 'over budget or broken', bad: R.fails > 0, good: !R.fails }) },
      { label: 'Steps spent', get: () => ({ v: String(R.steps), sub: `the final task alone: ${expand('serve_eba_and_egusi')} from scratch` }) },
    ];
    const labels = [
      { name: 'lib', t: 'The skill library', d: 'Primitives on the ground (water, wood, cassava, egusi), each skill a pillar on the ones it calls, up to the meal. Grey: not learned yet. The teal kettle: boil water v2', icon: 'box', atV: V(-2.95, 0.3, -0.35) },
      { name: 'log', t: 'Each attempt', d: 'A tower per task tried, as tall as the steps it needed. Over the gold plate (7 steps) it fails', icon: 'scale', atV: V(RX(11) + 0.2, 0.3, RZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep no skill library', hint: 'rebuild from scratch', on: () => set({ ...D0, library: false }), off: reset },
      { label: 'Pick tasks at random', hint: 'no curriculum', on: () => set({ ...D0, curriculum: false }), off: reset },
      { label: 'Refine a skill without versions', hint: 'boil_water v2', on: () => set({ ...D0, pin: false }), off: reset },
    ];
    function status() {
      const last = R.log[R.log.length - 1];
      if (!st.library) return { ok: false, msg: `<b>Without a library, every task is worked out from primitives: make_eba alone needs ${expand('make_eba')} steps against a budget of ${BUDGET}, and the full meal would need ${expand('serve_eba_and_egusi')}.</b> The same fire gets lit, the same water boiled, inside every bigger task. Save each learned skill as code and call it in one step.` };
      if (!st.curriculum && R.fails) return { ok: false, msg: `<b>Picking tasks at random, ${R.fails} of ${R.log.length} attempts fail: tasks whose parts aren't learned yet cost more than the budget.</b> A curriculum proposes the next task from what the agent already knows, just above its current ability, so each success makes the next one cheap.` };
      if (!st.pin && !R.done) return { ok: false, msg: `<b>${last.note}.</b> Refining boil_water for the egusi changed what it returns, and make_eba, written against the old version, broke. Version skills, and let a composed skill pin the versions it was written against until someone updates it.` };
      return { ok: true, msg: `<b>Served after ${R.log.length} tasks, none failed, ${R.steps} steps in all.</b> The curriculum went from lighting a fire up to the full meal, and each learned skill was called in one step afterwards; the final task cost ${cost('serve_eba_and_egusi', new Set(TASKS.filter(t => t !== 'serve_eba_and_egusi')))} steps instead of ${expand('serve_eba_and_egusi')}. make_eba kept using boil_water v1 when v2 arrived.` };
    }
    return {
      update: dt => { tries.forEach(t => t.userData.tick(dt)); chef.userData.tick(dt); chef.userData.set({ busy: true }); if (st.t < R.log.length - 1 + 0.99) { const k = Math.floor(st.t); st.t = Math.min(R.log.length - 1 + 0.99, st.t + dt * 0.9); if (Math.floor(st.t) !== k) paint(); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A kitchen agent', home: true, say: 'A chop-bar kitchen agent must learn to serve eba and egusi. Each task builds on smaller ones: fire, boiling water, frying garri.', act: m => m.set({ library: true, curriculum: true, pin: true }) },
    { t: 'Skills are code', home: true, say: 'Each skill it learns is saved as code that calls other skills. Boil water calls fetch water and light fire.', act: m => m.set({ library: true }) },
    { t: 'Just above ability', home: true, say: 'The curriculum picks the next task whose parts are already known. Each success makes the next one cheap.', act: m => m.set({ curriculum: true }) },
    { t: 'No library', home: true, say: 'Without a library, every task is worked out from scratch, and the full meal needs far more steps than the budget allows.', act: m => m.set({ library: false }) },
    { t: 'Random tasks', home: true, say: 'Pick tasks at random, and the agent keeps attempting things whose parts it hasn\'t learned yet.', act: m => m.set({ library: true, curriculum: false }) },
    { t: 'Versions', home: true, say: 'Improving one skill can break the skills built on it. Pin versions, and the meal still gets served.', act: m => m.set({ curriculum: true, pin: true }) },
  ],
  check: [
    { q: 'What does a Voyager skill library store?', options: ['Named, executable code that can call other skills', 'Model weights', 'Chat history'], answer: 0, why: 'The action space is code.', hint: 'Look at the skill graph.' },
    { q: 'What does the automatic curriculum choose?', options: ['A task just above current ability, using known skills', 'The hardest task first', 'A random task'], answer: 0, why: 'Each success makes the next cheap.', hint: 'Try Pick tasks at random.' },
    { q: 'A child skill is refined and a parent breaks. What prevents it?', options: ['Versioning skills and pinning the versions a parent uses', 'Deleting the parent', 'Never refining'], answer: 0, why: 'Composed skills drift without versions.', hint: 'Try Refine a skill without versions.' },
  ],
  terms: [
    ['Skill', 'A named, reusable piece of code an agent can call.'],
    ['Skill library', 'The store of learned skills, retrievable by description.'],
    ['Curriculum', 'The proposer that picks the next task to learn.'],
    ['Composition', 'Building a skill out of calls to other skills.'],
    ['Iterative prompting', 'Refining a skill from errors and environment feedback.'],
    ['Version pinning', 'A composed skill keeps the versions it was written against.'],
  ],
  deeper: '<p><b>Retrieval.</b> A new task is embedded and matched against skill descriptions; the top few skills come back as code to compose. Past a few hundred skills, add tags and hard filters.</p><p><b>Today\'s skills.</b> Agent SDK skills follow the same idea: a named bundle of instructions and code loaded on demand. Discovery, routing, permissions and evaluation of skills are covered in their own lessons.</p><p><b>About this machine.</b> Step counts come from expanding each skill\'s calls; the curriculum, budget checks and the version break are computed live.</p>',
  code: {
    title: 'Learn a task, store it, call it later',
    note: 'Adapted from the course\'s Voyager lesson.',
    text: `
def cost(skill, library):
    if not skill.calls:                       # a primitive action
        return 1
    return 1 + sum(1 if c in library else cost(c, library) for c in skill.calls)

def next_task(tasks, library):
    # just above current ability: every part already known
    return next(t for t in tasks if t not in library and all(c in library or c.primitive for c in t.calls))

def learn(tasks, library, budget=7):
    while (task := next_task(tasks, library)):
        if cost(task, library) > budget:
            break
        library[task.name] = task.code.pin(versions={c: library[c].version for c in task.calls})
`,
  },
};
