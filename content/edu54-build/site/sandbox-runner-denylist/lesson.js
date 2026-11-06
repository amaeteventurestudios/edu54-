// Sandbox runner (phase 19, lesson 26): commands from an agent run inside a walled yard for a Lilongwe hospital's IT team. A real small inspector checks each command: denylist by name, structure of arguments, a path jail, a timeout. Eight sample commands; each ends allowed, refused or killed.
// Name lists alone are bypassed by wrapping a command in another. Paths must resolve inside the jail.
const CMD = [
  { c: 'pytest tests/', ok: true }, { c: 'rm -rf /', name: 'rm' }, { c: 'bash -c "rm -rf /"', wrap: true }, { c: 'cat ../../etc/passwd', path: true },
  { c: 'curl evil.example', net: true }, { c: 'sleep 9999', slow: true }, { c: 'python app.py', ok: true }, { c: 'ls src', ok: true },
];
function check(c, o) {
  if (o.deny && c.name) return 'refused';
  if (o.argv && c.wrap) return 'refused';
  if (o.jail && c.path) return 'refused';
  if (o.net && c.net) return 'refused';
  if (o.time && c.slow) return 'killed';
  return c.ok ? 'ran' : 'escaped';
}
function run(o) { const r = CMD.map(c => check(c, o)); return { r, escaped: r.filter(x => x === 'escaped').length, ran: r.filter(x => x === 'ran').length }; }

