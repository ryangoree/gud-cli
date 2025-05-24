import { command } from '@gud/cli';

export default command({
  description: 'Greet Bob',
  handler: ({ context }) => {
    context.client.log('Hello Bob!');
  },
});
