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
  // Parse the command with yargs-parser
  const { _, ...options } = parse(command, getParserOptions(optionsConfig));

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
 * Remove leading options from a command string or an array of arguments and
 * return the remaining command string or arguments.
 *
 * @remarks
 * With the default parse function, the options end at the first argument that
 * isn't an option or an option's value. With a custom parse function, they end
 * at the first argument that matches the first token it returns.
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

  if (parseFn !== parseCommand) {
    const { tokens } = await parseFn(command, optionsConfig);
    if (!tokens.length) return [];
    return command.slice(command.indexOf(tokens[0]!));
  }

  // Stop parsing at the first argument that isn't an option or an option's
  // value. Everything after it is returned in `_`.
  const parserOptions = getParserOptions(optionsConfig);
  const { _ } = parse(command, {
    ...parserOptions,
    configuration: {
      ...parserOptions.configuration,
      "halt-at-non-option": true,
    },
  });
  const remaining = command.slice(command.length - _.length);

  // Skip leading unknown options, which are treated as boolean flags
  const indexOfNextCommand = remaining.findIndex((token) => !token.startsWith("-"));
  return indexOfNextCommand === -1 ? [] : remaining.slice(indexOfNextCommand);
}

// Internal //

/**
 * Validate the options config and convert it to yargs-parser options.
 */
function getParserOptions(optionsConfig: OptionsConfig) {
  validateOptionsConfig(optionsConfig);

  const parserOptions = {
    alias: {} as Record<string, string[]>,
    array: [] as string[],
    boolean: [] as string[],
    number: [] as string[],
    string: [] as string[],
    narg: {} as Record<string, number>,
    configuration: {
      "duplicate-arguments-array": false,
      "unknown-options-as-args": true,
      "parse-numbers": false,
    } as Partial<parse.Configuration>,
  };

  for (const [key, option] of Object.entries(optionsConfig)) {
    if (option.alias) {
      parserOptions.alias[key] = option.alias as string[];
    }

    if (option.nargs) {
      parserOptions.narg[key] = option.nargs;
    }

    switch (option.type) {
      case "array":
        parserOptions.array.push(key);
        break;
      case "boolean":
        parserOptions.boolean.push(key);
        break;
      case "number":
        parserOptions.number.push(key);
        break;
      default:
        parserOptions.string.push(key);
        break;
    }
  }

  return parserOptions;
}
