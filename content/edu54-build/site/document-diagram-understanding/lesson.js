// Document understanding: a clearing agent at the port of Mombasa digitises cargo manifests: clean print, handwritten and skewed, or tables with merged cells. Read them
// with an OCR pipeline (OCR, layout, rules), with Donut (an OCR-free specialist) or with a vision-language model at 768 or 2048 pixels. Container numbers carry an
// ISO 6346 check digit, computed here for real; a validation step checks it. Field accuracy follows the reported pattern (pipelines strong on clean print and weak on
// handwriting; high-resolution VLMs best overall); the page and the fields are invented.
// Break it: an OCR pipeline on a handwritten skewed page, a VLM at low resolution, no validation (a VLM invents a plausible container number).
const PAGES = ['Clean print', 'Handwritten, skewed', 'Merged-cell table'];
const ACC = { ocr: [97, 58, 68], donut: [88, 72, 76], vlm768: [90, 66, 64], vlm2048: [97, 93, 94] };
const TRUE = [['Container', 'PWLU 482915 0'], ['Seal', 'KE 07731'], ['Consignee', 'Kagera Seed Ltd, Bukoba'], ['Cargo', 'Bean seed, 400 bags'], ['Gross weight', '18,240 kg']];
const FAIL_ORDER = [0, 4, 1, 3, 2]; /* hardest fields first */
const OCR_JUNK = ['PWLU 4B2Q15 0', 'KE 0773l', 'Kagera Sced Ltd', 'Bean sced, 4OO bags', '1B,24O kg'];
function ck(s) { const v = c => { if (/\d/.test(c)) return +c; let n = 10; for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') { if (n % 11 === 0) n++; if (ch === c) return n; n++; } return 0; };
  const t = s.replace(/\s/g, ''); return [...t.slice(0, 10)].reduce((a, c, i) => a + v(c) * 2 ** i, 0) % 11 % 10 === +t[10]; }
function run(st) {
  const key = st.m === 'vlm' ? (st.hi ? 'vlm2048' : 'vlm768') : st.m, acc = ACC[key][st.page], nBad = Math.round((100 - acc) / 100 * 5);
  const bad = new Set(FAIL_ORDER.slice(0, nBad));
  const rows = TRUE.map(([k, v], i) => { if (!bad.has(i)) return { k, v, st: 'ok' };
    if (st.m === 'vlm' && i === 0) { const inv = 'PWLU 482975 0'; return st.check && !ck(inv) ? { k, v: `${inv}  check digit fails`, st: 'flag' } : { k, v: inv, st: 'silent' }; }
    if (st.m === 'vlm' || st.m === 'donut') { const v = i === 4 ? '18,740 kg' : i === 1 ? 'KE 07781' : i === 3 ? 'Bean seed, 40 bags' : i === 0 ? 'PWLU 482975 0' : 'Kagera Seeds'; return st.check ? { k, v: `${v}  fails a check`, st: 'flag' } : { k, v, st: 'silent' }; }
    return { k, v: OCR_JUNK[i], st: st.check ? 'flag' : 'bad' }; });
  if (st.check) rows.forEach(r => { if (r.st === 'bad') r.st = 'flag'; });
  const silent = rows.filter(r => r.st === 'silent').length, flagged = rows.filter(r => r.st === 'flag').length;
  return { acc, rows, silent, flagged, key };
}

export default {
  slug: 'document-diagram-understanding',
  title: 'Documents: read the page',
  description: 'A clearing agent in Mombasa digitises cargo manifests: clean print, handwritten, skewed. Read them with an OCR pipeline or a vision model, and flag what is unsure.',
  overview: 'Document understanding went through three eras. The OCR pipeline turns each page into an image, runs OCR for words and boxes, finds layout blocks and tables, and pulls fields out with rules; it is fast and auditable on clean print but breaks on handwriting, skew, merged cells and mixed scripts, with a special case for every failure. OCR-free specialists such as Donut map pixels straight to JSON, and Nougat turns scientific papers into markdown, but each works on the kind of document it was trained on; LayoutLMv3 kept OCR and added layout and image patches. Since 2024, vision-language models read whole pages at high resolution and handle handwriting, complex tables, equations and charts; resolution matters, because small print disappears when the page is shrunk to a few hundred pixels. Their failure mode is different: a pipeline produces visibly garbled text, while a VLM can produce a confident, plausible wrong value. So production systems validate: schemas, totals that must add up, and check digits like the one on every shipping container number, sending anything that fails to a person.',
  keywords: ['document understanding', 'ocr', 'donut', 'layoutlmv3', 'vision language model', 'check digit'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { m: 'vlm', hi: true, page: 1, check: true };
    const ink = '#151827';
    /* the manifest page */
    const page = new THREE.Group(); page.position.set(-1.65, 0.12, 0.1); floor.add(page);
    const sheet = P.box(2.3, 0.03, 2.3, '#FFFFFF', { r: 0.02 }); page.add(sheet);

    const lines = TRUE;
    const grid = new THREE.Group(); page.add(grid);
    for (let i = 0; i <= 5; i++) { const r = P.box(2.0, 0.005, 0.008, '#9AA3B5'); r.position.set(0, 0.035, -0.77 + i * 0.3); grid.add(r); }
    const vline = P.box(0.008, 0.005, 1.5, '#9AA3B5'); vline.position.set(-0.15, 0.035, -0.02); grid.add(vline);
    const merge = P.box(1.0, 0.006, 0.6, '#F2E6C9'); merge.position.set(0.45, 0.032, 0.83); page.add(merge);

    /* how the reader sees the page: word boxes or a patch grid */
    const boxes = new THREE.Group(); page.add(boxes);
    lines.forEach((_, i) => { const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, 0.001, 0.17)), new THREE.LineBasicMaterial({ color: '#E07B39' })); e.position.set(0.45, 0.06, -0.62 + i * 0.3); e.layers.set(1); boxes.add(e); });
    const patches = new THREE.Group(); page.add(patches);
    const mkGrid = n => { const g = new THREE.Group(), s = 2.3 / n; for (let i = 0; i <= n; i++) { [0, 1].forEach(d => { const b = P.box(d ? 2.3 : 0.006, 0.003, d ? 0.006 : 2.3, '#3A6FB0'); b.position.set(d ? 0 : -1.15 + i * s, 0.06, d ? -1.15 + i * s : 0); b.layers.set(1); g.add(b); }); } return g; };
    const gLo = mkGrid(4), gHi = mkGrid(12); patches.add(gLo, gHi);
    /* the reader in the middle */
    const blk = (x, z, w, d, col, name) => { const mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(w, 0.3, d, col, { r: 0.04, material: mm }); b.position.set(x, 0.12, z); floor.add(b);
         return { b }; };
    const pipe = [blk(0.2, -0.55, 0.62, 0.42, '#E07B39', 'OCR'), blk(0.2, 0.0, 0.62, 0.42, '#C9A227', 'Layout'), blk(0.2, 0.55, 0.62, 0.42, '#8A6D12', 'Rules')];
    const one = blk(0.2, 0.0, 0.7, 1.5, C.plum, '');

    const chk = blk(1.05, 0.0, 0.42, 0.9, '#1F9E89', 'Check');
    /* the extracted fields */

    const out = TRUE.map((_, i) => { const l = P.lamp('#2E9E6A', { h: 0.14, r: 0.1 }); l.position.set(2.2, 0.12, -0.6 + i * 0.32); floor.add(l); return l; });
    const keep = P.box(5.6, 0.3, 2.4, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null;
    function draw() {
      R = run(st);
      const hand = st.page === 1;
      page.rotation.y = hand ? 0.09 : 0;
      merge.visible = st.page === 2;
      boxes.visible = st.m === 'ocr'; patches.visible = st.m === 'vlm'; gLo.visible = st.m === 'vlm' && !st.hi; gHi.visible = st.m === 'vlm' && !!st.hi;
      pipe.forEach(p => { p.b.visible = st.m === 'ocr';  });
      one.b.visible = st.m !== 'ocr';
      chk.b.visible = !!st.check;
      R.rows.forEach((r, i) => out[i].userData.set({ color: r.st === 'ok' ? '#2E9E6A' : r.st === 'flag' ? '#E3A72F' : '#D64545', on: true }));
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Page', options: PAGES, get: () => st.page, act: i => { st.page = i; draw(); } },
      { type: 'buttons', label: 'Reader', options: ['OCR pipeline', 'Donut', 'VLM'], get: () => ['ocr', 'donut', 'vlm'].indexOf(st.m), act: i => { st.m = ['ocr', 'donut', 'vlm'][i]; draw(); } },
      { type: 'buttons', label: 'VLM resolution', options: ['768 px', '2048 px'], get: () => (st.hi ? 1 : 0), act: i => { st.hi = !!i; draw(); } },
      { type: 'buttons', label: 'Validation', options: ['Off', 'Check digits and schema'], get: () => (st.check ? 1 : 0), act: i => { st.check = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Field accuracy', get: () => ({ v: `${R.acc}%`, sub: 'reported pattern', good: R.acc >= 90, bad: R.acc < 75 }) },
      { label: 'Silent errors', get: () => ({ v: String(R.silent), sub: 'wrong but look right', good: R.silent === 0, bad: R.silent > 0 }) },
      { label: 'Sent to a person', get: () => ({ v: String(R.flagged), sub: st.check ? 'failed a check' : 'no checks run' }) },
    ];
    const labels = [
      { name: 'page', t: 'The manifest', d: 'Orange: word boxes · blue: patches', icon: 'book', atV: V(-2.83, 0.15, 0.1) },
    ];
    const reset = () => { Object.assign(st, { m: 'vlm', hi: true, page: 1, check: true }); draw(); };
    const breaks = [
      { label: 'OCR on handwriting', hint: 'Pipeline, skewed scan', on: () => { reset(); st.m = 'ocr'; st.check = false; draw(); }, off: reset },
      { label: 'Low resolution', hint: 'VLM at 768 px, merged table', on: () => { reset(); st.hi = false; st.page = 2; draw(); }, off: reset },
      { label: 'No validation', hint: 'VLM, smudged handwriting', on: () => { reset(); st.check = false; st.hi = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.m === 'vlm' && R.silent > 0) return { ok: false, msg: `<b>${R.silent} field${R.silent > 1 ? 's look' : ' looks'} right but ${R.silent > 1 ? 'are' : 'is'} wrong.</b> A vision-language model does not garble text the way OCR does; it writes a plausible value, such as container PWLU 482975 0, whose check digit does not match. Without validation it slips through. Check digits, schemas and totals (400 bags must match the weight) catch these and send them to a person.` };
      if (st.m === 'ocr' && st.page > 0) return { ok: false, msg: `<b>${R.acc}% of fields right.</b> OCR built for clean print misreads ${st.page === 1 ? 'handwriting on a skewed scan' : 'a table with merged cells'}: letters become digits and digits letters, and the rules that pull out fields break. ${st.check ? 'Validation flags the garbled fields for a person.' : 'Every page like this needs a special case.'}` };
      if (st.m === 'vlm' && !st.hi && R.acc < 80) return { ok: false, msg: `<b>Small print lost at 768 pixels.</b> Shrinking an A4 page that far blurs small handwriting and table cells, so accuracy falls to ${R.acc}%. At 2048 pixels the same model reads ${ACC.vlm2048[st.page]}%. Resolution is the cheapest fix.` };
      if (R.flagged > 0) return { ok: true, msg: `<b>${R.acc}% right, ${R.flagged} sent to a person.</b> The checks caught every field that failed, so nothing wrong goes into the customs system unseen.` };
      return { ok: true, msg: `<b>${R.acc}% of fields right${R.silent ? '' : ', none silently wrong'}.</b> ${st.m === 'vlm' ? 'A vision-language model reads the whole page at 2048 pixels, handwriting and table together' : st.m === 'donut' ? 'Donut maps pixels straight to fields, and does well on the kinds of page it was trained on' : 'On clean print the OCR pipeline is fast, cheap and auditable'}${st.check ? ', and the container number passes its check digit' : ''}.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The manifests', home: true, say: 'A clearing agent at the port of Mombasa digitises cargo manifests. This one is handwritten and scanned at a slant.', act: m => m.set({ m: 'vlm', hi: true, page: 1, check: true }) },
    { t: 'Read the page', home: true, say: 'A vision-language model reads the whole page at high resolution and fills in the fields.', act: m => m.set({}) },
    { t: 'Check it', home: true, say: 'Every container number has a check digit. A validation step checks it, and the schema, before anything is saved.', act: m => m.set({}) },
    { t: 'Old pipeline', home: true, say: 'Run the old OCR pipeline on the same page, and handwriting comes out garbled.', act: m => m.set({ m: 'ocr', check: false }) },
    { t: 'Too small', home: true, say: 'Give the model the merged-cell table at low resolution, and the small print is lost.', act: m => m.set({ m: 'vlm', hi: false, page: 2, check: true }) },
    { t: 'Plausible and wrong', home: true, say: 'Skip validation, and the model writes a container number that looks right but is not.', act: m => m.set({ page: 1, check: false }) },
  ],
  check: [
    { q: 'Where do OCR pipelines struggle most?', options: ['Handwriting, skew and merged cells', 'Clean print', 'Short pages'], answer: 0, why: 'Each failure needs a special case.' },
    { q: 'Why does resolution matter for a VLM reading documents?', options: ['Small print blurs when the page is shrunk', 'It changes the language', 'It shortens answers'], answer: 0, why: '768 pixels loses detail.' },
    { q: 'How does a VLM\'s failure differ from OCR\'s?', options: ['It writes plausible wrong values instead of garbled ones', 'It never fails', 'It fails only on print'], answer: 0, why: 'So validation matters.' },
  ],
  terms: [
    ['OCR pipeline', 'Detect words, find layout, extract fields with rules.'],
    ['OCR-free model', 'Maps page pixels straight to structured output.'],
    ['LayoutLMv3', 'Text, word boxes and image patches together.'],
    ['Check digit', 'A digit computed from the others to catch errors.'],
    ['Schema validation', 'Checking fields have the right form and types.'],
    ['Human review', 'Sending failed checks to a person.'],
  ],
  deeper: '<p><b>Paper at the border.</b> Ports and border posts from Mombasa to Lagos to Durban still handle mixed printed and handwritten forms. Reading them automatically speeds clearing, but a wrong container or seal number can stop a shipment, so checks and human review stay in the loop.</p><p><b>When to keep OCR.</b> Very high-volume clean scans, strict audit trails and predictable failures still favour a pipeline; many teams run both and compare.</p><p><b>About this machine.</b> The check digit is computed for real; accuracy follows the reported pattern; the page and fields are invented.</p>',
  code: {
    title: 'Check the container number',
    note: 'The ISO 6346 check digit, as used in the validation step.',
    text: `
def iso6346_ok(code):                       # e.g. "PWLU4829150"
    vals, n = {}, 10
    for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
        if n % 11 == 0:
            n += 1
        vals[ch] = n
        n += 1
    total = sum((vals.get(c) or int(c)) * 2 ** i for i, c in enumerate(code[:10]))
    return total % 11 % 10 == int(code[10])
`,
  },
};
