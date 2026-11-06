// Speaker verification: an invented mobile-money helpline in Uganda lets customers log in by voice. Each call's embedding is compared with the customer's enrolled voiceprint
// by cosine similarity; 200 genuine calls (teal) and 200 impostor calls (orange) pile up as columns along the score axis, and a glass gate at the threshold accepts what lies right of it.
// Scores are generated with a fixed seed; false accepts, false rejects and the equal error rate are computed live.
// Break it: threshold too low (impostors walk in), calls on a cheap phone line when the threshold was tuned on studio audio (genuine scores drop), one noisy enrolment sample.
const N = 200, BINS = 40, LO = -0.2, HI = 1.0;
function scores(st) {
  let seed = 31; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const g = () => { const u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  let gm = 0.63, gs = 0.1, im = 0.2, is = 0.1;
  if (st.phone) { gm -= 0.12; gs += 0.02; im += 0.02; }        // a narrowband phone channel the model never saw
  if (st.enrol === 0) { gm -= 0.1; gs += 0.04; }             // one noisy enrolment sample
  if (st.norm && st.phone) { gm += 0.12; im += 0.03; }   // score normalisation against a cohort from the same channel
  return { gen: Array.from({ length: N }, () => gm + gs * g()), imp: Array.from({ length: N }, () => im + is * g()) };
}
const rate = (a, f) => a.filter(f).length / a.length;
function eer(gen, imp) { let best = { d: 9 }; for (let t = LO; t <= HI; t += 0.005) { const far = rate(imp, x => x >= t), frr = rate(gen, x => x < t); if (Math.abs(far - frr) < best.d) best = { d: Math.abs(far - frr), t, e: (far + frr) / 2 }; } return best; }

export default {
  slug: 'speaker-recognition-verification',
  title: 'Speaker verification: is it really you?',
  description: 'An invented mobile-money helpline in Uganda lets customers log in by voice. Genuine and impostor calls pile up by how closely they match the enrolled voiceprint, and a gate at the threshold decides. Then lower the threshold, take calls on a cheap phone line, or enrol from one noisy sample.',
  overview: 'Speaker verification asks whether a voice belongs to a claimed person. At enrolment, a few clean recordings are turned into embeddings by a network such as ECAPA-TDNN, trained with an angular-margin loss so that voices of the same person cluster together; their average is the voiceprint. At login, the new call\'s embedding is compared by cosine similarity and accepted above a threshold. Every threshold trades false accepts, impostors let in, against false rejects, customers turned away; the equal error rate is where the two meet, and the operating point depends on the cost of each mistake. Scores shift when the channel changes, from studio audio to a phone line, so thresholds must be tuned on the real channel, with score normalisation against a cohort. One noisy enrolment sample spoils the voiceprint; average several clean ones.',
  keywords: ['speaker verification', 'voice biometrics', 'cosine similarity', 'equal error rate', 'ecapa-tdnn', 'threshold'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.55, 0], dir: [0.1, 0.95, 1.2], half: 1.5, wide: 5.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { t: 0.45, phone: false, enrol: 1, norm: false };
    const ink = '#151827', W = 5.0, X = s => -W / 2 + (s - LO) / (HI - LO) * W, bw = W / BINS;
    const base = P.box(5.8, 0.12, 2.6, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0); S.add(base);
    const rail = P.box(W + 0.2, 0.05, 1.7, '#FBF8F1', { r: 0.03 }); rail.position.set(0, 0.12, -0.15); S.add(rail);
    const mk = (z, col) => Array.from({ length: BINS }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: col }), b = P.box(bw * 0.86, 1, 0.42, col, { r: 0.01, material: mm }); b.position.set(-W / 2 + (i + 0.5) * bw, 0.17, z); b.userData.noFit = true; S.add(b); return { b, mm }; });
    const genB = mk(-0.55, C.teal), impB = mk(0.3, C.orange);
    const keep = P.box(0.3, 1.2, 0.3, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.17, -0.15); S.add(keep);
    [0, 0.25, 0.5, 0.75, 1].forEach(s => { const t = S.text(s.toFixed(2), { size: 0.1, weight: 800, color: '#5A5A66' }); t.position.set(X(s), 0.18, 0.62); S.add(t); });
    const ax = S.text('cosine similarity to the voiceprint →', { size: 0.09, weight: 700, color: '#5A5A66' }); ax.position.set(0.6, 0.15, 0.95); S.add(ax);
    const tagG = S.text('genuine', { size: 0.13, weight: 800, color: '#0F6E61' }); tagG.position.set(X(-0.1), 0.18, -0.55); S.add(tagG);
    const tagI = S.text('impostor', { size: 0.13, weight: 800, color: '#A3501F' }); tagI.position.set(X(-0.1), 0.18, 0.3); S.add(tagI);
    /* the gate */
    const gate = new THREE.Group(); S.add(gate);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.3, 1.5), new THREE.MeshBasicMaterial({ color: '#3B3F8F', transparent: true, opacity: 0.25, depthWrite: false })); glass.position.y = 0.8; glass.layers.set(1); gate.add(glass);
    const post = P.box(0.06, 1.35, 0.06, '#3B3F8F', { r: 0.02 }); post.position.set(0, 0.15, -0.9); gate.add(post);
    const gT = S.text('', { size: 0.1, weight: 800, color: '#FFFFFF', bg: '#3B3F8F', top: true, face: 'cam' }); gT.position.set(0, 1.62, -0.9); gate.add(gT);
    gate.userData.noFit = true;
    const sideA = S.text('accept →', { size: 0.09, weight: 800, face: 'front', color: '#3B3F8F' }); sideA.userData.noFit = true; S.add(sideA);

    let R = null;
    function draw() {
      const sc = scores(st), hist = a => { const h = Array(BINS).fill(0); a.forEach(x => { const i = Math.floor((x - LO) / (HI - LO) * BINS); if (i >= 0 && i < BINS) h[i]++; }); return h; };
      const hg = hist(sc.gen), hi = hist(sc.imp), mx = Math.max(...hg, ...hi);
      const fill = (B, h) => B.forEach((b, i) => { b.b.scale.y = Math.max(0.004, h[i] / mx * 0.9); b.b.visible = h[i] > 0; });
      fill(genB, hg); fill(impB, hi);
      // genuine calls rejected fade; impostors accepted turn red
      impB.forEach((b, i) => { const s = LO + (i + 0.5) / BINS * (HI - LO); b.mm.color.set(s >= st.t ? '#D64545' : '#F0C3A8'); });
      genB.forEach((b, i) => { const s = LO + (i + 0.5) / BINS * (HI - LO); b.mm.color.set(s >= st.t ? C.teal : '#9ACFC6'); });
      gate.position.set(X(st.t), 0, -0.15); gT.userData.set(`threshold ${st.t.toFixed(2)}`);
      sideA.position.set(X(st.t) + 0.35, 0.27, -0.88);
      const far = rate(sc.imp, x => x >= st.t), frr = rate(sc.gen, x => x < st.t), E = eer(sc.gen, sc.imp);
      R = { far, frr, E, sc };
    }
    draw();
    const controls = [
      { type: 'slider', label: 'Threshold', min: 0, max: 0.9, step: 0.01, get: () => st.t, set: v => { st.t = v; draw(); }, fmt: v => v.toFixed(2) },
      { type: 'buttons', label: 'Calls come in over', options: ['Studio-quality audio', 'A cheap phone line'], get: () => (st.phone ? 1 : 0), act: i => { st.phone = !!i; draw(); } },
      { type: 'buttons', label: 'Enrolment', options: ['One noisy sample', 'Three clean, averaged'], get: () => st.enrol, act: i => { st.enrol = i; draw(); } },
      { type: 'toggle', label: 'Normalise scores on the phone channel', short: 'score norm', get: () => st.norm, set: v => { st.norm = v; draw(); } },
    ];
    const readouts = [
      { label: 'False accepts', get: () => ({ v: `${(R.far * 100).toFixed(1)}%`, sub: 'impostors let in', bad: R.far > 0.02, good: R.far <= 0.01 }) },
      { label: 'False rejects', get: () => ({ v: `${(R.frr * 100).toFixed(1)}%`, sub: 'customers turned away', bad: R.frr > 0.05, good: R.frr <= 0.02 }) },
      { label: 'Equal error rate', get: () => ({ v: `${(R.E.e * 100).toFixed(1)}%`, sub: `where they meet, at ${R.E.t.toFixed(2)}` }) },
    ];
    const labels = [
      { name: 'gen', t: 'Genuine calls', d: 'Pale: turned away', icon: 'check', atV: V(-W / 2 - 0.1, 0.4, -0.45) },
      { name: 'imp', t: 'Impostor calls', d: 'Red: let in', icon: 'eye', atV: V(W / 2 + 0.1, 0.3, 0.15) },
    ];
    const reset = () => { Object.assign(st, { t: 0.45, phone: false, enrol: 1, norm: false }); draw(); };
    const breaks = [
      { label: 'Threshold too low', hint: '0.25', on: () => { reset(); st.t = 0.25; draw(); }, off: reset },
      { label: 'Cheap phone line', hint: 'Threshold set on studio audio', on: () => { reset(); st.phone = true; draw(); }, off: reset },
      { label: 'One noisy enrolment', hint: 'A single sample', on: () => { reset(); st.enrol = 0; draw(); }, off: reset },
    ];
    function status() {
      const fa = (R.far * 100).toFixed(1), fr = (R.frr * 100).toFixed(1);
      if (st.phone && !st.norm && R.frr > 0.1) return { ok: false, msg: `<b>Real customers turned away.</b> The threshold of ${st.t.toFixed(2)} was tuned on studio audio. Over a cheap phone line every genuine score drops, and ${fr}% of customers are rejected while impostors still mostly fail (${fa}%). Tune the threshold on calls from the real channel, or normalise scores against a cohort recorded on it.` };
      if (st.enrol === 0 && R.frr > 0.05) return { ok: false, msg: `<b>A spoilt voiceprint.</b> Enrolled from one noisy sample, the voiceprint carries the noise, so genuine calls match it worse and spread wider: ${fr}% are rejected at ${st.t.toFixed(2)}, and the equal error rate rises to ${(R.E.e * 100).toFixed(1)}%. Enrol from three or more clean samples and average them.` };
      if (R.far > 0.05) return { ok: false, msg: `<b>Impostors walk in.</b> At a threshold of ${st.t.toFixed(2)}, ${fa}% of impostor calls score above the gate and get into someone else's account. Hardly any customer is turned away (${fr}%), which is why low thresholds are tempting. For money, false accepts cost far more: raise the threshold, and add a second check for borderline scores.` };
      if (R.frr > 0.1) return { ok: false, msg: `<b>Customers locked out.</b> At a threshold of ${st.t.toFixed(2)} almost no impostor gets in (${fa}%), but ${fr}% of genuine customers are turned away and must call an agent. Move the gate back towards the equal error point, ${R.E.t.toFixed(2)}.` };
      return { ok: true, msg: `<b>${fa}% false accepts, ${fr}% false rejects.</b> ${st.phone ? 'Scores normalised on the phone channel bring genuine calls back above the gate.' : 'Three clean enrolment samples give a tight voiceprint, so genuine and impostor scores barely overlap.'} The equal error rate is ${(R.E.e * 100).toFixed(1)}%, at a threshold of ${R.E.t.toFixed(2)}; for money, sit a little above it.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Log in by voice', home: true, say: 'A mobile-money helpline in Uganda lets customers log in by voice. Each call is compared with the voiceprint they enrolled.', act: m => m.set({ t: 0.45, phone: false, enrol: 1, norm: false }) },
    { t: 'Two piles', home: true, say: 'Genuine calls score high, impostors low. A gate at the threshold accepts everything to its right.', act: m => m.set({}) },
    { t: 'The trade', home: true, say: 'Lower the gate, and impostors walk in. Raise it, and real customers are turned away. Where the two errors meet is the equal error rate.', act: m => m.set({ t: 0.25 }) },
    { t: 'A phone line', home: true, say: 'Tuned on studio audio, the same threshold turns away many customers calling on a cheap phone line. Their scores all drop.', act: m => m.set({ t: 0.45, phone: true }) },
    { t: 'Normalise', home: true, say: 'Normalise scores against voices recorded on the same channel, and genuine calls clear the gate again.', act: m => m.set({ norm: true }) },
    { t: 'Clean enrolment', home: true, say: 'Enrol from one noisy sample, and the voiceprint is spoilt. Average three clean samples instead.', act: m => m.set({ phone: false, norm: false, enrol: 0 }) },
  ],
  check: [
    { q: 'What does lowering the verification threshold do?', options: ['More impostors are accepted, fewer customers rejected', 'Fewer impostors and fewer rejections', 'Nothing changes'], answer: 0, why: 'False accepts and false rejects trade off.' },
    { q: 'What is the equal error rate?', options: ['The error rate where false accepts equal false rejects', 'The share of calls answered', 'The average similarity'], answer: 0, why: 'It summarises the trade in one number.' },
    { q: 'Why tune the threshold on the real calling channel?', options: ['Scores shift when the audio channel changes', 'Phone lines are faster', 'It makes voiceprints smaller'], answer: 0, why: 'Studio-tuned thresholds reject phone callers.' },
  ],
  terms: [
    ['Speaker verification', 'Checking a voice against one claimed identity.'],
    ['Voiceprint', 'The averaged embedding from enrolment recordings.'],
    ['Cosine similarity', 'How closely two embeddings point the same way.'],
    ['False accept', 'An impostor let in.'],
    ['False reject', 'A genuine speaker turned away.'],
    ['Equal error rate', 'The point where false accepts and false rejects are equal.'],
  ],
  deeper: '<p><b>Diarisation.</b> The same embeddings answer "who spoke when" in a recording: cut it into segments, embed each, and cluster them by speaker.</p><p><b>Spoofing.</b> A recording or a cloned voice can fool a verifier. Voice login for money needs liveness and anti-spoofing checks too, a later lesson in this track.</p><p><b>About this machine.</b> The scores are generated with a fixed seed to match typical distributions. False accepts, false rejects and the equal error rate are computed live from them.</p>',
  code: {
    title: 'Enrol, verify, and find the EER',
    note: 'Adapted from the course\'s speaker verification lesson.',
    text: `
import numpy as np

def enrol(embed, clips):
    v = np.mean([embed(c) for c in clips], axis=0)   # 3+ clean samples
    return v / np.linalg.norm(v)

def verify(embed, voiceprint, clip, threshold):
    e = embed(clip); e /= np.linalg.norm(e)
    return float(e @ voiceprint) >= threshold

def eer(genuine, impostor):
    best = (1.0, None)
    for t in np.linspace(-1, 1, 801):
        far, frr = (impostor >= t).mean(), (genuine < t).mean()
        best = min(best, (abs(far - frr), t))
    return best[1]
`,
  },
};
