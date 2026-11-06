// Turn feedback into the system (lessons 46 and 54): a Lusaka clinic-reminder team collects a month of corrections to its coding agent. Each one is
// fingerprinted by cause (not wording), routed to the earliest layer that can stop it recurring, and given an owner and a retirement check. The
// expected repeats next month follow from how strong each layer is; a stale rule for a deleted module is retired with evidence.
const LAYERS = ['test', 'scope', 'automation', 'validator', 'runtime', 'instruction', 'human decision'];
const STRENGTH = { test: 0.95, scope: 0.95, automation: 0.95, validator: 0.9, runtime: 0.9, instruction: 0.6, 'human decision': 0.9 };
const CORR = [
  { said: 'Don\'t edit README', cause: 'task scope allows the repo root', layer: 'scope', n: 3, control: 'docs/ out of scope' },
  { said: 'You changed the README again', cause: 'Task scope allows the repo root.', layer: 'scope', n: 2, control: 'docs/ out of scope' },
  { said: 'Reminder over 160 characters', cause: 'no SMS length check', layer: 'validator', n: 4, control: 'SMS ≤ 160 check' },
  { said: 'An SMS went out at 02:00', cause: 'no quiet-hours test', layer: 'test', n: 2, control: 'quiet-hours test' },
  { said: 'Tests ran before migrations', cause: 'setup is manual', layer: 'automation', n: 5, control: 'init runs migrations' },
  { said: 'Retry storm on gateway timeout', cause: 'no backoff or retry budget', layer: 'runtime', n: 2, control: 'backoff + budget' },
  { said: 'Greet in Bemba in Kasama?', cause: 'language per clinic undecided', layer: 'human decision', n: 1, severe: true, control: 'language decision' },
  { said: 'Say "patient", not "client"', cause: 'local wording', layer: 'instruction', n: 2, control: '"patient" + scenario' },
];
const fingerprint = s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
function ratchet(o) {
  const ctl = new Map();
  CORR.forEach((c, i) => {
    if (!o.promote) return;
    const layer = o.route ? c.layer : 'instruction', key = o.dedup ? fingerprint(c.cause) : fingerprint(c.said);
    if (!ctl.has(key)) ctl.set(key, { key, layer, label: o.dedup || c.layer !== 'scope' ? c.control : i ? 'README rule (2)' : 'README rule', n: 0, from: [], symptom: !o.dedup && c.layer === 'scope' });
    const k = ctl.get(key); k.n += c.n; k.from.push(i);
  });
  const C = [...ctl.values()];
  let repeats = 0;
  CORR.forEach((c, i) => {
    const k = C.find(x => x.from.includes(i));
    const s = !k ? 0 : !o.route ? 0.4 : k.symptom ? 0.5 : STRENGTH[k.layer];
    repeats += c.n * (1 - s);
  });
  const stale = o.promote && !o.retire;
  return { C, repeats, stale, controls: C.length + (stale ? 1 : 0), prose: C.filter(x => x.layer === 'instruction').length };
}

