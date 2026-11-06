// MCP scope and elicitation: a legal-aid clinic's notes server in Kigali. "Delete the old draft lease" raises two different questions:
// which workspace may this touch (scope: authorisation, containment, sandbox), and which of three matching notes did the user mean (ask the user: elicitation).
// Scope is an explicit argument, workspaceUri file:///clinic/notes, checked three ways: is this user allowed it, does the normalised target stay inside it
// (compare path parts, not string prefixes), and is the process sandboxed anyway. Elicitation in 2026-07-28: the server returns input_required with a form
// (pick one note), the user accepts, declines or cancels, and the client calls again; the server checks the choice was one of the signed candidates.
// Secrets (a court e-filing password) never go in a form: they go to a server-controlled web page through URL mode.
const CANDS = ['note-12 Draft lease, Kimironko (2023)', 'note-31 Draft lease, Remera (2024)', 'note-40 Draft lease, Nyamirambo (2025)'];
const TARGETS = [
  { uri: 'file:///clinic/notes/note-12.md', inside: true },
  { uri: 'file:///clinic/notes-evil/stolen.md', inside: false, why: 'starts with the same letters, but is another folder' },
  { uri: 'file:///clinic/notes/%2e%2e/finance/payroll.md', inside: false, why: 'decodes to ../finance' },
];
function run(st) {
  const steps = [];
  steps.push({ t: 'tools/call delete_note { workspaceUri: "file:///clinic/notes", query: "old draft lease" }' });
  steps.push({ t: 'server: Faith may use this workspace ✓ · 3 notes match' });
  steps.push({ t: `server → input_required · elicitation (form): "Which note?" ${CANDS.map(c => c.split(' ')[0]).join(' / ')} · signed state lists the 3 candidates` });
  const action = st.cancel ? 'cancel' : 'accept';
  steps.push({ t: action === 'accept' ? 'Faith picks note-12 and accepts' : 'Faith closes the dialog without choosing (cancel)' });
  let deleted = [], harm = [];
  if (action === 'cancel') {
    if (st.consent) { steps.push({ t: 'server: no content, so stop · nothing deleted · she can try again later' }); }
    else { steps.push({ t: 'server: no answer counted as yes · deleted note-12 (the first match)', bad: true }); deleted.push('note-12'); harm.push('deleted without consent'); }
  } else {
    steps.push({ t: 'server: note-12 is in the signed candidate list ✓ · re-check workspace ✓ · deleted note-12' }); deleted.push('note-12');
  }
  /* two crafted targets from a poisoned tool call */
  TARGETS.slice(1).forEach(tg => {
    const ok = st.prefix ? tg.uri.startsWith('file:///clinic/notes') && !tg.uri.includes('%2e%2e') ? true : tg.uri.startsWith('file:///clinic/notes') : false;
    if (st.prefix) { steps.push({ t: `delete ${tg.uri}: prefix check passed · deleted (${tg.why})`, bad: true }); harm.push('deleted outside the workspace'); }
    else steps.push({ t: `delete ${tg.uri}: refused · ${tg.why}` });
  });
  steps.push({ t: st.formSecret ? 'e-filing: form asks for the court portal password; it passes through the app, its logs and the model\'s context' : 'e-filing: URL mode opens the court\'s own sign-in page; the password never touches the app', bad: st.formSecret });
  if (st.formSecret) harm.push('password exposed');
  return { steps, deleted, harm };
}

