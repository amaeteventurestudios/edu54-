// Consensus among agents (phase 16, lessons 14 and 15): seven agents at a Kigali logistics firm decide which supplier invoice (A, B or C) matches
// purchase order 4412; B is right. Four may share a base model and its hallucination, one is deceptive and confident, one copies whoever spoke
// last. Majority vote, confidence weighting, or checking each answer against the order record, with diverse models and hidden ballots as
// options, produce the decision live.
function votes(o) {
  const V = [];
  const mono = !o.diverse;
  V.push({ who: 'agent 1 (model X)', a: mono ? 'C' : 'B', c: mono ? 0.9 : 0.75 });
  V.push({ who: 'agent 2 (model X)', a: mono ? 'C' : 'B', c: mono ? 0.9 : 0.7 });
  V.push({ who: 'agent 3 (model X)', a: mono ? 'C' : 'A', c: mono ? 0.9 : 0.55 });
  V.push({ who: 'agent 4 (model Y)', a: 'B', c: 0.8 });
  if (o.liar) V.push({ who: 'agent 5 (deceptive)', a: 'A', c: 0.99, liar: true }); else V.push({ who: 'agent 5 (model Z)', a: 'B', c: 0.7 });
  V.push({ who: mono ? 'agent 6 (model X)' : 'agent 6 (model Y)', a: mono ? 'C' : 'B', c: mono ? 0.9 : 0.65 });
  const prev = V[V.length - 1 - (o.liar ? 1 : 0)];
  V.push({ who: 'agent 7 (copies others)', a: o.hidden ? 'B' : (o.liar ? 'A' : prev.a), c: 0.6, syc: true });
  return V;
}
function decide(o) {
  const V = votes(o), T = { A: 0, B: 0, C: 0 };
  V.forEach(v => { T[v.a] += o.agg === 'conf' ? v.c : 1; });
  let pick;
  if (o.agg === 'verify') { const ok = V.filter(v => v.a === 'B'); pick = ok.length ? 'B' : null; }
  else pick = Object.entries(T).sort((a, b) => b[1] - a[1])[0][0];
  return { V, T, pick, right: pick === 'B' };
}

