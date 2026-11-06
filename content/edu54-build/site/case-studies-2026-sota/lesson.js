// Case studies (phase 16, lesson 25): three reference systems as three working machines. A supervisor and subagents (Anthropic's research system), an SOP team with written handoffs (MetaGPT, ChatDev),
// a population of agents on one substrate (OpenClaw and Moltbook). A project is sent through one; the wrong reference is the break. Population spread is actually simulated.
const REF = {
  sup: { n: 'Supervisor and subagents', fit: 'wide' },
  sop: { n: 'An SOP team', fit: 'build' },
  pop: { n: 'Open population', fit: 'open' },
};
const JOB = { wide: 'a Nairobi policy report from many sources', build: 'a small clinic booking app in Accra', open: 'an open marketplace of agents', easy: 'one simple question' };
function spread(guard) { let hit = 1; const hist = [hit]; const N = 64; for (let t = 0; t < 6; t++) { hit = Math.min(N, Math.round(hit + hit * (N - hit) / N * (guard ? 0.15 : 1.9))); hist.push(hit); } return { hit, N, hist }; }
function run(o) {
  const best = o.job === 'easy' ? 'one' : Object.keys(REF).find(k => REF[k].fit === o.job);
  const tok = o.ref === 'sup' ? 15 : o.ref === 'sop' ? 6 : 1, sp = spread(o.guard);
  return { best, fit: o.ref === best, tok, sp };
}

