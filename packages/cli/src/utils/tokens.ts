export type JoinableTokens = string | string[] | JoinableTokens[];

/**
 * Joins multiple command tokens into a single string.
 */
export function joinTokens(...tokens: JoinableTokens[]): string {
  return tokens
    .map((token) => {
      if (Array.isArray(token)) return joinTokens(...token);

      // If a token within multiple tokens contains spaces, wrap it in quotes
      if (
        tokens.length > 1 &&
        token.includes(' ') &&
        !token.startsWith('"') &&
        !token.endsWith('"')
      ) {
        return `"${token}"`;
      }
      return token;
    })
    .join(' ');
}

/**
 * Splits a command string into an array of tokens.
 */
// TODO: Add tests
export function splitTokens(commandString: string): string[] {
  const tokens: string[] = [];
  let inQuotes = false;
  let currentToken = '';

  for (const token of commandString.split(' ')) {
    if (inQuotes) {
      if (token.endsWith('"')) {
        tokens.push(`${currentToken} ${token.slice(0, -1)}`);
        inQuotes = false;
      } else {
        currentToken += ` ${token}`;
      }
      continue;
    }

    if (token.startsWith('"')) {
      inQuotes = true;
      currentToken = token.slice(1);
    } else {
      tokens.push(token);
    }
  }

  return tokens;
}
