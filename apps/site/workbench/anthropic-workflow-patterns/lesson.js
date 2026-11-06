// Workflow patterns: a Nairobi solar-lantern company's support inbox (six messages) run through each of the five patterns and through an open agent.
// A scripted "model" classifies by keyword scores plus a deterministic per-call wobble, so a single call sometimes misroutes an ambiguous message
// and three votes fix it. Model calls, wall time (parallel calls share a round), correct routes and SMS length are counted live.
const MSGS = [
  { t: 'My lantern stopped charging after two weeks.', truth: 'repair' },
  { t: 'I want my money back, the lantern is broken.', truth: 'refund' },
  { t: 'Do you sell the three-bulb kit in Kisumu?', truth: 'sales' },
  { t: 'Broken lantern. Can you fix it, or refund me?', truth: 'repair' },
  { t: 'How much is delivery to Eldoret for two kits?', truth: 'sales' },
  { t: 'The solar panel cracked. Replace or money back?', truth: 'refund' },
];
const KW = { repair: ['charging', 'fix', 'stopped', 'cracked'], refund: ['money', 'refund', 'back'], sales: ['sell', 'kit', 'delivery', 'how much', 'price'] };
function classify(m, call) {
  const t = m.t.toLowerCase(), sc = {}; Object.entries(KW).forEach(([k, ws]) => { sc[k] = ws.filter(w => t.includes(w)).length; });
  let h = 2166136261; for (const c of call + m.t + call) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } h = (h ^ (h >>> 13)) >>> 0; h = Math.imul(h, 0x5bd1e995) >>> 0; h = (h ^ (h >>> 15)) >>> 0;
  const wob = ((h % 1000) / 1000) * 1.6 - 0.8; sc.repair += wob; sc.refund -= wob;
  return Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0];
}
const REPLY = { repair: 'Pole sana! Bring it to any agent shop; we fix it free under the one-year warranty.', refund: 'Sorry about that. Send the receipt photo and we will refund you within three days.', sales: 'Yes! The kit is in stock at our Kisumu and Eldoret agents. Delivery takes two days.' };
const LONG = ' We are also happy to tell you about our new solar fridges, radios and phone chargers, available in many sizes and colours.';
function run(pattern, o) {
  let calls = 0, rounds = 0, right = 0, sms = 0, steps = []; const per = [];
  MSGS.forEach((m, i) => {
    let route, text, r = 0;
    if (pattern === 'agent') {
      let x = 7 + i * 13; const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; };
      const n = 3 + Math.floor(rnd() * 7); calls += n; r += n; route = classify(m, 'a'); text = REPLY[route] + (rnd() < 0.5 ? LONG : ''); steps.push(n);
    } else if (pattern === 'chain') {
      route = classify(m, 'c'); text = REPLY[route] + LONG; calls += 2; r += 2;
      if (o.gate) { if (text.length > 160) { text = REPLY[route]; } }
      calls += 1; r += 1;
    } else if (pattern === 'route') {
      route = o.vote ? ['vote-a', 'vote-b', 'vote-c'].map(c => classify(m, c)).sort((a, b, A = ['vote-a', 'vote-b', 'vote-c'].map(c => classify(m, c))) => A.filter(z => z === b).length - A.filter(z => z === a).length)[0] : classify(m, 'r');
      calls += o.vote ? 4 : 2; r += 2; text = REPLY[route];
    } else if (pattern === 'parallel') {
      const A = ['vote-a', 'vote-b', 'vote-c'].map(c => classify(m, c)); route = ['repair', 'refund', 'sales'].sort((a, b) => A.filter(z => z === b).length - A.filter(z => z === a).length)[0]; calls += 4; r += o.parallel ? 2 : 4; text = REPLY[route];
    } else if (pattern === 'orchestrator') {
      route = classify(m, 'o'); const workers = route === 'sales' ? 2 : route === 'refund' ? 3 : 2; calls += 2 + workers; r += o.parallel ? 3 : 2 + workers; text = REPLY[route];
    } else {
      route = classify(m, 'e'); text = REPLY[route] + LONG; calls += 1; r += 1; let k = 0;
      while (k < 3) { calls += 1; r += 1; k++; if (text.length <= 160) break; calls += 1; r += 1; text = REPLY[route]; }
    }
    if (route === m.truth) right++; if (text.length <= 160) sms++; rounds += r; per.push({ route, fits: text.length <= 160 });
  });
  return { calls, rounds, right, sms, steps, per };
}
const PATTERNS = ['chain', 'route', 'parallel', 'orchestrator', 'evaluator', 'agent'];
const NAMES = { chain: 'Prompt chaining', route: 'Routing', parallel: 'Parallelisation', orchestrator: 'Orchestrator-workers', evaluator: 'Evaluator-optimizer', agent: 'Open agent' };
const FLOWS = {
  chain: ['draft reply', 'gate: ≤ 160 chars?', 'translate to Swahili'],
  route: ['classify', 'repair | refund | sales', 'specialist reply'],
  parallel: ['three votes on the route', 'warranty and stock checks', 'combine'],
  orchestrator: ['orchestrator plans', 'workers it picks', 'synthesise'],
  evaluator: ['draft', 'evaluate: fits an SMS?', 'revise'],
  agent: ['think', 'act', 'observe', 'repeat until done'],
};

