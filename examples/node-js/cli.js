#!/usr/bin/env node
const { run, help } = require('@gud/cli');
const { menu } = require('@gud/cli-menu');

async function main() {
  await run({
    plugins: [help(), menu({ title: 'Node.js Example' })],
  });
}

main();
