import { command } from 'src/core/command';

export default command({
  options: {
    name: {
      required: true,
      type: 'string',
    },
  },

  handler: async ({ client, options, next }) => {
    const name = await options.name();
    const message = `Hello, ${name}!`;
    client.log(message);
    await next(message);
    client.log('Goodbye!');
  },
});
