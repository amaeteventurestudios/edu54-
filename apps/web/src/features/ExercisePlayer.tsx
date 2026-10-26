import "katex/dist/katex.min.css";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Lightbulb, Star, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { get, post } from "@/lib/api";
import { cn } from "@/lib/utils";

// Practice exercises from the School Library (Khan Academy, Perseus format). The server sends the question without its
// answers and checks every answer itself; this component only lays the question out.
type Widget =
  | { type: "radio"; multiple: boolean; choices: string[] }
  | { type: "dropdown"; choices: string[] }
  | { type: "number"; label: string }
  | { type: "expression" }
  | { type: "image"; url: string; alt: string; caption: string }
  | { type: "note"; label: string; text: string };
interface Item { content: string; widgets: Record<string, Widget>; hints: number }
interface Exercise { title: string; items: string[]; mastery: { m: number; n: number }; progress: { recent: string; mastered: boolean } }
type Answer = string | number | number[] | null;

const schema = {
  ...defaultSchema,
  protocols: { ...defaultSchema.protocols, src: ["http", "https"] },
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ["className", "math-inline", "math-display"]],
    span: [...(defaultSchema.attributes?.span ?? []), ["className", "math", "math-inline", "math-display"]],
    div: [...(defaultSchema.attributes?.div ?? []), ["className", "math", "math-display"]],
  },
} as typeof defaultSchema;
const WIDGET = /\[\[☃ ([^\]]+)\]\]/g;
// Perseus writes \dfrac, \blueD{...} and similar; KaTeX knows \dfrac, the colour macros are mapped to plain text colour.
const tidy = (s: string) => s.replace(/\*\*\s*([^*]+?)\s*\*\*/g, "**$1**").replace(/\\(blue|green|red|gold|purple|teal|maroon|gray|pink|orange)[A-F]?\{/g, "{").replace(/\\(?:qquad|quad)/g, " \\quad ");

function Md({ text, widget }: { text: string; widget?: (id: string) => React.ReactNode }) {
  const components: Components = {
    code: ({ children, className }) => {
      const t = String(children ?? "");
      if (widget && t.startsWith("W:")) return <>{widget(t.slice(2))}</>;
      return <code className={className}>{children}</code>;
    },
    img: ({ src, alt }) => (typeof src === "string" && src.startsWith("/api/library/exercises/") ? <img src={src} alt={alt ?? ""} className="my-2 inline-block max-h-[320px] max-w-full" /> : null),
    p: ({ children }) => <p className="my-2">{children}</p>,
  };
  return <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeSanitize, schema], rehypeKatex]} components={components}>{tidy(text).replace(WIDGET, (_, id) => `\`W:${id}\``)}</ReactMarkdown>;
}

export function ExercisePlayer({ nodeId }: { nodeId: string }) {
  const ex = useQuery({ queryKey: ["exercise", nodeId], queryFn: () => get<Exercise>(`/api/library/exercises/${nodeId}`) });
  const [i, setI] = useState(0);
  const [recent, setRecent] = useState("");
  const [mastered, setMastered] = useState<{ xp: number } | null>(null);
  useEffect(() => { if (ex.data) { setRecent(ex.data.progress.recent); setI(0); setMastered(null); } }, [ex.data]);
  if (ex.isError) return <p className="m-auto p-8 text-center text-sm text-muted-foreground">This practice set can't be opened here.</p>;
  if (!ex.data) return <Skeleton className="m-4 flex-1" />;
  if (ex.data.items.length === 0) return <p className="m-auto max-w-sm p-8 text-center text-sm text-muted-foreground">The questions in this set use drawing tools this device can't show yet. Try the next practice set.</p>;
  const { m, n } = ex.data.mastery;
  const itemId = ex.data.items[i % ex.data.items.length];
  return (
    <div className="flex w-full flex-1 flex-col p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">Get {m} of the last {n} right to master this set.</p>
        <span className="ml-auto flex gap-1" aria-label={`Recent answers: ${recent.split("").filter((x) => x === "1").length} right of ${recent.length}`}>
          {Array.from({ length: n }, (_, k) => recent[k]).map((r, k) => <span key={k} className={cn("h-3 w-3 rounded-full", r === "1" ? "bg-okay" : r === "0" ? "bg-rose-400" : "bg-track")} />)}
        </span>
      </div>
      {(mastered || ex.data.progress.mastered) && <p role="status" className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--pill-green)] px-4 py-2 text-sm text-[var(--pill-green-fg)]"><Star className="h-4 w-4" />Mastered{mastered?.xp ? `: +${mastered.xp} XP` : ""}. Keep practising, or pick the next set.</p>}
      <Question key={`${itemId}-${i}`} nodeId={nodeId} itemId={itemId} number={i + 1} onResult={(r) => { setRecent(r.recent); if (r.mastered) setMastered({ xp: r.xp }); }} onNext={() => setI((x) => x + 1)} />
    </div>
  );
}

