#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p site/showcase site/fonts
cp docs/lil-guy.js site/lil-guy.js
cp docs/lil-guy-element.js site/lil-guy-element.js
cp docs/lilguys.js site/lilguys.js
cp docs/lilguys.mjs site/lilguys.mjs
cp docs/fonts/* site/fonts/
cp docs/showcase/*.html site/showcase/
sed -e 's|../lil-guy.js|/lil-guy.js|g' -e 's|../fonts/|/fonts/|g' -e 's|href="formats.html"|href="/showcase/formats.html"|g' docs/showcase/promo.html > site/index.html
