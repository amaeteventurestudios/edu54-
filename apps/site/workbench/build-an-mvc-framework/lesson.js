// Build it yourself: an MVC framework (after Write your own MVC from scratch in PHP, CC0). A Bamako tailor's order site. A real small router matches a URL to a controller, which asks a model and hands data to a view. Each request is traced across the three parts; misplaced logic is counted.
const ORDERS = [{ id: 1, who: 'Aminata', item: 'Boubou', done: false }, { id: 2, who: 'Moussa', item: 'Shirt', done: true }];
const ROUTES = [['GET', /^\/orders$/, 'list'], ['GET', /^\/orders\/(\d+)$/, 'show'], ['POST', /^\/orders\/(\d+)\/done$/, 'finish']];
const REQS = [['GET', '/orders'], ['GET', '/orders/1'], ['POST', '/orders/1/done'], ['GET', '/orders/9'], ['GET', '/shoes'], ['GET', '/orders/1/done']];
const Model = { all: d => d, find: (d, id) => d.find(o => o.id === +id), done: (d, id) => d.map(o => (o.id === +id ? { ...o, done: true } : o)) };
const View = { list: x => `${x.length} orders`, show: x => `${x.item} for ${x.who}${x.done ? ', done' : ''}`, none: () => 'Not found' };
function run(o) {
  const [m, url] = REQS[o.i]; let hit = null, arg = null, data = ORDERS, chain = ['router'], code = 200, out, sql = 0, html = 0;
  for (const [mm, re, a] of ROUTES) { const x = url.match(re); if (x && (mm === m || !o.method)) { hit = a; arg = x[1]; break; } }
  if (!hit) return { hit, chain, code: 404, out: View.none(), sql, html, url, m };
  chain.push('controller');
  if (o.fat) { sql++; html++; }
  if (hit === 'list') { chain.push('model', 'view'); out = View.list(Model.all(data)); }
  else if (hit === 'show') { chain.push('model'); const r = Model.find(data, arg); if (!r) { code = 404; chain.push('view'); out = View.none(); } else { chain.push('view'); out = View.show(r); } }
  else { chain.push('model'); data = Model.done(data, arg); code = 303; chain.push('view'); out = View.show(Model.find(data, arg)); }
  return { hit, chain, code, out, sql, html, url, m };
}

