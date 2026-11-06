// Named entity recognition: a news line, "on tuesday wanjiru kamau flew from nairobi to malindi to meet safari mobile" style text, tagged word by word with BIO labels:
// B- starts an entity, I- continues it, O is outside. Each word is a tile on a rail with a coloured flag: person, place, organisation, date.
// Entity-level F1 counts a span as right only if every word and its type match. The tagger is a dictionary, a capital-letter rule, a word-by-word classifier, or a sequence model (CRF-like).
// Break it: dictionary only (an unlisted town and a new company are missed), capital letters only (fails on a text message typed in lower case), word-by-word with no sequence (orphan I- tags split names in two).
const TEXT = 'On Tuesday Wanjiru Kamau flew from Nairobi to Malindi to meet Safari Mobile .';
const GOLD = ['O', 'B-DATE', 'B-PER', 'I-PER', 'O', 'O', 'B-LOC', 'O', 'B-LOC', 'O', 'O', 'B-ORG', 'I-ORG', 'O'];
const TYPE = { PER: { n: 'person', c: '#D9483B' }, LOC: { n: 'place', c: '#1C9A94' }, ORG: { n: 'organisation', c: '#8A3F8E' }, DATE: { n: 'date', c: '#E3A72F' } };
const DICT = { tuesday: 'DATE', nairobi: 'LOC', mombasa: 'LOC', kisumu: 'LOC', wanjiru: 'PER', kamau: 'PER' };
const spans = tags => { const out = []; let cur = null; tags.forEach((t, i) => { if (t.startsWith('B-') || (t.startsWith('I-') && (!cur || cur.type !== t.slice(2)))) { if (cur) out.push(cur); cur = { type: t.slice(2), s: i, e: i }; } else if (t.startsWith('I-') && cur) cur.e = i; else { if (cur) out.push(cur); cur = null; } }); if (cur) out.push(cur); return out; };

