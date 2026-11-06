// Audio evaluation: a team in Dar es Salaam evaluates a Swahili speech recogniser before launch. Left: one utterance scored word by word, with and without text normalisation.
// Right: word error rate by group of speakers, from 60 test sentences per group, with the overall figure as a plinth. Reference and hypothesis texts are set by hand;
// the edit alignment, WER, slices and the overall average are computed live. Break it: no normalisation (capitals, punctuation and digits count as errors),
// overall WER only (it hides the coastal elderly speakers), test only on the public read-speech set (the model scores near perfect on what it was tuned for).
const REF = 'Tafadhali nitumie shilingi elfu tano kwa simu.';
const HYP = 'tafadhali nitumie shilingi 5000 kwa simu';
const NUMS = { '5000': 'elfu tano' };
const SLICES = [
  { n: 'Dar es Salaam, adults', w: 0.45, wer: 0.05 },
  { n: 'Arusha, adults', w: 0.27, wer: 0.07 },
  { n: 'Zanzibar, adults', w: 0.13, wer: 0.09 },
  { n: 'Coast, over 60', w: 0.06, wer: 0.29 },
  { n: 'Children', w: 0.09, wer: 0.18 },
];
const PUBLIC = 0.03;
function norm(s, on) { if (!on) return s.split(/\s+/); return s.toLowerCase().replace(/[.,!?]/g, '').split(/\s+/).flatMap(w => (NUMS[w] ? NUMS[w].split(' ') : [w])); }
function align(r, h) {
  const n = r.length, m = h.length, d = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: m + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1));
  const ops = []; let i = n, j = m;
  while (i || j) { if (i && j && d[i][j] === d[i - 1][j - 1] + (r[i - 1] === h[j - 1] ? 0 : 1)) { ops.unshift([r[i - 1] === h[j - 1] ? 'ok' : 'sub', r[i - 1], h[j - 1]]); i--; j--; } else if (i && d[i][j] === d[i - 1][j] + 1) { ops.unshift(['del', r[i - 1], '']); i--; } else { ops.unshift(['ins', '', h[j - 1]]); j--; } }
  return { ops, wer: d[n][m] / n };
}

