// Cold starts for serverless LLMs (phase 17, lesson 10): a Harare telehealth service scales a 70B model to zero at night. A cold start is four
// stages: provision a GPU node, pull a large image with weights, load weights into GPU memory, warm the engine. Pre-seeded node images, weight
// streaming, GPU memory snapshots and a warm replica each remove part of it; the first patient of the morning, the 2-second target and the
// monthly cost of each option (in the learner's currency) are computed live.
const STAGES = [['provision a GPU node', 55], ['pull the image with weights', 210], ['load weights into GPU memory', 80], ['warm the engine', 20]];
const GPU_HR = 4;
function cold(o) {
  if (o.warm) return { st: STAGES.map(([n]) => [n, 0]), total: 0.3, extra: GPU_HR * 24 * 30 * 0.4 };
  const t = STAGES.map(([n, s], i) => {
    let x = s;
    if (i === 1 && o.seed) x = 8;
    if (i === 2 && o.stream) x = 14;
    if ((i === 2 || i === 3) && o.snap) x = i === 2 ? Math.min(x, 9) : 3;
    return [n, x];
  });
  return { st: t, total: t.reduce((a, [, x]) => a + x, 0), extra: (o.seed ? 25 : 0) + (o.snap ? 40 : 0) };
}

export default {
  slug: 'cold-start-mitigation',
  title: 'Cold starts: from minutes to seconds',
  description: 'A telehealth service in Harare scales its big model to zero overnight, and the first patient waits. Shorten each stage on the track, or pay to stay warm.',
  overview: 'Scaling to zero saves money until the first request arrives. For a 70-billion-parameter model on a fresh node, a cold start takes minutes: provision a GPU node (about a minute with a fast provisioner), pull a container image carrying tens of gigabytes of weights (two to five minutes), load the weights into GPU memory (one to two minutes), and initialise the engine\'s compute graphs, KV-cache pool and tokenizer. Against a two-second target that is not a warm-up, it is an outage. Mitigations remove stages. Pre-seeded node images (on AWS, a data-volume snapshot with the image already pulled; custom images elsewhere) skip the pull. Model streaming, such as NVIDIA\'s Run:ai Model Streamer, loads weights into GPU memory in parallel chunks and lets serving start as layers arrive. GPU memory snapshots, as on Modal, checkpoint the loaded state and restore it straight into GPU memory, far faster than re-initialising. Tiered loading keeps weights warm in host memory and pages them onto the GPU on demand. Live migration moves a request\'s tokens to a node that already has the model, instead of cold-starting a new one. Or keep a warm pool: one or two replicas always ready, at a GPU\'s hourly rate around the clock. The arithmetic favours warm pools for large models on interactive paths, and scale-to-zero for small models and batch work, where a few minutes\' delay is fine. Decide per path: live chat and voice get warm replicas, nightly jobs accept the cold start. And measure each stage before optimising, because the slowest stage moves as you fix the others.',
  keywords: ['cold start', 'serverless GPUs', 'scale to zero', 'model loading', 'warm pool', 'inference serving', 'MLOps'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [-0.2, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { seed: true, stream: true, snap: true, warm: true, path: 'chat' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    const SC = ['#5B8DB8', SAF, '#8C6BB1', GOOD];
    /* the cold start as a track of four stages, long as they take; a post marks the goal of two seconds */
    const LX = -2.2, LW = 3.9, SEC = LW / 380;
    const track = P.box(LW, 0.05, 0.56, '#D8D2C4', { r: 0.03 }); track.position.set(LX + LW / 2, 0, -0.4); S.add(track);
    const segs = STAGES.map((_, i) => { const m = new THREE.MeshLambertMaterial({ color: SC[i] }), b = P.box(1, 0.26, 0.44, '#fff', { r: 0.005, material: m }); b.position.set(LX, 0.05, -0.4); S.add(b); return b; });
    const goal = P.box(0.04, 0.5, 0.64, SAF, { r: 0.004 }); goal.position.set(LX + 2 * SEC, 0, -0.4); S.add(goal);
    /* a patient waits at the end of it; a warm replica waits at the front */
    const patient = P.robot('#E07A5F', { scale: 0.56 }); patient.position.set(2.05, 0, -0.4); S.add(patient);
    const warm = P.robot(GOOD, { scale: 0.56 }); warm.position.set(-2.2, 0, 0.25); S.add(warm);
    /* the fixes as lamps */
    const fix = ['seed', 'stream', 'snap'].map((k, i) => { const l = P.lamp(OFF, { h: 0.12, r: 0.085 }); l.position.set(-0.9 + i * 0.5, 0, 0.3); S.add(l); return { k, l }; });
    S.add(P.keep(-2.45, 2.3, 0.75, -0.8, 0.55));
    const parts = [patient, warm];

    let R = null;
    function draw() {
      R = cold(st);
      let x = LX;
      R.st.forEach(([, s], i) => { const w = Math.max(0.004, s * SEC); segs[i].scale.x = w; segs[i].position.x = x + w / 2; segs[i].visible = s > 0; x += w; });
      const fine = st.path === 'chat' ? R.total <= 2 : R.total <= 600;
      patient.userData.set({ color: fine ? GOOD : '#E07A5F', busy: !fine });
      warm.visible = !!st.warm;
      fix.forEach(({ k, l }) => l.userData.set({ color: st[k] ? GOOD : OFF, on: !!st[k] }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Pre-seeded node image: the image is already on disk', short: 'Pre-seeded', get: () => st.seed, set: v => set({ seed: !!v }) },
      { type: 'toggle', label: 'Stream weights into GPU memory in parallel', short: 'Streaming', get: () => st.stream, set: v => set({ stream: !!v }) },
      { type: 'toggle', label: 'Restore a GPU memory snapshot', short: 'Snapshot', get: () => st.snap, set: v => set({ snap: !!v }) },
      { type: 'toggle', label: 'Keep one replica warm', short: 'Warm replica', get: () => st.warm, set: v => set({ warm: !!v }) },
      { type: 'buttons', label: 'This path is', options: ['Live chat', 'Nightly batch'], get: () => st.path === 'chat' ? 0 : 1, act: i => set({ path: i ? 'batch' : 'chat' }) },
    ];
    const readouts = [
      { label: 'Cold start', get: () => ({ v: R.total < 60 ? `${R.total.toFixed(1)} s` : `${(R.total / 60).toFixed(1)} min`, sub: 'to the first token', good: R.total <= 2, bad: R.total > 30 }) },
      { label: 'Extra a month', get: () => ({ v: M(R.extra), sub: st.warm ? 'warm replica' : 'images and snapshots' }) },
      { label: 'Slowest stage', get: () => { const s = R.st.slice().sort((a, b) => b[1] - a[1])[0]; return { v: s[1] ? `${s[1]} s` : '—', sub: s[1] ? s[0].split(' ').slice(0, 3).join(' ') : 'none' }; } },
    ];
    const labels = [
      { name: 'line', t: 'A cold start', d: 'Four stages, each as long as it takes', icon: 'link', atV: V(-2.2, 0.06, -0.62) },
      { name: 'rows', t: 'The first patient', d: 'Teal: answered in time', icon: 'user', atV: V(2.3, 0.25, -0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Start completely cold', hint: 'no mitigations', on: () => set({ ...D0, seed: false, stream: false, snap: false, warm: false }), off: reset },
      { label: 'Keep a warm replica for batch', hint: 'paying for idle', on: () => set({ ...D0, warm: true, path: 'batch' }), off: reset },
      { label: 'Rely on streaming alone', hint: 'the pull remains', on: () => set({ ...D0, seed: false, snap: false, warm: false }), off: reset },
    ];
    function status() {
      const t = R.total, fmt = t < 60 ? `${t.toFixed(1)} seconds` : `${(t / 60).toFixed(1)} minutes`;
      if (st.warm && st.path === 'batch') return { ok: false, msg: `<b>A warm replica for the nightly batch path costs about ${M(R.extra)} a month to avoid a delay nobody waits for.</b> Batch work can accept a cold start of a few minutes; keep warm replicas for interactive paths, where a patient is waiting.` };
      if (st.warm) return { ok: true, msg: `<b>A warm replica answers the first patient at once, for about ${M(R.extra)} a month.</b> For a large model on a live path, that is usually worth it; for a small model, a fast cold start may be cheaper.` };
      if (!st.seed && !st.stream && !st.snap) return { ok: false, msg: `<b>Fully cold, the first patient of the morning waits ${fmt}: about a minute for a node, three and a half to pull the image with its weights, more to load and warm up.</b> Against a two-second target that is an outage. Measure each stage, then remove them.` };
      if (!st.seed) return { ok: false, msg: `<b>${st.stream && st.snap ? 'Streaming and snapshots' : st.stream ? 'Streaming' : st.snap ? 'A snapshot' : 'Nothing'} shortened loading, but the image pull still takes ${STAGES[1][1]} seconds: ${fmt} in all.</b> The slowest stage moves as you fix the others. Pre-seed the node image so the weights are already on disk.` };
      if (st.path === 'chat' && t > 2) return { ok: false, msg: `<b>With the image pre-seeded${st.stream ? ', weights streamed' : ''}${st.snap ? ' and a GPU snapshot restored' : ''}, the cold start is down to ${fmt}, from about six minutes, but node provisioning alone is ${STAGES[0][1]} seconds.</b> For a live path with a two-second target, keep one replica warm; use the fast cold start for scaling beyond it.` };
      return { ok: true, msg: `<b>For the nightly batch, a cold start of ${fmt} is fine, and the GPU is released the rest of the time.</b> Scale-to-zero and fast restarts make batch paths cheap.` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The first patient', home: true, say: 'A telehealth service in Harare scales its model to zero overnight. The first patient in the morning starts a cold start.', act: m => m.set({ seed: false, stream: false, snap: false, warm: false, path: 'chat' }) },
    { t: 'Four stages', home: true, say: 'Find a GPU node, pull a huge image with the weights, load the weights, warm the engine. About six minutes.', act: m => m.set({ seed: false, stream: false, snap: false, warm: false, path: 'chat' }) },
    { t: 'Skip the pull', home: true, say: 'A node image with the weights already on disk removes the longest stage.', act: m => m.set({ seed: true, stream: false, snap: false, warm: false, path: 'chat' }) },
    { t: 'Load faster', home: true, say: 'Stream weights in parallel, and restore a snapshot of the loaded GPU memory instead of starting over.', act: m => m.set({ seed: true, stream: true, snap: true, warm: false, path: 'chat' }) },
    { t: 'Keep one warm', home: true, say: 'Finding a node still takes about a minute. For a live path, keep one replica warm and pay for it.', act: m => m.set({ seed: true, stream: true, snap: true, warm: true, path: 'chat' }) },
    { t: 'Per path', home: true, say: 'A nightly batch job can wait a minute. Decide warm or cold path by path.', act: m => m.set({ seed: true, stream: true, snap: true, warm: false, path: 'batch' }) },
  ],
  check: [
    { q: 'Which stage of a large model\'s cold start is often longest?', options: ['Pulling the image with the weights', 'Warming the engine', 'Tokenising'], answer: 0, why: 'Tens of gigabytes over the network.', hint: 'Try Start completely cold.' },
    { q: 'What does a GPU memory snapshot do?', options: ['Restores loaded state straight into GPU memory', 'Compresses the model', 'Adds a GPU'], answer: 0, why: 'Far faster than re-initialising.', hint: 'Turn on Snapshot.' },
    { q: 'Where is a warm replica worth its cost?', options: ['Interactive paths where people wait', 'Nightly batch jobs', 'Everywhere'], answer: 0, why: 'Batch can accept a cold start.', hint: 'Try Keep a warm replica for batch.' },
  ],
  terms: [
    ['Cold start', 'The time from zero replicas to the first token.'],
    ['Scale to zero', 'Release all replicas when idle.'],
    ['Pre-seeded image', 'A node disk that already holds the container and weights.'],
    ['Weight streaming', 'Loading weights in parallel chunks, serving as layers arrive.'],
    ['GPU memory snapshot', 'Saved GPU state restored directly on restart.'],
    ['Warm pool', 'Replicas kept ready at all times.'],
  ],
  deeper: '<p><b>Tiered loading.</b> Keep weights in host memory across a fleet and page them onto GPUs on demand, trading memory for far faster loads.</p><p><b>Live migration.</b> When a node is evicted, move the request\'s tokens (kilobytes) to a node that already has the model, rather than cold-starting a replacement.</p><p><b>About this machine.</b> Stage times, savings and costs are illustrative, set in US dollars and shown in your currency; the timeline is computed live.</p>',
  code: {
    title: 'Measure the stages',
    note: 'Adapted from the course\'s cold-start sketch (code/main.py).',
    text: `
STAGES = ["provision_node", "pull_image", "load_weights", "warm_engine"]

def cold_start(mitigations):
    t = {"provision_node": 55, "pull_image": 210, "load_weights": 80, "warm_engine": 20}
    if "preseeded_image" in mitigations: t["pull_image"] = 8
    if "stream_weights" in mitigations:  t["load_weights"] = 14
    if "gpu_snapshot" in mitigations:    t["load_weights"] = min(t["load_weights"], 9); t["warm_engine"] = 3
    return t, sum(t.values())

def plan(path):
    return {"min_replicas": 1} if path.interactive else {"min_replicas": 0}   # per path
`,
  },
};
