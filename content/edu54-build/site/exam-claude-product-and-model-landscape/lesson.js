// Exam prep, choosing a work surface: five tasks from an invented logistics firm with offices in Lagos, Accra and Dakar. Each task has hard
// requirements (repeats, private knowledge, live data, many sources, a typed contract) and each surface meets some of them at some cost in
// setup and upkeep. The best choice is the smallest surface that meets every requirement; an old chat always carries stale context. Fit and
// cost come from the tables below; product details change, so the official documentation always takes precedence.
const SURF = [
  { id: 'new', n: 'New chat', cost: 1, can: { privateSmall: true } },
  { id: 'old', n: 'Last week\'s chat', cost: 1, can: { privateSmall: true }, stale: true },
  { id: 'project', n: 'Project', cost: 2, can: { recurring: true, privateSmall: true, privateDocs: true } },
  { id: 'research', n: 'Research', cost: 2, can: { multiSource: true, privateSmall: true } },
  { id: 'connector', n: 'Connector', cost: 3, can: { recurring: true, privateSmall: true, privateDocs: true, live: true } },
  { id: 'api', n: 'API application', cost: 4, can: { recurring: true, privateSmall: true, privateDocs: true, live: true, multiSource: true, typed: true } },
];
const NEED = { recurring: 'repeats every week', privateDocs: 'needs a maintained set of private documents', live: 'needs data that changes daily', multiSource: 'needs many sources with citations', typed: 'needs a typed output and tests on every release', privateSmall: 'uses a short supplied text' };
const NEEDN = { recurring: 'work that repeats every week', privateDocs: 'a maintained set of private documents', live: 'data that changes daily', multiSource: 'many sources with citations', typed: 'a typed output tested on every release', privateSmall: 'a short supplied text' };
const TASKS = [
  { n: 'Rewrite one supplier email', reqs: ['privateSmall'], best: 'new' },
  { n: 'Weekly brief from the brand guide', reqs: ['recurring', 'privateDocs'], best: 'project' },
  { n: 'Compare shipping reports from 12 ports', reqs: ['multiSource'], best: 'research' },
  { n: 'Daily stock levels from the live sheet', reqs: ['recurring', 'privateDocs', 'live'], best: 'connector' },
  { n: 'Classify 50,000 tickets into a schema', reqs: ['recurring', 'typed'], best: 'api' },
];
function judge(o) {
  const t = TASKS[o.task];
  const rows = SURF.map(s => { const missing = t.reqs.filter(r => !s.can[r]); return { ...s, fit: !missing.length && !s.stale, missing }; });
  const best = rows.filter(r => r.fit).sort((a, b) => a.cost - b.cost)[0];
  const pick = rows.find(r => r.id === o.pick);
  return { t, rows, best, pick, right: pick.id === best.id };
}

