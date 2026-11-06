// Choosing a self-hosted serving engine (phase 17, lesson 28): three teams pick an engine. A Bamako NGO has CPU-only laptops in the field; a
// Kampala university lab has AMD GPUs; a Lagos fintech runs an agent with long shared prompts on NVIDIA GPUs for thousands of users. The
// decision goes hardware first, then scale, then workload, across llama.cpp, Ollama, vLLM, SGLang and TensorRT-LLM, with TGI in maintenance mode.
// Each engine's fit is computed live from simple rules.
const ENG = [
  { id: 'llamacpp', name: 'llama.cpp', hw: ['cpu', 'amd', 'nvidia'], scale: 1, prefix: 0, note: 'fastest on CPU, minimal dependencies' },
  { id: 'ollama', name: 'Ollama', hw: ['cpu', 'amd', 'nvidia'], scale: 1, prefix: 0, note: 'one-command install; a dev tool' },
  { id: 'vllm', name: 'vLLM', hw: ['amd', 'nvidia'], scale: 3, prefix: 1, note: 'the general production default' },
  { id: 'sglang', name: 'SGLang', hw: ['amd', 'nvidia'], scale: 3, prefix: 2, note: 'prefix reuse for agents and multi-turn' },
  { id: 'trt', name: 'TensorRT-LLM', hw: ['nvidia'], scale: 3, prefix: 1, note: 'peak NVIDIA throughput, more build work' },
  { id: 'tgi', name: 'TGI', hw: ['amd', 'nvidia'], scale: 2, prefix: 1, note: 'maintenance mode since Dec 2025', maint: true },
];
const TEAMS = {
  ngo: { name: 'NGO field laptops, Bamako', hw: 'cpu', users: 1, agent: false },
  lab: { name: 'University lab, Kampala', hw: 'amd', users: 60, agent: false },
  fin: { name: 'Fintech agent, Lagos', hw: 'nvidia', users: 5000, agent: true },
};
function pick(o) {
  const t = { ...TEAMS[o.team], hw: o.hw || TEAMS[o.team].hw };
  const need = t.users > 500 ? 3 : t.users > 20 ? 2 : 1;
  const rows = ENG.map(e => {
    let why = '', ok = true, score = 0;
    if (!e.hw.includes(t.hw)) { ok = false; why = t.hw === 'cpu' ? 'needs a GPU' : 'NVIDIA only'; }
    else if (e.scale < need) { ok = false; why = 'not built for this many users'; }
    else if (e.maint && o.avoidMaint) { ok = false; why = 'maintenance mode: no new features'; }
    else { score = (e.scale === need ? 3 : 1) + (t.agent ? e.prefix * 2 : 0) + (t.hw === 'cpu' && e.id === 'llamacpp' ? 3 : 0) + (e.id === 'vllm' ? 1 : 0); }
    return { ...e, ok, why, score };
  });
  const best = rows.filter(r => r.ok).sort((a, b) => b.score - a.score)[0];
  return { t, need, rows, best };
}

