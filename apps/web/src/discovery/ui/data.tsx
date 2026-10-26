/** Discovery Lab data on the React side: the catalog (served by the API from content/discovery), the search index built
 *  from it, lab icons, and "Continue exploring", which is kept in this browser only (nothing about it is sent anywhere). */
import { useQuery } from "@tanstack/react-query";
import { Atom, Binary, Bot, Cog, FlaskConical, Globe, Leaf, Mountain, Music, Orbit, Sigma, Sprout, Zap, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { get } from "@/lib/api";
import { useUser } from "@/lib/session";
import type { Catalog, Experience, Lab } from "../engine.ts";
import { buildIndex } from "../search.ts";

export const ICONS: Record<string, LucideIcon> = { sigma: Sigma, atom: Atom, "flask-conical": FlaskConical, leaf: Leaf, zap: Zap, music: Music, orbit: Orbit,
  mountain: Mountain, bot: Bot, cog: Cog, binary: Binary, globe: Globe, sprout: Sprout };
export const LabIcon = ({ lab, className }: { lab: Lab; className?: string }) => { const I = ICONS[lab.icon] ?? FlaskConical; return <I className={className} strokeWidth={1.6} aria-hidden="true" />; };

export function useCatalog() {
  const q = useQuery({ queryKey: ["discovery-catalog"], queryFn: () => get<Catalog>("/api/discovery/catalog"), staleTime: Infinity });
  const index = useMemo(() => (q.data ? buildIndex(q.data) : []), [q.data]);
  return { ...q, index };
}

export const labOf = (c: Catalog, id: string) => c.labs.find((l) => l.id === id);
export const experienceOf = (c: Catalog, id: string) => c.experiences.find((e) => e.id === id);
export const working = (c: Catalog, labId?: string) => c.experiences.filter((e) => e.status === "working" && (!labId || e.labId === labId));
export const expPath = (e: Experience) => `/discover/${e.labId}/${e.id}`;
/** A soft tint of a lab's colour, for card backgrounds (the colour itself stays for icons and the experiment). */
export const tint = (hex: string, alpha = 0.09) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`; };

// ---- Continue exploring: the last few experiments opened, in this browser, per signed-in person ---------------------------
const key = (userId: number) => `discovery:recent:${userId}`;
export function readRecent(userId: number): string[] {
  try { const v = JSON.parse(localStorage.getItem(key(userId)) ?? "[]"); return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : []; }
  catch { return []; }
}
export function noteRecent(userId: number, expId: string) {
  try { localStorage.setItem(key(userId), JSON.stringify([expId, ...readRecent(userId).filter((x) => x !== expId)].slice(0, 6))); } catch { /* private mode: fine */ }
}
export const useRecent = () => readRecent(useUser().id);
