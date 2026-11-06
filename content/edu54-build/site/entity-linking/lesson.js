// Entity linking: four mentions from East and West African news are linked to a small knowledge base. Candidate generation looks the mention up in an alias index;
// disambiguation mixes each candidate's prior (how often the name means it) with context overlap between the sentence and the entity's description.
// Everything is computed live. Break it: prior only (popularity bias: "Victoria" becomes the queen), no NIL (a new juice maker is linked to Kilimanjaro's peak),
// an alias index without local names ("Nalubaale", the Luganda name for Lake Victoria, gets no candidates).
const KB = {
  queen: { n: 'Queen Victoria', d: 'British queen who reigned from 1837 to 1901' },
  lake: { n: 'Lake Victoria', d: 'largest lake in Africa, shared by Uganda Kenya and Tanzania, with fishermen boats and islands such as Kalangala, and Entebbe on its shore' },
  falls: { n: 'Victoria Falls', d: 'waterfall on the Zambezi river between Zambia and Zimbabwe' },
  seych: { n: 'Victoria, Seychelles', d: 'capital city of Seychelles on Mahe island' },
  ncountry: { n: 'Niger (country)', d: 'country in West Africa with its capital at Niamey' },
  nriver: { n: 'Niger River', d: 'river through Guinea Mali Niger and Nigeria that floods its banks near Mopti' },
  nstate: { n: 'Niger State', d: 'state in Nigeria with its capital at Minna' },
  kibo: { n: 'Kibo', d: 'highest volcanic cone of Mount Kilimanjaro in Tanzania' },
};
const ALIAS = { victoria: [['queen', 0.45], ['lake', 0.35], ['falls', 0.12], ['seych', 0.08]], niger: [['ncountry', 0.6], ['nriver', 0.3], ['nstate', 0.1]], kibo: [['kibo', 1]] };
const LOCAL = { nalubaale: [['lake', 1]] };   // local names, added from Luganda sources
const MENTIONS = [
  { m: 'Victoria', s: 'Fishermen on Victoria say catches fell after the long rains.', gold: 'lake' },
  { m: 'Niger', s: 'The Niger rose above its banks near Mopti.', gold: 'nriver' },
  { m: 'Nalubaale', s: 'Boats crossed Nalubaale from Entebbe to Kalangala.', gold: 'lake' },
  { m: 'Kibo Fresh', s: 'Kibo Fresh, a new juice maker in Moshi, opened a shop.', gold: null },
];
const STOP = new Set('the a an on of in to and its at with from such as after say by is that'.split(' '));
const bag = s => [...new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).map(w => w.replace(/(es|s)$/, '').replace(/men$/, 'man')))];
function link(i, st) {
  const M = MENTIONS[i], key = M.m.toLowerCase().split(' ')[0];
  const cands = (ALIAS[key] || (st.local ? LOCAL[key] : null) || []).map(([id, prior]) => {
    const ctx = bag(M.s).filter(w => !bag(M.m).includes(w)), desc = bag(KB[id].d), ov = ctx.filter(w => desc.includes(w)).length;
    const sim = ov / Math.sqrt(ctx.length * desc.length);
    return { id, prior, sim, ov, score: st.prior ? prior : 0.3 * prior + 0.7 * sim * 3 };
  }).sort((a, b) => b.score - a.score);
  let pick = cands[0] ? cands[0].id : null;
  if (pick && st.nil && !st.prior && cands[0].ov === 0) pick = null;   // nothing in the context supports any candidate: say NIL
  return { M, cands, pick, recall: M.gold ? cands.some(c => c.id === M.gold) : null };
}

