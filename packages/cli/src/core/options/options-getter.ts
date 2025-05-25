import { Client, type PromptParams } from 'src/core/client';
import {
  type OptionPromptParams,
  type OptionPromptType,
  optionPrompt,
} from 'src/core/options/option-prompt';
import {
  type ExpandedOptionsConfig,
  type OptionAlias,
  type OptionConfig,
  type OptionConfigPrimitiveType,
  type OptionKey,
  type OptionType,
  type OptionValues,
  type OptionsConfig,
  getOptionKeys,
  getOptionTypeFromValue,
  normalizeOptionValue,
} from 'src/core/options/options';
import { validateOptionType } from 'src/core/options/validate-options';
import { type CamelCase, camelCase } from 'src/utils/camel-case';
import type { AnyObject } from 'src/utils/types';

// Types //

/**
 * Configuration options for the {@linkcode OptionGetter} function.
 * @Group Options
 */
type OptionGetterParams<T extends OptionConfig> = Pick<
  OptionPromptParams<T>,
  'validate'
> & {
  /**
   * The prompt to show the user if no value is provided (optional).
   */
  prompt?: string | Omit<PromptParams<OptionPromptType<T['type']>>, 'validate'>;
};

/**
 * A function to dynamically retrieve the value of a command option.
 * @group Options
 */
export type OptionGetter<T extends OptionConfig> = <V extends T>(
  getterOptions?: OptionGetterParams<V>,
) => Promise<OptionConfigPrimitiveType<V>>;

/**
 * An object that can be used to dynamically retrieve the values of command
 * options, including aliases. Options can be retrieved by their original key,
 * any of their aliases, or camelCased versions of either.
 *
 * @group Options
 */
export type OptionsGetter<TOptions extends OptionsConfig = OptionsConfig> = {
  [K in keyof ExpandedOptionsConfig<TOptions>]: OptionGetter<
    ExpandedOptionsConfig<TOptions>[K]
  >;
} & {
  /**
   * Get the values of the specified options. This is useful when you want to
   * get the values of multiple options at once.
   *
   * @param optionNames - The names of the options to get.
   *
   * @returns An object with the values of the specified options keyed by both
   * their original keys and camelCased keys.
   */
  get: <K extends keyof ExpandedOptionsConfig<TOptions>>(
    ...optionNames: K[]
  ) => Promise<{
    [O in K as O | CamelCase<O>]: OptionConfigPrimitiveType<
      ExpandedOptionsConfig<TOptions>[O]
    >;
  }>;

  /**
   * Set the value of an option.
   *
   * @param optionName - The name of the option to set.
   * @param value - The value to set for the option.
   */
  set: <
    K extends keyof ExpandedOptionsConfig<TOptions>,
    V extends
      | OptionConfigPrimitiveType<ExpandedOptionsConfig<TOptions>[K]>
      | undefined,
  >(
    optionName: K,
    value: V,
  ) => Promise<void>;

  /**
   * Direct access to the values of the options, keyed by their original keys,
   * aliases, and camelCased versions of both. This is useful for checking
   * option values without triggering any validation or prompting.
   */
  readonly values: {
    [K in keyof TOptions as OptionKey<
      K,
      OptionAlias<TOptions[K]>
    >]: OptionConfigPrimitiveType<TOptions[K]>;
  };
};

/**
 * Configuration options for the {@linkcode createOptionsGetter} function.
 *
 * @group Options
 */
export interface CreateOptionsGetterOptions<
  TOptionsConfig extends OptionsConfig,
  TOptions extends OptionValues = {},
> {
  /**
   *  The options config.
   */
  optionsConfig: TOptionsConfig;

  /**
   *  The initial option values.
   */
  optionValues?: TOptions;

  /**
   *  The client to use for prompting.
   */
  client?: Client;

  /**
   * A function to call when the user cancels a prompt. By default, this will
   * exit the process.
   */
  onPromptCancel?: () => void;
}

/**
 * Converts command options to a getter object.
 *
 * This function transforms an `Options` object into a `CommandOptionsGetter`
 * object that has getter methods for each of the options. The getters can then
 * be used to retrieve the values of the options dynamically. If an option has
 * defined aliases, the returned getter will have additional getter methods for
 * each alias, all pointing to the original option's value.
 *
 * Additionally, the returned object has a `get` method, which accepts an array
 * of option keys and returns an object with the corresponding camelCased
 * key-value pairs.
 *
 * @example
 * const optionsConfig = {
 *   f: {
 *     type: 'string',
 *     alias: ['foo'],
 *     default: 'default foo'
 *   },
 * };
 * const optionsGetter = createOptionsGetter({ optionsConfig });
 * const val = await optionsGetter.foo(); // 'default foo'
 *
 * @group Options
 */
// TODO: Cache the result of this function
export function createOptionsGetter<
  TKey extends string = string,
  TType extends OptionType = OptionType,
  TOptionsConfig extends OptionsConfig<TKey, TType> = OptionsConfig<
    TKey,
    TType
  >,
  TOptionValues extends OptionValues = OptionValues,
>({
  client = new Client(),
  optionsConfig,
  optionValues = {} as TOptionValues,
  onPromptCancel = process.exit,
}: CreateOptionsGetterOptions<
  TOptionsConfig,
  TOptionValues
>): OptionsGetter<TOptionsConfig> {
  const expandedConfig: AnyObject<OptionConfig> = {};

  const getter = {
    values: {},

    get: async (...keys) => {
      const result: AnyObject = {};
      for (const key of keys) {
        const value = await getter[key]?.();
        result[key] = value;
        result[camelCase(key)] = value;
      }
      return result;
    },

    // setter for option values
    set: async (optionName, value) => {
      const config = expandedConfig[optionName] || {
        type: getOptionTypeFromValue(value),
      };
      const optionKeys = getOptionKeys(optionName, config);
      for (const key of optionKeys) getter.values[key] = value;
      return value;
    },
  } as OptionsGetter;

  // iterate over all keys in the options config
  for (const configKey in optionsConfig) {
    const config = optionsConfig[configKey];
    const optionKeys = getOptionKeys(configKey, config);
    const valueKey = optionKeys.find((key) => optionValues[key] !== undefined);

    // loop through all keys for the option to set values and create getters
    for (const key of optionKeys) {
      // Add the key to the expanded config
      expandedConfig[key] = {
        ...config,
        alias: config.alias?.length ? [...config.alias, configKey] : undefined,
      } as OptionConfig;

      // Add the key to the values if any of it's aliases are already set
      if (valueKey) {
        getter.values[key] = optionValues[valueKey];
      }

      // Create a getter for the key
      getter[key] = async (params = {}) => {
        const { prompt, validate } = params;
        let value = getter.values[key];

        // Return cached value if it exists
        if (value !== undefined) return value;

        // Prompt for the value if required or a prompt is provided.
        if (config.required || params?.prompt) {
          value = await optionPrompt({
            client,
            config,
            name: key,
            onCancel: onPromptCancel,
            validate,
            ...(typeof prompt === 'object'
              ? prompt
              : {
                  message: prompt || `Enter ${key}`,
                }),
          });
        } else {
          value = normalizeOptionValue(value, config);
        }

        // Validate and set the value to avoid prompting again
        validateOptionType({ config, name: key, value });
        getter.set(key, value);
        return value as any;
      };
    }
  }

  return getter as unknown as OptionsGetter<TOptionsConfig>;
}
