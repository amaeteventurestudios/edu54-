// Roles and speaker selection (phase 16, lessons 8 and 10): an agent team in one group chat writes a timetable parser for a Dar es Salaam bus app.
// The code has a style problem a critic can see, an off-by-one a test run exposes, and a missing detail (the time zone) the plan never gave.
// Roles (identical coders, or planner, coder, critic and verifier), the selector that picks the next speaker, and whether the coder asks before
// inventing are set; the transcript, up to twelve turns, and what ships are simulated live.
const SPK = { P: 'planner', C: 'coder', R: 'critic', V: 'verifier', C1: 'coder 1', C2: 'coder 2', C3: 'coder 3' };
function chat(o) {
  const s = { planned: false, code: 0, style: true, runtime: true, tz: null, feedback: [], reviewed: -1, tested: -1, testPass: false, critOk: false, asked: false, selectorCalls: 0 };
  const T = [];
  let last = null, done = false;
  const pick = () => {
    if (o.roles === 'same') return ['C1', 'C2', 'C3'][T.length % 3];
    if (o.sel === 'round') return ['P', 'C', 'R', 'V'][T.length % 4];
    s.selectorCalls++;
    if (!s.planned) return 'P';
    if (s.code === 0 || s.feedback.length) return 'C';
    if (o.sel === 'custom') { if (s.tested < s.code) return 'V'; if (s.reviewed < s.code) return 'R'; return 'END'; }
    if (s.reviewed < s.code) return 'R';
    return s.critOk ? 'END' : 'C';
  };
  while (T.length < 12 && !done) {
    const who = pick();
    if (who === 'END') { T.push({ who: 'END', what: 'selector: done' }); break; }
    let what;
    if (who === 'P') { if (!s.planned) { s.planned = true; what = 'plan: parse stop times,\nreturn minutes'; } else what = 'nothing to add'; }
    else if (who[0] === 'C') {
      if (o.roles !== 'same' && !s.planned) what = 'waits for a plan';
      else if (o.ask && !s.asked && o.roles !== 'same') { s.asked = true; s.tz = 'EAT'; what = 'asks the planner:\nwhich time zone? (EAT)'; }
      else {
        if (s.tz === null) s.tz = 'UTC (guessed)';
        s.feedback.forEach(f => { s[f] = false; }); s.feedback = []; s.code++; s.critOk = false;
        what = s.code === 1 ? 'writes the parser' : 'fixes and resubmits';
      }
    } else if (who === 'R') { if (!s.code) what = 'nothing to review'; else { s.reviewed = s.code; if (s.style) { s.feedback.push('style'); what = 'critic: unclear names,\nsplit the function'; } else { s.critOk = true; what = 'critic: looks good'; } } }
    else if (who === 'V') { if (!s.code) what = 'no code to test'; else { s.tested = s.code; if (s.runtime) { s.feedback.push('runtime'); s.testPass = false; what = 'tests: fail, 23:59\nbecomes 0 minutes'; } else { s.testPass = true; what = 'tests: pass'; } } }
    T.push({ who, what });
    if (o.sel === 'round' && o.roles !== 'same' && s.testPass && s.critOk && s.tested === s.code && s.reviewed === s.code) done = true;
  }
  const shipped = [];
  if (s.runtime) shipped.push('the off-by-one at midnight');
  if (s.style) shipped.push('the tangled function');
  if (s.tz !== 'EAT') shipped.push('times in UTC, not EAT');
  return { T, shipped, turns: T.filter(t => t.who !== 'END').length, calls: s.selectorCalls };
}

