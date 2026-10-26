# Curriculum System

## Curriculum philosophy

Umanah does not ship a random directory of PDFs. Content is normalized into learning pathways with explicit objectives, activities, practice, projects, assessment, AI tutor context, and progress signals.

## Canonical lesson schema

```text
Course
Module
Lesson
Objective(s)
Prerequisites
Estimated time
Explanation/content blocks
Examples
Interactive activity
AI tutor policy/context
Practice
Quiz/assessment
Project link
XP reward
Badge trigger(s)
Teacher notes
Resource citations
License/source metadata (license, attribution text, `noncommercial` and `sharealike` flags)
Hint ladder and answer key per practice/homework question (`42`)
Age band and language
```

## Initial pathways

### AI Foundations
AI, algorithms, ML, LLMs, training data, hallucinations, bias, privacy, responsible AI, prompting, creating with AI.

### Python Foundations
First program, variables, types, conditions, loops, functions, lists, dictionaries, debugging, projects.

### Science & Engineering Foundations
Motion, forces, energy, momentum, electricity, waves, thermodynamics, space, engineering design, systems thinking.

## Ingestion workflow

```text
source discovery
→ license verification
→ import
→ structural normalization
→ AI-assisted adaptation where allowed
→ human review
→ assessment/reward mapping
→ publication
→ versioning
```

## AI-assisted authoring

AI may draft explanations, questions, examples, differentiation, summaries, and metadata, but a human curriculum review process is required for published canonical material.

## Versioning

Curriculum packs need semantic/version identifiers so deployed appliances can update safely and schools can know which content version was taught.

## Sources

Open university and library sources (Harvard CS50, MIT OpenCourseWare, OpenStax, PhET, Kolibri channels, Kiwix) and their license rules are in `47-OPEN-EDUCATIONAL-RESOURCES.md`. Content with NonCommercial or ShareAlike terms goes in its own pack.
