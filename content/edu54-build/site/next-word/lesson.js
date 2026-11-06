// Next word and temperature: a tiny language model (word trigrams, trained here on a few hundred words) offers its next-word guesses
// as towers. Temperature reshapes the towers, top-k cuts the short ones, and Generate builds a sentence on a rail.
// Break it: temperature 0 (it loops), temperature far too high (nonsense).
const TEXT = `the market is busy today . the market is full of people . the market is quiet in the evening .
the rain is heavy today . the rain stopped in the evening . the rain made the road bad .
the bus is full today . the bus left the park early . the bus stopped at the market .
my mother went to the market . my mother cooked jollof rice . my mother sells tomatoes at the market .
the jollof rice is very sweet . the jollof rice is ready . we ate jollof rice in the evening .
the children went to school early . the children played football in the evening . the children are very happy today .
the traders count their money in the evening . the traders sell tomatoes and peppers . the traders are happy today .
we went to the market in the morning . we bought bread and tomatoes . we are very tired today .
the road is bad because of the rain . the road to the market is full of buses . the phone is ringing .
my phone is very old . my phone stopped in the evening . the light went off in the evening .
the generator is very loud . the light came back in the morning . the football match is today .`;
const toks = TEXT.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);
const tri = new Map(), bi = new Map();
for (let i = 0; i < toks.length - 1; i++) {
  const b = toks[i]; bi.set(b, bi.get(b) || new Map()); bi.get(b).set(toks[i + 1], (bi.get(b).get(toks[i + 1]) || 0) + 1);
  if (i < toks.length - 2) { const k = toks[i] + ' ' + toks[i + 1]; tri.set(k, tri.get(k) || new Map()); tri.get(k).set(toks[i + 2], (tri.get(k).get(toks[i + 2]) || 0) + 1); }
}
// counts for the next word after the last two words (falls back to the last word)
function counts(ctx) {
  const k = ctx.slice(-2).join(' ');
  return tri.get(k) || bi.get(ctx[ctx.length - 1]) || bi.get('the');
}
const PROMPTS = ['the market is', 'my mother', 'the rain', 'the children'];

