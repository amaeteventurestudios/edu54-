// Naive Bayes: an SMS spam filter. Each word is a weight on a balance: words seen more in spam tip it one way, words seen in ordinary
// messages tip it back. The filter adds the evidence of every word (in log space) on top of the starting tilt (how common spam is).
// Break it: a word never seen in spam (zero count, no smoothing: one word vetoes everything), multiply raw probabilities of a long message (underflow).
const TRAIN = {
  spam: ['you have won a prize claim now', 'free airtime claim your prize today', 'urgent send pin to claim cash', 'win cash now reply yes', 'congratulations you won free data', 'claim your free gift now', 'send money to win prize', 'free cash prize call now'],
  ham: ['see you at the market today', 'please send the report now', 'are you coming home for dinner', 'mama says call her today', 'the bus is late see you soon', 'can you send money for school fees', 'meeting moved to friday', 'thanks for the airtime yesterday'],
};
const tok = s => s.toLowerCase().split(/\s+/).filter(Boolean);
const COUNT = (() => { const c = { spam: {}, ham: {} }, n = { spam: 0, ham: 0 }; for (const k of ['spam', 'ham']) for (const m of TRAIN[k]) for (const w of tok(m)) { c[k][w] = (c[k][w] || 0) + 1; n[k]++; } return { c, n, vocab: new Set([...Object.keys(c.spam), ...Object.keys(c.ham)]) }; })();
const MESSAGES = ['claim your free prize now', 'please send money for school fees', 'free airtime see you at the market', 'congratulations you won tickets'];

