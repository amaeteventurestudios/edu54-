// Build it yourself: a simple web server (after 500 Lines, A Simple Web Server). A Luanda bookshop's small site. A real request parser and a case list decide what each URL gets: file, directory index, CGI script or a 404, and a path check stops escaping the site folder. Files are a small map.
const FILES = { '/srv/site/index.html': 'home', '/srv/site/stock.csv': 'stock', '/srv/site/books/index.html': 'books', '/srv/site/time.cgi': 'cgi', '/srv/secret.env': 'secret' };
const REQ = ['GET / HTTP/1.1', 'GET /stock.csv HTTP/1.1', 'GET /books/ HTTP/1.1', 'GET /time.cgi HTTP/1.1', 'GET /nothing HTTP/1.1', 'GET /../secret.env HTTP/1.1'];
function norm(p) { const out = []; p.split('/').forEach(s => { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); }); return `/${out.join('/')}`; }
function handle(line, o) {
  const [m, url] = line.split(' '), path = o.safe ? `/srv/site${norm(url)}` : norm(`/srv/site${url}`);
  if (m !== 'GET') return { code: 405, body: 'method', ca: 'bad method' };
  const CASES = [
    ['CGI script', p => o.cgi && p.endsWith('.cgi') && FILES[p], p => ({ code: 200, body: 'run script, send output' })],
    ['directory with index', p => o.index && FILES[`${p.replace(/\/$/, '')}/index.html`], p => ({ code: 200, body: FILES[`${p.replace(/\/$/, '')}/index.html`] })],
    ['existing file', p => FILES[p], p => ({ code: 200, body: FILES[p] })],
  ];
  for (const [n, t, a] of CASES) if (t(path)) return { ...a(path), ca: n, path };
  return { code: 404, body: 'not found', ca: 'nothing matched', path };
}
function run(o) { const res = REQ.map(l => handle(l, o)); return { res, cur: res[o.i], leak: res[5].body === 'secret', ok: res.filter(r => r.code === 200).length }; }

