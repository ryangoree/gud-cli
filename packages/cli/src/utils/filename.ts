/**
 * Removes the file extension from a string and treats multiple dots in a row as
 * part of the file name.
 *
 * @example
 * removeFileExtension('foo.txt') // 'foo'
 *
 * @group Utils
 */
export function removeFileExtension(path: string): string {
  // Slightly more performant than regex on warm paths.
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0 || path[lastDot - 1] === '.') {
    return path;
  }
  return path.slice(0, lastDot);
}

/**
 * Formats a file name to ensure it ends with `.js`.
 * @group Resolve
 */
export function formatFileName(fileName: string, extension = '.js'): string {
  return `${removeFileExtension(fileName)}${extension}`;
}

// https://regex101.com/r/H6PKtJ/5
const PARAM_FILE_NAME_REGEX = /^\[(\.{3})?([a-zA-Z_][\w-]*)\](\.\w+)?$/;

/**
 * Parses a file name to determine if it's a parameterized command file.
 *
 * Parameterized command files are named using the following format:
 *   - `[param]` - A single parameter with no file extension
 *   - `[param].ts` - A single parameter
 *   - `[...param].ts` - A spread operator parameter
 *
 * @param fileName - The file name to parse.
 *
 * @returns Object containing the spread operator, parameter name, and file
 * extension, if any.
 *
 * @example
 * // A single parameter with no file extension
 * parseFileName('[foo]');
 * // => {
 * //   spreadOperator: undefined,
 * //   paramName: 'foo',
 * //   extension: undefined,
 * // }
 *
 * // A single parameter
 * parseFileName('[foo].ts');
 * // => {
 * //   spreadOperator: undefined,
 * //   paramName: 'foo',
 * //   extension: '.ts',
 * // }
 *
 * // A spread operator parameter
 * parseFileName('[...foo].ts');
 * // => {
 * //   spreadOperator: '...',
 * //   paramName: 'foo',
 * //   extension: '.ts',
 * // }
 *
 * // Not a parameterized command file
 * parseFileName('foo.ts');
 * // => {
 * //   spreadOperator: undefined,
 * //   paramName: undefined,
 * //   extension: undefined,
 * // }
 *
 * @group Utils
 */
export function parseFileName(fileName: string): {
  spreadOperator: string | undefined;
  paramName: string | undefined;
  extension: string | undefined;
} {
  const [_, spreadOperator, paramName, extension] =
    fileName.match(PARAM_FILE_NAME_REGEX) || [];

  return {
    spreadOperator,
    paramName,
    extension,
  };
}
