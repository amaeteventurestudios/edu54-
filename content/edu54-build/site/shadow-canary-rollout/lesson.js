// Shadow, canary and rollback (phase 17, lesson 20): a Kampala bank rolls a new model into its support assistant. Offline evaluations say it is
// 3% better; in production it writes 45% longer answers (cost up 40%) and refuses more balance questions. Shadow mode copies live traffic to the
// candidate with no user impact; a canary shifts 1%, 10%, 25%, 50%, 100% with gates on five metrics; rollback is a policy flag or a redeploy.
// What each step sees, how many users are hurt and how long recovery takes are computed live.
const BASE = { p99: 2.1, cost: 1, refuse: 0.02, len: 180, thumbs: 0.06 };
const CAND = { p99: 2.4, cost: 1.4, refuse: 0.05, len: 260, thumbs: 0.09 };
const STEPS = [0.01, 0.1, 0.25, 0.5, 1];
const GATES = [['p99', 'P99 latency', 1.5], ['cost', 'cost per request', 1.2], ['refuse', 'refusals', 2], ['len', 'answer length', 1.3], ['thumbs', 'thumbs-down', 1.4]];
function rollout(o) {
  const shadowCaught = o.shadow ? ['cost', 'len', 'refuse'] : [];
  const breach = GATES.filter(([k, , x]) => CAND[k] / BASE[k] > x).map(g => g[0]);
  const gated = o.gates ? breach : [];
  let stopAt = null;
  if (o.shadow && shadowCaught.length) stopAt = -1;
  else if (o.canary && gated.length) stopAt = 0;
  else if (o.canary && !gated.length) stopAt = null;
  const reached = stopAt === -1 ? 0 : o.canary ? (stopAt === null ? 1 : STEPS[stopAt]) : 1;
  const exposedDays = o.canary ? (stopAt === null ? 1 : 0.15) : 1;
  const users = 40000, hurt = Math.round(users * reached * exposedDays * (CAND.thumbs - BASE.thumbs) * 10);
  const recover = o.flag ? 30 : 47 * 60;
  return { breach, shadowCaught, gated, stopAt, reached, hurt, recover };
}

