// Generative agents (phase 16, lesson 17): ten generative agents in a market town near Kisumu go about three days. Only the coach is seeded with
// a goal: a football match at the school ground on Saturday at four. Each agent keeps a memory stream, retrieves the top three memories by
// recency, importance and relevance, may reflect ("there is a match on Saturday") and plans its day. News spreads only through who meets whom;
// switching off observation, reflection or planning, or weighting recency over importance, changes who turns up. Simulated live.
const WHO = ['coach', 'baker', 'teacher', 'boda rider', 'tailor', 'nurse', 'fisher', 'shopkeeper', 'student', 'farmer'];
const DAYS = [[[0, 1], [0, 2], [3, 4], [5, 6], [7, 8]], [[1, 3], [2, 5], [4, 9], [6, 7], [8, 0]], [[3, 6], [5, 8], [9, 1], [7, 2], [4, 0]]];
function recalls(age, wi, reflected) {
  const wr = 1 - wi, mundane = wr * 1 + wi * 0.2;
  const invite = wr * Math.exp(-0.7 * age) + wi * 0.8, refl = reflected ? wr * 1 + wi * 0.7 : -1;
  return Math.max(invite, refl) > mundane;
}
function simulate(o) {
  const heard = Array(10).fill(null); heard[0] = 0;
  const log = [];
  DAYS.forEach((pairs, d) => {
    const told = [];
    pairs.forEach(([a, b]) => [[a, b], [b, a]].forEach(([x, y]) => {
      if (heard[x] === null || heard[y] !== null) return;
      const age = d - heard[x], knows = x === 0 || recalls(age, o.wi, o.reflect && age >= 1);
      if (knows && (x === 0 || o.observe)) told.push([x, y]);
    }));
    told.forEach(([x, y]) => { if (heard[y] === null) { heard[y] = d; log.push({ d, x, y }); } });
  });
  const knows = heard.map(h => h !== null);
  const remembers = heard.map((h, i) => h !== null && (i === 0 || (o.observe && recalls(3 - h, o.wi, o.reflect))));
  const attend = remembers.map((r, i) => r && (o.plan || i === 0));
  return { heard, log, knows, remembers, attend, n: attend.filter(Boolean).length };
}

