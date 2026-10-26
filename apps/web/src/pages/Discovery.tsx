/** Discovery Lab: the third learning environment beside K-12 and University (docs/discovery-lab). A lab to explore on your
 *  own: no class, no teacher, no grades. Home (search, labs, continue, journeys), a lab's page and a journey's page. The
 *  experiment page is pages/DiscoveryExperiment.tsx. */
import { ArrowRight, Compass, Route as RouteIcon, Sparkles } from "lucide-react";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { Pill } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { stagger, useFirstVisit } from "@/lib/motion";
import { useUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import type { Catalog, Experience, Lab } from "@/discovery/engine.ts";
import { experienceOf, expPath, LabIcon, labOf, readRecent, tint, useCatalog, working } from "@/discovery/ui/data";
import { search, type Doc } from "@/discovery/search.ts";
import { hrefFor, SearchBox } from "@/discovery/ui/SearchBox";

const TRY = ["gravity", "circuits", "the Moon", "sorting", "climate"];

function Loading() {
  return <div className="space-y-4"><Skeleton className="h-40 w-full" /><div className="grid grid-cols-2 gap-4 md:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-36" />)}</div></div>;
}
function Failed() {
  return <p className="rounded-xl border border-border bg-white p-6 text-center text-muted-foreground">Discovery Lab could not load its list of experiments. Check the connection to the school server and try again.</p>;
}

/** One experiment as a card. Planned ones are shown honestly and do not open. */
export function ExperienceCard({ e, lab, style, className }: { e: Experience; lab: Lab; style?: React.CSSProperties; className?: string }) {
  const ready = e.status === "working";
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: tint(lab.color, 0.14), color: lab.color }}><LabIcon lab={lab} className="h-5 w-5" /></span>
        <Pill tone={ready ? "green" : "gray"}>{ready ? "Ready" : "Planned"}</Pill>
      </div>
      <h3 className="mt-3 text-[18px] leading-snug">{e.title}</h3>
      <p className="mt-1 text-[14px] leading-snug text-[#3c4656]">{e.summary}</p>
      <p className="mt-auto pt-3 text-[12.5px] text-muted-foreground">{lab.name} · ages {e.ages}{e.modality === "3d" ? " · 3D" : ""}</p>
    </>
  );
  const cls = cn("flex min-h-[200px] flex-col rounded-[14px] border border-border bg-white p-4 card-soft", className);
  return ready ? <Link to={expPath(e)} style={style} className={cn(cls, "card-press")}>{body}</Link>
    : <div style={style} className={cn(cls, "opacity-75")} aria-label={`${e.title}, planned, not ready yet`}>{body}</div>;
}

function LabCard({ c, lab, i, first }: { c: Catalog; lab: Lab; i: number; first: boolean }) {
  const all = c.experiences.filter((e) => e.labId === lab.id), ready = all.filter((e) => e.status === "working").length;
  return (
    <Link to={`/discover/${lab.id}`} style={first ? stagger(i) : undefined} className={cn("card-press flex min-h-[170px] flex-col rounded-[14px] border border-border bg-white p-4 card-soft", first && "rise-in")}
      aria-label={`${lab.name}: ${ready} ready, ${all.length - ready} planned`}>
      <span className="grid h-12 w-12 place-items-center rounded-full" style={{ background: tint(lab.color, 0.14), color: lab.color }}><LabIcon lab={lab} className="h-6 w-6" /></span>
      <h3 className="mt-3 text-[18px]">{lab.name}</h3>
      <p className="mt-1 line-clamp-2 text-[13.5px] leading-snug text-[#3c4656]">{lab.blurb}</p>
      <p className="mt-auto pt-3 text-[12.5px] text-muted-foreground"><span className="font-medium text-primary">{ready} ready</span>{all.length > ready && ` · ${all.length - ready} planned`}</p>
    </Link>
  );
}

