// Progress: which lessons are done. Kept in this browser (localStorage `ab-done`) for everyone,
// and in the learner's account once they sign in (kit/account.js merges the two).
const KEY = 'ab-done';
const read = () => { try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { return new Set(); } };
const listeners = new Set();

export const progress = {
  all: () => read(),
  has: slug => read().has(slug),
  add(slug, extra) {
    const s = read(); if (s.has(slug)) return false;
    s.add(slug);
    try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { }
    for (const f of listeners) f(slug, extra);
    return true;
  },
  merge(list) {
    const s = read(); let n = 0;
    for (const x of list || []) if (!s.has(x)) { s.add(x); n++; }
    if (n) try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { }
    return n;
  },
  // host mode (kit/account.js): the host's list for the signed-in learner is the whole truth on this browser
  replace(list) { try { localStorage.setItem(KEY, JSON.stringify([...new Set(list || [])])); } catch { } },
  on: f => listeners.add(f),
};
