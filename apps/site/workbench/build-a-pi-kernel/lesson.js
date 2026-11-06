// Build it yourself: a Raspberry Pi kernel (after raspberry-pi-os). A Bulawayo weather station's small board. Boot starts at the highest exception level and drops to the kernel's; a timer interrupt saves registers and a round-robin scheduler switches tasks. A real tick loop counts each task's time, and shows what breaks.
function run(o) {
  const T = [{ n: 'Read sensor', left: o.work[0], got: 0, done: -1 }, { n: 'Log', left: o.work[1], got: 0, done: -1 }, { n: 'Send', left: o.work[2], got: 0, done: -1 }];
  if (!o.drop) return { T, stuck: 'el', tl: [], t: 0, sw: 0, wait: 0 };
  let cur = 0, q = 0, t = 0, sw = 0; const tl = [];
  while (t < 40 && T.some(x => x.left > 0)) {
    const x = T[cur];
    if (x.left <= 0) { cur = (cur + 1) % 3; continue; }
    x.left--; x.got++; tl.push(cur); t++; q++;
    if (x.left === 0) x.done = t;
    if (o.timer && (q >= o.q || x.left === 0)) { q = 0; if (o.save) sw++; const nx = (cur + 1) % 3; cur = nx; }
    else if (!o.timer && x.left === 0) { cur = (cur + 1) % 3; }
  }
  const wait = T.reduce((a, x) => a + (x.done - x.got), 0) / 3;
  return { T, tl, t, sw, wait, first: T[2].done, stuck: '', corrupt: o.timer && !o.save };
}

