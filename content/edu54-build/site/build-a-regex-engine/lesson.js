// Build your own regex engine with derivatives: the derivative of a pattern with respect to a character is the pattern that matches whatever
// may follow that character. To match a string, take the derivative for each character in turn and check, at the end, whether what is left
// can match the empty string (is nullable). Simplifying each derivative keeps it small; star must be nullable; and the same pattern run by a
// backtracking matcher can take exponential time on (a+)+b. Every derivative and step count is computed by the engine in this file.
const E = { t: 'empty' }, EPS = { t: 'eps' };
const ch = c => ({ t: 'ch', c }), alt = (a, b) => ({ t: 'alt', a, b }), cat = (a, b) => ({ t: 'cat', a, b }), star = a => ({ t: 'star', a });
const PATTERNS = [
  { src: '(a|b)*abb', re: cat(cat(cat(star(alt(ch('a'), ch('b'))), ch('a')), ch('b')), ch('b')), inputs: ['babb', 'abab', 'aabb'] },
  { src: '(a+)+b', re: cat(cat(cat(ch('a'), star(ch('a'))), star(cat(ch('a'), star(ch('a'))))), ch('b')), inputs: ['aaab', 'aaaaaaaaaaaaaaaaaa', 'b'] },
];
const show = r => ({ empty: '∅', eps: 'ε', ch: r.c, alt: `(${r.a && show(r.a)}|${r.b && show(r.b)})`, cat: `${r.a && show(r.a)}${r.b && show(r.b)}`, star: `(${r.a && show(r.a)})*` })[r.t];
const size = r => r.t === 'alt' || r.t === 'cat' ? 1 + size(r.a) + size(r.b) : r.t === 'star' ? 1 + size(r.a) : 1;
const eq = (x, y) => show(x) === show(y);
function engine(o) {
  const nullable = r => r.t === 'eps' ? true : r.t === 'star' ? o.starNull : r.t === 'alt' ? nullable(r.a) || nullable(r.b) : r.t === 'cat' ? nullable(r.a) && nullable(r.b) : false;
  const mkAlt = (a, b) => !o.simplify ? alt(a, b) : a.t === 'empty' ? b : b.t === 'empty' ? a : eq(a, b) ? a : alt(a, b);
  const mkCat = (a, b) => !o.simplify ? cat(a, b) : a.t === 'empty' || b.t === 'empty' ? E : a.t === 'eps' ? b : b.t === 'eps' ? a : cat(a, b);
  const d = (r, c) => {
    switch (r.t) {
      case 'empty': case 'eps': return E;
      case 'ch': return r.c === c ? EPS : E;
      case 'alt': return mkAlt(d(r.a, c), d(r.b, c));
      case 'cat': { const left = mkCat(d(r.a, c), r.b); return nullable(r.a) ? mkAlt(left, d(r.b, c)) : left; }
      case 'star': return mkCat(d(r.a, c), r);
    }
  };
  return { d, nullable };
}
function backtrack(re, s, cap) {
  let steps = 0;
  const m = (r, i, k) => {
    if (++steps > cap) return false;
    switch (r.t) {
      case 'empty': return false;
      case 'eps': return k(i);
      case 'ch': return s[i] === r.c && k(i + 1);
      case 'alt': return m(r.a, i, k) || m(r.b, i, k);
      case 'cat': return m(r.a, i, j => m(r.b, j, k));
      case 'star': return k(i) || m(r.a, i, j => j > i && m(r, j, k));
    }
  };
  const ok = m(re, 0, j => j === s.length);
  return { ok, steps: Math.min(steps, cap), capped: steps > cap };
}
function run(o) {
  const P = PATTERNS[o.pat], s = P.inputs[o.inp];
  if (o.engine === 'backtrack') { const b = backtrack(P.re, s, 3000000); return { P, s, match: b.ok, steps: b.steps, capped: b.capped, trail: [], maxSize: size(P.re) }; }
  const { d, nullable } = engine(o);
  let r = P.re; const trail = [{ c: '', r, n: size(r) }];
  for (const c of s) { r = d(r, c); trail.push({ c, r, n: size(r) }); }
  const truth = (() => { const e2 = engine({ simplify: true, starNull: true }); let x = P.re; for (const c of s) x = e2.d(x, c); return e2.nullable(x); })();
  return { P, s, match: nullable(r), truth, steps: s.length, trail, maxSize: Math.max(...trail.map(t => t.n)) };
}

