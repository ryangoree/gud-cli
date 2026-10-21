import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "node22.12",
  sourcemap: true,
  dts: true,
  minify: true,
  shims: true,
});
