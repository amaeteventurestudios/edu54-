// Evidence, confidence and unknowns: the student's ledger for what they know about their own compiled ledger.c. Every fact is a record with a content id
// (ev_ + SHA-256 of sorted-key JSON, without the file's name or path), a confidence (observed / derived / inferred), an authority and its limitations.
// Claims are inferred predictions (C semantics: truncating division, 32-bit wrap) checked only against observed runs: pass, fail, unknown (some inputs run) or unsupported.
// The run "results" come from the machine's own arithmetic (the 0x66666667 multiply and the table 1,2,3,4,4), not from the prediction code.
// Breaks: count the decompiler's pseudocode as a run; round partial coverage up; predict with floor division (−143 vs −142); strip a limitation after hashing.
const K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
function sha256(str) {
  const b = Array.from(unescape(encodeURIComponent(str)), c => c.charCodeAt(0)), n = b.length;
  b.push(0x80); while (b.length % 64 !== 56) b.push(0);
  const bits = n * 8; for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (bits >>> (i * 8)) & 255);
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64), r = (x, k) => (x >>> k) | (x << (32 - k));
  for (let o = 0; o < b.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
    let [a, bb, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) { const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0; h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0; }
    [a, bb, c, d, e, f, g, h].forEach((v, i) => { H[i] = (H[i] + v) | 0; });
  }
  return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}
