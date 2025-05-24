import { type ClideErrorOptions, UsageError } from 'src/core/errors';
import {
  type OptionConfig,
  type OptionValues,
  type OptionsConfig,
  getOptionDisplayName,
  getOptionKeys,
} from 'src/core/options/options';

// Errors //

/**
 * An error indicating the user has provided invalid options.
 * @group Errors
 */
export class OptionsError extends UsageError {
  constructor(message: string, options?: ClideErrorOptions) {
    super(message, {
      name: 'OptionsError',
      ...options,
    });
  }
}

/**
 * An error indicating a required option is missing.
 * @group Errors
 */
export class OptionRequiredError extends OptionsError {
  constructor(optionName: string, options?: ClideErrorOptions) {
    super(`Option "${optionName}" is required`, {
      name: 'OptionRequiredError',
      ...options,
    });
  }
}

/**
 * An error indicating a provided option requires a missing option.
 * @group Errors
 */
export class OptionRequiresError extends OptionsError {
  constructor(
    optionName: string,
    requiresName: string,
    options?: ClideErrorOptions,
  ) {
    super(`Option "${optionName}" requires option "${requiresName}"`, {
      name: 'OptionRequiresError',
      ...options,
    });
  }
}

/**
 * An error indicating a provided option conflicts another provided option.
 * @group Errors
 */
export class OptionConflictsError extends OptionsError {
  constructor(
    optionName: string,
    conflictName: string,
    options?: ClideErrorOptions,
  ) {
    super(`Option "${optionName}" conflicts with option "${conflictName}"`, {
      name: 'OptionConflictsError',
      ...options,
    });
  }
}

// Functions + Function Types //

interface ValidateOptionsParams {
  values: OptionValues;
  config: OptionsConfig;
  validations: {
    type?: boolean;
    required?: boolean;
    conflicts?: boolean;
    requires?: boolean;
  };
}

/**
 * Validates the options for a command by checking for required options,
 * conflicts, and dependencies.
 *
 * @param options - The options to be validated.
 * @param optionsConfig - The options config.
 *
 * @throws {OptionsError} Throws an error if the options are invalid.
 *
 * @group Options
 */
export function validateOptions({
  config,
  values,
  validations,
}: ValidateOptionsParams) {
  const {
    type: validateType = false,
    required: validateRequired = false,
    conflicts: validateConflicts = false,
    requires: validateRequires = false,
  } = validations;

  // Expand the config object to include all keys for each option
  const expandedConfig: OptionsConfig = {};

  // Populate expanded config and check for required options
  for (const [configKey, optionConfig] of Object.entries(config)) {
    let hasValue = false;

    const allKeysForOption = getOptionKeys(configKey, optionConfig);
    for (const key of allKeysForOption) {
      if (key in values) hasValue = true;
      expandedConfig[key] = {
        ...optionConfig,
        alias: optionConfig.alias && [...optionConfig.alias, configKey],
      };
    }

    // Validate required
    if (validateRequired && optionConfig.required && !hasValue) {
      const optionName = getOptionDisplayName(configKey, optionConfig);
      throw new OptionRequiredError(optionName);
    }
  }

  const valueEntries = Object.entries(values);

  // Expand the values object to include all keys for each option for
  // inter-option validation
  const expandedValues: Record<string, unknown> = {};

  // Populate expanded values and check option types
  for (const [valueKey, value] of valueEntries) {
    const valueConfig = expandedConfig[valueKey];
    if (!valueConfig) continue;

    // Validate type
    if (validateType) {
      validateOptionType({
        value,
        name: valueKey,
        config: valueConfig,
      });
    }

    const allKeysForValue = getOptionKeys(valueKey, valueConfig);
    for (const key of allKeysForValue) {
      expandedValues[key] = value;
    }
  }

  // Skip inter-option validation if disabled
  if (!validateConflicts && !validateRequires) return;

  // Validate inter-option dependencies and conflicts
  for (const [valueKey] of valueEntries) {
    const valueConfig = expandedConfig[valueKey];
    if (!valueConfig) continue;

    // Validate dependencies
    if (valueConfig.requires) {
      for (const dependency of valueConfig.requires) {
        if (!(dependency in expandedValues)) {
          const dependencyName = getOptionDisplayName(
            dependency,
            expandedConfig[dependency],
          );
          throw new OptionRequiresError(valueKey, dependencyName);
        }
      }
    }

    // Validate conflicts
    if (valueConfig.conflicts) {
      for (const conflictingKey of valueConfig.conflicts) {
        if (conflictingKey in expandedValues) {
          // Find the key provided in the values object that conflicts
          const conflictConfig = expandedConfig[conflictingKey]!;
          const allKeysForConflict = getOptionKeys(
            conflictingKey,
            conflictConfig,
          );
          const conflictingValueKey = allKeysForConflict.find(
            (key) => key in values,
          );
          throw new OptionConflictsError(
            valueKey,
            conflictingValueKey || conflictingKey,
          );
        }
      }
    }
  }
}

/**
 * Validates an option value based on its type and throws an error if the value
 * is invalid.
 *
 * @throws {OptionsError} Throws an error if the option value is invalid and
 * `throws` is `true`.
 *
 * @group Options
 */
export function validateOptionType({
  value,
  name,
  config,
  throws = true,
}: {
  /**
   * The option value to validate.
   */
  value: unknown;

  /**
   * The name of the option.
   */
  name: string;

  /**
   * The option config.
   */
  config: OptionConfig;

  /**
   * Whether to throw an error if the value is invalid.
   *
   * @default true
   */
  throws?: boolean;
}) {
  const { choices, nargs, type, required } = config;

  if (value === undefined) {
    if (required && throws) throw new OptionRequiredError(name);
    return;
  }
  const details: string[] = [];
  let isValid = true;

  if (nargs) {
    // let value: any[];
    value = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [value];

    if ((value as any[]).length !== nargs) {
      details.push(
        `Expected ${nargs} value${nargs === 1 ? '' : 's'}, received ${(value as any[]).length}.`,
      );
      isValid = false;
    }

    if (isValid) {
      if (type === 'array') {
        isValid = !!isValidValueType(value, config);
      } else {
        isValid = (value as any[]).every((v) => isValidValueType(v, config));
      }
    }
  } else {
    isValid = !!isValidValueType(value, config);
  }

  if (!isValid && throws) {
    if (choices) {
      details.push(`Choices: ${choices.join(', ')}`);
    }

    let errorString = `Invalid value for ${type} option "${name}": ${value}`;

    if (details.length) {
      errorString += `\n\n${details.join('\n')}\n`;
    }

    const optionTypeString =
      !nargs || nargs < 2 ? type : `${new Array(nargs).fill(type).join(', ')}`;
    errorString += `Type: ${optionTypeString}\n`;

    throw new OptionsError(errorString);
  }

  return isValid;
}

// Internal //

function isValidValueType(value: unknown, config: OptionConfig) {
  if (value === undefined) return;
  const { choices, type } = config;

  switch (type) {
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);

    case 'boolean':
      return typeof value === 'boolean';

    case 'array':
      if (typeof value === 'string') {
        value = value.split(',').length > 0;
      }
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        (!choices || value.every((v) => choices.includes(v)))
      );

    default:
      return (
        typeof value === 'string' &&
        value.length > 0 &&
        (!choices || choices.includes(value))
      );
  }
}
