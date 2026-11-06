// Inference platform economics (phase 17, lesson 2): a Kigali edtech has three workloads (a chat tutor busy in school hours, nightly essay grading,
// and a voice tutor that must speak fast) and four ways to pay: per token on a shared API, per minute on dedicated GPUs, per token on
// fast custom silicon, or a batch tier at half price with a day's turnaround. Daily cost (in the learner's currency) and whether each option
// meets the workload's speed or turnaround needs are computed live from illustrative rates.
const OPT = {
  api: { name: 'per-token API', rate: 0.9, tps: 60, turn: 0 },
  gpu: { name: 'dedicated GPUs', hr: 3, cap: 2500, tps: 60, turn: 0 },
  silicon: { name: 'custom silicon', rate: 1.2, tps: 320, turn: 0 },
  batch: { name: 'batch tier', rate: 0.45, tps: 60, turn: 24 },
};
const WORK = {
  chat: { name: 'chat tutor', mtok: 40, peak: 4, hours: 9, needTps: 30, needTurn: 0 },
  grade: { name: 'nightly grading', mtok: 120, peak: 1, hours: 24, needTps: 0, needTurn: 12 },
  voice: { name: 'voice tutor', mtok: 15, peak: 3, hours: 9, needTps: 150, needTurn: 0 },
};
function cost(o, key, wk) {
  const w = WORK[wk], mt = w.mtok * o.scale, opt = OPT[key];
  if (key === 'gpu') {
    const avgTps = mt * 1e6 / (w.hours * 3600), peakTps = avgTps * w.peak, gpus = Math.max(1, Math.ceil(peakTps / opt.cap));
    const hours = o.scaleZero ? Math.min(24, w.hours + 0.5) : 24;
    return { c: gpus * hours * opt.hr, gpus, util: Math.min(1, avgTps / (gpus * opt.cap)) * (w.hours / hours) };
  }
  return { c: mt * opt.rate };
}
function choose(o) {
  const w = WORK[o.work];
  const all = Object.keys(OPT).map(k => {
    const r = cost(o, k, o.work), ok = OPT[k].tps >= w.needTps && (w.needTurn === 0 ? OPT[k].turn === 0 : OPT[k].turn <= 24);
    return { k, ...r, ok, why: OPT[k].tps < w.needTps ? `${OPT[k].tps} tokens a second is too slow to speak` : w.needTurn === 0 && OPT[k].turn ? 'answers a day later' : '' };
  });
  const best = all.filter(x => x.ok).sort((a, b) => a.c - b.c)[0];
  return { all, best, pick: all.find(x => x.k === o.opt) };
}

