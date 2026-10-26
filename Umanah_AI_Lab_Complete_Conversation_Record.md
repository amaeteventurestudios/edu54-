# Umanah AI Lab — Complete Conversation Record, Decisions, Architecture, Product Definition, Build Strategy, and Implementation Handoff

> **Historical record (v1 brainstorm).** Kept for context. Several details here are superseded: the primary build host is now `ai-node-01`, the target school hardware is a Mac mini, and v2 adds safety, tutor-policy and other docs. Where this file disagrees with `docs/`, the docs win. Start at `docs/00-START-HERE.md`.


**Prepared for:** Umanah Institute / Claude / Codex / future implementation sessions  
**Project:** Umanah AI Lab  
**Platform software name:** Umanah LabOS  
**Public website page:** `umanah.org/ai-lab`  
**Live application/demo:** `ai.umanah.org`  
**Primary prototype target:** Raspberry Pi 4 (`pi-node-01`)  
**Document purpose:** Comprehensive synthesis of the full discussion, all major decisions, architecture choices, product direction, open-source strategy, UI concepts, licensing conclusions, fundraising strategy, legal boundaries, technical implementation guidance, and agent operating rules.

---

# 0. Executive Summary

Umanah Institute is developing **Umanah AI Lab**, a local-first AI learning appliance for schools, libraries, nonprofit organizations, community learning environments, and underserved communities.

The product is intended to provide shared, private, locally hosted AI access without requiring every student to maintain a cloud AI subscription, commercial account, or continuous internet connection.

The core operating idea is:

> **One appliance. Many students.**

Students and teachers connect over the local school or community network using devices they already have:

- Chromebooks
- laptops
- desktops
- tablets
- potentially phones where appropriate

The core educational experience should continue functioning when internet access is unavailable.

The public-facing product is:

# **Umanah AI Lab**

The orchestration/platform software underneath it is:

# **Umanah LabOS**

Recommended public language:

> **Umanah AI Lab, powered by Umanah LabOS.**

The project philosophy is:

> **Adopt mature open-source engines. Do not unnecessarily rebuild proven software. Build the Umanah value in orchestration, user experience, integration, curriculum, deployment, management, support, privacy, and mission.**

---

# 1. Origin of the Product Idea

The discussion began around identifying a meaningful public-interest AI project for Umanah Institute.

The broad opportunity identified was unequal access to advanced AI and computing.

The project should not be framed narrowly as:

> “AI for poor schools.”

Instead, the mission should include schools, libraries, nonprofits, community institutions, and researchers facing barriers such as:

- cost
- connectivity
- privacy
- infrastructure limitations
- recurring cloud dependence
- lack of technical staff
- insufficient local compute

A strong mission statement developed during the discussion:

> **Expanding access to advanced AI and computing infrastructure for schools, libraries, community organizations, and researchers that face cost, connectivity, privacy, or infrastructure barriers.**

A shorter public statement:

> **We build affordable, self-hosted AI labs for schools and communities that cannot afford expensive cloud computing.**

---

# 2. MIT Solve Context

The discussion was originally influenced by MIT Solve and the idea of addressing a real societal problem.

Umanah AI Lab is positioned as a nonprofit public-interest project distinct from USG’s commercial/deep-tech work.

The project fits a broad social-impact framing because:

- the problem is understandable
- local AI access is timely
- educational institutions are under pressure to adopt AI
- cloud dependence creates recurring cost
- privacy matters in schools
- offline/local capability matters in constrained environments
- shared infrastructure can produce better economics than per-user subscriptions

---

# 3. Umanah Institute vs USG

A major decision was to keep Umanah Institute and USG clearly separate.

## Umanah Institute

Umanah Institute can own and operate:

- nonprofit education initiatives
- research
- public-interest technology
- nonprofit lab equipment
- open-source educational infrastructure
- Umanah AI Lab
- curriculum
- school/community deployments
- sponsor-funded pilot systems
- charitable technical programs

## USG

USG can own:

- commercial software
- customer contracts
- proprietary commercial products
- commercial research
- commercial IP
- paid customer services

## Important boundary

Nonprofit funds should not casually subsidize:

- personal equipment
- founder personal use
- USG commercial development
- unrelated commercial projects

If Umanah Institute and USG work together, use:

- written agreements
- conflict-of-interest disclosure
- board approval
- arm’s-length terms
- documented fair-market-value treatment
- clear IP ownership

Recommended governance tools:

- conflict-of-interest policy
- IP ownership policy
- related-party transaction policy
- home-lab equipment use agreement
- board resolution for major equipment purchases
- USG ↔ Umanah collaboration/licensing template

A nonprofit attorney and nonprofit CPA should review any related-party arrangement.

---

# 4. Product Naming

The naming stack was clarified as follows.

## Organization
**Umanah Institute**

## Public-facing product
**Umanah AI Lab**

This is what schools, donors, students, teachers, and sponsors should see.

## Underlying software/orchestration layer
**Umanah LabOS**

Recommended wording:

> **Umanah AI Lab, powered by Umanah LabOS.**

## Deployment sizes

These are not separate software products. They are different hardware/configuration tiers of the same platform.

### AI Lab Mini
Designed for:
- one classroom
- one library
- small community center
- pilot deployment
- smaller concurrent user counts

### AI Lab School
Designed for:
- multiple classrooms
- entire school
- higher concurrency
- larger local models
- shared institutional use

### AI Lab Research
Designed for:
- universities
- community colleges
- nonprofit research labs
- advanced datasets
- larger models
- heavier technical/scientific workloads

Core principle:

> **Same platform. Different capacity.**

---

# 5. Public Website and Application URLs

The separation between the public product page and the actual application was clarified.

## Public product page

Recommended:

`umanah.org/ai-lab`

This page explains:

- the mission
- the product
- the problem
- the architecture
- deployment configurations
- privacy
- pilot program
- sponsor opportunity
- the student/teacher experience

The public page should not be called `/LabOS`.

LabOS is an implementation/platform term.

The public-facing concept is **AI Lab**.

## Live application / demo

Recommended:

`ai.umanah.org`

The public page should contain:

### Launch Demo
Links to:

`https://ai.umanah.org`

### Request Pilot Access
Links to:
- pilot form
- institutional inquiry flow
- or dedicated email workflow

---

# 6. Umanah Website Design Language

