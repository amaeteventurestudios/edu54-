// Capstone: a production RAG chatbot (phase 19, capstone 8). A Nairobi insurer's policy bot runs in full: question, retrieve, answer, cite, log, feedback. A ring of six stations, twenty seeded questions, a refusal rule and a person to hand to.
// Five questions have no source in the policies. Without a refusal rule, those become invented cover. Personal data is removed before the log. Feedback improves the index over time.
const QS = [...Array(20)].map((_, i) => ({ known: i % 4 !== 3, pii: i % 5 === 0 }));
function run(o) {
  let right = 0, made = 0, sent = 0, leak = 0;
  QS.forEach((q, i) => {
    const has = q.known || (o.feedback && i % 8 === 3);
    if (q.pii && o.log && !o.redact) leak++;
    if (has) { right += o.cite || i % 6 !== 0 ? 1 : 0; if (!o.cite && i % 6 === 0) made++; return; }
    if (o.refuse) sent++; else made++;
  });
  return { right, made, sent, leak, audit: o.log };
}

export default {
  slug: 'production-rag-chatbot',
  title: 'Capstone: a policy chatbot you can put in front of customers',
  description: 'Question, retrieve, answer, cite, log, feedback. The whole system runs, in a business where wrong answers cost money.',
  overview: 'A regulated business is the most common place for RAG, because the value is clear and so are the stakes. Retrieval is the easy part. The hard part is everything around it. The bot must refuse when no policy covers a question, not improvise. Each claim must cite a clause. Personal data must stay out of the logs, while a record of what was said must stay in. A person must be one step away. And what customers ask, and how they rate it, must feed back into the index. This capstone runs all six stations for an insurer in Nairobi, on twenty questions. Five have no answer in the policies.',
  keywords: ['RAG', 'regulated AI', 'citations', 'refusal', 'audit log', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.05, 0.85, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { refuse: true, cite: true, log: true, redact: true, feedback: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const base = P.cyl(1.2, 0.05, '#D8D2C4'); base.position.set(-0.9, 0, 0); S.add(base);
    const STN = ['Question', 'Retrieve', 'Answer', 'Cite', 'Log', 'Feedback'], A = i => i / 6 * Math.PI * 2 - Math.PI / 2, PT = i => V(-0.9 + Math.cos(A(i)) * 0.9, 0.05, Math.sin(A(i)) * 0.9);
    const St = STN.map((n, i) => { const m = new S.THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.42, 0.32, 0.42, '#fff', { r: 0.05, material: m }); b.position.copy(PT(i)); S.add(b); return m; });
    const hub = add(P.robot(SAF, { scale: 0.7 })); hub.position.set(-0.9, 0.05, 0);
    const dot = P.ball(0.09, SAF); dot.userData.noFit = true; S.add(dot);
    const T = [0, 1, 2, 3].map(i => { const t = add(P.tower(0.36, 0.4, [GOOD, '#B5462F', '#5B8DB8', BAD][i])); t.position.set(0.95 + i * 0.45, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const person = add(P.robot('#A87A4F', { scale: 0.6 })); person.position.set(1.55, 0.03, 0.55);
    S.add(P.keep(-2.15, 2.5, 1.0, -1.2, 1.2));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      St.forEach((m, i) => m.color.set(i === 3 && !st.cite ? GREY : i === 4 && !st.log ? GREY : i === 5 && !st.feedback ? GREY : BLUE));
      [R.right, R.made, R.sent, R.leak].forEach((v, i) => T[i].userData.set({ h: Math.max(0.04, v * 0.05) }));
      person.userData.set({ busy: R.sent > 0 }); hub.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('refuse', 'No source, no answer: hand to a person', 'Refuse'), tg('cite', 'Each claim cites a clause', 'Cite'), tg('log', 'Keep an audit log', 'Log'), tg('redact', 'Remove personal data before logging', 'Redact'), tg('feedback', 'Feed gaps back into the index', 'Feedback')];
    const readouts = [
      { label: 'Answered from policy', get: () => ({ v: `${R.right} of 20`, sub: 'with a source', good: R.right >= 15 }) },
      { label: 'Invented answers', get: () => ({ v: `${R.made}`, sub: 'promised cover that isn\'t there', good: !R.made, bad: R.made > 0 }) },
      { label: 'Personal data in logs', get: () => ({ v: `${R.leak}`, sub: `${R.sent} handed to people`, good: !R.leak, bad: R.leak > 0 }) },
    ];
    const labels = [
      { name: 'r', t: 'Six stations', d: 'Question round to feedback', icon: 'link', atV: V(-2.05, 0.2, 0) },
      { name: 't', t: 'Good, invented, sent up, leaked', d: 'Only the first should be tall', icon: 'target', atV: V(2.42, 0.1, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Always answer', hint: 'no refusal rule', on: () => set({ ...D0, refuse: false }), off: reset },
      { label: 'Log everything as it is', hint: 'names and ID numbers', on: () => set({ ...D0, redact: false }), off: reset },
      { label: 'No citations', hint: 'unchecked claims', on: () => set({ ...D0, cite: false }), off: reset },
      { label: 'No log', hint: 'a regulator asks', on: () => set({ ...D0, log: false }), off: reset },
    ];
    function status() {
      if (R.made && !st.refuse) return { ok: false, msg: `<b>${R.made} customers were promised cover that doesn't exist.</b> A model always has words. In insurance, an invented clause can bind the firm. No source means no answer, and a person takes over.` };
      if (R.made) return { ok: false, msg: `<b>${R.made} answers drifted from the text.</b> With no citation there is nothing to check. Requiring a clause per claim makes the model stay close.` };
      if (R.leak) return { ok: false, msg: `<b>${R.leak} logs now hold names and ID numbers.</b> You need a log, and it mustn't become a new breach. Remove personal data on the way in.` };
      if (!st.log) return { ok: false, msg: '<b>The regulator asks what you told a customer, and you can\'t say.</b> An audit trail is part of the product.' };
      return { ok: true, msg: `<b>${R.right} answered with sources, ${R.sent} handed to people, nothing invented.</b> ${st.feedback ? 'What customers asked has also started to fill the gaps.' : ''}` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.7) % 6; const i = Math.floor(u), a = PT(i), b = PT((i + 1) % 6), p = a.clone().lerp(b, u - i); dot.position.set(p.x, 0.5, p.z); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'The whole ring', home: true, say: 'An insurer in Nairobi puts a bot in front of customers. Question, retrieve, answer, cite, log, feedback.', act: m => m.set({ refuse: true, cite: true, log: true, redact: true, feedback: true }) },
    { t: 'No source, no answer', home: true, say: 'Five questions have no answer in the policies. Without a refusal rule, the bot invents cover.', act: m => m.set({ refuse: false, cite: true, log: true, redact: true, feedback: false }) },
    { t: 'Cite a clause', home: true, say: 'Each claim must point to a clause. That keeps the model close to the text, and lets people check.', act: m => m.set({ refuse: true, cite: false, log: true, redact: true, feedback: false }) },
    { t: 'The log', home: true, say: 'Regulators ask what was said. Keep a record, with personal data removed first.', act: m => m.set({ refuse: true, cite: true, log: true, redact: false, feedback: false }) },
    { t: 'A person', home: true, say: 'When the bot refuses, a person takes the call. That handoff is part of the design.', act: m => m.set({ refuse: true, cite: true, log: true, redact: true, feedback: false }) },
    { t: 'Close the loop', home: true, say: 'What customers ask shows what the index lacks. Feed it back, and the ring turns.', act: m => m.set({ refuse: true, cite: true, log: true, redact: true, feedback: true }) },
  ],
  check: [
    { q: 'What should the bot do when no policy covers a question?', options: ['Refuse and hand to a person', 'Answer anyway', 'Guess politely'], answer: 0, why: 'An invented clause can bind the firm.', hint: 'Try Always answer.' },
    { q: 'What must happen before logging?', options: ['Remove personal data', 'Compress it', 'Translate it'], answer: 0, why: 'Otherwise the log becomes a breach.', hint: 'Try Log everything as it is.' },
    { q: 'What does feedback add?', options: ['It shows gaps in the index', 'Faster retrieval', 'Lower cost'], answer: 0, why: 'Real questions show what is missing.', hint: 'See Close the loop.' },
  ],
  terms: [['Refusal rule', 'No source, no answer.'], ['Citation', 'A pointer to the clause used.'], ['Audit trail', 'A record of what was said.'], ['Redaction', 'Removing personal data.'], ['Handoff', 'Passing to a person.']],
  deeper: '<p><b>Evaluate on your clauses.</b> Keep a test set with questions that have no answer, as well as ones that do.</p><p><b>Earlier lessons.</b> RAG, grounding and evaluation lessons explain each station. Here they run together.</p><p><b>Counts</b> come from twenty seeded questions.</p>',
  code: {
    title: 'No source, no answer',
    note: 'A sketch of the course\'s capstone (code/main.py).',
    text: `
def reply(question):
    hits = retrieve(question)
    if not hits or hits[0].score < MIN_SCORE:
        return handoff(question)
    answer = model(question, hits, rule="Cite a clause per claim.")
    audit_log(redact(question), answer, hits)
    return answer
`,
  },
};
