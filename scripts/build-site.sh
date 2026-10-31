#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# A page calling the library (as LG) for something docs/lil-guy.js hasn't got stops at load: the
# library has to be built first (bun run showcase).
missing=$(grep -oh 'LG\.[A-Za-z_]*' docs/showcase/promo.html docs/showcase/formats.html docs/showcase/emotes.html | sort -u | sed 's/^LG\.//' | while read -r name; do grep -q "exports\.$name = " docs/lil-guy.js || echo "$name"; done)
if [ -n "$missing" ]; then echo "docs/lil-guy.js has no" $missing"; run bun run showcase first" >&2; exit 1; fi
mkdir -p site/showcase site/fonts
cp docs/lil-guy.js site/lil-guy.js
cp docs/lil-guy-element.js site/lil-guy-element.js
cp docs/lilguys.js site/lilguys.js
cp docs/lilguys.mjs site/lilguys.mjs
cp docs/lilguys-stadium.js site/lilguys-stadium.js
cp docs/lilguys-stadium.mjs site/lilguys-stadium.mjs
cp docs/lilguys-stadium3d.mjs site/lilguys-stadium3d.mjs
cp docs/fonts/*.ttf docs/fonts/*.txt site/fonts/
mkdir -p site/club-icons
cp docs/club-icons/*.webp site/club-icons/
# The capsule pack (scripts/build-capsules.ts): plain PNGs and the manifest, which the Worker also serves.
mkdir -p site/capsules
rm -f site/capsules/*
cp docs/capsules/* site/capsules/
# Only the two pages games link to; the older mock-ups stay in docs/showcase, unpublished.
rm -f site/showcase/*.html
cp docs/showcase/formats.html docs/showcase/emotes.html site/showcase/
sed -e 's|../lil-guy.js|/lil-guy.js|g' -e 's|../fonts/|/fonts/|g' -e 's|../club-icons/|/club-icons/|g' -e 's|href="formats.html"|href="/showcase/formats.html"|g' -e 's|href="emotes.html|href="/showcase/emotes.html|g' -e "s|'emotes.html?name=|'/showcase/emotes.html?name=|g" docs/showcase/promo.html > site/index.html