export default {
  slug: 'agent-consensus-bft',
  title: 'Consensus among agents: when the majority is wrong',
  description: 'Seven agents at a Kigali logistics firm decide which invoice matches purchase order 4412. Some share a model, one lies with confidence, one copies. Count, weigh, or check the answers.',
  overview: 'Ask several agents and take the majority, and you might expect safety in numbers. Classical Byzantine fault tolerance, PBFT (1999), proves agreement among n nodes when fewer than n/3 are faulty, faults are independent, honest nodes are actually right, and there is a true answer. Language-model agents break all three assumptions. Agents on the same base model share failures: a monoculture can hallucinate the same wrong answer, and the majority is confidently wrong. An honest model still hallucinates. A sycophantic agent that reads others\' answers before voting conforms to the loudest voice, passing every signature check. A deceptive agent can state a wrong answer with high confidence. Research since 2025 adapts the machinery: confidence-probed weighting scales votes by calibrated confidence (and must guard against a confident liar); leaderless schemes have workers propose in parallel and evaluators score them, taking a robust median; others weight by a trust score learned from history. One study of agents agreeing on numbers found high disagreement even without adversaries, and that a single deceptive persona could pull a mixture-of-agents answer far from the honest baseline. Voting topology matters too: hidden ballots before any discussion keep votes independent; debate rounds trade independence for correction. The lesson the numbers teach: consensus machinery aligns outputs; it doesn\'t make them right. Diversify the models so errors don\'t correlate, collect ballots independently, and where an answer can be checked, against a record, a test or a tool, verify it instead of counting it.',
  keywords: ['consensus', 'Byzantine fault tolerance', 'voting', 'multi-agent systems', 'sycophancy', 'ensembles', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.15, 0.35, 0.05], dir: [0.05, 0.8, 1.2], half: 1.0, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { diverse: true, liar: true, hidden: true, agg: 'verify' }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const OC = { A: '#5B8DB8', B: GOOD, C: '#8C6BB1' };
    const AX = i => -2.4 + i * 0.6, AZ = -0.2;
    const ag = Array.from({ length: 7 }, (_, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#FFF' }), bar = P.box(0.3, 1, 0.3, '#fff', { r: 0.03, material: m }); bar.position.set(AX(i), 0, AZ); bar.userData.noFit = true; S.add(bar);
      const vm = new THREE.MeshLambertMaterial({ color: '#FFF' }), ball = P.ball(0.12, '#fff', { material: vm }); ball.position.set(AX(i), 0.12, AZ + 0.45); S.add(ball);
      return { m, bar, vm };
    });
    const tally = ['A', 'B', 'C'].map((k, i) => {
      const m = new THREE.MeshLambertMaterial({ color: OC[k] }), b = P.box(0.32, 1, 0.32, OC[k], { r: 0.03, material: m }); b.position.set(2.0 + i * 0.42, 0, -0.2); b.userData.noFit = true; S.add(b);
      return { b, k };
    });

    const lamp = P.lamp(GOOD, { h: 0.45, r: 0.12 }); lamp.position.set(2.42, 0, 0.45); S.add(lamp);
    const rec = P.box(0.42, 0.12, 0.32, '#3A3D4A', { r: 0.03 }); rec.position.set(1.85, 0, 0.45); S.add(rec);
    S.add(P.keep(-2.65, 2.75, 1.0, -0.45, 0.65));
    let R = null;
    const AGN = { majority: 'majority vote', conf: 'confidence-weighted vote', verify: 'each answer checked against the order record' };
    function draw() {
      R = decide(st);
      R.V.forEach((v, i) => { const A = ag[i]; A.bar.scale.y = v.c * 0.9; A.m.color.set(v.liar ? RED : v.syc ? SAF : '#C9C4B8'); A.vm.color.set(OC[v.a]); });
      const mx = Math.max(...Object.values(R.T));
      tally.forEach(T => { T.b.scale.y = Math.max(0.01, R.T[T.k] / mx * 0.8); });
      lamp.userData.set({ color: R.pick ? OC[R.pick] : '#C9C4B8', on: true });
      rec.visible = st.agg === 'verify';
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const AG = ['majority', 'conf', 'verify'];
    const controls = [
      { type: 'toggle', label: 'Diverse base models, so errors don\'t correlate', short: 'Diverse models', get: () => st.diverse, set: v => set({ diverse: !!v }) },
      { type: 'toggle', label: 'One agent is deceptive and confident', short: 'Deceiver', get: () => st.liar, set: v => set({ liar: !!v }) },
      { type: 'toggle', label: 'Hidden ballots: no agent sees another\'s vote', short: 'Hidden ballots', get: () => st.hidden, set: v => set({ hidden: !!v }) },
      { type: 'buttons', label: 'Decide by', options: ['Majority', 'Confidence', 'Check the record'], get: () => AG.indexOf(st.agg), act: i => set({ agg: AG[i] }) },
    ];
    const readouts = [
      { label: 'Decision', get: () => ({ v: `invoice ${R.pick}`, sub: R.right ? 'matches PO 4412' : 'wrong', good: R.right, bad: !R.right }) },
      { label: 'Votes for B', get: () => ({ v: `${R.V.filter(v => v.a === 'B').length} of 7`, sub: 'the right invoice' }) },
      { label: 'Method', get: () => ({ v: { majority: 'majority', conf: 'weighted', verify: 'verified' }[st.agg], sub: AGN[st.agg].split(' ').slice(0, 3).join(' ') }) },
    ];
    const labels = [
      { name: 'agents', t: 'Seven agents vote', d: 'Ball: the vote. Height: how sure', icon: 'user', atV: V(-2.55, 0.3, AZ) },
      { name: 'dec', t: 'Tally and decision', d: 'Green B is the right invoice', icon: 'check', atV: V(2.6, 0.3, 0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Run every agent on one model', hint: 'majority vote', on: () => set({ ...D0, diverse: false, agg: 'majority' }), off: reset },
      { label: 'Trust confidence, with a deceiver', hint: 'weighted vote', on: () => set({ ...D0, diverse: false, agg: 'conf' }), off: reset },
      { label: 'Let agents see the ballots', hint: 'the copier follows', on: () => set({ ...D0, hidden: false, agg: 'majority', diverse: false }), off: reset },
    ];
    function status() {
      const B = R.V.filter(v => v.a === 'B').length;
      if (st.agg === 'verify') return { ok: true, msg: `<b>Checked against the record for PO 4412, only invoice B matches, so B is chosen whatever the count${!st.diverse ? `: even with four agents sharing a hallucination of C` : ''}${st.liar ? ' and a confident deceiver voting A' : ''}.</b> Where an answer can be checked, verify it instead of counting it.` };
      if (R.right) return { ok: true, msg: `<b>${st.agg === 'conf' ? 'The confidence-weighted vote' : 'The majority'} picks B, ${B} of 7 votes${!st.liar ? '' : ', despite the deceiver'}: with diverse models the errors don\'t line up.</b> It worked here, but counting only aligns answers; it doesn\'t check them.` };
      if (!st.diverse && st.agg === 'majority' && !st.hidden) return { ok: false, msg: `<b>The four agents on one model all hallucinated C, the copier saw the ballots and followed, and C won the majority.</b> Visible ballots let conformity spread; a shared base model makes errors correlate. Collect hidden ballots, diversify models, and check where you can.` };
      if (!st.diverse && st.agg === 'conf') return { ok: false, msg: `<b>Weighted by confidence, the four agents sharing a model are each 90% sure of C and the deceiver is 99% sure of A: C wins with ${R.T.C.toFixed(1)} against ${R.T.B.toFixed(1)} for the right answer.</b> Confidence is not calibration, and a liar can claim any confidence it likes.` };
      return { ok: false, msg: `<b>Four agents on the same base model share one hallucination, invoice C, so the majority is wrong: C ${R.T.C}, B ${R.T.B}.</b> Classical fault tolerance assumes independent faults; a monoculture breaks that. Diversify the models, or check the answer against the record.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Seven votes', home: true, say: 'Seven agents at a Kigali logistics firm decide which invoice matches an order. Invoice B is right.', act: m => m.set({ diverse: true, liar: false, hidden: true, agg: 'majority' }) },
    { t: 'A monoculture', home: true, say: 'Four agents share a base model, and a hallucination. All four say C, and the majority goes wrong.', act: m => m.set({ diverse: false, liar: false, hidden: true, agg: 'majority' }) },
    { t: 'A confident liar', home: true, say: 'Weight votes by confidence, and a deceptive agent simply claims ninety-nine percent.', act: m => m.set({ diverse: false, liar: true, hidden: true, agg: 'conf' }) },
    { t: 'Visible ballots', home: true, say: 'Let agents see each other\'s votes, and the one that copies others follows the crowd.', act: m => m.set({ diverse: false, liar: true, hidden: false, agg: 'majority' }) },
    { t: 'Diversity and hidden ballots', home: true, say: 'Different base models and hidden ballots keep errors independent. Now the count lands on B.', act: m => m.set({ diverse: true, liar: true, hidden: true, agg: 'majority' }) },
    { t: 'Check, don\'t count', home: true, say: 'Consensus aligns answers; it doesn\'t make them right. Where you can check against the record, do.', act: m => m.set({ diverse: true, liar: true, hidden: true, agg: 'verify' }) },
  ],
  check: [
    { q: 'Why can a majority of agents be wrong together?', options: ['They share a base model and its errors', 'Votes are random', 'Majorities are always wrong'], answer: 0, why: 'Correlated errors break the independence assumption.', hint: 'Try Run every agent on one model.' },
    { q: 'What is the weakness of weighting by confidence?', options: ['A deceptive agent can claim any confidence', 'It is slow', 'It ignores votes'], answer: 0, why: 'Confidence is not calibration.', hint: 'Try Trust confidence, with a deceiver.' },
    { q: 'What do hidden ballots prevent?', options: ['Agents conforming to votes they can see', 'Lying', 'Hallucination'], answer: 0, why: 'Independence before aggregation.', hint: 'Try Let agents see the ballots.' },
  ],
  terms: [
    ['Byzantine fault tolerance', 'Agreement despite some nodes behaving arbitrarily (fewer than n/3).'],
    ['Monoculture', 'Agents on one base model, sharing its errors.'],
    ['Sycophancy', 'Conforming to others\' visible answers.'],
    ['Confidence weighting', 'Votes scaled by each agent\'s stated confidence.'],
    ['Hidden ballot', 'Each vote cast before seeing any other.'],
    ['Verification', 'Checking an answer against a record, test or tool.'],
  ],
  deeper: '<p><b>Debate as a topology.</b> Independent ballots, then a round of debate, then a final vote is a common pattern: independence first, correction second. The debate lesson in this track covers the rounds.</p><p><b>Robust aggregation.</b> Scoring proposals and taking a median resists a minority of liars better than a mean or a plain count.</p><p><b>About this machine.</b> The seven agents\' answers and confidences are fixed rules; tallies and decisions are computed live.</p>',
  code: {
    title: 'Count, weight, or check',
    note: 'Adapted from the course\'s consensus sketch (code/main.py).',
    text: `
def majority(ballots):
    return Counter(b.answer for b in ballots).most_common(1)[0][0]

def confidence_weighted(ballots):
    w = defaultdict(float)
    for b in ballots:
        w[b.answer] += b.confidence          # a liar can claim 0.99
    return max(w, key=w.get)

def verified(ballots, check):
    ok = [b.answer for b in ballots if check(b.answer)]   # e.g. match the PO record
    return ok[0] if ok else "escalate to a person"

ballots = [agent.vote(task) for agent in agents]          # hidden: no one sees the others
`,
  },
};
