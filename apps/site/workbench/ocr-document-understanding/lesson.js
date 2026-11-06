// OCR and document understanding: a photographed market receipt from Dar es Salaam on a board. A detector boxes each line of text,
// a recogniser reads each line left to right as a strip of columns, and CTC decoding turns per-column guesses into characters by merging repeats and dropping blanks.
// The strip in front shows one line: each column's best guess, then the decoded text. Layout parsing finds which number is the total.
// Break it: decode without merging repeats ("TTOOTTAALL"), merge repeats with no blank token (double letters like "MM" in "MMAHINDI" become one),
// a skewed photo with no deskew (lines cross and get read as one jumble).
const LINES = ['DUKA LA MAMA', 'MAHINDI 2KG   3000', 'MAHARAGE 1KG  2800', 'MCHELE 1KG    2500', 'TOTAL         8300'];
const AMOUNT_RE = /(\d{3,})\s*$/;

function ctcColumns(text) {
  // the recogniser outputs more columns than characters: each char spans 2–3 columns, and a blank separates double letters
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const cols = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] === ' ' ? ' ' : text[i];
    if (i > 0 && text[i] === text[i - 1]) cols.push('-');
    const n = 2 + (r() < 0.4 ? 1 : 0);
    for (let k = 0; k < n; k++) cols.push(ch);
    if (r() < 0.25) cols.push('-');
  }
  return cols;
}
function decode(cols, o) {
  let out = '', prev = null;
  for (const c of cols) {
    if (!o.merge) { if (c !== '-') out += c; continue; }
    if (!o.blank) { if (c === '-') continue; if (c !== prev) out += c; prev = c; continue; }
    if (c !== prev && c !== '-') out += c;
    prev = c;
  }
  return out;
}
function cer(a, b) {
  const m = a.length, n = b.length, d = [...Array(m + 1)].map((_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n] / Math.max(1, b.length);
}

export default {
  slug: 'ocr-document-understanding',
  title: 'OCR: reading text in photos',
  description: 'A clinic scans handwritten forms. Find the text, read each line with CTC, and keep the layout, or the right words land in the wrong boxes.',
  overview: 'Optical character recognition turns a picture of text into text. The classic pipeline first finds where the text is, usually line by line, then reads each line. A recogniser slides along the line and makes one guess per narrow column, so a single letter covers several columns. Connectionist temporal classification (CTC) handles that: merge repeated guesses, then drop a special blank symbol that the model emits between letters, which is also how it can write genuine double letters. Photos are rarely straight, so pages are deskewed first. Finally, layout parsing works out what each piece of text means, such as which number is the total.',
  keywords: ['ocr explained', 'ctc decoding', 'text recognition', 'document understanding', 'deskew'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.9, 0], dir: [0.12, 0.5, 1.3], half: 1.75, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { merge: true, blank: true, deskew: true, skew: 0.12, line: 1 };
    const ink = '#151827';
    /* ---------- the receipt photo ---------- */
    const RX = -1.75, RZ = -0.55, RW = 1.6, RH = 1.75;
    const table = P.box(RW + 0.5, RH + 0.4, 0.06, '#7A5A3A', { r: 0.04 }); table.position.set(RX, 0.12, RZ - 0.04); floor.add(table);
    const paper = new THREE.Group(); paper.position.set(RX, 0.12 + 0.2 + RH / 2, RZ + 0.02); floor.add(paper);
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(RW, RH), new THREE.MeshBasicMaterial({ color: '#F7F3EA' })); sheet.layers.set(1); paper.add(sheet);
    const lineTs = LINES.map((l, i) => {     return t; });
    const boxes = LINES.map((_, i) => { const b = P.tube([V(-RW / 2 + 0.05, -0.08, 0.02), V(RW / 2 - 0.05, -0.08, 0.02), V(RW / 2 - 0.05, 0.08, 0.02), V(-RW / 2 + 0.05, 0.08, 0.02), V(-RW / 2 + 0.05, -0.08, 0.02)], 0.008, C.teal); b.position.set(0, RH / 2 - 0.3 - i * 0.3, 0); b.userData.noFit = true; paper.add(b); return b; });

    /* ---------- the CTC strip ---------- */
    const SX = 1.3, SZ = -0.55, SW = 3.4;
    const wall = P.box(SW + 0.3, 1.75, 0.08, '#FBF8F1', { r: 0.04 }); wall.position.set(SX, 0.12, SZ); floor.add(wall);




    const MAXC = 60, CW = SW / MAXC * 1.0;
    const colM = new THREE.InstancedMesh(new THREE.PlaneGeometry(CW * 0.9, 0.14), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), MAXC);
    colM.layers.set(1); colM.userData.noFit = true; colM.frustumCulled = false; floor.add(colM);


    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* ---------- the reader blocks ---------- */
    const blocks = [['deskew', C.grey], ['find lines', C.teal], ['read columns', C.indigo], ['CTC decode', C.plum], ['layout', '#2E7A45']].map(([n, c], i) => {
      const x = -2.6 + i * 1.3, b = P.box(1.0, 0.3, 0.45, c, { r: 0.05, material: new THREE.MeshLambertMaterial({ color: c }) }); b.position.set(x, 0.12, 0.95); floor.add(b);
      return b;
    });
    /* ---------- run ---------- */
    let R = null;
    function readAll() {
      const skewed = !st.deskew && st.skew > 0.05;
      const out = LINES.map((l, i) => {
        let src = l;
        if (skewed && i > 0 && i < LINES.length - 1) { const nb = LINES[i + 1]; src = l.slice(0, Math.ceil(l.length / 2)) + nb.slice(Math.ceil(nb.length / 2)); }
        return decode(ctcColumns(src.replace(/ +/g, ' ')), st);
      });
      const truth = LINES.map(l => l.replace(/ +/g, ' '));
      const err = out.reduce((a, t, i) => a + cer(t, truth[i]), 0) / LINES.length;
      const totalLine = out.find(t => /^TOTAL/.test(t));
      const total = totalLine && AMOUNT_RE.test(totalLine) ? totalLine.match(AMOUNT_RE)[1] : null;
      const items = out.slice(1, 4).map(t => (AMOUNT_RE.test(t) ? +t.match(AMOUNT_RE)[1] : NaN));
      const sum = items.reduce((a, v) => a + v, 0);
      return { out, err, total, sum, skewed };
    }
    function draw() {
      R = readAll();
      paper.rotation.z = st.deskew ? 0 : st.skew; boxes.forEach(b => { b.rotation.z = -paper.rotation.z; });
      blocks[0].material.color.set(st.deskew ? C.grey : '#C9C5BA');
      const cols = ctcColumns(LINES[st.line].replace(/ +/g, ' ')).slice(0, MAXC);
      for (let k = 0; k < MAXC; k++) {
        const c = cols[k];
        dummy.position.set(SX - SW / 2 + (k + 0.5) * CW, 0.12 + 1.3, SZ + 0.044); dummy.scale.setScalar(c === undefined ? 0.0001 : 1); dummy.updateMatrix(); colM.setMatrixAt(k, dummy.matrix);
        colM.setColorAt(k, col.set(c === '-' ? '#E6E1D6' : c === ' ' ? '#F4F1EA' : k > 0 && cols[k - 1] === c ? '#CFE3EE' : '#9FC6DE'));
      }
      colM.instanceMatrix.needsUpdate = true; colM.instanceColor.needsUpdate = true;


    }
    draw();
    const pct = v => `${Math.round(v * 100)}%`;
    const controls = [
      { type: 'toggle', label: 'Merge repeated column guesses', short: 'merge', get: () => st.merge, set: v => { st.merge = v; draw(); } },
      { type: 'toggle', label: 'Blank token between letters', short: 'blank', get: () => st.blank, set: v => { st.blank = v; draw(); } },
      { type: 'toggle', label: 'Deskew the photo first', short: 'deskew', get: () => st.deskew, set: v => { st.deskew = v; draw(); } },
      { type: 'buttons', label: 'Line shown on the strip', options: ['1', '2', '3', '4', '5'], get: () => st.line, act: i => { st.line = i; draw(); } },
    ];
    const readouts = [
      { label: 'Character errors', get: () => ({ v: pct(R.err), sub: 'across the receipt', good: R.err < 0.02, bad: R.err > 0.1 }) },
      { label: 'Total found', get: () => ({ v: R.total || 'no', sub: 'read from the last line', good: R.total === '8300', bad: R.total !== '8300' }) },
      { label: 'Items add up', get: () => ({ v: Number.isFinite(R.sum) && String(R.sum) === R.total ? 'yes' : 'no', sub: 'a cheap sanity check', good: String(R.sum) === R.total }) },
    ];
    const labels = [
      { name: 'receipt', t: 'The photo', d: 'Teal boxes: lines found', icon: 'eye', atV: V(RX - RW / 2 - 0.2, 0.12 + 0.2 + RH * 0.6, RZ) },
      { name: 'strip', t: 'One line, column by column', d: 'Then CTC turns it into letters', icon: 'scale', atV: V(SX + SW / 2 + 0.1, 0.12 + 1.3, SZ) },
      { name: 'pipe', t: 'The reader', d: 'Five steps from photo to fields', icon: 'link', atV: V(-3.1, 0.25, 0.95) },
    ];
    const reset = () => { Object.assign(st, { merge: true, blank: true, deskew: true, line: 1 }); draw(); };
    const breaks = [
      { label: 'Decode without merging', hint: 'Every column becomes a letter', on: () => { reset(); st.merge = false; draw(); }, off: reset },
      { label: 'No blank token', hint: 'Merge repeats, no separator', on: () => { reset(); st.blank = false; draw(); }, off: reset },
      { label: 'Skip the deskew', hint: 'The photo is tilted 7 degrees', on: () => { reset(); st.deskew = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.merge) return { ok: false, msg: `<b>"MMMAAHHIINNDDII".</b> The recogniser makes one guess per narrow column, and each letter spans two or three columns. Turning every column into a letter repeats them all: ${pct(R.err)} of characters wrong and no total found. CTC first merges repeated guesses.` };
      if (!st.blank) return { ok: false, msg: `<b>Double letters vanish.</b> Merging repeats without a blank token squashes genuine pairs, so "3000" becomes "30" and "2800" becomes "280": the total reads ${R.total || 'nothing'} and the items no longer add up. The model writes a blank between two identical letters precisely so they survive the merge.` };
      if (R.skewed) return { ok: false, msg: `<b>Lines read across each other.</b> The photo is tilted, so a line box that is straight on the page catches the start of one line and the end of the next: "${R.out[1]}", item prices swapped and ${pct(R.err)} of characters wrong. Straightening the page first keeps each line in its own box.` };
      return { ok: true, msg: `<b>Receipt read.</b> Each line's column guesses become letters once repeats are merged and blanks dropped (${pct(R.err)} errors), the layout step finds the total, ${R.total}, and the three items add up to it, which is a useful check before trusting the numbers.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A photo of a receipt', home: true, say: 'A receipt from a market in Dar es Salaam, photographed on a table. We want the text, and especially the total.', act: m => m.set({ merge: true, blank: true, deskew: true, line: 1 }) },
    { t: 'Find the lines', home: true, say: 'First, straighten the page and box each line of text. Then read each line on its own.', act: m => m.set({}) },
    { t: 'Column by column', home: true, say: 'The recogniser slides along the line and guesses one character per narrow column. Each letter covers two or three columns, with blanks scattered between.', act: m => m.set({ line: 1 }) },
    { t: 'Without merging', home: true, say: 'Turn every column into a letter, and everything repeats: M M M A A H H. CTC first merges repeated guesses.', act: m => m.set({ merge: false }) },
    { t: 'Why blanks', home: true, say: 'But merging alone squashes real double letters too: three thousand becomes thirty. The blank between two identical letters is what keeps them apart.', act: m => m.set({ merge: true, blank: false }) },
    { t: 'Straighten first', home: true, say: 'Skip the straightening, and tilted lines cross their neighbours. The prices get swapped between items. Deskew first, then read.', act: m => m.set({ blank: true, deskew: false }) },
  ],
  check: [
    { q: 'Why does the recogniser output more columns than letters?', options: ['It guesses per narrow column, and each letter spans several columns', 'It reads every letter twice for safety', 'It translates as it reads'], answer: 0, why: 'CTC turns the column guesses into letters.' },
    { q: 'What is the blank token for?', options: ['It separates genuine double letters so merging does not squash them', 'It marks spaces between words', 'It means the image is blank'], answer: 0, why: '"3-0-0-0" survives merging; "3000" without blanks becomes "30".' },
    { q: 'Why deskew before reading lines?', options: ['A tilted line box catches parts of neighbouring lines', 'It makes the text bigger', 'It removes colour'], answer: 0, why: 'Straight lines stay in their own boxes.' },
  ],
  terms: [
    ['OCR', 'Optical character recognition: turning images of text into text.'],
    ['Text detection', 'Finding where the text is, usually as line boxes.'],
    ['CTC', 'Connectionist temporal classification: decoding column guesses by merging repeats and dropping blanks.'],
    ['Blank token', 'A special symbol meaning "no character here".'],
    ['Deskew', 'Rotating a page image so text lines are horizontal.'],
    ['Layout parsing', 'Working out what each region of a document means.'],
  ],
  deeper: '<p><b>End-to-end models.</b> Newer document models read a whole page image and write out structured text, or answer questions about it, without separate detection and recognition steps.</p><p><b>Measuring it.</b> Character error rate counts the insertions, deletions and substitutions needed to turn the output into the true text, divided by its length.</p><p><b>About this machine.</b> The column guesses are generated from the true text; the decoding, deskew effect, error rate and total-finding are computed exactly.</p>',
  code: {
    title: 'Greedy CTC decoding',
    note: 'Adapted from the course\'s OCR lesson.',
    text: `
BLANK = "-"

def ctc_greedy(column_guesses):
    out, prev = [], None
    for c in column_guesses:
        if c != prev and c != BLANK:   # merge repeats, then drop blanks
            out.append(c)
        prev = c
    return "".join(out)

print(ctc_greedy("33-00-00-00"))      # -> "3000"
print(ctc_greedy("MMAAHH-IINN"))      # -> "MAHIN"
`,
  },
};
