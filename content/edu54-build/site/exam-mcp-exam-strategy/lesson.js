// Exam prep, MCPA strategy: a candidate in Mombasa plans study hours for the MCP Associate blueprint's five domains (16, 14, 26, 24 and 20
// percent). Hours split by weight; readiness is the weighted average of practice accuracy, not the plain average, so strength in a light
// domain cannot hide weakness in a heavy one. A question reader flags legacy-era distractors: a handshake before the first request, a session
// that remembers state, and error codes that mean something else in the 2026-07-28 release. Practice scores are illustrative.
const DOM = [
  { n: 'Fundamentals', w: 16, acc: 90 },
  { n: 'Architecture', w: 14, acc: 85 },
  { n: 'Interactions', w: 26, acc: 60 },
  { n: 'Security', w: 24, acc: 65 },
  { n: 'Use cases', w: 20, acc: 92 },
];
const QS = [
  { q: 'A client talks to a 2026-07-28 server. What must it send first?', o: [
    ['an initialize request', 'handshake'], ['any request with version and capabilities in _meta', null], ['a session id header', 'session'], ['a ping', 'removed method']] },
  { q: 'The model calls a tool the server does not have. What comes back?', o: [
    ['error -32601', 'wrong code: unknown method'], ['error -32602', null], ['a result with isError true', 'that is for bad arguments'], ['error -32002', 'legacy code']] },
  { q: 'How does a server keep a cart across calls?', o: [
    ['in the session', 'session'], ['a server-minted handle passed back as an argument', null], ['the Mcp-Session-Id header', 'session'], ['a sticky load balancer', 'connection state']] },
];

function run(o) {
  const hours = DOM.map(d => (o.weighted ? o.total * d.w / 100 : o.total / 5));
  const plain = DOM.reduce((a, d) => a + d.acc, 0) / 5;
  const weighted = DOM.reduce((a, d) => a + d.acc * d.w / 100, 0);
  const shown = o.wready ? weighted : plain;
  return { hours, plain, weighted, shown, ok: o.weighted && o.wready && o.flag };
}

