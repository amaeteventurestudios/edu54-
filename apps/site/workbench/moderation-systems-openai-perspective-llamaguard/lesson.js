// Moderation systems (phase 18, lesson 29): a Dar es Salaam forum in Swahili and Sheng. Twenty seeded messages with a harm score and a language pass three sieves: input, output, and a custom rule. A threshold slider trades blocked honest posts for harm let through.
// Scores for messages in a less-served language are compressed, so a global threshold misses harm there. All counts come from the loop. No message text appears anywhere.
const MSG = Array.from({ length: 20 }, (_, i) => { const harm = i % 4 === 0, sw = i % 2 === 1 || i % 8 === 0; const base = harm ? 0.72 + ((i * 7) % 20) / 100 : 0.08 + ((i * 13) % 40) / 100; return { harm, sw, s: sw ? base * 0.45 + 0.06 : base }; });
function run(o) {
  let miss = 0, wrong = 0, out = 0;
  MSG.forEach(m => {
    let block = m.s >= o.th && o.input;
    if (!block && o.custom && m.sw && m.s >= o.th * 0.62) block = true;
    if (m.harm && !block) { if (o.output && !m.sw) out++; else miss++; }
    if (!m.harm && block) wrong++;
  });
  return { miss, wrong, out };
}

export default {
  slug: 'moderation-systems-openai-perspective-llamaguard',
  title: 'Moderation systems: three sieves and one blind spot',
  description: 'Twenty messages, three sieves, one threshold. See who gets blocked by mistake, and whose language the filters barely read.',
  overview: 'Moderation sits where users touch the product, and the usual setup has three layers. An input check catches a bad request before any model runs. An output check catches a bad reply. A custom layer holds your own rules. OpenAI\'s moderation API, Llama Guard and the older Perspective API sort content in different ways, so their scores don\'t compare. Each layer fails in its own way: input checks miss harm that only appears in a reply, output checks come late, and custom rules drift. There is also a quieter problem. Classifiers trained mostly on English score other languages poorly, so one global threshold can be strict in English and blind in Sheng.',
  keywords: ['content moderation', 'Moderation API', 'Perspective API', 'Llama Guard', 'false positives', 'multilingual safety'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { th: 0.5, input: true, output: true, custom: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const b = add(P.belt(V(-2.4, 0, 0.45), V(1.3, 0, 0.45), { w: 0.3, speed: 1 }));
    const sieves = [-1.4, -0.3, 0.8].map(x => { const m = new S.THREE.MeshLambertMaterial({ color: SAF }), s = P.box(0.08, 0.55, 0.5, '#fff', { r: 0.01, material: m }); s.position.set(x, 0.03, 0.45); S.add(s); return s; });
    const X = i => -1.9 + (i % 10) * 0.42, Z = i => i < 10 ? -0.55 : -0.17;
    const Dots = MSG.map((m, i) => { const mat = new S.THREE.MeshLambertMaterial({ color: GOOD }), d = P.box(0.3, 0.28, 0.3, '#fff', { r: 0.04, material: mat }); d.position.set(X(i), 0.03, Z(i)); S.add(d); return mat; });
    const T = [0, 1].map(i => { const t = add(P.tower(0.34, 0.36, i ? SAF : RED)); t.position.set(1.65 + i * 0.42, 0.03, 0.42); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.45, 2.45, 1.2, -0.75, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      MSG.forEach((m, i) => {
        const blocked = (m.s >= st.th && st.input) || (st.custom && m.sw && m.s >= st.th * 0.62);
        const caught = !m.harm ? !blocked : blocked || (st.output && !m.sw);
        Dots[i].color.set(!caught ? (m.harm ? RED : SAF) : m.harm ? BLUE : (m.sw ? '#A9CFC6' : GOOD));
      });
      sieves[0].visible = st.input; sieves[1].visible = st.custom; sieves[2].visible = st.output;
      T[0].userData.set({ h: Math.max(0.04, R.miss * 0.2) }); T[1].userData.set({ h: Math.max(0.04, R.wrong * 0.2) });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      { type: 'slider', label: 'Block above this score', min: 0.1, max: 0.9, step: 0.05, get: () => st.th, set: v => set({ th: v }) },
      tg('input', 'Input check', 'Input'), tg('output', 'Output check', 'Output'), tg('custom', 'Custom rule tuned for Swahili and Sheng', 'Custom'),
    ];
    const readouts = [
      { label: 'Harm let through', get: () => ({ v: `${R.miss}`, sub: `of ${MSG.filter(m => m.harm).length} harmful`, good: !R.miss, bad: R.miss > 1 }) },
      { label: 'Honest posts blocked', get: () => ({ v: `${R.wrong}`, sub: `of ${MSG.filter(m => !m.harm).length}`, good: R.wrong <= 1, bad: R.wrong > 3 }) },
      { label: 'Caught at output', get: () => ({ v: `${R.out}`, sub: 'late, after generating' }) },
    ];
    const labels = [
      { name: 'm', t: 'Twenty messages', d: 'Red: harm through. Gold: wrongly blocked', icon: 'box', atV: V(-2.28, 0.2, -0.35) },
      { name: 't', t: 'Misses and false alarms', d: 'One slider trades them', icon: 'scale', atV: V(2.3, 0.15, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One global threshold', hint: 'scores are low in Sheng', on: () => set({ ...D0, custom: false }), off: reset },
      { label: 'Tighten until it\'s clean', hint: 'honest posts go too', on: () => set({ ...D0, th: 0.15, custom: false }), off: reset },
      { label: 'Trust the input check alone', hint: 'no second sieve', on: () => set({ ...D0, output: false, custom: false }), off: reset },
    ];
    function status() {
      if (R.wrong > 3) return { ok: false, msg: `<b>${R.wrong} honest posts blocked, and many in Swahili, using words the model read as harsh.</b> Pushing a global threshold down punishes ordinary speech. Fix the scores, not the slider.` };
      if (!st.custom && R.miss) return { ok: false, msg: `<b>${R.miss} harmful posts got through, all in Swahili or Sheng.</b> The classifier scores those languages low across the board, so English looks well moderated and these users aren't protected. Measure per language.` };
      if (R.miss) return { ok: false, msg: `<b>${R.miss} harmful posts got through.</b> Each layer has its own blind spot, so check what each one missed.` };
      return { ok: true, msg: `<b>No harm through, ${R.wrong} honest post${R.wrong === 1 ? '' : 's'} blocked.</b> A rule tuned to local speech closed the gap. Measure it by language, with people who speak it.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 0.8 && b.userData.count() < 4) { u = 0; b.userData.send('#F4F1EA', { size: 0.15 }); } },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Three sieves', home: true, say: 'A forum in Dar es Salaam uses three sieves: one on input, one on output, one of its own. Each block is a message.', act: m => m.set({ th: 0.5, input: true, output: true, custom: true }) },
    { t: 'The slider', home: true, say: 'One threshold trades harm let through against honest posts blocked. There is no free setting.', act: m => m.set({ th: 0.75, input: true, output: true, custom: true }) },
    { t: 'A blind spot', home: true, say: 'Remove the custom rule. English looks fine, while harmful posts in Sheng slip past.', act: m => m.set({ th: 0.5, input: true, output: true, custom: false }) },
    { t: 'Tightening doesn\'t help', home: true, say: 'Lower the threshold to catch them, and honest speech goes too.', act: m => m.set({ th: 0.15, input: true, output: true, custom: false }) },
    { t: 'Different scales', home: true, say: 'Tools sort content differently, and their scores don\'t compare. Don\'t move a threshold from one to another.', act: m => m.set({ th: 0.5, input: true, output: false, custom: false }) },
    { t: 'Measure by language', home: true, say: 'Tune with local speakers, and measure each language alone. A single average hides who is unprotected.', act: m => m.set({ th: 0.5, input: true, output: true, custom: true }) },
  ],
  check: [
    { q: 'What are the three common moderation layers?', options: ['Input, output and custom', 'Train, test and serve', 'Red, amber and green'], answer: 0, why: 'Each fails differently.', hint: 'See Three sieves.' },
    { q: 'Why can a global threshold fail in other languages?', options: ['Scores are compressed for them', 'They have no harm', 'They are too short'], answer: 0, why: 'Models trained mostly on English score others poorly.', hint: 'Try One global threshold.' },
    { q: 'Why not simply lower the threshold?', options: ['Honest speech gets blocked', 'It costs more', 'It is illegal'], answer: 0, why: 'It trades one harm for another.', hint: 'Try Tighten until it\'s clean.' },
  ],
  terms: [
    ['Moderation', 'Screening content for policy violations.'],
    ['Threshold', 'The score above which you act.'],
    ['False positive', 'An honest post blocked.'],
    ['False negative', 'Harm let through.'],
    ['Taxonomy', 'A tool\'s list of categories.'],
    ['Per-language metrics', 'Measures reported for each language.'],
  ],
  deeper: '<p><b>Taxonomies differ.</b> OpenAI\'s categories and the MLCommons set behind Llama Guard don\'t line up one to one. Perspective scores toxicity, and it remains a research baseline.</p><p><b>Appeals.</b> Any automatic block needs a way for a person to ask for review.</p><p><b>This run.</b> The twenty messages are numbers only, with compressed scores chosen to show the effect.</p>',
  code: {
    title: 'Three layers',
    note: 'Adapted from the course\'s pipeline (code/main.py).',
    text: `
def moderate(message):
    if input_score(message) > THRESHOLDS[language(message)]:   # per language
        return refuse()
    if custom_rules(message):
        return refuse()
    reply = model(message)
    if output_score(reply) > OUTPUT_LIMIT:
        return safe_reply()
    return reply
`,
  },
};
