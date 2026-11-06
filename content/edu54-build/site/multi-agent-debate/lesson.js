// Multi-agent debate (Society of Minds): five agents answer the same word problems, read each other's answers and revise over rounds.
// Monte Carlo over 300 problems, seeded. Each agent starts right with probability p; wrong answers are scattered over several values (independent
// errors) or all the same value (correlated: the same model with the same blind spot). Each round an agent sees its neighbours (everyone, or a ring).
// A wrong agent that sees a right answer is persuaded with probability q (a correct argument is checkable); any agent may conform to the
// neighbourhood's majority with probability c. Half of all wrong answers share one common mistake; with correlated errors all do, and the shared
// blind spot also means no agent recognises the right answer when it sees it (no persuasion). Compared with one agent and a plain majority vote; messages count the debate's cost.
function sim(o) {
  let x = 17, y = 5; const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; }, r0 = () => { y = (Math.imul(y, 1103515245) + 12345) >>> 0; return y / 4294967296; };
  const N = 5, P = 300, R = o.rounds; let one = 0, vote = 0, deb = 0, msgs = 0, flipsRight = 0; const trace = [];
  for (let p = 0; p < P; p++) {
    let a = Array.from({ length: N }, () => { const u = r0(), w = r0(), k = r0(); return u < o.p ? 0 : (o.correlated || w < 0.5 ? 1 : 2 + Math.floor(k * 3)); });
    if (a[0] === 0) one++;
    const maj = arr => { const c = {}; arr.forEach(v => c[v] = (c[v] || 0) + 1); return +Object.entries(c).sort((u, w) => w[1] - u[1] || u[0] - w[0])[0][0]; };
    if (maj(a) === 0) vote++;
    const hist = [a.slice()];
    for (let r = 0; r < R; r++) {
      const nb = i => o.sparse ? [(i + N - 1) % N, i, (i + 1) % N] : [...Array(N).keys()];
      msgs += o.sparse ? N * 2 : N * (N - 1);
      a = a.map((v, i) => { const seen = nb(i).map(j => a[j]), m = maj(seen); if (v !== 0 && seen.includes(0) && rnd() < (o.correlated ? 0 : o.q)) { return 0; } if (m !== v && rnd() < o.c) { if (v === 0) flipsRight++; return m; } return v; });
      hist.push(a.slice());
    }
    if (maj(a) === 0) deb++;
    if (p < 1) trace.push(...hist);
    if (p === 7) o.sample = hist;
  }
  return { one: one / P, vote: vote / P, deb: deb / P, msgs: msgs / P, flipsRight: flipsRight / P, sample: o.sample };
}

