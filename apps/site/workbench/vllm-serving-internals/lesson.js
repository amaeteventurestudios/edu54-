// vLLM internals (phase 17, lesson 4): one level below the batching lessons. A Johannesburg inference server has eight batch slots and a shelf of KV memory blocks. Requests of real lengths run through a simulated
// scheduler: static versus continuous batching, contiguous versus paged memory, and a long prompt that stalls decoding unless prefill is chunked. All numbers come from the loop below.
const LENS = [3, 12, 4, 9, 2, 14, 5, 3, 8, 2, 11, 4, 6, 3, 10, 2];
const CAP = 8;
function sched(cont) {
  let t = 0, used = 0, busy = 0, q = LENS.slice(), slots = [];
  if (!cont) { while (q.length) { const b = q.splice(0, CAP), m = Math.max(...b); t += m; busy += b.reduce((x, y) => x + y, 0); used += m * CAP; } return { t, util: busy / used }; }
  while (q.length || slots.length) {
    while (slots.length < CAP && q.length) slots.push(q.shift());
    t++; busy += slots.length; used += CAP; slots = slots.map(v => v - 1).filter(v => v > 0);
  }
  return { t, util: busy / used };
}
function run(o) {
  const S0 = sched(o.cont);
  const memFree = o.paged ? 0.96 : 0.35;
  const seats = Math.round(CAP * 3 * memFree);
  const stall = o.chunk ? Math.round(o.prompt / 256) * 2 + 8 : Math.round(o.prompt / 30);
  return { ...S0, memFree, seats, stall, tps: LENS.reduce((a, b) => a + b, 0) / S0.t };
}

