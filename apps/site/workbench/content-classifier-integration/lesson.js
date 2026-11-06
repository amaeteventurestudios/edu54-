// Output classifiers (phase 19, lesson 85): three checks read a model's reply at a Blantyre clinic desk: personal data (real regexes), leaked instructions (word overlap with the system prompt) and abuse (severity comes with the sample). The router takes the highest severity and acts: log, warn, redact or block.
const SYS = 'you are the desk helper for lakeside clinic and you never share staff rotas';
const OUT = [
  { n: 'A plain reply', t: 'Your booking is on Tuesday at nine.' },
  { n: 'Names a contact', t: 'Write to tamanda@example.com or call 0999 000 111.' },
  { n: 'Repeats its rules', t: 'I am the desk helper for lakeside clinic and I never share staff rotas.' },
  { n: 'Rude reply', t: 'A rude reply (hidden in this lesson).', rude: 'high' },
  { n: 'Mildly sharp', t: 'A sharp reply (hidden in this lesson).', rude: 'low' },
];
const RANK = { none: 0, low: 1, medium: 2, high: 3 }, ACT = ['log', 'warn', 'redact', 'block'];
function pii(t) { const m = t.match(/[\w.]+@[\w.]+\.\w+|\b\d{4}\s\d{3}\s\d{3}\b/g) || []; return { sev: m.length ? 'medium' : 'none', m }; }
function leak(t) { const w = a => { const s = a.toLowerCase().replace(/[.,]/g, '').split(' '), o = new Set(); for (let i = 0; i + 3 <= s.length; i++) o.add(s.slice(i, i + 3).join(' ')); return o; }, a = w(t), b = w(SYS); let c = 0; a.forEach(k => { if (b.has(k)) c++; }); const f = b.size ? c / b.size : 0; return { sev: f > 0.5 ? 'high' : f > 0.2 ? 'medium' : 'none', f }; }
function run(o) {
  const s = OUT[o.i], P0 = o.pii ? pii(s.t) : { sev: 'none', m: [] }, L = o.leak ? leak(s.t) : { sev: 'none', f: 0 }, T = o.tox ? (s.rude || 'none') : 'none';
  const top = Math.max(RANK[P0.sev], RANK[L.sev], RANK[T]), bad = pii(s.t).sev !== 'none' || leak(s.t).sev !== 'none' || !!s.rude;
  let text = s.t; if (top === 3) text = 'Sorry, I can\'t send that reply.'; else if (top === 2) P0.m.forEach(m => { text = text.replace(m, '[removed]'); });
  return { p: P0.sev, l: L.sev, t: T, top, act: ACT[top], text, slip: bad && top === 0, f: L.f };
}

