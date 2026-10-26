import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, Cpu, FileText, FlaskConical, Landmark, Library, MessageSquare, Search, Settings2, Users } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { get } from "@/lib/api";
import { useUser } from "@/lib/session";
import { LibraryBrowser } from "@/features/LibraryBrowser";
import { LocalDocuments, TeacherShelves } from "@/features/Documents";
import { cn } from "@/lib/utils";

interface Hit { title: string; snippet: string; path: string; source?: { name: string; license: string } }
interface Res { query?: string; results: Hit[]; support?: string; unavailable?: boolean; source: { name: string; license: string; note: string } }

// Categories that read from the offline encyclopedia are live; the rest say so plainly.
const CATS: { id: string; label: string; icon: ReactNode; tint: string; live: boolean }[] = [
  { id: "library", label: "School Library", icon: <BookOpen />, tint: "bg-[#eaf1fb]", live: true },
  { id: "textbooks", label: "Textbooks", icon: <Library />, tint: "bg-[#f4f7f3]", live: true },
  { id: "science", label: "Science", icon: <FlaskConical />, tint: "bg-[#e9f5ec]", live: true },
  { id: "engineering", label: "Engineering", icon: <Settings2 />, tint: "bg-[#fbf1e2]", live: true },
  { id: "ai", label: "AI & Computing", icon: <Cpu />, tint: "bg-[#efedfb]", live: true },
  { id: "history", label: "History", icon: <Landmark />, tint: "bg-[#fbeaea]", live: true },
  { id: "teachers", label: "Teacher Resources", icon: <Users />, tint: "bg-[#eaeefb]", live: true },
  { id: "docs", label: "Local Documents", icon: <FileText />, tint: "bg-[#e9f5ec]", live: true },
];

// "Articles are from A (license) and B (license)." for the books the shown results come from.
const credits = (hits: Hit[]) => {
  const seen = [...new Map(hits.filter((h) => h.source).map((h) => [h.source!.name, h.source!])).values()];
  return seen.length ? `Articles are from ${seen.map((b) => `${b.name} (${b.license})`).join(", ")}.` : "";
};

interface Book { id: string; title: string; license: string; attribution: string }

