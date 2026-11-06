// Build your own command-line tool: a small grep-like tool, find, searches an invented bus-tracking service's log for late arrivals and sits
// in a pipeline: find late trips.log | wc -l, followed by && notify. A well-behaved tool streams its input line by line, writes results to
// standard output and errors to standard error, and exits with a non-zero code when it fails, so pipes and scripts behave. The outcomes are
// computed from the rules below for a large log and for a missing file.
const LOG_MB = 1400, LINES = 9000000, MATCH = 41250, RAM_MB = 512;
function run(o) {
  const missing = o.input === 'missing';
  const mem = o.stream ? 0.064 : (missing ? 0 : LOG_MB);
  const oom = !missing && mem > RAM_MB;
  let stdout = 0, stderrLines = 0, exit = 0, count = null, notify = false;
  if (missing) {
    if (o.stderr) stderrLines = 1; else stdout = 1;
    exit = o.exitCode ? 2 : 0;
  } else if (oom) {
    stderrLines = 1; exit = 137;
  } else { stdout = MATCH; }
  count = oom ? 0 : stdout;
  notify = exit === 0;
  const right = missing ? !notify && count === 0 : !oom && count === MATCH && notify;
  return { missing, mem, oom, stdout, stderrLines, exit, count, notify, right };
}

