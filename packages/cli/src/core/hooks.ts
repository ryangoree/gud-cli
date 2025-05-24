import type { Context } from 'src/core/context';
import type { OptionValues, OptionsConfig } from 'src/core/options/options';
import type { ParseCommandFn } from 'src/core/parse';
import type {
  Params,
  ResolveCommandFn,
  ResolvedCommand,
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
export interface ClideHooks {
  /**
   * 1. Initial preparation hook called before command resolution begins.
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
   * 2. Called before resolving each subcommand in the command chain
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
   * 3. Called after all commands in the chain have been resolved.
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
   * 4. Called before parsing command arguments and options.
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
   * 5. Called after command arguments and options have been parsed.
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
   * 6. Called before command execution begins.
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
   * 7. Called before each command in the chain is executed.
   *
   * @remarks This hook is triggered by both `state.next()` calls and the
   * initial `state.start()` call, which internally uses `state.next()`.
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
    setParams: (params: Params) => void;

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
   * 8. Called after each command in the chain is executed.
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
   * 9. Called before each state update during command execution.
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
   * 10. Called after each state update during command execution.
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
   * 11. Called once per execution, before the final state update, if
   *     `state.end()` is called.
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
   * 12. Called once per execution, after the final state update.
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
   * Called whenever an error is thrown.
   */
  error: (payload: {
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

  /**
   * Called whenever a plugin or command intends to exit the process via
   * `context.exit()`.
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
export class HookRegistry<THooks extends AnyObject = ClideHooks> {
  #handlers: {
    [K in HookName<THooks>]?: HookHandler<K, THooks>[];
  } = {};

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
export type HookName<THooks extends AnyObject = ClideHooks> =
  | FunctionKey<THooks>
  | (string & {});

/**
 * A handler function for a specific hook.
 * @template THook - The name of the hook being handled
 * @template T - The hooks configuration object containing the hook
 * @group Hooks
 */
type HookHandler<
  THook extends HookName<T> = keyof ClideHooks,
  T extends AnyObject = ClideHooks,
> = T[THook] extends AnyFunction
  ? T[THook]
  : (payload?: unknown) => MaybePromise<void>;

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
  THook extends HookName<T> = keyof ClideHooks,
  T extends AnyObject = ClideHooks,
> = Parameters<HookHandler<THook, T>>[0];
