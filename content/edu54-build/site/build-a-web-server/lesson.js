// Build your own web server: a tiny Express-style server for an invented school-fees portal reads an HTTP request line and headers, then
// passes the request through a chain of middleware: a logger, a static-file handler for /static, a router with a parameter route, and a
// final not-found handler. Each middleware either answers or calls next(). The static handler must resolve paths inside its folder so
// ../ cannot climb out. Each request is traced through the chain below.
const REQS = ['GET /', 'GET /students/42', 'GET /static/logo.svg', 'GET /static/../.env', 'GET /timetable'];
function handle(o) {
  const line = REQS[o.req], [method, path] = line.split(' ');
  const trace = [];
  let res = null, leaked = false, hung = false, crashed = false;
  trace.push({ m: 'parse request line', did: `${method} ${path}` });
  trace.push({ m: 'logger', did: o.next ? 'logs, calls next()' : 'logs, forgets next()' });
  if (!o.next) { hung = true; return { line, trace, res: null, hung, leaked, crashed }; }
  if (path.startsWith('/static/')) {
    const rel = path.slice(8), parts = [];
    for (const p of rel.split('/')) { if (p === '..') { if (o.safe) { if (parts.length) parts.pop(); else { res = { code: 403, body: 'Forbidden' }; break; } } else parts.push('..'); } else if (p) parts.push(p); }
    if (!res) {
      const resolved = o.safe ? `public/${parts.join('/')}` : `public/${rel}`;
      if (!o.safe && rel.includes('..')) { leaked = true; res = { code: 200, body: 'DB_PASSWORD=… (the server\'s secrets file)', type: 'text/plain' }; }
      else if (parts.join('/') === 'logo.svg') res = { code: 200, body: '<svg …> (logo)', type: 'image/svg+xml' };
      else res = { code: 404, body: 'Not found' };
      trace.push({ m: 'static files', did: `reads ${resolved}` });
    } else trace.push({ m: 'static files', did: 'refuses a path outside public/' });
  } else {
    trace.push({ m: 'static files', did: 'not /static, calls next()' });
    const mm = path.match(/^\/students\/(\d+)$/);
    if (path === '/') { res = { code: 200, body: '<h1>Fees portal</h1>', type: 'text/html' }; trace.push({ m: 'router', did: 'GET / → home page' }); }
    else if (mm) { res = { code: 200, body: `{"id": ${mm[1]}, "term": 2, "paid": true}`, type: 'application/json' }; trace.push({ m: 'router', did: `GET /students/:id with id = ${mm[1]}` }); }
    else {
      trace.push({ m: 'router', did: 'no route matches, calls next()' });
      if (o.notFound) { res = { code: 404, body: 'Not found' }; trace.push({ m: 'not found', did: 'answers 404' }); }
      else { crashed = true; res = { code: 500, body: 'TypeError: cannot read handler of undefined' }; trace.push({ m: 'end of chain', did: 'nothing left: the server throws' }); }
    }
  }
  return { line, trace, res, hung, leaked, crashed };
}

