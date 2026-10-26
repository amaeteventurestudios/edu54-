/** Discovery Lab search (docs/discovery-lab §06): runs in the browser from the local catalog, so it works with the internet
 *  and the AI switched off, answers on every keystroke and sends nothing anywhere. Prefix matching for typeahead ("gra" →
 *  graphing, gravity, granite), small typo tolerance, and a few school synonyms. No imports: tests run this file directly. */

export interface CatalogLike {
  labs: { id: string; name: string; blurb: string; collections: { id: string; name: string; topics: { id: string; name: string; keywords?: string[] }[] }[] }[];
  experiences: { id: string; labId: string; topicId: string; title: string; summary: string; status: string; keywords?: string[] }[];
  journeys: { id: string; title: string; summary: string }[];
}

export type Kind = "experience" | "topic" | "lab" | "journey";
export interface Doc { kind: Kind; id: string; title: string; detail: string; labId: string; topicId?: string; status?: string; title_words: string[]; words: string[] }
export interface Hit { doc: Doc; score: number }

/** Words a student might type for the same idea. A query word also matches its alternatives (a little lower). */
const SYNONYMS: Record<string, string[]> = {
  maths: ["mathematics"], math: ["mathematics"], sums: ["algebra", "number"], electricity: ["electronics", "current", "voltage", "circuit"],
  electric: ["electronics", "voltage"], space: ["astronomy", "planet", "moon"], planets: ["planet", "solar"], stars: ["star"],
  animals: ["prey", "predator", "population"], plants: ["plant", "photosynthesis"], body: ["anatomy"], chemistry: ["chemical"],
  coding: ["programming", "code", "algorithm"], computers: ["computer", "algorithm"], robots: ["robot", "robotics"], machines: ["gear", "lever"],
  earthquakes: ["earthquake"], quake: ["earthquake"], volcanoes: ["volcano"], climate: ["greenhouse", "warming"], weather: ["climate"],
  map: ["latitude", "longitude", "globe"], maps: ["latitude", "longitude", "globe"], music: ["piano", "notes"], sound: ["frequency", "notes", "piano"],
  shapes: ["geometry", "solid"], graphs: ["graph", "graphing"], speed: ["velocity", "rpm"], heat: ["temperature"], pressure: ["gas"],
};

export const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[²³]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const words = (s: string) => normalize(s).split(" ").filter(Boolean);

export function buildIndex(c: CatalogLike): Doc[] {
  const docs: Doc[] = [];
  for (const lab of c.labs) {
    docs.push({ kind: "lab", id: lab.id, title: lab.name, detail: lab.blurb, labId: lab.id, title_words: words(lab.name), words: words(`${lab.name} ${lab.blurb}`) });
    for (const col of lab.collections) for (const t of col.topics)
      docs.push({ kind: "topic", id: `${lab.id}/${t.id}`, title: t.name, detail: `${lab.name} · ${col.name}`, labId: lab.id, topicId: t.id,
        title_words: words(t.name), words: words(`${t.name} ${col.name} ${(t.keywords ?? []).join(" ")}`) });
  }
  const labName = new Map(c.labs.map((l) => [l.id, l.name]));
  for (const e of c.experiences)
    docs.push({ kind: "experience", id: e.id, title: e.title, detail: `${labName.get(e.labId) ?? ""} · ${e.summary}`, labId: e.labId, topicId: e.topicId, status: e.status,
      title_words: words(e.title), words: words(`${e.title} ${e.summary} ${(e.keywords ?? []).join(" ")}`) });
  for (const j of c.journeys)
    docs.push({ kind: "journey", id: j.id, title: j.title, detail: j.summary, labId: "", title_words: words(j.title), words: words(`${j.title} ${j.summary}`) });
  for (const d of docs) d.words = [...new Set(d.words)];
  return docs;
}

/** Damerau-Levenshtein distance, giving up early once it is over `max`. */
export function editDistance(a: string, b: string, max = 2): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

/** How well one typed word matches one catalog word (0 = not at all). The last typed word may be unfinished. */
function wordScore(q: string, w: string, partial: boolean): number {
  if (q === w) return 10;
  if (w.startsWith(q)) return partial ? 8 : 6;
  if (q.length >= 4) {
    const allowed = q.length >= 7 ? 2 : 1;
    if (editDistance(q, w, allowed) <= allowed) return 5;
    if (partial && w.length > q.length && editDistance(q, w.slice(0, q.length), 1) <= 1) return 4;       // "gravi" typed as "garvi"
  }
  if (q.length >= 4 && w.includes(q)) return 3;
  return 0;
}

const KIND_BONUS: Record<Kind, number> = { experience: 3, lab: 2, journey: 1, topic: 0 };

export function search(index: Doc[], query: string, limit = 12): Hit[] {
  const qs = words(query);
  if (!qs.length) return [];
  const hits: Hit[] = [];
  for (const doc of index) {
    let total = 0;
    for (const [i, q] of qs.entries()) {
      const partial = i === qs.length - 1 && !/\s$/.test(query);
      let best = 0;
      for (const w of doc.words) { const sc = wordScore(q, w, partial); if (sc) best = Math.max(best, sc + (doc.title_words.includes(w) ? 2 : 0)); }
      for (const alt of SYNONYMS[q] ?? []) for (const w of doc.words) if (w === alt || w.startsWith(alt)) best = Math.max(best, 5);
      if (!best) { total = 0; break; }                       // every word typed must match something
      total += best;
    }
    if (!total) continue;
    total += KIND_BONUS[doc.kind] + (doc.status === "working" ? 2 : 0);
    if (normalize(doc.title).startsWith(normalize(query))) total += 4;
    hits.push({ doc, score: total });
  }
  return hits.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).slice(0, limit);
}
