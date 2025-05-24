import { camelCase } from 'src/utils/camel-case';
import { describe, expect, it } from 'vitest';

describe('camel-case', () => {
  it('converts a hyphenated string to camel case', () => {
    expect(camelCase('foo-bar')).toEqual('fooBar');
  });

  it('only alters the case of letters after hyphens', () => {
    expect(camelCase('fooBaz')).toEqual('fooBaz');
    expect(camelCase('FoO-bAr')).toEqual('FoOBAr');
  });
});
