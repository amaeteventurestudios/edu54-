// Compliance frameworks (phase 17, lesson 26): a Nairobi HR-tech company sells a CV-screening assistant to employers in Kenya, Nigeria, South Africa
// and the EU. Screening job applicants is a high-risk use under the EU AI Act. Six controls (real-time redaction, records of processing, an impact
// assessment, human review with a way to contest, logging and documentation, transfer agreements) each satisfy several frameworks at once. Markets
// and controls are toggled; coverage per framework, the open gaps and the work saved by mapping controls once are computed live.
const FW = [
  { id: 'ke', name: 'Kenya Data Protection Act', market: 'ke' },
  { id: 'ng', name: 'Nigeria Data Protection Act', market: 'ng' },
  { id: 'za', name: 'South Africa POPIA', market: 'za' },
  { id: 'gdpr', name: 'EU GDPR', market: 'eu' },
  { id: 'aiact', name: 'EU AI Act (high-risk)', market: 'eu' },
  { id: 'soc2', name: 'SOC 2 (customers ask)', market: 'all' },
];
const CTRL = [
  { id: 'redact', name: 'redact personal data at inference', covers: ['ke', 'ng', 'za', 'gdpr', 'soc2'] },
  { id: 'records', name: 'records of processing', covers: ['ke', 'ng', 'za', 'gdpr'] },
  { id: 'dpia', name: 'impact assessment', covers: ['ke', 'ng', 'gdpr', 'aiact'] },
  { id: 'human', name: 'human review and a way to contest', covers: ['gdpr', 'aiact', 'ke'] },
  { id: 'logs', name: 'logging and technical documentation', covers: ['aiact', 'soc2', 'za'] },
  { id: 'transfer', name: 'cross-border transfer agreements', covers: ['ke', 'ng', 'za', 'gdpr'] },
];
const NEED = { ke: ['redact', 'records', 'dpia', 'transfer'], ng: ['redact', 'records', 'dpia', 'transfer'], za: ['redact', 'records', 'transfer'], gdpr: ['redact', 'records', 'dpia', 'human', 'transfer'], aiact: ['dpia', 'human', 'logs'], soc2: ['redact', 'logs'] };
function assess(o) {
  const live = FW.filter(f => f.market === 'all' || o.markets.includes(f.market));
  const rows = live.map(f => { const need = NEED[f.id], have = need.filter(c => o.ctrl[c] && !(c === 'redact' && o.posthoc)); return { ...f, need, have, gaps: need.filter(c => !have.includes(c)) }; });
  const separate = rows.reduce((s, r) => s + r.need.length, 0);
  const mapped = new Set(rows.flatMap(r => r.need)).size;
  return { rows, separate, mapped, gaps: rows.filter(r => r.gaps.length) };
}

