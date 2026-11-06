// Negotiation and bargaining (phase 16, lesson 16): a farmers' co-operative near Kumasi sends a buyer agent to bargain with a seller agent over a
// solar irrigation pump. Each side has a private walk-away price; the overlap is the bargaining zone. The buyer either lets a model decide and
// narrate its offers, or uses a deterministic offer generator (a concession schedule that never crosses its walk-away price) with the model only
// narrating. The seller may bluff about a rival offer. One negotiation is played round by round, and twelve scenarios give the deal rate, live.
const ASK = 1300, B_TARGET = 750, B_RES = 1000, S_RES = 820;
function negotiate(o, bRes = B_RES, sRes = S_RES) {
  const R = [];
  for (let r = 0; r < 12; r++) {
    const s = Math.max(sRes, ASK - (o.bluff ? 40 : 60) * r);
    let b;
    if (o.og) b = Math.min(bRes, B_TARGET + 45 * r);
    else b = [600, 900, 860, 950, 940, 990, 1010, 1040, 1030, 1060, 1080, 1100][r];
    const said = o.bluff && r >= 2 ? 'another buyer offered more; I can\'t go lower' : r === 0 ? 'opening price' : 'I can come down a little';
    R.push({ r: r + 1, s, b, said });
    if (!o.og && o.bluff && r >= 2) { const p = Math.max(s, 1150); return { R, deal: p, broke: p > bRes, by: 'buyer accepted the bluff' }; }
    if (b >= s) { const p = o.og ? Math.round((b + s) / 2) : s; return { R, deal: p, broke: p > bRes, by: 'offers crossed' }; }
    if (!o.og && b < sRes * 0.75 && r === 0 && o.walk) return { R, deal: null, broke: false, by: 'seller walked away after a lowball' };
  }
  return { R, deal: null, broke: false, by: 'no deal in twelve rounds' };
}
const SCEN = [[1000, 820], [950, 900], [1150, 800], [880, 860], [1100, 950], [760, 840], [1050, 870], [990, 930], [700, 800], [1200, 900], [930, 850], [1020, 980]];
function batch(o) {
  let deals = 0, broke = 0, should = 0, missed = 0;
  SCEN.forEach(([b, s]) => { const n = negotiate(o, b, s); const zopa = b >= s; if (zopa) should++; if (n.deal !== null) { deals++; if (n.deal > b) broke++; } else if (zopa) missed++; });
  return { deals, broke, should, missed };
}

