// Shared memory and the blackboard (phase 16, lesson 13): a Harare agricultural research team of agents shares facts about a fertiliser trial.
// The retriever misreads "4.2%" as "42%" and writes it to shared memory; whoever reads it builds on it. A message pool (everyone reads
// everything) or a blackboard with topic subscriptions, provenance on every write, a verifier the agents can't write to, and provenance-driven
// retraction decide how far the error spreads and what is left standing when a person spots it. Computed live.
const ROLES = ['retriever', 'summariser', 'analyst', 'economist', 'field planner', 'soil agent', 'weather agent', 'logistics agent', 'report writer', 'translator'];
const SUBS = new Set(['summariser', 'analyst', 'economist']);
function spread(o) {
  const agents = ROLES.slice(0, o.n), readers = agents.slice(1).filter(a => o.topo === 'pool' || SUBS.has(a));
  const verified = o.verifier;
  const adopted = verified ? [] : readers;
  const derived = adopted.map(a => ({ a, claim: { summariser: '"a large 42% gain"', analyst: '"recommend it on every farm"', economist: '"budget for a national roll-out"' }[a] || '"cites the 42% gain"' }));
  const standing = o.provenance ? [] : derived;
  const ctxPer = o.topo === 'pool' ? 3 * o.n : 3 * 2;
  return { agents, readers, adopted, derived, standing, ctxPer, verified };
}

