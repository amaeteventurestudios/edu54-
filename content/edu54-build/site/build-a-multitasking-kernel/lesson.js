// Build your own multitasking kernel: a small ARM board in an invented weather station in Gulu runs three tasks: read the sensor, log to
// flash and refresh the display. The logger has a bug: it spins in a loop without yielding. A timer interrupt every few ticks lets the
// kernel save the running task's registers on its own stack, pick the next task round-robin and restore that task's registers. With
// cooperative switching, separate stacks or saved registers turned off, the schedule below shows what goes wrong. The 40-tick timeline is
// simulated from these rules.
const TASKS = ['sensor', 'logger', 'display'];
const T = 40, SWITCH = 1;
function schedule(o) {
  const line = [], wait = [0, 0, 0], maxWait = [0, 0, 0];
  let cur = 0, run = 0, switches = 0, overhead = 0;
  for (let t = 0; t < T; t++) {
    if (o.preempt && run >= o.q) {
      for (let k = 0; k < SWITCH && t < T; k++) { line.push('k'); overhead++; t++; TASKS.forEach((_, i) => { wait[i]++; maxWait[i] = Math.max(maxWait[i], wait[i]); }); }
      if (t >= T) break;
      cur = (cur + 1) % 3; run = 0; switches++;
    } else if (!o.preempt && run >= 3 && cur !== 1) {
      line.push('k'); overhead++; t++; TASKS.forEach((_, i) => { wait[i]++; maxWait[i] = Math.max(maxWait[i], wait[i]); });
      if (t >= T) break;
      cur = (cur + 1) % 3; run = 0; switches++;
    }
    line.push(cur); run++;
    TASKS.forEach((_, i) => { if (i === cur) wait[i] = 0; else { wait[i]++; maxWait[i] = Math.max(maxWait[i], wait[i]); } });
  }
  const starved = TASKS.filter((_, i) => i !== 1 && maxWait[i] > 12).length;
  const corrupt = o.preempt && switches > 0 && (!o.save || !o.stacks);
  return { line, maxWait, switches, overhead, starved, corrupt, displayWait: maxWait[2] };
}

