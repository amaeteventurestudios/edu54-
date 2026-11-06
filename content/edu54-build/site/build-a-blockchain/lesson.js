// Build your own blockchain: an invented farmers' cooperative in Mbale records crate deliveries in five linked blocks. Each block stores the
// previous block's hash, and proof of work requires its own hash (a 32-bit FNV-1a here, shown in hex) to start with a number of zeros, found
// by trying nonces; the blocks are really mined in the page. Changing an old delivery breaks its hash and the next block's link. An attacker
// can re-mine the changed block and every one after it, but nodes that keep the chain with the most work reject it while the honest network
// keeps adding blocks, unless the difficulty is zero and blocks cost nothing.
const DATA = ['genesis', 'Nabirye · 14 crates', 'Okello · 12 crates', 'Wanyama · 9 crates', 'Auma · 17 crates'];
const TAMPERED = 'Okello · 21 crates';
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
function mine(idx, prev, data, d) { const z = '0'.repeat(d); let nonce = 0, h; do { h = fnv(`${idx}|${prev}|${data}|${nonce}`); nonce++; } while (!h.startsWith(z)); return { nonce: nonce - 1, hash: h, tries: nonce }; }
const cache = {};
function chain(d) {
  if (cache[d]) return cache[d];
  const out = []; let prev = '00000000';
  DATA.forEach((data, i) => { const m = mine(i, prev, data, d); out.push({ i, prev, data, ...m }); prev = m.hash; });
  return (cache[d] = out);
}
function build(o) {
  const z = '0'.repeat(o.d), honest = chain(o.d);
  let blocks = honest.map(b => ({ ...b, ok: true, link: true }));
  let attackTries = 0;
  if (o.tamper) {
    if (o.remine) {
      let prev = blocks[1].hash; blocks = blocks.slice(0, 2);
      for (let i = 2; i < DATA.length; i++) { const data = i === 2 ? TAMPERED : DATA[i]; const m = mine(i, prev, data, o.d); attackTries += m.tries; blocks.push({ i, prev, data, ...m, ok: true, link: true, changed: true }); prev = m.hash; }
    } else {
      blocks[2] = { ...blocks[2], data: TAMPERED, hash: fnv(`2|${blocks[2].prev}|${TAMPERED}|${blocks[2].nonce}`), changed: true };
      blocks[2].ok = blocks[2].hash.startsWith(z);
      blocks[3] = { ...blocks[3], link: blocks[3].prev === blocks[2].hash };
    }
  }
  const valid = blocks.every(b => b.ok && b.link);
  // honest network: 10 times the attacker's hashing power, one block a minute
  const honestAdded = o.d === 0 ? 0 : 30;
  const accepted = !o.tamper ? true : !o.validate ? true : !valid ? false : o.longest ? honestAdded === 0 : true;
  return { blocks, valid, attackTries, honestAdded, accepted, fooled: o.tamper && accepted };
}

