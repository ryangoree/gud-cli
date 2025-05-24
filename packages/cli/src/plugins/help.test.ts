// Must be imported first
import {
  mockCommandModule,
  unmockAllCommandModules,
} from 'src/utils/testing/command-modules';

vi.mock('src/core/client');

import { Client } from 'src/core/client';
import { Context } from 'src/core/context';
import { UsageError } from 'src/core/errors';
import * as helpModule from 'src/core/help';
import { run } from 'src/core/run';
import { help } from 'src/plugins/help';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// TODO: These tests check that the getHelp function is called, but don't check
// check that the help text is displayed to the user. I should check that
// client.log is called with the output of getHelp. The correctness of the help
// text is tested separately in the help module.

describe('plugin: help', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    unmockAllCommandModules();
  });

  it('adds "help" and "h" options', async () => {
    mockCommandModule('commands/foo');
    await run({
      command: 'foo',
      commandsDir: 'commands',
      plugins: [help()],
      beforeExecute: ({ state }) => {
        // Ensure the options are present before the command is executed
        expect(state.options).toMatchObject({
          help: expect.any(Function),
          h: expect.any(Function),
        });
      },
    });
  });

  it('shows help if the help option is present', async () => {
    mockCommandModule('commands/foo');

    const commandString = 'foo --help';
    const commandsDir = 'commands';
    const context = await Context.prepare({
      commandString,
      commandsDir,
      plugins: [help()],
    });

    // Get the expected help text
    const { helpText: expectedHelpText } = await helpModule.getHelp({
      context,
    });

    // Spy on the client's log method
    const clientLogSpy = vi.spyOn(Client.prototype, 'log');

    // Run with the help plugin and the --help option
    await run({
      command: commandString,
      commandsDir,
      plugins: [help()],
    });

    // Expect the client to have been called with the help text
    expect(clientLogSpy).toHaveBeenCalledWith(expectedHelpText);
  });

  it('shows help on UsageError and returns the error', async () => {
    mockCommandModule('commands/foo', {
      handler: () => {
        throw new UsageError('test');
      },
    });

    const getHelpSpy = vi.spyOn(helpModule, 'getHelp');
    const commandString = 'foo';
    const commandsDir = 'commands';
    const result = await run({
      command: commandString,
      commandsDir,
      plugins: [help()],
    });

    expect(result).toBeInstanceOf(UsageError);
    expect(getHelpSpy).toHaveBeenCalled();
  });
});
