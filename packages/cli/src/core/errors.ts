export interface CliErrorOptions extends ErrorOptions {
  /**
   * A custom prefix to use in place of {@linkcode CliError.prefix}.
   */
  prefix?: string;

  /**
   * A custom name to use in place of {@linkcode CliError.name}.
   */
  name?: string;
}

/**
 * An error thrown by the CLI engine.
 *
 * This error is designed to ensure clean stack trace formatting even when
 * minified and can be extended to create other error types with the same
 * behavior.
 *
 * @example
 * ```ts
 * class FooCliError extends CliError {
 *   constructor(message: string, options?: ErrorOptions) {
 *     super(message, {
 *       prefix: "👺 ",
 *       name: "Foo CLI Error",
 *       ...options,
 *     });
 *   }
 * }
 *
 * throw new FooCliError("Something went wrong");
 * // 👺 Foo CLI Error: Something went wrong
 * //     at ...
 * ```
 *
 * @group Errors
 */
export class CliError extends Error {
  static prefix = '✖ ';
  static name = 'CLI Error' as const;

  constructor(error: any, options?: CliErrorOptions) {
    // Coerce the error to a string, or throw the original error if unable.
    let message: string;
    try {
      message = error?.message ?? String(error);
    } catch {
      throw error;
    }

    super(message);
    this.name = options?.name ?? CliError.name;

    // Minification can mangle the stack traces of custom errors by obfuscating
    // the class name and including large chunks of minified code in the output.
    // To remedy this, the original stack trace is copied from either the given
    // error or a new error instance; and the stack getter is overridden to
    // ensure it's nicely formatted.

    const isError = error instanceof Error;
    const cause = options?.cause ?? error?.cause;

    let stackTarget: Error = error;
    if (!isError) {
      stackTarget = new Error();
      Error.captureStackTrace?.(stackTarget, new.target);
    }
    const targetStack = stackTarget.stack;

    let customName: string | undefined;
    if (error?.name && error.name !== 'Error') {
      customName = error.name;
    } else if (isError && error.constructor.name !== 'Error') {
      customName = error.constructor.name;
    }

    // Doing this in the constructor prevents the need to add custom properties
    // to the prototype, which would be displayed in the stack trace. The getter
    // ensures the name and message are up-to-date when accessed (e.g., after
    // subclassing and changing the name).
    Object.defineProperty(this, 'stack', {
      get(): string {
        let stack = `${options?.prefix ?? CliError.prefix}${this.name}`;

        if (customName) {
          stack += ` [${customName}]`;
        }

        if (this.message) {
          stack += `: ${this.message}`.replaceAll('\n', '\n  ');
        }

        if (targetStack) {
          let stackLines = targetStack.split('\n').slice(1);
          if (this.message) {
            stackLines = stackLines.filter(
              (line) => !this.message.includes(line.trim()),
            );
          }
          if (stackLines.length) {
            stack += `\n${stackLines.join('\n')}`;
          }
        }

        if (cause) {
          stack += `\nCaused by: ${cause.stack || cause}`.replaceAll(
            '\n',
            '\n  ',
          );
        }

        return stack.trim();
      },
    });
  }
}

/**
 * An error indicating the user has done something wrong.
 * @group Errors
 */
export class UsageError extends CliError {
  constructor(error: unknown, options?: CliErrorOptions) {
    super(error, {
      name: 'UsageError',
      ...options,
    });
  }
}

/**
 * An error indicating a command is not found.
 * @group Errors
 */
export class NotFoundError extends UsageError {
  constructor(token: string | number, path: string, options?: CliErrorOptions) {
    super(
      ['development', 'test'].includes(process.env.NODE_ENV || '')
        ? // In development, show the full path to the command
          `Unable to find command "${token}" in "${path.replace(/\/?$/, '/')}"`
        : // In production, just show the command name
          `Command "${token}" not found.`,
      {
        name: 'NotFoundError',
        ...options,
      },
    );
  }
}

/**
 * An error thrown when attempting to resolve an empty command string.
 * @group Errors
 */
export class CommandRequiredError extends UsageError {
  constructor(options?: CliErrorOptions) {
    super('Command required.', {
      name: 'CommandRequiredError',
      ...options,
    });
  }
}
