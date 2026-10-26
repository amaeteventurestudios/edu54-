#!/bin/sh
# Run with sudo. Makes Docker wait for Tailscale at boot (see ops/systemd/docker-after-tailscale.conf).
set -eu
d=$(dirname "$0")
install -D -m0644 "$d/systemd/docker-after-tailscale.conf" /etc/systemd/system/docker.service.d/10-after-tailscale.conf
systemctl daemon-reload
systemd-analyze verify docker.service && echo "OK: docker now waits for tailscaled"
