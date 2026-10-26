# Observability and Health

## Local status model

A local `/status` view should synthesize:
- AI runtime/model ready;
- learning service;
- database;
- knowledge index;
- code runner;
- storage;
- RAM;
- temperature where available;
- local network;
- management connectivity;
- software/update state.

## Health states

- Healthy
- Degraded
- Offline (for a specific dependency)
- Update Required
- Maintenance

Avoid one global red/green light that hides partial functionality.

## Central telemetry

Recommended machine metrics: CPU, RAM, disk capacity/IO pressure, temperature, load, uptime, service restart counts, model load failures, version inventory.

## Logs

Use structured logs with component, severity, event code, request/correlation ID where appropriate. Redact secrets and avoid recording student prompt content in operational logs by default.

## Alerts

Alert on actionable conditions: disk exhaustion, repeated service crash, temperature danger, database corruption signs, management offline beyond threshold, failed update rollback.

## Host-specific notes

Host-specific details for the current development machine live in `../ops/AI-NODE-01.md`.
