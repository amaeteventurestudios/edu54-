// Instruction tuning (SFT): a farmers' cooperative in Ibadan turns a base model into an assistant. Training examples are ChatML conversations; the loss can cover
// only the assistant's tokens (masked) or every token. The token strip and the share of tokens in the loss are exact for the example shown. Instruction-following and
// retained-knowledge rates follow the reported pattern (about a few thousand examples suffice; learning rates near pre-training's cause forgetting) and the replies
// are scripted. Break it: loss on every token (it writes the farmer's next question too), a pre-training learning rate (forgetting), a different prompt template at use.
const TOK = [['sys', '<|im_start|>system'], ['sys', 'You are a helpful farm assistant.'], ['sys', '<|im_end|>'], ['usr', '<|im_start|>user'], ['usr', 'When should I plant maize in Oyo State?'], ['usr', '<|im_end|>'], ['ast', '<|im_start|>assistant'], ['ast', 'Plant once the rains have properly started,'], ['ast', 'usually from March in the south-west.'], ['ast', '<|im_end|>']];
const COUNTS = [3, 6, 2, 3, 11, 2, 3, 9, 9, 2]; /* tokens per piece, for the share in the loss */
const LRS = ['2e-5', '3e-4'], NS = [100, 3000, 50000];
function run(st) {
  const inLoss = TOK.map(([r], i) => (st.mask ? r === 'ast' && i > 6 : true)), tot = COUNTS.reduce((a, b) => a + b, 0), used = COUNTS.reduce((a, c, i) => a + (inLoss[i] ? c : 0), 0);
  let follow = [55, 92, 95][st.n], know = st.lr ? 41 : 61, reply = 'ok';
  if (!st.mask) { follow -= 30; reply = 'runon'; }
  if (st.lr) reply = reply === 'ok' ? 'forgot' : reply;
  if (st.tmpl) { follow = 18; reply = 'base'; }
  if (st.n === 0 && reply === 'ok') reply = 'weak';
  return { inLoss, share: used / tot, follow, know, reply };
}
const REPLIES = {
  ok: 'Plant once the rains have properly started,\nusually from March in the south-west.',
  weak: 'Maize. Plant maize in the rainy season.\nMaize is a crop.',
  runon: 'Plant once the rains have started, usually from March.\nUser: And what about cassava?\nAssistant: Cassava can…',
  forgot: 'Plant maize when the maize season of maize\nplanting begins in the State of Oyo maize.',
  base: 'When should I plant maize in Oyo State?\nWhen should I plant cassava in Oyo State?\nWhen should I…',
};

