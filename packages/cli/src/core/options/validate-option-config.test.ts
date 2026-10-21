import { describe, expect, it } from "vitest";
import { OptionsConfigError, validateOptionsConfig } from "#/core/options/validate-option-config";

describe("options", () => {
  describe("validateOptionsConfig", () => {
    it("throws OptionsConfigError on invalid options config", async () => {
      expect(() => {
        validateOptionsConfig({
          a: {
            type: "string",
            required: true,
            conflicts: ["b"], // <-- can't be required and have conflicts
          },
          b: {
            type: "string",
          },
        });
      }).toThrowError(OptionsConfigError);

      expect(() => {
        validateOptionsConfig({
          a: {
            type: "string",
            required: true,
            requires: ["b"], // <-- can't be required and have requires
          },
          b: {
            type: "string",
          },
        });
      }).toThrowError(OptionsConfigError);
    });
  });
});
