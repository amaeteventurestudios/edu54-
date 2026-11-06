// Evaluating agent teams (phase 16, lessons 24 and 25): a Cape Town analytics firm wants to know whether its multi-agent system beats one agent.
// Four task families (broad research, stepwise coding, quick facts, a coordination task with hidden information) are scored for one agent, one
// agent given the same token budget as the team, the team in a star, chain or graph topology, and a random baseline. Held-out tasks versus a
// public benchmark, and which baseline the claim compares against, are toggled; scores, the claim and its cost are computed live.
const TASKS = ['research', 'coding', 'facts', 'hidden info'];
const SYS = {
  one: [0.45, 0.6, 0.8, 0.3],
  budget: [0.72, 0.66, 0.82, 0.31],
  star: [0.78, 0.6, 0.83, 0.32],
  chain: [0.7, 0.72, 0.8, 0.31],
  graph: [0.86, 0.63, 0.8, 0.32],
  random: [0.1, 0.05, 0.25, 0.3],
};
const TOK = { one: 1, budget: 15, star: 15, chain: 15, graph: 15, random: 0 };
function evaluate(o) {
  const leak = o.heldout ? 0 : 0.1, adj = a => a.map(x => Math.min(0.99, x + leak));
  const team = adj(SYS[o.topo]), base = adj(SYS[o.fair ? 'budget' : 'one']), one = adj(SYS.one), rnd = SYS.random;
  const avg = a => a.reduce((s, x) => s + x, 0) / a.length;
  const gain = (avg(team) - avg(base)) / avg(base);
  const best = TASKS.map((_, k) => ['star', 'chain', 'graph'].sort((a, b) => SYS[b][k] - SYS[a][k])[0]);
  return { team, base, one, rnd, gain, avgTeam: avg(team), avgBase: avg(base), best, leak };
}

