import type { OptionValues, OptionsConfig } from 'src/core/options/options';
import { validateOptionsConfig } from 'src/core/options/validate-option-config';
import type { MaybePromise } from 'src/utils/types';
import parse from 'yargs-parser';

// Types //

/**
 * Command tokens representing commands, subcommands, and/or params.
 * @group Parse
 */
export type Tokens = string[];

/**
 * The result of parsing a command string.
 * @group Parse
 */
export type ParsedCommand = {
  tokens: Tokens;
  options: OptionValues;
};

/**
 * A function to parse a command string.
 * @group Parse
 */
export type ParseCommandFn = (
  commandString: string,
  optionsConfig: OptionsConfig,
) => MaybePromise<ParsedCommand>;

// Functions + Function Types //

/**
 * Parse a command string into command tokens and options values.
 *
 * @param commandString - The command string to parse.
 * @param optionsConfig  - The options config to use when parsing. Only options
 *  that are defined in the config will be included in the option values. Any
 *  options that are not defined in the config will be treated as command
 *  tokens.
 * @returns The parsed command tokens and options values.
 * @group Parse
 */
export function parseCommand(
  commandString: string,
  optionsConfig: OptionsConfig,
): ParsedCommand {
  validateOptionsConfig(optionsConfig);

  // Prepare the options config for yargs-parser
  const parseOptions: {
    alias: Record<string, string[]>;
    array: string[];
    boolean: string[];
    number: string[];
    string: string[];
    narg: Record<string, number>;
  } = {
    alias: {},
    array: [],
    boolean: [],
    number: [],
    string: [],
    narg: {},
  };

  for (const [key, option] of Object.entries(optionsConfig)) {
    if (option.alias) {
      parseOptions.alias[key] = option.alias as string[];
    }

    if (option.nargs) {
      parseOptions.narg[key] = option.nargs;
    }

    switch (option.type) {
      case 'array':
        parseOptions.array.push(key);
        break;
      case 'boolean':
        parseOptions.boolean.push(key);
        break;
      case 'number':
        parseOptions.number.push(key);
        break;
      default:
        parseOptions.string.push(key);
        break;
    }
  }

  // Parse the command string with yargs-parser
  const { _, ...options } = parse(commandString, {
    ...parseOptions,
    configuration: {
      'duplicate-arguments-array': false,
      'unknown-options-as-args': true,
      'parse-numbers': false,
    },
  });

  // number parsing disabled...
  let tokens = _ as Tokens;

  // Treat unknown options as boolean flags
  tokens = tokens.filter((token) => {
    if (token.startsWith('-')) {
      options[token.replace(/^-+/, '')] = true;
      return false;
    }
    return true;
  });

  // Split array options by commas
  for (const [key, value] of Object.entries(options)) {
    if (Array.isArray(value)) {
      options[key] = value.flatMap((value) => value.split(',')).filter(Boolean);
    }
  }

  return { tokens, options };
}

/**
 * Remove leading options from a command string by parsing it with the provided
 * parse function and returning the remaining command string.
 */
export async function removeLeadingOptions(
  commandString: string,
  optionsConfig: OptionsConfig,
  parseFn: ParseCommandFn = parseCommand,
) {
  if (!commandString) return '';
  const { tokens } = await parseFn(commandString, optionsConfig);
  if (!tokens.length) return '';
  const indexOfNextCommand = commandString.indexOf(tokens[0]!);
  return commandString.slice(indexOfNextCommand);
}
