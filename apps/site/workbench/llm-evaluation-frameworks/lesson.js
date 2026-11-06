// LLM evaluation: twenty test questions for a farm advice bot used in Uganda and Malawi, each scored for faithfulness by people and by an LLM judge.
// The scatter compares judge with human scores; the release gate opens when the judge's mean reaches 0.75. Spearman correlation, means and the gate are computed live
// from the scores; the scores themselves are set to show each judge's habits. Break it: a judge that likes long answers, parse failures dropped silently,
// the bot judging itself (every score shifted up, so rank correlation still looks fine).
const H1 = [0.9, 0.85, 0.95, 0.8, 0.7, 0.9, 0.15, 0.85, 0.75, 0.9, 0.2, 0.8, 0.95, 0.7, 0.85, 0.1, 0.9, 0.8, 0.75, 0.85];
const LEN = [0.4, 0.3, 0.55, 0.2, 0.65, 0.35, 0.95, 0.45, 0.25, 0.6, 0.9, 0.3, 0.5, 0.15, 0.4, 1.0, 0.35, 0.7, 0.2, 0.45];
const NOISE = [0.03, -0.04, 0.02, 0.05, -0.03, 0.01, 0.04, -0.05, 0.02, -0.02, 0.03, 0.04, -0.01, 0.05, -0.04, 0.02, -0.03, 0.01, 0.04, -0.02];
const BAD = [6, 10, 15], GATE = 0.75;
const clip = x => Math.max(0, Math.min(1, x));
function run(st) {
  const human = H1.map((h, i) => (st.v2 && BAD.includes(i) ? [0.85, 0.8, 0.9][BAD.indexOf(i)] : h));
  const len = LEN.map((l, i) => (st.v2 && BAD.includes(i) ? 0.35 : l));
  const judge = human.map((h, i) => {
    if (st.judge === 0 && !st.v2 && BAD.includes(i)) return NaN;   // this judge's strict JSON reply breaks on these long, rambling answers
    return st.judge === 0 ? clip(h + NOISE[i]) : st.judge === 1 ? clip(0.5 * h + 0.5 * len[i] + 0.25) : clip(h + 0.15 + NOISE[i]);
  });
  const used = judge.map((j, i) => [j, human[i], i]).filter(([j]) => st.drop ? !isNaN(j) : true).map(([j, h, i]) => [isNaN(j) ? 0 : j, h, i]);
  const mean = used.reduce((a, x) => a + x[0], 0) / used.length, hmean = human.reduce((a, b) => a + b, 0) / human.length;
  const rank = a => { const s = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = Array(a.length); let k = 0; while (k < s.length) { let e = k; while (e + 1 < s.length && s[e + 1][0] === s[k][0]) e++; for (let t = k; t <= e; t++) r[s[t][1]] = (k + e) / 2; k = e + 1; } return r; };
  const rj = rank(used.map(x => x[0])), rh = rank(used.map(x => x[1])), n = used.length, mr = (n - 1) / 2;
  let num = 0, dj = 0, dh = 0; for (let i = 0; i < n; i++) { num += (rj[i] - mr) * (rh[i] - mr); dj += (rj[i] - mr) ** 2; dh += (rh[i] - mr) ** 2; }
  const rho = num / Math.sqrt(dj * dh);
  return { human, judge, used, mean, hmean, rho, pass: mean >= GATE, truth: hmean >= GATE, dropped: judge.filter(j => isNaN(j)).length };
}

