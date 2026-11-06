// Machine translation, judged: a clinic in Dodoma translates its medicine labels into Swahili. Three systems translate "Take two tablets every eight hours after food".
// Each candidate is a card; gauges show BLEU (word n-gram overlap with reference translations), chrF (character n-gram F-score), and a critical-error check on numbers and negations.
// All scores are computed live. A stamp says whether the label may be printed.
// Break it: one reference only (a correct paraphrase scores far below a wrong one), print the top BLEU score with no critical-error check (the label says three tablets),
// judge by BLEU alone across all three (word-level overlap punishes the paraphrase; chrF and two references are fairer).
const SRC = 'Take two tablets every eight hours after food';
const REFS = ['meza vidonge viwili kila saa nane baada ya chakula', 'tumia vidonge viwili kila baada ya saa nane ukishakula'];
const CANDS = [
  { k: 'A', n: 'System A', t: 'meza vidonge viwili kila saa nane', note: 'drops "after food"' },
  { k: 'B', n: 'System B', t: 'tumia vidonge viwili kila baada ya saa nane ukishakula chakula', note: 'paraphrase' },
  { k: 'C', n: 'System C', t: 'meza vidonge vitatu kila saa nane baada ya chakula', note: 'wrong number' },
];
const NUMS = { viwili: 2, vitatu: 3, nane: 8, sita: 6 };
function ng(t, n) { const w = t.split(' '), o = {}; for (let i = 0; i + n <= w.length; i++) { const k = w.slice(i, i + n).join(' '); o[k] = (o[k] || 0) + 1; } return o; }
function bleu(c, refs) { let lp = 0; for (let n = 1; n <= 4; n++) { const cn = ng(c, n); let m = 0, t = 0; for (const k in cn) { t += cn[k]; m += Math.min(cn[k], Math.max(...refs.map(r => ng(r, n)[k] || 0))); } lp += Math.log((m + 1) / (t + 1)) / 4; } const cl = c.split(' ').length, rl = refs.map(r => r.split(' ').length).reduce((a, b) => (Math.abs(b - cl) < Math.abs(a - cl) ? b : a)); return (cl > rl ? 1 : Math.exp(1 - rl / cl)) * Math.exp(lp); }
function chrf(c, refs) { const cg = (t, n) => { const s = t.replace(/ /g, ''), o = {}; for (let i = 0; i + n <= s.length; i++) { const k = s.slice(i, i + n); o[k] = (o[k] || 0) + 1; } return o; }; let best = 0; refs.forEach(r => { let P = 0, Rr = 0; for (let n = 1; n <= 6; n++) { const a = cg(c, n), b = cg(r, n); let m = 0, ta = 0, tb = 0; for (const k in a) { ta += a[k]; m += Math.min(a[k], b[k] || 0); } for (const k in b) tb += b[k]; P += m / ta; Rr += m / tb; } P /= 6; Rr /= 6; best = Math.max(best, 5 * P * Rr / (4 * P + Rr)); }); return best; }
const nums = t => t.split(' ').filter(w => NUMS[w] !== undefined).map(w => NUMS[w]).sort().join(',');

