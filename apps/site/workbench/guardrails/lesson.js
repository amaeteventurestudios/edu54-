// Guardrails: a microfinance bank's assistant in Mombasa. 1,000 requests: 850 ordinary, 30 direct injections, 20 indirect injections (hidden in a document it reads),
// 25 jailbreaks, 25 off-topic, 30 people pasting card or ID numbers. The model itself slips too: 2.5% of ordinary answers state a wrong balance, 1% leak another customer's details.
// Input checks: topic (catches off-topic 70/92/98% and jailbreaks 20/40/60% when loose/normal/strict; wrongly blocks 0.5/2/12% of ordinary requests), injection classifier
// (direct 90%, jailbreaks 50%, indirect 10% because the attack is in the document, 1.5% false alarms), personal-data redaction (95%).
// The model obeys a direct injection 40% of the time, an indirect one 50%, and refuses 70% of jailbreaks that reach it.
// Output checks: moderation (harmful text 85%, 0.5% false alarms), personal-data scrub (leaks 90%), fact check against account records (wrong balances 90%, 1% false alarms),
// canary and link check (a leaked system prompt or a link to an unknown site, 95% direct / 85% indirect). Latency in milliseconds: 10, 15, 5 | 100, 5, 30, 1.
const L = [
  ['topic', 'Topic check', 10, 'in'], ['inject', 'Injection check', 15, 'in'], ['pii', 'Redact personal data', 5, 'in'],
  ['mod', 'Moderation', 100, 'out'], ['scrub', 'Scrub personal data', 5, 'out'], ['fact', 'Check against records', 30, 'out'], ['canary', 'Canary and link check', 1, 'out'],
];
const MIX = [['ok', 850], ['direct', 30], ['indirect', 20], ['jail', 25], ['off', 25], ['piiin', 30]];
const TOPIC = [[0.7, 0.2, 0.005], [0.92, 0.4, 0.02], [0.98, 0.6, 0.12]];
let seed = 29; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const REQ = [];
MIX.forEach(([t, n]) => { for (let i = 0; i < n; i++) REQ.push({ t, u: Array.from({ length: 10 }, rnd), bal: rnd() < 0.025, leak: rnd() < 0.01 }); });
for (let i = REQ.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [REQ[i], REQ[j]] = [REQ[j], REQ[i]]; }
const N = REQ.length;
function run(st) {
  const on = k => !!st[k], [tOff, tJail, tFp] = TOPIC[st.strict];
  const fate = REQ.map(q => {
    const u = q.u;
    /* input checks */
    if (on('topic')) { const p = q.t === 'off' ? tOff : q.t === 'jail' ? tJail : q.t === 'direct' ? 0.3 : q.t === 'ok' || q.t === 'piiin' ? tFp : 0; if (u[0] < p) return { at: 'topic', bad: q.t !== 'ok' && q.t !== 'piiin' }; }
    if (on('inject')) { const p = q.t === 'direct' ? 0.9 : q.t === 'jail' ? 0.5 : q.t === 'indirect' ? 0.1 : q.t === 'ok' || q.t === 'piiin' ? 0.015 : 0; if (u[1] < p) return { at: 'inject', bad: q.t !== 'ok' && q.t !== 'piiin' }; }
    let piiStored = q.t === 'piiin' && !(on('pii') && u[2] < 0.95);
    /* the model */
    let issue = null;
    if (q.t === 'direct' && u[3] < 0.4) issue = 'promptleak';
    else if (q.t === 'indirect' && u[3] < 0.5) issue = 'exfil';
    else if (q.t === 'jail' && u[3] >= 0.7) issue = 'harmful';
    else if (q.t === 'off') issue = 'offtopic';
    else if (q.t === 'ok' && q.bal) issue = 'balance';
    else if (q.t === 'ok' && q.leak) issue = 'leak';
    /* output checks */
    const fp = (k, p, i) => on(k) && !issue && u[i] < p;
    if (on('mod') && issue === 'harmful' && u[4] < 0.85) return { at: 'mod', bad: true };
    if (fp('mod', 0.005, 4)) return { at: 'mod', bad: false };
    if (on('scrub') && issue === 'leak' && u[5] < 0.9) return { at: 'scrub', bad: true };
    if (on('fact') && issue === 'balance' && u[6] < 0.9) return { at: 'fact', bad: true };
    if (fp('fact', 0.01, 6)) return { at: 'fact', bad: false };
    if (on('canary') && (issue === 'promptleak' && u[7] < 0.95 || issue === 'exfil' && u[7] < 0.85)) return { at: 'canary', bad: true };
    const harm = issue && issue !== 'offtopic' ? issue : piiStored ? 'pii' : null;
    return { at: 'user', harm, off: issue === 'offtopic' };
  });
  const harm = fate.filter(f => f.harm).length, offs = fate.filter(f => f.off).length;
  const refused = fate.filter(f => f.at !== 'user' && !f.bad).length;
  const byHarm = {}; fate.forEach(f => { if (f.harm) byHarm[f.harm] = (byHarm[f.harm] || 0) + 1; });
  const lat = L.reduce((a, l) => a + (on(l[0]) ? l[2] : 0), 0);
  const caught = {}; L.forEach(l => caught[l[0]] = fate.filter(f => f.at === l[0]).length);
  return { fate, harm, offs, refused, byHarm, lat, caught };
}
const HARM = { promptleak: 'system prompt leaked', exfil: 'data sent to an attacker\'s link', harmful: 'harmful text', balance: 'wrong balance stated', leak: 'another customer\'s details', pii: 'card or ID numbers kept in logs' };

