#!/usr/bin/env bash
# Host-side helper for Admin > Services (docs/53). The API container never holds the container socket: it drops a request file in
# <data>/database/control/requests/ and this agent, running as the appliance user, carries it out with `umanah-lab profile`.
# umanah-lab itself refuses to start something if that would leave less than 2 GB of RAM free.
#   install:  cp tools/umanah-lab/umanah-engine-agent.service ~/.config/systemd/user/ && systemctl --user enable --now umanah-engine-agent
set -uo pipefail
ROOT="${UMANAH_ROOT:-/srv/ai-node/storage/ssd/umanah-ai-lab}"
CTL="$ROOT/control"
mkdir -p "$CTL/requests" "$CTL/results"
while true; do
  touch "$CTL/.agent-alive"
  for f in "$CTL"/requests/*.json; do
    [ -e "$f" ] || continue
    read -r id profile action < <(python3 -c "import json,sys; d=json.load(open('$f')); print(d['id'], d['profile'], d['action'])" 2>/dev/null) || { rm -f "$f"; continue; }
    case "$profile" in content|lms|code|admin) ;; *) rm -f "$f"; continue ;; esac
    case "$action" in start|stop) ;; *) rm -f "$f"; continue ;; esac
    out=$(umanah-lab profile "$action" "$profile" 2>&1); rc=$?
    python3 - "$CTL/results/$id.json" "$id" "$profile" "$action" "$rc" "$out" <<'PY'
import json, sys, time
path, rid, profile, action, rc, out = sys.argv[1:7]
last = [l for l in out.strip().splitlines() if l.strip()][-1:] or [""]
json.dump({"id": rid, "profile": profile, "action": action, "ok": rc == "0", "message": last[0][:200], "at": time.strftime("%Y-%m-%dT%H:%M:%S")}, open(path, "w"))
PY
    rm -f "$f"
  done
  sleep 3
done
