/**
 * Get the binary name from argv
 * @group Utils
 */
export function getBin() {
  return process.argv[getBinIndex()] || '';
}

/**
 * Get the argv without the binary name
 * @group Utils
 */
export function hideBin(argv: string[]) {
  return argv.slice(getBinIndex() + 1);
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
