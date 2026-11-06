// InternVL3: a public-health agency in Addis Ababa wants one model that writes reports in plain text and reads charts and clinic photos. Two training plans are compared:
// bolt vision onto a finished text model (align, then tune), or train on text, images and video together from the first step. The mix dial sets the share of text data.
// A resolution router picks low, medium or high detail per question. Text and vision scores follow the reported pattern for each plan and mix; throughput and token
// counts are computed live. Break it: bolt vision on and tune hard (text skill drops), too little text in the mix (the language side weakens), the router sends a
// small-print chart to low resolution (the numbers cannot be read).
const ROUTES = [['low', 256], ['medium', 576], ['high', 2048]];
const QUERIES = [{ n: 'Is this a clinic waiting room?', need: 0 }, { n: 'Which month had the most malaria cases?', need: 2 }];

export default {
  slug: 'internvl3-native-multimodal',
  title: 'InternVL3: trained multimodal from the start',
  description: 'A public-health agency in Addis Ababa wants one model that writes clear reports and reads charts and clinic photos.',
  overview: 'Most vision-language models are built in stages: take a finished text model, align a vision encoder to it, then tune the whole thing on image tasks. That tuning tends to wear away some of the text model\'s skill, a cost sometimes called alignment debt. InternVL3 instead trains on a mix of text, interleaved image-text, image-caption and video data from the first step, about 40% text, so vision and language share one loss throughout and the text side is kept strong. Its variable visual position encoding gives text a 1-D position, images 2-D and video 3-D, with how the frequency bands are shared learned rather than fixed. For serving, a small visual resolution router predicts how much detail each question needs and encodes the image at 256, 576 or 2,048 tokens, which raises throughput without losing answers, as long as it does not under-route questions about small print. Native training costs more compute and needs a carefully balanced data mix.',
  keywords: ['internvl3', 'native multimodal pretraining', 'alignment debt', 'data mix', 'resolution routing', 'v2pe'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.15, 0.4, -0.05], dir: [0.05, 0.75, 1.2], half: 0.95, wide: 5.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { plan: 1, text: 40, router: true, q: 1, hard: false, under: false };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // the training diet, bottom first: native mixes everything from the start; bolted feeds text, then alignment, then images
    const PX = -2.1;
    const diet = P.stack(0.62, 0.62, 0.11, { max: 10 }); diet.position.set(PX, 0, -0.15); S.add(diet);
    const feed = P.pipe([V(PX + 0.32, 0.6, -0.15), V(PX + 0.75, 0.75, -0.15), V(PX + 1.05, 0.45, -0.15)], SAF, { r: 0.035, n: 5 }); S.add(feed);
    const model = P.box(0.6, 0.55, 0.6, C.plum, { r: 0.07 }); model.position.set(-0.75, 0, -0.15); S.add(model);
    // what the model can do: a tower for writing, a tower for reading images
    const GX = 0.3, towers = [0, 1].map(k => { const t = P.tower(0.4, 0.4, GOOD); t.position.set(GX + k * 0.6, 0, -0.15); t.userData.set({ cap: '' }); S.add(t); return t; });
    const icons = [0, 1].map(k => { const b = P.box(0.5, 0.03, 0.5, k ? '#3B3F8F' : '#C9A227', { r: 0.03 }); b.position.set(GX + k * 0.6, 0, -0.15); S.add(b); return b; });
    // the router: three lenses, low to high detail; the question's image sits on the one it picks
    const RX = 2.0, router = P.robot('#3F4049', { scale: 0.85 }); router.position.set(RX, 0, -0.45); S.add(router);
    const LENS = [0.13, 0.19, 0.27], LX = [RX - 0.5, RX, RX + 0.6];
    const lensM = LENS.map(() => own('#8E91A3')), lenses = LENS.map((r, i) => { const c = P.cyl(r, 0.05, '#fff', { material: lensM[i] }); c.position.set(LX[i], 0, 0.35); S.add(c); return c; });
    const qM = own('#fff'), qBox = P.box(0.18, 0.18, 0.18, '#fff', { r: 0.03, material: qM }); qBox.userData.noFit = true; S.add(qBox);
    const lamp = P.lamp(GOOD, { h: 0.45, r: 0.12 }); lamp.position.set(RX + 0.7, 0, -0.45); S.add(lamp);
    S.add(P.keep(-2.5, 2.85, 1.45, -0.65, 0.65));
    let R = null;
    function run() {
      const tx = st.text, bolted = st.plan === 0;
      const textSkill = bolted ? (st.hard ? 62 : 70) : 72 - Math.max(0, 35 - tx) * 0.9;
      const visSkill = bolted ? (st.hard ? 70 : 66) : 70 - Math.max(0, tx - 55) * 0.6;
      const Q = QUERIES[st.q], route = st.router ? (st.q === 1 && st.under ? 0 : Q.need === 0 ? 0 : 2) : 2;
      const tokens = ROUTES[route][1], readable = route >= Q.need;
      const thru = st.router ? 2.4 : 1.0;
      return { textSkill, visSkill, route, tokens, readable, thru, Q };
    }
    let qTo = V();
    function draw() {
      R = run();
      let cs;
      if (st.plan === 0) cs = [...Array(6).fill('#C9A227'), C.coral, ...Array(3).fill('#3B3F8F')];
      else {
        const t = Math.round(st.text / 10), rest = 10 - t, il = Math.round(rest * 0.58), cap = Math.round(rest * 0.33), vid = Math.max(0, rest - il - cap);
        const mixQ = [['#C9A227', t], ['#1F9E89', il], ['#3B3F8F', cap], [C.plum, vid]], seq = [];
        // a native mix is shuffled together from the first step
        for (let k = 0; seq.length < 10 && k < 40; k++) { const m = mixQ[k % 4]; if (m[1] > 0) { seq.push(m[0]); m[1]--; } }
        while (seq.length < 10) seq.push('#C9A227');
        cs = seq;
      }
      diet.userData.set({ n: 10, colors: cs });
      [R.textSkill, R.visSkill].forEach((v, k) => towers[k].userData.set({ h: Math.max(0.05, (v - 45) / 30 * 1.2), color: v < 66 ? BAD : GOOD }));
      lensM.forEach((m, i) => m.color.set(i === R.route ? (R.readable ? GOOD : BAD) : '#8E91A3'));
      qM.color.set(st.q === 1 ? '#F4F1EA' : '#9FC7B9');
      qTo = V(LX[R.route], 0.05, 0.35);
      lamp.userData.set({ color: R.readable ? GOOD : BAD });
    }
    draw(); towers.forEach(t => t.userData.snap()); qBox.position.copy(qTo);
    const tick = dt => { towers.forEach(t => t.userData.tick(dt)); feed.userData.tick(dt); router.userData.tick(dt); qBox.position.lerp(qTo, Math.min(1, dt * 6)); };
    const controls = [
      { type: 'buttons', label: 'Training plan', options: ['Bolt vision on', 'Native from the start'], get: () => st.plan, act: i => { st.plan = i; draw(); } },
      { type: 'slider', label: 'Text share of the native mix', min: 10, max: 70, step: 5, get: () => st.text, set: v => { st.text = v; draw(); }, fmt: v => `${v}%` },
      { type: 'toggle', label: 'Tune the bolted model hard on images', short: 'hard tuning', get: () => st.hard, set: v => { st.hard = v; draw(); } },
      { type: 'buttons', label: 'Question', options: ['Waiting room?', 'Malaria chart'], get: () => st.q, act: i => { st.q = i; draw(); } },
      { type: 'toggle', label: 'Resolution router', short: 'router', get: () => st.router, set: v => { st.router = v; draw(); } },
      { type: 'toggle', label: 'Router under-estimates the chart', short: 'under-route', get: () => !!st.under, set: v => { st.under = v; draw(); } },
    ];
    const readouts = [
      { label: 'Text skill', get: () => ({ v: R.textSkill.toFixed(0), sub: 'reports, illustrative', good: R.textSkill >= 70, bad: R.textSkill < 66 }) },
      { label: 'Vision skill', get: () => ({ v: R.visSkill.toFixed(0), sub: 'charts and photos', good: R.visSkill >= 68, bad: R.visSkill < 66 }) },
      { label: 'Throughput', get: () => ({ v: `${R.thru.toFixed(1)}×`, sub: st.router ? 'with routing' : 'every image at high detail' }) },
    ];
    const labels = [
      { name: 'plan', t: 'Training data, first at the bottom', d: 'Gold: text. Teal, blue, plum: images and video', icon: 'book', atV: V(PX - 0.31, 0.3, -0.15) },
      { name: 'skill', t: 'Writing and reading images', d: 'Gold base: text. Blue base: vision', icon: 'chart', atV: V(GX + 0.85, 0.02, 0.1) },
      { name: 'router', t: 'Resolution router', d: 'Bigger lens: more detail, more tokens', icon: 'target', atV: V(LX[2] + 0.27, 0.03, 0.35) },
    ];
    const reset = () => { Object.assign(st, { plan: 1, text: 40, router: true, q: 1, hard: false, under: false }); draw(); };
    const breaks = [
      { label: 'Bolt on, tune hard', hint: 'Staged training', on: () => { reset(); st.plan = 0; st.hard = true; draw(); }, off: reset },
      { label: 'Too little text', hint: '10% of the mix', on: () => { reset(); st.text = 10; draw(); }, off: reset },
      { label: 'Chart sent to low resolution', hint: 'Router mistake', on: () => { reset(); st.under = true; draw(); }, off: reset },
    ];
    function status() {
      if (st.plan === 0 && st.hard) return { ok: false, msg: `<b>Vision up, writing down.</b> Bolting vision onto a finished text model and tuning hard on image tasks lifts vision to ${R.visSkill}, but wears away the text skill to ${R.textSkill}: reports come out clumsier. Training on text, images and video together from the start keeps text at ${72} with vision close behind.` };
      if (st.plan === 1 && st.text < 25) return { ok: false, msg: `<b>The language side weakens.</b> With only ${st.text}% text in the mix, the model sees too little writing to stay fluent: text skill ${R.textSkill.toFixed(0)}. InternVL3 keeps about 40% text so that one model reads charts and still writes clear reports.` };
      if (!R.readable) return { ok: false, msg: `<b>The chart was read at low resolution.</b> The router judged the malaria chart an easy question and encoded it at ${R.tokens} tokens, so the month labels and case numbers are too small to read. Routers save tokens on simple questions; they must send small print and dense charts to high resolution.` };
      return { ok: true, msg: `<b>${st.plan === 1 ? 'Native training' : 'Staged training'}: text ${R.textSkill.toFixed(0)}, vision ${R.visSkill.toFixed(0)}.</b> ${st.router ? `The router sends ${st.q === 1 ? 'the chart to high resolution, 2,048 tokens' : 'the photo question to low resolution, 256 tokens'}, so the agency serves about ${R.thru.toFixed(1)} times as many questions.` : 'Without the router, every image is encoded at high detail.'}` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'One model for both', home: true, say: 'A public-health agency in Addis Ababa wants one model that writes clear reports and reads charts and clinic photos.', act: m => m.set({ plan: 0, text: 40, router: true, q: 1, hard: false, under: false }) },
    { t: 'Bolted on', home: true, say: 'The usual way: take a finished text model, align a vision encoder, then tune on images.', act: m => m.set({ plan: 0 }) },
    { t: 'The cost', home: true, say: 'Tune it hard on images, and vision improves while its writing wears away.', act: m => m.set({ hard: true }) },
    { t: 'Native', home: true, say: 'Train on text, images and video together from the first step, about forty per cent text, and both skills stay strong.', act: m => m.set({ plan: 1, hard: false }) },
    { t: 'Keep the text', home: true, say: 'Starve the mix of text, and the language side weakens.', act: m => m.set({ text: 10 }) },
    { t: 'Route the detail', home: true, say: 'A router picks image resolution per question: low for "is this a waiting room", high for a chart full of small numbers.', act: m => m.set({ text: 40, q: 0 }) },
  ],
  check: [
    { q: 'What is alignment debt?', options: ['Text skill lost when vision is bolted on and tuned', 'A training fee', 'A type of position encoding'], answer: 0, why: 'Native training avoids most of it.' },
    { q: 'Why keep a large share of text data in native multimodal training?', options: ['So the language side stays fluent', 'Text is cheaper to store', 'Images need no training'], answer: 0, why: 'InternVL3 keeps about 40%.' },
    { q: 'What risk comes with a resolution router?', options: ['Sending small-print images to low resolution', 'Using too many GPUs', 'Changing the answer language'], answer: 0, why: 'It must route dense charts to high detail.' },
  ],
  terms: [
    ['Native multimodal pretraining', 'Training on mixed text, images and video from the first step.'],
    ['Alignment debt', 'Text skill lost by bolting on vision in stages.'],
    ['Data mix', 'The shares of each kind of training data.'],
    ['V2PE', 'Position encoding that varies by modality, with learned band sharing.'],
    ['Resolution router', 'A small model choosing image detail per question.'],
    ['Throughput', 'Questions served per unit of compute.'],
  ],
  deeper: '<p><b>Health data.</b> Ministries and NGOs across Ethiopia, Kenya and Malawi publish surveillance charts and photos of facilities. A model that reads them and writes plain reports needs both skills kept strong.</p><p><b>Serving split.</b> InternVL3 also serves the vision encoder and the language model on separate GPUs, since one runs once per image and the other once per output token.</p><p><b>About this machine.</b> Skill scores follow the reported pattern for each plan and mix and are illustrative; token counts and throughput are computed from the stated routes.</p>',
  code: {
    title: 'Route resolution per question',
    note: 'Adapted from the course\'s InternVL3 lesson.',
    text: `
ROUTES = {"low": 256, "medium": 576, "high": 2048}

def route(router, image, question):
    level = router.predict(image_thumbnail(image), question)   # small, cheap classifier
    return ROUTES[level]

MIX = {"text": 0.40, "interleaved": 0.35, "captions": 0.20, "video": 0.05}
# native pretraining samples every batch from MIX, one loss, from step one
`,
  },
};
