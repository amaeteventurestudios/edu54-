// Outcomes before output (phase 14, lesson 47): an Accra power distributor's request starts as "build an outage chatbot". Written as an outcome, four routes stay open: a data repair, a runbook,
// a small interface change, or software. Solution words in the frame close routes. Six pegs must be filled before the frame stands. Route towers are effort; the lamp says if the frame is sound.
const ROUTE = [
  { n: 'Fix feeder data', cost: 1, gets: true },
  { n: 'A one-page runbook', cost: 2, gets: false },
  { n: 'Map on the dashboard', cost: 3, gets: true },
  { n: 'Build a chatbot', cost: 9, gets: true },
];
const PART = ['User', 'Situation', 'Today', 'Outcome', 'Constraints', 'Non-goals'];
function run(o) {
  const filled = PART.filter((p, i) => o.parts[i]).length, leak = o.frame === 'output';
  const open = ROUTE.map((r, i) => leak ? i === 3 : true);
  const opts = ROUTE.map((r, i) => ({ ...r, i })).filter(r => open[r.i] && r.gets);
  const pick = opts.reduce((a, r) => r.cost < a.cost ? r : a, opts[0]);
  const creep = !o.parts[5] ? 3 : 0;
  return { filled, leak, open, pick, cost: pick.cost + creep, creep, whole: filled === 6 };
}

