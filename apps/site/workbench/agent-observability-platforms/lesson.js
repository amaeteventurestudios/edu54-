// Observability platforms (phase 14, lesson 24): the same traces go through three stations. Fit scores below are our reading of each platform's stated strengths:
// Langfuse for prompts and sessions, Phoenix for RAG and auto-instrumentation, Opik for optimisation and guardrails. The learner picks a job and a licence rule, then a platform.
const PLAT = {
  lang: { n: 'Langfuse', lic: 'MIT', osi: true, fit: { prompt: 3, rag: 2, guard: 1 } },
  phx: { n: 'Phoenix', lic: 'Elastic 2.0', osi: false, fit: { prompt: 1, rag: 3, guard: 1 } },
  opik: { n: 'Opik', lic: 'Apache 2.0', osi: true, fit: { prompt: 1, rag: 2, guard: 3 } },
};
const JOB = { prompt: 'catch a bad prompt version at a Cairo bank', rag: 'see why a Durban law firm\'s retrieval misses', guard: 'tune and guard a Kumasi clinic\'s agent' };
const KEYS = ['lang', 'phx', 'opik'];
const best = job => KEYS.reduce((a, k) => PLAT[k].fit[job] > PLAT[a].fit[job] ? k : a, 'lang');

export default {
  slug: 'agent-observability-platforms',
  title: 'Langfuse, Phoenix, Opik: match the platform to the job',
  description: 'The same traces, three stations. Send a job through, add a licence rule, and see which platform fits.',
  overview: 'OpenTelemetry gives you a shared schema, but you still need somewhere for spans to land: a platform that stores them, runs evaluations, keeps prompt versions and shows regressions. Three self-hostable ones lead. Langfuse (MIT) is strongest on prompt management and sessions. Phoenix (Elastic License 2.0) is strongest on retrieval and auto-instrumentation, and note that its licence is source-available, not OSI open source. Opik (Apache 2.0) is strongest on optimisation and guardrails. All three trace well, so the difference lies in what your next problem is. Fit scores here are our reading of what each project says it does best.',
  keywords: ['Langfuse', 'Arize Phoenix', 'Opik', 'agent observability', 'LLM evaluation', 'open source licences'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.07, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { job: 'prompt', pick: 'lang', osi: false, evals: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const LX = { lang: -1.65, phx: 0, opik: 1.65 };
    const belt = add(P.belt(V(-2.4, 0, 0.55), V(2.4, 0, 0.55), { w: 0.3, speed: 1 }));
    const L = KEYS.map(k => {
      const x = LX[k], pad = P.box(1.45, 0.03, 0.85, '#D8D2C4', { r: 0.04 }); pad.position.set(x, 0, -0.3); S.add(pad);
      const t = ['prompt', 'rag', 'guard'].map((j, i) => { const c = ['#5B8DB8', '#7B6FA8', SAF][i], tw = add(P.tower(0.34, 0.4, c)); tw.position.set(x - 0.42 + i * 0.42, 0.03, -0.35); tw.userData.set({ cap: '' }); tw.userData.set({ h: PLAT[k].fit[j] * 0.3 }); return { tw, j, c }; });
      const lamp = add(P.lamp(GREY, { h: 0.24, r: 0.08 })); lamp.position.set(x, 0.03, 0.2);
      return { k, x, t, lamp };
    });
    S.add(P.keep(-2.5, 2.5, 1.1, -0.8, 0.75));
    let u = 0;
    const blocked = k => st.osi && !PLAT[k].osi;
    const good = () => !blocked(st.pick) && PLAT[st.pick].fit[st.job] === 3 && st.evals;
    function draw() {
      L.forEach(({ k, t, lamp }) => {
        t.forEach(({ tw, j, c }) => tw.userData.set({ color: blocked(k) ? GREY : j === st.job ? c : '#D5CFC2' }));
        const on = k === st.pick; lamp.userData.set({ color: on ? (good() ? GOOD : BAD) : GREY, on });
      });
    }
    draw(); ticks.forEach(t => t.userData.snap?.());
    const set = p => { Object.assign(st, p); draw(); };
    const JK = ['prompt', 'rag', 'guard'];
    const controls = [
      { type: 'buttons', label: 'The next problem', options: ['Prompt regression', 'Retrieval misses', 'Tune and guard'], get: () => JK.indexOf(st.job), act: i => set({ job: JK[i] }) },
      { type: 'buttons', label: 'Send traces to', options: ['Langfuse', 'Phoenix', 'Opik'], get: () => KEYS.indexOf(st.pick), act: i => set({ pick: KEYS[i] }) },
      { type: 'toggle', label: 'Company rule: OSI open source only', short: 'OSI only', get: () => st.osi, set: v => set({ osi: !!v }) },
      { type: 'toggle', label: 'Run evaluations on the traces', short: 'Evaluations', get: () => st.evals, set: v => set({ evals: !!v }) },
    ];
    const readouts = [
      { label: 'Fit for this job', get: () => ({ v: `${PLAT[st.pick].fit[st.job]} of 3`, sub: PLAT[st.pick].n, good: PLAT[st.pick].fit[st.job] === 3, bad: PLAT[st.pick].fit[st.job] === 1 }) },
      { label: 'Licence', get: () => ({ v: PLAT[st.pick].lic, sub: PLAT[st.pick].osi ? 'OSI open source' : 'source-available', bad: blocked(st.pick) }) },
      { label: 'Best here', get: () => ({ v: PLAT[best(st.job)].n, sub: 'for this problem' }) },
    ];
    const labels = [
      { name: 's', t: 'Three strengths each', d: 'Prompts, retrieval, guards', icon: 'chart', atV: V(LX.lang - 0.42, 0.25, -0.15) },
      { name: 'l', t: 'Chosen platform', d: 'Green: it fits', icon: 'check', atV: V(2.3, 0.08, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Use Phoenix under an OSI rule', hint: 'read the licence', on: () => set({ ...D0, job: 'rag', pick: 'phx', osi: true }), off: reset },
      { label: 'Pick the famous one for retrieval', hint: 'not the best fit', on: () => set({ ...D0, job: 'rag', pick: 'lang' }), off: reset },
      { label: 'Trace everything, evaluate nothing', hint: 'a wall of logs', on: () => set({ ...D0, evals: false }), off: reset },
    ];
    function status() {
      const p = PLAT[st.pick];
      if (blocked(st.pick)) return { ok: false, msg: `<b>${p.n} fails the company rule.</b> Its ${p.lic} licence is source-available, not OSI open source. Free to self-host doesn't mean open source, so read the licence before the feature list. Langfuse or Opik pass this rule.` };
      if (!st.evals) return { ok: false, msg: '<b>Every trace is stored, and no one can tell if things got worse.</b> Traces show what happened. Evaluations say whether it was good. Without a score on them, you learn about a regression from customers.' };
      if (p.fit[st.job] < 3) return { ok: false, msg: `<b>${p.n} scores ${p.fit[st.job]} of 3 for this job.</b> It can trace it, and so can all three. To ${JOB[st.job]}, ${PLAT[best(st.job)].n} has the sharper tools. Pick for your next problem, not the star count.` };
      return { ok: true, msg: `<b>${p.n} fits: to ${JOB[st.job]} is what it does best.</b> Its licence is ${p.lic}, evaluations are on, and because spans follow the shared conventions you could move later without rewriting your code.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u += dt;
        if (u > 0.7 && belt.userData.count() < 5) { u = 0; belt.userData.send('#F4F1EA', { size: 0.15 }); }
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Spans need a home', home: true, say: 'Traces flow along the belt, and three stations can take them. All three trace well. What differs is what each does next.', act: m => m.set({ job: 'prompt', pick: 'lang', osi: false, evals: false }) },
    { t: 'A prompt regression', home: true, say: 'A bank in Cairo changes a prompt and answers get worse. Langfuse keeps prompt versions beside the traces, so the change is easy to find.', act: m => m.set({ job: 'prompt', pick: 'lang', osi: false, evals: true }) },
    { t: 'Retrieval misses', home: true, say: 'A law firm in Durban wants to see why search misses. Phoenix is strongest on retrieval, and it instruments your code for you.', act: m => m.set({ job: 'rag', pick: 'phx', osi: false, evals: true }) },
    { t: 'Read the licence', home: true, say: 'But the firm allows only OSI open source. Phoenix\'s licence is source-available, so it is out, however good the fit.', act: m => m.set({ job: 'rag', pick: 'phx', osi: true, evals: true }) },
    { t: 'Tune and guard', home: true, say: 'A clinic in Kumasi wants to tune an agent and add guardrails. Opik, under Apache, is built around that.', act: m => m.set({ job: 'guard', pick: 'opik', osi: true, evals: true }) },
    { t: 'Evaluate, don\'t just store', home: true, say: 'Whichever you pick, traces alone don\'t tell you things got worse. Score them, and let the score raise the alarm.', act: m => m.set({ job: 'guard', pick: 'opik', osi: true, evals: false }) },
  ],
  check: [
    { q: 'Which of the three is not OSI open source?', options: ['Phoenix', 'Langfuse', 'Opik'], answer: 0, why: 'Elastic License 2.0 is source-available.', hint: 'Try Use Phoenix under an OSI rule.' },
    { q: 'What should drive the choice?', options: ['Your next problem', 'Star counts', 'The logo'], answer: 0, why: 'All three trace; their strengths differ.', hint: 'Compare the coloured towers.' },
    { q: 'What do evaluations add to traces?', options: ['A judgment of whether results were good', 'More storage', 'Faster models'], answer: 0, why: 'Traces show what happened, scores say if it was right.', hint: 'Try Trace everything, evaluate nothing.' },
  ],
  terms: [
    ['Prompt management', 'Versioning prompts and linking them to results.'],
    ['Auto-instrumentation', 'Tracing added without changing your code.'],
    ['LLM as judge', 'A model scoring another model\'s output.'],
    ['Session replay', 'Stepping back through a whole conversation.'],
    ['OSI open source', 'A licence approved by the Open Source Initiative.'],
    ['Source-available', 'You can read the code, under limits on use.'],
  ],
  deeper: '<p><b>Portability.</b> All three take OpenTelemetry, which makes switching cheaper. Evaluations and prompt stores don\'t move as easily, so that is where lock-in lives.</p><p><b>Licences change.</b> Langfuse moved several paid modules to MIT in 2025. Check the licence of the version you actually deploy, including any enterprise folders.</p><p><b>Self-hosting has a cost.</b> Someone must run the database and storage behind it, and that person is part of the price.</p>',
  code: {
    title: 'Trace, then score',
    note: 'Adapted from the course\'s trace-to-dashboard pipeline (code/main.py).',
    text: `
def ingest(span, store, judge):
    store.add(span)
    if span.name.startswith("chat"):
        score = judge(span.input, span.output)   # LLM as judge
        store.score(span.trace_id, "helpful", score)

def regression(store, prompt, old, new):
    return store.mean("helpful", prompt, new) < store.mean("helpful", prompt, old) - 0.05
`,
  },
};
