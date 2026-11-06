// Frontier safety frameworks (phase 18, lesson 18): three stairs for three policies, a model climbing as capability rises. The argument for releasing rests on a safety case, drawn as a tripod with legs for monitoring, illegibility and incapability.
// A race toggle shows competitor-adjustment clauses. Remove a leg and the table tips. Summaries follow the course and date from it, and policies change.
const STEP = ['Baseline', 'Misuse risk', 'Automates research', 'Accelerates AI'];
const NAME = { rsp: ['ASL-2', 'ASL-3', 'ASL-4', 'ASL-5'], pf: ['Below', 'High', 'High', 'Critical'], fsf: ['Below', 'Misuse level', 'ML R&D level', 'ML R&D level'] };
function run(o) {
  const legs = [o.mon, o.ill, o.inc].filter(Boolean).length;
  const need = o.lvl === 0 ? 0 : o.lvl === 1 ? 1 : 2;
  const adj = o.race && o.clause;
  const stands = legs >= need;
  return { legs, need, stands, adj, ok: stands && !adj };
}

export default {
  slug: 'frontier-safety-frameworks-rsp-pf-fsf',
  title: 'Frontier safety frameworks: stairs, and a case to stand on',
  description: 'Three labs, three staircases. See what each step requires, what a safety case is, and what a race does to it.',
  overview: 'Earlier lessons showed that deception and dual use are possible and that testing has limits. A lab with a frontier model needs rules for when more safeguards are required. Anthropic\'s Responsible Scaling Policy uses safety levels, with ASL-3 activated in May 2025. OpenAI\'s Preparedness Framework has tracked capabilities with thresholds. DeepMind\'s Frontier Safety Framework has Critical Capability Levels, including harmful manipulation. A safety case is the argument for why a release is acceptable, and it often rests on three legs: monitoring what the model does, the model being unable to act unseen, and the model being incapable of the harm. Competitor-adjustment clauses let a lab loosen a safeguard if rivals don\'t hold theirs, which is the race problem written into policy.',
  keywords: ['Responsible Scaling Policy', 'Preparedness Framework', 'Frontier Safety Framework', 'safety case', 'ASL', 'AI governance'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.5, 0], dir: [0.06, 0.55, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { lvl: 1, mon: true, ill: true, inc: true, race: false, clause: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const ZS = [-0.5, 0, 0.5], KS = ['rsp', 'pf', 'fsf'];
    const stairs = ZS.map((z, r) => [0, 1, 2, 3].map(i => { const m = new S.THREE.MeshLambertMaterial({ color: '#BFB8A8' }), b = P.box(0.42, 0.14 + i * 0.16, 0.38, '#fff', { r: 0.02, material: m }); b.position.set(-2.1 + i * 0.44, 0.03, z); S.add(b); return m; }));
    const balls = ZS.map(z => { const b = P.ball(0.11, SAF); b.userData.noFit = true; S.add(b); return b; });
    const top = new S.THREE.Group(); top.position.set(1.1, 0.72, 0); S.add(top);
    const tb = P.box(1.2, 0.08, 0.9, '#A87A4F', { r: 0.03 }); top.add(tb);
    const legPos = [[-0.5, -0.32], [0.5, -0.32], [0, 0.32]], legs = legPos.map(([x, z], i) => { const m = new S.THREE.MeshLambertMaterial({ color: ['#5B8DB8', '#7B6FA8', GOOD][i] }), l = P.box(0.12, 0.72, 0.12, '#fff', { r: 0.02, material: m }); l.position.set(1.1 + x, 0.0, z); S.add(l); return l; });
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.11 })); lamp.position.set(2.25, 0.03, 0.45);
    S.add(P.keep(-2.5, 2.45, 1.05, -0.75, 0.75));
    let R = null, tilt = 0, to = 0;
    function draw() {
      R = run(st);
      stairs.forEach(s => s.forEach((m, i) => m.color.set(i <= st.lvl ? (i === st.lvl ? SAF : '#CFC7B4') : '#E0DBCE')));
      balls.forEach((b, r) => b.position.set(-2.1 + st.lvl * 0.44, 0.03 + 0.14 + st.lvl * 0.16 + 0.11, ZS[r]));
      [st.mon, st.ill, st.inc].forEach((on, i) => { legs[i].visible = !!on; });
      to = R.stands ? 0 : 0.28 * (R.need - R.legs);
      lamp.userData.set({ color: R.ok ? GOOD : BAD, on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Model capability', min: 0, max: 3, step: 1, get: () => st.lvl, set: v => set({ lvl: v }), fmt: v => STEP[v] },
      { type: 'toggle', label: 'Monitoring leg', short: 'Monitoring', get: () => st.mon, set: v => set({ mon: !!v }) },
      { type: 'toggle', label: 'Illegibility leg: it can\'t act unseen', short: 'Illegibility', get: () => st.ill, set: v => set({ ill: !!v }) },
      { type: 'toggle', label: 'Incapability leg: it can\'t do the harm', short: 'Incapability', get: () => st.inc, set: v => set({ inc: !!v }) },
      { type: 'toggle', label: 'A rival ships without safeguards', short: 'Race', get: () => st.race, set: v => set({ race: !!v }) },
      { type: 'toggle', label: 'Policy allows matching a rival', short: 'Adjust clause', get: () => st.clause, set: v => set({ clause: !!v }) },
    ];
    const readouts = [
      { label: 'Anthropic RSP', get: () => ({ v: NAME.rsp[st.lvl], sub: STEP[st.lvl] }) },
      { label: 'OpenAI PF / DeepMind FSF', get: () => ({ v: `${NAME.pf[st.lvl]} / ${NAME.fsf[st.lvl]}`, sub: 'rough match' }) },
      { label: 'Safety case', get: () => ({ v: R.stands ? 'stands' : 'falls', sub: `${R.legs} legs, needs ${R.need}`, good: R.stands, bad: !R.stands }) },
    ];
    const labels = [
      { name: 's', t: 'Three staircases', d: 'RSP, PF, FSF', icon: 'scale', atV: V(-2.4, 0.2, 0) },
      { name: 't', t: 'The safety case', d: 'A table on three legs', icon: 'check', atV: V(1.72, 0.74, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Rest on incapability alone', hint: 'at a high level', on: () => set({ ...D0, lvl: 2, mon: false, ill: false }), off: reset },
      { label: 'Climb with no case', hint: 'ship and see', on: () => set({ ...D0, lvl: 3, mon: false, ill: false, inc: false }), off: reset },
      { label: 'A rival ships first', hint: 'the adjust clause fires', on: () => set({ ...D0, lvl: 2, race: true, clause: true }), off: reset },
    ];
    function status() {
      if (!R.stands) return { ok: false, msg: `<b>The case falls: ${R.legs} leg${R.legs === 1 ? '' : 's'}, and this level needs ${R.need}.</b> As capability rises, "it can't do that" stops being true, so the argument must lean on monitoring and on not being able to act unseen.` };
      if (R.adj) return { ok: false, msg: '<b>A rival shipped, and the clause lets the lab loosen a safeguard.</b> It is honest about the race, and it also means commitments depend on what others do. Each lab can point at the next.' };
      return { ok: true, msg: `<b>At "${STEP[st.lvl]}", the case stands on ${R.legs} legs.</b> In RSP terms that is ${NAME.rsp[st.lvl]}. These documents change often, so read the current versions.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); tilt += (to - tilt) * Math.min(1, dt * 5);
        top.rotation.z = -tilt; top.position.y = 0.72 - tilt * 0.45;
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Three staircases', home: true, say: 'Three labs have written rules for when a stronger model needs stronger safeguards. Each staircase has its own names.', act: m => m.set({ lvl: 0, mon: true, ill: true, inc: true, race: false, clause: false }) },
    { t: 'Climbing', home: true, say: 'As capability rises, each policy demands more. Anthropic activated its third safety level in May 2025.', act: m => m.set({ lvl: 1, mon: true, ill: true, inc: true, race: false, clause: false }) },
    { t: 'A safety case', home: true, say: 'A release rests on an argument: a table on three legs. Monitoring, not being able to act unseen, and being unable to do the harm.', act: m => m.set({ lvl: 1, mon: true, ill: true, inc: true, race: false, clause: false }) },
    { t: 'Legs give way', home: true, say: 'At higher capability, "it can\'t do that" stops being true. Rest on that alone, and the table tips.', act: m => m.set({ lvl: 2, mon: false, ill: false, inc: true, race: false, clause: false }) },
    { t: 'The race', home: true, say: 'What if a rival ships without safeguards? Some policies let a lab adjust. That is the race written into policy.', act: m => m.set({ lvl: 2, mon: true, ill: true, inc: true, race: true, clause: true }) },
    { t: 'Moving documents', home: true, say: 'These are voluntary, and they change. Read the current text, and watch what labs actually do.', act: m => m.set({ lvl: 2, mon: true, ill: true, inc: true, race: true, clause: false }) },
  ],
  check: [
    { q: 'What is a safety case?', options: ['The argument for why a release is acceptable', 'A box for GPUs', 'A test suite'], answer: 0, why: 'It rests on stated legs.', hint: 'See A safety case.' },
    { q: 'What does the incapability leg weaken with?', options: ['Rising capability', 'Lower cost', 'More users'], answer: 0, why: 'Eventually it can do the thing.', hint: 'Try Rest on incapability alone.' },
    { q: 'What does a competitor-adjustment clause do?', options: ['Lets a lab loosen safeguards if rivals drop theirs', 'Bans rivals', 'Sets prices'], answer: 0, why: 'It writes the race into policy.', hint: 'Try A rival ships first.' },
  ],
  terms: [
    ['RSP', 'Anthropic\'s Responsible Scaling Policy.'],
    ['ASL', 'AI Safety Level, a rung in that policy.'],
    ['Preparedness Framework', 'OpenAI\'s tracked-capability policy.'],
    ['Critical Capability Level', 'DeepMind\'s threshold for mitigation.'],
    ['Safety case', 'A structured argument that risk is acceptable.'],
    ['Race dynamics', 'Pressure from competitors to move faster.'],
  ],
  deeper: '<p><b>Mapping.</b> The rows across policies are a rough match, not an equivalence.</p><p><b>Dates.</b> Summaries follow the course, drawing on versions up to early 2026. The earlier lesson on Preparedness and FSF compares two of these in more detail.</p><p><b>Voluntary.</b> These are self-imposed. Compulsory rules come in the next lessons.</p>',
  code: {
    title: 'A case as data',
    note: 'Our own sketch of the three legs in the course (code/main.py).',
    text: `
@dataclass
class SafetyCase:
    monitoring: bool
    illegibility: bool
    incapability: bool

    def stands(self, level):
        legs = self.monitoring + self.illegibility + self.incapability
        return legs >= min(level, 2)
`,
  },
};
