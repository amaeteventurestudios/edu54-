// Jailbreak taxonomy (phase 19, lesson 82): six categories, one per trust boundary. A month of flagged prompts at a Kigali help desk becomes a histogram, and each defence catches a share of one category, so the coverage chart shows where the gaps are. Counts only: no attack text.
const CAT = [['Role play', 'the persona', 18], ['Instruction override', 'the system prompt', 26], ['Context smuggling', 'data posing as instruction', 12], ['Multi-turn ramp', 'the conversation history', 9], ['Encoding trick', 'the surface form', 7], ['Prefix injection', 'the next token', 14]];
const DEF = { persona: [0, 0.7], phrase: [1, 0.8], tags: [2, 0.7], history: [3, 0.6], norm: [4, 0.85], prefix: [5, 0.6] };
function run(o) {
  const hit = CAT.map(() => 0); Object.keys(DEF).forEach(k => { if (o[k]) hit[DEF[k][0]] = DEF[k][1]; });
  const caught = CAT.map((c, i) => Math.round(c[2] * hit[i])), missed = CAT.map((c, i) => c[2] - caught[i]);
  const all = CAT.reduce((a, c) => a + c[2], 0), got = caught.reduce((a, b) => a + b, 0), worst = missed.indexOf(Math.max(...missed));
  return { caught, missed, all, got, worst, share: got / all, gaps: hit.filter(h => !h).length };
}