export default {
  slug: 'build-a-web-server',
  title: 'Build your own web server',
  description: 'A school-fees portal runs on a tiny web server. Each request rides down a chain of middleware, and each one answers or calls the next.',
  overview: 'A web server is a program that listens on a port, reads requests and writes responses, and building one, as A Simple Web Server and lets-build-express do, shows what frameworks hide. An HTTP request starts with a request line, such as GET /students/42 HTTP/1.1, followed by header lines and a blank line; the response starts with a status line, such as HTTP/1.1 200 OK, then headers such as Content-Type and Content-Length, a blank line and the body. Frameworks in the Express style organise the work as a chain of middleware: functions that each receive the request, the response and a next function. A middleware can answer the request, or do some work, such as logging, checking a session or parsing a body, and then call next() to hand over to the next one. A middleware that neither answers nor calls next leaves the browser waiting until it gives up. A router is a middleware that matches the method and path against patterns, extracting parameters such as the 42 in /students/:id. A static-file middleware maps URLs under /static to files in a folder, and it must resolve the path and check that the result is still inside that folder: otherwise a request for /static/../.env climbs out and reads the server\'s secrets, a path traversal attack. At the end of the chain a not-found handler answers 404 for anything nothing else claimed, so unknown URLs get a clear answer instead of an error. Real servers add concurrency, keep-alive connections, timeouts and TLS. This machine traces five requests to an invented school-fees portal in Kampala.',
  keywords: ['build your own web server', 'HTTP', 'middleware', 'Express', 'routing', 'path traversal', 'status codes'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, -0.3], dir: [0.05, 0.75, 1.2], half: 0.95, wide: 5.6 },
  credit: 'Built from <a href="https://github.com/antoaravinth/lets-build-express" target="_blank" rel="noopener">lets-build-express</a> (MIT) and <a href="https://aosabook.org/en/500L/a-simple-web-server.html" target="_blank" rel="noopener">A Simple Web Server</a> by Greg Wilson, in 500 Lines or Less (code MIT), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short middleware chain, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { req: 1, next: true, safe: true, notFound: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    const STAGES = ['parse request line', 'logger', 'static files', 'router', 'not found'];
    const REASON = { 200: 'OK', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' };
    const SXp = i => -2.0 + i * 0.95, BZ = 0.25;
    // the request rides a belt past the middleware, each one a robot: answer, or call next()
    const belt = P.belt(V(-2.55, 0, BZ), V(2.6, 0, BZ), { w: 0.42 }); S.add(belt);
    const bots = STAGES.map((n, i) => { const r = P.robot(OFF, { scale: 0.75 }); r.position.set(SXp(i), 0, -0.3); S.add(r); return r; });
    // the public folder on a shelf, and the secrets file outside it
    const pub = P.shelf(2, { cell: 0.32, d: 0.34, lh: 0.32 }); pub.position.set(-0.35, 0, -0.95); S.add(pub);
    pub.userData.set({ fill: ['#5B8DB8', '#5B8DB8'] });
    const safeM = own('#4A4D5C'), safe = P.box(0.38, 0.38, 0.34, '#fff', { r: 0.04, material: safeM }); safe.position.set(0.55, 0, -0.95); S.add(safe);
    const lock = P.ball(0.06, SAF); lock.position.set(0.55, 0.22, -0.77); S.add(lock);
    const fence = P.gate(0.5, GOOD, { h: 0.4 }); fence.position.set(0.15, 0, -0.62); fence.rotation.y = Math.PI / 2; S.add(fence);
    const grabM = own(BAD), grab = P.rod(V(SXp(2), 0.5, -0.3), V(0.55, 0.3, -0.95), 0.022, BAD, { material: grabM }); grab.userData.noFit = true; S.add(grab);
    // the request parcel
    const reqM = own(SAF), req = P.box(0.24, 0.2, 0.24, '#fff', { r: 0.04, material: reqM }); req.userData.noFit = true; S.add(req);
    S.add(P.keep(-2.6, 2.65, 0.95, -1.15, 0.5));

    let R = null, stopX = 0, u = 0, wait = 0, endX = 0, fall = false;
    function draw() {
      R = handle(st);
      let last = -1;
      bots.forEach((b, i) => {
        const n = STAGES[i];
        const tr = R.trace.find(t => t.m === n || (n === 'not found' && (t.m === 'not found' || t.m === 'end of chain')));
        if (tr) last = i;
        const answered = R.res && R.trace[R.trace.length - 1] === tr;
        const bad = (R.hung && n === 'logger') || (answered && (R.leaked || (R.crashed && n !== 'not found')));
        b.visible = n !== 'not found' || st.notFound;
        b.userData.set({ color: tr ? '#4A6FA5' : OFF, lamp: !tr ? OFF : bad ? BAD : answered ? GOOD : SAF });
      });
      fall = R.crashed;
      stopX = fall ? 2.75 : SXp(Math.max(0, last));
      reqM.color.set(R.hung || R.leaked || R.crashed ? BAD : SAF);
      grab.visible = R.leaked; safeM.color.set(R.leaked ? BAD : '#4A4D5C');
      fence.visible = st.safe && st.req === 3;
      u = 0; wait = 0;
    }
    const tick = dt => {
      if (u < 1) u = Math.min(1, u + dt * 0.55); else { wait += dt; if (wait > 1.4) { u = 0; wait = 0; } }
      const x = -2.45 + (stopX + 2.45) * u;
      req.position.set(x, x > 2.6 ? 0.08 - (x - 2.6) * 2 : 0.08, BZ);
      req.visible = !(fall && u >= 1);
      bots.forEach(b => b.userData.tick(dt)); belt.userData.tick(dt); fence.userData.tick(dt, true);
    };
    function isOk() { return !R.hung && !R.leaked && !R.crashed && st.next && st.safe && st.notFound; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Logger calls next()', short: 'next()', get: () => st.next, set: v => set({ next: !!v }) },
      { type: 'toggle', label: 'Keep static paths inside public/', short: 'Safe paths', get: () => st.safe, set: v => set({ safe: !!v }) },
      { type: 'toggle', label: 'End the chain with a 404 handler', short: '404 handler', get: () => st.notFound, set: v => set({ notFound: !!v }) },
      { type: 'buttons', label: 'Request', options: REQS, get: () => st.req, act: i => set({ req: i }) },
    ];
    const readouts = [
      { label: 'Status', get: () => ({ v: R.hung ? 'none' : `${R.res.code}`, sub: R.line, good: !R.hung && !R.leaked && !R.crashed, bad: R.hung || R.leaked || R.crashed }) },
      { label: 'Middleware run', get: () => ({ v: `${R.trace.length - 1}`, sub: 'in the chain', good: true, bad: false }) },
      { label: 'Secrets', get: () => ({ v: R.leaked ? 'leaked' : 'safe', sub: 'the .env file', good: !R.leaked, bad: R.leaked }) },
    ];
    const labels = [
      { name: 'c', t: 'The middleware chain', d: 'Lamps: teal answered, gold passed on, coral wrong', icon: 'link', atV: V(SXp(0) - 0.16, 0.3, -0.3) },
      { name: 's', t: 'The secrets file', d: 'Outside the public shelf', icon: 'shield', atV: V(0.74, 0.25, -0.95) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Forget to call next()', hint: 'requests hang', on: () => set({ ...D0, next: false }), off: reset },
      { label: 'Trust the static path', hint: '../ climbs out', on: () => set({ ...D0, safe: false, req: 3 }), off: reset },
      { label: 'Drop the 404 handler', hint: 'unknown URLs crash', on: () => set({ ...D0, notFound: false, req: 4 }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.hung) return { ok: false, msg: '<b>The logger wrote its line and returned without calling next(), so no later middleware ever ran and no response was sent: the browser waits, then times out.</b> Every middleware must either answer or call next().' };
      if (r.leaked) return { ok: false, msg: '<b>The static handler joined /static/../.env onto public/ as given, so ../ climbed out of the folder and the server sent its own secrets file.</b> Resolve the path, then refuse anything that is not still inside public/.' };
      if (r.crashed) return { ok: false, msg: '<b>No route matched /timetable, and with no handler at the end of the chain the server threw an error and answered 500.</b> End the chain with a not-found handler that answers 404.' };
      if (!st.next || !st.safe || !st.notFound) return { ok: false, msg: `<b>This request worked, but ${!st.safe ? 'the static handler trusts paths: try /static/../.env' : 'there is no 404 handler: try /timetable'}.</b>` };
      return { ok: true, msg: `<b>${r.line} passed down the chain and was answered ${r.res.code} ${REASON[r.res.code]} by ${({ 'static files': 'the static-file handler', router: 'the router', 'not found': 'the not-found handler' })[r.trace[r.trace.length - 1].m]}${st.req === 1 ? ', with id = 42 taken from the path' : ''}.</b> ${st.req === 3 ? 'The ../ was refused, so the secrets stay private.' : 'Try the other requests.'}` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A request', home: true, say: 'A browser sends a request line and headers. The server reads them and builds a request object.', act: m => m.set({ req: 0, next: true, safe: true, notFound: true }) },
    { t: 'A chain', home: true, say: 'The request passes down a chain of middleware. Each one answers, or calls next.', act: m => m.set({ req: 1, next: true, safe: true, notFound: true }) },
    { t: 'Forget next', home: true, say: 'A logger that forgets to call next stops the chain. The browser waits for ever.', act: m => m.set({ req: 1, next: false, safe: true, notFound: true }) },
    { t: 'Static files', home: true, say: 'Files under slash static come from a public folder.', act: m => m.set({ req: 2, next: true, safe: true, notFound: true }) },
    { t: 'Climbing out', home: true, say: 'Dot dot slash climbs out of the folder. Resolve the path and refuse anything outside.', act: m => m.set({ req: 3, next: true, safe: false, notFound: true }) },
    { t: 'Not found', home: true, say: 'End the chain with a handler that answers four oh four for anything left unclaimed.', act: m => m.set({ req: 4, next: true, safe: true, notFound: true }) },
  ],
  check: [
    { q: 'What must every middleware do?', options: ['Answer the request or call next()', 'Log the request', 'Read a file'], answer: 0, why: 'Or the request hangs.', hint: 'Try Forget to call next().' },
    { q: 'How does path traversal work?', options: ['../ in a URL climbs out of the served folder', 'A very long URL', 'A wrong method'], answer: 0, why: 'Resolve and check the path.', hint: 'Try Trust the static path.' },
    { q: 'What should answer an unknown URL?', options: ['A not-found handler sending 404', 'The router throwing', 'Silence'], answer: 0, why: 'A clear answer, not a crash.', hint: 'Try Drop the 404 handler.' },
  ],
  terms: [
    ['Request line', 'The first line of a request: method, path and version.'],
    ['Status code', 'A number in the response, such as 200, 404 or 500.'],
    ['Middleware', 'A function in the chain that answers or calls next().'],
    ['Router', 'Matches method and path to a handler, extracting parameters.'],
    ['Path traversal', 'Using ../ to reach files outside the served folder.'],
    ['Header', 'A name: value line describing a request or response.'],
  ],
  deeper: '<p><b>Concurrency.</b> Real servers handle many connections at once with threads, processes or an event loop, and add timeouts so slow clients cannot tie them up.</p><p><b>Error middleware.</b> Express also lets a special middleware catch errors thrown further up the chain and answer 500 cleanly.</p><p><b>About this machine.</b> The fees portal is invented; each request is traced through the chain in this lesson.</p>',
  code: {
    title: 'A middleware chain',
    note: 'Our own short version, written for this lesson.',
    text: `
const path = require("path"), fs = require("fs");
const chain = [];
const use = fn => chain.push(fn);

use((req, res, next) => { console.log(req.method, req.url); next(); });   // logger
use((req, res, next) => {                                                 // static files
  if (!req.url.startsWith("/static/")) return next();
  const root = path.resolve("public");
  const file = path.resolve(root, "." + req.url.slice(7));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end("Forbidden");
  fs.createReadStream(file).on("error", () => res.writeHead(404).end()).pipe(res);
});
use((req, res, next) => {                                                 // router
  const m = req.url.match(/^\\/students\\/(\\d+)$/);
  if (m) return res.end(JSON.stringify({ id: +m[1] }));
  next();
});
use((req, res) => res.writeHead(404).end("Not found"));                   // the end

function handle(req, res, i = 0) { chain[i](req, res, () => handle(req, res, i + 1)); }
require("http").createServer(handle).listen(8080);
`,
  },
};