export default {
  slug: 'build-a-python-web-server',
  title: 'Build your own static web server',
  description: 'A list of cases decides what each URL gets. One check keeps visitors inside the site folder.',
  overview: 'A web server is a loop: read a request line, work out what it asks for, write a response. The middle step grows quickly. A path might be a file, a directory with an index page, or a script to run. Rather than a chain of ifs, keep a list of cases, each with a test and an action. The first match wins, and adding a behaviour means adding a case. Paths come from strangers, so normalise them before use. Otherwise a path with two dots climbs out of the site folder, and any file on the machine can be read. This real handler serves a bookshop in Luanda from a small map of files.',
  keywords: ['web server', 'HTTP', 'CGI', 'path traversal', 'Python', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, 0], dir: [0.05, 0.85, 1.05], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { i: 0, safe: true, index: true, cgi: true }, st = { ...D0 };
    const C = { 200: '#1F9E89', 404: '#F2AE0C', 405: '#E07A5F', leak: '#B5462F' }, ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.9 + i * 0.7;
    const T = REQ.map((r, i) => { const m = new S.THREE.MeshLambertMaterial({ color: C[200] }), b = P.box(0.54, 0.16, 0.7, '#fff', { r: 0.04, material: m }); b.position.set(X(i), 0.03, -0.05); S.add(b); return { b, m }; });
    const rob = add(P.robot('#7B6FA8', { scale: 0.42 })); rob.position.set(2.2, 0.03, -0.05);
    S.add(P.keep(-2.3, 2.45, 0.8, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); T.forEach(({ b, m }, i) => { const r = R.res[i], l = i === 5 && R.leak; m.color.set(l ? C.leak : C[r.code]); b.scale.y = i === st.i ? 2.8 : 1; }); }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'Request', options: ['Home', 'File', 'Directory', 'Script', 'Missing', 'Two dots'], get: () => st.i, act: i => set({ i }) }, tg('safe', 'Normalise the path first', 'Safe path'), tg('index', 'Serve directory index', 'Index'), tg('cgi', 'Run scripts', 'CGI')];
    const readouts = [
      { label: 'Request line', get: () => ({ v: REQ[st.i] }) },
      { label: 'Case that matched', get: () => ({ v: R.cur.ca, sub: R.cur.path }) },
      { label: 'Response', get: () => ({ v: `${R.cur.code}`, sub: R.cur.body, good: !R.leak, bad: R.leak }) },
    ];
    const labels = [
      { name: 'r', t: 'Six requests', d: 'Raised: the one you chose', icon: 'link', atV: V(X(0) - 0.28, 0.1, -0.05) },
      { name: 's', t: 'The server', d: 'Reads, decides, writes', icon: 'user', atV: V(2.42, 0.2, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Trust the path', hint: 'two dots climb out', on: () => set({ ...D0, i: 5, safe: false }), off: reset },
      { label: 'Serve scripts as files', hint: 'source goes out', on: () => set({ ...D0, i: 3, cgi: false }), off: reset },
    ];
    function status() {
      if (R.leak) return { ok: false, msg: '<b>200, and it sent a secrets file from outside the site.</b> The path was joined first and normalised after. Clean it, then join.' };
      if (!st.cgi && st.i === 3) return { ok: false, msg: '<b>The script went out as plain text.</b> With that case off, the file case matched instead, and visitors see the source.' };
      return { ok: true, msg: `<b>${R.cur.code}: ${R.cur.ca}.</b> The first case to match decides. To add a behaviour, add a case.` };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A loop', home: true, say: 'A bookshop in Luanda runs its own small site. A server reads a line, decides and writes.', act: m => m.set({ i: 0, safe: true, index: true, cgi: true }) },
    { t: 'A file', home: true, say: 'The simplest case: the path is a file, so send it.', act: m => m.set({ i: 1, safe: true, index: true, cgi: true }) },
    { t: 'A directory', home: true, say: 'A directory with an index page gets that page.', act: m => m.set({ i: 2, safe: true, index: true, cgi: true }) },
    { t: 'A script', home: true, say: 'A script is run, and its output is sent.', act: m => m.set({ i: 3, safe: true, index: true, cgi: true }) },
    { t: 'A list of cases', home: true, say: 'Keep a list of tests and actions. If nothing matches, send a 404.', act: m => m.set({ i: 4, safe: true, index: true, cgi: true }) },
    { t: 'Two dots', home: true, say: 'Paths come from strangers. Clean them first, or they climb out of the site.', act: m => m.set({ i: 5, safe: false, index: true, cgi: true }) },
  ],
  check: [
    { q: 'Why keep a list of cases?', options: ['Adding a behaviour is one more case', 'It is faster', 'HTTP needs it'], answer: 0, why: 'No growing chain of ifs.', hint: 'See A list of cases.' },
    { q: 'What do two dots in a path do?', options: ['Climb out of the folder', 'Mean a script', 'Mean a directory'], answer: 0, why: 'They mean the parent folder.', hint: 'Try Trust the path.' },
    { q: 'What happens to a CGI script?', options: ['It runs, and its output is sent', 'It is sent as text', 'It is deleted'], answer: 0, why: 'Output becomes the response.', hint: 'See A script.' },
  ],
  terms: [['Request line', 'Method, path and version.'], ['CGI', 'Running a program for a request.'], ['Path traversal', 'Climbing out of a folder.'], ['Status code', 'A number that says how it went.']],
  deeper: '<p><b>Real code.</b> The parser and cases run live over a small map of files.</p><p><b>Real servers</b> also handle encoded dots, links and permissions.</p>',
  credit: 'Built from <a href="http://aosabook.org/en/500L/a-simple-web-server.html" target="_blank" rel="noopener">A Simple Web Server</a> by Greg Wilson (text CC BY, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short handler, written for this lesson.',
  code: {
    title: 'Cases',
    note: 'Our own short version, after the chapter\'s Python.',
    text: `
CASES = [case_cgi, case_directory_index, case_file, case_always_fail]

def handle(self):
    self.full_path = safe_join(ROOT, self.path)
    for case in CASES:
        if case.test(self):
            return case.act(self)
`,
  },
};
