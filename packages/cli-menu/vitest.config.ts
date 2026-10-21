/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    silent: "passed-only",
    alias: {
      "src/": "/src/",
    },
    coverage: {
      include: ["src/**/*"],
    },
  },
});
