import type { OptionValues } from 'src/core/options/options';

/**
 * Removes option tokens from a command string.
 * @param commandString - The command string to remove the tokens from.
 * @param values - The option values to remove the tokens for.
 * @returns The command string with the option tokens removed.
 * @group Options
 */
export function removeOptionTokens(
  commandString: string,
  values: OptionValues,
): string {
  const optionTokens: (string | number | boolean)[] = [];

  for (const [name, value] of Object.entries(values)) {
    optionTokens.push(`${name.length === 1 ? '-' : '--'}${name}`);

    switch (typeof value) {
      case 'string':
        optionTokens.push(value);
        break;
      case 'number':
        optionTokens.push(value.toString());
        break;
      case 'object':
        if (Array.isArray(value)) {
          optionTokens.push(...value);
        }
    }
  }

  // Create a regular expression to match the option tokens based on the option
  // names and values.
  const optionTokensRegExp = optionTokens.length
    ? new RegExp(
        `((?<=^|\\s)${optionTokens.join('\\b\\s?|(?<=^|\\s)')}\\b)`,
        'g',
      )
    : '';

  return commandString.replace(optionTokensRegExp, '').trim();
}
