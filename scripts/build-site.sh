#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p site/showcase site/fonts
cp docs/lil-guy.js site/lil-guy.js
cp docs/lil-guy-element.js site/lil-guy-element.js
cp docs/lilguys.js site/lilguys.js
cp docs/lilguys.mjs site/lilguys.mjs
cp docs/lilguys-stadium.js site/lilguys-stadium.js
cp docs/lilguys-stadium.mjs site/lilguys-stadium.mjs
cp docs/fonts/*.ttf docs/fonts/*.txt site/fonts/
mkdir -p site/club-icons
cp docs/club-icons/*.webp site/club-icons/
# Only the two pages games link to; the older mock-ups stay in docs/showcase, unpublished.
rm -f site/showcase/*.html
cp docs/showcase/formats.html docs/showcase/emotes.html site/showcase/
sed -e 's|../lil-guy.js|/lil-guy.js|g' -e 's|../fonts/|/fonts/|g' -e 's|../club-icons/|/club-icons/|g' -e 's|href="formats.html"|href="/showcase/formats.html"|g' -e 's|href="emotes.html|href="/showcase/emotes.html|g' -e "s|'emotes.html?name=|'/showcase/emotes.html?name=|g" docs/showcase/promo.html > site/index.html
