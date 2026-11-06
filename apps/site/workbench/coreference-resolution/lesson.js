// Coreference: a short news item about a coffee cooperative in Huye, Rwanda. Every mention is a tile; arcs link each mention to the earlier one it refers to,
// and tiles take their cluster's colour. Resolvers are rules computed live (the agreement resolver stands in for a trained model); MUC and B-cubed scores
// are computed against the gold clusters. It never guesses gender from a name: "she" and "he" only need a person.
// Break it: link each pronoun to the nearest mention (no agreement), look back within the sentence only, make no links at all (B-cubed still looks fair, MUC is zero).
const SENT = [
  [['m', 0], ' manages ', ['m', 1], '.'],
  [['m', 2], ' told ', ['m', 3], ' that ', ['m', 4], ' will buy cherries early.'],
  [['m', 5], ' expects a big harvest, and ', ['m', 6], ' members are pleased.'],
  [['m', 7], ', ', ['m', 8], ', said ', ['m', 9], ' would sell to ', ['m', 10], '.'],
];
const M = [
  { t: 'Uwase', kind: 'name', a: 'person', s: 0, g: 'A' },
  { t: 'the Huye coffee cooperative', kind: 'noun', a: 'org', head: 'cooperative', s: 0, g: 'B' },
  { t: 'She', kind: 'pron', a: 'person', s: 1, g: 'A' },
  { t: 'farmers', kind: 'noun', a: 'group', head: 'farmers', s: 1, g: 'C' },
  { t: 'it', kind: 'pron', a: 'org', s: 1, g: 'B' },
  { t: 'The cooperative', kind: 'noun', a: 'org', head: 'cooperative', s: 2, g: 'B' },
  { t: 'its', kind: 'pron', a: 'org', s: 2, g: 'B' },
  { t: 'Mugisha', kind: 'name', a: 'person', s: 3, g: 'D' },
  { t: 'a farmer', kind: 'noun', a: 'person', appos: true, s: 3, g: 'D' },
  { t: 'he', kind: 'pron', a: 'person', s: 3, g: 'D' },
  { t: 'the cooperative', kind: 'noun', a: 'org', head: 'cooperative', s: 3, g: 'B' },
];
function resolve(mode) {
  return M.map((m, i) => {
    if (mode === 3) return -1;
    const prev = M.map((p, j) => ({ ...p, j })).slice(0, i).reverse().filter(p => mode !== 2 || p.s === m.s);
    if (m.appos) { const p = prev.find(p => p.s === m.s && p.kind === 'name'); return p ? p.j : -1; }   // "Mugisha, a farmer,": an appositive renames what it follows
    if (m.kind === 'noun') { const p = prev.find(p => p.head && p.head === m.head); return p ? p.j : -1; }   // same head noun
    if (m.kind === 'pron') { const p = mode === 1 ? prev[0] : prev.find(p => p.a === m.a); return p ? p.j : -1; }   // nearest mention, or nearest that agrees
    return -1;
  });
}
function clusters(links) { const c = M.map((_, i) => i); const f = i => (c[i] === i ? i : (c[i] = f(c[i]))); links.forEach((a, i) => { if (a >= 0) c[f(i)] = f(a); }); return M.map((_, i) => f(i)); }
function scores(cl) {
  const key = {}, rsp = {}; M.forEach((m, i) => { (key[m.g] = key[m.g] || []).push(i); (rsp[cl[i]] = rsp[cl[i]] || []).push(i); });
  const K = Object.values(key), R = Object.values(rsp), part = (A, B) => A.reduce((s, a) => s + new Set(a.map(i => B.findIndex(b => b.includes(i)))).size, 0);
  const mr = K.reduce((s, k) => s + k.length - 1, 0), mp = R.reduce((s, r) => s + r.length - 1, 0);
  const mucR = mr ? (mr - (part(K, R) - K.length)) / mr : 0, mucP = mp ? (mp - (part(R, K) - R.length)) / mp : 0;
  const muc = mucR + mucP ? 2 * mucR * mucP / (mucR + mucP) : 0;
  let bp = 0, br = 0; M.forEach((m, i) => { const k = K.find(x => x.includes(i)), r = R.find(x => x.includes(i)), both = r.filter(j => k.includes(j)).length; bp += both / r.length; br += both / k.length; });
  bp /= M.length; br /= M.length; const b3 = 2 * bp * br / (bp + br);
  return { muc, b3, mucR, mucP, bp, br };
}

