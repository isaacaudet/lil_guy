import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/next/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    external: ["react", "react-dom", "react/jsx-runtime", "next", "next/og", "next/server"],
  },
  {
    entry: { "lil-guy": "src/index-headless.ts" },
    format: ["iife"],
    globalName: "LilGuy",
    outDir: "dist",
  },
  {
    // The kit the lil guys Worker serves: /lilguys.js (a classic script, window.LilGuys) and /lilguys.mjs.
    entry: { lilguys: "src/kit-entry.ts" },
    format: ["iife"],
    globalName: "LilGuys",
    outDir: "dist",
    minify: true,
  },
  {
    entry: { lilguys: "src/kit-module.ts" },
    format: ["esm"],
    outDir: "dist/kit",
    minify: true,
  },
  {
    // Only the crowd and the stadium (src/stadium-entry.ts): /lilguys-stadium.js and /lilguys-stadium.mjs.
    entry: { "lilguys-stadium": "src/stadium-entry.ts" },
    format: ["iife"],
    globalName: "LilGuyStadium",
    outDir: "dist",
    minify: true,
  },
  {
    entry: { "lilguys-stadium": "src/stadium-entry.ts" },
    format: ["esm"],
    outDir: "dist/kit",
    minify: true,
  },
  {
    // The 3D stadium (src/stadium3d-entry.ts): /lilguys-stadium3d.mjs, with three.js left to the page.
    entry: { "lilguys-stadium3d": "src/stadium3d-entry.ts" },
    format: ["esm"],
    outDir: "dist",
    minify: true,
    external: ["three"],
    dts: true,
    outExtensions: () => ({ js: ".mjs", dts: ".mts" }),
  },
  {
    entry: { "lil-guy-element": "src/element-entry.ts" },
    format: ["iife"],
    globalName: "LilGuyElement",
    outDir: "dist",
    minify: true,
  },
]);
