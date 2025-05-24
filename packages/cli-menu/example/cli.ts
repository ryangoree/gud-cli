import { help, run } from '@gud/cli';
import { commandMenu } from 'src/command-menu.js';

run({
  plugins: [
    help(),
    commandMenu({
      title: 'Command Menu',
      enabled: (options) => !options.help,
    }),
  ],
});
