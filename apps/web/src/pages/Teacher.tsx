import { ViewAs } from "@/pages/StudentHome";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, GraduationCap, ShieldAlert, ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardList, Clock, FileText, Flame, Hourglass, Star, ThumbsDown, Trophy, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Bar, CodeBlock, Empty, IconBadge, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ApiError, get, post, type User } from "@/lib/api";
import { ago, dueLabel, nf } from "@/lib/format";
import { useUser } from "@/lib/session";

interface Overview {
  empty?: boolean;
  class: { id: number; name: string; subject: string }; lesson: { id: string; title: string };
  students: number; completed: number; in_progress: number; not_started: number; average_completion: number;
  needs_help: { id: number; name: string; reasons: string[] }[]; help_topic: string;
  assignments: { id: string; title: string; due_at: string }[];
  recent_submissions: { id: number; student: string; assignment: string; state: string; status: string; submitted_at: string | null; score: number | null; max_score: number }[];
  roster: { id: number; name: string; lesson_percent: number }[];
}
interface Student { id: number; name: string; courses: { id: string; title: string; percent: number }[]; xp: number; level: { level: number; name: string }; streak: number; badges: string[] }

function Ring({ value }: { value: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="h-[84px] w-[84px]" role="img" aria-label={`${value}% average completion`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="#ededed" strokeWidth="9" />
      <circle cx="40" cy="40" r={r} fill="none" stroke="#4db25b" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 40 40)" />
      <text x="40" y="46" textAnchor="middle" className="fill-primary" style={{ fontFamily: "var(--font-serif)", fontSize: 19 }}>{value}%</text>
    </svg>
  );
}

function Stat({ icon, tint, value, label, sub, foot }: { icon: React.ReactNode; tint: string; value: number; label: string; sub?: string; foot: string }) {
  return (
    <div className={`rounded-xl border border-border p-4 ${tint}`}>
      <div className="flex flex-col items-center gap-2 text-center md:flex-row md:items-start md:gap-3 md:text-left"><IconBadge className="h-11 w-11 bg-white/70">{icon}</IconBadge><div><p className="font-serif text-[28px] leading-none text-primary">{value}</p><p className="text-[14px] text-[#374151]">{label}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div></div>
      <p className="mt-3 text-center text-xs text-muted-foreground md:text-left">{foot}</p>
    </div>
  );
}

