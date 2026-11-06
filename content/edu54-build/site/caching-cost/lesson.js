// Caching, routing and rate limits: an electricity company's helpline bot in Lusaka handles 10,000 questions a day, plus a misbehaving script that sends 3,000 more.
// 120 kinds of question with Zipf-like popularity; 30% of traffic is "is there an outage in <area>?", with 12 areas whose answers differ. Phrasings follow a long tail of 200.
// 45% of questions carry personal details (a meter number, a bill) and have answers nobody else can reuse; the script's requests are all different.
// Exact cache: the same words seen before today. Semantic cache: best similarity among earlier questions; a same-meaning match scores 0.995 − 0.1·u²,
// the same question about a different area scores 0.90 + 0.065·u (only the place name differs), and a personal question against the same kind scores 0.90 + 0.07·u.
// A hit above the threshold is served; a hit on the wrong area or someone else's details is a wrong answer.
// Router: 30% of questions are hard; it sends easy ones to a small model (right 95% on easy, 55% on hard) and hard ones to a large model (96%), and misjudges 10%.
// Rate limit: 60 requests an hour per user; the script is one user. Prices per million tokens (in US dollars, shown in the learner's currency): large 3 in / 15 out,
// small 0.25 / 1.25; each call 1,800 tokens in and 250 out; embeddings for the semantic cache 0.02 per million.
const NDAY = 10000, NSCRIPT = 3000, NK = 120, NAREA = 12, NPH = 200, FAM = 0.3, PERS = 0.45;
const AREAS = ['Kabwata', 'Matero', 'Chilenje', 'Kalingalinga', 'Mtendere', 'Woodlands', 'Chawama', 'Kabulonga', 'Garden', 'Emmasdale', 'Libala', 'Chelston'];
const PRICE = { big: (1800 * 3 + 250 * 15) / 1e6, small: (1800 * 0.25 + 250 * 1.25) / 1e6, emb: 300 * 0.02 / 1e6 };
let seed = 17; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const zipf = n => { const w = Array.from({ length: n }, (_, i) => 1 / (i + 1)), s = w.reduce((a, b) => a + b); return w.map(x => x / s); };
const KW = zipf(NK - 1), PW = zipf(NPH);
const pick = (w, u) => { let c = 0; for (let i = 0; i < w.length; i++) { c += w[i]; if (u < c) return i; } return w.length - 1; };
const REQ = [];
for (let i = 0; i < NDAY + NSCRIPT; i++) {
  const script = i >= NDAY, fam = !script && rnd() < FAM;
  const k = script ? 1 + Math.floor(rnd() * (NK - 1)) : fam ? 0 : 1 + pick(KW, rnd());
  REQ.push({ script, k, pers: script || (!fam && rnd() < PERS), id: i, area: fam ? Math.floor(rnd() * NAREA) : -1, ph: script ? Math.floor(rnd() * NPH) : pick(PW, rnd()), hard: rnd() < 0.3, us: rnd(), uf: rnd(), ur: rnd(), ua: rnd(), at: script ? 9 + rnd() * 2 : rnd() * 24 });
}
REQ.sort((a, b) => a.at - b.at);
function run(st) {
  const seenExact = new Set(), seenMeaning = new Set(), seenFam = new Set(), seenKind = new Set(), perHour = new Map();
  const c = { limited: 0, exact: 0, sem: 0, wrongHit: 0, wrongArea: 0, wrongPers: 0, big: 0, small: 0, wrong: 0, served: 0 };
  let cost = 0;
  const fate = REQ.map(q => {
    const user = q.script ? 'script' : null;
    if (st.limit && user) { const h = Math.floor(q.at); const n = (perHour.get(h) || 0) + 1; perHour.set(h, n); if (n > 60) { c.limited++; return 'limited'; } }
    c.served++;
    const meaning = q.pers ? `p${q.id}` : `${q.k}:${q.area}`, words = `${meaning}:${q.ph}`;
    let out = null;
    if (st.exact && seenExact.has(words)) { c.exact++; out = 'exact'; }
    else if (st.sem) {
      cost += PRICE.emb;
      const sSame = seenMeaning.has(meaning) ? 0.995 - 0.1 * q.us * q.us : 0, sFam = q.pers ? (seenKind.has(q.k) ? 0.9 + 0.07 * q.uf : 0) : q.k === 0 && [...Array(NAREA).keys()].some(a => a !== q.area && seenFam.has(a)) ? 0.9 + 0.065 * q.uf : 0;
      const best = Math.max(sSame, sFam);
      if (best >= st.thr) { if (sFam > sSame) { c.sem++; c.wrongHit++; c.wrong++; if (q.pers) c.wrongPers++; else c.wrongArea++; out = 'wrong'; } else { c.sem++; out = 'sem'; } }
    }
    seenExact.add(words); seenMeaning.add(meaning); if (q.k === 0) seenFam.add(q.area); if (!q.pers) seenKind.add(q.k);
    if (out) return out;
    /* a model call */
    const small = st.route === 2 || (st.route === 1 && (q.ur < 0.1 ? q.hard : !q.hard));
    const right = small ? (q.hard ? q.ua < 0.55 : q.ua < 0.95) : q.ua < 0.96;
    if (small) { c.small++; cost += PRICE.small; } else { c.big++; cost += PRICE.big; }
    if (!right) c.wrong++;
    return small ? (right ? 'small' : 'smallx') : (right ? 'big' : 'bigx');
  });
  const user = REQ.filter(q => !q.script).length;
  const wrongUsers = REQ.reduce((a, q, i) => a + (!q.script && /x$|wrong/.test(fate[i]) ? 1 : 0), 0);
  return { fate, c, cost, wrongUsers, wrongRate: wrongUsers / user, hit: (c.exact + c.sem) / c.served };
}
const BASE = run({ limit: false, exact: false, sem: false, thr: 0.96, route: 0 });