/** Open textbooks from the device's license-checked catalog, read in the browser's own PDF viewer. */
function Textbooks({ books, open, go }: { books: Book[]; open: string | null; go: (o: Record<string, string | null>) => void }) {
  const cur = books.find((b) => b.id === open) ?? books[0];
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
      <section aria-label="Textbooks" className="rounded-xl border border-border bg-white p-4 card-soft">
        <h2 className="mb-2 text-[22px]">Textbooks</h2>
        <ul className="divide-y divide-border">{books.map((b) => (
          <li key={b.id}><button onClick={() => go({ open: b.id })} aria-current={cur?.id === b.id} className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-[#f4f6fb]", cur?.id === b.id && "bg-[#e9eff8]")}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e5f0e7] text-primary"><BookOpen className="h-4 w-4" /></span>
            <span className="font-serif text-[16px] text-primary">{b.title}</span></button></li>))}</ul>
        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">Open textbooks stored on this device. Credits are on each book's first pages and on the <a className="underline" href="/attributions" target="_blank" rel="noopener">Attributions</a> page.</p>
      </section>
      <section aria-label="Reader" className="flex min-h-[640px] flex-col overflow-hidden rounded-xl border border-border bg-white card-soft">
        {cur && <><div className="border-b border-border px-4 py-3"><p className="font-serif text-[18px] text-primary">{cur.title}</p><p className="text-xs text-muted-foreground">{cur.attribution} ({cur.license.replace(/-/g, " ")})</p></div>
          <iframe key={cur.id} title={cur.title} src={`/api/explore/textbooks/${cur.id}.pdf`} className="min-h-[600px] w-full flex-1" /></>}
      </section>
    </div>
  );
}

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const isStudent = useUser().role === "student";
  const q = params.get("q") ?? "";
  const cat = params.get("cat") ?? (q ? "" : "science");
  const open = params.get("open");
  const [text, setText] = useState(q);
  const soon = params.get("soon");

  const search = useQuery({ queryKey: ["explore-search", q], queryFn: () => get<Res>(`/api/explore/search?q=${encodeURIComponent(q)}`), enabled: !!q });
  const books = useQuery({ queryKey: ["textbooks"], queryFn: () => get<{ items: Book[] }>("/api/explore/textbooks"), staleTime: 60_000 });
  const hasBooks = (books.data?.items.length ?? 0) > 0;
  const cats = CATS.filter((c) => (c.id !== "textbooks" || hasBooks) && !(isStudent && c.id === "teachers"));
  const featured = useQuery({ queryKey: ["explore-featured", cat], queryFn: () => get<Res>(`/api/explore/featured?category=${cat}`), enabled: !q && ["science", "engineering", "ai", "history"].includes(cat) });
  const res = q ? search.data : featured.data;
  const loading = q ? search.isLoading : featured.isLoading;
  const title = q ? `Results for “${q}”` : `Featured in ${CATS.find((c) => c.id === cat)?.label ?? "Science"}`;
  const set = (o: Record<string, string | null>) => { const n = new URLSearchParams(params); for (const [k, v] of Object.entries(o)) v === null ? n.delete(k) : n.set(k, v); setParams(n); };
  const active = open ?? res?.results[0]?.path;                      // the reader shows the first result until one is picked
  const current = res?.results.find((r) => r.path === active);
  const tidy = (title: string, snippet: string) => (snippet.startsWith(title) ? snippet.slice(title.length).trim() : snippet);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title="Explore" subtitle="Find trusted resources, read, and get AI assistance using your local library." />
      <form role="search" className="relative mb-5 max-w-3xl" onSubmit={(e) => { e.preventDefault(); if (text.trim()) set({ q: text.trim(), cat: null, open: null, soon: null }); }}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input aria-label="Search the library" value={text} onChange={(e) => setText(e.target.value)} placeholder="Search the offline library: planets, photosynthesis, fractions, philosophy…" className="h-12 w-full rounded-xl border border-input bg-white pl-10 pr-28 text-[15px]" />
        <Button type="submit" className="absolute right-1.5 top-1.5 h-9">Search</Button>
      </form>

      <ul className={cn("mb-6 grid grid-cols-2 gap-3 md:grid-cols-4", ({ 6: "xl:grid-cols-6", 7: "xl:grid-cols-7" } as Record<number, string>)[cats.length] ?? "xl:grid-cols-8")} aria-label="Categories">
        {cats.map((c) => (
          <li key={c.id} className="max-sm:last:col-span-2"><button onClick={() => (c.live ? (setText(""), set({ cat: c.id, q: null, open: null, at: null, soon: null })) : set({ soon: c.id }))} aria-pressed={!q && cat === c.id}
            className={cn("relative flex h-full min-h-[118px] w-full flex-col items-center justify-between rounded-xl border p-3.5 text-center card-press md:items-start md:text-left", c.tint, !q && cat === c.id ? "border-primary/50 ring-1 ring-primary/30" : "border-border")}>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/80 text-primary [&>svg]:h-5 [&>svg]:w-5">{c.icon}</span>
            <span className="mt-2 flex w-full items-end justify-center gap-2 font-serif md:justify-between text-[16px] leading-tight text-primary">{c.label}{c.live && <ArrowRight className="h-4 w-4 shrink-0" />}</span>
            {!c.live && <Pill tone="gray" className="mt-1 text-[11px] md:absolute md:right-2.5 md:top-2.5 md:mt-0">Coming soon</Pill>}
          </button></li>))}
      </ul>
      {soon && <p role="status" className="mb-4 rounded-lg bg-[#eef1f8] px-4 py-3 text-sm text-[#374151]">{CATS.find((c) => c.id === soon)?.label} is coming soon. Your school will be able to add its own books, handouts and documents here.</p>}

      {!q && cat === "textbooks" && hasBooks ? <Textbooks books={books.data!.items} open={open} go={(o) => set(o)} />
        : !q && cat === "docs" ? <LocalDocuments open={open} go={(id) => set({ open: id })} />
        : !q && cat === "teachers" && !isStudent ? <section aria-label="Teacher resources"><h2 className="mb-3 text-[24px]">Teacher Resources</h2><TeacherShelves /></section>
        : !q && cat === "library" ? <LibraryBrowser at={params.get("at")} open={open} go={(o) => set(o)} isStudent={isStudent} /> : (
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section aria-label="Resources" className="rounded-xl border border-border bg-white p-4 card-soft">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-[22px]">{title}</h2>{q && <button className="text-sm text-primary hover:underline" onClick={() => { setText(""); set({ q: null, cat: "science", open: null }); }}>Clear</button>}</div>
          {loading && <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>}
          {res?.support && <div role="alert" className="whitespace-pre-line rounded-lg bg-[#eef1f8] p-4 text-[15px] text-[#1f2937]">{res.support}</div>}
          {res?.unavailable && <p className="rounded-lg bg-[#fbf3e2] p-4 text-sm text-[#5a4210]">The offline encyclopedia isn't available right now. Your lessons and Build still work. Ask your teacher to check Lab Status.</p>}
          {res && !res.unavailable && !res.support && res.results.length === 0 && <p className="p-4 text-[15px] text-muted-foreground">Nothing found for “{q}”. Try a simpler word, like “moon” instead of “lunar satellite”.</p>}
          <ul className="divide-y divide-border">
            {res?.results.map((h) => (
              <li key={h.path}><button onClick={() => set({ open: h.path })} aria-current={active === h.path} className={cn("flex w-full items-start gap-3 rounded-lg px-2 py-3 text-left hover:bg-[#f4f6fb]", active === h.path && "bg-[#e9eff8]")}>
                <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#e4eefc] text-primary"><BookOpen className="h-5 w-5" strokeWidth={1.6} /></span>
                <span className="min-w-0 flex-1"><span className="block font-serif text-[17px] text-primary">{h.title}</span>{h.snippet && <span className="line-clamp-2 text-[14px] text-muted-foreground">{tidy(h.title, h.snippet)}</span>}<span className="mt-1 inline-flex gap-1.5"><Pill tone="green">{h.source?.name ?? "Encyclopedia"}</Pill></span></span>
                <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-primary" />
              </button></li>))}
          </ul>
          {res && <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{credits(res.results) || `Articles are from ${res.source.name}.`} {res.source.note}</p>}
        </section>

        <section aria-label="Reader" className="flex min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-white card-soft">
          {active && current ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e4eefc] text-primary"><FileText className="h-5 w-5" strokeWidth={1.6} /></span><div className="min-w-0"><p className="truncate font-serif text-[18px] text-primary">{current.title}</p><p className="text-xs text-muted-foreground">{current.source ? `${current.source.name} (${current.source.license})` : res?.source.name}</p></div></div>
                <Pill tone="green">Approved Local Material</Pill>
              </div>
              <iframe key={active} title={current.title} src={`/api/explore/library/${active.split("/").map(encodeURIComponent).join("/")}`} sandbox="allow-same-origin" className="min-h-[420px] w-full flex-1 bg-white" />
              <div className="flex items-center justify-between gap-3 border-t border-border bg-[#f3f2fc] px-4 py-3">
                <div className="min-w-0"><p className="font-serif text-[16px] text-primary">Ask about this topic</p><p className="text-xs text-muted-foreground">The tutor can explain it in simpler words.</p></div>
                {isStudent && <Button className="shrink-0" onClick={() => nav(`/ask?q=${encodeURIComponent(`Can you explain ${current.title} in simple words?`)}`)}><MessageSquare className="mr-2 h-4 w-4" />Ask the tutor</Button>}
              </div>
            </>
          ) : (
            <div className="m-auto max-w-sm p-8 text-center"><Library className="mx-auto h-10 w-10 text-primary/60" strokeWidth={1.4} /><p className="mt-3 font-serif text-[20px] text-primary">Pick an article to read it here</p><p className="mt-1 text-sm text-muted-foreground">Everything in this library is stored on your school's device, so it works even when the internet is off.</p></div>
          )}
        </section>
      </div>)}
    </div>
  );
}
