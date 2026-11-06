// Multi-agent failure modes (phase 16, lesson 23): an Abuja insurer's claims team of agents is run 100 times. Sixty runs fail, split the way the
// MAST taxonomy found across 1,642 traces: specification problems (about 42%), coordination failures (about 37%) and verification gaps (about 21%).
// Each mitigation removes most of its own category; adding agents adds coordination failures; reviewers on one model agree with each other.
// The 100-run grid and failure rate are computed live.
const BASE = { spec: 25, coord: 22, verif: 13 };
const EX = {
  spec: ['two agents both think they are the reviewer', '"assess this claim" with no rule for what done means'],
  coord: ['two agents write the claim record at once; one update lost', 'the payout agent starts before the fraud check finishes'],
  verif: ['the summary says "approved"; nobody checked the policy limit', 'three reviewers on one model agree on the same mistake'],
};
function runs(o) {
  const extra = Math.max(0, o.agents - 4) * 4;
  let spec = BASE.spec, coord = BASE.coord + extra, verif = BASE.verif;
  if (o.contracts) spec = Math.round(spec * 0.3);
  if (o.state) coord = Math.round(coord * 0.3);
  if (o.verifier) verif = Math.round(verif * 0.35);
  if (o.diverse && o.verifier) verif = Math.round(verif * 0.5);
  const grid = [];
  ['spec', 'coord', 'verif'].forEach(k => { for (let i = 0; i < { spec, coord, verif }[k]; i++) grid.push(k); });
  while (grid.length < 100) grid.push('ok');
  return { spec, coord, verif, fail: spec + coord + verif, grid: grid.slice(0, 100) };
}

