import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, Eye, FolderKanban, Lightbulb, School, SlidersHorizontal, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Bar, Empty, PageHeader, Pill } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { get, patch, type Band, type Level } from "@/lib/api";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { BAND_INFO, BANDS } from "@/lib/bands";
import { dueLabel, nf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { productName, useBrand } from "@/lib/brand";
import { HomeView, type HomeData } from "./Home";

// Teacher side of the K-12 grade bands: "View as" (the student app in any band, with sample data) and the per-student view.

const SAMPLE_GRADE: Record<Band, number> = { discover: 1, explore: 4, build: 7, launch: 11 };
const sampleData = (band: Band): HomeData => ({
  progress: {
    level: { level: 4, name: "Builder", xp: 1420, next_level_xp: 2000, next_level_name: "Maker", percent: 70 }, streak: 3,
    courses: [{ id: "ai-foundations", title: "AI Foundations", percent: 18 }, { id: "python-foundations", title: "Python Foundations", percent: 56 }],
    projects: band === "discover" ? [] : [{ id: 1, title: band === "launch" ? "Weather prediction model" : "My first program", status: "saved", updated_at: new Date(Date.now() - 864e5).toISOString() }],
  },
  cont: {
    lesson: band === "explore" ? { id: "ai-foundations-l2", title: "Data and patterns", number: 2, module: "Module 1", available: true, course_id: "ai-foundations", course: "AI Foundations", percent: 18 }
      : { id: "py-l6", title: "Loops", number: 6, module: "Module 3", available: true, course_id: "python-foundations", course: "Python Foundations", percent: 56 },
    assigned: [{ id: "asg-loops-practice", title: "Loops Practice", subject: "Computer Science", due_at: new Date(Date.now() + 3 * 864e5).toISOString(), state: "not_started" }],
  },
  status: { items: [{ id: "ai", label: "Local AI", state: "ready", text: "Ready" }, { id: "internet", label: "Internet", state: "optional", text: "Optional" }, { id: "learning", label: "Learning services", state: "ready", text: "Available" }] },
});

export function ViewAs() {
  const [params, setParams] = useSearchParams();
  const band = (BANDS.includes(params.get("band") as Band) ? params.get("band") : "build") as Band;
  const g = SAMPLE_GRADE[band];
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title="View as a student" subtitle="See the student app the way each grade band sees it. Sample data; links are turned off in this preview." />
      <div role="tablist" aria-label="Grade band" className="mb-6 inline-flex rounded-xl border border-border bg-white p-1 card-soft">
        {BANDS.map((b) => (
          <button key={b} role="tab" aria-selected={b === band} onClick={() => setParams({ band: b })}
            className={cn("rounded-lg px-4 py-2 text-[15px]", b === band ? "bg-primary text-white" : "text-primary hover:bg-muted")}>
            {BAND_INFO[b].grades} <span className="hidden sm:inline">· {BAND_INFO[b].name}</span>
          </button>))}
      </div>
      <div className="rounded-2xl border border-dashed border-[#bcd1ee] bg-background p-4 md:p-6" aria-label={`Student home preview, grades ${BAND_INFO[band].grades}`}>
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground"><Eye className="h-4 w-4" />Preview: a sample {g === 0 ? "Kindergarten" : `Grade ${g}`} student ({BAND_INFO[band].stage})</p>
        <HomeView user={{ name: "Sam Lee", grade_label: `Grade ${g}`, stage: BAND_INFO[band].stage }} band={band} data={sampleData(band)} preview />
      </div>
    </div>
  );
}

interface Concept { concept: string; correct: number; answered: number; percent: number }
interface StudentDetail {
  id: number; name: string; grade: number | null; grade_label: string | null; stage: string | null; band: Band | null;
  courses: { id: string; title: string; percent: number }[]; xp: number; level: Level; streak: number; badges: string[];
  strengths: Concept[]; struggling: Concept[]; assignments: { id: string; title: string; due_at: string; state: string; score: number | null; max_score: number }[]; next_step: string;
  practice?: { title: string; mastered: boolean; correct: number; attempts: number }[];
  extra_bands?: Band[]; content_bands?: Band[];
  projects?: { id: number; title: string; category: string; status: string; updated_at: string; submitted_at: string | null; notes: string | null }[];
}

