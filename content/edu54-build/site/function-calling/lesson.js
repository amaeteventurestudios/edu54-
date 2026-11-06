// Function calling: the model can't check the weather itself, so it writes a JSON slip asking a tool to do it.
// The slip passes a checking gate, the tool runs, the result rides back, and the model answers.
// Break it: broken JSON, a wrong argument type, a tool that doesn't exist. (All tools here are pretend, with example data.)
const TOOLS = [
  { name: 'get_weather', args: { city: 'string' }, c: '#3D6BD6', desc: 'Current weather for a city' },
  { name: 'convert_currency', args: { amount: 'number', from: 'string', to: 'string' }, c: '#3E9B5F', desc: 'Change money from one currency to another' },
  { name: 'find_bus', args: { from: 'string', to: 'string' }, c: '#EE7434', desc: 'Bus route between two places' },
];
const ASKS = [
  { q: 'What\'s the weather in Mombasa?', call: { name: 'get_weather', arguments: { city: 'Mombasa' } }, result: { temp_c: 31, sky: 'sunny', wind_kmh: 12 }, say: r => `It's ${r.temp_c}°C and ${r.sky} in Mombasa right now.` },
  null,   // the money question, in the learner's own currency (moneyAsk below)
  { q: 'Bus from Ikeja to Lekki?', call: { name: 'find_bus', arguments: { from: 'Ikeja', to: 'Lekki' } }, result: { route: 'Ikeja → CMS → Lekki', change_at: 'CMS', minutes: 70 }, say: r => `Take the bus to ${r.change_at} and change for Lekki: about ${r.minutes} minutes.` },
  { q: 'Tell me a proverb', call: null, say: () => 'No tool needed: "However long the night, the dawn will break."' },
];
const BROKEN = {
  json: '{"name": "get_weather", "arguments": {"city": Mombasa}',
  type: { name: 'convert_currency', arguments: { amount: 'twenty', from: 'USD', to: 'NGN' } },   // `to` follows the learner's currency
  tool: { name: 'get_traffic', arguments: { road: 'Third Mainland Bridge' } },
};

