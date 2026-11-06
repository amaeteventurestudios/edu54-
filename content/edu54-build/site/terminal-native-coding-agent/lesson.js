// Capstone: a terminal coding agent (phase 19, capstone 1). The whole loop runs on a Kampala mobile-money repo: plan, read, edit, test, verify, with a context tank, a sandbox and a permission gate around it.
// A scripted bug needs two edits and two test runs. Remove a part and the run fails in its own way. Turns and context are counted as the loop runs. Earlier lessons supply the parts.
const STN = ['Plan', 'Read', 'Edit', 'Test', 'Verify'];
function run(o) {
  let ctx = 12, turns = 0, tries = 0, done = false, why = '';
  for (let pass = 0; pass < 5 && !done; pass++) {
    turns += 2; ctx += o.grep ? 8 : 38;
    turns += 1; ctx += 4;
    if (!o.tests) { done = true; why = 'untested'; break; }
    tries++; turns += 1; ctx += 6;
    if (o.compact && ctx > 60) ctx = 30;
    if (ctx > 100) { why = 'full'; break; }
    if (tries >= 2) { done = true; why = 'ok'; }
  }
  const danger = o.risky && !o.gate;
  return { ctx, turns, tries, why, danger, escaped: danger && !o.sand, ok: why === 'ok' && !danger };
}

