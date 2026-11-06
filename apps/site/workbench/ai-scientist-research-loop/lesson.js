// AI Scientist v2 (phase 15, lesson 5): an end-to-end research loop (idea, novelty check, experiment, figures, write-up, review) run on 100 ideas.
// Failure rates follow the independent evaluation: 42% of experiments fail on coding errors, 25% of "novel" ideas are already known. Expected
// counts flow through the funnel live: retries rescue experiments, figure polish hides broken results from a presentation-only review, a review
// that re-runs experiments and searches the literature catches them, and a sandbox contains the generated code.
const N = 100, F = 0.42, M = 0.25, WRITE_ANYWAY = 0.5, SILENT = 0.15, RISKY = 0.03;
function funnel(o) {
  const s = 1 - Math.pow(F, o.retries + 1), attempts = N * Array.from({ length: o.retries + 1 }, (_, k) => Math.pow(F, k)).reduce((a, b) => a + b, 0);
  const clean = N * (1 - M) * s * (1 - SILENT), known = N * M * s * (1 - SILENT), silent = N * s * SILENT, failed = N * (1 - s), flawed = silent + failed * WRITE_ANYWAY, dropped = failed * (1 - WRITE_ANYWAY);
  const flawedPass = o.claims ? 0.1 : o.polish ? 1 : 0.5, knownPass = o.lit ? 0.2 : 1;
  const sub = { clean, known: known * knownPass, flawed: flawed * flawedPass };
  const incidents = attempts * RISKY;
  return { s, attempts, clean, known, silent, failed, flawed, dropped, sub, total: sub.clean + sub.known + sub.flawed, hidden: sub.known + sub.flawed, incidents };
}
const r0 = x => Math.round(x);

