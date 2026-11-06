// Multimodal RAG: a travel desk in Stone Town looks for "a quiet guesthouse with a sea-view balcony and a good Swahili breakfast". Reviews are searched as text, photos
// with a CLIP-style image retriever, ambient sound clips with a CLAP-style audio retriever. Each retriever scores on its own scale; fusion either normalises each modality
// (min-max) and sums, or sums raw scores. The scores and guesthouses are invented; the fusion arithmetic is real.
// Break it: text only (misses the view and the noise), raw scores summed (the audio scale swamps the rest), no citations (an unsupported claim slips in).
const HOUSES = ['Nyumba ya Bahari', 'Jua Kali Lodge', 'Mnara House', 'Shangani Rooms', 'Kizimkazi Inn'];
const MODS = [
  { n: 'Reviews', k: 'text', col: '#3A6FB0', raw: [0.50, 0.88, 0.74, 0.78, 0.40], cite: 'review 3' },
  { n: 'Photos', k: 'image', col: '#E07B39', raw: [0.34, 0.12, 0.33, 0.26, 0.18], cite: 'photo 2' },
  { n: 'Sound clips', k: 'audio', col: '#1F9E89', raw: [24, 6, 9, 22, 27], cite: 'sound 1 at 0:34' },
];
const WISH = [[0, 'breakfast'], [1, 'sea view'], [2, 'quiet']];
function run(st) {
  const use = st.mods === 0 ? [0] : st.mods === 1 ? [0, 1] : [0, 1, 2];
  const parts = HOUSES.map((_, h) => MODS.map((m, i) => { if (!use.includes(i)) return 0; if (!st.norm) return m.raw[h];
    const lo = Math.min(...m.raw), hi = Math.max(...m.raw); return (m.raw[h] - lo) / (hi - lo); }));
  const tot = parts.map(p => p.reduce((a, b) => a + b, 0)), top = tot.indexOf(Math.max(...tot));
  const met = WISH.filter(([i]) => { const m = MODS[i], lo = Math.min(...m.raw), hi = Math.max(...m.raw); return (m.raw[top] - lo) / (hi - lo) >= 0.6; }).map(w => w[1]);
  return { use, parts, tot, top, met };
}

