import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { type InspectOptions, inspect } from 'node:util';
import type { Client } from 'src/core/client';
import { CliError } from 'src/core/errors';
import type { HookPayload } from 'src/core/hooks';
import { type Plugin, PluginError, plugin } from 'src/core/plugin';

export interface LoggerMeta {
  /**
   * Whether the logger is enabled.
   */
  readonly enabled: boolean;
}

interface LoggerOptions {
  /**
   * A custom prefix to use for log messages. Can be a string or a function that
   * returns a string. If a function is provided, it will be called each time a
   * log message is created.
   *
   * @example
   * ```ts
   * prefix: () => `${sessionId}-${new Date().toISOString()}`,
   * ```
   */
  prefix?: string | (() => string);

  /**
   * A path to a file to log to. If provided, the logger will log to this file
   * instead of the console, appending each log message followed by a newline.
   */
  logFile?: string;

  /**
   * Whether the logger is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * Whether to log verbose information. If `true`, additional information will
   * be logged, such as command resolution details and error handling.
   * @default false
   */
  verbose?: boolean;
}

// Global logger state.
let _enabled = true;

// Internal logger control to be reassigned during initialization.
let _disableLogger = () => {
  _enabled = false;
};
let _enableLogger = () => {
  _enabled = true;
};

/**
 * Disables the logger plugin if it was added to the CLI.
 */
export const disableLogger = () => _disableLogger();

/**
 * Enables the logger plugin if it was added to the CLI.
 */
export const enableLogger = () => _enableLogger();

/**
 * Toggles the logger plugin on or off if it was added to the CLI.
 */
export const toggleLogger = () => {
  _enabled ? _disableLogger() : _enableLogger();
};

/**
 * A minimal logger plugin that logs the result of each execution step. By
 * default, it uses the {@linkcode Client} from {@linkcode Context}. If a
 * `logFile` is provided, it will log to that file instead.
 *
 * The logger can be enabled or disabled at any time by emitting one of the
 * {@linkcode LoggerHooks} events:
 * - `enableLogger`: Turns the logger on.
 * - `disableLogger`: Turns the logger off.
 * - `toggleLogger`: Toggles the logger on or off.
 *
 * @example
 * ### Basic Usage
 *
 * ```ts
 * import { run, logger } from '@gud/cli';
 *
 * run({ plugins: [logger()] });
 *
 *
 * ```
 *
 * ### Advanced Usage
 *
 * ```ts
 * import { run, logger } from '@gud/cli';
 *
 * function timestamp() {
 *   return new Date().toISOString();
 * }
 *
 * run({
 *   plugins: [
 *     logger({
 *       prefix: timestamp,
 *       logFile: `logs/${timestamp()}.log`,
 *       enabled: process.env.NODE_ENV === 'development',
 *     })
 *   ],
 * });
 *
 *
 * ```
 *
 * ### Enable/Disable/Toggle the logger in a command
 *
 * ```ts
 * import { command, disableLogger, enableLogger } from '@gud/cli';
 *
 * export default command({
 *   options: {
 *     v {
 *       description: 'Enable verbose logging',
 *       type: 'boolean',
 *       default: false,
 *     },
 *   },
 *   handler: async ({ options, context }) => {
 *     const verbose = await options.verbose();
 *
 *     if (verbose) {
 *       enableLogger();
 *     } else {
 *       disableLogger();
 *     }
 *
 *     // rest of the command...
 *   },
 * });
 * ```
 *
 * @group Plugins
 */
