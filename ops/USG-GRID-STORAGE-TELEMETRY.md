# USG Grid — Multi-Volume Storage Telemetry (not Umanah AI Lab)

This note was previously inside `docs/24-OBSERVABILITY-HEALTH.md`. It concerns the separate USG Grid node view, not the Umanah AI Lab product, so it lives here.

The USG Grid node view currently shows only root/internal disk usage. Extend the telemetry model to enumerate physical storage volumes while filtering pseudo-filesystems, Docker overlay mounts, tmpfs, loops, and duplicate partition/mount representations.

For `ai-node-01`, the admin UI should distinguish:

- internal system storage;
- data drive `AI_NODE_DATA` (SanDisk; HUNGREE Goat music, Umanah AI Lab, future apps) at `/srv/ai-node/storage/data`;
- Samsung `REYDIOUS_DATA` at `/srv/ai-node/storage/reydious`.

Keep the node card compact (for example, `3 volumes · 2 external`) and provide a storage-details drawer/panel showing model/label, mount point, filesystem, capacity, free/used, transport, role, and health. Do not render USB disks as separate topology nodes.

Suggested health semantics: >85% used warning, >95% critical, expected persistent volume missing degraded, unexpected read-only degraded, I/O/SMART failure critical where supported. Optional removable storage should not degrade a node unless configured as expected/persistent.
