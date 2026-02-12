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
]);
