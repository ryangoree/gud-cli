import { readdirSync } from 'node:fs';
import initCliui from 'cliui';
import type { Context } from 'src/core/context';
import type { OptionsConfig } from 'src/core/options/options';
import type { ResolvedCommand } from 'src/core/resolve';
import { getBin } from 'src/utils/argv';
import { type Converted, convert } from 'src/utils/convert';
import { parseFileName, removeFileExtension } from 'src/utils/filename';
import { isDirectory } from 'src/utils/fs';

// The base indent for all rows
const BASE_INDENT = 2;

/**
 * The rows that make up the help information for a command. In order of
 * appearance, the rows are:
 * - description
 * - usage
 * - optionsTitle
 * - options
 * - subcommandsTitle
 * - subcommands
 *
 * @group Help
 */
export interface HelpRows {
  /**
   * The command module's description.
   */
  description?: Column;

  /**
   * A dynamic usage string based on the resolved commands and their parameters.
   */
  usage: Column;

  /**
   * The title for the options section.
   */
  optionsTitle?: Column;

  /**
   * A 2 column list of the available options and their descriptions.
   */
  options?: [Column, Column][];

  /**
   * The title for the subcommands section.
   */
  subcommandsTitle?: Column;

  /**
   * A 2 column list of the available subcommands and their descriptions.
   */
  subcommands?: [Column, Column][];
}

/**
 * The help information for a given command.
 * @group Help
 */
export type Help = {
  /**
   * The help information for the provided command.
   */
  helpText: string;

  /**
   * The error message, if any, that occurred while trying to resolve the
   * command.
   */
  error?: Error;

  /**
   * The rows that make up the help information for a command, in order of
   * appearance.
   */
} & Converted<HelpRows, Column, string>;

export interface GetHelpOptions {
  /**
   * The context object for the command to get help for.
   */
  context: Context;

  /**
   * The max line-length for the help text.
   * @default 80
   */
  maxWidth?: number;
}

/**
 * Generates the help information for a given command based on the provided
 * tokens.
 *
 * This function constructs a dynamic usage string based on the resolved
 * commands and their parameters, then formats this information along with the
 * description, available options, and subcommands. The output is structured
 * using `cliui` for better formatting in the terminal.
 *
 * @param context - The context object for the command.
 * @group Help
 */
export async function getHelp({
  context,
  maxWidth = 80,
}: GetHelpOptions): Promise<Help> {
  const cliui = initCliui({
    width: maxWidth,
    wrap: true,
  });

  const rows: HelpRows = {
    usage: {
      // Start the usage string with the binary name
      text: `Usage: ${getBin().replace(process.cwd(), '')}`,
      padding: [1, 0, 0, 0],
    },
  };

  const allOptions: OptionsConfig = { ...context.options };

  // Build up the usage string based on the command queue
  for (const resolved of context.commandQueue) {
    const { paramName, spreadOperator } = parseFileName(resolved.commandName);
    if (paramName) {
      rows.usage.text += ` <${paramName}${spreadOperator ? ' ...' : ''}>`;
    } else {
      rows.usage.text += ` ${resolved.commandName}`;
    }
    Object.assign(allOptions, resolved?.command.options);
  }

  // Get the last resolved command
  const finalCommand = context.commandQueue[context.commandQueue.length - 1];

  // Add description row
  if (finalCommand?.command.description) {
    rows.description = {
      text: finalCommand?.command.description,
      padding: [1, 0, 0, 0],
    };
  }

  // Add option rows
  let hasRequiredOptions = false;
  if (Object.keys(allOptions).length) {
    const result = await optionRows({
      options: allOptions,
      maxWidth: maxWidth / 2,
    });
    rows.optionsTitle = {
      text: 'OPTIONS:',
      padding: [1, 0, 0, 0],
    };
    rows.options = result.rows;
    hasRequiredOptions = result.hasRequiredOptions;
  }

  // Add subcommand rows
  const subcommandsDir = finalCommand?.subcommandsDir || context.commandsDir;
  const hasSubcommands = isDirectory(subcommandsDir);
  if (hasSubcommands) {
    Object.assign(
      rows,
      await commandRows({
        command: finalCommand,
        commandsDir: subcommandsDir,
        context,
        maxWidth: maxWidth / 2,
      }),
    );
  }

  const requiresSubcommand = finalCommand?.command.requiresSubcommand;
  if (hasSubcommands && finalCommand?.command.isMiddleware === false) {
    rows.usage.text +=
      hasRequiredOptions || requiresSubcommand
        ? ' (<OPTIONS> | <COMMAND>)'
        : ' ([OPTIONS] | [COMMAND])';
  } else {
    rows.usage.text += hasRequiredOptions ? ' <OPTIONS>' : ' [OPTIONS]';

    if (hasSubcommands) {
      rows.usage.text += requiresSubcommand ? ' <COMMAND>' : ' [COMMAND]';
    }
  }

  // Add rows to cliui
  if (rows.description) {
    cliui.div(rows.description);
  }
  cliui.div(rows.usage);

  if (rows.optionsTitle && rows.options) {
    cliui.div(rows.optionsTitle);
    for (const cols of rows.options) {
      cliui.div(...cols);
    }
  }

  if (rows.subcommandsTitle) cliui.div(rows.subcommandsTitle);

  if (rows.subcommands) {
    for (const cols of rows.subcommands) {
      cliui.div(...cols);
    }
  }

  // Add empty line to cliui
  cliui.div({ text: '', padding: [0, 0, 0, 0] });

  // Convert cliui rows to strings
  const rowStrings = convert(
    rows,
    (value): value is Column => typeof value === 'object' && 'text' in value,
    (value) => value.text,
  );

  rowStrings.subcommands;

  const helpText = cliui.toString();
  cliui.resetOutput();

  return {
    // filter out empty strings
    ...convert(
      rowStrings,
      (value): value is [string, string][] =>
        Array.isArray(value) && value.every((v) => typeof v === 'string'),
      (value) => value.filter(Boolean),
    ),

    helpText,
  };
}

