// Dialogue state tracking: a customer books a coach from Dar es Salaam to Arusha in five turns. After each turn the tracker updates the booking state
// (from, to, day, time, seats, confirmed); cards on the rack show it, red where it differs from the true state. Joint goal accuracy counts the turns where
// every slot is right. The trackers are rules run live. Break it: read only the latest message (everything said before is forgotten),
// ignore what the system offered ("the first one" means nothing), keep the first value (the correction to four seats is lost).
const TURNS = [
  { sys: '', user: 'I need a bus from Dar es Salaam to Arusha.' },
  { sys: 'Which day, and how many seats?', user: 'Friday, three seats.' },
  { sys: 'There is a 7 am and a 1 pm coach.', user: 'The first one.' },
  { sys: 'Booked for 7 am?', user: 'Actually, make it four seats.' },
  { sys: 'Four seats on the 7 am, Friday.', user: 'OK, book it.' },
];
const SLOTS = ['from', 'to', 'day', 'time', 'seats', 'confirmed'];
const GOLD = [
  { from: 'Dar es Salaam', to: 'Arusha' },
  { from: 'Dar es Salaam', to: 'Arusha', day: 'Friday', seats: '3' },
  { from: 'Dar es Salaam', to: 'Arusha', day: 'Friday', seats: '3', time: '7 am' },
  { from: 'Dar es Salaam', to: 'Arusha', day: 'Friday', seats: '4', time: '7 am' },
  { from: 'Dar es Salaam', to: 'Arusha', day: 'Friday', seats: '4', time: '7 am', confirmed: 'yes' },
];
const NUM = { one: '1', two: '2', three: '3', four: '4', five: '5' };
function extract(turn, k, useSys) {   // slot values this turn's words state, read with simple rules
  const u = turn.user, out = {}, m = u.match(/from (.+?) to (\w+)/i);
  if (m) { out.from = m[1]; out.to = m[2]; }
  const d = u.match(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/); if (d) out.day = d[1];
  const s = u.match(/\b(one|two|three|four|five)\s+seats?/i); if (s) out.seats = NUM[s[1].toLowerCase()];
  if (/the first one/i.test(u) && useSys) { const t = turn.sys.match(/(\d+ [ap]m)/); if (t) out.time = t[1]; }   // "first" points at what the system just offered
  if (/\bbook it\b/i.test(u)) out.confirmed = 'yes';
  return out;
}
function track(st) {
  let state = {}; const per = [];
  TURNS.forEach((t, k) => {
    const x = extract(t, k, st.sys);
    if (st.latest) state = { ...x };   // rebuilt from the newest message alone
    else Object.entries(x).forEach(([key, v]) => { if (!(st.first && state[key])) state[key] = v; });
    per.push({ ...state });
  });
  return per;
}

