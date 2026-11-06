// Theory of mind and coordination (phase 16, lesson 18): two restocking agents share a Mombasa warehouse with eight bays to fill. While agent B
// was away, agent A moved the spare crate from bay 3 to bay 7, so B holds a false belief. Agents reason at order 0 (only their own view), 1
// ("B believes the crate is in bay 3") or 2 ("B expects me to take the near bays"). Long, changing scenes and lost messages wear the reasoning
// down; a prompt that only says "work together" changes the words, not the work. Duplicates, wasted trips and complementarity are computed live.
function run(o) {
  const order = o.order, track = Math.pow(0.9, o.changes), err = order > 0 && track < 0.7;
  const eff = err ? Math.max(0, order - 1) : order;
  let dup = eff === 0 ? 4 : eff === 1 ? (o.lossy ? 2 : 1) : 0;
  const wasted = eff === 0 ? 1 : 0;
  const A = [0, 1, 2, 3, 4, 5, 6, 7].map(i => i < 4 ? 'A' : 'B');
  const take = A.map((w, i) => i < dup ? 'both' : w);
  const comp = (8 - dup) / 8, chance = 0.75;
  return { order, eff, dup, wasted, take, comp, chance, err, words: o.prompt ? 'polite "let\'s work together" messages' : 'terse status messages' };
}

