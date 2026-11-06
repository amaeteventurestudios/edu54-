// Capstone: a stateless MCP server with a registry and governance (phase 19, capstone 13). A Kigali health ministry publishes a clinic-stock tool. Three server replicas behind a balancer, a registry entry, contracts, reliability and approval.
// Stateless replicas survive a restart and scale; state in memory doesn't. The registry holds a signed version; an unsigned or changed tool is blocked. Counts come from the small rules below.
function run(o) {
  const lost = o.state === 'memory' ? o.kill ? 40 : 0 : 0;
  const reachable = o.registry;
  const rug = o.change && !o.pin;
  const denied = o.scope ? 0 : 3;
  const dup = o.retry && !o.key ? 5 : 0;
  return { lost, reachable, rug, denied, dup, ok: !lost && reachable && !rug && !denied && !dup };
}

export default {
  slug: 'mcp-server-with-registry',
  title: 'Capstone: an MCP server a whole ministry can trust',
  description: 'One tool, many clients, real stakes. Build the stateless server, the registry entry and the rules around it.',
  overview: 'A tool on a laptop is a demo. A tool a whole organisation depends on needs a server, a registry and rules. Keep the server stateless, so replicas can restart and scale, and a request can land on any of them. Publish to a registry, so clients find one signed version and not a copy of a copy. Pin versions, as a changed description is an attack path. Scope each token to what a client may do. Make writes safe to retry. This capstone builds all that around one clinic-stock tool for a health ministry in Kigali, joining the MCP lessons into one working system.',
  keywords: ['MCP', 'MCP registry', 'stateless server', 'tool governance', 'OAuth scopes', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { state: 'store', kill: true, registry: true, pin: true, change: false, scope: true, retry: true, key: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', BLUE = '#5B8DB8', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const clients = [-0.5, 0, 0.5].map((z, i) => { const r = add(P.robot(['#7B6FA8', '#3E9B9B', '#A87A4F'][i], { scale: 0.42 })); r.position.set(-2.2, 0.03, z); return r; });
    const lb = P.box(0.3, 0.6, 1.1, '#6B6E7E', { r: 0.03 }); lb.position.set(-1.3, 0.03, 0); S.add(lb);
    const ZS = [-0.5, 0, 0.5], rep = ZS.map(z => { const m = new S.THREE.MeshLambertMaterial({ color: BLUE }), b = P.box(0.6, 0.4, 0.34, '#fff', { r: 0.04, material: m }); b.position.set(-0.3, 0.03, z); S.add(b); return { b, m }; });
    const store = P.cyl(0.3, 0.45, '#2C2D31'); store.position.set(0.6, 0.03, 0); S.add(store);
    const shelf = add(P.shelf(3, { cell: 0.3, d: 0.36, lh: 0.32 })); shelf.position.set(1.7, 0.03, -0.3);
    const seal = add(P.lamp(GOOD, { h: 0.4, r: 0.1 })); seal.position.set(1.7, 0.03, 0.4);
    S.add(P.keep(-2.45, 2.45, 0.9, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      rep.forEach((r, i) => { r.b.visible = !(st.kill && i === 1); r.m.color.set(st.state === 'memory' && st.kill ? BAD : BLUE); });
      store.visible = st.state === 'store';
      shelf.userData.set({ fill: st.registry ? [GOOD, R.rug ? RED : GOOD, null] : [null, null, null] });
      seal.userData.set({ color: R.ok ? '#3E9B5F' : '#D9483B', on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s, q) => ({ type: 'toggle', label: l, short: s, quick: q, get: () => st[k], set: v => set({ [k]: !!v }) });
    const SK = ['store', 'memory'];
    const controls = [
      { type: 'buttons', label: 'Session state lives in', options: ['A shared store', 'Server memory'], get: () => SK.indexOf(st.state), act: i => set({ state: SK[i] }) },
      tg('kill', 'A replica restarts', 'Restart'), tg('registry', 'Published in the registry', 'Registry'), tg('pin', 'Clients pin a signed version', 'Pinned'),
      tg('change', 'A tool description changes overnight', 'Changed', false), tg('scope', 'Tokens are scoped per client', 'Scopes', false), tg('key', 'Writes carry an idempotency key', 'Key', false),
    ];
    const readouts = [
      { label: 'Sessions lost', get: () => ({ v: `${R.lost}`, sub: 'on a restart', good: !R.lost, bad: !!R.lost }) },
      { label: 'Version clients run', get: () => ({ v: R.rug ? 'changed, unseen' : st.registry ? 'signed' : 'unknown', bad: R.rug || !st.registry, good: st.registry && !R.rug }) },
      { label: 'Over-broad calls', get: () => ({ v: `${R.denied}`, sub: `${R.dup} double stock orders`, good: !R.denied && !R.dup, bad: R.denied > 0 || R.dup > 0 }) },
    ];
    const labels = [
      { name: 'r', t: 'Clients, balancer, replicas', d: 'Any replica can answer', icon: 'link', atV: V(-2.4, 0.2, 0) },
      { name: 's', t: 'The registry', d: 'One signed version', icon: 'check', atV: V(2.25, 0.2, -0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep sessions in memory', hint: 'a restart ends them', on: () => set({ ...D0, state: 'memory' }), off: reset },
      { label: 'Trust whatever the server says today', hint: 'a description changed', on: () => set({ ...D0, change: true, pin: false }), off: reset },
      { label: 'One token for everybody', hint: 'read and write alike', on: () => set({ ...D0, scope: false }), off: reset },
      { label: 'Retry stock orders with no key', hint: 'ordered twice', on: () => set({ ...D0, key: false }), off: reset },
    ];
    function status() {
      if (R.lost) return { ok: false, msg: `<b>${R.lost} sessions ended with one restart.</b> State in server memory ties each client to one process. Keep it in a shared store, and any replica can answer.` };
      if (!st.registry) return { ok: false, msg: '<b>Each clinic pasted its own server address.</b> Nobody knows who runs what. A registry gives one place to find, and to retire, a tool.' };
      if (R.rug) return { ok: false, msg: '<b>A tool description changed overnight, and every client now obeys it.</b> The description is read by the model, so it is part of your attack surface. Pin a signed version.' };
      if (R.denied) return { ok: false, msg: `<b>${R.denied} clients could write stock levels they only needed to read.</b> Scope each token to its job.` };
      if (R.dup) return { ok: false, msg: `<b>${R.dup} orders placed twice.</b> A timed-out call was retried. Reliability lives in the contract: make writes safe to repeat.` };
      return { ok: true, msg: '<b>Any replica answers, clients run one signed version, and each token does one job.</b> That is the difference between a tool and a service.' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); clients.forEach(r => r.userData.set({ busy: true })); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'More than a demo', home: true, say: 'A health ministry in Kigali wants one clinic-stock tool for every district. Three replicas sit behind a balancer.', act: m => m.set({ state: 'store', kill: false, registry: true, pin: true, change: false, scope: true, key: true }) },
    { t: 'Stateless', home: true, say: 'A replica restarts. With state in a shared store, nobody notices.', act: m => m.set({ state: 'store', kill: true, registry: true, pin: true, change: false, scope: true, key: true }) },
    { t: 'In memory', home: true, say: 'Keep sessions in server memory, and that same restart ends them all.', act: m => m.set({ state: 'memory', kill: true, registry: true, pin: true, change: false, scope: true, key: true }) },
    { t: 'The registry', home: true, say: 'Publish one signed version. Clients find it there, and pin it.', act: m => m.set({ state: 'store', kill: false, registry: true, pin: false, change: true, scope: true, key: true }) },
    { t: 'Scopes', home: true, say: 'A district reader shouldn\'t be able to write stock levels. Scope each token.', act: m => m.set({ state: 'store', kill: false, registry: true, pin: true, change: false, scope: false, key: true }) },
    { t: 'Safe to repeat', home: true, say: 'A timeout causes a retry. With a key, the order counts once. That is a service.', act: m => m.set({ state: 'store', kill: true, registry: true, pin: true, change: false, scope: true, key: true }) },
  ],
  check: [
    { q: 'Why keep an MCP server stateless?', options: ['Any replica can answer, and restarts lose nothing', 'It uses fewer tools', 'It is required by JSON'], answer: 0, why: 'State belongs in a shared store.', hint: 'Try Keep sessions in memory.' },
    { q: 'Why pin a signed tool version?', options: ['A changed description can steer the model', 'It is faster', 'It saves tokens'], answer: 0, why: 'Descriptions are read by the model.', hint: 'Try Trust whatever the server says today.' },
    { q: 'What does a registry give?', options: ['One place to find and retire tools', 'More GPUs', 'A chat interface'], answer: 0, why: 'Otherwise copies spread.', hint: 'Switch off Registry.' },
  ],
  terms: [['Stateless server', 'Keeps nothing between requests in memory.'], ['Replica', 'One running copy of a server.'], ['Registry', 'A catalogue of published tools.'], ['Pinning', 'Fixing the version a client uses.'], ['Scope', 'What a token may do.']],
  deeper: '<p><b>Tool contracts.</b> The MCP lessons cover annotations, cancellation and flow control, which all come in here.</p><p><b>Audit.</b> Log who called what, with what scope.</p><p><b>Counts</b> here are illustrative.</p>',
  code: {
    title: 'A stateless handler',
    note: 'A sketch of the course\'s capstone (code/main.py).',
    text: `
@mcp.tool(annotations={"readOnlyHint": False, "idempotentHint": True})
def order_stock(clinic: str, item: str, qty: int, key: str, ctx: Context):
    require_scope(ctx.token, "stock:write")
    if store.seen(key):
        return store.result(key)
    return store.save(key, place_order(clinic, item, qty))
`,
  },
};
