// Build it yourself: proof of stake (after NaivecoinStake). Four validators at a Gaborone co-op. A seeded lottery picks each block's author in proportion to coins staked. A real count over 2,000 draws shows share follows stake. Slashing burns stake for signing two blocks at one height.
const NAMES = ['Lesego', 'Thabo', 'Neo', 'Kagiso'];
function pick(st, r) { const t = st.reduce((a, b) => a + b, 0); let x = r * t; for (let i = 0; i < st.length; i++) { x -= st[i]; if (x < 0) return i; } return st.length - 1; }
function run(o) {
  const stake = [...o.stake]; let s = 2463534242; const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  if (o.cheat && o.slash) stake[3] = Math.round(stake[3] * 0.25);
  const wins = [0, 0, 0, 0], N = 2000; let lastBig = 0, run1 = 0, longest = 0;
  for (let i = 0; i < N; i++) { const w = o.first ? stake.indexOf(Math.max(...stake)) : pick(stake, rnd()); wins[w]++; run1 = w === lastBig ? run1 + 1 : 1; lastBig = w; longest = Math.max(longest, run1); }
  const t = stake.reduce((a, b) => a + b, 0);
  return { stake, wins, share: wins.map(w => w / N), want: stake.map(v => v / t), longest, big: stake.indexOf(Math.max(...stake)), burned: o.stake[3] - stake[3] };
}

