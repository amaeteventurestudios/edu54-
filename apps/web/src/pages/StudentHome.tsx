import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Award, BarChart3, BookOpen, Briefcase, Code2, Database, FileText, FolderOpen, Music, Puzzle, Sparkles, Star, Volume2, MessageSquare, GraduationCap } from "lucide-react";
import type { FocusEvent, ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Bar, FeatureCard, IconBadge, Pill } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { get, type Level } from "@/lib/api";
import { useBrand } from "@/lib/brand";
import { dueLabel, nf } from "@/lib/format";
import { useContinue } from "@/lib/queries";
import { useUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { stagger, useFirstVisit, useHoverSay } from "@/lib/motion";

// Grade-aware Student Home (owner, 2026-09-30): one platform, four learner experiences chosen by the class level:
// Discover (K-2), Explore (3-5), Build (6-8), Launch (9-12). Staff see the same screens through "View as" (preview).

export interface Learner {
  level: string; stage: string; band: { id: string; name: string; grades: string } | null; preview: boolean;
  path: { steps: { title: string; course_id: string | null; percent: number | null; state: string }[]; lessons_done: number; lessons_total: number; percent: number };
  recommended: { id: string; title: string; number: number; course: string } | null;
  project: { id: number; title: string; updated_at: string } | null;
  skills: { name: string; state: string; detail: string }[];
  xp: Level; streak: number;
}

export const useLearner = (band?: string) => useQuery({ queryKey: ["learner", band ?? "me"], queryFn: () => get<Learner>(band ? `/api/learner/preview?band=${band}` : "/api/learner/me") });

const ago = (iso: string) => { const d = Math.round((Date.now() - new Date(iso).getTime()) / 86400000); return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };

/** The learner context line under the name, e.g. "JSS 2 · Junior Secondary · Build". */
function LearnerLine({ l }: { l: Learner }) {
  return <p className="mt-2 text-[17px] font-medium text-primary">{[l.level, l.stage, l.band ? `${l.band.name} (${l.band.grades})` : ""].filter(Boolean).join(" · ")}</p>;
}

function Stats({ l }: { l: Learner }) {
  return <p className="mt-1 text-[15px] text-muted-foreground">Level {l.xp.level} — {l.xp.name} · {nf(l.xp.xp)} XP · {l.streak}-day streak</p>;
}

function PathCard({ l, title = "Your Learning Path" }: { l: Learner; title?: string }) {
  return (
    <section aria-label={title} className="rounded-xl border border-border bg-white p-5 card-soft">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-[20px]">{title}</h2>
        <span className="text-sm text-muted-foreground">{l.path.lessons_total ? `${l.path.lessons_done} of ${l.path.lessons_total} lessons` : ""}</span></div>
      <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-[15px]">
        {l.path.steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-2">
            {i > 0 && <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
            {s.course_id && s.state === "available" ? <Link to="/learn" className="font-medium text-primary hover:underline">{s.title}</Link>
              : <span className="text-muted-foreground">{s.title}{s.state === "coming_soon" && <Pill tone="gray" className="ml-1.5 text-[10px]">Soon</Pill>}</span>}
          </li>))}
      </ol>
      <div className="mt-4 flex items-center gap-3"><Bar value={l.path.percent} label="Learning path progress" className="h-2.5" /><span className="w-12 text-right text-sm font-medium text-primary">{l.path.percent}%</span></div>
    </section>
  );
}

function Tile({ to, icon, title, sub, tint, href }: { to?: string; href?: string; icon: ReactNode; title: string; sub?: string; tint: string }) {
  const body = <>
    <IconBadge className="bg-white/80">{icon}</IconBadge>
    <span className="min-w-0"><span className="block text-[13px] font-medium uppercase tracking-wide text-muted-foreground">{sub}</span></span>
    <span className="font-serif text-[18px] leading-snug text-primary">{title}</span></>;
  const cls = cn("card-press flex min-h-[150px] flex-col gap-2 rounded-xl border border-border p-4 card-soft", tint);
  return href ? <a href={href} target="_blank" rel="noopener" className={cls}>{body}</a> : <Link to={to ?? "/"} className={cls}>{body}</Link>;
}

