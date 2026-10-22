import parse from "yargs-parser";
import type { OptionsConfig, OptionValues } from "#/core/options/options";
import { validateOptionsConfig } from "#/core/options/validate-option-config";
import { joinTokens, splitTokens } from "#/utils/tokens";
import type { MaybePromise } from "#/utils/types";

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
 * A function to parse a command string or an array of arguments.
 *
 * @remarks
 * The CLI passes arguments as an array so values containing spaces or quotes
 * are preserved. Support for command strings will be removed in the next
 * major version.
 * @group Parse
 */
export type ParseCommandFn = (
  command: string | string[],
  optionsConfig: OptionsConfig,
) => MaybePromise<ParsedCommand>;

// Functions + Function Types //

/**
 * Parse a command string or an array of arguments into command tokens and
 * options values.
 *
 * @param command - The command string or arguments to parse.
 * @param optionsConfig  - The options config to use when parsing. Only options
 *  that are defined in the config will be included in the option values. Any
 *  options that are not defined in the config will be treated as command
 *  tokens.
 * @returns The parsed command tokens and options values.
 * @group Parse
 */
export function parseCommand(
  command: string | string[],
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
      case "array":
        parseOptions.array.push(key);
        break;
      case "boolean":
        parseOptions.boolean.push(key);
        break;
      case "number":
        parseOptions.number.push(key);
        break;
      default:
        parseOptions.string.push(key);
        break;
    }
  }

  // Parse the command with yargs-parser
  const { _, ...options } = parse(command, {
    ...parseOptions,
    configuration: {
      "duplicate-arguments-array": false,
      "unknown-options-as-args": true,
      "parse-numbers": false,
    },
  });

  // number parsing disabled...
  let tokens = _ as Tokens;

  // Treat unknown options as boolean flags
  tokens = tokens.filter((token) => {
    if (token.startsWith("-")) {
      options[token.replace(/^-+/, "")] = true;
      return false;
    }
    return true;
  });

  // Split array options by commas
  for (const [key, value] of Object.entries(options)) {
    if (Array.isArray(value)) {
      options[key] = value.flatMap((value) => value.split(",")).filter(Boolean);
    }
  }

  return { tokens, options };
}

/**
 * Remove leading options from a command string or an array of arguments by
 * parsing it with the provided parse function and returning the remaining
 * command string or arguments.
 */
export async function removeLeadingOptions(
  args: string[],
  optionsConfig: OptionsConfig,
  parseFn?: ParseCommandFn,
): Promise<string[]>;
export async function removeLeadingOptions(
  commandString: string,
  optionsConfig: OptionsConfig,
  parseFn?: ParseCommandFn,
): Promise<string>;
export async function removeLeadingOptions(
  command: string | string[],
  optionsConfig: OptionsConfig,
  parseFn: ParseCommandFn = parseCommand,
): Promise<string | string[]> {
  if (typeof command === "string") {
    const remaining = await removeLeadingOptions(splitTokens(command), optionsConfig, parseFn);
    return joinTokens(remaining);
  }

  if (!command.length) return [];
  const { tokens } = await parseFn(command, optionsConfig);
  if (!tokens.length) return [];
  const indexOfNextCommand = command.indexOf(tokens[0]!);
  return command.slice(indexOfNextCommand);
}
