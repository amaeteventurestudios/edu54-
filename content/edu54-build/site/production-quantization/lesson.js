// Production quantization (phase 17, lesson 9): a Nairobi health line must pick a format. Six formats, three things to match: hardware, engine, workload. Weight memory for a 70B model is computed; the KV cache isn't touched.
// The calibration trap: GPTQ, AWQ and similar are calibrated on sample text. Calibrate on English news and serve Swahili clinical notes, and quality falls. A format that doesn't fit the engine won't run.
const FMT = {
  gguf: { n: 'GGUF Q4_K_M', bits: 4.5, hw: ['cpu'], eng: ['llama'], cal: false, why: 'CPU, edge and laptops' },
  gptq: { n: 'GPTQ', bits: 4, hw: ['hopper'], eng: ['vllm'], cal: true, why: 'multi-LoRA on vLLM' },
  awq: { n: 'AWQ', bits: 4, hw: ['hopper'], eng: ['vllm'], cal: true, why: 'datacentre GPU production' },
  fp8: { n: 'FP8', bits: 8, hw: ['hopper', 'blackwell'], eng: ['vllm', 'trt'], cal: false, why: 'quality-sensitive datacentre work' },
  nvfp4: { n: 'NVFP4', bits: 4, hw: ['blackwell'], eng: ['trt'], cal: false, why: 'Blackwell at many users' },
};
const P70 = 70, KV = 25, RAM = { cpu: 64, hopper: 80, blackwell: 192 };
function run(o) {
  const f = FMT[o.f], w = P70 * f.bits / 8, mem = w + (o.hw === 'cpu' ? 3 : KV);
  const hwOk = f.hw.includes(o.hw), engOk = f.eng.includes(o.eng);
  let q = f.bits >= 8 ? 99 : 96; if (o.task === 'reason' && f.bits < 8) q -= 6; if (f.cal && o.calib === 'news') q -= 11;
  return { f, w, mem, hwOk, engOk, q, fits: mem <= RAM[o.hw], ok: hwOk && engOk && q >= 90 && mem <= RAM[o.hw] };
}

