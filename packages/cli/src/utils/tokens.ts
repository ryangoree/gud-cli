export type JoinableTokens = string | string[] | JoinableTokens[];

export interface JoinTokenOptions {
  /**
   * The delimiter to use when joining tokens.
   * @default ' '
   */
  delimiter?: string;
  /**
   * Whether to wrap nested spaces in quotes.
   *
   * @example
   * ```ts
   * joinTokens('foo', 'bar baz', 'qux', {
   *   wrapInQuotes: true,
   * });
   * // => 'foo "bar baz" qux'
   * ```
   *
   * @default true
   */
  wrapInQuotes?: boolean;
}

/**
 * Joins multiple command tokens into a single string.
 */
export function joinTokens(
  ...tokens:
    | [JoinableTokens, ...JoinableTokens[]]
    | [JoinableTokens, ...JoinableTokens[], JoinTokenOptions]
): string {
  let delim = ' ';
  let useQuotes = true;

  // Check if the last argument is an options object
  const lastArg = tokens.at(-1);
  if (typeof lastArg === 'object' && !Array.isArray(lastArg)) {
    const { delimiter, wrapInQuotes } = tokens.pop() as JoinTokenOptions;
    if (delimiter !== undefined) {
      delim = delimiter;
    }
    if (wrapInQuotes !== undefined) {
      useQuotes = wrapInQuotes;
    }
  }

  const processedTokens: string[] = [];
  for (const token of (tokens as string[]).flat(Number.POSITIVE_INFINITY)) {
    if (!token) continue;

    // If a token within multiple tokens contains spaces, wrap it in quotes
    if (
      useQuotes &&
      tokens.length > 1 &&
      token.includes(' ') &&
      (!token.startsWith('"') || !token.endsWith('"'))
    ) {
      processedTokens.push(`"${token.replaceAll('"', '\\"')}"`);
    } else {
      processedTokens.push(token);
    }
  }

  return processedTokens.join(delim);
}

/**
 * Splits a command string into an array of tokens.
 */
export function splitTokens(commandString: string, delimiter = ' '): string[] {
  if (!commandString) return [];

  const tokens: string[] = [];
  const currentQuotedToken = [];
  let inQuotes = false;

  for (const token of commandString.split(delimiter)) {
    if (inQuotes) {
      if (token.endsWith('"')) {
        tokens.push(
          [...currentQuotedToken, token.slice(0, -1)].join(delimiter),
        );
        currentQuotedToken.length = 0;
        inQuotes = false;
      } else {
        currentQuotedToken.push(token);
      }
      continue;
    }

    if (token.startsWith('"') && !token.endsWith('"')) {
      inQuotes = true;
      currentQuotedToken.push(token.slice(1));
    } else {
      tokens.push(token.replaceAll('"', ''));
    }
  }

  return tokens;
}
