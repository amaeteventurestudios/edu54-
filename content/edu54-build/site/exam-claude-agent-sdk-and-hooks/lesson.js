// Exam prep, the Agent SDK as a harness: an invented university research office in Ibadan runs a data-cleaning agent with shell and file tools.
// A file it reads contains an injected instruction, and four risky actions follow. Controls come in layers: a rule in the prompt, a pre-tool
// hook that can block a call, a post-tool hook that can inspect and redact a result, and a sandbox that limits files and network below all of
// them. Which layer stops each action follows from its nature; an obfuscated command slips past pattern-matching hooks but not the sandbox.
const ACTS = [
  { n: 'rm -rf ./raw-data', kind: 'delete', stops: ['pre', 'sandbox'] },
  { n: 'cat ~/.ssh/id_ed25519', kind: 'secret', stops: ['pre', 'sandbox'] },
  { n: 'python -c "<encoded upload to an unknown host>"', kind: 'exfil', stops: ['sandbox'] },
  { n: 'tool result contains students\' phone numbers', kind: 'pii', stops: ['post'] },
];
const NAME = { pre: 'pre-tool hook', post: 'post-tool hook', sandbox: 'sandbox' };
function run(o) {
  return ACTS.map(a => { const by = a.stops.find(k => o[k]); return { ...a, by, harm: !by }; });
}

