// The complete pipeline: a team building a small assistant that speaks Yoruba, Swahili and Amharic runs the twelve stages of the track as a graph
// (01 vocab → … → 06 SFT → 07 RLHF and 08 DPO in parallel → 09 CAI/GRPO → 10 eval and 11 quantise → 12 serve → gate). Change a stage and the orchestrator
// works out what must rerun: with content hashes, everything downstream; with file names, only the stage you touched (stale outputs are reused). GPU-hours
// per stage are set for a 1B-parameter run; the remaining budget is 1,000 hours. The gate checks score against the last release, KL from the reference,
// refusal rate and budget. Break it: change the tokenizer late (over budget), find artifacts by file name, push DPO too hard with no KL gate.
const STG = [
  ['Vocab', 0.1, []], ['Tokenizer', 1, [0]], ['Data', 20, [1]], ['Pre-train', 2400, [2]], ['Scale-up', 600, [3]], ['SFT', 80, [4]],
  ['RLHF', 300, [5]], ['DPO', 60, [5]], ['CAI · GRPO', 200, [6, 7]], ['Eval', 10, [8]], ['Quantise', 4, [8]], ['Serve', 1, [10]],
];
const POS = [[-2.5, -0.6], [-1.6, -0.6], [-0.7, -0.6], [0.2, -0.6], [1.1, -0.6], [2.0, -0.6], [2.5, 0.2], [1.5, 0.2], [2.0, 0.95], [0.85, 0.95], [0.85, 0.3], [-0.1, 0.3]];
const GATE = [-0.75, 0.95], BUDGET = 1000, EDITS = [['Nothing', -1], ['Tokenizer', 1], ['Data', 2], ['DPO', 7], ['Eval set', 9], ['Quantisation', 10]];
const hx = (i, v) => (((i + 1) * 2654435761 + v * 40503) >>> 0).toString(16).slice(-4);
function run(st) {
  const changed = new Set(); const e = EDITS[st.edit][1]; if (e >= 0) changed.add(e); if (st.beta) changed.add(7);
  const dirty = new Set(changed);
  if (st.hash) for (let i = 0; i < 12; i++) if (STG[i][2].some(d => dirty.has(d))) dirty.add(i);
  const hours = [...dirty].reduce((a, i) => a + STG[i][1], 0), refuse = hours > BUDGET;
  const should = new Set(changed); for (let i = 0; i < 12; i++) if (STG[i][2].some(d => should.has(d))) should.add(i);
  const missed = [...should].filter(i => !dirty.has(i)), stale = !st.hash && missed.length > 0;
  const dpoRan = dirty.has(7) && !refuse, kl = st.beta && (st.hash ? dpoRan : false) ? 41 : 12;
  const score = (kl > 25 ? 62.3 : dirty.size && !refuse ? 62.6 : 62.0).toFixed(1), base = '62.0';
  const fails = [];
  if (refuse) fails.push('budget');
  if (!refuse && +score < +base) fails.push('score');
  if (!refuse && st.klg && kl > 25) fails.push('KL');
  const ship = !refuse && !fails.length;
  return { changed, dirty, missed, hours, refuse, stale, kl, score, base, fails, ship };
}