The Umanah AI Lab page should match the main Umanah Institute visual identity.

Existing visual language includes approximately:

- warm off-white: `#F7F5F0`
- outer stone: `#E8E5DE`
- primary navy: `#0B1F3B`
- navy hover: `#0A2A52`
- navy tint: `#E9EEF6`

Typography direction:

- elegant serif headings
- Libre Baskerville-style editorial typography
- Inter-style sans-serif body copy

Visual personality:

- institutional
- premium
- calm
- editorial
- research-oriented
- minimal
- not startup-neon
- not overloaded with gradients
- not generic SaaS

The AI Lab experience should feel like Umanah Institute, not like:

- Moodle
- Open WebUI
- JupyterHub
- Chatty-EDU
- Docker
- Ollama

Those products are implementation engines, not the visible brand.

---

# 7. Public AI Lab Page Copy Structure

A full public AI Lab page structure was defined.

## Hero

**Eyebrow**

> AI LAB · LOCAL AI · EDUCATION · DEPLOYMENT

**Headline**

# Umanah AI Lab

**Subheadline**

> *Local AI infrastructure for classrooms, libraries, and community learning environments.*

**Body**

> Umanah AI Lab gives schools and community institutions their own private AI learning environment—running locally, available over the devices they already have, and designed to work without expensive per-user AI subscriptions or continuous cloud connectivity.

**Primary CTA**

> Launch Demo

**Secondary CTA**

> Request Pilot Access

**Supporting line**

> Prototype #001 is now in development.

---

# 8. Public Page — The Access Gap

Suggested section:

**Eyebrow**

> THE ACCESS GAP

## AI access should not depend on recurring cloud costs.

Key idea:

Powerful AI tools are increasingly part of how students:

- learn
- create
- code
- research
- solve problems

But access often depends on:

- reliable internet
- per-user subscriptions
- cloud accounts
- external providers
- recurring infrastructure costs

Core message:

> **Bring the intelligence to the classroom instead of sending the classroom to the cloud.**

---

# 9. Public Page — What It Is

Suggested section:

**Eyebrow**

> ONE LOCAL LEARNING ENVIRONMENT

## AI, curriculum, coding, and exploration in one place.

Students open a browser.

They do not need to:

- install AI software
- configure models
- create commercial AI accounts
- understand Docker
- manage APIs
- install Python
- install Jupyter
- understand infrastructure

They enter one environment organized around:

> **Ask. Learn. Build. Explore. Progress.**

---

# 10. Student Information Architecture

The original dashboard concept had:

- Ask AI
- Coding Lab
- Learning Lab
- Knowledge Library

After examining Chatty-EDU, Moodle, structured curriculum, homework, revision, progress, and gamification, the student-facing architecture was refined.

Final core student areas:

## Ask
Private local AI tutor and assistant.

## Learn
Courses, lessons, homework, assignments, revision, quizzes, and teacher-assigned work.

## Build
Coding, notebooks, technical projects, science experiments, robotics, engineering.

## Explore
Local knowledge library, school resources, open reference material, approved documents, RAG.

## Progress
XP, badges, streaks, levels, mastery, course completion, project completion.

This becomes the core product vocabulary.

---

# 11. Ten Core UI Screens

Ten product screens were defined and later visualized.

## Screen 1 — Home / Student Dashboard

First screen after login.

Should feel:
- clean
- calm
- focused
- not cluttered

Top area:

> Welcome back, Jordan  
> Level 4 — Builder  
> 1,420 XP · 6-day streak

Main cards:

### Ask
Get help from your local AI tutor.

### Learn
Continue courses, homework, and revision.

### Build
Code, experiment, and create.

### Explore
Search your local knowledge library.

### Progress
View XP, badges, courses, and achievements.

Lower section:

> Continue Learning  
> Python Foundations — Lesson 6: Loops — 58%

Assigned Work:

> Fractions Practice — Due Friday

System panel:

> Local AI: Ready  
> Internet: Optional  
> Learning services: Available

---

# 12. Screen 2 — Ask / AI Tutor

This should not look like raw Open WebUI.

Left area can include:

- New Conversation
- Recent Chats
- My Courses
- Class Resources

Main heading:

> Ask your AI tutor

Suggested prompts:

- Explain Newton’s third law
- Help me understand Python loops
- Quiz me on machine learning
- Help me study for tomorrow

Context chip:

> Python Foundations · Lesson 6

Homework state:

> Homework Mode — hints only

Main principle:

The AI should know the educational context and not automatically give full solutions during homework/assessment modes.

---

# 13. Screen 3 — Learn / Learning Hub

Main central learning screen.

Header:

> Learn

Tabs:

- Continue
- Courses
- Assigned
- Homework
- Revision
- Completed

Course cards:

### Python Foundations
58% complete  
Next: Loops

### AI Foundations
82% complete  
Next: Responsible AI

### Science & Engineering
25% complete  
Next: Forces and Motion

Assigned work example:

> Fractions Practice  
> Assigned by Ms. Williams  
> Due Friday  
> Start Assignment

This screen combines the best conceptual parts of:

- Moodle
- Chatty-EDU
- Umanah-specific UX

---

# 14. Screen 4 — Lesson Screen

Should feel like an interactive textbook.

Example:

> Python Foundations  
> Module 3 · Lesson 6

Title:

# Loops

Objective:

> By the end of this lesson, you will understand how to repeat instructions using `for` loops.

Lesson body can contain:

- explanations
- code examples
- diagrams
- H5P-style interactions
- mini questions
- practice

Right-side AI panel:

> AI Tutor

Example action:

> Explain this more simply.

Bottom progression:

- Previous Lesson
- Practice
- Next Lesson
- +50 XP when complete

---

# 15. Screen 5 — Homework / Assignment

Inspired strongly by Chatty-EDU’s homework guardrail approach.

Example:

> Assignment: Fractions Practice

Metadata:

> Mathematics · Year 7  
> Assigned by Ms. Williams  
> Due Friday

Sections:

- Instructions
- Worksheet
- Resources
- Your Work

Help panel:

> Need help?

AI behavior:

> I can give you a hint, explain the concept, or show you a similar example.

Explicit behavior:

> Not full answers during homework mode.

Actions:

- Save Draft
- Submit Assignment

After submission:

> Submitted  
> Awaiting teacher review

---

# 16. Screen 6 — Revision

Revision should be separate from live homework.

