// Group chat (phase 16, lesson 10): a Maputo port's incident chat. Four agents share one pool of messages, and a selector picks who speaks next. Eight turns have topics, each with a right speaker.
// Round-robin ignores topic, a model selector costs a call each turn, a rule covers known patterns. Every agent re-reads the pool, so context grows with turns. A termination rule stops the chat.
const WHO = ['Engineer', 'Lawyer', 'Finance', 'Writer'];
const SCRIPT = [0, 0, 1, 2, 0, 1, 3, 3];
const RULE = [0, 0, 1, 2, 0, 1, 3, 3].map((v, i) => i === 3 ? 1 : v);
function run(o) {
  const n = o.stop ? 8 : 14; let right = 0, sel = 0, read = 0; const said = [];
  for (let t = 0; t < n; t++) {
    const want = SCRIPT[t % 8];
    const s = o.mode === 'rr' ? t % 4 : o.mode === 'model' ? want : RULE[t % 8];
    if (s === want && t < 8) right++;
    if (o.mode === 'model') sel += (t + 1) * 0.3 + 0.2;
    read += (t + 1) * 0.4 * (o.all ? 1 : 0.4);
    said.push(s);
  }
  return { n, right, sel: Math.round(sel), read: Math.round(read), tokens: Math.round(sel + read), said };
}

