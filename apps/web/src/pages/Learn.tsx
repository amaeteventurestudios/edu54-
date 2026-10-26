import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, FileText, GraduationCap, Pencil, Layers } from "lucide-react";
import { lazy, Suspense } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ACCENT, ArrowButton, Bar, Empty, IconBadge, PageHeader, Pill, type Accent } from "@/components/common";
import { CourseIllustration } from "@/components/Illustration";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Course } from "@/lib/api";
import { dueLabel } from "@/lib/format";
import { useContinue, useCourses } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { get, type AssignedItem } from "@/lib/api";
import { bandOf, contentBands, courseFits, sayAloud } from "@/lib/bands";
import { useUser } from "@/lib/session";
import { ownCourses, productName } from "@/lib/brand";
import { GradeSubjects, useK12 } from "@/features/GradeCourses";
import { BookOpenText, Calculator, Sparkles, Volume2 } from "lucide-react";

const Practice = lazy(() => import("@/pages/Revision"));

const COURSE_ACCENT: Record<string, Accent> = { green: "learn", blue: "ask", amber: "build" };
// The reference tints: Python = blue, AI = green, Science = amber.
const COURSE_TINT: Record<string, Accent> = { python: "ask", sparkles: "learn", flask: "build" };

export function CourseCard({ c }: { c: Course }) {
  const nav = useNavigate();
  const a = ACCENT[COURSE_TINT[c.icon] ?? COURSE_ACCENT[c.accent] ?? "ask"];
  const openable = c.next?.available;
  return (
    <article className={`flex flex-col rounded-[14px] border border-border p-3 card-soft ${a.bg}`}>
      <div className={`h-24 overflow-hidden rounded-lg ${a.icon}`}><CourseIllustration kind={c.icon} /></div>
      <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
        <h3 className="text-[22px]">{c.title}</h3>
        <p className="mt-1 min-h-[3.6em] text-[15px] leading-snug text-[#3c4656]">{c.description}</p>
        <p className="mt-4 text-sm font-medium text-primary">{c.percent}% complete</p>
        <div className="mt-1.5 flex items-center gap-4">
          <Bar value={c.percent} label={`${c.title} progress`} className="flex-1" />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-[#3c4656]">{c.next ? `Next: ${c.next.title}` : "All lessons complete"}</span>
          {openable
            ? <button onClick={() => nav(`/learn/lessons/${c.next!.id}`)} aria-label={`Open ${c.next!.title}`}><ArrowButton className={a.icon} /></button>
            : c.next && <Pill tone="gray" className="shrink-0">Coming soon</Pill>}
        </div>
      </div>
    </article>
  );
}

function AssignedBanner({ item }: { item?: AssignedItem }) {
  return (
    <section className="mt-6 flex flex-wrap items-center gap-5 rounded-xl border border-border bg-white p-5 card-soft" aria-label="Assigned work">
      <IconBadge className="bg-explore-icon"><FileText className="h-6 w-6" strokeWidth={1.5} /></IconBadge>
      <div><h2 className="text-[22px]">Assigned Work</h2><p className="text-[15px] text-muted-foreground">Tasks from your teachers and courses.</p></div>
      {item ? (
        <>
          <div className="ml-4 border-l border-border pl-6"><p className="font-medium text-primary">{item.title}</p><p className="text-sm text-muted-foreground">Assigned by Ms. Williams</p><p className="text-sm text-muted-foreground">{dueLabel(item.due_at)}</p></div>
          <Button asChild className="ml-auto h-11 px-5"><Link to={`/assignments/${item.id}`}>{item.state === "not_started" ? "Start Assignment" : "Open Assignment"} <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </>
      ) : <p className="ml-4 text-muted-foreground">Nothing assigned right now.</p>}
    </section>
  );
}

const TABS = [
  { v: "continue", label: "Continue", icon: BookOpen }, { v: "courses", label: "Courses", icon: Layers }, { v: "assigned", label: "Assigned", icon: FileText },
  { v: "homework", label: "Homework", icon: Pencil }, { v: "practice", label: "Practice", icon: GraduationCap }, { v: "completed", label: "Completed", icon: CheckCircle2 },
];

export default function Learn() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.v === params.get("tab")) ? params.get("tab")! : "continue";
  const setTab = (v: string) => setParams(v === "continue" ? {} : { tab: v }, { replace: true });
  const user = useUser();
  const band = bandOf(user);
  const courses = useCourses();
  const k12 = useK12();
  const cont = useContinue();
  const all = useQuery({ queryKey: ["assignments"], queryFn: () => get<{ assignments: (AssignedItem & { score: number | null; max_score: number })[] }>("/api/assignments") });
  const list = all.data?.assignments ?? [];
  if (band === "discover") return <DiscoverLearn />;

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title="Learn" subtitle="Your courses, assignments, homework and practice, all in one place." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-6 h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-border bg-transparent p-0">
          {TABS.map(({ v, label, icon: I }) => (
            <TabsTrigger key={v} value={v} className="h-12 flex-1 rounded-none border-0 border-b-2 border-transparent px-4 py-3 text-[15px] text-muted-foreground shadow-none data-[state=active]:!border-b-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
              <I className="mr-2 h-[18px] w-[18px]" strokeWidth={1.6} />{label}
            </TabsTrigger>
          ))}
        </TabsList>
      <TabsContent value={tab} className="outline-none">

      {(tab === "continue" || tab === "courses") && (
        <>
          {(user.grade != null || productName() === "Umanah AI Lab") && <div className="mb-8 empty:hidden"><GradeSubjects map={k12.data?.grades[0]} /></div>}
          <h2 className="mb-4 text-[24px]">{ownCourses()}</h2>
          {tab === "continue" && <div className="mb-4 flex items-center justify-between"><h2 className="text-[26px]">Continue Learning</h2><button onClick={() => setTab("courses")} className="flex items-center gap-1.5 text-sm text-primary hover:underline">View all courses <ArrowRight className="h-4 w-4" /></button></div>}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {courses.data ? courses.data.courses.filter((c) => courseFits(c.id, contentBands(user))).map((c) => <CourseCard key={c.id} c={c} />) : [0, 1, 2].map((i) => <Skeleton key={i} className="h-[340px] rounded-xl" />)}
          </div>
          {tab === "continue" && <AssignedBanner item={cont.data?.assigned[0]} />}
        </>
      )}
      {(tab === "assigned" || tab === "homework") && (
        <div className="space-y-3">
          {list.length === 0 && <Empty title="Nothing assigned right now" />}
          {list.map((a) => (
            <Link key={a.id} to={`/assignments/${a.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4 card-soft hover:shadow-md">
              <IconBadge className="h-11 w-11 bg-explore-icon"><ClipboardList className="h-5 w-5" /></IconBadge>
              <div className="min-w-0 flex-1"><p className="font-medium text-primary">{a.title}</p><p className="text-sm text-muted-foreground">{a.subject} · {dueLabel(a.due_at)}</p></div>
              <Pill tone={a.state === "returned" ? "green" : a.state === "submitted" ? "blue" : a.state === "draft" ? "amber" : "gray"}>
                {a.state === "returned" ? `Graded${a.score != null ? ` · ${a.score}/${a.max_score}` : ""}` : a.state === "submitted" ? "Submitted" : a.state === "draft" ? "In progress" : "Not started"}
              </Pill>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
      {tab === "practice" && <Suspense fallback={<Skeleton className="h-64 w-full" />}><Practice embedded /></Suspense>}
      {tab === "completed" && (
        <div className="space-y-3">
          {(courses.data?.courses ?? []).filter((c) => c.lessons_done > 0).map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4"><CheckCircle2 className="h-5 w-5 text-okay" /><p className="flex-1 font-medium text-primary">{c.title}</p><span className="text-sm text-muted-foreground">{c.lessons_done} of {c.lessons_total} lessons completed</span></div>
          ))}
        </div>
      )}
      </TabsContent>
      </Tabs>
    </div>
  );
}

/** K-2 (Discover): no course names, just picture books and play, each read aloud on request. */
function DiscoverLearn() {
  const nav = useNavigate();
  const lib = useQuery({ queryKey: ["library-channels"], queryFn: () => get<{ channels: { id: string; title: string }[] }>("/api/library/channels") });
  const books = lib.data?.channels.find((c) => /storybook/i.test(c.title));
  const map = useK12().data?.grades[0];
  const read = map?.subjects.find((s) => s.subject === "Reading");
  const math = map?.subjects.find((s) => s.subject === "Math");
  const tiles = [
    { id: "books", label: "Picture books", say: "Picture books. Stories to read and listen to.", icon: <BookOpenText className="h-14 w-14" strokeWidth={1.3} />, go: () => nav(read ? `/explore?cat=library&at=${read.node}` : books ? `/explore?cat=library&at=${books.id}` : "/explore?cat=library"), tint: "bg-[#e9f5ec]" },
    { id: "numbers", label: "Numbers", say: "Numbers. Counting and math videos.", icon: <Calculator className="h-14 w-14" strokeWidth={1.3} />, go: () => nav(math ? `/explore?cat=library&at=${math.node}` : "/explore?cat=library"), tint: "bg-[#eaf1fb]" },
    { id: "play", label: "Learning games", say: "Learning games. Make music and solve puzzles.", icon: <Sparkles className="h-14 w-14" strokeWidth={1.3} />, go: () => nav("/build"), tint: "bg-[#fbf1e2]" },
  ];
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <h1 className="mb-6 text-center text-[40px] md:text-left">Read</h1>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.id} className={`relative rounded-[24px] border border-border card-soft ${t.tint}`}>
            <button onClick={t.go} onMouseEnter={() => sayAloud(t.say)} className="flex min-h-[230px] w-full flex-col items-center justify-center gap-4 p-6 text-primary">{t.icon}<span className="font-serif text-[30px]">{t.label}</span></button>
            <button onClick={() => sayAloud(t.say)} aria-label={`Read aloud: ${t.label}`} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/80 text-primary hover:bg-white"><Volume2 className="h-5 w-5" /></button>
          </div>))}
      </div>
    </div>
  );
}
