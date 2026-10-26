#!/usr/bin/env bash
# ai-node-01 — data drive rename (root part).   ops/AI-NODE-01.md → "Data drive rename", steps 0, 2, 3, 4 (+ restart of step 6)
#
# Run ONCE, as root:      sudo bash ~/projects/umanah-ai-lab/scripts/ai-node-01-data-drive-rename.sh
#
# What it does (idempotent — safe to re-run if it stops half way):
#   1. finds the SanDisk by its filesystem UUID and refuses to continue if that is not an ext4 partition
#   2. stops the HUNGREE Goat station units (the tunnel stays up) and removes their containers
#   3. unmounts EVERY layer at /media/hungree-goat (the audit found a stale /dev/sda1 layer under /dev/sdb1)
#   4. relabels the ext4 filesystem HUNGREE-GOAT -> AI_NODE_DATA with e2label (no format, no data touched)
#   5. backs up /etc/fstab, replaces the old mount line with a UUID line at /srv/ai-node/storage/data (nofail)
#   6. mounts it, write-tests as the normal user, and leaves /media/hungree-goat as a temporary symlink
#   7. installs the rootless-Docker system packages (uidmap, slirp4netns, passt) for Step 3
#   8. starts the HUNGREE Goat units again (they now read HGC_MEDIA=/srv/ai-node/storage/data)
#
# It never touches the Samsung/Reydious drive (it is not referenced here) and never formats anything.

set -euo pipefail
# --dry-run: read the real state, print every action that WOULD happen, change nothing. Works without root.
DRY=0; [ "${1:-}" = "--dry-run" ] && DRY=1
[ "$DRY" = 1 ] || [ "$(id -u)" = 0 ] || { echo "run as root:  sudo bash $0   (or: bash $0 --dry-run)"; exit 1; }
# act: runs a command, or in dry-run mode just prints it
act() { if [ "$DRY" = 1 ]; then echo "   [dry-run] would run: $*"; else "$@"; fi; }

USER_NAME=aumanah
USER_UID=$(id -u "$USER_NAME")
UUID=7d12ed26-3a1f-45c6-a1ce-37c5097c3d11        # the SanDisk (HUNGREE-GOAT -> AI_NODE_DATA)
OLD=/media/hungree-goat
NEW=/srv/ai-node/storage/data
LABEL=AI_NODE_DATA
LOG=/home/$USER_NAME/ai-node-01-data-drive-rename.log
[ "$DRY" = 1 ] || exec > >(tee -a "$LOG") 2>&1
echo "=== $(date -Is) data drive rename starting"

as_user() { if [ "$(id -u)" != 0 ]; then "$@"; else sudo -u "$USER_NAME" XDG_RUNTIME_DIR=/run/user/$USER_UID DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$USER_UID/bus "$@"; fi; }
uctl() { as_user systemctl --user "$@"; }

# ---- 1. identify the drive ---------------------------------------------------------------
DEV=$(blkid -U "$UUID" || true)
[ -n "$DEV" ] || { echo "ABORT: no device with UUID $UUID (drive unplugged?)"; exit 2; }
FST=$(lsblk -no FSTYPE "$DEV")
[ "$FST" = ext4 ] || { echo "ABORT: $DEV is '$FST', expected ext4 — this script only handles ext4"; exit 2; }
echo "drive: $DEV  type=$FST  label=$(lsblk -no LABEL "$DEV" || true)  model=$(lsblk -ndo MODEL "$(lsblk -ndo PKNAME "$DEV" | sed 's#^#/dev/#')" 2>/dev/null)"

# ---- 2. stop HUNGREE Goat (station units + control; tunnel keeps running) ----------------
echo "== stopping HUNGREE Goat units"
act uctl stop 'hungree-goat-stream@*' 'hungree-goat-liquidsoap@*' hungree-goat-control.service 2>&1 || true
sleep 2
for c in $(docker ps -aq --filter name=hgc- --filter name=hg-liq-); do act docker rm -f "$c" >/dev/null 2>&1 || true; done
echo "processes still using $OLD or $NEW (informational):"; fuser -vm "$OLD" 2>&1 | head -12 || true

# ---- 3. unmount every layer at the old path ----------------------------------------------
echo "== unmounting every layer at $OLD"
if [ "$DRY" = 1 ]; then
  echo "   layers currently mounted at $OLD:"; grep " $OLD " /proc/self/mountinfo | awk '{print "     " $NF ", " $(NF-1) " (mount id " $1 ")"}'
  echo "   [dry-run] would unmount each layer (umount, then umount -l if busy) until none remain"