Header:

> Revision

Recommended item:

> Python Loops  
> Based on your recent work, spend 10 minutes reviewing iteration.

Sections:

- Weak Topics
- Past Lessons
- Practice Questions
- Past Papers
- Flashcards
- Ask AI to Quiz Me

Action:

> Start 10-Minute Revision Sprint

Results:

> 4/5 correct  
> +75 XP  
> Suggested next topic: Functions

---

# 17. Screen 7 — Build Lab

This is the coding/project workspace.

Categories:

- Python Lab
- Coding Challenges
- AI Projects
- Science Experiments
- Robotics
- Engineering Projects

Example code:

```python
for number in range(1, 11):
    print(number)
```

Controls:

- Run
- Reset
- Save Project
- Ask for a Hint

AI assistant:

> Your code ran successfully. Want to make it print only even numbers?

Status:

> Project saved locally

Long-term, JupyterHub or another code environment can sit underneath while remaining invisible as a brand.

---

# 18. Screen 8 — Explore / Knowledge Library

This is the local knowledge + RAG experience.

Search:

> Search books, lessons, school resources, science references...

Categories:

- School Library
- Science
- Engineering
- AI & Computing
- History
- Teacher Resources
- Local Documents

Featured resources:

- NASA Space Science
- Introduction to Physics
- Python Reference
- Local School Handbook
- Class Study Guides

Document mode:

> Ask this document

Example:

> What does this chapter say about kinetic energy?

The AI should answer using approved local material.

---

# 19. Screen 9 — Progress / Achievements

Gamification screen.

Main card:

> Level 4  
> Builder  
> 1,420 / 2,000 XP

Streak:

> 6-day streak

Course progress:

- AI Foundations — 82%
- Python Foundations — 58%
- Science & Engineering — 25%

Badges:

- Python Starter
- AI Explorer
- Loop Master
- 5-Day Streak
- First Builder

Projects:

- Calculator — Complete
- Number Guessing Game — Complete
- Weather Data Project — In Progress

The experience should be rewarding without turning education into a toxic leaderboard.

---

# 20. Screen 10 — Teacher Center / Classroom Dashboard

Teacher Center is a major non-student screen.

Navigation:

- Overview
- Classes
- Curriculum
- Assignments
- Students
- Revision
- Assessments
- Resources
- AI Lesson Builder

Example class:

> Period 3 — Introduction to AI

Stats:

> 28 students  
> 19 completed today’s lesson  
> 6 in progress  
> 3 not started

Class progress:

> 74% average completion

Alert:

> 4 students may need help with Python loops

Recent submissions:

- Jordan Smith — Fractions Practice
- Maya Lee — Python Loops
- Alex Brown — AI Bias Quiz

Actions:

- Create Assignment
- Assign Lesson
- Build Quiz
- Start Revision Pack
- Generate Lesson with AI

Student detail:

> Jordan Smith  
> Python Foundations — 58%  
> AI Foundations — 82%  
> XP — 1,420  
> Badges — 7  
> Current streak — 6 days

---

# 21. Product Experience Principle

The app must feel like one coherent product.

Not:

> “Open WebUI here, Moodle over there, Jupyter somewhere else.”

The user should only feel:

# **Umanah AI Lab**

> Ask. Learn. Build. Explore. Progress.

---

# 22. Curriculum Strategy

Open-source infrastructure does not automatically provide complete curriculum.

Curriculum should be assembled from:

- Umanah-developed content
- open educational resources
- public-domain resources
- government educational content
- institutional content with permitted licenses
- teacher-created content
- appropriately licensed MIT/Harvard/etc. materials

Critical licensing rule:

> Publicly available does not mean freely reusable.

Each source must have its reuse/adaptation license checked before import.

---

# 23. Initial Curriculum Pathways

Prototype #001 should not attempt hundreds of courses.

Start with three high-quality pathways.

## AI Foundations

Suggested topics:

1. What is AI?
2. What is an algorithm?
3. What is machine learning?
4. What is an LLM?
5. Training data
6. Why AI can be wrong
7. Hallucinations
8. Bias
9. Privacy
10. Responsible AI
11. Prompting
12. Build an AI project

Possible progression:

> Understand → Apply → Create

---

# 24. Python Foundations

Suggested sequence:

1. What is programming?
2. First Python program
3. Variables
4. Data types
5. Conditions
6. Loops
7. Functions
8. Lists
9. Dictionaries
10. Errors and debugging
11. Calculator project
12. Guessing game
13. Quiz project
14. Dataset analysis
15. First AI application

---

# 25. Science & Engineering Foundations

Possible subjects:

- Physics
- Chemistry
- Biology
- Earth Science
- Electronics
- Robotics
- Aerospace
- Mechanical engineering
- Systems engineering

Physics example:

- Motion
- Forces
- Energy
- Momentum
- Electricity
- Waves
- Thermodynamics
- Space

Recommended lesson pattern:

> Learn → Experiment → Ask → Practice → Build → Assess

---

# 26. Curriculum Lesson Schema

A normalized Umanah lesson schema was proposed.

```text
Course
  Module
    Lesson
      Objective
      Explanation
      Example
      Activity
      AI Tutor Context
      Exercise
      Quiz
      Project
      XP
      Badge Trigger
```

This makes curriculum portable and consistent across sources.

---

# 27. Curriculum Ingestion Pipeline

Recommended pipeline:

```text
source
→ verify license
→ import
→ normalize
→ Claude/Codex structures content
→ adapt to Umanah lesson schema
→ generate exercises/quizzes
→ attach XP/badge rules
→ human review
→ publish
```

---

# 28. Knowledge Library

The Knowledge Library is not simply a course catalog.

It is the local reference/knowledge layer.

Possible content:

- open textbooks
- NASA resources
- NOAA resources
- public government science material
- Umanah curriculum
- teacher PDFs
- school handbooks
- study guides
- local datasets
- reference documents
- institution-approved educational resources

Long-term local RAG can answer against this approved material.

---

# 29. Gamification

Gamification is a first-class experience.

Preferred mechanics:

- XP
- levels
- badges
- streaks
- mastery
- project completion
- course completion
- achievements
- personal progress
- class challenges

Avoid making public student-vs-student leaderboard ranking the central mechanic.

Example XP:

