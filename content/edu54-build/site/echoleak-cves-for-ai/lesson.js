// EchoLeak and CVEs for AI (phase 18, lesson 25): the first widely known zero-click production case of indirect injection. A red ball moves along five links, from an email to data leaving the building. Defences each break one link.
// It is shown in outline only. The new class is an LLM scope violation: untrusted input reaches privileged data and a way out. Disclosure is the second lesson: AI bugs now get CVEs and scores like any other.
const LINK = ['Mail arrives', 'Retrieved', 'Instructions run', 'Reads private data', 'Leaves the building'];
function run(o) {
  let stop = 5;
  if (o.scope) stop = Math.min(stop, 3);
  if (o.sanitize) stop = Math.min(stop, 2);
  if (o.egress) stop = Math.min(stop, 4);
  if (o.isolate) stop = Math.min(stop, 1);
  return { stop, leak: stop === 5, cvss: o.rate ? 9.3 : 4.3 };
}

export default {
  slug: 'echoleak-cves-for-ai',
  title: 'EchoLeak: when an AI bug gets a CVE',
  description: 'One email, no clicks, private data gone. Follow the chain link by link, and see which defence breaks it.',
  overview: 'EchoLeak was a zero-click flaw in an enterprise assistant. An email arrived, nobody opened it, and later a routine question pulled it into context. Hidden instructions then reached private data and sent it out through a domain that the content policy already trusted. Researchers called this an LLM scope violation: untrusted input gains the assistant\'s privileges. It matters for two reasons. It shows injection chained into a working exploit past the filters. And it shows AI bugs entering ordinary security practice, with CVE numbers, severity scores and coordinated disclosure, though early severity ratings were often too low. This lesson traces the chain in outline, for defenders.',
  keywords: ['EchoLeak', 'CVE', 'LLM scope violation', 'zero-click', 'AI security', 'responsible disclosure'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { sanitize: false, scope: true, egress: true, isolate: false, rate: true }, st = { ...D0 };
    const GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C', GREY = '#C9C4B6', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -2.0 + i * 0.86;
    const L = LINK.map((n, i) => { const m = new S.THREE.MeshLambertMaterial({ color: GREY }), b = P.box(0.62, 0.34, 0.62, '#fff', { r: 0.06, material: m }); b.position.set(X(i), 0.03, -0.15); S.add(b); return m; });
    const rail = P.box(3.6, 0.04, 0.08, '#6B6E7E', { r: 0.01 }); rail.position.set(-0.28, 0.42, -0.15); S.add(rail);
    const ball = P.ball(0.13, RED); ball.userData.noFit = true; S.add(ball);
    const vault = P.box(0.6, 0.5, 0.45, '#2C2D31', { r: 0.05 }); vault.position.set(-0.3, 0.03, 0.5); S.add(vault);
    const dial = add(P.dial(0.34)); dial.position.set(1.6, 0.03, 0.5);
    S.add(P.keep(-2.5, 2.1, 0.95, -0.72, 0.8));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      L.forEach((m, i) => m.color.set(i < R.stop ? (R.leak ? '#E07A5F' : '#E8C78A') : i === R.stop ? GOOD : GREY));
      dial.userData.set({ v: R.cvss / 10 });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [
      tg('isolate', 'Keep outside mail out of the assistant\'s retrieval', 'Isolate mail'),
      tg('sanitize', 'Filter instructions out of retrieved mail', 'Filter'),
      tg('scope', 'Untrusted content can\'t reach private data', 'Scope limit'),
      tg('egress', 'Block outbound links, even to trusted domains', 'Block egress'),
      tg('rate', 'Score severity by reach, not by novelty', 'Honest score'),
    ];
    const readouts = [
      { label: 'Chain stops at', get: () => ({ v: R.leak ? 'nowhere' : LINK[R.stop], sub: R.leak ? 'data has left' : `link ${R.stop + 1} of 5`, good: !R.leak, bad: R.leak }) },
      { label: 'Clicks needed', get: () => ({ v: '0', sub: 'the user did nothing' }) },
      { label: 'Severity score', get: () => ({ v: R.cvss.toFixed(1), sub: st.rate ? 'critical' : 'under-rated', good: st.rate, bad: !st.rate }) },
    ];
    const labels = [
      { name: 'l', t: 'Five links', d: 'Teal: where the chain breaks', icon: 'link', atV: V(-2.4, 0.2, -0.15) },
      { name: 'd', t: 'Severity dial', d: 'Early scores were too low', icon: 'target', atV: V(1.95, 0.1, 0.5) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Trust the injection filter', hint: 'it was bypassed', on: () => set({ ...D0, scope: false, egress: false, sanitize: false }), off: reset },
      { label: 'Allow trusted domains out', hint: 'a signed URL can carry data', on: () => set({ ...D0, scope: false, egress: false }), off: reset },
      { label: 'Rate it as a chatbot bug', hint: '"only text"', on: () => set({ ...D0, rate: false }), off: reset },
    ];
    function status() {
      if (R.leak) return { ok: false, msg: '<b>Private data left, and nobody clicked anything.</b> A trusted domain carried it out, so link checks saw nothing wrong. Each step looked normal, and only the chain was dangerous.' };
      if (!st.rate) return { ok: false, msg: `<b>The chain stops, but the score reads ${R.cvss.toFixed(1)}.</b> Low scores lead to slow fixes. Rate by what an attacker can reach: here, a mailbox with no click at all.` };
      return { ok: true, msg: `<b>The chain breaks at "${LINK[R.stop]}".</b> Layers matter because any one may fail. The core fix is scope: untrusted text must never gain the assistant's reach.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u = (u + dt * 0.35) % 1; const end = Math.min(4.6, R.stop); ball.position.set(X(0) + 0.86 * end * u, 0.6, -0.15); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'No clicks', home: true, say: 'An email arrives at a company. Nobody opens it. That is all the attacker needs.', act: m => m.set({ sanitize: false, scope: false, egress: false, isolate: false, rate: true }) },
    { t: 'A routine question', home: true, say: 'Later someone asks the assistant to summarise recent mail, and retrieval pulls that email into context.', act: m => m.set({ sanitize: false, scope: false, egress: false, isolate: false, rate: true }) },
    { t: 'A scope violation', home: true, say: 'Hidden text now acts with the assistant\'s reach, up to private data. Untrusted input gained privileges. That is the new class.', act: m => m.set({ sanitize: false, scope: true, egress: false, isolate: false, rate: true }) },
    { t: 'The way out', home: true, say: 'Data left through a domain already trusted. Allow-lists saw nothing wrong.', act: m => m.set({ sanitize: false, scope: false, egress: true, isolate: false, rate: true }) },
    { t: 'Layers', home: true, say: 'Filters were bypassed, so don\'t rely on one. Break the chain in several places.', act: m => m.set({ sanitize: true, scope: true, egress: true, isolate: false, rate: true }) },
    { t: 'An ordinary CVE', home: true, say: 'AI bugs now get CVE numbers and coordinated disclosure, like other software. Early scores were often too low.', act: m => m.set({ sanitize: true, scope: true, egress: true, isolate: false, rate: false }) },
  ],
  check: [
    { q: 'What is an LLM scope violation?', options: ['Untrusted input gaining the assistant\'s reach', 'A slow model', 'A long prompt'], answer: 0, why: 'Text from outside uses privileges it should never have.', hint: 'See A scope violation.' },
    { q: 'Why did allow-lists fail?', options: ['Data left through a trusted domain', 'They were off', 'They are too slow'], answer: 0, why: 'Trusted domains can carry data too.', hint: 'Try Allow trusted domains out.' },
    { q: 'How should AI vulnerabilities be treated?', options: ['Like other security flaws, with disclosure', 'As chatbot quirks', 'As unfixable'], answer: 0, why: 'They now get CVEs and scores.', hint: 'Try Rate it as a chatbot bug.' },
  ],
  terms: [
    ['Zero-click', 'An attack needing no action from the victim.'],
    ['CVE', 'A public identifier for a security flaw.'],
    ['CVSS', 'A score for how severe a flaw is.'],
    ['Scope violation', 'Untrusted input reaching privileged data.'],
    ['Exfiltration', 'Getting data out.'],
    ['Coordinated disclosure', 'Telling the vendor first, then the public.'],
  ],
  deeper: '<p><b>Reported and patched.</b> EchoLeak was disclosed to the vendor and fixed. The course also covers CamoLeak and a Copilot code-execution flaw.</p><p><b>Build your own check.</b> For each assistant, ask: what untrusted text can it read, what can it reach, and how could data get out? If all three exist, you have this shape.</p><p><b>Scores.</b> The early low score here is illustrative.</p>',
  code: {
    title: 'Audit the three legs',
    note: 'A defensive sketch based on the course (code/main.py).',
    text: `
def risky(assistant):
    reads_untrusted = any(s.external for s in assistant.sources)
    reaches_private = any(s.private for s in assistant.sources)
    can_send_out = assistant.renders_links or assistant.can_fetch
    return reads_untrusted and reaches_private and can_send_out
`,
  },
};
