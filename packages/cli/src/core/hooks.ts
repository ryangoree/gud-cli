import type { Context } from 'src/core/context';
import type { OptionValues, OptionsConfig } from 'src/core/options/options';
import type { ParseCommandFn } from 'src/core/parse';
import type {
  ResolveCommandFn,
  ResolvedCommand,
  RouteParams,
} from 'src/core/resolve';
import type { NextState, State } from 'src/core/state';
import type {
  AnyFunction,
  AnyObject,
  FunctionKey,
  MaybePromise,
} from 'src/utils/types';

/**
 * The core hooks interface that defines lifecycle events for the CLI execution
 * process. Hooks are called in sequential order as listed below.
 * @group Hooks
 */
export interface LifecycleHooks {
  /**
   * Called before attempting to locate and import command modules.
   *
   * Hook order: 1
   */
  beforeResolve: (payload: {
    /**
     *  The raw command string input to the CLI
     */
    commandString: string;

    /**
     *  The root directory containing command implementations
     */
    commandsDir: string;

    /**
     * Replace the configured command resolution function
     * @param resolveFn - Custom resolution function implementation
     */
    setResolveFn: (resolveFn: ResolveCommandFn) => void;

    /**
     * Replace the configured command parsing function
     * @param parseFn - Custom parsing function implementation
     */
    setParseFn: (parseFn: ParseCommandFn) => void;

    /**
     * Register additional resolved commands
     * @param resolvedCommands - Array of resolved command objects to add
     */
    addResolvedCommands: (resolvedCommands: ResolvedCommand[]) => void;

    /**
     *  Skip the command resolution phase
     */
    skip: () => void;

    /**
     *  The CLI context object
     */
    context: Context;
  }) => MaybePromise<void>;

  /**
   * Called before attempting to locate and import each subcommand module.
   *
   * Hook order: 2
   */
  beforeResolveNext: (payload: {
    /**
     *  The remaining unresolved portion of the command string
     */
    commandString: string;

    /**
     *  The directory containing subcommand implementations
     */
    commandsDir: string;

    /**
     *  The previously resolved command in the chain
     */
    lastResolved: ResolvedCommand;

    /**
     * Replace the configured command resolution function
     * @param resolveFn - Custom resolution function implementation
     */
    setResolveFn: (resolveFn: ResolveCommandFn) => void;

    /**
     * Replace the configured command parsing function
     * @param parseFn - Custom parsing function implementation
     */
    setParseFn: (parseFn: ParseCommandFn) => void;

    /**
     * Register additional resolved commands.
     * @param resolvedCommands - Array of resolved command objects to add
     */
    addResolvedCommands: (resolvedCommands: ResolvedCommand[]) => void;

    /**
     *  Skip resolving this subcommand
     */
    skip: () => void;

    /**
     *  The CLI context object
     */
    context: Context;
  }) => MaybePromise<void>;

  /**
   * Called after resolving and importing command modules.
   *
   * Hook order: 3
   */
  afterResolve: (payload: {
    /**
     * The complete array of resolved command objects.
     */
    resolvedCommands: ResolvedCommand[];

    /**
     * Register additional resolved commands.
     * @param resolvedCommands - Array of resolved command objects to add.
     *
     * @remarks
     * Options configurations are merged into the context immediately after each
     * command is resolved to maintain context consistency in the
     * {@linkcode beforeResolveNext} hook. Due to this, resolved commands can
     * only be added, not replaced. To replace resolved commands entirely, use
     * the {@linkcode beforeResolve} hook instead.
     */
    addResolvedCommands: (resolvedCommands: ResolvedCommand[]) => void;

    /**
     * The CLI context object.
     */
    context: Context;
  }) => MaybePromise<void>;

  /**
   * Called before parsing the command string using the options config from
   * plugins and resolved command modules.
   *
   * Hook order: 4
   *
   * @remarks
   * The command string will be parsed multiple times during a command string's
   * execution. After each command module is resolved and imported, the string
   * will be re-parsed *without* validation to determine the next token in the
   * command string that represents the next command or subcommand. The parse
   * hooks will *not* be called during this phase.
   *
   * After all commands are resolved, the command string will be parsed again,
   * this time *with* validation using the options config from all plugins and
   * resolved commands. This is when the the `beforeParse` hook is called.
   *
   */
  beforeParse: (payload: {
    /**
     * The raw command input (string or array format).
     */
    commandString: string | string[];

    /**
     * The consolidated options configuration from all plugins and resolved
     * commands.
     */
    optionsConfig: OptionsConfig;

    /**
     * Replace the configured parsing function.
     * @param parseFn - Custom parsing function implementation.
     */
    setParseFn: (parseFn: ParseCommandFn) => void;

    /**
     * Set parsed options directly and skip the parsing phase.
     * @param optionValues - Pre-parsed option values.
     */
    setParsedOptionsAndSkip: (optionValues: OptionValues) => void;

    /**
     * Skip the parsing phase.
     */
    skip: () => void;

    /**
     * The CLI context object.
     */
    context: Context;
  }) => MaybePromise<void>;

