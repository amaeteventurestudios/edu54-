# Build Lab

## Purpose

Build is the hands-on creation environment: code, experiments, projects, eventually robotics and engineering workflows.

## Initial Python experience

- Browser editor.
- Run/reset/save.
- Console output.
- Lesson-linked starter code.
- AI hint panel.
- Project persistence per user.
- Resource/time limits.

## Execution architecture

**v1 decision:** Python runs in the student's browser with **Pyodide** (Python compiled to WebAssembly), served from the appliance so it works offline. This keeps student code off the server entirely, adds almost no server load, and is naturally sandboxed by the browser. Run in a Web Worker with a 5-second default timeout so an infinite loop can be stopped without freezing the page.

**JupyterHub is installed now** (`53`) for work Pyodide can't do (long-running data projects, packages that don't run in the browser) and for teachers. Students reach it from Build via "Open in notebook" only when their class allows it; each user gets resource limits (CPU, memory, idle culling) and no network access by default.

Security requirements:
- per-run CPU/time/memory limits;
- filesystem isolation;
- no arbitrary access to host secrets;
- no privileged containers;
- restricted network by default for student code;
- cleanup of abandoned processes.

## Project types

Initial:
- Python exercises.
- Calculator.
- Guessing game.
- Quiz app.
- Data analysis.
- First AI app.

Later:
- science simulations;
- robotics;
- electronics;
- web projects;
- datasets/visualization;
- engineering design challenges.

## AI integration

AI receives code, error output, assignment objective, and help policy. In graded contexts it should prioritize hints and debugging questions over writing the full solution.
