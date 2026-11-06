// Regulatory frameworks (phase 18, lesson 24): a Nairobi start-up sells abroad. Its product rolls through four lanes: EU, US, UK, South Korea, and each lane has its own gate. The EU sorts by risk tier and date. Comparison is the machine.
// A summary from the course for learning, not legal advice. Selling into a market brings its rules, wherever you are based. Dates and lane rules are summaries that may change.
const PROD = {
  hire: { n: 'CV screening for employers', tier: 'high' }, chat: { n: 'A support chatbot', tier: 'limited' },
  score: { n: 'Social scoring of citizens', tier: 'banned' }, model: { n: 'A general-purpose model', tier: 'gpai' },
};
const TIER = { banned: 'prohibited', high: 'high-risk', gpai: 'general-purpose', limited: 'limited-risk' };
const DUE = { banned: 2025, gpai: 2025, high: 2027, limited: 2026 };
function run(o) {
  const p = PROD[o.p], eu = o.sell.eu, kr = o.sell.kr;
  const euLoad = !eu ? 0 : { banned: 9, high: 6, gpai: 4, limited: 1 }[p.tier];
  const krLoad = kr ? 2 : 0;
  const stop = eu && p.tier === 'banned';
  const late = eu && o.year >= DUE[p.tier] && !o.ready && !stop;
  return { p, euLoad, krLoad, stop, late, ok: !stop && !late };
}

