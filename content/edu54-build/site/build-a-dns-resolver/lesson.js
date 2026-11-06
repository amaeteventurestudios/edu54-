// Build your own DNS resolver: an invented farmers' market site, sokoni.co.ke, is looked up three times. A recursive resolver asks a root server,
// is referred to the .ke servers, then to the co.ke servers, then to sokoni's own authoritative server, which answers with an address and a
// time to live. Answers and referrals are cached until their TTL runs out. Each query carries a random 16-bit ID and source port; an attacker
// racing to answer with a forged address must guess both. The three lookups below are traced from these rules.
const CHAIN = [{ n: 'root', ask: '.', reply: 'ask the .ke servers', ms: 40 }, { n: '.ke', ask: 'ke.', reply: 'ask the co.ke servers', ms: 70 }, { n: 'co.ke', ask: 'co.ke.', reply: 'ask ns1.sokoni.co.ke', ms: 60 }, { n: 'sokoni', ask: 'sokoni.co.ke.', reply: 'A 196.201.10.8, TTL 300 s', ms: 50 }];
const LOOKUPS = [{ label: 'First lookup', t: 0 }, { label: 'A minute later', t: 60 }, { label: 'After the site moves', t: 900 }];
function resolve(o) {
  const cache = {};
  const results = [];
  LOOKUPS.forEach((L, k) => {
    if (k > o.which) return;
    const moved = L.t >= 600;
    const steps = [];
    let ms = 0, answer = null, from = '';
    const cached = o.cache && cache.a && (!o.ttl || L.t - cache.a.at <= 300);
    if (cached) { answer = cache.a.ip; from = 'cache'; ms = 1; }
    else {
      const startAt = o.cache && cache.co && (!o.ttl || L.t - cache.co.at <= 86400) ? 3 : 0;
      for (let i = startAt; i < CHAIN.length; i++) { steps.push(i); ms += CHAIN[i].ms; }
      answer = moved ? '196.201.44.2' : '196.201.10.8'; from = 'authoritative';
      if (o.cache) { cache.a = { ip: answer, at: L.t }; cache.co = { at: L.t }; }
    }
    const poisoned = !o.random && !cached && k === 0;
    if (poisoned) { answer = '203.0.113.66'; if (o.cache) cache.a = { ip: answer, at: L.t }; }
    const truth = moved ? '196.201.44.2' : '196.201.10.8';
    results.push({ L, steps, ms, answer, from, truth, right: answer === truth, poisoned });
  });
  return results;
}

