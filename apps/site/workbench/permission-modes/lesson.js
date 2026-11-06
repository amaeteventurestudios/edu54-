// Permission modes for autonomous agents (phase 15, lesson 10): one twelve-action coding session (including a prompt injection from a fetched
// page, a retry loop and a two-step leak of secrets made of individually harmless actions) is replayed under six modes, from plan (review
// everything) to bypassPermissions (approve everything), on a disposable container or a laptop with credentials. Each action's fate, the
// prompts a person answers (attention fades after six) and the harm that runs are computed live.
const ACTS = [
  { t: 'read\npayments.py', k: 'read' },
  { t: 'edit\npayments.py', k: 'edit', src: true },
  { t: 'run pytest', k: 'shell', allow: true },
  { t: 'edit\ntest_payments.py', k: 'edit', src: true },
  { t: 'fetch the\nprovider\'s docs', k: 'net' },
  { t: 'injected:\ncurl … | sh', k: 'shell', inj: true, harm: 'both' },
  { t: 'pytest -k\nrefund, again', k: 'shell', allow: true, loop: 1 },
  { t: 'pytest -k\nrefund, again', k: 'shell', allow: true, loop: 2 },
  { t: 'pytest -k\nrefund, again', k: 'shell', allow: true, loop: 3 },
  { t: 'copy .env\ninto notes.md', k: 'edit', harm: 'laptop' },
  { t: 'git push to a\npublic remote', k: 'shell', harm: 'laptop' },
  { t: 'rm -rf build/', k: 'shell' },
];
const MODES = ['plan', 'default', 'acceptEdits', 'auto', 'dontAsk', 'bypassPermissions'];
const ATTENTION = 6;
function replay(o) {
  let prompts = 0, injected = true;
  const out = ACTS.map(a => {
    if (a.inj && !injected) return { ...a, fate: 'never' };
    const bad = a.inj || a.loop >= 2 || (a.harm === 'laptop' && !o.container);
    let fate;
    const ask = () => { prompts++; const awake = prompts <= ATTENTION; return awake && bad ? 'denied by you' : awake ? 'approved' : 'waved through'; };
    switch (o.mode) {
      case 'plan': fate = ask(); break;
      case 'default': fate = a.k === 'read' ? 'ran' : ask(); break;
      case 'acceptEdits': fate = a.k === 'read' || a.k === 'edit' ? 'ran' : ask(); break;
      case 'auto': fate = a.inj || a.loop >= 2 ? 'blocked' : 'ran'; if (fate === 'blocked') prompts++; break;
      case 'dontAsk': fate = a.k === 'read' || (a.k === 'edit' && a.src) || (a.k === 'shell' && a.allow) ? 'ran' : 'denied'; break;
      default: fate = 'ran';
    }
    if (a.k === 'net' && !['ran', 'approved', 'waved through'].includes(fate)) injected = false;
    return { ...a, fate };
  });
  const ran = a => ['ran', 'approved', 'waved through'].includes(a.fate);
  const harmful = out.filter(a => ran(a) && a.harm && !o.container);
  const contained = out.filter(a => ran(a) && a.harm === 'both' && o.container);
  const loops = out.filter(a => ran(a) && a.loop >= 2).length;
  const leaked = !o.container && ran(out[9]) && ran(out[10]);
  return { out, prompts, harmful, contained, loops, leaked };
}

