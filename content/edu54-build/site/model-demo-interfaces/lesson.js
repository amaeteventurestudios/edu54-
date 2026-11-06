// Model demo interfaces (phase 17, lesson 29): a Kumasi student shares a crop-disease model on the open web. A public demo is a line of gates, cheapest first: size check, token bucket, daily cap, then the model.
// A token bucket is really simulated over a burst. Logs keep no input text and no address. The learner sees the bill and the privacy risk if a gate is removed, and when a demo must become a product.
const CAP = 200, MODEL = 1;
function bucket(burst, rate, size) { let tok = size, ok = 0, no = 0; for (let t = 0; t < burst; t++) { tok = Math.min(size, tok + rate); if (tok >= 1) { tok -= 1; ok++; } else no++; } return { ok, no }; }
function run(o) {
  const hits = o.bot ? 1000 : 60, big = o.bot ? 80 : 4;
  const passed = hits - (o.size ? big : 0);
  const b = o.limit ? bucket(passed, 0.1, 20) : { ok: passed, no: 0 };
  const reach = o.cap ? Math.min(CAP, b.ok) : b.ok;
  const spent = reach * MODEL + (o.size ? 0 : big * 8);
  return { hits, reach, spent, blocked: hits - reach, leak: o.logs === 'all', users: o.users, product: o.users > 200 };
}

