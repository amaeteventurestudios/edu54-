// Exam prep, MCP Apps: an invented water utility in Kisumu offers a usage_dashboard tool whose _meta.ui.resourceUri points at a ui:// resource.
// With io.modelcontextprotocol/ui declared, the host reads it with resources/read (mimeType text/html;profile=mcp-app), builds a Content
// Security Policy only from the declared domains (connect-src 'none' when csp is omitted), may honour requested permissions, and renders it in
// a sandboxed iframe. The app talks to the host over a postMessage JSON-RPC dialect (ui/initialize, unrelated to the removed core initialize)
// and may call only tools whose visibility includes "app", through the host and its consent. Without the extension, the tool returns text.
// Illustrative.
function run(o) {
  const issues = [];
  if (!o.mime) issues.push('the host rendered a ui:// resource whose mimeType was plain text/html; only text/html;profile=mcp-app is an app');
  if (!o.csp) issues.push('the host let the app connect to tracker.example, a domain the resource never declared; build the CSP only from declared domains');
  if (!o.vis) issues.push('the app called reset_meter directly, though its visibility is ["model"] only; the host must reject an app call to a tool without "app"');
  if (!o.sandbox) issues.push('the view ran in the host page instead of a sandboxed iframe, so it could read the host\'s cookies and DOM');
  if (!o.text) issues.push('a host without the ui extension got an empty result; the tool must still return meaningful text');
  return { issues, ok: issues.length === 0 };
}

