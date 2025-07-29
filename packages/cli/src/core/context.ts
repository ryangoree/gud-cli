import { Client } from 'src/core/client';
import { CliError, type CliErrorOptions, UsageError } from 'src/core/errors';
import { HookRegistry } from 'src/core/hooks';
import type { OptionValues, OptionsConfig } from 'src/core/options/options';
import {
  type ValidateOptionsParams,
  validateOptions,
} from 'src/core/options/validate-options';
import { type ParseCommandFn, parseCommand } from 'src/core/parse';
import type { Plugin, PluginInfo } from 'src/core/plugin';
import {
  type ResolveCommandFn,
  type ResolvedCommand,
  resolveCommand,
} from 'src/core/resolve';
import { State } from 'src/core/state';

// Errors //

/**
 * An error indicating a required subcommand is missing.
 * @group Errors
 */
export class SubcommandRequiredError extends UsageError {
  constructor(commandString: string, options?: CliErrorOptions) {
    super(`Subcommand required for command "${commandString}".`, {
      name: 'SubcommandRequiredError',
      ...options,
    });
  }
}

// Classes + Class Types //

/**
 * Params for creating a new {@linkcode Context} instance.
 * @group Context
 */
export interface ContextParams<TOptions extends OptionsConfig = OptionsConfig> {
  /*
   * The command string to be executed
   */
  commandString: string;

  /*
   * The path to the directory containing command modules
   */
  commandsDir: string;

  /**
   * The client instance to use for logging and user interaction.
   * @default new Client()
   */
  client?: Client;

  /**
   * The hooks emitter
   */
  hooks?: HookRegistry;

  /**
   * A list of plugins to load
   */
  plugins?: Plugin[];

  /**
   * The options config for the command
   */
  options?: TOptions;

  /*
   * An optional function to replace the default command resolver
   */
  resolveFn?: ResolveCommandFn;

  /*
   * An optional function to replace the default command parser
   */
  parseFn?: ParseCommandFn;
}

/**
 * The context for a command execution.
 *
 * The `Context` serves as the orchestrator for the entire command lifecycle. It
 * is responsible for initializing the CLI environment, resolving commands,
 * parsing options, and managing execution flow. It ensures that all aspects of
 * the CLI are prepared and ready before any action is taken, establishing a
 * predictable and stable execution environment.
 *
 * Philosophy:
 * - Immutable Configuration: Once the context is prepared, its configuration
 *   should not change. This immutability guarantees consistency throughout the
 *   CLI's operation and avoids side effects that could arise from dynamic
 *   changes in the environment.
 * - Explicit Lifecycle Management: By clearly defining lifecycle hooks and
 *   preparation stages, `Context` offers explicit control over the command
 *   execution process, allowing for extensibility and customization without
 *   sacrificing predictability.
 * - Separation of Concerns: `Context` focuses on the setup and execution
 *   environment, while {@linkcode State} manages the actual progression and
 *   state changes during command execution. This separation ensures that each
 *   module only handles its designated responsibilities, making the system
 *   easier to maintain and extend.
 * - Fail-fast Philosophy: The context should catch and handle errors as early
 *   as possible (during the preparation phase), ensuring that execution only
 *   proceeds when all systems are nominal. The exception to this rule is option
 *   validation, which is performed dynamically when options are accessed during
 *   execution. This is done to give command handlers the ability to gracefully
 *   handle missing or invalid options and potentially prompt the user for the
 *   missing information.
 *
 * Scope:
 * - Plugin Initialization: Loading and preparing all plugins for the execution
 *   cycle.
 * - Command Resolution: Determining the sequence of command modules to be
 *   executed based on the input string.
 * - Option Parsing: Interpreting command-line arguments and flags into a
 *   structured format for consumption by commands.
 * - Execution Readiness: Ensuring that the context has been fully prepared
 *   before allowing the execution to proceed.
 * - Error Management: Providing a centralized mechanism for error handling
 *   during the preparation and execution phases.
 * - Exit Management: Providing a centralized mechanism for exiting the CLI.
 *
 * @group Context
 */
export class Context<TOptions extends OptionsConfig = OptionsConfig> {
  /*
   * The command string to be executed.
   */
  readonly commandString: string;

