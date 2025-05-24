#!/usr/bin/env node
const { run, help } = require('@gud/cli');
const { commandMenu } = require('clide-plugin-command-menu');

async function main() {
  await run({
    plugins: [
      help(),
      commandMenu({
        title: 'Node.js Example',
      }),
    ],
  });
}

main();
