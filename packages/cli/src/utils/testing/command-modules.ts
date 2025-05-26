import path from 'node:path';
import type { CommandModule } from 'src/core/command';
import { NotFoundError } from 'src/core/errors';
import { parseCommand } from 'src/core/parse';
import type { State } from 'src/core/state';
import { formatFileName } from 'src/utils/filename';
import type { Eval } from 'src/utils/types';
import { type Mock, vi } from 'vitest';

const mockCommandDirs = new Map<string, Set<string>>();

vi.mock('node:fs', async (importOriginal) => {
  const fs = (await importOriginal()) as typeof import('fs');
  const mod = {
    ...fs,
    promises: {
      ...fs.promises,
      // Mock fs.readdir to return the command names for command directories
      readdir: vi.fn(async (path, opts) => {
        return fs.promises.readdir(path, opts).catch(() => {
          // If the path is a command directory, return the command names
          if (mockCommandDirs.has(path.toString())) {
            return Promise.resolve([...mockCommandDirs.get(path.toString())!]);
          }
        });
      }),

      // Mock fs.stat to return isDirector()y = true for command directories
      stat: vi.fn(async (path, options) => {
        return fs.promises.stat(path, options).catch(() => {
          // If the path is a command directory, return isDirectory() = true
          if (mockCommandDirs.has(path.toString())) {
            return Promise.resolve({
              isDirectory: vi.fn(() => true),
            }) as any;
          }

          // Otherwise, reject
          return Promise.reject();
        });
      }),
    },
    // Mock fs.readdir to return the command names for command directories
    readdirSync: vi.fn((path, opts) => {
      try {
        return fs.readdirSync(path, opts);
      } catch {
        // If the path is a command directory, return the command names
        if (mockCommandDirs.has(path.toString())) {
          return mockCommandDirs.get(path.toString());
        }
      }
    }),
    statSync: vi.fn((path, opts) => {
      try {
        return fs.statSync(path, opts);
      } catch (err) {
        // If the path is a command directory, return isDirectory() = true
        if (mockCommandDirs.has(path.toString())) {
          return {
            isDirectory: vi.fn(() => true),
          } as any;
        }

        // Otherwise, throw
        throw err;
      }
    }),
  };
  (mod as any).default = mod;
  return mod;
});

/**
 * Unmock all command modules that have been mocked. Making them throw a
 * NotFoundError when imported.
 */
export function unmockAllCommandModules() {
  for (const [commandDir, commandNames] of mockCommandDirs.entries()) {
    for (const commandName of commandNames) {
      vi.doMock(path.join(commandDir, commandName), () => {
        const mod = {
          handler: vi.fn(() => {
            throw new NotFoundError(commandName, commandDir);
          }),
        };
        (mod as any).default = mod;
        return mod;
      });
    }
  }
  mockCommandDirs.clear();
}

/**
 * Mock a command module so that it can be imported and resolved during testing.
 *
 * @example
 * ```ts
 * mockCommandModule('commands/foo/bar', {
 *  handler: ({ result, data }) => result(data),
 * });
 * ```
 */
export function mockCommandModule<T extends CommandModule | undefined>(
  commandPath: string,
  commandModule?: T,
): {
  mock: undefined extends T ? MockCommandModule : T;
  unmock: () => void;
} {
  const formattedFilePath = formatFileName(commandPath);
  const commandDir = path.dirname(commandPath);
  const commandName = path.basename(commandPath);

  // Keep track of the command directories and names that have been mocked
  if (mockCommandDirs.has(commandDir)) {
    mockCommandDirs.get(commandDir)?.add(commandName);
  } else {
    mockCommandDirs.set(commandDir, new Set([commandName]));
  }

  const mock = commandModule || {
    handler: vi.fn(({ next, data }) => next(data)),
  };

  vi.doMock(formattedFilePath, () => {
    return {
      ...mock,
      default: mock,
    };
  });

  return {
    mock: mock as any,
    unmock: () => {
      return vi.doUnmock(formattedFilePath);
    },
  };
}

/**
 * Mock multiple command modules so that they can be imported and resolved
 *
 * @example
 * mockCommandModules({
 *   'commands/foo': {
 *     handler: ({ next, data }) => next(data),
 *   },
 *   'commands/foo/bar': {
 *     handler: ({ end, data }) => end(data),
 *   },
 * });
 */
export function mockCommandModules<
  TModules extends Record<string, CommandModule>,
>(commandModules: TModules) {
  const results = Object.entries(commandModules).map(
    ([commandPath, commandModule]) =>
      mockCommandModule(commandPath, commandModule),
  );

  return {
    mocks: commandModules,
    unmock: () => {
      for (const { unmock } of results) unmock();
    },
  };
}

/**
 * Mock the command modules for the given command string so that they can be
 * imported and resolved during testing.
 */
export function mockCommandStringModules<TCommandString extends string>(
  commandString: TCommandString,
  commandsDir: string,
) {
  const mocks: Record<string, MockCommandModule> = {};
  const unMockFns: (() => void)[] = [];
  const { tokens } = parseCommand(commandString, {});
  let commandPath = commandsDir;

  // mock each command in the command string
  for (const token of tokens) {
    commandPath = path.join(commandPath, token);
    const { mock, unmock } = mockCommandModule(commandPath, {
      handler: vi.fn(({ next, data }) => next(data)),
    });
    mocks[token] = mock;
    unMockFns.push(unmock);
  }

  return {
    mocks: mocks as CommandNameMap<TCommandString, MockCommandModule>,
    unmock: () => {
      for (const unmock of unMockFns) unmock();
    },
  };
}

type MockCommandModule = {
  handler: Mock<(state: Readonly<State>) => any>;
};

/**
 * A utility type that converts a command string into a map of command modules
 * with the command names as keys.
 */
type CommandNameMap<
  TString extends string,
  TValues = any,
  TResult extends Record<string, any> = {},
> = Eval<
  TString extends `${infer Word} ${infer Rest}`
    ? Word extends `-${string}`
      ? CommandNameMap<Rest, TValues, TResult>
      : CommandNameMap<Rest, TValues, TResult & { [k in Word]: TValues }>
    : TString extends '' | `-${string}`
      ? TResult
      : CommandNameMap<'', TValues, TResult & { [k in TString]: TValues }>
>;
