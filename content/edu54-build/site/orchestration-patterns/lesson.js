// Orchestration patterns on a county citizen-service desk in Kenya: each request needs three specialists in turn (say permits, land, payments).
// Supervisor: every step goes supervisor → specialist → supervisor (2 hops), and the supervisor's prompt holds a 300-token description of every
// specialist. Swarm: specialists hand off directly (1 hop), with no central control; without a hop counter some requests bounce. Hierarchical: a top
// supervisor routes to team leads (one per 6 specialists), who route to specialists (3 hops), and no prompt holds more than one team's descriptions.
// Routing accuracy falls once a router's descriptions exceed a 4,000-token budget for them. Hop time 0.8 s. All computed live.
const DESC = 300, BUDGET = 4000, HOP = 0.8, STEPS = 3, TEAM = 6;
function route(n) { const load = n * DESC; return load <= BUDGET ? 0.97 : Math.max(0.5, 0.97 - 0.06 * (load - BUDGET) / DESC); }
function topo(kind, o) {
  const n = o.n;
  if (kind === 'supervisor') { const acc = route(n); return { hops: 2 * STEPS + 1, acc: Math.pow(acc, STEPS), ctx: n * DESC, bounce: 0 }; }
  if (kind === 'swarm') { const acc = route(Math.min(n, 4)); const bounce = o.hopLimit ? 0 : 0.18; return { hops: STEPS + 1 + (o.hopLimit ? 0 : 3), acc: Math.pow(acc, STEPS) * (1 - bounce), ctx: Math.min(n, 4) * DESC, bounce }; }
  const teams = Math.ceil(n / TEAM), acc = route(teams) * route(Math.min(n, TEAM));
  return { hops: 3 * STEPS + 1, acc: Math.pow(acc, STEPS), ctx: Math.max(teams, Math.min(n, TEAM)) * DESC, bounce: 0, teams };
}
const KINDS = ['supervisor', 'swarm', 'hierarchical'];

