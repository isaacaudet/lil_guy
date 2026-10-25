# Automatic Lil Guys site releases

Connect `isaacaudet/lil_guy` to the existing `lilguys` Worker, using the dedicated site branch `claude/compassionate-mayer-oigii3`, root `/`, Node24 and Bun1.3.6. Disable branch/PR builds. Reuse the existing Workers Builds credential without widening its permissions.

Build: `bun test worker && npm run test:cloudflare-auto && npm run build:cloudflare-auto`
Deploy: `npm run deploy:cloudflare-auto`

The build compiles the current library and showcase, assembles the existing site and writes public source/hash metadata. Deployment verifies the exact CI checkout and artifact; checks that the remote release branch has not advanced; uploads a commit-tagged version with `--keep-vars`; waits for that exact version to become visible; rechecks source/artifact; activates the uploaded ID at100%. A failure leaves the current active version in place.

The existing `worker/index.js`, D1 binding/database, migrations and auth/claims/collections behavior remain unchanged. The pipeline never runs D1 migrations, creates credentials or changes routes. Site-only setup is not permission to mutate player records. Verify a real Git-triggered build and the public version marker before calling setup complete.