- Complete lesson: +50 XP
- Pass quiz: +100 XP
- Score 90%+: +50 bonus
- Complete module: +250
- Complete project: +500
- 7-day streak: +200
- Finish course: badge

Example levels:

- Explorer
- Learner
- Builder
- Creator
- Innovator

Example badges:

- Python Starter
- Loop Master
- AI Explorer
- Builder
- Researcher
- 7-Day Streak

---

# 30. Open-Source Education Components Considered

Several existing systems were discussed.

## Moodle

Strengths:

- courses
- users
- classes
- assignments
- quizzes
- grades
- course completion
- teacher roles
- badges
- APIs

## Level Up XP

Potential Moodle gamification plugin.

Capabilities include:

- XP
- levels
- progression
- gamification mechanics

## Moodle Badges

Supports badge workflows.

## H5P

Interactive educational content:

- quizzes
- drag and drop
- interactive videos
- flashcards
- memory games
- branching scenarios
- image hotspots
- timelines
- presentations

## Learning Locker / xAPI

Potential later learning-event tracking layer.

---

# 31. Why Not Rebuild Everything

A major architectural principle was agreed:

> **Use mature open source. Build the orchestration layer.**

Avoid rebuilding:

- LMS
- notebook systems
- local LLM runtimes
- quiz engines
- badge standards
- interactive content systems
- model serving infrastructure

Umanah should differentiate through:

- orchestration
- user experience
- integration
- local-first architecture
- deployment simplicity
- curriculum
- remote support
- privacy
- hardware appliance design
- mission

---

# 32. Initial Open-Source Stack

The following stack was discussed as candidate infrastructure.

## Ollama
Purpose:
- local model runtime
- model management
- simple inference

## Open WebUI
Purpose:
- self-hosted AI interface
- RAG
- model connection
- REST/API integration

Long-term, Umanah may use APIs and not expose Open WebUI itself.

## JupyterHub
Purpose:
- browser-based coding
- Python
- notebooks
- STEM environments

## Moodle
Purpose:
- learning management
- assignments
- quizzes
- classes
- progress
- teachers
- badges

## H5P
Purpose:
- interactive educational content

## SQLite
Purpose:
- lightweight local storage
- prototype state
- progress
- Umanah-specific metadata

## PostgreSQL
Possible production database later.

## FastAPI
Potential lightweight backend.

## Tailscale / Headscale
Purpose:
- private remote management
- secure SSH
- fleet connectivity

## Ansible
Purpose:
- repeatable provisioning
- updates
- deployment automation

## Caddy / Nginx
Purpose:
- local/public reverse proxy
- HTTPS
- routing

## Uptime Kuma / Netdata
Potential health/monitoring primitives.

---

# 33. Appwrite Decision

Appwrite was considered because students need:

- login
- saved progress
- asynchronous learning
- profiles
- gamification
- backend state

However, the Raspberry Pi prototype has only about 4 GB RAM.

Appwrite self-hosted is too heavy for the Pi alongside local AI and other services.

Decision:

> **Do not install full Appwrite on Prototype #001.**

Use:

- SQLite
- lightweight backend
- FastAPI or equivalent
- local auth
- local progress

Appwrite may still be useful later at **Umanah Central**.

---

# 34. Local vs Central Data

Recommended split.

## Local appliance

Owns:

- student login
- local progress
- learning content
- assignments
- AI conversations
- local documents
- curriculum
- model runtime

Core operation must continue offline.

## Umanah Central

May handle:

- device fleet
- schools
- deployments
- software versions
- curriculum versions
- approved updates
- aggregate health
- remote support
- central admin
- sponsor reporting

---

# 35. Offline-First Principle

The architecture should be:

> **Offline-first, network-optional, centrally supportable.**

The following should continue working without internet:

- Ask
- Learn
- Build
- Explore
- Progress
- assignments
- revision
- local AI
- local documents
- local coding
- saved progress

The following can wait for internet:

- new model downloads
- remote support
- central reporting
- curriculum updates
- OS/software updates
- fleet telemetry

Critical principle:

> **If Umanah Central disappears temporarily, the school lab still works.**

---

# 36. Learning Plane vs Management Plane

A two-plane architecture emerged.

## Learning Plane

Local and independent.

Contains:

- AI models
- curriculum
- coding
- student accounts
- local progress
- assignments
- knowledge
- quizzes

## Management Plane

Optional secure connectivity to Umanah.

Contains:

- system health
- versions
- updates
- diagnostics
- secure maintenance
- remote SSH
- configuration
- fleet inventory

---

# 37. Privacy Principle

Core phrase:

> **We monitor the machine. We do not monitor the child.**

By default, central Umanah telemetry should focus on:

- CPU
- RAM
- storage
- temperature
- uptime
- model status
- service health
- software version
- curriculum version
- aggregate usage where appropriate

Do not centrally collect by default:

- full prompts
- student conversations
- sensitive student content
- unnecessary student profiling

Schools may have their own educational logging requirements, but that should be explicit and institution-controlled.

---

# 38. Security Principles

- local-first
- least privilege
- no public SSH
- private overlay for admin
- signed updates
- student/teacher/admin role separation
- local data by default
- minimum necessary telemetry
- auditable changes
- private management plane
- explicit model policies
- explicit content policies

---

# 39. Remote Management

Umanah should be able to securely support deployed appliances.

Recommended technologies:

- Tailscale
- Headscale
- equivalent private overlay

Potential remote tasks:

- SSH
- diagnostics
- updates
- model updates
- software repair
- health checks
- config changes
- logs
- backup verification

Never expose SSH directly to the internet.

---

# 40. Public Demo vs Real Deployment

A key distinction was made.

## Public Demo

At:

`ai.umanah.org`

Purpose:

- show donors
- show sponsors
- show schools
- show partners
- demonstrate UI
- demonstrate curriculum
- demonstrate product concept

## Real School Deployment

Runs physically at the school/community site.

Students use the local appliance.

They should not depend on the public demo or Umanah website to learn.

---

# 41. DNS and Public Routing

The public subdomain was originally pointed to a Tailscale `100.x.x.x` address.

That is not suitable for public DNS.

Intended public IP discussed:

`2.29.28.125`

Recommended public routing pattern:

```text
Internet
   |
ai.umanah.org
   |
2.29.28.125
   |
Caddy / Nginx
   |
reverse proxy
   |
prototype service / Pi / internal host
```

Private admin remains through Tailscale.

