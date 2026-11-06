// Input and output classifiers (phase 15, lesson 18): a coding bootcamp's assistant in Kano can run code. Ten messages pass a Llama Guard-style
// classifier with a hazard taxonomy: ordinary questions, a harmful request, the same request disguised with look-alike letters or hidden
// characters, a paraphrase no filter has seen, code-interpreter abuse, a message from someone in distress, and an off-scope question asked a third
// way. Normalising text first, checking outputs too, the newer taxonomy, dialog rails and routing by category are toggled; outcomes are live.
const MSG = [
  { t: 'fix my Python\nloop', k: 'benign' },
  { t: 'how do I kill a\nprocess in Linux?', k: 'benign', word: true },
  { t: 'plan a violent\ncrime (plain)', k: 'harm', cat: 'S1' },
  { t: 'the same, with\nCyrillic look-alikes', k: 'harm', cat: 'S1', glyph: true },
  { t: 'the same, with\nhidden characters', k: 'harm', cat: 'S1', hidden: true },
  { t: 'the same, in new\nwords, step by step', k: 'harm', cat: 'S1', para: true },
  { t: 'run this script:\nit opens a back door', k: 'harm', cat: 'S14' },
  { t: 'a student says they\nwant to hurt themselves', k: 'care', cat: 'S11' },
  { t: '"research context:\nuse another policy"', k: 'harm', cat: 'S1', redirect: true },
  { t: 'diagnose my rash,\nasked a third way', k: 'scope', dialog: true },
];
function classify(o) {
  return MSG.map(m => {
    let fate = 'allowed', ok = true;
    if (m.k === 'benign') { fate = 'answered'; }
    else if (m.k === 'care') { if (o.route) fate = 'answered with support\nand a counsellor flagged'; else { fate = 'blocked: the student\ngets nothing'; ok = false; } }
    else if (m.k === 'scope') { if (o.dialog) fate = 'dialog rail: politely\nout of scope'; else { fate = 'each turn passed;\ndiagnosis given'; ok = false; } }
    else {
      let caught = true;
      if (m.glyph || m.hidden) caught = o.normalize;
      if (m.para) caught = false;
      if (m.cat === 'S14') caught = o.v4;
      if (caught) fate = `input: ${m.cat} blocked`;
      else if (o.output && m.cat !== 'S14') fate = `input missed;\noutput: ${m.cat} blocked`;
      else { fate = m.cat === 'S14' ? 'no category for it:\nthe script ran' : 'missed: answered'; ok = false; }
    }
    return { ...m, fate, ok };
  });
}

