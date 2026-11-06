// Promptable, open-vocabulary segmentation: a fish stall on the shore of Lake Malawi, on an upright board. Type a short phrase and the model masks every match;
// click a point and it masks the one thing under it. The prompt goes in through a text encoder; a presence head first decides whether the concept is in the picture at all.
// Break it: a vague prompt ("fish" also grabs the dried usipa), no presence check (a prompt for something absent still produces masks on look-alikes),
// a point prompt when you wanted all of them (one mask, not every chambo).
const W = 60, H = 36;
const OBJ = [
  ...[[8, 12], [16, 11], [24, 13], [11, 20], [20, 21]].map(([x, y], i) => ({ k: 'chambo', x, y, rx: 3.6, ry: 1.6, c: '#A8B4B8', id: i })),
  ...[[36, 10], [40, 13], [44, 10], [38, 18], [44, 17]].map(([x, y], i) => ({ k: 'usipa', x, y, rx: 1.8, ry: 0.6, c: '#D8C08A', id: 5 + i })),
  { k: 'basket', x: 52, y: 22, rx: 5, ry: 4, c: '#9A6B3A', id: 10 }, { k: 'bucket', x: 31, y: 27, rx: 3, ry: 3, c: '#3D6BD6', id: 11 },
];
function owner(px, py) { let o = -1; OBJ.forEach((ob, i) => { if (((px - ob.x) / ob.rx) ** 2 + ((py - ob.y) / ob.ry) ** 2 < 1) o = i; }); return o; }
const TRUTH = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) TRUTH.push(owner(x + 0.5, y + 0.5));
const PROMPTS = [
  { k: 'chambo', n: '"chambo fish"' }, { k: 'fish', n: '"fish"' }, { k: 'usipa', n: '"dried usipa"' }, { k: 'tilapia-crate', n: '"crate of tilapia"' },
];