export default {
  slug: 'build-a-pi-kernel',
  title: 'Build your own Raspberry Pi kernel',
  description: 'Drop from the top exception level, catch a timer tick, save the registers, run the next task.',
  overview: 'When a Raspberry Pi starts, the code runs at the highest privilege, with no kernel in sight. A small kernel\'s first job is to set up a stack and drop down to its own exception level. From there, one device matters most: the timer. It raises an interrupt at a set interval. The handler saves every register of the running task, and the scheduler picks the next one and restores its registers. That\'s all multitasking is. Save too little, and the next task resumes with someone else\'s numbers. This real tick loop runs three tasks for a weather station in Bulawayo.',
  keywords: ['operating system', 'Raspberry Pi', 'exception levels', 'timer interrupt', 'scheduler', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, 0], dir: [0.05, 0.9, 1.0], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { drop: true, timer: true, save: true, q: 2, work: [6, 8, 4] }, st = { ...D0 };
    const CL = ['#5B8DB8', '#1F9E89', '#F2AE0C'], GREY = '#E0DBCE', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.3 + i * 0.25;
    const Sl = Array.from({ length: 18 }, (_, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.21, 0.1, 0.8, '#fff', { r: 0.02, material: m }); b.position.set(X(i), 0.03, -0.05); S.add(b); return { b, m }; });
    const lamp = add(P.lamp('#3E9B5F', { h: 0.45, r: 0.11 })); lamp.position.set(2.25, 0.03, -0.05);
    S.add(P.keep(-2.45, 2.45, 0.6, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); Sl.forEach(({ b, m }, i) => { const c = R.tl[i]; m.color.set(c === undefined ? GREY : CL[c]); b.scale.y = c === undefined ? 0.5 : 2; }); lamp.userData.set({ color: R.stuck || R.corrupt ? '#D9483B' : '#3E9B5F', on: true }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('drop', 'Drop to the kernel\'s exception level', 'Drop'), tg('timer', 'Timer interrupt on', 'Timer'), tg('save', 'Save all registers', 'Save'), { type: 'slider', label: 'Ticks per turn', min: 1, max: 6, step: 1, get: () => st.q, set: v => set({ q: v }) }];
    const readouts = [
      { label: 'Send finishes', get: () => ({ v: R.stuck ? 'never' : `tick ${R.first}`, bad: !!R.stuck }) },
      { label: 'Task switches', get: () => ({ v: `${R.sw}`, sub: 'registers saved each time' }) },
      { label: 'Average wait', get: () => ({ v: R.stuck ? 'none' : `${R.wait.toFixed(1)} ticks` }) },
    ];
    const labels = [
      { name: 't', t: 'Time, one slice per tick', d: 'Colour: the task running', icon: 'wave', atV: V(X(0) - 0.12, 0.08, -0.05) },
      { name: 'l', t: 'Kernel health', d: 'Red: something is wrong', icon: 'check', atV: V(2.42, 0.3, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Never drop', hint: 'stuck at the top level', on: () => set({ ...D0, drop: false }), off: reset },
      { label: 'No timer', hint: 'a task keeps the board', on: () => set({ ...D0, timer: false }), off: reset },
      { label: 'Save too little', hint: 'registers get mixed up', on: () => set({ ...D0, save: false }), off: reset },
    ];
    function status() {
      if (R.stuck) return { ok: false, msg: '<b>Nothing runs.</b> The board stays at the highest level, with no kernel stack and no interrupts set up.' };
      if (R.corrupt) return { ok: false, msg: '<b>Tasks switch, and each resumes with another\'s numbers.</b> The handler must save every register a task can use.' };
      if (!st.timer) return { ok: false, msg: `<b>Send waits until tick ${R.first - st.work[2]} to start.</b> With no timer, each task keeps the board until it finishes.` };
      return { ok: true, msg: `<b>${R.sw} switches, and three tasks share the board.</b> A shorter turn means less waiting and more switching.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'At the top', home: true, say: 'A weather station in Bulawayo powers on. Code starts at the highest privilege, with no kernel.', act: m => m.set({ drop: false, timer: true, save: true, q: 2 }) },
    { t: 'Drop down', home: true, say: 'Set up a stack, then drop to the kernel\'s exception level.', act: m => m.set({ drop: true, timer: false, save: true, q: 2 }) },
    { t: 'One at a time', home: true, say: 'With no timer, each task keeps the board until it ends.', act: m => m.set({ drop: true, timer: false, save: true, q: 2 }) },
    { t: 'The tick', home: true, say: 'A timer interrupt fires, and the handler takes over.', act: m => m.set({ drop: true, timer: true, save: true, q: 3 }) },
    { t: 'Save and restore', home: true, say: 'Every register is saved, the next task chosen, and its registers restored.', act: m => m.set({ drop: true, timer: true, save: true, q: 2 }) },
    { t: 'Illusion', home: true, say: 'Switch quickly enough, and three tasks seem to run at once.', act: m => m.set({ drop: true, timer: true, save: true, q: 1 }) },
  ],
  check: [
    { q: 'What is the first job at boot?', options: ['Set up a stack and drop level', 'Start the network', 'Load a browser'], answer: 0, why: 'The kernel needs its own level.', hint: 'Try Never drop.' },
    { q: 'What makes multitasking possible?', options: ['A timer interrupt', 'A faster disk', 'More memory'], answer: 0, why: 'It takes the board back.', hint: 'See The tick.' },
    { q: 'What must the handler save?', options: ['Every register a task can use', 'Only the clock', 'Nothing'], answer: 0, why: 'A task must resume unchanged.', hint: 'Try Save too little.' },
  ],
  terms: [['Exception level', 'A privilege level on ARM.'], ['Interrupt', 'A signal that breaks in.'], ['Context switch', 'Swapping one task for another.'], ['Scheduler', 'Picks what runs next.']],
  deeper: '<p><b>Real loop.</b> The ticks here are really counted.</p><p><b>On a real board.</b> The tutorial continues with system calls, page tables and a file system.</p>',
  credit: 'Built from <a href="https://github.com/s-matyukevich/raspberry-pi-os" target="_blank" rel="noopener">Learning operating system development using Linux kernel and Raspberry Pi</a> (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short scheduler sketch, written for this lesson.',
  code: {
    title: 'The timer handler',
    note: 'Our own short sketch, in C.',
    text: `
void timer_tick(void) {
    if (--current->counter > 0) return;
    int next = (current->id + 1) % NR_TASKS;
    cpu_switch_to(current, task[next]);   /* saves and restores registers */
}
`,
  },
};
