// Agent economies and credit (phase 16, lesson 21): a Nairobi newsroom's agent team (researcher, writer, fact-checker, and optionally an echo
// agent that only rephrases) produces an explainer scoring 0.9. How should credit be split? Equal shares, last contributor takes all,
// leave-one-out, or the Shapley value (average marginal contribution over every joining order). Credit feeds reputation, and reputation decides
// who wins the slots on the next jobs; the coalition values are fixed, and every split and the reputation loop are computed live.
const BASE = { R: 0.3, W: 0.2, C: 0, RW: 0.65, RC: 0.4, WC: 0.3, RWC: 0.9 };
const NAMES = { R: 'researcher', W: 'writer', C: 'fact-checker', E: 'echo agent' };
const v = S => { const k = [...S].filter(x => x !== 'E').sort((a, b) => 'RWC'.indexOf(a) - 'RWC'.indexOf(b)).join(''); return k ? BASE[k] : 0; };
function perms(a) { return a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])); }
function credit(o) {
  const team = o.echo ? ['R', 'W', 'C', 'E'] : ['R', 'W', 'C'], total = v(team), c = {};
  if (o.method === 'equal') team.forEach(x => { c[x] = total / team.length; });
  else if (o.method === 'last') { const last = o.echo ? 'E' : 'C'; team.forEach(x => { c[x] = x === last ? total : 0; }); }
  else if (o.method === 'loo') { const m = {}; team.forEach(x => { m[x] = total - v(team.filter(y => y !== x)); }); const s = Object.values(m).reduce((a, b) => a + b, 0) || 1; team.forEach(x => { c[x] = m[x] / s * total; }); }
  else { const P = perms(team); team.forEach(x => { c[x] = 0; }); P.forEach(p => { const S = []; p.forEach(x => { const before = v(S); S.push(x); c[x] += (v(S) - before) / P.length; }); }); }
  // reputation: each of the next jobs has a research, writing and checking slot; the echo agent bids for every slot, and wins it in
  // proportion to its reputation against the specialist's, contributing nothing when it does
  let q = 0;
  const pe = k => (o.echo ? (c.E + 1e-9) / (c.E + c[k] + 2e-9) : 0);
  for (let mask = 0; mask < 8; mask++) {
    const roles = ['R', 'W', 'C'].filter((k, b) => mask & (1 << b));
    const p = ['R', 'W', 'C'].reduce((a, k, b) => a * ((mask & (1 << b)) ? 1 - pe(k) : pe(k)), 1);
    q += p * v(roles);
  }
  return { team, total, c, future: q };
}

