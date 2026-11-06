// APIs and keys: your laptop sends parcels (HTTP requests) down a road to a model service. A gate checks the key and the rate;
// answers come back with the text and the tokens used, and tokens cost money (learner's currency).
// Break it: a wrong key (401), ten calls at once (429), a key pasted into code that was pushed in public.
const ASKS = [
  { q: 'Good morning in Swahili?', a: 'Habari za asubuhi', tin: 24, tout: 9 },
  { q: 'Thank you in Yoruba?', a: 'E se', tin: 22, tout: 6 },
  { q: 'Hello in Amharic?', a: 'Selam', tin: 21, tout: 5 },
];
const LAP_X = -2.75, GATE_X = 1.95, SRV_X = 2.85, ROAD0 = -1.85, OUT_Z = -0.08, BACK_Z = 0.42;
const LIMIT = 4, WINDOW = 5;                 // requests allowed per window (seconds here, a minute in real life)
const USD_IN = 1 / 1e6, USD_OUT = 5 / 1e6;   // example prices per token

export default {
  slug: 'api-keys',
  title: 'APIs and keys',
  description: 'Send a question down the road to a model service and watch the parcel come back with an answer and a bill. Then use a wrong key, send ten at once, and leak your key in public code.',
  overview: 'An API lets your code use a model running on someone else\'s computer. Every call is a small parcel: the address (endpoint), your key in a header, and what you want as JSON. A gate checks the key and how fast you are calling; the answer comes back with the text and the tokens used, and tokens are what you pay for. The key is a password that spends money, so it lives in a .env file and never in your code.',
  keywords: ['what is an api key', 'llm api call python', 'env file api key', '401 unauthorized', '429 rate limit'],
  orient: 'landscape',
  phoneTurn: false,
  money: true,
  view: { target: [0, 0.6, 0], dir: [0.25, 0.9, 1.4], half: 3.2, wide: 7 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { ask: 0, key: 'env', badKey: false, retry: false, leak: false, spent: 0, last: null, sent: [], answer: '', tokens: null, nbad: 0, n429: 0, wait: 0 };
    /* ---------- the laptop and the safe ---------- */
    const base = P.box(1.6, 0.08, 1.05, '#8E91A3', { r: 0.06 }); base.position.set(LAP_X, 0, 0.15); S.add(base);
    const lid = new THREE.Group(); lid.position.set(LAP_X, 0.08, -0.36); lid.rotation.x = -0.18; S.add(lid);
    const shell = P.box(1.6, 1.05, 0.06, '#5B5F73', { r: 0.03 }); lid.add(shell);
    const scr = P.box(1.46, 0.92, 0.02, '#1E2233', { r: 0.02 }); scr.position.set(0, 0.065, 0.035); lid.add(scr);
    const code = S.text('', { size: 0.07, face: 'front', weight: 500, color: '#E9ECF8', font: '"JetBrains Mono", monospace', align: 'left', maxW: 1.38, maxH: 0.86 }); code.position.set(0, 0.53, 0.05); lid.add(code);
    const lapT = S.text('YOUR CODE', { size: 0.1, weight: 800, color: '#FFFFFF', maxW: 1.4 }); lapT.position.set(LAP_X, 0.085, 0.55); S.add(lapT);
    const safe = P.box(0.62, 0.46, 0.5, '#2E3440', { r: 0.06 }); safe.position.set(LAP_X + 1.05, 0, 0.95); S.add(safe);
    const dial = P.cyl(0.1, 0.04, '#C9A227'); dial.rotation.x = Math.PI / 2; dial.position.set(LAP_X + 1.05, 0.24, 1.22); S.add(dial);
    const safeT = S.text('.env', { size: 0.13, weight: 800, color: '#FFFFFF', font: '"JetBrains Mono", monospace', maxW: 0.55 }); safeT.position.set(LAP_X + 1.05, 0.465, 0.9); S.add(safeT);
    const safeF = S.text('.env', { size: 0.1, face: 'front', weight: 800, color: '#FFFFFF', font: '"JetBrains Mono", monospace', maxW: 0.5 }); safeF.position.set(LAP_X + 1.05, 0.38, 1.205); S.add(safeF);
    /* ---------- the road ---------- */
    const road = P.box(GATE_X - ROAD0 + 0.3, 0.05, 1.0, '#4A4E5E', { r: 0.05 }); road.position.set((GATE_X + ROAD0) / 2, 0, (OUT_Z + BACK_Z) / 2); S.add(road);
    for (let x = ROAD0 + 0.2; x < GATE_X - 0.1; x += 0.45) { const d = P.box(0.22, 0.01, 0.04, '#F2C94C', { r: 0 }); d.position.set(x, 0.05, (OUT_Z + BACK_Z) / 2); S.add(d); }
    const roadT = S.text('HTTPS', { size: 0.12, weight: 800, color: '#FFFFFF', maxW: 1 }); roadT.position.set(-0.2, 0.052, BACK_Z + 0.33); S.add(roadT);
    /* ---------- the service and its gate ---------- */
    const srv = P.box(1.25, 1.9, 1.35, '#2C2D31', { r: 0.1 }); srv.position.set(SRV_X, 0, 0.2); S.add(srv);
    for (let k = 0; k < 5; k++) { const s = P.box(1.0, 0.04, 0.02, '#4CC6C0', { r: 0, cast: false }); s.position.set(SRV_X, 0.35 + k * 0.28, 0.885); S.add(s); }
    const srvT = S.text('MODEL API', { size: 0.15, face: 'front', weight: 800, color: '#FFFFFF', maxW: 1.15 }); srvT.position.set(SRV_X, 1.72, 0.885); S.add(srvT);
    const srvTop = S.text('MODEL API', { size: 0.15, weight: 800, color: '#FFFFFF', maxW: 1.1 }); srvTop.position.set(SRV_X, 1.905, 0.3); S.add(srvTop);
    const postA = P.box(0.12, 1.25, 0.12, '#E8D9B5', { r: 0.02 }), postB = postA.clone(); postA.position.set(GATE_X, 0, OUT_Z - 0.42); postB.position.set(GATE_X, 0, BACK_Z + 0.42); S.add(postA, postB);
    const bar = P.box(0.14, 0.12, 1.42, '#E8D9B5', { r: 0.02 }); bar.position.set(GATE_X, 1.25, (OUT_Z + BACK_Z) / 2); S.add(bar);
    const lampM = new THREE.MeshLambertMaterial({ color: C.green, emissive: C.green, emissiveIntensity: 0.5 });
    const lamp = P.ball(0.11, C.green, { material: lampM }); lamp.position.set(GATE_X, 1.48, (OUT_Z + BACK_Z) / 2); S.add(lamp);
    const sign = S.text('', { size: 0.15, weight: 800, face: 'cam', bg: '#FFFFFF', color: C.ink, top: true, maxW: 1.6 }); sign.position.set(GATE_X, 1.85, (OUT_Z + BACK_Z) / 2); sign.userData.noFit = true; S.add(sign);
    const rate = S.text('', { size: 0.09, face: 'front', weight: 750, color: '#151827', maxW: 0.11 * 9, maxH: 0.5 }); rate.position.set(GATE_X, 0.7, BACK_Z + 0.485); S.add(rate);
    /* ---------- the public billboard (only when the key leaks) ---------- */
    const bb = new THREE.Group(); bb.position.set(-0.45, 0, -1.55); S.add(bb);
    for (const x of [-0.95, 0.95]) { const p = P.box(0.08, 0.9, 0.08, '#5B4636', { r: 0.01 }); p.position.x = x; bb.add(p); }
    const board = P.box(2.3, 0.8, 0.06, '#FFFFFF', { r: 0.02 }); board.position.y = 0.85; bb.add(board);
    const bbT = S.text('PUBLIC CODE ON THE WEB\napi_key = "sk-8f2c…"', { size: 0.17, face: 'front', weight: 800, color: C.red, maxW: 2.15, maxH: 0.66 }); bbT.position.set(0, 1.25, 0.04); bb.add(bbT);
    const strangers = [...Array(6)].map((_, i) => { const b = P.ball(0.12, '#6C6F80'); b.userData.noFit = true; S.add(b); return { b, u: i / 6 }; });
    /* ---------- parcels ---------- */
    const parcels = [...Array(14)].map(() => {
      const g = new THREE.Group(); g.visible = false; g.userData.noFit = true; S.add(g);
      const m = new THREE.MeshLambertMaterial({ color: '#F7F5EE' });
      const b = P.box(0.46, 0.2, 0.32, '#F7F5EE', { r: 0.04, material: m }); g.add(b);
      const t = S.text('', { size: 0.075, weight: 800, color: '#151827', font: '"JetBrains Mono", monospace', maxW: 0.42, maxH: 0.26 }); t.position.y = 0.205; g.add(t);
      return { g, m, t, live: false };
    });
    function spawn(kind, data) {
      const p = parcels.find(q => !q.live); if (!p) return null;
      Object.assign(p, { live: true, kind, x: kind === 'req' ? ROAD0 : GATE_X, wait: 0, tries: 0, ...data });
      p.g.visible = true; p.t.userData.set(kind === 'req' ? 'POST\n/messages' : data.code === 200 ? '200 OK' : String(data.code));
      p.m.color.set(kind === 'req' ? '#F7F5EE' : data.code === 200 ? '#BDE3C8' : '#F4A99F');
      return p;
    }
    let clock = 0;
    function send(n = 1) { for (let i = 0; i < n; i++) { const p = spawn('req', { ask: st.ask }); if (p) p.x -= i * 0.55; } }
    const recent = () => st.sent.filter(t => clock - t < WINDOW).length;
    function arrive(p) {
      // the gate: first the key, then the rate
      const keyOk = !st.badKey;
      if (!keyOk) { st.last = 401; st.nbad++; p.live = false; spawn('res', { code: 401 }); return; }
      if (recent() >= LIMIT) {
        st.last = 429; st.n429++;
        if (st.retry && p.tries < 4) { p.wait = 0.7 * 2 ** p.tries; p.tries++; return; }   // wait longer each time, then try again
        p.live = false; spawn('res', { code: 429 }); return;
      }
      st.sent.push(clock); p.live = false; p.inSrv = true;
      const A = ASKS[p.ask];
      st.wait++;
      pending.push({ t: 0.7, A });
    }
    const pending = [];
    function update(dt, t) {
      clock += dt;
      const sp = (S.reduced ? 5 : 2.3) * dt;
      for (const p of parcels) {
        if (!p.live) { p.g.visible = false; continue; }
        if (p.kind === 'req') {
          if (p.wait > 0) { p.wait -= dt; if (p.wait <= 0) arrive(p); p.g.position.set(GATE_X - 0.35, 0.05 + Math.abs(Math.sin(t * 6)) * 0.04, OUT_Z); continue; }
          p.x += sp; if (p.x >= GATE_X - 0.35) { p.x = GATE_X - 0.35; arrive(p); }
          p.g.position.set(p.x, 0.05, OUT_Z); p.g.visible = p.x > ROAD0 - 0.01 && p.live;
        } else {
          p.x -= sp; p.g.position.set(p.x, 0.05, BACK_Z);
          if (p.x <= ROAD0 + 0.1) { p.live = false; if (p.code === 200) { st.answer = ASKS[p.A].a; st.tokens = { tin: ASKS[p.A].tin, tout: ASKS[p.A].tout }; st.spent += ASKS[p.A].tin * USD_IN + ASKS[p.A].tout * USD_OUT; st.last = 200; } }
        }
      }
      for (const q of pending) { q.t -= dt; if (q.t <= 0) { const r = spawn('res', { code: 200, A: ASKS.indexOf(q.A) }); st.wait--; q.done = true; if (!r) st.wait = 0; } }
      for (let i = pending.length - 1; i >= 0; i--) if (pending[i].done) pending.splice(i, 1);
      // strangers who found the leaked key run big jobs on your bill
      bb.visible = st.leak;
      strangers.forEach((s, i) => {
        s.b.visible = st.leak; if (!st.leak) return;
        const before = s.u; s.u = (s.u + dt * 0.35) % 1;
        if (s.u < before) st.spent += 0.6;                       // one big job each lap
        const a = V(-0.45 + (i - 2.5) * 0.25, 0.12, -1.2), b = V(GATE_X - 0.3, 0.12, OUT_Z - 0.3);
        s.b.position.copy(a).lerp(b, s.u); s.b.position.y += Math.abs(Math.sin(s.u * Math.PI * 4)) * 0.15;
      });
      const bad = st.last === 401 || st.last === 429 || st.leak;
      lampM.color.set(st.leak ? C.orange : bad ? C.red : C.green); lampM.emissive.copy(lampM.color);
      sign.userData.set(st.last == null ? 'waiting' : st.last === 200 ? '200 OK' : st.last === 401 ? '401 Unauthorized' : '429 Too Many Requests');
      rate.userData.set(`${recent()}/${LIMIT}\nper\nminute`);
      const keyLine = st.key === 'env' || !st.leak ? 'api_key = os.environ[\n    "API_KEY"]' : 'api_key = "sk-8f2c…"';
      code.userData.set([`# ask.py`, `import os, client`, keyLine, ``, `reply = client.send(`, `  "${ASKS[st.ask].q}")`, ``, st.answer ? `> ${st.answer}` : '> …', st.tokens ? `> ${st.tokens.tin} tokens in, ${st.tokens.tout} out` : ''].join('\n'));
    }
    const controls = [
      { type: 'button', label: 'Send the request', short: 'Send', act: () => send(1) },
      { type: 'buttons', label: 'Ask', options: ASKS.map(a => a.q), get: () => st.ask, act: i => { st.ask = i; send(1); } },
      { type: 'toggle', label: 'Wait and retry on 429', short: 'Retry', get: () => st.retry, set: v => { st.retry = v; }, hint: 'Wait a little longer after each refusal' },
      { type: 'button', label: 'Send ten at once', short: 'Ten at once', act: () => send(10), quick: false },
    ];
    const readouts = [
      { label: 'Status', get: () => ({ v: st.last == null ? '—' : String(st.last), sub: st.last === 200 ? 'OK' : st.last === 401 ? 'bad key' : st.last === 429 ? 'slow down' : 'not sent', good: st.last === 200 && !st.leak, bad: st.last === 401 || st.last === 429 }) },
      { label: 'Tokens', get: () => ({ v: st.tokens ? `${st.tokens.tin} in · ${st.tokens.tout} out` : '—' }) },
      { label: 'Spent on this key', get: () => ({ v: S.money.of(st.spent), bad: st.leak }) },
    ];
    const labels = [
      { name: 'code', t: 'Your code', d: 'It reads the key and sends the question', icon: 'code', atV: V(LAP_X - 0.8, 0.9, -0.5) },
      { name: 'safe', t: '.env file', d: 'The key lives here, never in git', icon: 'box', atV: V(LAP_X + 1.36, 0.46, 0.95) },
      { name: 'road', t: 'Request and response', d: 'JSON parcels over HTTPS', icon: 'link', atV: V(GATE_X - 0.75, 0.05, BACK_Z + 0.5) },
      { name: 'gate', t: 'The gate', d: 'Checks the key, then how fast you call', icon: 'check', atV: V(GATE_X, 1.31, BACK_Z + 0.5) },
    ];
    const clear = () => { for (const p of parcels) p.live = false; pending.length = 0; st.sent = []; st.wait = 0; };
    const reset = () => { clear(); Object.assign(st, { ask: 0, key: 'env', badKey: false, retry: false, leak: false, spent: 0, last: null, answer: '', tokens: null }); };
    const breaks = [
      { label: 'A wrong key', hint: 'One letter off', on: () => { reset(); st.badKey = true; send(1); }, off: reset },
      { label: 'Ten calls at once', hint: 'No waiting, no retries', on: () => { reset(); send(10); }, off: reset },
      { label: 'Key pasted into public code', hint: 'Pushed to a public repository', on: () => { reset(); st.key = 'code'; st.leak = true; send(1); }, off: reset },
    ];
    function status() {
      if (st.leak) return { ok: false, msg: `<b>Your key is public.</b> It was pasted into the code and pushed where anyone can read it. Bots scan public code for keys all day; strangers are already running jobs on your bill (${S.money.of(st.spent)} so far). Revoke the key now, make a new one, and keep it in <code>.env</code>.` };
      if (st.last === 401) return { ok: false, msg: `<b>401 Unauthorized.</b> The gate didn't recognise the key, so the request never reached the model. Check that the environment variable is set and has no typo or stray space.` };
      if (st.last === 429 && !st.retry) return { ok: false, msg: `<b>429 Too Many Requests.</b> Only ${LIMIT} calls per minute are allowed on this key; the rest were turned back. Wait and try again, a little longer after each refusal (switch on <b>Retry</b>).` };
      if (st.last === 429) return { msg: `<b>Waiting, then retrying.</b> Each refused parcel waits twice as long as last time before it tries the gate again, so they all get through without hammering it.` };
      if (parcels.some(p => p.live) || pending.length) return { msg: `<b>On its way.</b> The parcel carries the address, the key in a header, and the question as JSON.` };
      if (st.last === 200) return { ok: true, msg: `<b>200 OK:</b> "${st.answer}". ${st.tokens.tin} tokens in and ${st.tokens.tout} out: a thousand calls like this cost about ${S.money.of(1000 * (st.tokens.tin * USD_IN + st.tokens.tout * USD_OUT))} at these example prices.` };
      return { msg: `<b>Ready.</b> Press <b>Send</b> to ask the model a question through its API.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, send, set: p => Object.assign(st, p), currency: () => { } };
  },

  story: [
    { t: 'Someone else\'s computer', home: true, say: 'An API lets your code use a model that runs on someone else\'s computer. Every call is a small parcel: an address, a key, and what you want.', act: m => m.reset() },
    { t: 'The key', focus: 'safe', zoom: 1.5, say: 'The key is a password that also pays the bill. It lives in a dot env file that never goes into git, and your code reads it from the environment.' },
    { t: 'Send the parcel', focus: [-0.4, 0.2, 0.2], zoom: 1.4, say: 'Your code sends the parcel down the road: the endpoint, the key in a header, and the question written as JSON.', act: m => m.send(1) },
    { t: 'The gate', focus: 'gate', zoom: 1.5, say: 'At the gate the key is checked. A wrong key gets a four oh one, unauthorised. Calling too fast gets a four two nine: slow down and try again.' },
    { t: 'The answer and the bill', home: true, say: 'The answer comes back as JSON too: the text, and how many tokens went in and came out. Tokens are what you pay for.', act: m => { m.set({ ask: 1 }); m.send(1); }, wait: 5 },
    { t: 'Never in the code', home: true, say: 'Paste the key into your code and push it, and bots find it within minutes. Strangers spend your money. Keep keys in the environment, always.', act: m => m.set({ key: 'code', leak: true }), wait: 5 },
  ],
  check: [
    { q: 'Where should an API key live?', options: ['In a .env file that git ignores', 'At the top of your code', 'In the README'], answer: 0, why: 'Code gets shared and pushed. A .env file stays on your machine, and your code reads the key from the environment.' },
    { q: 'The service answers 401 Unauthorized. What is wrong?', options: ['You called too fast', 'The key is missing or wrong', 'The model is busy thinking'], answer: 1, why: '401 means the gate didn\'t accept the key. 429 is the one for calling too fast.' },
    { q: 'What do you pay for with a model API?', options: ['The number of requests only', 'Tokens: the text going in and coming out', 'Nothing, ever'], answer: 1, why: 'Most model APIs bill by tokens in and tokens out, which is why the answer reports them.' },
  ],
  terms: [
    ['API', 'A way for your code to ask another program, often on another computer, to do something.'],
    ['Endpoint', 'The address a request is sent to.'],
    ['API key', 'A secret string that proves who you are and charges your account.'],
    ['Environment variable', 'A named value your shell gives a program, so secrets stay out of the code.'],
    ['Status code', 'The number on every answer: 200 OK, 401 bad key, 429 too many requests.'],
    ['Token', 'A piece of text the model reads or writes; the unit APIs bill by.'],
  ],
  deeper: '<p><b>SDK or raw HTTP?</b> An SDK is a small library that builds the parcel for you and reads the answer back into objects. Underneath it is the same HTTPS request; sending one by hand once makes errors much easier to read later.</p><p><b>Backing off.</b> When a service says 429, waiting twice as long after each refusal (1, 2, 4, 8 seconds) is called exponential backoff. Adding a little randomness keeps many clients from retrying at the same moment.</p><p><b>If a key leaks,</b> deleting the commit is not enough: copies already exist. Revoke the key on the service\'s dashboard and make a new one.</p>',
  code: {
    title: 'A first API call, by hand',
    note: 'Adapted from the course\'s <code>first_api_call.py</code>. The key comes from the environment, never from the file.',
    text: `
import json, os, urllib.request

api_key = os.environ.get("API_KEY")        # set it in .env, not here
if not api_key:
    raise SystemExit("Set API_KEY first")

body = json.dumps({
    "model": "a-model-name",
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Good morning in Swahili?"}],
}).encode()

req = urllib.request.Request(
    "https://api.example.com/v1/messages",
    data=body, method="POST",
    headers={"Content-Type": "application/json", "x-api-key": api_key},
)
with urllib.request.urlopen(req) as resp:  # 401: bad key; 429: slow down
    result = json.loads(resp.read())
    print(result["content"][0]["text"])
    print(result["usage"])                 # tokens in and out: the bill
`,
  },
};
