import type { CommandModule } from 'src/core/command';
import type { Context } from 'src/core/context';
import { CliError } from 'src/core/errors';
import type { OptionValues, OptionsConfig } from 'src/core/options/options';
import {
  type OptionsGetter,
  createOptionsGetter,
} from 'src/core/options/options-getter';
import type { ResolvedCommand, RouteParams } from 'src/core/resolve';

// Types //

/**
 * A partial state object containing only the properties that can be modified
 * during a state transition, used to pass state changes to hooks.
 * @group State
 */
export interface NextState {
  i?: number;
  data?: unknown;
  params?: RouteParams;
  options?: OptionValues;
}

// Classes + Class Types //

interface StateParams<TData = unknown> {
  /**
   *  The context for the command.
   */
  context: Context;

  /**
   *  The initial data for the steps.
   */
  initialData?: TData;

  /**
   * The commands to execute. If not provided, it defaults to the commands
   * resolved from the context.
   */
  commands?: ResolvedCommand[];

  /**
   * The options config to use when creating the options getter. If not
   * provided, it defaults to the options config from the context.
   */
  options?: OptionsConfig;

  /**
   * The option values to use when creating the options getter. If not provided,
   * it defaults to the parsed options from the context.
   */
  optionValues?: OptionValues;
}

/**
 * Execution state management.
 *
 * The `State` is responsible for managing the state of command execution. It
 * provides mechanisms to progress through command execution, handle state
 * transitions, and manage the lifecycle of command data.
 *
 * @group State
 */
export class State<
  TData = unknown,
  TOptions extends OptionsConfig = OptionsConfig,