function LowerHalf({ l, forGroup, projectsLabel = "Continue Your Project" }: { l: Learner; forGroup: string; projectsLabel?: string }) {
  const cont = useContinue();
  const a = cont.data?.assigned[0];
  return (
    <section aria-label="Continue" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cont.data?.lesson ? <Tile to={`/learn/lessons/${cont.data.lesson.id}`} tint="bg-learn-bg" icon={<BookOpen className="h-6 w-6" strokeWidth={1.5} />} sub="Continue Learning"
        title={`${cont.data.lesson.course} · Lesson ${cont.data.lesson.number}: ${cont.data.lesson.title} · ${cont.data.lesson.percent}%`} /> : l.preview ? <Tile tint="bg-learn-bg" icon={<BookOpen className="h-6 w-6" />} sub="Continue Learning" title="The lesson they are on shows here" /> : <Skeleton className="h-[150px]" />}
      <Tile to={a ? `/assignments/${a.id}` : "/learn"} tint="bg-explore-bg" icon={<FileText className="h-6 w-6" strokeWidth={1.5} />} sub="Assignments" title={a ? `${a.title} · ${dueLabel(a.due_at)}` : l.preview ? "Work their teacher sets shows here" : "Nothing assigned right now"} />
      <Tile to={l.recommended ? `/learn/lessons/${l.recommended.id}` : "/learn"} tint="bg-ask-bg" icon={<Sparkles className="h-6 w-6" strokeWidth={1.5} />} sub={`Recommended for ${forGroup}`}
        title={l.recommended ? `${l.recommended.title} · ${l.recommended.course}, lesson ${l.recommended.number}` : "More lessons coming soon"} />
      <Tile to="/build" tint="bg-build-bg" icon={<FolderOpen className="h-6 w-6" strokeWidth={1.5} />} sub={projectsLabel} title={l.project ? `${l.project.title} · last edited ${ago(l.project.updated_at)}` : "Start your first project"} />
    </section>
  );
}

const SKILL_TONE: Record<string, "green" | "blue" | "amber" | "gray"> = { strong: "green", growing: "blue", started: "amber", not_started: "gray" };
function Skills({ l, only }: { l: Learner; only?: string[] }) {
  const list = only ? l.skills.filter((s) => only.includes(s.name)) : l.skills;
  return (
    <section aria-label="Your Skills" className="rounded-xl border border-border bg-white p-5 card-soft">
      <h2 className="text-[20px]">Your Skills</h2>
      <ul className="mt-3 flex flex-wrap gap-2">{list.map((s) => <li key={s.name} title={s.detail}><Pill tone={SKILL_TONE[s.state]} className="px-3 py-1 text-[13px]">{s.name}{s.state !== "not_started" ? ` · ${s.state === "strong" ? "strong" : s.state === "growing" ? "growing" : "started"}` : ""}</Pill></li>)}</ul>
      <p className="mt-2 text-xs text-muted-foreground">From your lessons, practice and projects so far.</p>
    </section>
  );
}

function Cards({ uni, simple }: { uni?: boolean; simple?: boolean }) {
  const i = (C: typeof MessageSquare) => <C className="h-6 w-6" strokeWidth={1.5} />;
  const firstVisit = useFirstVisit();
  const m = (n: number) => ({ className: firstVisit ? "rise-in" : undefined, style: stagger(n) });
  return (
    <section aria-label="Where to go" className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5 max-sm:[&>a:last-child]:col-span-2">
      <FeatureCard {...m(0)} to="/ask" accent="ask" icon={i(MessageSquare)} title="AI Tutor" text={simple ? "Ask anything and get help" : "Ask questions, get explanations, or practice what you're learning."} />
      <FeatureCard {...m(1)} to="/learn" accent="learn" icon={i(BookOpen)} title="My Learning" text={uni ? "Continue courses, lessons and coursework." : "Continue courses, lessons and classroom assignments."} />
      <FeatureCard {...m(2)} to="/build" accent="build" icon={i(Code2)} title="Create & Build" text={simple ? "Code, games and projects" : "Code, experiment, design and build projects."} />
      <FeatureCard {...m(3)} to="/explore" accent="explore" icon={i(Database)} title="Explore" text={simple ? "Books, stories and science" : "Books, simulations, science, technology and local resources."} />
      <FeatureCard {...m(4)} to="/progress" accent="progress" icon={i(BarChart3)} title="My Progress" text={simple ? "Your XP and badges" : "XP, skills, badges, projects and achievements."} />
    </section>
  );
}

function PreviewBar({ l }: { l: Learner }) {
  return l.preview ? <p role="status" className="mb-5 rounded-lg bg-[#eef1f8] px-4 py-2.5 text-sm text-[#374151]">Preview: what a {l.level} learner sees ({l.band?.name}, {l.band?.grades}). Numbers are empty because no learner is signed in. <Link to="/teacher" className="underline">Back</Link></p> : null;
}

