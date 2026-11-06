// Data pipelines: a lab in Nairobi builds a Swahili pre-training set from a web crawl. 160 seeded documents (news written from templates, near-duplicate copies with
// different adverts, a cookie notice repeated many times, keyword spam, English pages, contact lines with phone numbers and e-mail addresses) pass through five stages,
// all computed for real: strip HTML and menus, language ID (stop-word votes), a quality filter (share of distinct words), MinHash deduplication (64 hashes over
// 3-word shingles, estimated Jaccard against kept documents), and PII redaction (regular expressions). E-mail addresses use an example domain; numbers are fake.
// Break it: no deduplication (the cookie notice and copies stay), a Jaccard threshold of 0.3 (distinct articles thrown away), no PII step (numbers leak).
const PL = ['Mombasa', 'Kisumu', 'Nakuru', 'Arusha', 'Dodoma', 'Tanga', 'Mwanza', 'Eldoret'], CR = ['chai', 'kahawa', 'mahindi', 'korosho'];
const SWT = [p => `Mvua kubwa imenyesha ${p} jana usiku na barabara nyingi zimefungwa.`, (p, c) => `Wakulima wa ${c} katika eneo la ${p} wanasema bei imepanda mwaka huu.`, p => `Serikali ya kaunti ya ${p} imejenga barabara mpya kuelekea sokoni.`, p => `Shule za ${p} zitafunguliwa wiki ijayo baada ya likizo ndefu.`, p => `Timu ya ${p} imeshinda mechi ya jana kwa mabao mawili.`, p => `Hospitali mpya imefunguliwa katika mji wa ${p} kwa ajili ya wagonjwa wa kisukari.`, (p, c) => `Bei ya ${c} sokoni ${p} imeshuka kwa sababu ya mavuno mengi.`, p => `Wavuvi wa ${p} wanaomba msaada wa boti mpya na nyavu.`];
const ENT = [p => `Heavy rain fell in ${p} last night and many roads were closed.`, (p, c) => `Farmers in ${p} say the price of ${c} has risen this year.`, p => `The county of ${p} has built a new road to the market.`, p => `Schools in ${p} will reopen next week after a long holiday.`];
function rng(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
let DOCS = null;
function corpus() { if (DOCS) return DOCS; const r = rng(31), docs = [], arts = [];
  const article = (T) => { const p = pick(r, PL), c = pick(r, CR), idx = new Set(); while (idx.size < 3) idx.add(Math.floor(r() * T.length)); return [...idx].map(i => T[i](p, c)).join(' '); };
  for (let i = 0; i < 70; i++) { const a = article(SWT); arts.push(a); docs.push({ raw: a, kind: 'news', group: arts.length - 1 }); }
  for (let i = 0; i < 30; i++) { const g = Math.floor(r() * 70); docs.push({ raw: `${arts[g]} Tangazo: nunua simu mpya leo kwa bei nafuu.`, kind: 'copy', group: g }); }
  for (let i = 0; i < 18; i++) docs.push({ raw: 'Tovuti hii inatumia vidakuzi ili kuboresha huduma zetu. Bonyeza kukubali.', kind: 'cookie', group: 1000 });
  for (let i = 0; i < 12; i++) docs.push({ raw: 'bei nafuu bei nafuu simu simu simu bonyeza hapa bonyeza hapa bei nafuu ofa ofa ofa', kind: 'spam', group: 2000 + i });
  for (let i = 0; i < 18; i++) docs.push({ raw: [0, 1, 2].map(() => pick(r, ENT)(pick(r, PL), pick(r, CR))).join(' '), kind: 'english', group: 3000 + i });
  for (let i = 0; i < 12; i++) { const a = article(SWT), ph = `07${Math.floor(10 + r() * 89)} ${Math.floor(100 + r() * 899)} ${Math.floor(100 + r() * 899)}`; docs.push({ raw: `${a} Kwa maswali piga simu ${ph} au andika kwa mwandishi${i}@mfano.co.ke.`, kind: 'pii', group: 4000 + i }); }
  const wrapped = docs.map((d, i) => ({ ...d, id: i, html: i % 3 === 0 ? `<div class="nav">Nyumbani | Habari | Michezo</div><p>${d.raw}</p><footer>Haki zote zimehifadhiwa</footer>` : `<p>${d.raw}</p>` }));
  for (let i = wrapped.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [wrapped[i], wrapped[j]] = [wrapped[j], wrapped[i]]; }
  DOCS = wrapped; return DOCS; }
const SWS = new Set(['na', 'ya', 'wa', 'za', 'la', 'kwa', 'ni', 'katika', 'mpya', 'jana', 'leo', 'bei', 'hii', 'baada', 'ili', 'kuelekea']), ENS = new Set(['the', 'of', 'and', 'in', 'has', 'is', 'to', 'a', 'will', 'were', 'after', 'last', 'this']);
function strip(h) { return h.replace(/<div class="nav">.*?<\/div>/g, ' ').replace(/<footer>.*?<\/footer>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function langSw(t) { const w = t.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/); let s = 0, e = 0; w.forEach(x => { if (SWS.has(x)) s++; if (ENS.has(x)) e++; }); return s + e ? s / (s + e) : 0.5; }
function quality(t) { const w = t.toLowerCase().split(/\s+/).filter(Boolean); return new Set(w).size / Math.max(1, w.length); }
function hstr(s, seed) { let h = 2166136261 ^ seed; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function minhash(t) { const w = t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean), sh = []; for (let i = 0; i < w.length - 2; i++) sh.push(`${w[i]} ${w[i + 1]} ${w[i + 2]}`);
  return Array.from({ length: 64 }, (_, k) => sh.reduce((m, s) => Math.min(m, hstr(s, k * 7919 + 1)), 4294967295)); }
const PHONE = /0\d{3} \d{3} \d{3}/g, MAIL = /[a-z0-9.]+@[a-z0-9.]+\.[a-z]+/gi;
const TH = [null, 0.7, 0.3];
function run(st) { const D = corpus(), stages = [D.length]; let cur = D.map(d => ({ ...d, text: st.html ? strip(d.html) : d.html })); stages.push(cur.length);
  cur = cur.filter(d => langSw(d.text) > 0.8); stages.push(cur.length);
  if (st.qual) cur = cur.filter(d => quality(d.text) >= 0.6); stages.push(cur.length);
  const th = TH[st.dd]; if (th != null) { const kept = []; cur.forEach(d => { const mh = minhash(d.text); if (!kept.some(k => k.mh.filter((v, i) => v === mh[i]).length / 64 >= th)) kept.push({ ...d, mh }); }); cur = kept; } stages.push(cur.length);
  if (st.pii) cur = cur.map(d => ({ ...d, text: d.text.replace(PHONE, '[PHONE]').replace(MAIL, '[EMAIL]') })); stages.push(cur.length);
  const groups = {}; cur.forEach(d => { groups[d.group] = (groups[d.group] || 0) + 1; });
  const dupes = Object.values(groups).reduce((a, n) => a + (n - 1), 0), lostNews = 70 + 12 - new Set(cur.filter(d => d.kind === 'news' || d.kind === 'copy' || d.kind === 'pii').map(d => d.group)).size;
  const leaks = cur.filter(d => PHONE.test(d.text) || MAIL.test(d.text)).length; PHONE.lastIndex = 0; MAIL.lastIndex = 0;
  const html = cur.filter(d => /<|Nyumbani \|/.test(d.text)).length, spam = cur.filter(d => d.kind === 'spam').length;
  const sample = (cur.find(d => d.kind === 'pii') || cur[0] || { text: '' }).text;
  return { stages, kept: cur.length, dupes, lostNews, leaks, html, spam, sample, cookie: groups[1000] || 0 }; }

export default {
  slug: 'data-pipelines',
  title: 'Data pipelines: clean before you train',
  description: 'A lab in Nairobi builds a Swahili training set from a web crawl. Documents ride a conveyor through five gates, and each gate keeps less, and better.',
  overview: 'A language model learns from whatever it reads, so pre-training data is cleaned in stages before any training. Web crawls such as Common Crawl are full of markup, menus, cookie notices, spam, pages in other languages, duplicated articles and personal details. A typical pipeline strips HTML and boilerplate, identifies the language of each document and keeps confident matches, filters low-quality text with simple rules or a small model\'s perplexity, removes duplicates, and redacts personal information. Deduplication matters most: repeated text wastes compute and makes models memorise and regurgitate it. Exact duplicates are easy to hash, but near-duplicates, the same article with a different advert, need MinHash: cut each document into overlapping word shingles, keep the minimum hash of the shingles under many hash functions, and the share of matching minimums estimates the Jaccard similarity; locality-sensitive hashing finds candidate pairs without comparing everything. The threshold matters: too high and copies slip through, too low and distinct articles that share common phrases are thrown away. Finally, the mix across web, code, books, maths and languages is a design decision of its own; Llama 3 reported about half web data and a quarter code.',
  keywords: ['data pipeline', 'deduplication', 'minhash', 'quality filter', 'pii redaction', 'common crawl'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.12], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { html: true, qual: true, dd: 1, pii: true };
    const ink = '#151827';
    const belt = P.box(4.1, 0.06, 0.5, '#3A3D4A', { r: 0.03 }); belt.position.set(-0.95, 0.12, -0.15); floor.add(belt);
    const NAMES = ['Strip HTML', 'Swahili only', 'Quality', 'Dedup', 'PII'];
    const GX = i => -2.45 + 0.65 + i * 0.68;
    const gates = NAMES.map((n, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#6B5E86' }), g = new THREE.Group(); g.position.set(GX(i), 0.18, -0.15); floor.add(g);
      [-0.3, 0.3].forEach(z => { const p = P.box(0.06, 0.45, 0.06, '#fff', { material: mm }); p.position.set(0, 0, z); g.add(p); });
      const top = P.box(0.12, 0.06, 0.66, '#fff', { r: 0.02, material: mm }); top.position.set(0, 0.45, 0); g.add(top);
      const bin = P.box(0.42, 1, 0.3, '#C62828', { r: 0.02 }); bin.position.set(GX(i), 0.12, -0.75); bin.userData.noFit = true; floor.add(bin);
      return { mm, bin, g }; });
    const crawl = P.box(0.5, 0.35, 0.5, '#8A8A96', { r: 0.04 }); crawl.position.set(-2.65, 0.12, -0.15); floor.add(crawl);


    const sheetG = new THREE.BoxGeometry(0.12, 0.012, 0.16), sheets = new THREE.InstancedMesh(sheetG, new THREE.MeshLambertMaterial({ color: '#FBF8F1' }), 16); sheets.frustumCulled = false; sheets.userData.noFit = true; floor.add(sheets);
    /* panel */






    const keep = P.box(5.6, 0.9, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.12, 0.1); floor.add(keep);

    let R = null, t0 = 0;
    const m4 = new THREE.Matrix4();
    const wrapDoc = s => { const w = s.split(' '), lines = []; let l = ''; w.forEach(x => { if ((l + ' ' + x).length > 26) { lines.push(l); l = x; } else l = l ? `${l} ${x}` : x; }); if (l) lines.push(l); return lines.slice(0, 7).join('\n') + (lines.length > 7 ? '\n…' : ''); };
    function draw() {
      R = run(st);
      const on = [st.html, true, st.qual, st.dd > 0, st.pii];
      gates.forEach((g, i) => { g.mm.color.set(on[i] ? '#6B5E86' : '#C9C3B5'); const removed = R.stages[i] - R.stages[i + 1], h = 0.02 + removed / 160 * 1.2; g.bin.scale.y = h;  });





    }
    draw();
    const update = dt => { t0 += S.reduced ? 0 : dt; for (let i = 0; i < 16; i++) { const u = (t0 * 0.15 + i / 16) % 1, x = -2.45 + u * 3.5; m4.makeTranslation(x, 0.16, -0.15 + Math.sin(i * 2.1) * 0.08); sheets.setMatrixAt(i, m4); } sheets.instanceMatrix.needsUpdate = true; };
    update(0);
    const controls = [
      { type: 'buttons', label: 'Strip HTML', options: ['Off', 'On'], get: () => (st.html ? 1 : 0), act: i => { st.html = !!i; draw(); } },
      { type: 'buttons', label: 'Quality filter', options: ['Off', 'On'], get: () => (st.qual ? 1 : 0), act: i => { st.qual = !!i; draw(); } },
      { type: 'buttons', label: 'Dedup threshold', options: ['Off', '0.7', '0.3'], get: () => st.dd, act: i => { st.dd = i; draw(); } },
      { type: 'buttons', label: 'PII redaction', options: ['Off', 'On'], get: () => (st.pii ? 1 : 0), act: i => { st.pii = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'Kept', get: () => ({ v: String(R.kept), sub: 'of 160 crawled documents' }) },
      { label: 'Duplicates left', get: () => ({ v: String(R.dupes), sub: R.cookie > 1 ? `cookie notice ×${R.cookie}` : 'copies of kept documents', good: R.dupes <= 1, bad: R.dupes > 3 }) },
      { label: 'Leaks', get: () => ({ v: String(R.leaks), sub: 'documents with a phone or e-mail', good: R.leaks === 0, bad: R.leaks > 0 }) },
    ];
    const labels = [
      { name: 'belt', t: 'Five gates', d: 'Each one lets fewer documents past', icon: 'box', atV: V(-2.9, 0.3, -0.15) },
    ];
    const reset = () => { Object.assign(st, { html: true, qual: true, dd: 1, pii: true }); draw(); };
    const breaks = [
      { label: 'No deduplication', hint: 'Copies kept', on: () => { reset(); st.dd = 0; draw(); }, off: reset },
      { label: 'Threshold 0.3', hint: 'Far too aggressive', on: () => { reset(); st.dd = 2; draw(); }, off: reset },
      { label: 'No PII redaction', hint: 'Numbers left in', on: () => { reset(); st.pii = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.dd === 0) return { ok: false, msg: `<b>${R.dupes} duplicates stay in.</b> The cookie notice appears ${R.cookie} times and 30 articles appear twice with only the advert changed. Training repeats them, wasting compute and teaching the model to recite them word for word. MinHash at 0.7 removes near-copies and keeps distinct articles.` };
      if (st.dd === 2) return { ok: false, msg: `<b>${R.lostNews} good articles thrown away.</b> At a Jaccard threshold of 0.3, articles that merely share common phrases such as "imefunguliwa katika mji wa" count as copies of each other, so the set shrinks to ${R.kept} documents. Real copies with a changed advert sit around 0.75 to 0.9; set the threshold just below that.` };
      if (!st.pii) return { ok: false, msg: `<b>${R.leaks} documents still contain phone numbers or e-mail addresses.</b> Models can memorise and repeat personal details seen in training. A redaction step replaces them with [PHONE] and [EMAIL] before training.` };
      if (!st.html && R.html) return { ok: false, msg: `<b>Menus and tags are still in the text.</b> Without stripping HTML, ${R.html} documents keep "Nyumbani | Habari | Michezo" and markup, which the model would learn to produce. ` };
      if (!st.qual && R.spam) return { ok: false, msg: `<b>${R.spam} spam page${R.spam === 1 ? '' : 's'} kept.</b> "bei nafuu bei nafuu simu simu" passes language ID but fails any quality check: under 60% of its words are distinct.` };
      return { ok: true, msg: `<b>${R.kept} clean documents.</b> HTML and menus stripped, English pages and spam dropped, ${R.stages[2] - R.stages[3]} near-copies removed at 0.7 (${R.dupes} duplicates left, ${R.lostNews} good articles lost), and phone numbers and e-mails redacted.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'The crawl', home: true, say: 'A lab in Nairobi builds a Swahili training set from a web crawl: news, copies, cookie notices, spam, English pages and contact details.', act: m => m.set({ html: true, qual: true, dd: 1, pii: true }) },
    { t: 'Five gates', home: true, say: 'Each document passes five gates: strip the web page, keep Swahili, drop spam, remove near-duplicates, and redact personal details.', act: m => m.set({}) },
    { t: 'MinHash', home: true, say: 'Near-duplicates are found by comparing short fingerprints of each document. Copies with a different advert score about three quarters or more.', act: m => m.set({}) },
    { t: 'No dedup', home: true, say: 'Skip deduplication, and the cookie notice and thirty copied articles stay in, ready to be memorised.', act: m => m.set({ dd: 0 }) },
    { t: 'Too aggressive', home: true, say: 'Set the threshold far too low, and distinct articles that share a phrase are thrown away.', act: m => m.set({ dd: 2 }) },
    { t: 'Leaks', home: true, say: 'Skip redaction, and phone numbers and e-mail addresses go into training.', act: m => m.set({ dd: 1, pii: false }) },
  ],
  check: [
    { q: 'Why deduplicate training data?', options: ['Repeats waste compute and cause memorisation', 'To change the language', 'To add personal data'], answer: 0, why: 'The single most useful cleaning step.' },
    { q: 'What does MinHash estimate?', options: ['The Jaccard similarity of two documents\' shingles', 'Document length', 'The language'], answer: 0, why: 'Share of matching minimum hashes.' },
    { q: 'What goes wrong with a very low dedup threshold?', options: ['Distinct documents are removed as copies', 'Copies slip through', 'Spam is kept'], answer: 0, why: 'Shared phrases look like duplication.' },
  ],
  terms: [
    ['Pre-training data', 'The large text corpus a model first learns from.'],
    ['Boilerplate', 'Menus, footers and notices repeated across pages.'],
    ['Language ID', 'Classifying which language a document is in.'],
    ['MinHash', 'Fingerprints whose overlap estimates Jaccard similarity.'],
    ['Shingle', 'A short overlapping run of words.'],
    ['PII', 'Personal details such as phone numbers and e-mails.'],
  ],
  deeper: '<p><b>African-language data.</b> Swahili, Hausa, Amharic and Yoruba web text is scarce and heavily duplicated, with many pages copied from a few news sites. Careful deduplication and language ID matter even more when data is small; projects such as Masakhane build cleaned corpora for many African languages.</p><p><b>The mix.</b> After cleaning comes the recipe: how much web, code, books and maths, and how much of each language.</p><p><b>About this machine.</b> All five stages run for real on 160 seeded documents; phone numbers are fake and e-mail addresses use an example domain.</p>',
  code: {
    title: 'MinHash',
    note: 'Adapted from the course\'s data-pipelines lesson.',
    text: `
def shingles(text, k=3):
    w = text.lower().split()
    return {" ".join(w[i:i + k]) for i in range(len(w) - k + 1)}

def minhash(text, n=64):
    sh = shingles(text)
    return [min(hash((seed, s)) for s in sh) for seed in range(n)]

def similar(a, b):
    return sum(x == y for x, y in zip(a, b)) / len(a)   # ≈ Jaccard
`,
  },
};
