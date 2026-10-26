import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bot, CheckCircle2, ExternalLink, FlaskConical, Lightbulb, Save, Send, Sparkles, Wrench } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, get, post, put } from "@/lib/api";
import { t } from "@/lib/i18n";
import { TutorPanel } from "./TutorPanel";

// Build projects (K-12): science experiments and engineering challenges run a School Library simulation beside the brief;
// robot missions open the robot world; AI projects open Python Lab with starter code. Notes save as a project.
export type ProjectKind = "science" | "engineering" | "robotics" | "ai";
interface Base { id: string; title: string; bands: string[] }
interface Science extends Base { sim: string; question: string; steps: string[]; record: string }
interface Engineering extends Base { sim: string; goal: string; constraints: string[]; test: string; improve: string }
interface Robot extends Base { href: string; goal: string; skills: string }
export interface AiProject extends Base { goal: string; code: string }
type Catalog = { science: Science[]; engineering: Engineering[]; robotics: Robot[]; ai: AiProject[] };

const BAND_LABEL: Record<string, string> = { discover: "K-2", explore: "3-5", build: "6-8", launch: "9-12" };
const grades = (bands: string[]) => {
  const order = ["discover", "explore", "build", "launch"];
  const s = [...bands].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const first = BAND_LABEL[s[0]].split("-")[0], last = BAND_LABEL[s[s.length - 1]].split("-")[1];
  return `Grades ${first}-${last}`;
};

const INTRO: Record<ProjectKind, { text: string; icon: ReactNode }> = {
  science: { text: "Ask a question, run the experiment in a simulation, and record what you find.", icon: <FlaskConical className="h-6 w-6" strokeWidth={1.5} /> },
  engineering: { text: "Design to a goal and its limits, test it, then improve it, like a real engineer.", icon: <Wrench className="h-6 w-6" strokeWidth={1.5} /> },
  robotics: { text: "Program a robot on screen: give it commands, then teach it to sense and decide.", icon: <Bot className="h-6 w-6" strokeWidth={1.5} /> },
  ai: { text: "Build small AI programs in Python and see how they learn, guess and go wrong.", icon: <Sparkles className="h-6 w-6" strokeWidth={1.5} /> },
};

export function BuildProjects({ kind, onOpenCode }: { kind: ProjectKind; onOpenCode: (p: AiProject) => void }) {
  const cat = useQuery({ queryKey: ["build-projects"], queryFn: () => get<Catalog>("/api/build/projects") });
  const [open, setOpen] = useState<string | null>(null);
  const items = (cat.data?.[kind] ?? []) as (Science | Engineering | Robot | AiProject)[];
  const current = items.find((p) => p.id === open);
  if (current && (kind === "science" || kind === "engineering")) return <Workspace kind={kind} p={current as Science | Engineering} back={() => setOpen(null)} />;
  return (
    <section aria-label={`${kind} projects`}>
      <p className="mb-4 text-[15px] text-muted-foreground">{INTRO[kind].text}</p>
      {!cat.data ? <Skeleton className="h-48" /> : items.length === 0 ? <p className="text-muted-foreground">No projects for your grade here yet.</p> : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <li key={p.id} className="flex flex-col rounded-xl border border-border bg-white p-4 card-soft">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e4eefc] text-primary">{INTRO[kind].icon}</span>
                <div className="min-w-0"><h2 className="font-serif text-[19px] leading-tight text-primary">{p.title}</h2><p className="text-xs text-muted-foreground">{grades(p.bands)}</p></div>
              </div>
              <p className="mt-3 flex-1 text-[14.5px] text-[#374151]">{"question" in p ? p.question : "goal" in p ? p.goal : ""}</p>
              {"skills" in p && <p className="mt-2"><Pill tone="blue">{p.skills}</Pill></p>}
              <div className="mt-4 flex justify-end">
                {kind === "robotics" ? <Button asChild><a href={(p as Robot).href} target="_blank" rel="noopener">Start mission <ExternalLink className="ml-2 h-4 w-4" /></a></Button>
                  : kind === "ai" ? <Button onClick={() => onOpenCode(p as AiProject)}>Open in Python Lab</Button>
                  : <Button onClick={() => setOpen(p.id)}>Start</Button>}
              </div>
            </li>))}
        </ul>)}
      {(kind === "science" || kind === "engineering") && <p className="mt-4 text-xs text-muted-foreground">Simulations by PhET Interactive Simulations, University of Colorado Boulder, CC BY 4.0.</p>}
    </section>
  );
}

