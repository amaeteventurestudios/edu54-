// Capstone 06, a troubleshooting agent for Kubernetes: an alert fires on an invented mobile-money checkout service. The agent walks a graph
// of cluster objects out from the alerting Service, gathers telemetry citations for each object it reaches and ranks root-cause hypotheses by
// citations × specificity × recency ÷ graph distance. Walk too shallow and the recent rollout gets blamed; let the agent act alone and it runs
// destructive fixes unreviewed; log only executed commands and near-misses vanish. Scores are computed live from the table below.
const CANDS = [
  { id: 'dep', name: 'recent rollout', hops: 1, recent: true, fix: 'roll back to the previous release' },
  { id: 'cm', name: 'config change', hops: 2, fix: 'revert the ConfigMap' },
  { id: 'pvc', name: 'full disk', hops: 2, fix: 'expand the volume' },
  { id: 'node', name: 'node CPU pressure', hops: 2, fix: 'cordon the node' },
  { id: 'batch', name: 'noisy batch job', hops: 3, fix: 'ask its team to move the batch job' },
];
const TRUE = { rollout: 'dep', config: 'cm', disk: 'pvc', neighbour: 'batch' };
function rank(o) {
  const cause = TRUE[o.incident];
  const hyps = CANDS.filter(c => c.hops <= o.depth).map(c => {
    let cites = 0, spec = 1;
    if (c.id === cause) { cites = 3; spec = 2; }
    else if (c.id === 'dep') cites = 1;
    else if (c.id === 'node' && o.incident === 'neighbour') cites = 2;
    return { ...c, cites, score: cites * spec * (c.recent ? 1.5 : 1) / c.hops };
  }).filter(h => h.score > 0).sort((a, b) => b.score - a.score);
  const top = hyps[0];
  return { cause, hyps, top, right: top && top.id === cause };
}