export default {
  slug: 'self-hosted-serving-selection',
  title: 'Choosing a serving engine: hardware, scale, workload',
  description: 'Three teams want to run open models on their own hardware. Answer three questions, cross off the engines that cannot do it, and pick from those left.',
  overview: 'Engine choice follows hardware, scale and workload, in that order, not a leaderboard. Five engines dominate self-hosted inference in 2026. llama.cpp runs almost anywhere with minimal dependencies and is the fastest on CPUs, with the widest model support through the GGUF format. Ollama wraps it with one-command install and model management, ideal on a developer\'s laptop for a single user but slower than llama.cpp and far behind production engines in throughput. vLLM is the general-purpose production default for many users, with PagedAttention, continuous batching, chunked prefill and broad hardware support including AMD through ROCm. SGLang shines on agents and multi-turn workloads with shared prefixes, thanks to RadixAttention\'s prefix reuse. TensorRT-LLM squeezes the most out of NVIDIA hardware, especially the newest chips, at the cost of an engine build step, and is NVIDIA-only. Hugging Face\'s TGI entered maintenance mode in December 2025, which biases new projects towards vLLM or SGLang. So: CPU-first points to llama.cpp; AMD GPUs rule out TensorRT-LLM and point to vLLM or SGLang; one user on a laptop is Ollama\'s home; a hundred users or more needs a production engine; and prefix-heavy agent traffic tilts towards SGLang. A typical pipeline runs Ollama or llama.cpp in development, then a production engine in staging and production, converting the model format along the way (GGUF for llama.cpp, safetensors for vLLM and SGLang), and re-running evaluations after each conversion and quantisation, because they change outputs.',
  keywords: ['vLLM', 'SGLang', 'llama.cpp', 'Ollama', 'TensorRT-LLM', 'self-hosting', 'inference serving'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { team: 'fin', hw: null, avoidMaint: true, force: null }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* six engines as cabinets: their height is the scale they are built for */
    const eng = ENG.map((e, i) => {
      const x = -1.75 + i * 0.7, m = new THREE.MeshLambertMaterial({ color: '#5B8DB8' }), b = P.box(0.54, 0.16 + e.scale * 0.16, 0.5, '#fff', { r: 0.04, material: m }); b.position.set(x, 0.03, -0.45); S.add(b);
      const ring = P.box(0.66, 0.03, 0.62, SAF, { r: 0.04 }); ring.position.set(x, 0, -0.45); ring.userData.noFit = true; S.add(ring);
      return { e, m, ring };
    });
    /* three teams, and their three answers: hardware chip, crowd, agent */
    const teams = Object.keys(TEAMS).map((k, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.4, 0.08, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(-1.6 + i * 0.5, 0, 0.3); S.add(b); return { k, m }; });
    const chipM = new THREE.MeshLambertMaterial({ color: OFF }), chip = P.box(0.34, 0.1, 0.34, '#fff', { r: 0.02, material: chipM }); chip.position.set(0.1, 0, 0.3); S.add(chip);
    const crowd = P.stack(0.3, 0.3, 0.1, { max: 3, color: '#7B6FA8' }); crowd.position.set(0.6, 0, 0.3); S.add(crowd);
    const robot = P.robot('#3D6BD6', { scale: 0.5 }); robot.position.set(1.15, 0, 0.3); S.add(robot);
    S.add(P.keep(-2.1, 2.05, 0.7, -0.8, 0.55));
    let R = null;
    const HWN = { cpu: 'CPU only', amd: 'AMD GPUs', nvidia: 'NVIDIA GPUs' };
    function draw() {
      R = pick(st);
      const chosen = st.force ? R.rows.find(r => r.id === st.force) : R.best;
      eng.forEach(E => {
        const r = R.rows.find(x => x.id === E.e.id), isC = chosen && chosen.id === r.id;
        E.m.color.set(!r.ok ? OFF : isC ? GOOD : '#5B8DB8'); E.ring.visible = !!isC;
        if (isC && !r.ok) E.m.color.set(BAD);
      });
      teams.forEach(t => t.m.color.set(t.k === st.team ? SAF : OFF));
      chipM.color.set({ cpu: '#8E91A3', amd: '#E07A5F', nvidia: '#6FA36B' }[R.t.hw]);
      crowd.userData.set({ n: R.need });
      robot.visible = !!R.t.agent;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const TK = ['ngo', 'lab', 'fin'], FK = [null, 'ollama', 'trt', 'tgi'];
    const controls = [
      { type: 'toggle', label: 'Avoid engines in maintenance mode for new projects', short: 'Avoid maintenance', get: () => st.avoidMaint, set: v => set({ avoidMaint: !!v }) },
      { type: 'buttons', label: 'Team', options: ['NGO, Bamako', 'Lab, Kampala', 'Fintech, Lagos'], get: () => TK.indexOf(st.team), act: i => set({ team: TK[i], force: null }) },
      { type: 'buttons', label: 'Engine', options: ['By the rules', 'Ollama', 'TensorRT-LLM', 'TGI'], get: () => FK.indexOf(st.force), act: i => set({ force: FK[i] }) },
    ];
    const readouts = [
      { label: 'Chosen', get: () => { const c = st.force ? R.rows.find(r => r.id === st.force) : R.best; return { v: c ? c.name : '—', sub: c && c.ok ? 'fits' : c ? c.why : '', good: c && c.ok, bad: !c || !c.ok }; } },
      { label: 'Engines that fit', get: () => ({ v: `${R.rows.filter(r => r.ok).length} of 6`, sub: 'after three questions' }) },
      { label: 'Users', get: () => ({ v: R.t.users.toLocaleString('en'), sub: R.need === 3 ? 'production scale' : R.need === 2 ? 'a team' : 'one person' }) },
    ];
    const labels = [
      { name: 'q', t: 'Three questions', d: 'Chip, crowd, and is it an agent', icon: 'target', atV: V(0.1, 0.1, 0.5) },
      { name: 'eng', t: 'Six engines', d: 'Grey: cannot do it. Teal: chosen', icon: 'box', atV: V(1.93, 0.3, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Put Ollama in production', hint: 'thousands of users', on: () => set({ ...D0, force: 'ollama' }), off: reset },
      { label: 'Pick TensorRT-LLM for AMD cards', hint: 'NVIDIA only', on: () => set({ ...D0, team: 'lab', force: 'trt' }), off: reset },
      { label: 'Start a new project on TGI', hint: 'maintenance mode', on: () => set({ ...D0, team: 'lab', force: 'tgi' }), off: reset },
    ];
    function status() {
      const c = st.force ? R.rows.find(r => r.id === st.force) : R.best;
      if (st.force === 'ollama' && R.need === 3) return { ok: false, msg: `<b>Ollama is a fine way to run a model on a laptop for one person; for ${R.t.users.toLocaleString('en')} users it lacks the batching and scheduling of a production engine and falls far behind in throughput.</b> Use it in development, and serve production with ${R.best.name}.` };
      if (st.force === 'trt' && R.t.hw !== 'nvidia') return { ok: false, msg: `<b>TensorRT-LLM only runs on NVIDIA hardware, so it\'s out for the lab\'s AMD GPUs.</b> On AMD, vLLM through ROCm is the strongest-supported path, with SGLang as an alternative.` };
      if (st.force === 'tgi' && st.avoidMaint) return { ok: false, msg: '<b>TGI entered maintenance mode in December 2025: fixes, but no new features or model families.</b> Existing deployments can keep running; a new project should start on vLLM or SGLang.' };
      if (c && !c.ok) return { ok: false, msg: `<b>${c.name} doesn\'t fit: ${c.why}.</b>` };
      if (!c) return { ok: false, msg: '<b>No engine fits these answers.</b>' };
      if (st.force && R.best && c.id !== R.best.id) return { ok: true, msg: `<b>${c.name} also fits here (${R.t.name}): ${c.note}.</b> The rules prefer ${R.best.name} here; measure both on your own traffic before committing.` };
      const why = R.t.hw === 'cpu' ? 'CPU-only machines point to llama.cpp, the fastest engine there, with no GPU dependencies' : R.t.agent ? 'NVIDIA GPUs, thousands of users and long shared agent prompts point to SGLang, whose prefix reuse pays off; vLLM is the safe default alternative' : 'AMD GPUs rule out TensorRT-LLM; sixty users need a production engine, and vLLM through ROCm is the strongest-supported choice';
      return { ok: true, msg: `<b>${R.t.name}: ${c.name}.</b> ${why}.` };
    }
    return { update: dt => { robot.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three teams', home: true, say: 'Three teams want to run open models on their own hardware, each with different machines and users.', act: m => m.set({ team: 'ngo', hw: null, avoidMaint: true, force: null }) },
    { t: 'Hardware first', home: true, say: 'An NGO in Bamako has only laptop CPUs in the field. That points to llama.cpp, the fastest engine without a GPU.', act: m => m.set({ team: 'ngo', hw: null, avoidMaint: true, force: null }) },
    { t: 'AMD cards', home: true, say: 'A lab in Kampala has AMD GPUs. NVIDIA-only engines are out; vLLM runs well there.', act: m => m.set({ team: 'lab', hw: null, avoidMaint: true, force: null }) },
    { t: 'Then scale', home: true, say: 'Thousands of users need a production engine. Ollama is for one person on a laptop.', act: m => m.set({ team: 'fin', hw: null, avoidMaint: true, force: 'ollama' }) },
    { t: 'Then workload', home: true, say: 'An agent with long shared prompts benefits from prefix reuse, so SGLang edges ahead for the fintech.', act: m => m.set({ team: 'fin', hw: null, avoidMaint: true, force: null }) },
    { t: 'Maintenance mode', home: true, say: 'An engine in maintenance mode gets fixes but no new features. Start new projects elsewhere.', act: m => m.set({ team: 'lab', hw: null, avoidMaint: true, force: 'tgi' }) },
  ],
  check: [
    { q: 'Which engine suits CPU-only machines?', options: ['llama.cpp', 'TensorRT-LLM', 'SGLang'], answer: 0, why: 'Fastest on CPU, minimal dependencies.', hint: 'Choose the NGO.' },
    { q: 'Why is TensorRT-LLM out for AMD GPUs?', options: ['It runs only on NVIDIA hardware', 'It is too slow', 'It is in maintenance mode'], answer: 0, why: 'Hardware first.', hint: 'Try Pick TensorRT-LLM for AMD cards.' },
    { q: 'Why does SGLang suit agents with long shared prompts?', options: ['Prefix reuse with RadixAttention', 'It runs on CPUs', 'It has the most models'], answer: 0, why: 'Shared prefixes are computed once.', hint: 'Choose the fintech.' },
  ],
  terms: [
    ['llama.cpp', 'A portable engine, fastest on CPU, using GGUF models.'],
    ['Ollama', 'A developer tool wrapping llama.cpp for one-command use.'],
    ['vLLM', 'A production engine with PagedAttention and continuous batching.'],
    ['SGLang', 'A production engine strong on prefix reuse.'],
    ['TensorRT-LLM', 'NVIDIA\'s compiled engine for peak throughput.'],
    ['Maintenance mode', 'Fixes only, no new features.'],
  ],
  deeper: '<p><b>Format conversion.</b> Moving from a development GGUF file to safetensors for a production engine, or quantising for deployment, changes outputs slightly; re-run evaluations at each step.</p><p><b>Benchmarks on your traffic.</b> Leaderboards use one workload; measure the shortlist on your prompts, lengths and concurrency before committing.</p><p><b>About this machine.</b> A simplified rule set for illustration; the three teams and engine notes are fixed, and the choice is computed live.</p>',
  code: {
    title: 'Hardware, scale, workload',
    note: 'Adapted from the course\'s engine-selection sketch (code/main.py).',
    text: `
def choose_engine(hardware, users, workload, new_project=True):
    if hardware == "cpu":
        return "llama.cpp"
    candidates = ["vllm", "sglang"] + (["tensorrt-llm"] if hardware == "nvidia" else [])
    if users <= 1:
        return "ollama"                      # development, one person
    if workload == "agent_shared_prefix":
        return "sglang"                      # prefix reuse
    if hardware == "nvidia" and users > 10_000 and workload == "fixed_model":
        return "tensorrt-llm"                # peak throughput, more build work
    return "vllm"                            # the production default
# TGI: maintenance mode since December 2025, so not for new projects
`,
  },
};
