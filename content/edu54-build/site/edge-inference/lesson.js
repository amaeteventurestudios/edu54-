// Edge inference (phase 17, lesson 12): a Ugandan agricultural extension app wants an offline assistant for farmers. Decoding reads every weight
// once per token, so tokens per second are capped by memory bandwidth ÷ model size, whatever the chip's compute. Model size, weight precision and
// the device (a budget Android phone, a flagship phone, a laptop in the browser over WebGPU, a Jetson box at the co-operative) are set; the
// ceiling, whether the model fits in memory and whether it beats a readable 8 tokens a second are computed live.
const DEV = {
  budget: { name: 'budget Android phone', bw: 12, ram: 4, free: 2 },
  flagship: { name: 'flagship phone', bw: 70, ram: 12, free: 5 },
  browser: { name: 'laptop browser (WebGPU)', bw: 100, ram: 16, free: 6, eff: 0.75 },
  jetson: { name: 'Jetson box at the co-op', bw: 200, ram: 32, free: 24 },
};
const BITS = { 16: 'FP16', 8: 'INT8', 4: '4-bit' };
function edge(o) {
  const d = DEV[o.dev], gb = o.params * o.bits / 8 * 1.1, fits = gb <= d.free;
  const ceil = d.bw / gb * (d.eff || 1) * 0.85;
  const q = o.bits === 16 ? 1 : o.bits === 8 ? 0.99 : 0.96;
  return { d, gb, fits, ceil, q, ok: fits && ceil >= 8 };
}