export default {
  slug: 'production-quantization',
  title: 'Production quantization: match format to hardware and traffic',
  description: 'Six formats and no universal best. Hardware, engine and your own text decide, and calibrating on the wrong text costs quality.',
  overview: 'A 70B model at FP16 takes 140 GB of weights. At four bits it takes 35, leaving room for the KV cache, which quantization doesn\'t shrink. There are six formats in common use, and copying someone else\'s choice is a mistake. GGUF owns CPU and edge through llama.cpp. GPTQ suits many LoRA adapters on vLLM. AWQ suits datacentre GPU production. FP8 is the safe choice for quality on modern accelerators. MXFP4 and NVFP4 are for Blackwell. Pick by hardware, then engine, then workload. There is one trap too: formats that are calibrated learn from a sample of text, and if that sample isn\'t like your traffic, quality falls where you need it most.',
  keywords: ['quantization', 'GGUF', 'AWQ', 'GPTQ', 'FP8', 'NVFP4', 'calibration'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { f: 'awq', hw: 'hopper', eng: 'vllm', task: 'chat', calib: 'own' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const tank = add(P.tank(0.9, 1.1, 0.7, BLUE)); tank.position.set(-1.9, 0.08, -0.1);
    const kv = add(P.tank(0.5, 1.1, 0.7, '#7B6FA8')); kv.position.set(-1.1, 0.08, -0.1); kv.userData.set({ level: 25 / 140 });
    const KS = Object.keys(FMT), X = i => -0.25 + i * 0.5;
    const T = KS.map((k, i) => { const t = add(P.tower(0.38, 0.5, GREY)); t.position.set(X(i), 0.03, -0.25); t.userData.set({ cap: '', h: FMT[k].bits * 0.09 }); return t; });
    const lamp = add(P.lamp(GOOD, { h: 0.34, r: 0.11 })); lamp.position.set(0.75, 0.03, 0.45);
    const dial = add(P.dial(0.32)); dial.position.set(1.6, 0.03, 0.45);
    S.add(P.keep(-2.5, 2.5, 1.25, -0.72, 0.8));
    let R = null;
    function draw() {
      R = run(st);
      tank.userData.set({ level: R.w / 140, color: R.fits ? BLUE : BAD });
      T.forEach((t, i) => { const k = KS[i], r = run({ ...st, f: k }), on = k === st.f; t.userData.set({ color: on ? (R.ok ? GOOD : BAD) : r.hwOk && r.engOk ? '#A9CFC6' : GREY }); });
      lamp.userData.set({ color: R.ok ? GOOD : BAD, on: true });
      dial.userData.set({ v: (100 - R.q) / 20 });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const HK = ['cpu', 'hopper', 'blackwell'], EK = ['llama', 'vllm', 'trt'], TK = ['chat', 'reason'], CK = ['own', 'news'];
    const controls = [
      { type: 'buttons', label: 'Format', options: ['GGUF', 'GPTQ', 'AWQ', 'FP8', 'NVFP4'], get: () => KS.indexOf(st.f), act: i => set({ f: KS[i] }) },
      { type: 'buttons', label: 'Hardware', options: ['CPU', 'Hopper', 'Blackwell'], get: () => HK.indexOf(st.hw), act: i => set({ hw: HK[i] }) },
      { type: 'buttons', label: 'Engine', options: ['llama.cpp', 'vLLM', 'TRT-LLM'], get: () => EK.indexOf(st.eng), act: i => set({ eng: EK[i] }) },
      { type: 'buttons', label: 'Workload', options: ['Routine chat', 'Careful reasoning'], get: () => TK.indexOf(st.task), act: i => set({ task: TK[i] }) },
      { type: 'buttons', label: 'Calibrated on', options: ['Our own notes', 'English news'], get: () => CK.indexOf(st.calib), act: i => set({ calib: CK[i] }) },
    ];
    const readouts = [
      { label: 'Weights', get: () => ({ v: `${R.w.toFixed(0)} GB`, sub: 'from 140 GB at FP16' }) },
      { label: 'With KV cache', get: () => ({ v: `${R.mem.toFixed(0)} GB`, sub: `${RAM[st.hw]} GB available`, good: R.fits, bad: !R.fits }) },
      { label: 'Quality', get: () => ({ v: `${R.q}%`, sub: 'on your traffic, illustrative', good: R.q >= 95, bad: R.q < 90 }) },
    ];
    const labels = [
      { name: 'm', t: 'Weights, then KV cache', d: 'Quantizing shrinks only blue', icon: 'box', atV: V(-2.4, 0.5, -0.1) },
      { name: 'f', t: 'Formats by bits', d: 'Pale green: runs on your stack', icon: 'target', atV: V(X(4) + 0.2, 0.2, -0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Calibrate on English news', hint: 'serve Swahili clinical notes', on: () => set({ ...D0, calib: 'news' }), off: reset },
      { label: 'Copy a Blackwell format', hint: 'on Hopper with vLLM', on: () => set({ ...D0, f: 'nvfp4' }), off: reset },
      { label: 'Four bits for careful reasoning', hint: 'triage advice', on: () => set({ ...D0, task: 'reason', calib: 'news' }), off: reset },
      { label: 'A GPU format on a CPU box', hint: 'it won\'t load', on: () => set({ ...D0, hw: 'cpu', eng: 'llama' }), off: reset },
    ];
    function status() {
      if (!R.hwOk || !R.engOk) return { ok: false, msg: `<b>${R.f.n} won't run here.</b> It suits ${R.f.why}. Formats depend on kernels that exist for particular hardware and engines. Choose hardware first, then engine, then look at what fits.` };
      if (!R.fits) return { ok: false, msg: `<b>${R.mem.toFixed(0)} GB needed, ${RAM[st.hw]} available.</b> Remember the KV cache: quantizing weights leaves it just as large.` };
      if (R.f.cal && st.calib === 'news') return { ok: false, msg: `<b>Quality fell to ${R.q}% on your traffic.</b> ${R.f.n} chose what to preserve by looking at English news, and your text is Swahili clinical notes. Benchmarks on general text won't show it. Calibrate on your own traffic.` };
      if (st.task === 'reason' && R.f.bits < 8) return { ok: false, msg: `<b>${R.q}% on careful reasoning.</b> Four bits is fine for routine chat, and loses more where each step depends on the last. For this work, spend the memory on FP8.` };
      return { ok: true, msg: `<b>${R.f.n} fits: ${R.w.toFixed(0)} GB of weights, ${R.mem.toFixed(0)} GB in all, ${R.q}% quality.</b> It suits ${R.f.why}.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Memory is the prize', home: true, say: 'A health line in Nairobi serves a large model. At sixteen bits the blue weights leave little room. At four bits they fit.', act: m => m.set({ f: 'awq', hw: 'hopper', eng: 'vllm', task: 'chat', calib: 'own' }) },
    { t: 'KV stays', home: true, say: 'The purple tank is the KV cache. Quantizing the weights leaves it just as large, so count it.', act: m => m.set({ f: 'fp8', hw: 'hopper', eng: 'vllm', task: 'chat', calib: 'own' }) },
    { t: 'Match the stack', home: true, say: 'A format that shines on Blackwell won\'t run here. Hardware first, then engine, then workload.', act: m => m.set({ f: 'nvfp4', hw: 'hopper', eng: 'vllm', task: 'chat', calib: 'own' }) },
    { t: 'The edge', home: true, say: 'On a CPU box in a rural clinic, GGUF is the answer, through llama.cpp.', act: m => m.set({ f: 'gguf', hw: 'cpu', eng: 'llama', task: 'chat', calib: 'own' }) },
    { t: 'The calibration trap', home: true, say: 'AWQ learned what to keep from English news. The line serves Swahili clinical notes, and quality falls where it matters.', act: m => m.set({ f: 'awq', hw: 'hopper', eng: 'vllm', task: 'chat', calib: 'news' }) },
    { t: 'Your own text', home: true, say: 'Calibrate on your own traffic. And for careful reasoning, spend the memory on more bits.', act: m => m.set({ f: 'fp8', hw: 'hopper', eng: 'vllm', task: 'reason', calib: 'own' }) },
  ],
  check: [
    { q: 'Which memory does weight quantization not shrink?', options: ['The KV cache', 'The weights', 'The tokenizer weights only'], answer: 0, why: 'It grows with users and context.', hint: 'See KV stays.' },
    { q: 'What is the calibration trap?', options: ['Calibrating on text unlike your traffic', 'Calibrating twice', 'Using too many bits'], answer: 0, why: 'Quality falls on your own domain.', hint: 'Try Calibrate on English news.' },
    { q: 'What is the right order for choosing?', options: ['Hardware, engine, then workload', 'Name, stars, then price', 'Workload only'], answer: 0, why: 'Formats depend on available kernels.', hint: 'Try Copy a Blackwell format.' },
  ],
  terms: [
    ['Quantization', 'Storing numbers in fewer bits.'],
    ['GGUF', 'A file format for llama.cpp, for CPU and edge.'],
    ['GPTQ', 'Post-training quantization with a calibration pass.'],
    ['AWQ', 'Activation-aware quantization.'],
    ['FP8', 'An 8-bit floating-point format.'],
    ['Calibration', 'Learning what to preserve from sample text.'],
  ],
  deeper: '<p><b>MXFP4.</b> It sits beside NVFP4 as a standard 4-bit format for Blackwell, and is left off the buttons here for space.</p><p><b>Test on your text.</b> Run your own evaluation on the quantized model before you ship. General scores hide domain loss.</p><p><b>Numbers.</b> Memory is computed from bits. Quality figures are illustrative.</p>',
  code: {
    title: 'Size and calibrate',
    note: 'A sketch using the course\'s memory sum (code/main.py).',
    text: `
def weights_gb(params_billion, bits):
    return params_billion * bits / 8

weights_gb(70, 16)   # 140 GB
weights_gb(70, 4)    # 35 GB, the KV cache is extra

recipe = QuantizationModifier(scheme="W4A16", targets="Linear")
oneshot(model=MODEL, recipe=recipe,
        dataset=sample_of_our_own_notes, num_calibration_samples=512)
`,
  },
};
