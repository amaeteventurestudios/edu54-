// A2A, agent to agent: a tour company's booking agent in Cape Town hands "prepare visa support letters for 12 travellers" to a document agent run by another firm.
// Discovery: fetch https://docs-agent.example/.well-known/agent-card.json, check its JWS signature over the canonical card, pick a binding (JSON-RPC), read its skills.
// SendMessage creates a task: SUBMITTED → WORKING → INPUT_REQUIRED (one passport scan is unreadable) → WORKING → COMPLETED, streamed over SSE.
// The output is an artifact streamed in 4 chunks (append, lastChunk on the 4th). Every request carries A2A-Version: 1.0.
// The document agent's own reasoning, tools and sub-agents stay hidden: the caller sees states and artifacts only.
// A look-alike card at docs-agent.example.co has no valid signature.
function run(st) {
  const L = [], harm = [];
  const add = (t, bad) => L.push({ t, bad });
  if (st.verify) add('GET docs-agent.example/.well-known/agent-card.json · signature valid (JWS over the canonical card) · skill: visa_letters · binding JSONRPC');
  else { add('a link points to docs-agent.example.co · its card has no valid signature · trusted anyway', true); harm.push('passport data sent to an impostor'); }
  add('SendStreamingMessage · A2A-Version: 1.0 · parts: text (the request) + data (12 travellers) + raw (12 passport scans)');
  add('task t-881: SUBMITTED → WORKING');
  add('task t-881: INPUT_REQUIRED · "Passport scan 7 (Thandiwe M.) is unreadable. Please resend."');
  if (st.input) add('booking agent asks the travel desk, sends the new scan as a message on task t-881 · WORKING');
  else { add('booking agent treats INPUT_REQUIRED as failure and gives up · the letters are never made', true); harm.push('task abandoned'); }
  if (st.input) {
    add('artifact visa-letters.pdf: chunk 1 of 4 (append) … chunk 2 … chunk 3 …');
    if (st.whole) add('chunk 4 (lastChunk) · artifact complete: 12 letters, 1 PDF · task COMPLETED');
    else { add('stopped reading at the first chunk: a PDF with 3 of 12 letters, and no end', true); harm.push('truncated artifact'); }
  }
  add('what the booking agent saw: task states and the artifact. Not the document agent\'s prompts, tools or sub-agents.');
  return { L, harm };
}

