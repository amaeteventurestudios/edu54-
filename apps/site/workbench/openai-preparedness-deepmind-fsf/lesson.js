// Preparedness and FSF (phase 15, lesson 20): a Kigali ministry reads two frontier-lab policies before buying. The same capability rolls down two lanes, OpenAI's Preparedness Framework v2 and DeepMind's
// Frontier Safety Framework v3, and either hits a gate or lands on a watch shelf. Summaries follow the course text and date from it; policies change, and the page says so.
const CAP = {
  cyber: { n: 'Cyber attack skill', oa: 'gate', dm: 'gate', wo: 'a Tracked Category', wd: 'a misuse Critical Capability Level' },
  rnd: { n: 'Automating AI research', oa: 'gate', dm: 'gate', wo: 'a Tracked Category', wd: 'the ML R&D levels' },
  auto: { n: 'Long-range autonomy', oa: 'watch', dm: 'fold', wo: 'a Research Category, with only potential mitigations', wd: 'no domain of its own: it counts inside ML R&D and cyber' },
  sand: { n: 'Sandbagging a test', oa: 'watch', dm: 'watch', wo: 'a Research Category', wd: 'the deceptive-alignment monitoring track' },
};
function run(o) {
  const c = CAP[o.cap], res = l => { if (o.hide && l === 'gate') return 'missed'; if (o.cap === 'auto' && l === 'fold') return o.domain ? 'gate' : 'pass'; return l; };
  return { c, oa: res(c.oa), dm: res(c.dm) };
}

