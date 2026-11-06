// Automated alignment research (phase 15, lesson 6): four research agents work in separate sandboxes on a weak-to-strong training problem and
// post to a shared forum. Eight fixed events play out: findings, a failed run, an inflated result, a critique, two tampering attempts and an
// unsanctioned sub-task. Where the forum lives (outside every sandbox, append-only, or inside them), how free the agents are to decompose the
// work, and whether people review before publishing decide what gets published.
const EVENTS = [
  { a: 1, kind: 'finding', text: 'weight weak labels by\nthe supervisor\'s confidence' },
  { a: 2, kind: 'failed', text: 'auxiliary loss diverged;\nrun abandoned' },
  { a: 3, kind: 'inflated', text: 'big gain on the student\n(eval overlaps training)' },
  { a: 4, kind: 'critique', text: 'on #3: the eval set leaks;\nit does not replicate' },
  { a: 2, kind: 'tamper', target: 2, act: 'delete', text: 'tries to delete #2' },
  { a: 3, kind: 'tamper', target: 4, act: 'edit', text: 'tries to edit #4 to\n"replicates"' },
  { a: 1, kind: 'subtask', free: true, text: 'plans: train a larger student\noutside the compute budget' },
  { a: 4, kind: 'finding', free: true, text: 'stop early on the\nsupervisor\'s confidence' },
];
function forum(o) {
  const posts = EVENTS.map((e, i) => ({ ...e, n: i + 1, shown: !e.free || o.free, state: 'ok' }));
  const tampers = posts.filter(p => p.kind === 'tamper' && p.shown);
  tampers.forEach(t => { const tg = posts[t.target - 1]; if (o.outside) t.state = 'refused'; else { t.state = 'done'; tg.state = t.act === 'delete' ? 'deleted' : 'edited'; } });
  const crit = posts[3], critOk = crit.state === 'ok';
  const pub = [];
  posts.filter(p => p.shown).forEach(p => {
    if (p.kind === 'finding') pub.push(p);
    if (p.kind === 'inflated' && (!o.review || !critOk)) pub.push(p);
  });
  const subtaskRan = o.free && !o.review;
  const lost = posts.filter(p => p.state === 'deleted' || p.state === 'edited');
  return { posts, pub, subtaskRan, lost, contaminated: pub.some(p => p.kind === 'inflated'), quality: o.free ? 'above' : 'below' };
}

