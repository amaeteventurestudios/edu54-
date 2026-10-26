# API and Integration Contracts

## Principle

Umanah-owned contracts isolate the product from third-party implementation churn.

## Internal contract examples

### AI
`POST /api/ai/chat`
Inputs: user/session, message, context reference (lesson, assignment, project). **The server decides the mode** from the context and the assignment's policy; the client never sends a mode or model ID (`42`). Every call passes the safety pipeline (`41`). Replies stream.

### Learning
`GET /api/learn/continue`
`GET /api/courses`
`GET /api/lessons/:id`
`POST /api/lessons/:id/progress`

### Assignments
`GET /api/assignments`
`GET /api/assignments/:id`
`PUT /api/assignments/:id/draft`
`POST /api/assignments/:id/submit`

### Progress
`GET /api/progress/me`
`GET /api/badges/me`

### Knowledge
`GET /api/library/search`
`POST /api/library/documents/:id/ask`

### Device status
`GET /api/system/status` for local UI; remote telemetry uses a separate authenticated management channel.

## Third-party adapters

Create adapters such as `MoodleLearningAdapter`, `LocalLearningAdapter`, `OllamaInferenceAdapter`, `LlamaCppInferenceAdapter`, `JupyterExecutionAdapter` behind stable interfaces.

## Error model

Use predictable typed errors: unavailable, busy, unauthorized, invalid input, policy denied, resource missing, offline external dependency. UI should translate these into user-appropriate states.

## Versioning

Prefer backwards-compatible additive API evolution inside a release line; version breaking public/management contracts explicitly.

### Safety
`GET /api/safety/alerts` (designated contacts only)
`POST /api/safety/alerts/:id/acknowledge`

### Answer checking
`POST /api/assignments/:id/questions/:qid/check` — server compares with the key; returns correct/incorrect and optional misconception tag. Never returns the key in homework/assessment mode.