export default {
  slug: 'building-complete-llm-pipeline',
  title: 'The whole pipeline: from text to a served model',
  description: 'A team building a small assistant for Yoruba, Swahili and Amharic chains every stage of this track into one pipeline, each stage\'s hash feeding the next.',
  overview: 'Every lesson in this track is one stage of a single pipeline, and each stage\'s output is the next one\'s input: a tokenizer, a cleaned dataset, a base model, a tuned model, an aligned policy, an evaluation report, quantised weights and a running server. The stages form a graph: RLHF and DPO can run side by side, but a change to the tokenizer invalidates everything after it, while a change to the evaluation set only invalidates the release decision. A manifest records everything needed to replay the run: pipeline version, seed, code commit, each stage\'s recipe, and the hash of every input and output. Artifacts are found by those content hashes, never by names like latest.pt, so a changed input can never be quietly paired with an old output, and an unchanged stage can be skipped safely. A small orchestrator reads the manifest, runs only what changed, checks every hash, records time and cost, and stops at the first broken contract. The release gate is written before the run: no regression against the last release, a limit on how far alignment moved the model from its reference (the KL budget), a ceiling on refusals, and a budget. A model ships only when every gate passes. Runs are reproducible, giving the same scores from the same manifest, but rarely bit-for-bit identical, because GPU arithmetic is not perfectly deterministic.',
  keywords: ['llm pipeline', 'manifest', 'content hash', 'artifact', 'orchestrator', 'eval gate', 'kl budget', 'reproducibility', 'mlops'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.05, 1.12], half: 1.55, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { edit: 3, hash: true, beta: false, klg: true };
    const ink = '#151827';
    /* stages: a block each, name on the top and the front, hash below */
    const blocks = STG.map(([n], i) => {
      const [x, z] = POS[i], mm = new THREE.MeshLambertMaterial({ color: '#8A8A96' });
      const b = P.box(0.66, 0.24, 0.4, '#fff', { r: 0.05, material: mm }); b.position.set(x, 0.12, z); floor.add(b);
      return { b, mm, x, z };
    });
    /* the gate */
    const gm = new THREE.MeshLambertMaterial({ color: '#1F9E89' }), gate = P.box(0.66, 0.36, 0.4, '#fff', { r: 0.05, material: gm }); gate.position.set(GATE[0], 0.12, GATE[1]); floor.add(gate);


    /* arrows along every dependency */
    const edge = (a, b) => { const A = V(a[0], 0.24, a[1]), B = V(b[0], 0.24, b[1]), d = B.clone().sub(A), L = d.length(), u = d.clone().divideScalar(L);
      const s = A.clone().add(u.clone().multiplyScalar(Math.abs(u.x) > 0.5 ? 0.34 : 0.21)), t = B.clone().sub(u.clone().multiplyScalar(Math.abs(u.x) > 0.5 ? 0.36 : 0.23));
      const ar = P.arrow(s, t, 0.014, '#5E5E6E'); floor.add(ar); };
    STG.forEach(([, , deps], i) => deps.forEach(d => edge(POS[d], POS[i])));
    edge(POS[9], GATE); edge(POS[11], GATE);
    /* the manifest */




    const keep = P.box(6.2, 0.5, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.1); floor.add(keep);

    let R = null;
    const COL = { reuse: '#7A8194', rerun: '#E07B39', touched: '#3A6FB0', wait: '#C62828' };
    function draw() {
      R = run(st);
      blocks.forEach((B, i) => { const touched = R.changed.has(i), d = R.dirty.has(i);
        B.mm.color.set(R.refuse && d ? COL.wait : touched ? COL.touched : d ? COL.rerun : COL.reuse);
         });
      gm.color.set(R.refuse ? '#8A8A96' : R.ship ? (R.stale || (!st.klg && R.kl > 25) ? '#C9A227' : '#1F9E89') : '#C62828');



    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Change', options: EDITS.map(e => e[0]), get: () => st.edit, act: i => { st.edit = i; draw(); } },
      { type: 'buttons', label: 'Find artifacts by', options: ['Content hash', 'File name'], get: () => (st.hash ? 0 : 1), act: i => { st.hash = !i; draw(); } },
      { type: 'buttons', label: 'DPO β', options: ['0.1', '0.01'], get: () => +st.beta, act: i => { st.beta = !!i; draw(); } },
      { type: 'toggle', label: 'KL gate', get: () => st.klg, set: v => { st.klg = !!v; draw(); } },
    ];
    const readouts = [
      { label: 'Stages to rerun', get: () => ({ v: `${R.dirty.size} of 12`, sub: `${Math.round(R.hours).toLocaleString('en')} GPU-hours of ${BUDGET.toLocaleString('en')} left`, bad: R.refuse }) },
      { label: 'Release', get: () => ({ v: R.refuse ? 'Not started' : R.ship ? 'Ships' : 'Held', sub: R.refuse ? 'estimate over budget' : R.ship ? 'every gate passed' : `failed: ${R.fails.join(', ')}`, good: R.ship && !R.stale && R.kl <= 25, bad: R.stale || (R.ship && R.kl > 25) || R.refuse }) },
      { label: 'KL from reference', get: () => ({ v: String(R.kl), sub: 'limit 25', bad: R.kl > 25 }) },
    ];
    const labels = [
      { name: 'manifest', t: 'Manifest', d: 'Everything needed to replay the run', icon: 'book', atV: V(gate.position.x - 0.36, 0.2, gate.position.z) },
      { name: 'chain', t: 'Hash in, hash out', d: 'Each stage\'s output feeds the next', icon: 'link', atV: V(2.34, 0.25, -0.6) },
    ];
    const reset = () => { Object.assign(st, { edit: 3, hash: true, beta: false, klg: true }); draw(); };
    const breaks = [
      { label: 'Change the tokenizer late', hint: 'everything after it reruns', on: () => { reset(); st.edit = 1; draw(); }, off: reset },
      { label: 'Find artifacts by file name', hint: 'latest.pt, with new data', on: () => { reset(); st.edit = 2; st.hash = false; draw(); }, off: reset },
      { label: 'Tune too hard, no KL gate', hint: 'DPO β = 0.01', on: () => { reset(); st.beta = true; st.klg = false; draw(); }, off: reset },
    ];
    const h = v => Math.round(v).toLocaleString('en');
    function status() {
      if (R.refuse) return { ok: false, msg: `<b>The run refuses to start: ${h(R.hours)} GPU-hours needed, ${h(BUDGET)} left.</b> ${st.edit === 1 ? 'A new tokenizer changes every token id, so the data, pre-training' : 'New data means pre-training'} and every stage after it must run again. The estimate is checked before anything starts, not when the money runs out. Settle the early stages first: they are the expensive ones to change.` };
      if (R.stale) return { ok: false, msg: `<b>The ${EDITS[st.edit][0].toLowerCase()} changed, but only that stage reran.</b> Stages find their inputs as latest.pt, and those files still exist, so ${R.missed.length} later stage${R.missed.length > 1 ? 's' : ''} (${R.missed.map(i => STG[i][0]).join(', ')}) reuse${R.missed.length > 1 ? '' : 's'} outputs made before the change. What ships never saw it. With content hashes, a new input means a new hash, and everything after it reruns.` };
      if (!st.klg && R.kl > 25 && R.ship) return { ok: false, msg: `<b>Released with KL ${R.kl} from the reference.</b> With β = 0.01, DPO let the policy drift far from the SFT model, and nothing checked how far. Benchmark scores held (${R.score} against ${R.base}), so the score gate passed, but drift this large usually means longer, flattering answers that game the preference data. A KL budget in the gate holds such a model back.` };
      if (R.kl > 25) return { ok: true, msg: `<b>Held at the gate: KL ${R.kl}, over the limit of 25.</b> DPO with β = 0.01 pulled the policy far from its reference. The score still passed (${R.score} against ${R.base}), so only the KL budget caught it. The gate did its job; set β back to 0.1 and rerun from DPO, ${h(R.hours)} GPU-hours.` };
      if (!R.dirty.size) return { msg: '<b>Nothing changed, so nothing reruns.</b> Every stage finds its output by hash and reuses it. Pick a stage to change.' };
      return { ok: true, msg: `<b>${EDITS[st.edit][0]} changed: ${R.dirty.size} of 12 stages rerun, ${h(R.hours)} GPU-hours.</b> Every stage before it is found by its hash and reused; everything after it gets new inputs, so it runs again. Score ${R.score} against ${R.base} at the last release, KL ${R.kl}: every gate passes.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Twelve stages', home: true, say: 'A team building a small assistant that speaks Yoruba, Swahili and Amharic chains twelve stages, from raw text to a running server. Each stage\'s output is the next one\'s input.', act: m => m.set({ edit: 0, hash: true, beta: false, klg: true }) },
    { t: 'The manifest', focus: [-2.2, 0.2, 0.5], zoom: 1.7, say: 'A manifest records everything needed to replay the run: the seed, the code version, every stage\'s recipe, and the gates the model must pass.', act: m => m.set({}) },
    { t: 'Change late, pay little', home: true, say: 'Change the evaluation set, and only the evaluation runs again. Every stage before it is found by its hash and reused.', act: m => m.set({ edit: 4 }) },
    { t: 'Change early, pay a lot', home: true, say: 'Change the tokenizer, and every stage after it must run again. That is more than the budget, so the run refuses to start.', act: m => m.set({ edit: 1 }) },
    { t: 'Names, not hashes', home: true, say: 'If stages find their inputs by file name, a new dataset slips past. Old outputs are reused, and the release passes without the change.', act: m => m.set({ edit: 2, hash: false }) },
    { t: 'The gate', home: true, say: 'Push the preference tuning too hard, and the model drifts far from where it started. The gate measures that drift and holds the model back.', act: m => m.set({ edit: 0, hash: true, beta: true }) },
  ],
  check: [
    { q: 'Why find artifacts by content hash rather than by a name like latest.pt?', options: ['A changed input changes the hash, so stale outputs are never reused', 'Hashes are shorter to type', 'File names are not allowed on GPUs'], answer: 0, why: 'A name can point at an old file; a hash names exactly what is inside.', hint: 'Try File name with a data change.' },
    { q: 'You change only the evaluation set. What must run again?', options: ['The evaluation and the release gate', 'Every stage from the tokenizer on', 'Pre-training and everything after it'], answer: 0, why: 'Nothing upstream depends on the evaluation set.', hint: 'Follow the arrows out of Eval.' },
    { q: 'What does a KL budget in the release gate catch?', options: ['A policy that alignment pushed too far from its reference', 'A tokenizer with too few merges', 'A server that answers too slowly'], answer: 0, why: 'Large drift usually means the model has learned to game its reward.', hint: 'Set DPO β to 0.01.' },
  ],
  terms: [
    ['Manifest', 'One file that records a run fully enough to replay it: versions, seed, recipes, hashes and gates.'],
    ['Artifact', 'A typed output of a stage: a tokenizer, a dataset, a checkpoint, an eval report.'],
    ['Content hash', 'A short fingerprint computed from a file\'s contents; any change gives a different hash.'],
    ['Orchestrator', 'The small program that reads the manifest, runs what changed and stops at the first broken contract.'],
    ['Release gate', 'Numeric checks, written before the run, that a model must pass to ship.'],
    ['Reproducible', 'The same manifest gives the same scores, even if the weights differ slightly bit for bit.'],
  ],
  deeper: '<p><b>Typed artifacts.</b> Each stage takes and returns a named type, so feeding a DPO policy into the SFT stage is an error the orchestrator catches at once, not on day five.</p><p><b>Two stores.</b> An experiment tracker keeps curves and metrics for people to compare runs weeks later. An artifact store keeps checkpoints and datasets, addressed by hash, for the next stage to fetch.</p><p><b>Cost before you start.</b> Pre-training needs about six operations per parameter per token, so the GPU-hours, and the bill, can be estimated from the manifest before the run. After each stage, the remaining budget is checked again.</p><p><b>Not bit for bit.</b> The order in which GPUs add numbers changes from run to run, so weights differ in the last decimal places. Compare hashes of inputs and the headline scores, not raw weights.</p><p><b>About this machine.</b> The graph follows this track\'s lessons; GPU-hours are set for a small run, and scores and KL are illustrative.</p>',
  code: {
    title: 'An orchestrator in a few lines',
    note: 'Adapted from the course\'s complete pipeline lesson.',
    text: `
import hashlib, json

def digest(obj):
    return hashlib.sha256(json.dumps(obj, sort_keys=True).encode()).hexdigest()[:12]

def run(manifest, stages, store):
    for name in manifest["order"]:
        stage = stages[name]
        inputs = [store.out_hash[d] for d in stage.deps]
        key = digest({"recipe": manifest["stages"][name], "inputs": inputs})
        if key in store:                        # same recipe, same inputs: reuse
            store.out_hash[name] = store[key]
            continue
        out = stage.fn(*[store.load(h) for h in inputs])
        store.out_hash[name] = store.save(key, out)

def gate(report, g):
    return (report["score"] >= g["baseline"] and report["kl"] <= g["kl_max"]
            and report["refusals"] <= g["refusal_max"])
`,
  },
};