export default {
  slug: 'function-calling',
  title: 'Function calling',
  description: 'Watch a model ask for help. It writes a JSON slip, a gate checks it, the right tool runs, and the answer comes back. Then send it a broken slip and see why checking matters.',
  overview: 'A language model can only write text. It can\'t look up the weather or change money. Function calling lets it write a structured request instead, a slip of JSON naming a tool and its inputs. Your code checks the slip, runs the tool, and hands the result back so the model can answer.',
  keywords: ['function calling explained', 'tool use llm', 'json schema', 'openai function calling', 'claude tool use'],
  money: true,
  orient: 'landscape',
  view: { target: [0.1, 0.8, 0.2], dir: [0.35, 0.9, 1.3], half: 3.2, wide: 6.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { a: 0, broken: null, t: 0, playing: true };
    // change 20 dollars (or euros, for dollar users) into the learner's currency, at the example rate
    function moneyAsk() {
      const M = S.money, to = M.cur, from = to.code === 'USD' ? { code: 'EUR', many: 'euros', per: 0.92 } : { code: 'USD', many: 'dollars', per: 1 };
      const rate = +(to.per / from.per).toPrecision(3), amount = +(20 * rate).toPrecision(3);
      ASKS[1] = { q: `Change 20 ${from.many} to ${to.many}`, call: { name: 'convert_currency', arguments: { amount: 20, from: from.code, to: to.code } }, result: { amount, rate, note: 'example rate' },
        say: r => `20 ${from.many} is about ${M.fmt(r.amount)} at the example rate of ${M.fmt(r.rate)} for one.` };
      BROKEN.type.arguments.from = from.code; BROKEN.type.arguments.to = to.code;
    }
    moneyAsk();
    /* ---------- the model, the gate, the tool rack ---------- */
    const model = P.box(1.3, 1.25, 1.1, C.ink, { r: 0.16 }); model.position.set(-3.0, 0, 0); S.add(model);
    const mt = S.text('MODEL', { size: 0.17, face: 'front', weight: 800, color: '#FFFFFF' }); mt.position.set(-3.0, 0.95, 0.56); S.add(mt);
    const rail = P.box(5.4, 0.08, 0.36, '#3A3B44', { r: 0.06 }); rail.position.set(-0.1, 0.3, 0.9); S.add(rail);
    const gate = new THREE.Group(); gate.position.set(-0.6, 0, 0.9); S.add(gate);
    for (const x of [-0.45, 0.45]) { const p = P.box(0.16, 1.3, 0.16, '#8E91A3', { r: 0.03 }); p.position.x = x; gate.add(p); }
    const lintel = P.box(1.06, 0.2, 0.2, '#8E91A3', { r: 0.03 }); lintel.position.y = 1.3; gate.add(lintel);
    const lamp = P.ball(0.13, C.grey); lamp.material = new THREE.MeshLambertMaterial({ color: C.grey }); lamp.position.y = 1.58; gate.add(lamp);
    const gt = S.text('CHECK', { size: 0.12, face: 'front', weight: 800, color: '#FFFFFF' }); gt.position.set(0, 1.4, 0.11); gate.add(gt);
    const rack = TOOLS.map((T, k) => {
      const g = new THREE.Group(); g.position.set(2.3, 0, -1.1 + k * 0.95); S.add(g);
      const b = P.box(1.5, 0.55, 0.7, T.c, { r: 0.1 }); b.material = new THREE.MeshLambertMaterial({ color: T.c }); g.add(b);
      const t = S.text(T.name, { size: 0.12, weight: 700, color: '#FFFFFF', font: '"JetBrains Mono", monospace' }); t.position.y = 0.56; g.add(t);
      return { g, b };
    });
    /* ---------- the slips ---------- */
    const mkSlip = (bg) => { const g = new THREE.Group(); const b = P.box(1.55, 0.06, 0.95, bg, { r: 0.06 }); g.add(b); const t = S.text('', { size: 0.085, color: '#151827', weight: 600, font: '"JetBrains Mono", monospace', align: 'left', maxW: 1.45, maxH: 0.85 }); t.position.y = 0.07; g.add(t); g.userData.t = t; g.userData.noFit = true; S.add(g);
      g.userData.set = str => t.userData.set(str);
      return g; };
    const call = mkSlip('#FFFFFF'), res = mkSlip('#E5F4EA');
    const askT = S.text('', { size: 0.15, face: 'cam', weight: 700, bg: '#FFFFFF', color: C.ink, order: 6 }); askT.position.set(-2.55, 1.7, 0.4); askT.userData.noFit = true; S.add(askT);
    const ansT = S.text('', { size: 0.14, face: 'cam', weight: 600, bg: '#FFF6DA', color: C.ink, order: 6, align: 'left' }); ansT.position.set(-0.2, 2.75, -0.6); ansT.userData.noFit = true; S.add(ansT);
    const wrap = (s, n = 34) => { const out = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } out.push(line.trim()); return out.join('\n'); };
    /* ---------- one round: write → gate → tool → back → answer ---------- */
    const ask = () => ASKS[st.a];
    function slipText() {
      if (st.broken === 'json') return BROKEN.json;
      const c = st.broken ? BROKEN[st.broken] : ask().call;
      return JSON.stringify(c, null, 1).replace(/\n\s+/g, '\n  ');
    }
    function check() {
      if (!ask().call && !st.broken) return { ok: true };
      let o;
      try { o = JSON.parse(slipText()); } catch (e) { return { ok: false, why: 'not valid JSON: a quote is missing around Mombasa and a closing brace is missing' }; }
      const T = TOOLS.find(t => t.name === o.name);
      if (!T) return { ok: false, why: `there is no tool called ${o.name}` };
      for (const [k, type] of Object.entries(T.args)) if (typeof o.arguments?.[k] !== type) return { ok: false, why: `"${k}" must be a ${type}, got ${JSON.stringify(o.arguments?.[k])}` };
      return { ok: true, tool: TOOLS.indexOf(T) };
    }
    const X = { model: V(-2.2, 0.36, 0.9), gate: V(-0.6, 0.36, 0.9) };
    const PH = [0, 1.2, 2.6, 3.4, 4.6, 6.0, 7.0];   // write, ride to gate, check, to tool, run, ride back, answer
    function frame() {
      const t = st.t, chk = check(), A = ask(), needs = !!A.call || !!st.broken;
      askT.userData.set(wrap(`“${A.q}”`, 30));
      call.userData.set(slipText());
      call.visible = needs && t > 0.3; res.visible = false;
      rack.forEach(r => { r.b.material.emissive.set(0x000000); r.g.position.y = 0; });
      lamp.material.color.set(C.grey);
      ansT.visible = false;
      if (!needs) { ansT.visible = t > 1; ansT.userData.set(wrap(A.say(), 34)); return; }
      const toolPos = chk.tool != null ? rack[chk.tool].g.position.clone().add(V(-0.9, 0.36, 0)) : X.gate.clone().add(V(0.8, 0, 0));
      if (t < PH[1]) call.position.copy(X.model).add(V(0, 0.55 * Math.min(1, t / 0.6), 0));
      else if (t < PH[2]) call.position.copy(X.model).lerp(X.gate.clone().add(V(-0.95, 0, 0)), (t - PH[1]) / (PH[2] - PH[1]));
      else {
        lamp.material.color.set(chk.ok ? C.green : C.red);
        if (!chk.ok) { call.position.copy(X.gate).add(V(-0.95, 0, 0)); call.rotation.z = Math.sin(t * 20) * 0.02; ansT.visible = t > PH[3]; ansT.userData.set(wrap(`Error sent back to the model: ${chk.why}.`, 34)); return; }
        call.rotation.z = 0;
        if (t < PH[3]) call.position.copy(X.gate).add(V(-0.95, 0, 0));
        else if (t < PH[4]) call.position.copy(X.gate).lerp(toolPos, (t - PH[3]) / (PH[4] - PH[3]));
        else {
          call.visible = false;
          const r = rack[chk.tool]; r.b.material.emissive.set(TOOLS[chk.tool].c).multiplyScalar(0.35 + 0.25 * Math.sin(t * 8)); r.g.position.y = t < PH[5] ? 0.05 * Math.abs(Math.sin(t * 9)) : 0;
          if (t >= PH[4] + 0.5) {
            res.visible = t < PH[6] + 0.2;
            res.userData.set(JSON.stringify(A.result, null, 1).replace(/\n\s+/g, '\n  '));
            res.position.copy(toolPos).lerp(X.model, Math.min(1, (t - PH[4] - 0.5) / (PH[5] - PH[4] + 0.3)));
          }
          if (t > PH[6]) { ansT.visible = true; ansT.userData.set(wrap(A.say(A.result), 34)); }
        }
      }
    }
    call.position.copy(X.model); res.position.copy(X.model);
    function update(dt) { if (!st.playing) return; st.t += dt * (S.reduced ? 4 : 1); if (st.t > 9.5) st.playing = false; frame(); }
    const go = () => { st.t = 0; st.playing = true; frame(); };
    frame();
    const controls = [
      { type: 'buttons', label: 'Ask', options: ASKS.map(a => a.q), get: () => st.a, act: i => { st.a = i; st.broken = null; go(); } },
      { type: 'button', label: 'Run it again', short: 'Again', act: go },
    ];
    const readouts = [
      { label: 'Tool', get: () => { const c = check(); return { v: !ask().call && !st.broken ? 'none' : c.ok ? TOOLS[c.tool].name : 'rejected', bad: !c.ok }; } },
      { label: 'Step', get: () => ({ v: ['writing', 'sending', 'checking', 'calling', 'running', 'returning', 'answering', 'done'][PH.findIndex(p => p > st.t) < 0 ? 7 : Math.max(0, PH.findIndex(p => p > st.t) - 1)] }) },
    ];
    const labels = [
      { name: 'slip', t: 'A JSON slip', d: 'Which tool, with which inputs', icon: 'code', at: () => call.position.clone().add(V(0, 0.1, 0)), hide: () => !call.visible },
      { name: 'gate', t: 'Your code checks it', d: 'Valid JSON? Real tool? Right types?', icon: 'check', atV: V(-0.6, 1.7, 0.9) },
      { name: 'tools', t: 'The tools', d: 'Real code that does the work', icon: 'box', atV: V(2.3, 0.6, -1.1) },
      { name: 'answer', t: 'The answer', d: 'Written from the tool\'s result', icon: 'spark', at: () => ansT.position.clone().add(V(0, -0.42, 0)), hide: () => !ansT.visible, phone: false },
    ];
    const breaks = [
      { label: 'Broken JSON', hint: 'A missing quote and brace', on: () => { st.a = 0; st.broken = 'json'; go(); }, off: () => { st.broken = null; go(); } },
      { label: 'Wrong argument type', hint: '"amount": "twenty"', on: () => { st.a = 1; st.broken = 'type'; go(); }, off: () => { st.broken = null; go(); } },
      { label: 'A tool that doesn\'t exist', hint: 'get_traffic', on: () => { st.a = 2; st.broken = 'tool'; go(); }, off: () => { st.broken = null; go(); } },
    ];
    function status() {
      const c = check();
      if (!c.ok) return { ok: false, msg: `<b>Rejected at the gate:</b> ${c.why}. Never run a slip you haven't checked. A good app sends the error back so the model can write a better slip.` };
      if (!ask().call) return { msg: `<b>No tool needed.</b> The model can answer a proverb from what it knows, so it just replies.` };
      if (st.t < PH[2]) return { msg: `<b>The model writes a slip</b> instead of an answer: the tool's name and its inputs, as JSON.` };
      if (st.t < PH[6]) return { msg: `<b>The slip passed the check</b>, so your code runs ${TOOLS[c.tool].name}. The model never touches the tool itself.` };
      return { ok: true, msg: `<b>Answered with real data.</b> The tool's result went back into the conversation, and the model wrote the reply from it. (These tools are pretend, with example data.)` };
    }
    return { update, controls, readouts, labels, breaks, status,
      currency: () => { moneyAsk(); controls[0].options = ASKS.map(a => a.q); go(); },
      reset: () => { st.a = 0; st.broken = null; go(); },
      ask: i => { st.a = i; st.broken = null; go(); } };
  },

  story: [
    { t: 'Text only', home: true, say: 'A language model can only write text. Ask it for the weather in Mombasa and it has no way to look outside.', act: m => m.ask(0) },
    { t: 'It writes a slip', focus: 'slip', zoom: 1.4, say: 'With function calling, the app tells the model which tools exist. The model replies with a slip of JSON: get weather, city Mombasa.', wait: 3 },
    { t: 'Check the slip', focus: 'gate', zoom: 1.3, say: 'Your code checks the slip: is it valid JSON, is it a real tool, are the inputs the right type? Only then does it run.', wait: 3 },
    { t: 'The tool runs', focus: 'tools', zoom: 1.3, say: 'The tool is ordinary code. It fetches the weather and sends a result slip back.', wait: 3 },
    { t: 'The model answers', home: true, say: 'The result goes back into the conversation, and the model writes the reply: thirty-four degrees and sunny.', wait: 3 },
    { t: 'When slips go wrong', home: true, say: 'Models sometimes write broken JSON, or invent a tool. The gate catches it, and sends the error back so the model can try again.', act: m => m.ask(1) },
  ],
  check: [
    { q: 'When a model "calls a function", who runs the function?', options: ['The model itself', 'Your code, after reading the model\'s JSON', 'The user'], answer: 1, why: 'The model only writes the request. Your code decides whether to run it.' },
    { q: 'What should happen if the JSON slip is broken?', options: ['Run it anyway', 'Reject it and send the error back to the model', 'Delete the conversation'], answer: 1, why: 'Validate every call. Returning the error lets the model fix its slip.' },
    { q: 'How does the model know which tools exist?', options: ['It guesses', 'The app lists them, with names, descriptions and input types', 'It searches the internet'], answer: 1, why: 'Tool definitions (name, description, JSON schema) are sent with the conversation.' },
  ],
  terms: [
    ['Tool (function)', 'Code the app can run on the model\'s behalf.'],
    ['Tool call', 'The model\'s structured request: tool name plus arguments.'],
    ['JSON', 'A plain-text format for structured data: names and values in braces.'],
    ['Schema', 'The rules for a tool\'s inputs: names, types, which are required.'],
    ['Validation', 'Checking a call against its schema before running it.'],
  ],
  deeper: '<p>Tool descriptions matter as much as the code: the model picks tools by reading them. Clear names, a one-line purpose, and exact input types make the right call far more likely. For anything that spends money or changes data, ask the user before running it.</p>',
  code: {
    title: 'A tool, its schema, and the check',
    note: 'The pattern from the course\'s function_calling.py.',
    text: `
import json

TOOLS = {
    "get_weather": {
        "description": "Current weather for a city",
        "parameters": {"city": str},
        "run": lambda city: {"temp_c": 34, "sky": "sunny"},
    },
}

def handle(slip_text):
    try:
        call = json.loads(slip_text)
    except json.JSONDecodeError as e:
        return {"error": f"invalid JSON: {e}"}
    tool = TOOLS.get(call.get("name"))
    if tool is None:
        return {"error": f"unknown tool {call.get('name')}"}
    args = call.get("arguments", {})
    for name, kind in tool["parameters"].items():
        if not isinstance(args.get(name), kind):
            return {"error": f"{name} must be {kind.__name__}"}
    return tool["run"](**args)      # the result goes back to the model
`,
  },
};
