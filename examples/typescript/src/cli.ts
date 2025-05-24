#!/usr/bin/env node
import { help, run } from '@gud/cli';
import { commandMenu } from '@gud/cli-menu';

const result = await run({
  plugins: [
    help(),
    commandMenu({
      title: 'Foo CLI',
      titleColors: ['#D89DFF', '#519BFF'],
    }),
  ],
}).catch((e) => {
  console.error(e);
  process.exit(1);
});

console.log(result);