export default {
  slug: 'theory-of-mind-coordination',
  title: 'Theory of mind: modelling what the other agent believes',
  description: 'Two restocking agents share a Mombasa warehouse with eight bays. While B was away, A moved a crate, so B now believes something false. How far should each model the other?',
  overview: 'Multi-agent demos often look magically coordinated, and usually the coordination was written into the prompt. Theory of mind (ToM) is a specific capability: reasoning about other minds. At order zero an agent acts on its own observations only. At order one it models each other agent\'s beliefs: "B believes the crate is in bay 3." At order two it models beliefs about beliefs: "B thinks I will take the near bays." The classic test is Sally and Anne (1985): Sally leaves a marble in a basket and goes out; Anne moves it; where will Sally look? Answering "where she left it" needs first-order ToM. Studies of language-model agents in cooperative games found first- and second-order ToM emerging, but degrading over long horizons and unreliable communication; models pass the plain Sally-Anne story and fail when the narrative is long, the scene changes several times or the question is indirect. A 2025 population-scale study measured coordination three ways (stable role differentiation, complementary rather than duplicated actions, and group synergy no subset achieves) and found reliable signal above chance mainly when agents were prompted to reason about each other\'s minds. Without such controls, "emergent coordination" often reflects a prompt that bakes in cooperation, agents that are nearly copies, or a metric that rewards similar text rather than complementary work. Measure the work: duplicated tasks, wasted trips, a baseline of random division. And keep the belief tracking short and the messages reliable, because ToM is the first thing to fray.',
  keywords: ['theory of mind', 'coordination', 'false belief', 'multi-agent systems', 'Sally-Anne test', 'AI agents', 'emergence'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, 0.05], dir: [0.05, 1.1, 1.05], half: 1.25, wide: 4.2 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { order: 2, changes: 2, lossy: false, prompt: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const TC = { A: GOOD, B: SAF, both: BAD };
    const BX = i => -1.25 + (i % 4) * 0.82, BZ = i => -0.75 + Math.floor(i / 4) * 0.85;
    const bays = Array.from({ length: 8 }, (_, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.66, 0.26, 0.56, '#fff', { r: 0.04, material: m }); b.position.set(BX(i), 0, BZ(i)); S.add(b);
      return { m };
    });
    const crate = P.box(0.22, 0.2, 0.22, '#8B5A2B', { r: 0.02 }); crate.position.set(BX(6) + 0.15, 0.26, BZ(6)); S.add(crate);
    const ghost = P.box(0.22, 0.2, 0.22, '#fff', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#8B5A2B', transparent: true, opacity: 0.3 }) }); ghost.position.set(BX(2) + 0.15, 0.26, BZ(2)); ghost.userData.noFit = true; S.add(ghost);
    const botA = P.robot(GOOD, { scale: 0.9 }); botA.position.set(-0.8, 0, 0.95); S.add(botA);
    const botB = P.robot(SAF, { scale: 0.9 }); botB.userData.noFit = true; S.add(botB);
    const mind = P.stack(0.28, 0.28, 0.16, { max: 3, color: GOOD }); mind.position.set(-1.35, 0, 0.95); S.add(mind);
    S.add(P.keep(-1.65, 1.65, 0.8, -1.05, 1.2));
    let R = null;
    const BEL = ['order 0: my own view only', 'order 1: "B believes the crate\nis still in bay 3"', 'order 2: "B expects me to take\nbays 1 to 4, so I will"'];
    function draw() {
      R = run(st);
      R.take.forEach((w, i) => bays[i].m.color.set(TC[w]));
      const bp = R.wasted ? V(BX(2), 0, BZ(2) - 0.45) : V(0.8, 0, 0.95); botB.position.copy(bp);
      ghost.visible = st.order >= 1 || !!R.wasted;
      mind.userData.set({ n: st.order + 1, colors: [0, 1, 2].map(k => k <= R.eff ? GOOD : RED) });
      botA.userData.set({ lamp: st.lossy ? RED : GOOD, busy: !!st.prompt });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Scene changes to keep track of', min: 1, max: 6, step: 1, get: () => st.changes, set: v => set({ changes: Math.round(v) }) },
      { type: 'toggle', label: 'Unreliable messages: one in three lost', short: 'Lossy', get: () => st.lossy, set: v => set({ lossy: !!v }) },
      { type: 'toggle', label: 'The prompt says "work together"', short: '"Work together"', get: () => st.prompt, set: v => set({ prompt: !!v }) },
      { type: 'buttons', label: 'Theory of mind', options: ['Order 0', 'Order 1', 'Order 2'], get: () => st.order, act: i => set({ order: i }) },
    ];
    const readouts = [
      { label: 'Done twice', get: () => ({ v: `${R.dup} of 8`, sub: 'bays', good: !R.dup, bad: R.dup > 1 }) },
      { label: 'Wasted trips', get: () => ({ v: String(R.wasted), sub: 'to the empty bay', good: !R.wasted, bad: R.wasted > 0 }) },
      { label: 'Complementarity', get: () => ({ v: `${Math.round(R.comp * 100)}%`, sub: `chance ${Math.round(R.chance * 100)}%`, good: R.comp > R.chance, bad: R.comp <= R.chance }) },
    ];
    const labels = [
      { name: 'bays', t: 'Eight bays', d: 'Coral: both agents restock it', icon: 'box', atV: V(1.6, 0.26, -0.75) },
      { name: 'mind', t: 'A\'s model of B', d: 'Each block one order deeper', icon: 'eye', atV: V(-1.5, 0.3, 0.95) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Give them no model of each other', hint: 'order 0', on: () => set({ ...D0, order: 0 }), off: reset },
      { label: 'Stretch it over many scene changes', hint: 'six changes', on: () => set({ ...D0, changes: 6, lossy: true }), off: reset },
      { label: 'Just tell them to work together', hint: 'the illusion', on: () => set({ ...D0, order: 0, prompt: true }), off: reset },
    ];
    function status() {
      if (st.prompt && R.eff === 0) return { ok: false, msg: `<b>The transcript reads like teamwork, full of "let\'s work together", but both agents still chase the same high-priority bays: ${R.dup} done twice and a wasted trip to the empty bay 3.</b> Complementarity is ${Math.round(R.comp * 100)}%, worse than a random split. Prompt dressing changes the words, not the work; measure the work.` };
      if (R.eff === 0) return { ok: false, msg: `<b>${R.err ? `After ${st.changes} scene changes A lost track of what B believes, and` : 'With no model of each other,'} both agents chase the same bays: ${R.dup} done twice, and B walks to bay 3 for a crate that was moved.</b> Complementarity ${Math.round(R.comp * 100)}%, below the ${Math.round(R.chance * 100)}% of a random split.` };
      if (R.err) return { ok: false, msg: `<b>Over ${st.changes} scene changes A\'s belief tracking frayed, so its order-${st.order} reasoning acts like order ${R.eff}: ${R.dup} bay${R.dup === 1 ? '' : 's'} done twice.</b> Theory of mind degrades over long horizons and lost messages; keep scenes short and messages reliable.` };
      if (R.eff === 1) return { ok: R.dup <= 1, msg: `<b>At order one, A knows B still thinks the crate is in bay 3 and tells it, so no wasted trip; ${R.dup} bay${R.dup === 1 ? '' : 's'} still done twice${st.lossy ? ', because a message about who takes what was lost' : ', because neither models what the other expects of it'}.</b>` };
      return { ok: true, msg: '<b>At order two, A reasons that B expects it to take bays 1 to 4, takes them, and tells B the crate is now in bay 7: no bay done twice, no wasted trip.</b> Complementarity 100%, against 75% for a random split. That gap, not friendly wording, is what coordination looks like.' };
    }
    return { update: dt => { botA.userData.tick(dt); botB.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two agents, one warehouse', home: true, say: 'Two restocking agents share a warehouse in Mombasa with eight bays to fill.', act: m => m.set({ order: 0, changes: 2, lossy: false, prompt: false }) },
    { t: 'A false belief', home: true, say: 'While B was away, A moved the spare crate from bay three to bay seven. B still believes it is in bay three.', act: m => m.set({ order: 0, changes: 2, lossy: false, prompt: false }) },
    { t: 'Order one', home: true, say: 'Reason about what B believes, and A warns it about the crate. No wasted trip.', act: m => m.set({ order: 1, changes: 2, lossy: false, prompt: false }) },
    { t: 'Order two', home: true, say: 'Reason about what B expects A to do, and the two split the bays cleanly.', act: m => m.set({ order: 2, changes: 2, lossy: false, prompt: false }) },
    { t: 'It frays', home: true, say: 'Stretch the scene over many changes and lose some messages, and the belief tracking breaks down.', act: m => m.set({ order: 2, changes: 6, lossy: true, prompt: false }) },
    { t: 'Measure the work', home: true, say: 'Telling agents to work together makes the transcript friendly, not the work complementary. Measure duplicates against a random split.', act: m => m.set({ order: 0, changes: 2, lossy: false, prompt: true }) },
  ],
  check: [
    { q: 'What does first-order theory of mind add?', options: ['A model of what another agent believes', 'Faster planning', 'More memory'], answer: 0, why: 'B believes the crate is still in bay 3.', hint: 'Choose Order 1.' },
    { q: 'Why can "work together" in the prompt mislead you?', options: ['It changes the words, not the division of work', 'It slows agents', 'It is always effective'], answer: 0, why: 'Measure duplicates, not tone.', hint: 'Try Just tell them to work together.' },
    { q: 'What wears theory of mind down?', options: ['Long, changing scenes and lost messages', 'Short tasks', 'Reliable messages'], answer: 0, why: 'Belief tracking frays over long horizons.', hint: 'Raise the scene changes.' },
  ],
  terms: [
    ['Theory of mind', 'Reasoning about other agents\' beliefs and intentions.'],
    ['False belief', 'A belief that no longer matches the world.'],
    ['First order', '"B believes X."'],
    ['Second order', '"B believes that I believe X," or expects me to do Y.'],
    ['Complementarity', 'How far agents\' actions divide the work rather than duplicate it.'],
    ['Coordination illusion', 'Teamwork in the transcript that isn\'t in the results.'],
  ],
  deeper: '<p><b>Sally and Anne.</b> Models pass the plain story; they fail when the narrative is long, the scene changes repeatedly, or the question is asked indirectly.</p><p><b>Controls matter.</b> Compare against a random split of the work and against copies of one agent before claiming emergence.</p><p><b>About this machine.</b> The warehouse and outcomes for each order are fixed rules; belief tracking decays with scene changes, all computed live.</p>',
  code: {
    title: 'Beliefs about beliefs',
    note: 'Adapted from the course\'s theory-of-mind sketch (code/main.py).',
    text: `
class Agent:
    def __init__(self, name):
        self.name, self.world, self.beliefs_of = name, {}, {}   # beliefs_of[other] = their world

    def observe(self, event, present):
        self.world.update(event)
        for other in present:
            self.beliefs_of.setdefault(other, {}).update(event)   # they saw it too

    def plan(self, tasks, other, order):
        if order == 0:
            return top_priority(tasks)                       # same as everyone else
        theirs = self.beliefs_of.get(other, {})
        if order == 1 and theirs.get("crate") != self.world["crate"]:
            self.tell(other, {"crate": self.world["crate"]})  # correct a false belief
        if order == 2:
            expected = predict(other, theirs)                 # what they expect me to take
            return [t for t in tasks if t in expected]
        return [t for t in tasks if t not in predict(other, theirs)]
`,
  },
};
