// Capstone: a constitutional safety harness and red-team range (phase 19, capstone 15). A Harare clinic bot runs behind composed layers: input classifier, principle check, output classifier. A range throws 40 scripted probes of four kinds, with no content, and scores each layer alone and together.
// The composition is the point: order, overlap and latency. Each layer catches some kinds. Results are counted from the table below.
const KIND = [{ n: 'Plain abuse', c: 16, by: ['in', 'out'] }, { n: 'Role-play', c: 12, by: ['pri', 'out'] }, { n: 'Encoded text', c: 8, by: ['dec'] }, { n: 'Slow multi-turn', c: 4, by: ['pri'] }];
const MS = { in: 15, pri: 60, out: 20, dec: 25 };
function run(o) {
  let stop = 0; const left = KIND.map(k => { const hit = k.by.some(l => o[l]); if (hit) stop += k.c; return hit ? 0 : k.c; });
  const ms = Object.keys(MS).reduce((a, k) => a + (o[k] ? MS[k] : 0), 0), good = 100 - (o.strict ? 9 : 2);
  return { stop, left, ms, good, through: 40 - stop };
}

export default {
  slug: 'constitutional-safety-harness',
  title: 'Capstone: a safety harness and a range to test it',
  description: 'Stack safety layers, then fire forty probes. See what each layer adds, and what the stack costs in speed and refusals.',
  overview: 'Single classifiers work, roughly. The frontier is how to compose them, and how to know the stack holds. A harness wraps a model in layers: an input classifier, a check against written principles, a decoder for hidden text, an output classifier. A red-team range fires a fixed set of probes after each change, and scores layers alone and together. Layers overlap, so one more may add nothing. They add delay. And each wrongly refuses some honest users, which counts as harm too. This capstone runs a clinic bot in Harare through a range of forty scripted probes, which hold no content, so you can see what a stack is really worth.',
  keywords: ['safety harness', 'red teaming', 'guardrails', 'constitutional classifiers', 'defence in depth', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { in: true, pri: true, dec: true, out: true, strict: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const LX = { in: -1.3, dec: -0.7, pri: -0.1, out: 0.5 }, C = { in: '#5B8DB8', dec: SAF, pri: '#7B6FA8', out: '#3E9B9B' };
    const W = Object.keys(LX).map(k => { const b = P.box(0.1, 0.7, 1.1, C[k], { r: 0.01 }); b.position.set(LX[k], 0.03, 0); S.add(b); return { k, b }; });
    const gun = P.box(0.6, 0.4, 0.6, '#2C2D31', { r: 0.05 }); gun.position.set(-2.1, 0.03, 0); S.add(gun);
    const balls = Array.from({ length: 6 }, (_, i) => { const b = P.ball(0.06, RED); b.userData.noFit = true; S.add(b); return b; });
    const bot = add(P.robot(GOOD, { scale: 0.9 })); bot.position.set(1.1, 0.03, 0);
    const T = add(P.tower(0.5, 0.5, RED)); T.position.set(2.0, 0.03, 0); T.userData.set({ cap: '' });
    S.add(P.keep(-2.45, 2.45, 1.2, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      W.forEach(({ k, b }) => { b.visible = !!st[k]; });
      T.userData.set({ h: Math.max(0.04, R.through * 0.05), color: R.through ? RED : GOOD });
      bot.userData.set({ busy: true, lamp: R.through ? '#D9483B' : '#3E9B5F' });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('in', 'Input classifier', 'Input'), tg('dec', 'Decoder for hidden text', 'Decode'), tg('pri', 'Check against principles', 'Principles'), tg('out', 'Output classifier', 'Output'), tg('strict', 'Tighten all thresholds', 'Strict')];
    const readouts = [
      { label: 'Probes stopped', get: () => ({ v: `${R.stop} of 40`, sub: `${R.through} got through`, good: !R.through, bad: R.through > 8 }) },
      { label: 'Added delay', get: () => ({ v: `${R.ms} ms`, sub: 'per message', good: R.ms < 130 }) },
      { label: 'Honest users served', get: () => ({ v: `${R.good}%`, sub: st.strict ? 'wrongly refused more' : 'few wrongly refused', good: R.good > 95, bad: R.good < 95 }) },
    ];
    const labels = [
      { name: 'g', t: 'The range', d: 'Forty scripted probes', icon: 'target', atV: V(-2.4, 0.2, 0) },
      { name: 't', t: 'What got through', d: 'Each wall is one layer', icon: 'check', atV: V(2.25, 0.15, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One classifier only', hint: 'the rest walk past', on: () => set({ in: true, pri: false, dec: false, out: false, strict: false }), off: reset },
      { label: 'Tighten everything', hint: 'honest users suffer', on: () => set({ ...D0, strict: true }), off: reset },
      { label: 'Drop the decoder', hint: 'hidden text passes', on: () => set({ ...D0, dec: false }), off: reset },
    ];
    function status() {
      if (st.strict) return { ok: false, msg: `<b>Nothing more was stopped, and ${100 - R.good}% of honest patients are refused.</b> A false refusal in a health service is harm as well. Add coverage, not tightness.` };
      if (R.through > 12) return { ok: false, msg: `<b>${R.through} of 40 through.</b> One filter sees one kind of attack. The range shows you which kinds, as numbers.` };
      if (R.through) return { ok: false, msg: `<b>${R.through} through: "${KIND.find((k, i) => R.left[i])?.n}" passes.</b> Layers overlap on easy attacks and leave gaps on odd ones. Fill gaps. A second copy of a layer adds delay and little else.` };
      return { ok: true, msg: `<b>All 40 stopped, for ${R.ms} ms a message.</b> This means these forty. Rerun on every change, and add every new finding to the range.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.6) % 1;
        const walls = Object.keys(LX).filter(k => st[k]).map(k => LX[k]).sort((a, b) => a - b);
        balls.forEach((b, i) => { const f = (u + i / 6) % 1, stopX = i < 6 * R.stop / 40 && walls.length ? walls[i % walls.length] : 1.0, x = -1.8 + (stopX + 1.8) * f; b.position.set(x, 0.3 + (i % 3) * 0.12, -0.3 + (i % 3) * 0.3); });
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'One layer', home: true, say: 'A clinic bot in Harare has one input classifier. A range fires forty scripted probes, and many walk past.', act: m => m.set({ in: true, pri: false, dec: false, out: false, strict: false }) },
    { t: 'Stack them', home: true, say: 'Add an output check, and a check against written principles. More probes stop at a wall.', act: m => m.set({ in: true, pri: true, dec: false, out: true, strict: false }) },
    { t: 'The odd ones', home: true, say: 'Hidden text needs a decoder. Add it, and the gap closes.', act: m => m.set({ in: true, pri: true, dec: true, out: true, strict: false }) },
    { t: 'What it costs', home: true, say: 'Every layer adds delay. Count it, and remove what adds nothing.', act: m => m.set({ in: true, pri: true, dec: true, out: true, strict: false }) },
    { t: 'Too tight', home: true, say: 'Tighten every threshold, and patients get refused. A wrong refusal is harm as well.', act: m => m.set({ in: true, pri: true, dec: true, out: true, strict: true }) },
    { t: 'A range, not a report', home: true, say: 'Run the range on every change, and add each new finding. Forty today, more tomorrow.', act: m => m.set({ in: true, pri: true, dec: true, out: true, strict: false }) },
  ],
  check: [
    { q: 'Why compose layers?', options: ['Each catches different things', 'To slow attackers down', 'It looks better'], answer: 0, why: 'One filter sees one kind.', hint: 'Try One classifier only.' },
    { q: 'What is the cost of tightening every threshold?', options: ['Honest users get refused', 'Nothing', 'More storage'], answer: 0, why: 'False refusals are harm.', hint: 'Try Tighten everything.' },
    { q: 'What does a red-team range give?', options: ['Repeatable scores after each change', 'A one-time certificate', 'A faster model'], answer: 0, why: 'It turns safety into a number you can track.', hint: 'See A range, not a report.' },
  ],
  terms: [['Harness', 'The layers around a model.'], ['Range', 'A fixed set of probes run often.'], ['Composition', 'How layers are combined.'], ['False refusal', 'Wrongly refusing an honest request.'], ['Overlap', 'Two layers catching the same thing.']],
  deeper: '<p><b>Probes here</b> are counts only, with no content.</p><p><b>Order.</b> Cheap checks first, costly ones later.</p><p><b>People.</b> The range stops what it knows. Red teamers find what it doesn\'t.</p>',
  code: {
    title: 'A stack and a score',
    note: 'A sketch of the course\'s capstone (code/main.py).',
    text: `
LAYERS = [input_classifier, decode_hidden, principle_check]

def guarded(message):
    for layer in LAYERS:
        if layer(message).blocked:
            return refuse()
    reply = model(message)
    return reply if not output_classifier(reply).blocked else refuse()

def range_score(probes):
    return sum(was_stopped(guarded, p) for p in probes) / len(probes)
`,
  },
};
