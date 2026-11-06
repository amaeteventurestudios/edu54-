// Music generation: a small token model writes highlife loops for a producer in Accra, one step at a time. Rows are bell, kick, shaker and bass; columns are the 16 steps of a bar;
// bars stack from back to front. The model's per-step chances were learned from training loops; sampling with temperature is run live with a seed, as is every measure.
// Past its context window (8 bars) the model only sees its own recent output and falls into a loop. Break it: temperature too high (the bell pattern breaks apart),
// 24 bars with no structure (it repeats one bar over and over), a prompt naming a living artist with the filter off.
const STEPS = 16, ROWS = ['bell', 'kick', 'shaker', 'bass'], RC = ['#C9A227', '#7A3B69', '#1F9E89', '#3B3F8F'];
const BELL = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0];
const PROB = [
  BELL.map(b => (b ? 0.95 : 0.04)),
  [0.92, 0.03, 0.05, 0.1, 0.1, 0.05, 0.08, 0.04, 0.85, 0.03, 0.3, 0.06, 0.1, 0.05, 0.08, 0.05],
  Array.from({ length: STEPS }, (_, i) => (i % 2 ? 0.55 : 0.85)),
  [0.8, 0.05, 0.1, 0.6, 0.05, 0.1, 0.7, 0.05, 0.1, 0.05, 0.75, 0.05, 0.1, 0.5, 0.05, 0.1],
];
const WINDOW = 8;
function generate(st) {
  let seed = 97 + st.seed * 131; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const T = [0.6, 1, 2.5][st.temp], bars = st.long ? 24 : 8, out = [];
  const temper = p => { const l = Math.log(p / (1 - p)) / T; return 1 / (1 + Math.exp(-l)); };
  for (let b = 0; b < bars; b++) {
    if (b >= WINDOW && !st.structure) { out.push(out[b - 1].map(r => r.slice())); continue; }   // past the window it copies its own last bar
    out.push(PROB.map(row => row.map(p => (rnd() < temper(p) ? 1 : 0))));
  }
  return out;
}

