// Build it yourself: an interrupt table (after The little book about OS development, code public domain; our own words). A Port Louis till's keyboard driver. A real 256-slot table maps interrupt numbers to handlers; the keyboard chip sends a scan code; a handler must acknowledge the chip, or no more interrupts arrive.
const MAP = { 0x1e: 'a', 0x30: 'b', 0x2e: 'c', 0x20: 'd', 0x12: 'e' };
const KEYS = [0x1e, 0x9e, 0x30, 0xb0, 0x2e, 0xae, 0x12, 0x92];
function run(o) {
  const log = []; let typed = '', blocked = false, fault = '', got = 0;
  KEYS.forEach(c => {
    if (blocked) { log.push('lost'); return; }
    if (!o.loaded) { fault = 'no table'; log.push('fault'); return; }
    if (!o.remap) { log.push('fault'); fault = 'clash'; return; }
    if (!o.handler) { fault = 'no handler'; log.push('fault'); return; }
    got++;
    if (c & 0x80) { if (!o.release) typed += '?'; log.push('up'); } else { typed += MAP[c] || '?'; log.push('down'); }
    if (!o.ack) blocked = true;
  });
  return { log, typed, fault, got, blocked };
}

export default {
  slug: 'build-an-interrupt-table',
  title: 'Build your own interrupt table',
  description: 'A key is pressed, a chip raises a line, and a table says which code runs.',
  overview: 'A kernel doesn\'t poll the keyboard. When a key is pressed, a chip raises an interrupt, and the processor looks up a number in a table of 256 entries. Each entry points at a handler. So the kernel fills that table and loads its address. On a PC, the chip\'s default numbers clash with the processor\'s own faults, so you remap them first. The handler reads a scan code, turns it into a letter, and tells the chip it\'s finished. Forget that, and no more interrupts arrive. Key releases also send codes, which must be skipped. This real model types on a till in Port Louis.',
  keywords: ['operating system', 'interrupts', 'IDT', 'keyboard driver', 'PIC', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0], dir: [0.05, 0.9, 1.0], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { loaded: true, remap: true, handler: true, ack: true, release: true }, st = { ...D0 };
    const C = { down: '#1F9E89', up: '#BFD9D3', fault: '#B5462F', lost: '#E0DBCE' }, ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.95 + i * 0.5;
    const T = KEYS.map((k, i) => { const m = new S.THREE.MeshLambertMaterial({ color: C.down }), b = P.box(0.4, 0.14, 0.7, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, -0.05); S.add(b); return { b, m }; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); lamp.position.set(2.1, 0.03, -0.05);
    S.add(P.keep(-2.3, 2.3, 0.7, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach(({ b, m }, i) => { const k = R.log[i]; m.color.set(C[k]); b.scale.y = k === 'down' ? 2.4 : k === 'fault' ? 3 : 1; }); lamp.userData.set({ color: R.fault || R.blocked ? '#D9483B' : '#3E9B5F', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('loaded', 'Load the table', 'Load'), tg('remap', 'Remap the chip', 'Remap'), tg('handler', 'Fill in a handler', 'Handler'), tg('ack', 'Acknowledge the chip', 'Ack'), tg('release', 'Skip key releases', 'Releases')];
    const readouts = [
      { label: 'Typed', get: () => ({ v: R.typed || 'nothing', good: R.typed === 'abce', bad: R.typed !== 'abce' }) },
      { label: 'Interrupts handled', get: () => ({ v: `${R.got} of ${KEYS.length}` }) },
      { label: 'Keyboard vector', get: () => ({ v: st.remap ? '33' : '9', sub: st.remap ? 'clear of faults' : 'clashes with a fault', good: st.remap, bad: !st.remap }) },
    ];
    const labels = [
      { name: 'k', t: 'Eight scan codes', d: 'Tall: a key pressed', icon: 'hand', atV: V(X(0) - 0.22, 0.1, -0.05) },
      { name: 'l', t: 'Kernel state', d: 'Red: faulted or stuck', icon: 'check', atV: V(2.27, 0.3, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Skip the remap', hint: 'a key looks like a fault', on: () => set({ ...D0, remap: false }), off: reset },
      { label: 'Forget to acknowledge', hint: 'one key, then silence', on: () => set({ ...D0, ack: false }), off: reset },
      { label: 'Treat releases as keys', hint: 'extra characters', on: () => set({ ...D0, release: false }), off: reset },
    ];
    function status() {
      if (R.fault === 'no table') return { ok: false, msg: '<b>The processor has no table to look in.</b> The first key causes a fault, and the machine resets.' };
      if (R.fault === 'clash') return { ok: false, msg: '<b>The keyboard arrives on a number the processor uses for its own faults.</b> Remap the chip above 32.' };
      if (R.fault === 'no handler') return { ok: false, msg: '<b>The table entry is empty.</b> The lookup works, and there is nothing to run.' };
      if (R.blocked) return { ok: false, msg: `<b>Typed "${R.typed}", then silence.</b> The chip waits to be told the handler is done, so it sends no more.` };
      if (!st.release) return { ok: false, msg: `<b>Typed "${R.typed}".</b> A key sends one code going down and one coming up.` };
      return { ok: true, msg: `<b>Typed "${R.typed}", from eight interrupts.</b> Four presses, four releases, each acknowledged.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'No polling', home: true, say: 'A till in Port Louis has its own small kernel. It doesn\'t ask the keyboard. The keyboard tells it.', act: m => m.set({ loaded: false, remap: true, handler: true, ack: true, release: true }) },
    { t: 'The table', home: true, say: 'A table of 256 entries says which code runs for each number.', act: m => m.set({ loaded: true, remap: true, handler: false, ack: true, release: true }) },
    { t: 'Remap', home: true, say: 'On a PC, the chip\'s numbers clash with the processor\'s faults, so move them.', act: m => m.set({ loaded: true, remap: false, handler: true, ack: true, release: true }) },
    { t: 'The handler', home: true, say: 'The handler reads a scan code, and turns it into a letter.', act: m => m.set({ loaded: true, remap: true, handler: true, ack: true, release: false }) },
    { t: 'Say done', home: true, say: 'It must tell the chip it has finished, or no more arrive.', act: m => m.set({ loaded: true, remap: true, handler: true, ack: false, release: true }) },
    { t: 'Typing', home: true, say: 'A keypress crosses hardware and table to become a letter.', act: m => m.set({ loaded: true, remap: true, handler: true, ack: true, release: true }) },
  ],
  check: [
    { q: 'What does the table do?', options: ['Maps numbers to handlers', 'Stores keystrokes', 'Lists files'], answer: 0, why: 'There are 256 entries.', hint: 'See The table.' },
    { q: 'Why remap the chip?', options: ['Its numbers clash with faults', 'To go faster', 'To save power'], answer: 0, why: 'A key would look like a fault.', hint: 'Try Skip the remap.' },
    { q: 'What happens with no acknowledge?', options: ['No more interrupts arrive', 'Keys repeat', 'It reboots'], answer: 0, why: 'The chip waits.', hint: 'Try Forget to acknowledge.' },
  ],
  terms: [['IDT', 'The interrupt table.'], ['PIC', 'The interrupt controller chip.'], ['Scan code', 'A key\'s raw number.'], ['EOI', 'End of interrupt: the acknowledgement.']],
  deeper: '<p><b>A model.</b> This runs the rules in JavaScript, not on real hardware. Four keys are shown.</p><p><b>Next.</b> The book continues with paging and user mode.</p>',
  credit: 'Built from the code of <a href="https://littleosbook.github.io/" target="_blank" rel="noopener">The little book about OS development</a> (code public domain), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short sketch, written for this lesson.',
  code: {
    title: 'The handler',
    note: 'Our own short sketch, in C.',
    text: `
void keyboard_handler(void) {
    unsigned char code = inb(0x60);
    if (!(code & 0x80))               /* top bit set: key released */
        put_char(scan_to_ascii[code]);
    outb(0x20, 0x20);                 /* tell the chip we're done */
}
`,
  },
};