export default {
  slug: 'naive-bayes',
  title: 'Naive Bayes: a spam filter from word counts',
  description: 'Each word in a text message is a small weight on a balance: "prize" and "claim" tip it towards spam, "market" and "mama" tip it back. Naive Bayes adds up every word\'s evidence on top of how common spam is. Then meet a word the filter has never seen in spam, and a message so long the numbers vanish.',
  overview: 'Naive Bayes classifies by counting. From labelled messages it learns how often each word appears in spam and in ordinary messages. For a new message it starts from how common spam is (the prior) and multiplies in each word\'s evidence, pretending the words are independent: that is the "naive" part. It is fast, needs little data and works surprisingly well for text. Two details matter: add a little to every count (smoothing) so an unseen word can\'t veto everything, and add logarithms instead of multiplying tiny probabilities.',
  keywords: ['naive bayes explained', 'spam filter', 'laplace smoothing', 'log probabilities', 'text classification'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.8, 0], dir: [0.12, 0.7, 1.45], half: 2.9, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { msg: 0, smooth: 1, log: true, long: false };
    /* ---------- the balance ---------- */
    const base = P.cyl(0.5, 0.12, '#5B4636'); S.add(base);
    const post = P.cyl(0.07, 1.55, '#8E91A3'); post.position.y = 0.12; S.add(post);
    const beam = new THREE.Group(); beam.position.y = 1.7; S.add(beam);
    const bar = P.box(4.6, 0.08, 0.14, '#2C2D31', { r: 0.03 }); bar.position.y = -0.04; beam.add(bar);
    const pans = [-1, 1].map(s => { const g = new THREE.Group(); g.position.x = s * 2.2; beam.add(g); const rods = [-0.25, 0.25].map(z => { const r = P.rod(V(0, 0, 0), V(0, -0.55, z * 0.6), 0.01, '#8E91A3'); g.add(r); return r; }); const pan = P.cyl(0.45, 0.06, s < 0 ? C.green : C.red, { seg: 28 }); pan.position.y = -0.6; g.add(pan); const t = S.text(s < 0 ? 'ORDINARY' : 'SPAM', { size: 0.13, weight: 800, color: '#FFFFFF', maxW: 0.8 }); t.position.y = -0.535; g.add(t); return g; });
    const needle = P.box(0.03, 0.4, 0.03, C.orange, { r: 0 }); needle.position.y = 0.2; beam.add(needle);
    /* ---------- the words as weights ---------- */
    const words = [...Array(14)].map(() => { const g = new THREE.Group(); g.userData.noFit = true; S.add(g); const m = new THREE.MeshLambertMaterial({ color: '#F7F5EE' }); const b = P.box(0.62, 0.22, 0.4, '#F7F5EE', { r: 0.04, material: m }); g.add(b); const t = S.text('', { size: 0.13, weight: 800, color: '#151827', maxW: 0.58 }); t.position.y = 0.225; g.add(t); const f = S.text('', { size: 0.13, face: 'front', weight: 800, color: '#151827', maxW: 0.58 }); f.position.set(0, 0.11, 0.205); g.add(f); return { g, m, t, f, b }; });
    const prior = P.box(0.5, 0.22, 0.3, C.gold, { r: 0.04 }); prior.userData.noFit = true; S.add(prior);
    const priorT = S.text('start: half of texts are spam', { size: 0.1, weight: 800, color: C.ink, bg: '#FFFFFF', face: 'cam', top: true, maxW: 2.2 }); priorT.userData.noFit = true; S.add(priorT);
    const msgT = S.text('', { size: 0.16, weight: 750, color: C.ink, bg: '#FFF6DA', face: 'cam', top: true, maxW: 4.6 }); msgT.position.set(0, 2.85, 0); msgT.userData.noFit = true; S.add(msgT);
    const resT = S.text('', { size: 0.15, weight: 800, color: '#FFFFFF', bg: C.ink, face: 'cam', top: true, maxW: 3 }); resT.position.set(0, 0.55, 0.7); resT.userData.noFit = true; S.add(resT);
    /* ---------- the sums ---------- */
    const V_N = COUNT.vocab.size;
    const pw = (w, k) => (((COUNT.c[k][w] || 0) + st.smooth) / (COUNT.n[k] + st.smooth * V_N));
    const text = () => st.long ? Array(120).fill(MESSAGES[st.msg]).join(' ') : MESSAGES[st.msg];
    function classify() {
      const ws = tok(text()), ev = ws.map(w => { const a = pw(w, 'spam'), b = pw(w, 'ham'); return { w, a, b, lr: (a > 0 && b > 0) ? Math.log(a / b) : a > 0 ? Infinity : b > 0 ? -Infinity : 0 }; });
      let logS = Math.log(0.5), logH = Math.log(0.5), pS = 0.5, pH = 0.5;
      for (const e of ev) { logS += Math.log(e.a); logH += Math.log(e.b); pS *= e.a; pH *= e.b; }
      const viaLog = 1 / (1 + Math.exp(logH - logS));
      const viaRaw = pS + pH > 0 ? pS / (pS + pH) : NaN;
      return { ev, p: st.log ? viaLog : viaRaw, pS, pH, logS, logH };
    }
    function update(dt, t) {
      const r = classify(), ev = r.ev.slice(0, 14), p = r.p;
      // tilt: spam side down when p is high
      const tilt = Number.isFinite(p) ? (p - 0.5) * 0.22 : 0;
      beam.rotation.z += (-tilt - beam.rotation.z) * Math.min(1, dt * 4);
      words.forEach((wd, i) => {
        const e = ev[i]; wd.g.visible = !!e; if (!e) return;
        // words stand in a row in front of the balance: spam-leaning ones on the right, ordinary ones on the left; taller = stronger evidence
        const side = e.lr > 0 ? 1 : -1, slot = ev.slice(0, i).filter(x => (x.lr > 0 ? 1 : -1) === side).length;
        const h = Math.max(0.5, Math.min(2.6, 0.6 + Math.abs(Number.isFinite(e.lr) ? e.lr : 3) * 0.7));
        wd.g.position.set(side * (0.55 + slot * 0.68), 0, 1.05);
        wd.b.scale.y = h; wd.t.position.y = 0.22 * h + 0.005; wd.f.position.y = 0.11 * h;   /* scale the block only: a text's own scale is its size */
        wd.t.userData.set(e.w); wd.f.userData.set(Number.isFinite(e.lr) ? `${e.lr > 0 ? '×' : '÷'}${Math.exp(Math.abs(e.lr)).toFixed(1)}` : e.lr > 0 ? 'only spam' : 'never spam');
        wd.m.color.set(!Number.isFinite(e.lr) ? '#F4A99F' : e.lr > 0 ? '#F6C59A' : '#BDE3C8');
      });
      const wp = new THREE.Vector3(); beam.getWorldPosition(wp);
      prior.position.set(0, 1.8, 0.2); priorT.position.set(-1.6, 2.45, 0.2);
      msgT.userData.set(`"${st.long ? MESSAGES[st.msg] + ' … (×120)' : MESSAGES[st.msg]}"`);
      resT.userData.set(Number.isFinite(p) ? `${Math.round(p * 100)}% spam` : '0 ÷ 0: no answer');
      resT.userData.style({ bg: !Number.isFinite(p) ? C.red : p > 0.5 ? '#A4462A' : '#2E7A4A' });
    }
    const controls = [
      { type: 'buttons', label: 'Message', options: MESSAGES.map(m => m.split(' ').slice(0, 3).join(' ') + '…'), get: () => st.msg, act: i => { st.msg = i; } },
      { type: 'toggle', label: 'Smoothing (add 1 to every count)', short: 'Smoothing', get: () => st.smooth > 0, set: v => { st.smooth = v ? 1 : 0; } },
      { type: 'toggle', label: 'Add logarithms (not multiply)', short: 'Logs', get: () => st.log, set: v => { st.log = v; }, quick: false },
      { type: 'toggle', label: 'A very long message (×120)', short: 'Long text', get: () => st.long, set: v => { st.long = v; }, quick: false },
    ];
    const readouts = [
      { label: 'Chance it is spam', get: () => { const p = classify().p; return { v: Number.isFinite(p) ? `${Math.round(p * 100)}%` : 'NaN', bad: !Number.isFinite(p), bar: Number.isFinite(p) ? p : 0 }; }, bar: true },
      { label: 'Raw product for spam', get: () => { const r = classify(); return { v: r.pS === 0 ? '0 (underflow)' : r.pS.toExponential(1), bad: r.pS === 0 }; } },
    ];
    const labels = [
      { name: 'balance', t: 'Spam or not', d: 'The balance tips towards the stronger evidence', icon: 'scale', atV: V(0, 1.7, 0.1) },
      { name: 'spam', t: 'Spam words', d: 'Taller: multiplies the odds of spam more', icon: 'spark', atV: V(2.65, 0.1, 1.05) },
      { name: 'ham', t: 'Ordinary words', d: 'Taller: divides the odds down more', icon: 'check', atV: V(-2.65, 0.1, 1.05) },
      { name: 'prior', t: 'Where it starts', d: 'How common spam is overall', icon: 'info', atV: V(-0.25, 1.8, 0.2) },
    ];
    const reset = () => { Object.assign(st, { msg: 0, smooth: 1, log: true, long: false }); };
    const breaks = [
      { label: 'No smoothing', hint: 'A word never seen in spam', on: () => { reset(); st.smooth = 0; st.msg = 2; }, off: reset },
      { label: 'Multiply raw probabilities', hint: 'On a very long message', on: () => { reset(); st.log = false; st.long = true; }, off: reset },
    ];
    function status() {
      const r = classify(), p = r.p, top = [...r.ev].filter(e => Number.isFinite(e.lr)).sort((a, b) => Math.abs(b.lr) - Math.abs(a.lr))[0];
      if (!st.log && !Number.isFinite(p)) return { ok: false, msg: `<b>The numbers vanished.</b> Multiplying ${r.ev.length} small chances gives far less than 10 to the minus 300 for both spam and not-spam, smaller than the computer can hold, so both round to 0 and 0 ÷ 0 has no answer. Adding logarithms instead keeps every number a sensible size (about ${Math.round(r.logS)}).` };
      if (st.smooth === 0 && r.ev.some(e => !Number.isFinite(e.lr))) { const bad = r.ev.find(e => !Number.isFinite(e.lr)); return { ok: false, msg: `<b>One word vetoed everything.</b> "${bad.w}" never appeared in the ${bad.lr > 0 ? 'ordinary' : 'spam'} examples, so its chance there is exactly 0, and multiplying by 0 wipes out every other word's evidence: ${Math.round(p * 100)}% spam. Adding 1 to every count (smoothing) gives unseen words a small, sensible chance.` }; }
      return { ok: true, msg: `<b>${Math.round(p * 100)}% spam.</b> Starting from half and half, each word multiplies the odds by how much more often it appears in spam than in ordinary texts${top ? `; the strongest here is "${top.w}" (${top.lr > 0 ? '×' : '÷'}${Math.exp(Math.abs(top.lr)).toFixed(1)})` : ''}. The words are treated as independent, which is naive, but works well.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => Object.assign(st, p) };
  },

  story: [
    { t: 'Spam or not?', home: true, say: 'A text message arrives: claim your free prize now. Is it spam? The filter learned from a few hundred labelled messages, counting how often each word appeared in each kind.', act: m => m.reset() },
    { t: 'Where it starts', focus: 'prior', zoom: 1.3, say: 'Before reading a single word, it starts from how common spam is. Here, half of all texts.' },
    { t: 'Every word is evidence', home: true, say: 'Then each word tips the balance. Prize and claim appear far more in spam, so they multiply the odds of spam. Your and now are nearly neutral.', wait: 5 },
    { t: 'Ordinary words', home: true, say: 'A message about school fees has words that appear in ordinary texts: please, school, fees. They tip the balance back.', act: m => m.set({ msg: 1 }), wait: 5 },
    { t: 'Smoothing', home: true, say: 'If a word never appeared in spam, its count there is zero, and multiplying by zero wipes out all the other evidence. Adding one to every count fixes it. That is smoothing.', act: m => m.set({ msg: 2, smooth: 0 }), wait: 6 },
    { t: 'Add, don\'t multiply', home: true, say: 'And on long messages, multiplying hundreds of small chances shrinks to nothing. Real filters add logarithms instead.', act: m => m.set({ msg: 0, smooth: 1, log: false, long: true }), wait: 5 },
  ],
  check: [
    { q: 'Why is Naive Bayes called "naive"?', options: ['It treats every word as independent of the others', 'It uses very little memory', 'It ignores word counts'], answer: 0, why: 'Real words depend on each other, but the simplification works surprisingly well.' },
    { q: 'A word never appeared in spam during training. Without smoothing, what happens?', options: ['Its zero chance wipes out all other evidence', 'Nothing', 'The word is ignored'], answer: 0, why: 'Multiplying by zero gives zero. Laplace smoothing adds a small count to every word.' },
    { q: 'Why add logarithms instead of multiplying probabilities?', options: ['Products of many small numbers underflow to zero', 'Logs are more accurate words', 'It is required by law'], answer: 0, why: 'Sums of logs stay a sensible size even for very long texts.' },
  ],
  terms: [
    ['Prior', 'How common each class is before looking at the message.'],
    ['Likelihood', 'How often a word appears in each class.'],
    ['Naive assumption', 'Treating the words as independent given the class.'],
    ['Laplace smoothing', 'Adding a small count (often 1) to every word so none has zero chance.'],
    ['Log probability', 'The logarithm of a chance; adding them replaces multiplying chances.'],
  ],
  deeper: '<p><b>Still useful.</b> Naive Bayes trains in one pass over the data, handles huge vocabularies and needs few examples. It is a strong first baseline for any text classification task.</p><p><b>Mixed languages.</b> Texts in East Africa often mix Swahili and English, West African ones Pidgin and English. Naive Bayes doesn\'t care: every token is just a word with counts, so mixed messages work as long as the training data has them.</p><p><b>Variants.</b> Multinomial Naive Bayes counts words; Bernoulli only notes whether each word is present; Gaussian Naive Bayes handles numbers.</p>',
  code: {
    title: 'A spam filter with Naive Bayes',
    note: 'Adapted from the course\'s Naive Bayes lesson.',
    text: `
import math
from collections import Counter

def train(messages):            # messages: list of (text, is_spam)
    counts = {True: Counter(), False: Counter()}
    docs = Counter()
    for text, spam in messages:
        counts[spam].update(text.lower().split())
        docs[spam] += 1
    return counts, docs

def spam_chance(model, text, alpha=1):
    counts, docs = model
    vocab = set(counts[True]) | set(counts[False])
    score = {}
    for c in (True, False):
        total = sum(counts[c].values())
        score[c] = math.log(docs[c] / sum(docs.values()))          # the prior
        for w in text.lower().split():
            score[c] += math.log((counts[c][w] + alpha) / (total + alpha * len(vocab)))
    return 1 / (1 + math.exp(score[False] - score[True]))
`,
  },
};
