// Memory blocks and sleep-time compute: an Accra tailor's assistant keeps a Human block about a customer, Ama Owusu (limit 150 characters, always in
// the prompt). During each session the primary agent appends raw facts. Between sessions a sleep-time agent consolidates the block: one line per key,
// newest wins (so "Lives in Osu" gives way to "Lives in East Legon"), pinned safety facts are never dropped, and the block is kept under its limit.
// Latency per turn: 0.8 s to answer, plus 2.5 s whenever consolidation runs on the critical path. Everything below is computed live.
const SESSIONS = [
  ['name: Ama Owusu', 'lives: Osu', 'likes: kente trims', 'waist: 30 in'],
  ['lives: East Legon', 'event: wedding on the 14th', 'avoid: wool (skin reaction)', 'waist: 31 in'],
  ['likes: slim sleeves', 'pickup: East Legon branch', 'likes: hidden pockets'],
];
const LIMIT = 175, PIN = ['avoid'];
const QUESTION = 'Where do we deliver, and which fabric must we avoid?';
const len = b => b.join('; ').length;
function consolidate(block, o) {
  const latest = {}; block.forEach(l => { const k = l.split(':')[0]; if (k === 'likes') latest['likes:' + l] = l; else latest[k] = l; });
  let out = Object.values(latest);
  const likes = out.filter(l => l.startsWith('likes')); if (likes.length > 1) { out = out.filter(l => !l.startsWith('likes')); out.push('likes: ' + likes.map(l => l.slice(7)).join(', ')); }
  const target = o.night ? Math.round(LIMIT * 0.6) : LIMIT, order = ['avoid', 'event', 'likes', 'waist'];
  while (len(out) > target) { const k = order.find(k => (!o.pin || !PIN.includes(k)) && out.some(l => l.startsWith(k + ':'))); if (!k) break; out.splice(out.findIndex(l => l.startsWith(k + ':')), 1); }
  return out;
}
function run(o) {
  let block = [], prev = null; const turns = [], snaps = [], rejected = [];
  SESSIONS.forEach((facts, s) => {
    facts.forEach(f => {
      let lat = 0.8;
      if (len([...block, f]) > LIMIT) { if (o.mode === 'inline') { block = consolidate(block, o); lat += 2.5; } }
      if (len([...block, f]) > LIMIT) rejected.push(f); else block.push(f);
      if (o.mode === 'inline' && block.length > 1 && f.split(':')[0] !== 'likes' && block.filter(l => l.split(':')[0] === f.split(':')[0]).length > 1) { block = consolidate(block, o); lat += 2.5; }
      turns.push({ s, f, lat });
    });
    snaps.push({ s, before: block.slice() });
    if (o.mode === 'sleep' && s < SESSIONS.length - 1) { prev = block.slice(); block = consolidate(block, { ...o, night: true }); snaps[snaps.length - 1].after = block.slice(); snaps[snaps.length - 1].diff = prev.filter(l => !block.includes(l)); }
  });
  const where = block.find(l => l.startsWith('lives:')), avoid = block.find(l => l.startsWith('avoid:'));
  const answer = `Deliver to ${where ? where.slice(7) : 'an unknown address'}${avoid ? `; avoid ${avoid.slice(7)}` : '; no fabric restrictions on file'}.`;
  const right = /East Legon/.test(answer) && /wool/.test(answer);
  return { block, turns, snaps, rejected, answer, right, worst: Math.max(...turns.map(t => t.lat)), avg: turns.reduce((s, t) => s + t.lat, 0) / turns.length };
}

