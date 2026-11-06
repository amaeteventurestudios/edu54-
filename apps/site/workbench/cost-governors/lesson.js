// Cost governors (phase 15, lesson 13): a Johannesburg shop's support agent runs for a day, hour by hour. Pick a failure (a runaway retry loop
// at 10:00, a slow leak doing twice the work, a bad release using five times the tokens from 14:00, or a real evening surge) and a stack of
// limits at different time scales: a per-task budget with a turn cap, a velocity limit, an early-warning alert and a daily cap, plus caching and
// model routing to lower the baseline. Spend, what fires when and who loses service are computed live, in the learner's currency.
const BASE = 2, REDUCE = 0.6 * 0.7, LOOP = 40, TASK_CAP = 2, VEL_MIN = 10, DAY_CAP = 80, ALERT = 1.5;
function day(o) {
  const b = BASE * (o.reduce ? REDUCE : 1), expected = b * 24;
  const hours = [], fired = [];
  let total = 0, cutFrom = null, loopOn = o.fail === 'loop', alertAt = null;
  for (let h = 0; h < 24; h++) {
    let base = b * (o.fail === 'leak' ? 2 : o.fail === 'release' && h >= 14 ? 5 : o.fail === 'surge' && h >= 18 && h < 21 ? 3 : 1), extra = 0;
    if (loopOn && h >= 10) {
      if (o.task) { extra = TASK_CAP; loopOn = false; fired.push(['per-task budget', '10:03', 'stopped the looping session']); }
      else if (o.vel) { extra = LOOP * VEL_MIN / 60; loopOn = false; fired.push(['velocity limit', '10:10', 'cut the session']); }
      else extra = LOOP;
    }
    if (cutFrom !== null) { hours.push({ h, base: 0, extra: 0, cut: true }); continue; }
    if (o.day && total + base + extra > DAY_CAP) {
      const part = Math.max(0, DAY_CAP - total), f = part / (base + extra);
      hours.push({ h, base: base * f, extra: extra * f, cut: false, partial: true }); total = DAY_CAP; cutFrom = h;
      fired.push(['daily cap', `${String(h).padStart(2, '0')}:${String(Math.round(f * 60) % 60).padStart(2, '0')}`, 'agent off for everyone']); continue;
    }
    total += base + extra; hours.push({ h, base, extra, cut: false });
    if (o.alert && alertAt === null && total > expected * ALERT) { alertAt = h; fired.push(['spend alert', `${String(h).padStart(2, '0')}:00`, 'a person is paged']); }
  }
  return { hours, fired, total, cutFrom, expected, alertAt };
}

