import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardCheck, FileText, Plus, Trash2, TrendingDown } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Empty, PageHeader, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, get, post } from "@/lib/api";
import { ago, dueLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

// Teacher work: every assignment and assessment with its submissions, a builder for new ones (answer keys stay on the
// server; assessments always switch tutor help off), and the class Practice view.
interface Row { id: string; title: string; kind: "homework" | "assessment"; class_name: string; due_at: string; max_score: number; students: number; submitted: number; returned: number;
  submissions: { id: number; student: string; state: string; score: number | null; submitted_at: string | null }[] }
type Classes = { id: number; name: string }[];

export function TeacherAssignments() {
  const [params] = useSearchParams();
  const kind = params.get("kind") === "assessment" ? "assessment" : undefined;
  const d = useQuery({ queryKey: ["teacher-assignments", kind], queryFn: () => get<{ assignments: Row[]; classes: Classes }>(`/api/teacher/assignments${kind ? "?kind=assessment" : ""}`) });
  const title = kind ? "Assessments" : "Assignments";
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title={title} subtitle={kind ? "Quizzes and tests. The AI tutor is always off during an assessment, and answers can't be checked until you mark them." : "Homework and assessments for your classes, with every student's submission."}
        right={<Button asChild className="h-11"><Link to={`/teacher/assignments/new${kind ? "?kind=assessment" : ""}`}><Plus className="mr-2 h-4 w-4" />New {kind ? "assessment" : "assignment"}</Link></Button>} />
      {!d.data ? <Skeleton className="h-64" /> : d.data.assignments.length === 0 ? <Empty title={kind ? "No assessments yet" : "No assignments yet"} /> : (
        <div className="space-y-4">{d.data.assignments.map((a) => (
          <section key={a.id} aria-label={a.title} className="rounded-xl border border-border bg-white p-5 card-soft">
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e4eefc] text-primary">{a.kind === "assessment" ? <ClipboardCheck className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span>
              <h2 className="text-[22px]">{a.title}</h2><Pill tone={a.kind === "assessment" ? "amber" : "blue"}>{a.kind === "assessment" ? "Assessment" : "Homework"}</Pill>
              <span className="ml-auto text-sm text-muted-foreground">{a.class_name} · {dueLabel(a.due_at)}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{a.submitted} of {a.students} submitted · {a.returned} marked · {a.max_score} {a.max_score === 1 ? "question" : "questions"}</p>
            {a.submissions.length > 0 && <ul className="mt-2 divide-y divide-border">{a.submissions.map((s) => (
              <li key={s.id}><Link to={`/teacher/submissions/${s.id}`} className="flex min-h-11 items-center gap-3 py-2 hover:bg-muted/50"><span className="flex-1 text-[15px] text-primary">{s.student}</span>
                <span className="text-xs text-muted-foreground">{s.submitted_at ? ago(s.submitted_at) : ""}</span>
                <Pill tone={s.state === "returned" ? "green" : "blue"}>{s.state === "returned" ? `Marked${s.score != null ? ` · ${s.score}/${a.max_score}` : ""}` : "To mark"}</Pill></Link></li>))}</ul>}
          </section>))}</div>)}
    </div>
  );
}

interface QDraft { prompt: string; kind: "number" | "text" | "choice"; answer: string; options: string[]; hints: string; also: string }
const blank = (): QDraft => ({ prompt: "", kind: "text", answer: "", options: ["", ""], hints: "", also: "" });