export default {
  slug: 'memory-blocks-sleep-time-compute',
  title: 'Memory blocks and sleep-time: tidy memory while nobody waits',
  description: 'A tailor\'s assistant in Accra keeps a short block of facts about a customer. A second agent tidies it between visits, so nobody waits.',
  overview: 'Letta, the successor to MemGPT, splits memory into three tiers: core (small blocks always inside the prompt), recall (the conversation history, searchable), and archival (an external store). A memory block is a typed, editable section of the core with a label, a value, a character limit and a description, so the model knows what belongs there: a Human block for facts about the user, a Persona block for the agent itself, and others such as a Task block. The agent edits blocks with tools (append, replace, read, summarise). Three problems follow. Latency: tidying memory while the user waits slows every reply. Rot: appends pile up, and contradicted facts stay (she moved, but the old address is still first in the block). Bloat: the block hits its limit and new facts are refused. Sleep-time compute moves the tidying off the critical path: a second agent runs between sessions, deduplicates, lets the newest fact win, summarises near the limit, and can be a slower, stronger model because nobody is waiting. It needs its own care: pin facts that must never be dropped, version blocks, and show the diff, or it can silently rewrite what the primary agent relies on.',
  keywords: ['memory blocks', 'sleep-time compute', 'Letta', 'agent memory', 'consolidation', 'AI agents', 'latency'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.3, 0.95, 1.25], half: 1.25, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 'sleep', pin: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', NIGHT = '#6E5FA8', GOLD = '#E3A72F';
    const KC = { name: '#B9B3A5', lives: '#5B8DB8', likes: '#7FB069', waist: '#D8B26E', event: '#A07BC0', avoid: '#E07A5F', pickup: '#3E9B9B' };
    const key = f => f.split(':')[0];
    /* the visits: a tower per reply, as tall as the customer waited; a moon between visits, where the sleep-time agent works */
    const TZ = -0.5, SX = i => -2.95 + i * 0.22;
    const slots = Array.from({ length: 13 }, (_, i) => { const t = P.tower(0.16, 0.16, GOOD, { h: 0.2 }); t.userData.set({ cap: '' }); t.position.set(SX(i), 0, TZ); S.add(t);
      const moon = P.cyl(0.1, 0.05, NIGHT); moon.position.set(SX(i), 0, TZ); S.add(moon);
      const nb = P.robot(NIGHT, { scale: 0.32 }); nb.position.set(SX(i), 0.05, TZ); S.add(nb);
      const bounce = P.box(0.13, 0.11, 0.13, RED, { r: 0.02 }); bounce.position.set(SX(i), 0, TZ + 0.3); S.add(bounce);
      return { t, moon, nb, bounce }; });
    const rail = P.box(13 * 0.22, 0.02, 0.03, '#B9B3A5', { r: 0 }); rail.position.set(SX(6), 0.8 * 0.3, TZ - 0.12); rail.layers.set(1); S.add(rail);
    /* the Human block: a rack as long as its 175-character limit; each fact a bar as long as its characters. Two bars of one colour: a contradiction. A gold pin: never dropped */
    const BZ = 0.5, BX0 = -2.95, U = 2.8 / LIMIT;
    const rack = P.box(2.86, 0.08, 0.5, '#3A3D4A', { r: 0.03 }); rack.position.set(BX0 + 1.4, 0, BZ); S.add(rack);
    const stop = P.box(0.04, 0.3, 0.5, RED, { r: 0.01 }); stop.position.set(BX0 + 2.83, 0, BZ); S.add(stop);
    const bars = Array.from({ length: 12 }, () => { const m = new THREE.MeshLambertMaterial({ color: '#fff' }), b = P.box(1, 0.18, 0.36, '#fff', { r: 0.03, material: m }); b.userData.noFit = true; S.add(b); const pin = P.cyl(0.05, 0.14, GOLD, { r2: 0 }); pin.userData.noFit = true; pin.rotation.x = Math.PI; S.add(pin); return { b, m, pin }; });
    /* delivery: two houses; the van parks at the address the block gives, carrying the fabric it chose */
    const HO = V(0.85, 0, -0.4), HE = V(2.35, 0, -0.4);
    const hO = P.station('', 1.0, 0.5, 0.75, '#C9A27A'); hO.position.copy(HO); S.add(hO);
    const hE = P.station('', 1.0, 0.5, 0.75, '#8DB0C9'); hE.position.copy(HE); S.add(hE);
    const van = new THREE.Group(); S.add(van);
    const vb = P.box(0.7, 0.32, 0.4, '#F4F1EA', { r: 0.06 }); vb.position.y = 0.08; van.add(vb);
    const cab = P.box(0.22, 0.24, 0.38, '#5B8DB8', { r: 0.05 }); cab.position.set(0.42, 0.08, 0); van.add(cab);
    for (const x of [-0.2, 0.35]) for (const z of [-0.2, 0.2]) { const w = P.cyl(0.08, 0.06, '#2C2D31'); w.rotation.x = Math.PI / 2; w.position.set(x, 0.08, z); van.add(w); }
    const rollM = new THREE.MeshLambertMaterial({ color: GOLD }), roll = P.cyl(0.09, 0.55, '#fff', { material: rollM }); roll.rotation.z = Math.PI / 2; roll.position.set(-0.05, 0.5, 0); van.add(roll);
    const lp = P.lamp(GOOD, { h: 0.4, r: 0.1 }); S.add(lp);
    S.add(P.keep(-3.15, 3.0, 1.15, -0.95, 0.95));

    let R = null;
    function draw() {
      R = run(st);
      const tl = [];
      R.turns.forEach((t, i) => { tl.push({ lat: t.lat, rej: R.rejected.includes(t.f), k: key(t.f) }); const last = i === R.turns.length - 1 || R.turns[i + 1].s !== t.s; if (last && t.s < 2) tl.push({ night: true }); });
      slots.forEach((sl, i) => { const x = tl[i]; const night = !!x && !!x.night;
        sl.t.visible = !!x && !night; sl.moon.visible = night; sl.nb.visible = night && st.mode === 'sleep'; sl.bounce.visible = !!x && !!x.rej;
        if (x && !night) sl.t.userData.set({ h: x.lat * 0.3, color: x.lat > 1 ? RED : KC[x.k] }); });
      let cx = BX0 + 0.02;
      bars.forEach((B, i) => { const v = R.block[i]; B.b.visible = !!v; B.pin.visible = !!v && st.pin && PIN.includes(key(v)); if (!v) return;
        const w = Math.max(0.05, len([v]) * U - 0.02), k = key(v), dup = k !== 'likes' && R.block.filter(x => key(x) === k).length > 1;
        B.b.scale.x = w; B.b.position.set(cx + w / 2, 0.08, BZ); B.m.color.set(KC[k] || '#ccc'); cx += w + 0.02 * 1;
        B.pin.position.set(B.b.position.x, 0.4, BZ);
        if (dup) B.b.position.y = 0.08 + (R.block.findIndex(x => key(x) === k) === i ? 0 : 0); });
      const where = R.block.find(l => l.startsWith('lives:')), avoid = R.block.find(l => l.startsWith('avoid:'));
      const H = where && /East Legon/.test(where) ? HE : HO;
      van.position.set(H.x - 0.05, 0, H.z + 0.85); rollM.color.set(avoid ? GOLD : '#9A9A9A');
      lp.position.set(H.x + 0.6, 0, H.z + 0.85); lp.userData.set({ color: R.right ? GOOD : RED, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'When memory is tidied', options: ['Never', 'While she waits', 'Between visits'], get: () => ['none', 'inline', 'sleep'].indexOf(st.mode), act: i => set({ mode: ['none', 'inline', 'sleep'][i] }) },
      { type: 'toggle', label: 'Pin safety facts when trimming', short: 'Pin', get: () => st.pin, set: v => set({ pin: !!v }) },
    ];
    const readouts = [
      { label: 'Answer', get: () => ({ v: R.right ? 'right' : 'wrong', sub: 'address and fabric', good: R.right, bad: !R.right }) },
      { label: 'Slowest reply', get: () => ({ v: `${R.worst.toFixed(1)} s`, sub: st.mode === 'inline' ? 'tidying on the critical path' : 'answering only', good: R.worst < 1, bad: R.worst > 1 }) },
      { label: 'Block', get: () => ({ v: `${len(R.block)}/${LIMIT}`, sub: `${R.block.length} lines`, bad: R.rejected.length > 0 }) },
    ];
    const labels = [
      { name: 'visits', t: 'Each reply', d: 'A tower per reply, as tall as she waited; red when memory was tidied on the spot. A moon between visits; a red cube is a fact refused', icon: 'eye', atV: V(-3.1, 0.3, TZ) },
      { name: 'block', t: 'The Human block', d: 'Always in the prompt. A bar per fact, as long as its characters, up to the red stop. Same colour twice: a contradiction. Gold pin: never dropped', icon: 'user', atV: V(-3.1, 0.3, BZ) },
      { name: 'ans', t: 'Visit 3: the delivery', d: 'Sand house: Osu, her old address. Blue house: East Legon, where she lives now. A grey roll on the van: wool, the fabric she reacts to', icon: 'check', atV: V(2.95, 0.4, -0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Never tidy the block', hint: 'appends pile up', on: () => set({ ...D0, mode: 'none' }), off: reset },
      { label: 'Tidy while the customer waits', hint: 'on the critical path', on: () => set({ ...D0, mode: 'inline' }), off: reset },
      { label: 'Let the tidier drop anything', hint: 'nothing pinned', on: () => set({ ...D0, pin: false }), off: reset },
    ];
    function status() {
      if (st.mode === 'none') return { ok: false, msg: `<b>Never tidied, the block still says "lives: Osu" above "lives: East Legon", and it filled up: ${R.rejected.length} later facts were refused${R.rejected.length ? ` (${R.rejected.join('; ')})` : ''}.</b> The assistant answers "${R.answer}" Appends pile up; contradicted facts stay. Something has to deduplicate, let the newest fact win and summarise near the limit.` };
      if (st.mode === 'inline') return { ok: R.right ? false : false, msg: `<b>Tidying during the visit gets the facts right, but the slowest reply takes ${R.worst.toFixed(1)} s instead of 0.8 s.</b> Consolidation sat on the critical path, so the customer waited while memory was rewritten. Move it to a sleep-time agent between visits, where it can even use a slower, stronger model.` };
      if (!st.pin && !R.right) return { ok: false, msg: `<b>Trimming to fit the limit, the sleep-time agent dropped "avoid: wool", and the assistant now says "${R.answer}"</b> A background rewrite the primary agent never sees can delete what matters most. Pin safety facts, version the block, and show the diff of every sleep-time pass.` };
      return { ok: true, msg: `<b>${R.answer}</b> Between visits the sleep-time agent kept one line per fact (East Legon replaced Osu, 31 in replaced 30 in), trimmed to leave room for the next visit, and the block now holds ${len(R.block)} of ${LIMIT} characters, with the wool reaction pinned. No reply waited on it: the slowest took ${R.worst.toFixed(1)} s.` };
    }
    return { update: dt => { slots.forEach(sl => { sl.t.userData.tick(dt); sl.nb.userData.tick(dt); sl.nb.userData.set({ busy: true }); }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A block about the customer', home: true, say: 'A tailor\'s assistant in Accra keeps a short block of facts about a customer, Ama Owusu. It sits in the prompt on every reply.', act: m => m.set({ mode: 'none', pin: true }) },
    { t: 'Appends pile up', home: true, say: 'During each visit the assistant jots down what it hears. She moved, but the old address is still first, and the block is filling up.', act: m => m.set({ mode: 'none' }) },
    { t: 'Tidy while she waits?', home: true, say: 'Tidying during the visit fixes the facts, but every tidy makes her wait seconds for a reply.', act: m => m.set({ mode: 'inline' }) },
    { t: 'Sleep on it', home: true, say: 'A second agent tidies between visits: one line per fact, newest wins. Nobody waits, so it can take its time.', act: m => m.set({ mode: 'sleep' }) },
    { t: 'Careful trimming', home: true, say: 'If the tidier may drop anything to fit the limit, it can drop the fabric she reacts to.', act: m => m.set({ pin: false }) },
    { t: 'Pin and diff', home: true, say: 'Pin safety facts, and show what each tidy changed. Then the answer is right, and fast.', act: m => m.set({ pin: true }) },
  ],
  check: [
    { q: 'What is a memory block?', options: ['A labelled, size-limited section of the prompt the agent can edit', 'A database table', 'A cache of model weights'], answer: 0, why: 'Human, Persona and Task blocks are the common ones.', hint: 'Look at the Human block.' },
    { q: 'Why run consolidation as sleep-time compute?', options: ['Nobody waits for it, so replies stay fast and it can use a stronger model', 'It is cheaper to skip', 'Users like to wait'], answer: 0, why: 'Off the critical path.', hint: 'Try Tidy while the customer waits.' },
    { q: 'What stops a sleep-time agent from deleting something vital?', options: ['Pinning key facts, versioning blocks and showing diffs', 'A bigger model', 'Nothing can'], answer: 0, why: 'Background rewrites must be visible and bounded.', hint: 'Try Let the tidier drop anything.' },
  ],
  terms: [
    ['Core memory', 'Small blocks always inside the prompt.'],
    ['Recall memory', 'The searchable conversation history.'],
    ['Archival memory', 'An external store for everything else.'],
    ['Memory block', 'A labelled, editable, size-limited part of core memory.'],
    ['Sleep-time compute', 'Memory work done between sessions, off the critical path.'],
    ['Pinned fact', 'A line the tidier may never remove.'],
  ],
  deeper: '<p><b>Native reasoning.</b> Newer agent runtimes drop the old send-message and heartbeat tricks: the model reasons on its own channel, and the control loop is still observe, think, act.</p><p><b>Poisoned consolidation.</b> A sleep-time agent that reads attacker-reachable text can write it into core memory, where it is trusted on every turn; treat its inputs like any untrusted content.</p><p><b>About this machine.</b> Appends, refusals at the limit, consolidation (newest per key, merged likes, trimming with or without pins) and the reply latencies are computed live.</p>',
  code: {
    title: 'Consolidate between sessions',
    note: 'Adapted from the course\'s memory-blocks lesson.',
    text: `
def consolidate(block, limit, pinned=("avoid",)):
    latest = {}
    for line in block.lines:                 # newest fact per key wins
        latest[line.key] = line
    lines = list(latest.values())
    while sum(len(l.text) for l in lines) > limit:
        drop = next((l for l in lines if l.key not in pinned), None)
        if drop is None:
            break
        lines.remove(drop)
    return block.new_version(lines)          # versioned, so the diff can be shown

def on_session_end(store, sleep_agent):
    for block in store.blocks():
        new = consolidate(block, block.limit)
        store.save(new, diff=block.diff(new))
`,
  },
};
