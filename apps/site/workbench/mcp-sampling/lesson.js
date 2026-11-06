// MCP sampling the 2026-07-28 way: a university library's MCP server in Addis Ababa summarises a student's thesis folder with the student's own model (the client's).
// The server can't call the client. It returns resultType "input_required" with an embedded sampling request and a requestState string; the client asks its model
// (after the student approves), then sends a new request repeating the call with inputResponses and the requestState echoed byte for byte.
// Round 1 asks the model to pick files; round 2 asks for the summary. One file in the folder contains a hidden line telling models to also pick ../../admin/keys.txt.
// requestState can be signed (an HMAC over user, method, a digest of the arguments, phase and expiry) or plain JSON a client could edit. The server can check the model's
// file list against the folder's real listing. The client can cap rounds; a second, malicious server keeps returning input_required forever.
const FOLDER = ['ch3-intro.md', 'ch3-methods.md', 'ch3-data.csv', 'ch3-results.md'];
function run(st) {
  const L = []; let outside = 0, modelCalls = 0, rounds = 0;
  const add = (side, t, bad) => L.push({ side, t, bad });
  add('c', 'tools/call summarize_folder { folder: "thesis/ch3" }');
  add('s', `input_required · sampling: "pick the files that matter" · requestState ${st.sign ? 'eyJ…signed…' : '{"phase":1,"folder":"thesis/ch3"}'}`);
  rounds++; modelCalls++;
  add('c', 'student approves · model picks: ch3-intro.md, ch3-results.md, ../../admin/keys.txt (from a hidden line in ch3-data.csv)');
  let files = ['ch3-intro.md', 'ch3-results.md', '../../admin/keys.txt'];
  if (st.tamper) {
    add('c', `retry with requestState edited to {"phase":2,"files":["../../admin/keys.txt"]}`, true);
    if (st.sign) { add('s', '−32602: requestState signature doesn\'t match: refused'); files = null; }
    else { add('s', 'state accepted as sent: phase 2, reading ../../admin/keys.txt', true); outside++; files = ['../../admin/keys.txt']; }
  } else {
    add('c', 'retry: same call, inputResponses (the file list), requestState echoed exactly');
    if (st.validate) { files = files.filter(f => FOLDER.includes(f)); add('s', `checked against the folder listing: ../../admin/keys.txt dropped · input_required · sampling: "summarise these 2 files" · new requestState (phase 2)`); }
    else { outside++; add('s', 'read all three files, including ../../admin/keys.txt · input_required · sampling: "summarise" (with the keys inside)', true); }
  }
  if (files) {
    rounds++; modelCalls++;
    add('c', `model writes the summary${outside ? ' (now containing admin keys)' : ''} · retry with inputResponses and the round-2 requestState`, !!outside);
    add('s', `complete · "Chapter 3 compares rainfall and teff yields across 12 woredas…"${outside ? ' and the admin keys' : ''}`, !!outside);
  }
  /* a second server that never finishes */
  const cap = st.cap ? 4 : 40;
  const loop = Math.min(cap, 40);
  return { L, outside, modelCalls, rounds, loop, capped: st.cap };
}

