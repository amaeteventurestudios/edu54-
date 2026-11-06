// SRE for AI (phase 17, lesson 23): 3 a.m. at a Nairobi payments firm: checkout errors, caused by a KV cache spike on a model server. A supervisor sends log, metric and runbook agents; two models must agree; a person approves.
// Auto-remediation stays narrow: restart a pod or revert a deploy. Prediction without action is only a dashboard. Minutes to recovery are added up from the steps taken.
const BASE = { page: 5, find: 25, act: 10 };
const FIX = { restart: { n: 'Restart the pod', ok: true, wide: false }, revert: { n: 'Revert the deploy', ok: false, wide: false }, rewrite: { n: 'Re-architect the service', ok: false, wide: true } };
function run(o) {
  let find = o.agents ? 4 : BASE.find, wait = o.gate ? 3 : 0, act = o.agents ? 2 : BASE.act;
  const agree = o.two ? !o.split : true;
  const wrongFix = !o.two && o.split;
  if (!agree) { find += 8; }
  const f = FIX[o.fix], harm = (!o.gate && f.wide) || (wrongFix && !o.gate);
  const predicted = o.pred, acted = o.pred && o.wire;
  const happened = !acted;
  const mins = happened ? BASE.page + find + wait + act + (f.ok ? 0 : 20) : 0;
  return { find, wait, act, agree, wrongFix, f, harm, predicted, acted, mins };
}