export default {
  slug: 'named-entity-recognition',
  title: 'Named entities: people, places, companies',
  description: 'A news line about a trip from Nairobi to Malindi, tagged word by word. Flags mark the names found; swap the tagger and see which it misses or runs together.',
  overview: 'Named entity recognition finds the names in text and says what kind each is: person, place, organisation, date and so on. It is usually framed as tagging every word with BIO labels, where B- marks the first word of a name, I- the following words of the same name, and O everything else, so multi-word names like "Safari Mobile" stay together. Dictionaries miss anything new, capital-letter rules fail on lower-case text and sentence starts, and a classifier that tags each word alone can produce impossible sequences such as I-ORG with no B-ORG. Sequence models (CRFs, BiLSTM-CRFs, transformers) choose the best whole sequence of tags. It is scored by exact span match.',
  keywords: ['named entity recognition', 'bio tagging', 'ner crf', 'entity level f1', 'sequence labelling'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.3, 0.3], dir: [0.05, 1.0, 1.1], half: 1.1, wide: 5.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { tagger: 'seq', lower: false };
    const words = TEXT.split(' '), N = words.length, PER = 7, W = 5.0 / PER;
    const RZ = r => (r ? 0.75 : 0.0);
    /* ---------- one tile per word, with a flag if it is tagged ---------- */
    const tiles = words.map((w, i) => {
      const r = i < PER ? 0 : 1, z = RZ(r), x = -2.5 + (i % PER + 0.5) * W, tm = new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), b = P.box(W * 0.9, 0.16, 0.36, '#fff', { r: 0.03, material: tm }); b.position.set(x, 0, z); S.add(b);
      const pole = P.box(0.03, 0.4, 0.03, '#5B6178', { r: 0.005 }); pole.position.set(x, 0.16, z - 0.14); pole.userData.noFit = true; S.add(pole);
      const fm = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), flag = P.box(W * 0.76, 0.2, 0.03, '#FFFFFF', { r: 0.01, material: fm }); flag.position.set(x, 0.38, z - 0.14); flag.userData.noFit = true; S.add(flag);
      return { x, z, tm, pole, flag, fm };
    });
    const brackets = [...Array(6)].map(() => { const t = P.tube([V(), V(1, 0, 0)], 0.018, '#151827'); t.userData.noFit = true; S.add(t); return t; });
    /* ---------- the score: a tower for how many entities came out exactly right ---------- */
    const score = P.tower(0.4, 0.4, C.teal, { h: 0.4 }); score.userData.set({ cap: '' }); score.position.set(2.85, 0, 0.35); S.add(score);
    S.add(P.keep(-2.6, 3.1, 0.85, -0.45, 1.1));
    /* ---------- taggers ---------- */
    let R = null;
    function tag() {
      const ws = words.map(w => (st.lower ? w.toLowerCase() : w));
      if (st.tagger === 'dict') { let prev = null; return ws.map(w => { const t = DICT[w.toLowerCase()]; const out = t ? (prev === t && t === 'PER' ? `I-${t}` : `B-${t}`) : 'O'; prev = t || null; return out; }); }
      if (st.tagger === 'caps') { let prev = false; return ws.map((w, i) => { const cap = /^[A-Z]/.test(w); const out = cap ? (prev ? 'I-PER' : 'B-PER') : 'O'; prev = cap; return out; }); }
      if (st.tagger === 'word') return ['O', 'B-DATE', 'B-PER', 'I-PER', 'O', 'O', 'B-LOC', 'O', 'B-LOC', 'O', 'O', 'I-ORG', 'B-LOC', 'O'];
      return st.lower ? ['O', 'B-DATE', 'B-PER', 'I-PER', 'O', 'O', 'B-LOC', 'O', 'B-LOC', 'O', 'O', 'B-ORG', 'I-ORG', 'O'] : GOLD.slice();
    }
    function draw() {
      const pred = tag(), gs = spans(GOLD), ps = spans(pred);
      const ok = ps.filter(p => gs.some(g => g.s === p.s && g.e === p.e && g.type === p.type)).length, prec = ps.length ? ok / ps.length : 0, rec = ok / gs.length, f1 = prec + rec ? 2 * prec * rec / (prec + rec) : 0;
      words.forEach((w, i) => {
        const T = tiles[i], tg = pred[i], ty = tg === 'O' ? null : tg.slice(2), right = tg === GOLD[i];
        T.tm.color.set(tg === 'O' ? (right ? '#FBF8F1' : '#F7DED5') : right ? '#D9F0E9' : '#F7DED5');
        T.flag.visible = !!ty; T.pole.visible = !!ty;
        if (ty) T.fm.color.set(TYPE[ty].c);
      });
      brackets.forEach((b, k) => { const sp = ps[k]; b.visible = !!sp; if (!sp) return; const x0 = tiles[sp.s].x - W * 0.45, x1 = tiles[sp.e].x + W * 0.45, bz = tiles[sp.s].z + 0.24; b.geometry.dispose(); b.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(x0, 0.18, bz - 0.04), V(x0, 0.18, bz + 0.03), V(x1, 0.18, bz + 0.03), V(x1, 0.18, bz - 0.04)], false, 'catmullrom', 0), 12, 0.018, 4, false); b.material.color.set(TYPE[sp.type].c); });
      score.userData.set({ h: Math.max(0.03, f1 * 0.8), color: f1 > 0.9 ? C.teal : f1 > 0.5 ? C.gold : C.red });
      R = { f1, prec, rec, ok, ps, gs, pred };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Tagger', options: ['Sequence model', 'Word by word', 'Dictionary', 'Capital letters'], get: () => ['seq', 'word', 'dict', 'caps'].indexOf(st.tagger), act: i => { st.tagger = ['seq', 'word', 'dict', 'caps'][i]; draw(); } },
      { type: 'toggle', label: 'Text typed in lower case (like a text message)', short: 'lower case', get: () => st.lower, set: v => { st.lower = v; draw(); } },
    ];
    const pct = v => `${Math.round(v * 100)}%`;
    const readouts = [
      { label: 'Entity F1', get: () => ({ v: R.f1.toFixed(2), sub: 'exact spans and types', good: R.f1 > 0.95, bad: R.f1 < 0.7 }) },
      { label: 'Precision', get: () => ({ v: pct(R.prec), sub: 'found entities that are right' }) },
      { label: 'Recall', get: () => ({ v: pct(R.rec), sub: 'real entities found' }) },
    ];
    const labels = [
      { name: 'rail', t: 'One tag per word', d: 'Green tile: the tag is right', icon: 'target', atV: V(-2.42, 0.1, 0) },
      { name: 'flags', t: 'Entity flags', d: 'Colour: person, place, firm, date', icon: 'book', atV: V(2.3, 0.1, 0) },
    ];
    const reset = () => { Object.assign(st, { tagger: 'seq', lower: false }); draw(); };
    const breaks = [
      { label: 'Dictionary only', hint: 'A list of known names', on: () => { reset(); st.tagger = 'dict'; draw(); }, off: reset },
      { label: 'Capital letters, lower-case text', hint: 'A text message', on: () => { reset(); st.tagger = 'caps'; st.lower = true; draw(); }, off: reset },
      { label: 'Word by word, no sequence', hint: 'Each tag chosen alone', on: () => { reset(); st.tagger = 'word'; draw(); }, off: reset },
    ];
    function status() {
      if (st.tagger === 'dict') return { ok: false, msg: `<b>New names are invisible.</b> The dictionary knows Nairobi, Tuesday and the person\'s names, but not the town of Malindi or the company Safari Mobile, so both are missed: ${R.ok} of ${R.gs.length} entities, F1 ${R.f1.toFixed(2)}. Lists can never keep up with new places, people and businesses.` };
      if (st.tagger === 'caps') return { ok: false, msg: st.lower ? `<b>Nothing found at all.</b> The rule "capitalised words are names" finds nothing in a text message typed in lower case: F1 ${R.f1.toFixed(2)}. Even with capitals it would tag "On" at the start of the sentence and call every name a person.` : `<b>Capitals are not types.</b> The rule tags "On" because it starts the sentence, chains capitalised words into one long "person", and cannot tell a place from a company: F1 ${R.f1.toFixed(2)}.` };
      if (st.tagger === 'word') return { ok: false, msg: `<b>Impossible tag sequences.</b> Choosing each tag alone, the classifier gives "Safari" I-ORG with no B-ORG before it and calls "Mobile" a place, splitting one company into two broken entities: F1 ${R.f1.toFixed(2)}. A sequence model scores whole sequences, so I- can only follow a B- of the same type.` };
      return { ok: true, msg: `<b>All ${R.gs.length} entities, exactly.</b> The sequence model reads each word in context and picks the best whole sequence of tags: a date, a two-word person, two places and a two-word company${st.lower ? ', even in lower case' : ''}. Entity F1 ${R.f1.toFixed(2)}.` };
    }
    return { update: dt => { score.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Names in text', home: true, say: 'A news line about a trip from Nairobi to Malindi. Named entity recognition finds the names and says what kind each is.', act: m => m.set({ tagger: 'seq', lower: false }) },
    { t: 'B, I and O', home: true, say: 'Every word gets a tag. B starts a name, I continues the same name, and O is everything else, so "Safari Mobile" stays one company.', act: m => m.set({}) },
    { t: 'A dictionary', home: true, say: 'A dictionary of names finds Nairobi, but not a town or company it has never heard of.', act: m => m.set({ tagger: 'dict' }) },
    { t: 'Capital letters', home: true, say: 'A capital letter rule tags the first word of the sentence, cannot tell places from people, and finds nothing at all in a lower case text message.', act: m => m.set({ tagger: 'caps', lower: true }) },
    { t: 'One word at a time', home: true, say: 'A classifier that tags each word alone can produce impossible sequences, like I with no B, and splits one company in two.', act: m => m.set({ tagger: 'word', lower: false }) },
    { t: 'Whole sequences', home: true, say: 'A sequence model chooses the best whole sequence of tags, reading every word in context. Every entity, exactly right.', act: m => m.set({ tagger: 'seq' }) },
  ],
  check: [
    { q: 'What does the B- in BIO tagging mean?', options: ['The first word of an entity', 'A word inside a sentence', 'A bad tag'], answer: 0, why: 'I- continues the same entity; O is outside.' },
    { q: 'Why does a dictionary-only tagger fail?', options: ['It misses any name not on its list', 'It is too slow', 'It only works in lower case'], answer: 0, why: 'New places and companies appear all the time.' },
    { q: 'What does a sequence model add over tagging each word alone?', options: ['It chooses the best whole tag sequence, so I- only follows a matching B-', 'It reads faster', 'It removes punctuation'], answer: 0, why: 'Tags depend on their neighbours.' },
  ],
  terms: [
    ['Named entity', 'A name of a person, place, organisation, date and so on.'],
    ['BIO tagging', 'Labelling each word as Beginning, Inside or Outside an entity.'],
    ['Sequence labelling', 'Assigning a tag to every item in a sequence.'],
    ['CRF', 'Conditional random field: a model that scores whole tag sequences.'],
    ['Entity-level F1', 'F1 counting only exactly matching spans and types.'],
    ['Gazetteer', 'A list of known names used as a feature or dictionary.'],
  ],
  deeper: '<p><b>Today\'s options.</b> Fine-tuned transformers are the standard for NER, and large language models can extract entities from a prompt, which helps when there is no labelled data for a new entity type.</p><p><b>Swahili and other languages</b> need their own training data: capitalisation habits, name patterns and place names all differ.</p><p><b>About this machine.</b> The four taggers\' outputs are fixed to show their typical behaviour; spans, precision, recall and F1 are computed exactly from them.</p>',
  code: {
    title: 'BIO tags to spans, and entity-level F1',
    note: 'Adapted from the course\'s NER lesson.',
    text: `
def spans(tags):
    out, cur = [], None
    for i, t in enumerate(tags):
        if t.startswith("B-") or (t.startswith("I-") and (cur is None or cur[0] != t[2:])):
            if cur: out.append(tuple(cur))
            cur = [t[2:], i, i]
        elif t.startswith("I-"):
            cur[2] = i
        else:
            if cur: out.append(tuple(cur))
            cur = None
    if cur: out.append(tuple(cur))
    return set(out)

def entity_f1(gold, pred):
    g, p = spans(gold), spans(pred)
    tp = len(g & p)
    prec, rec = tp / max(1, len(p)), tp / max(1, len(g))
    return 2 * prec * rec / max(1e-9, prec + rec)
`,
  },
};
