// Must be imported first
import {
  mockCommandModules,
  unmockAllCommandModules,
} from 'src/utils/testing/command-modules';

import { type ResolvedCommand, resolveCommand } from 'src/core/resolve';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('resolve', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    unmockAllCommandModules();
  });

  it('resolves commands using the file system', async () => {
    const commandModules = {
      'commands/foo.js': {
        handler: () => {},
      },
      'commands/foo/bar.js': {
        handler: () => {},
      },
      'commands/foo/bar/baz.js': {
        handler: () => {},
      },
    };
    mockCommandModules(commandModules);

    const commandString = 'foo bar baz';
    const commandsDir = 'commands';
    let resolved = await resolveCommand({
      commandString,
      commandsDir,
    });

    expect(resolved).toMatchObject({
      command: commandModules['commands/foo.js'],
      commandPath: 'commands/foo.js',
      commandName: 'foo',
      commandTokens: ['foo'],
      remainingCommandString: 'bar baz',
      subcommandsDir: 'commands/foo',
    } as ResolvedCommand);

    resolved = await resolveCommand({
      commandString: resolved.remainingCommandString,
      commandsDir: resolved.subcommandsDir,
    });

    expect(resolved).toMatchObject({
      command: commandModules['commands/foo/bar.js'],
      commandPath: 'commands/foo/bar.js',
      commandName: 'bar',
      commandTokens: ['bar'],
      remainingCommandString: 'baz',
      subcommandsDir: 'commands/foo/bar',
    } as ResolvedCommand);

    resolved = await resolveCommand({
      commandString: resolved.remainingCommandString,
      commandsDir: resolved.subcommandsDir,
    });

    expect(resolved).toMatchObject({
      command: commandModules['commands/foo/bar/baz.js'],
      commandPath: 'commands/foo/bar/baz.js',
      commandName: 'baz',
      commandTokens: ['baz'],
      remainingCommandString: '',
      subcommandsDir: 'commands/foo/bar/baz',
    } as ResolvedCommand);
  });

  it('resolves param commands', async () => {
    const commandModules = {
      'commands/[qux].js': {
        handler: () => {},
      },
      'commands/[qux]/[...quux].js': {
        handler: () => {},
      },
    };
    mockCommandModules(commandModules);

    const commandString = 'do re mi';
    const commandsDir = 'commands';
    let resolved = await resolveCommand({
      commandString,
      commandsDir,
    });

    expect(resolved).toEqual({
      command: commandModules['commands/[qux].js'],
      commandName: '[qux]',
      commandPath: 'commands/[qux].js',
      commandTokens: ['do'],
      remainingCommandString: 're mi',
      params: {
        qux: 'do',
      },
      subcommandsDir: 'commands/[qux]',
    } as ResolvedCommand);

    resolved = await resolveCommand({
      commandString: resolved.remainingCommandString,
      commandsDir: resolved.subcommandsDir,
    });

    expect(resolved).toEqual({
      command: commandModules['commands/[qux]/[...quux].js'],
      commandName: '[...quux]',
      commandPath: 'commands/[qux]/[...quux].js',
      commandTokens: ['re', 'mi'],
      remainingCommandString: '',
      params: {
        quux: ['re', 'mi'],
      },
      subcommandsDir: 'commands/[qux]/[...quux]',
    } as ResolvedCommand);
  });
});