function FlaggedAnswers() {
  const f = useQuery({ queryKey: ["teacher-flagged"], queryFn: () => get<{ flagged: { id: number; student: string; question: string; answer: string; mode: string; at: string | null }[] }>("/api/teacher/flagged"), refetchInterval: 30000 });
  const list = f.data?.flagged ?? [];
  return (
    <section className="mt-5 rounded-xl border border-border bg-white p-5 card-soft" aria-label="Flagged tutor answers">
      <div className="mb-2 flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--pill-rose)] text-[var(--pill-rose-fg)]"><ThumbsDown className="h-4 w-4" /></span><div><h2 className="text-[20px]">Flagged tutor answers</h2><p className="text-xs text-muted-foreground">Students gave these answers a thumbs down. Only chats linked to your lessons and assignments appear here.</p></div></div>
      {!f.data ? <Skeleton className="h-16" /> : list.length === 0 ? <p className="py-3 text-[14px] text-muted-foreground">Nothing flagged. Good sign.</p> : (
        <ul className="divide-y divide-border">{list.map((x) => (
          <li key={x.id} className="py-3"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-primary">{x.student}</span><span className="text-xs text-muted-foreground">{x.at ? ago(x.at) : ""}</span></div>
            {x.question && <p className="mt-1 text-[13px] text-muted-foreground">Asked: “{x.question}”</p>}
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[#fbf3f4] p-2.5 text-[13.5px] text-[#374151]">{x.answer}</p></li>))}</ul>)}
    </section>
  );
}

export default function Teacher() {
  const user = useUser();
  const nav = useNavigate();
  const ov = useQuery({ queryKey: ["teacher-overview"], queryFn: () => get<Overview>("/api/teacher/overview"), refetchInterval: 20000 });
  const [pick, setPick] = useState<number | null>(null);
  const focus = pick ?? ov.data?.roster?.find((r) => r.name === "Jordan Smith")?.id ?? ov.data?.roster?.[0]?.id;   // the demo story follows Jordan
  const stu = useQuery({ queryKey: ["teacher-student", focus], queryFn: () => get<Student>(`/api/teacher/students/${focus}`), enabled: !!focus });
  if (!ov.data) return <Skeleton className="h-[600px] w-full" />;
  if (ov.data.empty) return (
    <div className="mx-auto w-full max-w-[1440px]"><h1 className="text-[40px] leading-tight">Teacher Center</h1><p className="mt-1 mb-3 text-[16px] text-muted-foreground">Plan, teach, and track learning with the power of local AI.</p><div className="mb-6"><ViewAs /></div>
      <Empty title="You don't have a class yet" text="An admin creates your class in Admin > Classes. Once it exists, you can add your students here." /></div>);
  const o = ov.data;
  const pct = (n: number) => Math.round((100 * n) / Math.max(1, o.students));

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="text-[40px] leading-tight">Teacher Center</h1><p className="mt-1 text-[16px] text-muted-foreground">Plan, teach, and track learning with the power of local AI.</p><div className="mt-3"><ViewAs /></div></div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 card-soft"><CalendarDays className="h-6 w-6 text-primary" strokeWidth={1.5} /><div><p className="text-sm font-medium text-primary">{o.class.name}</p><p className="text-xs text-muted-foreground">Today, {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p></div></div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label="Class">
            <div className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:justify-between md:text-left"><div><h2 className="text-[22px] md:text-[26px]">{o.class.name}</h2><p className="text-sm text-muted-foreground">{o.students} students · {o.class.subject}</p></div>
              <Button variant="outline" size="sm" onClick={() => nav("/teacher/assignments")}>View Class <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Button></div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat icon={<Users className="h-5 w-5 text-[#2f7a55]" />} tint="bg-[#f1f7f2]" value={o.students} label="students" foot="Actively enrolled" />
              <Stat icon={<CheckCircle2 className="h-5 w-5 text-[#2b6cb0]" />} tint="bg-[#eef4fd]" value={o.completed} label="completed" sub="today's lesson" foot={`${pct(o.completed)}% of class`} />
              <Stat icon={<Clock className="h-5 w-5 text-[#b8860b]" />} tint="bg-[#fdf6e6]" value={o.in_progress} label="in progress" foot={`${pct(o.in_progress)}% of class`} />
              <Stat icon={<Hourglass className="h-5 w-5 text-[#b4234b]" />} tint="bg-[#fbeef0]" value={o.not_started} label="not started" foot={`${pct(o.not_started)}% of class`} />
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-[1fr_1.3fr]">
            <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label="Class progress"><h2 className="mb-2 text-[19px]">Class Progress</h2>
              <div className="flex items-center gap-4"><Ring value={o.average_completion} /><div><p className="font-serif text-primary">average completion</p><p className="text-sm text-muted-foreground">Students have completed {o.average_completion}% of {o.lesson.title}.</p></div></div></section>
            <section className={`rounded-xl border p-5 ${o.needs_help.length ? "border-[#f0c9cf] bg-alertbg" : "border-border bg-white"}`} aria-label="Students who may need help">
              <div className="flex items-start gap-3"><AlertTriangle className={`h-8 w-8 ${o.needs_help.length ? "text-[#b4234b]" : "text-okay"}`} strokeWidth={1.5} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[22px] leading-snug">{o.needs_help.length ? `${o.needs_help.length} students may need help with ${o.help_topic}` : "No one is flagged right now"}</h2>
                  <p className="mt-1 text-sm text-[#5b3a40]">{o.needs_help.length ? "Based on repeated incorrect attempts and hints on Loops Practice." : "Nobody has repeated wrong attempts or several hints on the same question."}</p>
                  {o.needs_help.length > 0 && <ul className="mt-2 space-y-0.5 text-[13px] text-[#374151]">{o.needs_help.map((s) => <li key={s.id}><button onClick={() => setPick(s.id)} className="text-left underline-offset-2 hover:underline">{s.name}</button> — {s.reasons[0]}</li>)}</ul>}
                </div></div></section>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label="Recent submissions">
              <div className="mb-2 flex items-center justify-between"><h2 className="text-[20px]">Recent Submissions</h2><Button asChild variant="outline" size="sm"><Link to="/teacher/assignments">View All <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button></div>
              {o.recent_submissions.length === 0 ? <Empty title="No submissions yet" /> : (
                <ul className="divide-y divide-border">{o.recent_submissions.slice(0, 5).map((s) => (
                  <li key={s.id}><Link to={`/teacher/submissions/${s.id}`} className="flex items-center gap-3 py-3 hover:bg-muted/50">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-primary"><FileText className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1"><p className="text-[15px] font-medium text-primary">{s.student}</p><p className="text-xs text-muted-foreground">{s.assignment}</p></div>
                    <span className="hidden text-xs text-muted-foreground sm:inline">Submitted {ago(s.submitted_at)}</span>
                    <Pill tone={s.state === "returned" ? "green" : "blue"}>{s.status}</Pill><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link></li>))}</ul>)}
            </section>
            <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label="Teacher actions">
              <h2 className="mb-3 text-[20px]">Teacher Actions</h2>
              <div className="space-y-2.5">
                <Link to="/teacher/assignments" className="flex items-center gap-3 rounded-lg bg-[#eef4fd] p-3 hover:shadow"><ClipboardList className="h-6 w-6 text-primary" strokeWidth={1.5} /><div className="flex-1"><p className="text-[14px] font-medium text-primary">Review submissions</p><p className="text-xs text-muted-foreground">Grade work and send feedback.</p></div><ArrowRight className="h-4 w-4" /></Link>
                {user.is_safety_contact && <Link to="/safety" className="flex items-center gap-3 rounded-lg bg-[#fbeef0] p-3 hover:shadow"><AlertTriangle className="h-6 w-6 text-[#b4234b]" strokeWidth={1.5} /><div className="flex-1"><p className="text-[14px] font-medium text-primary">Safety Alerts</p><p className="text-xs text-muted-foreground">Alerts for designated contacts.</p></div><ArrowRight className="h-4 w-4" /></Link>}
                <Link to="/teacher/classes" className="flex items-center gap-3 rounded-lg bg-[#f1f6f2] p-3 hover:shadow"><Users className="h-6 w-6 text-primary" strokeWidth={1.5} /><div className="flex-1"><p className="text-[14px] font-medium text-primary">Classes and rosters</p><p className="text-xs text-muted-foreground">Add students, reset logins, print cards.</p></div><ArrowRight className="h-4 w-4" /></Link>
                <Link to="/teacher/curriculum" className="flex items-center gap-3 rounded-lg bg-[#fcf7ee] p-3 hover:shadow"><BookOpen className="h-6 w-6 text-primary" strokeWidth={1.5} /><div className="flex-1"><p className="text-[14px] font-medium text-primary">Curriculum</p><p className="text-xs text-muted-foreground">See the courses and lessons your class follows.</p></div><ArrowRight className="h-4 w-4" /></Link>
              </div>
            </section>
          </div>
          <FlaggedAnswers />
        </div>

        <aside className="space-y-4" aria-label="Student detail">
          {stu.data ? (
            <div className="rounded-xl border border-border bg-white p-5 card-soft">
              <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#dbe6fb] font-serif text-lg text-primary">{stu.data.name.split(" ").map((p) => p[0]).join("")}</span><div><p className="font-serif text-[20px] text-primary">{stu.data.name}</p><p className="text-xs text-muted-foreground">Student</p></div></div>
              <ul className="mt-4 space-y-3">{stu.data.courses.slice(0, 2).map((c) => <li key={c.id}><div className="mb-1 flex justify-between text-sm"><span className="text-primary">{c.title}</span><span>{c.percent}%</span></div><Bar value={c.percent} label={`${c.title} progress`} /></li>)}</ul>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-[#fdf6e6] p-2"><Star className="mx-auto h-5 w-5 text-[#b8860b]" /><p className="font-serif text-lg text-primary">{nf(stu.data.xp)}</p><p className="text-[11px] text-muted-foreground">XP</p></div>
                <div className="rounded-lg bg-[#eef4fd] p-2"><Trophy className="mx-auto h-5 w-5 text-[#2b6cb0]" /><p className="font-serif text-lg text-primary">{stu.data.badges.length}</p><p className="text-[11px] text-muted-foreground">Badges</p></div>
                <div className="rounded-lg bg-[#fbeef0] p-2"><Flame className="mx-auto h-5 w-5 text-[#d9601f]" /><p className="font-serif text-lg text-primary">{stu.data.streak} days</p><p className="text-[11px] text-muted-foreground">Current streak</p></div>
              </div>
            </div>
          ) : <Skeleton className="h-64" />}
          <DemoViews />
        </aside>
      </div>
    </div>
  );
}

export function TeacherAssignments() {
  const ov = useQuery({ queryKey: ["teacher-overview"], queryFn: () => get<Overview>("/api/teacher/overview") });
  if (!ov.data) return <Skeleton className="h-64" />;
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <h1 className="mb-1 text-[38px]">Assignments</h1><p className="mb-5 text-muted-foreground">{ov.data.class.name}</p>
      {ov.data.assignments.map((a) => <div key={a.id} className="mb-4 rounded-xl border border-border bg-white p-5 card-soft"><div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1"><h2 className="text-[22px]">{a.title}</h2><span className="text-sm text-muted-foreground">{dueLabel(a.due_at)}</span></div>
        <ul className="mt-3 divide-y divide-border">{ov.data.recent_submissions.filter(() => true).map((s) => <li key={s.id}><Link to={`/teacher/submissions/${s.id}`} className="flex min-h-11 items-center gap-3 py-2.5 hover:bg-muted/50"><span className="flex-1 text-[15px] text-primary">{s.student}</span><span className="text-xs text-muted-foreground">{ago(s.submitted_at)}</span><Pill tone={s.state === "returned" ? "green" : "blue"}>{s.status}{s.state === "returned" && s.score != null ? ` · ${s.score}/${s.max_score}` : ""}</Pill></Link></li>)}</ul></div>)}
    </div>
  );
}

interface Detail { id: number; student: { id: number; name: string }; assignment: { id: string; title: string; max_score: number }; state: string; submitted_at: string | null;
  items: { id: string; index: number; prompt: string; code: string | null; answer: string; correct: boolean; misconception: string | null; expected: string; hints_used: number; wrong_checks: number }[];
  suggested_score: number; score: number | null; feedback: string | null; chats: { role: string; content: string }[][] }

export function SubmissionReview() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["submission", id], queryFn: () => get<Detail>(`/api/teacher/submissions/${id}`) });
  const [score, setScore] = useState<string>("");
  const [fb, setFb] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const grade = useMutation({
    mutationFn: () => post<{ badges_awarded: string[] }>(`/api/teacher/submissions/${id}/grade`, { score: Number(score), feedback: fb }),
    onSuccess: (r) => { setMsg(r.badges_awarded.length ? "Returned. The student earned the Loop Master badge." : "Returned to the student."); qc.invalidateQueries({ queryKey: ["submission", id] }); qc.invalidateQueries({ queryKey: ["teacher-overview"] }); },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : "Couldn't save."),
  });
  if (!q.data) return <Skeleton className="h-96" />;
  const d = q.data;
  const returned = d.state === "returned";
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <Link to="/teacher" className="mb-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to Teacher Center</Link>
      <h1 className="text-[36px]">{d.student.name}</h1><p className="mb-5 text-muted-foreground">{d.assignment.title} · {d.state === "returned" ? "Returned" : `Submitted ${ago(d.submitted_at)}`}</p>
      <div className="space-y-3">{d.items.map((x) => (
        <section key={x.id} className="rounded-xl border border-border bg-white p-5 card-soft">
          <div className="flex items-start justify-between gap-3"><h2 className="text-[19px]">Question {x.index}</h2><Pill tone={x.correct ? "green" : "rose"}>{x.correct ? "Correct" : "Incorrect"}</Pill></div>
          <p className="mt-1 text-[15px]">{x.prompt}</p>{x.code && <CodeBlock code={x.code} className="mt-2 max-w-md" />}
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4"><div><dt className="eyebrow">Student answer</dt><dd className="mt-0.5 font-mono">{x.answer || "—"}</dd></div><div><dt className="eyebrow">Expected</dt><dd className="mt-0.5 font-mono">{x.expected}</dd></div><div><dt className="eyebrow">Hints used</dt><dd className="mt-0.5">{x.hints_used}</dd></div><div><dt className="eyebrow">Wrong checks</dt><dd className="mt-0.5">{x.wrong_checks}</dd></div></dl>
          {x.misconception && <p className="mt-2 text-xs text-muted-foreground">Likely misconception: {x.misconception.replace(/-/g, " ")}</p>}
        </section>))}</div>
      {d.chats.length > 0 && <section className="mt-4 rounded-xl border border-border bg-white p-5"><h2 className="mb-2 text-[19px]">Tutor chats linked to this assignment</h2>{d.chats.map((c, n) => <ul key={n} className="mb-3 space-y-1 text-sm">{c.map((m, k) => <li key={k}><strong>{m.role === "user" ? d.student.name.split(" ")[0] : "Tutor"}:</strong> {m.content}</li>)}</ul>)}</section>}
      <section className="mt-4 rounded-xl border border-border bg-white p-5 card-soft" aria-label="Grade">
        <h2 className="mb-3 text-[20px]">Grade and feedback</h2>
        {returned ? <div><p className="font-serif text-lg text-primary">Returned · {d.score}/{d.assignment.max_score}</p><p className="mt-1 text-[15px]">{d.feedback}</p></div> : (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><label htmlFor="score" className="text-sm">Score (out of {d.assignment.max_score})</label><Input id="score" type="number" min={0} max={d.assignment.max_score} step="0.5" value={score} onChange={(e) => setScore(e.target.value)} className="h-10 w-24" placeholder={String(d.suggested_score)} />
              <Button variant="outline" size="sm" onClick={() => setScore(String(d.suggested_score))}>Use suggested ({d.suggested_score})</Button></div>
            <Textarea value={fb} onChange={(e) => setFb(e.target.value)} placeholder="Feedback for the student" aria-label="Feedback" rows={3} />
            <Button disabled={score === "" || grade.isPending} onClick={() => grade.mutate()}>Return to student</Button>
          </div>)}
        {msg && <p role="status" className="mt-3 text-sm text-[#14532d]">{msg}</p>}
      </section>
    </div>
  );
}


