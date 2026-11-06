// Swarm optimisation for agent routing (phase 16, lesson 19): an Accra fintech routes four kinds of task to four agents. As in ant-colony
// optimisation, each success lays pheromone on the (task, agent) route, routes are chosen in proportion to pheromone, a little exploration tries
// others, and evaporation lets old trails fade. At round 30 the small agent gets a bad release and the multilingual agent an upgrade. Pheromone, routing and success are computed
// in expectation, round by round, live.
const TASKS = ['invoices', 'translation', 'code', 'summaries'];
const AGENTS = ['small, fast', 'general', 'code specialist', 'multilingual'];
const SUCC = [[0.9, 0.8, 0.5, 0.6], [0.4, 0.7, 0.3, 0.95], [0.3, 0.6, 0.95, 0.4], [0.7, 0.85, 0.5, 0.72]];
const ROUNDS = 60, DROP = 30, ALPHA = 1;
function simulate(o) {
  let tau = TASKS.map(() => AGENTS.map(() => 1));
  const hist = [];
  for (let t = 0; t < ROUNDS; t++) {
    const succ = SUCC.map((r, k) => r.map((p, a) => (o.drop && t >= DROP ? (a === 0 ? 0.3 : k === 0 && a === 3 ? 0.97 : p) : p)));
    let tot = 0;
    const route = tau.map((row, k) => {
      if (o.random) return row.map(() => 0.25);
      let w = row.map(x => Math.pow(x, ALPHA)), s = w.reduce((a, b) => a + b, 0);
      if (!o.eps) { w = w.map(x => (x / s < 0.03 ? 0 : x)); s = w.reduce((a, b) => a + b, 0); }   // sampled, a near-zero route is never tried
      return w.map(x => (1 - o.eps) * x / s + o.eps / 4);
    });
    route.forEach((r, k) => { tot += r.reduce((a, p, j) => a + p * succ[k][j], 0); });
    tau = tau.map((row, k) => row.map((x, a) => Math.max(0.001, (1 - o.rho) * x + route[k][a] * succ[k][a] * 1.0)));
    hist.push({ score: tot / 4, route, tau });
  }
  return hist;
}