export default {
  slug: 'content-classifier-integration',
  title: 'Output checks: reading the reply before it leaves',
  description: 'A model can pass every input check and still leak. Three checks read the reply, and a router decides.',
  overview: 'Inputs aren\'t the only attack surface. A reply can leak personal data or echo the system prompt, whatever the prompt looked like. Output checks ask a different question from input checks, and they catch attacks that input rules have never seen. Three independent checks each return a severity: abuse, personal data, and instruction leakage. One router applies one table: high blocks, medium redacts, low warns, none logs. The highest severity wins, and a reply is sent only after the checks finish. This runs on five sample replies at a clinic desk in Blantyre.',
  keywords: ['output classifier', 'PII', 'redaction', 'policy router', 'AI safety', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0], dir: [0.06, 0.7, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { i: 1, tox: true, pii: true, leak: true }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C', BAD = '#E07A5F', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const C = { none: GOOD, low: SAF, medium: BAD, high: RED };
    const rob = add(P.robot('#7B6FA8', { scale: 0.5 })); rob.position.set(-2.0, 0.03, 0);
    const X = i => -0.95 + i * 0.75;
    const St = [0, 1, 2].map(i => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.55, 0.42, 0.7, '#fff', { r: 0.04, material: m }); b.position.set(X(i), 0.03, 0); S.add(b); return m; });
    const R1 = add(P.lamp(GOOD, { h: 0.55, r: 0.14 })); R1.position.set(1.55, 0.03, 0);
    const out = new S.THREE.MeshLambertMaterial({ color: GOOD }), O = P.box(0.42, 0.3, 0.6, '#fff', { r: 0.04, material: out }); O.position.set(2.15, 0.03, 0); S.add(O);
    S.add(P.keep(-2.4, 2.45, 0.9, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); St[0].color.set(st.tox ? C[R.t] : GREY); St[1].color.set(st.pii ? C[R.p] : GREY); St[2].color.set(st.leak ? C[R.l] : GREY); R1.userData.set({ color: ['#3E9B5F', '#E0A82E', '#D9783B', '#D9483B'][R.top], on: true }); out.color.set(R.slip ? RED : R.top === 3 ? GREY : GOOD); O.visible = R.top !== 3; }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'Reply', options: OUT.map(o => o.n), get: () => st.i, act: i => set({ i }) }, tg('tox', 'Abuse check', 'Abuse'), tg('pii', 'Personal data check', 'Personal'), tg('leak', 'Leak check', 'Leak')];
    const readouts = [
      { label: 'What leaves', get: () => ({ v: R.text, good: !R.slip, bad: R.slip }) },
      { label: 'Severity', get: () => ({ v: `${R.t}, ${R.p}, ${R.l}`, sub: 'abuse, personal, leak' }) },
      { label: 'Action', get: () => ({ v: R.act, good: !R.slip, bad: R.slip }) },
    ];
    const labels = [
      { name: 'c', t: 'Three checks', d: 'Each returns a severity', icon: 'eye', atV: V(X(0) - 0.3, 0.3, 0) },
      { name: 'o', t: 'What leaves', d: 'Gone if blocked', icon: 'right', atV: V(2.38, 0.2, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No personal data check', hint: 'a contact goes out', on: () => set({ ...D0, i: 1, pii: false }), off: reset },
      { label: 'No leak check', hint: 'its rules go out', on: () => set({ ...D0, i: 2, leak: false }), off: reset },
    ];
    function status() {
      if (R.slip) return { ok: false, msg: `<b>The reply went out unchanged.</b> It passed the input side, and with this check off, nothing read it on the way out.` };
      if (R.top === 3) return { ok: true, msg: '<b>High severity: blocked.</b> The reply is dropped, and the person gets a short refusal.' };
      if (R.top === 2) return { ok: true, msg: '<b>Medium severity: redacted.</b> The reply goes out with the details removed.' };
      if (R.top === 1) return { ok: true, msg: '<b>Low severity: sent with a warning in the log.</b>' };
      return { ok: true, msg: '<b>Nothing found: logged and sent.</b>' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The other door', home: true, say: 'A clinic desk in Blantyre checks every prompt. Replies can still go wrong.', act: m => m.set({ i: 1, tox: true, pii: false, leak: true }) },
    { t: 'Three checks', home: true, say: 'Three independent checks read each reply, and each returns a severity.', act: m => m.set({ i: 0, tox: true, pii: true, leak: true }) },
    { t: 'Redact', home: true, say: 'Medium severity removes the detail, and the reply still goes out.', act: m => m.set({ i: 1, tox: true, pii: true, leak: true }) },
    { t: 'Block', home: true, say: 'A reply that repeats its own rules is high severity, so it\'s dropped.', act: m => m.set({ i: 2, tox: true, pii: true, leak: true }) },
    { t: 'Warn', home: true, say: 'Low severity goes out with a note in the log.', act: m => m.set({ i: 4, tox: true, pii: true, leak: true }) },
    { t: 'One table', home: true, say: 'One router, one table. The highest severity wins.', act: m => m.set({ i: 3, tox: true, pii: true, leak: true }) },
  ],
  check: [
    { q: 'Why check outputs at all?', options: ['A reply can leak whatever the prompt was', 'To go faster', 'To save tokens'], answer: 0, why: 'New attacks pass input rules.', hint: 'See The other door.' },
    { q: 'What does medium severity do?', options: ['Redacts', 'Blocks', 'Ignores'], answer: 0, why: 'That\'s the table.', hint: 'See Redact.' },
    { q: 'What decides the action?', options: ['The highest severity', 'The average', 'The first check'], answer: 0, why: 'The worst finding wins.', hint: 'See One table.' },
  ],
  terms: [['PII', 'Personal data.'], ['Redact', 'Remove a detail.'], ['Router', 'Maps severity to action.'], ['Instruction leakage', 'Repeating the system prompt.']],
  deeper: '<p><b>Real code.</b> The personal data and leak checks run live. The sample contact is invented.</p><p><b>Abuse.</b> The severity for those two samples is fixed, and their words are not shown.</p>',
  code: {
    title: 'The router',
    note: 'Adapted from the course\'s router (code/main.py).',
    text: `
ACTION = {"high": "block", "medium": "redact", "low": "warn", "none": "log"}
ORDER = ["none", "low", "medium", "high"]

def route(verdicts):
    worst = max((v.severity for v in verdicts), key=ORDER.index)
    return ACTION[worst]
`,
  },
};
