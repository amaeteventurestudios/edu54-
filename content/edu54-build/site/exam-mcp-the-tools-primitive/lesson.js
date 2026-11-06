// Exam prep, the MCP tools primitive: an invented release desk at a software studio in Accra lists six tools two at a time. The middle page ends
// with nextCursor "" (an empty string is a legal cursor); only a missing nextCursor key means done. A CallToolResult always has content (five
// block types: text, image, audio, resource_link, resource), optional structuredContent and optional isError (absent means success). Content
// annotations steer audience; tools {listChanged} changes arrive on a subscriptions/listen stream. Illustrative.
const PAGES = [
  { tools: ['release_notes', 'build_badge'], next: '"p2"' },
  { tools: ['standup_audio', 'changelog_link'], next: '""' },
  { tools: ['embed_manifest', 'ticket_summary'], next: null },
];
const BLOCKS = [
  { t: 'text', f: 'text' }, { t: 'image', f: 'data (base64),\nmimeType' }, { t: 'audio', f: 'data (base64),\nmimeType' },
  { t: 'resource_link', f: 'uri, name\n(+ description,\nmimeType)' }, { t: 'resource', f: 'embedded\ncontents' },
];

function run(o) {
  const pagesRead = o.keyCheck ? 3 : 2;
  const issues = [];
  if (!o.keyCheck) issues.push('the client checked if nextCursor was truthy, so the empty-string cursor stopped it a page early and two tools were never listed');
  if (!o.audience) issues.push('the build badge, marked audience "user", was pasted into the model\'s context as base64');
  if (!o.listen) issues.push('the client never opened subscriptions/listen, so a new tool stayed invisible until it happened to list again');
  if (!o.omit) issues.push('the client treated a result with no isError field as a failure; absent means success');
  return { pagesRead, toolsSeen: pagesRead * 2, issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-the-tools-primitive',
  title: 'Exam prep, MCP: the tools primitive',
  description: 'A release desk lists six tools, two at a time, and one page ends with an empty cursor. Read every page, keep user-only blocks out, and listen for changes.',
  overview: 'A client asks what a server can do with tools/list. The first request has no cursor; later ones pass back the opaque nextCursor from the previous page. Because tools/list is cacheable, a complete result carries ttlMs and cacheScope, and when more tools remain it carries nextCursor. An empty string is a legal cursor, not a sentinel: a client that keeps paging only while nextCursor is truthy stops a page early. The only end signal is the key being absent. Page size is the server\'s choice, and an invalid cursor is -32602. Invoking a tool is tools/call with name and arguments. The CallToolResult always has a content list, may have structuredContent (matching outputSchema when one exists, and mirrored in text) and may have isError; leaving isError out means success, and only true marks a problem the tool ran into. Content is a list because one call can return several kinds of thing. Five block types cover every case: text (text), image (base64 data and mimeType), audio (the same two fields), resource_link (a uri and name, optionally a description and mimeType, pointing at a resource instead of inlining it) and resource (embedded contents). Every block can carry annotations: audience (user or assistant), priority from 0 to 1 and lastModified; a host can keep a user-facing image out of the model\'s context. Tool annotations are a different thing: hints about the tool itself, untrusted unless the server is trusted, with defaults that make an unannotated tool destructive. A server that declares tools {listChanged: true} sends notifications/tools/list_changed on a subscriptions/listen stream the client opened with toolsListChanged; the stream starts with notifications/subscriptions/acknowledged. The studio is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'tools/list', 'pagination', 'CallToolResult', 'content blocks', 'listChanged', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.3, 0.25, -0.05], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { keyCheck: true, audience: true, listen: true, omit: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* three pages as shelves of two tools; lamps between them are the cursors */
    const X = i => -2.0 + i * 1.1;
    const pages = PAGES.map((p, i) => { const s = P.shelf(2, { cell: 0.32, levels: 1, lh: 0.28, d: 0.34 }); s.position.set(X(i), 0, -0.55); S.add(s); return s; });
    const cursors = [0, 1].map(i => { const l = P.lamp(GOOD, { h: 0.14, r: 0.08 }); l.position.set(X(i) + 0.55, 0, -0.55); S.add(l); return l; });
    const walker = P.robot('#7B6FA8', { scale: 0.5 }); walker.position.set(X(1), 0, -0.1); S.add(walker);
    /* five content blocks in a row: the gold image is for the user, and turns red if it reaches the model */
    const blocks = BLOCKS.map((bk, i) => { const m = new THREE.MeshLambertMaterial({ color: i === 1 ? SAF : '#5B8DB8' }), b = P.box(0.34, 0.14 + i * 0.03, 0.28, '#fff', { r: 0.03, material: m }); b.position.set(-1.9 + i * 0.5, 0, 0.42); S.add(b); return m; });
    /* the model takes the blocks; a listen pipe brings change notices to the client */
    const model = P.robot('#3D6BD6', { scale: 0.62 }); model.position.set(1.0, 0, 0.3); S.add(model);
    const listen = P.pipe([V(0.5, 0.2, -0.55), V(1.1, 0.26, -0.4), V(1.0, 0.3, 0.1)], GOOD, { r: 0.03, n: 4 }); S.add(listen);
    const omit = P.lamp(GOOD, { h: 0.16, r: 0.08 }); omit.position.set(1.55, 0, 0.3); S.add(omit);
    S.add(P.keep(-2.5, 1.75, 0.75, -0.85, 0.65));
    const parts = [walker, model, listen];

    let R = null;
    function draw() {
      R = run(st);
      PAGES.forEach((p, i) => pages[i].userData.set({ fill: i < R.pagesRead ? [GOOD, GOOD] : [BAD, BAD] }));
      cursors[0].userData.set({ color: GOOD, on: true }); cursors[1].userData.set({ color: st.keyCheck ? SAF : BAD, on: true });
      walker.position.x = X(R.pagesRead - 1);
      blocks[1].color.set(st.audience ? SAF : BAD);
      listen.userData.set({ on: !!st.listen, color: GOOD, pipe: st.listen ? '#B9B3A6' : '#E07A5F' });
      omit.userData.set({ color: st.omit ? GOOD : BAD, on: true });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Page until nextCursor is absent', short: 'Key check', get: () => st.keyCheck, set: v => set({ keyCheck: !!v }) },
      { type: 'toggle', label: 'Route content by audience', short: 'Audience', get: () => st.audience, set: v => set({ audience: !!v }) },
      { type: 'toggle', label: 'Listen for tools list changes', short: 'Listen', get: () => st.listen, set: v => set({ listen: !!v }) },
      { type: 'toggle', label: 'Read a missing isError as success', short: 'isError absent', get: () => st.omit, set: v => set({ omit: !!v }) },
    ];
    const readouts = [
      { label: 'Tools listed', get: () => ({ v: `${R.toolsSeen} of 6`, sub: `${R.pagesRead} pages read`, good: R.toolsSeen === 6, bad: R.toolsSeen < 6 }) },
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'in the client', good: R.ok, bad: !R.ok }) },
    ];
    const labels = [
      { name: 'p', t: 'Three pages', d: 'Red: never read', icon: 'book', atV: V(-2.42, 0.2, -0.55) },
      { name: 't', t: 'The model', d: 'Takes what it is meant to see', icon: 'eye', atV: V(1.22, 0.3, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Stop on an empty cursor', hint: '"" is a legal cursor', on: () => set({ ...D0, keyCheck: false }), off: reset },
      { label: 'Paste a user-only image into the model', hint: 'audience: user', on: () => set({ ...D0, audience: false }), off: reset },
      { label: 'Never open a listen stream', hint: 'listChanged needs a listener', on: () => set({ ...D0, listen: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>The client reads all three pages, stopping only when nextCursor is absent (the empty string on page 2 is a real cursor), keeps the user-only badge out of the model\'s context, reads a result without isError as success and re-lists when list_changed arrives on its listen stream.</b>' };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Three pages', home: true, say: 'The server lists six tools, two per page, each page pointing to the next with an opaque cursor.', act: m => m.set({ keyCheck: true, audience: true, listen: true, omit: true }) },
    { t: 'An empty cursor', home: true, say: 'Page two ends with an empty string. That is a real cursor, so a truthy check stops too soon.', act: m => m.set({ keyCheck: false, audience: true, listen: true, omit: true }) },
    { t: 'Absent means done', home: true, say: 'Only when the next cursor key is missing has the client reached the end.', act: m => m.set({ keyCheck: true, audience: true, listen: true, omit: true }) },
    { t: 'Five block types', home: true, say: 'Results carry text, images, audio, resource links or embedded resources.', act: m => m.set({ keyCheck: true, audience: false, listen: true, omit: true }) },
    { t: 'Audience', home: true, say: 'A badge marked for the user stays out of the model\'s context.', act: m => m.set({ keyCheck: true, audience: true, listen: true, omit: true }) },
    { t: 'List changes', home: true, say: 'A listen stream brings list changed notifications, and the client lists again.', act: m => m.set({ keyCheck: true, audience: true, listen: true, omit: true }) },
  ],
  check: [
    { q: 'A page ends with nextCursor "". Is the list finished?', options: ['No: an empty string is a legal cursor', 'Yes', 'Only on stdio'], answer: 0, why: 'Only an absent key ends it.', hint: 'Try Stop on an empty cursor.' },
    { q: 'An image block is annotated audience "user". What should the host do?', options: ['Show it to the user, keep it out of the model\'s context', 'Send it to the model', 'Drop it'], answer: 0, why: 'audience steers where content goes.', hint: 'Try Paste a user-only image into the model.' },
    { q: 'How does a client hear that the tool set changed?', options: ['notifications/tools/list_changed on a subscriptions/listen stream', 'By polling every second', 'Through the session'], answer: 0, why: 'Open a listen stream with toolsListChanged.', hint: 'Try Never open a listen stream.' },
  ],
  practice: [
    { q: 'A CallToolResult has no isError field. What does that mean?', options: ['The call succeeded', 'The call failed', 'The result is invalid', 'It is still running'], answer: 0, why: 'Only true marks a problem.' },
    { q: 'Which block points at a resource instead of inlining it?', options: ['resource_link', 'resource', 'text', 'image'], answer: 0, why: 'A uri and name, useful for large content.' },
    { q: 'A client sends a cursor the server does not recognise. Which error?', options: ['-32602', '-32601', '-32603', '-32700'], answer: 0, why: 'Invalid params.' },
    { q: 'Who decides the page size for tools/list?', options: ['The server', 'The client', 'The model', 'The specification fixes it'], answer: 0, why: 'Pagination is the server\'s detail.' },
    { q: 'What is the first message on a subscriptions/listen stream?', options: ['notifications/subscriptions/acknowledged', 'notifications/tools/list_changed', 'A result', 'ping'], answer: 0, why: 'It echoes what the server will honour.' },
    { q: 'Which fields do image and audio blocks carry?', options: ['data (base64) and mimeType', 'uri and name', 'text only', 'blob and size'], answer: 0, why: 'Binary content inline.' },
  ],
  terms: [
    ['nextCursor', 'An opaque string for the next page; absent at the end.'],
    ['CallToolResult', 'content, optional structuredContent, optional isError.'],
    ['Content block', 'text, image, audio, resource_link or resource.'],
    ['audience', 'A block annotation: user or assistant.'],
    ['listChanged', 'A capability promising list_changed notifications.'],
    ['subscriptions/listen', 'The stream that carries list and resource changes.'],
  ],
  deeper: '<p><b>Two kinds of annotation.</b> Content annotations (audience, priority, lastModified) describe one block; tool annotations (readOnlyHint and the rest) describe the tool.</p><p><b>About this machine.</b> The studio and tools are invented.</p>',
  code: {
    title: 'Page until the key is gone',
    note: 'Written for this lesson.',
    text: `
def list_all_tools(client):
    tools, cursor = [], None
    while True:
        params = {} if cursor is None else {"cursor": cursor}
        page = client.request("tools/list", params)
        tools += page["tools"]
        if "nextCursor" not in page:      # not: if not page.get("nextCursor")
            return tools                   # "" is a legal cursor
        cursor = page["nextCursor"]

def for_model(result):
    return [b for b in result["content"]
            if "assistant" in b.get("annotations", {}).get("audience", ["user", "assistant"])]
`,
  },
};
