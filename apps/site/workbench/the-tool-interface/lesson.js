// The tool interface (phase 13, lesson 1): a model can only write text. A host beside it holds the real tools. Four steps go round: describe, decide, execute, observe.
// A slip crosses from the model's booth to the host, the host runs the tool, the result comes back. Questions change what is needed; the switches change what the host does.
const Q = {
  rain: { tool: 0, truth: 'live', ask: 'Will it rain in Kigali now?' },
  seat: { tool: 2, truth: 'booked', ask: 'Book a bus seat to Nakuru' },
  hello: { tool: -1, truth: 'none', ask: 'Say thank you in Swahili' },
};
function run(o) {
  const q = Q[o.q], need = q.tool;
  if (!o.tools) return need < 0 ? { used: -1, ok: true, turns: 1, why: 'plain', effects: 0 } : { used: -1, ok: false, turns: 1, why: 'guess', effects: 0 };
  if (need < 0) return { used: -1, ok: true, turns: 1, why: 'plain', effects: 0 };
  const used = o.clear ? need : (need + 1) % 3;
  if (used !== need) return { used, ok: false, turns: 2, why: 'wrong', effects: 0 };
  if (need === 2) {
    const effects = o.retry ? (o.key ? 1 : 2) : 1;
    if (!o.confirm) return { used, ok: false, turns: 2, why: effects > 1 ? 'double' : 'noconfirm', effects };
    return { used, ok: effects === 1, turns: 3, why: effects > 1 ? 'double' : 'done', effects };
  }
  return { used, ok: true, turns: 2, why: 'done', effects: 0 };
}