export default {
  slug: 'mcp-roots-and-elicitation',
  title: 'Scope and asking the user: MCP elicitation',
  description: 'A legal-aid clinic in Kigali asks its notes server to delete an old draft lease: which folder may it touch, and which lease did she mean?',
  overview: 'Two problems look alike and need different answers. Scope is "which workspace may this touch?" In the 2026-07-28 revision the old roots feature is deprecated: pass the workspace as an explicit argument (or a resource URI, or fix it in configuration) and check it three ways every time: is this user allowed it, does the target stay inside it after normalising (percent-encoding decoded, "..", symlinks), compared by path parts rather than string prefix, and is the process sandboxed so a compromised server can\'t escape anyway. A client-supplied folder never authorises itself. Disambiguation is "which one did you mean?" Elicitation asks the user mid-call: the server returns input_required with a small form (pick one of three notes, confirm a deletion), the client shows it, and the user accepts, declines or cancels; the client then calls again with the answer, and the server checks the answer against the candidates it signed into its state. Cancel and decline are not yes. Forms are for choices and non-secret values; passwords, keys and payment details go to a server-controlled web page through URL mode, so they never pass through the client, its logs or the model.',
  keywords: ['MCP elicitation', 'MCP roots', 'workspace scope', 'path traversal', 'human in the loop', 'URL mode', 'Model Context Protocol'],
  orient: 'landscape',
  view: { target: [-0.6, 0.4, 0.05], dir: [0.4, 0.85, 1.3], half: 1.7, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { prefix: false, formSecret: false, cancel: false, consent: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the workspace Faith may use: a walled green yard with three draft leases; beside it two yards that are out of bounds (notes-evil, finance) */
    const FX = -1.9, WZ = -0.3, yard = (x, z, w, d, c) => { const f = P.box(w, 0.03, d, c, { r: 0.03 }); f.position.set(x, 0, z); S.add(f); [[x, z - d / 2, w, 0.05], [x, z + d / 2, w, 0.05]].forEach(([wx, wz, ww, wd]) => { const b = P.box(ww, 0.16, wd, '#6B6E7E', { r: 0.01 }); b.position.set(wx, 0, wz); S.add(b); }); [x - w / 2, x + w / 2].forEach(wx => { const b = P.box(0.05, 0.16, d, '#6B6E7E', { r: 0.01 }); b.position.set(wx, 0, z); S.add(b); }); };
    yard(FX, WZ, 1.7, 1.1, '#CFEBD9'); yard(-2.35, 0.75, 0.8, 0.55, '#F6D9D0'); yard(-1.45, 0.75, 0.8, 0.55, '#F6D9D0');
    const blk = (x, z) => { const mm = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), b = P.box(0.32, 0.22, 0.4, '#fff', { r: 0.03, material: mm }); b.position.set(x, 0.03, z); S.add(b); return { b, mm }; };
    const notes = CANDS.map((_, i) => blk(FX - 0.5 + i * 0.5, WZ)), outside = [blk(-2.35, 0.75), blk(-1.45, 0.75)];
    /* Faith's app: a kiosk with three choice buttons, and Faith; the court's own sign-in booth for the password */
    const KX = 0.15, kiosk = P.box(0.7, 0.55, 0.12, CHAR, { r: 0.03 }); kiosk.position.set(KX, 0, -0.5); S.add(kiosk);
    const btns = CANDS.map((_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#B9B5AA' }), b = P.box(0.16, 0.1, 0.06, '#fff', { r: 0.02, material: mm }); b.position.set(KX - 0.2 + i * 0.2, 0.3, -0.42); S.add(b); return mm; });
    const faith = P.robot('#1F9E89', { scale: 0.85 }); faith.position.set(KX, 0, 0.1); S.add(faith);
    const secM = new THREE.MeshLambertMaterial({ color: GOOD }), secLamp = P.lamp(GOOD, { h: 0.4, r: 0.09 }); secLamp.position.set(KX + 0.5, 0, -0.5); S.add(secLamp);
    const court = P.box(0.5, 0.45, 0.45, '#5B8DB8', { r: 0.05 }); court.position.set(1.05, 0, 0.55); S.add(court);
    const keyM = new THREE.MeshLambertMaterial({ color: SAF }), key = P.box(0.12, 0.08, 0.2, '#fff', { r: 0.02, material: keyM }); key.userData.noFit = true; S.add(key);
    const harmTw = P.tower(0.5, 0.5, RED, { size: 0.28 }); harmTw.position.set(1.2, 0, -0.45); S.add(harmTw);
    S.add(P.keep(-2.85, 1.5, 1.2, -0.95, 1.1));

    let R = null, k = 0, clock = 0;
    function show() {
      const n = R.steps.length, prog = (k + 1) / n;
      notes.forEach((nb, i) => { const del = R.deleted.includes(CANDS[i].split(' ')[0]) && prog > 0.6; nb.b.scale.y = del ? 0.15 : 1; nb.mm.color.set(del ? (R.harm.includes('deleted without consent') ? RED : SAF) : '#FFFFFF'); });
      const out = R.harm.includes('deleted outside the workspace') && prog > 0.8;
      outside.forEach(o => { o.b.scale.y = out ? 0.15 : 1; o.mm.color.set(out ? RED : '#FFFFFF'); });
      btns.forEach((mm, i) => mm.color.set(!st.cancel && i === 0 && prog > 0.4 ? SAF : '#B9B5AA'));
    }
    function draw() {
      R = run(st); k = 0; clock = 0;
      secLamp.userData.set({ color: st.formSecret ? RED : GOOD, on: true });
      harmTw.userData.set({ h: 0.05 + R.harm.length / 3 * 1.0, cap: `${R.harm.length}`, color: R.harm.length ? RED : GOOD });
      show();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      faith.userData.tick(dt); faith.userData.set({ busy: true }); harmTw.userData.tick(dt);
      const u = (clock % 2.4) / 2.4, kx = KX + (st.formSecret ? 0 : (1.05 - KX)) * u, kz = 0.1 + (st.formSecret ? -0.55 : 0.45) * u;
      key.position.set(kx, 0.75 + Math.sin(u * Math.PI) * 0.2, kz); keyM.color.set(st.formSecret ? RED : SAF);
      clock += dt; if (clock >= 1.2 * (k + 1) && k < R.steps.length - 1) { k++; show(); }
      if (clock > 1.2 * R.steps.length + 2.4) { clock = 0; k = 0; show(); }
    };
    const controls = [
      { type: 'buttons', label: 'Faith', options: ['Picks a note', 'Closes the dialog'], get: () => st.cancel ? 1 : 0, act: i => set({ cancel: i === 1 }) },
      { type: 'toggle', label: 'Check the folder by string prefix', short: 'Prefix check', get: () => st.prefix, set: v => set({ prefix: !!v }), quick: false },
      { type: 'toggle', label: 'Ask for the password in a form', short: 'Password form', get: () => st.formSecret, set: v => set({ formSecret: !!v }), quick: false },
      { type: 'toggle', label: 'Only an accepted answer counts', short: 'Consent', get: () => st.consent, set: v => set({ consent: !!v }), quick: false },
      { type: 'button', label: 'Run again', act: () => draw() },
    ];
    const readouts = [
      { label: 'Notes deleted', get: () => ({ v: `${R.deleted.length + (st.prefix ? 2 : 0)}`, sub: st.cancel && st.consent ? 'she cancelled' : 'should be 1 or 0' }) },
      { label: 'Harms', get: () => ({ v: `${R.harm.length}`, sub: R.harm.join(', ') || 'none', bad: R.harm.length > 0, good: !R.harm.length }) },
      { label: 'Candidates', get: () => ({ v: '3', sub: 'signed into the state' }) },
    ];
    const labels = [
      { name: 'ws', t: 'The workspace', d: 'Green yard: the three draft leases Faith may touch. The pink yards are other folders, out of bounds', icon: 'layers', atV: V(FX - 0.9, 0.1, WZ) },
      { name: 'ask', t: 'Asking Faith', d: 'Three buttons, one per matching note; the lamp is red if a password goes through the app', icon: 'eye', atV: V(KX + 0.62, 0.6, -0.5) },
      { name: 'harm', t: 'Harms', d: 'Deleted without consent, or outside the workspace; the blue booth is the court\'s own sign-in page', icon: 'stop', atV: V(1.45, 0.25, -0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Folder checked by prefix', hint: 'startswith file:///clinic/notes', on: () => set({ ...D0, prefix: true }), off: reset },
      { label: 'Password in a form', hint: 'secrets through the app', on: () => set({ ...D0, formSecret: true }), off: reset },
      { label: 'A closed dialog means yes', hint: 'no answer counted as consent', on: () => set({ ...D0, cancel: true, consent: false }), off: reset },
    ];
    function status() {
      if (st.prefix) return { ok: false, msg: '<b>Prefix check: file:///clinic/notes-evil/stolen.md and file:///clinic/notes/%2e%2e/finance/payroll.md both "start with" the workspace, and both were deleted.</b> Decode and normalise the path first, then compare it part by part with the workspace. Check again right before deleting, and run the server in a sandbox in case all else fails.' };
      if (st.formSecret) return { ok: false, msg: '<b>The court e-filing password went through a form, so it passed through the app, its logs and possibly the model\'s context.</b> Forms are for choices and non-secret values. For passwords, keys and payments, use URL mode: the app shows the court\'s own address, asks Faith first, and the password goes straight to that page.' };
      if (st.cancel && !st.consent) return { ok: false, msg: '<b>Faith closed the dialog, and the server deleted the first match anyway.</b> Cancel means she didn\'t finish; decline means no. Neither is consent. Stop safely and let her try again, and never treat missing content as a yes.' };
      return { ok: true, msg: `<b>${st.cancel ? 'Faith cancelled, so nothing was deleted.' : 'One note deleted, the one Faith picked.'}</b> The workspace was an explicit argument, checked for her permission and for containment by path parts, so both crafted paths were refused. Her choice was checked against the three candidates signed into the server's state. The e-filing password goes through the court's own page, never the app.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Two questions', home: true, say: 'A legal-aid clinic in Kigali asks its notes server to delete the old draft lease. Two questions: which folder may it touch, and which of three matching notes did Faith mean?', act: m => m.set({ prefix: false, formSecret: false, cancel: false, consent: true }) },
    { t: 'Scope is explicit and checked', home: true, say: 'The workspace is an explicit argument. The server checks Faith may use it, and that every target stays inside it, comparing path parts after decoding.', act: m => m.set({ prefix: false }) },
    { t: 'Ask her', home: true, say: 'Three notes match, so the server asks: input required, with a small form. Faith picks one, her app calls again, and the server checks her pick was one of the three it offered.', act: m => m.set({ cancel: false }) },
    { t: 'Prefixes lie', home: true, say: 'Check the folder by its first letters, and notes dash evil, or a path with an encoded dot dot, slips through. Both get deleted.', act: m => m.set({ prefix: true }) },
    { t: 'No is not yes', home: true, say: 'If Faith closes the dialog, nothing happens. Treat silence as consent, and the first match is deleted without her say.', act: m => m.set({ prefix: false, cancel: true, consent: false }) },
    { t: 'Secrets go elsewhere', home: true, say: 'Filing to court needs her portal password. Never ask in a form: send her to the court\'s own page with URL mode, so the password never touches the app.', act: m => m.set({ cancel: false, consent: true, formSecret: false }) },
  ],
  check: [
    { q: 'Why is checking a folder with startswith() unsafe?', options: ['Other folders and encoded "../" paths can start with the same letters', 'It is slow', 'Paths are case-sensitive'], answer: 0, why: 'Normalise, then compare path parts.', hint: 'Try Folder checked by prefix.' },
    { q: 'The user closes the elicitation dialog. What should the server do?', options: ['Stop safely; cancel is not consent', 'Use the first option', 'Ask again forever'], answer: 0, why: 'Only an accepted, valid answer counts.', hint: 'Try A closed dialog means yes.' },
    { q: 'Where should a password be collected?', options: ['On a server-controlled page through URL mode', 'In a form', 'In the chat'], answer: 0, why: 'Forms pass through the client, its logs and the model.', hint: 'Try Password in a form.' },
  ],
  terms: [
    ['Elicitation', 'A server asking the user for input in the middle of a call.'],
    ['Form mode', 'Elicitation with a small, flat form: choices and non-secret values.'],
    ['URL mode', 'Elicitation that sends the user to a server-controlled web page.'],
    ['Roots', 'An older way for clients to tell servers their folders; deprecated in favour of explicit scope.'],
    ['Containment', 'Checking that a normalised path stays inside the allowed folder.'],
    ['Accept, decline, cancel', 'The three answers to an elicitation; only accept carries content.'],
  ],
  deeper: '<p><b>Capabilities per request.</b> A client says which elicitation modes it supports in every request; a server must not embed a mode the client didn\'t declare (−32021 if it needs one that is missing).</p><p><b>Protect what the answer unlocks.</b> Sign the candidate list and arguments into the state, re-authorise the workspace on the retry, and re-check containment right before acting: the world may have changed between rounds.</p><p><b>URL mode is not login.</b> It is for an outside interaction the server needs on the user\'s behalf, such as authorising a third party; the server must tie the browser user to the same person who started the call.</p><p><b>About this machine.</b> The steps follow the rules in the file header, shortened.</p>',
  code: {
    title: 'Contain the path, then ask',
    note: 'Adapted from the course\'s MCP roots and elicitation lesson.',
    text: `
from pathlib import PurePosixPath
from urllib.parse import unquote, urlparse

def inside(target_uri, workspace_uri):
    t = PurePosixPath(unquote(urlparse(target_uri).path))
    w = PurePosixPath(unquote(urlparse(workspace_uri).path))
    parts = []
    for p in t.parts:                       # resolve ".." yourself, after decoding
        if p == "..":
            if parts: parts.pop()
        elif p != ".":
            parts.append(p)
    t = PurePosixPath(*parts)
    return t.parts[:len(w.parts)] == w.parts  # compare parts, not strings

def delete_note(user, workspace, query, answer=None, state=None):
    authorize(user, workspace)
    matches = find_notes(workspace, query)
    if len(matches) > 1 and answer is None:
        return input_required(form_choose(matches), seal(user, workspace, matches))
    if answer is None or answer["action"] != "accept":
        return complete({"deleted": False})          # cancel and decline are not yes
    choice = answer["content"]["note"]
    if choice not in open_state(state, user, workspace)["matches"]:
        raise InvalidParams(-32602, "Not one of the offered notes")
    ...
`,
  },
};
