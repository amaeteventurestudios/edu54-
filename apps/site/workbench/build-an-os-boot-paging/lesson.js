// Build your own operating system, from power-on to protected memory: a PC's firmware loads the first 512-byte sector of the disk only if
// it ends with the signature 0x55AA; the boot code loads the kernel, installs a global descriptor table, switches the CPU to 32-bit
// protected mode and turns on paging. A 32-bit virtual address splits into a 10-bit page-directory index, a 10-bit page-table index and a
// 12-bit offset, and two table lookups give the physical address. Pages marked supervisor-only fault when a user program touches them, and
// page 0 is left unmapped so null pointers fault. Every translation below is computed from those tables.
const MAP = { 0x08048: { frame: 0x00400, user: true, name: 'user code' }, 0xBFFFF: { frame: 0x00500, user: true, name: 'user stack' }, 0xC0100: { frame: 0x00100, user: false, name: 'kernel code' } };
const ADDRS = [0x08048A10, 0xBFFFF3C8, 0xC0100244, 0x00000004];
const hex = (v, n = 8) => '0x' + (v >>> 0).toString(16).toUpperCase().padStart(n, '0');
function walk(o) {
  const stages = [
    { n: 'firmware reads\nsector 0', ok: true },
    { n: 'signature\n0x55AA', ok: o.sig },
    { n: 'load kernel\nfrom disk', ok: o.sig },
    { n: 'install\nGDT', ok: o.sig && o.gdt },
    { n: 'enter\nprotected mode', ok: o.sig && o.gdt },
    { n: 'turn on\npaging', ok: o.sig && o.gdt },
  ];
  const booted = stages.every(s => s.ok);
  const va = ADDRS[o.addr], dir = va >>> 22, tbl = (va >>> 12) & 0x3FF, off = va & 0xFFF, vpn = va >>> 12;
  const e = MAP[vpn];
  let result, fault = null, phys = null;
  if (!booted) result = 'never got this far';
  else if (!e) { fault = 'page not present'; result = 'page fault: not mapped'; }
  else if (!e.user && o.protect) { fault = 'protection'; result = 'page fault: supervisor page'; }
  else { phys = (e.frame << 12) | off; result = `physical ${hex(phys)}`; }
  const leak = booted && e && !e.user && !o.protect;
  return { stages, booted, va, dir, tbl, off, e, result, fault, phys, leak };
}

