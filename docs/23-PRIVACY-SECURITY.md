# Privacy and Security

## North-star principle

> **We monitor the machine. We do not monitor the child.**

## Privacy boundaries

Student conversations, assignments, and learning records stay local by default. Any future central synchronization must be explicit, necessary, minimal, school-authorized, and documented.

## Threat model categories

- unauthorized student-to-teacher/admin access;
- remote internet attack against public demo;
- malicious student code;
- compromised model/resource files;
- dependency supply-chain risk;
- lost/stolen appliance;
- support-account misuse;
- insecure backups;
- prompt injection from local documents;
- harmful AI output to a child (`41`);
- students bypassing tutor limits (`42`);
- unsafe update process.

## Baseline controls

- least privilege;
- local firewall;
- no public SSH;
- authenticated management overlay;
- secure password hashing;
- role checks server-side;
- dependency pinning/update review;
- signed or verified release artifacts;
- sandbox code execution;
- input/file validation;
- encrypted transport for browser/admin connections where practical;
- audit logs for privileged actions.

## Education privacy

Before production K-12 deployment, conduct legal/privacy review for applicable laws and district policies. Do not make unverified FERPA/COPPA compliance claims merely because the system is local.

## Security response

Document severity, containment, patch, notification, and fleet update procedures before broad deployment.

## Related documents

Child safety: `41`. Tutor limits: `42`. US student privacy law and required agreements: `50`. Full-disk encryption and physical setup: `45`.
