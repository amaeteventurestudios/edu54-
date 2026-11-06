// RAG: a farmers' co-op keeps its notes on a shelf. A question is turned into a search, the best-matching cards fly to the tray,
// and the model answers from them. Break it: retrieval off (it makes up a confident answer), a stale card on the shelf.
const NOTES = [
  'Plant cassava at the start of the rains, in April or May.',
  'This season the co-op pays {$55} a tonne for fresh cassava.',
  'Harvest cassava 9 to 12 months after planting.',
  'Mosaic disease: yellow, twisted leaves. Pull up the plant and burn it.',
  'Garri: peel, grate, press out the water, then fry.',
  'Plant stem cuttings 20 to 25 cm long, with 5 to 7 nodes.',
  'Fresh roots spoil fast: sell or process them within 2 days.',
  'Meetings: first Saturday of the month, 10 am, community hall.',
  'Fertiliser: NPK 15-15-15, 400 kg a hectare, 8 weeks after planting.',
  'Weed three times in the first three months.',
  'The co-op truck collects on Tuesdays and Fridays.',
  'Membership costs {$3.2} a year.',
];
const STALE = 'Last season the co-op paid {$39} a tonne.';
const QS = [
  { q: 'When should I plant cassava?', made: 'Plant cassava in December, at the height of the dry season.' },
  { q: 'How much does the co-op pay for a tonne?', made: 'The co-op pays {$26} a tonne.' },
  { q: 'My leaves are yellow and twisted. What do I do?', made: 'Yellow leaves mean the plant needs more water. Water it twice a day.' },
  { q: 'When is the next meeting?', made: 'Meetings are every Sunday afternoon.' },
];
const SYN = { money: 'pay', meetings: 'meetings', price: 'pay', cost: 'pay', costs: 'pay', paid: 'pay', pays: 'pay', tonne: 'tonne', ton: 'tonne', sow: 'plant', planting: 'plant', meeting: 'meetings', meet: 'meetings', yellow: 'yellow', disease: 'disease', sick: 'disease', leaves: 'leaves', leaf: 'leaves', truck: 'truck', pickup: 'truck', collect: 'truck', harvest: 'harvest', fertilizer: 'fertiliser', manure: 'fertiliser', garri: 'garri', weed: 'weed', weeding: 'weed', join: 'membership', member: 'membership' };
// prices are written {$55}: about 55 US dollars, shown in the learner's currency
const STOP = new Set('the a an of to in on at and or is are do does i my me what when how much should for with it this that be can you your we'.split(' '));
const words = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w)).map(w => SYN[w] || w.replace(/s$/, ''));

