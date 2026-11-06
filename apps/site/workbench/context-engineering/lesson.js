// Context engineering: a mobile-money support assistant in Nairobi answers customers in long chats. Every call fills the context window with a system prompt,
// tool definitions (40 tools, ~180 tokens each), retrieved help chunks (10 × 400), the chat so far (~600 tokens a turn, with tool results), two examples, the question and room to answer.
// 60 test questions at the chosen turn. Each needs one tool, one help chunk, and 30% also need a fact the customer gave at turn 2.
// A question's chance of a right answer: 0.95 × (tool present) × (chunk present ? position : 0.35) × (fact needed ? (present ? position : 0.3) : 1) × (1 − 0.2 × noise share) × (room to answer).
// Position: 1 − 0.3·sin(π·f)² for a fact at fraction f of the window (Liu et al. 2023: middle 60–70% vs ends 85–90%). Over the window, the oldest turns are cut first.
const NQ = 60, TOOLS = 40, TOOL = 180, CHUNK = 400, TURN = 600, SYS = 600, EXS = 500, QRY = 120, RES = 1500, SUMM = 320, WINS = [16000, 32000, 128000];
let seed = 9; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const QD = Array.from({ length: NQ }, () => ({ tool: rnd(), keep: rnd(), slot: Math.floor(rnd() * 10), fact: rnd() < 0.3, summ: rnd() }));
const NAMES = { sys: 'System prompt', mem: 'Summary of older turns', tools: 'Tool definitions', docs: 'Help chunks', ex: 'Examples', hist: 'Chat so far', q: 'The question', res: 'Room to answer' };
const COLS = { sys: '#2C2D31', mem: '#7B6FA8', tools: '#C9A227', docs: '#1F9E89', ex: '#8E8C84', hist: '#5B8DB8', q: '#E07A5F', res: '#E9E5DA' };
const posf = f => 1 - 0.3 * Math.pow(Math.sin(Math.PI * Math.max(0, Math.min(1, f))), 2);
function run(st) {
  const W = WINS[st.w], t = st.turn;
  const tools = st.dyn ? 5 * TOOL : TOOLS * TOOL, docs = st.filt ? 3 * CHUNK : 10 * CHUNK;
  const keepTurns = st.summ ? Math.min(t, 4) : t, mem = st.summ && t > 4 ? SUMM : 0;
  let hist = keepTurns * TURN;
  const fixed = SYS + tools + docs + EXS + QRY + mem + (st.res ? RES : 0);
  /* over the window: drop the oldest turns first */
  let cut = 0;
  if (fixed + hist > W) { const over = fixed + hist - W; const drop = Math.min(keepTurns, Math.ceil(over / TURN)); cut = drop * TURN; hist -= cut; }
  const used = fixed - (st.res ? RES : 0) + hist, room = W - used;
  const order = st.order ? ['sys', 'mem', 'tools', 'ex', 'hist', 'docs', 'q'] : ['sys', 'tools', 'ex', 'mem', 'docs', 'hist', 'q'];
  const size = { sys: SYS, mem, tools, docs, ex: EXS, hist, q: QRY };
  const segs = []; let x = 0;
  for (const k of order) { if (size[k] > 0) { segs.push({ k, a: x, n: size[k] }); x += size[k]; } }
  if (st.res || room > 0) segs.push({ k: 'res', a: x, n: st.res ? RES : Math.max(0, room) });
  const start = k => segs.find(s => s.k === k);
  /* the turn-2 fact lives in the oldest kept turn, or in the summary */
  const factTurnKept = !st.summ ? cut === 0 : t <= 4 && cut === 0;
  const factAt = st.summ && t > 4 ? start('mem') : factTurnKept && hist > 0 ? start('hist') : null;
  const irrelevant = (tools - TOOL) + (docs - CHUNK) + Math.max(0, hist - 2 * TURN) + EXS * 0.3;
  const noise = 1 - 0.2 * irrelevant / used;
  const fits = room >= 800 || st.res;
  let acc = 0, toolMiss = 0, docMiss = 0, factMiss = 0, mids = [];
  QD.forEach(Q => {
    const hasTool = !st.dyn || Q.tool < 0.94, hasDoc = !st.filt || Q.keep < 0.95;
    const ds = start('docs'), docF = (ds.a + (st.filt ? ds.n - CHUNK * 0.5 : CHUNK * (Q.slot + 0.5))) / used;
    const dp = hasDoc ? posf(docF) : 0.35;
    let fp = 1;
    if (Q.fact) {
      const ok = factAt && (!(st.summ && t > 4) || Q.summ < 0.92);
      fp = ok ? posf((factAt.a + TURN * 0.5) / used) : 0.3; if (!ok) factMiss++;
    }
    if (!hasTool) toolMiss++; if (!hasDoc) docMiss++;
    mids.push(dp);
    acc += 0.95 * (hasTool ? 1 : 0) * dp * fp * noise * (fits ? 1 : 0);
  });
  return { W, used, room, cut, segs, tools, docs, hist, mem, acc: acc / NQ, noise, fits, toolMiss, docMiss, factMiss, docPos: mids.reduce((a, b) => a + b) / NQ, factAt: !!factAt };
}
const K = n => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : `${Math.round(n)}`;

