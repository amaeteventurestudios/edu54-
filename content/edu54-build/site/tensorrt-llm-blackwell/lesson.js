// TRT-LLM on Blackwell (phase 17, lesson 7): a Lagos API company stacks four choices: hardware, weight precision, engine, disaggregation. A memory tank shows weights plus KV; a cost tower falls with each choice.
// Figures from the course: about 0.09 per million tokens on Hopper with vLLM, about 0.012 on Blackwell with TRT-LLM and Dynamo, for a 120B model. In-between steps are round. A lock lamp shows the price of portability.
const PARAM = 120, KVGB = 40, HBM = 800;
const BYTES = { bf16: 2, fp8: 1, fp4: 0.5 };
function run(o) {
  const wg = PARAM * BYTES[o.prec], kvg = KVGB * (o.kv === 'fp4' ? 0.5 : 1), mem = wg + kvg;
  let cost = 0.09;
  cost *= o.hw === 'b' ? 0.45 : 1;
  cost *= o.prec === 'fp4' ? 0.72 : o.prec === 'fp8' ? 1 : 1.6;
  if (o.hw === 'h' && o.prec === 'fp4') cost *= 1.25;
  if (o.engine === 'trt' && o.hw === 'b') cost *= 0.62;
  if (o.split && o.engine === 'trt') cost *= 0.68;
  const lock = o.engine === 'trt', q = o.kv === 'fp4' ? 74 : o.prec === 'fp4' ? 96 : 100;
  return { wg, kvg, mem, cost, lock, q, fails: lock && o.need };
}