export default {
  slug: 'guardrails',
  title: 'Guardrails: layers that catch what others miss',
  description: 'A bank assistant in Mombasa gets a thousand requests, some of them attacks. Stack checks before and after the model; each layer catches what others miss.',
  overview: 'Guardrails are checks around a model: before it, on what users send, and after it, on what it says. Input checks catch off-topic requests, prompt injections ("ignore your instructions…"), jailbreaks dressed up as role play, and personal data such as card numbers that should be redacted before they are stored. Output checks catch harmful text, personal data the model repeats from its context, claims that disagree with your records, and signs of a successful attack, such as a secret canary word from the system prompt appearing in a reply, or a link to an unknown site. No layer is perfect, and some attacks never touch the inputs: an indirect injection hides in a document or email the model reads, so only the output checks can see its effect. Defence in depth means stacking cheap, fast checks first and slower ones later, so the holes in one layer are covered by another. Every check also has false alarms, and a filter tuned too strictly turns away honest customers. Measure both: harm that gets through, and good requests refused.',
  keywords: ['LLM guardrails', 'prompt injection', 'jailbreak', 'content moderation', 'PII redaction', 'defence in depth', 'indirect prompt injection'],
  orient: 'landscape',
  view: { target: [0, 0.4, -0.1], dir: [0.4, 0.85, 1.3], half: 1.9, wide: 6.4 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { topic: true, inject: true, pii: true, mod: true, scrub: true, fact: true, canary: true, strict: 1 }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', SAF = '#F2AE0C', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F';
    /* the line of checks: requests leave the hopper, pass the input walls, the model, then the output walls; each wall drops what it stops into its tray */
    const LZ = -0.55, X0 = -2.55, DX = 0.44, MODX = X0 + 3 * DX + 0.1;
    const lx = i => i < 3 ? X0 + i * DX : X0 + (i + 1) * DX + 0.2;
    const line = P.box(lx(6) - X0 + 0.9, 0.02, 0.16, '#D9D4C7', { r: 0.02 }); line.position.set((X0 - 0.45 + lx(6) + 0.45) / 2, 0, LZ); S.add(line);
    const src = P.box(0.34, 0.3, 0.4, '#FFFFFF', { r: 0.05 }); src.position.set(X0 - 0.45, 0, LZ); S.add(src);
    const model = P.robot(CHAR, { scale: 0.95 }); model.position.set(MODX + 0.12, 0, LZ - 0.05); S.add(model);
    const gates = L.map((l, i) => {
      const x = lx(i), mm = new THREE.MeshLambertMaterial({ color: l[3] === 'in' ? SAF : '#7A5CC4' }), g = P.box(0.07, 0.42, 0.5, '#fff', { r: 0.02, material: mm }); g.position.set(x, 0, LZ); S.add(g);
      const bin = P.box(0.38, 0.06, 0.62, '#F3E6E1', { r: 0.03 }); bin.position.set(x, 0, 0.2); S.add(bin);
      return { g, mm, x };
    });
    /* what reaches the customer, and two towers: harm that got through, honest requests refused */
    const UX = 1.86, uPad = P.box(0.86, 0.03, 1.9, '#FFFFFF', { r: 0.03 }); uPad.position.set(UX, 0, -0.12); S.add(uPad);
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), N); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const dummy = new THREE.Object3D(), col = new THREE.Color();
    const RX = 2.72, harmTw = P.tower(0.5, 0.5, RED, { size: 0.26 }), refTw = P.tower(0.5, 0.5, '#9A968C', { size: 0.26 });
    harmTw.position.set(RX, 0, 0.45); refTw.position.set(RX, 0, -0.6); S.add(harmTw, refTw);
    S.add(P.keep(-3.05, 3.0, 1.5, -0.95, 0.75));
    let R = null, clock = 0, slot = [];
    function place() {
      const cnt = {};
      slot = R.fate.map(f => { const k = f.at; cnt[k] = (cnt[k] || 0) + 1; return cnt[k] - 1; });
    }
    function tiles() {
      R.fate.forEach((f, i) => {
        let tx, tz, cols = 5, n = slot[i];
        if (f.at === 'user') { cols = 22; tx = UX + ((n % cols) - (cols - 1) / 2) * 0.036; tz = -0.95 + Math.floor(n / cols) * 0.042; }
        else { const g = gates[L.findIndex(l => l[0] === f.at)]; tx = g.x + ((n % cols) - (cols - 1) / 2) * 0.07; tz = -0.04 + Math.floor(n / cols) * 0.07; }
        const stopX = f.at === 'user' ? lx(6) + 0.3 : gates[L.findIndex(l => l[0] === f.at)].x;
        const t = Math.max(0, Math.min(1, (clock - (i / N) * 2.2) / 1.0));
        let x, z, y;
        if (t <= 0) { x = X0 - 0.45; z = LZ; y = 0.18; }
        else if (t < 0.6) { x = X0 - 0.45 + (stopX - X0 + 0.45) * (t / 0.6); z = LZ; y = 0.05; }
        else { const v = (t - 0.6) / 0.4; x = stopX + (tx - stopX) * v; z = LZ + (tz - LZ) * v; y = 0.05 - 0.02 * v; }
        const s = f.at === 'user' ? 0.03 : 0.055;
        dummy.position.set(x, y, z); dummy.scale.set(s, f.at === 'user' ? 0.03 : 0.05, s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix);
        im.setColorAt(i, col.set(t < 0.6 ? '#FFFFFF' : f.at === 'user' ? (f.harm ? RED : f.off ? SAF : '#A8D9CF') : f.bad ? BAD : '#B9B4A8'));
      });
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    }
    function draw() {
      R = run(st); place(); clock = 0;
      gates.forEach((g, i) => { g.g.visible = !!st[L[i][0]]; });
      harmTw.userData.set({ h: 0.05 + Math.min(1, R.harm / 80) * 1.3, cap: `${R.harm}`, color: R.harm > 20 ? RED : R.harm <= 6 ? GOOD : SAF });
      refTw.userData.set({ h: 0.05 + Math.min(1, R.refused / 80) * 1.3, cap: `${R.refused}`, color: R.refused > 60 ? RED : R.refused <= 40 ? '#9A968C' : SAF });
      tiles();
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const update = dt => { model.userData.tick(dt); harmTw.userData.tick(dt); refTw.userData.tick(dt); model.userData.set({ busy: clock < 3.4 }); if (clock > 3.4) return; clock += dt; tiles(); };
    const controls = [
      ...L.map(l => ({ type: 'toggle', label: l[1], get: () => !!st[l[0]], set: v => set({ [l[0]]: !!v }), quick: false })),
      { type: 'buttons', label: 'Topic check strictness', options: ['Loose', 'Normal', 'Strict'], get: () => st.strict, act: i => set({ strict: i }) },
      { type: 'button', label: 'Send the 1,000 again', act: () => { clock = 0; tiles(); } },
    ];
    const readouts = [
      { label: 'Harm got through', get: () => ({ v: `${R.harm}`, sub: 'of 1,000 requests', bad: R.harm > 20, good: R.harm <= 6 }) },
      { label: 'Honest refused', get: () => ({ v: `${R.refused}`, sub: 'false alarms', bad: R.refused > 60, good: R.refused <= 40 }) },
      { label: 'Added time', get: () => ({ v: `${R.lat} ms`, sub: 'per request' }) },
    ];
    const labels = [
      { name: 'in', t: 'Input checks', d: 'Gold walls, before the model; trays hold what each stops', icon: 'eye', atV: V(-2.72, 0.15, LZ) },
      { name: 'out', t: 'Output checks', d: 'Purple walls, after the model sees and answers', icon: 'check', atV: V(lx(5), 0.42, LZ) },
      { name: 'refused', t: 'Honest refused', d: 'Grey tiles in the trays: false alarms', icon: 'stop', atV: V(RX + 0.25, 0.5, -0.6) },
      { name: 'harm', t: 'Harm got through', d: 'Red tiles on the pad reached a customer', icon: 'target', atV: V(RX + 0.25, 0.15, 0.45) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Check inputs only', hint: 'nothing after the model', on: () => set({ ...D0, mod: false, scrub: false, fact: false, canary: false }), off: reset },
      { label: 'Topic check too strict', hint: 'refuse anything unusual', on: () => set({ ...D0, strict: 2 }), off: reset },
      { label: 'Trust one classifier', hint: 'only the injection check', on: () => set({ topic: false, inject: true, pii: false, mod: false, scrub: false, fact: false, canary: false, strict: 1 }), off: reset },
    ];
    function status() {
      const full = run(D0), h = Object.entries(R.byHarm).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${HARM[k]}`).join(', ');
      const outsOff = !st.mod && !st.scrub && !st.fact && !st.canary;
      if (outsOff && st.topic) return { ok: false, msg: `<b>Inputs only: ${R.harm} harms reach customers (${h}).</b> Indirect injections hide in documents the model reads, and wrong balances and leaked details come from the model itself; none of them shows in what the user typed. Check outputs too: ${full.harm} with every layer.` };
      if (st.strict === 2) return { ok: false, msg: `<b>Topic check too strict: ${R.refused} honest customers refused, against ${full.refused} at normal strictness.</b> It stops a few more off-topic requests and jailbreaks, but every false alarm is a customer turned away. Harm through: ${R.harm} (normal: ${full.harm}). Tune each check on real traffic for both numbers.` };
      const onCount = L.filter(l => st[l[0]]).length;
      if (onCount <= 2) return { ok: false, msg: `<b>${onCount === 0 ? 'No guardrails' : 'One or two checks'}: ${R.harm} harms reach customers (${h || 'none'}).</b> An injection classifier stops most direct "ignore your instructions" attempts, but not role-play jailbreaks it misjudges, attacks hidden in documents, pasted card numbers or the model's own mistakes. Each layer has holes; stacked, they cover each other: ${full.harm} with all of them.` };
      const off = L.filter(l => !st[l[0]]).map(l => l[1].toLowerCase());
      return { ok: R.harm <= 6 && R.refused <= 40 ? true : undefined, msg: `<b>${R.harm} harms reach customers, ${R.refused} honest requests refused, ${R.lat} ms added.</b> ${off.length ? `Off: ${off.join(', ')}. ` : ''}${h ? `What still gets through: ${h}. ` : ''}No layer is perfect, so cheap checks run first, slower ones after, and outputs are checked because some attacks never show in the input.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'No guardrails', home: true, say: 'A microfinance bank\'s assistant in Mombasa gets a thousand requests. Most are ordinary, some are attacks, some paste card numbers, and the model slips now and then. With no checks, all of it reaches customers.', act: m => m.set({ topic: false, inject: false, pii: false, mod: false, scrub: false, fact: false, canary: false, strict: 1 }) },
    { t: 'Check what comes in', home: true, say: 'Before the model: a topic check, an injection classifier, and redaction of card and ID numbers. Most direct attacks stop here.', act: m => m.set({ topic: true, inject: true, pii: true }) },
    { t: 'Some attacks hide in documents', home: true, say: 'But an indirect injection hides in a document the model reads, and wrong balances come from the model itself. Neither shows in what the user typed.', act: m => m.set({ topic: true }) },
    { t: 'Check what goes out', home: true, say: 'After the model: moderation, a personal-data scrub, a check against the bank\'s records, and a canary word that reveals a leaked system prompt. Each layer catches what the others missed.', act: m => m.set({ mod: true, scrub: true, fact: true, canary: true }) },
    { t: 'Too strict', home: true, say: 'Turn the topic check up to strict, and it stops a little more, but dozens of honest customers are turned away. False alarms are a cost too.', act: m => m.set({ strict: 2 }) },
    { t: 'Layers, tuned', home: true, say: 'Back to normal strictness. Cheap checks first, slower ones after, both sides of the model, each tuned on real traffic. Some harm still gets through; no layer is perfect.', act: m => m.set({ strict: 1 }) },
  ],
  check: [
    { q: 'Why can\'t input checks catch an indirect prompt injection?', options: ['The attack is in a document the model reads, not in what the user typed', 'Input checks are too slow', 'Indirect injections are harmless'], answer: 0, why: 'Only output checks see what the hidden instruction made the model do.', hint: 'Try Check inputs only.' },
    { q: 'What is the cost of a very strict topic filter?', options: ['Honest requests get refused', 'It is slower than the model', 'Nothing'], answer: 0, why: 'Every false alarm is a customer turned away.', hint: 'Try Topic check too strict.' },
    { q: 'What does a canary word in the system prompt reveal?', options: ['If it appears in a reply, the system prompt leaked', 'Which user sent the request', 'Whether the model is fast'], answer: 0, why: 'A cheap check that an injection succeeded.', hint: 'Read about the output checks.' },
  ],
  terms: [
    ['Guardrail', 'A check before or after a model that blocks, rewrites or flags a request or reply.'],
    ['Prompt injection', 'Text that tries to override the model\'s instructions.'],
    ['Indirect injection', 'An injection hidden in content the model reads, such as a web page or email.'],
    ['Jailbreak', 'A trick, often role play, to get a model past its safety training.'],
    ['PII', 'Personally identifiable information, such as ID or card numbers.'],
    ['Canary token', 'A secret word in the system prompt; seeing it in a reply means the prompt leaked.'],
    ['Defence in depth', 'Several imperfect layers stacked so one covers another\'s holes.'],
  ],
  deeper: '<p><b>Tools.</b> Open safety classifiers such as Llama Guard screen inputs and outputs against a list of harm categories; moderation endpoints from model providers score text in seconds; Presidio finds and redacts personal data; rule frameworks such as NeMo Guardrails keep a conversation to allowed topics.</p><p><b>Limit what the model can do.</b> The surest defence against injection is a model that can\'t do much harm when fooled: tools with narrow permissions, a person to confirm payments, no links rendered from untrusted text, and retrieved documents treated as data.</p><p><b>Watch it live.</b> Log what each layer stops, review samples of both harm and false alarms each week, and add new attack patterns to your tests as you see them.</p><p><b>About this machine.</b> Catch and false-alarm rates for each check, and how often the model obeys an attack, are set in the file header; every request\'s fate is drawn once from fixed random numbers, so a change you make is the only thing that moves the tiles.</p>',
  code: {
    title: 'Guardrails on both sides',
    note: 'Adapted from the course\'s guardrails lesson.',
    text: `
CANARY = "kifaru-7731"                      # hidden in the system prompt

def answer(user_text, account):
    if not on_topic(user_text):
        return "I can help with your account, loans and savings."
    if injection_score(user_text) > 0.8:
        return "I can't help with that request."
    user_text = redact_pii(user_text)       # card and ID numbers

    reply = call_model(SYSTEM + CANARY, user_text, docs=search(user_text))

    if CANARY in reply or has_unknown_links(reply):
        return alert_and_refuse(reply)
    if moderation(reply).flagged:
        return "Sorry, I can't share that."
    reply = scrub_pii(reply, keep=account.owner)
    if not balances_match(reply, account):
        return regenerate_with(account.facts)
    return reply
`,
  },
};
