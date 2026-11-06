// NLI: a summary of a Lusaka water notice is checked claim by claim. For each claim (hypothesis) against the notice (premise), three columns show
// entailment, neutral and contradiction; a claim passes only if it is entailed. The full model's probabilities are scripted; the hypothesis-only shortcut and
// the word-overlap heuristic are computed live, and so is every lamp on the claim board.
// Break it: read the hypothesis only ("nobody" means contradiction, anything else passes), word overlap (swapped times share every word),
// flag contradictions only (an invented donor is neutral, so it passes).
const PREMISE = 'The city water board says supply to Kabwata and Chilenje will stop on Tuesday from 8 am to 4 pm while pipes are repaired.';
const CLAIMS = [
  { s: 'Kabwata will have no water on Tuesday.', g: 'E', p: [0.94, 0.04, 0.02] },
  { s: 'Water will be off all week.', g: 'C', p: [0.03, 0.12, 0.85] },
  { s: 'A donor is paying for the repairs.', g: 'N', p: [0.05, 0.9, 0.05] },
  { s: 'Nobody in Chilenje will lose water.', g: 'C', p: [0.02, 0.05, 0.93] },
  { s: 'Supply will stop from 4 pm to 8 am.', g: 'C', p: [0.06, 0.1, 0.84] },
];
const L3 = ['E', 'N', 'C'], NAMES = { E: 'entailed', N: 'neutral', C: 'contradicted' };
const STOP = new Set('the a an to and on in will be is are from while of for no'.split(' '));
const content = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));
const PW = new Set(content(PREMISE).concat(['water']));
function judge(c, reader) {
  if (reader === 0) return c.p;
  if (reader === 1) return /\b(nobody|not|never|no one)\b/i.test(c.s) ? [0.15, 0.15, 0.7] : [0.6, 0.3, 0.1];   // hypothesis only: negation words mean contradiction
  const ws = content(c.s), ov = ws.filter(w => PW.has(w)).length / ws.length;   // word overlap: every claim made of the notice's words is entailed
  return ov >= 0.8 ? [0.8, 0.15, 0.05] : ov >= 0.5 ? [0.3, 0.5, 0.2] : [0.1, 0.7, 0.2];
}
const label = p => L3[p.indexOf(Math.max(...p))];

