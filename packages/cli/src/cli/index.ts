import { run } from 'src/core/run';
import { help } from 'src/plugins/help';

await run({
  plugins: [help({ maxWidth: 100 })],
  defaultCommand: 'test',
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