export default {
  slug: 'build-a-cli-tool',
  title: 'Build your own command-line tool',
  description: 'A small search tool finds late buses in a log and feeds a pipeline. Stream the input, keep errors apart and exit honestly.',
  overview: 'Command-line tools are small programs that do one job and combine with others through pipes. Building one, in Rust, Zig, Python or anything else, is mostly about following a few conventions that let it work with everything else. It reads arguments: a pattern and a file, with --help for usage, and a clear message when something is missing. It reads input as a stream, a line or a buffer at a time, so it works on a file far larger than memory and starts producing output at once; reading the whole file first is simpler and fails on big inputs. It has two output channels. Standard output carries the results, which the next program in the pipe reads; standard error carries messages for the human, such as warnings, progress and errors, and goes to the terminal even when output is piped. Mixing them means an error message becomes data: a line counter downstream counts it as a match. And it reports success or failure through its exit code: zero means success, anything else means failure, often with different codes for different problems. Shell scripts depend on it: in find late trips.log && notify, the notice is sent only if find exits with zero, so a tool that always exits with zero makes every failure look like success. Good tools also handle a closed pipe quietly, respect NO_COLOR, and are tested by running them as a user would. This machine follows an invented bus-tracking service in Dar es Salaam that searches its arrivals log for late trips.',
  keywords: ['build your own CLI', 'command-line tool', 'stdout and stderr', 'exit codes', 'streaming input', 'Unix pipes', 'Rust CLI'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.4, 0.35, -0.25], dir: [0.05, 0.75, 1.2], half: 0.95, wide: 4.8 },
  credit: 'Built from <a href="https://rust-cli.github.io/book/index.html" target="_blank" rel="noopener">Command line apps in Rust</a> (MIT) and <a href="https://rebuild-x.github.io/docs/#/./zig/terminal/cli" target="_blank" rel="noopener">Build Your Own CLI App in Zig from Scratch</a> (MIT), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short search tool, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { input: 'big', stream: true, stderr: true, exitCode: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA', DOC = '#D9C9A8';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // the log: a tall stack of pages, or an empty pad when the file is missing
    const padM = own('#3A3D4A'), logPad = P.box(0.6, 0.04, 0.5, '#fff', { r: 0.03, material: padM }); logPad.position.set(-2.3, 0, -0.3); S.add(logPad);
    const log = P.stack(0.5, 0.4, 0.09, { max: 9 }); log.position.set(-2.3, 0.04, -0.3); S.add(log);
    // the tool, with its memory beside it: 512 MB of room
    const tool = P.robot('#4A6FA5', { scale: 0.95 }); tool.position.set(-1.2, 0, -0.3); S.add(tool);
    const ram = P.tank(0.36, 0.7, 0.36, '#7A4FB5'); ram.position.set(-0.6, 0.05, -0.95); S.add(ram);
    // pipes: input in, standard output on to the counter, standard error down to the person at the terminal
    const inP = P.pipe([V(-2.0, 0.45, -0.3), V(-1.6, 0.5, -0.3), V(-1.45, 0.35, -0.3)], DOC, { r: 0.035, n: 4 }); S.add(inP);
    const outP = P.pipe([V(-0.95, 0.35, -0.3), V(-0.5, 0.45, -0.3), V(-0.15, 0.3, -0.3)], GOOD, { r: 0.035, n: 5 }); S.add(outP);
    const errP = P.pipe([V(-1.2, 0.25, -0.1), V(-1.2, 0.3, 0.2), V(-1.2, 0.2, 0.45)], BAD, { r: 0.03, n: 3, pipe: '#E9B8A8' }); S.add(errP);
    const scrM = own('#2A2B33'), scr = P.box(0.55, 0.36, 0.08, '#fff', { r: 0.03, material: scrM }); scr.position.set(-1.2, 0, 0.6); S.add(scr);
    // the counter: its height is the count
    const wc = P.tower(0.4, 0.4, GOOD); wc.position.set(0.1, 0, -0.3); wc.userData.set({ cap: '' }); S.add(wc);
    const wcPad = P.box(0.52, 0.03, 0.52, '#3A3D4A', { r: 0.03 }); wcPad.position.set(0.1, 0, -0.3); S.add(wcPad);
    // && only lets the notice through on exit code 0
    const gate = P.gate(0.5, BAD, { h: 0.5 }); gate.position.set(0.85, 0, -0.3); S.add(gate);
    const bell = P.lamp(OFF, { h: 0.5, r: 0.14 }); bell.position.set(1.55, 0, -0.3); S.add(bell);
    S.add(P.keep(-2.65, 1.8, 1.05, -1.25, 0.75));
    let R = null;
    function draw() {
      R = run(st);
      log.userData.set({ n: R.missing ? 0 : 9, colors: Array(9).fill(DOC) });
      padM.color.set(R.missing ? BAD : '#3A3D4A');
      tool.userData.set({ color: R.oom ? BAD : '#4A6FA5', lamp: R.right ? GOOD : BAD, busy: !R.missing && !R.oom });
      ram.userData.set({ level: R.mem / RAM_MB, color: R.oom ? BAD : '#7A4FB5' });
      inP.visible = !R.missing;
      const errToOut = R.missing && !st.stderr;
      outP.visible = R.stdout > 0; outP.userData.set({ color: errToOut ? BAD : GOOD });
      errP.visible = R.stderrLines > 0; scrM.color.set(R.stderrLines > 0 ? '#5A2E2A' : '#2A2B33');
      wc.userData.set({ h: R.count === MATCH ? 0.85 : R.count > 0 ? 0.12 : 0.02, color: (R.missing ? R.count === 0 : R.count === MATCH) ? GOOD : BAD });
      gate.visible = !R.notify;
      bell.userData.set({ color: R.notify ? (R.right ? GOOD : BAD) : OFF, on: R.notify });
    }
    const tick = dt => { [tool, ram, inP, outP, errP, wc].forEach(o => o.userData.tick(dt)); gate.userData.tick(dt, true); };
    function isOk() { return st.stream && st.stderr && st.exitCode && R.right; }
    draw(); wc.userData.snap();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Stream the input line by line', short: 'Stream', get: () => st.stream, set: v => set({ stream: !!v }) },
      { type: 'toggle', label: 'Print errors to standard error', short: 'stderr', get: () => st.stderr, set: v => set({ stderr: !!v }) },
      { type: 'toggle', label: 'Exit non-zero on failure', short: 'Exit code', get: () => st.exitCode, set: v => set({ exitCode: !!v }) },
      { type: 'buttons', label: 'Input', options: ['The big log', 'A missing file'], get: () => st.input === 'missing' ? 1 : 0, act: i => set({ input: i ? 'missing' : 'big' }) },
    ];
    const readouts = [
      { label: 'Count', get: () => ({ v: R.count.toLocaleString('en'), sub: R.missing ? 'should be 0' : `true ${MATCH.toLocaleString('en')}`, good: R.missing ? R.count === 0 : R.count === MATCH, bad: R.missing ? R.count !== 0 : R.count !== MATCH }) },
      { label: 'Exit code', get: () => ({ v: `${R.exit}`, sub: R.exit ? 'failure' : 'success', good: R.right, bad: !R.right }) },
      { label: 'Memory', get: () => ({ v: st.input === 'missing' ? '—' : st.stream ? '64 KB' : `${LOG_MB} MB`, sub: `${RAM_MB} MB available`, good: !R.oom, bad: R.oom }) },
    ];
    const labels = [
      { name: 'm', t: 'The tool\'s memory', d: 'Spills over when it reads the whole log', icon: 'gauge', atV: V(-0.78, 0.5, -0.95) },
      { name: 'e', t: 'Standard error', d: 'Messages for people go down here', icon: 'eye', atV: V(-1.48, 0.2, 0.6) },
      { name: 'n', t: 'Count, then the notice', d: 'The gate shuts on a non-zero exit code', icon: 'target', atV: V(1.69, 0.35, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Read the whole file first', hint: 'out of memory', on: () => set({ ...D0, stream: false }), off: reset },
      { label: 'Print errors to stdout', hint: 'the error is counted', on: () => set({ ...D0, input: 'missing', stderr: false }), off: reset },
      { label: 'Always exit with zero', hint: 'failure looks like success', on: () => set({ ...D0, input: 'missing', exitCode: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.oom) return { ok: false, msg: `<b>Reading all ${LOG_MB} MB of the log into memory on a machine with ${RAM_MB} MB got the tool killed: the count is 0 and the notice never went.</b> Stream the input a line or a buffer at a time; memory stays at a few kilobytes whatever the file size.` };
      if (r.missing && !st.stderr) return { ok: false, msg: `<b>The error message went to standard output, so wc counted it as a match: the pipeline reports ${r.count} late trip from a file that does not exist.</b> Print messages for humans to standard error; keep standard output for results.` };
      if (r.missing && !st.exitCode) return { ok: false, msg: '<b>The file was missing, but the tool exited with 0, so the script took it as success and sent the notice anyway.</b> Exit with a non-zero code on any failure; scripts and && depend on it.' };
      if (!st.stream || !st.stderr || !st.exitCode) return { ok: false, msg: `<b>This run happens to work, but the tool ${!st.stream ? 'reads the whole file first' : !st.stderr ? 'prints errors to standard output' : 'always exits with zero'}: try it on ${!st.stream ? 'the big log' : 'a missing file'} and the pipeline goes wrong.</b> Follow all three conventions.` };
      return { ok: true, msg: r.missing ? '<b>The missing file is reported on standard error, so wc counts 0, and the tool exits with code 2, so the notice is not sent.</b> The failure is visible to the human and to the script.' : `<b>Streaming ${LINES.toLocaleString('en')} lines in a 64 KB buffer, the tool prints ${MATCH.toLocaleString('en')} matches to standard output, wc counts them, and exit code 0 lets the notice go.</b> Try a missing file to see the failure path.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One job, one tool', home: true, say: 'A small search tool finds late trips in a log. A pipe sends its results to a counter, then a notice.', act: m => m.set({ input: 'big', stream: true, stderr: true, exitCode: true }) },
    { t: 'Stream it', home: true, say: 'Read the whole file first and a big log runs the machine out of memory. Read it line by line.', act: m => m.set({ input: 'big', stream: false, stderr: true, exitCode: true }) },
    { t: 'Two channels', home: true, say: 'Results go to standard output. Messages for people go to standard error.', act: m => m.set({ input: 'missing', stream: true, stderr: true, exitCode: true }) },
    { t: 'Errors as data', home: true, say: 'Print the error to standard output and the counter counts it as a match.', act: m => m.set({ input: 'missing', stream: true, stderr: false, exitCode: true }) },
    { t: 'Exit codes', home: true, say: 'Zero means success. Exit with zero on failure, and the script sends the notice anyway.', act: m => m.set({ input: 'missing', stream: true, stderr: true, exitCode: false }) },
    { t: 'A good citizen', home: true, say: 'Stream, separate the channels, and exit honestly. The pipeline is right on every input.', act: m => m.set({ input: 'big', stream: true, stderr: true, exitCode: true }) },
  ],
  check: [
    { q: 'Where should error messages go?', options: ['Standard error', 'Standard output', 'A file only'], answer: 0, why: 'So they never become data in a pipe.', hint: 'Try Print errors to stdout.' },
    { q: 'What does exit code 0 mean?', options: ['Success', 'Failure', 'No output'], answer: 0, why: 'Scripts and && rely on it.', hint: 'Try Always exit with zero.' },
    { q: 'Why stream the input?', options: ['It works on files bigger than memory and starts at once', 'It is more accurate', 'It sorts the lines'], answer: 0, why: 'Memory stays small.', hint: 'Try Read the whole file first.' },
  ],
  terms: [
    ['Standard output', 'The channel for a program\'s results.'],
    ['Standard error', 'The channel for messages to the person running it.'],
    ['Pipe', 'Feeding one program\'s output into the next one\'s input.'],
    ['Exit code', 'A number a program returns: zero for success.'],
    ['Streaming', 'Processing input piece by piece instead of all at once.'],
    ['Argument', 'A word given to a program on the command line.'],
  ],
  deeper: '<p><b>Arguments.</b> Libraries such as clap in Rust or argparse in Python parse flags, print usage on --help and reject bad input with a clear message.</p><p><b>Broken pipes.</b> When the next program stops reading early, as head does, a good tool exits quietly instead of printing an error.</p><p><b>About this machine.</b> The bus service, log sizes and counts are invented for illustration.</p>',
  code: {
    title: 'A well-behaved search tool',
    note: 'Our own short version, written for this lesson.',
    text: `
import sys

def main(argv):
    if len(argv) != 3:
        print("usage: find PATTERN FILE", file=sys.stderr)
        return 2
    pattern, path = argv[1], argv[2]
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            for line in f:                         # streams, one line at a time
                if pattern in line:
                    sys.stdout.write(line)
    except FileNotFoundError:
        print(f"find: {path}: no such file", file=sys.stderr)
        return 2                                   # non-zero: failure
    except BrokenPipeError:
        return 0
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv))
`,
  },
};
