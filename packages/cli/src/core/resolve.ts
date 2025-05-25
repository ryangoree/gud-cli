import { readdirSync } from 'node:fs';
import path from 'node:path';
import { type CommandModule, command } from 'src/core/command';
import {
  CliError,
  type CliErrorOptions,
  NotFoundError,
  UsageError,
} from 'src/core/errors';
import { OptionsError } from 'src/core/options/validate-options';
import { type ParseCommandFn, parseCommand } from 'src/core/parse';
import {
  formatFileName,
  parseFileName,
  removeFileExtension,
} from 'src/utils/filename';
import { isDirectory, isFile } from 'src/utils/fs';
import { joinTokens, splitTokens } from 'src/utils/tokens';
import type { MaybePromise } from 'src/utils/types';

// Errors //

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

/**
 * An error indicating a command is missing a default export.
 * @group Errors
 */
export class MissingDefaultExportError extends CliError {
  constructor(token: string | number, path: string, options?: CliErrorOptions) {
    super(`Missing default export for command "${token}" at "${path}"`, {
      name: 'MissingDefaultExportError',
      ...options,
    });
  }
}

// Types //

/**
 * A function to resolve a command based on the provided command string and
 * directory path, returning the first matching command.
 * @group Resolve
 */
export type ResolveCommandFn = (
  options: ResolveCommandParams,
) => MaybePromise<ResolvedCommand>;

/**
 * Params that were parsed from the command string.
 * @group Resolve
 */
export type RouteParams = Record<string, string | string[]>;

/**
 * Object containing details about the resolved command, the path to the command
 * file, any parameters, and a function to resolve the next command, if any.
 * @group Resolve
 */
export interface ResolvedCommand {
  /**
   * The command object associated with the resolved command.
   */
  command: CommandModule;

  /**
   * The path to the resolved command file.
   */
  commandPath: string;

  /**
   * The name of the resolved command.
   */
  commandName: string;

  /**
   * The command tokens that were resolved.
   */
  commandTokens: string[];

  /**
   * The part of the command string that has not yet been resolved.
   */
  remainingCommandString: string;

  /**
   * The path to the directory where the command's subcommands should live.
   */
  subcommandsDir: string;

  /**
   * A function to resolve the next command, if any, based on the remaining
   * command string.
   */
  resolveNext?: () => MaybePromise<ResolvedCommand>;

  /**
   * The params associated with the resolved command.
   */
  params?: RouteParams;
}

// Functions + Function Types //

/**
 * Params for the {@linkcode resolveCommand} function.
 * @group Resolve
 */
export interface ResolveCommandParams {
  /**
   *  The command string to resolve a command file for.
   */
  commandString: string;

  /**
   *  The path to the directory containing the command files.
   */
  commandsDir: string;

  /**
   * A function to parse the command string and options. Used to determine if
   * the command string contains any options and to remove them from the
   * remaining command string.
   */
  parseFn?: ParseCommandFn;
}

/**
 * Resolves a command based on the provided command string and directory path,
 * returning the first matching command.
 *
 * This function attempts to locate a matching command file for the provided
 * command string. If found, it imports and returns the associated command. If a
 * command file isn't directly found, it checks if the path is a directory and
 * treats it as a pass-through command, allowing deeper command resolution.
 *
 * If neither a command file nor a directory is found, it checks for
 * parameterized command files (e.g., [param].ts or [...param].ts) in the
 * expected directory and tries to resolve them.
 *
 * The function provides detailed error feedback if the command can't be
 * resolved or if the found module doesn't export a default command.
 *
 * @returns An object containing details about the resolved command, the path to
 * the command file, any parameters, and a function to resolve the next command,
 * if any.
 *
 * @throws {UsageError | NotFoundError | MissingDefaultExportError} Throws an
 * error if command resolution fails due to missing tokens, command not found,
 * or missing default export.
 *
 * @group Resolve
 */
export async function resolveCommand({
  commandString,
  commandsDir,
  parseFn = parseCommand,
}: ResolveCommandParams): Promise<ResolvedCommand> {
  if (!commandString.length) throw new CommandRequiredError();

  const [commandName, ...remainingTokens] = splitTokens(commandString) as [
    string,
    ...string[],
  ];

  // Check if the first token is an option.
  if (commandName.startsWith('-')) {
    throw new OptionsError(`Unknown option "${commandName}"`);
  }

  // Check if the command name is a relative path (e.g., ./foo, ../foo, /foo)
  if (/^(\.|\/)/.test(commandName)) {
    throw new UsageError(`Invalid command name: ${commandName}`);
  }

  // Ensure the command directory exists.
  if (!isDirectory(commandsDir)) {
    throw new NotFoundError(commandName, commandsDir);
  }

  const subcommandsDir = path.join(commandsDir, commandName);
  const commandPath = formatFileName(subcommandsDir);
  const commandTokens = [commandName];
  const remainingCommandString = joinTokens(remainingTokens);

  let resolved: ResolvedCommand | undefined;

  // Attempt to load the command file.
  try {
    const { default: command }: { default: CommandModule } = await import(
      commandPath
    );

    if (!command) {
      throw new MissingDefaultExportError(commandName, commandPath);
    }

    resolved = {
      command,
      commandPath,
      commandName,
      commandTokens,
      remainingCommandString,
      subcommandsDir,
    };
  } catch (err: unknown) {
    // If the file exists but couldn't be loaded for some other reason, forward
    // the error to avoid masking module errors.
    if (isFile(commandPath)) throw err;

    // If the command file doesn't exist, check if the path is a directory and
    // treat it as a pass-through command.
    if (isDirectory(subcommandsDir)) {
      resolved = {
        command: command(),
        commandPath,
        commandName,
        commandTokens,
        remainingCommandString,
        subcommandsDir,
      };
    }
  }

  // If the command file wasn't found, attempt to resolve a parameterized
  // command.
  if (!resolved) {
    resolved = await resolveParamCommand({
      commandString,
      commandsDir,
      parseFn,
    });
  }

  // If the command file still wasn't found, throw an error.
  if (!resolved) {
    throw new NotFoundError(commandName, commandsDir);
  }

  return prepareResolvedCommand({ resolved, parseFn });
}