export default {
  slug: 'build-a-blockchain',
  title: 'Build your own blockchain',
  description: 'A farmers\' cooperative records crate deliveries in a chain of blocks, each holding the last one\'s hash. Change one, and the chain breaks.',
  overview: 'A blockchain is a shared ledger that many computers keep at once, with no one in charge, designed so that history is very hard to rewrite. Records are grouped into blocks. Each block stores the hash of the block before it, a short fingerprint computed from its contents, so changing anything in an old block changes its hash and breaks the link from the next block, and from every block after. Anyone can check the chain by recomputing the hashes. That alone does not stop a forger from recomputing every hash after the change, so proof of work makes each block expensive: its own hash must start with a set number of zeros, and the only way to find one is to try nonce after nonce, about sixteen times more tries for every extra zero in hexadecimal. Nodes follow the chain with the most accumulated work. To rewrite an old block, an attacker must redo the work for it and every later block and then overtake the honest network, which keeps adding blocks; with less hashing power than everyone else together, the attacker falls further behind. That is why Bitcoin\'s security rests on no one controlling most of the hashing power. Real chains also sign transactions with private keys, use Merkle trees so one hash covers every record in a block, and adjust the difficulty to keep blocks coming at a steady pace. Proof of stake replaces hashing with deposits: validators lock up coins, are chosen to propose blocks in proportion to their stake, and lose part of it if caught signing two conflicting blocks. This machine records crate deliveries for an invented cooperative store in Mbale; each block is mined in your browser.',
  keywords: ['build your own blockchain', 'proof of work', 'hash chain', 'nonce', 'longest chain', 'proof of stake', 'tamper evidence'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.25, -0.15], dir: [0.05, 0.85, 1.2], half: 0.95, wide: 5.8 },
  credit: 'Built from <a href="https://github.com/conradoqg/naivecoin" target="_blank" rel="noopener">naivecoin</a> (Apache-2.0), <a href="https://github.com/SavjeeTutorials/SavjeeCoin" target="_blank" rel="noopener">SavjeeCoin</a> (MIT), <a href="https://github.com/yukimotopress/programming-blockchains-step-by-step" target="_blank" rel="noopener">Programming Blockchains Step-by-Step</a> (CC0) and <a href="https://naivecoinstake.learn.uno/" target="_blank" rel="noopener">NaivecoinStake</a> (Apache-2.0), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short hash chain and miner, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { d: 3, tamper: true, remine: true, validate: true, longest: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA', CRATE = '#C9A16A', FORGE = '#7A4FB5';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    const BX = i => -2.2 + i * 0.85, FZ = 0.15, HZ = -0.75;
    const CR = [0, 14, 12, 9, 17], TCR = 21;
    // a block: a pallet carrying its crates, with one gold coin of work per leading zero
    const block = (x, z, s = 1) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); S.add(g);
      const pm = own('#5B6C80'), pal = P.box(0.62 * s, 0.1, 0.62 * s, '#fff', { r: 0.04, material: pm }); g.add(pal);
      const crates = P.stack(0.26 * s, 0.26 * s, 0.13 * s, { max: 7 }); crates.position.set(-0.1 * s, 0.1, 0); g.add(crates);
      const coins = P.stack(0.16 * s, 0.16 * s, 0.05, { max: 4 }); coins.position.set(0.19 * s, 0.1, 0.15 * s); g.add(coins);
      g.userData = { pm, crates, coins }; return g;
    };
    const front = DATA.map((_, i) => block(BX(i), FZ));
    const linkM = DATA.map(() => own(GOOD)), links = DATA.map((_, i) => { if (!i) return null; const r = P.rod(V(BX(i - 1) + 0.31, 0.06, FZ), V(BX(i) - 0.31, 0.06, FZ), 0.035, GOOD, { material: linkM[i] }); S.add(r); return r; });
    // the honest network's chain, which kept growing while the attacker re-mined
    const back = [2, 3, 4, 5, 6].map(i => block(BX(i), HZ, 0.8));
    const backLinks = [1, 2, 3, 4, 5].map(i => { const a = i === 1 ? V(BX(1), 0.06, FZ - 0.31) : V(BX(i) + 0.25, 0.06, HZ), b = V(BX(i + 1) - 0.25, 0.06, HZ); const r = P.rod(a, b, 0.03, GOOD); S.add(r); return r; });
    // a node deciding which chain to follow
    const node = P.robot('#3F4049', { scale: 0.9 }); node.position.set(2.45, 0, 0.55); S.add(node);
    const pickM = own(SAF), pick = P.rod(V(2.45, 0.6, 0.55), V(BX(4), 0.3, FZ), 0.02, SAF, { material: pickM }); pick.userData.noFit = true; S.add(pick);
    S.add(P.keep(-2.55, 3.0, 0.95, -1.1, 0.85));
    let R = null;
    function draw() {
      R = build(st);
      const remined = st.tamper && st.remine;
      R.blocks.forEach((b, i) => {
        const U = front[i].userData, n = b.data === TAMPERED ? TCR : CR[i];
        U.crates.userData.set({ n: Math.round(n / 3), colors: Array(7).fill(b.data === TAMPERED ? BAD : CRATE) });
        U.coins.userData.set({ n: b.ok ? st.d : 0, colors: Array(4).fill(SAF) });
        U.pm.color.set(!b.ok ? BAD : b.changed && remined ? FORGE : '#5B6C80');
        if (links[i]) linkM[i].color.set(b.link ? (b.changed && remined ? FORGE : GOOD) : BAD);
      });
      const honest = chain(st.d), extra = remined && R.honestAdded > 0;
      back.forEach((g, k) => {
        const i = k + 2, show = extra && (i < 5 || true);
        g.visible = show; if (!show) return;
        const U = g.userData; U.crates.userData.set({ n: i < 5 ? Math.round(CR[i] / 3) : 4, colors: Array(7).fill(CRATE) });
        U.coins.userData.set({ n: st.d, colors: Array(4).fill(SAF) }); U.pm.color.set('#5B6C80');
      });
      backLinks.forEach(r => r.visible = extra);
      node.userData.set({ lamp: R.fooled ? BAD : GOOD });
      const followBack = extra && st.longest && st.validate;
      pick.visible = st.tamper;
      P.setRod(pick, V(2.3, 0.55, 0.5), followBack ? V(BX(6) + 0.1, 0.25, HZ) : V(BX(4) + 0.2, 0.3, FZ));
      pickM.color.set(R.fooled ? BAD : GOOD);
    }
    const tick = dt => node.userData.tick(dt);
    function isOk() { return !R.fooled; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'Difficulty (leading zeros)', min: 0, max: 4, step: 1, get: () => st.d, set: v => set({ d: +v }), fmt: v => `${v}` },
      { type: 'toggle', label: 'Change Okello\'s delivery in block 2', short: 'Tamper', get: () => st.tamper, set: v => set({ tamper: !!v }) },
      { type: 'toggle', label: 'Attacker re-mines every block after it', short: 'Re-mine', get: () => st.remine, set: v => set({ remine: !!v, tamper: v ? true : st.tamper }) },
      { type: 'toggle', label: 'Nodes recheck every hash and link', short: 'Validate', get: () => st.validate, set: v => set({ validate: !!v }) },
      { type: 'toggle', label: 'Follow the chain with the most work', short: 'Most work', get: () => st.longest, set: v => set({ longest: !!v }) },
    ];
    const readouts = [
      { label: 'Chain', get: () => ({ v: R.valid ? 'valid' : 'broken', sub: 'hashes and links', good: R.valid || st.validate, bad: !R.valid && !st.validate }) },
      { label: 'Tries per block', get: () => ({ v: st.d ? Math.pow(16, st.d).toLocaleString('en') : '1', sub: 'on average', good: st.d >= 2, bad: st.d === 0 }) },
      { label: 'History', get: () => ({ v: R.fooled ? 'rewritten' : 'safe', sub: 'block 2', good: !R.fooled, bad: R.fooled }) },
    ];
    const labels = [
      { name: 'c', t: 'Five linked blocks', d: 'Crates: deliveries. Gold coins: work done', icon: 'link', atV: V(BX(0) - 0.31, 0.06, FZ) },
      { name: 'n', t: 'A node choosing a chain', d: 'Plum: the attacker\'s blocks', icon: 'target', atV: V(2.68, 0.3, 0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let nodes skip the checks', hint: 'tampered block accepted', on: () => set({ ...D0, remine: false, validate: false }), off: reset },
      { label: 'Set the difficulty to zero', hint: 'rewrites cost nothing', on: () => set({ ...D0, d: 0, tamper: true, remine: true }), off: reset },
      { label: 'Accept any valid chain', hint: 'not the most work', on: () => set({ ...D0, tamper: true, remine: true, longest: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.tamper) return { ok: true, msg: `<b>Five blocks, each mined to a hash starting with ${st.d} zero${st.d === 1 ? '' : 's'} and each holding the hash of the one before: every link checks out.</b> Turn on Tamper to change an old delivery and see what happens.` };
      if (!st.validate && st.remine) return { ok: false, msg: '<b>The nodes took the attacker\'s re-mined chain without checking it against the work in their own, so the forged delivery of 21 crates became history.</b> Every node must verify each chain and compare its accumulated work before switching.' };
      if (!st.validate) return { ok: false, msg: '<b>Block 2 now says 21 crates instead of 12, its hash no longer matches and block 3\'s link is broken, but the nodes never rechecked, so they accepted it.</b> Every node must recompute every hash and link before trusting a chain.' };
      if (!st.remine) return { ok: true, msg: '<b>Changing block 2 changed its hash, so it no longer starts with the required zeros and block 3\'s link no longer matches: every node that rechecks the chain rejects it.</b> To get away with it, the attacker would have to re-mine block 2 and every block after it.' };
      if (st.d === 0) return { ok: false, msg: `<b>With difficulty zero, re-mining blocks 2 to 4 took only ${r.attackTries} tries, done before the honest network added a single block, so the forged chain is as long and as valid as the real one and is accepted.</b> Proof of work makes each block cost real effort.` };
      if (!st.longest) return { ok: false, msg: `<b>The attacker spent ${r.attackTries.toLocaleString('en')} tries re-mining three blocks, and the nodes accepted the forged chain simply because it was valid.</b> Nodes must follow the chain with the most accumulated work; the honest network adds about ${r.honestAdded} blocks while the attacker redoes three.` };
      return { ok: true, msg: `<b>The attacker re-mined three blocks in ${r.attackTries.toLocaleString('en')} tries, a valid chain, but the honest network, with ten times the hashing power, added about ${r.honestAdded} blocks meanwhile, so the forged chain has less work and is rejected.</b> Rewriting history means outworking everyone else.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A shared ledger', home: true, say: 'A cooperative records crate deliveries in blocks. Each block holds the hash of the block before it.', act: m => m.set({ d: 0, tamper: false, remine: false, validate: true, longest: true }) },
    { t: 'Proof of work', home: true, say: 'A block\'s own hash must start with zeros. The only way is to try nonce after nonce.', act: m => m.set({ d: 3, tamper: false, remine: false, validate: true, longest: true }) },
    { t: 'Change the past', home: true, say: 'Change one old delivery and its hash changes. The next block\'s link breaks.', act: m => m.set({ d: 3, tamper: true, remine: false, validate: true, longest: true }) },
    { t: 'Re-mine the rest', home: true, say: 'An attacker can re-mine the changed block and every one after it. Now the chain is valid again.', act: m => m.set({ d: 3, tamper: true, remine: true, validate: true, longest: false }) },
    { t: 'Most work wins', home: true, say: 'But the honest network kept adding blocks. Nodes follow the chain with the most work, so the forgery loses.', act: m => m.set({ d: 3, tamper: true, remine: true, validate: true, longest: true }) },
    { t: 'Work matters', home: true, say: 'With no difficulty, rewriting history costs nothing. Proof of work is the price of a block.', act: m => m.set({ d: 0, tamper: true, remine: true, validate: true, longest: true }) },
  ],
  check: [
    { q: 'Why does changing an old block break the chain?', options: ['Its hash changes, so the next block\'s stored hash no longer matches', 'Blocks are locked', 'The data is encrypted'], answer: 0, why: 'Each block holds the previous hash.', hint: 'Try Tamper.' },
    { q: 'What does proof of work require?', options: ['A hash starting with set zeros, found by trying nonces', 'A password', 'A signature'], answer: 0, why: 'About 16 times more tries per zero.', hint: 'Move the difficulty.' },
    { q: 'Why does an attacker with less power fail?', options: ['Nodes follow the chain with the most work, and the honest network keeps adding it', 'Re-mining is impossible', 'Hashes can\'t change'], answer: 0, why: 'The attacker falls behind.', hint: 'Try Accept any valid chain.' },
  ],
  terms: [
    ['Hash', 'A short fingerprint of data; any change gives a different one.'],
    ['Block', 'A group of records plus the previous block\'s hash.'],
    ['Nonce', 'A number changed again and again while mining.'],
    ['Proof of work', 'A hash below a target, costly to find and cheap to check.'],
    ['Most-work rule', 'Nodes follow the chain with the most accumulated work.'],
    ['Proof of stake', 'Choosing block makers by locked-up deposits instead of hashing.'],
  ],
  deeper: '<p><b>Keys and trees.</b> Real chains sign each transaction with the sender\'s private key and use a Merkle tree so one hash in the block covers every record.</p><p><b>Difficulty adjustment.</b> As hashing power grows, the network raises the difficulty to keep blocks coming at a steady pace.</p><p><b>About this machine.</b> The cooperative is invented; the hash is a small 32-bit one, far weaker than the SHA-256 real chains use.</p>',
  code: {
    title: 'Mine and check a chain',
    note: 'Our own short version, written for this lesson.',
    text: `
import hashlib

def block_hash(index, prev, data, nonce):
    return hashlib.sha256(f"{index}|{prev}|{data}|{nonce}".encode()).hexdigest()

def mine(index, prev, data, difficulty):
    nonce = 0
    while True:
        h = block_hash(index, prev, data, nonce)
        if h.startswith("0" * difficulty):
            return nonce, h
        nonce += 1

def valid(chain, difficulty):
    for prev, block in zip(chain, chain[1:]):
        if block.prev != prev.hash:
            return False                                     # broken link
        if block_hash(block.index, block.prev, block.data, block.nonce) != block.hash:
            return False                                     # edited contents
        if not block.hash.startswith("0" * difficulty):
            return False                                     # no proof of work
    return True
`,
  },
};