export default {
  slug: 'exam-mcp-mcp-apps',
  title: 'Exam prep, MCP: MCP Apps',
  description: 'A usage dashboard tool points at a ui:// view that the host renders in a sandbox. Keep the walls up, the domains declared and plain text as the fallback.',
  overview: 'MCP Apps is the official extension io.modelcontextprotocol/ui (SEP-1865), negotiated per request like every extension: the client declares it in clientCapabilities.extensions and the server in server/discover. A UI-capable tool carries _meta.ui.resourceUri, pointing at a ui:// resource; this is static per-tool metadata in the tools/list entry, so a host can see the binding before any call. _meta.ui can also carry visibility, defaulting to ["model", "app"]: a tool visible to "model" is one the agent can see and call; one visible to "app" may be called by the rendered app through the bridge. The host must not list a tool to the agent when it lacks "model", and must reject an app\'s tools/call for a tool lacking "app". The host fetches the view with an ordinary resources/read, and the content must carry mimeType text/html;profile=mcp-app; that profile marks it as an app rather than any HTML page. The resource\'s own _meta.ui governs rendering. csp is an object of optional origin lists: connectDomains for fetch, XHR and WebSocket; resourceDomains for scripts, styles, images and fonts; frameDomains for nested frames; baseUriDomains for the base URI. The host must build its Content Security Policy from the declared domains, must not allow undeclared ones, may restrict further, and must apply a restrictive default (connect-src \'none\') when csp is omitted. permissions requests camera, microphone, geolocation or clipboardWrite; a host may honour them, and an app should not assume they were granted. The view runs in a sandboxed iframe (web hosts wrap it in a sandbox proxy on a different origin), so it cannot read the host\'s cookies, storage or DOM. App and host talk over a postMessage JSON-RPC dialect with ui/ methods, starting with the app\'s ui/initialize, which is unrelated to the removed core initialize; an app\'s tool call goes through the host as an ordinary tools/call with a fresh id, after the same consent as any other. Tools still return meaningful text for hosts without the extension. The utility is invented.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'mcp apps', 'ui extension', 'csp', 'sandboxed iframe', 'visibility', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.15], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { mime: true, csp: true, vis: true, sandbox: true, text: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6', BLUE = '#5B8DB8';
    /* the tool on the left, wired to the view it points at */
    const tool = P.box(0.5, 0.34, 0.44, '#3D6BD6', { r: 0.05 }); tool.position.set(-2.1, 0, -0.5); S.add(tool);
    S.add(P.rod(V(-1.85, 0.17, -0.5), V(-1.05, 0.17, -0.5), 0.016, '#B9B3A6'));
    /* the view: a chart of bars inside a glass sandbox, its colour set by its mimeType */
    const glass = P.tank(1.1, 0.5, 0.6, BLUE); glass.position.set(-0.5, 0.05, -0.5); S.add(glass);
    const barM = new THREE.MeshLambertMaterial({ color: BLUE });
    [0.18, 0.3, 0.24, 0.36, 0.28].forEach((h, i) => { const b = P.box(0.12, h, 0.12, '#fff', { r: 0.01, material: barM }); b.position.set(-0.8 + i * 0.16, 0.05, -0.5); S.add(b); });
    /* the host's cookies beside it; the view reaches them without a sandbox */
    const cookies = P.jar(0.17, 0.4, { max: 8 }); cookies.position.set(1.0, 0, -0.9); S.add(cookies); cookies.userData.set({ n: 8 });
    const steal = P.pipe([V(0.02, 0.3, -0.7), V(0.5, 0.35, -0.85), V(0.82, 0.3, -0.9)], BAD, { r: 0.03, n: 3 }); S.add(steal);
    /* the allowed domain, and a tracker it must not reach */
    const api = P.box(0.42, 0.26, 0.34, GOOD, { r: 0.04 }), tracker = P.box(0.42, 0.26, 0.34, BAD, { r: 0.04 }); api.position.set(1.0, 0, -0.35); tracker.position.set(1.0, 0, 0.2); S.add(api, tracker);
    const toApi = P.pipe([V(0.02, 0.2, -0.45), V(0.4, 0.2, -0.4), V(0.78, 0.15, -0.35)], GOOD, { r: 0.03, n: 3 }), toTr = P.pipe([V(0.02, 0.2, -0.3), V(0.4, 0.2, 0), V(0.78, 0.15, 0.2)], BAD, { r: 0.03, n: 3 }); S.add(toApi, toTr);
    /* the model-only lever beside the app, and the text fallback */
    const lever = P.lamp(GOOD, { h: 0.2, r: 0.09 }); lever.position.set(-0.85, 0, 0.2); S.add(lever);
    const txtM = new THREE.MeshLambertMaterial({ color: GOOD }), txt = P.box(0.5, 0.08, 0.34, '#fff', { r: 0.03, material: txtM }); txt.position.set(-2.1, 0, 0.2); S.add(txt);
    S.add(P.keep(-2.4, 1.3, 0.75, -1.15, 0.5));
    const parts = [glass, steal, toApi, toTr];

    let R = null;
    function draw() {
      R = run(st);
      barM.color.set(st.mime ? BLUE : BAD);
      glass.userData.set({ level: 0, color: BLUE }); glass.visible = !!st.sandbox;
      steal.visible = !st.sandbox;
      toTr.visible = !st.csp;
      lever.userData.set({ color: st.vis ? GOOD : BAD, on: true });
      txtM.color.set(st.text ? GOOD : BAD);
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const tog = (k, label, short) => ({ type: 'toggle', label, short, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tog('mime', 'Require text/html;profile=mcp-app', 'Mime type'),
      tog('csp', 'CSP only from declared domains', 'CSP'),
      tog('vis', 'Enforce tool visibility for app calls', 'Visibility'),
      tog('sandbox', 'Render in a sandboxed iframe', 'Sandbox'),
      tog('text', 'Return text for hosts without ui', 'Text fallback'),
    ];
    const readouts = [
      { label: 'Problems', get: () => ({ v: String(R.issues.length), sub: 'in the app path', good: R.ok, bad: !R.ok }) },
      { label: 'connect-src', get: () => ({ v: st.csp ? 'declared only' : '+ undeclared', sub: 'host CSP', good: st.csp, bad: !st.csp }) },
    ];
    const labels = [
      { name: 'a', t: 'Tool and its view', d: 'It points at a ui:// resource', icon: 'link', atV: V(-2.36, 0.2, -0.5) },
      { name: 't', t: 'The domains', d: 'Red: reached but never declared', icon: 'shield', atV: V(1.22, 0.15, -0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Allow an undeclared domain', hint: 'CSP from declarations only', on: () => set({ ...D0, csp: false }), off: reset },
      { label: 'Let the app call a model-only tool', hint: 'visibility ["model"]', on: () => set({ ...D0, vis: false }), off: reset },
      { label: 'Render outside the sandbox', hint: 'the app could read the host', on: () => set({ ...D0, sandbox: false }), off: reset },
    ];
    function status() {
      if (R.ok) return { ok: true, msg: '<b>The host reads ui://water/usage as text/html;profile=mcp-app, builds a CSP that allows only api.water.example, renders it in a sandboxed iframe, refuses the app\'s attempt to call the model-only reset_meter, and a host without the extension gets the text summary.</b>' };
      const t = R.issues.join('; ');
      return { ok: false, msg: `<b>${t.charAt(0).toUpperCase() + t.slice(1)}.</b>` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A tool with a view', home: true, say: 'The dashboard tool points at a UI resource, visible in the tool list before any call.', act: m => m.set({ mime: true, csp: true, vis: true, sandbox: true, text: true }) },
    { t: 'An ordinary read', home: true, say: 'The host fetches the view with a normal resource read. The mime type marks it as an app.', act: m => m.set({ mime: true, csp: true, vis: true, sandbox: true, text: true }) },
    { t: 'Declared domains only', home: true, say: 'The host builds its security policy only from the domains the resource declares.', act: m => m.set({ mime: true, csp: true, vis: true, sandbox: true, text: true }) },
    { t: 'A sandbox', home: true, say: 'The view runs in a sandboxed frame. It cannot read the host page.', act: m => m.set({ mime: true, csp: true, vis: true, sandbox: true, text: true }) },
    { t: 'Who may call', home: true, say: 'The app may call only tools marked for the app, through the host and its consent.', act: m => m.set({ mime: true, csp: true, vis: true, sandbox: true, text: true }) },
    { t: 'Still text', home: true, say: 'A host without the extension still gets a useful text answer.', act: m => m.set({ mime: true, csp: true, vis: true, sandbox: true, text: true }) },
  ],
  check: [
    { q: 'The resource declares only api.water.example. May the app connect to tracker.example?', options: ['No: the CSP allows only declared domains', 'Yes', 'Only with permissions'], answer: 0, why: 'Hosts may restrict further, never widen.', hint: 'Try Allow an undeclared domain.' },
    { q: 'A tool has visibility ["model"]. May the rendered app call it?', options: ['No: the host must reject it', 'Yes', 'Only with a new id'], answer: 0, why: 'App calls need "app" in visibility.', hint: 'Try Let the app call a model-only tool.' },
    { q: 'Where does the app view run?', options: ['In a sandboxed iframe', 'Inline in the host page', 'In the server'], answer: 0, why: 'It cannot read host cookies or DOM.', hint: 'Try Render outside the sandbox.' },
  ],
  practice: [
    { q: 'What mimeType must an MCP App resource carry?', options: ['text/html;profile=mcp-app', 'text/html', 'application/json', 'image/svg+xml'], answer: 0, why: 'The profile marks it as an app.' },
    { q: 'A UI resource omits csp. What policy applies?', options: ['A restrictive default, connect-src \'none\'', 'Allow everything', 'The server decides at run time', 'No policy'], answer: 0, why: 'Default deny.' },
    { q: 'Is the app\'s ui/initialize the removed core initialize?', options: ['No: it is part of the app-host dialect', 'Yes', 'It reopens a session', 'It replaces server/discover'], answer: 0, why: 'Unrelated to the core protocol.' },
    { q: 'What is visibility\'s default?', options: ['["model", "app"]', '["model"]', '["app"]', '[]'], answer: 0, why: 'When the field is absent.' },
    { q: 'An app requests the camera permission. Should it assume it has it?', options: ['No: a host may or may not honour it', 'Yes', 'Only on mobile', 'Only with consent'], answer: 0, why: 'Degrade like any web page.' },
    { q: 'How does an app\'s tool call reach the server?', options: ['Through the host as an ordinary tools/call after consent', 'Directly from the iframe', 'Through a session', 'It cannot'], answer: 0, why: 'With a fresh id and full _meta.' },
  ],
  terms: [
    ['MCP Apps', 'The io.modelcontextprotocol/ui extension for interactive views.'],
    ['ui:// resource', 'The app document a tool points at.'],
    ['profile=mcp-app', 'The mime parameter that marks an app.'],
    ['csp', 'Declared origin lists the host turns into a policy.'],
    ['visibility', '"model", "app" or both: who may call a tool.'],
    ['Sandboxed iframe', 'The isolated frame the view runs in.'],
  ],
  deeper: '<p><b>Sandbox proxy.</b> Web hosts wrap the view in a sandbox proxy on a different origin, adding a second layer of isolation.</p><p><b>About this machine.</b> The utility and dashboard are invented.</p>',
  code: {
    title: 'Build the policy from declarations',
    note: 'Written for this lesson.',
    text: `
def render(tool, read_result, host_policy):
    item = read_result["contents"][0]
    if item["mimeType"] != "text/html;profile=mcp-app":
        return None                                       # not an app
    ui = item.get("_meta", {}).get("ui", {})
    csp = ui.get("csp")
    connect = csp.get("connectDomains", []) if csp else []
    policy = {"connect-src": [d for d in connect if host_policy.allows(d)] or ["'none'"]}
    return sandboxed_iframe(item["text"], policy, permissions=host_policy.grant(ui.get("permissions", {})))

def app_tools_call(tool, args):
    if "app" not in tool.get("_meta", {}).get("ui", {}).get("visibility", ["model", "app"]):
        raise PermissionError("tool not visible to apps")
    return consent_then_call(tool["name"], args)          # a normal tools/call, new id
`,
  },
};