---

# 42. Raspberry Pi Prototype

Prototype #001 target:

**Raspberry Pi 4 Model B**

Observed approximate environment:

- Debian
- 4 CPU cores
- ~3.7 GB usable RAM
- ~96.4 GB free disk
- ~49°C
- existing containers/services
- Pi hostname: `pi-node-01`
- local IP: `192.168.6.235`

The Pi is appropriate for:

- proof of concept
- small local model
- basic curriculum
- local login
- progress
- UI
- demo of offline architecture

The Pi is not intended to prove high-performance inference.

Primary limitation:

> RAM

---

# 43. Pi Model Strategy

Recommended model range for the Pi:

- ~0.5B
- ~1B
- ~1.5B
- possibly ~3B quantized if responsive enough

Avoid depending on:

- 7B/8B models on 4 GB RAM

Message to sponsors:

> **This entire environment can run locally on inexpensive hardware. Production deployments use more capable hardware while keeping the same platform.**

---

# 44. Hardware Deployment Tiers

## AI Lab Mini

Possible target:

- Mac mini or similar
- ~$1,500–$2,500 total
- 1–2 TB
- sufficient unified/system memory
- small classroom or community environment

## AI Lab School

Possible target:

- larger Mac or GPU server
- higher memory
- larger storage
- multiple classrooms
- greater concurrency

## AI Lab Research

Possible target:

- high-end workstation/GPU server
- RAID
- large RAM
- larger models
- research/scientific computing

Exact hardware should be determined by benchmark.

---

# 45. Central Umanah Development Lab

A high-end central development/test environment was discussed.

Potential components:

- high-end Mac Studio
- very large unified memory
- large internal SSD
- external RAID
- backup
- networking
- UPS

Budget concept:

> roughly $25K–$30K

Purpose:

- develop LabOS
- test models
- benchmark hardware
- package deployments
- build curriculum
- test school appliances
- prepare images/releases
- support remote devices

Important legal/accounting framing:

If purchased by Umanah Institute:

> **It is Umanah Institute equipment.**

Not personal equipment.

---

# 46. $100,000 Fundraising Goal

The fundraising target discussed:

# **$100,000**

Bad story:

> Help buy an $18K or $30K computer.

Better story:

> **Help Umanah Institute establish an advanced computing lab and deploy the first generation of local AI learning systems to schools and communities.**

Illustrative use:

- ~$30K central lab
- ~$30K for ~15 Mini systems
- accessories/deployment
- curriculum
- software
- training
- monitoring
- evaluation
- contingency

---

# 47. Illustrative $100K Budget

Example working budget:

| Category | Approx. Budget |
|---|---:|
| Central Umanah development lab | $30,000 |
| 15 AI Lab Mini systems @ ~$2,000 | $30,000 |
| Displays/network/accessories/deployment | $8,000 |
| Software/platform development | $10,000 |
| Curriculum/teacher materials | $5,000 |
| Installation/training | $5,000 |
| Backup/security/remote management | $4,000 |
| Program evaluation | $3,000 |
| Contingency | $5,000 |
| **Total** | **$100,000** |

This is conceptual, not a final audited grant budget.

---

# 48. Sponsor Tiers

Possible sponsor units:

- Sponsor One AI Lab — ~$2,500
- Sponsor a Classroom — ~$5,000
- Sponsor a School — ~$10,000
- Founding Technology Partner — ~$25,000

Numbers should be finalized after BOM testing.

---

# 49. Sponsor Directory Strategy

A sponsor contact CSV was previously reviewed.

Relevant companies identified included:

- Microsoft
- Intel
- Thoughtworks
- Salesforce
- Adobe
- IBM
- Oracle
- Intuit
- AMD
- Keysight
- Synopsys
- Google
- Honeywell
- Tanium
- Cloudera
- Kyndryl
- Black Box
- Calix

The contacts should not be blasted indiscriminately.

Many are marketing/product/communications contacts.

Use them as:

> **door openers**

Ask for introductions to:

- CSR
- foundation
- education
- workforce
- community-impact
- hardware-donation
- philanthropic
- social-impact teams

---

# 50. Sponsor Impact Metrics

Potential reporting:

- labs deployed
- schools served
- libraries served
- students served
- teachers served
- AI sessions
- lessons completed
- projects completed
- coding hours
- uptime
- local AI hours
- cloud cost avoided
- curriculum completion
- active deployments
- teacher training sessions

---

# 51. Legal Ownership of Home-Lab Equipment

If Umanah Institute equipment is physically located at a founder’s home:

- Institute remains owner
- maintain asset inventory
- serial numbers
- receipts
- insurance
- board approval
- documented nonprofit purpose
- home-lab use agreement
- equipment-use policy

Public language:

> **Umanah Institute’s central development and research lab**

Not:

> my setup

---

# 52. IP Policy

Suggested principle:

> IP created within Institute-funded programs, using substantial Institute resources, or under Institute-directed charitable work is owned by Umanah Institute unless a written agreement states otherwise.

Pre-existing founder/USG IP should be documented separately.

---

# 53. Chatty-EDU Discovery

Repository reviewed:

`https://github.com/instance001/chatty-edu`

Chatty-EDU proved to be significantly closer to Umanah’s goal than initially assumed.

It is not just an offline chatbot.

It is a local-first educational environment.

---

# 54. Chatty-EDU Key Characteristics

From the repo documentation:

- local-first
- offline
- school hardware
- no cloud dependency
- no accounts
- no tracking
- single Rust binary
- egui desktop shell
- Windows-first
- CLI
- bring-your-own GGUF models
- teacher PIN
- homework workflow
- revision
- teacher dashboard
- printables
- marking
- rubrics
- local context
- sandbox
- modules
- local networking
- model roles
- visible local activity
- no telemetry

---

# 55. Chatty-EDU Homework Architecture

Representative workflow:

```text
homework/outgoing/
      ↓
transcribe
      ↓
homework/assigned/
      ↓
student work
      ↓
homework/completed/
      ↓
homework/marking/
```

Also:

- printables
- rubrics
- JSON packs
- Markdown authoring
- hash-chained submissions

This strongly influenced the Umanah homework/revision model.

---

# 56. Chatty-EDU Model Roles

Chatty auto-assigns:

- largest GGUF → main AI
- smallest GGUF → Bookkeeper