export default {
  slug: 'build-an-mvc-framework',
  title: 'Build your own MVC framework',
  description: 'A router picks a controller, the controller asks a model, and a view makes the page.',
  overview: 'Most web frameworks share one shape. A router reads the URL and picks a controller action. The controller is thin: it asks a model for data, and hands that to a view. The model knows the data and its rules. The view knows only how to show it. Each part can change alone. Swap the database, and views don\'t notice. Change the page, and rules stay put. The usual failure is a fat controller that mixes queries, rules and HTML, so nothing can be reused or tested. This real small router and its three parts handle orders for a tailor in Bamako.',
  keywords: ['MVC', 'router', 'controller', 'web framework', 'separation of concerns', 'build your own'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.35, 0], dir: [0.06, 0.7, 1.2], half: 1.05, wide: 5.2 },

  build(S) {
    const { V, P } = S;
    const D0 = { i: 0, method: true, fat: false }, st = { ...D0 };
    const OFF = '#CFC9BA', CL = ['#7B6FA8', '#5B8DB8', '#1F9E89', '#F2AE0C'], ticks = [];
    const add = o => { S.add(o); if (o.userData.tick) ticks.push(o); return o; };
    const pad = P.box(5, 0.03, 1.5, '#D8D2C4', { r: 0.04 }); S.add(pad);
    const N = ['router', 'controller', 'model', 'view'], X = i => -1.8 + i * 1.2;
    const B = N.map((n, i) => { const m = new S.THREE.MeshLambertMaterial({ color: CL[i] }), b = P.box(0.8, 0.5, 0.8, '#fff', { r: 0.05, material: m }); b.position.set(X(i), 0.03, -0.05); S.add(b); if (i) { const l = P.box(0.42, 0.05, 0.07, '#6E6A60'); l.position.set(X(i) - 0.6, 0.25, -0.05); S.add(l); } return { b, m }; });
    S.add(P.keep(-2.35, 2.35, 0.8, -0.72, 0.72));
    let R = null;
    function draw() { R = run(st); B.forEach(({ b, m }, i) => { const on = R.chain.includes(N[i]); m.color.set(on ? CL[i] : OFF); b.scale.y = i === 1 && st.fat ? 2.4 : on ? 1 : 0.4; }); }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const tg = (k, l, s) => ({ type: 'toggle', label: l, short: s, get: () => st[k], set: v => set({ [k]: !!v }) });
    const controls = [{ type: 'buttons', label: 'Request', options: ['List', 'One order', 'Mark done', 'Missing order', 'Unknown page', 'Link to done'], get: () => st.i, act: i => set({ i }) }, tg('method', 'Match the method too', 'Method'), tg('fat', 'Fat controller', 'Fat')];
    const readouts = [
      { label: 'Request', get: () => ({ v: `${R.m} ${R.url}` }) },
      { label: 'Response', get: () => ({ v: `${R.code}`, sub: R.out }) },
      { label: 'Path', get: () => ({ v: R.chain.join(', ') }) },
    ];
    const labels = [
      { name: 'r', t: 'Router', d: 'URL to action', icon: 'link', atV: V(X(0) - 0.4, 0.3, -0.05) },
      { name: 'v', t: 'View', d: 'Makes the page, and knows no rules', icon: 'eye', atV: V(X(3) + 0.4, 0.3, -0.05) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Fat controller', hint: 'queries and HTML in one place', on: () => set({ ...D0, fat: true }), off: reset },
      { label: 'Ignore the method', hint: 'a link can change data', on: () => set({ ...D0, i: 5, method: false }), off: reset },
    ];
    function status() {
      if (st.fat) return { ok: false, msg: '<b>The controller grew to hold a query and some HTML.</b> Now the page can\'t change without touching the rules, and nothing is reusable.' };
      if (!st.method && st.i === 5) return { ok: false, msg: '<b>A plain GET marked the order done.</b> With the method ignored, a web crawler following links could do it too.' };
      if (!R.hit) return { ok: true, msg: '<b>404: no route matched.</b> The router stopped it before any other part ran.' };
      if (R.code === 404) return { ok: true, msg: '<b>404: the route matched, and the model found nothing.</b> The controller picks the not-found view.' };
      if (R.code === 303) return { ok: true, msg: '<b>303: the data changed, so it redirects.</b> A refresh won\'t repeat the change.' };
      return { ok: true, msg: `<b>${R.out}.</b> Each part did one job.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'One shape', home: true, say: 'A tailor in Bamako wants an order site. Most web frameworks share one shape.', act: m => m.set({ i: 0, method: true, fat: false }) },
    { t: 'The router', home: true, say: 'A router reads the URL and picks an action.', act: m => m.set({ i: 4, method: true, fat: false }) },
    { t: 'The controller', home: true, say: 'A controller is thin. It asks and it hands over.', act: m => m.set({ i: 1, method: true, fat: false }) },
    { t: 'The model', home: true, say: 'A model knows the data and its rules.', act: m => m.set({ i: 3, method: true, fat: false }) },
    { t: 'The view', home: true, say: 'A view knows only how to show it.', act: m => m.set({ i: 1, method: true, fat: false }) },
    { t: 'Keep it thin', home: true, say: 'A fat controller mixes all three, and then nothing can change alone.', act: m => m.set({ i: 1, method: true, fat: true }) },
  ],
  check: [
    { q: 'What does a router do?', options: ['Picks an action for a URL', 'Stores data', 'Draws the page'], answer: 0, why: 'That\'s all.', hint: 'See The router.' },
    { q: 'Where do data rules live?', options: ['In the model', 'In the view', 'In the router'], answer: 0, why: 'So that views can change alone.', hint: 'See The model.' },
    { q: 'What is wrong with a fat controller?', options: ['Nothing can change alone', 'It is slow', 'It uses more disk'], answer: 0, why: 'Everything is mixed.', hint: 'Try Fat controller.' },
  ],
  terms: [['Router', 'Maps URLs to actions.'], ['Controller', 'Coordinates a request.'], ['Model', 'Data and rules.'], ['View', 'Renders the page.']],
  deeper: '<p><b>Real code.</b> The router and all three parts run live.</p><p><b>Patterns.</b> Most frameworks add middleware between router and controller.</p>',
  credit: 'Built from <a href="https://chaitya62.github.io/2018/04/29/Writing-your-own-MVC-from-Scratch-in-PHP.html" target="_blank" rel="noopener">Write your own MVC from scratch in PHP</a> (CC0), one of the projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short router, written for this lesson.',
  code: {
    title: 'The router',
    note: 'Our own short version.',
    text: `
function dispatch(method, url) {
  for (const route of routes) {
    const match = url.match(route.pattern);
    if (match && route.method === method)
      return route.action(...match.slice(1));
  }
  return notFound();
}
`,
  },
};