export default {
  slug: 'anthropic-workflow-patterns',
  title: 'Workflow patterns: the simplest thing that works',
  description: 'A Nairobi solar-lantern company runs the same six support messages through five workflow patterns and an open agent. Compare cost and accuracy.',
  overview: 'A workflow runs models and tools along paths an engineer wrote; an agent decides its own next step. Workflows are cheaper, faster, bounded and easier to audit; agents are for open-ended work where the next step depends on what the last one found. Five workflow patterns cover most cases, all built on one model with retrieval, tools and memory. Prompt chaining passes one call\'s output to the next, with programmatic gates between steps. Routing classifies an input and sends it to a specialised handler; on ambiguous inputs, a few votes make the route more reliable than one call. Parallelisation runs independent calls at once, either on different sections of the work or as several votes on the same question. Orchestrator-workers has one call decide which workers to run for this input and then combine their results, without looping forever. Evaluator-optimizer has one call write and another check, revising until the check passes. Start with a direct call, add a pattern when it pays for itself, and reach for an agent only when the steps can\'t be predicted.',
  keywords: ['workflow patterns', 'prompt chaining', 'routing', 'orchestrator-workers', 'evaluator-optimizer', 'AI agents', 'building effective agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.95, 1.25], half: 1.3, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { p: 1, gate: true, vote: true, parallel: true }, st = { ...D0, t: 0 };
    const CHAR = '#2C2D31', GOLD = '#E3A72F', GOOD = '#1F9E89', RED = '#D9483B', BLUE = '#5B8DB8', PURPLE = '#7B6FA8', GREY = '#C9C4B6';
    const DESK = { repair: '#E07A5F', refund: '#8E6BB8', sales: '#7FB069' };
    /* the inbox: six messages as parcels, coloured by what they really are (orange repair, purple refund, green sales) */
    const IX = -2.65, inbox = P.box(0.85, 0.08, 1.25, '#3A3D4A', { r: 0.04 }); inbox.position.set(IX, 0, 0); S.add(inbox);
    MSGS.forEach((m, i) => { const b = P.box(0.26, 0.2, 0.26, DESK[m.truth], { r: 0.04 }); b.position.set(IX - 0.17 + (i % 2) * 0.34, 0.08, -0.4 + Math.floor(i / 2) * 0.4); S.add(b); });
    /* the pattern: stations the message passes through, top to bottom; gold is a check in code, red a missing one, purple the open agent's loop */
    const FX = -1.25, FZ = i => -0.75 + i * 0.5;
    const st4 = Array.from({ length: 4 }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.7, 0.28, 0.32, '#fff', { r: 0.05, material: m }); b.position.set(FX, 0, FZ(i)); S.add(b); return { b, m }; });
    const fan = [-1, 1].map(k => { const m = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.3, 0.28, 0.32, '#fff', { r: 0.05, material: m }); b.position.set(FX + k * 0.5, 0, FZ(1)); S.add(b); return { b, m }; });
    const bots = Array.from({ length: 4 }, (_, i) => { const r = P.robot(CHAR, { scale: 0.45 }); r.position.set(FX, 0.28, FZ(i)); S.add(r); return r; });
    const loop = P.tube([V(FX + 0.4, 0.2, FZ(0)), V(FX + 0.75, 0.2, FZ(0.5)), V(FX + 0.75, 0.2, FZ(2.5)), V(FX + 0.4, 0.2, FZ(3))], 0.035, PURPLE); S.add(loop);
    const mover = P.box(0.18, 0.14, 0.18, GOLD, { r: 0.03, material: new THREE.MeshLambertMaterial({ color: GOLD }) }); mover.userData.noFit = true; S.add(mover);
    /* three desks; each gets the messages routed to it. A parcel of another colour is misrouted; a tall parcel is a reply too long for one SMS */
    const DX = 0.15, DZ = { repair: -0.6, refund: 0, sales: 0.6 };
    Object.entries(DZ).forEach(([k, z]) => { const d = P.box(0.75, 0.12, 0.42, DESK[k], { r: 0.04 }); d.position.set(DX + 0.15, 0, z); S.add(d); });
    const out = MSGS.map(() => { const m = new THREE.MeshLambertMaterial({ color: '#fff' }), b = P.box(0.18, 1, 0.18, '#fff', { r: 0.03, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
    const deskLamps = Object.fromEntries(Object.entries(DZ).map(([k, z]) => { const l = P.lamp(GOOD, { h: 0.22, r: 0.07 }); l.position.set(DX + 0.65, 0, z); S.add(l); return [k, l]; }));
    /* every pattern side by side: a tower per pattern, as tall as its model calls for the same six messages; a red lamp when it got any wrong */
    const CX = i => 1.55 + i * 0.3, CZ = 0;
    const cmp = PATTERNS.map((q, i) => { const t = P.tower(0.24, 0.24, BLUE, { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(CX(i), 0, CZ); S.add(t); const l = P.lamp(GOOD, { h: 0.1, r: 0.06 }); l.position.set(CX(i), 0, CZ + 0.32); S.add(l); return { t, l }; });
    S.add(P.keep(-3.15, 3.3, 1.35, -1.05, 0.95));

    let R = null, ALL = null;
    function draw() {
      const p = PATTERNS[st.p];
      ALL = Object.fromEntries(PATTERNS.map(q => [q, run(q, st)])); R = ALL[p];
      const n = p === 'agent' ? 1 : FLOWS[p].length;
      st4.forEach((o, i) => { o.b.visible = i < n; bots[i].visible = i < n; const check = i === 1 && (p === 'chain' || p === 'evaluator'), broken = (p === 'chain' && i === 1 && !st.gate) || (p === 'route' && i === 0 && !st.vote);
        o.m.color.set(p === 'agent' ? PURPLE : broken ? RED : check ? GOLD : BLUE); o.b.scale.x = p === 'parallel' && i === 1 ? 0.43 : 1; });
      fan.forEach(f => { f.b.visible = p === 'parallel' || (p === 'route' && st.vote) || p === 'orchestrator'; f.b.position.z = FZ(p === 'route' ? 0 : 1); f.m.color.set(BLUE); });
      st4[0].b.scale.x = p === 'route' && st.vote ? 0.43 : st4[0].b.scale.x;
      loop.visible = p === 'agent' || p === 'evaluator';
      const count = { repair: 0, refund: 0, sales: 0 }, wrong = { repair: false, refund: false, sales: false };
      R.per.forEach((x, i) => { const o = out[i], k = count[x.route]++, h = x.fits ? 0.16 : 0.42; o.b.scale.y = h; o.b.position.set(DX - 0.07 + k * 0.22, 0.12, DZ[x.route]); o.m.color.set(DESK[MSGS[i].truth]); if (x.route !== MSGS[i].truth || !x.fits) wrong[x.route] = true; });
      Object.entries(deskLamps).forEach(([k, l]) => l.userData.set({ color: wrong[k] ? RED : GOOD, on: true }));
      const mx = Math.max(...PATTERNS.map(q => ALL[q].calls));
      cmp.forEach((c, i) => { const q = PATTERNS[i], A = ALL[q]; c.t.userData.set({ h: 0.06 + 1.0 * A.calls / mx, color: q === p ? GOLD : q === 'agent' ? PURPLE : BLUE }); c.l.userData.set({ color: A.right < 6 || A.sms < 6 ? RED : GOOD, on: true }); });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Pattern', options: ['Chain', 'Route', 'Parallel', 'Orchestrator', 'Evaluator', 'Agent'], get: () => st.p, act: i => set({ p: i }) },
      { type: 'toggle', label: 'Gate between chain steps', short: 'Gate', get: () => st.gate, set: v => set({ gate: !!v }) },
      { type: 'toggle', label: 'Route by three votes', short: 'Vote', get: () => st.vote, set: v => set({ vote: !!v }) },
      { type: 'toggle', label: 'Run independent calls in parallel', short: 'Parallel', get: () => st.parallel, set: v => set({ parallel: !!v }) },
    ];
    const readouts = [
      { label: 'Model calls', get: () => ({ v: String(R.calls), sub: 'for six messages' }) },
      { label: 'Routed right', get: () => ({ v: `${R.right} of 6`, sub: NAMES[PATTERNS[st.p]], good: R.right === 6, bad: R.right < 6 }) },
      { label: 'Fits an SMS', get: () => ({ v: `${R.sms} of 6`, sub: '160 characters', good: R.sms === 6, bad: R.sms < 6 }) },
    ];
    const labels = [
      { name: 'inbox', t: 'The inbox', d: 'Six messages: orange repair, purple refund, green sales', icon: 'box', atV: V(IX - 0.45, 0.2, -0.4) },
      { name: 'flow', t: 'The pattern', d: 'The stations each message passes. Gold: a check in code. Red: a check that is missing. Purple: an open agent looping', icon: 'link', atV: V(IX - 0.45, 0.2, 0.4) },
      { name: 'desks', t: 'Repair, refund, sales', d: 'Each desk gets the messages routed to it. Another colour: misrouted. A tall parcel: too long for one SMS', icon: 'check', atV: V(DX + 0.75, 0.3, 0) },
      { name: 'cmp', t: 'Every pattern', d: 'Chain, route, parallel, orchestrator, evaluator, agent: a tower per pattern, as tall as its model calls. Red lamp: some reply wrong', icon: 'scale', atV: V(CX(5) + 0.2, 0.3, CZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Give everything to an agent', hint: 'no fixed path', on: () => set({ ...D0, p: 5 }), off: reset },
      { label: 'Route on a single call', hint: 'no votes', on: () => set({ ...D0, p: 1, vote: false }), off: reset },
      { label: 'Drop the gate in the chain', hint: 'long replies go out', on: () => set({ ...D0, p: 0, gate: false }), off: reset },
    ];
    function status() {
      const p = PATTERNS[st.p];
      if (p === 'agent') return { ok: false, msg: `<b>The open agent spent ${R.calls} model calls on six predictable messages (between ${Math.min(...R.steps)} and ${Math.max(...R.steps)} steps each), and ${6 - R.sms} replies ran past one SMS.</b> These messages follow a known path: classify, reply. A router does it in ${ALL.route.calls} calls, bounded and auditable. Keep agents for work whose steps you can't predict.` };
      if (p === 'route' && !st.vote && R.right < 6) return { ok: false, msg: `<b>Routing on one call sends ${6 - R.right} ambiguous message${6 - R.right > 1 ? 's' : ''} to the wrong desk.</b> "Can you fix it, or refund me?" sits between repair and refund, and one call can tip either way. Three votes (parallelisation by voting) settle it, at ${ALL.route.calls} calls instead of ${R.calls}.` };
      if (p === 'chain' && !st.gate) return { ok: false, msg: `<b>Without the gate, the drafts run on into a sales pitch and go to translation as they are: ${6 - R.sms} of 6 replies don't fit one SMS.</b> A chain should check each step's output in code before passing it on; here, a length check trims the reply before it is translated.` };
      return { ok: R.right === 6 && R.sms === 6, msg: `<b>${NAMES[p]}: ${R.right} of 6 routed right, ${R.sms} of 6 fit an SMS, ${R.calls} model calls, ${R.rounds} rounds of waiting.</b> ${{ chain: 'Draft, gate, translate: each step checked before the next.', route: 'Classified by three votes, then handled by the right specialist.', parallel: st.parallel ? 'Independent checks run at once, so they cost calls but not time.' : 'Run one after another, the same checks take twice as many rounds.', orchestrator: 'The orchestrator picked the workers each message needed, then combined them.', evaluator: 'The evaluator caught the long drafts and the writer trimmed them.' }[p]}` };
    }
    return { update: dt => { st.t += dt; const n = PATTERNS[st.p] === 'agent' ? 1 : FLOWS[PATTERNS[st.p]].length, u = (st.t * 0.6) % Math.max(1, n); mover.position.set(FX, 0.32 + 0.28, FZ(Math.min(n - 1, u))); if (PATTERNS[st.p] === 'agent') mover.position.set(FX + 0.55 * Math.cos(st.t * 2), 0.6, FZ(0) + 0.3 * Math.sin(st.t * 2)); bots.forEach(b => { b.userData.tick(dt); b.userData.set({ busy: true }); }); cmp.forEach(c => c.t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One inbox', home: true, say: 'A solar-lantern company in Nairobi gets repair requests, refund requests and sales questions. The same six messages go through each pattern.', act: m => m.set({ p: 1, gate: true, vote: true, parallel: true }) },
    { t: 'Routing', home: true, say: 'A router classifies each message and sends it to the right desk. Three votes settle the ambiguous ones.', act: m => m.set({ p: 1 }) },
    { t: 'A chain with a gate', home: true, say: 'Draft a reply, check it in code, then translate it. The gate keeps every reply within one text message.', act: m => m.set({ p: 0 }) },
    { t: 'In parallel', home: true, say: 'Independent checks, warranty, stock and address, run at the same time: more calls, no extra waiting.', act: m => m.set({ p: 2 }) },
    { t: 'Orchestrator and evaluator', home: true, say: 'An orchestrator picks the workers each message needs. An evaluator checks each draft and sends it back if it is too long.', act: m => m.set({ p: 3 }) },
    { t: 'The agent', home: true, say: 'An open agent decides its own steps. On predictable work, it costs far more and is harder to audit.', act: m => m.set({ p: 5 }) },
  ],
  check: [
    { q: 'What separates a workflow from an agent?', options: ['In a workflow the engineer writes the path; an agent chooses its own steps', 'Workflows use smaller models', 'Agents can\'t use tools'], answer: 0, why: 'Workflows are bounded and auditable.', hint: 'Compare Agent with Route.' },
    { q: 'Why vote when routing ambiguous messages?', options: ['Several independent calls are more reliable than one', 'It is cheaper', 'To use more tools'], answer: 0, why: 'Parallelisation by voting.', hint: 'Try Route on a single call.' },
    { q: 'What does a gate in a prompt chain do?', options: ['Checks a step\'s output in code before the next step', 'Translates text', 'Picks a model'], answer: 0, why: 'Catch problems before passing them on.', hint: 'Try Drop the gate in the chain.' },
  ],
  terms: [
    ['Workflow', 'Models and tools along a path the engineer wrote.'],
    ['Agent', 'A model that decides its own next steps.'],
    ['Prompt chaining', 'One call\'s output feeds the next, with gates between.'],
    ['Routing', 'Classify an input, then send it to a specialised handler.'],
    ['Orchestrator-workers', 'One call picks workers for this input and combines them.'],
    ['Evaluator-optimizer', 'One call writes, another checks, until it passes.'],
  ],
  deeper: '<p><b>The augmented model.</b> Every pattern is built from one model call with retrieval, tools and memory available.</p><p><b>When agents win.</b> Open-ended research, tasks of unknown length, and new domains where the right workflow isn\'t known yet: explore with an agent, then codify what works.</p><p><b>Context as a budget.</b> The context window is a budget to spend, not a container to fill; what to include and when to compact is its own discipline.</p><p><b>About this machine.</b> The classifier is keyword scores plus a fixed per-call wobble; calls, rounds of waiting, routes and SMS lengths are counted live for every pattern.</p>',
  code: {
    title: 'Route by votes, gate a chain',
    note: 'Adapted from the course\'s workflow-patterns lesson.',
    text: `
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

def route(message, classify, handlers, votes=3):
    with ThreadPoolExecutor() as pool:                 # parallel: one round of waiting
        labels = list(pool.map(lambda _: classify(message), range(votes)))
    label = Counter(labels).most_common(1)[0][0]
    return handlers[label](message)

def chain(message, draft, translate, limit=160):
    text = draft(message)
    if len(text) > limit:                              # a gate, in code
        text = draft(message, instructions=f"at most {limit} characters")
    return translate(text, "sw")
`,
  },
};
