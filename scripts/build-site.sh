#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p site/showcase
cp docs/lil-guy.js site/lil-guy.js
cp docs/showcase/*.html site/showcase/
sed 's|../lil-guy.js|/lil-guy.js|g' docs/showcase/promo.html > site/index.html