export default {
  slug: 'swarm-routing-aco',
  title: 'Swarm routing: pheromone trails between tasks and agents',
  description: 'A fintech in Accra routes four kinds of task to four agents. Like ants, the router strengthens trails that succeed and lets old ones fade. Halfway, one agent gets worse and one better.',
  overview: 'Bio-inspired, population-based optimisation is gradient-free and cheap per evaluation, which suits problems where you can score a candidate but not differentiate through it: prompts, programs, routes. Particle swarm optimisation (Kennedy and Eberhart, 1995) moves a population of candidates through a search space; each particle\'s velocity blends its own momentum, a pull towards its personal best and a pull towards the swarm\'s best. Recent work applies it to model outputs, where each particle is a candidate expression or program and the "velocity" is a prompt describing how to move towards the best; and to models themselves, moving a swarm of expert models\' parameters towards the collective best. Ant colony optimisation (Dorigo, 1992) solves path problems the way ants do: each ant that finds food lays pheromone on its path, later ants follow paths in proportion to pheromone, and pheromone evaporates. The same idea routes work in a multi-agent system: record which agent succeeded on which kind of task, send more of that kind there, keep a little exploration, and let old evidence decay. Evaporation and exploration are what make it adaptive. Without evaporation, a trail laid by an agent that was good last month stays strong after a bad release; without exploration, routes that died out are never retried, so the router can\'t notice that another agent is now better. Fully random routing ignores everything learned. These methods need cheap, automatic fitness: tests, task success, arithmetic; if every evaluation needs a person, the population makes them too expensive.',
  keywords: ['ant colony optimisation', 'particle swarm optimisation', 'routing', 'multi-agent systems', 'swarm intelligence', 'AI agents', 'optimisation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.15, 0.3, -0.15], dir: [0.05, 1.1, 1.05], half: 1.25, wide: 5.5 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { rho: 0.3, eps: 0.03, drop: true, random: false, t: 59 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const GX = a => -1.75 + a * 0.62, GZ = k => -0.6 + k * 0.5;
    const pillars = TASKS.map((_, k) => AGENTS.map((_, a) => { const m = new THREE.MeshLambertMaterial({ color: SAF }), b = P.box(0.36, 1, 0.3, SAF, { r: 0.03, material: m }); b.position.set(GX(a), 0, GZ(k)); b.userData.noFit = true; S.add(b); return { m, b }; }));
    const CX = t => 0.95 + t * 0.03;
    const sbars = Array.from({ length: ROUNDS }, (_, t) => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.026, 1, 0.24, GOOD, { r: 0.004, material: m }); b.position.set(CX(t), 0, 0.15); b.userData.noFit = true; S.add(b); return { m, b }; });
    const rel = P.box(0.03, 1.0, 0.3, RED, { r: 0.006 }); rel.position.set(CX(DROP) - 0.015, 0, 0.15); S.add(rel);

    const TCOL = ['#5B8DB8', '#8C6BB1', '#3A3D4A', '#D8C8A0'];
    TASKS.forEach((_, k) => { const c = P.box(0.26, 0.22, 0.26, TCOL[k], { r: 0.03 }); c.position.set(-2.3, 0, GZ(k)); S.add(c); });
    const bots = AGENTS.map((_, a) => { const r = P.robot('#5F6375', { scale: 0.75 }); r.position.set(GX(a), 0, -1.15); S.add(r); return r; });
    S.add(P.keep(-2.5, 2.8, 0.8, -1.35, 1.05));
    let H = null;
    function draw() {
      H = simulate(st);
      const h = H[st.t], mx = Math.max(...h.tau.flat());
      h.tau.forEach((row, k) => row.map((x, a) => { const Pp = pillars[k][a]; Pp.b.scale.y = Math.max(0.01, (x / mx) * 0.75); Pp.m.color.set(a === 0 && st.drop && st.t >= DROP ? BAD : h.route[k][a] > 0.5 ? GOOD : SAF); }));
      H.forEach((x, t) => { const B = sbars[t]; B.b.visible = t <= st.t; B.b.scale.y = Math.max(0.01, x.score * 0.9); B.m.color.set(x.score >= 0.85 ? GOOD : x.score >= 0.7 ? SAF : BAD); });
      const ch = st.drop && st.t >= DROP; bots[0].userData.set({ lamp: ch ? RED : GOOD }); bots[3].userData.set({ lamp: ch ? SAF : GOOD });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Round', min: 0, max: ROUNDS - 1, step: 1, get: () => st.t, set: v => set({ t: Math.round(v) }), fmt: v => String(Math.round(v) + 1) },
      { type: 'slider', label: 'Evaporation per round', min: 0, max: 0.5, step: 0.05, get: () => st.rho, set: v => set({ rho: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'slider', label: 'Exploration', min: 0, max: 0.4, step: 0.02, get: () => st.eps, set: v => set({ eps: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'toggle', label: 'At round 30: a bad release for one agent, an upgrade for another', short: 'Round-30 change', get: () => st.drop, set: v => set({ drop: !!v }) },
    ];
    const readouts = [
      { label: 'This round', get: () => ({ v: `${Math.round(H[st.t].score * 100)}%`, sub: `round ${st.t + 1}`, good: H[st.t].score >= 0.85 }) },
      { label: 'By round 60', get: () => { const e = H[ROUNDS - 1].score; return { v: `${Math.round(e * 100)}%`, sub: 'expected success', good: e >= 0.85, bad: e < 0.75 }; } },
      { label: 'Upgrade found', get: () => { const x = H[ROUNDS - 1].route[0][3]; return { v: `${Math.round(x * 100)}%`, sub: 'of invoices to the upgraded agent', good: x > 0.4, bad: st.drop && x < 0.05 }; } },
    ];
    const labels = [
      { name: 'grid', t: 'Pheromone on each route', d: 'Rows: tasks. Columns: agents', icon: 'wave', atV: V(-2.45, 0.2, GZ(0)) },
      { name: 'chart', t: 'Success, round by round', d: 'Red: the bad release', icon: 'target', atV: V(CX(59) + 0.1, 0.2, 0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Never let trails evaporate', hint: 'no decay', on: () => set({ ...D0, rho: 0 }), off: reset },
      { label: 'Never explore', hint: 'no retries', on: () => set({ ...D0, eps: 0 }), off: reset },
      { label: 'Route at random', hint: 'ignore the trails', on: () => set({ ...D0, random: true }), off: reset },
    ];
    function status() {
      const end = H[ROUNDS - 1].score, pre = H[DROP - 1].score, inv = H[ROUNDS - 1].route[0];
      if (st.random) return { ok: false, msg: `<b>Routing at random ignores everything learned: about ${Math.round(end * 100)}% expected success, against ${Math.round(simulate({ ...st, random: false })[ROUNDS - 1].score * 100)}% with trails.</b> Random is a baseline, not a strategy.` };
      if (!st.drop) return { ok: end >= 0.85, msg: `<b>With nothing changing, the trails settle on the best agent for each task: ${Math.round(end * 100)}% by round 60.</b> The code specialist gets code, the multilingual agent translation.` };
      if (st.rho === 0) return { ok: false, msg: `<b>With no evaporation, the small agent\'s trails stay as strong as before its bad release, and invoices keep going to it: ${Math.round(pre * 100)}% before round 30, ${Math.round(end * 100)}% by round 60.</b> Old evidence must fade, or the router never notices a change.` };
      if (st.eps === 0) return { ok: false, msg: `<b>With no exploration, the multilingual agent\'s invoice route died out early and is never tried again: after its upgrade it gets ${Math.round(inv[3] * 100)}% of invoices, and they go to the general agent instead.</b> The router can\'t learn about a change on a route it never samples. Keep a little exploration.` };
      if (st.eps > 0.2) return { ok: false, msg: `<b>With ${Math.round(st.eps * 100)}% of work sent to random agents, the router never fully exploits what it knows: ${Math.round(end * 100)}% by round 60.</b> Exploration is a small tax for adaptability; too much of it is just random routing.` };
      return { ok: end >= 0.85, msg: `<b>Before round 30 the trails picked the best agent for each task (${Math.round(pre * 100)}%). After the change, the small agent\'s trails evaporated and exploration found the upgraded multilingual agent: it now takes ${Math.round(inv[3] * 100)}% of invoices, ${Math.round(end * 100)}% expected success by round 60.</b> Reinforce what works, forget slowly, keep exploring.` };
    }
    return { update: dt => bots.forEach(r => r.userData.tick(dt)), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Four tasks, four agents', home: true, say: 'A fintech in Accra routes four kinds of task to four agents. At first, every route looks the same.', act: m => m.set({ rho: 0.3, eps: 0.03, drop: true, random: false, t: 0 }) },
    { t: 'Trails form', home: true, say: 'Every success lays pheromone on its route. Strong trails attract more work. The best agent for each task emerges.', act: m => m.set({ rho: 0.3, eps: 0.03, drop: true, random: false, t: 29 }) },
    { t: 'A bad release', home: true, say: 'At round thirty the small agent gets a bad release, and the multilingual agent gets better at invoices.', act: m => m.set({ rho: 0.3, eps: 0.03, drop: true, random: false, t: 34 }) },
    { t: 'Evaporation', home: true, say: 'Old trails fade every round. Without evaporation, the router would keep trusting the old agent.', act: m => m.set({ rho: 0, eps: 0.08, drop: true, random: false, t: 59 }) },
    { t: 'Exploration', home: true, say: 'A little exploration retries routes that faded. Without it, the better agent is never rediscovered.', act: m => m.set({ rho: 0.3, eps: 0, drop: true, random: false, t: 59 }) },
    { t: 'Adaptive routing', home: true, say: 'Reinforce what works, forget slowly, keep exploring. By round sixty the router has recovered.', act: m => m.set({ rho: 0.3, eps: 0.03, drop: true, random: false, t: 59 }) },
  ],
  check: [
    { q: 'What does evaporation do?', options: ['Lets old evidence fade so the router notices change', 'Speeds up the agents', 'Adds randomness'], answer: 0, why: 'Without it, stale trails stay strong.', hint: 'Try Never let trails evaporate.' },
    { q: 'Why keep a little exploration?', options: ['So faded routes can be rediscovered', 'To waste work', 'It has no effect'], answer: 0, why: 'A new best can only be found by trying it.', hint: 'Try Never explore.' },
    { q: 'When do swarm methods fit?', options: ['When candidates can be scored cheaply and automatically', 'When every score needs a person', 'Only for robots'], answer: 0, why: 'Populations multiply evaluations.', hint: 'Read the overview.' },
  ],
  terms: [
    ['Ant colony optimisation', 'Paths reinforced by pheromone that evaporates.'],
    ['Pheromone', 'A score on a route, raised by success.'],
    ['Evaporation', 'The decay that lets old trails fade.'],
    ['Exploration', 'A share of choices made off the strongest trail.'],
    ['Particle swarm optimisation', 'Candidates move towards their own and the swarm\'s best.'],
    ['Gradient-free', 'Optimising by scoring candidates, without derivatives.'],
  ],
  deeper: '<p><b>PSO in one line.</b> v ← w·v + c₁·r₁·(personal best − x) + c₂·r₂·(swarm best − x); then x ← x + v. Inertia, a cognitive pull and a social pull.</p><p><b>On model outputs.</b> Applied to programs or expressions, each particle is a candidate and its "velocity" is a prompt describing how to move towards the best, which works when fitness is automatic.</p><p><b>About this machine.</b> Success rates and the release are illustrative; pheromone and routing are updated in expectation each round, computed live.</p>',
  code: {
    title: 'A pheromone router',
    note: 'Adapted from the course\'s ACO routing sketch (code/main.py).',
    text: `
class Router:
    def __init__(self, tasks, agents, rho=0.15, eps=0.08, alpha=2):
        self.tau = {(t, a): 1.0 for t in tasks for a in agents}
        self.agents, self.rho, self.eps, self.alpha = agents, rho, eps, alpha

    def pick(self, task):
        if random.random() < self.eps:
            return random.choice(self.agents)                    # explore
        w = [self.tau[(task, a)] ** self.alpha for a in self.agents]
        return random.choices(self.agents, weights=w)[0]

    def update(self, task, agent, success):
        for key in self.tau:
            self.tau[key] *= 1 - self.rho                         # evaporate
        if success:
            self.tau[(task, agent)] += 1.0                        # lay pheromone
`,
  },
};
