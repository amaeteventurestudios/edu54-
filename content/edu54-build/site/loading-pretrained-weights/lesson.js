// Loading pretrained weights (phase 19, lesson 37): a Mombasa team maps names and shapes from a safetensors file onto its own model. Twelve keys, each a peg that must meet its hole. Real name mapping and a shape check run. A transposed linear, a missing key and a silent non-strict load are the classic traps.
const SRC = [['tok.w', 768], ['pos.w', 768], ['h.0.attn.c', '1536x768'], ['h.0.mlp.c', '768x3072'], ['ln.w', 768], ['head.w', 768]];
const DST = [['tok.weight', 768], ['pos.weight', 768], ['blocks.0.attn.proj', '768x1536'], ['blocks.0.ff.fc', '3072x768'], ['norm.weight', 768], ['head.weight', 768]];
function run(o) {
  const res = SRC.map((s, i) => {
    if (!o.map) return 'unmatched';
    const flip = typeof s[1] === 'string';
    if (flip && !o.flip) return 'shape';
    if (i === 5 && o.drop) return 'missing';
    return 'ok';
  });
  const bad = res.filter(r => r !== 'ok').length, silent = !o.strict && bad > 0;
  return { res, bad, silent, good: o.strict ? bad === 0 : false, gen: bad ? 'noise' : 'sensible' };
}

