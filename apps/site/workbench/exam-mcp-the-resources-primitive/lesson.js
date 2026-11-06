// Exam prep, the MCP resources primitive: an invented engineering team in Gaborone serves a project workspace: a README, a src directory, a
// binary logo, a git changelog and a private user note. Six reads test the server: a template expansion, a directory (two contents items), a
// binary blob, a path traversal attempt, a missing file and a per-user note. Not found is -32602 with data.uri, never an empty contents array;
// traversal is sanitised against the root; per-user content is cacheScope private; {+path} keeps nested slashes. Illustrative.
const READS = [
  { n: 'template file:///project/{+path}, path=src/utils.py', key: 'plus' },
  { n: 'file:///project/src (a directory)', key: null },
  { n: 'file:///project/logo.png', key: null },
  { n: 'file:///project/../../etc/passwd', key: 'sanitize' },
  { n: 'file:///project/missing.md', key: 'notfound' },
  { n: 'user://amogelang/notes', key: 'private' },
];

function reply(i, o) {
  if (i === 0) return o.plus ? { t: 'expands to file:///project/src/utils.py\ncontents [{uri, mimeType "text/x-python", text}]', ok: true } : { t: '{path} escapes the slash: src%2Futils.py\nno such resource', ok: false };
  if (i === 1) return { t: 'contents: [main.py, utils.py]\neach with its own uri and mimeType', ok: true };
  if (i === 2) return { t: 'contents [{uri, mimeType "image/png",\nblob: base64 bytes}]', ok: true };
  if (i === 3) return o.sanitize ? { t: 'rejected: outside the project root\nerror -32602', ok: true } : { t: 'returned /etc/passwd', ok: false };
  if (i === 4) return o.notfound ? { t: 'error -32602 "Resource not found"\ndata.uri: file:///project/missing.md', ok: true } : { t: 'result contents: [] (looks like an empty file)', ok: false };
  return o.private ? { t: 'contents [{uri, text}]\ncacheScope "private", ttlMs 60000', ok: true } : { t: 'cacheScope "public": a shared cache can\nserve this note to another user', ok: false };
}

function run(o) {
  const rows = READS.map((r, i) => ({ r, ...reply(i, o) }));
  const bad = rows.filter(x => !x.ok).length;
  return { rows, bad, ok: bad === 0 };
}

