// Capstone: multimodal document QA (phase 19, capstone 4). An Addis Ababa auditor's scanned reports hold plain text, rotated tables, charts and handwriting. A router sends each page to OCR or to a vision model; answers cite a page and a box.
// Each page kind has a score under each path, and the bill follows. Vision-first everywhere is accurate and costly; a router spends where it matters. Counts come from the page list below.
const KIND = { text: { n: 'plain text', ocr: 0.98, vis: 0.97 }, table: { n: 'rotated tables', ocr: 0.45, vis: 0.92 }, chart: { n: 'charts', ocr: 0.1, vis: 0.86 }, hand: { n: 'handwriting', ocr: 0.3, vis: 0.8 } };
const PAGES = [...Array(60)].map((_, i) => (i % 10 === 0 ? 'chart' : i % 7 === 0 ? 'hand' : i % 4 === 0 ? 'table' : 'text'));
const OCR = 0.01, VIS = 0.12;
function run(o) {
  let right = 0, cost = 0; const by = { text: [0, 0], table: [0, 0], chart: [0, 0], hand: [0, 0] };
  PAGES.forEach(k => {
    const useVis = o.mode === 'vision' || (o.mode === 'route' && k !== 'text');
    const s = useVis ? KIND[k].vis : KIND[k].ocr;
    right += s; cost += useVis ? VIS : OCR; by[k][0] += s; by[k][1]++;
  });
  return { acc: right / PAGES.length, cost, by, n: PAGES.length, cite: o.cite };
}