export default {
  slug: 'build-an-os-boot-paging',
  title: 'Build your own OS: boot and paging',
  description: 'A tiny operating system boots into protected mode and turns on paging. Each memory read walks two tables: allowed, or a fault.',
  overview: 'Writing an operating system starts before any operating system exists. When a PC powers on, its firmware runs a short self-test and then reads the first 512-byte sector of the boot disk into memory at address 0x7C00, but only if the sector\'s last two bytes are the signature 0x55AA; otherwise it tries the next disk or gives up. That tiny boot sector, written in assembly, runs in 16-bit real mode with one megabyte of addressable memory, so its job is to load the rest: it reads the kernel from disk, then prepares to switch the processor into 32-bit protected mode. The switch requires a global descriptor table, a small table describing memory segments and their privilege levels; jumping into protected mode without a valid one makes the processor fault, then fault while handling the fault, and reset itself, a triple fault. Once in protected mode the kernel builds page tables and turns on paging, so every address a program uses is virtual. On 32-bit x86, a virtual address splits into three parts: the top 10 bits pick an entry in the page directory, the next 10 bits pick an entry in a page table, and the low 12 bits are the offset within a 4 KB page. The page-table entry gives the physical frame and permission bits. A user/supervisor bit lets the kernel keep its own pages out of reach: a user program that touches one triggers a page fault instead of reading kernel memory. Leaving page 0 unmapped turns null-pointer bugs into faults. Each process gets its own page directory, so the same virtual address in two programs means different memory. This machine follows the tutorials\' path, from the boot sector to one address translation.',
  keywords: ['build your own operating system', 'bootloader', 'protected mode', 'GDT', 'paging', 'virtual memory', 'page fault'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, -0.1], dir: [0.1, 0.85, 1.2], half: 0.95, wide: 5.6 },
  credit: 'Built from <a href="https://github.com/cfenollosa/os-tutorial" target="_blank" rel="noopener">How to create an OS from scratch</a> (BSD-3-Clause), <a href="https://github.com/s-matyukevich/raspberry-pi-os" target="_blank" rel="noopener">Learning operating system development using Linux kernel and Raspberry Pi</a> (MIT) and <a href="https://littleosbook.github.io/" target="_blank" rel="noopener">The little book about OS development</a> (code public domain), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short boot-sector and page-table sketch, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { sig: true, gdt: true, protect: true, addr: 0 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#C9C4B8', KER = '#7A4FB5', USR = '#5B8DB8';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // the boot chain: six steps from power-on up to paging; the CPU climbs as far as it gets
    const BX = i => -2.35 + i * 0.4, BZ = -0.75, BH = i => 0.08 + i * 0.08;
    const steps = Array.from({ length: 6 }, (_, i) => { const m = own(OFF), b = P.box(0.38, BH(i), 0.5, '#fff', { r: 0.03, material: m }); b.position.set(BX(i), 0, BZ); S.add(b); return m; });
    const cpu = P.robot('#3F4049', { scale: 0.55 }); S.add(cpu);
    // the virtual address: 10 bits, 10 bits, 12 bits
    const SEG = [['#3D6BD6', 10], ['#C2477A', 10], ['#E08A3C', 12]];
    let ax = -2.45; const segs = SEG.map(([c, b]) => { const w = b * 0.042, s = P.box(w - 0.02, 0.14, 0.3, c, { r: 0.03 }); s.position.set(ax + w / 2, 0, 0.55); S.add(s); const mid = ax + w / 2; ax += w; return mid; });
    // two lookups: the page directory, then a page table
    const dir = P.shelf(4, { cell: 0.26, d: 0.36, lh: 0.3 }); dir.position.set(-0.75, 0, 0.2); S.add(dir);
    const tbl = P.shelf(4, { cell: 0.26, d: 0.36, lh: 0.3 }); tbl.position.set(0.65, 0, 0.2); S.add(tbl);
    // physical memory: five frames; plum frames belong to the kernel
    const FR = [USR, KER, USR, USR, USR], frames = P.stack(0.62, 0.46, 0.2, { max: 5 }); frames.position.set(2.35, 0.02, 0.15); S.add(frames);
    const guard = P.gate(0.5, BAD, { h: 0.45 }); guard.position.set(1.55, 0, 0.15); S.add(guard);
    const rodM = [0, 1, 2].map(() => own(GOOD)), rods = rodM.map(m => { const r = P.rod(V(0, 0, 0), V(0, 1, 0), 0.03, GOOD, { material: m }); r.userData.noFit = true; S.add(r); return r; });
    S.add(P.keep(-2.6, 2.75, 1.1, -1.05, 0.75));

    const SLOT = [0, 1, 2, 3], FRAME = [3, 4, 1, -1];
    let R = null, cpuTo = V();
    const slotPos = (sh, i) => sh.position.clone().add(V(-0.52 + 0.26 * (i + 0.5), 0.45, 0));
    function draw() {
      R = walk(st);
      let top = -1; for (let i = 0; i < 6; i++) { if (R.stages[i].ok) top = i; else break; }
      steps.forEach((m, i) => m.color.set(i <= top ? GOOD : i === top + 1 ? BAD : OFF));
      const k = Math.max(0, top); cpuTo = V(BX(k), BH(k), BZ);
      cpu.userData.set({ lamp: R.booted ? GOOD : BAD, busy: R.booted });
      const a = st.addr, on = R.booted, nul = a === 3, kernel = a === 2;
      dir.userData.set({ fill: SLOT.map(i => i === 3 ? null : !on ? OFF : i === a ? SAF : '#B6C6D9') });
      tbl.userData.set({ fill: SLOT.map(i => i === 3 ? null : !on ? OFF : i === a && !nul ? (kernel && st.protect ? BAD : SAF) : i === 2 ? '#C9B6DE' : '#B6C6D9') });
      const fault = !!R.fault, leak = R.leak;
      frames.userData.set({ n: 5, colors: FR.map((c, i) => on && R.phys !== null && i === FRAME[a] ? (leak ? BAD : SAF) : c) });
      guard.visible = on && kernel && st.protect;
      const pA = V(segs[0], 0.14, 0.55), pD = slotPos(dir, a === 3 ? 0 : a), pT = slotPos(tbl, nul ? 3 : a);
      const pF = V(2.35 - 0.31, 0.12 + 0.2 * Math.max(0, FRAME[a]), 0.15);
      const col = fault ? BAD : leak ? BAD : GOOD;
      rods.forEach(r => r.visible = on);
      if (on) {
        P.setRod(rods[0], pA, pD); rodM[0].color.set(GOOD);
        P.setRod(rods[1], pD, pT); rodM[1].color.set(nul ? BAD : GOOD);
        rods[2].visible = !nul; if (!nul) { P.setRod(rods[2], pT, kernel && st.protect ? V(1.3, 0.4, 0.15) : pF); rodM[2].color.set(col); }
      }
    }
    const tick = dt => { cpu.position.lerp(cpuTo, Math.min(1, dt * 6)); cpu.userData.tick(dt); guard.userData.tick(dt, true); };
    function isOk() { return R.booted && st.protect; }
    draw(); cpu.position.copy(cpuTo);
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'End the boot sector with 0x55AA', short: 'Signature', get: () => st.sig, set: v => set({ sig: !!v }) },
      { type: 'toggle', label: 'Install a GDT before protected mode', short: 'GDT', get: () => st.gdt, set: v => set({ gdt: !!v }) },
      { type: 'toggle', label: 'Mark kernel pages supervisor-only', short: 'Protect', get: () => st.protect, set: v => set({ protect: !!v }) },
      { type: 'buttons', label: 'User program reads', options: ['its code', 'its stack', 'kernel memory', 'address 4 (null)'], get: () => st.addr, act: i => set({ addr: i }) },
    ];
    const readouts = [
      { label: 'Boot', get: () => ({ v: R.booted ? 'paging on' : 'failed', sub: R.booted ? 'protected mode' : R.stages.find(s => !s.ok).n.replace('\n', ' '), good: R.booted, bad: !R.booted }) },
      { label: 'Translation', get: () => ({ v: R.phys !== null ? hex(R.phys) : R.fault ? 'page fault' : '—', sub: hex(R.va), good: R.booted && !R.leak, bad: R.leak }) },
      { label: 'Kernel pages', get: () => ({ v: st.protect ? 'guarded' : 'exposed', sub: 'from user programs', good: st.protect, bad: !st.protect }) },
    ];
    const labels = [
      { name: 'b', t: 'Six boot steps', d: 'Teal: done. Coral: where boot stopped', icon: 'bolt', atV: V(BX(0) - 0.19, 0.06, BZ) },
      { name: 'a', t: 'A virtual address', d: 'Then two table lookups', icon: 'target', atV: V(-2.45, 0.07, 0.55) },
      { name: 'f', t: 'Physical memory', d: 'Plum: kernel. Gold: the frame read', icon: 'box', atV: V(2.66, 0.5, 0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Leave out the boot signature', hint: 'firmware skips the disk', on: () => set({ ...D0, sig: false }), off: reset },
      { label: 'Skip the GDT', hint: 'triple fault', on: () => set({ ...D0, gdt: false }), off: reset },
      { label: 'Let users read kernel pages', hint: 'no supervisor bit', on: () => set({ ...D0, protect: false, addr: 2 }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.sig) return { ok: false, msg: '<b>Sector 0 does not end with 0x55AA, so the firmware decides the disk is not bootable and never runs the code: "no bootable device".</b> The last two bytes of the 512-byte boot sector must be 0x55, 0xAA.' };
      if (!st.gdt) return { ok: false, msg: '<b>The boot code set the protected-mode bit and jumped without a descriptor table, so the first segment load faulted, the fault handler faulted too, and the processor reset: a triple fault, and the machine reboots in a loop.</b> Load a GDT with code and data segments first.' };
      if (r.leak) return { ok: false, msg: `<b>The kernel's pages are marked as user pages, so the user program read kernel code at ${hex(r.va)} as physical ${hex(r.phys)}: any program can read, or change, the kernel.</b> Clear the user bit on every kernel page so user access faults.` };
      if (!st.protect) return { ok: false, msg: '<b>This read is allowed, but the kernel\'s pages are open to user programs: try reading kernel memory.</b> Clear the user bit on every kernel page.' };
      return { ok: true, msg: r.fault ? `<b>Reading ${hex(r.va)} from a user program raised a page fault (${r.fault}), which the kernel handles, ${r.fault === 'protection' ? 'so kernel memory stays private' : 'so a null-pointer bug is caught instead of reading garbage'}.</b>` : `<b>${hex(r.va)} splits into directory ${r.dir}, table ${r.tbl} and offset ${hex(r.off, 3)}; the two lookups land on frame ${hex(r.e.frame, 5)}, so the program reads physical ${hex(r.phys)}.</b> Try kernel memory or address 4.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Power on', home: true, say: 'The firmware reads the first 512 bytes of the disk into memory, if they end with the boot signature.', act: m => m.set({ sig: false, gdt: true, protect: true, addr: 0 }) },
    { t: 'Into protected mode', home: true, say: 'The boot code loads the kernel, installs a descriptor table and switches the CPU to 32-bit protected mode.', act: m => m.set({ sig: true, gdt: false, protect: true, addr: 0 }) },
    { t: 'Paging on', home: true, say: 'Now every address is virtual. Ten bits pick a directory entry, ten a table entry, twelve the offset.', act: m => m.set({ sig: true, gdt: true, protect: true, addr: 0 }) },
    { t: 'Two lookups', home: true, say: 'The program\'s stack address lands on its own physical frame, wherever that is.', act: m => m.set({ sig: true, gdt: true, protect: true, addr: 1 }) },
    { t: 'Kernel stays private', home: true, say: 'Kernel pages are supervisor-only. A user program that touches one gets a page fault.', act: m => m.set({ sig: true, gdt: true, protect: true, addr: 2 }) },
    { t: 'Null is a fault', home: true, say: 'Page zero is left unmapped, so a null-pointer bug faults instead of reading garbage.', act: m => m.set({ sig: true, gdt: true, protect: true, addr: 3 }) },
  ],
  check: [
    { q: 'What must the boot sector end with?', options: ['The signature 0x55AA', 'A zero byte', 'The kernel'], answer: 0, why: 'Or the firmware skips the disk.', hint: 'Try Leave out the boot signature.' },
    { q: 'How does 32-bit paging split an address?', options: ['10 bits directory, 10 bits table, 12 bits offset', '16 and 16', '8, 8 and 16'], answer: 0, why: 'Two lookups, 4 KB pages.', hint: 'Watch the address bar.' },
    { q: 'What stops a user program reading kernel memory?', options: ['Kernel pages marked supervisor-only', 'The GDT alone', 'Nothing'], answer: 0, why: 'Access faults instead.', hint: 'Try Let users read kernel pages.' },
  ],
  terms: [
    ['Boot sector', 'The first 512 bytes of a disk, run by the firmware.'],
    ['Real mode', 'The 16-bit mode a PC starts in, with 1 MB of memory.'],
    ['GDT', 'Global descriptor table: segments and privilege levels for protected mode.'],
    ['Protected mode', 'The 32-bit mode with privilege levels and paging.'],
    ['Page table', 'A table mapping virtual pages to physical frames.'],
    ['Page fault', 'A trap to the kernel when a page is missing or forbidden.'],
  ],
  deeper: '<p><b>Higher-half kernels.</b> Many kernels map themselves at the same high virtual address in every process, so system calls need no page-table switch.</p><p><b>Modern machines.</b> 64-bit x86 uses four or five levels of page tables, and UEFI firmware replaces the boot sector, but the ideas are the same.</p><p><b>About this machine.</b> The addresses and frames are illustrative; translations are computed from the tables shown.</p>',
  code: {
    title: 'Translate a virtual address',
    note: 'Our own short version, written for this lesson.',
    text: `
PRESENT, WRITABLE, USER = 0x1, 0x2, 0x4

def translate(page_directory, va, user_mode):
    d = (va >> 22) & 0x3FF                  # top 10 bits
    t = (va >> 12) & 0x3FF                  # next 10 bits
    offset = va & 0xFFF                     # low 12 bits
    pde = page_directory[d]
    if not pde & PRESENT:
        raise PageFault("not present", va)
    pte = table_at(pde & ~0xFFF)[t]
    if not pte & PRESENT:
        raise PageFault("not present", va)
    if user_mode and not pte & USER:
        raise PageFault("protection", va)   # kernel page
    return (pte & ~0xFFF) | offset
`,
  },
};