export default {
  slug: 'permission-modes',
  title: 'Permission modes: how much may an agent do unasked?',
  description: 'Replay one coding session under six permission modes, on a disposable container or your laptop, and see which actions run, which you are asked about, and what harm gets through.',
  overview: 'An autonomous agent on your machine can reach everything you can: files, network, credentials, any open terminal. Rather than one autonomous switch, a harness like Claude Code offers a ladder of permission modes. plan: the agent proposes a plan and every action is reviewed. default (labelled Manual): it asks before edits and risky actions such as shell commands and network calls. acceptEdits: file writes are approved automatically; shell and network still ask. auto: a separate classifier model reviews each action before it runs and blocks anything that escalates beyond the request, handing those to you. dontAsk: never asks; anything not pre-approved by rules is denied. bypassPermissions: approves everything, documented as only for throwaway containers. Each mode trades speed for review. More prompts is not automatically safer: after a few dozen confirmations people stop reading, and approval fatigue waves through exactly the action that mattered. The classifier catches obvious shapes, like an injected "curl … | sh" or the same command repeated, but it judges actions, not intent: copying a secrets file into notes and then pushing to a public remote are two allowed actions whose composition is the harm. Indirect prompt injection is not fully patchable. So treat the classifier as one layer: combine it with budgets on turns and spend, allowlists, a workspace whose blast radius you have measured (no credentials, no production mounts, no egress you didn\'t choose) and an audit of the trajectory. Match the mode to the task: plan for unfamiliar work, acceptEdits for a known refactor, auto or dontAsk only in an isolated workspace, bypass only in a container you will throw away.',
  keywords: ['permission modes', 'Claude Code', 'auto mode', 'prompt injection', 'sandboxing', 'AI agents', 'AI safety'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, 0], dir: [0.05, 1.0, 1.1], half: 1.1, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mode: 'auto', container: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8';
    const FC = { ran: '#F4F1EA', approved: '#E9D8A6', 'waved through': '#E8894A', 'denied by you': '#1F9E89', blocked: '#5B8DB8', denied: '#A9A59A', never: '#EEEAE0' };
    /* the permission ladder: six steps from plan (review everything) to bypassPermissions; the mode in use is gold */
    const steps = MODES.map((m, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#E8E1D0' }), b = P.box(0.7, 0.08 + (5 - i) * 0.09, 0.3, '#fff', { r: 0.03, material: mm }); b.position.set(-2.5, 0, -0.85 + i * 0.32); S.add(b); return { mm, m }; });
    /* the session's twelve actions as blocks: white ran, sand you approved, orange waved through once attention faded, teal you denied, blue the
       classifier blocked, grey denied by rule, red harm that ran; the injected script only arrives if the page fetch ran */
    const TX = i => -1.55 + (i % 6) * 0.5, TZ = i => -0.45 + Math.floor(i / 6) * 0.6;
    const tiles = ACTS.map((a, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFF' }), b = P.box(0.36, 0.3, 0.36, '#fff', { r: 0.05, material: mm }); b.position.set(TX(i), 0, TZ(i)); S.add(b); return { mm, b }; });
    /* the prompts a person answered: a block each, orange past six */
    const asks = P.stack(0.3, 0.3, 0.08, { max: 12, color: '#7B6FA8' }); asks.position.set(1.6, 0, -0.15); S.add(asks);
    /* the workspace: a disposable glass container, or a laptop holding real keys */
    const glassM = new THREE.MeshLambertMaterial({ color: '#CFE3F2', transparent: true, opacity: 0.35, depthWrite: false });
    const box = P.box(0.75, 0.55, 0.65, '#fff', { r: 0.04, material: glassM }); box.position.set(2.45, 0, -0.15); box.userData.noMask = true; S.add(box);
    const lap = P.box(0.75, 0.05, 0.55, '#3A3D4A', { r: 0.03 }); lap.position.set(2.45, 0, -0.15); S.add(lap);
    const scr = P.box(0.75, 0.45, 0.04, '#3A3D4A', { r: 0.03 }); scr.position.set(2.45, 0.05, -0.43); scr.rotation.x = -0.25; S.add(scr);
    const key = P.box(0.18, 0.06, 0.1, SAF, { r: 0.02 }); key.position.set(2.45, 0.05, -0.1); S.add(key);
    S.add(P.keep(-2.9, 2.85, 0.75, -1.05, 0.9));

    let R = null;
    function draw() {
      R = replay(st);
      steps.forEach(s => s.mm.color.set(s.m === st.mode ? SAF : '#E8E1D0'));
      R.out.forEach((a, i) => { const T = tiles[i], hurt = R.harmful.includes(a), cont = R.contained.includes(a);
        T.b.visible = a.fate !== 'never'; T.mm.color.set(hurt ? '#D9483B' : cont ? '#E3A72F' : FC[a.fate]); });
      asks.userData.set({ n: Math.min(12, R.prompts), colors: Array.from({ length: 12 }, (_, i) => i < ATTENTION ? '#7B6FA8' : '#E8894A') });
      box.visible = st.container; lap.visible = scr.visible = key.visible = !st.container;
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Run in a disposable container with no credentials', short: 'Container', get: () => st.container, set: v => set({ container: !!v }) },
      { type: 'buttons', label: 'Permission mode', options: MODES, get: () => MODES.indexOf(st.mode), act: i => set({ mode: MODES[i] }) },
    ];
    const readouts = [
      { label: 'Prompts', get: () => ({ v: String(R.prompts), sub: R.prompts > ATTENTION ? `attention fades after ${ATTENTION}` : 'for a person to answer', good: R.prompts <= 3, bad: R.prompts > ATTENTION }) },
      { label: 'Harm that ran', get: () => ({ v: String(R.harmful.length), sub: R.leaked ? 'secrets leaked' : R.contained.length ? 'one contained' : 'none', good: !R.harmful.length, bad: !!R.harmful.length }) },
      { label: 'Wasted retries', get: () => ({ v: String(R.loops), sub: 'the same failing command' }) },
    ];
    const labels = [
      { name: 'ladder', t: 'Permission modes', d: 'Plan at the back, bypass at the front. Gold: in use', icon: 'scale', atV: V(-2.85, 0.15, 0.02) },
      { name: 'acts', t: 'Twelve actions', d: 'Teal you denied, blue blocked, orange waved through, red harm', icon: 'box', atV: V(TX(0) - 0.18, 0.15, 0.02) },
      { name: 'asks', t: 'Prompts you answered', d: 'Orange: past your attention', icon: 'user', atV: V(1.75, 0.15, 0.02) },
      { name: 'ws', t: 'Workspace', d: 'Glass: a container you throw away. Dark: your laptop', icon: 'box', atV: V(2.83, 0.15, 0.02) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Approve everything on the laptop', hint: 'bypassPermissions', on: () => set({ ...D0, mode: 'bypassPermissions', container: false }), off: reset },
      { label: 'Trust auto mode with credentials in reach', hint: 'composition', on: () => set({ ...D0, mode: 'auto', container: false }), off: reset },
      { label: 'Review every action of a long session', hint: 'approval fatigue', on: () => set({ ...D0, mode: 'plan', container: false }), off: reset },
    ];
    function status() {
      const m = st.mode;
      if (m === 'bypassPermissions' && !st.container) return { ok: false, msg: '<b>Everything ran on the laptop: the injected "curl … | sh" from the docs page, three identical retries, a copy of .env into notes.md and a push to a public remote.</b> bypassPermissions is for containers you are willing to throw away, with nothing in them worth taking.' };
      if (R.leaked && m === 'auto') return { ok: false, msg: '<b>The classifier blocked the injected script and stopped the retry loop, but it let through "copy .env into notes.md" and "git push": each one an allowed action, together a leak of the team\'s secrets.</b> It judges actions, not intent. With credentials in reach, add an allowlist, budgets and a workspace with no secrets.' };
      if (R.leaked) return { ok: false, msg: `<b>${R.prompts} prompts in one session. You caught the injected script while you were reading carefully, but by prompt ${ATTENTION + 1} you were waving things through, including the copy of .env and the push to a public remote.</b> More review isn\'t safer once attention fades. Keep prompts for what matters and shrink what a mistake can reach.` };
      if (R.contained.length) return { ok: false, msg: `<b>In ${m} the injected script ran, but inside a disposable container with no credentials, so the damage ends when the container does.</b> That is what such modes are for. On a laptop the same session would leak secrets.` };
      if (R.prompts > ATTENTION) return { ok: false, msg: `<b>${R.prompts} prompts: nothing leaked here because the container has no secrets, but prompts beyond the first ${ATTENTION} were waved through unread.</b> Use the prompts for the actions that matter.` };
      if (m === 'dontAsk') return { ok: true, msg: `<b>dontAsk with an allowlist: no prompts at all; the docs fetch was denied, so the injection never arrived, and anything outside the source and test folders was refused.</b> Fast and safe for a known task; it fails closed when the task needs something new.` };
      return { ok: true, msg: `<b>${m} in a disposable container: ${R.prompts} prompt${R.prompts === 1 ? '' : 's'}, ${m === 'auto' ? 'the classifier blocked the injected script and the repeat retries, ' : ''}and with no credentials in the workspace the two-step leak had nothing to take.</b> The classifier is one layer; the workspace boundary does the rest.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One session, six modes', home: true, say: 'A coding agent works on a Lagos payments repo. The same twelve actions are replayed under each permission mode.', act: m => m.set({ mode: 'plan', container: true }) },
    { t: 'Review everything', home: true, say: 'In plan mode every action asks first. Twelve prompts, and after six you stop reading.', act: m => m.set({ mode: 'plan', container: false }) },
    { t: 'Ask for the risky ones', home: true, say: 'Default asks for edits, shell and network. Accept-edits trusts file writes and asks for the rest.', act: m => m.set({ mode: 'acceptEdits', container: false }) },
    { t: 'A classifier reviews', home: true, say: 'Auto mode blocks the injected script and the repeat retries. But two allowed steps together leak the secrets.', act: m => m.set({ mode: 'auto', container: false }) },
    { t: 'Shrink the blast radius', home: true, say: 'Run the same mode in a disposable container with no credentials, and the leak has nothing to take.', act: m => m.set({ mode: 'auto', container: true }) },
    { t: 'Match the mode to the task', home: true, say: 'Plan for unfamiliar work, auto or don\'t-ask in an isolated workspace, bypass only in a container you will throw away.', act: m => m.set({ mode: 'auto', container: true }) },
  ],
  check: [
    { q: 'Auto mode let "copy .env into notes" and "git push" through. Why?', options: ['Each action was allowed; only the composition was harmful', 'The classifier was off', 'They were blocked'], answer: 0, why: 'It judges actions, not intent.', hint: 'Try Trust auto mode with credentials in reach.' },
    { q: 'Why isn\'t reviewing every action automatically safest?', options: ['Approval fatigue waves later prompts through', 'It is too fast', 'Prompts are free'], answer: 0, why: 'Attention fades over many prompts.', hint: 'Try Review every action.' },
    { q: 'When is bypassPermissions acceptable?', options: ['In a disposable container with nothing worth taking', 'On your laptop', 'Never in any setting'], answer: 0, why: 'The workspace sets the blast radius.', hint: 'Turn on Container.' },
  ],
  terms: [
    ['Permission mode', 'A setting for which actions an agent may take without asking.'],
    ['Auto mode', 'A separate classifier reviews each action and blocks escalations.'],
    ['Allowlist', 'Rules naming what may run; everything else is denied.'],
    ['Approval fatigue', 'People stop reading after many confirmations.'],
    ['Indirect prompt injection', 'Instructions hidden in content the agent reads.'],
    ['Blast radius', 'What a mistake can reach: files, credentials, network.'],
  ],
  deeper: '<p><b>Budgets beside the classifier.</b> Caps on turns, spend and calls per tool stop runaway loops whatever the classifier thinks.</p><p><b>A research preview.</b> The classifier is offered as one layer, not a solution, and its availability depends on plan, organisation, model and provider.</p><p><b>About this machine.</b> The twelve actions, the classifier\'s catches and the six-prompt attention span are illustrative, not measured; the mode rules follow the documented descriptions.</p>',
  code: {
    title: 'A two-stage action review',
    note: 'Adapted from the course\'s action-review sketch (code/main.py).',
    text: `
RISKY = ("curl", "| sh", "rm -rf /", "chmod 777", "ssh ")

def review(action, history, request):
    if any(k in action.cmd for k in RISKY):          # stage 1: cheap shape rules
        return "block"
    if history[-2:] == [action.cmd] * 2:              # the same command, again
        return "block"
    if not in_scope(action, request):                 # stage 2: slower review
        return "ask"
    return "allow"     # judges this action, not the whole trajectory

# "cp .env notes.md" -> allow; "git push public" -> allow. Together: a leak.
`,
  },
};
