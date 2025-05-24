/**
 * Converts a hyphenated string to camel case.
 *
 * @example
 * camelCase('foo-bar') // 'fooBar'
 *
 * @group Utils
 */
export function camelCase<S>(str: S): CamelCase<S> {
  return (
    typeof str === 'string'
      ? str.replace(/-+([^-])/g, (_, c) => c.toUpperCase())
      : str
  ) as CamelCase<S>;
}

/**
 * @group Utils
 */
export type CamelCase<S> = S extends `${infer T}-${infer U}`
  ? `${Lowercase<T>}${Capitalize<CamelCase<U>>}`
  : S;
