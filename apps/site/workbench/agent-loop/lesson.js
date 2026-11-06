// The agent loop: a dispatch rider (the agent) delivers parcels around a small town. Each turn: think (pick a tool),
// act (the tool runs), observe (read the result), then check: done yet? Break it: no stop condition, ignore what it observes.
const PLACES = { Depot: [-2.4, 2.0], Pharmacy: [-2.4, -2.0], 'Mama Nkechi': [2.4, -2.0], Office: [2.4, 2.0], Market: [0, 0] };
// the normal run: each step is a tool call and what came back
const PLAN = [
  { think: 'First parcel: medicine for Mama Nkechi. Where does she live?', tool: 'look_up', arg: 'Mama Nkechi', obs: '12 Allen Avenue, top right of town' },
  { think: 'Ride there.', tool: 'ride_to', arg: 'Mama Nkechi', obs: 'Arrived at 12 Allen Avenue' },
  { think: 'Hand over the medicine.', tool: 'hand_over', arg: 'medicine', obs: 'No one answers the door', hitch: true },
  { think: 'She didn\'t answer. Call her.', tool: 'call_customer', arg: 'Mama Nkechi', obs: '"I\'m coming down now!"' },
  { think: 'Try again.', tool: 'hand_over', arg: 'medicine', obs: 'Delivered ✓', done: 1 },
  { think: 'Next: bread for the office.', tool: 'ride_to', arg: 'Office', obs: 'Arrived at the office' },
  { think: 'Hand over the bread.', tool: 'hand_over', arg: 'bread', obs: 'Delivered ✓', done: 2 },
  { think: 'Both delivered. Back to the depot.', tool: 'ride_to', arg: 'Depot', obs: 'Back at the depot' },
  { think: 'All parcels delivered. I\'m done.', tool: 'finish', arg: 'Both parcels delivered', obs: 'Task complete', stop: true },
];
const LOOPY = [{ think: 'Let me check on the office again.', tool: 'ride_to', arg: 'Office', obs: 'Arrived at the office' }, { think: 'And Mama Nkechi, just in case.', tool: 'ride_to', arg: 'Mama Nkechi', obs: 'Arrived at 12 Allen Avenue' }, { think: 'Maybe the market needs something.', tool: 'ride_to', arg: 'Market', obs: 'Arrived at the market' }];
const STAGES = ['Think', 'Act', 'Observe', 'Done?'];

