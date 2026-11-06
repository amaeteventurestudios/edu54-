// Vision pipeline capstone: a phone photo service for tobacco and maize growers in Malawi. A photo arrives, passes a data contract (size, type), is resized,
// a detector finds leaves, each leaf is cropped and classified, and a validated answer goes back. Every station shows its time; a tray of test photos runs through.
// Break it: no input check (a 40 MB photo or a PDF crashes the service), detector and classifier disagree on image format (BGR into an RGB model: every crop is called diseased),
// no confidence floor (a blurry photo still gets a confident-looking diagnosis).
const PHOTOS = [
  { n: 'clear leaf, rust', kind: 'ok', truth: 'rust', blur: 0 }, { n: 'clear leaf, healthy', kind: 'ok', truth: 'healthy', blur: 0 },
  { n: 'three leaves', kind: 'ok', truth: 'healthy', leaves: 3, blur: 0 }, { n: 'blurry, shaking hand', kind: 'ok', truth: 'healthy', blur: 1 },
  { n: '40 MB photo', kind: 'huge' }, { n: 'a PDF, not a photo', kind: 'pdf' },
];

export default {
  slug: 'vision-pipeline-capstone',
  title: 'A full vision pipeline, end to end',
  description: 'Capstone: a farm-photo service runs intake, model, checks and a cheap fallback from end to end. Each stage has a job, and each failure a place to be caught.',
  overview: 'A model is one part of a vision product. Around it sit a data contract that rejects bad inputs before they reach the model, preprocessing that must match what the model was trained on, a detector that finds the regions of interest, a classifier that judges each crop, and a response with a fixed shape that the app can rely on. Most production failures happen at the joins: a file the code did not expect, two stages that disagree about colour order or scaling, or an answer sent with false confidence. Timing each stage shows where the latency goes.',
  keywords: ['computer vision pipeline', 'ml production', 'data contracts pydantic', 'detector classifier pipeline', 'confidence threshold'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.85, 0], dir: [0.1, 0.5, 1.3], half: 1.7, wide: 6.8 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { contract: true, sameFormat: true, floor: true, idx: 0, clock: 0 };
    const ink = '#151827';
    const belt = P.box(6.2, 0.04, 0.42, '#5B6178', { r: 0.03 }); belt.position.set(0, 0.12, 0.35); floor.add(belt);
    /* ---------- stations ---------- */
    const STN = [
      { k: 'contract', n: 'check input', sub: 'type, size', c: C.teal },
      { k: 'resize', n: 'resize', sub: '640 px, RGB', c: C.grey },
      { k: 'detect', n: 'find leaves', sub: 'detector', c: C.indigo },
      { k: 'classify', n: 'classify crops', sub: 'per leaf', c: C.plum },
      { k: 'answer', n: 'answer', sub: 'fixed shape', c: '#2E7A45' },
    ];
    const stations = STN.map((s, i) => {
      const x = -2.6 + i * 1.3, m = new THREE.MeshLambertMaterial({ color: s.c });
      const b = P.box(0.9, 0.55, 0.62, s.c, { r: 0.06, material: m }); b.position.set(x, 0.16, 0.35); floor.add(b);
      return { ...s, x, b, m };
    });
    const card = P.box(0.26, 0.03, 0.34, '#FFFFFF', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#FFFFFF' }) }); card.userData.noFit = true; floor.add(card);

    /* ---------- results board ---------- */
    const WZ = -0.6, WW = 6.6, WH = 1.6;

    const rows = PHOTOS.map((p, i) => { const l = P.lamp('#3E9B5F', { h: 0.12, r: 0.09 }); l.position.set(-1.25 + i * 0.5, 0.12, 0.7); floor.add(l); return l; });
    /* ---------- running a photo ---------- */
    function run(p) {
      const t = { contract: 1, resize: 0, detect: 0, classify: 0, answer: 0 };
      if (p.kind !== 'ok') {
        if (st.contract) return { ok: true, stop: 0, msg: p.kind === 'huge' ? '"please send a smaller photo"' : '"please send a photo"', good: true, t };
        return { ok: false, stop: p.kind === 'huge' ? 1 : 1, crash: p.kind === 'huge' ? 'out of memory: 40 MB decoded to 600 MB' : 'cannot read PDF as an image', msg: 'error 500: no reply', t };
      }
      t.resize = 9; t.detect = 38; const n = p.leaves || 1; t.classify = 12 * n; t.answer = 1;
      const conf = p.blur ? 0.41 : 0.93;
      let label = p.truth;
      if (!st.sameFormat) label = 'blight';
      if (p.blur && st.floor) return { ok: true, stop: 4, msg: '"photo too blurry, please retake"', good: true, t, conf };
      const right = label === p.truth && !p.blur;
      return { ok: true, stop: 4, msg: `"${n > 1 ? `${n} leaves: ` : ''}${label}, ${Math.round((p.blur ? 0.41 : st.sameFormat ? conf : 0.97) * 100)}% sure"`, good: right, t, conf };
    }
    let R = null;
    function evaluate() {
      R = PHOTOS.map(run);
      R.forEach((r, i) => { rows[i].userData.set({ color: r.good ? '#3E9B5F' : C.red, on: true }); });
      const okRun = R[0].t;
      stations.forEach(s => {  });
      stations[0].m.color.set(st.contract ? C.teal : '#9A9AA6');

    }
    evaluate();
    function update(dt) {
      st.clock += dt; const per = S.reduced ? 1.2 : 3.2;
      const i = Math.floor(st.clock / per) % PHOTOS.length, ph = (st.clock % per) / per, r = R[i];
      const stopAt = r.stop, xEnd = stations[stopAt].x, u = Math.min(1, ph / 0.8), x = -3.3 + (xEnd + 0.1 + 3.3) * u;
      card.position.set(x, 0.78, 0.35); card.material.color.set(PHOTOS[i].kind === 'pdf' ? '#D9D2C4' : PHOTOS[i].kind === 'huge' ? '#C9774A' : PHOTOS[i].blur ? '#A9B89A' : '#6FAE4A');
       if (r.crash) {   }
    }
    const good = () => R.filter(r => r.good).length;
    const controls = [
      { type: 'toggle', label: 'Check every upload (type and size)', short: 'input check', get: () => st.contract, set: v => { st.contract = v; evaluate(); } },
      { type: 'toggle', label: 'Same image format in every stage', short: 'same format', get: () => st.sameFormat, set: v => { st.sameFormat = v; evaluate(); } },
      { type: 'toggle', label: 'Confidence floor before answering', short: 'confidence floor', get: () => st.floor, set: v => { st.floor = v; evaluate(); } },
    ];
    const readouts = [
      { label: 'Good replies', get: () => ({ v: `${good()} of ${PHOTOS.length}`, sub: 'right, or an honest "retake"', good: good() === PHOTOS.length, bad: good() < 4 }) },
      { label: 'Crashes', get: () => { const n = R.filter(r => r.crash).length; return { v: String(n), sub: 'no reply at all', bad: n > 0, good: n === 0 }; } },
      { label: 'Time per photo', get: () => { const t = R[0].t, tot = t.contract + t.resize + t.detect + t.classify + t.answer; return { v: `${tot} ms`, sub: `detector ${t.detect} ms of it` }; } },
    ];
    const labels = [
      { name: 'belt', t: 'Five stations', d: 'Each one\'s time on its front', icon: 'link', atV: V(-3.1, 0.4, 0.35) },
      { name: 'contract', t: 'Data contract', d: 'Reject what the model cannot handle', icon: 'check', atV: V(-2.6, 0.72, 0.2) },
      { name: 'board', t: 'Replies', d: 'Green: right, or honestly unsure', icon: 'eye', atV: V(1.5, 0.3, 0.7) },
    ];
    const reset = () => { Object.assign(st, { contract: true, sameFormat: true, floor: true }); evaluate(); };
    const breaks = [
      { label: 'No input check', hint: 'Every upload goes straight in', on: () => { reset(); st.contract = false; evaluate(); }, off: reset },
      { label: 'Formats disagree', hint: 'Resize hands BGR to an RGB classifier', on: () => { reset(); st.sameFormat = false; evaluate(); }, off: reset },
      { label: 'No confidence floor', hint: 'Always give a diagnosis', on: () => { reset(); st.floor = false; evaluate(); }, off: reset },
    ];
    function status() {
      if (!st.contract) return { ok: false, msg: `<b>The service falls over.</b> With no check at the door, the 40 MB photo decodes to 600 MB and runs the server out of memory, and the PDF crashes the image reader. Both farmers get no reply at all. A data contract rejects these with a helpful message before they reach the model.` };
      if (!st.sameFormat) return { ok: false, msg: `<b>Every leaf is "blight".</b> The resize stage hands over blue-green-red, but the classifier was trained on red-green-blue, so healthy green leaves look purple-brown and it confidently calls them diseased (97% sure). Each model scored well alone; the bug is the join between them. Test the whole pipeline, not just the parts.` };
      if (!st.floor) return { ok: false, msg: `<b>A confident guess from a blur.</b> The shaky photo gets a diagnosis anyway, and the phone shows it as fact. A confidence floor turns low-confidence answers into "please retake the photo", which is more useful to a farmer than a wrong treatment.` };
      return { ok: true, msg: `<b>Six photos, six useful replies.</b> Bad uploads are turned away politely, every stage agrees on format, low-confidence results ask for a retake, and the rest get a diagnosis in ${R[0].t.contract + R[0].t.resize + R[0].t.detect + R[0].t.classify + R[0].t.answer} ms, most of it in the detector.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); evaluate(); } };
  },

  story: [
    { t: 'A photo service', home: true, say: 'Growers in Malawi photograph a leaf, and the phone sends it here. Five stations turn the photo into an answer.', act: m => m.set({ contract: true, sameFormat: true, floor: true }), wait: 3 },
    { t: 'The happy path', home: true, say: 'Check the upload, resize it, find the leaves, classify each one, and send back an answer with a fixed shape the app can rely on.', act: m => m.set({}), wait: 3 },
    { t: 'The door', home: true, say: 'Real uploads include huge files and things that are not photos at all. Without a check at the door, they crash the service and the farmer hears nothing.', act: m => m.set({ contract: false }), wait: 4 },
    { t: 'The joins', home: true, say: 'Each model can pass its own tests and still fail together. Here the resize step hands over the wrong colour order, and every leaf looks diseased.', act: m => m.set({ contract: true, sameFormat: false }), wait: 3 },
    { t: 'Knowing when to say so', home: true, say: 'A blurry photo still gets a diagnosis unless there is a confidence floor. Asking for a retake beats a confident wrong answer.', act: m => m.set({ sameFormat: true, floor: false }), wait: 3 },
    { t: 'All together', home: true, say: 'Contract at the door, formats agreed between stages, an honest floor at the end, and each stage timed. That is a pipeline, not just a model.', act: m => m.set({ floor: true }), wait: 3 },
  ],
  check: [
    { q: 'What does a data contract at the start of a pipeline do?', options: ['Rejects inputs the model cannot handle before they reach it', 'Makes the model more accurate', 'Speeds up the detector'], answer: 0, why: 'Bad files are turned away with a clear message instead of crashing.' },
    { q: 'Why can two models that each pass their tests fail together?', options: ['They may disagree about format, such as colour order or scaling', 'Models cannot run in sequence', 'Tests are always wrong'], answer: 0, why: 'The bug lives in the join between them.' },
    { q: 'Why add a confidence floor?', options: ['So uncertain results ask for a retake instead of giving a confident wrong answer', 'To make the service faster', 'To use less memory'], answer: 0, why: 'Low confidence is useful information.' },
  ],
  terms: [
    ['Pipeline', 'A chain of stages that turns an input into a result.'],
    ['Data contract', 'A declared shape and set of limits that inputs must meet.'],
    ['Preprocessing', 'Preparing inputs, such as resizing and colour conversion, to match training.'],
    ['Confidence floor', 'A minimum confidence below which the system says it is unsure.'],
    ['Latency budget', 'How long the whole pipeline may take, split across stages.'],
    ['Integration test', 'A test of several stages working together.'],
  ],
  deeper: '<p><b>Contracts in code.</b> A library such as Pydantic lets you declare the request and response shapes once; anything that does not match is rejected with a clear error, and the app always receives the same fields.</p><p><b>Where time goes.</b> Decoding a big phone photo can take longer than the model. Resizing on the phone before upload often helps more than a faster detector.</p><p><b>About this machine.</b> The photos and timings are made up to show typical failure modes.</p>',
  code: {
    title: 'A contract, matching formats and a floor',
    note: 'Adapted from the course\'s vision pipeline capstone.',
    text: `
from pydantic import BaseModel, field_validator

class Upload(BaseModel):
    content_type: str
    size_bytes: int

    @field_validator("content_type")
    def must_be_image(cls, v):
        assert v in {"image/jpeg", "image/png"}, "please send a photo"
        return v

    @field_validator("size_bytes")
    def not_too_big(cls, v):
        assert v < 8_000_000, "please send a smaller photo"
        return v

class Reply(BaseModel):
    label: str | None
    confidence: float
    message: str

def classify_crop(crop_rgb):                # one format, agreed by every stage
    label, conf = classifier(crop_rgb)
    if conf < 0.6:
        return Reply(label=None, confidence=conf, message="photo too blurry, please retake")
    return Reply(label=label, confidence=conf, message=f"{label}, {conf:.0%} sure")
`,
  },
};
