/** EDU54 Workbench (docs/edu54-build): 667 hands-on 3D AI lessons, in their own frame like Discovery Lab. This page frames
 *  and links the lessons; the lessons themselves are plain static pages at /ai-build/lessons/<slug>/ (copied in by
 *  tools/content/sync-edu54-build.sh) that save progress to the learner's account through /api/ai-build/progress.
 *  Routes: /ai-build (tracks, lessons, search) and /ai-build/certificate/:track (a finished track's certificate). */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Award, Box, CheckCircle2, ChevronDown, LogOut, Printer, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Outlet, useLocation, useParams, useSearchParams } from "react-router-dom";
import { Bar, Pill } from "@/components/common";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { DemoBanner } from "@/features/DemoBanner";
import { get, post } from "@/lib/api";
import { useBrand } from "@/lib/brand";
import { homePath, useUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export interface BuildTrack { n: number; slug: string; title: string; group: string; size: number; blurb: string; live: number }
export interface BuildLesson { slug: string; n: number; title: string; track: number; description: string }
interface Catalog { name: string; lessons_live: number; tracks: BuildTrack[]; lessons: BuildLesson[]; done: string[] }
export interface TrackProgress { n: number; slug: string; title: string; group: string; size: number; live: number; done: number; certified: boolean; completed_on: string | null }

/** The lessons' four colour families (the lessons' own look, kept as it is). */
export const GROUP: Record<string, { ink: string; hi: string; soft: string }> = {
  clay: { ink: "#A4462A", hi: "#E3A72F", soft: "#f8ece6" },
  teal: { ink: "#0E6B6B", hi: "#EE7434", soft: "#e4f1f0" },
  plum: { ink: "#5E2A61", hi: "#EE6352", soft: "#f1e8f1" },
  char: { ink: "#2C2D31", hi: "#F2AE0C", soft: "#efeff1" },
};
export const lessonHref = (slug: string) => `/ai-build/lessons/${slug}/`;

const useCatalog = () => useQuery({ queryKey: ["ai-build-catalog"], queryFn: () => get<Catalog>("/api/ai-build/catalog"), staleTime: 30_000 });

export function AiBuildShell() {
  const user = useUser();
  const qc = useQueryClient();
  const { brand, edition } = useBrand();
  const path = useLocation().pathname;
  useEffect(() => { window.scrollTo(0, 0); document.title = `EDU54 Workbench · ${brand.productName}`; }, [path, brand.productName]);
  const back = `Back to ${edition.label ? `${brand.shortName} ${edition.label}` : brand.productName}`;
  async function signOut() { await post("/api/auth/logout"); qc.clear(); window.location.assign("/ai-build"); }
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-white focus:p-2">Skip to content</a>
      <div className="sticky top-0 z-30 print:hidden">
        <DemoBanner />
        <header className="relative bg-sidebar text-white">
          <div className="mx-auto flex h-[62px] max-w-[1400px] items-center gap-3 px-4 md:gap-5 md:px-6">
            <Link to="/ai-build" className="flex shrink-0 items-center gap-2.5" aria-label="EDU54 Workbench home">
              <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--brand-accent)] text-[var(--brand-accent)]"><Box className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
              <span className="font-serif text-[19px] leading-none" style={{ color: "#fff" }}>EDU54 Workbench</span>
            </Link>
            <div className="ml-auto flex items-center gap-1 md:gap-3">
              <Link to={homePath(user)} className="hidden items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13.5px] text-white/85 hover:bg-white/10 hover:text-white sm:flex"><ArrowLeft className="h-4 w-4" />{back}</Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 text-sm hover:bg-white/10" aria-label="Account menu">
                  <Avatar className="h-9 w-9"><AvatarFallback className="bg-white/15 text-sm font-medium text-white">{user.initials}</AvatarFallback></Avatar>
                  <ChevronDown className="h-4 w-4 text-white/70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.name}{user.title ? ` · ${user.title}` : ""}</div>
                  <DropdownMenuItem asChild><Link to={homePath(user)}><ArrowLeft className="mr-2 h-4 w-4" />{back}</Link></DropdownMenuItem>
                  {user.role === "student" && <DropdownMenuItem asChild><Link to="/progress"><Award className="mr-2 h-4 w-4" />My progress and certificates</Link></DropdownMenuItem>}
                  <DropdownMenuItem onSelect={signOut}><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {brand.id === "edu54" && <div className="kl-seam !top-auto !bottom-0 !h-[5px]" aria-hidden="true" />}
        </header>
      </div>
      <main id="main" className="mx-auto w-full min-w-0 max-w-[1400px] flex-1 px-4 py-6 md:px-6 md:py-8"><Outlet /></main>
      <footer className="border-t border-border px-4 py-5 text-center text-[12.5px] text-muted-foreground print:hidden">
        Every lesson runs in your browser from this device and keeps working without the internet. The AI tracks follow the open course AI Engineering from Scratch (MIT License). <Link to="/attributions" reloadDocument className="underline">Credits</Link>
      </footer>
    </div>
  );
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s]/g, " ");