export default {
  slug: 'multimodal-document-qa',
  title: 'Capstone: reading documents as pictures',
  description: 'Scanned reports with rotated tables and charts. Route each page to the right reader, and pay only where it counts.',
  overview: 'Enterprises hold PDFs that text pipelines mangle: scans with rotated tables, charts that only make sense as images, notes written in the margin. Treat these as text and half the information is gone. A vision-first system reads the page as a picture, and that works well, at a much higher price per page. So real systems route: plain pages go to cheap OCR, and hard ones go to a vision model. Answers then cite a page and a box, so a person can look. This capstone runs sixty pages of a scanned audit in Addis Ababa through that machine, and shows what each path gets right and what it costs.',
  keywords: ['document AI', 'vision models', 'OCR', 'PDF', 'routing', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { mode: 'route', cite: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const b = add(P.belt(V(-2.4, 0, 0.3), V(-0.5, 0, 0.3), { w: 0.34, speed: 1 }));
    const pile = add(P.stack(0.6, 0.45, 0.07, { max: 8, color: '#F4F1EA' })); pile.position.set(-2.1, 0.03, -0.4); pile.userData.set({ n: 8, colors: Array(8).fill('#F4F1EA') });
    const ocr = add(P.robot('#8E91A3', { scale: 0.6 })); ocr.position.set(-0.1, 0.03, 0.42);
    const vis = add(P.robot('#7B6FA8', { scale: 0.85 })); vis.position.set(-0.1, 0.03, -0.35);
    const KS = Object.keys(KIND), X = i => 0.75 + i * 0.42;
    const T = KS.map((k, i) => { const t = add(P.tower(0.34, 0.42, GOOD)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const jar = add(P.jar(0.2, 0.6, { max: 12 })); jar.position.set(1.05, 0.03, 0.5);
    S.add(P.keep(-2.45, 2.45, 1.2, -0.72, 0.8));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      KS.forEach((k, i) => { const s = R.by[k][0] / R.by[k][1]; T[i].userData.set({ h: Math.max(0.05, s * 1.1), color: s < 0.7 ? BAD : GOOD }); });
      jar.userData.set({ n: Math.ceil(R.cost / 7.2 * 12) });
      ocr.visible = st.mode !== 'vision'; vis.visible = st.mode !== 'ocr';
      ocr.userData.set({ busy: true }); vis.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick?.(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const MK = ['ocr', 'vision', 'route'];
    const controls = [
      { type: 'buttons', label: 'Who reads each page', options: ['OCR only', 'Vision only', 'Router'], get: () => MK.indexOf(st.mode), act: i => set({ mode: MK[i] }) },
      { type: 'toggle', label: 'Answers cite a page and box', short: 'Citations', get: () => st.cite, set: v => set({ cite: !!v }) },
    ];
    const readouts = [
      { label: 'Questions right', get: () => ({ v: `${Math.round(R.acc * 100)}%`, sub: `over ${R.n} pages`, good: R.acc > 0.88, bad: R.acc < 0.7 }) },
      { label: 'Cost', get: () => ({ v: M(R.cost), sub: `vision on all: ${M(R.n * VIS)}`, good: R.cost < R.n * VIS * 0.6 }) },
      { label: 'Auditable', get: () => ({ v: st.cite ? 'page and box' : 'trust me', good: st.cite, bad: !st.cite }) },
    ];
    const labels = [
      { name: 'p', t: 'Sixty scanned pages', d: 'Mixed kinds of page', icon: 'book', atV: V(-2.38, 0.3, -0.4) },
      { name: 't', t: 'Text, tables, charts, handwriting', d: 'Coral: poorly read', icon: 'target', atV: V(X(3) + 0.18, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'OCR everything', hint: 'tables come apart', on: () => set({ ...D0, mode: 'ocr' }), off: reset },
      { label: 'Vision on every page', hint: 'paying for plain text', on: () => set({ ...D0, mode: 'vision' }), off: reset },
      { label: 'Answers with no citation', hint: 'nobody can check', on: () => set({ ...D0, cite: false }), off: reset },
    ];
    function status() {
      if (!st.cite) return { ok: false, msg: `<b>${Math.round(R.acc * 100)}% right, and no way to tell which.</b> An auditor must see the source. Cite a page and a box.` };
      if (st.mode === 'ocr') return { ok: false, msg: `<b>${Math.round(R.acc * 100)}% right, for ${M(R.cost)}.</b> Cheap, and charts come out as empty text. A rotated table loses its columns. Half the meaning was in the picture.` };
      if (st.mode === 'vision') return { ok: false, msg: `<b>${Math.round(R.acc * 100)}% right, for ${M(R.cost)}.</b> Nearly the same accuracy as the router, at about twice the cost, spent mostly on plain text that OCR reads fine.` };
      return { ok: true, msg: `<b>${Math.round(R.acc * 100)}% right, for ${M(R.cost)}, with each answer citing a page and box.</b> Plain pages went to OCR, hard ones to vision. Spend where the picture holds the meaning.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; if (u > 0.8 && b.userData.count() < 3) { u = 0; b.userData.send('#F4F1EA', { size: 0.17 }); } },
      currency: draw, controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'A mixed pile', home: true, say: 'An auditor in Addis Ababa has sixty scanned pages: text, rotated tables, charts and handwritten notes.', act: m => m.set({ mode: 'ocr', cite: true }) },
    { t: 'Text-first', home: true, say: 'OCR reads plain pages well. Tables lose their columns, and charts become nothing.', act: m => m.set({ mode: 'ocr', cite: true }) },
    { t: 'Vision-first', home: true, say: 'A vision model reads the page as a picture. It handles tables and charts, at a much higher price per page.', act: m => m.set({ mode: 'vision', cite: true }) },
    { t: 'A router', home: true, say: 'So route. Plain pages go to OCR, and hard ones go to vision.', act: m => m.set({ mode: 'route', cite: true }) },
    { t: 'Show your source', home: true, say: 'An auditor needs proof. Each answer cites a page and a box, so a person can look.', act: m => m.set({ mode: 'route', cite: false }) },
    { t: 'The whole machine', home: true, say: 'Read, route, answer, cite. Spend where the picture holds the meaning.', act: m => m.set({ mode: 'route', cite: true }) },
  ],
  check: [
    { q: 'What does OCR lose on a chart?', options: ['Nearly all the meaning', 'Only colour', 'Nothing'], answer: 0, why: 'The meaning is in the image.', hint: 'Try OCR everything.' },
    { q: 'Why route rather than use vision everywhere?', options: ['Plain pages don\'t need it', 'Vision is less accurate', 'OCR is newer'], answer: 0, why: 'Spend where it matters.', hint: 'Try Vision on every page.' },
    { q: 'Why cite a page and a box?', options: ['So people can check the answer', 'To look formal', 'To save tokens'], answer: 0, why: 'Audit work needs a source.', hint: 'Try Answers with no citation.' },
  ],
  terms: [
    ['OCR', 'Turning page images into text.'],
    ['Vision-first', 'Reading a page as an image.'],
    ['Page router', 'Sending each page to the right reader.'],
    ['Layout analysis', 'Finding tables, columns and figures.'],
    ['Bounding box', 'A rectangle on the page.'],
    ['Citation', 'A pointer back to the source.'],
  ],
  deeper: '<p><b>Detect first.</b> A cheap layout step can classify pages, which is what makes routing possible.</p><p><b>Indexing.</b> Page images can be indexed with vision-language embeddings, so that a search finds a chart by what it shows.</p><p><b>Numbers.</b> Page scores and prices are round figures.</p>',
  code: {
    title: 'Route a page',
    note: 'Adapted from the course\'s capstone sketch (code/main.py).',
    text: `
def read(page):
    if layout(page).has_any("table", "chart", "handwriting"):
        return vision_model(page.image, ask=EXTRACT_PROMPT)
    return ocr(page.image)

def answer(question, index):
    hits = index.search(question, k=5)
    return model(question, hits, instruct="Cite page and box for each claim.")
`,
  },
};
