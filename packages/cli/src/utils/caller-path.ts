/**
 * Attempts to get the path to the file that contains the code that called the
 * code that called this function. I know, it's confusing, but it's cool.
 *
 * @param depth - The number of stack frames to go back. Defaults to 0, which
 * means the immediate caller. Use 1 to get the caller of the caller, and so on.
 *
 * @example
 *
 * #### Caller:
 * ```ts
 * // /path/to/file.ts
 * import { foo } from './path/to/foo.ts';
 *
 * foo();
 * ```
 *
 * #### Callee:
 *
 * ```ts
 * // /path/to/foo.ts
 * import { getCallerPath } from 'src/utils/get-caller';
 *
 * export function foo() {
 *  console.log(getCallerPath()); // /path/to/file.ts
 * }
 * ```
 *
 * @group Utils
 */
export function getCallerPath(depth = 0): string | undefined {
  /**
   * 0 = error name and message
   * 1 = path to this file
   * 2 = path to the file that called this function. The one that wants to know
   *     it's caller.
   * 3 = path to the file that called the function that called this function
   *     (this is the file that the caller of this function wants)
   */
  const callerIndex = 3 + depth;
  const target = {} as unknown as Error;

  // Attempt to overwrite the `prepareStackTrace` function. This will work in
  // v8 environments, but will be ignored otherwise.
  // https://v8.dev/docs/stack-trace-api#customizing-stack-traces
  const originalPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  Error.captureStackTrace(target);
  Error.prepareStackTrace = originalPrepareStackTrace;

  if (!target.stack) return undefined;

  // If the stack is an array, we're in a v8 environment and can use the
  // `getFileName` method on the call site.
  if (Array.isArray(target.stack)) {
    const caller = target.stack[callerIndex] as NodeJS.CallSite;
    return caller?.getFileName() ?? undefined;
  }

  // If the stack is a string, we're in a non-v8 environment and need to parse
  // the stack string to get the file path.
  // https://regex101.com/r/yyMI5W/1
  const callerLine = target.stack.split('\n')[callerIndex]?.trim();
  const callerFile = callerLine?.match(/(file|\/)[^\s]+?(?=(:\d|\)))/)?.[0];

  if (!callerFile) return undefined;

  return new URL(callerFile, import.meta.url).pathname;
}