export function TeacherStudent() {
  const { id } = useParams();
  const d = useQuery({ queryKey: ["teacher-student", id], queryFn: () => get<StudentDetail>(`/api/teacher/students/${id}`) });
  const { brand, edition } = useBrand();
  const bands = brand.id === "umanah" || Object.keys(edition.bands ?? {}).length > 0;   // widening is K-12 only (no bands in University)
  if (d.isError) return <Empty title="Student not found in your classes" />;
  if (!d.data) return <div className="mx-auto w-full max-w-[1440px]"><Skeleton className="h-96" /></div>;
  const s = d.data;
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <Link to="/teacher/students" className="mb-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />All students</Link>
      <PageHeader title={s.name} subtitle={`${s.grade_label ? `${s.grade_label} · ${s.stage}` : "Grade not set"} · Level ${s.level.level} ${s.level.name} · ${nf(s.xp)} XP · ${s.streak}-day streak`} />

      <section aria-label="Suggested next step" className="mb-5 flex items-start gap-3 rounded-xl border border-[#dbeadf] bg-[#f1f7f2] p-5">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h2 className="text-[18px]">Suggested next step</h2><p className="text-[15px] text-[#374151]">{s.next_step}</p></div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section aria-label="Course progress" className="rounded-xl border border-border bg-white p-5 card-soft">
          <h2 className="mb-3 text-[20px]">Progress</h2>
          <ul className="space-y-3">{s.courses.map((c) => <li key={c.id}><div className="mb-1 flex justify-between text-sm"><span className="text-primary">{c.title}</span><span className="text-muted-foreground">{c.percent}%</span></div><Bar value={c.percent} label={`${c.title} progress`} /></li>)}</ul>
        </section>
        <ConceptList title="Strengths" icon={<TrendingUp className="h-5 w-5 text-okay" />} items={s.strengths} empty="Not enough practice answers yet." tone="green" />
        <ConceptList title="Struggling with" icon={<TrendingDown className="h-5 w-5 text-rose-600" />} items={s.struggling} empty="Nothing stands out. Keep an eye on new topics." tone="rose" />
      </div>

      <section aria-label="Assignment history" className="mt-5 rounded-xl border border-border bg-white p-5 card-soft">
        <h2 className="mb-2 text-[20px]">Assignment history</h2>
        {s.assignments.length === 0 ? <p className="text-sm text-muted-foreground">No assignments yet.</p> : (
          <ul className="divide-y divide-border">{s.assignments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5 text-[15px]">
              <span className="flex-1 text-primary">{a.title}</span><span className="text-sm text-muted-foreground">{dueLabel(a.due_at)}</span>
              <Pill tone={a.state === "returned" ? "green" : a.state === "submitted" ? "blue" : a.state === "draft" ? "amber" : "gray"}>
                {a.state === "returned" ? `Graded${a.score != null ? ` · ${a.score}/${a.max_score}` : ""}` : a.state === "submitted" ? "Submitted" : a.state === "draft" ? "In progress" : "Not started"}
              </Pill>
            </li>))}</ul>)}
      </section>
      <ProjectsCard projects={s.projects ?? []} />
      {s.band && bands && <WidenCard id={s.id} name={s.name.split(" ")[0]} band={s.band} extra={s.extra_bands ?? []} />}
      {productName() === "Umanah AI Lab" && <section aria-label="Library practice" className="mt-5 rounded-xl border border-border bg-white p-5 card-soft">
        <h2 className="mb-2 text-[20px]">Library practice</h2>
        {!(s.practice ?? []).length ? <p className="text-sm text-muted-foreground">No School Library practice yet.</p> : (
          <ul className="divide-y divide-border">{s.practice!.map((x) => <li key={x.title} className="flex items-center gap-3 py-2.5 text-[15px]"><span className="flex-1 text-primary">{x.title}</span><span className="text-sm text-muted-foreground">{x.correct} of {x.attempts} right</span><Pill tone={x.mastered ? "green" : "blue"}>{x.mastered ? "Mastered" : "Practising"}</Pill></li>)}</ul>)}
      </section>}
      {s.badges.length > 0 && <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-okay" />{s.badges.length} badges earned</p>}
    </div>
  );
}

function ConceptList({ title, icon, items, empty, tone }: { title: string; icon: React.ReactNode; items: Concept[]; empty: string; tone: "green" | "rose" }) {
  return (
    <section aria-label={title} className="rounded-xl border border-border bg-white p-5 card-soft">
      <h2 className="mb-3 flex items-center gap-2 text-[20px]">{icon}{title}</h2>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ul className="space-y-2">{items.map((c) => <li key={c.concept} className="flex items-center justify-between gap-3 text-[15px]"><span className="text-primary">{c.concept}</span><Pill tone={tone}>{c.correct} of {c.answered} right</Pill></li>)}</ul>)}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ handed-in projects