export default {
  slug: 'roles-and-speaker-selection',
  title: 'Roles and turn-taking: who speaks next?',
  description: 'An agent team in one group chat writes a timetable parser for a Dar es Salaam bus app. Give the agents roles, choose who speaks next, and see which of three bugs ship.',
  overview: 'Three identical coders in a chat write three flavours of the same code. The fix is not more agents but different ones. The common decomposition has four roles: a planner turns the goal into steps; an executor produces the artifact with the working tools; a critic, usually a model, reviews it against the intent, catching what reads wrong; and a verifier, deterministic code such as a test suite or schema check, gives pass or fail with evidence. Critic and verifier are not the same: a critic can be fooled by plausible prose, and a verifier can\'t see taste, so use both, and make at least one role decided by code. MetaGPT encodes such roles as standard operating procedures with fixed inputs and outputs; ChatDev adds communicative dehallucination: when an executor needs a detail it wasn\'t given, it asks the right role by name instead of inventing one. A study of multi-agent failures (MAST) found verification gaps among the most common. When the workflow isn\'t a fixed graph, put the agents in one shared conversation and let a selector choose who speaks next, as in AutoGen\'s GroupChat. Round-robin is predictable but gives turns to agents with nothing to say. A model-picked selector reads the conversation and is context-aware, but adds a call every turn and can decide the job is done because the critic is happy, skipping the test run. A custom selector keeps the model but adds rules, such as "the verifier always speaks after the coder". End the chat with a cap on rounds, a done signal, or a check that the goal is met.',
  keywords: ['multi-agent', 'role specialization', 'group chat', 'AutoGen', 'MetaGPT', 'verification', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.3, 0.3, -0.05], dir: [0.05, 1.1, 1.05], half: 1.15, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { roles: 'roles', sel: 'custom', ask: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const SC = { P: '#5B8DB8', C: SAF, C1: SAF, C2: '#E9A93A', C3: '#D89A2E', R: '#8C6BB1', V: GOOD, END: '#3B3F52' };
    const TC = V(-0.5, 0, -0.05), ANG = [Math.PI, -Math.PI / 2, 0, Math.PI / 2];
    const seat = k => V(TC.x + Math.cos(ANG[k]) * 1.05, 0, TC.z + Math.sin(ANG[k]) * 0.8);
    const table = P.cyl(0.55, 0.22, '#A87A4F'); table.position.copy(TC); S.add(table);
    const bots = [0, 1, 2, 3].map(k => {
      const r = P.robot('#fff', { scale: 0.9 }); r.position.copy(seat(k)); r.lookAt(TC.x, 0, TC.z); S.add(r);
      const n = P.stack(0.18, 0.18, 0.07, { max: 12, color: '#3A3D4A' }); const p = seat(k); n.position.set(p.x + 0.32, 0, p.z + 0.12); S.add(n);
      return { r, n };
    });
    const tok = P.ball(0.08, '#151827'); tok.userData.noFit = true; S.add(tok);
    const SH = ['the off-by-one at midnight', 'the tangled function', 'times in UTC, not EAT'];
    const bugs = SH.map((_, i) => { const l = P.lamp(GOOD, { h: 0.3 }); l.position.set(1.65, 0, -0.45 + i * 0.45); S.add(l); return l; });
    const crate = P.box(0.42, 0.34, 0.42, '#D8C8A0', { r: 0.04 }); crate.position.set(2.25, 0, 0); S.add(crate);
    S.add(P.keep(-1.8, 2.5, 0.75, -1.05, 0.95));
    let R = null;
    function draw() {
      R = chat(st);
      const SEAT = st.roles === 'same' ? { C1: 0, C2: 1, C3: 2 } : { P: 0, C: 1, R: 2, V: 3 };
      const who = st.roles === 'same' ? ['C1', 'C2', 'C3', null] : ['P', 'C', 'R', 'V'];
      bots.forEach((B, k) => {
        const id = who[k]; B.r.visible = !!id; B.n.visible = !!id; if (!id) return;
        B.r.userData.set({ color: SC[id], lamp: SC[id] });
        B.n.userData.set({ n: R.T.filter(t => t.who === id).length });
      });
      path = R.T.filter(t => t.who !== 'END').map(t => seat(SEAT[t.who]));
      SH.forEach((x, i) => bugs[i].userData.set({ color: R.shipped.includes(x) ? RED : GOOD, on: true }));
    }
    let path = [], tt = 0;
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const SELS = ['round', 'llm', 'custom'];
    const controls = [
      { type: 'toggle', label: 'Distinct roles: planner, coder, critic, verifier', short: 'Roles', get: () => st.roles === 'roles', set: v => set({ roles: v ? 'roles' : 'same' }) },
      { type: 'toggle', label: 'The coder asks before inventing a missing detail', short: 'Ask first', get: () => st.ask, set: v => set({ ask: !!v }) },
      { type: 'buttons', label: 'Who speaks next', options: ['Round-robin', 'Model picks', 'Model + rules'], get: () => SELS.indexOf(st.sel), act: i => set({ sel: SELS[i] }) },
    ];
    const readouts = [
      { label: 'Ships with', get: () => ({ v: R.shipped.length ? `${R.shipped.length} problem${R.shipped.length === 1 ? '' : 's'}` : 'none', sub: R.shipped[0] || 'clean', good: !R.shipped.length, bad: R.shipped.length > 0 }) },
      { label: 'Turns', get: () => ({ v: String(R.turns), sub: 'of 12 allowed' }) },
      { label: 'Selector calls', get: () => ({ v: String(R.calls), sub: R.calls ? 'one model call each' : 'fixed order' }) },
    ];
    const labels = [
      { name: 'chat', t: 'The group chat', d: 'The ball goes to who speaks', icon: 'user', atV: V(-1.65, 0.5, -0.05) },
      { name: 'res', t: 'What ships', d: 'Red lamp: a bug left in', icon: 'check', atV: V(2.46, 0.17, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Make every agent a coder', hint: 'identical roles', on: () => set({ ...D0, roles: 'same' }), off: reset },
      { label: 'Let a model pick speakers, no rules', hint: 'skips the tests', on: () => set({ ...D0, sel: 'llm' }), off: reset },
      { label: 'Let the coder invent the detail', hint: 'no asking', on: () => set({ ...D0, ask: false }), off: reset },
    ];
    function status() {
      const sh = R.shipped;
      if (st.roles === 'same') return { ok: false, msg: `<b>Three identical coders took twelve turns rewriting the same parser, and nobody reviewed or tested it: it ships with ${sh.join(', ')}.</b> More agents of the same kind add volume, not correction. Give them different roles, and at least one check decided by code.` };
      if (st.sel === 'llm') return { ok: false, msg: `<b>The model-picked selector saw the critic say "looks good" and ended the chat, so the tests never ran: ${sh.join('; ')}.</b> A critic can be satisfied by code that fails at midnight. Add a rule the model can\'t skip: the verifier speaks after every change.` };
      if (!st.ask) return { ok: false, msg: `<b>The plan never said which time zone, and the coder guessed UTC. The tests were written from the same plan, so they passed: the parser ships showing times three hours off.</b> When a detail is missing, ask the planner by name; neither critic nor verifier can catch a guess the plan never ruled out.` };
      if (st.sel === 'round') return { ok: !sh.length, msg: `<b>Round-robin gets there in ${R.turns} turns, ${sh.length ? `but ships with ${sh.join(', ')}` : 'and ships clean'}, with the planner and critic taking turns when they had nothing to add.</b> Predictable and cheap to run, no selector calls, but it ignores context.` };
      return { ok: true, msg: `<b>The coder asked which time zone (EAT); the verifier ran after each change and caught midnight becoming zero minutes; the critic asked for the function to be split; ${R.turns} turns and the parser ships clean.</b> A model picks the speaker, and a rule keeps the test run from being skipped.` };
    }
    const update = dt => {
      bots.forEach(B => B.r.userData.tick(dt)); if (!path.length) return;
      tt = (tt + dt * 1.2) % (path.length + 1); const i = Math.min(path.length - 1, Math.floor(tt)), k = Math.min(1, (tt - i) * 2);
      const a = path[Math.max(0, i - 1)], b = path[i]; tok.position.set(a.x + (b.x - a.x) * k, 0.85 + Math.sin(k * Math.PI) * 0.2, a.z + (b.z - a.z) * k);
    };
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One chat, many agents', home: true, say: 'An agent team in one group chat writes a timetable parser for a bus app in Dar es Salaam.', act: m => m.set({ roles: 'same', sel: 'custom', ask: true }) },
    { t: 'Different, not more', home: true, say: 'Three identical coders just rewrite each other. Give them roles: plan, code, critique and test.', act: m => m.set({ roles: 'roles', sel: 'round', ask: true }) },
    { t: 'Who speaks next?', home: true, say: 'Round-robin is predictable but gives turns to agents with nothing to say. A model can pick the speaker from context.', act: m => m.set({ roles: 'roles', sel: 'round', ask: true }) },
    { t: 'A happy critic', home: true, say: 'Left alone, the model ends the chat when the critic is happy, and the tests never run.', act: m => m.set({ roles: 'roles', sel: 'llm', ask: true }) },
    { t: 'Ask, don\'t invent', home: true, say: 'The plan never said which time zone. A coder that guesses ships times three hours off. Ask the planner.', act: m => m.set({ roles: 'roles', sel: 'custom', ask: false }) },
    { t: 'Roles and rules', home: true, say: 'Distinct roles, a model choosing the speaker, and one rule it can\'t skip: test after every change.', act: m => m.set({ roles: 'roles', sel: 'custom', ask: true }) },
  ],
  check: [
    { q: 'What is the difference between a critic and a verifier?', options: ['A critic judges; a verifier runs a deterministic check', 'None', 'A verifier writes code'], answer: 0, why: 'Use both; at least one check decided by code.', hint: 'Look at turns where tests run.' },
    { q: 'Why did the model-picked selector ship a bug?', options: ['It ended the chat when the critic was happy, skipping tests', 'It picked too many speakers', 'Round-robin was on'], answer: 0, why: 'Add a rule it can\'t skip.', hint: 'Try Let a model pick speakers.' },
    { q: 'A detail is missing from the plan. What should the coder do?', options: ['Ask the planner by name', 'Guess a sensible default', 'Wait for tests'], answer: 0, why: 'Tests built from the same plan can\'t catch the guess.', hint: 'Try Let the coder invent the detail.' },
  ],
  terms: [
    ['Planner', 'Turns the goal into steps or a spec.'],
    ['Critic', 'A model reviewing an artifact against the intent.'],
    ['Verifier', 'A deterministic check: tests, types, schemas.'],
    ['Communicative dehallucination', 'Ask the right role for a missing detail instead of inventing it.'],
    ['Speaker selector', 'The function that picks the next agent in a group chat.'],
    ['Termination condition', 'A round cap, a done signal or a goal check.'],
  ],
  deeper: '<p><b>Framework surfaces.</b> CrewAI gives each agent a role, goal and backstory; AutoGen\'s GroupChatManager holds the selector; LangGraph pins the order in edges.</p><p><b>Edge explosion.</b> A group chat avoids drawing every possible handoff as a graph edge, at the price of a selector decision every turn.</p><p><b>About this machine.</b> The three defects and each role\'s behaviour are fixed rules; the transcript under each setting is simulated live.</p>',
  code: {
    title: 'A selector with a rule',
    note: 'Adapted from the course\'s group-chat sketch (code/main.py).',
    text: `
def select_next(chat, agents, llm):
    last = chat.messages[-1]
    if last.sender == "coder":
        return agents["verifier"]                 # the rule: test every change
    if last.sender == "verifier" and last.passed:
        return agents["critic"]
    if last.sender == "critic" and last.approved and chat.tests_passed_on_latest():
        return None                               # terminate
    return llm.pick(agents, chat.messages[-6:])   # otherwise, read the room

coder_prompt += ("When you need a detail you were not given, ask the role that owns it, "
                 "by name, before writing code.")
`,
  },
};
