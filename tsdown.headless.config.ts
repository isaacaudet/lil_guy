import { defineConfig } from "tsdown";

// Ballpark vendors the headless build as a single ESM file + .d.ts.
export default defineConfig({
  entry: { headless: "src/index-headless.ts" },
  format: ["esm"],
  dts: true,
  outDir: "dist-headless",
  treeshake: true,
});
