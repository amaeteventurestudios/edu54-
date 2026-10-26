#!/bin/bash
# Rebuild the offline library index (library.xml) from every finished .zim in the Kiwix folder, then restart Kiwix so
# Explore searches the new books. TED video collections are left out of the student library (docs/47, review log).
# Usage: tools/content/kiwix-library.sh   (UMANAH_ROOT defaults to the SSD)
set -euo pipefail
ROOT=${UMANAH_ROOT:-/srv/ai-node/storage/ssd/umanah-ai-lab}
K=$ROOT/knowledge/kiwix
cd "$K"
cp -a library.xml "library.xml.bak.$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
rm -f library.new.xml
mapfile -t zims < <(ls -1 *.zim | grep -v '^ted_')
docker --context ai-data run --rm --user 0:0 -v "$K:/data" --entrypoint kiwix-manage ghcr.io/kiwix/kiwix-serve:latest /data/library.new.xml add "${zims[@]/#//data/}"
# kiwix-manage writes absolute /data paths; kiwix-serve mounts the same folder at /data, so they stay valid
mv library.new.xml library.xml
docker --context ai-data restart umanah-kiwix-1 >/dev/null
echo "library.xml: ${#zims[@]} books"