export default {
  slug: 'outcomes-before-output',
  title: 'Outcomes before output: don\'t name the solution yet',
  description: '"Build a chatbot" closes every other road. Write the outcome first, and see the cheaper ones open.',
  overview: '"Build an incident assistant" names an output. It doesn\'t say who needs it, what gets better, or what must stay safe. An outcome frame says those things, in six parts: the user, the situation, what happens today, the observable change you want, the fixed constraints, and what is deliberately out of scope. A good frame could be met by software, a runbook, a data repair or a small interface change. That is the point. Watch for solution leakage: a product form, a model or a framework creeping into the outcome. Leak one in, and the team is committed to the first idea anyone had.',
  keywords: ['product thinking', 'outcome frame', 'requirements', 'solution leakage', 'AI product', 'discovery'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.07, 0.72, 1.2], half: 1.05, wide: 5.3 },

  build(S) {
    const { V, P } = S;
    const D0 = { frame: 'outcome', parts: [1, 1, 1, 1, 1, 1] }, st = { frame: D0.frame, parts: [...D0.parts] };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.55, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const CC = ['#5B8DB8', '#7B6FA8', '#D98BA6', GOOD, SAF, '#A87A4F'];
    const PX = i => -2.2 + (i % 3) * 0.5, PZ = i => i < 3 ? -0.3 : 0.25;
    const rack = P.box(1.55, 0.05, 1.05, '#A87A4F', { r: 0.03 }); rack.position.set(-1.7, 0.03, -0.02); S.add(rack);
    const pegs = PART.map((n, i) => { const m = new S.THREE.MeshLambertMaterial({ color: CC[i] }), b = P.box(0.4, 0.3, 0.4, '#fff', { r: 0.04, material: m }); b.position.set(PX(i), 0.08, PZ(i)); S.add(b); return b; });
    const RX = i => -0.15 + i * 0.72;
    const R4 = ROUTE.map((r, i) => {
      const g = add(P.gate(0.55, SAF, { h: 0.34 })); g.position.set(RX(i), 0.03, 0.42);
      const t = add(P.tower(0.42, 0.42, r.gets ? GOOD : GREY)); t.position.set(RX(i), 0.03, -0.25); t.userData.set({ cap: '', h: r.cost * 0.13 });
      return { g, t };
    });
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.11 })); lamp.position.set(2.32, 0.03, 0.5);
    const van = add(P.robot(SAF, { scale: 0.5 })); van.userData.noFit = true;
    S.add(P.keep(-2.5, 2.5, 1.3, -0.75, 0.75));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      pegs.forEach((b, i) => { b.visible = !!st.parts[i]; });
      R4.forEach(({ g, t }, i) => { const on = R.open[i]; g.userData.set({ open: on, color: on ? GOOD : '#B5462F' }); t.userData.set({ color: i === R.pick.i ? SAF : ROUTE[i].gets && on ? GOOD : GREY }); });
      lamp.userData.set({ color: R.whole && !R.leak ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const FK = ['outcome', 'output'];
    const tog = i => ({ type: 'toggle', label: PART[i], short: PART[i], quick: false, get: () => !!st.parts[i], set: v => { st.parts[i] = v ? 1 : 0; draw(); } });
    const controls = [
      { type: 'buttons', label: 'The request says', options: ['An outcome', 'A chatbot'], get: () => FK.indexOf(st.frame), act: i => set({ frame: FK[i] }) },
      ...PART.map((p, i) => tog(i)),
    ];
    const readouts = [
      { label: 'Frame', get: () => ({ v: `${R.filled} of 6`, sub: 'parts written', good: R.whole, bad: !R.whole }) },
      { label: 'Roads open', get: () => ({ v: `${R.open.filter(Boolean).length} of 4`, sub: R.leak ? 'solution named too soon' : 'nothing ruled out early', good: !R.leak, bad: R.leak }) },
      { label: 'Effort', get: () => ({ v: `${R.cost} weeks`, sub: R.pick.n, good: R.cost <= 3, bad: R.cost > 6 }) },
    ];
    const labels = [
      { name: 'f', t: 'Six parts of the frame', d: 'Who, when, today, goal, limits, not', icon: 'box', atV: V(-2.45, 0.3, -0.05) },
      { name: 'r', t: 'Four roads, by effort', d: 'Gold: taken. Lamp: frame sound', icon: 'chart', atV: V(RX(3) + 0.2, 0.3, -0.2) },
    ];
    const reset = () => { st.frame = D0.frame; st.parts = [...D0.parts]; draw(); };
    const breaks = [
      { label: 'Start from "build a chatbot"', hint: 'the output is the brief', on: () => set({ frame: 'output' }), off: reset },
      { label: 'No non-goals', hint: 'tempting extras creep in', on: () => { const p = [...D0.parts]; p[5] = 0; set({ frame: 'outcome', parts: p }); }, off: reset },
      { label: 'Skip what happens today', hint: 'nobody looked at the workaround', on: () => { const p = [...D0.parts]; p[2] = 0; set({ frame: 'outcome', parts: p }); }, off: reset },
    ];
    function status() {
      if (R.leak) return { ok: false, msg: `<b>Three roads shut and ${R.cost} weeks of work.</b> "Build a chatbot" is an output. The team never asks whether a data fix does the job for far less. The words chatbot, assistant and agent have no place in an outcome.` };
      if (!st.parts[5]) return { ok: false, msg: `<b>${R.creep} extra weeks crept in.</b> With no non-goals, reasonable-sounding extras keep joining: reports, alerts, a mobile view. Saying what is out is how you protect what is in.` };
      if (R.filled < 6) return { ok: false, msg: `<b>Only ${R.filled} of 6 parts written, so the frame won't stand.</b> The missing part is what someone will discover later, at more cost. ${!st.parts[2] ? 'Today\'s workaround often is the real requirement.' : 'Write it down, even if it is short.'}` };
      return { ok: true, msg: `<b>All four roads stayed open, and the cheapest that meets the outcome is: ${R.pick.n.toLowerCase()}, ${R.cost} week${R.cost === 1 ? '' : 's'}.</b> Duty engineers find the feeder in five minutes, and nobody had to build a chatbot to get there.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.5) % 1;
        van.position.set(RX(R.pick.i), 0.03, 0.72 - u * 0.5);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'An output', home: true, say: 'A power distributor in Accra asks for an outage chatbot. That names a thing to build. Three cheaper roads have just closed.', act: m => m.set({ frame: 'output', parts: [1, 1, 1, 1, 1, 1] }) },
    { t: 'An outcome', home: true, say: 'Write it as an outcome: duty engineers find the failed feeder in five minutes. Now four roads are open.', act: m => m.set({ frame: 'outcome', parts: [1, 1, 1, 1, 1, 1] }) },
    { t: 'Six parts', home: true, say: 'A frame has six parts: the user, the situation, today\'s behaviour, the outcome, the constraints and the non-goals.', act: m => m.set({ frame: 'outcome', parts: [1, 1, 0, 1, 1, 1] }) },
    { t: 'Today matters', home: true, say: 'What happens today shows the workaround. Here, engineers phone around because the feeder data is wrong.', act: m => m.set({ frame: 'outcome', parts: [1, 1, 1, 1, 1, 1] }) },
    { t: 'Non-goals', home: true, say: 'Say what is out of scope. Without non-goals, sensible extras keep creeping in.', act: m => m.set({ frame: 'outcome', parts: [1, 1, 1, 1, 1, 0] }) },
    { t: 'The cheapest road', home: true, say: 'With the frame whole, the cheapest road that meets the outcome wins. Here it is a data fix, not a chatbot.', act: m => m.set({ frame: 'outcome', parts: [1, 1, 1, 1, 1, 1] }) },
  ],
  check: [
    { q: 'Which of these is an outcome?', options: ['Duty engineers find the feeder in five minutes', 'Build an outage chatbot', 'Add a model to the dashboard'], answer: 0, why: 'It states an observable change, not a thing to build.', hint: 'Compare the two requests.' },
    { q: 'What is solution leakage?', options: ['A product form or tool inside the outcome', 'Losing a document', 'A bug in production'], answer: 0, why: 'It commits the team before they have looked.', hint: 'Try Start from "build a chatbot".' },
    { q: 'Why write non-goals?', options: ['They stop tempting extras', 'They fill the page', 'They are required by law'], answer: 0, why: 'Saying what is out protects what is in.', hint: 'Try No non-goals.' },
  ],
  terms: [
    ['Output', 'A thing you might build.'],
    ['Outcome', 'An observable change for a real person.'],
    ['Outcome frame', 'User, situation, today, outcome, constraints, non-goals.'],
    ['Solution leakage', 'A named solution hiding in the problem statement.'],
    ['Constraint', 'A limit that is fixed.'],
    ['Non-goal', 'Tempting work that is ruled out.'],
  ],
  deeper: '<p><b>Check for leaks.</b> Read the outcome and strike any product form, model, framework or interface. If the sentence still makes sense, it was an outcome. A simple word list catches most of them.</p><p><b>Not anti-AI.</b> Sometimes the frame is met best by an agent. The point is to reach that by evidence, with the cheaper roads tried first.</p><p><b>Effort here</b> is a round figure in weeks to show the shape, not a forecast.</p>',
  code: {
    title: 'Check a frame',
    note: 'Adapted from the course\'s frame checker (code/main.py).',
    text: `
PARTS = ["user", "situation", "current", "outcome", "constraints", "non_goals"]
LEAKS = {"chatbot", "assistant", "agent", "dashboard", "app", "gpt", "rag"}

def check(frame):
    missing = [p for p in PARTS if not frame.get(p)]
    words = set(frame.get("outcome", "").lower().split())
    return {"missing": missing, "leaks": sorted(words & LEAKS)}
`,
  },
};