export default {
  slug: 'sre-for-ai',
  title: 'SRE for AI: agents on call, a person at the gate',
  description: 'A 3 a.m. page, and agents read the logs. See what to let them do alone, and what needs a person.',
  overview: 'An on-call engineer woken at 3 a.m. can spend half an hour across dashboards before finding that a model server ran out of memory. An AI SRE system splits that work: a supervisor sends specialist agents to logs, metrics and runbooks, then proposes a fix for a person to approve. Two rules keep it safe. Automatic action stays narrow, such as restarting a pod or reverting a deploy, never rebuilding a service. And when two independent models analyse an incident, agreement means confidence, while disagreement means a person looks. Predictive detection can spot many failures early, but a prediction without a wired action is just another dashboard.',
  keywords: ['SRE', 'incident response', 'AIOps', 'runbooks', 'auto-remediation', 'human approval'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.65, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { agents: true, two: true, split: false, gate: true, fix: 'restart', pred: false, wire: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const alarm = add(P.lamp('#D9483B', { h: 0.6, r: 0.14 })); alarm.position.set(-2.3, 0.03, -0.3);
    const sup = add(P.robot(SAF, { scale: 0.85 })); sup.position.set(-1.45, 0.03, -0.3);
    const ZZ = [-0.5, 0, 0.5], team = ZZ.map((z, i) => { const r = add(P.robot(['#5B8DB8', '#3E9B9B', '#7B6FA8'][i], { scale: 0.45 })); r.position.set(-0.6, 0.03, z); return r; });
    const models = [0, 1].map(i => { const l = add(P.lamp(GOOD, { h: 0.34, r: 0.1 })); l.position.set(0.1 + i * 0.32, 0.03, -0.1); return l; });
    const human = add(P.robot('#A87A4F', { scale: 0.8 })); human.position.set(1.1, 0.03, -0.3);
    const gate = add(P.gate(0.7, SAF)); gate.position.set(1.1, 0.03, 0.4);
    const T = add(P.tower(0.6, 0.55, GOOD)); T.position.set(2.05, 0.03, 0); T.userData.set({ cap: '' });
    S.add(P.keep(-2.5, 2.5, 1.15, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      team.forEach(r => { r.visible = st.agents; r.userData.set({ busy: true }); }); sup.visible = st.agents;
      models[0].userData.set({ color: GOOD, on: st.two }); models[1].userData.set({ color: st.split ? '#D9483B' : GOOD, on: st.two });
      alarm.userData.set({ color: R.acted ? '#3E9B5F' : '#D9483B', on: true });
      human.visible = st.gate; gate.visible = st.gate; gate.userData.set({ open: false, color: SAF });
      T.userData.set({ h: Math.max(0.05, R.mins / 60), color: R.mins > 40 ? BAD : GOOD });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const FK = ['restart', 'revert', 'rewrite'];
    const controls = [
      { type: 'toggle', label: 'Specialist agents read logs, metrics and runbooks', short: 'Agents', get: () => st.agents, set: v => set({ agents: !!v }) },
      { type: 'toggle', label: 'Two independent models analyse it', short: 'Two models', get: () => st.two, set: v => set({ two: !!v }) },
      { type: 'toggle', label: 'This time the analysis is uncertain', short: 'Unclear case', get: () => st.split, set: v => set({ split: !!v }) },
      { type: 'toggle', label: 'A person approves actions', short: 'Approval', get: () => st.gate, set: v => set({ gate: !!v }) },
      { type: 'buttons', label: 'Proposed fix', options: ['Restart pod', 'Revert deploy', 'Re-architect'], get: () => FK.indexOf(st.fix), act: i => set({ fix: FK[i] }) },
      { type: 'toggle', label: 'A model predicted this ahead of time', short: 'Predicted', get: () => st.pred, set: v => set({ pred: !!v }) },
      { type: 'toggle', label: 'The prediction triggers a pre-approved action', short: 'Wired', get: () => st.wire, set: v => set({ wire: !!v }) },
    ];
    const readouts = [
      { label: 'Time to recover', get: () => ({ v: R.acted ? 'avoided' : `${R.mins} min`, sub: R.acted ? 'acted before the page' : `${R.find} min to find the cause`, good: R.mins < 20, bad: R.mins > 40 }) },
      { label: 'Models', get: () => ({ v: !st.two ? 'one' : R.agree ? 'agree' : 'disagree', sub: !st.two ? 'no second opinion' : R.agree ? 'act with confidence' : 'a person looks', bad: R.wrongFix }) },
      { label: 'Risk', get: () => ({ v: R.harm ? 'unsafe' : 'contained', sub: R.f.n, good: !R.harm, bad: R.harm }) },
    ];
    const labels = [
      { name: 'a', t: 'Supervisor and specialists', d: 'Logs, metrics, runbooks', icon: 'user', atV: V(-2.4, 0.35, 0.2) },
      { name: 't', t: 'Minutes to recover', d: 'A person holds the gate', icon: 'target', atV: V(2.4, 0.15, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let it re-architect alone', hint: 'no approval, wide action', on: () => set({ ...D0, gate: false, fix: 'rewrite' }), off: reset },
      { label: 'One model, unclear case', hint: 'no second opinion', on: () => set({ ...D0, two: false, split: true, gate: false }), off: reset },
      { label: 'Predict, then do nothing', hint: 'another dashboard', on: () => set({ ...D0, pred: true, wire: false }), off: reset },
    ];
    function status() {
      if (!st.gate && st.fix === 'rewrite') return { ok: false, msg: '<b>An agent began changing a live payments system at 3 a.m.</b> Keep automatic actions narrow and easy to undo. Anything wider is a proposal for a person.' };
      if (R.wrongFix) return { ok: false, msg: '<b>One model was sure and wrong, and nothing stopped it.</b> Two models that analyse separately give a check: when they disagree, the case goes to a person.' };
      if (st.two && !R.agree) return { ok: true, msg: `<b>The models disagree, so a person looks.</b> It took ${R.find} minutes to find the cause, which beats acting on a guess.` };
      if (st.pred && !st.wire) return { ok: false, msg: `<b>The prediction was right, and the page came anyway: ${R.mins} minutes.</b> Nobody was watching that chart at 3 a.m. A prediction must be wired to an approved action.` };
      if (R.acted) return { ok: true, msg: '<b>The spike was predicted, and a pre-approved restart ran before users noticed.</b> No page. That needs a narrow, tested action.' };
      if (!st.agents) return { ok: false, msg: `<b>${R.mins} minutes, ${R.find} of them on finding the cause by hand across five dashboards.</b>` };
      if (!R.f.ok) return { ok: false, msg: `<b>${R.mins} minutes: ${R.f.n.toLowerCase()} doesn't fix this one.</b> The cause is memory on one pod, so the narrow fix is a restart. The person at the gate catches that.` };
      return { ok: true, msg: `<b>${R.mins} minutes to recover: the agents found the memory spike in ${R.find}, and the person approved a restart.</b> Narrow action, easy to undo.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Paged at 3 a.m.', home: true, say: 'Checkout errors at a payments firm in Nairobi. By hand, half an hour goes on dashboards before anyone finds the cause.', act: m => m.set({ agents: false, two: true, split: false, gate: true, fix: 'restart', pred: false, wire: false }) },
    { t: 'Specialists', home: true, say: 'A supervisor sends agents to logs, metrics and runbooks. They find a memory spike on one model server in minutes.', act: m => m.set({ agents: true, two: true, split: false, gate: true, fix: 'restart', pred: false, wire: false }) },
    { t: 'Keep it narrow', home: true, say: 'A restart or a revert is small and easy to undo. Rebuilding a service is not, and an agent must never start that alone.', act: m => m.set({ agents: true, two: true, split: false, gate: false, fix: 'rewrite', pred: false, wire: false }) },
    { t: 'A second opinion', home: true, say: 'Two models analyse it separately. If they agree, go ahead. If they disagree, a person looks.', act: m => m.set({ agents: true, two: true, split: true, gate: true, fix: 'restart', pred: false, wire: false }) },
    { t: 'Prediction alone', home: true, say: 'A model saw this coming, but no one reads charts at 3 a.m. Prediction without action is a dashboard.', act: m => m.set({ agents: true, two: true, split: false, gate: true, fix: 'restart', pred: true, wire: false }) },
    { t: 'Wired to act', home: true, say: 'Wire the prediction to a pre-approved restart, and the page never comes.', act: m => m.set({ agents: true, two: true, split: false, gate: true, fix: 'restart', pred: true, wire: true }) },
  ],
  check: [
    { q: 'Why keep auto-remediation narrow?', options: ['Small actions are easy to undo', 'Big ones are slower', 'Agents can\'t restart pods'], answer: 0, why: 'Wider changes need a person.', hint: 'Try Let it re-architect alone.' },
    { q: 'What should happen when two models disagree?', options: ['A person looks', 'Take the cheaper one', 'Average them'], answer: 0, why: 'Disagreement signals real doubt.', hint: 'Switch on Unclear case.' },
    { q: 'What turns a prediction into value?', options: ['A wired, approved action', 'A prettier chart', 'A longer forecast'], answer: 0, why: 'Otherwise it is only a dashboard.', hint: 'Try Predict, then do nothing.' },
  ],
  terms: [
    ['SRE', 'Site reliability engineering.'],
    ['Runbook', 'Written steps for handling an incident.'],
    ['Auto-remediation', 'A fix applied without a person.'],
    ['Time to recover', 'How long an incident lasts.'],
    ['Adversarial evaluation', 'Two models checking each other.'],
    ['Predictive detection', 'Spotting failures before they happen.'],
  ],
  deeper: '<p><b>Runbooks as tools.</b> Well-kept runbooks are the best thing to give an agent. Poor ones produce confident nonsense.</p><p><b>Early detection.</b> The course cites research on spotting most failures early. The figure matters less than what you do with the warning.</p><p><b>Times here</b> are round minutes to show the shape.</p>',
  code: {
    title: 'Propose, check, approve',
    note: 'Adapted from the course\'s incident sketch (code/main.py).',
    text: `
SAFE_ACTIONS = {"restart_pod", "revert_deploy"}

def handle(alert):
    findings = parallel(log_agent, metric_agent, runbook_agent, alert)
    plan_a, plan_b = model_a(findings), model_b(findings)
    if plan_a.action != plan_b.action:
        return page_human(findings)
    if plan_a.action in SAFE_ACTIONS and approved_by_human(plan_a):
        return execute(plan_a)
    return page_human(findings)
`,
  },
};
