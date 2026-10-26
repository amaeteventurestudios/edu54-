import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Atom, Blocks, Bot, CheckCircle2, Code2, Cog, Cpu, ExternalLink, Maximize2, Music, Play, Puzzle, RotateCcw, Save, Sparkles, Terminal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/features/CodeEditor";
import { runPython, stopPython, type RunResult } from "@/features/pyrunner";
import { ChatInput, MessageList, ModeBadge, useTutor, useTutorMode } from "@/features/tutor";
import { put } from "@/lib/api";
import { time } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";
import { bandOf, contentBands, GAME_BANDS } from "@/lib/bands";
import { BuildProjects, HandIn, type ProjectKind } from "@/features/BuildProjects";
import { useUser } from "@/lib/session";

const CATS = [
  { id: "python", label: "Python Lab", text: "Learn and practice Python", icon: <Code2 className="h-6 w-6" strokeWidth={1.5} />, on: true },
  { id: "challenges", label: "Coding Challenges", text: "Coding games, blocks to Python", icon: <Terminal className="h-6 w-6" strokeWidth={1.5} />, on: true },
  { id: "ai", label: "AI Projects", text: "Small AI programs in Python", icon: <Cpu className="h-6 w-6" strokeWidth={1.5} />, on: true },
  { id: "science", label: "Science Experiments", text: "Experiments in simulations", icon: <Atom className="h-6 w-6" strokeWidth={1.5} />, on: true },
  { id: "robotics", label: "Robotics", text: "Program an on-screen robot", icon: <Bot className="h-6 w-6" strokeWidth={1.5} />, on: true },
  { id: "engineering", label: "Engineering Projects", text: "Design, test and improve", icon: <Cog className="h-6 w-6" strokeWidth={1.5} />, on: true },
];
// Offline coding games (docs/47): open-source apps stored on the school's device and served at /play/. Each keeps its license
// credit, which the licenses require.
const GAMES = [
  { id: "puzzles", tool: "blockly-games", levels: "Primary 2 – JSS 2", title: "Block Puzzles", grades: "Grades 2-8", text: "Short puzzle games that start with blocks and finish with real JavaScript.", href: "/play/blockly-games/index.html", icon: <Puzzle className="h-6 w-6" strokeWidth={1.5} />, credit: "Blockly Games by Google, Apache 2.0" },
  { id: "studio", tool: "snap", levels: "Primary 3 – SSS 3", title: "Block Coding Studio", grades: "Grades 3-12", text: "Build games, art and stories with blocks, then go further with lists, functions and more.", href: "/play/snap/snap.html", icon: <Blocks className="h-6 w-6" strokeWidth={1.5} />, credit: "Snap! by UC Berkeley, AGPL 3.0" },
  { id: "music", tool: "music-blocks", levels: "Primary 1 – JSS 2", title: "Music Coding", grades: "Grades K-8", text: "Make music and drawings by snapping blocks together.", href: "/play/musicblocks/index.html", icon: <Music className="h-6 w-6" strokeWidth={1.5} />, credit: "Music Blocks by Sugar Labs, AGPL 3.0" },
  { id: "robot", tool: "reeborg", levels: "Primary 5 – SSS 3", title: "Robot Python Puzzles", grades: "Grades 5-12", text: "Guide a robot through mazes by writing Python.", href: "/play/reeborg/reeborg_offline.html", icon: <Bot className="h-6 w-6" strokeWidth={1.5} />, credit: "Reeborg's World by André Roberge, CC BY-SA 4.0" },
];

// University tools (docs/edu54/CONTENT-CATALOG.md): open-source apps that run in the student's browser, served from this device.
const UNI_TOOLS = [
  { id: "circuits", tool: "falstad", levels: "", title: "Circuit Simulator", grades: "Physics and engineering", text: "Build electronic circuits and watch current and voltage change as they run.", href: "/play/circuitjs/circuitjs.html", icon: <Cog className="h-6 w-6" strokeWidth={1.5} />, credit: "CircuitJS by Paul Falstad and Iain Sharp, GPL 2.0" },
  { id: "notebooks", tool: "jupyterlite", levels: "", title: "Notebooks", grades: "Programming and data", text: "Python notebooks that run in the browser: data, plots and experiments.", href: "/play/jupyterlite/lab/index.html", icon: <Code2 className="h-6 w-6" strokeWidth={1.5} />, credit: "JupyterLite, BSD 3-Clause" },
  { id: "molecules", tool: "jsmol", levels: "", title: "Molecule Viewer", grades: "Chemistry and biology", text: "Rotate and explore 3D models of molecules and proteins.", href: "/play/jsmol/index.html", icon: <Atom className="h-6 w-6" strokeWidth={1.5} />, credit: "JSmol, LGPL 2.1" },
  { id: "glowscript", tool: "glowscript", levels: "", title: "3D Physics Programs", grades: "Physics", text: "Write short Python programs that animate 3D physics.", href: "/play/glowscript/index.html", icon: <Sparkles className="h-6 w-6" strokeWidth={1.5} />, credit: "GlowScript VPython, BSD 3-Clause" },
];

