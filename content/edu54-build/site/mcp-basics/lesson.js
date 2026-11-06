// MCP basics: a chat app (the host) runs one client per server. Envelopes of JSON-RPC travel down the pipes:
// initialize, list the tools, then call one when the user asks. Break it: a version mismatch, a server that crashes.
const SERVERS = [
  { name: 'Files', c: '#3D6BD6', tools: ['read_file', 'list_folder'] },
  { name: 'Calendar', c: '#3E9B5F', tools: ['list_events', 'add_event'] },
  { name: 'Weather', c: '#EE7434', tools: ['get_forecast'] },
];
const ASKS = [
  { q: 'What\'s on my calendar tomorrow?', s: 1, tool: 'list_events', args: { date: 'tomorrow' }, result: '9:00 Standup · 14:00 Dentist', say: 'Tomorrow you have standup at 9 and the dentist at 2.' },
  { q: 'Read my notes.txt', s: 0, tool: 'read_file', args: { path: 'notes.txt' }, result: '"Buy airtime. Call Tunde."', say: 'Your notes say: buy airtime, and call Tunde.' },
  { q: 'Will it rain in Accra?', s: 2, tool: 'get_forecast', args: { city: 'Accra' }, result: 'Showers after 3 pm', say: 'Yes: showers are expected in Accra after 3 pm. (Example data.)' },
];