export default {
  slug: 'shadow-canary-rollout',
  title: 'Rolling out a model: shadow, canary, roll back',
  description: 'A bank in Kampala swaps the model behind its assistant. Offline scores look better, so climb the rollout one step at a time, with gates and a way back.',
  overview: 'Model rollouts combine the hardest parts of deployment: no unit tests, diffuse failure modes and delayed signals. Offline evaluations answer whether the model can do the job on a fixed set; they say little about cost, answer length, refusals or how users react. A safe sequence has three stages. Shadow mode copies production requests to the candidate and logs its answers without returning them: zero user impact, and it catches cost blow-ups, length regressions, changed refusal rates and hard errors, though not whether users would prefer the answers. A canary then shifts real traffic progressively, say 1%, 10%, 25%, 50%, 100%, and checks gates at each step on at least five metrics: tail latency, cost per request, error and refusal rate, the distribution of answer lengths, and user feedback such as thumbs-down and tickets. Breach a gate and the canary stops. Finally an A/B test, after stability, confirms the product effect, the subject of the next lesson. Non-determinism changes what "stable" means: the same input can give different outputs from batching order, sampling and provider-side changes, so compare distributions over enough traffic, not single answers. Two operational rules make all this work. Route by a policy flag in a gateway, so rollback is a configuration change that takes seconds, not a redeploy that takes most of an hour. And decide the gates and their thresholds before the rollout starts, so a bad number stops the rollout rather than starting a debate.',
  keywords: ['canary release', 'shadow testing', 'rollback', 'model deployment', 'progressive delivery', 'MLOps', 'LLM'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { shadow: true, canary: true, gates: true, flag: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* a shadow pad, then five rising steps of live traffic */
    const SX = i => -1.5 + i * 0.66;
    const shm = new THREE.MeshLambertMaterial({ color: OFF }), shb = P.box(0.56, 0.08, 0.56, '#fff', { r: 0.04, material: shm }); shb.position.set(-2.25, 0, -0.5); S.add(shb);
    const steps = STEPS.map((p, i) => { const m = new THREE.MeshLambertMaterial({ color: OFF }), h = 0.1 + p * 0.5, b = P.box(0.6, h, 0.56, '#fff', { r: 0.03, material: m }); b.position.set(SX(i), 0, -0.5); S.add(b); return { m, h }; });
    /* the new model, standing as far up as it has been let */
    const model = P.robot('#3D6BD6', { scale: 0.5 }); model.userData.noFit = true; S.add(model);
    /* five gates as lamps */
    const gates = GATES.map(([k, n, x], i) => { const l = P.lamp(OFF, { h: 0.12, r: 0.085 }); l.position.set(-1.45 + i * 0.42, 0, 0.3); S.add(l); return { k, x, l }; });
    /* customers hurt as a tower; the rollback switch as a lamp */
    const hurt = P.tower(0.34, 0.34, BAD, { h: 0.1 }); hurt.userData.set({ cap: '' }); hurt.position.set(1.1, 0, 0.3); S.add(hurt);
    const flip = P.lamp(GOOD, { h: 0.2, r: 0.1 }); flip.position.set(1.65, 0, 0.3); S.add(flip);
    S.add(P.keep(-2.6, 1.95, 0.95, -0.85, 0.55));
    const parts = [model, hurt];

    let R = null;
    const fmtR = s => s < 120 ? `${s} seconds` : `${Math.round(s / 60)} minutes`;
    function draw() {
      R = rollout(st);
      shm.color.set(!st.shadow ? OFF : R.stopAt === -1 ? SAF : GOOD);
      let top = -1;
      STEPS.forEach((p, i) => {
        const live = st.canary ? (R.stopAt === -1 ? false : R.stopAt === null ? true : i <= R.stopAt) : p === 1;
        const stopped = st.canary && R.stopAt === i;
        steps[i].m.color.set(!live ? OFF : stopped ? SAF : R.reached === 1 && R.breach.length ? BAD : GOOD);
        if (live) top = i;
      });
      if (top < 0) model.position.set(-2.25, 0.08, -0.5); else model.position.set(SX(top), steps[top].h, -0.5);
      gates.forEach(G => { const br = CAND[G.k] / BASE[G.k] > G.x; G.l.userData.set({ color: !st.gates ? OFF : br ? BAD : GOOD, on: true }); });
      hurt.userData.set({ h: Math.max(0.03, Math.min(0.9, R.hurt * 0.0006)) });
      flip.userData.set({ color: st.flag ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Shadow mode first: copy traffic, return nothing', short: 'Shadow', get: () => st.shadow, set: v => set({ shadow: !!v }) },
      { type: 'toggle', label: 'Canary: shift traffic step by step', short: 'Canary', get: () => st.canary, set: v => set({ canary: !!v }) },
      { type: 'toggle', label: 'Gates on five metrics at each step', short: 'Gates', get: () => st.gates, set: v => set({ gates: !!v }) },
      { type: 'toggle', label: 'Roll back with a routing flag, not a redeploy', short: 'Flag rollback', get: () => st.flag, set: v => set({ flag: !!v }) },
    ];
    const readouts = [
      { label: 'Reached', get: () => ({ v: `${Math.round(R.reached * 100)}%`, sub: 'of users', good: R.reached <= 0.01, bad: R.reached === 1 }) },
      { label: 'Users hurt', get: () => ({ v: R.hurt.toLocaleString('en'), sub: 'worse answers', good: R.hurt < 50, bad: R.hurt > 200 }) },
      { label: 'Recovery', get: () => ({ v: fmtR(R.recover), sub: st.flag ? 'flag flip' : 'redeploy', good: st.flag, bad: !st.flag }) },
    ];
    const labels = [
      { name: 'steps', t: 'Shadow, then canary', d: 'The model climbs only if it may', icon: 'target', atV: V(-2.53, 0.08, -0.5) },
      { name: 'gates', t: 'Customers hurt', d: 'Smaller if you stop early', icon: 'check', atV: V(1.3, 0.2, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Switch everyone over at once', hint: 'no shadow, no canary', on: () => set({ ...D0, shadow: false, canary: false, flag: false }), off: reset },
      { label: 'Run a canary with no gates', hint: 'it walks to 100%', on: () => set({ ...D0, shadow: false, gates: false }), off: reset },
      { label: 'Roll back by redeploying', hint: 'no flag', on: () => set({ ...D0, shadow: false, flag: false }), off: reset },
    ];
    function status() {
      if (!st.canary && !st.shadow) return { ok: false, msg: `<b>Everyone switched at once: within a day cost was up 40%, answers 45% longer, refusals of balance questions up, and about ${R.hurt.toLocaleString('en')} customers got a worse answer. ${st.flag ? 'The flag rolled it back in thirty seconds.' : 'Rolling back meant redeploying the old model: 47 minutes.'}</b> The offline evaluation was true and beside the point.` };
      if (st.canary && !st.gates && !st.shadow) return { ok: false, msg: `<b>The canary moved through every step to 100%, because nothing was checked on the way: about ${R.hurt.toLocaleString('en')} customers affected.</b> A canary without gates is a slow switchover. Gate each step on latency, cost, refusals, answer length and feedback, with thresholds set beforehand.` };
      if (!st.flag) return { ok: false, msg: `<b>The gates stopped the canary at 1%, but rolling back meant redeploying the old model, 47 minutes with 1% of customers still on the new one.</b> Route through a gateway policy flag so rollback is a configuration change of seconds.` };
      if (st.shadow) return { ok: true, msg: '<b>In shadow, with no customer affected, the candidate\'s logs showed answers 45% longer, cost per request up 40% and refusals of balance questions more than doubled. The rollout never started.</b> Shadow is a smoke test for cost, length and refusals; a gated canary and then an A/B test would judge quality.' };
      return { ok: true, msg: `<b>At 1% the gates tripped on cost, answer length and refusals, the canary stopped, and the flag sent everyone back in thirty seconds: about ${R.hurt} customers saw the new model\'s answers.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A better model, on paper', home: true, say: 'A bank in Kampala swaps the model behind its assistant. Offline evaluations say it is three percent better.', act: m => m.set({ shadow: false, canary: false, gates: false, flag: false }) },
    { t: 'All at once', home: true, say: 'Switch everyone at once and the surprises arrive together: longer answers, higher cost, more refusals.', act: m => m.set({ shadow: false, canary: false, gates: false, flag: false }) },
    { t: 'Shadow first', home: true, say: 'Copy live requests to the new model and log its answers, returning nothing. Cost and length jump out, with no customer affected.', act: m => m.set({ shadow: true, canary: true, gates: true, flag: true }) },
    { t: 'A canary, with gates', home: true, say: 'Then shift traffic step by step, checking five metrics each time. A breach stops it at one percent.', act: m => m.set({ shadow: false, canary: true, gates: true, flag: true }) },
    { t: 'No gates, no canary', home: true, say: 'A canary that checks nothing just walks to everyone, slowly.', act: m => m.set({ shadow: false, canary: true, gates: false, flag: true }) },
    { t: 'Seconds to roll back', home: true, say: 'Route by a policy flag, so going back is a change of configuration, not a redeploy.', act: m => m.set({ shadow: true, canary: true, gates: true, flag: true }) },
  ],
  check: [
    { q: 'What does shadow mode catch, and what doesn\'t it?', options: ['Cost, length and refusal changes, not user preference', 'Everything', 'Only latency'], answer: 0, why: 'Answers are logged, not shown.', hint: 'Read the shadow tile.' },
    { q: 'What makes a canary safe?', options: ['Gates on several metrics at each step', 'Small steps alone', 'Speed'], answer: 0, why: 'Without gates it walks to 100%.', hint: 'Try Run a canary with no gates.' },
    { q: 'Why roll back with a routing flag?', options: ['It takes seconds, not a redeploy\'s minutes', 'It is required', 'It changes the model'], answer: 0, why: 'Configuration beats redeploying.', hint: 'Try Roll back by redeploying.' },
  ],
  terms: [
    ['Shadow mode', 'Sending copies of live traffic to a candidate and logging its output.'],
    ['Canary', 'Shifting real traffic to a candidate step by step.'],
    ['Gate', 'A metric threshold that stops a rollout when breached.'],
    ['Policy flag', 'A routing setting that switches models without redeploying.'],
    ['Non-determinism', 'The same input giving different outputs between runs.'],
    ['Rollback', 'Returning traffic to the previous model.'],
  ],
  deeper: '<p><b>Compare distributions.</b> Because outputs vary run to run, judge answer length, refusals and cost as distributions over enough traffic, not one answer against another.</p><p><b>Then A/B.</b> Once the candidate is stable, a randomised experiment answers whether customers actually prefer it.</p><p><b>About this machine.</b> The two models\' metrics, gates and user numbers are illustrative; which step stops and how many users are affected are computed live.</p>',
  code: {
    title: 'A gated canary',
    note: 'Adapted from the course\'s rollout sketch (code/main.py).',
    text: `
STEPS = [0.01, 0.10, 0.25, 0.50, 1.00]
GATES = {"p99_latency": 1.5, "cost_per_request": 1.2, "refusal_rate": 2.0,
         "answer_length": 1.3, "thumbs_down": 1.4}          # ratios to baseline, set beforehand

def rollout(candidate, baseline, flags):
    for share in STEPS:
        flags.set("support-model", {"candidate": share})     # gateway policy, not a deploy
        wait_for_traffic(min_requests=5000)
        for metric, limit in GATES.items():
            if candidate.metric(metric) / baseline.metric(metric) > limit:
                flags.set("support-model", {"candidate": 0})  # rollback in seconds
                return f"stopped at {share:.0%}: {metric}"
    return "promoted"
`,
  },
};
