# Gamification and Progression

## Goal

Make learning progress visible and rewarding without turning classrooms into attention-hacking games or public status competitions.

## Core mechanics

- XP.
- Levels.
- Badges.
- Streaks.
- Mastery/proficiency.
- Project completion.
- Course/module completion.
- Class challenges controlled by teachers.

## Illustrative XP schedule

- Complete lesson: +50 XP.
- Pass quiz: +100 XP.
- 90%+ quiz bonus: +50 XP.
- Complete module: +250 XP.
- Complete project: +500 XP.
- 7-day learning streak: +200 XP.

These values are configurable content policy, not hard-coded business logic.

## Level examples

1. Explorer
2. Learner
3. Builder
4. Creator
5. Innovator

## Badge examples

Python Starter, Loop Master, Hint-to-Solution (solved after one hint), Bug Fixer, First Builder, Knowledge Seeker, 7-Day Streak, Researcher, Project Finisher.

## Anti-abuse rules

XP events must be idempotent and auditable. Replaying a completion event must not award duplicate XP. Teacher/admin adjustments should record actor and reason.

## UI principles

Celebrations should be brief, tasteful, accessible, and optional under reduced-motion. Avoid public leaderboards by default. Show personal growth and mastery.

## Reward learning, not AI usage

Never award XP or badges for the number of AI messages sent. That encourages spamming the tutor, slows the box for the whole class (`43`) and rewards the wrong habit. Reward completed lessons, correct answers, fixed bugs, finished projects and improvement on weak topics.

## Streaks

Streaks count school days only, are private to the student, and never shame a broken streak ("Welcome back" rather than "You lost your streak").