export function logger({
  enabled = _enabled,
  logFile,
  prefix = logFile ? defaultLogFilePrefix : defaultPrefix,
  verbose = false,
}: LoggerOptions = {}): Plugin<LoggerMeta> {
  const getPrefix = typeof prefix === 'function' ? prefix : () => prefix;

  // if a logFile is provided, ensure the directory exists.
  if (logFile) {
    try {
      const dir = dirname(logFile);
      mkdirSync(dir, { recursive: true });
    } catch (error) {
      throw new PluginError(
        `Failed to create log directory for file "${logFile}": ${error}`,
      );
    }
  }

  // Create a function to centralize the logging logic.
  function log(client: Client, message: string, ...data: any[]) {
    let formattedMessage = getPrefix();
    if (logFile) {
      formattedMessage += message;
      logToFile(logFile, formattedMessage, ...data);
    } else {
      formattedMessage += bold(message);
      client.log(`${formattedMessage}:`, ...data.map((d) => formatData(d)));
    }
  }

  // Create hook functions.
  function beforeExecute({ state }: HookPayload<'beforeExecute'>) {
    const { client, commandQueue } = state;
    log(client, 'Starting execution', {
      commandString: state.context.commandString,
      commandCount: commandQueue.length,
      commands: state.commandQueue.map((cmd) => cmd.commandName).join(' → '),
    });
  }
  function beforeCommand({ state, data }: HookPayload<'beforeCommand'>) {
    const { command, client, params } = state;
    if (!command) return;
    const { commandName } = command;
    log(client, 'Executing command', {
      name: commandName,
      params,
      data,
      step: `${state.i + 1}/${state.commandQueue.length}`,
    });
  }
  function afterCommand({ state, command, data }: HookPayload<'afterCommand'>) {
    log(state.client, 'Completed command', {
      commandName: command.commandName,
      data,
    });
  }
  function afterExecute({ state, result }: HookPayload<'afterExecute'>) {
    log(state.client, 'Execution completed', {
      finalResult: result,
      commandsExecuted: state.commandQueue.length,
    });
  }

  // Verbose logging hook functions.
  function beforeResolve({
    context,
    commandString,
    commandsDir,
  }: HookPayload<'beforeResolve'>) {
    log(context.client, 'Resolving commands', {
      commandString,
      commandsDir: relative(process.cwd(), commandsDir),
    });
  }
  function afterResolve({
    context,
    resolvedCommands,
  }: HookPayload<'afterResolve'>) {
    log(
      context.client,
      'Commands resolved',
      resolvedCommands.map((cmd) => ({
        name: cmd.commandName,
        path: relative(process.cwd(), cmd.commandPath),
      })),
    );
  }
  function beforeError({ context, error }: HookPayload<'beforeError'>) {
    const { name, message } =
      error instanceof Error
        ? error
        : new CliError(error, { name: 'UnknownError' });
    log(context.client, 'Error occurred', {
      error: name,
      message,
    });
  }
  function beforeExit({ code, context, message }: HookPayload<'beforeExit'>) {
    log(context.client, 'Exiting', { code, message });
  }

  return plugin<LoggerMeta>({
    name: 'logger',
    description: 'Logs the result of each execution step.',
    meta: {
      get enabled() {
        return _enabled;
      },
      set enabled(value: boolean) {
        _enabled = value;
        if (value) {
          _enableLogger();
        } else {
          _disableLogger();
        }
      },
    },
    init: async ({ hooks, plugins }) => {
      if (plugins.logger?.isReady) {
        throw new PluginError(
          'Logger plugin is already registered. Please remove the duplicate registration.',
        );
      }

      _enabled = enabled;

      _enableLogger = () => {
        hooks.on('beforeExecute', beforeExecute);
        hooks.on('beforeCommand', beforeCommand);
        hooks.on('afterCommand', afterCommand);
        hooks.on('afterExecute', afterExecute);
        if (verbose) {
          hooks.on('beforeResolve', beforeResolve);
          hooks.on('afterResolve', afterResolve);
          hooks.on('beforeError', beforeError);
          hooks.on('beforeExit', beforeExit);
        }
        _enabled = true;
      };

      _disableLogger = () => {
        hooks.off('beforeExecute', beforeExecute);
        hooks.off('beforeCommand', beforeCommand);
        hooks.off('afterExecute', afterExecute);
        if (verbose) {
          hooks.off('beforeResolve', beforeResolve);
          hooks.off('afterResolve', afterResolve);
          hooks.off('beforeError', beforeError);
          hooks.off('beforeExit', beforeExit);
        }
        _enabled = false;
      };

      if (_enabled) _enableLogger();
    },
  });
}

function bold(...msg: string[]) {
  return `\u001b[1m${msg.join(' ')}\u001b[0m`;
}

function defaultPrefix() {
  return '🪵  ';
}

function defaultLogFilePrefix() {
  return `[🪵 ${new Date().toISOString()}] `;
}

function logToFile(logFile: string, message: string, ...data: any[]) {
  const formattedData = data
    .map((d) => formatData(d, { colors: false }))
    .join(' ');
  appendFileSync(logFile, `${message}: ${formattedData}\n`);
}

function formatData(data: any, overrides?: InspectOptions) {
  return inspect(data, {
    compact: false,
    colors: true,
    depth: null,
    maxArrayLength: null,
    maxStringLength: null,
    numericSeparator: true,
    ...overrides,
  });
}
