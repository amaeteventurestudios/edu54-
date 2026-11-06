// The harness loop contract (phase 19, lesson 20): a deterministic state machine with hooks and two pull points. A token walks states: start, model, tools, check, done. The walk below really steps through a scripted run for a Blantyre tea estate's agent.
// Budgets end the run with a clear reason. Hooks can observe or block. Without pull points the caller can't approve or cancel.
const SEQ = ['start', 'model', 'tools', 'model', 'tools', 'model', 'tools', 'model', 'done'];
function run(o) {
  const path = []; let turns = 0, end = 'done', paused = 0, blocked = 0;
  for (const s of SEQ) {
    if (s === 'tools' && o.hook && turns === 1 && !blocked) { blocked = 1; path.push('blocked'); continue; }
    if (s === 'tools' && o.pull) paused++;
    if (s === 'model') { turns++; if (turns > o.cap) { end = 'turn cap'; path.push('stop'); break; } }
    path.push(s);
  }
  if (o.stuck) { end = o.limit ? 'turn cap' : 'never'; turns = o.cap; }
  return { path, turns: Math.min(turns, o.cap), end, paused, blocked };
}

export default {
  slug: 'agent-harness-loop-contract',
  title: 'The harness contract: a loop with named states',
  description: 'An agent loop as a state machine. Named states, hooks to wire into, and two places where the caller gets control back.',
  overview: 'A while loop around a model works until you need to stop it, resume it, or prove what it did. A harness makes the loop a contract: a deterministic state machine with explicit transitions. Hooks at each lifecycle point let operators add policy and telemetry without touching the loop. Two pull points hand control back to the caller, so a person can approve or cancel, and the run resumes on fresh input. Budgets for turns, tokens and time end the run with a named reason, not a hang. This first harness lesson steps a run for a tea estate\'s agent in Blantyre through that contract.',
  keywords: ['agent harness', 'state machine', 'hooks', 'budgets', 'agent loop', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.05, 0.85, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { cap: 6, hook: false, pull: true, stuck: false, limit: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const POS = { start: [-2.0, 0], model: [-0.8, -0.35], tools: [0.5, 0.35], done: [1.9, 0], blocked: [0.5, -0.5], stop: [1.9, 0.5] };
    const N = {}; Object.entries(POS).forEach(([k, [x, z]]) => { const m = new S.THREE.MeshLambertMaterial({ color: k === 'done' ? GOOD : k === 'stop' || k === 'blocked' ? BAD : BLUE }), b = P.cyl(0.26, 0.16, '#fff', { material: m }); b.position.set(x, 0.03, z); S.add(b); N[k] = m; });
    [['start', 'model'], ['model', 'tools'], ['model', 'done'], ['tools', 'blocked'], ['model', 'stop']].forEach(([a, b]) => S.add(P.rod(V(POS[a][0], 0.12, POS[a][1]), V(POS[b][0], 0.12, POS[b][1]), 0.02, '#6B6E7E')));
    const hooks = Array.from({ length: 10 }, (_, i) => { const p = P.cyl(0.03, 0.14, SAF); p.position.set(-2.2 + i * 0.3, 0.03, 0.62); S.add(p); return p; });
    const hand = add(P.robot('#A87A4F', { scale: 0.5 })); hand.position.set(0.5, 0.03, -0.05 + 0.7);
    const tok = P.ball(0.1, SAF); tok.userData.noFit = true; S.add(tok);
    S.add(P.keep(-2.45, 2.45, 0.7, -0.75, 0.78));
    let R = null, u = 0;
    function draw() { R = run(st); hand.visible = st.pull; hand.userData.set({ busy: st.pull }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Turn cap', min: 1, max: 8, step: 1, get: () => st.cap, set: v => set({ cap: v }) },
      { type: 'toggle', label: 'A policy hook blocks one tool call', short: 'Hook blocks', get: () => st.hook, set: v => set({ hook: !!v }) },
      { type: 'toggle', label: 'Pause for the caller before tools', short: 'Pull point', get: () => st.pull, set: v => set({ pull: !!v }) },
      { type: 'toggle', label: 'The model keeps asking for tools', short: 'Stuck model', get: () => st.stuck, set: v => set({ stuck: !!v }) },
      { type: 'toggle', label: 'Budgets enforced by the loop', short: 'Budgets', get: () => st.limit, set: v => set({ limit: !!v }) },
    ];
    const readouts = [
      { label: 'Ended', get: () => ({ v: R.end, sub: `${R.turns} turns`, good: R.end === 'done', bad: R.end === 'never' }) },
      { label: 'Caller got control', get: () => ({ v: `${R.paused} times`, sub: 'pull points', good: R.paused > 0, bad: !R.paused }) },
      { label: 'Blocked by a hook', get: () => ({ v: `${R.blocked}`, sub: 'and the run went on' }) },
    ];
    const labels = [
      { name: 's', t: 'Named states', d: 'Only these transitions exist', icon: 'link', atV: V(-2.25, 0.15, 0) },
      { name: 'h', t: 'Ten hook points', d: 'Policy and telemetry plug in', icon: 'check', atV: V(0.5, 0.17, 0.62) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No budgets on a stuck model', hint: 'it never ends', on: () => set({ ...D0, stuck: true, limit: false }), off: reset },
      { label: 'No pull points', hint: 'nobody can step in', on: () => set({ ...D0, pull: false }), off: reset },
      { label: 'A turn cap of two', hint: 'stops mid-task', on: () => set({ ...D0, cap: 2 }), off: reset },
    ];
    function status() {
      if (R.end === 'never') return { ok: false, msg: '<b>It never ends.</b> A plain loop with a model asking for one more tool runs until your money does. A contract names every way a run can stop.' };
      if (!st.pull) return { ok: false, msg: '<b>The caller had no way in.</b> Without pull points, approval and cancel must be bolted on from outside. Two named yield points make them part of the loop.' };
      if (R.end === 'turn cap') return { ok: false, msg: `<b>Stopped at the turn cap of ${st.cap}, with a named reason.</b> That is a clean failure: state is saved, and the caller knows why. Raise the cap if the task needs it.` };
      return { ok: true, msg: `<b>Done in ${R.turns} turns, with ${R.paused} pauses for the caller.</b> ${R.blocked ? 'A hook blocked one call, the model saw the refusal, and it carried on.' : 'Every step was a named transition.'}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 1.2) % Math.max(1, R.path.length - 1);
        const i = Math.floor(u), a = POS[R.path[i]], b = POS[R.path[Math.min(R.path.length - 1, i + 1)]], f = u - i;
        tok.position.set(a[0] + (b[0] - a[0]) * f, 0.3, a[1] + (b[1] - a[1]) * f);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'More than a while loop', home: true, say: 'A tea estate in Blantyre runs an agent. A plain loop can\'t be stopped, resumed or explained. So we name its states.', act: m => m.set({ cap: 6, hook: false, pull: true, stuck: false, limit: true }) },
    { t: 'Transitions', home: true, say: 'Start, model, tools, back to the model, then done. Only these moves exist.', act: m => m.set({ cap: 6, hook: false, pull: false, stuck: false, limit: true }) },
    { t: 'Hooks', home: true, say: 'At each point a hook can log, or block. A blocked call becomes a message the model can read.', act: m => m.set({ cap: 6, hook: true, pull: true, stuck: false, limit: true }) },
    { t: 'Pull points', home: true, say: 'Before tools, the loop yields. The caller can approve or cancel, and it resumes on fresh input.', act: m => m.set({ cap: 6, hook: false, pull: true, stuck: false, limit: true }) },
    { t: 'Budgets', home: true, say: 'A stuck model would go on forever. Turn, token and time limits end it with a named reason.', act: m => m.set({ cap: 2, hook: false, pull: true, stuck: true, limit: true }) },
    { t: 'A contract', home: true, say: 'Every run ends in a named state. That is what the rest of this harness builds on.', act: m => m.set({ cap: 6, hook: false, pull: true, stuck: false, limit: true }) },
  ],
  check: [
    { q: 'Why make the loop a state machine?', options: ['Every step and stop is named and testable', 'It is faster', 'Models need it'], answer: 0, why: 'You can stop, resume and explain it.', hint: 'See Transitions.' },
    { q: 'What is a pull point?', options: ['Where the loop yields to the caller', 'A network port', 'A kind of tool'], answer: 0, why: 'Approval and cancel live there.', hint: 'Try No pull points.' },
    { q: 'What should happen when a budget runs out?', options: ['The run ends with a named reason', 'It keeps going', 'It crashes'], answer: 0, why: 'A clean stop saves state.', hint: 'Try A turn cap of two.' },
  ],
  terms: [['State machine', 'Named states with fixed moves.'], ['Hook', 'Your code at a lifecycle point.'], ['Pull point', 'Where control returns to the caller.'], ['Budget', 'A limit on turns, tokens or time.'], ['Terminal state', 'A named end.']],
  deeper: '<p><b>Ten hooks.</b> Before and after the session, the model and each tool, and on budget and error, for instance.</p><p><b>Blocked is a result.</b> Return a refusal as a tool result, so that the model can adapt.</p><p><b>This walk</b> is a scripted run.</p>',
  code: {
    title: 'A step function',
    note: 'Adapted from the course\'s harness (code/main.py).',
    text: `
def step(state, session):
    if state == "model":
        session.turns += 1
        if session.over_budget():
            return "stopped", session.stop_reason()
        reply = model(session)
        return ("pull:tools", reply) if reply.tool_calls else ("done", reply)
    if state == "tools":
        return "model", run_tools(session, hooks)
`,
  },
};
