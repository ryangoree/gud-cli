import { command } from '@gud/cli';

export default command({
  description: 'Greet Alice',
  handler: ({ context }) => {
    context.client.log('Hello Alice!');
  },
});