export default {
  slug: 'evaluating-agent-teams',
  title: 'Is the team better? Evaluating multi-agent systems',
  description: 'A firm in Cape Town asks whether its agent team beats one agent. Score four kinds of task, pick a shape, and choose what the claim is compared against.',
  overview: '"Our multi-agent system is better" invites three questions: better than what, on what, measured how? Shared benchmarks now make comparisons possible. MultiAgentBench (MARBLE) compares star, chain, tree and graph topologies with milestone scores: graph suited research, where any agent can critique any other; chain suited step-by-step coding; star suited quick factual consolidation; and a coordination tax appeared beyond about four agents. COMMA tests coordination with asymmetric, multimodal information, and found frontier models struggling to beat a random baseline. MedAgentBoard found multi-agent setups did not dominate a single model on most medical tasks; decomposition helped only where subtasks separate cleanly. AgentArch isolates what each layer (tools, memory, orchestration) adds in enterprise settings. The case studies point the same way. Anthropic\'s research system, a lead agent planning and synthesising while subagents search in parallel, beat a single agent by about 90% on internal research evaluations, but used about fifteen times the tokens, and token usage alone explained around 80% of the variance on a browsing benchmark: much of the gain is fresh context windows and more search. So compare against a single agent given the same budget, not a cheaper one. Use held-out tasks, because public benchmarks leak into training data. Report a random baseline so a near-chance result is visible. Choose the topology to fit the task. And structure beats size: MetaGPT and ChatDev show a tight set of roles with written hand-off contracts outperforming a large unstructured group.',
  keywords: ['multi-agent evaluation', 'benchmarks', 'baselines', 'MultiAgentBench', 'topology', 'AI agents', 'research systems'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.3, -0.1], dir: [0.05, 1.05, 1.12], half: 1.15, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { topo: 'graph', fair: true, heldout: true, random: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', OFF = '#C9C4B6', THREAD = '#8E91A3';
    const SC = { team: GOOD, base: '#5B8DB8', one: '#A9A59A', rnd: '#3B3F52' };
    /* four kinds of task: four bars each (team, baseline, one agent, chance); coral on top is what leakage added; a lamp lights when the shape fits the task */
    const GX = k => -2.3 + k * 1.05, HS = 1.0;
    const groups = TASKS.map((n, k) => {
      const bars = ['team', 'base', 'one', 'rnd'].map((s, j) => {
        const b = P.box(0.2, 1, 0.3, SC[s], { r: 0.02 }); b.position.set(GX(k) - 0.33 + j * 0.22, 0, -0.55); b.userData.noFit = true; S.add(b);
        const x = P.box(0.2, 1, 0.3, BAD, { r: 0.02 }); x.position.set(GX(k) - 0.33 + j * 0.22, 0, -0.55); x.userData.noFit = true; S.add(x);
        return { s, b, x };
      });
      const l = P.lamp(OFF, { h: 0.2, r: 0.09 }); l.position.set(GX(k), 0, 0.1); S.add(l);
      return { bars, l };
    });
    /* the team's shape: four agents joined as a star, a chain or a full graph */
    const NP = [[1.5, 0.15], [2.5, 0.15], [1.5, 0.8], [2.5, 0.8]].map(([x, z]) => V(x, 0.14, z));
    NP.forEach(p => { const r = P.robot(GOOD, { scale: 0.3 }); r.position.set(p.x, 0, p.z); S.add(r); });
    const EDGE = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]], SHAPE = { star: [0, 1, 2], chain: [0, 4, 5], graph: [0, 1, 2, 3, 4, 5] };
    const rods = EDGE.map(([a, b]) => { const r = P.rod(NP[a], NP[b], 0.02, THREAD); S.add(r); return r; });
    /* tokens spent by each side, and three lamps for an honest claim: equal budget, held-out tasks, a random baseline */
    const tTeam = P.tower(0.36, 0.36, GOOD, { h: 0.9 }); tTeam.userData.set({ cap: '' }); tTeam.position.set(1.5, 0, -0.55); S.add(tTeam);
    const tBase = P.tower(0.36, 0.36, SC.base, { h: 0.9 }); tBase.userData.set({ cap: '' }); tBase.position.set(1.95, 0, -0.55); S.add(tBase);
    const lamps = [0, 1, 2].map(i => { const l = P.lamp(GOOD, { h: 0.3, r: 0.09 }); l.position.set(2.45 + i * 0.3, 0, -0.55); S.add(l); return l; });
    S.add(P.keep(-2.8, 3.2, 1.15, -0.8, 1.05));

    let R = null;
    function draw() {
      R = evaluate(st);
      groups.forEach((G, k) => {
        const vals = { team: R.team[k], base: R.base[k], one: R.one[k], rnd: R.rnd[k] };
        G.bars.forEach(B => {
          const on = B.s !== 'rnd' || st.random, v = vals[B.s], leak = B.s === 'rnd' ? 0 : R.leak;
          B.b.visible = on; B.b.scale.y = Math.max(0.01, (v - leak) * HS);
          B.x.visible = on && leak > 0; B.x.position.y = Math.max(0.01, (v - leak) * HS); B.x.scale.y = Math.max(0.01, leak * HS);
        });
        G.l.userData.set({ color: R.best[k] === st.topo ? GOOD : OFF, on: R.best[k] === st.topo });
      });
      rods.forEach((r, i) => { r.visible = SHAPE[st.topo].includes(i); });
      tBase.userData.set({ h: st.fair ? 0.9 : 0.06 });
      [st.fair, st.heldout, st.random].forEach((ok, i) => lamps[i].userData.set({ color: ok ? GOOD : BAD, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const TP = ['star', 'chain', 'graph'];
    const controls = [
      { type: 'toggle', label: 'Compare with one agent given the same token budget', short: 'Equal budget', get: () => st.fair, set: v => set({ fair: !!v }) },
      { type: 'toggle', label: 'Held-out tasks, not a public benchmark', short: 'Held-out', get: () => st.heldout, set: v => set({ heldout: !!v }) },
      { type: 'toggle', label: 'Show a random baseline', short: 'Random baseline', get: () => st.random, set: v => set({ random: !!v }) },
      { type: 'buttons', label: 'Team topology', options: ['Star', 'Chain', 'Graph'], get: () => TP.indexOf(st.topo), act: i => set({ topo: TP[i] }) },
    ];
    const readouts = [
      { label: 'Claimed gain', get: () => ({ v: `${Math.round(R.gain * 100)}%`, sub: st.fair ? 'at equal tokens' : 'against 1× tokens', good: st.fair, bad: !st.fair }) },
      { label: 'Tokens', get: () => ({ v: '15×', sub: 'the team, per task' }) },
      { label: 'Hidden-info task', get: () => ({ v: R.team[3].toFixed(2), sub: `random: ${R.rnd[3].toFixed(2)}`, bad: R.team[3] - R.rnd[3] < 0.05 }) },
    ];
    const labels = [
      { name: 'bars', t: 'Four kinds of task', d: 'Team, baseline, one agent, chance', icon: 'target', atV: V(-2.72, 0.35, -0.55) },
      { name: 'claim', t: 'An honest claim', d: 'Equal tokens, held out, chance shown', icon: 'scale', atV: V(3.1, 0.4, -0.55) },
      { name: 'shape', t: 'The team\'s shape', d: 'Star, chain or graph', icon: 'share', atV: V(2.62, 0.12, 0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Compare against a cheap baseline', hint: 'one agent at 1×', on: () => set({ ...D0, fair: false }), off: reset },
      { label: 'Test on a public benchmark', hint: 'leakage', on: () => set({ ...D0, heldout: false, fair: false }), off: reset },
      { label: 'Skip the random baseline', hint: 'near-chance hidden', on: () => set({ ...D0, random: false }), off: reset },
    ];
    function status() {
      const g = Math.round(R.gain * 100);
      if (!st.heldout) return { ok: false, msg: `<b>On a public benchmark the models may have seen in training, every system scores about ten points higher, and the team "beats one agent by ${g}%".</b> Leakage inflates both sides and the headline. Use held-out tasks written after the models\' training.` };
      if (!st.fair) return { ok: false, msg: `<b>Against one agent at a fifteenth of the tokens, the team looks ${g}% better. Give the single agent the same budget, for more searching and more samples, and the gap is ${Math.round(evaluate({ ...st, fair: true }).gain * 100)}%.</b> Much of a team\'s gain is fresh context and more tokens; compare at equal budget.` };
      if (!st.random) return { ok: false, msg: `<b>Without a random baseline the hidden-information task looks like a modest score (${R.team[3].toFixed(2)}); against random (${R.rnd[3].toFixed(2)}) it is barely above chance.</b> Report chance next to every result, so a null result can\'t pass as progress.` };
      return { ok: true, msg: `<b>At equal tokens on held-out tasks, the ${st.topo} team beats one agent by ${g}% on average${st.topo === 'graph' ? ', mostly on broad research' : st.topo === 'chain' ? ', mostly on stepwise coding' : ', mostly on quick facts'}, and is barely above chance on the hidden-information task.</b> Fit the topology to the task, and price the fifteen-fold tokens into the decision.` };
    }
    return { update: dt => { tBase.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Is the team better?', home: true, say: 'An analytics firm in Cape Town compares its agent team with a single agent on four kinds of task.', act: m => m.set({ topo: 'graph', fair: false, heldout: true, random: true }) },
    { t: 'Better than what?', home: true, say: 'The team uses fifteen times the tokens. Give one agent the same budget, and the gap shrinks.', act: m => m.set({ topo: 'graph', fair: true, heldout: true, random: true }) },
    { t: 'Shape fits task', home: true, say: 'A graph of critics suits broad research. A chain suits step-by-step coding. A star suits quick facts.', act: m => m.set({ topo: 'chain', fair: true, heldout: true, random: true }) },
    { t: 'Measured how?', home: true, say: 'Public benchmarks leak into training data and inflate every score. Use held-out tasks.', act: m => m.set({ topo: 'graph', fair: true, heldout: false, random: true }) },
    { t: 'Against chance', home: true, say: 'On the hidden-information task every system sits near the random baseline. Without it, nobody would notice.', act: m => m.set({ topo: 'graph', fair: true, heldout: true, random: false }) },
    { t: 'An honest comparison', home: true, say: 'Equal budgets, held-out tasks, a random baseline, and a topology that fits. Then price in the tokens.', act: m => m.set({ topo: 'graph', fair: true, heldout: true, random: true }) },
  ],
  check: [
    { q: 'What is the fair baseline for a team that uses fifteen times the tokens?', options: ['One agent given the same token budget', 'One agent at its usual budget', 'A random baseline only'], answer: 0, why: 'Much of the gain is more tokens.', hint: 'Try Compare against a cheap baseline.' },
    { q: 'Why use held-out tasks?', options: ['Public benchmarks can leak into training', 'They are easier', 'They are cheaper'], answer: 0, why: 'Leakage inflates scores.', hint: 'Try Test on a public benchmark.' },
    { q: 'Which topology suits broad research?', options: ['Graph: any agent can critique any other', 'Chain', 'Star'], answer: 0, why: 'MultiAgentBench found graph best for research.', hint: 'Switch the topology.' },
  ],
  terms: [
    ['Equal-budget baseline', 'A single agent given the same tokens as the team.'],
    ['Random baseline', 'The score of chance, reported alongside results.'],
    ['Held-out set', 'Tasks not seen in training, written for the evaluation.'],
    ['Topology', 'How agents connect: star, chain, tree or graph.'],
    ['Coordination tax', 'The overhead that grows with more agents.'],
    ['Milestone score', 'Credit for partial progress, not only final success.'],
  ],
  deeper: '<p><b>Scale effort to the query.</b> The research-system lessons: simple questions need one agent and a few tool calls, complex ones many subagents; search broad first, then narrow; keep old versions running until in-flight agents finish; and verify.</p><p><b>Structure over size.</b> Graph-structured systems have scaled to very large numbers of agents because routing is explicit, not because more agents are better.</p><p><b>About this machine.</b> Scores are illustrative, shaped by the published findings (topology fits, near-chance hidden-information results, a fifteen-fold token cost); the comparisons are computed live.</p>',
  code: {
    title: 'An honest comparison',
    note: 'Written for this lesson.',
    text: `
def compare(team, single, tasks, budget):
    held_out = [t for t in tasks if t.written_after_training_cutoff]
    team_scores   = [score(team.run(t, tokens=budget)) for t in held_out]
    single_scores = [score(single.run(t, tokens=budget)) for t in held_out]  # same budget
    chance        = [t.random_baseline for t in held_out]
    return {
        "team": mean(team_scores), "single_equal_budget": mean(single_scores),
        "chance": mean(chance), "tokens_per_task": budget,
        "by_family": by_family(held_out, team_scores, single_scores, chance),
    }
`,
  },
};
