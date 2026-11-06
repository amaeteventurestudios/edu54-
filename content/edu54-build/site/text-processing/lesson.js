// Text processing: customer messages to a bus company in Nairobi go down a line of stations before any model sees them.
// Lowercase, split into tokens, drop stopwords, then reduce each word to a stem (chop endings) or a lemma (look up the dictionary form). Word tiles ride the belt; the counter at the end tallies the vocabulary.
// Break it: split on spaces only (punctuation sticks: "late." and "late" become different words), an aggressive stemmer ("university" and "universe" both become "univers"),
// drop stopwords before judging sentiment ("not" is a stopword, so "not happy" turns into "happy").
const MSG = 'The buses were NOT running on time again. The driver was late, and I am not happy! Buses are running late today.';
const STOP = new Set(['the', 'were', 'on', 'again', 'was', 'and', 'i', 'am', 'are', 'not', 'a', 'to', 'is']);
const LEMMA = { buses: 'bus', were: 'be', running: 'run', was: 'be', am: 'be', are: 'be', drivers: 'driver', universities: 'university' };
const stemLight = w => w.replace(/(ing|es|s)$/, '').replace(/(.)\1$/, '$1');
const stemHard = w => w.replace(/(ity|ities|ers|ing|es|ed|er|e|s|y)$/, '').replace(/(.)\1$/, '$1').slice(0, 7);