export default {
  slug: 'nli-textual-entailment',
  title: 'Inference: does the text support it?',
  description: 'A summary of a Lusaka water notice is checked claim by claim: is each entailed, neutral or contradicted? The reader must read both sides, not just the claim.',
  overview: 'Natural language inference asks whether a hypothesis follows from a premise: entailment, contradiction, or neutral when the premise says nothing either way. It is judged the way a careful reader would, not by strict logic. A transformer reads the premise and hypothesis together and outputs the three probabilities. The same check powers many tools: a summary claim or a chatbot answer that is not entailed by its source is unsupported, and zero-shot classification turns each label into a hypothesis such as "This text is about sport". Models can cheat: words like "nobody" predict contradiction even without the premise, and high word overlap looks like entailment even when the meaning is reversed. For faithfulness, neutral is a failure too: the source never said it.',
  keywords: ['natural language inference', 'textual entailment', 'faithfulness', 'hallucination check', 'zero-shot classification'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 4.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { c: 0, reader: 0, rule: 0 };
    /* the notice on the left, a claim lamp for each sentence of the summary on the right */
    const notice = P.box(0.9, 0.5, 0.6, '#FBF8F1', { r: 0.04 }); notice.position.set(-2.1, 0, -0.5); S.add(notice);
    const rows = CLAIMS.map((c, i) => {
      const hm = new THREE.MeshLambertMaterial({ color: '#E4DED2' }), pad = P.box(0.32, 0.04, 0.32, '#fff', { r: 0.03, material: hm }); pad.position.set(0.5 + i * 0.4, 0, -0.7); S.add(pad);
      const lm = P.lamp('#9ED9C9', { h: 0.14, r: 0.09 }); lm.position.set(0.5 + i * 0.4, 0.04, -0.7); S.add(lm);
      return { lm, hm };
    });
    /* the three-way scale */
    const CX = i => -0.75 + i * 0.75, CZ = 0.25, CH = 0.95;
    const cols = L3.map((k, i) => { const t = P.tower(0.46, 0.46, k === 'E' ? '#2E9E6A' : k === 'N' ? '#C9A227' : '#D64545', { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(CX(i), 0, CZ); S.add(t); return t; });
    /* which reader, and its verdict */
    const verdict = P.lamp('#2E9E6A', { h: 0.3, r: 0.12 }); verdict.position.set(1.4, 0, CZ); S.add(verdict);
    const readers = [0, 1, 2].map(i => { const m = new THREE.MeshLambertMaterial({ color: '#D8D0BE' }), b = P.box(0.36, 0.08, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-2.4 + i * 0.42, 0, CZ); S.add(b); return m; });
    S.add(P.keep(-2.65, 2.3, 1.05, -1.0, 0.6));

    const passes = (p, rule) => { const l = label(p); return rule === 0 ? l === 'E' : l !== 'C'; };
    let PR = null, ALL = [];
    function draw() {
      PR = judge(CLAIMS[st.c], st.reader);
      cols.forEach((c, i) => c.userData.set({ h: Math.max(0.02, PR[i] * CH) }));
      ALL = CLAIMS.map(c => ({ ok: passes(judge(c, st.reader), st.rule), right: c.g === 'E' }));
      rows.forEach((r, i) => { r.lm.userData.set({ color: ALL[i].ok ? '#2E9E6A' : '#D64545', on: true }); r.hm.color.set(i === st.c ? '#F2C94C' : '#E4DED2'); });
      const ok = passes(PR, st.rule);
      verdict.userData.set({ color: ok ? '#2E9E6A' : '#D64545', on: true });
      readers.forEach((m, i) => m.color.set(i === st.reader ? '#F2C94C' : '#D8D0BE'));
    }
    draw();
    const wrong = () => ALL.filter(a => a.ok !== a.right).length;
    const controls = [
      { type: 'buttons', label: 'Claim', options: ['1', '2', '3', '4', '5'], get: () => st.c, act: i => { st.c = i; draw(); } },
      { type: 'buttons', label: 'Checker', options: ['NLI model', 'Claim only', 'Word overlap'], get: () => st.reader, act: i => { st.reader = i; draw(); } },
      { type: 'buttons', label: 'Flag a claim when', options: ['Not entailed', 'Contradicted'], get: () => st.rule, act: i => { st.rule = i; draw(); } },
    ];
    const readouts = [
      { label: 'This claim', get: () => ({ v: NAMES[label(PR)], sub: `truly ${NAMES[CLAIMS[st.c].g]}`, good: label(PR) === CLAIMS[st.c].g, bad: label(PR) !== CLAIMS[st.c].g }) },
      { label: 'Claims passed', get: () => ({ v: `${ALL.filter(a => a.ok).length} of 5`, sub: 'only claim 1 is supported' }) },
      { label: 'Wrong calls', get: () => ({ v: String(wrong()), good: wrong() === 0, bad: wrong() > 0 }) },
    ];
    const labels = [
      { name: 'scale', t: 'Three-way judgement', d: 'Entailed, neutral, contradicted', icon: 'scale', atV: V(-1.0, 0.25, 0.25) },
      { name: 'claims', t: 'Claim lamps', d: 'Green passes, red is flagged', icon: 'check', atV: V(2.3, 0.2, -0.7) },
    ];
    const reset = () => { Object.assign(st, { c: 0, reader: 0, rule: 0 }); draw(); };
    const breaks = [
      { label: 'Claim only', hint: 'Ignore the notice', on: () => { reset(); st.reader = 1; st.c = 2; draw(); }, off: reset },
      { label: 'Word overlap', hint: 'Swapped times', on: () => { reset(); st.reader = 2; st.c = 4; draw(); }, off: reset },
      { label: 'Flag contradictions only', hint: 'The donor claim', on: () => { reset(); st.rule = 1; st.c = 2; draw(); }, off: reset },
    ];
    function status() {
      const c = CLAIMS[st.c], l = label(PR), w = wrong();
      if (st.reader === 1) return { ok: false, msg: `<b>Judging without reading the notice.</b> A claim-only checker learns shortcuts: "nobody" or "not" means contradiction, anything else looks entailed. So "${CLAIMS[2].s}" passes and so does "${CLAIMS[1].s}". ${w} of 5 calls are wrong. A model that scores well this way has learned the data's habits, not inference.` };
      if (st.reader === 2) return { ok: false, msg: `<b>Every word matches, the meaning doesn't.</b> "${CLAIMS[4].s}" uses only words from the notice, so word overlap calls it entailed, but the times are swapped: the notice says 8 am to 4 pm. ${w} of 5 calls are wrong. Adversarial test sets are built from exactly these cases.` };
      if (st.rule === 1 && ALL[2].ok) return { ok: false, msg: `<b>An invented donor gets through.</b> The notice says nothing about who pays, so "${CLAIMS[2].s}" is neutral (${PR[1].toFixed(2)}), not contradicted, and a rule that flags only contradictions lets it pass. For faithfulness, anything the source does not entail is unsupported: flag neutral too.` };
      return { ok: true, msg: `<b>Claim ${st.c + 1}: ${NAMES[l]} (${Math.max(...PR).toFixed(2)}).</b> ${l === 'E' ? 'The notice says exactly this, so it passes.' : l === 'C' ? 'The notice says the opposite, so it is flagged.' : 'The notice never says this, so it is flagged as unsupported.'} Reading notice and claim together, the checker gets all five claims right: only claim 1 is supported.` };
    }
    return { update: dt => { cols.forEach(c => c.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Check the summary', home: true, say: 'A city water notice in Lusaka is summarised in five claims. Which ones does the notice actually support?', act: m => m.set({ c: 0, reader: 0, rule: 0 }) },
    { t: 'Entailed', home: true, say: 'Kabwata will have no water on Tuesday. The notice says so: entailed. It passes.', act: m => m.set({ c: 0 }) },
    { t: 'Contradicted', home: true, say: 'Water will be off all week. The notice says Tuesday, eight to four: contradicted. Flagged.', act: m => m.set({ c: 1 }) },
    { t: 'Neutral is not support', home: true, say: 'A donor is paying for the repairs. The notice says nothing about it: neutral. Flag only contradictions, and this invention gets through.', act: m => m.set({ c: 2, rule: 1 }) },
    { t: 'Shortcuts', home: true, say: 'Let a checker read only the claim, and it learns that "nobody" means contradiction. Everything else passes, including the donor.', act: m => m.set({ rule: 0, reader: 1 }) },
    { t: 'Same words, new meaning', home: true, say: 'Supply will stop from four pm to eight am. Every word is in the notice, but the times are swapped. Word overlap calls it entailed.', act: m => m.set({ c: 4, reader: 2 }) },
  ],
  check: [
    { q: 'A claim the source neither supports nor contradicts is labelled…', options: ['Neutral', 'Entailed', 'Contradicted'], answer: 0, why: 'The premise says nothing either way.' },
    { q: 'When checking a summary for faithfulness, which claims should be flagged?', options: ['Any claim that is not entailed', 'Only contradicted claims', 'Only very long claims'], answer: 0, why: 'Neutral claims are unsupported too.' },
    { q: 'Why does word overlap fail as an entailment test?', options: ['Rearranged words can reverse the meaning', 'It is too slow', 'It ignores the hypothesis'], answer: 0, why: '4 pm to 8 am uses the same words as 8 am to 4 pm.' },
  ],
  terms: [
    ['Premise', 'The text taken as given.'],
    ['Hypothesis', 'The statement being checked against the premise.'],
    ['Entailment', 'A careful reader of the premise would accept the hypothesis.'],
    ['Contradiction', 'The premise rules the hypothesis out.'],
    ['Neutral', 'The premise says nothing either way.'],
    ['Faithfulness', 'Every claim in an output is supported by its source.'],
  ],
  deeper: '<p><b>Zero-shot labels.</b> Turn each category into a hypothesis, such as "This message is about water supply", and pick the one the text most strongly entails. No training labels needed, though the wording of the template can move results a lot.</p><p><b>Long sources.</b> Models trained on single sentences struggle with whole reports. Split the source into passages and check each claim against the best passage, or use a model trained on document-length premises.</p><p><b>About this machine.</b> The NLI model\'s probabilities are set to typical values for each claim. The claim-only shortcut and the word-overlap rule are computed live from the words.</p>',
  code: {
    title: 'Checking summary claims with NLI',
    note: 'Adapted from the course\'s NLI lesson.',
    text: `
from transformers import pipeline

nli = pipeline("text-classification", model="microsoft/deberta-large-mnli")

def unsupported(source, claims):
    flagged = []
    for claim in claims:
        out = nli({"text": source, "text_pair": claim})
        if out["label"] != "ENTAILMENT":        # neutral counts as unsupported
            flagged.append((claim, out["label"]))
    return flagged
`,
  },
};
