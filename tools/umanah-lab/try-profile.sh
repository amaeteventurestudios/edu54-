#!/bin/bash
# try-profile.sh <profile> <service:url>...   start ONE profile on the rootless daemon, prove health, record RAM, stop it again (core untouched)
P=$1; shift
cd ~/projects/umanah-ai-lab; set -a; . /srv/ai-node/storage/ssd/umanah-ai-lab/.env.local; set +a; export UMANAH_ROOT=/srv/ai-node/storage/ssd/umanah-ai-lab
dc="docker --context ai-data compose -p umanah -f infrastructure/compose/compose.yaml"
avail() { awk '/MemAvailable/ {printf "%.2f", $2/1048576}' /proc/meminfo; }
echo "[$P] free RAM before: $(avail) GB"
$dc --profile $P pull 2>&1 | tail -3 | cut -c1-160
( while true; do a=$(avail); if awk "BEGIN{exit !($a < 1.5)}"; then echo "[$P] WATCHDOG: free RAM $a GB < 1.5 GB -> stopping $P"; $dc --profile $P stop >/dev/null 2>&1; touch /tmp/prof-aborted; break; fi; sleep 1; done ) & WD=$!
rm -f /tmp/prof-aborted
$dc --profile $P up -d 2>&1 | tail -4 | cut -c1-200
T0=$(date +%s); declare -A ok
while [ $(( $(date +%s)-T0 )) -lt ${TIMEOUT:-420} ]; do
  all=1
  for sv in "$@"; do n=${sv%%=*}; u=${sv#*=}; c=$(curl -s -o /dev/null -m5 -w '%{http_code}' "$u"); [[ "$c" =~ ^(200|301|302|303|401|403)$ ]] && ok[$n]=$c || all=0; done
  [ $all = 1 ] && break
  a=$(avail); if awk "BEGIN{exit !($a < 1.5)}"; then echo "[$P] ABORT: free RAM $a GB < 1.5 GB"; break; fi
  sleep 10
done
for sv in "$@"; do n=${sv%%=*}; echo "[$P] $n -> http ${ok[$n]:-FAIL} after $(( $(date +%s)-T0 ))s"; done
echo "[$P] free RAM with it running: $(avail) GB"; $dc --profile $P ps --format '{{.Name}} {{.Status}}' | cut -c1-100
[ "${KEEP:-0}" = 1 ] || { $dc --profile $P stop 2>&1 | tail -3 | cut -c1-120; }
kill $WD 2>/dev/null; [ -f /tmp/prof-aborted ] && echo "[$P] ABORTED by watchdog"
echo "[$P] free RAM after stop: $(avail) GB"
