// Exam prep, context placement: an invented travel agency in Zanzibar has five kinds of fact to give Claude. Each fact has a lifetime (this
// task or durable), a scope (one person, a team, an application), a freshness (stable or changing daily) and a size. Each place, the message,
// memory, a Project's knowledge, a live connector or a cached system prompt, suits some combinations. The right place matches all four;
// mismatches are explained from the property that breaks. Product behaviour changes; check the current official documentation.
const PLACES = [
  { id: 'msg', n: 'This message', life: 'task', scope: ['me', 'team'], fresh: ['stable'], size: ['small', 'large'] },
  { id: 'mem', n: 'Memory', life: 'durable', scope: ['me'], fresh: ['stable'], size: ['small'] },
  { id: 'proj', n: 'Project knowledge', life: 'durable', scope: ['me', 'team'], fresh: ['stable'], size: ['small', 'large'] },
  { id: 'live', n: 'Live connector', life: 'durable', scope: ['me', 'team', 'app'], fresh: ['stable', 'daily'], size: ['small', 'large'] },
  { id: 'cache', n: 'Cached system prompt', life: 'durable', scope: ['app'], fresh: ['stable'], size: ['small', 'large'] },
];
const FACTS = [
  { n: '"I prefer British spelling"', life: 'durable', scope: 'me', fresh: 'stable', size: 'small', best: 'mem' },
  { n: 'Refund policy, 40 pages, reviewed each quarter', life: 'durable', scope: 'team', fresh: 'stable', size: 'large', best: 'proj' },
  { n: 'Today\'s ferry timetable and seat counts', life: 'durable', scope: 'team', fresh: 'daily', size: 'large', best: 'live' },
  { n: '"Use a two-column table for this one report"', life: 'task', scope: 'me', fresh: 'stable', size: 'small', best: 'msg' },
  { n: 'Booking app\'s instructions and 30-page reference, sent with every request', life: 'durable', scope: 'app', fresh: 'stable', size: 'large', best: 'cache' },
];
const WHY = {
  life: (f, p) => f.life === 'task' ? `it applies to this one task only, so storing it in ${p.n.toLowerCase()} would leak it into later work` : `it is needed again and again, and ${p.n.toLowerCase()} lasts only for this task`,
  scope: (f, p) => `it belongs to ${f.scope === 'me' ? 'one person' : f.scope === 'team' ? 'the whole team' : 'an application'}, which ${p.n.toLowerCase()} does not serve`,
  fresh: (f, p) => `it changes every day, and ${p.n.toLowerCase()} would hold a copy that is wrong by tomorrow`,
  size: (f, p) => `it is too large for ${p.n.toLowerCase()}`,
};
function judge(o) {
  const f = FACTS[o.fact], p = PLACES.find(x => x.id === o.place);
  const broken = [];
  if (!p.fresh.includes(f.fresh)) broken.push('fresh');
  if (p.life !== f.life && !(p.id === 'live' && f.life === 'durable')) broken.push('life');
  if (!p.scope.includes(f.scope)) broken.push('scope');
  if (!p.size.includes(f.size)) broken.push('size');
  const right = p.id === f.best;
  return { f, p, broken, right, best: PLACES.find(x => x.id === f.best) };
}

