import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Empty, PageHeader, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, get, post } from "@/lib/api";

// AI Lesson Builder: the local AI drafts, the teacher checks and edits every fact and answer, then publishes. Students see a
// lesson only after it is published (in Learn, "From Your Teachers").
interface CQ { prompt: string; options: string[]; answer_index: number; explanation: string }
interface LessonDraft { title: string; objective: string; sections: { title: string; text: string }[]; check_questions: CQ[] }
interface Saved { id: string; title: string; grade: number | null; grade_label: string | null; status: "draft" | "published"; updated_at: string; lesson: LessonDraft }
const GRADES = ["Kindergarten", ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)];
const say = (e: unknown) => toast.error(e instanceof ApiError ? e.message : "That didn't work.");

export function LessonBuilder() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["custom-lessons"], queryFn: () => get<{ lessons: Saved[] }>("/api/teacher/lessons") });
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState(7);
  const [notes, setNotes] = useState("");
  const [job, setJob] = useState<string | null>(null);
  const [draft, setDraft] = useState<LessonDraft | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [flag, setFlag] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const start = useMutation({ mutationFn: () => post<{ id: string; state: string }>("/api/teacher/lessons/draft", { topic, grade, notes }),
    onSuccess: (r) => { setDraft(null); setEditing(null); setJob(r.id); setSeconds(0); }, onError: say });
  const status = useQuery({ queryKey: ["lesson-draft", job], enabled: !!job, refetchInterval: 3000,
    queryFn: () => get<{ state: string; draft?: LessonDraft; flag?: string | null; message?: string }>(`/api/teacher/lessons/draft/${job}`) });
  useEffect(() => {
    const s = status.data;
    if (!s || s.state === "working") return;
    setJob(null);
    if (s.state === "done" && s.draft) { setDraft(s.draft); setFlag(s.flag ?? null); } else toast.error(s.message ?? "The draft didn't work. Try again.");
  }, [status.data]);
  useEffect(() => { if (!job) return; const t = setInterval(() => setSeconds((x) => x + 1), 1000); return () => clearInterval(t); }, [job]);

  const save = useMutation({
    mutationFn: (publish: boolean) => editing ? api<Saved>(`/api/teacher/lessons/${editing}`, { method: "PUT", json: { grade, lesson: draft, publish } }) : post<Saved>("/api/teacher/lessons", { grade, lesson: draft, publish }),
    onSuccess: (r) => { toast.success(r.status === "published" ? "Published: students see it in Learn" : "Saved as a draft"); setEditing(r.id); qc.invalidateQueries({ queryKey: ["custom-lessons"] }); }, onError: say,
  });
  const unpublish = useMutation({ mutationFn: (id: string) => post(`/api/teacher/lessons/${id}/unpublish`), onSuccess: () => { toast.success("Hidden from students"); qc.invalidateQueries({ queryKey: ["custom-lessons"] }); }, onError: say });
  const set = (p: Partial<LessonDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));
  const setQ = (i: number, p: Partial<CQ>) => set({ check_questions: draft!.check_questions.map((q, n) => (n === i ? { ...q, ...p } : q)) });
  const ok = draft && draft.title.trim() && draft.objective.trim() && draft.sections.every((s) => s.title.trim() && s.text.trim()) && draft.check_questions.every((q) => q.prompt.trim() && q.options.every((o) => o.trim()));

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader title="AI Lesson Builder" subtitle="Describe a lesson. The AI on this device drafts it; you check every fact and answer, edit, then publish. Nothing leaves the device." />
      <section aria-label="Describe the lesson" className="rounded-xl border border-border bg-white p-5 card-soft">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
          <div><Label htmlFor="lt">Topic</Label><Input id="lt" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="For example: The water cycle" className="mt-1.5 h-11" /></div>
          <div><Label htmlFor="lg">Grade</Label><select id="lg" value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="mt-1.5 h-11 w-full rounded-md border border-input bg-white px-3">{GRADES.map((g, i) => <option key={g} value={i}>{g}</option>)}</select></div>
        </div>
        <div className="mt-3"><Label htmlFor="ln">Notes for the AI (optional)</Label><Textarea id="ln" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What to cover, words to use, examples your class knows" className="mt-1.5" /></div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button className="h-11" disabled={topic.trim().length < 2 || !!job || start.isPending} onClick={() => start.mutate()}><Wand2 className="mr-2 h-4 w-4" />{job ? "Drafting…" : "Draft with AI"}</Button>
          <Button variant="outline" className="h-11" disabled={!!job} onClick={() => { setEditing(null); setFlag(null); setDraft({ title: topic || "New lesson", objective: "By the end of this lesson, you will be able to ", sections: [{ title: "", text: "" }], check_questions: [{ prompt: "", options: ["", "", "", ""], answer_index: 0, explanation: "" }] }); }}>Write it myself</Button>
          {job && <p role="status" className="text-sm text-muted-foreground"><Sparkles className="mr-1 inline h-4 w-4" />The AI is writing ({seconds} s). This usually takes one to two minutes on this device.</p>}
        </div>
      </section>

      {draft && (
        <section aria-label="Edit the lesson" className="mt-5 space-y-4">
          <p className="flex items-start gap-2 rounded-lg bg-[#fbf3e2] p-3 text-sm text-[#5a4210]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Check every fact and every right answer. The AI can make mistakes, and students will see exactly what you publish.</p>
          {flag && <p role="alert" className="rounded-lg bg-[#fbe9ec] p-3 text-sm text-[#8a1c2b]">Some text didn't pass the safety check ({flag}). Edit it before publishing.</p>}
          <div className="rounded-xl border border-border bg-white p-5 card-soft">
            <Label htmlFor="et">Title</Label><Input id="et" value={draft.title} onChange={(e) => set({ title: e.target.value })} className="mt-1.5 h-11" />
            <Label htmlFor="eo" className="mt-3 block">Objective</Label><Textarea id="eo" rows={2} value={draft.objective} onChange={(e) => set({ objective: e.target.value })} className="mt-1.5" />
          </div>
          {draft.sections.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-5 card-soft">
              <div className="flex items-center gap-2"><h2 className="text-[18px]">Section {i + 1}</h2>{draft.sections.length > 1 && <Button variant="ghost" className="ml-auto h-8 w-8 p-0" aria-label={`Remove section ${i + 1}`} onClick={() => set({ sections: draft.sections.filter((_, n) => n !== i) })}><Trash2 className="h-4 w-4" /></Button>}</div>
              <Input aria-label={`Section ${i + 1} heading`} value={s.title} onChange={(e) => set({ sections: draft.sections.map((x, n) => (n === i ? { ...x, title: e.target.value } : x)) })} className="mt-2 h-10" />
              <Textarea aria-label={`Section ${i + 1} text`} rows={3} value={s.text} onChange={(e) => set({ sections: draft.sections.map((x, n) => (n === i ? { ...x, text: e.target.value } : x)) })} className="mt-2" />
            </div>))}
          {draft.sections.length < 8 && <Button variant="outline" onClick={() => set({ sections: [...draft.sections, { title: "", text: "" }] })}><Plus className="mr-2 h-4 w-4" />Add section</Button>}
          {draft.check_questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border bg-white p-5 card-soft">
              <div className="flex items-center gap-2"><h2 className="text-[18px]">Check question {i + 1}</h2>{draft.check_questions.length > 1 && <Button variant="ghost" className="ml-auto h-8 w-8 p-0" aria-label={`Remove question ${i + 1}`} onClick={() => set({ check_questions: draft.check_questions.filter((_, n) => n !== i) })}><Trash2 className="h-4 w-4" /></Button>}</div>
              <Textarea aria-label={`Question ${i + 1}`} rows={2} value={q.prompt} onChange={(e) => setQ(i, { prompt: e.target.value })} className="mt-2" />
              <fieldset className="mt-2 space-y-2"><legend className="text-sm text-muted-foreground">Options: pick the right one</legend>
                {q.options.map((o, n) => <div key={n} className="flex items-center gap-2"><input type="radio" name={`cq${i}`} aria-label={`Option ${n + 1} of question ${i + 1} is right`} checked={q.answer_index === n} onChange={() => setQ(i, { answer_index: n })} />
                  <Input aria-label={`Option ${n + 1} of question ${i + 1}`} value={o} onChange={(e) => setQ(i, { options: q.options.map((x, m) => (m === n ? e.target.value : x)) })} className="h-10" /></div>)}</fieldset>
              <Input aria-label={`Explanation for question ${i + 1}`} value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} placeholder="Why the right answer is right" className="mt-2 h-10" />
            </div>))}
          {draft.check_questions.length < 6 && <Button variant="outline" onClick={() => set({ check_questions: [...draft.check_questions, { prompt: "", options: ["", "", "", ""], answer_index: 0, explanation: "" }] })}><Plus className="mr-2 h-4 w-4" />Add question</Button>}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" className="h-11" disabled={!ok || save.isPending} onClick={() => save.mutate(false)}>Save draft</Button>
            <Button className="h-11" disabled={!ok || save.isPending} onClick={() => save.mutate(true)}><CheckCircle2 className="mr-2 h-4 w-4" />I've checked it: publish</Button>
          </div>
        </section>)}

      <section aria-label="Your lessons" className="mt-8">
        <h2 className="mb-3 text-[24px]">Your lessons</h2>
        {!list.data ? <Skeleton className="h-24" /> : list.data.lessons.length === 0 ? <Empty title="No lessons yet" /> : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-white card-soft">{list.data.lessons.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-4">
              <span className="flex-1 font-serif text-[18px] text-primary">{l.title}</span>
              {l.grade_label && <span className="text-sm text-muted-foreground">{l.grade_label}</span>}
              <Pill tone={l.status === "published" ? "green" : "gray"}>{l.status === "published" ? "Published" : "Draft"}</Pill>
              <Button variant="outline" size="sm" onClick={() => { setEditing(l.id); setGrade(l.grade ?? 7); setDraft(l.lesson); setFlag(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>
              {l.status === "published" && <Button variant="ghost" size="sm" onClick={() => unpublish.mutate(l.id)}>Hide from students</Button>}
            </li>))}</ul>)}
      </section>
    </div>
  );
}