export function AiBuildHome() {
  const { data: c, isLoading, error } = useCatalog();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const done = useMemo(() => new Set(c?.done ?? []), [c]);
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-48 w-full" /><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div></div>;
  if (error || !c) return <p className="rounded-xl border border-border bg-white p-6 text-center text-muted-foreground">EDU54 Workbench could not load its list of lessons. Check the connection to the school server and try again.</p>;
  if (!c.lessons.length) return <p className="rounded-xl border border-border bg-white p-6 text-center text-muted-foreground">The EDU54 Workbench lessons are not installed on this device yet.</p>;

  const trackSlug = params.get("track");
  const track = c.tracks.find((t) => t.slug === trackSlug) ?? c.tracks[0];
  const next = c.lessons.find((l) => !done.has(l.slug)) ?? c.lessons[0];
  const words = norm(q).split(/\s+/).filter(Boolean);
  const hits = words.length ? c.lessons.filter((l) => { const t = norm(`${l.title} ${l.description} ${c.tracks.find((x) => x.n === l.track)?.title ?? ""}`); return words.every((w) => t.includes(w)); }) : null;
  const shown = hits ?? c.lessons.filter((l) => l.track === track.n);
  const pick = (slug: string) => { setQ(""); setParams({ track: slug }); requestAnimationFrame(() => document.getElementById("ab-lessons")?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  const g = GROUP[track.group] ?? GROUP.clay;

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[20px] border border-border bg-white px-5 py-10 text-center card-soft md:px-10 md:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.55]" style={{ background: "radial-gradient(620px 240px at 12% 0%, #f8e6dc, transparent 70%), radial-gradient(520px 240px at 92% 100%, #e1efee, transparent 70%)" }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.35]" style={{ backgroundImage: "radial-gradient(rgba(44,45,49,.18) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative">
          <p className="eyebrow">EDU54 Workbench · {c.lessons_live} lessons · {c.tracks.length} tracks</p>
          <h1 className="mx-auto mt-3 text-balance text-[32px] leading-tight md:text-[48px]">Build AI from scratch. In 3D.</h1>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-[16px] text-muted-foreground">A small machine in every lesson. Turn it to look around, break it on purpose to see what goes wrong, then fix it. Narrated, about ten minutes each, from a single neuron to agents that use tools.</p>
          <div className="mx-auto mt-6 flex max-w-xl flex-col items-center gap-2">
            <p className="text-[14px] font-medium text-primary">{done.size === 0 ? "You haven't started yet." : `You've finished ${done.size} of ${c.lessons_live} lessons.`}</p>
            <Bar value={(100 * done.size) / c.lessons_live} className="h-2.5 max-w-md" label="Lessons finished" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href={lessonHref(next.slug)} className="press inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-medium text-primary-foreground">{done.size ? "Continue" : "Start the first lesson"}: {next.title}<ArrowRight className="h-4 w-4" /></a>
          </div>
          <label className="relative mx-auto mt-6 block max-w-2xl">
            <span className="sr-only">Search the lessons</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => { setQ(e.target.value); }} placeholder={`Search ${c.lessons_live} lessons`} className="h-[52px] w-full rounded-full border border-border bg-white pl-12 pr-5 text-[16px] outline-none focus:ring-2 focus:ring-ring" />
          </label>
        </div>
      </section>

      {!hits && (
        <section aria-labelledby="ab-tracks">
          <h2 id="ab-tracks" className="mb-4 text-center text-[26px]">Twelve tracks</h2>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {c.tracks.map((t) => {
              const tg = GROUP[t.group] ?? GROUP.clay;
              const k = c.lessons.filter((l) => l.track === t.n && done.has(l.slug)).length;
              const on = t.n === track.n;
              return (
                <li key={t.slug}>
                  <button type="button" onClick={() => pick(t.slug)} aria-pressed={on} className={cn("card-press flex h-full w-full flex-col rounded-[14px] border bg-white p-4 text-left card-soft", on ? "border-2" : "border-border")} style={on ? { borderColor: tg.ink } : undefined}>
                    <span className="flex items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[13px] font-semibold text-white" style={{ background: tg.ink }}>{t.n}</span><span className="text-[15px] font-medium leading-tight text-primary sm:text-[17px]">{t.title}</span></span>
                    <span className="mt-2 hidden text-[13.5px] leading-snug text-[#3c4656] sm:block">{t.blurb}</span>
                    <span className="mt-auto pt-3 text-[12.5px] text-muted-foreground">{k ? `${k} of ${t.live} done` : `${t.live} lessons`}</span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-track"><span className="block h-full rounded-full" style={{ width: `${(100 * k) / t.live}%`, background: tg.hi }} /></span>
                  </button>
                </li>);
            })}
          </ul>
        </section>
      )}

      <section id="ab-lessons" aria-labelledby="ab-list" className="scroll-mt-24">
        <div className="mb-4 text-center">
          <h2 id="ab-list" className="text-[26px]">{hits ? `${hits.length} lesson${hits.length === 1 ? "" : "s"} for “${q.trim()}”` : `Track ${track.n}: ${track.title}`}</h2>
          {!hits && <p className="mt-1 text-[14.5px] text-muted-foreground">{track.blurb}{track.n === 12 && " Independent preparation: not affiliated with or endorsed by any exam provider."}</p>}
        </div>
        {shown.length === 0 ? <p className="text-center text-muted-foreground">No lessons match. Try another word.</p> : (
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((l) => {
              const lg = GROUP[c.tracks.find((t) => t.n === l.track)?.group ?? track.group] ?? g;
              const ok = done.has(l.slug);
              return (
                <li key={l.slug}>
                  <a href={lessonHref(l.slug)} className="card-press flex h-full gap-3 rounded-[14px] border border-border bg-white p-4 card-soft">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold" style={{ background: lg.soft, color: lg.ink }}>{ok ? <CheckCircle2 className="h-5 w-5" aria-label="Finished" /> : l.n}</span>
                    <span className="min-w-0">
                      <span className="block text-[16px] font-medium leading-snug text-primary">{l.title}</span>
                      <span className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-[#3c4656]">{l.description}</span>
                      {ok && <Pill tone="green" className="mt-2">Finished</Pill>}
                    </span>
                  </a>
                </li>);
            })}
          </ol>)}
      </section>
    </div>
  );
}

