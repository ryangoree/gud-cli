import { joinTokens } from 'src/utils/tokens';
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
  });
});
