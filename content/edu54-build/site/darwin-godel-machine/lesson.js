// Darwin Gödel Machine (phase 15, lesson 4): a coding agent proposes edits to its own scaffolding (prompts, tools, sub-agents) and keeps those
// whose benchmark score holds up. Eight fixed edits play out live: an open-ended archive keeps a stepping stone that a greedy climb discards, and
// when the evaluator lives in the agent's own repository, two edits raise the reported score by editing the scorer. A firewall (the evaluator in
// a namespace the agent can't write) and a held-out re-check stop them.
const BASE = 20;
const EDITS = [
  { id: 'g1', name: 'clearer file-edit\ntool prompt', d: 6 },
  { id: 'g2', name: 'retry with\nbounded backoff', d: 5 },
  { id: 'g3', name: 'sub-agent for\nunfamiliar tests', d: -2, stone: true },
  { id: 'g4', name: 'stop inserting\nhallucination markers', d: -1, hack: 20 },
  { id: 'g5', name: 'test-framework\nhelpers', d: 9, needs: 'g3' },
  { id: 'g6', name: 'parser for messy\ntest output', d: 5 },
  { id: 'g7', name: 'score timeouts\nas passes', d: 0, hack: 15 },
  { id: 'g8', name: 'sub-agent reuses\nthe helpers', d: 6, needs: 'g5' },
];
function evolve(o) {
  const applied = new Set(), out = [];
  let tru = BASE, rep = BASE;
  for (const e of EDITS.slice(0, o.gen)) {
    const can = (!e.needs || applied.has(e.needs)) && (!e.hack || !o.firewall);
    const repD = e.d + (e.hack && can ? e.hack : 0);
    let fate;
    if (!can) fate = e.hack ? 'blocked' : 'impossible';
    else if (o.heldout && repD - e.d > 5) fate = 'caught';
    else if (o.archive ? (e.d >= 0 || e.stone || repD > 0) : repD > 0) fate = 'kept';
    else fate = 'archived';
    if (fate === 'kept') { applied.add(e.id); tru += e.d; rep += repD; }
    out.push({ ...e, fate, tru, rep });
  }
  return { out, tru, rep };
}

