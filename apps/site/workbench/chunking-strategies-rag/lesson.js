// Chunking for RAG: a tenancy agreement for a block of flats in Nairobi is cut into chunks four ways, each chunk a card. A tenant's question is matched
// against every card (shared content words, computed live) and the best card goes to the reader, which can only answer from it.
// Contextual retrieval adds a short line, written by a model at indexing time, that says where each sentence sits; those lines are scripted.
// Break it: fixed size that cuts through the answer, sentences with no context (the sentence about ending the tenancy wins, but the notice period is in the next one),
// one huge chunk (the answer is in there with everything else).
const DOC = [
  { s: 'Section 1: Rent.', sec: 0 },
  { s: 'Rent is paid on the first day of each month.', sec: 0, ctx: 'From the Rent section, about when rent is due:' },
  { s: 'Paying after the fifth day adds a late penalty.', sec: 0, ctx: 'From the Rent section, about paying late:' },
  { s: 'Section 2: Notice.', sec: 1 },
  { s: 'Either party may end the tenancy.', sec: 1, ctx: 'From the Notice section:' },
  { s: 'They must give two months\' written notice to do so.', sec: 1, ctx: 'From the Notice section, about how much notice ending the tenancy needs:' },
  { s: 'Section 3: Repairs.', sec: 2 },
  { s: 'The landlord repairs the roof, pipes and wiring.', sec: 2, ctx: 'From the Repairs section, about who fixes what:' },
  { s: 'The tenant repairs anything the tenant breaks.', sec: 2, ctx: 'From the Repairs section, about damage by the tenant:' },
];
const QS = [
  { q: 'How much notice must I give to end the tenancy?', gold: 'two months\' written notice', need: [4, 5] },
  { q: 'Who repairs a burst pipe?', gold: 'The landlord repairs the roof, pipes', need: [7] },
];
const TEXT = DOC.map(d => d.s).join(' ');
const STOP = new Set('a an the to of and is are i my me must do so on in each by for any may who what how much give'.split(' '));
const words = s => [...new Set(s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).map(w => w.replace(/s$/, '')))];
function chunk(mode, size) {
  if (mode === 0) { const out = []; for (let i = 0; i < TEXT.length; i += size) out.push({ t: TEXT.slice(i, i + size) }); return out; }   // fixed characters, no respect for sentences
  if (mode === 1 || mode === 3) return DOC.map((d, i) => ({ t: d.s, i, sec: d.sec, ctx: d.ctx })).filter(c => !/^Section/.test(c.t));
  return [0, 1, 2].map(k => ({ t: DOC.filter(d => d.sec === k).map(d => d.s).join(' '), sec: k }));
}

