// Disassembly and control flow, on the student's own object file: a tiny x86-64 decoder that knows exactly the opcodes in two fixtures, run for real.
// lookup (24 bytes) has a 4-byte table inside the function, jumped over: 48 63 c7 | 48 8d 0d 06 00 00 00 | 0f b6 04 01 | eb 04 | [31 c0 90 48] | 83 c0 01 | c3.
// Linear sweep decodes every byte from the start, so the table becomes "xorl; nop" and the real target 0x14 is swallowed by "addq" at 0x13.
// Recursive descent follows control flow from the entry and lands on "addl" at 0x14, never touching the table.
// total (31 bytes, at 0x40) is a loop: leaders, five basic blocks, five edges, and immediate dominators by the iterative algorithm (Cooper, Harvey, Kennedy 2001).
const OPS = [
  ['66 0f 1f 44 00 00', 6, 'nopw (%rax,%rax)'], ['48 8d 0d', 7, 'leaq {rip}(%rip), %rcx'], ['0f b6 04 01', 4, 'movzbl (%rcx,%rax), %eax'],
  ['48 83 c0', 4, 'addq ${i8}, %rax'], ['48 63 c7', 3, 'movslq %edi, %rax'], ['48 ff c2', 3, 'incq %rdx'], ['48 39 d1', 3, 'cmpq %rdx, %rcx'],
  ['03 04 97', 3, 'addl (%rdi,%rdx,4), %eax'], ['83 c0', 3, 'addl ${i8}, %eax'], ['31 c0', 2, 'xorl %eax, %eax'], ['31 d2', 2, 'xorl %edx, %edx'],
  ['85 f6', 2, 'testl %esi, %esi'], ['89 f1', 2, 'movl %esi, %ecx'], ['eb', 2, 'jmp', 'jump'], ['7e', 2, 'jle', 'branch'], ['75', 2, 'jne', 'branch'],
  ['90', 1, 'nop'], ['c3', 1, 'retq', 'ret'],
].map(([p, n, m, f]) => ({ p: p.split(' ').map(h => parseInt(h, 16)), n, m, f: f || 'seq' }));
const FIX = {
  lookup: { base: 0x0, bytes: '48 63 c7 48 8d 0d 06 00 00 00 0f b6 04 01 eb 04 31 c0 90 48 83 c0 01 c3', data: [0x10, 0x14] },
  total: { base: 0x40, bytes: '85 f6 7e 18 89 f1 31 d2 31 c0 66 0f 1f 44 00 00 03 04 97 48 ff c2 48 39 d1 75 f5 c3 31 c0 c3' },
};
function decode(code, base, at) {
  const o = at - base;
  for (const op of OPS) {
    if (op.p.every((b, i) => code[o + i] === b) && o + op.n <= code.length) {
      const rel8 = v => (v > 127 ? v - 256 : v);
      let m = op.m, target;
      if (op.f === 'jump' || op.f === 'branch') { target = at + op.n + rel8(code[o + 1]); m = `${op.m} 0x${target.toString(16)}`; }
      if (m.includes('{i8}')) m = m.replace('{i8}', `0x${code[o + op.n - 1].toString(16)}`);
      if (m.includes('{rip}')) m = m.replace('{rip}', `0x${code[o + 3].toString(16)}`);
      return { at, n: op.n, m, f: op.f, target, end: at + op.n };
    }
  }
  return null;
}
function sweep(F, code) { const out = []; let a = F.base; while (a < F.base + code.length) { const d = decode(code, F.base, a); if (!d) { a++; continue; } out.push(d); a = d.end; } return out; }
function descent(F, code) {
  const seen = new Map(), work = [F.base];
  while (work.length) {
    let a = work.pop();
    while (a < F.base + code.length && !seen.has(a)) {
      const d = decode(code, F.base, a); if (!d) break; seen.set(a, d);
      if (d.f === 'ret') break;
      if (d.f === 'jump') { a = d.target; continue; }
      if (d.f === 'branch') work.push(d.target);
      a = d.end;
    }
  }
  return [...seen.values()].sort((x, y) => x.at - y.at);
}
function cfg(ins, split) {
  const leaders = new Set([ins[0].at]);
  ins.forEach(d => { if (d.f !== 'seq') { if (split && d.target !== undefined) leaders.add(d.target); leaders.add(d.end); } });
  const blocks = []; let cur = null;
  ins.forEach(d => { if (!cur || leaders.has(d.at)) { cur = { at: d.at, ins: [] }; blocks.push(cur); } cur.ins.push(d); });
  const has = a => blocks.some(b => b.at === a);
  const edges = [];
  blocks.forEach((b, i) => {
    const last = b.ins[b.ins.length - 1];
    if (last.f === 'ret') return;
    if (last.f === 'jump' || last.f === 'branch') edges.push({ from: b.at, to: last.target, k: 'taken', bad: !has(last.target) });
    if (last.f !== 'jump' && blocks[i + 1]) edges.push({ from: b.at, to: blocks[i + 1].at, k: 'fallthrough' });
  });
  return { blocks, edges };
}
function idoms(G, naive) {
  const ids = G.blocks.map(b => b.at), idom = { [ids[0]]: ids[0] };
  if (naive) { ids.slice(1).forEach((a, i) => { idom[a] = ids[i]; }); return idom; }
  /* reverse postorder */
  const succ = a => G.edges.filter(e => e.from === a && ids.includes(e.to)).map(e => e.to), seen = new Set(), post = [];
  const dfs = a => { seen.add(a); succ(a).forEach(s => { if (!seen.has(s)) dfs(s); }); post.push(a); };
  dfs(ids[0]); const order = post.reverse(), num = Object.fromEntries(order.map((a, i) => [a, i]));
  const preds = a => G.edges.filter(e => e.to === a).map(e => e.from);
  const inter = (x, y) => { while (x !== y) { while (num[x] > num[y]) x = idom[x]; while (num[y] > num[x]) y = idom[y]; } return x; };
  let changed = true;
  while (changed) { changed = false; order.slice(1).forEach(b => { const ps = preds(b).filter(p => p in idom); if (!ps.length) return; let c = ps[0]; ps.slice(1).forEach(p => { c = inter(p, c); }); if (idom[b] !== c) { idom[b] = c; changed = true; } }); }
  return idom;
}
const hx = a => a === undefined ? "unreachable" : `0x${a.toString(16)}`;

