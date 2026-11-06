// Flamingo: a gallery in Lagos writes catalogue labels with an interleaved prompt: two example images with their labels, then a new image and an open label.
// A Perceiver resampler turns each image into 64 tokens; a frozen language model reads the text, with gated cross-attention blocks inserted between its layers.
// Each gate adds tanh(α) × cross-attention to the frozen stream, with α starting at zero. Gate values over training follow a simple schedule; text perplexity
// and the answers per setting are scripted from the paper's behaviour; the cross-attention mask is drawn live. Break it: gates opened fully at the start
// (the frozen model's text skill is wrecked on step one), no image mask (the new label mixes in the earlier example), no examples in the prompt (wrong format).
const EX = [['adire cloth', 'Adire: indigo resist-dyed cloth, Abeokuta.'], ['Nok head', 'Nok terracotta head, central Nigeria.'], ['talking drum', 'Dundun talking drum, south-west Nigeria.']];

export default {
  slug: 'flamingo-gated-cross-attention',
  title: 'Flamingo: open the gate slowly',
  description: 'A gallery in Lagos writes catalogue labels from an interleaved prompt: two example images with labels, then a new image.',
  overview: 'Flamingo keeps a large language model frozen and teaches it to see by adding layers rather than changing it. A Perceiver resampler turns each image\'s patch tokens into a fixed 64 visual tokens, whatever the resolution. Between every few frozen layers sits a new gated cross-attention block: the text attends to the visual tokens, and the result is added to the text stream multiplied by tanh(α), where α is a learned scalar that starts at zero. At the start, then, the model is exactly the original language model, and visual information is mixed in gradually as training opens the gates; opening them fully on a randomly initialised branch would drown the frozen model\'s skills in noise. For interleaved prompts, a mask lets each text token attend only to the most recent image before it. Because the language model is intact, its in-context learning carries over: show a few image-label pairs and it labels the next image in the same style, with no training at all.',
  keywords: ['flamingo', 'gated cross-attention', 'perceiver resampler', 'few-shot', 'interleaved prompts', 'frozen language model'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.75, 0.2], dir: [0.05, 0.28, 1.3], half: 1.3, wide: 6.4 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { init: 0, step: 2, mask: true, shots: 2 };
    const ink = '#151827', STEPS = [0, 2000, 20000], LAYERS = 12, M = 4;
    /* the interleaved prompt along the front */
    const items = [];
    const slot = (x, w, col, txt) => { const b = P.box(w, 0.26, 0.36, col, { r: 0.03 }); b.position.set(x, 0.12, 0.8); floor.add(b);
         items.push({ b, t }); return b; };
    const imgX = [-2.7, -0.95, 0.8];
    EX.forEach(([img, lab], k) => { slot(imgX[k], 0.5, '#3B3F8F', `image: ${img}`); slot(imgX[k] + 0.85, 1.1, C.plum, k < 2 ? lab : '?'); });
    const outB = P.box(2.0, 0.42, 0.06, '#FBF8F1', { r: 0.03 }); outB.position.set(2.15, 0.12, -0.6); floor.add(outB);

    /* the frozen stack with gated blocks */
    const SX = -0.3, layers = [];
    let y = 0.3; for (let l = 0; l < LAYERS; l++) { const b = P.box(1.4, 0.08, 0.7, '#8E91A3', { r: 0.02 }); b.position.set(SX, y, -0.35); floor.add(b); y += 0.1;
      if ((l + 1) % M === 0 && l < LAYERS - 1) { const gm = new THREE.MeshLambertMaterial({ color: C.coral }), g = P.box(1.4, 0.08, 0.7, C.coral, { r: 0.02, material: gm }); g.position.set(SX, y, -0.35); floor.add(g);
        const dial = P.box(0.06, 1, 0.06, '#F2C94C', { r: 0.01 }); dial.position.set(SX + 0.8, y, -0.35); dial.userData.noFit = true; floor.add(dial); layers.push({ gm, dial, y }); y += 0.1; } }


    /* resampler and the cross-attention mask */
    const rs = P.box(0.8, 0.4, 0.6, '#3B3F8F', { r: 0.05 }); rs.position.set(-2.4, 0.12, -0.35); floor.add(rs);

    const links = [0, 1, 2].map(k => { const mm = new THREE.MeshBasicMaterial({ color: '#F2C94C', transparent: true, opacity: 0.8 }), t = P.tube([V(imgX[k], 0.3, 0.7), V((imgX[k] + 1.65) / 2, 0.75, 0.6), V(1.65, 0.3, 0.7)], 0.012, '#F2C94C', { material: mm }); t.layers.set(1); t.userData.noFit = true; floor.add(t); return t; });

    floor.add(P.keep(-3.0, 3.0, 0.7, -1.2, 0.8));
    let R = null;
    function run() {
      const steps = STEPS[st.step], open = st.init === 1, alpha = open ? 1.5 : Math.min(1.2, steps / 15000), gate = Math.tanh(alpha);
      const textPpl = open && steps === 0 ? 41 : 8.1 + (open ? 0.6 : 0.1) * Math.min(1, steps / 20000);
      const trained = steps >= 2000;
      let out;
      if (open && steps === 0) out = 'the the of of drum drum';
      else if (!trained && !open) out = 'Dundun... (it cannot see the image yet)';
      else if (st.shots === 0) out = 'This is a drum. It is brown and it is used to make music.';
      else if (!st.mask) out = 'Nok terracotta drum, central Nigeria.';
      else out = EX[2][1];
      return { steps, gate, textPpl, out, right: out === EX[2][1] };
    }
    function draw() {
      R = run();
      layers.forEach(L => { L.dial.scale.y = Math.max(0.01, R.gate * 0.35); L.dial.position.y = L.y; L.gm.color.set(R.gate < 0.02 ? '#E8C7C0' : C.coral); });
      items.forEach((it, i) => { const k = Math.floor(i / 2), show = k === 2 || st.shots === 2; it.b.visible = show; });
      links.forEach((l, k) => { l.visible = k === 2 || (!st.mask && st.shots === 2); });

    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Gates start', options: ['Closed (α = 0)', 'Fully open'], get: () => st.init, act: i => { st.init = i; draw(); } },
      { type: 'buttons', label: 'Training steps', options: ['0', '2,000', '20,000'], get: () => st.step, act: i => { st.step = i; draw(); } },
      { type: 'toggle', label: 'Each label sees only its own image', short: 'image mask', get: () => st.mask, set: v => { st.mask = v; draw(); } },
      { type: 'buttons', label: 'Examples in the prompt', options: ['None', 'Two'], get: () => (st.shots ? 1 : 0), act: i => { st.shots = i ? 2 : 0; draw(); } },
    ];
    const readouts = [
      { label: 'Gate value', get: () => ({ v: R.gate.toFixed(2), sub: 'tanh(α); starts at 0' }) },
      { label: 'Text perplexity', get: () => ({ v: R.textPpl.toFixed(1), sub: 'frozen model alone: 8.1', good: R.textPpl < 9.5, bad: R.textPpl > 15 }) },
      { label: 'Label', get: () => ({ v: R.right ? 'right' : 'wrong', good: R.right, bad: !R.right }) },
    ];
    const labels = [
      { name: 'stack', t: 'Frozen model, gated blocks', d: 'Coral blocks look at the images', icon: 'link', atV: V(SX - 0.75, 0.9, -0.35) },
      { name: 'prompt', t: 'Interleaved prompt', d: 'Images and labels in turn', icon: 'book', atV: V(-3.0, 0.2, 0.8) },
    ];
    const reset = () => { Object.assign(st, { init: 0, step: 2, mask: true, shots: 2 }); draw(); };
    const breaks = [
      { label: 'Gates fully open at the start', hint: 'Step 0', on: () => { reset(); st.init = 1; st.step = 0; draw(); }, off: reset },
      { label: 'No image mask', hint: 'Labels see every image', on: () => { reset(); st.mask = false; draw(); }, off: reset },
      { label: 'No examples', hint: 'Zero-shot', on: () => { reset(); st.shots = 0; draw(); }, off: reset },
    ];
    function status() {
      if (st.init === 1 && R.steps === 0) return { ok: false, msg: `<b>The frozen model is drowned on step one.</b> With the gates fully open, randomly initialised cross-attention adds noise to every fourth layer of the language model, and its text perplexity jumps from 8.1 to ${R.textPpl}: it writes "${R.out}". Starting α at zero makes the model exactly the original at first, and lets vision in gradually.` };
      if (!st.mask) return { ok: false, msg: `<b>The label mixes in an earlier example.</b> Without the mask, the open label attends to all three images, so features of the Nok head bleed into the drum: "${R.out}" Each text token should attend only to the most recent image before it.` };
      if (st.shots === 0) return { ok: false, msg: `<b>Right object, wrong format.</b> With no examples, the model describes the drum in its own words, "${R.out}", instead of writing a catalogue label. Two image-label pairs in the prompt show the format, and the frozen model's in-context learning copies it, with no training.` };
      if (R.steps < 2000) return { ok: true, msg: `<b>Still the original model.</b> At step 0 the gates are closed (tanh 0 = 0), so the model is exactly the frozen language model: text perplexity ${R.textPpl.toFixed(1)}, but it cannot see the images yet. Training opens the gates gradually.` };
      return { ok: true, msg: `<b>"${R.out}"</b> After ${R.steps.toLocaleString('en')} steps the gates have opened to ${R.gate.toFixed(2)}, text perplexity is still ${R.textPpl.toFixed(1)}, the mask keeps the label on its own image, and two examples set the format.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Catalogue labels', home: true, say: 'A gallery in Lagos writes labels with a prompt of two example images and labels, then a talking drum with an open label.', act: m => m.set({ init: 0, step: 0, mask: true, shots: 2 }) },
    { t: 'A frozen model', home: true, say: 'The language model stays frozen. Gated cross-attention blocks between its layers will let it look at the images.', act: m => m.set({ step: 0 }) },
    { t: 'Gates start shut', home: true, say: 'Each gate starts at zero, so at first the model is exactly the original. Training opens them gradually.', act: m => m.set({ step: 2 }) },
    { t: 'Open too soon', home: true, say: 'Open the gates fully at the start, and random cross-attention drowns the model. It writes nonsense.', act: m => m.set({ init: 1, step: 0 }) },
    { t: 'One image each', home: true, say: 'Without a mask, the new label looks at every image, and the Nok head bleeds into the drum.', act: m => m.set({ init: 0, step: 2, mask: false }) },
    { t: 'Examples set the format', home: true, say: 'With no examples, it describes the drum in its own words. Two examples, and it writes a catalogue label.', act: m => m.set({ mask: true, shots: 0 }) },
  ],
  check: [
    { q: 'Why do Flamingo\'s gates start at zero?', options: ['So the model begins exactly as the frozen language model', 'To save memory', 'Because images are not needed'], answer: 0, why: 'tanh(0) = 0 adds nothing at first.' },
    { q: 'What does the Perceiver resampler produce?', options: ['A fixed 64 tokens per image', 'One token per patch', 'A caption'], answer: 0, why: 'Any resolution, same count.' },
    { q: 'How does Flamingo label a new image in a set style without training?', options: ['In-context examples in the prompt', 'Fine-tuning on labels', 'A larger resampler'], answer: 0, why: 'The frozen model\'s few-shot skill carries over.' },
  ],
  terms: [
    ['Gated cross-attention', 'Cross-attention scaled by tanh(α) and added to the frozen stream.'],
    ['Perceiver resampler', 'Learned latents that turn any number of patches into a fixed set of tokens.'],
    ['Interleaved prompt', 'Images and text mixed in one sequence.'],
    ['Cross-attention mask', 'Limits which images each text token may see.'],
    ['Few-shot', 'Learning a task from a few examples in the prompt.'],
    ['Zero initialisation', 'Starting a new branch so it adds nothing.'],
  ],
  deeper: '<p><b>Few-shot for collections.</b> Museums and archives across Nigeria, Ghana and Mali hold thousands of uncatalogued objects. Few-shot prompting with a curator\'s own examples sets the house style without training a model.</p><p><b>Descendants.</b> Idefics and Gemini combine interleaved image tokens with optional gated cross-attention; the zero-initialised gate idea appears in many adapters.</p><p><b>About this machine.</b> The gate schedule is simple and illustrative; perplexities and answers are scripted from the paper\'s behaviour; the mask links are drawn live.</p>',
  code: {
    title: 'A gated cross-attention block',
    note: 'Adapted from the course\'s Flamingo lesson.',
    text: `
import torch, torch.nn as nn

class GatedXAttn(nn.Module):
    def __init__(self, dim, heads=8):
        super().__init__()
        self.attn = nn.MultiheadAttention(dim, heads, batch_first=True)
        self.alpha = nn.Parameter(torch.zeros(1))     # closed at the start
    def forward(self, text, visual, mask=None):
        x, _ = self.attn(text, visual, visual, attn_mask=mask)
        return text + torch.tanh(self.alpha) * x     # additive, gated
`,
  },
};
