#!/usr/bin/env bash
# EDU54 Workbench: copy the 3D AI lessons (the "build" repo) into this box as plain static files, branded for EDU54.
# docs/edu54-build/README.md has the whole story. Usage, from anywhere:
#   tools/content/sync-edu54-build.sh [COMMIT] [DEST]
#     COMMIT  a commit of the build repo (default: the one in content/edu54-build/SOURCE.txt)
#     DEST    where the web server reads the lessons (default: $EDU54_BUILD_DIR, else content/edu54-build/site, git-ignored)
#   BUILD_SRC=/path/to/a/clone   copy from a local clone instead of fetching (it must contain COMMIT)
#   BUILD_REPO=<git url>         fetch from here (default: the GitHub repo; a private repo needs a key that can read it)
# Writes DEST (swapped in whole, so a half-copied tree is never served), DEST/SOURCE.txt, and in this repo
# content/edu54-build/catalog.json and SOURCE.txt. Needs git and node (or docker, which then runs node:22-alpine).
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
OUT="$ROOT/content/edu54-build"
COMMIT=${1:-$(sed -n 's/^commit: //p' "$OUT/SOURCE.txt" 2>/dev/null || true)}
DEST=${2:-${EDU54_BUILD_DIR:-$OUT/site}}
BUILD_REPO=${BUILD_REPO:-https://github.com/amaeteventurestudios/build.git}
[ -n "$COMMIT" ] || { echo "Give a build-repo commit (none recorded in $OUT/SOURCE.txt)." >&2; exit 2; }

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
SRC="$TMP/src"; mkdir -p "$SRC"
if [ -n "${BUILD_SRC:-}" ]; then
  git -C "$BUILD_SRC" archive "$COMMIT" | tar -x -C "$SRC"
else
  git -C "$TMP" init -q fetch && git -C "$TMP/fetch" fetch -q --depth 1 "$BUILD_REPO" "$COMMIT" \
    && git -C "$TMP/fetch" archive FETCH_HEAD | tar -x -C "$SRC"
fi
if [ -n "${BUILD_SRC:-}" ]; then FULL=$(git -C "$BUILD_SRC" rev-parse "$COMMIT^{commit}"); else FULL=$(git -C "$TMP/fetch" rev-parse FETCH_HEAD); fi

# EDU54's settings for the lessons (engine/site.local.js is read by engine/catalog.js): our name, our home and Progress
# pages, progress saved to the learner's LabOS account, fonts from this box, no links to the source's family sites.
cat > "$SRC/engine/site.local.js" <<'JS'
// Written by tools/content/sync-edu54-build.sh in the EDU54 repo. Do not edit by hand.
export default {
  name: 'EDU54 Workbench',
  url: '/ai-build/lessons',
  tag: 'Build AI from scratch. In 3D.',
  sub: 'Hands-on 3D lessons that open up how AI really works, from a single neuron to agents that use tools. Turn it, break it, fix it.',
  metaTitle: 'EDU54 Workbench · AI engineering in 3D, from scratch',
  metaDesc: 'Interactive 3D lessons on how AI works: neurons, transformers, LLMs and agents. Turn it, break it, fix it.',
  api: '/api/ai-build', host: true, hostName: 'EDU54', csrf: 'umanah_csrf',
  home: '/ai-build', progress: '/progress',
  fonts: 'local', family: false, robots: 'noindex', contact: '',
};
JS
find "$SRC" -name 'og.png' -delete                       # share images are for the public source site only

run_node() {   # run node in $SRC, from the host or a throwaway container
  if command -v node >/dev/null; then (cd "$SRC" && node "$@")
  else docker run --rm -u "$(id -u):$(id -g)" -v "$SRC:/w" -w /w node:22-alpine node "$@"; fi
}
run_node tools/pages.mjs >/dev/null
rm -rf "$SRC"/{certificate,terms,privacy}               # the host's own terms, privacy and certificates apply

# the catalog the platform reads (tracks, lessons, counts) and the page descriptions for search
cat > "$SRC/catalog-export.mjs" <<'JS'
import { TRACKS, LESSONS } from './engine/catalog.js';
const live = LESSONS.filter(l => l.live);
const lessons = [];
for (const l of live) {
  const L = (await import(`./${l.slug}/lesson.js`)).default;
  lessons.push({ slug: l.slug, n: l.n, title: l.title, track: l.track, description: L.description || '' });
}
const tracks = TRACKS.map(t => ({ n: t.n, slug: t.slug, title: t.title, group: t.group, size: t.size || 0, blurb: t.blurb, live: lessons.filter(l => l.track === t.n).length }));
console.log(JSON.stringify({ name: 'EDU54 Workbench', lessons_live: lessons.length, tracks, lessons }));
JS
run_node catalog-export.mjs > "$TMP/catalog.json"
rm "$SRC/catalog-export.mjs"

# never print the source site's own brand on our copy
if grep -rl --include=index.html -e 'Amaete' -e 'amaete.com' "$SRC" | grep -v '^$' | head -5 | grep -q .; then
  echo "Stopping: the source site's brand is still in the generated pages:" >&2
  grep -rl --include=index.html -e 'Amaete' -e 'amaete.com' "$SRC" | head -5 >&2; exit 1
fi

# leave out what only the source's public site or its own server uses
rm -rf "$SRC"/{server,tools,docs,sitemap.xml,robots.txt,llms.txt,.gitignore} "$SRC"/*.md
N=$(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1])).lessons_live))' "$TMP/catalog.json" 2>/dev/null \
  || python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["lessons_live"], end="")' "$TMP/catalog.json")
STAMP="source: $BUILD_REPO
branch: ${BUILD_BRANCH:-claude/project-thread-x0m7do}
commit: $FULL
synced: $(date -u +%Y-%m-%dT%H:%M:%SZ)
lessons: $N"
printf '%s\n' "$STAMP" > "$SRC/SOURCE.txt"

mkdir -p "$(dirname "$DEST")"
rm -rf "$DEST.new" && cp -a "$SRC" "$DEST.new"
chmod -R a+rX "$DEST.new"
[ -e "$DEST" ] && mv "$DEST" "$DEST.old"
mv "$DEST.new" "$DEST" && rm -rf "$DEST.old"
python3 -c 'import json,sys; d=json.load(open(sys.argv[1])); json.dump(d, open(sys.argv[2],"w"), indent=1, ensure_ascii=False); open(sys.argv[2],"a").write("\n")' "$TMP/catalog.json" "$OUT/catalog.json"
printf '%s\n' "$STAMP" > "$OUT/SOURCE.txt"
echo "EDU54 Workbench: $N lessons from $FULL in $DEST ($(du -sh "$DEST" | cut -f1))"