This reinforced the Umanah idea that students should choose tasks, not model names.

Students should not choose:

- Llama
- Qwen
- Gemma
- Mistral

They choose:

- Ask
- Learn
- Build
- Revise

LabOS decides the model.

---

# 57. Chatty-EDU Modules

Chatty supports modules with manifests and embedded/native/browser UIs.

This was especially relevant because Umanah is also an orchestration system.

Key lesson:

> Multiple specialized systems can live behind one shell.

---

# 58. Chatty-EDU Networking

Chatty supports optional LAN peer discovery and local exchange of:

- homework packs
- revision packs
- handoff notes
- classroom setup bundles

Incoming content is previewed before application.

This validated local-first distributed school workflows.

---

# 59. Chatty-EDU Privacy Philosophy

Its “ECG” activity window emphasizes visible local activity rather than cloud telemetry.

This reinforced Umanah’s privacy philosophy:

> **The appliance should make local operation understandable and trustworthy.**

---

# 60. Chatty-EDU vs Umanah AI Lab

Important differences.

## Chatty-EDU

- Windows-first desktop app
- no accounts
- zero-call-home
- local files
- device-centric
- optional local peer networking

## Umanah AI Lab

- browser-based
- shared school appliance
- multi-user
- student identity
- teacher identity
- curriculum
- gamification
- remote lifecycle management
- fleet support
- sponsor-funded deployment model
- school-wide access
- cross-device browser support

---

# 61. Should Umanah Fork Chatty?

Three options were identified.

## Option A — Run Chatty as separate component

Keep Chatty independent.

Integrate through:

- files
- local API
- process boundary
- bridge

## Option B — Contribute upstream

Improve Chatty where useful.

Keep Umanah-specific orchestration separate.

## Option C — Fork

Fork Chatty and make it part of LabOS.

This increases AGPL obligations.

Initial recommendation:

> **Do not fork immediately. Prototype and compare first.**

---

# 62. AGPLv3 Licensing

Chatty-EDU uses AGPLv3.

Important points:

## Attribution
Yes, preserve:

- copyright notices
- license
- relevant attribution
- third-party notices

## Network clause
If Umanah modifies AGPL-covered code and students access it over a school LAN/browser, this is still network interaction.

Local LAN is still a network.

## Physical distribution
If Umanah ships appliances containing AGPL-covered software, source-distribution obligations still matter.

## Source
Modified AGPL-covered components may require corresponding source to users.

---

# 63. Important Licensing Nuance

Running AGPL software on the same appliance does not automatically mean every independent Umanah component becomes AGPL.

However, legal boundaries depend on:

- how tightly components are combined
- whether code is derivative
- whether it is one combined program
- whether components communicate at arm’s length

Recommended legal approach:

- architecturally separate components where practical
- preserve notices
- publish required source
- seek open-source counsel before broad deployment

---

# 64. Open-Source Attribution Strategy

Umanah should have a clean page such as:

# Open Source & Third-Party Notices

Include:

- component names
- license names
- source links
- source code where required
- model licenses
- curriculum licenses
- third-party notices

This can be tasteful and non-intrusive.

It does not require huge open-source branding across the student UI.

---

# 65. Source-Code Protection Concern

The concern was:

> Avoid giving competitors unnecessary access to independent Umanah intellectual property.

Response:

- comply fully with licenses
- keep separable components separable
- do not copy AGPL code into unrelated proprietary modules
- provide only what licenses require
- use legal review for the boundary

---

# 66. Single Appliance Model

The real Umanah product is not intended to be primarily hosted centrally.

The actual use occurs on the appliance.

Example:

```text
Umanah AI Lab appliance
      |
school LAN
      |
Chromebooks / laptops / tablets
```

The public `ai.umanah.org` instance is primarily:

- demo
- sponsor showcase
- product preview
- pilot preview

---

# 67. Student AI Modes

The AI should adapt behavior by context.

## General Ask
Normal explanation.

## Lesson
Socratic instruction.

## Homework
Hints over answers.

## Assessment
No direct answer leakage.

## Revision
More open explanation.

## Project
Debugging and guidance.

## Teacher
Full answer keys, rubrics, examples, lesson planning.

---

# 68. Model Strategy

Model names should be hidden from students.

Possible roles:

- tutor model
- coder model
- embedding model
- background classifier
- bookkeeper/context model
- teacher-generation model

Selection depends on:

- RAM
- CPU/GPU
- concurrency
- latency
- license
- quality
- policy

---

# 69. Umanah LabOS Responsibilities

LabOS should eventually manage:

- UI
- device enrollment
- hardware detection
- model assignment
- model updates
- user roles
- curriculum
- progress
- gamification
- teacher workflows
- local knowledge
- service health
- secure management
- diagnostics
- software updates
- deployment versioning

---

# 70. Installation Goal

Long-term install/enrollment should become something like:

```bash
umanah enroll ABCD-EFGH
```

Expected lifecycle:

1. boot
2. connect network
3. enroll
4. detect hardware
5. install/configure services
6. download approved models
7. install curriculum
8. configure local routing
9. run health checks
10. establish secure management link
11. READY

Desired user experience:

> **Plug in. Enroll. Learn.**

---

# 71. Public Product Page Deployment Configurations

Suggested public section:

## AI Lab Mini
For classrooms, libraries, and small community environments.

## AI Lab School
For school-wide deployment.

## AI Lab Research
For advanced education and research.

Tagline:

> **Same platform. Different capacity.**

---

# 72. Public “Under the Hood” Section

Suggested copy:

**Eyebrow**

> OPEN INFRASTRUCTURE

## Built on open technology. Unified by Umanah.

Umanah AI Lab brings together mature open-source technology for:

- local AI
- curriculum
- interactive learning
- coding
- teacher workflows
- local knowledge
- device management

Umanah LabOS turns them into one coherent environment.

---

# 73. Pilot Program

Public pilot section:

**Eyebrow**

> PILOT DEPLOYMENTS

## Help us put local AI into real learning environments.

Potential pilot partners:

- schools
- libraries
- nonprofits
- community organizations
- education partners
- technology sponsors
- hardware partners
- philanthropic partners

Buttons:

- Request Pilot Access
- Become a Technology Partner

---

# 74. Prototype #001 Success Criteria

Prototype is successful when:

