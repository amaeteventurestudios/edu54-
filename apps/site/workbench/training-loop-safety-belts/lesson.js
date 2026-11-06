// Training-loop safety belts (phase 19, lessons 45, 46 and 47): a 200-step pre-training run hits two bad batches, trains in half
// precision, accumulates four micro-batches per step and is killed at step 150. Clipping the global gradient norm bounds the spikes; a
// loss scaler stops float16 gradients flushing to zero and skips overflowing steps; dividing the loss by the number of micro-batches keeps
// the effective learning rate right; and an atomic checkpoint with optimizer state lets the run resume where it stopped. The loss curve is
// an illustrative model computed live from the settings.
const T = 200, KILL = 150, SPIKES = [60, 130];
const rnd = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
function simulate(o) {
  const slow = o.prec === 'fp16' && !o.scaler ? 0.35 : 1;
  const ys = [], skipped = [];
  let prog = 0, bump = 0, nan = false, lost = 0;
  for (let t = 0; t < T; t++) {
    if (t === KILL) {
      if (!o.atomic) { lost = prog; prog = 0; }
      else if (!o.optState) bump += 0.9;
    }
    if (t === SPIKES[0] && !o.clip) bump += 2.6;
    if (t === SPIKES[1]) {
      if (o.prec === 'fp16') { if (o.scaler) skipped.push(t); else nan = true; }
      else if (!o.clip) bump += 2.6;
    }
    if (nan) { ys.push(null); continue; }
    prog += slow * (o.div ? 1 : 0.6);
    bump *= 0.93;
    const wob = o.div ? 0.06 : 0.9;
    ys.push(1.9 + 3.6 * Math.exp(-prog / 45) + bump + (rnd(t + 1) - 0.5) * wob);
  }
  const last = ys.filter(v => v !== null);
  return { ys, skipped, nan, lost, peak: Math.max(...ys.slice(SPIKES[0]).filter(v => v !== null)), final: nan ? NaN : last.slice(-10).reduce((a, b) => a + b, 0) / 10 };
}