  /*
   * The path to the directory containing command modules.
   */
  readonly commandsDir: string;

  /**
   * The client instance used for logging and user interaction.
   */
  readonly client: Client;

  /**
   * The hooks emitter.
   */
  readonly hooks: HookRegistry;

  /**
   * Metadata about the plugins that will be used during preparation and
   * execution.
   */
  readonly plugins: {
    [name: string]: PluginInfo & {
      isReady: boolean;
    };
  };

  #plugins: Plugin[];
  #options: TOptions;

  #isParsed = false;
  #parseFn: ParseCommandFn;
  #optionValues: OptionValues = {};

  #isResolved = false;
  #resolveFn: ResolveCommandFn;
  #commandQueue: ResolvedCommand[] = [];

  #isReady = false;
  #result: unknown;

  constructor({
    commandString,
    commandsDir,
    hooks = new HookRegistry(),
    client = new Client(),
    plugins = [],
    options = {} as TOptions,
    resolveFn = resolveCommand,
    parseFn = parseCommand,
  }: ContextParams<TOptions>) {
    this.commandString = commandString;
    this.commandsDir = commandsDir;
    this.client = client;
    this.hooks = hooks;
    this.plugins = Object.freeze(
      Object.fromEntries(
        plugins.map(({ name, version, description, meta }) => [
          name,
          { name, version, description, meta, isReady: false },
        ]),
      ),
    );
    this.#plugins = plugins;
    this.#options = options as TOptions;
    this.#parseFn = parseFn;
    this.#resolveFn = resolveFn;
  }

  // Static Methods //

  /**
   * Create a new `Context` instance and automatically prep it for execution.
   */
  static async prepare(options: ContextParams) {
    const context = new Context(options);
    await context.prepare();
    return context;
  }

  // Getters //

  /*
   * The options config for the command.
   */
  get options() {
    return this.#options;
  }

  /*
   * A list of the resolved commands to be executed in order.
   */
  get commandQueue() {
    return this.#commandQueue;
  }

  /*
   * The parsed option values for the command.
   */
  get optionValues() {
    return this.#optionValues;
  }

  /*
   * The result of the most recent execution.
   */
  get result() {
    return this.#result;
  }

  // Methods //

  /**
   * Prepare the plugins for execution by calling their initialization
   * functions, if defined.
   *
   * @remarks This method is idempotent. It will only call the initialization
   * functions of plugins that have not been marked as ready.
   */
  async preparePlugins() {
    try {
      for (const { name, init } of this.#plugins) {
        const info = this.plugins[name];
        if (!info || info.isReady) continue;
        await init?.(this);
        info.isReady = true;
        Object.freeze(info);
      }
    } catch (error) {
      await this.throw(error);
    }
  }

