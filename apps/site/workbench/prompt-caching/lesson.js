// Prompt caching: a teacher-support assistant at a teacher training college in Zomba. One lecturer's 30-turn conversation over most of an hour.
// Every request sends: (optional timestamp, 40 tokens) · system prompt with the curriculum handbook (6,000) · 12 tool definitions (2,000) · worked examples (1,500)
// · the chat so far (400 tokens a turn) · the new message (150). Providers cache prefixes only: if any token differs, everything after it misses.
// Cache breakpoints after the examples and, optionally, after the chat. Prices as a share of the normal input price: cache write 1.25× (5-minute life) or 2× (1-hour life),
// cache read 0.1×, uncached 1×; a read refreshes the life. A prefix under 1,024 tokens is not cached. Normal input price 3 US dollars a million tokens, shown in your currency.
// Time to first token: 0.25 s plus 1 s for every 20,000 tokens the model has to process fresh. Gaps between turns: mostly 30 to 120 s, three of 6 to 9 minutes.
const TURNS = 30, SYS = 6000, TOOLS = 2000, EX = 1500, PER = 400, MSG = 150, STAMP = 40, PRICE = 3 / 1e6;
let seed = 41; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const GAP = Array.from({ length: TURNS }, (_, i) => i === 0 ? 0 : [9, 17, 24].includes(i) ? 360 + rnd() * 180 : 30 + rnd() * 90);
const AT = GAP.reduce((a, g, i) => (a.push((a[i - 1] || 0) + g), a), []);
const SHUF = Array.from({ length: TURNS }, () => rnd() < 0.5);
function run(st) {
  const cache = new Map(), rows = [];
  let cost = 0, full = 0, readT = 0, allT = 0, ttft = 0;
  const life = st.ttl ? 3600 : 300, wmul = st.ttl ? 2 : 1.25;
  for (let r = 0; r < TURNS; r++) {
    const t = AT[r];
    /* the prompt as atoms; each chat turn is its own atom, so this turn's chat starts with last turn's */
    const atoms = [];
    if (st.stamp) atoms.push({ k: 'time', n: STAMP, id: `t${r}` });
    atoms.push({ k: 'sys', n: SYS, id: 'sys' }, { k: 'tools', n: TOOLS, id: st.shuffle && SHUF[r] ? `tools${r}` : 'tools' }, { k: 'ex', n: EX, id: 'ex', bp: true });
    for (let h = 0; h < r; h++) atoms.push({ k: 'hist', n: PER, id: `h${h}`, bp: st.hist && h === r - 1 });
    atoms.push({ k: 'msg', n: MSG, id: `m${r}` });
    let key = '', pos = 0;
    atoms.forEach(x => { key += `|${x.id}`; pos += x.n; x.key = key; x.end = pos; });
    /* read the longest live cached prefix, refreshing its life */
    let read = 0;
    if (st.cache) for (let i = atoms.length - 1; i >= 0; i--) { const e = cache.get(atoms[i].key); if (e && e > t) { read = atoms[i].end; cache.set(atoms[i].key, t + life); break; } }
    /* write up to the last breakpoint, if long enough */
    let writeTo = 0;
    if (st.cache) atoms.forEach(x => { if (x.bp && x.end >= 1024) { writeTo = x.end; if (x.end > read) cache.set(x.key, t + life); } });
    const total = pos, written = Math.max(0, writeTo - read), plain = total - read - written;
    /* group atoms into display blocks */
    const blocks = []; atoms.forEach(x => { const last = blocks[blocks.length - 1]; if (last && last.k === x.k && x.k === 'hist') { last.n += x.n; last.end = x.end; } else blocks.push({ k: x.k, n: x.n, end: x.end }); });
    const c = (read * 0.1 + written * wmul + plain) * PRICE;
    cost += c; full += total * PRICE; readT += read; allT += total; ttft += 0.25 + (written + plain) / 20000;
    rows.push({ t, blocks, read, written, total, c });
  }
  return { rows, cost, full, hit: readT / allT, ttft: ttft / TURNS };
}