export default {
  slug: 'multimodal-rag-cross-modal',
  title: 'Multimodal RAG: ask across media',
  description: 'A travel desk in Stone Town looks for a quiet guesthouse by reviews, photos and sound clips. Each retriever scores on its own scale, so fuse by rank.',
  overview: 'Multimodal retrieval augmented generation retrieves evidence in whatever form holds it. Cross-modal retrieval needs text and the other medium in one space: CLIP or SigLIP for text and images, CLAP for text and audio, or a vision-language model\'s hidden states when quality matters most. A query is often best split by what each part asks for: "breakfast" is in reviews, "sea view" in photos, "quiet" in ambient sound. Each retriever returns its own scores, and they are not comparable: image similarities may sit between 0.1 and 0.4 while another scale runs to 30. Score fusion, the usual default, normalises within each modality before adding, optionally weighted towards the modality the question leans on; learned attention or mixture-of-experts fusion can do better with training data. The generator then answers from the fused top results and cites each claim, as in "review 3", "photo 2" or "sound 1 at 0:34", so a reader can check it; anything it cannot cite should not be in the answer. If the first round is weak, an agent can reformulate and retrieve again.',
  keywords: ['multimodal rag', 'cross-modal retrieval', 'score fusion', 'clip', 'clap', 'grounded citations'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.35, 1.0], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { mods: 2, norm: true, cite: true };
    const ink = '#151827';

    /* one retriever per modality: five bars each */
    const GX = [-1.9, -0.15, 1.6], BW = 0.2;
    const groups = MODS.map((m, gi) => { const pad = P.box(1.3, 0.04, 0.5, '#FFFFFF', { r: 0.03 }); pad.position.set(GX[gi], 0.12, -0.55); floor.add(pad);
      const bars = HOUSES.map((_, h) => { const mm = new THREE.MeshLambertMaterial({ color: m.col }), b = P.box(BW * 0.8, 1, 0.22, '#fff', { r: 0.01, material: mm }); b.position.set(GX[gi] - 0.5 + h * 0.25, 0.16, -0.6); b.userData.noFit = true; floor.add(b); return { b, mm }; });
      return { bars, pad }; });
    /* fused stacks per guesthouse */
    const FX = h => -2.0 + h * 1.0;
    const stacks = HOUSES.map((n, h) => { const segs = MODS.map(m => { const b = P.box(0.36, 1, 0.36, m.col, { r: 0.01 }); b.userData.noFit = true; floor.add(b); return b; });
      const plate = P.box(0.6, 0.03, 0.6, '#D9D2C3', { r: 0.02 }); plate.position.set(FX(h), 0.12, 0.5); floor.add(plate);
      const ring = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.72, 0.001, 0.72)), new THREE.LineBasicMaterial({ color: '#E0A526' })); ring.position.set(FX(h), 0.16, 0.5); ring.layers.set(1); floor.add(ring);
      return { segs, ring, plate }; });

    const keep = P.box(5.6, 0.6, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null;
    function draw() {
      R = run(st);
      const sc = st.norm ? 0.32 : 0.016, fs = st.norm ? 0.2 : 0.012;
      groups.forEach((g, gi) => { const on = R.use.includes(gi), m = MODS[gi], lo = Math.min(...m.raw), hi = Math.max(...m.raw);
        g.bars.forEach((b, h) => { const v = st.norm ? (m.raw[h] - lo) / (hi - lo) : m.raw[h], ht = on ? Math.min(1.2, Math.max(0.015, v * sc)) : 0.015; b.b.scale.y = ht; b.b.position.y = 0.16 + ht / 2; b.mm.color.set(on ? m.col : '#C9C3B5'); }); });
      stacks.forEach((s, h) => { let y = 0.15; s.segs.forEach((b, i) => { const ht = Math.min(0.7, R.parts[h][i] * fs); b.visible = ht > 0.001; b.scale.y = Math.max(0.001, ht); b.position.set(FX(h), y + ht / 2, 0.5); y += ht; });
        s.ring.visible = h === R.top; s.plate.material.color.set(h === R.top ? '#F2D27A' : '#D9D2C3'); });
      const name = HOUSES[R.top], good = R.met.length === 3;
      const claims = st.cite ? `${name}: ${R.met.includes('sea view') ? 'sea-view balcony [photo 2], ' : ''}${R.met.includes('quiet') ? 'quiet at night [sound 1 at 0:34], ' : ''}${R.met.includes('breakfast') ? 'Swahili breakfast praised [review 3]' : 'breakfast not mentioned'}`
        : `${name}: lovely sea views, very quiet, great breakfast, free airport pickup`;

    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Search', options: ['Reviews only', '+ photos', '+ photos + sound'], get: () => st.mods, act: i => { st.mods = i; draw(); } },
      { type: 'buttons', label: 'Fusion', options: ['Normalise, then sum', 'Raw sum'], get: () => (st.norm ? 0 : 1), act: i => { st.norm = !i; draw(); } },
      { type: 'buttons', label: 'Citations', options: ['On', 'Off'], get: () => (st.cite ? 0 : 1), act: i => { st.cite = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Top pick', get: () => ({ v: HOUSES[R.top], sub: 'fused score', good: R.met.length === 3, bad: R.met.length < 2 }) },
      { label: 'Wishes met', get: () => ({ v: `${R.met.length} of 3`, sub: R.met.join(', ') || 'none', good: R.met.length === 3, bad: R.met.length < 2 }) },
      { label: 'Claims cited', get: () => ({ v: st.cite ? 'All' : 'None', sub: st.cite ? 'each tied to its source' : 'one claim has no source', good: !!st.cite, bad: !st.cite }) },
    ];
    const labels = [
      { name: 'ret', t: 'Three retrievers', d: 'Each scores on its own scale', icon: 'eye', atV: V(-2.58, 0.2, -0.55) },
      { name: 'fuse', t: 'Fused scores', d: 'Gold: the top pick', icon: 'scale', atV: V(2.33, 0.2, 0.5) },
    ];
    const reset = () => { Object.assign(st, { mods: 2, norm: true, cite: true }); draw(); };
    const breaks = [
      { label: 'Reviews only', hint: 'Text retrieval', on: () => { reset(); st.mods = 0; draw(); }, off: reset },
      { label: 'Raw scores summed', hint: 'No normalisation', on: () => { reset(); st.norm = false; draw(); }, off: reset },
      { label: 'No citations', hint: 'Answer without sources', on: () => { reset(); st.cite = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.cite) return { ok: false, msg: `<b>"Free airport pickup" comes from nowhere.</b> Without citations the generator blends retrieved evidence with things it made up, and nobody can tell which is which. Tie every claim to a source, such as a review, a photo or a moment in a sound clip, and drop what cannot be cited.` };
      if (!st.norm) return { ok: false, msg: `<b>The loudest scale wins: ${HOUSES[R.top]}.</b> Sound scores run up to ${Math.max(...MODS[2].raw)} while photo similarities stay under 0.4, so adding raw numbers lets the audio retriever decide alone. It picks the quietest place, with ${R.met.length < 3 ? 'neither a view nor a well-reviewed breakfast' : 'everything'}. Normalise each modality first.` };
      if (st.mods === 0) return { ok: false, msg: `<b>${HOUSES[R.top]}: great breakfast, nothing else checked.</b> Reviews talk about food, but whether a balcony faces the sea is in the photos and how quiet a street is at night is in the sound. Text-only retrieval cannot see either.` };
      if (st.mods === 1) return { ok: R.met.length === 3, msg: `<b>${HOUSES[R.top]}: ${R.met.join(' and ')}.</b> Photos add the view, but nothing checks "quiet"; ${R.met.includes('quiet') ? 'this one happens to be quiet' : 'this one is next to the night market'}. Add the sound clips.` };
      return { ok: true, msg: `<b>${HOUSES[R.top]} meets all three.</b> Reviews, photos and sound clips are each normalised and summed, so no single scale dominates, and every claim in the answer points to its evidence.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The request', home: true, say: 'A travel desk in Stone Town is asked for a quiet guesthouse with a sea-view balcony and a good Swahili breakfast.', act: m => m.set({ mods: 2, norm: true, cite: true }) },
    { t: 'Three retrievers', home: true, say: 'Breakfast is in the reviews, the view is in the photos, and quiet is in recorded sound. Each has its own retriever.', act: m => m.set({}) },
    { t: 'Fuse and cite', home: true, say: 'Scores are normalised per medium and added. The answer cites a review, a photo and a sound clip.', act: m => m.set({}) },
    { t: 'Reviews only', home: true, say: 'Search reviews alone, and you get the best breakfast in town, on a noisy street with no view.', act: m => m.set({ mods: 0 }) },
    { t: 'Raw scores', home: true, say: 'Add raw scores, and the sound retriever\'s bigger numbers decide everything.', act: m => m.set({ mods: 2, norm: false }) },
    { t: 'No sources', home: true, say: 'Drop the citations, and a claim nobody can check slips into the answer.', act: m => m.set({ norm: true, cite: false }) },
  ],
  check: [
    { q: 'Why normalise scores before fusing?', options: ['Each retriever uses its own scale', 'To make them bigger', 'To remove images'], answer: 0, why: 'Otherwise one scale dominates.' },
    { q: 'What does cross-modal retrieval need?', options: ['Text and the other medium in one space, as CLIP or CLAP provide', 'OCR', 'One modality only'], answer: 0, why: 'So a text query can match images or sound.' },
    { q: 'Why cite each claim?', options: ['So readers can check it and made-up claims stand out', 'To make answers longer', 'To speed retrieval'], answer: 0, why: 'Uncited claims are suspect.' },
  ],
  terms: [
    ['Cross-modal retrieval', 'Finding images or sound from a text query, or the reverse.'],
    ['CLAP', 'Like CLIP, but for audio and text.'],
    ['Score fusion', 'Combining retriever scores into one ranking.'],
    ['Min-max normalisation', 'Rescaling scores to run from 0 to 1.'],
    ['Grounded citation', 'A pointer from a claim to its evidence.'],
    ['Query decomposition', 'Splitting a request by what each part needs.'],
  ],
  deeper: '<p><b>Travel and local business.</b> Guesthouses in Zanzibar, Saint-Louis and Lamu are reviewed in several languages and photographed by guests. Retrieval across media can match travellers to places better than star ratings, as long as answers point to real evidence.</p><p><b>Better fusion.</b> Weighting towards the medium a question leans on, or learning the fusion, can beat a plain sum once you have data to test against.</p><p><b>About this machine.</b> The scores and guesthouses are invented; the normalisation and sums are real.</p>',
  code: {
    title: 'Normalise, then fuse',
    note: 'Adapted from the course\'s multimodal RAG lesson.',
    text: `
def minmax(scores):
    lo, hi = min(scores.values()), max(scores.values())
    return {k: (v - lo) / (hi - lo or 1) for k, v in scores.items()}

def fuse(per_modality, weights=None):
    total = {}
    for name, scores in per_modality.items():
        w = (weights or {}).get(name, 1.0)
        for doc, s in minmax(scores).items():
            total[doc] = total.get(doc, 0) + w * s
    return sorted(total, key=total.get, reverse=True)
`,
  },
};