- Pi remains stable
- local AI answers without cloud API
- student can log in
- progress persists
- student completes lesson
- XP updates
- badge awards
- Python exercise runs
- AI provides lesson-aware guidance
- teacher can view/assign learning
- core system works offline
- Umanah can remotely support securely
- public demo is reachable
- UI feels like Umanah

---

# 75. Recommended Prototype Scope

Student:

- Ask
- Learn
- Build
- Explore
- Progress

Teacher:

- Classes
- Curriculum
- Assignments
- Students
- Progress
- Resources

Admin:

- Device Health
- Models
- Storage
- Updates
- Networking
- Diagnostics

---

# 76. Technical Decisions Still Open

These must be benchmarked, not guessed.

1. Moodle-heavy vs Chatty-inspired lightweight learning engine
2. Open WebUI UI vs API-only
3. JupyterHub vs lightweight code execution
4. Ollama vs direct GGUF/llama.cpp
5. SQLite vs Postgres in production
6. best small model on Pi
7. best production models on Mac Mini
8. maximum classroom concurrency by hardware tier

---

# 77. Skills Stack Requested for Claude/Codex

The user specified a strong skill stack to install/use.

## Global Core

1. `find-skills`
2. `systematic-debugging`
3. `verification-before-completion`
4. `writing-plans`
5. `code-review`
6. `git-guardrails-claude-code`
7. `claude-handoff`
8. `wayfinder`
9. `to-prd`
10. `qa`
11. `skill-creator`
12. `grill-me`

## UI and Web

13. `frontend-design`
14. `web-design-guidelines`
15. `impeccable`
16. `agent-browser`
17. `playwright-cli`
18. `shadcn`
19. `vercel-react-best-practices`

## Larger Engineering

20. `codebase-design`
21. `domain-modeling`
22. `test-driven-development`
23. `setup-pre-commit`
24. `using-git-worktrees`
25. `finishing-a-development-branch`

---

# 78. Skill Invocation Strategy

Recommended usage:

## Before architecture work

- `codebase-design`
- `domain-modeling`
- `writing-plans`

## Before UI implementation

- `frontend-design`
- `web-design-guidelines`
- `impeccable`
- `shadcn`

## Before coding

- `test-driven-development`
- `git-guardrails-claude-code`

## During debugging

- `systematic-debugging`

## Before completion

- `verification-before-completion`
- `qa`
- `playwright-cli`

## Before merge

- `code-review`
- `finishing-a-development-branch`

## Before ending long session

- `claude-handoff`

---

# 79. Full Autonomy Instruction for Claude/Codex

A major instruction from the user:

> **Do not ask routine implementation questions.**

The agent should:

- inspect code
- inspect environment
- read docs
- research official documentation
- use available tools
- make reasonable technical decisions
- debug independently
- verify independently
- proceed phase-to-phase automatically

Do not stop after each phase asking for permission.

Move forward unless there is a real human-only blocker.

---

# 80. When the Agent May Ask

Acceptable human blockers include:

- 2FA
- credentials
- payment authorization
- external legal/business approval
- irreversible destructive operation
- major spending
- truly ambiguous product decision with material impact

Routine technical uncertainty is not a reason to ask.

Research it.

---

# 81. “Do Not Ask Me” Operating Principle

The user explicitly wants:

> Full autonomy.

Meaning:

- use judgment
- research
- read documentation
- test
- recover
- debug
- proceed
- do not ask for every implementation detail

The agent should be able to move from:

Phase 1 → Phase 2 → Phase 3

without repeatedly waiting for the user.

---

# 82. UI Implementation Requirements

The UI should use:

- shadcn/ui
- Radix primitives
- Umanah design tokens
- polished responsive design
- Playwright verification
- visual consistency with approved mockups

Do not randomly redesign approved screens.

---

# 83. Approved Design Tokens

Approximate design values:

```text
Background:      #F7F5F0
Outer stone:     #E8E5DE
Primary navy:    #0B1F3B
Navy hover:      #0A2A52
Navy tint:       #E9EEF6
```

Typography:

- serif editorial headings
- sans-serif functional body/UI

---

# 84. Engineering Documentation Pack

A large documentation pack was created around the project.

Numbered docs:

00 through 40

This is actually **41 numbered Markdown files**.

Topics include:

- Start Here
- Product Vision
- Naming
- Public Website
- App Information Architecture
- UI Screen Specs
- Design System
- Technical Architecture
- Open Source Stack
- Chatty-EDU Strategy
- Learning Engine
- Local AI Engine
- Build Lab
- Knowledge Library
- Curriculum
- Gamification
- Student Experience
- Teacher Center
- Data Model
- Identity/Auth
- API Contracts
- Offline-First Architecture
- Remote Management
- Privacy/Security
- Observability
- Model Strategy
- Hardware Tiers
- Pi Prototype
- Provisioning
- Deployment Operations
- Testing/QA
- Licensing
- GitHub Workflow
- Claude Operating Instructions
- Skills Setup
- Pilot Program
- Fundraising
- Impact Measurement
- Legal Governance
- Roadmap
- Decision Log

Root files include:

- README.md
- CLAUDE.md
- AGENTS.md
- MANIFEST.md
- docs/INDEX.md

---

# 85. Recommended Repo Shape

Conceptual structure:

```text
umanah-ai-lab/
│
├── README.md
├── CLAUDE.md
├── AGENTS.md
│
├── docs/
│   ├── 00-START-HERE.md
│   ├── ...
│   └── 40-DECISION-LOG.md
│
├── apps/
│   ├── web/
│   ├── api/
│   ├── teacher/
│   └── management/
│
├── services/
│   ├── ai/
│   ├── learning/
│   ├── coding/
│   ├── knowledge/
│   └── telemetry/
│
├── packages/
│   ├── ui/
│   ├── auth/
│   ├── curriculum/
│   └── shared/
│
├── curriculum/
├── models/
├── deployment/
├── scripts/
├── tests/
└── third-party/
```

---

# 86. CLAUDE.md Intent

Suggested root instructions:

```text
Before doing any work:

1. Read docs/00-START-HERE.md.
2. Follow docs/33-CLAUDE-OPERATING-INSTRUCTIONS.md.
3. Load applicable skills from docs/34-CLAUDE-SKILLS-SETUP.md.
4. Read relevant subsystem docs.
5. Inspect existing implementation before modifying.
6. Write a plan for substantial changes.
7. Test changes.
8. Verify real runtime/UI behavior.
9. Never claim completion without verification.
10. Update docs and decision log when architecture changes.
```

