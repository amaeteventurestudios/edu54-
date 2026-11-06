// Build it yourself: proof of work (after Programming Blockchains Step-by-Step). A Kano grain market's chain. A real nonce search with a small hash: each extra hex zero multiplies expected tries by 16. Editing an old block means redoing every block after it, which the lesson counts.
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 1540483477); h ^= h >>> 15; return (h >>> 0).toString(16).padStart(8, '0'); };
function mine(data, prev, zeros) { const want = '0'.repeat(zeros); for (let n = 0; n < 400000; n++) { const h = hash(`${prev}|${data}|${n}`); if (h.startsWith(want)) return { n, h, tries: n + 1 }; } return { n: -1, h: '', tries: 400000 }; }
const DATA = ['maize 40 sacks', 'millet 25 sacks', 'groundnuts 12 sacks', 'sorghum 30 sacks', 'rice 18 sacks'];
function run(o) {
  let prev = '0'.repeat(8), total = 0, redo = 0; const blocks = [];
  DATA.forEach((d, i) => {
    const m = mine(d, prev, o.zeros); total += m.tries; blocks.push({ ...m, d, prev }); prev = m.h;
  });
  if (o.edit) {
    let p = i0 => (i0 ? blocks[i0 - 1].h : '0'.repeat(8));
    let cur = p(1), broke = false;
    blocks.forEach((b, i) => {
      if (i < 1) return;
      const d = i === 1 ? 'millet 95 sacks' : b.d;
      if (o.remine) { const m = mine(d, cur, o.zeros); redo += m.tries; cur = m.h; b.h = m.h; }
      else { const h = hash(`${cur}|${d}|${b.n}`); b.bad = !h.startsWith('0'.repeat(o.zeros)) || h !== b.h || broke; broke = b.bad; cur = h; b.h = h; }
    });
  }
  return { blocks, total, redo, tip: blocks[4].h, bad: blocks.filter(b => b.bad).length };
}

