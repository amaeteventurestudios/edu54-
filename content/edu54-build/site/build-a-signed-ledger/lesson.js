// Build it yourself: a signed ledger (after SavjeeCoin). A Maputo savings circle keeps a shared list of transfers. Each transfer is signed, each block links to the last, balances come from replaying the chain, and a mining reward pays the miner. A toy hash and toy keyed signature, computed live.
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0; return h.toString(16).padStart(8, '0'); };
const sign = (key, t) => hash(`${key}|${t.from}>${t.to}:${t.n}`);
const KEYS = { Amina: 'k-amina', Bento: 'k-bento', Celia: 'k-celia' };
const START = { Amina: 50, Bento: 20, Celia: 0 };
const TX = [{ from: 'Amina', to: 'Bento', n: 10 }, { from: 'Bento', to: 'Celia', n: 25 }, { from: 'Celia', to: 'Amina', n: 5 }, { from: 'Amina', to: 'Celia', n: 15 }];
function run(o) {
  const bal = { ...START }, chain = []; let prev = '00000000', firstBad = -1, why = '';
  TX.forEach((base, i) => {
    const t = { ...base }; if (o.spend && i === 3) t.n = 500; t.sig = sign(o.forge && i === 1 ? 'k-stolen' : KEYS[t.from], t);
    if (o.tamper && i === 1) t.n = 2;
    let ok = true;
    if (o.check && t.sig !== sign(KEYS[t.from], t)) { ok = false; why = why || 'signature'; }
    if (o.funds && bal[t.from] < t.n) { ok = false; why = why || 'funds'; }
    if (!ok && firstBad < 0) firstBad = i;
    const body = `${prev}|${t.from}>${t.to}:${t.n}|${t.sig}`, h = hash(body);
    chain.push({ ...t, ok, h, prev }); prev = h;
    if (ok) { bal[t.from] -= t.n; bal[t.to] += t.n; if (o.reward) bal.Celia += 1; }
  });
  return { chain, bal, firstBad, why, neg: Object.values(bal).some(v => v < 0), tip: prev, total: Object.values(bal).reduce((a, b) => a + b, 0) };
}

