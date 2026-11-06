// Propose then commit, with checkpoints and rollback (phase 15, lessons 15 and 16): a Lusaka water utility's agent proposes moving 300
// meter-reading visits and texting each household. The proposal is persisted with its intent, lineage, permissions, blast radius, rollback plan
// and idempotency key; a person reviews it overnight; the commit crashes after 180 texts and resumes on another worker; 12 visits were changed by
// hand meanwhile; and 9 texts report success without arriving. Each safeguard's effect is computed live.
const FIELDS = [['intent', 'clear the 4 Nov outage'], ['lineage', 'this morning\'s export'], ['permissions', 'schedule, sms'], ['blast radius', '300 homes, 300 texts'], ['rollback', 'old dates + correction'], ['idempotency key', 'move-visits-1102']];
function run(o) {
  const stale = !(o.structured && o.checklist) ? 30 : 0;
  const dup = o.key ? 0 : 180, overwrite = o.pre ? 0 : 12, lost = o.verify ? 0 : 9, fixed = o.verify && o.rollback ? 9 : 0, stuck = o.verify && !o.rollback ? 9 : 0;
  return { stale, dup, overwrite, lost, fixed, stuck, harm: stale + dup + overwrite + lost + stuck };
}

export default {
  slug: 'propose-then-commit',
  title: 'Propose, review, commit, verify, roll back',
  description: 'A water utility in Lusaka has an agent move 300 meter-reading visits and text each household. The commit crashes halfway. Turn on each safeguard and count what goes wrong without it.',
  overview: 'The 2023-era pattern for a person in the loop was a synchronous prompt: the agent wants to do this, approve? People approve fast, approvals predict little, and when things go wrong the audit trail is a row of approvals nobody really gave. The pattern that replaced it is propose then commit. The agent proposes an action, and the proposal is persisted to a durable store with its intent, data lineage (what source led to it), the permissions it touches, its blast radius, a rollback plan and an idempotency key. A person, not the agent, reviews it with all of that in view; a short challenge checklist (do you know what this touches? is the blast radius acceptable? is there a way back?) must be answered before Approve is enabled, which is how stale data gets noticed. Commit needs positive acknowledgement. The wait can last a night, because the paused workflow is durable. Then make execution survive reality. Persist every state transition, so if a worker crashes its lease expires and another resumes from the last checkpoint. The idempotency key stops a resumed commit from sending everything twice. A precondition check confirms the world is still what was approved, since people may have changed things in between. Post-action verification reads the result back: "the API returned 200" is not proof the text arrived. If verification fails, the rollback plan runs: an in-band reversal, or a compensating action in the saga style. For actions in high-risk systems, regulation now expects this kind of effective human oversight.',
  keywords: ['human in the loop', 'propose then commit', 'idempotency', 'rollback', 'sagas', 'AI agents', 'oversight'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, -0.1], dir: [0.05, 0.9, 1.15], half: 1.05, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { structured: true, checklist: true, key: true, pre: true, verify: true, rollback: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const shelf = P.shelf(3, { levels: 2, cell: 0.36, lh: 0.32, d: 0.36 }); shelf.position.set(-2.2, 0, -0.1); S.add(shelf);
    const STN = ['review', 'commit', 'crash', 'resume', 'pre', 'exec', 'verify', 'roll'];
    const SX = i => -1.1 + i * 0.5, SZ = -0.4;
    const stations = STN.map((id, i) => {
      const pad = P.box(0.4, 0.04, 0.4, '#D8D2C4', { r: 0.03 }); pad.position.set(SX(i), 0, SZ); S.add(pad);
      const l = P.lamp('#FFFFFF', { h: 0.28 }); l.position.set(SX(i), 0.04, SZ); S.add(l);
      return { id, l };
    });
    const belt = P.belt(V(-1.35, 0, 0.15), V(2.65, 0, 0.15), { w: 0.34, speed: 0.9 }); S.add(belt);
    S.add(P.keep(-2.75, 2.75, 0.75, -0.6, 0.4));
    let R = null;
    function draw() {
      R = run(st);
      shelf.userData.set({ fill: FIELDS.map(([k]) => { const on = st.structured && (k !== 'idempotency key' || st.key) && (k !== 'rollback' || st.rollback); return !on ? 0 : k === 'lineage' && R.stale ? RED : '#5B8DB8'; }) });
      const S2 = {
        review: st.structured && st.checklist ? GOOD : BAD, commit: null, crash: SAF, resume: st.key ? GOOD : BAD, pre: st.pre ? GOOD : BAD,
        exec: null, verify: st.verify ? SAF : BAD, roll: !st.verify ? null : st.rollback ? GOOD : BAD,
      };
      stations.forEach(s => s.l.userData.set({ color: S2[s.id] || '#FFFFFF', on: !!S2[s.id] }));
    }
    let tt = 0, n = 0;
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Persist a structured proposal (intent, lineage, blast radius…)', short: 'Structured', get: () => st.structured, set: v => set({ structured: !!v }) },
      { type: 'toggle', label: 'Challenge checklist before Approve is enabled', short: 'Checklist', get: () => st.checklist, set: v => set({ checklist: !!v }) },
      { type: 'toggle', label: 'Idempotency key on the commit', short: 'Idempotency', get: () => st.key, set: v => set({ key: !!v }) },
      { type: 'toggle', label: 'Precondition check before executing', short: 'Precondition', get: () => st.pre, set: v => set({ pre: !!v }) },
      { type: 'toggle', label: 'Read back to verify every side effect', short: 'Verify', get: () => st.verify, set: v => set({ verify: !!v }) },
      { type: 'toggle', label: 'A rollback plan in the proposal', short: 'Rollback', get: () => st.rollback, set: v => set({ rollback: !!v }) },
    ];
    const readouts = [
      { label: 'Households wrong', get: () => ({ v: String(R.stale + R.overwrite + R.stuck + R.lost), sub: 'of 300', good: !(R.stale + R.overwrite + R.stuck + R.lost), bad: R.stale + R.overwrite + R.stuck + R.lost > 0 }) },
      { label: 'Duplicate texts', get: () => ({ v: String(R.dup), sub: 'after the resume', good: !R.dup, bad: R.dup > 0 }) },
      { label: 'Fixed by rollback', get: () => ({ v: String(R.fixed), sub: R.fixed ? 'texts re-sent' : 'none needed or possible' }) },
    ];
    const labels = [
      { name: 'card', t: 'The proposal', d: 'Six fields. Red: stale', icon: 'book', atV: V(-2.75, 0.3, -0.1) },
      { name: 'flow', t: 'Commit that survives', d: 'Red texts: households wrong', icon: 'reset', atV: V(2.65, 0.1, 0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Show a bare "approve?" button', hint: 'rubber stamp', on: () => set({ ...D0, structured: false, checklist: false }), off: reset },
      { label: 'Resume without an idempotency key', hint: 'double send', on: () => set({ ...D0, key: false }), off: reset },
      { label: 'Trust "200 OK" without reading back', hint: 'silent loss', on: () => set({ ...D0, verify: false }), off: reset },
    ];
    function status() {
      if (!st.structured || !st.checklist) return { ok: false, msg: `<b>${!st.structured ? 'A bare "approve?" prompt' : 'A proposal without a checklist'} was approved in two seconds, and nobody noticed it was built from a schedule export three days old: ${R.stale} visits moved onto dates that no longer made sense.</b> Show the intent, lineage, blast radius and rollback, and require the checklist before Approve works.` };
      if (!st.key) return { ok: false, msg: '<b>The worker crashed after 180 texts; another resumed from the checkpoint and, with no idempotency key, sent all 180 again.</b> The approval was given once; the side effect must happen once. Tie the commit to a unique key so a resubmission returns the same record.' };
      if (!st.pre) return { ok: false, msg: '<b>Between the approval and the resume, staff moved 12 visits by hand. With no precondition check, the agent overwrote them with the plan approved the night before.</b> Before executing, confirm the state is still what was approved; if not, stop and re-propose.' };
      if (!st.verify) return { ok: false, msg: '<b>The text provider answered "200 OK" for every message, and 9 never arrived. Nobody read back, so those households expect no visit and won\'t be home.</b> Verification re-reads the target: check the delivery receipts, not the response code.' };
      if (!st.rollback) return { ok: false, msg: '<b>Read-back found 9 texts undelivered, and there was no rollback plan: the system knows it is in a bad state and has no planned way out.</b> Every proposal should carry its rollback: re-send, reverse, or a compensating action.' };
      return { ok: true, msg: '<b>The checklist caught the stale export before approval; after the crash the key skipped the 180 texts already sent; the precondition left 12 manual changes alone; read-back found 9 undelivered texts and the rollback plan re-sent them.</b> All 300 households right, one text each, confirmed.' };
    }
    const update = dt => {
      belt.userData.tick(dt); tt += dt;
      if (tt > 0.45) { tt = 0; n++; const share = Math.min(1, R.harm / 300); belt.userData.send(n % 10 < Math.round(share * 10) ? RED : GOOD, { size: 0.16 }); }
    };
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'An agent proposes', home: true, say: 'A water utility in Lusaka has its agent move three hundred meter-reading visits and text each household.', act: m => m.set({ structured: false, checklist: false, key: true, pre: true, verify: true, rollback: true }) },
    { t: 'A real review', home: true, say: 'The proposal carries its intent, its sources, its blast radius and a way back. A checklist makes the reviewer read it, and the stale export is caught.', act: m => m.set({ structured: true, checklist: true, key: true, pre: true, verify: true, rollback: true }) },
    { t: 'A crash mid-commit', home: true, say: 'A worker crashes after a hundred and eighty texts. Without an idempotency key, the resume sends them all again.', act: m => m.set({ structured: true, checklist: true, key: false, pre: true, verify: true, rollback: true }) },
    { t: 'Is it still true?', home: true, say: 'Overnight, staff moved twelve visits by hand. A precondition check leaves them alone.', act: m => m.set({ structured: true, checklist: true, key: true, pre: false, verify: true, rollback: true }) },
    { t: 'Read it back', home: true, say: 'Nine texts reported success and never arrived. Only reading back finds them.', act: m => m.set({ structured: true, checklist: true, key: true, pre: true, verify: false, rollback: true }) },
    { t: 'A way back', home: true, say: 'The rollback plan re-sends the nine. Propose, review, commit, verify, and roll back when needed.', act: m => m.set({ structured: true, checklist: true, key: true, pre: true, verify: true, rollback: true }) },
  ],
  check: [
    { q: 'Why is a bare "approve?" button weak oversight?', options: ['People approve fast without seeing lineage or blast radius', 'It is too slow', 'Agents can\'t ask'], answer: 0, why: 'Structure and a checklist make review real.', hint: 'Try Show a bare approve button.' },
    { q: 'What stops a resumed commit from sending everything twice?', options: ['An idempotency key', 'A faster worker', 'A second approval'], answer: 0, why: 'One approval, one side effect.', hint: 'Try Resume without an idempotency key.' },
    { q: 'The API returned 200 for every text. Is that verification?', options: ['No: read the result back', 'Yes', 'Only for SMS'], answer: 0, why: 'Check delivery, not the response code.', hint: 'Try Trust 200 OK.' },
  ],
  terms: [
    ['Propose then commit', 'Persist a proposal, have a person review it, commit on approval.'],
    ['Data lineage', 'The sources that led to a proposal.'],
    ['Challenge checklist', 'Questions to answer before Approve is enabled.'],
    ['Precondition check', 'Confirm the state is still what was approved.'],
    ['Post-action verification', 'Read the target back to confirm the effect.'],
    ['Compensating action', 'A new action that undoes an earlier one (the saga pattern).'],
  ],
  deeper: '<p><b>Leases.</b> A worker holds a short-lived lease on a run; if it crashes the lease expires and another worker picks up from the last persisted transition, which is how in-flight work survives rolling deploys.</p><p><b>Every transition persists.</b> A few extra writes buy precise recovery wherever the crash lands.</p><p><b>About this machine.</b> The 300 visits, the crash after 180, the 12 manual changes and the 9 lost texts are fixed; which safeguards catch them is decided live.</p>',
  code: {
    title: 'Propose, commit, verify',
    note: 'Adapted from the course\'s propose-then-commit and rollback sketches.',
    text: `
def propose(action, store):
    p = Proposal(action, intent=..., lineage=..., permissions=..., blast_radius=...,
                 rollback=plan_rollback(action), key=f"{action.name}-{action.date}")
    return store.put_if_absent(p.key, p)         # resubmitting returns the same record

def commit(p, store, world):
    if not store.approved(p.key): return "waiting"            # durable pause
    if world.snapshot(p.scope) != p.approved_state:
        return reprose(p)                                     # precondition failed
    for item in p.items:
        if store.done(p.key, item.id): continue               # idempotent resume
        world.apply(item, idempotency_key=f"{p.key}/{item.id}")
        store.mark(p.key, item.id)
    bad = [i for i in p.items if not world.read_back(i)]      # verify
    if bad: run(p.rollback, bad)
`,
  },
};
