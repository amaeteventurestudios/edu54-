// Tool use: two ideas the earlier function-calling lessons don't cover.
// Toolformer's filter: a model annotates its own text with candidate API calls, runs them, and keeps a call only if inserting its result lowers the loss
// on the next tokens by at least τ. Loss here is a small, explicit model: a token that appears in the tool result is copied with probability p
// (0.8 for a large model, 0.3 for a small one), any other token costs ln 5000; a small model also pays a confusion cost for the inserted text.
// Weighted over the next five tokens (weights 1, 0.8, 0.6, 0.4, 0.2). Evaluation: grade three agent trajectories by matching the call list (AST)
// or by checking the resulting state, and test abstention when no tool fits.
const V = 5000, UNI = Math.log(V), W = [1, 0.8, 0.6, 0.4, 0.2];
const CANDS = [
  { text: 'Kumasi sold 1240 kg and Tamale 980 kg,', call: 'Calculator(1240 + 980)', result: '2220', next: ['2220', 'kg', 'in', 'all', '.'] },
  { text: 'The Wednesday pickup is at the', call: 'Calendar("pickup place")', result: 'Sabon Gari gate', next: ['Sabon', 'Gari', 'gate', '.', 'Bring'] },
  { text: 'Ngozi bought fresh tomatoes', call: 'QA("what is a tomato?")', result: 'a red fruit', next: ['this', 'morning', 'at', 'the', 'market'] },
  { text: 'In Hausa, thank you is', call: 'Translate("thank you", "ha")', result: 'na gode', next: ['na', 'gode', '.', 'In', 'Yoruba'] },
  { text: 'The truck left Onitsha at', call: 'Calculator(24 × 60)', result: '1440', next: ['dawn', 'with', 'twelve', 'sacks', '.'] },
];
function loss(c, withTool, big) {
  const p = big ? 0.8 : 0.3, pool = withTool ? c.result.split(' ') : [];
  let L = 0, ws = 0;
  c.next.forEach((tk, i) => { const hit = pool.includes(tk); const l = hit ? -Math.log(p + (1 - p) / V) : UNI + (withTool && !big ? 1.5 : 0); L += W[i] * l; ws += W[i]; });
  return L / ws;
}
function filter(tau, big) { return CANDS.map(c => { const a = loss(c, false, big), b = loss(c, true, big); return { ...c, a, b, gain: a - b, keep: a - b >= tau }; }); }
const TRAJ = [
  { task: 'Book Wednesday pickup for 3 sacks, then text Ngozi', expect: ['book_pickup(day=Wed, sacks=3)', 'send_sms(to=Ngozi)'], calls: ['send_sms(to=Ngozi)', 'book_pickup(day=Wed, sacks=3)'], state: { booked: true, texted: true }, want: { booked: true, texted: true } },
  { task: 'Book Wednesday pickup for 3 sacks, then text Ngozi', expect: ['book_pickup(day=Wed, sacks=3)', 'send_sms(to=Ngozi)'], calls: ['book_pickup(day=Wed, sacks=3) → "fully booked"', 'send_sms(to=Ngozi)'], state: { booked: false, texted: true }, want: { booked: true, texted: true } },
  { task: 'What will the weather be in Tamale tomorrow?', expect: [], calls: ['get_weather(city=Tamale)'], abstain: 'No tool can answer that. I can book pickups and send texts.', state: {}, want: {}, hallucinated: true },
];
const norm = s => s.replace(/ → .*$/, '');
function grade(t, o) {
  const calls = t.hallucinated && o.abstain ? [] : t.calls;
  const ast = calls.length === t.expect.length && calls.every((c, i) => norm(c) === t.expect[i]);
  const known = ['book_pickup', 'send_sms'];
  const unknown = calls.filter(c => !known.includes(c.split('(')[0]));
  const stateOk = !unknown.length && Object.keys(t.want).every(k => t.state[k] === t.want[k]);
  return { calls, ast, stateOk, unknown };
}

