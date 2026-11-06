// Build your own React-like UI framework: a list of bus stops on an invented route app, each row with a note the rider has typed. Rendering
// builds a virtual tree; reconciliation compares it with the last one and changes only what differs in the real page. Matching rows by key
// keeps each row's DOM node, and its typed note, with the right stop; matching by position shifts notes onto the wrong stops when a stop is
// inserted or removed; rebuilding everything throws the notes away. A work loop that yields to the browser between small units keeps typing
// responsive during a big render. DOM operation counts are computed by diffing the two lists below.
const STOPS = ['Posta', 'Kariakoo', 'Jangwani', 'Magomeni', 'Mwenge', 'Ubungo'];
const NOTES = ['meet Asha', '', 'buy bread', '', 'gate 2', ''];
function diff(o) {
  const oldK = STOPS.slice();
  const newK = o.action === 'insert' ? ['Kivukoni', ...STOPS] : STOPS.filter((_, i) => i !== 2);
  const oldNotes = Object.fromEntries(oldK.map((k, i) => [k, NOTES[i]]));
  let ops = 0, created = [], updated = [], rows;
  if (!o.diff) {
    ops = oldK.length + newK.length;
    rows = newK.map(k => ({ k, note: '', state: 'new' }));
  } else if (o.keys) {
    newK.forEach(k => { if (!oldK.includes(k)) { ops++; created.push(k); } });
    oldK.forEach(k => { if (!newK.includes(k)) ops++; });
    rows = newK.map(k => ({ k, note: oldNotes[k] ?? '', state: created.includes(k) ? 'new' : 'kept' }));
  } else {
    const n = Math.max(oldK.length, newK.length);
    const domNotes = NOTES.slice();
    rows = [];
    for (let i = 0; i < n; i++) {
      if (i < newK.length && i < oldK.length) { if (newK[i] !== oldK[i]) { ops++; updated.push(newK[i]); } rows.push({ k: newK[i], note: domNotes[i], state: newK[i] !== oldK[i] ? 'moved' : 'kept' }); }
      else if (i < newK.length) { ops++; rows.push({ k: newK[i], note: '', state: 'new' }); }
      else ops++;
    }
  }
  const wrong = rows.filter(r => r.note !== (oldNotes[r.k] ?? '')).length;
  const freeze = o.slice ? 5 : 140;
  return { rows, ops, wrong, freeze };
}