export default {
  slug: 'entity-linking',
  title: 'Entity linking: which Victoria?',
  description: 'Four mentions from African news are linked to a knowledge base: which Victoria, which Niger? Popularity alone picks wrong; the sentence around the name decides.',
  overview: 'Entity linking connects a mention in text to one entry in a knowledge base, so that "Victoria" in a fishing story points to Lake Victoria and not to a queen or a waterfall. First, candidate generation looks the mention up in an alias index of names and nicknames. Then disambiguation scores each candidate, classically by its prior (how often that name links to it) times the fit between the sentence and the entity\'s description; modern systems compare embeddings or generate the entity name. Two numbers matter: candidate recall, because a missing candidate can never be chosen, and linking accuracy. Some mentions are not in the base at all, and the system must say so (NIL) rather than guess. Popular entities pull ambiguous names towards themselves.',
  keywords: ['entity linking', 'named entity disambiguation', 'knowledge base', 'alias index', 'nil prediction', 'popularity bias'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { i: 0, prior: false, nil: true, local: true };
    /* four mentions as pads, a lamp on each */
    const rows = MENTIONS.map((M, k) => { const hm = new THREE.MeshLambertMaterial({ color: '#E4DED2' }), b = P.box(0.4, 0.04, 0.4, '#fff', { r: 0.03, material: hm }); b.position.set(-2.1 + k * 0.46, 0, 0.35); S.add(b); const l = P.lamp('#9A9AA6', { h: 0.1, r: 0.085 }); l.position.set(-2.1 + k * 0.46, 0.04, 0.35); S.add(l); return { hm, l }; });
    /* candidates, plus NIL: a card with three towers for prior, context and score */
    const CX = k => -1.95 + k * 0.96;
    const cands = [0, 1, 2, 3, 4].map(k => {
      const mm = new THREE.MeshLambertMaterial({ color: '#E3DCCB' }), card = P.box(0.82, 0.08, 0.5, '#fff', { r: 0.03, material: mm }); card.position.set(CX(k), 0, -0.6); S.add(card);
      const bars = [C.orange, C.teal, '#3B3F8F'].map((col, j) => { const t = P.tower(0.18, 0.2, col, { h: 0.2 }); t.userData.set({ cap: '' }); t.position.set(CX(k) - 0.24 + j * 0.24, 0.08, -0.6); S.add(t); return t; });
      return { card, mm, bars };
    });
    S.add(P.keep(-2.45, 2.2, 0.95, -0.95, 0.65));
    const parts = cands.flatMap(c => c.bars);

    let R = null, ALL = [];
    function draw() {
      R = link(st.i, st); ALL = MENTIONS.map((_, i) => link(i, st));
      rows.forEach((r, k) => { const A = ALL[k]; r.hm.color.set(k === st.i ? '#F2C94C' : '#E4DED2'); r.l.userData.set({ color: A.pick === MENTIONS[k].gold ? '#2E9E6A' : '#D64545', on: true }); });
      const list = [...R.cands.slice(0, 4), { id: 'NIL' }];
      cands.forEach((c, k) => { const it = list[k], on = !!it; c.card.visible = on; c.bars.forEach(b => { b.visible = on && it.id !== 'NIL'; });
        if (!on) return; const chosen = (it.id === 'NIL' && R.pick === null) || it.id === R.pick;
        c.mm.color.set(chosen ? '#F2C94C' : '#E3DCCB');
        if (it.id !== 'NIL') [it.prior, Math.min(1, it.sim * 3), Math.min(1, it.score)].forEach((h, j) => c.bars[j].userData.set({ h: Math.max(0.02, h * 0.8) })); });
    }
    draw();
    const correct = () => ALL.filter((A, k) => A.pick === MENTIONS[k].gold).length, rec = () => ALL.filter(A => A.recall).length;
    const controls = [
      { type: 'buttons', label: 'Mention', options: MENTIONS.map(m => m.m), get: () => st.i, act: i => { st.i = i; draw(); } },
      { type: 'buttons', label: 'Score by', options: ['Prior × context', 'Prior only'], get: () => (st.prior ? 1 : 0), act: i => { st.prior = !!i; draw(); } },
      { type: 'toggle', label: 'Say NIL when nothing fits', short: 'NIL', get: () => st.nil, set: v => { st.nil = v; draw(); } },
      { type: 'toggle', label: 'Local names in the index', short: 'local names', get: () => st.local, set: v => { st.local = v; draw(); } },
    ];
    const readouts = [
      { label: 'Linked right', get: () => ({ v: `${correct()} of 4`, good: correct() === 4, bad: correct() < 3 }) },
      { label: 'Candidate recall', get: () => ({ v: `${rec()} of 3`, sub: 'right entry in the list', bad: rec() < 3 }) },
      { label: 'This mention', get: () => ({ v: R.pick ? KB[R.pick].n : 'NIL', good: R.pick === R.M.gold, bad: R.pick !== R.M.gold }) },
    ];
    const labels = [
      { name: 'news', t: 'Mentions', d: 'Lamp: linked to the right entry', icon: 'eye', atV: V(-2.32, 0.1, 0.35) },
      { name: 'cands', t: 'Candidates', d: 'Bars: prior, context, score. Gold: chosen', icon: 'target', atV: V(1.93, 0.08, -0.6) },
    ];
    const reset = () => { Object.assign(st, { i: 0, prior: false, nil: true, local: true }); draw(); };
    const breaks = [
      { label: 'Popularity only', hint: 'Ignore the sentence', on: () => { reset(); st.prior = true; draw(); }, off: reset },
      { label: 'Never say NIL', hint: 'A brand-new company', on: () => { reset(); st.nil = false; st.i = 3; draw(); }, off: reset },
      { label: 'No local names', hint: 'Luganda name for the lake', on: () => { reset(); st.local = false; st.i = 2; draw(); }, off: reset },
    ];
    function status() {
      if (st.prior) return { ok: false, msg: `<b>The popular answer, not the right one.</b> Scored by prior alone, "Victoria" goes to ${KB[ALL[0].pick].n} (0.45) and "Niger" to ${KB[ALL[1].pick].n} (0.60), whatever the sentence says about fishermen or river banks. ${correct()} of 4 linked right. Context must outvote popularity.` };
      if (!st.local && st.i === 2) return { ok: false, msg: `<b>No candidates, so no chance.</b> "Nalubaale" is the Luganda name for Lake Victoria, but an alias index built from English sources does not list it, so candidate generation returns nothing. Candidate recall falls to ${rec()} of 3, and no disambiguator can recover. Add local and historical names to the index.` };
      if (!st.nil && st.i === 3) return { ok: false, msg: `<b>A juice maker linked to a mountain peak.</b> "Kibo Fresh" is a new company and not in the base, but the alias "Kibo" finds Kilimanjaro's highest cone, and with no NIL option it is chosen though not one word of the sentence fits. Knowledge bases go stale: predict NIL when the context gives no support.` };
      return { ok: true, msg: `<b>"${R.M.m}" → ${R.pick ? KB[R.pick].n : 'NIL, not in the base'}.</b> ${R.pick ? `The sentence shares ${R.cands[0].ov} word${R.cands[0].ov === 1 ? '' : 's'} with its description, ${(() => { const top = R.cands.slice().sort((a, b) => b.prior - a.prior)[0]; return R.cands.length < 2 ? 'and it is the only candidate.' : top.id !== R.pick ? `enough to outvote the more popular ${KB[top.id].n}.` : 'and it is also the most popular.'; })()}` : 'No candidate\'s description fits the sentence, so it says NIL instead of guessing.'} ${correct()} of 4 linked right.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Which Victoria?', home: true, say: 'Fishermen on Victoria say catches fell. A queen, a lake, a waterfall and a city are all called Victoria. Which one?', act: m => m.set({ i: 0, prior: false, nil: true, local: true }) },
    { t: 'Candidates', home: true, say: 'First, look the name up in an alias index. Four candidates come back, each with a prior: how often the name means it.', act: m => m.set({ i: 0 }) },
    { t: 'Context decides', home: true, say: 'Then check the sentence against each description. Fishermen fits the lake. Context outvotes the queen\'s popularity.', act: m => m.set({ i: 1 }) },
    { t: 'Popularity bias', home: true, say: 'Score by popularity alone, and Victoria becomes the queen, and the Niger River becomes the country.', act: m => m.set({ i: 0, prior: true }) },
    { t: 'Local names', home: true, say: 'Nalubaale is the Luganda name for Lake Victoria. Leave local names out of the index, and it gets no candidates at all.', act: m => m.set({ prior: false, i: 2, local: false }) },
    { t: 'Not in the base', home: true, say: 'Kibo Fresh is a new juice maker. With no "not in the base" answer, it is linked to Kilimanjaro\'s peak.', act: m => m.set({ local: true, i: 3, nil: false }) },
  ],
  check: [
    { q: 'What is candidate generation in entity linking?', options: ['Looking up possible entries for a mention in an alias index', 'Choosing the final entry', 'Finding names in text'], answer: 0, why: 'Disambiguation then picks among them.' },
    { q: 'Why can a high disambiguation accuracy still mean a poor system?', options: ['If the right entry is missing from the candidates, it can never be chosen', 'Accuracy is always wrong', 'Candidates are too many'], answer: 0, why: 'Report candidate recall too.' },
    { q: 'What should a linker do with a mention that is not in the knowledge base?', options: ['Predict NIL', 'Pick the most popular candidate', 'Skip the sentence'], answer: 0, why: 'Guessing links it to the wrong thing.' },
  ],
  terms: [
    ['Entity linking', 'Connecting a mention to one entry in a knowledge base.'],
    ['Alias index', 'A list of names and nicknames for each entry.'],
    ['Prior', 'How often a name links to a given entry.'],
    ['Disambiguation', 'Choosing the right candidate using context.'],
    ['NIL', 'The answer for a mention with no entry in the base.'],
    ['Candidate recall', 'How often the right entry is among the candidates.'],
  ],
  deeper: '<p><b>Embeddings and generation.</b> Modern linkers encode the mention with its sentence and every candidate\'s description, and pick the closest; generative linkers write the entity\'s name, constrained to names that exist.</p><p><b>Whose names?</b> Many African places, people and organisations have local names, older colonial names and spellings in several languages. A knowledge base built from one language\'s sources links them badly.</p><p><b>About this machine.</b> The knowledge base is tiny and the priors are set by hand; candidate lookup, context overlap, scores and NIL decisions are computed live.</p>',
  code: {
    title: 'Prior times context',
    note: 'Adapted from the course\'s entity linking lesson.',
    text: `
def link(mention, sentence, alias_index, kb, nil_if_no_support=True):
    candidates = alias_index.get(mention.lower(), [])
    if not candidates:
        return None                                 # nothing to choose from
    ctx = set(sentence.lower().split())
    def score(entity, prior):
        desc = set(kb[entity].lower().split())
        overlap = len(ctx & desc) / (len(ctx) * len(desc)) ** 0.5
        return 0.3 * prior + 0.7 * overlap, overlap
    best, (s, overlap) = max(((e, score(e, p)) for e, p in candidates), key=lambda x: x[1][0])
    if nil_if_no_support and overlap == 0:
        return None                                 # NIL: not in the base
    return best
`,
  },
};
