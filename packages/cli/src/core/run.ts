import path from 'node:path';
import { type Client, ClientError } from 'src/core/client';
import type { ParseCommandFn } from 'src/core/parse';
import type { ResolveCommandFn } from 'src/core/resolve';
import { hideBin } from 'src/utils/argv';
import { getCallerPath } from 'src/utils/caller-path';
import { isDirectory } from 'src/utils/fs';
import { joinTokens } from 'src/utils/tokens';
import { Context } from './context';
import { ClideError } from './errors';
import { type HookPayload, HookRegistry } from './hooks';
import type { OptionsConfig } from './options/options';
import type { Plugin } from './plugin';

/**
 * Params for the {@linkcode run} function.
 * @group Run
 */
export interface RunParams {
  /**
   * The command string or array to be parsed and executed. If not provided, it
   * defaults to system arguments.
   */
  command?: string | string[];

  /**
   * The command string to run if no command is provided.
   */
  defaultCommand?: string | string[];

  /**
   * A directory path containing command modules.
   * @default `${process.cwd()}/commands` || `${__dirname}/commands`
   */
  commandsDir?: string;

  /**
   * Initial context or data to pass to commands during execution.
   */
  initialData?: unknown;

  /**
   * Options to include in the context.
   */
  options?: OptionsConfig;

  /**
   * An array of plugins that can modify or augment the behavior of commands.
   */
  plugins?: Plugin[];

  /**
   * The client instance to use for logging and user interaction.
   * @default A new instance of {@linkcode Client}
   */
  client?: Client;

  /**
   * An optional function to replace the default command resolver.
   */
  resolveFn?: ResolveCommandFn;

  /**
   * An optional function to replace the default command parser.
   */
  parseFn?: ParseCommandFn;

  /**
   * A hook that runs before attempting to locate and import command modules.
   */
  beforeResolve?: (payload: HookPayload<'beforeResolve'>) => void;

  /**
   * A hook that runs before attempting to locate and import each subcommand
   * module.
   */
  beforeResolveNext?: (payload: HookPayload<'beforeResolveNext'>) => void;

  /**
   * A hook that runs after importing command modules.
   */
  afterResolve?: (payload: HookPayload<'afterResolve'>) => void;

  /**
   * A hook that runs before parsing the command string using the options config
   * from plugins and imported command modules.
   */
  beforeParse?: (payload: HookPayload<'beforeParse'>) => void;

  /**
   * A hook that runs after parsing the command string.
   */
  afterParse?: (payload: HookPayload<'afterParse'>) => void;

  /**
   * A hook that runs before calling the first command.
   */
  beforeExecute?: (payload: HookPayload<'beforeExecute'>) => void;

  /**
   * A hook that runs before executing a command module.
   */
  beforeCommand?: (payload: HookPayload<'beforeCommand'>) => void;

  /**
   * A hook that runs after executing a command module.
   */
  afterCommand?: (payload: HookPayload<'afterCommand'>) => void;

  /**
   * A hook that runs before each state update during command execution.
   */
  beforeStateChange?: (payload: HookPayload<'beforeStateChange'>) => void;

  /**
   * A hook that runs after each state update during command execution.
   */
  afterStateChange?: (payload: HookPayload<'afterStateChange'>) => void;

  /**
   * A hook that runs before executing the `context.end()` function.
   */
  beforeEnd?: (payload: HookPayload<'beforeEnd'>) => void;

  /**
   * A hook that runs once all commands have been called or when `context.end()`
   * is called.
   */
  afterExecute?: (payload: HookPayload<'afterExecute'>) => void;

  /**
   * A hook that runs whenever an error is thrown.
   */
  onError?: (payload: HookPayload<'error'>) => void;

  /**
   * A hook that runs whenever a plugin or command intends to exit the process.
   */
  beforeExit?: (payload: HookPayload<'beforeExit'>) => void;
}

