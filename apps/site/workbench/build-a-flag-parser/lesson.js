// Build it yourself: a command-line flag parser (after the Zig CLI tutorial). A real small parser reads an argument list for a Tamale weather tool: subcommand, flags, values, positionals, and the "--" stop. Tiles show how each word was classified; bad input gets an error and an exit code.
const SPEC = { '--city': 'value', '-c': 'value', '--days': 'value', '--metric': 'bool', '-m': 'bool', '--help': 'bool' };
const LINES = [
  ['forecast', '--city', 'Tamale', '--days', '3', '-m'],
  ['forecast', '--city=Tamale', '-m', 'notes.txt'],
  ['forecast', '--', '--city', 'is', 'text'],
  ['forecast', '--city'],
  ['forecast', '--cty', 'Tamale'],
  ['forecast', '--days', 'three'],
];
function parse(a, o) {
  const out = { flags: {}, pos: [], kinds: [], err: '', cmd: '' }; let i = 0;
  if (a[0] && !a[0].startsWith('-')) { out.cmd = a[0]; out.kinds.push('cmd'); i = 1; }
  let stop = false;
  for (; i < a.length; i++) {
    const w = a[i];
    if (stop) { out.pos.push(w); out.kinds.push('pos'); continue; }
    if (w === '--' && o.stop) { stop = true; out.kinds.push('stop'); continue; }
    if (w.startsWith('-')) {
      let [k, inl] = w.split('='); const t = SPEC[k];
      if (!t) { if (o.strict) { out.err = `unknown flag ${k}`; out.kinds.push('bad'); return out; } out.kinds.push('skip'); continue; }
      out.kinds.push('flag');
      if (t === 'bool') { out.flags[k] = true; continue; }
      if (inl === undefined) { inl = a[i + 1]; if (inl === undefined) { if (o.strict) { out.err = `${k} needs a value`; out.kinds[out.kinds.length - 1] = 'bad'; return out; } continue; } i++; out.kinds.push('val'); }
      if (k === '--days' && o.typed && !/^\d+$/.test(inl)) { out.err = `--days must be a number, got "${inl}"`; out.kinds[out.kinds.length - 1] = 'bad'; return out; }
      out.flags[k] = inl; continue;
    }
    out.pos.push(w); out.kinds.push('pos');
  }
  return out;
}
function run(o) { const a = LINES[o.i], r = parse(a, o); return { a, ...r, code: r.err ? 2 : 0 }; }

