import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, Empty, PageHeader, Pill } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { get } from "@/lib/api";
import { ago } from "@/lib/format";

// Staff views (owner, 2026-09-30): School -> Grade -> Class -> Student, and one learner's picture.

interface SchoolRes { groups: { band: { id: string; name: string; grades: string } | null; levels: { level: string; stage: string;
  classes: { id: number; name: string; teacher: string | null; average: number; learners: { id: number; name: string; path_percent: number; last_login_at: string | null; needs_help: boolean }[] }[] }[] }[] }

export function SchoolByGrade() {
  const q = useQuery({ queryKey: ["school-by-grade"], queryFn: () => get<SchoolRes>("/api/learner/school") });
  return (
    <div className="mx-auto w-full max-w-[1300px]">
      <PageHeader title="School by Grade" subtitle="Every class, grouped by learner stage and level. Open a learner to see their progress and where they need help." />
      {!q.data ? <Skeleton className="h-64" /> : q.data.groups.length === 0 ? <Empty title="No classes yet" text="Classes you teach or manage show here." /> :
        q.data.groups.map((g) => (
          <section key={g.band?.id ?? "other"} className="mb-6" aria-label={g.band ? `${g.band.name} ${g.band.grades}` : "Other"}>
            <h2 className="mb-2 text-[24px]">{g.band ? `${g.band.name} · ${g.band.grades}` : "Other classes"}</h2>
            {g.levels.map((lv) => (
              <div key={lv.level} className="mb-4 rounded-xl border border-border bg-white card-soft">
                <div className="border-b border-border px-5 py-3"><span className="font-serif text-[18px] text-primary">{lv.level || "No level set"}</span>{lv.stage && <span className="ml-2 text-sm text-muted-foreground">{lv.stage}</span>}</div>
                {lv.classes.map((c) => (
                  <div key={c.id} className="px-5 py-3">
                    <div className="mb-2 flex flex-wrap items-center gap-3"><p className="font-medium text-primary">{c.name}</p><span className="text-sm text-muted-foreground">{c.teacher} · {c.learners.length} learners · average {c.average}% of their path</span></div>
                    <ul className="divide-y divide-border rounded-lg border border-border">
                      {c.learners.map((s) => (
                        <li key={s.id}><Link to={`/teacher/students/${s.id}`} className="press flex items-center gap-4 px-3 py-2.5 hover:bg-[#f4f6fb]">
                          <span className="w-48 font-medium text-primary">{s.name}</span>
                          <span className="flex flex-1 items-center gap-2"><Bar value={s.path_percent} label={`${s.name} learning path`} /><span className="w-10 text-right text-xs text-muted-foreground">{s.path_percent}%</span></span>
                          {s.needs_help && <Pill tone="amber"><AlertTriangle className="h-3 w-3" />May need help</Pill>}
                          <span className="hidden w-28 text-right text-xs text-muted-foreground sm:block">{s.last_login_at ? ago(s.last_login_at) : "Not signed in yet"}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" /></Link></li>))}
                    </ul>
                  </div>))}
              </div>))}
          </section>))}
    </div>
  );
}
