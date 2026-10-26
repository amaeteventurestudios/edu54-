/** Runs Python with Pyodide in a Web Worker and stops it after a timeout so an infinite loop can't freeze the page. */
export const RUN_TIMEOUT_MS = 5000;

export interface RunResult { output: string; ok: boolean; timedOut: boolean }

let worker: Worker | null = null;

function spawn(): Worker {
  worker = new Worker(new URL("./pyodide.worker.ts", import.meta.url), { type: "module" });

  return worker;
}

export function runPython(code: string, onOutput: (chunk: string) => void, timeoutMs = RUN_TIMEOUT_MS): Promise<RunResult> {
  const w = worker ?? spawn();
  return new Promise((resolve) => {
    let out = "";
    let timer: ReturnType<typeof setTimeout> | null = null;
    const kill = (msg: string, timedOut: boolean) => { w.terminate(); worker = null; onOutput(msg); resolve({ output: out, ok: false, timedOut }); };
    // Loading the interpreter from this machine can take a few seconds the first time; give it its own, longer limit.
    timer = setTimeout(() => kill("\nThe Python engine didn't start. Please try again.\n", false), 40_000);
    const finish = (r: RunResult) => { if (timer) clearTimeout(timer); w.removeEventListener("message", on); resolve(r); };
    const on = (ev: MessageEvent) => {
      const m = ev.data;
      if (m.type === "started") { if (timer) clearTimeout(timer); timer = setTimeout(() => { w.removeEventListener("message", on); kill("\nStopped — your program ran for more than 5 seconds.\n", true); }, timeoutMs); }
      else if (m.type === "out") { out += m.text; onOutput(m.text); }
      else if (m.type === "done") { finish({ output: out, ok: true, timedOut: false }); }
      else if (m.type === "error") { onOutput(m.message + "\n"); finish({ output: out + m.message, ok: false, timedOut: false }); }
    };
    w.addEventListener("message", on);
    w.postMessage({ type: "run", code });
  });
}

export function stopPython() { worker?.terminate(); worker = null; }
