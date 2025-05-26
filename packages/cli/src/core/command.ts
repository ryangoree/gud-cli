import type { OptionsConfig } from 'src/core/options/options';
import type { State } from 'src/core/state';
import type { MaybePromise } from 'src/utils/types';

// Types //

/**
 * The current state of the CLI engine passed to the command handler.
 *
 * @typeParam TData - The data type the handler expects to receive.
 * @typeParam TOptions - The `OptionsConfig` type for the command.
 *
 * @group Command
 */
export type CommandState<
  TData = unknown,
  TOptions extends OptionsConfig = OptionsConfig,
> = Readonly<Omit<State<TData, TOptions>, 'start'>>;

/**
 * A command handler function that receives the current state and performs some
 * action.
 * @typeParam TData - The data type the handler expects to receive.
 * @typeParam TOptions - The `OptionsConfig` type for the command.
 * @typeParam TReturn - The return type.
 * @param state - The current state of the CLI engine.
 * @group Command
 */
export type CommandHandler<
  TData = unknown,
  TOptions extends OptionsConfig = OptionsConfig,
  TReturn = unknown,
> = (state: CommandState<TData, TOptions>) => MaybePromise<TReturn>;

/**
 * A command module that can be executed by the CLI engine.
 * @typeParam TData - The data type the handler expects to receive.
 * @typeParam TOptions - The `OptionsConfig` type for the command.
 * @typeParam TReturn - The return type of the command handler.
 * @group Command
 */
export interface CommandModule<
  TData = unknown,
  TOptions extends OptionsConfig = OptionsConfig,
  TReturn = unknown,
> {
  /**
   * A description of the command that will be displayed in the help menu.
   */
  description?: string;

  /**
   * The options config for the command.
   */
  options?: TOptions;

  /**
   * If `true`, the command will be executed before the next command in the
   * chain.
   * @default true
   */
  isMiddleware?: boolean;

  /**
   * If `true`, the command will require a subcommand to be executed.
   */
  requiresSubcommand?: boolean;

  /**
   * The command handler. This is where the command's logic is executed.
   */
  handler: CommandHandler<TData, TOptions, TReturn>;
}

// Functions + Function Types //

/**
 * The configuration object for the {@linkcode command} function.
 * @group Command
 */
export type CommandFactoryConfig<
  TOptions extends OptionsConfig = OptionsConfig,
  TModule extends Partial<
    CommandModule<any, any, any>
  > = Partial<CommandModule>,
> = TModule & {
  options?: TOptions;
};

/**
 * The return type of the {@linkcode command} function.
 * @group Command
 */
export type CommandFactoryReturn<
  TModule extends Partial<
    CommandModule<any, any, any>
  > = Partial<CommandModule>,
> = TModule extends Partial<
  CommandModule<infer TData, infer TOptions, infer TReturn>
>
  ? TModule & {
      isMiddleware: TModule['isMiddleware'] extends boolean
        ? TModule['isMiddleware']
        : true;
      handler: TModule['handler'] extends Function
        ? TModule['handler']
        : CommandHandler<TData, TOptions, TReturn>;
    }
  : never;

/**
 * Factory function to create a {@linkcode CommandModule} with strong typing.
 * This is used to define a command with its associated metadata, options, and
 * handler logic.
 *
 * @returns A constructed {@linkcode CommandModule} object with strong types.
 * @group Command
 */
export function command<
  TOptions extends OptionsConfig,
  const TModule extends Partial<CommandModule<any, TOptions>>,
>(
  {
    description,
    options,
    isMiddleware = true,
    handler = passThroughHandler,
    requiresSubcommand = handler === passThroughHandler,
  }: CommandFactoryConfig<TOptions, TModule> = {} as CommandFactoryConfig<
    TOptions,
    TModule
  >,
): CommandFactoryReturn<TModule> {
  return {
    isMiddleware,
    requiresSubcommand,
    handler,
    description,
    options,
  } as CommandFactoryReturn<TModule>;
}

/**
 * A pass-through command handler that simply returns the current state data
 * without any modifications.
 */
export function passThroughHandler(state: CommandState) {
  return state.next(state.data);
}

/**
 * A pass-through command that does not perform any action and simply returns
 * the current state data.
 */
export const passThroughCommand = command();