/** K-2 — Discover: big picture tiles, a friendly guide, read-aloud, very few words, no system information. */
function Discover({ l, first }: { l: Learner; first: string }) {
  const say = (t: string) => { try { const u = new SpeechSynthesisUtterance(t); u.rate = 0.9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch { /* no voice on this device */ } };
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const tiles = [
    { to: "/ask", icon: <MessageSquare className="h-14 w-14" strokeWidth={1.4} />, title: "Talk", say: "Talk to your AI helper", tint: "bg-ask-bg" },
    { href: "/play/blockly-games/index.html", icon: <Puzzle className="h-14 w-14" strokeWidth={1.4} />, title: "Puzzles", say: "Play puzzle games", tint: "bg-build-bg" },
    { href: "/play/musicblocks/index.html", icon: <Music className="h-14 w-14" strokeWidth={1.4} />, title: "Music", say: "Make music with blocks", tint: "bg-learn-bg" },
    { to: "/explore", icon: <BookOpen className="h-14 w-14" strokeWidth={1.4} />, title: "Stories", say: "Read stories and look at pictures", tint: "bg-explore-bg" },
    { to: "/progress", icon: <Star className="h-14 w-14" strokeWidth={1.4} />, title: "My Stars", say: "See your stars and badges", tint: "bg-progress-bg" },
  ];
  const hello = l.preview ? "Hello! What shall we do today?" : `Hello ${first}! What shall we do today?`;
  const firstVisit = useFirstVisit();
  const hoverSay = useHoverSay(say);
  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <PreviewBar l={l} />
      <div className="mb-8 flex flex-wrap items-center gap-5">
        <svg viewBox="0 0 96 96" className="h-24 w-24 shrink-0" aria-hidden="true"><circle cx="48" cy="48" r="30" fill="#F5C542" />{[...Array(12)].map((_, i) => <rect key={i} x="46" y="4" width="4" height="12" rx="2" fill="#F5C542" transform={`rotate(${i * 30} 48 48)`} />)}<circle cx="38" cy="44" r="4" fill="#1B1B1B" /><circle cx="58" cy="44" r="4" fill="#1B1B1B" /><path d="M36 56 Q48 68 60 56" stroke="#1B1B1B" strokeWidth="4" fill="none" strokeLinecap="round" /></svg>
        <div className="relative rounded-2xl bg-white px-6 py-4 text-[26px] font-serif text-primary card-soft">{hello}
          {canSpeak && <button onClick={() => say(hello)} aria-label="Read this to me" className="press ml-3 inline-grid h-11 w-11 place-items-center rounded-full bg-accent align-middle"><Volume2 className="h-6 w-6" /></button>}</div>
        <p className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-lg font-medium text-primary card-soft" aria-label={`${l.xp.xp} stars`}><Star className="h-5 w-5 fill-[#F5C542] text-[#d9a520]" />{nf(l.xp.xp)}</p>
      </div>
      <ul className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t, i) => {
          const inner = <><span className="text-primary">{t.icon}</span><span className="font-serif text-[30px] text-primary">{t.title}</span></>;
          const cls = cn("card-press flex min-h-[210px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-border p-4 card-soft [--lift:-4px]", t.tint);
          // read aloud after the mouse rests 0.35 s (never on touch); keyboard focus reads the tile
          const speak = canSpeak ? { onMouseEnter: () => hoverSay.start(t.say), onMouseLeave: hoverSay.cancel,
            onFocus: (e: FocusEvent<HTMLElement>) => { if (e.currentTarget.matches(":focus-visible")) say(t.say); } } : {};
          return (
            <li key={t.title} style={stagger(i)} className={cn("relative", firstVisit && "rise-in")}>
              {t.href ? <a href={t.href} target="_blank" rel="noopener" className={cls} aria-label={t.say} {...speak}>{inner}</a> : <Link to={t.to!} className={cls} aria-label={t.say} {...speak}>{inner}</Link>}
              {canSpeak && <button onClick={() => say(t.say)} aria-label={`Read "${t.title}" to me`} className="press absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/90 text-primary"><Volume2 className="h-5 w-5" /></button>}
            </li>);
        })}
      </ul>
    </div>
  );
}

