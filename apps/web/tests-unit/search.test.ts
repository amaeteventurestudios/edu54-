// Discovery Lab search: typeahead, typos, synonyms, grouping data. Run: npm run test:unit
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildIndex, editDistance, search } from "../src/discovery/search.ts";

const catalog = JSON.parse(readFileSync(new URL("../../../content/discovery/catalog.json", import.meta.url), "utf8"));
const index = buildIndex(catalog);
const titles = (q: string, n = 12) => search(index, q, n).map((h) => h.doc.title);

test("gra suggests graphing, gravity and granite before Enter", () => {
  const t = titles("gra", 30);
  assert.ok(t.includes("Graphing"), t.join());
  assert.ok(t.includes("Gravity"), t.join());
  assert.ok(search(index, "gra", 30).some((h) => h.doc.words.includes("granite")), t.join());
});

test("typos still find the right thing", () => {
  assert.equal(titles("projectle")[0], "Projectile motion");
  assert.ok(titles("volcanoe").includes("Volcanoes"));
  assert.ok(titles("moon phse")[0].startsWith("Moon phases"));
  assert.ok(titles("sortng")[0].startsWith("Sorting"));
});

test("synonyms and cross-lab results", () => {
  assert.ok(search(index, "electricity", 10).some((h) => h.doc.id === "ohms-law"));
  const labs = new Set(search(index, "energy", 20).map((h) => h.doc.labId));
  assert.ok(labs.size >= 2, [...labs].join());
  assert.ok(titles("maths").includes("Mathematics"));
});

test("every word must match, working experiments rank first", () => {
  assert.deepEqual(titles("zzzz"), []);
  assert.deepEqual(titles("   "), []);
  const h = search(index, "moon", 5);
  assert.equal(h[0].doc.id, "moon-phases");
  assert.ok(titles("gear ratio").includes("Gear trains"));
});

test("edit distance", () => {
  assert.equal(editDistance("gravity", "gravity"), 0);
  assert.equal(editDistance("garvity", "gravity"), 1);                  // a swap counts once
  assert.equal(editDistance("abc", "xyzxyz", 2), 3);
});

test("every working experiment has a module, and every module is in the catalog", () => {
  const registry = readFileSync(new URL("../src/discovery/modules/index.ts", import.meta.url), "utf8");
  const registered = new Set([...registry.matchAll(/^\s+(\w+):\s*\(\)\s*=>\s*import\(/gm)].map((m) => m[1]));
  const working = catalog.experiences.filter((e: { status: string }) => e.status === "working").map((e: { module: string }) => e.module);
  assert.deepEqual([...registered].sort(), [...new Set(working)].sort());
});
