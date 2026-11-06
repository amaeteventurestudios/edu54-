// Automated red teaming (phase 18, lessons 12, 13, 14 and 16): before launch, a Nairobi bank red-teams its assistant against three published attack
// families, described not reproduced: iterative refinement by an attacker model (PAIR, usually within about 20 queries), many-shot prompts that
// fill a long context with fake compliant turns (success grows as a power law in the number of shots), and requests whose key words are drawn as
// ASCII art. Defences (input and output classifiers, a many-shot detector that trims long fabricated dialogues, normalising ASCII art, and a
// regression suite run on every model update with a scanner such as garak or PyRIT) are toggled; attack success is computed live.
function asr(o) {
  const pair = (1 - Math.pow(1 - 0.06 * (o.cls ? 0.35 : 1) * (o.outCls ? 0.5 : 1), o.queries));
  const ms = Math.min(0.85, 0.012 * Math.pow(o.shots, 0.75)) * (o.msDetect ? (o.shots > 32 ? 0.05 : 1) : 1) * (o.cls ? 0.8 : 1);
  const art = 0.55 * (o.normalize ? 0.1 : 1) * (o.outCls ? 0.5 : 1);
  const regress = o.suite ? 0 : 1;
  return { pair, ms, art, regress };
}

export default {
  slug: 'automated-red-teaming',
  title: 'Automated red teaming: attack your model before others do',
  description: 'Before launch, a bank in Nairobi red-teams its assistant against three published attacks. No wall stops all three, so stack layers and rerun after every update.',
  overview: 'Red teaming used to mean people writing adversarial prompts by hand. Automated attacks now find weaknesses faster than people can, so defenders need automation too. Three published families show the range. PAIR (Prompt Automatic Iterative Refinement, Chao and colleagues, 2023) gives an attacker model a red-team instruction and lets it refine its attempt using the target\'s refusals as feedback; it typically succeeds within about twenty queries, black-box, with no access to weights. Many-shot jailbreaking (Anil and colleagues, Anthropic, 2024) exploits long context windows: fill the prompt with hundreds of fabricated turns in which an assistant complied with harmful requests, then ask the real question; success follows a power law in the number of shots, failing at a handful and becoming reliable at a few hundred. ArtPrompt (Jiang and colleagues, 2024) masks the safety-relevant words of a request and redraws them as ASCII art, which models read but safety training doesn\'t recognise. Defences come in layers. Input and output classifiers (such as Llama Guard) catch much of the obvious; an output check catches what slips past the input. A many-shot defence detects long fabricated dialogues and trims or refuses them. Normalising unusual encodings, ASCII art among them, before classification removes a whole class of disguise. And because each model update can reopen old holes, keep a regression suite of known attacks and run it automatically with a scanner such as NVIDIA\'s garak or Microsoft\'s PyRIT before every release. Red-team findings feed back into training and filters; none of these layers is complete alone, and attackers adapt.',
  keywords: ['red teaming', 'jailbreaks', 'PAIR', 'many-shot jailbreaking', 'AI safety', 'garak', 'Llama Guard'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { cls: true, outCls: true, msDetect: true, normalize: true, suite: true, queries: 20, shots: 256 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    const ATT = [['pair', 'iterative refinement', 'an attacker model refines\nits attempt from each refusal'], ['ms', 'many-shot', 'hundreds of fake compliant\nturns, then the real ask'], ['art', 'ASCII-art words', 'key words redrawn as\nASCII art']];
    /* three attackers, each with a tower for how often it gets through */
    const atts = ATT.map(([k], i) => {
      const z = -0.95 + i * 0.5;
      const r = P.robot(['#E07A5F', '#D9A441', '#7B6FA8'][i], { scale: 0.48 }); r.position.set(-2.2, 0, z); S.add(r);
      const t = P.tower(0.36, 0.36, BAD, { h: 0.3 }); t.userData.set({ cap: '' }); t.position.set(0.5, 0, z); S.add(t);
      S.add(P.rod(V(-2.0, 0.1, z), V(0.3, 0.1, z), 0.016, '#B9B3A6'));
      return { k, t };
    });
    const DEF = [['cls', 'input classifier'], ['outCls', 'output classifier'], ['msDetect', 'many-shot detector'], ['normalize', 'normalise encodings'], ['suite', 'regression suite']];
    /* five layers as walls between the attackers and the model */
    const walls = DEF.map(([k], i) => { const b = P.box(0.08, 0.3, 1.4, '#5B8DB8', { r: 0.02 }); b.position.set(-1.5 + i * 0.3, 0, -0.45); S.add(b); return { k, b }; });
    /* the model behind them */
    const model = P.robot('#3D6BD6', { scale: 0.7 }); model.position.set(1.3, 0, -0.45); S.add(model);
    S.add(P.keep(-2.4, 1.6, 0.95, -1.2, 0.3));
    const parts = [model, ...atts.map(a => a.t)];
    let R = null;
    function draw() {
      R = asr(st);
      atts.forEach(A => { const x = R[A.k]; A.t.userData.set({ h: Math.max(0.03, x * 0.9), color: x > 0.1 ? BAD : GOOD }); });
      walls.forEach(w => { w.b.visible = !!st[w.k]; });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Attacker\'s query budget', min: 1, max: 60, step: 1, get: () => st.queries, set: v => set({ queries: Math.round(v) }) },
      { type: 'slider', label: 'Fabricated turns in a many-shot prompt', min: 4, max: 512, step: 4, log: true, get: () => st.shots, set: v => set({ shots: Math.round(v) }) },
      { type: 'toggle', label: 'Input classifier', short: 'Input check', get: () => st.cls, set: v => set({ cls: !!v }) },
      { type: 'toggle', label: 'Output classifier', short: 'Output check', get: () => st.outCls, set: v => set({ outCls: !!v }) },
      { type: 'toggle', label: 'Detect and trim long fabricated dialogues', short: 'Many-shot detector', get: () => st.msDetect, set: v => set({ msDetect: !!v }) },
      { type: 'toggle', label: 'Normalise unusual encodings, ASCII art included', short: 'Normalise', get: () => st.normalize, set: v => set({ normalize: !!v }) },
      { type: 'toggle', label: 'Regression suite on every model update', short: 'Regression suite', get: () => st.suite, set: v => set({ suite: !!v }) },
    ];
    const readouts = [
      { label: 'Iterative refinement', get: () => ({ v: `${Math.round(R.pair * 100)}%`, sub: `in ${st.queries} queries`, good: R.pair < 0.1, bad: R.pair > 0.3 }) },
      { label: 'Many-shot', get: () => ({ v: `${Math.round(R.ms * 100)}%`, sub: `${st.shots} turns`, good: R.ms < 0.1, bad: R.ms > 0.3 }) },
      { label: 'ASCII-art words', get: () => ({ v: `${Math.round(R.art * 100)}%`, sub: 'succeed', good: R.art < 0.1, bad: R.art > 0.3 }) },
    ];
    const labels = [
      { name: 'a', t: 'Three attack families', d: 'From published research', icon: 'target', atV: V(-2.38, 0.2, -0.45) },
      { name: 'd', t: 'Attack success', d: 'Short and teal: the layers held', icon: 'shield', atV: V(0.7, 0.2, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Rely on one input filter', hint: 'no other layers', on: () => set({ ...D0, outCls: false, msDetect: false, normalize: false, suite: false }), off: reset },
      { label: 'Ignore long fabricated dialogues', hint: 'no many-shot detector', on: () => set({ ...D0, msDetect: false }), off: reset },
      { label: 'Skip the regression suite', hint: 'a model update', on: () => set({ ...D0, suite: false }), off: reset },
    ];
    function status() {
      if (!st.outCls && !st.msDetect && !st.normalize) return { ok: false, msg: `<b>With only an input filter: iterative refinement succeeds ${Math.round(R.pair * 100)}% of the time within ${st.queries} queries, many-shot ${Math.round(R.ms * 100)}% at ${st.shots} turns, ASCII-art words ${Math.round(R.art * 100)}%.</b> Each family gets past a single filter in its own way; layers catch what others miss.` };
      if (!st.msDetect) return { ok: false, msg: `<b>Without a many-shot detector, ${st.shots} fabricated compliant turns get the real request through ${Math.round(R.ms * 100)}% of the time.</b> Success grows as a power law in the number of shots; detect long fabricated dialogues and trim or refuse them.` };
      if (!st.suite) return { ok: false, msg: '<b>The defences hold today, but the model was updated last week and nobody re-ran the known attacks.</b> Updates can reopen old holes. Keep a regression suite of attacks and run it with a scanner such as garak or PyRIT before every release.' };
      if (!st.normalize) return { ok: false, msg: `<b>Key words drawn as ASCII art pass the classifiers ${Math.round(R.art * 100)}% of the time: models read them, safety training doesn\'t recognise them.</b> Normalise unusual encodings before classifying.` };
      return { ok: true, msg: `<b>All layers on: iterative refinement ${Math.round(R.pair * 100)}% within ${st.queries} queries, many-shot ${Math.round(R.ms * 100)}%, ASCII-art words ${Math.round(R.art * 100)}%, and the suite re-runs on every update.</b> ${R.pair > 0.1 ? 'A patient attacker still gets through sometimes: more queries mean more chances. ' : ''}Feed every finding back into training and filters; attackers adapt.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Attack it first', home: true, say: 'Before launch, a bank in Nairobi red-teams its assistant with automated attacks from published research.', act: m => m.set({ cls: true, outCls: false, msDetect: false, normalize: false, suite: false, queries: 20, shots: 256 }) },
    { t: 'An attacker that learns', home: true, say: 'An attacker model refines its request from each refusal. Within twenty tries, it often gets through one filter.', act: m => m.set({ cls: true, outCls: false, msDetect: false, normalize: false, suite: false, queries: 20, shots: 256 }) },
    { t: 'Many shots', home: true, say: 'Hundreds of fake conversations where the assistant complied, then the real request. More shots, more success.', act: m => m.set({ cls: true, outCls: false, msDetect: false, normalize: false, suite: false, queries: 20, shots: 512 }) },
    { t: 'Disguised words', home: true, say: 'Key words drawn in ASCII art are read by the model and missed by its safety training.', act: m => m.set({ cls: true, outCls: false, msDetect: false, normalize: false, suite: false, queries: 20, shots: 256 }) },
    { t: 'Layers', home: true, say: 'Check outputs too, detect long fabricated dialogues, and normalise unusual encodings before classifying.', act: m => m.set({ cls: true, outCls: true, msDetect: true, normalize: true, suite: false, queries: 20, shots: 256 }) },
    { t: 'Every update', home: true, say: 'Re-run the known attacks automatically on every model update. Old holes reopen.', act: m => m.set({ cls: true, outCls: true, msDetect: true, normalize: true, suite: true, queries: 20, shots: 256 }) },
  ],
  check: [
    { q: 'How does many-shot jailbreaking scale?', options: ['Success grows as a power law in the number of fake turns', 'It needs only one turn', 'It doesn\'t depend on length'], answer: 0, why: 'Long contexts enable it.', hint: 'Move the many-shot slider.' },
    { q: 'Why normalise encodings before classifying?', options: ['Disguises like ASCII art slip past classifiers', 'It is faster', 'Models need it'], answer: 0, why: 'Remove a class of disguise.', hint: 'Turn off Normalise.' },
    { q: 'Why run a regression suite on every update?', options: ['Updates can reopen old holes', 'It trains the model', 'It is free'], answer: 0, why: 'Known attacks must stay blocked.', hint: 'Try Skip the regression suite.' },
  ],
  terms: [
    ['Red teaming', 'Attacking your own system to find weaknesses first.'],
    ['PAIR', 'An attacker model iteratively refining a jailbreak from refusals.'],
    ['Many-shot jailbreaking', 'Filling a long context with fake compliant turns.'],
    ['ArtPrompt', 'Hiding key words as ASCII art.'],
    ['Regression suite', 'Known attacks re-run before every release.'],
    ['garak and PyRIT', 'Open-source scanners for automating LLM red teaming.'],
  ],
  deeper: '<p><b>Black-box.</b> These attacks need no access to the model\'s weights, only its replies, so any deployed assistant is exposed.</p><p><b>Responsible disclosure.</b> Published attack research usually notifies model makers first; red-team findings inside a company should flow straight into filters and training.</p><p><b>About this machine.</b> Success rates are illustrative, shaped by the published findings (PAIR within about 20 queries, many-shot as a power law); no working attack prompts are included.</p>',
  code: {
    title: 'A red-team regression gate',
    note: 'Written for this lesson; attack corpora are referenced by name, not reproduced.',
    text: `
SUITES = ["pair_refinement", "many_shot", "encoding_disguise", "prompt_injection"]

def release_gate(model, guard, max_success=0.02):
    report = {}
    for suite in SUITES:
        attacks = load_suite(suite)                      # maintained internally
        hits = sum(is_harmful(guard.check_out(model(guard.check_in(normalise(a)))))
                   for a in attacks)
        report[suite] = hits / len(attacks)
    failing = {s: r for s, r in report.items() if r > max_success}
    return ("block release", failing) if failing else ("release", report)

# e.g. garak --model_type rest --probes encoding,dan,latentinjection
`,
  },
};
