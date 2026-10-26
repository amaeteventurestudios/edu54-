# Offline-First Architecture

## Definition

Offline-first means core learning functions are designed to work from local compute and local data, not merely cached pages from a cloud service.

## Must work without public internet

- local login;
- home/dashboard;
- local AI inference;
- installed curriculum;
- lessons/practice;
- assignments/homework stored locally;
- revision;
- coding environment;
- local Knowledge Library/RAG;
- progress/XP/badges;
- teacher access to local classes and submissions;
- the safety pipeline, support responses and help resources, and Safety Alerts for designated contacts (`41`).

## May wait for connectivity

- software updates;
- new model downloads;
- new central curriculum packs;
- remote support;
- fleet health reporting;
- optional central impact aggregation;
- external web resources.

## Network detection

Do not couple app health to a single public ping. Distinguish local network, management overlay, and internet reachability.

## Sync philosophy

If central sync is introduced, use durable local event/state with retry and conflict handling. The local school remains operational authority for local work during disconnection.

## Test requirement

CI or deployment QA must include an explicit internet-disconnected test of the core student and teacher journeys.
