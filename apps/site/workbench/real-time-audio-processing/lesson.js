// Real-time audio: a voice line for a health clinic in Kigali. 20 ms audio frames travel along a conveyor: network jitter, a jitter buffer, a ring buffer, voice gating,
// streaming recognition; the reply comes back through text-to-speech, and a barge-in check listens while it speaks. Frame arrival times are simulated with a fixed seed;
// the latency budget, late frames (gaps heard), echo triggers and barge-in time are computed live.
// Break it: no jitter buffer (late packets play as gaps), a 500 ms "safe" ring buffer (everything feels slow), no echo cancellation (the bot hears its own voice and interrupts itself).
const STAGES = [['mic', 20], ['network', 40], ['jitter buffer', 0], ['ring buffer', 0], ['voice gate', 2], ['speech to text', 240], ['answer', 220], ['text to speech', 100]];

export default {
  slug: 'real-time-audio-processing',
  title: 'Real-time audio: every millisecond counts',
  description: 'A voice line for a clinic in Kigali streams 20 ms audio frames through eight stages. Each one spends part of a budget, so stay under the line that feels instant.',
  overview: 'Real-time voice systems move audio in small fixed frames, usually 20 milliseconds, and every stage must keep pace. Network packets arrive late and out of order, so a jitter buffer of 60 to 80 ms holds and reorders them: too small and late packets become audible gaps, too large and every turn waits. A ring buffer passes frames between threads without allocating memory; its size is a floor on latency, so "buffer half a second to be safe" makes the whole system feel slow. A voice activity detector skips silence, streaming recognisers emit text every few hundred milliseconds, and text-to-speech is warmed up in advance. While the system speaks, its own voice comes back through the microphone; echo cancellation removes it, or the system hears itself and interrupts. When the caller really does interrupt, the reply must stop within about 100 ms.',
  keywords: ['real-time audio', 'latency', 'jitter buffer', 'ring buffer', 'echo cancellation', 'barge-in'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.25, 0.1], dir: [0.05, 0.95, 1.15], half: 1.05, wide: 5.6 },

  build(S) {
    const { THREE, V, P, C } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const st = { jitter: true, ring: 0, aec: true };
    const ink = '#151827';
    const belt = P.box(5.8, 0.06, 0.4, '#2B2B38', { r: 0.03 }); belt.position.set(0, 0.12, 0.35); floor.add(belt);
    const SX = i => -2.6 + i * 0.74;
    const stations = STAGES.map(([n], i) => {
      const mm = new THREE.MeshLambertMaterial({ color: '#3B3F8F' }), b = P.box(0.68, 0.5, 0.3, '#3B3F8F', { r: 0.04, material: mm }); b.position.set(SX(i), 0.18, -0.05); floor.add(b);
      return { mm, b };
    });
    const ringBox = stations[3].b;
    const frames = Array.from({ length: 14 }, () => { const mm = new THREE.MeshLambertMaterial({ color: C.teal }), f = P.box(0.14, 0.1, 0.24, C.teal, { r: 0.02, material: mm }); f.userData.noFit = true; floor.add(f); return { f, mm, t: 0 }; });
    /* latency budget bar along the front */
    const BX0 = -2.75, BW = 5.5, budget = P.box(BW, 0.04, 0.22, '#E3DCCB', { r: 0.02 }); budget.position.set(0, 0.12, 0.95); floor.add(budget);
    const segs = STAGES.map((_, i) => { const mm = new THREE.MeshLambertMaterial({ color: i % 2 ? '#7A3B69' : '#3B3F8F' }), b = P.box(1, 0.08, 0.2, '#3B3F8F', { r: 0.01, material: mm }); b.userData.noFit = true; floor.add(b); return { b, mm }; });
    const goal = P.box(0.03, 0.25, 0.3, '#D64545', { r: 0.01 }); goal.userData.noFit = true; floor.add(goal);


    /* the speaker and echo path */
    const spk = P.cyl(0.18, 0.3, '#2B2B38'); spk.position.set(2.75, 0.12, -0.75); floor.add(spk);
    const echoM = new THREE.MeshBasicMaterial({ color: '#D64545', transparent: true, opacity: 0.7 }), echo = P.tube([V(2.6, 0.35, -0.75), V(0, 0.9, -1.0), V(-2.6, 0.45, -0.3)], 0.015, '#D64545', { material: echoM }); echo.layers.set(1); echo.userData.noFit = true; floor.add(echo);


    let R = null, clock = 0;
    function run() {
      let seed = 41; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const jit = Array.from({ length: 200 }, () => Math.max(0, (rnd() < 0.08 ? 60 + 50 * rnd() : 25 * rnd())));   // most packets a little late, a few very late
      const jb = st.jitter ? 70 : 0, late = jit.filter(j => j > jb + 35).length / jit.length;
      const ringMs = [40, 500][st.ring];
      const ms = [20, 40, jb, ringMs, 2, 240, 220, 100];
      const total = ms.reduce((a, b) => a + b, 0);
      return { ms, total, late, echo: !st.aec, barge: st.aec ? 90 : null };
    }
    function draw() {
      R = run();
      stations.forEach((s, i) => { s.mm.color.set(i === 2 && !st.jitter ? '#C9C5BA' : i === 3 && st.ring ? '#D64545' : '#3B3F8F'); });
      ringBox.scale.x = st.ring ? 1.25 : 1;
      const scale = BW / 1600; let x = BX0;
      segs.forEach((g, i) => { const w = Math.max(0.002, R.ms[i] * scale); g.b.scale.x = w; g.b.position.set(x + w / 2, 0.16, 0.95); g.mm.color.set(i === 3 && st.ring ? '#D64545' : i % 2 ? '#7A3B69' : '#3B3F8F'); x += w; });
      goal.position.set(BX0 + 800 * scale, 0.12, 0.95);
      echo.visible = R.echo;
    }
    draw();
    const update = dt => { clock += dt;
      frames.forEach((f, i) => { const u = ((clock * 0.45 + i / frames.length) % 1), x = -2.75 + u * 5.5; f.f.position.set(x, 0.18 + (st.jitter ? 0 : (i % 5 === 0 && u > 0.15 && u < 0.3 ? 0.12 : 0)), 0.35);
        const gap = !st.jitter && i % 5 === 0; f.mm.color.set(gap ? '#D64545' : C.teal); f.f.visible = !(gap && u > 0.3); }); };
    const controls = [
      { type: 'toggle', label: 'Jitter buffer (70 ms)', short: 'jitter buffer', get: () => st.jitter, set: v => { st.jitter = v; draw(); } },
      { type: 'buttons', label: 'Ring buffer', options: ['40 ms', '500 ms "to be safe"'], get: () => st.ring, act: i => { st.ring = i; draw(); } },
      { type: 'toggle', label: 'Echo cancellation', short: 'echo cancel', get: () => st.aec, set: v => { st.aec = v; draw(); } },
    ];
    const readouts = [
      { label: 'To first word', get: () => ({ v: `${R.total} ms`, sub: 'aim for under 800', good: R.total <= 800, bad: R.total > 1000 }) },
      { label: 'Gaps heard', get: () => ({ v: `${(R.late * 100).toFixed(1)}%`, sub: 'frames too late to play', bad: R.late > 0.02, good: R.late <= 0.01 }) },
      { label: 'Barge-in stop', get: () => ({ v: R.barge ? `${R.barge} ms` : 'false triggers', sub: 'when the caller interrupts', bad: !R.barge, good: !!R.barge }) },
    ];
    const labels = [
      { name: 'belt', t: 'Audio frames', d: '20 ms each; red: late', icon: 'wave', atV: V(-2.95, 0.15, 0.35) },
      { name: 'budget', t: 'Latency budget', d: 'Each stage takes its share', icon: 'chart', atV: V(2.8, 0.15, 0.95) },
    ];
    const reset = () => { Object.assign(st, { jitter: true, ring: 0, aec: true }); draw(); };
    const breaks = [
      { label: 'No jitter buffer', hint: 'Play packets as they come', on: () => { reset(); st.jitter = false; draw(); }, off: reset },
      { label: '500 ms ring buffer', hint: '"To be safe"', on: () => { reset(); st.ring = 1; draw(); }, off: reset },
      { label: 'No echo cancellation', hint: 'The bot hears itself', on: () => { reset(); st.aec = false; draw(); }, off: reset },
    ];
    function status() {
      if (!st.jitter) return { ok: false, msg: `<b>Gaps in the caller's voice.</b> Packets cross the network a little late, and a few very late. With no jitter buffer, ${(R.late * 100).toFixed(1)}% of frames miss their slot and play as pops or silence, and the recogniser mishears words like the patient's name. A 70 ms jitter buffer smooths them at a small cost in delay.` };
      if (st.ring) return { ok: false, msg: `<b>Safe, and slow.</b> A 500 ms ring buffer means every frame waits half a second before anyone reads it. The first word of the reply now arrives after ${R.total} ms, well past the 800 ms where a conversation feels natural; callers start talking over the system. The buffer is the latency floor: keep it to a few frames.` };
      if (!st.aec) return { ok: false, msg: `<b>The bot interrupts itself.</b> Without echo cancellation, the system's own voice comes back through the caller's phone into the microphone. The voice gate hears speech, treats it as a barge-in and cuts the reply off mid-sentence, again and again. Cancel the echo using the audio being played as a reference.` };
      return { ok: true, msg: `<b>${R.total} ms to the first word.</b> A 70 ms jitter buffer hides network delays (${(R.late * 100).toFixed(1)}% of frames late), a 40 ms ring buffer keeps waiting short, the voice gate skips silence, and echo cancellation lets the caller interrupt and stop the reply within ${R.barge} ms.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A clinic voice line', home: true, say: 'A health clinic in Kigali answers calls with a voice system. Audio moves in twenty-millisecond frames, through every stage in turn.', act: m => m.set({ jitter: true, ring: 0, aec: true }) },
    { t: 'The budget', home: true, say: 'Add up every stage. Under about eight hundred milliseconds to the first word, a conversation feels natural.', act: m => m.set({}) },
    { t: 'Jitter', home: true, say: 'Packets arrive late and out of order. Without a jitter buffer, late frames play as gaps, and words are misheard.', act: m => m.set({ jitter: false }) },
    { t: 'Too safe', home: true, say: 'Set a half-second ring buffer to be safe, and every reply arrives too late. The buffer is the floor on latency.', act: m => m.set({ jitter: true, ring: 1 }) },
    { t: 'Echo', home: true, say: 'Without echo cancellation, the system hears its own voice, thinks the caller has interrupted, and cuts itself off.', act: m => m.set({ ring: 0, aec: false }) },
    { t: 'Barge-in', home: true, say: 'With the echo removed, a real interruption stops the reply within about a tenth of a second.', act: m => m.set({ aec: true }) },
  ],
  check: [
    { q: 'What does a jitter buffer do?', options: ['Holds and reorders late network packets so they play smoothly', 'Removes echo', 'Speeds up recognition'], answer: 0, why: 'Too small gives gaps, too large adds delay.' },
    { q: 'Why is a large ring buffer a problem in a voice system?', options: ['Every frame waits that long, so it sets a floor on latency', 'It uses too little memory', 'It removes silence'], answer: 0, why: 'Keep it to a few frames.' },
    { q: 'What happens without echo cancellation?', options: ['The system hears its own voice and may interrupt itself', 'The caller hears nothing', 'Latency drops'], answer: 0, why: 'Its output comes back through the microphone.' },
  ],
  terms: [
    ['Frame', 'A short fixed block of audio, often 20 ms.'],
    ['Latency', 'The delay from speech to response.'],
    ['Jitter buffer', 'Smooths late and out-of-order packets.'],
    ['Ring buffer', 'A circular buffer passing frames between threads.'],
    ['Echo cancellation', 'Removing the system\'s own output from the microphone signal.'],
    ['Barge-in', 'The caller interrupting while the system speaks.'],
  ],
  deeper: '<p><b>Phone networks.</b> Calls over mobile networks across East Africa add their own delay and loss, often more than broadband. Budget for the worst network your callers use, and test on real phones.</p><p><b>Warm everything.</b> Load models and run a dummy request before the first call; a cold text-to-speech model can add a few hundred milliseconds to the first reply.</p><p><b>About this machine.</b> Packet delays are simulated with a fixed seed; stage timings are typical values. The budget, gaps, echo triggers and barge-in time are computed live.</p>',
  code: {
    title: 'A ring buffer and a barge-in check',
    note: 'Adapted from the course\'s real-time audio lesson.',
    text: `
import numpy as np

class Ring:
    def __init__(self, seconds=0.04, sr=16_000):
        self.buf, self.w, self.r = np.zeros(int(seconds * sr), np.float32), 0, 0
    def write(self, frame):
        idx = (self.w + np.arange(len(frame))) % len(self.buf)
        self.buf[idx] = frame; self.w = (self.w + len(frame)) % len(self.buf)

def on_frame(frame, playing, vad, aec, tts):
    clean = aec.cancel(frame, reference=tts.last_output())   # remove our own voice
    if playing and vad.is_speech(clean):
        tts.stop()                                           # barge-in: stop within ~100 ms
`,
  },
};