  /**
   * Called after the final command string is parsed using the options
   * configuration from plugins and resolved command modules.
   *
   * Hook order: 5
   */
  afterParse: (payload: {
    /**
     * The parsed command options and arguments.
     */
    parsedOptions: OptionValues;

    /**
     * Override the parsed results
     * @param optionValues - New option values to use
     */
    setParsedOptions: (optionValues: OptionValues) => void;

    /**
     * The CLI context object.
     */
    context: Context;
  }) => MaybePromise<void>;

  /**
   * Called before command execution begins.
   *
   * Hook order: 6
   */
  beforeExecute: (payload: {
    /**
     * The initial state data.
     */
    initialData: unknown;

    /**
     * The command execution state object.
     */
    state: State;

    /**
     * Set final result and skip execution.
     */
    setResultAndSkip: (result: unknown) => void;

    /**
     * Override the initial state data
     * @param data - New initial data
     */
    setInitialData: (data: unknown) => void;

    /**
     * Skip the execution phase.
     */
    skip: () => void;
  }) => MaybePromise<void>;

  /**
   * Called before each command's handler function.
   *
   * Hook order: 7
   */
  beforeCommand: (payload: {
    /**
     * The command execution state object.
     */
    state: State;

    /**
     * The data that will be passed to the command.
     */
    data: unknown;

    /**
     * Override the data for the command.
     * @param data - New data to pass.
     */
    setData: (data: unknown) => void;

    /**
     * The params that will be passed to the command.
     */
    params: unknown;

    /**
     * Override the params for the command, fully replacing the existing params.
     * @param params - New params to pass.
     */
    setParams: (params: RouteParams) => void;

    /**
     * The command to be executed.
     */
    command: ResolvedCommand;

    /**
     * Override the command.
     * @param command - New command to execute.
     */
    setCommand: (command: ResolvedCommand) => void;
  }) => MaybePromise<void>;

  /**
   * Called after each command's handler function.
   *
   * Hook order: 8
   */
  afterCommand: (payload: {
    /**
     * The command execution state object.
     */
    state: State;

    /**
     * The data returned from the command.
     */
    data: unknown;

    /**
     * Override the data returned from the command.
     * @param data - New data to return.
     */
    setData: (data: unknown) => void;

    /**
     * The command that was executed.
     */
    command: ResolvedCommand;
  }) => MaybePromise<void>;

  /**
   * Called before each state update during command execution.
   *
   * Hook order: 9
   */
  beforeStateChange: (payload: {
    /**
     * The command execution state object.
     */
    state: State;

    /**
     * The pending state changes.
     */
    changes: Partial<NextState>;

    /**
     * Override the pending state changes.
     * @param changes - New state changes to apply.
     */
    setChanges: (changes: Partial<NextState>) => void;

    /**
     * Skip the state update.
     */
    skip: () => void;
  }) => MaybePromise<void>;

  /**
   * Called after each state update during command execution.
   *
   * Hook order: 10
   */
  afterStateChange: (payload: {
    /**
     * The command execution state object.
     */
    state: State;

    /**
     * The applied state changes.
     */
    changes: Partial<NextState>;
  }) => MaybePromise<void>;

  /**
   * Called before the {@linkcode State.end()} function is executed.
   *
   * Hook order: 11
   */
  beforeEnd: (payload: {
    /**
     * The command execution state object.
     */
    state: State;

    /**
     * The data that will be returned.
     */
    data: unknown;

    /**
     * Override the return data.
     * @param data - New data to return.
     */
    setData: (data: unknown) => void;
  }) => MaybePromise<void>;

  /**
   * Called after the command execution completes, just before the result is
   * returned.
   *
   * Hook order: 12
   */
  afterExecute: (payload: {
    /**
     * The command execution state object.
     */
    state: State;

    /**
     * The final result.
     */
    result: unknown;

    /**
     * Override the final result.
     * @param result - New result to use.
     */
    setResult: (result: unknown) => void;
  }) => MaybePromise<void>;

  /**
   * Called whenever a plugin or command intends to exit the process via
   * {@linkcode Context.exit()}.
   */
  beforeExit: (payload: {
    /**
     * The CLI context object.
     */
    context: Context;

    /**
     * The exit code.
     */
    code: number;

    /**
     * An optional message to log.
     */
    message?: any;

    /**
     * Override the exit code.
     * @param code - New exit code to use.
     */
    setCode: (code: number) => void;

    /**
     * Override the message to log.
     * @param message - New message to log.
     */
    setMessage: (message: any) => void;

    /**
     * Prevent the process from exiting.
     */
    cancel: () => void;
  }) => MaybePromise<void>;

