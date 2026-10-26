import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Ban, BookOpen, Calendar, CheckCircle2, ChevronLeft, ChevronRight, FileText, Lightbulb, Link2, ListChecks, MessageSquare, Pencil, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CodeBlock, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError, get, post, put } from "@/lib/api";
import { dueLabel } from "@/lib/format";
import { ChatInput, MessageList, ModeBadge, useTutor } from "@/features/tutor";
import { cn } from "@/lib/utils";

interface Q { id: string; index: number; prompt: string; code: string | null; kind: string; options?: string[] | null; hints_total: number; hints_used: number; last_check: boolean | null }
interface A {
  lesson: { id: string; title: string; available: boolean } | null;
  id: string; title: string; subject: string; instructions: string; due_at: string; set_by: string | null; max_score: number;
  help: { mode: string; badge: string; locked: boolean } | null; state: "draft" | "submitted" | "returned";
  answers: Record<string, string>; submitted_at: string | null; feedback: string | null; score: number | null; questions: Q[]; kind?: "homework" | "assessment";
}

function StatusCard({ a }: { a: A }) {
  // Exactly one state at a time: Draft -> Submitted -> Returned (docs/05).
  if (a.state === "draft") return <div className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 card-soft"><Pencil className="h-6 w-6 text-primary" /><div><p className="font-serif text-primary">In progress</p><p className="text-sm text-muted-foreground">Save a draft any time</p></div></div>;
  if (a.state === "submitted") return <div className="flex items-center gap-3 rounded-xl border border-[#cfe6d4] bg-[#eef7ef] px-4 py-3"><CheckCircle2 className="h-9 w-9 text-okay" /><div><p className="font-serif text-primary">Submitted</p><p className="text-sm text-[#374151]">Awaiting teacher review</p></div></div>;
  return <div className="flex items-center gap-3 rounded-xl border border-[#cfe6d4] bg-[#eef7ef] px-4 py-3"><CheckCircle2 className="h-9 w-9 text-okay" /><div><p className="font-serif text-primary">Returned · {a.score}/{a.max_score}</p><p className="text-sm text-[#374151]">See your teacher's feedback</p></div></div>;
}