  /**
   * Prepare the context for execution.
   *
   * 1. Initialize plugins
   * 2. Resolve the command string into a list of imported command modules
   * 3. Parse the command string with the final options config from plugins and
   *    commands
   * 5. Mark the context as ready
   *
   * @remarks This method is idempotent.
   */
  async prepare() {
    if (this.#isReady) return;

    try {
      // 1. Initialize plugins
      await this.preparePlugins();

      // 2. Resolve the command string into a list of imported command modules
      await this.#resolveWithHooks();

      // 3. Parse the command string with the final options config from plugins
      //    and resolved commands
      await this.#parseWithHooks();
    } catch (error) {
      await this.throw(error);
    }

    // Mark the context as ready
    this.#isReady = true;
  }

  // Note: The following methods are defined as arrow functions to ensure that
  // they are bound to the context instance. This is necessary to allow them to
  // be passed as callbacks to hooks and other functions while maintaining the
  // correct `this` context.

  /**
   * Set the options config for the context, merging it with the existing
   * options config. Typically, this is done by plugins during initialization.
   * @param options - The options config to be merged with the context's options
   * config.
   */
  readonly setOptions = (options: OptionsConfig) => {
    Object.assign(this.#options, options);
  };

  readonly setOptionValues = (optionValues: OptionValues) => {
    Object.assign(this.#optionValues, optionValues);
  };

  /**
   * Append to the list of resolved commands to be executed.
   */
  readonly enqueueCommand = (resolvedCommands: ResolvedCommand[]) => {
    for (const resolved of resolvedCommands) {
      this.#commandQueue.push(resolved);
      if (resolved.command.options) {
        this.setOptions(resolved.command.options);
      }
    }
  };

  /**
   * Resolve the first command module from a command string using the configured
   * `resolveFn` and `parseFn`.
   *
   * This function has no side effects and is simply a wrapper around the
   * configured `resolveFn` and `parseFn`.
   *
   * @param commandString - The command string to be resolved. Defaults to the
   * context's command string.
   * @param commandsDir - The path to the directory containing command modules.
   * Defaults to the context's commands directory.
   * @returns A `ResolvedCommand` object.
   */
  readonly resolveCommand = (
    commandString = this.commandString,
    commandsDir = this.commandsDir,
  ) => {
    return this.#resolveFn({
      commandString,
      commandsDir,
      parseFn: this.#parseFn,
    });
  };

  /**
   * Parse a command string into a structured object using the configured
   * `parseFn` and the context's options config.
   *
   * This function has no side effects and is simply a wrapper around the
   * configured `parseFn` and options config.
   *
   * @param commandString - The command string to be parsed. Defaults to the
   * context's command string.
   * @param optionsConfig - Additional options config to be merged with the
   * context's options config.
   * @returns A `ParsedCommand` object containing the parsed command tokens and
   * option values.
   */
  readonly parseCommand = (
    commandString: string = this.commandString,
    optionsConfig: OptionsConfig = this.options,
  ) => {
    const parsed = this.#parseFn(commandString, {
      ...this.options,
      ...optionsConfig,
    });

    const validationParams: ValidateOptionsParams = {
      values: {},
      config: optionsConfig,
      validations: {
        conflicts: true,
        requires: true,
      },
    };

    // Validate after resolution if a promise is returned.
    if (parsed instanceof Promise) {
      return parsed.then((result) => {
        validateOptions({
          ...validationParams,
          values: result.options,
        });
        return result;
      });
    }

    validateOptions({
      ...validationParams,
      values: parsed.options,
    });

