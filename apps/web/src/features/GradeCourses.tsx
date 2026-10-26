import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Atom, BookOpen, Calculator, Coins, Landmark, Languages, LifeBuoy } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Pill } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { get } from "@/lib/api";
import { ownCourses } from "@/lib/brand";

// The K-12 curriculum map: a grade's courses from the offline course channels (content/curriculum/k12.json).
export interface GradeMap { grade: number; grade_label: string; subjects: { subject: string; title: string; node: string; source: string }[]; umanah_courses: { id: string; title: string }[] }
export const useK12 = (grade?: number | null) => useQuery({ queryKey: ["k12", grade ?? "mine"], queryFn: () => get<{ grades: GradeMap[] }>(`/api/curriculum/k12${grade != null ? `?grade=${grade}` : ""}`) });

const ICON: Record<string, ReactNode> = { Math: <Calculator />, Reading: <BookOpen />, English: <Languages />, Science: <Atom />, History: <Landmark />, Civics: <Landmark />, Economics: <Coins />, "Life skills": <LifeBuoy /> };
const TINT: Record<string, string> = { Math: "bg-[#eaf1fb]", Reading: "bg-[#e9f5ec]", English: "bg-[#e9f5ec]", Science: "bg-[#fbf1e2]", History: "bg-[#fbeaea]", Civics: "bg-[#fbeaea]", Economics: "bg-[#efedfb]", "Life skills": "bg-[#efedfb]" };

export function GradeSubjects({ map, title }: { map?: GradeMap; title?: string }) {
  if (!map) return <Skeleton className="h-40" />;
  if (!map.subjects.length) return null;              // a grade with no library courses (EDU54 today) shows nothing, not an empty heading
  return (
    <section aria-label={title ?? `${map.grade_label} courses`}>
      {title !== "" && <h2 className="mb-3 text-[24px]">{title ?? `Your ${map.grade_label} courses`}</h2>}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {map.subjects.map((s) => (
          <li key={s.node + s.title}><Link to={`/explore?cat=library&at=${s.node}`} className={`flex h-full items-center gap-4 rounded-xl border border-border p-4 card-soft card-press ${TINT[s.subject] ?? "bg-white"}`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/80 text-primary [&>svg]:h-5 [&>svg]:w-5">{ICON[s.subject] ?? <BookOpen />}</span>
            <span className="min-w-0 flex-1"><span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.subject}</span><span className="block font-serif text-[18px] leading-tight text-primary">{s.title}</span><span className="text-xs text-muted-foreground">{s.source}</span></span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
          </Link></li>))}
      </ul>
    </section>
  );
}

export function K12Map() {
  const all = useK12(undefined);
  return (
    <section aria-label="K-12 by grade" className="mb-8">
      <h2 className="text-[26px]">K-12 by grade</h2>
      <p className="mb-4 text-[15px] text-muted-foreground">What each grade studies, from the course libraries stored on this device. Students see their own grade in Learn.</p>
      {!all.data ? <Skeleton className="h-64" /> : (
        <div className="space-y-3">{all.data.grades.map((g) => (
          <details key={g.grade} className="rounded-xl border border-border bg-white p-4 card-soft" open={g.grade === 7}>
            <summary className="flex cursor-pointer items-center gap-3 text-[18px] text-primary"><span className="font-serif">{g.grade_label}</span><Pill tone="gray">{g.subjects.length + g.umanah_courses.length} courses</Pill></summary>
            <div className="mt-4"><GradeSubjects map={g} title="" />
              {g.umanah_courses.length > 0 && <p className="mt-3 text-sm text-muted-foreground">Plus {ownCourses()}: {g.umanah_courses.map((c) => c.title).join(", ")}.</p>}</div>
          </details>))}</div>)}
    </section>
  );
}
