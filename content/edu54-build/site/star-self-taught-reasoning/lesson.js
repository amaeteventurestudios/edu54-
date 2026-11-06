// STaR, self-taught reasoning (phase 15, lesson 2): the model writes rationales, keeps the ones whose final answer is right, and fine-tunes on
// them, round after round. Rationales are sound, shortcuts (right on training problems, wrong elsewhere) or lucky guesses. The loop is computed
// in expectation, so each round's mix follows exactly from what was kept. A process reward that checks each step drops most shortcuts; a held-out
// set shows the gap that training accuracy hides.
const GUESS = 0.1, SHORT_OOD = 0.05, ALPHA = 0.6, START = { s: 0.2, c: 0.3 };
function loop(o) {
  const H = [{ ...START }];
  let m = { ...START };
  for (let r = 0; r < 8; r++) {
    const rnd = 1 - m.s - m.c;
    const ks = m.s, kc = m.c * o.shortcut * (o.process ? 0.1 : 1), kr = rnd * GUESS * (o.process ? 0 : 1), tot = ks + kc + kr;
    let s = ALPHA * ks / tot + (1 - ALPHA) * m.s, c = ALPHA * kc / tot + (1 - ALPHA) * m.c;
    if (s + c > 1) { const k = s + c; s /= k; c /= k; }
    m = { s, c, kept: { s: ks / tot, c: kc / tot, r: kr / tot } };
    H.push(m);
  }
  const acc = (x, ood) => x.s + x.c * (ood ? SHORT_OOD : o.shortcut) + (1 - x.s - x.c) * GUESS;
  return H.map(x => ({ ...x, r: 1 - x.s - x.c, train: acc(x, false), held: acc(x, true) }));
}
const pct = x => `${Math.round(x * 100)}%`;