export default {
  slug: 'compliance-frameworks',
  title: 'Compliance: one control, many frameworks',
  description: 'An HR-tech company in Nairobi sells a CV-screening assistant across borders. Build each control once, and let the pegboard show which laws it answers.',
  overview: 'Enterprise buyers now ask for a matrix: a row per framework, a column per control, and evidence in each cell. For an LLM product that means data-protection law in every market you serve, sector rules and the new AI-specific laws. Across Africa, data-protection laws now cover most large markets, among them Kenya\'s Data Protection Act (2019), Nigeria\'s Data Protection Act (2023) and South Africa\'s POPIA, each with a regulator, rules on lawful processing, records, impact assessments for risky processing and conditions for sending data across borders. Serving EU residents brings GDPR, and the EU AI Act, in force since August 2024 with obligations phasing in; most obligations for high-risk systems are scheduled from August 2026, with fines scaled to global turnover. Using AI to screen job applicants is listed as high-risk, which requires risk management, data governance, logging, technical documentation, transparency and effective human oversight. Customers will ask for SOC 2 or ISO 27001 regardless, and ISO 42001 is emerging for AI governance. Two points matter in practice. Redact personal data in real time, at the inference layer, before it reaches a model provider; cleaning it out of logs afterwards doesn\'t undo the disclosure. And map controls across frameworks: access control, records of processing, impact assessments, human review, logging and transfer agreements each satisfy several laws at once, so build each control once and cite it everywhere, rather than running a separate project per framework. None of this is legal advice; laws and dates change, so check the current text with counsel for each market.',
  keywords: ['compliance', 'EU AI Act', 'data protection', 'POPIA', 'NDPA', 'GDPR', 'AI governance'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { markets: ['ke', 'ng', 'za', 'eu'], ctrl: { redact: true, records: true, dpia: true, human: true, logs: true, transfer: true }, posthoc: false, separate: false }, st = JSON.parse(JSON.stringify(D0));
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* frameworks by controls as a pegboard: tall teal where a control answers a duty, red where one is missing */
    const CX = j => -1.6 + j * 0.46, RZ = i => -0.9 + i * 0.24;
    const rows = FW.map((f, i) => {
      const pm = new THREE.MeshLambertMaterial({ color: OFF }), pad = P.box(3.05, 0.04, 0.18, '#fff', { r: 0.02, material: pm }); pad.position.set(-0.45, 0, RZ(i)); S.add(pad);
      const lamp = P.lamp(GOOD, { h: 0.1, r: 0.08 }); lamp.position.set(-2.15, 0, RZ(i)); S.add(lamp);
      const cells = CTRL.map((c, j) => { const t = P.tower(0.22, 0.13, OFF, { h: 0.03 }); t.userData.set({ cap: '' }); t.position.set(CX(j), 0.04, RZ(i)); S.add(t); return t; });
      return { f, pm, lamp, cells };
    });
    /* work to do: every duty separately, or one control mapped to many */
    const sep = P.tower(0.34, 0.34, '#8A8577', { h: 0.3 }), map = P.tower(0.34, 0.34, GOOD, { h: 0.3 }); [sep, map].forEach(t => t.userData.set({ cap: '' })); sep.position.set(1.5, 0, -0.5); map.position.set(1.95, 0, -0.5); S.add(sep, map);
    S.add(P.keep(-2.3, 2.2, 0.95, -1.1, 0.5));
    const parts = [sep, map, ...rows.flatMap(r => r.cells)];

    let R = null;
    function draw() {
      R = assess(st);
      rows.forEach(Rw => {
        const r = R.rows.find(x => x.id === Rw.f.id), on = !!r;
        Rw.pm.color.set(on ? '#E4DED2' : '#F2EEE5');
        Rw.lamp.userData.set({ color: !on ? OFF : r.gaps.length ? BAD : GOOD, on: true });
        CTRL.forEach((c, j) => {
          const need = on && r.need.includes(c.id), have = need && r.have.includes(c.id);
          Rw.cells[j].userData.set({ h: !need ? 0.02 : have ? 0.2 : 0.34, color: !need ? OFF : have ? GOOD : BAD });
        });
      });
      sep.userData.set({ h: R.separate * 0.035, color: st.separate ? BAD : '#8A8577' });
      map.userData.set({ h: Math.max(0.05, R.mapped * 0.035) });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const tog = id => ({ type: 'toggle', label: `Control: ${CTRL.find(c => c.id === id).name}`, short: CTRL.find(c => c.id === id).name.split(' ').slice(0, 2).join(' ').replace(/^./, x => x.toUpperCase()), get: () => st.ctrl[id], set: v => { st.ctrl[id] = !!v; draw(); } });
    const controls = [
      tog('redact'), tog('human'), tog('dpia'),
      { type: 'toggle', label: 'Clean personal data from logs afterwards instead', short: 'Clean up later', get: () => st.posthoc, set: v => set({ posthoc: !!v }) },
      { type: 'toggle', label: 'Serve EU employers too', short: 'EU market', get: () => st.markets.includes('eu'), set: v => set({ markets: v ? [...new Set([...st.markets, 'eu'])] : st.markets.filter(m => m !== 'eu') }) },
      { type: 'toggle', label: 'Answer each framework as a separate project', short: 'Separate projects', get: () => st.separate, set: v => set({ separate: !!v }) },
    ];
    const readouts = [
      { label: 'Frameworks', get: () => ({ v: String(R.rows.length), sub: 'apply to this product' }) },
      { label: 'Gaps', get: () => ({ v: String(R.gaps.reduce((s, g) => s + g.gaps.length, 0)), sub: R.gaps.length ? R.gaps[0].name : 'none', good: !R.gaps.length, bad: R.gaps.length > 0 }) },
      { label: 'Work', get: () => ({ v: st.separate ? `${R.separate} items` : `${R.mapped} controls`, sub: st.separate ? 'evidence repeated' : `cited ${R.separate} times`, good: !st.separate, bad: st.separate }) },
    ];
    const labels = [
      { name: 'rows', t: 'Frameworks', d: 'One row each, one lamp each', icon: 'book', atV: V(-2.3, 0.15, -0.3) },
      { name: 'grid', t: 'Work to do', d: 'Duty by duty, or control by control', icon: 'check', atV: V(2.14, 0.2, -0.5) },
    ];
    const reset = () => set(JSON.parse(JSON.stringify(D0)));
    const breaks = [
      { label: 'Clean up personal data afterwards', hint: 'not at inference', on: () => set({ ...JSON.parse(JSON.stringify(D0)), posthoc: true }), off: reset },
      { label: 'Screen applicants with no human review', hint: 'high-risk use', on: () => { reset(); st.ctrl.human = false; draw(); }, off: reset },
      { label: 'Answer each framework separately', hint: 'repeated work', on: () => set({ ...JSON.parse(JSON.stringify(D0)), separate: true }), off: reset },
    ];
    function status() {
      if (st.posthoc) return { ok: false, msg: `<b>Cleaning personal data out of logs afterwards leaves a gap in every data-protection framework: applicants\' details had already reached the model provider.</b> Redact at the inference layer, before the prompt leaves your infrastructure.` };
      if (!st.ctrl.human && st.markets.includes('eu')) return { ok: false, msg: '<b>Screening job applicants is a high-risk use under the EU AI Act, and with no human review or way to contest a decision, both it and GDPR show gaps.</b> High-risk systems need effective human oversight, and people affected by automated decisions need a way to challenge them.' };
      if (st.separate) return { ok: false, msg: `<b>Run as separate projects, the same controls are written up ${R.separate} times for ${R.rows.length} frameworks.</b> Build each control once (redaction, records, impact assessment, human review, logging, transfer agreements) and cite it in every framework it satisfies: ${R.mapped} controls.` };
      if (R.gaps.length) return { ok: false, msg: `<b>Gaps remain in ${R.gaps.map(g => `${g.name} (${g.gaps.map(c => CTRL.find(x => x.id === c).name).join(', ')})`).join('; ')}.</b>` };
      return { ok: true, msg: `<b>${R.rows.length} frameworks across ${st.markets.length} markets, every requirement covered by ${R.mapped} controls built once and cited ${R.separate} times.</b> Personal data is redacted at inference, a person reviews every screening decision, and the evidence sits in one matrix. Check each law\'s current text with counsel.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Four markets', home: true, say: 'An HR-tech company in Nairobi sells a CV-screening assistant to employers in Kenya, Nigeria, South Africa and the EU.', act: m => m.set({ markets: ['ke', 'ng', 'za'], ctrl: { redact: true, records: true, dpia: true, human: true, logs: true, transfer: true }, posthoc: false, separate: false }) },
    { t: 'A matrix', home: true, say: 'Buyers want a matrix: a row per law or standard, a column per control, evidence in each cell.', act: m => m.set({ markets: ['ke', 'ng', 'za', 'eu'], ctrl: { redact: true, records: true, dpia: true, human: true, logs: true, transfer: true }, posthoc: false, separate: false }) },
    { t: 'High-risk in the EU', home: true, say: 'Screening applicants is high-risk under the EU AI Act. Without human review and a way to contest, there are gaps.', act: m => m.set({ markets: ['ke', 'ng', 'za', 'eu'], ctrl: { redact: true, records: true, dpia: true, human: false, logs: true, transfer: true }, posthoc: false, separate: false }) },
    { t: 'Redact live', home: true, say: 'Cleaning personal data out of logs later doesn\'t undo sending it to a provider. Redact at inference.', act: m => m.set({ markets: ['ke', 'ng', 'za', 'eu'], ctrl: { redact: true, records: true, dpia: true, human: true, logs: true, transfer: true }, posthoc: true, separate: false }) },
    { t: 'Build once, cite many times', home: true, say: 'One impact assessment serves several laws. Map each control across frameworks instead of repeating the work.', act: m => m.set({ markets: ['ke', 'ng', 'za', 'eu'], ctrl: { redact: true, records: true, dpia: true, human: true, logs: true, transfer: true }, posthoc: false, separate: true }) },
    { t: 'Covered', home: true, say: 'Six controls cover every row. Laws change, so keep the matrix current and check it with counsel.', act: m => m.set({ markets: ['ke', 'ng', 'za', 'eu'], ctrl: { redact: true, records: true, dpia: true, human: true, logs: true, transfer: true }, posthoc: false, separate: false }) },
  ],
  check: [
    { q: 'Why redact personal data at inference rather than clean logs later?', options: ['Later cleanup doesn\'t undo sending it to the provider', 'It is cheaper', 'Logs are encrypted'], answer: 0, why: 'Disclosure has already happened.', hint: 'Try Clean up personal data afterwards.' },
    { q: 'What does the EU AI Act require for high-risk uses like CV screening?', options: ['Human oversight, logging and documentation, among others', 'Nothing', 'Only a privacy notice'], answer: 0, why: 'High-risk systems carry obligations.', hint: 'Try Screen applicants with no human review.' },
    { q: 'Why map controls across frameworks?', options: ['One control satisfies several laws at once', 'Frameworks forbid it', 'It adds evidence'], answer: 0, why: 'Build once, cite many times.', hint: 'Try Answer each framework separately.' },
  ],
  terms: [
    ['Data protection law', 'Rules on lawful processing of personal data, such as Kenya\'s DPA or POPIA.'],
    ['EU AI Act', 'EU law classifying AI uses by risk, with duties for high-risk systems.'],
    ['High-risk system', 'An AI use, such as hiring, with strict obligations.'],
    ['Impact assessment', 'A documented review of risks before processing.'],
    ['Control mapping', 'Citing one control as evidence for several frameworks.'],
    ['Cross-border transfer', 'Sending personal data to another country, with safeguards.'],
  ],
  deeper: '<p><b>Records of processing.</b> What data, for what purpose, kept how long, shared with whom: most data-protection laws require it, and it is the backbone of the matrix.</p><p><b>Standards.</b> SOC 2 and ISO 27001 cover security controls buyers expect; ISO 42001 adds an AI management system.</p><p><b>About this machine.</b> A simplified, illustrative mapping of controls to frameworks, not legal advice; laws and dates change, so check the current text for each market.</p>',
  code: {
    title: 'A control matrix',
    note: 'Written for this lesson; the mapping is illustrative.',
    text: `
CONTROLS = {
    "redact_at_inference": ["KE-DPA", "NG-NDPA", "ZA-POPIA", "GDPR", "SOC2"],
    "records_of_processing": ["KE-DPA", "NG-NDPA", "ZA-POPIA", "GDPR"],
    "impact_assessment": ["KE-DPA", "NG-NDPA", "GDPR", "EU-AI-Act"],
    "human_review_and_contest": ["GDPR", "EU-AI-Act", "KE-DPA"],
    "logging_and_docs": ["EU-AI-Act", "SOC2", "ZA-POPIA"],
    "transfer_agreements": ["KE-DPA", "NG-NDPA", "ZA-POPIA", "GDPR"],
}

def gaps(required, implemented):
    return {fw: [c for c in reqs if c not in implemented] for fw, reqs in required.items()}
`,
  },
};