export default {
  slug: 'multi-agent-failure-modes',
  title: 'Why agent teams fail: the MAST taxonomy',
  description: 'An insurer in Abuja runs its claims agents a hundred times and sixty runs fail. Sort the failures, fix each cause, and see what adding agents does.',
  overview: 'Multi-agent systems fail often. The MAST study (Cemri and colleagues, 2025) examined 1,642 execution traces across seven open-source systems and found failure rates between 41% and 87%, with structural causes. Specification problems were the largest group, about 42% of failures: role ambiguity (two agents both think they are the reviewer), underspecified tasks and success criteria nobody wrote down. The fixes are explicit role contracts that say what each agent does and does not do, acceptance tests defined before work starts, and a check of the task definition before dispatch. Coordination failures, about 37%: agents updating shared state without synchronisation, lost messages, and state drift where one agent thinks the job is done while another is still working. Fixes: versioned shared state with optimistic concurrency, acknowledgements for critical messages, periodic state checks. Verification gaps, about 21%: an answer that nobody independently checked. The fix is an independent verifier, ideally deterministic. Across categories run familiar patterns from earlier in this phase: groupthink and monoculture, where agents sharing a base model reinforce one another\'s errors; cascading errors, where one bad output poisons everything downstream; and the temptation to fix failures by adding agents, which adds coordination surface and usually more failures. The production practice is to treat the taxonomy as a design checklist: for each category, name the mitigation you have deployed, and measure the failure rate on real tasks before and after.',
  keywords: ['MAST', 'failure modes', 'multi-agent systems', 'reliability', 'verification', 'coordination', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.1], dir: [0.05, 1.05, 1.12], half: 1.2, wide: 5.7 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { contracts: true, state: true, verifier: true, diverse: true, agents: 4 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#C9C4B6';
    const KC = { ok: '#CFEDE5', spec: '#5B8DB8', coord: SAF, verif: BAD };
    /* a hundred runs: ten rows of ten blocks, coloured by why the run failed */
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.1, 0.17), new THREE.MeshLambertMaterial({ color: '#FFF' }), 100);
    im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    for (let i = 0; i < 100; i++) { m4.makeTranslation(-2.5 + (i % 10) * 0.2, 0.05, -1.0 + Math.floor(i / 10) * 0.2); im.setMatrixAt(i, m4); }
    im.instanceMatrix.needsUpdate = true;
    /* three root causes: a tower of failed runs each, with a lamp in front for its fix (two for verification: a verifier, then diverse reviewers) */
    const TX = i => 0.3 + i * 0.75, TZ = -0.6;
    const cats = ['spec', 'coord', 'verif'].map((k, i) => {
      const b = P.tower(0.46, 0.46, KC[k]); b.userData.set({ cap: '' }); b.position.set(TX(i), 0, TZ); b.userData.noFit = true; S.add(b);
      const l = P.lamp(OFF, { h: 0.24, r: 0.09 }); l.position.set(TX(i) - (k === 'verif' ? 0.13 : 0), 0, TZ + 0.42); S.add(l);
      return { k, b, l };
    });
    const div = P.lamp(OFF, { h: 0.24, r: 0.09 }); div.position.set(TX(2) + 0.13, 0, TZ + 0.42); S.add(div);
    /* the team: up to eight agents; every agent past four adds coordination failures and turns coral */
    const bots = Array.from({ length: 8 }, (_, i) => { const r = P.robot('#5B8DB8', { scale: 0.42 }); r.position.set(TX(2) + 0.1 - i * 0.27, 0, 0.55); S.add(r); return r; });
    S.add(P.keep(-2.7, 2.2, 1.3, -1.15, 0.8));

    let R = null;
    const ON = { spec: () => st.contracts, coord: () => st.state, verif: () => st.verifier };
    function draw() {
      R = runs(st);
      R.grid.forEach((k, i) => im.setColorAt(i, col.set(KC[k])));
      im.instanceColor.needsUpdate = true;
      cats.forEach(Cc => {
        Cc.b.userData.set({ h: Math.max(0.03, R[Cc.k] / 40 * 1.2) });
        Cc.l.userData.set({ color: ON[Cc.k]() ? GOOD : BAD, on: true });
      });
      div.userData.set({ color: !st.verifier ? OFF : st.diverse ? GOOD : BAD, on: st.verifier });
      bots.forEach((r, i) => { r.visible = i < st.agents; r.userData.set({ color: i < 4 ? '#5B8DB8' : BAD }); });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Agents on the team', min: 3, max: 8, step: 1, get: () => st.agents, set: v => set({ agents: Math.round(v) }) },
      { type: 'toggle', label: 'Role contracts and acceptance tests', short: 'Contracts', get: () => st.contracts, set: v => set({ contracts: !!v }) },
      { type: 'toggle', label: 'Versioned shared state and acknowledged messages', short: 'Sync', get: () => st.state, set: v => set({ state: !!v }) },
      { type: 'toggle', label: 'An independent verifier', short: 'Verifier', get: () => st.verifier, set: v => set({ verifier: !!v }) },
      { type: 'toggle', label: 'Reviewers on different base models', short: 'Diverse', get: () => st.diverse, set: v => set({ diverse: !!v }) },
    ];
    const readouts = [
      { label: 'Failed runs', get: () => ({ v: `${R.fail} of 100`, sub: 'no mitigations: 60', good: R.fail <= 25, bad: R.fail > 40 }) },
      { label: 'Largest category', get: () => { const k = ['spec', 'coord', 'verif'].sort((a, b) => R[b] - R[a])[0]; return { v: { spec: 'specification', coord: 'coordination', verif: 'verification' }[k], sub: `${R[k]} runs` }; } },
      { label: 'Team size', get: () => ({ v: `${st.agents} agents`, sub: st.agents > 4 ? `+${(st.agents - 4) * 4} coordination failures` : 'no extra overhead', bad: st.agents > 5 }) },
    ];
    const labels = [
      { name: 'grid', t: 'A hundred runs', d: 'Coloured by why they failed', icon: 'box', atV: V(-2.62, 0.1, -0.1) },
      { name: 'cats', t: 'Three root causes', d: 'Each lamp: that cause\'s fix', icon: 'check', atV: V(TX(2) + 0.24, 0.1, TZ) },
      { name: 'team', t: 'The team', d: 'Coral: agents past four', icon: 'user', atV: V(TX(2) + 0.2, 0.15, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Fix failures by adding agents', hint: 'eight agents, no sync', on: () => set({ ...D0, agents: 8, state: false }), off: reset },
      { label: 'Check with reviewers on one model', hint: 'groupthink', on: () => set({ ...D0, diverse: false }), off: reset },
      { label: 'Skip role contracts and tests', hint: 'specification', on: () => set({ ...D0, contracts: false }), off: reset },
    ];
    function status() {
      if (st.agents > 5 && !st.state) return { ok: false, msg: `<b>Eight agents and no synchronisation: coordination failures rise to ${R.coord}, and ${R.fail} of 100 runs fail.</b> More agents add more shared state, more messages and more chances for one to think the job is done while another works. Fix the cause in its own category instead.` };
      if (!st.contracts) return { ok: false, msg: `<b>Without role contracts and acceptance tests, ${R.spec} runs fail on specification: two agents both acting as reviewer, a claim "assessed" with no rule for done.</b> Specification is the largest MAST category. Write what each agent does and doesn\'t do, and what done looks like, before dispatch.` };
      if (st.verifier && !st.diverse) return { ok: false, msg: `<b>The verifier step is there, but all three reviewers run on one base model and agree on the same mistakes: ${R.verif} runs still fail verification.</b> Groupthink is a monoculture problem. Put reviewers on different models, or make the check deterministic.` };
      if (!st.verifier) return { ok: false, msg: `<b>With no independent verifier, ${R.verif} runs end with an answer nobody checked, such as an approval past the policy limit.</b> Verification gaps are a fifth of failures; one deterministic check closes most of them.` };
      if (!st.state) return { ok: false, msg: `<b>Without versioned state and acknowledgements, ${R.coord} runs fail on coordination: lost updates to the claim record, and payouts that start before the fraud check finishes.</b>` };
      return { ok: true, msg: `<b>A mitigation against each category: contracts and tests cut specification failures to ${R.spec}, versioned state and acknowledgements cut coordination to ${R.coord}, a verifier on a different model cuts verification to ${R.verif}. ${R.fail} of 100 runs fail, down from 60.</b> Name the fix for every category, then measure again.` };
    }
    return { update: dt => { cats.forEach(Cc => Cc.b.userData.tick(dt)); bots.forEach(r => r.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Sixty of a hundred', home: true, say: 'An insurer in Abuja runs its claims team of agents a hundred times. Sixty runs fail.', act: m => m.set({ contracts: false, state: false, verifier: false, diverse: true, agents: 4 }) },
    { t: 'Unclear specifications', home: true, say: 'The biggest group: roles nobody pinned down and no definition of done. Role contracts and acceptance tests fix most of them.', act: m => m.set({ contracts: true, state: false, verifier: false, diverse: true, agents: 4 }) },
    { t: 'Broken coordination', home: true, say: 'Next: lost updates and agents out of step. Versioned state and acknowledged messages.', act: m => m.set({ contracts: true, state: true, verifier: false, diverse: true, agents: 4 }) },
    { t: 'Nobody checked', home: true, say: 'Then answers nobody verified. An independent check closes most of the gap.', act: m => m.set({ contracts: true, state: true, verifier: true, diverse: true, agents: 4 }) },
    { t: 'More agents', home: true, say: 'Add agents to fix failures and coordination failures climb. The cure becomes the cause.', act: m => m.set({ contracts: true, state: false, verifier: true, diverse: true, agents: 8 }) },
    { t: 'A checklist', home: true, say: 'For every category, name the mitigation you deployed, and measure on real tasks.', act: m => m.set({ contracts: true, state: true, verifier: true, diverse: true, agents: 4 }) },
  ],
  check: [
    { q: 'Which MAST category was largest?', options: ['Specification problems', 'Verification gaps', 'Hardware faults'], answer: 0, why: 'About 42% of failures.', hint: 'Look at the blue runs.' },
    { q: 'Why doesn\'t adding agents fix failures?', options: ['It adds coordination surface and failures', 'Agents are too slow', 'It always does'], answer: 0, why: 'Fix the cause in its category.', hint: 'Try Fix failures by adding agents.' },
    { q: 'Reviewers all on one model agree on a mistake. What is this?', options: ['Groupthink from a monoculture', 'A specification problem', 'A lost message'], answer: 0, why: 'Shared models share errors.', hint: 'Try Check with reviewers on one model.' },
  ],
  terms: [
    ['MAST', 'A taxonomy of multi-agent failures from 1,642 traces.'],
    ['Specification problem', 'Roles or success criteria not defined tightly enough.'],
    ['Coordination failure', 'Lost messages, unsynchronised state, agents out of step.'],
    ['Verification gap', 'An output nobody independently checked.'],
    ['Groupthink', 'Agents reinforcing each other\'s errors.'],
    ['Cascading error', 'One bad output corrupting everything after it.'],
  ],
  deeper: '<p><b>Design input, not post-mortem.</b> Before shipping, point to each category and name the mitigation; after shipping, sort real failures into them.</p><p><b>Cascades.</b> Memory poisoning and unverified handoffs turn one error into many; provenance and verifiers stop the chain, as in the shared-memory lesson.</p><p><b>About this machine.</b> Category shares follow the MAST study\'s proportions; the effect of each mitigation and of extra agents is illustrative, computed live.</p>',
  code: {
    title: 'Sort failures, then fix by category',
    note: 'Adapted from the course\'s failure-taxonomy sketch (code/main.py).',
    text: `
MITIGATION = {
    "specification": ["role contract per agent", "acceptance test before dispatch"],
    "coordination":  ["versioned shared state", "ack-and-retry for critical messages"],
    "verification":  ["independent, preferably deterministic, verifier",
                      "reviewers on different base models"],
}

def classify(trace):
    if trace.role_conflict or not trace.acceptance_test: return "specification"
    if trace.lost_update or trace.unacked_message or trace.state_drift: return "coordination"
    if not trace.independent_check: return "verification"
    return "other"

def report(traces):
    return Counter(classify(t) for t in traces if t.failed)
`,
  },
};