export default {
  slug: 'disassembly-and-control-flow',
  title: 'Disassembly: sweep or follow, then draw the graph',
  description: 'Back to the student\'s own program: a tiny decoder turns bytes into instructions, two ways, then into a graph of blocks and jumps.',
  overview: 'A disassembler turns bytes into instructions, and x86 instructions have variable length, so where you start decoding decides what you see. A linear sweep starts at the first byte of the code and decodes one instruction after another. It covers everything, but data placed inside code, such as a small lookup table, gets decoded as plausible instructions, and the decoder can then straddle the real instruction boundaries: here the table bytes 31 c0 90 48 read as xorl and nop, and the real jump target at 0x14 is swallowed by an addq starting at 0x13. Tools such as objdump are linear sweeps and share the mistake. Recursive descent starts at a known entry and follows control flow: it continues after ordinary instructions, follows jumps, queues branch targets, and stops at returns; it never touches the table, but stops at an indirect jump whose targets it can\'t resolve. From decoded instructions come basic blocks, runs entered only at the top and left only at the bottom: split at the entry, at every jump or branch target, and after every control transfer. Edges follow from each block\'s last instruction. A block d dominates b if every path from the entry to b passes through d; an edge whose target dominates its source is a loop\'s back edge.',
  keywords: ['disassembly', 'linear sweep', 'recursive descent', 'control flow graph', 'basic blocks', 'dominators', 'reverse engineering'],
  orient: 'landscape',
  view: { target: [0.1, 0.3, 0.0], dir: [0.3, 0.95, 1.25], half: 1.3, wide: 4.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { fx: 0, m: 1, split: true, rpo: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the bytes as bricks (gold: the table inside lookup, coral when it is decoded as code); a bar under each run of bytes the decoder took as one instruction */
    const BX0 = -1.7, BW = 0.11, BZ = -0.7;
    const bp = P.box(31 * BW + 0.1, 0.03, 0.6, '#FFFFFF', { r: 0.03 }); bp.position.set(BX0 + 31 * BW / 2, 0, BZ + 0.08); S.add(bp);
    const cells = Array.from({ length: 31 }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), b = P.box(BW * 0.88, 0.16, 0.22, '#fff', { r: 0.01, material: mm }); b.position.set(BX0 + (i + 0.5) * BW, 0.03, BZ); b.userData.noFit = true; S.add(b); return { b, mm }; });
    const brk = Array.from({ length: 16 }, () => { const b = P.box(1, 0.06, 0.07, CHAR, { r: 0.01 }); b.userData.noFit = true; S.add(b); return b; });
    /* the control-flow graph: a block per basic block, rods for edges (red when an edge lands in a block's middle); gold blocks loop to themselves */
    const GX = 0.0, GZ = 0.45;
    const gp = P.box(2.2, 0.03, 1.0, '#FFFDF5', { r: 0.03 }); gp.position.set(GX, 0, GZ + 0.15); S.add(gp);
    const nodes = Array.from({ length: 6 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#5B8DB8' }), b = P.box(0.34, 0.22, 0.22, '#fff', { r: 0.03, material: mm }); b.userData.noFit = true; S.add(b); return { b, mm }; });
    const rods = Array.from({ length: 10 }, () => { const mm = new THREE.MeshLambertMaterial({ color: '#8E8C84' }), r = P.box(1, 0.04, 0.04, '#fff', { r: 0.01, material: mm }); r.userData.noFit = true; S.add(r); return { r, mm }; });
    const lamp = P.lamp(GOOD, { h: 0.6, r: 0.12 }); lamp.position.set(BX0 + 31 * BW + 0.35, 0, BZ); S.add(lamp);
    S.add(P.keep(BX0 - 0.1, BX0 + 31 * BW + 0.5, 0.9, BZ - 0.3, GZ + 0.7));

    let R = null;
    function compute() {
      const name = st.fx ? 'total' : 'lookup', F = FIX[name], code = F.bytes.split(' ').map(h => parseInt(h, 16));
      const ins = st.m === 0 ? sweep(F, code) : descent(F, code);
      const G = cfg(ins, st.split), dom = idoms(G, !st.rpo);
      return { name, F, code, ins, G, dom };
    }
    function draw() {
      R = compute();
      const { F, code, ins } = R;
      cells.forEach((c, i) => {
        const on = i < code.length; c.b.visible = on; if (!on) return;
        const a = F.base + i, isData = F.data && a >= F.data[0] && a < F.data[1], covered = ins.some(d => a >= d.at && a < d.end);
        c.mm.color.set(isData ? (covered ? BAD : '#F2C94C') : covered ? '#BFE6DD' : '#ECE8DF');
      });
      brk.forEach((b, j) => { const d = ins[j]; b.visible = !!d; if (!d) return; const x0 = BX0 + (d.at - F.base) * BW, w = d.n * BW; b.scale.x = w - 0.02; b.position.set(x0 + w / 2, 0.03, BZ + 0.2 + (j % 2) * 0.09); });
      const bl = R.G.blocks, pos = i => V(GX - 0.85 + (bl.length > 1 ? i * (1.7 / (bl.length - 1)) : 0.85), 0.03, GZ + (i % 2) * 0.35);
      nodes.forEach((nd, i) => { const b = bl[i]; nd.b.visible = !!b; if (!b) return; nd.b.position.copy(pos(i)); nd.mm.color.set(R.G.edges.some(e => e.to === b.at && e.from === b.at) ? SAF : '#5B8DB8'); });
      rods.forEach((rd, j) => {
        const e = R.G.edges[j], fi = e ? bl.findIndex(b => b.at === e.from) : -1, ti = e ? bl.findIndex(b => b.at === e.to) : -1;
        rd.r.visible = !!e && fi >= 0; if (!rd.r.visible) return;
        const A = pos(fi), B2 = ti >= 0 ? pos(ti) : A.clone().add(V(0.25, 0, 0.3)), d = B2.clone().sub(A), len = Math.max(0.15, Math.hypot(d.x, d.z));
        rd.r.scale.x = len; rd.r.position.set((A.x + B2.x) / 2, 0.28 + (e.k === 'taken' ? 0.06 : 0), (A.z + B2.z) / 2 + (fi === ti ? 0.18 : 0)); rd.r.rotation.y = -Math.atan2(d.z, d.x);
        rd.mm.color.set(e.bad ? RED : e.k === 'taken' ? SAF : '#8E8C84');
      });
      const tgt = ins.find(d => d.f === 'jump'), atTarget = tgt ? ins.find(d => d.at === tgt.target) : null;
      const good = R.name === 'lookup' ? !!atTarget : !R.G.edges.some(e => e.bad) && st.rpo && R.dom[0x5c] === 0x40;
      lamp.userData.set({ color: good ? GOOD : RED, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Function', options: ['lookup (table inside)', 'total (a loop)'], get: () => st.fx, act: i => set({ fx: i }) },
      { type: 'buttons', label: 'Decode by', options: ['Linear sweep', 'Recursive descent'], get: () => st.m, act: i => set({ m: i }) },
      { type: 'toggle', label: 'Split blocks at jump targets', short: 'Split at targets', get: () => st.split, set: v => set({ split: !!v }) },
      { type: 'toggle', label: 'Dominators by the iterative algorithm', short: 'Real dominators', get: () => st.rpo, set: v => set({ rpo: !!v }) },
    ];
    const readouts = [
      { label: 'Instructions', get: () => ({ v: `${R.ins.length}`, sub: st.m === 0 ? 'linear sweep' : 'recursive descent' }) },
      { label: 'Basic blocks', get: () => ({ v: `${R.G.blocks.length}`, sub: `${R.G.edges.length} ${R.G.edges.length === 1 ? "edge" : "edges"}` }) },
      { label: 'Data read as code', get: () => { const n = R.F.data ? R.ins.filter(d => d.at >= R.F.data[0] && d.at < R.F.data[1]).length : 0; return { v: `${n}`, sub: 'instructions in the table', bad: n > 0, good: !n }; } },
    ];
    const labels = [
      { name: 'bytes', t: 'The bytes', d: 'A brick per byte; dark bars mark each decoded instruction. Gold bricks are lookup\'s table, coral if decoded as code', icon: 'code', atV: V(BX0 - 0.1, 0.1, BZ) },
      { name: 'cfg', t: 'Control flow', d: 'A block per basic block; gold rods are jumps taken, grey fall-through, red an edge into a block\'s middle', icon: 'link', atV: V(GX - 1.12, 0.1, GZ + 0.15) },
      { name: 'res', t: 'Read right?', d: 'The jump lands on an instruction, edges and dominators correct', icon: 'check', atV: V(BX0 + 31 * BW + 0.55, 0.6, BZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Trust the sweep', hint: 'decode the table as code', on: () => set({ ...D0, m: 0 }), off: reset },
      { label: 'No split at jump targets', hint: 'blocks that hide a loop head', on: () => set({ ...D0, fx: 1, split: false }), off: reset },
      { label: 'Dominators from address order', hint: 'the block before must dominate', on: () => set({ ...D0, fx: 1, rpo: false }), off: reset },
    ];
    function status() {
      if (st.fx === 0 && st.m === 0) return { ok: false, msg: '<b>The sweep decoded the table bytes 31 c0 90 48 as "xorl; nop", then "addq" at 0x13, so no instruction starts at the jump target 0x14.</b> Every byte decoded and every mnemonic is real, yet the listing is wrong. objdump is a sweep too and agrees, so agreement proves nothing. Recursive descent from the entry follows the jump to 0x14 and never touches the table.' };
      if (st.fx === 1 && !st.split) return { ok: false, msg: '<b>Without splitting at jump targets, the loop head 0x50 sits in the middle of a block, and jne 0x50 points into it.</b> A basic block must be entered only at its first instruction. Every branch or jump target is a leader that starts a new block.' };
      if (st.fx === 1 && !st.rpo) return { ok: false, msg: `<b>Assuming each block is dominated by the one before it gives idom(0x5c) = ${hx(R.dom[0x5c])}, as if the early return passed through the loop.</b> It doesn't: 0x5c is reached straight from the entry. Compute dominators from the graph (the iterative algorithm in reverse postorder), not from addresses.` };
      if (st.fx === 0) return { ok: true, msg: '<b>Recursive descent: 6 instructions, and the jump at 0xe lands on "addl $0x1, %eax" at 0x14.</b> It followed control flow from the entry, so the four table bytes were never decoded as code. Its weakness is the opposite: an indirect jump with unknown targets would stop it.' };
      return { ok: true, msg: '<b>total: five blocks, five edges, and the loop found.</b> Leaders at the entry, after the jle, at the jne target 0x50, after the jne, and at the jle target 0x5c. 0x50 dominates itself, so 0x50→0x50 is the loop\'s back edge, and the early return 0x5c is dominated only by the entry.' };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Bytes into instructions', home: true, say: 'Back to the student\'s own program. x86 instructions vary in length, so where you start decoding decides what you see.', act: m => m.set({ fx: 0, m: 0, split: true, rpo: true }) },
    { t: 'The sweep', home: true, say: 'A linear sweep decodes from the first byte to the last. Here a small table sits inside the code. The sweep reads it as instructions, and the real jump target ends up inside one.', act: m => m.set({ m: 0 }) },
    { t: 'Follow the flow', home: true, say: 'Recursive descent starts at the entry and follows jumps. It lands exactly on the jump target and never touches the table.', act: m => m.set({ m: 1 }) },
    { t: 'Basic blocks', home: true, say: 'In another function, a loop. Split the instructions into blocks at the entry, at every jump target, and after every jump. Five blocks, five edges.', act: m => m.set({ fx: 1 }) },
    { t: 'Leaders matter', home: true, say: 'Forget to split at jump targets, and the loop\'s head hides inside a block, with a branch pointing into its middle.', act: m => m.set({ split: false }) },
    { t: 'Dominators and loops', home: true, say: 'A block dominates another if every path to it passes through it. Computed from the graph, the loop\'s back edge appears, and the early return depends only on the entry.', act: m => m.set({ split: true, rpo: true }) },
  ],
  check: [
    { q: 'Why can a linear sweep produce a wrong listing with no errors?', options: ['Data inside code decodes as plausible instructions and shifts the boundaries', 'It skips bytes', 'It can\'t read x86'], answer: 0, why: 'Every byte decodes, yet the jump target lands mid-instruction.', hint: 'Try Trust the sweep.' },
    { q: 'Where does a new basic block start?', options: ['At the entry, at every jump or branch target, and after every control transfer', 'Every ten instructions', 'At each function call'], answer: 0, why: 'Blocks are entered only at the top.', hint: 'Try No split at jump targets.' },
    { q: 'When is an edge a loop\'s back edge?', options: ['When its target dominates its source', 'When it goes backwards in address', 'When it is conditional'], answer: 0, why: '0x50 dominates 0x50.', hint: 'Look at total\'s loop.' },
  ],
  terms: [
    ['Linear sweep', 'Decoding instructions one after another from the start of the code.'],
    ['Recursive descent', 'Decoding by following control flow from known entry points.'],
    ['Basic block', 'A run of instructions entered only at the first and left only at the last.'],
    ['Leader', 'An instruction that starts a basic block.'],
    ['Control-flow graph', 'Basic blocks as nodes, possible jumps between them as edges.'],
    ['Dominator', 'A block every path from the entry to another block must pass through.'],
  ],
  deeper: '<p><b>Real binaries.</b> Measured on hundreds of compiled programs, inline data and overlapping code turned out rarer than feared; jump tables for switch statements are the common case, and resolving them is what lets recursive descent continue past an indirect jump.</p><p><b>The instruction format.</b> An x86-64 instruction is prefixes, an optional REX byte, an opcode from one of two maps, ModRM and SIB bytes selecting operands, a displacement and an immediate; each field has its own rule.</p><p><b>About this machine.</b> The decoder here knows only the opcodes in the two fixtures, so you can see every step; the bytes are those clang emits for the course\'s fixtures, and the dominators come from the same iterative algorithm real tools use.</p>',
  code: {
    title: 'Recursive descent in a few lines',
    note: 'Adapted from the course\'s disassembly lesson.',
    text: `
def recursive_descent(code, entry):
    seen, work = {}, [entry]
    while work:
        address = work.pop()
        while address not in seen:
            ins = decode(code, address)
            seen[address] = ins
            if ins.flow == "return":
                break
            if ins.flow == "jump":
                address = ins.target          # follow it
                continue
            if ins.flow == "branch":
                work.append(ins.target)       # and fall through
            if ins.flow == "indirect-jump":
                break                         # needs a jump-table resolver
            address = ins.end
    return sorted(seen.values(), key=lambda i: i.address)
`,
  },
};
