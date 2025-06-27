import type { Context } from 'src/core/context';
import type { NextState, State } from 'src/core/state';
import type {
  AnyFunction,
  AnyObject,
  Eval,
  FunctionKey,
  MaybePromise,
} from 'src/utils/types';

type ContextHookPayload<T extends AnyObject = {}> = Eval<
  {
    /**
     * The CLI context object.
     */
    context: Context;
  } & T
>;

type StateHookPayload<T extends AnyObject = {}> = Eval<
  {
    /**
     * The command execution state object.
     */
    state: State;
  } & T
>;

/**
 * The core hooks interface that defines lifecycle events for the CLI execution
 * process. Hooks are called in sequential order as listed below.
 * @group Hooks
 */
export interface LifecycleHooks {
  /**
   * Called before attempting to locate and import each command modules.
   *
   * Hook order: 1
   */
  beforeResolve: (
    payload: ContextHookPayload<{
      /**
       * The remaining unresolved command string.
       */
      remainingCommandString: string;

      /**
       * The directory where the next command module will be searched for.
       */
      nextCommandsDir: string;

      /**
       * Skip the default command resolution for the next command.
       */
      skip: () => void;

      /**
       * Stop the command resolution process entirely.
       */
      stopResolving: () => void;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called after resolving and importing each command module.
   *
   * Hook order: 2
   */
  afterResolve: (
    payload: ContextHookPayload<{
      /**
       * The remaining unresolved command string or `undefined` if all commands
       * have been resolved.
       */
      remainingCommandString: string | undefined;

      /**
       * The directory where the next command module will be searched for or
       * `undefined` if all commands have been resolved.
       */
      nextCommandsDir: string | undefined;

      /**
       * Whether the command resolution was skipped.
       */
      skipped: boolean;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called before parsing the command string using the options config from
   * plugins and resolved command modules.
   *
   * Hook order: 3
   */
  beforeParse: (
    payload: ContextHookPayload<{
      /**
       * Skip the parsing phase.
       */
      skip: () => void;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called after the final command string is parsed using the options
   * configuration from plugins and resolved command modules.
   *
   * Hook order: 4
   */
  afterParse: (
    payload: ContextHookPayload<{
      /**
       * Whether the command parsing was skipped.
       */
      skipped: boolean;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called before command execution begins.
   *
   * Hook order: 5
   */
  beforeExecute: (
    payload: StateHookPayload<{
      /**
       * Skip the execution phase.
       */
      skip: () => void;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called before each command's handler function.
   *
   * Hook order: 6
   */
  beforeCommand: (
    payload: StateHookPayload<{
      /**
       * Skip the command handler execution, and continue to the next
       * command in the chain if any.
       */
      skip: () => void;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called after each command's handler function.
   *
   * Hook order: 7
   */
  afterCommand: (
    payload: StateHookPayload<{
      /**
       * Whether the command handler execution was skipped.
       */
      skipped: boolean;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called before each state update during command execution.
   *
   * Hook order: 8
   */
  beforeStateChange: (
    payload: StateHookPayload<{
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
    }>,
  ) => MaybePromise<void>;

  /**
   * Called after each state update during command execution.
   *
   * Hook order: 9
   */
  afterStateChange: (
    payload: StateHookPayload<{
      /**
       * The applied state changes.
       */
      changes: Partial<NextState>;
      /**
       * Whether the state update was skipped.
       */
      skipped: boolean;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called before the {@linkcode State.end()} function is executed.
   *
   * Hook order: 10
   */
  beforeEnd: (payload: StateHookPayload) => MaybePromise<void>;

  /**
   * Called after the command execution completes, just before the result is
   * returned.
   *
   * Hook order: 11
   */
  afterExecute: (
    payload: StateHookPayload<{
      /**
       * Whether the command execution was skipped.
       */
      skipped: boolean;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called whenever a plugin or command intends to exit the process via
   * {@linkcode Context.exit()}.
   */
  beforeExit: (
    payload: ContextHookPayload<{
      /**
       * The exit code.
       */
      code: number;

      /**
       * An optional message to log.
       */
      message: any | undefined;

      /**
       * Override the exit code.
       */
      setCode: (code: number) => void;

      /**
       * Override the message to log.
       */
      setMessage: (message: string) => void;

      /**
       * Prevent the process from exiting.
       */
      cancel: () => void;
    }>,
  ) => MaybePromise<void>;

  /**
   * Called whenever an error is thrown.
   */
  beforeError: (
    payload: ContextHookPayload<{
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
    }>,
  ) => MaybePromise<void>;
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
 *  beforeRun: (payload: { command: string }) => void;
 * }>();
 *
 * hooks.on('beforeRun', ({ command }) => {
 *  console.log('Running command:', command);
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
 * @template THooks - The hooks configuration object containing the hook
 * @group Hooks
 */
export type HookHandler<
  THook extends HookName<THooks> = keyof LifecycleHooks,
  THooks extends AnyObject = LifecycleHooks,
> = THooks[THook] extends AnyFunction
  ? THooks[THook]
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
