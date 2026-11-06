// Speech acts and agent protocols (phase 16, lessons 2 and 3): a Kampala dispatcher agent runs a contract-net auction for two deliveries at
// once, and three courier agents answer. Messages carry a performative (cfp, propose, refuse, accept-proposal, reject-proposal), a conversation
// id and units from a shared ontology, or they are plain strings. Twelve fixed messages are replayed; how each is read, and who wins each job,
// is decided live.
const MSGS = [
  { from: 'dispatcher', to: 'all', perf: 'cfp', conv: 'A', body: 'cold-chain parcel to Ntinda', plain: 'who can take the Ntinda job?' },
  { from: 'dispatcher', to: 'all', perf: 'cfp', conv: 'B', body: 'documents to Entebbe', plain: 'who can take the Entebbe job?' },
  { from: 'courier 2', to: 'dispatcher', perf: 'propose', conv: 'B', eta: 35, unit: 'min', plain: '35' },
  { from: 'courier 1', to: 'dispatcher', perf: 'propose', conv: 'A', eta: 40, unit: 'min', plain: 'ok 40' },
  { from: 'courier 3', to: 'dispatcher', perf: 'refuse', conv: 'A', why: 'no cold box', plain: '' },
  { from: 'courier 3', to: 'dispatcher', perf: 'propose', conv: 'B', eta: 1, unit: 'h', plain: '1' },
  { from: 'courier 1', to: 'dispatcher', perf: 'refuse', conv: 'B', why: 'busy with A', plain: 'no' },
  { from: 'courier 2', to: 'dispatcher', perf: 'refuse', conv: 'A', why: 'off route', plain: 'no' },
];
function run(o) {
  const bids = { A: [], B: [] }, heard = { A: new Set(), B: new Set() }, log = [];
  let lastOpen = 'B';
  MSGS.forEach(m => {
    if (m.perf === 'cfp') { log.push({ ...m, read: o.perf ? `cfp · conversation ${o.conv ? m.conv : '?'}` : 'a question' }); return; }
    if (!o.perf && m.perf === 'refuse' && !m.plain) { log.push({ ...m, read: 'silence', bad: true }); return; }
    const conv = o.conv ? m.conv : lastOpen;
    heard[conv].add(m.from);
    if (m.perf === 'propose') {
      const mins = o.units ? m.eta * (m.unit === 'h' ? 60 : 1) : m.eta;
      bids[conv].push({ who: m.from, mins, real: m.eta * (m.unit === 'h' ? 60 : 1) });
      log.push({ ...m, read: `${o.perf ? 'propose' : 'a number'} on ${conv}${conv !== m.conv ? ' (wrong job)' : ''}: ${o.units ? `${m.eta} ${m.unit}` : `"${m.eta}"`}`, bad: conv !== m.conv || (!o.units && m.unit === 'h') });
    } else log.push({ ...m, read: `${o.perf ? `refuse on ${conv}: ${m.why}` : `"no", on ${conv}`}`, bad: conv !== m.conv });
  });
  const award = {}, waiting = {};
  ['A', 'B'].forEach(j => {
    waiting[j] = heard[j].size < 3 && !o.timeout;
    const best = bids[j].slice().sort((a, b) => a.mins - b.mins)[0];
    award[j] = waiting[j] ? null : best || 'none';
  });
  return { log, award, waiting };
}