export default {
  slug: 'training-loop-safety-belts',
  title: 'Training-loop safety belts: clip, scale, accumulate, save',
  description: 'A two-hundred-step training run meets two bad batches, half precision and a killed machine. Stand the loss curve up, and buckle each safety belt in turn.',
  overview: 'An optimizer and a learning-rate schedule assume gradients are sane. In real training they often are not, and four small pieces of code keep a run alive. Gradient clipping computes the overall L2 norm of all gradients and, if it exceeds a set limit such as 1.0, scales them all down to that limit, so one bad batch with a norm a thousand times normal cannot throw the model far from where it was. Mixed precision runs most arithmetic in 16-bit floats for speed and memory. Float16 has a narrow range: small gradients flush to zero and large ones overflow to infinity. A loss scaler multiplies the loss by a large factor before the backward pass so small gradients survive, divides them back before the step, and if any gradient is infinite or not a number it skips that step and halves the scale; bfloat16 keeps float32\'s range and usually needs no scaler. Gradient accumulation trains at a batch size that does not fit in memory by running several micro-batches, adding up their gradients and stepping once; each micro-batch loss must be divided by the number of micro-batches, or the step is that many times too large. Finally, runs get interrupted. A checkpoint should hold the model, the optimizer\'s moments, the schedule, the step counter and the random-number state, and it should be written to a temporary file and renamed into place, so a kill in the middle of saving never leaves a broken file. Without the optimizer state, the resumed run starts Adam from scratch and the loss jumps. This machine follows an invented university group pre-training a small model on a shared GPU in Accra.',
  keywords: ['gradient clipping', 'mixed precision', 'GradScaler', 'gradient accumulation', 'checkpointing', 'training loop', 'bfloat16'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [-0.2, 0.3, -0.2], dir: [0.05, 0.95, 1.15], half: 1.0, wide: 4.6 },

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { clip: true, prec: 'fp16', scaler: true, div: true, optState: true, atomic: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#D64545', SAF = '#F2AE0C', OFF = '#C9C4B6';
    /* the loss curve stands up from a rail; two posts for the bad batches, one tall post for the kill */
    const X = t => -2.1 + t / T * 3.6, Y = y => 0.05 + Math.max(0, Math.min(7, y) - 1.5) / 5.5 * 0.85, CZ = -0.5;
    const rail = P.box(3.7, 0.04, 0.18, '#B9B3A6', { r: 0.01 }); rail.position.set(-0.3, 0, CZ); S.add(rail);
    SPIKES.forEach(t => { const m = P.box(0.03, 0.75, 0.05, SAF, { r: 0.004 }); m.position.set(X(t), 0, CZ - 0.08); S.add(m); });
    const kill = P.box(0.04, 0.95, 0.05, BAD, { r: 0.004 }); kill.position.set(X(KILL), 0, CZ - 0.08); S.add(kill);
    /* the run dies here if it goes NaN */
    const dead = P.ball(0.1, BAD); dead.userData.noFit = true; dead.position.set(X(SPIKES[1]), 0.5, CZ); S.add(dead);
    /* five belts as lamps */
    const belts = [0, 1, 2, 3, 4].map(i => { const l = P.lamp(GOOD, { h: 0.12, r: 0.085 }); l.position.set(-1.1 + i * 0.5, 0, 0.3); S.add(l); return l; });
    S.add(P.keep(-2.25, 1.65, 1.05, -0.75, 0.5));
    let curve = null, dots = [];
    let R = null;
    function draw() {
      R = simulate(st);
      if (curve) curve.parent.remove(curve);
      dots.forEach(d => d.parent.remove(d)); dots = [];
      const g = new THREE.Group(); let seg = [];
      const flush = () => { if (seg.length > 1) g.add(P.tube(seg, 0.016, isOk() ? GOOD : BAD, { straight: true })); seg = []; };
      R.ys.forEach((y, t) => { if (y === null) { flush(); return; } if (t === KILL) flush(); seg.push(V(X(t), Y(y), CZ)); });
      flush(); g.userData.noFit = true; S.add(g); curve = g;
      R.skipped.forEach(t => { const y = R.ys[t] ?? 3, d = P.ball(0.05, SAF); d.position.set(X(t), Y(y), CZ); d.userData.noFit = true; S.add(d); dots.push(d); });
      dead.visible = !!R.nan;
      const scalerOk = st.prec !== 'fp16' || st.scaler;
      [st.clip, scalerOk, st.div, st.optState, st.atomic].forEach((ok, i) => belts[i].userData.set({ color: ok ? GOOD : BAD, on: true }));
    }
    function isOk() { return st.clip && (st.prec !== 'fp16' || st.scaler) && st.div && st.optState && st.atomic; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const PREC = ['fp32', 'fp16', 'bf16'];
    const controls = [
      { type: 'toggle', label: 'Clip the global gradient norm', short: 'Clip', get: () => st.clip, set: v => set({ clip: !!v }) },
      { type: 'toggle', label: 'Use a loss scaler for float16', short: 'Scaler', get: () => st.scaler, set: v => set({ scaler: !!v }) },
      { type: 'toggle', label: 'Divide the loss by the micro-batch count', short: 'Divide', get: () => st.div, set: v => set({ div: !!v }) },
      { type: 'toggle', label: 'Save optimizer state in checkpoints', short: 'Optimizer state', get: () => st.optState, set: v => set({ optState: !!v }) },
      { type: 'toggle', label: 'Save atomically: temp file, then rename', short: 'Atomic', get: () => st.atomic, set: v => set({ atomic: !!v }) },
      { type: 'buttons', label: 'Precision', options: ['float32', 'float16', 'bfloat16'], get: () => PREC.indexOf(st.prec), act: i => set({ prec: PREC[i] }) },
    ];
    const readouts = [
      { label: 'Final loss', get: () => ({ v: R.nan ? 'NaN' : R.final.toFixed(2), sub: 'last ten steps', good: !R.nan && R.final < 2.2, bad: R.nan || R.final >= 2.4 }) },
      { label: 'Skipped steps', get: () => ({ v: `${R.skipped.length}`, sub: 'overflow caught', good: true, bad: false }) },
      { label: 'Resume', get: () => ({ v: R.lost ? 'from zero' : 'step 150', sub: 'after the kill', good: !R.lost, bad: !!R.lost }) },
    ];
    const labels = [
      { name: 'c', t: 'Loss curve', d: 'Two bad batches, then a kill', icon: 'chart', atV: V(-2.1, 0.03, -0.5) },
      { name: 't', t: 'The safety belts', d: 'Five checks in the loop', icon: 'check', atV: V(0.9, 0.2, 0.3) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Train without clipping', hint: 'bad batches hit', on: () => set({ ...D0, clip: false }), off: reset },
      { label: 'Float16 without a scaler', hint: 'gradients vanish', on: () => set({ ...D0, scaler: false }), off: reset },
      { label: 'Forget to divide the loss', hint: 'steps four times too big', on: () => set({ ...D0, div: false }), off: reset },
      { label: 'Save only the model', hint: 'Adam starts over', on: () => set({ ...D0, optState: false }), off: reset },
      { label: 'Save in place', hint: 'killed mid-save', on: () => set({ ...D0, atomic: false }), off: reset },
    ];
    function status() {
      const r = R, f = r.nan ? 'NaN' : r.final.toFixed(2);
      if (r.nan) return { ok: false, msg: '<b>In float16 without a loss scaler, small gradients flushed to zero and learning crawled, then at step 130 a gradient overflowed to infinity and the weights became NaN: the run is dead.</b> A loss scaler keeps small gradients alive and skips any overflowing step; or train in bfloat16.' };
      if (!st.clip) return { ok: false, msg: `<b>Without clipping, ${st.prec === 'fp16' ? 'the first bad batch, too large but not infinite, throws' : 'each bad batch throws'} the weights far off course and the loss leaps to ${r.peak.toFixed(2)} before it slowly recovers.</b> Clip the global gradient norm to a limit such as 1.0 so one batch cannot undo hours of training.` };
      if (!st.div) return { ok: false, msg: `<b>Four micro-batch gradients were added without dividing the loss by four, so every step is four times too large and the loss thrashes: final loss ${f}.</b> Divide each micro-batch loss by the accumulation count.` };
      if (!st.atomic) return { ok: false, msg: `<b>The kill landed while the checkpoint was being written in place, so the only file is broken and the run starts again from zero: ${r.lost.toFixed(0)} steps of progress lost.</b> Write to a temporary file and rename it into place.` };
      if (!st.optState) return { ok: false, msg: `<b>The checkpoint held the weights but not Adam's moments, so after the resume the optimizer starts cold and the loss jumps before settling: final loss ${f}.</b> Save the optimizer, schedule, step counter and random state too.` };
      return { ok: true, msg: `<b>Clipped, ${st.prec === 'fp16' ? `scaled (${r.skipped.length} overflowing step${r.skipped.length === 1 ? '' : 's'} skipped)` : st.prec === 'bf16' ? 'in bfloat16' : 'in float32'}, accumulated correctly and resumed cleanly from step 150: final loss ${f}.</b> Each belt is a few lines; together they keep a long run alive.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A long run', home: true, say: 'A small model trains for two hundred steps on a shared GPU. Two bad batches and a kill are coming.', act: m => m.set({ clip: true, prec: 'fp16', scaler: true, div: true, optState: true, atomic: true }) },
    { t: 'Clip the norm', home: true, say: 'Without clipping, each bad batch throws the weights off course. Clipping caps the step.', act: m => m.set({ clip: false, prec: 'fp32', scaler: true, div: true, optState: true, atomic: true }) },
    { t: 'Half precision', home: true, say: 'In float16, small gradients vanish. A loss scaler keeps them alive and skips steps that overflow.', act: m => m.set({ clip: true, prec: 'fp16', scaler: false, div: true, optState: true, atomic: true }) },
    { t: 'Accumulate', home: true, say: 'Four micro-batches make one step. Forget to divide the loss by four and the steps are four times too big.', act: m => m.set({ clip: true, prec: 'fp16', scaler: true, div: false, optState: true, atomic: true }) },
    { t: 'Killed mid-save', home: true, say: 'Writing a checkpoint in place, a kill leaves a broken file. Write to a temporary file, then rename.', act: m => m.set({ clip: true, prec: 'fp16', scaler: true, div: true, optState: true, atomic: false }) },
    { t: 'All belts on', home: true, say: 'With optimizer state saved too, the run resumes from step 150 as if nothing happened.', act: m => m.set({ clip: true, prec: 'fp16', scaler: true, div: true, optState: true, atomic: true }) },
  ],
  check: [
    { q: 'What does gradient clipping do?', options: ['Scales all gradients down when their total norm passes a limit', 'Deletes bad batches', 'Lowers the learning rate forever'], answer: 0, why: 'One batch can\'t move the model far.', hint: 'Try Train without clipping.' },
    { q: 'Why divide the loss in gradient accumulation?', options: ['Summed micro-batch gradients would make the step too large', 'To save memory', 'To use float16'], answer: 0, why: 'Divide by the accumulation count.', hint: 'Try Forget to divide the loss.' },
    { q: 'Why write checkpoints to a temporary file first?', options: ['A kill mid-save never leaves a broken file', 'It is faster', 'It compresses'], answer: 0, why: 'Rename is atomic.', hint: 'Try Save in place.' },
  ],
  terms: [
    ['Gradient norm', 'The overall size of all gradients together.'],
    ['Clipping', 'Scaling gradients down to a set maximum norm.'],
    ['Loss scaler', 'Multiplies the loss so float16 gradients don\'t vanish; skips overflowing steps.'],
    ['bfloat16', 'A 16-bit format with float32\'s range and less precision.'],
    ['Gradient accumulation', 'Summing gradients over micro-batches before one step.'],
    ['Atomic save', 'Writing to a temporary file and renaming, so the file is always valid.'],
  ],
  deeper: '<p><b>Log the scale.</b> A loss scale that keeps halving is an early warning that something upstream is wrong.</p><p><b>Random state.</b> Saving the random-number state and the data position lets a resumed run see the same batches it would have seen.</p><p><b>About this machine.</b> The group and the loss curve are invented for illustration.</p>',
  code: {
    title: 'One training step with all four belts',
    note: 'Adapted for this lesson from standard PyTorch patterns.',
    text: `
import os, torch

scaler = torch.amp.GradScaler("cuda")
ACCUM = 4

def train_step(model, opt, micro_batches, max_norm=1.0):
    for x, y in micro_batches:
        with torch.autocast("cuda", dtype=torch.float16):
            loss = model(x, y) / ACCUM                 # divide by the accumulation count
        scaler.scale(loss).backward()
    scaler.unscale_(opt)
    torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm)
    scaler.step(opt)                                   # skipped if any gradient is inf or NaN
    scaler.update()
    opt.zero_grad(set_to_none=True)

def save(path, model, opt, sched, step):
    state = {"model": model.state_dict(), "opt": opt.state_dict(), "sched": sched.state_dict(),
             "step": step, "rng": torch.get_rng_state(), "scaler": scaler.state_dict()}
    torch.save(state, path + ".tmp")
    os.replace(path + ".tmp", path)                    # atomic rename
`,
  },
};