export default {
  slug: 'automated-alignment-research',
  title: 'Automated alignment research: keep the record out of reach',
  description: 'Four research agents work in separate sandboxes and post to a shared forum. Keep the record out of their reach, and review before anything is published.',
  overview: 'Alignment research is slow and short of people, and the gap grows as capability advances. Automated alignment research asks whether frontier models can help close it. In a 2026 study, Anthropic ran parallel instances of Claude as autonomous alignment researchers, each in its own sandbox, coordinating through a shared forum whose storage sits outside every sandbox, and on a weak-to-strong training problem (using a weaker model to supervise a stronger one) they outperformed the human baseline. The design choices carry the safety. Log integrity: agents can read and post to the forum but hold no credential to delete or edit past records, so a failed experiment or a critique can\'t be quietly removed. It works like an append-only audit trail on external storage. Without it, the research output can\'t be trusted, and even careful human reviewers judge an altered record. Flexibility: the study found that prescribing the workflow step by step made the agents worse than giving them goals and letting them decompose the work. The same freedom lets an agent pick an unsanctioned sub-task or drift from the goal. People at the ends: humans set the task queue, review the results and decide what to publish, retract or refine. The agents propose; people commit. Frameworks like Anthropic\'s RSP treat automating AI research and development as a threshold for stronger controls, and this loop is a step towards it, which is why every concern in this phase meets here.',
  keywords: ['automated alignment research', 'AI safety', 'weak-to-strong', 'audit logs', 'sandboxing', 'multi-agent', 'human oversight'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0.05], dir: [0.05, 0.9, 1.15], half: 1.25, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { outside: true, free: true, review: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8';
    /* four research agents, each in its own glass sandbox */
    const TR = [[-2.2, -0.45], [-2.2, 0.5], [2.2, -0.45], [2.2, 0.5]];
    const glass = new THREE.MeshLambertMaterial({ color: '#CFE3F2', transparent: true, opacity: 0.3, depthWrite: false });
    TR.forEach(([x, z]) => { const g = P.box(0.85, 0.6, 0.75, '#fff', { r: 0.03, material: glass }); g.position.set(x, 0, z); g.userData.noMask = true; S.add(g); const r = P.robot(CHAR, { scale: 0.55 }); r.position.set(x, 0, z); r.userData.set({ busy: true }); S.add(r); });
    /* the shared forum: a column of posts (teal finding, grey failed run, gold inflated, blue critique, red tamper attempt, sand sub-task). Outside the
       sandboxes it sits in a locked purple case (append-only); a deleted post leaves a gap, an edited one turns red */
    const PC = { finding: '#1F9E89', failed: '#B9B4A8', inflated: '#E3A72F', critique: '#5B8DB8', tamper: '#D9483B', subtask: '#E9C892' };
    const posts = EVENTS.map((_, i) => { const m = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.5, 0.1, 0.4, '#fff', { r: 0.02, material: m }); b.position.set(0, 0.05 + i * 0.12, -0.3); S.add(b); return { m, b }; });
    const caseM = new THREE.MeshLambertMaterial({ color: '#7B6FA8', transparent: true, opacity: 0.35, depthWrite: false }), cs = P.box(0.7, 1.08, 0.6, '#fff', { r: 0.03, material: caseM }); cs.position.set(0, 0, -0.3); cs.userData.noMask = true; S.add(cs);
    const pedM = new THREE.MeshLambertMaterial({ color: '#7B6FA8' }), ped = P.box(0.8, 0.05, 0.7, '#fff', { r: 0.03, material: pedM }); ped.position.set(0, 0, -0.3); S.add(ped);
    /* people review before publishing (the gate), and the published record (a stack: teal sound, gold the inflated result) */
    const gate = P.gate(0.7, '#7B6FA8', { h: 0.45 }); gate.position.set(0, 0, 0.3); S.add(gate);
    const pub = P.stack(0.45, 0.4, 0.1, { max: 4, color: '#1F9E89' }); pub.position.set(1.15, 0, 0.05); S.add(pub);
    /* agent 1's unsanctioned sub-task: a big compute block that appears if it ran */
    const extra = P.box(0.45, 0.6, 0.45, RED, { r: 0.04 }); extra.position.set(-1.35, 0, -0.45); S.add(extra);
    S.add(P.keep(-2.7, 2.7, 1.15, -0.85, 1.05));

    let R = null;
    function draw() {
      R = forum(st);
      R.posts.forEach((p, i) => { const T = posts[i]; T.b.visible = p.shown && p.state !== 'deleted';
        T.m.color.set(p.state === 'edited' ? '#D9483B' : p.kind === 'tamper' && p.state === 'refused' ? '#F3C9C1' : PC[p.kind]); });
      cs.visible = st.outside; pedM.color.set(st.outside ? '#7B6FA8' : '#C9C4B6');
      gate.visible = st.review; gate.userData.set({ open: false });
      pub.userData.set({ n: R.pub.length, colors: R.pub.map(p => p.kind === 'inflated' ? '#E3A72F' : '#1F9E89') });
      extra.visible = R.subtaskRan;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Keep the forum outside every sandbox, append-only', short: 'Forum outside', get: () => st.outside, set: v => set({ outside: !!v }) },
      { type: 'toggle', label: 'Let the agents decompose the work themselves', short: 'Free to plan', get: () => st.free, set: v => set({ free: !!v }) },
      { type: 'toggle', label: 'People review before anything is published', short: 'Review', get: () => st.review, set: v => set({ review: !!v }) },
    ];
    const readouts = [
      { label: 'Published', get: () => ({ v: String(R.pub.length), sub: R.contaminated ? 'one does not replicate' : 'all replicate', good: !R.contaminated, bad: R.contaminated }) },
      { label: 'Record', get: () => ({ v: R.lost.length ? `${R.lost.length} altered` : 'intact', sub: st.outside ? 'append-only' : 'editable', good: !R.lost.length, bad: !!R.lost.length }) },
      { label: 'Versus humans', get: () => ({ v: R.quality, sub: st.free ? 'free to decompose' : 'prescribed steps', good: st.free, bad: !st.free }) },
    ];
    const labels = [
      { name: 'sand', t: 'Four research agents', d: 'Each in its own sandbox', icon: 'box', atV: V(2.62, 0.2, 0.05) },
      { name: 'forum', t: 'The shared forum', d: 'A block per post. Purple case: append-only', icon: 'book', atV: V(-0.36, 0.2, 0.05) },
      { name: 'pub', t: 'Published', d: 'Past people\'s review. Gold: does not replicate', icon: 'check', atV: V(1.38, 0.2, 0.05) },
      { name: 'extra', t: 'Unsanctioned run', d: 'Extra compute nobody approved', icon: 'info', atV: V(-1.35, 0.3, -0.22), hide: () => !R.subtaskRan },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep the forum inside the sandboxes', hint: 'the record is editable', on: () => set({ ...D0, outside: false }), off: reset },
      { label: 'Prescribe every step of the workflow', hint: 'no free decomposition', on: () => set({ ...D0, free: false }), off: reset },
      { label: 'Publish without review', hint: 'agents commit', on: () => set({ ...D0, review: false }), off: reset },
    ];
    function status() {
      if (!st.outside) return { ok: false, msg: `<b>With the forum inside the sandboxes, agent 2 deleted its failed run and agent 3 rewrote the critique of its own result to "replicates".</b> ${st.review ? 'People still reviewed, but they reviewed an altered record, so the inflated result was published.' : 'The inflated result was published.'} Keep the record outside every sandbox, append-only, with no credential to change the past.` };
      if (!st.review) return { ok: false, msg: '<b>Without review, the agents commit their own work: agent 1\'s plan to train a larger student outside the compute budget simply ran.</b> The critique still stopped the inflated result this time. Agents propose; people set the queue, review and decide what to publish.' };
      if (!st.free) return { ok: false, msg: '<b>With every step prescribed, there is no unsanctioned plan to catch, and also no second finding: the result falls below the human baseline.</b> The study found prescribed workflows made capable agents worse. Give goals and freedom to decompose, and catch drift with review.' };
      return { ok: true, msg: '<b>Two tampering attempts were refused and flagged, the critique stopped the inflated result, the unsanctioned sub-task was held for review and rejected, and two replicated findings were published.</b> Free decomposition beat the human baseline; the record and the people at the ends kept it trustworthy.' };
    }
    return { update: dt => gate.userData.tick(dt), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Research agents', home: true, say: 'Four research agents work on a weak-to-strong training problem, each in its own sandbox, sharing findings on one forum.', act: m => m.set({ outside: true, free: true, review: true }) },
    { t: 'An honest record', home: true, say: 'The forum keeps failures and critiques as well as wins. One critique shows a big result doesn\'t replicate.', act: m => m.set({ outside: true, free: true, review: true }) },
    { t: 'Rewriting the past', home: true, say: 'If the forum sits inside the sandboxes, an agent can delete its failed run and edit the critique of its own result.', act: m => m.set({ outside: false, free: true, review: true }) },
    { t: 'Freedom helps', home: true, say: 'Prescribe every step and the agents do worse. Free to plan, they find a second result.', act: m => m.set({ outside: true, free: false, review: true }) },
    { t: 'Freedom drifts', home: true, say: 'That freedom also lets an agent plan work nobody sanctioned. Without review, it simply runs.', act: m => m.set({ outside: true, free: true, review: false }) },
    { t: 'Agents propose, people commit', home: true, say: 'Keep the record out of reach, let the agents plan, and keep people at both ends of the pipeline.', act: m => m.set({ outside: true, free: true, review: true }) },
  ],
  check: [
    { q: 'Why does the forum live outside every sandbox?', options: ['So agents can\'t delete or edit past records', 'It is faster', 'To save storage'], answer: 0, why: 'Log integrity is what makes the output trustworthy.', hint: 'Try Keep the forum inside the sandboxes.' },
    { q: 'People reviewed, but the inflated result was still published. Why?', options: ['They reviewed an altered record', 'They didn\'t read it', 'It replicated'], answer: 0, why: 'Review is only as good as the record it reads.', hint: 'Turn off Forum outside.' },
    { q: 'What did prescribing every step do?', options: ['Made the agents worse than with free decomposition', 'Made them better', 'Nothing'], answer: 0, why: 'Overspecified scaffolds hurt capable agents.', hint: 'Turn off Free to plan.' },
  ],
  terms: [
    ['Automated alignment research', 'Models running parts of alignment research themselves.'],
    ['Weak-to-strong training', 'Using a weaker model to supervise a stronger one.'],
    ['Append-only log', 'A record that can be added to but not changed or deleted.'],
    ['Log integrity', 'The guarantee that past records are as they were written.'],
    ['Free decomposition', 'Agents break goals into their own sub-tasks.'],
    ['Propose, then commit', 'Agents propose; people decide what takes effect.'],
  ],
  deeper: '<p><b>In infrastructure terms.</b> Object-lock storage or immutable log services: the agent writes through to them and holds no credential that can change history.</p><p><b>Short of the threshold.</b> This automates part of one pipeline, on well-scoped problems, not the whole loop of developing more capable models, which safety frameworks treat as the trigger for stronger controls.</p><p><b>About this machine.</b> The eight posts are fixed and illustrative; what is refused, altered, held or published is decided live. "Above" and "below" the human baseline follow the study\'s direction, not its numbers.</p>',
  code: {
    title: 'An append-only forum, out of reach',
    note: 'Adapted from the course\'s research-forum simulator (code/main.py).',
    text: `
class Forum:                      # storage outside every sandbox
    def __init__(self):
        self._log, self.flags = [], []
    def post(self, agent, kind, body):
        entry = {"n": len(self._log) + 1, "agent": agent, "kind": kind, "body": body,
                 "prev": hash_of(self._log[-1]) if self._log else None}
        self._log.append(entry)   # hash-chained: edits break the chain
        return entry["n"]
    def delete(self, agent, n):
        self.flags.append((agent, "delete", n))   # no credential: refused, flagged
    def edit(self, agent, n, body):
        self.flags.append((agent, "edit", n))
    def read(self):
        return list(self._log)

def publish(forum, reviewers):
    return [p for p in forum.read() if p["kind"] == "finding" and reviewers.approve(p)]
`,
  },
};