export default {
  slug: 'llm-evaluation-frameworks',
  title: 'Evaluating LLMs: judge the judge',
  description: 'Twenty test questions for a farm advice bot are scored for faithfulness by people and by an LLM judge, and a release gate opens if the judge\'s average is high enough. Then use a judge that likes long answers, drop the judge\'s broken replies, or let the bot grade itself.',
  overview: 'LLM applications are evaluated with metrics such as faithfulness (is every claim supported by the retrieved context?), answer relevance, context precision and context recall. Frameworks like RAGAS, DeepEval and G-Eval compute these with an LLM as judge: a rubric, the question, the context and the answer go in, a score comes out. Judges are cheap and fast but biased: they prefer longer answers, answers in their own style and the first option shown, and they score their own model family higher. Their replies sometimes fail to parse, and a pipeline that silently drops those cases drops exactly the strange answers you most need to see. So calibrate: score a hundred examples by hand, check the rank correlation and the gap between judge and human averages, and look at the worst cases, not just the mean.',
  keywords: ['llm evaluation', 'llm as judge', 'ragas', 'faithfulness', 'calibration', 'spearman correlation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.0, 0], dir: [0.05, 0.32, 1.3], half: 1.7, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { judge: 0, drop: false, v2: false };
    const ink = '#151827';
    const base = P.box(6.6, 0.12, 2.3, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    /* scatter: human score across, judge score up */
    const PX = -1.3, PW = 2.0, PY = 0.45, PH = 1.35, BZ = -0.6;
    const board = P.box(3.4, 1.85, 0.05, '#FBF8F1', { r: 0.03, material: new THREE.MeshBasicMaterial({ color: '#FBF8F1' }) }); board.position.set(PX + 0.25, 0.25, BZ); S.add(board);
    [-1.5, 1.5].forEach(dx => { const p = P.cyl(0.03, 0.13, '#8A8578'); p.position.set(PX + 0.25 + dx, 0.12, BZ); S.add(p); });
    const t1 = S.text('Judge score against human score', { size: 0.1, weight: 800, face: 'front', color: ink }); t1.position.set(PX + 0.25, 1.98, BZ + 0.035); S.add(t1);
    const X = h => PX - PW / 2 + h * PW, Y = j => PY + j * PH;
    [[V(X(0), Y(0), BZ + 0.04), V(X(1), Y(0), BZ + 0.04)], [V(X(0), Y(0), BZ + 0.04), V(X(0), Y(1), BZ + 0.04)]].forEach(([a, b]) => { const r = P.rod(a, b, 0.008, '#8A8578'); S.add(r); });
    const diag = P.rod(V(X(0), Y(0), BZ + 0.035), V(X(1), Y(1), BZ + 0.035), 0.006, '#C9C1B0'); S.add(diag);
    const gl = P.rod(V(X(0), Y(GATE), BZ + 0.036), V(X(1), Y(GATE), BZ + 0.036), 0.006, '#D64545'); S.add(gl);
    const glt = S.text('gate 0.75', { size: 0.065, weight: 700, face: 'front', color: '#D64545' }); glt.position.set(X(1) + 0.2, Y(GATE), BZ + 0.035); S.add(glt);
    const ax1 = S.text('human score →', { size: 0.07, weight: 700, face: 'front', color: '#5A5A66' }); ax1.position.set(PX, PY - 0.1, BZ + 0.035); S.add(ax1);
    const ax2 = S.text('judge ↑', { size: 0.07, weight: 700, face: 'front', color: '#5A5A66' }); ax2.position.set(X(0) - 0.2, Y(1), BZ + 0.035); S.add(ax2);
    const dots = H1.map(() => { const mm = new THREE.MeshLambertMaterial({ color: C.teal }), b = P.ball(0.045, C.teal); b.material = mm; b.userData.noFit = true; S.add(b); return { b, mm }; });
    const failT = S.text('', { size: 0.07, weight: 800, face: 'front', color: '#8A8578', maxW: 0.9 }); failT.position.set(X(1) + 0.55, Y(0.35), BZ + 0.035); S.add(failT);
    /* the release gate */
    const GX = 2.0, GZ = 0.05;
    [-0.75, 0.75].forEach(dx => { const p = P.box(0.16, 1.0, 0.16, '#3B3F8F', { r: 0.03 }); p.position.set(GX + dx, 0.12, GZ); S.add(p); });
    const arm = new THREE.Group(); arm.position.set(GX - 0.75, 0.95, GZ + 0.12); S.add(arm);
    const armBox = P.box(1.5, 0.1, 0.08, '#D64545', { r: 0.03 }); armBox.position.set(0.75, -0.05, 0); arm.add(armBox);
    const sign = P.box(1.3, 0.34, 0.06, '#FBF8F1', { r: 0.03 }); sign.position.set(GX, 0.5, GZ); S.add(sign);
    const sT = S.text('', { size: 0.1, weight: 800, face: 'front', color: ink, maxW: 1.2 }); sT.position.set(GX, 0.67, GZ + 0.035); S.add(sT);
    const mT = S.text('', { size: 0.075, weight: 700, face: 'front', color: '#5A5A66', maxW: 1.6 }); mT.position.set(GX, 0.3, GZ + 0.13); S.add(mT);
    const plate = P.box(1.7, 0.2, 0.06, '#E3DCCB', { r: 0.03 }); plate.position.set(GX, 0.2, GZ + 0.09); S.add(plate);

    let R = null, armA = 0;
    function draw() {
      R = run(st);
      dots.forEach((d, i) => { const j = R.judge[i], fail = isNaN(j); d.b.position.set(fail ? X(1) + 0.55 + (BAD.indexOf(i) - 1) * 0.14 : X(R.human[i]), fail ? Y(0.25) : Y(j), BZ + 0.07);
        d.mm.color.set(fail ? (st.drop ? '#C9C5BA' : '#D64545') : Math.abs(j - R.human[i]) > 0.25 ? '#D64545' : C.teal); });
      failT.userData.set(R.dropped ? (st.drop ? 'parse failed: dropped' : 'parse failed: scored 0') : '');
      sT.userData.set(R.pass ? 'Release: open' : 'Release: blocked'); sign.material.color.set(R.pass ? '#9ED9C9' : '#E8A0A0');
      mT.userData.set(`judge mean ${R.mean.toFixed(2)} · people ${R.hmean.toFixed(2)}`);
    }
    draw();
    const update = dt => { const goal = R.pass ? Math.PI / 2.2 : 0; armA += (goal - armA) * Math.min(1, dt * 3); arm.rotation.z = armA; };
    const controls = [
      { type: 'buttons', label: 'Judge', options: ['Calibrated', 'Likes long answers', 'Same model as the bot'], get: () => st.judge, act: i => { st.judge = i; draw(); } },
      { type: 'buttons', label: 'Judge replies that fail to parse', options: ['Count as 0', 'Drop silently'], get: () => (st.drop ? 1 : 0), act: i => { st.drop = !!i; draw(); } },
      { type: 'buttons', label: 'Bot version', options: ['v1', 'v2: retrieval fixed'], get: () => (st.v2 ? 1 : 0), act: i => { st.v2 = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Agreement (Spearman ρ)', get: () => ({ v: R.rho.toFixed(2), sub: 'judge vs people, ranks', good: R.rho >= 0.7, bad: R.rho < 0.7 }) },
      { label: 'Judge minus people', get: () => ({ v: (R.mean - R.hmean >= 0 ? '+' : '') + (R.mean - R.hmean).toFixed(2), sub: 'average gap', bad: Math.abs(R.mean - R.hmean) > 0.05 }) },
      { label: 'Gate decision', get: () => ({ v: R.pass === R.truth ? 'right' : 'wrong', sub: R.pass ? 'opens' : 'stays shut', good: R.pass === R.truth, bad: R.pass !== R.truth }) },
    ];
    const labels = [
      { name: 'scatter', t: 'Judge against people', d: 'Red: far from the human score', icon: 'scale', atV: V(PX - 1.45, 1.1, BZ) },
      { name: 'gate', t: 'Release gate', d: 'Opens at a 0.75 judge mean', icon: 'target', atV: V(GX + 0.83, 0.7, GZ) },
    ];
    const reset = () => { Object.assign(st, { judge: 0, drop: false, v2: false }); draw(); };
    const breaks = [
      { label: 'Judge likes long answers', hint: 'Uncalibrated', on: () => { reset(); st.judge = 1; draw(); }, off: reset },
      { label: 'Drop broken replies', hint: 'Silently', on: () => { reset(); st.drop = true; draw(); }, off: reset },
      { label: 'Bot judges itself', hint: 'Same model', on: () => { reset(); st.judge = 2; draw(); }, off: reset },
    ];
    function status() {
      const wrong = R.pass !== R.truth;
      if (st.judge === 1) return { ok: false, msg: `<b>The judge rewards length, not truth.</b> Its ranking agrees poorly with people's (ρ = ${R.rho.toFixed(2)}), and the long, wrong answers about spraying score highest. ${wrong ? `Its mean of ${R.mean.toFixed(2)} opens the gate though people average ${R.hmean.toFixed(2)}.` : ''} Score a hundred cases by hand and require ρ of at least 0.7 before trusting a judge.` };
      if (st.drop && R.dropped) return { ok: false, msg: `<b>The worst answers vanished from the average.</b> The judge's replies on ${R.dropped} long answers were not valid JSON, and dropping them silently leaves ${R.used.length} cases: the mean jumps to ${R.mean.toFixed(2)} and the gate opens. Those were the three unfaithful answers. Count failures as zero, or fail the run.` };
      if (st.judge === 2) return { ok: false, msg: `<b>Ranks agree, the scale does not.</b> Judging its own answers, the model gives every one about 0.15 too much: ρ = ${R.rho.toFixed(2)} looks excellent, but the mean is ${R.mean.toFixed(2)} against people's ${R.hmean.toFixed(2)}${wrong ? ', and the gate opens' : ''}. Use a judge from a different model family, and compare averages as well as ranks.` };
      return { ok: true, msg: R.pass ? `<b>Open, and rightly.</b> With retrieval fixed, the three unfaithful answers are now supported by their context. The calibrated judge tracks people (ρ = ${R.rho.toFixed(2)}) and its mean of ${R.mean.toFixed(2)} clears the gate.` : `<b>Blocked, and rightly.</b> Three answers make claims their context does not support. The calibrated judge tracks people (ρ = ${R.rho.toFixed(2)}), the broken replies count as zero, and the mean of ${R.mean.toFixed(2)} stays below 0.75. Fix retrieval and try v2.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Grade the bot', home: true, say: 'A farm advice bot used in Uganda and Malawi is tested on twenty questions. People and an LLM judge both score each answer for faithfulness.', act: m => m.set({ judge: 0, drop: false, v2: false }) },
    { t: 'A calibrated judge', home: true, say: 'This judge agrees with people. Three answers make claims their sources do not support, so the release gate stays shut.', act: m => m.set({}) },
    { t: 'Long is not right', home: true, say: 'An uncalibrated judge likes long answers. The long, wrong ones score highest, and the gate opens.', act: m => m.set({ judge: 1 }) },
    { t: 'Broken replies', home: true, say: 'The judge\'s replies on those three answers were not valid JSON. Drop them silently, and the bad answers vanish from the average.', act: m => m.set({ judge: 0, drop: true }) },
    { t: 'Marking its own work', home: true, say: 'Let the bot judge itself, and every score drifts up. The ranks still agree, so only comparing averages shows it.', act: m => m.set({ drop: false, judge: 2 }) },
    { t: 'Fix, then pass', home: true, say: 'Fix retrieval in version two. Now a calibrated judge opens the gate, and it is right to.', act: m => m.set({ judge: 0, v2: true }) },
  ],
  check: [
    { q: 'Before trusting an LLM judge, you should…', options: ['Compare its scores with human scores on hand-labelled cases', 'Use the longest rubric', 'Run it once'], answer: 0, why: 'Calibration shows whether it measures what you think.' },
    { q: 'Why is dropping unparseable judge replies dangerous?', options: ['It can silently remove the worst cases from the average', 'It makes runs slower', 'It changes the questions'], answer: 0, why: 'Strange answers cause strange judge replies.' },
    { q: 'A judge from the same model as the bot tends to…', options: ['Score the bot\'s answers too high', 'Score them too low', 'Refuse to score'], answer: 0, why: 'Use a different model family.' },
  ],
  terms: [
    ['LLM as judge', 'Using a model with a rubric to score outputs.'],
    ['Faithfulness', 'Every claim in an answer is supported by its context.'],
    ['Calibration', 'Checking a judge against human scores.'],
    ['Spearman ρ', 'Rank correlation between two sets of scores.'],
    ['Release gate', 'A test that blocks a release below a threshold.'],
    ['Self-preference', 'A judge favouring answers from its own model.'],
  ],
  deeper: '<p><b>The four RAG metrics.</b> Faithfulness checks the answer against the context, answer relevance checks it against the question, context precision checks how much of what was retrieved was useful, and context recall checks whether everything needed was retrieved.</p><p><b>Look at the bottom.</b> An average of 0.85 can hide a few answers that tell farmers to use the wrong chemical. Read the lowest-scored cases on every run.</p><p><b>About this machine.</b> Scores are set to show each judge\'s habits. Spearman correlation, the averages, the gap and the gate are computed live from them.</p>',
  code: {
    title: 'A CI gate with honest failures',
    note: 'Adapted from the course\'s LLM evaluation lesson.',
    text: `
import json
from scipy.stats import spearmanr

def judge_score(judge, case):
    reply = judge(rubric.format(**case))
    try:
        return float(json.loads(reply)["score"])
    except (ValueError, KeyError):
        return 0.0                      # never drop a failure silently

def gate(cases, judge, human, threshold=0.75):
    scores = [judge_score(judge, c) for c in cases]
    rho, _ = spearmanr(scores, human)
    assert rho >= 0.7, f"judge not calibrated (rho={rho:.2f})"
    return sum(scores) / len(scores) >= threshold
`,
  },
};