interface PrepareResolvedCommandParams {
  resolved: ResolvedCommand;

  /**
   * A function to parse the command string and options. Used to determine if
   * the command string contains any options and to remove them from the
   * remaining command string.
   */
  parseFn?: ParseCommandFn;
}

/**
 * Prepares a resolved command by:
 * - Ensuring the remaining command string starts with a subcommand name.
 * - Adding a `resolveNext` function if the command isn't the last one.
 * - Replacing the handler with a pass-through function if the command won't be
 *   executed.
 *
 * @returns The prepared resolved command.
 *
 * @group Resolve
 */
export async function prepareResolvedCommand({
  resolved,
  parseFn = parseCommand,
}: PrepareResolvedCommandParams) {
  const isMiddleware = resolved.command.isMiddleware ?? true;

  // Ensure the remaining command string starts with a subcommand name by
  // removing any leading options. This will ensure they aren't treated as
  // command names which would cause errors during resolution. Example: `--help
  // foo` -> `foo`
  if (resolved.remainingCommandString.length) {
    // Parse the remaining command string to separate the tokens from the
    // options.
    const { tokens } = await parseFn(
      resolved.remainingCommandString,
      isMiddleware ? resolved.command.options || {} : {},
    );

    // If there are only options left, then empty the remaining command string.
    if (!tokens.length) {
      resolved.remainingCommandString = '';
    } else {
      // Otherwise, remove the leading options.
      const indexOfNextCommand = resolved.remainingCommandString.indexOf(
        tokens[0]!,
      );
      resolved.remainingCommandString =
        resolved.remainingCommandString.slice(indexOfNextCommand);
    }
  }

  // Add a resolveNext function if the command isn't the last one.
  if (resolved.remainingCommandString) {
    resolved.resolveNext = () =>
      resolveCommand({
        commandString: resolved.remainingCommandString,
        commandsDir: resolved.subcommandsDir,
        parseFn,
      });
  }

  // Replace the handler if the command won't be executed.
  if (!isMiddleware && resolved.resolveNext) {
    resolved.command.handler = ({ data, next }) => next(data);
  }

  return resolved;
}

// Internal //

/**
 * Attempts to load a command module by finding a param file name in the given
 * directory.
 */
async function resolveParamCommand({
  commandString,
  commandsDir,
  parseFn = parseCommand,
}: ResolveCommandParams): Promise<ResolvedCommand | undefined> {
  if (!commandString.length) throw new UsageError('Command required.');

  const fileNames = readdirSync(commandsDir);
  let tokens = splitTokens(commandString) as [string, ...string[]];
  let resolved: ResolvedCommand | undefined;

  // optimization opportunities:
  //   - cache the results of this function
  //   - parse all file names at once
  for (const fileName of fileNames) {
    const { spreadOperator, paramName } = parseFileName(fileName);

    // Skip files that don't match the expected param file name format.
    if (!paramName) continue;

    const commandName = removeFileExtension(fileName);
    const commandPath = path.join(commandsDir, formatFileName(commandName));
    const subcommandsDir = removeFileExtension(commandPath);
    const [commandToken, ...remainingTokens] = tokens;

    // Empty the remaining command string if the param has a spread operator
    // (e.g., [...param].ts) indicating that all remaining tokens should be
    // passed to the command.
    const remainingCommandString = spreadOperator
      ? ''
      : joinTokens(remainingTokens);

    // Attempt to load the command file.
    try {
      const { default: command } = await import(commandPath);

      if (!command) {
        throw new MissingDefaultExportError(tokens[0], commandPath);
      }

      // Parse the command string to separate the tokens from the options.
      if (command.options) {
        const parsedString = await parseFn(commandString, command.options);
        tokens = parsedString.tokens as [string, ...string[]];
      }

      // If the param has a spread operator (e.g., [...param].ts), then pass all
      // command tokens as the param value. Otherwise, pass only the first
      // command token.
      const params = {
        [paramName]: spreadOperator ? tokens : commandToken,
      };

      resolved = {
        command,
        commandName,
        commandPath,
        commandTokens: spreadOperator ? tokens : [commandToken],
        params,
        remainingCommandString,
        subcommandsDir,
      };
    } catch (err) {
      // If the file exists but couldn't be loaded for some other reason,
      // forward the error to avoid masking module errors.
      if (isFile(commandPath)) throw err;
      // If the command file doesn't exist, assume the path is a directory and
      // treat it as a pass-through command. This is safe to assume since the
      // paths are derived from readdir so we know they exist.
      resolved = {
        command: command(),
        commandName,
        commandPath,
        commandTokens: [commandToken],
        params: {
          [paramName]: commandToken,
        },
        remainingCommandString,
        subcommandsDir,
      };
    }

    // match found, stop searching
    break;
  }

  return resolved;
}