/** Only tools that are really installed on this device are shown (a missing folder is not a broken card). */
function useInstalled(hrefs: string[]) {
  return useQuery({ queryKey: ["installed-tools", hrefs], staleTime: 60_000, queryFn: async () => {
    const ok = await Promise.all(hrefs.map(async (h) => { try { return (await fetch(h, { method: "HEAD" })).ok; } catch { return false; } }));
    return new Set(hrefs.filter((_, i) => ok[i]));
  } });
}

const STARTER = "for number in range(1, 11):\n    print(number)\n";

const HELPER_KEY = "umanah.build.helper-width";
const clamp = (n: number) => Math.min(60, Math.max(28, n));

export default function Build() {
  const qc = useQueryClient();
  const { brand, edition } = useBrand();
  const tools = [...GAMES, ...UNI_TOOLS].filter((g) => edition.buildTools.includes(g.tool) || (g.tool === "jupyterlite" && edition.buildTools.includes("jupyterlite")));
  const installed = useInstalled(tools.map((g) => g.href));
  const shown = brand.id === "umanah" ? tools : tools.filter((g) => installed.data?.has(g.href));
  const fromChat = (useLocation().state as { code?: string } | null)?.code;     // "Try it in Build" on a tutor code block
  const [code, setCode] = useState(fromChat ?? STARTER);
  const [last, setLast] = useState<RunResult | null>(null);
  const [helperW, setHelperW] = useState(() => { try { return clamp(Number(localStorage.getItem(HELPER_KEY)) || 40); } catch { return 40; } });
  const row = useRef<HTMLDivElement>(null);
  const setW = useCallback((n: number) => { const v = clamp(n); setHelperW(v); try { localStorage.setItem(HELPER_KEY, String(Math.round(v))); } catch { /* private window */ } }, []);
  const drag = (e: React.PointerEvent) => {
    const box = row.current?.getBoundingClientRect();
    if (!box) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => setW(((box.right - ev.clientX) / box.width) * 100);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const user = useUser();
  const band = bandOf(user);
  type Tab = "python" | "challenges" | ProjectKind;
  const [tab, setTab] = useState<Tab>(band === "discover" || band === "explore" ? "challenges" : "python");
  const [projectTitle, setProjectTitle] = useState("My first program");
  // K-12 games follow the student's bands (and any a teacher opened up); University tools have no band
  const games = shown.filter((g) => !GAME_BANDS[g.id] || GAME_BANDS[g.id].some((b) => contentBands(user).includes(b)));
  // Science, engineering and robot projects run School Library simulations and the robot world. EDU54 ships none of them
  // yet (PhET needs a per-sim date check; Reeborg's World's license is ambiguous), so they stay "Coming later" there.
  const cats = CATS.map((c) => (edition.id === "university" && c.id === "challenges" ? { ...c, label: "Science & Code Tools", text: "Notebooks, circuits, molecules, 3D physics" } : c))
    .map((c) => (brand.id !== "umanah" && ["science", "engineering", "robotics"].includes(c.id) ? { ...c, on: false } : c));
  const [out, setOut] = useState("");
  const [running, setRunning] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [ranOnce, setRanOnce] = useState(false);
  const ctx = { type: "project" as const, id: "python-lab" };
  const mode = useTutorMode(ctx);
  const tutor = useTutor(ctx);
  useEffect(() => () => stopPython(), []);
  useEffect(() => setSavedId(null), [code, projectTitle]);     // changed since the last save: save again before handing in

  const save = useMutation({
    mutationFn: () => put<{ id: number; saved: boolean; badge: string | null }>("/api/projects", { title: projectTitle, code, category: projectTitle === "My first program" ? "python-lab" : "ai" }),
    onSuccess: (r) => { setSaved(time()); setSavedId(r.id); qc.invalidateQueries({ queryKey: ["progress"] }); },
  });
  async function run() {
    setRunning(true);
    setOut("");
    setLast(null);
    setLast(await runPython(code, (c) => setOut((o) => o + c)));
    setRanOnce(true);
    setRunning(false);
  }
  const withCode = (lead: string) => `${lead}\n${code}${out && last && !last.ok ? `\nIt printed:\n${out}` : ""}`.slice(0, 1150);
  const HELPER_BUTTONS: [string, () => void][] = [
    ["Explain my code", () => tutor.send(withCode("Explain how this code works:"))],
    ["Give me a hint", () => tutor.send(withCode("I need a hint for my code (please do not write it for me):"))],
    ["Find my bug", () => tutor.send(withCode("Help me find the bug in my code with questions and hints, not the fixed code:"))],
    ["Give me a bigger challenge", () => tutor.send("Give me a slightly bigger Python challenge to try")],
  ];
  const explainError = () => tutor.send(`I got this error when I ran my code. Help me understand it and where to look:\n${code}\nError:\n${(last?.output || out).slice(-400)}`.slice(0, 1150));

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader title={band === "discover" ? "Play" : brand.id === "umanah" ? "Build" : "Create & Build"} subtitle={band === "discover" ? "Games where you make things with blocks." : "Code, experiment, and create with hands-on projects."} />
      <div className={cn("mb-5 grid grid-cols-2 gap-3 md:grid-cols-3", band === "discover" ? "xl:grid-cols-3" : "xl:grid-cols-6")}>
        {cats.filter((c) => band !== "discover" || ["challenges", "science", "robotics"].includes(c.id)).map((c) => (
          <button key={c.id} disabled={!c.on} title={c.on ? undefined : "Coming in a later release"} aria-pressed={tab === c.id} onClick={() => c.on && setTab(c.id as Tab)}
            className={cn("flex items-center gap-3 rounded-xl border p-3 text-left press", tab === c.id ? "border-[#bcd1ee] bg-[#e4eefc]" : c.on ? "border-border bg-white hover:bg-[#f4f6fb]" : "border-border bg-white opacity-70")}>
            <span className="text-primary">{c.icon}</span>
            <span className="min-w-0"><span className="block font-serif text-[14px] leading-tight text-primary">{c.label}</span><span className="block text-[11.5px] leading-tight text-muted-foreground">{c.on ? c.text : "Coming later"}</span></span>
          </button>
        ))}
      </div>

      {(tab === "ai" || tab === "science" || tab === "robotics" || tab === "engineering") &&
        <BuildProjects kind={tab} onOpenCode={(p) => { setCode(p.code); setProjectTitle(p.title); setOut(""); setLast(null); setTab("python"); }} />}

      {tab === "challenges" && (
        <section aria-label={edition.id === "university" ? "Science and code tools" : "Coding games"}>
          <p className="mb-4 text-[15px] text-muted-foreground">{edition.id === "university" ? "Tools stored on this device. They open in a new tab and work without internet." : "Coding games stored on your school's device. They open in a new tab and work without internet."}</p>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {games.length === 0 && <li className="rounded-xl border border-border bg-white p-4 text-[14.5px] text-muted-foreground">No coding tools are installed on this device yet.</li>}
            {games.map((g) => (
              <li key={g.id} className="flex flex-col rounded-xl border border-border bg-white p-4 card-soft">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#e4eefc] text-primary">{g.icon}</span>
                  <div className="min-w-0"><h2 className="font-serif text-[19px] leading-tight text-primary">{g.title}</h2><p className="text-xs text-muted-foreground">{brand.id !== "umanah" && g.levels ? g.levels : g.grades}</p></div>
                </div>
                <p className="mt-3 flex-1 text-[14.5px] text-[#374151]">{g.text}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  {brand.id === "umanah" ? <span className="text-[11.5px] text-muted-foreground">{g.credit}</span>
                    : <a href="/attributions" target="_blank" rel="noopener" className="text-[11.5px] text-muted-foreground underline">Credits and license</a>}
                  <Button asChild className="shrink-0"><a href={g.href} target="_blank" rel="noopener">Play <ExternalLink className="ml-2 h-4 w-4" /></a></Button>
                </div>
              </li>))}
          </ul>
        </section>
      )}

      <div ref={row} className={cn("flex flex-col gap-5 lg:flex-row lg:gap-0", tab !== "python" && "hidden")}>
        <div className="min-w-0 lg:flex-1 lg:pr-3">
          <div className="rounded-xl border border-border bg-white card-soft">
            <div className="flex items-center gap-3 border-b border-border px-4 py-2.5"><Code2 className="h-5 w-5 text-[#2b6cb0]" strokeWidth={1.5} /><span className="font-medium text-primary">{projectTitle === "My first program" ? "Python Lab" : projectTitle}</span><span className="text-xs text-muted-foreground">main.py</span><Maximize2 className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" /></div>
            <div className="p-3"><CodeEditor value={code} onChange={setCode} minHeight={130} label="main.py" /></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Button className="h-11" onClick={run} disabled={running}><Play className="mr-2 h-4 w-4" />{running ? "Running…" : "Run"}</Button>
            <Button variant="outline" className="h-11" onClick={() => { setCode(STARTER); setOut(""); }}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
            <Button variant="outline" className="h-11" onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />Save Project</Button>
            <Button variant="outline" className="h-11 bg-[#eef3fb] text-primary" onClick={HELPER_BUTTONS[1][1]} disabled={tutor.busy}><Sparkles className="mr-2 h-4 w-4" />Ask for a Hint</Button>
          </div>
          <div className="mt-3 overflow-hidden rounded-xl border border-border bg-white card-soft">
            <div className="flex items-center justify-between px-4 py-2 text-[14px] text-primary"><span className="flex items-center gap-2"><Terminal className="h-4 w-4" />Output</span><button onClick={() => setOut("")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">Clear <Trash2 className="h-3.5 w-3.5" /></button></div>
            <pre aria-live="polite" aria-label="Program output" className="code-block min-h-[130px] whitespace-pre-wrap bg-primary px-4 py-3 text-[13px] text-[#e6edf7]">{out || <span className="text-white/70">{ranOnce ? "(no output)" : "Press Run to see your output here."}</span>}</pre>
            {last && !last.ok && (
              <div className="flex flex-wrap items-center gap-3 border-t border-[#f0c9cf] bg-[#fbe9ec] px-4 py-2.5 text-sm text-[#8a1c2b]">
                <AlertTriangle className="h-4 w-4 shrink-0" /><span className="flex-1">{last.timedOut ? "Your program ran for too long and was stopped." : "Python found a problem in your code."}</span>
                <Button size="sm" className="h-8" onClick={explainError} disabled={tutor.busy}>Help me understand this error</Button>
              </div>
            )}
          </div>
          {saved && <p role="status" className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--pill-green)] px-4 py-2 text-sm text-[var(--pill-green-fg)]"><CheckCircle2 className="h-4 w-4" />Project saved locally<span className="ml-auto text-xs">{saved}</span></p>}
          {saved && <HandIn projectId={savedId} className="mt-3" />}
        </div>

        <div role="separator" aria-orientation="vertical" aria-label="Resize the helper panel" aria-valuenow={Math.round(helperW)} aria-valuemin={28} aria-valuemax={60} tabIndex={0}
          onPointerDown={drag} onKeyDown={(e) => { if (e.key === "ArrowLeft") setW(helperW + 3); if (e.key === "ArrowRight") setW(helperW - 3); }}
          className="group hidden w-3 shrink-0 cursor-col-resize items-center justify-center lg:flex"><span className="h-16 w-1 rounded-full bg-border transition-colors group-hover:bg-[#9db4d6] group-focus-visible:bg-[#163b62]" /></div>
        <aside aria-label="AI Helper" style={{ "--hw": `${helperW}%` } as React.CSSProperties}
          className="flex min-w-0 flex-col lg:basis-[var(--hw)] overflow-hidden rounded-xl border border-[#dfe3f5] bg-[#f3f2fc] lg:sticky lg:top-[76px] lg:h-[calc(100vh-100px)] lg:max-h-[760px] lg:shrink-0 lg:grow-0">
          <header className="flex shrink-0 items-start gap-3 border-b border-[#dfe3f5] px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e4e0fb] text-primary"><Sparkles className="h-5 w-5" strokeWidth={1.5} /></span>
            <div><h2 className="text-[19px] leading-tight">AI Helper</h2><p className="text-[13.5px] leading-snug text-[#3c4656]">Stuck? Ask for a hint or an explanation</p></div>
          </header>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-label="Helper conversation">
            {mode.data && <ModeBadge badge={mode.data.badge} className="text-[12px]" />}
            {tutor.messages.length === 0 && <p className="rounded-xl bg-white/70 p-3 text-[14px] text-[#374151]">{ranOnce ? (last?.ok ? "Your code ran. Want to change it so it prints only even numbers?" : "Your code hit a problem. Press \u201cHelp me understand this error\u201d, or ask me below.") : "Write some code and press Run. I can give hints and explain errors."}</p>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {HELPER_BUTTONS.map(([label, run]) => <button key={label} onClick={run} disabled={tutor.busy} className="rounded-lg border border-border bg-white px-3 py-2 text-left text-[14px] text-primary press hover:bg-muted disabled:opacity-60">{label}</button>)}
            </div>
            <MessageList messages={tutor.messages} queue={tutor.queue} compact onRate={tutor.rate} onSuggest={tutor.send} />
          </div>
          <div className="shrink-0 border-t border-[#dfe3f5] p-3"><ChatInput onSend={tutor.send} onStop={tutor.stop} busy={tutor.busy} placeholder="Ask a follow-up question…" compact /></div>
        </aside>
      </div>
    </div>
  );
}
