// UI strings from translation files (src/locales/<lang>.json). English is the default and the fallback for any missing key.
// The K-12 grade-band screens use this; older screens still have English in the code and move over as they are touched.
import en from "@/locales/en.json";

type Tree = { [k: string]: string | string[] | Tree };
const LOCALES: Record<string, Tree> = { en: en as Tree };
let lang = "en";

/** Switch the language (for example from the school's settings). Unknown languages stay on English. */
export function setLanguage(l: string) { if (LOCALES[l]) lang = l; }

function lookup(tree: Tree | undefined, key: string): string | string[] | undefined {
  let node: string | string[] | Tree | undefined = tree;
  for (const part of key.split(".")) node = node && typeof node === "object" && !Array.isArray(node) ? node[part] : undefined;
  return typeof node === "string" || Array.isArray(node) ? node : undefined;
}

/** A string by key, with {name}-style words filled in. A missing key shows the key, so it is easy to spot. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const v = lookup(LOCALES[lang], key) ?? lookup(LOCALES.en, key);
  const s = typeof v === "string" ? v : key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

/** A list of strings by key (for example a band's skills). */
export function tList(key: string): string[] {
  const v = lookup(LOCALES[lang], key) ?? lookup(LOCALES.en, key);
  return Array.isArray(v) ? v : [];
}