export default {
  slug: 'prompt-caching',
  title: 'Prompt caching: keep the start of the prompt the same',
  description: 'A college assistant in Zomba sends the same handbook, tools and examples every turn. Keep that start identical and the cache bills it at a tenth.',
  money: true,
  overview: 'Many requests start with the same long text: a system prompt, tool definitions, examples, the conversation so far. Prompt caching lets the provider keep the model\'s working state for that prefix and reuse it. The first request writes the cache at a small premium; later requests that start with exactly the same tokens read it at a fraction of the normal price, and the model starts answering sooner because it has less to process. The catch is in the word prefix: caching works from the first token forward, and the first token that differs ends the match. So put stable parts first (system prompt, tools in a fixed order, examples), the conversation next, and anything that changes every time (the new message, the time, per-request retrieved text) last. A timestamp at the top, a dictionary of tools serialised in a different order, or one edited word in the system prompt makes every request a miss, and with a write premium a miss costs more than no caching at all. Caches also expire, after a few minutes by default or an hour at a higher write price; choose the life that matches the gaps in your traffic. Watch cached and uncached input tokens separately, so a drop in traffic is not mistaken for a cache win.',
  keywords: ['prompt caching', 'context caching', 'KV cache', 'cache hit rate', 'LLM cost', 'time to first token', 'prefix caching'],
  orient: 'landscape',
  view: { target: [0, 0.4, -0.1], dir: [0.4, 0.85, 1.3], half: 1.85, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cache: true, hist: true, ttl: 1, stamp: false, shuffle: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* thirty requests, one row of bricks each: teal read from the cache, gold written to it, grey full price, coral the new message */
    const X0 = -2.75, XW = 3.65, Z0 = -0.98, DZ = 0.064, MAXT = STAMP + SYS + TOOLS + EX + (TURNS - 1) * PER + MSG, SC = XW / MAXT;
    const pad = P.box(XW + 0.25, 0.02, TURNS * DZ + 0.12, '#FFFFFF', { r: 0.03 }); pad.position.set(X0 + XW / 2 - 0.08, 0, Z0 + (TURNS - 1) * DZ / 2); S.add(pad);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const SEG = TURNS * 8, im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), SEG); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const gapM = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: RED }), TURNS); gapM.frustumCulled = false; gapM.userData.noFit = true; S.add(gapM);
    /* results: input cost for the 30 turns, without caching and with these settings */
    const fullTw = P.tower(0.55, 0.55, '#9A968C', { size: 0.24 }), cTw = P.tower(0.55, 0.55, GOOD, { size: 0.24 });
    fullTw.position.set(1.65, 0, -0.35); cTw.position.set(2.45, 0, 0.1); S.add(fullTw, cTw);
    S.add(P.keep(-3.0, 2.8, 1.5, -1.1, 0.95));
    let R = null, clock = 0;
    const M = v => S.money.of(v);
    function paint() {
      const upto = Math.min(TURNS, Math.floor(clock * 12) + 1);
      let k = 0;
      R.rows.forEach((row, r) => {
        const z = Z0 + r * DZ, show = r < upto;
        row.blocks.forEach(b => {
          /* split a block by how much of it was read, written or full price */
          const a = b.end - b.n, segs = [[a, Math.min(b.end, row.read), GOOD], [Math.max(a, row.read), Math.min(b.end, row.read + row.written), SAF], [Math.max(a, row.read + row.written), b.end, '#B9B4A8']];
          segs.forEach(([s0, s1, c]) => {
            if (k >= SEG) return;
            const len = s1 - s0, on = show && len > 0;
            dummy.position.set(X0 + (s0 + len / 2) * SC, 0.01, z); dummy.scale.set(on ? Math.max(0.002, len * SC - 0.004) : 0, b.k === 'msg' ? 0.14 : 0.09, on ? DZ * 0.78 : 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix);
            im.setColorAt(k, col.set(b.k === 'msg' ? BAD : b.k === 'time' && c !== GOOD ? RED : c)); k++;
          });
        });
        const long = GAP[r] > 300;
        dummy.position.set(X0 - 0.11, 0.01, z); dummy.scale.set(long && show ? 0.08 : 0, 0.16, long && show ? DZ * 0.8 : 0); dummy.updateMatrix(); gapM.setMatrixAt(r, dummy.matrix);
      });
      for (let j = k; j < SEG; j++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(j, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true; gapM.instanceMatrix.needsUpdate = true;
    }
    function draw() {
      R = run(st); clock = 0;
      const mx = Math.max(R.full, R.cost) * 1.05;
      fullTw.userData.set({ h: 0.05 + R.full / mx * 1.3, cap: M(R.full) });
      cTw.userData.set({ h: 0.05 + R.cost / mx * 1.3, cap: M(R.cost), color: R.cost > R.full ? RED : R.cost < R.full * 0.4 ? GOOD : SAF });
      paint();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { fullTw.userData.tick(dt); cTw.userData.tick(dt); if (clock * 12 > TURNS) return; clock += dt; paint(); };
    const controls = [
      { type: 'toggle', label: 'Prompt caching', get: () => st.cache, set: v => set({ cache: !!v }) },
      { type: 'toggle', label: 'Cache the chat too', get: () => st.hist, set: v => set({ hist: !!v }), quick: false },
      { type: 'buttons', label: 'Cache life', options: ['5 minutes', '1 hour'], get: () => st.ttl, act: i => set({ ttl: i }) },
      { type: 'toggle', label: 'Timestamp at the top', short: 'Timestamp', get: () => st.stamp, set: v => set({ stamp: !!v }) },
      { type: 'toggle', label: 'Tools in a shuffled order', short: 'Shuffled tools', get: () => st.shuffle, set: v => set({ shuffle: !!v }), quick: false },
      { type: 'button', label: 'Replay the conversation', act: () => { clock = 0; paint(); } },
    ];
    const readouts = [
      { label: 'Input cost', get: () => ({ v: M(R.cost), sub: `without caching: ${M(R.full)}`, good: R.cost < R.full * 0.4, bad: R.cost > R.full }) },
      { label: 'Read from cache', get: () => ({ v: `${Math.round(R.hit * 100)}%`, sub: 'of input tokens' }) },
      { label: 'First token', get: () => ({ v: `${R.ttft.toFixed(2)} s`, sub: 'average wait' }) },
    ];
    const labels = [
      { name: 'rows', t: 'One request per row', d: 'Teal read from the cache, gold written, grey full price; a red post is a pause of over five minutes', icon: 'layers', atV: V(-2.95, 0.1, Z0 + 15 * DZ) },
      { name: 'full', t: 'Without caching', d: 'Input cost for all thirty turns', icon: 'money', atV: V(1.92, 0.8, -0.35) },
      { name: 'cost', t: 'With these settings', d: 'The same thirty turns, cached', icon: 'money', atV: V(2.72, 0.25, 0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Timestamp at the top', hint: 'the current time before the system prompt', on: () => set({ ...D0, stamp: true }), off: reset },
      { label: 'Tools in a shuffled order', hint: 'a dictionary serialised differently', on: () => set({ ...D0, shuffle: true }), off: reset },
      { label: 'No caching', hint: 'full price every time', on: () => set({ ...D0, cache: false }), off: reset },
    ];
    function status() {
      const d = run(D0), other = run({ ...st, ttl: 1 - st.ttl });
      if (st.cache && st.stamp) return { ok: false, msg: `<b>Timestamp at the top: ${M(R.cost)}, ${R.cost > R.full ? 'more than with no caching at all' : 'barely below no caching'} (${M(R.full)}).</b> Caching matches from the first token, and the first token is now different every time, so every request writes the cache at a premium and none reads it. Move the time below the cached part, next to the new message: ${M(d.cost)}.` };
      if (st.cache && st.shuffle) return { ok: false, msg: `<b>Tools in a shuffled order: ${Math.round(R.hit * 100)}% of tokens read from the cache, against ${Math.round(d.hit * 100)}% in a fixed order.</b> Half the requests list the same tools in a different order, so the prefix differs from the tools onward and everything after them is written again. Serialise tools, keys and examples in a fixed order: ${M(d.cost)}.` };
      if (!st.cache) return { ok: false, msg: `<b>No caching: ${M(R.full)} of input for one conversation, and an average wait of ${R.ttft.toFixed(2)} s before the first token.</b> The handbook, tools and examples are processed from scratch on every turn. Cached, they cost a tenth and the model starts sooner: ${M(d.cost)}, ${d.ttft.toFixed(2)} s.` };
      return { ok: R.cost < R.full * 0.5 ? true : undefined, msg: `<b>${M(R.cost)} instead of ${M(R.full)}; ${Math.round(R.hit * 100)}% of input tokens read from the cache.</b> Stable parts come first, so every turn reuses them, and the chat so far is cached up to the new message. ${st.ttl ? `A one-hour life survives the long gaps but costs twice as much to write; five minutes would cost ${M(other.cost)}.` : `The three long gaps let the cache expire, so those turns write it again; a one-hour life would cost ${M(other.cost)}.`}${st.hist ? '' : ' Caching the chat as well would save more on long conversations.'}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The same start, every time', home: true, say: 'A teacher-support assistant at a college in Zomba sends the same handbook, tools and examples at the start of every request. Without caching, every turn pays for all of it, and the chat grows on top.', act: m => m.set({ cache: false, hist: true, ttl: 0, stamp: false, shuffle: false }) },
    { t: 'Cache the prefix', home: true, say: 'With prompt caching, the first request writes that prefix at a small premium. Every request after it reads it at a tenth of the price, and the model starts answering sooner.', act: m => m.set({ cache: true, ttl: 0 }) },
    { t: 'Long gaps', home: true, say: 'A five-minute cache, refreshed on each read, expires during the three long breaks, so those turns write it again. A one-hour life survives them; it costs more to write, and less overall here.', act: m => m.set({ ttl: 1 }) },
    { t: 'A timestamp at the top', home: true, say: 'Put the current time at the very top, and the first token differs on every request. Nothing after it ever matches, and every turn pays the write premium.', act: m => m.set({ stamp: true }) },
    { t: 'Shuffled tools', home: true, say: 'Serialise the tools in a different order, and the prefix breaks from the tools onward. Fixed order matters, down to the byte.', act: m => m.set({ stamp: false, shuffle: true }) },
    { t: 'Stable first, changing last', home: true, say: 'Keep stable parts first, the chat next, and anything that changes at the end. Then nearly every token after the first turn comes from the cache.', act: m => m.set({ shuffle: false }) },
  ],
  check: [
    { q: 'Why does a timestamp at the top of the prompt ruin prompt caching?', options: ['Caches match from the first token, and the first token now changes every time', 'Timestamps are too long', 'Providers refuse timestamps'], answer: 0, why: 'Put anything that changes after the cached part.', hint: 'Try the timestamp break.' },
    { q: 'Can prompt caching cost more than no caching?', options: ['Yes: writes cost a premium, so constant misses cost extra', 'No, never', 'Only with a one-hour life'], answer: 0, why: 'A cache that never hits is all write premium.', hint: 'Compare the cost bars with the timestamp at the top.' },
    { q: 'When is a one-hour cache life worth its higher write price?', options: ['When gaps between requests are often longer than five minutes', 'Always', 'When prompts are short'], answer: 0, why: 'Five-minute caches expire across long gaps and must be written again.', hint: 'Switch the cache life.' },
  ],
  terms: [
    ['Prompt caching', 'A provider keeping the processed start of a prompt so later requests that start the same reuse it.'],
    ['Prefix', 'The start of the prompt, from the first token up to a cache breakpoint.'],
    ['Cache write', 'The first time a prefix is processed and stored, often at a small premium.'],
    ['Cache read', 'Reusing a stored prefix, at a fraction of the normal input price.'],
    ['Cache life (TTL)', 'How long a stored prefix stays usable without being read.'],
    ['Breakpoint', 'A marker saying where the cached prefix ends.'],
  ],
  deeper: '<p><b>Provider styles.</b> Some providers cache automatically when a long prefix repeats, at a smaller discount; some need explicit markers on the blocks to cache, with a bigger discount and a write premium; some store a named cache you create and pay for by the hour, suited to a large document reused for days. All of them match prefixes only, and most need a minimum length before anything is cached.</p><p><b>Two caches together.</b> Prompt caching reuses identical tokens at the start of a prompt. A semantic cache (in the cost lesson) reuses whole answers for questions with the same meaning. They stack.</p><p><b>Watch it.</b> Log cached and uncached input tokens separately for every call; if the cached count drops to zero after a deploy, something near the top of the prompt changed.</p><p><b>About this machine.</b> The block sizes, prices and gaps are set in the file header, and the cache is simulated request by request: the longest live prefix is read, the rest of the cacheable part is written, the new message is always full price.</p>',
  code: {
    title: 'Mark the stable prefix',
    note: 'Adapted from the course\'s prompt caching lesson.',
    text: `
import json, datetime

TOOLS = sorted(TOOL_DEFS, key=lambda t: t["name"])          # fixed order, always

def build_request(history, message):
    return {
        "system": [
            {"type": "text", "text": HANDBOOK},
            {"type": "text", "text": json.dumps(TOOLS, sort_keys=True)},
            {"type": "text", "text": EXAMPLES,
             "cache_control": {"type": "ephemeral"}},        # breakpoint 1
        ],
        "messages": history + [{"role": "user", "content":
            f"(Now: {datetime.datetime.now():%H:%M})\\n{message}"}],  # changing parts last
    }
`,
  },
};