export default {
  slug: 'build-a-proof-of-stake',
  title: 'Build your own proof of stake',
  description: 'No puzzle to grind. A lottery picks each block\'s author by coins staked, and cheating burns the stake.',
  overview: 'Proof of work spends power to make cheating costly. Proof of stake uses money instead. Validators lock up coins, and a lottery picks who writes each block, with odds in proportion to their stake. Nobody can predict it, because it uses a seed that no one validator controls. If a validator signs two conflicting blocks at one height, anyone can prove it, and part of their stake is burned. A co-op in Gaborone runs four validators here. The lesson really draws two thousand blocks and counts who wins.',
  keywords: ['proof of stake', 'validators', 'slashing', 'consensus', 'blockchain', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.4, 0], dir: [0.06, 0.6, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { stake: [40, 30, 20, 10], first: false, cheat: false, slash: true }, st = { ...D0, stake: [...D0.stake] };
    const GOOD = '#1F9E89', BLUE = '#5B8DB8', RED = '#B5462F', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.75 + i * 1.15;
    const A = NAMES.map((n, i) => { const t = add(P.tower(0.42, 0.4, BLUE)); t.position.set(X(i) - 0.24, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    const B = NAMES.map((n, i) => { const t = add(P.tower(0.42, 0.4, GOOD)); t.position.set(X(i) + 0.24, 0.03, -0.1); t.userData.set({ cap: '' }); return t; });
    S.add(P.keep(-2.4, 2.4, 1.2, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); NAMES.forEach((n, i) => { A[i].userData.set({ h: Math.max(0.03, R.want[i] * 1.9), color: st.cheat && st.slash && i === 3 ? RED : BLUE }); B[i].userData.set({ h: Math.max(0.03, R.share[i] * 1.1) }); }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const stk = (i, l) => ({ type: 'slider', label: l, min: 5, max: 70, step: 5, get: () => st.stake[i], set: v => { const s = [...st.stake]; s[i] = v; set({ stake: s }); } });
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [stk(0, 'Lesego\'s stake'), stk(3, 'Kagiso\'s stake'), tg('first', 'Always pick the largest', 'Largest'), tg('cheat', 'Kagiso signs two blocks', 'Cheat'), tg('slash', 'Slash cheaters', 'Slash')];
    const readouts = [
      { label: 'Blocks won', get: () => ({ v: R.wins.join(', '), sub: 'of 2,000' }) },
      { label: 'Kagiso\'s share', get: () => ({ v: `${Math.round(R.share[3] * 100)}%`, sub: `stake ${Math.round(R.want[3] * 100)}%` }) },
      { label: 'Burned', get: () => ({ v: `${R.burned} coins`, bad: st.cheat && R.burned === 0, good: R.burned > 0 }) },
    ];
    const labels = [
      { name: 'a', t: 'Blue: share of stake', d: 'Teal: share of blocks won', icon: 'scale', atV: V(X(0) - 0.46, 0.2, -0.1) },
      { name: 'b', t: 'Kagiso', d: 'Red: slashed', icon: 'user', atV: V(X(3) + 0.46, 0.15, -0.1) },
    ];
    const reset = () => set({ ...D0, stake: [...D0.stake] });
    const breaks = [
      { label: 'Always pick the largest', hint: 'no lottery', on: () => set({ ...D0, stake: [...D0.stake], first: true }), off: reset },
      { label: 'Cheating costs nothing', hint: 'no slashing', on: () => set({ ...D0, stake: [...D0.stake], cheat: true, slash: false }), off: reset },
    ];
    function status() {
      if (st.first) return { ok: false, msg: `<b>${NAMES[R.big]} wrote all 2,000 blocks.</b> With no lottery, the richest validator owns the chain.` };
      if (st.cheat && !st.slash) return { ok: false, msg: '<b>Kagiso signed two blocks at one height, and lost nothing.</b> With no penalty, validators can back every fork at once.' };
      if (st.cheat) return { ok: true, msg: `<b>${R.burned} coins burned, and Kagiso\'s share falls to ${Math.round(R.share[3] * 100)}%.</b> Anyone can prove the two signatures.` };
      return { ok: true, msg: `<b>Each share of blocks tracks stake.</b> Kagiso staked ${Math.round(R.want[3] * 100)}% and won ${Math.round(R.share[3] * 100)}%.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'No puzzle', home: true, say: 'A co-op in Gaborone wants a chain with no mining. Coins at risk replace electricity spent.', act: m => m.set({ stake: [40, 30, 20, 10], first: false, cheat: false, slash: true }) },
    { t: 'The lottery', home: true, say: 'Each block has a lottery, and more stake means better odds.', act: m => m.set({ stake: [40, 30, 20, 10], first: false, cheat: false, slash: true }) },
    { t: 'Fair shares', home: true, say: 'Over many blocks, each share of wins follows stake.', act: m => m.set({ stake: [40, 30, 20, 30], first: false, cheat: false, slash: true }) },
    { t: 'Why a lottery', home: true, say: 'Always pick the largest, and one validator owns the chain.', act: m => m.set({ stake: [40, 30, 20, 10], first: true, cheat: false, slash: true }) },
    { t: 'Two blocks', home: true, say: 'Signing two blocks at one height costs nothing unless there\'s a penalty.', act: m => m.set({ stake: [40, 30, 20, 10], first: false, cheat: true, slash: false }) },
    { t: 'Slashing', home: true, say: 'Two signatures are proof. Part of the stake is burned.', act: m => m.set({ stake: [40, 30, 20, 10], first: false, cheat: true, slash: true }) },
  ],
  check: [
    { q: 'What decides who writes a block?', options: ['A lottery weighted by stake', 'The fastest computer', 'The oldest account'], answer: 0, why: 'Odds follow stake.', hint: 'See The lottery.' },
    { q: 'What is slashing?', options: ['Burning a cheater\'s stake', 'Cutting block size', 'Lowering difficulty'], answer: 0, why: 'It makes cheating cost money.', hint: 'See Slashing.' },
    { q: 'What is the danger of no lottery?', options: ['One validator owns the chain', 'Blocks get large', 'Fees rise'], answer: 0, why: 'The largest always wins.', hint: 'Try Always pick the largest.' },
  ],
  terms: [['Stake', 'Coins locked as a bond.'], ['Validator', 'One who writes and checks blocks.'], ['Slashing', 'Burning stake as a penalty.'], ['Nothing at stake', 'Backing every fork at no cost.']],
  deeper: '<p><b>Real draws.</b> The two thousand draws are really made, with a fixed seed.</p><p><b>The seed.</b> Real chains derive it so that no validator can steer it. This lesson leaves that out.</p>',
  credit: 'Built from <a href="https://naivecoinstake.learn.uno/" target="_blank" rel="noopener">NaivecoinStake</a> (Apache-2.0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short lottery, written for this lesson.',
  code: {
    title: 'The lottery',
    note: 'Our own short version.',
    text: `
function pick(stakes, r) {
  const total = stakes.reduce((a, b) => a + b, 0);
  let x = r * total;
  for (let i = 0; i < stakes.length; i++) {
    x -= stakes[i];
    if (x < 0) return i;
  }
}
`,
  },
};