export default {
  slug: 'a2a-protocol',
  title: 'A2A: hand a task to another company\'s agent',
  description: 'A Cape Town tour company\'s agent hands visa letters for twelve travellers to another firm\'s agent, which never shows its insides.',
  overview: 'MCP connects an agent to tools. A2A, the Agent2Agent protocol, connects an agent to another agent, often one run by a different company on a different framework, when you want to delegate a whole job rather than call a function. Each agent publishes an Agent Card at /.well-known/agent-card.json: its skills, the media types it accepts and returns, and the protocol bindings it speaks (JSON-RPC over HTTP, gRPC, or HTTP+JSON). A card can carry a signature over its canonical JSON, so callers can check it wasn\'t forged. The caller sends a message, made of parts (text, structured data, file bytes or a link), and the other agent creates a task that moves through states: submitted, working, input required, completed, failed or cancelled. The caller polls or follows a stream. Results come back as named artifacts, possibly streamed in chunks; the last chunk is marked, and only then is the artifact whole. Throughout, the called agent stays opaque: its prompts, tools and sub-agents are its own business, which is what lets competitors work together. Every request carries an A2A-Version header.',
  keywords: ['A2A protocol', 'Agent2Agent', 'agent card', 'multi-agent', 'agent interoperability', 'task lifecycle', 'MCP vs A2A'],
  orient: 'landscape',
  view: { target: [-0.5, 0.4, 0.1], dir: [0.4, 0.85, 1.3], half: 1.6, wide: 4.9 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { verify: true, input: true, whole: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the booking agent (a robot) hands work to another firm's document agent (a closed black box: its insides stay hidden); a look-alike sits in front */
    const BXa = -2.2, DXa = -0.3, AZ = -0.6;
    const bot = P.robot('#5B8DB8', { scale: 1.0 }); bot.position.set(BXa, 0, AZ); S.add(bot);
    const opM = new THREE.MeshLambertMaterial({ color: CHAR }), op = P.box(0.9, 0.6, 0.7, '#fff', { r: 0.06, material: opM }); op.position.set(DXa, 0, AZ); S.add(op);
    const fakeM = new THREE.MeshLambertMaterial({ color: '#B9B4A8' }), fake = P.box(0.7, 0.4, 0.45, '#fff', { r: 0.05, material: fakeM }); fake.position.set(DXa + 0.1, 0, 0.15); S.add(fake);
    /* the Agent Card on a stand, with a seal when its signature checks out */
    const card = P.box(0.5, 0.36, 0.04, '#FFFDF5', { r: 0.02 }); card.position.set(-1.25, 0.25, AZ - 0.25); S.add(card);
    const stand = P.cyl(0.02, 0.25, '#6B6E7E'); stand.position.set(-1.25, 0, AZ - 0.25); S.add(stand);
    const sealM = new THREE.MeshLambertMaterial({ color: GOOD }), seal = P.box(0.14, 0.14, 0.03, '#fff', { r: 0.02, material: sealM }); seal.position.set(-1.25, 0.43, AZ - 0.22); S.add(seal);
    /* the task's states as rising steps, the artifact's four chunks, and the stack of letters that came back */
    const sts = [0, 1, 2, 3, 4].map(i => { const mm = new THREE.MeshLambertMaterial({ color: '#D9D4C7' }), b = P.box(0.42, 0.08 + i * 0.08, 0.3, '#fff', { r: 0.03, material: mm }); b.position.set(-2.4 + i * 0.47, 0, 0.75); S.add(b); return mm; });
    const chunks = [0, 1, 2, 3].map(i => { const mm = new THREE.MeshLambertMaterial({ color: '#D9D4C7' }), b = P.box(0.3, 0.12, 0.26, '#fff', { r: 0.03, material: mm }); b.position.set(0.55 + i * 0.36, 0, 0.75); S.add(b); return mm; });
    const letters = P.stack(0.42, 0.3, 0.05, { max: 12, color: '#FFFFFF' }); letters.position.set(1.0, 0, AZ); S.add(letters);
    const tok = P.ball(0.08, SAF, { material: new THREE.MeshLambertMaterial({ color: SAF }) }); tok.userData.noFit = true; S.add(tok);
    S.add(P.keep(-2.75, 1.8, 1.2, -1.0, 1.0));

    let R = null, k = 0, clock = 0;
    function draw() {
      R = run(st); k = 0; clock = 0;
      sealM.color.set(st.verify ? GOOD : RED); fakeM.color.set(st.verify ? '#B9B4A8' : RED);
      const reach = !st.input ? 3 : 5;
      sts.forEach((mm, i) => mm.color.set(i < reach ? (i === 2 ? (st.input ? SAF : BAD) : i === 4 ? GOOD : '#9FC3E6') : '#D9D4C7'));
      const got = !st.input ? 0 : st.whole ? 4 : 1;
      chunks.forEach((mm, i) => mm.color.set(i < got ? (i === 3 ? GOOD : '#9FC3E6') : '#D9D4C7'));
      const n = st.input ? (st.whole ? 12 : 3) : 0;
      letters.userData.set({ n, colors: Array(n).fill(st.verify ? '#FFFFFF' : '#F4C3B5') });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      bot.userData.tick(dt); bot.userData.set({ busy: true }); clock += dt;
      const u = (clock % 2.6) / 2.6, tx = st.verify ? DXa : DXa + 0.1, tz = st.verify ? AZ : 0.15, f = u < 0.5 ? u / 0.5 : (1 - u) / 0.5;
      tok.position.set(BXa + 0.3 + (tx - BXa - 0.3) * f, 0.75 + Math.sin(f * Math.PI) * 0.2, AZ + (tz - AZ) * f);
      tok.material.color.set(u < 0.5 ? SAF : st.verify ? GOOD : RED);
    };
    const controls = [
      { type: 'toggle', label: 'Verify the Agent Card signature', short: 'Verify card', get: () => st.verify, set: v => set({ verify: !!v }) },
      { type: 'toggle', label: 'Answer INPUT_REQUIRED', short: 'Answer input', get: () => st.input, set: v => set({ input: !!v }) },
      { type: 'toggle', label: 'Read the artifact to its last chunk', short: 'Whole artifact', get: () => st.whole, set: v => set({ whole: !!v }) },
      { type: 'button', label: 'Hand it off again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Letters delivered', get: () => { const n = st.input ? (st.whole ? 12 : 3) : 0; return { v: `${n} of 12`, sub: 'in visa-letters.pdf', good: n === 12 && st.verify, bad: n < 12 }; } },
      { label: 'Harms', get: () => ({ v: `${R.harm.length}`, sub: R.harm.join(', ') || 'none', bad: R.harm.length > 0, good: !R.harm.length }) },
      { label: 'Seen inside', get: () => ({ v: 'nothing', sub: 'states and artifacts only' }) },
    ];
    const labels = [
      { name: 'agents', t: 'Two agents', d: 'The tour company\'s robot hands work to another firm\'s closed box; the card on the stand is its signed Agent Card', icon: 'link', atV: V(BXa - 0.3, 0.5, AZ) },
      { name: 'task', t: 'The task', d: 'Steps: submitted, working, input required (gold), working, completed', icon: 'gauge', atV: V(-2.65, 0.06, 0.75) },
      { name: 'out', t: 'What came back', d: 'Four artifact chunks, the last marks the end; the white stack is the 12 visa letters', icon: 'book', atV: V(1.25, 0.3, AZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Trust an unsigned card', hint: 'a look-alike domain', on: () => set({ ...D0, verify: false }), off: reset },
      { label: 'Give up on input-required', hint: 'treat it as failure', on: () => set({ ...D0, input: false }), off: reset },
      { label: 'Stop at the first chunk', hint: 'ignore lastChunk', on: () => set({ ...D0, whole: false }), off: reset },
    ];
    function status() {
      if (!st.verify) return { ok: false, msg: '<b>The booking agent trusted a card from docs-agent.example.co with no valid signature, and sent it twelve passports.</b> Anyone can publish an Agent Card. Fetch it from the domain you expect, verify its signature over the canonical card, and keep a list of agents you have agreed to work with.' };
      if (!st.input) return { ok: false, msg: '<b>The task asked for a readable passport scan, and the booking agent treated that as failure and gave up.</b> INPUT_REQUIRED is a pause, not an error: ask whoever can answer, send the reply as a new message on the same task, and keep following it.' };
      if (!st.whole) return { ok: false, msg: '<b>The booking agent stopped reading after the first chunk: a PDF with three of twelve letters and no end.</b> Artifacts can stream in chunks; append each one and treat the artifact as complete only when a chunk is marked lastChunk, then wait for the task to say COMPLETED.' };
      return { ok: true, msg: '<b>Twelve letters, delivered.</b> The booking agent found the document agent by its signed card, sent a task with text, data and files, answered its request for a better scan, and collected the PDF chunk by chunk until the last. It never saw how the other firm\'s agent worked inside, and didn\'t need to.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Delegate a whole job', home: true, say: 'A tour company\'s booking agent in Cape Town needs visa support letters for twelve travellers. Another firm runs an agent that does exactly that. MCP is for tools; A2A is for handing a job to another agent.', act: m => m.set({ verify: true, input: true, whole: true }) },
    { t: 'Find it by its card', home: true, say: 'The document agent publishes a card: its skills, what it accepts, how to talk to it, and a signature. The booking agent checks the signature before trusting it.', act: m => m.set({ verify: true }) },
    { t: 'A look-alike', home: true, say: 'A look-alike domain serves a card with no valid signature. Trust it, and twelve passports go to a stranger.', act: m => m.set({ verify: false }) },
    { t: 'A task with states', home: true, say: 'The booking agent sends a message with text, traveller data and passport scans. The task moves from submitted to working, then pauses: one scan is unreadable.', act: m => m.set({ verify: true, input: true }) },
    { t: 'Answer the pause', home: true, say: 'Input required is a question, not a failure. Give up instead, and the letters never come.', act: m => m.set({ input: false }) },
    { t: 'Read to the last chunk', home: true, say: 'The letters stream back in chunks. Only the one marked last completes the file. And all along, the other firm\'s workings stay its own.', act: m => m.set({ input: true, whole: true }) },
  ],
  check: [
    { q: 'When would you use A2A instead of MCP?', options: ['To delegate a whole job to another agent, often another company\'s', 'To call a single tool', 'To read a file'], answer: 0, why: 'MCP connects agents to tools; A2A connects agents to agents.', hint: 'Read the overview.' },
    { q: 'What does a task in INPUT_REQUIRED mean?', options: ['The other agent needs more from you before it can go on', 'The task failed', 'The task is done'], answer: 0, why: 'Reply on the same task and keep following it.', hint: 'Try Give up on input-required.' },
    { q: 'Why check an Agent Card\'s signature?', options: ['Anyone can publish a card; the signature shows it wasn\'t forged', 'To speed up discovery', 'Cards are encrypted'], answer: 0, why: 'Look-alike domains are cheap.', hint: 'Try Trust an unsigned card.' },
  ],
  terms: [
    ['A2A', 'Agent2Agent: a protocol for one agent to delegate tasks to another.'],
    ['Agent Card', 'An agent\'s published description: skills, media types, bindings, signature.'],
    ['Task', 'A delegated job with states: submitted, working, input required, completed, failed, cancelled.'],
    ['Part', 'One piece of a message: text, data, file bytes or a link.'],
    ['Artifact', 'A named output of a task, possibly streamed in chunks.'],
    ['Opacity', 'The called agent\'s internals stay hidden from the caller.'],
  ],
  deeper: '<p><b>Bindings.</b> The same data model travels as JSON-RPC over HTTP (with server-sent events for streams), gRPC, or plain HTTP with JSON. A client picks the first binding it speaks from the card and sends A2A-Version on every request; without it a server may assume an older version.</p><p><b>Push notifications.</b> For long jobs, a caller can register a webhook and be told when the task changes, instead of holding a stream open.</p><p><b>With MCP.</b> An agent typically uses MCP for its own tools and A2A to delegate to peers; a peer may itself use MCP inside, invisibly.</p><p><b>About this machine.</b> The hand-off follows the steps in the file header, shortened.</p>',
  code: {
    title: 'Delegate and follow a task',
    note: 'Adapted from the course\'s A2A lesson.',
    text: `
card = fetch_json("https://docs-agent.example/.well-known/agent-card.json")
verify_jws(card["signatures"], canonical_json(without(card, "signatures")), trusted_keys)

msg = {"messageId": new_id(), "role": "ROLE_USER", "parts": [
    {"text": "Visa support letters for these travellers."},
    {"data": {"travellers": travellers}},
    *[{"raw": b64(scan), "filename": f"passport-{i}.jpg", "mediaType": "image/jpeg"} for i, scan in enumerate(scans)]]}

pdf = b""
for event in a2a_stream(card, "SendStreamingMessage", {"message": msg}, headers={"A2A-Version": "1.0"}):
    if event.status == "TASK_STATE_INPUT_REQUIRED":
        a2a_send(card, "SendMessage", {"message": reply_to(event, ask_travel_desk(event))})
    if event.artifact_update:
        pdf = pdf + event.chunk if event.append else event.chunk
        if event.last_chunk:
            save("visa-letters.pdf", pdf)
`,
  },
};
