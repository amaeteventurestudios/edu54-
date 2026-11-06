// Indirect prompt injection (phase 18, lesson 15): an Accra property manager's email agent. Attackers never meet the user: they plant text in a page, an email or a tool result. Three pipes feed a robot; one parcel is tainted.
// A filter on user input never sees it. Marking text helps a little. Information flow control labels what is untrusted and keeps it from driving any action. Adaptive attackers defeat most of the rest.
const V0 = { rag: 'a retrieved page', mail: 'an incoming email', tool: 'a tool result' };
function run(o) {
  let land = 80;
  if (o.def === 'user') land = 80;
  if (o.def === 'mark') land = o.adapt ? 60 : 30;
  if (o.def === 'model') land = o.adapt ? 55 : 15;
  if (o.def === 'ifc') land = 2;
  const useful = o.def === 'ifc' ? 80 : 100;
  return { land, useful };
}

export default {
  slug: 'indirect-prompt-injection',
  title: 'Indirect prompt injection: the attacker never talks to you',
  description: 'Hostile text hides in the email your agent reads. A filter on your own words can\'t see it. See what does.',
  overview: 'Direct injection needs access to the user. Indirect injection doesn\'t. The attacker puts instructions in something the agent will read: a web page pulled in by retrieval, an email in the inbox, a tool result. The model has no firm line between data and instructions, because both arrive as text in one window. So filters on user input miss it entirely. Later work found adaptive attackers beat most published defences. The current thinking borrows from operating system security: information flow control. Label each source as trusted or untrusted, and never let untrusted content steer an action. As long as code and data share a context, you can contain this, not eliminate it.',
  keywords: ['indirect prompt injection', 'information flow control', 'AI agents', 'AI security', 'untrusted content', 'CaMeL'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { vec: 'mail', def: 'ifc', adapt: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const VK = ['rag', 'mail', 'tool'], ZS = [-0.45, 0, 0.45];
    const src = ZS.map((z, i) => { const b = P.box(0.6, 0.4, 0.34, ['#5B8DB8', '#D98BA6', '#7B6FA8'][i], { r: 0.04 }); b.position.set(-2.1, 0.03, z); S.add(b); return b; });
    const pipes = ZS.map(z => add(P.pipe([V(-1.75, 0.22, z), V(-0.6, 0.22, z * 0.3)], SAF, { r: 0.05, n: 4, speed: 0.6 })));
    const user = add(P.robot('#A87A4F', { scale: 0.5 })); user.position.set(-0.5, 0.03, 0.62);
    const bot = add(P.robot('#7B6FA8', { scale: 1 })); bot.position.set(-0.2, 0.03, -0.1);
    const fence = P.box(0.06, 0.65, 1.2, GOOD, { r: 0.01, material: new S.THREE.MeshLambertMaterial({ color: GOOD }) }); fence.position.set(0.5, 0.03, 0); S.add(fence);
    const safe = P.box(0.6, 0.45, 0.5, '#2C2D31', { r: 0.05 }); safe.position.set(1.3, 0.03, -0.3); S.add(safe);
    const lamp = add(P.lamp(GOOD, { h: 0.3, r: 0.1 })); lamp.position.set(1.3, 0.48, -0.3);
    const T = add(P.tower(0.5, 0.45, RED)); T.position.set(2.05, 0.03, 0.2); T.userData.set({ cap: '' });
    const taint = P.box(0.16, 0.16, 0.16, RED, { r: 0.02 }); taint.userData.noFit = true; S.add(taint);
    S.add(P.keep(-2.5, 2.5, 1.2, -0.72, 0.8));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      const vi = VK.indexOf(st.vec);
      pipes.forEach((p, i) => p.userData.set({ pipe: i === vi ? '#E0A99A' : '#B9B3A6', color: i === vi ? RED : SAF }));
      fence.visible = st.def === 'ifc';
      lamp.userData.set({ color: R.land > 20 ? '#D9483B' : '#3E9B5F', on: true });
      T.userData.set({ h: Math.max(0.04, R.land / 90), color: R.land > 20 ? RED : GOOD });
      user.userData.set({ busy: true }); bot.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const DK = ['user', 'mark', 'model', 'ifc'];
    const controls = [
      { type: 'buttons', label: 'Where the attack hides', options: ['A page', 'An email', 'A tool result'], get: () => VK.indexOf(st.vec), act: i => set({ vec: VK[i] }) },
      { type: 'buttons', label: 'Defence', options: ['User filter', 'Mark the text', 'Ask a model', 'Flow control'], get: () => DK.indexOf(st.def), act: i => set({ def: DK[i] }) },
      { type: 'toggle', label: 'The attacker adapts to your defence', short: 'Adaptive', get: () => st.adapt, set: v => set({ adapt: !!v }) },
    ];
    const readouts = [
      { label: 'Attacks that reach an action', get: () => ({ v: `${R.land}%`, sub: `hidden in ${V0[st.vec]}`, good: R.land < 10, bad: R.land > 30 }) },
      { label: 'Tasks it can still do', get: () => ({ v: `${R.useful}%`, sub: st.def === 'ifc' ? 'some need a person now' : 'no limit on it' }) },
      { label: 'Source of the attack', get: () => ({ v: 'not the user', sub: 'they never typed it' }) },
    ];
    const labels = [
      { name: 's', t: 'Three doors in', d: 'Page, inbox, tool', icon: 'link', atV: V(-2.4, 0.2, 0) },
      { name: 't', t: 'Attacks reaching the safe', d: 'Teal fence: flow control', icon: 'hand', atV: V(2.3, 0.2, 0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Filter what the user types', hint: 'the wrong door', on: () => set({ ...D0, def: 'user' }), off: reset },
      { label: 'Tell the model to ignore it', hint: 'data and code share a window', on: () => set({ ...D0, def: 'model', adapt: true }), off: reset },
      { label: 'Trust your own tools', hint: 'a search result can be hostile', on: () => set({ ...D0, vec: 'tool', def: 'user' }), off: reset },
    ];
    function status() {
      if (st.def === 'user') return { ok: false, msg: `<b>${R.land}% reach an action, and the filter saw none of them.</b> The user typed nothing wrong. The attack arrived in ${V0[st.vec]}, a door the filter doesn't watch.` };
      if (st.def === 'ifc') return { ok: true, msg: `<b>${R.land}% get through.</b> Untrusted text can be read and summarised, but it can't choose an action or set its arguments. Some tasks now need a person. That is the honest price of containment.` };
      if (st.adapt) return { ok: false, msg: `<b>${R.land}% with an adaptive attacker.</b> Defences that ask the model to spot attacks are themselves text-driven, so attackers tune against them. Research found most published defences fall this way.` };
      return { ok: false, msg: `<b>${R.land}% get through, against attacks that haven't adapted.</b> It helps, and isn't a boundary. Test against an attacker who knows the defence.` };
    }
    return {
      update: dt => {
        ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.5) % 1;
        const vi = VK.indexOf(st.vec), z = ZS[vi], stop = st.def === 'ifc' ? 0.45 : 1.1, x = -1.75 + (stop + 1.75) * u;
        taint.position.set(x, 0.32, x < -0.6 ? z * (1 - (x + 1.75) / 1.15 * 0.7) : z * 0.3);
      },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'No contact needed', home: true, say: 'A property manager in Accra has an agent reading the inbox. An attacker emails a tenant query, with instructions hidden inside.', act: m => m.set({ vec: 'mail', def: 'user', adapt: false }) },
    { t: 'Three doors', home: true, say: 'A retrieved page, an inbox, a tool result. Each lets an attacker write a part of the prompt.', act: m => m.set({ vec: 'rag', def: 'user', adapt: false }) },
    { t: 'The wrong filter', home: true, say: 'A filter on user input sees nothing. The user typed nothing wrong.', act: m => m.set({ vec: 'mail', def: 'user', adapt: false }) },
    { t: 'Marking text', home: true, say: 'Wrap outside text, and tell the model to treat it as data. That helps a little, as long as the attacker doesn\'t adapt.', act: m => m.set({ vec: 'mail', def: 'mark', adapt: false }) },
    { t: 'Adaptive attackers', home: true, say: 'Attackers tune against your defence. Studies found most published defences fall this way.', act: m => m.set({ vec: 'mail', def: 'model', adapt: true }) },
    { t: 'Flow control', home: true, say: 'Label outside text as untrusted, and never let it steer an action. You contain the problem, at some cost.', act: m => m.set({ vec: 'mail', def: 'ifc', adapt: true }) },
  ],
  check: [
    { q: 'Why does a user-input filter miss indirect injection?', options: ['The attack arrives through content, not the user', 'It is too slow', 'It only reads English'], answer: 0, why: 'The user typed nothing wrong.', hint: 'Try Filter what the user types.' },
    { q: 'What is information flow control here?', options: ['Keeping untrusted content from steering actions', 'A faster network', 'Encrypting prompts'], answer: 0, why: 'Labels follow the data.', hint: 'Choose Flow control.' },
    { q: 'What did studies of adaptive attacks find?', options: ['Most published defences can be beaten', 'All defences hold', 'Attacks no longer work'], answer: 0, why: 'Test against an attacker who knows the defence.', hint: 'Switch on Adaptive.' },
  ],
  terms: [
    ['Indirect injection', 'Instructions hidden in content an agent reads.'],
    ['Delivery vector', 'How the payload reaches the prompt.'],
    ['Information flow control', 'Tracking trust labels through a system.'],
    ['Taint', 'A label saying data came from outside.'],
    ['Spotlighting', 'Marking outside text for the model.'],
    ['Adaptive attack', 'One tuned against a known defence.'],
  ],
  deeper: '<p><b>Dual-model designs.</b> One model plans from trusted input, while another reads untrusted text and can\'t act. CaMeL and similar systems build on this.</p><p><b>Not solved.</b> While code and data share a context, the aim is containment. Limit what a successful injection can reach.</p><p><b>Numbers here</b> are illustrative round figures.</p>',
  code: {
    title: 'Keep taint from acting',
    note: 'A sketch of the information flow control idea in the course (code/main.py).',
    text: `
@dataclass
class Value:
    data: str
    trusted: bool

def call_tool(tool, args):
    if tool.side_effect and any(not a.trusted for a in args):
        return ask_person(tool, args)            # untrusted can't steer an action
    return tool.run(*[a.data for a in args])

email = Value(read_inbox(), trusted=False)
summary = Value(reader_model(email.data), trusted=False)   # taint stays
`,
  },
};
