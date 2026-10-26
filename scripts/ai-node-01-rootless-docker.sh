#!/usr/bin/env bash
# Rootless Docker for Umanah, data-root on the data drive (ops/AI-NODE-01.md "Docker on the data drive").
# Run as the normal user AFTER scripts/ai-node-01-data-drive-rename.sh (which installs uidmap, slirp4netns, passt).
# Leaves the system Docker and its containers completely alone.
set -euo pipefail
DATA=/srv/ai-node/storage/data
mountpoint -q "$DATA" || { echo "$DATA is not mounted — run the data-drive rename script first"; exit 2; }
command -v newuidmap >/dev/null || { echo "uidmap is missing (the root script installs it)"; exit 2; }
mkdir -p "$DATA/docker" ~/.config/docker
[ -f /etc/subuid ] && grep -q "^$USER:" /etc/subuid || { echo "no subuid range for $USER"; exit 2; }

# 1. (--force: the tool otherwise refuses while the system Docker socket is reachable; it only writes user-level units.)
# install the rootless daemon as a *user* systemd service (its own socket: $XDG_RUNTIME_DIR/docker.sock)
if ! systemctl --user is-enabled docker.service >/dev/null 2>&1; then
  dockerd-rootless-setuptool.sh install --force --skip-iptables 2>&1 | tail -15
fi
# The setup tool switches the user's default CLI context to the rootless daemon. Everything else on this machine
# (USG Grid, Hermes, HUNGREE Goat scripts, cron) uses plain `docker` and must keep talking to the system daemon.
docker context use default >/dev/null
docker context rm -f rootless >/dev/null 2>&1 || true
# 2. data-root on the drive (merge, keep other settings)
python3 - <<PY
import json, os
p = os.path.expanduser("~/.config/docker/daemon.json")
d = json.load(open(p)) if os.path.exists(p) else {}
d["data-root"] = "$DATA/docker"
json.dump(d, open(p, "w"), indent=2)
PY
systemctl --user daemon-reload
systemctl --user enable docker.service
systemctl --user restart docker.service
loginctl enable-linger "$USER" || true
# 3. a context that always points at the rootless daemon; umanah-lab uses it exclusively
SOCK="unix://${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/docker.sock"
docker context inspect ai-data >/dev/null 2>&1 || docker context create ai-data --docker "host=$SOCK"
sleep 3
docker --context ai-data info --format 'rootless daemon: root={{.DockerRootDir}} rootless={{.SecurityOptions}}' | tee /dev/stderr | grep -q "$DATA/docker" && echo "OK: data-root is on the data drive"
[ "$(docker context show)" = default ] || { echo "ABORT: default docker context changed"; exit 3; }
echo "system Docker untouched: $(docker --context default ps -q | wc -l) containers still running there"
