import {
  OptionsError,
  validateOptions,
} from 'src/core/options/validate-options';
import { describe, expect, it } from 'vitest';

describe('options', () => {
  describe('validator', () => {
    it('throws OptionsError on invalid option types', async () => {
      expect(() => {
        validateOptions({
          values: {
            foo: 123, // <-- number
          },
          config: {
            foo: {
              type: 'string', // <-- should be a string
            },
          },
          validations: {
            type: true,
          },
        });
      }).toThrowError(OptionsError);

      expect(() => {
        validateOptions({
          values: {
            foo: 'bar', // <-- string
          },
          config: {
            foo: {
              type: 'number', // <-- should be a number
            },
          },
          validations: {
            type: true,
          },
        });
      }).toThrowError(OptionsError);

      expect(() => {
        validateOptions({
          values: {
            foo: 'bar', // <-- string
          },
          config: {
            foo: {
              type: 'boolean', // <-- should be a boolean
            },
          },
          validations: {
            type: true,
          },
        });
      }).toThrowError(OptionsError);

      expect(() => {
        validateOptions({
          values: {
            foo: 'bar', // <-- string
          },
          config: {
            foo: {
              type: 'array', // <-- should be an array of strings
            },
          },
          validations: {
            type: true,
          },
        });
      }).toThrowError(OptionsError);
    });

    it('throws OptionsError on missing required options', async () => {
      expect(() => {
        validateOptions({
          values: {}, // <-- no values
          config: {
            foo: {
              type: 'string',
              required: true, // <-- required value
            },
          },
          validations: {
            required: true,
          },
        });
      }).toThrowError(OptionsError);
    });

    it('throws OptionsError on conflicts', async () => {
      expect(() => {
        validateOptions({
          values: {
            a: 'foo',
            b: 'bar', // <-- b is present
          },
          config: {
            a: {
              type: 'string',
              conflicts: ['b'], // <-- conflicts with b
            },
            b: {
              type: 'string',
            },
          },
          validations: {
            conflicts: true,
          },
        });
      }).toThrowError(OptionsError);

      expect(() => {
        validateOptions({
          values: {
            a: 'foo',
            B: 'bar', // <-- B (b's alias) is present
          },
          config: {
            a: {
              type: 'string',
              conflicts: ['b'], // <-- conflicts with b
            },
            b: {
              type: 'string',
              alias: ['B'],
            },
          },
          validations: {
            conflicts: true,
          },
        });
      }).toThrowError(OptionsError);

      expect(() => {
        validateOptions({
          values: {
            a: 'foo',
            b: 'bar', // <-- b is present
          },
          config: {
            a: {
              type: 'string',
              conflicts: ['B'], // <-- conflicts with b's alias
            },
            b: {
              type: 'string',
              alias: ['B'],
            },
          },
          validations: {
            conflicts: true,
          },
        });
      }).toThrowError(OptionsError);
    });

    it('throws OptionsError on missing required option combos', async () => {
      expect(() => {
        validateOptions({
          values: {
            a: 'foo', // <-- b is missing
          },
          config: {
            a: {
              type: 'string',
              requires: ['b'], // <-- requires b
            },
            b: {
              type: 'string',
            },
          },
          validations: {
            requires: true,
          },
        });
      }).toThrowError(OptionsError);

      expect(() => {
        validateOptions({
          values: {
            a: 'foo', // <-- b is missing
          },
          config: {
            a: {
              type: 'string',
              requires: ['B'], // <-- requires b's alias
            },
            b: {
              type: 'string',
              alias: ['B'],
            },
          },
          validations: {
            requires: true,
          },
        });
      }).toThrowError(OptionsError);
    });
  });
});