export default {
  slug: 'incident-root-cause-agent',
  title: 'A troubleshooting agent: walk the graph, then ask',
  description: 'An alert fires on a mobile-money checkout. A troubleshooting agent walks the cluster graph outward, ranks what it finds, and asks a person before it acts.',
  overview: 'By 2025 the production shape of an AI troubleshooting agent for Kubernetes had settled: an alert arrives, the agent reads metrics, logs and traces, walks a graph of cluster objects, ranks hypotheses about the root cause and posts a short brief with buttons for a human to approve a fix. It is read-only by default, and every change is gated. The graph is the core. Its nodes are cluster objects such as Services, Deployments, Pods, Nodes, volumes and ConfigMaps, plus the telemetry streams that observe them; its edges record ownership, scheduling, mounting and observation. When an alert fires on one object, the agent walks outwards a few hops, pulls the last few minutes of telemetry for each object it reaches, and drafts hypotheses. Each hypothesis is scored by its evidence: how many telemetry citations support it, how specific they are, how recent, and how far the object sits from the alert. The top few go to a human with their citations and graph paths. Most of the hard work is scope and safety, not reasoning. Walk too shallow and the agent blames whatever is nearby and recent, and a fresh rollout is always tempting. Destructive tools such as scaling, rolling back or deleting live behind an approval step, ideally on a separate server with credentials the agent never holds. And the audit log should record every command the agent considered, not just those it ran, so reviews catch near-misses. Teams test such agents on suites of synthetic incidents, such as memory-kill cascades, full volumes, bad config rollouts and noisy neighbours, scoring root-cause accuracy and time to a hypothesis. This machine follows an invented mobile-money checkout service in Nairobi.',
  keywords: ['AI SRE', 'Kubernetes troubleshooting', 'root cause analysis', 'knowledge graph', 'human approval', 'audit log', 'incident response agent'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { incident: 'neighbour', depth: 3, approve: true, audit: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', LINK = '#B9B3A6';
    /* the cluster as blocks joined by rods, walked outward from the alert */
    const NODES = {
      svc: { x: -2.1, z: -0.3, hops: 0 }, dep: { x: -1.2, z: -0.85, hops: 1 }, pods: { x: -1.2, z: 0.2, hops: 1 },
      cm: { x: -0.2, z: -0.85, hops: 2 }, pvc: { x: -0.2, z: -0.3, hops: 2 }, node: { x: -0.2, z: 0.25, hops: 2 }, batch: { x: 0.75, z: 0.25, hops: 3 },
    };
    const EDGES = [['svc', 'dep'], ['svc', 'pods'], ['dep', 'cm'], ['pods', 'pvc'], ['pods', 'node'], ['node', 'batch']];
    EDGES.forEach(([a, b]) => { const A = NODES[a], B = NODES[b]; S.add(P.rod(V(A.x, 0.1, A.z), V(B.x, 0.1, B.z), 0.018, LINK)); });
    Object.values(NODES).forEach(n => { n.m = new THREE.MeshLambertMaterial({ color: OFF }); const b = P.box(0.46, 0.24, 0.34, '#fff', { r: 0.04, material: n.m }); b.position.set(n.x, 0, n.z); S.add(b); });
    /* the three hypotheses as a podium, and the human gate before any fix */
    const pod = [0.46, 0.33, 0.2].map((h, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.3, h, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(1.05 + i * 0.34, 0, -0.75); S.add(b); return { m, b }; });
    const human = P.robot('#E07A5F', { scale: 0.55 }); human.position.set(1.5, 0, 0.25); S.add(human);
    const log = P.lamp(GOOD, { h: 0.14, r: 0.085 }); log.position.set(1.95, 0, 0.25); S.add(log);
    S.add(P.keep(-2.35, 2.1, 0.75, -1.1, 0.5));
    let R = null;
    function draw() {
      R = rank(st);
      Object.entries(NODES).forEach(([k, n]) => {
        const reached = n.hops <= st.depth, isTop = R.top && R.top.id === k;
        n.m.color.set(!reached ? OFF : isTop ? (R.right ? GOOD : BAD) : k === 'svc' ? SAF : '#5B8DB8');
      });
      pod.forEach((p, i) => { const h = R.hyps[i]; p.b.visible = !!h; p.m.color.set(h && h.id === R.cause ? GOOD : BAD); });
      human.visible = !!st.approve;
      log.userData.set({ color: st.audit ? GOOD : BAD, on: true });
    }
    function isOk() { return R.right && st.approve && st.audit; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const INC = ['rollout', 'config', 'disk', 'neighbour'];
    const controls = [
      { type: 'slider', label: 'Graph walk depth', min: 1, max: 3, step: 1, get: () => st.depth, set: v => set({ depth: +v }), fmt: v => `${v} hop${v > 1 ? 's' : ''}` },
      { type: 'toggle', label: 'Ask a human before any fix', short: 'Approval', get: () => st.approve, set: v => set({ approve: !!v }) },
      { type: 'toggle', label: 'Log every command considered', short: 'Full audit', get: () => st.audit, set: v => set({ audit: !!v }) },
      { type: 'buttons', label: 'Incident', options: ['Bad rollout', 'Config typo', 'Full disk', 'Noisy neighbour'], get: () => INC.indexOf(st.incident), act: i => set({ incident: INC[i] }) },
    ];
    const readouts = [
      { label: 'Top hypothesis', get: () => ({ v: R.top ? R.top.name : 'none', sub: R.right ? 'matches the cause' : 'wrong cause', good: R.right, bad: !R.right }) },
      { label: 'Walk depth', get: () => ({ v: `${st.depth} hop${st.depth > 1 ? 's' : ''}`, sub: 'from the alert', good: R.right, bad: !R.right }) },
      { label: 'Fixes', get: () => ({ v: st.approve ? 'gated' : 'automatic', sub: 'destructive tools', good: st.approve, bad: !st.approve }) },
    ];
    const labels = [
      { name: 'g', t: 'Cluster graph', d: 'Gold: the alert. Grey: not reached', icon: 'link', atV: V(-2.33, 0.15, -0.3) },
      { name: 't', t: 'A person approves', d: 'Nothing changes before that', icon: 'user', atV: V(1.72, 0.2, 0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Look only one hop out', hint: 'blame what is near', on: () => set({ ...D0, depth: 1 }), off: reset },
      { label: 'Let the agent fix things alone', hint: 'no approval step', on: () => set({ ...D0, approve: false }), off: reset },
      { label: 'Log only commands that ran', hint: 'near-misses vanish', on: () => set({ ...D0, audit: false }), off: reset },
    ];
    function status() {
      const r = R, causeName = CANDS.find(c => c.id === r.cause).name, need = CANDS.find(c => c.id === r.cause).hops;
      if (!r.right) return { ok: false, msg: `<b>Walking ${st.depth} hop${st.depth > 1 ? 's' : ''} out, the agent never reaches the real cause, a ${causeName} ${need} hops away, so it blames the ${r.top ? r.top.name : 'nothing'} and proposes to ${r.top ? r.top.fix : 'escalate'}.</b> ${st.approve ? 'A human reviewing the citations can catch it, but the' : 'With no approval step it does so at once. The'} fix is to walk far enough to cover the dependencies.` };
      if (!st.approve) return { ok: false, msg: `<b>The diagnosis is right, but the agent will ${r.top.fix} on its own.</b> It was right this time; next time it may roll back a good release or evict another team\'s work. Keep destructive tools behind an approval step, with credentials the agent never holds.` };
      if (!st.audit) return { ok: false, msg: '<b>The log shows only the commands that ran, so nobody sees that the agent considered deleting every checkout pod.</b> Log every command considered, executed and approved, so reviews catch near-misses before they happen.' };
      return { ok: true, msg: `<b>Walking ${st.depth} hops, the agent ranks the ${causeName} first, score ${r.top.score.toFixed(1)}, with ${r.top.cites} telemetry citations, and proposes to ${r.top.fix}.</b> A human approves it, and the log records every command it considered, including the one it rejected.` };
    }
    return { update: dt => { human.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'An alert fires', home: true, say: 'Payments are failing on a checkout service. A troubleshooting agent starts from the alerting Service.', act: m => m.set({ incident: 'neighbour', depth: 1, approve: true, audit: true }) },
    { t: 'Too close to home', home: true, say: 'Looking one hop out, the recent rollout is the most tempting suspect. It is wrong.', act: m => m.set({ incident: 'neighbour', depth: 1, approve: true, audit: true }) },
    { t: 'Walk the graph', home: true, say: 'Walk further: pods, the node they run on, and another team\'s batch job hogging it.', act: m => m.set({ incident: 'neighbour', depth: 3, approve: true, audit: true }) },
    { t: 'Rank by evidence', home: true, say: 'Each hypothesis is scored by citations, specificity and recency, divided by distance.', act: m => m.set({ incident: 'config', depth: 3, approve: true, audit: true }) },
    { t: 'Ask first', home: true, say: 'The agent proposes a fix, and a human approves it. Destructive tools stay behind that gate.', act: m => m.set({ incident: 'neighbour', depth: 3, approve: true, audit: true }) },
    { t: 'Log what it considered', home: true, say: 'The audit log keeps every command considered, not only those run, so near-misses are seen.', act: m => m.set({ incident: 'neighbour', depth: 3, approve: true, audit: true }) },
  ],
  check: [
    { q: 'Why does a shallow walk blame the rollout?', options: ['It is recent and nearby; the real cause is out of reach', 'Rollouts always cause incidents', 'The graph is wrong'], answer: 0, why: 'Walk far enough to cover dependencies.', hint: 'Try Look only one hop out.' },
    { q: 'How is each hypothesis ranked here?', options: ['Citations × specificity × recency ÷ distance', 'By the model\'s confidence alone', 'Alphabetically'], answer: 0, why: 'Evidence beats guesswork.', hint: 'Read the hypotheses tile.' },
    { q: 'Why log commands the agent only considered?', options: ['Reviews catch near-misses', 'It is faster', 'Law requires it'], answer: 0, why: 'Rejected deletes matter.', hint: 'Try Log only commands that ran.' },
  ],
  terms: [
    ['Root cause', 'The underlying fault that set off the symptoms.'],
    ['Knowledge graph', 'Cluster objects and telemetry joined by their relationships.'],
    ['Hop', 'One edge in the graph away from the starting object.'],
    ['Citation', 'A piece of telemetry that supports a hypothesis.'],
    ['Approval gate', 'A human sign-off required before a destructive action.'],
    ['Noisy neighbour', 'Another workload on the same machine starving yours of resources.'],
  ],
  deeper: '<p><b>Synthetic incidents.</b> Build a suite of known faults, such as memory kills, full volumes, bad config and noisy neighbours, and score root-cause accuracy and time to hypothesis before trusting the agent.</p><p><b>Cost.</b> A cascade of alerts can trigger many agent runs; cap spend per incident.</p><p><b>About this machine.</b> The service, graph and scores are invented for illustration.</p>',
  code: {
    title: 'Walk, score, propose',
    note: 'Written for this lesson.',
    text: `
from collections import deque

def walk(graph, start, depth):
    seen, queue = {start: 0}, deque([start])
    while queue:
        node = queue.popleft()
        if seen[node] == depth:
            continue
        for nxt in graph[node]:
            if nxt not in seen:
                seen[nxt] = seen[node] + 1
                queue.append(nxt)
    return seen                                    # object -> hops from the alert

def rank(seen, evidence):
    hyps = []
    for obj, hops in seen.items():
        e = evidence.get(obj)
        if e and hops:
            hyps.append((e.citations * e.specificity * e.recency / hops, obj, e))
    return sorted(hyps, reverse=True)[:3]          # top three go to a human with citations
`,
  },
};
