/**
 * Builds the showcase pages in docs/showcase from their sources in
 * docs/showcase/src. Each source is a page body that uses the library as the
 * global `LG`; here it is wrapped in a full document that loads the site's own
 * browser build (docs/lil-guy.js, which the Pages workflow rebuilds from main),
 * so the pages always show the art the library draws today.
 *
 *   bun run build && cp dist/lil-guy.js docs/lil-guy.js && bun scripts/build-showcase.ts
 */
import { readdirSync } from 'fs';

const SRC = new URL('../docs/showcase/src/', import.meta.url);
const OUT = new URL('../docs/showcase/', import.meta.url);

const PAGES: Record<string, string> = {
  promo: 'The pitch: get dealt a guy, open capsules, keep a collection and share your best copy.',
  guide: 'The whole system on one page.',
  locker: 'A player\'s guy, locker, moves, extras and the gacha shop, all working.',
  shop: 'A rotating shop: the daily shelf, a weekly spotlight, capsules and bundles.',
  boards: 'From a name to a dressed guy, and how boards and games would show it.',
  economy: 'Stamps, capsule prices and drop odds simulated over 90 days of play, with targets.',
  review: 'Every part and item on four test guys, with what to keep, cut and add.',
  catalog: 'Everything a guy can be dealt or pull, with its odds, what is thin, and a tier above Grail.',
  voxels: 'A prototype: the same pixels as 3D figures, each finish a real material.',
  formats: 'Every way a game can show a player\'s lil guy, live from the Worker, with the address and HTML to copy.',
  emotes: 'Any lil guy as Twitch and Discord emotes, still and moving, to download.',
};

// The shop and the promo draw the gacha machines with the locker's code, so it is shared from there.
const locker = await Bun.file(new URL('locker.html', SRC)).text();
const machine = locker.slice(
  locker.indexOf('  /* ------------------------------------------------ gachapon'),
  locker.indexOf("  /** The reveal's opening"),
);
// The trading cards too: the shader setup and the per-pixel card faces, without the locker's own loop.
const cards = locker.slice(locker.indexOf('  const compile = (gl, vs, fs) => {'), locker.indexOf('  /* ------------------------------------------------ the paint swirl'))
  + locker.slice(locker.indexOf('  /* ------------------------------------------------ cards, drawn per pixel */'), locker.indexOf('  function move(s, t) {'));

const LOAD = '<script src="../lil-guy.js"></script>\n<script>window.LG = window.LilGuy;</script>';

const SITE_LINE = 'Get your own guy. A free capsule a day, with things to wear from every DLE Club game.';

for (const file of readdirSync(SRC).filter(f => f.endsWith('.html'))) {
  const body = (await Bun.file(new URL(file, SRC)).text())
    .replace('<script>/*LIB*/</script>', () => LOAD)
    .replace('/*MACHINE*/', () => machine)
    .replace('/*CARDS*/', () => cards);
  // The pitch is the site's front page (scripts/build-site.sh), so its link preview is the site's: docs/og.png
  // (scripts/og-site.ts), five guys in their best.
  const preview = file !== 'promo.html' ? '' : `
<meta name="description" content="${SITE_LINE}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lil Guys">
<meta property="og:title" content="Lil Guys">
<meta property="og:description" content="${SITE_LINE}">
<meta property="og:url" content="https://lilguys.dleclub.com/">
<meta property="og:image" content="https://lilguys.dleclub.com/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Five lil guys in their best hats and auras">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://lilguys.dleclub.com/og.png">`;
  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${preview}
<style>:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); } body { margin: 0; } img { max-width: 100%; }</style>
</head>
<body>
${body}
</body>
</html>
`;
  await Bun.write(new URL(file, OUT), page);
}

const links = Object.entries(PAGES).map(([name, what]) => `<li><a href="${name}.html">${name[0].toUpperCase() + name.slice(1)}</a> <span>${what}</span></li>`).join('\n');
await Bun.write(new URL('index.html', OUT), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>lil_guy showcase</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; }
  li { margin: 10px 0; } span { color: GrayText; display: block; font-size: 14px; }
</style>
</head>
<body>
<h1>lil_guy showcase</h1>
<p>Working mock-ups drawn by the library itself. Stamps, drops and the shop are pretend: nothing here talks to a server.</p>
<ul>
${links}
</ul>
</body>
</html>
`);
console.log(`wrote ${Object.keys(PAGES).length} pages and an index to docs/showcase`);