export default {
  slug: 'build-a-ui-framework',
  title: 'Build your own UI framework',
  description: 'A bus-route app lists its stops, and a rider has typed notes beside some. Build the framework: render a virtual tree, compare it to the last, change only what differs.',
  overview: 'Frameworks such as React let you describe what the page should look like for the current data, and work out for themselves how to change the real page to match. Building a small one, as the Didact tutorial does, shows the three ideas inside. First, rendering produces a virtual tree: plain objects describing elements, their properties and their children, cheap to create and throw away. Second, reconciliation compares the new tree with the previous one and turns the differences into the fewest changes to the real page, because creating and removing real elements is slow and destroys whatever state lives in them, such as the text in an input, the scroll position or the focus. Comparing lists needs care. If children are matched by position, inserting one item at the top makes every later position look changed, so every row is updated, and each row\'s real input, with whatever the user typed, now sits beside a different item. Giving each child a stable key lets the framework match old and new items by identity: one insert, everything else untouched. Third, scheduling: a big update done in one go blocks the browser, so typing and scrolling freeze. Splitting the work into small units, each a fibre, and yielding back to the browser between them keeps the page responsive, and committing all the changes at the end avoids showing half an update. Hooks such as useState then store each component\'s state on its fibre. This machine diffs an invented bus route in Dar es Salaam before and after an edit.',
  keywords: ['build your own React', 'virtual DOM', 'reconciliation', 'keys in lists', 'fiber', 'time slicing', 'Didact'],
  orient: 'landscape',
  phoneTurn: false,
  view: { target: [0, 0.3, 0.2], dir: [0.05, 1.05, 1.12], half: 1.65, wide: 6.4 },
  credit: 'Built from <a href="https://github.com/hexacta/didact" target="_blank" rel="noopener">Didact: a DIY guide to build your own React</a> (MIT) and <a href="https://mfrachet.github.io/create-frontend-framework/" target="_blank" rel="noopener">Building a frontend framework, from scratch</a> (MIT), projects listed in <a href="https://github.com/codecrafters-io/build-your-own-x" target="_blank" rel="noopener">build-your-own-x</a>. Written in our own words.',
  codeSource: 'Our own short keyed list diff, written for this lesson after Didact (MIT).',

  build(S) {
    const { THREE, V, P } = S;
    const floor = new THREE.Group(); floor.position.y = -0.12; S.add(floor);
    const D0 = { action: 'insert', keys: true, diff: true, slice: true }, st = { ...D0 };
    const ink = '#151827', CHAR = '#2C2D31', GOOD = '#1F9E89', RED = '#B5462F', SAF = '#F2AE0C';
    const RZ = i => -0.86 + i * 0.205;
    const colT = (x, s) => {    };
    colT(-2.2, 'before'); colT(-0.35, 'after the edit');
    STOPS.forEach((k, i) => {
      const b = P.box(0.8, 0.04, 0.17, '#fff', { r: 0.03 }); b.position.set(-2.45, 0.12, RZ(i)); floor.add(b);
      const nb = P.box(0.7, 0.04, 0.17, '#F1ECE1', { r: 0.03 }); nb.position.set(-1.68, 0.12, RZ(i)); floor.add(nb);

    });
    const rowsV = Array.from({ length: 7 }, (_, i) => {
      const m = new THREE.MeshLambertMaterial({ color: '#fff' }), b = P.box(0.8, 0.04, 0.17, '#fff', { r: 0.03, material: m }); b.position.set(-0.65, 0.12, RZ(i)); floor.add(b);
      const nm = new THREE.MeshLambertMaterial({ color: '#F1ECE1' }), nb = P.box(0.7, 0.04, 0.17, '#fff', { r: 0.03, material: nm }); nb.position.set(0.12, 0.12, RZ(i)); floor.add(nb);
      return { b, m, nb, nm };
    });
    floor.add(P.arrow(V(-1.25, 0.16, -0.35), V(-1.1, 0.16, -0.35), 0.016, CHAR));

    const tm = new THREE.MeshLambertMaterial({ color: '#FFF' }), tb = P.box(2.1, 0.06, 1.75, '#fff', { r: 0.04, material: tm }); tb.position.set(2.15, 0.12, -0.15); floor.add(tb);


    let R = null;
    function draw() {
      R = diff(st);
      const truth = Object.fromEntries(STOPS.map((k, i) => [k, NOTES[i]]));
      rowsV.forEach((v, i) => {
        const r = R.rows[i], on = !!r;
        [v.b, v.nb].forEach(o => { o.visible = on; });
        if (!on) return;
        v.m.color.set(r.state === 'new' ? '#BFE3DB' : r.state === 'moved' ? '#FBE3B0' : '#FFFFFF');
        const bad = r.note !== (truth[r.k] ?? '');
        v.nm.color.set(bad ? '#F7DED5' : '#F1ECE1');
      });
      const ok = isOk();
      tm.color.set(ok ? '#D9F0E9' : '#F7DED5');


    }
    function isOk() { return st.keys && st.diff && st.slice; }
    draw();
    const set = p => { Object.assign(st, p); draw(); };
    const controls = [
      { type: 'toggle', label: 'Match rows by key', short: 'Keys', get: () => st.keys, set: v => set({ keys: !!v }) },
      { type: 'toggle', label: 'Diff instead of rebuilding', short: 'Diff', get: () => st.diff, set: v => set({ diff: !!v }) },
      { type: 'toggle', label: 'Yield to the browser between units', short: 'Time slicing', get: () => st.slice, set: v => set({ slice: !!v }) },
      { type: 'buttons', label: 'Edit', options: ['Insert a stop at the top', 'Remove a stop'], get: () => st.action === 'insert' ? 0 : 1, act: i => set({ action: i ? 'remove' : 'insert' }) },
    ];
    const readouts = [
      { label: 'Page changes', get: () => ({ v: `${R.ops}`, sub: 'create, update, remove', good: R.ops <= 1, bad: R.ops > 3 }) },
      { label: 'Notes wrong', get: () => ({ v: `${R.wrong}`, sub: 'lost or misplaced', good: R.wrong === 0, bad: R.wrong > 0 }) },
      { label: 'Longest freeze', get: () => ({ v: `${R.freeze} ms`, sub: 'typing blocked', good: R.freeze < 16, bad: R.freeze > 50 }) },
    ];
    const labels = [
      { name: 'l', t: 'Before and after', d: 'The same list, one edit apart', icon: 'box', atV: V(-2.45, 0.15, -0.35) },
      { name: 't', t: 'What the diff did', d: 'Changes, notes, freezes', icon: 'target', atV: V(1.7, 0.17, -0.15) },
    ];
    const reset = () => set({ ...D0 });
    const breaks = [
      { label: 'Match rows by position', hint: 'no keys', on: () => set({ ...D0, keys: false }), off: reset },
      { label: 'Rebuild everything', hint: 'no diff', on: () => set({ ...D0, diff: false }), off: reset },
      { label: 'Render in one long block', hint: 'typing freezes', on: () => set({ ...D0, slice: false }), off: reset },
    ];
    function status() {
      const r = R;
      if (!st.diff) return { ok: false, msg: `<b>Rebuilding the whole list took ${r.ops} page changes and destroyed every input, so all the rider\'s notes are gone.</b> Diff the new virtual tree against the old one and touch only what changed.` };
      if (!st.keys) return { ok: false, msg: `<b>Matched by position, ${st.action === 'insert' ? 'inserting one stop at the top made every row look changed' : 'removing one stop shifted every later row'}: ${r.ops} page changes, and ${r.wrong} notes now sit beside the wrong stop, because the inputs stayed where they were.</b> Give each row a stable key so it is matched by identity.` };
      if (!st.slice) return { ok: false, msg: `<b>The diff is right, but done in one long block it holds the browser for ${r.freeze} ms, so the rider\'s typing stutters.</b> Split the work into small units and yield between them, then commit all changes at once.` };
      return { ok: true, msg: `<b>Matched by key, ${st.action === 'insert' ? 'inserting Kivukoni' : 'removing Jangwani'} took ${r.ops} page change and every note stayed beside its stop.</b> The work ran in small units, so typing never froze for more than ${r.freeze} ms.` };
    }
    return { update: () => {}, controls, readouts, labels, breaks, status, reset, set };
  },

  story: [
    { t: 'Describe the page', home: true, say: 'A bus app lists its stops. A rider has typed notes beside some of them. The framework draws the list from data.', act: m => m.set({ action: 'insert', keys: true, diff: false, slice: true }) },
    { t: 'Rebuilding loses state', home: true, say: 'Throw the page away and rebuild it on every change, and the typed notes are gone.', act: m => m.set({ action: 'insert', keys: true, diff: false, slice: true }) },
    { t: 'Diff the trees', home: true, say: 'Compare the new virtual tree with the old one, and change only what differs.', act: m => m.set({ action: 'remove', keys: true, diff: true, slice: true }) },
    { t: 'Position is not identity', home: true, say: 'Matched by position, one insert shifts every row, and the notes end up beside the wrong stops.', act: m => m.set({ action: 'insert', keys: false, diff: true, slice: true }) },
    { t: 'Keys', home: true, say: 'Give each row a key. One insert, one change, every note in place.', act: m => m.set({ action: 'insert', keys: true, diff: true, slice: true }) },
    { t: 'Small units', home: true, say: 'Do the work in small pieces and let the browser breathe between them. Typing never freezes.', act: m => m.set({ action: 'remove', keys: true, diff: true, slice: true }) },
  ],
  check: [
    { q: 'What does reconciliation do?', options: ['Compares new and old virtual trees and changes only the differences', 'Rebuilds the page', 'Sorts the list'], answer: 0, why: 'Fewer changes, state kept.', hint: 'Try Rebuild everything.' },
    { q: 'Why give list rows keys?', options: ['So rows are matched by identity, not position', 'For styling', 'To sort them'], answer: 0, why: 'Inserts don\'t shift state.', hint: 'Try Match rows by position.' },
    { q: 'Why split rendering into small units?', options: ['So the browser can handle typing between them', 'To use less memory', 'To skip work'], answer: 0, why: 'Yield, then commit.', hint: 'Try Render in one long block.' },
  ],
  terms: [
    ['Virtual tree', 'Plain objects describing what the page should contain.'],
    ['Reconciliation', 'Comparing two virtual trees to find what changed.'],
    ['Key', 'A stable identity for a list item across renders.'],
    ['Commit', 'Applying all the found changes to the real page at once.'],
    ['Fibre', 'A small unit of rendering work that can pause and resume.'],
    ['Hook', 'A function such as useState that keeps state for a component.'],
  ],
  deeper: '<p><b>Index as key.</b> Using the array index as a key is the same as having no key: it changes when items move.</p><p><b>Batching.</b> Several state changes in one event are rendered once, not once each.</p><p><b>About this machine.</b> The route and notes are invented; the counts come from diffing the two lists.</p>',
  code: {
    title: 'Reconcile a keyed list',
    note: 'Our own short version, after Didact.',
    text: `
function reconcile(parent, oldKids, newKids) {
  const oldByKey = new Map(oldKids.map(k => [k.key, k]));
  const next = [];
  for (const child of newKids) {
    const old = oldByKey.get(child.key);
    if (old) {                                   // same identity: keep the element
      updateProps(old.dom, old.props, child.props);
      next.push({ ...child, dom: old.dom });
      oldByKey.delete(child.key);
    } else {
      next.push({ ...child, dom: createDom(child) });
    }
  }
  for (const gone of oldByKey.values()) parent.removeChild(gone.dom);
  next.forEach((c, i) => {
    if (parent.childNodes[i] !== c.dom) parent.insertBefore(c.dom, parent.childNodes[i] || null);
  });
  return next;
}
`,
  },
};