export default {
  slug: 'ai-scientist-research-loop',
  title: 'An AI scientist: polish is not proof',
  description: 'An AI scientist runs a hundred ideas from novelty check to paper. Follow what survives each stage, and what a review that only reads the paper lets through.',
  overview: 'Research has no unit test. A paper is judged by reviewers, which makes the loop hard to close and valuable if closed. AI Scientist v1 (Sakana, 2024) filled in experiments within human-written templates; v2 (2025) drops the templates and uses an agentic tree search: generate an idea, check the literature for novelty, plan and code the experiment, run it in a sandbox and retry on failure, have a vision-language model critique and redraw the figures, write the paper and iterate with an internal reviewer. One v2 paper passed peer review at an ICLR 2025 workshop, with its origin disclosed: a proof of concept at a lower bar, not a claim of reliable research. An independent evaluation (Beel and colleagues, 2025) found 42% of experiments failed on coding errors such as bad imports and shape mismatches, the novelty check often labelled established methods as new, and the figure critique produced publication-grade visuals that masked weak experiments. That last point matters most: a system that produces convincing output without convincing research is more dangerous than one that fails obviously. Review has to reach the claims: re-run the experiments from the logs and search the literature independently, not just read the paper. And the code is model-written and runs with whatever the process may do; the project itself warns of dangerous packages, uncontrolled web access and unintended processes. Of the generator-plus-evaluator systems in this phase, this one has the weakest automatic evaluator and the widest output, so the sandbox, the review and disclosure do most of the safety work.',
  keywords: ['AI Scientist', 'automated research', 'sandboxing', 'peer review', 'evaluation', 'AI safety', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.45, 0], dir: [0.05, 0.8, 1.2], half: 1.1, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { retries: 2, polish: true, claims: true, lit: true, sandbox: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const KC = { clean: GOOD, known: SAF, flawed: BAD, failed: BAD, dropped: '#B9B4A8' };
    const ST = ['100 ideas', 'after the\nnovelty check', 'after the\nexperiments', 'written up,\nfigures polished', 'submitted\nafter review'];
    const SX = i => -2.55 + i * 1.18, BZ = 0, HS = 0.012;
    const bars = ST.map((n, i) => {
      const segs = ['clean', 'known', 'flawed', 'dropped'].map(k => { const m = new THREE.MeshLambertMaterial({ color: KC[k] }), b = P.box(0.5, 1, 0.5, KC[k], { r: 0.03, material: m }); b.position.set(SX(i), 0, BZ); b.userData.noFit = true; S.add(b); return { k, b }; });
      if (i < ST.length - 1) { const a = P.arrow(V(SX(i) + 0.32, 0.2, BZ), V(SX(i + 1) - 0.32, 0.2, BZ), 0.014, CHAR); S.add(a); }
      return { segs };
    });
    const sbm = new THREE.MeshLambertMaterial({ color: '#FFF', transparent: true, opacity: 0.6 });
    const walls = [[0, -0.36, 0.9, 0.04], [0, 0.32, 0.9, 0.04], [-0.45, -0.02, 0.04, 0.72], [0.45, -0.02, 0.04, 0.72]].map(([dx, dz, w, d]) => { const b = P.box(w, 0.16, d, '#fff', { r: 0.01, material: sbm }); b.position.set(SX(2) + dx, 0, BZ + dz); b.userData.noFit = true; S.add(b); return b; });
    const sparks = Array.from({ length: 6 }, (_, k) => { const b = P.ball(0.05, RED); b.position.set(SX(2) + 0.65 * Math.cos(k), 0.35 + 0.12 * (k % 3), BZ + 0.6 * Math.sin(k)); b.userData.noFit = true; S.add(b); return b; });

    /* the review before submission: a gate. Green when it re-runs the experiments; a gold lamp when it also searches the literature itself */
    const rev = P.gate(0.75, '#B9B4A8', { h: 0.55 }); rev.position.set((SX(3) + SX(4)) / 2, 0, BZ); rev.rotation.y = Math.PI / 2; S.add(rev);
    const litL = P.lamp(SAF, { h: 0.55, r: 0.09 }); litL.position.set((SX(3) + SX(4)) / 2, 0, BZ - 0.55); S.add(litL);
    S.add(P.keep(-2.95, 2.4, 1.25, -0.75, 0.75));
    let R = null;
    function draw() {
      R = funnel(st);
      const C = [
        { clean: N * (1 - M), known: N * M, flawed: 0, dropped: 0 },
        { clean: N * (1 - M), known: N * M, flawed: 0, dropped: 0 },
        { clean: R.clean, known: R.known, flawed: R.silent + R.failed, dropped: 0 },
        { clean: R.clean, known: R.known, flawed: R.flawed, dropped: 0 },
        { clean: R.sub.clean, known: R.sub.known, flawed: R.sub.flawed, dropped: 0 },
      ];
      bars.forEach((B, i) => {
        let y = 0;
        B.segs.forEach(({ k, b }) => { const h = Math.max(0.002, C[i][k] * HS * 0.8); b.scale.y = h; b.position.y = y; y += h; b.visible = C[i][k] > 0.05; });
      });
      walls.forEach(w => { w.visible = st.sandbox; });
      rev.userData.set({ color: st.claims ? GOOD : '#B9B4A8', open: false }); litL.userData.set({ color: st.lit ? SAF : '#C9C4B6', on: st.lit });
      sparks.forEach((b, k) => { b.visible = !st.sandbox && k < Math.min(6, r0(R.incidents)); });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Retries after a failed experiment', min: 0, max: 3, step: 1, get: () => st.retries, set: v => set({ retries: Math.round(v) }) },
      { type: 'toggle', label: 'Model critique polishes the figures', short: 'Polish', get: () => st.polish, set: v => set({ polish: !!v }) },
      { type: 'toggle', label: 'Review re-runs the experiments', short: 'Check claims', get: () => st.claims, set: v => set({ claims: !!v }) },
      { type: 'toggle', label: 'Review searches the literature itself', short: 'Literature', get: () => st.lit, set: v => set({ lit: !!v }) },
      { type: 'toggle', label: 'Run generated code in a sandbox', short: 'Sandbox', get: () => st.sandbox, set: v => set({ sandbox: !!v }) },
    ];
    const readouts = [
      { label: 'Submitted', get: () => ({ v: String(r0(R.total)), sub: `of ${N} ideas` }) },
      { label: 'Hidden flaws', get: () => ({ v: String(r0(R.hidden)), sub: 'in submitted papers', good: R.hidden <= 8, bad: R.hidden > 8 }) },
      { label: 'Risky actions', get: () => ({ v: String(r0(R.incidents)), sub: st.sandbox ? 'blocked' : 'ran unchecked', good: st.sandbox, bad: !st.sandbox }) },
    ];
    const labels = [
      { name: 'fun', t: '100 ideas, stage by stage', d: 'Teal sound, gold already known, coral broken', icon: 'turn', atV: V(SX(0) - 0.25, 0.3, 0.25) },
      { name: 'sb', t: 'Sandbox', d: 'Walls round the experiments. Red: risky actions', icon: 'box', atV: V(SX(2) - 0.45, 0.1, 0.25) },
      { name: 'rev', t: 'Review', d: 'Green: re-runs the experiments. Lamp: checks the literature', icon: 'eye', atV: V((SX(3) + SX(4)) / 2, 0.3, 0.38) },
      { name: 'sub', t: 'Submitted', d: 'What the review let through', icon: 'check', atV: V(SX(4) + 0.25, 0.3, 0.38) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Review the paper, not the claims', hint: 'polish hides flaws', on: () => set({ ...D0, claims: false }), off: reset },
      { label: 'Trust the novelty check', hint: 'known ideas pass', on: () => set({ ...D0, lit: false }), off: reset },
      { label: 'Run the code outside a sandbox', hint: 'full access', on: () => set({ ...D0, sandbox: false }), off: reset },
    ];
    function status() {
      if (!st.sandbox) return { ok: false, msg: `<b>The generated code ran ${r0(R.attempts)} times with the lab machine\'s full access, and about ${r0(R.incidents)} runs tried something risky: an unvetted package, a network call, a stray process.</b> The code is model-written and does whatever the process is allowed to. Isolate it: no network, no installs, its own process and file limits.` };
      if (!st.claims) return { ok: false, msg: `<b>Reviewing the paper rather than the claims, ${r0(R.sub.flawed)} papers with broken experiments are submitted${st.polish ? ': the figure critique made them look publication-grade' : ''}.</b> ${st.polish ? 'Polish masks weakness. ' : ''}Re-run each experiment from its logs before anything leaves the system.` };
      if (!st.lit) return { ok: false, msg: `<b>Trusting the loop\'s own novelty check, ${r0(R.sub.known)} papers present already-known methods as new.</b> The check labelled established ideas as novel, the research version of a hallucination. Search the literature independently before submission.` };
      if (st.retries === 0) return { ok: true, msg: `<b>With no retries, ${r0(R.failed)} of ${N} experiments crash; the review still catches most of the ${r0(R.flawed)} broken ones written up anyway.</b> Retries raise the yield; they don\'t replace the review.` };
      return { ok: true, msg: `<b>${r0(R.total)} of ${N} ideas reach submission, ${r0(R.hidden)} with a flaw the review missed: experiments re-run from their logs, novelty checked against the literature independently, and every run sandboxed.</b> Then disclose that the work was machine-generated.` };
    }
    return { update: dt => rev.userData.tick(dt), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A research loop', home: true, say: 'A research group in Ibadan runs an automated scientist on a hundred ideas: check novelty, run experiments, draw figures, write the paper.', act: m => m.set({ retries: 2, polish: true, claims: true, lit: true, sandbox: true }) },
    { t: 'Experiments fail', home: true, say: 'In an independent test, four in ten experiments failed on coding errors. Retries rescue many, but some run with a silent bug.', act: m => m.set({ retries: 0, polish: true, claims: true, lit: true, sandbox: true }) },
    { t: 'Polish hides flaws', home: true, say: 'Some broken experiments are written up anyway, and the figure critique makes them look publication-grade.', act: m => m.set({ retries: 2, polish: true, claims: false, lit: true, sandbox: true }) },
    { t: 'Known ideas, labelled new', home: true, say: 'The novelty check often marks established methods as new. Check the literature independently.', act: m => m.set({ retries: 2, polish: true, claims: true, lit: false, sandbox: true }) },
    { t: 'Sandbox the code', home: true, say: 'The experiments are model-written code. Run them with no network, no installs and their own process.', act: m => m.set({ retries: 2, polish: true, claims: true, lit: true, sandbox: false }) },
    { t: 'Review reaches the claims', home: true, say: 'Re-run the experiments, search the literature, sandbox every run, and disclose the origin.', act: m => m.set({ retries: 2, polish: true, claims: true, lit: true, sandbox: true }) },
  ],
  check: [
    { q: 'Why is figure polish a risk?', options: ['It can make broken experiments look publication-grade', 'Figures are never needed', 'It slows the loop'], answer: 0, why: 'Convincing output is not convincing research.', hint: 'Try Review the paper, not the claims.' },
    { q: 'What should a review of machine-written research check?', options: ['The underlying claims: re-run experiments, search the literature', 'Only the writing', 'Only the figures'], answer: 0, why: 'Review must reach the claims.', hint: 'Read the review line.' },
    { q: 'Why run the generated experiments in a sandbox?', options: ['The code is model-written and can do anything the process may', 'It is faster', 'Reviewers require it'], answer: 0, why: 'Isolation limits network, installs and processes.', hint: 'Try Run the code outside a sandbox.' },
  ],
  terms: [
    ['AI Scientist', 'A loop from idea to experiment to paper, run by models.'],
    ['Novelty check', 'Searching the literature to see if an idea is new.'],
    ['Sandbox', 'An isolated environment limiting network, files and processes.'],
    ['Presentation gap', 'Polished output that hides weak underlying work.'],
    ['Claim-level review', 'Re-running experiments and checking sources, not just reading.'],
    ['Disclosure', 'Stating that the work was machine-generated.'],
  ],
  deeper: '<p><b>A data point, not a licence.</b> One workshop acceptance shows the loop can produce something reviewers accept; review is noisy and workshops are a lower bar, so it says little about reliability.</p><p><b>Stronger isolation for longer runs.</b> A container is the minimum; kernel-level filters or a user-space kernel are better for multi-day runs.</p><p><b>About this machine.</b> Expected counts for 100 ideas, using the evaluation\'s 42% experiment failures and 25% novelty mislabels; the rest (15% silent bugs, half of crashed runs written up, review catch rates, 3% risky runs) are illustrative.</p>',
  code: {
    title: 'The loop as a state machine',
    note: 'Adapted from the course\'s research-loop simulator (code/main.py).',
    text: `
def run_idea(p, retries):
    novel = random.random() > p.novelty_mislabel      # check says novel either way
    for attempt in range(retries + 1):
        if random.random() > p.experiment_failure:
            ok = True; break
    else:
        ok = False
    if not ok and random.random() < 0.5:
        return "dropped"
    paper = Paper(novel=novel, experiment_ok=ok, polished=p.figure_critique)
    return review(paper)                              # must reach the claims

def review(paper):
    if rerun_experiment(paper) is False: return "rejected: broken experiment"
    if literature_search(paper) == "known": return "rejected: not novel"
    return "submit, with disclosure"
`,
  },
};
