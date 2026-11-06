// Build your own template engine: a kiosk's order page is a template with {{ expressions }}, a {% for %} loop and an |upper filter. The engine
// splits the template into literal text and tags once, compiles it into a function of the data (shown as generated code), and runs that function
// for each request. Values are HTML-escaped on output, dotted names are looked up step by step, and missing values render as empty. Rendering
// uses the small engine in this file; timings use a simple cost model (parse 0.8 ms, render 0.05 ms).
const TEMPLATE = '<h1>Orders for {{ shop.name }}</h1>\n<ul>{% for o in orders %}<li>{{ o.item|upper }} x {{ o.qty }}</li>{% endfor %}</ul>\n<p>Note: {{ note }}</p>';
const DATA = [
  { shop: { name: 'Mama Pendo\'s Kiosk' }, orders: [{ item: 'chapati', qty: 4 }, { item: 'chai', qty: 2 }, { item: 'mandazi', qty: 6 }], note: 'Deliver before noon' },
  { shop: { name: 'Mama Pendo\'s Kiosk' }, orders: [{ item: 'chai', qty: 1 }], note: '<script>alert("hi")</script>' },
  { orders: [{ item: 'samosa', qty: 3 }], note: 'New branch, no name yet' },
];
function tokenize(t) { return t.split(/({{.*?}}|{%.*?%})/).filter(Boolean); }
function compileCode(tokens) {
  const lines = ['function render(ctx) {', '  const out = [];'];
  let ind = '  ';
  tokens.forEach(tok => {
    if (tok.startsWith('{{')) { const e = tok.slice(2, -2).trim(); const [name, filt] = e.split('|'); lines.push(`${ind}out.push(escape(${filt ? `${filt.trim()}(` : ''}lookup(ctx, "${name.trim()}")${filt ? ')' : ''}));`); }
    else if (tok.startsWith('{%')) { const w = tok.slice(2, -2).trim().split(/\s+/); if (w[0] === 'for') { lines.push(`${ind}for (const ${w[1]} of lookup(ctx, "${w[3]}")) {`); ind += '  '; lines.push(`${ind}ctx = { ...ctx, ${w[1]} };`); } else { ind = ind.slice(2); lines.push(`${ind}}`); } }
    else lines.push(`${ind}out.push(${JSON.stringify(tok)});`);
  });
  lines.push('  return out.join("");', '}');
  return lines;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function render(tokens, data, o) {
  let err = null;
  const lookup = (ctx, path) => { let v = ctx; for (const k of path.split('.')) { if (v == null || !(k in Object(v))) { if (o.lenient) return ''; err = err || `${path} is undefined`; return ''; } v = v[k]; } return v; };
  const out = [];
  const walk = (i, ctx, stop) => {
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.startsWith('{{')) { const [name, f] = tok.slice(2, -2).trim().split('|'); let v = lookup(ctx, name.trim()); if (f && f.trim() === 'upper') v = String(v).toUpperCase(); out.push(o.escape ? esc(v) : String(v)); i++; }
      else if (tok.startsWith('{%')) {
        const w = tok.slice(2, -2).trim().split(/\s+/);
        if (w[0] === 'for') { let end = i + 1, depth = 1; while (depth) { if (tokens[end].startsWith('{% for')) depth++; if (tokens[end].startsWith('{% endfor')) depth--; end++; } (lookup(ctx, w[3]) || []).forEach(item => walk(i + 1, { ...ctx, [w[1]]: item }, end - 1)); i = end; }
        else return i;
      } else { out.push(tok); i++; }
      if (stop !== undefined && i >= stop) return i;
    }
    return i;
  };
  walk(0, data);
  return { html: out.join(''), err };
}
function run(o) {
  const tokens = tokenize(TEMPLATE), code = compileCode(tokens), r = render(tokens, DATA[o.data], o);
  const injected = !o.escape && /<script>/.test(r.html);
  const ms = o.compileOnce ? 0.8 + 1000 * 0.05 : 1000 * (0.8 + 0.05);
  return { tokens, code, ...r, injected, ms, crashed: !!r.err && !o.lenient };
}

