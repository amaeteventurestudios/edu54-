/** Brand and edition (docs/edu54/CLAUDE.md §3), read once from GET /api/config/public before the app renders.
 *  Umanah with no edition is the AI Lab exactly as before: its colors stay the tokens in index.css. */
import { createContext, useContext, type ReactNode } from "react";

export interface BrandConfig {
  schoolDisplay?: string;
  brand: { id: string; productName: string; shortName: string; platformCredit: string; tagline: string; privacyLine: string;
    logo: { type: string; text?: string }; favicon: { type: string; href?: string; letter?: string; background?: string; foreground?: string };
    colors: Record<string, string>; loginBackgrounds?: { left: string; right: string }[] };
  edition: { id: string; label: string; terms: Record<string, string>; levels: string[]; youngChildLogin: boolean; buildTools: string[]; catalog: string; bands?: Record<string, { name: string; grades: string }> };
}

export const DEFAULT_CONFIG: BrandConfig = {
  brand: { id: "umanah", productName: "Umanah AI Lab", shortName: "Umanah", platformCredit: "", tagline: "", privacyLine: "Student chats are never sent to Umanah, and safety alerts go to trusted adults.",
    logo: { type: "rosette" }, favicon: { type: "file", href: "/favicon.svg" }, colors: {} },
  edition: { id: "", label: "", terms: {}, levels: [], youngChildLogin: true, buildTools: ["pyodide", "blockly-games", "snap", "music-blocks", "reeborg"], catalog: "" },
};

let current: BrandConfig = DEFAULT_CONFIG;
const Ctx = createContext<BrandConfig>(DEFAULT_CONFIG);

/** The page is built for one brand (VITE_PRODUCT_NAME), so a slow or restarting API never shows another brand's name. */
const BUILT_FOR = (import.meta.env.VITE_PRODUCT_NAME as string | undefined) || "Umanah AI Lab";

export async function loadBrand(): Promise<BrandConfig> {
  for (let i = 0; i < 6; i++) {                     // a busy or restarting API: try again for about 20 seconds
    try {
      const r = await fetch("/api/config/public", { credentials: "same-origin" });
      if (r.ok) { current = await r.json(); break; }
    } catch { /* not up yet */ }
    await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
  }
  if (current === DEFAULT_CONFIG && BUILT_FOR !== DEFAULT_CONFIG.brand.productName)
    current = { ...DEFAULT_CONFIG, brand: { ...DEFAULT_CONFIG.brand, id: "unknown", productName: BUILT_FOR, shortName: BUILT_FOR, logo: { type: "wordmark" },
      privacyLine: "Student chats never leave this device, and safety alerts go to trusted adults." } };
  applyBrand(current);
  return current;
}

/** Brand colors become the same CSS variables the components already use, so no component hard-codes a brand. */
function applyBrand(c: BrandConfig) {
  const k = c.brand.colors, root = document.documentElement.style;
  const set = (name: string, v?: string) => { if (v) root.setProperty(name, v); };
  set("--primary", k.primary); set("--ring", k.primary); set("--progress", k.primary); set("--secondary-foreground", k.primary); set("--accent-foreground", k.primary);
  set("--accent", k.primaryTint); set("--background", k.background); set("--foreground", k.text);
  set("--sidebar", k.sidebar); set("--sidebar-foreground", k.sidebarText); set("--sidebar-accent", k.primaryHover); set("--sidebar-primary", k.primaryHover);
  set("--brand-accent", k.accent);
  if (c.brand.id !== "umanah") {
    document.title = c.brand.productName;
    const f = c.brand.favicon;
    if (f.type === "letter") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${f.background}"/><text x="16" y="23" text-anchor="middle" font-family="Georgia,serif" font-size="21" font-weight="700" fill="${f.foreground}">${f.letter}</text></svg>`;
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
      link.type = "image/svg+xml"; link.href = "data:image/svg+xml," + encodeURIComponent(svg);
    }
  }
}

export function BrandProvider({ value, children }: { value: BrandConfig; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBrand = () => useContext(Ctx);
export const productName = () => current.brand.productName;
/** "Umanah courses" in the AI Lab, "EDU54 courses" in EDU54: the product's own courses, never another brand's name. */
export const ownCourses = () => `${current.brand.shortName} courses`;

/** Edition wording: "Teacher Center" -> "Lecturer Center", "Class" -> "Course" and so on, whole words only, case kept.
 *  With no edition (or K-12) every word maps to itself. */
const WORDS: [string, string][] = [["Teacher Center", "teacherCenter"], ["School Admin", "admin"], ["teachers", "teachers"], ["teacher", "teacher"],
  ["classes", "groups"], ["class", "group"], ["school", "institution"]];
export function tr(text: string, c: BrandConfig = current): string {
  const t = c.edition.terms;
  if (!t || !Object.keys(t).length) return text;
  let out = text;
  for (const [word, key] of WORDS) {
    const to = t[key];
    if (!to) continue;
    out = out.replace(new RegExp(`\\b${word}\\b`, "gi"), (m) => {
      if (m === m.toUpperCase() && m.length > 1) return to.toUpperCase();
      if (m[0] === m[0].toUpperCase()) return to.split(" ").map((w, i) => (i === 0 || /^[A-Z]/.test(word.split(" ")[i] ?? "") ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
      return to.toLowerCase();
    });
  }
  return out.replace(/\b([Aa]) (institution|[aeiouAEIOU]\w*)/g, (_m, a: string, w: string) => `${a}n ${w}`);
}
export const useTr = () => { const c = useBrand(); return (s: string) => tr(s, c); };

/** Interim edition wording for text the components hard-code (TODO: move every UI string into translation files, as the
 *  language rollout needs; docs/edu54/EDU54-DECISIONS.md). Rewrites visible text nodes through tr() as they appear.
 *  Never touches what people type or code: inputs, text areas, code blocks and the code editor are skipped. */
const SKIP = "input, textarea, code, pre, .cm-editor, [contenteditable], [data-no-tr]";
export function startEditionWording(c: BrandConfig = current) {
  const base: Record<string, string> = { teacher: "Teacher", teachers: "Teachers", teacherCenter: "Teacher Center", group: "Class", groups: "Classes", admin: "School Admin", institution: "school" };
  const differs = Object.entries(c.edition.terms || {}).some(([k, v]) => k in base && base[k] !== v);
  if (!differs) return;
  const fix = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const p = n.parentElement;
      if (!p || p.closest(SKIP)) return;
      const v = n.nodeValue ?? "", t = tr(v, c);
      if (t !== v) n.nodeValue = t;
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as Element;
      if (el.closest(SKIP)) return;
      for (const a of ["placeholder", "aria-label", "title"]) { const v = el.getAttribute(a); if (v) { const t = tr(v, c); if (t !== v) el.setAttribute(a, t); } }
      n.childNodes.forEach(fix);
    }
  };
  fix(document.body);
  new MutationObserver((ms) => ms.forEach((m) => { if (m.type === "characterData") fix(m.target); else m.addedNodes.forEach(fix); }))
    .observe(document.body, { subtree: true, childList: true, characterData: true });
  const t = () => { const v = document.title, n = tr(v, c); if (n !== v) document.title = n; };
  new MutationObserver(t).observe(document.querySelector("title") ?? document.head, { subtree: true, childList: true, characterData: true });
}
