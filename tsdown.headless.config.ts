import { defineConfig } from "tsdown";

export default defineConfig([
  // Ballpark vendors the headless build as a single ESM file + .d.ts.
  {
    entry: { headless: "src/index-headless.ts" },
    format: ["esm"],
    dts: true,
    outDir: "dist-headless",
    treeshake: true,
  },
  // Only parts, palettes, the deal and toSvgString (src/faces-entry.ts), minified, for a page that draws plain faces.
  {
    entry: { faces: "src/faces-entry.ts" },
    format: ["esm"],
    dts: true,
    outDir: "dist-headless",
    treeshake: true,
    minify: true,
  },
]);
