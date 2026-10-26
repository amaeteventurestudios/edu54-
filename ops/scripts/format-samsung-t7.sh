#!/usr/bin/env bash
# Format the Samsung T7 Shield 2 TB SSD on ai-node-01 as GPT + one ext4
# partition, labeled AI_NODE_SSD, mounted by UUID at /srv/ai-node/storage/ssd
# (fstab, nofail), owned by the login user.
# Run with: sudo bash ops/scripts/format-samsung-t7.sh
# Locked to one drive. Aborts on any mismatch. Never touches any other disk.
set -euo pipefail

SERIAL="M88001AT0SNRN6S"                 # as reported by lsblk
BYID="/dev/disk/by-id/usb-Samsung_PSSD_T7_Shield_S6NRNS0TA10088M-0:0"
LABEL="AI_NODE_SSD"
MNT="/srv/ai-node/storage/ssd"
USER_NAME="${SUDO_USER:-aumanah}"

[ "$(id -u)" -eq 0 ] || { echo "Run with sudo."; exit 1; }
[ -e "$BYID" ] || { echo "ABORT: $BYID not found. Is the T7 plugged in?"; exit 1; }
DEV="$(readlink -f "$BYID")"
[ "$(lsblk -dno SERIAL "$DEV")" = "$SERIAL" ] || { echo "ABORT: serial mismatch on $DEV."; exit 1; }
[ "$(lsblk -dno TRAN "$DEV")" = "usb" ] || { echo "ABORT: $DEV is not USB."; exit 1; }
case "$(lsblk -dno MODEL "$DEV")" in *"T7 Shield"*) ;; *) echo "ABORT: $DEV is not a T7 Shield."; exit 1;; esac
ROOTDISK="$(lsblk -no PKNAME "$(findmnt -no SOURCE /)" 2>/dev/null | tail -1)"
[ "/dev/$ROOTDISK" != "$DEV" ] || { echo "ABORT: $DEV holds the system."; exit 1; }
if lsblk -lnpo MOUNTPOINTS "$DEV" | grep -q .; then
  echo "ABORT: something on $DEV is mounted:"; lsblk -o NAME,MOUNTPOINTS "$DEV"; exit 1
fi
PARTS="$(lsblk -lnpo NAME,TYPE "$DEV" | awk '$2=="part"{print $1}')"
[ "$(echo "$PARTS" | grep -c .)" -le 1 ] || { echo "ABORT: unexpected partitions: $PARTS"; exit 1; }

echo "This will DESTROY everything on:"
lsblk -o NAME,SIZE,TRAN,MODEL,SERIAL,FSTYPE,LABEL,MOUNTPOINTS "$DEV"
echo
read -r -p "Type the serial ($SERIAL) to continue: " typed
[ "$typed" = "$SERIAL" ] || { echo "Serial not confirmed. Nothing changed."; exit 1; }

echo "== Wiping and partitioning"
[ -n "$PARTS" ] && wipefs -a "$PARTS"
wipefs -a "$DEV"
parted -s "$DEV" mklabel gpt mkpart "$LABEL" ext4 1MiB 100%
udevadm settle
NEWPART="$(lsblk -lnpo NAME,TYPE "$DEV" | awk '$2=="part"{print $1}')"
mkfs.ext4 -F -q -L "$LABEL" -m 1 "$NEWPART"
udevadm settle
UUID="$(blkid -s UUID -o value "$NEWPART")"
[ -n "$UUID" ] || { echo "ABORT: no UUID on $NEWPART."; exit 1; }

echo "== Adding to /etc/fstab (backup kept)"
mkdir -p "$MNT"
cp -a /etc/fstab "/etc/fstab.bak-$(date +%Y%m%dT%H%M%S)"
awk -v m="$MNT" '!($2==m)' /etc/fstab > /etc/fstab.new && mv /etc/fstab.new /etc/fstab
echo "UUID=$UUID $MNT ext4 defaults,nofail 0 2" >> /etc/fstab

systemctl daemon-reload
findmnt --verify

echo "== Mounting"
mount "$MNT"
chown "$USER_NAME:$USER_NAME" "$MNT"

echo "== Write test"
sudo -u "$USER_NAME" sh -c "echo ok > '$MNT/.write-test' && cat '$MNT/.write-test' && rm '$MNT/.write-test'"

echo "== Result"
lsblk -o NAME,SIZE,TRAN,MODEL,SERIAL,FSTYPE,LABEL,UUID,MOUNTPOINTS "$DEV"
df -h "$MNT"
grep " $MNT " /etc/fstab
echo "Done."
