# Safeguarding and Child Safety

> Facts and principles: `00-START-HERE.md`. Tutor behavior rules: `42-AI-TUTOR-POLICY.md`. Privacy law: `50-STUDENT-DATA-PRIVACY-COMPLIANCE.md`.

## Why this exists

Umanah AI Lab puts a conversational AI in front of children. At some point a student will type something about self-harm, abuse, violence, sex or danger. Schools already have a legal and moral duty of care for their students. The product must support that duty, work offline, and never send student conversations to Umanah.

This is a v1 requirement, built into the first vertical slice, not a later add-on.

## How this fits "We monitor the machine. We do not monitor the child."

- **Umanah** never monitors students. Umanah never receives conversation content, safety alerts or excerpts.
- **The school** already cares for its students. When a student's message suggests they or someone else may be in danger, the appliance alerts the school's own designated safety contact, on the school's local network, under the school's policy.
- **Students are told** plainly, at first login and in the Ask screen, that the tutor is an AI, that it can be wrong, and that messages suggesting someone may be in danger are shared with a trusted adult at their school.

## Scope rules for v1

To keep risk small, v1 does **not** include:

- student-to-student messaging or any social features;
- image generation;
- live web browsing by the tutor;
- voice input from students (text only in v1).

Each of these needs its own safety review before it is added.

## Safety pipeline

Every student-reachable AI request goes through this pipeline on the server. The client cannot skip or configure it.

```text
student message
→ 1. input screen      (fast rules + local safety classifier)
→ 2. route by result   (allow · redirect · support · alert)
→ 3. tutor model       (only if allowed; policy from 42)
→ 4. output screen     (same classifier on the reply + answer-leak check from 42)
→ 5. deliver or replace with a safe response
→ 6. record a minimal safety event if anything triggered
```

### Layers

1. **Rules layer.** High-recall keyword and pattern lists for crisis language, maintained per language. Cheap, runs first, never the only check.
2. **Safety classifier.** A small local model dedicated to classifying harmful content (candidates to benchmark: open safety-classifier models such as the Llama Guard or ShieldGemma families; license review required before bundling). Runs on input and output.
3. **Tutor system policy.** The tutor prompt carries age-appropriate behavior rules. This is the last layer, not the main one.

### Categories and default response

| Category | Examples | Default action |
|---|---|---|
| Self-harm or suicide | wanting to die, self-injury | **Support + alert** |
| Abuse or neglect disclosure | someone hurting them at home | **Support + alert** |
| Threat of violence to others | plans to hurt someone, weapons at school | **Support + alert** |
| Sexual content | any sexual content | **Block + redirect**. Sexual content involving minors is always blocked, in every mode, including teacher mode. |
| Dangerous instructions | weapons, drugs, explosives, hacking others | **Block + redirect** |
| Hate or harassment | slurs, targeting a classmate | **Redirect** with a respectful response |
| Personal information | student shares home address or phone | **Redirect**: remind them not to share personal details; do not store in memory |
| Medical emergency | "my friend took pills" | **Support + alert**, urge telling an adult now |
| Distress without danger | stressed about exams, sad | **Support**: kind reply, suggest talking to a teacher or counselor; no alert |

Educational context matters. A history lesson about war, a health lesson about drugs, or a biology question about reproduction at the right grade level should be answered normally. The classifier is tuned and tested on curriculum-style questions so learning is not blocked.

### The support response

When a message is in a support or alert category, the tutor stops tutoring and shows a fixed, reviewed response, not free model text. It must:

- be warm, calm and non-judgmental;
- say the student is not in trouble and did the right thing by saying something;
- encourage telling a trusted adult now, and name the school's configured contact (for example, "Ms. Rivera, school counselor, Room 12");
- show help resources configured for the deployment's country. US defaults: **988 Suicide & Crisis Lifeline** (call or text 988), **Crisis Text Line** (text HOME to 741741), **Childhelp National Child Abuse Hotline** (1-800-422-4453), and 911 for immediate danger. Resources are stored on the appliance so they show offline;
- never promise secrecy or confidentiality;
- never diagnose, argue, or continue the lesson in the same reply.

The response text is written with a counselor, approved by the Umanah safeguarding lead, and versioned like curriculum. Schools may add local contacts but cannot remove the core guidance.

## Alerts to the school

- At enrollment, each school names at least one **designated safety contact** (for example, counselor or designated safeguarding lead) and a backup. Enrollment cannot finish without one.
- Alerts appear on the appliance in a **Safety Alerts** view visible only to designated contacts, on the local network, so they work offline.
- If the school enables it and internet is available, the appliance can also send a short notice (no message content) through the school's own email or SMS channel: "A safety alert needs review on Umanah AI Lab."
- An alert shows: student, time, category, the triggering message and the tutor's reply. The contact acknowledges it and records a note. Everything stays on the appliance.
- Alert handling beyond the product (calling parents, mandated reporting) follows the school's own procedures. Umanah provides a one-page guide for schools but does not make those decisions.

## Data and retention (defaults, school-configurable)

| Data | Where | Default retention |
|---|---|---|
| Student AI conversations | appliance only | 90 days, then deleted; always deleted at end of school year |
| Safety events (category, severity, time, student) | appliance only | school year |
| Alert excerpts (triggering message + reply) | appliance only, designated contacts only | school year, or per school policy |
| Aggregate counts (for example, "3 alerts this month") | appliance; sent to Umanah only if the school opts in | per report |

Umanah support staff cannot open conversations, safety events or alert excerpts, including during remote support.

## Who can see student AI conversations

Default proposal (**owner confirmation required**, then per-school setting):

- **Assignment-linked chats** (Ask used inside a lesson or homework): visible to that class's teacher, because it is part of the student's work.
- **Free Ask chats**: private to the student, except messages that trigger a safety alert, which the designated contact sees.
- Students are told which of their chats a teacher can see, on the Ask screen itself.

## Age bands

Deployments set an age band per class: **under 13**, **13–15**, **16+**. Under-13 classes get stricter classifier thresholds, simpler language, and no free Ask outside lesson context unless the teacher enables it.

## Testing requirements

- A **safety test set** of at least 300 messages per supported language covering every category, plus borderline educational questions that must *not* be blocked. Written with input from an educator or counselor.
- Release gate: 100% of the high-severity examples (self-harm, abuse, threats) routed to support + alert; no more than 5% of the educational borderline set blocked.
- The support response and alert flow are part of the required end-to-end tests (`30-TESTING-QA.md`), including with internet unplugged.
- Re-run the full set on any change to the tutor model, the classifier, prompts or thresholds.

## People

- Umanah names a **safeguarding lead** (can be a board member or advisor with education or counseling background) who approves the response text, test set and any change to this document.
- Before the first pilot with students, a practicing school counselor or child-safety professional reviews this document and the support response.

## Owner decisions needed

1. Confirm the default for who can see free Ask chats.
2. Confirm the default retention periods.
3. Name the Umanah safeguarding lead.