/**
 * Run a command with optional plugins and dynamic command discovery.
 * @returns The result of the executed command.
 *
 * @example
 * run({
 *   defaultCommand: 'build',
 *   plugins: [help()]
 * });
 *
 * @remarks
 * If no commands directory is provided, this function will try to find one by
 * first looking for a "commands" directory in the current working directory,
 * then looking for a "commands" directory adjacent to the file that called this
 * function.
 *
 * For example, if the node process is started from the root of a project and
 * this function is called from a file at "src/cli.js", it will look for a
 * "commands" directory in the root of the project and in the "src" directory.
 * @group Run
 */
export async function run({
  command = hideBin(process.argv),
  defaultCommand,
  commandsDir,
  initialData,
  options,
  plugins,
  client,
  parseFn,
  resolveFn,
  beforeResolve,
  beforeResolveNext,
  afterResolve,
  beforeParse,
  afterParse,
  beforeExecute,
  beforeCommand,
  afterCommand,
  beforeStateChange,
  afterStateChange,
  beforeEnd,
  afterExecute,
  onError,
  beforeExit,
}: RunParams = {}) {
  // attempt to find commands directory
  if (!commandsDir) {
    // keep track of paths that were tried for the error message
    const triedPaths: string[] = [];

    // default to "<cwd>/commands"
    const defaultCommandsDirName = 'commands';
    let defaultCommandsDir = path.resolve(defaultCommandsDirName);

    // if "<cwd>/commands" doesn't exist, try "<caller-dir>/commands"
    if (!isDirectory(defaultCommandsDir)) {
      triedPaths.push(defaultCommandsDir);
      const callerDirPath = path.dirname(getCallerPath() || '');
      defaultCommandsDir = path.join(callerDirPath, defaultCommandsDirName);
    }

    // if neither "<cwd>/commands" nor "<caller-dir>/commands" exist, throw
    if (!isDirectory(defaultCommandsDir)) {
      triedPaths.push(defaultCommandsDir);
      throw new ClideError(
        `Unable to find commands directory. Specify the path to the directory containing command modules using the "commandsDir" option or create the directory at one of the following locations:
  - ${triedPaths.join('\n  - ')}
  `,
      );
    }

    commandsDir = defaultCommandsDir;
  }

  let commandString = joinTokens(command);
  if ((!commandString || commandString.startsWith('-')) && defaultCommand) {
    commandString = joinTokens(defaultCommand, command);
  }

  // create hook registry
  const hooks = new HookRegistry();

  // register hooks
  if (beforeResolve) hooks.on('beforeResolve', beforeResolve);
  if (beforeResolveNext) hooks.on('beforeResolveNext', beforeResolveNext);
  if (afterResolve) hooks.on('afterResolve', afterResolve);
  if (beforeParse) hooks.on('beforeParse', beforeParse);
  if (afterParse) hooks.on('afterParse', afterParse);
  if (beforeExecute) hooks.on('beforeExecute', beforeExecute);
  if (beforeCommand) hooks.on('beforeCommand', beforeCommand);
  if (afterCommand) hooks.on('afterCommand', afterCommand);
  if (beforeStateChange) hooks.on('beforeStateChange', beforeStateChange);
  if (afterStateChange) hooks.on('afterStateChange', afterStateChange);
  if (beforeEnd) hooks.on('beforeEnd', beforeEnd);
  if (afterExecute) hooks.on('afterExecute', afterExecute);
  if (onError) hooks.on('error', onError);
  if (beforeExit) hooks.on('beforeExit', beforeExit);

  // create context
  const context = new Context({
    commandString,
    commandsDir,
    options,
    plugins,
    hooks,
    client,
    parseFn,
    resolveFn,
  });

  // Intercept process exit events to ensure they are handled by the context.
  process.on('exit', context.exit);

  // Attempt to prepare and execute the command and return the result.
  try {
    await context.prepare();
    await context.execute(initialData);
    return context.result;
  } catch (error) {
    // simply return client errors since they're handled by the client
    if (error instanceof ClientError) return error;
    if (error instanceof ClideError) throw error;
    throw new ClideError(error);
  }
}
