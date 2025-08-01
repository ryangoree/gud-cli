import {
  formatFileName,
  parseFileName,
  removeFileExtension,
} from 'src/utils/filename';
import { describe, expect, it } from 'vitest';

describe('filename', () => {
  describe('formatFileName', () => {
    it('adds the .js extension', () => {
      expect(formatFileName('foo')).toBe('foo.js');
    });

    it('replaces non-.js extensions', () => {
      expect(formatFileName('foo.ts')).toBe('foo.js');
    });

    it('handles multiple file extensions', () => {
      expect(formatFileName('foo.test.ts.js.ts')).toBe('foo.test.ts.js.js');
    });

    it('handles multiple dots in a file name', () => {
      expect(formatFileName('[...foo].ts')).toBe('[...foo].js');
      expect(formatFileName('[...foo]')).toBe('[...foo].js');
      expect(formatFileName('foo..bar.ts')).toBe('foo..bar.js');
      expect(formatFileName('foo..bar')).toBe('foo..bar.js');
    });
  });

  describe('parseFileName', () => {
    it('parses param file name', () => {
      // basic
      expect(parseFileName('[param]')).toEqual({
        spreadOperator: undefined,
        paramName: 'param',
        extension: undefined,
      });

      // with extension
      expect(parseFileName('[param].ts')).toEqual({
        spreadOperator: undefined,
        paramName: 'param',
        extension: '.ts',
      });

      // capital letters
      expect(parseFileName('[PARAM].ts')).toEqual({
        spreadOperator: undefined,
        paramName: 'PARAM',
        extension: '.ts',
      });

      // with underscores
      expect(parseFileName('[_p_r_m].ts')).toEqual({
        spreadOperator: undefined,
        paramName: '_p_r_m',
        extension: '.ts',
      });

      // with hyphens (not as first character)
      expect(parseFileName('[p-r-m].ts')).toEqual({
        spreadOperator: undefined,
        paramName: 'p-r-m',
        extension: '.ts',
      });

      // with numbers (not as first character)
      expect(parseFileName('[param123].ts')).toEqual({
        spreadOperator: undefined,
        paramName: 'param123',
        extension: '.ts',
      });
    });

    it('parses param file name with spread operator', () => {
      expect(parseFileName('[...param]')).toEqual({
        spreadOperator: '...',
        paramName: 'param',
        extension: undefined,
      });

      expect(parseFileName('[...param].ts')).toEqual({
        spreadOperator: '...',
        paramName: 'param',
        extension: '.ts',
      });
    });

    it('returns undefined values for non-param file name', () => {
      const expected = {
        spreadOperator: undefined,
        paramName: undefined,
        extension: undefined,
      };

      // plain string
      expect(parseFileName('param')).toEqual(expected);

      // basic file name
      expect(parseFileName('param.ts')).toEqual(expected);

      // with double extension
      expect(parseFileName('[param].old.ts')).toEqual(expected);

      // starts with hyphen
      expect(parseFileName('[-param].ts')).toEqual(expected);

      // starts with number
      expect(parseFileName('[2param].ts')).toEqual(expected);

      // includes special characters
      expect(parseFileName('[p@ram].ts')).toEqual(expected);

      // wrong number of dots for spread operator.
      expect(parseFileName('[.param].ts')).toEqual(expected);
      expect(parseFileName('[..param].ts')).toEqual(expected);
      expect(parseFileName('[....param].ts')).toEqual(expected);

      // missing opening or closing bracket
      expect(parseFileName('param].ts')).toEqual(expected);
      expect(parseFileName('[param.ts')).toEqual(expected);
    });
  });

  describe('removeFileExtension', () => {
    it('removes the file extension from a string', () => {
      expect(removeFileExtension('foo.ts')).toBe('foo');
    });

    it('leaves a string without a file extension unchanged', () => {
      expect(removeFileExtension('foo')).toBe('foo');
    });

    it('only removes the last file extension from a string with multiple file extensions', () => {
      expect(removeFileExtension('foo.test.ts')).toBe('foo.test');
    });

    it('ignores multiple dots in a file name', () => {
      expect(removeFileExtension('[...foo].ts')).toBe('[...foo]');
      expect(removeFileExtension('[...foo]')).toBe('[...foo]');
      expect(removeFileExtension('foo..bar')).toBe('foo..bar');
    });

    it('handles dirnames that look like file names', () => {
      expect(removeFileExtension('/foo/v24.3.0.js/bar')).toBe(
        '/foo/v24.3.0.js/bar',
      );
    });
  });
});