export default {
  slug: 'context-engineering',
  title: 'Context engineering: what goes in the window',
  description: 'A support assistant fills its context window on every call. Choose what goes in and where, then watch what it gets right.',
  overview: 'Everything a model knows about the task in front of it comes from its context window: the system prompt, the definitions of the tools it may call, any documents retrieved for this question, the conversation so far, examples, the question itself, and the space it needs to write its answer. The window is large but not free. Every irrelevant token costs money and time on every call and dilutes the parts that matter, and models attend better to the beginning and end of the window than the middle (Liu and colleagues, 2023, measured accuracy falling from the high 80s to the 60s when the key document sat in the middle). Context engineering decides what goes in for each call: only the tools this question might need, only the best few retrieved chunks, older turns summarised into a few lines that keep the facts, the important parts at the ends, and a reserve for the answer. When the chat outgrows the window, something must give; if you let the oldest turns simply fall off, facts the user gave early on go with them.',
  keywords: ['context engineering', 'context window', 'lost in the middle', 'conversation memory', 'summarisation', 'tool selection', 'token budget'],
  orient: 'landscape',
  view: { target: [0.25, 0.7, 0.15], dir: [0.4, 0.8, 1.3], half: 2.0, wide: 6.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { dyn: true, filt: true, summ: true, order: true, res: true, w: 1, turn: 25 }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#B5462F';
    /* the window: a long glass trough; each part of the context is a block as long as its tokens */
    const X0 = -2.6, LW = 4.0, TZ = 0, TH = 0.8, TD = 0.8;
    const trough = P.tank(LW, TH, TD, '#FFFFFF'); trough.position.set(X0 + LW / 2, 0, TZ); S.add(trough); trough.children[2].visible = false;
    const KEYS = Object.keys(NAMES);
    const blocks = KEYS.map(k => { const mm = new THREE.MeshLambertMaterial({ color: COLS[k] }), b = P.box(1, 0.6, TD - 0.14, '#fff', { r: 0.02, material: mm }); b.userData.noFit = true; b.userData.x = X0; b.userData.len = 0.01; S.add(b); return { k, b, mm }; });
    /* attention: a rail of lamps over the trough, bright where the model reads well */
    const NL = 11, lamps = [];
    for (let i = 0; i < NL; i++) { const l = P.lamp('#8E91A3', { h: 1.15, r: 0.13 }); l.position.set(X0 + (i + 0.5) * LW / NL, 0, TZ - TD / 2 - 0.3); S.add(l); lamps.push(l); }
    const rail = P.box(LW, 0.06, 0.08, '#6B6E7E', { r: 0.01 }); rail.position.set(X0 + LW / 2, 1.1, TZ - TD / 2 - 0.3); S.add(rail);
    /* two pennants mark where the needed help chunk and the turn-2 fact sit */
    const flag = c => { const g = new THREE.Group(); const p = P.cyl(0.025, 1.0, '#555'); g.add(p); const f = P.box(0.36, 0.24, 0.04, c, { r: 0.01 }); f.position.set(0.18, 0.76, 0); g.add(f); g.userData.noFit = true; S.add(g); return g; };
    const flags = [flag(GOOD), flag('#7B6FA8')];
    /* turns that fall off the far end pile up in a red bin */
    const bin = P.tower(0.6, 0.6, '#D9483B', { h: 0.02 }); bin.position.set(X0 + LW + 0.5, 0, TZ + 0.9); S.add(bin);
    const chute = P.box(0.6, 0.05, 0.24, '#B9B3A6', { r: 0.01 }); chute.position.set(X0 + LW + 0.25, 0.45, TZ + 0.4); chute.rotation.z = -0.5; S.add(chute);
    /* the model reads the window and answers 60 test questions: green right, red wrong */
    const model = P.robot('#2C2D31', { scale: 2.0, lamp: '#F2C94C' }); model.position.set(X0 + LW + 0.35, 0, TZ - 1.0); model.rotation.y = -0.5; S.add(model); model.userData.set({ busy: true });
    const right = P.tower(0.55, 0.55, GOOD, { size: 0.24 }), wrong = P.tower(0.55, 0.55, '#D9483B', { size: 0.24 });
    right.position.set(2.45, 0, 0.9); wrong.position.set(3.1, 0, 0.9); S.add(right, wrong);
    const ticks = [trough, bin, right, wrong, model];

    let R = null;
    const pct = v => `${Math.round(v * 100)}%`;
    function lay() {
      const sc = LW / R.W;
      KEYS.forEach((k, i) => {
        const z = R.segs.find(q => q.k === k), b = blocks[i];
        b.b.visible = !!z && z.n > 0; if (!z) return;
        b.b.userData.len = Math.max(0.01, z.n * sc); b.b.userData.x = X0 + (z.a + z.n / 2) * sc;
        b.mm.color.set(COLS[k]); b.b.userData.h = k === 'res' ? 0.12 : 0.6;
      });
      lamps.forEach((l, i) => { const f = (i + 0.5) / NL, inUse = f * R.W <= R.used; const w = inUse ? (posf(f * R.W / Math.max(1, R.used)) - 0.7) / 0.3 : 0; l.userData.set({ color: inUse ? P.hex(P.lerpColor('#6B6E7E', '#F2C94C', w)) : '#4A4C58', on: inUse && w > 0.5 }); });
      const ds = R.segs.find(q => q.k === 'docs'), fs = R.segs.find(q => q.k === (st.summ && st.turn > 4 ? 'mem' : 'hist'));
      const fx = [ds ? X0 + (ds.a + (st.filt ? ds.n - CHUNK / 2 : CHUNK * 4.5)) * sc : null, R.factAt && fs ? X0 + (fs.a + Math.min(fs.n, TURN) / 2) * sc : null];
      flags.forEach((F, i) => { F.visible = fx[i] !== null; if (fx[i] !== null) F.position.set(fx[i], TH, TZ + (i ? 0.12 : -0.12)); });
      bin.userData.set({ h: 0.02 + Math.min(1.6, R.cut / R.W * 4) });
      const n = Math.round(R.acc * NQ);
      right.userData.set({ h: 0.05 + n / NQ * 2.2, cap: `${n}` }); wrong.userData.set({ h: 0.05 + (NQ - n) / NQ * 2.2, cap: `${NQ - n}` });
      trough.userData.set({ level: 0 });
    }
    function draw() { R = run(st); lay(); }
    function update(dt) {
      const k = S.reduced ? 1 : Math.min(1, dt * 5);
      blocks.forEach(({ b }) => { b.scale.x += (b.userData.len - b.scale.x) * k; b.position.x += (b.userData.x - b.position.x) * k; b.scale.y = (b.userData.h || 0.6) / 0.6; b.position.y = 0.02; b.position.z = TZ; });
      ticks.forEach(t => t.userData.tick?.(dt));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Turn of the chat', min: 1, max: 60, step: 1, get: () => st.turn, set: v => set({ turn: Math.round(+v) }) },
      { type: 'buttons', label: 'Window', options: WINS.map(K), get: () => st.w, act: i => set({ w: i }) },
      { type: 'toggle', label: 'Pick tools for each question', short: 'Pick tools', get: () => st.dyn, set: v => set({ dyn: !!v }) },
      { type: 'toggle', label: 'Keep only the best 3 chunks', short: 'Best 3 chunks', get: () => st.filt, set: v => set({ filt: !!v }) },
      { type: 'toggle', label: 'Summarise older turns', short: 'Summarise', get: () => st.summ, set: v => set({ summ: !!v }) },
      { type: 'toggle', label: 'Important parts at the ends', short: 'Order', get: () => st.order, set: v => set({ order: !!v }), quick: false },
      { type: 'toggle', label: 'Reserve room for the answer', short: 'Reserve', get: () => st.res, set: v => set({ res: !!v }), quick: false },
    ];
    const readouts = [
      { label: 'Answered right', get: () => ({ v: pct(R.acc), sub: 'of 60 test questions', good: R.acc >= 0.7, bad: R.acc < 0.5 }) },
      { label: 'Tokens a call', get: () => ({ v: K(R.used), sub: `of ${K(R.W)}`, bad: !R.fits }) },
      { label: 'Cut off', get: () => ({ v: R.cut ? K(R.cut) : 'none', sub: 'oldest turns dropped', bad: R.cut > 0 }) },
    ];
    const labels = [
      { name: 'window', t: 'The context window', d: 'Each block is one part, as long as its tokens', icon: 'layers', atV: V(-2.62, 0.25, 0.42) },
      { name: 'lamps', t: 'Where it reads well', d: 'Bright at the ends, dim in the middle', icon: 'eye', atV: V(-2.42, 1.4, -0.7) },
      { name: 'bin', t: 'Cut off', d: 'Old turns that fell off the end', icon: 'reset', atV: V(X0 + LW + 0.8, 0.02, TZ + 0.9) },
      { name: 'score', t: 'Answers', d: 'Right (green) and wrong (red), of 60', icon: 'check', at: () => V(2.45, right.children[0].scale.y + 0.05, 0.9) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Old turns fall off the end', hint: 'no summary, a long chat', on: () => set({ ...D0, summ: false, turn: 50 }), off: reset },
      { label: 'Help buried in the middle', hint: 'everything in, in arrival order', on: () => set({ ...D0, order: false, filt: false, dyn: false, summ: false, turn: 20 }), off: reset },
      { label: 'No room to answer', hint: 'fill the window to the brim', on: () => set({ ...D0, res: false, summ: false, turn: 50 }), off: reset },
    ];
    function status() {
      const good = run({ ...D0, w: st.w, turn: st.turn });
      if (!R.fits) return { ok: false, msg: `<b>No room to answer: the window is filled to ${K(R.used)} of ${K(R.W)}, leaving ${Math.max(0, R.room)} tokens for the reply.</b> The answer is cut off mid-sentence or refused. The window holds the reply as well as the prompt, so keep a reserve before filling the rest.` };
      if (R.cut && R.factMiss) return { ok: false, msg: `<b>${K(R.cut)} tokens of old turns fell off the end, and with them the account type the customer gave at turn 2.</b> ${R.factMiss} questions that need it now go wrong (${pct(R.acc)} right). Summarising older turns into a few lines keeps the facts and frees the space: ${pct(good.acc)}.` };
      if (!st.order && R.docPos < 0.85) return { ok: false, msg: `<b>Help buried in the middle: ${pct(R.acc)} right.</b> With ${[!st.dyn && 'every tool', !st.filt && 'every chunk', !st.summ && 'the whole chat'].filter(Boolean).join(', ') || 'the parts'} in arrival order, the help chunk sits in the middle of ${K(R.used)} tokens, where models read least carefully, and ${pct(1 - (R.noise - 0.8) / 0.2)} of the window is unrelated. Put the help next to the question${st.dyn && st.filt && st.summ ? '' : ', and trim what isn\'t needed'}: ${pct(good.acc)}.` };
      const off = ['dyn', 'filt', 'summ', 'order'].filter(k => !st[k]);
      return { ok: R.acc >= 0.7 ? true : undefined, msg: `<b>${pct(R.acc)} right with ${K(R.used)} tokens a call.</b> ${off.length ? `Still sending ${off.map(k => ({ dyn: 'every tool', filt: 'every chunk', summ: 'the whole chat', order: 'parts in arrival order' })[k]).join(', ')}.` : 'Tools picked for the question, the best chunks only, older turns summarised, the important parts at the ends.'}${R.toolMiss ? ` Picking tools misses the right one for ${R.toolMiss} questions; a cost of the saving.` : ''}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Everything in', home: true, say: 'A mobile-money support assistant in Nairobi sends everything on every call: all forty tools, ten help chunks, and the whole chat. The window fills up, and the help it needs sits in the middle.', act: m => m.set({ dyn: false, filt: false, summ: false, order: false, res: true, w: 1, turn: 20 }) },
    { t: 'Pick the tools', home: true, say: 'Most questions need only a few tools. Picking five for each question frees thousands of tokens, at the cost of sometimes missing the right one.', act: m => m.set({ dyn: true }) },
    { t: 'Keep the best chunks', home: true, say: 'Keep only the three best help chunks. Less to read, and less that is beside the point.', act: m => m.set({ filt: true }) },
    { t: 'The ends, not the middle', home: true, say: 'Models read the start and end of the window best. Move the help chunks from the middle to just before the question, the best one last.', act: m => m.set({ order: true }) },
    { t: 'Summarise older turns', home: true, say: 'Fold older turns into a short summary near the top that keeps the facts, like the customer\'s account type, and keep only the last few turns word for word. The window shrinks by more than half.', act: m => m.set({ summ: true }) },
    { t: 'A long chat', home: true, say: 'Now the chat can run to fifty turns and the window stays lean, with room kept free for the answer.', act: m => m.set({ turn: 50 }) },
  ],
  check: [
    { q: 'Why can adding more context make answers worse?', options: ['Unrelated tokens dilute what matters, and the middle of the window is read least carefully', 'Models can only read 1,000 tokens', 'More context always helps'], answer: 0, why: 'Signal to noise matters more than raw size.', hint: 'Try the buried-in-the-middle break.' },
    { q: 'A chat outgrows the window and the oldest turns are dropped. What is lost?', options: ['Facts the user gave early on, like their account type', 'Nothing important', 'The system prompt'], answer: 0, why: 'Summarise older turns so their facts survive.', hint: 'Try the old-turns break.' },
    { q: 'Why reserve part of the window?', options: ['The answer is written inside the same window', 'To make calls cheaper', 'For the next user'], answer: 0, why: 'A full window leaves no room for the reply.', hint: 'Try the no-room break.' },
  ],
  terms: [
    ['Context window', 'Everything the model reads on one call, plus the space for its reply, counted in tokens.'],
    ['Lost in the middle', 'Models attend less to information in the middle of a long context than at its ends.'],
    ['Tool selection', 'Sending only the tool definitions a question might need.'],
    ['Relevance filtering', 'Keeping only the retrieved chunks that best match the question.'],
    ['Conversation summary', 'Older turns condensed into a few lines that keep the facts.'],
    ['Long-term memory', 'Facts stored outside the chat, such as a user\'s preferences, loaded when relevant.'],
    ['Token budget', 'A plan for how many tokens each part of the context may use.'],
  ],
  deeper: '<p><b>Memory over time.</b> Short-term memory is the chat in the window. Long-term memory keeps facts across chats in a store and loads the relevant ones; episodic memory finds past conversations like this one by embedding them. Each needs rules for what is saved and when it expires.</p><p><b>Compressing further.</b> Long documents can be summarised in stages: each section, then the summaries. Tool results can be trimmed to the fields the next step needs. Cache the parts that never change, such as the system prompt and tool list, so they cost less on every call.</p><p><b>Harnesses do this for you.</b> Agent frameworks and coding assistants assemble context per step: they load files on demand, summarise long histories, and keep project notes as memory. Knowing the budget helps you see why they behave as they do.</p><p><b>About this machine.</b> Accuracy is a model, not a measurement: each question needs a tool, a chunk and sometimes an early fact; a missing piece or a place in the middle lowers its chance, and unrelated tokens lower every chance a little. The position curve follows the shape Liu and colleagues reported.</p>',
  code: {
    title: 'Assemble the context for each call',
    note: 'Adapted from the course\'s context engineering lesson.',
    text: `
def build_context(question, chat, tools, search, budget=32_000, reserve=1_500):
    parts = [SYSTEM_PROMPT]
    if len(chat) > 4:
        parts.append("Earlier in this chat: " + summarise(chat[:-4]))   # keeps the facts
    parts += [t.schema for t in pick_tools(question, tools, k=5)]
    parts += EXAMPLES + [turn.text for turn in chat[-4:]]
    parts += [c.text for c in search(question, k=10)[:3]]                 # best chunks last,
    parts.append(question)                                                # next to the question
    while count_tokens(parts) > budget - reserve:
        parts = drop_lowest_priority(parts)
    return parts
`,
  },
};