export default {
  slug: 'exam-mcp-the-resources-primitive',
  title: 'Exam prep, MCP: the resources primitive',
  description: 'A workspace server answers six reads: a template, a directory, a binary file, a path attack, a missing file and a private note. Make each one safe.',
  overview: 'Resources are application-driven: the host decides which ones enter context, by heuristic, by a picker or by a fixed set. Three methods cover them. resources/list returns what the caller can see (uri, name and optional description, mimeType and icons); the set may change over time but must not vary per connection, only by the authorization on the request. resources/templates/list returns URI templates (RFC 6570), such as file:///project/{+path}; the + form keeps slashes in a nested path, where {path} would escape them. resources/read returns a contents array, where each item is either text {uri, mimeType, text} or binary {uri, mimeType, blob} with base64 bytes; one read can return several items, such as every file in a directory. URI schemes are a design choice: use https:// only when a client could fetch the same content directly; otherwise prefer file://, git:// or a custom scheme following RFC 3986. A file:// URI need not be a real path, but if it maps to one, sanitise it against traversal. A missing resource is a JSON-RPC error, -32602 with data.uri naming what was asked for, never an empty contents array; a server failure is -32603; clients should still accept the legacy -32002 from older servers. resources/read is cacheable, so complete results carry ttlMs and cacheScope; content that reads the same for everyone can be public, but per-user content must be private so a cache never serves one caller\'s data to another, and cacheScope is never an access control. Resources may carry audience, priority and lastModified annotations, and a server with resources {subscribe} delivers changes through subscriptions/listen with a resourceSubscriptions filter. The team is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'resources/read', 'uri templates', 'blob', 'cacheScope', 'path traversal', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.05], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { plus: true, sanitize: true, notfound: true, private: true, pick: 4 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the project workspace as a shelf of files; a root gate stands before it, the system's secrets lie outside */
    const files = P.shelf(4, { cell: 0.24, levels: 2, lh: 0.22, d: 0.34 }); files.position.set(-1.65, 0, -0.45); S.add(files);
    files.userData.set({ fill: Array(8).fill('#5B8DB8') });
    const root = P.gate(0.5, GOOD, { h: 0.42 }); root.rotation.y = Math.PI / 2; root.position.set(-0.8, 0, -0.45); S.add(root);
    const secretsM = new THREE.MeshLambertMaterial({ color: OFF }), secrets = P.box(0.46, 0.3, 0.3, '#fff', { r: 0.03, material: secretsM }); secrets.position.set(-0.8, 0, -1.0); S.add(secrets);
    const leak = P.pipe([V(-0.5, 0.15, -0.45), V(-0.7, 0.2, -0.7), V(-0.8, 0.2, -0.85)], BAD, { r: 0.03, n: 3 }); S.add(leak);
    /* reads ride a belt from the client towards the workspace */
    const client = P.robot('#3D6BD6', { scale: 0.62 }); client.position.set(1.45, 0, -0.45); S.add(client);
    const line = P.belt(V(1.15, 0, -0.45), V(-0.6, 0, -0.45), { w: 0.34, speed: 0.8 }); S.add(line);
    /* a private locker for per-user notes */
    const lockM = new THREE.MeshLambertMaterial({ color: GOOD }), locker = P.box(0.34, 0.34, 0.3, '#fff', { r: 0.04, material: lockM }); locker.position.set(0.35, 0, -1.0); S.add(locker);
    /* six reads on pads */
    const pads = READS.map((r, i) => {
      const m = new THREE.MeshLambertMaterial({ color: OFF }), b = P.box(0.36, 0.04, 0.36, '#fff', { r: 0.03, material: m }); b.position.set(-1.55 + i * 0.44, 0, 0.35); S.add(b);
      const l = P.lamp(GOOD, { h: 0.08, r: 0.08 }); l.position.set(-1.55 + i * 0.44, 0.04, 0.35); S.add(l);
      return { m, l };
    });
    S.add(P.keep(-2.1, 1.7, 0.75, -1.2, 0.6));
    let clock = 0, parcel = GOOD;

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((x, i) => { pads[i].m.color.set(i === st.pick ? SAF : '#E4DED2'); pads[i].l.userData.set({ color: x.ok ? GOOD : BAD, on: true }); });
      root.visible = !!st.sanitize; leak.visible = !st.sanitize; secretsM.color.set(st.sanitize ? OFF : BAD);
      lockM.color.set(st.private ? GOOD : BAD);
      parcel = R.rows[st.pick].ok ? GOOD : BAD;
      line.userData.clear();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Expand with {+path}', short: '{+path}', get: () => st.plus, set: v => set({ plus: !!v }) },
      { type: 'toggle', label: 'Sanitise paths against the root', short: 'Sanitise', get: () => st.sanitize, set: v => set({ sanitize: !!v }) },
      { type: 'toggle', label: 'Missing resource: -32602 with data.uri', short: 'Not found', get: () => st.notfound, set: v => set({ notfound: !!v }) },
      { type: 'toggle', label: 'Per-user content is private', short: 'Private', get: () => st.private, set: v => set({ private: !!v }) },
      { type: 'buttons', label: 'Read', options: ['template', 'directory', 'logo', '../', 'missing', 'note'], get: () => st.pick, act: i => set({ pick: i }) },
    ];
    const readouts = [
      { label: 'Reads wrong', get: () => ({ v: `${R.bad} of 6`, sub: 'resources/read', good: R.ok, bad: !R.ok }) },
      { label: 'This read', get: () => ({ v: R.rows[st.pick].ok ? 'right' : 'wrong', sub: ['template', 'directory', 'binary', 'traversal', 'missing', 'per-user'][st.pick], good: R.rows[st.pick].ok, bad: !R.rows[st.pick].ok }) },
    ];
    const labels = [
      { name: 'w', t: 'The workspace', d: 'A gate holds the root', icon: 'book', atV: V(-2.15, 0.2, -0.45) },
      { name: 't', t: 'Six reads', d: 'Red: unsafe or wrong reply', icon: 'check', atV: V(0.85, 0.12, 0.35) },
    ];
    const reset = () => set({ ...D0, pick: st.pick });
    const breaks = [
      { label: 'Return empty contents when missing', hint: 'looks like an empty file', on: () => set({ ...D0, notfound: false, pick: 4 }), off: reset },
      { label: 'Follow ../ out of the root', hint: 'file:// still needs sanitising', on: () => set({ ...D0, sanitize: false, pick: 3 }), off: reset },
      { label: 'Cache a private note publicly', hint: 'cacheScope is not access control', on: () => set({ ...D0, private: false, pick: 5 }), off: reset },
    ];
    function status() {
      const x = R.rows[st.pick];
      if (R.ok) return { ok: true, msg: `<b>${READS[st.pick].n}: ${x.t.replace(/\n/g, ' ')}.</b> All six reads behave as the specification expects.` };
      const f = [];
      if (!st.plus) f.push('{path} escaped the slash in src/utils.py, so the expanded URI named nothing; {+path} keeps it');
      if (!st.sanitize) f.push('the server followed ../ and returned /etc/passwd; sanitise file:// paths against the root');
      if (!st.notfound) f.push('a missing file came back as empty contents, which looks like an empty file; return -32602 with data.uri');
      if (!st.private) f.push('the per-user note was cached as public, so a shared cache could serve it to another user');
      const t = f.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => {
      clock += dt; if (clock > 1.2) { clock = 0; line.userData.send(parcel, { size: 0.18 }); }
      line.userData.tick(dt); client.userData.tick(dt); leak.userData.tick(dt);
    }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'The workspace', home: true, say: 'A server exposes a project as resources: files, a changelog and a private note, each with a URI.', act: m => m.set({ plus: true, sanitize: true, notfound: true, private: true, pick: 1 }) },
    { t: 'Templates', home: true, say: 'A template with plus path keeps the slashes in a nested path.', act: m => m.set({ plus: true, sanitize: true, notfound: true, private: true, pick: 0 }) },
    { t: 'Binary content', home: true, say: 'Binary files come back as a base64 blob with a mime type.', act: m => m.set({ plus: true, sanitize: true, notfound: true, private: true, pick: 2 }) },
    { t: 'Stay in the root', home: true, say: 'A path that climbs out of the project is rejected before any lookup.', act: m => m.set({ plus: true, sanitize: true, notfound: true, private: true, pick: 3 }) },
    { t: 'Not found', home: true, say: 'A missing file is invalid params with the URI in the data, not an empty result.', act: m => m.set({ plus: true, sanitize: true, notfound: true, private: true, pick: 4 }) },
    { t: 'Private caching', home: true, say: 'A note that belongs to one user is cached as private, never public.', act: m => m.set({ plus: true, sanitize: true, notfound: true, private: true, pick: 5 }) },
  ],
  check: [
    { q: 'A requested URI does not exist. What should resources/read return?', options: ['-32602 with data.uri', 'A result with empty contents', '-32601'], answer: 0, why: 'Clients still accept legacy -32002.', hint: 'Try Return empty contents when missing.' },
    { q: 'A file:// URI contains ../../etc/passwd. What should the server do?', options: ['Sanitise against the root and reject it', 'Follow it', 'Return an empty file'], answer: 0, why: 'file:// need not be real, but if it maps to disk, sanitise.', hint: 'Try Follow ../ out of the root.' },
    { q: 'Which cacheScope fits one user\'s private note?', options: ['private', 'public', 'none'], answer: 0, why: 'public permits sharing across users.', hint: 'Try Cache a private note publicly.' },
  ],
  practice: [
    { q: 'When should a resource use an https:// URI?', options: ['Only when a client could fetch it directly from the web', 'Always', 'For private data', 'Never'], answer: 0, why: 'Otherwise use file://, git:// or a custom scheme.' },
    { q: 'What does a binary contents item carry?', options: ['uri, mimeType and blob (base64)', 'uri and text', 'data and size', 'A link only'], answer: 0, why: 'Text items carry text instead.' },
    { q: 'Who decides which resources go into context?', options: ['The host application', 'The model', 'The server', 'The user, always'], answer: 0, why: 'Resources are application-driven.' },
    { q: 'How does a client watch a resource for changes in 2026-07-28?', options: ['subscriptions/listen with resourceSubscriptions', 'resources/subscribe', 'Polling only', 'A session'], answer: 0, why: 'resources/subscribe was removed.' },
    { q: 'May resources/list vary per connection?', options: ['No: only by the authorization on the request', 'Yes', 'Only on stdio', 'Only for templates'], answer: 0, why: 'The stateless core.' },
    { q: 'A server fails internally while reading. Which code?', options: ['-32603', '-32602', '-32601', '-32700'], answer: 0, why: 'Internal error.' },
  ],
  terms: [
    ['resources/list', 'The resources visible to the caller.'],
    ['URI template', 'An RFC 6570 pattern such as file:///project/{+path}.'],
    ['Text content', '{uri, mimeType, text}.'],
    ['Blob content', '{uri, mimeType, blob} with base64 bytes.'],
    ['-32602 not found', 'The 2026-07-28 code for a missing resource, with data.uri.'],
    ['resourceSubscriptions', 'URIs to watch on a subscriptions/listen stream.'],
  ],
  deeper: '<p><b>Legacy code.</b> Older servers returned -32002 for not found; a 2026-07-28 implementation must not emit it, but clients should accept it.</p><p><b>About this machine.</b> The workspace and team are invented.</p>',
  code: {
    title: 'Read a resource safely',
    note: 'Written for this lesson.',
    text: `
ROOT = "/srv/project"

def read(req):
    uri = req["params"]["uri"]
    path = os.path.realpath(os.path.join(ROOT, uri.removeprefix("file:///project/")))
    if not path.startswith(ROOT + os.sep) and path != ROOT:
        return error(req, -32602, "Outside the project root", data={"uri": uri})
    if not os.path.exists(path):
        return error(req, -32602, "Resource not found", data={"uri": uri})   # never []
    items = [item(p) for p in walk(path)]                  # a directory reads back each file
    return result(req, contents=items, ttlMs=60000,
                  cacheScope="private" if uri.startswith("user://") else "public")
`,
  },
};