export default {
  slug: 'coreference-resolution',
  title: 'Coreference: who is "she"?',
  description: 'A short news item about a coffee cooperative in Huye, Rwanda, says "she", "it" and "he". Arcs link each mention back; one bad link joins two different people.',
  overview: 'Coreference resolution groups every expression that refers to the same thing: a name, a description like "the cooperative", and pronouns like "she", "it" and "its". Without it, information extraction misses most mentions and a question like "who did she tell?" cannot be answered. Classic rules link a pronoun to the nearest earlier mention that agrees with it in number and kind; descriptions link to earlier mentions with the same head noun; appositives rename what they follow. Modern systems score every candidate span and antecedent with a transformer. Scoring needs several metrics: MUC counts the links a system gets right and gives zero to a system that links nothing, while B-cubed scores each mention and can still look fair for that same useless system. Long documents and rare referents remain hard.',
  keywords: ['coreference resolution', 'anaphora', 'pronoun resolution', 'muc', 'b-cubed', 'mention clustering'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, -0.3], dir: [0.05, 1.05, 1.0], half: 1.05, wide: 5.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { mode: 0 };
    const CC = { A: '#C2185B', B: '#1F9E89', C: '#E07B39', D: '#3B3F8F' };
    /* four sentences as rows on the floor: a tile for each mention */
    const RZ = s => -1.1 + s * 0.48, tiles = [];
    SENT.forEach((seg, s) => {
      const ms = seg.filter(x => Array.isArray(x)), step = 5.4 / (ms.length + 1);
      const rail = P.box(5.4, 0.03, 0.3, '#E4DED2', { r: 0.02 }); rail.position.set(0, 0, RZ(s)); S.add(rail);
      ms.forEach((g, k) => { const i = g[1], w = Math.min(1.1, 0.26 + M[i].t.length * 0.04), mm = new THREE.MeshLambertMaterial({ color: '#DDD6C6' }), x = -2.7 + (k + 1) * step, b = P.box(w, 0.14, 0.24, '#fff', { r: 0.03, material: mm }); b.position.set(x, 0.03, RZ(s)); S.add(b); tiles[i] = { mm, x, z: RZ(s) }; });
    });
    /* arcs from each mention back to its antecedent, bowing up */
    const arcs = M.map(() => { const mm = new THREE.MeshBasicMaterial({ color: C.teal }), a = P.tube([V(0, 0, 0), V(0.1, 0, 0)], 0.014, C.teal, { material: mm }); a.userData.noFit = true; S.add(a); const h = P.ball(0.04, C.teal); h.material = mm; h.userData.noFit = true; S.add(h); return { a, h, mm }; });
    const setArc = (A, i, j, col) => { const p = tiles[i], q = tiles[j], a = V(p.x, 0.17, p.z), b = V(q.x, 0.17, q.z), d = a.distanceTo(b);
      const mid = a.clone().lerp(b, 0.5).add(V(0, 0.22 + d * 0.16, 0));
      A.a.geometry.dispose(); A.a.geometry = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 24, 0.014, 8, false); A.mm.color.set(col); A.h.position.copy(b); };
    S.add(P.keep(-2.85, 2.85, 0.9, -1.3, 0.5));

    let L = [], CL = [], SC = null;
    function draw() {
      L = resolve(st.mode); CL = clusters(L); SC = scores(CL);
      const firstOf = {}; CL.forEach((c, i) => { if (firstOf[c] == null) firstOf[c] = i; });
      M.forEach((m, i) => { const root = firstOf[CL[i]], size = CL.filter(c => c === CL[i]).length;
        tiles[i].mm.color.set(size > 1 ? CC[M[root].g] : '#B5AE9F');
        const A = arcs[i], on = L[i] >= 0; A.a.visible = on; A.h.visible = on;
        if (on) setArc(A, i, L[i], M[L[i]].g === m.g ? CC[m.g] : '#D64545'); });
    }
    draw();
    const wrong = () => L.filter((a, i) => a >= 0 && M[a].g !== M[i].g).length;
    const controls = [
      { type: 'buttons', label: 'Resolver', options: ['Agreement', 'Nearest word', 'Same sentence', 'No links'], get: () => st.mode, act: i => { st.mode = i; draw(); } },
    ];
    const readouts = [
      { label: 'MUC F1', get: () => ({ v: SC.muc.toFixed(2), sub: 'counts correct links', good: SC.muc > 0.95, bad: SC.muc < 0.6 }) },
      { label: 'B³ F1', get: () => ({ v: SC.b3.toFixed(2), sub: 'scores each mention' }) },
      { label: 'Wrong links', get: () => ({ v: String(wrong()), sub: 'red arcs', bad: wrong() > 0, good: wrong() === 0 && st.mode !== 3 }) },
    ];
    const labels = [
      { name: 'tiles', t: 'Mentions', d: 'One colour per entity, grey alone', icon: 'book', atV: V(-2.7, 0.05, -0.62) },
      { name: 'arcs', t: 'Links back', d: 'Red: a wrong link', icon: 'link', atV: V(2.7, 0.05, -0.14) },
    ];
    const reset = () => { st.mode = 0; draw(); };
    const breaks = [
      { label: 'Nearest word', hint: 'No agreement check', on: () => { st.mode = 1; draw(); }, off: reset },
      { label: 'Same sentence only', hint: 'No looking back', on: () => { st.mode = 2; draw(); }, off: reset },
      { label: 'No links at all', hint: 'Every mention alone', on: () => { st.mode = 3; draw(); }, off: reset },
    ];
    function status() {
      const w = wrong();
      if (st.mode === 1) return { ok: false, msg: `<b>"She" became the cooperative.</b> Linking each pronoun to the nearest mention ignores whether it fits: "She" links to "the Huye coffee cooperative" and "it" to "farmers". ${w} links are wrong, so separate entities merge into one and MUC falls to ${SC.muc.toFixed(2)}. A person pronoun needs a person; "it" needs one thing.` };
      if (st.mode === 2) return { ok: false, msg: `<b>Chains broken at every full stop.</b> Looking back within the sentence only, "She" never reaches "Uwase", and "it" and the cooperative in later sentences start new entities. MUC falls to ${SC.muc.toFixed(2)}. Real documents need resolvers that look far back, which is where they struggle most.` };
      if (st.mode === 3) return { ok: false, msg: `<b>No links, and B-cubed still says ${SC.b3.toFixed(2)}.</b> Every mention alone is a useless answer, but B-cubed credits each mention for being in a cluster with itself. MUC counts links and gives exactly ${SC.muc.toFixed(2)}. Always report several coreference metrics.` };
      return { ok: true, msg: `<b>Four entities, all linked correctly.</b> Pronouns link to the nearest mention that agrees: "She" to Uwase, "it" and "its" to the cooperative, "he" to Mugisha. "A farmer" renames Mugisha. "Farmers" stays alone. MUC ${SC.muc.toFixed(2)}, B³ ${SC.b3.toFixed(2)}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Who is who?', home: true, say: 'A news item about a coffee cooperative in Huye says she, it, its and he. Who does each one mean?', act: m => m.set({ mode: 0 }) },
    { t: 'Link them', home: true, say: 'Each pronoun links back to the nearest mention that fits. She needs a person; it needs one thing. Four entities appear.', act: m => m.set({ mode: 0 }) },
    { t: 'Descriptions', home: true, say: 'The cooperative links to the Huye coffee cooperative by its head noun. A farmer, between commas, renames Mugisha.', act: m => m.set({ mode: 0 }) },
    { t: 'Nearest is not enough', home: true, say: 'Link every pronoun to the nearest word, and she becomes the cooperative, and it becomes the farmers.', act: m => m.set({ mode: 1 }) },
    { t: 'Look further back', home: true, say: 'Look back within one sentence only, and every chain breaks at the full stop.', act: m => m.set({ mode: 2 }) },
    { t: 'Score it twice', home: true, say: 'Link nothing at all, and one score still looks fair. MUC counts links and gives zero. Report several metrics.', act: m => m.set({ mode: 3 }) },
  ],
  check: [
    { q: 'What does coreference resolution produce?', options: ['Groups of mentions that refer to the same thing', 'A translation', 'A list of nouns'], answer: 0, why: 'Names, descriptions and pronouns are clustered.' },
    { q: 'Why is linking a pronoun to the nearest mention not enough?', options: ['The nearest mention may not fit in number or kind', 'Pronouns never refer back', 'It is too slow'], answer: 0, why: '"She" cannot refer to a cooperative.' },
    { q: 'A system that links nothing gets MUC zero. Why can B-cubed still look fair?', options: ['It credits each mention for matching itself', 'It ignores mentions', 'It only counts pronouns'], answer: 0, why: 'Use several metrics.' },
  ],
  terms: [
    ['Mention', 'A span that refers to something: a name, a description or a pronoun.'],
    ['Antecedent', 'The earlier mention a later one refers back to.'],
    ['Cluster', 'All mentions of one entity.'],
    ['Appositive', 'A phrase that renames what it follows, like "Mugisha, a farmer,".'],
    ['MUC', 'A score based on correct links.'],
    ['B-cubed', 'A score averaged over mentions.'],
  ],
  deeper: '<p><b>No guessing from names.</b> Rules that decide "she" from a first name fail for many people, names from other languages, organisations and animals. This resolver only asks whether a mention is a person, an organisation, a group or a thing; trained models should be tested for the same fairness.</p><p><b>Other languages.</b> Kinyarwanda and Swahili mark the noun class of a referent on the verb itself, so a resolver must read the verb\'s prefix, not a separate pronoun.</p><p><b>About this machine.</b> The resolvers are simple rules run live; the agreement resolver stands in for a trained model. MUC and B-cubed are computed against the gold clusters.</p>',
  code: {
    title: 'An agreement-aware pronoun resolver',
    note: 'Adapted from the course\'s coreference lesson.',
    text: `
def resolve(mentions):
    links = {}
    for i, m in enumerate(mentions):
        earlier = reversed(mentions[:i])
        if m.kind == "pronoun":
            # nearest earlier mention that agrees in number and kind
            links[i] = next((j for j, p in earlier if p.number == m.number
                             and p.kind_of_thing == m.kind_of_thing), None)
        elif m.kind == "noun":
            links[i] = next((j for j, p in earlier if p.head == m.head), None)
    return links
`,
  },
};