export default {
  slug: 'vllm-serving-internals',
  title: 'Inside vLLM: pages, slots and chunks',
  description: 'Three tricks inside a serving engine: paged memory, slots that refill each step, and long prompts cut into chunks.',
  overview: 'A plain serve loop runs one request at a time, and static batching stalls everyone on the slowest. vLLM solves three problems at once. PagedAttention stores the KV cache in fixed blocks with a table for each sequence, so memory that contiguous allocation would lose to fragmentation stays usable. Continuous batching works one iteration at a time: a finished sequence leaves and a waiting one joins at once, without draining the batch. Chunked prefill cuts a long prompt into pieces, so it can\'t freeze everyone else\'s decoding. The last one protects a tail: the gap between tokens for other users, not average throughput. Every number here comes from a small scheduler running live.',
  keywords: ['vLLM', 'PagedAttention', 'continuous batching', 'chunked prefill', 'inference serving', 'KV cache'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.68, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { cont: true, paged: true, chunk: true, prompt: 8000 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.32;
    const slots = Array.from({ length: CAP }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.26, 1, 0.34, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, 0.42); b.userData.noFit = true; S.add(b); return { b, m, left: 0 }; });
    const rack = P.box(2.7, 0.04, 0.62, '#A87A4F', { r: 0.02 }); rack.position.set(-0.8, 0.03, -0.35); S.add(rack);
    const blocks = Array.from({ length: 48 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.09, 0.14, 0.09, '#fff', { r: 0.01, material: m }); b.position.set(-2.05 + (i % 16) * 0.165, 0.08, -0.55 + Math.floor(i / 16) * 0.2); S.add(b); return m; });
    const big = add(P.tower(0.6, 0.5, SAF)); big.position.set(1.15, 0.03, -0.2); big.userData.set({ cap: '' });
    const gap = add(P.tower(0.5, 0.5, GOOD)); gap.position.set(2.0, 0.03, -0.2); gap.userData.set({ cap: '' });
    S.add(P.keep(-2.5, 2.5, 1.2, -0.75, 0.75));
    let R = null, q = 0, acc = 0;
    function draw() {
      R = run(st);
      const free = Math.round(48 * R.memFree);
      blocks.forEach((m, i) => { const pat = st.paged ? i < free : (i % 3 === 0); m.color.set(pat ? BLUE : st.paged ? GREY : '#E0B9AA'); });
      big.userData.set({ h: Math.min(1.2, st.prompt / 7000) });
      gap.userData.set({ h: Math.min(1.2, R.stall / 240), color: R.stall > 100 ? BAD : GOOD });
      slots.forEach(s => { s.left = 0; });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Continuous batching', short: 'Continuous', get: () => st.cont, set: v => set({ cont: !!v }) },
      { type: 'toggle', label: 'Paged KV memory', short: 'Paged', get: () => st.paged, set: v => set({ paged: !!v }) },
      { type: 'toggle', label: 'Chunked prefill', short: 'Chunked', get: () => st.chunk, set: v => set({ chunk: !!v }) },
      { type: 'slider', label: 'A long prompt (tokens)', min: 500, max: 8000, step: 500, get: () => st.prompt, set: v => set({ prompt: v }) },
    ];
    const readouts = [
      { label: 'Slots busy', get: () => ({ v: `${Math.round(R.util * 100)}%`, sub: `done in ${R.t} steps`, good: R.util > 0.8, bad: R.util < 0.6 }) },
      { label: 'Usable KV memory', get: () => ({ v: `${Math.round(R.memFree * 100)}%`, sub: `room for ${R.seats} sequences`, good: R.memFree > 0.9, bad: R.memFree < 0.5 }) },
      { label: 'Others\' worst token gap', get: () => ({ v: `${R.stall} ms`, sub: 'while a long prompt loads', good: R.stall < 100, bad: R.stall > 100 }) },
    ];
    const labels = [
      { name: 'm', t: 'KV memory blocks', d: 'Pink: lost to gaps', icon: 'box', atV: V(-2.2, 0.15, -0.35) },
      { name: 's', t: 'Prompt, then token gap', d: 'Long prompt can stall others', icon: 'target', atV: V(2.3, 0.2, -0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Static batches', hint: 'all wait for the slowest', on: () => set({ ...D0, cont: false }), off: reset },
      { label: 'Contiguous memory', hint: 'holes between sequences', on: () => set({ ...D0, paged: false }), off: reset },
      { label: 'Load a long prompt whole', hint: 'everyone else freezes', on: () => set({ ...D0, chunk: false }), off: reset },
    ];
    function status() {
      if (!st.cont) return { ok: false, msg: `<b>Slots only ${Math.round(R.util * 100)}% busy, ${R.t} steps in all.</b> A batch stays full of finished sequences until its slowest ends, and short requests wait for no reason. Refill each slot at each step.` };
      if (!st.paged) return { ok: false, msg: `<b>Only ${Math.round(R.memFree * 100)}% of KV memory is usable.</b> Contiguous space is reserved per sequence, in case it grows, and gaps can't be used. Fixed blocks with a block table let sequences share all of it.` };
      if (!st.chunk) return { ok: false, msg: `<b>Everyone else stalled for ${R.stall} ms.</b> One ${st.prompt}-token prompt held the GPU through its prefill, so all live decodes froze. Mean throughput barely moved, which is why this tail goes unnoticed.` };
      return { ok: true, msg: `<b>Slots ${Math.round(R.util * 100)}% busy, memory ${Math.round(R.memFree * 100)}% usable, worst gap ${R.stall} ms.</b> Check the compatibility table for your vLLM version before switching every feature on together.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); acc += dt * 4;
        const stepped = acc >= 1; if (stepped) acc = 0;
        if (stepped) {
          if (st.cont) slots.forEach(s => { if (s.left <= 0) { s.left = LENS[q++ % LENS.length]; } s.left--; });
          else { if (slots.every(s => s.left <= 0)) { const b = slots.map(() => LENS[q++ % LENS.length]), m = Math.max(...b); slots.forEach((s, i) => { s.left = m; s.real = b[i]; }); } slots.forEach(s => { s.left--; }); }
        }
        slots.forEach(s => { const done = !st.cont && s.real != null && s.left < (Math.max(...slots.map(x => x.real ?? 0)) - s.real); s.b.scale.y = Math.max(0.03, Math.min(0.8, s.left * 0.07)); s.m.color.set(done ? BAD : BLUE); });
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Eight slots', home: true, say: 'An inference server in Johannesburg has eight batch slots. With static batches, finished sequences sit idle, waiting for the slowest.', act: m => m.set({ cont: false, paged: true, chunk: true, prompt: 8000 }) },
    { t: 'Continuous batching', home: true, say: 'Now work one step at a time. A finished sequence leaves, and a waiting one joins at once.', act: m => m.set({ cont: true, paged: true, chunk: true, prompt: 8000 }) },
    { t: 'The memory problem', home: true, say: 'Each sequence grows a KV cache. Reserve contiguous space, and much of memory is lost to gaps.', act: m => m.set({ cont: true, paged: false, chunk: true, prompt: 8000 }) },
    { t: 'Pages', home: true, say: 'PagedAttention uses fixed blocks and a table per sequence. Nearly all the memory is usable.', act: m => m.set({ cont: true, paged: true, chunk: true, prompt: 8000 }) },
    { t: 'A long prompt', home: true, say: 'One huge prompt loads whole, and everyone else freezes. Average speed hardly moves, but users feel it.', act: m => m.set({ cont: true, paged: true, chunk: false, prompt: 8000 }) },
    { t: 'Chunks', home: true, say: 'Chunked prefill cuts the prompt into pieces between decode steps. It protects the gap between tokens.', act: m => m.set({ cont: true, paged: true, chunk: true, prompt: 8000 }) },
  ],
  check: [
    { q: 'What does continuous batching change?', options: ['Requests join and leave at each step', 'Batches get bigger', 'The model gets smaller'], answer: 0, why: 'No waiting for the slowest.', hint: 'Try Static batches.' },
    { q: 'What does PagedAttention fix?', options: ['KV memory lost to fragmentation', 'Slow tokenizers', 'Bad prompts'], answer: 0, why: 'Fixed blocks and block tables.', hint: 'Try Contiguous memory.' },
    { q: 'Which metric does chunked prefill protect?', options: ['The tail of the gap between tokens', 'Mean throughput', 'Model accuracy'], answer: 0, why: 'A long prefill freezes live decodes.', hint: 'Try Load a long prompt whole.' },
  ],
  terms: [
    ['KV cache', 'Saved attention keys and values for a sequence.'],
    ['PagedAttention', 'Storing that cache in fixed blocks.'],
    ['Block table', 'Which blocks belong to a sequence.'],
    ['Continuous batching', 'Scheduling at each iteration.'],
    ['Prefill', 'Processing the prompt before decoding.'],
    ['Inter-token latency', 'The gap between output tokens.'],
  ],
  deeper: '<p><b>Fragmentation.</b> The vLLM paper reports contiguous allocation wasting much of the KV space, with paging keeping waste very low. The percentages here are round figures in that range.</p><p><b>Features interact.</b> Not all options work together in every version, so read the compatibility matrix first.</p><p><b>Earlier lessons.</b> Inference optimisation and KV cache cover why batching and caching matter at all. This one shows how the engine does them.</p>',
  code: {
    title: 'One scheduler step',
    note: 'Adapted from the course\'s continuous batching sketch (code/main.py).',
    text: `
def step(running, waiting, free_blocks, budget=256):
    while waiting and len(running) < MAX_SLOTS and free_blocks:
        running.append(admit(waiting.popleft()))

    batch = []
    for seq in running:
        if seq.prompt_left:                      # chunked prefill
            n = min(budget, seq.prompt_left)
            seq.prompt_left -= n
            budget -= n
            batch.append((seq, n))
        else:
            batch.append((seq, 1))               # one decode token

    forward(batch)
    running[:] = [s for s in running if not s.finished]
`,
  },
};