export default {
  slug: 'instruction-tuning-sft',
  title: 'Instruction tuning: from text to answers',
  description: 'A farmers\' cooperative in Ibadan turns a base model, which only continues text, into an assistant that answers. Supervised fine-tuning does it, with a clean format.',
  overview: 'A pre-trained base model continues text: ask it a question and it may write more questions. Supervised fine-tuning, SFT, continues the same training loop on example conversations so the model learns to respond. The examples come in formats such as Alpaca (instruction, input, output), ShareGPT (a list of turns) or ChatML, which wraps each turn in special tokens like &lt;|im_start|&gt;user and &lt;|im_end|&gt;. SFT teaches behaviour rather than facts: the knowledge is already there from pre-training, so a few thousand good examples go a long way. The key detail is the loss mask: the whole conversation is fed in, but only the assistant\'s tokens count in the loss, so the model learns to answer instead of learning to write the user\'s side too. Hyperparameters are gentle: a learning rate around 2 × 10⁻⁵, far below pre-training\'s 3 × 10⁻⁴, a couple of epochs and little warm-up; a pre-training-sized learning rate overwrites general knowledge, catastrophic forgetting. And the chat template used at inference must match the one used in training, or the model falls back to plain continuation.',
  keywords: ['supervised fine-tuning', 'instruction tuning', 'chatml', 'loss mask', 'catastrophic forgetting', 'chat template'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.12, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { mask: true, lr: 0, n: 1, tmpl: false };
    const ink = '#151827', COL = { sys: '#8A8A96', usr: '#3A6FB0', ast: '#1F9E89' };
    /* the training example as a strip of token pieces */
    const pieces = []; let x = -2.75; const ZS = -0.75;
    TOK.forEach(([r, t], i) => { const w = Math.max(0.42, Math.min(1.25, t.length * 0.034)); if (x + w > 2.75) x = -2.75;
      const zz = i < 7 && x === -2.75 && i > 0 ? ZS + 0.42 : undefined; pieces.push({ r, t, w, i }); });
    let row = 0; x = -2.75; pieces.forEach(p => { if (x + p.w > 2.8) { x = -2.75; row++; } p.x = x + p.w / 2; p.z = ZS + row * 0.42; x += p.w + 0.05; });
    pieces.forEach(p => { const b = P.box(p.w, 1, 0.32, COL[p.r], { r: 0.02 }); b.position.set(p.x, 0.12, p.z); b.userData.noFit = true; floor.add(b); p.b = b;
         p.t3 = t;
      const bar = P.box(p.w, 0.025, 0.32, '#E0A526', { r: 0.01 }); bar.userData.noFit = true; floor.add(bar); p.bar = bar; });
    const keepTok = P.box(5.5, 0.3, 0.8, '#000'); keepTok.material = new THREE.MeshBasicMaterial({ visible: false }); keepTok.position.set(0, 0.12, ZS + 0.2); floor.add(keepTok);

    /* the model block and output card */
    const mm = new THREE.MeshLambertMaterial({ color: C.plum }), model = P.box(1.0, 0.45, 0.8, '#fff', { r: 0.06, material: mm }); model.position.set(-2.1, 0.12, 0.65); floor.add(model);


    /* gauges */
    const gauges = ['Follows instructions', 'General knowledge'].map((n, k) => { const z = 0.35 + k * 0.55, track = P.box(1.1, 0.04, 0.18, '#D9D2C3', { r: 0.02 }); track.position.set(2.2, 0.12, z); floor.add(track);
      const fill = P.box(1, 0.07, 0.16, '#1F9E89', { r: 0.02 }); fill.userData.noFit = true; floor.add(fill);
         return { z, fill }; });
    const keep = P.box(5.6, 0.5, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); floor.add(keep);

    let R = null;
    function draw() {
      R = run(st);
      pieces.forEach(p => { const on = R.inLoss[p.i], h = on ? 0.2 : 0.07; p.b.scale.y = h; p.bar.visible = on; p.bar.position.set(p.x, 0.12 + h, p.z); });
      [[gauges[0], R.follow], [gauges[1], R.know]].forEach(([g, v], k) => { const w = 1.1 * v / 100; g.fill.scale.x = w; g.fill.position.set(2.2 - 0.55 + w / 2, 0.12, g.z); g.fill.material.color.set(v >= (k ? 55 : 80) ? '#1F9E89' : '#C62828');   });
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Loss on', options: ['Assistant tokens only', 'Every token'], get: () => (st.mask ? 0 : 1), act: i => { st.mask = !i; draw(); } },
      { type: 'buttons', label: 'Learning rate', options: LRS, get: () => st.lr, act: i => { st.lr = i; draw(); } },
      { type: 'buttons', label: 'Examples', options: NS.map(n => n.toLocaleString('en')), get: () => st.n, act: i => { st.n = i; draw(); } },
      { type: 'buttons', label: 'Prompt at use', options: ['Same ChatML template', 'Alpaca-style instead'], get: () => (st.tmpl ? 1 : 0), act: i => { st.tmpl = !!i; draw(); } },
    ];
    const readouts = [
      { label: 'In the loss', get: () => ({ v: `${Math.round(R.share * 100)}%`, sub: 'of this example\'s tokens (exact)' }) },
      { label: 'Follows instructions', get: () => ({ v: `${R.follow}%`, sub: 'reported pattern', good: R.follow >= 80, bad: R.follow < 60 }) },
      { label: 'Knowledge kept', get: () => ({ v: `${R.know}%`, sub: 'general quiz, base model 62%', good: R.know >= 58, bad: R.know < 50 }) },
    ];
    const labels = [
      { name: 'strip', t: 'One training example', d: 'ChatML turns as tokens', icon: 'book', atV: V(-2.82, 0.2, -0.75) },
      { name: 'gauge', t: 'After tuning', d: 'Red: worse than it should be', icon: 'check', atV: V(2.8, 0.15, 0.6) },
    ];
    const reset = () => { Object.assign(st, { mask: true, lr: 0, n: 1, tmpl: false }); draw(); };
    const breaks = [
      { label: 'Loss on every token', hint: 'No mask', on: () => { reset(); st.mask = false; draw(); }, off: reset },
      { label: 'Pre-training learning rate', hint: '3e-4', on: () => { reset(); st.lr = 1; draw(); }, off: reset },
      { label: 'Different template at use', hint: 'Trained ChatML, prompted Alpaca', on: () => { reset(); st.tmpl = true; draw(); }, off: reset },
    ];
    function status() {
      if (st.tmpl) return { ok: false, msg: `<b>It goes back to continuing text.</b> The model learned to answer after "<|im_start|>assistant", but it is prompted in a different format, so nothing tells it a reply is due and it continues the farmer's text as a base model would. Use exactly the chat template it was trained with.` };
      if (!st.mask) return { ok: false, msg: `<b>It writes the farmer's next question too.</b> With the loss on every token, ${Math.round(R.share * 100)}% of the example, the model learns to produce user turns as well as replies, so after answering it carries on with "User: …". Mask the loss to the assistant's tokens, ${Math.round(run({ ...st, mask: true }).share * 100)}% here.` };
      if (st.lr) return { ok: false, msg: `<b>General knowledge drops to ${R.know}%.</b> A pre-training learning rate of 3 × 10⁻⁴ moves the weights far from where pre-training left them, so facts the model knew are overwritten: catastrophic forgetting. SFT uses about 2 × 10⁻⁵.` };
      if (st.n === 0) return { ok: false, msg: `<b>${R.follow}% instruction following.</b> A hundred examples is not enough to make the reply behaviour reliable. A few thousand good examples usually are.` };
      return { ok: true, msg: `<b>It answers: ${R.follow}% of instructions followed, ${R.know}% knowledge kept.</b> Only the assistant's ${Math.round(R.share * 100)}% of tokens count in the loss, the learning rate is gentle, and the same ChatML template is used at training and at use.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A base model', home: true, say: 'A farmers\' cooperative in Ibadan has a base model. Ask it a question, and it writes more questions.', act: m => m.set({ mask: true, lr: 0, n: 1, tmpl: true }) },
    { t: 'Example chats', home: true, say: 'Supervised fine-tuning trains on example conversations, each turn wrapped in special tokens.', act: m => m.set({ tmpl: false }) },
    { t: 'Mask the loss', home: true, say: 'Only the assistant\'s words count in the loss. Now it answers.', act: m => m.set({}) },
    { t: 'Every token', home: true, say: 'Put the loss on every token, and it learns to write the farmer\'s next question too.', act: m => m.set({ mask: false }) },
    { t: 'Too hot', home: true, say: 'Use a pre-training learning rate, and it forgets what it knew.', act: m => m.set({ mask: true, lr: 1 }) },
    { t: 'Wrong template', home: true, say: 'Prompt it in a different format from training, and it goes back to continuing text.', act: m => m.set({ lr: 0, tmpl: true }) },
  ],
  check: [
    { q: 'What does SFT mainly teach?', options: ['A behaviour: responding to instructions', 'New facts', 'A new tokenizer'], answer: 0, why: 'The knowledge is already there.' },
    { q: 'Why mask the loss to assistant tokens?', options: ['So it learns to answer, not to write user turns', 'To save memory', 'To speed up training'], answer: 0, why: 'User tokens give context only.' },
    { q: 'What causes catastrophic forgetting in SFT?', options: ['A learning rate far too high', 'Too few epochs', 'The loss mask'], answer: 0, why: 'Use about 2e-5, not 3e-4.' },
  ],
  terms: [
    ['Base model', 'A pre-trained model that continues text.'],
    ['SFT', 'Fine-tuning on example conversations.'],
    ['ChatML', 'A template that wraps turns in special tokens.'],
    ['Loss mask', 'Counting only the assistant\'s tokens in the loss.'],
    ['Catastrophic forgetting', 'Losing earlier knowledge during fine-tuning.'],
    ['Chat template', 'The exact format for turns, used in training and use.'],
  ],
  deeper: '<p><b>Local assistants.</b> Cooperatives, clinics and schools across Nigeria, Ghana and Kenya fine-tune small open models on their own question-and-answer pairs. Good examples written by people who know the work matter more than volume.</p><p><b>Next.</b> SFT teaches the format; preference tuning with RLHF or DPO then teaches which of several possible answers people prefer.</p><p><b>About this machine.</b> The token strip and loss share are exact for the example; instruction-following and knowledge figures follow the reported pattern; replies are scripted.</p>',
  code: {
    title: 'The masked loss',
    note: 'Adapted from the course\'s SFT lesson.',
    text: `
def sft_loss(logits, targets, roles):
    mask = (roles == ASSISTANT).float()          # 1 for reply tokens only
    per_token = F.cross_entropy(logits.transpose(1, 2), targets, reduction="none")
    return (per_token * mask).sum() / mask.sum()

# lr = 2e-5, 2 epochs, little or no warm-up
`,
  },
};
