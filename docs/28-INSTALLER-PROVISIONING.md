# Installer and Provisioning

## Goal

Production deployment should approach appliance simplicity: preprovisioned hardware or one enrollment operation, not a manual weekend of Docker commands.

Ideal command concept:

```bash
umanah enroll <school-code>
```

The literal CLI may change, but the experience is the requirement.

## Provisioning stages

1. Hardware/OS preflight.
2. Device identity generation/registration.
3. Storage/network validation.
4. LabOS packages/containers installation.
5. Database initialization/migrations.
6. Model pack selection/download/verification.
7. Curriculum pack installation.
8. Reverse proxy/local hostname configuration.
9. Management overlay enrollment.
10. Health tests.
11. Printable deployment report.

## Idempotency

Provisioning must be safe to re-run. Detect completed stages and reconcile drift rather than duplicate resources.

## Secrets

Never bake reusable shared secrets into images. Device-specific enrollment tokens should be short-lived where possible.

## Rollback

Keep previous known-good app/config version and restore points for database/config before destructive migrations.

## Host-specific notes

Host-specific details for the current development machine live in `../ops/AI-NODE-01.md`.

## macOS appliances

For Mac mini appliances: install the model runtime natively, register LabOS services with launchd, require FileVault, set "Start up automatically after a power failure", disable sleep, and enroll in the chosen macOS management tool for OS updates (`26`, `45`).
