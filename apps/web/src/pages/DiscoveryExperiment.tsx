/** One Discovery Lab experiment: depth modes on the left (Explore, Learn, Experiment, Advanced), the experiment in the
 *  middle with its controls and live readings, and the AI Guide on the right. On a phone the three stack. Every control
 *  goes through validate() against the catalog before it reaches the experiment (docs/discovery-lab §05). */
import { useQuery } from "@tanstack/react-query";
import { BatteryLow, Check, ChevronDown, Info, MessageSquare, Pause, Play, RotateCcw, ShieldCheck, SkipForward, Shuffle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Pill } from "@/components/common";
import { Skeleton } from "@/components/ui/skeleton";
import { ChatInput, MessageList, useTutor } from "@/features/tutor";
import { get } from "@/lib/api";
import { useUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { defaults, palette, validate, visible, type Action, type Experience, type ExperimentModule, type Lab, type ModuleState, type ParamSpec, type Value } from "@/discovery/engine.ts";
import { MODULES } from "@/discovery/modules/index.ts";
import { fmt } from "@/discovery/science.ts";
import { experienceOf, LabIcon, labOf, noteRecent, tint, useCatalog } from "@/discovery/ui/data";

type Depth = "explore" | "learn" | "experiment" | "advanced";
const DEPTHS: { id: Depth; label: string; hint: string }[] = [
  { id: "explore", label: "Explore", hint: "Play and notice" }, { id: "learn", label: "Learn", hint: "What is going on" },
  { id: "experiment", label: "Experiment", hint: "Try these steps" }, { id: "advanced", label: "Advanced", hint: "The maths behind it" },
];
const ACTION_LABEL: Record<string, { label: string; icon: ReactNode }> = {
  shuffle: { label: "Shuffle", icon: <Shuffle className="h-4 w-4" /> }, step: { label: "One step", icon: <SkipForward className="h-4 w-4" /> },
};

/** Mounts the experiment's module into a box and keeps React's copy of its state fresh. */
function useExperiment(exp: Experience, lab: Lab) {
  const box = useRef<HTMLDivElement>(null);
  const mod = useRef<ExperimentModule | null>(null);
  const [state, setState] = useState<ModuleState>({ params: defaults(exp), observations: {}, running: false });
  const [label, setLabel] = useState(exp.title);
  const [failed, setFailed] = useState(false);
  const [lowPower, setLowPower] = useState(() => { try { return localStorage.getItem("discovery:lowpower") === "1"; } catch { return false; } });

  useEffect(() => {
    let gone = false;
    const load = exp.module ? MODULES[exp.module] : undefined;
    if (!load || !box.current) { setFailed(true); return; }
    load().then((m) => {
      if (gone || !box.current) return;
      const inst = m.default();
      const sync = () => { setState(inst.getState()); setLabel(inst.describe()); };
      inst.mount(box.current, { params: defaults(exp), palette: palette(lab.color), lowPower, onChange: sync,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches });
      mod.current = inst; sync();
    }).catch(() => !gone && setFailed(true));
    return () => { gone = true; mod.current?.dispose(); mod.current = null; };
    // the module is mounted once per experiment; low-power changes go through setLowPower below
  }, [exp.id]);

  const dispatch = useCallback((a: Action) => {
    const m = mod.current; if (!m) return;
    const ok = validate(exp, a, m.getState().params);
    if (ok) m.applyAction(ok);
  }, [exp]);
  const toggleLowPower = () => setLowPower((v) => { const n = !v; mod.current?.setLowPower?.(n); try { localStorage.setItem("discovery:lowpower", n ? "1" : "0"); } catch { /* fine */ } return n; });
  return { box, state, label, failed, dispatch, lowPower, toggleLowPower };
}

function shown(v: Value | undefined, digits?: number) {
  if (v === undefined) return "…";
  return typeof v === "number" ? fmt(v, digits ?? 2) : v;
}

function Slider({ p, value, onChange }: { p: ParamSpec; value: number; onChange: (v: number) => void }) {
  const id = `dl-${p.key}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13.5px] font-medium text-[#3c4656]">{p.label}</label>
        <output htmlFor={id} className="font-mono text-[13.5px] font-semibold text-primary">{fmt(value, 3)}{p.unit ? ` ${p.unit}` : ""}</output>
      </div>
      <input id={id} type="range" min={p.min} max={p.max} step={p.step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-2 w-full cursor-pointer accent-[var(--primary)]" aria-valuetext={`${fmt(value, 3)} ${p.unit ?? ""}`.trim()} />
    </div>
  );
}

function Choice({ p, value, onChange }: { p: ParamSpec; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-[13.5px] font-medium text-[#3c4656]">{p.label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {p.options!.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
            className={cn("rounded-lg border px-3 py-1.5 text-[13px] press", value === o.value ? "border-primary bg-primary text-white" : "border-border bg-white text-primary hover:bg-accent")}>{o.label}</button>
        ))}
      </div>
    </fieldset>
  );
}

function DepthText({ exp, depth }: { exp: Experience; depth: Depth }) {
  const g = exp.guide;
  const [done, setDone] = useState<number[]>([]);
  if (!g) return null;
  if (depth === "explore") return <p className="leading-relaxed">{g.explore}</p>;
  if (depth === "learn") return <p className="leading-relaxed">{g.learn}</p>;
  if (depth === "experiment") return (
    <ol className="space-y-2">
      {g.steps.map((s, i) => (
        <li key={i}><button onClick={() => setDone((d) => d.includes(i) ? d.filter((x) => x !== i) : [...d, i])} aria-pressed={done.includes(i)}
          className="flex w-full items-start gap-2.5 rounded-lg p-1.5 text-left hover:bg-accent/60">
          <span className={cn("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px]", done.includes(i) ? "border-okay bg-okay text-white" : "border-border text-muted-foreground")}>{done.includes(i) ? <Check className="h-3 w-3" /> : i + 1}</span>
          <span className={cn("leading-snug", done.includes(i) && "text-muted-foreground line-through")}>{s}</span>
        </button></li>
      ))}
    </ol>
  );
  return (
    <div className="space-y-3">
      <p className="leading-relaxed">{g.advanced}</p>
      {exp.assumptions && <p className="rounded-lg bg-muted p-3 text-[13.5px] leading-snug text-[#3c4656]"><strong className="text-primary">How this model works.</strong> {exp.assumptions}</p>}
    </div>
  );
}

function AIGuide({ exp, readings }: { exp: Experience; readings: Record<string, Value> }) {
  const status = useQuery({ queryKey: ["ai-status"], queryFn: () => get<{ ready: boolean }>("/api/ai/status"), staleTime: 30_000, retry: false });
  const context = useMemo(() => ({ type: "experiment" as const, id: exp.id, state: readings }), [exp.id, readings]);
  const t = useTutor(context);
  const offline = status.data?.ready === false || status.isError;
  return (
    <div className="flex flex-col gap-3">
      {offline && <p className="rounded-lg bg-[var(--pill-amber)] p-3 text-[13px] text-[var(--pill-amber-fg)]">The AI Guide is not available right now. The experiment and everything on this page still work.</p>}
      {!offline && t.messages.length === 0 && (
        <>
          <p className="text-[14px] text-[#3c4656]">Ask about what you see. The Guide can read the numbers on this experiment, but it cannot move the controls: you do that.</p>
          <div className="flex flex-col gap-2">
            {(exp.suggestions ?? []).map((s) => <button key={s} onClick={() => t.send(s)} disabled={t.busy} className="rounded-xl bg-[#e0ebfc] px-3.5 py-2 text-left text-[13.5px] text-primary press hover:bg-[#d3e2fa]">{s}</button>)}
          </div>
        </>
      )}
      <MessageList messages={t.messages} queue={t.queue} compact className="max-h-[420px] overflow-y-auto pr-1" onSuggest={t.send} />
      {!offline && <ChatInput onSend={t.send} onStop={t.stop} busy={t.busy} placeholder="Ask the Guide about this experiment…" compact />}
      <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />AI Guide: it can make mistakes, so check it against the experiment. Chats are private, except messages that suggest someone may be in danger, which are shared with a trusted adult at your school.</p>
    </div>
  );
}

function Panel({ title, icon, children, className, collapsible = false }: { title: string; icon?: ReactNode; children: ReactNode; className?: string; collapsible?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <section aria-label={title} className={cn("rounded-xl border border-border bg-white card-soft", className)}>
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        {icon}<h2 className="flex-1 text-[17px]">{title}</h2>
        {collapsible && <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? `Hide ${title}` : `Show ${title}`} className="text-muted-foreground hover:text-primary"><ChevronDown className={cn("h-5 w-5 transition-transform", !open && "-rotate-90")} /></button>}
      </header>
      {open && <div className="p-4">{children}</div>}
    </section>
  );
}

function Experiment({ exp, lab }: { exp: Experience; lab: Lab }) {
  const user = useUser();
  const [depth, setDepth] = useState<Depth>("explore");
  const x = useExperiment(exp, lab);
  useEffect(() => { noteRecent(user.id, exp.id); }, [user.id, exp.id]);
  const readings = useMemo(() => ({ ...x.state.params, ...x.state.observations }), [x.state]);
  const set = (key: string, value: Value) => x.dispatch({ type: "set", key, value });
  const buttons = (exp.actions ?? []).filter((a) => a.min === undefined && a.max === undefined && ACTION_LABEL[a.type]);
  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-[13.5px] font-medium text-primary press hover:bg-accent disabled:opacity-50";

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 text-[13.5px] text-muted-foreground"><Link to="/discover" className="hover:text-primary">Discovery Lab</Link> <span aria-hidden="true">/</span> <Link to={`/discover/${lab.id}`} className="hover:text-primary">{lab.name}</Link></nav>
      <header className="mb-5 flex flex-col items-center gap-3 sm:flex-row">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: tint(lab.color, 0.14), color: lab.color }}><LabIcon lab={lab} className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1"><h1 className="text-[26px] leading-tight md:text-[32px]">{exp.title}</h1><p className="text-balance text-center text-[14.5px] text-muted-foreground sm:text-left">{exp.summary}</p></div>
        <Pill tone="blue" className="hidden sm:inline-flex">{exp.model === "simulation" ? "Simulation" : exp.model === "illustration" ? "Illustration" : "Calculation"} · ages {exp.ages}</Pill>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_340px]">
        {/* depth modes */}
        <aside className="lg:row-span-2">
          <div className="grid grid-cols-4 gap-1.5 lg:flex lg:flex-col lg:gap-2" role="tablist" aria-label="How deep to go">
            {DEPTHS.map((d) => (
              <button key={d.id} role="tab" aria-selected={depth === d.id} aria-controls="dl-depth" onClick={() => setDepth(d.id)}
                className={cn("min-w-0 rounded-xl border px-1 py-2 text-center press lg:px-3.5 lg:py-3 lg:text-left", depth === d.id ? "border-primary bg-primary text-white" : "border-border bg-white text-primary hover:bg-accent")}>
                <span className="block truncate text-[13px] font-semibold sm:text-[14.5px]">{d.label}</span><span className={cn("hidden text-[12px] lg:block", depth === d.id ? "text-white/80" : "text-muted-foreground")}>{d.hint}</span>
              </button>
            ))}
          </div>
          <div id="dl-depth" role="tabpanel" className="mt-3 rounded-xl border border-border bg-white p-4 text-[14.5px] text-[#2f3846] card-soft">
            <DepthText key={depth} exp={exp} depth={depth} />
          </div>
        </aside>

        {/* the experiment */}
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-white card-soft">
            <div ref={x.box} role="img" aria-label={x.label} className="relative h-[340px] w-full sm:h-[420px] xl:h-[460px]" />
            {x.failed && <p className="p-4 text-center text-muted-foreground">This experiment could not start in this browser.</p>}
            <div className="flex flex-wrap items-center gap-2 border-t border-border bg-[#fcfbf9] px-3 py-2.5">
              {exp.playable && (x.state.running
                ? <button className={cn(btn, "border-primary bg-primary text-white hover:bg-primary/90")} onClick={() => x.dispatch({ type: "pause" })}><Pause className="h-4 w-4" />Pause</button>
                : <button className={cn(btn, "border-primary bg-primary text-white hover:bg-primary/90")} onClick={() => x.dispatch({ type: "play" })}><Play className="h-4 w-4" />Play</button>)}
              {buttons.map((a) => <button key={a.type} className={btn} onClick={() => x.dispatch({ type: a.type })}>{ACTION_LABEL[a.type].icon}{ACTION_LABEL[a.type].label}</button>)}
              <button className={btn} onClick={() => x.dispatch({ type: "reset" })}><RotateCcw className="h-4 w-4" />Reset</button>
              <button className={cn(btn, "ml-auto", x.lowPower && "bg-accent")} aria-pressed={x.lowPower} aria-label="Low power" onClick={x.toggleLowPower} title="Fewer frames, for older computers"><BatteryLow className="h-4 w-4" /><span className="hidden sm:inline">Low power</span></button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Panel title="Controls">
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                {(exp.params ?? []).filter((p) => visible(p, x.state.params)).map((p) => p.type === "choice"
                  ? <Choice key={p.key} p={p} value={String(x.state.params[p.key])} onChange={(v) => set(p.key, v)} />
                  : <Slider key={p.key} p={p} value={Number(x.state.params[p.key])} onChange={(v) => set(p.key, v)} />)}
              </div>
            </Panel>
            <Panel title="Measurements">
              <dl className="space-y-2.5">
                {(exp.observations ?? []).map((o) => (
                  <div key={o.key} className="flex items-baseline justify-between gap-3 border-b border-dashed border-border pb-2 last:border-0 last:pb-0">
                    <dt className="text-[13.5px] text-[#3c4656]">{o.label}</dt>
                    <dd className="text-right font-mono text-[14px] font-semibold text-primary" aria-live="off">{shown(x.state.observations[o.key], o.digits)}{o.unit && x.state.observations[o.key] !== undefined && typeof x.state.observations[o.key] === "number" ? ` ${o.unit}` : ""}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 flex items-start gap-1.5 text-[11.5px] leading-snug text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{exp.review}</p>
            </Panel>
          </div>
        </div>

        {/* AI Guide */}
        <Panel title="AI Guide" icon={<span className="grid h-8 w-8 place-items-center rounded-full bg-[#eef2f8] text-primary"><MessageSquare className="h-4 w-4" strokeWidth={1.6} /></span>} collapsible className="h-fit lg:col-start-2 xl:col-start-3 xl:row-start-1">
          <AIGuide exp={exp} readings={readings} />
        </Panel>
      </div>
      {exp.safety && <p className="mt-5 text-[12.5px] text-muted-foreground">{exp.safety}</p>}
    </div>
  );
}

export default function DiscoveryExperiment() {
  const { labId = "", expId = "" } = useParams();
  const { data: c, isLoading, error } = useCatalog();
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-80" /><Skeleton className="h-[420px] w-full" /></div>;
  if (error || !c) return <p className="text-muted-foreground">Discovery Lab could not load. Try again in a moment.</p>;
  const exp = experienceOf(c, expId), lab = labOf(c, labId);
  if (!exp || !lab || exp.labId !== lab.id) return <Navigate to={lab ? `/discover/${lab.id}` : "/discover"} replace />;
  if (exp.status !== "working") return <Navigate to={`/discover/${lab.id}?topic=${exp.topicId}`} replace />;
  return <Experiment key={exp.id} exp={exp} lab={lab} />;
}