export function DiscoveryHome() {
  const { data: c, isLoading, error } = useCatalog();
  const user = useUser();
  const first = useFirstVisit();
  if (isLoading) return <Loading />;
  if (error || !c) return <Failed />;
  const recent = readRecent(user.id).map((id) => experienceOf(c, id)).filter((e): e is Experience => !!e && e.status === "working");
  const ready = working(c);
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[20px] border border-border bg-white px-5 py-10 text-center card-soft md:px-10 md:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.5]" style={{ background: "radial-gradient(600px 220px at 15% 0%, var(--accent), transparent 70%), radial-gradient(500px 220px at 90% 100%, #fdf1d6, transparent 70%)" }} />
        <div className="relative">
          <p className="eyebrow">Discovery Lab · {c.labs.length} labs · {ready.length} experiments ready</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance text-[32px] leading-tight md:text-[46px]">What would you like to explore?</h1>
          <p className="mx-auto mt-3 max-w-2xl text-balance text-[16px] text-muted-foreground">Pick a lab or search for an idea. Change the numbers, press Play, and see what happens. No grades and no tests: just you and the experiment.</p>
          <SearchBox big className="mx-auto mt-7 max-w-2xl" autoFocus={false} />
          <p className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[13px] text-muted-foreground">Try:
            {TRY.map((t) => <Link key={t} to={`/discover/search?q=${encodeURIComponent(t)}`} className="rounded-full border border-border bg-white px-3 py-1 text-primary press hover:bg-accent">{t}</Link>)}</p>
        </div>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="dl-continue">
          <h2 id="dl-continue" className="text-[22px]">Continue exploring</h2>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {recent.map((e) => { const lab = labOf(c, e.labId)!; return (
              <Link key={e.id} to={expPath(e)} className="card-press flex min-w-[240px] items-center gap-3 rounded-xl border border-border bg-white p-3.5 card-soft">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: tint(lab.color, 0.14), color: lab.color }}><LabIcon lab={lab} className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block truncate font-medium text-primary">{e.title}</span><span className="block text-[12.5px] text-muted-foreground">{lab.name}</span></span>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>); })}
          </div>
        </section>
      )}

      <section aria-labelledby="dl-labs">
        <div className="flex items-baseline justify-between gap-3"><h2 id="dl-labs" className="text-[22px]">The labs</h2><span className="text-sm text-muted-foreground">{c.labs.length} labs</span></div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {c.labs.map((lab, i) => <LabCard key={lab.id} c={c} lab={lab} i={i} first={first} />)}
        </div>
      </section>

      <section aria-labelledby="dl-ready">
        <h2 id="dl-ready" className="flex items-center gap-2 text-[22px]"><Sparkles className="h-5 w-5 text-[var(--brand-accent)]" />Ready to try</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ready.map((e) => <ExperienceCard key={e.id} e={e} lab={labOf(c, e.labId)!} />)}
        </div>
      </section>

      <section aria-labelledby="dl-journeys">
        <h2 id="dl-journeys" className="flex items-center gap-2 text-[22px]"><RouteIcon className="h-5 w-5 text-primary" />Journeys</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">A few experiments in a row that tell one story.</p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {c.journeys.map((j) => (
            <Link key={j.id} to={`/discover/journey/${j.id}`} className="card-press rounded-[14px] border border-border bg-white p-5 card-soft">
              <h3 className="text-[19px]">{j.title}</h3>
              <p className="mt-1 text-[14px] text-[#3c4656]">{j.summary}</p>
              <ol className="mt-3 space-y-1 text-[13.5px] text-muted-foreground">{j.steps.map((s, k) => <li key={s}>{k + 1}. {experienceOf(c, s)?.title ?? s}</li>)}</ol>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Search results as a page (the "Try" chips and pressing Enter with nothing highlighted land here). */
export function DiscoverySearch() {
  const { data: c, index, isLoading } = useCatalog();
  const [sp] = useSearchParams();
  const q = sp.get("q") ?? "";
  if (isLoading || !c) return <Loading />;
  return <SearchResults c={c} q={q} index={index} />;
}
function SearchResults({ c, q, index }: { c: Catalog; q: string; index: Doc[] }) {
  const hits = search(index, q, 30);
  return (
    <div className="mx-auto max-w-3xl">
      <SearchBox big className="mb-6" />
      <h1 className="text-[28px]">Results for “{q}”</h1>
      {hits.length === 0 ? <p className="mt-4 text-muted-foreground">Nothing matches yet. Try a simpler word, or <Link className="text-primary underline" to="/discover">browse the labs</Link>.</p> : (
        <ul className="mt-4 divide-y divide-border rounded-xl border border-border bg-white card-soft">
          {hits.map((h) => { const lab = labOf(c, h.doc.labId); return (
            <li key={`${h.doc.kind}-${h.doc.id}`}><Link to={hrefFor(h.doc)} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50">
              {lab ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: tint(lab.color, 0.14), color: lab.color }}><LabIcon lab={lab} className="h-[18px] w-[18px]" /></span>
                : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-primary"><RouteIcon className="h-[18px] w-[18px]" /></span>}
              <span className="min-w-0 flex-1"><span className="block font-medium text-primary">{h.doc.title}</span><span className="block truncate text-[13px] text-muted-foreground">{h.doc.detail}</span></span>
              {h.doc.kind === "experience" && <Pill tone={h.doc.status === "working" ? "green" : "gray"}>{h.doc.status === "working" ? "Ready" : "Planned"}</Pill>}
            </Link></li>); })}
        </ul>
      )}
    </div>
  );
}

