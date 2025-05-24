import { ClideError, type ClideErrorOptions } from 'src/core/errors';
import type { OptionsConfig } from 'src/core/options/options';

// Errors //

/**
 * An error indicating the options config is invalid.
 * @group Errors
 */
export class OptionsConfigError extends ClideError {
  constructor(message: string, options?: ClideErrorOptions) {
    super(message, {
      name: 'OptionsConfigError',
      ...options,
    });
  }
}

// Functions + Function Types //

/**
 * @throws {OptionsConfigError} Throws an error if the options config is
 * invalid.
 * @group Options
 */
export function validateOptionsConfig(options: OptionsConfig) {
  for (const [name, config] of Object.entries(options)) {
    const { required, conflicts, requires } = config;

    if (required && conflicts?.length) {
      throw new OptionsConfigError(
        `Option "${name}" cannot be required and conflict with other options`,
      );
    }

    if (required && requires?.length) {
      throw new OptionsConfigError(
        `Option "${name}" cannot be required and require other options`,
      );
    }
  }
}