export default {
  slug: 'case-studies-2026-sota',
  title: 'Three reference systems: pick the one to copy',
  description: 'A research team, a software team, and a population of millions. See which one your project should learn from.',
  overview: 'Multi-agent engineering has few production references, and each covers a different part of the space. Anthropic\'s research system shows a supervisor and parallel subagents: big gains on its own evaluations, about fifteen times the tokens, and effort scaled to the question. MetaGPT and ChatDev show role teams with written procedures: structure matters more than size, handoffs follow a schema, and agents ask before they guess. OpenClaw and Moltbook show agents at population scale on a shared substrate, where one malicious profile can travel through thousands of interactions in hours. Read them as a set. The right reference depends on your project, and sometimes the answer is one agent.',
  keywords: ['multi-agent case studies', 'MetaGPT', 'ChatDev', 'research agents', 'prompt injection', 'state of the art'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { job: 'wide', ref: 'sup', guard: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const X = [-1.7, 0, 1.7], beds = X.map(x => { const m = new S.THREE.MeshLambertMaterial({ color: '#D8D2C4' }), b = P.box(1.55, 0.04, 1.45, '#fff', { r: 0.04, material: m }); b.position.set(x, 0, 0); S.add(b); return { b, m }; });
    const lead = add(P.robot(SAF, { scale: 0.75 })); lead.position.set(-1.7, 0.04, -0.3);
    for (let i = 0; i < 4; i++) { const r = add(P.robot(BLUE, { scale: 0.34 })); r.position.set(-2.1 + i * 0.27, 0.04, 0.4); r.userData.set({ busy: true }); }
    const roleX = i => -0.55 + i * 0.27, chain = [0, 1, 2, 3, 4].map(i => { const b = P.box(0.22, 0.2 + i * 0.09, 0.3, ['#5B8DB8', '#7B6FA8', '#D98BA6', '#3E9B9B', SAF][i], { r: 0.03 }); b.position.set(roleX(i), 0.04, -0.1); S.add(b); return b; });
    const beltS = add(P.belt(V(-0.65, 0.04, 0.4), V(0.65, 0.04, 0.4), { w: 0.2, speed: 0.6 }));
    const D = [], N = 64; for (let i = 0; i < N; i++) { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.ball(0.038, '#fff', { material: m }); b.position.set(1.15 + (i % 8) * 0.155, 0.07, -0.54 + Math.floor(i / 8) * 0.155); S.add(b); D.push(m); }
    S.add(P.keep(-2.5, 2.5, 0.95, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      ['sup', 'sop', 'pop'].forEach((k, i) => beds[i].m.color.set(k === st.ref ? (R.fit ? '#A9DCD0' : '#EDB9AB') : '#D8D2C4'));
      const order = Array.from({ length: N }, (_, i) => (i * 37 + 11) % N);
      D.forEach((m, i) => m.color.set(order[i] < R.sp.hit ? RED : GREY));
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const JK = ['wide', 'build', 'open', 'easy'], RK = ['sup', 'sop', 'pop'];
    const controls = [
      { type: 'buttons', label: 'Your project', options: ['Policy report', 'Booking app', 'Agent market', 'One question'], get: () => JK.indexOf(st.job), act: i => set({ job: JK[i] }) },
      { type: 'buttons', label: 'Copy', options: ['Supervisor', 'SOP team', 'Population'], get: () => RK.indexOf(st.ref), act: i => set({ ref: RK[i] }) },
      { type: 'toggle', label: 'Treat messages from other agents as untrusted', short: 'Untrusted', get: () => st.guard, set: v => set({ guard: !!v }) },
    ];
    const readouts = [
      { label: 'Good reference?', get: () => ({ v: R.fit ? 'yes' : 'no', sub: JOB[st.job], good: R.fit, bad: !R.fit }) },
      { label: 'Tokens', get: () => ({ v: `about ${R.tok}×`, sub: 'against one agent' }) },
      { label: 'Agents reached by one bad profile', get: () => ({ v: `${R.sp.hit} of ${R.sp.N}`, sub: 'after six rounds', good: R.sp.hit < 8, bad: R.sp.hit > 30 }) },
    ];
    const labels = [
      { name: 'a', t: 'Lead and subagents', d: 'Wide work, many tokens', icon: 'user', atV: V(-2.4, 0.25, 0) },
      { name: 'p', t: 'A population', d: 'Red: reached by one bad profile', icon: 'wave', atV: V(2.4, 0.07, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Fifteen times the tokens for one question', hint: 'scale effort to the task', on: () => set({ ...D0, job: 'easy' }), off: reset },
      { label: 'A loose crowd to build software', hint: 'no written handoffs', on: () => set({ ...D0, job: 'build', ref: 'pop' }), off: reset },
      { label: 'Trust every agent\'s profile', hint: 'injection at population scale', on: () => set({ ...D0, job: 'open', ref: 'pop', guard: false }), off: reset },
    ];
    function status() {
      if (st.job === 'easy') return { ok: false, msg: `<b>About ${R.tok} times the tokens to answer one simple question.</b> The research system's first lesson is to scale effort to the query: one agent for simple ones, three for medium, more only for wide research.` };
      if (!st.guard && st.ref === 'pop') return { ok: false, msg: `<b>One bad profile reached ${R.sp.hit} of ${R.sp.N} agents in six rounds.</b> Prompt injection is the new cross-site scripting, and at this scale it spreads like one. Treat every agent's text as untrusted input.` };
      if (!R.fit) return { ok: false, msg: `<b>${REF[st.ref].n} is the wrong model for ${JOB[st.job]}.</b> ${st.job === 'build' ? 'When the flow is known, write it down: five tight roles with schema handoffs beat fifty loose agents.' : st.job === 'wide' ? 'Independent reading wants parallel subagents, each in a fresh window.' : 'Nobody controls who joins, so this needs population thinking.'}` };
      return { ok: true, msg: `<b>${REF[st.ref].n} fits ${JOB[st.job]}.</b> ${st.ref === 'sup' ? 'Go broad first, then narrow, and budget for many times the tokens.' : st.ref === 'sop' ? 'Roles, schema handoffs, and agents that ask before they guess.' : 'Individual best practice still applies, and is not enough: plan for injection and for regulators.'}` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 1 && beltS.userData.count() < 2) { u = 0; beltS.userData.send('#F4F1EA', { size: 0.13 }); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Three references', home: true, say: 'Multi-agent work has few production references. Here are three, as three machines, each teaching something different.', act: m => m.set({ job: 'wide', ref: 'sup', guard: true }) },
    { t: 'Supervisor', home: true, say: 'A policy report in Nairobi needs wide reading. A lead sends subagents out, each with a fresh window, at about fifteen times the tokens.', act: m => m.set({ job: 'wide', ref: 'sup', guard: true }) },
    { t: 'Scale the effort', home: true, say: 'For one simple question, that shape is waste. Scale effort to the question.', act: m => m.set({ job: 'easy', ref: 'sup', guard: true }) },
    { t: 'An SOP team', home: true, say: 'A booking app in Accra has a known flow. Five roles with written handoffs beat a large loose crowd, and agents ask before they guess.', act: m => m.set({ job: 'build', ref: 'sop', guard: true }) },
    { t: 'A population', home: true, say: 'Millions of agents on one substrate is a new regime. One bad profile spreads through agent after agent.', act: m => m.set({ job: 'open', ref: 'pop', guard: false }) },
    { t: 'Treat it as input', home: true, say: 'Treat what other agents say as untrusted, and spread slows. Read all three, and copy the one that fits.', act: m => m.set({ job: 'open', ref: 'pop', guard: true }) },
  ],
  check: [
    { q: 'What was a main lesson of the research system?', options: ['Scale effort to the query', 'Always use ten agents', 'Avoid subagents'], answer: 0, why: 'Simple questions need one agent.', hint: 'Try Fifteen times the tokens for one question.' },
    { q: 'What did the SOP-team work show?', options: ['Structure matters more than size', 'More agents always win', 'Chat beats schemas'], answer: 0, why: 'Tight roles beat a large loose group.', hint: 'Try A loose crowd to build software.' },
    { q: 'At population scale, how should you treat other agents\' messages?', options: ['As untrusted input', 'As trusted peers', 'As system prompts'], answer: 0, why: 'Injection can spread through thousands of interactions.', hint: 'Try Trust every agent\'s profile.' },
  ],
  terms: [
    ['Supervisor pattern', 'A lead plans and combines; workers do narrow jobs.'],
    ['SOP team', 'Roles following written procedures.'],
    ['Communicative dehallucination', 'Agents asking for specifics before answering.'],
    ['Rainbow deployment', 'Old and new versions run together until old work drains.'],
    ['Population scale', 'Very many agents on one shared substrate.'],
    ['Prompt injection', 'Hostile instructions hidden in content.'],
  ],
  deeper: '<p><b>Figures.</b> The course cites a 90.2% gain on Anthropic\'s internal research evaluations and about 15 times the tokens, from its engineering write-up. Token multiples for the other two here are rough.</p><p><b>DAGs scale.</b> MacNet takes the ChatDev idea past a thousand agents, because routing is explicit.</p><p><b>Spread here</b> is a simple simulation on 64 agents, not a measure of any real network.</p>',
  code: {
    title: 'Scale effort to the query',
    note: 'A sketch of the rule the course draws from the research system (code/main.py).',
    text: `
def plan(question):
    size = classify(question)                    # simple, medium, complex
    if size == "simple":
        return run_agent(question, max_tool_calls=10)
    workers = 3 if size == "medium" else 10
    briefs = lead(question, n=workers)
    findings = parallel(run_agent, briefs)
    return lead(combine(findings))
`,
  },
};