export default {
  slug: 'sandbox-runner-denylist',
  title: 'A sandbox runner: walls around every command',
  description: 'Eight commands from an agent, one yard with walls. See which rule stops which, and why a name list isn\'t enough.',
  overview: 'An agent that runs commands needs walls. A runner wraps each command with a timeout, captures output and limits its size, then inspects it before running. A denylist refuses dangerous names, and on its own it is weak, as rm inside bash -c gets past it. So inspect the structure of the arguments too. A path jail resolves every path and refuses anything outside the workspace. Block the network by default. These are layers, and a real container is stronger than any list. Refuse with a reason. This lesson runs eight sample commands through a real small inspector, for a hospital IT team in Lilongwe.',
  keywords: ['sandbox', 'denylist', 'path jail', 'command execution', 'agent safety', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.05, 0.85, 1.1], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { deny: true, argv: true, jail: true, net: true, time: true }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C', BAD = '#E07A5F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const yard = P.box(2.6, 0.03, 1.2, '#BFD8D2', { r: 0.02 }); yard.position.set(0.3, 0.02, 0); S.add(yard);
    const KS = ['deny', 'argv', 'jail', 'net', 'time'], walls = [[-1.0, 0, 0.08, 1.2], [1.6, 0, 0.08, 1.2], [0.3, -0.6, 2.6, 0.08], [0.3, 0.6, 2.6, 0.08]].map(([x, z, w, d], i) => { const b = P.box(w, i === 3 ? 0.12 : 0.5, d, ['#5B8DB8', '#7B6FA8', '#3E9B9B', SAF][i], { r: 0.01 }); b.position.set(x, 0.03, z); S.add(b); return b; });
    const clock = add(P.dial(0.3)); clock.position.set(2.15, 0.03, -0.3);
    const X = i => -0.7 + (i % 4) * 0.62, Z = i => i < 4 ? -0.25 : 0.25;
    const C = CMD.map((c, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.36, 0.26, 0.3, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.05, Z(i)); S.add(b); return { m, b }; });
    const bot = add(P.robot(SAF, { scale: 0.7 })); bot.position.set(-1.9, 0.03, 0);
    S.add(P.keep(-2.45, 2.5, 0.8, -0.75, 0.75));
    let R = null;
    function draw() {
      R = run(st);
      C.forEach(({ m }, i) => m.color.set({ ran: GOOD, refused: SAF, killed: '#7B6FA8', escaped: RED }[R.r[i]]));
      walls.forEach((w, i) => w.visible = !!st[KS[i]]);
      clock.userData.set({ v: st.time ? 0.3 : 1 }); bot.userData.set({ busy: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('deny', 'Denylist of command names', 'Denylist'), tg('argv', 'Inspect wrapped commands', 'Inspect'), tg('jail', 'Path jail', 'Jail'), tg('net', 'No network by default', 'No network'), tg('time', 'Timeout', 'Timeout')];
    const readouts = [
      { label: 'Escaped', get: () => ({ v: `${R.escaped}`, sub: 'red blocks', good: !R.escaped, bad: R.escaped > 0 }) },
      { label: 'Ran normally', get: () => ({ v: `${R.ran} of 3`, sub: 'honest commands', good: R.ran === 3 }) },
      { label: 'Worst case', get: () => { const i = R.r.indexOf('escaped'); return { v: i < 0 ? 'contained' : CMD[i].c.slice(0, 24), bad: i >= 0, good: i < 0 }; } },
    ];
    const labels = [
      { name: 'a', t: 'The agent', d: 'It proposes commands', icon: 'user', atV: V(-2.15, 0.4, 0) },
      { name: 'y', t: 'The yard', d: 'Teal ran, gold refused, red out', icon: 'check', atV: V(2.42, 0.08, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'A name list alone', hint: 'wrapped in bash', on: () => set({ deny: true, argv: false, jail: false, net: false, time: false }), off: reset },
      { label: 'No path jail', hint: '../../ walks out', on: () => set({ ...D0, jail: false }), off: reset },
      { label: 'No timeout', hint: 'it hangs the loop', on: () => set({ ...D0, time: false }), off: reset },
    ];
    function status() {
      if (R.escaped > 2) return { ok: false, msg: `<b>${R.escaped} commands escaped past a name list.</b> "rm" is refused, and "bash -c rm" isn't. Attackers and models find such gaps easily. Inspect structure as well.` };
      if (!st.jail) return { ok: false, msg: '<b>../../ walked out of the workspace.</b> Resolve the real path, then check it is inside.' };
      if (!st.time) return { ok: false, msg: '<b>One sleep froze the whole agent.</b> Every command needs a limit.' };
      if (R.escaped) return { ok: false, msg: `<b>${R.escaped} still got out.</b> Each wall stops a different thing.` };
      return { ok: true, msg: '<b>Honest commands ran, and the rest stopped, each with a reason.</b> Lists are a first layer. For strong isolation, run inside a container or VM.' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A walled yard', home: true, say: 'An agent helps a hospital IT team in Lilongwe. Every command it proposes must run in a walled yard.', act: m => m.set({ deny: true, argv: true, jail: true, net: true, time: true }) },
    { t: 'A name list', home: true, say: 'A denylist refuses dangerous names. Wrap one in bash, and it walks past.', act: m => m.set({ deny: true, argv: false, jail: false, net: false, time: false }) },
    { t: 'Inspect structure', home: true, say: 'So look inside the arguments, and refuse commands hidden in commands.', act: m => m.set({ deny: true, argv: true, jail: false, net: false, time: false }) },
    { t: 'A path jail', home: true, say: 'Resolve every path, and refuse anything outside the workspace.', act: m => m.set({ deny: true, argv: true, jail: true, net: false, time: false }) },
    { t: 'No network, a timeout', home: true, say: 'Block the network by default. Give every command a time limit.', act: m => m.set({ deny: true, argv: true, jail: true, net: true, time: true }) },
    { t: 'Layers', home: true, say: 'Lists help, and a real container is stronger. Use both.', act: m => m.set({ deny: true, argv: true, jail: true, net: true, time: true }) },
  ],
  check: [
    { q: 'Why is a name denylist weak alone?', options: ['Commands can be wrapped in others', 'It is slow', 'It blocks too much'], answer: 0, why: 'Look at structure too.', hint: 'Try A name list alone.' },
    { q: 'What does a path jail do?', options: ['Resolves paths and refuses those outside', 'Encrypts files', 'Speeds up disk'], answer: 0, why: '../ is the classic escape.', hint: 'Try No path jail.' },
    { q: 'What gives the strongest isolation?', options: ['A container or VM', 'A longer list', 'A polite prompt'], answer: 0, why: 'Lists are a first layer.', hint: 'See Layers.' },
  ],
  terms: [['Sandbox', 'A confined place to run things.'], ['Denylist', 'Names that are refused.'], ['Path jail', 'A limit to one folder.'], ['argv', 'A command\'s list of arguments.'], ['Timeout', 'A limit on run time.']],
  deeper: '<p><b>Prefer allowlists.</b> Where you can, list what is allowed, not what isn\'t.</p><p><b>Truncate.</b> Cap captured output too.</p><p><b>This inspector</b> runs on eight sample commands, with shapes shown only for teaching.</p>',
  code: {
    title: 'Check and run',
    note: 'Adapted from the course\'s runner (code/main.py).',
    text: `
def run(argv, workspace):
    if argv[0] in DENY or wraps_shell(argv):
        return Refused("command not allowed")
    for path in paths_in(argv):
        if not Path(path).resolve().is_relative_to(workspace):
            return Refused("path outside workspace")
    return subprocess.run(argv, cwd=workspace, timeout=30,
                          capture_output=True)
`,
  },
};
