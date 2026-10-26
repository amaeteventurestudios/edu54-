# Identity, Roles, and Authentication

## Roles

### Student
Own learning data, assigned content, tutor, projects, progress.

### Teacher
Manage assigned classes, content, submissions, assessments, revision, class analytics.

### School Admin
Manage local institution configuration, users, roles, policies, device settings.

### Designated Safety Contact
A teacher, counselor or admin flagged by the school to receive safety alerts (`41`). At least one required at enrollment.

### Umanah Support
Limited remote device/support capabilities, only while a school admin has enabled support access, time-limited and logged. Never access to student content, conversations or safety alerts.

### Umanah Admin
Central fleet/deployment administration where authorized.

## Prototype auth

Use lightweight local authentication built into the Umanah API (no Appwrite or other heavy backend on the appliance). Password hashes must use a modern password KDF supported by the chosen framework. Do not store plaintext passwords or default reusable secrets.

## Teacher PIN

A PIN can be useful for fast local teacher unlock of specific controls, inspired by Chatty-EDU, but should not substitute for full authentication for sensitive administration.

## Sessions

Secure HTTP-only cookies for browser sessions where applicable. CSRF protection, sane expiration, logout, lockout/rate limits.

## Future SSO

Keep domain model compatible with school identity providers without making SSO a prototype dependency.

## Privacy

Display names and local student identifiers are preferable to unnecessary personal profile collection. Do not require personal email for every student unless a deployment explicitly needs it.

## Young students

Classes in the under-13 band can use class code + picture or short PIN login set by the teacher (`45`). These accounts cannot change their own settings.
