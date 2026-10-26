import { BarChart3, BookOpen, Briefcase, Code2, Database, FileText, FolderKanban, GraduationCap, HardDrive, Lightbulb, MessageSquare, Route, Sparkles, Star, Volume2, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowButton, Bar, FeatureCard, IconBadge, Pill } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssignedItem, Band, Level, LessonRef, User } from "@/lib/api";
import { BAND_INFO, K2_TILES, PATHS, RECOMMENDED, SKILLS, VERB_TEXT, bandOf, sayAloud } from "@/lib/bands";
import { dueLabel, nf } from "@/lib/format";
import { useContinue, useProgress, useStatus } from "@/lib/queries";
import { useUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { stagger, useFirstVisit, useHoverSay } from "@/lib/motion";

// Student Home, one per grade band (K-12 UI spec): 2A K-2 Discover (picture tiles, read aloud), 2B 3-5 Explore, 2C 6-8 Build
// (closest to the original screen), 2D 9-12 Launch (adds portfolio and pathways). Teachers preview any band with sample data.
export interface HomeData {
  progress?: { level: Level; streak: number; courses: { id: string; title: string; percent: number }[]; projects: { id: number; title: string; status: string; updated_at: string }[] };
  cont?: { lesson: (LessonRef & { course_id: string; course: string; percent: number }) | null; assigned: AssignedItem[] };
  status?: { items: { id: string; label: string; state: string; text: string }[] };
}

function Dot({ state }: { state: string }) {
  const c = state === "ready" ? "bg-okay" : state === "unavailable" ? "bg-rose-500" : "bg-[#9aa3b2]";
  return <span className={cn("inline-block h-2 w-2 rounded-full", c)} aria-hidden="true" />;
}

export default function Home() {
  const user = useUser();
  const progress = useProgress();
  const cont = useContinue();
  const status = useStatus();
  return <HomeView user={user} band={bandOf(user)} data={{ progress: progress.data, cont: cont.data, status: status.data }} />;
}

export function HomeView({ user, band, data, preview }: { user: Pick<User, "name" | "grade_label" | "stage">; band: Band; data: HomeData; preview?: boolean }) {
  return band === "discover" ? <DiscoverHome user={user} data={data} preview={preview} /> : <StudentHome user={user} band={band} data={data} preview={preview} />;
}

// ---------------------------------------------------------------------------------------------- 2A: K-2 Discover
function DiscoverHome({ user, data, preview }: { user: Pick<User, "name">; data: HomeData; preview?: boolean }) {
  const first = user.name.split(" ")[0];
  const stars = data.progress?.level ? Math.round(data.progress.level.xp / 100) : null;
  const hello = `Hello, ${first}! What do you want to do today?`;
  const firstVisit = useFirstVisit();
  const hoverSay = useHoverSay();
  const ICON: Record<string, ReactNode> = { read: <BookOpen className="h-16 w-16" strokeWidth={1.3} />, play: <Sparkles className="h-16 w-16" strokeWidth={1.3} />,
    ask: <MessageSquare className="h-16 w-16" strokeWidth={1.3} />, stars: <Star className="h-16 w-16" strokeWidth={1.3} /> };
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <div className="mb-8 flex flex-wrap items-center justify-center gap-4 text-center md:justify-between md:text-left">
        <h1 className="text-[40px] leading-tight md:text-[52px]">Hello, {first}!</h1>
        <button onClick={() => sayAloud(hello)} className="press flex h-14 items-center gap-3 rounded-full bg-white px-6 text-[18px] text-primary card-soft hover:bg-[#f4f6fb]"><Volume2 className="h-6 w-6" />Read to me</button>
      </div>
      <nav aria-label="What to do" className="grid grid-cols-2 gap-5 md:gap-7">
        {K2_TILES.map((t, i) => (
          <div key={t.id} style={stagger(i)} className={cn("card-press relative rounded-[24px] border border-border card-soft [--lift:-4px]", firstVisit && "rise-in", t.tint)}>
            <Link to={preview ? "#" : t.to} onMouseEnter={() => hoverSay.start(t.say)} onMouseLeave={hoverSay.cancel} onFocus={(e) => { if (e.currentTarget.matches(":focus-visible")) sayAloud(t.say); }} className="flex min-h-[210px] flex-col items-center justify-center gap-4 p-6 text-primary md:min-h-[260px]">
              {ICON[t.id]}<span className="font-serif text-[30px] md:text-[36px]">{t.label}</span>
            </Link>
            <button onClick={() => sayAloud(t.say)} aria-label={`Read aloud: ${t.label}`} className="press absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/80 text-primary hover:bg-white"><Volume2 className="h-5 w-5" /></button>
          </div>))}
      </nav>
      {stars !== null && <p className="mt-8 flex items-center justify-center gap-2 text-[20px] text-primary"><Star className="h-6 w-6 fill-[#f5c542] text-[#d9a514]" />You have {nf(stars)} stars</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------- 2B-2D: grades 3-12
function StudentHome({ user, band, data, preview }: { user: Pick<User, "name" | "grade_label" | "stage">; band: Exclude<Band, "discover">; data: HomeData; preview?: boolean }) {
  const first = user.name.split(" ")[0];
  const lvl = data.progress?.level;
  const ai = data.status?.items.find((i) => i.id === "ai");
  const to = (p: string) => (preview ? "#" : p);
  const firstVisit = useFirstVisit();
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div className="mb-6 flex flex-wrap items-start justify-center gap-6 md:justify-between">
        <div className="text-center md:text-left">
          <h1 className="text-[36px] leading-tight md:text-[44px]">Welcome back, {first}</h1>
          {user.grade_label && <p className="mt-2 text-[17px] font-medium text-primary">{user.grade_label} · {user.stage}</p>}
          {lvl ? <p className="mt-1 text-[17px] text-muted-foreground">Level {lvl.level} · {lvl.name} · {nf(lvl.xp)} XP · {data.progress!.streak}-day streak</p>
            : <Skeleton className="mt-3 h-6 w-64" />}
        </div>
        {band === "launch" ? (
          <section aria-label="System status" className="w-full rounded-xl border border-border bg-white p-4 card-soft sm:w-[340px]">
            <div className="mb-3 flex items-center justify-center gap-2 text-[15px] font-medium text-primary md:justify-start"><HardDrive className="h-5 w-5" strokeWidth={1.5} />System Status</div>
            <ul className="mx-auto w-fit space-y-2 text-[14px] text-[#374151] md:mx-0">
              {(data.status?.items ?? []).map((i) => (
                <li key={i.id} className="flex items-center gap-2.5 pl-1">{i.id === "internet" ? <Wifi className="h-4 w-4 text-muted-foreground" /> : <Dot state={i.state} />}<span>{i.label}: <span className="text-primary">{i.text}</span></span></li>))}
              {!data.status && <Skeleton className="h-16 w-full" />}
            </ul>
          </section>
        ) : ai && <p className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-[#374151] card-soft"><Dot state={ai.state} />{ai.label}: <span className="text-primary">{ai.text}</span></p>}
      </div>

      <LearningPath band={band} data={data} />

      <section aria-label="Where to go" className="mt-6 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5 max-sm:[&>a:last-child]:col-span-2">
        <FeatureCard className={firstVisit ? "rise-in" : undefined} style={stagger(0)} to={to("/ask")} accent="ask" icon={<MessageSquare className="h-6 w-6" strokeWidth={1.5} />} title="Ask" text={VERB_TEXT.ask} />
        <FeatureCard className={firstVisit ? "rise-in" : undefined} style={stagger(1)} to={to("/learn")} accent="learn" icon={<BookOpen className="h-6 w-6" strokeWidth={1.5} />} title="Learn" text={VERB_TEXT.learn} />
        <FeatureCard className={firstVisit ? "rise-in" : undefined} style={stagger(2)} to={to("/build")} accent="build" icon={<Code2 className="h-6 w-6" strokeWidth={1.5} />} title="Build" text={VERB_TEXT.build} />
        <FeatureCard className={firstVisit ? "rise-in" : undefined} style={stagger(3)} to={to("/explore")} accent="explore" icon={<Database className="h-6 w-6" strokeWidth={1.5} />} title="Explore" text={VERB_TEXT.explore} />
        <FeatureCard className={firstVisit ? "rise-in" : undefined} style={stagger(4)} to={to("/progress")} accent="progress" icon={<BarChart3 className="h-6 w-6" strokeWidth={1.5} />} title="Progress" text={VERB_TEXT.progress} />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Your next steps">
        {data.cont?.lesson ? (
          <Tile to={to(`/learn/lessons/${data.cont.lesson.id}`)} icon={<BookOpen className="h-6 w-6" strokeWidth={1.5} />} tint="bg-learn-icon" title="Continue Learning"
            line={data.cont.lesson.course} sub={`Lesson ${data.cont.lesson.number}: ${data.cont.lesson.title}`} percent={data.cont.lesson.percent} />
        ) : data.cont ? <Tile icon={<BookOpen className="h-6 w-6" strokeWidth={1.5} />} tint="bg-learn-icon" title="Continue Learning" sub="Pick a course in Learn to start." to={to("/learn")} />
          : <Skeleton className="h-28 w-full rounded-xl" />}
        {data.cont && (data.cont.assigned[0]
          ? <Tile to={to(`/assignments/${data.cont.assigned[0].id}`)} icon={<FileText className="h-6 w-6" strokeWidth={1.5} />} tint="bg-explore-icon" title="Assignments" line={data.cont.assigned[0].title} sub={dueLabel(data.cont.assigned[0].due_at)} />
          : <Tile icon={<FileText className="h-6 w-6" strokeWidth={1.5} />} tint="bg-explore-icon" title="Assignments" sub="Nothing assigned right now." />)}
        <Tile to={preview ? "#" : RECOMMENDED[band].to} external={!preview && RECOMMENDED[band].external} icon={<Lightbulb className="h-6 w-6" strokeWidth={1.5} />} tint="bg-build-icon"
          title={`Recommended for ${user.grade_label ?? BAND_INFO[band].stage}`} line={RECOMMENDED[band].title} sub={RECOMMENDED[band].text} />
        {data.progress?.projects[0]
          ? <Tile to={to("/build")} icon={<FolderKanban className="h-6 w-6" strokeWidth={1.5} />} tint="bg-progress-icon" title="Continue Your Project" line={data.progress.projects[0].title} sub={`Last saved ${new Date(data.progress.projects[0].updated_at).toLocaleDateString()}`} />
          : <Tile to={to("/build")} icon={<FolderKanban className="h-6 w-6" strokeWidth={1.5} />} tint="bg-progress-icon" title="Continue Your Project" sub="Start a project in Build. Saved projects show up here." />}
      </section>

      {band === "launch" && <LaunchExtras data={data} preview={preview} />}

      <section aria-label="Your skills" className="mt-6 rounded-xl border border-border bg-white p-5 card-soft">
        <h2 className="text-[20px]">Your Skills</h2>
        <ul className="mt-3 flex flex-wrap gap-2">{SKILLS[band].map((s) => <li key={s}><Pill tone="blue" className="px-3 py-1 text-[13px]">{s}</Pill></li>)}</ul>
      </section>
    </div>
  );
}

function LearningPath({ band, data }: { band: Band; data: HomeData }) {
  const steps = PATHS[band].map((s) => {
    const pct = s.course ? data.progress?.courses.find((c) => c.id === s.course)?.percent ?? 0 : s.projects ? ((data.progress?.projects.length ?? 0) > 0 ? 100 : 0) : 0;
    return { ...s, pct };
  });
  const overall = steps.length ? Math.round(steps.reduce((a, s) => a + s.pct, 0) / steps.length) : 0;
  return (
    <section aria-label="Your learning path" className="rounded-xl border border-border bg-white p-5 card-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[22px]"><Route className="h-5 w-5 text-primary" strokeWidth={1.6} />Your Learning Path</h2>
        {data.progress ? <p className="text-sm font-medium text-primary">{overall}% of the way</p> : <Skeleton className="h-5 w-24" />}
      </div>
      <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-[15px]">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={cn("rounded-full px-3 py-1", s.pct >= 100 ? "bg-[var(--pill-green)] text-[var(--pill-green-fg)]" : s.pct > 0 ? "bg-[var(--pill-blue)] text-[var(--pill-blue-fg)]" : "bg-muted text-muted-foreground")}>{s.label}</span>
            {i < steps.length - 1 && <span aria-hidden="true" className="text-muted-foreground">→</span>}
          </li>))}
      </ol>
      <Bar value={overall} label="Learning path progress" className="mt-4" />
    </section>
  );
}

function LaunchExtras({ data, preview }: { data: HomeData; preview?: boolean }) {
  const projects = data.progress?.projects ?? [];
  return (
    <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Portfolio and pathways">
      <div className="rounded-xl border border-border bg-white p-5 card-soft">
        <h2 className="flex items-center gap-2 text-[20px]"><Briefcase className="h-5 w-5 text-primary" strokeWidth={1.6} />Portfolio</h2>
        {projects.length ? <ul className="mt-2 divide-y divide-border">{projects.slice(0, 4).map((p) => <li key={p.id} className="flex items-center justify-between py-2 text-[15px]"><span className="text-primary">{p.title}</span><span className="text-xs text-muted-foreground">{new Date(p.updated_at).toLocaleDateString()}</span></li>)}</ul>
          : <p className="mt-2 text-sm text-muted-foreground">Projects you save in Build collect here, ready to show a teacher, a college or an employer.</p>}
      </div>
      <div className="rounded-xl border border-border bg-white p-5 card-soft">
        <h2 className="flex items-center gap-2 text-[20px]"><GraduationCap className="h-5 w-5 text-primary" strokeWidth={1.6} />College and Career Pathways</h2>
        <ul className="mt-2 space-y-1.5 text-[15px]">
          {[["Computer science and AI", "/explore?q=computer%20science"], ["Engineering", "/explore?cat=engineering"], ["Data science and statistics", "/explore?q=statistics"], ["Life and health sciences", "/explore?q=biology"]].map(([t, href]) =>
            <li key={t}><Link to={preview ? "#" : href} className="text-primary hover:underline">{t}</Link></li>)}
        </ul>
      </div>
    </section>
  );
}

function Tile({ to, external, icon, tint, title, line, sub, percent }: { to?: string; external?: boolean; icon: ReactNode; tint: string; title: string; line?: string; sub?: string; percent?: number }) {
  const body = (
    <>
      <IconBadge className={tint}>{icon}</IconBadge>
      <div className="min-w-0 flex-1">
        <h2 className="text-[20px]">{title}</h2>
        {line && <p className="mt-1 text-[15px] font-medium text-primary">{line}</p>}
        {sub && <p className="text-[13px] text-muted-foreground">{sub}</p>}
      </div>
      {percent !== undefined && <div className="hidden w-[30%] sm:block"><p className="mb-1 text-sm font-medium text-primary">{percent}%</p><Bar value={percent} label="Course progress" /></div>}
      {to && <ArrowButton className="bg-muted" />}
    </>
  );
  const cls = "flex items-center gap-5 rounded-xl border border-border bg-white p-5 card-soft";
  if (!to) return <div className={cls}>{body}</div>;
  return external ? <a href={to} target="_blank" rel="noopener" className={cn(cls, "card-press [--lift:0px]")}>{body}</a> : <Link to={to} className={cn(cls, "card-press [--lift:0px]")}>{body}</Link>;
}
