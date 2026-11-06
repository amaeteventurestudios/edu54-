// Exam prep, RAG as a data system: an invented pension fund in Gaborone runs a member assistant. After a policy refresh it gives the old
// early-withdrawal limit. Two queries (a paraphrase and an exact code, PW-17) meet three retrievers (sparse, dense, hybrid). An appended
// refresh leaves the retired version in the index, where its closer wording ranks it first; a missing scheme filter lets another scheme's rule
// into context; fixed-size chunks split the limit from its over-55 exception. A "use the latest policy" prompt line changes nothing, because
// the model cannot follow evidence it never received. Ranks and figures are illustrative.
const Q = [
  { k: 'para', n: '"How much of my savings can I take out early?"', s: 'paraphrase', find: { sparse: false, dense: true, hybrid: true },
    T: 'withdrawal limit, 2026 (active)', stale: 'withdrawal limit, 2024 (retired)', other: 'withdrawal limit, Scheme B', E: 'early-retirement savings guide', X: '…unless the member is over 55' },
  { k: 'code', n: '"What does code PW-17 mean?"', s: 'exact code', find: { sparse: true, dense: false, hybrid: true },
    T: 'PW-17: hardship withdrawal, 2026 (active)', stale: 'PW-17, 2024 text (retired)', other: 'PW-17, Scheme B', E: 'hardship support overview', X: '…needs an employer or medical letter' },
];
const METH = ['sparse', 'dense', 'hybrid'];

function run(o) {
  const q = Q[o.q], found = q.find[o.m];
  const list = [];
  if (found) {
    if (!o.atomic) list.push({ n: q.stale, k: 'stale' });
    list.push({ n: o.chunk ? `${q.T}${q.k === 'para' ? ', with the over-55 exception' : ', with its letter rule'}` : q.T, k: 'target' });
    if (!o.filter) list.push({ n: q.other, k: 'forbidden' });
    list.push({ n: q.E, k: 'related' });
  } else {
    list.push({ n: q.E, k: 'related' }, { n: o.m === 'sparse' ? 'savings FAQ (shares the word "savings")' : 'withdrawal forms index', k: 'related' });
  }
  const top = list.slice(0, 3);
  const bad = top.filter(c => c.k === 'stale' || c.k === 'forbidden').length;
  const recall = top.some(c => c.k === 'target');
  const missX = found && !o.chunk;
  const issues = [], short = [];
  if (!found) { issues.push(o.m === 'sparse' ? 'keyword search found no chunk with the member\'s words, so the active rule never reached the model' : 'dense search matched the meaning but missed the exact code PW-17'); short.push('target not retrieved'); }
  if (found && !o.atomic) { issues.push('the refresh appended instead of swapping, and the retired version ranks first because its wording is closer'); short.push('retired version first'); }
  if (found && !o.filter) { issues.push('with no scheme filter, another scheme\'s rule entered the context'); short.push('another scheme leaked'); }
  if (missX) { issues.push(q.k === 'para' ? 'fixed-size chunks split the limit from its over-55 exception, which fell out of the top results' : 'fixed-size chunks split PW-17 from its letter requirement, which fell out of the top results'); short.push(q.k === 'para' ? 'exception split off' : 'condition split off'); }
  return { q, top, bad, recall, issues, short, ok: issues.length === 0 };
}