export default {
  slug: 'text-processing',
  title: 'Text processing: from messages to words',
  description: 'Customer messages to a Nairobi bus company ride down a line of five stations. Each one throws something away, so watch what the counts lose, and what they should not.',
  overview: 'Before a classical text model can count anything, raw text has to become a clean list of comparable words. Lowercasing makes "Buses" and "buses" the same. Tokenisation splits text into words and punctuation, which is harder than splitting on spaces. Stopword removal drops very common words such as "the" and "was" that carry little topic. Stemming chops endings by rule ("running" to "run"), which is fast but crude; lemmatisation looks up the dictionary form ("were" to "be"), which is slower but correct. Every step throws information away, so each must suit the task: removing "not" is fine for finding topics and disastrous for judging sentiment.',
  keywords: ['text preprocessing', 'tokenization', 'stemming vs lemmatization', 'stopwords', 'nlp pipeline'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { split: 'smart', reduce: 'lemma', stop: true, task: 'topic', clock: 0 };
    /* ---------- the stations ---------- */
    const belt = P.belt(V(-3.1, 0, 0.15), V(3.1, 0, 0.15), { w: 0.4, speed: 0.9 }); S.add(belt);
    const ST = [C.teal, C.indigo, C.plum, C.orange, '#2E7A45'];
    const stations = ST.map((c, i) => {
      const x = -2.5 + i * 1.25, m = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.7, 0.3, 0.36, c, { r: 0.06, material: m }); b.position.set(x, 0, 0.55); S.add(b);
      const t = P.tower(0.6, 0.5, c, { h: 0.4 }); t.userData.set({ cap: '' }); t.position.set(x, 0, -0.45); S.add(t);
      return { x, m, t };
    });
    /* ---------- a lamp for what a station took that it should not have ---------- */
    const wrong = P.lamp(C.green, { h: 0.22, r: 0.1 }); wrong.position.set(3.2, 0, 0.55); S.add(wrong);
    S.add(P.keep(-3.2, 3.45, 1.0, -0.8, 0.8));
    /* ---------- the pipeline ---------- */
    let R = null;
    function run() {
      let text = MSG.toLowerCase();
      let toks = st.split === 'space' ? text.split(/\s+/) : text.match(/[a-z]+|[.,!?]/g);
      const afterSplit = toks.slice();
      let words = st.split === 'space' ? toks : toks.filter(t => /[a-z]/.test(t));
      if (st.stop) words = words.filter(w => !STOP.has(w.replace(/[.,!?]/g, '')));
      const afterStop = words.length;
      const reduce = w => { const core = w.replace(/[.,!?]/g, ''), tail = w.slice(core.length); const r = st.reduce === 'none' ? core : st.reduce === 'lemma' ? (LEMMA[core] || core) : st.reduce === 'hard' ? stemHard(core) : stemLight(core); return r + tail; };
      words = words.map(reduce);
      const vocab = [...new Set(words)];
      // the hard stemmer merges unrelated words: show it on a pair
      const merge = st.reduce === 'hard' ? `${stemHard('university')} = ${stemHard('universe')}` : st.reduce === 'light' ? `${stemLight('university')} vs ${stemLight('universe')}` : 'university vs universe';
      const hasNot = words.some(w => w.startsWith('not'));
      const happyMood = !hasNot && words.some(w => w.startsWith('happ'));
      const lateVariants = vocab.filter(w => /^lat/.test(w)).length;
      return { afterSplit, afterStop, words, vocab, merge, hasNot, happyMood, lateVariants };
    }
    function draw() {
      R = run();
      const counts = [MSG.split(' ').length, R.afterSplit.length, R.afterStop, R.words.length, R.vocab.length];
      stations.forEach((s, i) => s.t.userData.set({ h: Math.max(0.03, counts[i] * 0.032) }));
      stations[2].m.color.set(st.stop ? C.plum : '#9A9AA6');
      stations[3].m.color.set(st.reduce === 'none' ? '#9A9AA6' : st.reduce === 'hard' ? C.red : C.orange);
      wrong.userData.set({ color: st.split === 'space' || st.reduce === 'hard' || (st.task === 'mood' && st.stop) ? C.red : C.green, on: true });
    }
    draw();
    function update(dt) {
      stations.forEach(s => s.t.userData.tick(dt));
      st.clock += dt; if (st.clock > 1) { st.clock = 0; belt.userData.send(st.split === 'space' ? C.orange : C.teal, { size: 0.16 }); }
      belt.userData.tick(dt);
    }
    const controls = [
      { type: 'buttons', label: 'Split into tokens', options: ['Words and punctuation', 'Spaces only'], get: () => (st.split === 'smart' ? 0 : 1), act: i => { st.split = i ? 'space' : 'smart'; draw(); } },
      { type: 'buttons', label: 'Reduce each word', options: ['Lemma', 'Light stem', 'Hard stem', 'Leave'], get: () => ['lemma', 'light', 'hard', 'none'].indexOf(st.reduce), act: i => { st.reduce = ['lemma', 'light', 'hard', 'none'][i]; draw(); } },
      { type: 'toggle', label: 'Remove stopwords', short: 'stopwords', get: () => st.stop, set: v => { st.stop = v; draw(); } },
      { type: 'buttons', label: 'What the words are for', options: ['Finding topics', 'Judging the mood'], get: () => (st.task === 'topic' ? 0 : 1), act: i => { st.task = i ? 'mood' : 'topic'; draw(); } },
    ];
    const readouts = [
      { label: 'Vocabulary', get: () => ({ v: String(R.vocab.length), sub: 'different words', good: R.lateVariants <= 1, bad: R.lateVariants > 1 }) },
      { label: 'Mood read', get: () => ({ v: st.task !== 'mood' ? '–' : R.happyMood ? 'happy' : 'unhappy', sub: 'the customer is unhappy', good: st.task === 'mood' && !R.happyMood, bad: st.task === 'mood' && R.happyMood }) },
      { label: 'Stem check', get: () => ({ v: R.merge, sub: 'should stay apart', bad: st.reduce === 'hard', good: st.reduce !== 'hard' }) },
    ];
    const labels = [
      { name: 'line', t: 'Five stations', d: 'Each throws something away', icon: 'link', atV: V(-2.86, 0.2, 0.55) },
      { name: 'vocab', t: 'What is left', d: 'Tower: how many remain', icon: 'box', atV: V(2.8, 0.2, -0.45) },
    ];
    const reset = () => { Object.assign(st, { split: 'smart', reduce: 'lemma', stop: true, task: 'topic' }); draw(); };
    const breaks = [
      { label: 'Split on spaces only', hint: 'Punctuation sticks to words', on: () => { reset(); st.split = 'space'; draw(); }, off: reset },
      { label: 'A stemmer that cuts too hard', hint: 'Chop every ending it can', on: () => { reset(); st.reduce = 'hard'; draw(); }, off: reset },
      { label: 'Drop stopwords, then judge mood', hint: '"not" is a stopword', on: () => { reset(); st.task = 'mood'; draw(); }, off: reset },
    ];
    function status() {
      if (st.split === 'space') return { ok: false, msg: `<b>"late," is not "late".</b> Splitting on spaces leaves punctuation glued on, so "late," and "late" count as ${R.lateVariants} different words, and "happy!" and "today." carry their punctuation too. A tokeniser separates punctuation from words before anything is counted.` };
      if (st.task === 'mood' && st.stop) return { ok: false, msg: `<b>"Not happy" became "happy".</b> Standard stopword lists include "not", because it is common. That is harmless when looking for topics, but for judging mood it removes the one word that flips the meaning: the pipeline now reads this unhappy customer as happy. Keep negations for sentiment.` };
      if (st.reduce === 'hard') return { ok: false, msg: `<b>Different words, same stem.</b> A stemmer that chops every ending it can turns "university" and "universe" into the same "${stemHard('university')}", so a model can no longer tell them apart, while "were" and "was" stay different. Light stemming or lemmatisation keep words that differ in meaning apart.` };
      return { ok: true, msg: `<b>${R.vocab.length} clean words.</b> Lowercasing, a tokeniser that splits off punctuation, stopword removal and ${st.reduce === 'lemma' ? 'dictionary forms' : st.reduce === 'light' ? 'light stemming' : 'no reduction'} turn the message into ${R.words.join(', ')}${st.task === 'mood' ? ', and with "not" kept the mood reads correctly' : ''}.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A raw message', home: true, say: 'A customer writes to a bus company in Nairobi. Before a classical model can count words, the text needs cleaning.', act: m => m.set({ split: 'smart', reduce: 'none', stop: false, task: 'topic' }) },
    { t: 'Split it properly', home: true, say: 'Lowercase everything, then split into words and punctuation. Splitting on spaces alone glues full stops and commas onto words.', act: m => m.set({ split: 'space' }), wait: 3 },
    { t: 'Drop the common words', home: true, say: 'Stopword removal drops very common words like "the" and "was", which say little about the topic.', act: m => m.set({ split: 'smart', stop: true }), wait: 3 },
    { t: 'Stems and lemmas', home: true, say: 'Stemming chops endings by rule; lemmatisation looks up the dictionary form, so "were" becomes "be" and "buses" becomes "bus".', act: m => m.set({ reduce: 'lemma' }), wait: 3 },
    { t: 'Too sharp a knife', home: true, say: 'A stemmer that cuts too hard turns "university" and "universe" into the same stem.', act: m => m.set({ reduce: 'hard' }), wait: 3 },
    { t: 'Fit the task', home: true, say: 'And for judging mood, removing "not" turns "not happy" into "happy". Every step throws something away, so choose steps that suit the task.', act: m => m.set({ reduce: 'lemma', task: 'mood' }), wait: 3 },
  ],
  check: [
    { q: 'Why is splitting on spaces not enough?', options: ['Punctuation stays attached, so "late," and "late" count as different words', 'It is too slow', 'It removes capital letters'], answer: 0, why: 'A tokeniser separates punctuation.' },
    { q: 'What is the difference between stemming and lemmatisation?', options: ['Stemming chops endings by rule; lemmatisation finds the dictionary form', 'They are identical', 'Lemmatisation is always faster'], answer: 0, why: '"were" lemmatises to "be"; a stemmer cannot know that.' },
    { q: 'Why can removing stopwords hurt sentiment analysis?', options: ['Lists often include "not", which flips meaning', 'It makes messages longer', 'Stopwords carry the topic'], answer: 0, why: '"not happy" becomes "happy".' },
  ],
  terms: [
    ['Tokenisation', 'Splitting text into units such as words and punctuation.'],
    ['Stopwords', 'Very common words often removed before counting.'],
    ['Stemming', 'Cutting words to a stem by chopping endings with rules.'],
    ['Lemmatisation', 'Reducing words to their dictionary form.'],
    ['Normalisation', 'Making text uniform, such as lowercasing.'],
    ['Vocabulary', 'The set of distinct words left after processing.'],
  ],
  deeper: '<p><b>Other languages.</b> Swahili and many Bantu languages build long words from prefixes, so stems hide at the front as well as the back; Chinese and Japanese have no spaces at all. Tokenisers must be chosen per language.</p><p><b>Modern models</b> skip most of this: subword tokenisers keep every word and let the model learn what matters, which is why "not" survives in LLM inputs.</p><p><b>About this machine.</b> The pipeline runs on the message as shown; the lemma dictionary and stemmers are small rule sets.</p>',
  code: {
    title: 'A small preprocessing pipeline',
    note: 'Adapted from the course\'s text processing lesson.',
    text: `
import re

STOP = {"the", "were", "on", "was", "and", "i", "am", "are", "a", "to", "is"}   # keep "not" for sentiment
LEMMA = {"buses": "bus", "were": "be", "running": "run", "was": "be", "am": "be"}

def preprocess(text, remove_stop=True):
    tokens = re.findall(r"[a-z]+|[.,!?]", text.lower())     # split off punctuation
    words = [t for t in tokens if t.isalpha()]
    if remove_stop:
        words = [w for w in words if w not in STOP]
    return [LEMMA.get(w, w) for w in words]

print(preprocess("The buses were NOT running on time. I am not happy!"))
`,
  },
};
