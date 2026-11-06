// Why multi-agent (phase 16, lesson 1): a Nairobi team asks an agent to migrate a payments service. One agent carries every file, every role and
// every step in one context window; split the work and each agent gets one job and a smaller context, at the price of coordination tokens and
// hand-offs that can lose detail. Task size, the number of agents and the hand-off format are set; context fill, quality, time and tokens are
// computed live from a simple model.
const WIN = 200, PER_FILE = 4, BASE = 20, COORD = 8;
function model(o) {
  const k = o.agents, workers = Math.max(1, k - (k >= 3 ? 2 : 0));
  const ctx = k === 1 ? BASE + o.files * PER_FILE : BASE + o.files * PER_FILE / workers + (k > 1 ? 6 : 0);
  const recall = Math.min(1, Math.pow(140 / ctx, 0.8));
  const mix = 0.2 * Math.min(1, o.files / 40), role = k === 1 ? 1 - mix : k === 2 ? 1 - mix * 0.5 : 1;
  const hops = Math.min(k - 1, 3), loss = Math.pow(o.structured ? 0.985 : 0.9, hops);
  const quality = recall * role * loss * (k > 4 ? 1 - 0.03 * (k - 4) : 1);
  const time = (k === 1 ? o.files : Math.ceil(o.files / workers)) + 3 + (k - 1) * 1.5;
  const tokens = k === 1 ? ctx * 3 : ctx * 3 * k * 0.8 + COORD * k;
  return { k, workers, ctx, fill: Math.min(1.3, ctx / WIN), quality, time, tokens };
}
const pct = x => `${Math.round(x * 100)}%`;

