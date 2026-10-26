import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, CircleHelp, Code2, Play, RotateCcw, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bar, CodeBlock, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, get, post } from "@/lib/api";
import { CodeEditor } from "@/features/CodeEditor";
import { runPython, stopPython } from "@/features/pyrunner";
import { TutorPanel } from "@/features/TutorPanel";
import { cn } from "@/lib/utils";

interface CheckQ { id: string; prompt: string; code: string; options: string[] }
interface LessonData {
  id: string; title: string; number: number; module: string; course: { id: string; title: string }; objective: string;
  sections: { id: string; title: string; text: string }[]; examples: { id: string; title: string; code: string; output: string }[];
  diagram: { title: string; steps: string[]; loop_label: string } | null; check_questions: CheckQ[]; try_it: { id: string; title: string; instructions: string; starter: string } | null;
  xp_on_complete: number; progress: { state: string; percent: number; steps: Record<string, boolean> };
}

function Inline({ text }: { text: string }) {
  // Wrap code-ish tokens (for, range(5), i) in <code> for the textbook look.
  return <>{text.split(/(\bfor \w+ in\b|\b(?:range\([^)]*\)|print\([^)]*\))(?:\([^)]*\))?)/g).map((p, i) => /^(for \w+ in|range\(|print\()/.test(p) ? <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.92em] text-primary">{p}</code> : p)}</>;
}

function LoopDiagram({ d }: { d: NonNullable<LessonData["diagram"]> }) {
  const box = "rounded-md border px-4 py-2.5 text-center text-[13px] leading-snug text-primary";
  return (
    <div className="rounded-xl border border-[#cfe0f7] bg-[#eef4fd] p-5" role="img" aria-label={`${d.title}: ${d.steps.join(", then ")}, ${d.loop_label}`}>
      <h3 className="mb-4 text-[18px]">{d.title}</h3>
      <div className="relative mx-auto flex w-[78%] flex-col items-center gap-3">
        <div className={cn(box, "w-[60%] border-[#b8cff0] bg-[#dbe8fb]")}>{d.steps[0]}</div>
        <span className="h-3 w-px bg-primary/50" />
        <div className={cn(box, "w-full border-[#f0d9a6] bg-[#fdf3d9]")}>{d.steps[1]}</div>
        <span className="h-3 w-px bg-primary/50" />
        <div className={cn(box, "w-full border-[#b7dcbf] bg-[#e3f4e6]")}>{d.steps[2]}</div>
        <span className="h-3 w-px bg-primary/50" />
        <div className={cn(box, "w-[60%] border-[#b8cff0] bg-[#dbe8fb]")}>{d.steps[3]}</div>
        <div className="absolute -right-[22%] top-[38%] w-[20%] text-center text-[11px] leading-tight text-[#374151]"><span className="mb-1 block text-lg" aria-hidden="true">↻</span>{d.loop_label}</div>
      </div>
    </div>
  );
}

function CheckCard({ lesson, q, done }: { lesson: string; q: CheckQ; done: boolean }) {
  const qc = useQueryClient();
  const [sel, setSel] = useState<number | null>(null);
  const [res, setRes] = useState<{ correct: boolean; explanation: string | null; feedback: string | null } | null>(null);
  const check = useMutation({
    mutationFn: (option: number) => post<{ correct: boolean; explanation: string | null; feedback: string | null }>(`/api/lessons/${lesson}/questions/${q.id}/check`, { option }),
    onSuccess: (r) => { setRes(r); qc.invalidateQueries({ queryKey: ["lesson", lesson] }); },
  });
  return (
    <div className="rounded-xl border border-border bg-white p-5 card-soft">
      <div className="mb-3 flex items-center gap-2 text-[15px] font-medium text-primary"><CircleHelp className="h-5 w-5 text-[#2b7a9a]" strokeWidth={1.6} />{q.id === "cq1" ? "Check Your Understanding" : "Quick check"}{done && <CheckCircle2 className="ml-auto h-5 w-5 text-okay" aria-label="Answered correctly" />}</div>
      <p className="mb-2 text-[14px] text-muted-foreground">{q.prompt}</p>
      {q.code && <CodeBlock code={q.code} className="mb-3" />}
      <div role="radiogroup" aria-label={q.prompt} className="grid grid-cols-2 gap-2">
        {q.options.map((o, i) => (
          <button key={o} role="radio" aria-checked={sel === i} onClick={() => { setSel(i); setRes(null); }}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-[14px] press", sel === i ? "border-primary bg-[#e4eefc]" : "border-border bg-white hover:bg-muted")}>
            <span className="grid h-5 w-5 place-items-center rounded-full border border-current text-[11px]">{"ABCD"[i]}</span>{o}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Button size="sm" disabled={sel === null || check.isPending} onClick={() => sel !== null && check.mutate(sel)}>Check answer</Button>
        {res && (
          <p role="status" className={cn("text-sm", res.correct ? "text-[#14532d]" : "text-[#8a1c2b]")}>
            {res.correct ? `Correct! ${res.explanation ?? ""}` : res.feedback}
          </p>
        )}
      </div>
    </div>
  );
}

function TryIt({ lesson, t }: { lesson: string; t: NonNullable<LessonData["try_it"]> }) {
  const qc = useQueryClient();
  const [code, setCode] = useState(t.starter);
  const [out, setOut] = useState("");
  const [running, setRunning] = useState(false);
  const step = useMutation({ mutationFn: () => post(`/api/lessons/${lesson}/progress`, { step: "try1" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson", lesson] }) });
  useEffect(() => () => stopPython(), []);
  async function run() {
    setRunning(true);
    setOut("");
    const r = await runPython(code, (c) => setOut((o) => o + c));
    setRunning(false);
    if (r.ok) step.mutate();
  }
  return (
    <div className="rounded-xl border border-border bg-white p-5 card-soft">
      <div className="mb-1 flex items-center gap-2 text-[15px] font-medium text-primary"><Code2 className="h-5 w-5" strokeWidth={1.6} />{t.title}</div>
      <p className="mb-3 text-[14px] text-muted-foreground">{t.instructions}</p>
      <CodeEditor value={code} onChange={setCode} label="Try it yourself: Python code" />
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={run} disabled={running}><Play className="mr-1.5 h-4 w-4" />{running ? "Running…" : "Run Code"}</Button>
        <Button size="sm" variant="outline" onClick={() => { setCode(t.starter); setOut(""); }}><RotateCcw className="mr-1.5 h-4 w-4" />Reset</Button>
      </div>
      <pre aria-live="polite" aria-label="Program output" className="code-block mt-3 min-h-[64px] whitespace-pre-wrap rounded-lg bg-primary p-3 text-[13px] text-[#e6edf7]">{out || <span className="text-white/50">Output appears here.</span>}</pre>
    </div>
  );
}

export default function Lesson() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["lesson", id], queryFn: () => get<LessonData>(`/api/lessons/${id}`), retry: false });
  const readMark = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const markRead = useMutation({ mutationFn: () => post(`/api/lessons/${id}/progress`, { step: "read" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["lesson", id] }) });
  const complete = useMutation({
    mutationFn: () => post<{ xp_awarded: number; xp_total: number; level: { name: string } }>(`/api/lessons/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["lesson", id] }); qc.invalidateQueries({ queryKey: ["progress"] }); qc.invalidateQueries({ queryKey: ["courses"] }); qc.invalidateQueries({ queryKey: ["continue"] }); },
  });

  // Reaching the end of the reading counts as "read" (the button stays as a keyboard-friendly alternative).
  const needRead = !!q.data && !q.data.progress.steps.read;
  useEffect(() => {
    if (!needRead || !endRef.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting && !readMark.current) { readMark.current = true; markRead.mutate(); } }, { threshold: 1 });
    obs.observe(endRef.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRead, q.data?.id]);

  if (q.isError) return <Empty title="This lesson isn't part of the demo yet" text={(q.error as ApiError).message} />;
  if (!q.data) return <Skeleton className="h-[600px] w-full" />;
  const l = q.data;
  const steps = l.progress.steps;
  const allDone = ["read", "cq1", "cq2", "cq3", "try1"].every((s) => steps[s]);
  const completed = l.progress.state === "completed";

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
          <Link to="/learn" className="hover:text-primary">Learning Lab</Link><ChevronRight className="h-3.5 w-3.5" />
          <Link to="/learn" className="hover:text-primary">{l.course.title}</Link><ChevronRight className="h-3.5 w-3.5" />
          <span>{l.module}</span><ChevronRight className="h-3.5 w-3.5" /><span aria-current="page" className="text-primary">Lesson {l.number}</span>
        </nav>
        <div className="flex items-center gap-3"><span>Your Progress</span><Bar value={l.progress.percent} className="w-[130px]" label="Lesson progress" /><span className="text-primary">{l.progress.percent}%</span></div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <article>
          <div className="mb-2 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#e5f0e7] text-[#2f7a55]"><Code2 className="h-7 w-7" strokeWidth={1.5} /></span>
            <div><p className="font-medium text-primary">{l.course.title}</p><p className="text-sm text-muted-foreground">{l.module} · Lesson {l.number}</p></div>
          </div>
          <h1 className="text-[44px] leading-tight">{l.title}</h1>
          <p className="mt-1 text-[16px] text-muted-foreground"><Inline text={l.objective} /></p>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_1fr]">
            <div>
              {l.sections.slice(0, 3).map((s, i) => (
                <section key={s.id} className="mb-5">
                  <h2 className="text-[22px]">{s.title}</h2>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[#374151]"><Inline text={s.text} /></p>
                  {i === 0 && l.examples[0] && <CodeBlock code={l.examples[0].code} className="mt-3" />}
                </section>
              ))}
            </div>
            {l.diagram && <div className="self-start"><LoopDiagram d={l.diagram} /></div>}
          </div>

          <div className="mb-6 grid grid-cols-1 gap-x-8 md:grid-cols-2">
            {l.sections.slice(3).map((s) => (
              <section key={s.id} className="mb-4">
                <h2 className="text-[20px]">{s.title}</h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#374151]"><Inline text={s.text} /></p>
              </section>
            ))}
          </div>
          <div className="mb-8">
            {l.examples[1] && <>
            <h2 className="text-[20px]">{l.examples[1].title}</h2>
            <CodeBlock code={l.examples[1].code} className="mt-2 max-w-xl" />
            <p className="mt-2 text-sm text-muted-foreground">Prints: <code className="font-mono">{l.examples[1].output}</code></p></>}
            {!steps.read && !readMark.current && <Button variant="outline" size="sm" className="mt-3" onClick={() => { readMark.current = true; markRead.mutate(); }}>I've read this lesson</Button>}
            <div ref={endRef} className="h-px" aria-hidden="true" />
            {steps.read && <p className="mt-3 flex items-center gap-1.5 text-sm text-[#14532d]"><CheckCircle2 className="h-4 w-4" />Reading done</p>}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">{l.check_questions.map((cq) => <CheckCard key={cq.id} lesson={l.id} q={cq} done={!!steps[cq.id]} />)}</div>
            {l.try_it && <TryIt lesson={l.id} t={l.try_it} />}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-white p-5 card-soft">
            <Trophy className="h-6 w-6 text-[#b8860b]" strokeWidth={1.5} />
            <div className="flex-1"><p className="font-medium text-primary">{completed ? "Lesson complete" : `+${l.xp_on_complete} XP when complete`}</p><p className="text-sm text-muted-foreground">{completed ? "Nice work — your progress is saved." : allDone ? "You've done every step." : (l.try_it ? "Finish reading, the checks and the code exercise." : "Finish reading and the checks.")}</p></div>
            {completed && complete.data && complete.data.xp_awarded > 0 && <p role="status" className="text-sm font-medium text-[#14532d]">+{complete.data.xp_awarded} XP</p>}
            <Button disabled={!allDone || completed || complete.isPending} onClick={() => complete.mutate()}>{completed ? "Completed" : "Complete lesson"}</Button>
          </div>
        </article>

        <div className="xl:sticky xl:top-[84px] xl:self-start">
          <TutorPanel context={{ type: "lesson", id: l.id }} suggestions={["Explain this more simply", "Can you give me another example?"]} />
        </div>
      </div>
    </div>
  );
}
