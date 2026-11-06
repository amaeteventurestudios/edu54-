// Self-Refine and CRITIC: a Kano cassava co-op's assistant drafts an SMS notice (at most 3 lines of 60 characters, facts from the co-op calendar).
// Each round: critique, then refine using the critique (and, with history, every earlier critique), until the verifier passes or the budget runs out.
// The self-critic checks only what it can see (line count, line length). CRITIC adds a tool call to the calendar, which catches the wrong day.
// Refine actions are real string edits: merge the shortest neighbouring lines, split a long line at a word, drop filler words, replace a wrong fact.
// Without history the refiner splits long lines and merges extra lines and oscillates; with history it drops filler instead of splitting.
const CAL = { day: 'Wednesday', time: '7 am', place: 'Sabon Gari gate' };
const DRAFT = ['Kano cassava co-op: please note that pickup moves to Thursday', 'at 7 am at the Sabon Gari gate, as usual.', 'Kindly bring your member card.', 'Late loads wait for next week.'];
const FILLER = ['please note that ', 'Kindly b', ', as usual'];
const FILL_TO = ['', 'B', ''];
function issues(lines, o) {
  const out = [];
  if (lines.length > 3) out.push({ k: 'lines', msg: `${lines.length} lines, the limit is 3` });
  lines.forEach((l, i) => { if (l.length > 60) out.push({ k: 'long', i, msg: `line ${i + 1} is ${l.length} characters, the limit is 60` }); });
  if (o.critic) { const t = lines.join(' '); const m = t.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/); if (m && m[1] !== CAL.day) out.push({ k: 'fact', from: m[1], to: CAL.day, msg: `calendar says pickup is ${CAL.day}, not ${m[1]}` }); }
  return out;
}
function shorten(l) { for (let f = 0; f < FILLER.length; f++) if (l.includes(FILLER[f])) return l.replace(FILLER[f], FILL_TO[f]); return null; }
function refine(lines, iss, hist, o) {
  let L = lines.slice();
  const seen = new Set(o.history ? hist.flat().map(x => x.k) : []);
  iss.forEach(x => {
    if (x.k === 'fact') L = L.map(l => l.replace(x.from, x.to));
    if (x.k === 'long' && L[x.i]) {
      const s = shorten(L[x.i]);
      if (o.history && seen.has('lines') && s) L[x.i] = s;
      else if (o.history && s && L.length >= 3) L[x.i] = s;
      else { const w = L[x.i].split(' '), mid = Math.ceil(w.length / 2); L.splice(x.i, 1, w.slice(0, mid).join(' '), w.slice(mid).join(' ')); }
    }
  });
  if (iss.some(x => x.k === 'lines')) {
    while (L.length > 3) {
      let best = -1, bl = Infinity; for (let i = 0; i + 1 < L.length; i++) { const n = L[i].length + 1 + L[i + 1].length; if (n < bl) { bl = n; best = i; } }
      if (o.history && bl > 60) { const k = [best, best + 1].find(j => shorten(L[j])) ?? L.findIndex(l => shorten(l)); if (k >= 0) { L[k] = shorten(L[k]); continue; } }
      L.splice(best, 2, L[best] + ' ' + L[best + 1]);
    }
  }
  return L;
}
function run(o) {
  const rounds = []; let L = DRAFT.slice(); const hist = [];
  for (let r = 0; r <= o.budget; r++) {
    const iss = o.rubber ? [] : issues(L, o);
    rounds.push({ lines: L, iss });
    if (!iss.length || r === o.budget) break;
    hist.push(iss); L = refine(L, iss, hist, o);
  }
  const last = rounds[rounds.length - 1], truth = issues(last.lines, { critic: true });
  return { rounds, last, truth, ok: !truth.length };
}