interface OptionRowsOptions {
  options: OptionsConfig;
  maxWidth?: number;
}

function optionRows({ options, maxWidth = 40 }: OptionRowsOptions): {
  rows: [Column, Column][];
  hasRequiredOptions: boolean;
} {
  let hasRequiredOptions = false;
  const firstColWidths = new Set<number>();

  const rows: [Column, Column][] = Object.entries(options).map(
    ([optionName, option]) => {
      const singleLetterKeys = new Set<string>();
      const wordKeys = new Set<string>();

      if (optionName.length === 1) {
        singleLetterKeys.add(`-${optionName}`);
      } else {
        wordKeys.add(`--${optionName}`);
      }

      for (const alias of option.alias || []) {
        if (alias.length === 1) {
          singleLetterKeys.add(`-${alias}`);
        } else {
          wordKeys.add(`--${alias}`);
        }
      }

      const sortedSingleLetterKeys = Array.from(singleLetterKeys).sort();
      const sortedWordKeys = Array.from(wordKeys).sort();

      let optionString = [...sortedSingleLetterKeys, ...sortedWordKeys].join(
        ', ',
      );

      let optionValue: string | undefined;

      switch (option.type) {
        case 'string':
          optionValue = 'string';
          break;
        case 'number':
          optionValue = 'number';
          break;
        case 'array':
          optionValue = 'string ...';
      }

      const isRequired = !!option.required && !option.default;
      hasRequiredOptions = hasRequiredOptions || isRequired;

      if (optionValue) {
        optionString += isRequired ? ` <${optionValue}>` : ` [${optionValue}]`;
      }

      let leftPadding = BASE_INDENT;
      if (!sortedSingleLetterKeys.length) leftPadding += 4;

      firstColWidths.add(optionString.length + leftPadding);

      let description = option.description || '';

      if (option.choices) {
        description += ` (choices: ${option.choices.join(', ')})`;
      }

      if (option.default !== undefined) {
        if (option.type === 'secret') {
          description += ' (default: *****)';
        } else {
          description += ` (default: ${option.default})`;
        }
      }

      return [
        {
          text: optionString,
          padding: [0, 0, 0, leftPadding],
        },
        {
          text: description,
          padding: [0, 0, 0, 3],
        },
      ];
    },
  );

  const firstColWidth = Math.min(Math.max(...firstColWidths), maxWidth);

  // Set the width of the first column of each option span to the max width
  for (const [firstCol] of rows) {
    firstCol.width = firstColWidth;
  }

  return {
    rows,
    hasRequiredOptions,
  };
}

interface CommandRowsOptions {
  command: ResolvedCommand | undefined;
  commandsDir: string;
  context: Context;
  maxWidth?: number;
}

async function commandRows({
  command,
  commandsDir,
  context,
  maxWidth = 40,
}: CommandRowsOptions): Promise<Partial<HelpRows>> {
  // Add subcommands header row
  const rows: Partial<HelpRows> = {
    subcommandsTitle: {
      text: 'COMMANDS:',
      padding: [1, 0, 0, 0],
    },
  };

  const subcommandsDir = command?.subcommandsDir || commandsDir;
  const subcommandFileNames = readdirSync(subcommandsDir);
  const subcommandNames = Array.from(
    // remove file extensions, duplicates, and 'index'
    new Set<string>(
      subcommandFileNames
        .map((commandName) => {
          const { paramName, spreadOperator } = parseFileName(commandName);
          if (paramName) {
            return `[${paramName}${spreadOperator ? ' ...' : ''}]`;
          }
          return removeFileExtension(commandName);
        })
        .filter((name) => name !== 'index')
        // Sort by alphabetical order, but put param commands at the end
        .sort((a, b) => {
          if (a.startsWith('[') && !b.startsWith('[')) {
            return 1;
          }
          if (!a.startsWith('[') && b.startsWith('[')) {
            return -1;
          }
          return a.localeCompare(b);
        }),
    ),
  );
  if (subcommandNames.length === 0) {
    return {};
  }
  const firstColWidths = new Set<number>();

  // Create cliui columns for each subcommand
  rows.subcommands = await Promise.all(
    subcommandNames.map(async (subcommand) => {
      const {
        command: { description },
      } = await context.resolveCommand(subcommand, subcommandsDir);

      firstColWidths.add(subcommand.length + BASE_INDENT);

      return [
        {
          text: subcommand,
          padding: [0, 0, 0, BASE_INDENT],
        },
        {
          text: description || '',
          padding: [0, 0, 0, 3],
        },
      ];
    }),
  );

  const firstColWidth = Math.min(Math.max(...firstColWidths), maxWidth);

  // Set the width of the first column of each subcommand span to the max width
  for (const [firstCol] of rows.subcommands) {
    firstCol.width = firstColWidth;
  }

  return rows;
}

type Column = {
  text: string;
  width?: number;
  align?: 'right' | 'left' | 'center';
  padding: number[];
  border?: boolean;
};
