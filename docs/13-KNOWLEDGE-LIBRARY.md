# Explore / Knowledge Library

## Purpose

Provide trusted local content and source-grounded AI assistance even when the internet is unavailable.

## Content classes

- Umanah curriculum.
- Teacher-uploaded resources.
- School handbooks/policies.
- Open textbooks.
- Government/public-domain STEM resources such as appropriate NASA/NOAA materials.
- Licensed institutional educational resources.
- Local datasets and study guides.

## Ingestion pipeline

```text
upload/import
→ malware/type validation
→ metadata extraction
→ license/source metadata
→ text extraction
→ chunking
→ embeddings/index
→ preview
→ approved/published
```

## Search

Combine metadata/full-text search and semantic retrieval. Users should be able to filter by subject, level, source, teacher/class, and local/approved status.

## Ask this document

The AI should answer from retrieved document passages and provide source references within the local library. If the evidence is insufficient, say so rather than fabricating.

## Governance

Every imported external resource should preserve source, license/reuse status, version/date, and approval state. Teacher-private resources remain scoped appropriately.

## Offline behavior

Search, retrieval, previews, and AI Q&A against indexed local content must work without public internet.

## Starter content

Kiwix and Kolibri are installed now (`53`). Load Kiwix ZIM collections (for example, a school-appropriate Wikipedia subset), OpenStax textbooks and PhET simulations as the first library (`47`). Every item keeps its license and attribution metadata.

## Prompt injection

Documents can contain text that tries to instruct the AI ("ignore your rules"). Retrieved passages are always treated as data, never as instructions, and uploaded documents are screened before indexing (`23`).