export default {
  slug: 'self-refine-and-critic',
  title: 'Self-Refine and CRITIC: check, then fix',
  description: 'A Kano cassava co-op\'s assistant drafts an SMS: three short lines and the right pickup day. Critique, refine, and check the facts.',
  overview: 'Self-Refine uses one model in three roles: generate a draft, write feedback on it, and refine it using the feedback, repeating until the feedback finds nothing or a budget runs out. The refine step should see the history of earlier drafts and critiques, or it can undo one fix while making another and go round in circles. The weak point is the feedback: a model checking its own facts tends to believe them. CRITIC routes verification through external tools: a calendar or database for facts, a calculator for arithmetic, a code runner or test suite for code. The critique is then grounded in what the tool returned, and the refiner fixes what was actually wrong. Stop when the verifier passes, with a cap on rounds; after a few passes, hand over to a person. The same pattern appears as the evaluator-optimizer workflow and as output guardrails in agent frameworks. Make the evaluator\'s prompt clearly different from the writer\'s, or the critic will rubber-stamp the draft.',
  keywords: ['Self-Refine', 'CRITIC', 'evaluator-optimizer', 'guardrails', 'AI agents', 'self-correction', 'verification'],
  orient: 'landscape',
  view: { target: [-0.5, 0.3, 0.1], dir: [0.35, 0.95, 1.3], half: 1.4, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { critic: true, history: true, rubber: false, budget: 4 }, st = { ...D0, t: 0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* one big phone: each line of the current draft is a bar as long as its characters; the red rail marks 60; a fourth line sits below the dashed limit */
    const PX = -1.6, body = P.box(1.9, 0.12, 2.3, '#2C2D31', { r: 0.12 }); body.position.set(PX, 0, 0.1); S.add(body);
    const sm = new THREE.MeshLambertMaterial({ color: '#F4F1EA' }), scr = P.box(1.75, 0.02, 2.0, '#fff', { r: 0.05, material: sm }); scr.position.set(PX, 0.12, 0.08); S.add(scr);
    const LX0 = PX - 0.8, CW = 1.45 / 80, LZ = i => -0.7 + i * 0.32;
    const lineM = Array.from({ length: 6 }, () => new THREE.MeshLambertMaterial({ color: '#5B8DB8' }));
    const lines = lineM.map((mm, i) => { const b = P.box(1, 0.08, 0.18, '#fff', { r: 0.02, material: mm }); b.position.set(LX0, 0.14, LZ(i)); b.userData.noFit = true; S.add(b); return b; });
    const rail = P.box(0.02, 0.14, 1.9, '#B5462F', { r: 0 }); rail.position.set(LX0 + 60 * CW, 0.14, 0.08); S.add(rail);
    const cut = P.box(1.6, 0.02, 0.02, '#B5462F', { r: 0 }); cut.position.set(PX, 0.15, (LZ(2) + LZ(3)) / 2); S.add(cut);
    /* the rounds: a lamp per round of critique and refine (gold: an issue found, green: passed, red: sent with a hidden problem) */
    const N = 5, rows = Array.from({ length: N }, (_, i) => { const l = P.lamp('#C9C4B6', { h: 0.3 + i * 0.08, r: 0.09 }); l.position.set(0.0 + i * 0.32, 0, -0.6); S.add(l); return l; });
    /* CRITIC's tool: the co-op calendar, a block that only appears when facts are checked */
    const tool = P.box(0.6, 0.45, 0.45, '#fff', { r: 0.05, material: new THREE.MeshLambertMaterial({ color: '#5B8DB8' }) }); tool.position.set(1.0, 0, 0.55); S.add(tool);
    const bot = P.robot(CHAR, { scale: 0.8 }); bot.position.set(0.2, 0, 0.55); S.add(bot);
    S.add(P.keep(-2.6, 1.45, 1.0, -1.05, 1.25));

    let R = null;
    function plan() { R = run(st); st.t = 0; paint(); }
    function paint() {
      const k = Math.min(R.rounds.length - 1, Math.floor(st.t));
      tool.visible = st.critic;
      const cur = R.rounds[k], curBad = issues(cur.lines, { critic: true }), fin = k === R.rounds.length - 1;
      const wrongDay = curBad.some(x => x.k === 'fact');
      lines.forEach((b, i) => { const l = cur.lines[i]; b.visible = !!l; if (!l) return; const n = l.length; b.scale.x = Math.max(0.02, n * CW); b.position.x = LX0 + n * CW / 2; lineM[i].color.set(n > 60 || i >= 3 ? BAD : wrongDay && /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test(l) ? RED : '#5B8DB8'); });
      sm.color.set(fin ? (curBad.length ? '#F7D3C8' : '#D9F0E9') : '#F4F1EA');
      rows.forEach((l, i) => { const r = R.rounds[i], show = !!r && i <= k; l.visible = show; if (!show) return; const bad = issues(r.lines, { critic: true }), last = i === R.rounds.length - 1; l.userData.set({ color: r.iss.length ? SAF : last && bad.length ? RED : GOOD, on: true }); });
    }
    plan();
    const set = p => { Object.assign(st, p); plan(); };
    const controls = [
      { type: 'toggle', label: 'Check facts with the calendar (CRITIC)', short: 'CRITIC', get: () => st.critic, set: v => set({ critic: !!v }) },
      { type: 'toggle', label: 'Refine with the full history', short: 'History', get: () => st.history, set: v => set({ history: !!v }) },
      { type: 'slider', label: 'Most refine rounds', min: 1, max: 4, step: 1, get: () => st.budget, set: v => set({ budget: Math.round(v) }), fmt: v => String(Math.round(v)) },
      { type: 'button', label: 'Run the rounds again', act: () => { st.t = 0; paint(); } },
    ];
    const readouts = [
      { label: 'Rounds', get: () => ({ v: String(R.rounds.length - 1), sub: R.rounds[R.rounds.length - 1].iss.length ? 'budget ran out' : 'until the critic passed' }) },
      { label: 'Message sent', get: () => ({ v: R.ok ? 'correct' : `${R.truth.length} problem${R.truth.length > 1 ? 's' : ''}`, sub: R.ok ? '3 lines, right day' : R.truth.map(x => x.k).join(', '), good: R.ok, bad: !R.ok }) },
      { label: 'Tool calls', get: () => ({ v: st.critic ? String(R.rounds.length) : '0', sub: 'calendar lookups' }) },
    ];
    const labels = [
      { name: 'draft', t: 'The SMS draft', d: 'A bar per line, as long as its characters: the red rail is 60, the red line under row three is the 3-line limit; a red bar has the wrong day', icon: 'book', atV: V(PX - 0.95, 0.15, 0.1) },
      { name: 'rounds', t: 'Critique rounds', d: 'A lamp per round: gold an issue found and fixed, green passed, red sent with a problem still in it', icon: 'check', atV: V(0.0 + 4 * 0.32 + 0.15, 0.5, -0.6) },
      { name: 'tool', t: 'The calendar', d: 'CRITIC\'s tool: checks the facts the self-critic cannot see', icon: 'link', atV: V(1.32, 0.3, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Refine without history', hint: 'fix one, break the other', on: () => set({ ...D0, history: false }), off: reset },
      { label: 'Let the model check its own facts', hint: 'no calendar', on: () => set({ ...D0, critic: false }), off: reset },
      { label: 'Same prompt writes and approves', hint: 'rubber stamp', on: () => set({ ...D0, rubber: true }), off: reset },
    ];
    function status() {
      const L = R.last.lines;
      if (st.rubber) return { ok: false, msg: `<b>The critic, prompted like the writer, said "looks good" to the first draft, and it was sent: ${R.truth.map(x => x.msg).join('; ')}.</b> A model reviewing its own work with the same prompt agrees with itself. Give the evaluator a clearly different prompt and a checklist, or a separate, cheaper model, and ground it in tools.` };
      if (!st.history && !R.ok) return { ok: false, msg: `<b>Without history, ${R.rounds.length - 1} rounds go in circles: splitting the long line makes too many lines, and merging them makes a long line again.</b> The refiner only saw the latest critique, so it undid the previous fix. Show it every earlier draft and critique: then it drops filler words instead of splitting.` };
      if (!st.critic && !R.ok) return { ok: false, msg: `<b>The message passed its own review and went out saying ${R.truth.find(x => x.k === 'fact') ? R.truth.find(x => x.k === 'fact').from : 'the wrong day'}: ${R.truth.map(x => x.msg).join('; ')}.</b> The self-critic checked what it could see, the line count and length, and believed the day it wrote. CRITIC sends factual claims to a tool (here the co-op calendar) and fixes what the tool contradicts.` };
      if (!R.ok) return { ok: false, msg: `<b>The budget ran out with ${R.truth.length} problem${R.truth.length > 1 ? 's' : ''} left: ${R.truth.map(x => x.msg).join('; ')}.</b> Allow another round, or hand it to a person.` };
      return { ok: true, msg: `<b>After ${R.rounds.length - 1} round${R.rounds.length === 2 ? "" : "s"} the message is ${L.length} lines, all under 60 characters, and says ${CAL.day}.</b> The calendar caught the wrong day the model wrote; the history let the refiner shorten instead of splitting. "${L.join(' / ')}"` };
    }
    return {
      update: dt => { bot.userData.tick(dt); bot.userData.set({ busy: true }); if (st.t < R.rounds.length - 1 + 0.99) { const k = Math.floor(st.t); st.t = Math.min(R.rounds.length - 1 + 0.99, st.t + dt * 0.8); if (Math.floor(st.t) !== k) paint(); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A text for members', home: true, say: 'A cassava co-op in Kano needs a text message for its members: at most three short lines, and the right pickup day.', act: m => m.set({ critic: true, history: true, rubber: false, budget: 4 }) },
    { t: 'Critique, then fix', home: true, say: 'The assistant reviews its draft, lists the problems, and fixes them. Then it reviews again.', act: m => m.set({ history: true }) },
    { t: 'Check with a tool', home: true, say: 'The draft says Thursday. The co-op calendar says Wednesday. A tool, not the model\'s memory, catches it.', act: m => m.set({ critic: true }) },
    { t: 'Forgetting the last fix', home: true, say: 'Without the earlier critiques, the assistant splits a long line, then merges two lines back into one, round after round.', act: m => m.set({ history: false }) },
    { t: 'Trusting itself', home: true, say: 'Without the calendar, the assistant fixes the format and confidently sends the wrong day.', act: m => m.set({ history: true, critic: false }) },
    { t: 'Rubber stamp', home: true, say: 'If the same prompt writes and approves, the first draft gets a thumbs up and goes out as it is.', act: m => m.set({ critic: true, rubber: true }) },
  ],
  check: [
    { q: 'Why does CRITIC route checks through tools?', options: ['A model checking its own facts tends to believe them', 'Tools are faster', 'To save tokens'], answer: 0, why: 'Ground the critique in what a tool returns.', hint: 'Try Let the model check its own facts.' },
    { q: 'Why should the refiner see the history of critiques?', options: ['So it doesn\'t undo an earlier fix while making a new one', 'To use more tokens', 'It doesn\'t need to'], answer: 0, why: 'Without it, fixes can oscillate.', hint: 'Try Refine without history.' },
    { q: 'When should the loop stop?', options: ['When the verifier passes, with a cap on rounds', 'When the model says it is fine', 'Never'], answer: 0, why: 'After a few passes, escalate to a person.', hint: 'Move Most refine rounds.' },
  ],
  terms: [
    ['Self-Refine', 'Generate, give feedback, refine, repeat.'],
    ['CRITIC', 'Self-Refine with feedback grounded in tool results.'],
    ['Evaluator-optimizer', 'One part scores, another revises, until the score passes.'],
    ['Output guardrail', 'A check on the final output that can reject it.'],
    ['Rubber stamp', 'A critic that approves whatever it is shown.'],
    ['Refine history', 'Earlier drafts and critiques the refiner sees.'],
  ],
  deeper: '<p><b>Results.</b> Self-Refine improved seven tasks by about 20 points on average with no training. CRITIC beat it on factual tasks because its critiques were grounded; where no tool exists, it reduces to Self-Refine.</p><p><b>Budget.</b> One to three refine passes usually capture the gain; after that, hand over to a person.</p><p><b>About this machine.</b> The checks (line count, line length, the day against the calendar) and the refine edits (merge, split, drop filler, replace the wrong day) are computed live on the draft.</p>',
  code: {
    title: 'Refine until a grounded check passes',
    note: 'Adapted from the course\'s Self-Refine and CRITIC lesson.',
    text: `
def critic(draft, calendar):
    issues = []
    lines = draft.splitlines()
    if len(lines) > 3:
        issues.append(f"{len(lines)} lines, limit 3")
    issues += [f"line {i + 1} too long" for i, l in enumerate(lines) if len(l) > 60]
    day = find_day(draft)
    if day and day != calendar.lookup("pickup_day"):         # a tool, not a guess
        issues.append(f"calendar says {calendar.lookup('pickup_day')}, not {day}")
    return issues

def self_refine(draft, calendar, refine, max_rounds=4):
    history = []
    for _ in range(max_rounds):
        issues = critic(draft, calendar)
        if not issues:
            return draft
        history.append((draft, issues))
        draft = refine(draft, issues, history)               # sees every earlier round
    return draft
`,
  },
};
