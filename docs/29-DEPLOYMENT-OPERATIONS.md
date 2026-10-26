# Deployment Operations

## End-to-end lifecycle

```text
pilot/sponsor approved
→ hardware/BOM assigned
→ asset registered
→ base image/provision
→ burn-in test
→ model/curriculum install
→ site enrollment
→ ship/install
→ teacher/admin onboarding
→ pilot operation
→ support/monitor
→ evaluation
→ refresh/retire
```

## Pre-shipment checklist

Asset tag, serial, OS, LabOS version, model versions, curriculum version, storage health, networking, power supply, UPS/accessories as applicable, recovery media, documentation.

## Site installation

Confirm LAN access, DNS/local hostname, browser reachability from representative student devices, management overlay, no public SSH, offline-mode test, teacher account setup.

## Support tiers

Define what schools can self-service versus Umanah remote support. Build diagnostic export tooling so support does not require unrestricted access.

## Maintenance windows

Updates should be staged outside class hours where practical. Emergency security updates have a documented process.

## Decommission

Export institution-owned learning records/configuration as required, securely wipe credentials/content, remove fleet identity, update asset inventory.

## Host-specific notes

Host-specific details for the current development machine live in `../ops/AI-NODE-01.md`.