function Question({ nodeId, itemId, number, onResult, onNext }: { nodeId: string; itemId: string; number: number; onResult: (r: { recent: string; mastered: boolean; xp: number }) => void; onNext: () => void }) {
  const q = useQuery({ queryKey: ["exercise-item", nodeId, itemId], queryFn: () => get<Item>(`/api/library/exercises/${nodeId}/items/${itemId}`) });
  const [ans, setAns] = useState<Record<string, Answer>>({});
  const [hints, setHints] = useState<string[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const check = useMutation({
    mutationFn: () => post<{ correct: boolean; mastered: boolean; xp: number; progress?: { recent: string } }>(`/api/library/exercises/${nodeId}/items/${itemId}/check`, { answers: ans, hints_used: hints.length }),
    onSuccess: (r) => { setResult(r.correct); if (r.progress) onResult({ recent: r.progress.recent, mastered: r.mastered, xp: r.xp }); },
  });
  const hint = useMutation({ mutationFn: () => get<{ text: string }>(`/api/library/exercises/${nodeId}/items/${itemId}/hints/${hints.length}`), onSuccess: (r) => setHints((h) => [...h, r.text]) });
  const answerable = useMemo(() => Object.entries(q.data?.widgets ?? {}).filter(([, w]) => ["radio", "dropdown", "number", "expression"].includes(w.type)), [q.data]);
  if (!q.data) return <Skeleton className="h-48" />;
  const filled = answerable.every(([id, w]) => { const a = ans[id]; return w.type === "radio" ? Array.isArray(a) && a.length > 0 : w.type === "dropdown" ? typeof a === "number" && a > 0 : typeof a === "string" && a.trim() !== ""; });
  const set = (id: string, v: Answer) => { setAns((x) => ({ ...x, [id]: v })); setResult(null); };

  const widget = (id: string) => {
    const w = q.data!.widgets[id];
    if (!w) return null;
    if (w.type === "number" || w.type === "expression")
      return <Input aria-label={w.type === "number" ? (w.label || `Answer ${id}`) : `Expression answer ${id}`} value={(ans[id] as string) ?? ""} onChange={(e) => set(id, e.target.value)}
        placeholder={w.type === "expression" ? "e.g. 2x+3, x^2, sqrt(2)" : "Your answer"} className="mx-1 inline-flex h-10 w-44 align-middle text-[16px]" onKeyDown={(e) => e.key === "Enter" && filled && check.mutate()} />;
    if (w.type === "dropdown")
      return <select aria-label={`Choose ${id}`} value={(ans[id] as number) ?? 0} onChange={(e) => set(id, Number(e.target.value))} className="mx-1 h-10 rounded-md border border-input bg-white px-2 align-middle">
        <option value={0}>Choose</option>{w.choices.map((c, k) => <option key={k} value={k + 1}>{c.replace(/\$/g, "")}</option>)}</select>;
    if (w.type === "radio") {
      const chosen = (ans[id] as number[]) ?? [];
      return <fieldset className="my-3 block"><legend className="sr-only">{w.multiple ? "Choose all that apply" : "Choose one"}</legend>
        {w.multiple && <p className="mb-1 text-sm text-muted-foreground">Choose all that apply.</p>}
        <div className="grid gap-2">{w.choices.map((c, k) => (
          <label key={k} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2", chosen.includes(k) ? "border-primary bg-[#e9eff8]" : "border-border bg-white")}>
            <input type={w.multiple ? "checkbox" : "radio"} name={`r-${itemId}-${id}`} checked={chosen.includes(k)} onChange={() => set(id, w.multiple ? (chosen.includes(k) ? chosen.filter((x) => x !== k) : [...chosen, k]) : [k])} />
            <span className="min-w-0 flex-1"><Md text={c} /></span>
          </label>))}</div></fieldset>;
    }
    if (w.type === "image") return w.url ? <span className="my-2 block"><img src={w.url} alt={w.alt} className="max-h-[360px] max-w-full" />{w.caption && <span className="block text-sm text-muted-foreground"><Md text={w.caption} /></span>}</span> : null;
    if (w.type === "note") return <details className="my-2 rounded-lg bg-muted/60 p-3 text-sm"><summary className="cursor-pointer text-primary">{w.label || "Explain"}</summary><Md text={w.text} /></details>;
    return null;
  };

  return (
    <section aria-label={`Question ${number}`} className="flex-1">
      <div className="text-[16px] leading-relaxed text-[#1f2937]"><Md text={q.data.content} widget={widget} /></div>
      {hints.map((h, k) => <div key={k} className="mt-3 rounded-lg bg-[#e9eff8] px-4 py-3 text-[15px]"><p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-primary"><Lightbulb className="h-4 w-4" />Hint {k + 1} of {q.data!.hints}</p><Md text={h} /></div>)}
      {result !== null && <p role="status" className={cn("mt-4 flex items-center gap-2 rounded-lg px-4 py-2 text-sm", result ? "bg-[var(--pill-green)] text-[var(--pill-green-fg)]" : "bg-alertbg text-[#8a1c2b]")}>
        {result ? <><CheckCircle2 className="h-4 w-4" />Correct!</> : <><XCircle className="h-4 w-4" />Not quite. Try again, or get a hint.</>}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        {result ? <Button onClick={onNext}>Next question</Button> : <Button disabled={!filled || check.isPending} onClick={() => check.mutate()}>Check</Button>}
        {!result && hints.length < q.data.hints && <Button variant="outline" disabled={hint.isPending} onClick={() => hint.mutate()}><Lightbulb className="mr-2 h-4 w-4" />Get a hint</Button>}
        {!result && <Button variant="ghost" onClick={onNext}>Skip</Button>}
      </div>
      {hints.length > 0 && !result && <p className="mt-2 text-xs text-muted-foreground">Questions answered with a hint don't count toward mastery, but they still help you learn.</p>}
    </section>
  );
}