function Workspace({ kind, p, back }: { kind: "science" | "engineering"; p: Science | Engineering; back: () => void }) {
  const qc = useQueryClient();
  const sim = useQuery({ queryKey: ["library-node", p.sim], queryFn: () => get<{ node: { url?: string; title: string } }>(`/api/library/nodes/${p.sim}`) });
  const mine = useQuery({ queryKey: ["my-projects"], queryFn: () => get<{ projects: SavedProject[] }>("/api/projects") });
  const existing = mine.data?.projects.find((x) => x.title === p.title);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  useEffect(() => { if (existing) { setNotes((n) => n || existing.code); setProjectId(existing.id); setSaved(true); } }, [existing?.id]);   // pick up where they left off
  const save = useMutation({ mutationFn: () => put<{ id: number }>("/api/projects", { title: p.title, code: notes, category: kind }),
    onSuccess: (r) => { setSaved(true); setProjectId(r.id); qc.invalidateQueries({ queryKey: ["progress"] }); qc.invalidateQueries({ queryKey: ["my-projects"] }); } });
  const isSci = "question" in p;
  return (
    <section aria-label="Project workspace">
      <button onClick={back} className="mb-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"><ArrowLeft className="h-4 w-4" />All {kind === "science" ? "experiments" : "challenges"}</button>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <aside aria-label="Brief" className="space-y-4 rounded-xl border border-border bg-white p-5 card-soft">
          <h2 className="text-[24px]">{p.title}</h2>
          {isSci ? (
            <>
              <Block title="Question" icon={<Lightbulb className="h-4 w-4" />}>{(p as Science).question}</Block>
              <Block title="Steps"><ol className="list-decimal space-y-1 pl-5">{(p as Science).steps.map((s) => <li key={s}>{s}</li>)}</ol></Block>
              <Block title="Record">{(p as Science).record}</Block>
            </>
          ) : (
            <>
              <Block title="Goal" icon={<Lightbulb className="h-4 w-4" />}>{(p as Engineering).goal}</Block>
              <Block title="Limits"><ul className="list-disc space-y-1 pl-5">{(p as Engineering).constraints.map((s) => <li key={s}>{s}</li>)}</ul></Block>
              <Block title="Test">{(p as Engineering).test}</Block>
              <Block title="Improve">{(p as Engineering).improve}</Block>
            </>
          )}
          <div>
            <label htmlFor="notes" className="text-sm font-medium text-primary">{isSci ? "My results" : "My design notes"}</label>
            <textarea id="notes" value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} rows={6} className="mt-1.5 w-full rounded-lg border border-input bg-white p-3 text-[15px]" placeholder={isSci ? "What did you predict? What happened?" : "What did you build? What happened when you tested it?"} />
            <div className="mt-2 flex items-center gap-3">
              <Button onClick={() => save.mutate()} disabled={!notes.trim() || save.isPending}><Save className="mr-2 h-4 w-4" />Save to my projects</Button>
              {saved && <span role="status" className="flex items-center gap-1.5 text-sm text-[var(--pill-green-fg)]"><CheckCircle2 className="h-4 w-4" />Saved</span>}
            </div>
            <HandIn projectId={saved ? projectId : null} submittedAt={existing?.submitted_at ?? null} className="mt-3" />
          </div>
          <TutorPanel context={{ type: "project", id: p.id }} title={t("projects.helper")} defaultOpen={false}
            suggestions={[isSci ? "What should I change first in this experiment?" : "How could I test my design fairly?", "Can you give me a hint?"]} />
        </aside>
        <div className="flex min-h-[560px] flex-col overflow-hidden rounded-xl border border-border bg-white card-soft">
          {sim.data?.node.url ? <iframe title={`Simulation: ${sim.data.node.title}`} src={sim.data.node.url} sandbox="allow-scripts allow-popups allow-forms allow-modals allow-pointer-lock" allow="fullscreen" className="min-h-[560px] w-full flex-1" />
            : sim.isError ? <p className="m-auto p-8 text-center text-sm text-muted-foreground">The simulation isn't available right now. Ask your teacher to check Lab Status.</p>
            : <Skeleton className="m-4 flex-1" />}
        </div>
      </div>
    </section>
  );
}

function Block({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return <div><h3 className="mb-1 flex items-center gap-1.5 text-[15px] font-semibold text-primary">{icon}{title}</h3><div className="text-[15px] text-[#374151]">{children}</div></div>;
}

export interface SavedProject { id: number; title: string; code: string; category: string; status: string; updated_at: string; submitted_at: string | null }

/** Hand a saved project in to the teacher (save/share/submit, K-12 spec screen 9). Needs a saved, unchanged project. */
export function HandIn({ projectId, submittedAt, className = "" }: { projectId: number | null; submittedAt?: string | null; className?: string }) {
  const qc = useQueryClient();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { setDone(false); setErr(null); }, [projectId]);
  const hand = useMutation({
    mutationFn: () => post(`/api/projects/${projectId}/submit`),
    onSuccess: () => { setDone(true); qc.invalidateQueries({ queryKey: ["my-projects"] }); },
    onError: (e) => setErr(e instanceof ApiError ? e.message : "Couldn't hand it in. Please try again."),
  });
  const handedIn = done || (!!submittedAt && projectId !== null);
  return (
    <div className={className}>
      <Button variant="outline" className="h-11" onClick={() => hand.mutate()} disabled={projectId === null || hand.isPending || handedIn}>
        <Send className="mr-2 h-4 w-4" />{hand.isPending ? t("projects.handingIn") : handedIn ? t("projects.handedIn") : t("projects.handIn")}</Button>
      <p role="status" className="mt-1.5 text-xs text-muted-foreground">{handedIn ? t("projects.handedInNote") : projectId === null ? t("projects.saveFirst") : ""}</p>
      {err && <p role="alert" className="mt-1 text-sm text-[#8a1c2b]">{err}</p>}
    </div>
  );
}
