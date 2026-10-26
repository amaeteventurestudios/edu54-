# App Information Architecture

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Product shell

Umanah LabOS presents different navigation according to role while preserving one shared design language and identity system.

## Student navigation

The same items appear, in the same order and with the same labels, on every student screen. Revision, homework and assignments live inside Learn.

1. **Home** — orientation, current learning, assigned work, status.
2. **Ask** — local AI tutor.
3. **Learn** — courses, lessons, assignments, homework, revision, completed work.
4. **Build** — coding, experiments, projects, robotics/engineering extensions.
5. **Explore** — local knowledge library and RAG.
6. **Progress** — XP, levels, badges, streaks, mastery, projects.

Secondary student-accessible areas may include notifications, profile, accessibility, and local settings. System diagnostics should not clutter student navigation.

## Teacher navigation

- Teacher Center / Overview
- Classes
- Curriculum
- Assignments
- Students
- Revision
- Assessments
- Resources
- AI Lesson Builder

Teachers can enter student-facing areas when useful, but teacher-only capabilities remain permission-gated.

## School admin navigation

- Overview
- Users and roles
- Devices / client access
- Storage
- Models
- Network
- Updates
- Backups/export
- Diagnostics
- Security

## Umanah support view

The remote management plane exposes deployment health and lifecycle controls, not routine student conversation content.

## Route guidance

A reasonable web route model:

```text
/
/ask
/learn
/learn/courses/:courseId
/learn/lessons/:lessonId
/assignments/:assignmentId
/revision
/build
/explore
/progress
/teacher
/teacher/classes/:classId
/admin
```

Exact route names may follow framework conventions, but information architecture should remain stable.

## Navigation state rules

- A student always has a clear way back to Home.
- Contextual screens preserve course/lesson breadcrumbs.
- “Ask” can carry current course/assignment context without trapping the student in that context.
- Teacher context is visually distinct but not a separate brand.
- Offline status is communicated quietly; it should not feel like an error if core features remain available.

## Designated safety contact

Adds a **Safety Alerts** item for users flagged as safety contacts (`41`). It never appears for other roles.
