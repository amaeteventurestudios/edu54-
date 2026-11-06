// Build it yourself: a workspace chat bot (after How to Build Your First Slack Bot, code MIT; our own words). A Kumasi cocoa co-op's team chat. A real event loop reads messages, filters mentions, ignores the bot's own messages, routes commands and replies. The event stream has duplicates and a loop trap.
const EV = [{ id: 1, user: 'ama', text: 'good morning all' }, { id: 2, user: 'kofi', text: '@bot price board' }, { id: 3, user: 'kofi', text: '@bot price board' , dup: 2 }, { id: 4, user: 'ama', text: '@bot help' }, { id: 5, user: 'esi', text: '@bot dance' }];
const CMD = { help: () => 'I know: help, board', 'price board': () => 'Board updated at noon', board: () => 'Board updated at noon' };
function run(o) {
  const q = EV.map(e => ({ ...e })), res = EV.map(() => 'skip'), seen = new Set(); let sent = 0, loops = 0, late = 0, i = 0;
  while (i < q.length && sent < 12) {
    const e = q[i], k = i < EV.length ? i : -1; i++;
    if (e.user === 'bot' && o.self) continue;
    if (o.dedupe && e.dup && seen.has(e.dup)) { res[k] = 'dup'; continue; } seen.add(e.id);
    const men = e.user === 'bot' ? true : !o.mention || e.text.startsWith('@bot');
    if (!men) continue;
    const c = e.text.replace('@bot ', ''), f = CMD[c], r = f ? f() : (o.fallback ? 'Sorry, try help' : null);
    if (o.slow && c.includes('price')) { late++; if (k >= 0) res[k] = 'late'; }
    if (r) { sent++; if (k >= 0 && res[k] !== 'late') res[k] = f ? 'reply' : 'fallback'; if (!o.self) { q.push({ id: 100 + sent, user: 'bot', text: `@bot ${r}` }); loops++; } } else if (k >= 0) res[k] = 'silent';
  }
  return { res, sent, loops, late, bad: sent >= 12 };
}

