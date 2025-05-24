import { statSync } from 'node:fs';
import { removeFileExtension } from 'src/utils/filename';

/**
 * Determine if a path is a directory without throwing an error
 * @group Utils
 */
export function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Attempt to determine if a path is a file. If the path does not exist, check
 * if the path with any of the provided fallback extensions is a file.
 * @param path - The path to check.
 * @param fallbackExtensions - The fallback extensions to check if the path does
 * not exist.
 * @group Utils
 */
export function isFile(
  path: string,
  fallbackExtensions: string[] = ['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts'],
): boolean {
  try {
    return statSync(path).isFile();
  } catch (err) {
    // Forward any error that isn't a module not found error
    if (!isModuleNotFoundError(err)) throw err;

    // Check if the path with any of the fallback extensions is a file
    for (const ext of fallbackExtensions) {
      try {
        return statSync(`${removeFileExtension(path)}${ext}`).isFile();
      } catch (err) {
        // Forward any error that isn't a module not found error
        if (!isModuleNotFoundError(err)) throw err;
      }
    }

    // If none of the fallback extensions returned true, return false
    return false;
  }
}

/**
 * Attempt to determine if an error is a module not found error.
 * @group Utils
 * @remarks
 * This function is not guaranteed to be accurate in every environment.
 */
function isModuleNotFoundError(err: unknown): boolean {
  if (err && (err as any).code === 'ENOENT') return true;
  return /(Cannot find module|not a directory, stat)/.test(String(err));
}
