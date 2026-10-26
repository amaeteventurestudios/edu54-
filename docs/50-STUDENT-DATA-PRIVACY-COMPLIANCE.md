# Student Data Privacy Compliance (US)

> Privacy principles and security: `23-PRIVACY-SECURITY.md`. Safety data: `41-SAFEGUARDING-CHILD-SAFETY.md`. This is an engineering and planning summary, not legal advice. Get education-privacy counsel to review before the first pilot with students.

## Why it matters

"The data stays on the box" is a strong privacy position, but it doesn't remove legal duties. Umanah still installs, updates and remotely supports a system holding student records, so schools will treat Umanah as a vendor and ask for signed agreements before any pilot.

## Laws and frameworks schools will raise

| Law / framework | What it means for Umanah |
|---|---|
| **FERPA** (student education records) | Umanah acts as a "school official" under the school's direct control; access to records only for the service, no other use. Remote support must not access records without school authorization. |
| **COPPA** (children under 13) | Schools can authorize collection for educational use. The FTC's amended COPPA Rule has applied since April 22, 2026 (stronger data-retention, security and third-party-disclosure requirements). Minimize data for under-13s. |
| **State student privacy laws** (for example California SOPIPA, Illinois SOPPA, New York Education Law 2-d, and many others) | Bans on selling or advertising with student data; security and breach rules; many require a signed data privacy agreement. |
| **Student Data Privacy Consortium (SDPC) National Data Privacy Agreement (NDPA)** | The standard agreement many US districts use with vendors. Have Umanah's version ready to sign, with state-specific exhibits. |
| **PPRA** (surveys on sensitive topics) | Relevant if Umanah runs student surveys for impact measurement (`37`); get school and parent consent as required. |

Outside the US (later): GDPR and the UK Age Appropriate Design Code would need their own review.

## Documents to prepare before the first pilot

1. Privacy policy for schools and families, in plain language.
2. Data inventory: every data item, where it's stored, who can see it, how long it's kept.
3. Data flow diagram: what leaves the appliance (machine health, optional aggregates) and what never does (conversations, records).
4. NDPA (signed-ready) and a one-page privacy summary for IT and principals.
5. Subprocessor list (expected: none for student data; list any support tools used).
6. Security overview: encryption, access control, update signing, support access logging (`23`, `22`).
7. Incident response plan with school notification timelines.
8. End-of-pilot data return and deletion certificate.

## Built into the product

- **Minimal data:** display name and username; no student email or birthdate required; age band per class instead of birthdates.
- **Retention defaults** (`41`) with automatic deletion; per-student export and delete for school admins.
- **Support access** requires a school admin to turn it on, is time-limited, is logged in an audit view the school can read, and never includes student content.
- **No advertising, no sale of data, no model training on student data.** Written into the privacy policy and the NDPA.
- **Encryption:** full-disk encryption on the appliance; HTTPS on the local network (`45`).