export default {
  slug: 'audio-evaluation-metrics',
  title: 'Audio evaluation: measure what matters',
  description: 'A team in Dar es Salaam tests a Swahili speech recogniser. Score a sentence word by word, then each group of speakers, not one average.',
  overview: 'Every audio task has its own numbers. Recognition uses word error rate, substitutions plus deletions plus insertions over the reference words, after normalising case, punctuation and numbers so that "5000" and "elfu tano" are not counted as errors; character error rate suits languages without clear word breaks. Speech synthesis uses mean opinion scores from listeners and learned predictors such as UTMOS, plus a round trip through a recogniser for intelligibility; cloning adds speaker similarity. Verification uses equal error rate, diarisation uses diarisation error rate, classification uses per-class recall and mean average precision, music uses Fréchet audio distance, and streaming systems need latency percentiles. Two habits matter most: report results for each group of speakers, because an average hides the groups the system fails, and test on data like your real traffic, because public benchmarks are nearly saturated and models are tuned to them.',
  keywords: ['audio evaluation', 'word error rate', 'mean opinion score', 'utmos', 'fréchet audio distance', 'evaluation slices'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.05], dir: [0.05, 0.85, 1.15], half: 0.95, wide: 6.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { norm: true, slices: true, test: 0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    /* left: one sentence, what was said (back row) zipped to what was heard (front row) */
    const ZR = -0.35, ZH = 0.25;
    const bed = P.box(2.6, 0.03, 1.0, '#3A3D4A', { r: 0.04 }); bed.position.set(-1.55, 0, -0.05); S.add(bed);
    const word = () => { const m = own('#fff'), b = P.box(1, 0.12, 0.26, '#fff', { r: 0.03, material: m }); b.userData.m = m; b.userData.noFit = true; S.add(b); return b; };
    const said = Array.from({ length: 12 }, word), heard = Array.from({ length: 12 }, word);
    const ties = Array.from({ length: 12 }, () => { const m = own(GOOD), r = P.rod(V(0, 0, 0), V(0, 1, 0), 0.02, GOOD, { material: m }); r.userData.m = m; r.userData.noFit = true; S.add(r); return r; });
    /* right: word error rate per speaker group, each tower as wide as that group's share of calls, under a launch bar */
    const SX = i => 0.55 + i * 0.5, H = 3.2;
    const cols = SLICES.map((sl, i) => { const t = P.tower(0.16 + sl.w * 0.6, 0.36, GOOD); t.position.set(SX(i), 0, -0.05); t.userData.set({ cap: '' }); S.add(t); return t; });
    const all = P.tower(2.3, 0.5, '#3B3F8F'); all.position.set(SX(2), 0, -0.05); all.userData.set({ cap: '' }); S.add(all);
    const barY = 0.1 * H;
    [SX(0) - 0.4, SX(4) + 0.4].forEach(x => { const p = P.box(0.06, barY + 0.05, 0.06, '#6B6E7E', { r: 0.01 }); p.position.set(x, 0, 0.25); S.add(p); });
    const bar = P.box(SX(4) - SX(0) + 0.86, 0.05, 0.05, '#D64545', { r: 0.01 }); bar.position.set((SX(0) + SX(4)) / 2, barY, 0.25); S.add(bar);
    S.add(P.keep(-2.9, 2.95, 1.0, -0.6, 0.5));
    let R = null;
    function run() {
      const A = align(norm(REF, st.norm), norm(HYP, st.norm));
      const sl = st.test === 1 ? SLICES.map(s => ({ ...s, wer: PUBLIC })) : SLICES;
      const overall = sl.reduce((a, s) => a + s.w * s.wer, 0);
      return { A, sl, overall, worst: sl.reduce((a, s) => (s.wer > a.wer ? s : a)) };
    }
    function draw() {
      R = run();
      // each pair: green tie where the words agree, coral where an error is counted; a missing block is a deletion or an insertion
      let x = -2.75;
      said.forEach((b, k) => {
        const o = R.A.ops[k], on = !!o; b.visible = heard[k].visible = ties[k].visible = on; if (!on) return;
        const w = Math.min(0.5, Math.max(0.16, Math.max(o[1].length, o[2].length) * 0.045));
        const bad = o[0] !== 'ok', c = bad ? BAD : GOOD;
        b.visible = !!o[1]; heard[k].visible = !!o[2];
        b.scale.x = w; b.position.set(x + w / 2, 0.03, ZR); b.userData.m.color.set(o[1] ? '#F4F1EA' : BAD);
        heard[k].scale.x = w; heard[k].position.set(x + w / 2, 0.03, ZH); heard[k].userData.m.color.set(bad ? BAD : '#F4F1EA');
        P.setRod(ties[k], V(x + w / 2, 0.1, ZR + 0.13), V(x + w / 2, 0.1, ZH - 0.13)); ties[k].userData.m.color.set(c);
        x += w + 0.06;
      });
      R.sl.forEach((s, i) => { cols[i].visible = st.slices; cols[i].userData.set({ h: Math.max(0.02, s.wer * H), color: s.wer > 0.1 ? BAD : GOOD }); });
      all.visible = !st.slices; all.userData.set({ h: Math.max(0.02, R.overall * H), color: R.overall > 0.1 ? BAD : '#3B3F8F' });
    }
    draw(); cols.forEach(c => c.userData.snap()); all.userData.snap();
    const tick = dt => { cols.forEach(c => c.userData.tick(dt)); all.userData.tick(dt); };
    const controls = [
      { type: 'toggle', label: 'Normalise text before scoring', short: 'normalise', get: () => st.norm, set: v => { st.norm = v; draw(); } },
      { type: 'buttons', label: 'Report', options: ['By group of speakers', 'One overall number'], get: () => (st.slices ? 0 : 1), act: i => { st.slices = !i; draw(); } },
      { type: 'buttons', label: 'Test set', options: ['Our own recordings', 'Public read speech'], get: () => st.test, act: i => { st.test = i; draw(); } },
    ];
    const readouts = [
      { label: 'This sentence', get: () => ({ v: `${Math.round(R.A.wer * 100)}%`, sub: 'word error rate', good: R.A.wer === 0, bad: R.A.wer > 0.2 }) },
      { label: 'Overall', get: () => ({ v: `${(R.overall * 100).toFixed(1)}%`, sub: 'weighted by traffic', good: R.overall < 0.1 }) },
      { label: 'Worst group', get: () => ({ v: `${Math.round(R.worst.wer * 100)}%`, sub: R.worst.n, bad: R.worst.wer > 0.1, good: R.worst.wer <= 0.1 }) },
    ];
    const labels = [
      { name: 'utt', t: 'Said, back. Heard, front', d: 'Coral: an error counted', icon: 'code', atV: V(-2.85, 0.03, -0.05) },
      { name: 'slices', t: 'Errors by speaker group', d: 'Wider: more callers. Red bar: the launch limit', icon: 'scale', atV: V(SX(4) + 0.42, barY, 0.25) },
    ];
    const reset = () => { Object.assign(st, { norm: true, slices: true, test: 0 }); draw(); };
    const breaks = [
      { label: 'No normalisation', hint: 'Score the raw text', on: () => { reset(); st.norm = false; draw(); }, off: reset },
      { label: 'One overall number', hint: 'Average everyone', on: () => { reset(); st.slices = false; draw(); }, off: reset },
      { label: 'Public test set only', hint: 'Clean read speech', on: () => { reset(); st.test = 1; draw(); }, off: reset },
    ];
    function status() {
      const ov = (R.overall * 100).toFixed(1);
      if (!st.norm) return { ok: false, msg: `<b>Errors that are not errors.</b> Scored on the raw text, "Tafadhali" against "tafadhali", "simu." against "simu", and "elfu tano" against "5000" all count as mistakes: word error rate ${Math.round(R.A.wer * 100)}% for a sentence the recogniser got right. Lower-case, strip punctuation and write numbers out the same way before scoring.` };
      if (!st.slices) return { ok: false, msg: `<b>${ov}% looks ready to launch.</b> The overall figure clears the 10% bar because most test speakers are adults from Dar es Salaam and Arusha. Split by group, older speakers on the coast see ${Math.round(SLICES[3].wer * 100)}% and children ${Math.round(SLICES[4].wer * 100)}%: they would get the worst service. Report every group.` };
      if (st.test === 1) return { ok: false, msg: `<b>Near perfect, on the wrong test.</b> On the public set of clean read speech the model scores ${Math.round(PUBLIC * 100)}% for everyone: it was tuned on sets like it, and nobody reads aloud to a mobile-money line. Our own recordings of real callers show the true picture. Keep a private test set that looks like your traffic.` };
      return { ok: true, msg: `<b>Overall ${ov}%, under the bar, but the worst group is at ${Math.round(R.worst.wer * 100)}% (${R.worst.n}).</b> Normalised scoring counts only real mistakes, and splitting by group shows exactly who needs more training data before launch: coastal speakers over 60, then children.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Before launch', home: true, say: 'A team in Dar es Salaam tests a Swahili speech recogniser for a mobile-money line before launch.', act: m => m.set({ norm: true, slices: true, test: 0 }) },
    { t: 'Word error rate', home: true, say: 'Align what was said with what was heard. Substitutions, deletions and insertions, over the words said, give the word error rate.', act: m => m.set({}) },
    { t: 'Normalise first', home: true, say: 'Score raw text, and capitals, full stops and "5000" for "elfu tano" all count as errors, though the recogniser was right.', act: m => m.set({ norm: false }) },
    { t: 'One number lies', home: true, say: 'Report one overall number, and it clears the launch bar. It hides the groups the recogniser fails.', act: m => m.set({ norm: true, slices: false }) },
    { t: 'Who it fails', home: true, say: 'Split by group: older speakers on the coast and children see far more errors. They need more training data.', act: m => m.set({ slices: true }) },
    { t: 'The right test', home: true, say: 'On public read speech, it scores almost perfectly for everyone. Real callers do not read aloud. Test on your own traffic.', act: m => m.set({ test: 1 }) },
  ],
  check: [
    { q: 'Why normalise text before computing word error rate?', options: ['So case, punctuation and number formats are not counted as errors', 'To make the rate lower on purpose', 'To remove hard words'], answer: 0, why: '"5000" and "elfu tano" mean the same.' },
    { q: 'Why report word error rate by group of speakers?', options: ['An overall average hides the groups the system fails', 'Groups are easier to compute', 'It makes results smaller'], answer: 0, why: 'Those speakers get the worst service.' },
    { q: 'Why keep a private test set?', options: ['Public benchmarks are near saturated and do not look like your traffic', 'Public sets are illegal', 'Private sets are smaller'], answer: 0, why: 'Models are tuned to public sets.' },
  ],
  terms: [
    ['Word error rate', 'Substitutions, deletions and insertions over reference words.'],
    ['Normalisation', 'Making case, punctuation and numbers consistent before scoring.'],
    ['Mean opinion score', 'Average listener rating of quality, 1 to 5.'],
    ['UTMOS', 'A model that predicts mean opinion scores.'],
    ['Fréchet audio distance', 'Distance between real and generated audio embeddings.'],
    ['Slice', 'A subgroup of the test set, reported on its own.'],
  ],
  deeper: '<p><b>The metric for each task.</b> Recognition: WER or CER and latency. Synthesis: MOS, UTMOS and round-trip WER. Cloning: speaker similarity too. Verification: EER. Diarisation: DER. Classification: per-class recall. Music: Fréchet audio distance and listening tests.</p><p><b>Swahili and its neighbours.</b> Swahili written forms vary, numbers are often typed as digits, and speakers mix in English. A shared normaliser for your language, agreed before testing, avoids arguments about what counts as an error.</p><p><b>About this machine.</b> The sentences and group results are set by hand. The alignment, WER, overall average and verdicts are computed live.</p>',
  code: {
    title: 'Normalised WER, by slice',
    note: 'Adapted from the course\'s audio evaluation lesson.',
    text: `
import re, jiwer

def normalise(s, numbers={"5000": "elfu tano"}):
    s = re.sub(r"[.,!?]", "", s.lower())
    return " ".join(numbers.get(w, w) for w in s.split())

def wer_by_slice(rows):            # rows: (slice, reference, hypothesis)
    out = {}
    for sl in {r[0] for r in rows}:
        refs = [normalise(r) for s, r, h in rows if s == sl]
        hyps = [normalise(h) for s, r, h in rows if s == sl]
        out[sl] = jiwer.wer(refs, hyps)
    return out
`,
  },
};