  /**
   * Called whenever an error is thrown.
   */
  beforeError: (payload: {
    /**
     * The CLI context object.
     */
    context: Context;

    /**
     * The error that was thrown.
     */
    error: unknown;

    /**
     * Override the error that will be thrown.
     * @param error - New error to throw.
     */
    setError: (error: unknown) => void;

    /**
     * Prevent the error from being thrown.
     */
    ignore: () => void;
  }) => MaybePromise<void>;
}

/**
 * A registry for managing and executing hook handlers. Handlers are executed
 * sequentially in registration order.
 * @typeParam THooks - An object that maps hook names to their corresponding
 * handler function types. The handler function type should accept a single
 * payload argument.
 *
 * @example
 * ```ts
 * const hooks = new HookRegistry<{
 *   beforeRun: (payload: { command: string }) => void;
 * }>();
 *
 * hooks.on('beforeRun', ({ command }) => {
 *   console.log('Running command:', command);
 * });
 *
 * hooks.call('beforeRun', { command: 'foo bar' }); // -> 'Running command: foo bar'
 * ```
 */
export class HookRegistry<THooks extends AnyObject = LifecycleHooks> {
  #handlers: HookHandlers<THooks> = {};

  constructor(initialHandlers?: Partial<THooks>) {
    if (initialHandlers) {
      // Wrap initial handlers in arrays.
      this.#handlers = Object.fromEntries(
        Object.entries(initialHandlers).map(([hook, handler]) => [
          hook,
          [handler],
        ]),
      ) as HookHandlers<THooks>;
    }
  }

  /**
   * Register a handler for a hook.
   * @param hook - The hook to handle.
   * @param handler - The function to execute when the hook is called.
   */
  on<THook extends HookName<THooks>>(
    hook: THook,
    handler: HookHandler<THook, THooks>,
  ): void {
    this.#handlers[hook] ||= [];
    this.#handlers[hook].push(handler);
  }

  /**
   * Remove a previously registered handler.
   * @param hook - The hook to remove the handler from.
   * @param handler - The handler function to remove.
   * @returns A boolean indicating whether the handler was found and removed.
   */
  off<THook extends HookName<THooks>>(
    hook: THook,
    handler: HookHandler<THook, THooks>,
  ): boolean {
    let didRemove = false;
    const handlers = this.#handlers[hook];
    if (!handlers) return didRemove;
    this.#handlers[hook] = handlers.filter((existing) => {
      if (existing === handler) {
        didRemove = true;
        return false;
      }
      return true;
    });

    return didRemove;
  }

  /**
   * Register a one-time handler that removes itself on execution.
   * @param hook - The hook to handle once.
   * @param handler - The function to execute once when the hook is called.
   */
  once<THook extends HookName<THooks>>(
    hook: THook,
    handler: HookHandler<THook, THooks>,
  ): void {
    const wrapped = (...args: unknown[]) => {
      this.off(hook, wrapped as HookHandler<THook, THooks>);
      handler(...args);
    };
    this.on(hook, wrapped as HookHandler<THook, THooks>);
  }

  /**
   * Call all handlers registered for a hook. Handlers are called sequentially
   * in registration order.
   * @param hook - The hook to call.
   * @param args - The args to pass to each handler.
   */
  async call<THook extends HookName<THooks>>(
    hook: THook,
    ...args: Parameters<HookHandler<THook, THooks>>
  ): Promise<void> {
    const handlers = this.#handlers[hook];
    if (!handlers) return;
    for (const handler of handlers) {
      await handler(...args);
    }
  }
}

/**
 * Represents a possible hook name given a hooks configuration object.
 * @group Hooks
 */
export type HookName<THooks extends AnyObject = LifecycleHooks> =
  | FunctionKey<THooks>
  | (string & {});

/**
 * A handler function for a specific hook.
 * @template THook - The name of the hook being handled
 * @template T - The hooks configuration object containing the hook
 * @group Hooks
 */
export type HookHandler<
  THook extends HookName<T> = keyof LifecycleHooks,
  T extends AnyObject = LifecycleHooks,
> = T[THook] extends AnyFunction
  ? T[THook]
  : (payload?: unknown) => MaybePromise<void>;

/**
 * A collection of handlers for each hook in a hooks configuration object.
 * @template THooks - The hooks configuration object containing the hooks
 * @group Hooks
 */
export type HookHandlers<THooks extends AnyObject = LifecycleHooks> = {
  [K in HookName<THooks>]?: HookHandler<K, THooks>[];
};

/**
 * The payload object passed to a hook handler.
 *
 * By convention, the payload will be the first argument of the hook, but this
 * may not always be the case for custom hooks at runtime
 *
 * @template THook - The name of the hook being handled
 * @template T - The hooks configuration object containing the hook
 * @group Hooks
 */
export type HookPayload<
  THook extends HookName<T> = keyof LifecycleHooks,
  T extends AnyObject = LifecycleHooks,
> = Parameters<HookHandler<THook, T>>[0];
