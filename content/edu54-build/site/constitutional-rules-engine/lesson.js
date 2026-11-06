// Constitutional rules engine (phase 19, lesson 86): rules as data, for a Lusaka pharmacy helper. Each rule has a name, applies_when, must and an explanation. A real engine checks a draft, a fixer revises it, and a second pass confirms. Unfixed drafts are escalated.
const DRAFTS = [
  { n: 'A dose question', t: 'Take two tablets each morning.' },
  { n: 'A code reply', t: 'Here is the script: ```print(stock)```' },
  { n: 'Opening hours', t: 'We open at eight. Would you like a reminder?' },
];
const RULES = [
  { name: 'dose-needs-pharmacist', sev: 'high', when: /tablet|dose/i, must: /pharmacist/i, fix: t => `${t} Please confirm with the pharmacist.`, why: 'Doses are confirmed by a person.' },
  { name: 'code-states-assumption', sev: 'medium', when: /```/, must: /assumption:/i, fix: t => `${t} Assumption: stock is a list.`, why: 'Code says what it assumes.' },
  { name: 'ends-with-next-step', sev: 'low', when: /./, must: /[?]$|pharmacist\.$|list\.$/i, fix: t => `${t} Is there anything else?`, why: 'Replies end with a next step.' },
];
function check(t, rules, broad) { return rules.filter(r => (broad ? true : r.when.test(t)) && !r.must.test(t)); }
function run(o) {
  const rules = RULES.filter((r, i) => o.on[i]), draft = DRAFTS[o.i].t, first = check(draft, rules, o.broad);
  let t = draft, loops = 0; if (o.fixer) while (loops < 3) { const v = check(t, rules, o.broad); if (!v.length) break; if (o.badfix) { t += ' Noted.'; } else v.forEach(r => { t = r.fix(t); }); loops++; }
  const second = check(t, rules, o.broad);
  return { first, second, t, loops, verdict: !first.length ? 'accepted' : second.length ? 'escalated' : 'revised', changed: t !== draft, total: rules.length };
}

export default {
  slug: 'constitutional-rules-engine',
  title: 'A rules engine: a name, a test and a reason',
  description: 'Write rules as data. Check a draft, fix it, then check it again.',
  overview: 'Classifiers catch recognisable failures. Rules catch contractual ones, like "a dose is always confirmed by a pharmacist". A rule isn\'t a line of code buried in a prompt. It lives in a file with a name, a severity, a test for when it applies, a test for what must hold, and an explanation. Blocking is only half the job. The engine flags a draft, a fixer revises it, and the same engine checks the revision. If it still fails, it goes to a person. This runs for a pharmacy helper in Lusaka, on three drafts and three rules.',
  keywords: ['rules engine', 'constitution', 'guardrails', 'revision', 'AI safety', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.06, 0.7, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { i: 0, on: [true, true, true], fixer: true, badfix: false, broad: false }, st = { ...D0, on: [...D0.on] };
    const GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const mkM = () => new S.THREE.MeshLambertMaterial({ color: GOOD });
    const col = (x, n) => Array.from({ length: n }, (_, i) => { const m = mkM(), b = P.box(0.6, 0.14, 0.34, '#fff', { r: 0.02, material: m }); b.position.set(x, 0.03, -0.42 + i * 0.42); S.add(b); return { m, b }; });
    const A = col(-1.6, 3), B = col(0.75, 3);
    const rob = add(P.robot('#7B6FA8', { scale: 0.5 })); rob.position.set(-0.42, 0.03, 0);
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.13 })); lamp.position.set(1.95, 0.03, 0);
    S.add(P.keep(-2.3, 2.4, 0.9, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      const paint = (rows, v) => rows.forEach(({ m, b }, i) => { const r = RULES[i], on = st.on[i], bad = v.includes(r); m.color.set(!on ? GREY : bad ? RED : GOOD); b.scale.y = bad ? 2.4 : 1; });
      paint(A, R.first); paint(B, R.second); rob.userData.set({ busy: st.fixer && R.first.length > 0 });
      lamp.userData.set({ color: R.verdict === 'escalated' ? '#D9483B' : R.verdict === 'revised' ? '#E0A82E' : '#3E9B5F', on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const rule = (i, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st.on[i], set: v => { const on = [...st.on]; on[i] = !!v; set({ on }); } });
    const controls = [{ type: 'buttons', label: 'Draft', options: DRAFTS.map(d => d.n), get: () => st.i, act: i => set({ i }) }, tg('fixer', 'Fixer on', 'Fixer'), rule(0, 'Rule: doses need a pharmacist', 'Doses'), rule(1, 'Rule: code states an assumption', 'Code'), rule(2, 'Rule: end with a next step', 'Next step')];
    const readouts = [
      { label: 'Verdict', get: () => ({ v: R.verdict, good: R.verdict !== 'escalated', bad: R.verdict === 'escalated' }) },
      { label: 'Violations', get: () => ({ v: `${R.first.length}, then ${R.second.length}`, sub: `${R.loops} revisions` }) },
      { label: 'Final text', get: () => ({ v: R.t }) },
    ];
    const labels = [
      { name: 'a', t: 'First pass', d: 'Tall red: a rule failed', icon: 'eye', atV: V(-1.92, 0.15, 0) },
      { name: 'l', t: 'Verdict lamp', d: 'Amber revised, red escalated', icon: 'check', atV: V(2.15, 0.45, 0) },
    ];
    const reset = () => set({ ...D0, on: [...D0.on] });
    const breaks = [
      { label: 'No fixer', hint: 'it can only say no', on: () => set({ ...D0, on: [...D0.on], fixer: false }), off: reset },
      { label: 'A fixer that misses', hint: 'it never reads the reason', on: () => set({ ...D0, on: [...D0.on], badfix: true }), off: reset },
      { label: 'No applies_when', hint: 'every rule on every reply', on: () => set({ ...D0, on: [...D0.on], i: 2, broad: true }), off: reset },
    ];
    function status() {
      if (st.broad && R.first.length) return { ok: false, msg: `<b>${R.first.length} rules fired on a reply they have nothing to do with.</b> With no applies_when, a dose rule fires when no dose is mentioned.` };
      if (R.verdict === 'escalated') return { ok: false, msg: `<b>Still ${R.second.length} violations after ${R.loops} revisions.</b> It goes to a person. ${st.fixer ? 'A loop that changes nothing doesn\'t help.' : 'With no fixer, the rules can only say no.'}` };
      if (R.verdict === 'revised') return { ok: true, msg: `<b>${R.first.length} violations, and none after revising.</b> The same engine confirmed the fix.` };
      return { ok: true, msg: '<b>No rule failed, and the draft goes out as it is.</b>' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A contract', home: true, say: 'A pharmacy helper in Lusaka has promises to keep. Those are rules, not vibes.', act: m => m.set({ i: 2, on: [true, true, true], fixer: true, badfix: false, broad: false }) },
    { t: 'Rules as data', home: true, say: 'Each rule has a name, when it applies, what must hold, and why.', act: m => m.set({ i: 0, on: [true, true, true], fixer: false, badfix: false, broad: false }) },
    { t: 'Fix', home: true, say: 'A fixer revises the draft, with the reason in hand.', act: m => m.set({ i: 0, on: [true, true, true], fixer: true, badfix: false, broad: false }) },
    { t: 'Check again', home: true, say: 'The same engine checks the revision.', act: m => m.set({ i: 1, on: [true, true, true], fixer: true, badfix: false, broad: false }) },
    { t: 'Escalate', home: true, say: 'If it still fails, a person takes over.', act: m => m.set({ i: 0, on: [true, true, true], fixer: true, badfix: true, broad: false }) },
    { t: 'Applies when', home: true, say: 'Without a scope, a rule fires on everything, and people stop reading.', act: m => m.set({ i: 2, on: [true, true, true], fixer: true, badfix: false, broad: true }) },
  ],
  check: [
    { q: 'What must a rule have?', options: ['A name, a test and an explanation', 'A price', 'A model'], answer: 0, why: 'Otherwise it can\'t be reviewed.', hint: 'See Rules as data.' },
    { q: 'What happens after a fix?', options: ['The engine checks it again', 'It ships', 'It is deleted'], answer: 0, why: 'A fix is a claim.', hint: 'See Check again.' },
    { q: 'What does applies_when prevent?', options: ['Rules firing on everything', 'Slow code', 'Long replies'], answer: 0, why: 'It scopes a rule.', hint: 'Try No applies_when.' },
  ],
  terms: [['Constitution', 'A reviewed file of rules.'], ['applies_when', 'When a rule counts.'], ['must', 'What has to hold.'], ['Escalate', 'Hand to a person.']],
  deeper: '<p><b>Real code.</b> This small engine really checks and rewrites the three drafts.</p><p><b>Review.</b> Keep rules in version control, with their own review.</p>',
  code: {
    title: 'Check, fix, check',
    note: 'Adapted from the course\'s engine (code/main.py).',
    text: `
def review(draft, rules, fixer, tries=3):
    text = draft
    for _ in range(tries):
        bad = [r for r in rules if r.applies(text) and not r.holds(text)]
        if not bad:
            return "accepted", text
        text = fixer(text, bad)
    return "escalated", text
`,
  },
};
