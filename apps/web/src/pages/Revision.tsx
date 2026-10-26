import { productName } from "@/lib/brand";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, Clock, FileText, GraduationCap, Layers, MessageSquare, RotateCcw, Target, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Bar, CodeBlock, IconBadge, PageHeader, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { get, post } from "@/lib/api";
import { ago, nf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GradeSubjects, useK12 } from "@/features/GradeCourses";
import { contentBands } from "@/lib/bands";
import { t } from "@/lib/i18n";
import { useUser } from "@/lib/session";

interface Overview {
  recommended: { topic: string; lesson_id: string; tags: string[]; why: string };
  weak_topics: { topic: string; concept: string; misses: number }[];
  past_lessons: { id: string; title: string; course: string; available: boolean; completed_at: string | null }[];
  counts: { questions: number; flashcards: number; answered: number };
  suggested_next: { topic: string; note: string };
}
interface Q { id: string; prompt: string; code: string | null; options: string[] }
interface Check { correct: boolean; explanation: string; note: string | null; answer_index: number }
interface Finish { score: number; total: number; xp_awarded: number; xp_already_today: boolean; suggested_next: { topic: string; note: string } }
type Left = "idle" | "sprint" | "practice" | "flashcards";
type Right = "weak" | "past" | "results";

const TILES: { id: string; title: string; text: string; icon: ReactNode; tint: string; ic: string }[] = [
  { id: "weak", title: "Weak Topics", text: "Focus on concepts that need more practice.", icon: <BarChart3 />, tint: "bg-progress-bg", ic: "bg-progress-icon" },
  { id: "past", title: "Past Lessons", text: "Revisit completed lessons and key concepts.", icon: <Clock />, tint: "bg-ask-bg", ic: "bg-ask-icon" },
  { id: "practice", title: "Practice Questions", text: "Try curated questions with instant feedback.", icon: <FileText />, tint: "bg-build-bg", ic: "bg-build-icon" },
  { id: "cards", title: "Flashcards", text: "Quick review with interactive flashcards.", icon: <Layers />, tint: "bg-learn-bg", ic: "bg-learn-icon" },
  { id: "quiz", title: "Ask AI to Quiz Me", text: "Generate a personalised quiz on any topic.", icon: <MessageSquare />, tint: "bg-explore-bg", ic: "bg-explore-icon" },
];

/** Practice (was the Revision page): a tab inside Learn (K-12 UI spec). It starts with practice for the student's grade (sets from
 *  the grade's courses, unfinished ones first); coding practice follows for the bands that learn Python. */
export default function Practice({ embedded = false }: { embedded?: boolean }) {
  const user = useUser();
  const coding = !user.band || contentBands(user).some((b) => b === "build" || b === "launch");
  const k12 = useK12();
  // EDU54 ships no library practice sets (they are Khan Academy in the AI Lab) and, so far, no grade courses: the grade
  // block appears only when there is something in it (docs/edu54/UI-UPDATES §6)
  const library = productName() === "Umanah AI Lab";
  const hasGrade = user.role === "student" && user.grade != null && (library || (k12.data?.grades[0]?.subjects.length ?? 0) > 0);
  return (
    <>
      {hasGrade && <GradePractice gradeLabel={user.grade_label ?? ""} library={library} />}
      {coding && <Revision embedded={embedded} />}
      {!hasGrade && !coding && <p className="mx-auto w-full max-w-[1440px] rounded-xl border border-border bg-white p-5 text-[15px] text-muted-foreground card-soft">{t("practice.none")}</p>}
    </>
  );
}

interface Practised { node_id: string; title: string; mastered: boolean; correct: number; attempts: number; updated_at: string }

