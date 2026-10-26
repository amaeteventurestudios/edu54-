import { Award, BookOpen, CheckCircle2, Code2, Flame, Hexagon, Loader2, Sprout, Trophy, Wrench, Lightbulb, Bug } from "lucide-react";
import { Bar, PageHeader, Pill, Empty } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { nf } from "@/lib/format";
import { useProgress } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { productName } from "@/lib/brand";

const BADGE_ICON: Record<string, React.ReactNode> = {
  "python-starter": <Code2 className="h-9 w-9 text-[#2b6cb0]" strokeWidth={1.4} />, "loop-master": <Code2 className="h-9 w-9 text-[#b8860b]" strokeWidth={1.4} />,
  "hint-to-solution": <Lightbulb className="h-9 w-9 text-[#7a4a06]" strokeWidth={1.4} />, "bug-fixer": <Bug className="h-9 w-9 text-[#2f7a55]" strokeWidth={1.4} />,
  "first-builder": <Trophy className="h-9 w-9 text-[#5b3fb8]" strokeWidth={1.4} />,
};
const BADGE_TINT = ["bg-[#eaf1fb]", "bg-[#f1eefc]", "bg-[#fcf4e2]", "bg-[#eaf5ee]", "bg-[#f1eefc]"];

export default function Progress() {
  const p = useProgress();
  if (!p.data) return <Skeleton className="h-[500px] w-full" />;
  const d = p.data;
  const l = d.level;
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title="Your Progress" subtitle={<span className="block max-w-xl">Keep learning, building, and exploring. Your progress reflects your growth in AI, coding, and real-world problem solving.</span>}
        right={<div className="flex items-center gap-4 rounded-xl border border-[#f3dfc2] bg-[#fdf6ea] px-5 py-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-[#fbe9d2] text-[#d9601f]"><Flame className="h-7 w-7" strokeWidth={1.5} /></span><div><p className="font-serif text-[20px] text-primary">{d.streak}-day streak</p><p className="text-sm text-[#5b4a36]">Keep it up! Consistency builds real skills.</p></div></div>} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-xl border border-border bg-white p-6 card-soft" aria-label="Level">
          <div className="flex items-center gap-5">
            <span className="relative grid h-28 w-28 shrink-0 place-items-center text-[#4f6fd8]"><Hexagon className="absolute h-28 w-28 fill-[#dbe6fb] stroke-[#9db8ee]" strokeWidth={1.2} /><Sprout className="relative h-12 w-12 text-primary" strokeWidth={1.5} /></span>
            <div><p className="font-serif text-[34px] leading-none text-primary">Level {l.level}</p><p className="font-serif text-[26px] text-[#2f5fc4]">{l.name}</p><p className="mt-1 text-[16px] text-muted-foreground">{nf(l.xp)}{l.next_level_xp ? ` / ${nf(l.next_level_xp)}` : ""} XP</p></div>
          </div>
          <div className="mt-5 flex items-center gap-4"><Bar value={l.percent} className="h-2.5" label="XP to next level" /><span className="text-sm text-muted-foreground">{l.percent}%</span></div>
          {l.next_level_name && <p className="mt-2 text-sm text-muted-foreground">Next: {l.next_level_name}</p>}
        </section>

        <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label="Badges">
          <h2 className="mb-3 text-[20px]">Your Badges</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {d.badges.map((b, i) => (
              <li key={b.id} className={cn("flex flex-col items-center rounded-xl p-3 text-center", BADGE_TINT[i % 5])} aria-label={`${b.name}${b.earned ? "" : " — not earned yet"}`}>
                <Hexagon className="mb-1 hidden" /><span className={cn(!b.earned && "opacity-50")}>{BADGE_ICON[b.id] ?? <Award className="h-9 w-9" />}</span>
                <p className="mt-2 font-serif text-[14px] leading-tight text-primary">{b.name}</p>
                <p className="mt-1 text-[11px] leading-snug text-[#4b5563]">{b.earned ? b.description : "Not earned yet"}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label="Course progress">
          <h2 className="mb-3 text-[20px]">Course Progress</h2>
          <ul className="space-y-4">{d.courses.map((c) => (
            <li key={c.id} className="flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-lg bg-learn-icon text-primary"><BookOpen className="h-5 w-5" strokeWidth={1.5} /></span>
              <div className="min-w-0 flex-1"><p className="text-[15px] font-medium text-primary">{c.title}</p><Bar value={c.percent} className="mt-1.5" label={`${c.title} progress`} /></div><span className="w-10 text-right text-sm text-muted-foreground">{c.percent}%</span></li>))}</ul>
        </section>

        {productName() === "Umanah AI Lab" && <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label="Library practice">
          <h2 className="mb-3 text-[20px]">Library Practice</h2>
          {(d.practice ?? []).length === 0 ? <Empty title="No practice yet" text="Open a practice set in Explore, School Library, and your progress shows up here." /> : (
            <ul className="divide-y divide-border">{(d.practice ?? []).map((x) => (
              <li key={x.node_id} className="flex items-center gap-3 py-3"><span className="flex-1 font-serif text-primary">{x.title}</span>
                <span className="text-xs text-muted-foreground">{x.correct} of {x.attempts} right</span>
                <Pill tone={x.mastered ? "green" : "blue"}>{x.mastered ? <><CheckCircle2 className="h-3.5 w-3.5" />Mastered</> : "Practising"}</Pill></li>))}</ul>)}
        </section>}

        <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label="Projects">
          <h2 className="mb-3 text-[20px]">Projects</h2>
          {d.projects.length === 0 ? <Empty title="No projects yet" text="Save a program from Build and it will show up here." /> : (
            <ul className="divide-y divide-border">{d.projects.map((pr) => (
              <li key={pr.id} className="flex items-center gap-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-primary"><Wrench className="h-5 w-5" strokeWidth={1.5} /></span>
                <div className="flex-1"><p className="font-serif text-primary">{pr.title}</p></div>
                <Pill tone={pr.status === "complete" ? "green" : "blue"}>{pr.status === "complete" ? <><CheckCircle2 className="h-3.5 w-3.5" />Complete</> : <><Loader2 className="h-3.5 w-3.5" />In Progress</>}</Pill></li>))}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
