// Long video: a newsroom in Kisumu asks when a county council voted on the market-roof repair in a recording up to three hours long. Three ways in: one long context
// (one GPU holds 128k tokens; a ring of 8 holds about a million), summary tokens (one per clip), or an agent that retrieves a few clips and reads them.
// Token counts are exact at one frame per second and 64 tokens per frame. Recall follows the course's reported pattern (open models about 85-90% to half an hour, falling
// past an hour; retrieval as good as its retriever); seconds to answer are illustrative, with attention work growing with the square of the tokens.
// Break it: three hours on one GPU, summary tokens for an exact moment, a weak retriever.
const LENS = [15, 60, 180], PER = 64, CAP = 128000, NEEDLE = 0.72, K = 36;
function run(st) {
  const min = LENS[st.len], tok = min * 60 * PER, cap = CAP * st.gpus;
  const at = Math.round(min * NEEDLE);
  let used, recall, found, secs, exact = true, picks = [];
  if (st.path === 0) { used = Math.min(tok, cap); const fit = used / tok; recall = [0.9, 0.85, 0.72][st.len] * fit; found = fit > NEEDLE; secs = 3 + 4 * (used / 57600) ** 2 / st.gpus; }
  else if (st.path === 1) { used = Math.round(min * 60 / 16); recall = 0.5; found = true; exact = false; secs = 3 + used / 2000; }
  else { picks = st.good ? [4, 12, Math.floor(NEEDLE * K), 27, 31] : [3, 9, 15, 21, 33]; used = 5 * 30 * PER + 400; recall = st.good ? 0.93 : 0.4; found = st.good; secs = 3 + 4 * picks.length; }
  return { min, tok, cap, used, recall, found, secs, exact, picks, at, over: st.path === 0 && tok > cap };
}
const hm = m => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`);

export default {
  slug: 'long-video-million-token',
  title: 'Long video: hours, not minutes',
  description: 'A newsroom in Kisumu asks when a county council voted on the market-roof repair in a recording up to three hours long. Read it all in one long context spread over a ring of GPUs, squeeze it into summary tokens, or let an agent fetch the right clips. Then run three hours on one GPU, ask summary tokens for an exact moment, or give the agent a weak retriever.',
  overview: 'At one frame per second and 64 tokens per frame, a three-hour video is about 690 thousand tokens, far past a typical 128-thousand-token context. There are four ways through. Brute context: closed models such as Gemini read millions of tokens in one pass with custom attention. Ring attention: open models such as LWM and LongVILA split the sequence across devices in a ring; each holds a chunk and passes its keys and values to the next, so memory per device stays flat while total context grows with the number of devices, though attention work still grows with the square of the length. Token compression: Video-XL condenses each clip into a summary token, which keeps the gist but loses exact moments. Agentic retrieval: VideoAgent treats the video as a database, asks a retriever for likely clips, reads only those with a vision model and asks again if needed; it is cheap and strong on very long video, as long as the retriever finds the right clips. Needle-in-a-haystack tests hide one marker and ask for it; open models do well to half an hour and slip past an hour. Production systems mix these: a pooled global pass for the summary, retrieval for detail.',
  keywords: ['long video', 'ring attention', 'million-token context', 'videoagent', 'token compression', 'needle in a haystack'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.1], dir: [0.05, 1.1, 1.1], half: 1.55, wide: 6.2 },

  build(S) {
    const { THREE, V, P } = S;
    const st = { len: 2, path: 2, gpus: 8, good: true };
    const ink = '#151827', X0 = -2.4, W = 4.8, CW = W / K;
    const base = P.box(6.0, 0.12, 3.0, '#E9E2D3', { r: 0.12 }); base.position.set(0, 0, 0.1); S.add(base);
    /* the recording as a strip of clips */
    const tape = P.box(W + 0.12, 0.05, 0.62, '#2B2B38', { r: 0.03 }); tape.position.set(0, 0.12, 0.25); S.add(tape);
    const clips = Array.from({ length: K }, (_, i) => { const mm = new THREE.MeshLambertMaterial({ color: '#1F9E89' }), b = P.box(CW * 0.86, 0.1, 0.5, '#fff', { r: 0.01, material: mm }); b.position.set(X0 + (i + 0.5) * CW, 0.17, 0.25); b.userData.noFit = true; S.add(b); return { b, mm }; });
    const ni = Math.floor(NEEDLE * K), needle = P.box(CW * 0.5, 0.06, 0.2, '#FFB703', { r: 0.01 }); needle.userData.noFit = true; S.add(needle);
    const needleT = S.text('Vote on the market roof', { size: 0.12, weight: 800, color: '#9A6A00' }); needleT.position.set(X0 + (ni + 0.5) * CW, 0.13, -0.32); S.add(needleT);
    const lenT = S.text('', { size: 0.13, weight: 800, color: ink }); lenT.position.set(-1.0, 0.13, -0.32); S.add(lenT);
    const ends = [S.text('0', { size: 0.1, weight: 800, color: ink }), S.text('', { size: 0.1, weight: 800, color: ink })]; ends[0].position.set(X0, 0.13, 0.7); ends[1].position.set(X0 + W, 0.13, 0.7); ends.forEach(e => S.add(e));
    const cutB = P.box(0.03, 0.35, 0.8, '#C62828'); cutB.userData.noFit = true; S.add(cutB);
    /* the GPU ring at the back left */
    const ringC = V(-1.8, 0.12, -1.02), gpu = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * Math.PI * 2, mm = new THREE.MeshLambertMaterial({ color: '#6B5E86' }), c = P.box(0.2, 0.16, 0.14, '#fff', { r: 0.02, material: mm });
      c.position.set(ringC.x + Math.cos(a) * 0.48, 0.12, ringC.z + Math.sin(a) * 0.26); S.add(c); return mm; });
    const ringT = S.text('', { size: 0.11, weight: 800, color: ink, maxW: 0.75 }); ringT.position.set(ringC.x + 1.0, 0.13, ringC.z); S.add(ringT);
    /* the token gauge at the back right */
    const gBox = P.box(2.6, 0.05, 0.26, '#D9D2C3', { r: 0.02 }); gBox.position.set(1.1, 0.12, -0.85); S.add(gBox);
    const gFill = P.box(1, 0.08, 0.22, '#1F9E89', { r: 0.01 }); gFill.position.set(1.1, 0.12, -0.85); S.add(gFill);
    const gT = S.text('', { size: 0.1, weight: 800, color: ink, maxW: 2.6 }); gT.position.set(1.1, 0.13, -1.12); S.add(gT);
    /* the answer card at the front */
    const card = P.box(4.4, 0.05, 0.46, '#FBF8F1', { r: 0.03 }); card.position.set(0.2, 0.12, 1.15); S.add(card);
    const ans = S.text('', { size: 0.14, weight: 800, color: ink, maxW: 4.3 }); ans.position.set(0.2, 0.18, 1.15); S.add(ans);
    const keep = P.box(5.4, 0.3, 2.6, '#000'); keep.material = new THREE.MeshBasicMaterial({ visible: false }); keep.position.set(0, 0.15, 0.1); S.add(keep);

    let R = null;
    function draw() {
      R = run(st);
      const fitK = st.path === 0 ? Math.floor(K * Math.min(1, R.cap / R.tok)) : K;
      clips.forEach((c, i) => { let colr = '#1F9E89', h = 1, y = 0.17;
        if (st.path === 0 && i >= fitK) colr = '#8A8A96';
        if (st.path === 1) { colr = '#7FA8A0'; h = 0.3; }
        if (st.path === 2) { const p = R.picks.includes(i); colr = p ? '#1F9E89' : '#59606E'; h = p ? 1.6 : 0.5; }
        c.mm.color.set(colr); c.b.scale.y = h; c.b.position.y = y; });
      needle.position.set(X0 + (ni + 0.5) * CW, 0.17 + 0.1 * clips[ni].b.scale.y + 0.01, 0.25);
      cutB.visible = R.over; if (R.over) cutB.position.set(X0 + fitK * CW, 0.12, 0.25);
      lenT.userData.set(`Council recording, ${hm(R.min)}`); ends[1].userData.set(hm(R.min));
      gpu.forEach((m, i) => m.color.set(st.path === 0 && i < st.gpus ? '#6B5E86' : '#C9C3D3'));
      ringT.userData.set(st.path === 0 ? `${st.gpus} GPU${st.gpus > 1 ? 's' : ''}: ${st.gpus > 1 ? '1M' : '128k'}` : 'Ring idle', st.path === 0 ? ink : '#8A8A96');
      const g = st.path === 0 ? R.used / R.cap : R.used / CAP; gFill.scale.x = Math.max(0.02, Math.min(1, g) * 2.6); gFill.position.x = -0.2 + gFill.scale.x / 2;
      gFill.material.color.set(R.over ? '#C62828' : '#1F9E89');
      gT.userData.set(`Model reads ${R.used.toLocaleString('en')} tokens${R.over ? ` (${R.tok.toLocaleString('en')} needed)` : ''}`, R.over ? '#C62828' : ink);
      const txt = !R.found ? (st.path === 0 ? `Not found: the context ended at ${hm(Math.round(R.min * R.cap / R.tok))}` : 'Not found: the retrieved clips are all about other items')
        : !R.exact ? 'Somewhere in the second half, during the works items' : `The vote is at ${hm(R.at)}: passed, 9 for, 2 against`;
      ans.userData.set(txt, !R.found || !R.exact ? '#8A1F1F' : ink);
    }
    draw();
    const controls = [
      { type: 'buttons', label: 'Recording', options: ['15 min', '1 hour', '3 hours'], get: () => st.len, act: i => { st.len = i; draw(); } },
      { type: 'buttons', label: 'Way in', options: ['Long context', 'Summary tokens', 'Agent retrieval'], get: () => st.path, act: i => { st.path = i; draw(); } },
      { type: 'buttons', label: 'GPUs in the ring', options: ['1', '8'], get: () => (st.gpus === 8 ? 1 : 0), act: i => { st.gpus = i ? 8 : 1; draw(); } },
      { type: 'buttons', label: 'Retriever', options: ['Good', 'Weak'], get: () => (st.good ? 0 : 1), act: i => { st.good = !i; draw(); } },
    ];
    const readouts = [
      { label: 'Recall', get: () => ({ v: `${Math.round(R.recall * 100)}%`, sub: 'finding a hidden moment, reported pattern', good: R.recall >= 0.8, bad: R.recall < 0.6 }) },
      { label: 'Tokens read', get: () => ({ v: R.used >= 1000 ? `${Math.round(R.used / 1000)}k` : String(R.used), sub: `of ${Math.round(R.tok / 1000)}k in the video` }) },
      { label: 'Seconds to answer', get: () => ({ v: String(Math.round(R.secs)), sub: 'illustrative', good: R.secs <= 30, bad: R.secs > 60 }) },
    ];
    const labels = [
      { name: 'tape', t: 'The recording', d: 'One tile per clip; gold: the vote', icon: 'eye', atV: V(X0 - 0.06, 0.2, 0.25) },
      { name: 'gauge', t: 'Tokens read', d: 'Red: more than fits', icon: 'box', atV: V(2.4, 0.15, -0.85) },
    ];
    const reset = () => { Object.assign(st, { len: 2, path: 2, gpus: 8, good: true }); draw(); };
    const breaks = [
      { label: 'Three hours on one GPU', hint: 'One 128k context', on: () => { reset(); st.path = 0; st.gpus = 1; draw(); }, off: reset },
      { label: 'Summary tokens for a moment', hint: 'One token per clip', on: () => { reset(); st.path = 1; draw(); }, off: reset },
      { label: 'Weak retriever', hint: 'Agent fetches the wrong clips', on: () => { reset(); st.good = false; draw(); }, off: reset },
    ];
    function status() {
      if (st.path === 0 && !R.found) return { ok: false, msg: `<b>The vote is past the end of the context.</b> ${hm(R.min)} at one frame per second is ${R.tok.toLocaleString('en')} tokens, but ${st.gpus} GPU holds ${Math.round(R.cap / 1000)}k, so the model only reads the first ${hm(Math.round(R.min * R.cap / R.tok))}. Spread the sequence over a ring of 8 GPUs, or retrieve the right clips instead.` };
      if (st.path === 1) return { ok: false, msg: `<b>It knows the gist, not the minute.</b> One summary token per clip shrinks ${hm(R.min)} to ${R.used} tokens, but the exact moment is blurred into its clip: "somewhere in the second half". Summary tokens suit "what happened"; for "when", read the frames or retrieve the clip.` };
      if (st.path === 2 && !st.good) return { ok: false, msg: `<b>The agent read the wrong clips.</b> Its retriever returned five clips about other agenda items, so the vision model never saw the vote. Retrieval is only as good as the retriever: improve it, or let the agent ask again with a new query.` };
      if (st.path === 0) return { ok: true, msg: `<b>Found at ${hm(R.at)}.</b> ${st.gpus} GPUs hold about a million tokens between them, enough for ${hm(R.min)}. Recall ${Math.round(R.recall * 100)}%, but attention work grows with the square of the length, so the answer takes about ${Math.round(R.secs)} seconds.` };
      return { ok: true, msg: `<b>Found at ${hm(R.at)} in about ${Math.round(R.secs)} seconds.</b> The agent asked for clips about the market roof, got five, and read only those: ${R.used.toLocaleString('en')} tokens instead of ${R.tok.toLocaleString('en')}. On very long recordings, retrieval beats reading everything.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set: p => { Object.assign(st, p); draw(); } };
  },

  story: [
    { t: 'Three hours', home: true, say: 'A newsroom in Kisumu has three hours of county council recording and asks: when was the vote on the market roof?', act: m => m.set({ len: 2, path: 2, gpus: 8, good: true }) },
    { t: 'Ask an agent', home: true, say: 'An agent asks a retriever for clips about the market roof, reads only those five, and finds the vote in seconds.', act: m => m.set({}) },
    { t: 'Read it all', home: true, say: 'Or read everything at once. Three hours is about seven hundred thousand tokens; a ring of eight GPUs holds it, but the work grows fast.', act: m => m.set({ path: 0 }) },
    { t: 'One GPU', home: true, say: 'On one GPU the context holds only about the first half hour. The vote is never read.', act: m => m.set({ path: 0, gpus: 1 }) },
    { t: 'Summaries', home: true, say: 'Squeeze each clip into one summary token, and the model knows roughly what happened but not the minute.', act: m => m.set({ path: 1, gpus: 8 }) },
    { t: 'Wrong clips', home: true, say: 'Give the agent a weak retriever, and it reads five clips about other items.', act: m => m.set({ path: 2, good: false }) },
  ],
  check: [
    { q: 'What does ring attention spread across devices?', options: ['Chunks of the sequence, passing keys and values around', 'Copies of the whole video', 'Separate questions'], answer: 0, why: 'Memory per device stays flat.' },
    { q: 'What do summary tokens give up?', options: ['Exact moments', 'The gist', 'Speed'], answer: 0, why: 'Each clip becomes one token.' },
    { q: 'What limits an agent that retrieves clips?', options: ['The quality of its retriever', 'The length of the video', 'Its context'], answer: 0, why: 'Wrong clips mean wrong answers.' },
  ],
  terms: [
    ['Ring attention', 'Splitting a long sequence across devices that pass keys and values in a ring.'],
    ['Summary token', 'One token standing for a whole clip.'],
    ['Agentic retrieval', 'Fetching and reading only the clips a question needs.'],
    ['Needle in a haystack', 'A test that hides one marker in long input.'],
    ['Recall', 'How often the hidden moment is found.'],
    ['Hybrid pipeline', 'A cheap global pass plus retrieval for detail.'],
  ],
  deeper: '<p><b>Public records.</b> County assemblies in Kenya, municipal councils in South Africa and parliaments across the continent stream long sessions. Tools that find a moment and link to it let reporters and citizens check what was said; quotes should always be checked against the recording.</p><p><b>Sizing.</b> At one frame per second and 64 tokens per frame, each hour is about 230 thousand tokens. Halving the frame rate halves that; the question decides which details you can afford to lose.</p><p><b>About this machine.</b> Token counts are exact for the settings; recall follows the reported pattern and seconds are illustrative.</p>',
  code: {
    title: 'Pick a path',
    note: 'Adapted from the course\'s long-video lesson.',
    text: `
def video_tokens(minutes, fps=1, per_frame=64):
    return int(minutes * 60 * fps * per_frame)

def choose_path(minutes, context=128_000, devices=1):
    need = video_tokens(minutes)
    if need <= context * devices:
        return "long context"          # ring attention if devices > 1
    if minutes >= 120:
        return "agent retrieval"       # fetch a few clips, read those
    return "summary tokens"            # gist, not exact moments
`,
  },
};
