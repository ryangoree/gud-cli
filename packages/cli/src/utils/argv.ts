import { readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

/**
 * Get the binary name from argv
 * @group Utils
 */
export function getBin() {
  return process.argv[getBinIndex()] || "";
}

/**
 * Get the argv without the binary name
 * @group Utils
 */
export function hideBin(argv: string[]) {
  return argv.slice(getBinIndex() + 1);
}

/**
 * Get the name the CLI was invoked as, e.g., `mycli`.
 *
 * Package managers either symlink the bin entry, keeping its name in argv, or
 * install a shim that runs the bin's target file directly (pnpm, and npm or
 * yarn on Windows). To cover both, the name is looked up in the `bin` field of
 * the package that contains the executed script, falling back to the script's
 * file name.
 *
 * @param binPath - The path of the executed script. Defaults to
 * {@linkcode getBin}.
 * @group Utils
 */
export function getBinName(binPath = getBin()): string {
  const fileName = basename(binPath);

  let scriptPath: string;
  try {
    scriptPath = realpathSync(binPath);
  } catch {
    return fileName;
  }

  const pkg = findPackage(dirname(scriptPath));
  const bin = pkg?.json.bin;
  if (!pkg || !bin) return fileName;

  const isTarget = (target: unknown) =>
    typeof target === "string" && resolve(pkg.dir, target) === scriptPath;

  if (typeof bin === "string") {
    const { name } = pkg.json;
    return isTarget(bin) && name ? name.replace(/^@[^/]+\//, "") : fileName;
  }

  // Prefer the invoked name when it's one of the package's bins, since several
  // bins can point at the same file.
  if (isTarget(bin[fileName])) return fileName;
  const entry = Object.entries(bin).find(([, target]) => isTarget(target));
  return entry?.[0] ?? fileName;
}

interface PackageJson {
  name?: string;
  bin?: string | Record<string, string>;
}

/**
 * Find the nearest `package.json` with a `name`, skipping nameless ones like
 * the `{ "type": "module" }` files sometimes placed in build directories.
 */
function findPackage(fromDir: string): { dir: string; json: PackageJson } | undefined {
  let dir = fromDir;
  while (true) {
    try {
      const json: PackageJson = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      if (json.name) return { dir, json };
    } catch {}

    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

// all code below is copied from:
// https://github.com/yargs/yargs/blob/659dbbb4a415400293c5b5e75f7422da0e6ae083/lib/utils/process-argv.ts
// Full credit to yargs for this code

function getBinIndex() {
  // The binary name is the first command line argument for:
  // - bundled Electron apps: bin argv1 argv2 ... argvn
  if (isBundledElectronApp()) return 0;
  // or the second one (default) for:
  // - standard node apps: node bin.js argv1 argv2 ... argvn
  // - unbundled Electron apps: electron bin.js argv1 arg2 ... argvn
  return 1;
}

function isBundledElectronApp() {
  // process.defaultApp is either set by electron in an electron unbundled app,
  // or undefined
  //
  // see
  // https://github.com/electron/electron/blob/main/docs/api/process.md#processdefaultapp-readonly
  return isElectronApp() && !(process as ElectronProcess).defaultApp;
}

function isElectronApp() {
  // process.versions.electron is either set by electron, or undefined
  //
  // see
  // https://github.com/electron/electron/blob/main/docs/api/process.md#processversionselectron-readonly
  return !!(process as ElectronProcess).versions.electron;
}

interface ElectronProcess extends NodeJS.Process {
  defaultApp?: boolean;
  versions: NodeJS.ProcessVersions & {
    electron: string;
  };
}