export default {
  slug: 'generative-agents',
  title: 'Generative agents: a party nobody organised',
  description: 'Ten generative agents live three days in a market town near Kisumu. Only the coach knows about Saturday\'s football match. News spreads only through who meets whom.',
  overview: 'Most multi-agent systems are scripted teams. Generative agents are different: agents with memory, priorities and an open world, whose behaviour emerges. Park and colleagues\' Smallville (2023) put 25 of them in a sandbox town with a three-part architecture. A memory stream is an append-only log in plain language of what the agent observed, did, reflected and planned, each entry scored for recency (decaying with age), importance (rated by the agent) and relevance to the current situation; the top few by a weighted sum enter the prompt. Reflection periodically turns recent memories into higher-level beliefs ("Isabella is throwing a party"), which go back into the stream and are retrieved like any other memory. Planning works top down, from a day plan to hours to actions, and is revised when observations contradict it. Ablations showed each part matters: without observation agents act on stale beliefs; without reflection their beliefs stay shallow; without plans behaviour becomes reactive noise and goals dissolve. The famous result: one agent was seeded with the wish to throw a Valentine\'s Day party; she invited people, invitations became memories, reflections became beliefs, plans included the party, word spread, and at five o\'clock several agents turned up. Nobody coordinated it. The same design is used to simulate users, markets and communities, and its known failures follow from the architecture: memories retrieved wrongly, recency crowding out importance, embellished or hallucinated recollections, drift over long runs, and a cost that grows with every agent and every day.',
  keywords: ['generative agents', 'Smallville', 'agent simulation', 'memory retrieval', 'reflection', 'emergence', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, -0.2], dir: [0.05, 1.2, 1.0], half: 1.3, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { observe: true, reflect: true, plan: true, wi: 0.5 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const field = P.box(1.3, 0.04, 0.9, '#7FB069', { r: 0.04 }); field.position.set(0, 0, -0.2); S.add(field);
    const HOME = WHO.map((_, i) => { const a = (i / 10) * Math.PI * 2 + Math.PI / 2; return V(Math.cos(a) * 2.45, 0, -0.2 + Math.sin(a) * 1.05); });
    const people = WHO.map((n, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#C9C4B8' }), b = P.cyl(0.11, 0.3, '#fff', { material: m }); b.userData.noFit = true; S.add(b);
      const hm = new THREE.MeshLambertMaterial({ color: '#C9C4B8' }), h = P.ball(0.09, '#fff', { material: hm }); h.userData.noFit = true; S.add(h);
      return { m, b, hm, h };
    });
    const links = Array.from({ length: 9 }, () => { const r = P.rod(V(), V(0.1, 0, 0), 0.012, SAF); r.userData.noFit = true; S.add(r); return r; });

    HOME.forEach(h => { const hut = P.box(0.3, 0.24, 0.3, '#D8C8A0', { r: 0.04 }); hut.position.set(h.x * 1.13, 0, -0.2 + (h.z + 0.2) * 1.18); S.add(hut); const roof = P.box(0.34, 0.06, 0.34, '#A8553A', { r: 0.02 }); roof.position.set(h.x * 1.13, 0.24, -0.2 + (h.z + 0.2) * 1.18); S.add(roof); });
    const goals = [-0.65, 0.65].map(x => { const g = P.gate(0.4, '#FFFFFF', { h: 0.25 }); g.rotation.y = Math.PI / 2; g.position.set(x, 0.04, -0.2); S.add(g); return g; });
    S.add(P.keep(-2.95, 2.95, 0.6, -1.5, 1.1));
    let R = null;
    function draw() {
      R = simulate(st);
      WHO.forEach((n, i) => {
        const Pp = people[i], at = R.attend[i], pos = at ? V(-0.45 + (i % 5) * 0.22, 0, -0.42 + Math.floor(i / 5) * 0.4) : HOME[i];
        Pp.b.position.set(pos.x, 0.04, pos.z); Pp.h.position.set(pos.x, 0.42, pos.z);
        const c = at ? GOOD : R.knows[i] ? (R.remembers[i] ? SAF : BAD) : '#C9C4B8';
        Pp.m.color.set(c); Pp.hm.color.set(c);
      });
      links.forEach((L, k) => { const e = R.log[k], on = !!e; L.visible = on; if (on) P.setRod(L, V(HOME[e.x].x, 0.12, HOME[e.x].z), V(HOME[e.y].x, 0.12, HOME[e.y].z)); });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Retrieval weight on importance (the rest on recency)', min: 0.1, max: 0.9, step: 0.05, get: () => st.wi, set: v => set({ wi: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'toggle', label: 'Observation: record what you hear', short: 'Observe', get: () => st.observe, set: v => set({ observe: !!v }) },
      { type: 'toggle', label: 'Reflection: turn memories into beliefs', short: 'Reflect', get: () => st.reflect, set: v => set({ reflect: !!v }) },
      { type: 'toggle', label: 'Planning: put it in tomorrow\'s plan', short: 'Plan', get: () => st.plan, set: v => set({ plan: !!v }) },
    ];
    const readouts = [
      { label: 'Heard', get: () => ({ v: `${R.knows.filter(Boolean).length} of 10`, sub: 'by word of mouth' }) },
      { label: 'Remembered', get: () => ({ v: `${R.remembers.filter(Boolean).length} of 10`, sub: 'on Saturday' }) },
      { label: 'Turned up', get: () => ({ v: `${R.n} of 10`, sub: 'at four o\'clock', good: R.n >= 8, bad: R.n < 5 }) },
    ];
    const labels = [
      { name: 'town', t: 'Ten agents', d: 'Gold: knows. Red: forgot', icon: 'user', atV: V(-2.95, 0.2, -0.2) },
      { name: 'field', t: 'The match', d: 'Green: turned up', icon: 'target', atV: V(0.66, 0.1, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Stop recording what they hear', hint: 'no observation', on: () => set({ ...D0, observe: false }), off: reset },
      { label: 'Switch off reflection and planning', hint: 'reactive agents', on: () => set({ ...D0, reflect: false, plan: false }), off: reset },
      { label: 'Let recent chatter crowd it out', hint: 'recency over importance', on: () => set({ ...D0, wi: 0.2, reflect: false }), off: reset },
    ];
    function status() {
      const heard = R.knows.filter(Boolean).length, rem = R.remembers.filter(Boolean).length;
      if (!st.observe) return { ok: false, msg: `<b>The coach invited everyone they met, but without observation nobody recorded it: the news never travelled further, and only the coach turned up.</b> An agent can\'t act on what it never wrote into its memory stream.` };
      if (!st.plan) return { ok: false, msg: `<b>${heard} heard about the match and ${rem} still remembered it, but with no plans nobody scheduled it: on Saturday at four they were wherever their routine took them. Only the coach came.</b> Without planning, behaviour is reactive and goals dissolve.` };
      if (rem < heard) return { ok: false, msg: `<b>${heard} heard, but by Saturday only ${rem} could recall it: with retrieval weighted ${Math.round((1 - st.wi) * 100)}% on recency${st.reflect ? '' : ' and no reflection to refresh it'}, a day of ordinary chatter pushed an important invitation out of the top three memories.</b> ${st.reflect ? 'Raise the weight on importance.' : 'Reflection turns it into a belief that stays near the top; weight importance higher.'}` };
      return { ok: true, msg: `<b>Word spread through ${R.log.length} chance meetings over three days; reflection kept "there is a match on Saturday" near the top of each memory stream; plans did the rest: ${R.n} of 10 turned up at four.</b> Only the coach was told to organise it; the rest emerged.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A town of agents', home: true, say: 'Ten agents live three days in a market town near Kisumu. Only the coach has a goal: a football match on Saturday at four.', act: m => m.set({ observe: true, reflect: true, plan: true, wi: 0.5 }) },
    { t: 'Word of mouth', home: true, say: 'The coach invites whoever they meet. Each invitation becomes a memory, and memories get passed on.', act: m => m.set({ observe: true, reflect: true, plan: true, wi: 0.5 }) },
    { t: 'Remembering', home: true, say: 'Each agent recalls its top three memories by recency, importance and relevance. Weight recency too heavily, and chatter crowds the invitation out.', act: m => m.set({ observe: true, reflect: false, plan: true, wi: 0.2 }) },
    { t: 'Reflection', home: true, say: 'Reflection turns memories into a belief: there is a match on Saturday. It stays near the top.', act: m => m.set({ observe: true, reflect: true, plan: true, wi: 0.35 }) },
    { t: 'Plans', home: true, say: 'Without plans, even agents who know just follow their routine. With plans, they schedule it.', act: m => m.set({ observe: true, reflect: true, plan: false, wi: 0.5 }) },
    { t: 'Emergence', home: true, say: 'Nobody coordinated the crowd at the school ground. It emerged from memories, beliefs and plans.', act: m => m.set({ observe: true, reflect: true, plan: true, wi: 0.5 }) },
  ],
  check: [
    { q: 'What three scores decide which memories an agent retrieves?', options: ['Recency, importance and relevance', 'Length, date and author', 'Only recency'], answer: 0, why: 'A weighted sum picks the top few.', hint: 'Move the retrieval slider.' },
    { q: 'What does reflection add?', options: ['Higher-level beliefs that are retrieved like memories', 'More observations', 'Faster planning'], answer: 0, why: 'It keeps important conclusions near the top.', hint: 'Turn off Reflect.' },
    { q: 'Agents know about the match but don\'t come. What is missing?', options: ['Planning', 'Observation', 'More agents'], answer: 0, why: 'Without plans, goals dissolve.', hint: 'Turn off Plan.' },
  ],
  terms: [
    ['Generative agent', 'An agent with a memory stream, reflection and plans in an open world.'],
    ['Memory stream', 'An append-only plain-language log of observations, reflections and plans.'],
    ['Retrieval score', 'Recency, importance and relevance, weighted and summed.'],
    ['Reflection', 'A synthesis of recent memories into a higher-level belief.'],
    ['Plan', 'A day plan broken into hours and actions, revised as needed.'],
    ['Emergence', 'System behaviour that arises from local interactions, not central control.'],
  ],
  deeper: '<p><b>Uses.</b> Simulating users for product testing, markets, social dynamics and policy questions, where believable individual behaviour matters more than a single correct answer.</p><p><b>Costs and drift.</b> Every agent, every day, means more model calls; long runs drift, and recollections can be embellished.</p><p><b>About this machine.</b> Who meets whom is fixed; retrieval uses a simple weighted score with a decay per day, and spread, memory and attendance are computed live.</p>',
  code: {
    title: 'Retrieve, reflect, plan',
    note: 'Adapted from the course\'s generative-agents sketch (code/main.py).',
    text: `
def score(memory, now, query, w_recency, w_importance, w_relevance, decay=0.7):
    age = now - memory.time
    return (w_recency * math.exp(-decay * age)
            + w_importance * memory.importance / 10
            + w_relevance * cosine(memory.embedding, embed(query)))

def retrieve(stream, now, query, k=3, **w):
    return sorted(stream, key=lambda m: score(m, now, query, **w), reverse=True)[:k]

def reflect(agent, llm):
    recent = agent.stream[-20:]
    belief = llm(f"What high-level conclusions follow from: {recent}")
    agent.stream.append(Memory(belief, kind="reflection", importance=7))

def plan_day(agent, llm, now):
    context = retrieve(agent.stream, now, "today")
    agent.plan = llm(f"Given {context}, plan today in hour blocks.")
`,
  },
};