export default {
  slug: 'build-a-template-engine',
  title: 'Build your own template engine',
  description: 'A kiosk\'s order page is a template with holes, a loop and a filter. Compile it once, escape what customers type, and render it fast.',
  overview: 'Almost every web page is produced by a template engine: a page written as ordinary HTML with holes for data, such as {{ shop.name }}, plus a little logic, such as a loop over orders and filters such as upper. The engine in 500 Lines or Less, a small cousin of Jinja and Django templates, shows how they work. First it splits the template text into a list of pieces: literal text, expressions in double braces and tags in brace-percent marks. Then, instead of interpreting that list on every request, it compiles it: it writes the source code of a function that appends each literal string, evaluates each expression, loops for each for tag, and returns the joined result, and it compiles that function once. Every later request just calls the function with new data, which is far faster than parsing the template again each time. Expressions use dotted names, so shop.name means look up shop, then its name, and the engine must decide what a missing value does; many engines print nothing, while strict ones raise an error so mistakes are caught in testing. The most important rule is escaping. Data such as a customer\'s note can contain characters that mean something in HTML, so the engine must replace < with &lt; and the like before inserting it; otherwise a note containing a script tag runs in every visitor\'s browser, a cross-site scripting attack. Good engines escape everything by default and make authors mark trusted HTML explicitly. This machine renders an invented kiosk\'s orders in Mombasa with an engine written in this lesson.',
  keywords: ['build your own template engine', 'templating', 'HTML escaping', 'cross-site scripting', 'compiling templates', 'Jinja', '500 lines or less'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0.05, 0.3, -0.15], dir: [0.05, 0.95, 1.15], half: 0.95, wide: 5.2 },
  credit: 'Built from <a href="https://aosabook.org/en/500L/a-template-engine.html" target="_blank" rel="noopener">A Template Engine</a> by Ned Batchelder, in <a href="https://aosabook.org/en/500L/" target="_blank" rel="noopener">500 Lines or Less</a> (text CC BY 3.0, code MIT), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short template engine, written for this lesson after Ned Batchelder\'s (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const D0 = { data: 1, escape: true, compileOnce: true, lenient: true }, st = { ...D0 };
    const GOOD = '#1F9E89', BAD = '#E07A5F', SAF = '#F2AE0C', SAND = '#D9C9A8', HOLE = '#3D6BD6';
    const own = c => new THREE.MeshLambertMaterial({ color: c });
    // the template, split once into pieces: sand slabs of text, blue holes for values, gold posts for the loop
    const toks = tokenize(TEMPLATE), TX = i => -2.3 + i * 0.27;
    toks.forEach((t, i) => {
      const tag = t.startsWith('{{'), loop = t.startsWith('{%');
      const o = loop ? P.box(0.1, 0.42, 0.34, SAF, { r: 0.03 }) : tag ? P.cyl(0.1, 0.16, HOLE) : P.box(0.22, 0.08, 0.34, SAND, { r: 0.03 });
      o.position.set(TX(i), 0, -0.7); S.add(o);
    });
    // the compiler: compiles once, or re-parses for every request
    const comp = P.robot('#3F4049', { scale: 0.8 }); comp.position.set(-1.2, 0, 0.2); S.add(comp);
    const time = P.tower(0.3, 0.3, GOOD); time.position.set(-2.1, 0, 0.3); time.userData.set({ cap: '' }); S.add(time);
    const feed = P.pipe([V(-0.9, 0.3, 0.2), V(-0.2, 0.3, 0.15), V(0.95, 0.1, 0.05)], GOOD, { r: 0.035, n: 5 }); S.add(feed);
    // the rendered page: a heading, one line per order, then the customer's note
    const page = own('#F4F1EA'), tray = P.box(1.5, 0.05, 1.3, '#fff', { r: 0.04, material: page }); tray.position.set(1.75, 0, -0.05); S.add(tray);
    const bar = () => { const m = own(SAND), b = P.box(1, 0.08, 0.16, '#fff', { r: 0.03, material: m }); b.userData.m = m; b.userData.noFit = true; S.add(b); return b; };
    const head = bar(), items = [0, 1, 2].map(bar), note = bar();
    S.add(P.keep(-2.45, 2.55, 1.0, -0.95, 0.65));

    let R = null;
    const place = (b, x0, w, z, c, h = 1) => { b.visible = w > 0; b.scale.set(Math.max(0.05, w), h, 1); b.position.set(x0 + w / 2, 0.05, z); b.userData.m.color.set(c); };
    function draw() {
      R = run(st);
      const d = DATA[st.data], x0 = 1.15;
      time.userData.set({ h: R.ms / 850 * 1.0, color: st.compileOnce ? GOOD : BAD });
      comp.userData.set({ busy: !st.compileOnce, lamp: st.compileOnce ? GOOD : BAD });
      feed.userData.set({ speed: st.compileOnce ? 0.4 : 0.12 });
      page.color.set(R.crashed ? BAD : '#F4F1EA');
      const live = !R.crashed;
      const name = d.shop && d.shop.name;
      place(head, x0, live ? (name ? 1.2 : 0.35) : 0, -0.5, name ? '#4A4D5C' : '#C9C4B8', name ? 1.4 : 0.5);
      items.forEach((b, i) => { const o = d.orders[i]; place(b, x0 + 0.1, live && o ? 0.25 + o.qty * 0.13 : 0, -0.25 + i * 0.22, HOLE); });
      const script = /<script>/.test(d.note);
      place(note, x0, live ? 1.1 : 0, 0.42, R.injected ? BAD : script ? '#B9B5AA' : SAND, R.injected ? 3 : 1);
    }
    const tick = dt => { time.userData.tick(dt); comp.userData.tick(dt); feed.userData.tick(dt); };
    function isOk() { return st.escape && st.compileOnce && !R.crashed; }
    draw(); time.userData.snap();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Escape values for HTML', short: 'Escape', get: () => st.escape, set: v => set({ escape: !!v }) },
      { type: 'toggle', label: 'Compile once and reuse', short: 'Compile once', get: () => st.compileOnce, set: v => set({ compileOnce: !!v }) },
      { type: 'toggle', label: 'Missing values print nothing', short: 'Lenient', get: () => st.lenient, set: v => set({ lenient: !!v }) },
      { type: 'buttons', label: 'Render order', options: ['A normal order', 'A note with a script', 'A shop with no name'], get: () => st.data, act: i => set({ data: i }) },
    ];
    const readouts = [
      { label: 'Page', get: () => ({ v: R.crashed ? 'crashed' : R.injected ? 'injected' : 'safe', sub: `order ${st.data + 1}`, good: !R.crashed && !R.injected, bad: R.crashed || R.injected }) },
      { label: '1,000 requests', get: () => ({ v: `${R.ms.toFixed(0)} ms`, sub: st.compileOnce ? 'compiled once' : 'parsed each time', good: st.compileOnce, bad: !st.compileOnce }) },
      { label: 'Pieces', get: () => ({ v: `${R.tokens.length}`, sub: 'text and tags', good: true, bad: false }) },
    ];
    const labels = [
      { name: 'c', t: 'The template in pieces', d: 'Sand: text. Blue: holes. Gold: the loop', icon: 'code', atV: V(TX(0) - 0.11, 0.06, -0.7) },
      { name: 'k', t: 'Time for 1,000 requests', d: 'Coral: parsed every time', icon: 'gauge', atV: V(-2.25, 0.25, 0.3) },
      { name: 'p', t: 'The page a visitor sees', d: 'Coral: a script that would run', icon: 'target', atV: V(2.5, 0.03, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Skip HTML escaping', hint: 'the note\'s script runs', on: () => set({ ...D0, escape: false, data: 1 }), off: reset },
      { label: 'Re-parse on every request', hint: 'slow', on: () => set({ ...D0, compileOnce: false }), off: reset },
      { label: 'Crash on a missing value', hint: 'no shop name', on: () => set({ ...D0, lenient: false, data: 2 }), off: reset },
    ];
    function status() {
      const r = R;
      if (r.injected) return { ok: false, msg: '<b>Without escaping, the customer\'s note went into the page as a real script tag, so it would run in the browser of everyone who opens the order page.</b> Escape every value by default: < becomes &lt;, > becomes &gt;, & becomes &amp;.' };
      if (r.crashed) return { ok: false, msg: `<b>The new branch has no shop name yet, and the strict lookup raised an error, so visitors get a server error instead of their order: ${r.err}.</b> Strict lookups help catch mistakes in testing; in production, decide deliberately what a missing value shows.` };
      if (!st.compileOnce) return { ok: false, msg: `<b>Parsing the template again for every request spends ${r.ms.toFixed(0)} ms on 1,000 requests, against ${(0.8 + 1000 * 0.05).toFixed(0)} ms when it is compiled once.</b> Compile the template into a function the first time, then just call it.` };
      if (!st.escape) return { ok: false, msg: '<b>This order happens to be safe, but values are inserted raw: render the note with a script.</b> Escape by default.' };
      return { ok: true, msg: st.data === 1 ? '<b>The note\'s script tag was escaped to &lt;script&gt;, so the page shows it as text and nothing runs.</b> The template was compiled once; each request just calls the function.' : st.data === 2 ? '<b>The missing shop name printed as nothing, and the rest of the page rendered.</b> Escaping and the compiled function work as before.' : `<b>The loop rendered ${DATA[0].orders.length} orders with the upper filter, every value escaped, from a template compiled once: ${r.ms.toFixed(0)} ms for 1,000 requests.</b>` };
    }
    return { update: tick, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'HTML with holes', home: true, say: 'A template is a page with holes for data, a loop over orders and a filter.', act: m => m.set({ data: 0, escape: true, compileOnce: true, lenient: true }) },
    { t: 'Compile once', home: true, say: 'The engine splits it into text and tags and writes a function, once. Each request just calls it.', act: m => m.set({ data: 0, escape: true, compileOnce: true, lenient: true }) },
    { t: 'Or parse every time', home: true, say: 'Parse the template again for every request, and a thousand requests take sixteen times longer.', act: m => m.set({ data: 0, escape: true, compileOnce: false, lenient: true }) },
    { t: 'Data can be hostile', home: true, say: 'A customer\'s note contains a script tag. Inserted raw, it would run in every visitor\'s browser.', act: m => m.set({ data: 1, escape: false, compileOnce: true, lenient: true }) },
    { t: 'Escape everything', home: true, say: 'Escape every value, and the script is shown as harmless text.', act: m => m.set({ data: 1, escape: true, compileOnce: true, lenient: true }) },
    { t: 'Missing values', home: true, say: 'A new branch has no name yet. Decide what a missing value does: print nothing, or fail loudly in testing.', act: m => m.set({ data: 2, escape: true, compileOnce: true, lenient: true }) },
  ],
  check: [
    { q: 'Why compile a template into a function?', options: ['Parse once, then each request just runs the code', 'To encrypt it', 'To shrink it'], answer: 0, why: 'Much faster per request.', hint: 'Try Re-parse on every request.' },
    { q: 'What does HTML escaping prevent?', options: ['Data being read as markup or script', 'Slow pages', 'Missing values'], answer: 0, why: 'Cross-site scripting.', hint: 'Try Skip HTML escaping.' },
    { q: 'What does shop.name mean in a template?', options: ['Look up shop, then its name', 'A file name', 'A filter'], answer: 0, why: 'Dotted lookup, step by step.', hint: 'Render a shop with no name.' },
  ],
  terms: [
    ['Template', 'A page with placeholders and simple logic for data.'],
    ['Expression', 'A placeholder such as {{ shop.name }}.'],
    ['Filter', 'A function applied to a value, such as upper.'],
    ['Compile', 'Turn the template into code once, for fast reuse.'],
    ['Escaping', 'Replacing characters such as < so data cannot become markup.'],
    ['Cross-site scripting', 'An attack where injected script runs in other users\' browsers.'],
  ],
  deeper: '<p><b>Context matters.</b> Escaping for HTML text differs from escaping inside an attribute, a URL or a script; good engines know the context.</p><p><b>Sandboxing.</b> Templates written by users must not reach arbitrary code; engines restrict what expressions can do.</p><p><b>About this machine.</b> The kiosk and orders are invented; the pages are rendered by this lesson\'s engine.</p>',
  code: {
    title: 'Compile a template into a function',
    note: 'Our own short version, after Ned Batchelder\'s engine.',
    text: `
import html, re

def compile_template(text):
    code, indent = ["def render(ctx):", "    out = []"], "    "
    for tok in re.split(r"({{.*?}}|{%.*?%})", text):
        if tok.startswith("{{"):
            code.append(f"{indent}out.append(html.escape(str(lookup(ctx, {tok[2:-2].strip()!r}))))")
        elif tok.startswith("{%"):
            words = tok[2:-2].split()
            if words[0] == "for":
                code.append(f"{indent}for {words[1]} in lookup(ctx, {words[3]!r}):")
                indent += "    "
                code.append(f"{indent}ctx = {{**ctx, {words[1]!r}: {words[1]}}}")
            else:
                indent = indent[:-4]
        elif tok:
            code.append(f"{indent}out.append({tok!r})")
    code.append("    return ''.join(out)")
    namespace = {"html": html, "lookup": lookup}
    exec("\\n".join(code), namespace)          # compiled once
    return namespace["render"]
`,
  },
};
