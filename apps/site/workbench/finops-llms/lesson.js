// FinOps for LLMs (phase 17, lesson 27): a Cape Town software firm's bill arrives as one number. Stacked towers split it by tenant and by the four token layers: prompt, tool, memory, response.
// An enforcement ladder acts per tenant: rate limit, spend cap, kill switch. The unit metric is cost per resolved query, not cost per token. All figures come from the table below.
const TEN = [
  { n: 'Tenant A', q: 400, res: 0.9, l: [2, 1, 1, 2] },
  { n: 'Tenant B', q: 300, res: 0.85, l: [3, 1, 2, 2] },
  { n: 'Tenant C', q: 100, res: 0.5, l: [2, 12, 16, 3] },
];
const LAYER = ['prompt', 'tool', 'memory', 'response'], CAP = 2500;
function run(o) {
  const cost = TEN.map(t => { const per = t.l.map((v, i) => v * (o.fix && t.n === 'Tenant C' && i === 2 ? 0.2 : 1)); const raw = per.reduce((a, b) => a + b, 0) * t.q; return { t, per, raw }; });
  cost.forEach(c => { c.spent = c.raw; if (o.ladder >= 1 && c.t.n === 'Tenant C') c.spent = Math.min(c.spent, c.raw * 0.8); if (o.ladder >= 2) c.spent = Math.min(c.spent, CAP); if (o.ladder >= 3 && c.raw > CAP) c.spent = CAP * 0.5; });
  const total = cost.reduce((a, c) => a + c.spent, 0);
  const res = cost.reduce((a, c) => a + c.t.q * c.t.res, 0);
  const off = o.ladder >= 3 && cost[2].raw > CAP;
  return { cost, total, perRes: total / res, off };
}

