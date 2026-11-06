// Exam prep, MCP specification reading: six statements a team in Kisumu finds while reviewing a server, each read by a reader with three habits:
// normative keywords count only in capitals (BCP 14), schema.ts wins over prose, and a feature's state (Active, Deprecated, Removed) is separate
// from the revision's state (Draft, Current, Final). Without a habit, the reader misjudges at least one statement. Statements paraphrase the
// 2026-07-28 specification as summarised in the course's protocol brief.
const ST = [
  { s: 'Servers MUST implement server/discover.', key: 'caps', right: 'MUST: a hard requirement', wrong: null },
  { s: '"…a client must not rely on this…" (lower case, in an example)', key: 'caps', right: 'ordinary prose: no normative force', wrong: 'read as MUST NOT' },
  { s: 'Clients SHOULD include clientInfo in _meta.', key: 'caps', right: 'SHOULD: expected unless there is a good reason', wrong: null },
  { s: 'A prose example nests annotations inside the embedded resource; schema.ts puts them beside it.', key: 'schema', right: 'follow schema.ts: annotations sit beside resource', wrong: 'copied the prose example' },
  { s: 'Sampling is Deprecated in 2026-07-28, which is the Current revision.', key: 'life', right: 'still functional; earliest removal on or after 2027-07-28', wrong: 'treated as already removed' },
  { s: 'Authorization, server features, client features and utilities MAY be implemented.', key: 'caps', right: 'optional parts; base protocol, versioning and message patterns are MUST', wrong: null },
];

function run(o) {
  const rows = ST.map((x, i) => {
    let bad = false;
    if (i === 1 && !o.caps) bad = true;
    if (i === 3 && !o.schema) bad = true;
    if (i === 4 && !o.life) bad = true;
    return { x, bad, read: bad ? x.wrong : x.right };
  });
  const wrong = rows.filter(r => r.bad).length;
  return { rows, wrong, ok: wrong === 0 };
}

