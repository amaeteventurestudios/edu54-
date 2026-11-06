// SRE and chaos engineering for AI services (phase 17, lessons 23 and 24): a Kigali mobile-money assistant runs five chaos experiments
// (provider outage, retry storm on 429s, a poison prompt that stalls the tokeniser, a KV-cache eviction storm, a GPU running out of memory).
// Each finds a weakness; an AI triage agent drafts a hypothesis from logs, metrics and runbooks, remediates only narrow, reversible things, and
// escalates when a second model disagrees. Prerequisites, a burn-rate guard, the remediation scope and the cross-check are toggled; findings,
// customer impact and time to diagnose are computed live.
const EXP = [
  { id: 'provider', name: 'provider outage', weak: 'no fallback provider', fix: 'fail over to provider B', narrow: true, sure: true },
  { id: 'retry', name: '429s from provider', weak: 'retries with no backoff: a retry storm', fix: 'enable backoff and a retry budget', narrow: true, sure: true },
  { id: 'poison', name: 'poison prompt', weak: 'a malformed prompt stalls tokenising 12 s', fix: 'cap input size, time out tokenising', narrow: false, sure: false },
  { id: 'evict', name: 'KV eviction storm', weak: 'cache thrash triples time to first token', fix: 'scale a replica', narrow: true, sure: false },
  { id: 'oom', name: 'GPU out of memory', weak: 'one long context crashes a replica', fix: 'restart the pod; cap context', narrow: true, sure: true },
];
function run(o) {
  const ready = o.prereq;
  const rows = EXP.map(e => {
    let impact = 0, action;
    if (!ready) impact = 1;
    else if (!o.guard) impact = 0.4;
    else impact = 0.05;
    if (!o.agent) action = 'paged a person; 30 min to diagnose';
    else if (o.broad) action = e.narrow ? `agent: ${e.fix}` : 'agent rewrote the tokeniser config in production';
    else if (!e.narrow) action = 'agent: hypothesis drafted, escalated to a person';
    else if (o.cross && !e.sure) action = 'models disagreed: escalated with both hypotheses';
    else if (!o.cross && !e.sure) action = e.id === 'evict' ? 'agent scaled the wrong pool: cause was a bad cache setting' : `agent: ${e.fix}`;
    else action = `agent: ${e.fix} (reversible)`;
    const bad = action.includes('rewrote') || action.includes('wrong');
    return { ...e, impact, action, bad };
  });
  const minutes = o.agent ? 6 : 30;
  return { rows, ready, minutes, harm: rows.filter(r => r.bad).length, cust: Math.round(rows.reduce((s, r) => s + r.impact, 0) * 2400) };
}