/** A finished track's certificate, under the learner's own name on this school's account. Print or save as PDF. */
export function AiBuildCertificate() {
  const { track } = useParams();
  const user = useUser();
  const { brand } = useBrand();
  const p = useQuery({ queryKey: ["ai-build-progress"], queryFn: () => get<{ name: string; tracks: TrackProgress[] }>("/api/ai-build/progress") });
  if (p.isLoading) return <Skeleton className="mx-auto h-[420px] w-full max-w-3xl" />;
  const t = p.data?.tracks.find((x) => x.slug === track);
  if (!t) return <Navigate to="/ai-build" replace />;
  if (!t.certified) return (
    <div className="mx-auto max-w-xl rounded-xl border border-border bg-white p-6 text-center card-soft">
      <h1 className="text-[26px]">Not finished yet</h1>
      <p className="mt-2 text-muted-foreground">The certificate for {t.title} appears once all {t.size} lessons are finished. You've finished {t.done}.</p>
      <Link to={`/ai-build?track=${t.slug}`} className="mt-4 inline-flex items-center gap-2 text-primary underline">Go to the track<ArrowRight className="h-4 w-4" /></Link>
    </div>);
  const g = GROUP[t.group] ?? GROUP.clay;
  const date = t.completed_on ? new Date(`${t.completed_on}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "";
  return (
    <div className="mx-auto max-w-3xl">
      <article className="relative overflow-hidden rounded-[18px] border-2 bg-white px-6 py-12 text-center card-soft print:border print:shadow-none md:px-14" style={{ borderColor: g.ink }} aria-label="Certificate">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-2" style={{ background: `linear-gradient(90deg, ${g.ink}, ${g.hi})` }} />
        <p className="eyebrow">EDU54 Workbench · certificate of completion</p>
        <p className="mt-6 text-[15px] text-muted-foreground">This is to certify that</p>
        <p className="mt-2 font-serif text-[36px] leading-tight text-primary md:text-[44px]">{p.data?.name || user.name}</p>
        <p className="mt-3 text-[15px] text-muted-foreground">finished every lesson in the track</p>
        <p className="mt-2 text-[26px] font-medium" style={{ color: g.ink }}>Track {t.n}: {t.title}</p>
        <p className="mt-4 text-[14px] text-muted-foreground">{t.size} hands-on 3D lessons{date ? ` · completed ${date}` : ""} · {brand.productName}</p>
        <p className="mx-auto mt-6 max-w-lg text-[12.5px] text-muted-foreground">A record of learning on this school's {brand.productName} account, not a qualification or accreditation.{t.n === 12 ? " Exam prep is independent preparation, not affiliated with or endorsed by any exam provider." : ""}</p>
      </article>
      <div className="mt-5 flex flex-wrap justify-center gap-3 print:hidden">
        <button type="button" onClick={() => window.print()} className="press inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-medium text-primary-foreground"><Printer className="h-4 w-4" />Print or save as PDF</button>
        <Link to="/progress" className="press inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-3 text-[15px] font-medium text-primary">Back to my progress</Link>
      </div>
    </div>
  );
}
