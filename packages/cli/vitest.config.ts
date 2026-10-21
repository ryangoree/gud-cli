/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    alias: {
      "src/": "/src/",
    },
    coverage: {
      include: ["src/**/*"],
    },
  },
});