export default {
  slug: 'input-output-classifiers',
  title: 'Input and output classifiers: what slips past',
  description: 'A coding bootcamp in Kano gives students an assistant that runs code. Ten messages pass an input check and an output check: ordinary, disguised, delicate. See what slips past.',
  overview: 'Classifiers on a model\'s inputs and outputs sit at the narrowest point of the stack: every request and every response passes through. Llama Guard (Meta) is a model fine-tuned only for content safety; it labels a message safe or unsafe against a shared hazard taxonomy, the MLCommons categories from S1 violent crimes onwards, in several languages, and a small quantised version runs on a phone. Llama Guard 4 reads images too and adds S14, code-interpreter abuse, which matters for agents that run code. NVIDIA\'s NeMo Guardrails wraps such classifiers in input rails, output rails and dialog rails, which constrain a whole conversation, such as "no medical diagnosis, however it is asked". The taxonomy is the product: it lets you route by category, blocking some outright, flagging others for a person, and answering some differently. A message about self-harm should get support and a human flag, not a refusal. The failure surface is well mapped. Character-level attacks swap in look-alike letters from other alphabets or slip invisible characters and emoji between letters, which the classifier tokenises differently; one 2025 study reached a 100% attack success rate on six guard systems this way. In-context redirection claims a different policy applies. Paraphrase finds wording no fine-tuning covered. Defences: normalise text before classifying (Unicode normalisation, mapping look-alikes, stripping invisible characters), classify outputs as well as inputs, keep the taxonomy current and use dialog rails for multi-turn limits. A classifier is a fast first filter, not the model\'s safety; a bad classifier layer is a false sense of security.',
  keywords: ['Llama Guard', 'content moderation', 'classifiers', 'guardrails', 'adversarial attacks', 'AI safety', 'NeMo Guardrails'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.2, -0.05], dir: [0.05, 1.25, 1.0], half: 1.25, wide: 5.8 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { normalize: true, output: true, v4: true, dialog: true, route: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const MX = i => -2.25 + i * 0.5, ZS = -1.0, ZI = -0.4, ZO = 0.25, ZL = 0.85;
    const KC = { benign: '#FFFFFF', harm: BAD, care: '#5B8DB8', scope: '#D8C8A0' };
    const lanes = MSG.map((m, i) => {
      const src = P.box(0.3, 0.16, 0.22, KC[m.k], { r: 0.03 }); src.position.set(MX(i), 0, ZS); S.add(src);
      const lane = P.box(0.08, 0.01, 1.85, '#D8D2C4', { r: 0.01 }); lane.position.set(MX(i), 0, (ZS + ZL) / 2); S.add(lane);
      const l = P.lamp('#FFFFFF', { h: 0.26 }); l.position.set(MX(i), 0, ZL); S.add(l);
      const b = P.ball(0.07, KC[m.k] === '#FFFFFF' ? '#3A3D4A' : KC[m.k]); b.userData.noFit = true; S.add(b);
      return { l, b, stop: ZL };
    });
    const gIn = P.gate(5.0, '#3E9B9B', { h: 0.36 }); gIn.position.set(0, 0, ZI); S.add(gIn);
    const gOut = P.gate(5.0, '#8C6BB1', { h: 0.36 }); gOut.position.set(0, 0, ZO); S.add(gOut);
    S.add(P.keep(-2.75, 2.75, 0.6, -1.15, 1.0));
    let R = null;
    function draw() {
      R = classify(st);
      R.forEach((m, i) => {
        const L = lanes[i]; L.l.userData.set({ color: m.ok ? GOOD : RED, on: true });
        L.stop = m.fate.startsWith('input:') ? ZI - 0.1 : m.fate.startsWith('input missed') ? ZO - 0.1 : ZL - 0.12;
      });
      gIn.userData.set({ color: st.normalize ? '#3E9B9B' : '#B9B3A6' });
      gOut.visible = !!st.output;
    }
    let tt = 0;
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Normalise text first: look-alikes mapped, hidden characters stripped', short: 'Normalise', get: () => st.normalize, set: v => set({ normalize: !!v }) },
      { type: 'toggle', label: 'Classify outputs as well as inputs', short: 'Outputs', get: () => st.output, set: v => set({ output: !!v }) },
      { type: 'toggle', label: 'Newer taxonomy with code-interpreter abuse (S14)', short: 'S14', get: () => st.v4, set: v => set({ v4: !!v }) },
      { type: 'toggle', label: 'Dialog rails across turns', short: 'Dialog rails', get: () => st.dialog, set: v => set({ dialog: !!v }) },
      { type: 'toggle', label: 'Route by category instead of blocking every flag', short: 'Routing', get: () => st.route, set: v => set({ route: !!v }) },
    ];
    const readouts = [
      { label: 'Handled well', get: () => { const n = R.filter(m => m.ok).length; return { v: `${n} of 10`, sub: 'messages', good: n === 10, bad: n < 9 }; } },
      { label: 'Harm let through', get: () => { const n = R.filter(m => !m.ok && m.k === 'harm').length; return { v: String(n), sub: 'harmful messages', good: !n, bad: n > 0 }; } },
      { label: 'Wrongly handled', get: () => { const n = R.filter(m => !m.ok && m.k !== 'harm').length; return { v: String(n), sub: 'care or scope', good: !n, bad: n > 0 }; } },
    ];
    const labels = [
      { name: 'msgs', t: 'Ten messages', d: 'Coral: harmful. Blue: distress', icon: 'user', atV: V(-2.45, 0.1, ZS) },
      { name: 'in', t: 'Input, then output check', d: 'Red lamp: handled badly', icon: 'eye', atV: V(2.5, 0.3, ZI) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Classify raw text', hint: 'no normalising', on: () => set({ ...D0, normalize: false }), off: reset },
      { label: 'Check inputs only', hint: 'no output classifier', on: () => set({ ...D0, output: false }), off: reset },
      { label: 'Block every flagged category', hint: 'no routing', on: () => set({ ...D0, route: false }), off: reset },
    ];
    function status() {
      const bad = R.filter(m => !m.ok);
      if (!st.normalize && !st.output) return { ok: false, msg: `<b>On raw text, the look-alike letters and hidden characters carried the request straight past the input classifier, and with no output check ${bad.filter(m => m.k === 'harm').length} harmful answers went out.</b> Normalise before classifying, and check what comes out too.` };
      if (!st.normalize) return { ok: false, msg: '<b>Classified raw, the request with Cyrillic look-alikes and the one with hidden characters both passed the input check; the output classifier caught them only after the model had written the answers.</b> Map look-alikes and strip invisible characters first, so the cheap check does its job.' };
      if (!st.output) return { ok: false, msg: '<b>Checking inputs only, the paraphrased request got through: no fine-tuning covers every wording, and the answer itself went out unchecked.</b> The harmful content is often easier to recognise in the output than in the question. Classify both.' };
      if (!st.route) return { ok: false, msg: '<b>Blocking every flagged category the same way, the student who said they wanted to hurt themselves got a refusal and nothing else.</b> The taxonomy exists so categories can be handled differently: block some, answer this one with support and flag a counsellor.' };
      if (!st.v4) return { ok: false, msg: '<b>The older taxonomy has no category for code-interpreter abuse, so the script that opens a back door ran.</b> For an assistant that executes code, keep the taxonomy current (S14) and sandbox the runtime too.' };
      if (!st.dialog) return { ok: false, msg: '<b>Each rephrasing of the diagnosis question passed on its own, and on the third the assistant gave one.</b> Turn-by-turn rails can\'t see the pattern; a dialog rail can hold "no medical diagnosis, however it is asked".' };
      return { ok: true, msg: '<b>All ten handled well: the Linux "kill" question answered, the disguised requests caught after normalising, the paraphrase caught at the output, the back-door script blocked as S14, the student in distress supported and a counsellor flagged, and the off-scope question held by a dialog rail.</b> Still a first filter, not the model\'s safety.' };
    }
    const update = dt => {
      gIn.userData.tick(dt); gOut.userData.tick(dt); tt = (tt + dt / 4) % 1.25;
      lanes.forEach((L, i) => { const u = Math.min(1, Math.max(0, tt - i * 0.02)); L.b.position.set(MX(i), 0.3, ZS + 0.15 + u * (L.stop - ZS - 0.15)); });
    };
    return { update, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A narrow point', home: true, say: 'A coding bootcamp in Kano gives students an assistant that can run code. Every message passes a classifier with a list of hazard categories.', act: m => m.set({ normalize: true, output: true, v4: true, dialog: true, route: true }) },
    { t: 'Disguises', home: true, say: 'Swap in look-alike letters, or hide invisible characters between them, and the raw-text classifier misses the request.', act: m => m.set({ normalize: false, output: false, v4: true, dialog: true, route: true }) },
    { t: 'Normalise, then check outputs', home: true, say: 'Map look-alikes and strip hidden characters first. Check the answers too: a paraphrase slips past the question, not the output.', act: m => m.set({ normalize: true, output: true, v4: true, dialog: true, route: true }) },
    { t: 'Route by category', home: true, say: 'A student in distress should get support and a person, not a refusal. Categories let you handle each one differently.', act: m => m.set({ normalize: true, output: true, v4: true, dialog: true, route: false }) },
    { t: 'Newer categories, whole dialogues', home: true, say: 'Code that opens a back door needs its own category. A question asked three ways needs a rule across the conversation.', act: m => m.set({ normalize: true, output: true, v4: false, dialog: false, route: true }) },
    { t: 'A first filter', home: true, say: 'Fast and cheap, it catches the obvious. It is not the model\'s safety, and attackers keep finding new disguises.', act: m => m.set({ normalize: true, output: true, v4: true, dialog: true, route: true }) },
  ],
  check: [
    { q: 'Why do look-alike letters fool a classifier?', options: ['It tokenises them differently from the plain word', 'They are invisible', 'Classifiers ignore letters'], answer: 0, why: 'Normalise text before classifying.', hint: 'Try Classify raw text.' },
    { q: 'A paraphrase passes the input check. What catches it?', options: ['Classifying the output', 'A longer keyword list', 'Nothing'], answer: 0, why: 'The harm is plainer in the answer.', hint: 'Try Check inputs only.' },
    { q: 'How should a message about self-harm be handled?', options: ['Answered with support, and a person flagged', 'Blocked like the rest', 'Ignored'], answer: 0, why: 'Route by category.', hint: 'Try Block every flagged category.' },
  ],
  terms: [
    ['Llama Guard', 'A model fine-tuned to label messages against a hazard taxonomy.'],
    ['Hazard taxonomy', 'Shared categories, S1 onwards, for routing and policy.'],
    ['Homoglyph', 'A look-alike character from another alphabet.'],
    ['Normalisation', 'Mapping look-alikes and stripping hidden characters before checking.'],
    ['Output rail', 'A check on what the model produced.'],
    ['Dialog rail', 'A rule that holds across the turns of a conversation.'],
  ],
  deeper: '<p><b>Claims in the input.</b> "This is a research context" is a test of whether the classifier can be repositioned by what the message says about itself; a good one ignores the claim.</p><p><b>A ceiling above zero.</b> Carefully crafted attacks reach high success rates against guard systems; casual ones far lower. Layer classifiers with the model\'s own training and runtime controls.</p><p><b>About this machine.</b> The ten messages are described, not shown; which layer catches each is a simplification decided live.</p>',
  code: {
    title: 'Normalise, classify, route',
    note: 'Adapted from the course\'s classifier pipeline sketch (code/main.py).',
    text: `
import unicodedata
CONFUSABLE = str.maketrans({"а": "a", "е": "e", "о": "o", "В": "B", "м": "m"})
HIDDEN = dict.fromkeys(map(ord, "\\u200b\\u200c\\u200d\\ufe0f\\u2060"))

def normalise(text):
    text = unicodedata.normalize("NFKC", text).translate(HIDDEN)
    return text.translate(CONFUSABLE)

ROUTE = {"S1": "block", "S11": "support_and_flag", "S14": "block"}

def guard(user_text, model):
    verdict = llama_guard(normalise(user_text))            # input rail
    if verdict.unsafe: return act(ROUTE.get(verdict.category, "review"))
    reply = model(user_text)
    verdict = llama_guard(normalise(reply), role="agent")  # output rail
    return reply if verdict.safe else act(ROUTE.get(verdict.category, "review"))
`,
  },
};