---

# 87. Testing Philosophy

Testing should include:

- unit tests
- API tests
- integration tests
- browser tests
- Playwright
- offline mode
- restart resilience
- low-memory behavior
- power-loss recovery
- role permissions
- curriculum workflows
- AI guardrails
- UI regression
- accessibility

Agent should not claim success after only editing code.

---

# 88. Git Workflow Principles

- preserve working state
- use branches/worktrees where appropriate
- avoid unrelated changes
- test before commit
- document changes
- review before merge
- maintain rollback path
- keep changelog/release notes
- use code-review skill

---

# 89. Decision Log — Core Locked Decisions

## Product
Public product is **Umanah AI Lab**.

## Platform
Underlying software is **Umanah LabOS**.

## Public website
`umanah.org/ai-lab`

## App/demo
`ai.umanah.org`

## Student navigation
Ask / Learn / Build / Explore / Progress

## Architecture
Local-first and offline-capable.

## Management
Remote maintenance allowed through secure private management plane.

## Privacy
Monitor the machine, not the child.

## Open source
Adopt rather than rebuild wherever practical.

## UI
Expose Umanah, not third-party brands.

## Chatty
Study/integrate before deciding to fork.

## Appwrite
Do not deploy full Appwrite on the 4 GB Pi prototype.

---

# 90. Final Product Vision

A school receives a Umanah AI Lab.

They connect:

- power
- Ethernet

Students open a browser.

They see:

# Umanah AI Lab

**Ask**  
**Learn**  
**Build**  
**Explore**  
**Progress**

Teachers see:

**Classes**  
**Curriculum**  
**Assignments**  
**Revision**  
**Progress**  
**AI Lesson Builder**

Umanah support sees:

**Device Healthy**  
**Model Ready**  
**Software Current**  
**Storage Healthy**

If internet goes down:

> **Learning continues.**

If software needs maintenance:

> **Umanah can securely support the appliance.**

If students progress:

> **Their learning state is saved locally.**

If a student needs help:

> **The AI responds within the context of the lesson.**

If a sponsor asks what they funded:

> **Umanah can show measurable impact.**

---

# 91. Final Implementation Philosophy

The project should follow this rule:

> **Use mature open-source engines. Build Umanah around the experience, integration, deployment, support, curriculum, privacy, and mission.**

The product is not:

- Moodle
- Open WebUI
- Chatty-EDU
- JupyterHub
- Ollama

The product is:

# **Umanah AI Lab**

And the differentiator is that all of the underlying capabilities behave like:

> **one appliance, one interface, one learning environment, one deployment model.**

---

# 92. Final Agent Operating Directive

For Claude, Codex, or any future implementation agent:

> **Act autonomously. Inspect first. Research official docs. Use available skills. Make technically reasonable decisions. Do not ask for routine implementation guidance. Do not stop at the end of every phase. Move directly into the next phase when the previous one is verified. Only ask for genuine human-only blockers such as 2FA, credentials, irreversible destructive approval, payment, legal authorization, or a material product decision that cannot be inferred from the project documentation.**

And:

> **Do not claim completion until the software has been run, tested, and verified.**

---

# 93. Closing Statement

Umanah AI Lab is being designed as a practical, deployable local AI education platform—not a demo chatbot and not a collection of exposed third-party tools.

Its core identity is:

- local-first
- offline-capable
- school-owned
- privacy-conscious
- open-source-powered
- centrally supportable
- curriculum-driven
- teacher-controlled
- student-friendly
- sponsor-deployable

The product promise is simple:

> **Bring modern AI and technical learning into the classroom without requiring the classroom to depend on the cloud.**

## 2026-09-24 implementation addendum — AI Node storage, GitHub, DNS, and parallel-agent plan

The build target shifted from Raspberry Pi-first full-stack deployment to `ai-node-01` for the complete development/demo stack. The Pi remains a constrained validation node. The user clarified that applications on AI Node are generally installed for occasional use rather than run simultaneously; only a small number of services are expected to stay up continuously.

A new private GitHub repository was created at `amaeteventurestudios/umanah-ai-lab`. The initial scaffold includes README/agent instructions, docs, source/service/package/deployment/infrastructure/test directories, and a strict ignore policy for secrets, model weights, media, databases, logs, backups, and private content. A dedicated write-enabled deploy key titled `ai-node-01` was added and host SSH alias `github-umanah-ai-lab` successfully enabled cloning/pushing.

Storage on `ai-node-01` is explicitly split. The existing SanDisk ~128 GB USB mounted `/media/hungree-goat` contains the HUNGREE Goat media library and must not be formatted. A separate `/media/hungree-goat/umanah-ai-lab/` subtree was created with `apps/services/models/curriculum/knowledge/projects/database/docker-volumes/exports/backups/logs/tmp`; existing HUNGREE Goat content was verified untouched.

The newly attached Samsung Flash Drive FIT ~128 GB, serial `0361823090000118`, was conclusively distinguished from both the OS NVMe and the HUNGREE Goat drive. It is reserved exclusively for Reydious. Canonical target spec: GPT, one ext4 partition, label `REYDIOUS_DATA`, UUID-mounted at `/srv/ai-node/storage/reydious`, normal ownership for `aumanah`, and no Umanah data. At the latest checkpoint recorded here it was still factory exFAT because the autonomous shell lacked an interactive sudo TTY; the user explicitly authorized wiping the entire Samsung once root authentication is available.

The user wants separate Claude sessions able to work on Umanah and Reydious concurrently on the same computer. Required isolation goes beyond separate disks: separate repositories/worktrees, working directories, runtime roots, Docker Compose project names, host ports, container/service names, volumes, databases, logs, systemd units, and environment/secrets.

Public DNS for `ai.umanah.org` remains pointed to Hetzner public IP `2.29.28.125`; no Tailscale public DNS record is needed. Intended route is public HTTPS to Hetzner, then private reverse proxy over Tailscale to `ai-node-01`.

The requested 25 skills remain canonical: 12 global core, 7 UI/web, and 6 larger-engineering skills. They are fully listed in `docs/34-CLAUDE-SKILLS-SETUP.md` and mirrored in `AGENTS.md`/`docs/33-CLAUDE-OPERATING-INSTRUCTIONS.md`.