export default {
  slug: 'chunking-strategies-rag',
  title: 'Chunking: cut documents for RAG',
  description: 'A tenancy agreement for flats in Nairobi is cut into chunks four ways. Chunk too small and the answer splits; too big and it drowns. Add context, then the parent.',
  overview: 'Retrieval-augmented generation searches chunks, not whole documents, so how documents are cut decides what can be found. Fixed-size chunks are simple but slice through sentences, and an answer cut in half cannot be read. Recursive splitting tries paragraph breaks, then sentences, then words, and is the usual default. Small chunks match questions precisely but lose their neighbours: a sentence that says "they must give two months\' notice to do so" no longer says what "so" is. Large chunks keep context but bury the answer among unrelated text and dilute its embedding. Two fixes help: parent-document retrieval matches small chunks and hands the reader their whole section, and contextual retrieval prefixes every chunk with a line saying where it sits. Match chunk size to the questions people ask, and measure.',
  keywords: ['chunking', 'rag', 'recursive splitting', 'parent document retrieval', 'contextual retrieval', 'chunk size'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, -0.25], dir: [0.05, 1.05, 1.05], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 3, size: 70, ctx: true, q: 0 };
    const SECC = ['#E07B39', '#1F9E89', '#3B3F8F'];
    /* twelve chunk slots in two rows: width is length, height is the match score */
    const slot = i => ({ x: -2.65 + (i % 6) * 1.06, z: i < 6 ? -0.05 : -0.85 });
    const cards = Array.from({ length: 12 }, (_, i) => {
      const p = slot(i), mm = new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), card = P.box(0.98, 1, 0.56, '#fff', { r: 0.02, material: mm }); card.position.set(p.x, 0.06, p.z); S.add(card);
      const bm = new THREE.MeshLambertMaterial({ color: '#C9C1B0' }), band = P.box(0.98, 0.06, 0.62, '#fff', { r: 0.01, material: bm }); band.position.set(p.x, 0, p.z); S.add(band);
      return { card, mm, band, bm, p };
    });
    /* what the reader was handed: a block as long as it is, and a lamp for whether the answer is in it */
    const hand = P.box(1, 0.16, 0.34, '#3B3F8F', { r: 0.01 }); hand.userData.noFit = true; hand.position.set(-3.1, 0, 0.55); S.add(hand);
    const has = P.lamp('#2E9E6A', { h: 0.2, r: 0.1 }); has.position.set(2.85, 0, 0.55); S.add(has);
    S.add(P.keep(-3.25, 3.25, 0.7, -1.2, 0.8));
    let R = null;
    function run() {
      const Q = QS[st.q], qw = words(Q.q), ch = chunk(st.mode, st.size);
      const scored = ch.map((c, k) => { const hay = (st.ctx && c.ctx ? c.ctx + ' ' : '') + c.t; return { ...c, k, score: words(hay).filter(w => qw.includes(w)).length }; });
      const top = scored.slice().sort((a, b) => b.score - a.score || a.k - b.k)[0];
      const given = st.mode === 3 ? DOC.filter(d => d.sec === top.sec).map(d => d.s).join(' ') : top.t;   // parent: match the sentence, hand over its section
      const has = given.includes(Q.gold);
      const rel = Q.need.map(i => DOC[i].s).join(' ').length;
      return { Q, ch: scored, top, given, has, share: Math.min(1, rel / given.length) };
    }
    function draw() {
      R = run();
      cards.forEach((c, i) => { const k = R.ch[i], on = !!k; c.card.visible = on; c.band.visible = on; if (!on) return;
        const isTop = k.k === R.top.k, inParent = st.mode === 3 && k.sec === R.top.sec;
        const n = R.ch.length, w = n <= 6 ? Math.min(3.1, (6.3 - 0.08 * (n - 1)) / n) : 0.98, x = n <= 6 ? -3.15 + w / 2 + i * (w + 0.08) : c.p.x;
        c.card.scale.x = w / 0.98; c.band.scale.x = w / 0.98; c.card.position.x = x; c.band.position.x = x;
        c.card.scale.y = 0.06 + k.score * 0.1; c.mm.color.set(isTop ? '#F2C94C' : inParent ? '#FFF1C9' : '#FBF8F1');
        c.bm.color.set(k.sec != null ? SECC[k.sec] : '#C9C1B0'); });
      const L = Math.min(5.8, R.given.length * 0.012); hand.scale.x = L; hand.position.x = -3.1 + L / 2;
      has.userData.set({ color: R.has ? '#2E9E6A' : '#D64545', on: true });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Chunks', options: ['Fixed size', 'Sentences', 'Sections', 'Sentence → section'], get: () => st.mode, act: i => { st.mode = i; draw(); } },
      { type: 'slider', label: 'Fixed size (characters)', min: 40, max: 480, step: 10, get: () => st.size, set: v => { st.size = v; draw(); } },
      { type: 'toggle', label: 'Add context to each sentence', short: 'context', get: () => st.ctx, set: v => { st.ctx = v; draw(); } },
      { type: 'buttons', label: 'Question', options: ['Notice period', 'Burst pipe'], get: () => st.q, act: i => { st.q = i; draw(); } },
    ];
    const readouts = [
      { label: 'Answer found', get: () => ({ v: R.has ? 'yes' : 'no', good: R.has, bad: !R.has }) },
      { label: 'Chunks', get: () => ({ v: String(R.ch.length), sub: `best scores ${R.top.score}` }) },
      { label: 'Useful text', get: () => ({ v: R.has ? `${Math.round(R.share * 100)}%` : '–', sub: 'of what the reader gets', bad: R.has && R.share < 0.3 }) },
    ];
    const labels = [
      { name: 'cards', t: 'Chunks', d: 'Gold: retrieved. Height: match score', icon: 'box', atV: V(-3.1, 0.1, -0.05) },
      { name: 'q', t: 'What the reader gets', d: 'Long enough, and with the answer?', icon: 'help', atV: V(3.05, 0.2, 0.55) },
    ];
    const reset = () => { Object.assign(st, { mode: 3, size: 70, ctx: true, q: 0 }); draw(); };
    const breaks = [
      { label: 'Fixed size cuts the answer', hint: '60 characters', on: () => { reset(); st.mode = 0; st.size = 60; st.ctx = false; draw(); }, off: reset },
      { label: 'Bare sentences', hint: 'No context', on: () => { reset(); st.mode = 1; st.ctx = false; draw(); }, off: reset },
      { label: 'One huge chunk', hint: 'The whole agreement', on: () => { reset(); st.mode = 0; st.size = 480; st.ctx = false; draw(); }, off: reset },
    ];
    function status() {
      if (!R.has && st.mode === 0) return { ok: false, msg: `<b>The answer was cut in half.</b> Fixed ${st.size}-character chunks ignore sentences, so "two months' written notice" is split across two chunks. The best match holds "${R.top.t.trim()}", and the reader cannot answer from a fragment. Split on sentences and sections first.` };
      if (!R.has) return { ok: false, msg: `<b>The right section, the wrong sentence.</b> "Either party may end the tenancy" shares more words with the question, so it wins; the notice period is in the next sentence, "They must give two months' written notice to do so", which on its own does not say what "so" is. Add context to each chunk, or retrieve by sentence and hand over the whole section.` };
      if (R.share < 0.3) return { ok: false, msg: `<b>The answer is in there, with everything else.</b> One ${R.given.length}-character chunk always wins, so the reader gets the whole agreement: only ${Math.round(R.share * 100)}% of it is about the question. With many documents a chunk this big also blurs its embedding, so it stops matching anything well. Keep chunks near the size of an answer plus its context.` };
      return { ok: true, msg: `<b>Found: ${R.Q.gold}.</b> ${st.mode === 3 ? `The best sentence${st.ctx ? ', with its context line,' : ''} is matched, and the reader is handed its whole section, so the answer arrives with its neighbours.` : st.mode === 1 ? 'With a context line saying where it sits, the right sentence wins.' : st.mode === 2 ? 'Each section is one chunk: small enough to focus, big enough to hold the answer.' : 'This cut happens to keep the answer whole.'} ${Math.round(R.share * 100)}% of the text given is useful.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A tenancy agreement', home: true, say: 'A tenant in Nairobi asks: how much notice must I give to end the tenancy? The agreement is cut into chunks, and the best chunk goes to the reader.', act: m => m.set({ mode: 2, size: 70, ctx: false, q: 0 }) },
    { t: 'Fixed size', home: true, say: 'Cut every sixty characters, and the answer is sliced in half. The reader gets a fragment and cannot answer.', act: m => m.set({ mode: 0, size: 60 }) },
    { t: 'Too big', home: true, say: 'Keep the whole agreement as one chunk, and the answer is in there, buried in everything else.', act: m => m.set({ size: 480 }) },
    { t: 'Bare sentences', home: true, say: 'Cut by sentence, and "either party may end the tenancy" wins. The notice period is in the next sentence, which says only "to do so".', act: m => m.set({ mode: 1 }) },
    { t: 'Add context', home: true, say: 'Prefix each sentence with a line saying where it sits. Now the right sentence wins.', act: m => m.set({ ctx: true }) },
    { t: 'Small to find, big to read', home: true, say: 'Or match small sentences and hand the reader the whole section. Precise to find, complete to read.', act: m => m.set({ mode: 3 }) },
  ],
  check: [
    { q: 'What goes wrong with fixed-size chunks?', options: ['They can cut an answer in half', 'They are too slow to build', 'They need an LLM'], answer: 0, why: 'They ignore sentence boundaries.' },
    { q: 'What does parent-document retrieval do?', options: ['Matches small chunks, then gives the reader their larger section', 'Stores only whole documents', 'Deletes small chunks'], answer: 0, why: 'Precise matching, complete context.' },
    { q: 'Why can a very large chunk hurt retrieval?', options: ['Its embedding blurs many topics and the answer is buried', 'It cannot be stored', 'It always scores zero'], answer: 0, why: 'Size should fit the answer plus context.' },
  ],
  terms: [
    ['Chunk', 'A piece of a document stored and searched on its own.'],
    ['Fixed-size chunking', 'Cutting every N characters or tokens.'],
    ['Recursive splitting', 'Trying paragraphs, then sentences, then words.'],
    ['Parent-document retrieval', 'Search small chunks, return their larger parent.'],
    ['Contextual retrieval', 'Prefixing each chunk with where it sits in the document.'],
    ['Overlap', 'Repeating text between neighbouring chunks; measure before relying on it.'],
  ],
  deeper: '<p><b>Size by question.</b> Short factual questions suit chunks of a few hundred tokens; questions that need reasoning across a section suit larger ones. Build a test set with both kinds before choosing.</p><p><b>Never cross documents.</b> Chunk each document on its own, so no chunk mixes two agreements or two people\'s records.</p><p><b>About this machine.</b> Chunking and retrieval by shared words are computed live. The context lines stand in for ones a model would write at indexing time.</p>',
  code: {
    title: 'Recursive splitting and parent retrieval',
    note: 'Adapted from the course\'s chunking lesson.',
    text: `
def recursive_split(text, max_chars=400, seps=("\\n\\n", "\\n", ". ", " ")):
    if len(text) <= max_chars:
        return [text]
    for sep in seps:
        parts = text.split(sep)
        if len(parts) > 1:
            out, cur = [], ""
            for p in parts:
                if len(cur) + len(p) + len(sep) > max_chars and cur:
                    out.append(cur); cur = p
                else:
                    cur = cur + sep + p if cur else p
            out.append(cur)
            return [c for part in out for c in recursive_split(part, max_chars, seps)]
    return [text[i:i + max_chars] for i in range(0, len(text), max_chars)]

def parent_retrieve(query, children, parent_of, search):
    best_child = search(query, children)
    return parent_of[best_child]              # the reader gets the whole section
`,
  },
};