export default {
  slug: 'exam-rag-retrieval-and-data-pipelines',
  title: 'Exam prep: RAG retrieval and data pipelines',
  description: 'After a policy refresh, a member assistant gives the old limit. Follow the bad chunk through the index, filter and top three, and fix it there.',
  overview: 'Retrieval-augmented generation is a data system before it is a prompt. When answers go wrong right after a document refresh while the model, prompt and latency are unchanged, look at ingestion, indexing, filtering and retrieval first. Adding "use the latest policy" to the prompt cannot help: the model cannot follow evidence it never received. Common causes: the refresh appended new chunks beside the old ones instead of building a new version and switching an alias atomically; metadata filters for tenant, scheme, jurisdiction, date or permission were missing, so forbidden or retired chunks reached the context; ranking favoured the chunk whose wording matched the query, not the authoritative one; or chunking split a condition from its exception. Chunk around the unit a person would cite: headings and paragraphs for policy, a method with its parameters and errors, table headers with each row group. Give every chunk stable IDs, source, version, effective date, access attributes and parser version. Match retrieval to the query: sparse (keyword) search is strong for identifiers and codes; dense (embedding) search handles paraphrase but can miss exact strings; hybrid combines and reranks; filtering on trusted metadata and permissions happens before anything reaches the model, never by asking the model to ignore it. Evaluate retrieval separately from answers, with recall and precision at K, rank metrics, freshness coverage and authorisation leakage, because a single end-to-end score cannot tell you which layer to fix. Carry provenance as data through to the output and report conflicts. This machine follows an invented pension fund in Gaborone; ranks are illustrative.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'rag', 'retrieval', 'hybrid search', 'metadata filter', 'index refresh', 'chunking', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.05], dir: [0.05, 0.95, 1.15], half: 1.1, wide: 5.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { q: 0, m: 'hybrid', atomic: true, filter: true, chunk: true, patch: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', PLUM = '#7B6FA8';
    const COL = { target: GOOD, related: OFF, stale: BAD, forbidden: PLUM };
    /* the index shelf: active chunks in teal, the retired version beside them if the refresh only appended */
    const index = P.shelf(6, { cell: 0.2, levels: 2, lh: 0.2, d: 0.3 }); index.position.set(-1.95, 0, -0.45); S.add(index);
    /* a scheme filter stands between the index and the top three */
    const flow = P.pipe([V(-1.25, 0.2, -0.45), V(-0.75, 0.2, -0.45), V(-0.4, 0.2, -0.45)], '#3D6BD6', { r: 0.04, n: 4 }); S.add(flow);
    const scheme = P.gate(0.46, GOOD, { h: 0.42 }); scheme.rotation.y = Math.PI / 2; scheme.position.set(-0.82, 0, -0.45); S.add(scheme);
    /* the top three: a podium, first place tallest, coloured by what got retrieved */
    const podium = [0.46, 0.33, 0.2].map((h, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.36, h, 0.36, '#fff', { r: 0.03, material: m }); b.position.set(-0.3 + i * 0.42, 0, -0.45); S.add(b); return { m, b, h }; });
    /* the exception chunk: kept with its rule when chunked by section, split off onto the floor when not */
    const exc = P.ball(0.08, SAF); exc.userData.noFit = true; S.add(exc);
    /* Claude, and a lamp for the answer it can give from this context */
    const model = P.robot('#3D6BD6', { scale: 0.62 }); model.position.set(1.15, 0, -0.45); S.add(model);
    const ans = P.lamp(GOOD, { h: 0.34, r: 0.12 }); ans.position.set(1.72, 0, -0.45); S.add(ans);
    /* a prompt patch taped to the model: it changes nothing downstream */
    const note = P.box(0.26, 0.04, 0.2, SAF, { r: 0.02 }); note.position.set(1.15, 0, -0.12); S.add(note);
    /* the three retrievers, one lit, and the query as a ball or a cube */
    const pads = METH.map((n, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.46, 0.08, 0.34, '#fff', { r: 0.03, material: m }); b.position.set(-0.75 + i * 0.56, 0, 0.3); S.add(b); return m; });
    const qBall = P.ball(0.13, '#3D6BD6'), qCube = P.box(0.22, 0.22, 0.22, '#3D6BD6', { r: 0.03 });
    qBall.position.set(-1.45, 0.13, 0.3); qCube.position.set(-1.45, 0, 0.3); S.add(qBall, qCube);
    S.add(P.keep(-2.45, 2.0, 0.9, -0.75, 0.55));
    const parts = [flow, model];

    let R = null;
    function draw() {
      R = run(st);
      const stale = st.atomic ? 0 : 6;
      index.userData.set({ fill: Array.from({ length: 12 }, (_, i) => i < 6 ? GOOD : i < 6 + stale ? BAD : false) });
      scheme.visible = !!st.filter; flow.userData.set({ color: R.bad ? BAD : '#3D6BD6' });
      podium.forEach((p, i) => { const c = R.top[i]; p.m.color.set(c ? COL[c.k] : OFF); p.b.visible = !!c; });
      const ti = R.top.findIndex(c => c.k === 'target');
      exc.visible = ti >= 0;
      if (ti >= 0) exc.position.set(-0.3 + ti * 0.42, st.chunk ? podium[ti].h + 0.08 : 0.08, st.chunk ? -0.45 : -0.14);
      ans.userData.set({ color: R.ok ? GOOD : BAD, on: true });
      note.visible = !!st.patch;
      METH.forEach((n, i) => pads[i].color.set(n !== st.m ? OFF : R.recall ? GOOD : BAD));
      qBall.visible = R.q.k === 'para'; qCube.visible = R.q.k !== 'para';
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Query', options: Q.map(q => q.s), get: () => st.q, act: i => set({ q: i }) },
      { type: 'buttons', label: 'Retrieval', options: METH, get: () => METH.indexOf(st.m), act: i => set({ m: METH[i] }) },
      { type: 'toggle', label: 'Build a new index and swap atomically', short: 'Atomic refresh', get: () => st.atomic, set: v => set({ atomic: !!v }) },
      { type: 'toggle', label: 'Filter by scheme and version first', short: 'Metadata filter', get: () => st.filter, set: v => set({ filter: !!v }) },
      { type: 'toggle', label: 'Chunk by section, not fixed size', short: 'Section chunks', get: () => st.chunk, set: v => set({ chunk: !!v }) },
      { type: 'toggle', label: 'Add "use the latest policy" to the prompt', short: 'Prompt patch', get: () => st.patch, set: v => set({ patch: !!v }) },
    ];
    const readouts = [
      { label: 'Recall at 3', get: () => ({ v: R.recall ? 'yes' : 'no', sub: 'active rule retrieved', good: R.recall, bad: !R.recall }) },
      { label: 'Stale or forbidden', get: () => ({ v: String(R.bad), sub: 'chunks in context', good: R.bad === 0, bad: R.bad > 0 }) },
      { label: 'Answer', get: () => ({ v: R.ok ? 'grounded' : 'wrong', sub: R.q.s, good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'p', t: 'Index shelf', d: 'Red row: the retired policy', icon: 'box', atV: V(-2.42, 0.2, -0.45) },
      { name: 't', t: 'Top three', d: 'Tallest ranks first; teal is the rule', icon: 'target', atV: V(1.95, 0.3, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Append the refresh', hint: 'two versions, the old one wins', on: () => set({ ...D0, atomic: false, patch: true }), off: reset },
      { label: 'Drop the scheme filter', hint: 'do not ask the model to ignore it', on: () => set({ ...D0, filter: false }), off: reset },
      { label: 'Dense search for an exact code', hint: 'meaning, not strings', on: () => set({ ...D0, q: 1, m: 'dense' }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: `<b>${st.m === 'hybrid' ? 'Hybrid' : st.m === 'sparse' ? 'Sparse' : 'Dense'} retrieval puts the active rule first, the scheme filter keeps other members' rules out and the index holds only the 2026 version, so the answer is grounded and cited.</b>${st.patch ? ' The prompt line did no work; the fix was in retrieval.' : ''}` };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>${st.patch ? ' The "use the latest policy" line changed nothing: the model cannot follow evidence it never received.' : ' This is a retrieval incident, not a model incident.'}` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Wrong after a refresh', home: true, say: 'After a policy refresh, the assistant gives the old limit. The model and prompt did not change.', act: m => m.set({ q: 0, m: 'dense', atomic: false, filter: false, chunk: false, patch: false }) },
    { t: 'A prompt patch', home: true, say: 'Telling it to use the latest policy does nothing. It cannot follow evidence it never received.', act: m => m.set({ q: 0, m: 'dense', atomic: false, filter: false, chunk: false, patch: true }) },
    { t: 'Swap the index', home: true, say: 'Build the new version, check it, then switch the alias, so the retired text is gone.', act: m => m.set({ q: 0, m: 'dense', atomic: true, filter: false, chunk: false, patch: false }) },
    { t: 'Filter first', home: true, say: 'Filter by scheme before generation. Never ask the model to ignore what it should not see.', act: m => m.set({ q: 0, m: 'dense', atomic: true, filter: true, chunk: false, patch: false }) },
    { t: 'Chunk by meaning', home: true, say: 'Keep the limit and its over-55 exception in one chunk, the unit a person would cite.', act: m => m.set({ q: 0, m: 'dense', atomic: true, filter: true, chunk: true, patch: false }) },
    { t: 'Hybrid for codes', home: true, say: 'Dense search misses the exact code. Hybrid retrieval handles both kinds of query.', act: m => m.set({ q: 1, m: 'hybrid', atomic: true, filter: true, chunk: true, patch: false }) },
  ],
  check: [
    { q: 'Answers went wrong right after a document refresh. Where do you look first?', options: ['Ingestion, indexing, filtering and retrieval', 'The model version', 'The prompt wording'], answer: 0, why: 'It is a retrieval incident.', hint: 'Try Append the refresh.' },
    { q: 'How should forbidden chunks be kept out of an answer?', options: ['Filter them before they reach the model', 'Ask the model to ignore them', 'Shorten the context'], answer: 0, why: 'Forbidden data should not enter context.', hint: 'Try Drop the scheme filter.' },
    { q: 'Which retrieval is strongest for an exact code such as PW-17?', options: ['Sparse or hybrid', 'Dense only', 'None'], answer: 0, why: 'Embeddings can miss exact strings.', hint: 'Try Dense search for an exact code.' },
  ],
  practice: [
    { q: 'What is the safe way to refresh an index?', options: ['Build a new version, validate it, then switch an alias atomically', 'Append new chunks to the live index', 'Delete the index and rebuild in place', 'Ask users to wait'], answer: 0, why: 'Keep rollback until checks pass.' },
    { q: 'Answer quality is low. Retrieval recall at 5 is 40%. What should you fix first?', options: ['Retrieval: the answer has a ceiling without the evidence', 'The answer prompt', 'The model size', 'The output format'], answer: 0, why: 'Measure retrieval separately.' },
    { q: 'How should a policy table be chunked?', options: ['Keep the headers with each row group', 'Fixed 200-token windows', 'One chunk per cell', 'Drop the table'], answer: 0, why: 'Chunk around the unit people cite.' },
    { q: 'Two retrieved sources conflict and there is no precedence rule. What should the answer do?', options: ['Report the conflict with both sources', 'Silently pick the newest', 'Pick the longer one', 'Average them'], answer: 0, why: 'Represent conflicting evidence explicitly.' },
    { q: 'Which metric checks that no result violated the caller\'s access?', options: ['Authorisation leakage', 'Recall at K', 'Mean reciprocal rank', 'Answer completeness'], answer: 0, why: 'Retrieval has its own safety metrics.' },
    { q: 'When is iterative, agentic retrieval worth its cost?', options: ['When discovery is genuinely adaptive, with budgets', 'For every stable FAQ', 'Never', 'Only for exact codes'], answer: 0, why: 'Stable pipelines should not pay agentic complexity.' },
  ],
  terms: [
    ['Sparse retrieval', 'Keyword matching; strong for identifiers and codes.'],
    ['Dense retrieval', 'Embedding similarity; strong for paraphrase.'],
    ['Hybrid retrieval', 'Sparse and dense candidates fused or reranked.'],
    ['Metadata filter', 'Trusted constraints applied before evidence reaches the model.'],
    ['Atomic refresh', 'Build a new index version and switch an alias in one step.'],
    ['Recall at K', 'Whether the needed source is in the top K results.'],
  ],
  deeper: '<p><b>Monitor the pipeline.</b> Ingestion lag, parsed counts, active version per source, index version, empty-result and low-score rates, and the worst evaluation queries.</p><p><b>Provenance as data.</b> Keep source, chunk ID, version, span and rank for each claim, from retrieval to logs.</p><p><b>About this machine.</b> The fund and ranks are invented.</p>',
  code: {
    title: 'Filter, then retrieve, then cite',
    note: 'Written for this lesson.',
    text: `
def answer(question, member):
    where = {"scheme": member.scheme, "status": "active"}      # trusted metadata, before ranking
    hits = fuse(bm25(question, where=where, k=20),              # exact codes and terms
                embed_search(question, where=where, k=20))      # paraphrase
    context = [h for h in rerank(question, hits)[:5]]
    if not context:
        return {"answer": None, "reason": "no supported evidence"}
    return claude_answer(question, context,
                         cite=[(h.doc_id, h.chunk_id, h.version) for h in context])

def refresh(source):
    new = build_index(source, version=source.version)
    assert retrieval_eval(new).recall_at_5 >= GATE
    alias.swap("policies", new)                                 # atomic; old kept for rollback
`,
  },
};
