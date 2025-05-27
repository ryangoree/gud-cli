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
  for (const extension of ['', ...fallbackExtensions]) {
    const fullPath = extension ? formatFileName(path, extension) : path;
    const isFile = statSync(fullPath, { throwIfNoEntry: false })?.isFile();
    if (isFile) return true;
  }
  return false;
}
