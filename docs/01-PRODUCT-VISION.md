# Product Vision

> Shared project facts, brand rules, agent rules and skills live in one place each: `00-START-HERE.md` (facts), `06-DESIGN-SYSTEM.md` (visual), `../CLAUDE.md` (agent contract), `34-CLAUDE-SKILLS-SETUP.md` (skills). This document does not repeat them.

## Mission

Umanah AI Lab exists to expand access to advanced AI and computing infrastructure for schools, libraries, community organizations, nonprofits, and researchers that face cost, connectivity, privacy, or infrastructure barriers.

It is not primarily a chatbot product. It is an **education appliance**: compute, AI, curriculum, coding, knowledge, progress, and teacher workflows assembled into one locally operated environment.

## Problem statement

Modern AI capability is increasingly mediated through recurring cloud subscriptions, per-user accounts, internet dependency, and vendor-controlled data boundaries. Those assumptions work poorly for many educational environments. A classroom may already own Chromebooks, tablets, or old laptops, but lack the budget to purchase an AI subscription for every student or the connectivity to rely on cloud inference continuously.

Umanah changes the unit of access from **one subscription per student** to **one shared local appliance serving many students**.

## Product promise

A school should be able to receive a Umanah AI Lab (a compact appliance, currently a Mac mini for the Mini tier), connect power and networking, enroll it, and then let students use existing devices through a browser. The experience should remain useful even if the internet goes down. The institution retains local control of its learning environment and content, while Umanah can provide secure maintenance when connectivity exists.

## Core jobs to be done

### Student
- Get explanations without needing a commercial AI account.
- Follow structured learning rather than stare at a blank chat box.
- Practice, revise, code, create, and track progress.
- Use school-approved local resources.

### Teacher
- Assign learning, see progress, control AI assistance, create materials, and review submissions.
- Use AI as a teaching aide without giving up pedagogical control.

### School administrator
- Operate a predictable appliance with clear health, storage, users, security, and updates.

### Umanah support
- Maintain device health, software/model versions, and deployment state without making the school dependent on the central service for everyday learning.

## Non-goals for initial releases

- Replacing teachers.
- Building a giant general-purpose cloud AI SaaS.
- Supporting every LMS standard on day one.
- Shipping hundreds of mediocre courses before the core learning loop is excellent.
- Maximizing benchmark model size at the expense of responsiveness and reliability.
- Creating a social network or competitive public leaderboard for children.

## Moat / differentiation

The defensible value is the integrated system and deployment model: hardware-aware local inference, offline-first learning, curriculum normalization, role-aware AI behavior, teacher workflows, a coherent browser UX, remote lifecycle support, sponsor-funded deployment, and field-operational discipline.

## Product mantra

> **Ask. Learn. Build. Explore. Progress.**

Every major feature should strengthen at least one of these actions without fragmenting the experience.

## Safety promise

Students are children. The tutor is built to respond safely to a child in distress and to alert the school's own designated staff, while Umanah never sees student conversations (`41`).