const canon = v => Array.isArray(v) ? `[${v.map(canon).join(',')}]` : v && typeof v === 'object' ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}` : JSON.stringify(v);
const LIM = ['Default-space addresses use lowercase 0x-prefixed hexadecimal.', 'Unresolved targetless flows remain unknown.'];
function record(path) {
  return { subject: { name: 'ledger-x86_64-O1.o', digest: { sha256: '9a4a8082ba5e285a732552981a6935e0c5255725664f380e37c44ebfb04d803f' }, format: 'elf', architecture: 'x86_64', local_path: path }, provider: { id: 'ghidra', name: 'Ghidra', version: '12.1.4' }, operation: 'analyze_function', parameters: { procedure: 'grade' }, confidence: 'observed', authority: 'shipped-artifact', limitations: LIM.slice() };
}
function evId(rec, withPath) {
  const s = { ...rec.subject }; if (!withPath) { delete s.name; delete s.local_path; }
  return 'ev_' + sha256(canon({ ...rec, subject: s }));
}
/* the machine: grade as compiled (magic divide, add −6, unsigned compare, table), percent_change as idivl (truncating) */
const TABLE = [1, 2, 3, 4, 4];
function runGrade(x) { const p = BigInt(x) * 0x66666667n, q = Number(p >> 34n) + (p < 0n ? 1 : 0), i = (q - 6) >>> 0; return i > 4 ? 0 : TABLE[i]; }
const w32 = x => x | 0;
function runPct(a, b) { if (a === 0) return 0; return w32(Math.trunc(w32(w32(b - a) * 100) / a)); }
/* predictions, written from the derived models (C semantics unless py) */
function predict(c, py) {
  if (c.fn === 'grade') return c.args.map(([x]) => { const q = Math.trunc(x / 10) - 6; return q >= 0 && q <= 4 ? TABLE[q] : 0; });
  return c.args.map(([a, b]) => a === 0 ? 0 : py ? Math.floor(((b - a) * 100) / a) : Math.trunc(((b - a) * 100) / a));
}
const CLAIMS = [
  { id: 'grade(55)', fn: 'grade', args: [[55]] },
  { id: 'grade(95)', fn: 'grade', args: [[95]] },
  { id: 'grade(90..100)', fn: 'grade', args: Array.from({ length: 11 }, (_, i) => [90 + i]) },
  { id: 'percent_change(12400, 15500)', fn: 'pct', args: [[12400, 15500]] },
  { id: 'percent_change(-7, 3)', fn: 'pct', args: [[-7, 3]] },
  { id: 'grade(-5)', fn: 'grade', args: [[-5]] },
];
function ledger(st) {
  const runs = [];
  if (st.runs) {
    [[55], [95], [-5]].forEach(a => runs.push({ fn: 'grade', a, v: runGrade(a[0]) }));
    [[12400, 15500], [-7, 3]].forEach(a => runs.push({ fn: 'pct', a, v: runPct(a[0], a[1]) }));
    [100, 90, 91, 92, 93, 94, 96, 97, 98, 99].slice(0, Math.max(0, st.range - 1)).forEach(x => runs.push({ fn: 'grade', a: [x], v: runGrade(x) }));
  }
  const res = CLAIMS.map(c => {
    const pr = predict(c, st.py); let cov = 0, bad = null;
    c.args.forEach((a, i) => {
      const hit = runs.filter(r => r.fn === c.fn && r.a.join() === a.join());
      if (hit.length) { cov++; hit.forEach(r => { if (r.v !== pr[i] && !bad) bad = { a, want: pr[i], got: r.v }; }); }
      else if (st.pseudo && c.fn === 'grade') cov++;
    });
    let s = bad ? 'fail' : cov === c.args.length ? 'pass' : cov ? 'unknown' : 'unsupported';
    if (s === 'unknown' && st.round) s = 'pass';
    return { c, s, cov, n: c.args.length, bad, pr };
  });
  return { runs, res };
}

export default {
  slug: 'evidence-confidence-and-unknowns',
  title: 'Evidence: what you saw, what you worked out, what you guessed',
  description: 'The student keeps a ledger of what they know about their own program: what was seen, what was worked out, and what is still a guess.',
  overview: 'A finding about a compiled program should say how it is known. Each fact becomes a record with three levels of confidence: observed (read from the bytes, or from a run), derived (computed from observed records, such as the switch table read out of the grade function) and inferred (a prediction nothing has yet confirmed). An authority says where it came from: the file on disk, a run you controlled, or your own judgement. Each record carries its limitations as plain sentences, such as that the run used a build for another chip from the same source. The record\'s id is a SHA-256 hash of its sorted JSON content, leaving out the file name and path, so the same observation of the same bytes gets the same id on any machine, and dropping a limitation changes it. Predictions follow C, not Python: C division truncates toward zero, so (3 − −7) × 100 / −7 is −142, where floor division gives −143. A claim moves from inferred to pass only when observed runs cover every input and agree; some inputs run is unknown, none is unsupported, and a decompiler\'s pseudocode is an observation of what the tool printed, never of behaviour. Unknowns stay open as records too.',
  keywords: ['evidence', 'provenance', 'content addressing', 'SHA-256', 'binary analysis', 'decompiler', 'confidence'],
  orient: 'landscape',
  view: { target: [-0.6, 0.3, 0], dir: [0.4, 0.85, 1.3], half: 1.3, wide: 4.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { runs: true, range: 2, path: 0, pseudo: false, round: false, py: false, strip: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    const CONF = { observed: '#5B8DB8', derived: '#C9A227', inferred: '#7B6FA8' };
    /* the ledger: one cube per record, a row per confidence (observed, derived, inferred); taller observed cubes are real runs */
    const LX = -2.5, LZ = j => -0.7 + j * 0.45;
    const lp = P.box(1.5, 0.03, 1.4, '#FFFFFF', { r: 0.03 }); lp.position.set(LX + 0.6, 0, -0.25); S.add(lp);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 40); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    /* each claim a tower: its height is how much of its inputs were run; green pass, red fail, gold unknown, grey unsupported */
    const cRows = CLAIMS.map((c, i) => { const t = P.tower(0.34, 0.34, GOOD); t.position.set(-0.4 + i * 0.45, 0, -0.35); t.userData.set({ cap: '' }); S.add(t); return t; });
    /* one record sealed by its content id: the seal turns red when the record no longer matches its id */
    const rec = P.box(0.6, 0.35, 0.45, '#FFFDF5', { r: 0.04 }); rec.position.set(1.2, 0, 0.6); S.add(rec);
    const sealM = new THREE.MeshLambertMaterial({ color: GOOD }), seal = P.box(0.22, 0.08, 0.22, '#fff', { r: 0.03, material: sealM }); seal.position.set(1.2, 0.35, 0.6); S.add(seal);
    const pathA = P.box(0.25, 0.12, 0.2, '#8E8C84', { r: 0.03 }); S.add(pathA);
    S.add(P.keep(-2.65, 2.05, 1.1, -0.95, 1.0));

    const PATHS = ['/Users/student/fixtures/ledger-x86_64-O1.o', '/home/student/re/ledger-x86_64-O1.o'];
    const ID0 = evId(record(PATHS[0]), false);
    let L = null, R = { stored: '', now: '', refused: false };
    function draw() {
      L = ledger(st);
      const rec = record(PATHS[st.path]), stored = evId(rec, false);
      if (st.strip) rec.limitations.pop();
      R = { stored, now: evId(rec, false), refused: false, n: rec.limitations.length }; R.refused = R.now !== R.stored;
      sealM.color.set(R.refused ? RED : GOOD);
      pathA.position.set(st.path ? 0.6 : 0.7, 0, st.path ? 0.85 : 0.4);
      const nObs = 2 + L.runs.length, nDer = 2, nInf = CLAIMS.length;
      let k = 0;
      const put = (n, j, c) => { for (let i = 0; i < n; i++, k++) { dummy.position.set(LX + i * 0.12, 0.03, LZ(j)); dummy.scale.set(0.09, 0.08 + (j === 0 && i >= 2 ? 0.12 : 0), 0.3); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); im.setColorAt(k, col.set(j === 0 && i >= 2 && st.pseudo && i === 2 ? RED : c)); } };
      put(nObs, 0, CONF.observed); put(nDer, 1, CONF.derived); put(nInf, 2, CONF.inferred);
      for (; k < 40; k++) { dummy.scale.set(0, 0, 0); dummy.updateMatrix(); im.setMatrixAt(k, dummy.matrix); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      L.res.forEach((r, i) => cRows[i].userData.set({ h: 0.08 + (r.n ? r.cov / r.n : 0) * 0.9, color: { pass: GOOD, fail: RED, unknown: '#C9A227', unsupported: '#8E8C84' }[r.s] }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const cnt = s => L.res.filter(r => r.s === s).length;
    const controls = [
      { type: 'toggle', label: 'Run the host build', short: 'Runs', get: () => st.runs, set: v => set({ runs: !!v }) },
      { type: 'slider', label: 'Range inputs run (90 to 100)', min: 1, max: 11, step: 1, get: () => st.range, set: v => set({ range: Math.round(v) }), fmt: v => `${Math.round(v)} of 11` },
      { type: 'buttons', label: 'File path', options: ['Mac folder', 'Linux folder'], get: () => st.path, act: i => set({ path: i }) },
    ];
    const readouts = [
      { label: 'Claims passed', get: () => ({ v: `${cnt('pass')} of ${CLAIMS.length}`, sub: `${cnt('unknown')} unknown · ${cnt('unsupported')} unsupported`, good: cnt('pass') === CLAIMS.length && !st.pseudo && !st.round }) },
      { label: 'Failed', get: () => ({ v: String(cnt('fail')), sub: 'a run disagreed', bad: cnt('fail') > 0, good: !cnt('fail') }) },
      { label: 'Record id', get: () => ({ v: R.refused ? 'refused' : R.now.slice(0, 11) + '…', sub: R.refused ? 'content changed' : 'SHA-256 of content', bad: R.refused, good: !R.refused }) },
    ];
    const labels = [
      { name: 'ledger', t: 'The ledger', d: 'A cube per record: back row observed (taller: real runs), then derived, then inferred', icon: 'layers', atV: V(LX - 0.12, 0.1, LZ(1)) },
      { name: 'claims', t: 'Claims, checked', d: 'A tower per prediction, as tall as the share of its inputs actually run: green pass, red fail, gold unknown, grey unsupported', icon: 'check', atV: V(-0.4 + (CLAIMS.length - 1) * 0.45 + 0.2, 0.9, -0.35) },
      { name: 'id', t: 'A record by content', d: 'Sealed by its content id, which leaves the file\'s path out (grey block); the seal turns red if the record changed after hashing', icon: 'book', atV: V(1.52, 0.15, 0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Count the decompiler\'s text as a run', hint: 'pseudocode as proof', on: () => set({ ...D0, runs: false, pseudo: true }), off: reset },
      { label: 'Round partial coverage up', hint: '2 of 11 called a pass', on: () => set({ ...D0, round: true }), off: reset },
      { label: 'Predict with floor division', hint: 'Python //, not C', on: () => set({ ...D0, py: true }), off: reset },
      { label: 'Strip a limitation after hashing', hint: 'the record looks stronger', on: () => set({ ...D0, strip: true }), off: reset },
    ];
    function status() {
      const f = L.res.find(r => r.s === 'fail'), part = L.res.find(r => r.cov < r.n && r.cov > 0);
      if (st.pseudo) return { ok: false, msg: `<b>With the decompiler's text counted as a run, the grade claims pass with no run at all.</b> The pseudocode is an observation of what the tool printed, not of what the function does when it runs. Only an observed run of the same function with the same inputs can move a claim from inferred to pass; with no runs, every claim is unsupported.` };
      if (st.py && f) return { ok: false, msg: `<b>${f.c.id} fails: the prediction says ${f.bad.want}, the run returned ${f.bad.got}.</b> The prediction used floor division, which rounds toward minus infinity; C and idivl truncate toward zero. The ledger did its job: a run disagreed, so the claim failed instead of passing quietly. Predict with C semantics.` };
      if (st.round) return { ok: false, msg: `<b>grade(90..100) is reported as a pass with runs for only ${L.res[2].cov} of its 11 inputs.</b> Two agreeing runs say nothing about the other nine. Partial coverage is unknown, not pass: keep it open and name the inputs still to run.` };
      if (st.strip) return { ok: false, msg: '<b>One limitation was dropped after the id was made, so the recomputed id no longer matches and the ledger refuses the record.</b> Limitations are content: a record without them looks stronger than the facts allow. Write limitations when you know them, and keep every one.' };
      if (!st.runs) return { ok: false, msg: '<b>No runs, so all six claims are unsupported.</b> Predictions from the table and divide models are inferred; they wait for observed runs before anything passes.' };
      if (part) return { ok: true, msg: `<b>${cnt('pass')} claims pass on observed runs; ${part.c.id} stays unknown with ${part.cov} of ${part.n} inputs run.</b> The id of the Ghidra record is the same in either folder, because the path isn't in the hash. Raise the range slider to 11 to close the last claim.` };
      return { ok: true, msg: `<b>All ${CLAIMS.length} claims pass, each backed by observed runs of every input.</b> Each run record says it used a host build of the same source, not the x86-64 object itself. That limitation travels with the claim.` };
    }
    return { update: dt => cRows.forEach(t => t.userData.tick(dt)), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three kinds of knowing', home: true, say: 'The student keeps a ledger about their own compiled program. Observed facts were read or run; derived facts were worked out from them; inferred facts are guesses still waiting.', act: m => m.set({ runs: false, range: 2, path: 0, pseudo: false, round: false, py: false, strip: false }) },
    { t: 'Runs decide', home: true, say: 'Run a build of the same source. Each run is an observed record, and claims whose inputs all ran and agree now pass.', act: m => m.set({ runs: true }) },
    { t: 'Some is not all', home: true, say: 'The range claim covers eleven scores, but only two have run. That is unknown, not a pass.', act: m => m.set({ range: 2 }) },
    { t: 'Run them all', home: true, say: 'Run every score in the range, and the last claim passes with nothing rounded up.', act: m => m.set({ range: 11 }) },
    { t: 'Same bytes, same id', home: true, say: 'Move the file to another folder. The record\'s id is a hash of its content without the path, so it stays the same.', act: m => m.set({ path: 1 }) },
    { t: 'Limitations are content', home: true, say: 'Drop one limitation after hashing, and the id no longer matches. The ledger refuses a record that claims more than it showed.', act: m => m.set({ path: 0, strip: true }) },
  ],
  check: [
    { q: 'The decompiler printed pseudocode for grade. What confidence does that give a claim about grade(55)?', options: ['None yet: the text observes the tool, not the function running', 'Observed, so the claim passes', 'Derived, so it passes'], answer: 0, why: 'Only an observed run of grade(55) can support it.', hint: 'Try Count the decompiler\'s text as a run.' },
    { q: 'A claim covers 11 inputs and 2 have agreeing runs. Its status?', options: ['Unknown', 'Pass', 'Fail'], answer: 0, why: 'Partial coverage is unknown.', hint: 'Move the range slider.' },
    { q: 'Why leave the file path out of the record\'s id?', options: ['So the same observation of the same bytes gets the same id on any machine', 'Paths are secret', 'It makes the hash faster'], answer: 0, why: 'The bytes\' own SHA-256 is in the subject instead.', hint: 'Switch the file path.' },
  ],
  terms: [
    ['Observed', 'Read from the bytes, or seen in a run.'],
    ['Derived', 'Computed from observed records.'],
    ['Inferred', 'A prediction nothing has confirmed yet.'],
    ['Authority', 'Where a fact came from: the file, a controlled run, or your judgement.'],
    ['Limitation', 'A sentence saying what a record cannot show.'],
    ['Content id', 'A hash of a record\'s content, so equal content gets an equal id.'],
  ],
  deeper: '<p><b>Unknowns are records too.</b> Each open question gets an id from its wording and the file\'s hash, and every change is a new revision that names the digest of the one before, a small hash chain. Only an observed run can resolve one.</p><p><b>Caches of answers.</b> A cached tool answer is keyed by the file, the tool and every setting; change one setting and every key changes. A replayed answer should say that it was replayed.</p><p><b>Target text is data.</b> Strings and pseudocode come from the program under study, which controls them. They are never instructions to the agent.</p><p><b>About this machine.</b> Record ids are real SHA-256 over sorted-key JSON, computed in the page (the record is cut down, so its id differs from a real tool\'s). The runs use the compiled arithmetic (the 0x66666667 divide and the table 1, 2, 3, 4, 4), separate from the prediction code.</p>',
  code: {
    title: 'Ids by content, claims by runs',
    note: 'Adapted from the course\'s evidence lesson.',
    text: `
import hashlib, json

def evidence_id(record):
    subject = {k: v for k, v in record["subject"].items() if k not in ("name", "local_path")}
    body = {**record, "subject": subject}
    body.pop("evidence_id", None)
    canon = json.dumps(body, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return "ev_" + hashlib.sha256(canon.encode()).hexdigest()

def check_claim(claim, runs):
    covered, bad = 0, False
    for args, want in zip(claim["inputs"], claim["predicted"]):
        hits = [r for r in runs if r["function"] == claim["function"] and r["args"] == args]
        covered += bool(hits)
        bad |= any(r["result"] != want for r in hits)
    if bad: return "fail"
    if covered == len(claim["inputs"]): return "pass"
    return "unknown" if covered else "unsupported"
`,
  },
};