export default {
  slug: 'loading-pretrained-weights',
  title: 'Loading pretrained weights: every peg in its hole',
  description: 'A file of tensors meets your model. Names must map, shapes must fit, and a quiet load can leave you with noise.',
  overview: 'You rarely train from nothing. You load weights someone else trained. A safetensors file holds named tensors, and your model has its own names. The job is a map from one to the other. Shapes need care: some older checkpoints store linear layers transposed, which must be flipped. Tied heads may be stored once. The great trap is a non-strict load. It copies what matches, skips what doesn\'t and raises nothing, leaving part of your model random, so that it generates noise with no error. Load strictly, check every name and shape, then test with a known prompt. This lesson does that for a team in Mombasa.',
  keywords: ['safetensors', 'pretrained weights', 'state dict', 'strict loading', 'model conversion', 'capstone'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.72, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { map: true, flip: true, drop: false, strict: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C', ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const X = i => -1.8 + i * 0.6;
    const H = SRC.map((s, i) => { const m = new S.THREE.MeshLambertMaterial({ color: '#BFB8A8' }), b = P.box(0.44, 0.2, 0.44, '#fff', { r: 0.03, material: m }); b.position.set(X(i), 0.03, 0.2); S.add(b); return m; });
    const Pg = SRC.map((s, i) => { const m = new S.THREE.MeshLambertMaterial({ color: SAF }), b = P.box(0.22, 0.44, 0.22, '#fff', { r: 0.03, material: m }); b.userData.noFit = true; S.add(b); return { b, m, y: 0.2, to: 0.2 }; });
    const lamp = add(P.lamp(GOOD, { h: 0.5, r: 0.11 })); lamp.position.set(2.2, 0.03, 0.2);
    const file = P.box(1.2, 0.2, 0.3, '#2C2D31', { r: 0.03 }); file.position.set(-1.8, 0.03, -0.55); S.add(file);
    S.add(P.keep(-2.3, 2.45, 1.0, -0.72, 0.72));
    let R = null;
    function draw() {
      R = run(st);
      R.res.forEach((r, i) => { Pg[i].b.position.x = X(i); Pg[i].b.position.z = 0.2; Pg[i].to = r === 'ok' ? 0.18 : 0.55; Pg[i].m.color.set(r === 'ok' ? GOOD : r === 'shape' ? BAD : RED); H[i].color.set(r === 'ok' ? '#7FC8BA' : '#EDB9AB'); });
      lamp.userData.set({ color: R.good ? '#3E9B5F' : '#D9483B', on: true });
    }
    draw(); ticks.forEach(t => t.userData.tick(1, true));
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [tg('map', 'Map file names to model names', 'Name map'), tg('flip', 'Flip transposed layers', 'Flip'), tg('drop', 'The file has no head tensor', 'No head'), tg('strict', 'Load strictly', 'Strict')];
    const readouts = [
      { label: 'Tensors placed', get: () => ({ v: `${6 - R.bad} of 6`, good: !R.bad, bad: R.bad > 0 }) },
      { label: 'Load result', get: () => ({ v: st.strict ? (R.bad ? 'error raised' : 'clean') : R.bad ? 'silent' : 'clean', bad: R.silent, good: st.strict }) },
      { label: 'Test prompt', get: () => ({ v: R.gen, good: !R.bad, bad: !!R.bad }) },
    ];
    const labels = [
      { name: 'p', t: 'Pegs and holes', d: 'Name and shape must both fit', icon: 'box', atV: V(X(0) - 0.25, 0.15, 0.2) },
      { name: 'l', t: 'Load lamp', d: 'Green: strict and clean', icon: 'check', atV: V(2.4, 0.6, 0.2) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Non-strict load', hint: 'with no name map', on: () => set({ ...D0, map: false, strict: false }), off: reset },
      { label: 'Forget to flip', hint: 'old format', on: () => set({ ...D0, flip: false }), off: reset },
      { label: 'A tied head, stored once', hint: 'the key is missing', on: () => set({ ...D0, drop: true }), off: reset },
    ];
    function status() {
      if (R.silent) return { ok: false, msg: `<b>No error, ${R.bad} tensors never loaded, and it generates noise.</b> A non-strict load copies what matches and says nothing. Random weights sit where trained ones should.` };
      if (st.drop) return { ok: false, msg: '<b>Strict load stops at a missing head.</b> It is tied, so stored once. Copy the reference, and load strict again.' };
      if (!st.flip) return { ok: false, msg: `<b>Shape mismatch on ${R.bad} tensors.</b> Some checkpoints store linear layers transposed. Flip those.` };
      if (!st.map) return { ok: false, msg: '<b>Strict load stops on the first unknown name.</b> That is what you want. Write the map.' };
      return { ok: true, msg: '<b>All six placed, strictly, and the test prompt reads sensibly.</b> Always test with a known prompt.' };
    }
    return { update: dt => { ticks.forEach(t => t.userData.tick(dt)); Pg.forEach(p => { p.y += (p.to - p.y) * Math.min(1, dt * 5); p.b.position.y = p.y; }); }, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A file of tensors', home: true, say: 'A team in Mombasa loads a trained model. The file has its names, and the model has others.', act: m => m.set({ map: false, flip: true, drop: false, strict: true }) },
    { t: 'A name map', home: true, say: 'Write a map from file names to model names, and each peg finds its hole.', act: m => m.set({ map: true, flip: true, drop: false, strict: true }) },
    { t: 'Transposed', home: true, say: 'Some older files store linear layers flipped. Without a flip, shapes don\'t fit.', act: m => m.set({ map: true, flip: false, drop: false, strict: true }) },
    { t: 'A quiet load', home: true, say: 'A non-strict load skips what doesn\'t match and says nothing. The model generates noise.', act: m => m.set({ map: false, flip: true, drop: false, strict: false }) },
    { t: 'Tied heads', home: true, say: 'A tied head may be stored once. Copy the reference.', act: m => m.set({ map: true, flip: true, drop: true, strict: true }) },
    { t: 'Test it', home: true, say: 'Load strictly, then try a known prompt. Now you can trust it.', act: m => m.set({ map: true, flip: true, drop: false, strict: true }) },
  ],
  check: [
    { q: 'What is the risk of a non-strict load?', options: ['Parts stay random, with no error', 'It is slower', 'It uses more memory'], answer: 0, why: 'It skips what doesn\'t match.', hint: 'Try Non-strict load.' },
    { q: 'What must match when loading?', options: ['Names and shapes', 'File size only', 'Prompt length'], answer: 0, why: 'Both must fit.', hint: 'See Pegs and holes.' },
    { q: 'What is the last check?', options: ['A known test prompt', 'A longer file', 'A restart'], answer: 0, why: 'Good text proves the load.', hint: 'See Test it.' },
  ],
  terms: [['Safetensors', 'A safe file format for tensors.'], ['State dict', 'Names mapped to tensors.'], ['Strict load', 'Errors on any mismatch.'], ['Transpose', 'Swapping rows and columns.'], ['Tied weights', 'One tensor used twice.']],
  deeper: '<p><b>Why safetensors.</b> Unlike pickle files, loading one can\'t run code.</p><p><b>Licences.</b> Check the weights\' licence before use.</p><p><b>The shape check</b> here runs on six example tensors.</p>',
  code: {
    title: 'Load strictly',
    note: 'Adapted from the course\'s loader (code/main.py).',
    text: `
tensors = load_file("model.safetensors")
state = {NAME_MAP[k]: fix_shape(k, v) for k, v in tensors.items()}
state["head.weight"] = state["tok.weight"]       # tied, stored once
model.load_state_dict(state, strict=True)
print(generate(model, "Mombasa is"))
`,
  },
};
