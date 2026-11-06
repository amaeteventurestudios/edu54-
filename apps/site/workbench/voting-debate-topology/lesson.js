// Voting and debate topology (phase 16, lesson 15): five agents at a Kigali clinic's triage desk hold a belief that the right answer is correct, from 0 to 1. Each round every agent averages itself with those
// it can hear. Topology, mixed models and a loud wrong voice decide what happens. The beliefs below are really iterated; towers show them and nothing is scripted.
const LINKS = {
  all: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]],
  ring: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
  star: [[0, 1], [0, 2], [0, 3], [0, 4]],
};
const MONO = [0.42, 0.44, 0.4, 0.43, 0.41], MIX = [0.82, 0.74, 0.3, 0.62, 0.36];
function run(o) {
  let v = (o.mix ? MIX : MONO).slice(); if (o.loud) v[0] = 0.05;
  const L = LINKS[o.top], hist = [v.slice()];
  for (let r = 0; r < o.r; r++) {
    v = v.map((x, i) => { if (o.loud && i === 0) return x; const near = L.filter(e => e.includes(i)).map(e => v[e[0] === i ? e[1] : e[0]]); return (x + near.reduce((a, b) => a + b, 0)) / (near.length + 1); });
    hist.push(v.slice());
  }
  const right = v.filter(x => x > 0.5).length;
  return { v, right, won: right >= 3, msgs: L.length * 2 * o.r, spread: Math.max(...v) - Math.min(...v) };
}

