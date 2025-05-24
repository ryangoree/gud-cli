// Must be imported first

import { describe, expect, it, test } from 'vitest';
import {
  mockCommandModule,
  mockCommandModules,
  mockCommandStringModules,
} from './command-modules';

import type { CommandModule } from 'src/core/command';

const modules = {
  'commands/foo.js': {
    handler: ({ next, data }) => next(data),
  },
  'commands/foo/bar.js': {
    handler: ({ next, data }) => next(data),
  },
  'commands/foo/bar/baz.js': {
    handler: ({ end, data }) => end(data),
  },
} satisfies Record<string, CommandModule>;

describe('mockCommandModule', () => {
  it('Mocks and unmocks single command modules', async () => {
    const [path] = Object.entries(modules)[0]!;

    const { mock, unmock } = mockCommandModule(path);
    expect(mock).toMatchObject({
      handler: expect.any(Function),
    });

    mock.handler({ next: (data: unknown) => data, data: 'foo' } as any);
    expect(mock.handler).toHaveBeenCalledTimes(1);

    const imported = await import(path);
    expect(imported.handler).toEqual(expect.any(Function));

    unmock();
    await expect(import(path)).rejects.toThrow();
  });

  it('Uses the provided module', async () => {
    const [path, module] = Object.entries(modules)[0]!;

    const { mock } = mockCommandModule(path, {
      handler: module.handler,
    });
    expect(mock.handler).toBe(module.handler);
  });
});

describe('mockCommandModules', () => {
  it('Mocks and unmocks multiple command modules', async () => {
    const { mocks, unmock } = mockCommandModules(modules);

    expect(mocks).toEqual(modules);

    for (const [path, module] of Object.entries(modules)) {
      const imported = await import(path);
      expect(imported.handler).toBe(module.handler);
    }

    unmock();
    for (const path of Object.keys(modules)) {
      await expect(import(path)).rejects.toThrow();
    }
  });
});

describe('mockCommandStringModules', () => {
  test('Mocks and unmocks command string modules', async () => {
    const { mocks, unmock } = mockCommandStringModules(
      'foo bar baz',
      'commands',
    );

    expect(mocks).toEqual({
      foo: expect.objectContaining({ handler: expect.any(Function) }),
      bar: expect.objectContaining({ handler: expect.any(Function) }),
      baz: expect.objectContaining({ handler: expect.any(Function) }),
    });

    for (const path of Object.keys(modules)) {
      const imported = await import(path);
      expect(imported.handler).toEqual(expect.any(Function));
    }

    unmock();
    for (const path of Object.keys(modules)) {
      await expect(import(path)).rejects.toThrow();
    }
  });

  it('Ignores options', async () => {
    const { mocks } = mockCommandStringModules('foo --bar baz', 'commands');

    expect(mocks).toEqual({
      foo: expect.objectContaining({ handler: expect.any(Function) }),
      baz: expect.objectContaining({ handler: expect.any(Function) }),
    });
  });
});