export default {
  slug: 'build-a-multitasking-kernel',
  title: 'Build your own multitasking kernel',
  description: 'A weather station\'s small ARM board runs three tasks, and the logger spins without ever yielding. Add a timer interrupt, and the kernel can take the CPU back.',
  overview: 'A single processor core runs one instruction stream at a time, yet a small device can appear to do several things at once. The kernel makes this happen by switching between tasks quickly. Each task has its own stack, a region of memory holding its local variables and return addresses, and its own saved context: the values of the processor\'s registers, including the program counter and stack pointer, at the moment it last stopped. A context switch saves the running task\'s registers onto its own stack, records its stack pointer, loads the next task\'s stack pointer and restores its registers, so that task continues exactly where it left off. On ARM Cortex-M chips, as in the mini-arm-os tutorial, the hardware saves half the registers on an interrupt and the kernel saves the rest. When to switch is the scheduler\'s choice. In cooperative multitasking each task must call yield to give the processor up; one task stuck in a loop, or simply busy, freezes all the others. Preemptive multitasking uses a hardware timer, here the SysTick timer, that interrupts the processor every few milliseconds whatever the task is doing; the interrupt handler calls the scheduler, which picks the next task, round-robin here. The length of the time slice is a trade-off: short slices make every task responsive but spend more time switching, long slices waste less but leave tasks waiting. Real kernels add priorities, sleeping tasks that wait for events, and locks around shared data. This machine simulates an invented weather station in Gulu; each square is one tick of the clock.',
  keywords: ['build your own operating system', 'multitasking kernel', 'context switch', 'preemptive scheduling', 'round robin', 'timer interrupt', 'ARM Cortex-M'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://github.com/jserv/mini-arm-os" target="_blank" rel="noopener">mini-arm-os: Build a minimal multi-tasking kernel for ARM from scratch</a> (BSD-2-Clause), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short scheduler sketch, written for this lesson after mini-arm-os (BSD-2-Clause).',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { preempt: true, save: true, stacks: true, q: 4 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const TC = ['#1F9E89', '#E07A5F', '#5B6CC4'];
    const CW = 3.35 / T, X0 = -2.35;
    const cells = TASKS.map((n, r) => {
      return Array.from({ length: T }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: '#F1ECE1' }), b = P.box(CW * 0.86, 0.04, 0.2, '#fff', { r: 0.01, material: m }); b.position.set(X0 + 0.12 + CW * (i + 0.5), 0.12, -0.78 + r * 0.3); floor.add(b); return m; });
    });
    const kRow = Array.from({ length: T }, (_, i) => { const m = new THREE.MeshLambertMaterial({ color: '#F1ECE1' }), b = P.box(CW * 0.86, 0.04, 0.1, '#fff', { r: 0.01, material: m }); b.position.set(X0 + 0.12 + CW * (i + 0.5), 0.12, 0.12); floor.add(b); return m; });

    const stk = TASKS.map((n, i) => { const m = new THREE.MeshLambertMaterial({ color: TC[i] }), b = P.box(0.95, 0.05, 0.16, '#fff', { r: 0.03, material: m }); b.position.set(-2.0 + i * 1.1, 0.12, 0.42); floor.add(b);    return { m, b }; });

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    let R = null;
    function draw() {
      R = schedule(st);
      cells.forEach((row, r) => row.forEach((m, i) => m.color.set(R.line[i] === r ? (R.corrupt && i > R.line.indexOf('k') && R.line.indexOf('k') >= 0 ? '#D9A08F' : TC[r]) : '#F1ECE1')));
      kRow.forEach((m, i) => m.color.set(R.line[i] === 'k' ? '#8A877F' : '#F1ECE1'));
      stk.forEach((s, i) => {
        if (st.stacks) { s.b.position.x = -2.0 + i * 1.1; s.b.scale.x = 1;  s.b.visible = true;  s.m.color.set(TC[i]); }
        else { s.b.visible = i === 0;  s.b.scale.x = 3.2; s.b.position.x = -0.9; s.m.color.set(RED);  }
      });
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.preempt && st.save && st.stacks && R.starved === 0 && R.overhead / T < 0.25; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Time slice (ticks)', min: 1, max: 12, step: 1, get: () => st.q, set: v => set({ q: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Preempt with a timer interrupt', short: 'Preempt', get: () => st.preempt, set: v => set({ preempt: !!v }) },
      { type: 'toggle', label: 'Save every register', short: 'Save all', get: () => st.save, set: v => set({ save: !!v }) },
      { type: 'toggle', label: 'Give each task its own stack', short: 'Own stacks', get: () => st.stacks, set: v => set({ stacks: !!v }) },
    ];
    const readouts = [
      { label: 'Display waits', get: () => ({ v: `${R.displayWait} ticks`, sub: 'longest', good: R.displayWait <= 10, bad: R.displayWait > 12 }) },
      { label: 'Switching', get: () => ({ v: `${Math.round(R.overhead / T * 100)}%`, sub: 'of the clock', good: R.overhead / T < 0.25, bad: R.overhead / T >= 0.3 }) },
      { label: 'Task state', get: () => ({ v: R.corrupt ? 'corrupted' : 'intact', sub: 'after switches', good: !R.corrupt, bad: R.corrupt }) },
    ];
    const labels = [
      { name: 'l', t: 'Forty clock ticks', d: 'Who has the processor', icon: 'wave', atV: V(-2.0, 0.15, -0.48) },
      { name: 't', t: 'How it went', d: 'Waits, switching, state', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Rely on tasks to yield', hint: 'the logger never does', on: () => set({ ...D0, preempt: false }), off: reset },
      { label: 'Save only half the registers', hint: 'state leaks between tasks', on: () => set({ ...D0, save: false }), off: reset },
      { label: 'Give all tasks one stack', hint: 'frames overwritten', on: () => set({ ...D0, stacks: false }), off: reset },
      { label: 'Switch every tick', hint: 'all overhead', on: () => set({ ...D0, q: 1 }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.preempt) return { ok: false, msg: `<b>With cooperative switching, the sensor task yields after its work, but the logger spins without ever yielding, so once it starts the sensor and display never run again: the display waits ${r.displayWait} ticks and counting.</b> Let a timer interrupt take the processor back.` };
      if (!st.save) return { ok: false, msg: '<b>The switch saves only the registers the hardware stacks automatically, so the next task resumes with values left behind by the last one: readings and display output come out garbled after the first switch.</b> Save and restore every register as part of the context.' };
      if (!st.stacks) return { ok: false, msg: '<b>With one stack for all three tasks, each task\'s saved registers and local variables are pushed over the others\', so a task resumes into another task\'s frame and soon crashes.</b> Give every task its own stack and save its stack pointer on each switch.' };
      if (r.overhead / T >= 0.25) return { ok: false, msg: `<b>Switching every tick keeps every task responsive, but ${Math.round(r.overhead / T * 100)}% of the clock now goes on context switches instead of work.</b> Lengthen the time slice until switching costs only a small share.` };
      if (r.starved) return { ok: false, msg: `<b>With a ${st.q}-tick slice the display waits ${r.displayWait} ticks between turns, too long for a smooth refresh.</b> Shorten the slice, or give the display a higher priority.` };
      return { ok: true, msg: `<b>Every ${st.q} ticks the timer interrupts, the kernel saves the task's registers on its own stack and resumes the next: the spinning logger cannot hog the processor, the display waits at most ${r.displayWait} ticks, and switching costs ${Math.round(r.overhead / T * 100)}% of the clock.</b>` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three tasks, one core', home: true, say: 'A weather station runs three tasks on one small processor. The logger has a bug: it never yields.', act: m => m.set({ preempt: false, save: true, stacks: true, q: 4 }) },
    { t: 'Cooperative fails', home: true, say: 'If tasks must give the processor up themselves, the spinning logger keeps it for ever.', act: m => m.set({ preempt: false, save: true, stacks: true, q: 4 }) },
    { t: 'A timer interrupt', home: true, say: 'A hardware timer interrupts every few ticks, whatever the task is doing, and the kernel takes over.', act: m => m.set({ preempt: true, save: true, stacks: true, q: 4 }) },
    { t: 'Save the context', home: true, say: 'The kernel saves every register of the running task on its own stack, then restores the next task\'s.', act: m => m.set({ preempt: true, save: true, stacks: true, q: 4 }) },
    { t: 'Slice length', home: true, say: 'Switch every tick and the processor spends its time switching. Too long and tasks wait.', act: m => m.set({ preempt: true, save: true, stacks: true, q: 1 }) },
    { t: 'Round and round', home: true, say: 'A sensible slice: every task runs often, and switching costs little.', act: m => m.set({ preempt: true, save: true, stacks: true, q: 4 }) },
  ],
  check: [
    { q: 'What does a context switch save?', options: ['The running task\'s registers, on its own stack', 'The whole memory', 'Only the program'], answer: 0, why: 'So it resumes exactly.', hint: 'Try Save only half the registers.' },
    { q: 'Why use a timer interrupt?', options: ['So no task can keep the processor for ever', 'To save power only', 'To read the clock'], answer: 0, why: 'Preemption.', hint: 'Try Rely on tasks to yield.' },
    { q: 'Why does each task need its own stack?', options: ['Its frames and saved registers must not be overwritten', 'For speed', 'It doesn\'t'], answer: 0, why: 'One stack mixes them up.', hint: 'Try Give all tasks one stack.' },
  ],
  terms: [
    ['Task', 'One independent flow of work the kernel schedules.'],
    ['Context', 'The register values that capture where a task is.'],
    ['Context switch', 'Saving one task\'s context and restoring another\'s.'],
    ['Preemption', 'Taking the processor from a task without its consent.'],
    ['Time slice', 'How long a task runs before the scheduler may switch.'],
    ['Round robin', 'Giving each task a turn in order.'],
  ],
  deeper: '<p><b>Priorities and sleep.</b> Real kernels let tasks sleep until an event and run higher-priority tasks first, so idle tasks cost nothing.</p><p><b>Shared data.</b> Preemption can stop a task halfway through updating shared data; locks or disabling interrupts briefly keep updates whole.</p><p><b>About this machine.</b> The station and its tasks are invented; the timeline is simulated.</p>',
  code: {
    title: 'A context switch on a timer interrupt',
    note: 'Our own short sketch, after mini-arm-os.',
    text: `
/* each task: its own stack and a saved stack pointer */
struct task { uint32_t *sp; uint32_t stack[256]; } tasks[3];
static int current = 0;

void SysTick_Handler(void) {               /* timer fired: hardware pushed r0-r3, r12, lr, pc, psr */
    asm volatile("mrs r0, psp\\n"
                 "stmdb r0!, {r4-r11}\\n"   /* save the rest of the registers */
                 "msr psp, r0" ::: "r0");
    tasks[current].sp = (uint32_t *)__get_PSP();
    current = (current + 1) % 3;           /* round robin */
    __set_PSP((uint32_t)tasks[current].sp);
    asm volatile("mrs r0, psp\\n"
                 "ldmia r0!, {r4-r11}\\n"   /* restore the next task's registers */
                 "msr psp, r0" ::: "r0");
}                                           /* return: hardware pops the rest and resumes it */
`,
  },
};
