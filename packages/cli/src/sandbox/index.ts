#!/usr/bin/env node
import { cli } from 'src/core/cli';
import type { CommandHandler } from 'src/core/command';
import { help } from 'src/plugins/help';
import { logger } from 'src/plugins/logger';

const defaultHandler: CommandHandler = async ({ options, client, command }) => {
  client.log(
    `Virtual command ${command?.commandName} executed with options:`,
    options.values,
  );
};

cli({
  name: 'Spike CLI',
  plugins: [help(), logger({ verbose: true })],
  options: {
    force: {
      alias: ['f'],
      type: 'boolean',
      description: 'Force the operation, ignoring warnings or errors',
      default: false,
    },
  },
})
  .command('test', {
    description: 'Test command',
    options: {
      verbose: {
        alias: ['v'],
        type: 'boolean',
        description: 'Enable verbose output',
        default: false,
      },
    },
    handler: defaultHandler,
  })
  .command('test/subtest', {
    description: 'Subtest command',
    handler: defaultHandler,
  })
  .command('test2/subtest2', {
    description: 'Another subtest command',
    handler: defaultHandler,
  })
  .run()
  .then(() => {
    console.log('CLI executed successfully');
    process.exit(0);
  });