    return parsed;
  };

  // Hooked Methods //

  /**
   * Execute the context's command string.
   *
   * This function will override the context's result with the result of the
   * final command in the chain each time it is called.
   *
   * @param initialData - Optional data to be passed to the first command in the
   * chain.
   */
  readonly execute = async (initialData?: any) => {
    // Create a new state for each execution
    const state = new State({
      context: this,
      initialData,
    });

    let skipped = false;
    let result = initialData;

    await this.hooks.call('beforeExecute', {
      state,
      initialData,
      setInitialData: (newData) => {
        initialData = newData;
        result = newData;
      },
      setResultAndSkip: (newResult) => {
        result = newResult;
        skipped = true;
      },
      skip: () => {
        skipped = true;
      },
    });

    // Ensure the context is ready before proceeding
    if (!skipped && !this.#isReady) {
      // this.throw must be awaited since it could be ignored by an async hook
      await this.throw(
        new CliError("Context isn't ready. Did you forget to call prepare()?"),
      );
    }

    // If the command wasn't skipped, begin execution
    if (!skipped) {
      try {
        await state.start(initialData);
        result = state.data;
      } catch (error) {
        await this.throw(error);
      }
    }

    await this.hooks.call('afterExecute', {
      result,
      state,
      setResult: (newResult) => {
        result = newResult;
      },
    });

    this.#result = result;
    return result;
  };

  /**
   * Throw an error, allowing hooks to modify the error or ignore it.
   * @param error - The error to be thrown.
   */
  readonly throw = async (error: unknown) => {
    let ignore = false;

    await this.hooks.call('beforeError', {
      context: this,
      error,
      setError: (newError) => {
        error = newError;
      },
      ignore: () => {
        ignore = true;
      },
    });

    if (!ignore) throw error;
  };

  /**
   * Exit the CLI with an optional exit code and message.
   * @param code - The exit code. Defaults to 0.
   * @param message - The message to be displayed before exiting.
   */
  readonly exit = async (code = 0, message?: any) => {
    let cancel = false;

    await this.hooks.call('beforeExit', {
      context: this,
      code,
      message,
      setCode: (newCode) => {
        code = newCode;
      },
      setMessage: (newMessage) => {
        message = newMessage;
      },
      cancel: () => {
        cancel = true;
      },
    });

    if (!cancel) {
      if (message) {
        if (code === 0) this.client.log(message);
        else this.client.error(message);
      }
      process.exit(code);
    }
  };

  /**
   * Resolve the command string into a list of imported command modules, setting
   * the context's `resolvedCommands` property.
   *
   * @remarks This method is idempotent.
   */
  async #resolveWithHooks() {
    if (this.#isResolved) return;
    let pendingCommand: ResolvedCommand | undefined;
    let skipped = false;

    await this.hooks.call('beforeResolve', {
      context: this,
      commandString: this.commandString,
      commandsDir: this.commandsDir,
      setResolveFn: (resolveFn) => {
        this.#resolveFn = resolveFn;
      },
      setParseFn: (parseFn) => {
        this.#parseFn = parseFn;
      },
      addResolvedCommands: (resolvedCommands) => {
        pendingCommand = resolvedCommands.pop();
        this.enqueueCommand(resolvedCommands);
      },
      skip: () => {
        skipped = true;
      },
    });

    // Only resolve if the hook didn't skip
    if (!skipped) {
      pendingCommand = await this.resolveCommand();
    }

    // Continue resolving until the last command is reached or the
    // `beforeResolveNext` hook skips
    while (pendingCommand) {
      this.#commandQueue.push(pendingCommand);
      if (pendingCommand.command.options) {
        this.setOptions(pendingCommand.command.options);
      }

      if (!pendingCommand.remainingCommandString) break;

      await this.hooks.call('beforeResolveNext', {
        context: this,
        commandString: pendingCommand.remainingCommandString,
        commandsDir: pendingCommand.subcommandsDir,
        lastResolved: pendingCommand,
        setResolveFn: (resolveFn) => {
          this.#resolveFn = resolveFn;
        },
        setParseFn: (parseFn) => {
          this.#parseFn = parseFn;
        },
        addResolvedCommands: (resolvedCommands) => {
          pendingCommand = resolvedCommands.pop();
          this.enqueueCommand(resolvedCommands);
        },
        skip: () => {
          skipped = true;
        },
      });

      if (skipped) break;

      pendingCommand = await this.resolveCommand(
        pendingCommand.remainingCommandString,
        pendingCommand.subcommandsDir,
      );
    }

    await this.hooks.call('afterResolve', {
      context: this,
      resolvedCommands: this.#commandQueue,
      addResolvedCommands: (resolvedCommands) => {
        this.enqueueCommand(resolvedCommands);
      },
    });

    // Throw an error if the last command requires a subcommand.
    const lastCommand = this.#commandQueue.at(-1);
    if (lastCommand?.command.requiresSubcommand) {
      await this.throw(new SubcommandRequiredError(this.commandString));
    }

    // Mark the context as resolved
    this.#isResolved = true;
  }

  /**
   * Parse the command string with the final options config from plugins and
   * resolved commands, setting the context's `parsedOptions` property.
   *
   * @remarks This method is idempotent.
   */
  async #parseWithHooks() {
    if (this.#isParsed) return;

    await this.hooks.call('beforeParse', {
      context: this,
      commandString: this.commandString,
      optionsConfig: this.options,
      setParseFn: (parseFn) => {
        this.#parseFn = parseFn;
      },
      setParsedOptionsAndSkip: (optionValues) => {
        this.setOptionValues(optionValues);
        this.#isParsed = true;
      },
      skip: () => {
        this.#isParsed = true;
      },
    });

    // Don't parse if the hook skipped
    if (!this.#isParsed) {
      const { options } = await this.parseCommand();
      this.setOptionValues(options);
      this.#isParsed = true;
    }

    await this.hooks.call('afterParse', {
      context: this,
      parsedOptions: this.#optionValues,
      setParsedOptions: this.setOptionValues,
    });
  }
}