export default {
  slug: 'terminal-native-coding-agent',
  title: 'Capstone: a coding agent in the terminal',
  description: 'Plan, read, edit, test, verify. See a whole coding agent run on a real bug, and what each part is there for.',
  overview: 'Coding agents became the leading AI application, and they share one shape: a loop in a terminal. Plan the change, read what matters, edit, run the tests, look at the result, and go round. Everything else keeps that loop honest. Search keeps reading from filling the window. Tests give it a truth outside the model. Compaction keeps it going on long jobs. A sandbox limits what a mistake can reach, and a permission gate stops the dangerous commands. This capstone puts the parts from earlier tracks together, on one bug in a mobile-money repo in Kampala. Remove any part, and you see why it was there.',
  keywords: ['coding agent', 'agent harness', 'sandbox', 'tool use', 'capstone', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { tests: true, grep: true, compact: true, sand: true, gate: true, risky: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const box = P.box(3.4, 0.04, 1.3, '#BFD8D2', { r: 0.03, material: new S.THREE.MeshLambertMaterial({ color: '#BFD8D2' }) }); box.position.set(0.6, 0.02, 0); S.add(box);
    const A = i => i / 5 * Math.PI * 2 - Math.PI / 2, PT = i => V(0.6 + Math.cos(A(i)) * 1.25, 0.06, Math.sin(A(i)) * 0.48);
    const St = STN.map((n, i) => { const m = new S.THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.5, 0.3, 0.32, '#fff', { r: 0.05, material: m }); b.position.copy(PT(i)); S.add(b); return m; });
    const bot = add(P.robot(SAF, { scale: 0.45 })); bot.userData.noFit = true;
    const tank = add(P.tank(0.6, 1.0, 0.6, GOOD)); tank.position.set(-1.95, 0.08, -0.1);
    const gate = add(P.lamp(GREY, { h: 0.45, r: 0.1 })); gate.position.set(-1.2, 0.03, 0.5);
    S.add(P.keep(-2.45, 2.45, 1.15, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      St.forEach((m, i) => m.color.set(i === 3 && !st.tests ? GREY : i === 4 && R.why !== 'ok' ? BAD : BLUE));
      tank.userData.set({ level: R.ctx / 100, color: R.ctx > 85 ? BAD : GOOD });
      gate.userData.set({ color: !st.risky ? GREY : st.gate ? '#3E9B5F' : '#D9483B', on: st.risky });
      box.material.color.set(st.sand ? '#BFD8D2' : '#E8DCC9');
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s, q) => ({ type: 'toggle', label: l, short: s, quick: q, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tg('tests', 'Run the tests each round', 'Tests'), tg('grep', 'Search first, not read whole files', 'Search'), tg('compact', 'Compact context when it gets full', 'Compaction'),
      tg('sand', 'Run in a sandbox', 'Sandbox', false), tg('gate', 'Ask before dangerous commands', 'Permission', false), tg('risky', 'The model proposes deleting a folder', 'Risky step', false),
    ];
    const readouts = [
      { label: 'Result', get: () => ({ v: { ok: 'bug fixed', untested: 'says done', full: 'ran out of room' }[R.why] ?? 'stuck', sub: `${R.tries} test runs`, good: R.ok, bad: !R.ok }) },
      { label: 'Turns', get: () => ({ v: `${R.turns}`, sub: 'round the loop' }) },
      { label: 'Context used', get: () => ({ v: `${R.ctx}%`, sub: 'at the end', good: R.ctx < 70, bad: R.ctx > 90 }) },
    ];
    const labels = [
      { name: 't', t: 'Context', d: 'Reading fills it', icon: 'target', atV: V(-2.28, 0.6, -0.1) },
      { name: 'l', t: 'The loop', d: 'Plan, read, edit, test, verify', icon: 'link', atV: V(2.2, 0.1, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No tests', hint: 'it decides it\'s done', on: () => set({ ...D0, tests: false }), off: reset },
      { label: 'Read everything, never compact', hint: 'the window fills', on: () => set({ ...D0, grep: false, compact: false }), off: reset },
      { label: 'No gate, no sandbox', hint: 'a bad command runs', on: () => set({ ...D0, risky: true, gate: false, sand: false }), off: reset },
    ];
    function status() {
      if (R.escaped) return { ok: false, msg: '<b>The delete ran on the real machine.</b> The model was wrong once, and nothing stood between that and your files. A gate stops the call, and a sandbox limits the damage when a gate fails.' };
      if (R.danger) return { ok: false, msg: '<b>The delete ran, inside the sandbox.</b> No harm done outside. The sandbox saved you, and a permission gate would have caught it first.' };
      if (R.why === 'untested') return { ok: false, msg: `<b>"Fixed", after ${R.turns} turns, with nothing run.</b> The model believes its own edit. The test command is the only opinion in this loop that isn't the model's.` };
      if (R.why === 'full') return { ok: false, msg: `<b>The window filled at ${R.ctx}% before the second test.</b> Whole files in context leave no room to think. Search first, and compact what is done.` };
      return { ok: true, msg: `<b>Fixed in ${R.turns} turns and ${R.tries} test runs, context at ${R.ctx}%.</b> The first test failed, the agent read the output, and the second passed. That round trip is the product.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.8) % 5;
        const i = Math.floor(u), f = u - i, a = PT(i), b = PT((i + 1) % 5);
        bot.position.copy(a.lerp(b, f)); bot.position.y = 0.36; bot.userData.set({ busy: true });
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A loop in a terminal', home: true, say: 'A mobile-money team in Kampala has a bug. Their agent goes round one loop: plan, read, edit, test, verify.', act: m => m.set({ tests: true, grep: true, compact: true, sand: true, gate: true, risky: false }) },
    { t: 'The truth outside', home: true, say: 'Take away the tests, and the agent says it is done, after changing code nobody ran.', act: m => m.set({ tests: false, grep: true, compact: true, sand: true, gate: true, risky: false }) },
    { t: 'Keep the window free', home: true, say: 'Reading whole files fills the tank. Search narrows it, and compaction clears what is finished.', act: m => m.set({ tests: true, grep: false, compact: false, sand: true, gate: true, risky: false }) },
    { t: 'The first test fails', home: true, say: 'Now watch it work. The first test fails, the agent reads the output, and tries again.', act: m => m.set({ tests: true, grep: true, compact: true, sand: true, gate: true, risky: false }) },
    { t: 'A bad idea', home: true, say: 'The model proposes deleting a folder. A permission gate stops and asks.', act: m => m.set({ tests: true, grep: true, compact: true, sand: true, gate: true, risky: true }) },
    { t: 'When the gate fails', home: true, say: 'And the sandbox limits what a mistake can reach. Every part of this loop came from an earlier lesson.', act: m => m.set({ tests: true, grep: true, compact: true, sand: true, gate: false, risky: true }) },
  ],
  check: [
    { q: 'What makes the loop honest?', options: ['Tests that run outside the model', 'A longer prompt', 'A bigger model'], answer: 0, why: 'It is the one opinion that isn\'t the model\'s.', hint: 'Try No tests.' },
    { q: 'What do search and compaction protect?', options: ['The context window', 'The network', 'The disk'], answer: 0, why: 'They leave room to think.', hint: 'Try Read everything, never compact.' },
    { q: 'Why have both a gate and a sandbox?', options: ['One stops the call, one limits the damage', 'They do the same', 'To slow it down'], answer: 0, why: 'Either can fail alone.', hint: 'Try No gate, no sandbox.' },
  ],
  terms: [
    ['Agent loop', 'Think, act, observe, repeat.'],
    ['Harness', 'The code around the model.'],
    ['Compaction', 'Summarising old context to free room.'],
    ['Sandbox', 'A confined place to run commands.'],
    ['Permission gate', 'A stop before risky actions.'],
    ['Verification', 'Proof from outside the model.'],
  ],
  deeper: '<p><b>Parts from earlier.</b> The agent loop, tool use, workbench files, gates and reviewers all feed in here. The later harness capstones build each part.</p><p><b>Real tools.</b> Commercial agents differ in polish, not in this shape.</p><p><b>This run</b> is scripted, with a bug that needs two test runs.</p>',
  code: {
    title: 'The loop',
    note: 'Adapted from the course\'s capstone sketch (code/main.py).',
    text: `
def run(task, tools, max_turns=30):
    messages = [system(RULES), user(task)]
    for _ in range(max_turns):
        reply = model(messages, tools=tools)
        if not reply.tool_calls:
            return verify(task)                  # ask the tests, not the model
        for call in reply.tool_calls:
            if needs_permission(call) and not approved(call):
                messages.append(denied(call))
                continue
            messages.append(sandbox.run(call))
        messages = compact_if_needed(messages)
`,
  },
};
