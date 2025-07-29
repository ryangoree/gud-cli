import { statSync } from 'node:fs';
import { formatFileName } from 'src/utils/filename';

/**
 * Determine if a path is a directory.
 * @group Utils
 */
export function isDirectory(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false;
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
  return (
    statSync(path, { throwIfNoEntry: false })?.isFile() ??
    fallbackExtensions.some((ext) => {
      const fullPath = formatFileName(path, ext);
      return statSync(fullPath, { throwIfNoEntry: false })?.isFile() ?? false;
    })
  );
}