export default {
  slug: 'finops-llms',
  title: 'FinOps for LLMs: whose bill, which tokens?',
  description: 'One number on the invoice hides everything. Split it by tenant and token layer, and find who spent what.',
  overview: 'The invoice says one number. It doesn\'t say which customer spent it, which feature drove it, or whether the cause was prompt bloat, tool calls or memory. Cloud tags don\'t help, because a provider sees one key. Attribution has to happen in your own app, per call, by tenant and feature, across four token layers: prompt, tool, memory and response. Once you can see it, you can act with an enforcement ladder: a rate limit, then a spend cap, then a kill switch. And change the unit. Cost per million tokens tells you little. Cost per resolved query tells you if the feature pays for itself.',
  keywords: ['FinOps', 'LLM costs', 'unit economics', 'multi-tenant', 'cost attribution', 'kill switch'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.5, 0], dir: [0.06, 0.55, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const M = v => S.money.of(v * 0.02);
    const D0 = { split: true, ladder: 2, fix: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', GREY = '#8E91A3', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.7 + i * 1.0, C = ['#5B8DB8', SAF, '#7B6FA8', GOOD];
    const bars = TEN.map((t, i) => [0, 1, 2, 3].map(j => { const m = new S.THREE.MeshLambertMaterial({ color: C[j] }), b = P.box(0.62, 1, 0.55, '#fff', { r: 0.02, material: m }); b.position.set(X(i), 0.03, -0.1); b.userData.noFit = true; S.add(b); return { b, m }; }));
    const one = P.box(2.6, 1, 0.55, GREY, { r: 0.03, material: new S.THREE.MeshLambertMaterial({ color: GREY }) }); one.position.set(-0.7, 0.03, -0.1); one.userData.noFit = true; S.add(one);
    const rungs = [0, 1, 2].map(i => { const l = add(P.lamp('#C9C4B6', { h: 0.2 + i * 0.16, r: 0.09 })); l.position.set(1.65 + i * 0.32, 0.03, 0.4); return l; });
    const dial = add(P.dial(0.34)); dial.position.set(1.95, 0.03, -0.25);
    S.add(P.keep(-2.3, 2.5, 1.4, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      const k = 1 / 3500;
      R.cost.forEach((c, i) => { let y = 0.03, f = c.spent / c.raw; c.per.forEach((v, j) => { const h = Math.max(0.002, v * c.t.q * f * k); const B = bars[i][j]; B.b.scale.y = h; B.b.position.y = y; B.b.visible = st.split; y += h; }); });
      one.visible = !st.split; one.scale.y = R.total * k / 2.2;
      rungs.forEach((l, i) => l.userData.set({ color: i < st.ladder ? (i === 2 ? '#D9483B' : '#E3A72F') : '#C9C4B6', on: i < st.ladder }));
      dial.userData.set({ v: Math.min(1, R.perRes / 22) });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Attribute each call by tenant and layer', short: 'Attribution', get: () => st.split, set: v => set({ split: !!v }) },
      { type: 'slider', label: 'Enforcement ladder', min: 0, max: 3, step: 1, get: () => st.ladder, set: v => set({ ladder: v }), fmt: v => ['none', 'rate limit', 'spend cap', 'kill switch'][v] },
      { type: 'toggle', label: 'Trim Tenant C\'s memory', short: 'Fix memory', get: () => st.fix, set: v => set({ fix: !!v }) },
    ];
    const readouts = [
      { label: 'This month', get: () => ({ v: M(R.total), sub: st.split ? 'by tenant and layer' : 'one number' }) },
      { label: 'Cost per resolved query', get: () => ({ v: M(R.perRes), sub: 'the unit that matters', good: R.perRes < 10, bad: R.perRes > 16 }) },
      { label: 'Tenant C', get: () => ({ v: st.split ? (R.off ? 'switched off' : M(R.cost[2].spent)) : 'unknown', sub: st.split ? '10% of queries' : 'can\'t see it', bad: R.off || !st.split }) },
    ];
    const labels = [
      { name: 't', t: 'Three tenants, four layers', d: 'Prompt, tool, memory, response', icon: 'target', atV: V(X(0) - 0.32, 0.2, -0.1) },
      { name: 'l', t: 'The enforcement ladder', d: 'Limit, cap, kill switch', icon: 'hand', atV: V(2.3, 0.4, 0.4) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'One number on the invoice', hint: 'no attribution', on: () => set({ ...D0, split: false, ladder: 0 }), off: reset },
      { label: 'No limits at all', hint: 'one tenant, half the bill', on: () => set({ ...D0, ladder: 0 }), off: reset },
      { label: 'Jump to the kill switch', hint: 'a paying customer goes dark', on: () => set({ ...D0, ladder: 3 }), off: reset },
    ];
    function status() {
      if (!st.split) return { ok: false, msg: `<b>${M(R.total)}, and no idea why.</b> The provider sees one key. Attribution must be in your own code: tag every call with tenant, feature and token layer.` };
      if (st.ladder === 0 && !st.fix) return { ok: false, msg: `<b>Tenant C sends 10% of queries and spends over half the bill.</b> Purple is memory: each turn re-sends a huge history. No limit stops it, and the dial shows every resolved query paying for it.` };
      if (R.off) return { ok: false, msg: '<b>The kill switch cut off Tenant C.</b> It saved money, and a paying customer is down. Kill switches are for runaway failures. Before that, rate limit, cap, and tell them.' };
      if (st.fix) return { ok: true, msg: `<b>Trimming Tenant C's memory took cost per resolved query to ${M(R.perRes)}.</b> You only found this by splitting layers. Fixing the cause beats capping the symptom.` };
      return { ok: true, msg: `<b>${M(R.total)} in all, ${M(R.perRes)} per resolved query.</b> The cap holds Tenant C, while the purple layer shows what to fix next.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One number', home: true, say: 'A software firm in Cape Town gets one figure on its LLM bill. It can\'t say who spent it or why.', act: m => m.set({ split: false, ladder: 0, fix: false }) },
    { t: 'Who spent it', home: true, say: 'Tag every call by tenant. Now the grey block splits, and one tenant stands out.', act: m => m.set({ split: true, ladder: 0, fix: false }) },
    { t: 'Four layers', home: true, say: 'Split again by layer: prompt, tool, memory and response. Tenant C\'s tower is mostly memory.', act: m => m.set({ split: true, ladder: 0, fix: false }) },
    { t: 'A ladder', home: true, say: 'A rate limit first, then a spend cap. The cap holds the bill while you talk to the customer.', act: m => m.set({ split: true, ladder: 2, fix: false }) },
    { t: 'The last rung', home: true, say: 'A kill switch is for runaway failures. Used on a paying customer, it is an outage of your own making.', act: m => m.set({ split: true, ladder: 3, fix: false }) },
    { t: 'The right unit', home: true, say: 'Trim the memory, and cost per resolved query falls. That is the number that says if a feature pays.', act: m => m.set({ split: true, ladder: 2, fix: true }) },
  ],
  check: [
    { q: 'Why can\'t provider billing tell you which tenant spent what?', options: ['It sees one key', 'It is too slow', 'It hides prices'], answer: 0, why: 'Attribution belongs in your own code.', hint: 'Try One number on the invoice.' },
    { q: 'What is the order of the ladder?', options: ['Rate limit, spend cap, kill switch', 'Kill switch first', 'Cap, then rate limit, then nothing'], answer: 0, why: 'Use the gentlest step that works.', hint: 'Move the ladder slider.' },
    { q: 'Which unit best says if a feature pays?', options: ['Cost per resolved query', 'Cost per million tokens', 'Cost per GPU'], answer: 0, why: 'It ties cost to value.', hint: 'Read the readouts.' },
  ],
  terms: [
    ['FinOps', 'Managing spend as an engineering problem.'],
    ['Attribution', 'Tying each cost to a tenant and a feature.'],
    ['Token layers', 'Prompt, tool, memory and response.'],
    ['Unit economics', 'Cost per thing a customer values.'],
    ['Spend cap', 'A hard limit on a tenant\'s spend.'],
    ['Kill switch', 'A way to stop something at once.'],
  ],
  deeper: '<p><b>Budgets per tenant.</b> Put limits in your gateway, with a warning to the customer before any cap.</p><p><b>Memory amplification.</b> A long history is paid for on every turn, so cost grows with the square of the conversation.</p><p><b>Numbers here</b> are an illustrative month.</p>',
  code: {
    title: 'Tag every call',
    note: 'Adapted from the course\'s attribution ledger (code/main.py).',
    text: `
def record(tenant, feature, usage, prices):
    ledger.add(tenant=tenant, feature=feature,
               prompt=usage.prompt * prices.input,
               tool=usage.tool * prices.input,
               memory=usage.memory * prices.input,
               response=usage.output * prices.output)

def cost_per_resolved(tenant, month):
    return ledger.sum(tenant, month) / tickets.resolved(tenant, month)
`,
  },
};