export default {
  slug: 'machine-translation',
  title: 'Machine translation: judging the output',
  description: 'A clinic in Dodoma translates its medicine labels into Swahili. Three systems, three kinds of mistake, and scores that cannot tell a paraphrase from a wrong dose.',
  overview: 'Translation quality is measured against human reference translations. BLEU counts how many word sequences of one to four words the system shares with the references, with a penalty for being too short; chrF does the same with character sequences, which is fairer to languages like Swahili where words take prefixes and suffixes. Both reward overlap, not meaning: a correct paraphrase can score low against a single reference, and a translation that copies the reference but changes one number can score high. More references help, and modern practice adds learned metrics, human review and, for anything safety-critical, checks for critical errors such as numbers, negations and names.',
  keywords: ['machine translation evaluation', 'bleu score', 'chrf', 'critical errors translation', 'multiple references'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.05], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { refs: 2, check: true, cover: true, judge: 'all' };
    /* the human references, a stack of one or two */
    const refs0 = P.stack(0.5, 0.36, 0.1, { max: 2, color: '#2E7A45' }); refs0.position.set(-2.55, 0, -0.1); S.add(refs0);
    /* three candidate stations: two score towers, a pill tray for the dose, a lamp for the verdict */
    const stations = CANDS.map((c, i) => {
      const x = -1.5 + i * 1.5, pad = P.box(1.3, 0.05, 1.0, '#E4DED2', { r: 0.04 }); pad.position.set(x, 0, -0.1); S.add(pad);
      const gauges = [0, 1].map(j => { const t = P.tower(0.28, 0.28, C.teal, { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(x - 0.42 + j * 0.34, 0.05, -0.3); S.add(t); return t; });
      const pills = [0, 1, 2].map(k => { const b = P.ball(0.07, '#FFFFFF'); b.position.set(x + 0.2 + k * 0.16, 0.12, -0.3); S.add(b); return b; });
      pills[2].visible = c.k === 'C';
      if (c.k === 'C') pills.forEach(b => { b.material = new THREE.MeshLambertMaterial({ color: C.red }); });
      const food = P.box(0.3, 0.1, 0.2, '#C9A27A', { r: 0.03 }); food.position.set(x + 0.32, 0.05, 0.05); food.visible = c.k !== 'A'; S.add(food);
      const lamp = P.lamp(C.teal, { h: 0.14, r: 0.09 }); lamp.position.set(x - 0.25, 0.05, 0.15); S.add(lamp);
      return { x, gauges, lamp };
    });
    S.add(P.keep(-2.85, 2.25, 0.75, -0.75, 0.55));
    const parts = stations.flatMap(s => s.gauges);
    /* ---------- score ---------- */
    let R = null;
    function draw() {
      const refs = REFS.slice(0, st.refs);
      refs0.userData.set({ n: st.refs });
      const want = nums(REFS[0]);
      const sc = CANDS.map(c => ({ bleu: bleu(c.t, refs), chrf: chrf(c.t, refs), err: nums(c.t) !== want, omit: !/kula/.test(c.t) }));
      const score = i => (st.judge === 'bleu' ? sc[i].bleu : (sc[i].bleu + sc[i].chrf) / 2) - (st.check && sc[i].err ? 1 : 0) - (st.cover && sc[i].omit ? 1 : 0);
      const best = [0, 1, 2].reduce((b, i) => (score(i) > score(b) ? i : b), 0);
      stations.forEach((S2, i) => {
        [sc[i].bleu, st.judge === 'bleu' ? null : sc[i].chrf].forEach((v, j) => { const G = S2.gauges[j]; G.visible = v !== null; if (v === null) return; G.userData.set({ h: Math.max(0.02, v * 0.6), color: v > 0.8 ? C.teal : v > 0.5 ? C.gold : C.red }); });
        const flag = st.check && sc[i].err ? 'dose' : st.cover && sc[i].omit ? 'food' : null;
        S2.lamp.userData.set({ color: flag ? C.red : i === best ? C.teal : '#9A9AA6', on: true });
      });
      R = { sc, best };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'References', options: ['Two', 'One'], get: () => (st.refs === 2 ? 0 : 1), act: i => { st.refs = i ? 1 : 2; draw(); } },
      { type: 'toggle', label: 'Check numbers and negations', short: 'number check', get: () => st.check, set: v => { st.check = v; draw(); } },
      { type: 'toggle', label: 'Check nothing was left out', short: 'coverage check', get: () => st.cover, set: v => { st.cover = v; draw(); } },
      { type: 'buttons', label: 'Judge by', options: ['BLEU and chrF', 'BLEU only'], get: () => (st.judge === 'all' ? 0 : 1), act: i => { st.judge = i ? 'bleu' : 'all'; draw(); } },
    ];
    const readouts = [
      { label: 'Chosen', get: () => ({ v: CANDS[R.best].n, sub: CANDS[R.best].note, good: R.best === 1, bad: R.best !== 1 }) },
      { label: 'Paraphrase BLEU', get: () => ({ v: R.sc[1].bleu.toFixed(2), sub: `with ${st.refs} reference${st.refs > 1 ? 's' : ''}`, good: R.sc[1].bleu > 0.6, bad: R.sc[1].bleu < 0.5 }) },
      { label: 'Wrong-dose BLEU', get: () => ({ v: R.sc[2].bleu.toFixed(2), sub: st.check ? 'flagged anyway' : 'not checked', bad: !st.check }) },
    ];
    const labels = [
      { name: 'src', t: 'The references', d: 'Human translations to score against', icon: 'book', atV: V(-2.8, 0.1, -0.1) },
      { name: 'cards', t: 'Three systems', d: 'Towers: BLEU and chrF. Pills: the dose', icon: 'target', atV: V(2.15, 0.15, -0.3) },
    ];
    const reset = () => { Object.assign(st, { refs: 2, check: true, cover: true, judge: 'all' }); draw(); };
    const breaks = [
      { label: 'One reference only', hint: 'Judged by BLEU', on: () => { reset(); st.refs = 1; st.judge = 'bleu'; st.check = true; draw(); }, off: reset },
      { label: 'No number check', hint: 'One reference, BLEU decides', on: () => { reset(); st.refs = 1; st.check = false; st.judge = 'bleu'; draw(); }, off: reset },
      { label: 'No coverage check', hint: 'One reference; dropped words unnoticed', on: () => { reset(); st.cover = false; st.refs = 1; st.judge = 'bleu'; draw(); }, off: reset },
    ];
    function status() {
      const s = R.sc;
      if (R.best === 2) return { ok: false, msg: `<b>The label says three tablets.</b> System C copies the reference almost word for word but turns "two" into "three", and with one reference it scores BLEU ${s[2].bleu.toFixed(2)}, far above the correct paraphrase (${s[1].bleu.toFixed(2)}). Overlap metrics do not know that one word is a dose. Anything safety-critical needs a check on numbers, negations and names.` };
      if (R.best === 0) return { ok: false, msg: `<b>"After food" went missing.</b> System A is short and accurate as far as it goes, so it scores well${st.refs > 1 ? '' : ' against one reference'}, but it drops the instruction to take the tablets after food. Nothing checked that every part of the source was translated. A coverage check catches dropped clauses.` };
      if (st.refs === 1 && st.judge === 'bleu') return { ok: false, msg: `<b>The right answer scored ${s[1].bleu.toFixed(2)}.</b> System B is the only safe translation, and the checks removed the others, but with one reference BLEU ranks it last: a different but correct wording shares few four-word runs. If the checks were off, the wrong dose would win. More references and chrF judge paraphrases more fairly.` };
      return { ok: true, msg: `<b>System B goes on the label.</b> With two references the paraphrase scores BLEU ${s[1].bleu.toFixed(2)} and chrF ${s[1].chrf.toFixed(2)}, System C is stopped by the dose check, and System A by the coverage check, whatever their overlap.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A medicine label', home: true, say: 'A clinic in Dodoma translates medicine labels into Swahili. Three systems translate "take two tablets every eight hours after food".', act: m => m.set({ refs: 2, check: true, judge: 'all' }) },
    { t: 'BLEU and chrF', home: true, say: 'BLEU counts word runs shared with human reference translations. chrF counts shared runs of characters, which suits Swahili words with prefixes and suffixes.', act: m => m.set({}) },
    { t: 'One reference', home: true, say: 'With a single reference, the paraphrase from system B, which is correct, shares few word runs and scores far below the others.', act: m => m.set({ refs: 1, judge: 'bleu' }) },
    { t: 'A wrong dose', home: true, say: 'System C copies the reference but says three tablets. Its overlap is high. Without a check on numbers, it is the one that gets printed.', act: m => m.set({ check: false }) },
    { t: 'Check what matters', home: true, say: 'A critical error check on numbers, negations and names stops it, whatever its score.', act: m => m.set({ check: true }) },
    { t: 'Fairer judging', home: true, say: 'Two references and chrF judge the paraphrase fairly. Metrics guide; for labels like this, people and checks decide.', act: m => m.set({ refs: 2, judge: 'all' }) },
  ],
  check: [
    { q: 'What does BLEU measure?', options: ['How many word sequences a translation shares with references', 'Whether the meaning is correct', 'How fast the system is'], answer: 0, why: 'It rewards overlap, not meaning.' },
    { q: 'Why can a correct paraphrase score low?', options: ['It uses different words from the single reference', 'It is too short', 'chrF penalises it'], answer: 0, why: 'More references help.' },
    { q: 'Why add a critical-error check?', options: ['Overlap metrics cannot tell that one changed number is dangerous', 'To make BLEU higher', 'To translate faster'], answer: 0, why: 'A dose error scores almost as high as a correct copy.' },
  ],
  terms: [
    ['BLEU', 'A score from shared word n-grams with references, with a brevity penalty.'],
    ['chrF', 'An F-score over shared character n-grams.'],
    ['Reference translation', 'A human translation used for comparison.'],
    ['Critical error', 'A mistake that changes meaning dangerously: numbers, negations, names.'],
    ['Brevity penalty', 'BLEU\'s penalty for translations shorter than the reference.'],
    ['Learned metric', 'A model trained to predict human quality judgements.'],
  ],
  deeper: '<p><b>A hierarchy of evaluation.</b> Cheap overlap metrics during development, learned metrics for model comparison, and human review with critical-error checks before anything ships, especially medical, legal or financial text.</p><p><b>Low-resource languages.</b> For many African languages there is little parallel text; fine-tuning on a domain such as health leaflets often helps more than a bigger general model.</p><p><b>About this machine.</b> BLEU, chrF and the number check are computed exactly on the candidates shown.</p>',
  code: {
    title: 'Sentence BLEU, chrF and a number check',
    note: 'Adapted from the course\'s machine translation lesson.',
    text: `
import sacrebleu

refs = [["meza vidonge viwili kila saa nane baada ya chakula"],
        ["tumia vidonge viwili kila baada ya saa nane ukishakula"]]
cand = ["meza vidonge vitatu kila saa nane baada ya chakula"]

print(sacrebleu.corpus_bleu(cand, refs).score)    # high overlap
print(sacrebleu.corpus_chrf(cand, refs).score)

NUMBERS = {"moja": 1, "mbili": 2, "viwili": 2, "vitatu": 3, "nane": 8}
def numbers(text):
    return sorted(NUMBERS[w] for w in text.split() if w in NUMBERS)

critical = numbers(cand[0]) != numbers(refs[0][0])   # True: wrong dose
`,
  },
};
