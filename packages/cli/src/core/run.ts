import { type Client, ClientError } from 'src/core/client';
import type { ParseCommandFn } from 'src/core/parse';
import {
  type ResolveCommandFn,
  resolveDefaultCommandsDir,
} from 'src/core/resolve';
import { hideBin } from 'src/utils/argv';
import { joinTokens } from 'src/utils/tokens';
import { Context } from './context';
import { CliError } from './errors';
import { HookRegistry, type LifecycleHooks } from './hooks';
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
   * The default command string to run if no command is provided.
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
   * @default new Client()
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
   * Optional lifecycle hooks to customize command execution.
   */
  hooks?: Partial<LifecycleHooks>;
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
  commandsDir = resolveDefaultCommandsDir(1),
  initialData,
  options,
  plugins,
  client,
  parseFn,
  resolveFn,
  hooks,
}: RunParams = {}) {
  let commandString = joinTokens(command);
  if ((!commandString || commandString.startsWith('-')) && defaultCommand) {
    commandString = joinTokens(defaultCommand, command);
  }

  // create context
  const context = new Context({
    commandString,
    commandsDir,
    options,
    plugins,
    hooks: new HookRegistry(hooks),
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
    if (error instanceof CliError) throw error;
    throw new CliError(error);
  }
}
