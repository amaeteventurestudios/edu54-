// An LLM routing layer: a fintech in Lagos gives four product teams one OpenAI-compatible endpoint. Apps ask for aliases (chat-fast, chat-smart, long-context);
// the proxy maps them to real models, applies per-key budgets and rate limits, falls back when a provider fails, and records cost per team.
// A day: 09:00 the provider retires model "fast-2025" (old name now returns 404). 11:00–11:40 provider A is down; the fallback is provider B.
// Team Docs sends 120K-token contracts with tool calls; provider B's default model takes 32K and no tools, its long model takes 200K with tools.
// 14:00 Team Growth's batch job loops: 40 million tokens an hour. Each team has a daily budget of 20 million tokens; the company's account allows 60 million in total.
const TEAMS = ['Payments', 'Support', 'Docs', 'Growth'];
function run(st) {
  const ev = [], hit = { Payments: 0, Support: 0, Docs: 0, Growth: 0 };
  const add = (t, bad) => ev.push({ t, bad });
  add(st.alias ? 'Apps ask for chat-fast; the proxy maps it to a model' : 'Apps ask for "fast-2025" by name, compiled into their code');
  if (st.alias) add('09:00 fast-2025 retired · the platform team points chat-fast at fast-2026 in one config change · no app redeployed');
  else { add('09:00 fast-2025 retired · every request naming it gets 404 until Payments and Support ship new builds (about 6 hours)', true); hit.Payments += 1; hit.Support += 1; }
  add('11:00 provider A down · fallback to provider B');
  if (st.capFallback) add('Docs\' 120K-token contract with tools → B\'s long model (200K, tools) · works, slower');
  else { add('Docs\' 120K-token contract → B\'s default model (32K, no tools) · truncated input and dropped tool calls: wrong summaries', true); hit.Docs += 1; }
  add('Payments and Support → B\'s default model · fine for short chats');
  if (st.perKey) add('14:00 Growth\'s batch job loops · its key stops at 20M tokens for the day · the other teams carry on');
  else { add('14:00 Growth\'s batch job loops on the shared key · the company account hits 60M by 15:10 · every team gets 429 until midnight', true); TEAMS.forEach(t => { hit[t] += 1; }); }
  add(`Costs by team, from the proxy's records: Payments, Support, Docs${st.perKey ? ', Growth (capped)' : ', and one shared key no one can split'}`);
  return { ev, hit, down: Object.values(hit).filter(Boolean).length };
}