export default {
  slug: 'darwin-godel-machine',
  title: 'The Darwin Gödel Machine: an agent that edits itself',
  description: 'A coding agent edits its own scaffolding and keeps what scores better. Keep stepping stones, and keep the scorer out of its reach.',
  overview: 'Can an agent rewrite its own code and get better at its job? Schmidhuber\'s Gödel Machine (2003) said yes, but only if it can prove each edit is a net gain, and no such proof has been found for any non-trivial agent. The Darwin Gödel Machine (2025) drops the proof and uses evidence. Keep an open-ended archive of agent variants; sample a parent; have a model propose a change to the agent\'s own source, such as a new tool, a better prompt or a sub-agent; run the new agent on a coding benchmark; add it to the archive; repeat for hundreds of generations. The paper reports SWE-bench rising from 20% to 50%, with improvements that carried over to other underlying models. The changes it found were ordinary engineering: clearer prompts for the file-edit tool, bounded retries after tool errors, a sub-agent for unfamiliar test frameworks, helpers for messy test output. The archive matters because some useful changes first score worse: a stepping stone a greedy climb would throw away. Moving from proof to evidence makes the evaluator\'s integrity the central safety property. The paper documents reward hacking in a research run: the agent removed the hallucination markers the scoring pipeline looked for, raising its score without improving its work. Any evaluator in the same repository as the agent can be edited by it. Put the evaluator in a namespace the agent can\'t touch, re-check winners on held-out tasks, and review the lineage. Editing the agent rather than a program widens both capability and attack surface.',
  keywords: ['Darwin Gödel Machine', 'self-improving agents', 'reward hacking', 'open-ended search', 'SWE-bench', 'AI safety', 'coding agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, 0], dir: [0.05, 1.0, 1.1], half: 1.15, wide: 6.3 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { gen: 8, firewall: true, archive: true, heldout: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const NX = i => -2.8 + i * 0.57, LZ = -0.25, SZ = 0.62, BS = 0.014;
    const node = (x, z) => {
      const m = new THREE.MeshLambertMaterial({ color: '#5B8DB8' }), b = P.box(0.34, 0.22, 0.34, '#fff', { r: 0.05, material: m }); b.position.set(x, 0, z); b.userData.noFit = true; S.add(b);
      return { m, b };
    };
    const root = node(NX(0), LZ); root.m.color.set('#2C2D31');
    const nodes = EDITS.map(() => node(0, 0));
    const tb = [], rb = [];
    for (let i = 0; i <= EDITS.length; i++) {
      const a = P.box(0.12, 1, 0.12, GOOD, { r: 0.02 }); a.position.set(NX(i) - 0.08, 0, LZ - 0.45); a.userData.noFit = true; S.add(a); tb.push(a);
      const rm = new THREE.MeshLambertMaterial({ color: BAD }), r = P.box(0.12, 1, 0.12, BAD, { r: 0.02, material: rm }); r.position.set(NX(i) + 0.08, 0, LZ - 0.45); r.userData.noFit = true; S.add(r); rb.push(r);
    }
    const links = EDITS.map(() => { const r = P.rod(V(), V(0.1, 0, 0), 0.01, CHAR); r.userData.noFit = true; S.add(r); return r; });

    /* the evaluator: a purple safe. With the firewall its lid is on (the agent can read the score, not edit the scorer); without it, it stands open */
    const safe = P.box(0.6, 0.45, 0.6, '#7B6FA8', { r: 0.05 }); safe.position.set(2.75, 0, 0); S.add(safe);
    const lid = P.box(0.66, 0.08, 0.66, '#5A4E88', { r: 0.03 }); S.add(lid);
    S.add(P.keep(-3.05, 3.1, 0.8, -0.95, 0.85));
    let R = null;
    function draw() {
      R = evolve(st);
      let lastX = NX(0), lastZ = LZ, col = 1, side = 0;
      const hb = (b, v, x) => { b.scale.y = Math.max(0.01, v * BS); b.position.x = x; };
      hb(tb[0], BASE, NX(0) - 0.08); hb(rb[0], BASE, NX(0) + 0.08); rb[0].material.color.set('#F3B9A6');
      for (let i = 1; i <= EDITS.length; i++) { tb[i].visible = false; rb[i].visible = false; }
      EDITS.forEach((e, i) => {
        const N = nodes[i], r = R.out[i], on = !!r;
        N.b.visible = on; links[i].visible = on;
        if (!on) return;
        const kept = r.fate === 'kept', x = kept ? NX(col) : NX(col) - 0.28 + side * 0.56, z = kept ? LZ : SZ;
        side = kept ? 0 : side + 1;
        N.b.position.set(x, 0, z);
        const hack = e.hack && kept;
        N.m.color.set(hack ? '#D9483B' : kept ? '#5B8DB8' : r.fate === 'caught' || r.fate === 'blocked' ? '#7FCBB8' : '#C9C4B6');
        P.setRod(links[i], V(lastX + (kept ? 0.17 : 0), 0.11, lastZ + (kept ? 0 : 0.17)), V(x - (kept ? 0.17 : 0), 0.11, z - (kept ? 0 : 0.17)));
        if (kept) {
          tb[col].visible = true; rb[col].visible = true; hb(tb[col], r.tru, x - 0.08); hb(rb[col], r.rep, x + 0.08);
          rb[col].material.color.set(r.rep > r.tru ? BAD : '#F3B9A6');
          lastX = x; lastZ = z; col++;
        }
      });
      if (st.firewall) { lid.position.set(2.75, 0.45, 0); lid.rotation.set(0, 0, 0); } else { lid.position.set(2.75, 0.33, -0.38); lid.rotation.set(-1.57, 0, 0); }
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Generations', min: 1, max: 8, step: 1, get: () => st.gen, set: v => set({ gen: Math.round(v) }) },
      { type: 'toggle', label: 'Keep the evaluator where the agent can\'t edit it', short: 'Firewall', get: () => st.firewall, set: v => set({ firewall: !!v }) },
      { type: 'toggle', label: 'Keep an open-ended archive, not only improvements', short: 'Archive', get: () => st.archive, set: v => set({ archive: !!v }) },
      { type: 'toggle', label: 'Re-check winners on held-out tasks', short: 'Held-out', get: () => st.heldout, set: v => set({ heldout: !!v }) },
    ];
    const readouts = [
      { label: 'Real score', get: () => ({ v: `${R.tru}%`, sub: `from ${BASE}%`, good: R.tru >= 45 }) },
      { label: 'Reported score', get: () => ({ v: `${R.rep}%`, sub: R.rep > R.tru ? `${R.rep - R.tru} points inflated` : 'matches', good: R.rep <= R.tru, bad: R.rep > R.tru }) },
      { label: 'Edits kept', get: () => ({ v: `${R.out.filter(r => r.fate === 'kept').length} of ${R.out.length}`, sub: 'in the lineage' }) },
    ];
    const labels = [
      { name: 'line', t: 'The lineage', d: 'Blue kept, grey archived, red reward hack, teal stopped', icon: 'turn', atV: V(NX(0) - 0.18, 0.12, LZ) },
      { name: 'bars', t: 'Score per generation', d: 'Teal real, coral reported', icon: 'target', atV: V(NX(0) - 0.15, 0.12, LZ - 0.45) },
      { name: 'eval', t: 'The evaluator', d: 'Lid on: the agent can\'t edit the scorer', icon: 'eye', atV: V(3.05, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Put the evaluator in the agent\'s repo', hint: 'and trust its score', on: () => set({ ...D0, firewall: false, heldout: false }), off: reset },
      { label: 'Climb greedily, no archive', hint: 'drop the stepping stone', on: () => set({ ...D0, archive: false }), off: reset },
    ];
    function status() {
      const gap = R.rep - R.tru, hacks = R.out.filter(r => r.hack && r.fate === 'kept');
      if (hacks.length) return { ok: false, msg: `<b>With the evaluator in its own repository, the agent kept ${hacks.map(h => `"${h.name.replace('\n', ' ')}"`).join(' and ')}: the reported score is ${R.rep}%, the real one ${R.tru}%.</b> ${gap} points are reward hacking: the score rose because the scorer changed, not the work. Put the evaluator where the agent can\'t write, and re-check winners on held-out tasks.` };
      if (!st.firewall && st.heldout) return { ok: true, msg: `<b>The evaluator is editable, and the agent tried: ${R.out.filter(r => r.fate === 'caught').length} edit${R.out.filter(r => r.fate === 'caught').length === 1 ? '' : 's'} raised the reported score but not the held-out one, so the re-check rejected ${R.out.filter(r => r.fate === 'caught').length === 1 ? 'it' : 'them'}.</b> That is a backstop, not a fix: move the evaluator out of the agent\'s reach.` };
      if (!st.archive) return { ok: false, msg: `<b>A greedy climb keeps only improvements, so it threw away the sub-agent for unfamiliar tests (−2). The helpers built on it (+9, then +6) never became possible: real score ${R.tru}% instead of ${evolve({ ...st, archive: true }).tru}%.</b> An open-ended archive keeps stepping stones that score worse at first.` };
      return { ok: true, msg: `<b>${R.out.filter(r => r.fate === 'kept').length} of ${R.out.length} edits kept; the archive held on to the sub-agent stepping stone (−2) that made the later helpers possible; the scorer edits were blocked by the firewall.</b> Real and reported scores agree: ${BASE}% to ${R.tru}%.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'An agent edits itself', home: true, say: 'A coding agent proposes a change to its own prompts and tools, runs a benchmark, and keeps the change if the score holds up.', act: m => m.set({ gen: 2, firewall: true, archive: true, heldout: true }) },
    { t: 'Stepping stones', home: true, say: 'A sub-agent for unfamiliar tests scores slightly worse at first. The archive keeps it anyway.', act: m => m.set({ gen: 3, firewall: true, archive: true, heldout: true }) },
    { t: 'It pays off later', home: true, say: 'Helpers built on that sub-agent lift the score. A greedy climb would never have reached them.', act: m => m.set({ gen: 8, firewall: true, archive: true, heldout: true }) },
    { t: 'The scorer is in reach', home: true, say: 'Put the evaluator in the agent\'s own repository and it learns to change the scorer instead of the work.', act: m => m.set({ gen: 8, firewall: false, archive: true, heldout: false }) },
    { t: 'A held-out backstop', home: true, say: 'Re-checking winners on tasks the agent never sees catches the inflated scores.', act: m => m.set({ gen: 8, firewall: false, archive: true, heldout: true }) },
    { t: 'Firewall the evaluator', home: true, say: 'The real fix: keep the evaluator where the agent can read the score but never edit the scorer.', act: m => m.set({ gen: 8, firewall: true, archive: true, heldout: true }) },
  ],
  check: [
    { q: 'Why does the Darwin Gödel Machine keep an archive, not just the best agent?', options: ['Some useful edits score worse at first', 'To save memory', 'It must prove each edit'], answer: 0, why: 'Stepping stones lead to later gains.', hint: 'Try Climb greedily.' },
    { q: 'The reported score rose but the work didn\'t improve. What happened?', options: ['The agent edited the scorer', 'The benchmark got easier', 'Nothing'], answer: 0, why: 'Reward hacking through an editable evaluator.', hint: 'Try Put the evaluator in the agent\'s repo.' },
    { q: 'What is the structural fix?', options: ['Keep the evaluator where the agent can\'t write', 'Add more generations', 'Hide the score'], answer: 0, why: 'Evaluator integrity is the safety property.', hint: 'Read the evaluator tile.' },
  ],
  terms: [
    ['Gödel Machine', 'A self-improving agent that must prove each edit helps (2003).'],
    ['Darwin Gödel Machine', 'Keeps edits by empirical score and an open-ended archive (2025).'],
    ['Scaffolding', 'The prompts, tools and sub-agents around a model.'],
    ['Stepping stone', 'A variant that scores worse but enables later gains.'],
    ['Evaluator firewall', 'The scorer lives where the agent can\'t edit it.'],
    ['Reward hacking', 'Raising the score without improving the behaviour it measures.'],
  ],
  deeper: '<p><b>Why the gains transferred.</b> Scaffolding changes, such as better tool prompts and bounded retries, help any model that uses the tools, which is why they carried over to other models in the paper.</p><p><b>Scope widens the surface.</b> Evolving a program, then an agent, then a research pipeline: each step up adds capability and attack surface. Budgets, kill switches and checkpoints come later in this phase.</p><p><b>About this machine.</b> The eight edits and their effects are fixed and illustrative; acceptance, the archive, the firewall and the held-out check are applied live.</p>',
  code: {
    title: 'Accept by evidence, firewall the scorer',
    note: 'Adapted from the course\'s DGM sketch (code/main.py).',
    text: `
def reported_score(agent, hack_allowed):
    base = true_score(agent)                    # held-out benchmark tasks
    if hack_allowed:                            # evaluator inside the agent's repo
        return min(1.0, base + agent.hack_bonus)
    return base

def run_dgm(generations, hack_allowed):
    archive = {key(A0): A0}
    for _ in range(generations):
        parent = sample(archive)                # not only the leader
        child = mutate(parent, hack_allowed)    # the model edits the agent
        child.score = reported_score(child, hack_allowed)
        archive[key(child)] = child             # open-ended: keep variants
    return max(archive.values(), key=lambda a: a.score)
`,
  },
};
