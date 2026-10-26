# Local AI Engine

## Goal

Provide useful local tutoring and teacher assistance without exposing model-management complexity to users.

## Request pipeline

```text
UI request
→ role/policy check
→ safety input screen (41)
→ learning context
→ retrieval context (optional)
→ task/model routing
→ prompt construction
→ local inference
→ safety output screen + answer-leak check (41, 42)
→ persistence/audit according to local policy
```

## AI modes

### General Ask
Broad educational assistance.

### Lesson
Explain within current objective; scaffold rather than jump ahead unnecessarily.

### Homework
Hints, analogous examples, concept explanation. Avoid directly completing assessed work.

### Assessment
No answer leakage; clarify instructions and accessibility needs without solving.

### Revision
More open explanation, quiz generation, correction, spaced practice.

### Project / Build
Debugging, hints, explanations, design help; allow stronger assistance when the assignment policy permits it.

### Teacher
Full answer keys, rubrics, lesson-plan drafts, quiz generation, differentiated materials.

## Model roles

- General tutor.
- Coder.
- Embedding/retrieval model.
- Small classifier/router/bookkeeper.
- Teacher-generation model where resources permit.

## Resource management

LabOS must know model RAM footprint, context limits, concurrency and hardware capabilities. Use queues and graceful busy states rather than system thrashing.

## Safety and quality

Prefer transparent uncertainty, local citations for RAG, and teacher-configurable policies. Log operational errors without centralizing private student content by default.

## Binding rules

Mode resolution, grounding, answer handling and evaluation are defined in `42-AI-TUTOR-POLICY.md`. Safety is defined in `41-SAFEGUARDING-CHILD-SAFETY.md`. Load handling is defined in `43-CONCURRENCY-PERFORMANCE-BUDGET.md`. Where this document is less specific, those documents win.
