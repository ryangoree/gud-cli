// Must be imported first
import { mockCommandModule } from '@gud/cli/testing';

import { type ResolvedCommand, command, run } from '@gud/cli';
import { type Mock, beforeEach, expect, test, vi } from 'vitest';
import { commandMenu } from './command-menu';
import {
  type CommandMenuPromptOptions,
  commandPrompt,
} from './command-menu-prompt';

vi.mock('./command-menu-prompt', async (importOriginal) => {
  const original: any = await importOriginal();
  return {
    ...original,
    commandPrompt: vi.fn<
      (options: CommandMenuPromptOptions) => ResolvedCommand[]
    >(({ commandsDir }): ResolvedCommand[] => [
      {
        command: {
          handler: vi.fn(({ next, data }) => next(data)),
        },
        commandName: 'mock-command',
        remainingCommandString: '',
        commandPath: `${commandsDir}/mock-command`,
        commandTokens: ['mock-command'],
        subcommandsDir: `${commandsDir}/mock-command`,
        params: {},
      },
    ]),
  };
});

beforeEach(() => {
  (commandPrompt as Mock).mockClear();
});

test('It shows the command menu when no command string is provided', async () => {
  await run({
    command: '',
    // Pass a commandsDir to prevent @gud/cli from trying to auto-detect it,
    // which would cause an error because there is none.
    commandsDir: 'commands',
    plugins: [commandMenu()],
  });

  expect(commandPrompt).toHaveBeenCalled();
});

// biome-ignore lint/suspicious/noFocusedTests: <explanation>
test.only('It shows the command menu when the last resolved command requires a subcommand', async () => {
  mockCommandModule('commands/foo', command({ requiresSubcommand: true }));

  await run({
    command: 'foo',
    commandsDir: 'commands',
    plugins: [commandMenu()],
  });

  expect(commandPrompt).toHaveBeenCalled();
});

test("It doesn't show the command menu when the last resolved command doesn't require a subcommand", async () => {
  mockCommandModule('commands/foo');

  await run({
    command: 'foo',
    commandsDir: 'commands',
    plugins: [],
  });

  expect(commandPrompt).not.toHaveBeenCalled();
});