export default {
  slug: 'caching-cost',
  title: 'Cost: cache, route, rate-limit',
  description: 'A helpline bot answers 10,000 questions a day. Add a rate limit, a cache and a router, and watch the bill and the wrong answers.',
  money: true,
  overview: 'Most of an LLM bill comes from tokens, and much of it is waste: the same questions asked again, easy questions sent to the biggest model, and runaway clients. An exact cache stores answers by the exact words of the request and replays them for free; it only catches identical requests. A semantic cache embeds each question and serves a stored answer when a new question is close enough in meaning, which catches rephrasings, but the threshold is a trade-off: too strict and few questions hit, too loose and questions that differ in one important word, like a place name, get someone else\'s answer. Questions whose answers depend on time, place or the user need that detail in the cache key, or no caching at all. A router sends easy questions to a small, cheap model and hard ones to a large one; it saves a lot, but a router that misjudges sends some hard questions to a model that can\'t handle them. Rate limits (a token bucket per user) and budget circuit breakers stop one client from burning the month\'s budget in an afternoon. Track cost per request, per feature and per user, so you know which layer to tune.',
  keywords: ['LLM cost optimisation', 'semantic cache', 'exact cache', 'model routing', 'rate limiting', 'token bucket', 'LLM cost'],
  orient: 'landscape',
  view: { target: [0, 0.55, 0.1], dir: [0.4, 0.85, 1.3], half: 2.1, wide: 6.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { limit: true, exact: true, sem: true, thr: 0.97, route: 1 }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', GOLD = '#E3A72F', BLUE = '#3D6BD6';
    /* requests ride belts: intake → rate-limit gate → cache → router → a small or a large model */
    const Z = -0.25;
    const hopper = P.station('', 0.7, 0.55, 0.7, '#8E91A3'); hopper.position.set(-2.95, 0, Z); S.add(hopper);
    const bA = P.belt(V(-2.55, 0, Z), V(-1.75, 0, Z)), bB = P.belt(V(-1.55, 0, Z), V(-0.35, 0, Z)), bC = P.belt(V(-0.95, 0, Z + 0.3), V(-0.95, 0, 1.25), { speed: 1.2 });
    const bD = P.belt(V(-0.05, 0, Z - 0.15), V(1.35, 0, -0.95), { speed: 1.1 }), bE = P.belt(V(-0.05, 0, Z + 0.15), V(1.35, 0, 0.55), { speed: 1.1 });
    S.add(bA, bB, bC, bD, bE);
    const gate = P.gate(0.62, RED, { h: 0.6 }); gate.position.set(-1.65, 0, Z); gate.rotation.y = Math.PI / 2; S.add(gate);
    const away = P.tower(0.45, 0.45, '#8E91A3', { h: 0.02, size: 0.27 }); away.position.set(-1.65, 0, 0.75); S.add(away);
    const shelf = P.shelf(4, { levels: 2, lh: 0.42, cell: 0.36 }); shelf.position.set(-0.95, 0, -1.05); S.add(shelf);
    const tray = P.box(0.7, 0.12, 0.5, '#D8D2C4', { r: 0.05 }); tray.position.set(-0.95, 0, 1.45); S.add(tray);
    const router = P.station('', 0.4, 0.5, 0.5, GOLD); router.position.set(-0.15, 0, Z); S.add(router);
    const arm = P.box(0.5, 0.06, 0.08, CHAR, { r: 0.02 }); arm.position.set(0, 0.52, 0); router.add(arm);
    const pad = (w, x, z) => { const s0 = P.station(w, 0.9, 0.22, 0.75, '#5E6170', { size: 0.17 }); s0.position.set(x, 0, z); S.add(s0); return s0; };
    pad('', 1.7, -1.05); pad('', 1.7, 0.65);
    const small = P.robot(BLUE, { scale: 1.5 }), large = P.robot(CHAR, { scale: 1.9 });
    small.position.set(1.7, 0.22, -1.05); large.position.set(1.7, 0.22, 0.65); S.add(small, large);
    const jar = P.jar(0.36, 1.2, { max: 12 }); jar.position.set(2.75, 0, -0.7); S.add(jar);
    const wrong = P.tower(0.5, 0.5, RED, { size: 0.27 }); wrong.position.set(2.75, 0, 0.75); S.add(wrong);
    const ticks = [bA, bB, bC, bD, bE, gate, away, small, large, wrong];

    let R = null, sample = [], si = 0, gap = 0, busyS = 0, busyL = 0;
    const M = v => S.money.of(v), K = n => n.toLocaleString('en');
    const NS = 240;
    const toModel = f => { const sm = /^small/.test(f), bad = /x$/.test(f); (sm ? bD : bE).userData.send(bad ? RED : sm ? BLUE : CHAR, { done: () => { if (sm) busyS = 0.6; else busyL = 0.6; } }); };
    function spawn() {
      const f = R.fate[sample[si++ % sample.length]];
      bA.userData.send('#FFFFFF', { done: () => {
        if (f === 'limited') return;
        bB.userData.send('#FFFFFF', { done: () => {
          if (f === 'exact' || f === 'sem' || f === 'wrong') bC.userData.send(f === 'wrong' ? RED : GOLD);
          else toModel(f);
        } });
      } });
    }
    function draw() {
      R = run(st);
      const c = R.c, total = REQ.length;
      sample = Array.from({ length: NS }, (_, k) => Math.floor((k * 7919) % total));
      gate.userData.set({ open: !st.limit, color: st.limit ? RED : '#9A968C' });
      away.userData.set({ h: 0.02 + c.limited / total * 6, cap: c.limited ? K(c.limited) : '' });
      const ex = st.exact ? Math.max(1, Math.round(c.exact / c.served * 12)) : 0, sm = st.sem ? Math.max(1, Math.round(c.sem / c.served * 12)) : 0;
      shelf.userData.set({ fill: [0, 1, 2, 3].map(i => i < Math.min(4, sm) ? (c.wrongHit > 50 && i >= Math.min(4, sm) - 2 ? RED : GOLD) : null).concat([0, 1, 2, 3].map(i => i < Math.min(4, ex) ? GOLD : null)) });
      arm.rotation.y = [0.7, 0, -0.7][st.route];
      router.userData.set({ color: st.route === 1 ? GOLD : '#B9B3A6' });
      jar.userData.set({ n: Math.max(1, Math.round(12 * R.cost / BASE.cost)) });
      wrong.userData.set({ h: 0.05 + Math.min(2.2, R.wrongRate * 16), cap: `${(R.wrongRate * 100).toFixed(1)}%` });
    }
    draw();
    const set = p => { Object.assign(st, p); [bA, bB, bC, bD, bE].forEach(b => b.userData.clear()); draw(); };
    const update = dt => {
      gap -= dt; if (gap <= 0) { gap = 0.28; spawn(); }
      busyS -= dt; busyL -= dt; small.userData.set({ busy: busyS > 0 }); large.userData.set({ busy: busyL > 0 });
      ticks.forEach(t => t.userData.tick?.(dt));
    };
    const controls = [
      { type: 'toggle', label: 'Rate limit per user', short: 'Rate limit', get: () => st.limit, set: v => set({ limit: !!v }) },
      { type: 'toggle', label: 'Exact cache', get: () => st.exact, set: v => set({ exact: !!v }), quick: false },
      { type: 'toggle', label: 'Semantic cache', get: () => st.sem, set: v => set({ sem: !!v }) },
      { type: 'slider', label: 'Similarity needed for a hit', min: 0.88, max: 0.99, step: 0.01, get: () => st.thr, set: v => set({ thr: Math.round(+v * 100) / 100 }) },
      { type: 'buttons', label: 'Router', options: ['All large', 'Easy → small', 'All small'], get: () => st.route, act: i => set({ route: i }) },
    ];
    const readouts = [
      { label: 'Bill for the day', get: () => ({ v: M(R.cost), sub: `${Math.round((1 - R.cost / BASE.cost) * 100)}% saved`, good: R.cost < BASE.cost * 0.4 }) },
      { label: 'Wrong answers', get: () => ({ v: `${(R.wrongRate * 100).toFixed(1)}%`, sub: 'of people\'s questions', bad: R.wrongRate > 0.08, good: R.wrongRate < 0.05 }) },
      { label: 'Cache hits', get: () => ({ v: `${Math.round(R.hit * 100)}%`, sub: 'answered without a model' }) },
    ];
    const labels = [
      { name: 'gate', t: 'Rate limit', d: 'Turns the runaway script away', icon: 'shield', atV: V(-1.65, 0.62, Z - 0.35) },
      { name: 'cache', t: 'Cache', d: 'Repeats answered from the shelf', icon: 'layers', atV: V(-1.7, 0.9, -1.05) },
      { name: 'jar', t: 'The bill', d: 'Coins left: cost against no caching', icon: 'money', atV: V(3.1, 1.2, -0.7) },
      { name: 'wrong', t: 'Wrong answers', d: 'Share of people misled', icon: 'gauge', atV: V(3.0, 0.05, 1.0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Cache too loose', hint: 'similarity 0.90 is enough', on: () => set({ ...D0, thr: 0.9 }), off: reset },
      { label: 'Small model for everything', hint: 'the cheapest route', on: () => set({ ...D0, route: 2 }), off: reset },
      { label: 'No rate limit', hint: 'the script runs free', on: () => set({ ...D0, limit: false }), off: reset },
    ];
    function status() {
      const d = run(D0);
      if (st.sem && R.c.wrongHit > 50) return { ok: false, msg: `<b>Cache too loose: ${K(R.c.wrongHit)} people got someone else's answer: ${K(R.c.wrongArea)} about the wrong area's power, ${K(R.c.wrongPers)} about someone else's meter or bill.</b> "Is there an outage in Matero?" and "…in Kabwata?" differ by one word, so their vectors score above ${st.thr.toFixed(2)}. Raise the threshold, put the area in the cache key, and never cache answers that depend on the person asking.` };
      if (st.route === 2) return { ok: false, msg: `<b>Small model for everything: the bill drops to ${M(R.cost)}, but ${(R.wrongRate * 100).toFixed(1)}% of answers are wrong.</b> The small model handles easy questions well and gets almost half the hard ones wrong. Routing only easy questions to it keeps most of the saving: ${M(d.cost)} with ${(d.wrongRate * 100).toFixed(1)}% wrong.` };
      if (!st.limit) { const scr = R.fate.reduce((a, f, j) => a + (REQ[j].script && /^big|^small/.test(f) ? (/^big/.test(f) ? PRICE.big : PRICE.small) : 0), 0); return { ok: false, msg: `<b>No rate limit: a buggy script sent ${K(NSCRIPT)} requests in two hours, costing ${M(scr)} of today's ${M(R.cost)}.</b> One client can spend a day's budget before anyone notices. Cap requests per user (a token bucket), and add a budget breaker that switches to cheaper models, then stops, as spending nears the limit.` }; }
      const off = [!st.exact && 'exact cache', !st.sem && 'semantic cache', st.route === 0 && 'router'].filter(Boolean);
      return { ok: R.cost < BASE.cost * 0.5 && R.wrongRate < 0.06 ? true : undefined, msg: `<b>${M(R.cost)} for the day, ${Math.round((1 - R.cost / BASE.cost) * 100)}% less than with nothing, with ${(R.wrongRate * 100).toFixed(1)}% wrong answers.</b> ${off.length ? `Still off: ${off.join(', ')}.` : `Caches answer ${Math.round(R.hit * 100)}% of questions for almost nothing; the router sends easy ones to the small model; the limit stops the script.`}${R.c.wrongHit ? ` ${K(R.c.wrongHit)} cache hits gave someone else's answer.` : ''}` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Every question, the largest model', home: true, say: 'An electricity company\'s helpline bot in Lusaka sends every question to its largest model, and a buggy script adds thousands more. The bill is high, and much of it is waste.', act: m => m.set({ limit: false, exact: false, sem: false, thr: 0.97, route: 0 }) },
    { t: 'Cap each user', home: true, say: 'A rate limit gives each user a budget of requests an hour. The script is turned away after its share, and the bill drops.', act: m => m.set({ limit: true }) },
    { t: 'Cache repeated questions', home: true, say: 'Many people ask the same things. An exact cache replays answers to identical words; a semantic cache also catches rephrasings with the same meaning.', act: m => m.set({ exact: true, sem: true }) },
    { t: 'Too loose a cache', home: true, say: 'Loosen the cache, and questions that differ in one detail look alike. Matero is told about Kabwata\'s power, and one person\'s bill question gets another person\'s answer. Anything that depends on place, time or the person asking needs care.', act: m => m.set({ thr: 0.9 }) },
    { t: 'Route by difficulty', home: true, say: 'Back to a strict cache. A router sends easy questions to a small, cheap model and hard ones to the large model.', act: m => m.set({ thr: 0.97, route: 1 }) },
    { t: 'Not everything small', home: true, say: 'Send everything to the small model and the bill is lowest of all, but almost half the hard questions come back wrong. Cost is only one side of the ledger.', act: m => m.set({ route: 2 }) },
  ],
  check: [
    { q: 'Two questions differ only by a place name. What goes wrong with a loose semantic cache?', options: ['One person gets the answer meant for the other place', 'The cache gets slower', 'Nothing; they mean the same'], answer: 0, why: 'Put details the answer depends on into the cache key.', hint: 'Try the Cache too loose break.' },
    { q: 'What does a model router do?', options: ['Sends easy questions to a small model and hard ones to a large one', 'Balances load across servers', 'Caches answers'], answer: 0, why: 'Most questions are easy; the saving is large if the router judges well.', hint: 'Compare the three Router settings.' },
    { q: 'Why rate-limit per user?', options: ['So one client can\'t spend the budget for everyone', 'To make answers better', 'Because models need rest'], answer: 0, why: 'A token bucket allows bursts but caps the average.', hint: 'Try No rate limit.' },
  ],
  terms: [
    ['Exact cache', 'Stored answers looked up by the exact text of the request.'],
    ['Semantic cache', 'Stored answers served when a new question is close enough in meaning.'],
    ['Similarity threshold', 'How close in meaning a question must be to reuse a stored answer.'],
    ['Model router', 'A step that picks a cheaper or stronger model for each request.'],
    ['Token bucket', 'A rate limit that refills at a steady rate and allows short bursts.'],
    ['Circuit breaker', 'A rule that throttles or stops spending as a budget limit nears.'],
    ['Batch API', 'Sending many requests to be answered later at a lower price.'],
  ],
  deeper: '<p><b>Provider prompt caching.</b> Model providers also cache the start of a prompt that repeats, such as the system prompt and tool list, and charge much less for it on later calls; that has its own lesson. It stacks with the caches here.</p><p><b>Batching.</b> Work that can wait, such as nightly reports, evaluations or bulk labelling, can go through batch endpoints at a large discount with answers within a day.</p><p><b>Track it.</b> Log model, tokens in and out, cost, latency, cache hit and user for every call. The biggest savings usually come from a few features or users you would not have guessed.</p><p><b>About this machine.</b> Traffic, similarity scores and model accuracy are simulated with the rules in the file header; prices follow one large and one small model\'s published per-token prices, converted to your currency. Change the inputs and every count is recomputed for the whole day.</p>',
  code: {
    title: 'A semantic cache with a safe key',
    note: 'Adapted from the course\'s caching and cost lesson.',
    text: `
import numpy as np

class SemanticCache:
    def __init__(self, threshold=0.97):
        self.threshold, self.entries = threshold, []    # (key, vector, answer)

    def get(self, question, key):
        v = embed(question)
        best = max(((float(v @ e[1]), e) for e in self.entries if e[0] == key),
                   default=(0.0, None), key=lambda t: t[0])
        return best[1][2] if best[0] >= self.threshold else None

    def put(self, question, key, answer):
        self.entries.append((key, embed(question), answer))

# the key carries what the answer depends on: an outage answer is per area
answer = cache.get(q, key=("outage", area)) or ask_model(q)
`,
  },
};