export default {
  slug: 'sre-chaos-for-ai',
  title: 'Chaos and incidents: breaking an AI service on purpose',
  description: 'A mobile-money assistant in Kigali runs five chaos experiments. Find each weakness, keep customers safe, and let the agent act only where it can undo it.',
  overview: 'Model services add failure modes unit tests never see: an upstream provider returns 429s and the gateway\'s retries become a storm; a malformed prompt stalls the tokeniser for seconds; a burst of long prompts thrashes the KV cache and time to first token triples; one very long context runs a GPU out of memory. Chaos engineering finds these before users do, by injecting them deliberately. It has prerequisites, and skipping any turns an experiment into a real incident: defined service-level indicators and objectives, observability (traces, metrics and logs), automated rollback, runbooks and someone on call. Run experiments with a safety plane: limit the blast radius, pause automatically when the error budget burns faster than about twice the expected rate, tag every induced error with its experiment so on-call can tell it from a natural failure, and feed each finding back into code, runbooks and objectives. When incidents happen, much of the first twenty minutes of investigation can be automated. A supervisor agent sends specialised agents through logs, metrics and runbooks, retrieves the relevant context, and drafts a hypothesis with evidence for a person to approve. Remediation must stay narrow: restart a pod, revert a deploy, fail over, scale within policy, all reversible. Re-architecting anything is a person\'s job. An adversarial check helps calibrate: when two models agree on the cause, act with more confidence; when they disagree, escalate with both hypotheses. And predictions without action are just dashboards: an early warning needs a runbook step that does something.',
  keywords: ['chaos engineering', 'SRE', 'incident response', 'AIOps', 'reliability', 'LLM operations', 'runbooks'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.3, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { prereq: true, guard: true, agent: true, broad: false, cross: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* five experiments in a row: a block for each, a tower of customers hit, and a lamp for what happened next */
    const X = i => -1.7 + i * 0.85;
    const rows = EXP.map((e, i) => {
      const b = P.box(0.46, 0.2, 0.34, ['#5B8DB8', '#7B6FA8', '#E07A5F', '#D9A441', '#8E91A3'][i], { r: 0.03 }); b.position.set(X(i), 0, -0.7); S.add(b);
      const t = P.tower(0.3, 0.3, BAD, { h: 0.1 }); t.userData.set({ cap: '' }); t.position.set(X(i), 0, -0.2); S.add(t);
      const l = P.lamp(GOOD, { h: 0.12, r: 0.09 }); l.position.set(X(i), 0, 0.3); S.add(l);
      return { t, l };
    });
    /* the responder: a person paged, or an agent on call */
    const agent = P.robot(GOOD, { scale: 0.56 }); agent.position.set(2.1, 0, 0.3); S.add(agent);
    const safety = P.lamp(GOOD, { h: 0.28, r: 0.1 }); safety.position.set(2.1, 0, -0.5); S.add(safety);
    S.add(P.keep(-2.0, 2.35, 0.95, -0.95, 0.55));
    const parts = [agent, ...rows.map(r => r.t)];

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => {
        rows[i].t.userData.set({ h: Math.max(0.04, r.impact * 0.9), color: r.impact > 0.3 ? BAD : SAF });
        rows[i].l.userData.set({ color: r.bad ? BAD : r.action.includes('escalat') ? BLUE : r.action.startsWith('agent') ? GOOD : OFF, on: true });
      });
      agent.userData.set({ color: !st.agent ? OFF : st.broad ? BAD : GOOD, busy: !!st.agent });
      safety.userData.set({ color: R.ready ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Prerequisites: objectives, observability, rollback, runbooks, on-call', short: 'Prerequisites', get: () => st.prereq, set: v => set({ prereq: !!v }) },
      { type: 'toggle', label: 'Burn-rate guard and a small blast radius', short: 'Guard', get: () => st.guard, set: v => set({ guard: !!v }) },
      { type: 'toggle', label: 'An AI triage agent drafts each diagnosis', short: 'Triage agent', get: () => st.agent, set: v => set({ agent: !!v }) },
      { type: 'toggle', label: 'Let the agent remediate anything', short: 'Broad remediation', get: () => st.broad, set: v => set({ broad: !!v }) },
      { type: 'toggle', label: 'A second model cross-checks the diagnosis', short: 'Cross-check', get: () => st.cross, set: v => set({ cross: !!v }) },
    ];
    const readouts = [
      { label: 'Customers affected', get: () => ({ v: R.cust.toLocaleString('en'), sub: 'sessions, five experiments', good: R.cust < 1000, bad: R.cust > 2000 }) },
      { label: 'Harmful actions', get: () => ({ v: String(R.harm), sub: 'by the agent', good: !R.harm, bad: R.harm > 0 }) },
      { label: 'Time to diagnose', get: () => ({ v: `${R.minutes} min`, sub: st.agent ? 'agent draft, person approves' : 'by hand', good: st.agent }) },
    ];
    const labels = [
      { name: 'exp', t: 'Five experiments', d: 'Tower: the customers each one hit', icon: 'target', atV: V(-1.97, 0.2, -0.7) },
      { name: 'act', t: 'What happened next', d: 'Teal fixed, blue escalated, red harm', icon: 'check', atV: V(1.72, 0.18, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Run chaos without the prerequisites', hint: 'no rollback or on-call', on: () => set({ ...D0, prereq: false, guard: false }), off: reset },
      { label: 'Let the agent remediate anything', hint: 'broad scope', on: () => set({ ...D0, broad: true }), off: reset },
      { label: 'Trust one model\'s diagnosis', hint: 'no cross-check', on: () => set({ ...D0, cross: false }), off: reset },
    ];
    function status() {
      if (!R.ready) return { ok: false, msg: `<b>With no rollback, runbooks or on-call, each experiment became a real incident: about ${R.cust.toLocaleString('en')} customer sessions affected.</b> Chaos needs its prerequisites first: objectives, observability, automated rollback, runbooks and someone to respond; then a burn-rate guard and a small blast radius.` };
      if (st.broad) return { ok: false, msg: '<b>Allowed to remediate anything, the agent "fixed" the poison-prompt stall by rewriting the tokeniser configuration in production, a change nobody reviewed.</b> Keep automatic remediation narrow and reversible: restart, revert, fail over, scale within policy. Anything bigger is a hypothesis for a person.' };
      if (!st.cross) return { ok: false, msg: '<b>Without a second opinion, the agent blamed the KV eviction storm on load and scaled the wrong pool; the real cause was a cache setting.</b> When two models agree, act with more confidence; when they disagree, escalate with both hypotheses and the evidence.' };
      if (!st.guard) return { ok: false, msg: `<b>With no burn-rate guard or blast-radius limit, experiments ran on far more traffic than needed: about ${R.cust.toLocaleString('en')} sessions affected.</b> Pause automatically when the error budget burns faster than about twice the expected rate, and tag induced errors.` };
      if (!st.agent) return { ok: true, msg: `<b>Every weakness found, with little customer impact, and a person diagnosed each one by hand in about ${R.minutes} minutes.</b> Safe, but slow at three in the morning; an agent can draft the first twenty minutes of investigation.` };
      return { ok: true, msg: '<b>Five weaknesses found with a small blast radius; the agent drafted each diagnosis in minutes, failed over, enabled backoff and restarted the pod itself, and escalated the tokeniser stall and the cache storm to a person.</b> Each finding goes back into code, runbooks and objectives.' };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Break it on purpose', home: true, say: 'A mobile-money assistant in Kigali injects five failures on purpose, to find weaknesses before customers do.', act: m => m.set({ prereq: true, guard: true, agent: false, broad: false, cross: true }) },
    { t: 'Prerequisites', home: true, say: 'Without rollback, runbooks and someone on call, an experiment is just an outage.', act: m => m.set({ prereq: false, guard: false, agent: false, broad: false, cross: true }) },
    { t: 'A safety plane', home: true, say: 'Limit the blast radius and pause automatically when the error budget burns too fast.', act: m => m.set({ prereq: true, guard: true, agent: false, broad: false, cross: true }) },
    { t: 'An agent triages', home: true, say: 'An agent reads logs, metrics and runbooks and drafts a diagnosis in minutes, for a person to approve.', act: m => m.set({ prereq: true, guard: true, agent: true, broad: false, cross: true }) },
    { t: 'Narrow fixes only', home: true, say: 'Let it fix anything and it rewrites production configuration. Keep it to restarts, reverts and failovers.', act: m => m.set({ prereq: true, guard: true, agent: true, broad: true, cross: true }) },
    { t: 'A second opinion', home: true, say: 'When two models disagree on the cause, escalate with both. One model alone scaled the wrong pool.', act: m => m.set({ prereq: true, guard: true, agent: true, broad: false, cross: true }) },
  ],
  check: [
    { q: 'What must exist before running chaos in production?', options: ['Objectives, observability, rollback, runbooks and on-call', 'Only a test plan', 'Nothing'], answer: 0, why: 'Otherwise chaos is a real incident.', hint: 'Try Run chaos without the prerequisites.' },
    { q: 'Which remediation may an agent take on its own?', options: ['Narrow, reversible ones like a pod restart', 'Rewriting configuration', 'Re-architecting'], answer: 0, why: 'Bigger changes need a person.', hint: 'Try Let the agent remediate anything.' },
    { q: 'Two models disagree on an incident\'s cause. What now?', options: ['Escalate with both hypotheses', 'Pick the more confident one', 'Do nothing'], answer: 0, why: 'Disagreement signals uncertainty.', hint: 'Try Trust one model\'s diagnosis.' },
  ],
  terms: [
    ['Chaos engineering', 'Injecting failures deliberately to find weaknesses.'],
    ['Blast radius', 'How much traffic an experiment can affect.'],
    ['Burn-rate guard', 'Pausing when the error budget burns too fast.'],
    ['Error budget', 'The failure allowed by a service-level objective.'],
    ['Triage agent', 'An agent that drafts a diagnosis from logs, metrics and runbooks.'],
    ['Narrow remediation', 'Small, reversible fixes an agent may take alone.'],
  ],
  deeper: '<p><b>Tag everything.</b> Experiment-induced errors carry a trace tag so on-call can tell them from natural failures, and suppression windows silence the expected alerts.</p><p><b>Predictions need actions.</b> Early detection of failures is only useful when a runbook step acts on it.</p><p><b>About this machine.</b> The five experiments, their weaknesses and the agent\'s behaviour are fixed rules; impact and outcomes are decided live.</p>',
  code: {
    title: 'A guarded experiment, a narrow agent',
    note: 'Adapted from the course\'s chaos and AI-SRE sketches.',
    text: `
def experiment(fault, target, budget):
    assert prerequisites_ok()                       # SLOs, observability, rollback, runbooks, on-call
    with inject(fault, target, share=0.02, tag="chaos-2026-10-29"):
        while running():
            if budget.burn_rate() > 2.0: return abort("burn rate")
    return findings()

SAFE = {"restart_pod", "revert_deploy", "failover_provider", "scale_within_policy"}

def respond(incident, agent, checker):
    h1, h2 = agent.diagnose(incident), checker.diagnose(incident)
    if h1.cause != h2.cause: return escalate(incident, [h1, h2])
    if h1.action in SAFE: return h1.execute()       # reversible
    return escalate(incident, [h1])                 # anything bigger: a person
`,
  },
};
