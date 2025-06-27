import { UsageError } from 'src/core/errors';
import { getHelp } from 'src/core/help';
import { removeOptionTokens } from 'src/core/options/remove-option-tokens';
import { type Plugin, plugin } from 'src/core/plugin';

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

export interface HelpPluginMeta {
  /**
   * The help flags that trigger the help text.
   */
  readonly helpFlags: readonly string[];
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
}: HelpPluginOptions = {}): Plugin<HelpPluginMeta> {
  // Ensure at least one help flag
  const [optionKey = 'help', ...alias] = helpFlags;
  helpFlags = [optionKey, ...alias];

  return plugin<HelpPluginMeta>({
    name: 'help',
    description:
      'Prints help information if a usage error is thrown or a help flag is present.',
    meta: {
      get helpFlags() {
        return helpFlags;
      },
    },
    init: ({ setOptions: addOptions, hooks }) => {
      let usageError: UsageError | undefined = undefined;

      addOptions({
        [optionKey]: {
          alias,
          description: 'Prints help information.',
          type: 'boolean',
          default: false,
        },
      });

      // Save usage errors so we can print them when the command is executed
      hooks.on('beforeError', async ({ error, ignore }) => {
        if (error instanceof UsageError) {
          usageError = error;
          ignore();
        }
      });

      // Allow the command to be executed with just the help flag
      hooks.on(
        'beforeResolve',
        async ({ context, remainingCommandString, skip }) => {
          // If there's already a usage error, skip resolving the next command
          if (usageError) {
            skip();
            return;
          }

          if (!remainingCommandString.length) return;

          const commandStringWithoutHelp = removeOptionTokens(
            remainingCommandString,
            Object.fromEntries(helpFlags.map((flag) => [flag, true])),
          );

          // If the command string is empty after removing the help flag, skip
          // resolving the command which would cause a usage error.
          if (!commandStringWithoutHelp.length) {
            skip();
            return;
          }

          // check if the help flag was present in the previously resolved
          // command string. If it's in the remaining command string we can
          // ignore it for now to build up context for the help text.
          const resolvedCommandString = context.commandString.slice(
            0,
            remainingCommandString.length,
          );
          const { options } = await context.parseCommand(resolvedCommandString);

          if (options[optionKey]) skip();
        },
      );

      hooks.on('beforeExecute', async ({ state, skip }) => {
        const helpFlag = await state.options[optionKey]?.();
        if (usageError || helpFlag) skip();
      });

      hooks.on('afterExecute', async ({ state }) => {
        const { client, context, options } = state;
        const helpFlag = await options[optionKey]?.();
        if (usageError) {
          if (!helpFlag) {
            client.error(usageError);
            state.setData(usageError);
          }
          const helpText = await getHelp({ context, maxWidth })
            .then(({ helpText }) => helpText)
            .catch((error) => {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              return `Error generating help text: ${errorMessage}`;
            });

          client.log(helpText);
        }
      });
    },
  });
}