export default {
  slug: 'build-a-regex-engine',
  title: 'Build your own regex engine',
  description: 'Match a pattern one character at a time by taking derivatives, then check if what is left can match nothing. No backtracking needed.',
  overview: 'A regular expression describes a set of strings, and there is an elegant way to match one that needs no backtracking at all: derivatives, introduced by Janusz Brzozowski in 1964 and the subject of a short functional tutorial in build-your-own-x. The derivative of a pattern with respect to a character c is a new pattern that matches exactly the strings s such that c followed by s matched the original. For a single character it is the empty-string pattern if the character is c and the empty set otherwise; for a choice it is the choice of derivatives; for a sequence it is the derivative of the first part followed by the second part, plus, if the first part can match the empty string, the derivative of the second part; for a star it is the derivative of the inner pattern followed by the whole star again. To match a string, take the derivative for each character in turn, then ask whether the final pattern is nullable, able to match the empty string; star is always nullable. Without simplification, derivatives grow with every character, because they keep useless pieces such as the empty set inside a choice; a few rules, such as removing the empty set, dropping a leading empty string and merging identical alternatives, keep them small, and with them the derivatives of a pattern form a finite set, which is exactly a deterministic automaton. By contrast, the backtracking matchers in many languages try one alternative, then back up and try another, which on patterns such as (a+)+b and a string of a\'s with no b takes exponential time, a real cause of outages. This machine matches each input live with both engines.',
  keywords: ['build your own regex engine', 'regular expressions', 'Brzozowski derivatives', 'nullable', 'backtracking', 'catastrophic backtracking', 'finite automata'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.1, 0.35, 0.15], dir: [0.05, 0.75, 1.2], half: 0.9, wide: 5.9 },
  credit: 'Built from <a href="http://dpk.io/dregs/toydregs" target="_blank" rel="noopener">How to implement regular expressions in functional JavaScript using derivatives</a> by David Kendal (code CC0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short derivative matcher, written for this lesson.',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { pat: 0, inp: 0, simplify: true, starNull: true, engine: 'deriv' }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', OFF = '#B9B5AA';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    const CX = i => -2.35 + i * 0.235, TZ = 0.45, DZ = -0.15, MAXC = 18;
    // the input, one tile per character: blue a, gold b, on a track
    const track = P.box(4.7, 0.03, 0.34, '#3A3D4A', { r: 0.03 }); track.position.set(CX(MAXC / 2 - 0.5), 0, TZ); S.add(track);
    const chars = Array.from({ length: MAXC }, (_, i) => { const m = own('#fff'), b = P.box(0.19, 0.12, 0.24, '#fff', { r: 0.03, material: m }); b.position.set(CX(i), 0.03, TZ); S.add(b); b.userData.m = m; return b; });
    // behind each character, the pattern left after it: a tower as tall as that derivative has nodes
    const towBase = P.box(4.94, 0.02, 0.28, '#3A3D4A', { r: 0.03 }); towBase.position.set(CX(MAXC / 2 - 1), 0, DZ); S.add(towBase);
    const towers = Array.from({ length: MAXC + 1 }, (_, i) => { const t = P.tower(0.17, 0.2, SAF); t.position.set(CX(i - 1), 0, DZ); t.userData.set({ cap: '' }); S.add(t); return t; });
    // the reader, and the result: does what is left match the empty string?
    const reader = P.robot('#3F4049', { scale: 0.7 }); reader.position.set(CX(-1), 0, TZ + 0.45); S.add(reader);
    const work = P.tower(0.4, 0.4, BAD); work.position.set(2.25, 0, DZ); work.userData.set({ cap: '' }); S.add(work);
    const lamp = P.lamp(GOOD, { h: 0.5, r: 0.13 }); lamp.position.set(2.8, 0, TZ); S.add(lamp);
    S.add(P.keep(-2.7, 3.0, 1.35, -0.45, 1.0));
    let R = null, rx = CX(-1), t = 0;
    function draw() {
      R = run(st);
      const deriv = st.engine === 'deriv';
      chars.forEach((b, i) => { const c = R.s[i]; b.visible = !!c; if (c) b.userData.m.color.set(c === 'a' ? '#5B8DB8' : SAF); });
      towers.forEach((tw, i) => {
        const tr = R.trail[i], on = deriv && !!tr; tw.visible = on; if (!on) return;
        tw.userData.set({ h: Math.min(1.3, Math.max(0.04, tr.n / 40 * 0.9)), color: tr.n > 40 ? BAD : i === R.trail.length - 1 ? (R.match ? GOOD : '#8E91A3') : SAF });
      });
      work.visible = !deriv; work.userData.set({ h: Math.min(1.3, Math.log10(R.steps + 1) / 6.5 * 1.3), color: R.steps > 10000 ? BAD : GOOD });
      const wrong = R.truth !== undefined && R.truth !== R.match;
      lamp.userData.set({ color: wrong ? BAD : R.match ? GOOD : OFF, on: R.match || wrong });
      reader.userData.set({ busy: !deriv, lamp: deriv ? GOOD : BAD });
      rx = deriv ? CX(R.s.length - 1) + 0.25 : rx;
    }
    function isOk() { return st.engine === 'deriv' && st.simplify && st.starNull && (R.truth === undefined || R.truth === R.match) && R.maxSize <= 40; }
    draw(); towers.forEach(tw => tw.userData.snap()); work.userData.snap(); reader.position.x = rx;
    const tick = dt => {
      t += dt;
      // a backtracker keeps running back over the input; derivatives walk it once
      const goal = st.engine === 'deriv' ? rx : CX(0) + (0.5 - 0.5 * Math.cos(t * 3)) * (CX(R.s.length - 1) - CX(0));
      reader.position.x += (goal - reader.position.x) * Math.min(1, dt * 6);
      towers.forEach(tw => tw.userData.tick(dt)); work.userData.tick(dt); reader.userData.tick(dt);
    };
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Simplify each derivative', short: 'Simplify', get: () => st.simplify, set: v => set({ simplify: !!v }) },
      { type: 'toggle', label: 'Star matches the empty string', short: 'Star nullable', get: () => st.starNull, set: v => set({ starNull: !!v }) },
      { type: 'toggle', label: 'Use a backtracking matcher instead', short: 'Backtracking', get: () => st.engine === 'backtrack', set: v => set({ engine: v ? 'backtrack' : 'deriv' }) },
      { type: 'buttons', label: 'Pattern', options: PATTERNS.map(p => p.src), get: () => st.pat, act: i => set({ pat: i, inp: 0 }) },
      { type: 'buttons', label: 'Input', options: ['first', 'second', 'third'], get: () => st.inp, act: i => set({ inp: i }) },
    ];
    const readouts = [
      { label: 'Result', get: () => ({ v: R.match ? 'match' : 'no match', sub: `"${R.s.length > 10 ? R.s.slice(0, 10) + '…' : R.s}"`, good: R.truth === undefined || R.truth === R.match, bad: R.truth !== undefined && R.truth !== R.match }) },
      { label: 'Work', get: () => ({ v: `${R.steps.toLocaleString('en')}`, sub: st.engine === 'deriv' ? 'derivatives' : 'backtracking steps', good: R.steps < 1000, bad: R.steps > 10000 }) },
      { label: 'Largest pattern', get: () => ({ v: `${R.maxSize}`, sub: 'nodes', good: R.maxSize <= 40, bad: R.maxSize > 40 }) },
    ];
    const labels = [
      { name: 'c', t: 'The input, one tile per character', d: 'Blue: a. Gold: b', icon: 'code', atV: V(CX(0) - 0.12, 0.03, TZ) },
      { name: 'd', t: 'One derivative per character', d: 'Height: pattern size. Coral: it ballooned', icon: 'layers', atV: V(CX(-1) - 0.12, 0.01, DZ) },
      { name: 't', t: 'The match', d: 'Lamp lit: a match. Coral: the wrong answer', icon: 'target', atV: V(2.93, 0.4, TZ) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Skip simplification', hint: 'derivatives balloon', on: () => set({ ...D0, simplify: false, pat: 1, inp: 0 }), off: reset },
      { label: 'Make star not nullable', hint: 'a match is missed', on: () => set({ ...D0, starNull: false, pat: 0, inp: 0 }), off: reset },
      { label: 'Backtrack on eighteen a\'s', hint: 'exponential', on: () => set({ ...D0, engine: 'backtrack', pat: 1, inp: 1 }), off: reset },
    ];
    function status() {
      const r = R;
      if (st.engine === 'backtrack') return r.steps > 10000 ? { ok: false, msg: `<b>On ${r.s.length} a\'s with no b, the backtracking matcher tries every way of splitting the a\'s between the inner and outer +: ${r.steps.toLocaleString('en')} steps${r.capped ? ', and it gave up' : ''}, doubling with each extra a.</b> The derivative engine answers in ${r.s.length} steps. Patterns like this have taken real websites down.` } : { ok: false, msg: `<b>The backtracking matcher answers this input in ${r.steps} steps, but its worst case is exponential: try (a+)+b on eighteen a\'s.</b>` };
      if (r.truth !== undefined && r.truth !== r.match) return { ok: false, msg: `<b>With star treated as unable to match the empty string, the last derivative still contains a star that must match nothing, so "${r.s}" is wrongly rejected.</b> A star matches zero or more copies: it is always nullable.` };
      if (r.maxSize > 40) return { ok: false, msg: `<b>Without simplification, every derivative keeps dead pieces such as the empty set inside choices: by the end the pattern has ${r.maxSize} nodes for a ${r.s.length}-character input.</b> Remove ∅ from choices, drop leading ε and merge identical alternatives.` };
      if (!st.simplify || !st.starNull) return { ok: false, msg: `<b>This input happens to work, but ${!st.simplify ? 'derivatives are not simplified: try (a+)+b' : 'star is not nullable: try (a|b)*abb on "babb"'}.</b>` };
      return { ok: true, msg: `<b>"${r.s}" ${r.match ? 'matches' : 'does not match'} /${r.P.src}/: ${r.steps} derivatives, one per character, none larger than ${r.maxSize} nodes, then a check that what is left is ${r.match ? '' : 'not '}nullable.</b> No backtracking, whatever the input.` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'A pattern and a string', home: true, say: 'Match a b star a b b against "babb", one character at a time.', act: m => m.set({ pat: 0, inp: 0, simplify: true, starNull: true, engine: 'deriv' }) },
    { t: 'Derivatives', home: true, say: 'For each character, work out the pattern for whatever may follow it.', act: m => m.set({ pat: 0, inp: 0, simplify: true, starNull: true, engine: 'deriv' }) },
    { t: 'Nullable', home: true, say: 'At the end, ask: can what is left match nothing at all? If so, it is a match.', act: m => m.set({ pat: 0, inp: 1, simplify: true, starNull: true, engine: 'deriv' }) },
    { t: 'Keep it small', home: true, say: 'Without simplifying, derivatives fill up with dead pieces and grow every step.', act: m => m.set({ pat: 1, inp: 0, simplify: false, starNull: true, engine: 'deriv' }) },
    { t: 'Backtracking', home: true, say: 'A backtracking matcher on a plus plus b and eighteen a\'s tries hundreds of thousands of paths.', act: m => m.set({ pat: 1, inp: 1, simplify: true, starNull: true, engine: 'backtrack' }) },
    { t: 'Linear time', home: true, say: 'Derivatives take eighteen steps for eighteen characters. No backing up.', act: m => m.set({ pat: 1, inp: 1, simplify: true, starNull: true, engine: 'deriv' }) },
  ],
  check: [
    { q: 'What is the derivative of a pattern by a character c?', options: ['The pattern for what may follow c', 'The pattern without c', 'The first match of c'], answer: 0, why: 'Then repeat for the next character.', hint: 'Watch the derivatives.' },
    { q: 'When does a string match after all derivatives?', options: ['When what is left is nullable', 'When it is empty', 'Always'], answer: 0, why: 'It can match nothing.', hint: 'Try another input.' },
    { q: 'Why can backtracking be slow on (a+)+b?', options: ['It tries exponentially many ways to split the a\'s', 'It reads backwards', 'It has no cache of characters'], answer: 0, why: 'Derivatives avoid this.', hint: 'Try Backtrack on eighteen a\'s.' },
  ],
  terms: [
    ['Regular expression', 'A pattern describing a set of strings.'],
    ['Derivative', 'The pattern for whatever may follow a given character.'],
    ['Nullable', 'Able to match the empty string.'],
    ['Star', 'Zero or more repetitions.'],
    ['Backtracking', 'Trying an option, then backing up to try another.'],
    ['Automaton', 'A machine of states; simplified derivatives are its states.'],
  ],
  deeper: '<p><b>Caching.</b> Memoising derivatives by pattern turns the engine into a lazily built deterministic automaton, so repeated matches cost one lookup per character.</p><p><b>Backreferences.</b> Features such as \\1 are not regular, which is why backtracking engines exist; safe engines such as RE2 leave them out.</p><p><b>About this machine.</b> Both engines run in your browser; the backtracking count is capped at three million.</p>',
  code: {
    title: 'Matching with derivatives',
    note: 'Our own short version, written for this lesson.',
    text: `
def nullable(r):
    kind = r[0]
    if kind in ("eps", "star"): return True
    if kind == "alt": return nullable(r[1]) or nullable(r[2])
    if kind == "cat": return nullable(r[1]) and nullable(r[2])
    return False                                   # empty set, character

def deriv(r, c):
    kind = r[0]
    if kind == "chr": return EPS if r[1] == c else EMPTY
    if kind == "alt": return alt(deriv(r[1], c), deriv(r[2], c))
    if kind == "cat":
        first = cat(deriv(r[1], c), r[2])
        return alt(first, deriv(r[2], c)) if nullable(r[1]) else first
    if kind == "star": return cat(deriv(r[1], c), r)
    return EMPTY

def matches(r, s):
    for c in s:
        r = deriv(r, c)                            # alt and cat simplify as they build
    return nullable(r)
`,
  },
};