export default {
  slug: 'star-self-taught-reasoning',
  title: 'STaR: a model that teaches itself to reason',
  description: 'A model writes its reasoning, keeps what reached the right answer, and trains on it, round after round. Watch shortcuts creep in, then check each step.',
  overview: 'Teaching a model to reason from human-written reasoning is slow and expensive. STaR (Self-Taught Reasoner, 2022) lets the model write its own: sample a rationale and an answer, keep the pair if the answer matches the label, fine-tune on what was kept, and repeat. For problems it never gets right, rationalization gives it the correct answer as a hint and asks for a rationale that leads there. It worked: reasoning benchmarks improved with no new human annotation. But the loop has a built-in bias. The training signal is the final answer, so any rationale that reached the right answer is kept, sound or not: a shortcut that happens to work on the training problems is reinforced alongside real reasoning, and it fails silently on anything new. V-STaR (2024) also uses the wrong attempts, training a verifier to rank rationales and picking the best of several at inference; it helps, but the verifier learns from the same labels and can prefer confident, well-formatted wrong reasoning. Quiet-STaR (2024) learns short hidden thoughts before each token. The same answer-rewarded pattern sits underneath reinforcement learning on verifiable maths problems today, and under the evolutionary and self-modifying systems later in this phase. Two defences matter: reward the steps, not just the answer (process supervision), and always test on held-out problems that break simple shortcuts.',
  keywords: ['STaR', 'self-taught reasoner', 'chain of thought', 'self-improvement', 'process reward model', 'AI safety', 'reasoning'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.45, 0], dir: [0.05, 0.6, 1.2], half: 1.05, wide: 5.9 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { shortcut: 0.8, rounds: 6, process: true, held: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', BAD = '#E07A5F', RED = '#B5462F', SAF = '#F2AE0C';
    const H = 1.0, CX = r => -2.6 + r * 0.5, CZ = 0;
    const cols = Array.from({ length: 9 }, (_, r) => {
      const mk = c => { const m = new THREE.MeshLambertMaterial({ color: c }), b = P.box(0.32, 1, 0.32, c, { r: 0.02, material: m }); b.position.set(CX(r), 0.12, CZ); b.userData.noFit = true; S.add(b); return { b, m, c }; };
      const tr = P.box(0.46, 0.012, 0.46, ink, { r: 0.004 }); tr.userData.noFit = true; S.add(tr);
      const ho = P.box(0.46, 0.012, 0.46, RED, { r: 0.004 }); ho.userData.noFit = true; S.add(ho);
      return { seg: [mk(GOOD), mk(BAD), mk('#B9B4A8')], tr, ho };
    });

    /* what the round kept for fine-tuning: ten blocks in proportion (teal sound, coral shortcut, grey guess), behind the step checker's gate */
    const chk = P.gate(0.6, '#7B6FA8', { h: 0.5 }); chk.position.set(2.05, 0, 0); chk.rotation.y = Math.PI / 2; S.add(chk);
    const kept = P.stack(0.4, 0.4, 0.1, { max: 10, color: GOOD }); kept.position.set(2.6, 0, 0); S.add(kept);
    S.add(P.keep(-2.85, 2.85, 1.05, -0.35, 0.35));
    let L = null, cur = null;
    function draw() {
      L = loop(st); cur = L[st.rounds];
      L.forEach((x, r) => {
        const C = cols[r], on = r <= st.rounds, parts = [x.s, x.c, x.r];
        let y = 0;
        C.seg.forEach((g, k) => { const h = Math.max(0.002, parts[k] * H); g.b.visible = on; g.b.scale.y = h; g.b.position.y = y; y += h; });
        C.tr.visible = on; C.tr.position.set(CX(r), x.train * H, CZ);
        C.ho.visible = on && st.held; C.ho.position.set(CX(r), x.held * H, CZ);
      });
      const k = cur.kept || { s: START.s, c: START.c, r: 1 - START.s - START.c }, ns = Math.round(k.s * 10), nc = Math.round(k.c * 10);
      kept.userData.set({ n: 10, colors: Array.from({ length: 10 }, (_, i) => i < ns ? GOOD : i < ns + nc ? BAD : '#B9B4A8') });
      chk.userData.set({ open: !st.process });
    }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'slider', label: 'How often the shortcut works on training problems', min: 0.1, max: 0.95, step: 0.05, get: () => st.shortcut, set: v => set({ shortcut: +v }), fmt: v => pct(+v) },
      { type: 'slider', label: 'Rounds of self-training', min: 0, max: 8, step: 1, get: () => st.rounds, set: v => set({ rounds: Math.round(v) }) },
      { type: 'toggle', label: 'Reward each step, not only the answer', short: 'Process reward', get: () => st.process, set: v => set({ process: !!v }) },
      { type: 'toggle', label: 'Test on held-out problems', short: 'Held-out', get: () => st.held, set: v => set({ held: !!v }) },
    ];
    const readouts = [
      { label: 'Training accuracy', get: () => ({ v: pct(cur.train), sub: `after ${st.rounds} round${st.rounds === 1 ? '' : 's'}`, good: cur.train > 0.85 }) },
      { label: 'Held-out accuracy', get: () => ({ v: st.held ? pct(cur.held) : '—', sub: st.held ? 'new problems' : 'not measured', good: st.held && cur.held > 0.85, bad: !st.held || cur.held < 0.7 }) },
      { label: 'Sound reasoning', get: () => ({ v: pct(cur.s), sub: 'of rationales', good: cur.s > 0.85, bad: cur.s < 0.6 }) },
    ];
    const labels = [
      { name: 'cols', t: 'Rationales, round by round', d: 'Teal sound, coral shortcut, grey guess. Ticks: black training, red held-out', icon: 'turn', atV: V(-2.8, 0.2, 0.17) },
      { name: 'chk', t: 'Step checker', d: 'Shut: checks each step, not just the answer', icon: 'check', atV: V(2.05, 0.2, 0.35) },
      { name: 'kept', t: 'Kept to fine-tune', d: 'This round\'s mix', icon: 'box', atV: V(2.82, 0.2, 0.35) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Keep any right answer', hint: 'no process reward', on: () => set({ ...D0, process: false }), off: reset },
      { label: 'Measure only on training problems', hint: 'no held-out set', on: () => set({ ...D0, process: false, held: false }), off: reset },
      { label: 'Train more rounds to fix it', hint: 'eight rounds', on: () => set({ ...D0, process: false, rounds: 8 }), off: reset },
    ];
    function status() {
      if (!st.held) return { ok: false, msg: `<b>Measured only on training problems, the loop looks like a success: ${pct(cur.train)} correct after ${st.rounds} rounds.</b> On new problems it gets ${pct(cur.held)}, because ${pct(cur.c)} of its rationales are shortcuts that only work on the training set. Always keep a held-out set that breaks simple shortcuts.` };
      if (!st.process && st.rounds >= 8) return { ok: false, msg: `<b>Eight rounds, and shortcuts still make up ${pct(cur.c)} of the rationales: the held-out gap is ${Math.round((cur.train - cur.held) * 100)} points.</b> More rounds of the same signal reinforce whatever reached the right answer. Change the signal: reward each step.` };
      if (!st.process) return { ok: false, msg: `<b>Keeping any rationale that reached the right answer reinforces the shortcut too: after ${st.rounds} rounds ${pct(cur.c)} of rationales are shortcuts, ${pct(cur.train)} right on training problems and ${pct(cur.held)} on new ones.</b> The final answer can\'t tell sound reasoning from a lucky pattern. Reward the steps.` };
      return { ok: true, msg: `<b>With a process reward checking each step, most shortcuts are dropped before fine-tuning: after ${st.rounds} rounds ${pct(cur.s)} of rationales are sound, and held-out accuracy (${pct(cur.held)}) stays close to training (${pct(cur.train)}).</b> No new human examples were needed.` };
    }
    return { update: dt => chk.userData.tick(dt), controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Teach yourself', home: true, say: 'A model writes its own reasoning for each problem. Only one in five attempts is sound; the rest are shortcuts or guesses.', act: m => m.set({ shortcut: 0.8, rounds: 0, process: false, held: true }) },
    { t: 'Keep what worked', home: true, say: 'Keep every attempt whose answer was right, train on those, and repeat. Training accuracy climbs fast.', act: m => m.set({ shortcut: 0.8, rounds: 3, process: false, held: false }) },
    { t: 'The shortcut rides along', home: true, say: 'But a shortcut that works on training problems is kept too. On new problems, it fails.', act: m => m.set({ shortcut: 0.8, rounds: 6, process: false, held: true }) },
    { t: 'More rounds don\'t help', home: true, say: 'Eight rounds later the shortcuts are still there. The signal rewards answers, not reasoning.', act: m => m.set({ shortcut: 0.8, rounds: 8, process: false, held: true }) },
    { t: 'Reward the steps', home: true, say: 'Check each step of the reasoning, not only the answer, and most shortcuts are dropped before training.', act: m => m.set({ shortcut: 0.8, rounds: 6, process: true, held: true }) },
    { t: 'Keep a held-out set', home: true, say: 'Always test on new problems that break simple shortcuts. That gap is the warning sign.', act: m => m.set({ shortcut: 0.8, rounds: 6, process: true, held: true }) },
  ],
  check: [
    { q: 'What does plain STaR keep for fine-tuning?', options: ['Any rationale whose final answer was right', 'Only sound rationales', 'Every rationale'], answer: 0, why: 'The signal is the final answer.', hint: 'Read the kept line.' },
    { q: 'Training accuracy is high but held-out accuracy is low. What is likely?', options: ['Shortcut rationales were reinforced', 'The model is perfect', 'Too few rounds'], answer: 0, why: 'Shortcuts work only on familiar problems.', hint: 'Try Keep any right answer.' },
    { q: 'Which change attacks the cause?', options: ['Reward each reasoning step', 'Train more rounds', 'Measure only training accuracy'], answer: 0, why: 'Process supervision filters shortcuts.', hint: 'Turn on Process reward.' },
  ],
  terms: [
    ['STaR', 'Self-Taught Reasoner: keep rationales that reach the right answer, fine-tune, repeat.'],
    ['Rationalization', 'Give the right answer as a hint and ask for a rationale that reaches it.'],
    ['Shortcut rationale', 'Right answer by a pattern that doesn\'t generalise.'],
    ['V-STaR', 'Trains a verifier on right and wrong attempts and picks the best of several.'],
    ['Process reward', 'Scoring each reasoning step, not only the final answer.'],
    ['Held-out set', 'Problems kept out of training, used to catch overfitting and shortcuts.'],
  ],
  deeper: '<p><b>Quiet-STaR.</b> Learns a short hidden thought before each token, spending more on hard tokens; it still learns from whether predictions were right.</p><p><b>The pattern today.</b> Reinforcement learning on problems with checkable answers uses the same answer-based signal at much larger scale, which is why process reward models and held-out tests matter.</p><p><b>About this machine.</b> A toy, computed in expectation: shortcuts work on 80% of training problems and 5% of new ones, guesses on 10%, and a process reward drops 90% of shortcuts and all guesses. The source lesson simulates the same loop with random draws.</p>',
  code: {
    title: 'One round of STaR',
    note: 'Adapted from the course\'s STaR simulator (code/main.py).',
    text: `
def star_round(model, n_samples=1000, alpha=0.6):
    kept = [t for t in (model.sample(on_ood=False) for _ in range(n_samples))
            if t.answer_correct]                 # keep if the answer is right
    total = len(kept)
    sound = sum(t.strategy == "sound" for t in kept) / total
    short = sum(t.strategy == "shortcut" for t in kept) / total
    # reinforce what was kept, mixed with the old mix
    return Model(alpha * sound + (1 - alpha) * model.prob_sound,
                 alpha * short + (1 - alpha) * model.prob_shortcut)

def evaluate(model, n, on_ood):
    traces = [model.sample(on_ood) for _ in range(n)]
    return sum(t.answer_correct for t in traces) / n
`,
  },
};
