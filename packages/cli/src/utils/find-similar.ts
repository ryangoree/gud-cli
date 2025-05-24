/**
 * Options for {@link findSimilar}.
 * @group Utils
 */
interface FindSimilarOptions {
  /**
   * The maximum number of differences between the input and the choices.
   * @default 2
   */
  threshold?: number;

  /**
   * The maximum number of results to return.
   * @default 4
   */
  maxResults?: number;
}

/**
 * Returns strings from `choices` that are similar to `input` using the
 * Levenshtein distance.
 * @param input - The input string to compare against.
 * @param choices - The choices to find similar strings from.
 * @param options - Additional options.
 * @returns Up to `options.maxResults` strings from `choices` that are similar
 * to `input`.
 * @group Utils
 */
// TODO: Need to rethink this. If a word has all the same characters, but
// shifted by one, e.g., `eploy` and `deploy`, it will get a very low score when
// in reality it should be considered very similar.
export function findSimilar(
  input: string,
  choices: string[],
  { threshold = 2, maxResults = 4 }: FindSimilarOptions = {},
) {
  const distances = Array(choices.length).fill(0);

  for (const [charIndex, char] of Object.entries(input)) {
    for (const [choiceIndex, choice] of choices.entries()) {
      if (choice[charIndex as any] !== char) {
        distances[choiceIndex] += 1;
      }
    }
  }
  distances.sort();

  const similar: string[] = [];

  for (const [i, score] of distances.entries()) {
    if (score <= threshold) {
      similar.push(choices[i]!);
      if (similar.length >= maxResults) {
        break;
      }
    }
  }

  return similar;
}