/** Demo only: the other views a visitor can open from the Teacher Center. Safety alerts never reach the class teacher, so the counselor's view is
 *  where a visitor sees the alert their own test message raised (in their private copy only). */
function DemoViews() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => get<{ user: User; demo?: boolean }>("/api/auth/me") });
  const qc = useQueryClient();
  if (!me.data?.demo) return null;
  async function go(role: "counselor" | "student") {
    try { await post("/api/demo/start", { role }); qc.clear(); window.location.assign("/"); }
    catch (e) { toast.error(e instanceof ApiError ? e.message : "That didn't work."); }
  }
  return (
    <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-labelledby="demo-views-h">
      <h2 id="demo-views-h" className="font-serif text-[20px] text-primary">Explore the demo</h2>
      <p className="mt-1 text-xs text-muted-foreground">Safety alerts go to the school's safety contact, never to the class teacher. Ask the tutor something worrying as the student, then open the counselor's view.</p>
      <div className="mt-4 space-y-2">
        <button onClick={() => go("counselor")} className="flex w-full items-center gap-3 rounded-lg bg-[#fbeef0] p-3 text-left hover:shadow"><ShieldAlert className="h-6 w-6 text-[#b4234b]" strokeWidth={1.5} /><div className="flex-1"><p className="text-[14px] font-medium text-primary">See the counselor view</p><p className="text-xs text-muted-foreground">Safety alerts raised by students' messages.</p></div><ArrowRight className="h-4 w-4" /></button>
        <button onClick={() => go("student")} className="flex w-full items-center gap-3 rounded-lg bg-[#eef4fd] p-3 text-left hover:shadow"><GraduationCap className="h-6 w-6 text-[#2b6cb0]" strokeWidth={1.5} /><div className="flex-1"><p className="text-[14px] font-medium text-primary">See the student view</p><p className="text-xs text-muted-foreground">The AI tutor and lessons, as a student sees them.</p></div><ArrowRight className="h-4 w-4" /></button>
      </div>
    </section>
  );
}