export default {
  slug: 'mcp-sampling',
  title: 'MCP sampling: borrow the client\'s model, safely',
  description: 'A library server in Addis Ababa summarises a student\'s thesis folder with her own model, asking round by round through input_required.',
  overview: 'Sometimes a server wants a model to do part of its work: choose the important files, then summarise them. The simple answer is for the server to call a model provider itself, with its own key and budget. The other answer, sampling, uses the client\'s model and the user\'s approval; it is deprecated but still in use. In the 2026-07-28 revision a server never sends its own requests to the client. Instead it returns a result marked input_required, with the model request embedded and a requestState string. The client shows the user what is being asked, gets the model\'s answer, and sends a fresh request repeating the original call with that answer and the requestState echoed exactly. Each round carries only that round\'s answers, so the server keeps its progress (which phase, which files) in requestState. That string passes through the client, so treat it as attacker-controlled: sign it, binding the user, the method, a digest of the arguments, the phase and an expiry, and reject anything that doesn\'t verify. Treat the model\'s answers as untrusted input too, especially when they become file names or URLs. And the client is the trust boundary: it caps rounds and tokens, because a bad server can otherwise run up model spend without end.',
  keywords: ['MCP sampling', 'input_required', 'multi round-trip requests', 'requestState', 'HMAC', 'Model Context Protocol', 'agent security'],
  orient: 'landscape',
  view: { target: [-0.5, 0.45, -0.1], dir: [0.4, 0.85, 1.3], half: 1.7, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { sign: true, validate: true, cap: true, tamper: false }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the student's app (with her model) and the library server pass a ball back and forth: one round each way; the cube riding on it is requestState */
    const CXp = -2.3, SXp = -0.6, YZ = -0.55;
    const cl = P.robot('#5B8DB8', { scale: 1.0 }); cl.position.set(CXp, 0, YZ); S.add(cl);
    const sv = P.box(0.75, 0.55, 0.6, CHAR, { r: 0.05 }); sv.position.set(SXp, 0, YZ); S.add(sv);
    const pkt = P.ball(0.09, SAF, { material: new THREE.MeshLambertMaterial({ color: SAF }) }); pkt.userData.noFit = true; S.add(pkt);
    const tokM = new THREE.MeshLambertMaterial({ color: SAF }), tok = P.box(0.12, 0.1, 0.12, '#fff', { r: 0.02, material: tokM }); tok.userData.noFit = true; S.add(tok);
    /* the thesis folder (one file carries a hidden line, the red-striped one) and, past a fence, the admin keys */
    const FZ = 0.55, files = FOLDER.map((f, i) => { const b = P.box(0.26, 0.08, 0.34, i === 2 ? '#E07A5F' : '#FFFFFF', { r: 0.02 }); b.position.set(-1.85 + i * 0.32, 0, FZ); S.add(b); return b; });
    const tray = P.box(1.45, 0.03, 0.55, '#C9C4B6', { r: 0.03 }); tray.position.set(-1.37, 0, FZ); S.add(tray);
    const fence = P.box(0.06, 0.38, 0.7, '#6B6E7E', { r: 0.02 }); fence.position.set(-0.45, 0, FZ); S.add(fence);
    const keyM = new THREE.MeshLambertMaterial({ color: '#3A3B44' }), keys = P.box(0.36, 0.26, 0.36, '#fff', { r: 0.04, material: keyM }); keys.position.set(-0.05, 0, FZ); S.add(keys);
    /* a bad server that never finishes: its model calls pile up on the student's account, unless the app caps rounds */
    const BX = 1.15, bad = P.box(0.7, 0.55, 0.6, '#7A2E22', { r: 0.05 }); bad.position.set(BX, 0, YZ); S.add(bad);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 40); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const capM = new THREE.MeshLambertMaterial({ color: GOOD }), capBar = P.box(0.6, 0.04, 0.5, '#fff', { r: 0.01, material: capM }); S.add(capBar);
    S.add(P.keep(-2.7, 1.6, 1.5, -1.0, 0.9));

    let R = null, k = 0, clock = 0;
    function show() {
      const l = R.L[k], u = Math.min(1, (clock % 1.3) / 0.9), from = l.side === 'c' ? CXp + 0.3 : SXp - 0.4, to = l.side === 'c' ? SXp - 0.4 : CXp + 0.3;
      const x = from + (to - from) * u, y = 0.7 + Math.sin(u * Math.PI) * 0.25;
      pkt.position.set(x, y, YZ); pkt.material.color.set(l.bad ? RED : l.side === 'c' ? '#5B8DB8' : SAF);
      tok.position.set(x, y + 0.14, YZ); tokM.color.set(st.tamper && /edited/.test(l.t) ? RED : st.sign ? SAF : '#FFFFFF');
      const lit = R.outside && R.L.slice(0, k + 1).some(q => q.bad);
      keyM.color.set(lit ? RED : '#3A3B44');
      for (let i = 0; i < 40; i++) { const on = i < R.loop; dummy.position.set(BX - 0.18 + (i % 4) * 0.12, 0.0 + Math.floor(i / 4) * 0.1, 0.45 + 0.0); dummy.scale.set(on ? 0.1 : 0, on ? 0.08 : 0, on ? 0.3 : 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); im.setColorAt(i, col.set(R.capped ? SAF : BAD)); }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      capBar.visible = !!R.capped; capBar.position.set(BX, Math.ceil(R.loop / 4) * 0.1 + 0.01, 0.45);
    }
    function draw() { R = run(st); k = 0; clock = 0; show(); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { cl.userData.tick(dt); cl.userData.set({ busy: R.L[k].side === 'c' }); clock += dt; if (clock >= 1.3) { clock -= 1.3; if (k < R.L.length - 1) k++; } show(); };
    const controls = [
      { type: 'toggle', label: 'Sign requestState', short: 'Sign state', get: () => st.sign, set: v => set({ sign: !!v }) },
      { type: 'toggle', label: 'Check the model\'s file list', short: 'Check files', get: () => st.validate, set: v => set({ validate: !!v }) },
      { type: 'toggle', label: 'Cap rounds in the app', short: 'Round cap', get: () => st.cap, set: v => set({ cap: !!v }) },
      { type: 'toggle', label: 'A client edits the state', short: 'Tamper', get: () => st.tamper, set: v => set({ tamper: !!v }), quick: false },
      { type: 'button', label: 'Run again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Read outside', get: () => ({ v: `${R.outside}`, sub: 'files beyond the folder', bad: R.outside > 0, good: !R.outside }) },
      { label: 'Rounds', get: () => ({ v: `${R.rounds}`, sub: 'model calls for the summary' }) },
      { label: 'Bad server\'s model calls', get: () => ({ v: `${R.loop}`, sub: R.capped ? 'stopped by the cap' : 'no cap', bad: !R.capped }) },
    ];
    const labels = [
      { name: 'app', t: 'The student\'s app', d: 'Her model answers the server\'s requests; the cube riding the ball is requestState (gold signed, white plain, red edited)', icon: 'eye', atV: V(CXp - 0.3, 0.5, YZ) },
      { name: 'folder', t: 'The folder', d: 'The coral file hides a line; past the fence, the admin keys turn red if read', icon: 'book', atV: V(-2.1, 0.06, FZ + 0.3) },
      { name: 'bad', t: 'A bad server', d: 'Never finishes: each block is a model call on her account; the green lid is the round cap', icon: 'stop', atV: V(BX + 0.38, 0.4, YZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Unsigned state, edited', hint: 'a client rewrites requestState', on: () => set({ ...D0, sign: false, tamper: true }), off: reset },
      { label: 'Trust the model\'s file list', hint: 'no check against the folder', on: () => set({ ...D0, validate: false }), off: reset },
      { label: 'No round cap', hint: 'a server that never finishes', on: () => set({ ...D0, cap: false }), off: reset },
    ];
    function status() {
      if (st.tamper && !st.sign) return { ok: false, msg: '<b>The client rewrote requestState to phase 2 with ../../admin/keys.txt, and the server believed it.</b> requestState travels through the client, so anyone in between can edit it. Sign it with a key only the server holds, binding the user, the method, a digest of the arguments, the phase and an expiry; refuse anything that doesn\'t verify.' };
      if (!st.validate) return { ok: false, msg: '<b>The model picked ../../admin/keys.txt, and the server read it.</b> A hidden line in one of the student\'s files told models to add it, and the model obeyed. Model output is untrusted input: check every file name against the folder\'s real listing before using it.' };
      if (!st.cap) return { ok: false, msg: `<b>No round cap: a bad server returned input_required ${R.loop} times, and every round was a model call on the student's account.</b> The app is the trust boundary. Cap rounds and tokens per request, show the student what each round asks, and stop servers that never finish.` };
      if (st.tamper) return { ok: true, msg: '<b>The edited requestState failed its signature check, and the server refused it with −32602.</b> The client changed the phase and the file list; the signature, made with a key only the server holds over the user, method, arguments, phase and expiry, no longer matched. The call stops there, and nothing outside the folder is read.' };
      return { ok: true, msg: `<b>Two rounds, ${R.modelCalls} model calls, nothing read outside the folder.</b> ${st.tamper ? 'The edited requestState failed its signature check. ' : ''}The server asked through input_required, the app showed the student each request and echoed requestState exactly, the poisoned file name was dropped against the folder listing, and the bad server was stopped at ${R.loop} rounds.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Ask through the result', home: true, say: 'A university library\'s server in Addis Ababa summarises a student\'s thesis folder using her own model. It can\'t call her app, so its result says input required, with a model request inside.', act: m => m.set({ sign: true, validate: true, cap: true, tamper: false }) },
    { t: 'Round by round', home: true, say: 'Her app shows what is being asked, gets the model\'s answer, and repeats the call with that answer. A state string carries the server\'s progress, echoed exactly.', act: m => m.set({ tamper: false }) },
    { t: 'A poisoned file', home: true, say: 'One file hides a line telling models to also pick the admin keys. The model obeys. Check its file list against the real folder, and the keys are dropped.', act: m => m.set({ validate: true }) },
    { t: 'Trust nothing that passed through', home: true, say: 'The state string passes through the app. Unsigned, a client can rewrite it and skip the checks. Signed, the edit is refused.', act: m => m.set({ sign: false, tamper: true }) },
    { t: 'A server that never stops', home: true, say: 'Another server keeps asking for one more round. Without a cap, the student pays for model calls without end.', act: m => m.set({ sign: true, tamper: false, cap: false }) },
    { t: 'The app decides', home: true, say: 'Cap the rounds, show each request, sign the state, check the answers. The app is the trust boundary.', act: m => m.set({ cap: true }) },
  ],
  check: [
    { q: 'How does a 2026-07-28 MCP server get a model answer from the client?', options: ['It returns input_required with the request embedded; the client calls again with the answer', 'It sends the client its own request', 'It opens a session'], answer: 0, why: 'Servers never send requests to clients in this revision.', hint: 'Follow the rounds.' },
    { q: 'Why sign requestState?', options: ['It passes through the client, which could edit it', 'To compress it', 'The model needs it'], answer: 0, why: 'Bind user, method, arguments, phase and expiry.', hint: 'Try Unsigned state, edited.' },
    { q: 'Why does the client cap rounds?', options: ['A bad server could otherwise run up model calls without end', 'Servers require it', 'To save memory'], answer: 0, why: 'The client is the trust boundary.', hint: 'Try No round cap.' },
  ],
  terms: [
    ['Sampling', 'A server getting a model completion through the client, with the user\'s approval.'],
    ['input_required', 'A result saying the server needs more input before it can finish.'],
    ['MRTR', 'Multi round-trip request: the client repeats the call with each round\'s answers.'],
    ['requestState', 'An opaque string the server uses to carry progress between rounds.'],
    ['HMAC', 'A signature made with a secret key, so tampering is detected.'],
    ['Model preferences', 'Hints on cost, speed and intelligence; the client decides.'],
  ],
  deeper: '<p><b>Prefer your own model call.</b> For a new server, calling a model provider directly is the default: the server owns the key, budget, retries and logs, and returns one ordinary result. Use sampling only when using the client\'s model is a real requirement, with a plan to retire it.</p><p><b>Keep context minimal.</b> Pass only what the round needs; broader context modes leak more and are deprecated.</p><p><b>Errors.</b> A missing capability for sampling is −32021; a bad or expired requestState is −32602. Model preferences are hints the client may ignore.</p><p><b>About this machine.</b> The rounds and messages follow the rules in the file header, shortened; the bad server\'s rounds stop at 4 with a cap and are shown up to 40 without one.</p>',
  code: {
    title: 'Sign the state between rounds',
    note: 'Adapted from the course\'s MCP sampling lesson.',
    text: `
import hmac, hashlib, json, time

def seal(user, method, args, phase, data, key):
    body = json.dumps({"u": user, "m": method, "a": digest(args), "p": phase,
                       "d": data, "exp": time.time() + 300}, sort_keys=True)
    sig = hmac.new(key, body.encode(), hashlib.sha256).hexdigest()
    return f"{sig}.{body}"

def open_state(token, user, method, args, key):
    sig, body = token.split(".", 1)
    good = hmac.new(key, body.encode(), hashlib.sha256).hexdigest()
    s = json.loads(body)
    if not hmac.compare_digest(sig, good) or s["u"] != user or s["m"] != method \\
       or s["a"] != digest(args) or s["exp"] < time.time():
        raise InvalidParams(-32602, "requestState is not valid")
    return s
`,
  },
};