export default {
  slug: 'tool-use-and-function-calling',
  title: 'Tool use: keep the calls that help, grade the result',
  description: 'Toolformer keeps a tool call only if its result makes the next words easier to predict. Then grade agents by what their tools changed.',
  overview: 'Toolformer taught models when to call tools without human labels. The model inserts candidate calls (a calculator, a calendar, a translator, a question-answering system) into its own training text, runs them, and keeps a call only if putting its result in front of the next words lowers the loss on those words by at least a threshold. Calls whose results don\'t help are dropped, and the model is fine-tuned on what remains. Tool use emerged with scale: small models were hurt by the inserted text while large ones gained. Evaluation has moved on from "is this one call correct?", which frontier models now mostly get right. The Berkeley Function Calling Leaderboard weights agentic and multi-turn tasks most, and checks state: after a sequence of calls, did the booking actually happen? Matching the exact list of calls (the AST) fails a correct trajectory done in another order and passes one where a tool failed silently. It also tests hallucination: when no tool fits, the right answer is to say so, not to invent a tool. The open problems are memory across turns, choosing tools from earlier results, and drift on long chains.',
  keywords: ['tool use', 'function calling', 'Toolformer', 'BFCL', 'agent evaluation', 'hallucination', 'AI agents'],
  orient: 'landscape',
  view: { target: [0, 0.35, 0.15], dir: [0.3, 0.95, 1.25], half: 1.4, wide: 6.0 },

  build(S) {
    const { THREE, V: Vv, P } = S;
    const D0 = { tau: 1.5, big: true, byState: true, abstain: true }, st = { ...D0, t: 0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', GREY = '#B9B3A5', RED = '#D9483B', GOLD = '#E3A72F', BLUE = '#5B8DB8';
    /* Toolformer: a deck with a gain tower per candidate call. Up = the result lowered the loss, down (red, under the deck) = it made things worse.
       The gold bar is the threshold: a tower above it keeps its call (its lamp lights) */
    const TX = i => -2.75 + i * 0.52, DECK = 0.5, K = 0.18;
    const TOOLC = { Calc: BLUE, Date: '#8E6BB8', 'Q&A': '#A07B52', Hausa: GOOD };
    const NAMES = ['Calc', 'Date', 'Q&A', 'Hausa', 'Calc'];
    const deck = P.box(2.75, 0.06, 0.7, '#D8D1C2', { r: 0.03 }); deck.position.set(TX(2), DECK - 0.06, -0.25); S.add(deck);
    for (const x of [TX(0) - 0.32, TX(4) + 0.32]) { const leg = P.box(0.08, DECK - 0.06, 0.08, '#8E91A3', { r: 0.01 }); leg.position.set(x, 0, -0.25); S.add(leg); }
    const cols = CANDS.map((c, i) => {
      const up = P.tower(0.32, 0.32, GREY, { h: 0.1 }); up.position.set(TX(i), DECK, -0.25); up.userData.set({ cap: '' }); S.add(up);
      const dm = new THREE.MeshLambertMaterial({ color: RED }), down = P.box(0.3, 1, 0.3, '#fff', { r: 0.03, material: dm }); down.position.set(TX(i), DECK, -0.25); S.add(down);
      const tool = P.station('', 0.44, 0.3, 0.4, TOOLC[NAMES[i]]); tool.position.set(TX(i), 0, 0.5); S.add(tool);
      const lp = P.lamp(GREY, { h: 0.25, r: 0.09 }); lp.position.set(TX(i), 0, 0.98); S.add(lp);
      return { up, down, lp, tool };
    });
    const bar = P.box(2.85, 0.03, 0.82, GOLD, { r: 0.01, material: new THREE.MeshLambertMaterial({ color: GOLD, transparent: true, opacity: 0.55 }) }); bar.position.set(TX(2), DECK, -0.25); bar.layers.set(1); S.add(bar);
    /* grading: three lanes. A robot sends its calls (blue: book, gold: text, red: a tool that doesn't exist) to the depot; the depot's lamps show
       what really changed (booked, texted). The grader lamp at the end is green for pass, grey for fail, red when the grade is wrong.
       The gold frame shows what the grader looks at: the parcels (the call list) or the depot (the state) */
    const LZ = i => -0.55 + i * 0.68, GX0 = 0.75, GX1 = 2.05;
    const CALLC = { book_pickup: BLUE, send_sms: GOLD };
    const lanes = TRAJ.map((t, i) => {
      const z = LZ(i), bed = P.box(1.35, 0.05, 0.3, '#3A3D4A', { r: 0.02 }); bed.position.set((GX0 + GX1) / 2 + 0.1, 0, z); S.add(bed);
      const bot = P.robot(CHAR, { scale: 0.7 }); bot.position.set(GX0 - 0.45, 0, z); S.add(bot);
      const depot = P.box(0.42, 0.3, 0.46, '#F4F1EA', { r: 0.04 }); depot.position.set(GX1 + 0.42, 0, z); S.add(depot);
      const lamps = [0, 1].map(k => { const l = P.lamp(GREY, { h: 0.06, r: 0.06 }); l.position.set(GX1 + 0.32 + k * 0.2, 0.3, z); S.add(l); return l; });
      const grader = P.lamp(GREY, { h: 0.45, r: 0.12 }); grader.position.set(GX1 + 0.95, 0, z); S.add(grader);
      const parcels = [0, 1].map(() => { const m = new THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.21, 0.19, 0.21, '#fff', { r: 0.03, material: m }); b.userData.noFit = true; S.add(b); return { b, m }; });
      const gate = P.gate(0.36, RED, { h: 0.32 }); gate.position.set(GX0 - 0.05, 0, z); gate.rotation.y = Math.PI / 2; S.add(gate);
      return { z, bot, lamps, grader, parcels, gate };
    });
    const frameM = new THREE.MeshLambertMaterial({ color: GOLD }), frame = new THREE.Group(); S.add(frame);
    const fbars = [0, 1, 2, 3].map(() => { const b = P.box(1, 0.05, 0.05, GOLD, { r: 0.01, material: frameM }); b.userData.noFit = true; frame.add(b); return b; });
    function placeFrame(x0, x1, z0, z1) { const w = x1 - x0, d = z1 - z0; fbars[0].scale.x = w; fbars[0].position.set((x0 + x1) / 2, 0.06, z0); fbars[1].scale.x = w; fbars[1].position.set((x0 + x1) / 2, 0.06, z1); [2, 3].forEach((j, n) => { fbars[j].scale.x = d; fbars[j].rotation.y = Math.PI / 2; fbars[j].position.set(n ? x1 : x0, 0.06, (z0 + z1) / 2); }); }
    S.add(P.keep(-3.15, 3.2, 1.75, -1.0, 1.2));

    let F = null, G = null;
    function draw() {
      F = filter(st.tau, st.big); G = TRAJ.map(t => grade(t, st));
      bar.position.y = DECK + st.tau * K;
      F.forEach((f, i) => { const c = cols[i], g = f.gain; c.up.userData.set({ h: Math.max(0.02, g * K), color: f.keep ? GOOD : GREY }); c.up.visible = g > 0.01; c.down.visible = g < -0.01; c.down.scale.y = Math.max(0.02, -g * K); c.down.position.y = DECK - 0.06 - Math.max(0.02, -g * K); c.lp.userData.set({ color: f.keep ? (g > 0.05 ? GOOD : RED) : GREY, on: f.keep }); });
      if (st.byState) placeFrame(GX1 + 0.13, GX1 + 0.72, LZ(0) - 0.32, LZ(2) + 0.32); else placeFrame(GX0 - 0.05, GX1 + 0.1, LZ(0) - 0.25, LZ(2) + 0.25);
      TRAJ.forEach((t, i) => { const g = G[i], L = lanes[i], pass = st.byState ? g.stateOk : g.ast, ok = pass === g.stateOk;
        L.grader.userData.set({ color: ok ? (pass ? GOOD : GREY) : RED, on: true });
        L.gate.visible = !!t.hallucinated && st.abstain; L.gate.userData.set({ open: false });
        L.lamps[0].userData.set({ color: t.state.booked ? BLUE : GREY, on: !!t.state.booked }); L.lamps[1].userData.set({ color: t.state.texted ? GOLD : GREY, on: !!t.state.texted });
        L.lamps.forEach(l => { l.visible = !t.hallucinated; });
        L.parcels.forEach((p, k) => { const c = g.calls[k]; p.b.visible = !!c; if (!c) return; const name = norm(c).split('(')[0]; p.m.color.set(CALLC[name] || RED); });
      });
      paint();
    }
    function paint() {
      const T = st.t % 4;
      lanes.forEach((L, i) => { const g = G[i], t = TRAJ[i];
        L.parcels.forEach((p, k) => { const c = g.calls[k]; if (!c) return; const u = Math.max(0, Math.min(1, (T - k * 0.9) / 1.6)), failed = / → /.test(c) && u >= 1;
          const x = GX0 + u * (GX1 - GX0 + 0.05) - k * 0.0, lift = failed ? 0.18 : 0; p.b.position.set(u >= 1 ? GX1 - 0.15 - k * 0.22 : x, 0.05 + lift, L.z); if (failed) p.m.color.set(RED); else p.m.color.set(CALLC[norm(c).split('(')[0]] || RED); });
        L.bot.userData.set({ busy: g.calls.length > 0 && T < 3, lamp: t.hallucinated && st.abstain ? GOOD : GOLD });
      });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const kept = () => F.filter(f => f.keep).length;
    const wrongGrades = () => G.filter(g => (st.byState ? g.stateOk : g.ast) !== g.stateOk).length;
    const controls = [
      { type: 'slider', label: 'Keep threshold τ', min: 0, max: 3, step: 0.1, get: () => st.tau, set: v => set({ tau: Math.round(v * 10) / 10 }), fmt: v => (Math.round(v * 10) / 10).toFixed(1) },
      { type: 'buttons', label: 'Model', options: ['Small', 'Large'], get: () => st.big ? 1 : 0, act: i => set({ big: !!i }) },
      { type: 'toggle', label: 'Grade by resulting state', short: 'State', get: () => st.byState, set: v => set({ byState: !!v }) },
      { type: 'toggle', label: 'Say so when no tool fits', short: 'Abstain', get: () => st.abstain, set: v => set({ abstain: !!v }) },
    ];
    const readouts = [
      { label: 'Calls kept', get: () => ({ v: `${kept()} of 5`, sub: `${F.filter(f => f.keep && f.gain <= 0.05).length} that don't help`, bad: F.some(f => f.keep && f.gain <= 0.05), good: kept() > 0 && !F.some(f => f.keep && f.gain <= 0.05) }) },
      { label: 'Grades', get: () => ({ v: wrongGrades() ? `${wrongGrades()} wrong` : 'all right', sub: st.byState ? 'by state' : 'by call list', bad: wrongGrades() > 0, good: !wrongGrades() }) },
      { label: 'No-tool question', get: () => ({ v: st.abstain ? 'abstained' : 'invented a tool', sub: 'weather in Tamale', good: st.abstain, bad: !st.abstain }) },
    ];
    const labels = [
      { name: 'gain', t: 'Loss drop per call', d: 'Up: the result made the next words easier. Red, below: it made them harder. The gold bar is the threshold τ', icon: 'filter', atV: Vv(TX(0) - 0.15, DECK + 0.1, -0.25) },
      { name: 'tools', t: 'Candidate calls', d: 'Blue calculator, purple calendar, brown Q&A, green translator. A lamp lights when the call is kept', icon: 'link', atV: Vv(TX(0) - 0.2, 0.15, 0.75) },
      { name: 'grade', t: 'The grader', d: 'Green pass, grey fail, red a wrong grade. The gold frame shows what it checks: the calls or the depot', icon: 'check', atV: Vv(GX1 + 1.05, 0.45, LZ(0)) },
      { name: 'depot', t: 'What changed', d: 'Blue lamp: pickup booked. Gold lamp: text sent', icon: 'book', atV: Vv(GX1 + 1.05, 0.45, LZ(2)) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep every candidate call', hint: 'τ = 0', on: () => set({ ...D0, tau: 0 }), off: reset },
      { label: 'Grade by matching the call list', hint: 'AST match', on: () => set({ ...D0, byState: false }), off: reset },
      { label: 'Always call a tool', hint: 'no abstaining', on: () => set({ ...D0, abstain: false }), off: reset },
    ];
    function status() {
      if (F.some(f => f.keep && f.gain <= 0.05)) { const bad = F.filter(f => f.keep && f.gain <= 0.05); return { ok: false, msg: `<b>With τ = ${st.tau.toFixed(1)}, ${bad.length} call${bad.length > 1 ? 's' : ''} that don't help ${bad.length > 1 ? 'are' : 'is'} kept: ${bad.map(b => b.call).join(', ')}.</b> Their results don't appear in the next words, so the loss doesn't drop${st.big ? '' : ', and a small model even pays for the extra text'}. Fine-tuning on them teaches the model to call tools for nothing. Keep a call only when its result makes the next tokens easier to predict.` }; }
      if (!st.byState && wrongGrades()) return { ok: false, msg: '<b>Matching the call list gets both booking trajectories wrong.</b> The first did the same two things in another order and left the right state: marked fail. The second matched the list exactly, but the booking came back "fully booked" and the model carried on: marked pass. Check what the tools actually changed.' };
      if (!st.abstain) return { ok: false, msg: '<b>Asked about the weather, the model called get_weather, a tool that isn\'t in its registry.</b> When no tool fits, the right move is to say so. The leaderboard has a whole category for this: noticing when not to call.' };
      return { ok: true, msg: `<b>${kept()} of 5 candidate calls kept: ${F.filter(f => f.keep).map(f => f.call.split('(')[0]).join(', ')}, each lowering the loss on the next words by at least ${st.tau.toFixed(1)}.</b> ${st.big ? '' : 'The small model keeps fewer: the inserted text costs it more than the result helps. '}Graded by state, the reordered trajectory passes and the silent failure fails; the weather question gets an honest "no tool for that".` };
    }
    return {
      update: dt => { st.t += dt; lanes.forEach(L => { L.bot.userData.tick(dt); L.gate.userData.tick(dt, true); }); cols.forEach(c => c.up.userData.tick(dt)); paint(); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'When is a tool worth it?', home: true, say: 'Toolformer lets a model try tool calls inside its own training text, and keeps a call only if the result makes the next words easier to predict.', act: m => m.set({ tau: 1.5, big: true, byState: true, abstain: true }) },
    { t: 'Helpful and useless calls', home: true, say: 'Adding two sales figures helps predict the total that follows. Defining a tomato does not help with anything that comes next.', act: m => m.set({ tau: 1.5 }) },
    { t: 'Small models', home: true, say: 'A small model gains less from the results and is distracted by the inserted text. Tool use emerged with scale.', act: m => m.set({ big: false }) },
    { t: 'Grade the result', home: true, say: 'To grade an agent, check what its tools changed. Did the pickup actually get booked?', act: m => m.set({ big: true, byState: true }) },
    { t: 'Not the call list', home: true, say: 'Matching the exact list of calls fails a correct run done in another order, and passes one where the booking quietly failed.', act: m => m.set({ byState: false }) },
    { t: 'No tool fits', home: true, say: 'Asked about the weather with no weather tool, the right answer is to say so, not to make up a tool.', act: m => m.set({ byState: true, abstain: true }) },
  ],
  check: [
    { q: 'When does Toolformer keep a candidate tool call?', options: ['When its result lowers the loss on the next tokens by at least a threshold', 'Always', 'When a person approves it'], answer: 0, why: 'Self-supervised: the text decides.', hint: 'Try Keep every candidate call.' },
    { q: 'Two trajectories: one reorders correct calls, one matches the list but a call failed. Graded by state?', options: ['First passes, second fails', 'Both pass', 'First fails, second passes'], answer: 0, why: 'State shows what actually happened.', hint: 'Try Grade by matching the call list.' },
    { q: 'No tool can answer the question. What should the model do?', options: ['Say so', 'Invent a likely tool', 'Call the closest tool anyway'], answer: 0, why: 'Hallucination detection is a scored category.', hint: 'Try Always call a tool.' },
  ],
  terms: [
    ['Toolformer', 'Self-supervised tool learning: keep calls that help predict text.'],
    ['Loss', 'How surprised the model is by the next tokens.'],
    ['State-based evaluation', 'Checking what the tools changed, not the call list.'],
    ['AST match', 'Grading by comparing the exact calls made.'],
    ['Abstention', 'Declining to call a tool when none fits.'],
    ['BFCL', 'The Berkeley Function Calling Leaderboard.'],
  ],
  deeper: '<p><b>Leaderboard weights.</b> Version 4 weights agentic tasks 40%, multi-turn 30%, live user prompts 10%, synthetic cases 10% and hallucination 10%. Single-turn calling is close to solved; memory, choosing from earlier results and long chains are not.</p><p><b>Schemas, validation and parallel calls</b> are covered in the function-calling, tool-design and parallel-call lessons.</p><p><b>About this machine.</b> The losses use an explicit copy-or-guess model over a 5,000-word vocabulary, weighted over the next five tokens; filtering and both grading methods are computed live.</p>',
  code: {
    title: 'Keep a tool call only if it helps',
    note: 'Adapted from the course\'s tool-use lesson.',
    text: `
import math

WEIGHTS = [1.0, 0.8, 0.6, 0.4, 0.2]

def weighted_loss(next_tokens, logprob):
    total = sum(w * -logprob(t) for w, t in zip(WEIGHTS, next_tokens))
    return total / sum(WEIGHTS[:len(next_tokens)])

def keep_call(model, prefix, call, result, next_tokens, tau=1.0):
    without = weighted_loss(next_tokens, lambda t: model.logprob(prefix, t))
    with_result = weighted_loss(next_tokens,
        lambda t: model.logprob(prefix + f"[{call} -> {result}]", t))
    return without - with_result >= tau        # the result must make the text easier
`,
  },
};