export default {
  slug: 'dialogue-state-tracking',
  title: 'Dialogue state: keep track of the booking',
  description: 'A customer books a coach from Dar es Salaam to Arusha in five short turns. Keep the whole state, not the last message, and let new answers overwrite old.',
  overview: 'Dialogue state tracking keeps a running record of what the user wants, as values for a fixed set of slots such as origin, destination, day, time and seats. After each turn the tracker reads the conversation and updates the state. Values must carry over from earlier turns; corrections must overwrite only the slot they change; and references like "the first one" or "yes, that one" point at what the system itself just said. Trackers range from rules and classifiers to language models that write the state as structured output. The usual score is joint goal accuracy: the share of turns after which every slot is exactly right. One wrong slot fails the whole turn, which is what a booking feels like to the customer.',
  keywords: ['dialogue state tracking', 'slot filling', 'joint goal accuracy', 'task-oriented dialogue', 'multiwoz'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.2, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { turn: 5, latest: false, sys: true, first: false };
    /* five turns as pads along the front, a lamp if every slot is right after that turn */
    const rows = TURNS.map((t, k) => { const hm = new THREE.MeshLambertMaterial({ color: '#E4DED2' }), b = P.box(0.4, 0.04, 0.4, '#fff', { r: 0.03, material: hm }); b.position.set(-1.3 + k * 0.5, 0, 0.35); S.add(b); const lm = P.lamp('#C9C5BA', { h: 0.1, r: 0.085 }); lm.position.set(-1.3 + k * 0.5, 0.04, 0.35); S.add(lm); return { hm, lm }; });
    /* the booking rack: a slot for each piece of the state */
    const slots = SLOTS.map((name, k) => {
      const x = -1.5 + k * 0.6, shelf = P.box(0.5, 0.05, 0.5, '#3B3F8F', { r: 0.03 }); shelf.position.set(x, 0, -0.55); S.add(shelf);
      const mm = new THREE.MeshLambertMaterial({ color: '#FFF1C9' }), b = P.box(0.38, 0.32, 0.38, '#fff', { r: 0.03, material: mm }); b.position.set(x, 0.05, -0.55); S.add(b);
      return { mm, b };
    });
    S.add(P.keep(-1.95, 1.95, 0.55, -0.9, 0.65));

    let PER = [], JGA = 0;
    function draw() {
      PER = track(st);
      const k = st.turn - 1, cur = PER[k], gold = GOLD[k];
      const turnOk = PER.map((p, i) => SLOTS.every(sl => (p[sl] || '') === (GOLD[i][sl] || '')));
      JGA = turnOk.filter(Boolean).length / TURNS.length;
      rows.forEach((r, i) => { r.hm.color.set(i === k ? '#F2C94C' : '#E4DED2'); r.lm.userData.set({ color: i > k ? '#C9C5BA' : turnOk[i] ? '#2E9E6A' : '#D64545', on: true }); });
      slots.forEach((s, i) => { const sl = SLOTS[i], v = cur[sl] || '', g = gold[sl] || '', ok = v === g;
        s.b.visible = !!v || !ok; s.mm.color.set(!ok ? '#D64545' : '#2E9E6A'); });
    }
    draw();
    const wrongNow = () => { const k = st.turn - 1; return SLOTS.filter(sl => (PER[k][sl] || '') !== (GOLD[k][sl] || '')); };
    const controls = [
      { type: 'slider', label: 'After turn', min: 1, max: 5, step: 1, get: () => st.turn, set: v => { st.turn = v; draw(); } },
      { type: 'toggle', label: 'Read only the latest message', short: 'latest only', get: () => st.latest, set: v => { st.latest = v; draw(); } },
      { type: 'toggle', label: 'Read what the system offered', short: 'system turns', get: () => st.sys, set: v => { st.sys = v; draw(); } },
      { type: 'toggle', label: 'Keep the first value of a slot', short: 'first value', get: () => st.first, set: v => { st.first = v; draw(); } },
    ];
    const readouts = [
      { label: 'Joint goal accuracy', get: () => ({ v: `${Math.round(JGA * 100)}%`, sub: 'turns with every slot right', good: JGA === 1, bad: JGA < 0.6 }) },
      { label: 'Wrong slots now', get: () => ({ v: String(wrongNow().length), sub: wrongNow().join(', ') || 'none', bad: wrongNow().length > 0, good: !wrongNow().length }) },
      { label: 'Turn', get: () => ({ v: `${st.turn} of 5` }) },
    ];
    const labels = [
      { name: 'chat', t: 'Five turns', d: 'Lamp: every slot right after it', icon: 'book', atV: V(-1.52, 0.1, 0.35) },
      { name: 'rack', t: 'Booking state', d: 'Red: differs from the truth', icon: 'box', atV: V(1.72, 0.2, -0.55) },
    ];
    const reset = () => { Object.assign(st, { turn: 5, latest: false, sys: true, first: false }); draw(); };
    const breaks = [
      { label: 'Latest message only', hint: 'No memory', on: () => { reset(); st.latest = true; draw(); }, off: reset },
      { label: 'Ignore the system\'s offers', hint: '"The first one"', on: () => { reset(); st.sys = false; st.turn = 3; draw(); }, off: reset },
      { label: 'Never overwrite', hint: '"Make it four"', on: () => { reset(); st.first = true; st.turn = 4; draw(); }, off: reset },
    ];
    function status() {
      const w = wrongNow(), p = Math.round(JGA * 100);
      if (st.latest) return { ok: false, msg: `<b>Everything said before is forgotten.</b> Rebuilding the state from the newest message alone, turn ${st.turn} keeps only what "${TURNS[st.turn - 1].user}" says: ${w.length} slot${w.length === 1 ? '' : 's'} wrong (${w.join(', ')}). Joint goal accuracy ${p}%. Carry the state forward and update it.` };
      if (!st.sys && PER[2].time !== GOLD[2].time) return { ok: false, msg: `<b>"The first one" of what?</b> The customer is pointing at the system's own offer, "a 7 am and a 1 pm coach". A tracker that reads only customer messages cannot fill the time, so ${w.length ? `after turn ${st.turn} it is wrong on ${w.join(', ')}` : 'it stays empty'}. Joint goal accuracy ${p}%. Read both sides of the conversation.` };
      if (st.first && PER[3].seats !== GOLD[3].seats) return { ok: false, msg: `<b>The correction was ignored.</b> "Actually, make it four seats" should overwrite seats and leave everything else. Keeping the first value, the state still says ${PER[3].seats}, and a coach is booked for one person too few. Joint goal accuracy ${p}%. Corrections overwrite one slot; they never clear the others.` };
      return { ok: true, msg: `<b>Turn ${st.turn}: every slot right${st.turn === 5 ? ', booked' : ''}.</b> Values carry over from earlier turns, "the first one" is read against the system's offer of 7 am, and "make it four" overwrites only the seats. Joint goal accuracy ${p}%.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Book a coach', home: true, say: 'A customer books a coach from Dar es Salaam to Arusha. After every turn, the system writes down what it believes the customer wants.', act: m => m.set({ turn: 1, latest: false, sys: true, first: false }) },
    { t: 'Carry it forward', home: true, say: 'Friday, three seats. The new slots are added, and the route from the first turn stays.', act: m => m.set({ turn: 2 }) },
    { t: 'The first one', home: true, say: 'The first one means the first coach the system offered: seven am. The tracker must read the system\'s side too.', act: m => m.set({ turn: 3 }) },
    { t: 'A correction', home: true, say: 'Actually, make it four seats. Seats change; nothing else does.', act: m => m.set({ turn: 4 }) },
    { t: 'No memory', home: true, say: 'Rebuild the state from the latest message alone, and by the end only "book it" survives. Every earlier slot is lost.', act: m => m.set({ turn: 5, latest: true }) },
    { t: 'Every slot, every turn', home: true, say: 'Joint goal accuracy counts turns where every slot is right. One wrong slot fails the turn, just as it fails the booking.', act: m => m.set({ latest: false }) },
  ],
  check: [
    { q: 'What is the dialogue state?', options: ['The values the user wants for each slot so far', 'The last message only', 'The system\'s reply'], answer: 0, why: 'It is updated after every turn.' },
    { q: 'How should "actually, make it four seats" change the state?', options: ['Overwrite seats and keep every other slot', 'Clear the state and start again', 'Ignore it'], answer: 0, why: 'Corrections change one slot.' },
    { q: 'Joint goal accuracy counts a turn as correct when…', options: ['Every slot is exactly right', 'Most slots are right', 'The user is happy'], answer: 0, why: 'It is all or nothing.' },
  ],
  terms: [
    ['Slot', 'One piece of the user\'s goal, such as day or seats.'],
    ['Dialogue state', 'The current value of every slot.'],
    ['Carry-over', 'Keeping values from earlier turns.'],
    ['Correction', 'A turn that changes a value already given.'],
    ['Joint goal accuracy', 'Share of turns with every slot right.'],
    ['Schema', 'The list of slots and their allowed values.'],
  ],
  deeper: '<p><b>Language models as trackers.</b> A model can read the whole conversation and write the state as structured output against a schema. Long chats cost more each turn, so older turns are summarised into the state itself.</p><p><b>Mixed languages.</b> Customers in Dar es Salaam may write "viti vinne", four seats, in Swahili halfway through an English chat. Test trackers on the language people really use.</p><p><b>About this machine.</b> The trackers are small rules run live on the five turns; joint goal accuracy is computed against the true state after each turn.</p>',
  code: {
    title: 'Carry, extract, overwrite',
    note: 'Adapted from the course\'s dialogue state tracking lesson.',
    text: `
def update_state(state, system_turn, user_turn, extract):
    new = extract(user_turn, context=system_turn)   # read both sides
    return {**state, **new}                         # carry over, overwrite what changed

def joint_goal_accuracy(predicted, gold):
    right = sum(p == g for p, g in zip(predicted, gold))
    return right / len(gold)

state, history = {}, []
for system_turn, user_turn in dialogue:
    state = update_state(state, system_turn, user_turn, extract)
    history.append(dict(state))
print(joint_goal_accuracy(history, gold_states))
`,
  },
};