else
for i in 1 2 3 4 5 6; do
  findmnt -rn "$OLD" >/dev/null 2>&1 || break
  umount "$OLD" 2>/dev/null || umount -l "$OLD" || true
done
fi
if [ "$DRY" = 0 ] && findmnt -rn "$OLD" >/dev/null 2>&1; then echo "ABORT: $OLD is still mounted:"; findmnt "$OLD"; exit 3; fi
[ "$DRY" = 0 ] && grep -q " $OLD " /proc/self/mountinfo && { echo "ABORT: mountinfo still lists $OLD"; exit 3; }
[ "$DRY" = 1 ] || echo "clean: nothing mounted at $OLD"

# ---- 4. relabel (no format) --------------------------------------------------------------
if [ "$(lsblk -no LABEL "$DEV")" != "$LABEL" ]; then
  echo "== e2label $DEV $LABEL"
  act e2label "$DEV" "$LABEL"
fi
echo "label now: $(lsblk -no LABEL "$DEV")   uuid: $(lsblk -no UUID "$DEV")"
[ "$(lsblk -no UUID "$DEV")" = "$UUID" ] || { echo "ABORT: UUID changed?!"; exit 4; }

# ---- 5. fstab ----------------------------------------------------------------------------
BK=/etc/fstab.backup-before-data-rename-20260924
[ -f "$BK" ] || act cp -p /etc/fstab "$BK"
python3 - "$UUID" "$OLD" "$NEW" "$DRY" <<'PY'
import sys
uuid, old, new, dry = sys.argv[1:]
lines = open('/etc/fstab').read().splitlines()
out, have_new = [], False
for l in lines:
    f = l.split()
    if f and not l.lstrip().startswith('#') and f[0] == f'UUID={uuid}':
        if len(f) > 1 and f[1] == new: have_new = True; out.append(l)
        else: continue            # old /media/hungree-goat entry: removed
    else:
        out.append(l)
if not have_new:
    out.append(f'UUID={uuid} {new} ext4 defaults,nofail 0 2')
new_text = '\n'.join(out) + '\n'
if dry == '1':
    import difflib
    print('   [dry-run] fstab changes:')
    print(''.join('     ' + l for l in difflib.unified_diff([x + '\n' for x in lines], new_text.splitlines(True), 'fstab.now', 'fstab.after', n=0)))
else:
    open('/etc/fstab', 'w').write(new_text)
PY
echo "== fstab now:"; grep -n -E "$UUID|reydious" /etc/fstab
act systemctl daemon-reload

# ---- 6. mount at the new path, test, compatibility symlink -------------------------------
if [ "$DRY" = 1 ]; then
  echo "   [dry-run] would: create $NEW (owner $USER_NAME), mount it from fstab, write-test as $USER_NAME, require $NEW/music to exist,"
  echo "   [dry-run]        rmdir the now-empty $OLD (aborts safely if not empty) and symlink $OLD -> $NEW"
else
install -d -o "$USER_NAME" -g "$USER_NAME" -m 755 "$NEW"
findmnt -rn "$NEW" >/dev/null 2>&1 || mount "$NEW"
findmnt -o TARGET,SOURCE,FSTYPE,LABEL,OPTIONS "$NEW"
as_user touch "$NEW/.write-test" && as_user rm -f "$NEW/.write-test" && echo "write test as $USER_NAME: OK"
[ -d "$NEW/music" ] || { echo "ABORT: $NEW/music missing — wrong drive?"; exit 5; }
if [ -d "$OLD" ] && [ ! -L "$OLD" ]; then rmdir "$OLD"; fi        # fails (safely) if it is not empty
[ -e "$OLD" ] || ln -s "$NEW" "$OLD"
ls -ld "$OLD"
fi

# ---- 7. packages for Step 3 (rootless Docker) --------------------------------------------
echo "== rootless Docker prerequisites"
act env DEBIAN_FRONTEND=noninteractive apt-get install -y uidmap slirp4netns passt || echo "WARNING: apt install failed — Step 3 will report what is missing"

# ---- 8. HUNGREE Goat back up -------------------------------------------------------------
echo "== starting HUNGREE Goat"
act uctl start hungree-goat-control.service
sleep 4
act uctl start hungree-goat-liquidsoap@lofi.service hungree-goat-stream@lofi.service
sleep 8
uctl is-active hungree-goat-control hungree-goat-liquidsoap@lofi hungree-goat-stream@lofi hungree-goat-tunnel || true
echo "=== $(date -Is) done.  Tell Claude: 'root step done'."