export default {
  slug: 'orchestration-patterns',
  title: 'Orchestration: supervisor, swarm or hierarchy',
  description: 'A Kenyan county\'s service desk routes requests between specialist agents. Compare a supervisor, a swarm and a hierarchy as the desk grows.',
  overview: 'When one agent with workflow patterns is not enough, multi-agent systems take one of a few shapes. Supervisor-worker: a central router decides each step, a specialist does it, and control returns to the router; specialists never talk to each other. It is easy to reason about, but every step costs two hops, and the router\'s prompt must describe every specialist; past a few, those descriptions crowd its context and routing gets worse. Doing the routing with direct tool calls gives fine control over what each specialist sees. Swarm, or peer-to-peer: specialists hand off to each other through a shared tool surface, one hop per step, faster but with no single point of control, so hand-offs can bounce back and forth without a hop counter. Hierarchical: supervisors of sub-supervisors, as nested graphs or crews; each router sees only its own team, so it scales to many specialists at the cost of more hops and more operations. Debate is a fourth shape, used for verification. Choose in this order: a single agent with workflows; a supervisor for two to four specialists; a swarm when latency matters more than clarity; a hierarchy only when one supervisor\'s context can\'t hold all the specialists. Don\'t pick a topology before you know what problem it solves, and don\'t build three layers for two teams.',
  keywords: ['multi-agent orchestration', 'supervisor', 'swarm', 'hierarchical agents', 'AI agents', 'routing', 'architecture'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.95, 1.25], half: 1.3, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { k: 0, n: 4, hopLimit: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const GX = -1.3;
    const geo = new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16); geo.translate(0, 0.08, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 30); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const sup = P.cyl(0.22, 0.3, '#2C2D31'); sup.position.set(GX, 0.12, -0.85); S.add(sup);
    const leads = Array.from({ length: 4 }, () => { const b = P.cyl(0.14, 0.22, '#7B6FA8'); b.userData.noFit = true; S.add(b); return b; });
    const rods = Array.from({ length: 40 }, () => { const r = P.rod(V(0, 0, 0), V(0, 0, 1), 0.006, '#B9B3A5'); r.visible = false; r.userData.noFit = true; S.add(r); return r; });
    /* comparison */
    /* every shape side by side: for supervisor, swarm and hierarchy, a grey tower as tall as the seconds a request takes and a green one as tall as the share routed right (red under 80%); a gold plate under the one in use */
    const RX = 1.4, KX = i => RX + i * 0.62, KZ = -0.35;
    const cards = KINDS.map((k, i) => { const plate = P.box(0.56, 0.03, 0.5, SAF, { r: 0.02 }); plate.position.set(KX(i), 0, KZ); S.add(plate); const t = P.tower(0.2, 0.3, '#8E91A3', { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(KX(i) - 0.12, 0.03, KZ); S.add(t); const a = P.tower(0.2, 0.3, GOOD, { h: 0.3 }); a.userData.set({ cap: '' }); a.position.set(KX(i) + 0.12, 0.03, KZ); S.add(a); return { plate, t, a }; });
    /* the largest router prompt: a tank as full as its descriptions, against a budget of 4,000 tokens; past the rim it spills */
    const tank = P.tank(0.6, 0.8, 0.5, '#5B8DB8'); tank.position.set(KX(1), 0, 0.65); S.add(tank);
    S.add(P.keep(-3.0, 3.0, 1.1, -1.15, 1.1));

    let R = null;
    function draw() {
      R = Object.fromEntries(KINDS.map(k => [k, topo(k, st)]));
      const kind = KINDS[st.k], n = st.n;
      // place specialists
      const pos = [];
      if (kind === 'hierarchical') { const tm = Math.ceil(n / TEAM); for (let i = 0; i < n; i++) { const t = Math.floor(i / TEAM), k = i % TEAM, cx = GX - 1.5 + (t + 0.5) * 3.0 / tm; pos.push([cx + ((k % 3) - 1) * 0.22, 0.35 + Math.floor(k / 3) * 0.32]); } }
      else for (let i = 0; i < n; i++) { const cols = Math.min(n, 8), row = Math.floor(i / 8); pos.push([GX - 1.5 + ((i % 8) + 0.5) * (3.0 / cols), 0.6 + row * 0.35 - (n > 8 ? 0.35 : 0)]); }
      pos.forEach(([x, z], i) => { dummy.position.set(x, 0.13, z); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col.set('#5B8DB8')); });
      for (let i = n; i < 30; i++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      sup.visible = kind !== 'swarm';
      const teams = Math.ceil(n / TEAM);
      leads.forEach((l, i) => { l.visible = kind === 'hierarchical' && i < teams; l.position.set(GX - 1.5 + (i + 0.5) * 3.0 / teams, 0.12, -0.2); });
      let r = 0; const link = (a, b) => { if (r < rods.length) { P.setRod(rods[r], a, b); rods[r].visible = true; r++; } };
      if (kind === 'supervisor') pos.forEach(([x, z]) => link(V(GX, 0.3, -0.85), V(x, 0.25, z)));
      else if (kind === 'hierarchical') { for (let t = 0; t < teams; t++) { const lx = GX - 1.5 + (t + 0.5) * 3.0 / teams; link(V(GX, 0.3, -0.85), V(lx, 0.3, -0.2)); pos.slice(t * TEAM, (t + 1) * TEAM).forEach(([x, z]) => link(V(lx, 0.3, -0.2), V(x, 0.25, z))); } }
      else { for (let i = 0; i < n; i++) for (let j = i + 1; j < Math.min(n, i + 3); j++) link(V(pos[i][0], 0.25, pos[i][1]), V(pos[j][0], 0.25, pos[j][1])); }
      for (; r < rods.length; r++) rods[r].visible = false;
      const T = R[kind];
      KINDS.forEach((k, i) => { const X = R[k], c = cards[i]; c.plate.visible = k === kind; c.t.userData.set({ h: X.hops * HOP * 0.12 }); c.a.userData.set({ h: X.acc * 1.0, color: X.acc < 0.8 ? RED : GOOD }); });
      tank.userData.set({ level: T.ctx / BUDGET, color: T.ctx > BUDGET ? RED : '#5B8DB8' });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Topology', options: ['Supervisor', 'Swarm', 'Hierarchy'], get: () => st.k, act: i => set({ k: i }) },
      { type: 'slider', label: 'Specialists', min: 2, max: 24, step: 1, get: () => st.n, set: v => set({ n: Math.round(v) }), fmt: v => String(Math.round(v)) },
      { type: 'toggle', label: 'Hop counter on hand-offs', short: 'Hop limit', get: () => st.hopLimit, set: v => set({ hopLimit: !!v }) },
    ];
    const cur = () => R[KINDS[st.k]];
    const readouts = [
      { label: 'Time per request', get: () => ({ v: `${(cur().hops * HOP).toFixed(1)} s`, sub: `${cur().hops} hops` }) },
      { label: 'Routed right', get: () => ({ v: `${Math.round(cur().acc * 100)}%`, sub: 'all three steps', good: cur().acc > 0.8, bad: cur().acc < 0.8 }) },
      { label: 'Router prompt', get: () => ({ v: `${cur().ctx.toLocaleString('en')}`, sub: 'tokens of descriptions', bad: cur().ctx > BUDGET }) },
    ];
    const labels = [
      { name: 'graph', t: 'Who talks to whom', d: 'Dark: the supervisor. Purple: team leads. Blue: specialists. Rods: who routes to whom', icon: 'link', atV: V(GX - 1.75, 0.2, -0.3) },
      { name: 'cmp', t: 'Every shape', d: 'Supervisor, swarm, hierarchy: grey is the time per request, green the share routed right at every step', icon: 'scale', atV: V(KX(2) + 0.35, 0.3, KZ) },
      { name: 'tank', t: 'Router prompt', d: 'Filled with the specialists\' descriptions; the rim is the 4,000-token budget', icon: 'box', atV: V(KX(2) + 0.35, 0.3, 0.65) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One supervisor, twenty specialists', hint: 'descriptions overflow', on: () => set({ ...D0, k: 0, n: 20 }), off: reset },
      { label: 'A swarm with no hop counter', hint: 'hand-offs bounce', on: () => set({ ...D0, k: 1, hopLimit: false }), off: reset },
      { label: 'A hierarchy for two specialists', hint: 'fake hierarchy', on: () => set({ ...D0, k: 2, n: 2 }), off: reset },
    ];
    function status() {
      const T = cur(), kind = KINDS[st.k];
      if (kind === 'supervisor' && T.ctx > BUDGET) return { ok: false, msg: `<b>With ${st.n} specialists, the supervisor's prompt carries ${T.ctx.toLocaleString('en')} tokens of descriptions, past its ${BUDGET.toLocaleString('en')} budget, and only ${Math.round(T.acc * 100)}% of requests are routed right at every step.</b> A hierarchy keeps each router to one team: ${Math.round(R.hierarchical.acc * 100)}% right, for ${R.hierarchical.hops - T.hops} more hops.` };
      if (kind === 'swarm' && !st.hopLimit) return { ok: false, msg: `<b>Without a hop counter, ${Math.round(T.bounce * 100)}% of requests bounce between specialists ("land needs payments first", "payments needs the land reference first"), and the swarm loses its speed: ${T.hops} hops.</b> Count hand-offs and escalate past a limit.` };
      if (kind === 'hierarchical' && st.n <= 4) return { ok: false, msg: `<b>A hierarchy for ${st.n} specialists adds a layer of team leads and ${R.hierarchical.hops - R.supervisor.hops} extra hops (${(R.hierarchical.hops * HOP).toFixed(1)} s against ${(R.supervisor.hops * HOP).toFixed(1)} s) for no gain in routing.</b> Layers are for when one router can't hold all the specialists. Collapse it to a supervisor.` };
      return { ok: true, msg: `<b>${kind} with ${st.n} specialists: ${T.hops} hops (${(T.hops * HOP).toFixed(1)} s), ${Math.round(T.acc * 100)}% routed right.</b> ${kind === 'supervisor' ? 'Easy to reason about: every step goes through one router, and its prompt still fits.' : kind === 'swarm' ? 'Fastest: specialists hand off directly, with a hop counter as the safety net.' : `Each router sees at most one team (${TEAM} specialists), so routing stays sharp as the desk grows.`}` };
    }
    return { update: dt => { cards.forEach(c => { c.t.userData.tick(dt); c.a.userData.tick(dt); }); tank.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A desk of specialists', home: true, say: 'A county\'s citizen-service desk in Kenya runs specialist agents for permits, land, water, health and payments. Each request needs three of them in turn.', act: m => m.set({ k: 0, n: 4, hopLimit: true }) },
    { t: 'A supervisor', home: true, say: 'A supervisor routes each step to a specialist and gets control back. Clear, but every step costs two hops.', act: m => m.set({ k: 0 }) },
    { t: 'A swarm', home: true, say: 'In a swarm, specialists hand off directly. One hop per step, but no one is in charge, so count the hand-offs.', act: m => m.set({ k: 1 }) },
    { t: 'Many specialists', home: true, say: 'Grow the desk to twenty specialists, and the supervisor\'s prompt fills with their descriptions. Routing gets worse.', act: m => m.set({ k: 0, n: 20 }) },
    { t: 'A hierarchy', home: true, say: 'Team leads each route within their own team, and the top supervisor routes between teams. Every prompt stays small.', act: m => m.set({ k: 2, n: 20 }) },
    { t: 'Not too many layers', home: true, say: 'For a small desk, a hierarchy only adds hops. Start simple; add layers when one router can no longer hold everyone.', act: m => m.set({ n: 3 }) },
  ],
  check: [
    { q: 'When is a hierarchy worth it?', options: ['When one supervisor\'s context can\'t hold all the specialists', 'Always', 'For two specialists'], answer: 0, why: 'Each router sees only its team.', hint: 'Try One supervisor, twenty specialists.' },
    { q: 'What does a swarm trade for speed?', options: ['A single point of control', 'Accuracy of tools', 'Nothing'], answer: 0, why: 'Hand-offs can bounce without a hop counter.', hint: 'Try A swarm with no hop counter.' },
    { q: 'Where should you start?', options: ['A single agent with workflow patterns', 'A three-level hierarchy', 'A swarm'], answer: 0, why: 'Add topology when a problem demands it.', hint: 'Try A hierarchy for two specialists.' },
  ],
  terms: [
    ['Supervisor-worker', 'A central router dispatches each step to a specialist.'],
    ['Swarm', 'Specialists hand off directly, with no central router.'],
    ['Hierarchical', 'Supervisors of sub-supervisors, each with its own team.'],
    ['Hop', 'One pass of control from one agent to another.'],
    ['Router context', 'The descriptions of specialists a router must read.'],
    ['Hop counter', 'A limit on hand-offs before escalating.'],
  ],
  deeper: '<p><b>Crews and flows.</b> Autonomous crews choose their path at run time; deterministic flows are event graphs you own, usually the better start for production.</p><p><b>Supervision by tool calls.</b> Writing the supervisor as an agent whose tools are the specialists gives exact control over what each one sees.</p><p><b>About this machine.</b> Each specialist description is 300 tokens; routing is 97% right per step until a router\'s descriptions exceed 4,000 tokens, then falls 6 points per extra specialist; hops are 0.8 s. All computed live.</p>',
  code: {
    title: 'Supervision as tool calls',
    note: 'Adapted from the course\'s orchestration lesson.',
    text: `
def make_supervisor(specialists, model):
    tools = [{"name": f"ask_{s.name}", "description": s.description} for s in specialists]
    def run(request, max_steps=6):
        state = request
        for _ in range(max_steps):
            call = model.choose(state, tools)          # route, or finish
            if call is None:
                return state
            spec = next(s for s in specialists if f"ask_{s.name}" == call.name)
            state = spec.run(call.args)                # sees only what we pass
        return escalate(state)
    return run

# Too many specialists for one prompt? Make each team lead a supervisor
# and give the top supervisor one tool per team.
`,
  },
};
