import { Console } from 'node:console';
import process from 'node:process';
import prompts, { type PromptObject, type PromptType } from 'prompts';
import { CliError, type CliErrorOptions } from 'src/core/errors';
import type { KeyMap, Replace } from 'src/utils/types';

// Errors //

/**
 * An error that has already been printed by the client.
 * @group Errors
 */
export class ClientError extends CliError {
  constructor(message: unknown, options?: CliErrorOptions) {
    super(message, {
      name: 'Error',
      ...options,
    });
  }
}

// Types //

export type PromptTypeMap = KeyMap<
  PromptType,
  {
    autocomplete: string;
    autocompleteMultiselect: string[];
    confirm: boolean;
    date: Date;
    invisible: string;
    list: string[];
    multiselect: string[];
    number: number;
    password: string;
    select: string;
    text: string;
    toggle: boolean;
  }
>;

/**
 * Get the primitive type for a prompt type.
 * @group Client
 */
export type PromptPrimitiveType<T extends PromptType = PromptType> =
  PromptTypeMap[T];

// Functions + Function Types //

/**
 * A variation of {@linkcode PromptObject} with a few changes:
 * - {@linkcode PromptObject.type type} is optional and defaults to `'text'`.
 * - {@linkcode PromptObject.message message} is required.
 * - {@linkcode PromptObject.name name} is always `'value'`.
 * - {@linkcode PromptObject.separator separator} is always `','`.
 *
 * @see [GitHub - terkelg/prompts - Prompt Objects](https://github.com/terkelg/prompts#-prompt-objects)
 * @group Client
 */
export type PromptParams<T extends PromptType = PromptType> = Replace<
  Omit<PromptObject, 'name' | 'separator'>,
  {
    // make the message property required since prompts throws an error if it's
    // not defined.
    message: NonNullable<prompts.PromptObject['message']>;
    // make the type property optional since we'll default to 'text'
    type?: T;
  }
>;

/**
 * A client that wraps the Node.js console and provides additional methods for
 * logging, error handling, and user prompts.
 *
 *
 * @see [GitHub - terkelg/prompts](https://github.com/terkelg/prompts).
 * @group Client
 */
export class Client extends Console {
  constructor({ stdout = process.stdout, stderr = process.stderr } = {}) {
    super({ stdout, stderr });
  }

  /**
   * Log an error message to stderr.
   * @param error - The error to log.
   * @returns The error wrapped in a {@linkcode ClientError}.
   */
  override error(error: unknown) {
    const clientError = new ClientError(error);
    console.error(
      `\n${
        process.env.NODE_ENV === 'development'
          ? clientError.stack
          : `${CliError.prefix}Error: ${clientError.message}`
      }`,
    );
    return clientError;
  }

  /**
   * Prompt the user for input.
   * @param prompt - The prompt options.
   * @returns The user's input.
   *
   * @see https://github.com/terkelg/prompts#-prompt-objects
   */
  async prompt<T extends PromptType = PromptType>(
    prompt: PromptParams<T>,
  ): Promise<PromptPrimitiveType<T>> {
    const { value } = await prompts({
      type: 'text',
      active: 'yes',
      inactive: 'no',
      ...prompt,
      name: 'value',
      separator: ',',
    });
    return value;
  }

  /**
   * Prompt the user for confirmation.
   * @param message - The confirmation message.
   * @params initial - The initial value for the confirmation prompt. Defaults
   * to `true`.
   * @returns Whether the user confirmed.
   */
  async confirm(message: string, initial = true): Promise<boolean> {
    return this.prompt({ type: 'confirm', initial, message });
  }
}
