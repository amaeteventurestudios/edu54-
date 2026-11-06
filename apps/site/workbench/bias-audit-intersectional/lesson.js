// Bias and representational harm (phase 18, lesson 20): a CV-screening assistant for an invented recruiter hiring entry-level staff in
// several African cities. Shortlist rates are computed for four intersectional groups (women and men, from cities and small towns). A
// one-axis audit compares women with men and passes a four-fifths rule of thumb, while the women-from-small-towns cell sits well below
// it. An embedding test measures associations, not decisions. A mitigation reduces the gaps, but only fully when it uses the
// intersectional cells. All rates are illustrative.
const BASE = 40;
function rates(o) {
  const m = 1 - 0.9 * o.fix, mi = 1 - (o.targeted ? 0.9 : 0.3) * o.fix;
  const g = 2 * m, r = 2 * m, x = 10 * mi;
  const c = { mc: BASE, wc: BASE - g, mt: BASE - r, wt: BASE - g - r - x };
  const women = (c.wc + c.wt) / 2, men = (c.mc + c.mt) / 2;
  const best = Math.max(c.mc, c.wc, c.mt, c.wt), worst = Math.min(c.mc, c.wc, c.mt, c.wt);
  return { c, women, men, gender: women / men, cell: worst / best, best, embed: 0.12 + 0.18 * m };
}