export default {
  slug: 'shared-memory-blackboard',
  title: 'Shared memory: one bad fact, many believers',
  description: 'Research agents in Harare share what they learn about a fertiliser trial. One misreads 4.2% as 42% and writes it to shared memory. See how far the bad fact spreads, and what can be taken back.',
  overview: 'Agents need somewhere to share facts. Passing everything in messages reinvents shared state with extra copying; a global log grows without bound and is easy to poison. Two shapes are common. A message pool, as in AutoGen\'s group chat or MetaGPT, lets every agent read every message: simple and inspectable, but past about ten agents each context fills with the others\' work. A blackboard with subscriptions routes only the topics an agent asked for: it scales further, at the cost of designing the topics up front. Production systems often mix them, a small pool for planning and blackboards for workers. Whichever you choose, shared memory carries a structural risk: memory poisoning. One agent writes a hallucination, every agent that reads it adopts it as fact, and by the time a person notices, the reasoning is five steps deep and the root cause three agents back. A study of multi-agent failures (MAST) lists this family among the most common. Two defences matter. Provenance: every write records who wrote it, from which source, quoting the evidence, and every derived fact links to what it was derived from. A verifier that the agents cannot write to re-reads the source before a claim becomes a trusted fact, so agents read only verified facts. Provenance also makes retraction possible: when a fact is withdrawn, everything derived from it can be found and withdrawn too. Without it, the corrections never reach the conclusions.',
  keywords: ['shared memory', 'blackboard architecture', 'memory poisoning', 'provenance', 'multi-agent systems', 'AI agents', 'verification'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.1], dir: [0.05, 1.1, 1.05], half: 1.2, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { topo: 'board', n: 8, provenance: true, verifier: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const bm = new THREE.MeshLambertMaterial({ color: '#2F3A33' }), board = P.box(1.7, 0.16, 0.7, '#2F3A33', { r: 0.05, material: bm }); board.position.set(0, 0, -0.15); S.add(board);
    const fm = new THREE.MeshLambertMaterial({ color: RED }), fact = P.box(0.3, 0.2, 0.3, RED, { r: 0.03, material: fm }); fact.position.set(-0.3, 0.16, -0.15); S.add(fact);
    const src = P.box(0.24, 0.08, 0.3, '#5B8DB8', { r: 0.02 }); src.position.set(0.15, 0.16, -0.15); S.add(src);
    const gate = P.gate(1.9, GOOD, { h: 0.45 }); gate.position.set(0, 0, -0.62); S.add(gate);
    const POS = ROLES.map((_, i) => V(-2.0 + (i % 5) * 1.0, 0, i < 5 ? -1.05 : 0.75));
    const agents = ROLES.map((n, i) => {
      const r = P.robot('#fff', { scale: 0.75 }); r.position.copy(POS[i]); r.lookAt(0, 0, -0.15); S.add(r);
      const link = P.rod(V(), V(0.1, 0, 0), 0.015, RED); link.userData.noFit = true; S.add(link);
      return { r, link };
    });
    S.add(P.keep(-2.3, 2.3, 0.75, -1.25, 0.95));
    let R = null;
    function draw() {
      R = spread(st);
      fm.color.set(st.verifier ? '#9C978B' : RED); fact.scale.y = st.verifier ? 0.4 : 1;
      src.visible = !!st.provenance;
      gate.visible = !!st.verifier;
      bm.color.set(st.topo === 'pool' ? '#4A4F63' : '#2F3A33');
      ROLES.forEach((n, i) => {
        const A = agents[i], on = i < st.n; A.r.visible = on; A.link.visible = false; if (!on) return;
        const ad = R.adopted.includes(n), read = R.readers.includes(n), stand = R.standing.some(d => d.a === n);
        const c = i === 0 ? SAF : stand ? RED : ad ? '#E9B87A' : read ? '#5B8DB8' : '#C9C4B8';
        A.r.userData.set({ color: c, lamp: c });
        if (ad) { A.link.visible = true; P.setRod(A.link, V(POS[i].x * 0.25, 0.25, -0.15), V(POS[i].x, 0.45, POS[i].z)); A.link.material.color.set(stand ? RED : SAF); }
      });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Agents on the team', min: 4, max: 10, step: 1, get: () => st.n, set: v => set({ n: Math.round(v) }) },
      { type: 'toggle', label: 'Provenance on every write, and links from derived facts', short: 'Provenance', get: () => st.provenance, set: v => set({ provenance: !!v }) },
      { type: 'toggle', label: 'A verifier the agents can\'t write to checks each claim', short: 'Verifier', get: () => st.verifier, set: v => set({ verifier: !!v }) },
      { type: 'buttons', label: 'Shared memory', options: ['Message pool', 'Blackboard'], get: () => st.topo === 'pool' ? 0 : 1, act: i => set({ topo: i ? 'board' : 'pool' }) },
    ];
    const readouts = [
      { label: 'Built on it', get: () => ({ v: String(R.adopted.length), sub: 'agents', good: !R.adopted.length, bad: R.adopted.length > 2 }) },
      { label: 'Still standing', get: () => ({ v: String(R.standing.length), sub: 'after the correction', good: !R.standing.length, bad: R.standing.length > 0 }) },
      { label: 'Context load', get: () => ({ v: `${R.ctxPer}k`, sub: 'tokens of others\' work', bad: R.ctxPer > 20 }) },
    ];
    const labels = [
      { name: 'board', t: 'Shared memory', d: 'Red: the bad fact. Blue: its source', icon: 'book', atV: V(-0.85, 0.1, -0.15) },
      { name: 'agents', t: 'The team', d: 'Red: still believes it', icon: 'user', atV: V(1.12, 0.2, -1.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Share everything with everyone', hint: 'a message pool, no checks', on: () => set({ ...D0, topo: 'pool', verifier: false }), off: reset },
      { label: 'Drop provenance', hint: 'no way to retract', on: () => set({ ...D0, verifier: false, provenance: false }), off: reset },
      { label: 'Let facts in unchecked', hint: 'no verifier', on: () => set({ ...D0, verifier: false }), off: reset },
    ];
    function status() {
      if (st.verifier) return { ok: true, msg: `<b>The verifier re-read page 3 of the trial report, found "4.2%", and rejected the claim before anyone could build on it.</b> Agents read only verified facts. ${st.topo === 'pool' ? `In a message pool each of the ${st.n} agents still carries about ${R.ctxPer}k tokens of the others\' work; a blackboard would route only the topics each subscribes to.` : 'The blackboard routes only the topics each agent subscribed to.'}` };
      if (!st.provenance) return { ok: false, msg: `<b>The bad fact spread to ${R.adopted.length} agents, and when a person spotted it, nobody could tell which conclusions came from it: ${[...new Set(R.standing.map(d => d.claim))].join(', ')} all still stand.</b> Record who wrote each fact and from what, and link every derived fact to its sources, so a retraction can follow the chain.` };
      if (st.topo === 'pool') return { ok: false, msg: `<b>In a message pool all ${R.adopted.length} other agents read "42%" and built on it, from a "large gain" to a national roll-out budget.</b> Provenance let the correction reach every conclusion this time, but the error had already travelled through the whole team. Check claims before they become shared facts.` };
      return { ok: false, msg: `<b>Unchecked, the "42%" reached the ${R.adopted.length} agents subscribed to yields: a summary of a large gain, a recommendation for every farm and a roll-out budget.</b> Provenance let the retraction reach them all, after the fact. A verifier that re-reads the source stops it at the door.` };
    }
    return { update: dt => { gate.userData.tick(dt); agents.forEach(A => A.r.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A shared memory', home: true, say: 'A team of research agents in Harare shares what it learns about a fertiliser trial.', act: m => m.set({ topo: 'pool', n: 8, provenance: false, verifier: false }) },
    { t: 'One misread number', home: true, say: 'The retriever reads four point two percent as forty-two, and every agent that reads it builds on it.', act: m => m.set({ topo: 'pool', n: 8, provenance: false, verifier: false }) },
    { t: 'Corrections that can\'t travel', home: true, say: 'A person spots the error. With no record of where facts came from, the conclusions built on it still stand.', act: m => m.set({ topo: 'pool', n: 8, provenance: false, verifier: false }) },
    { t: 'Provenance', home: true, say: 'Record the writer, the source and the quote, and link every derived fact. Now a retraction follows the chain.', act: m => m.set({ topo: 'board', n: 8, provenance: true, verifier: false }) },
    { t: 'A verifier at the door', home: true, say: 'A verifier the agents can\'t write to re-reads the source. The claim is rejected before anyone believes it.', act: m => m.set({ topo: 'board', n: 8, provenance: true, verifier: true }) },
    { t: 'Pool or blackboard', home: true, say: 'A pool is simple for a few agents. A blackboard routes only the topics each agent needs.', act: m => m.set({ topo: 'board', n: 8, provenance: true, verifier: true }) },
  ],
  check: [
    { q: 'What is memory poisoning?', options: ['A bad fact in shared memory that other agents adopt', 'Running out of memory', 'A slow database'], answer: 0, why: 'Readers build on it as if true.', hint: 'Try Let facts in unchecked.' },
    { q: 'What makes a retraction reach every conclusion?', options: ['Provenance linking derived facts to sources', 'A bigger pool', 'More agents'], answer: 0, why: 'You can follow the chain.', hint: 'Try Drop provenance.' },
    { q: 'When does a blackboard beat a message pool?', options: ['With many agents and long-running work', 'With two agents', 'Never'], answer: 0, why: 'It routes only subscribed topics.', hint: 'Raise the agent count.' },
  ],
  terms: [
    ['Message pool', 'Shared memory where every agent reads every message.'],
    ['Blackboard', 'Shared memory where agents subscribe to topics.'],
    ['Memory poisoning', 'A false fact in shared memory adopted by readers.'],
    ['Provenance', 'Who wrote a fact, from which source, with what evidence.'],
    ['Verifier', 'A check outside the agents\' reach before a claim is trusted.'],
    ['Retraction', 'Withdrawing a fact and everything derived from it.'],
  ],
  deeper: '<p><b>Mixed designs.</b> A small full pool for the planning layer, blackboards for many workers below.</p><p><b>Shared state is where the bugs live.</b> Agents and handoffs are stateless; the shared memory is the one stateful part, which is why it needs the most care.</p><p><b>About this machine.</b> The trial, the misread and who subscribes to what are fixed; spread, retraction and context load are computed live.</p>',
  code: {
    title: 'Writes with provenance, reads of verified facts',
    note: 'Adapted from the course\'s blackboard sketch (code/main.py).',
    text: `
def write(board, agent, topic, claim, source, quote, derived_from=()):
    board.append({"id": uuid4(), "topic": topic, "claim": claim, "writer": agent,
                  "source": source, "quote": quote, "derived_from": list(derived_from),
                  "status": "claimed"})

def verify(entry, fetch):                 # runs outside the agents' reach
    text = fetch(entry["source"])
    entry["status"] = "verified" if entry["quote"] in text and \\
        consistent(entry["claim"], entry["quote"]) else "rejected"

def read(board, topics):
    return [e for e in board if e["topic"] in topics and e["status"] == "verified"]

def retract(board, entry_id):
    for e in board:
        if e["id"] == entry_id or entry_id in e["derived_from"]:
            e["status"] = "retracted"; retract(board, e["id"])
`,
  },
};
