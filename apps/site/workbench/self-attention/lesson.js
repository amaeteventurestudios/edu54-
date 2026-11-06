// Self-attention: the words of "The bus left the park because it was full" ride in an open-top danfo. Pick a word and gold strings
// show how much it looks at every other word: softmax(q·k / √d). Swap "full" for "closed" and "it" switches from the bus to the park.
// Break it: forget to divide by √d, every word the same.
const WORDS = ['The', 'bus', 'left', 'the', 'park', 'because', 'it', 'was', 'full'];
// keys and queries: four features [vehicle, place, action, small word]
const KEY = { The: [0, 0, 0, 1], bus: [3, 0, 0, 0], left: [0, 0, 2, 0], the: [0, 0, 0, 1], park: [0, 3, 0, 0], because: [0, 0, 0.5, 1], it: [1, 1, 0, 0.5], was: [0, 0, 1, 0.5], full: [1.5, 0, 0.5, 0], closed: [0, 1.5, 0.5, 0] };
function query(w, last) {
  const toVehicle = last === 'full';
  return {
    The: [0.3, 0.3, 0, 0.6], bus: [0, 0, 1.6, 0.3], left: [1.6, 0.6, 0, 0], the: [0.3, 0.3, 0, 0.6], park: [0, 0, 1.6, 0.3], because: [0, 0, 1.2, 0.4],
    it: toVehicle ? [3.2, 0.2, 0, 0] : [0.2, 3.2, 0, 0], was: [1, 1, 0, 0.3], full: [3, 0.3, 0, 0], closed: [0.3, 3, 0, 0],
  }[w];
}
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