export default {
  slug: 'exam-mcp-reading-the-specification',
  title: 'Exam prep, MCP: reading the specification',
  description: 'Six statements from a server review, read with three habits: capitals only, schema first, and feature state kept apart from revision state.',
  overview: 'Every fact about MCP traces back to one document: the specification at modelcontextprotocol.io, built from a TypeScript schema. A team that learns from a blog post or from memory of an earlier release drifts from what the current revision requires, and the exam is written against the specification. The specification has a few parts: architecture, the base protocol, versioning and compatibility, message patterns, authorization, server features, client features and utilities, with optional extensions on top. All implementations MUST support the base protocol, versioning and the message patterns; everything else MAY be implemented as the application needs. Message shapes come from schema.ts; the prose pages explain it, and where they seem to disagree, schema.ts wins (schema.json is generated from it and has no authority of its own). Normative language follows BCP 14 (RFC 2119 and RFC 8174): MUST, MUST NOT, SHOULD, SHOULD NOT, MAY and their relatives carry their defined strength only in capitals; the same words in lower case are ordinary prose. A revision, the whole dated document, is Draft, Current or Final; 2026-07-28 is Current and can still take backwards-compatible changes, and its date marks the last day backwards-incompatible changes were made. A feature inside a revision has its own state: Active, Deprecated (still specified and working, with a migration path, and not for new adoption) or Removed. Roots, Sampling, Logging and Dynamic Client Registration are Deprecated in 2026-07-28; a deprecated feature stays at least twelve months from the release of the deprecating revision, and actual removal is a maintainers\' decision. Substantial changes go through Specification Enhancement Proposals (SEPs), which reach Final only with a reference implementation and, where behaviour is observable, a conformance test. JSON-RPC batching, added in 2025-03-26 and removed in 2025-06-18 with no deprecation, is why the policy exists.',
  disclaimer: 'Amaete Build is not affiliated with or endorsed by Anthropic, the Agentic AI Foundation or the Linux Foundation. These are our own practice questions, not live exam items. The official exam guide always takes precedence, and practice scores are raw counts that cannot predict an exam result.',
  keywords: ['mcp certification prep', 'mcpa', 'specification', 'rfc 2119', 'schema.ts', 'deprecation', 'sep', 'exam practice'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.1, 0.25, -0.1], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { caps: true, schema: true, life: true, pick: 1 }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the seven parts of the specification at the back: tall where they are required, low where optional */
    [1, 1, 1, 0, 0, 0, 0].forEach((must, i) => { const b = P.box(0.36, must ? 0.42 : 0.16, 0.3, must ? GOOD : OFF, { r: 0.03 }); b.position.set(-1.5 + i * 0.5, 0, -0.75); S.add(b); });
    /* six statements as pegs on pads: a peg's height is the force the reader gives it */
    const FORCE = [0.5, 0.06, 0.32, 0.32, 0.32, 0.14];
    const rows = ST.map((x, i) => {
      const x0 = -1.55 + i * 0.6, m = new THREE.MeshLambertMaterial({ color: OFF });
      const pad = P.box(0.48, 0.04, 0.48, '#fff', { r: 0.03, material: m }); pad.position.set(x0, 0, 0.1); S.add(pad);
      const peg = P.tower(0.26, 0.26, GOOD, { h: FORCE[i] }); peg.userData.set({ cap: '' }); peg.position.set(x0, 0.04, 0.1); S.add(peg);
      return { m, peg };
    });
    /* three habits: one lamp each */
    const habits = ['caps', 'schema', 'life'].map((k, i) => { const l = P.lamp(GOOD, { h: 0.12, r: 0.08 }); l.position.set(-0.3 + i * 0.45, 0, 0.65); S.add(l); return { k, l }; });
    S.add(P.keep(-1.95, 1.8, 0.8, -1.0, 0.85));
    const parts = rows.map(r => r.peg);

    let R = null;
    function draw() {
      R = run(st);
      R.rows.forEach((r, i) => {
        rows[i].m.color.set(i === st.pick ? SAF : '#E4DED2');
        rows[i].peg.userData.set({ h: r.bad ? (i === 4 ? 0.04 : 0.6) : FORCE[i], color: r.bad ? BAD : GOOD });
      });
      habits.forEach(({ k, l }) => l.userData.set({ color: st[k] ? GOOD : BAD, on: true }));
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Keywords count only in capitals', short: 'Capitals', get: () => st.caps, set: v => set({ caps: !!v }) },
      { type: 'toggle', label: 'schema.ts wins over prose', short: 'Schema first', get: () => st.schema, set: v => set({ schema: !!v }) },
      { type: 'toggle', label: 'Feature state apart from revision state', short: 'Lifecycle', get: () => st.life, set: v => set({ life: !!v }) },
      { type: 'buttons', label: 'Statement', options: ['1', '2', '3', '4', '5', '6'], get: () => st.pick, act: i => set({ pick: i }) },
    ];
    const readouts = [
      { label: 'Misread', get: () => ({ v: `${R.wrong} of 6`, sub: 'statements', good: R.ok, bad: !R.ok }) },
      { label: 'This statement', get: () => ({ v: R.rows[st.pick].bad ? 'misread' : 'right', sub: `number ${st.pick + 1}`, good: !R.rows[st.pick].bad, bad: R.rows[st.pick].bad }) },
    ];
    const labels = [
      { name: 'm', t: 'Specification parts', d: 'Tall: MUST. Low: MAY', icon: 'book', atV: V(-1.74, 0.2, -0.75) },
      { name: 't', t: 'Force you read in', d: 'Red: a misread statement', icon: 'check', atV: V(1.62, 0.2, 0.1) },
    ];
    const reset = () => set({ ...D0, pick: st.pick });
    const breaks = [
      { label: 'Read lower case as a rule', hint: 'only capitals carry force', on: () => set({ ...D0, caps: false, pick: 1 }), off: reset },
      { label: 'Copy the prose example', hint: 'schema.ts is the source', on: () => set({ ...D0, schema: false, pick: 3 }), off: reset },
      { label: 'Treat deprecated as removed', hint: 'it still works', on: () => set({ ...D0, life: false, pick: 4 }), off: reset },
    ];
    function status() {
      const r = R.rows[st.pick];
      if (R.ok) return { ok: true, msg: `<b>Statement ${st.pick + 1}: ${r.x.right}.</b> All six statements are read with the right strength, source and state.` };
      const f = R.rows.map((x, i) => x.bad ? `statement ${i + 1} (${x.x.wrong})` : null).filter(Boolean);
      return { ok: false, msg: `<b>Misread: ${f.join('; ')}.</b> ${!st.caps ? 'Lower-case words in prose carry no normative force. ' : ''}${!st.schema ? 'Where prose and schema.ts disagree, schema.ts wins. ' : ''}${!st.life ? 'Deprecated features are still specified and working until a later revision removes them.' : ''}` };
    }
    return { update: dt => { parts.forEach(p => p.userData.tick(dt)); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One source', home: true, say: 'Everything traces to the specification and its schema, not to a blog post or an old release.', act: m => m.set({ caps: false, schema: false, life: false, pick: 0 }) },
    { t: 'MUST and MAY', home: true, say: 'Every implementation must support the base protocol, versioning and message patterns. The rest is optional.', act: m => m.set({ caps: false, schema: false, life: false, pick: 5 }) },
    { t: 'Capitals only', home: true, say: 'A lower-case must in an example is ordinary prose. Only capitals carry force.', act: m => m.set({ caps: true, schema: false, life: false, pick: 1 }) },
    { t: 'Schema wins', home: true, say: 'When a prose example and the schema disagree, follow the schema.', act: m => m.set({ caps: true, schema: true, life: false, pick: 3 }) },
    { t: 'Deprecated still works', home: true, say: 'A deprecated feature is still specified and working, for at least twelve months.', act: m => m.set({ caps: true, schema: true, life: true, pick: 4 }) },
    { t: 'Should, not must', home: true, say: 'Should means expected unless there is a good reason. All six read correctly now.', act: m => m.set({ caps: true, schema: true, life: true, pick: 2 }) },
  ],
  check: [
    { q: 'A sentence says "a client must not" in lower case. What force does it carry?', options: ['None: it is ordinary prose', 'MUST NOT', 'SHOULD NOT'], answer: 0, why: 'BCP 14 keywords count only in capitals.', hint: 'Try Read lower case as a rule.' },
    { q: 'Prose and schema.ts disagree about a message shape. Which wins?', options: ['schema.ts', 'The prose', 'schema.json'], answer: 0, why: 'schema.json is generated and has no authority.', hint: 'Try Copy the prose example.' },
    { q: 'Sampling is Deprecated in 2026-07-28. Does it still work?', options: ['Yes, until a later revision removes it', 'No, it was removed', 'Only on stdio'], answer: 0, why: 'Feature state is separate from revision state.', hint: 'Try Treat deprecated as removed.' },
  ],
  practice: [
    { q: 'Which parts must every MCP implementation support?', options: ['Base protocol, versioning and message patterns', 'Authorization and utilities', 'Server features only', 'Everything in the specification'], answer: 0, why: 'The rest MAY be implemented.' },
    { q: 'What does a revision\'s date identifier mark?', options: ['The last day backwards-incompatible changes were made', 'Its publication day only', 'The day it becomes Final', 'The SDK release date'], answer: 0, why: 'A Current revision can still take compatible fixes.' },
    { q: 'How long must a feature stay Deprecated before it is eligible for removal?', options: ['At least twelve months from the release of the deprecating revision', 'One release', 'Three months', 'Forever'], answer: 0, why: 'Removal is a maintainers\' decision after that.' },
    { q: 'What does a SEP need before it reaches Final?', options: ['A reference implementation and, for observable behaviour, a conformance test', 'Only a vote', 'A blog post', 'Nothing'], answer: 0, why: 'Proposals are proven before they are final.' },
    { q: 'Why is JSON-RPC batching a cautionary example?', options: ['It was added and removed one release later with no deprecation', 'It was never specified', 'It is still required', 'It is an extension'], answer: 0, why: 'The lifecycle policy prevents that now.' },
    { q: 'Which states can a whole revision be in?', options: ['Draft, Current, Final', 'Active, Deprecated, Removed', 'Alpha, Beta, Stable', 'Open, Closed'], answer: 0, why: 'Features have their own states.' },
  ],
  terms: [
    ['schema.ts', 'The TypeScript schema every message shape comes from.'],
    ['BCP 14', 'RFC 2119 and RFC 8174: normative keywords in capitals.'],
    ['Revision state', 'Draft, Current or Final, for a whole dated specification.'],
    ['Feature state', 'Active, Deprecated or Removed, for one feature.'],
    ['Deprecation window', 'At least twelve months before a feature may be removed.'],
    ['SEP', 'Specification Enhancement Proposal: how the specification changes.'],
  ],
  deeper: '<p><b>Trace a claim.</b> When a summary states a rule, find the sentence in the specification and the SEP that introduced it.</p><p><b>Unspecified is a real answer.</b> Some points the specification leaves open; do not treat them as a single rule.</p><p><b>About this machine.</b> The statements paraphrase the specification; the team is invented.</p>',
  code: {
    title: 'Keyword strength in capitals only',
    note: 'Written for this lesson.',
    text: `
import re
KEYWORDS = ["MUST NOT", "SHALL NOT", "SHOULD NOT", "NOT RECOMMENDED",
            "MUST", "REQUIRED", "SHALL", "SHOULD", "RECOMMENDED", "MAY", "OPTIONAL"]

def strength(sentence):
    for k in KEYWORDS:                                # case-sensitive on purpose
        if re.search(rf"\\b{k}\\b", sentence):
            return k
    return "prose"                                    # lower case carries no force

print(strength("Servers MUST implement server/discover."))   # MUST
print(strength("a client must not rely on this"))            # prose
`,
  },
};
