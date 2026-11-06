// Exam prep, designing tools: a mobile-money help desk. The agent routes each customer question to a tool using
// nothing but the tools' names and descriptions. Clear contracts route right; vague or overlapping ones misroute.
// Errors returned as data stop the agent cleanly; a bare "failed" makes it retry until the budget runs out.
const TOOLS = [
  { id: 'web', name: 'search_public_web', vague: 'search', c: '#3D6BD6', use: ['rate', 'news', 'outage', 'public'], not: ['wallet', 'balance', 'transfers', 'refund'],
    good: 'Public web pages\nUse: rates, news, outages\nNot: wallets, our rules', long: 'Searches public web pages. Use for exchange rates, news and network outages. Do not use for the caller\'s wallet or our refund rules.' },
  { id: 'acct', name: 'get_my_account', vague: 'find', c: '#1C9A94', use: ['wallet', 'balance', 'transfers'], not: ['refund', 'rules', 'rate', 'public'],
    good: 'The caller\'s own wallet\nUse: balance, transfers\nNot: rules, public facts', long: 'Reads the signed-in caller\'s own wallet: balance and recent transfers. Do not use for refund rules or public facts. Needs the caller signed in.' },
  { id: 'rules', name: 'search_refund_rules', vague: 'lookup', c: '#EE7434', use: ['refund', 'rules', 'fraud'], not: ['wallet', 'balance', 'public'],
    good: 'Our approved refund rules\nUse: refunds, fraud, limits\nNot: wallets, the web', long: 'Searches our approved refund rules for the caller\'s country. Use for refunds, fraud reports and limits. Do not use for account facts or the web.' },
];
const OVER = { id: 'over', name: 'lookup_info', c: '#8A3F8E', use: ['wallet', 'balance', 'transfers', 'refund', 'rules', 'fraud'], not: [], good: 'Customers, transfers,\nrefunds and rules', long: 'Finds information about customers, transfers, refunds and rules.' };
const VAGUE = 'Find information.';
const TICKETS = [
  { q: 'How much is in my wallet?', short: 'My balance?', w: ['wallet', 'balance'], want: 'acct' },
  { q: 'Can I get a refund for a wrong transfer?', short: 'Refund?', w: ['refund', 'rules'], want: 'rules' },
  { q: 'What is the naira to cedi rate today?', short: 'Naira → cedi?', w: ['rate', 'public'], want: 'web' },
  { q: 'Show my last transfers (I\'m on a new phone)', short: 'My transfers?', w: ['transfers', 'wallet'], want: 'acct', signedOut: true },
  { q: 'How many days do I have to report fraud?', short: 'Report fraud?', w: ['fraud', 'rules'], want: 'rules' },
  { q: 'Is the network down in Kisumu?', short: 'Network down?', w: ['outage', 'news', 'public'], want: 'web' },
];
const RETRIES = 4;