export default {
  slug: 'exam-claude-product-and-model-landscape',
  title: 'Exam prep: choose the smallest surface that carries the work',
  description: 'A logistics firm has five jobs for Claude, from one email to fifty thousand tickets. Name what each needs, then pick the smallest surface that carries it.',
  overview: 'Questions about products and models are rarely about remembering a feature list. They test boundary design: what Claude can see, remember and retrieve for a task, and how much machinery the task deserves. Start from the work, not the menu, along a few dimensions: is it one-time or recurring; is the knowledge small, private, large or changing; can yesterday\'s copy be wrong today; is the output a reply, a file or a reusable workflow; what happens if it is wrong; and does one person use it or a team. Then choose the smallest surface that carries it. A new chat is the right default for a bounded task with a clear input, and its clean context is a feature; a long-running old chat can quietly carry stale assumptions into new work, so restart when the objective changes. A Project groups chats with standing instructions and a knowledge base for repeated work on stable material, and needs an owner and a review cadence so its contents do not go stale. Research suits multi-source investigation with citations, which still need judging. Connectors give live, permissioned access to changing sources instead of pasted copies, and must be checked for what they can read and change and which actions need approval. An application built on the API is for behaviour the chat products cannot express: typed outputs, application-owned authorisation, automated tests on every release. Model choice follows the same rule: spend capability where failure is expensive and measured need justifies it. Where Claude runs, directly or through a cloud provider, is a separate control-plane decision. Product names, limits and availability change; always check the current official documentation.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'claude products', 'projects', 'connectors', 'choosing a surface', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0.15], dir: [0.05, 1.1, 1.05], half: 1.2, wide: 5.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { task: 3, pick: 'connector' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', OFF = '#D8D2C4';
    /* six surfaces in a row, taller for more setup and upkeep; last week's chat wears a brown top for its stale context */
    const SX = i => -2.1 + i * 0.72, BZ = -0.55;
    const NEEDS = ['recurring', 'privateDocs', 'live', 'multiSource', 'typed', 'privateSmall'], DZ = n => -0.08 + n * 0.17;
    const blocks = SURF.map((s, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#8E91A3' }), b = P.box(0.54, s.cost * 0.26, 0.54, '#fff', { r: 0.04, material: m }); b.position.set(SX(i), 0, BZ); S.add(b);
      if (s.stale) { const t = P.box(0.54, 0.07, 0.54, '#8A5F3A', { r: 0.03 }); t.position.set(SX(i), s.cost * 0.26, BZ); S.add(t); }
      return { m };
    });
    /* a dot for each need under each surface: grey when the job doesn't need it, teal when this surface meets it, coral when it can't */
    const dots = SURF.map((s, i) => NEEDS.map((n, j) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.ball(0.06, '#fff', { material: m }); b.position.set(SX(i), 0.06, DZ(j)); S.add(b); return { b, m, n }; }));
    /* a gold ring round the smallest surface that fits; the robot stands at the one you chose; a lamp gives the verdict */
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.02, 8, 48), new THREE.MeshBasicMaterial({ color: SAF })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; ring.userData.noFit = true; S.add(ring);
    const bot = P.robot('#5B8DB8', { scale: 0.42 }); bot.userData.noFit = true; S.add(bot);
    const lamp = P.lamp(GOOD, { h: 0.4, r: 0.13 }); lamp.position.set(2.05, 0, BZ); S.add(lamp);
    S.add(P.keep(-2.55, 2.3, 1.15, -1.0, 1.3));

    let R = null;
    function draw() {
      R = judge(st);
      R.rows.forEach((r, i) => {
        blocks[i].m.color.set(r.id === st.pick ? (R.right ? GOOD : BAD) : r.fit ? '#7FB8AC' : '#8E91A3');
        dots[i].forEach(d => { const need = R.t.reqs.includes(d.n); d.b.scale.setScalar(need ? 1.25 : 0.7); d.m.color.set(!need ? OFF : r.missing.includes(d.n) ? BAD : GOOD); });
        if (r.id === R.best.id) ring.position.set(SX(i), 0.03, BZ);
        if (r.id === st.pick) bot.position.set(SX(i), 0, 1.0);
      });
      lamp.userData.set({ color: isOk() ? GOOD : RED, on: true });
    }
    function isOk() { return R.right; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Task', options: TASKS.map(t => t.n), get: () => st.task, act: i => set({ task: i, pick: TASKS[i].best }) },
      { type: 'buttons', label: 'Choose a surface', options: SURF.map(s => s.n), get: () => SURF.findIndex(s => s.id === st.pick), act: i => set({ pick: SURF[i].id }) },
    ];
    const readouts = [
      { label: 'Your choice', get: () => ({ v: R.pick.n, sub: R.right ? 'smallest fit' : 'not the best', good: R.right, bad: !R.right }) },
      { label: 'Smallest fit', get: () => ({ v: R.best.n, sub: 'meets every need', good: true, bad: false }) },
      { label: 'Surfaces that fit', get: () => ({ v: `${R.rows.filter(r => r.fit).length} of 6`, sub: R.t.n.split(' ').slice(0, 3).join(' '), good: true, bad: false }) },
    ];
    const labels = [
      { name: 's', t: 'Six surfaces', d: 'Taller means more upkeep', icon: 'box', atV: V(-2.38, 0.15, -0.55) },
      { name: 'n', t: 'What the job needs', d: 'Teal: met. Coral: missing', icon: 'check', atV: V(1.62, 0.08, 0.34) },
      { name: 't', t: 'The verdict', d: 'Gold ring: the smallest fit', icon: 'target', atV: V(2.18, 0.5, -0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Reuse last week\'s chat', hint: 'stale context', on: () => set({ task: 1, pick: 'old' }), off: reset },
      { label: 'Build an app for a one-off', hint: 'overengineering', on: () => set({ task: 0, pick: 'api' }), off: reset },
      { label: 'Paste a copy of live data', hint: 'goes stale by tomorrow', on: () => set({ task: 3, pick: 'project' }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.right) return { ok: true, msg: `<b>${r.pick.n} is the smallest surface that meets every need of "${r.t.n.toLowerCase()}".</b> ${r.rows.filter(x => x.fit && x.id !== r.best.id).length ? `${r.rows.filter(x => x.fit && x.id !== r.best.id).map(x => x.n).join(' and ')} would also work, but cost more setup and upkeep than the task needs.` : 'Nothing smaller would do.'}` };
      if (r.pick.stale) return { ok: false, msg: `<b>Last week\'s chat already holds old figures and assumptions, and they will quietly shape this week\'s brief.</b> Repeated work on stable documents belongs in a ${r.best.n} with an owner and a review date; one-off work starts in a new chat.` };
      if (r.pick.fit) return { ok: false, msg: `<b>${r.pick.n} would work for "${r.t.n.toLowerCase()}", but it is more machinery than the task needs.</b> ${r.best.n} meets every need with less setup and upkeep: choose the smallest sufficient surface.` };
      return { ok: false, msg: `<b>${r.pick.n} cannot carry "${r.t.n.toLowerCase()}": it has no way to handle ${r.pick.missing.map(m => NEEDN[m]).join(' or ')}.</b> ${r.best.n} is the smallest surface that meets every need.` };
    }
    return { update: dt => bot.userData.tick(dt), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Start from the work', home: true, say: 'Describe the task first: does it repeat, what knowledge, how fresh, what output, how risky, who shares it.', act: m => m.set({ task: 0, pick: 'new' }) },
    { t: 'A new chat', home: true, say: 'One email from a short text: a new chat is enough, and its clean context is a feature.', act: m => m.set({ task: 0, pick: 'new' }) },
    { t: 'Old context', home: true, say: 'Reuse last week\'s chat, and old figures leak into the new brief.', act: m => m.set({ task: 1, pick: 'old' }) },
    { t: 'A Project', home: true, say: 'Repeated work on the same brand guide fits a Project, with an owner and a review date.', act: m => m.set({ task: 1, pick: 'project' }) },
    { t: 'Live data', home: true, say: 'Stock levels change daily. A pasted copy goes stale; a connector reads the live sheet.', act: m => m.set({ task: 3, pick: 'connector' }) },
    { t: 'An application', home: true, say: 'Fifty thousand tickets into a typed schema, tested on every release, is software: build it.', act: m => m.set({ task: 4, pick: 'api' }) },
  ],
  check: [
    { q: 'What should you describe before choosing a surface?', options: ['The work: recurrence, knowledge, freshness, output, consequence, sharing', 'The newest features', 'The price list'], answer: 0, why: 'Then pick the smallest fit.', hint: 'Read the task card.' },
    { q: 'Why can reusing an old chat be risky?', options: ['It carries stale context into new work', 'It is slower', 'It cannot use files'], answer: 0, why: 'Restart when the objective changes.', hint: 'Try Reuse last week\'s chat.' },
    { q: 'When is an API application the right surface?', options: ['When you need a typed contract, owned authorisation or tests on every release', 'For any important task', 'Never'], answer: 0, why: 'Otherwise it is overengineering.', hint: 'Try Build an app for a one-off.' },
  ],
  practice: [
    { q: 'A manager needs one polished reply to a supplier, from a paragraph she pastes in. Which surface fits best?', options: ['A new chat', 'A Project with a knowledge base', 'A custom application', 'A connector to her inbox'], answer: 0, why: 'A bounded one-time task with supplied input needs nothing more.' },
    { q: 'A team writes the same weekly brief from a stable brand guide and style rules. What fits?', options: ['A Project with instructions, the guide, an owner and a review date', 'Last week\'s chat, continued', 'A new chat each week with nothing attached', 'An API application'], answer: 0, why: 'Repeated work on stable context; the owner keeps it current.' },
    { q: 'Inventory figures change every day. The current plan pastes them into a Project each Monday. What is the main risk?', options: ['Answers use a copy that is wrong by Tuesday', 'The Project is too small', 'The model is too slow', 'There is no risk'], answer: 0, why: 'Freshness: a live, permissioned connection fits better.' },
    { q: 'Before enabling a connector, what should be checked?', options: ['Whether it can change data, which permissions it inherits, and which actions need approval', 'Only that it exists', 'Its colour scheme', 'Nothing'], answer: 0, why: 'A connector trades copying for live access; the access needs limits.' },
    { q: 'A workflow must output records in a fixed schema and be tested automatically on every release. Which surface?', options: ['An application built on the API', 'A long chat', 'A Project', 'Research'], answer: 0, why: 'That contract is software behaviour the chat products do not express.' },
    { q: 'A long report from a research tool cites many sources. Is it ready to send to executives?', options: ['Not until the key claims are checked against their sources and dates', 'Yes: citations prove it', 'Yes, if it is long', 'Only if it used the largest model'], answer: 0, why: 'Citations point to evidence; they are not proof.' },
  ],
  terms: [
    ['Surface', 'Where the work happens: a chat, a Project, Research, a connector or an application.'],
    ['Project', 'Chats grouped with standing instructions and a knowledge base.'],
    ['Connector', 'Live, permissioned access to an external service.'],
    ['Stale context', 'Old messages or copies that no longer match the facts.'],
    ['Smallest sufficient', 'The least machinery that meets every requirement.'],
    ['Control plane', 'Who administers identity, billing and data for where Claude runs.'],
  ],
  deeper: '<p><b>Where Claude runs.</b> The work surface and the deployment path are separate choices: direct from Anthropic, or through a cloud provider\'s platform, each with its own identity, billing, regions and data terms to check.</p><p><b>Models.</b> Choose capability by measured need: a smaller, faster model is right when it meets the bar.</p><p><b>About this machine.</b> The firm and tasks are invented; product behaviour changes, so check the current official documentation.</p>',
  code: {
    title: 'Choose the smallest sufficient surface',
    note: 'Written for this lesson.',
    text: `
SURFACES = [  # (name, setup and upkeep cost, what it can carry)
    ("new chat", 1, {"short_input"}),
    ("project", 2, {"short_input", "recurring", "private_docs"}),
    ("research", 2, {"short_input", "many_sources"}),
    ("connector", 3, {"short_input", "recurring", "private_docs", "live_data"}),
    ("api application", 4, {"short_input", "recurring", "private_docs", "live_data", "many_sources", "typed_contract"}),
]

def choose(needs):
    fits = [(cost, name) for name, cost, can in SURFACES if needs <= can]
    return min(fits)[1] if fits else "redesign the task"

choose({"recurring", "private_docs"})          # -> "project"
`,
  },
};
