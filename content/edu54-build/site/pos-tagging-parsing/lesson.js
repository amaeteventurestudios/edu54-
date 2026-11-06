// POS tagging and parsing: "Fishermen in Mwanza fish at night". Each word gets a part-of-speech cap (noun, verb, preposition, proper noun), and a dependency parse
// draws arches from each word to the word it depends on, with the main verb as the root. "fish" is the trap: usually a noun, here a verb.
// The tagger is a most-frequent-tag baseline or a bigram HMM (it weighs how likely each tag is to follow the previous one). The parser builds on the tags.
// Break it: most-frequent tag ("fish" becomes a noun, so the sentence has no verb and the parse falls apart), an HMM with no plan for unknown words ("Mwanza" was never seen:
// probability zero for every tag), an HMM that ignores transitions (it reduces to the baseline).
const WORDS = ['Fishermen', 'in', 'Mwanza', 'fish', 'at', 'night'];
const GOLD = ['NOUN', 'ADP', 'PROPN', 'VERB', 'ADP', 'NOUN'];
const HEADS = [[3, 'subject'], [2, 'case'], [0, 'modifier'], [-1, 'root'], [5, 'case'], [3, 'when']];
const TAGC = { NOUN: '#3D6BD6', VERB: '#D9483B', ADP: '#8E91A3', PROPN: '#1C9A94', X: '#151827' };
const TAGN = { NOUN: 'noun', VERB: 'verb', ADP: 'preposition', PROPN: 'proper noun', X: 'unknown' };
// emission and transition tables (counts from a tiny tagged corpus, smoothed)
const EMIT = { fishermen: { NOUN: 0.9 }, in: { ADP: 0.95 }, fish: { NOUN: 0.7, VERB: 0.3 }, at: { ADP: 0.95 }, night: { NOUN: 0.95 } };
const TRANS = { START: { NOUN: 0.5, PROPN: 0.2, ADP: 0.15, VERB: 0.15 }, NOUN: { VERB: 0.45, ADP: 0.3, NOUN: 0.1, PROPN: 0.05, END: 0.1 }, PROPN: { VERB: 0.55, ADP: 0.15, NOUN: 0.15, PROPN: 0.1, END: 0.05 }, ADP: { NOUN: 0.5, PROPN: 0.45, VERB: 0.02, ADP: 0.03 }, VERB: { ADP: 0.45, NOUN: 0.35, PROPN: 0.1, VERB: 0.05, END: 0.05 } };
const TAGS = ['NOUN', 'VERB', 'ADP', 'PROPN'];

