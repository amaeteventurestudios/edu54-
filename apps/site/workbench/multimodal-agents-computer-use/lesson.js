// Computer-use agents (capstone): an agent books a night-coach seat from Nairobi to Kampala on an invented booking site, by looking at the screen and acting:
// navigate, type, click, verify, until a person approves the payment. Grounding uses the screenshot alone or with the accessibility tree; the screen is a desktop or a
// phone; memory is a text log of actions or every screenshot kept; each action can be verified against the next screenshot. Token counts are illustrative (1,800 per
// screenshot, 300 per log line, a 12,000-token budget); the misclick and the forgotten date are scripted from the known failure modes.
// Break it: screenshot-only on a phone (misclicks the tiny seat), no verification (the misclick goes unnoticed), keeping every screenshot (the date falls out of context),
// no approval gate (it pays on its own).
const BUDGET = 12000;
const EL = { from: [-0.75, -0.42, 'Nairobi'], to: [0.0, -0.42, 'Kampala'], date: [0.75, -0.42, '14 Nov'], search: [0.75, -0.1, 'Search'], day: [-0.65, 0.12, 'Day coach 07:00'], night: [-0.65, 0.38, 'Night coach 21:00'], name: [-0.75, 0.68, 'Amina Njeri'], phone: [0.0, 0.68, '07•• ••• •••'], go: [0.75, 0.68, 'Continue'] };
const SEAT = [0.32, 0.12], SEATW = 0.11; /* a 4x3 seat map; 12A, the window seat, is column 0, row 0 */
function plan(st) {
  const small = st.phone && !st.tree, A = [];
  A.push(['navigate', null, 'open the booking site']);
  A.push(['type', 'from', 'From: Nairobi']); A.push(['type', 'to', 'To: Kampala']); A.push(['click', 'date', 'Date: 14 Nov']);
  A.push(['click', 'search', 'Search']); A.push(['click', 'night', 'Night coach 21:00']);
  let seat = '12A window';
  if (small) { A.push(['click', 'seatB', 'Seat (aimed at 12A)']); if (st.verify) { A.push(['verify', 'seatB', 'Screenshot shows 12B: retry']); A.push(['click', 'seatA', 'Seat 12A window']); } else seat = '12B aisle'; }
  else A.push(['click', 'seatA', 'Seat 12A window']);
  A.push(['type', 'name', 'Name: Amina Njeri']); A.push(['type', 'phone', 'Phone number']);
  const shots = A.length * 1800, used = st.log ? A.length * 300 + 1800 : shots, over = used > BUDGET;
  const date = over ? 'today' : '14 Nov';
  A.push(['click', 'go', 'Continue to payment']);
  A.push(st.approve ? ['ask', null, 'Ask the person to approve payment'] : ['click', 'pay', 'Pay now (no one asked)']);
  return { A, seat, date, used: Math.min(used, 99999), over, small };
}

