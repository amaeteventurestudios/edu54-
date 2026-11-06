// Benchmarks (phase 14, lesson 20): the same generalist agent goes through three stages, WebArena, VisualWebArena and OSWorld. Published figures are used for WebArena and OSWorld at
// release; the picture-task figure is marked as illustrative. The learner picks the benchmark for a job, and how success is judged. The comparison itself is the machine.
const B = {
  web: { n: 'WebArena', human: 78.24, agent: 14.41, kind: 'web' },
  vis: { n: 'VisualWebArena', human: 80, agent: 16, kind: 'img' },
  os: { n: 'OSWorld', human: 72.36, agent: 12.24, kind: 'os' },
};
const JOBS = { web: 'a Lagos shop checkout', img: 'picking the right photo on a market site', os: 'a Windows payroll app in Gaborone' };
function score(k, o) { const b = B[k]; return { human: b.human, agent: o.judge === 'claim' ? Math.min(92, b.agent * 4.2) : o.live ? b.agent * 0.6 : b.agent }; }

export default {
  slug: 'benchmarks-webarena-osworld',
  title: 'WebArena and OSWorld: choose the test that fits the job',
  description: 'One agent, three test tracks. Send it through, and see why a high score from the wrong test proves nothing.',
  overview: 'Can a general agent click through a real checkout, or set up a real computer? WebArena gives it 812 long tasks on four self-hosted web apps, and checks the result by asking the app: was the order placed? OSWorld gives it 369 tasks on real desktops, with only a 1920 by 1080 screenshot, a mouse and a keyboard. At release the best models scored about 14% and 12%, where people scored 78% and 72%. Two ideas matter more than the scores. Evaluate by execution, not by what the agent claims. And pin the environment, because a live site changes under you. A score only says something about the job its test resembles.',
  keywords: ['WebArena', 'OSWorld', 'agent benchmarks', 'execution-based evaluation', 'computer use', 'AI agents'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.07, 0.62, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { job: 'web', pick: 'web', judge: 'exec', live: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', CHAR = '#2C2D31', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const LX = { web: -1.65, vis: 0, os: 1.65 }, KEYS = ['web', 'vis', 'os'];
    const lanes = KEYS.map(k => {
      const x = LX[k], base = P.box(1.45, 0.03, 1.4, '#D8D2C4', { r: 0.04 }); base.position.set(x, 0, 0); S.add(base);
      const hu = add(P.tower(0.34, 0.34, SAF)), ag = add(P.tower(0.34, 0.34, GOOD));
      hu.position.set(x - 0.24, 0.03, -0.25); ag.position.set(x + 0.24, 0.03, -0.25); hu.userData.set({ cap: '' }); ag.userData.set({ cap: '' });
      const gate = add(P.lamp(GREY, { h: 0.34, r: 0.09 })); gate.position.set(x, 0.03, 0.45);
      return { k, x, hu, ag, gate };
    });
    const bot = add(P.robot('#5B8DB8', { scale: 0.62 })); bot.userData.noFit = true;
    S.add(P.keep(-2.45, 2.45, 1.05, -0.75, 0.75));
    let u = 0, cur = null;
    function draw() {
      lanes.forEach(L => {
        const s = score(L.k, st), on = st.pick === L.k, fit = B[L.k].kind === st.job;
        L.hu.userData.set({ h: s.human / 100 });
        L.ag.userData.set({ h: Math.max(0.03, s.agent / 100), color: st.judge === 'claim' ? BAD : GOOD });
        L.gate.userData.set({ color: on ? (fit ? GOOD : BAD) : GREY, on });
      });
      cur = score(st.pick, st);
    }
    draw(); ticks.forEach(t => t.userData.snap?.());
    const set = p => { Object.assign(st, p); draw(); };
    const JK = ['web', 'img', 'os'], PK = ['web', 'vis', 'os'], GK = ['exec', 'claim'];
    const controls = [
      { type: 'buttons', label: 'The job you are hiring for', options: ['Shop checkout', 'Picture tasks', 'Desktop app'], get: () => JK.indexOf(st.job), act: i => set({ job: JK[i] }) },
      { type: 'buttons', label: 'Send it through', options: ['WebArena', 'VisualWebArena', 'OSWorld'], get: () => PK.indexOf(st.pick), act: i => set({ pick: PK[i] }) },
      { type: 'buttons', label: 'Judge success by', options: ['Checking the app', 'The agent\'s claim'], get: () => GK.indexOf(st.judge), act: i => set({ judge: GK[i] }) },
      { type: 'toggle', label: 'Test on live websites, not pinned copies', short: 'Live sites', get: () => st.live, set: v => set({ live: !!v }) },
    ];
    const readouts = [
      { label: 'Agent score', get: () => ({ v: `${cur.agent.toFixed(1)}%`, sub: B[st.pick].n, bad: st.judge === 'claim' }) },
      { label: 'People on the same tasks', get: () => ({ v: `${cur.human.toFixed(1)}%`, sub: st.pick === 'vis' ? 'illustrative' : 'at release' }) },
      { label: 'Fits this job', get: () => ({ v: B[st.pick].kind === st.job ? 'yes' : 'no', sub: JOBS[st.job], good: B[st.pick].kind === st.job, bad: B[st.pick].kind !== st.job }) },
    ];
    const labels = [
      { name: 'h', t: 'Gold: people', d: 'Teal: the agent', icon: 'chart', atV: V(LX.web - 0.24, 0.3, -0.08) },
      { name: 'o', t: 'Three test tracks', d: 'Web, pictures, desktop', icon: 'target', atV: V(LX.os + 0.24, 0.1, -0.08) },
      { name: 'g', t: 'Selected track', d: 'Green: it fits the job', icon: 'check', atV: V(LX.vis, 0.5, 0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Test a desktop job on the web', hint: 'the wrong track', on: () => set({ ...D0, job: 'os', pick: 'web' }), off: reset },
      { label: 'Trust the agent\'s claim', hint: 'it says it finished', on: () => set({ ...D0, judge: 'claim' }), off: reset },
      { label: 'Run on live sites', hint: 'nothing stays still', on: () => set({ ...D0, live: true }), off: reset },
    ];
    function status() {
      const b = B[st.pick];
      if (st.judge === 'claim') return { ok: false, msg: `<b>${cur.agent.toFixed(0)}%, and most of that is the agent saying "done".</b> An agent that loses its way often reports success anyway. Ask the app instead: was the order placed, is the file there? That is execution-based evaluation.` };
      if (st.live) return { ok: false, msg: `<b>The score fell to ${cur.agent.toFixed(1)}% and you can't say why.</b> Live pages change layout, stock and prices, so failures mix agent mistakes with moved buttons. Pinned, self-hosted apps keep a score comparable from month to month.` };
      if (b.kind !== st.job) return { ok: false, msg: `<b>${b.n} says nothing about ${JOBS[st.job]}.</b> A strong result on one track doesn't carry over. Desktop work adds pixel-level finding and knowing where settings live. Test on the track that looks like the job.` };
      return { ok: true, msg: `<b>${b.n} fits ${JOBS[st.job]}: ${cur.agent.toFixed(1)}% against ${cur.human.toFixed(1)}% for people.</b> Results were checked in the app itself, on a pinned environment. ${st.pick === 'os' ? 'The gap comes from finding things on screen and knowing which menu holds them.' : 'Long tasks punish one bad click.'}` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.4) % 1;
        const x = LX[st.pick]; bot.position.set(x, 0.03, 0.65 - u * 0.5);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Can it really click?', home: true, say: 'A shop in Lagos wants an agent to finish checkouts. WebArena tests that, with long tasks on four self-hosted apps.', act: m => m.set({ job: 'web', pick: 'web', judge: 'exec', live: false }) },
    { t: 'Check the app', home: true, say: 'Success means the order exists. The test asks the app, not the agent. Trust the agent\'s word instead, and the tower soars.', act: m => m.set({ job: 'web', pick: 'web', judge: 'claim', live: false }) },
    { t: 'Pin the world', home: true, say: 'Test on live sites, and pages shift under you. Pinned copies keep scores comparable.', act: m => m.set({ job: 'web', pick: 'web', judge: 'exec', live: true }) },
    { t: 'A real desktop', home: true, say: 'A payroll app in Gaborone runs on a desktop. OSWorld gives the agent only a screenshot, a mouse and a keyboard.', act: m => m.set({ job: 'os', pick: 'os', judge: 'exec', live: false }) },
    { t: 'Why it\'s hard', home: true, say: 'Agents fail in two ways: finding the button in the pixels, and knowing which menu holds the setting.', act: m => m.set({ job: 'os', pick: 'os', judge: 'exec', live: false }) },
    { t: 'The wrong track', home: true, say: 'A good web score says nothing about desktop work. Choose the track that looks like the job.', act: m => m.set({ job: 'os', pick: 'web', judge: 'exec', live: false }) },
  ],
  check: [
    { q: 'What does execution-based evaluation check?', options: ['The real state of the app', 'What the agent reports', 'How long the reply is'], answer: 0, why: 'Was the order placed? Ask the app.', hint: 'Try Trust the agent\'s claim.' },
    { q: 'Why self-host the test apps?', options: ['Pinned apps keep results reproducible', 'They look better', 'Models prefer them'], answer: 0, why: 'A live site changes under the test.', hint: 'Try Run on live sites.' },
    { q: 'What are OSWorld\'s two main failure types?', options: ['GUI grounding and operational knowledge', 'Spelling and maths', 'Cost and speed'], answer: 0, why: 'Finding the element in pixels, and knowing where things live.', hint: 'See Why it\'s hard.' },
  ],
  terms: [
    ['WebArena', '812 long tasks on four self-hosted web apps.'],
    ['OSWorld', '369 tasks on real desktops, by screenshot, mouse and keyboard.'],
    ['Execution-based evaluation', 'Scoring by the real end state.'],
    ['GUI grounding', 'Mapping pixels to the right element on screen.'],
    ['Operational knowledge', 'Knowing which menu or shortcut does a thing.'],
    ['Pinned environment', 'A fixed copy, so results can be compared.'],
  ],
  deeper: '<p><b>Numbers date quickly.</b> The figures shown are from release: 14.41% against 78.24% for WebArena, 12.24% against 72.36% for OSWorld. The VisualWebArena figures here are round numbers for illustration. Models have moved on, so read current results and how they were run.</p><p><b>Extensions.</b> VisualWebArena adds image-dependent tasks, and TheAgentCompany adds terminals and code. OSWorld-G isolates grounding, and OSWorld-Human records how efficiently people do the same tasks.</p>',
  code: {
    title: 'Score by end state',
    note: 'Adapted from the course\'s evaluator sketch (code/main.py).',
    text: `
def evaluate(task, env):
    run_agent(task.prompt, env)                  # ignore what it says
    state = env.query(task.check)                # ask the app
    return state == task.expected

task = Task(prompt="Order two 5 kg bags of rice",
            check="SELECT count(*) FROM orders WHERE sku='rice-5' AND qty=2",
            expected=1)
`,
  },
};