export default {
  slug: 'sam3-open-vocab-segmentation',
  title: 'Segment anything you can name',
  description: 'A fish stall on the shore of Lake Malawi. Type a short phrase and the model masks every match; click one fish and it masks just that one.',
  overview: 'Promptable segmentation models take a picture plus a prompt and return masks. A point or box prompt means "this one thing here". A short text prompt, a concept, means "every instance of this", which needs a text encoder whose vectors line up with image features, as in CLIP. The newest models add a presence head that decides first whether the concept appears anywhere in the picture, so a prompt for something absent returns nothing instead of masking the nearest look-alike. Words still matter: a vague prompt matches more than you meant.',
  keywords: ['promptable segmentation', 'open vocabulary segmentation', 'text prompt segmentation', 'point prompt mask', 'segment anything'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 1.0, 0], dir: [0.1, 0.42, 1.3], half: 1.7, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { prompt: 'chambo', mode: 'text', presence: true, click: 2 };
    const ink = '#151827';
    /* ---------- the stall board ---------- */
    const BW = 4.6, BH = BW * H / W, BY = 0.45, BZ = -0.45;
    const board = P.box(BW + 0.2, BH + 0.35, 0.08, '#FBF8F1', { r: 0.04 }); board.position.set(0, 0.12, BZ); floor.add(board);

    const px = x => -BW / 2 + (x + 0.5) * BW / W, py = y => BY + BH - (y + 0.5) * BH / H, FZ = BZ + 0.045;
    const tiles = new THREE.InstancedMesh(new THREE.PlaneGeometry(BW / W * 1.01, BH / H * 1.01), new THREE.MeshBasicMaterial({ color: '#FFFFFF' }), W * H);
    tiles.layers.set(1); tiles.userData.noFit = true; floor.add(tiles);
    const dummy = new THREE.Object3D(), col = new THREE.Color(), tmp = new THREE.Color();
    TRUTH.forEach((_, k) => { dummy.position.set(px(k % W), py(Math.floor(k / W)), FZ); dummy.updateMatrix(); tiles.setMatrixAt(k, dummy.matrix); });
    tiles.instanceMatrix.needsUpdate = true;
    const photo = k => { const o = TRUTH[k], y = Math.floor(k / W); return o >= 0 ? OBJ[o].c : (y < 26 ? '#6E5A44' : '#B89A6A'); };
    const pin = P.cyl(0.05, 0.12, C.red, { seg: 12 }); pin.rotation.x = Math.PI / 2; pin.userData.noFit = true; floor.add(pin);
    /* ---------- the model in front ---------- */
    const part = (x, w, color, name, sub) => {
      const b = P.box(w, 0.34, 0.5, color, { r: 0.05, material: new THREE.MeshLambertMaterial({ color }) }); b.position.set(x, 0.12, 0.9); floor.add(b);
      return { b };
    };
    const pr = part(-2.1, 1.2, C.plum, 'prompt', '');
    const pres = part(-0.55, 1.2, C.gold, 'presence check', 'is it here at all?');
    const mk = part(1.0, 1.2, C.indigo, 'mask decoder', 'one mask per match');
    const out = part(2.45, 1.0, '#2E7A45', 'result', '');
    [-1.45, 0.1, 1.65].forEach(x => { const a = P.tube([V(x, 0.29, 0.9), V(x + 0.2, 0.29, 0.9)], 0.02, '#8E91A3'); a.userData.noFit = true; floor.add(a); });
    /* ---------- predict ---------- */
    const INST = ['#E3A72F', '#1C9A94', '#D9483B', '#8A3F8E', '#3E9B5F', '#EE7434', '#3D6BD6', '#C0392B', '#2F3C8F', '#6FAE4A'];
    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function predict() {
      let picked = [];
      const present = OBJ.some(o => o.k === st.prompt);
      if (st.mode === 'point') { const o = OBJ[st.click]; picked = [st.click]; return { picked, present: true, said: 'one object' }; }
      if (st.prompt === 'fish') picked = OBJ.map((o, i) => (o.k === 'chambo' || o.k === 'usipa' ? i : -1)).filter(i => i >= 0);
      else if (present) picked = OBJ.map((o, i) => (o.k === st.prompt ? i : -1)).filter(i => i >= 0);
      else if (!st.presence) picked = [10, 0, 3];
      return { picked, present, said: present || st.prompt === 'fish' ? 'present' : st.presence ? 'not here' : 'skipped' };
    }
    function draw() {
      R = predict();
      TRUTH.forEach((t, k) => { col.set(photo(k)); const j = R.picked.indexOf(t); if (t >= 0 && j >= 0) col.lerp(tmp.set(INST[j % INST.length]), 0.85); tiles.setColorAt(k, col); });
      tiles.instanceColor.needsUpdate = true;
      pin.visible = st.mode === 'point'; const o = OBJ[st.click]; pin.position.set(px(o.x), py(o.y), FZ + 0.06);
      pres.b.material.color.set(st.presence ? C.gold : '#9A9AA6');

    }
    draw();
    const want = () => (st.mode === 'point' ? 5 : st.prompt === 'tilapia-crate' ? 0 : st.prompt === 'fish' ? 5 : OBJ.filter(o => o.k === st.prompt).length);
    const right = () => { const tgt = st.prompt === 'fish' ? 'chambo' : st.prompt; return R.picked.filter(i => OBJ[i].k === tgt).length; };
    const controls = [
      { type: 'buttons', label: 'Text prompt', options: ['chambo fish', 'fish', 'dried usipa', 'crate of tilapia'], get: () => PROMPTS.findIndex(p => p.k === st.prompt), act: i => { st.prompt = PROMPTS[i].k; st.mode = 'text'; draw(); } },
      { type: 'buttons', label: 'Prompt type', options: ['Text: every match', 'Point: this one'], get: () => (st.mode === 'text' ? 0 : 1), act: i => { st.mode = i ? 'point' : 'text'; draw(); } },
      { type: 'toggle', label: 'Presence check first', short: 'presence', get: () => st.presence, set: v => { st.presence = v; draw(); } },
    ];
    const readouts = [
      { label: 'Masks', get: () => ({ v: String(R.picked.length), sub: st.mode === 'point' ? 'from one click' : 'one per match' }) },
      { label: 'Right ones', get: () => ({ v: st.prompt === 'tilapia-crate' && st.mode === 'text' ? (R.picked.length ? 'false alarm' : 'none, correctly') : `${right()} of ${st.mode === 'point' ? 1 : want()}`, good: st.mode === 'text' && (st.prompt === 'tilapia-crate' ? R.picked.length === 0 : right() === want() && R.picked.length === want()), bad: st.mode === 'text' && (st.prompt === 'tilapia-crate' ? R.picked.length > 0 : R.picked.length !== want()) }) },
      { label: 'In the picture?', get: () => ({ v: st.mode === 'point' ? '–' : R.said, sub: 'presence head' }) },
    ];
    const labels = [
      { name: 'board', t: 'Every match, masked', d: 'One colour per instance', icon: 'target', atV: V(-BW / 2, BY + BH * 0.6, BZ) },
      { name: 'prompt', t: 'The prompt', d: 'A short phrase, or a click', icon: 'link', atV: V(-2.7, 0.3, 0.9) },
      { name: 'presence', t: 'Presence check', d: 'Is the concept here at all?', icon: 'check', atV: V(2.95, 0.3, 0.9) },
    ];
    const reset = () => { Object.assign(st, { prompt: 'chambo', mode: 'text', presence: true }); draw(); };
    const breaks = [
      { label: 'A vague prompt', hint: '"fish"', on: () => { reset(); st.prompt = 'fish'; draw(); }, off: reset },
      { label: 'No presence check', hint: 'Ask for something not on the stall', on: () => { reset(); st.presence = false; st.prompt = 'tilapia-crate'; draw(); }, off: reset },
      { label: 'A click instead of a phrase', hint: 'Wanted all five chambo', on: () => { reset(); st.mode = 'point'; draw(); }, off: reset },
    ];
    function status() {
      if (st.mode === 'point') return { ok: false, msg: `<b>One fish, not five.</b> A point prompt means "the thing under this click", so the model returns a single mask. To count the chambo on the stall, ask with a phrase: a concept prompt returns every instance.` };
      if (st.prompt === 'fish') return { ok: false, msg: `<b>Too broad.</b> "fish" matches the fresh chambo and the dried usipa alike, so ${R.picked.length} masks come back where the buyer wanted 5. Name the concept you mean: "chambo fish".` };
      if (st.prompt === 'tilapia-crate' && R.picked.length) return { ok: false, msg: `<b>Masks for something that is not there.</b> There is no crate of tilapia on this stall, but with no presence check the decoder still returns its best guesses: the basket and a couple of fish, ${R.picked.length} false masks. A presence head first asks "is this concept here at all?" and returns nothing when it is not.` };
      if (st.prompt === 'tilapia-crate') return { ok: true, msg: `<b>Nothing, correctly.</b> The presence head finds no crate of tilapia anywhere on the stall, so the model returns no masks instead of grabbing the nearest look-alike.` };
      return { ok: true, msg: `<b>${R.picked.length} masks, each its own colour.</b> The phrase ${PROMPTS.find(p => p.k === st.prompt).n} is encoded as text, the presence head confirms it is on the stall, and the decoder returns one mask per instance.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Ask in words', home: true, say: 'A fish stall on the shore of Lake Malawi. Type "chambo fish", and the model masks every chambo, each in its own colour.', act: m => m.set({ prompt: 'chambo', mode: 'text', presence: true }) },
    { t: 'Point or phrase', home: true, say: 'A click means "this one thing here", and returns a single mask. A phrase means "every instance of this".', act: m => m.set({ mode: 'point' }) },
    { t: 'Choose words carefully', home: true, say: 'Ask for just "fish", and the dried usipa are masked too. A vague phrase matches more than you meant.', act: m => m.set({ mode: 'text', prompt: 'fish' }) },
    { t: 'Is it even here?', home: true, say: 'Ask for a crate of tilapia, which is not on the stall. A presence check answers no, and the model returns nothing.', act: m => m.set({ prompt: 'tilapia-crate', presence: true }) },
    { t: 'Without the check', home: true, say: 'Switch the presence check off, and the decoder still returns its best guesses, masking a basket and some fish that were never asked for.', act: m => m.set({ presence: false }) },
    { t: 'The right question', home: true, say: 'A precise phrase, a presence check, and a concept prompt when you want them all.', act: m => m.set({ prompt: 'chambo', presence: true }) },
  ],
  check: [
    { q: 'What is the difference between a point prompt and a text prompt?', options: ['A point means one object here; a phrase means every instance of that concept', 'They are the same', 'Text prompts only work on faces'], answer: 0, why: 'Concept prompts return all matches.' },
    { q: 'What does a presence check do?', options: ['Decides whether the concept is in the picture before making masks', 'Removes the background', 'Makes masks sharper'], answer: 0, why: 'Without it, absent concepts still get look-alike masks.' },
    { q: 'Why did "fish" return the wrong objects?', options: ['The word is broad enough to match the dried usipa too', 'The model cannot read', 'The photo was too dark'], answer: 0, why: 'Precise phrases match precisely.' },
  ],
  terms: [
    ['Promptable segmentation', 'Segmentation guided by a prompt: a point, box or phrase.'],
    ['Concept prompt', 'A short phrase asking for every instance of something.'],
    ['Open vocabulary', 'Working with any words, not a fixed list of classes.'],
    ['Presence head', 'A part that decides whether the prompted concept appears at all.'],
    ['Mask decoder', 'The part that turns image features and a prompt into masks.'],
    ['Grounding', 'Linking words to the regions of an image they describe.'],
  ],
  deeper: '<p><b>Video too.</b> Promptable segmenters keep a memory of past frames, so a mask drawn once can follow the object through a whole video.</p><p><b>Detector plus segmenter.</b> An older recipe pairs an open-vocabulary box detector with a point-and-box segmenter; it is still useful when a concept model is unavailable.</p><p><b>About this machine.</b> The masks are taken from the scene\'s true shapes; what each prompt and setting returns is chosen to show typical behaviour.</p>',
  code: {
    title: 'Asking for a concept, with a presence check',
    note: 'Adapted from the course\'s promptable segmentation lesson.',
    text: `
def segment(image, prompt, presence_threshold=0.5):
    img = image_encoder(image)
    if isinstance(prompt, tuple):                    # a click: one object
        return [mask_decoder(img, point=prompt)]
    txt = text_encoder(prompt)                       # a phrase: every instance
    if presence_head(img, txt) < presence_threshold:
        return []                                    # not in the picture at all
    queries = match_queries(img, txt)
    return [mask_decoder(img, query=q) for q in queries]

masks = segment(photo, "chambo fish")
print(len(masks), "chambo on the stall")
`,
  },
};