export default {
  slug: 'bias-audit-intersectional',
  title: 'Bias audits: the harm a one-axis check misses',
  description: 'A CV-screening assistant shortlists applicants for entry-level jobs. Audit each group, then the groups inside the groups, where the harm can hide.',
  overview: 'Bias in a language model is harm that appears without anyone intending it, from the data the model learned from, from how prompts are framed and from many small design choices. A widely cited survey (Gallegos and colleagues, 2024) separates two kinds. Representational harm is how groups are portrayed: stereotypes, erasure and demeaning descriptions, such as always writing nurses as women. Allocational harm is who gets what: a model that scores some applicants\' CVs lower makes unequal decisions about real resources. A model can portray groups fairly and still allocate unfairly, so both must be measured. The survey also sorts metrics into three families. Embedding tests look for associations between identity words and attribute words inside the model\'s representations; probability tests compare how likely the model finds stereotyped and counter-stereotyped completions; generated-text tests measure what the model actually does on a task such as scoring CVs, which is the most realistic and the hardest to reproduce. Single-axis audits are a known blind spot. A 2025 study of five frontier models scoring CVs found penalties that only appeared at the intersection of gender and race; checking gender alone, or race alone, missed them. A ten-year review of the field (2025) adds that most work studies binary gender, leaving disability, religion, migration status, language and region far less examined. Interpretability offers new tools, such as finding and dampening neurons, sparse-autoencoder features or attention heads tied to a bias, but every fix must be re-measured on the cells that were harmed. This machine screens applicants for an invented recruiter hiring in several African cities, splitting applicants by gender and by whether they come from a city or a small town.',
  keywords: ['AI bias', 'allocational harm', 'representational harm', 'intersectionality', 'fairness audit', 'four-fifths rule', 'LLM evaluation'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { inter: true, metric: 'text', fix: 0.7, targeted: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', W = '#E07A5F', M = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const X0 = -1.75, SC = 2.55 / 45;
    const rows = ['mc', 'wc', 'mt', 'wt'].map((k, i) => {
      const mat = new THREE.MeshLambertMaterial({ color: k[0] === 'w' ? W : M });
      const bar = P.box(1, 0.05, 0.26, '#fff', { r: 0.01, material: mat }); bar.userData.noFit = true; floor.add(bar);
      return { k, bar };
    });
    const line = P.box(0.022, 0.008, 1.6, SAF, { r: 0.004 }); line.userData.noFit = true; floor.add(line);

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = rates(st);
      const show = st.inter
        ? [['mc', 'men · city', R.c.mc], ['wc', 'women · city', R.c.wc], ['mt', 'men · small town', R.c.mt], ['wt', 'women · small town', R.c.wt]]
        : [['mc', 'men', R.men], ['wc', 'women', R.women]];
      const zs = st.inter ? [-0.62, -0.23, 0.16, 0.55] : [-0.4, 0.3];
      const best = Math.max(...show.map(s => s[2]));
      rows.forEach((row, i) => {
        const s = show[i], on = !!s;
        row.bar.visible = on;
        if (!on) return;
        const len = s[2] * SC, z = zs[i];
        row.bar.material.color.set(s[0][0] === 'w' ? W : M);
        row.bar.scale.x = len; row.bar.position.set(X0 + len / 2, 0.14, z);
        const low = s[2] < 0.8 * best - 1e-9;
      });
      const lx = X0 + 0.8 * best * SC;
      line.position.set(lx, 0.15, -0.15);
      const pass = R.cell >= 0.8, embedOnly = st.metric === 'embed';
      tm.color.set(st.inter && pass && !embedOnly ? '#D9F0E9' : '#F7DED5');
      const verdict = embedOnly
        ? `embedding test only\n\nassociation size ${R.embed.toFixed(2)}\n"small"\n\nshortlists not measured`
        : st.inter
          ? `lowest group vs best\n${R.cell.toFixed(2)}\n\n${pass ? 'passes four-fifths' : 'fails four-fifths'}\n\nwomen vs men ${R.gender.toFixed(2)}`
          : `women vs men\n${R.gender.toFixed(2)}\n\n${R.gender >= 0.8 ? 'passes four-fifths' : 'fails four-fifths'}\n\nintersections unchecked`;


    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Mitigation strength', min: 0, max: 1, step: 0.05, get: () => st.fix, set: v => set({ fix: +v }), fmt: v => `${Math.round(v * 100)}%` },
      { type: 'toggle', label: 'Audit the intersections', short: 'Intersections', get: () => st.inter, set: v => set({ inter: !!v }) },
      { type: 'toggle', label: 'Mitigate using the intersectional cells', short: 'Use the cells', get: () => st.targeted, set: v => set({ targeted: !!v }) },
      { type: 'buttons', label: 'Measure with', options: ['Decisions', 'Embeddings'], get: () => st.metric === 'embed' ? 1 : 0, act: i => set({ metric: i ? 'embed' : 'text' }) },
    ];
    const readouts = [
      { label: 'Worst group', get: () => ({ v: R.cell.toFixed(2), sub: 'vs best group', good: R.cell >= 0.8, bad: R.cell < 0.8 }) },
      { label: 'Women vs men', get: () => ({ v: R.gender.toFixed(2), sub: 'one axis', good: R.gender >= 0.8, bad: R.gender < 0.8 }) },
      { label: 'Small-town women', get: () => ({ v: `${Math.round(R.c.wt)}%`, sub: 'shortlisted', good: R.c.wt >= 0.8 * R.best, bad: R.c.wt < 0.8 * R.best }) },
    ];
    const labels = [
      { name: 'b', t: 'Shortlist rates', d: 'Who the assistant puts forward', icon: 'scale', atV: V(-2.0, 0.15, -0.15) },
      { name: 't', t: 'Audit verdict', d: 'Against four-fifths of the best', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Audit one axis at a time', hint: 'women vs men only', on: () => set({ ...D0, inter: false, fix: 0 }), off: reset },
      { label: 'Trust the embedding test', hint: 'associations, not decisions', on: () => set({ ...D0, metric: 'embed', fix: 0 }), off: reset },
      { label: 'Mitigate on single axes only', hint: 'the cell stays low', on: () => set({ ...D0, targeted: false }), off: reset },
    ];
    const pct = v => `${Math.round(v)}%`;
    function status() {
      const r = R;
      if (st.metric === 'embed') return { ok: false, msg: `<b>The embedding test reports a small association, ${r.embed.toFixed(2)}, but it measures the model's representations, not who gets shortlisted.</b> Women from small towns are actually put forward at ${pct(r.c.wt)} against ${pct(r.best)} for the best group. Allocational harm shows up in decisions, so measure decisions.` };
      if (!st.inter) return { ok: false, msg: `<b>Women ${pct(r.women)} against men ${pct(r.men)}: a ratio of ${r.gender.toFixed(2)}, ${r.gender >= 0.8 ? 'which passes' : 'which fails'} the four-fifths rule of thumb.</b> But averages hide the cells: women from small towns are shortlisted at ${pct(r.c.wt)}, a ratio of ${r.cell.toFixed(2)} to the best group. Audit the intersections.` };
      if (r.cell < 0.8) return { ok: false, msg: `<b>Women from small towns are shortlisted at ${pct(r.c.wt)} against ${pct(r.best)}: a ratio of ${r.cell.toFixed(2)}, below four-fifths.</b> ${st.fix > 0 && !st.targeted ? 'A fix tuned on gender and region separately shrinks those gaps but barely touches the intersection. Mitigate using the cells and re-measure.' : 'Raise the mitigation and re-measure every cell.'}` };
      return { ok: true, msg: `<b>Every group is within four-fifths of the best: the lowest, women from small towns, is shortlisted at ${pct(r.c.wt)} against ${pct(r.best)}, a ratio of ${r.cell.toFixed(2)}.</b> Measured on real decisions, cell by cell, after a mitigation that used the intersectional data. Keep re-auditing as the model and the applicants change.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A screening assistant', home: true, say: 'A recruiter uses a model to shortlist applicants for entry-level jobs. Who gets put forward is allocational harm, if it is unequal.', act: m => m.set({ inter: false, metric: 'text', fix: 0, targeted: true }) },
    { t: 'One axis passes', home: true, say: 'Compare women with men. The ratio is above four-fifths, a common rule of thumb, so the audit looks clean.', act: m => m.set({ inter: false, metric: 'text', fix: 0, targeted: true }) },
    { t: 'Look at the cells', home: true, say: 'Split by gender and by city or small town. Women from small towns fall far below the line.', act: m => m.set({ inter: true, metric: 'text', fix: 0, targeted: true }) },
    { t: 'Measure decisions', home: true, say: 'An embedding test only reads associations inside the model. It can look small while decisions stay unequal.', act: m => m.set({ inter: true, metric: 'embed', fix: 0, targeted: true }) },
    { t: 'A blunt fix', home: true, say: 'Mitigate on gender and region separately. Those gaps shrink, but the intersection stays low.', act: m => m.set({ inter: true, metric: 'text', fix: 0.7, targeted: false }) },
    { t: 'Fix the cells', home: true, say: 'Use the intersectional cells in the fix, and re-measure every group. Now all are within four-fifths.', act: m => m.set({ inter: true, metric: 'text', fix: 0.7, targeted: true }) },
  ],
  check: [
    { q: 'Which is allocational harm?', options: ['Shortlisting some groups less often', 'Stereotyped descriptions', 'Slow responses'], answer: 0, why: 'Unequal outcomes, not portrayals.', hint: 'Read the overview.' },
    { q: 'Why can a one-axis audit pass while a group is harmed?', options: ['Averages over one axis hide intersection cells', 'Four-fifths is too strict', 'Embeddings are noisy'], answer: 0, why: 'Small-town women were averaged away.', hint: 'Try Audit one axis at a time.' },
    { q: 'What does an embedding test measure?', options: ['Associations in representations, not decisions', 'Shortlist rates', 'Accuracy'], answer: 0, why: 'Behaviour must be measured on outputs.', hint: 'Try Trust the embedding test.' },
  ],
  terms: [
    ['Representational harm', 'Stereotyped, erasing or demeaning portrayal of a group.'],
    ['Allocational harm', 'Unequal decisions about resources or opportunities.'],
    ['Intersectionality', 'Effects that appear only for combinations of identities.'],
    ['Four-fifths rule', 'A rule of thumb: each group\'s rate at least 80% of the best.'],
    ['Embedding test', 'Measures associations between identity and attribute words.'],
    ['Generated-text test', 'Measures what the model actually does on a task.'],
  ],
  deeper: '<p><b>Neglected axes.</b> Disability, religion, migration status, language and region are studied far less than binary gender; an audit only covers the axes it names.</p><p><b>Mechanistic fixes.</b> Dampening neurons, sparse-autoencoder features or attention heads linked to a bias can shrink gaps without retraining, but each fix needs the same cell-by-cell re-measurement.</p><p><b>About this machine.</b> The recruiter and all rates are invented for illustration.</p>',
  code: {
    title: 'Audit shortlist rates by cell',
    note: 'Written for this lesson.',
    text: `
from itertools import product

def audit(decisions, axes=("gender", "home"), threshold=0.8):
    cells = {}
    for combo in product(*[sorted({d[a] for d in decisions}) for a in axes]):
        group = [d for d in decisions if tuple(d[a] for a in axes) == combo]
        if group:
            cells[combo] = sum(d["shortlisted"] for d in group) / len(group)
    best = max(cells.values())
    return {cell: (rate, rate / best >= threshold) for cell, rate in cells.items()}

# audit(decisions, axes=("gender",)) can pass while audit(decisions) fails one cell
`,
  },
};