export default {
  slug: 'agent-loop',
  title: 'The agent loop',
  description: 'Follow a dispatch rider who is really an AI agent. Think, act, look at what happened, decide if it\'s done, repeat. Then take away its stop sign, or make it ignore what it sees.',
  overview: 'An agent is a language model in a loop. It thinks about what to do, calls a tool, reads the result, and goes round again until the job is done or the budget runs out. Here the agent is a rider delivering parcels in a small town, and one customer doesn\'t answer the door the first time.',
  keywords: ['ai agent explained', 'agent loop', 'react pattern', 'tool use agents', 'llm agents'],
  orient: 'landscape',
  view: { target: [0.9, 0.5, 0], dir: [0.3, 1.15, 1.1], half: 3.3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { k: 0, phase: 0, t: 0, running: true, steps: 0, budget: 16, done: 0, stopped: false, noStop: false, deaf: false, log: [], pos: V(...PLACES.Depot.flatMap((v, i) => i ? [0.12, v] : [v])), path: null };
    /* ---------- the town ---------- */
    const roadMat = '#3A3B44';
    for (const x of [-2.4, 0, 2.4]) { const r = P.box(0.55, 0.05, 4.55, roadMat, { r: 0 }); r.position.set(x, 0, 0); S.add(r); }
    for (const z of [-2.0, 0, 2.0]) { const r = P.box(5.35, 0.05, 0.55, roadMat, { r: 0 }); r.position.set(0, 0.002, z); S.add(r); }
    const blockCols = ['#E7D9C4', '#D9E4D0', '#E4D3D8', '#D5DCE8'];
    [[-1.2, -1.0], [1.2, -1.0], [-1.2, 1.0], [1.2, 1.0]].forEach(([x, z], i) => {
      for (let k = 0; k < 3; k++) { const h = 0.35 + ((i * 3 + k) % 4) * 0.18; const b = P.box(0.5, h, 0.55, blockCols[(i + k) % 4], { r: 0.06 }); b.position.set(x - 0.6 + k * 0.6, 0, z + (k % 2 ? 0.15 : -0.15)); S.add(b); }
    });
    const pins = Object.entries(PLACES).map(([n, [x, z]]) => {
      const pin = P.cyl(0.05, 0.6, C.ink); pin.position.set(x + 0.3, 0, z - 0.3); S.add(pin);
      const flag = P.box(0.32, 0.2, 0.04, n === 'Depot' ? C.indigo : C.gold, { r: 0.02 }); flag.position.set(x + 0.46, 0.4, z - 0.3); S.add(flag);
      const t = S.text(n, { size: 0.15, face: 'cam', weight: 750, bg: 'rgba(255,255,255,.9)', color: C.ink }); t.position.set(x + 0.3, 0.85, z - 0.3); t.userData.noFit = true; S.add(t);
      return { n, flag };
    });
    /* ---------- the rider ---------- */
    const rider = new THREE.Group(); S.add(rider);
    for (const x of [-0.17, 0.17]) { const w = P.cyl(0.1, 0.05, '#1A1A1A'); w.rotation.x = Math.PI / 2; w.position.set(x, 0.1, 0.02); rider.add(w); }
    const frame = P.box(0.42, 0.1, 0.1, C.red, { r: 0.03 }); frame.position.y = 0.16; rider.add(frame);
    const body = P.cyl(0.07, 0.24, '#2A6F5A'); body.position.set(-0.02, 0.2, 0); rider.add(body);
    const head = P.ball(0.08, '#F2C94C'); head.position.set(-0.02, 0.5, 0); rider.add(head);
    const box = P.box(0.18, 0.16, 0.18, '#C9774A', { r: 0.02 }); box.position.set(-0.22, 0.22, 0); rider.add(box);
    rider.userData.noFit = true;
    /* ---------- the loop ---------- */
    const LX = 4.3, LZ = 0, LR = 0.95;
    const sp = [V(LX, 0, LZ - LR), V(LX + LR, 0, LZ), V(LX, 0, LZ + LR), V(LX - LR, 0, LZ)];
    const ringBase = new THREE.Mesh(new THREE.TorusGeometry(LR, 0.04, 8, 48), P.mat('#B9B6C6')); ringBase.rotation.x = -Math.PI / 2; ringBase.position.set(LX, 0.06, LZ); S.add(ringBase);
    const stations = STAGES.map((n, i) => { const t = P.tile(n, 0.95, 0.22, 0.42, '#FFFFFF', { size: 0.15 }); t.position.copy(sp[i]).add(V(0, 0.02, 0)); S.add(t); return t; });
    const bead = P.ball(0.1, C.gold); bead.userData.noFit = true; S.add(bead);
    // the log: a note in front of the loop, fixed width so it doesn't jump as lines change
    const logT = S.text('', { size: 0.13, face: 'cam', weight: 600, bg: 'rgba(255,255,255,.95)', color: C.ink, order: 6, depthTest: false, align: 'left', w: 3.3, font: '"JetBrains Mono", monospace' }); logT.position.set(LX + 0.25, 0.55, LZ + 2.3); logT.userData.noFit = true; S.add(logT);
    const pad = P.box(2.6, 0.02, 0.9, '#D8D4CC', { r: 0.04 }); pad.position.set(LX + 0.25, 0, LZ + 2.3); S.add(pad); // keeps the table under the note
    const plan = () => { const k = st.k; if (k < PLAN.length) { if (st.deaf && k >= 3) return { ...PLAN[2], obs: 'No one answers the door', deaf: true }; if (st.noStop && PLAN[k].stop) return LOOPY[0]; return PLAN[k]; } return LOOPY[(k - PLAN.length + 1) % LOOPY.length]; };
    const pathTo = (from, name) => { const [bx, bz] = PLACES[name]; return [from.clone(), V(bx, 0.12, from.z), V(bx, 0.12, bz)]; };
    const short = s => s.length > 34 ? s.slice(0, 33) + '…' : s;
    function writeLog() { logT.userData.set(st.log.slice(-5).join('\n') || 'Task: deliver medicine to Mama Nkechi\nand bread to the office.'); }
    rider.position.copy(st.pos); writeLog();
    // phases: 0 think, 1 act, 2 observe, 3 check
    const DUR = [0.9, 1.0, 0.8, 0.5];
    function enter(ph) {
      st.phase = ph; st.t = 0;
      const p = plan();
      if (ph === 0) st.log.push(`think: ${short(p.think)}`);
      if (ph === 1) { st.log.push(`act:   ${p.tool}("${short(p.arg)}")`); if (p.tool === 'ride_to') st.path = pathTo(rider.position, p.arg); else st.path = null; st.steps++; }
      if (ph === 2) { st.log.push(`saw:   ${short(p.obs)}`); if (p.done && !st.deaf) st.done = Math.max(st.done, p.done); }
      if (ph === 3) {
        if (p.stop && !st.noStop) { st.stopped = true; st.running = false; st.log.push('done:  stop'); }
        else if (st.steps >= st.budget) { st.running = false; st.log.push('stop:  out of budget'); }
        else st.k++;
      }
      writeLog();
    }
    function update(dt) {
      // the bead moves round the loop with the phases
      const a = st.phase + Math.min(1, st.t / DUR[st.phase]);
      const ang = -Math.PI / 2 + a * Math.PI / 2;
      bead.position.set(LX + Math.cos(ang) * LR, 0.32, LZ + Math.sin(ang) * LR);
      stations.forEach((s, i) => { s.userData.body.material = P.mat(i === st.phase && st.running ? C.gold : '#FFFFFF'); });
      if (!st.running) return;
      st.t += dt * (S.reduced ? 3 : 1) * st.speed;
      if (st.phase === 1 && st.path) {
        const u = Math.min(1, st.t / DUR[1]), [a0, a1, a2] = st.path, l1 = a0.distanceTo(a1), l2 = a1.distanceTo(a2), d = u * (l1 + l2);
        const p = d < l1 ? a0.clone().lerp(a1, l1 ? d / l1 : 1) : a1.clone().lerp(a2, l2 ? (d - l1) / l2 : 1);
        const prev = rider.position.clone(); rider.position.copy(p);
        const mv = p.clone().sub(prev); if (mv.lengthSq() > 1e-6) rider.rotation.y = Math.atan2(-mv.z, mv.x);
      }
      box.visible = st.done < 2;
      if (st.t >= DUR[st.phase]) enter((st.phase + 1) % 4);
    }
    st.speed = 1;
    enter(0);
    const restart = () => { Object.assign(st, { k: 0, phase: 0, t: 0, running: true, steps: 0, done: 0, stopped: false, log: [], path: null }); rider.position.set(PLACES.Depot[0], 0.12, PLACES.Depot[1]); rider.rotation.y = 0; enter(0); };
    const controls = [
      { type: 'button', label: 'Start the job again', short: 'Restart', act: restart },
      { type: 'toggle', label: 'Pause', get: () => !st.running && !st.stopped && st.steps < st.budget, set: v => { st.running = !v; } },
      { type: 'slider', label: 'Step budget', min: 6, max: 30, step: 1, get: () => st.budget, set: v => { st.budget = v; } },
      { type: 'slider', label: 'Speed', min: 0.5, max: 4, step: 0.5, get: () => st.speed, set: v => { st.speed = v; }, fmt: v => `${v}×` },
    ];
    const readouts = [
      { label: 'Parcels', get: () => ({ v: `${st.done} / 2`, good: st.done === 2 }) },
      { label: 'Steps used', get: () => ({ v: `${st.steps} / ${st.budget}`, bar: st.steps / st.budget, bad: st.steps >= st.budget && !st.stopped }), bar: true },
    ];
    const labels = [
      { name: 'rider', t: 'The agent', d: 'A model in a loop, with tools', icon: 'target', at: () => rider.position.clone().add(V(0, 0.6, 0)) },
      { name: 'loop', t: 'The loop', d: 'Think, act, observe, check. Again.', icon: 'reset', atV: V(LX, 0.4, LZ - LR) },
      { name: 'log', t: 'What it did', d: 'Every thought, tool call and result', icon: 'code', atV: V(LX - 1.25, 0.5, LZ + 2.3), phone: false },
    ];
    const breaks = [
      { label: 'No stop condition', hint: 'Remove the finish tool', on: () => { st.noStop = true; st.deaf = false; restart(); }, off: () => { st.noStop = false; restart(); } },
      { label: 'Ignore what it observes', hint: 'It never reads the results', on: () => { st.deaf = true; st.noStop = false; restart(); }, off: () => { st.deaf = false; restart(); } },
    ];
    function status() {
      const p = plan();
      if (st.stopped) return { ok: true, msg: `<b>Job done in ${st.steps} steps.</b> When the door wasn't answered, it noticed and called the customer instead of trying the same thing again. Then it knew when to stop.` };
      if (!st.running && st.steps >= st.budget) return { ok: false, msg: st.deaf ? `<b>Same mistake, ${st.steps} times.</b> It never read "no one answers the door", so it kept knocking until the budget ran out. Agents must read every result.` : `<b>It never stopped.</b> With no way to say "done", it kept riding around checking on things until the step budget ran out. Every agent needs a stop condition, and a budget as a safety net.` };
      if (st.deaf && st.k >= 3) return { ok: false, msg: `<b>Knocking again.</b> It isn't reading what happened, so it repeats the failed step.` };
      if (st.noStop && st.done === 2 && st.k >= PLAN.length - 1) return { ok: false, msg: `<b>Both parcels delivered, still going.</b> It has no finish tool, so it can't end the job.` };
      if (st.noStop) return { ok: false, msg: `<b>No finish tool.</b> It can deliver both parcels but has no way to say the job is done, so it will keep going round until the step budget runs out. Now: ${STAGES[st.phase].toLowerCase()}.` };
      if (st.deaf) return { ok: false, msg: `<b>It ignores what it observes.</b> Results come back, but it never reads them. When no one answers the door, it will just knock again. Now: ${STAGES[st.phase].toLowerCase()}.` };
      if (p.hitch && st.phase >= 2) return { msg: `<b>Observe:</b> no one answered. A good agent changes its plan when a result surprises it.` };
      return { msg: `<b>${STAGES[st.phase]}:</b> ${st.phase === 0 ? p.think : st.phase === 1 ? `calls ${p.tool}("${p.arg}")` : st.phase === 2 ? p.obs : 'is the job finished? Not yet, go round again.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset: () => { st.noStop = false; st.deaf = false; st.speed = 1; restart(); }, restart };
  },

  story: [
    { t: 'A model in a loop', home: true, say: 'An agent is a language model in a loop, with tools. This one is a dispatch rider with two parcels to deliver.', act: m => m.restart() },
    { t: 'Think, act, observe', focus: 'loop', zoom: 1.3, say: 'Each turn it thinks about what to do next, calls a tool, reads the result, and checks whether the job is done. Then round again.' },
    { t: 'Tools do the work', focus: 'rider', zoom: 1.4, say: 'Its tools are simple: look up an address, ride somewhere, hand over a parcel, call the customer.', wait: 4 },
    { t: 'Read the result', home: true, say: 'At Mama Nkechi\'s house, no one answers the door. Because the agent reads that result, it changes plan and calls her.', wait: 5 },
    { t: 'Know when to stop', home: true, say: 'When both parcels are delivered, it calls finish and the loop ends. A stop condition, plus a step budget as a safety net, keeps an agent from running forever.', wait: 4 },
    { t: 'Bigger agents', home: true, say: 'Coding agents and research agents work exactly like this, just with more tools and longer loops. The log of every step is how people check what they did.' },
  ],
  check: [
    { q: 'What makes a language model an agent?', options: ['Running it in a loop with tools, until a goal is met', 'A bigger model', 'A faster computer'], answer: 0, why: 'Think, act with a tool, observe the result, repeat until done.' },
    { q: 'The customer doesn\'t answer. What should a good agent do?', options: ['Knock again forever', 'Read that result and change its plan', 'Stop without telling anyone'], answer: 1, why: 'Observations are the point of the loop. Ignoring them makes the agent repeat mistakes.' },
    { q: 'Why give an agent a step budget?', options: ['To make it faster', 'As a safety net if it never decides it\'s done', 'Budgets are required by law'], answer: 1, why: 'Even with a stop condition, a budget stops runaway loops (and runaway bills).' },
  ],
  terms: [
    ['Agent', 'A model that acts in a loop, using tools, toward a goal.'],
    ['Observation', 'The result of a tool call, fed back into the next turn.'],
    ['Stop condition', 'How the agent decides the job is finished.'],
    ['Budget', 'A hard limit on steps, time or money.'],
    ['ReAct', 'A common pattern: reason, then act, then observe.'],
  ],
  deeper: '<p>Each turn, the whole history (task, thoughts, tool calls, results) goes back into the model, so long jobs fill its memory. Real agents summarise old steps, keep notes in files, or hand parts of the job to sub-agents. For actions that can\'t be undone, such as sending money, a person should approve first.</p>',
  code: {
    title: 'The agent loop',
    note: 'The core of the course\'s agent loop, in a few lines.',
    text: `
def run_agent(task, llm, tools, budget=16):
    history = [{"role": "user", "content": task}]
    for step in range(budget):
        reply = llm(history, tools=tools)          # think
        if reply.tool_call is None:                # it answered: done
            return reply.text
        call = reply.tool_call
        result = tools[call.name](**call.args)     # act
        history.append({"role": "assistant", "tool_call": call})
        history.append({"role": "tool", "content": result})   # observe
    return "Stopped: out of budget"                # safety net
`,
  },
};
