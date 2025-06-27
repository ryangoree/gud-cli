import { Client, ClientError } from 'src/core/client';
import { type CommandModule, passThroughCommand } from 'src/core/command';
import { Context } from 'src/core/context';
import { CliError } from 'src/core/errors';
import type { LifecycleHooks } from 'src/core/hooks';
import type { OptionsConfig } from 'src/core/options/options';
import type { ParseCommandFn } from 'src/core/parse';
import type { Plugin } from 'src/core/plugin';
import {
  type ResolveCommandFn,
  prepareResolvedCommand,
  resolveDefaultCommandsDir,
} from 'src/core/resolve';
import { hideBin } from 'src/utils/argv';
import { joinTokens, splitTokens } from 'src/utils/tokens';
import type { Replace } from 'src/utils/types';

/**
 * Configuration for setting up a CLI instance.
 */
export interface CliConfig<TOptions extends OptionsConfig = OptionsConfig> {
  /**
   * The name of the CLI application which will be shown in help messages.
   */
  // TODO: implement
  name?: string;

  /**
   * A directory path containing command modules.
   * @default `${process.cwd()}/commands` || `${__dirname}/commands`
   */
  commandsDir?: string;

  /**
   * An array of plugins that can modify or augment the behavior of commands.
   */
  plugins?: Plugin[];

  /**
   * Options to include in the context.
   */
  options?: TOptions;

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
 * Runtime options for executing commands.
 */
export interface RunConfig {
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
   * Initial context or data to pass to commands during execution.
   */
  initialData?: unknown;
}

/**
 * A CLI builder that supports inline commands and file-based discovery.
 */
// TODO: Make fields private after dev
export class Cli<
  TOptions extends OptionsConfig = OptionsConfig,
  TCommands extends Record<string, CommandModule<any, any, any>> = Record<
    string,
    CommandModule
  >,
> {
  config: CliConfig<TOptions>;
  commandsDir: string;
  client: Client;

  /**
   * A map of inline commands defined using the `command` method.
   * The key is the command path (e.g., 'hello', 'deploy/staging').
   */
  virtualCommands: Map<string, CommandModule> = new Map();

  constructor(config: CliConfig<TOptions> = {}) {
    this.config = config;
    this.commandsDir = config.commandsDir || resolveDefaultCommandsDir(2);
    this.client = config.client || new Client();
  }

  /**
   * Add a command to the CLI.
   * @param path - Command path (e.g., 'hello', 'deploy/staging', 'users/[id]/delete')
   * @param module - Command module definition
   */
  command<TName extends string, TCommand extends CommandModule<any, any, any>>(
    path: TName,
    module: TCommand,
  ): Cli<
    Replace<TOptions, TCommand['options']>,
    Replace<TCommands, Record<TName, TCommand>>
  > {
    // Validate command path
    if (!/^[a-zA-Z0-9_\/]+$/.test(path)) {
      throw new CliError(
        [
          `Invalid command path: "${path}"`,
          'Command paths can only contain alphanumeric characters, underscores, and slashes.',
          'Example: "hello" or "deploy/staging"',
        ].join('\n  '),
      );
    }

    // Split the path to ensure any necessary directory/pass-through commands
    // are created, e.g., 'deploy/staging' should create a pass-through command
    // for `deploy` if it doesn't exist.
    const pathTokens = splitTokens(path, '/').slice(0, -1);
    let currentPath = '';

    // Check the path up to the last token, creating pass-through commands for
    // any directories that don't exist yet.
    while (pathTokens.length) {
      const token = pathTokens.shift();
      if (!token) continue;
      currentPath = joinTokens(currentPath, token, { delimiter: '/' });
      if (!this.virtualCommands.has(currentPath)) {
        this.virtualCommands.set(currentPath, passThroughCommand);
      }
    }

    this.virtualCommands.set(path, module);
    return this;
  }

  /**
   * Execute the CLI with the given options.
   */
  async run({
    command = hideBin(process.argv),
    defaultCommand,
    initialData,
  }: RunConfig = {}) {
    let commandString = joinTokens(command);

    const isInvalidCommand = !commandString || commandString.startsWith('-');
    if (isInvalidCommand && defaultCommand) {
      commandString = joinTokens(defaultCommand, command);
    }

    // create context
    const context = new Context({
      commandString,
      commandsDir: this.commandsDir,
      options: this.config.options,
      plugins: this.config.plugins,
      hooks: this.config.hooks,
      client: this.client,
      parseFn: this.config.parseFn,
      resolveFn: this.config.resolveFn,
    });
    await context.preparePlugins();

    context.hooks.on(
      'beforeResolve',
      async ({ context, remainingCommandString, nextCommandsDir, skip }) => {
        const [commandName, ...restTokens] = splitTokens(
          remainingCommandString,
        );
        if (!commandName) return;

        if (this.virtualCommands.has(commandName)) {
          context.client.log(`✅ Found inline command: ${commandName}`);
          const command = this.virtualCommands.get(commandName);

          if (command) {
            const prepared = await prepareResolvedCommand({
              command,
              commandName,
              commandPath: commandName,
              commandTokens: [commandName],
              remainingCommandString: joinTokens(restTokens),
              subcommandsDir: '',
            });
            context.addToQueue([prepared]);
            skip();
          }
        } else {
          context.client.log(
            `❌ No inline command found for: ${commandString}`,
          );
        }
      },
    );

    // Intercept process exit events to ensure they are handled by the context.
    process.on('exit', context.exit);

    // Attempt to prepare and execute the command and return the result.
    try {
      await context.prepare();
      await context.execute(initialData);
    } catch (error) {
      process.off('exit', context.exit);
      // simply return client errors since they're handled by the client
      if (error instanceof ClientError) return error;
      if (error instanceof CliError) throw error;
      throw new CliError(error);
    }

    process.off('exit', context.exit);
    return context.result;
  }
}

/**
 * Create a new CLI instance.
 */
export function cli<TOptions extends OptionsConfig = OptionsConfig>(
  config: CliConfig<TOptions> = {},
): Cli<TOptions> {
  return new Cli(config);
}