export default {
  slug: 'multi-agent-debate',
  title: 'Multi-agent debate: argue, then agree',
  description: 'Five agents answer the same word problems, read each other\'s answers and revise. When does debate beat a plain vote?',
  overview: 'In multi-agent debate several model instances answer a question, then each reads the others\' answers and reasoning and revises its own, for a few rounds; the final answer is the majority. On arithmetic and reasoning benchmarks this beat a single agent and plain voting, because a correct argument can be checked and persuades agents that went wrong. It helps when errors are independent and the right answer is verifiable when seen. It hurts in two ways. If every agent is the same model with the same blind spot, their errors agree, and debate turns a wrong majority into a confident wrong consensus; use different models or prompts for diversity. If agents conform, switching to whatever most others say, a correct minority gets talked out of its answer. Debate is also expensive: with everyone reading everyone, messages grow with the square of the number of agents each round, so a sparse topology, each agent reading only its neighbours, keeps most of the gain for a fraction of the cost. In practice debate shows up as several critics reviewing a draft, or as voting over independent attempts, often with a judge model or a tool that checks the final answer.',
  keywords: ['multi-agent debate', 'Society of Minds', 'ensembles', 'majority vote', 'multi-agent', 'AI agents', 'reasoning'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.1], dir: [0.3, 0.95, 1.25], half: 1.3, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { p: 0.55, q: 0.6, c: 0.1, rounds: 3, correlated: false, sparse: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const AC = ['#1F9E89', '#E07A5F', '#C9A227', '#7B6FA8', '#8E8C84'];
    /* the table */
    const TX = -1.4, TZ = 0.1, table = P.cyl(1.0, 0.22, '#C9B79A'); table.position.set(TX, 0, TZ); S.add(table);
    const bots = [];
    const seats = Array.from({ length: 5 }, (_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / 5, x = TX + Math.cos(a) * 1.2, z = TZ + Math.sin(a) * 1.0; const b = P.robot('#2C2D31', { scale: 0.6 }); b.position.set(x, 0, z); b.rotation.y = -a - Math.PI / 2; S.add(b); bots.push(b); const chips = Array.from({ length: 5 }, (_, r) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), c = P.box(0.12, 0.04, 0.12, '#fff', { r: 0.02, material: mm }); c.position.set(TX + Math.cos(a) * (0.82 - r * 0.15), 0.22, TZ + Math.sin(a) * (0.68 - r * 0.13)); S.add(c); return { c, mm }; }); return { x, z, chips }; });
    const links = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { const A = seats[i], B = seats[j], ring = j === i + 1 || (i === 0 && j === 4); const r = P.rod(V(A.x, 0.62, A.z), V(B.x, 0.62, B.z), 0.012, ring ? '#5B8DB8' : '#B9B3A5'); S.add(r); links.push({ r, ring }); }
    /* accuracy */
    const RX = 1.45;
    const bars = ['One agent', 'Vote of five', 'Debate'].map((n, i) => { const mm = new THREE.MeshLambertMaterial({ color: ['#B9B3A5', '#5B8DB8', GOOD][i] }), b = P.box(0.45, 1, 0.45, '#fff', { r: 0.03, material: mm }); b.position.set(RX - 0.6 + i * 0.6, 0, -0.2); S.add(b); return { b, mm }; });
    const full = P.box(1.75, 0.02, 0.6, '#151827', { r: 0, material: new THREE.MeshLambertMaterial({ color: '#8E8C84', transparent: true, opacity: 0.3 }) }); full.position.set(RX, 1.2, -0.2); full.layers.set(1); S.add(full);
    const jar = P.jar(0.3, 0.9, { max: 12 }); jar.position.set(RX + 1.25, 0, 0.55); S.add(jar);
    S.add(P.keep(-2.75, 3.0, 1.3, -1.0, 1.25));

    let R = null;
    function draw() {
      R = sim(st);
      const H = R.sample || [];
      seats.forEach((s, i) => s.chips.forEach((ch, r) => { const row = H[r]; ch.c.visible = !!row && r <= st.rounds; if (row) ch.mm.color.set(AC[row[i]] || '#8E8C84'); }));
      links.forEach(l => l.r.visible = st.sparse ? l.ring : true);
      [R.one, R.vote, R.deb].forEach((v, i) => { bars[i].b.scale.y = 0.05 + 1.15 * v; });
      bars[2].mm.color.set(R.deb >= R.vote ? GOOD : BAD);
      jar.userData.set({ n: Math.round(R.msgs / 6) });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'One agent\'s accuracy', min: 0.3, max: 0.8, step: 0.05, get: () => st.p, set: v => set({ p: Math.round(v * 20) / 20 }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'slider', label: 'Debate rounds', min: 0, max: 4, step: 1, get: () => st.rounds, set: v => set({ rounds: Math.round(v) }), fmt: v => String(Math.round(v)) },
      { type: 'slider', label: 'Persuaded by a right answer', min: 0, max: 1, step: 0.05, get: () => st.q, set: v => set({ q: Math.round(v * 20) / 20 }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'toggle', label: 'Each agent reads only its neighbours', short: 'Sparse', get: () => st.sparse, set: v => set({ sparse: !!v }) },
    ];
    const readouts = [
      { label: 'Debate', get: () => ({ v: `${Math.round(R.deb * 100)}%`, sub: `vote ${Math.round(R.vote * 100)}%, one ${Math.round(R.one * 100)}%`, good: R.deb > R.vote, bad: R.deb < R.vote }) },
      { label: 'Messages', get: () => ({ v: String(Math.round(R.msgs)), sub: 'per problem' }) },
      { label: 'Right answers lost', get: () => ({ v: R.flipsRight.toFixed(2), sub: 'per problem, to conformity', bad: R.flipsRight > 0.3 }) },
    ];
    const labels = [
      { name: 'table', t: 'Five agents, one problem', d: 'A chip per round in front of each agent, from the edge inward; green is the right answer, other colours wrong ones. Blue rods: who reads whom', icon: 'user', atV: V(TX - 1.3, 0.3, TZ) },
      { name: 'acc', t: 'Right over 300 problems', d: 'Grey: one agent. Blue: a vote of five. Green: the debate (red when it loses to the vote). The thin plate is 100%', icon: 'scale', atV: V(RX + 0.9, 0.3, -0.2) },
      { name: 'msgs', t: 'Messages', d: 'The jar fills with the messages each problem costs', icon: 'box', atV: V(RX + 1.6, 0.3, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Five copies, one blind spot', hint: 'correlated errors', on: () => set({ ...D0, correlated: true, p: 0.45 }), off: reset },
      { label: 'Let agents follow the crowd', hint: 'conformity beats argument', on: () => set({ ...D0, c: 0.7, q: 0.1 }), off: reset },
      { label: 'Everyone reads everyone', hint: 'dense topology', on: () => set({ ...D0, sparse: false }), off: reset },
    ];
    function status() {
      const sparse = sim({ ...st, sparse: true });
      if (st.correlated) return { ok: false, msg: `<b>When every agent shares the same blind spot, their wrong answers agree, and debate only hardens them: ${Math.round(R.deb * 100)}% right, against ${Math.round(R.one * 100)}% for one agent.</b> Debate and voting help when errors are independent. Mix models, prompts or tools so the agents don't all fail the same way.` };
      if (st.c > 0.4) { const good = sim({ ...st, c: 0.1, q: 0.6 }); return { ok: false, msg: `<b>Agents that follow the majority instead of the argument talk ${R.flipsRight.toFixed(2)} right answers per problem out of their answer, and debate falls from ${Math.round(good.deb * 100)}% to ${Math.round(R.deb * 100)}%.</b> Debate works because a correct argument is checkable and persuades. Ask agents to check the reasoning they read, not to count heads.` }; }
      if (!st.sparse) return { ok: false, msg: `<b>Everyone reading everyone costs ${Math.round(R.msgs)} messages a problem for ${Math.round(R.deb * 100)}% right; reading two neighbours costs ${Math.round(sparse.msgs)} for ${Math.round(sparse.deb * 100)}%.</b> Messages grow with the square of the number of agents. A sparse topology keeps most of the gain for a fraction of the cost.` };
      return { ok: R.deb >= R.vote, msg: `<b>Over 300 problems: one agent ${Math.round(R.one * 100)}%, a vote of five ${Math.round(R.vote * 100)}%, ${st.rounds} rounds of debate ${Math.round(R.deb * 100)}%, at ${Math.round(R.msgs)} messages a problem.</b> Wrong agents that see a right answer can check it and switch; with independent errors, the right answer spreads round the table.` };
    }
    return { update: dt => { bots.forEach(b => { b.userData.tick(dt); b.userData.set({ busy: st.rounds > 0 }); }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Five agents, one question', home: true, say: 'Five agents answer the same word problem. Each is right a little more than half the time.', act: m => m.set({ p: 0.55, q: 0.6, c: 0.1, rounds: 0, correlated: false, sparse: true }) },
    { t: 'Vote', home: true, say: 'A plain majority vote of five already beats one agent, as long as their mistakes differ.', act: m => m.set({ rounds: 0 }) },
    { t: 'Debate', home: true, say: 'Now they read each other\'s answers and revise. A wrong agent that sees a correct argument can check it and switch.', act: m => m.set({ rounds: 3 }) },
    { t: 'The same blind spot', home: true, say: 'Five copies of the same model make the same mistake. Debate turns it into a confident wrong consensus.', act: m => m.set({ correlated: true, p: 0.45 }) },
    { t: 'Following the crowd', home: true, say: 'If agents simply follow the majority, a correct minority is talked out of its answer.', act: m => m.set({ correlated: false, p: 0.55, c: 0.7, q: 0.1 }) },
    { t: 'Talk less', home: true, say: 'Reading only two neighbours keeps most of the gain, for a fraction of the messages.', act: m => m.set({ c: 0.1, q: 0.6, sparse: true }) },
  ],
  check: [
    { q: 'When does debate help most?', options: ['Errors are independent and a correct answer is checkable', 'All agents are the same model', 'Agents follow the majority'], answer: 0, why: 'A checkable right answer persuades.', hint: 'Try Five copies, one blind spot.' },
    { q: 'What does a sparse topology save?', options: ['Messages: each agent reads only neighbours', 'Accuracy', 'Rounds'], answer: 0, why: 'Everyone-to-everyone grows with the square of agents.', hint: 'Try Everyone reads everyone.' },
    { q: 'What is the risk of conformity?', options: ['A correct minority switches to a wrong majority', 'Too many tokens', 'Agents stop answering'], answer: 0, why: 'Count arguments, not heads.', hint: 'Try Let agents follow the crowd.' },
  ],
  terms: [
    ['Multi-agent debate', 'Agents answer, read each other, and revise over rounds.'],
    ['Majority vote', 'Taking the most common answer of independent attempts.'],
    ['Correlated errors', 'Mistakes that agents share, so voting can\'t fix them.'],
    ['Conformity', 'Switching to the majority regardless of the argument.'],
    ['Sparse topology', 'Each agent reads only some others.'],
    ['Judge', 'A model or tool that checks the final answer.'],
  ],
  deeper: '<p><b>The original study.</b> Several instances of one model debating for a few rounds improved arithmetic, reasoning and factual accuracy over a single model and over voting; later work showed sparse communication keeps most of the gain more cheaply.</p><p><b>In production.</b> Debate usually appears as several critics reviewing a draft, voting over independent attempts, or a judge that checks the result with a tool.</p><p><b>About this machine.</b> A seeded simulation of 300 problems: start right with probability p, switch to a seen right answer with probability q, conform to the local majority with probability c.</p>',
  code: {
    title: 'Debate for a few rounds, then vote',
    note: 'Adapted from the course\'s debate lesson.',
    text: `
from collections import Counter

def debate(question, agents, rounds=3, neighbours=None):
    answers = [a.answer(question) for a in agents]
    for _ in range(rounds):
        new = []
        for i, a in enumerate(agents):
            seen = [answers[j] for j in (neighbours(i) if neighbours else range(len(agents)))]
            new.append(a.revise(question, own=answers[i], others=seen))  # check the reasoning
        answers = new
    return Counter(x.final for x in answers).most_common(1)[0][0]

ring = lambda i, n=5: [(i - 1) % n, i, (i + 1) % n]        # sparse: two neighbours
`,
  },
};