export default {
  slug: 'tensorrt-llm-blackwell',
  title: 'TRT-LLM on Blackwell: trading portability for price',
  description: 'Four stacked choices take tokens from one price to a seventh of it. See what each does, and what you give up.',
  overview: 'The price of a token depends on four stacked choices: GPU generation, number precision, serving engine, and how serving is split. In the course\'s figures, Blackwell with TensorRT-LLM and Dynamo runs a 120B model for about a seventh of what Hopper with vLLM costs. Some of that gap is hardware, the rest is the stack: 4-bit weights, disaggregated prefill and decode, fast all-to-all links. Note one design point: weights can go down to FP4, but the KV cache and attention stay in FP8, as errors there hurt quality much more. And the deal has a cost: outside NVIDIA\'s stack, none of it comes with you.',
  keywords: ['TensorRT-LLM', 'Blackwell', 'NVFP4', 'FP8', 'inference economics', 'disaggregated serving'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.5, 0], dir: [0.06, 0.5, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { hw: 'b', prec: 'fp4', engine: 'trt', split: true, kv: 'fp8', need: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const gpu = P.box(0.9, 0.16, 0.9, '#2C2D31', { r: 0.04, material: new S.THREE.MeshLambertMaterial({ color: '#2C2D31' }) }); gpu.position.set(-1.95, 0.03, 0); S.add(gpu);
    const tW = add(P.tank(0.62, 1.05, 0.6, BLUE)); tW.position.set(-1.0, 0.08, -0.1);
    const tK = add(P.tank(0.4, 1.05, 0.6, '#7B6FA8')); tK.position.set(-0.42, 0.08, -0.1);
    const cost = add(P.tower(0.7, 0.6, GOOD)); cost.position.set(0.55, 0.03, -0.1); cost.userData.set({ cap: '' });
    const need = add(P.dial(0.34)); need.position.set(1.45, 0.03, 0.2);
    const padl = add(P.lamp(GOOD, { h: 0.55, r: 0.12 })); padl.position.set(2.2, 0.03, -0.1);
    const parts = [0, 1].map(i => { const b = P.box(0.42, 0.2, 0.42, i ? SAF : BLUE, { r: 0.03 }); b.position.set(-2.18 + i * 0.46, 0.2, 0); b.userData.noFit = true; S.add(b); return b; });
    S.add(P.keep(-2.5, 2.5, 1.25, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      tW.userData.set({ level: R.wg / 240 }); tK.userData.set({ level: R.kvg / 45, color: st.kv === 'fp4' ? BAD : '#7B6FA8' });
      cost.userData.set({ h: Math.max(0.1, R.cost * 11), color: R.cost < 0.03 ? GOOD : R.cost < 0.07 ? SAF : BAD });
      need.userData.set({ v: 1 - R.q / 100 + (R.q < 100 ? 0.15 : 0) });
      padl.userData.set({ color: R.fails ? '#D9483B' : R.lock ? '#E3A72F' : '#3E9B5F', on: true });
      gpu.material.color.set(st.hw === 'b' ? '#2C2D31' : '#6B6E7E'); parts.forEach(p => { p.visible = !!st.split; });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const HK = ['h', 'b'], PK = ['bf16', 'fp8', 'fp4'], EK = ['vllm', 'trt'], KK = ['fp8', 'fp4'];
    const controls = [
      { type: 'buttons', label: 'GPU generation', options: ['Hopper', 'Blackwell'], get: () => HK.indexOf(st.hw), act: i => set({ hw: HK[i] }) },
      { type: 'buttons', label: 'Weight precision', options: ['BF16', 'FP8', 'FP4'], get: () => PK.indexOf(st.prec), act: i => set({ prec: PK[i] }) },
      { type: 'buttons', label: 'KV cache precision', options: ['FP8', 'FP4'], get: () => KK.indexOf(st.kv), act: i => set({ kv: KK[i] }) },
      { type: 'buttons', label: 'Engine', options: ['vLLM', 'TRT-LLM'], get: () => EK.indexOf(st.engine), act: i => set({ engine: EK[i] }) },
      { type: 'toggle', label: 'Split prefill and decode', short: 'Disaggregate', get: () => st.split, set: v => set({ split: !!v }) },
      { type: 'toggle', label: 'Must also run on non-NVIDIA chips', short: 'Portable', get: () => st.need, set: v => set({ need: !!v }) },
    ];
    const readouts = [
      { label: 'Cost per million tokens', get: () => ({ v: M(R.cost), sub: `starts at ${M(0.09)}`, good: R.cost < 0.03, bad: R.cost > 0.08 }) },
      { label: 'Memory', get: () => ({ v: `${Math.round(R.mem)} GB`, sub: `${R.wg} weights, ${R.kvg} KV` }) },
      { label: 'Quality', get: () => ({ v: `${R.q}%`, sub: 'of full precision, illustrative', good: R.q > 90, bad: R.q < 85 }) },
    ];
    const labels = [
      { name: 'w', t: 'Weights and KV memory', d: 'Blue weights, purple KV', icon: 'box', atV: V(-2.35, 0.1, 0) },
      { name: 'c', t: 'Cost and lock lamp', d: 'Gold lamp: tied to one vendor', icon: 'money', atV: V(2.4, 0.5, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Squeeze the KV cache to FP4 too', hint: 'attention suffers', on: () => set({ ...D0, kv: 'fp4' }), off: reset },
      { label: 'Need portability, chose TRT-LLM', hint: 'the lock bites', on: () => set({ ...D0, need: true }), off: reset },
      { label: 'New GPU, old stack', hint: 'Blackwell, BF16 on vLLM', on: () => set({ ...D0, prec: 'bf16', engine: 'vllm', split: false }), off: reset },
    ];
    function status() {
      if (st.kv === 'fp4') return { ok: false, msg: `<b>${Math.round(R.kvg)} GB saved on the KV cache, and quality fell to ${R.q}%.</b> Weights tolerate 4-bit well. Attention arithmetic doesn't, as small errors feed into every step. Keep KV and attention at FP8.` };
      if (R.fails) return { ok: false, msg: `<b>${M(R.cost)} per million tokens, on a stack that can't leave NVIDIA.</b> FP4 kernels, disaggregated serving and the engine are all tied to one vendor. If you need portability, price that in: vLLM on FP8 is the portable path.` };
      if (st.hw === 'b' && st.engine === 'vllm' && R.cost > 0.05) return { ok: false, msg: `<b>${M(R.cost)}: you bought the hardware, and left most of the saving behind.</b> Much of the seven-fold gap comes from the stack: precision, engine and disaggregation.` };
      return { ok: true, msg: `<b>${M(R.cost)} per million tokens, from ${M(0.09)}.</b> ${R.lock ? 'That is the portability trade: excellent economics, inside one vendor\'s stack.' : 'A portable stack at a higher price.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Where a price comes from', home: true, say: 'An API company in Lagos serves a large model on older GPUs with vLLM. This is the starting price.', act: m => m.set({ hw: 'h', prec: 'fp8', engine: 'vllm', split: false, kv: 'fp8', need: false }) },
    { t: 'New hardware', home: true, say: 'Move to Blackwell, and the cost tower drops. Most of the gain still lies in the software.', act: m => m.set({ hw: 'b', prec: 'fp8', engine: 'vllm', split: false, kv: 'fp8', need: false }) },
    { t: 'Fewer bits', home: true, say: 'Take the weights down to four bits. Memory falls by half, and so does the traffic on the memory bus.', act: m => m.set({ hw: 'b', prec: 'fp4', engine: 'vllm', split: false, kv: 'fp8', need: false }) },
    { t: 'Not everything', home: true, say: 'But keep the KV cache at FP8. Errors in attention feed into every step.', act: m => m.set({ hw: 'b', prec: 'fp4', engine: 'vllm', split: false, kv: 'fp4', need: false }) },
    { t: 'The full stack', home: true, say: 'Add TensorRT-LLM and split prefill from decode. The tower is now a fraction of where it began.', act: m => m.set({ hw: 'b', prec: 'fp4', engine: 'trt', split: true, kv: 'fp8', need: false }) },
    { t: 'The lock', home: true, say: 'None of that comes with you to other chips. You are trading portability for price, so make that trade on purpose.', act: m => m.set({ hw: 'b', prec: 'fp4', engine: 'trt', split: true, kv: 'fp8', need: true }) },
  ],
  check: [
    { q: 'Why does the KV cache stay at FP8?', options: ['Errors in attention hurt quality far more', 'FP4 is too slow', 'It is too small to matter'], answer: 0, why: 'Weights tolerate low bits better than attention does.', hint: 'Try Squeeze the KV cache to FP4 too.' },
    { q: 'Where does the price gap come from?', options: ['Hardware and the whole stack', 'Only the GPU', 'Only the model'], answer: 0, why: 'Precision, engine and disaggregation all count.', hint: 'Try New GPU, old stack.' },
    { q: 'What is the main trade-off of TRT-LLM?', options: ['Vendor lock-in for price', 'Lower speed', 'Worse tools only'], answer: 0, why: 'You can\'t take it elsewhere.', hint: 'Try Need portability, chose TRT-LLM.' },
  ],
  terms: [
    ['FP8', 'An 8-bit floating-point format.'],
    ['NVFP4', 'NVIDIA\'s 4-bit format for Blackwell.'],
    ['TensorRT-LLM', 'NVIDIA\'s optimised serving engine.'],
    ['Disaggregated serving', 'Separate GPUs for prefill and decode.'],
    ['Dynamo', 'NVIDIA\'s distributed inference orchestration.'],
    ['Vendor lock-in', 'Being unable to move without redoing the work.'],
  ],
  deeper: '<p><b>Figures.</b> The start and end prices come from the course\'s 2026 estimates for a 120B model. Each step between them is a round figure, as is the quality number.</p><p><b>When it\'s worth it.</b> Above a large steady volume the saving pays for the lock. At low volume, an API is usually cheaper than any of this.</p><p><b>Memory bus.</b> Decode is limited by memory bandwidth, so fewer bits help speed as well as space.</p>',
  code: {
    title: 'Memory by precision',
    note: 'Adapted from the course\'s footprint calculator (code/main.py).',
    text: `
BYTES = {"bf16": 2.0, "fp8": 1.0, "fp4": 0.5}

def footprint(params_billion, weight_format, kv_gb):
    weights = params_billion * BYTES[weight_format]      # GB
    return {"weights": weights, "kv": kv_gb, "total": weights + kv_gb}

footprint(120, "fp4", 40)    # weights 60 GB, KV stays FP8 at 40 GB
`,
  },
};
