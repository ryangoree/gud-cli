/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    silent: "passed-only",
    alias: {
      "#/": "/src/",
    },
    coverage: {
      include: ["src/**/*"],
    },
  },
});