export default {
  slug: 'build-a-chat-bot',
  title: 'Build your own chat bot',
  description: 'Read events, filter, route, reply. The bugs live in the events you should have ignored.',
  overview: 'A team chat bot is a loop over events. Each message arrives, and the bot decides if it\'s meant for it, finds the right command, and posts a reply. That\'s a few lines. The care goes into what you ignore. A bot sees its own messages, so it can answer itself forever. Delivery is at least once, so the same event can arrive twice. Slow work must be acknowledged quickly and done afterwards, or the platform retries. And an unknown command needs a helpful reply, not silence. This real loop runs on five events for a cocoa co-op in Kumasi.',
  keywords: ['chat bot', 'Slack', 'events', 'webhooks', 'idempotency', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.06, 0.75, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { mention: true, self: true, dedupe: true, fallback: true, slow: false }, st = { ...D0 };
    const C = { skip: '#CFC9BA', reply: '#1F9E89', fallback: '#F2AE0C', dup: '#5B8DB8', silent: '#E07A5F', late: '#B5462F' }, ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.75;
    const T = EV.map((e, i) => { const m = new S.THREE.MeshLambertMaterial({ color: C.skip }), b = P.box(0.58, 0.14, 0.7, '#fff', { r: 0.04, material: m }); b.position.set(X(i), 0.03, -0.05); S.add(b); return { b, m }; });
    const rob = add(P.robot('#7B6FA8', { scale: 0.45 })); rob.position.set(2.0, 0.03, -0.05);
    S.add(P.keep(-2.3, 2.4, 0.8, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach(({ b, m }, i) => { const k = R.res[i]; m.color.set(C[k]); b.scale.y = k === 'skip' ? 1 : 2.4; }); rob.userData.set({ busy: !!R.bad }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('mention', 'Only when mentioned', 'Mentions'), tg('self', 'Ignore its own messages', 'Self'), tg('dedupe', 'Drop repeated events', 'Dedupe'), tg('fallback', 'Reply to unknown commands', 'Fallback'), tg('slow', 'Do slow work before replying', 'Slow')];
    const readouts = [
      { label: 'Replies sent', get: () => ({ v: R.bad ? '12, and rising' : `${R.sent}`, good: R.sent === 3 && !R.bad, bad: R.bad || R.sent > 3 }) },
      { label: 'Events', get: () => ({ v: `${R.res.filter(r => r === 'skip').length} ignored`, sub: `${R.res.filter(r => r === 'dup').length} repeated` }) },
      { label: 'Timed out', get: () => ({ v: `${R.late}`, good: !R.late, bad: R.late > 0 }) },
    ];
    const labels = [
      { name: 'e', t: 'Five events', d: 'Raised: the bot acted', icon: 'wave', atV: V(X(0) - 0.3, 0.1, -0.05) },
      { name: 'b', t: 'The bot', d: 'Reads, filters, replies', icon: 'user', atV: V(2.2, 0.25, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Answer itself', hint: 'a loop with no end', on: () => set({ ...D0, self: false, mention: false }), off: reset },
      { label: 'No dedupe', hint: 'the same reply twice', on: () => set({ ...D0, dedupe: false }), off: reset },
      { label: 'Stay silent', hint: 'unknown means no reply', on: () => set({ ...D0, fallback: false }), off: reset },
      { label: 'Slow reply', hint: 'the platform retries', on: () => set({ ...D0, slow: true }), off: reset },
    ];
    function status() {
      if (R.bad) return { ok: false, msg: '<b>Twelve replies, and it\'s still going.</b> It read its own message as a command. Ignore your own events.' };
      if (st.slow) return { ok: false, msg: '<b>An event timed out, so the platform will send it again.</b> Acknowledge at once, and do the slow work afterwards.' };
      if (!st.dedupe) return { ok: false, msg: `<b>${R.sent} replies to three requests.</b> Delivery is at least once, so remember event ids.` };
      if (!st.fallback) return { ok: false, msg: '<b>"dance" got no reply.</b> Silence looks broken. Say what the bot can do.' };
      if (!st.mention) return { ok: false, msg: `<b>${R.sent} replies, and it answers people who weren\'t talking to it.</b>` };
      return { ok: true, msg: `<b>${R.sent} replies, one repeated event dropped, one chat ignored.</b> The work here lies in what it doesn\'t do.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A loop of events', home: true, say: 'A cocoa co-op in Kumasi adds a bot to its team chat. It\'s a loop over events.', act: m => m.set({ mention: true, self: true, dedupe: true, fallback: true, slow: false }) },
    { t: 'Is it for me?', home: true, say: 'Most messages aren\'t for the bot. It only acts when mentioned.', act: m => m.set({ mention: false, self: true, dedupe: true, fallback: true, slow: false }) },
    { t: 'Not myself', home: true, say: 'A bot sees its own messages. Ignore them, or it talks forever.', act: m => m.set({ mention: false, self: false, dedupe: true, fallback: true, slow: false }) },
    { t: 'Twice', home: true, say: 'One event can arrive twice, so keep a list of what you\'ve seen.', act: m => m.set({ mention: true, self: true, dedupe: false, fallback: true, slow: false }) },
    { t: 'Answer quickly', home: true, say: 'Acknowledge first, and do slow work afterwards.', act: m => m.set({ mention: true, self: true, dedupe: true, fallback: true, slow: true }) },
    { t: 'Helpful', home: true, say: 'An unknown command gets a hint, not silence.', act: m => m.set({ mention: true, self: true, dedupe: true, fallback: true, slow: false }) },
  ],
  check: [
    { q: 'Why ignore the bot\'s own messages?', options: ['It would answer itself forever', 'To save money', 'For privacy'], answer: 0, why: 'It\'s a loop.', hint: 'Try Answer itself.' },
    { q: 'Why remember event ids?', options: ['Delivery can repeat', 'For search', 'For speed'], answer: 0, why: 'At least once means duplicates.', hint: 'Try No dedupe.' },
    { q: 'What should slow work do?', options: ['Happen after a quick acknowledgement', 'Block the reply', 'Be skipped'], answer: 0, why: 'Or the platform retries.', hint: 'Try Slow reply.' },
  ],
  terms: [['Event', 'One thing that happened.'], ['Mention', 'Naming the bot.'], ['At-least-once', 'An event may repeat.'], ['Acknowledge', 'Saying that you got it.']],
  deeper: '<p><b>Real loop.</b> This runs live on five invented events. It doesn\'t connect to any chat service.</p><p><b>Tokens.</b> Keep a real bot\'s token out of your code.</p>',
  credit: 'Built from the code of <a href="https://www.fullstackpython.com/blog/build-first-slack-bot-python.html" target="_blank" rel="noopener">How to Build Your First Slack Bot with Python</a> by Matt Makai (code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short event loop, written for this lesson.',
  code: {
    title: 'The handler',
    note: 'Our own short version.',
    text: `
function onEvent(e) {
  if (e.user === BOT_ID) return;
  if (seen.has(e.id)) return;
  seen.add(e.id);
  if (!e.text.startsWith("@bot ")) return;
  const run = commands[e.text.slice(5)];
  post(e.channel, run ? run() : "Sorry, try help");
}
`,
  },
};