export default {
  slug: 'mcp-basics',
  title: 'MCP: plugging in tools',
  description: 'See how an AI app plugs into files, calendars and weather through one standard socket. Envelopes of JSON travel down the pipes: hello, what can you do, please do this. Then break the handshake.',
  overview: 'Every app used to wire up its tools its own way. The Model Context Protocol (MCP) is a shared plug: any app that speaks it can use any server that speaks it. The app says hello, asks each server what tools it has, and calls them when the model needs one. All of it travels as small JSON messages.',
  keywords: ['model context protocol explained', 'mcp server', 'mcp client', 'json-rpc', 'ai tools standard'],
  orient: 'landscape',
  view: { target: [0, 0.7, 0], dir: [0.35, 1.0, 1.25], half: 3.2, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { ver: true, crash: false, ready: [false, false, false], tools: [false, false, false], queue: [], cur: null, t: 0, ask: null, answer: '', log: [] };
    /* ---------- the host and its clients ---------- */
    const host = P.box(1.7, 1.05, 2.6, C.ink, { r: 0.16 }); host.position.set(-2.7, 0, 0); S.add(host);
    const screen = P.box(1.3, 0.04, 2.1, '#2B2F45', { r: 0.08 }); screen.position.set(-2.7, 1.05, 0); S.add(screen);
    const ht = S.text('CHAT APP (HOST)', { size: 0.13, face: 'front', weight: 800, color: '#FFFFFF' }); ht.position.set(-2.7, 0.8, 1.31); S.add(ht);
    // the host's screen shows the chat: which servers are plugged in, then the last question and answer
    const scr = S.text('', { size: 0.085, weight: 600, color: '#E9ECF8', align: 'left', maxW: 1.18, maxH: 1.95, face: 'up' }); scr.position.set(-2.7, 1.105, 0); S.add(scr);
    const clients = SERVERS.map((s, i) => {
      const z = -1.4 + i * 1.4, c = P.box(0.45, 0.42, 0.55, '#F7F5EE', { r: 0.06 }); c.position.set(-1.62, 0.3, z); S.add(c);
      const t = S.text('client', { size: 0.09, weight: 750, color: '#151827', maxW: 0.4 }); t.position.set(-1.62, 0.73, z); S.add(t);
      const f = S.text(s.name.toLowerCase(), { size: 0.075, weight: 650, color: '#151827', face: 'front', maxW: 0.4 }); f.position.set(-1.62, 0.36, z + 0.285); S.add(f);
      return c;
    });
    /* ---------- the servers ---------- */
    const servers = SERVERS.map((s, i) => {
      const g = new THREE.Group(); g.position.set(2.5, 0, -1.4 + i * 1.4); S.add(g);
      const b = P.box(1.3, 0.8, 0.95, s.c, { r: 0.12 }); b.material = new THREE.MeshLambertMaterial({ color: s.c }); g.add(b);
      const t = S.text(s.name.toUpperCase(), { size: 0.15, face: 'front', weight: 800, color: '#FFFFFF' }); t.position.set(0, 0.55, 0.49); g.add(t);
      // the name on top as well as the front, so it reads from any angle
      const top = S.text(s.name.toUpperCase(), { size: 0.12, face: 'up', weight: 800, color: '#FFFFFF', maxW: 1.1 }); top.position.set(0, 0.81, -0.3); g.add(top);
      const lamp = P.ball(0.07, C.grey); lamp.material = new THREE.MeshLambertMaterial({ color: C.grey }); lamp.position.set(0.53, 0.84, -0.3); g.add(lamp);
      const tt = S.text('', { size: 0.085, weight: 600, color: '#FFFFFF', font: '"JetBrains Mono", monospace', face: 'up', maxW: 1.1, maxH: 0.42 }); tt.position.set(0, 0.81, 0.15); g.add(tt);
      return { g, b, lamp, tt };
    });
    const pipes = SERVERS.map((s, i) => { const r = P.rod(V(-1.38, 0.5, -1.4 + i * 1.4), V(1.85, 0.5, -1.4 + i * 1.4), 0.05, '#B9B6C6'); S.add(r); return r; });
    /* ---------- the envelope ---------- */
    const env = new THREE.Group(); env.userData.noFit = true; S.add(env);
    const envB = P.box(0.9, 0.05, 0.55, '#FFFFFF', { r: 0.04 }); env.add(envB);
    const envT = S.text('', { size: 0.075, weight: 600, color: '#151827', font: '"JetBrains Mono", monospace', align: 'left', maxW: 0.84, maxH: 0.5 }); envT.position.y = 0.06; env.add(envT);
    env.visible = false;
    const askT = S.text('', { size: 0.15, face: 'cam', weight: 700, bg: '#FFFFFF', color: C.ink, order: 6 }); askT.position.set(-2.7, 1.9, 0); askT.userData.noFit = true; S.add(askT);
    const ansT = S.text('', { size: 0.14, face: 'cam', weight: 600, bg: '#FFF6DA', color: C.ink, order: 6, align: 'left' }); ansT.position.set(-2.7, 2.55, 0); ansT.userData.noFit = true; S.add(ansT);
    const wrap = (s, n = 34) => { const out = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } out.push(line.trim()); return out.join('\n'); };
    /* ---------- messages ---------- */
    let id = 0;
    const send = (i, dir, json, then) => st.queue.push({ i, dir, json, then });
    function connect(i) {
      const n = ++id;
      send(i, 1, `{"jsonrpc":"2.0","id":${n},\n "method":"initialize",\n "params":{"protocolVersion":\n  "${st.ver ? '2025-06-18' : '1999-01-01'}"}}`, () => {
        if (!st.ver) { send(i, -1, `{"jsonrpc":"2.0","id":${n},\n "error":{"code":-32602,\n "message":"Unsupported\n protocol version"}}`, () => { st.log.push(`${SERVERS[i].name}: handshake failed`); }); return; }
        send(i, -1, `{"jsonrpc":"2.0","id":${n},\n "result":{"capabilities":\n  {"tools":{}}}}`, () => {
          st.ready[i] = true;
          const m = ++id;
          send(i, 1, `{"jsonrpc":"2.0","id":${m},\n "method":"tools/list"}`, () => send(i, -1, `{"jsonrpc":"2.0","id":${m},\n "result":{"tools":[\n  ${SERVERS[i].tools.map(t => `"${t}"`).join(', ')}]}}`, () => { st.tools[i] = true; }));
        });
      });
    }
    function ask(k) {
      const A = ASKS[k]; st.ask = k; st.answer = '';
      if (!st.tools[A.s]) { st.answer = `I can't reach the ${SERVERS[A.s].name} server, so I can't check.`; return; }
      const n = ++id;
      send(A.s, 1, `{"jsonrpc":"2.0","id":${n},\n "method":"tools/call",\n "params":{"name":"${A.tool}",\n  "arguments":${JSON.stringify(A.args)}}}`, () => {
        if (st.crash && A.s === 1) { send(A.s, -1, `{"jsonrpc":"2.0","id":${n},\n "error":{"code":-32603,\n "message":"Server crashed"}}`, () => { st.answer = 'The calendar server had an error, so I can\'t see your events right now.'; }); return; }
        send(A.s, -1, `{"jsonrpc":"2.0","id":${n},\n "result":{"content":[{"type":\n  "text","text":"${A.result.replace(/"/g, '\'')}"}]}}`, () => { st.answer = A.say; });
      });
    }
    const connectAll = () => { st.ready = [false, false, false]; st.tools = [false, false, false]; st.queue = []; st.cur = null; st.ask = null; st.answer = ''; st.log = []; SERVERS.forEach((_, i) => connect(i)); };
    function update(dt) {
      if (!st.cur && st.queue.length) { st.cur = st.queue.shift(); st.t = 0; envT.userData.set(st.cur.json); }
      const c = st.cur;
      env.visible = !!c;
      if (c) {
        st.t += dt * (S.reduced ? 3 : 1) * 0.75;
        const z = -1.4 + c.i * 1.4, a = V(-1.4, 0.62, z), b = V(1.85, 0.62, z), u = Math.min(1, st.t);
        env.position.copy(c.dir > 0 ? a.lerp(b, u) : b.lerp(a, u));
        envB.material = P.mat(/error/.test(c.json) ? '#FBD9D3' : c.dir > 0 ? '#FFFFFF' : '#E5F4EA');
        if (st.t >= 1.15) { st.cur = null; c.then?.(); S.sync(); }
      }
      servers.forEach((sv, i) => {
        const on = st.ready[i];
        sv.lamp.material.color.set(on ? C.green : st.log.some(l => l.startsWith(SERVERS[i].name)) ? C.red : C.grey);
        sv.b.material.emissive.set(c && c.i === i ? SERVERS[i].c : '#000000').multiplyScalar(0.25);
        sv.tt.userData.set(st.tools[i] ? SERVERS[i].tools.join('\n') : '');
        pipes[i].material = P.mat(on ? SERVERS[i].c : '#B9B6C6');
      });
      const rows = SERVERS.map((x, i) => `${st.tools[i] ? '●' : st.log.some(l => l.startsWith(x.name)) ? '✕' : '○'}  ${x.name}${st.tools[i] ? `: ${x.tools.length} tool${x.tools.length > 1 ? 's' : ''}` : st.ready[i] ? ': listing…' : st.log.some(l => l.startsWith(x.name)) ? ': failed' : ': connecting…'}`);
      const chat = st.ask != null ? ['', 'You:', wrap(ASKS[st.ask].q, 22), '', 'Assistant:', st.answer ? wrap(st.answer, 22) : '…'] : ['', 'Ask me something.'];
      scr.userData.set(['CHAT APP (HOST)', '', ...rows, ...chat].join('\n'));
      askT.visible = st.ask != null; if (st.ask != null) askT.userData.set(wrap(`“${ASKS[st.ask].q}”`, 30));
      ansT.visible = !!st.answer; if (st.answer) ansT.userData.set(wrap(st.answer, 32));
    }
    connectAll();
    const controls = [
      { type: 'button', label: 'Connect the servers', short: 'Connect', act: connectAll },
      { type: 'buttons', label: 'Ask', options: ASKS.map(a => a.q), get: () => st.ask ?? -1, act: i => ask(i) },
    ];
    const readouts = [
      { label: 'Servers ready', get: () => { const n = st.tools.filter(Boolean).length; return { v: `${n} / 3`, good: n === 3, bad: !st.ver }; } },
      { label: 'Tools found', get: () => ({ v: SERVERS.reduce((s, x, i) => s + (st.tools[i] ? x.tools.length : 0), 0) }) },
    ];
    const labels = [
      { name: 'host', t: 'The host', d: 'The chat app, with one client per server', icon: 'box', atV: V(-2.7, 1.1, -0.9) },
      { name: 'envelope', t: 'A JSON-RPC message', d: 'Method, id and parameters', icon: 'code', atV: V(0.25, 0.56, 0) },
      { name: 'servers', t: 'MCP servers', d: 'Each one offers a few tools', icon: 'spark', atV: V(2.5, 0.9, -1.4) },
    ];
    const breaks = [
      { label: 'Versions don\'t match', hint: 'The app asks for a protocol the servers don\'t speak', on: () => { st.ver = false; connectAll(); }, off: () => { st.ver = true; connectAll(); } },
      { label: 'The calendar server crashes', hint: 'Then ask about tomorrow', on: () => { st.crash = true; if (!st.tools[1]) connectAll(); setTimeout(() => ask(0), 50); }, off: () => { st.crash = false; } },
    ];
    function status() {
      if (!st.ver && !st.queue.length && !st.cur) return { ok: false, msg: `<b>No handshake, no tools.</b> The servers don't speak the version the app asked for, so they reply with an error and nothing is connected. Both sides must agree on a protocol version first.` };
      if (!st.ver) return { ok: false, msg: `<b>Versions don't match.</b> The app opens the handshake with a protocol version the servers don't speak. Watch: they answer with an error instead of their tools.` };
      if (st.crash && st.ask === 0 && st.answer) return { ok: false, msg: `<b>An error came back</b> instead of a result. A good host tells the user plainly, rather than letting the model guess what's on the calendar.` };
      if (st.cur) return { msg: `<b>${st.cur.dir > 0 ? 'App → server' : 'Server → app'}:</b> ${/initialize/.test(st.cur.json) ? 'hello, here is the protocol version I speak.' : /tools\/list/.test(st.cur.json) ? 'what tools do you have?' : /tools\/call/.test(st.cur.json) ? 'please run this tool with these inputs.' : /error/.test(st.cur.json) ? 'an error.' : /tools"/.test(st.cur.json) ? 'here are my tools.' : /capabilities/.test(st.cur.json) ? 'hello back, here is what I can do.' : 'here is the result.'}` };
      if (st.answer) return { ok: true, msg: `<b>Answered through MCP.</b> The model chose ${ASKS[st.ask].tool}, the client sent tools/call, and the server's result came back as text.` };
      return { msg: `<b>All three servers are plugged in.</b> The app knows their tools. Ask a question to see a tool called.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset: () => { st.ver = true; st.crash = false; connectAll(); }, connectAll, ask };
  },

  story: [
    { t: 'One plug for everything', home: true, say: 'An AI app often needs your files, your calendar, the weather. MCP is one standard plug for all of them.', act: m => m.connectAll() },
    { t: 'Host, client, server', focus: 'host', zoom: 1.3, say: 'The chat app is the host. Inside it runs one client for each server. Each server is a small program that offers a few tools.' },
    { t: 'Say hello', focus: 'envelope', zoom: 1.3, say: 'First, a handshake. The client sends initialize, with the protocol version it speaks. The server answers with what it can do.', wait: 4 },
    { t: 'What can you do?', home: true, say: 'Then the client asks tools list. Each server replies with its tool names and what inputs they take. Now the model knows what is available.', wait: 5 },
    { t: 'Call a tool', home: true, say: 'Ask about tomorrow. The model picks the calendar tool, the client sends tools call, and the result comes back as text for the model to read.', act: m => m.ask(0), wait: 6 },
    { t: 'Write once, plug anywhere', home: true, say: 'Because everyone speaks the same messages, a server written once works in any app that speaks MCP.' },
  ],
  check: [
    { q: 'What is MCP for?', options: ['A standard way for AI apps to connect to tools and data', 'A new language model', 'A kind of database'], answer: 0, why: 'One protocol, so any MCP app can use any MCP server.' },
    { q: 'What happens first when a client connects?', options: ['tools/call', 'An initialize handshake', 'The server shuts down'], answer: 1, why: 'Client and server agree on a protocol version and share capabilities before anything else.' },
    { q: 'How does the app learn which tools a server has?', options: ['It guesses', 'It sends tools/list', 'The user types them in'], answer: 1, why: 'tools/list returns each tool\'s name, description and input schema.' },
  ],
  terms: [
    ['Host', 'The AI app the user talks to.'],
    ['Client', 'The part of the host that talks to one server.'],
    ['Server', 'A program that offers tools, files or prompts over MCP.'],
    ['JSON-RPC', 'A simple message format: method, id, params; replies carry result or error.'],
    ['Handshake', 'The first exchange, agreeing on version and capabilities.'],
  ],
  deeper: '<p>Servers can offer three kinds of things: <b>tools</b> (actions the model can call), <b>resources</b> (data it can read, like files) and <b>prompts</b> (ready-made instructions). Local servers usually talk over standard input and output; remote ones over HTTP. Because a server can read your files or act for you, install only servers you trust, and check what each tool can do.</p>',
  code: {
    title: 'A tiny MCP server',
    note: 'Using the Python SDK, in the spirit of the course\'s MCP lesson.',
    text: `
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("calendar")

@mcp.tool()
def list_events(date: str) -> str:
    """List the events on a date ("today", "tomorrow" or YYYY-MM-DD)."""
    return "9:00 Standup · 14:00 Dentist"

if __name__ == "__main__":
    mcp.run()      # speaks MCP over stdin and stdout
`,
  },
};