export default {
  slug: 'rag',
  title: 'RAG: look it up first',
  description: 'A co-op\'s notes sit on a shelf. Ask a question and watch the right cards fly to the model before it answers. Switch the lookup off and it confidently makes things up.',
  overview: 'A language model only knows what it saw in training, and it will happily guess. Retrieval-augmented generation (RAG) fixes that: first search your own documents for the passages that match the question, then hand those passages to the model with the question. The answer comes from your notes, not from memory.',
  money: true,
  keywords: ['rag explained', 'retrieval augmented generation', 'llm hallucination', 'vector search', 'chat with your documents'],
  orient: 'any',
  view: { target: [0.2, 1.1, 0.2], dir: [0.6, 0.75, 1.3], half: 3.1, wide: 4.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { q: 0, custom: '', k: 2, retrieve: true, stale: false, phase: 1 };
    const cash = s => s.replace(/\{\$([\d.]+)\}/g, (_, v) => S.money.of(+v));
    const notes = () => NOTES.map((n, i) => cash(i === 1 && st.stale ? STALE : n));
    /* ---------- the shelf ---------- */
    const SX = -1.9;
    const frame = new THREE.Group(); frame.position.set(SX, 0, -0.9); S.add(frame);
    for (const y of [0, 0.95, 1.9, 2.85]) { const b = P.box(3.2, 0.08, 0.7, '#A87A4F', { r: 0.03 }); b.position.y = y; frame.add(b); }
    for (const x of [-1.6, 1.6]) { const s = P.box(0.08, 2.95, 0.7, '#8A5F3A', { r: 0.02 }); s.position.x = x; frame.add(s); }
    const cardHome = i => V(SX - 1.15 + (i % 4) * 0.77, 0.08 + Math.floor(i / 4) * 0.95, -0.9);
    const cards = NOTES.map((n, i) => {
      const g = new THREE.Group(); g.position.copy(cardHome(i)); S.add(g);
      const b = P.box(0.62, 0.8, 0.07, '#FFFDF5', { r: 0.03 }); g.add(b);
      const t = S.text(`${i + 1}`, { size: 0.2, face: 'front', weight: 800, color: '#A87A4F' }); t.position.set(0, 0.6, 0.045); g.add(t);
      for (let l = 0; l < 3; l++) { const ln = P.box(0.44 - l * 0.08, 0.02, 0.01, '#C9C4B6', { r: 0 }); ln.position.set(-l * 0.04, 0.38 - l * 0.1, 0.04); g.add(ln); }
      g.userData.noFit = false; g.userData.score = 0; g.userData.to = cardHome(i);
      S.tap(b, () => S.pop(`Note ${i + 1}`, `<p>${notes()[i]}</p>`));
      return g;
    });
    const glow = cards.map(c => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.9, 0.02), new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0, depthWrite: false })); r.position.set(0, 0.4, -0.05); r.layers.set(1); r.userData.noMask = true; c.add(r); return r; });
    /* ---------- the tray and the model ---------- */
    const tray = P.box(2.0, 0.1, 1.0, '#D8D2C4', { r: 0.12 }); tray.position.set(0.9, 0, 1.25); S.add(tray);
    const trayT = S.text('PROMPT', { size: 0.13, weight: 800, color: '#8A846F' }); trayT.position.set(0.9, 0.11, 1.68); S.add(trayT);
    const llm = P.box(1.2, 1.3, 1.1, C.ink, { r: 0.16 }); llm.position.set(2.55, 0, -0.35); S.add(llm);
    const llmT = S.text('MODEL', { size: 0.17, face: 'front', weight: 800, color: '#FFFFFF' }); llmT.position.set(2.55, 0.95, 0.21); S.add(llmT);
    const eye = P.ball(0.12, C.gold); eye.position.set(2.55, 0.62, 0.2); S.add(eye);
    const feed = P.arrow(V(1.95, 0.35, 1.0), V(2.4, 0.35, 0.3), 0.04, C.grey); S.add(feed);
    const qT = S.text('', { size: 0.16, face: 'cam', weight: 700, bg: '#FFFFFF', color: C.ink, order: 6, align: 'left' }); qT.position.set(0.3, 2.9, 0.6); qT.userData.noFit = true; S.add(qT);
    const aT = S.text('', { size: 0.15, face: 'cam', weight: 600, bg: '#FFF6DA', color: C.ink, order: 6, align: 'left' }); aT.position.set(2.55, 2.25, -0.2); aT.userData.noFit = true; S.add(aT);
    const wrap = (s, n = 30) => { const out = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } out.push(line.trim()); return out.join('\n'); };
    /* ---------- search: count shared words, rare words count more ---------- */
    const df = new Map(); NOTES.concat(STALE).forEach(n => new Set(words(cash(n))).forEach(w => df.set(w, (df.get(w) || 0) + 1)));
    const idf = w => Math.log(1 + 13 / (df.get(w) || 0.5));
    function scores(question) {
      const qw = words(question);
      return notes().map(n => { const nw = new Set(words(n)); let s = 0; for (const w of qw) if (nw.has(w)) s += idf(w); const norm = Math.sqrt(qw.length * nw.size) || 1; return s / norm; });
    }
    const question = () => st.custom || QS[st.q].q;
    let top = [];
    function ask() {
      const sc = scores(question());
      top = sc.map((s, i) => [s, i]).filter(([s]) => s > 0.05).sort((a, b) => b[0] - a[0]).slice(0, st.k).map(([, i]) => i);
      const mx = Math.max(...sc, 0.01);
      cards.forEach((c, i) => {
        c.userData.score = sc[i] / mx;
        const k = top.indexOf(i);
        c.userData.to = st.retrieve && k >= 0 ? V(0.9 + (k - (top.length - 1) / 2) * 0.72, 0.1, 1.25 - 0.15) : cardHome(i);
        glow[i].material.opacity = st.retrieve ? Math.min(0.85, (sc[i] / mx) ** 2 * 0.85) : 0;
      });
      qT.userData.set(wrap(`“${question()}”`, 34));
      aT.userData.set(wrap(answer(), 30));
    }
    function answer() {
      if (!st.retrieve) { const p = QS.find(x => x.q === question()); return p ? cash(p.made) : 'Probably early in the season. Most farmers do it that way.'; }
      if (!top.length) return 'None of the notes cover that. I don\'t know.';
      return `From note ${top[0] + 1}: ${notes()[top[0]]}`;
    }
    ask();
    function update(dt) {
      const k = S.reduced ? 1 : Math.min(1, dt * 5);
      cards.forEach(c => { c.position.lerp(c.userData.to, k); c.rotation.x = c.position.z > 0 ? -1.2 * Math.min(1, (c.position.z + 0.9) / 2.0) : 0; });
      eye.material = P.mat(st.retrieve ? C.gold : C.red);
    }
    const controls = [
      { type: 'buttons', label: 'Ask', options: QS.map(x => x.q), get: () => st.custom ? -1 : st.q, act: i => { st.q = i; st.custom = ''; ask(); } },
      { type: 'text', label: 'Ask your own', placeholder: 'e.g. When does the truck come?', go: 'Ask', get: () => st.custom, set: v => { st.custom = v.trim().slice(0, 90); ask(); } },
      { type: 'slider', label: 'Cards to fetch (top-k)', min: 1, max: 4, step: 1, get: () => st.k, set: v => { st.k = v; ask(); } },
      { type: 'toggle', label: 'Look it up first', get: () => st.retrieve, set: v => { st.retrieve = v; ask(); } },
    ];
    const readouts = [
      { label: 'Best match', get: () => top.length && st.retrieve ? { v: `note ${top[0] + 1}`, sub: `${top.length} card${top.length > 1 ? 's' : ''} in the prompt` } : { v: '—', sub: st.retrieve ? 'nothing matched' : 'no lookup' } },
      { label: 'Answer from', get: () => st.retrieve && top.length ? { v: 'your notes', good: !st.stale || top[0] !== 1 } : { v: 'memory', bad: true } },
    ];
    const labels = [
      { name: 'shelf', t: 'Your documents', d: 'The co-op\'s notes. Tap a card to read it', icon: 'book', atV: V(SX - 1.15, 2.85, -0.9) },
      { name: 'tray', t: 'The prompt', d: 'Question + the cards that matched', icon: 'box', atV: V(0.9, 0.25, 1.25) },
      { name: 'answer', t: 'The answer', d: 'Built from the cards, with a source', icon: 'spark', atV: V(2.55, 1.3, -0.35) },
      { name: 'question', t: 'The question', d: 'Turned into a search first', icon: 'target', atV: V(0.3, 2.75, 0.6), phone: false },
    ];
    const breaks = [
      { label: 'Skip the lookup', hint: 'The model answers from memory', on: () => { st.retrieve = false; ask(); }, off: () => { st.retrieve = true; ask(); } },
      { label: 'A stale card on the shelf', hint: 'Last season\'s price replaces this season\'s', on: () => { st.stale = true; st.q = 1; st.custom = ''; ask(); }, off: () => { st.stale = false; ask(); } },
    ];
    function status() {
      if (!st.retrieve) return { ok: false, msg: `<b>Confident and wrong.</b> With no lookup the model writes something that sounds right: "${answer()}" It isn't in the notes. This is called a hallucination.` };
      if (st.stale && top[0] === 1) return { ok: false, msg: `<b>Right search, wrong answer.</b> The lookup worked, but the card is last season's. RAG is only as good as the shelf: keep documents fresh and dated.` };
      if (!top.length) return { msg: `<b>No card matches.</b> A good RAG system says "I don't know" rather than guessing.` };
      return { ok: true, msg: `<b>Grounded.</b> The search found note ${top[0] + 1}${top.length > 1 ? ` and ${top.length - 1} more` : ''}. They go into the prompt with the question, and the answer quotes its source.` };
    }
    return { update, controls, readouts, labels, breaks, status, currency: () => ask(),
      reset: () => { Object.assign(st, { q: 0, custom: '', k: 2, retrieve: true, stale: false }); ask(); },
      set: p => { Object.assign(st, p); ask(); } };
  },

  story: [
    { t: 'The model guesses', home: true, say: 'Ask a model how much the co-op pays for cassava. It never saw the co-op\'s notes, so it guesses, and sounds sure.', act: m => m.set({ q: 1, retrieve: false }) },
    { t: 'Your own documents', focus: 'shelf', zoom: 1.3, say: 'The co-op has the real answer, on its shelf of notes. Retrieval-augmented generation means: look it up first.' },
    { t: 'Search', home: true, say: 'The question is turned into a search. Each card gets a score for how well it matches. The best ones glow.', act: m => m.set({ retrieve: true }) },
    { t: 'Into the prompt', focus: 'tray', zoom: 1.4, say: 'The top cards go into the prompt, next to the question. Now the model reads the answer instead of remembering it.' },
    { t: 'An answer with a source', focus: 'answer', zoom: 1.3, say: 'The answer comes from note two, and says so. You can check it.' },
    { t: 'Keep the shelf fresh', home: true, say: 'Real systems search thousands of documents using embeddings, the word arrows from earlier lessons. But it is only as good as the shelf. Old notes give old answers.', act: m => m.set({ q: 0 }) },
  ],
  check: [
    { q: 'What does RAG add to a language model?', options: ['A search of your documents before it answers', 'More training data', 'A faster chip'], answer: 0, why: 'Retrieve first, then generate an answer from what was found.' },
    { q: 'With the lookup off, the model…', options: ['Says nothing', 'Answers from memory and may make things up', 'Reads the notes anyway'], answer: 1, why: 'It still answers, often confidently. That is a hallucination.' },
    { q: 'The search finds an out-of-date card. The answer will be…', options: ['Corrected automatically', 'Out of date too', 'Blank'], answer: 1, why: 'RAG trusts the shelf. Keep documents current and show sources.' },
  ],
  terms: [
    ['Retrieval', 'Finding the documents that match a question.'],
    ['Chunk', 'A small piece of a document, stored and searched on its own.'],
    ['Vector search', 'Searching by meaning, using embeddings instead of exact words.'],
    ['Grounding', 'Answering from given sources, not memory.'],
    ['Hallucination', 'A confident answer that is made up.'],
  ],
  deeper: '<p>Real RAG splits documents into chunks, turns each chunk into an embedding, and stores them in a vector database. A question becomes an embedding too, and the nearest chunks are fetched. Many systems mix meaning search with plain keyword search, then re-rank the results before putting the best few in the prompt.</p>',
  code: {
    title: 'Retrieve, then generate',
    note: 'The shape of the course\'s RAG pipeline.',
    text: `
import numpy as np

def retrieve(question, chunks, embed, k=2):
    q = embed(question)
    scores = [q @ embed(c) / (np.linalg.norm(q) * np.linalg.norm(embed(c)))
              for c in chunks]
    best = np.argsort(scores)[::-1][:k]
    return [chunks[i] for i in best]

def answer(question, chunks, embed, llm):
    found = retrieve(question, chunks, embed)
    prompt = "Answer only from these notes. Say which note you used.\\n"
    prompt += "\\n".join(f"[{i+1}] {c}" for i, c in enumerate(found))
    prompt += f"\\n\\nQuestion: {question}"
    return llm(prompt)
`,
  },
};