export default {
  slug: 'music-generation',
  title: 'Music generation: one token at a time',
  description: 'A small model writes highlife loops for a producer in Accra, one step at a time: bell, kick, shaker and bass. Turn the temperature up until the bell pattern falls apart, let it run past its memory until it loops, or ask for a living artist\'s style with the filter off.',
  overview: 'Music models turn audio into tokens and learn to continue them. MusicGen predicts neural-codec tokens one after another, conditioned on a text or melody prompt, and a codec decodes them to sound; Stable Audio and AudioLDM instead run diffusion over compressed audio, good for loops and textures; commercial systems such as Suno and Udio combine approaches for full songs with vocals. Sampling temperature trades faithfulness for surprise: too high, and the rhythm that defines a style, like highlife\'s bell pattern, breaks apart. Autoregressive models see only a limited window and drift or loop beyond it, so long pieces need structure such as sections and crossfades. Quality is measured with Fréchet audio distance against real music, text-audio alignment and listening tests. Training data and prompts that imitate living artists raise licensing problems, so safe pipelines use licensed or open data, filter prompts and label AI music.',
  keywords: ['music generation', 'musicgen', 'audio tokens', 'temperature', 'fréchet audio distance', 'licensing'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.15, 1.1, 1.1], half: 1.75, wide: 6.0 },

  build(S) {
    const { THREE, V, P, C } = S;
    const st = { temp: 1, long: false, structure: false, filter: true, artist: false, seed: 0 };
    const ink = '#151827', CW = 0.3, DEP = 3.1, GX = i => -2.3 + (i + 0.5) * CW;
    let BD = DEP / 8;
    const base = P.box(6.0, 0.12, 4.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.2); S.add(base);
    const bed = P.box(STEPS * CW + 0.2, 0.05, DEP + 0.2, '#2B2B38', { r: 0.04 }); bed.position.set(GX(7.5), 0.12, -1.3 + DEP / 2); S.add(bed);
    const BZ = b => -1.3 + (b + 0.5) * BD, RX = (i, r) => GX(i) - CW / 2 + (r + 0.5) * (CW / 4);
    const geo = new THREE.BoxGeometry(CW / 4 * 0.85, 1, 1); geo.translate(0, 0.5, 0);
    const im = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: '#FFFFFF' }), 24 * STEPS * 4); im.frustumCulled = false; im.userData.noFit = true; S.add(im);
    const keep = P.box(STEPS * CW, 0.3, DEP, '#000', {}); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(GX(7.5), 0.17, -1.3 + DEP / 2); S.add(keep);
    [0, 4, 8, 12].forEach(i => { const t = S.text(`beat ${i / 4 + 1}`, { size: 0.09, weight: 800, color: ink }); t.position.set(GX(i) + CW * 1.5, 0.175, -1.55); S.add(t); });
    ROWS.forEach((n, r) => { const t = S.text(n, { size: 0.11, weight: 800, color: RC[r] }); t.position.set(GX(15) + 0.6, 0.175, -1.05 + r * 0.26); S.add(t); });
    const win = P.box(STEPS * CW + 0.3, 0.02, 0.03, '#D64545', { r: 0.01 }); win.position.set(GX(7.5), 0.2, -1.3 + WINDOW * BD); win.userData.noFit = true; S.add(win);
    const winT = S.text('end of memory: 8 bars', { size: 0.08, weight: 800, color: '#D64545' }); winT.userData.noFit = true; winT.position.set(GX(0) - 0.55, 0.18, -1.3 + WINDOW * BD); S.add(winT);
    const head = P.box(0.04, 0.32, DEP + 0.1, '#FFFFFF', { r: 0.01 }); head.material = new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.5 }); head.userData.noFit = true; S.add(head);
    const sign = P.box(2.4, 0.42, 0.06, '#3B3F8F', { r: 0.03 }); sign.position.set(GX(7.5), 0.12, 2.0); S.add(sign);
    const pT = S.text('', { size: 0.085, weight: 800, face: 'front', color: '#FFFFFF', maxW: 2.3 }); pT.position.set(GX(7.5), 0.4, 2.035); S.add(pT);
    const lT = S.text('', { size: 0.08, weight: 700, face: 'front', color: '#F2C94C', maxW: 2.3 }); lT.position.set(GX(7.5), 0.22, 2.035); S.add(lT);

    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    let G = null, M = null, tm = 0;
    function draw() {
      const blocked = st.artist && st.filter;
      G = blocked ? [] : generate(st); BD = DEP / (st.long ? 24 : 8); win.position.z = -1.3 + WINDOW * BD; winT.position.z = -1.3 + WINDOW * BD;
      let k = 0;
      for (let b = 0; b < 24; b++) for (let i = 0; i < STEPS; i++) for (let r = 0; r < 4; r++) {
        const on = G[b] && G[b][r][i], vis = b < (st.long ? 24 : 8); if (vis) m4.makeScale(1, on ? 0.22 : 0.001, BD * 0.82).setPosition(RX(i, r), 0.17, BZ(b)); else m4.makeScale(0.0001, 0.0001, 0.0001).setPosition(GX(7.5), 0.17, -1.3); im.setMatrixAt(k, m4);
        im.setColorAt(k, col.set(on ? (r === 0 && !BELL[i] ? '#D64545' : RC[r]) : '#2B2B38')); k++;
      }
      im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
      win.visible = st.long; winT.visible = st.long;
      const bellKept = G.length ? G.filter(bar => bar[0].every((v, i) => v === BELL[i])).length / G.length : 0;
      const after = G.slice(WINDOW), repeats = after.length ? after.filter((bar, j) => JSON.stringify(bar) === JSON.stringify(G[WINDOW + j - 1])).length / after.length : 0;
      const stray = G.length ? G.reduce((a, bar) => a + bar[0].filter((v, i) => v && !BELL[i]).length, 0) / G.length : 0;
      M = { bellKept, repeats, stray, blocked, bars: G.length };
      pT.userData.set(st.artist ? 'Prompt: "highlife, in the style of [a living star]"' : 'Prompt: "highlife loop, 120 bpm, bell and bass"');
      lT.userData.set(blocked ? 'Blocked: names a real artist' : st.artist ? 'Generated: imitates a real artist' : 'Instrumental, from licensed loops');
    }
    draw();
    const update = dt => { tm = (tm + dt * 2) % STEPS; head.position.set(GX(0) - CW / 2 + tm * CW, 0.17, -1.3 + DEP / 2); head.visible = !M.blocked; };
    const controls = [
      { type: 'buttons', label: 'Temperature', options: ['0.6', '1.0', '2.5'], get: () => st.temp, act: i => { st.temp = i; draw(); } },
      { type: 'buttons', label: 'Length', options: ['8 bars', '24 bars'], get: () => (st.long ? 1 : 0), act: i => { st.long = !!i; draw(); } },
      { type: 'toggle', label: 'Plan sections past the memory', short: 'structure', get: () => st.structure, set: v => { st.structure = v; draw(); } },
      { type: 'toggle', label: 'Ask for a living artist\'s style', short: 'artist prompt', get: () => st.artist, set: v => { st.artist = v; draw(); } },
      { type: 'toggle', label: 'Prompt filter', short: 'filter', get: () => st.filter, set: v => { st.filter = v; draw(); } },
      { type: 'button', label: 'Generate again', act: () => { st.seed++; draw(); } },
    ];
    const readouts = [
      { label: 'Bell pattern kept', get: () => ({ v: M.blocked ? '–' : `${Math.round(M.bellKept * 100)}%`, sub: 'bars with the exact bell', good: M.bellKept >= 0.6, bad: !M.blocked && M.bellKept < 0.3 }) },
      { label: 'Stray bell hits', get: () => ({ v: M.blocked ? '–' : M.stray.toFixed(1), sub: 'per bar, in red', bad: M.stray > 1.5 }) },
      { label: 'Bars repeated', get: () => ({ v: st.long && !M.blocked ? `${Math.round(M.repeats * 100)}%` : '–', sub: 'after the memory ends', bad: M.repeats > 0.5 }) },
    ];
    const labels = [
      { name: 'grid', t: 'Generated bars', d: 'Bell, kick, shaker, bass per step', icon: 'wave', atV: V(GX(0) - CW / 2 - 0.1, 0.2, -0.5) },
      { name: 'prompt', t: 'Prompt', d: 'And the licence check', icon: 'check', atV: V(GX(7.5) + 1.25, 0.33, 2.0) },
    ];
    const reset = () => { Object.assign(st, { temp: 1, long: false, structure: false, filter: true, artist: false, seed: 0 }); draw(); };
    const breaks = [
      { label: 'Temperature 2.5', hint: 'Flatten every chance', on: () => { reset(); st.temp = 2; draw(); }, off: reset },
      { label: '24 bars, no structure', hint: 'Past its memory', on: () => { reset(); st.long = true; draw(); }, off: reset },
      { label: 'Artist prompt, no filter', hint: 'Imitate a living star', on: () => { reset(); st.artist = true; st.filter = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.artist && !st.filter) return { ok: false, msg: `<b>A licensing problem, generated on request.</b> The prompt asks for a living artist's style and nothing stops it. Imitating a named artist's voice or signature sound has led to lawsuits and settlements with labels, and many countries now require AI music to be labelled. Filter prompts that name real artists, train on licensed or open music, and tag every output.` };
      if (M.blocked) return { ok: true, msg: `<b>Blocked by the prompt filter.</b> The prompt names a living artist, so nothing is generated. Ask for the style itself, highlife, palm-wine guitar, a bell pattern, instead of a person.` };
      if (st.temp === 2) return { ok: false, msg: `<b>The bell pattern falls apart.</b> At temperature 2.5, every chance is flattened towards a coin toss, so the bell, which defines highlife's groove, keeps its exact pattern in only ${Math.round(M.bellKept * 100)}% of bars, with ${M.stray.toFixed(1)} stray hits per bar in red. Keep temperature near 1 for style, a little lower for steady loops.` };
      if (st.long && !st.structure) return { ok: false, msg: `<b>Stuck in a loop.</b> The model remembers 8 bars. Past that it sees only its own recent output, and here it copies its last bar again and again: ${Math.round(M.repeats * 100)}% of the bars after the red line repeat the bar before. Plan sections, generate in overlapping pieces and crossfade, or use a model built for whole songs.` };
      return { ok: true, msg: `<b>${M.bars} bars of highlife.</b> At temperature ${['0.6', '1.0', '2.5'][st.temp]}, the bell keeps its exact pattern in ${Math.round(M.bellKept * 100)}% of bars while kick, shaker and bass vary.${st.long ? ' Planned sections carry it past the 8-bar memory without looping.' : ''} The prompt asks for a style, not a person.` };
    }
    return { update, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'A highlife loop', home: true, say: 'A producer in Accra asks a music model for a highlife loop. It writes bell, kick, shaker and bass, one step at a time.', act: m => m.set({ temp: 1, long: false, structure: false, filter: true, artist: false, seed: 0 }) },
    { t: 'Learned chances', home: true, say: 'For every step, the model has learned how likely each sound is. The bell almost always follows highlife\'s pattern.', act: m => m.set({}) },
    { t: 'Too hot', home: true, say: 'Turn the temperature up, and every chance flattens. Stray bell hits appear, and the groove falls apart.', act: m => m.set({ temp: 2 }) },
    { t: 'Past its memory', home: true, say: 'Ask for twenty-four bars. Past its eight-bar memory, the model copies itself and loops one bar.', act: m => m.set({ temp: 1, long: true }) },
    { t: 'Structure', home: true, say: 'Plan sections and generate in overlapping pieces, and the music keeps moving.', act: m => m.set({ structure: true }) },
    { t: 'Whose style?', home: true, say: 'Ask for a living star\'s style, and a filter should stop it. Ask for the style itself instead.', act: m => m.set({ long: false, structure: false, artist: true }) },
  ],
  check: [
    { q: 'What does raising the sampling temperature do to generated music?', options: ['Flattens the chances, so patterns break more often', 'Makes it play faster', 'Always improves quality'], answer: 0, why: 'Keep temperature near 1 for style.' },
    { q: 'Why do autoregressive music models loop on long pieces?', options: ['Past their window they see only their own recent output', 'They run out of notes', 'Loops are required by codecs'], answer: 0, why: 'Use sections and crossfades.' },
    { q: 'What is a safe way to handle prompts naming living artists?', options: ['Filter them and ask for the style instead', 'Always allow them', 'Add more temperature'], answer: 0, why: 'Imitating named artists raises licensing problems.' },
  ],
  terms: [
    ['Audio token', 'A discrete code for a short slice of sound, from a neural codec.'],
    ['Autoregressive', 'Generating one token at a time, each from those before.'],
    ['Temperature', 'A setting that flattens (high) or sharpens (low) sampling chances.'],
    ['Context window', 'How much earlier output the model can see.'],
    ['Fréchet audio distance', 'A distance between generated and real audio in embedding space.'],
    ['Prompt filter', 'A check that blocks requests the system should not fulfil.'],
  ],
  deeper: '<p><b>Two families.</b> Token models like MusicGen continue codec tokens one by one; diffusion models like Stable Audio refine a whole clip at once and suit loops and textures. Full-song systems combine both with planning for verses and choruses.</p><p><b>Training data.</b> Highlife, Afrobeats, mbalax and benga are under-represented in most training sets. Licensed catalogues from African labels and producers make better, fairer models.</p><p><b>About this machine.</b> The step chances are hand-made from typical highlife loops. Sampling with temperature, the memory limit, the loop, and every measure are computed live.</p>',
  code: {
    title: 'Sampling steps with temperature',
    note: 'Adapted from the course\'s music generation lesson.',
    text: `
import numpy as np

def sample_bar(probs, temperature, rng):
    logit = np.log(probs / (1 - probs)) / temperature
    p = 1 / (1 + np.exp(-logit))
    return (rng.random(probs.shape) < p).astype(int)   # rows: instruments, cols: steps

rng = np.random.default_rng(0)
song = [sample_bar(PROBS, 1.0, rng) for _ in range(8)]
# past the model's window, generate new sections and crossfade instead of continuing blindly
`,
  },
};
