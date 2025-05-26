import { joinTokens, splitTokens } from 'src/utils/tokens';
import { describe, expect, it } from 'vitest';

describe('tokens', () => {
  describe('joinTokens', () => {
    it('joins a simple list of tokens', () => {
      expect(joinTokens('foo', 'bar', 'baz')).toBe('foo bar baz');
    });

    it('adds quotes around tokens with spaces', () => {
      expect(joinTokens('foo', 'bar baz', 'qux')).toBe('foo "bar baz" qux');
    });

    it('joins arrays of tokens', () => {
      expect(joinTokens(['foo', 'bar'], ['baz', 'qux'])).toBe(
        'foo bar baz qux',
      );
    });

    it('adds quotes around arrays of tokens with spaces', () => {
      expect(joinTokens(['foo', 'bar baz'], ['qux'])).toBe('foo "bar baz" qux');
    });

    it('handles a mix of strings and arrays', () => {
      expect(joinTokens('foo', ['bar', 'baz'], 'qux')).toBe('foo bar baz qux');
    });

    it('handles nested arrays', () => {
      expect(joinTokens('foo', ['bar', ['baz', ['qux']]])).toBe(
        'foo bar baz qux',
      );
    });

    it('accepts custom joiner', () => {
      expect(joinTokens('foo', 'bar', { delimiter: '/' })).toBe('foo/bar');
    });

    it('allows omitting quotes on nested spaces', () => {
      expect(joinTokens('foo', ['bar baz'], { wrapInQuotes: false })).toBe(
        'foo bar baz',
      );
    });
  });

  describe('splitTokens', () => {
    it('splits a simple string into tokens', () => {
      expect(splitTokens('foo bar baz')).toEqual(['foo', 'bar', 'baz']);
    });

    it('handles quoted tokens with spaces', () => {
      expect(splitTokens('foo "bar baz" qux quux')).toEqual([
        'foo',
        'bar baz',
        'qux',
        'quux',
      ]);
    });

    it('accepts custom joiner', () => {
      expect(splitTokens('foo/"bar baz"/qux', '/')).toEqual([
        'foo',
        'bar baz',
        'qux',
      ]);
    });
  });
});