export default {
  slug: 'model-demo-interfaces',
  title: 'Model demos: from a function to a safe public page',
  description: 'A model in a notebook needs a page that anyone can try. Add limits in the right order, and keep it from costing you dearly.',
  overview: 'Your model works in a notebook, and someone wants to try ten inputs on a phone. A demo is a small contract: what comes in, what the model does, what goes out, with a limit on each. Run the checks in order of cost, so that a too-large file is refused before any model runs. Public means strangers, so protect it: a token bucket per client, a daily cap on total use, and if needed an access token. Errors should tell the user what to do next. Logs keep timing and status, not input text or addresses. And know the signals that a demo has become a product, as people start to depend on it.',
  keywords: ['model demo', 'Gradio', 'token bucket', 'rate limiting', 'server-sent events', 'privacy'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.68, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v * 0.01);
    const D0 = { size: true, limit: true, cap: true, logs: 'none', bot: false, users: 30 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const b = add(P.belt(V(-2.4, 0, 0.3), V(1.05, 0, 0.3), { w: 0.32, speed: 1.5 }));
    const XS = [-1.5, -0.6, 0.3], G = XS.map((x, i) => { const l = add(P.lamp(GOOD, { h: 0.5, r: 0.1 })); l.position.set(x, 0.03, -0.05); const f = P.box(0.08, 0.5, 0.5, '#6B6E7E', { r: 0.01 }); f.position.set(x, 0.03, 0.3); S.add(f); return { l, f }; });
    const bot = add(P.robot(BLUE, { scale: 0.85 })); bot.position.set(1.4, 0.03, 0.25);
    const jar = add(P.jar(0.28, 0.8, { max: 14 })); jar.position.set(2.15, 0.03, 0.2);
    const log = add(P.stack(0.5, 0.36, 0.09, { max: 6 })); log.position.set(1.4, 0.03, -0.45);
    S.add(P.keep(-2.5, 2.5, 1.1, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      [st.size, st.limit, st.cap].forEach((on, i) => { G[i].l.userData.set({ color: on ? '#3E9B5F' : '#C9C4B6', on: !!on }); G[i].f.visible = !!on; });
      jar.userData.set({ n: Math.min(14, Math.ceil(R.spent / 60)) });
      log.userData.set({ n: 4, colors: Array(6).fill(R.leak ? '#D9483B' : '#D8D2C4') });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const LK = ['none', 'all'];
    const controls = [
      { type: 'toggle', label: 'Refuse oversized input first', short: 'Size check', get: () => st.size, set: v => set({ size: !!v }) },
      { type: 'toggle', label: 'Token bucket per client', short: 'Rate limit', get: () => st.limit, set: v => set({ limit: !!v }) },
      { type: 'toggle', label: 'Daily cap on total use', short: 'Daily cap', get: () => st.cap, set: v => set({ cap: !!v }) },
      { type: 'buttons', label: 'Logs keep', options: ['Status and time', 'Text and address'], get: () => LK.indexOf(st.logs), act: i => set({ logs: LK[i] }) },
      { type: 'toggle', label: 'A scraper finds the page', short: 'Scraper', get: () => st.bot, set: v => set({ bot: !!v }) },
      { type: 'slider', label: 'People who rely on it each week', min: 5, max: 500, step: 5, get: () => st.users, set: v => set({ users: v }) },
    ];
    const readouts = [
      { label: 'Requests reaching the model', get: () => ({ v: `${R.reach}`, sub: `of ${R.hits} today`, good: R.reach <= CAP, bad: R.reach > CAP }) },
      { label: 'Cost today', get: () => ({ v: M(R.spent), sub: 'model time', good: R.spent <= CAP, bad: R.spent > CAP * 2 }) },
      { label: 'Logs', get: () => ({ v: R.leak ? 'personal data' : 'clean', sub: R.leak ? 'farmers\' photos and addresses' : 'status and timing only', good: !R.leak, bad: R.leak }) },
    ];
    const labels = [
      { name: 'g', t: 'Gates, cheapest first', d: 'Size, rate, daily cap', icon: 'check', atV: V(-1.62, 0.6, -0.05) },
      { name: 'j', t: 'What today costs', d: 'Every call that gets through', icon: 'money', atV: V(2.4, 0.5, 0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No limits on a public page', hint: 'a scraper finds it', on: () => set({ ...D0, bot: true, limit: false, cap: false }), off: reset },
      { label: 'Run the model before checking size', hint: 'huge files reach it', on: () => set({ ...D0, size: false, bot: true }), off: reset },
      { label: 'Log everything to debug', hint: 'text and addresses', on: () => set({ ...D0, logs: 'all' }), off: reset },
      { label: 'Keep calling it a demo', hint: 'hundreds rely on it', on: () => set({ ...D0, users: 400 }), off: reset },
    ];
    function status() {
      if (st.bot && !st.limit && !st.cap) return { ok: false, msg: `<b>${R.reach} requests reached the model, costing ${M(R.spent)} in a day.</b> Public means strangers and scrapers. A per-client bucket slows one caller, and a daily cap sets the most it can ever cost.` };
      if (!st.size && st.bot) return { ok: false, msg: `<b>Oversized files reached the model and cost ${M(R.spent)}.</b> Validate in order of cost: the check that takes a microsecond goes first.` };
      if (R.leak) return { ok: false, msg: '<b>The log now holds photos of farms, with addresses beside them.</b> A demo\'s logs get shared, and nobody agreed to that. Keep timing, status and sizes.' };
      if (R.product) return { ok: false, msg: `<b>${st.users} people rely on this each week.</b> It has become a product without an owner, support or an uptime promise. Move it deliberately, or tell people plainly it may vanish.` };
      return { ok: true, msg: `<b>${R.reach} of ${R.hits} requests reached the model, for ${M(R.spent)}.</b> Cheap checks ran first, and a refused request was told what to do next.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > (st.bot ? 0.3 : 0.8) && b.userData.count() < 7) { u = 0; b.userData.send('#F4F1EA', { size: 0.15 }); } },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Out of the notebook', home: true, say: 'A student in Kumasi trains a crop-disease model. A reviewer wants to try it on a phone, so it needs a small page.', act: m => m.set({ size: true, limit: true, cap: true, logs: 'none', bot: false, users: 30 }) },
    { t: 'Cheapest check first', home: true, say: 'A contract sets limits on input, model and output. A too-large photo is refused before any model runs.', act: m => m.set({ size: false, limit: true, cap: true, logs: 'none', bot: true, users: 30 }) },
    { t: 'Strangers', home: true, say: 'Public means scrapers too. With no limits, one script spends the whole budget.', act: m => m.set({ size: true, limit: false, cap: false, logs: 'none', bot: true, users: 30 }) },
    { t: 'Bucket and cap', home: true, say: 'A token bucket slows each client, and a daily cap fixes the worst day. Now a scraper is only a nuisance.', act: m => m.set({ size: true, limit: true, cap: true, logs: 'none', bot: true, users: 30 }) },
    { t: 'Clean logs', home: true, say: 'Keep status and timing. Don\'t keep people\'s photos or addresses, even to debug.', act: m => m.set({ size: true, limit: true, cap: true, logs: 'all', bot: false, users: 30 }) },
    { t: 'When it\'s a product', home: true, say: 'When hundreds depend on it, it isn\'t a demo any more. Give it an owner, or tell people it may vanish.', act: m => m.set({ size: true, limit: true, cap: true, logs: 'none', bot: false, users: 400 }) },
  ],
  check: [
    { q: 'In what order should a demo validate requests?', options: ['Cheapest check first', 'Model first', 'Any order'], answer: 0, why: 'Refuse bad input before it costs anything.', hint: 'Try Run the model before checking size.' },
    { q: 'What does a daily cap give you?', options: ['A limit on the worst possible day', 'Faster replies', 'Better accuracy'], answer: 0, why: 'A bucket slows each client; a cap limits the total.', hint: 'Try No limits on a public page.' },
    { q: 'What should demo logs keep?', options: ['Status and timing', 'Input text and addresses', 'Everything'], answer: 0, why: 'Logs travel, and nobody agreed to share their data.', hint: 'Try Log everything to debug.' },
  ],
  terms: [
    ['Demo contract', 'Input, model call and output, with limits.'],
    ['Token bucket', 'A rate limit that allows short bursts.'],
    ['Daily cap', 'A limit on total use in a day.'],
    ['Server-sent events', 'A way to stream text to a page.'],
    ['Access token', 'A secret that limits who can use it.'],
    ['Actionable error', 'An error that says what to do next.'],
  ],
  deeper: '<p><b>Frameworks or plain code.</b> Tools such as Gradio and Streamlit are quick. A small standard-library server shows what they do for you, and gives you control over limits.</p><p><b>Stream it.</b> Text shows up as it is generated, which feels faster.</p><p><b>This run.</b> The token bucket is really simulated per request. Prices are round.</p>',
  code: {
    title: 'Gates in order of cost',
    note: 'Adapted from the course\'s standard library demo (code/main.py).',
    text: `
def handle(request):
    if len(request.body) > MAX_BYTES:
        return error(413, "Photo too large. Use one under 5 MB.")
    if not buckets[client_id(request)].take():
        return error(429, "Too many tries. Wait a minute.")
    if usage.today() >= DAILY_CAP:
        return error(503, "Today's limit is used up. Try tomorrow.")
    result = model(parse(request.body))
    log(status=200, ms=elapsed(), size=len(request.body))    # no text, no address
    return ok(result)
`,
  },
};