export default {
  slug: 'build-a-dns-resolver',
  title: 'Build your own DNS resolver',
  description: 'A browser needs a market site\'s address. Follow referrals from the root down, cache the answer, and see what a stale or forged one does.',
  overview: 'The Domain Name System turns names such as sokoni.co.ke into the numeric addresses computers use, and building a resolver, as the Rust DNS guide does, shows how a lookup really travels. A recursive resolver, run by an internet provider or on your own machine, does the work for you. It starts at one of the root servers, which knows only who runs each top-level domain, and replies with a referral: ask the .ke servers. The .ke servers refer it to the co.ke servers, which refer it to the nameserver the market itself runs, and that authoritative server answers with the address. Each reply is a small binary message with a header, the question and resource records, and travels over UDP. Every record carries a time to live, in seconds. The resolver caches records until their TTL runs out, so the next lookup a minute later is answered instantly from memory instead of four round trips, and the busy upper levels of the tree are rarely asked. Respecting the TTL matters as much: when the market moves to a new server, the old address must expire, or visitors keep being sent to a machine that no longer hosts it. Because replies are just UDP packets, an attacker can try to answer first with a forged address; the resolver accepts only replies whose 16-bit query ID and source port match what it sent, so both must be random. A guessable ID lets a forged answer poison the cache for everyone who uses it, which DNSSEC signatures also guard against. This machine traces three lookups through an invented chain of servers.',
  keywords: ['build your own DNS server', 'DNS resolver', 'recursive resolution', 'TTL', 'DNS cache', 'cache poisoning', 'query ID'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.35, -0.1], dir: [0.05, 0.75, 1.2], half: 0.95, wide: 5.6 },
  credit: 'Built from <a href="https://github.com/EmilHernvall/dnsguide/blob/master/README.md" target="_blank" rel="noopener">Building a DNS server in Rust</a> by Emil Hernvall (MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short recursive resolver, written for this lesson after the Rust DNS guide (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { which: 1, cache: true, ttl: true, random: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // the resolver, with its cache shelf and a tower for how long the lookup took
    const res = P.robot('#4A6FA5', { scale: 0.95 }); res.position.set(-2.1, 0, 0.3); S.add(res);
    const cache = P.shelf(2, { cell: 0.3, d: 0.32, lh: 0.3 }); cache.position.set(-1.35, 0, 0.6); S.add(cache);
    const wait = P.tower(0.26, 0.26, GOOD); wait.position.set(-2.7, 0, 0.3); wait.userData.set({ cap: '' }); S.add(wait);
    // the name servers, from the root down to the market's own server
    const SX = i => -1.2 + i * 0.85, SH = [0.95, 0.75, 0.58, 0.42], SZ = -0.75;
    const srvM = CHAIN.map(() => own(OFF)), srv = CHAIN.map((c, i) => { const b = P.box(0.5, SH[i], 0.45, '#fff', { r: 0.05, material: srvM[i] }); b.position.set(SX(i), 0, SZ); S.add(b); return b; });
    const asks = CHAIN.map((c, i) => { const p = P.pipe([V(-1.95, 0.6, 0.2), V((SX(i) - 2.0) / 2, SH[i] + 0.25, (SZ + 0.2) / 2), V(SX(i) - 0.1, SH[i] * 0.8, SZ + 0.2)], SAF, { r: 0.025, n: 3 }); S.add(p); return p; });
    // addresses: where the site was, where it moved to, and an attacker's fake
    const house = (x, c) => { const g = new THREE.Group(); g.position.set(x, 0, 0.6); const b = P.box(0.42, 0.3, 0.36, c, { r: 0.04 }); g.add(b); const r = P.box(0.48, 0.08, 0.42, '#6B4E3A', { r: 0.03 }); r.position.y = 0.3; g.add(r); S.add(g); return g; };
    const IP = { '196.201.10.8': house(0.55, '#D9C9A8'), '196.201.44.2': house(1.25, '#9FC7B9'), '203.0.113.66': house(2.25, '#C96A5A') };
    const atk = P.robot('#8A3B2E', { scale: 0.8, lamp: OFF }); atk.position.set(1.85, 0, -0.1); S.add(atk);
    const forge = P.pipe([V(1.65, 0.5, -0.1), V(-0.3, 0.75, 0.0), V(-1.85, 0.6, 0.25)], BAD, { r: 0.03, n: 4, pipe: '#E9B8A8' }); S.add(forge);
    const sendM = own(GOOD), send = P.rod(V(-1.9, 0.35, 0.4), V(0.55, 0.3, 0.6), 0.025, GOOD, { material: sendM }); send.userData.noFit = true; S.add(send);
    S.add(P.keep(-2.9, 2.5, 1.05, -1.0, 0.85));
    let R = null;
    function draw() {
      R = resolve(st);
      const cur = R[R.length - 1];
      CHAIN.forEach((c, i) => { const used = cur.steps.includes(i); srvM[i].color.set(used ? '#5B8DB8' : OFF); asks[i].visible = used; });
      cache.userData.set({ fill: st.cache ? [cur.from === 'cache' ? SAF : '#C9B079', '#8FA3C8'] : [null, null] });
      wait.userData.set({ h: Math.max(0.03, cur.ms / 220), color: cur.ms < 100 ? GOOD : cur.ms > 150 ? BAD : SAF });
      forge.visible = cur.poisoned; atk.userData.set({ lamp: cur.poisoned ? BAD : OFF, busy: cur.poisoned });
      IP['203.0.113.66'].visible = cur.poisoned;
      const to = IP[cur.answer] || IP['196.201.10.8'];
      P.setRod(send, V(-1.9, 0.35, 0.4), to.position.clone().add(V(0, 0.2, 0)));
      sendM.color.set(cur.right ? GOOD : BAD);
      res.userData.set({ lamp: cur.right ? GOOD : BAD });
    }
    const tick = dt => { [res, atk, wait, forge].concat(asks).forEach(o => o.userData.tick(dt)); };
    function isOk() { return R.every(r => r.right) && st.cache && st.ttl && st.random; }
    draw(); wait.userData.snap();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Cache answers', short: 'Cache', get: () => st.cache, set: v => set({ cache: !!v }) },
      { type: 'toggle', label: 'Expire them when their TTL runs out', short: 'TTL', get: () => st.ttl, set: v => set({ ttl: !!v }) },
      { type: 'toggle', label: 'Random query IDs and ports', short: 'Random IDs', get: () => st.random, set: v => set({ random: !!v }) },
      { type: 'buttons', label: 'Lookup', options: LOOKUPS.map(l => l.label), get: () => st.which, act: i => set({ which: i }) },
    ];
    const readouts = [
      { label: 'Answer', get: () => ({ v: R[R.length - 1].answer, sub: R[R.length - 1].right ? 'correct' : `should be ${R[R.length - 1].truth}`, good: R[R.length - 1].right, bad: !R[R.length - 1].right }) },
      { label: 'Wait', get: () => ({ v: `${R[R.length - 1].ms} ms`, sub: R[R.length - 1].from, good: R[R.length - 1].ms < 100, bad: R[R.length - 1].ms > 150 && st.which === 1 }) },
      { label: 'Round trips', get: () => ({ v: `${R[R.length - 1].steps.length}`, sub: 'servers asked', good: true, bad: false }) },
    ];
    const labels = [
      { name: 's', t: 'Root down to the market\'s server', d: 'Blue: asked this time', icon: 'link', atV: V(SX(3) + 0.25, 0.42, SZ) },
      { name: 'r', t: 'The resolver and its cache', d: 'Tower: how long the lookup took', icon: 'user', atV: V(-2.83, 0.15, 0.3) },
      { name: 'h', t: 'Where visitors are sent', d: 'Teal rod: right address. Coral: wrong', icon: 'target', atV: V(1.46, 0.2, 0.6) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Turn off the cache', hint: 'every lookup walks the tree', on: () => set({ ...D0, cache: false }), off: reset },
      { label: 'Ignore TTLs', hint: 'the old address lives on', on: () => set({ ...D0, ttl: false, which: 2 }), off: reset },
      { label: 'Use predictable query IDs', hint: 'a forged answer wins', on: () => set({ ...D0, random: false }), off: reset },
    ];
    function status() {
      const cur = R[R.length - 1];
      if (R.some(r => r.poisoned)) return { ok: false, msg: `<b>The query ID was predictable, so the attacker\'s forged reply matched and arrived first: the resolver believed sokoni.co.ke is at 203.0.113.66${st.cache ? ' and cached it for every later user' : ''}.</b> Use a random 16-bit ID and a random source port on every query.` };
      if (!cur.right) return { ok: false, msg: `<b>The market moved to 196.201.44.2, but the resolver ignored the 300-second TTL and kept serving the old address from its cache: visitors reach a server that no longer hosts the site.</b> Expire every record when its TTL runs out.` };
      if (!st.cache) return { ok: false, msg: `<b>With no cache, even the lookup a minute later walks all ${cur.steps.length} servers again: ${cur.ms} ms each time, and the root and .ke servers carry every query.</b> Cache answers and referrals for their TTL.` };
      if (!st.ttl || !st.random) return { ok: false, msg: `<b>This lookup is right, but ${!st.ttl ? 'the resolver ignores TTLs: try the lookup after the site moves' : 'query IDs are predictable'}.</b>` };
      return { ok: true, msg: cur.from === 'cache' ? '<b>A minute later the answer came straight from the cache in 1 ms, its 300-second TTL not yet spent.</b>' : st.which === 2 ? '<b>After the move, the cached record had expired, so the resolver asked again, starting from the cached co.ke referral, and got the new address.</b>' : `<b>The first lookup walked root, .ke, co.ke and the site\'s server: ${cur.ms} ms, with a random query ID that no forged reply could match.</b>` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A name to look up', home: true, say: 'A browser needs the address of a farmers\' market site. A resolver does the work.', act: m => m.set({ which: 0, cache: true, ttl: true, random: true }) },
    { t: 'Referrals', home: true, say: 'The root refers it to the dot ke servers, they to co dot ke, and they to the market\'s own server, which answers.', act: m => m.set({ which: 0, cache: true, ttl: true, random: true }) },
    { t: 'Cache it', home: true, say: 'The answer comes with a time to live. A minute later, the resolver answers from memory.', act: m => m.set({ which: 1, cache: true, ttl: true, random: true }) },
    { t: 'The site moves', home: true, say: 'Ignore the TTL, and visitors are sent to the old address long after the move.', act: m => m.set({ which: 2, cache: true, ttl: false, random: true }) },
    { t: 'Forged answers', home: true, say: 'An attacker races to reply first. A guessable query ID lets the forgery in.', act: m => m.set({ which: 0, cache: true, ttl: true, random: false }) },
    { t: 'Fast and right', home: true, say: 'Cache, respect TTLs, and randomise IDs and ports.', act: m => m.set({ which: 2, cache: true, ttl: true, random: true }) },
  ],
  check: [
    { q: 'What does the root server reply?', options: ['A referral to the servers for .ke', 'The site\'s address', 'An error'], answer: 0, why: 'It only knows top-level domains.', hint: 'Watch the first lookup.' },
    { q: 'What does a record\'s TTL control?', options: ['How long it may be cached', 'Its priority', 'Its size'], answer: 0, why: 'Then it must be asked again.', hint: 'Try Ignore TTLs.' },
    { q: 'Why must query IDs be random?', options: ['So forged replies cannot match them', 'For speed', 'For sorting'], answer: 0, why: 'And source ports too.', hint: 'Try Use predictable query IDs.' },
  ],
  terms: [
    ['Resolver', 'The server that looks names up on your behalf.'],
    ['Referral', 'A reply saying which servers to ask next.'],
    ['Authoritative server', 'The server that holds a domain\'s own records.'],
    ['TTL', 'Time to live: how long a record may be cached.'],
    ['Query ID', 'A 16-bit number matching a reply to its question.'],
    ['Cache poisoning', 'Getting a resolver to store a forged answer.'],
  ],
  deeper: '<p><b>DNSSEC.</b> Signed records let a resolver check that an answer really came from the domain\'s owner, whatever the query ID.</p><p><b>Glue records.</b> When a domain\'s nameserver lives inside the domain itself, the parent zone includes its address so the resolver is not stuck in a loop.</p><p><b>About this machine.</b> The market, servers and addresses are invented; the forged address is from a documentation range.</p>',
  code: {
    title: 'Resolve a name, following referrals',
    note: 'Our own short version, after the Rust DNS guide.',
    text: `
import random, time

cache = {}                                          # name -> (records, expires)

def lookup(name, qtype="A"):
    hit = cache.get((name, qtype))
    if hit and hit[1] > time.time():
        return hit[0]                               # still within its TTL
    server = ROOT_SERVER
    while True:
        query_id = random.getrandbits(16)           # unguessable
        reply = send_udp(server, name, qtype, query_id, port=random.randint(1024, 65535))
        if reply.id != query_id:
            continue                                # not our answer: ignore it
        if reply.answers:
            ttl = min(r.ttl for r in reply.answers)
            cache[(name, qtype)] = (reply.answers, time.time() + ttl)
            return reply.answers
        server = pick_nameserver(reply.authority, reply.additional)   # follow the referral
`,
  },
};
