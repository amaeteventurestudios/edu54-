// K-12 grade bands (docs: K-12 UI spec, founder review log 2026-09-30). One app, four learner experiences. A student's band
// comes from the grade their teacher set; students never choose it. The words below are the English strings for band-aware
// screens live in src/locales/en.json (other languages: files with the same keys).
import type { Band, User } from "./api";
import { t, tList } from "./i18n";

export const BANDS: Band[] = ["discover", "explore", "build", "launch"];

const bandInfo = (b: Band) => ({ name: t(`bands.${b}.name`), grades: t(`bands.${b}.grades`), stage: t(`bands.${b}.stage`) });
export const BAND_INFO = Object.fromEntries(BANDS.map((b) => [b, bandInfo(b)])) as Record<Band, { name: string; grades: string; stage: string }>;

/** The band to show: the student's own; staff previews pass one; a student with no grade yet gets today's middle-school screens. */
export const bandOf = (u: Pick<User, "band">, preview?: Band | null): Band => preview ?? u.band ?? "build";

/** The bands whose content a student sees: their own plus any their teacher opened up (from the server, /api/auth/me). */
export const contentBands = (u: Pick<User, "band" | "content_bands">): Band[] => u.content_bands?.length ? u.content_bands : [bandOf(u)];

/** Which courses belong to which bands (course ids from content/catalog.json). */
export const COURSE_BANDS: Record<string, Band[]> = {
  "python-foundations": ["build", "launch"],
  "ai-foundations": ["explore", "build", "launch"],
  "science-engineering": ["explore", "build", "launch"],
  "teacher-lessons": ["discover", "explore", "build", "launch"],     // lessons a teacher made with the AI Lesson Builder
};
export const courseFits = (id: string, bands: Band | Band[]) => (COURSE_BANDS[id] ?? ["build", "launch"]).some((b) => ([] as Band[]).concat(bands).includes(b));

/** A learning path: each step is measured by a real course's progress when one exists ("course"), by saved projects
 *  ("projects"), or is not tracked yet (shown as not started). */
export interface PathStep { label: string; course?: string; projects?: boolean }
export const PATHS: Record<Band, PathStep[]> = {
  discover: [],
  explore: withLabels("explore", [{}, { course: "ai-foundations" }, {}, { projects: true }]),
  build: withLabels("build", [{ course: "ai-foundations" }, { course: "python-foundations" }, {}, { projects: true }]),
  launch: withLabels("launch", [{ course: "python-foundations" }, { course: "ai-foundations" }, {}, { projects: true }]),
};
function withLabels(band: Band, steps: Omit<PathStep, "label">[]): PathStep[] {
  const labels = tList(`paths.${band}`);
  return steps.map((s, i) => ({ label: labels[i] ?? "", ...s }));
}

export const SKILLS = Object.fromEntries(BANDS.map((b) => [b, tList(`skills.${b}`)])) as Record<Band, string[]>;

function rec(b: Band) { return { title: t(`recommended.${b}.title`), text: t(`recommended.${b}.text`) }; }

/** One real thing to try next, per band (all of these exist on the device). */
export const RECOMMENDED: Record<Band, { title: string; text: string; to: string; external?: boolean }> = {
  discover: { ...rec("discover"), to: "/play/musicblocks/index.html", external: true },
  explore: { ...rec("explore"), to: "/play/blockly-games/maze/index.html", external: true },
  build: { ...rec("build"), to: "/learn/lessons/ai-foundations-l2" },
  launch: { ...rec("launch"), to: "/learn/lessons/python-foundations-l7" },
};

/** Verb card subtitles: the nav labels stay the five verbs; the longer names live here (spec). */
export const VERB_TEXT = Object.fromEntries((["ask", "learn", "build", "explore", "progress"] as const).map((v) => [v, t(`verbs.${v}`)])) as Record<"ask" | "learn" | "build" | "explore" | "progress", string>;

/** K-2: four big picture buttons, each read aloud on request. */
export const K2_TILES: { id: string; label: string; say: string; to: string; tint: string }[] = [
  { id: "read", to: "/learn", tint: "bg-[#e9f5ec]" }, { id: "play", to: "/build", tint: "bg-[#fbf1e2]" },
  { id: "ask", to: "/ask", tint: "bg-[#eaf1fb]" }, { id: "stars", to: "/progress", tint: "bg-[#efedfb]" },
].map((x) => ({ ...x, label: t(`k2.${x.id}.label`), say: t(`k2.${x.id}.say`) }));

/** Coding games on Build, with the bands each suits. */
export const GAME_BANDS: Record<string, Band[]> = {
  puzzles: ["discover", "explore", "build"],
  music: ["discover", "explore", "build"],
  studio: ["explore", "build", "launch"],
  robot: ["build", "launch"],
};

/** Read text aloud with the browser's own voice (works offline where the device has a voice installed). */
export function sayAloud(text: string) {
  try {
    const s = window.speechSynthesis;
    if (!s) return false;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    s.speak(u);
    return true;
  } catch {
    return false;
  }
}