export default {
  slug: 'multimodal-agents-computer-use',
  title: 'Computer-use agents: look, click, check',
  description: 'Capstone: an agent books a night coach from Nairobi to Kampala by looking at the booking site and acting one step at a time, until a person takes the last step.',
  overview: 'A computer-use agent puts everything in this track together. Each step it looks at the screen, decides one action from a small schema (navigate, type, click, scroll, wait, done), and the wrapper executes it and returns a new screenshot. The core skill is GUI grounding: turning "the window seat" into the right coordinates. Models such as SeeClick and CogAgent output coordinates as text; high resolution matters for dense screens, and tiny targets on a phone are where grounding fails most. When an accessibility tree or DOM is available, hybrid agents use it to find elements exactly and the screenshot for context. Long tasks fill the context: keeping every screenshot runs out of room within a dozen steps, so agents keep a text log of what they did and only the latest screenshot. Errors are normal, so good agents verify each action against the next screenshot and retry. Benchmarks such as VisualWebArena and AgentVista show even frontier agents finish well under half of realistic tasks. Anything irreversible, such as paying or sending, waits for a person to approve.',
  keywords: ['computer use', 'gui grounding', 'accessibility tree', 'action schema', 'agent memory', 'human approval'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { tree: true, phone: false, log: true, verify: true, approve: true };
    const ink = '#151827';
    /* the screen, lying on the desk */
    const scr = new THREE.Group(); scr.position.set(-1.0, 0.12, 0.1); floor.add(scr);
    const bezel = P.box(2.9, 0.06, 2.0, '#22252F', { r: 0.06 }); scr.add(bezel);
    const page = new THREE.Group(); page.position.y = 0.065; scr.add(page);
    const bg = P.box(2.7, 0.01, 1.8, '#FFFFFF'); page.add(bg);

    const els = {}; Object.entries(EL).forEach(([k, [x, z, t]]) => { const btn = k === 'search' || k === 'go', w = k === 'day' || k === 'night' ? 1.1 : 0.62;
      const b = P.box(w, 0.02, 0.2, btn ? '#B5541C' : '#EEF0F4', { r: 0.02 }); b.position.set(x, 0.01, z); page.add(b);
         els[k] = b; });
    const seats = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const s = P.box(SEATW * 0.8, 0.02, SEATW * 0.8, c === 0 ? '#9FC6E8' : '#D9DCE3', { r: 0.01 }); s.position.set(SEAT[0] + c * SEATW, 0.01, SEAT[1] + r * SEATW); page.add(s); seats.push(s); }

    const payB = P.box(0.62, 0.02, 0.2, '#C62828', { r: 0.02 }); payB.position.set(0.75, 0.01, 0.38); page.add(payB);


    /* accessibility tree overlay: outlines on every element */
    const tree = new THREE.Group(); page.add(tree);
    Object.values(els).concat(seats, [payB]).forEach(b => { b.geometry.computeBoundingBox(); const sz = b.geometry.boundingBox.getSize(V()), e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sz.x + 0.02, 0.001, sz.z + 0.02)), new THREE.LineBasicMaterial({ color: '#1F9E89' }));
      e.position.copy(b.position).add(V(0, 0.03, 0)); e.layers.set(1); tree.add(e); });
    /* the agent's cursor and click ring */
    const cursor = P.cyl(0.09, 0.26, '#E07B39', { r2: 0 }); cursor.rotation.x = Math.PI; cursor.userData.noFit = true; floor.add(cursor);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 24), new THREE.MeshBasicMaterial({ color: '#E07B39' })); ring.rotation.x = Math.PI / 2; ring.layers.set(1); ring.userData.noFit = true; floor.add(ring);
    const agent = P.box(0.6, 0.35, 0.6, C.plum, { r: 0.06 }); agent.position.set(0.95, 0.12, -0.95); floor.add(agent);

    /* the action log on the right */

    const logL = Array.from({ length: 7 }, (_, i) => {    return t; });
    const gate = P.box(1.5, 0.12, 0.3, '#C9C3B5', { r: 0.04 }); gate.position.set(2.05, 0.12, 0.95); floor.add(gate);


    const keep = P.box(5.6, 0.4, 2.4, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null, t0 = 0, shown = -1;
    const at = k => { const sx = page.scale.x; let x, z;
      if (k === 'seatA') { x = SEAT[0]; z = SEAT[1]; } else if (k === 'seatB') { x = SEAT[0] + SEATW; z = SEAT[1]; } else if (k === 'pay') { x = 0.75; z = 0.38; } else if (!k) { x = 0; z = -0.74; } else { x = EL[k][0]; z = EL[k][1]; }
      return V(scr.position.x + x * sx, 0.24, scr.position.z + z); };
    function draw() {
      R = plan(st); shown = -1;
      page.scale.x = st.phone ? 0.42 : 1; bezel.scale.x = st.phone ? 0.45 : 1; tree.visible = !!st.tree;
      payB.visible = !st.approve;
      const pr = S.money.of(30);
      gate.material.color.set(st.approve ? '#E0A526' : '#C62828');
      seats.forEach((s, i) => s.material.color.set(i === 0 && R.seat.startsWith('12A') ? '#1F9E89' : i === 1 && R.seat.startsWith('12B') ? '#C62828' : i % 4 === 0 ? '#9FC6E8' : '#D9DCE3'));
      showStep(R.A.length - 1);
    }
    function showStep(k) { if (k === shown) return; shown = k;
      const lo = Math.max(0, k - 6); logL.forEach((t, i) => { const a = R.A[lo + i];  if (!a) return;
        const bad = (a[1] === 'seatB' && a[0] === 'click' && !st.verify) || a[0] === 'verify' || (a[1] === 'pay');
         });
      const a = R.A[k], p = at(a[1]); cursor.position.copy(p).add(V(0.05, 0.32, 0.05)); ring.position.copy(p).setY(0.2); ring.visible = a[0] === 'click' || a[0] === 'type'; }
    draw();
    const update = dt => { if (S.reduced) return; t0 += dt; const n = R.A.length + 2, k = Math.min(R.A.length - 1, Math.floor((t0 / 0.9) % n)); showStep(k); };
    const controls = [
      { type: 'buttons', label: 'Grounding', options: ['Screenshot only', '+ accessibility tree'], get: () => (st.tree ? 1 : 0), act: i => { st.tree = !!i; draw(); } },
      { type: 'buttons', label: 'Screen', options: ['Desktop', 'Phone'], get: () => (st.phone ? 1 : 0), act: i => { st.phone = !!i; draw(); } },
      { type: 'buttons', label: 'Memory', options: ['Action log', 'Every screenshot'], get: () => (st.log ? 0 : 1), act: i => { st.log = !i; draw(); } },
      { type: 'buttons', label: 'Verify each step', options: ['On', 'Off'], get: () => (st.verify ? 0 : 1), act: i => { st.verify = !i; draw(); } },
      { type: 'buttons', label: 'Before paying', options: ['Ask a person', 'Just pay'], get: () => (st.approve ? 0 : 1), act: i => { st.approve = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Booking', get: () => { const ok = R.seat.startsWith('12A') && R.date === '14 Nov'; return { v: ok ? 'Right' : 'Wrong', sub: `${R.date}, seat ${R.seat}`, good: ok, bad: !ok }; } },
      { label: 'Steps', get: () => ({ v: String(R.A.length), sub: R.small && st.verify ? 'one retry after a misclick' : 'one action each' }) },
      { label: 'Context', get: () => ({ v: `${Math.round(R.used / 1000)}k`, sub: `of ${BUDGET / 1000}k tokens`, good: !R.over, bad: R.over }) },
    ];
    const labels = [
      { name: 'screen', t: 'The screen', d: 'Teal outlines: accessibility tree', icon: 'eye', atV: V(-2.45, 0.2, 0.1) },
    ];
    const reset = () => { Object.assign(st, { tree: true, phone: false, log: true, verify: true, approve: true }); draw(); };
    const breaks = [
      { label: 'Phone, no checks', hint: 'Screenshot only, no verification', on: () => { reset(); st.phone = true; st.tree = false; st.verify = false; draw(); }, off: reset },
      { label: 'Keep every screenshot', hint: 'No action log', on: () => { reset(); st.log = false; draw(); }, off: reset },
      { label: 'No approval step', hint: 'Agent pays on its own', on: () => { reset(); st.approve = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.approve) return { ok: false, msg: `<b>It paid without asking.</b> Paying is irreversible, and the agent went straight from the form to "Pay now". Keep a gate in the wrapper: anything that spends, sends or deletes waits for a person to approve.` };
      if (R.small && !st.verify) return { ok: false, msg: `<b>Seat 12B, on the aisle.</b> On a phone the seat buttons are a few pixels wide; from the screenshot alone the agent clicked one seat to the right and never looked back. Verify each action against the next screenshot, or ground with the accessibility tree.` };
      if (R.over) return { ok: false, msg: `<b>Booked for today, not 14 November.</b> Keeping every screenshot (1,800 tokens each) passes the ${BUDGET.toLocaleString('en')}-token budget after ${Math.ceil(BUDGET / 1800)} steps, so the earliest steps, including the date, are dropped. Keep a short text log of actions and only the latest screenshot.` };
      if (R.small) return { ok: true, msg: `<b>Caught and fixed.</b> On the phone the first seat click landed on 12B; checking the next screenshot showed it, and the agent clicked 12A. One extra step. The accessibility tree would have avoided the miss altogether.` };
      return { ok: true, msg: `<b>Night coach, 14 November, seat 12A, then it stops.</b> The accessibility tree pins each element exactly, the action log keeps context to ${Math.round(R.used / 1000)}k tokens, every click is checked, and payment waits for a person.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); }, currency: draw };
  },

  story: [
    { t: 'The task', home: true, say: 'An agent books a night coach from Nairobi to Kampala for the fourteenth of November, window seat, and stops before paying.', act: m => m.set({ tree: true, phone: false, log: true, verify: true, approve: true }) },
    { t: 'Look and act', home: true, say: 'Each step it looks at the screen, picks one action, types or clicks, and checks the result.', act: m => m.set({}) },
    { t: 'Ask first', home: true, say: 'It keeps a short log of what it did, and waits for a person before paying.', act: m => m.set({}) },
    { t: 'Tiny targets', home: true, say: 'On a phone, from screenshots alone, it clicks the seat next to the one it meant, and without checking it never notices.', act: m => m.set({ phone: true, tree: false, verify: false }) },
    { t: 'Too many screenshots', home: true, say: 'Keep every screenshot instead of a log, and the date falls out of memory.', act: m => m.set({ phone: false, tree: true, verify: true, log: false }) },
    { t: 'No gate', home: true, say: 'Remove the approval step, and it pays on its own.', act: m => m.set({ log: true, approve: false }) },
  ],
  check: [
    { q: 'What is GUI grounding?', options: ['Turning an instruction into the right place to click', 'Rendering a screen', 'Training on text'], answer: 0, why: 'Coordinates from a screenshot.' },
    { q: 'Why keep an action log instead of every screenshot?', options: ['Screenshots fill the context within a dozen steps', 'Logs look nicer', 'Screenshots are wrong'], answer: 0, why: 'Old steps get dropped.' },
    { q: 'What should happen before an agent pays?', options: ['A person approves', 'Nothing', 'It takes a screenshot'], answer: 0, why: 'Irreversible actions need a gate.' },
  ],
  terms: [
    ['Computer-use agent', 'A model that operates apps by looking and acting.'],
    ['GUI grounding', 'Finding where on screen to act.'],
    ['Accessibility tree', 'The structured list of elements behind a screen.'],
    ['Action schema', 'The small set of actions an agent may emit.'],
    ['Verification', 'Checking the next screen shows the action worked.'],
    ['Approval gate', 'A person must confirm irreversible steps.'],
  ],
  deeper: '<p><b>Booking and paperwork.</b> Across East Africa, coach tickets, permits and utility payments are moving to websites and phone apps, often used on small screens over slow connections. Agents could help people who find these hard to use, but they must check their work and never pay or submit without the person\'s say-so.</p><p><b>The state of the art.</b> Frontier agents still finish well under half of realistic multi-step tasks on benchmarks such as AgentVista; most failures are small misclicks, drift on long tasks and poor recovery.</p><p><b>About this machine.</b> Token counts are illustrative; the misclick and the forgotten date are scripted from known failure modes; the site is invented.</p>',
  code: {
    title: 'One step at a time',
    note: 'Adapted from the course\'s computer-use capstone.',
    text: `
IRREVERSIBLE = {"pay", "send", "delete", "submit"}

def run(agent, browser, goal, ask_person, max_steps=30):
    log = []
    for _ in range(max_steps):
        shot, tree = browser.observe()
        act = agent.next_action(goal, shot, tree, log)   # {"action": "click", ...}
        if act["action"] == "done":
            return log
        if act.get("kind") in IRREVERSIBLE and not ask_person(act):
            return log + ["stopped: not approved"]
        browser.execute(act)
        if not agent.verify(act, browser.observe()[0]):
            log.append(f"retry {act}")
            continue
        log.append(act)
`,
  },
};
