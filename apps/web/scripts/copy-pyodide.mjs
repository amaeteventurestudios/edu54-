// Serve Pyodide from the appliance itself so Python runs with the internet unplugged (docs/12).
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pyodide");
const dst = join(root, "public", "pyodide");
if (!existsSync(src)) { console.error("pyodide is not installed"); process.exit(1); }
mkdirSync(dst, { recursive: true });
for (const f of ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]) cpSync(join(src, f), join(dst, f));
console.log("pyodide assets copied to public/pyodide");
