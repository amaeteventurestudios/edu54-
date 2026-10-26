# Data Model

## Design goals

Local-first, auditable, migration-friendly, minimal PII, compatible with SQLite on small nodes and portable to PostgreSQL where needed.

## Core entities

### Organization/school
`schools(id, name, local_slug, settings, created_at)`

### Users
`users(id, school_id, role, display_name, username, auth_fields, status, created_at)`

### Classes
`classes(id, school_id, teacher_id, name, subject, term, settings)`

### Courses / modules / lessons
`courses`, `modules`, `lessons`, versioned curriculum identifiers and metadata.

### Enrollment
`enrollments(user_id, course_id/class_id, state, started_at, completed_at)`

### Progress
`lesson_progress(user_id, lesson_id, state, percent, last_position, completed_at)`

### Assignments
`assignments(id, class_id, lesson_id?, title, instructions, due_at, ai_help_policy, rubric, max_score)`

### Submissions
`submissions(id, assignment_id, user_id, state, answers, attachments, submitted_at, teacher_feedback, score)`

### Quiz attempts
Attempt state, responses, scoring, timestamps.

### XP / badges
`xp_events` immutable/idempotent event log; `badges`; `user_badges`.

### Projects
Project metadata, source/workspace reference, status, timestamps.

### Resources / documents
Source, license, approval, metadata, local path/object reference, index state.

### AI conversations
`ai_conversations(id, user_id, mode, context_type, context_id, visible_to_teacher, created_at, expires_at)`
`ai_messages(id, conversation_id, role, content, safety_result, created_at)`
Deleted automatically at `expires_at` (`41`).

### Hint ladders and answer keys
`question_hints(question_id, step, text)`; `answer_keys(question_id, kind, value, tolerance)`. Answer keys are never sent to the tutor in Homework/Assessment mode (`42`).

### Safety
`safety_events(id, user_id, category, severity, action, created_at)` — minimal record.
`safety_alerts(id, event_id, excerpt, status, acknowledged_by, notes, created_at)` — visible only to designated contacts.
`safety_contacts(user_id, school_id, is_primary)`.

### Audit
`audit_log(id, actor_id, actor_type, action, target, reason, created_at)` — privileged actions, support sessions, grade and XP adjustments, data exports and deletions.

### Class settings
`classes.settings` includes `age_band` (`under13`, `13-15`, `16plus`) and `language`.

### Device/config
Appliance identity, software versions, model configuration, health snapshots.

## Privacy

Store only the identifiers required for local learning. Separate machine telemetry from student learning records. Central sync, if any, must be explicitly scoped and documented.

## Migrations

All schema changes require versioned migrations, backup before risky migrations, rollback/recovery planning, and tests against representative local data.