export default {
  slug: 'pos-tagging-parsing',
  title: 'Parts of speech and parsing',
  description: '"Fishermen in Mwanza fish at night." Each word gets a part-of-speech cap, and a dependency parse draws arches from each word to the word it depends on.',
  overview: 'Part-of-speech tagging labels each word as a noun, verb, preposition and so on. The simplest tagger gives each word its most common tag, which is right most of the time and wrong exactly where it matters: words like "fish", "book" or "park" that can be several things. A hidden Markov model scores whole tag sequences by multiplying how likely each word is under each tag (emissions) by how likely each tag is to follow the previous one (transitions), and the Viterbi algorithm finds the best sequence. Unknown words need special handling or they zero out every path. A dependency parser then links each word to the word it modifies, building on the tags, so tagging errors spread.',
  keywords: ['part of speech tagging', 'hmm viterbi', 'dependency parsing', 'unknown words nlp', 'most frequent tag baseline'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.75, 0], dir: [0.1, 0.55, 1.3], half: 1.6, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { tagger: 'hmm', unk: true, trans: true };
    const ink = '#151827';
    const stage = P.box(6.0, 0.08, 0.7, '#5B6178', { r: 0.04 }); stage.position.set(0, 0.12, 0.2); floor.add(stage);
    const N = WORDS.length, DX = 0.98, X = i => -2.45 + i * DX;
    const tiles = WORDS.map((w, i) => {
      const b = P.box(0.85, 0.24, 0.45, '#FBF8F1', { r: 0.04 }); b.position.set(X(i), 0.2, 0.2); floor.add(b);
      const cm = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), cap = P.box(0.85, 0.1, 0.45, '#FFFFFF', { r: 0.03, material: cm }); cap.position.set(X(i), 0.44, 0.2); floor.add(cap);
      return { cm };
    });
    const arcs = WORDS.map(() => { const t = P.tube([V(), V(1, 0, 0)], 0.018, C.indigo); t.userData.noFit = true; floor.add(t);    return { t }; });
    const rootPin = P.box(0.04, 0.5, 0.04, C.red, { r: 0 }); rootPin.userData.noFit = true; floor.add(rootPin);

    const tb = P.box(2.4, 0.3, 0.45, C.plum, { r: 0.05 }); tb.position.set(0, 0.12, -0.55); floor.add(tb);


    /* ---------- tagging ---------- */
    function viterbi() {
      const em = (w, t) => { const e = EMIT[w.toLowerCase()]; if (e) return e[t] || 0.001; if (!st.unk) return 0; return /^[A-Z]/.test(w) ? (t === 'PROPN' ? 0.7 : 0.1) : 0.25; };
      const tr = (a, b) => (st.trans ? TRANS[a][b] || 0.001 : 0.25);
      let V0 = TAGS.map(t => ({ p: tr('START', t) * em(WORDS[0], t), path: [t] }));
      for (let i = 1; i < N; i++) V0 = TAGS.map(t => { let best = { p: -1, path: [] }; V0.forEach((v, k) => { const p = v.p * tr(TAGS[k], t) * em(WORDS[i], t); if (p > best.p) best = { p, path: v.path.concat(t) }; }); return best; });
      const best = V0.reduce((a, b) => (b.p > a.p ? b : a));
      return best.p > 0 ? best.path : WORDS.map(() => 'X');
    }
    function tag() {
      if (st.tagger === 'base') return WORDS.map(w => { const e = EMIT[w.toLowerCase()]; return e ? Object.entries(e).sort((a, b) => b[1] - a[1])[0][0] : 'NOUN'; });
      return viterbi();
    }
    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function parse(tags) {
      const v = tags.indexOf('VERB');
      if (tags.includes('X')) return null;
      if (v < 0) return WORDS.map((_, i) => (i === 0 ? [-1, 'root?'] : [i - 1, '?']));
      return HEADS;
    }
    function draw() {
      const tags = tag(), heads = parse(tags);
      tags.forEach((t, i) => { const T = tiles[i]; T.cm.color.set(TAGC[t]);   });
      arcs.forEach((a, i) => {
        const h = heads ? heads[i] : null; a.t.visible = !!h && h[0] >= 0;
        if (!a.t.visible) return;
        const x0 = X(i), x1 = X(h[0]), span = Math.abs(i - h[0]), top = 0.62 + 0.18 * span;
        a.t.geometry.dispose(); a.t.geometry = new THREE.TubeGeometry(new THREE.CubicBezierCurve3(V(x0, 0.56, 0.2), V(x0, top, 0.2), V(x1, top, 0.2), V(x1, 0.56, 0.2)), 24, 0.016, 5, false);
        a.t.material.color.set(heads === HEADS ? C.indigo : '#9A9AA6');
      });
      const r = heads ? heads.findIndex(h => h[0] < 0) : -1; rootPin.visible = r >= 0;
      if (r >= 0) { rootPin.position.set(X(r), 0.56, 0.2);   }
      const right = tags.filter((t, i) => t === GOLD[i]).length;
      R = { tags, right, parsed: heads === HEADS };
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Tagger', options: ['HMM (Viterbi)', 'Most frequent tag'], get: () => (st.tagger === 'hmm' ? 0 : 1), act: i => { st.tagger = i ? 'base' : 'hmm'; draw(); } },
      { type: 'toggle', label: 'Plan for unknown words', short: 'unknown words', get: () => st.unk, set: v => { st.unk = v; draw(); } },
      { type: 'toggle', label: 'Use tag transitions', short: 'transitions', get: () => st.trans, set: v => { st.trans = v; draw(); } },
    ];
    const readouts = [
      { label: 'Tags right', get: () => ({ v: `${R.right} of ${N}`, good: R.right === N, bad: R.right < N - 1 }) },
      { label: '"fish" is', get: () => ({ v: TAGN[R.tags[3]], sub: 'really a verb here', good: R.tags[3] === 'VERB', bad: R.tags[3] !== 'VERB' }) },
      { label: 'Parse', get: () => ({ v: R.parsed ? 'correct' : R.tags.includes('X') ? 'none' : 'broken', good: R.parsed, bad: !R.parsed }) },
    ];
    const labels = [
      { name: 'words', t: 'Words and their tags', d: 'Coloured cap: part of speech', icon: 'box', atV: V(X(0) - 0.45, 0.35, 0.2) },
      { name: 'arcs', t: 'Dependency arches', d: 'Each word points to its head', icon: 'link', atV: V(X(5) + 0.45, 0.8, 0.2) },
      { name: 'tagger', t: 'The tagger', d: 'Switch it in Try it', icon: 'scale', atV: V(X(5) + 0.45, 0.35, 0.2) },
    ];
    const reset = () => { Object.assign(st, { tagger: 'hmm', unk: true, trans: true }); draw(); };
    const breaks = [
      { label: 'Most frequent tag', hint: 'Each word gets its usual tag', on: () => { reset(); st.tagger = 'base'; draw(); }, off: reset },
      { label: 'No plan for unknown words', hint: '"Mwanza" was never seen', on: () => { reset(); st.unk = false; draw(); }, off: reset },
      { label: 'Ignore transitions', hint: 'Every tag equally likely next', on: () => { reset(); st.trans = false; draw(); }, off: reset },
    ];
    function status() {
      if (R.tags.includes('X')) return { ok: false, msg: `<b>One unknown word zeroes everything.</b> "Mwanza" never appeared in the training text, so its probability under every tag is zero, and every path through the sentence multiplies by that zero. Viterbi finds nothing, and there is nothing to parse. Real taggers guess unknown words from clues: a capital letter suggests a proper noun, "-ing" a verb.` };
      if (R.tags[3] !== 'VERB') return { ok: false, msg: `<b>"Fish" became a noun, and the sentence lost its verb.</b> ${st.tagger === 'base' ? 'The baseline gives each word its most common tag, and "fish" is usually a noun.' : 'Without transitions, the HMM only looks at each word alone, which is the baseline again.'} With no verb the parser cannot find a root, and its arches are guesses. After a noun, a verb is far more likely than another noun: that is what transitions capture.` };
      return { ok: true, msg: `<b>All six tags right, and a clean parse.</b> The HMM weighs that a verb is likely after "Mwanza", so "fish" is tagged a verb despite usually being a noun, and the unknown "Mwanza" is guessed a proper noun from its capital letter. The parser then hangs everything off "fish" as the root.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'What each word is', home: true, say: '"Fishermen in Mwanza fish at night." Part of speech tagging labels each word: noun, preposition, proper noun, verb.', act: m => m.set({ tagger: 'hmm', unk: true, trans: true }) },
    { t: 'Who depends on whom', home: true, say: 'A dependency parse draws an arch from each word to the word it depends on. The main verb, "fish", is the root.', act: m => m.set({}) },
    { t: 'The usual tag', home: true, say: 'The simplest tagger gives every word its most common tag. "Fish" is usually a noun, so the sentence loses its verb, and the parse falls apart.', act: m => m.set({ tagger: 'base' }) },
    { t: 'What comes next', home: true, say: 'A hidden Markov model also weighs which tag tends to follow which. After a place name, a verb is likely, so "fish" becomes a verb.', act: m => m.set({ tagger: 'hmm' }) },
    { t: 'Unknown words', home: true, say: '"Mwanza" never appeared in training. With no plan for unknown words, its probability is zero, and every path through the sentence is zero too.', act: m => m.set({ unk: false }) },
    { t: 'Clues for strangers', home: true, say: 'A capital letter suggests a proper noun. With that guess, every tag is right, and the parse is clean.', act: m => m.set({ unk: true }) },
  ],
  check: [
    { q: 'Why does a most-frequent-tag baseline fail on "fishermen fish at night"?', options: ['It tags "fish" as a noun, its usual tag, even when it is a verb', 'It cannot read', 'It has too many tags'], answer: 0, why: 'Context decides.' },
    { q: 'What do HMM transitions add?', options: ['How likely each tag is to follow the previous tag', 'The meaning of each word', 'The sentence length'], answer: 0, why: 'They let context change a word\'s tag.' },
    { q: 'Why can one unknown word wipe out an HMM\'s answer?', options: ['Its probability is zero under every tag, so every path multiplies to zero', 'It is too long', 'It changes the root'], answer: 0, why: 'Unknown words need a guessing rule.' },
  ],
  terms: [
    ['Part of speech', 'A word\'s grammatical role: noun, verb, preposition and so on.'],
    ['HMM', 'Hidden Markov model: tags as hidden states, words as emissions.'],
    ['Viterbi algorithm', 'Finds the most likely sequence of hidden states.'],
    ['Emission probability', 'How likely a word is, given a tag.'],
    ['Transition probability', 'How likely a tag is, given the previous tag.'],
    ['Dependency parse', 'A tree linking each word to the word it modifies.'],
  ],
  deeper: '<p><b>Where this still matters.</b> Parses help extract structured facts, check grammar, and power tools for languages with little data, where a large language model is not available.</p><p><b>Modern taggers</b> are neural sequence models that read the whole sentence both ways and reach about 97% accuracy in English; most remaining errors are on genuinely ambiguous words.</p><p><b>About this machine.</b> The HMM and Viterbi search run here on small hand-set probability tables; the parse shown is the correct one when the tags allow it.</p>',
  code: {
    title: 'Viterbi for a bigram HMM tagger',
    note: 'Adapted from the course\'s POS tagging lesson.',
    text: `
def viterbi(words, tags, emit, trans):
    best = {t: (trans["START"].get(t, 1e-3) * emit(words[0], t), [t]) for t in tags}
    for w in words[1:]:
        best = {
            t: max(((p * trans[prev].get(t, 1e-3) * emit(w, t), path + [t])
                    for prev, (p, path) in best.items()), key=lambda x: x[0])
            for t in tags
        }
    return max(best.values(), key=lambda x: x[0])[1]

def emit(word, tag):
    if word.lower() in EMIT:
        return EMIT[word.lower()].get(tag, 1e-3)
    return 0.7 if (word[0].isupper() and tag == "PROPN") else 0.1   # plan for unknown words
`,
  },
};
