// Checkpoints and rollback (phase 15, lesson 16): a Dar es Salaam freight agent has approval to move a container booking to another ship. An approved action can execute partly, crash and resume.
// Four guards work together: idempotency key, precondition check, post-action verify, rollback on verify-fail. Each fault needs its own guard; a parcel runs the line and lands in the right or wrong bay.
const FAULT = {
  none: { n: 'Nothing goes wrong' },
  crash: { n: 'Crash after the write' },
  moved: { n: 'Ship changed since approval' },
  silent: { n: 'Write silently fails' },
};
function run(o) {
  const f = o.fault;
  if (f === 'crash') return o.key ? { end: 'ok', books: 1, why: 'key' } : { end: 'double', books: 2, why: 'key' };
  if (f === 'moved') return o.pre ? { end: 'stopped', books: 0, why: 'pre' } : { end: 'stale', books: 1, why: 'pre' };
  if (f === 'silent') { if (!o.verify) return { end: 'ghost', books: 0, why: 'verify' }; return o.roll ? { end: 'rolled', books: 0, why: 'roll' } : { end: 'half', books: 0, why: 'roll' }; }
  return { end: 'ok', books: 1, why: '' };
}

export default {
  slug: 'checkpoints-rollback',
  title: 'Checkpoints and rollback: four guards around one action',
  description: 'An approved booking runs, crashes and resumes. Four guards decide whether it lands once, stops or unwinds cleanly.',
  overview: 'Durable execution lets a crashed agent resume. Propose-then-commit makes an approved action auditable. The hard case sits between them: the action was approved, ran partway, crashed and resumed. Now what? Real systems converge on four guards. An idempotency key stops a double execute. A precondition check confirms the state is still what was approved. A post-action verify confirms the side effect really happened. And a rollback runs when the verify fails. Each covers a fault the others can\'t. Here a freight agent in Dar es Salaam moves a container booking, and you pick the fault and the guards.',
  keywords: ['checkpoints', 'rollback', 'idempotency', 'precondition', 'durable execution', 'AI agents', 'autonomous systems'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.07, 0.75, 1.2], half: 1.05, wide: 5.3 },

  build(S) {
    const { V, P } = S;
    const D0 = { fault: 'crash', key: true, pre: true, verify: true, roll: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const line = add(P.belt(V(-2.4, 0, -0.1), V(1.3, 0, -0.1), { w: 0.42, speed: 1.1 }));
    const GX = i => -1.75 + i * 0.95, KS = ['key', 'pre', 'verify', 'roll'];
    const G = KS.map((k, i) => { const l = add(P.lamp(GREY, { h: 0.55, r: 0.1 })); l.position.set(GX(i), 0.03, -0.45); const b = P.box(0.5, 0.16, 0.12, GREY, { r: 0.02, material: new S.THREE.MeshLambertMaterial({ color: GREY }) }); b.position.set(GX(i), 0.42, -0.1); S.add(b); return { l, b }; });
    const bays = ['ok', 'stopped', 'bad'].map((k, i) => { const t = add(P.tower(0.5, 0.42, [GOOD, SAF, RED][i])); t.position.set(1.65 + i * 0.32 - (i ? 0 : 0), 0.03, -0.45 + i * 0.42); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.5, 2.55, 1.0, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      G.forEach(({ l, b }, i) => { const on = st[KS[i]], used = R.why === KS[i]; l.userData.set({ color: on ? (used ? '#E3A72F' : '#3E9B5F') : '#C9C4B6', on }); b.material.color.set(on ? (used ? SAF : GOOD) : GREY); b.visible = on; });
      const good = R.end === 'ok', safe = R.end === 'stopped' || R.end === 'rolled', bad = !good && !safe;
      bays[0].userData.set({ h: good ? 0.7 : 0.05 }); bays[1].userData.set({ h: safe ? 0.7 : 0.05 }); bays[2].userData.set({ h: bad ? 0.7 : 0.05 });
      line.userData.clear();
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const FK = ['none', 'crash', 'moved', 'silent'];
    const controls = [
      { type: 'buttons', label: 'What goes wrong', options: ['Nothing', 'Crash', 'Ship changed', 'Silent failure'], get: () => FK.indexOf(st.fault), act: i => set({ fault: FK[i] }) },
      { type: 'toggle', label: 'Idempotency key', short: 'Key', get: () => st.key, set: v => set({ key: !!v }) },
      { type: 'toggle', label: 'Precondition check before acting', short: 'Precondition', get: () => st.pre, set: v => set({ pre: !!v }) },
      { type: 'toggle', label: 'Verify after acting', short: 'Verify', get: () => st.verify, set: v => set({ verify: !!v }) },
      { type: 'toggle', label: 'Roll back on a failed verify', short: 'Rollback', get: () => st.roll, set: v => set({ roll: !!v }) },
    ];
    const END = { ok: 'done once', stopped: 'stopped, nothing changed', double: 'booked twice', stale: 'wrong ship', ghost: 'reported done, not done', half: 'left half done', rolled: 'unwound cleanly' };
    const readouts = [
      { label: 'Outcome', get: () => ({ v: END[R.end], sub: FAULT[st.fault].n, good: ['ok', 'stopped', 'rolled'].includes(R.end), bad: !['ok', 'stopped', 'rolled'].includes(R.end) }) },
      { label: 'Bookings made', get: () => ({ v: `${R.books}`, sub: 'should be one or none', good: R.books <= 1, bad: R.books > 1 }) },
      { label: 'Guard in play', get: () => ({ v: { key: 'key', pre: 'precondition', verify: 'verify', roll: 'rollback', '': 'none needed' }[R.why], sub: 'for this fault' }) },
    ];
    const labels = [
      { name: 'g', t: 'Four guards', d: 'Gold: the one that matters', icon: 'check', atV: V(GX(0), 0.65, -0.45) },
      { name: 'b', t: 'Where it lands', d: 'Teal done, gold safe stop, red bad', icon: 'target', atV: V(2.3, 0.2, 0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Resume with no key', hint: 'the write runs again', on: () => set({ ...D0, key: false }), off: reset },
      { label: 'Trust the old approval', hint: 'no precondition check', on: () => set({ ...D0, fault: 'moved', pre: false }), off: reset },
      { label: 'Assume the write worked', hint: 'no verify', on: () => set({ ...D0, fault: 'silent', verify: false }), off: reset },
      { label: 'Verify but never unwind', hint: 'no rollback', on: () => set({ ...D0, fault: 'silent', roll: false }), off: reset },
    ];
    function status() {
      switch (R.end) {
        case 'double': return { ok: false, msg: '<b>Two bookings for one container.</b> The write landed, the crash hit before the checkpoint, and the resumed run wrote again. A key lets the second write count as the first.' };
        case 'stale': return { ok: false, msg: '<b>The container went to a ship that has left the plan.</b> The approval was for a world that had changed by the time the action ran. Check the state again at the moment of action.' };
        case 'ghost': return { ok: false, msg: '<b>The agent reported success, and nothing changed.</b> The carrier\'s system accepted the call and dropped it. Without a read after the write, nobody finds out until the ship sails.' };
        case 'half': return { ok: false, msg: '<b>The verify caught it, and the job was left half done.</b> The old slot is released and the new one isn\'t held. Detecting a failure only helps if the plan says how to unwind it.' };
        case 'stopped': return { ok: true, msg: '<b>The precondition failed, so the agent stopped and asked again.</b> Nothing changed. An approval is valid for the state it saw, and a safe stop is a good outcome.' };
        case 'rolled': return { ok: true, msg: '<b>The verify failed, the rollback ran, and the booking is back as it was.</b> A person is told. The verify found the fault and the rollback made it safe.' };
        default: return { ok: true, msg: `<b>One booking, on the approved ship.</b> ${st.fault === 'crash' ? 'The crash and resume repeated the write, and the key made the repeat harmless.' : 'All guards ran and none had to act, which is how most days look.'}` };
      }
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt;
        if (u > 1.1 && line.userData.count() < 3) { u = 0; line.userData.send(R.books > 1 || !['ok', 'stopped', 'rolled'].includes(R.end) ? BAD : '#F4F1EA', { size: 0.2 }); }
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'An approved move', home: true, say: 'A freight agent in Dar es Salaam has approval to move a container to another ship. Then the worker crashes, just after the write.', act: m => m.set({ fault: 'crash', key: false, pre: true, verify: true, roll: true }) },
    { t: 'The key', home: true, say: 'The resumed run writes again, and without a key that books twice. An idempotency key makes the repeat count once.', act: m => m.set({ fault: 'crash', key: true, pre: true, verify: true, roll: true }) },
    { t: 'The world moved', home: true, say: 'The approval is an hour old, and the ship has changed. Acting on it sends the container astray. Check the state again first.', act: m => m.set({ fault: 'moved', key: true, pre: false, verify: true, roll: true }) },
    { t: 'A safe stop', home: true, say: 'With a precondition check, the agent stops and asks. Stopping safely is a good outcome.', act: m => m.set({ fault: 'moved', key: true, pre: true, verify: true, roll: true }) },
    { t: 'Silent failure', home: true, say: 'The carrier accepts the call and drops it. The agent says done. Only a read after the write can tell.', act: m => m.set({ fault: 'silent', key: true, pre: true, verify: false, roll: true }) },
    { t: 'Unwind', home: true, say: 'When the verify fails, the rollback puts things back and tells a person. Four guards, one action.', act: m => m.set({ fault: 'silent', key: true, pre: true, verify: true, roll: true }) },
  ],
  check: [
    { q: 'Which guard stops a double execute after a crash?', options: ['An idempotency key', 'A verify', 'A rollback'], answer: 0, why: 'The repeat counts as the first write.', hint: 'Try Resume with no key.' },
    { q: 'What does a precondition check protect against?', options: ['Acting on state that changed since approval', 'Slow models', 'Long prompts'], answer: 0, why: 'An approval holds for the state it saw.', hint: 'Try Trust the old approval.' },
    { q: 'What does a post-action verify catch?', options: ['A write that reported success and didn\'t happen', 'Bad spelling', 'High cost'], answer: 0, why: 'Read after write shows the truth.', hint: 'Try Assume the write worked.' },
  ],
  terms: [
    ['Checkpoint', 'Saved state to resume from.'],
    ['Idempotency key', 'A tag that makes a repeat count once.'],
    ['Precondition', 'What must still be true at the moment of action.'],
    ['Post-action verify', 'Reading back to confirm the effect.'],
    ['Rollback', 'Undoing a change after a failure.'],
    ['Compensation', 'A new action that reverses an old one.'],
  ],
  deeper: '<p><b>Rollback may be a new action.</b> You can\'t un-send an email or un-sail a ship. Many rollbacks are compensations, so plan them when the action is designed.</p><p><b>Same pattern, many systems.</b> Graph checkpoints in a database, durable objects, workflow engines: all pair replay with idempotency.</p><p><b>Interrupts persist too.</b> A pause for approval is itself state, so it must survive a crash.</p>',
  code: {
    title: 'One guarded action',
    note: 'Adapted from the course\'s checkpoint and rollback state machine (code/main.py).',
    text: `
def execute(action, approval, store):
    if store.done(action.key):                   # idempotency
        return store.result(action.key)
    if read_state(action.target) != approval.state:
        return pause("state changed since approval")
    result = action.run(key=action.key)
    if not verify(action, read_state(action.target)):
        action.compensate()                      # rollback
        return alert("verify failed, unwound")
    store.mark_done(action.key, result)
    return result
`,
  },
};