export default {
  slug: 'exam-claude-agent-sdk-and-hooks',
  title: 'Exam prep: the Agent SDK is a harness, not permission',
  description: 'A university\'s data-cleaning agent reads an injected note, and four risky actions follow. See which layer stops each: a prompt rule, hooks or a sandbox.',
  overview: 'An agent SDK gives you a harness: the loop, tool plumbing, sessions, subagents, hooks and permission modes. It does not give you policy or success criteria; those remain yours. Controls belong in layers, each catching what the one above misses. A rule in the system prompt states intent, but it is advisory: a prompt injection inside a document the agent reads can talk the model out of it. Hooks run in your code at fixed points. A pre-tool hook sees each proposed call before it runs and can block it, for example refusing deletes outside an output folder or any read of a credentials path. A post-tool hook sees each result before the model or the logs do, and can inspect or normalise it, for example redacting personal data. Hooks that match patterns can still be fooled by an obfuscated command, so beneath them sits the sandbox: operating-system limits on which files can be read or written and which network destinations can be reached. A restriction enforced by the sandbox holds whatever the model or a hook concluded. Keep critical state outside the model session, so a resumed run can reconcile what already happened before repeating side effects. Use subagents for genuine isolation or parallel work, not to hide an overgrown prompt, and evaluate any change to how work is split against the same test cases. Verify the final state, the files written and the actions taken, independently of what the agent says it did. Managed agent runtimes are a separate choice for when you need them, with their own data boundary to accept. Product features and permission modes change; check the current official documentation. This machine follows an invented research office in Ibadan.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['claude certification prep', 'Agent SDK', 'hooks', 'sandbox', 'prompt injection', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.25, -0.05], dir: [0.05, 1.15, 1.05], half: 1.15, wide: 5.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { prompt: true, pre: true, post: true, sandbox: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', OFF = '#D8D2C4';
    const LAYERS = [{ k: 'prompt', n: 'prompt rule' }, { k: 'pre', n: 'pre-tool hook' }, { k: 'post', n: 'post-tool hook' }, { k: 'sandbox', n: 'sandbox' }];
    /* the agent, with the injected note beside it */
    const bot = P.robot('#5B8DB8', { scale: 0.6 }); bot.position.set(-2.25, 0, -0.1); S.add(bot);
    const inj = P.box(0.3, 0.05, 0.36, BAD, { r: 0.02 }); inj.position.set(-2.25, 0, 0.5); S.add(inj);
    /* four layers as walls: a thin screen for the prompt rule, two hooks, a thick sandbox wall; a layer that is off sinks to the floor */
    const XS = { prompt: -1.3, pre: -0.6, post: 0.1, sandbox: 0.8 }, WC = { prompt: '#A9B8C9', pre: '#3E9B9B', post: '#3E9B9B', sandbox: '#2F5A40' };
    const walls = LAYERS.map(l => { const m = new THREE.MeshLambertMaterial({ color: WC[l.k] }), b = P.box(l.k === 'sandbox' ? 0.22 : l.k === 'prompt' ? 0.04 : 0.1, 1, 1.9, '#fff', { r: 0.01, material: m }); b.position.set(XS[l.k], 0, -0.1); S.add(b); return { b, m, k: l.k }; });
    /* each risky action is a ball on its own lane, stopped by the layer that catches it; the targets are what it is after */
    const LZ = i => -0.82 + i * 0.48, TX = 1.5;
    const acts = ACTS.map((a, i) => {
      const lane = P.box(3.55, 0.02, 0.05, '#C9C4B6', { r: 0.01 }); lane.position.set(-0.3, 0, LZ(i)); S.add(lane);
      const tm = new THREE.MeshLambertMaterial({ color: GOOD }), t = P.box(0.34, 0.34, 0.34, '#fff', { r: 0.05, material: tm }); t.position.set(TX, 0, LZ(i)); S.add(t);
      const bm = new THREE.MeshLambertMaterial({ color: RED }), b = P.ball(0.09, '#fff', { material: bm }); b.position.set(-1.85, 0.12, LZ(i)); b.userData.noFit = true; S.add(b);
      return { b, tm, to: TX - 0.26 };
    });
    S.add(P.keep(-2.55, 1.8, 0.7, -1.15, 0.95));

    let R = null;
    function draw() {
      R = run(st);
      walls.forEach(w => { w.b.scale.y = st[w.k] ? 0.55 : 0.02; w.m.color.set(st[w.k] ? WC[w.k] : OFF); });
      R.forEach((r, i) => { acts[i].to = r.by ? XS[r.by] - 0.2 : TX - 0.26; acts[i].tm.color.set(r.harm ? BAD : GOOD); });
    }
    function isOk() { return R.every(r => !r.harm); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = LAYERS.map(l => ({ type: 'toggle', label: `Layer: ${l.n}`, short: l.n.split(' ')[0].replace('-tool', ''), get: () => st[l.k], set: v => set({ [l.k]: !!v }) }));
    const readouts = [
      { label: 'Stopped', get: () => ({ v: `${R.filter(r => !r.harm).length} of 4`, sub: 'risky actions', good: isOk(), bad: !isOk() }) },
      { label: 'Encoded upload', get: () => ({ v: R[2].harm ? 'sent' : 'blocked', sub: 'only the sandbox catches it', good: !R[2].harm, bad: R[2].harm }) },
      { label: 'Phone numbers', get: () => ({ v: R[3].harm ? 'exposed' : 'redacted', sub: 'post-tool hook', good: !R[3].harm, bad: R[3].harm }) },
    ];
    const labels = [
      { name: 'l', t: 'Layers of control', d: 'Advice, hooks, then the sandbox', icon: 'box', atV: V(-2.45, 0.2, -0.1) },
      { name: 't', t: 'What got through', d: 'Coral: the action hit its target', icon: 'target', atV: V(TX + 0.17, 0.2, LZ(1)) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Rely on the prompt rule alone', hint: 'injection wins', on: () => set({ prompt: true, pre: false, post: false, sandbox: false }), off: reset },
      { label: 'Drop the sandbox', hint: 'encoded command slips past', on: () => set({ ...D0, sandbox: false }), off: reset },
      { label: 'Skip the post-tool hook', hint: 'personal data exposed', on: () => set({ ...D0, post: false }), off: reset },
    ];
    function status() {
      const harms = R.filter(r => r.harm);
      if (!harms.length) return { ok: true, msg: '<b>The pre-tool hook blocks the delete and the key read, the sandbox blocks the encoded upload that no pattern matched, and the post-tool hook redacts the phone numbers before the model or the logs see them.</b> The prompt rule stated intent; the layers below enforced it.' };
      if (harms.length === 4) return { ok: false, msg: '<b>With only a rule in the prompt, the injected note talked the agent out of it: the raw data was deleted, the private key read, the data uploaded and the phone numbers logged.</b> Prompts are advisory; enforce with hooks and a sandbox.' };
      const LBL = { delete: 'the delete', secret: 'the private-key read', exfil: 'the encoded upload', pii: 'the phone numbers' };
      return { ok: false, msg: `<b>${harms.map(h => `${LBL[h.kind]} got through`).join('; ').replace(/^./, c => c.toUpperCase())}.</b> ${harms.some(h => h.kind === 'exfil') ? 'Pattern-matching hooks miss obfuscated commands; put file and network limits in the sandbox, below them.' : 'Inspect and redact tool results in a post-tool hook before the model or logs see them.'}` };
    }
    return { update: dt => { acts.forEach(a => { a.b.position.x += (a.to - a.b.position.x) * Math.min(1, dt * 5); }); bot.userData.tick(dt); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'An injected file', home: true, say: 'A data-cleaning agent reads a note that tells it to ignore its rules. Four risky actions follow.', act: m => m.set({ prompt: true, pre: false, post: false, sandbox: false }) },
    { t: 'Prompts advise', home: true, say: 'A rule in the prompt is advice. The injection argues it away.', act: m => m.set({ prompt: true, pre: false, post: false, sandbox: false }) },
    { t: 'A pre-tool hook', home: true, say: 'Your code sees each call before it runs, and blocks the delete and the key read.', act: m => m.set({ prompt: true, pre: true, post: false, sandbox: false }) },
    { t: 'A post-tool hook', home: true, say: 'Your code sees each result first, and redacts the phone numbers.', act: m => m.set({ prompt: true, pre: true, post: true, sandbox: false }) },
    { t: 'The sandbox', home: true, say: 'An encoded upload slips past the patterns. The sandbox blocks the network anyway.', act: m => m.set({ prompt: true, pre: true, post: true, sandbox: true }) },
    { t: 'A harness, not permission', home: true, say: 'The SDK runs the loop. Policy lives in hooks and limits you control.', act: m => m.set({ prompt: true, pre: true, post: true, sandbox: true }) },
  ],
  check: [
    { q: 'Where should you block a destructive tool call?', options: ['In a pre-tool hook, backed by a sandbox', 'Only in the prompt', 'After it runs'], answer: 0, why: 'Prompts are advisory.', hint: 'Try Rely on the prompt rule alone.' },
    { q: 'What does a post-tool hook do?', options: ['Inspects or redacts a result before the model sees it', 'Blocks calls', 'Writes the prompt'], answer: 0, why: 'Normalise and redact results.', hint: 'Try Skip the post-tool hook.' },
    { q: 'Why keep a sandbox under the hooks?', options: ['Obfuscated commands can slip past pattern matching', 'For speed', 'It replaces the prompt'], answer: 0, why: 'OS limits hold regardless.', hint: 'Try Drop the sandbox.' },
  ],
  practice: [
    { q: 'An agent must never delete files outside ./out. Which control is strongest?', options: ['Sandbox write access to ./out, with a pre-tool hook blocking deletes elsewhere', 'A sentence in the system prompt', 'Asking the model to be careful', 'Reviewing the logs weekly'], answer: 0, why: 'Enforce in code and the OS, not advice.' },
    { q: 'Tool results sometimes contain customer email addresses that then appear in logs. What fixes this?', options: ['A post-tool hook that redacts them before the model and logs see them', 'A pre-tool hook', 'A larger model', 'A longer prompt'], answer: 0, why: 'Results are inspected after the tool runs.' },
    { q: 'A team splits one agent into five subagents to make the prompt shorter. What should they check?', options: ['That the split serves isolation or parallelism, and evaluate it on the same test cases', 'Nothing; shorter is better', 'Only cost', 'Only latency'], answer: 0, why: 'Subagents are not a cure for prompt bloat.' },
    { q: 'A long run crashes and is resumed. What must happen before it repeats a side effect?', options: ['Reconcile durable state to see what already happened', 'Repeat everything from the start', 'Trust the model\'s memory', 'Skip the side effect'], answer: 0, why: 'Critical state lives outside the session.' },
    { q: 'The agent reports "all files cleaned". How should this be confirmed?', options: ['Check the files and actions independently of the agent\'s message', 'Trust the message', 'Ask the agent again', 'Count the words'], answer: 0, why: 'Verify final state, not final prose.' },
    { q: 'What does an agent SDK provide, and what does it not?', options: ['It provides the harness; policy and success criteria are yours', 'It provides permission to act', 'It provides the business rules', 'It replaces testing'], answer: 0, why: 'A harness, not permission.' },
  ],
  terms: [
    ['Agent SDK', 'A library that runs the agent loop, tools and sessions.'],
    ['Pre-tool hook', 'Your code that sees and can block a call before it runs.'],
    ['Post-tool hook', 'Your code that inspects or redacts a result after it runs.'],
    ['Sandbox', 'Operating-system limits on files and network.'],
    ['Prompt injection', 'Instructions hidden in content the agent reads.'],
    ['Durable state', 'Records kept outside the model session for recovery.'],
  ],
  deeper: '<p><b>Computer use.</b> When an agent drives a screen, check a fresh screenshot before each action and after it, and keep consent and consequential clicks with a person.</p><p><b>Managed runtimes.</b> A hosted agent service is chosen for a concrete need, with its own data boundary to accept.</p><p><b>About this machine.</b> The research office and actions are invented.</p>',
  code: {
    title: 'Hooks around a tool call',
    note: 'Written for this lesson; check the current SDK documentation for hook names.',
    text: `
import re

BLOCK = [re.compile(r"\\brm\\s+-rf\\b"), re.compile(r"~/\\.ssh|/etc/shadow")]
PHONE = re.compile(r"\\+?\\d[\\d\\s-]{8,}\\d")

def pre_tool_use(call):
    cmd = call.input.get("command", "")
    if any(p.search(cmd) for p in BLOCK):
        return {"decision": "block", "reason": "destructive or secret path"}
    return {"decision": "allow"}          # the sandbox still limits files and network

def post_tool_use(call, result):
    return PHONE.sub("[phone]", result)   # redact before the model or logs see it
`,
  },
};
