import { Client, type PromptParams } from 'src/core/client';
import {
  type OptionConfig,
  type OptionConfigPrimitiveType,
  type OptionType,
  normalizeOptionValue,
} from 'src/core/options/options';
import { validateOptionType } from 'src/core/options/validate-options';
import type { KeyMap, MaybePromise, Replace } from 'src/utils/types';

// Types //

export type OptionPromptTypeMap = KeyMap<
  OptionType,
  {
    array: 'autocompleteMultiselect' | 'list' | 'multiselect';
    boolean: 'confirm' | 'toggle';
    number: 'number' | 'select';
    secret: 'invisible' | 'password';
    string:
      | 'autocomplete'
      | 'date'
      | 'invisible'
      | 'password'
      | 'select'
      | 'text';
  }
>;

export type OptionPromptType<T extends OptionType> = OptionPromptTypeMap[T];

// Functions + Function Types //

export type OptionPromptParams<T extends OptionConfig = OptionConfig> = Replace<
  PromptParams<OptionPromptType<T['type']>, T['type']>,
  {
    /**
     * The name of the option.
     */
    name: string;

    /**
     * The option config.
     */
    config?: T;

    /**
     * The client to use for prompting.
     */
    client?: Client;

    /**
     * The validation function (optional).
     *
     * @param value The value to validate.
     *
     * @returns `true` if the value is valid, `false` or an error message if the
     * value is invalid.
     */
    validate?: (
      value?: OptionConfigPrimitiveType<T>,
    ) => MaybePromise<boolean | string>;

    /**
     * A function to call when the user cancels a prompt. By default, this will
     * exit the process.
     */
    onCancel?: () => void;
  }
>;

/**
 * Prompt the user for an option value based on the option's configuration.
 *
 * @example
 * ```ts
 * const fooValue = await optionPrompt({
 *   name: 'foo',
 *   option: {
 *     type: 'string',
 *     default: 'default foo',
 *   },
 *   client: new Client(),
 * });
 * const val = fooGetter({ prompt: { message: 'Enter foo' } }); // 'foo value'
 *
 * @throws {OptionsError} Throws an error if the option is required and no value
 * is provided or the value is invalid.
 * @group Options
 */
export async function optionPrompt<
  TConfig extends OptionConfig = OptionConfig,
>({
  name,
  config,
  client = new Client(),
  onCancel,
  validate,
  onState,
  ...params
}: OptionPromptParams<TConfig>): Promise<
  OptionConfigPrimitiveType<TConfig> | undefined
> {
  // Assign a default validate function if the option is required and no
  // validate function is provided
  if (config?.required && !validate) {
    validate = (value) =>
      !!validateOptionType({
        value,
        name,
        config,
        throws: false,
      });
  }

  let type: PromptParams['type'];

  // Determine prompt type based on option type
  switch (config?.type) {
    case 'number':
      type = config?.choices?.length ? 'select' : 'number';
      break;
    case 'boolean':
      type = 'toggle';
      break;
    case 'array':
      type = config?.choices?.length ? 'multiselect' : 'list';
      break;
    case 'secret':
      type = 'password';
      break;
    default:
      type = config?.choices?.length ? 'select' : 'text';
      break;
  }

  const promptOptions: PromptParams = {
    type,
    choices: config?.choices?.map((choice) => ({
      title: String(choice),
      value: choice,
    })),
    validate: validate
      ? function (this: PromptParams, value) {
          // prompts won't always pass the initial value to the validate
          // function, so we need to check for an empty string and use the
          // default value if provided.
          //
          // see: https://github.com/terkelg/prompts/issues/410
          if (value === '' && this?.initial !== undefined) {
            value = this?.initial;
          }
          const preppedValue = normalizeOptionValue(value, config);
          return validate(preppedValue);
        }
      : undefined,

    // options passed to the getter take precedence over the config
    ...params,

    onState: (state, ...rest) => {
      onState?.(state, ...rest);
      if (state.aborted || state.exited) {
        onCancel?.();
      }
      return state;
    },
  };

  // Add additional options for specific prompt types
  switch (promptOptions.type) {
    case 'autocomplete':
    case 'autocompleteMultiselect': {
      // These options are not part of the types package, but do exist.
      (promptOptions as any).clearFirst ??= true;

      // If no choices are matched, accept the input as-is
      promptOptions.suggest ??= async (input, choices) => {
        if (!input) return choices;
        const lowerInput = input.toLowerCase();
        const filtered = choices.filter((choice) => {
          const lowerTitle = choice.title.toLowerCase();
          if (
            lowerTitle.slice(0, lowerInput.length) === lowerInput ||
            lowerInput.slice(0, lowerTitle.length) === lowerTitle
          ) {
            return true;
          }
          const lowerValue = choice.value?.toLowerCase();
          return (
            lowerValue &&
            (lowerValue.slice(0, lowerInput.length) === lowerInput ||
              lowerInput.slice(0, lowerValue.length) === lowerValue)
          );
        });
        return [{ title: input }, ...filtered];
      };

      break;
    }
  }

  // If an initial value is not provided, use the default value
  if (promptOptions.initial === undefined && config?.default !== undefined) {
    const defaultValue = Array.isArray(config?.default)
      ? config?.default.join(',')
      : config?.default;

    switch (promptOptions.type) {
      case 'select': {
        // Ignore the default value if the choices aren't an array
        if (!Array.isArray(promptOptions.choices)) break;

        const defaultChoice = promptOptions.choices?.findIndex(
          (choice) =>
            choice.title === defaultValue || choice.value === defaultValue,
        );
        if (defaultChoice > -1) {
          promptOptions.initial = defaultChoice;
        }
        break;
      }

      case 'date':
        promptOptions.initial = new Date(defaultValue.toString());
        break;

      default:
        promptOptions.initial = defaultValue;
    }
  }

  const value = await client.prompt(promptOptions);
  return normalizeOptionValue(value, config);
}