export default {
  slug: 'voting-debate-topology',
  title: 'Debate topology: who talks to whom',
  description: 'Five agents, three wiring plans. Mixed models and a loud wrong voice decide whether debate helps or hurts.',
  overview: '"Run five agents and vote" can do worse than one agent, and the failures aren\'t random. They follow structure. Who hears whom sets how fast beliefs merge. All-to-all merges quickly, for good or ill. A star makes one agent the hub, and a wrong hub drags the rest along. A ring keeps disagreement alive for longer. Heterogeneity matters most of all: copies of one model share its errors, so averaging them just confirms the error, while different models can correct one another. Here each agent\'s belief is really iterated round by round. Change the wiring and see what the group ends up believing.',
  keywords: ['debate topology', 'heterogeneous agents', 'self-consistency', 'multi-agent', 'consensus', 'ensemble'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.05, 0.85, 1.1], half: 1.05, wide: 5 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { top: 'ring', mix: true, loud: false, r: 3 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const base = P.cyl(1.25, 0.05, '#D8D2C4'); base.position.set(-0.75, 0, 0); S.add(base);
    const PT = i => { const a = i / 5 * Math.PI * 2 - Math.PI / 2; return V(-0.75 + Math.cos(a) * 0.9, 0.22, Math.sin(a) * 0.9); };
    const T = [0, 1, 2, 3, 4].map(i => { const t = add(P.tower(0.34, 0.34, GOOD)), p = PT(i); t.position.set(p.x, 0.05, p.z); t.userData.set({ cap: '' }); return t; });
    const rods = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) { const r = P.rod(PT(i), PT(j), 0.02, '#6B6E7E'); S.add(r); rods.push({ r, i, j }); }
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.12 })); lamp.position.set(1.35, 0, 0);
    const line = P.box(0.7, 0.03, 0.7, '#BFB8A8', { r: 0.03 }); line.position.set(1.9, 0, 0); S.add(line);
    const gauge = add(P.tower(0.4, 0.4, '#7B6FA8')); gauge.position.set(1.9, 0.03, 0); gauge.userData.set({ cap: '' });
    S.add(P.keep(-2.05, 2.35, 1.1, -1.25, 1.25));
    let R = null;
    function draw() {
      R = run(st);
      R.v.forEach((x, i) => T[i].userData.set({ h: Math.max(0.05, x * 1.05), color: x > 0.5 ? GOOD : BAD }));
      rods.forEach(({ r, i, j }) => { r.visible = LINKS[st.top].some(e => e[0] === i && e[1] === j); });
      lamp.userData.set({ color: R.won ? GOOD : BAD, on: true });
      gauge.userData.set({ h: Math.max(0.04, R.spread * 1.1) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const TK = ['all', 'ring', 'star'];
    const controls = [
      { type: 'buttons', label: 'Wiring', options: ['All to all', 'Ring', 'Star'], get: () => TK.indexOf(st.top), act: i => set({ top: TK[i] }) },
      { type: 'toggle', label: 'Mixed models, not copies', short: 'Mixed', get: () => st.mix, set: v => set({ mix: !!v }) },
      { type: 'toggle', label: 'One loud, wrong agent that never changes', short: 'Loud voice', get: () => st.loud, set: v => set({ loud: !!v }) },
      { type: 'slider', label: 'Rounds', min: 0, max: 6, step: 1, get: () => st.r, set: v => set({ r: v }) },
    ];
    const readouts = [
      { label: 'Agents who end up right', get: () => ({ v: `${R.right} of 5`, sub: R.won ? 'the vote is right' : 'the vote is wrong', good: R.won, bad: !R.won }) },
      { label: 'Disagreement left', get: () => ({ v: R.spread.toFixed(2), sub: 'spread of beliefs' }) },
      { label: 'Messages', get: () => ({ v: `${R.msgs}`, sub: 'read across the rounds' }) },
    ];
    const labels = [
      { name: 'b', t: 'Five beliefs', d: 'Tall and teal: leaning right', icon: 'target', atV: V(-2.0, 0.1, 0) },
      { name: 's', t: 'Disagreement left', d: 'Lamp: is the vote right?', icon: 'scale', atV: V(2.25, 0.1, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Five copies of one model', hint: 'the same blind spot', on: () => set({ ...D0, mix: false, top: 'all' }), off: reset },
      { label: 'A wrong hub in a star', hint: 'everyone hears one voice', on: () => set({ ...D0, top: 'star', loud: true }), off: reset },
      { label: 'Debate for too long', hint: 'a loud voice wins slowly', on: () => set({ ...D0, top: 'all', loud: true, r: 6 }), off: reset },
    ];
    function status() {
      if (!st.mix) return { ok: false, msg: `<b>${R.right} of 5 right, with beliefs merged at about ${R.v[1].toFixed(2)}.</b> Copies share an error, so talking only confirms it. Debate can't add what no agent has. Use different models or prompts.` };
      if (st.loud && !R.won) return { ok: false, msg: `<b>One agent who never changes pulled the group to ${R.right} of 5.</b> Averaging rewards the stubborn. ${st.top === 'star' ? 'As the hub, it reached everyone at once.' : 'Each extra round gave it more weight.'} Ask for reasons, and limit rounds.` };
      if (st.r === 0) return { ok: R.won, msg: `<b>No talk at all: a plain vote gives ${R.right} of 5.</b> Add rounds to see what the wiring does.` };
      return { ok: R.won, msg: `<b>${R.right} of 5 right after ${st.r} rounds, using ${R.msgs} messages.</b> ${st.top === 'ring' ? 'A ring merges slowly and keeps disagreement alive.' : st.top === 'all' ? 'All-to-all merges fastest and costs the most.' : 'A star is cheap, and depends on the hub.'}` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Five beliefs', home: true, say: 'Five agents at a clinic triage desk in Kigali each lean some way on a hard case. Tall teal towers lean right.', act: m => m.set({ top: 'ring', mix: true, loud: false, r: 0 }) },
    { t: 'Copies agree', home: true, say: 'Five copies of one model share a blind spot. Wire them all together and they merge, on the wrong side.', act: m => m.set({ top: 'all', mix: false, loud: false, r: 3 }) },
    { t: 'Mixed models', home: true, say: 'Use different models, and some start out right. Now talking can correct the others.', act: m => m.set({ top: 'all', mix: true, loud: false, r: 3 }) },
    { t: 'A hub', home: true, say: 'A star is cheap, as everyone hears one agent. If that agent is wrong and stubborn, the group follows.', act: m => m.set({ top: 'star', mix: true, loud: true, r: 3 }) },
    { t: 'A ring', home: true, say: 'In a ring, ideas spread slowly. Disagreement lasts longer, which gives good reasoning more time.', act: m => m.set({ top: 'ring', mix: true, loud: false, r: 3 }) },
    { t: 'Choose the wiring', home: true, say: 'Debate isn\'t always better. Mix your models, pick the wiring, and stop after a few rounds.', act: m => m.set({ top: 'ring', mix: true, loud: false, r: 2 }) },
  ],
  check: [
    { q: 'Why can five copies of one model fail together?', options: ['Their errors are correlated', 'They cost too much', 'They can\'t vote'], answer: 0, why: 'Averaging copies confirms the shared error.', hint: 'Try Five copies of one model.' },
    { q: 'What is the risk of a star?', options: ['A wrong hub reaches everyone', 'It needs many messages', 'It never ends'], answer: 0, why: 'Everyone hears one voice.', hint: 'Try A wrong hub in a star.' },
    { q: 'What does a ring preserve?', options: ['Disagreement, for longer', 'Tokens only', 'The hub'], answer: 0, why: 'Ideas spread neighbour by neighbour.', hint: 'Watch Disagreement left.' },
  ],
  terms: [
    ['Topology', 'Who hears whom.'],
    ['Heterogeneity', 'Using different models or prompts.'],
    ['Correlated errors', 'Mistakes shared by many agents.'],
    ['All-to-all', 'Everyone reads everyone.'],
    ['Star', 'Everyone talks through one hub.'],
    ['Steel-manning', 'Arguing the strongest form of the other view.'],
  ],
  deeper: '<p><b>A simplification.</b> Real agents don\'t average. They read arguments. This model shows how structure spreads influence, which is the main point of the research here.</p><p><b>Voting first.</b> Sample before you debate. Self-consistency is much cheaper and often enough.</p><p><b>A devil\'s advocate.</b> A voice asked to find flaws can help, if the group must answer it rather than average with it.</p>',
  code: {
    title: 'One round of influence',
    note: 'Our own sketch of the course\'s topology map (code/main.py).',
    text: `
def step(beliefs, links, stubborn=()):
    new = []
    for i, b in enumerate(beliefs):
        if i in stubborn:
            new.append(b)
            continue
        heard = [beliefs[j] for j in links[i]]
        new.append((b + sum(heard)) / (len(heard) + 1))
    return new
`,
  },
};