export default {
  slug: 'agent-credit-shapley',
  title: 'Who earned it? Splitting credit between agents',
  description: 'A newsroom in Nairobi splits the credit for a team of agents\' explainer. Try four rules, add an agent that only rephrases, and watch who wins the next jobs.',
  overview: 'When agents produce value together but are rewarded one by one, the split shapes what happens next: credit becomes reputation, reputation routes future work, and agents optimised for reward learn whatever the rule rewards. Simple rules are unfair or gameable. An equal split pays a free rider as much as a contributor. Last contributor takes all rewards whoever speaks last, so an agent that only rephrases the final draft collects everything. Leave-one-out (what the team loses without you) counts complementary agents\' shared contribution twice. The Shapley value (1953) is the unique split satisfying four axioms: efficiency (the shares add up to the total), symmetry (identical contributors get the same), additivity and the null-player rule (an agent that adds nothing to any coalition gets nothing). Compute it by averaging each agent\'s marginal contribution over every order in which the team could assemble; with many agents, sample orders instead of enumerating them. Other mechanisms help in agent markets: a second-price (Vickrey) auction for a task makes bidding your true cost the best strategy, so agents don\'t shade their bids; reputation that decays lets past performance count without locking it in. Live agent economies exist, decentralised networks where validators score miners\' model outputs and reward them, or where agents pay one another for services, and each is a bet on its scoring rule being hard to game. The pattern repeats from earlier in this phase: the mechanism decides behaviour, so design the credit rule as carefully as the agents.',
  keywords: ['Shapley value', 'credit assignment', 'mechanism design', 'agent economies', 'reputation', 'multi-agent systems', 'game theory'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.2, 0.4, -0.2], dir: [0.05, 0.8, 1.15], half: 1.05, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { method: 'shapley', echo: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const AC = { R: '#5B8DB8', W: SAF, C: GOOD, E: BAD };
    /* each agent's credit: a tower in its colour with the agent in front; the echo agent appears only when it joins */
    const AX = i => -2.3 + i * 0.72, TZ = -0.45;
    const cols = ['R', 'W', 'C', 'E'].map((k, i) => {
      const b = P.tower(0.46, 0.46, AC[k]); b.userData.set({ cap: '' }); b.position.set(AX(i), 0, TZ); b.userData.noFit = true; S.add(b);
      const r = P.robot(AC[k], { scale: 0.6 }); r.position.set(AX(i), 0, 0.2); S.add(r);
      return { k, b, r };
    });
    /* what each team is worth: seven grey towers, with a row of dots in front in the colours of its members */
    const CX = i => 0.5 + i * 0.27;
    ['R', 'W', 'C', 'RW', 'RC', 'WC', 'RWC'].forEach((t, i) => {
      const b = P.tower(0.2, 0.3, '#8E91A3', { h: v(t) * 1.2 }); b.userData.set({ cap: '' }); b.position.set(CX(i), 0, TZ); S.add(b);
      [...t].forEach((k, j) => { const d = P.ball(0.05, AC[k]); d.position.set(CX(i), 0.05, TZ + 0.3 + j * 0.13); S.add(d); });
    });
    /* the next jobs: a tank filled to the expected quality, a gold bar where Shapley routing would reach, a lamp */
    const TX = 2.65, tank = P.tank(0.42, 1.1, 0.42, GOOD); tank.position.set(TX, 0, TZ); S.add(tank);
    const mark = P.box(0.56, 0.03, 0.56, SAF, { r: 0.01 }); mark.position.set(TX, 0, TZ); mark.userData.noFit = true; S.add(mark);
    const lamp = P.lamp(GOOD, { h: 0.3, r: 0.1 }); lamp.position.set(TX, 0, 0.2); S.add(lamp);
    S.add(P.keep(-2.7, 3.0, 1.3, -0.8, 0.5));

    let R = null, Rs = null;
    function draw() {
      R = credit(st); Rs = credit({ ...st, method: 'shapley' });
      cols.forEach(Cc => {
        const on = R.team.includes(Cc.k); Cc.b.visible = on; Cc.r.visible = on; if (!on) return;
        const x = R.c[Cc.k]; Cc.b.userData.set({ h: Math.max(0.02, x / R.total * 1.2) });
        Cc.r.userData.set({ lamp: x > 0.001 ? '#F2C94C' : '#C9C4B6' });
      });
      const bad = R.future < Rs.future - 0.03 || (st.echo && R.c.E > 0.001);
      tank.userData.set({ level: R.future, color: bad ? BAD : GOOD });
      mark.position.y = Rs.future * 1.1;
      lamp.userData.set({ color: bad ? RED : GOOD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const MS = ['equal', 'last', 'loo', 'shapley'];
    const controls = [
      { type: 'toggle', label: 'An echo agent joins: it only rephrases, last', short: 'Echo agent', get: () => st.echo, set: v => set({ echo: !!v }) },
      { type: 'buttons', label: 'Split credit by', options: ['Equal shares', 'Last one in', 'Leave-one-out', 'Shapley'], get: () => MS.indexOf(st.method), act: i => set({ method: MS[i] }) },
    ];
    const readouts = [
      { label: 'Echo agent\'s share', get: () => ({ v: st.echo ? `${(R.c.E / R.total * 100).toFixed(0)}%` : '—', sub: 'it added nothing', good: st.echo && R.c.E < 0.001, bad: st.echo && R.c.E > 0.001 }) },
      { label: 'Fact-checker\'s share', get: () => ({ v: `${(R.c.C / R.total * 100).toFixed(0)}%`, sub: 'worth 0 alone' }) },
      { label: 'Next jobs', get: () => ({ v: R.future.toFixed(2), sub: 'expected quality', good: R.future >= Rs.future - 0.03, bad: R.future < Rs.future - 0.03 }) },
    ];
    const labels = [
      { name: 'cols', t: 'Each agent\'s credit', d: 'Coral: the echo agent', icon: 'scale', atV: V(-2.54, 0.4, -0.45) },
      { name: 'tab', t: 'What each team is worth', d: 'Dots: who is on the team', icon: 'book', atV: V(CX(6) + 0.1, 0.12, -0.15) },
      { name: 'next', t: 'The next jobs', d: 'Gold bar: Shapley routing', icon: 'target', atV: V(TX + 0.22, 1.0, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Reward whoever finished last', hint: 'the echo collects', on: () => set({ ...D0, method: 'last' }), off: reset },
      { label: 'Split everything equally', hint: 'a free rider', on: () => set({ ...D0, method: 'equal' }), off: reset },
      { label: 'Use leave-one-out', hint: 'double counting', on: () => set({ ...D0, method: 'loo', echo: false }), off: reset },
    ];
    function status() {
      const share = k => `${(R.c[k] / R.total * 100).toFixed(0)}%`;
      if (st.method === 'last') return { ok: false, msg: `<b>Last contributor takes all: ${st.echo ? 'the echo agent rephrased the final draft and collected 100% of the credit' : 'the fact-checker, last in, collected everything'}.</b> ${st.echo ? `Reputation follows credit, so the echo agent wins the slots on the next jobs and expected quality falls to ${R.future.toFixed(2)} from ${Rs.future.toFixed(2)}.` : 'The researcher and writer, who did most of the work, get nothing.'} Agents learn to speak last.` };
      if (st.method === 'equal') return { ok: false, msg: `<b>An equal split gives ${st.echo ? 'the echo agent, which added nothing,' : 'each agent'} ${share(st.echo ? 'E' : 'R')} of the credit${st.echo ? ', and wins half the slots it bids for on future jobs' : ''}: next jobs expect ${R.future.toFixed(2)}.</b> Equal looks fair and rewards free riding. The null-player rule says an agent that adds nothing to any team earns nothing.` };
      if (st.method === 'loo') return { ok: false, msg: `<b>Leave-one-out asks what the team loses without each agent: researcher 0.60, writer 0.50, checker 0.25, which adds up to 1.35 for an explainer worth 0.90.</b> Complementary agents\' shared contribution is counted twice; scaling it down to fit skews the split towards the researcher (${share('R')}). Shapley averages over every joining order instead.` };
      return { ok: true, msg: `<b>Shapley credit, averaged over every order the team could have assembled in: researcher ${share('R')}, writer ${share('W')}, fact-checker ${share('C')}${st.echo ? ', echo agent 0%' : ''}, adding up to the full 0.90.</b> The checker is worth nothing alone but a lot in a team, and gets credit for that; ${st.echo ? 'the echo agent adds nothing anywhere and gets nothing. ' : ''}Reputation sends the next jobs\' slots to the specialists: ${R.future.toFixed(2)}.` };
    }
    return { update: dt => { cols.forEach(Cc => { Cc.b.userData.tick(dt); Cc.r.userData.tick(dt); }); tank.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Value made together', home: true, say: 'A newsroom in Nairobi runs a researcher, a writer and a fact-checker agent. Together their explainer scores point nine.', act: m => m.set({ method: 'shapley', echo: false }) },
    { t: 'Equal shares', home: true, say: 'Split it equally and every agent gets a third, including any agent that adds nothing.', act: m => m.set({ method: 'equal', echo: true }) },
    { t: 'Last one in', home: true, say: 'Reward whoever finished last, and an agent that only rephrases the final draft collects everything.', act: m => m.set({ method: 'last', echo: true }) },
    { t: 'Leave-one-out', home: true, say: 'Ask what the team loses without each agent, and the shares add up to more than the whole.', act: m => m.set({ method: 'loo', echo: false }) },
    { t: 'The Shapley value', home: true, say: 'Average each agent\'s marginal contribution over every order the team could join in. Nothing for adding nothing.', act: m => m.set({ method: 'shapley', echo: true }) },
    { t: 'Credit becomes reputation', home: true, say: 'Credit routes the next jobs. A fair rule keeps the work going to the agents who do it.', act: m => m.set({ method: 'shapley', echo: true }) },
  ],
  check: [
    { q: 'What does the Shapley value give an agent that adds nothing to any team?', options: ['Nothing', 'An equal share', 'Everything if it was last'], answer: 0, why: 'The null-player axiom.', hint: 'Look at the echo agent.' },
    { q: 'Why is "last contributor takes all" dangerous?', options: ['Agents learn to speak last', 'It is too slow', 'It splits equally'], answer: 0, why: 'The rule rewards timing, not work.', hint: 'Try Reward whoever finished last.' },
    { q: 'How is the Shapley value computed?', options: ['Average marginal contribution over every joining order', 'Total divided by team size', 'The last agent\'s score'], answer: 0, why: 'Sample orders when there are many agents.', hint: 'Read the code.' },
  ],
  terms: [
    ['Credit assignment', 'Splitting a jointly produced value between contributors.'],
    ['Shapley value', 'Average marginal contribution over every order of joining.'],
    ['Null player', 'An agent that adds nothing to any coalition; it earns nothing.'],
    ['Free rider', 'An agent rewarded without contributing.'],
    ['Second-price auction', 'The winner pays the second-highest bid, so true bids are best.'],
    ['Reputation', 'Accumulated credit that routes future work.'],
  ],
  deeper: '<p><b>Auctions for tasks.</b> In a second-price (Vickrey) auction for a task, bidding your true cost is a dominant strategy, so a manager learns real costs instead of shaded bids.</p><p><b>Live agent economies.</b> Some decentralised networks have validators score contributors\' model outputs and reward them; each rests on its scoring rule being hard to game.</p><p><b>About this machine.</b> The coalition values are illustrative; Shapley over all orders, the other rules and the ten-job reputation loop are computed live.</p>',
  code: {
    title: 'Shapley by enumeration',
    note: 'Adapted from the course\'s credit-attribution sketch (code/main.py).',
    text: `
from itertools import permutations

def shapley(players, value):
    credit = {p: 0.0 for p in players}
    orders = list(permutations(players))
    for order in orders:
        team = set()
        for p in order:
            before = value(frozenset(team))
            team.add(p)
            credit[p] += (value(frozenset(team)) - before) / len(orders)
    return credit          # sums to value(all players); a null player gets 0

# with many agents, sample a few hundred random orders instead
`,
  },
};
