import {
  OptionsConfigError,
  validateOptionsConfig,
} from 'src/core/options/validate-option-config';
import { describe, expect, it } from 'vitest';

describe('options', () => {
  describe('validateOptionsConfig', () => {
    it('throws OptionsConfigError on invalid options config', async () => {
      expect(() => {
        validateOptionsConfig({
          a: {
            type: 'string',
            required: true,
            conflicts: ['b'], // <-- can't be required and have conflicts
          },
          b: {
            type: 'string',
          },
        });
      }).toThrowError(OptionsConfigError);

      expect(() => {
        validateOptionsConfig({
          a: {
            type: 'string',
            required: true,
            requires: ['b'], // <-- can't be required and have requires
          },
          b: {
            type: 'string',
          },
        });
      }).toThrowError(OptionsConfigError);
    });
  });
});