export default {
  slug: 'build-a-signed-ledger',
  title: 'Build your own signed ledger',
  description: 'A chain of signed transfers, with balances replayed from the start and a reward for the miner.',
  overview: 'A hash chain proves that history wasn\'t edited. It doesn\'t prove who agreed to it. So add transfers. Each one is signed with the sender\'s private key, and anyone can check it. Nobody stores a balance: you replay the chain from the first block, and that also shows if a sender is spending what they don\'t have. The miner earns a reward for each block, which is how new coins enter. Here a savings circle in Maputo runs a small chain with a toy hash and a toy signature, so you can see each rule refuse a bad transfer. Never use these toys for real money.',
  keywords: ['blockchain', 'digital signature', 'transactions', 'ledger', 'build your own', 'mining reward'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.7, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { check: true, funds: true, reward: true, tamper: false, forge: false, spend: false }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#B5462F', BLUE = '#5B8DB8', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 1.2;
    const Bk = TX.map((t, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GOOD }), b = P.box(0.65, 0.34, 0.6, '#fff', { r: 0.05, material: m }); b.position.set(X(i), 0.03, -0.28); S.add(b); if (i) { const l = P.box(0.55, 0.05, 0.08, '#6E6A60'); l.position.set(X(i) - 0.6, 0.18, -0.28); S.add(l); } return m; });
    const Tw = Object.keys(START).map((k, i) => { const t = add(P.tower(0.34, 0.4, BLUE)); t.position.set(X(0) + 0.6 + i * 1.2, 0.03, 0.42); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.4, 2.4, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); Bk.forEach((m, i) => m.color.set(R.chain[i].ok ? GOOD : RED)); Object.keys(START).forEach((k, i) => Tw[i].userData.set({ h: Math.max(0.03, Math.min(1.1, Math.abs(R.bal[k]) * 0.02)), color: R.bal[k] < 0 ? RED : BLUE })); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('check', 'Check signatures', 'Signatures'), tg('funds', 'Check balances', 'Balances'), tg('reward', 'Pay Celia as the miner', 'Reward'), tg('tamper', 'Change an amount afterwards', 'Tamper'), tg('forge', 'Sign with the wrong key', 'Forge'), tg('spend', 'Spend far too much', 'Overspend')];
    const readouts = [
      { label: 'Balances', get: () => ({ v: `${R.bal.Amina}, ${R.bal.Bento}, ${R.bal.Celia}`, sub: 'Amina, Bento, Celia', bad: R.neg }) },
      { label: 'Refused', get: () => ({ v: `${R.chain.filter(t => !t.ok).length} of 4`, sub: R.why || 'none' }) },
      { label: 'Chain tip', get: () => ({ v: R.tip }) },
    ];
    const labels = [
      { name: 'b', t: 'Blocks of signed transfers', d: 'Red: refused', icon: 'link', atV: V(X(0) - 0.33, 0.2, -0.28) },
      { name: 't', t: 'Balances, replayed', d: 'Nobody stores these', icon: 'scale', atV: V(X(2) + 0.77, 0.15, 0.42) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forge with no check', hint: 'anyone can spend it', on: () => set({ ...D0, check: false, forge: true }), off: reset },
      { label: 'Change an amount, no check', hint: 'the signature no longer fits', on: () => set({ ...D0, check: false, tamper: true }), off: reset },
      { label: 'Overspend with no balance check', hint: 'a coin from nowhere', on: () => set({ ...D0, funds: false, spend: true }), off: reset },
    ];
    function status() {
      if (st.spend && !st.funds) return { ok: false, msg: `<b>Amina\'s balance is ${R.bal.Amina}.</b> Nobody replayed the chain before accepting, so one sender spent coins that never existed.` };
      if ((st.forge || st.tamper) && !st.check) return { ok: false, msg: `<b>The bad transfer was accepted.</b> Hashes link blocks, but only a signature check shows who agreed.` };
      if (R.firstBad >= 0) return { ok: true, msg: `<b>Transfer ${R.firstBad + 1} refused: ${R.why === 'funds' ? 'not enough balance' : 'the signature doesn\'t fit'}.</b> ${R.chain.filter(t => !t.ok).length > 1 ? 'A later transfer that relied on it failed too.' : 'The other transfers stand.'}` };
      return { ok: true, msg: `<b>All four transfers check out.</b> Replaying them gives the balances${st.reward ? ', and the miner earned one coin per block' : ''}.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Who agreed?', home: true, say: 'A savings circle in Maputo keeps a shared list of transfers. A hash chain shows that it wasn\'t edited, but not who agreed.', act: m => m.set({ check: false, funds: false, reward: false, tamper: false, forge: false, spend: false }) },
    { t: 'Sign it', home: true, say: 'Each sender signs a transfer with a private key. Anyone can check that signature.', act: m => m.set({ check: true, funds: false, reward: false, tamper: false, forge: true, spend: false }) },
    { t: 'Change a number', home: true, say: 'Change the amount afterwards, and the signature no longer fits.', act: m => m.set({ check: true, funds: false, reward: false, tamper: true, forge: false, spend: false }) },
    { t: 'Replay', home: true, say: 'Nobody stores a balance. You replay every transfer from the start.', act: m => m.set({ check: true, funds: true, reward: false, tamper: false, forge: false, spend: true }) },
    { t: 'The reward', home: true, say: 'Whoever mines a block earns a reward. That is how new coins enter.', act: m => m.set({ check: true, funds: true, reward: true, tamper: false, forge: false, spend: false }) },
    { t: 'Three rules', home: true, say: 'Linked blocks, valid signatures, enough balance. Remove one, and the ledger can\'t be trusted.', act: m => m.set({ check: true, funds: true, reward: true, tamper: false, forge: false, spend: false }) },
  ],
  check: [
    { q: 'What does a signature prove?', options: ['The owner of the key agreed', 'The block is old', 'The balance is high'], answer: 0, why: 'The hash chain can\'t show that.', hint: 'See Sign it.' },
    { q: 'Where does a balance come from?', options: ['Replaying the chain', 'A stored field', 'The miner\'s word'], answer: 0, why: 'History is the only record.', hint: 'See Replay.' },
    { q: 'How do new coins enter?', options: ['Mining rewards', 'Signatures', 'Replays'], answer: 0, why: 'A reward has no sender.', hint: 'See The reward.' },
  ],
  terms: [['Private key', 'The secret used to sign.'], ['Public key', 'What others use to check.'], ['Signature', 'Proof that a key holder agreed.'], ['Mining reward', 'New coins paid to a block\'s miner.']],
  deeper: '<p><b>A toy.</b> Real ledgers use elliptic-curve signatures, where checking needs no secret. This toy keeps all keys in one place, so that you can see the rule.</p><p><b>Next.</b> See how miners compete in the proof of work lesson.</p>',
  credit: 'Built from <a href="https://github.com/SavjeeTutorials/SavjeeCoin" target="_blank" rel="noopener">SavjeeCoin</a> (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short ledger, written for this lesson.',
  code: {
    title: 'Accepting a transfer',
    note: 'Our own short version. Keep a list of blocks and try it.',
    text: `
function accept(tx, balances) {
  if (!verify(tx.signature, tx.from, tx.body)) return false;
  if (balances[tx.from] < tx.amount) return false;
  balances[tx.from] -= tx.amount;
  balances[tx.to] += tx.amount;
  return true;
}
`,
  },
};