export default {
  slug: 'exam-tool-design',
  title: 'Exam prep: designing tools',
  description: 'An agent picks tools by reading their names and descriptions, nothing else. Blank a cabinet\'s contract and watch six questions go to the wrong drawer.',
  overview: 'A model chooses a tool from the interface you give it: the name, the description and the input schema. If three tools all say "find information", it guesses. If an error just says "failed", it retries. Exams on building with Claude test this judgement often: the usual right answer is to repair the tool contract, not to add more prompt instructions.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'tool design', 'tool descriptions', 'tool use errors', 'agent tool selection', 'exam practice'],
  sourceTitle: 'Tool Contracts, Errors, and Progressive Discovery',
  orient: 'landscape',
  view: { target: [0, 0.4, 0.4], dir: [0.2, 1.2, 1.25], half: 3.1, wide: 7.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { clear: [true, true, true], over: false, plainErr: false, k: 0, t: 0, phase: 'idle', pick: null, tries: 0, results: [], wasted: 0, round: 0, running: false };
    const tools = () => (st.over ? [...TOOLS, OVER] : TOOLS);
    const desc = (T, i) => (T === OVER ? OVER.good : st.clear[i] ? T.good : VAGUE);
    const nameOf = (T, i) => (T === OVER ? OVER.name : st.clear[i] ? T.name : T.vague);
    /* ---------- how the agent chooses: only from what the descriptions say ---------- */
    function choose(tk) {
      const scored = tools().map((T, i) => {
        const on = T === OVER || st.clear[i];
        const s = on ? tk.w.filter(w => T.use.includes(w)).length - 2 * tk.w.filter(w => T.not.includes(w)).length : 0;
        return { T, s };
      });
      const best = Math.max(...scored.map(x => x.s));
      const tied = scored.filter(x => x.s === best);
      // a tie is a guess: which one it lands on changes from run to run
      const i = TICKETS.indexOf(tk), h = ((i + 1) * (st.round + 3) * 7 + i * i + st.round) % tied.length;
      return { T: tied[h].T, guess: tied.length > 1 };
    }
    /* ---------- the desk ---------- */
    const XS = n => (n === 4 ? [-2.85, -0.95, 0.95, 2.85] : [-1.9, 0, 1.9]), CZ = -1.25; // cabinets in a row at the back
    const agent = P.box(1.25, 0.95, 1.5, C.ink, { r: 0.16 }); agent.position.set(0, 0, 1.05); S.add(agent);
    const eye = P.ball(0.1, C.gold); eye.material = new THREE.MeshLambertMaterial({ color: C.gold }); eye.position.set(0, 0.98, 1.05); S.add(eye);
    const inbox = []; for (let i = 0; i < 6; i++) { const s = P.box(0.75, 0.04, 0.5, '#FFFFFF', { r: 0.03 }); s.position.set(-1.75, i * 0.05, 1.1); S.add(s); inbox.push(s); }
    const cabs = [...TOOLS, OVER].map((T, i) => {
      const g = new THREE.Group(); g.position.set(0, 0, CZ); S.add(g);
      const b = P.box(1.75, 0.55, 1.05, T.c, { r: 0.1 }); b.material = new THREE.MeshLambertMaterial({ color: T.c }); g.add(b);
      const cardM = new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), card = P.box(1.63, 0.05, 0.92, '#fff', { r: 0.05, material: cardM }); card.position.y = 0.56; g.add(card);
      const lamp = P.ball(0.08, C.grey); lamp.material = new THREE.MeshLambertMaterial({ color: C.grey }); lamp.position.set(0.7, 0.3, 0.56); g.add(lamp);
      const rail = P.rod(V(), V(0, 0, 1), 0.025, '#B9B6C6'); S.add(rail);
      S.tap(b, () => { const k = TOOLS.indexOf(T); S.pop(nameOf(T, k), `<p>${T === OVER || st.clear[k] ? T.long : VAGUE}</p><p class="fine">This is all the agent knows about the tool.</p>`); });
      return { g, b, cardM, lamp, rail };
    });
    const slip = new THREE.Group(); slip.userData.noFit = true; S.add(slip);
    const slipB = P.box(0.95, 0.04, 0.5, '#FFFFFF', { r: 0.04 }); slip.add(slipB);
    slip.visible = false;
    const tally = TICKETS.map((tk, i) => {
      const b = P.box(1.1, 0.06, 0.5, '#E4E0D6', { r: 0.05 }); b.material = new THREE.MeshLambertMaterial({ color: '#E4E0D6' }); b.position.set(-3.0 + i * 1.2, 0, 2.75); S.add(b);
      return { b };
    });
    const toolPos = T => cabs[[...TOOLS, OVER].indexOf(T)].g.position.clone().add(V(0, 0.12, 0.62));
    const agentPos = V(0, 0.12, 0.25);
    function drawDesk() {
      [...TOOLS, OVER].forEach((T, i) => {
        const c = cabs[i], show = T !== OVER || st.over;
        c.g.visible = show; c.rail.visible = show;
        if (show) { c.g.position.x = XS(tools().length)[i]; P.setRod(c.rail, agentPos.clone().setY(0.06), c.g.position.clone().add(V(0, 0.06, 0.55))); }
        c.cardM.color.set(T === OVER || st.clear[i] ? '#FFFFFF' : '#8E8A80');
      });
    }
    /* ---------- running the queue ---------- */
    const TICK = () => (S.reduced ? 0.45 : 1);
    function run() { st.round++; st.k = 0; st.t = 0; st.phase = 'read'; st.results = []; st.wasted = 0; st.tries = 0; st.running = true; st.pick = null; drawDesk(); S.sync(); }
    function update(dt) {
      eye.material.color.set(st.phase === 'read' ? C.gold : st.running ? C.green : C.grey);
      inbox.forEach((s, i) => { s.visible = i >= st.k && st.running || !st.running && i < 6; });
      if (!st.running) { slip.visible = false; paint(); return; }
      const tk = TICKETS[st.k];
      st.t += dt / TICK();
      if (st.phase === 'read') { slip.visible = false; if (st.t > 0.6) { st.pick = choose(tk); st.phase = 'go'; st.t = 0; slipB.material = P.mat('#FFFFFF'); } }
      else if (st.phase === 'go') {
        slip.visible = true; const u = Math.min(1, st.t / 0.8); slip.position.copy(agentPos.clone().lerp(toolPos(st.pick.T), u)); slip.position.y = 0.12 + Math.sin(u * Math.PI) * 0.4;
        if (u >= 1) { st.phase = 'res'; st.t = 0; }
      } else if (st.phase === 'res') {
        const right = st.pick.T.id === tk.want;
        if (st.t > 0.3 && right && tk.signedOut) { // the tool answers with an error
          st.phase = 'back'; st.t = 0; slipB.material = P.mat('#FBD9D3');
        } else if (st.t > 0.7) finish(right ? 'right' : 'wrong');
      } else if (st.phase === 'back') {
        const u = Math.min(1, st.t / 0.8); slip.position.copy(toolPos(st.pick.T).lerp(agentPos, u)); slip.position.y = 0.12 + Math.sin(u * Math.PI) * 0.4;
        if (u >= 1) {
          if (st.plainErr && st.tries < RETRIES) { st.tries++; st.wasted++; st.phase = 'go'; st.t = 0; slipB.material = P.mat('#FFFFFF'); S.sync(); }
          else finish(st.plainErr ? 'stuck' : 'handled');
        }
      }
      paint();
    }
    function finish(r) { st.results[st.k] = r; st.k++; st.t = 0; st.tries = 0; st.phase = 'read'; if (st.k >= TICKETS.length) { st.running = false; st.phase = 'idle'; } S.sync(); }
    function paint() {
      tally.forEach((x, i) => { const r = st.results[i]; x.b.material.color.set(r === 'right' || r === 'handled' ? '#9ED3B0' : r === 'wrong' || r === 'stuck' ? '#F2A79C' : i === st.k && st.running ? '#F6DFA2' : '#E4E0D6'); });
      [...TOOLS, OVER].forEach((T, i) => {
        const hit = st.pick && st.pick.T === T && (st.phase === 'res' || st.phase === 'back') && st.running;
        const ok = hit && st.pick.T.id === TICKETS[st.k]?.want;
        cabs[i].lamp.material.color.set(hit ? (ok ? C.green : C.red) : C.grey);
        cabs[i].b.material.emissive.set(hit ? '#FFFFFF' : '#000000').multiplyScalar(0.12);
      });
    }
    drawDesk(); run();
    const reset = () => { st.clear = [true, true, true]; st.over = false; st.plainErr = false; run(); };
    const rightN = () => st.results.filter(r => r === 'right' || r === 'handled').length;
    const controls = [
      { type: 'button', label: 'Run the six questions again', short: 'Run again', act: run },
      ...TOOLS.map((T, i) => ({ type: 'toggle', label: `Clear contract for ${T.name}`, short: T.vague, quick: false, get: () => st.clear[i], set: v => { st.clear[i] = v; run(); }, hint: 'Off: the name and description go vague' })),
      { type: 'toggle', label: 'Errors come back as data', short: 'Error data', get: () => !st.plainErr, set: v => { st.plainErr = !v; run(); }, hint: 'Category, retryable, next step' },
    ];
    const readouts = [
      { label: 'Handled right', get: () => { const n = rightN(), d = st.results.length; return { v: `${n} / ${TICKETS.length}`, sub: st.running ? `${d} done so far` : d === TICKETS.length ? 'all six answered' : '', good: !st.running && n === TICKETS.length, bad: d > n }; } },
      { label: 'Wasted calls', get: () => ({ v: `${st.wasted}`, bad: st.wasted > 0, good: !st.running && st.wasted === 0 }) },
    ];
    const labels = [
      { name: 'agent', t: 'The agent', d: 'Sees only names and descriptions', icon: 'target', atV: V(0, 1.0, 0.6) },
      { name: 'contract', t: 'A tool contract', d: 'What it does, when to use it, when not to', icon: 'code', at: () => cabs[0].g.position.clone().add(V(-0.82, 0.57, 0.44)) },
      { name: 'tally', t: 'The six questions', d: 'Green: right tool. Red: wrong or stuck', icon: 'check', atV: V(-3.0, 0.1, 2.75) },
      { name: 'slip', t: 'The calls', d: 'Slips go out; results or errors come back', icon: 'bolt', atV: V(0.95, 0.1, -0.1), phone: false },
    ];
    const breaks = [
      { label: 'Vague names: search, find, lookup', hint: 'All three say "Find information."', on: () => { st.clear = [false, false, false]; run(); }, off: () => { st.clear = [true, true, true]; run(); } },
      { label: 'Add an overlapping tool', hint: 'lookup_info claims customers and rules', on: () => { st.over = true; run(); }, off: () => { st.over = false; run(); } },
      { label: 'Errors as plain text', hint: 'The tool just says "failed"', on: () => { st.plainErr = true; run(); }, off: () => { st.plainErr = false; run(); } },
    ];
    function status() {
      const tk = TICKETS[st.k];
      if (st.running) {
        const why = [st.clear.some(c => !c) ? 'the tool names say only “Find information.”, so it can only guess' : '', st.over ? 'lookup_info claims both customers and refund rules' : '', st.plainErr ? 'a failing tool will say only “failed”' : ''].filter(Boolean);
        if (st.phase === 'read') return why.length ? { ok: false, msg: `<b>Reading the tool list</b> for “${tk.q}”. Broken: ${why.join('; ')}.` } : { msg: `<b>Reading the tool list</b> for “${tk.q}”` };
        if (st.phase === 'back') return { ok: !st.plainErr, msg: st.plainErr ? `<b>“failed”.</b> No reason, no hint. So it tries the same call again (${st.tries + 1} of ${RETRIES + 1}).` : '<b>A structured error.</b> Category: not signed in. Not retryable. Next step: ask the caller to sign in. So it stops and asks.' };
        if (st.pick) return { ok: st.pick.T.id === tk.want, msg: `<b>${st.pick.guess ? 'A guess:' : 'Chose'} ${nameOf(st.pick.T, TOOLS.indexOf(st.pick.T))}</b>${st.pick.T.id === tk.want ? '' : `, but this needs ${TOOLS.find(T => T.id === tk.want).name}.`}` };
        return { msg: '' };
      }
      const n = rightN(), wrong = st.results.filter(r => r === 'wrong').length, stuck = st.results.includes('stuck');
      if (stuck) return { ok: false, msg: `<b>Stuck in a retry loop.</b> “failed” told the agent nothing, so it called the same tool ${RETRIES + 1} times and gave up. A structured error (category, retryable or not, the safe next step) lets it stop and ask the caller to sign in.` };
      if (st.over && wrong) return { ok: false, msg: `<b>Two tools claim the same job.</b> lookup_info overlaps both get_my_account and search_refund_rules, so ${wrong} question${wrong > 1 ? 's go' : ' goes'} to whichever it lands on. Run it again: the picks change. Give each tool one owner.` };
      if (wrong) return { ok: false, msg: `<b>${wrong} wrong pick${wrong > 1 ? 's' : ''}.</b> When descriptions don't say what each tool is for, and not for, the agent can only guess. A public question can end up reading a customer's private wallet. Fix the names and descriptions, not the prompt.` };
      if (n === TICKETS.length) return { ok: true, msg: '<b>All six handled.</b> Each tool says what it does, when to use it and when not to, and the account tool\'s error told the agent exactly what to do next.' };
      return { msg: 'Press Run again.' };
    }
    return { update, controls, readouts, labels, breaks, status, reset, run, set: (k, v) => { st[k] = v; drawDesk(); } };
  },

  story: [
    { t: 'It only sees the menu', focus: 'agent', zoom: 1.3, say: 'An agent picks a tool by reading the tool list: names, descriptions and input schemas. It can\'t look inside the code.', act: m => m.run() },
    { t: 'Three clear contracts', focus: 'contract', zoom: 1.3, say: 'Each tool here says one job, when to use it, and when not to. That last part matters: it draws the border between tools.' },
    { t: 'Six questions, six right', home: true, say: 'Balance questions go to the account, refund questions to the rules, exchange rates to the web. No guessing.', wait: 6 },
    { t: 'Blur the names', home: true, say: 'Now call them search, find and lookup, all with the same description. Watch the agent guess, and send a public question into a private wallet.', act: m => { m.set('clear', [false, false, false]); m.run(); }, wait: 8 },
    { t: 'Errors are data', focus: 'slip', zoom: 1.2, say: 'When a tool fails, say how: the category, whether a retry can help, and the safe next step. A bare failed makes the agent try again and again.', act: m => { m.set('clear', [true, true, true]); m.set('plainErr', true); m.run(); }, wait: 10 },
    { t: 'The exam pattern', home: true, say: 'When tools are picked wrongly, the strongest answer is usually to fix the tool contract: distinct names, clear boundaries, structured errors. Not a longer prompt.', act: m => { m.set('plainErr', false); m.run(); } },
  ],
  check: [
    { q: 'What does the model use to pick a tool?', options: ['The tool\'s source code', 'Its name, description and input schema', 'How fast the tool runs'], answer: 1, why: 'The model only sees the interface you describe.' },
    { q: 'Three tools all say "Find information." What is the best first fix?', options: ['A longer system prompt', 'Distinct names and descriptions with when-not-to-use', 'A bigger model'], answer: 1, why: 'The catalog erased the differences; repair the interface.' },
    { q: 'A tool fails because the caller isn\'t signed in. What should it return?', options: ['"failed"', 'A category, retryable: false, and a next step', 'Nothing'], answer: 1, why: 'Structured errors let the agent stop and do the safe thing.' },
  ],
  practice: [
    { q: 'An agent with tools named search, find and lookup keeps querying private customer records for public news questions. What should the team do first?', options: ['Add a system prompt line telling it not to use find for news','Let it retry with a different tool when the answer looks wrong','Rename and redescribe the tools so each has one job, with when to use it and when not to','Switch to a larger model'], answer: 2, why: 'Wrong picks are usually an interface problem. Distinct names and use / do-not-use boundaries fix the cause; prompt patches and retries treat symptoms.' },
    { q: 'A tool returns "Error" whenever anything goes wrong, and the agent retries until it runs out of budget. Which change helps most?', options: ['Return a structured error with a category, a retryable flag and a safe next step', 'Raise the retry limit', 'Hide errors from the model', 'Make every error retryable'], answer: 0, why: 'The agent needs to know whether trying again can work. Authorization and validation errors usually can\'t; a timeout might.' },
    { q: 'Your app needs a typed record extracted from an email, and nothing should be changed. What is the cleanest design?', options: ['Reuse the create_ticket tool and ignore the side effect','Ask for JSON in the prompt and hope','Give the model every tool and let it choose','Define one extraction tool with no side effects whose schema is the record, and require that tool'], answer: 3, why: 'A side-effect-free tool whose schema is the record gives typed output without risking a real action.' },
    { q: 'A company has 120 internal tools. Loading them all into every request hurts selection and context. What is a sound approach?', options: ['Give each role only the tools it needs, and discover specialised ones when the task calls for them','Load all 120 every time so nothing is missed','Merge all 120 into one generic tool','Let the model write new tools on the fly'], answer: 0, why: 'Fewer, role-scoped tools improve choices; progressive discovery adds specialised ones only when needed, and must still respect who may use them.' },
    { q: 'Two tools both claim to handle refunds and customer accounts. Picks are inconsistent between runs. What is the root cause?', options: ['The temperature is too high', 'The tools overlap, so neither clearly owns the request', 'The model is out of date', 'The schemas use strings'], answer: 1, why: 'When two tools own the same job, the model can only guess. Merge them, or split them by a visible boundary.' },
    { q: 'A tool\'s schema says amount is a number. Is that enough to make a transfer safe?', options: ['Yes: the schema checks everything','Yes, if the description is clear','No: the service must still check the account, the limits and the user\'s authority','No: schemas should be removed'], answer: 2, why: 'A schema checks shape. Ownership, limits and permission are checked by the service when it runs.' },
  ],
  terms: [
    ['Tool contract', 'The name, description, schema and error shape a model sees for a tool.'],
    ['Negative guidance', 'Saying when not to use a tool, so neighbours don\'t overlap.'],
    ['Structured error', 'An error with a category, a retryable flag and a safe next step.'],
    ['Progressive discovery', 'Loading specialised tools only when the task needs them.'],
    ['Least privilege', 'Each role gets only the tools it needs.'],
  ],
  deeper: '<p>Beyond names and descriptions, the input schema carries rules: types, required fields, enums for fixed choices, minimums and maximums, and no extra fields. That makes bad calls hard to even write. But a valid shape is not permission: the service still checks that the account belongs to the caller and the amount is within limits. For exams, prefer answers that fix the interface (distinct tools, clear boundaries, typed schemas, structured errors, fewer tools per role) over answers that add prompt text, retries or a bigger model.</p>',
  code: {
    title: 'A clear contract and a useful error',
    note: 'Tool definitions in the shape the Claude API uses, plus a structured error.',
    text: `
tools = [
  {
    "name": "get_my_account",
    "description": (
      "Read the signed-in caller's own wallet: balance and recent transfers. "
      "Use for questions about the caller's money. "
      "Do not use for refund rules or public facts. Needs the caller signed in."
    ),
    "input_schema": {
      "type": "object",
      "properties": {
        "fields": {"type": "array",
                   "items": {"enum": ["balance", "transfers"]}},
        "limit":  {"type": "integer", "minimum": 1, "maximum": 10},
      },
      "required": ["fields"],
      "additionalProperties": False,
    },
  },
]

def get_my_account(caller, fields, limit=3):
    if not caller.signed_in:
        return {"is_error": True, "category": "authorization",
                "retryable": False,
                "message": "The caller is not signed in.",
                "next": "Ask the caller to sign in, then try again."}
    ...
`,
  },
};