export default {
  slug: 'edge-inference',
  title: 'Edge inference: bandwidth sets the speed',
  description: 'An agricultural extension app in Uganda wants an assistant that works offline, on whatever device a farmer or co-operative has.',
  overview: 'Running a model on the device means privacy by default, no data bill and no dependence on a signal, which matters for farmers far from a mast. It also means a hard limit. Decoding reads the full set of weights for every token, so the ceiling on tokens per second is memory bandwidth divided by the model\'s size in bytes, whatever the chip\'s advertised compute. A 7-billion-parameter model in 4-bit is about 3.5 GB; reading that at 50 GB/s takes 70 ms, a ceiling near 14 tokens a second. A data-centre GPU with HBM at 3 TB/s clears it in about a millisecond. The levers are therefore size and precision: smaller models (1 to 3 billion parameters are practical on phones) and fewer bits per weight (INT8 or 4-bit), which also decide whether the model fits in the memory the operating system will give an app at all. Each target has its own toolchain and preferred format. Apple\'s Neural Engine shares unified memory with the CPU and is reached through Core ML, typically with 4-bit weights and 16-bit activations. Qualcomm\'s Hexagon NPU uses the QNN SDK and AI Hub, with INT8 or INT4. In the browser, WebGPU with WebLLM runs 4-bit models at roughly three quarters of native speed with no install, though mobile browser support is still incomplete. NVIDIA\'s Jetson boards run serving engines with the data-centre tricks (speculative decoding, FP4 weights) at the edge. For budget phones, the honest answer may be a very small model, or a hybrid: answer simple questions on the device and send hard ones to a server when there is signal.',
  keywords: ['edge inference', 'on-device AI', 'memory bandwidth', 'quantization', 'WebGPU', 'mobile LLM', 'Jetson'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { params: 3, bits: 4, dev: 'flagship', tops: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const mem = P.box(1.4, 0.04, 1.9, '#F6F1E6', { r: 0.04 }); mem.position.set(-2.2, 0.12, -0.25); floor.add(mem);
    const freeM = new THREE.MeshLambertMaterial({ color: '#CFE0EE', transparent: true, opacity: 0.55 }), free = P.box(1.1, 1, 1.5, '#fff', { r: 0.04, material: freeM }); free.position.set(-2.2, 0.14, -0.25); free.userData.noFit = true; floor.add(free);
    const wM = new THREE.MeshLambertMaterial({ color: SAF }), wts = P.box(0.8, 1, 1.2, SAF, { r: 0.04, material: wM }); wts.position.set(-2.2, 0.14, -0.25); wts.userData.noFit = true; floor.add(wts);

    const pipe = P.cyl(0.1, 2.2, '#5B8DB8'); pipe.rotation.z = Math.PI / 2; pipe.position.set(0.0, 0.35, -0.25); pipe.userData.noFit = true; floor.add(pipe);

    const gm = new THREE.MeshLambertMaterial({ color: GOOD }), gauge = P.box(0.5, 1, 0.5, GOOD, { r: 0.04, material: gm }); gauge.position.set(1.25, 0.12, -0.25); gauge.userData.noFit = true; floor.add(gauge);
    const line8 = P.box(0.7, 0.012, 0.7, RED, { r: 0.002 }); line8.position.set(1.25, 0.12 + 8 * 0.025, -0.25); floor.add(line8);

    const dm = new THREE.MeshLambertMaterial({ color: '#FFF' }), db = P.box(1.3, 0.06, 1.85, '#fff', { r: 0.04, material: dm }); db.position.set(2.5, 0.12, -0.3); floor.add(db);

    const sm = new THREE.MeshLambertMaterial({ color: '#FFF' }), strip = P.box(6.0, 0.04, 0.42, '#fff', { r: 0.04, material: sm }); strip.position.set(0, 0.12, 1.4); floor.add(strip);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function draw() {
      R = edge(st);
      const ms = 0.06;
      free.scale.y = R.d.free * ms; wts.scale.y = Math.min(1.6, R.gb * ms); wM.color.set(R.fits ? SAF : BAD);
      pipe.scale.set(1, 1, 1); pipe.material.color.set('#5B8DB8'); pipe.scale.x = 0.3 + R.d.bw / 200;
      gauge.scale.y = Math.max(0.01, Math.min(1.2, R.ceil * 0.025)); gm.color.set(R.ok ? GOOD : BAD);
      dm.color.set(R.ok ? '#D9F0E9' : '#F7DED5');
      sm.color.set('#FFFFFF');

    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const DK = ['budget', 'flagship', 'browser', 'jetson'];
    const controls = [
      { type: 'slider', label: 'Model size, billions of parameters', min: 1, max: 8, step: 1, get: () => st.params, set: v => set({ params: Math.round(v) }) },
      { type: 'buttons', label: 'Weight precision', options: ['16-bit', '8-bit', '4-bit'], get: () => [16, 8, 4].indexOf(st.bits), act: i => set({ bits: [16, 8, 4][i] }) },
      { type: 'buttons', label: 'Device', options: ['Budget phone', 'Flagship phone', 'Browser', 'Jetson'], get: () => DK.indexOf(st.dev), act: i => set({ dev: DK[i] }) },
    ];
    const readouts = [
      { label: 'Speed ceiling', get: () => ({ v: R.fits ? `${R.ceil.toFixed(1)} tok/s` : '—', sub: 'bandwidth ÷ size', good: R.ok, bad: !R.ok }) },
      { label: 'Weights', get: () => ({ v: `${R.gb.toFixed(1)} GB`, sub: `${R.d.free} GB free`, good: R.fits, bad: !R.fits }) },
      { label: 'Quality', get: () => ({ v: `${Math.round(R.q * 100)}%`, sub: 'of full precision' }) },
    ];
    const labels = [
      { name: 'mem', t: 'Memory the app gets', d: 'Does the model fit?', icon: 'box', atV: V(-2.92, 0.3, -0.25) },
      { name: 'gauge', t: 'Tokens a second', d: 'Capped by bandwidth', icon: 'bolt', atV: V(1.25, 0.6, -0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Full precision on a phone', hint: '16-bit, 3B', on: () => set({ ...D0, bits: 16 }), off: reset },
      { label: 'A big model on a budget phone', hint: '7B, 4-bit', on: () => set({ ...D0, params: 7, dev: 'budget' }), off: reset },
      { label: 'Trust the chip\'s compute figure', hint: 'a budget phone\'s NPU', on: () => set({ ...D0, dev: 'budget', tops: true }), off: reset },
    ];
    function status() {
      if (!R.fits) return { ok: false, msg: `<b>${st.params === 8 ? 'An' : 'A'} ${st.params}-billion-parameter model in ${BITS[st.bits]} is ${R.gb.toFixed(1)} GB, and the ${R.d.name} gives an app about ${R.d.free} GB: it doesn\'t fit.</b> ${st.dev === 'budget' ? 'On budget phones the honest answer is a model of a billion or two parameters in 4-bit, or answering hard questions on a server when there is signal.' : 'Use fewer bits per weight, or a smaller model.'}` };
      if (R.ceil < 8) return { ok: false, msg: `<b>It fits, but the ${R.d.name} reads memory at ${R.d.bw} GB/s, and every token reads all ${R.gb.toFixed(1)} GB: a ceiling of ${R.ceil.toFixed(1)} tokens a second, below a readable eight.</b> ${st.tops ? 'Its NPU advertises plenty of compute, but that doesn\'t help: decoding waits on memory. ' : ''}Shrink the model or the bits.` };
      return { ok: true, msg: `<b>${st.params === 8 ? 'An' : 'A'} ${st.params}-billion-parameter model in ${BITS[st.bits]} is ${R.gb.toFixed(1)} GB: it fits on the ${R.d.name} and decodes at up to ${R.ceil.toFixed(1)} tokens a second, offline, at about ${Math.round(R.q * 100)}% of full-precision quality.</b> Bandwidth divided by size sets the ceiling.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Offline, on the device', home: true, say: 'An extension app in Uganda wants an assistant that works with no signal, on whatever device a farmer has.', act: m => m.set({ params: 3, bits: 4, dev: 'flagship', tops: false }) },
    { t: 'Bandwidth sets the speed', home: true, say: 'Each word reads every weight once. Speed is memory bandwidth divided by the model\'s size.', act: m => m.set({ params: 3, bits: 4, dev: 'flagship', tops: false }) },
    { t: 'Full precision', home: true, say: 'At sixteen bits the same model is four times larger, four times slower, and may not fit.', act: m => m.set({ params: 3, bits: 16, dev: 'flagship', tops: false }) },
    { t: 'A budget phone', home: true, say: 'A budget phone has little free memory and slow bandwidth. A seven-billion-parameter model doesn\'t fit at all.', act: m => m.set({ params: 7, bits: 4, dev: 'budget', tops: false }) },
    { t: 'Small enough', home: true, say: 'A one-billion-parameter model in four bits fits and is readable. Or answer hard questions on a server when there is signal.', act: m => m.set({ params: 1, bits: 4, dev: 'budget', tops: false }) },
    { t: 'At the co-operative', home: true, say: 'A Jetson box at the co-operative has the bandwidth for a larger model, shared by everyone nearby.', act: m => m.set({ params: 8, bits: 4, dev: 'jetson', tops: false }) },
  ],
  check: [
    { q: 'What caps on-device decoding speed?', options: ['Memory bandwidth divided by model size', 'The chip\'s compute figure', 'Screen size'], answer: 0, why: 'Every token reads every weight.', hint: 'Try Trust the chip\'s compute figure.' },
    { q: 'Why use 4-bit weights on a phone?', options: ['Smaller, so it fits and decodes faster', 'Better quality', 'Phones require it'], answer: 0, why: 'Size is the lever.', hint: 'Try Full precision on a phone.' },
    { q: 'What suits a budget phone?', options: ['A very small model, or a server for hard questions', 'A 7B model', 'Full precision'], answer: 0, why: 'Little memory, slow bandwidth.', hint: 'Try A big model on a budget phone.' },
  ],
  terms: [
    ['Memory bandwidth', 'How fast weights can be read, in GB/s.'],
    ['Bandwidth-bound', 'Speed limited by reading memory, not by arithmetic.'],
    ['Quantization', 'Storing weights in fewer bits.'],
    ['NPU', 'A neural processing unit on a phone or laptop chip.'],
    ['WebGPU', 'Browser access to the GPU, used by WebLLM.'],
    ['Hybrid inference', 'Easy queries on the device, hard ones on a server.'],
  ],
  deeper: '<p><b>Formats per target.</b> Core ML with 4-bit weights for Apple\'s Neural Engine; QNN INT8 or INT4 for Qualcomm\'s Hexagon; 4-bit WebGPU builds in the browser; FP4 and speculative decoding on newer Jetson boards.</p><p><b>Prefill is different.</b> Reading the prompt is compute-bound, so long prompts are where the NPU\'s compute does help.</p><p><b>About this machine.</b> Device bandwidths, free memory and quality losses are illustrative; the ceiling is bandwidth ÷ size, computed live.</p>',
  code: {
    title: 'The bandwidth ceiling',
    note: 'Adapted from the course\'s edge-inference sketch (code/main.py).',
    text: `
def model_gb(params_billion, bits, overhead=1.1):
    return params_billion * bits / 8 * overhead

def max_tokens_per_second(bandwidth_gb_s, params_billion, bits, efficiency=0.85):
    return bandwidth_gb_s / model_gb(params_billion, bits) * efficiency

# 3B in 4-bit on a 70 GB/s phone: 70 / 1.65 * 0.85 ≈ 36 tokens a second
# 7B in 4-bit on a 12 GB/s budget phone: 3.9 GB, doesn't fit in 2 GB free
`,
  },
};