/** 3-5 — Explore: friendly, a short learning path, today's challenge, coding games, a few skills. */
function ExploreHome({ l, first }: { l: Learner; first: string }) {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PreviewBar l={l} />
      <div className="mb-6"><h1 className="text-[36px] leading-tight md:text-[44px]">Hi {l.preview ? "there" : first}! Ready to explore?</h1><LearnerLine l={l} /><Stats l={l} /></div>
      <div className="mb-5"><PathCard l={l} title="Your Adventure" /></div>
      <Cards simple />
      <hr className="my-6 border-border" />
      <LowerHalf l={l} forGroup={l.level} projectsLabel="Your Project" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section aria-label="Coding games" className="rounded-xl border border-border bg-white p-5 card-soft"><h2 className="text-[20px]">Coding games</h2>
          <div className="mt-3 flex flex-wrap gap-3"><a className="inline-flex items-center gap-2 rounded-lg bg-build-bg px-4 py-2.5 font-medium text-primary" href="/play/blockly-games/index.html" target="_blank" rel="noopener"><Puzzle className="h-5 w-5" />Block Puzzles</a>
            <a className="inline-flex items-center gap-2 rounded-lg bg-learn-bg px-4 py-2.5 font-medium text-primary" href="/play/snap/snap.html" target="_blank" rel="noopener"><Code2 className="h-5 w-5" />Block Coding Studio</a>
            <a className="inline-flex items-center gap-2 rounded-lg bg-explore-bg px-4 py-2.5 font-medium text-primary" href="/play/musicblocks/index.html" target="_blank" rel="noopener"><Music className="h-5 w-5" />Music Coding</a></div></section>
        <Skills l={l} only={["AI Literacy", "Problem Solving", "Digital Citizenship"]} />
      </div>
    </div>
  );
}

/** 6-8 — Build (and University): structured learning, the full path, assignments, projects and skills. */
function BuildHome({ l, first, uni }: { l: Learner; first: string; uni: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PreviewBar l={l} />
      <div className="mb-6"><h1 className="text-[36px] leading-tight md:text-[44px]">Welcome back, {l.preview ? "learner" : first}</h1><LearnerLine l={l} /><Stats l={l} /></div>
      <div className="mb-5"><PathCard l={l} /></div>
      <Cards uni={uni} />
      <hr className="my-6 border-border" />
      <LowerHalf l={l} forGroup={l.level || "you"} />
      <div className="mt-4"><Skills l={l} /></div>
    </div>
  );
}

/** 9-12 — Launch: advanced path, portfolio, pathways (honestly marked where content is not there yet). */
function LaunchHome({ l, first }: { l: Learner; first: string }) {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PreviewBar l={l} />
      <div className="mb-6"><h1 className="text-[36px] leading-tight md:text-[44px]">Welcome back, {l.preview ? "learner" : first}</h1><LearnerLine l={l} /><Stats l={l} /></div>
      <div className="mb-5"><PathCard l={l} title="Your Pathway" /></div>
      <Cards />
      <hr className="my-6 border-border" />
      <LowerHalf l={l} forGroup={l.level} projectsLabel="Portfolio" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Skills l={l} />
        <section aria-label="Pathways" className="rounded-xl border border-border bg-white p-5 card-soft"><h2 className="text-[20px]">Pathways</h2>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />Careers in AI and technology <Pill tone="gray" className="text-[10px]">Soon</Pill></li>
            <li className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" />University preparation <Pill tone="gray" className="text-[10px]">Soon</Pill></li>
            <li className="flex items-center gap-2"><Award className="h-4 w-4 text-primary" />Certificates <Pill tone="gray" className="text-[10px]">Soon</Pill></li>
          </ul></section>
      </div>
    </div>
  );
}

export function StudentHomeView({ l }: { l: Learner }) {
  const user = useUser();
  const { edition } = useBrand();
  const first = user.name.split(" ")[0];
  switch (l.band?.id) {
    case "discover": return <Discover l={l} first={first} />;
    case "explore": return <ExploreHome l={l} first={first} />;
    case "launch": return <LaunchHome l={l} first={first} />;
    default: return <BuildHome l={l} first={first} uni={edition.id === "university"} />;
  }
}

export default function StudentHome() {
  const l = useLearner();
  return l.data ? <StudentHomeView l={l.data} /> : <div className="p-2"><Skeleton className="h-12 w-80" /><Skeleton className="mt-6 h-40 w-full" /></div>;
}

/** Staff: /preview/:band shows a learner experience ("View as K–2 | 3–5 | 6–8 | 9–12"). */
export function PreviewHome() {
  const band = useParams().band;
  const l = useLearner(band);
  return <><div className="mb-4"><ViewAs /></div>{l.data ? <StudentHomeView l={l.data} /> : <Skeleton className="h-40 w-full" />}</>;
}

/** The "View as" switch for the Teacher Center (K-12 only). */
export function ViewAs() {
  const { edition } = useBrand();
  const bands = Object.entries(edition.bands ?? {});
  if (!bands.length) return null;
  return (
    <nav aria-label="View as a learner" className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">View as:</span>
      {bands.map(([id, b]) => <Link key={id} to={`/preview/${id}`} className="press rounded-full border border-border bg-white px-3 py-1 font-medium text-primary hover:bg-accent">{b.name} {b.grades}</Link>)}
    </nav>
  );
}
