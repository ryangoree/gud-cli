import { createOptionsGetter } from 'src/core/options/options-getter';
import { describe, expect, it } from 'vitest';

describe('options', () => {
  describe('createOptionsGetter', () => {
    it('includes getter functions for each option in config', async () => {
      const getter = createOptionsGetter({
        optionsConfig: {
          foo: {
            type: 'string',
            alias: ['f'],
          },
          'foo-bar': {
            type: 'string',
          },
        },
        optionValues: {
          foo: 'bar',
          'foo-bar': 'bar-baz',
        },
      });

      expect(await getter.f()).toBe('bar');
      expect(await getter.foo()).toBe('bar');
      expect(await getter.fooBar()).toBe('bar-baz');
      expect(await getter['foo-bar']()).toBe('bar-baz');
    });

    it('includes "get" function to get multiple options by name', async () => {
      const getter = createOptionsGetter({
        optionsConfig: {
          foo: {
            type: 'string',
            alias: ['f'],
          },
          'foo-bar': {
            type: 'string',
          },
        },
        optionValues: {
          foo: 'bar',
          'foo-bar': 'bar-baz',
        },
      });

      expect(await getter.get('foo', 'f', 'foo-bar')).toEqual({
        foo: 'bar',
        f: 'bar',
        'foo-bar': 'bar-baz',
        fooBar: 'bar-baz',
      });
    });

    it('includes "values" object with all option values', async () => {
      const getter = createOptionsGetter({
        optionsConfig: {
          foo: {
            type: 'string',
            alias: ['f'],
          },
          'foo-bar': {
            type: 'string',
          },
        },
        optionValues: {
          foo: 'bar',
          'foo-bar': 'bar-baz',
        },
      });

      expect(await getter.values).toEqual({
        f: 'bar',
        foo: 'bar',
        'foo-bar': 'bar-baz',
        fooBar: 'bar-baz',
      });
    });
  });
});