export default {
  slug: 'why-multi-agent',
  title: 'Why multi-agent? When splitting the work pays',
  description: 'A Nairobi team asks an agent to migrate a payments service. One agent has to hold every file, play researcher, coder and reviewer, and do it all in order.',
  overview: 'One agent is one loop, one context window and one system prompt. Point it at a real job (dozens of files, research before code, a review at the end) and it hits a ceiling. Context saturates: tool results pile up, and by turn thirty the details from turn five are lost. Roles blur: a prompt that says researcher, coder and reviewer gets half of each. Work runs in sequence even where it could run in parallel. Splitting the work gives each agent one job, one context and a prompt tuned for it, and lets independent parts run at once. Patterns differ by shape: a pipeline for stages, a fan-out for independent pieces, a supervisor that plans and delegates, a hierarchy for very large jobs. But more agents is not free. Every agent adds coordination tokens, every hand-off can lose detail unless it follows a contract, end-to-end time gains overhead, cost multiplies, and debugging a conversation between agents is harder than reading one transcript. The rule of thumb: start with one agent; split when the job outgrows one context, needs genuinely different expertise, or has parallel parts; give each agent a clear role boundary, and pass structured hand-offs (what was done, what was found, what is open) rather than free-form summaries. The lessons in this phase build up the pieces: messages and protocols, roles, shared memory, consensus, negotiation, swarms and the failure modes of agent teams.',
  keywords: ['multi-agent systems', 'orchestration', 'context window', 'AI agents', 'parallelism', 'agent teams', 'LLM'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { files: 50, agents: 4, structured: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const AX = i => -2.4 + i * 0.75, AZ = -0.35, CH = 0.9;
    const agents = Array.from({ length: 6 }, (_, i) => {
      const glass = P.cyl(0.24, CH, '#fff', { material: new THREE.MeshLambertMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.3 }) }); glass.position.set(AX(i), 0.12, AZ); glass.userData.noFit = true; floor.add(glass);
      const fm = new THREE.MeshLambertMaterial({ color: GOOD }), fill = P.cyl(0.21, 1, GOOD, { material: fm }); fill.position.set(AX(i), 0.12, AZ); fill.userData.noFit = true; floor.add(fill);
      return { glass, fill, fm };
    });
    const lim = P.box(4.4, 0.012, 0.02, RED, { r: 0.004 }); lim.position.set(-0.53, 0.12 + CH, AZ - 0.26); lim.userData.noFit = true; floor.add(lim);


    const MET = ['quality', 'time', 'tokens'];
    const mets = MET.map((n, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(1.05, 0.06, 0.55, '#fff', { r: 0.03, material: m }); b.position.set(2.6, 0.12, -0.9 + i * 0.66); floor.add(b);
      return { m, n };
    });
    const sm = new THREE.MeshLambertMaterial({ color: '#FFF' }), strip = P.box(6.0, 0.04, 0.4, '#fff', { r: 0.04, material: sm }); strip.position.set(0, 0.12, 1.25); floor.add(strip);


    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null, R1 = null;
    function draw() {
      R = model(st); R1 = model({ ...st, agents: 1 });
      const roles = R.k === 1 ? ['all roles'] : R.k === 2 ? ['research + code', 'review'] : ['planner', ...Array.from({ length: R.workers }, (_, i) => `worker ${i + 1}`), 'reviewer'];
      agents.forEach((A, i) => {
        const on = i < R.k; A.glass.visible = on; A.fill.visible = on;  if (!on) return;
        const isWorker = R.k === 1 || (R.k === 2 && i === 0) || (R.k >= 3 && i > 0 && i <= R.workers);
        const f = isWorker ? R.fill : Math.min(1.3, (BASE + 12) / WIN);
        A.fill.scale.y = f * CH; A.fm.color.set(f > 0.8 ? BAD : f > 0.6 ? SAF : GOOD);
      });
      const vals = { quality: [pct(R.quality), R.quality >= 0.85, R.quality < 0.7], time: [`${Math.round(R.time)} steps`, R.time < R1.time * 0.6, R.time > R1.time], tokens: [`${Math.round(R.tokens)}k`, R.tokens < R1.tokens * 1.5, R.tokens > R1.tokens * 2.5] };
      mets.forEach(M => { const [v, g, b] = vals[M.n]; M.m.color.set(g ? '#D9F0E9' : b ? '#F7DED5' : '#FFFFFF');  });
      const worth = R.k > 1 && R.quality - R1.quality > 0.08;
      sm.color.set(R.k === 1 ? (R1.quality < 0.7 ? '#F7D3C8' : '#FFFFFF') : worth ? '#D9F0E9' : '#F7D3C8');

    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Files in the job', min: 5, max: 60, step: 5, get: () => st.files, set: v => set({ files: Math.round(v) }) },
      { type: 'slider', label: 'Agents', min: 1, max: 6, step: 1, get: () => st.agents, set: v => set({ agents: Math.round(v) }) },
      { type: 'toggle', label: 'Structured hand-offs: done, found, still open', short: 'Structured', get: () => st.structured, set: v => set({ structured: !!v }) },
    ];
    const readouts = [
      { label: 'Quality', get: () => ({ v: pct(R.quality), sub: `one agent: ${pct(R1.quality)}`, good: R.quality >= 0.85, bad: R.quality < 0.7 }) },
      { label: 'Time', get: () => ({ v: `${Math.round(R.time)} steps`, sub: `one agent: ${Math.round(R1.time)}` }) },
      { label: 'Tokens', get: () => ({ v: `${Math.round(R.tokens)}k`, sub: `×${(R.tokens / R1.tokens).toFixed(1)} one agent`, bad: R.tokens > R1.tokens * 2.5 }) },
    ];
    const labels = [
      { name: 'ctx', t: 'Context windows', d: 'How full each agent is', icon: 'box', atV: V(-2.66, 0.6, -0.35) },
      { name: 'met', t: 'The trade', d: 'Quality, time, tokens', icon: 'scale', atV: V(3.14, 0.16, -0.24) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Split a small job', hint: 'eight files', on: () => set({ ...D0, files: 10 }), off: reset },
      { label: 'Use far too many agents', hint: 'six, loose hand-offs', on: () => set({ ...D0, agents: 6, structured: false }), off: reset },
      { label: 'Hand off in loose prose', hint: 'details lost', on: () => set({ ...D0, structured: false }), off: reset },
    ];
    function status() {
      if (R.k === 1) return { ok: R1.quality >= 0.75, msg: R1.quality >= 0.75 ? `<b>One agent is enough for ${st.files} files: its context is ${Math.round(R.ctx)}k tokens and quality ${pct(R.quality)}.</b> Start with one; split only when it outgrows a single context.` : `<b>One agent holding ${st.files} files carries ${Math.round(R.ctx)}k tokens, ${R.ctx > WIN ? 'past its window' : 'close to its window'}, and plays three roles: quality ${pct(R.quality)} over ${Math.round(R.time)} steps in sequence.</b> This is the single-agent ceiling.` };
      const gain = R.quality - R1.quality, cost = R.tokens / R1.tokens;
      if (gain < 0.08) return { ok: false, msg: `<b>Split across ${R.k} agents, ${st.files} files gain little: quality ${pct(R.quality)} against ${pct(R1.quality)} for one agent, for ×${cost.toFixed(1)} the tokens.</b> A small job fits one context; the coordination costs more than it buys.` };
      if (!st.structured) return { ok: false, msg: `<b>Each loose prose hand-off drops detail: across ${Math.min(R.k - 1, 3)} hand-offs, quality falls to ${pct(R.quality)}${st.agents > 4 ? `, and ${R.k} agents spend ×${cost.toFixed(1)} the tokens of one` : ''}.</b> Hand off in a fixed shape: what was done, what was found, what is still open.` };
      return { ok: true, msg: `<b>${R.k} agents on ${st.files} files: each worker holds ${Math.round(R.ctx)}k tokens instead of ${Math.round(R1.ctx)}k, roles are separate and the files are read in parallel: quality ${pct(R.quality)} against ${pct(R1.quality)}, in ${Math.round(R.time)} steps instead of ${Math.round(R1.time)}.</b> The price is ×${cost.toFixed(1)} the tokens, worth it at this size.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One agent, one window', home: true, say: 'A Nairobi team asks an agent to migrate a payments service: fifty files, research, code and review.', act: m => m.set({ files: 50, agents: 1, structured: true }) },
    { t: 'The ceiling', home: true, say: 'One agent must hold every file and play every role, in order. Its context overflows, and quality drops.', act: m => m.set({ files: 50, agents: 1, structured: true }) },
    { t: 'Split the work', home: true, say: 'A planner, two workers and a reviewer: each holds less, does one job, and the workers run at the same time.', act: m => m.set({ files: 50, agents: 4, structured: true }) },
    { t: 'Hand-offs lose detail', home: true, say: 'Pass loose prose between agents and details drop at every step. Use a fixed shape: done, found, still open.', act: m => m.set({ files: 50, agents: 4, structured: false }) },
    { t: 'Not for small jobs', home: true, say: 'For ten files, one agent fits fine. More agents only add tokens and coordination.', act: m => m.set({ files: 10, agents: 4, structured: true }) },
    { t: 'Start with one', home: true, say: 'Split when the job outgrows one context, needs different expertise, or has parallel parts.', act: m => m.set({ files: 50, agents: 4, structured: true }) },
  ],
  check: [
    { q: 'What is the single-agent ceiling?', options: ['Context overflow, blurred roles and sequential work', 'A token price', 'A model size limit'], answer: 0, why: 'One loop, one window, one prompt.', hint: 'Set Agents to 1.' },
    { q: 'When is splitting a job across agents not worth it?', options: ['When the job fits in one context', 'When files are long', 'Always worth it'], answer: 0, why: 'Coordination costs more than it buys.', hint: 'Try Split a small job.' },
    { q: 'What makes hand-offs between agents reliable?', options: ['A fixed shape: done, found, still open', 'Longer prose', 'More agents'], answer: 0, why: 'Loose summaries drop detail.', hint: 'Try Hand off in loose prose.' },
  ],
  terms: [
    ['Context saturation', 'A context window so full that early details are lost.'],
    ['Role confusion', 'One prompt asked to do several jobs does each poorly.'],
    ['Fan-out', 'Independent pieces sent to agents in parallel.'],
    ['Supervisor', 'An agent that plans, delegates and integrates.'],
    ['Hand-off contract', 'The fixed shape of what one agent passes to the next.'],
    ['Coordination overhead', 'Tokens and time spent on agents talking to each other.'],
  ],
  deeper: '<p><b>Debugging is harder.</b> With many agents the failure may live in a message between them; trace every hand-off.</p><p><b>Patterns.</b> The orchestration lesson in this track compares supervisor, swarm and hierarchy shapes.</p><p><b>About this machine.</b> A simple illustrative model: four thousand tokens a file, a two-hundred-thousand-token window, recall falling as context fills, and a fixed loss per hand-off.</p>',
  code: {
    title: 'Split only when it pays',
    note: 'Adapted from the course\'s multi-agent sketch (code/main.py).',
    text: `
def plan(task, window=200_000):
    need = task.base_tokens + task.files * task.tokens_per_file
    roles = task.roles()                       # research, code, review...
    if need < 0.6 * window and len(roles) == 1 and not task.parallel_parts:
        return [Agent("solo", task)]           # one agent is enough
    workers = max(1, math.ceil(need / (0.5 * window)))
    return [Agent("planner")] + \\
           [Agent(f"worker-{i}", chunk) for i, chunk in enumerate(task.split(workers))] + \\
           [Agent("reviewer")]

HANDOFF = {"done": [], "found": [], "open": []}   # the contract between agents
`,
  },
};