export default {
  slug: 'next-word',
  title: 'Next word and temperature',
  description: 'A tiny language model offers its guesses for the next word as towers. Turn the temperature up and down, cut the short towers, and generate sentences. Then make it loop forever, or babble.',
  overview: 'A language model does one thing: given the words so far, it gives every possible next word a chance. Then one is picked, added, and it goes again. This one learned from a few hundred words of everyday sentences. Temperature decides how adventurous the pick is.',
  keywords: ['how chatgpt works', 'next token prediction', 'temperature llm', 'top k sampling', 'language model explained'],
  orient: 'any',
  view: { target: [0.1, 0.9, 0], dir: [0.45, 0.85, 1.3], half: 3.2, wide: 4.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { words: PROMPTS[0].split(' '), temp: 0.8, topk: 6, auto: false, seed: 1, picked: null };
    const rand = () => { st.seed = (st.seed * 16807) % 2147483647; return st.seed / 2147483647; };
    /* ---------- the sentence rail ---------- */
    const rail = P.box(7.4, 0.12, 0.7, '#3A3B44', { r: 0.08 }); rail.position.set(0, 0, 1.75); S.add(rail);
    const POOL = 14, wtiles = Array.from({ length: POOL }, () => { const t = P.tile('', 0.9, 0.22, 0.5, '#FFFFFF', { size: 0.15 }); t.visible = false; S.add(t); return t; });
    /* ---------- the towers ---------- */
    const MAXT = 8, towers = Array.from({ length: MAXT }, (_, k) => {
      const g = new THREE.Group(); g.position.set((k - 3.5) * 0.82, 0, -0.3); S.add(g);
      const b = P.box(0.58, 1, 0.58, C.plum, { r: 0.08 }); g.add(b);
      const w = S.text('', { size: 0.19, weight: 800, maxW: 0.78 }); w.position.set(0, 0.01, 0.55); g.add(w);
      const p = S.text('', { size: 0.15, face: 'cam', weight: 800, bg: 'rgba(255,255,255,.94)', color: C.ink, order: 6 }); p.userData.noFit = true; g.add(p);
      return { g, b, w, p };
    });
    const ctxT = S.text('', { size: 0.17, face: 'cam', weight: 700, bg: 'rgba(255,255,255,.95)', color: C.ink, order: 6 }); ctxT.position.set(0, 2.75, -0.3); ctxT.userData.noFit = true; S.add(ctxT);
    const pointer = P.arrow(V(), V(0, -1, 0), 0.05, C.gold); pointer.userData.noFit = true; S.add(pointer);
    // probabilities after temperature and top-k
    function dist() {
      const c = [...counts(st.words)].sort((a, b) => b[1] - a[1]);
      const logits = c.map(([, n]) => Math.log(n));
      let p;
      if (st.temp < 0.02) p = logits.map((_, i) => i === 0 ? 1 : 0);
      else { const m = Math.max(...logits), e = logits.map(l => Math.exp((l - m) / st.temp)), s = e.reduce((a, b) => a + b, 0); p = e.map(x => x / s); }
      let list = c.map(([w], i) => ({ w, p: p[i] }));
      // a very hot model also gives a little chance to every word it knows
      if (st.temp > 2.2) { const all = [...bi.keys()]; const extra = 0.5 * Math.min(1, (st.temp - 2.2) / 2); list = list.map(x => ({ ...x, p: x.p * (1 - extra) })).concat(all.filter(w => !c.find(x => x[0] === w)).map(w => ({ w, p: extra / all.length }))); }
      list.sort((a, b) => b.p - a.p);
      const kept = list.slice(0, st.topk), s = kept.reduce((a, b) => a + b.p, 0);
      return { shown: kept.map(x => ({ ...x, p: x.p / s })), all: list };
    }
    function draw() {
      const { shown } = dist();
      towers.forEach((T, k) => {
        const x = shown[k]; T.g.visible = !!x; if (!x) return;
        T.g.position.x = (k - (shown.length - 1) / 2) * 0.82;
        const h = 0.08 + x.p * 2.2; T.b.scale.y = h; T.p.position.set(0, h + 0.25, 0); T.p.userData.set(`${Math.round(x.p * 100)}%`);
        T.w.userData.set(x.w); T.b.material = P.mat(x.w === st.picked ? C.gold : C.plum);
      });
      const vis = st.words.slice(-POOL);
      let x = -3.6;
      wtiles.forEach((t, k) => {
        const w = vis[k]; t.visible = !!w; if (!w) return;
        const wd = Math.max(0.42, 0.14 + w.length * 0.1); t.userData.body.scale.x = wd / 0.9; if (t.userData.cur !== w) { t.userData.cur = w; t.userData.label.userData.style({ str: w, maxW: wd * 0.92 }); } t.position.set(x + wd / 2, 0.12, 1.75); x += wd + 0.06;
        t.userData.body.material = P.mat(k >= vis.length - 1 && st.picked ? '#FFE7A8' : '#FFFFFF');
        t.visible = x < 3.75;
      });
      ctxT.userData.set(`after "…${st.words.slice(-2).join(' ')}"`);
      const pi = shown.findIndex(s => s.w === st.picked);
      pointer.visible = pi >= 0;
      if (pi >= 0) { const T = towers[pi]; const top = T.b.scale.y; P.setArrow(pointer, V(T.g.position.x, top + 0.95, -0.3), V(T.g.position.x, top + 0.45, -0.3)); }
    }
    function pick() {
      const { shown } = dist();
      let r = rand(), w = shown[0].w;
      for (const x of shown) { if ((r -= x.p) <= 0) { w = x.w; break; } }
      st.picked = w; draw();
      st.words.push(w); if (st.words.length > 40) st.words = st.words.slice(-40);
      setTimeout(() => { st.picked = null; draw(); }, S.reduced ? 0 : 280);
      draw();
    }
    draw();
    let acc = 0;
    function update(dt) { if (!st.auto) return; acc += dt; if (acc > 0.9) { acc = 0; pick(); S.sync(); if (st.words.length > 34) st.auto = false; } }
    const start = i => { st.words = PROMPTS[i].split(' '); st.auto = false; st.picked = null; draw(); };
    const controls = [
      { type: 'buttons', label: 'Start with', options: PROMPTS, get: () => PROMPTS.indexOf(st.words.join(' ')), act: start },
      { type: 'button', label: 'Next word', act: () => { st.auto = false; pick(); } },
      { type: 'toggle', label: 'Keep going', get: () => st.auto, set: v => { st.auto = v; } },
      { type: 'slider', label: 'Temperature', min: 0, max: 4, step: 0.05, get: () => st.temp, set: v => { st.temp = v; draw(); }, hint: 'Low: safe and repetitive. High: adventurous, then nonsense' },
      { type: 'slider', label: 'Top-k: keep only the best', min: 1, max: 8, step: 1, get: () => st.topk, set: v => { st.topk = v; draw(); } },
    ];
    const ent = () => { const { shown } = dist(); return -shown.reduce((s, x) => s + (x.p > 0 ? x.p * Math.log2(x.p) : 0), 0); };
    const readouts = [
      { label: 'Top guess', get: () => { const { shown } = dist(); return { v: shown[0].w, sub: `${Math.round(shown[0].p * 100)}% sure` }; } },
      { label: 'Surprise', get: () => { const e = ent(); return { v: e.toFixed(1), sub: 'bits of choice', bar: Math.min(1, e / 3) }; }, bar: true },
    ];
    const labels = [
      { name: 'towers', t: 'Next-word guesses', d: 'Taller: more likely', icon: 'scale', at: () => towers[0].g.position.clone().add(V(-0.29, towers[0].b.scale.y * 0.55, 0.29)) },   // the tower's front corner, clear of its % chip
      { name: 'rail', t: 'The sentence so far', d: 'Each pick is added, then it guesses again', icon: 'link', atV: V(-1.5, 0.4, 1.75) },
      { name: 'context', t: 'What it looks at', d: 'The last two words', icon: 'eye', atV: V(0, 2.5, -0.3), phone: false },   // just under the bubble
    ];
    const breaks = [
      { label: 'Temperature 0', hint: 'Always the top guess', on: () => { st.temp = 0; st.topk = 6; start(0); st.auto = true; }, off: () => { st.temp = 0.8; start(0); } },
      { label: 'Temperature 4', hint: 'Every word is fair game', on: () => { st.temp = 4; st.topk = 8; start(0); st.auto = true; }, off: () => { st.temp = 0.8; st.topk = 6; start(0); } },
    ];
    const looping = () => { const w = st.words; if (w.length < 12) return false; const a = w.slice(-6).join(' '); return w.slice(0, -6).join(' ').includes(a); };
    function status() {
      if (st.temp < 0.02 && looping()) return { ok: false, msg: `<b>Stuck in a loop.</b> At temperature 0 it always takes the top guess, so the same words lead to the same words, forever. A little randomness breaks the circle.` };
      if (st.temp > 2.5 && st.words.length > 8) return { ok: false, msg: `<b>Babbling.</b> So hot that unlikely words get almost the same chance as good ones. The grammar falls apart. Most chat apps keep temperature between 0.2 and 1.` };
      if (st.temp < 0.02 && st.auto) return { ok: false, msg: `<b>Temperature 0: always the top guess.</b> With no randomness, the same words always lead to the same next word. Watch the sentence: it will start repeating itself.` };
      if (st.temp > 2.5 && st.auto) return { ok: false, msg: `<b>Temperature 4: every word is fair game.</b> The towers are flattened, so poor guesses get nearly the same chance as good ones. Watch the grammar fall apart.` };
      if (st.picked) return { msg: `<b>Picked "${st.picked}".</b> It's added to the sentence, and the model guesses again from the new last two words.` };
      return { msg: `<b>"${st.words.slice(-6).join(' ')}"</b>: the towers are its guesses for the next word. Press Next word, or Keep going. Temperature ${st.temp.toFixed(2)}.` };
    }
    return { update, controls, readouts, labels, breaks, status,
      reset: () => { Object.assign(st, { temp: 0.8, topk: 6, auto: false, seed: 1 }); start(0); },
      set: p => { Object.assign(st, p); draw(); }, start, go: () => { st.auto = true; } };
  },

  story: [
    { t: 'One job', home: true, say: 'A language model has one job. Given the words so far, give every possible next word a chance.', act: m => m.start(0) },
    { t: 'The guesses', focus: 'towers', zoom: 1.3, say: 'After "the market is", this model thinks "busy", "full" and "quiet" are all likely. It learned that by counting a few hundred words of everyday sentences.' },
    { t: 'Pick and repeat', focus: 'rail', zoom: 1.3, say: 'One word is picked at random, weighted by the towers. It joins the sentence, and the model guesses again. That is all a chatbot does, one token at a time.', act: m => { m.set({ temp: 0.8 }); m.go(); }, wait: 6 },
    { t: 'Turn it down', home: true, say: 'Temperature zero always takes the tallest tower. Safe, but it soon goes round in circles.', act: m => { m.start(0); m.set({ temp: 0 }); m.go(); }, wait: 7 },
    { t: 'Turn it up', home: true, say: 'High temperature flattens the towers. Rare words get a real chance, and soon the sentence makes no sense.', act: m => { m.start(0); m.set({ temp: 4, topk: 8 }); m.go(); }, wait: 7 },
    { t: 'Big models, same idea', home: true, say: 'Large models look at thousands of words, not two, and learned from trillions of words, not hundreds. But the loop is the same: guess, pick, add, repeat.', act: m => { m.start(1); m.set({ temp: 0.8, topk: 6 }); } },
  ],
  check: [
    { q: 'What does a language model produce at each step?', options: ['A whole answer', 'A chance for every possible next word', 'A translation'], answer: 1, why: 'It scores every possible next token. One is picked, added, and it goes again.' },
    { q: 'What does a temperature of 0 do?', options: ['Always picks the most likely word', 'Picks words at random', 'Stops the model'], answer: 0, why: 'It becomes greedy: always the top guess, which often repeats itself.' },
    { q: 'What does top-k = 3 do?', options: ['Keeps only the 3 most likely words to pick from', 'Writes 3 words at once', 'Triples the temperature'], answer: 0, why: 'Everything outside the best k is thrown away before picking.' },
  ],
  terms: [
    ['Language model', 'A program that gives a chance to every possible next word.'],
    ['Sampling', 'Picking the next word at random, weighted by those chances.'],
    ['Temperature', 'Sharpens (low) or flattens (high) the chances before picking.'],
    ['Top-k', 'Only the k most likely words may be picked.'],
    ['n-gram', 'A simple model that counts which word follows the last few words.'],
  ],
  deeper: '<p>This model only counts which word follows the last two words: an <b>n-gram</b> model, the kind phones used for predictive text. GPT-style models replace the counting with a transformer that reads the whole conversation, but they end the same way: a list of scores, a softmax with temperature, and a pick.</p><p><b>Top-p</b> (nucleus) sampling keeps the smallest set of words whose chances add up to p, say 90%, instead of a fixed k.</p>',
  code: {
    title: 'Temperature and top-k sampling',
    note: 'How the next word is picked from the model\'s scores.',
    text: `
import math, random

def sample(scores, temperature=0.8, top_k=6):
    # scores: {word: logit}
    if temperature == 0:
        return max(scores, key=scores.get)        # greedy
    items = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)[:top_k]
    m = max(s for _, s in items)
    weights = [math.exp((s - m) / temperature) for _, s in items]
    total = sum(weights)
    r = random.random() * total
    for (word, _), w in zip(items, weights):
        r -= w
        if r <= 0:
            return word
    return items[0][0]
`,
  },
};