> {
  /**
   * The number of times `next()` or `end()` have been called. This is used to
   * prevent the process from hanging if a command handler neglects to call
   * `next()` or `end()`. If the action call count doesn't align with the
   * expected count based on the number of steps, the next step will be called
   * automatically.
   */
  #actionCallCount = 0;
  #context: Context;
  #data: unknown;
  #i = -1;
  #commands: ResolvedCommand[];
  #options: OptionsGetter;
  #params: RouteParams = {};

  /**
   * A promise that resolves when the steps are done. This is useful for
   * ensuring that all steps have completed without requiring each handler to
   * worry about awaiting the next step or returning a promise.
   */
  #executionPromise: Promise<void> | undefined;

  /**
   *  A function that resolves the promise when called.
   */
  #resolvePromise: (() => void) | undefined;

  constructor({
    context,
    initialData,
    commands,
    options = context.options,
    optionValues = context.parsedOptions,
  }: StateParams<TData>) {
    this.#context = context;
    this.#data = initialData as TData;
    this.#commands = commands || context.resolvedCommands;

    // Create a getter to dynamically get the options from context.
    this.#options = createOptionsGetter({
      client: context.client,
      optionsConfig: options,
      optionValues: optionValues,
      onPromptCancel: context.exit,
    });
  }

  /**
   * The current step/command index within the command chain.
   */
  get i() {
    return this.#i;
  }

  /**
   * Information about the current command module being executed.
   */
  get command() {
    return this.commands[this.i];
  }

  /**
   * Information about all command modules loaded for the current execution.
   */
  get commands() {
    return this.#commands;
  }

  /**
   * Runtime and configuration context for the command execution.
   */
  get context() {
    return this.#context;
  }

  /**
   * The current data being passed between steps which will be returned after
   * the last step or when {@linkcode end end(data)} is called.
   */
  get data() {
    return this.#data as TData;
  }

  /**
   * Resolved route parameters from parameterized filenames, e.g., `id` from
   * `commands/get/[id].ts`.
   */
  get params() {
    return this.#params;
  }

  /**
   * An {@linkcode OptionsGetter} to dynamically retrieve options.
   */
  get options() {
    return this.#options as OptionsGetter<TOptions>;
  }

  /**
   * A client that wraps the Node.js console and provides additional methods for
   * logging, error handling, and user prompts.
   */
  get client() {
    return this.context.client;
  }

  /**
   * Start the steps.
   * @throws {CliError} If the steps have already started.
   * @returns A promise that resolves when the steps are done.
   */
  readonly start = async (initialData: unknown = this.#data): Promise<void> => {
    // Avoid starting the steps if they're already started.
    if (this.#executionPromise) {
      throw new CliError('Steps have already started.');
    }

    // Create a promise that will resolve when the steps are done.
    this.#executionPromise = new Promise((resolve) => {
      this.#resolvePromise = resolve;
    });

    // Start the steps.
    await this.next(initialData);

    // Return the promise so that the caller can wait for the steps to complete.
    return this.#executionPromise.then(() => {
      // Reset the promise and resolve function so that the steps can be started
      // again.
      this.#executionPromise = undefined;
      this.#resolvePromise = undefined;
    });
  };

  /**
   * Continue to the next step in the command chain or end the steps if there
   * are no more steps.
   * @param data - The data to pass to the next step. If not provided, the
   * current data will be used.
   * @returns The data from the last command.
   */
  readonly next = async (data = this.#data): Promise<unknown> => {
    this.#actionCallCount++;
    let _data = data;
    const nextIndex = this.i + 1;
    let nextCommand = this.commands[nextIndex] as ResolvedCommand | undefined;

    if (nextCommand) {
      await this.context.hooks.call('beforeCommand', {
        state: this,
        command: nextCommand,
        data: _data,
        params: this.params,
        setData: (data) => {
          _data = data;
        },
        setParams: (params) => {
          this.#params = params;
        },
        setCommand: (command) => {
          nextCommand = command;
        },
      });

      // If there is a next command, increment the step index and call the
      // command handler.
      await this.#applyState({
        data: _data,
        i: nextIndex,
        // Merge params from previous steps with params from the next command.
        params: {
          ...this.params,
          ...nextCommand.params,
        },
      });

      const actionCallCountBefore = this.#actionCallCount;
      await nextCommand.command.handler(this);

      await this.context.hooks.call('afterCommand', {
        state: this,
        command: nextCommand,
        data: _data,
        setData: (data) => {
          _data = data;
        },
      });

      // Prevent the process from hanging if a command handler neglects to call
      // `next()` or `end()` by checking if the action call count has changed.
      if (this.#actionCallCount === actionCallCountBefore) {
        await this.next(_data);
      }
    } else {
      // If there is no next command, end the steps.
      await this.#applyState({
        data: _data,
      });

      // Resolve the promise to return the data to callers of `start()`.
      this.#resolvePromise?.();
    }

    return this.#data;
  };

  /**
   * End execution, skipping any remaining steps, and return the current or
   * provided data.
   * @param data The data to return. Defaults to the current data.
   * @returns The data from the last command.
   */
  readonly end = async (
    data = this.#data,
    // endOptions: EndOptions = {},
  ): Promise<unknown> => {
    this.#actionCallCount++;
    let _data = data;

    await this.context.hooks.call('beforeEnd', {
      state: this,
      data,
      setData: (data) => {
        _data = data;
      },
    });

    // TODO: Re-think this. It could be implemented as a plugin/hook.
    // const nextCommand = this.commands[this.i + 1] as
    //   | ResolvedCommand
    //   | undefined;

    // if (nextCommand && (endOptions.warning || endOptions.error)) {
    //   if (endOptions.warning) {
    //     this.context.client.warn(endOptions.warning);
    //   }
    //   if (endOptions.error) {
    //     throw new UsageError(endOptions.error);
    //   }

    //   this.context.client.warn(
    //     'Ending prematurely, remaining steps will be skipped.',
    //   );
    // }

    await this.#applyState({
      data: _data,
      i: this.commands.length - 1,
    });

    // Resolve the promise to return the data to callers of `start()`.
    if (this.#resolvePromise) {
      this.#resolvePromise();
    }

    return this.#data;
  };

  /**
   * Fork the state and execute a new set of commands with the same context.
   * @returns The data from the last command.
   */
  readonly fork = async <TCommand extends CommandModule<any, any, any>>({
    commands,
    initialData = this.#data,
    optionValues,
    paramValues,
  }: {
    /**
     * The commands to execute.
     */
    commands: (TCommand | ResolvedCommand)[];

    /**
     * The initial data to pass to the forked state. If not provided, the
     * current data will be used.
     */
    initialData?: unknown;

    /**
     * Options to merge/override the current options.
     */
    optionValues?: OptionValues<
      TCommand['options'] extends OptionsConfig
        ? TCommand['options']
        : OptionsConfig
    >;

    /**
     * Parameters to merge/override the current parameters.
     */
    // TODO: strict type for paramValues
    paramValues?: RouteParams;
  }) => {
    const resolvedCommands: ResolvedCommand[] = [];
    const resolvedCommandsOptions: OptionsConfig = {};

    for (const command of commands) {
      let resolved: ResolvedCommand | undefined;

      if ('command' in command) {
        resolved = command;
      } else {
        resolved = {
          command,
          commandName: 'fork-command',
          remainingCommandString: '',
          commandPath: '',
          commandTokens: [],
          subcommandsDir: '',
          params: {
            ...this.params,
            ...paramValues,
          },
        };
      }

      Object.assign(resolvedCommandsOptions, resolved.command.options);
      resolvedCommands.push(resolved);
    }

    // Create a new state for the invocation
    const state = new State({
      context: this.context,
      initialData: initialData,
      commands: resolvedCommands,
      options: {
        ...this.context.options,
        ...resolvedCommandsOptions,
      },
      optionValues: this.options.values,
    });

    // Override options with the provided values
    if (optionValues) {
      for (const [key, value] of Object.entries(optionValues)) {
        state.options.set(key, value);
      }
    }

    await state.start(initialData);
    return state.data;
  };

  /**
   * Set new state values.
   * @param nextState The next state values to set.
   */
  // Should be called every state change.
  async #applyState(nextState: Partial<NextState>) {
    let _changes = nextState;

    // pre hook
    await this.context.hooks.call('beforeStateChange', {
      state: this,
      changes: _changes,
      setChanges: (changes: Partial<NextState>) => {
        _changes = changes;
      },
      skip: () => {
        this.context.client.warn(
          `Skipping state update. Next state: ${JSON.stringify(
            _changes,
            null,
            2,
          )}`,
        );
        _changes = {};
      },
    });

    // Set new state values if defined.
    if (_changes.i !== undefined) {
      this.#i = _changes.i;
    }
    if (_changes.params !== undefined) {
      this.#params = _changes.params;
    }
    if (_changes.options !== undefined) {
      Object.assign(this.#options.values, _changes.options);
    }

    // Data can be undefined, so we simply check if the key exists.
    if ('data' in _changes) {
      this.#data = _changes.data as TData;
    }

    // post hook
    await this.context.hooks.call('afterStateChange', {
      state: this,
      changes: _changes,
    });
  }
}

// export interface EndOptions {
//   warning?: string;
//   error?: string;
// }
