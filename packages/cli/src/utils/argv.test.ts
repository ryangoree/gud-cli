import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getBinName } from "#/utils/argv";

describe("getBinName", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "gud-cli-bin-name-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  /** Write files relative to the temp root. */
  function write(files: Record<string, unknown>) {
    for (const [path, content] of Object.entries(files)) {
      const fullPath = join(root, path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, typeof content === "string" ? content : JSON.stringify(content));
    }
  }

  it("uses the bin name when the script is run through a symlink", () => {
    write({
      "pkg/package.json": { name: "my-package", bin: { mycli: "dist/cli.js" } },
      "pkg/dist/cli.js": "",
    });
    mkdirSync(join(root, "bin"));
    symlinkSync(join(root, "pkg/dist/cli.js"), join(root, "bin/mycli"));

    expect(getBinName(join(root, "bin/mycli"))).toBe("mycli");
  });

  it("finds the bin name when a shim runs the target file directly", () => {
    write({
      "pkg/package.json": {
        name: "my-package",
        bin: { other: "dist/other.js", mycli: "./dist/cli.js" },
      },
      "pkg/dist/cli.js": "",
    });

    expect(getBinName(join(root, "pkg/dist/cli.js"))).toBe("mycli");
  });

  it("uses the unscoped package name for a string bin", () => {
    write({
      "pkg/package.json": { name: "@scope/mycli", bin: "dist/cli.js" },
      "pkg/dist/cli.js": "",
    });

    expect(getBinName(join(root, "pkg/dist/cli.js"))).toBe("mycli");
  });

  it("skips nameless package.json files", () => {
    write({
      "pkg/package.json": { name: "my-package", bin: { mycli: "dist/cli.js" } },
      "pkg/dist/package.json": { type: "module" },
      "pkg/dist/cli.js": "",
    });

    expect(getBinName(join(root, "pkg/dist/cli.js"))).toBe("mycli");
  });

  it("falls back to the file name when the script isn't a bin", () => {
    write({
      "pkg/package.json": { name: "my-package", bin: { mycli: "dist/cli.js" } },
      "pkg/src/cli.ts": "",
    });

    expect(getBinName(join(root, "pkg/src/cli.ts"))).toBe("cli.ts");
  });

  it("falls back to the file name when the script doesn't exist", () => {
    expect(getBinName(join(root, "missing/mycli"))).toBe("mycli");
  });
});