function GradePractice({ gradeLabel, library }: { gradeLabel: string; library: boolean }) {
  const prog = useQuery({ queryKey: ["progress"], queryFn: () => get<{ practice?: Practised[] }>("/api/progress/me"), enabled: library });
  const k12 = useK12();
  const map = k12.data?.grades[0];
  // adaptive order: sets still being practised come first, the shakiest (lowest share right) at the top; mastered ones after
  const sets = [...(library ? prog.data?.practice ?? [] : [])].sort((a, b) => Number(a.mastered) - Number(b.mastered) || a.correct / Math.max(1, a.attempts) - b.correct / Math.max(1, b.attempts));
  return (
    <section aria-label={t("practice.gradeTitle", { grade: gradeLabel })} className="mx-auto mb-6 w-full max-w-[1440px]">
      <h2 className="text-[26px]">{t("practice.gradeTitle", { grade: gradeLabel })}</h2>
      <p className="mb-4 text-[15px] text-muted-foreground">{t("practice.gradeText")}</p>
      {sets.length > 0 && (
        <div className="mb-5 rounded-xl border border-border bg-white p-5 card-soft">
          <h3 className="mb-2 text-[19px]">{t("practice.keepGoing")}</h3>
          <ul className="divide-y divide-border">{sets.slice(0, 6).map((x) => (
            <li key={x.node_id}><Link to={`/explore?cat=library&open=${x.node_id}`} className="press -mx-2 flex min-h-12 items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted">
              <span className="flex-1 font-serif text-[16px] text-primary">{x.title}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{t("practice.right", { correct: x.correct, attempts: x.attempts })}</span>
              <Pill tone={x.mastered ? "green" : "blue"}>{x.mastered ? t("practice.mastered") : t("practice.practising")}</Pill>
              <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
            </Link></li>))}</ul>
        </div>)}
      <GradeSubjects map={map} title="" />
    </section>
  );
}

function Revision({ embedded = false }: { embedded?: boolean }) {
  const nav = useNavigate();
  const [left, setLeft] = useState<Left>("idle");
  const [right, setRight] = useState<Right>("weak");
  const [result, setResult] = useState<Finish | null>(null);
  const ov = useQuery({ queryKey: ["revision"], queryFn: () => get<Overview>("/api/revision/overview") });
  if (!ov.data) return <div className="mx-auto w-full max-w-[1440px]"><Skeleton className="h-64 w-full" /></div>;
  const o = ov.data;
  const pick = (id: string) => {
    if (id === "weak" || id === "past") { setRight(id); setResult(null); }
    else if (id === "practice") setLeft("practice");
    else if (id === "cards") setLeft("flashcards");
    else nav(`/ask?q=${encodeURIComponent(`Quiz me on ${o.recommended.topic.toLowerCase()}, one question at a time`)}`);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      {!embedded && <PageHeader title={productName() === "Umanah AI Lab" ? "Revision" : "Practice"} subtitle="Review key concepts, focus on weak topics, and build confidence with AI-powered practice." />}
      {embedded && <><h2 className="text-[26px]">{t("practice.pythonTitle")}</h2><p className="mb-4 text-[15px] text-muted-foreground">{t("practice.pythonText")}</p></>}
      <section aria-label="Recommended for you" className="mb-5 flex flex-wrap items-center gap-5 rounded-xl border border-[#dbeadf] bg-[#f1f7f2] p-5">
        <IconBadge className="h-16 w-16 bg-[#e0eee3]"><BookOpen className="h-8 w-8" strokeWidth={1.5} /></IconBadge>
        <div className="min-w-[260px] flex-1">
          <p className="eyebrow">Recommended for you</p>
          <h2 className="mt-0.5 text-[26px]">{o.recommended.topic}</h2>
          <p className="text-[15px] text-[#374151]">{o.recommended.why}</p>
          <div className="mt-2 flex flex-wrap gap-2">{o.recommended.tags.map((t) => <Pill key={t} tone={t === "Weak topic" ? "rose" : t === "High impact" ? "blue" : "green"}>{t}</Pill>)}</div>
        </div>
        <Button className="h-12 px-6 text-[15px]" onClick={() => { setResult(null); setLeft("sprint"); }}>Start 10-Minute Revision Sprint <ArrowRight className="ml-2 h-4 w-4" /></Button>
      </section>

      <ul className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label="Revision tools">
        {TILES.map((t) => (
          <li key={t.id} className="max-sm:last:col-span-2"><button onClick={() => pick(t.id)} className={cn("group relative flex h-full min-h-[170px] w-full flex-col items-center rounded-xl border border-border p-4 text-center card-press md:items-start md:text-left", t.tint)}>
            <span className={cn("grid h-12 w-12 place-items-center rounded-full text-primary [&>svg]:h-6 [&>svg]:w-6", t.ic)}>{t.icon}</span>
            <span className="mt-3 font-serif text-[19px] leading-tight text-primary">{t.title}</span>
            <span className="mt-1 max-w-[22ch] text-balance text-[14px] md:text-wrap leading-snug text-[#3c4656]">{t.text}</span>
            <span className={cn("mt-3 grid h-8 w-8 self-center md:absolute md:bottom-3 md:right-3 md:mt-0 md:self-auto place-items-center rounded-full", t.ic)}><ArrowRight className="h-4 w-4 text-primary" /></span>
          </button></li>))}
      </ul>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <Left mode={left} setMode={setLeft} overview={o} onFinish={(f) => { setResult(f); setRight("results"); ov.refetch(); }} />
        <div>
          {right === "results" && result ? <Results r={result} onNext={() => { setRight("weak"); setResult(null); }} />
            : right === "past" ? <PastLessons items={o.past_lessons} />
            : <WeakTopics items={o.weak_topics} onPractice={() => setLeft("practice")} />}
        </div>
      </div>
    </div>
  );
}