export default {
  slug: 'build-a-proof-of-work',
  title: 'Build your own proof of work',
  description: 'Search for a hash that starts with zeros. It\'s slow to find, instant to check, and that\'s the whole trick.',
  overview: 'Why not just rewrite a hash chain, and recompute every hash? Because proof of work makes each block expensive. A block counts only if its hash starts with a set number of zeros. A hash can\'t be steered, so a miner tries nonce after nonce. Each extra hex zero multiplies the expected work by sixteen. Checking takes one hash. To change an old block, you have to redo that block and all those after it, while others keep extending the chain. This mines five blocks for a grain market in Kano. It really searches, and counts each try.',
  keywords: ['proof of work', 'nonce', 'difficulty', 'mining', 'blockchain', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { zeros: 2, edit: false, remine: false }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.95;
    const T = DATA.map((d, i) => { const t = add(P.tower(0.5, 0.4, GOOD)); t.position.set(X(i), 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.4, 2.4, 1.3, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); R.blocks.forEach((b, i) => T[i].userData.set({ h: Math.max(0.05, Math.min(1.2, (Math.log2(b.tries + 1)) * 0.075)), color: b.bad ? RED : st.edit && st.remine && i >= 1 ? SAF : GOOD })); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Leading zeros', min: 0, max: 4, step: 1, get: () => st.zeros, set: v => set({ zeros: v }) },
      { type: 'toggle', label: 'Edit block two', short: 'Edit', get: () => st.edit, set: v => set({ edit: !!v }) },
      { type: 'toggle', label: 'Mine again after editing', short: 'Mine again', get: () => st.remine, set: v => set({ remine: !!v }) },
    ];
    const readouts = [
      { label: 'Tries to mine five', get: () => ({ v: R.total.toLocaleString('en'), sub: `about ${(16 ** st.zeros * 5).toLocaleString('en')} expected` }) },
      { label: 'Tries to check five', get: () => ({ v: '5', good: true }) },
      { label: 'After the edit', get: () => (st.edit ? (st.remine ? { v: `${R.redo.toLocaleString('en')} tries`, sub: 'to redo four blocks', bad: R.redo > 1000 } : { v: `${R.bad} blocks broken`, bad: R.bad > 0 }) : { v: 'no edit' }) },
    ];
    const labels = [
      { name: 'a', t: 'Five blocks', d: 'Height: tries, on a log scale', icon: 'box', atV: V(X(0) - 0.27, 0.2, -0.1) },
      { name: 'b', t: 'Latest block', d: 'Red: its hash no longer fits', icon: 'target', atV: V(X(4) + 0.27, 0.2, -0.1) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'No difficulty', hint: 'every hash counts', on: () => set({ ...D0, zeros: 0, edit: true, remine: true }), off: reset },
      { label: 'Edit and don\'t mine', hint: 'the chain shows it', on: () => set({ ...D0, edit: true }), off: reset },
    ];
    function status() {
      if (st.edit && !st.remine) return R.bad ? { ok: false, msg: `<b>${R.bad} blocks no longer fit.</b> The edit changed a hash, and each later block links to the one before.` } : { ok: false, msg: '<b>With no zeros required, the edit passes the zero test.</b> Only the links can show it.' };
      if (st.zeros === 0) return { ok: false, msg: `<b>Rewriting history took ${R.redo || 5} tries.</b> With no difficulty, anyone can rebuild the whole chain at once.` };
      if (st.edit) return { ok: true, msg: `<b>${R.redo.toLocaleString('en')} tries to redo four blocks.</b> And the honest chain kept growing meanwhile.` };
      return { ok: true, msg: `<b>${st.zeros} zeros: ${R.total.toLocaleString('en')} tries to mine, five to check.</b> Each extra zero is sixteen times the work.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Too easy', home: true, say: 'A grain market in Kano keeps a hash chain. Anyone could rewrite it and recompute every hash.', act: m => m.set({ zeros: 0, edit: false, remine: false }) },
    { t: 'A puzzle', home: true, say: 'A block counts only if its hash starts with zeros. So a miner tries nonce after nonce.', act: m => m.set({ zeros: 1, edit: false, remine: false }) },
    { t: 'Harder', home: true, say: 'Each extra zero means sixteen times the work.', act: m => m.set({ zeros: 3, edit: false, remine: false }) },
    { t: 'Easy to check', home: true, say: 'Finding took thousands of tries. Checking takes one hash per block.', act: m => m.set({ zeros: 3, edit: false, remine: false }) },
    { t: 'Change the past', home: true, say: 'Edit one old block, and every later block breaks.', act: m => m.set({ zeros: 2, edit: true, remine: false }) },
    { t: 'Redo it all', home: true, say: 'To hide the edit, redo all the work, while others keep building ahead of you.', act: m => m.set({ zeros: 3, edit: true, remine: true }) },
  ],
  check: [
    { q: 'What is a nonce for?', options: ['Changing the hash until it fits', 'Signing the block', 'Storing data'], answer: 0, why: 'A hash can\'t be steered.', hint: 'See A puzzle.' },
    { q: 'What does one more hex zero do?', options: ['Sixteen times the work', 'Twice the work', 'Nothing'], answer: 0, why: 'One sixteenth of hashes pass.', hint: 'Move Leading zeros.' },
    { q: 'Why can\'t you edit an old block?', options: ['Every later block must be redone', 'It is locked', 'It is deleted'], answer: 0, why: 'Each links to the one before.', hint: 'See Change the past.' },
  ],
  terms: [['Nonce', 'A number used once.'], ['Difficulty', 'How many zeros are needed.'], ['Hash', 'A fixed-length fingerprint.'], ['Mining', 'Searching for a valid nonce.']],
  deeper: '<p><b>Real searching.</b> Every try here is really computed, with a small hash made for this lesson. Real chains use SHA-256 and adjust difficulty to keep block times steady.</p><p><b>Cost.</b> This work uses real power, which is why some chains moved to proof of stake.</p>',
  credit: 'Built from <a href="https://github.com/yukimotopress/programming-blockchains-step-by-step" target="_blank" rel="noopener">Programming Blockchains Step-by-Step</a> (CC0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short miner, written for this lesson.',
  code: {
    title: 'The search',
    note: 'Our own short version.',
    text: `
function mine(data, prev, zeros) {
  const want = "0".repeat(zeros);
  for (let nonce = 0; ; nonce++) {
    const h = hash(prev + data + nonce);
    if (h.startsWith(want)) return { nonce, h };
  }
}
`,
  },
};
