// ASCII art attacks (phase 18, lesson 14): a model can read letters drawn out of punctuation, and a filter reads tokens. A 3D wall of cubes spells a harmless word, so the safety-relevant step is never shown. Scanners sweep it.
// Token and meaning filters see noise; only a step that decodes the shape first catches it. Blocking all odd input also blocks legitimate tables and diagrams. Numbers follow the course where it gives them.
const FONT = { C: ['111', '100', '100', '100', '111'], A: ['010', '101', '111', '101', '101'], T: ['111', '010', '010', '010', '010'] };
const WORD = 'CAT';
function run(o) {
  const can = o.vitc; let caught = false, block = 0;
  if (o.def === 'ppl') { caught = o.strict; block = o.strict ? 30 : 2; }
  if (o.def === 'para') { caught = false; block = 1; }
  if (o.def === 'decode') { caught = true; block = 1; }
  const land = can && !caught;
  return { can, caught, block, rate: land ? 75 : 3 };
}

export default {
  slug: 'ascii-art-visual-jailbreaks',
  title: 'Letters made of punctuation: when filters can\'t see',
  description: 'A filter reads tokens, and a model can read shapes. See why the usual defences miss the gap, with a harmless word.',
  overview: 'Most prompt attacks work on the words. ArtPrompt works on recognition. A sensitive word is replaced by letters drawn in rows of punctuation, so a filter sees only symbols, while the model recognises the shape. Researchers reported success above 75% on a benchmark set across major models. The usual defences don\'t fit. A surprise filter blocks too much honest structured text. Paraphrasing often keeps the art. Retokenising doesn\'t change recognition. The gap is between what the filter reads and what the model perceives, and a capable reader is more exposed: this ties to ViTC scores of how well a model reads such art. Here the word is CAT, because only the shape of the problem matters.',
  keywords: ['ArtPrompt', 'ASCII art', 'prompt safety', 'ViTC', 'AI safety', 'guardrails'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.6, 0], dir: [0.1, 0.25, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { def: 'decode', vitc: true, strict: false }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.2, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const CELL = 0.2, cubes = [];
    [...WORD].forEach((ch, c) => FONT[ch].forEach((row, r) => [...row].forEach((v, x) => { if (v === '0') return; const m = new S.THREE.MeshLambertMaterial({ color: '#2C2D31' }), b = P.box(CELL * 0.84, CELL * 0.84, 0.16, '#fff', { r: 0.01, material: m }); b.position.set(-1.15 + c * 0.86 + x * CELL, 0.12 + (4 - r) * CELL, -0.1); S.add(b); cubes.push(m); })));
    const scanner = P.box(2.8, 0.05, 0.3, SAF, { r: 0.01, material: new S.THREE.MeshLambertMaterial({ color: SAF }) }); scanner.userData.noFit = true; S.add(scanner);
    const bot = add(P.robot('#7B6FA8', { scale: 0.9 })); bot.position.set(1.95, 0.03, 0);
    const fil = add(P.lamp('#C9C4B6', { h: 0.5, r: 0.11 })); fil.position.set(-2.1, 0.03, 0);
    S.add(P.keep(-2.45, 2.45, 1.3, -0.65, 0.65));
    let R = null, u = 0;
    function draw() {
      R = run(st);
      cubes.forEach(m => m.color.set(R.caught ? '#1F9E89' : R.can ? '#B5462F' : '#2C2D31'));
      fil.userData.set({ color: R.caught ? '#3E9B5F' : '#D9483B', on: st.def !== 'none' });
      bot.userData.set({ busy: R.can, lamp: R.can ? '#D9483B' : '#C9C4B6' });
      scanner.material.color.set(st.def === 'decode' ? GOOD : SAF); scanner.visible = st.def !== 'none';
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const DK = ['none', 'ppl', 'para', 'decode'];
    const controls = [
      { type: 'buttons', label: 'Filter', options: ['None', 'Surprise score', 'Paraphrase', 'Decode first'], get: () => DK.indexOf(st.def), act: i => set({ def: DK[i] }) },
      { type: 'toggle', label: 'The model can read shapes well', short: 'Reads art', get: () => st.vitc, set: v => set({ vitc: !!v }) },
      { type: 'toggle', label: 'Set the surprise threshold strict', short: 'Strict', get: () => st.strict, set: v => set({ strict: !!v }) },
    ];
    const readouts = [
      { label: 'Word seen by the filter', get: () => ({ v: st.def === 'decode' ? 'CAT' : 'none', sub: st.def === 'decode' ? 'decoded first' : 'only punctuation', good: st.def === 'decode' }) },
      { label: 'Gets past', get: () => ({ v: `${R.rate}%`, sub: 'of attempts, illustrative', good: R.rate < 10, bad: R.rate > 30 }) },
      { label: 'Honest input blocked', get: () => ({ v: `${R.block}%`, sub: 'tables, diagrams, code', good: R.block < 5, bad: R.block > 10 }) },
    ];
    const labels = [
      { name: 'w', t: 'A word as a shape', d: 'A filter reads no letters here', icon: 'eye', atV: V(-1.25, 0.6, -0.05) },
      { name: 'm', t: 'The model', d: 'It reads the shape anyway', icon: 'user', atV: V(2.25, 0.5, 0) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Trust a token filter', hint: 'no filter on shapes', on: () => set({ ...D0, def: 'none' }), off: reset },
      { label: 'Paraphrase the prompt', hint: 'the art often survives', on: () => set({ ...D0, def: 'para' }), off: reset },
      { label: 'Block everything odd', hint: 'a strict surprise filter', on: () => set({ ...D0, def: 'ppl', strict: true }), off: reset },
    ];
    function status() {
      if (st.def === 'ppl' && st.strict) return { ok: false, msg: `<b>Caught, and ${R.block}% of honest input with it.</b> All novel structure looks surprising: tables, diagrams, code. A threshold that blocks this breaks real work.` };
      if (!st.vitc) return { ok: true, msg: `<b>Only ${R.rate}% gets past: this model can't read the shape.</b> That is the odd part: skill at reading is what opens the gap. A more capable model is more exposed.` };
      if (st.def === 'decode') return { ok: true, msg: `<b>The filter decoded the shape, then checked the word.</b> Close the gap by checking what the model would perceive, not just the tokens. It adds a step, and it blocks little honest work.` };
      return { ok: false, msg: `<b>${R.rate}% get past.</b> ${st.def === 'para' ? 'Paraphrasing often keeps or rebuilds the art.' : 'The filter sees only punctuation, and the model sees letters.'} The gap is between what the check reads and what the model perceives.` };
    }
    return {
      update: dt => { ticks.forEach(t => t.userData.tick(dt)); u += dt; scanner.position.set(0.0, 0.15 + Math.abs(Math.sin(u * 0.8)) * 1.0, 0.1); },
      controls, readouts, labels, breaks, status, reset, set,
    };
  },

  story: [
    { t: 'Reading shapes', home: true, say: 'A wall of cubes spells a word. Here it is cat, because only the shape of the problem matters.', act: m => m.set({ def: 'none', vitc: true, strict: false }) },
    { t: 'What a filter sees', home: true, say: 'As typed text, those letters are rows of punctuation. A filter on tokens sees no word at all.', act: m => m.set({ def: 'none', vitc: true, strict: false }) },
    { t: 'What the model sees', home: true, say: 'The model recognises the letter shapes. The gap between those two views is the weakness.', act: m => m.set({ def: 'none', vitc: true, strict: false }) },
    { t: 'Paraphrase fails', home: true, say: 'Rewording the prompt often keeps the art. Retokenising doesn\'t change what the model recognises.', act: m => m.set({ def: 'para', vitc: true, strict: false }) },
    { t: 'Too strict', home: true, say: 'Block everything surprising, and you block tables, diagrams and code.', act: m => m.set({ def: 'ppl', vitc: true, strict: true }) },
    { t: 'Decode, then check', home: true, say: 'So check what the model would perceive. Decode the shape first, then apply the rules.', act: m => m.set({ def: 'decode', vitc: true, strict: false }) },
  ],
  check: [
    { q: 'Why does a token filter miss this?', options: ['It sees punctuation, and the model sees letters', 'It is too slow', 'It is off by default'], answer: 0, why: 'Filter and model perceive different things.', hint: 'See What a filter sees.' },
    { q: 'Which model is more exposed?', options: ['One that reads shapes well', 'One that can\'t read art', 'They are the same'], answer: 0, why: 'Reading skill opens the gap.', hint: 'Switch off Reads art.' },
    { q: 'Why is a strict surprise filter a poor fix?', options: ['It blocks honest structured text', 'It is costly', 'It never fires'], answer: 0, why: 'All novel input looks surprising.', hint: 'Try Block everything odd.' },
  ],
  terms: [
    ['ASCII art', 'Pictures or letters drawn in characters.'],
    ['ArtPrompt', 'An attack using such art.'],
    ['ViTC', 'A benchmark of reading text art.'],
    ['Paraphrase defence', 'Rewording a prompt before use.'],
    ['Perplexity filter', 'Flagging text that is statistically surprising.'],
    ['Perception gap', 'What a check reads versus what a model sees.'],
  ],
  deeper: '<p><b>Generalised.</b> StructuralSleight extends this to other unusual text structures. The lesson is general: check at the level the model perceives.</p><p><b>Images too.</b> Multimodal models widen the gap, since text can sit inside a picture.</p><p><b>Numbers.</b> The course reports success above 75%. Other percentages here are illustrative.</p>',
  code: {
    title: 'Check what it perceives',
    note: 'A defensive sketch based on the course\'s description (code/main.py).',
    text: `
def screen(prompt):
    views = [prompt]
    if has_character_art(prompt):
        views.append(transcribe_art(prompt))     # what a reader would see
    return any(policy_check(view) for view in views)
`,
  },
};