export default {
  slug: 'cost-governors',
  title: 'Cost governors: a stack of limits, not one cap',
  description: 'A shop in Johannesburg runs a support agent all day. Pick what goes wrong and which limits are on, and watch the day\'s spend hour by hour.',
  overview: 'Autonomous agents spend money on every turn. A chatbot\'s bad output is a bad reply; an agent\'s bad loop is a bill. The industry has a name for it, denial of wallet: the agent keeps reasoning, calling tools and billing, and nothing stops it because nothing was designed to. The fix is not one number but a stack of limits at different time scales. Per request, a cap on output tokens. Per task, a token or money budget and a turn cap (Claude Code\'s max_turns and max_budget_usd), plus caps on calls to particular tools. Velocity limits: if spend passes a threshold within ten minutes, cut that session. Rolling hourly, daily and monthly caps, and alerts when spend runs ahead of what was expected. Then reduce the baseline: route routine work to a smaller model and escalate only when needed, cache the stable system prompt, and compact the context. Put a person in front of known-expensive actions, and make any breached cap a kill switch that needs a deliberate re-enable. Why a stack? Each failure shows at a different speed. A runaway loop burns in minutes and only a per-task budget or velocity limit catches it in time; a daily cap alone would let it spend the whole day\'s budget and then shut the agent off for every customer. A slow leak doing twice the work is invisible per task and shows up in a daily alert. A bad release surfaces over a day or a week. A real surge should be served, with the logs to show it was real.',
  keywords: ['cost control', 'budgets', 'denial of wallet', 'rate limits', 'AI agents', 'LLM costs', 'governance'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.55, -0.55], dir: [0.05, 0.6, 1.2], half: 1.0, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { fail: 'loop', task: true, vel: true, alert: true, day: true, reduce: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const HX = h => -2.4 + h * 0.15, HZ = -0.55, HS = 0.07;
    const bars = Array.from({ length: 24 }, (_, h) => {
      const bm = new THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.11, 1, 0.24, GOOD, { r: 0.01, material: bm }); b.position.set(HX(h), 0.02, HZ); b.userData.noFit = true; S.add(b);
      const e = P.box(0.11, 1, 0.24, BAD, { r: 0.01 }); e.position.set(HX(h), 0.02, HZ); e.userData.noFit = true; S.add(e);
      return { bm, b, e };
    });
    const floor = P.box(3.75, 0.02, 0.4, '#D8D2C4', { r: 0.03 }); floor.position.set(HX(11.5), 0, HZ); S.add(floor);
    const flags = Array.from({ length: 3 }, () => { const p = P.box(0.02, 1.25, 0.02, RED, { r: 0.005 }); p.userData.noFit = true; S.add(p); const k = P.ball(0.05, RED); k.userData.noFit = true; S.add(k); return { p, k }; });
    const GOV = [['task', 'per-task budget, turn cap'], ['vel', 'velocity limit'], ['alert', `alert at ${ALERT}× a normal day`], ['day', 'daily cap'], ['reduce', 'caching and routing']];
    const gstack = P.stack(0.8, 0.6, 0.18, { max: 5 }); gstack.position.set(2.0, 0, HZ); S.add(gstack);
    S.add(P.keep(-2.55, 2.45, 1.4, HZ - 0.35, HZ + 0.35));
    const FAIL = { none: 'a normal day', loop: 'a retry loop from 10:00', leak: 'a slow leak: twice the work all day', release: 'a bad release at 14:00: five times the tokens', surge: 'a real evening rush, 18:00 to 21:00' };

    let R = null;
    function draw() {
      R = day(st);
      R.hours.forEach((x, h) => {
        const B = bars[h], bh = Math.min(1.2, x.base * HS), eh = Math.min(1.2 - bh, x.extra * HS);
        B.b.scale.y = Math.max(0.004, bh); B.e.scale.y = Math.max(0.001, eh); B.e.position.y = 0.02 + bh; B.e.visible = x.extra > 0.01;
        B.bm.color.set(x.cut ? '#C9C4B8' : GOOD); if (x.cut) B.b.scale.y = 0.03;
      });
      flags.forEach((F, k) => {
        const f = R.fired[k], on = !!f; F.p.visible = on; F.k.visible = on; if (!on) return;
        const hh = +f[1].slice(0, 2) + +f[1].slice(3) / 60, x = HX(Math.min(23, hh));
        F.p.position.set(x, 0.02, HZ - 0.17); F.k.position.set(x, 1.27 - k * 0.0, HZ - 0.17);
      });
      const FN = { task: 'per-task budget', vel: 'velocity limit', alert: 'spend alert', day: 'daily cap' };
      gstack.userData.set({ n: 5, colors: GOV.map(([id]) => !st[id] ? '#D8D2C4' : R.fired.find(x => x[0] === FN[id]) ? SAF : '#5B8DB8') });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const FK = ['none', 'loop', 'leak', 'release', 'surge'];
    const controls = [
      { type: 'toggle', label: 'Per-task budget and turn cap', short: 'Per task', get: () => st.task, set: v => set({ task: !!v }) },
      { type: 'toggle', label: 'Velocity limit on a session\'s ten-minute burn', short: 'Velocity', get: () => st.vel, set: v => set({ vel: !!v }) },
      { type: 'toggle', label: 'Alert when spend runs ahead of the expected day', short: 'Alert', get: () => st.alert, set: v => set({ alert: !!v }) },
      { type: 'toggle', label: 'Daily cap', short: 'Daily cap', get: () => st.day, set: v => set({ day: !!v }) },
      { type: 'toggle', label: 'Prompt caching and routing to a smaller model', short: 'Cheaper baseline', get: () => st.reduce, set: v => set({ reduce: !!v }) },
      { type: 'buttons', label: 'What goes wrong', options: ['Nothing', 'Retry loop', 'Slow leak', 'Bad release', 'Real rush'], get: () => FK.indexOf(st.fail), act: i => set({ fail: FK[i] }) },
    ];
    const readouts = [
      { label: 'Spent today', get: () => ({ v: M(R.total), sub: `normal: ${M(R.expected)}`, good: R.total <= R.expected * 1.3, bad: R.total > DAY_CAP * 1.5 }) },
      { label: 'Agent off from', get: () => ({ v: R.cutFrom === null ? 'never' : `${String(R.cutFrom).padStart(2, '0')}:00`, sub: R.cutFrom === null ? 'served all day' : 'for every customer', good: R.cutFrom === null, bad: R.cutFrom !== null }) },
      { label: 'First to fire', get: () => ({ v: R.fired.length ? R.fired[0][0] : 'none', sub: R.fired.length ? R.fired[0][1] : '' }) },
    ];
    const labels = [
      { name: 'day', t: 'The day, hour by hour', d: 'Coral: the failure. Grey: agent off', icon: 'wave', atV: V(-2.5, 0.15, HZ - 0.15) },
      { name: 'gov', t: 'The governor stack', d: 'Blue: armed. Gold: fired', icon: 'money', atV: V(2.4, 0.15, HZ + 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Rely on one monthly cap', hint: 'nothing faster', on: () => set({ ...D0, task: false, vel: false, alert: false, day: false }), off: reset },
      { label: 'Daily cap with nothing faster', hint: 'the loop spends the day', on: () => set({ ...D0, task: false, vel: false }), off: reset },
      { label: 'Switch off caching and routing', hint: 'a normal day', on: () => set({ ...D0, fail: 'none', reduce: false }), off: reset },
    ];
    function status() {
      const f = st.fail;
      if (f === 'loop' && !st.task && !st.vel && !st.day) return { ok: false, msg: `<b>With nothing faster than a monthly cap, the retry loop burned from 10:00 to midnight: ${M(R.total)} in one day, against ${M(R.expected)} for a normal one.</b> The monthly cap fires after the money is gone. A per-task budget or a velocity limit stops a loop within minutes.` };
      if (f === 'loop' && !st.task && !st.vel) return { ok: false, msg: `<b>The daily cap stopped the loop, but only after it had spent the whole day\'s ${M(DAY_CAP)}, and then the agent was off for every customer from ${String(R.cutFrom).padStart(2, '0')}:00.</b> One stuck session took down the service. Catch loops per task or by velocity; keep the daily cap for leaks.` };
      if (!st.reduce && f === 'none') return { ok: false, msg: `<b>Without caching and routing, a normal day costs ${M(R.expected)} instead of ${M(day({ ...st, reduce: true }).expected)}: every call goes to the large model and re-sends the same system prompt.</b> Route routine work to a smaller model, escalate when needed, and cache the stable prompt.` };
      if (f === 'leak' || f === 'release') return { ok: !!st.alert, msg: st.alert ? `<b>${f === 'leak' ? 'Twice the work per task is invisible to per-task and velocity limits' : 'Five times the tokens per call never trips a velocity limit'}; the alert paged a person at ${String(R.alertAt).padStart(2, '0')}:00, when spend passed ${ALERT}× the expected day${R.cutFrom !== null ? `, and the daily cap stopped it at ${String(R.cutFrom).padStart(2, '0')}:00` : ''}.</b> Slow failures need slow, wide limits.` : `<b>${f === 'leak' ? 'The slow leak' : 'The bad release'} ran unnoticed${R.cutFrom !== null ? ` until the daily cap shut the agent off at ${String(R.cutFrom).padStart(2, '0')}:00` : ''}: ${M(R.total)} today.</b> An alert on spend running ahead of the expected day gets a person looking hours earlier.` };
      if (f === 'surge') return { ok: R.cutFrom === null, msg: R.cutFrom === null ? `<b>A real rush from 18:00 tripled spend for three hours, and no limit fired: ${M(R.total)} for the day, every customer served.</b> Per-task and velocity limits watch sessions, not traffic, so real demand gets through, with logs to show it was real.` : `<b>The daily cap cut the agent off during a real rush.</b> Size it with room for legitimate surges.` };
      if (f === 'loop') return { ok: true, msg: `<b>The retry loop started at 10:00 and the ${R.fired[0][0]} stopped it at ${R.fired[0][1]}: ${M(R.total)} for the whole day, and every other customer served.</b> ${st.task ? 'A per-task budget and turn cap catch a runaway session within minutes.' : 'The velocity limit caught it in ten minutes.'} The daily cap and alert stayed armed for slower failures.` };
      return { ok: true, msg: `<b>A normal day: ${M(R.total)}, with every limit armed and none fired.</b>` };
    }
    return { update: () => {}, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A day of spend', home: true, say: 'A shop in Johannesburg runs a support agent all day. Each bar is an hour of spend.', act: m => m.set({ fail: 'none', task: true, vel: true, alert: true, day: true, reduce: true }) },
    { t: 'A runaway loop', home: true, say: 'At ten, one session gets stuck retrying. With only a monthly cap, it burns until midnight.', act: m => m.set({ fail: 'loop', task: false, vel: false, alert: false, day: false, reduce: true }) },
    { t: 'Too slow a limit', home: true, say: 'A daily cap stops it, but only after the day\'s budget is gone, and then the agent is off for everyone.', act: m => m.set({ fail: 'loop', task: false, vel: false, alert: true, day: true, reduce: true }) },
    { t: 'Fast limits for fast failures', home: true, say: 'A per-task budget stops the stuck session within minutes. Everyone else is served.', act: m => m.set({ fail: 'loop', task: true, vel: true, alert: true, day: true, reduce: true }) },
    { t: 'Slow failures', home: true, say: 'A bad release uses five times the tokens. No session looks wrong; an alert on the day\'s spend gets a person looking.', act: m => m.set({ fail: 'release', task: true, vel: true, alert: true, day: true, reduce: true }) },
    { t: 'A stack, not one cap', home: true, say: 'Limits at every speed, a lower baseline from caching and routing, and room for real demand.', act: m => m.set({ fail: 'surge', task: true, vel: true, alert: true, day: true, reduce: true }) },
  ],
  check: [
    { q: 'Which limit stops a runaway retry loop soonest?', options: ['A per-task budget or velocity limit', 'A monthly cap', 'A daily cap'], answer: 0, why: 'Fast failures need fast limits.', hint: 'Try Rely on one monthly cap.' },
    { q: 'Why is a daily cap alone a poor answer to a loop?', options: ['The loop spends the day\'s budget, then the agent stops for everyone', 'It never fires', 'It is too cheap'], answer: 0, why: 'One session takes down the service.', hint: 'Try Daily cap with nothing faster.' },
    { q: 'What catches a slow leak doing twice the work per task?', options: ['An alert on spend against the expected day', 'A per-task budget', 'A turn cap'], answer: 0, why: 'Each task looks normal; the day doesn\'t.', hint: 'Choose Slow leak.' },
  ],
  terms: [
    ['Denial of wallet', 'An agent that keeps spending because nothing stops it.'],
    ['Per-task budget', 'A cap on tokens or money for one run.'],
    ['Turn cap', 'A limit on loop iterations, such as max_turns.'],
    ['Velocity limit', 'Cut a session that spends too fast in a short window.'],
    ['Model routing', 'Send routine work to a smaller model; escalate when needed.'],
    ['Prompt caching', 'Reuse a stable prompt prefix so it isn\'t paid for again.'],
  ],
  deeper: '<p><b>A breach is a kill switch.</b> When a cap fires, the session aborts and stays off until someone re-enables it deliberately; the next lesson covers kill switches.</p><p><b>Per-tool caps.</b> Limit calls to expensive tools, like web fetches or large downloads, and ask a person before known-expensive actions.</p><p><b>About this machine.</b> Rates, budgets and the failure shapes are illustrative, set in US dollars and shown in your currency; the hour-by-hour spend and which limit fires are computed live.</p>',
  code: {
    title: 'A governor stack',
    note: 'Adapted from the course\'s cost-governor sketch (code/main.py).',
    text: `
class Governor:
    def __init__(self, task_usd, max_turns, velocity_usd_10min, day_usd, alert_ratio):
        self.limits = dict(task=task_usd, turns=max_turns, vel=velocity_usd_10min,
                           day=day_usd, alert=alert_ratio)

    def check(self, session, ledger, expected_day):
        if session.spend > self.limits["task"] or session.turns > self.limits["turns"]:
            return kill(session, "per-task budget")            # minutes
        if ledger.window(minutes=10, session=session) > self.limits["vel"]:
            return kill(session, "velocity limit")
        if ledger.today() > self.limits["alert"] * expected_day:
            page_human("spend ahead of the expected day")      # hours
        if ledger.today() > self.limits["day"]:
            return kill_all("daily cap")                       # last resort
`,
  },
};
