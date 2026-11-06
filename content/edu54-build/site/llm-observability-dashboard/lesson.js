// Capstone: an LLM observability dashboard (phase 19, capstone 11). A Tunis e-commerce firm's four apps feed one plane. Five detectors each watch for one failure: cost, invented facts, drift, jailbreak, personal data. An incident is injected, and one dial must fire.
// Thresholds trade missed incidents for alert noise. Sampling cuts cost and can miss rare events. Everything is counted from the small tables below.
const DET = ['Cost', 'Invented facts', 'Drift', 'Jailbreak', 'Personal data'];
const INC = { none: -1, loop: 0, halluc: 1, driftI: 2, jail: 3, pii: 4 };
function run(o) {
  const i = INC[o.inc];
  const v = DET.map((d, k) => (k === i ? 0.9 : 0.15 + (k * 0.07)) * (k === 3 || k === 4 ? (o.sample >= 100 ? 1 : o.sample / 100 + 0.1) : 1));
  const fired = v.map(x => x >= o.th);
  const noise = Math.round(Math.max(0, (0.5 - o.th) * 60));
  const hit = i < 0 ? true : fired[i];
  return { v, fired, noise, hit, i, feeds: o.otel ? 4 : 2, cost: o.sample };
}

export default {
  slug: 'llm-observability-dashboard',
  title: 'Capstone: a dashboard that finds the fault',
  description: 'Four apps, one plane, five detectors. Inject a failure, and see if the right dial fires without burying you in alerts.',
  overview: 'Every team running AI in production ends up with an observability plane beside the model. It takes traces from every SDK, then checks them: cost per feature, invented facts, input drift, jailbreak signals, personal data leaks, each against a target. The difficulty isn\'t the charts. Thresholds set low wake someone every night, and people start ignoring them. Set high, they miss the incident. Sampling saves money and can miss rare events, which are just the ones that matter here. This capstone builds that plane for a firm in Tunis. Inject a failure, watch for the right dial, and tune it until it is both quiet and alert.',
  keywords: ['LLM observability', 'dashboards', 'SLO', 'drift', 'alert fatigue', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { inc: 'loop', th: 0.6, sample: 100, otel: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const ZS = [-0.54, -0.18, 0.18, 0.54];
    const apps = ZS.map((z, i) => { const b = P.box(0.42, 0.3, 0.26, ['#5B8DB8', '#7B6FA8', '#3E9B9B', '#A87A4F'][i], { r: 0.03 }); b.position.set(-2.2, 0.03, z); S.add(b); return b; });
    const pipes = ZS.map(z => add(P.pipe([V(-1.95, 0.18, z), V(-1.15, 0.2, z * 0.3)], SAF, { r: 0.04, n: 3, speed: 0.6 })));
    const plane = P.box(0.5, 0.6, 0.9, '#2C2D31', { r: 0.05 }); plane.position.set(-0.9, 0.03, 0); S.add(plane);
    const X = i => -0.2 + i * 0.58;
    const T = DET.map((d, i) => { const t = add(P.tower(0.42, 0.42, GOOD)); t.position.set(X(i), 0.03, -0.25); t.userData.set({ cap: '' }); return t; });
    const L = DET.map((d, i) => { const l = add(P.lamp('#C9C4B6', { h: 0.2, r: 0.09 })); l.position.set(X(i), 0.03, 0.35); return l; });
    const pager = add(P.stack(0.34, 0.3, 0.07, { max: 12, color: BAD })); pager.position.set(-1.7, 0.03, 0.6);
    const line = new S.THREE.Mesh(new S.THREE.BoxGeometry(2.9, 0.02, 0.5), new S.THREE.MeshLambertMaterial({ color: SAF, transparent: true, opacity: 0.45, depthWrite: false })); line.position.set(0.96, 0, -0.25); line.userData.noMask = true; line.userData.noFit = true; S.add(line);
    S.add(P.keep(-2.45, 2.45, 1.15, -0.75, 0.75));
    let R = null;
    function draw() {
      R = run(st);
      T.forEach((t, i) => t.userData.set({ h: Math.max(0.04, R.v[i] * 1.1), color: i === R.i ? (R.hit ? GOOD : BAD) : BLUE }));
      L.forEach((l, i) => l.userData.set({ color: R.fired[i] ? '#E3A72F' : '#C9C4B6', on: R.fired[i] }));
      line.position.y = 0.03 + st.th * 1.1;
      pipes.forEach((p, i) => p.userData.set({ on: i < R.feeds }));
      pager.userData.set({ n: Math.min(12, R.noise), colors: Array(12).fill(BAD) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const IK = ['none', 'loop', 'halluc', 'driftI', 'jail', 'pii'];
    const controls = [
      { type: 'buttons', label: 'Inject', options: ['Nothing', 'Cost loop', 'Invented', 'Drift', 'Jailbreak', 'Data leak'], get: () => IK.indexOf(st.inc), act: i => set({ inc: IK[i] }) },
      { type: 'slider', label: 'Alert threshold', min: 0.1, max: 0.95, step: 0.05, get: () => st.th, set: v => set({ th: v }) },
      { type: 'slider', label: 'Traces sampled', min: 5, max: 100, step: 5, get: () => st.sample, set: v => set({ sample: v }), fmt: v => `${v}%` },
      { type: 'toggle', label: 'All four apps speak OpenTelemetry', short: 'OTel', get: () => st.otel, set: v => set({ otel: !!v }) },
    ];
    const readouts = [
      { label: 'Incident', get: () => ({ v: R.i < 0 ? 'none' : R.hit ? 'caught' : 'missed', sub: R.i < 0 ? 'a quiet day' : DET[R.i], good: R.hit, bad: !R.hit }) },
      { label: 'False alerts a night', get: () => ({ v: `${R.noise}`, sub: 'people stop reading', good: R.noise <= 2, bad: R.noise > 6 }) },
      { label: 'Apps visible', get: () => ({ v: `${R.feeds} of 4`, good: R.feeds === 4, bad: R.feeds < 4 }) },
    ];
    const labels = [
      { name: 'a', t: 'Four apps', d: 'One plane collects them', icon: 'link', atV: V(-2.42, 0.2, 0) },
      { name: 't', t: 'Five detectors', d: 'Plane: alert threshold', icon: 'target', atV: V(X(4) + 0.22, 0.2, -0.25) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Alert on everything', hint: 'threshold too low', on: () => set({ ...D0, th: 0.15 }), off: reset },
      { label: 'Sample five percent', hint: 'rare events vanish', on: () => set({ ...D0, inc: 'pii', sample: 5 }), off: reset },
      { label: 'Two apps never instrumented', hint: 'a blind side', on: () => set({ ...D0, otel: false }), off: reset },
    ];
    function status() {
      if (R.noise > 6) return { ok: false, msg: `<b>${R.noise} false alerts a night.</b> Within a week nobody reads them, and the real incident gets the same silence. An alert must mean someone should act.` };
      if (!R.hit) return { ok: false, msg: `<b>"${DET[R.i]}" went unseen.</b> ${st.sample < 100 ? `At ${st.sample}% sampling, rare events never reach the detector. Sample common traffic, and keep every trace that looks risky.` : 'The threshold is above the signal.'}` };
      if (R.feeds < 4) return { ok: false, msg: '<b>Two apps send nothing, so half the system is invisible.</b> One standard makes every SDK feed the same plane.' };
      return { ok: true, msg: `<b>${R.i < 0 ? 'A quiet day, with' : `"${DET[R.i]}" fired, with`} ${R.noise} false alerts.</b> Each detector maps to an owner and an action.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One plane', home: true, say: 'A firm in Tunis runs four AI apps. Traces flow from all of them into one plane, and five detectors watch.', act: m => m.set({ inc: 'none', th: 0.6, sample: 100, otel: true }) },
    { t: 'An incident', home: true, say: 'A retry loop starts burning money. The cost tower rises through the plane, and its lamp fires.', act: m => m.set({ inc: 'loop', th: 0.6, sample: 100, otel: true }) },
    { t: 'Too many alerts', home: true, say: 'Lower the threshold to be safe, and people are paged every night. Soon nobody reads them.', act: m => m.set({ inc: 'loop', th: 0.15, sample: 100, otel: true }) },
    { t: 'Sampling', home: true, say: 'Sampling saves money. A rare data leak may not make it into the sample.', act: m => m.set({ inc: 'pii', th: 0.6, sample: 5, otel: true }) },
    { t: 'Blind sides', home: true, say: 'Apps that send nothing can\'t be seen. One standard brings them all in.', act: m => m.set({ inc: 'jail', th: 0.6, sample: 100, otel: false }) },
    { t: 'Quiet and alert', home: true, say: 'Tune until alerts mean something, and each one has an owner.', act: m => m.set({ inc: 'jail', th: 0.6, sample: 100, otel: true }) },
  ],
  check: [
    { q: 'What happens with too many alerts?', options: ['People stop reading them', 'Models improve', 'Costs fall'], answer: 0, why: 'Alert fatigue hides real incidents.', hint: 'Try Alert on everything.' },
    { q: 'What can heavy sampling miss?', options: ['Rare events', 'Common traffic', 'Latency averages'], answer: 0, why: 'Keep every risky trace.', hint: 'Try Sample five percent.' },
    { q: 'What should every alert have?', options: ['An owner and an action', 'A nice chart', 'A long name'], answer: 0, why: 'Otherwise it is only noise.', hint: 'See Quiet and alert.' },
  ],
  terms: [['SLO', 'A target for a service.'], ['Detector', 'A check that watches for one failure.'], ['Alert fatigue', 'Ignoring alarms that fire too often.'], ['Sampling', 'Keeping a share of traces.'], ['Drift', 'Inputs or quality slowly changing.']],
  deeper: '<p><b>Tail sampling.</b> Decide after a trace ends, so that errors and risky traces are always kept.</p><p><b>Build or buy.</b> The earlier lessons compare tools. Here you see the jobs any of them must do.</p><p><b>Signals</b> are fixed numbers to show the behaviour.</p>',
  code: {
    title: 'A detector',
    note: 'A sketch of the course\'s capstone (code/main.py).',
    text: `
DETECTORS = {"cost": cost_per_feature, "pii": find_pii, "drift": input_drift,
             "invented": grounding_score, "jailbreak": jailbreak_signal}

def check(window):
    for name, detect in DETECTORS.items():
        value = detect(window)
        if value > THRESHOLDS[name]:
            page(OWNERS[name], name, value, runbook=RUNBOOKS[name])
`,
  },
};