export default {
  slug: 'jailbreak-taxonomy',
  title: 'A jailbreak taxonomy: name it before you defend it',
  description: 'Six categories, one per trust boundary. Labels turn a stream of attacks into a chart of your gaps.',
  overview: 'A team sees one trick, writes one pattern, and ships it. The next attempt is a paraphrase. Labels don\'t stop attacks, but they turn a stream of them into a histogram, and a histogram into a coverage chart that shows where to work next. This taxonomy has six categories, and each names the trust boundary being abused: the persona, the system prompt, the gap between data and instruction, the conversation history, the surface form of words, and the next token. This counts a month of flagged prompts at a help desk in Kigali. It shows shapes and counts only, never attack text.',
  keywords: ['jailbreak', 'taxonomy', 'prompt injection', 'AI safety', 'coverage', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { persona: true, phrase: true, tags: true, history: false, norm: true, prefix: false, flat: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', GREY = '#A9A396', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.76;
    const A = CAT.map((c, i) => { const t = add(P.tower(0.3, 0.4, GOOD)); t.position.set(X(i) - 0.17, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const B = CAT.map((c, i) => { const t = add(P.tower(0.3, 0.4, BAD)); t.position.set(X(i) + 0.17, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.4, 2.4, 1.2, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      CAT.forEach((c, i) => {
        if (st.flat) { const tot = R.all * 0.04 / CAT.length; A[i].userData.set({ h: tot, color: GREY }); B[i].userData.set({ h: tot, color: GREY }); return; }
        A[i].userData.set({ h: Math.max(0.03, R.caught[i] * 0.04), color: GOOD }); B[i].userData.set({ h: Math.max(0.03, R.missed[i] * 0.04), color: BAD });
      });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('persona', 'Persona guard', 'Persona'), tg('phrase', 'Override phrases', 'Phrases'), tg('tags', 'Mark data as data', 'Tags'), tg('history', 'Check the whole history', 'History'), tg('norm', 'Decode before checking', 'Decode'), tg('prefix', 'Guard the reply\'s start', 'Prefix')];
    const readouts = [
      { label: 'Caught', get: () => (st.flat ? { v: 'unknown', bad: true } : { v: `${R.got} of ${R.all}`, sub: `${Math.round(R.share * 100)}%`, good: R.share > 0.6, bad: R.share < 0.35 }) },
      { label: 'Categories with no defence', get: () => ({ v: st.flat ? 'unknown' : `${R.gaps} of 6`, good: !st.flat && R.gaps === 0, bad: st.flat || R.gaps > 2 }) },
      { label: 'Largest gap', get: () => (st.flat ? { v: 'unknown' } : { v: CAT[R.worst][0], sub: `abuses ${CAT[R.worst][1]}` }) },
    ];
    const labels = [
      { name: 'c', t: 'Teal: caught', d: 'Left bar of each pair', icon: 'check', atV: V(X(0) - 0.33, 0.15, -0.1) },
      { name: 'm', t: 'Coral: missed', d: 'One pair per category', icon: 'target', atV: V(X(5) + 0.33, 0.15, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One pattern, shipped', hint: 'and nothing else', on: () => set({ ...D0, persona: false, tags: false, norm: false }), off: reset },
      { label: 'No labels at all', hint: 'just "attacks"', on: () => set({ ...D0, flat: true }), off: reset },
    ];
    function status() {
      if (st.flat) return { ok: false, msg: `<b>${R.all} flagged prompts, and no way to see which kind.</b> Without labels, every bar is the same grey, and you can\'t tell what to fix next.` };
      if (R.gaps > 2) return { ok: false, msg: `<b>${R.gaps} categories have no defence.</b> ${R.got} of ${R.all} caught. The largest gap is ${CAT[R.worst][0].toLowerCase()}.` };
      return { ok: true, msg: `<b>${R.got} of ${R.all} caught, with ${R.gaps} categories open.</b> Next work: ${CAT[R.worst][0].toLowerCase()}.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One pattern', home: true, say: 'A help desk in Kigali blocks one famous phrase, and feels safe.', act: m => m.set({ persona: false, phrase: true, tags: false, history: false, norm: false, prefix: false, flat: false }) },
    { t: 'No labels', home: true, say: 'A month of flagged prompts is just a number until each has a label.', act: m => m.set({ persona: false, phrase: true, tags: false, history: false, norm: false, prefix: false, flat: true }) },
    { t: 'Six boundaries', home: true, say: 'Each category names the trust boundary it abuses, from the persona to the next token.', act: m => m.set({ persona: false, phrase: true, tags: false, history: false, norm: false, prefix: false, flat: false }) },
    { t: 'See the gaps', home: true, say: 'Now the chart shows what got through, and where.', act: m => m.set({ persona: true, phrase: true, tags: false, history: false, norm: false, prefix: false, flat: false }) },
    { t: 'Work the chart', home: true, say: 'Add a defence for the largest gap, then count again.', act: m => m.set({ persona: true, phrase: true, tags: true, history: false, norm: true, prefix: false, flat: false }) },
    { t: 'Keep counting', home: true, say: 'No defence catches everything. The labels show what to do next.', act: m => m.set({ persona: true, phrase: true, tags: true, history: true, norm: true, prefix: true, flat: false }) },
  ],
  check: [
    { q: 'What do labels give you?', options: ['A chart of your gaps', 'A stop to all attacks', 'Faster replies'], answer: 0, why: 'A histogram becomes a coverage chart.', hint: 'Try No labels at all.' },
    { q: 'What does each category name?', options: ['A trust boundary', 'A model', 'A country'], answer: 0, why: 'What the attack abuses.', hint: 'See Six boundaries.' },
    { q: 'Why is one pattern not enough?', options: ['A paraphrase walks past it', 'It is too slow', 'It costs too much'], answer: 0, why: 'And other categories stay open.', hint: 'Try One pattern, shipped.' },
  ],
  terms: [['Taxonomy', 'A shared set of labels.'], ['Trust boundary', 'A line the system relies on.'], ['Coverage', 'The share a defence catches.'], ['Fixture', 'A hand-made test case.']],
  deeper: '<p><b>Numbers.</b> The counts and catch rates here are invented for the lesson.</p><p><b>Agreement.</b> A good taxonomy is one where two reviewers usually pick the same label.</p>',
  code: {
    title: 'The chart',
    note: 'Adapted from the course\'s taxonomy (code/main.py).',
    text: `
CATEGORIES = ["role_play", "instruction_override", "context_smuggling",
              "multi_turn_ramp", "encoding_trick", "prefix_injection"]

def coverage(fixtures, detector):
    return {c: mean(detector(f) for f in fixtures if f.category == c)
            for c in CATEGORIES}
`,
  },
};