export default {
  slug: 'llm-routing-layer',
  title: 'A routing layer: aliases, fallbacks, budgets',
  description: 'A Lagos fintech gives four teams one model endpoint. Over one day a model retires, a provider fails and a batch job runs away.',
  overview: 'Once several apps use language models, a routing layer in the middle pays for itself. It exposes one endpoint, usually OpenAI-compatible, so apps use any client library. Apps ask for aliases such as chat-fast or long-context, and the proxy maps each alias to a real model and provider, so retiring or swapping a model is one configuration change instead of a redeploy of every app. When a provider fails, the proxy falls back along a chain, but only to models that can do what the request needs: context length, tool calling, images, structured output; a cheaper model that silently truncates a long document is worse than an error. Each team gets its own key with a budget and rate limits, so one runaway job hits its own ceiling instead of the company\'s, and every request is logged with team, model and tokens, so costs can be split and spikes traced. The same layer can add caching, guardrails and routing by difficulty, and sit beside an MCP gateway that does the same job for tools. Managed proxies save running it yourself; self-hosted ones keep traffic and keys in-house.',
  keywords: ['LLM gateway', 'LLM proxy', 'model aliases', 'fallback chain', 'API key budgets', 'OpenAI-compatible', 'LiteLLM'],
  orient: 'landscape',
  view: { target: [-0.2, 0.4, -0.1], dir: [0.4, 0.85, 1.3], half: 1.6, wide: 5.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { alias: true, capFallback: true, perKey: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* four team robots, one proxy wall, two providers: A (teal, one model) and B (purple: a small default model and a big long-context one) */
    const TZ = i => -0.9 + i * 0.55, TX = -2.4, PXx = -1.35, VX = -0.3;
    const tm = TEAMS.map((n, i) => { const r = P.robot('#5B8DB8', { scale: 0.75 }); r.position.set(TX, 0, TZ(i)); S.add(r); return r; });
    const px = P.box(0.45, 0.55, 2.1, CHAR, { r: 0.06 }); px.position.set(PXx, 0, -0.08); S.add(px);
    const pvA = new THREE.MeshLambertMaterial({ color: GOOD }), pa = P.box(0.75, 0.45, 0.55, '#fff', { r: 0.05, material: pvA }); pa.position.set(VX, 0, -0.6); S.add(pa);
    const pbS = P.box(0.35, 0.3, 0.45, '#7B6FA8', { r: 0.05 }); pbS.position.set(VX - 0.2, 0, 0.4); S.add(pbS);
    const pbL = P.box(0.4, 0.6, 0.45, '#5A4A8C', { r: 0.05 }); pbL.position.set(VX + 0.22, 0, 0.4); S.add(pbL);
    /* token budgets: a tank per team, or one shared company tank that overflows */
    const tanks = TEAMS.map((_, i) => { const t = P.tank(0.28, 0.6, 0.28, '#5B8DB8'); t.position.set(0.85 + i * 0.38, 0.05, -0.55); S.add(t); return t; });
    const shared = P.tank(1.1, 0.75, 0.4, '#5B8DB8'); shared.position.set(1.42, 0.05, 0.5); S.add(shared);
    const ball = P.ball(0.08, SAF, { material: new THREE.MeshLambertMaterial({ color: SAF }) }); ball.userData.noFit = true; S.add(ball);
    S.add(P.keep(-2.75, 2.35, 1.2, -1.15, 0.85));

    let R = null, k = 0, clock = 0;
    function draw() {
      R = run(st); k = 0; clock = 0;
      tm.forEach((r, i) => r.userData.set({ color: R.hit[TEAMS[i]] ? BAD : '#5B8DB8' }));
      tanks.forEach((t, i) => { t.visible = !!st.perKey; t.userData.set({ level: i === 3 ? 1 : [0.45, 0.6, 0.7][i], color: i === 3 ? SAF : '#5B8DB8' }); });
      shared.visible = !st.perKey; shared.userData.set({ level: st.perKey ? 0 : 1.3, color: RED });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => {
      tm.forEach(r => r.userData.tick(dt)); tanks.forEach(t => t.userData.tick(dt)); shared.userData.tick(dt);
      clock += dt; if (clock >= 1.3 * (k + 1) && k < R.ev.length - 1) k++;
      if (clock > 1.3 * R.ev.length + 1) { clock = 0; k = 0; }
      const down = k >= 2 && k <= 4; pvA.color.set(down ? '#9A968C' : GOOD);
      /* a request: Docs' long contract during the outage goes to B's long model only with capability fallback */
      const ti = k % 4, u = (clock % 1.3) / 1.3, docs = ti === 2 && down;
      const tx = !down ? VX : docs && st.capFallback ? VX + 0.22 : VX - 0.2, tz = !down ? -0.6 : 0.4;
      const x = u < 0.5 ? TX + 0.3 + (PXx - TX - 0.3) * (u / 0.5) : PXx + (tx - PXx) * ((u - 0.5) / 0.5), z = u < 0.5 ? TZ(ti) + (-0.08 - TZ(ti)) * (u / 0.5) : -0.08 + (tz + 0.08) * ((u - 0.5) / 0.5);
      ball.position.set(x, 0.65, z); ball.material.color.set(u > 0.5 && docs && !st.capFallback ? RED : SAF);
      tm.forEach((r, i) => r.userData.set({ busy: i === ti }));
    };
    const controls = [
      { type: 'toggle', label: 'Apps ask for aliases', short: 'Aliases', get: () => st.alias, set: v => set({ alias: !!v }) },
      { type: 'toggle', label: 'Fall back by capability', short: 'Capability fallback', get: () => st.capFallback, set: v => set({ capFallback: !!v }) },
      { type: 'toggle', label: 'A key and budget per team', short: 'Per-team keys', get: () => st.perKey, set: v => set({ perKey: !!v }) },
      { type: 'button', label: 'Replay the day', act: () => draw() },
    ];
    const readouts = [
      { label: 'Teams hurt', get: () => ({ v: `${R.down} of 4`, sub: Object.entries(R.hit).filter(([, v]) => v).map(([t]) => t).join(', ') || 'none', bad: R.down > 0, good: !R.down }) },
      { label: 'Endpoint', get: () => ({ v: '1', sub: 'OpenAI-compatible' }) },
      { label: 'Cost split', get: () => ({ v: st.perKey ? 'by team' : 'one bill', sub: 'from the proxy\'s logs' }) },
    ];
    const labels = [
      { name: 'proxy', t: 'One front door', d: 'Four teams call one proxy (red: hurt today). Behind it, teal provider A (grey in its outage) and purple B with a small default model and a big long-context one', icon: 'layers', atV: V(TX - 0.3, 0.4, TZ(1)) },
      { name: 'budget', t: 'Token budgets', d: 'A tank per team (Growth\'s fills and stops), or one shared tank that spills over for everyone', icon: 'gauge', atV: V(2.25, 0.5, -0.55) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Hard-code model names', hint: 'no aliases', on: () => set({ ...D0, alias: false }), off: reset },
      { label: 'Fall back to whatever\'s cheapest', hint: 'ignore what the request needs', on: () => set({ ...D0, capFallback: false }), off: reset },
      { label: 'One shared key', hint: 'no per-team budgets', on: () => set({ ...D0, perKey: false }), off: reset },
    ];
    function status() {
      if (!st.alias) return { ok: false, msg: '<b>The provider retired fast-2025 at nine, and Payments and Support were down for six hours until new builds shipped.</b> Model names compiled into apps turn every model change into a redeploy. Let apps ask for an alias, and change what it points to in the proxy.' };
      if (!st.capFallback) return { ok: false, msg: '<b>During the outage, Docs\' 120K-token contracts fell back to a 32K model with no tools: inputs truncated, tool calls dropped, summaries wrong, and no error.</b> A fallback must match what the request needs (context length, tools, images, structured output) or fail loudly.' };
      if (!st.perKey) return { ok: false, msg: '<b>Growth\'s runaway job used the shared key and spent the company\'s whole allowance by 15:10. Every team got 429s until midnight.</b> Give each team its own key with a budget and rate limit, so a runaway job hits its own ceiling, and costs can be split by team.' };
      return { ok: true, msg: '<b>A day with three incidents and no team hurt.</b> The retired model was swapped behind its alias in one config change; Docs\' long contracts fell back to a model with the context and tools they need; and Growth\'s loop stopped at its own budget while the others carried on. Every request was logged with team, model and tokens.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One front door', home: true, say: 'A fintech in Lagos gives four product teams one model endpoint through a proxy. Apps ask for names like chat-fast; the proxy decides which real model that means.', act: m => m.set({ alias: true, capFallback: true, perKey: true }) },
    { t: 'A model is retired', home: true, say: 'At nine, the provider retires a model. The platform team points the alias at its successor, and no app is touched.', act: m => m.set({ alias: true }) },
    { t: 'Without aliases', home: true, say: 'With the model name compiled into the apps, two teams are down for hours waiting for new builds.', act: m => m.set({ alias: false }) },
    { t: 'A provider fails', home: true, say: 'At eleven, the main provider goes down. The proxy falls back to another, choosing for each request a model that has the context length and tools it needs.', act: m => m.set({ alias: true, capFallback: true }) },
    { t: 'The wrong fallback', home: true, say: 'Fall back to the cheapest model instead, and long contracts are quietly truncated. Wrong answers, and no error.', act: m => m.set({ capFallback: false }) },
    { t: 'A runaway job', home: true, say: 'At two, one team\'s batch job loops. On its own key, it stops at its own budget. On a shared key, it spends everyone\'s allowance.', act: m => m.set({ capFallback: true, perKey: false }) },
  ],
  check: [
    { q: 'Why should apps ask for an alias rather than a model name?', options: ['A model can be swapped in the proxy without redeploying apps', 'Aliases are cheaper', 'Providers require it'], answer: 0, why: 'Model retirement becomes a config change.', hint: 'Try Hard-code model names.' },
    { q: 'What must a fallback model have?', options: ['What the request needs: context length, tools, images, output format', 'The lowest price', 'The same name'], answer: 0, why: 'Otherwise it fails silently.', hint: 'Try Fall back to whatever\'s cheapest.' },
    { q: 'Why give each team its own key and budget?', options: ['So one runaway job can\'t spend everyone\'s allowance, and costs split by team', 'Keys are free', 'For faster calls'], answer: 0, why: 'A ceiling per key limits the damage.', hint: 'Try One shared key.' },
  ],
  terms: [
    ['LLM proxy', 'A service in front of model providers that all apps call.'],
    ['Model alias', 'A stable name an app asks for, mapped to a real model in the proxy.'],
    ['Fallback chain', 'Other models or providers to try when one fails.'],
    ['Capability', 'What a model can do: context length, tools, images, structured output.'],
    ['Virtual key', 'A per-team key issued by the proxy, with its own budget and limits.'],
    ['OpenAI-compatible', 'An API shaped like OpenAI\'s, so standard clients work against it.'],
  ],
  deeper: '<p><b>Routing strategies.</b> Beyond fallback: route by difficulty (a small model for easy requests), by latency, by cost, or split traffic for an experiment; the cost lesson simulates routing by difficulty.</p><p><b>Self-hosted or managed.</b> A self-hosted proxy keeps prompts and keys in-house and costs you its upkeep; a managed one is quicker to start and adds a company in the data path.</p><p><b>With MCP.</b> An MCP gateway does for tools what this layer does for models: one front door, policy, budgets and logs. Many platforms run both.</p><p><b>About this machine.</b> The day\'s events and their effects follow the file header.</p>',
  code: {
    title: 'Aliases, capability fallback and budgets',
    note: 'Adapted from the course\'s LLM routing layer lesson.',
    text: `
ALIASES = {
    "chat-fast":    [("A", "fast-2026"), ("B", "default")],
    "long-context": [("A", "smart-200k"), ("B", "long-200k")],
}
CAPS = {("A", "fast-2026"): {"ctx": 128_000, "tools": True},
        ("B", "default"):   {"ctx": 32_000,  "tools": False},
        ("B", "long-200k"): {"ctx": 200_000, "tools": True}}

def route(key, alias, request):
    team = KEYS[key]
    if team.spent_today + request.est_tokens > team.daily_budget:
        raise TooManyRequests("team budget reached")
    for provider, model in ALIASES[alias]:
        caps = CAPS[(provider, model)]
        if request.tokens > caps["ctx"] or (request.tools and not caps["tools"]):
            continue                                   # can't serve it: skip, don't truncate
        if healthy(provider):
            return call(provider, model, request, tag=team.name)
    raise ServiceUnavailable("no model can serve this request right now")
`,
  },
};