function Card({ title, sub, children, className }: { title: string; sub?: string; children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-border bg-white p-5 card-soft", className)}><h2 className="text-[22px]">{title}</h2>{sub && <p className="text-sm text-muted-foreground">{sub}</p>}<div className="mt-3">{children}</div></section>;
}

function WeakTopics({ items, onPractice }: { items: Overview["weak_topics"]; onPractice: () => void }) {
  return (
    <Card title="Weak Topics" sub="From your homework and revision answers in the last 30 days.">
      {items.length === 0 ? <p className="rounded-lg bg-[#eef7ef] p-4 text-[15px] text-[#14532d]">No weak topics yet. Do a revision sprint and this list will fill in from your answers.</p> : (
        <ul className="divide-y divide-border">{items.map((w) => (
          <li key={w.concept} className="flex items-center gap-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--pill-rose)] text-[var(--pill-rose-fg)]"><Target className="h-5 w-5" /></span>
            <div className="flex-1"><p className="font-medium capitalize text-primary">{w.concept}</p><p className="text-sm text-muted-foreground">{w.topic} · missed {w.misses} {w.misses === 1 ? "time" : "times"}</p></div>
            <Button variant="outline" size="sm" onClick={onPractice}>Practise</Button></li>))}</ul>)}
    </Card>
  );
}

function PastLessons({ items }: { items: Overview["past_lessons"] }) {
  return (
    <Card title="Past Lessons" sub="Lessons you have finished.">
      <ul className="divide-y divide-border">{items.map((l) => (
        <li key={l.id} className="flex items-center gap-3 py-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#e4eefc] text-primary"><GraduationCap className="h-5 w-5" /></span>
          <div className="flex-1"><p className="font-medium text-primary">{l.title}</p><p className="text-sm text-muted-foreground">{l.course}{l.completed_at ? ` · finished ${ago(l.completed_at)}` : ""}</p></div>
          {l.available ? <Button asChild variant="outline" size="sm"><Link to={`/learn/lessons/${l.id}`}>Review</Link></Button> : <Pill tone="gray">Summary coming soon</Pill>}</li>))}</ul>
    </Card>
  );
}

function Results({ r, onNext }: { r: Finish; onNext: () => void }) {
  const nav = useNavigate();
  return (
    <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label="Sprint results">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-okay text-white"><CheckCircle2 className="h-9 w-9" /></span>
        <div className="flex-1"><h2 className="text-[22px]">Revision Sprint Complete!</h2><p className="font-serif text-[34px] leading-none text-primary">{r.score}/{r.total} <span className="text-[22px]">correct</span></p></div>
        <p className="font-serif text-[26px] text-[#2f7d3a]">{r.xp_awarded ? `+${nf(r.xp_awarded)} XP` : "+0 XP"}</p>
      </div>
      <p className="mt-2 text-[15px] text-muted-foreground">{r.xp_already_today ? "Great practice. You already earned sprint XP today, so this one is just for learning." : r.score >= r.total - 1 ? "Great work! You're improving." : "Good effort. Practice makes it stick."}</p>
      <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#eef3fb] p-4"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#e4eefc] text-primary"><Target className="h-5 w-5" /></span>
        <div className="flex-1"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Suggested next topic</p><p className="font-serif text-[19px] text-primary">{r.suggested_next.topic}</p><p className="text-sm text-muted-foreground">{r.suggested_next.note}</p></div>
        <Button variant="outline" size="sm" onClick={() => nav("/learn")}>Open Learn</Button></div>
      <Button variant="ghost" className="mt-3" onClick={onNext}>Back to weak topics</Button>
    </section>
  );
}

function Left({ mode, setMode, overview, onFinish }: { mode: Left; setMode: (m: Left) => void; overview: Overview; onFinish: (f: Finish) => void }) {
  if (mode === "flashcards") return <Flashcards onClose={() => setMode("idle")} />;
  if (mode === "sprint" || mode === "practice") return <Runner key={mode} kind={mode} onClose={() => setMode("idle")} onFinish={onFinish} />;
  return (
    <Card title="Revision Sprint" sub="Five questions, about ten minutes.">
      <p className="text-[15px] text-[#374151]">Answer five short questions on <strong>{overview.recommended.topic.toLowerCase()}</strong>. You see the explanation after each answer, and earn XP for finishing (once a school day).</p>
      <div className="mt-4 flex flex-wrap gap-3"><Button onClick={() => setMode("sprint")}>Start sprint</Button><Button variant="outline" onClick={() => setMode("practice")}>Practice questions</Button><Button variant="outline" onClick={() => setMode("flashcards")}>Flashcards</Button></div>
      <p className="mt-4 text-xs text-muted-foreground">{overview.counts.questions} questions and {overview.counts.flashcards} flashcards on Lesson 6: Loops. You have answered {overview.counts.answered} so far.</p>
    </Card>
  );
}

function Runner({ kind, onClose, onFinish }: { kind: "sprint" | "practice"; onClose: () => void; onFinish: (f: Finish) => void }) {
  const qc = useQueryClient();
  const n = kind === "sprint" ? 5 : 10;
  const [seed] = useState(() => Math.random());          // a fresh set every time the sprint or practice is opened
  const qs = useQuery({ queryKey: ["revision-q", kind, seed], queryFn: () => get<{ questions: Q[] }>(`/api/revision/questions?n=${n}`), staleTime: Infinity, gcTime: 0 });
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [fb, setFb] = useState<Check | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const check = useMutation({
    mutationFn: (v: { q: Q; c: number }) => post<Check>("/api/revision/check", { question_id: v.q.id, choice: v.c, source: kind }),
    onSuccess: (r, v) => { setFb(r); setAnswers((a) => ({ ...a, [v.q.id]: v.c })); qc.invalidateQueries({ queryKey: ["revision"] }); },
    onError: () => toast.error("Couldn't check that answer. Try again."),
  });
  const fin = useMutation({ mutationFn: (a: Record<string, number>) => post<Finish>("/api/revision/sprint/finish", { answers: a }), onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["progress"] }); qc.invalidateQueries({ queryKey: ["home"] }); onFinish(r); onClose(); if (r.xp_awarded) toast.success(`+${r.xp_awarded} XP`); } });
  if (!qs.data) return <Card title={kind === "sprint" ? "Revision Sprint" : "Practice Questions"}><Skeleton className="h-52" /></Card>;
  const list = qs.data.questions;
  const q = list[i];
  const last = i === list.length - 1;
  const next = () => {
    if (last) { if (kind === "sprint") fin.mutate(answers); else onClose(); return; }
    setI(i + 1); setPicked(null); setFb(null);
  };
  return (
    <section className="rounded-xl border border-border bg-white p-5 card-soft" aria-label={kind === "sprint" ? "Revision sprint" : "Practice questions"}>
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#e4eefc] text-primary"><FileText className="h-5 w-5" /></span>
        <div><h2 className="text-[19px]">{kind === "sprint" ? "Revision Sprint" : "Practice Questions"}</h2><p className="text-sm text-muted-foreground">Question {i + 1} of {list.length}</p></div>
        <Bar value={((i + (fb ? 1 : 0)) / list.length) * 100} className="ml-4 flex-1" label="Sprint progress" /></div>
      <div className="mt-4 rounded-lg border border-border p-4">
        <p className="text-[16px] text-primary">{q.prompt}</p>
        {q.code && <CodeBlock code={q.code} className="mt-3 max-w-md" />}
        <div role="radiogroup" aria-label="Answers" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {q.options.map((o, k) => {
            const state = fb ? (k === fb.answer_index ? "right" : k === picked ? "wrong" : "idle") : k === picked ? "picked" : "idle";
            return <button key={k} role="radio" aria-checked={picked === k} disabled={!!fb || check.isPending} onClick={() => { setPicked(k); check.mutate({ q, c: k }); }}
              className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-[15px] press", state === "right" ? "border-[#7cc48a] bg-[#eaf7ed]" : state === "wrong" ? "border-[#e59aa4] bg-[#fdecee]" : state === "picked" ? "border-[#7fa1c7] bg-[#e4eefc]" : "border-border bg-white hover:bg-muted")}>
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[13px] font-medium", state === "right" ? "border-[#4db25b] bg-[#4db25b] text-white" : "border-border")}>{String.fromCharCode(65 + k)}</span>
              <span className="whitespace-pre-wrap font-mono text-[14px]">{o}</span></button>;
          })}
        </div>
        {fb && <p role="status" className={cn("mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm", fb.correct ? "bg-[var(--pill-green)] text-[var(--pill-green-fg)]" : "bg-alertbg text-[#8a1c2b]")}>
          {fb.correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}<span><strong>{fb.correct ? "Correct. " : "Not quite. "}</strong>{!fb.correct && fb.note ? `${fb.note} ` : ""}{fb.explanation}</span></p>}
      </div>
      <div className="mt-4 flex items-center justify-between"><Button variant="ghost" onClick={onClose}>Stop for now</Button><Button disabled={!fb || fin.isPending} onClick={next}>{last ? (kind === "sprint" ? "Finish sprint" : "Done") : "Next question"}<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
    </section>
  );
}

function Flashcards({ onClose }: { onClose: () => void }) {
  const cards = useQuery({ queryKey: ["flashcards"], queryFn: () => get<{ cards: { id: string; front: string; back: string }[] }>("/api/revision/flashcards") });
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!cards.data) return <Card title="Flashcards"><Skeleton className="h-52" /></Card>;
  const c = cards.data.cards[i];
  return (
    <Card title="Flashcards" sub={`Card ${i + 1} of ${cards.data.cards.length}. Click the card to flip it.`}>
      <button onClick={() => setFlip(!flip)} aria-label={flip ? "Show the question" : "Show the answer"} className={cn("grid min-h-[200px] w-full place-items-center rounded-xl border p-6 text-center press", flip ? "border-[#bcd1ee] bg-[#eef3fb]" : "border-border bg-[#f4f7f3]")}>
        <span key={`${i}-${flip}`} className="rise-in [--rise-y:3px]"><span className="mb-2 block text-xs uppercase tracking-[0.1em] text-muted-foreground">{flip ? "Answer" : "Question"}</span><span className="font-serif text-[22px] leading-snug text-primary">{flip ? c.back : c.front}</span></span></button>
      <div className="mt-4 flex items-center justify-between"><Button variant="ghost" onClick={onClose}>Close</Button>
        <div className="flex gap-2"><Button variant="outline" onClick={() => { setI((i + cards.data.cards.length - 1) % cards.data.cards.length); setFlip(false); }}>Previous</Button>
          <Button variant="outline" onClick={() => { setI(0); setFlip(false); }} aria-label="Start again"><RotateCcw className="h-4 w-4" /></Button>
          <Button onClick={() => { setI((i + 1) % cards.data.cards.length); setFlip(false); }}>Next card</Button></div></div>
    </Card>
  );
}