export default {
  slug: 'the-tool-interface',
  title: 'The tool interface: four steps across a glass wall',
  description: 'A model can only write words. Follow a slip across the glass to a host that does the real work, and back.',
  overview: 'A language model produces text, and that is all. Asked about the weather in Kigali, it can write a good sentence that may be days out of date. The tool interface closes that gap with a small contract and four steps. The host describes its tools. The model decides and writes a structured call. The host executes it, because only the host can touch the world. The model observes the result. Every provider and protocol, from function calling to MCP, is this loop underneath. The two lines to remember: the code behind a tool never reaches the model, and tools that change the world need more care than tools that only read.',
  keywords: ['tool use', 'function calling', 'tool interface', 'JSON schema', 'AI agents', 'side effects'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.1, 0.8, 1.2], half: 1.1, wide: 5.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { q: 'rain', tools: true, clear: true, confirm: true, retry: false, key: false }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    /* the model's booth, a glass wall, the host's bench with three tools */
    const bot = add(P.robot(SAF, { scale: 1.2 })); bot.position.set(-1.9, 0.03, 0);
    const floorL = P.box(1.7, 0.03, 1.4, '#D8D2C4', { r: 0.03 }); floorL.position.set(-1.6, 0, 0); S.add(floorL);
    const floorR = P.box(2.5, 0.03, 1.4, '#BFB8A8', { r: 0.03 }); floorR.position.set(1.25, 0, 0); S.add(floorR);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 1.4), new THREE.MeshLambertMaterial({ color: '#CFE3F2', transparent: true, opacity: 0.35, depthWrite: false }));
    glass.position.set(-0.5, 0.48, 0); glass.userData.noMask = true; S.add(glass);
    const TX = [0.45, 1.25, 2.05], TOOL = [];
    TX.forEach((x, i) => {
      const c = i === 2 ? '#B5462F' : CHAR, m = new THREE.MeshLambertMaterial({ color: c });
      const b = P.box(0.55, 0.35, 0.5, c, { r: 0.05, material: m }); b.position.set(x, 0.03, -0.35); S.add(b);
      const l = P.lamp(GREY, { h: 0.18, r: 0.08 }); l.position.set(x, 0.38, -0.35); S.add(l); TOOL.push({ m, l, c });
    });
    const ledger = add(P.stack(0.5, 0.42, 0.11, { max: 3 })); ledger.position.set(2.05, 0.03, 0.4);
    const rack = P.box(0.6, 0.05, 0.5, '#A87A4F', { r: 0.02 }); rack.position.set(2.05, 0, 0.4); S.add(rack);
    const hostLamp = add(P.lamp(GOOD, { h: 0.55, r: 0.11 })); hostLamp.position.set(-0.05, 0.03, 0.45);
    const slip = P.box(0.3, 0.05, 0.2, '#F4F1EA', { r: 0.01, material: new THREE.MeshLambertMaterial({ color: '#F4F1EA' }) }); slip.userData.noFit = true; S.add(slip);
    S.add(P.keep(-2.5, 2.45, 1.05, -0.7, 0.7));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      TOOL.forEach((T, i) => { const on = R.used === i; T.l.userData.set({ color: on ? (R.why === 'wrong' ? BAD : SAF) : GREY, on }); });
      ledger.userData.set({ n: R.effects, colors: [GOOD, BAD, BAD] });
      hostLamp.userData.set({ color: R.ok ? GOOD : BAD, on: true });
      bot.userData.set({ lamp: R.ok ? '#3E9B5F' : '#D9483B', busy: R.used >= 0 });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const QK = ['rain', 'seat', 'hello'];
    const controls = [
      { type: 'buttons', label: 'Ask the model', options: ['Rain in Kigali?', 'Book a seat', 'Say thank you'], get: () => QK.indexOf(st.q), act: i => set({ q: QK[i] }) },
      { type: 'toggle', label: 'Host describes its tools', short: 'Tools', get: () => st.tools, set: v => set({ tools: !!v }) },
      { type: 'toggle', label: 'Tool descriptions say when to use each', short: 'Clear', get: () => st.clear, set: v => set({ clear: !!v }) },
      { type: 'toggle', label: 'Ask the person before a tool that changes the world', short: 'Confirm', get: () => st.confirm, set: v => set({ confirm: !!v }) },
      { type: 'toggle', label: 'Host retries after a timeout', short: 'Retry', get: () => st.retry, set: v => set({ retry: !!v }) },
      { type: 'toggle', label: 'Bookings carry an idempotency key', short: 'Key', get: () => st.key, set: v => set({ key: !!v }) },
    ];
    const NAME = ['weather', 'calendar', 'booking'];
    const readouts = [
      { label: 'Tool used', get: () => ({ v: R.used < 0 ? 'none' : NAME[R.used], sub: Q[st.q].ask }) },
      { label: 'Trips across the glass', get: () => ({ v: `${R.used < 0 ? 0 : R.turns}`, sub: 'call out, result back' }) },
      { label: 'Seats booked', get: () => ({ v: `${R.effects}`, sub: 'side effects done', good: R.effects <= 1, bad: R.effects > 1 }) },
    ];
    const labels = [
      { name: 'm', t: 'The model', d: 'It can only write', icon: 'info', atV: V(-2.1, 0.5, 0.1) },
      { name: 't', t: 'The host\'s tools', d: 'Red: changes the world', icon: 'box', atV: V(2.05, 0.3, -0.1) },
      { name: 'r', t: 'Seats booked', d: 'Coral: booked twice', icon: 'check', atV: V(2.3, 0.1, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Give the model no tools', hint: 'it answers anyway', on: () => set({ ...D0, tools: false }), off: reset },
      { label: 'Vague tool descriptions', hint: 'it picks by guessing', on: () => set({ ...D0, clear: false }), off: reset },
      { label: 'Blind retry on a booking', hint: 'the timeout hid a success', on: () => set({ ...D0, q: 'seat', retry: true }), off: reset },
      { label: 'No person before a booking', hint: 'the model acts alone', on: () => set({ ...D0, q: 'seat', confirm: false }), off: reset },
    ];
    function status() {
      const a = Q[st.q].ask;
      if (R.why === 'guess') return { ok: false, msg: `<b>No tools, so the model wrote an answer anyway.</b> "${a}" needs the world, and the model has only words. It may read well and still be days stale. A model never says "I cannot reach that" unless you teach it to.` };
      if (R.why === 'wrong') return { ok: false, msg: `<b>The slip named the ${NAME[R.used]} tool, not the ${NAME[Q[st.q].tool]} tool.</b> The model only sees the name, the description and the schema, so a vague description is a coin toss. Say when to use a tool, and when not to.` };
      if (R.why === 'double') return { ok: false, msg: '<b>Two seats booked for one request.</b> The first call worked but its reply timed out, so the host ran it again. Reading twice is harmless; writing twice is not. Give writes an idempotency key.' };
      if (R.why === 'noconfirm') return { ok: false, msg: '<b>The seat was booked with no person asked.</b> The booking tool changes the world, so the host should stop and confirm. Which tools need that is the host\'s decision, never the model\'s.' };
      if (R.why === 'plain') return { ok: true, msg: `<b>No tool needed.</b> "${a}" is something the model already knows, so it answers in words and no slip crosses the glass. Deciding not to call is part of the job.` };
      return { ok: true, msg: `<b>The slip crossed the glass, the host ran the ${NAME[R.used]} tool and the result came back.</b> The model named a tool and arguments. The host held the code, ran it and owned the result.${R.effects ? ' One seat, confirmed by the person.' : ''}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.5) % 2;
        const go = R.used >= 0, x = go ? TX[R.used] : -1.4, k = u < 1 ? u : 2 - u;
        slip.visible = go; slip.material.color.set(u < 1 ? '#F4F1EA' : R.ok ? '#6FC7B5' : '#E07A5F');
        slip.position.set(-1.45 + (x + 1.45) * k, 0.78, 0.1 - 0.35 * k * k);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Only words', home: true, say: 'A model can only write. On its side of the glass there is no internet, no calendar, no bus company. Ask about rain in Kigali, and with no tools it guesses.', act: m => m.set({ q: 'rain', tools: false, clear: true, confirm: true, retry: false, key: false }) },
    { t: 'Describe', home: true, say: 'So the host describes its tools: a name, when to use it, and the shape of its inputs. The code itself stays on the host\'s side.', act: m => m.set({ q: 'hello', tools: true, clear: true, confirm: true, retry: false, key: false }) },
    { t: 'Decide and execute', home: true, say: 'Now the model decides. It writes a slip naming a tool. The host reads the slip and runs the tool for real.', act: m => m.set({ q: 'rain', tools: true, clear: true, confirm: true, retry: false, key: false }) },
    { t: 'Observe', home: true, say: 'The result goes back through the glass. The model reads it and answers, this time from live data.', act: m => m.set({ q: 'rain', tools: true, clear: true, confirm: true, retry: false, key: false }) },
    { t: 'Tools that change things', home: true, say: 'Booking a bus seat to Nakuru changes the world. The host asks the person first. A blind retry after a timeout books two seats.', act: m => m.set({ q: 'seat', tools: true, clear: true, confirm: true, retry: true, key: false }) },
    { t: 'The host owns it', home: true, say: 'With a key on every booking, a retry is safe. The model decides, the host executes, and the host carries the responsibility.', act: m => m.set({ q: 'seat', tools: true, clear: true, confirm: true, retry: true, key: true }) },
  ],
  check: [
    { q: 'Who runs a tool?', options: ['The host', 'The model', 'The person'], answer: 0, why: 'The model only writes a call; the host executes it.', hint: 'Watch the slip cross the glass.' },
    { q: 'Which part of a tool never reaches the model?', options: ['The code that runs it', 'The name', 'The input schema'], answer: 0, why: 'Name, description and schema are sent. The executor stays with the host.', hint: 'See Describe in the story.' },
    { q: 'Why is a retry risky on a booking tool but not on a weather tool?', options: ['A booking changes the world; a weather read does not', 'Weather is slower', 'Bookings have no schema'], answer: 0, why: 'Repeating a read is harmless. Repeating a write does it twice.', hint: 'Try Blind retry on a booking.' },
  ],
  terms: [
    ['Tool', 'A name, a description, an input schema and a function the host runs.'],
    ['Host', 'The program around the model; it holds and runs the tools.'],
    ['Tool call', 'The structured message a model writes to ask for a tool.'],
    ['JSON Schema', 'A standard way to describe the shape of the inputs.'],
    ['Side effect', 'A change in the world, such as a booking or a payment.'],
    ['Idempotency key', 'A tag that makes doing the same thing twice count once.'],
  ],
  deeper: '<p><b>Four steps everywhere.</b> Functions in a chat API, tool blocks, MCP servers and agent-to-agent calls all rest on describe, decide, execute, observe. What differs is the wrapping.</p><p><b>Parallel calls.</b> A model may write several slips in one turn. The host runs them and returns every result together, so tools must not depend on each other\'s order.</p><p><b>Errors are results.</b> A failed call goes back as a tool result the model can read and act on, not as a crash.</p>',
  code: {
    title: 'The loop',
    note: 'Adapted from the course\'s tool interface sketch (code/main.py).',
    text: `
TOOLS = {"get_weather": Tool(
    description="Current conditions for one city. Not for past weather.",
    schema={"type": "object", "properties": {"city": {"type": "string"}},
            "required": ["city"]},
    run=fetch_weather)}                          # run never reaches the model

def loop(messages):
    while True:
        reply = model(messages, tools=describe(TOOLS))  # 1 describe, 2 decide
        if not reply.tool_calls:
            return reply.text
        for call in reply.tool_calls:
            result = TOOLS[call.name].run(**call.args)  # 3 execute
            messages.append(tool_result(call.id, result))  # 4 observe
`,
  },
};