export default {
  slug: 'group-chat-speaker-selection',
  title: 'Group chat: who speaks next?',
  description: 'Four agents, one shared pool. Compare three ways of choosing the next speaker, and see what it costs.',
  overview: 'A static graph suits a known workflow, but real discussions aren\'t static. Hard-code every possible handoff and the edges explode. Group chat takes the other way: every agent sees a shared pool of messages, and a selector picks who speaks next. Round-robin is deterministic and ignores the topic. A model selector reads the pool and chooses well, at the price of a call each turn. A rule covers known patterns for free and misses the rest. Two things matter in any of them. Every agent re-reads the pool, so tokens grow with the square of the turns. And a group chat needs a clear way to end.',
  keywords: ['group chat', 'AutoGen', 'speaker selection', 'multi-agent', 'shared memory', 'termination'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.05, 0.85, 1.1], half: 1.05, wide: 5 },

  build(S) {
    const { V, P } = S;
    const D0 = { mode: 'model', all: true, stop: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const table = P.cyl(0.95, 0.12, '#A87A4F'); table.position.set(-0.9, 0, 0); S.add(table);
    const pool = add(P.stack(0.5, 0.5, 0.05, { max: 14 })); pool.position.set(-0.9, 0.12, 0);
    const A = i => i / 4 * Math.PI * 2 + Math.PI / 4;
    const bots = WHO.map((n, i) => { const r = add(P.robot(['#5B8DB8', '#7B6FA8', '#3E9B9B', '#D98BA6'][i], { scale: 0.7 })); r.position.set(-0.9 + Math.cos(A(i)) * 0.82, 0.12, Math.sin(A(i)) * 0.82); return r; });
    const beam = P.ball(0.09, SAF); beam.userData.noFit = true; S.add(beam);
    const tray = [...Array(8)].map((_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.26, 0.2, 0.26, '#fff', { r: 0.03, material: m }); b.position.set(0.55 + (i % 4) * 0.42, 0.02, i < 4 ? -0.35 : 0.1); S.add(b); return { b, m }; });
    const jar = add(P.jar(0.26, 0.6, { max: 12 })); jar.position.set(2.2, 0, 0.5);
    S.add(P.keep(-2, 2.55, 1.2, -0.95, 0.95));
    let R = null, cur = 0, u = 0;
    function draw() {
      R = run(st);
      tray.forEach(({ m }, i) => m.color.set(R.said[i] === SCRIPT[i] ? GOOD : BAD));
      jar.userData.set({ n: Math.min(12, Math.round(R.tokens / 3.5)) });
      pool.userData.set({ n: R.n, colors: Array(14).fill(0).map((_, i) => ['#5B8DB8', '#7B6FA8', '#3E9B9B', '#D98BA6'][R.said[i] ?? 0]) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['rr', 'rule', 'model'];
    const controls = [
      { type: 'buttons', label: 'Selector', options: ['Round-robin', 'Rule', 'Model'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'toggle', label: 'Every agent reads the whole pool', short: 'Whole pool', get: () => st.all, set: v => set({ all: !!v }) },
      { type: 'toggle', label: 'Stop when the writer files the report', short: 'Stop rule', get: () => st.stop, set: v => set({ stop: !!v }) },
    ];
    const readouts = [
      { label: 'Right speaker', get: () => ({ v: `${R.right} of 8`, sub: 'turns on topic', good: R.right >= 7, bad: R.right < 5 }) },
      { label: 'Turns taken', get: () => ({ v: `${R.n}`, sub: st.stop ? 'stopped when done' : 'nothing ended it', good: R.n === 8, bad: R.n > 8 }) },
      { label: 'Tokens', get: () => ({ v: `${R.tokens}k`, sub: `${R.sel}k choosing, ${R.read}k reading` }) },
    ];
    const labels = [
      { name: 't', t: 'One table, one pool', d: 'The stack is the shared chat', icon: 'user', atV: V(-1.95, 0.4, 0.1) },
      { name: 'r', t: 'Eight turns', d: 'Coral: wrong speaker', icon: 'target', atV: V(2.05, 0.1, -0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Round-robin on a live incident', hint: 'the lawyer on a fault report', on: () => set({ ...D0, mode: 'rr' }), off: reset },
      { label: 'No way to end', hint: 'they keep thanking each other', on: () => set({ ...D0, stop: false }), off: reset },
      { label: 'A rule for an unplanned turn', hint: 'the rule never saw this', on: () => set({ ...D0, mode: 'rule' }), off: reset },
    ];
    function status() {
      if (!st.stop) return { ok: false, msg: `<b>${R.n} turns and ${R.tokens}k tokens: the work was done at turn 8.</b> Nothing ended the chat, so agents kept agreeing and every turn re-read a growing pool. Name a stop condition.` };
      if (st.mode === 'rr') return { ok: false, msg: `<b>Only ${R.right} of 8 turns had the right speaker.</b> Round-robin is cheap and predictable, and it asks the lawyer about a crane fault because it is their turn.` };
      if (st.mode === 'rule') return { ok: R.right >= 7, msg: `<b>${R.right} of 8, with no selector tokens.</b> The rule handles what it was written for, and missed a money question it had no pattern for. A rule with a model as fallback is often the best of both.` };
      return { ok: true, msg: `<b>${R.right} of 8 right, for ${R.sel}k tokens on choosing.</b> ${st.all ? 'Watch the reading bill: every agent reads the whole pool each turn, so it grows with the square of the turns.' : 'Giving agents a filtered view cut the reading bill.'}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt;
        if (u > 0.9) { u = 0; cur = (cur + 1) % R.n; }
        const s = R.said[cur] ?? 0; beam.position.set(-0.9 + Math.cos(A(s)) * 0.82, 0.98, Math.sin(A(s)) * 0.82);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'One shared pool', home: true, say: 'A crane fails at the port of Maputo. An engineer, a lawyer, a finance agent and a writer share one pool of messages.', act: m => m.set({ mode: 'model', all: true, stop: true }) },
    { t: 'Round-robin', home: true, say: 'Take turns, and the lawyer is asked about a crane fault. Cheap, predictable, and blind to the topic.', act: m => m.set({ mode: 'rr', all: true, stop: true }) },
    { t: 'A model selector', home: true, say: 'A selector model reads the pool and picks. Nearly every turn is right, and each pick costs a call.', act: m => m.set({ mode: 'model', all: true, stop: true }) },
    { t: 'A rule', home: true, say: 'A simple rule handles known patterns for free, and misses what it never saw.', act: m => m.set({ mode: 'rule', all: true, stop: true }) },
    { t: 'The reading bill', home: true, say: 'Every agent re-reads the pool every turn, so that bill grows fast. Give each agent a filtered view.', act: m => m.set({ mode: 'model', all: false, stop: true }) },
    { t: 'Knowing when to stop', home: true, say: 'Group chats don\'t end on their own. Stop when the writer files the report.', act: m => m.set({ mode: 'model', all: true, stop: false }) },
  ],
  check: [
    { q: 'What does round-robin ignore?', options: ['The topic', 'The order', 'The number of agents'], answer: 0, why: 'It only follows the fixed cycle.', hint: 'Try Round-robin on a live incident.' },
    { q: 'Why do group chat tokens grow so fast?', options: ['Every agent re-reads the growing pool', 'Selectors are large', 'Messages are encrypted'], answer: 0, why: 'Turns times pool size is roughly a square.', hint: 'Read the Tokens readout.' },
    { q: 'What must every group chat have?', options: ['A termination rule', 'Exactly four agents', 'A lawyer'], answer: 0, why: 'They rarely end by themselves.', hint: 'Try No way to end.' },
  ],
  terms: [
    ['Group chat', 'Agents sharing one message pool.'],
    ['Speaker selection', 'Choosing who talks next.'],
    ['Round-robin', 'A fixed cycle of turns.'],
    ['Selector', 'The function or model that picks.'],
    ['Termination rule', 'What ends the chat.'],
    ['Message pool', 'The shared record of the conversation.'],
  ],
  deeper: '<p><b>Mix them.</b> Use a rule for what you know, and call a model only when the rule has no answer.</p><p><b>Filter.</b> Agents rarely need the full pool. A summary plus the last few messages cuts tokens sharply.</p><p><b>Numbers here</b> are round figures to show the shape.</p>',
  code: {
    title: 'A selector',
    note: 'Adapted from the course\'s group chat (code/main.py).',
    text: `
def select(pool, agents):
    last = pool[-1]
    if "legal" in last.tags:                     # rules first
        return agents["lawyer"]
    names = list(agents)
    return agents[model(f"Who should speak next, of {names}?\\n{tail(pool)}")]

def chat(agents, pool, max_turns=12):
    for _ in range(max_turns):
        speaker = select(pool, agents)
        pool.append(speaker.reply(pool))
        if pool[-1].done:
            break
`,
  },
};
