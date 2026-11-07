#!/usr/bin/env bash
# The public EDU54 Workbench page at edu54.com/workbench/: the 3D AI lessons' own home page (the cube) and every lesson, open to
# anyone, branded EDU54 Workbench. Progress stays in the visitor's browser (no accounts). The copy inside the K-12 and
# University apps (/ai-build, progress saved to the learner's account) is made by sync-edu54-build.sh instead.
# Usage: BUILD_SRC=/path/to/a/clone/of/amaeteventurestudios/build tools/content/build-edu54-workbench-page.sh [COMMIT] [DEST]
#   COMMIT  default: the one in content/edu54-build/SOURCE.txt     DEST  default: apps/site/workbench (git-ignored)
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
COMMIT=${1:-$(sed -n 's/^commit: //p' "$ROOT/content/edu54-build/SOURCE.txt")}
DEST=${2:-$ROOT/apps/site/workbench}
[ -n "${BUILD_SRC:-}" ] || { echo "Set BUILD_SRC to a clone of the build repo." >&2; exit 2; }
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
SRC="$TMP/src"; mkdir -p "$SRC"
git -C "$BUILD_SRC" archive "$COMMIT" | tar -x -C "$SRC"
cat > "$SRC/engine/site.local.js" <<'JS'
// Written by tools/content/build-edu54-workbench-page.sh in the EDU54 repo. Do not edit by hand.
export default {
  name: 'EDU54 Workbench',
  url: 'https://edu54.com/workbench',
  metaTitle: 'EDU54 Workbench · Build AI from scratch. In 3D.',
  fonts: 'local', family: false, contact: '',
};
JS
find "$SRC" -name 'og.png' -delete
# EDU54 changes to the cube page: on desktop the circle keeps clear of the headline and of the cube
node "$ROOT/tools/content/edu54-workbench-home.mjs" "$SRC/kit/home.js"
# the flat placeholder drawing only shows if the 3D cube has not started after 2.5 seconds (no flash on refresh)
cat >> "$SRC/kit/home.css" <<'CSS'
.stage .fallback { opacity: 0; animation: edu54-fallback .4s 2.5s forwards; }
@keyframes edu54-fallback { to { opacity: 1; } }
CSS
(cd "$SRC" && node tools/pages.mjs >/dev/null)
# edu54.com has its own terms and privacy pages: point there instead of the source site's
rm -rf "$SRC"/{terms,privacy}
find "$SRC" -name index.html -print0 | xargs -0 sed -i -E 's#href="(\.\./|\./)?terms/"#href="/terms/"#g; s#href="(\.\./|\./)?privacy/"#href="/privacy/"#g'
if grep -rl --include=index.html -e 'Amaete' -e 'amaete.com' "$SRC" | head -1 | grep -q .; then
  echo "Stopping: the source site's brand is still in a generated page." >&2; exit 1; fi
rm -rf "$SRC"/{server,tools,docs,.gitignore,robots.txt} "$SRC"/*.md
mkdir -p "$(dirname "$DEST")"; rm -rf "$DEST.new"; cp -a "$SRC" "$DEST.new"; chmod -R a+rX "$DEST.new"
[ -e "$DEST" ] && mv "$DEST" "$DEST.old"; mv "$DEST.new" "$DEST"; rm -rf "$DEST.old"
echo "EDU54 Workbench page: $(ls -d "$DEST"/*/lesson.js | wc -l) lessons in $DEST ($(du -sh "$DEST" | cut -f1))"