export function DiscoveryLabPage() {
  const { labId = "" } = useParams();
  const [sp, setSp] = useSearchParams();
  const { data: c, isLoading, error } = useCatalog();
  if (isLoading) return <Loading />;
  if (error || !c) return <Failed />;
  const lab = labOf(c, labId);
  if (!lab) return <Navigate to="/discover" replace />;
  const topic = sp.get("topic"), col = sp.get("collection");
  const all = c.experiences.filter((e) => e.labId === lab.id);
  const shown = all.filter((e) => (!col || e.collectionId === col) && (!topic || e.topicId === topic))
    .sort((a, b) => Number(b.status === "working") - Number(a.status === "working"));
  const topicName = topic && lab.collections.flatMap((x) => x.topics).find((t) => t.id === topic)?.name;
  const chip = (active: boolean) => cn("shrink-0 rounded-full border px-3.5 py-1.5 text-[13.5px] press", active ? "border-primary bg-primary text-white" : "border-border bg-white text-primary hover:bg-accent");
  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-[13.5px] text-muted-foreground"><Link to="/discover" className="hover:text-primary">Discovery Lab</Link> <span aria-hidden="true">/</span> <span className="text-primary">{lab.name}</span></nav>
      <header className="flex flex-col items-start gap-4 rounded-[18px] border border-border p-5 md:flex-row md:items-center md:p-7" style={{ background: tint(lab.color, 0.07) }}>
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white" style={{ color: lab.color }}><LabIcon lab={lab} className="h-8 w-8" /></span>
        <div className="min-w-0">
          <h1 className="text-[30px] leading-tight md:text-[38px]">{lab.name}</h1>
          <p className="mt-1 max-w-2xl text-[15.5px] text-[#3c4656]">{lab.blurb}</p>
          <p className="mt-2 text-[13px] text-muted-foreground">{working(c, lab.id).length} ready · {all.length - working(c, lab.id).length} planned · {lab.collections.reduce((n, x) => n + x.topics.length, 0)} topics</p>
        </div>
      </header>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Collections">
        <button className={chip(!col && !topic)} onClick={() => setSp({})} aria-pressed={!col && !topic}>All</button>
        {lab.collections.map((x) => <button key={x.id} className={chip(col === x.id)} aria-pressed={col === x.id} onClick={() => setSp({ collection: x.id })}>{x.name}</button>)}
      </div>
      {topicName && <p className="mt-3 text-[14px] text-muted-foreground">Showing the topic <strong className="text-primary">{topicName}</strong>. <button className="text-primary underline" onClick={() => setSp({})}>Show everything</button></p>}
      {shown.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map((e) => <ExperienceCard key={e.id} e={e} lab={lab} />)}</div>
      ) : <p className="mt-5 rounded-xl border border-dashed border-border bg-white/60 p-6 text-center text-muted-foreground">No experiment for this yet. It is on the list for a later version.</p>}
      <section aria-labelledby="dl-topics" className="mt-10">
        <h2 id="dl-topics" className="flex items-center gap-2 text-[20px]"><Compass className="h-5 w-5" />Topics in {lab.name}</h2>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lab.collections.map((x) => (
            <div key={x.id} className="rounded-xl border border-border bg-white p-4 card-soft">
              <h3 className="text-[16px]">{x.name}</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {x.topics.map((t) => { const has = all.some((e) => e.topicId === t.id && e.status === "working"); return (
                  <li key={t.id}><button onClick={() => setSp({ topic: t.id })} className={cn("rounded-full px-2.5 py-1 text-[12.5px] press", has ? "bg-[var(--pill-green)] text-[var(--pill-green-fg)]" : "bg-muted text-muted-foreground")}>{t.name}</button></li>); })}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-muted-foreground">Green topics have an experiment you can try now.</p>
      </section>
    </div>
  );
}

export function DiscoveryJourney() {
  const { id = "" } = useParams();
  const { data: c, isLoading, error } = useCatalog();
  if (isLoading) return <Loading />;
  if (error || !c) return <Failed />;
  const j = c.journeys.find((x) => x.id === id);
  if (!j) return <Navigate to="/discover" replace />;
  return (
    <div className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-[13.5px] text-muted-foreground"><Link to="/discover" className="hover:text-primary">Discovery Lab</Link> <span aria-hidden="true">/</span> <span className="text-primary">Journeys</span></nav>
      <p className="eyebrow">Journey · {j.steps.length} experiments</p>
      <h1 className="mt-2 text-[32px] leading-tight md:text-[40px]">{j.title}</h1>
      <p className="mt-2 text-[16px] text-muted-foreground">{j.summary}</p>
      <ol className="relative mt-8 space-y-4 border-l-2 border-dashed border-border pl-6">
        {j.steps.map((s, k) => { const e = experienceOf(c, s); const lab = e && labOf(c, e.labId); if (!e || !lab) return null; return (
          <li key={s} className="relative">
            <span className="absolute -left-[39px] top-4 grid h-7 w-7 place-items-center rounded-full bg-primary text-[13px] font-semibold text-white">{k + 1}</span>
            <ExperienceCard e={e} lab={lab} className="min-h-0" />
          </li>); })}
      </ol>
    </div>
  );
}