export default {
  slug: 'inference-platform-economics',
  title: 'Paying for inference: per token, per minute, per job',
  description: 'An edtech in Kigali runs three workloads, and each has its cheapest way to pay. Turn a tower grey if it cannot do the job, then pick from what is left.',
  overview: 'Beyond the hyperscalers sits a market of inference providers, in roughly three segments. Custom silicon (Groq\'s LPU, Cerebras\'s wafer-scale engine, SambaNova) decodes several times faster than GPU clusters on the same model, at a higher price per token: the choice when speed is the product, as in voice. GPU platforms (Fireworks, Together, Baseten, Modal and others) run open and fine-tuned models on NVIDIA or AMD hardware, between raw GPU rental and a managed hyperscaler service; some sell per token on shared capacity, others per minute or per second on dedicated GPUs, often with scale-to-zero. API-first marketplaces (Replicate, OpenRouter, DeepInfra and others) emphasise a broad catalogue and a fast first call. The pricing models matter more than the logos. Per-token pricing on shared capacity follows the provider\'s serving efficiency, so it is cheap for bursty or modest traffic you couldn\'t keep a GPU busy with. Per-minute dedicated GPUs cost the same busy or idle, so they win only when traffic keeps them busy, and you must size for the peak, not the average; scale-to-zero billing helps, at the cost of cold starts. Batch tiers commonly charge about half the interactive rate in exchange for results within a day, which suits offline work like nightly grading. A fine-tuned model may be served at the base rate on some platforms and at a premium on others. The method: describe each workload by volume, peak-to-average ratio, speed need and turnaround, then compute the effective cost of each option that meets the need.',
  keywords: ['inference pricing', 'GPU cloud', 'batch inference', 'custom silicon', 'serverless GPUs', 'LLM costs', 'FinOps'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [-0.2, 0.3, -0.2], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { work: 'chat', opt: 'api', scale: 1, scaleZero: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    const OC = { api: '#5B8DB8', gpu: SAF, silicon: '#8C6BB1', batch: GOOD };
    /* four ways to pay as cost towers; a gold ring marks the one in use, a lamp the cheapest that works */
    const BX = i => -1.6 + i * 0.85;
    const bars = Object.keys(OPT).map((k, i) => {
      const t = P.tower(0.5, 0.5, OC[k], { h: 0.5 }); t.userData.set({ cap: '' }); t.position.set(BX(i), 0.03, -0.45); S.add(t);
      const ring = P.box(0.68, 0.03, 0.68, SAF, { r: 0.04 }); ring.position.set(BX(i), 0, -0.45); ring.userData.noFit = true; S.add(ring);
      const l = P.lamp(GOOD, { h: 0.1, r: 0.085 }); l.position.set(BX(i), 0, 0.05); S.add(l);
      return { k, t, ring, l };
    });
    /* the workload: three pads; the need for speed as a dial */
    const works = Object.keys(WORK).map((k, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.42, 0.08, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-1.3 + i * 0.5, 0, 0.5); S.add(b); return { k, m }; });
    const load = P.stack(0.3, 0.3, 0.08, { max: 8, color: '#3D6BD6' }); load.position.set(0.6, 0, 0.5); S.add(load);
    S.add(P.keep(-2.0, 1.65, 1.2, -0.8, 0.75));
    const parts = bars.map(b => b.t);

    let R = null;
    function draw() {
      R = choose(st);
      const mx = Math.max(...R.all.map(x => x.c));
      R.all.forEach((x, i) => {
        const B = bars[i], best = R.best && x.k === R.best.k;
        B.t.userData.set({ h: Math.max(0.05, x.c / mx * 1.05), color: x.ok ? OC[x.k] : OFF });
        B.ring.visible = x.k === st.opt;
        B.l.userData.set({ color: best ? GOOD : x.ok ? '#8E91A3' : BAD, on: true });
      });
      works.forEach(w => w.m.color.set(w.k === st.work ? SAF : OFF));
      load.userData.set({ n: Math.max(1, Math.round(WORK[st.work].mtok * st.scale / 20)) });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const WK = ['chat', 'grade', 'voice'], OK = ['api', 'gpu', 'silicon', 'batch'];
    const controls = [
      { type: 'slider', label: 'Volume, times today\'s', min: 0.25, max: 8, step: 0.25, get: () => st.scale, set: v => set({ scale: +v }), fmt: v => `×${(+v).toFixed(2).replace(/\.?0+$/, '')}` },
      { type: 'toggle', label: 'Dedicated GPUs scale to zero when idle', short: 'Scale to zero', get: () => st.scaleZero, set: v => set({ scaleZero: !!v }) },
      { type: 'buttons', label: 'Workload', options: ['Chat tutor', 'Nightly grading', 'Voice tutor'], get: () => WK.indexOf(st.work), act: i => set({ work: WK[i], opt: ['api', 'batch', 'silicon'][i] }) },
      { type: 'buttons', label: 'Pay by', options: ['Per token', 'Per GPU minute', 'Custom silicon', 'Batch'], get: () => OK.indexOf(st.opt), act: i => set({ opt: OK[i] }) },
    ];
    const readouts = [
      { label: 'Chosen option', get: () => ({ v: M(R.pick.c), sub: 'a day', good: R.pick.ok && R.best && R.pick.c <= R.best.c * 1.05, bad: !R.pick.ok }) },
      { label: 'Cheapest that works', get: () => ({ v: R.best ? M(R.best.c) : '—', sub: R.best ? OPT[R.best.k].name : '' }) },
      { label: 'GPU busy', get: () => { const g = R.all.find(x => x.k === 'gpu'); return { v: `${Math.round(g.util * 100)}%`, sub: 'of billed GPU time', bad: g.util < 0.3 }; } },
    ];
    const labels = [
      { name: 'bars', t: 'Four ways to pay', d: 'Height: cost a day. Grey: cannot do it', icon: 'money', atV: V(-1.86, 0.3, -0.45) },
      { name: 'work', t: 'Teal lamp', d: 'The cheapest that works', icon: 'check', atV: V(1.12, 0.14, 0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Rent GPUs for a small bursty load', hint: 'billed all day', on: () => set({ ...D0, opt: 'gpu', scaleZero: false, scale: 0.5 }), off: reset },
      { label: 'Run grading interactively', hint: 'skip the batch tier', on: () => set({ ...D0, work: 'grade', opt: 'api' }), off: reset },
      { label: 'Voice on ordinary hardware', hint: 'too slow to speak', on: () => set({ ...D0, work: 'voice', opt: 'api' }), off: reset },
    ];
    function status() {
      const P0 = R.pick, b = R.best, g = R.all.find(x => x.k === 'gpu'), cap = t => t[0].toUpperCase() + t.slice(1);
      if (!P0.ok) return { ok: false, msg: `<b>${cap(OPT[st.opt].name)} ${P0.why.startsWith('answers') ? 'answers a day later, which a live tutor can\'t wait for' : `streams about ${OPT[st.opt].tps} tokens a second; the voice tutor needs ${WORK[st.work].needTps} to sound natural`}.</b> ${b ? `The cheapest option that works is ${OPT[b.k].name} at ${M(b.c)} a day.` : ''} Price only the options that meet the need.` };
      if (st.opt === 'gpu' && g.util < 0.3) return { ok: false, msg: `<b>${g.gpus} dedicated GPU${g.gpus === 1 ? '' : 's'}, sized for the peak and billed ${st.scaleZero ? 'whenever the tutor is busy' : 'all day'}, ${g.gpus === 1 ? 'is' : 'are'} busy ${Math.round(g.util * 100)}% of the billed time: ${M(P0.c)} a day against ${M(b.c)} for ${OPT[b.k].name}.</b> Per-minute GPUs pay when traffic keeps them busy; for small bursty loads, per-token shared capacity is cheaper.` };
      if (b && P0.c > b.c * 1.3) return { ok: false, msg: `<b>${cap(OPT[st.opt].name)} meets the need at ${M(P0.c)} a day; ${OPT[b.k].name} does too, at ${M(b.c)}.</b> ${b.k === 'batch' ? 'Grading can wait overnight: the batch tier halves the price.' : b.k === 'gpu' ? 'At this volume, traffic keeps dedicated GPUs busy enough to beat per-token pricing.' : ''}` };
      return { ok: true, msg: `<b>For the ${WORK[st.work].name}, ${OPT[st.opt].name} at ${M(P0.c)} a day is the cheapest option that meets the need.</b> ${st.work === 'voice' ? 'Speed is the product here, so custom silicon earns its higher price per token.' : st.work === 'grade' ? (st.opt === 'gpu' ? 'Even, round-the-clock traffic keeps dedicated GPUs busy enough to beat per-token prices.' : 'Results within a day at half the interactive rate.') : 'Bursty school-hours traffic, with peaks four times the average, can\'t keep dedicated GPUs busy, so shared per-token capacity stays cheaper.'}` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three workloads', home: true, say: 'An edtech in Kigali runs a chat tutor, nightly essay grading and a voice tutor. Each has a different shape.', act: m => m.set({ work: 'chat', opt: 'api', scale: 1, scaleZero: true }) },
    { t: 'Bursty chat', home: true, say: 'The chat tutor is busy in school hours, with peaks four times the average. Shared per-token capacity fits.', act: m => m.set({ work: 'chat', opt: 'api', scale: 1, scaleZero: true }) },
    { t: 'Idle GPUs', home: true, say: 'Rent dedicated GPUs for it and you size for the peak and pay for the quiet hours.', act: m => m.set({ work: 'chat', opt: 'gpu', scale: 1, scaleZero: false }) },
    { t: 'Steady volume changes it', home: true, say: 'Grading runs round the clock at an even pace. At eight times the volume, it keeps GPUs busy, and per-minute beats per-token.', act: m => m.set({ work: 'grade', opt: 'gpu', scale: 8, scaleZero: true }) },
    { t: 'Grading can wait', home: true, say: 'Essays graded overnight don\'t need instant answers. A batch tier at half price does the job.', act: m => m.set({ work: 'grade', opt: 'batch', scale: 1, scaleZero: true }) },
    { t: 'Speed is the product', home: true, say: 'A voice tutor must speak quickly. Only the fast custom chips keep up, so they earn their price.', act: m => m.set({ work: 'voice', opt: 'silicon', scale: 1, scaleZero: true }) },
  ],
  check: [
    { q: 'When do dedicated per-minute GPUs beat per-token pricing?', options: ['When traffic keeps them busy', 'For small bursty loads', 'Always'], answer: 0, why: 'They cost the same busy or idle.', hint: 'Try Rent GPUs for a small bursty load.' },
    { q: 'Why use a batch tier for nightly grading?', options: ['It is about half price, and a day\'s turnaround is fine', 'It is faster', 'It is required'], answer: 0, why: 'Match the price to the turnaround.', hint: 'Choose Nightly grading.' },
    { q: 'Why pay more per token for custom silicon?', options: ['When decode speed is the product, as in voice', 'It is always cheaper', 'For batch jobs'], answer: 0, why: 'Several times faster decode.', hint: 'Choose Voice tutor.' },
  ],
  terms: [
    ['Per-token pricing', 'Pay for tokens processed on shared capacity.'],
    ['Per-minute GPUs', 'Pay for dedicated GPU time, busy or idle.'],
    ['Scale to zero', 'Release GPUs when idle; pay a cold start later.'],
    ['Batch tier', 'Cheaper inference with results within hours.'],
    ['Custom silicon', 'Chips built for fast inference, such as LPUs.'],
    ['Peak-to-average ratio', 'How bursty a workload is; dedicated capacity is sized for the peak.'],
  ],
  deeper: '<p><b>Fine-tuned variants.</b> Some platforms serve your fine-tuned model at the base price, others charge a premium or require dedicated capacity; check before training.</p><p><b>Shared rates follow the engine.</b> A provider\'s per-token price reflects how efficiently its serving engine packs requests, more than the hardware list price.</p><p><b>About this machine.</b> Rates, throughput and the workloads are illustrative, set in US dollars and shown in your currency; costs and feasibility are computed live.</p>',
  code: {
    title: 'Effective cost per workload',
    note: 'Written for this lesson.',
    text: `
def per_token(mtok_per_day, rate_per_mtok):
    return mtok_per_day * rate_per_mtok

def dedicated(mtok_per_day, busy_hours, peak_ratio, gpu_hour, gpu_tps, scale_to_zero):
    avg_tps = mtok_per_day * 1e6 / (busy_hours * 3600)
    gpus = max(1, math.ceil(avg_tps * peak_ratio / gpu_tps))     # sized for the peak
    billed = busy_hours + 0.5 if scale_to_zero else 24
    return gpus * billed * gpu_hour

def cheapest(workload, options):
    ok = [o for o in options if o.tps >= workload.need_tps and o.turnaround <= workload.turnaround]
    return min(ok, key=lambda o: o.daily_cost(workload))
`,
  },
};