export default {
  slug: 'exam-context-knowledge-memory-and-caching',
  title: 'Exam prep: put each fact in the right kind of context',
  description: 'A travel agency has five kinds of fact to give Claude. Put each where it belongs by how long it lives, who it serves, how fast it changes and its size.',
  overview: 'Claude only knows what is in its context for a request, and there are several ways to put something there, each with a different lifetime and scope. The message itself is right for material and instructions that belong to this task alone; put a one-off formatting request into standing instructions and it will quietly shape every later answer. Memory suits small, durable facts about one person, such as a spelling preference, not records of truth. A Project\'s instructions and knowledge base suit stable material a team reuses, such as a policy document, with retrieval when the material is large, and they need an owner, a source date and a review cadence, because a Project holding last quarter\'s policy will give last quarter\'s answer consistently. Material that changes often, such as prices, timetables or stock, should not be copied in at all: a connector or tool fetches the live version with the user\'s permissions when it is needed. In an application, a long prefix sent with every request, such as system instructions and a reference document, belongs at the start of the prompt where it can be cached, so later requests read it cheaply and quickly, while the parts that change go after it. Long context is not free even when it fits: more irrelevant material can bury the facts that matter, so give each request what it needs and say where facts came from and when. The question to ask of every fact is how long it should live, who it is for, how fast it changes and how large it is. Product limits and behaviour change; check the current official documentation.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'context management', 'memory', 'project knowledge', 'prompt caching', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.05, 0.3, -0.15], dir: [0.05, 1.05, 1.12], half: 1.15, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { fact: 2, place: 'live' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8';
    /* five places a fact can live, each its own kind of object: a tray for this message, a jar of memory, a shelf of project knowledge, a tank fed by a live pipe, a frozen stack for the cached prompt */
    const X = i => -2.25 + i * 0.8, BZ = -0.45;
    const tray = P.box(0.6, 0.06, 0.6, '#8E91A3', { r: 0.03 }); tray.position.set(X(0), 0, BZ); S.add(tray);
    const jar = P.jar(0.22, 0.55); jar.userData.set({ n: 7 }); jar.position.set(X(1), 0, BZ); S.add(jar);
    const shelf = P.shelf(3, { cell: 0.21, levels: 2, lh: 0.3, d: 0.36 }); shelf.position.set(X(2), 0, BZ); shelf.userData.set({ fill: Array(6).fill('#A9B8C9') }); S.add(shelf);
    const tank = P.tank(0.4, 0.5, 0.4, '#3E9B9B'); tank.userData.set({ level: 0.8 }); tank.position.set(X(3), 0, BZ); S.add(tank);
    const pipe = P.pipe([V(X(3), 0.1, -1.15), V(X(3), 0.72, -1.0), V(X(3), 0.62, BZ)], '#3E9B9B', { r: 0.03, n: 5 }); S.add(pipe);
    const cache = P.stack(0.55, 0.55, 0.12, { max: 5, color: '#A9D3E8' }); cache.userData.set({ n: 5 }); cache.position.set(X(4), 0, BZ); S.add(cache);
    /* a gold ring round where the fact belongs; a robot brings the parcel to your choice, and the parcel is big or small by the fact's size, gold if it changes daily */
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 8, 48), new THREE.MeshBasicMaterial({ color: SAF })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.03; ring.userData.noFit = true; S.add(ring);
    const bot = P.robot(BLUE, { scale: 0.42 }); bot.userData.noFit = true; S.add(bot);
    const pm = new THREE.MeshLambertMaterial({ color: BLUE }), parcel = P.box(1, 1, 1, '#fff', { r: 0.03, material: pm }); parcel.userData.noFit = true; S.add(parcel);
    /* four lamps for the fact's properties (lifetime, scope, freshness, size), then the verdict */
    const PK = ['life', 'scope', 'fresh', 'size'];
    const lamps = PK.map((k, i) => { const l = P.lamp(GOOD, { h: 0.26, r: 0.08 }); l.position.set(1.42 + i * 0.25, 0, BZ); S.add(l); return l; });
    const verdict = P.lamp(GOOD, { h: 0.45, r: 0.13 }); verdict.position.set(2.52, 0, BZ); S.add(verdict);
    S.add(P.keep(-2.65, 2.8, 1.0, -1.2, 0.85));

    let R = null;
    function draw() {
      R = judge(st);
      const i = PLACES.findIndex(p => p.id === st.place), big = R.f.size === 'large', s = big ? 0.28 : 0.15;
      bot.position.set(X(i) - 0.14, 0, 0.5); bot.userData.set({ color: R.right ? BLUE : BAD });
      parcel.scale.set(s, s, s); parcel.position.set(X(i) + 0.16, 0, 0.5); pm.color.set(R.f.fresh === 'daily' ? SAF : BLUE);
      ring.position.set(X(PLACES.findIndex(p => p.id === R.f.best)), 0.03, BZ);
      PK.forEach((k, j) => lamps[j].userData.set({ color: R.broken.includes(k) ? BAD : GOOD, on: true }));
      verdict.userData.set({ color: isOk() ? GOOD : RED, on: true });
    }
    function isOk() { return R.right; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'buttons', label: 'Fact', options: ['Spelling preference', 'Refund policy', 'Ferry timetable', 'One-off table format', 'App reference'], get: () => st.fact, act: i => set({ fact: i, place: FACTS[i].best }) },
      { type: 'buttons', label: 'Put it in', options: PLACES.map(p => p.n), get: () => PLACES.findIndex(p => p.id === st.place), act: i => set({ place: PLACES[i].id }) },
    ];
    const readouts = [
      { label: 'Your choice', get: () => ({ v: R.p.n, sub: R.right ? 'right place' : 'wrong place', good: R.right, bad: !R.right }) },
      { label: 'Belongs in', get: () => ({ v: R.best.n, sub: 'matches all four', good: true, bad: false }) },
      { label: 'Broken property', get: () => ({ v: R.right ? 'none' : (R.broken[0] || 'overkill'), sub: 'life, scope, freshness, size', good: R.right, bad: !R.right }) },
    ];
    const labels = [
      { name: 'p', t: 'Five kinds of context', d: 'Gold ring: where it belongs', icon: 'box', atV: V(-2.57, 0.1, -0.45) },
      { name: 't', t: 'The verdict', d: 'Lifetime, scope, freshness, size', icon: 'target', atV: V(2.67, 0.5, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep the timetable in memory', hint: 'stale by tomorrow', on: () => set({ fact: 2, place: 'mem' }), off: reset },
      { label: 'Store a one-off request as standing context', hint: 'leaks into later work', on: () => set({ fact: 3, place: 'proj' }), off: reset },
      { label: 'Resend the app reference in every message', hint: 'no caching', on: () => set({ fact: 4, place: 'msg' }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.right) return { ok: true, msg: `<b>${r.p.n} fits ${r.f.n.toLowerCase().replace(/"/g, '')}: it matches how long it lives, who it is for, how fast it changes and its size.</b> ${r.f.best === 'live' ? 'A live connector reads today\'s version with the user\'s permissions instead of a copy.' : r.f.best === 'cache' ? 'A long, stable prefix sent with every request belongs first in the prompt, where it can be cached.' : r.f.best === 'proj' ? 'Give it an owner, a source date and a review cadence.' : r.f.best === 'msg' ? 'It ends with the task, as it should.' : 'Memory holds small, durable facts about one person, not records of truth.'}` };
      if (r.broken.length) return { ok: false, msg: `<b>${r.p.n} is the wrong place: ${WHY[r.broken[0]](r.f, r.p)}.</b> It belongs in ${r.best.n.toLowerCase()}.` };
      return { ok: false, msg: `<b>${r.p.n} could hold it, but ${r.f.best === 'cache' ? 'an application sending the same long reference with every request should put it first and cache it' : `${r.best.n.toLowerCase()} fits more closely`}.</b>` };
    }
    return { update: dt => { pipe.userData.tick(dt); tank.userData.tick(dt); bot.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Five kinds of fact', home: true, say: 'A travel agency gives Claude five kinds of fact. Each has a lifetime, a scope, a freshness and a size.', act: m => m.set({ fact: 0, place: 'mem' }) },
    { t: 'Memory', home: true, say: 'A small, durable preference of one person fits memory.', act: m => m.set({ fact: 0, place: 'mem' }) },
    { t: 'Project knowledge', home: true, say: 'A long, stable policy the whole team reuses fits a Project, with an owner and a review date.', act: m => m.set({ fact: 1, place: 'proj' }) },
    { t: 'Live data', home: true, say: 'A timetable that changes daily should not be copied anywhere. A connector reads today\'s.', act: m => m.set({ fact: 2, place: 'mem' }) },
    { t: 'This task only', home: true, say: 'A one-off formatting request belongs in the message, so it ends with the task.', act: m => m.set({ fact: 3, place: 'msg' }) },
    { t: 'Cache the prefix', home: true, say: 'An app\'s long reference, sent every time, goes first in the prompt and is cached.', act: m => m.set({ fact: 4, place: 'cache' }) },
  ],
  check: [
    { q: 'Where should a price list that changes daily come from?', options: ['A live connector or tool, read when needed', 'Memory', 'A pasted copy in the Project'], answer: 0, why: 'Copies go stale.', hint: 'Try Keep the timetable in memory.' },
    { q: 'Why not put a one-off instruction into standing instructions?', options: ['It would shape every later answer', 'It is too short', 'It is not allowed'], answer: 0, why: 'Match the fact\'s lifetime.', hint: 'Try Store a one-off request as standing context.' },
    { q: 'Where does a long prefix sent with every app request belong?', options: ['First in the prompt, cached', 'At the end of each message', 'In memory'], answer: 0, why: 'Cached prefixes are cheap to reread.', hint: 'Try Resend the app reference.' },
  ],
  practice: [
    { q: 'A team\'s Project still holds last quarter\'s refund policy, and answers follow it. What is missing?', options: ['An owner, a source date and a review cadence for the Project\'s knowledge', 'A larger model', 'A longer prompt', 'More chats'], answer: 0, why: 'Standing context needs maintenance.' },
    { q: 'A user wants every reply in British spelling. Where does that fit best?', options: ['Memory or personal preferences', 'The team\'s Project knowledge', 'A connector', 'Each message, forever'], answer: 0, why: 'Small, durable and about one person.' },
    { q: 'An application sends the same 30-page reference and instructions with every request. What reduces cost and latency?', options: ['Place the stable prefix first and cache it', 'Move it to the end', 'Paste it twice', 'Use a smaller font'], answer: 0, why: 'Caching works on a shared prefix.' },
    { q: 'Ferry seat counts change hourly. Which is the safest design?', options: ['Fetch the live figures through a permissioned tool when needed', 'Upload a copy each morning', 'Ask the model to remember them', 'Put them in the system prompt'], answer: 0, why: 'Freshness: never rely on a copy.' },
    { q: 'A long context contains many irrelevant documents, and answers miss the one key clause. What helps?', options: ['Give the request only what it needs, and point to where facts come from', 'Add even more documents', 'Raise the temperature', 'Remove all context'], answer: 0, why: 'Irrelevant material can bury what matters.' },
    { q: 'Is memory a good place for the company\'s official price list?', options: ['No: memory holds small personal facts, not records of truth', 'Yes, always', 'Yes, if it is short', 'Only on weekends'], answer: 0, why: 'Records belong in maintained sources.' },
  ],
  terms: [
    ['Context', 'Everything Claude can see for a request.'],
    ['Memory', 'Small, durable facts about one person carried across chats.'],
    ['Project knowledge', 'Stable documents a team reuses, with an owner.'],
    ['Connector', 'Live, permissioned access to a changing source.'],
    ['Prompt caching', 'Storing a long shared prefix so later requests read it cheaply.'],
    ['Stale context', 'A copy that no longer matches the source.'],
  ],
  deeper: '<p><b>Retrieval.</b> When a knowledge base is larger than the context, it is searched and only the relevant passages are included, so how documents are written and titled matters.</p><p><b>Provenance.</b> Record where each fact came from and when, so a wrong answer can be traced to its source.</p><p><b>About this machine.</b> The agency and facts are invented; check current product behaviour in the official documentation.</p>',
  code: {
    title: 'Place a fact by its properties',
    note: 'Written for this lesson.',
    text: `
def place(fact):
    if fact.changes_daily:
        return "live connector or tool"            # never a copy
    if fact.lifetime == "this task":
        return "the message"
    if fact.scope == "application" and fact.sent_every_request:
        return "cached system prompt prefix"
    if fact.scope == "one person" and fact.small:
        return "memory"
    return "project knowledge, with an owner and a review date"
`,
  },
};