export default {
  slug: 'regulatory-frameworks-eu-us-uk-korea',
  title: 'AI rules abroad: one product, four lanes',
  description: 'A Nairobi start-up sells overseas. Its product rolls through the EU, US, UK and Korea, and each gate asks something different.',
  overview: 'Lab frameworks are voluntary. Regulation isn\'t, and it follows your market, not your office. The EU AI Act sorts systems by risk: prohibited, high-risk, general-purpose, limited-risk, with dates through 2025, 2026 and 2027, and a Code of Practice for general-purpose models. The UK renamed its institute the AI Security Institute, and the US its body CAISI, both signalling a turn towards security. South Korea\'s AI Framework Act took effect in January 2026, and asks foreign providers for a local representative. So a start-up in Nairobi selling to Berlin must know its tier. This is a summary for learning, not legal advice, and these rules change.',
  keywords: ['EU AI Act', 'AI regulation', 'risk tiers', 'GPAI', 'AI Security Institute', 'Korea AI Framework Act'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { p: 'hire', sell: { eu: true, kr: false }, year: 2027, ready: true }, st = { ...D0, sell: { ...D0.sell } };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const ZS = [-0.54, -0.18, 0.18, 0.54], Lanes = ZS.map((z, i) => {
      const r = P.box(3.1, 0.04, 0.26, '#BFB8A8', { r: 0.02 }); r.position.set(-0.6, 0.03, z); S.add(r);
      const g = P.box(0.1, 0.42, 0.3, GREY, { r: 0.01, material: new S.THREE.MeshLambertMaterial({ color: GREY }) }); g.position.set(0.45, 0.03, z); S.add(g);
      return g;
    });
    const stack = add(P.stack(0.55, 0.5, 0.1, { max: 11, color: SAF })); stack.position.set(1.7, 0.03, 0);
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.11 })); lamp.position.set(2.3, 0.03, 0.4);
    const parcels = ZS.map(() => { const p = P.box(0.18, 0.16, 0.18, '#F4F1EA', { r: 0.02 }); p.userData.noFit = true; S.add(p); return p; });
    S.add(P.keep(-2.3, 2.5, 1.15, -0.72, 0.72));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      Lanes[0].material.color.set(!st.sell.eu ? GREY : R.stop ? RED : R.late ? BAD : GOOD);
      Lanes[1].material.color.set(GREY); Lanes[2].material.color.set(GREY);
      Lanes[3].material.color.set(st.sell.kr ? SAF : GREY);
      stack.userData.set({ n: Math.min(11, R.euLoad + R.krLoad), colors: Array(11).fill(SAF) });
      lamp.userData.set({ color: R.ok ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const PK = ['hire', 'chat', 'score', 'model'];
    const controls = [
      { type: 'buttons', label: 'The product', options: ['CV screening', 'Chatbot', 'Social scoring', 'General model'], get: () => PK.indexOf(st.p), act: i => set({ p: PK[i] }) },
      { type: 'toggle', label: 'Sell into the EU', short: 'EU', get: () => st.sell.eu, set: v => { st.sell.eu = !!v; draw(); } },
      { type: 'toggle', label: 'Sell into South Korea', short: 'Korea', get: () => st.sell.kr, set: v => { st.sell.kr = !!v; draw(); } },
      { type: 'slider', label: 'Year', min: 2025, max: 2027, step: 1, get: () => st.year, set: v => set({ year: v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Paperwork and controls are ready', short: 'Ready', get: () => st.ready, set: v => set({ ready: !!v }) },
    ];
    const readouts = [
      { label: 'EU tier', get: () => ({ v: TIER[R.p.tier], sub: R.p.n, bad: R.stop }) },
      { label: 'EU rules bite from', get: () => ({ v: `${DUE[R.p.tier]}`, sub: 'August, in this summary' }) },
      { label: 'Compliance load', get: () => ({ v: `${R.euLoad + R.krLoad} units`, sub: 'documents, tests, people', good: R.euLoad + R.krLoad < 3 }) },
    ];
    const labels = [
      { name: 'l', t: 'Back to front', d: 'EU, US, UK, Korea', icon: 'link', atV: V(-2.15, 0.08, 0) },
      { name: 's', t: 'The paperwork stack', d: 'Grows with risk and markets', icon: 'book', atV: V(2.05, 0.2, 0) },
    ];
    const reset = () => { Object.assign(st, D0, { sell: { ...D0.sell } }); draw(); };
    const breaks = [
      { label: 'Offer social scoring in the EU', hint: 'a prohibited practice', on: () => set({ ...D0, p: 'score', sell: { eu: true, kr: false } }), off: reset },
      { label: 'We\'re in Nairobi, so it\'s not our rule', hint: 'the market decides', on: () => set({ ...D0, ready: false, sell: { eu: true, kr: false } }), off: reset },
      { label: 'Enter Korea with no local representative', hint: 'a foreign provider', on: () => set({ ...D0, sell: { eu: false, kr: true }, ready: false }), off: reset },
    ];
    function status() {
      if (R.stop) return { ok: false, msg: '<b>Stopped at the EU gate: social scoring is prohibited.</b> No paperwork changes that. Some practices are banned outright.' };
      if (R.late) return { ok: false, msg: `<b>${R.p.n} is ${TIER[R.p.tier]} in the EU, and you are not ready.</b> The rules follow the market. If people in the EU use it, being based in Nairobi doesn't exempt you.` };
      if (st.sell.kr && !st.ready) return { ok: false, msg: '<b>Korea\'s Act asks foreign providers to have a local representative.</b> Each market brings its own duties.' };
      if (!st.sell.eu && !st.sell.kr) return { ok: true, msg: '<b>No market chosen here, so these rules are quiet.</b> The US and UK lanes focus on guidance and security testing, with no single act like the EU\'s. Local rules still apply at home.' };
      return { ok: true, msg: `<b>${R.p.n}: ${TIER[R.p.tier]} in the EU, and ready.</b> Map each technical control to each market's duty, and check with a lawyer. This is a summary for learning.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.4) % 1;
        parcels.forEach((p, i) => { const on = i === 0 ? st.sell.eu : i === 3 ? st.sell.kr : true; p.visible = on; const stop = (i === 0 && (R.stop || R.late)) ? 0.72 : 1; p.position.set(-2.0 + 3.5 * Math.min(stop, u), 0.08, ZS[i]); });
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Rules follow the market', home: true, say: 'A start-up in Nairobi sells software abroad. Each market has a lane, with its own gate.', act: m => m.set({ p: 'chat', sell: { eu: false, kr: false }, year: 2027, ready: true }) },
    { t: 'The EU sorts by risk', home: true, say: 'The EU AI Act sorts systems into tiers. A support chatbot is limited risk, and mostly must say it is a bot.', act: m => m.set({ p: 'chat', sell: { eu: true, kr: false }, year: 2027, ready: true }) },
    { t: 'High risk', home: true, say: 'CV screening affects people\'s jobs, so it is high-risk. The paperwork stack grows.', act: m => m.set({ p: 'hire', sell: { eu: true, kr: false }, year: 2027, ready: true }) },
    { t: 'Prohibited', home: true, say: 'Some practices are banned outright. Social scoring doesn\'t pass the gate at all.', act: m => m.set({ p: 'score', sell: { eu: true, kr: false }, year: 2027, ready: true }) },
    { t: 'US and UK', home: true, say: 'Both renamed their safety institutes, with a turn towards security. They offer testing and guidance, not one big act.', act: m => m.set({ p: 'model', sell: { eu: false, kr: false }, year: 2026, ready: true }) },
    { t: 'Korea', home: true, say: 'South Korea\'s Act took effect in 2026, and asks foreign providers for a local representative. Know each lane before you enter.', act: m => m.set({ p: 'model', sell: { eu: false, kr: true }, year: 2026, ready: false }) },
  ],
  check: [
    { q: 'What decides which rules apply?', options: ['Where the product is used', 'Where the office is', 'The founder\'s passport'], answer: 0, why: 'Rules follow the market.', hint: 'Try We\'re in Nairobi, so it\'s not our rule.' },
    { q: 'How does the EU AI Act sort systems?', options: ['By risk tier', 'By company size only', 'By language'], answer: 0, why: 'Prohibited, high-risk, general-purpose, limited-risk.', hint: 'Try each product.' },
    { q: 'What did the UK and US renamings signal?', options: ['A turn towards security', 'A ban on AI', 'A new currency'], answer: 0, why: 'AI Security Institute, and CAISI.', hint: 'See US and UK.' },
  ],
  terms: [
    ['EU AI Act', 'The EU law sorting AI by risk.'],
    ['High-risk system', 'A use with strict duties, such as hiring.'],
    ['GPAI', 'A general-purpose AI model.'],
    ['Code of Practice', 'A voluntary way to show GPAI compliance.'],
    ['AI Security Institute', 'The UK body for AI testing.'],
    ['CAISI', 'The US Center for AI Standards and Innovation.'],
  ],
  deeper: '<p><b>Not legal advice.</b> This follows the course\'s summary and simplifies heavily. Dates have shifted before, so check the current text with a lawyer.</p><p><b>At home.</b> Data protection laws in Kenya, Nigeria, South Africa and elsewhere apply too, and national AI strategies are moving.</p><p><b>Units</b> of compliance load here are only for comparison.</p>',
  code: {
    title: 'Map a product to duties',
    note: 'Our own sketch of the course\'s control mapping (code/main.py).',
    text: `
TIERS = {"social_scoring": "prohibited", "cv_screening": "high",
         "support_chat": "limited", "general_model": "gpai"}

def duties(use, markets):
    out = {}
    if "EU" in markets:
        out["EU"] = EU_DUTIES[TIERS[use]]
    if "KR" in markets:
        out["KR"] = ["local representative"]
    return out
`,
  },
};
