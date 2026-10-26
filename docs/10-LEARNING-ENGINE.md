# Learning Engine

## Purpose

The Learning Engine turns AI Lab from a chatbot into an education product. It manages curriculum structure, assignments, lesson progression, homework, revision, assessments, completion, teacher feedback, and learning context for the AI tutor.

## Domain hierarchy

```text
Course
  Module
    Lesson
      Objective
      Content blocks
      Activities
      Practice
      Assessment
      Project links
```

Separate but linked objects: Class, Enrollment, Assignment, Submission, Revision Recommendation, Quiz Attempt, Completion Record.

## Required capabilities

- Course catalog and enrollment.
- Lesson sequencing/prerequisites.
- Save/resume progress.
- Assignment scheduling and due dates.
- Draft and final submissions.
- Teacher feedback.
- Quiz/assessment scoring.
- Revision recommendations from completed work.
- AI context export: current course, lesson, objective, allowed-help policy.
- Offline-first operation.

## v1 decision (updated 2026-09-24)

The Umanah learning service on SQLite is the source of truth for the vertical slice. **Moodle and Kolibri are installed and connected now** (`53`): Moodle mirrors courses and receives grades through `MoodleLearningAdapter`; Kolibri supplies content through `KolibriContentAdapter`. Which system owns courses long-term is decided after the slice, by benchmark.

## Kolibri path (evaluate after the first slice)

Kolibri (Learning Equality, MIT license) is an offline-first learning platform already used in low-connectivity schools, with content channels, coach tools, quizzes and device-to-device sync. Evaluate it in two steps: (1) as a **content source**, importing channels into the Umanah library and lessons; (2) as a possible **engine** behind a `KolibriLearningAdapter`, if its data model and APIs fit the Umanah experience without exposing its UI.

## Moodle path (later, larger tiers only)

Moodle remains an option for AI Lab School/Research deployments that need a full LMS, behind a `MoodleLearningAdapter`.

## Lightweight path

For Pi or appliance simplicity, a Umanah learning service may implement the minimal domain using SQLite and borrow proven workflow concepts from Chatty-EDU. This is not permission to casually rebuild a full LMS; keep scope disciplined.

## Decision benchmark

Compare memory, install complexity, API friction, backup/restore, offline behavior, customization effort, upgrade burden, and teacher-feature completeness. The production choice may differ by tier if the user experience remains stable.
