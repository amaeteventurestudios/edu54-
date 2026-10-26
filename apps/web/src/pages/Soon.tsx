import { K12Map } from "@/features/GradeCourses";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Sparkles } from "lucide-react";
import { Pill } from "@/components/common";
import { PageHeader } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { get, type Course } from "@/lib/api";
import { useLocation } from "react-router-dom";
import { ownCourses, useBrand } from "@/lib/brand";

const COPY: Record<string, [string, string]> = {
  "/teacher/revision": ["Revision", "Assign revision packs and see which topics your class finds hard. Students already have a Revision page for their own practice."],
  "/teacher/assessments": ["Assessments", "Build and schedule assessments with the tutor switched off. The tutor already respects assessment mode when you set one."],
  "/teacher/resources": ["Resources", "Share notes, handouts and links with a class. They will appear under Class resources in the student's Ask page."],
  "/teacher/builder": ["AI Lesson Builder", "Draft a lesson or worksheet with the tutor, review it, and publish it to your class. Nothing reaches students without your approval."],
};

export function ComingSoon() {
  const { pathname } = useLocation();
  const [title, text] = COPY[pathname] ?? ["This page", "It's on its way."];
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title={title} subtitle="Coming soon" />
      <div className="flex max-w-2xl items-start gap-4 rounded-xl border border-dashed border-border bg-white/70 p-6"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e4e0fb] text-primary"><Sparkles className="h-6 w-6" strokeWidth={1.5} /></span>
        <div><p className="font-serif text-[20px] text-primary">Not part of this release yet</p><p className="mt-1 text-[15px] text-[#374151]">{text}</p></div></div>
    </div>
  );
}

export function Curriculum() {
  const { brand, edition } = useBrand();
  const grades = brand.id === "umanah" || Object.keys(edition.bands ?? {}).length > 0;      // no grade map in University
  const c = useQuery({ queryKey: ["courses"], queryFn: () => get<{ courses: (Course & { lessons?: { id: string; title: string; number: number; module: string; available: boolean }[] })[] }>("/api/courses") });
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title="Curriculum" subtitle={`${grades ? "What every grade studies, and " : ""}${ownCourses()}. Lessons marked Ready open in the student's Learn page.`} />
      {grades && <K12Map />}
      <h2 className="mb-3 text-[26px]">{ownCourses()}</h2>
      {!c.data ? <Skeleton className="h-64" /> : <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">{c.data.courses.map((co) => (
        <section key={co.id} className="rounded-xl border border-border bg-white p-5 card-soft"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#e4eefc] text-primary"><BookOpen className="h-5 w-5" strokeWidth={1.5} /></span><div><h2 className="text-[20px]">{co.title}</h2><p className="text-sm text-muted-foreground">{co.lessons_total} lessons</p></div></div>
          <p className="mt-3 text-[14px] text-[#374151]">{co.description}</p>
          <ul className="mt-3 divide-y divide-border text-[14px]">{(co.lessons ?? []).map((l) => <li key={l.id} className="flex items-center justify-between py-1.5"><span>{l.number}. {l.title}</span>{l.available ? <Pill tone="green">Ready</Pill> : <Pill tone="gray">Coming soon</Pill>}</li>)}</ul></section>))}</div>}
    </div>
  );
}