export default {
  slug: 'build-a-flag-parser',
  title: 'Build your own flag parser',
  description: 'Words on a command line become flags, values and files. Most of the craft lies in the bad input.',
  overview: 'A shell hands your program a flat list of words. It\'s your job to work out which are flags, which are values, and which are files. A small parser walks the list once. A word with a dash is a flag, looked up in a table that says if it takes a value. Values can follow, or join with an equals sign. A double dash means everything after it is plain text. Most of the craft is in bad input: an unknown flag, a missing value, a word where a number should be. Each gets a clear message and a non-zero exit code. This real parser reads six lines for a weather tool in Tamale.',
  keywords: ['CLI', 'argument parsing', 'flags', 'exit codes', 'Zig', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0], dir: [0.05, 0.9, 1.0], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { i: 0, strict: true, stop: true, typed: true }, st = { ...D0 };
    const C = { cmd: '#7B6FA8', flag: '#5B8DB8', val: '#F2AE0C', pos: '#1F9E89', stop: '#6E6A60', bad: '#B5462F', skip: '#E0DBCE' }, ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.75 + i * 0.66;
    const T = Array.from({ length: 6 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: C.pos }), b = P.box(0.54, 0.16, 0.7, '#fff', { r: 0.04, material: m }); b.position.set(X(i), 0.03, -0.1); S.add(b); return { b, m }; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); lamp.position.set(2.2, 0.03, -0.1);
    S.add(P.keep(-2.3, 2.45, 0.7, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach(({ b, m }, i) => { const k = R.kinds[i]; b.visible = !!k; if (k) { m.color.set(C[k]); b.scale.y = k === 'bad' ? 2.6 : 1; } }); lamp.userData.set({ color: R.code ? '#D9483B' : '#3E9B5F', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'Line', options: ['Plain', 'Equals', 'Double dash', 'Missing value', 'Typo', 'Not a number'], get: () => st.i, act: i => set({ i }) }, tg('strict', 'Refuse unknown flags', 'Strict'), tg('stop', 'Honour the double dash', 'Stop'), tg('typed', 'Check value types', 'Types')];
    const readouts = [
      { label: 'Command line', get: () => ({ v: R.a.join(' ') }) },
      { label: 'Flags, then files', get: () => ({ v: Object.keys(R.flags).map(k => `${k}${R.flags[k] === true ? '' : `=${R.flags[k]}`}`).join(' ') || 'no flags', sub: R.pos.join(' ') || 'no files' }) },
      { label: 'Exit code', get: () => ({ v: `${R.code}`, sub: R.err || 'ok', good: !R.code, bad: !!R.code }) },
    ];
    const labels = [
      { name: 'w', t: 'One tile per word', d: 'Blue flag, gold value, teal file', icon: 'code', atV: V(X(0) - 0.29, 0.12, -0.1) },
      { name: 'x', t: 'Exit code lamp', d: 'Red: not zero', icon: 'check', atV: V(2.4, 0.3, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'A typo, quietly skipped', hint: 'no error at all', on: () => set({ ...D0, i: 4, strict: false }), off: reset },
      { label: 'Ignore the double dash', hint: 'text read as flags', on: () => set({ ...D0, i: 2, stop: false }), off: reset },
      { label: 'Trust every value', hint: 'three days as text', on: () => set({ ...D0, i: 5, typed: false }), off: reset },
    ];
    function status() {
      if (!st.strict && R.kinds.includes('skip')) return { ok: false, msg: '<b>The typo was skipped, so the city is missing, and exit code is 0.</b> The tool runs with the wrong settings, and no one knows.' };
      if (!st.stop && st.i === 2) return { ok: false, msg: '<b>The double dash was read as a flag, and the line failed.</b> A file with a dash in its name could never reach the tool.' };
      if (!st.typed && st.i === 5) return { ok: false, msg: '<b>"three" got through as a number of days.</b> It will fail later, far from the mistake.' };
      if (R.err) return { ok: true, msg: `<b>${R.err}.</b> A clear message and exit code ${R.code}, so scripts can see it failed.` };
      return { ok: true, msg: `<b>${Object.keys(R.flags).length} flags and ${R.pos.length} files parsed.</b> One pass through the list, with one table of flags.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A flat list', home: true, say: 'A weather tool in Tamale receives a flat list of words, and nothing more.', act: m => m.set({ i: 0, strict: true, stop: true, typed: true }) },
    { t: 'One table', home: true, say: 'A table says which flags exist, and which take a value.', act: m => m.set({ i: 1, strict: true, stop: true, typed: true }) },
    { t: 'Double dash', home: true, say: 'A double dash means that everything after it is plain text.', act: m => m.set({ i: 2, strict: true, stop: true, typed: true }) },
    { t: 'Missing value', home: true, say: 'A flag at the end with no value gets a clear error.', act: m => m.set({ i: 3, strict: true, stop: true, typed: true }) },
    { t: 'A typo', home: true, say: 'Refuse unknown flags, or a typo silently changes what runs.', act: m => m.set({ i: 4, strict: true, stop: true, typed: true }) },
    { t: 'Exit codes', home: true, say: 'A non-zero exit tells a script that something went wrong.', act: m => m.set({ i: 5, strict: true, stop: true, typed: true }) },
  ],
  check: [
    { q: 'What does a double dash do?', options: ['Everything after it is plain text', 'Ends the program', 'Turns on debug'], answer: 0, why: 'It stops flag parsing.', hint: 'See Double dash.' },
    { q: 'Why refuse unknown flags?', options: ['A typo would silently change what runs', 'To save memory', 'For speed'], answer: 0, why: 'Failing loud is safer.', hint: 'Try A typo, quietly skipped.' },
    { q: 'Why exit non-zero on error?', options: ['Scripts can detect it', 'It is shorter', 'It clears memory'], answer: 0, why: 'A shell reads the code.', hint: 'See Exit codes.' },
  ],
  terms: [['Flag', 'A named option.'], ['Positional', 'A plain word, like a file.'], ['Exit code', 'A number returned to the shell.'], ['argv', 'The list of words.']],
  deeper: '<p><b>Real code.</b> The parser here runs live.</p><p><b>In Zig.</b> The tutorial handles memory by hand with an allocator, which this lesson leaves out.</p>',
  credit: 'Built from <a href="https://rebuild-x.github.io/docs/#/./zig/terminal/cli" target="_blank" rel="noopener">Build Your Own CLI App in Zig from Scratch</a> (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short parser, written for this lesson.',
  code: {
    title: 'One pass',
    note: 'Our own short version.',
    text: `
for (let i = 0; i < args.length; i++) {
  const w = args[i];
  if (w === "--") { files.push(...args.slice(i + 1)); break; }
  if (!w.startsWith("-")) { files.push(w); continue; }
  const kind = SPEC[w];
  if (!kind) fail("unknown flag " + w);
  flags[w] = kind === "bool" ? true : args[++i] ?? fail(w + " needs a value");
}
`,
  },
};