export default {
  slug: 'openai-preparedness-deepmind-fsf',
  title: 'Preparedness and FSF: read two policies side by side',
  description: 'One capability, two lanes. See where each frontier policy gates a model, and where it only keeps watch.',
  overview: 'OpenAI\'s Preparedness Framework and DeepMind\'s Frontier Safety Framework both ask when a lab should gate a model, and they share a lot: review bodies, regular reports, and concern about deceptive behaviour. The differences are in the sorting. OpenAI splits Tracked Categories, which trigger reports and review, from Research Categories, where mitigations are only potential. Long-range autonomy sits in the second. DeepMind has no autonomy domain at all: it folds autonomy into ML R&D and cyber, arguing autonomy without a domain does no harm by itself. Sandbagging, a model underperforming on purpose, troubles both. This follows the course\'s summary of the versions it read; both policies change, so read the current text.',
  keywords: ['Preparedness Framework', 'Frontier Safety Framework', 'AI governance', 'sandbagging', 'frontier AI safety', 'capability levels'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.8, 1.15], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { cap: 'cyber', hide: false, domain: true }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const LZ = [-0.4, 0.4], lanes = LZ.map(z => {
      const bed = P.box(4.6, 0.03, 0.62, '#D8D2C4', { r: 0.03 }); bed.position.set(0, 0, z); S.add(bed);
      const rail = P.box(3.1, 0.05, 0.12, '#6B6E7E', { r: 0.02 }); rail.position.set(-0.75, 0.03, z); S.add(rail);
      const gate = add(P.gate(0.5, RED, { h: 0.5 })); gate.position.set(0.95, 0.03, z); gate.rotation.y = Math.PI / 2;
      const shelf = add(P.shelf(3, { cell: 0.26, d: 0.34, lh: 0.28 })); shelf.position.set(1.75, 0.03, z);
      const ball = P.ball(0.13, SAF); ball.userData.noFit = true; S.add(ball);
      const lamp = add(P.lamp('#C9C4B6', { h: 0.3, r: 0.09 })); lamp.position.set(-2.1, 0.03, z);
      return { z, gate, shelf, ball, lamp };
    });
    S.add(P.keep(-2.4, 2.4, 0.9, -0.75, 0.75));
    let R = null, u = 0;
    const COL = { gate: GOOD, watch: BLUE, pass: RED, missed: RED, fold: BLUE };
    function draw() {
      R = run(st);
      [R.oa, R.dm].forEach((v, i) => {
        const L = lanes[i];
        L.gate.userData.set({ open: v !== 'gate', color: v === 'gate' ? GOOD : '#C9C4B6' });
        L.shelf.userData.set({ fill: [v === 'watch' ? BLUE : null, null, null] });
        L.lamp.userData.set({ color: COL[v], on: true });
      });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const CK = ['cyber', 'rnd', 'auto', 'sand'];
    const controls = [
      { type: 'buttons', label: 'The capability', options: ['Cyber', 'AI research', 'Autonomy', 'Sandbagging'], get: () => CK.indexOf(st.cap), act: i => set({ cap: CK[i] }) },
      { type: 'toggle', label: 'The model hides this skill on the test', short: 'Hides it', get: () => st.hide, set: v => set({ hide: !!v }) },
      { type: 'toggle', label: 'The autonomy shows up in cyber or research work', short: 'In a domain', get: () => st.domain, set: v => set({ domain: !!v }) },
    ];
    const WORD = { gate: 'gated', watch: 'watched', pass: 'no gate', missed: 'test missed it', fold: 'folded in' };
    const readouts = [
      { label: 'OpenAI Preparedness', get: () => ({ v: WORD[R.oa], sub: R.c.wo, good: R.oa === 'gate', bad: R.oa === 'missed' }) },
      { label: 'DeepMind FSF', get: () => ({ v: WORD[R.dm], sub: R.c.wd, good: R.dm === 'gate', bad: R.dm === 'missed' || R.dm === 'pass' }) },
      { label: 'Capability', get: () => ({ v: R.c.n, sub: st.hide ? 'hidden on the test' : 'shown on the test' }) },
    ];
    const labels = [
      { name: 'l', t: 'Back: OpenAI. Front: DeepMind', d: 'The same ball runs both', icon: 'scale', atV: V(-2.1, 0.45, 0.4) },
      { name: 'g', t: 'Gate or shelf', d: 'Teal gate stops it. Shelf only watches', icon: 'hand', atV: V(2.15, 0.1, 0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Assume Research means mitigated', hint: 'read the word potential', on: () => set({ ...D0, cap: 'auto' }), off: reset },
      { label: 'Trust the test score', hint: 'the model sandbags', on: () => set({ ...D0, hide: true }), off: reset },
      { label: 'Autonomy with no harmful domain', hint: 'neither lane gates it', on: () => set({ ...D0, cap: 'auto', domain: false }), off: reset },
    ];
    function status() {
      if (st.hide) return { ok: false, msg: `<b>Both gates stayed open: the test saw a weaker model.</b> Every framework rests on measuring capability. A model that underperforms on purpose walks past thresholds, and DeepMind itself says monitoring won't stay sufficient for long.` };
      if (st.cap === 'auto' && !st.domain) return { ok: false, msg: `<b>No gate in either lane.</b> OpenAI's Research Category only names potential mitigations, and DeepMind counts autonomy only inside a harmful domain. That may be defensible, but know it's the case before you rely on it.` };
      if (st.cap === 'auto') return { ok: false, msg: `<b>Same capability, two answers.</b> In OpenAI's policy it is ${R.c.wo}. DeepMind has ${R.c.wd}, so here its gate shuts. A category's placement is the whole difference between a commitment and a plan to look.` };
      if (st.cap === 'sand') return { ok: true, msg: `<b>Both watch, and neither gates.</b> OpenAI keeps it as ${R.c.wo}; DeepMind has ${R.c.wd}. It sits on a shelf because you can't easily gate what the test can't see.` };
      return { ok: true, msg: `<b>${R.c.n} is gated in both lanes.</b> OpenAI: ${R.c.wo}, with reports reviewed before release. DeepMind: ${R.c.wd}. The policies agree most where harm is easiest to name.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.45) % 1;
        [R.oa, R.dm].forEach((v, i) => { const L = lanes[i], stop = v === 'gate' ? 0.75 : v === 'watch' ? 2.0 : 2.3; L.ball.position.set(-2.0 + (stop + 2.0) * u, 0.21, L.z); });
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Two policies', home: true, say: 'A ministry in Kigali reads two lab policies before buying. One capability rolls down both lanes, and each lane has a gate.', act: m => m.set({ cap: 'cyber', hide: false, domain: true }) },
    { t: 'Where they agree', home: true, say: 'Cyber skill and automating AI research trip gates in both. Reports are written and reviewed before release.', act: m => m.set({ cap: 'rnd', hide: false, domain: true }) },
    { t: 'Tracked or research', home: true, say: 'OpenAI sorts long-range autonomy as a Research Category. It lands on a shelf: watched, with mitigations only potential.', act: m => m.set({ cap: 'auto', hide: false, domain: true }) },
    { t: 'No autonomy domain', home: true, say: 'DeepMind has no autonomy domain. It counts only where it does harm, inside research and cyber work.', act: m => m.set({ cap: 'auto', hide: false, domain: false }) },
    { t: 'Sandbagging', home: true, say: 'What if a model does worse on purpose? The test sees a weaker model, and both gates stay open.', act: m => m.set({ cap: 'cyber', hide: true, domain: true }) },
    { t: 'Read the current text', home: true, say: 'Placement is the whole difference between a commitment and a plan to look. Both policies keep changing, so read the current text.', act: m => m.set({ cap: 'sand', hide: false, domain: true }) },
  ],
  check: [
    { q: 'In OpenAI\'s framework, what does a Research Category trigger?', options: ['No automatic mitigation', 'A pause', 'An immediate gate'], answer: 0, why: 'The language is potential mitigations.', hint: 'Try Assume Research means mitigated.' },
    { q: 'How does DeepMind treat autonomy?', options: ['Folded into domains such as ML R&D and cyber', 'As its own top domain', 'It ignores it fully'], answer: 0, why: 'It argues autonomy alone does no harm.', hint: 'Choose Autonomy and switch In a domain.' },
    { q: 'Why does sandbagging trouble every framework?', options: ['Thresholds depend on measuring true capability', 'It costs more', 'It breaks the API'], answer: 0, why: 'A hidden skill walks past a gate.', hint: 'Try Trust the test score.' },
  ],
  terms: [
    ['Tracked Category', 'OpenAI: a capability with reports and review.'],
    ['Research Category', 'OpenAI: watched, without committed mitigations.'],
    ['Critical Capability Level', 'DeepMind: a threshold that calls for mitigation.'],
    ['Sandbagging', 'A model hiding what it can do.'],
    ['Safety Advisory Group', 'An internal body that reviews before release.'],
    ['Deceptive alignment', 'A model seeming aligned while it isn\'t.'],
  ],
  deeper: '<p><b>Versions.</b> This follows the course\'s reading of Preparedness v2 (April 2025) and FSF v3 (September 2025, with Tracked Capability Levels added in April 2026). Policies change, and these summaries may date.</p><p><b>Cousins.</b> The later lesson on frontier safety frameworks sets these beside Anthropic\'s Responsible Scaling Policy.</p><p><b>For buyers.</b> A policy tells you what a lab says it will do. Ask for the reports it produces, not just the framework.</p>',
  code: {
    title: 'Sort a capability',
    note: 'Our own sketch of the two sortings, based on the course\'s comparison (code/main.py).',
    text: `
OPENAI = {"cyber": "tracked", "ai_self_improvement": "tracked",
          "long_range_autonomy": "research", "sandbagging": "research"}

def deepmind_gate(capability, domain):
    if capability == "autonomy":
        return domain in {"ml_rnd", "cyber"}     # counts only inside a domain
    return capability in {"cbrn", "cyber", "manipulation", "ml_rnd"}

def openai_gate(capability):
    return OPENAI.get(capability) == "tracked"
`,
  },
};
