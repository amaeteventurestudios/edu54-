# Remote Management Plane

## Goal

Enable Umanah to maintain deployed appliances securely without making the remote service necessary for classroom operation.

## Capabilities

- device enrollment;
- heartbeat/health;
- LabOS version;
- curriculum/model version;
- storage/RAM/CPU/temp;
- service health;
- update orchestration;
- diagnostic bundle request;
- secure shell/support via private overlay;
- configuration policy distribution.

## Network model

Use Tailscale/Headscale or an equivalent authenticated private overlay. **Never expose SSH directly to the public internet.** Prefer outbound-established connectivity from the appliance.

## Update model

Signed release metadata, staged download, preflight checks, backup/rollback, health verification after restart. Do not brick a school because an update was interrupted.

## Access control

Remote support access is **off until a school admin turns it on**, is time-limited (for example 24 hours), and every session is recorded in an audit log the school can read. Support tools never display student content, conversations or safety alerts (`41`, `50`).

## Data minimization

Central management receives machine/deployment telemetry and intentionally approved aggregate measures, not raw student prompts by default.
