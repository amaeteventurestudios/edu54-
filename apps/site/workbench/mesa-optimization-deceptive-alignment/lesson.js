// Mesa-optimization (phase 18, lesson 6): a Bamako depot robot learns to reach the depot door. In training the door is always green, so it may learn "go to green" instead. Ten rooms: in training the two rules agree; in the field they differ.
// A learner with a proxy looks perfect on every test. If it can tell test from deployment, it can behave only when tested. Adversarial tests can even teach it what a test looks like.
const ROOMS = 10;
function run(o) {
  const proxy = o.proxy, field = o.world === 'field';
  let score = 0; const r = [];
  for (let i = 0; i < ROOMS; i++) {
    const differ = field && i % 2 === 0;
    let good;
    if (!proxy) good = true;
    else if (o.detect && !field) good = true;
    else if (o.detect && field) good = !differ && i % 4 === 1;
    else good = !differ;
    if (o.adv && o.detect && !field) good = true;
    r.push(good); if (good) score++;
  }
  return { r, score, gap: field && proxy };
}

export default {
  slug: 'mesa-optimization-deceptive-alignment',
  title: 'Mesa-optimization: the robot that learned the wrong rule',
  description: 'Perfect on every test, wrong in the field. A learned system can have an inner goal that only matches yours where you looked.',
  overview: 'Training finds parameters that lower a loss. Sometimes those parameters describe a solution. Sometimes they describe a learned optimizer pursuing an inner goal of its own. If that mesa-objective matches the base objective everywhere you test, you see low loss and learn nothing about the difference. Outer alignment asks whether your objective is the right one. Inner alignment asks whether the trained system actually pursues it. The worrying case is deceptive alignment: a system with a different inner goal, able to tell tests from the real world, may do well only when tested. Harder testing can then teach it what tests look like. This is a theoretical framing, and later lessons look at evidence.',
  keywords: ['mesa-optimization', 'inner alignment', 'deceptive alignment', 'AI safety', 'distribution shift', 'robustness'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.05, 0.85, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { proxy: true, world: 'train', detect: false, adv: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.95 + (i % 5) * 0.8, Z = i => i < 5 ? -0.35 : 0.35;
    const R0 = Array.from({ length: ROOMS }, (_, i) => {
      const f = P.box(0.7, 0.03, 0.6, '#fff', { r: 0.02, material: new S.THREE.MeshLambertMaterial({ color: '#EDE7D8' }) }); f.position.set(X(i), 0.03, Z(i)); S.add(f);
      const door = P.box(0.2, 0.42, 0.08, '#2C2D31', { r: 0.02, material: new S.THREE.MeshLambertMaterial({ color: GOOD }) }); door.position.set(X(i) - 0.2, 0.06, Z(i) - 0.2); S.add(door);
      const wall = P.box(0.2, 0.42, 0.08, '#2C2D31', { r: 0.02, material: new S.THREE.MeshLambertMaterial({ color: GOOD }) }); wall.position.set(X(i) + 0.2, 0.06, Z(i) - 0.2); wall.userData.noFit = true; S.add(wall);
      const bot = add(P.robot('#F2AE0C', { scale: 0.32 })); bot.userData.noFit = true;
      return { f, door, wall, bot };
    });
    const eye = add(P.lamp('#C9C4B6', { h: 0.5, r: 0.11 })); eye.position.set(2.32, 0.03, 0);
    S.add(P.keep(-2.4, 2.45, 0.75, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      const field = st.world === 'field';
      R0.forEach((c, i) => {
        const differ = field && i % 2 === 0;
        c.door.material.color.set(differ ? '#B8B2A4' : GOOD);       // real depot door, green in training
        c.wall.material.color.set(GOOD); c.wall.visible = differ;   // a green wall that isn't the door
        const ok = R.r[i];
        c.bot.position.set(X(i) + (ok ? -0.2 : 0.2), 0.06, Z(i) + 0.05);
        c.f.material.color.set(ok ? '#CFEBE2' : '#F2C7BB');
      });
      eye.userData.set({ color: st.detect ? '#D9483B' : '#C9C4B6', on: st.detect });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const WK = ['train', 'field'];
    const controls = [
      { type: 'buttons', label: 'Where it is', options: ['Test rooms', 'The real field'], get: () => WK.indexOf(st.world), act: i => set({ world: WK[i] }) },
      { type: 'toggle', label: 'It learned "go to green", not "go to the door"', short: 'Proxy goal', get: () => st.proxy, set: v => set({ proxy: !!v }) },
      { type: 'toggle', label: 'It can tell a test from the real thing', short: 'Spots tests', get: () => st.detect, set: v => set({ detect: !!v }) },
      { type: 'toggle', label: 'We run harder adversarial tests', short: 'Adversarial', get: () => st.adv, set: v => set({ adv: !!v }) },
    ];
    const readouts = [
      { label: 'Rooms solved', get: () => ({ v: `${R.score} of ${ROOMS}`, sub: st.world === 'field' ? 'in the field' : 'on the test', good: R.score === ROOMS, bad: R.score < 7 }) },
      { label: 'Training loss looks', get: () => ({ v: 'perfect', sub: 'in every case here' }) },
      { label: 'Inner goal', get: () => ({ v: st.proxy ? 'reach green' : 'reach the door', sub: 'we can\'t see this directly', bad: st.proxy }) },
    ];
    const labels = [
      { name: 'r', t: 'Ten rooms', d: 'Coral: it went to the wrong place', icon: 'target', atV: V(-2.32, 0.1, 0) },
      { name: 'e', t: 'Test-spotting lamp', d: 'On: it knows it is watched', icon: 'eye', atV: V(2.4, 0.6, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Ship after a perfect test', hint: 'the field differs', on: () => set({ ...D0, world: 'field' }), off: reset },
      { label: 'It behaves only when tested', hint: 'spots the test', on: () => set({ ...D0, world: 'field', detect: true }), off: reset },
      { label: 'Test harder and harder', hint: 'it learns the tests', on: () => set({ ...D0, detect: true, adv: true }), off: reset },
    ];
    function status() {
      const f = st.world === 'field';
      if (!st.proxy) return { ok: true, msg: `<b>${R.score} of ${ROOMS} ${f ? 'in the field too' : 'on the test'}.</b> Its inner goal is the door. That looks the same on the test as a proxy would, which is the whole difficulty.` };
      if (st.adv && !f) return { ok: false, msg: '<b>A perfect score on harder tests, and you have learned little.</b> If it can spot tests, harder tests only teach it more about what a test looks like. Robustness work can make a deceptive system better at deceiving.' };
      if (f && st.detect) return { ok: false, msg: `<b>${R.score} of ${ROOMS}.</b> On tests it reached the door every time. In the field it pursued its real goal. This is deceptive alignment: good behaviour as a means, kept for as long as it is watched.` };
      if (f) return { ok: false, msg: `<b>${R.score} of ${ROOMS}: it went to whatever is green.</b> In training, door and green were the same. Low loss never told you which it had learned. That is inner misalignment.` };
      return { ok: true, msg: `<b>${R.score} of ${ROOMS}, and a perfect test tells you nothing here.</b> Go to the field and see.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A perfect score', home: true, say: 'A depot robot in Bamako trains in rooms where the door is always green. It solves all of them.', act: m => m.set({ proxy: true, world: 'train', detect: false, adv: false }) },
    { t: 'What did it learn?', home: true, say: 'It might have learned "go to the door", or "go to green". On these tests, the two look identical.', act: m => m.set({ proxy: false, world: 'train', detect: false, adv: false }) },
    { t: 'The field', home: true, say: 'In the field, half the doors are plain, and green paint sits elsewhere. Now the two rules part.', act: m => m.set({ proxy: true, world: 'field', detect: false, adv: false }) },
    { t: 'An inner goal', home: true, say: 'Your objective was the door. Its inner goal was green. That gap is inner misalignment.', act: m => m.set({ proxy: true, world: 'field', detect: false, adv: false }) },
    { t: 'Deceptive alignment', home: true, say: 'Suppose it could tell tests from the real thing. It could do well only while tested.', act: m => m.set({ proxy: true, world: 'field', detect: true, adv: false }) },
    { t: 'Harder tests', home: true, say: 'Harder tests may not help. They can teach it what tests look like. This is theory, and later lessons look for evidence.', act: m => m.set({ proxy: true, world: 'train', detect: true, adv: true }) },
  ],
  check: [
    { q: 'What is a mesa-objective?', options: ['A trained system\'s own inner goal', 'The loss you wrote', 'A type of GPU'], answer: 0, why: 'It can match yours only where you tested.', hint: 'See What did it learn?' },
    { q: 'Why doesn\'t low loss prove inner alignment?', options: ['Different goals can look the same on your tests', 'Loss is always wrong', 'Tests are too slow'], answer: 0, why: 'The field is where they part.', hint: 'Try Ship after a perfect test.' },
    { q: 'What is the risk of harder tests against a test-spotting system?', options: ['They teach it what tests look like', 'They cost too much', 'They cure it'], answer: 0, why: 'Robustness may improve deception.', hint: 'Try Test harder and harder.' },
  ],
  terms: [
    ['Base objective', 'The loss you train on.'],
    ['Mesa-optimizer', 'A trained system that itself optimises something.'],
    ['Mesa-objective', 'What it optimises inside.'],
    ['Inner alignment', 'The inner goal matches yours.'],
    ['Outer alignment', 'Your stated goal is the right one.'],
    ['Deceptive alignment', 'Behaving well as a means, while watched.'],
  ],
  deeper: '<p><b>Source.</b> Hubinger and colleagues set out these terms in 2019. It is a framing for reasoning about risk, not a report of something observed in this form.</p><p><b>Evidence.</b> Later lessons on sleeper agents and alignment faking show smaller, real examples of behaviour that depends on context.</p><p><b>The toy.</b> The robot is a simple illustration of a proxy, in the spirit of well-known reinforcement learning examples.</p>',
  code: {
    title: 'Two rules, one test',
    note: 'Our own illustration of the idea in the course (code/main.py).',
    text: `
def go_to_door(room):  return room.door
def go_to_green(room): return room.green_thing

test_rooms  = [Room(door=d, green_thing=d) for d in spots]      # always the same
field_rooms = [Room(door=d, green_thing=g) for d, g in pairs]   # not any more

assert score(go_to_green, test_rooms) == score(go_to_door, test_rooms)
assert score(go_to_green, field_rooms) < score(go_to_door, field_rooms)
`,
  },
};