function ProjectsCard({ projects }: { projects: NonNullable<StudentDetail["projects"]> }) {
  return (
    <section aria-label={t("projects.title")} className="mt-5 rounded-xl border border-border bg-white p-5 card-soft">
      <h2 className="mb-2 flex items-center gap-2 text-[20px]"><FolderKanban className="h-5 w-5 text-primary" strokeWidth={1.6} />{t("projects.title")}</h2>
      {projects.length === 0 ? <p className="text-sm text-muted-foreground">{t("projects.none")}</p> : (
        <ul className="divide-y divide-border">{projects.map((p) => (
          <li key={p.id} className="py-2.5 text-[15px]">
            <div className="flex flex-wrap items-center gap-3"><span className="flex-1 text-primary">{p.title}</span>
              <Pill tone={p.status === "submitted" ? "blue" : "gray"}>{p.status === "submitted" ? t("projects.handedIn") : t("projects.draft")}</Pill></div>
            {p.notes && <p className="mt-1.5 whitespace-pre-wrap rounded-lg bg-muted/60 p-3 text-[14px] text-[#374151]">{p.notes}</p>}
          </li>))}</ul>)}
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ widen content per student
function WidenCard({ id, name, band, extra }: { id: number; name: string; band: Band; extra: Band[] }) {
  const qc = useQueryClient();
  const [pick, setPick] = useState<Band[]>(extra);
  const [saved, setSaved] = useState(false);
  useEffect(() => setPick(extra), [extra]);
  const save = useMutation({
    mutationFn: () => patch(`/api/teacher/students/${id}`, { extra_bands: pick }),
    onSuccess: () => { setSaved(true); qc.invalidateQueries({ queryKey: ["teacher-student", String(id)] }); },
  });
  const bandName = `${BAND_INFO[band].grades} · ${BAND_INFO[band].name}`;
  return (
    <section aria-label={t("widen.title")} className="mt-5 rounded-xl border border-border bg-white p-5 card-soft">
      <h2 className="mb-1 flex items-center gap-2 text-[20px]"><SlidersHorizontal className="h-5 w-5 text-primary" strokeWidth={1.6} />{t("widen.title")}</h2>
      <p className="mb-3 text-[15px] text-[#374151]">{t("widen.text", { name, band: bandName })}</p>
      <fieldset className="flex flex-wrap gap-2"><legend className="sr-only">{t("widen.title")}</legend>
        {BANDS.map((b) => {
          const own = b === band;
          const on = own || pick.includes(b);
          return (
            <label key={b} className={cn("press flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[15px]", on ? "border-[#bcd1ee] bg-[#e4eefc] text-primary" : "border-border bg-white text-primary", own && "cursor-default opacity-80")}>
              <input type="checkbox" checked={on} disabled={own} onChange={(e) => { setSaved(false); setPick(e.target.checked ? [...pick, b] : pick.filter((x) => x !== b)); }} className="h-4 w-4 accent-[#163b62]" />
              {BAND_INFO[b].grades} · {BAND_INFO[b].name}{own && <span className="text-xs text-muted-foreground">({t("widen.own")})</span>}
            </label>);
        })}
      </fieldset>
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{t("widen.save")}</Button>
        {saved && <span role="status" className="flex items-center gap-1.5 text-sm text-[var(--pill-green-fg)]"><CheckCircle2 className="h-4 w-4" />{t("widen.saved")}</span>}
        {save.isError && <span role="alert" className="text-sm text-[#8a1c2b]">{t("widen.error")}</span>}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------------------------ School -> Grade -> Class -> Student
interface SchoolTreeData { school: string | null; grades: { grade: number | null; grade_label: string; band: Band | null; stage: string | null;
  classes: { id: number; name: string; students: { id: number; name: string; status: string }[] }[] }[] }

export function SchoolTree() {
  const d = useQuery({ queryKey: ["teacher-school"], queryFn: () => get<SchoolTreeData>("/api/teacher/school") });
  const count = (n: number, one: string, many: string) => (n === 1 ? t(one) : t(many, { n }));
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title={d.data?.school ?? t("school.title")} subtitle={t("school.subtitle")} />
      {!d.data ? <Skeleton className="h-96" /> : d.data.grades.length === 0 ? <Empty title={t("school.noStudents")} /> : (
        <ol className="space-y-3" aria-label={t("school.title")}>
          {d.data.grades.map((g) => {
            const n = g.classes.reduce((a, c) => a + c.students.length, 0);
            return (
              <li key={g.grade ?? "none"}>
                <details className="group rounded-xl border border-border bg-white card-soft" open={d.data.grades.length <= 2}>
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-3 [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="h-4 w-4 shrink-0 text-primary transition-transform duration-200 ease-out-strong group-open:rotate-90" aria-hidden="true" />
                    <School className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.6} aria-hidden="true" />
                    <span className="font-serif text-[20px] text-primary">{g.grade === null ? t("school.gradeNotSet") : g.grade_label}</span>
                    {g.stage && <Pill tone="gray">{g.stage}</Pill>}
                    <span className="ml-auto text-sm text-muted-foreground">{count(g.classes.length, "school.class", "school.classes")} · {count(n, "school.student", "school.students")}</span>
                  </summary>
                  <ul className={cn("grid grid-cols-1 gap-3 border-t border-border p-4", g.classes.length > 1 && "md:grid-cols-2 xl:grid-cols-3")}>
                    {g.classes.map((c) => (
                      <li key={c.id} className="rounded-lg border border-border p-4">
                        <h3 className="mb-2 flex items-center gap-2 text-[17px]"><Users className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />{c.name}</h3>
                        <ul className={cn("grid grid-cols-1 gap-x-4 gap-y-0.5", g.classes.length === 1 && "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>{c.students.map((st) => (
                          <li key={st.id}><Link to={`/teacher/students/${st.id}`} className="press flex min-h-10 items-center justify-between gap-2 rounded-md px-2 text-[15px] text-primary hover:bg-muted">
                            <span>{st.name}</span>{st.status !== "active" ? <Pill tone="gray">{t("school.inactive")}</Pill> : <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}</Link></li>))}
                        </ul>
                      </li>))}
                  </ul>
                </details>
              </li>);
          })}
        </ol>)}
    </div>
  );
}
