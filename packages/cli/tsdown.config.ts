import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/exports/index.ts",
    testing: "src/exports/testing.ts",
  },
  format: ["esm", "cjs"],
  target: "node22.12",
  sourcemap: true,
  dts: true,
  minify: true,
  shims: true,
  outputOptions: {
    // Error handling relies on `constructor.name` for custom error classes.
    keepNames: true,
  },
});