export default function Assignment() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["assignment", id], queryFn: () => get<A>(`/api/assignments/${id}`) });
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; note: string | null }>>({});
  const [hint, setHint] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const ctx = useMemo(() => ({ type: "assignment" as const, id, question_id: q.data?.questions[i]?.id }), [id, i, q.data]);
  const tutor = useTutor(ctx);

  useEffect(() => { if (q.data) setAnswers(q.data.answers); }, [q.data]);
  const readOnly = q.data?.state !== "draft";

  const save = useMutation({ mutationFn: () => put(`/api/assignments/${id}/draft`, { answers }), onSuccess: () => { setSaved("Draft saved"); setTimeout(() => setSaved(null), 2500); qc.invalidateQueries({ queryKey: ["assignment", id] }); } });
  const submit = useMutation({
    mutationFn: async () => { await put(`/api/assignments/${id}/draft`, { answers }); return post(`/api/assignments/${id}/submit`); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["assignment", id] }); qc.invalidateQueries({ queryKey: ["assignments"] }); qc.invalidateQueries({ queryKey: ["continue"] }); },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Couldn't submit."),
  });
  const check = useMutation({
    mutationFn: (qid: string) => post<{ correct: boolean; note: string | null }>(`/api/assignments/${id}/questions/${qid}/check`, { answer: answers[qid] ?? "" }),
    onSuccess: (r, qid) => { setFeedback((f) => ({ ...f, [qid]: { ok: r.correct, note: r.note } })); qc.invalidateQueries({ queryKey: ["assignment", id] }); qc.invalidateQueries({ queryKey: ["progress"] }); },
  });
  const getHint = useMutation({
    mutationFn: (qid: string) => post<{ step: number; total: number; text: string | null; exhausted: boolean }>(`/api/assignments/${id}/questions/${qid}/hint`),
    onSuccess: (r, qid) => { setHint((h) => ({ ...h, [qid]: r.text ? `Hint ${r.step} of ${r.total}: ${r.text}` : "That's all the hints for this question. Try the steps again, or ask your teacher." })); qc.invalidateQueries({ queryKey: ["assignment", id] }); },
  });

  if (!q.data) return <Skeleton className="h-[500px] w-full" />;
  const a = q.data;
  const cur = a.questions[i];

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <Link to="/learn" className="mb-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />Back to Assignments</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[36px] leading-tight md:text-[42px]">Assignment: {a.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[15px] text-muted-foreground">
            <span className="flex items-center gap-2"><BookOpen className="h-5 w-5" strokeWidth={1.5} />{a.subject}</span>
            <span className="flex items-center gap-2"><User className="h-5 w-5" strokeWidth={1.5} />Assigned by {a.set_by}</span>
            <span className="flex items-center gap-2"><Calendar className="h-5 w-5" strokeWidth={1.5} />{dueLabel(a.due_at)}</span>
          </p>
        </div>
        <StatusCard a={a} />
      </div>

      {a.state === "returned" && a.feedback && (
        <div className="mb-5 rounded-xl border border-[#cfe6d4] bg-[#eef7ef] p-4"><p className="font-serif text-lg text-primary">Feedback from {a.set_by}</p><p className="mt-1 text-[15px] text-[#374151]">{a.feedback}</p></div>
      )}

      <Tabs defaultValue="instructions">
        <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-0 rounded-lg border border-border bg-white p-0 sm:grid-cols-4">
          {[["instructions", "Instructions", FileText], ["worksheet", "Worksheet", ListChecks], ["resources", "Resources", Link2], ["work", "Your Work", Pencil]].map(([v, l, Ic]) => {
            const I = Ic as typeof FileText;
            return <TabsTrigger key={v as string} value={v as string} className="h-12 gap-2 rounded-none py-3 text-[15px] first:rounded-l-lg last:rounded-r-lg data-[state=active]:bg-[#e4eefc] data-[state=active]:text-primary data-[state=active]:shadow-none"><I className="h-[18px] w-[18px]" strokeWidth={1.6} />{l as string}</TabsTrigger>;
          })}
        </TabsList>

        <TabsContent value="instructions">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <div className="rounded-xl border border-border bg-white p-6 card-soft">
                <p className="mb-4 text-[15px] text-muted-foreground">{a.instructions}</p>
                <div className="flex items-center justify-between">
                  <h2 className="text-[22px]">Question {i + 1} of {a.questions.length}</h2>
                  <div className="flex items-center gap-2">
                    <button aria-label="Previous question" disabled={i === 0} onClick={() => setI(i - 1)} className="grid h-9 w-9 place-items-center rounded-full bg-muted disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                    <span className="text-sm text-muted-foreground">{i + 1} / {a.questions.length}</span>
                    <button aria-label="Next question" disabled={i === a.questions.length - 1} onClick={() => setI(i + 1)} className="grid h-9 w-9 place-items-center rounded-full bg-[#e4eefc] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className="mt-3 text-[16px] text-[#374151]">{cur.prompt}</p>
                {cur.code && <CodeBlock code={cur.code} className="mt-3 max-w-lg" />}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <label htmlFor="ans" className="sr-only">Your answer to question {i + 1}</label>
                  {cur.options?.length ? (
                    <fieldset className="w-full"><legend className="sr-only">Choose one answer</legend><div className="grid max-w-md gap-2">
                      {cur.options.map((o) => (
                        <label key={o} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-[15px]", answers[cur.id] === o ? "border-primary bg-[#e9eff8]" : "border-border bg-white")}>
                          <input type="radio" name={`q-${cur.id}`} value={o} checked={answers[cur.id] === o} disabled={readOnly} onChange={() => setAnswers((x) => ({ ...x, [cur.id]: o }))} />{o}
                        </label>))}
                    </div></fieldset>
                  ) : <Input id="ans" value={answers[cur.id] ?? ""} readOnly={readOnly} onChange={(e) => setAnswers((x) => ({ ...x, [cur.id]: e.target.value }))} placeholder="Type your answer" className="h-12 max-w-sm text-[16px]" />}
                  {!readOnly && a.kind !== "assessment" && <Button variant="outline" disabled={!(answers[cur.id] ?? "").trim() || check.isPending} onClick={() => check.mutate(cur.id)}>Check answer</Button>}
                </div>
                {feedback[cur.id] && !readOnly && (
                  <p role="status" className={cn("mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm", feedback[cur.id].ok ? "bg-[var(--pill-green)] text-[var(--pill-green-fg)]" : "bg-alertbg text-[#8a1c2b]")}>
                    {feedback[cur.id].ok ? <><CheckCircle2 className="h-4 w-4" />That's right — well done.</> : <>Not quite yet. {feedback[cur.id].note ?? "Try again, or ask for a hint."}</>}
                  </p>
                )}
                {a.kind !== "assessment" && <p className="mt-4 flex items-center gap-2 rounded-lg bg-[#e9eff8] px-4 py-3 text-sm text-[#374151]"><Lightbulb className="h-5 w-5 text-primary" strokeWidth={1.5} />
                  {hint[cur.id] ? hint[cur.id] : <span><strong>Tip:</strong> {cur.code ? "Read the code line by line and write down what happens each time around the loop." : "Read the question twice, then work it out step by step."}</span>}</p>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Button variant="outline" className="h-11 px-5" disabled={readOnly || save.isPending} onClick={() => save.mutate()}><FileText className="mr-2 h-4 w-4" />Save Draft</Button>
                {saved && <span role="status" className="text-sm text-[#14532d]">{saved}</span>}
                {!readOnly && <Button className="h-11 px-6" disabled={submit.isPending} onClick={() => { setErr(null); submit.mutate(); }}>Submit Assignment <ArrowRight className="ml-2 h-4 w-4" /></Button>}
              </div>
              {err && <p role="alert" className="mt-2 text-sm text-[#8a1c2b]">{err}</p>}
            </div>

            {/* the help panel: hints and concept help only — the mode is a locked badge, never a switch */}
            <aside aria-label="Need help?" className="rounded-xl border border-[#dfe3f5] bg-[#f3f2fc] p-5">
              <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e4e0fb] text-primary"><MessageSquare className="h-6 w-6" strokeWidth={1.5} /></span>
                <div><h2 className="text-[22px]">Need help?</h2><p className="text-[14px] leading-snug text-[#3c4656]">I can give you a hint, explain the concept, or show you a similar example.</p></div></div>
              {a.help && <ModeBadge badge={a.help.badge} className="mt-3 text-[12px]" />}
              {a.kind === "assessment" ? <p className="mt-3 rounded-lg bg-white/70 p-3 text-[14px] text-[#374151]">This is an assessment, so hints and checking are off. Do your best, then submit. Your teacher will mark it.</p> : <>
              <div className="mt-3 space-y-2">
                {[
                  { label: "Give me a hint", run: () => getHint.mutate(cur.id), disabled: readOnly || getHint.isPending },
                  { label: "Explain the concept", run: () => tutor.send("Can you explain the concept behind this question?"), disabled: tutor.busy },
                  { label: "Show me a similar example", run: () => tutor.send("Can you show me a similar example with different numbers?"), disabled: tutor.busy },
                ].map((b) => (
                  <button key={b.label} onClick={b.run} disabled={b.disabled} className="flex w-full items-center justify-between rounded-lg border border-border bg-white px-4 py-2.5 text-left text-[14px] text-primary hover:bg-muted disabled:opacity-60">{b.label}<ArrowRight className="h-4 w-4" /></button>
                ))}
              </div>
              <MessageList messages={tutor.messages} queue={tutor.queue} compact className="mt-3 max-h-[320px] overflow-y-auto" onRate={tutor.rate} onSuggest={tutor.send} />
              <div className="mt-3"><ChatInput onSend={tutor.send} onStop={tutor.stop} busy={tutor.busy} placeholder="Ask about this question…" compact /></div>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#f0c9cf] bg-[#fbe9ec] p-3 text-[13px] text-[#8a1c2b]"><Ban className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} /><div><p className="font-serif">Not full answers during homework mode.</p><p className="text-[#5b3a40]">I won't give you the complete solution, but I can help you think it through.</p></div></div>
              </>}
            </aside>
          </div>
        </TabsContent>

        <TabsContent value="worksheet">
          <div className="space-y-3">{a.questions.map((x, n) => (
            <button key={x.id} onClick={() => setI(n)} className="flex w-full items-center gap-4 rounded-xl border border-border bg-white p-4 text-left card-soft">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e4eefc] font-medium text-primary">{x.index}</span>
              <div className="min-w-0 flex-1"><p className="text-[15px] text-primary">{x.prompt}</p><p className="text-xs text-muted-foreground">{a.answers[x.id] ? `Your answer: ${a.answers[x.id]}` : "Not answered yet"} · {x.hints_used}/{x.hints_total} hints used</p></div>
              {x.last_check === true && <Pill tone="green">Checked</Pill>}
            </button>))}</div>
        </TabsContent>
        <TabsContent value="resources"><div className="rounded-xl border border-border bg-white p-5"><p className="text-[15px]">Review the lesson this assignment is based on:</p>{a.lesson?.available ? <Button asChild variant="outline" className="mt-3"><Link to={`/learn/lessons/${a.lesson.id}`}><BookOpen className="mr-2 h-4 w-4" />{a.lesson.title}</Link></Button> : <p className="mt-2 text-sm text-muted-foreground">No lesson is linked to this assignment.</p>}</div></TabsContent>
        <TabsContent value="work">
          <div className="space-y-3">{a.questions.map((x) => <div key={x.id} className="rounded-xl border border-border bg-white p-4"><p className="text-sm text-muted-foreground">Question {x.index}</p><p className="mt-1 text-primary">{a.answers[x.id] || "—"}</p></div>)}</div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
