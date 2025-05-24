import { UsageError } from 'src/core/errors';
import { getHelp } from 'src/core/help';
import { removeOptionTokens } from 'src/core/options/remove-option-tokens';
import type { Plugin } from 'src/core/plugin';

/**
 * Options for the help plugin.
 * @group Plugins
 */
export interface HelpPluginOptions {
  /**
   * The names of the help flags.
   * @default ['h', 'help']
   */
  helpFlags?: [string, ...string[]];

  /**
   * The max line-length for the help text.
   * @default 80
   */
  maxWidth?: number;
}

/**
 * A cli plugin that prints help information on execution if the `-h` or
 * `--help` flags are present or when a usage error occurs and skips actual
 * execution.
 *
 * If there's a usage error, and the help flag is not present, the usage error
 * will also be printed and set as the command's result.
 * @group Plugins
 */
export function help({
  maxWidth = 80,
  helpFlags = ['h', 'help'],
}: HelpPluginOptions = {}): Plugin {
  // Ensure at least one help flag
  const [optionKey = 'help', ...alias] = helpFlags;
  helpFlags = [optionKey, ...alias];

  return {
    name: 'help',
    version: '0.0.1',
    description: `Prints help information on execution if a usage error is thrown or a help flag is present: ${helpFlags
      .map((flag) => `${flag.length === 1 ? '-' : '--'}${flag}`)
      .join(', ')}.`,

    init: ({ addOptions, client, hooks }) => {
      let usageError: UsageError | undefined = undefined;
      let isExecuting = false;
      let didSetResult = false;

      addOptions({
        [optionKey]: {
          alias,
          description: 'Prints help information.',
          type: 'boolean',
          default: false,
        },
      });

      // Allow the command to be executed with just the help flag
      hooks.on('beforeResolve', async ({ commandString, skip }) => {
        // Do nothing if the command string is empty
        if (!commandString.length) return;

        const commandStringWithoutHelp = removeOptionTokens(
          commandString,
          Object.fromEntries(helpFlags.map((flag) => [flag, true])),
        );

        // If the command string is empty after removing the help flag, skip
        // resolving the command which would have thrown a usage error.
        if (!commandStringWithoutHelp.length) skip();
      });

      // Save usage errors so we can print them when the command is executed
      hooks.on('error', async ({ error, ignore, context }) => {
        if (!(error instanceof UsageError)) return;

        usageError = error;

        // If the command is already executing, print the help text
        // immediately
        if (isExecuting) {
          let helpText = '';

          // Try to get the help text for the command and print any errors
          try {
            const help = await getHelp({ context, maxWidth });
            helpText = help.helpText;
          } catch (error) {
            client.error(error);
          }

          // Print the usage error and help text
          client.error(usageError);
          client.log(helpText);
        }

        // Ignore the error to so it doesn't get printed twice
        ignore();
      });

      // Avoid continuing to resolve the command if the help flag is present or
      // if a usage error occurred previously
      hooks.on('beforeResolveNext', async ({ context, skip, lastResolved }) => {
        // If there's already a usage error, skip resolving the next command
        if (usageError) {
          skip();
          return;
        }

        // check if the help flag was present in the previously resolved command
        // string. If it's in the remaining command string we can ignore it for
        // now because it will be handled later.
        const stringToCheck = context.commandString.slice(
          0,
          -lastResolved.remainingCommandString.length,
        );
        const { options } = await context.parseCommand(stringToCheck);

        if (options[optionKey]) {
          skip();
        }
      });

      // Print the help text and skip execution if the help flag is present or
      // if a usage error occurred previously
      hooks.on('beforeExecute', async ({ state, setResultAndSkip, skip }) => {
        isExecuting = true;

        const helpEnabled = await state.options[optionKey]?.();

        // If there's no error and the help flag isn't present, do nothing
        if (!usageError && !helpEnabled) return;

        const { helpText } = await getHelp({
          context: state.context,
          maxWidth,
        });

        // Only print the usage error if the help flag isn't present
        if (usageError && !helpEnabled) {
          client.error(usageError);
          setResultAndSkip(usageError);
          didSetResult = true;
        }

        client.log(helpText);

        // Skip execution if there was an error or the help flag was present
        skip();
      });

      // Reset the isExecuting flag and set the result if there was a usage
      // error and it wasn't already set in the beforeExecute hook. This can
      // happen if a usage error is thrown during execution.
      hooks.on('afterExecute', async ({ setResult }) => {
        isExecuting = false;

        if (usageError && !didSetResult) {
          setResult(usageError);
        }
      });

      return true;
    },
  };
}
