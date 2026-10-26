/// <reference lib="webworker" />
// Runs student code in the browser, inside a Web Worker (docs/12). Student code never reaches the server.
type In = { type: "run"; code: string };
let py: any = null;

async function boot() {
  if (py) return py;
  const url = "/pyodide/pyodide.mjs";
  const { loadPyodide } = await import(/* @vite-ignore */ url);
  py = await loadPyodide({ indexURL: "/pyodide/" });
  return py;
}

self.onmessage = async (ev: MessageEvent<In>) => {
  if (ev.data.type !== "run") return;
  try {
    const p = await boot();
    p.setStdout({ batched: (s: string) => (self as any).postMessage({ type: "out", text: s + "\n" }) });
    p.setStderr({ batched: (s: string) => (self as any).postMessage({ type: "out", text: s + "\n" }) });
    (self as any).postMessage({ type: "started" });   // the 5-second clock starts here, not while the interpreter loads
    await p.runPythonAsync(ev.data.code);
    (self as any).postMessage({ type: "done" });
  } catch (e: any) {
    // Keep only the useful last lines of the Python traceback.
    const lines = String(e?.message ?? e).trim().split("\n");
    (self as any).postMessage({ type: "error", message: lines.slice(-3).join("\n") });
  }
};
