import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Client } from 'src/core/client';
import type { HookPayload } from 'src/core/hooks';
import { type Plugin, plugin } from 'src/core/plugin';

export interface LoggerMeta {
  /**
   * Whether the logger is enabled.
   */
  readonly enabled: boolean;
}

export interface LoggerHooks {
  /**
   * Turns the logger on.
   */
  enableLogger: () => void;

  /**
   * Turns the logger off.
   */
  disableLogger: () => void;

  /**
   * Toggles the logger on or off.
   */
  toggleLogger: () => void;
}

interface LoggerOptions {
  /**
   * The prefix to use for log messages. Can be a string or a function that
   * returns a string. If a function is provided, it will be called each time a
   * log message is created.
   *
   * @defaultValue A timestamp.
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
   * @defaultValue `true`
   */
  enabled?: boolean;
}

export let disableLogger: () => void;
export let enableLogger: () => void;
export let toggleLogger: () => void;

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
  prefix = defaultPrefix,
  logFile,
  enabled = true,
}: LoggerOptions = {}): Plugin<LoggerMeta> {
  const getPrefix = typeof prefix === 'function' ? prefix : () => prefix;

  // if a logFile is provided, ensure the directory exists.
  if (logFile) {
    const dir = path.dirname(logFile);
    mkdirSync(dir, { recursive: true });
  }

  // Create a function to centralize the logging logic.
  function log(client: Client, message: string, ...data: any[]) {
    const prefixedMessage = `${getPrefix()}${message}`;
    if (logFile) {
      logToFile(logFile, prefixedMessage, ...data);
    } else {
      client.log(`${prefixedMessage}:`, ...data);
    }
  }

  // Create a function to log state transitions.
  function logTransition(
    transitionName: string,
    { state }: HookPayload<'beforeCommand' | 'beforeEnd'>,
  ) {
    const { command, client, params, data } = state;
    if (!command) return;
    const { commandName, commandTokens, commandPath } = command;
    log(client, transitionName, {
      commandName,
      commandTokens,
      commandPath,
      params,
      data,
    });
  }

  // Create beforeCommand and beforeEnd hooks that log the transitions.
  function beforeCommand(payload: HookPayload<'beforeCommand'>) {
    logTransition('next', payload);
  }
  function beforeEnd(payload: HookPayload<'beforeEnd'>) {
    logTransition('end', payload);
  }

  // Return the plugin object.
  return plugin<LoggerMeta>({
    name: 'logger',
    description: 'Logs the result of each execution step.',
    meta: {
      // Create a meta object to provide read-only access to the enabled state.
      // It's important that the enabled state can't be modified directly
      // because the hooks need to be aware of the state changes.
      get enabled() {
        return enabled;
      },
    },
    init: async ({ client, commandString, hooks }) => {
      // Initialize the functions to enable and disable the logger.
      enableLogger = () => {
        hooks.on('beforeCommand', beforeCommand);
        hooks.on('beforeEnd', beforeEnd);
        enabled = true;
      };
      disableLogger = () => {
        hooks.off('beforeCommand', beforeCommand);
        hooks.off('beforeEnd', beforeEnd);
        enabled = false;
      };

      // Log the command if the logger is enabled.
      if (enabled) {
        enableLogger();
        log(client, 'received command', commandString);
      }

      // Add custom hooks to enable, disable, and toggle the logger.
      hooks.on('enableLogger', () => enableLogger());
      hooks.on('disableLogger', () => disableLogger());
      hooks.on('toggleLogger', () =>
        enabled ? disableLogger() : enableLogger(),
      );

      return true;
    },
  });
}

function defaultPrefix() {
  return `[🪵 ${new Date().toISOString()}] `;
}

function logToFile(logFile: string, message: string, ...data: any[]) {
  const stringData = data
    .map((value) =>
      typeof value === 'object' ? JSON.stringify(value, null, 2) : value,
    )
    .join(' ');
  appendFileSync(logFile, `${message}: ${stringData}\n`);
}