export default {
  slug: 'agent-negotiation',
  title: 'Agents that bargain: decide the offer, narrate it',
  description: 'A farmers\' co-operative near Kumasi sends a buyer agent to bargain over a solar pump. Let a model decide the offers, or a fixed schedule decide and the model only narrate.',
  overview: 'Agents negotiate prices, resources, task allocations and terms. Left to pure language, models close tightly specified bargains surprisingly rarely (one 2024 study measured deal rates around a quarter), and scale doesn\'t fix it. They break the rules of the game, offering outside the bargaining zone; anchor poorly, accepting weak first offers or countering with symbolic numbers; and are swayed by personas: NegotiationArena found a "desperate to sell by Friday" persona could improve a model\'s payoff by about a fifth, and fair, cooperative agents get exploited by adversarial ones. The root problem is that one model is doing two jobs: deciding the offer and narrating it. The OG-Narrator design separates them: a deterministic offer generator computes each numeric move from a classical strategy (a concession schedule, a Zeuthen or Rubinstein model, tit-for-tat on price), never crossing the agent\'s walk-away price, and the model only writes the message around that number. The same study reported deal rates rising to near nine in ten. It is the same lesson as the contract net in the speech-acts lesson: separate the mechanism from the communication. The bargaining zone, the overlap between the buyer\'s highest acceptable price and the seller\'s lowest, decides whether a deal should happen at all; when there is no overlap, the right outcome is no deal, and a good agent walks away.',
  keywords: ['negotiation', 'bargaining', 'multi-agent', 'game theory', 'AI agents', 'NegotiationArena', 'mechanism design'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [-0.4, 0.2, -0.05], dir: [0.05, 1.25, 1.0], half: 1.35, wide: 5.6 },

  build(S) {
    const { THREE, V, P } = S;
    const M = v => S.money.of(v);
    const D0 = { og: true, bluff: true, walk: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const PX = p => -2.5 + (p - 550) / 800 * 4.0, RZ = r => -1.1 + r * 0.17;
    const zone = P.box(PX(B_RES) - PX(S_RES), 0.02, 2.0, '#fff', { r: 0.02, material: new THREE.MeshLambertMaterial({ color: '#CFEDE5' }) }); zone.position.set((PX(B_RES) + PX(S_RES)) / 2, 0, -0.2); S.add(zone);
    const marks = Array.from({ length: 12 }, (_, r) => {
      const b = P.ball(0.05, GOOD); b.userData.noFit = true; S.add(b);
      const s = P.ball(0.05, BAD); s.userData.noFit = true; S.add(s);
      const line = P.rod(V(), V(0.1, 0, 0), 0.008, '#C9C4B8'); line.userData.noFit = true; S.add(line);
      return { b, s, line };
    });
    const deal = P.box(0.06, 0.25, 2.0, SAF, { r: 0.01 }); deal.userData.noFit = true; S.add(deal);

    const post = (p, c) => { const r = P.box(0.05, 0.6, 0.05, c, { r: 0.01 }); r.position.set(PX(p), 0, -1.25); S.add(r); const f = P.box(0.05, 0.03, 2.1, c, { r: 0.01 }); f.position.set(PX(p), 0.01, -0.2); S.add(f); };
    post(B_RES, GOOD); post(S_RES, BAD);
    const buyer = P.robot(GOOD, { scale: 0.9 }); buyer.position.set(-2.85, 0, -0.2); S.add(buyer);
    const seller = P.robot(BAD, { scale: 0.9 }); seller.position.set(1.95, 0, -0.2); S.add(seller);
    const runs = SCEN.map((_, i) => { const l = P.lamp('#C9C4B8', { h: 0.22 }); l.position.set(-2.2 + i * 0.33, 0, 1.15); S.add(l); return l; });
    S.add(P.keep(-3.05, 2.2, 0.75, -1.3, 1.25));
    let N = null, Bt = null;
    function draw() {
      N = negotiate(st); Bt = batch(st);
      marks.forEach((K, r) => {
        const x = N.R[r], on = !!x; [K.b, K.s, K.line].forEach(o => { o.visible = on; }); if (!on) return;
        K.b.position.set(PX(x.b), 0.2, RZ(r)); K.s.position.set(PX(x.s), 0.2, RZ(r)); P.setRod(K.line, V(PX(Math.min(x.b, x.s)), 0.2, RZ(r)), V(PX(Math.max(x.b, x.s)), 0.2, RZ(r)));
      });
      deal.visible = N.deal !== null; if (N.deal !== null) deal.position.set(PX(N.deal), 0, -0.2);
      SCEN.forEach(([b, sr], i) => { const n = negotiate(st, b, sr), zopa = b >= sr; runs[i].userData.set({ color: n.deal !== null ? (n.deal > b ? RED : GOOD) : zopa ? SAF : '#C9C4B8', on: true }); });
      buyer.userData.set({ busy: N.deal === null }); seller.userData.set({ busy: N.deal === null });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'An offer generator decides; the model only narrates', short: 'Offer generator', get: () => st.og, set: v => set({ og: !!v }) },
      { type: 'toggle', label: 'The seller bluffs about a rival buyer', short: 'Seller bluffs', get: () => st.bluff, set: v => set({ bluff: !!v }) },
      { type: 'toggle', label: 'The seller walks away from an insulting first offer', short: 'Seller can walk', get: () => st.walk, set: v => set({ walk: !!v }) },
    ];
    const readouts = [
      { label: 'This deal', get: () => ({ v: N.deal !== null ? M(N.deal) : 'none', sub: N.broke ? 'over the walk-away' : N.by, good: N.deal !== null && !N.broke, bad: N.broke || N.deal === null }) },
      { label: 'Deal rate', get: () => ({ v: `${Bt.deals - Bt.broke} of ${Bt.should}`, sub: 'good deals where one exists', good: Bt.deals - Bt.broke === Bt.should, bad: Bt.deals - Bt.broke < Bt.should / 2 }) },
      { label: 'Rules broken', get: () => ({ v: String(Bt.broke), sub: 'paid over walk-away', good: !Bt.broke, bad: Bt.broke > 0 }) },
    ];
    const labels = [
      { name: 'rounds', t: 'Round by round', d: 'Teal: buyer. Coral: seller. Gold: deal', icon: 'turn', atV: V(-2.85, 0.6, -0.2) },
      { name: 'zone', t: 'Bargaining zone', d: 'Between the two walk-away posts', icon: 'money', atV: V(PX(B_RES), 0.6, -1.25) },
      { name: 'out', t: 'Twelve bargains', d: 'Red: paid over walk-away', icon: 'check', atV: V(1.55, 0.22, 1.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Let the model set the price', hint: 'no offer generator', on: () => set({ ...D0, og: false }), off: reset },
      { label: 'The model hears the bluff', hint: 'persona pressure', on: () => set({ ...D0, og: false, bluff: true, walk: false }), off: reset },
      { label: 'Open with an insulting lowball', hint: 'the seller walks', on: () => set({ ...D0, og: false, bluff: false }), off: reset },
    ];
    function status() {
      if (!st.og && N.by.startsWith('seller walked')) return { ok: false, msg: `<b>The model opened at ${M(600)}, far below anything the seller could accept, and the seller walked away: a deal that was there to be had was lost.</b> Across twelve bargains it made ${Math.max(0, Bt.deals - Bt.broke)} good deals of ${Bt.should}. Models anchor poorly; decide the offer with a strategy, narrate it with the model.` };
      if (!st.og && st.bluff) return { ok: false, msg: `<b>The seller said another buyer had offered more, and the model-driven buyer believed it: it agreed to ${M(N.deal)}, above its own walk-away price of ${M(B_RES)}.</b> Across twelve bargains it made ${Bt.deals - Bt.broke} good deals of ${Bt.should} and overpaid in ${Bt.broke}. Narration persuaded the part that should only compute. Let a deterministic generator set the number.` };
      if (!st.og) return { ok: false, msg: `<b>${N.deal === null ? `The model opened at ${M(600)}, the seller walked away, and a deal that was there to be had was lost` : `The model\'s offers wandered (${N.R.map(x => M(x.b)).slice(0, 4).join(', ')}…) and it accepted the seller\'s ${M(N.deal)}`}.</b> Twelve bargains: ${Bt.deals - Bt.broke} good deals of ${Bt.should}. Models anchor poorly and break the rules of the game; decide the offer with a strategy, narrate it with the model.` };
      return { ok: true, msg: `<b>The offer generator conceded on a fixed schedule from ${M(B_TARGET)} and never past ${M(B_RES)}${st.bluff ? ', whatever the seller claimed about rival buyers' : ''}: deal at ${M(N.deal)} in round ${N.R.length}.</b> Across twelve bargains, ${Bt.deals} deals of ${Bt.should} possible, none over a walk-away price, and no deal in the ${12 - Bt.should} with no zone, which is right.` };
    }
    return { update: dt => { buyer.userData.tick(dt); seller.userData.tick(dt); }, currency: draw, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two agents bargain', home: true, say: 'A farmers\' co-operative near Kumasi sends a buyer agent to bargain over a solar irrigation pump with a seller agent.', act: m => m.set({ og: true, bluff: false, walk: true }) },
    { t: 'The bargaining zone', home: true, say: 'Each side has a private walk-away price. Where they overlap, a deal is possible. Where they don\'t, the right answer is no deal.', act: m => m.set({ og: true, bluff: false, walk: true }) },
    { t: 'A model sets the price', home: true, say: 'Let a model decide the offers and it anchors badly: a lowball opening, then offers that wander.', act: m => m.set({ og: false, bluff: false, walk: true }) },
    { t: 'A bluff', home: true, say: 'The seller claims a rival buyer offered more. The model believes it, and pays more than it should ever pay.', act: m => m.set({ og: false, bluff: true, walk: false }) },
    { t: 'Decide, then narrate', home: true, say: 'A deterministic generator computes each offer on a schedule; the model only writes the message around the number.', act: m => m.set({ og: true, bluff: true, walk: true }) },
    { t: 'Mechanism and words', home: true, say: 'Separate the mechanism from the communication. The bluff changes the words, not the numbers.', act: m => m.set({ og: true, bluff: true, walk: true }) },
  ],
  check: [
    { q: 'What is the bargaining zone?', options: ['The overlap of the two walk-away prices', 'The asking price', 'The first offer'], answer: 0, why: 'No overlap means no deal is right.', hint: 'Look at the green band.' },
    { q: 'Why did the model-driven buyer overpay?', options: ['A persona bluff swayed the part that should compute', 'The price was fair', 'It ran out of rounds'], answer: 0, why: 'Narration and decision were mixed.', hint: 'Try The model hears the bluff.' },
    { q: 'What does the offer-generator design change?', options: ['A strategy sets the number; the model writes the words', 'The model sets both', 'Nothing'], answer: 0, why: 'Separate the mechanism from the communication.', hint: 'Turn on Offer generator.' },
  ],
  terms: [
    ['Walk-away price', 'The worst price a side will accept.'],
    ['Bargaining zone (ZOPA)', 'Where both sides\' acceptable prices overlap.'],
    ['Anchoring', 'The pull of a first number on later offers.'],
    ['Concession schedule', 'A fixed rule for how far to move each round.'],
    ['Offer generator', 'Deterministic code that computes each offer.'],
    ['Persona tactic', 'A framing such as desperation used to sway the other side.'],
  ],
  deeper: '<p><b>Classical strategies.</b> Zeuthen\'s rule concedes when you have more to lose from breakdown; Rubinstein\'s alternating-offers model shows how patience shapes the split.</p><p><b>Exploitation.</b> A purely fair agent can be exploited by an adversarial one; agents need a walk-away price they hold to.</p><p><b>About this machine.</b> Prices are illustrative, set in US dollars and shown in your currency; the strategies and the twelve scenarios are fixed rules computed live.</p>',
  code: {
    title: 'Offer generator, model narrator',
    note: 'Adapted from the course\'s negotiation sketch (code/main.py).',
    text: `
def next_offer(round_no, target, walk_away, step):
    return min(walk_away, target + step * round_no)     # never past walk-away

def buyer_turn(state, llm):
    price = next_offer(state.round, state.target, state.walk_away, state.step)
    if state.seller_offer <= price:
        return accept(state.seller_offer)
    words = llm(f"Write a short, polite counter-offer at exactly {price}. "
                f"Do not change the number.")
    return {"performative": "propose", "price": price, "message": words}
`,
  },
};
