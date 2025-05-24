import { ClideError } from 'src/core/errors';
import { describe, expect, it } from 'vitest';

describe('error', () => {
  describe('ClideError', () => {
    it('Uses the provided prefix and name from options', () => {
      class FooError extends ClideError {
        constructor(error: unknown) {
          super(error, { prefix: '👻 ', name: 'Foo Error' });
        }
      }
      const error = new FooError('Something went wrong');

      // The name is set to the provided name.
      expect(error.name).toBe('Foo Error');

      // The prefix is included in the stack trace.
      expect(error.stack).toMatch('👻 Foo Error: Something went wrong\n');

      // The prefix is not included in the message.
      expect(error.message).toBe('Something went wrong');
    });

    it('Uses the `name` property if set after the constructor', () => {
      class CustomError extends ClideError {
        constructor(message: string) {
          super(message);
          this.name = 'Error';
        }
      }
      const error = new CustomError('Something went wrong');

      // The name property matches the one set after the constructor.
      expect(error.name).toBe('Error');

      // The error property is used in the stack message.
      expect(error.stack).toMatch(
        `${ClideError.prefix}Error: Something went wrong\n`,
      );
    });

    it('Appends wrapped error names if not `Error`', () => {
      class CustomError extends Error {}
      const wrappedCustomError = new ClideError(new CustomError());

      // The custom error name is included in the stack trace.
      expect(wrappedCustomError.stack).toMatch('[CustomError]');

      const wrappedError = new ClideError(new Error());

      // The default name, "Error", is ignored.
      expect(wrappedError.stack).not.toMatch('[Error]');
    });
  });
});