export function AssignmentBuilder() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const classes = useQuery({ queryKey: ["teacher-assignments", undefined], queryFn: () => get<{ assignments: Row[]; classes: Classes }>("/api/teacher/assignments") });
  const [kind, setKind] = useState<"homework" | "assessment">(params.get("kind") === "assessment" ? "assessment" : "homework");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [classId, setClassId] = useState<number | null>(null);
  const [due, setDue] = useState(() => new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10));
  const [policy, setPolicy] = useState("hints_only");
  const [qs, setQs] = useState<QDraft[]>([blank()]);
  const upd = (i: number, p: Partial<QDraft>) => setQs((x) => x.map((q, n) => (n === i ? { ...q, ...p } : q)));
  const cid = classId ?? classes.data?.classes[0]?.id ?? null;
  const save = useMutation({
    mutationFn: () => post<{ id: string }>("/api/teacher/assignments", {
      class_id: cid, title, kind, instructions, due_at: new Date(`${due}T23:59:00`).toISOString(), ai_help_policy: policy,
      questions: qs.map((q) => ({ prompt: q.prompt, kind: q.kind, answer: q.answer, options: q.kind === "choice" ? q.options.filter((o) => o.trim()) : [],
        hints: kind === "homework" ? q.hints.split("\n").filter((h) => h.trim()) : [], also_accept: q.kind === "text" ? q.also.split(",").map((s) => s.trim()).filter(Boolean) : [] })),
    }),
    onSuccess: () => { toast.success(kind === "assessment" ? "Assessment created" : "Assignment created"); qc.invalidateQueries({ queryKey: ["teacher-assignments"] }); nav(kind === "assessment" ? "/teacher/assignments?kind=assessment" : "/teacher/assignments"); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Check each question: it needs a prompt and an answer (choice answers must be one of the options)."),
  });
  const ready = title.trim() && cid && qs.every((q) => q.prompt.trim() && q.answer.trim() && (q.kind !== "choice" || q.options.filter((o) => o.trim()).includes(q.answer.trim())));
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <Link to="/teacher/assignments" className="mb-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Assignments</Link>
      <PageHeader title={kind === "assessment" ? "New assessment" : "New assignment"} subtitle="Answer keys stay on the device's server. Students never see them, and the tutor never gets them." />
      <section className="space-y-4 rounded-xl border border-border bg-white p-5 card-soft" aria-label="Details">
        <div role="radiogroup" aria-label="Type" className="inline-flex rounded-lg border border-border p-1">
          {(["homework", "assessment"] as const).map((k) => <button key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={cn("rounded-md px-4 py-1.5 text-sm", kind === k ? "bg-primary text-white" : "text-primary")}>{k === "homework" ? "Homework" : "Assessment"}</button>)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-2"><Label htmlFor="at">Title</Label><Input id="at" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 h-11" /></div>
          <div><Label htmlFor="ad">Due</Label><Input id="ad" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1.5 h-11" /></div>
          <div><Label htmlFor="ac">Class</Label><select id="ac" value={cid ?? ""} onChange={(e) => setClassId(Number(e.target.value))} className="mt-1.5 h-11 w-full rounded-md border border-input bg-white px-3">{classes.data?.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="md:col-span-2"><Label htmlFor="ap">AI tutor help</Label>
            {kind === "assessment" ? <p id="ap" className="mt-1.5 flex h-11 items-center rounded-md bg-muted px-3 text-sm text-muted-foreground">Off: the tutor never helps during an assessment.</p>
              : <select id="ap" value={policy} onChange={(e) => setPolicy(e.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-input bg-white px-3"><option value="hints_only">Hints only (recommended)</option><option value="open">Explanations allowed</option><option value="none">Off</option></select>}</div>
        </div>
        <div><Label htmlFor="ai">Instructions</Label><Textarea id="ai" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="mt-1.5" /></div>
      </section>
      <ol className="mt-5 space-y-4">{qs.map((q, i) => (
        <li key={i} aria-label={`Question ${i + 1}`} className="rounded-xl border border-border bg-white p-5 card-soft">
          <div className="flex items-center gap-3"><h2 className="text-[20px]">Question {i + 1}</h2>
            <select aria-label={`Question ${i + 1} type`} value={q.kind} onChange={(e) => upd(i, { kind: e.target.value as QDraft["kind"] })} className="h-9 rounded-md border border-input bg-white px-2 text-sm"><option value="text">Short answer</option><option value="number">Number</option><option value="choice">Multiple choice</option></select>
            {qs.length > 1 && <Button variant="ghost" className="ml-auto h-8 w-8 p-0" aria-label={`Remove question ${i + 1}`} onClick={() => setQs((x) => x.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></Button>}</div>
          <Label htmlFor={`qp${i}`} className="mt-3 block">Question</Label><Textarea id={`qp${i}`} rows={2} value={q.prompt} onChange={(e) => upd(i, { prompt: e.target.value })} className="mt-1.5" />
          {q.kind === "choice" && <div className="mt-3 space-y-2"><p className="text-sm font-medium">Options (pick the right one)</p>{q.options.map((o, n) => (
            <div key={n} className="flex items-center gap-2"><input type="radio" aria-label={`Option ${n + 1} is the answer`} checked={!!o.trim() && q.answer === o} onChange={() => upd(i, { answer: o })} />
              <Input aria-label={`Option ${n + 1}`} value={o} onChange={(e) => { const opts = [...q.options]; opts[n] = e.target.value; upd(i, { options: opts, answer: q.answer === o ? e.target.value : q.answer }); }} className="h-10" /></div>))}
            {q.options.length < 6 && <Button variant="outline" size="sm" onClick={() => upd(i, { options: [...q.options, ""] })}>Add option</Button>}</div>}
          {q.kind !== "choice" && <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div><Label htmlFor={`qa${i}`}>Answer key</Label><Input id={`qa${i}`} value={q.answer} onChange={(e) => upd(i, { answer: e.target.value })} inputMode={q.kind === "number" ? "decimal" : undefined} className="mt-1.5 h-10" /></div>
            {q.kind === "text" && <div><Label htmlFor={`qo${i}`}>Also accept (comma separated)</Label><Input id={`qo${i}`} value={q.also} onChange={(e) => upd(i, { also: e.target.value })} className="mt-1.5 h-10" /></div>}</div>}
          {kind === "homework" && <div className="mt-3"><Label htmlFor={`qh${i}`}>Hints, one per line (students open them one at a time)</Label><Textarea id={`qh${i}`} rows={2} value={q.hints} onChange={(e) => upd(i, { hints: e.target.value })} className="mt-1.5" /></div>}
        </li>))}</ol>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setQs((x) => [...x, blank()])}><Plus className="mr-2 h-4 w-4" />Add question</Button>
        <Button className="ml-auto h-11 px-6" disabled={!ready || save.isPending} onClick={() => save.mutate()}>Create {kind === "assessment" ? "assessment" : "assignment"}</Button>
      </div>
    </div>
  );
}

interface Topic { concept: string; percent: number; answered: number; students: number; struggling: { id: number; name: string; correct: number; answered: number }[] }

export function TeacherPractice() {
  const [cid, setCid] = useState<number | null>(null);
  const d = useQuery({ queryKey: ["teacher-practice", cid], queryFn: () => get<{ class: { id: number; name: string; students: number } | null; topics: Topic[]; classes: Classes }>(`/api/teacher/practice${cid ? `?class_id=${cid}` : ""}`) });
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title="Practice" subtitle="What your class finds hard, from their practice questions and revision sprints. Weakest topics first." />
      {d.data && d.data.classes.length > 1 && <select aria-label="Class" value={d.data.class?.id} onChange={(e) => setCid(Number(e.target.value))} className="mb-4 h-10 rounded-md border border-input bg-white px-3">{d.data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>}
      {!d.data ? <Skeleton className="h-64" /> : d.data.topics.length === 0 ? <Empty title="No practice answers yet" /> : (
        <div className="space-y-3">{d.data.topics.map((t) => (
          <section key={t.concept} aria-label={t.concept} className="rounded-xl border border-border bg-white p-5 card-soft">
            <div className="flex flex-wrap items-center gap-3"><h2 className="text-[20px]">{t.concept}</h2>
              <Pill tone={t.percent < 50 ? "rose" : t.percent < 75 ? "amber" : "green"}>{t.percent}% right</Pill>
              <span className="ml-auto text-sm text-muted-foreground">{t.answered} answers from {t.students} {t.students === 1 ? "student" : "students"}</span></div>
            {t.struggling.length > 0 && <p className="mt-2 flex flex-wrap items-center gap-2 text-sm"><TrendingDown className="h-4 w-4 text-rose-600" />Needs help:
              {t.struggling.map((s) => <Link key={s.id} to={`/teacher/students/${s.id}`} className="text-primary hover:underline">{s.name} ({s.correct}/{s.answered})</Link>)}</p>}
          </section>))}</div>)}
    </div>
  );
}