export default {
  slug: 'feedback-ratchet',
  title: 'The feedback ratchet: every correction improves the system',
  description: 'A Lusaka clinic-reminder team turns a month of corrections to its coding agent into durable controls, each at the earliest layer that stops it recurring.',
  overview: 'A correction that lives only in the chat fixes one run; promoted into a test, a boundary, an example or a tool, it improves every later run. Treat each correction as evidence about the work system, not a failure of prompt writing: "don\'t edit that file" means the scope wasn\'t executable; "this output shape is wrong" means a test or example was missing; "setup failed again" means environment knowledge belongs in automation. Route each to the earliest effective layer: a wrong result or regression to a test; an off-scope action to a scope or permission rule; a repeated setup mistake to automation; a format mistake to a canonical example and validator; a timeout or retry storm to a runtime control; an ambiguous convention to an instruction with a scenario check; a product disagreement to a recorded human decision. Earlier is cheaper and stronger: a focused test beats a paragraph asking the agent to remember. Separate cause from symptom: "the agent edited README" has several possible causes, and a rule that repeats the symptom misses the next variant, so fingerprint corrections by cause and promote one control per cause. Promote when recurrence or consequence justifies it, not for every one-off preference. Every control needs an owner, a verification, a review date and a retirement condition: controls decay, conflict and bloat context, and retiring one also needs evidence, such as the module it protected being gone and no hits across a long window. The goal is the smallest system that keeps hard-won judgment.',
  keywords: ['feedback loops', 'agent corrections', 'continuous improvement', 'coding agents', 'AI agents', 'guardrails', 'software engineering'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.05, 0.3, 0], dir: [0.05, 0.85, 1.15], half: 1.2, wide: 6.0 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { promote: true, dedup: true, route: true, retire: true }, st = { ...D0 };
    const CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#D9483B', AMB = '#E3A72F', BLUE = '#5B8DB8';
    /* a month of corrections: a stack per kind, a block per time it was said (blue; red if nothing durable came of it) */
    const CP = i => V(-2.75 + (i % 4) * 0.3, 0, i < 4 ? -0.2 : 0.2);
    const piles = CORR.map((c, i) => { const p = P.stack(0.2, 0.2, 0.07, { max: 5, color: BLUE }); p.position.copy(CP(i)); S.add(p); const rod = P.rod(V(), V(0.1, 0, 0), 0.01, '#8E8C84'); S.add(rod); return { p, rod }; });
    /* seven layers, earliest first: test, scope, automation, validator, runtime, instruction, human decision. A bay each, a block per control placed there
       (green; red for a weak one: a symptom rule or prose that should have been code). Gold: a stale rule for a deleted module */
    const BX = i => -1.25 + i * 0.5;
    const bays = LAYERS.map((l, i) => { const b = P.box(0.42, 0.04, 0.7, l === 'instruction' ? '#F2DDB0' : l === 'human decision' ? '#D9CBE8' : '#CFE6DF', { r: 0.03 }); b.position.set(BX(i), 0, 0); S.add(b);
      return [0, 1, 2].map(k => { const m = new THREE.MeshLambertMaterial({ color: GOOD }), c = P.box(0.3, 0.13, 0.18, '#fff', { r: 0.03, material: m }); c.position.set(BX(i), 0.04 + k * 0.15, 0); S.add(c); return { c, m }; }); });
    /* next month's repeats: a red block per expected repeat */
    const rep = P.stack(0.4, 0.4, 0.06, { max: 22, color: RED }); rep.position.set(2.6, 0.03, 0); S.add(rep);
    S.add(P.keep(-2.95, 2.85, 1.4, -0.45, 0.45));

    let R = null;
    function draw() {
      R = ratchet(st);
      const where = {};
      bays.forEach((blocks, li) => {
        const L = LAYERS[li], mine = R.C.filter(c => c.layer === L);
        const show = mine.length > 3 ? [{ many: true, from: mine.flatMap(m => m.from) }, { many: true, from: [] }, { many: true, from: [] }] : mine.slice();
        if (L === 'scope' && st.promote && !st.retire) show.push({ stale: true, from: [] });
        blocks.forEach((bk, k) => { const c = show[k], on = !!c; bk.c.visible = on; if (!on) return; c.from.forEach(i => { where[i] = V(BX(li), 0.1, 0); });
          bk.m.color.set(c.stale ? AMB : c.many || c.symptom || !st.route ? RED : GOOD); });
      });
      CORR.forEach((c, i) => { const to = where[i], pl = piles[i]; pl.p.userData.set({ n: c.n, colors: Array(5).fill(to ? BLUE : RED) }); pl.rod.visible = !!to; if (to) P.setRod(pl.rod, CP(i).clone().setY(0.05), to); });
      rep.userData.set({ n: Math.round(R.repeats), colors: Array(22).fill(RED) });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Promote corrections into the system', short: 'Promote', get: () => st.promote, set: v => set({ promote: !!v }) },
      { type: 'toggle', label: 'Match corrections by cause, not wording', short: 'By cause', get: () => st.dedup, set: v => set({ dedup: !!v }) },
      { type: 'toggle', label: 'Route each to the earliest layer that can stop it', short: 'Earliest layer', get: () => st.route, set: v => set({ route: !!v }) },
      { type: 'toggle', label: 'Retire rules with evidence they no longer protect anything', short: 'Retire', get: () => st.retire, set: v => set({ retire: !!v }) },
    ];
    const readouts = [
      { label: 'Repeats next month', get: () => ({ v: `about ${Math.round(R.repeats)}`, sub: `of ${CORR.reduce((a, c) => a + c.n, 0)} this month`, good: R.repeats < 3, bad: R.repeats >= 3 }) },
      { label: 'Controls', get: () => ({ v: String(R.controls), sub: R.stale ? 'one is stale' : 'each with an owner', bad: R.stale }) },
      { label: 'Written as prose', get: () => ({ v: String(R.prose), sub: R.prose > 1 ? 'paragraphs to remember' : 'with a scenario check', bad: R.prose > 1, good: R.prose <= 1 }) },
    ];
    const labels = [
      { name: 'corr', t: 'A month of corrections', d: 'A block each time. Red: nothing changed', icon: 'info', atV: V(-2.85, 0.2, 0.3) },
      { name: 'layers', t: 'Seven layers', d: 'Test, scope, automation … person. Red: weak', icon: 'box', atV: V(BX(0), 0.2, 0.35) },
      { name: 'rep', t: 'Repeats next month', d: 'A block per expected repeat', icon: 'reset', atV: V(2.8, 0.2, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Leave the corrections in the chat', hint: 'nothing promoted', on: () => set({ ...D0, promote: false }), off: reset },
      { label: 'Write every fix as an instruction', hint: 'prose for everything', on: () => set({ ...D0, route: false }), off: reset },
      { label: 'Write one rule per symptom', hint: 'match by wording', on: () => set({ ...D0, dedup: false }), off: reset },
    ];
    const total = CORR.reduce((a, c) => a + c.n, 0);
    function status() {
      if (!st.promote) return { ok: false, msg: `<b>Every correction stayed in the chat, so each fixed one run: all ${total} are expected back next month.</b> A correction is evidence that a boundary, test or tool was missing. Promote it, or it is telemetry nobody owns.` };
      if (!st.route) return { ok: false, msg: `<b>All ${R.C.length} fixes became paragraphs in the instruction file, and about ${Math.round(R.repeats)} corrections come back.</b> Asking the agent to remember is the weakest layer. The 02:00 SMS needs a test, the README edits a scope rule, the migrations an init script, the retry storm a runtime budget.` };
      if (!st.dedup) return { ok: false, msg: '<b>"Don\'t edit README" and "you changed the README again" became two rules that repeat the symptom.</b> The cause is that the task scope allows the repository root; the next variant, an edit to CHANGELOG, slips past both. Fingerprint by cause and promote one control.' };
      if (!st.retire) return { ok: false, msg: '<b>The legacy_fax/ rule protects a module deleted in March, with no hits in 26 weeks, and it still costs context and once blocked a legitimate rename.</b> Retire it, with that evidence recorded: the goal is the smallest system that keeps the judgment.' };
      return { ok: true, msg: `<b>${R.C.length} controls for 7 causes, each at the earliest layer that can stop it, with an owner and a review date; one rule written as prose, with a scenario check; the stale legacy_fax/ rule retired with evidence.</b> About ${Math.round(R.repeats)} of ${total} corrections are expected back next month.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A month of corrections', home: true, say: 'A clinic-reminder team in Lusaka has corrected its coding agent twenty-one times this month. Left in the chat, each fix lasts one run.', act: m => m.set({ promote: false, dedup: true, route: true, retire: true }) },
    { t: 'Corrections are evidence', home: true, say: 'Each correction shows something the system lacked. Promoted as paragraphs for the agent to remember, most come back anyway.', act: m => m.set({ promote: true, dedup: true, route: false, retire: true }) },
    { t: 'The earliest layer', home: true, say: 'Route each to the earliest layer that can stop it: the night-time message to a test, the setup to a script, the retry storm to a runtime limit.', act: m => m.set({ promote: true, dedup: true, route: true, retire: true }) },
    { t: 'Cause, not symptom', home: true, say: 'Two corrections about the README share one cause: the task allowed the whole repository. One rule per symptom would miss the next file.', act: m => m.set({ promote: true, dedup: false, route: true, retire: true }) },
    { t: 'Controls decay', home: true, say: 'A rule protecting a deleted module still costs context. Retire it, with the evidence that it protects nothing.', act: m => m.set({ promote: true, dedup: true, route: true, retire: false }) },
    { t: 'A ratchet', home: true, say: 'Every correction now tightens the system once, with an owner and a review date. The next run starts stronger.', act: m => m.set({ promote: true, dedup: true, route: true, retire: true }) },
  ],
  check: [
    { q: 'An agent sent an SMS at 02:00. Where should the correction go?', options: ['A quiet-hours test', 'A paragraph in the instructions', 'Leave it in the chat'], answer: 0, why: 'A wrong result belongs in a test.', hint: 'Look at the test row.' },
    { q: 'Why fingerprint corrections by cause rather than wording?', options: ['A rule that repeats the symptom misses the next variant', 'It is faster', 'Wording never repeats'], answer: 0, why: 'One cause, one control.', hint: 'Try Write one rule per symptom.' },
    { q: 'When is it right to retire a control?', options: ['With evidence it no longer protects a real risk', 'When it feels old', 'Never'], answer: 0, why: 'Retiring also needs evidence.', hint: 'Turn off Retire.' },
  ],
  terms: [
    ['Ratchet', 'A loop where each correction tightens the system once and stays.'],
    ['Earliest effective layer', 'The first place a failure can be made impossible or caught.'],
    ['Fingerprint', 'A normalised key for a cause, so differently worded corrections merge.'],
    ['Symptom rule', 'A rule that repeats what went wrong rather than why.'],
    ['Retirement condition', 'The evidence that a control can be removed.'],
    ['Owner', 'The one person accountable for a control.'],
  ],
  deeper: '<p><b>When to promote.</b> Promote when recurrence or consequence justifies permanent complexity; the clinic language question is promoted after one occurrence because it is a product decision with real consequences.</p><p><b>Product and agent feedback share the loop.</b> User evidence changes the outcome frame and the slice; agent corrections change tests, context, scope and automation. Incidents can change both.</p><p><b>About this machine.</b> The corrections, counts and layer strengths are fixed estimates; the fingerprints, routing and expected repeats are computed live.</p>',
  code: {
    title: 'Promote by cause, to the earliest layer',
    note: 'Adapted from the course\'s feedback ratchet (code/main.py).',
    text: `
TARGET = {"wrong_result": "test", "off_scope": "scope", "setup": "automation",
          "format": "example+validator", "timeout": "runtime",
          "convention": "instruction+scenario", "product": "human decision"}

def normalize_cause(cause):
    words = re.sub(r"[^a-z0-9 ]", "", cause.lower()).split()
    return " ".join(words)

def ratchet(corrections):
    promoted = {}
    for c in corrections:
        if c.recurrence < 2 and not c.severe:
            continue                           # a one-off preference stays a note
        key = normalize_cause(c.cause)          # cause, not wording
        ctl = promoted.setdefault(key, Control(key, TARGET[c.kind], owner=c.owner,
                                               review_after_days=90))
        ctl.recurrence += c.recurrence
    return list(promoted.values())
`,
  },
};
