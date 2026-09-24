import { defineConfig } from "tsdown";

// Ballpark vendors the headless build as a single ESM file + .d.ts.
// v2 is a separate build rather than a second entry: two entries in one build
// share a chunk, and vendoring stops being "copy two files".
const headless = (name: string, entry: string) => ({
  entry: { [name]: entry },
  format: ["esm" as const],
  dts: true,
  outDir: "dist-headless",
  treeshake: true,
  clean: false,
});

export default defineConfig([
  headless("headless", "src/index-headless.ts"),
  headless("headless-v2", "src/v2/index.ts"),
]);