export default {
  slug: 'agent-speech-acts',
  title: 'Speech acts: messages agents can act on',
  description: 'A dispatcher agent in Kampala auctions two deliveries at once, and three courier agents reply. When each message says what act it is, which job it is for and its units, the right courier wins.',
  overview: 'Today\'s agent protocols (MCP for tools, A2A for agent-to-agent tasks, and others for enterprise audit and decentralised trust) rediscover decisions made decades ago. In 1962 the philosopher J. L. Austin noticed that some sentences don\'t describe the world, they change it: "I promise", "I request". Searle sorted these speech acts into assertives, directives, commissives, expressives and declarations. KQML (1993) turned the idea into a wire protocol, and FIPA-ACL, ratified in 2000, standardised twenty or so performatives: inform, request, query, propose, accept-proposal, reject-proposal, agree, refuse, failure, not-understood, cfp (call for proposals), subscribe, cancel. A FIPA message names its performative, sender, receiver and content, plus the content language, the ontology that fixes what terms and units mean, and a conversation id that ties replies to the exchange they belong to. Interaction protocols compose these into patterns, most famously the contract net (1980): a manager sends a cfp, contractors propose or refuse, the manager accepts the best and rejects the rest, the winner informs of the result or reports failure. Every part solves a problem plain strings have. "ok 40" could be agreement or a price; a reply with no conversation id lands on whichever exchange happens to be open; "1" next to "35" means nothing without units; and an agent that can\'t say refuse simply goes silent, leaving the manager waiting. Modern protocols add JSON, HTTP and discovery, such as A2A\'s agent cards and task lifecycle, but the questions they answer are the same.',
  keywords: ['speech acts', 'FIPA-ACL', 'contract net', 'agent communication', 'A2A', 'multi-agent systems', 'protocols'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.05], dir: [0.05, 1.2, 1.0], half: 1.15, wide: 5.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { perf: true, conv: true, units: true, timeout: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const PC = { cfp: '#5B8DB8', propose: SAF, refuse: '#8E8C84' };
    const DP = V(-2.1, 0, -0.1), CZ = i => -0.75 + i * 0.75;
    const disp = P.robot('#3B3F52', { scale: 1.4 }); disp.position.copy(DP); S.add(disp);
    const cour = [0, 1, 2].map(i => { const r = P.robot('#5F6375', { scale: 1.1 }); r.position.set(1.7 + i * 0.35, 0, CZ(i)); S.add(r); return r; });
    const JOB = { A: '#3E9B9B', B: '#D8C8A0' }, JZ = { A: -0.5, B: 0.3 };
    const jobs = {}; ['A', 'B'].forEach(j => { const c = P.box(0.36, 0.3, 0.36, JOB[j], { r: 0.03 }); c.userData.noFit = true; c.position.set(-1.45, 0, JZ[j]); S.add(c); jobs[j] = { c, to: V(-1.45, 0, JZ[j]) }; });
    const env = MSGS.map(() => { const m = new THREE.MeshLambertMaterial({ color: '#FFF' }), e = P.box(0.28, 0.07, 0.2, '#fff', { r: 0.015, material: m }); e.userData.noFit = true; S.add(e); return { e, m }; });
    S.add(P.keep(-2.5, 2.6, 1.0, -1.05, 0.95));
    let R = null;
    const WANT = { A: 'courier 1', B: 'courier 2' };
    function draw() {
      R = run(st);
      R.log.forEach((m, i) => env[i].m.color.set(m.bad ? RED : st.perf ? PC[m.perf] : '#FFFFFF'));
      const CN = ['courier 1', 'courier 2', 'courier 3'], lamp = [null, null, null];
      ['A', 'B'].forEach(j => {
        const a = R.award[j], won = a && a !== 'none' ? CN.indexOf(a.who) : -1;
        jobs[j].to = won < 0 ? V(-1.45, 0, JZ[j]) : V(1.3 + won * 0.35, 0, CZ(won) + (j === 'A' ? -0.15 : 0.15));
        if (won >= 0) lamp[won] = a.who === WANT[j] ? GOOD : RED;
      });
      cour.forEach((r, i) => r.userData.set({ lamp: lamp[i] || '#C9C4B8', busy: !!lamp[i] }));
      disp.userData.set({ lamp: R.waiting.A || R.waiting.B ? SAF : GOOD, busy: R.waiting.A || R.waiting.B });
    }
    let tt = 0;
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Typed performatives: cfp, propose, refuse…', short: 'Performatives', get: () => st.perf, set: v => set({ perf: !!v }) },
      { type: 'toggle', label: 'A conversation id on every message', short: 'Conversation id', get: () => st.conv, set: v => set({ conv: !!v }) },
      { type: 'toggle', label: 'A shared ontology: numbers carry units', short: 'Units', get: () => st.units, set: v => set({ units: !!v }) },
      { type: 'toggle', label: 'A deadline for replies', short: 'Deadline', get: () => st.timeout, set: v => set({ timeout: !!v }) },
    ];
    const readouts = [
      { label: 'Job A', get: () => ({ v: R.waiting.A ? 'waiting' : R.award.A === 'none' ? 'unassigned' : R.award.A.who, sub: 'Ntinda, cold chain', good: R.award.A && R.award.A.who === WANT.A, bad: !(R.award.A && R.award.A.who === WANT.A) }) },
      { label: 'Job B', get: () => ({ v: R.waiting.B ? 'waiting' : R.award.B === 'none' ? 'unassigned' : R.award.B.who, sub: 'Entebbe, documents', good: R.award.B && R.award.B.who === WANT.B, bad: !(R.award.B && R.award.B.who === WANT.B) }) },
      { label: 'Misread messages', get: () => { const n = R.log.filter(m => m.bad).length; return { v: String(n), sub: 'of 8', good: !n, bad: n > 0 }; } },
    ];
    const labels = [
      { name: 'disp', t: 'Dispatcher, two jobs', d: 'Each job goes to a courier', icon: 'box', atV: V(-2.35, 0.8, -0.1) },
      { name: 'cour', t: 'Three couriers', d: 'Gold: propose. Grey: refuse', icon: 'user', atV: V(2.45, 0.7, CZ(2)) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Send plain strings', hint: 'no performatives', on: () => set({ ...D0, perf: false }), off: reset },
      { label: 'Drop the conversation id', hint: 'replies cross', on: () => set({ ...D0, conv: false }), off: reset },
      { label: 'Leave out the units', hint: '"1" or "35"?', on: () => set({ ...D0, units: false }), off: reset },
    ];
    function status() {
      if (!st.perf) return { ok: false, msg: `<b>As plain strings, "ok 40" is ambiguous and courier 3, with no way to say refuse, simply stays silent about the Ntinda job${st.timeout ? '; the deadline ends the wait, but nothing says why' : ', so the dispatcher waits for it forever'}.</b> A performative says what kind of act a message is, including refuse, failure and not-understood.` };
      if (!st.conv) return { ok: false, msg: '<b>Without a conversation id, every reply is filed under whichever job was opened last: courier 1\'s bid for Ntinda lands on Entebbe, and the Ntinda job gets no bids, so it never closes.</b> Two auctions at once need a conversation id on every message.' };
      if (!st.units) return { ok: false, msg: '<b>Without units, courier 3\'s "1" (an hour) beats courier 2\'s "35" (minutes), and the slower courier wins the Entebbe job.</b> A shared ontology fixes what terms and numbers mean, so both sides read them the same way.' };
      return { ok: true, msg: '<b>Each message names its act, its conversation and its units: the cold-chain job goes to courier 1 in 40 minutes, courier 3 refuses it for want of a cold box, and the Entebbe job goes to courier 2 in 35 minutes rather than courier 3 in an hour.</b> The contract net: call, propose or refuse, award.' };
    }
    const CN = ['courier 1', 'courier 2', 'courier 3'];
    const update = dt => {
      tt = (tt + dt / 6) % 1; disp.userData.tick(dt); cour.forEach(r => r.userData.tick(dt));
      ['A', 'B'].forEach(j => jobs[j].c.position.lerp(jobs[j].to, Math.min(1, dt * 3)));
      MSGS.forEach((m, i) => {
        const u = tt * 8 - i, E = env[i].e; E.visible = u > 0 && u < 1.2 && !(R.log[i].read === 'silence');
        const ci = m.from === 'dispatcher' ? 1 : CN.indexOf(m.from), C = V(2.0, 0, CZ(ci)), D = V(-1.9, 0, -0.1);
        const [a, b] = m.from === 'dispatcher' ? [D, C] : [C, D], k = Math.min(1, Math.max(0, u));
        E.position.set(a.x + (b.x - a.x) * k, 0.45 + Math.sin(k * Math.PI) * 0.25, a.z + (b.z - a.z) * k);
      });
    };
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two auctions', home: true, say: 'A dispatcher agent in Kampala calls for proposals on two deliveries at once. Three courier agents reply.', act: m => m.set({ perf: true, conv: true, units: true, timeout: false }) },
    { t: 'Utterances are acts', home: true, say: 'Some messages change the world: a call for proposals, a proposal, a refusal. Name the act, and the receiver knows what to do.', act: m => m.set({ perf: true, conv: true, units: true, timeout: false }) },
    { t: 'Plain strings', home: true, say: 'Send plain text instead, and a courier that can\'t take the job just stays silent. The dispatcher waits forever.', act: m => m.set({ perf: false, conv: true, units: true, timeout: false }) },
    { t: 'Which conversation?', home: true, say: 'Without a conversation id, a bid for one job lands on the other.', act: m => m.set({ perf: true, conv: false, units: true, timeout: false }) },
    { t: 'What does 1 mean?', home: true, say: 'Without units, one hour beats thirty-five minutes. A shared ontology fixes what numbers mean.', act: m => m.set({ perf: true, conv: true, units: false, timeout: false }) },
    { t: 'Old answers, new wires', home: true, say: 'These ideas date from the nineteen-nineties. Today\'s agent protocols answer the same questions in JSON.', act: m => m.set({ perf: true, conv: true, units: true, timeout: false }) },
  ],
  check: [
    { q: 'What does a performative add to a message?', options: ['The kind of act: propose, refuse, inform…', 'Encryption', 'A price'], answer: 0, why: 'The receiver knows how to treat it.', hint: 'Try Send plain strings.' },
    { q: 'Why does each message need a conversation id?', options: ['So replies attach to the right exchange', 'For speed', 'To sign it'], answer: 0, why: 'Concurrent auctions cross otherwise.', hint: 'Try Drop the conversation id.' },
    { q: 'In a contract net, what does a contractor that can\'t do the job send?', options: ['A refuse', 'Nothing', 'A proposal anyway'], answer: 0, why: 'Silence leaves the manager waiting.', hint: 'Look at courier 3.' },
  ],
  terms: [
    ['Speech act', 'An utterance that does something: request, promise, refuse.'],
    ['Performative', 'The label naming a message\'s act, such as propose or inform.'],
    ['FIPA-ACL', 'A 2000 standard agent communication language.'],
    ['Contract net', 'Call for proposals, propose or refuse, accept the best.'],
    ['Ontology', 'Shared definitions of the terms and units in messages.'],
    ['Conversation id', 'The tag that ties replies to their exchange.'],
  ],
  deeper: '<p><b>The layers today.</b> MCP: how an agent uses a tool. A2A: how agents delegate tasks, with agent cards and a task lifecycle. Others add audit trails or decentralised identity. Earlier lessons in this track cover MCP and A2A.</p><p><b>What was dropped.</b> FIPA also specified formal semantics for each act; modern JSON protocols mostly leave meaning to the model, which is flexible and harder to verify.</p><p><b>About this machine.</b> The eight messages are fixed; how each is read under each setting, and the awards, are decided live.</p>',
  code: {
    title: 'A contract net in messages',
    note: 'Written for this lesson, in the shape of a FIPA-ACL exchange.',
    text: `
cfp     = {"performative": "cfp", "conversation_id": "A", "sender": "dispatcher",
           "content": {"job": "cold-chain parcel to Ntinda"}, "ontology": "delivery-v1"}
propose = {"performative": "propose", "conversation_id": "A", "sender": "courier-1",
           "content": {"eta": {"value": 40, "unit": "min"}}, "ontology": "delivery-v1"}
refuse  = {"performative": "refuse", "conversation_id": "A", "sender": "courier-3",
           "content": {"reason": "no cold box"}}

def award(conversation_id, replies, expected, deadline):
    replies = [r for r in replies if r["conversation_id"] == conversation_id]
    if len(replies) < expected and not deadline.passed(): return "waiting"
    bids = [r for r in replies if r["performative"] == "propose"]
    return min(bids, key=lambda r: to_minutes(r["content"]["eta"]))["sender"]
`,
  },
};