export default {
  slug: 'self-attention',
  title: 'Self-attention',
  description: 'Board a danfo (a matatu in Nairobi, a trotro in Accra) where every word is a passenger. Pick one and see who it looks at. Change one word at the end of the sentence and "it" switches from the bus to the park.',
  overview: 'In "The bus left the park because it was full", what is "it"? You know it is the bus. Change "full" to "closed" and it becomes the park. Self-attention is how a transformer works this out: every word asks a question (its query), every word offers a label (its key), and the matches decide who listens to whom.',
  keywords: ['self attention explained', 'attention is all you need', 'query key value', 'transformer attention', 'softmax'],
  orient: 'landscape',
  view: { target: [0, 0.6, 0.55], dir: [0.3, 1.25, 1.2], half: 3.3, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { q: 6, last: 'full', scale: true, mask: false, same: false };
    const words = () => [...WORDS.slice(0, 8), st.last];
    /* ---------- the danfo: open-top so we can see the passengers ---------- */
    const L = 6.6, Wd = 1.5, H = 0.62, YEL = '#F2B705';
    const bus = new THREE.Group(); S.add(bus);
    const floor = P.box(L, 0.16, Wd, '#3A3B44', { r: 0.12 }); floor.position.y = 0.32; bus.add(floor);
    for (const z of [-Wd / 2 + 0.05, Wd / 2 - 0.05]) {
      const wall = P.box(L, H, 0.1, YEL, { r: 0.04 }); wall.position.set(0, 0.48, z); bus.add(wall);
      const stripe = P.box(L + 0.02, 0.08, 0.12, '#1A1A1A', { r: 0 }); stripe.position.set(0, 0.72, z); bus.add(stripe);
    }
    for (const x of [-L / 2 + 0.05, L / 2 - 0.05]) { const end = P.box(0.1, H, Wd, YEL, { r: 0.04 }); end.position.set(x, 0.48, 0); bus.add(end); }
    const hood = P.box(0.6, 0.5, Wd, YEL, { r: 0.12 }); hood.position.set(L / 2 + 0.25, 0.32, 0); bus.add(hood);
    for (const x of [-L / 2 + 0.9, L / 2 - 0.9]) for (const z of [-Wd / 2, Wd / 2]) { const w = P.cyl(0.28, 0.2, '#1A1A1A'); w.rotation.x = Math.PI / 2; w.position.set(x, 0.28, z + (z > 0 ? -0.1 : 0.1) * -1); bus.add(w); }
    const plate = S.text('DANFO', { size: 0.12, face: 'front', weight: 800, color: '#1A1A1A' }); plate.position.set(0, 0.62, Wd / 2 + 0.02); bus.add(plate);
    /* ---------- the passengers: one word each ---------- */
    const step = (L - 0.5) / 9, x0 = -L / 2 + 0.25 + step / 2;
    const tiles = WORDS.map((w, i) => {
      const t = P.tile(w, step - 0.08, 0.32, 0.6, '#FFFFFF', { size: 0.17 }); t.position.set(x0 + i * step, 0.4, -0.12); bus.add(t);
      S.tap(t.userData.body, () => { st.q = i; draw(); S.sync(); });
      return t;
    });
    const top = i => V(x0 + i * step, 0.78, -0.12);
    /* ---------- strings from the chosen word to every word ---------- */
    let strings = [];
    const pcts = WORDS.map(() => { const t = S.text('', { size: 0.15, face: 'cam', weight: 750, bg: 'rgba(255,255,255,.94)', color: C.ink, order: 6 }); t.userData.noFit = true; S.add(t); return t; });
    /* ---------- the whole pattern: a grid, one row per word ---------- */
    const G = 9, cell = 0.27;
    const heat = P.grid(G, G, cell, { h: 0.04, gap: 0.03 }); heat.mesh.position.set(-0.1, 0, 2.15); S.add(heat.mesh);
    const hl = S.text('who looks at whom', { size: 0.15, weight: 700 }); hl.position.set(-0.1, 0.01, 2.15 + G * cell / 2 + 0.22); S.add(hl);
    function weights(i) {
      const ws = words(), d = 4;
      const qi = st.same ? [1, 1, 1, 1] : query(ws[i], st.last);
      const sc = ws.map((w, j) => (st.mask && j > i) ? -Infinity : dot(qi, st.same ? [1, 1, 1, 1] : KEY[w]) / (st.scale ? Math.sqrt(d) : 1 / Math.sqrt(16)));
      const mx = Math.max(...sc), ex = sc.map(s => s === -Infinity ? 0 : Math.exp(s - mx)), sum = ex.reduce((a, b) => a + b, 0);
      return ex.map(e => e / sum);
    }
    const gold = new THREE.Color(C.gold), pale = new THREE.Color('#ECE8DD'), sel = new THREE.Color(C.orange), tmp = new THREE.Color();
    function draw() {
      tiles[8].userData.label.userData.set(st.last);
      const w = weights(st.q);
      for (const s of strings) { S.root.remove(s); s.geometry.dispose(); }
      strings = [];
      w.forEach((a, j) => {
        pcts[j].visible = a > 0.015; pcts[j].userData.set(`${Math.round(a * 100)}%`); pcts[j].position.copy(top(j)).add(V(0, 0.18, 0.5));
        if (j === st.q || a < 0.01) return;
        const p0 = top(st.q), p1 = top(j), mid = p0.clone().lerp(p1, 0.5); mid.y += 0.35 + Math.abs(j - st.q) * 0.22;
        const s = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(p0, mid, p1), 28, 0.012 + a * 0.085, 8), P.mat(C.gold, { emissive: '#5A3C00' }));
        s.userData.noFit = true; S.add(s); strings.push(s);
      });
      tiles.forEach((t, i) => { t.userData.body.material = P.mat(i === st.q ? C.orange : '#FFFFFF'); t.position.y = i === st.q ? 0.48 : 0.4; });
      for (let i = 0; i < G; i++) { const r = weights(i); for (let j = 0; j < G; j++) heat.set(j, i, { h: 0.04 + r[j] * 0.9, color: tmp.copy(pale).lerp(i === st.q ? sel : gold, Math.min(1, r[j] * 1.6)) }); }
      heat.commit();
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Which word is asking?', options: WORDS.slice(0, 8).concat('last'), get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'toggle', label: 'Last word: closed (not full)', short: 'full ↔ closed', get: () => st.last === 'closed', set: v => { st.last = v ? 'closed' : 'full'; draw(); } },
      { type: 'toggle', label: 'Only look back (causal mask)', short: 'Mask', get: () => st.mask, set: v => { st.mask = v; draw(); }, hint: 'How GPT-style models read: no peeking at later words' },
    ];
    const top3 = () => { const w = weights(st.q); return w.map((a, j) => [a, j]).filter(([, j]) => j !== st.q).sort((a, b) => b[0] - a[0]); };
    const readouts = [
      { label: `"${WORDS[6]}" looks at`, get: () => { const w = weights(6), b = w[1], p = w[4]; return { v: b > p ? 'the bus' : 'the park', sub: `bus ${Math.round(b * 100)}% · park ${Math.round(p * 100)}%` }; } },
      { label: 'Strongest link', get: () => { const [a, j] = top3()[0]; return { v: `${words()[st.q]} → ${words()[j]}`, sub: `${Math.round(a * 100)}%` }; } },
    ];
    const labels = [
      { name: 'asker', t: 'The asking word', d: 'Its query: what am I looking for?', icon: 'target', at: () => top(st.q).add(V(0, 0.1, 0)) },
      { name: 'strings', t: 'Attention', d: 'Thicker string: it listens more', icon: 'link', at: () => { const j = top3()[0][1]; const m = top(st.q).lerp(top(j), 0.5); m.y += 0.35 + Math.abs(j - st.q) * 0.22; return m; } },
      { name: 'grid', t: 'Every word at once', d: 'One row per asking word', icon: 'box', atV: V(-0.1 + G * cell / 2, 0.4, 2.15) },
      { name: 'last', t: 'One word changes everything', d: 'full or closed', icon: 'spark', at: () => top(8), phone: false },
    ];
    const breaks = [
      { label: 'Forget to divide by √d', hint: 'Scores 8× too big, as with 64 numbers per word', on: () => { st.scale = false; draw(); }, off: () => { st.scale = true; draw(); } },
      { label: 'Every word asks the same thing', hint: 'No learned queries or keys', on: () => { st.same = true; draw(); }, off: () => { st.same = false; draw(); } },
    ];
    function status() {
      const ws = words(), w = weights(st.q), [[a, j]] = top3();
      if (!st.scale) return { ok: false, msg: `<b>All or nothing.</b> Without dividing by √d the scores are huge, so softmax gives almost everything to one word (${Math.round(Math.max(...w) * 100)}%) and nothing to the rest. Learning stalls, because the other words get no signal at all.` };
      if (st.same) return { ok: false, msg: `<b>Everyone listens to everyone equally.</b> With identical queries and keys every score is the same, so each word gets ${Math.round(100 / 9)}%. Nothing is understood. The queries and keys are what training learns.` };
      if (st.mask && st.q === 6) return { msg: `<b>"it" can't see "${st.last}" yet</b>, because that word comes later. In GPT-style models the later word does the linking: pick "last" to see it look back at the ${st.last === 'full' ? 'bus' : 'park'}.` };
      if (st.q === 6) return { ok: true, msg: `<b>"it" → ${st.last === 'full' ? 'the bus' : 'the park'} (${Math.round(a * 100)}%).</b> Its query matches the ${st.last === 'full' ? 'bus\'s' : 'park\'s'} key best. Flip full ↔ closed and watch the strings move.` };
      return { msg: `<b>"${ws[st.q]}"</b> listens most to "${ws[j]}" (${Math.round(a * 100)}%). Each score is query · key ÷ √d; softmax turns the scores into shares that add up to 100%.` };
    }
    return { update: () => { }, controls, readouts, labels, breaks, status,
      reset: () => { Object.assign(st, { q: 6, last: 'full', scale: true, mask: false, same: false }); draw(); },
      set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'What is "it"?', home: true, say: 'The bus left the park because it was full. You know "it" means the bus. How would a machine know?', act: m => m.set({ q: 6, last: 'full' }) },
    { t: 'Every word asks', focus: 'asker', zoom: 1.4, say: 'In self-attention, every word sends out a question, called a query. "It" is asking: which thing in this sentence could be full?' },
    { t: 'Every word answers', home: true, say: 'Every word also carries a label, called a key. The bus\'s key says vehicle. The park\'s key says place. Query times key gives a score for each pair.' },
    { t: 'Scores become shares', focus: 'strings', zoom: 1.3, say: 'The scores are divided by the square root of the size, then softmax turns them into shares that add up to one hundred percent. Thick gold string: it listens a lot.' },
    { t: 'Change one word', home: true, say: 'Now change full to closed. A park can be closed, a bus usually isn\'t. "It" now points to the park.', act: m => m.set({ last: 'closed' }), wait: 5 },
    { t: 'All at once', focus: 'grid', zoom: 1.3, say: 'Every word does this at the same time. The grid shows the whole pattern, one row per word. A transformer runs dozens of these layers, and that is how it keeps track of meaning.', act: m => m.set({ last: 'full' }) },
  ],
  check: [
    { q: 'In self-attention, what decides how much one word listens to another?', options: ['How close they sit', 'How well the first word\'s query matches the other\'s key', 'Alphabetical order'], answer: 1, why: 'Score = query · key (÷ √d), then softmax turns scores into shares.' },
    { q: 'Why divide the scores by √d?', options: ['To keep them small enough that softmax doesn\'t give everything to one word', 'To make them negative', 'To save memory'], answer: 0, why: 'Long vectors give big scores. Dividing keeps softmax soft, so learning signals reach every word.' },
    { q: 'What does the causal mask do?', options: ['Hides the first word', 'Stops a word from looking at later words', 'Makes every word look the same'], answer: 1, why: 'A model that predicts the next word must not peek at it, so each word only looks back.' },
  ],
  terms: [
    ['Query', 'What a word is looking for.'],
    ['Key', 'What a word offers to others.'],
    ['Value', 'The information a word passes on to those who listen to it.'],
    ['Softmax', 'Turns a list of scores into shares that add up to 1.'],
    ['Causal mask', 'Blocks attention to later words, so a model can\'t see the future.'],
  ],
  deeper: '<p>Each word\'s query, key and value come from multiplying its embedding by three learned matrices. The output for each word is the values of all the words, mixed in the shares the attention gives. Here we wrote the queries and keys by hand to keep the numbers small; in a real model, earlier layers have already mixed "full" into "it" before a layer like this one links it to the bus.</p>',
  code: {
    title: 'Scaled dot-product attention',
    note: 'From the course\'s self_attention.py.',
    text: `
import numpy as np

def softmax(x):
    x = x - np.max(x, axis=-1, keepdims=True)
    e = np.exp(x)
    return e / e.sum(axis=-1, keepdims=True)

def attention(Q, K, V, causal=False):
    d = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d)        # every query against every key
    if causal:                           # no peeking at later words
        n = scores.shape[0]
        scores = scores + np.triu(np.full((n, n), -np.inf), 1)
    weights = softmax(scores)            # shares that add up to 1
    return weights @ V, weights
`,
  },
};