export default {
  slug: 'exam-mcp-exam-strategy',
  title: 'Exam prep, MCP: the blueprint is a study budget',
  description: 'The MCP Associate blueprint has five weighted domains. Spend your hours by weight, and read readiness honestly, not as a flattering plain average.',
  overview: 'A syllabus lists what might appear; a blueprint says how much of the exam each part is. The MCP Associate blueprint has five domains: MCP Fundamentals (16 percent), Architecture and Components (14), Interactions and Execution (26), Security and Governance (24) and Use Cases and Ecosystem (20), which total 100. Use the weights as a study budget: hours for a domain are your total hours times its weight. Measure readiness the same way. A plain average of practice accuracy treats a 14 percent domain like a 26 percent one, so strength in a light domain can hide weakness in a heavy one; a weighted average follows the exam\'s own emphasis. The exam is online, proctored and multiple choice, aligned to the MCP specification dated 2026-07-28. The certification page gives a 90-minute duration while the launch announcement says 120; neither source publishes the number of items or the passing score, so the only honest target is solid competence across every domain, not a count of right answers. Read each question for legacy-era distractors, because older tutorials describe MCP as it was before 2026-07-28. Three reflexes help. Any option with a handshake or version negotiation before the first real request is a tell: in 2026-07-28 every request carries its protocol version and capabilities in _meta. Any option that relies on a session to remember state is a tell: the core is stateless, and cross-request state travels as an explicit server-minted handle. And check error codes: an unknown tool is -32602, not -32601 (unknown method), and an argument that fails a tool\'s schema is a normal result with isError true that the model can correct. Practice scores here are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'blueprint', 'study plan', 'weighted readiness', 'legacy distractors', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, 0], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { total: 40, weighted: true, wready: true, flag: true, q: 0 }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* one tower of study hours per domain; the gold slab marks what the blueprint weight asks for */
    const HS = 0.035;
    const cols = DOM.map((d, i) => {
      const x = -2.0 + i * 0.5, t = P.tower(0.34, 0.34, BLUE, { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(x, 0, -0.2); S.add(t);
      const slab = P.box(0.44, 0.03, 0.05, SAF, { r: 0.005 }); slab.userData.noFit = true; slab.position.set(x, 0, -0.42); S.add(slab);
      const l = P.lamp(d.acc < 70 ? RED : GOOD, { h: 0.1, r: 0.08 }); l.position.set(x, 0, 0.3); S.add(l);
      return { t, slab };
    });
    /* readiness: one tall tower against the bar */
    const ready = P.tower(0.4, 0.4, GOOD, { h: 0.6 }); ready.userData.set({ cap: '' }); ready.position.set(0.55, 0, -0.2); S.add(ready);
    /* four answer pads for the practice question: flagged ones turn red, the true one stays teal */
    const opts = [0, 1, 2, 3].map(i => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.3, 0.1, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(1.2 + (i % 2) * 0.4, 0, -0.32 + Math.floor(i / 2) * 0.42); S.add(b); return m; });
    S.add(P.keep(-2.4, 1.95, 1.0, -0.6, 0.6));
    const parts = [...cols.map(c => c.t), ready];

    let R = null;
    function draw() {
      R = run(st);
      cols.forEach((c, i) => {
        const d = DOM[i], short = !st.weighted && d.w > 20;
        c.t.userData.set({ h: R.hours[i] * HS, color: short ? RED : BLUE });
        c.slab.position.y = st.total * d.w / 100 * HS;
      });
      ready.userData.set({ h: R.shown / 100, color: st.wready ? GOOD : SAF });
      const Q = QS[st.q];
      opts.forEach((m, i) => m.color.set(!st.flag ? OFF : Q.o[i][1] ? RED : GOOD));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Split hours by blueprint weight', short: 'Hours by weight', get: () => st.weighted, set: v => set({ weighted: !!v }) },
      { type: 'toggle', label: 'Weighted readiness, not the plain average', short: 'Weighted readiness', get: () => st.wready, set: v => set({ wready: !!v }) },
      { type: 'toggle', label: 'Flag legacy-era distractors', short: 'Legacy filter', get: () => st.flag, set: v => set({ flag: !!v }) },
      { type: 'slider', label: 'Study hours', min: 10, max: 80, step: 5, fmt: v => `${v} h`, get: () => st.total, set: v => set({ total: +v }) },
      { type: 'buttons', label: 'Practice question', options: ['handshake', 'unknown tool', 'cart state'], get: () => st.q, act: i => set({ q: i }) },
    ];
    const readouts = [
      { label: 'Readiness', get: () => ({ v: `${R.shown.toFixed(1)}%`, sub: st.wready ? 'weighted' : 'plain average', good: st.wready, bad: !st.wready }) },
      { label: 'Interactions hours', get: () => ({ v: `${R.hours[2].toFixed(1)} h`, sub: `of ${st.total}, weight 26%`, good: st.weighted, bad: !st.weighted }) },
    ];
    const labels = [
      { name: 'b', t: 'Hours per domain', d: 'Gold slab: what the weight asks', icon: 'chart', atV: V(-2.2, 0.3, -0.2) },
      { name: 't', t: 'Answer pads', d: 'Red: a legacy-era distractor', icon: 'target', atV: V(1.78, 0.08, -0.1) },
    ];
    const reset = () => set({ ...D0, total: st.total, q: st.q });
    const breaks = [
      { label: 'Split hours evenly', hint: 'the heavy domains go short', on: () => set({ ...D0, weighted: false }), off: reset },
      { label: 'Trust the plain average', hint: 'light domains hide heavy gaps', on: () => set({ ...D0, wready: false }), off: reset },
      { label: 'Answer from old tutorials', hint: 'a handshake looks fluent', on: () => set({ ...D0, flag: false, q: 0 }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>Hours follow the blueprint, so Interactions gets ${R.hours[2].toFixed(1)} of ${st.total}; weighted readiness is ${R.weighted.toFixed(1)}%, below the plain ${R.plain.toFixed(1)}% because the weak domains are the heavy ones; and the legacy tells in "${QS[st.q].q}" are flagged.</b>` };
      const f = [];
      if (!st.weighted) f.push(`an even split gives Interactions ${R.hours[2].toFixed(1)} hours instead of ${(st.total * 0.26).toFixed(1)}, though it is 26% of the exam`);
      if (!st.wready) f.push(`the plain average says ${R.plain.toFixed(1)}%, but weighting by the blueprint gives ${R.weighted.toFixed(1)}%: strong light domains hide the weak heavy ones`);
      if (!st.flag) f.push('without the legacy filter, fluent options describing a handshake, a session or an old error code look as plausible as the 2026-07-28 answer');
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Five domains', home: true, say: 'The blueprint has five weighted domains. Interactions and Security together are half the exam.', act: m => m.set({ weighted: false, wready: false, flag: false, q: 0, total: 40 }) },
    { t: 'Hours by weight', home: true, say: 'Split the study hours by weight, so the heaviest domains get the most time.', act: m => m.set({ weighted: true, wready: false, flag: false, q: 0, total: 40 }) },
    { t: 'Weighted readiness', home: true, say: 'A plain average lets a strong light domain hide a weak heavy one. Weight it.', act: m => m.set({ weighted: true, wready: true, flag: false, q: 0, total: 40 }) },
    { t: 'No handshake', home: true, say: 'In this release every request carries its own version. An initialize step is a legacy tell.', act: m => m.set({ weighted: true, wready: true, flag: true, q: 0, total: 40 }) },
    { t: 'The right code', home: true, say: 'An unknown tool is invalid params, not method not found. Check the code\'s meaning.', act: m => m.set({ weighted: true, wready: true, flag: true, q: 1, total: 40 }) },
    { t: 'No sessions', home: true, say: 'State across calls travels as a handle the server mints and the client passes back.', act: m => m.set({ weighted: true, wready: true, flag: true, q: 2, total: 40 }) },
  ],
  check: [
    { q: 'Which two domains carry the most weight?', options: ['Interactions and Execution, Security and Governance', 'Fundamentals and Architecture', 'Use Cases and Fundamentals'], answer: 0, why: '26 and 24 percent.', hint: 'Try Split hours evenly.' },
    { q: 'Why weight readiness by the blueprint?', options: ['A plain average lets light domains hide heavy gaps', 'It always gives a higher number', 'The exam publishes a pass mark'], answer: 0, why: 'Follow the exam\'s emphasis.', hint: 'Try Trust the plain average.' },
    { q: 'An option says the client first sends initialize. For a 2026-07-28 question, it is…', options: ['A legacy-era distractor', 'The right answer', 'Required on HTTP only'], answer: 0, why: 'Every request carries version and capabilities in _meta.', hint: 'Try Answer from old tutorials.' },
  ],
  practice: [
    { q: 'With 50 study hours, how many go to a domain weighted 24%?', options: ['12', '10', '24', '5'], answer: 0, why: '50 × 24 ÷ 100.' },
    { q: 'Neither official source publishes the passing score. What is the honest readiness target?', options: ['Solid competence across every domain', 'Exactly 70%', '45 of 60 questions', 'Whatever a forum says'], answer: 0, why: 'Do not invent a cut score.' },
    { q: 'The certification page and the launch announcement give different durations. What should you do?', options: ['Note both, follow the exam page and recheck before the exam', 'Pick the longer one', 'Ignore duration', 'Assume no limit'], answer: 0, why: 'Record discrepancies, do not hide them.' },
    { q: 'A tool argument fails the tool\'s input schema. What comes back in 2026-07-28?', options: ['A normal result with isError true', 'Error -32602', 'Error -32601', 'No response'], answer: 0, why: 'The model can read it and correct the call.' },
    { q: 'Which option is most likely a legacy-era distractor?', options: ['"The server keeps this in the session."', '"Pass the handle back as an argument."', '"Include protocolVersion in _meta."', '"Use -32602 for an unknown tool."'], answer: 0, why: 'The core is stateless.' },
    { q: 'Which specification version is the exam aligned to?', options: ['2026-07-28', '2024-11-05', '2025-03-26', 'Whatever the SDK ships'], answer: 0, why: 'The current release.' },
  ],
  terms: [
    ['Blueprint', 'The published domains and their weights.'],
    ['Domain weight', 'The share of exam content a domain represents.'],
    ['Study budget', 'Total hours split across domains by weight.'],
    ['Weighted readiness', 'Practice accuracy weighted by domain.'],
    ['Legacy-era distractor', 'A wrong option describing MCP before 2026-07-28.'],
    ['Unpublished fact', 'A detail, such as item count or pass mark, no source states.'],
  ],
  deeper: '<p><b>Three reflexes.</b> A step before the first real request, a session that remembers, an error code that means something else: each is a sign the option was written for an older release.</p><p><b>Route.</b> The following lessons cover the five domains in order, ending with a capstone that exercises all of them.</p><p><b>About this machine.</b> The practice scores are invented.</p>',
  code: {
    title: 'Hours and readiness by weight',
    note: 'Written for this lesson.',
    text: `
WEIGHTS = {"fundamentals": 16, "architecture": 14, "interactions": 26,
           "security": 24, "use_cases": 20}
assert sum(WEIGHTS.values()) == 100

def allocate(total_hours):
    return {d: total_hours * w / 100 for d, w in WEIGHTS.items()}

def readiness(accuracy):                      # accuracy per domain, 0..1
    return sum(accuracy[d] * w / 100 for d, w in WEIGHTS.items())

acc = {"fundamentals": .90, "architecture": .85, "interactions": .60,
       "security": .65, "use_cases": .92}
print(allocate(40), f"{readiness(acc):.3f}", f"{sum(acc.values()) / 5:.3f}")
`,
  },
};
